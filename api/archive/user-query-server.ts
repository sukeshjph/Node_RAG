import { config } from './config';
import express from 'express';
import pino from 'pino';
import { processRAGQuery } from './user-query-prompt';
import { retrieveDocuments } from './user-query-retriever';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const logger = pino(
    config.NODE_ENV === 'development' ? {
        level: 'debug',
        transport: {
            target: 'pino-pretty',
            options: { colorize: true }
        }
    } : {
        level: 'info'
    }
);

const querySchema = z.object({
    question: z.string().min(1).max(1000),
    maxResults: z.number().int().min(1).max(20).optional().default(6),
    includeText: z.boolean().optional().default(false),
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
});

app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/query', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question, maxResults, includeText } = querySchema.parse(req.body);

        logger.info({ requestId, query: question.substring(0, 100) }, 'Processing query');

        const { results: documents, metrics } = await retrieveDocuments(question, { k: maxResults });

        if (documents.length === 0) {
            return res.status(404).json({
                error: 'No relevant documents found',
                requestId
            });
        }

        const promptStartTime = Date.now();
        const { answer, citations } = await processRAGQuery(question, documents, includeText);
        const promptTimeMs = Date.now() - promptStartTime;

        // Update metrics with prompt timing
        metrics.promptTimeMs = promptTimeMs;
        metrics.totalTimeMs = Date.now() - Date.now() + metrics.totalTimeMs + promptTimeMs;

        logger.info({
            requestId,
            answerLength: answer.length,
            citationCount: citations.length,
            metrics
        }, 'Query completed');

        return res.json({
            answer,
            citations,
            requestId,
            metrics: {
                retrievalTimeMs: metrics.retrievalTimeMs,
                reRankingTimeMs: metrics.reRankingTimeMs,
                promptTimeMs: metrics.promptTimeMs,
                totalTimeMs: metrics.totalTimeMs
            }
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Query failed');

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

const port = config.PORT;
app.listen(port, () => {
    logger.info({ port }, 'Server started');
    console.log(`🚀 RAG API running on port ${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`🔍 Query: http://localhost:${port}/query`);
});