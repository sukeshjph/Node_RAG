import "dotenv/config";

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";

const searchClient = new SearchClient(
    process.env.AZURE_SEARCH_ENDPOINT || "",
    process.env.AZURE_SEARCH_INDEX || "docs_v1",
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY || "")
);

async function main() {
    console.log("🔍 Listing documents...");
    const results = await searchClient.search("*", {
        select: ["id", "content"]
    });

    for await (const result of results.results) {
        console.log(result.document);
    }
}

main().catch(console.error);
