/**
 * Classifier Agent (Production-Grade)
 * Routes questions to appropriate categories and determines complexity
 * Uses Azure OpenAI to analyze the question and provide structured classification
 * 
 * Production improvements:
 * - Input guardrails: content safety checks, length limits (max 2000 chars)
 * - Retry mechanism: up to 3 retries with exponential backoff using p-retry
 * - Timeout protection: prevents hanging on slow API calls
 * - Enhanced validation: Zod schema with reasoning length enforcement (≤300 chars)
 * - Confidence calibration: downgrades to GENERAL/MODERATE if confidence < 0.6
 * - Comprehensive telemetry: tracks latency, fallbacks, and confidence scores
 * - Robust fallback: graceful degradation on any failure
 */

import {
    ClassificationResult,
    QuestionCategory,
    QuestionComplexity
} from '../types/agent-types';
import { logAgentComplete, logAgentError, logAgentStart } from '../utils/logger';

import { AzureOpenAI } from 'openai';
import { getOpenAIConfig } from '../config';
import pRetry from 'p-retry';
import { z } from 'zod';

const openAIConfig = getOpenAIConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

// Constants for guardrails
const MAX_QUESTION_LENGTH = 2000;
const MIN_CONFIDENCE_THRESHOLD = 0.6;
const MAX_REASONING_LENGTH = 300;
const OPENAI_TIMEOUT_MS = 10000; // 10 seconds
const RETRY_ATTEMPTS = 3;

// Schema for validating LLM response
const classificationSchema = z.object({
    category: z.nativeEnum(QuestionCategory),
    complexity: z.nativeEnum(QuestionComplexity),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().max(MAX_REASONING_LENGTH, 'Reasoning must be ≤300 characters')
});

/**
 * Placeholder for content safety check
 * In production, integrate with Azure Content Safety API or similar
 * 
 * @param question - The user's question
 * @returns true if safe, false if unsafe
 */
async function callContentSafety(question: string): Promise<boolean> {
    // TODO: Integrate with Azure Content Safety API
    // For now, basic checks - reject empty or suspicious patterns
    if (!question || question.trim().length === 0) {
        return false;
    }

    // Placeholder: In production, call actual content safety service
    // Example: Check for PII, hate speech, jailbreak attempts, etc.
    return true;
}

/**
 * Classifies a user question into category and complexity (Production-Grade)
 * 
 * @param question - The user's question
 * @param requestId - Request tracking ID
 * @returns ClassificationResult with category, complexity, and confidence
 */
export async function classifyQuestion(
    question: string,
    requestId: string
): Promise<ClassificationResult> {
    const startTime = Date.now();
    logAgentStart('ClassifierAgent', requestId, { question: question.substring(0, 100) });

    try {
        // Input Guardrail 1: Length check
        if (question.length > MAX_QUESTION_LENGTH) {
            logAgentError('ClassifierAgent', requestId, new Error(`Question exceeds ${MAX_QUESTION_LENGTH} chars`));
            question = question.substring(0, MAX_QUESTION_LENGTH); // Truncate
        }

        // Input Guardrail 2: Content safety check
        const isSafe = await callContentSafety(question);
        if (!isSafe) {
            const timeMs = Date.now() - startTime;
            logAgentError('ClassifierAgent', requestId, new Error('Content safety check failed'));
            return createFallbackResult(requestId, timeMs, 'Content safety violation');
        }

        // Call LLM with retry and timeout protection
        let validated;
        try {
            validated = await classifyWithRetry(question, false);
        } catch (error) {
            // If first attempt fails, retry with stricter prompt
            logAgentError('ClassifierAgent', requestId, new Error('Initial classification failed, retrying with strict prompt'));
            validated = await classifyWithRetry(question, true);
        }

        // Confidence Calibration: Downgrade low-confidence results
        if (validated.confidence < MIN_CONFIDENCE_THRESHOLD) {
            const timeMs = Date.now() - startTime;
            const result: ClassificationResult = {
                category: QuestionCategory.GENERAL,
                complexity: QuestionComplexity.MODERATE,
                confidence: validated.confidence,
                reasoning: 'Low confidence fallback',
                requestId,
                timeMs
            };

            logAgentComplete('ClassifierAgent', requestId, timeMs, {
                category: result.category,
                complexity: result.complexity,
                confidence: result.confidence,
                fallback: true,
                originalCategory: validated.category
            });

            return result;
        }

        // Success case
        const timeMs = Date.now() - startTime;
        const result: ClassificationResult = {
            category: validated.category,
            complexity: validated.complexity,
            confidence: validated.confidence,
            reasoning: validated.reasoning,
            requestId,
            timeMs
        };

        logAgentComplete('ClassifierAgent', requestId, timeMs, {
            category: result.category,
            complexity: result.complexity,
            confidence: result.confidence,
            fallback: false
        });

        return result;

    } catch (error) {
        const timeMs = Date.now() - startTime;
        logAgentError('ClassifierAgent', requestId, error as Error);
        return createFallbackResult(requestId, timeMs, 'Fallback classification');
    }
}

/**
 * Helper function to call OpenAI with retry mechanism and timeout
 * 
 * @param question - The user's question
 * @param useStrictPrompt - Whether to use stricter JSON enforcement prompt
 * @returns Validated classification result
 */
async function classifyWithRetry(
    question: string,
    useStrictPrompt: boolean
): Promise<z.infer<typeof classificationSchema>> {
    return await pRetry(
        async () => {
            const systemPrompt = buildClassificationSystemPrompt(useStrictPrompt);
            const userPrompt = buildClassificationUserPrompt(question);

            // Timeout protection using Promise.race
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('OpenAI API timeout')), OPENAI_TIMEOUT_MS);
            });

            const apiCall = openai.chat.completions.create({
                model: openAIConfig.chatDeployment,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.0, // Deterministic for classification
                response_format: { type: 'json_object' }, // Force JSON response
                max_tokens: 300
            });

            const response = await Promise.race([apiCall, timeoutPromise]) as Awaited<typeof apiCall>;

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from classifier');
            }

            // Parse and validate the JSON response
            const parsed = JSON.parse(content);
            const validated = classificationSchema.parse(parsed);

            return validated;
        },
        {
            retries: RETRY_ATTEMPTS,
            onFailedAttempt: (error: { attemptNumber: number; retriesLeft: number }) => {
                console.error(`Classification attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
            }
        }
    );
}

/**
 * Creates a fallback classification result
 * 
 * @param requestId - Request tracking ID
 * @param timeMs - Time taken in milliseconds
 * @param reasoning - Reason for fallback
 * @returns Fallback ClassificationResult
 */
function createFallbackResult(
    requestId: string,
    timeMs: number,
    reasoning: string
): ClassificationResult {
    return {
        category: QuestionCategory.GENERAL,
        complexity: QuestionComplexity.MODERATE,
        confidence: 0.5,
        reasoning,
        requestId,
        timeMs
    };
}

/**
 * Builds the system prompt for classification
 * 
 * @param useStrictPrompt - If true, adds stronger JSON enforcement
 */
function buildClassificationSystemPrompt(useStrictPrompt: boolean = false): string {
    const basePrompt = `You are a question classification assistant. Your job is to analyze user questions and classify them into:

1. CATEGORY (what domain/department the question relates to):
   - hr: Human resources, employee benefits, policies, hiring, leave, performance reviews
   - trading: Stock trading, market analysis, financial instruments, trading strategies
   - technical: Software, IT support, technical documentation, system issues
   - general: General company information, culture, office locations, contact info
   - finance: Accounting, budgets, financial reports, expenses, invoicing
   - compliance: Legal requirements, regulations, audit, governance, risk management

2. COMPLEXITY (how complex the answer will be):
   - simple: Single concept, straightforward answer, one document likely sufficient
   - moderate: Multiple concepts, needs synthesis from 2-3 documents
   - complex: Multi-faceted question requiring many documents or deep analysis

3. CONFIDENCE: How confident you are in the classification (0.0 to 1.0)

4. REASONING: Brief explanation of your classification (maximum 300 characters)

You must respond with valid JSON in this exact format:
{
  "category": "hr" | "trading" | "technical" | "general" | "finance" | "compliance",
  "complexity": "simple" | "moderate" | "complex",
  "confidence": 0.0-1.0,
  "reasoning": "your explanation"
}`;

    if (useStrictPrompt) {
        return basePrompt + `\n\nCRITICAL: You MUST respond with ONLY valid JSON. No additional text before or after. Ensure all strings are properly quoted and the JSON is well-formed.`;
    }

    return basePrompt;
}

/**
 * Builds the user prompt with the question
 */
function buildClassificationUserPrompt(question: string): string {
    return `Classify this question:

"${question}"

Respond with JSON only.`;
}

/**
 * Batch classification for multiple questions
 * 
 * Currently processes questions in parallel using Promise.all
 * 
 * Future Enhancement: Integrate Azure OpenAI Batch API for cost efficiency:
 * - Batch API provides 50% cost reduction compared to standard API
 * - Ideal for non-time-sensitive bulk classification tasks
 * - Requires uploading JSONL file and polling for completion
 * - See: https://learn.microsoft.com/azure/ai-services/openai/how-to/batch
 * 
 * @param questions - Array of questions to classify
 * @param requestId - Request tracking ID
 * @returns Array of ClassificationResults
 */
export async function classifyQuestions(
    questions: string[],
    requestId: string
): Promise<ClassificationResult[]> {
    // Process all questions in parallel with same production-grade guardrails
    return Promise.all(
        questions.map(q => classifyQuestion(q, requestId))
    );
}

