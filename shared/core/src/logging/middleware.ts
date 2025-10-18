/**
 * Request logging middleware with context preservation
 */

import { Request, Response, NextFunction } from 'express';
// Use crypto.randomUUID if available, otherwise fallback to a simple UUID generator
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generator for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { Logger } from './logger';
import { LogContext, RequestLogData } from './types.js';
import { logger } from '../observability/logging';

export interface RequestLoggingOptions {
  logger?: Logger;
  generateRequestId?: () => string;
  generateTraceId?: () => string;
  extractUserId?: (req: Request) => string | undefined;
  skipPaths?: string[];
  skipHealthChecks?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
  sensitiveHeaders?: string[];
}

export interface RequestWithContext extends Request {
  requestId?: string;
  traceId?: string;
  userId?: string;
  startTime?: number;
}

/**
 * Create request logging middleware
 */
export function createRequestLoggingMiddleware(options: RequestLoggingOptions = {}) {
  const {
    logger = new Logger(),
    generateRequestId = () => generateUUID(),
    generateTraceId = () => generateUUID(),
    extractUserId = (req) => req.user?.id || req.headers['x-user-id'] as string,
    skipPaths = ['/favicon.ico'],
    skipHealthChecks = true,
    logRequestBody = false,
    logResponseBody = false,
    maxBodySize = 1024 * 10, // 10KB
    sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
  } = options;

  return function requestLoggingMiddleware(
    req: RequestWithContext,
    res: Response,
    next: NextFunction
  ): void {
    const startTime = performance.now();
    req.startTime = startTime;

    // Skip logging for certain paths
    if (shouldSkipLogging(req.path, skipPaths, skipHealthChecks)) {
      return next();
    }

    // Generate request identifiers
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    const traceId = req.headers['x-trace-id'] as string || generateTraceId();
    const userId = extractUserId(req);

    // Attach to request object
    req.requestId = requestId;
    req.traceId = traceId;
    req.userId = userId;

    // Set response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Trace-ID', traceId);

    // Create logging context
    const context: LogContext = {
      requestId,
      traceId,
      userId,
      operationName: `${req.method} ${req.path}`,
    };

    // Log incoming request
    logger.withContext(context, () => {
      const requestData: RequestLogData = {
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.headers['user-agent'],
        ip: getClientIP(req),
        userId,
      };

      // Add request body if enabled and not too large
      if (logRequestBody && req.body) {
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize <= maxBodySize) {
          (requestData as any).body = req.body;
        } else {
          (requestData as any).bodySize = bodySize;
          (requestData as any).bodyTruncated = true;
        }
      }

      // Add sanitized headers
      (requestData as any).headers = sanitizeHeaders(req.headers, sensitiveHeaders);

      logger.logRequest(requestData, `Incoming ${req.method} ${req.path}`);
    });

    // Capture original res.end to log response
    const originalEnd = res.end;
    let responseBody: any;

    // Intercept response body if logging is enabled
    if (logResponseBody) {
      const originalSend = res.send;
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };
    }

    // Override res.end to log completion
    res.end = function(chunk?: any, encoding?: any) {
      const duration = performance.now() - startTime;
      const contentLength = res.getHeader('content-length') as number;

      logger.withContext(context, () => {
        const responseData: RequestLogData = {
          method: req.method,
          url: req.originalUrl || req.url,
          userAgent: req.headers['user-agent'],
          ip: getClientIP(req),
          userId,
          duration,
          statusCode: res.statusCode,
          contentLength,
        };

        // Add response body if enabled and not too large
        if (logResponseBody && responseBody) {
          const bodySize = JSON.stringify(responseBody).length;
          if (bodySize <= maxBodySize) {
            (responseData as any).responseBody = responseBody;
          } else {
            (responseData as any).responseBodySize = bodySize;
            (responseData as any).responseBodyTruncated = true;
          }
        }

        // Add response headers (sanitized)
        const responseHeaders: Record<string, any> = {};
        res.getHeaderNames().forEach(name => {
          if (!sensitiveHeaders.includes(name.toLowerCase())) {
            responseHeaders[name] = res.getHeader(name);
          }
        });
        (responseData as any).responseHeaders = responseHeaders;

        // Log completion with appropriate level based on status code
        const logLevel = getLogLevelForStatus(res.statusCode);
        const message = `Completed ${req.method} ${req.path} - ${res.statusCode} (${duration.toFixed(2)}ms)`;

        if (logLevel === 'error') {
          logger.error({ request: responseData }, message);
        } else if (logLevel === 'warn') {
          logger.warn({ request: responseData }, message);
        } else {
          logger.logRequest(responseData, message);
        }

        // Log performance metrics
        logger.logPerformance(`${req.method} ${req.path}`, duration, {
          statusCode: res.statusCode,
          contentLength,
          userId,
        });
      });

      return originalEnd.call(this, chunk, encoding);
    };

    // Handle errors in the request pipeline
    const originalNext = next;
    next = function(error?: any) {
      if (error) {
        const duration = performance.now() - startTime;
        
        logger.withContext(context, () => {
          logger.error(
            {
              error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
                statusCode: error.statusCode,
              },
              request: {
                method: req.method,
                url: req.originalUrl || req.url,
                userAgent: req.headers['user-agent'],
                ip: getClientIP(req),
                userId,
                duration,
              },
            },
            `Request error in ${req.method} ${req.path}: ${error.message}`
          );
        });
      }
      
      return originalNext(error);
    };

    // Execute within async context
    logger.withContextAsync(context, async () => {
      next();
    }).catch(next);
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(
  headers: Record<string, any>,
  sensitiveHeaders: string[]
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Determine if request should be skipped from logging
 */
function shouldSkipLogging(
  path: string,
  skipPaths: string[],
  skipHealthChecks: boolean
): boolean {
  // Skip explicit paths
  if (skipPaths.includes(path)) {
    return true;
  }

  // Skip health check endpoints
  if (skipHealthChecks) {
    const healthPaths = ['/health', '/healthz', '/ping', '/status', '/ready', '/live'];
    if (healthPaths.some(healthPath => path.startsWith(healthPath))) {
      return true;
    }
  }

  return false;
}

/**
 * Get appropriate log level based on HTTP status code
 */
function getLogLevelForStatus(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) {
    return 'error';
  } else if (statusCode >= 400) {
    return 'warn';
  } else {
    return 'info';
  }
}

/**
 * Express middleware to extract and preserve request context
 */
export function contextMiddleware(logger: Logger) {
  return function(req: RequestWithContext, res: Response, next: NextFunction) {
    const context: LogContext = {
      requestId: req.requestId,
      traceId: req.traceId,
      userId: req.userId,
      operationName: `${req.method} ${req.path}`,
    };

    logger.withContextAsync(context, async () => {
      next();
    }).catch(next);
  };
}

/**
 * Middleware to add request timing
 */
export function timingMiddleware() {
  return function(req: RequestWithContext, res: Response, next: NextFunction) {
    req.startTime = performance.now();
    
    // Add timing header to response
    res.on('finish', () => {
      if (req.startTime) {
        const duration = performance.now() - req.startTime;
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
      }
    });

    next();
  };
}

/**
 * Create a comprehensive request logging pipeline
 */
export function createRequestLoggingPipeline(options: RequestLoggingOptions = []) {
  const logger = options.logger || new Logger();
  
  return [
    timingMiddleware(),
    createRequestLoggingMiddleware(options),
    contextMiddleware(logger),
  ];
}






