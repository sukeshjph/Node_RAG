/**
 * Classifier Agent
 * Routes questions to appropriate categories and determines complexity
 * Uses Azure OpenAI to analyze the question and provide structured classification
 */

import {
    ClassificationResult,
    QuestionCategory,
    QuestionComplexity
} from '../types/agent-types';
import { logAgentComplete, logAgentError, logAgentStart } from '../utils/logger';

import { AzureOpenAI } from 'openai';
import { getOpenAIConfig } from '../config';
import { z } from 'zod';

const openAIConfig = getOpenAIConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

// Schema for validating LLM response
const classificationSchema = z.object({
    category: z.nativeEnum(QuestionCategory),
    complexity: z.nativeEnum(QuestionComplexity),
    confidence: z.number().min(0).max(1),
    reasoning: z.string()
});

/**
 * Classifies a user question into category and complexity
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
        const systemPrompt = buildClassificationSystemPrompt();
        const userPrompt = buildClassificationUserPrompt(question);

        // Call Azure OpenAI for classification
        const response = await openai.chat.completions.create({
            model: openAIConfig.chatDeployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.0, // Deterministic for classification
            response_format: { type: 'json_object' }, // Force JSON response
            max_tokens: 300
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from classifier');
        }

        // Parse and validate the JSON response
        const parsed = JSON.parse(content);
        const validated = classificationSchema.parse(parsed);

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
            confidence: result.confidence
        });

        return result;

    } catch (error) {
        logAgentError('ClassifierAgent', requestId, error as Error);

        // Fallback to default classification if classification fails
        const timeMs = Date.now() - startTime;
        return {
            category: QuestionCategory.GENERAL,
            complexity: QuestionComplexity.MODERATE,
            confidence: 0.5,
            reasoning: 'Fallback classification due to error',
            requestId,
            timeMs
        };
    }
}

/**
 * Builds the system prompt for classification
 */
function buildClassificationSystemPrompt(): string {
    return `You are a question classification assistant. Your job is to analyze user questions and classify them into:

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

4. REASONING: Brief explanation of your classification

You must respond with valid JSON in this exact format:
{
  "category": "hr" | "trading" | "technical" | "general" | "finance" | "compliance",
  "complexity": "simple" | "moderate" | "complex",
  "confidence": 0.0-1.0,
  "reasoning": "your explanation"
}`;
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
 * Batch classification for multiple questions (future enhancement)
 */
export async function classifyQuestions(
    questions: string[],
    requestId: string
): Promise<ClassificationResult[]> {
    // For now, classify one by one
    // Future: Could use batch API for efficiency
    return Promise.all(
        questions.map(q => classifyQuestion(q, requestId))
    );
}

