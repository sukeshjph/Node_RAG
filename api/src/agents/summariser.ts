/**
 * Summariser Agent
 * Condenses many documents into concise summaries when:
 * 1. Too many documents retrieved (>10)
 * 2. Question complexity is HIGH
 * 3. Total token count exceeds threshold
 */

import { SummarizationInput, SummarizationResult } from '../types/agent-types';
import { logAgentComplete, logAgentError, logAgentStart } from '../utils/logger';

import { AzureOpenAI } from 'openai';
import { SearchHit } from '../user-query-types';
import { getOpenAIConfig } from '../config';

const openAIConfig = getOpenAIConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

/**
 * Determines if summarization is needed based on document count and complexity
 * 
 * @param documents - Retrieved documents
 * @param complexity - Question complexity from classifier
 * @returns boolean indicating if summarization should be applied
 */
export function needsSummarization(
    documents: SearchHit[],
    complexity: 'simple' | 'moderate' | 'complex'
): boolean {
    // Summarize if:
    // - More than 10 documents retrieved
    // - Complex question with more than 5 documents
    // - Very long documents (estimated tokens > 8000)

    if (documents.length > 10) return true;
    if (complexity === 'complex' && documents.length > 5) return true;

    const estimatedTokens = estimateTokenCount(documents);
    if (estimatedTokens > 8000) return true;

    return false;
}

/**
 * Estimates token count for documents (rough approximation)
 */
function estimateTokenCount(documents: SearchHit[]): number {
    const totalChars = documents.reduce((sum, doc) => sum + doc.content.length, 0);
    return Math.ceil(totalChars / 4); // Rough estimate: 1 token ≈ 4 chars
}

/**
 * Summarizes multiple documents into a concise context
 * 
 * @param input - Question and documents to summarize
 * @param requestId - Request tracking ID
 * @returns SummarizationResult with condensed context
 */
export async function summarizeDocuments(
    input: SummarizationInput,
    requestId: string
): Promise<SummarizationResult> {
    const startTime = Date.now();
    logAgentStart('SummariserAgent', requestId, {
        question: input.question.substring(0, 100),
        documentCount: input.documents.length
    });

    try {
        const { question, documents, maxTokens = 2000 } = input;

        // Build summarization prompt
        const systemPrompt = buildSummarizationSystemPrompt(maxTokens);
        const userPrompt = buildSummarizationUserPrompt(question, documents);

        // Call Azure OpenAI for summarization
        const response = await openai.chat.completions.create({
            model: openAIConfig.chatDeployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2, // Low temperature for factual summarization
            max_tokens: maxTokens,
            top_p: 0.9
        });

        const summarizedContext = response.choices[0]?.message?.content;
        if (!summarizedContext) {
            throw new Error('No summary generated');
        }

        const timeMs = Date.now() - startTime;
        const tokensUsed = response.usage?.total_tokens;

        const result: SummarizationResult = {
            summarizedContext,
            originalDocCount: documents.length,
            ...(tokensUsed !== undefined && { tokensUsed }),
            timeMs,
            requestId
        };

        logAgentComplete('SummariserAgent', requestId, timeMs, {
            originalDocs: documents.length,
            tokensUsed,
            summaryLength: summarizedContext.length
        });

        return result;

    } catch (error) {
        logAgentError('SummariserAgent', requestId, error as Error);
        throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Builds the system prompt for summarization
 */
function buildSummarizationSystemPrompt(maxTokens: number): string {
    return `You are a document summarization assistant. Your job is to condense multiple documents into a coherent, concise summary that preserves all key information relevant to answering a user's question.

INSTRUCTIONS:
- Extract and synthesize the most relevant information from all documents
- Maintain factual accuracy - do not add information not present in the documents
- Organize information logically by topic/theme
- Preserve important details, numbers, dates, and names
- Remove redundancy and irrelevant content
- Keep the summary under ${maxTokens} tokens
- Use clear, professional language
- When documents conflict, note the discrepancy

Your summary will be used as context for answering the user's question, so focus on relevance.`;
}

/**
 * Builds the user prompt with question and documents
 */
function buildSummarizationUserPrompt(question: string, documents: SearchHit[]): string {
    let prompt = `QUESTION: ${question}\n\n`;
    prompt += `DOCUMENTS TO SUMMARIZE (${documents.length} total):\n\n`;

    documents.forEach((doc, index) => {
        prompt += `--- Document ${index + 1} ---\n`;
        prompt += `Source: ${doc.filename}\n`;
        prompt += `Category: ${doc.category}\n`;
        prompt += `Content:\n${doc.content}\n\n`;
    });

    prompt += `\nProvide a concise summary that captures all information relevant to answering the question.`;

    return prompt;
}

/**
 * Map-Reduce summarization for very large document sets (future enhancement)
 * 
 * Strategy:
 * 1. Split documents into chunks
 * 2. Summarize each chunk independently (map)
 * 3. Combine chunk summaries into final summary (reduce)
 */
export async function mapReduceSummarize(
    input: SummarizationInput,
    requestId: string
): Promise<SummarizationResult> {
    const startTime = Date.now();
    const chunkSize = 10; // Summarize 10 docs at a time

    // Split documents into chunks
    const chunks: SearchHit[][] = [];
    for (let i = 0; i < input.documents.length; i += chunkSize) {
        chunks.push(input.documents.slice(i, i + chunkSize));
    }

    // Map: Summarize each chunk
    const chunkSummaries: string[] = [];
    for (const chunk of chunks) {
        const chunkResult = await summarizeDocuments(
            { ...input, documents: chunk, maxTokens: 1000 },
            requestId
        );
        chunkSummaries.push(chunkResult.summarizedContext);
    }

    // Reduce: Combine chunk summaries
    const systemPrompt = `You are a document synthesis assistant. Combine these summaries into one coherent summary.`;
    const userPrompt = `Question: ${input.question}\n\nChunk Summaries:\n${chunkSummaries.join('\n\n')}\n\nProvide a final unified summary.`;

    const response = await openai.chat.completions.create({
        model: openAIConfig.chatDeployment,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: input.maxTokens || 2000
    });

    const summarizedContext = response.choices[0]?.message?.content;
    if (!summarizedContext) {
        throw new Error('No summary generated');
    }

    const tokensUsed = response.usage?.total_tokens;
    return {
        summarizedContext,
        originalDocCount: input.documents.length,
        ...(tokensUsed !== undefined && { tokensUsed }),
        timeMs: Date.now() - startTime,
        requestId
    };
}

