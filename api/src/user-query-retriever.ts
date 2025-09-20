import { AzureKeyCredential, SearchClient } from '@azure/search-documents';

import { SearchHit } from './user-query-types.js';
import { embedQuery } from './user-query-embeddings.js';
import { getSearchConfig } from './config.js';

const searchConfig = getSearchConfig();

const searchClient = new SearchClient<SearchHit>(
    searchConfig.endpoint,
    searchConfig.indexAlias,
    new AzureKeyCredential(searchConfig.key)
);

export async function retrieveDocuments(
    query: string,
    options: { k?: number } = {}
): Promise<SearchHit[]> {
    try {
        const k = options.k ?? 6;

        const queryVector = await embedQuery(query);

        const searchResults = await searchClient.search(query, {
            top: k,
            vectorSearchOptions: {
                queries: [{
                    kind: 'vector',
                    fields: ['contentVector'],
                    kNearestNeighborsCount: k,
                    vector: queryVector,
                }]
            },
            select: ['id', 'content', 'filename', 'category', 'createdUtc'],
        });

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

        return results;

    } catch (error) {
        throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}