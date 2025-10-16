/**
 * Evaluation Runner
 * Runs retrieval evaluation across test set
 */

import { mrr, ndcgAtK, precisionAtK, recallAtK } from './evalMetrics';
import { testSet, validateTestSet } from './testData';

import { retrieveDocuments } from '../src/agents/retriever';
import { v4 as uuidv4 } from 'uuid';

interface EvalResult {
    query: string;
    description?: string;
    retrieved: number;
    relevant: number;
    recallAt5: number;
    ndcgAt5: number;
    precisionAt5: number;
    mrr: number;
    timeMs: number;
}

interface EvalSummary {
    totalQueries: number;
    avgRecallAt5: number;
    avgNdcgAt5: number;
    avgPrecisionAt5: number;
    avgMrr: number;
    avgTimeMs: number;
    results: EvalResult[];
}

/**
 * Runs evaluation on the test set
 */
export async function runEval(k: number = 5): Promise<EvalSummary> {
    console.log('🧪 Starting Retrieval Evaluation');
    console.log('='.repeat(80));
    console.log();

    // Validate test set
    const validation = validateTestSet(testSet);
    if (!validation.valid) {
        console.error('❌ Test set validation failed:');
        validation.errors.forEach(err => console.error(`  - ${err}`));
        throw new Error('Invalid test set');
    }

    console.log(`📊 Test Set: ${testSet.length} queries`);
    console.log(`🎯 Evaluating at k=${k}`);
    console.log();

    const results: EvalResult[] = [];

    for (let i = 0; i < testSet.length; i++) {
        const test = testSet[i];
        const requestId = uuidv4();

        console.log(`[${i + 1}/${testSet.length}] "${test.query.substring(0, 60)}..."`);

        try {
            const startTime = Date.now();

            // Retrieve documents
            const retrieval = await retrieveDocuments(test.query, requestId, { k });

            const timeMs = Date.now() - startTime;

            // Extract document IDs
            const retrievedIds = retrieval.documents.map(doc => doc.id);

            // Compute metrics
            const recall = recallAtK(retrievedIds, test.relevant, k);
            const ndcg = ndcgAtK(retrievedIds, test.relevant, k);
            const precision = precisionAtK(retrievedIds, test.relevant, k);
            const mrrScore = mrr(retrievedIds, test.relevant);

            const result: EvalResult = {
                query: test.query,
                description: test.description,
                retrieved: retrievedIds.length,
                relevant: test.relevant.length,
                recallAt5: recall,
                ndcgAt5: ndcg,
                precisionAt5: precision,
                mrr: mrrScore,
                timeMs
            };

            results.push(result);

            // Print per-query results
            console.log(`  ✓ Recall@${k}: ${(recall * 100).toFixed(1)}%`);
            console.log(`  ✓ nDCG@${k}: ${(ndcg * 100).toFixed(1)}%`);
            console.log(`  ✓ Precision@${k}: ${(precision * 100).toFixed(1)}%`);
            console.log(`  ✓ MRR: ${(mrrScore * 100).toFixed(1)}%`);
            console.log(`  ⏱️  ${timeMs}ms`);
            console.log();

        } catch (error) {
            console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.log();
        }
    }

    // Compute averages
    const avgRecallAt5 = results.reduce((sum, r) => sum + r.recallAt5, 0) / results.length;
    const avgNdcgAt5 = results.reduce((sum, r) => sum + r.ndcgAt5, 0) / results.length;
    const avgPrecisionAt5 = results.reduce((sum, r) => sum + r.precisionAt5, 0) / results.length;
    const avgMrr = results.reduce((sum, r) => sum + r.mrr, 0) / results.length;
    const avgTimeMs = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;

    const summary: EvalSummary = {
        totalQueries: testSet.length,
        avgRecallAt5,
        avgNdcgAt5,
        avgPrecisionAt5,
        avgMrr,
        avgTimeMs,
        results
    };

    // Print summary
    console.log('='.repeat(80));
    console.log('📈 EVALUATION SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total Queries:       ${summary.totalQueries}`);
    console.log(`Avg Recall@${k}:       ${(avgRecallAt5 * 100).toFixed(2)}%`);
    console.log(`Avg nDCG@${k}:         ${(avgNdcgAt5 * 100).toFixed(2)}%`);
    console.log(`Avg Precision@${k}:    ${(avgPrecisionAt5 * 100).toFixed(2)}%`);
    console.log(`Avg MRR:             ${(avgMrr * 100).toFixed(2)}%`);
    console.log(`Avg Latency:         ${avgTimeMs.toFixed(0)}ms`);
    console.log();

    return summary;
}

