import "dotenv/config";

import { config, validateConfig } from '../shared/config.js';

import { AzureOpenAI } from "openai";

async function main() {
    validateConfig();
    
    // Initialize client with API key (dev-friendly)
    const client = new AzureOpenAI({
        endpoint: config.azure.openai.endpoint,
        apiKey: config.azure.openai.apiKey,
        deployment: config.azure.openai.deployment,
        apiVersion: config.azure.openai.apiVersion
    });

    // Example text
    const input = "Brent crude oil prices rose to $89 per barrel due to supply cuts.";

    // Generate embedding
    const result = await client.embeddings.create({
        model: "text-embedding-3-large",   // or your custom deployment name
        input
    });

    console.log("✅ Embedding vector length:", result.data[0].embedding.length);
    console.log("First 10 dimensions:", result.data[0].embedding.slice(0, 10));
}

main().catch(console.error);
