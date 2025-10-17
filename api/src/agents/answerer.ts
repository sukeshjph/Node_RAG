/**
 * Answerer Agent
 * Generates the final answer with citations based on:
 * - Retrieved documents OR summarized context
 * - Question category and complexity
 * - System prompt tailored to the domain
 */

import { AnswerInput, AnswerResult, QuestionCategory } from '../types/agent-types';
import { Citation, SearchHit } from '../user-query-types';
import { getOpenAIConfig, getRAGConfig } from '../config';
import { logAgentComplete, logAgentError, logAgentStart } from '../utils/logger';

import { AzureOpenAI } from 'openai';

const openAIConfig = getOpenAIConfig();
const ragConfig = getRAGConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

/**
 * Generates a grounded answer with citations
 * 
 * @param input - Question, documents/context, and metadata
 * @param requestId - Request tracking ID
 * @returns AnswerResult with answer and citations
 */
export async function generateAnswer(
    input: AnswerInput,
    requestId: string
): Promise<AnswerResult> {
    const startTime = Date.now();
    logAgentStart('AnswererAgent', requestId, {
        question: input.question.substring(0, 100),
        hasDocs: !!input.documents,
        hasSummary: !!input.summarizedContext,
        category: input.category
    });

    try {
        const { question, documents, summarizedContext, includeText, category } = input;

        // Build grounded prompt based on what context we have
        // Default includeText to true to ensure answerer gets document content
        const shouldIncludeText = includeText !== false;
        const { systemMessage, userMessage, citations } = documents
            ? buildGroundedPromptFromDocs(question, documents, shouldIncludeText, category)
            : buildGroundedPromptFromSummary(question, summarizedContext!, category);

        // Generate answer
        const response = await openai.chat.completions.create({
            model: openAIConfig.chatDeployment,
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.1, // Low temperature for factual accuracy
            max_tokens: 1000,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        });

        const answer = response.choices[0]?.message?.content;
        if (!answer) {
            throw new Error('No answer generated');
        }

        const timeMs = Date.now() - startTime;
        const result: AnswerResult = {
            answer: answer.trim(),
            citations,
            timeMs,
            requestId
        };

        logAgentComplete('AnswererAgent', requestId, timeMs, {
            answerLength: answer.length,
            citationCount: citations.length
        });

        return result;

    } catch (error) {
        logAgentError('AnswererAgent', requestId, error as Error);
        throw new Error(`Answer generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Builds system message tailored to the question category
 */
function buildCategorySpecificSystemMessage(category?: QuestionCategory): string {
    const basePrompt = ragConfig.systemPrompt;

    const categoryInstructions: Record<QuestionCategory, string> = {
        [QuestionCategory.HR]: `
You are an HR assistant. Focus on:
- Employee policies and procedures
- Benefits and compensation
- Workplace guidelines
- Professional and empathetic tone`,

        [QuestionCategory.TRADING]: `
You are a trading and financial markets assistant. Focus on:
- Market analysis and trends
- Trading strategies and instruments
- Risk management
- Data-driven, precise answers with numbers`,

        [QuestionCategory.TECHNICAL]: `
You are a technical support assistant. Focus on:
- Clear step-by-step instructions
- Technical accuracy
- Troubleshooting steps
- Code examples when relevant`,

        [QuestionCategory.GENERAL]: `
You are a general company assistant. Focus on:
- Clear, accessible explanations
- Company culture and values
- Helpful and friendly tone`,

        [QuestionCategory.FINANCE]: `
You are a finance and accounting assistant. Focus on:
- Financial accuracy
- Relevant regulations and compliance
- Clear explanations of financial concepts
- Precise numbers and calculations`,

        [QuestionCategory.COMPLIANCE]: `
You are a compliance and legal assistant. Focus on:
- Regulatory requirements
- Risk assessment
- Policy adherence
- Formal, precise language`
    };

    const categorySpecific = category ? categoryInstructions[category] : '';

    const groundingInstructions = `
IMPORTANT INSTRUCTIONS:
- Only answer based on the provided context documents or summary
- If the answer cannot be found in the context, say "I don't have enough information to answer that question"
- Include numbered citations like [1], [2], [3] that correspond to the source documents
- Be specific and cite the most relevant sources
- If you're unsure about something, say so rather than guessing
- Provide accurate, helpful responses based solely on the given context`;

    return `${basePrompt}\n\n${categorySpecific}\n\n${groundingInstructions}`.trim();
}

/**
 * Builds grounded prompt from retrieved documents
 */
function buildGroundedPromptFromDocs(
    question: string,
    documents: SearchHit[],
    includeText: boolean = false,
    category?: QuestionCategory
): {
    systemMessage: string;
    userMessage: string;
    citations: Citation[];
} {
    const systemMessage = buildCategorySpecificSystemMessage(category);

    const citations: Citation[] = [];
    let contextSection = 'CONTEXT DOCUMENTS:\n\n';

    documents.forEach((doc, index) => {
        const citationNumber = index + 1;
        const sourceLabel = `[${citationNumber}] ${doc.filename} (${doc.id})`;

        const citation: Citation = {
            id: doc.id,
            score: doc.score,
            filename: doc.filename,
            category: doc.category,
        };

        if (includeText) {
            citation.snippet = doc.content.substring(0, 200) + '...';
        }

        citations.push(citation);
        contextSection += `${sourceLabel}\n`;

        if (includeText) {
            contextSection += `${doc.content}\n\n`;
        } else {
            contextSection += `Category: ${doc.category}\n`;
            contextSection += `Created: ${doc.createdUtc}\n\n`;
        }
    });

    const userMessage = `${contextSection}QUESTION: ${question}\n\nPlease provide a comprehensive answer based on the context documents above. Include numbered citations [1], [2], etc. that correspond to the source documents.`;

    return {
        systemMessage,
        userMessage,
        citations
    };
}

/**
 * Builds grounded prompt from summarized context
 */
function buildGroundedPromptFromSummary(
    question: string,
    summary: string,
    category?: QuestionCategory
): {
    systemMessage: string;
    userMessage: string;
    citations: Citation[];
} {
    const systemMessage = buildCategorySpecificSystemMessage(category);

    const userMessage = `SUMMARIZED CONTEXT:

${summary}

QUESTION: ${question}

Please provide a comprehensive answer based on the summarized context above. Note that citations may be limited as the context was pre-summarized from multiple documents.`;

    // No specific citations available when using summary
    const citations: Citation[] = [{
        id: 'summarized',
        score: 1.0,
        filename: 'Multiple documents (summarized)',
        category: 'Summary'
    }];

    return {
        systemMessage,
        userMessage,
        citations
    };
}

/**
 * Validates answer quality (future enhancement)
 */
export function validateAnswer(answer: string): {
    isValid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    // Check if answer is too short
    if (answer.length < 50) {
        issues.push('Answer is too short');
    }

    // Check if answer contains citations
    if (!answer.match(/\[\d+\]/)) {
        issues.push('Answer does not contain citations');
    }

    // Check for "I don't know" patterns
    const uncertainPhrases = [
        "I don't have enough information",
        "cannot be found",
        "not available in the context"
    ];
    const hasUncertainty = uncertainPhrases.some(phrase =>
        answer.toLowerCase().includes(phrase.toLowerCase())
    );

    if (hasUncertainty && answer.length < 100) {
        issues.push('Answer indicates insufficient context');
    }

    return {
        isValid: issues.length === 0,
        issues
    };
}

