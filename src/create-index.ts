import { AzureKeyCredential, SearchIndex, SearchIndexClient } from '@azure/search-documents';

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

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

async function createOrUpdateIndex(): Promise<void> {
    try {
        // Read the index schema from index.json
        const indexPath = path.join(process.cwd(), 'index.json');
        const indexSchema: SearchIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

        console.log('Creating/updating index:', indexSchema.name);

        // Create or update the index
        const index = await client.createOrUpdateIndex(indexSchema);

        console.log('Index created/updated successfully:', index.name);
        console.log('Fields:', index.fields.map(f => `${f.name} (${f.type})`).join(', '));

    } catch (error: unknown) {
        const err = error as Error & { code?: string };
        console.error('Error creating/updating index:', err.message);
        if (err.code === 'InvalidRequest') {
            console.error('This might be due to invalid index schema or missing vector search configuration');
        }
    }
}

// Run the function
createOrUpdateIndex();
