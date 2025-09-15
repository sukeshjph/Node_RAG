/**
 * Chat-related data models
 * 
 * This file contains TypeScript interfaces and types for chat functionality,
 * including messages, responses, and user interactions.
 */

// ======================
// Chat Message Models
// ======================

/**
 * Represents a single chat message
 */
export interface ChatMessage {
    id: string;
    content: string;
    timestamp: Date;
    sender: 'user' | 'assistant';
    isTyping?: boolean;
    error?: string;
}

/**
 * Represents a citation from the RAG response
 */
export interface Citation {
    id: string;
    score: number;
    filename: string;
    category: string;
    snippet?: string;
}

/**
 * Represents the response from the RAG API
 */
export interface RAGResponse {
    answer: string;
    citations: Citation[];
    usage: {
        embeddingMs: number;
        searchMs: number;
        llmMs: number;
    };
}

/**
 * Represents a query request to the RAG API
 */
export interface QueryRequest {
    q: string;
    filters?: Record<string, string>;
    k?: number;
    knn?: number;
    vectorField?: string;
    includeText?: boolean;
}

// ======================
// Chat State Models
// ======================

/**
 * Represents the current state of the chat
 */
export interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    isTyping: boolean;
}

/**
 * Represents chat history for persistence
 */
export interface ChatHistory {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

// ======================
// UI State Models
// ======================

/**
 * Represents the current UI state
 */
export interface UIState {
    currentView: 'chat' | 'upload';
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
}

/**
 * Represents notification data
 */
export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    timestamp: Date;
}
