/**
 * Security Error Handling Middleware
 * Consistent error handling across all security operations
 */

import { logger } from '@client/lib/utils/logger';

import { SecurityErrorHandler, SecurityErrorFactory, SecurityOperationError } from './error-handler';
import {
  SecurityError,
  SecurityErrorResult,
  SecurityErrorType,
  ErrorHandlingConfig,
  SecurityEvent
} from './security-interface';

export class SecurityErrorMiddleware {
  private errorHandler: SecurityErrorHandler;
  private errorLogger: SecurityLogger;

  constructor(config: ErrorHandlingConfig) {
    this.errorHandler = new SecurityErrorHandler(config);
    this.errorLogger = new SecurityLogger(config.logLevel);
  }

  async initialize(config?: Partial<ErrorHandlingConfig>): Promise<void> {
    if (config) {
      // Re-initialize handler with new config if needed
      const currentStats = this.errorHandler.getErrorStatistics();
      const mergedConfig: ErrorHandlingConfig = { 
        ...currentStats, 
        ...config,
        mode: config.mode || 'strict',
        logLevel: config.logLevel || 'error'
      };
      this.errorHandler = new SecurityErrorHandler(mergedConfig);
      this.errorLogger = new SecurityLogger(config.logLevel || 'error');
    }
  }

  async handleSecurityOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const securityError = this.createSecurityError(error, operationName, component);
      const errorResult = this.errorHandler.handleSecurityError(securityError);

      // Log the error
      this.errorLogger.error(`Security operation failed: ${operationName}`, {
        component,
        error: errorResult,
      });

      // Throw or return based on configuration
      if (this.shouldThrowError(securityError)) {
        throw new SecurityOperationError(securityError, errorResult);
      } else {
        // Return safe default or empty result
        return this.getSafeDefault(operationName) as T;
      }
    }
  }

  private createSecurityError(
    error: unknown,
    operationName: string,
    component: string
  ): SecurityError {
    // SecurityError is a type (not a runtime class). Detect by shape instead of instanceof.
    if (error && typeof error === 'object' && 'type' in error && 'severity' in error) {
      return error as SecurityError;
    }

    const message = error instanceof Error ? error.message : String(error);
    const type = this.inferErrorType(error, operationName);

    return SecurityErrorFactory.createError(
      type,
      message,
      component,
      { operation: operationName },
      error instanceof Error ? error : undefined
    );
  }

  private inferErrorType(error: unknown, operationName: string): SecurityErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('csp') || message.includes('content security')) {
        return SecurityErrorType.CSP_VIOLATION;
      }
      if (message.includes('validation') || message.includes('sanitization')) {
        return SecurityErrorType.INPUT_VALIDATION_FAILED;
      }
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return SecurityErrorType.RATE_LIMIT_EXCEEDED;
      }
      if (message.includes('authentication') || message.includes('auth')) {
        return SecurityErrorType.AUTHENTICATION_FAILED;
      }
      if (message.includes('csrf') || message.includes('token')) {
        return SecurityErrorType.CSRF_TOKEN_INVALID;
      }
      if (message.includes('vulnerability') || message.includes('security')) {
        return SecurityErrorType.VULNERABILITY_DETECTED;
      }
      if (message.includes('network') || message.includes('connection')) {
        return SecurityErrorType.NETWORK_ERROR;
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return SecurityErrorType.TIMEOUT_ERROR;
      }
    }

    return SecurityErrorType.CONFIGURATION_ERROR;
  }

  private shouldThrowError(error: SecurityError): boolean {
    // Don't throw for low-severity errors in permissive mode
    const handlerMode = this.errorHandler.getConfig().mode;
    return error.severity !== 'low' || handlerMode === 'strict';
  }

  private getSafeDefault(operationName: string): unknown {
    // Return safe defaults based on operation
    switch (operationName) {
      case 'sanitize':
        return { sanitized: '', wasModified: false, threats: [] };
      case 'validate':
        return { valid: false, errors: [] };
      case 'checkLimit':
        return { allowed: false, remaining: 0, resetTime: 0 };
      case 'scan':
        return { score: 0, threats: [], issues: [] };
      case 'generateNonce':
        return '';
      case 'checkHealth':
        return { enabled: false, status: 'unhealthy', issues: ['Operation failed'] };
      default:
        return null;
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: unknown[]) => Promise<any>>(
    fn: T,
    operationName: string,
    component: string
  ): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return this.handleSecurityOperation(
        () => fn(...args),
        operationName,
        component
      );
    }) as T;
  }

  /**
   * Handle batch operations with error handling
   */
  async handleBatchOperation<T>(
    operations: Array<() => Promise<T>>,
    operationName: string,
    component: string
  ): Promise<Array<T | Error>> {
    const results: Array<T | Error> = [];

    for (const operation of operations) {
      try {
        const result = await this.handleSecurityOperation(
          operation,
          operationName,
          component
        );
        results.push(result);
      } catch (error) {
        results.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return results;
  }

  /**
   * Handle retryable operations
   */
  async handleRetryableOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.handleSecurityOperation(
          operation,
          `${operationName} (attempt ${attempt})`,
          component
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    // If we get here, all retries failed
    const securityError = SecurityErrorFactory.createError(
      SecurityErrorType.TIMEOUT_ERROR,
      `Operation ${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`,
      component,
      { maxRetries, lastError: lastError?.message }
    );

    const errorResult = this.errorHandler.handleSecurityError(securityError);

    if (this.shouldThrowError(securityError)) {
      throw new SecurityOperationError(securityError, errorResult);
    }

    return this.getSafeDefault(operationName) as T;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    return this.errorHandler.getErrorStatistics();
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    return this.errorHandler.getErrorSummary();
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: (error: SecurityErrorResult) => void): () => void {
    return this.errorHandler.onError(callback);
  }

  /**
   * Get health status
   */
  getHealthStatus(): { enabled: boolean; status: string; lastCheck: Date; issues: string[] } {
    return this.errorHandler.getHealthStatus();
  }

  /**
   * Get metrics
   */
  getMetrics(): { requestsProcessed: number; threatsBlocked: number; averageResponseTime: number; errorRate: number } {
    return this.errorHandler.getMetrics();
  }

  /**
   * Shutdown the middleware
   */
  async shutdown(): Promise<void> {
    await this.errorHandler.shutdown();
    this.errorLogger.info('Security Error Middleware shutdown complete');
  }
}

/**
 * Security Logger - Specialized logger for security events
 */
class SecurityLogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = logLevel;
  }

  log(severity: 'low' | 'medium' | 'high' | 'critical', message: string, context?: Record<string, unknown>): void {
    // Map security severity to log level
    let logLevel: 'debug' | 'info' | 'warn' | 'error';
    switch (severity) {
      case 'low':
        logLevel = 'info';
        break;
      case 'medium':
        logLevel = 'warn';
        break;
      case 'high':
      case 'critical':
        logLevel = 'error';
        break;
      default:
        logLevel = 'info';
    }

    // Only log if severity meets threshold
    if (this.shouldLog(logLevel)) {
      const logData = {
        timestamp: new Date().toISOString(),
        severity,
        message,
        context,
      };

      switch (logLevel) {
        case 'info':
          console.info('[SECURITY]', logData);
          break;
        case 'warn':
          console.warn('[SECURITY]', logData);
          break;
        case 'error':
          console.error('[SECURITY]', logData);
          break;
      }
    }
  }

  private shouldLog(logLevel: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const logLevelIndex = levels.indexOf(logLevel);

    return logLevelIndex >= currentLevelIndex;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug('[SECURITY]', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info('[SECURITY]', message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn('[SECURITY]', message, context);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error('[SECURITY]', message, context);
    }
  }
}

/**
 * Create security error middleware instance
 */
export function createSecurityErrorMiddleware(config: ErrorHandlingConfig): SecurityErrorMiddleware {
  return new SecurityErrorMiddleware(config);
}
