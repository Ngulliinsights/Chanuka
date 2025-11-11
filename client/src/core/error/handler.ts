/**
 * Core Error Handler Service
 *
 * Centralized error handling service for client-side applications.
 * Provides unified error processing, recovery strategies, and integration
 * with the existing unified error handler.
 */

import { ErrorDomain, ErrorSeverity } from '../../utils/logger';
import { errorHandler as unifiedErrorHandler } from '../../utils/unified-error-handler';
import {
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener,
  ErrorStats,
  RecoveryAction,
  RecoveryResult,
} from './types';

// ============================================================================
// Core Error Handler Service
// ============================================================================

class CoreErrorHandler {
  private static instance: CoreErrorHandler;
  private config: Required<ErrorHandlerConfig>;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private errorListeners: Set<ErrorListener> = new Set();
  private isInitialized = false;

  private constructor() {
    this.config = {
      maxErrors: 100,
      enableGlobalHandlers: true,
      enableRecovery: true,
      notificationDebounceMs: 100,
      logErrors: true,
      enableAnalytics: false,
    };
  }

  static getInstance(): CoreErrorHandler {
    if (!CoreErrorHandler.instance) {
      CoreErrorHandler.instance = new CoreErrorHandler();
    }
    return CoreErrorHandler.instance;
  }

  /**
   * Initialize the core error handler with configuration
   */
  initialize(config: ErrorHandlerConfig = {}): void {
    if (this.isInitialized) {
      console.warn('CoreErrorHandler already initialized');
      return;
    }

    this.config = { ...this.config, ...config };
    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
    this.isInitialized = true;
  }

  /**
   * Handle an error with unified processing
   */
  handleError(errorData: Partial<AppError>): AppError {
    // Create standardized error object
    const error: AppError = {
      id: this.generateErrorId(),
      type: ErrorDomain.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: 'An unknown error occurred',
      timestamp: Date.now(),
      recoverable: true,
      retryable: false,
      retryCount: 0,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      ...errorData,
    };

    // Delegate to unified error handler for core processing and advanced features
    const unifiedError = unifiedErrorHandler.handleError({
      type: error.type,
      severity: error.severity,
      message: error.message,
      details: error.details,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable,
    });

    // Merge unified error data with our error object
    Object.assign(error, unifiedError);

    // Add core-specific enhancements
    error.context = {
      ...error.context,
      coreHandlerVersion: '1.0.0',
      integratedWithUnified: true,
    };

    // Notify local listeners (core-specific listeners)
    this.notifyListeners(error);

    // Attempt recovery using core recovery strategies
    if (this.config.enableRecovery && error.recoverable) {
      this.attemptRecovery(error).catch(recoveryError => {
        console.error('Core recovery attempt failed:', recoveryError);
        // Fallback to unified error handler recovery if available
        if (unifiedErrorHandler.attemptRecovery) {
          unifiedErrorHandler.attemptRecovery(error).catch(unifiedRecoveryError => {
            console.error('Unified recovery attempt also failed:', unifiedRecoveryError);
          });
        }
      });
    }

    return error;
  }

  /**
   * Attempt to recover from an error using registered strategies
   */
  private async attemptRecovery(error: AppError): Promise<RecoveryResult> {
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of applicableStrategies) {
      try {
        const success = await strategy.recover(error);
        if (success) {
          error.recovered = true;
          error.recoveryStrategy = strategy.id;

          return {
            success: true,
            action: this.mapStrategyToAction(strategy.id),
            message: `Recovered using ${strategy.name}`,
          };
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.id} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      action: RecoveryAction.IGNORE,
      message: 'No recovery strategy succeeded',
    };
  }

  /**
   * Map strategy ID to recovery action
   */
  private mapStrategyToAction(strategyId: string): RecoveryAction {
    const actionMap: Record<string, RecoveryAction> = {
      'network-retry': RecoveryAction.RETRY,
      'cache-clear': RecoveryAction.CACHE_CLEAR,
      'auth-refresh': RecoveryAction.REDIRECT,
      'page-reload': RecoveryAction.RELOAD,
    };

    return actionMap[strategyId] || RecoveryAction.IGNORE;
  }

  /**
   * Set up default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // Network retry strategy
    this.addRecoveryStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      canRecover: (error) =>
        error.type === ErrorDomain.NETWORK &&
        error.retryable &&
        (error.retryCount || 0) < 3,
      recover: async (error) => {
        const retryCount = (error.retryCount || 0) + 1;
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);

        await new Promise(resolve => setTimeout(resolve, delayMs));
        error.retryCount = retryCount;

        // The actual retry logic should be handled by the calling code
        return false; // Let caller handle the retry
      },
      priority: 1,
      maxRetries: 3,
    });

    // Cache clear strategy
    this.addRecoveryStrategy({
      id: 'cache-clear',
      name: 'Cache Clear and Reload',
      description: 'Clear application cache and reload the page',
      canRecover: (error) =>
        error.severity === ErrorSeverity.CRITICAL &&
        error.recoverable,
      recover: async (error) => {
        try {
          // Clear caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Clear non-critical storage
          const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences'];
          Object.keys(localStorage).forEach(key => {
            if (!criticalKeys.includes(key)) {
              localStorage.removeItem(key);
            }
          });

          // Reload after a short delay
          setTimeout(() => window.location.reload(), 500);

          return true;
        } catch (clearError) {
          console.error('Cache clear failed:', clearError);
          return false;
        }
      },
      priority: 2,
    });

    // Page reload strategy for severe errors
    this.addRecoveryStrategy({
      id: 'page-reload',
      name: 'Page Reload',
      description: 'Reload the current page to recover from error',
      canRecover: (error) =>
        error.severity >= ErrorSeverity.HIGH &&
        error.recoverable,
      recover: async (error) => {
        setTimeout(() => window.location.reload(), 1000);
        return true;
      },
      priority: 3,
    });
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (!this.config.enableGlobalHandlers) return;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      event.preventDefault();

      this.handleError({
        type: ErrorDomain.SYSTEM,
        severity: this.determineSeverityFromError(event.error),
        message: event.message || 'Uncaught error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          error: event.error,
        },
        context: {
          component: 'GlobalErrorHandler',
        },
        recoverable: false,
        retryable: false,
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();

      this.handleError({
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
        details: {
          reason: event.reason,
          stack: event.reason?.stack,
          promise: event.promise,
        },
        context: {
          component: 'GlobalErrorHandler',
        },
        recoverable: false,
        retryable: false,
      });
    });
  }

  /**
   * Determine error severity from error object
   */
  private determineSeverityFromError(error: Error | undefined): ErrorSeverity {
    if (!error) return ErrorSeverity.MEDIUM;

    const errorString = error.toString().toLowerCase();

    if (errorString.includes('out of memory') || errorString.includes('quota exceeded')) {
      return ErrorSeverity.CRITICAL;
    }

    if (errorString.includes('typeerror') || errorString.includes('referenceerror')) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Add a recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
  }

  /**
   * Remove a recovery strategy
   */
  removeRecoveryStrategy(strategyId: string): boolean {
    return this.recoveryStrategies.delete(strategyId);
  }

  /**
   * Add an error listener
   */
  addErrorListener(listener: ErrorListener): void {
    this.errorListeners.add(listener);
  }

  /**
   * Remove an error listener
   */
  removeErrorListener(listener: ErrorListener): void {
    this.errorListeners.delete(listener);
  }

  /**
   * Notify all error listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener threw error:', listenerError);
      }
    });
  }

  /**
   * Get error statistics (delegates to unified handler for comprehensive stats)
   */
  getErrorStats(): ErrorStats {
    return unifiedErrorHandler.getErrorStats();
  }

  /**
   * Get recent errors from unified handler
   */
  getRecentErrors(limit = 10): any[] {
    return unifiedErrorHandler.getRecentErrors?.(limit) || [];
  }

  /**
   * Get errors by type from unified handler
   */
  getErrorsByType(type: ErrorDomain, limit = 10): any[] {
    return unifiedErrorHandler.getErrorsByType?.(type, limit) || [];
  }

  /**
   * Get errors by severity from unified handler
   */
  getErrorsBySeverity(severity: ErrorSeverity, limit = 10): any[] {
    return unifiedErrorHandler.getErrorsBySeverity?.(severity, limit) || [];
  }

  /**
   * Clear errors (delegates to unified handler)
   */
  clearErrors(): void {
    unifiedErrorHandler.clearErrors?.();
  }

  /**
   * Add recovery strategy to unified handler if supported
   */
  addUnifiedRecoveryStrategy(strategy: any): void {
    if (unifiedErrorHandler.addRecoveryStrategy) {
      unifiedErrorHandler.addRecoveryStrategy(strategy);
    }
  }

  /**
   * Remove recovery strategy from unified handler if supported
   */
  removeUnifiedRecoveryStrategy(strategyId: string): boolean {
    if (unifiedErrorHandler.removeRecoveryStrategy) {
      return unifiedErrorHandler.removeRecoveryStrategy(strategyId);
    }
    return false;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `core_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ErrorHandlerConfig>> {
    return { ...this.config };
  }

  /**
   * Reset the handler (useful for testing)
   */
  reset(): void {
    this.recoveryStrategies.clear();
    this.errorListeners.clear();
    this.isInitialized = false;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const coreErrorHandler = CoreErrorHandler.getInstance();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create and handle a network error
 */
export function createNetworkError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return coreErrorHandler.handleError({
    type: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    context,
    recoverable: true,
    retryable: true,
  });
}

/**
 * Create and handle a validation error
 */
export function createValidationError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return coreErrorHandler.handleError({
    type: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });
}

/**
 * Create and handle an authentication error
 */
export function createAuthError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return coreErrorHandler.handleError({
    type: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    recoverable: true,
    retryable: false,
  });
}