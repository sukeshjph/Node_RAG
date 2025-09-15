import express from 'express';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { processRAGQuery } from './prompt.js';
import { retrieveDocuments } from './retrieve.js';
import { config } from './config.js';

const logger = pino({
    level: config.NODE_ENV === 'development' ? 'debug' : 'info',
    transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true }
    } : undefined,
});

const querySchema = z.object({
    q: z.string().min(1).max(1000),
    k: z.number().int().min(1).max(20).optional().default(6),
    includeText: z.boolean().optional().default(false),
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
});

app.post('/query', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { q, k, includeText } = querySchema.parse(req.body);

        logger.info({ requestId, query: q.substring(0, 100) }, 'Processing query');

        const documents = await retrieveDocuments(q, { k });

        if (documents.length === 0) {
            return res.status(404).json({
                error: 'No relevant documents found',
                requestId
            });
        }

        const { answer, citations } = await processRAGQuery(q, documents, includeText);

        logger.info({ requestId, answerLength: answer.length, citationCount: citations.length }, 'Query completed');

        res.json({ answer, citations, requestId });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Query failed');

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request',
                details: error.errors,
                requestId
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            requestId
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const port = config.PORT;
app.listen(port, () => {
    logger.info({ port }, 'Server started');
    console.log(`🚀 RAG API running on port ${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`🔍 Query: http://localhost:${port}/query`);
});