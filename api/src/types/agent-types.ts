/**
 * Multi-Agent System Types
 * Defines interfaces for the modular RAG architecture with orchestration
 */

import { Citation, SearchHit } from '../user-query-types';

// ========================================
// Agent State Types
// ========================================

/**
 * Shared state passed between agents in the LangGraph workflow
 */
export interface AgentState {
    // Input
    question: string;
    maxResults?: number;
    includeText?: boolean;
    requestId: string;

    // Classification results
    category?: QuestionCategory;
    complexity?: QuestionComplexity;

    // Retrieval results
    documents?: SearchHit[];
    retrievalMetrics?: {
        retrievalTimeMs: number;
        reRankingTimeMs?: number;
    };

    // Summarization results
    needsSummarization?: boolean;
    summarizedContext?: string;
    summarizationTimeMs?: number;

    // Final answer
    answer?: string;
    citations?: Citation[];
    answerTimeMs?: number;

    // Errors and retries
    error?: string;
    retryCount?: number;

    // Timing
    startTime: number;
    totalTimeMs?: number;
}

// ========================================
// Classification Types
// ========================================

export enum QuestionCategory {
    HR = 'hr',
    TRADING = 'trading',
    TECHNICAL = 'technical',
    GENERAL = 'general',
    FINANCE = 'finance',
    COMPLIANCE = 'compliance'
}

export enum QuestionComplexity {
    SIMPLE = 'simple',        // Single concept, straightforward
    MODERATE = 'moderate',    // Multiple concepts, needs synthesis
    COMPLEX = 'complex'       // Multi-faceted, needs summarization
}

export interface ClassificationResult {
    category: QuestionCategory;
    complexity: QuestionComplexity;
    confidence: number;
    reasoning: string;
    requestId: string;
    timeMs: number;
}

// ========================================
// Retrieval Types
// ========================================

export interface RetrievalOptions {
    k?: number;
    minScore?: number;
    useReRanker?: boolean;
}

export interface RetrievalResult {
    documents: SearchHit[];
    metrics: {
        retrievalTimeMs: number;
        reRankingTimeMs?: number;
        totalDocuments: number;
    };
    requestId: string;
}

// ========================================
// Summarization Types
// ========================================

export interface SummarizationInput {
    question: string;
    documents: SearchHit[];
    maxTokens?: number;
}

export interface SummarizationResult {
    summarizedContext: string;
    originalDocCount: number;
    tokensUsed?: number;
    timeMs: number;
    requestId: string;
}

// ========================================
// Answer Generation Types
// ========================================

export interface AnswerInput {
    question: string;
    documents?: SearchHit[];
    summarizedContext?: string;
    includeText?: boolean;
    category?: QuestionCategory;
}

export interface AnswerResult {
    answer: string;
    citations: Citation[];
    timeMs: number;
    requestId: string;
}

// ========================================
// Orchestrator Types
// ========================================

export interface OrchestratorConfig {
    maxRetries?: number;
    timeoutMs?: number;
    enableLogging?: boolean;
}

export interface OrchestratorResult {
    answer: string;
    citations: Citation[];
    requestId: string;
    metadata: {
        category: QuestionCategory;
        complexity: QuestionComplexity;
        documentsRetrieved: number;
        usedSummarization: boolean;
        metrics: {
            classificationTimeMs: number;
            retrievalTimeMs: number;
            reRankingTimeMs?: number;
            summarizationTimeMs?: number;
            answerTimeMs: number;
            totalTimeMs: number;
        };
    };
}

// ========================================
// Route-specific Request/Response Types
// ========================================

export interface ClassifyRequest {
    question: string;
    requestId?: string;
}

export interface RetrieveRequest {
    question: string;
    maxResults?: number;
    requestId?: string;
}

export interface SummariseRequest {
    question: string;
    documents: SearchHit[];
    requestId?: string;
}

export interface AnswerRequest {
    question: string;
    documents?: SearchHit[];
    summarizedContext?: string;
    includeText?: boolean;
    requestId?: string;
}

export interface AskRequest {
    question: string;
    maxResults?: number;
    includeText?: boolean;
    requestId?: string;
}

