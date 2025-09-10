import { AzureKeyCredential, SearchIndex, SearchIndexClient } from '@azure/search-documents';

import { IndexedChunk } from './types.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Type-safe environment variable access
const endpoint: string | undefined = process.env.AZURE_SEARCH_ENDPOINT;
const key: string | undefined = process.env.AZURE_SEARCH_KEY;

if (!endpoint || !key) {
    console.error('Please set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY in your .env file');
    process.exit(1);
}

// Create the search client
const client = new SearchIndexClient(endpoint, new AzureKeyCredential(key));

async function listIndexes(): Promise<void> {
    try {
        console.log('Listing all indexes in the search service...\n');

        // List all indexes
        const indexes: SearchIndex[] = [];
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

                // Type-safe property access with type guards
                if ('key' in field) {
                    console.log(`    Key: ${field.key}, Searchable: ${field.searchable}, Filterable: ${field.filterable}`);
                    console.log(`    Sortable: ${field.sortable}, Facetable: ${field.facetable}`);
                }

                if ('analyzer' in field && field.analyzer) {
                    console.log(`    Analyzer: ${field.analyzer}`);
                }

                if ('dimensions' in field && field.dimensions) {
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

    } catch (error: unknown) {
        const err = error as Error & { code?: string };
        console.error('Error listing indexes:', err.message);
        if (err.code === 'Unauthorized') {
            console.error('This might be due to invalid credentials or endpoint');
        }
    }
}

// Run the function
listIndexes();
