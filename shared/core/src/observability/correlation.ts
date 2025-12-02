/**
 * Correlation ID Management System
 *
 * This module provides comprehensive correlation ID management using AsyncLocalStorage
 * for thread-safe context propagation across all telemetry types (logs, metrics, traces).
 * It includes HTTP header extraction/propagation, middleware integration, and helper
 * functions for correlation context management.
 */

import { AsyncLocalStorage } from 'async_hooks';
// import { Result, ok, err } from '../../primitives/types/result'; // Unused import
import { BaseError } from './error-management';
import { CorrelationContext, CorrelationManager } from './interfaces';

// ==================== Correlation Constants ====================

export const CORRELATION_HEADER = 'x-correlation-id';
export const TRACE_HEADER = 'x-trace-id';
export const REQUEST_HEADER = 'x-request-id';
export const USER_HEADER = 'x-user-id';
export const SESSION_HEADER = 'x-session-id';

// ==================== Correlation Errors ====================

export class CorrelationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { statusCode: 500, code: 'CORRELATION_ERROR', cause: cause as any, isOperational: false });
  }
}

export class CorrelationExtractionError extends CorrelationError {
  constructor(header: string, cause?: Error) {
    super(`Failed to extract correlation ID from header: ${header}`, cause);
  }
}

// ==================== HTTP Header Utilities ====================

/**
 * Extract correlation context from HTTP headers
 */
export function extractCorrelationFromHeaders(headers: Record<string, string | string[] | undefined>): Partial<CorrelationContext> {
  const context: Partial<CorrelationContext> = {};

  try {
    const correlationId = getHeaderValue(headers, CORRELATION_HEADER);
    if (correlationId) {
      context.correlationId = correlationId;
    }

    const traceId = getHeaderValue(headers, TRACE_HEADER);
    if (traceId) {
      context.traceId = traceId;
    }

    const requestId = getHeaderValue(headers, REQUEST_HEADER);
    if (requestId) {
      context.requestId = requestId;
    }

    const user_id = getHeaderValue(headers, USER_HEADER);
    if (user_id) { context.user_id = user_id;
     }

    const session_id = getHeaderValue(headers, SESSION_HEADER);
    if (session_id) {
      context.session_id = session_id;
    }

    return context;
  } catch (error) {
    throw new CorrelationExtractionError('headers', error as Error);
  }
}

/**
 * Inject correlation context into HTTP headers
 */
export function injectCorrelationIntoHeaders(
  headers: Record<string, string | string[] | undefined>,
  context: CorrelationContext
): Record<string, string | string[] | undefined> {
  const updatedHeaders = { ...headers };

  if (context.correlationId) {
    updatedHeaders[CORRELATION_HEADER] = context.correlationId;
  }

  if (context.traceId) {
    updatedHeaders[TRACE_HEADER] = context.traceId;
  }

  if (context.requestId) {
    updatedHeaders[REQUEST_HEADER] = context.requestId;
  }

  if (context.user_id) {
    updatedHeaders[USER_HEADER] = context.user_id;
  }

  if (context.session_id) {
    updatedHeaders[SESSION_HEADER] = context.session_id;
  }

  return updatedHeaders;
}

/**
 * Get header value, handling both string and array values
 */
function getHeaderValue(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = headers[key.toLowerCase()] || headers[key];
  if (Array.isArray(value)) {
    return value[0]; // Take first value if array
  }
  return value as string;
}

// ==================== Correlation Manager Implementation ====================

/**
 * Correlation manager using AsyncLocalStorage for thread-safe context propagation
 */
export class AsyncCorrelationManager implements CorrelationManager {
  private readonly asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();
  private readonly generateIds: boolean;

  constructor(options: { generateIds?: boolean } = {}) {
    this.generateIds = options.generateIds ?? true;
  }

  /**
   * Start a new request context with optional header extraction
   */
  startRequest(context: Partial<CorrelationContext> = {}): CorrelationContext { const correlationId = context.correlationId ?? (this.generateIds ? this.generateCorrelationId() : 'unknown');
    const traceId = context.traceId ?? (this.generateIds ? this.generateTraceId() : undefined);
    const requestId = context.requestId ?? (this.generateIds ? this.generateRequestId() : undefined);

    const fullContext: CorrelationContext = {
      correlationId,
      traceId,
      requestId,
      spanId: context.spanId,
      user_id: context.user_id,
      session_id: context.session_id,
      metadata: { ...context.metadata  }
    };

    return fullContext;
  }

  /**
   * Start a new request context from HTTP headers
   */
  startRequestFromHeaders(headers: Record<string, string | string[] | undefined>): CorrelationContext {
    const extractedContext = extractCorrelationFromHeaders(headers);
    return this.startRequest(extractedContext);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId;
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.traceId;
  }

  /**
   * Get current request ID
   */
  getRequestId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.requestId;
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Execute function with correlation context
   */
  withContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Execute async function with correlation context
   */
  async withContextAsync<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Set context metadata
   */
  setMetadata(key: string, value: unknown): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  /**
   * Get context metadata
   */
  getMetadata(key: string): unknown {
    const context = this.asyncLocalStorage.getStore();
    return context?.metadata?.[key];
  }

  /**
   * Update current context with new values
   */
  updateContext(updates: Partial<CorrelationContext>): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      Object.assign(context, updates);
    }
  }

  /**
   * Create child context with additional metadata
   */
  createChildContext(additionalContext: Partial<CorrelationContext> = {}): CorrelationContext {
    const parentContext = this.getContext();
    if (!parentContext) {
      return this.startRequest(additionalContext);
    }

    return {
      ...parentContext,
      ...additionalContext,
      metadata: { ...parentContext.metadata, ...additionalContext.metadata }
    };
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== Middleware Implementation ====================

/**
 * Express.js middleware for automatic correlation ID injection
 */
export function createCorrelationMiddleware(correlationManager: CorrelationManager) {
  return (req: any, res: any, next: () => void) => {
    try {
      // Extract correlation context from request headers
      const context = correlationManager.startRequestFromHeaders?.(req.headers) ?? correlationManager.startRequest();

      // Inject correlation IDs into response headers
      const responseHeaders = injectCorrelationIntoHeaders({}, context);
      Object.entries(responseHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          res.setHeader(key, value);
        }
      });

      // Execute request with correlation context
      correlationManager.withContext(context, () => {
        // Add correlation context to request object for easy access
        req.correlationContext = context;
        next();
      });
    } catch (error) {
      // If correlation extraction fails, continue with generated IDs
      const context = correlationManager.startRequest();
      correlationManager.withContext(context, () => {
        req.correlationContext = context;
        next();
      });
    }
  };
}

/**
 * Generic middleware interface for different frameworks
 */
export interface CorrelationMiddleware {
  /**
   * Apply correlation middleware to a request handler
   */
  apply(handler: Function): Function;
}

/**
 * Create framework-agnostic correlation middleware
 */
export function createFrameworkAgnosticMiddleware(correlationManager: CorrelationManager): CorrelationMiddleware {
  return {
    apply: (handler: Function) => {
      return (...args: any[]) => {
        // Assume first arg is request-like object with headers
        const req = args[0];
        if (req && typeof req === 'object' && req.headers) {
          const context = correlationManager.startRequestFromHeaders?.(req.headers) ?? correlationManager.startRequest();
          return correlationManager.withContext(context, () => {
            req.correlationContext = context;
            return handler(...args);
          });
        }

        // Fallback if no request object
        const context = correlationManager.startRequest();
        return correlationManager.withContext(context, () => {
          return handler(...args);
        });
      };
    }
  };
}

// ==================== Helper Functions ====================

/**
 * Get current correlation context or create a new one
 */
export function getOrCreateCorrelationContext(manager: CorrelationManager): CorrelationContext {
  const existing = manager.getContext();
  if (existing) {
    return existing;
  }
  return manager.startRequest();
}

/**
 * Execute function with correlation context, creating one if needed
 */
export function withCorrelationContext<T>(
  manager: CorrelationManager,
  context: Partial<CorrelationContext> | undefined,
  fn: () => T
): T {
  const correlationContext = context ? manager.startRequest(context) : getOrCreateCorrelationContext(manager);
  return manager.withContext(correlationContext, fn);
}

/**
 * Execute async function with correlation context, creating one if needed
 */
export async function withCorrelationContextAsync<T>(
  manager: CorrelationManager,
  context: Partial<CorrelationContext> | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const correlationContext = context ? manager.startRequest(context) : getOrCreateCorrelationContext(manager);
  return manager.withContextAsync(correlationContext, fn);
}

/**
 * Create correlation context from string ID
 */
export function createCorrelationContextFromId(correlationId: string, additionalContext: Partial<CorrelationContext> = {}): CorrelationContext {
  return {
    correlationId,
    ...additionalContext
  };
}

/**
 * Validate correlation ID format
 */
export function isValidCorrelationId(id: string): boolean {
  // Basic validation - should be non-empty and contain expected prefix
  return Boolean(id && typeof id === 'string' && id.length > 0 && id.includes('_'));
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a new trace ID
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== Factory Functions ====================

/**
 * Create a new correlation manager instance
 */
export function createCorrelationManager(options: { generateIds?: boolean } = {}): AsyncCorrelationManager {
  return new AsyncCorrelationManager(options);
}

/**
 * Create default correlation manager with ID generation enabled
 */
export function createDefaultCorrelationManager(): AsyncCorrelationManager {
  return new AsyncCorrelationManager({ generateIds: true });
}

// ==================== Default Export ====================

export default AsyncCorrelationManager;



