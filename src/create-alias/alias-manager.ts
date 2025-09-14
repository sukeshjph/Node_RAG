import "dotenv/config";

import { AzureKeyCredential, SearchIndexClient } from "@azure/search-documents";

const client = new SearchIndexClient(
    process.env.AZURE_SEARCH_ENDPOINT || "",
    new AzureKeyCredential(process.env.AZURE_SEARCH_KEY || "")
);

// ======================
// Alias Management Functions
// ======================

async function createAlias(aliasName: string, indexNames: string[]) {
    try {
        console.log(`🔗 Creating alias '${aliasName}' pointing to [${indexNames.join(", ")}]...`);

        await client.createOrUpdateAlias({
            name: aliasName,
            indexes: indexNames
        });

        console.log("✅ Alias created/updated successfully!");

    } catch (error) {
        console.error("❌ Error creating alias:", error);
        throw error;
    }
}

async function listAliases() {
    try {
        console.log("📋 Current aliases:");
        const aliases = await client.listAliases();

        for await (const alias of aliases) {
            console.log(`  - ${alias.name}: [${alias.indexes.join(", ")}]`);
        }

        return aliases;
    } catch (error) {
        console.error("❌ Error listing aliases:", error);
        throw error;
    }
}

async function switchAlias(aliasName: string, newIndexNames: string[]) {
    try {
        console.log(`🔄 Switching alias '${aliasName}' to [${newIndexNames.join(", ")}]...`);

        await client.createOrUpdateAlias({
            name: aliasName,
            indexes: newIndexNames
        });

        console.log("✅ Alias switched successfully!");

        // Verify the switch
        await listAliases();

    } catch (error) {
        console.error("❌ Error switching alias:", error);
        throw error;
    }
}

async function deleteAlias(aliasName: string) {
    try {
        console.log(`🗑️ Deleting alias '${aliasName}'...`);

        await client.deleteAlias(aliasName);

        console.log("✅ Alias deleted successfully!");

    } catch (error) {
        console.error("❌ Error deleting alias:", error);
        throw error;
    }
}

// ======================
// Main Execution
// ======================
async function main() {
    const command = process.argv[2];
    const aliasName = process.argv[3];
    const indexNames = process.argv[4]?.split(',') || [];

    try {
        switch (command) {
            case 'create':
                if (!aliasName || indexNames.length === 0) {
                    console.error("Usage: npm run alias-manager create <alias-name> <index1,index2>");
                    process.exit(1);
                }
                await createAlias(aliasName, indexNames);
                break;

            case 'list':
                await listAliases();
                break;

            case 'switch':
                if (!aliasName || indexNames.length === 0) {
                    console.error("Usage: npm run alias-manager switch <alias-name> <index1,index2>");
                    process.exit(1);
                }
                await switchAlias(aliasName, indexNames);
                break;

            case 'delete':
                if (!aliasName) {
                    console.error("Usage: npm run alias-manager delete <alias-name>");
                    process.exit(1);
                }
                await deleteAlias(aliasName);
                break;

            default:
                console.log(`
🔧 Azure Search Alias Manager

Usage:
  npm run alias-manager create <alias-name> <index1,index2>  - Create/update alias
  npm run alias-manager list                                 - List all aliases
  npm run alias-manager switch <alias-name> <index1,index2>  - Switch alias to new indexes
  npm run alias-manager delete <alias-name>                  - Delete alias

Examples:
  npm run alias-manager create docs_current docs_v1
  npm run alias-manager switch docs_current docs_v2
  npm run alias-manager list
  npm run alias-manager delete docs_old
                `);
        }
    } catch (error) {
        console.error("❌ Operation failed:", error);
        process.exit(1);
    }
}

main();
