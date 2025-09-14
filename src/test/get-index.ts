import "dotenv/config";

import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { config, validateConfig } from '../shared/config.js';

validateConfig();

const searchClient = new SearchClient(
    config.azure.search.endpoint,
    config.azure.search.index,
    new AzureKeyCredential(config.azure.search.key)
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
