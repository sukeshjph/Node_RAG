/**
 * Evaluation Metrics for Retrieval
 * Implements Recall@k and nDCG@k
 */

/**
 * Computes Recall@k
 * Measures what fraction of relevant documents were retrieved in top-k
 * 
 * @param retrieved - List of retrieved document IDs (in ranked order)
 * @param relevant - List of ground truth relevant document IDs
 * @param k - Number of top results to consider
 * @returns Recall@k score (0.0 to 1.0)
 */
export function recallAtK(retrieved: string[], relevant: string[], k: number): number {
    if (relevant.length === 0) {
        return 0;
    }

    const topK = retrieved.slice(0, k);
    const relevantSet = new Set(relevant);

    const retrievedRelevant = topK.filter(docId => relevantSet.has(docId)).length;

    return retrievedRelevant / relevant.length;
}

/**
 * Computes nDCG@k (Normalized Discounted Cumulative Gain)
 * Measures ranking quality with position-based discounting
 * 
 * @param retrieved - List of retrieved document IDs (in ranked order)
 * @param relevant - List of ground truth relevant document IDs
 * @param k - Number of top results to consider
 * @returns nDCG@k score (0.0 to 1.0)
 */
export function ndcgAtK(retrieved: string[], relevant: string[], k: number): number {
    if (relevant.length === 0) {
        return 0;
    }

    const topK = retrieved.slice(0, k);
    const relevantSet = new Set(relevant);

    // Compute DCG (Discounted Cumulative Gain)
    let dcg = 0;
    topK.forEach((docId, index) => {
        if (relevantSet.has(docId)) {
            // rel_i = 1 for relevant docs, 0 otherwise
            // DCG = sum(rel_i / log2(i + 2))
            dcg += 1 / Math.log2(index + 2);
        }
    });

    // Compute IDCG (Ideal DCG) - if all relevant docs were at top positions
    let idcg = 0;
    const idealLength = Math.min(k, relevant.length);
    for (let i = 0; i < idealLength; i++) {
        idcg += 1 / Math.log2(i + 2);
    }

    // Avoid division by zero
    if (idcg === 0) {
        return 0;
    }

    return dcg / idcg;
}

/**
 * Computes Mean Reciprocal Rank (MRR)
 * Measures how high the first relevant document appears
 * 
 * @param retrieved - List of retrieved document IDs (in ranked order)
 * @param relevant - List of ground truth relevant document IDs
 * @returns MRR score (0.0 to 1.0)
 */
export function mrr(retrieved: string[], relevant: string[]): number {
    if (relevant.length === 0) {
        return 0;
    }

    const relevantSet = new Set(relevant);

    for (let i = 0; i < retrieved.length; i++) {
        if (relevantSet.has(retrieved[i])) {
            return 1 / (i + 1);
        }
    }

    return 0;
}

/**
 * Computes Precision@k
 * Measures what fraction of retrieved documents are relevant
 * 
 * @param retrieved - List of retrieved document IDs (in ranked order)
 * @param relevant - List of ground truth relevant document IDs
 * @param k - Number of top results to consider
 * @returns Precision@k score (0.0 to 1.0)
 */
export function precisionAtK(retrieved: string[], relevant: string[], k: number): number {
    if (k === 0) {
        return 0;
    }

    const topK = retrieved.slice(0, k);
    const relevantSet = new Set(relevant);

    const retrievedRelevant = topK.filter(docId => relevantSet.has(docId)).length;

    return retrievedRelevant / k;
}

