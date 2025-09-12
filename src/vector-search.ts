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
    const queryText = "oil price increase due to supply cuts";
    const queryVector = await embedQuery(queryText);

    const vectorQuery: any = {
        vector: queryVector,
        fields: ["contentVector"],   // target the vector field
        kNearestNeighborsCount: 3    // top 3 most similar docs
    };

    const results = await searchClient.search("", {
        vectorQueries: [vectorQuery],
        searchFields: [],
        searchMode: "all",
        select: ["id", "content"]   // only retrievable fields
    } as any);

    console.log("🔍 Vector search results for:", queryText);
    for await (const result of results.results) {
        const doc = result.document as any;
        console.log({
            id: doc?.id,
            content: doc?.content,
            score: result.score
        });
    }

    // const doc = await searchClient.getDocument("aHR0cHM6Ly9haXN0b3JhZ2VzdWt1LmJsb2IuY29yZS53aW5kb3dzLm5ldC9kb2NzL2dhc191cGRhdGUucGRm0");
    // console.log(Object.keys(doc));
}

main().catch(console.error);

az rest \
--method post \
--url "https://azureaisearchsukeshs1.search.windows.net/indexes/docs_v1/docs/search?api-version=2024-07-01" \
--headers "Content-Type=application/json" "api-key:<YOUR-SEARCH-KEY>" \
--body '{
"vectorQueries": [
    {
        "vector": [
            -0.0019561168737709522,
            0.003626646939665079,
            -0.004050421062856913,
            0.0038723130710422993,
            -0.002095839474350214,
            -0.013032590970396996,
            -0.025303615257143974,
            0.035253096371889114,
            -0.032698169350624084,
            0.007333135232329369
        ],
        "fields": ["contentVector"],
        "kNearestNeighborsCount": 3
    }
],
    "select": "id,content"
  }'

