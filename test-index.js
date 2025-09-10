import { AzureKeyCredential, SearchIndexClient } from '@azure/search-documents';

import { config } from 'dotenv';

// Load environment variables
config();

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const key = process.env.AZURE_SEARCH_KEY;

if (!endpoint || !key) {
    console.error('Please set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY in your .env file');
    process.exit(1);
}

// Create the search client
const client = new SearchIndexClient(endpoint, new AzureKeyCredential(key));

async function listIndexes() {
    try {
        console.log('Listing all indexes in the search service...\n');

        // List all indexes
        const indexes = [];
        for await (const index of client.listIndexes()) {
            indexes.push(index);
        }

        if (indexes.length === 0) {
            console.log('No indexes found in the search service.');
            return;
        }

        console.log(`Found ${indexes.length} index(es):`);
        indexes.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}`);
        });

        // Find and print the schema of docs_v1
        const docsIndex = indexes.find(index => index.name === 'docs_v1');

        if (docsIndex) {
            console.log('\n=== Schema of docs_v1 ===');
            console.log('Index Name:', docsIndex.name);
            console.log('\nFields:');
            docsIndex.fields.forEach(field => {
                console.log(`  - ${field.name}: ${field.type}`);
                console.log(`    Key: ${field.key}, Searchable: ${field.searchable}, Filterable: ${field.filterable}`);
                console.log(`    Sortable: ${field.sortable}, Facetable: ${field.facetable}`);
                if (field.analyzer) {
                    console.log(`    Analyzer: ${field.analyzer}`);
                }
                if (field.dimensions) {
                    console.log(`    Dimensions: ${field.dimensions}`);
                }
                console.log('');
            });

            if (docsIndex.vectorSearch) {
                console.log('Vector Search Configuration:');
                if (docsIndex.vectorSearch.profiles) {
                    console.log('  Profiles:', docsIndex.vectorSearch.profiles);
                }
                if (docsIndex.vectorSearch.algorithms) {
                    console.log('  Algorithms:', docsIndex.vectorSearch.algorithms);
                }
            }
        } else {
            console.log('\ndocs_v1 index not found.');
        }

    } catch (error) {
        console.error('Error listing indexes:', error.message);
        if (error.code === 'Unauthorized') {
            console.error('This might be due to invalid credentials or endpoint');
        }
    }
}

// Run the function
listIndexes();
