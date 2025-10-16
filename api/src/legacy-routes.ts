/**
 * Legacy Routes
 * 
 * Backward compatibility endpoints for existing clients.
 * These routes use the modern multi-agent system under the hood
 * but maintain the old API contract for seamless migration.
 */

import express from 'express';
import { z } from 'zod';
import { logger } from './utils/logger';
import { retrieveDocuments } from './agents/retriever';
import { generateAnswer } from './agents/answerer';

// Legacy request schema (matches old API)
const legacyQuerySchema = z.object({
    question: z.string().min(1, 'Question is required'),
    maxResults: z.number().optional().default(6),
    includeText: z.boolean().optional().default(false),
});

/**
 * Legacy /query endpoint
 * 
 * Maintains backward compatibility with old clients while using
 * the modern multi-agent system for better performance and reliability.
 */
export function setupLegacyRoutes(app: express.Application): void {
    // Legacy /query endpoint - uses modern agents under the hood
    app.post('/query', async (req, res) => {
        const requestId = req.headers['x-request-id'] as string;

        try {
            const { question, maxResults, includeText } = legacyQuerySchema.parse(req.body);

            logger.info({ 
                requestId, 
                endpoint: '/query (legacy)', 
                query: question.substring(0, 100) 
            }, 'Legacy query request');

            // Use modern retriever agent
            const retrieval = await retrieveDocuments(question, requestId, { k: maxResults });

            if (retrieval.documents.length === 0) {
                return res.status(404).json({
                    error: 'No relevant documents found',
                    requestId
                });
            }

            // Use modern answerer agent
            const promptStartTime = Date.now();
            const { answer, citations } = await generateAnswer({
                question,
                documents: retrieval.documents,
                includeText,
            }, requestId);
            const promptTimeMs = Date.now() - promptStartTime;

            logger.info({
                requestId,
                answerLength: answer.length,
                citationCount: citations.length,
                retrievalMetrics: retrieval.metrics
            }, 'Legacy query completed');

            return res.json({
                answer,
                citations,
                requestId,
                metrics: {
                    retrievalTimeMs: retrieval.metrics.retrievalTimeMs,
                    reRankingTimeMs: retrieval.metrics.reRankingTimeMs,
                    promptTimeMs: promptTimeMs,
                    totalTimeMs: Date.now() - Date.now() + retrieval.metrics.retrievalTimeMs + promptTimeMs
                }
            });

        } catch (error) {
            logger.error({ 
                requestId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }, 'Legacy query failed');

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: error.errors,
                    requestId
                });
            }

            return res.status(500).json({
                error: 'Internal server error',
                requestId
            });
        }
    });

    logger.info('Legacy routes configured successfully');
}
