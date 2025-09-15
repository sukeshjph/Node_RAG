/**
 * Production environment configuration
 * 
 * This file contains environment-specific settings for the production build.
 * It includes production API endpoints, Azure Storage configuration, and other production-specific settings.
 */

export const environment = {
    production: true,

    // API Configuration
    apiBaseUrl: 'https://your-api-domain.com',
    apiUploadUrl: 'https://your-api-domain.com/upload',
    sasTokenApi: 'https://your-api-domain.com/sas-token',

    // Azure Storage Configuration
    storageContainerName: 'docs-input',
    storageAccountName: '', // Will be provided via environment variables
    storageAccountKey: '', // Will be provided via environment variables

    // Application Settings
    appName: 'RAG Chat UI',
    appVersion: '1.0.0',

    // Feature Flags
    enableDragDrop: true,
    enableMarkdown: true,
    enableFilePreview: true,

    // Upload Settings
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.txt', '.pdf'],

    // Chat Settings
    maxChatHistory: 50,
    enableTypingIndicator: true,

    // UI Settings
    theme: 'light',
    primaryColor: '#1976d2',
    accentColor: '#ff4081',
};
