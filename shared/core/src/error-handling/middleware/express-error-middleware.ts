import { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorSeverity } from '../../primitives/errors';
import { ErrorHandlerChain } from '../handlers/error-handler-chain';
import { ValidationError, AuthenticationError, InternalServerError } from '../errors/specialized';

export interface ExpressErrorMiddlewareOptions {
  readonly errorHandlerChain?: ErrorHandlerChain;
  readonly includeStackTrace?: boolean;
  readonly enableSentry?: boolean;
  readonly shouldReportToSentry?: (error: Error) => boolean;
  readonly formatError?: (error: BaseError) => Record<string, any>;
  readonly onError?: (error: BaseError, req: Request, res: Response) => void;
}

/**
 * Express middleware for unified error handling with error-management integration
 */
export function createExpressErrorMiddleware(options: ExpressErrorMiddlewareOptions = {}) {
  const {
    errorHandlerChain,
    includeStackTrace = process.env.NODE_ENV === 'development',
    enableSentry = process.env.NODE_ENV === 'production',
    shouldReportToSentry = (error: Error) => {
      if (error instanceof BaseError) {
        return !error.isOperational || error.metadata.severity === ErrorSeverity.CRITICAL;
      }
      return true;
    },
    formatError,
    onError,
  } = options;

  return async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // If headers are already sent, we can't modify the response
    if (res.headersSent) {
      return next(error);
    }

    // Process error through handler chain if provided
    let processedError: BaseError;

    if (error instanceof BaseError) {
      if (errorHandlerChain) {
        processedError = await errorHandlerChain.process(error);
      } else {
        processedError = error;
      }
    } else {
      // Normalize non-BaseError errors
      processedError = normalizeError(error);
    }

    // Extract request context for logging and debugging
    const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 'unknown';
    const userId = (req as any).user?.id || (req as any).userId || 'anonymous';

    // Create comprehensive context for debugging
    const errorContext = {
      error: {
        id: processedError.errorId,
        message: processedError.message,
        code: processedError.code,
        domain: processedError.metadata.domain,
        severity: processedError.metadata.severity,
        stack: processedError.stack,
        cause: processedError.cause instanceof Error ? processedError.cause.message : undefined,
      },
      request: {
        id: requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer,
      },
      metadata: processedError.metadata,
    };

    // Log with appropriate severity level
    logError(processedError, errorContext);

    // Send error data to monitoring service (Sentry)
    if (enableSentry && shouldReportToSentry(processedError)) {
      await reportToSentry(processedError, errorContext);
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(processedError, req, res);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Create the response object that will be sent to the client
    let errorResponse = createErrorResponse(processedError, includeStackTrace);

    // Allow custom formatting to modify the response structure
    if (formatError) {
      try {
        const customFormatting = formatError(processedError);
        errorResponse = {
          ...errorResponse,
          ...customFormatting,
        };
      } catch (formatError) {
        console.error('Error in custom error formatter:', formatError);
      }
    }

    // Send the final error response to the client
    res.status(processedError.statusCode).json(errorResponse);
  };
}

/**
 * Normalize different error types into BaseError instances
 */
function normalizeError(error: Error): BaseError {
  // If it's already our custom error type, use it as-is
  if (error instanceof BaseError) {
    return error;
  }

  // Handle ValidationError from express-validator
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message, {
      details: (error as any).errors,
    });
  }

  // Handle JWT authentication errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  // Handle all other unknown errors as internal server errors
  return new InternalServerError(error.message || 'Internal Server Error', {
    cause: error,
  });
}

/**
 * Create a unified error response object
 */
function createErrorResponse(error: BaseError, includeStack: boolean) {
  const response: any = {
    error: {
      id: error.errorId,
      code: error.code,
      message: error.getUserMessage(),
      statusCode: error.statusCode,
      domain: error.metadata.domain,
      severity: error.metadata.severity,
      correlationId: error.metadata.correlationId,
      timestamp: error.metadata.timestamp.toISOString(),
      retryable: error.metadata.retryable,
      recoveryStrategies: error.metadata.recoveryStrategies
        .filter(s => !s.automatic)
        .map(({ name, description }) => ({ name, description })),
    },
  };

  // Add optional properties
  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Log error with appropriate severity
 */
function logError(error: BaseError, context: any) {
  const logData = {
    msg: 'Error encountered',
    ...context
  };

  switch (error.metadata.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      console.error(logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn(logData);
      break;
    default:
      console.info(logData);
  }
}

/**
 * Report error to Sentry
 */
async function reportToSentry(error: BaseError, context: any) {
  try {
    // Dynamic import to avoid issues if Sentry is not installed
    let Sentry: any;
    try {
      Sentry = await import('@sentry/node' as any);
    } catch {
      console.warn('Sentry not available, skipping error reporting');
      return;
    }

    Sentry.withScope((scope: any) => {
      scope.setUser({ id: context.request.userId });
      scope.setTag('requestId', context.request.id);
      scope.setTag('errorId', error.errorId);
      scope.setTag('domain', error.metadata.domain);
      scope.setTag('severity', error.metadata.severity);
      scope.setContext('error', context);
      Sentry.captureException(error);
    });
  } catch (sentryError) {
    console.error('Failed to report to Sentry:', sentryError);
  }
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  // Remove common sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}




































