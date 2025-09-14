import "dotenv/config";

// ======================
// Environment Configuration
// ======================
export const config = {
    azure: {
        search: {
            endpoint: process.env.AZURE_SEARCH_ENDPOINT as string,
            key: process.env.AZURE_SEARCH_KEY as string,
            index: process.env.AZURE_SEARCH_INDEX as string,
        },
        openai: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT as string,
            apiKey: process.env.AZURE_OPENAI_API_KEY as string,
            deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME as string,
            apiVersion: "2024-10-21" as const,
        }
    }
} as const;

// ======================
// Validation
// ======================
export function validateConfig() {
    const required = [
        'AZURE_SEARCH_ENDPOINT',
        'AZURE_SEARCH_KEY',
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT_NAME'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}