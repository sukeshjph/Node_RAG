/**
 * Multi-Agent Orchestrator using LangGraph.js
 * 
 * Orchestrates the RAG pipeline using a state graph:
 * 1. Classifier Agent → Determines category and complexity
 * 2. Retriever Agent → Fetches relevant documents
 * 3. Summariser Agent → Optionally condenses documents
 * 4. Answerer Agent → Generates final answer with citations
 * 
 * LangGraph manages:
 * - State transitions between agents
 * - Error handling and retries
 * - Conditional routing (e.g., skip summarization if not needed)
 */

import {
    AgentState,
    OrchestratorConfig,
    OrchestratorResult,
    QuestionComplexity
} from './types/agent-types';
import { END, START, StateGraph } from 'langgraph';
import { needsSummarization, summarizeDocuments } from './agents/summariser';

import { classifyQuestion } from './agents/classifier';
import { generateAnswer } from './agents/answerer';
import { logOrchestrator } from './utils/logger';
import { retrieveDocuments } from './agents/retriever';

/**
 * Orchestrator class that manages the multi-agent RAG workflow
 */
export class RAGOrchestrator {
    private config: OrchestratorConfig;
    private graph: any; // LangGraph StateGraph

    constructor(config: OrchestratorConfig = {}) {
        this.config = {
            maxRetries: config.maxRetries ?? 2,
            timeoutMs: config.timeoutMs ?? 30000,
            enableLogging: config.enableLogging ?? true,
        };

        this.graph = this.buildGraph();
    }

    /**
     * Builds the LangGraph state graph
     */
    private buildGraph() {
        // Define the state graph
        const workflow = new StateGraph<AgentState>({
            channels: {
                question: null,
                maxResults: null,
                includeText: null,
                requestId: null,
                category: null,
                complexity: null,
                documents: null,
                retrievalMetrics: null,
                needsSummarization: null,
                summarizedContext: null,
                summarizationTimeMs: null,
                answer: null,
                citations: null,
                answerTimeMs: null,
                error: null,
                retryCount: null,
                startTime: null,
                totalTimeMs: null,
            }
        });

        // Add nodes (agents)
        workflow.addNode('classify', this.classifyNode.bind(this));
        workflow.addNode('retrieve', this.retrieveNode.bind(this));
        workflow.addNode('checkSummarization', this.checkSummarizationNode.bind(this));
        workflow.addNode('summarise', this.summariseNode.bind(this));
        workflow.addNode('answer', this.answerNode.bind(this));

        // Define edges (transitions)
        workflow.addEdge(START, 'classify');
        workflow.addEdge('classify', 'retrieve');
        workflow.addEdge('retrieve', 'checkSummarization');

        // Conditional routing based on summarization need
        workflow.addConditionalEdges(
            'checkSummarization',
            this.shouldSummarize.bind(this),
            {
                summarise: 'summarise',
                answer: 'answer'
            }
        );

        workflow.addEdge('summarise', 'answer');
        workflow.addEdge('answer', END);

        return workflow.compile();
    }

    /**
     * Node: Classify the question
     */
    private async classifyNode(state: AgentState): Promise<Partial<AgentState>> {
        logOrchestrator(state.requestId, 'Running classifier', { question: state.question.substring(0, 100) });

        const classification = await classifyQuestion(state.question, state.requestId);

        return {
            category: classification.category,
            complexity: classification.complexity,
        };
    }

    /**
     * Node: Retrieve documents
     */
    private async retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
        logOrchestrator(state.requestId, 'Running retriever', {
            category: state.category,
            complexity: state.complexity
        });

        const retrieval = await retrieveDocuments(
            state.question,
            state.requestId,
            { k: state.maxResults || 6 }
        );

        return {
            documents: retrieval.documents,
            retrievalMetrics: retrieval.metrics,
        };
    }

    /**
     * Node: Check if summarization is needed
     */
    private async checkSummarizationNode(state: AgentState): Promise<Partial<AgentState>> {
        const needs = state.documents
            ? needsSummarization(state.documents, state.complexity || QuestionComplexity.MODERATE)
            : false;

        logOrchestrator(state.requestId, 'Summarization check', {
            needsSummarization: needs,
            documentCount: state.documents?.length,
            complexity: state.complexity
        });

        return {
            needsSummarization: needs,
        };
    }

    /**
     * Conditional edge: Should we summarize or go straight to answer?
     */
    private shouldSummarize(state: AgentState): string {
        return state.needsSummarization ? 'summarise' : 'answer';
    }

    /**
     * Node: Summarize documents
     */
    private async summariseNode(state: AgentState): Promise<Partial<AgentState>> {
        if (!state.documents || state.documents.length === 0) {
            return {};
        }

        logOrchestrator(state.requestId, 'Running summariser', {
            documentCount: state.documents.length
        });

        const summary = await summarizeDocuments(
            {
                question: state.question,
                documents: state.documents,
            },
            state.requestId
        );

        return {
            summarizedContext: summary.summarizedContext,
            summarizationTimeMs: summary.timeMs,
        };
    }

    /**
     * Node: Generate final answer
     */
    private async answerNode(state: AgentState): Promise<Partial<AgentState>> {
        logOrchestrator(state.requestId, 'Running answerer', {
            hasDocuments: !!state.documents,
            hasSummary: !!state.summarizedContext
        });

        const answer = await generateAnswer(
            {
                question: state.question,
                documents: state.documents ?? undefined,
                summarizedContext: state.summarizedContext ?? undefined,
                includeText: state.includeText ?? undefined,
                category: state.category ?? undefined,
            },
            state.requestId
        );

        return {
            answer: answer.answer,
            citations: answer.citations,
            answerTimeMs: answer.timeMs,
            totalTimeMs: Date.now() - state.startTime,
        };
    }

    /**
     * Executes the orchestrated RAG pipeline
     * 
     * @param question - User's question
     * @param options - Optional parameters (maxResults, includeText)
     * @param requestId - Request tracking ID
     * @returns OrchestratorResult with answer, citations, and metadata
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
            // Initialize state
            const initialState: AgentState = {
                question,
                maxResults: options.maxResults ?? undefined,
                includeText: options.includeText ?? undefined,
                requestId,
                startTime,
                retryCount: 0,
            };

            // Execute the graph
            const finalState = await this.graph.invoke(initialState, {
                timeout: this.config.timeoutMs,
            });

            // Check for errors
            if (finalState.error) {
                throw new Error(finalState.error);
            }

            // Validate we have an answer
            if (!finalState.answer) {
                throw new Error('No answer generated');
            }

            const result: OrchestratorResult = {
                answer: finalState.answer,
                citations: finalState.citations || [],
                requestId,
                metadata: {
                    category: finalState.category!,
                    complexity: finalState.complexity!,
                    documentsRetrieved: finalState.documents?.length || 0,
                    usedSummarization: !!finalState.summarizedContext,
                    metrics: {
                        classificationTimeMs: 0, // Extracted from state
                        retrievalTimeMs: finalState.retrievalMetrics?.retrievalTimeMs || 0,
                        reRankingTimeMs: finalState.retrievalMetrics?.reRankingTimeMs,
                        summarizationTimeMs: finalState.summarizationTimeMs,
                        answerTimeMs: finalState.answerTimeMs || 0,
                        totalTimeMs: finalState.totalTimeMs || (Date.now() - startTime),
                    },
                },
            };

            logOrchestrator(requestId, 'Orchestration completed', {
                totalTimeMs: result.metadata.metrics.totalTimeMs,
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
let orchestratorInstance: RAGOrchestrator | null = null;

/**
 * Gets or creates the orchestrator instance
 */
export function getOrchestrator(config?: OrchestratorConfig): RAGOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new RAGOrchestrator(config);
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

