import "dotenv/config";

import { AzureKeyCredential, SearchClient, VectorQuery } from "@azure/search-documents";

import { AzureOpenAI } from "openai";

// Azure Search client
const searchClient = new SearchClient(
    process.env.AZURE_SEARCH_ENDPOINT || "",
    process.env.AZURE_SEARCH_INDEX || "docs_v1",
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY || "")
);

// Azure OpenAI client
const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
    apiKey: process.env.AZURE_OPENAI_API_KEY || "",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "",
    apiVersion: "2024-10-21"
});


async function embedQuery(text: string): Promise<number[]> {
    const result = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });
    return result.data[0].embedding;
}

async function main() {
    const queryText = "Automotive components accounted for 60% of total output";
    const queryVector = await embedQuery(queryText);

    const vectorQuery = {
        kind: "vector" as const,
        vector: queryVector,
        fields: ["contentVector"],   // target the vector field
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

