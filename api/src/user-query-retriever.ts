import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { ReRankingMetrics, SearchHit } from './user-query-types';
import { getReRankerConfig, getSearchConfig } from './config';
import { rerankWithAzure, validateReRankerConfig } from './user-query-reranker';

import { embedQuery } from './user-query-embeddings';

const searchConfig = getSearchConfig();
const reRankerConfig = getReRankerConfig();

// Validate ReRanker configuration on startup
validateReRankerConfig();

// Debug: Log the actual config being used
console.log('🔧 Search Config Debug:', {
    endpoint: searchConfig.endpoint,
    indexAlias: searchConfig.indexAlias,
    keyExists: !!searchConfig.key,
    reRankerEnabled: reRankerConfig.useReRanker
});

const searchClient = new SearchClient<SearchHit>(
    searchConfig.endpoint,
    searchConfig.indexAlias, // Now aliases are supported with SDK 12.2.0-beta.1+
    new AzureKeyCredential(searchConfig.key)
);

export async function retrieveDocuments(
    query: string,
    options: { k?: number } = {}
): Promise<{ results: SearchHit[], metrics: ReRankingMetrics }> {
    try {
        const startTime = Date.now();
        const k = options.k ?? 6;

        // If reranker is enabled, fetch more results for better reranking
        const searchLimit = reRankerConfig.useReRanker ? Math.max(50, k * 10) : k;

        console.log(`🔍 Retrieving documents for query: "${query}"`);
        console.log(`📊 Search config:`, {
            endpoint: searchConfig.endpoint,
            indexAlias: searchConfig.indexAlias,
            maxResults: k,
            searchLimit,
            reRankerEnabled: reRankerConfig.useReRanker
        });

        const queryVector = await embedQuery(query);
        console.log(`🎯 Generated embedding vector with ${queryVector.length} dimensions`);

        const searchResults = await searchClient.search(query, {
            top: searchLimit,
            vectorSearchOptions: {
                queries: [{
                    kind: 'vector',
                    fields: ['contentVector'], // Use 3072 dimension field to match text-embedding-3-large
                    kNearestNeighborsCount: searchLimit,
                    vector: queryVector,
                }]
            },
            select: ['id', 'content', 'filename', 'category', 'createdUtc'],
        });

        console.log(`📋 Search completed, processing results...`);

        const searchHits: SearchHit[] = [];

        for await (const result of searchResults.results) {
            if (result.document) { // No score filtering for now
                searchHits.push({
                    id: result.document.id,
                    content: result.document.content,
                    filename: result.document.filename,
                    category: result.document.category,
                    createdUtc: result.document.createdUtc,
                    score: result.score ?? 0,
                });
            }
        }

        const retrievalTimeMs = Date.now() - startTime;
        console.log(`⏱️ Initial search completed in ${retrievalTimeMs}ms, found ${searchHits.length} documents`);

        // Apply ReRanking if enabled
        let finalResults: SearchHit[];
        let reRankingTimeMs: number | undefined;

        if (reRankerConfig.useReRanker && searchHits.length > 0) {
            const reRankStartTime = Date.now();
            finalResults = await rerankWithAzure(query, searchHits, k);
            reRankingTimeMs = Date.now() - reRankStartTime;
            console.log(`🎯 ReRanking completed in ${reRankingTimeMs}ms`);
        } else {
            finalResults = searchHits.slice(0, k);
            console.log(`📋 Using original search order (ReRanker disabled)`);
        }

        const totalTimeMs = Date.now() - startTime;

        console.log(`✅ Final results: ${finalResults.length} documents`);
        if (finalResults.length > 0 && finalResults[0]) {
            console.log(`📄 Top results:`, finalResults.slice(0, 3).map(r => ({
                id: r.id,
                filename: r.filename,
                score: r.score,
                category: r.category
            })));
        }

        const metrics: ReRankingMetrics = {
            retrievalTimeMs,
            ...(reRankingTimeMs !== undefined && { reRankingTimeMs }),
            promptTimeMs: 0, // Will be set later
            totalTimeMs
        };

        return { results: finalResults, metrics };

    } catch (error) {
        throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}