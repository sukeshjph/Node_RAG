/**
 * Simple Multi-Agent Orchestrator (LangGraph-free version)
 * 
 * Use this version if you don't want to install LangGraph.js yet.
 * This provides the same functionality using simple sequential execution.
 * 
 * For the full LangGraph.js version with state graph visualization, 
 * run `npm install` to get langgraph package, then use orchestrator.ts
 */

import {
    OrchestratorConfig,
    OrchestratorResult
} from './types/agent-types';
import { needsSummarization, summarizeDocuments } from './agents/summariser';

import { classifyQuestion } from './agents/classifier';
import { generateAnswer } from './agents/answerer';
import { logOrchestrator } from './utils/logger';
import { retrieveDocuments } from './agents/retriever';

/**
 * Simple sequential orchestrator without LangGraph dependency
 */
export class SimpleRAGOrchestrator {
    private config: OrchestratorConfig; // Configuration for future use

    constructor(_config: OrchestratorConfig = {}) {
        // Configuration stored but not used in simple orchestrator
        // Future: Could use config for timeout, retries, etc.
        this.config = {
            maxRetries: _config.maxRetries ?? 2,
            timeoutMs: _config.timeoutMs ?? 30000,
            enableLogging: _config.enableLogging ?? true,
        };
    }

    /**
     * Executes the orchestrated RAG pipeline
     */
    async execute(
        question: string,
        options: {
            maxResults?: number;
            includeText?: boolean;
        } = {},
        requestId: string
    ): Promise<OrchestratorResult> {
        const startTime = Date.now();

        logOrchestrator(requestId, 'Starting orchestration', {
            question: question.substring(0, 100),
            options
        });

        try {
            // Step 1: Classify the question
            logOrchestrator(requestId, 'Step 1: Classifying question');
            const classification = await classifyQuestion(question, requestId);

            // Step 2: Retrieve documents
            logOrchestrator(requestId, 'Step 2: Retrieving documents', {
                category: classification.category,
                complexity: classification.complexity
            });
            const retrieval = await retrieveDocuments(
                question,
                requestId,
                { k: options.maxResults || 6 }
            );

            // Step 3: Check if summarization is needed
            const shouldSummarize = needsSummarization(
                retrieval.documents,
                classification.complexity
            );

            logOrchestrator(requestId, 'Step 3: Summarization check', {
                needed: shouldSummarize,
                documentCount: retrieval.documents.length
            });

            let summarizedContext: string | undefined;
            let summarizationTimeMs: number | undefined;

            if (shouldSummarize && retrieval.documents.length > 0) {
                // Step 4: Summarize documents
                logOrchestrator(requestId, 'Step 4: Summarizing documents');
                const summary = await summarizeDocuments(
                    {
                        question,
                        documents: retrieval.documents,
                    },
                    requestId
                );
                summarizedContext = summary.summarizedContext;
                summarizationTimeMs = summary.timeMs;
            }

            // Step 5: Generate answer
            logOrchestrator(requestId, 'Step 5: Generating answer');
            const answerInput: any = {
                question,
                includeText: options.includeText,
                category: classification.category
            };
            if (summarizedContext) {
                answerInput.summarizedContext = summarizedContext;
            } else {
                answerInput.documents = retrieval.documents;
            }

            const answer = await generateAnswer(answerInput, requestId);

            const totalTimeMs = Date.now() - startTime;

            const result: OrchestratorResult = {
                answer: answer.answer,
                citations: answer.citations,
                requestId,
                metadata: {
                    category: classification.category,
                    complexity: classification.complexity,
                    documentsRetrieved: retrieval.documents.length,
                    usedSummarization: !!summarizedContext,
                    metrics: {
                        classificationTimeMs: classification.timeMs,
                        retrievalTimeMs: retrieval.metrics.retrievalTimeMs,
                        ...(retrieval.metrics.reRankingTimeMs !== undefined && { reRankingTimeMs: retrieval.metrics.reRankingTimeMs }),
                        ...(summarizationTimeMs !== undefined && { summarizationTimeMs }),
                        answerTimeMs: answer.timeMs,
                        totalTimeMs,
                    },
                },
            };

            logOrchestrator(requestId, 'Orchestration completed', {
                totalTimeMs,
                category: result.metadata.category,
                complexity: result.metadata.complexity
            });

            return result;

        } catch (error) {
            logOrchestrator(requestId, 'Orchestration failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new Error(`Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Singleton instance for reuse
 */
let orchestratorInstance: SimpleRAGOrchestrator | null = null;

/**
 * Gets or creates the orchestrator instance
 */
export function getOrchestrator(config?: OrchestratorConfig): SimpleRAGOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new SimpleRAGOrchestrator(config);
    }
    return orchestratorInstance;
}

/**
 * Convenience function to execute orchestration
 */
export async function executeRAGPipeline(
    question: string,
    options: {
        maxResults?: number;
        includeText?: boolean;
    } = {},
    requestId: string
): Promise<OrchestratorResult> {
    const orchestrator = getOrchestrator();
    return orchestrator.execute(question, options, requestId);
}

