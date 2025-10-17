import { AzureOpenAI } from 'openai';
import { getOpenAIConfig } from './config';

const openAIConfig = getOpenAIConfig();

const openai = new AzureOpenAI({
    endpoint: openAIConfig.endpoint,
    apiKey: openAIConfig.apiKey,
    apiVersion: openAIConfig.apiVersion,
});

export async function embedQuery(text: string): Promise<number[]> {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('Text input is required and must be a string');
        }

        const response = await openai.embeddings.create({
            model: openAIConfig.embedDeployment, // Use deployment name from config
            input: text,
        });

        const embedding = response.data[0]?.embedding;

        if (!embedding || !Array.isArray(embedding)) {
            throw new Error('Invalid embedding response from Azure OpenAI');
        }

        return embedding;

    } catch (error) {
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}