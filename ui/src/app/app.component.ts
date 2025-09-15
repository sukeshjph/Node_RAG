/**
 * App Component
 * 
 * This is the root component of the Angular application.
 * It provides the main layout with navigation and router outlet.
 * 
 * Features:
 * - Navigation between chat and upload views
 * - Responsive sidebar navigation
 * - Theme switching
 * - Service health monitoring
 */

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { ChatService } from './services/chat.service';
import { MatSidenav } from '@angular/material/sidenav';
import { UploadService } from './services/upload.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    @ViewChild('sidenav', { static: false }) sidenav!: MatSidenav;

    title = 'RAG Chat UI';

    // Navigation state
    isHandset = false;
    sidebarOpen = true;

    // Service health
    serviceHealthy = true;
    lastHealthCheck: Date | null = null;

    // Theme
    isDarkTheme = false;

    // Destroy subject for cleanup
    private destroy$ = new Subject<void>();

    constructor(
        private breakpointObserver: BreakpointObserver,
        private chatService: ChatService,
        private uploadService: UploadService
    ) { }

    ngOnInit(): void {
        this.initializeBreakpointObserver();
        this.checkServiceHealth();
        this.loadThemePreference();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ======================
    // Public Methods
    // ======================

    /**
     * Toggle sidebar
     */
    toggleSidebar(): void {
        this.sidenav.toggle();
    }

    /**
     * Close sidebar on mobile
     */
    closeSidebar(): void {
        if (this.isHandset) {
            this.sidenav.close();
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme(): void {
        this.isDarkTheme = !this.isDarkTheme;
        this.saveThemePreference();
        this.applyTheme();
    }

    /**
     * Check service health
     */
    checkServiceHealth(): void {
        this.chatService.checkHealth().subscribe({
            next: () => {
                this.serviceHealthy = true;
                this.lastHealthCheck = new Date();
            },
            error: () => {
                this.serviceHealthy = false;
                this.lastHealthCheck = new Date();
            }
        });
    }

    /**
     * Get health status text
     */
    getHealthStatusText(): string {
        if (!this.lastHealthCheck) {
            return 'Checking...';
        }

        return this.serviceHealthy ? 'Online' : 'Offline';
    }

    /**
     * Get health status color
     */
    getHealthStatusColor(): string {
        return this.serviceHealthy ? 'primary' : 'warn';
    }

    // ======================
    // Private Methods
    // ======================

    /**
     * Initialize breakpoint observer
     */
    private initializeBreakpointObserver(): void {
        this.breakpointObserver
            .observe([Breakpoints.Handset])
            .pipe(takeUntil(this.destroy$))
            .subscribe(result => {
                this.isHandset = result.matches;

                // Auto-close sidebar on mobile
                if (this.isHandset) {
                    this.sidenav.close();
                } else {
                    this.sidenav.open();
                }
            });
    }

    /**
     * Load theme preference from localStorage
     */
    private loadThemePreference(): void {
        const savedTheme = localStorage.getItem('rag-chat-theme');
        this.isDarkTheme = savedTheme === 'dark';
        this.applyTheme();
    }

    /**
     * Save theme preference to localStorage
     */
    private saveThemePreference(): void {
        localStorage.setItem('rag-chat-theme', this.isDarkTheme ? 'dark' : 'light');
    }

    /**
     * Apply theme to document
     */
    private applyTheme(): void {
        if (this.isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
}
