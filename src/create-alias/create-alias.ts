import "dotenv/config";

import { AzureKeyCredential, SearchIndexClient } from "@azure/search-documents";

const client = new SearchIndexClient(
    process.env.AZURE_SEARCH_ENDPOINT || "",
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY || "")
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
