import { AzureKeyCredential, SearchIndex, SearchIndexClient } from '@azure/search-documents';
import { config as azureConfig, validateConfig } from '../shared/config.js';

import { IndexedChunk } from '../test/types.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();
validateConfig();

// Create the search client
const client = new SearchIndexClient(azureConfig.azure.search.endpoint, new AzureKeyCredential(azureConfig.azure.search.key));

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


