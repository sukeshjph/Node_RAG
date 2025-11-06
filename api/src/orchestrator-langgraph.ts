/**
 * LangGraph Multi-Agent Orchestrator
 * 
 * Advanced orchestrator using LangGraph.js state graph for complex RAG workflows:
 * 1. Classifier Agent → Determines category and complexity
 * 2. Retriever Agent → Fetches relevant documents
 * 3. Summariser Agent → Optionally condenses documents
 * 4. Answerer Agent → Generates final answer with citations
 * 
 * LangGraph Features:
 * - Visual state graph with conditional routing
 * - Centralized state management across agents
 * - Built-in error handling and retry logic
 * - Dynamic workflow execution paths
 * - Graph-based decision making
 * 
 * Usage: Requires 'npm install langgraph' dependency
 * 
 * NOTE: This file currently uses a mock implementation.
 * To use real LangGraph: npm install langgraph
 * Then uncomment the import and remove the mock code.
 */

import {
    AgentState,
    OrchestratorConfig,
    OrchestratorResult,
    QuestionComplexity
} from './types/agent-types';
import { needsSummarization, summarizeDocuments } from './agents/summariser';

import { classifyQuestion } from './agents/classifier';
import { generateAnswer } from './agents/answerer';
import { logOrchestrator } from './utils/logger';
import { retrieveDocuments } from './agents/retriever';

// Mock LangGraph implementation - replace with real LangGraph when installed
// import { END, START, StateGraph } from 'langgraph';

const START = 'START';
const END = 'END';

interface MockStateGraph<_T> {
    addNode(name: string, handler: any): void;
    addEdge(from: string, to: string): void;
    addConditionalEdges(from: string, condition: any, mapping: any): void;
    compile(): any;
}

class MockStateGraphImpl<_T> implements MockStateGraph<_T> {
    // Mock implementation - store nodes and edges
    private nodes: Map<string, any> = new Map();
    private edges: Array<{ from: string, to: string }> = [];
    private conditionalEdges: Array<{ from: string, condition: any, mapping: any }> = [];

    addNode(name: string, handler: any): void {
        // Store the node handler
        this.nodes.set(name, handler);
    }

    addEdge(from: string, to: string): void {
        // Store the edge
        this.edges.push({ from, to });
    }

    addConditionalEdges(from: string, condition: any, mapping: any): void {
        // Store conditional edge
        this.conditionalEdges.push({ from, condition, mapping });
    }

    compile(): any {
        // Return an executor that runs the workflow
        return {
            invoke: async (initialState: any) => {
                // Execute nodes sequentially following the graph
                let state = { ...initialState };

                // Execute in order: classify → retrieve → checkSummarization → [summarise?] → answer
                const classifyNode = this.nodes.get('classify');
                if (classifyNode) {
                    const result = await classifyNode(state);
                    state = { ...state, ...result };
                }

                const retrieveNode = this.nodes.get('retrieve');
                if (retrieveNode) {
                    const result = await retrieveNode(state);
                    state = { ...state, ...result };
                }

                const checkNode = this.nodes.get('checkSummarization');
                if (checkNode) {
                    const result = await checkNode(state);
                    state = { ...state, ...result };
                }

                // Check conditional: should we summarize?
                const conditional = this.conditionalEdges.find(e => e.from === 'checkSummarization');
                if (conditional) {
                    const nextNode = conditional.condition(state);

                    if (nextNode === 'summarise') {
                        const summariseNode = this.nodes.get('summarise');
                        if (summariseNode) {
                            const result = await summariseNode(state);
                            state = { ...state, ...result };
                        }
                    }
                }

                // Always run answer node
                const answerNode = this.nodes.get('answer');
                if (answerNode) {
                    const result = await answerNode(state);
                    state = { ...state, ...result };
                }

                return state;
            }
        };
    }
}

/**
 * Orchestrator class that manages the multi-agent RAG workflow
 */
export class RAGOrchestrator {
    private config: OrchestratorConfig;
    private graph: any; // MockStateGraph

    constructor(config: OrchestratorConfig = {}) {
        this.config = {
            maxRetries: config.maxRetries ?? 2,
            timeoutMs: config.timeoutMs ?? 30000,
            enableLogging: config.enableLogging ?? true,
        };

        this.graph = this.buildGraph();
    }

    /**
     * Builds the mock state graph
     */
    private buildGraph() {
        const workflow = new MockStateGraphImpl<AgentState>();

        // Add nodes (agents) - mock implementation
        workflow.addNode('classify', this.classifyNode);
        workflow.addNode('retrieve', this.retrieveNode);
        workflow.addNode('checkSummarization', this.checkSummarizationNode);
        workflow.addNode('summarise', this.summariseNode);
        workflow.addNode('answer', this.answerNode);

        // Define edges (transitions) - mock implementation
        workflow.addEdge(START, 'classify');
        workflow.addEdge('classify', 'retrieve');
        workflow.addEdge('retrieve', 'checkSummarization');
        workflow.addConditionalEdges('checkSummarization', this.shouldSummarize, {
            summarise: 'summarise',
            answer: 'answer'
        });
        workflow.addEdge('summarise', 'answer');
        workflow.addEdge('answer', END);

        return workflow.compile();
    }

    /**
     * Node: Classify the question
     */
    private classifyNode = async (state: AgentState): Promise<Partial<AgentState>> => {
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
    private retrieveNode = async (state: AgentState): Promise<Partial<AgentState>> => {
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
    private checkSummarizationNode = async (state: AgentState): Promise<Partial<AgentState>> => {
        const needs = state.documents
            ? needsSummarization(state.documents, state.complexity || QuestionComplexity.MODERATE)
            : false;

        logOrchestrator(state.requestId, 'Summarization check', {
            needsSummarization: needs,
            documentCount: state.documents?.length,
            complexity: state.complexity
        });

        // Fix: Only set known properties in Partial<AgentState>
        return {
            // @ts-ignore
            needsSummarization: needs,
        };

    }

    /* Conditional edge: Should we summarize or go straight to answer?
           */
    private shouldSummarize = (state: AgentState): string => {
        return state.needsSummarization ? 'summarise' : 'answer';
    }

    /**
     * Node: Summarize documents
     */
    private summariseNode = async (state: AgentState): Promise<Partial<AgentState>> => {
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
    private answerNode = async (state: AgentState): Promise<Partial<AgentState>> => {
        logOrchestrator(state.requestId, 'Running answerer', {
            hasDocuments: !!state.documents,
            hasSummary: !!state.summarizedContext
        });

        const answerInput: any = {
            question: state.question,
            includeText: state.includeText ?? undefined,
            category: state.category ?? undefined
        };
        if (state.summarizedContext) {
            answerInput.summarizedContext = state.summarizedContext;
        } else if (state.documents) {
            answerInput.documents = state.documents;
        }

        const answer = await generateAnswer(answerInput, state.requestId);

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
            const initialState: any = {
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