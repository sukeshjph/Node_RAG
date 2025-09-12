import "dotenv/config";

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";

import { AzureOpenAI } from "openai";

// Init Azure AI Search client
const searchClient = new SearchClient(
    process.env.AZURE_SEARCH_ENDPOINT || "",
    process.env.AZURE_SEARCH_INDEX || "",
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY || "")
);

// Init Azure OpenAI client
const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
    apiKey: process.env.AZURE_OPENAI_API_KEY || "",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "",
    apiVersion: "2024-10-21"
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
