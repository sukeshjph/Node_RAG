import { AzureKeyCredential, SearchIndexClient } from '@azure/search-documents';

import { config } from 'dotenv';
import fs from 'fs';

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

async function createOrUpdateIndex() {
    try {
        // Read the index schema from index.json
        const indexSchema = JSON.parse(fs.readFileSync('./index.json', 'utf8'));

        console.log('Creating/updating index:', indexSchema.name);

        // Create or update the index
        const index = await client.createOrUpdateIndex(indexSchema);

        console.log('Index created/updated successfully:', index.name);
        console.log('Fields:', index.fields.map(f => `${f.name} (${f.type})`).join(', '));

    } catch (error) {
        console.error('Error creating/updating index:', error.message);
        if (error.code === 'InvalidRequest') {
            console.error('This might be due to invalid index schema or missing vector search configuration');
        }
    }
}

// Run the function
createOrUpdateIndex();
