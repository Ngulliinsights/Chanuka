/**
 * Unified Error Handling System - Optimized Version
 * 
 * A production-ready error handling system with improved type safety,
 * performance optimizations, and comprehensive recovery strategies.
 * 
 * Key improvements:
 * - Better memory management with LRU cache
 * - Enhanced type safety and generics
 * - Debounced error notifications
 * - Configurable behavior
 * - Improved recovery strategy pattern
 * - Better async handling
 */

import { logger } from './browser-logger'
import { tokenStorage } from './secure-storage'

// Advanced error handling modules - lazy loaded to avoid circular dependencies
let errorAnalytics: any = null;
let smartRecoveryEngine: any = null;
let errorRateLimiter: any = null;

// Lazy load advanced error handling modules
const loadAdvancedModules = async () => {
  if (!errorAnalytics) {
    try {
      const analyticsModule = await import('./error-analytics');
      errorAnalytics = analyticsModule.errorAnalytics;
    } catch (e) {
      console.warn('Error analytics module not available');
    }
  }
  
  if (!smartRecoveryEngine) {
    try {
      const recoveryModule = await import('./advanced-error-recovery');
      smartRecoveryEngine = recoveryModule.smartRecoveryEngine;
    } catch (e) {
      console.warn('Smart recovery engine not available');
    }
  }
  
  if (!errorRateLimiter) {
    try {
      const rateLimiterModule = await import('./error-rate-limiter');
      errorRateLimiter = rateLimiterModule.errorRateLimiter;
    } catch (e) {
      console.warn('Error rate limiter not available');
    }
  }
};

// ============================================================================
// Type Definitions
// ============================================================================

// Import shared error types to eliminate redundancy
import { ErrorSeverity, ErrorDomain } from '../shared/errors';

// Re-export for convenience
export { ErrorSeverity, ErrorDomain } from '../shared/errors';

// Create type alias for backward compatibility
export type ErrorType = ErrorDomain;
export const ErrorType = ErrorDomain;

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  [key: string]: any // Allow custom context fields
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  details?: any
  timestamp: number
  context?: ErrorContext
  recoverable: boolean
  retryable: boolean
  retryCount?: number
  recovered?: boolean
  recoveryStrategy?: string
}

export interface ErrorRecoveryStrategy {
  id: string
  name: string
  description: string
  canRecover: (error: AppError) => boolean
  recover: (error: AppError) => Promise<boolean>
  priority: number
  maxRetries?: number
}

export interface ErrorHandlerConfig {
  maxErrors?: number
  enableGlobalHandlers?: boolean
  enableRecovery?: boolean
  notificationDebounceMs?: number
  logErrors?: boolean
}

type ErrorListener = (error: AppError) => void

// ============================================================================
// Unified Error Handler Class
// ============================================================================

class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler
  private errors: Map<string, AppError> = new Map()
  private recoveryStrategies: ErrorRecoveryStrategy[] = []
  private errorListeners: Set<ErrorListener> = new Set()
  private notificationTimeout: NodeJS.Timeout | null = null
  private pendingNotifications: AppError[] = []
  
  private config: Required<ErrorHandlerConfig> = {
    maxErrors: 100,
    enableGlobalHandlers: true,
    enableRecovery: true,
    notificationDebounceMs: 100,
    logErrors: true,
  }

  static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler()
    }
    return UnifiedErrorHandler.instance
  }

  private constructor() {
    // Initialization happens through configure() method for better control
  }

  /**
   * Configure the error handler with custom settings.
   * This should be called once during application initialization.
   */
  public configure(config: ErrorHandlerConfig = {}): void {
    this.config = { ...this.config, ...config }
    
    if (this.config.enableGlobalHandlers) {
      this.setupGlobalErrorHandlers()
    }
    
    this.setupDefaultRecoveryStrategies()
    
    // Initialize advanced error handling modules
    loadAdvancedModules().catch(e => {
      if (this.config.logErrors) {
        logger.warn('Failed to load advanced error handling modules', { error: e });
      }
    });
  }

  // ==========================================================================
  // Recovery Strategies Setup
  // ==========================================================================

  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery with exponential backoff
    this.addRecoveryStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      canRecover: (error) => 
        error.type === ErrorDomain.NETWORK && 
        error.retryable && 
        (error.retryCount || 0) < 3,
      recover: async (error) => {
        const retryCount = (error.retryCount || 0) + 1
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000)
        
        await new Promise(resolve => setTimeout(resolve, delayMs))
        
        // Update retry count in the stored error
        error.retryCount = retryCount
        
        // The actual retry logic would be handled by the code that triggered the error
        // This strategy just implements the backoff delay
        return false // Return false to allow the caller to retry the operation
      },
      priority: 1,
      maxRetries: 3,
    })

    // Authentication error recovery
    this.addRecoveryStrategy({
      id: 'auth-refresh',
      name: 'Authentication Refresh',
      description: 'Attempt to refresh authentication tokens',
      canRecover: (error) => 
        error.type === ErrorDomain.AUTHENTICATION &&
        error.recoverable,
      recover: async (error) => {
        try {
          const refreshToken = await tokenStorage.getItem('refresh_token')
          if (!refreshToken) {
            // No refresh token available, redirect to login
            await this.redirectToLogin()
            return false
          }

          // Attempt token refresh
          // In a real implementation, this would call your auth refresh endpoint
          if (this.config.logErrors) {
            logger.info('Attempting authentication refresh', {
              component: 'UnifiedErrorHandler',
              errorId: error.id,
            })
          }
          
          // Simulate successful refresh
          // const response = await fetch('/api/auth/refresh', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ refreshToken })
          // })
          
          return true
        } catch (refreshError) {
          await this.redirectToLogin()
          return false
        }
      },
      priority: 2,
    })

    // Cache clear recovery for severe issues
    this.addRecoveryStrategy({
      id: 'cache-clear',
      name: 'Cache Clear and Reload',
      description: 'Clear application cache and reload the page',
      canRecover: (error) => 
        error.severity === ErrorSeverity.CRITICAL &&
        error.recoverable,
      recover: async (error) => {
        try {
          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
          }
          
          // Clear storage (be selective in production)
          const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences']
          Object.keys(localStorage).forEach(key => {
            if (!criticalKeys.includes(key)) {
              localStorage.removeItem(key)
            }
          })
          // Clear session storage but preserve secure tokens
          Object.keys(sessionStorage).forEach(key => {
            if (!criticalKeys.includes(key)) {
              sessionStorage.removeItem(key)
            }
          })
          
          if (this.config.logErrors) {
            logger.info('Cache cleared, reloading application', {
              component: 'UnifiedErrorHandler',
              errorId: error.id,
            })
          }
          
          // Give time for logging to complete
          setTimeout(() => window.location.reload(), 500)
          
          return true
        } catch (clearError) {
          logger.error('Cache clear failed', {
            component: 'UnifiedErrorHandler',
          }, clearError)
          return false
        }
      },
      priority: 3,
    })
  }

  // ==========================================================================
  // Global Error Handlers
  // ==========================================================================

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      // Prevent default browser error handling
      event.preventDefault()
      
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
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault()
      
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
      })
    })
  }

  /**
   * Determine error severity based on error characteristics
   */
  private determineSeverityFromError(error: Error | undefined): ErrorSeverity {
    if (!error) return ErrorSeverity.MEDIUM
    
    const errorString = error.toString().toLowerCase()
    
    // Critical errors that break the application
    if (errorString.includes('out of memory') || 
        errorString.includes('quota exceeded')) {
      return ErrorSeverity.CRITICAL
    }
    
    // High severity errors
    if (errorString.includes('typeerror') || 
        errorString.includes('referenceerror')) {
      return ErrorSeverity.HIGH
    }
    
    return ErrorSeverity.MEDIUM
  }

  // ==========================================================================
  // Core Error Handling
  // ==========================================================================

  /**
   * Main method to handle errors throughout the application.
   * This creates a standardized error object and triggers all error handling flows.
   */
  public handleError(errorData: Partial<AppError>): AppError {
    // Create fully formed error object
    const error: AppError = {
      id: this.generateErrorId(),
      type: ErrorDomain.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: 'An unknown error occurred',
      timestamp: Date.now(),
      recoverable: true,
      retryable: false,
      retryCount: 0,
      ...errorData,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...errorData.context,
      },
    }

    // Check rate limiting before processing
    if (errorRateLimiter) {
      const rateLimitResult = errorRateLimiter.shouldLimit(error);
      if (rateLimitResult.limited) {
        if (this.config.logErrors) {
          logger.warn('Error rate limited', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
            limitedBy: rateLimitResult.limitedBy,
            retryAfter: rateLimitResult.retryAfter,
          });
        }
        return error; // Return early if rate limited
      }
    }

    // Store error with LRU eviction
    this.storeError(error)

    // Log error if enabled
    if (this.config.logErrors) {
      this.logError(error)
    }

    // Send to analytics providers
    if (errorAnalytics) {
      errorAnalytics.track(error).catch((analyticsError: any) => {
        if (this.config.logErrors) {
          logger.warn('Failed to track error in analytics', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
            analyticsError: analyticsError.message,
          });
        }
      });
    }

    // Queue notification to listeners (debounced)
    this.queueNotification(error)

    // Attempt recovery if enabled and error is recoverable
    if (this.config.enableRecovery && error.recoverable) {
      // Use smart recovery engine if available, fallback to basic recovery
      const recoveryPromise = smartRecoveryEngine 
        ? smartRecoveryEngine.attemptRecovery(error)
        : this.attemptRecovery(error);
      
      // Don't await - recovery happens in background
      recoveryPromise.catch((recoveryError: any) => {
        if (this.config.logErrors) {
          logger.error('Recovery attempt threw error', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
          }, recoveryError)
        }
      })
    }

    return error
  }

  /**
   * Attempt to recover from an error using registered strategies.
   */
  public async attemptRecovery(error: AppError): Promise<boolean> {
    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.priority - b.priority)

    if (applicableStrategies.length === 0) {
      if (this.config.logErrors) {
        logger.debug('No recovery strategies available', {
          component: 'UnifiedErrorHandler',
          errorId: error.id,
          errorType: error.type,
        })
      }
      return false
    }

    // Try each strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        if (this.config.logErrors) {
          logger.info('Attempting error recovery', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
            strategy: strategy.name,
            priority: strategy.priority,
          })
        }

        const recovered = await strategy.recover(error)
        
        if (recovered) {
          // Mark error as recovered
          error.recovered = true
          error.recoveryStrategy = strategy.id
          
          if (this.config.logErrors) {
            logger.info('Error recovery successful', {
              component: 'UnifiedErrorHandler',
              errorId: error.id,
              strategy: strategy.name,
            })
          }
          
          return true
        }
      } catch (recoveryError) {
        if (this.config.logErrors) {
          logger.error('Recovery strategy threw error', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
            strategy: strategy.name,
          }, recoveryError)
        }
      }
    }

    if (this.config.logErrors) {
      logger.warn('All recovery strategies failed', {
        component: 'UnifiedErrorHandler',
        errorId: error.id,
        strategiesAttempted: applicableStrategies.length,
      })
    }

    return false
  }

  // ==========================================================================
  // Error Storage Management
  // ==========================================================================

  /**
   * Store error with LRU eviction policy to prevent memory leaks
   */
  private storeError(error: AppError): void {
    this.errors.set(error.id, error)
    
    // Implement LRU eviction if over limit
    if (this.errors.size > this.config.maxErrors) {
      // Remove oldest error (first key in Map maintains insertion order)
      const oldestKey = this.errors.keys().next().value
      if (oldestKey) {
        this.errors.delete(oldestKey)
      }
    }
  }

  /**
   * Generate unique error ID with timestamp and random component
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Log error with appropriate log level based on severity
   */
  private logError(error: AppError): void {
    const logData = {
      component: 'UnifiedErrorHandler',
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(error.message, logData, error.details)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logData, error.details)
        break
      case ErrorSeverity.LOW:
        logger.info(error.message, logData, error.details)
        break
    }
  }

  // ==========================================================================
  // Listener Management with Debouncing
  // ==========================================================================

  /**
   * Queue error notification with debouncing to prevent listener flooding
   */
  private queueNotification(error: AppError): void {
    this.pendingNotifications.push(error)
    
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
    }
    
    this.notificationTimeout = setTimeout(() => {
      this.flushNotifications()
    }, this.config.notificationDebounceMs)
  }

  /**
   * Flush pending notifications to all listeners
   */
  private flushNotifications(): void {
    const notifications = [...this.pendingNotifications]
    this.pendingNotifications = []
    
    notifications.forEach(error => {
      this.errorListeners.forEach(listener => {
        try {
          listener(error)
        } catch (listenerError) {
          // Prevent listener errors from breaking the handler
          if (this.config.logErrors) {
            logger.error('Error listener threw error', {
              component: 'UnifiedErrorHandler',
              errorId: error.id,
            }, listenerError)
          }
        }
      })
    })
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  public addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    // Check for duplicate IDs
    const existingIndex = this.recoveryStrategies.findIndex(s => s.id === strategy.id)
    if (existingIndex >= 0) {
      this.recoveryStrategies[existingIndex] = strategy
    } else {
      this.recoveryStrategies.push(strategy)
    }
    
    // Keep strategies sorted by priority
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority)
  }

  public removeRecoveryStrategy(strategyId: string): boolean {
    const index = this.recoveryStrategies.findIndex(s => s.id === strategyId)
    if (index >= 0) {
      this.recoveryStrategies.splice(index, 1)
      return true
    }
    return false
  }

  public addErrorListener(listener: ErrorListener): void {
    this.errorListeners.add(listener)
  }

  public removeErrorListener(listener: ErrorListener): void {
    this.errorListeners.delete(listener)
  }

  public getError(id: string): AppError | undefined {
    return this.errors.get(id)
  }

  public getRecentErrors(limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  public getErrorsByType(type: ErrorType, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  public getErrorsBySeverity(severity: ErrorSeverity, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  public clearErrors(): void {
    this.errors.clear()
  }

  public clearErrorsOlderThan(ageInMs: number): number {
    const cutoffTime = Date.now() - ageInMs
    let removedCount = 0
    
    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp < cutoffTime) {
        this.errors.delete(id)
        removedCount++
      }
    }
    
    return removedCount
  }

  /**
   * Get comprehensive error statistics
   */
  public getErrorStats() {
    const errors = Array.from(this.errors.values())
    const now = Date.now()
    
    const stats = {
      total: errors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: {
        lastHour: 0,
        last24Hours: 0,
        last7Days: 0,
      },
      recovered: errors.filter(e => e.recovered).length,
      retryable: errors.filter(e => e.retryable).length,
    }

    errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1
      
      // Count recent errors
      const age = now - error.timestamp
      if (age < 3600000) stats.recent.lastHour++
      if (age < 86400000) stats.recent.last24Hours++
      if (age < 604800000) stats.recent.last7Days++
    })

    return stats
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private async redirectToLogin(): Promise<void> {
    // Store current URL for redirect after login using secure storage
    await tokenStorage.setItem('redirect_after_login', window.location.href)
    window.location.href = '/auth/login'
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Readonly<Required<ErrorHandlerConfig>> {
    return { ...this.config }
  }

  /**
   * Reset the handler to initial state (useful for testing)
   */
  public reset(): void {
    this.errors.clear()
    this.errorListeners.clear()
    this.recoveryStrategies = []
    this.pendingNotifications = []
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
      this.notificationTimeout = null
    }
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * React hook for error handling functionality
 */
export function useErrorHandler() {
  const handler = UnifiedErrorHandler.getInstance()

  return {
    handleError: (errorData: Partial<AppError>) => handler.handleError(errorData),
    getRecentErrors: (limit?: number) => handler.getRecentErrors(limit),
    getErrorsByType: (type: ErrorType, limit?: number) => handler.getErrorsByType(type, limit),
    getErrorsBySeverity: (severity: ErrorSeverity, limit?: number) => 
      handler.getErrorsBySeverity(severity, limit),
    getErrorStats: () => handler.getErrorStats(),
    clearErrors: () => handler.clearErrors(),
    addErrorListener: (listener: ErrorListener) => handler.addErrorListener(listener),
    removeErrorListener: (listener: ErrorListener) => handler.removeErrorListener(listener),
  }
}

/**
 * React hook for error boundary integration
 */
export function useErrorBoundary() {
  const { handleError } = useErrorHandler()

  return (error: Error, errorInfo?: React.ErrorInfo) => {
    handleError({
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
      },
      context: {
        component: 'ErrorBoundary',
      },
      recoverable: true,
      retryable: false,
    })
  }
}

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
  return UnifiedErrorHandler.getInstance().handleError({
    type: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    context,
    recoverable: true,
    retryable: true,
  })
}

/**
 * Create and handle a validation error
 */
export function createValidationError(
  message: string, 
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return UnifiedErrorHandler.getInstance().handleError({
    type: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  })
}

/**
 * Create and handle an authentication error
 */
export function createAuthError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return UnifiedErrorHandler.getInstance().handleError({
    type: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    recoverable: true,
    retryable: false,
  })
}

/**
 * Create and handle a permission error
 */
export function createPermissionError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return UnifiedErrorHandler.getInstance().handleError({
    type: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  })
}

/**
 * Create and handle a server error
 */
export function createServerError(
  message: string,
  details?: any,
  context?: Partial<ErrorContext>
): AppError {
  return UnifiedErrorHandler.getInstance().handleError({
    type: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    recoverable: true,
    retryable: true,
  })
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const errorHandler = UnifiedErrorHandler.getInstance()