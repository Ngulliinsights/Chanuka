// Standardized Error Handling for Unified API Client
// Based on the consolidated API client design specifications

// Error types imported from types.ts for consistency
import { ErrorCode, ErrorDomain, ErrorSeverity, UnifiedError } from '@client/types';
export { ErrorCode, ErrorDomain, ErrorSeverity };
export type { UnifiedError };

// Error Handler Service
export class UnifiedErrorHandler {
  private errorReporters: ErrorReporter[] = [];
  private errorTransformers: ErrorTransformer[] = [];
  private recoveryStrategies: Map<ErrorCode, RecoveryStrategy> = new Map();

  registerReporter(reporter: ErrorReporter): void {
    this.errorReporters.push(reporter);
  }

  registerTransformer(transformer: ErrorTransformer): void {
    this.errorTransformers.push(transformer);
  }

  registerRecoveryStrategy(code: ErrorCode, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(code, strategy);
  }

  async handleError(error: UnifiedError | Error, context?: Record<string, any>): Promise<void> {
    // Transform error if needed
    const unifiedError = this.transformError(error, context);

    // Log error
    this.logError(unifiedError);

    // Report error
    await this.reportError(unifiedError);

    // Attempt recovery if possible
    if (unifiedError.recoverable) {
      await this.attemptRecovery(unifiedError);
    }

    // Emit error event for UI handling
    this.emitErrorEvent(unifiedError);
  }

  private transformError(error: UnifiedError | Error, context?: Record<string, any>): UnifiedError {
    // Apply transformers
    let unifiedError: UnifiedError;

    if (this.isUnifiedError(error)) {
      unifiedError = error;
    } else {
      // Transform raw error to unified format
      unifiedError = {
        id: this.generateErrorId(),
        code: this.mapErrorToCode(error),
        domain: this.detectDomain(error),
        severity: this.detectSeverity(error),
        message: error.message,
        context: {
          component: context?.component || 'unknown',
          operation: context?.operation || 'unknown',
          timestamp: new Date().toISOString(),
          ...context
        },
        recoverable: this.isRecoverable(error),
        retryable: this.isRetryable(error),
        reported: false
      };

      if (error instanceof Error && error.stack) {
        unifiedError.stack = error.stack;
      }
    }

    // Apply custom transformers
    for (const transformer of this.errorTransformers) {
      unifiedError = transformer.transform(unifiedError);
    }

    return unifiedError;
  }

  private async reportError(error: UnifiedError): Promise<void> {
    if (error.reported) return;

    const reportPromises = this.errorReporters.map(reporter =>
      reporter.report(error).catch(err =>
        console.error('Error reporter failed:', err)
      )
    );

    await Promise.allSettled(reportPromises);
    error.reported = true;
  }

  private async attemptRecovery(error: UnifiedError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.code);

    if (strategy) {
      try {
        await strategy.recover(error);
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
  }

  private logError(error: UnifiedError): void {
    const logLevel = this.mapSeverityToLogLevel(error.severity);
    const logMessage = `[${error.domain}:${error.code}] ${error.message}`;

    console[logLevel](logMessage, {
      errorId: error.id,
      context: error.context,
      details: error.details
    });
  }

  private emitErrorEvent(error: UnifiedError): void {
    window.dispatchEvent(new CustomEvent('unifiedError', {
      detail: error
    }));
  }

  private isUnifiedError(error: any): error is UnifiedError {
    return error && typeof error.id === 'string' && typeof error.code === 'string';
  }

  private mapErrorToCode(error: Error): ErrorCode {
    // Map common error types to codes
    if (error.name === 'TimeoutError') return ErrorCode.NETWORK_TIMEOUT;
    if (error.message.includes('401')) return ErrorCode.AUTH_INVALID_CREDENTIALS;
    if (error.message.includes('403')) return ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS;
    if (error.message.includes('404')) return ErrorCode.BUSINESS_ENTITY_NOT_FOUND;
    if (error.message.includes('429')) return ErrorCode.SYSTEM_RATE_LIMITED;
    if (error.message.includes('5')) return ErrorCode.NETWORK_SERVER_ERROR;

    return ErrorCode.SYSTEM_UNKNOWN_ERROR;
  }

  private detectDomain(error: Error): ErrorDomain {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ErrorDomain.NETWORK;
    }
    if (error.message.includes('auth')) {
      return ErrorDomain.AUTHENTICATION;
    }
    return ErrorDomain.SYSTEM;
  }

  private detectSeverity(error: Error): ErrorSeverity {
    if (error.message.includes('critical') || error.name === 'CriticalError') {
      return ErrorSeverity.CRITICAL;
    }
    if (error.message.includes('high') || error.name === 'HighPriorityError') {
      return ErrorSeverity.HIGH;
    }
    return ErrorSeverity.MEDIUM;
  }

  private isRecoverable(error: Error): boolean {
    // Define which errors are recoverable
    return !error.message.includes('permanent') && !error.message.includes('fatal');
  }

  private isRetryable(error: Error): boolean {
    // Define which errors are retryable
    return error.name === 'TimeoutError' ||
           error.message.includes('temporary') ||
           error.message.includes('5');
  }

  private mapSeverityToLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Error Reporter Interface
export interface ErrorReporter {
  report(error: UnifiedError): Promise<void>;
}

// Error Transformer Interface
export interface ErrorTransformer {
  transform(error: UnifiedError): UnifiedError;
}

// Recovery Strategy Interface
export interface RecoveryStrategy {
  recover(error: UnifiedError): Promise<void>;
}

// Error Factory Functions
export class ErrorFactory {
  static createNetworkError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    context?: Record<string, any>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: context?.component || 'network',
        operation: context?.operation || 'request',
        timestamp: new Date().toISOString(),
        ...context
      },
      recoverable: true,
      retryable: true,
      reported: false
    };
  }

  static createAuthError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    context?: Record<string, any>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message,
      details,
      context: {
        component: context?.component || 'auth',
        operation: context?.operation || 'authenticate',
        timestamp: new Date().toISOString(),
        ...context
      },
      recoverable: false,
      retryable: false,
      reported: false
    };
  }

  static createValidationError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    context?: Record<string, any>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      details,
      context: {
        component: context?.component || 'validation',
        operation: context?.operation || 'validate',
        timestamp: new Date().toISOString(),
        ...context
      },
      recoverable: true,
      retryable: false,
      reported: false
    };
  }

  static createBusinessError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    context?: Record<string, any>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: context?.component || 'business',
        operation: context?.operation || 'process',
        timestamp: new Date().toISOString(),
        ...context
      },
      recoverable: false,
      retryable: false,
      reported: false
    };
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global Error Handler Instance
export const globalErrorHandler = new UnifiedErrorHandler();

// Default Error Reporter (Console)
class ConsoleErrorReporter implements ErrorReporter {
  async report(error: UnifiedError): Promise<void> {
    console.error('Error Report:', {
      id: error.id,
      code: error.code,
      domain: error.domain,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString()
    });
  }
}

// Register default reporter
globalErrorHandler.registerReporter(new ConsoleErrorReporter());