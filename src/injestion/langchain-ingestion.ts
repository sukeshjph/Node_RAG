import 'dotenv/config';

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { RecursiveCharacterTextSplitter, TokenTextSplitter } from "langchain/text_splitter";
import { config, validateConfig } from '../shared/config.js';

import { AzureOpenAI } from "openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
// LangChain imports
import { Document } from "@langchain/core/documents";
// import { PDFLoader } from "langchain/document_loaders/fs/pdf";
//import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { OpenAIEmbeddings } from "@langchain/openai";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

// ======================
// 1. Type Definitions
// ======================
interface IndexedDoc {
    id: string;
    content: string;
    contentVector: number[];
    chatVector: number[];
    productVector?: number[];
    filename: string;
    category: string;
    createdUtc: string;
    metadata: string; // JSON string containing all metadata
}

// ======================
// 2. Setup Clients
// ======================
try {
    validateConfig();
} catch (error: any) {
    console.error("❌ Configuration error:", error.message || "Unknown error");
    console.log("💡 Make sure you have all required environment variables set:");
    console.log("   - AZURE_SEARCH_ENDPOINT");
    console.log("   - AZURE_SEARCH_KEY");
    console.log("   - AZURE_SEARCH_ALIAS");
    console.log("   - AZURE_OPENAI_ENDPOINT");
    console.log("   - AZURE_OPENAI_API_KEY");
    console.log("   - AZURE_OPENAI_DEPLOYMENT_NAME");
    process.exit(1);
}

const openai = new AzureOpenAI({
    endpoint: config.azure.openai.endpoint,
    apiKey: config.azure.openai.apiKey,
    deployment: config.azure.openai.deployment,
    apiVersion: config.azure.openai.apiVersion
});

const searchClient = new SearchClient<IndexedDoc>(
    config.azure.search.endpoint,
    config.azure.search.alias,
    new AzureKeyCredential(config.azure.search.key)
);

// LangChain embeddings clients for different vector types
const contentEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-large", // 3072 dimensions
    openAIApiKey: config.azure.openai.apiKey,
    configuration: {
        baseURL: `${config.azure.openai.endpoint}/openai/deployments/${config.azure.openai.deployment}`,
        defaultQuery: { "api-version": config.azure.openai.apiVersion },
        defaultHeaders: {
            "api-key": config.azure.openai.apiKey,
        },
    },
});

const chatEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-large", // 3072 dimensions - optimized for chat
    openAIApiKey: config.azure.openai.apiKey,
    configuration: {
        baseURL: `${config.azure.openai.endpoint}/openai/deployments/${config.azure.openai.deployment}`,
        defaultQuery: { "api-version": config.azure.openai.apiVersion },
        defaultHeaders: {
            "api-key": config.azure.openai.apiKey,
        },
    },
});

const productEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small", // 1536 dimensions - faster for product search
    openAIApiKey: config.azure.openai.apiKey,
    configuration: {
        baseURL: `${config.azure.openai.endpoint}/openai/deployments/text-embedding-3-small`,
        defaultQuery: { "api-version": config.azure.openai.apiVersion },
        defaultHeaders: {
            "api-key": config.azure.openai.apiKey,
        },
    },
});

// ======================
// 3. Document Loaders
// ======================
function createDirectoryLoader(directoryPath: string) {
    return new DirectoryLoader(directoryPath, {
        ".txt": (path) => new TextLoader(path),
        // ".pdf": (path) => new PDFLoader(path), // Commented out due to import issues
        // Add more loaders as needed
        //".docx": (path) => new DocxLoader(path),
        // ".md": (path) => new TextLoader(path),
    });
}

// ======================
// 4. Text Splitter Configuration
// ======================
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
});

// Token-based splitter for more accurate chunking
const tokenSplitter = new TokenTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
    encodingName: "cl100k_base", // Valid encodings: "cl100k_base" (GPT-4, text-embedding-3-large), "gpt2", "p50k_base" (Codex)
});

// ======================
// 5. Safe ID Generation
// ======================
function safeId(source: string, chunkIndex: number): string {
    const baseName = path.basename(source, path.extname(source));
    return baseName.replace(/[^A-Za-z0-9_\-=]/g, "_") + `-${chunkIndex}`;
}

// ======================
// 6. Embedding Generation
// ======================
async function generateEmbeddings(content: string): Promise<{ contentVector: number[], chatVector: number[], productVector: number[] }> {
    // Generate embeddings using different models for different purposes
    const contentEmbedding = await contentEmbeddings.embedQuery(content);     // text-embedding-3-large (3072 dims)
    const chatEmbedding = await chatEmbeddings.embedQuery(content);           // text-embedding-3-large (3072 dims)
    const productEmbedding = await productEmbeddings.embedQuery(content);     // text-embedding-ada-002 (1536 dims)

    return {
        contentVector: contentEmbedding,
        chatVector: chatEmbedding,
        productVector: productEmbedding
    };
}

// ======================
// 7. LangChain Ingestion Pipeline
// ======================
async function ingestDirectory(directoryPath: string): Promise<void> {
    console.log(`📁 Loading documents from: ${directoryPath}`);

    // Load documents using LangChain loaders
    const loader = createDirectoryLoader(directoryPath);
    const documents = await loader.load();

    console.log(`📄 Loaded ${documents.length} documents`);

    // Split documents into chunks using token-based chunking with document boundaries
    const splitDocs: Document[] = [];
    let globalChunkIndex = 0;

    for (let docIndex = 0; docIndex < documents.length; docIndex++) {
        const doc = documents[docIndex];
        const tokenChunks = await tokenSplitter.splitText(doc.pageContent);
        console.log(`📊 Document ${docIndex + 1}/${documents.length} "${doc.metadata.source}" split into ${tokenChunks.length} chunks`);

        for (let chunkIndex = 0; chunkIndex < tokenChunks.length; chunkIndex++) {
            splitDocs.push(new Document({
                pageContent: tokenChunks[chunkIndex],
                metadata: {
                    ...doc.metadata,
                    documentIndex: docIndex,           // Which original document (0, 1, 2...)
                    chunkIndex: chunkIndex,            // Chunk within this document (0, 1, 2...)
                    totalChunks: tokenChunks.length,   // Total chunks in this document
                    globalChunkIndex: globalChunkIndex, // Global chunk index across all documents
                    isFirstChunk: chunkIndex === 0,    // Is this the first chunk of the document?
                    isLastChunk: chunkIndex === tokenChunks.length - 1 // Is this the last chunk?
                }
            }));
            globalChunkIndex++;
        }
    }

    console.log(`✂️ Split into ${splitDocs.length} token-based chunks across ${documents.length} documents`);

    // Process chunks and create embeddings
    const docs: IndexedDoc[] = [];

    for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];

        try {
            // Generate embeddings using LangChain
            const { contentVector, chatVector, productVector } = await generateEmbeddings(doc.pageContent);

            // Extract metadata from document
            const sourcePath = doc.metadata.source || `doc-${i}`;
            const filename = path.basename(sourcePath);
            const category = doc.metadata.category || 'general';
            const createdUtc = new Date().toISOString();

            docs.push({
                id: safeId(sourcePath, i),
                content: doc.pageContent,
                contentVector,
                chatVector,
                productVector,
                filename,
                category,
                createdUtc,
                metadata: JSON.stringify({
                    ...doc.metadata,
                    documentIndex: doc.metadata.documentIndex,
                    chunkIndex: doc.metadata.chunkIndex,
                    totalChunks: doc.metadata.totalChunks,
                    globalChunkIndex: doc.metadata.globalChunkIndex,
                    isFirstChunk: doc.metadata.isFirstChunk,
                    isLastChunk: doc.metadata.isLastChunk,
                    source: sourcePath
                })
            });

            console.log(`✅ Processed chunk ${i + 1}/${splitDocs.length} (Document ${doc.metadata.documentIndex + 1}, Chunk ${doc.metadata.chunkIndex + 1}/${doc.metadata.totalChunks})`);

        } catch (error) {
            console.error(`❌ Error processing chunk ${i + 1}:`, error);
        }
    }

    // Upload to Azure Search
    if (docs.length > 0) {
        await searchClient.mergeOrUploadDocuments(docs);
        console.log(`🚀 Successfully uploaded ${docs.length} chunks to Azure Search`);
    } else {
        console.log("⚠️ No documents to upload");
    }
}

// ======================
// 8. Single File Ingestion
// ======================
async function ingestFile(filePath: string): Promise<void> {
    console.log(`📄 Processing file: ${filePath}`);

    let documents: Document[];

    // Load document based on file type
    // if (filePath.endsWith('.pdf')) {
    //     const loader = new PDFLoader(filePath);
    //     documents = await loader.load();
    // } else {
    const loader = new TextLoader(filePath);
    documents = await loader.load();
    // }

    // Split documents using token-based chunking with document boundaries
    const splitDocs: Document[] = [];
    const tokenChunks = await tokenSplitter.splitText(documents[0].pageContent);
    console.log(`📊 File "${filePath}" split into ${tokenChunks.length} chunks`);

    for (let chunkIndex = 0; chunkIndex < tokenChunks.length; chunkIndex++) {
        splitDocs.push(new Document({
            pageContent: tokenChunks[chunkIndex],
            metadata: {
                ...documents[0].metadata,
                documentIndex: 0,                      // Single document = index 0
                chunkIndex: chunkIndex,                // Chunk within this document (0, 1, 2...)
                totalChunks: tokenChunks.length,       // Total chunks in this document
                globalChunkIndex: chunkIndex,          // Same as chunkIndex for single file
                isFirstChunk: chunkIndex === 0,        // Is this the first chunk?
                isLastChunk: chunkIndex === tokenChunks.length - 1 // Is this the last chunk?
            }
        }));
    }

    console.log(`✂️ Split into ${splitDocs.length} token-based chunks`);

    // Process and upload
    const docs: IndexedDoc[] = [];

    for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];

        try {
            const { contentVector, chatVector, productVector } = await generateEmbeddings(doc.pageContent);

            // Extract metadata from file path
            const filename = path.basename(filePath);
            const category = doc.metadata.category || 'general';
            const createdUtc = new Date().toISOString();

            docs.push({
                id: safeId(filePath, i),
                content: doc.pageContent,
                contentVector,
                chatVector,
                productVector,
                filename,
                category,
                createdUtc,
                metadata: JSON.stringify({
                    ...doc.metadata,
                    documentIndex: doc.metadata.documentIndex,
                    chunkIndex: doc.metadata.chunkIndex,
                    totalChunks: doc.metadata.totalChunks,
                    globalChunkIndex: doc.metadata.globalChunkIndex,
                    isFirstChunk: doc.metadata.isFirstChunk,
                    isLastChunk: doc.metadata.isLastChunk,
                    source: filePath
                })
            });

            console.log(`✅ Processed chunk ${i + 1}/${splitDocs.length} (Chunk ${doc.metadata.chunkIndex + 1}/${doc.metadata.totalChunks})`);

        } catch (error) {
            console.error(`❌ Error processing chunk ${i + 1}:`, error);
        }
    }

    if (docs.length > 0) {
        await searchClient.mergeOrUploadDocuments(docs);
        console.log(`🚀 Successfully uploaded ${docs.length} chunks from ${filePath}`);
    }
}

// ======================
// 9. Main Execution
// ======================
(async () => {
    try {
        console.log("🚀 Starting LangChain ingestion pipeline...");

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Create a sample documents directory
        const sampleDir = path.join(__dirname, "sample-docs");
        if (!fs.existsSync(sampleDir)) {
            fs.mkdirSync(sampleDir, { recursive: true });
            console.log(`📁 Created sample directory: ${sampleDir}`);
        }

        // Check if directory has any files
        const files = fs.readdirSync(sampleDir);
        if (files.length === 0) {
            console.log("⚠️ No files found in sample-docs directory");
            console.log("💡 Add some .txt or .docx files to the sample-docs directory to test ingestion");
            return;
        }

        console.log(`📄 Found ${files.length} files in sample directory`);

        // Ingest the sample directory
        await ingestDirectory(sampleDir);

        console.log("✅ LangChain ingestion completed successfully!");

    } catch (error) {
        console.error("❌ Error in LangChain ingestion:", error);
        if (error instanceof Error) {
            console.error("Error details:", error.message);
            console.error("Stack trace:", error.stack);
        }
        process.exit(1);
    }
})();
