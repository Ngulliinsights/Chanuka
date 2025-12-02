/**
 * Observability Middleware for Express.js
 *
 * This module provides comprehensive Express middleware for automatic context injection,
 * request logging, performance monitoring, and error tracking with full correlation ID support.
 * All middleware integrates seamlessly with the unified observability stack.
 */

import { Request, Response, NextFunction } from 'express';
// import { Result, ok, err } from '../../primitives/types/result'; // Unused import
import { BaseError } from './error-management';
import {
  Logger,
  MetricsCollector,
  CorrelationManager,
  CorrelationContext,
  LogContext
} from './interfaces';

// ==================== Middleware Configuration ====================

export interface MiddlewareConfig {
  /** Enable correlation ID injection */
  enableCorrelation?: boolean;
  /** Enable request logging */
  enableLogging?: boolean;
  /** Enable performance monitoring */
  enableMetrics?: boolean;
  /** Enable error tracking */
  enableErrorTracking?: boolean;
  /** Custom request ID generator */
  requestIdGenerator?: () => string;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Log level for requests */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn';
  /** Metrics prefix */
  metricsPrefix?: string;
  /** Skip logging for these paths */
  skipPaths?: string[];
  /** Skip metrics for these paths */
  skipMetricsPaths?: string[];
}

export interface MiddlewareDependencies {
  logger?: Logger;
  metrics?: MetricsCollector;
  correlationManager: CorrelationManager;
}

// ==================== Middleware Errors ====================

export class MiddlewareError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, {
      statusCode: 500,
      code: 'MIDDLEWARE_ERROR',
      cause: cause || undefined,
      isOperational: false,
      domain: 'SYSTEM' as any
    });
  }
}

export class CorrelationMiddlewareError extends MiddlewareError {
  constructor(message: string, cause?: Error) {
    super(`Correlation middleware error: ${message}`, cause);
  }
}

export class LoggingMiddlewareError extends MiddlewareError {
  constructor(message: string, cause?: Error) {
    super(`Logging middleware error: ${message}`, cause);
  }
}

export class MetricsMiddlewareError extends MiddlewareError {
  constructor(message: string, cause?: Error) {
    super(`Metrics middleware error: ${message}`, cause);
  }
}

// ==================== Correlation ID Injection Middleware ====================

/**
 * Express middleware for automatic correlation ID injection
 * Extracts correlation IDs from headers or generates new ones
 */
export function createCorrelationMiddleware(
  correlationManager: CorrelationManager,
  config: Pick<MiddlewareConfig, 'enableCorrelation' | 'requestIdGenerator'> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { enableCorrelation = true, requestIdGenerator } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enableCorrelation) {
      return next();
    }

    try {
      // Extract correlation context from request headers
      const context = correlationManager.startRequestFromHeaders?.(req.headers) ?? correlationManager.startRequest();

      // Generate custom request ID if provided
      if (requestIdGenerator) {
        context.requestId = requestIdGenerator();
      }

      // Inject correlation IDs into response headers
      if (context.correlationId) {
        res.setHeader('x-correlation-id', context.correlationId);
      }
      if (context.traceId) {
        res.setHeader('x-trace-id', context.traceId);
      }
      if (context.requestId) {
        res.setHeader('x-request-id', context.requestId);
      }
      if (context.user_id) {
        res.setHeader('x-user-id', context.user_id);
      }
      if (context.session_id) {
        res.setHeader('x-session-id', context.session_id);
      }

      // Execute request with correlation context
      correlationManager.withContext(context, () => {
        // Attach correlation context to request for easy access
        (req as any).correlationContext = context;
        next();
      });
    } catch (error) {
      // If correlation extraction fails, continue with generated IDs
      const context = correlationManager.startRequest();
      correlationManager.withContext(context, () => {
        (req as any).correlationContext = context;
        next();
      });
    }
  };
}

// ==================== Request Logging Middleware ====================

/**
 * Express middleware for request logging with correlation context
 */
export function createRequestLoggingMiddleware(
  dependencies: MiddlewareDependencies,
  config: Pick<MiddlewareConfig, 'enableLogging' | 'logLevel' | 'skipPaths'> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { logger } = dependencies;
  const { enableLogging = true, logLevel = 'info', skipPaths = [] } = config;

  if (!enableLogging || !logger) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const correlationContext = (req as any).correlationContext as CorrelationContext | undefined;

    // Skip logging for configured paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Log incoming request
    const requestContext: LogContext = { 
      component: 'http',
      operation: 'request',
      correlationId: correlationContext?.correlationId || '',
      traceId: correlationContext?.traceId || '',
      requestId: correlationContext?.requestId || '',
      user_id: correlationContext?.user_id || '',
      session_id: correlationContext?.session_id || '',
      statusCode: 0,
      duration: 0,
      tags: ['http', 'request']
     };

    logger.info(`Incoming ${req.method} ${req.path}`, requestContext, {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: sanitizeHeaders(req.headers),
      user_agent: req.get('User-Agent'),
      ip: req.ip
    });

    // Override res.end to log response
    const originalEnd = res.end;
    const _originalWrite = res.write;
    let responseFinished = false;

    res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
      if (responseFinished) return this;
      responseFinished = true;

      const duration = Date.now() - startTime;

      const responseContext: LogContext = {
        ...requestContext,
        operation: 'response',
        statusCode: res.statusCode,
        duration,
        tags: ['http', 'response']
      };

      const level = res.statusCode >= 400 ? 'warn' : logLevel;
      const message = `Completed ${req.method} ${req.path} with status ${res.statusCode}`;

      logger[level](message, responseContext, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        responseSize: res.get('Content-Length'),
        content_type: res.get('Content-Type')
      });

      // Call original end method
      if (typeof encoding === 'function') {
        return originalEnd.call(this, chunk, 'utf8', encoding);
      } else {
        return originalEnd.call(this, chunk, encoding || 'utf8', callback);
      }
    };

    next();
  };
}

// ==================== Performance Monitoring Middleware ====================

/**
 * Express middleware for request performance monitoring and metrics
 */
export function createPerformanceMonitoringMiddleware(
  dependencies: MiddlewareDependencies,
  config: Pick<MiddlewareConfig, 'enableMetrics' | 'metricsPrefix' | 'skipMetricsPaths'> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { metrics } = dependencies;
  const { enableMetrics = true, metricsPrefix = 'http', skipMetricsPaths = [] } = config;

  if (!enableMetrics || !metrics) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();
    const correlationContext = (req as any).correlationContext as CorrelationContext | undefined;

    // Skip metrics for configured paths
    if (skipMetricsPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Increment request counter
    metrics.counter(`${metricsPrefix}_requests_total`, 1, {
      method: req.method,
      path: req.path,
      correlation_id: correlationContext?.correlationId || 'unknown'
    });

    // Set active requests gauge
    metrics.incrementGauge(`${metricsPrefix}_active_requests`, 1, {
      method: req.method,
      path: req.path
    });

    // Override res.end to record metrics
    const originalEnd = res.end;
    let metricsRecorded = false;

    res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
      if (!metricsRecorded) {
        metricsRecorded = true;
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

        // Decrement active requests
        metrics.decrementGauge(`${metricsPrefix}_active_requests`, 1, {
          method: req.method,
          path: req.path
        });

        // Record response metrics
        metrics.counter(`${metricsPrefix}_responses_total`, 1, {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString(),
          status_class: getStatusClass(res.statusCode)
        });

        // Record request duration histogram
        metrics.histogram(`${metricsPrefix}_request_duration_ms`, duration, {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString(),
          status_class: getStatusClass(res.statusCode)
        });
      }

      // Call original end method
      if (typeof encoding === 'function') {
        return originalEnd.call(this, chunk, 'utf8', encoding);
      } else {
        return originalEnd.call(this, chunk, encoding || 'utf8', callback);
      }
    };

    next();
  };
}

// ==================== Error Tracking Middleware ====================

/**
 * Express middleware for error tracking with correlation IDs
 */
export function createErrorTrackingMiddleware(
  dependencies: MiddlewareDependencies,
  config: Pick<MiddlewareConfig, 'enableErrorTracking'> = {}
): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  const { logger, correlationManager } = dependencies;
  const { enableErrorTracking = true } = config;

  if (!enableErrorTracking || !logger) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
  }

  return (err: Error, req: Request, _res: Response, next: NextFunction): void => { const correlationContext = (req as any).correlationContext as CorrelationContext | undefined;

    const errorContext: LogContext = {
      component: 'http',
      operation: 'error',
      correlationId: correlationContext?.correlationId || '',
      traceId: correlationContext?.traceId || '',
      requestId: correlationContext?.requestId || '',
      user_id: correlationContext?.user_id || '',
      session_id: correlationContext?.session_id || '',
      statusCode: 500,
      duration: 0,
      errorCode: err instanceof BaseError ? err.code : 'UNKNOWN_ERROR',
      tags: ['http', 'error']
     };

    // Log the error with full context
    logger.error(`Request error: ${err.message}`, errorContext, {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: sanitizeHeaders(req.headers),
      stack: err.stack,
      error: err instanceof BaseError ? err.toJSON() : {
        name: err.name,
        message: err.message
      }
    });

    // If we have a correlation manager, set error metadata
    if (correlationManager && correlationContext) {
      correlationManager.setMetadata('lastError', {
        message: err.message,
        code: err instanceof BaseError ? err.code : 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    next(err);
  };
}

// ==================== Request Timeout Middleware ====================

/**
 * Express middleware for request timeout handling
 */
export function createRequestTimeoutMiddleware(
  config: Pick<MiddlewareConfig, 'requestTimeout'> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { requestTimeout = 30000 } = config; // 30 seconds default

  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `Request timed out after ${requestTimeout}ms`
        });
      }
    }, requestTimeout);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

// ==================== Combined Middleware Factory ====================

/**
 * Factory function to create all observability middleware with unified configuration
 */
export function createObservabilityMiddleware(
  dependencies: MiddlewareDependencies,
  config: MiddlewareConfig = {}
): {
  correlation: (req: Request, res: Response, next: NextFunction) => void;
  logging: (req: Request, res: Response, next: NextFunction) => void;
  performance: (req: Request, res: Response, next: NextFunction) => void;
  errorTracking: (err: Error, req: Request, res: Response, next: NextFunction) => void;
  timeout: (req: Request, res: Response, next: NextFunction) => void;
  all: ((req: Request, res: Response, next: NextFunction) => void)[];
} {
  const correlation = createCorrelationMiddleware(dependencies.correlationManager, config);
  const logging = createRequestLoggingMiddleware(dependencies, config);
  const performance = createPerformanceMonitoringMiddleware(dependencies, config);
  const errorTracking = createErrorTrackingMiddleware(dependencies, config);
  const timeout = createRequestTimeoutMiddleware(config);

  return {
    correlation,
    logging,
    performance,
    errorTracking,
    timeout,
    all: [timeout, correlation, logging, performance]
  };
}

// ==================== Utility Functions ====================

/**
 * Sanitize headers for logging (remove sensitive information)
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header.toLowerCase()]) {
      sanitized[header.toLowerCase()] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Get HTTP status class (2xx, 3xx, 4xx, 5xx)
 */
function getStatusClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 300 && statusCode < 400) return '3xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500 && statusCode < 600) return '5xx';
  return 'unknown';
}



// ==================== Default Exports ====================

export default {
  createCorrelationMiddleware,
  createRequestLoggingMiddleware,
  createPerformanceMonitoringMiddleware,
  createErrorTrackingMiddleware,
  createRequestTimeoutMiddleware,
  createObservabilityMiddleware
};



