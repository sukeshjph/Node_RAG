import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { InvocationContext, app } from "@azure/functions";

import { AzureOpenAI } from "openai";
import { BlobServiceClient } from "@azure/storage-blob";
import { encodingForModel } from "js-tiktoken";

// ======================
// Type Definitions
// ======================
interface IndexedDocument {
    id: string;
    content: string;
    chatVector: number[];
    productVector: number[];
    filename: string;
    category: string;
    createdUtc: string;
}

// ======================
// Configuration
// ======================
const config = {
    azure: {
        openai: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT as string,
            apiKey: process.env.AZURE_OPENAI_API_KEY as string,
            chatDeployment: "text-embedding-3-large",
            productDeployment: "text-embedding-3-small",
            apiVersion: "2024-10-21" as const,
        },
        search: {
            endpoint: process.env.AZURE_SEARCH_ENDPOINT as string,
            key: process.env.AZURE_SEARCH_KEY as string,
            index: process.env.AZURE_SEARCH_INDEX || "docs_v2",
        },
        storage: {
            connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING as string,
        }
    }
};

// ======================
// Initialize Clients
// ======================
const openai = new AzureOpenAI({
    endpoint: config.azure.openai.endpoint,
    apiKey: config.azure.openai.apiKey,
    apiVersion: config.azure.openai.apiVersion
});

const searchClient = new SearchClient<IndexedDocument>(
    config.azure.search.endpoint,
    config.azure.search.index,
    new AzureKeyCredential(config.azure.search.key)
);

const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.azure.storage.connectionString
);

// ======================
// Text Processing Utilities
// ======================
const chatEncoder = encodingForModel("text-embedding-3-large");
const productEncoder = encodingForModel("text-embedding-3-small");

function chunkText(text: string, maxTokens = 500, overlap = 50, encoder: any): string[] {
    const tokens = encoder.encode(text);
    const chunks: string[] = [];

    for (let i = 0; i < tokens.length; i += (maxTokens - overlap)) {
        const slice = tokens.slice(i, i + maxTokens);
        chunks.push(encoder.decode(slice));
    }

    return chunks;
}

function generateSafeId(filename: string, chunkIndex: number): string {
    const baseName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    const safeName = baseName.replace(/[^A-Za-z0-9_\-=]/g, "_");
    return `${safeName}-${chunkIndex}`;
}

// ======================
// Embedding Generation
// ======================
async function generateEmbeddings(content: string): Promise<{ chatVector: number[], productVector: number[] }> {
    try {
        // Generate chat embedding (3072 dimensions)
        const chatResponse = await openai.embeddings.create({
            model: config.azure.openai.chatDeployment,
            input: content
        });

        // Generate product embedding (768 dimensions)
        const productResponse = await openai.embeddings.create({
            model: config.azure.openai.productDeployment,
            input: content
        });

        return {
            chatVector: chatResponse.data[0].embedding as number[],
            productVector: productResponse.data[0].embedding as number[]
        };
    } catch (error) {
        throw new Error(`Failed to generate embeddings: ${error}`);
    }
}

// ======================
// Document Processing
// ======================
async function processDocument(content: string, filename: string): Promise<IndexedDocument[]> {
    const documents: IndexedDocument[] = [];

    // Split text into chunks using chat encoder (larger model for better chunking)
    const chunks = chunkText(content, 500, 50, chatEncoder);

    console.log(`📄 File: ${filename} - Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
        try {
            const chunk = chunks[i];

            // Generate embeddings for this chunk
            const { chatVector, productVector } = await generateEmbeddings(chunk);

            const document: IndexedDocument = {
                id: generateSafeId(filename, i),
                content: chunk,
                chatVector,
                productVector,
                filename,
                category: "ingested",
                createdUtc: new Date().toISOString()
            };

            documents.push(document);
            console.log(`✅ Processed chunk ${i + 1}/${chunks.length} for ${filename}`);

        } catch (error) {
            console.error(`❌ Error processing chunk ${i + 1} for ${filename}:`, error);
            throw error;
        }
    }

    return documents;
}

// ======================
// Retry Logic
// ======================
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error);

            if (attempt < maxRetries) {
                const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError!;
}

// ======================
// Main Azure Function
// ======================
export async function ingestDocuments(myBlob: Buffer, context: InvocationContext): Promise<void> {
    const filename = context.triggerMetadata?.name as string;
    const blobName = `docs-input/${filename}`;

    console.log(`🚀 Blob trigger function processed blob: ${blobName}`);

    try {
        // Validate file type (start with .txt files)
        if (!filename.toLowerCase().endsWith('.txt')) {
            console.log(`⚠️ Skipping non-text file: ${filename}`);
            return;
        }

        // Convert buffer to string
        const content = myBlob.toString('utf-8');
        console.log(`📖 Read file content: ${content.length} characters`);

        // Process document into chunks and generate embeddings
        const documents = await withRetry(
            () => processDocument(content, filename),
            3,
            2000
        );

        console.log(`🔄 Generated ${documents.length} document chunks with embeddings`);

        // Upload to Azure Cognitive Search
        await withRetry(
            async () => {
                await searchClient.mergeOrUploadDocuments(documents);
                console.log(`📤 Successfully uploaded ${documents.length} documents to search index`);
            },
            3,
            2000
        );

        console.log(`✅ Successfully processed file: ${filename}`);

    } catch (error) {
        console.error(`❌ Error processing file ${filename}:`, error);

        // Log error details for debugging
        context.log('Function execution failed:', {
            filename,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        // Re-throw to mark function as failed
        throw error;
    }
};

app.storageBlob('ingestDocuments', {
    path: 'docs-input/{name}',
    connection: 'AZURE_STORAGE_CONNECTION_STRING',
    handler: ingestDocuments
});
