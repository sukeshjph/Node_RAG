/**
 * Chat Component
 * 
 * This component provides the main chat interface for interacting with the RAG API.
 * It includes message display, input handling, typing indicators, and citation display.
 * 
 * Features:
 * - Real-time chat interface
 * - Message history with scroll
 * - Typing indicators
 * - Citation display
 * - Error handling
 * - Responsive design
 */

import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatMessage, RAGResponse } from '../../models/chat.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ChatService } from '../../services/chat.service';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messageContainer', { static: false }) messageContainer!: ElementRef;

    // Form and input
    chatForm: FormGroup;
    messageInput = '';

    // State
    messages: ChatMessage[] = [];
    isLoading = false;
    isTyping = false;
    error: string | null = null;

    // Auto-scroll
    private shouldScrollToBottom = false;

    // Destroy subject for cleanup
    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private chatService: ChatService
    ) {
        this.chatForm = this.fb.group({
            message: ['', [Validators.required, Validators.minLength(1)]]
        });
    }

    ngOnInit(): void {
        this.initializeSubscriptions();
        this.setupMessageInput();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    // ======================
    // Public Methods
    // ======================

    /**
     * Send a message
     */
    sendMessage(): void {
        if (this.chatForm.valid && !this.isLoading) {
            const message = this.chatForm.get('message')?.value?.trim();
            if (message) {
                this.messageInput = '';
                this.chatForm.reset();
                this.sendQuery(message);
            }
        }
    }

    /**
     * Handle Enter key press
     */
    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    /**
     * Clear chat history
     */
    clearChat(): void {
        this.chatService.clearMessages();
    }

    /**
     * Retry last failed message
     */
    retryLastMessage(): void {
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.error) {
            // Find the user message before this one
            const userMessageIndex = this.messages.findIndex(
                (msg, index) => index < this.messages.length - 1 && msg.sender === 'user'
            );

            if (userMessageIndex !== -1) {
                const userMessage = this.messages[userMessageIndex];
                this.sendQuery(userMessage.content);
            }
        }
    }

    /**
     * Copy message to clipboard
     */
    copyMessage(message: ChatMessage): void {
        navigator.clipboard.writeText(message.content).then(() => {
            // TODO: Show success notification
            console.log('Message copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy message:', err);
        });
    }

    // ======================
    // Private Methods
    // ======================

    /**
     * Initialize component subscriptions
     */
    private initializeSubscriptions(): void {
        // Subscribe to messages
        this.chatService.messages$
            .pipe(takeUntil(this.destroy$))
            .subscribe(messages => {
                this.messages = messages;
                this.shouldScrollToBottom = true;
            });

        // Subscribe to loading state
        this.chatService.isLoading$
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                this.isLoading = loading;
            });

        // Subscribe to typing indicator
        this.chatService.isTyping$
            .pipe(takeUntil(this.destroy$))
            .subscribe(typing => {
                this.isTyping = typing;
            });

        // Subscribe to errors
        this.chatService.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => {
                this.error = error;
            });
    }

    /**
     * Setup message input with debouncing
     */
    private setupMessageInput(): void {
        this.chatForm.get('message')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(value => {
                this.messageInput = value;
            });
    }

    /**
     * Send query to RAG API
     */
    private sendQuery(query: string): void {
        this.chatService.sendQuery(query).subscribe({
            next: (message) => {
                console.log('Message sent successfully:', message);
            },
            error: (error) => {
                console.error('Failed to send message:', error);
            }
        });
    }

    /**
     * Scroll to bottom of message container
     */
    private scrollToBottom(): void {
        if (this.messageContainer) {
            const element = this.messageContainer.nativeElement;
            element.scrollTop = element.scrollHeight;
        }
    }

    // ======================
    // Template Helpers
    // ======================

    /**
     * Check if message is from user
     */
    isUserMessage(message: ChatMessage): boolean {
        return message.sender === 'user';
    }

    /**
     * Check if message is from assistant
     */
    isAssistantMessage(message: ChatMessage): boolean {
        return message.sender === 'assistant';
    }

    /**
     * Check if message has error
     */
    hasError(message: ChatMessage): boolean {
        return !!message.error;
    }

    /**
     * Format message timestamp
     */
    formatTimestamp(timestamp: Date): string {
        return new Date(timestamp).toLocaleTimeString();
    }

    /**
     * Check if should show typing indicator
     */
    shouldShowTypingIndicator(): boolean {
        return this.isTyping && !this.isLoading;
    }

    /**
     * Check if should show loading spinner
     */
    shouldShowLoadingSpinner(): boolean {
        return this.isLoading && !this.isTyping;
    }

    /**
     * Get message classes for styling
     */
    getMessageClasses(message: ChatMessage): string[] {
        const classes = ['message'];

        if (this.isUserMessage(message)) {
            classes.push('user-message');
        } else {
            classes.push('assistant-message');
        }

        if (this.hasError(message)) {
            classes.push('error-message');
        }

        return classes;
    }

    /**
     * Check if there are any messages
     */
    hasMessages(): boolean {
        return this.messages.length > 0;
    }

    /**
     * Check if there are any errors
     */
    hasErrors(): boolean {
        return this.messages.some(message => this.hasError(message));
    }

    /**
     * Get the last message
     */
    getLastMessage(): ChatMessage | null {
        return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
    }
}
