/**
 * Retriever Agent
 * Fetches relevant documents from Azure Cognitive Search
 * Uses vector embeddings + optional reranking
 */

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { RetrievalOptions, RetrievalResult } from '../types/agent-types';
import { getReRankerConfig, getSearchConfig } from '../config';
import { logAgentComplete, logAgentError, logAgentStart } from '../utils/logger';

import { SearchHit } from '../user-query-types';
import { embedQuery } from '../user-query-embeddings';
import { rerankWithAzure } from '../user-query-reranker';

const searchConfig = getSearchConfig();
const reRankerConfig = getReRankerConfig();

const searchClient = new SearchClient<SearchHit>(
    searchConfig.endpoint,
    searchConfig.indexAlias,
    new AzureKeyCredential(searchConfig.key)
);

/**
 * Retrieves relevant documents for a query using Azure Cognitive Search
 * 
 * @param question - The user's question
 * @param requestId - Request tracking ID
 * @param options - Retrieval options (k, minScore, useReRanker)
 * @returns RetrievalResult with documents and metrics
 */
export async function retrieveDocuments(
    question: string,
    requestId: string,
    options: RetrievalOptions = {}
): Promise<RetrievalResult> {
    const startTime = Date.now();
    logAgentStart('RetrieverAgent', requestId, {
        question: question.substring(0, 100),
        options
    });

    try {
        const k = options.k ?? 6;
        const useReRanker = options.useReRanker ?? reRankerConfig.useReRanker;

        // If reranker is enabled, fetch more results for better reranking
        const searchLimit = useReRanker ? Math.max(50, k * 10) : k;

        // Step 1: Generate query embedding
        const queryVector = await embedQuery(question);

        // Step 2: Execute vector search
        const searchResults = await searchClient.search(question, {
            top: searchLimit,
            vectorSearchOptions: {
                queries: [{
                    kind: 'vector',
                    fields: ['contentVector'],
                    kNearestNeighborsCount: searchLimit,
                    vector: queryVector,
                }]
            },
            select: ['id', 'content', 'filename', 'category', 'createdUtc'],
        });

        const searchHits: SearchHit[] = [];
        for await (const result of searchResults.results) {
            if (result.document) {
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

        // Step 3: Apply reranking if enabled
        let finalResults: SearchHit[];
        let reRankingTimeMs: number | undefined;

        if (useReRanker && searchHits.length > 0) {
            const reRankStartTime = Date.now();
            finalResults = await rerankWithAzure(question, searchHits, k);
            reRankingTimeMs = Date.now() - reRankStartTime;
        } else {
            finalResults = searchHits.slice(0, k);
        }

        // Step 4: Filter by minimum score if specified
        if (options.minScore) {
            finalResults = finalResults.filter(doc => doc.score >= options.minScore!);
        }

        const result: RetrievalResult = {
            documents: finalResults,
            metrics: {
                retrievalTimeMs,
                ...(reRankingTimeMs !== undefined && { reRankingTimeMs }),
                totalDocuments: finalResults.length
            },
            requestId
        };

        logAgentComplete('RetrieverAgent', requestId, Date.now() - startTime, {
            documentsFound: finalResults.length,
            retrievalTimeMs,
            reRankingTimeMs
        });

        return result;

    } catch (error) {
        logAgentError('RetrieverAgent', requestId, error as Error);
        throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Retrieves documents with category filtering
 */
export async function retrieveDocumentsByCategory(
    question: string,
    category: string,
    requestId: string,
    options: RetrievalOptions = {}
): Promise<RetrievalResult> {
    logAgentStart('RetrieverAgent', requestId, {
        question: question.substring(0, 100),
        category,
        options
    });

    // TODO: Add category filtering to search query
    // For now, retrieve all and filter in memory
    const result = await retrieveDocuments(question, requestId, options);

    result.documents = result.documents.filter(doc =>
        doc.category.toLowerCase() === category.toLowerCase()
    );

    return result;
}

