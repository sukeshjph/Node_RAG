/**
 * Chat Service
 * 
 * This service handles all chat-related functionality including:
 * - Sending queries to the RAG API
 * - Managing chat history
 * - Handling typing indicators
 * - Error handling for chat operations
 * 
 * @see https://angular.io/guide/http
 * @see https://rxjs.dev/
 */

import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { ChatMessage, QueryRequest, RAGResponse } from '../models/chat.model';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private readonly apiUrl = environment.apiBaseUrl;
    private readonly maxChatHistory = environment.maxChatHistory;

    // State management
    private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
    private isLoadingSubject = new BehaviorSubject<boolean>(false);
    private errorSubject = new BehaviorSubject<string | null>(null);
    private isTypingSubject = new BehaviorSubject<boolean>(false);

    // Public observables
    public messages$ = this.messagesSubject.asObservable();
    public isLoading$ = this.isLoadingSubject.asObservable();
    public error$ = this.errorSubject.asObservable();
    public isTyping$ = this.isTypingSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadChatHistory();
    }

    // ======================
    // Public Methods
    // ======================

    /**
     * Send a query to the RAG API
     * 
     * @param query - The user's query string
     * @param options - Optional query parameters
     * @returns Observable<ChatMessage> - The assistant's response message
     */
    sendQuery(query: string, options?: Partial<QueryRequest>): Observable<ChatMessage> {
        if (!query.trim()) {
            return throwError(() => new Error('Query cannot be empty'));
        }

        // Add user message
        const userMessage = this.createMessage(query, 'user');
        this.addMessage(userMessage);

        // Set loading state
        this.setLoading(true);
        this.setError(null);

        // Prepare request
        const request: QueryRequest = {
            q: query,
            ...options
        };

        // Show typing indicator
        this.setTyping(true);

        // Send request to RAG API
        return this.http.post<RAGResponse>(`${this.apiUrl}/query`, request, {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        }).pipe(
            tap(() => this.setTyping(false)),
            map(response => this.createAssistantMessage(response)),
            tap(message => {
                this.addMessage(message);
                this.setLoading(false);
                this.saveChatHistory();
            }),
            catchError(error => {
                this.setTyping(false);
                this.setLoading(false);
                const errorMessage = this.handleError(error);
                this.setError(errorMessage);

                // Add error message
                const errorMsg = this.createMessage(
                    `Sorry, I encountered an error: ${errorMessage}`,
                    'assistant',
                    errorMessage
                );
                this.addMessage(errorMsg);

                return throwError(() => error);
            })
        );
    }

    /**
     * Add a message to the chat
     * 
     * @param message - The message to add
     */
    addMessage(message: ChatMessage): void {
        const currentMessages = this.messagesSubject.value;
        const updatedMessages = [...currentMessages, message];

        // Limit chat history
        if (updatedMessages.length > this.maxChatHistory) {
            updatedMessages.splice(0, updatedMessages.length - this.maxChatHistory);
        }

        this.messagesSubject.next(updatedMessages);
    }

    /**
     * Clear all messages
     */
    clearMessages(): void {
        this.messagesSubject.next([]);
        this.saveChatHistory();
    }

    /**
     * Get current messages
     */
    getMessages(): ChatMessage[] {
        return this.messagesSubject.value;
    }

    /**
     * Set loading state
     */
    setLoading(loading: boolean): void {
        this.isLoadingSubject.next(loading);
    }

    /**
     * Set error state
     */
    setError(error: string | null): void {
        this.errorSubject.next(error);
    }

    /**
     * Set typing indicator
     */
    setTyping(typing: boolean): void {
        this.isTypingSubject.next(typing);
    }

    // ======================
    // Private Methods
    // ======================

    /**
     * Create a chat message
     */
    private createMessage(
        content: string,
        sender: 'user' | 'assistant',
        error?: string
    ): ChatMessage {
        return {
            id: this.generateId(),
            content,
            timestamp: new Date(),
            sender,
            error
        };
    }

    /**
     * Create an assistant message from RAG response
     */
    private createAssistantMessage(response: RAGResponse): ChatMessage {
        const message = this.createMessage(response.answer, 'assistant');

        // Add citations to the message content if available
        if (response.citations && response.citations.length > 0) {
            const citationsText = this.formatCitations(response.citations);
            message.content += `\n\n**Sources:**\n${citationsText}`;
        }

        return message;
    }

    /**
     * Format citations for display
     */
    private formatCitations(citations: any[]): string {
        return citations.map((citation, index) =>
            `${index + 1}. ${citation.filename} (${citation.category})`
        ).join('\n');
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Handle HTTP errors
     */
    private handleError(error: HttpErrorResponse): string {
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            return `Client error: ${error.error.message}`;
        } else {
            // Server-side error
            const errorMessage = error.error?.error?.message || error.message || 'Unknown error occurred';
            return `Server error (${error.status}): ${errorMessage}`;
        }
    }

    /**
     * Save chat history to localStorage
     */
    private saveChatHistory(): void {
        try {
            const messages = this.messagesSubject.value;
            localStorage.setItem('rag-chat-history', JSON.stringify(messages));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }

    /**
     * Load chat history from localStorage
     */
    private loadChatHistory(): void {
        try {
            const saved = localStorage.getItem('rag-chat-history');
            if (saved) {
                const messages = JSON.parse(saved);
                // Convert timestamp strings back to Date objects
                const parsedMessages = messages.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                this.messagesSubject.next(parsedMessages);
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
        }
    }

    // ======================
    // Utility Methods
    // ======================

    /**
     * Check if the service is healthy
     */
    checkHealth(): Observable<boolean> {
        return this.http.get(`${this.apiUrl}/health`).pipe(
            map(() => true),
            catchError(() => throwError(() => new Error('Service is not available')))
        );
    }

    /**
     * Get service information
     */
    getServiceInfo(): Observable<any> {
        return this.http.get(`${this.apiUrl}/info`);
    }

    /**
     * Simulate typing indicator
     */
    simulateTyping(duration: number = 2000): Observable<void> {
        this.setTyping(true);
        return timer(duration).pipe(
            tap(() => this.setTyping(false)),
            map(() => void 0)
        );
    }
}
