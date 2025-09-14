import "dotenv/config";

import { AzureKeyCredential, SearchIndexClient } from "@azure/search-documents";
import { config, validateConfig } from '../shared/config.js';

validateConfig();

const client = new SearchIndexClient(
    config.azure.search.endpoint,
    new AzureKeyCredential(config.azure.search.key)
);

async function createAlias() {
    try {
        console.log("🔗 Creating alias 'docs_current' pointing to 'docs_v1'...");

        await client.createOrUpdateAlias({
            name: "docs-current",
            indexes: ["docs_v1"]
        });

        console.log("✅ Alias created successfully!");

        // List all aliases to verify
        const aliases = await client.listAliases();
        console.log("📋 Current aliases:");
        for await (const alias of aliases) {
            console.log(`  - ${alias.name}: [${alias.indexes.join(", ")}]`);
        }

    } catch (error) {
        console.error("❌ Error creating alias:", error);
    }
}

// Run the function
createAlias();
