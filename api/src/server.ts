/**
 * Multi-Agent RAG API Server
 * 
 * Modular routes:
 * - POST /api/classify → Classifier Agent
 * - POST /api/retrieve → Retriever Agent
 * - POST /api/summarise → Summariser Agent
 * - POST /api/answer → Answerer Agent
 * - POST /api/ask → Orchestrator (full pipeline)
 * 
 * Legacy support:
 * - POST /query → Backwards compatible endpoint
 */

// Import types

// Import agents
import { classifyQuestion } from './agents/classifier';
import { config } from './config';
import express from 'express';
import { generateAnswer } from './agents/answerer';
// Import orchestrator dynamically based on config
import { getOrchestratorConfig } from './config';
import { logger } from './utils/logger';
// Legacy imports for backwards compatibility
import { retrieveDocuments } from './agents/retriever';
import { setupLegacyRoutes } from './legacy-routes';
import { summarizeDocuments } from './agents/summariser';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Dynamic orchestrator loading based on config
const orchestratorConfig = getOrchestratorConfig();
let executeRAGPipeline: any;

try {
    if (orchestratorConfig.type === 'langgraph') {
        // Try to import LangGraph orchestrator
        const langgraphModule = require('./orchestrator-langgraph');
        executeRAGPipeline = langgraphModule.executeRAGPipeline;
        console.log('🎭 Using LangGraph orchestrator');
    } else {
        // Use simple orchestrator (default)
        const simpleModule = require('./orchestrator-simple');
        executeRAGPipeline = simpleModule.executeRAGPipeline;
        console.log('🎭 Using Simple orchestrator');
    }
} catch (error) {
    // Fallback to simple orchestrator if LangGraph fails
    const simpleModule = require('./orchestrator-simple');
    executeRAGPipeline = simpleModule.executeRAGPipeline;
    console.log('🎭 Fallback to Simple orchestrator (LangGraph not available)');
}



// ========================================
// Request Schemas
// ========================================

const classifySchema = z.object({
    question: z.string().min(1).max(1000),
});

const retrieveSchema = z.object({
    question: z.string().min(1).max(1000),
    maxResults: z.number().int().min(1).max(20).optional().default(6),
});

const summariseSchema = z.object({
    question: z.string().min(1).max(1000),
    documents: z.array(z.any()).min(1),
});

const answerSchema = z.object({
    question: z.string().min(1).max(1000),
    documents: z.array(z.any()).optional(),
    summarizedContext: z.string().optional(),
    includeText: z.boolean().optional().default(false),
});

const askSchema = z.object({
    question: z.string().min(1).max(1000),
    maxResults: z.number().int().min(1).max(20).optional().default(6),
    includeText: z.boolean().optional().default(false),
});


// ========================================
// Express App Setup
// ========================================

const app = express();
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
});

// ========================================
// Health Check
// ========================================

app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-multi-agent'
    });
});

// ========================================
// Modular Agent Routes
// ========================================

/**
 * POST /api/classify
 * Classifies a question into category and complexity
 */
app.post('/api/classify', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question } = classifySchema.parse(req.body);

        logger.info({ requestId, endpoint: '/api/classify' }, 'Classify request');

        const result = await classifyQuestion(question, requestId);

        return res.json({
            category: result.category,
            complexity: result.complexity,
            confidence: result.confidence,
            reasoning: result.reasoning,
            requestId,
            timeMs: result.timeMs,
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Classify failed');

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

/**
 * POST /api/retrieve
 * Retrieves relevant documents from Azure Cognitive Search
 */
app.post('/api/retrieve', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question, maxResults } = retrieveSchema.parse(req.body);

        logger.info({ requestId, endpoint: '/api/retrieve' }, 'Retrieve request');

        const result = await retrieveDocuments(question, requestId, { k: maxResults });

        return res.json({
            documents: result.documents,
            metrics: result.metrics,
            requestId,
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Retrieve failed');

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

/**
 * POST /api/summarise
 * Summarizes multiple documents into concise context
 */
app.post('/api/summarise', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question, documents } = summariseSchema.parse(req.body);

        logger.info({ requestId, endpoint: '/api/summarise' }, 'Summarise request');

        const result = await summarizeDocuments(
            { question, documents },
            requestId
        );

        return res.json({
            summarizedContext: result.summarizedContext,
            originalDocCount: result.originalDocCount,
            tokensUsed: result.tokensUsed,
            requestId,
            timeMs: result.timeMs,
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Summarise failed');

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

/**
 * POST /api/answer
 * Generates an answer with citations from documents or summary
 */
app.post('/api/answer', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question, documents, summarizedContext, includeText } = answerSchema.parse(req.body);

        if (!documents && !summarizedContext) {
            return res.status(400).json({
                error: 'Either documents or summarizedContext must be provided',
                requestId
            });
        }

        logger.info({ requestId, endpoint: '/api/answer' }, 'Answer request');

        const answerInput: any = { question, includeText };
        if (documents) answerInput.documents = documents;
        if (summarizedContext) answerInput.summarizedContext = summarizedContext;

        const result = await generateAnswer(answerInput, requestId);

        return res.json({
            answer: result.answer,
            citations: result.citations,
            requestId,
            timeMs: result.timeMs,
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Answer failed');

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

/**
 * POST /api/ask
 * Orchestrated full RAG pipeline (recommended endpoint)
 */
app.post('/api/ask', async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
        const { question, maxResults, includeText } = askSchema.parse(req.body);

        logger.info({ requestId, endpoint: '/api/ask', query: question.substring(0, 100) }, 'Ask request');

        const result = await executeRAGPipeline(
            question,
            { maxResults, includeText },
            requestId
        );

        return res.json({
            answer: result.answer,
            citations: result.citations,
            requestId,
            metadata: result.metadata,
        });

    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Ask failed');

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

// ========================================
// Legacy Routes (Backwards Compatibility)
// ========================================

// Setup legacy routes for backward compatibility
setupLegacyRoutes(app);

// ========================================
// Start Server
// ========================================

const port = config.PORT;
app.listen(port, () => {
    logger.info({ port, orchestratorType: orchestratorConfig.type }, 'Multi-Agent RAG Server started');
    console.log(`\n🚀 Multi-Agent RAG API running on port ${port}`);
    console.log(`🎭 Orchestrator: ${orchestratorConfig.type.toUpperCase()}`);
    console.log(`\n📊 Health: http://localhost:${port}/health`);
    console.log(`\n🤖 New Modular Endpoints:`);
    console.log(`   POST http://localhost:${port}/api/classify`);
    console.log(`   POST http://localhost:${port}/api/retrieve`);
    console.log(`   POST http://localhost:${port}/api/summarise`);
    console.log(`   POST http://localhost:${port}/api/answer`);
    console.log(`   POST http://localhost:${port}/api/ask (⭐ Recommended - Full Orchestration)`);
    console.log(`\n🔄 Legacy Endpoint:`);
    console.log(`   POST http://localhost:${port}/query`);
    console.log('');
});

export default app;

