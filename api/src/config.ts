import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
    AZURE_SEARCH_ENDPOINT: z.string().url(),
    AZURE_SEARCH_KEY: z.string().min(1),
    AZURE_SEARCH_INDEX_ALIAS: z.string().min(1),
    AZURE_OPENAI_ENDPOINT: z.string().url(),
    AZURE_OPENAI_API_KEY: z.string().min(1),
    AZURE_OPENAI_API_VERSION: z.string().default('2024-10-21'),
    AZURE_OPENAI_EMBED_DEPLOYMENT: z.string().min(1),
    AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().min(1),
    SYSTEM_PROMPT: z.string().default('You are a helpful assistant. Answer based on the provided context and cite sources.'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse(process.env);

export const getSearchConfig = () => ({
    endpoint: config.AZURE_SEARCH_ENDPOINT,
    key: config.AZURE_SEARCH_KEY,
    indexAlias: config.AZURE_SEARCH_INDEX_ALIAS,
});

export const getOpenAIConfig = () => ({
    endpoint: config.AZURE_OPENAI_ENDPOINT,
    apiKey: config.AZURE_OPENAI_API_KEY,
    apiVersion: config.AZURE_OPENAI_API_VERSION,
    embedDeployment: config.AZURE_OPENAI_EMBED_DEPLOYMENT,
    chatDeployment: config.AZURE_OPENAI_CHAT_DEPLOYMENT,
});

export const getRAGConfig = () => ({
    systemPrompt: config.SYSTEM_PROMPT,
});