/**
 * Development environment configuration
 * 
 * This file contains environment-specific settings for the development build.
 * It includes API endpoints, Azure Storage configuration, and other development-specific settings.
 */

export const environment = {
    production: false,

    // API Configuration
    apiBaseUrl: 'http://localhost:3000',
    apiUploadUrl: 'http://localhost:3000/upload', // Placeholder - implement upload endpoint
    sasTokenApi: 'http://localhost:3000/sas-token', // Placeholder - implement SAS token endpoint

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
