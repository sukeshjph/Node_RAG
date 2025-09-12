import "dotenv/config";

import { AzureOpenAI } from "openai";

async function main() {
    // Initialize client with API key (dev-friendly)
    const client = new AzureOpenAI({
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
        apiKey: process.env.AZURE_OPENAI_API_KEY || "",
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "",
        apiVersion: "2024-10-21"  // adjust if your Azure portal shows different GA/preview version
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
