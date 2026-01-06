/**
 * Lightweight Tracing Utilities
 * Simple tracing implementation using the existing logger
 */

import { logger } from './logger';

interface TraceContext {
  traceId: string;
  spanId: string;
  startTime: number;
  name: string;
  metadata?: Record<string, unknown>;
}

// Active traces storage
const activeTraces = new Map<string, TraceContext>();

/**
 * Generate a unique trace ID
 */
function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Start a new trace
 */
export function startTrace(name: string, metadata?: Record<string, unknown>): string {
  const traceId = generateTraceId();
  const spanId = generateTraceId();

  const trace: TraceContext = {
    traceId,
    spanId,
    startTime: performance.now(),
    name,
    metadata,
  };

  activeTraces.set(traceId, trace);

  logger.debug('Trace started', {
    component: 'Tracing',
    traceId,
    spanId,
    name,
    metadata,
  });

  return traceId;
}

/**
 * Finish an active trace
 */
export function finishTrace(traceId: string, result?: 'success' | 'error', error?: Error): void {
  const trace = activeTraces.get(traceId);

  if (!trace) {
    logger.warn('Attempted to finish non-existent trace', {
      component: 'Tracing',
      traceId,
    });
    return;
  }

  const duration = performance.now() - trace.startTime;

  activeTraces.delete(traceId);

  const logData = {
    component: 'Tracing',
    traceId: trace.traceId,
    spanId: trace.spanId,
    name: trace.name,
    duration,
    result,
    metadata: trace.metadata,
  };

  if (result === 'error' && error) {
    logger.error('Trace completed with error', logData, error);
  } else {
    logger.info('Trace completed', logData);
  }
}

/**
 * Get the number of active traces
 */
export function getActiveTracesCount(): number {
  return activeTraces.size;
}

/**
 * Clear all active traces (useful for cleanup)
 */
export function clearActiveTraces(): void {
  const count = activeTraces.size;
  activeTraces.clear();

  if (count > 0) {
    logger.warn('Cleared active traces', {
      component: 'Tracing',
      clearedCount: count,
    });
  }
}

/**
 * Get information about all active traces
 */
export function getActiveTraces(): Array<{
  traceId: string;
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}> {
  const now = performance.now();

  return Array.from(activeTraces.values()).map(trace => ({
    traceId: trace.traceId,
    name: trace.name,
    duration: now - trace.startTime,
    metadata: trace.metadata,
  }));
}

/**
 * Trace a function execution
 */
export function traceFunction<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
  const traceId = startTrace(name, metadata);

  try {
    const result = fn();
    finishTrace(traceId, 'success');
    return result;
  } catch (error) {
    finishTrace(traceId, 'error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Trace an async function execution
 */
export async function traceAsyncFunction<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const traceId = startTrace(name, metadata);

  try {
    const result = await fn();
    finishTrace(traceId, 'success');
    return result;
  } catch (error) {
    finishTrace(traceId, 'error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
