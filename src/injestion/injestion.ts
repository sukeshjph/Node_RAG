import 'dotenv/config';

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { config, validateConfig } from '../shared/config.js';

import { AzureOpenAI } from "openai";
import { encodingForModel } from "js-tiktoken";
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
}

// ======================
// 2. Setup Clients
// ======================
validateConfig();

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

// ======================
// 3. Token-based Chunker
// ======================
const enc = encodingForModel("text-embedding-3-large");

function chunkText(text: string, maxTokens = 800, overlap = 100): string[] {
    const tokens = enc.encode(text);
    let chunks: string[] = [];
    // Next starting position to craete chunks maxTokens - overlap
    for (let i = 0; i < tokens.length; i += (maxTokens - overlap)) {
        const slice = tokens.slice(i, i + maxTokens); // like chunk of 8( i = 0, i= 7) from 12 tokens
        chunks.push(enc.decode(slice));
    }
    return chunks;
}

// ======================
// 4. Embedding Generator
// ======================
async function generateEmbeddings(text: string): Promise<{ contentVector: number[], chatVector: number[], productVector: number[] }> {
    const contentResp = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });

    const chatResp = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });

    const productResp = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });

    return {
        contentVector: contentResp.data[0].embedding as number[],
        chatVector: chatResp.data[0].embedding as number[],
        productVector: productResp.data[0].embedding as number[]
    };
}


function safeId(filePath: string, chunk: number): string {
    const baseName = path.basename(filePath, path.extname(filePath));
    // e.g. "sample" from "sample.txt"
    return baseName.replace(/[^A-Za-z0-9_\-=]/g, "_") + `-${chunk}`;
}

// ======================
// 5. Ingestion Pipeline
// ======================
async function ingestFile(filePath: string): Promise<void> {
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkText(raw);

    let docs: IndexedDoc[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const { contentVector, chatVector, productVector } = await generateEmbeddings(chunks[i]);

        const filename = path.basename(filePath);
        const category = 'general';
        const createdUtc = new Date().toISOString();

        docs.push({
            id: safeId(filePath, i),
            content: chunks[i],
            contentVector,
            chatVector,
            productVector,
            filename,
            category,
            createdUtc,
        });
    }

    await searchClient.mergeOrUploadDocuments(docs);
    console.log(`✅ Ingested ${docs.length} chunks from ${filePath}`);
}

// ======================
// 6. Run Ingestion
// ======================
(async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const filePath = path.join(__dirname, "sample.txt");
    await ingestFile(filePath);
})();
