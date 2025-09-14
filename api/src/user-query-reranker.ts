/**
 * Azure AI ReRanker Service
 * 
 * This module provides functionality to improve search result relevance using Azure AI ReRanker.
 * 
 * How it works:
 * 1. Takes initial search results from Azure Cognitive Search (vector similarity)
 * 2. Sends query + documents to Azure AI ReRanker API
 * 3. ReRanker uses advanced ML models to understand query-document relationships
 * 4. Returns reordered results with better relevance scores
 * 
 * Benefits:
 * - Better understanding of semantic relationships
 * - Improved relevance over pure cosine similarity
 * - Handles complex queries with multiple concepts
 * - Cross-attention between query and documents
 */

import {
    ReRankerDocument,
    ReRankerRequest,
    ReRankerResponse,
    ReRankerResult,
    SearchHit
} from './user-query-types';

import { getReRankerConfig } from './config';

// Load ReRanker configuration (endpoint, key, enabled flag)
const reRankerConfig = getReRankerConfig();

/**
 * ReRanks search results using Azure AI ReRanker API
 * 
 * This is the main function that improves search relevance by:
 * 1. Converting our SearchHit format to ReRanker format
 * 2. Calling Azure AI ReRanker REST API
 * 3. Processing the response and reordering results
 * 4. Gracefully handling errors with fallbacks
 * 
 * @param query The user's search query (e.g., "automotive manufacturing processes")
 * @param searchHits Array of search results from Azure Cognitive Search (typically 50+ results)
 * @param topK Number of top results to return after reranking (typically 5-10)
 * @returns Promise<SearchHit[]> Reranked and filtered results with updated scores
 */
export async function rerankWithAzure(
    query: string,
    searchHits: SearchHit[],
    topK: number = 5
): Promise<SearchHit[]> {
    // Early exit conditions - return original results if ReRanker not available
    if (!reRankerConfig.useReRanker || !reRankerConfig.endpoint || !reRankerConfig.key) {
        console.log('🔄 ReRanker disabled or not configured, returning original results');
        return searchHits.slice(0, topK);
    }

    // Handle empty input
    if (searchHits.length === 0) {
        return [];
    }

    console.log(`🎯 ReRanking ${searchHits.length} documents with Azure AI ReRanker`);

    try {
        // STEP 1: Convert our internal SearchHit format to Azure AI ReRanker format
        // ReRanker expects { text: string, title?: string } for each document
        const documents: ReRankerDocument[] = searchHits.map(hit => ({
            text: hit.content,      // The actual document content to analyze
            title: hit.filename     // Optional: helps ReRanker understand context
        }));

        // STEP 2: Build the ReRanker API request payload
        const reRankerRequest: ReRankerRequest = {
            query,                                    // User's search query
            documents,                               // Array of documents to rerank
            top: Math.min(topK, documents.length)   // How many results to return (max = input length)
        };

        console.log(`📡 Calling Azure AI ReRanker API...`);
        const startTime = Date.now();

        // STEP 3: Call Azure AI ReRanker REST API
        // Endpoint format: https://{resource}.cognitiveservices.azure.com/language/:ranker:rerank
        //const url = `${reRankerConfig.endpoint}/language/:query-knowledgebases:rerank?api-version=2024-09-01`;
        const url = `${reRankerConfig.endpoint}/language/:ranker:rerank?api-version=2024-09-01`;



        const response = await fetch(url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': reRankerConfig.key,  // Azure subscription key
                },
                body: JSON.stringify(reRankerRequest)
            }
        );

        const reRankingTimeMs = Date.now() - startTime;
        console.log(`⏱️ ReRanking completed in ${reRankingTimeMs}ms`);

        // STEP 4: Handle API errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ReRanker API failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // STEP 5: Parse the ReRanker response
        const reRankerResponse = await response.json() as ReRankerResponse;

        // Handle empty response (shouldn't happen, but be defensive)
        if (!reRankerResponse.results || reRankerResponse.results.length === 0) {
            console.log('⚠️ ReRanker returned no results, falling back to original order');
            return searchHits.slice(0, topK);
        }

        // STEP 6: Reorder SearchHits based on ReRanker results
        // ReRanker returns: [{ index: 2, score: 0.95 }, { index: 0, score: 0.87 }, ...]
        // We need to map these back to our original SearchHit objects
        const reRankedHits: SearchHit[] = reRankerResponse.results
            .sort((a, b) => b.score - a.score)     // Sort by reranker score (highest first)
            .slice(0, topK)                        // Take only top-K results
            .map((result: ReRankerResult) => {
                // Get the original SearchHit using the index from ReRanker
                const originalHit = searchHits[result.index];
                if (!originalHit) {
                    throw new Error(`Invalid ReRanker result index: ${result.index}`);
                }
                return {
                    id: originalHit.id,
                    content: originalHit.content,
                    filename: originalHit.filename,
                    category: originalHit.category,
                    createdUtc: originalHit.createdUtc,
                    score: result.score           // Replace vector similarity score with ReRanker score
                } as SearchHit;
            });

        // STEP 7: Log the reranking results for debugging
        console.log(`✅ ReRanked results:`, reRankedHits.map(hit => ({
            id: hit.id,
            filename: hit.filename,
            originalScore: searchHits.find(sh => sh.id === hit.id)?.score,  // Original cosine similarity
            reRankerScore: hit.score                                        // New ReRanker score
        })));

        return reRankedHits;

    } catch (error) {
        // STEP 8: Error handling with graceful fallback
        // If ReRanker fails (network, API error, etc.), we don't want to break the entire search
        // Instead, we fall back to the original vector search results
        console.error('❌ ReRanking failed, falling back to original results:', error);
        return searchHits.slice(0, topK);  // Return top-K from original search
    }
}

/**
 * Validates ReRanker configuration on startup
 * 
 * This function checks if the ReRanker is properly configured when enabled.
 * It's called during server startup to catch configuration issues early.
 * 
 * Configuration requirements:
 * - USE_RERANKER=true
 * - AZURE_AI_RERANKER_ENDPOINT (your Azure Cognitive Services endpoint)
 * - AZURE_AI_RERANKER_KEY (your subscription key)
 * 
 * Example endpoint: https://your-resource.cognitiveservices.azure.com
 */
export function validateReRankerConfig(): void {
    if (reRankerConfig.useReRanker) {
        // Check required configuration when ReRanker is enabled
        if (!reRankerConfig.endpoint) {
            throw new Error('AZURE_AI_RERANKER_ENDPOINT is required when USE_RERANKER=true');
        }
        if (!reRankerConfig.key) {
            throw new Error('AZURE_AI_RERANKER_KEY is required when USE_RERANKER=true');
        }
        console.log('✅ ReRanker configuration validated');
    } else {
        console.log('ℹ️ ReRanker disabled - using original search ranking');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 🧠 UNDERSTANDING AZURE AI RERANKER
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * WHAT IS RERANKING?
 * ─────────────────────
 * ReRanking is a two-stage search approach:
 * 1. RETRIEVAL: Get many candidates using fast vector search (cosine similarity)
 * 2. RERANKING: Use sophisticated ML model to reorder the top candidates
 * 
 * WHY DO WE NEED IT?
 * ─────────────────────
 * Vector embeddings (cosine similarity) are great for:
 * ✅ Fast semantic search
 * ✅ Finding conceptually similar content
 * ✅ Handling synonyms and paraphrases
 * 
 * But they struggle with:
 * ❌ Complex multi-part queries ("automotive AND manufacturing BUT NOT consumer")
 * ❌ Exact keyword importance
 * ❌ Query-document interaction patterns
 * ❌ Understanding which parts of a document are most relevant
 * 
 * AZURE AI RERANKER ADVANTAGES:
 * ────────────────────────────────
 * ✅ Cross-attention between query and document (understands relationships)
 * ✅ Better handling of complex queries with multiple concepts
 * ✅ Considers both semantic similarity AND keyword relevance
 * ✅ Trained on large-scale search datasets
 * ✅ Understands document structure and importance signals
 * 
 * EXAMPLE IMPROVEMENT:
 * ───────────────────────
 * Query: "automotive manufacturing safety regulations compliance"
 * 
 * Vector Search Results (cosine similarity):
 * 1. "automotive industry overview" (score: 0.85) ❌ Too general
 * 2. "manufacturing processes guide" (score: 0.82) ❌ Missing safety focus  
 * 3. "safety regulations for automotive manufacturing" (score: 0.79) ✅ Perfect match!
 * 
 * ReRanker Results:
 * 1. "safety regulations for automotive manufacturing" (score: 0.95) ✅ Now #1!
 * 2. "automotive compliance checklist" (score: 0.88) ✅ More relevant
 * 3. "manufacturing processes guide" (score: 0.75) ✅ Still relevant but lower
 * 
 * PERFORMANCE CONSIDERATIONS:
 * ──────────────────────────────
 * - ReRanker is slower than vector search (~100-500ms vs ~50ms)
 * - That's why we use two-stage: fast retrieval (50+ docs) → slow reranking (top 5-10)
 * - Cost: ReRanker API calls cost more than vector search
 * - Benefit: Significantly better relevance, especially for complex queries
 * 
 * WHEN TO USE RERANKER:
 * ────────────────────────
 * ✅ Production RAG systems where relevance is critical
 * ✅ Complex domain-specific queries
 * ✅ When users report "irrelevant results"
 * ✅ Multi-concept queries
 * 
 * WHEN TO SKIP RERANKER:
 * ─────────────────────────
 * ❌ Simple keyword searches
 * ❌ Cost-sensitive applications
 * ❌ Ultra-low latency requirements (<100ms)
 * ❌ When vector search already works well
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 */
