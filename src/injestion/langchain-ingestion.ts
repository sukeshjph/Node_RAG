import 'dotenv/config';

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";

import { AzureOpenAI } from "openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
// LangChain imports
import { Document } from "@langchain/core/documents";
// import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
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
    source?: string;
    metadata?: Record<string, any>;
}

// ======================
// 2. Setup Clients
// ======================
const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT as string,
    apiKey: process.env.AZURE_OPENAI_API_KEY as string,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME as string,
    apiVersion: "2024-10-21"
});

const searchClient = new SearchClient<IndexedDoc>(
    process.env.AZURE_SEARCH_ENDPOINT as string,
    process.env.AZURE_SEARCH_INDEX as string,
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY as string)
);

// LangChain embeddings client
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.AZURE_OPENAI_API_KEY as string,
    configuration: {
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { "api-version": "2024-10-21" },
        defaultHeaders: {
            "api-key": process.env.AZURE_OPENAI_API_KEY as string,
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
        // ".docx": (path) => new DocxLoader(path),
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

// ======================
// 5. Safe ID Generation
// ======================
function safeId(source: string, chunkIndex: number): string {
    const baseName = path.basename(source, path.extname(source));
    return baseName.replace(/[^A-Za-z0-9_\-=]/g, "_") + `-${chunkIndex}`;
}

// ======================
// 6. LangChain Ingestion Pipeline
// ======================
async function ingestDirectory(directoryPath: string): Promise<void> {
    console.log(`📁 Loading documents from: ${directoryPath}`);

    // Load documents using LangChain loaders
    const loader = createDirectoryLoader(directoryPath);
    const documents = await loader.load();

    console.log(`📄 Loaded ${documents.length} documents`);

    // Split documents into chunks
    const splitDocs = await textSplitter.splitDocuments(documents);
    console.log(`✂️ Split into ${splitDocs.length} chunks`);

    // Process chunks and create embeddings
    const docs: IndexedDoc[] = [];

    for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];

        try {
            // Generate embedding using LangChain
            const embedding = await embeddings.embedQuery(doc.pageContent);

            docs.push({
                id: safeId(doc.metadata.source || `doc-${i}`, i),
                content: doc.pageContent,
                contentVector: embedding,
            });

            console.log(`✅ Processed chunk ${i + 1}/${splitDocs.length}`);

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
// 7. Single File Ingestion
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

    // Split documents
    const splitDocs = await textSplitter.splitDocuments(documents);
    console.log(`✂️ Split into ${splitDocs.length} chunks`);

    // Process and upload
    const docs: IndexedDoc[] = [];

    for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];

        try {
            const embedding = await embeddings.embedQuery(doc.pageContent);

            docs.push({
                id: safeId(filePath, i),
                content: doc.pageContent,
                contentVector: embedding,
            });

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
// 8. Main Execution
// ======================
(async () => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Create a sample documents directory
        const sampleDir = path.join(__dirname, "sample-docs");
        if (!fs.existsSync(sampleDir)) {
            fs.mkdirSync(sampleDir, { recursive: true });

            // Copy sample.txt to the new directory
            // const sampleFile = path.join(__dirname, "sample.txt");
            // if (fs.existsSync(sampleFile)) {
            //     fs.copyFileSync(sampleFile, path.join(sampleDir, "sample.txt"));
            // }
        }

        console.log("🚀 Starting LangChain ingestion pipeline...");

        // Ingest the sample directory
        await ingestDirectory(sampleDir);

        console.log("✅ LangChain ingestion completed successfully!");

    } catch (error) {
        console.error("❌ Error in LangChain ingestion:", error);
        process.exit(1);
    }
})();
