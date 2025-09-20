import { Citation, SearchHit } from './user-query-types';
import { getOpenAIConfig, getRAGConfig } from './config';

import { AzureOpenAI } from 'openai';

const openAIConfig = getOpenAIConfig();
const ragConfig = getRAGConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

export function buildGroundedPrompt(
    question: string,
    context: SearchHit[],
    includeText: boolean = false
): {
    systemMessage: string;
    userMessage: string;
    citations: Citation[];
} {
    const systemMessage = buildSystemMessage();
    const { userMessage, citations } = buildUserMessage(question, context, includeText);

    return {
        systemMessage,
        userMessage,
        citations,
    };
}

function buildSystemMessage(): string {
    const basePrompt = ragConfig.systemPrompt;

    const groundingInstructions = `
IMPORTANT INSTRUCTIONS:
- Only answer based on the provided context documents
- If the answer cannot be found in the context, say "I don't have enough information to answer that question"
- Include numbered citations like [1], [2], [3] that correspond to the source documents
- Be specific and cite the most relevant sources
- If you're unsure about something, say so rather than guessing
- Provide accurate, helpful responses based solely on the given context`;

    return `${basePrompt}\n\n${groundingInstructions}`.trim();
}

function buildUserMessage(
    question: string,
    context: SearchHit[],
    includeText: boolean
): {
    userMessage: string;
    citations: Citation[];
} {
    const citations: Citation[] = [];
    let contextSection = 'CONTEXT DOCUMENTS:\n\n';

    context.forEach((hit, index) => {
        const citationNumber = index + 1;
        const sourceLabel = `[${citationNumber}] ${hit.filename} (${hit.id})`;
        const citation: Citation = {
            id: hit.id,
            score: hit.score,
            filename: hit.filename,
            category: hit.category,
        };

        if (includeText) {
            citation.snippet = hit.content.substring(0, 200) + '...';
        }

        citations.push(citation);
        contextSection += `${sourceLabel}\n`;
        if (includeText) {
            contextSection += `${hit.content}\n\n`;
        } else {
            contextSection += `Category: ${hit.category}\n`;
            contextSection += `Created: ${hit.createdUtc}\n\n`;
        }
    });

    const userMessage = `${contextSection}QUESTION: ${question}\n\nPlease provide a comprehensive answer based on the context documents above. 
    Include numbered citations [1], [2], etc. that correspond to the source documents.`;

    return {
        userMessage,
        citations,
    };
}

export async function generateResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
    try {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Messages array is required and cannot be empty');
        }

        const response = await openai.chat.completions.create({
            model: openAIConfig.chatDeployment,
            messages: messages as any,
            temperature: 0.1,
            max_tokens: 1000,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1,
        });

        const generatedText = response.choices[0]?.message?.content;

        if (!generatedText) {
            throw new Error('No response generated from Azure OpenAI');
        }

        return generatedText.trim();

    } catch (error) {
        throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function processRAGQuery(
    question: string,
    context: SearchHit[],
    includeText: boolean = false
): Promise<{
    answer: string;
    citations: Citation[];
}> {
    try {
        const { systemMessage, userMessage, citations } = buildGroundedPrompt(
            question,
            context,
            includeText
        );

        const answer = await generateResponse([
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ]);

        return {
            answer,
            citations,
        };

    } catch (error) {
        throw error;
    }
}