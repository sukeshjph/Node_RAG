import "dotenv/config";

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { config, validateConfig } from '../shared/config.js';

import { AzureOpenAI } from "openai";

// Validate config
validateConfig();

// Init Azure AI Search client
const searchClient = new SearchClient(
    config.azure.search.endpoint,
    config.azure.search.index,
    new AzureKeyCredential(config.azure.search.key)
);

// Init Azure OpenAI client
const openai = new AzureOpenAI({
    endpoint: config.azure.openai.endpoint,
    apiKey: config.azure.openai.apiKey,
    deployment: config.azure.openai.deployment,
    apiVersion: config.azure.openai.apiVersion
});

// Helper: generate embeddings
async function embedText(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-large",   // or your deployment name
        input: text
    });
    return response.data[0].embedding;
}

async function main() {
    const text = "Brent crude oil prices rose to $89 per barrel due to supply cuts.";
    const vector = await embedText(text);

    const doc = {
        id: "vec1",
        content: text,
        contentVector: vector
    };

    await searchClient.mergeOrUploadDocuments([doc]);
    console.log("✅ Uploaded doc with embedding:", doc.id);
}

main().catch(console.error);
