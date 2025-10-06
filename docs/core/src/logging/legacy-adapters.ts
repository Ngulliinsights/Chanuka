/**
 * Legacy Logging Adapters
 * 
 * Adapters to integrate existing logging implementations with the core logging system
 */

import { Logger as CoreLogger } from './logger';
import { LogContext } from './types';

/**
 * Adapter for the existing simple logger from src/shared/utils/logger.ts
 */
export class SimpleLegacyLoggerAdapter {
  private coreLogger: CoreLogger;

  constructor(coreLogger: CoreLogger) {
    this.coreLogger = coreLogger;
  }

  info(message: string, ...args: unknown[]): void {
    const context: LogContext = args.length > 0 ? { metadata: args } : {};
    this.coreLogger.info(message, context);
  }

  warn(message: string, ...args: unknown[]): void {
    const context: LogContext = args.length > 0 ? { metadata: args } : {};
    this.coreLogger.warn(message, context);
  }

  error(message: string, ...args: unknown[]): void {
    const context: LogContext = args.length > 0 ? { metadata: args } : {};
    this.coreLogger.error(message, context);
  }
}

/**
 * Adapter for the infrastructure monitoring logger
 */
export class InfrastructureLoggerAdapter {
  private coreLogger: CoreLogger;

  constructor(coreLogger: CoreLogger) {
    this.coreLogger = coreLogger;
  }

  error(message: string, context?: string, data?: any, error?: Error): void {
    const logContext: LogContext = {
      component: context,
      metadata: data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    this.coreLogger.error(message, logContext);
  }

  warn(message: string, context?: string, data?: any): void {
    const logContext: LogContext = {
      component: context,
      metadata: data
    };
    this.coreLogger.warn(message, logContext);
  }

  info(message: string, context?: string, data?: any): void {
    const logContext: LogContext = {
      component: context,
      metadata: data
    };
    this.coreLogger.info(message, logContext);
  }

  debug(message: string, context?: string, data?: any): void {
    const logContext: LogContext = {
      component: context,
      metadata: data
    };
    this.coreLogger.debug(message, logContext);
  }

  apiRequest(method: string, path: string, statusCode: number, duration: number, userId?: number): void {
    this.coreLogger.info(`${method} ${path} ${statusCode} in ${duration}ms`, {
      component: 'API',
      metadata: { userId, method, path, statusCode, duration }
    });
  }

  databaseOperation(operation: string, table: string, duration: number, recordCount?: number): void {
    this.coreLogger.debug(`${operation} on ${table} completed in ${duration}ms`, {
      component: 'DATABASE',
      metadata: { operation, table, duration, recordCount }
    });
  }

  aiOperation(operation: string, duration: number, tokens?: number): void {
    this.coreLogger.info(`AI ${operation} completed in ${duration}ms`, {
      component: 'AI',
      metadata: { operation, duration, tokens }
    });
  }

  securityEvent(event: string, userId?: number, ip?: string): void {
    this.coreLogger.warn(`Security event: ${event}`, {
      component: 'SECURITY',
      metadata: { event, userId, ip }
    });
  }
}

/**
 * Adapter for the structured logger
 */
export class StructuredLoggerAdapter {
  private coreLogger: CoreLogger;
  private performanceMarks: Map<string, number> = new Map();

  constructor(coreLogger: CoreLogger) {
    this.coreLogger = coreLogger;
  }

  debug(message: string, context: any = {}): void {
    this.coreLogger.debug(message, this.convertContext(context));
  }

  info(message: string, context: any = {}): void {
    this.coreLogger.info(message, this.convertContext(context));
  }

  warn(message: string, context: any = {}): void {
    this.coreLogger.warn(message, this.convertContext(context));
  }

  error(message: string, context: any = {}): void {
    this.coreLogger.error(message, this.convertContext(context));
  }

  startTimer(operation: string): void {
    this.performanceMarks.set(operation, Date.now());
  }

  endTimer(operation: string, context: any = {}): number {
    const startTime = this.performanceMarks.get(operation);
    if (!startTime) {
      this.warn(`Timer not found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(operation);

    this.info(`Operation completed: ${operation}`, {
      ...this.convertContext(context),
      performance: {
        duration,
        operation
      }
    });

    return duration;
  }

  logRequest(req: any, context: any = {}): void {
    this.info('HTTP Request', {
      ...this.convertContext(context),
      request: {
        method: req.method,
        url: req.url,
        userAgent: req.get?.('User-Agent'),
        ip: req.ip
      }
    });
  }

  logResponse(req: any, res: any, duration: number, context: any = {}): void {
    this.info('HTTP Response', {
      ...this.convertContext(context),
      request: {
        method: req.method,
        url: req.url
      },
      response: {
        statusCode: res.statusCode,
        duration
      }
    });
  }

  private convertContext(context: any): LogContext {
    if (!context || typeof context !== 'object') {
      return {};
    }

    return {
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      operation: context.operation,
      component: context.component,
      metadata: context.metadata || context
    };
  }
}

/**
 * Factory function to create appropriate adapter based on legacy logger type
 */
export function createLegacyLoggerAdapter(legacyLogger: any, coreLogger: CoreLogger): any {
  // Detect logger type and return appropriate adapter
  if (legacyLogger.startTimer && legacyLogger.endTimer) {
    return new StructuredLoggerAdapter(coreLogger);
  } else if (legacyLogger.apiRequest && legacyLogger.databaseOperation) {
    return new InfrastructureLoggerAdapter(coreLogger);
  } else {
    return new SimpleLegacyLoggerAdapter(coreLogger);
  }
}