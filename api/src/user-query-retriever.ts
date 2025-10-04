import { AzureKeyCredential, SearchClient } from '@azure/search-documents';

import { SearchHit } from './user-query-types';
import { embedQuery } from './user-query-embeddings';
import { getSearchConfig } from './config';

const searchConfig = getSearchConfig();

// Debug: Log the actual config being used
console.log('🔧 Search Config Debug:', {
    endpoint: searchConfig.endpoint,
    indexAlias: searchConfig.indexAlias,
    keyExists: !!searchConfig.key
});

const searchClient = new SearchClient<SearchHit>(
    searchConfig.endpoint,
    searchConfig.indexAlias, // Now aliases are supported with SDK 12.2.0-beta.1+
    new AzureKeyCredential(searchConfig.key)
);

export async function retrieveDocuments(
    query: string,
    options: { k?: number } = {}
): Promise<SearchHit[]> {
    try {
        const k = options.k ?? 6;

        console.log(`🔍 Retrieving documents for query: "${query}"`);
        console.log(`📊 Search config:`, {
            endpoint: searchConfig.endpoint,
            indexAlias: searchConfig.indexAlias,
            maxResults: k
        });

        const queryVector = await embedQuery(query);
        console.log(`🎯 Generated embedding vector with ${queryVector.length} dimensions`);

        const searchResults = await searchClient.search(query, {
            top: k,
            vectorSearchOptions: {
                queries: [{
                    kind: 'vector',
                    fields: ['contentVector'], // Use 3072 dimension field to match text-embedding-3-large
                    kNearestNeighborsCount: k,
                    vector: queryVector,
                }]
            },
            select: ['id', 'content', 'filename', 'category', 'createdUtc'],
        });

        console.log(`📋 Search completed, processing results...`);

        const results: SearchHit[] = [];
        for await (const result of searchResults.results) {
            if (result.document) {
                results.push({
                    id: result.document.id,
                    content: result.document.content,
                    filename: result.document.filename,
                    category: result.document.category,
                    createdUtc: result.document.createdUtc,
                    score: result.score ?? 0,
                });
            }
        }

        console.log(`✅ Found ${results.length} documents`);
        if (results.length > 0 && results[0]) {
            console.log(`📄 First result:`, {
                id: results[0].id,
                filename: results[0].filename,
                score: results[0].score
            });
        }

        return results;

    } catch (error) {
        throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}