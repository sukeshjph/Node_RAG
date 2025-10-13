/**
 * Shared Logger Utility
 * Provides consistent logging across all agents and services
 */

import { config } from '../config';
import pino from 'pino';

export const logger = pino(
    config.NODE_ENV === 'development' ? {
        level: 'debug',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        }
    } : {
        level: 'info'
    }
);

/**
 * Log agent execution with consistent format
 */
export function logAgentStart(agentName: string, requestId: string, input: any) {
    logger.info({
        requestId,
        agent: agentName,
        phase: 'start',
        input: typeof input === 'string' ? input.substring(0, 100) : input
    }, `🤖 ${agentName} - Starting`);
}

/**
 * Log agent completion with timing
 */
export function logAgentComplete(agentName: string, requestId: string, timeMs: number, output?: any) {
    logger.info({
        requestId,
        agent: agentName,
        phase: 'complete',
        timeMs,
        output
    }, `✅ ${agentName} - Completed in ${timeMs}ms`);
}

/**
 * Log agent error
 */
export function logAgentError(agentName: string, requestId: string, error: Error | string) {
    logger.error({
        requestId,
        agent: agentName,
        phase: 'error',
        error: error instanceof Error ? error.message : error
    }, `❌ ${agentName} - Failed`);
}

/**
 * Log orchestrator flow
 */
export function logOrchestrator(requestId: string, message: string, metadata?: any) {
    logger.info({
        requestId,
        component: 'orchestrator',
        ...metadata
    }, `🎭 Orchestrator - ${message}`);
}

