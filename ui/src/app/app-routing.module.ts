/**
 * App Routing Module
 * 
 * This module defines the routing configuration for the Angular application.
 * It includes routes for the chat and upload components with lazy loading support.
 * 
 * @see https://angular.io/guide/routing
 */

import { RouterModule, Routes } from '@angular/router';

import { NgModule } from '@angular/core';

const routes: Routes = [
    // Default route - redirect to chat
    {
        path: '',
        redirectTo: '/chat',
        pathMatch: 'full'
    },

    // Chat route
    {
        path: 'chat',
        loadComponent: () => import('./components/chat/chat.component').then(m => m.ChatComponent),
        title: 'RAG Chat - Chat Interface'
    },

    // Upload route
    {
        path: 'upload',
        loadComponent: () => import('./components/upload/upload.component').then(m => m.UploadComponent),
        title: 'RAG Chat - Document Upload'
    },

    // Wildcard route - redirect to chat for any unknown routes
    {
        path: '**',
        redirectTo: '/chat'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        // Enable tracing for debugging (remove in production)
        enableTracing: false,

        // Use hash routing for better compatibility
        useHash: false,

        // Scroll to top on route change
        scrollPositionRestoration: 'top',

        // Preload all modules for better performance
        preloadingStrategy: undefined
    })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
