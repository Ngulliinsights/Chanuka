/**
 * Core Error Handler Service
 *
 * Centralized error handling service for client-side applications.
 * Provides unified error processing, recovery strategies, analytics, and reporting.
 * Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { ErrorAnalyticsService } from './analytics';
import { ErrorDomain, ErrorSeverity } from './constants';
import { ErrorRateLimiter } from './rate-limiter';
import { ErrorReportingService } from './reporting';
import type { ErrorReporter } from './types';
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
  private errors = new Map<string, AppError>();
  private notificationTimeout: NodeJS.Timeout | null = null;
  private pendingNotifications: AppError[] = [];
  private rateLimiter: ErrorRateLimiter;
  private analytics: ErrorAnalyticsService;
  private reporting: ErrorReportingService;
  private reporters: Set<ErrorReporter> = new Set();
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

    this.rateLimiter = new ErrorRateLimiter(60000, 50);
    this.analytics = ErrorAnalyticsService.getInstance();
    this.reporting = ErrorReportingService.getInstance();
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

    // Configure analytics and reporting
    this.analytics.configure({ enabled: this.config.enableAnalytics });
    this.reporting.configure({ enabled: true });

    this.isInitialized = true;
  }

  /**
   * Handle an error with comprehensive processing including analytics and reporting
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

    // Check rate limiting
    const rateLimitResult = this.rateLimiter.shouldLimit(error);
    if (rateLimitResult.limited) {
      console.warn(`Error rate limited for ${error.type}:${error.context?.component}`, {
        retryAfter: rateLimitResult.retryAfter,
        errorId: error.id,
      });
      return error;
    }

    // Store error for retrieval
    this.errors.set(error.id, error);

    // Maintain error limit
    if (this.errors.size > this.config.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      this.errors.delete(oldestKey);
    }

    // Log error if enabled
    if (this.config.logErrors) {
      this.logError(error);
    }

    // Track analytics
    if (this.config.enableAnalytics) {
      this.analytics.track(error).catch(analyticsError => {
        console.error('Analytics tracking failed:', analyticsError);
      });
    }

    // Report error
    this.reporting.reportError(error).catch(reportingError => {
      console.error('Error reporting failed:', reportingError);
    });

    // Send to additional reporters
    this.reportToReporters(error).catch(reporterError => {
      console.error('Error reporter failed:', reporterError);
    });

    // Notify listeners
    this.notifyListeners(error);

    // Debounced notifications
    this.scheduleNotification(error);

    // Attempt recovery
    if (this.config.enableRecovery && error.recoverable) {
      this.attemptRecovery(error).catch(recoveryError => {
        console.error('Recovery attempt failed:', recoveryError);
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
      recover: async (_error) => {
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
      recover: async (_error) => {
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
   * Log error with appropriate severity level
   */
  private logError(error: AppError): void {
    const logData = {
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      context: error.context,
      details: error.details,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(error.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(error.message, logData);
        break;
      case ErrorSeverity.LOW:
        console.info(error.message, logData);
        break;
    }
  }

  /**
   * Schedule debounced error notifications
   */
  private scheduleNotification(error: AppError): void {
    this.pendingNotifications.push(error);

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = setTimeout(() => {
      this.emitErrorEvents();
      this.pendingNotifications = [];
      this.notificationTimeout = null;
    }, this.config.notificationDebounceMs);
  }

  /**
   * Emit error events for UI components
   */
  private emitErrorEvents(): void {
    if (typeof window !== 'undefined' && this.pendingNotifications.length > 0) {
      window.dispatchEvent(new CustomEvent('coreErrors', {
        detail: this.pendingNotifications
      }));
    }
  }

  /**
   * Get comprehensive error statistics
   */
  getErrorStats(): ErrorStats {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    const byType = {} as Record<ErrorDomain, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;
    let recovered = 0;
    let retryable = 0;

    // Initialize counters
    Object.values(ErrorDomain).forEach(domain => {
      byType[domain] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      bySeverity[severity] = 0;
    });

    errors.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
      if (error.recovered) recovered++;
      if (error.retryable) retryable++;
    });

    return {
      total: errors.length,
      byType,
      bySeverity,
      recent: {
        lastHour: errors.filter(e => now - e.timestamp < oneHour).length,
        last24Hours: errors.filter(e => now - e.timestamp < oneDay).length,
        last7Days: errors.filter(e => now - e.timestamp < oneWeek).length,
      },
      recovered,
      retryable,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorDomain, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all stored errors
   */
  clearErrors(): void {
    this.errors.clear();
  }

  /**
   * Add an error reporter
   */
  addReporter(reporter: ErrorReporter): void {
    this.reporters.add(reporter);
  }

  /**
   * Remove an error reporter
   */
  removeReporter(reporter: ErrorReporter): boolean {
    return this.reporters.delete(reporter);
  }

  /**
   * Get all registered reporters
   */
  getReporters(): ErrorReporter[] {
    return Array.from(this.reporters);
  }

  /**
   * Report error to all registered reporters
   */
  private async reportToReporters(error: AppError): Promise<void> {
    const reportPromises = Array.from(this.reporters).map(reporter =>
      reporter.report(error).catch(reporterError => {
        console.error('Error reporter failed:', reporterError);
      })
    );

    await Promise.allSettled(reportPromises);
  }

  /**
   * Destroy the handler and clean up resources
   */
  destroy(): void {
    this.rateLimiter.destroy();
    this.reporting.destroy();

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }

    this.errors.clear();
    this.recoveryStrategies.clear();
    this.errorListeners.clear();
    this.reporters.clear();
    this.pendingNotifications = [];
    this.isInitialized = false;
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
  details?: Record<string, unknown>,
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
  details?: Record<string, unknown>,
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
  details?: Record<string, unknown>,
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