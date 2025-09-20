import "dotenv/config";

import { AzureKeyCredential, SearchClient, VectorQuery } from "@azure/search-documents";
import { config, validateConfig } from '../shared/config.js';

import { AzureOpenAI } from "openai";

// Validate config
validateConfig();

// Azure Search client
const searchClient = new SearchClient(
    config.azure.search.endpoint,
    config.azure.search.alias,
    new AzureKeyCredential(config.azure.search.key)
);

// Azure OpenAI client
const openai = new AzureOpenAI({
    endpoint: config.azure.openai.endpoint,
    apiKey: config.azure.openai.apiKey,
    deployment: config.azure.openai.deployment,
    apiVersion: config.azure.openai.apiVersion
});


async function embedQuery(text: string): Promise<number[]> {
    const result = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
    });
    return result.data[0].embedding;
}

async function main() {
    const queryText = "Assets under management increased by £2.3 billion";
    const queryVector = await embedQuery(queryText);

    const vectorQuery = {
        kind: "vector" as const,
        vector: queryVector,
        fields: ["chatVector"],   // target the vector field
        k: 3    // top 3 most similar docs
    };

    const results = await searchClient.search("", {
        vectorQueries: [vectorQuery],
        select: ["id", "content"]   // only retrievable fields
    } as any);

    console.log("🔍 Vector search results for:", queryText);
    for await (const result of results.results) {
        const doc = result.document as any;
        console.log({
            id: doc.id,
            content: doc.content,
            score: result.score
        });
    }

    // const doc = await searchClient.getDocument("aHR0cHM6Ly9haXN0b3JhZ2VzdWt1LmJsb2IuY29yZS53aW5kb3dzLm5ldC9kb2NzL2dhc191cGRhdGUucGRm0");
    // console.log(Object.keys(doc));
}

main().catch(console.error);

