/**
 * Error Handling Utilities - Optimized and Consolidated Module
 * 
 * A comprehensive error management system providing:
 * - Unified error classes with rich metadata
 * - Automatic error recovery and retry logic
 * - Rate limiting to prevent error floods
 * - Analytics and reporting capabilities
 * - React integration hooks
 * - Type-safe error handling patterns
 * 
 * @module error-handling
 */

import * as React from 'react';

import { logger } from './logger';

// ============================================================================
// CORE TYPES AND ENUMS
// ============================================================================

/**
 * Categorizes errors by their domain of origin, making it easier to route
 * errors to appropriate handlers and apply domain-specific recovery strategies.
 */
export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  DATA = 'data',
  INTEGRATION = 'integration',
  UNKNOWN = 'unknown'
}

/**
 * Defines error severity levels to prioritize incident response and determine
 * appropriate logging, notification, and recovery strategies.
 */
export enum ErrorSeverity {
  LOW = 'low',           // Minor issues, informational
  MEDIUM = 'medium',     // Degraded functionality
  HIGH = 'high',         // Major functionality impacted
  CRITICAL = 'critical'  // System-wide failure
}

/**
 * Navigation-specific error types for handling routing and navigation failures
 */
export enum NavigationErrorType {
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  NAVIGATION_ITEM_NOT_FOUND = 'NAVIGATION_ITEM_NOT_FOUND',
  INVALID_NAVIGATION_PATH = 'INVALID_NAVIGATION_PATH',
  NAVIGATION_ACCESS_DENIED = 'NAVIGATION_ACCESS_DENIED',
  NAVIGATION_VALIDATION_ERROR = 'NAVIGATION_VALIDATION_ERROR',
  NAVIGATION_CONFIGURATION_ERROR = 'NAVIGATION_CONFIGURATION_ERROR'
}

/**
 * Contextual information that helps with debugging and error correlation.
 * This data travels with the error through the entire handling pipeline.
 */
export interface ErrorContext {
  component?: string;      // Component where error originated
  operation?: string;      // Operation being performed
  userId?: string;         // User context
  sessionId?: string;      // Session identifier
  requestId?: string;      // Request tracking ID
  url?: string;           // Current URL
  userAgent?: string;     // Browser information
  retryCount?: number;    // Number of retry attempts
  [key: string]: unknown; // Additional custom context
}

/**
 * Complete metadata package for error tracking and analysis
 */
export interface ErrorMetadata {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: ErrorContext;
  retryable: boolean;
  recoverable: boolean;
  correlationId?: string;
  cause?: Error | unknown;
  code: string;
}

/**
 * Application error representation used throughout the error handling system
 */
export interface AppError {
  id: string;
  type: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  context?: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
  retryCount?: number;
  recovered?: boolean;
  recoveryStrategy?: string;
}

/**
 * Defines a strategy for automatically recovering from specific error types.
 * Strategies are prioritized and executed in order until one succeeds.
 */
export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  priority: number;
  maxRetries?: number;
}

/**
 * Configuration options for the unified error handler
 */
export interface ErrorHandlerConfig {
  maxErrors?: number;              // Maximum errors to store in memory
  enableGlobalHandlers?: boolean;  // Capture unhandled errors
  enableRecovery?: boolean;        // Attempt automatic recovery
  enableReporting?: boolean;       // Send errors to reporting service
  enableAnalytics?: boolean;       // Track error analytics
  notificationDebounceMs?: number; // Debounce error notifications
  logErrors?: boolean;             // Log errors to console/logger
}

/**
 * Callback function type for error event listeners
 */
export type ErrorListener = (error: AppError) => void;

// Backward compatibility aliases
export type ErrorType = ErrorDomain;
export const ErrorType = ErrorDomain;

// ============================================================================
// BASE ERROR CLASSES
// ============================================================================

/**
 * Base error class that all application errors extend from. Provides rich
 * metadata, automatic logging, and serialization capabilities.
 */
export class BaseError extends Error {
  public readonly errorId: string;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly domain: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly recoverable: boolean;
  public readonly context?: ErrorContext;
  public readonly metadata: ErrorMetadata;
  public readonly cause?: Error | unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      domain?: ErrorDomain;
      severity?: ErrorSeverity;
      retryable?: boolean;
      recoverable?: boolean;
      context?: ErrorContext;
      correlationId?: string;
      cause?: Error | unknown;
    } = {}
  ) {
    super(message);
    
    // Set error name to constructor name for better stack traces
    this.name = this.constructor.name;
    
    // Generate unique error identifier
    this.errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Initialize error properties with sensible defaults
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.domain = options.domain ?? ErrorDomain.SYSTEM;
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.retryable = options.retryable ?? false;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context;
    this.cause = options.cause;
    this.timestamp = new Date();

    // Build comprehensive metadata object
    this.metadata = {
      domain: this.domain,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      retryable: this.retryable,
      recoverable: this.recoverable,
      correlationId: options.correlationId,
      cause: this.cause,
      code: this.code,
    };

    // Capture stack trace for better debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Automatically log the error based on severity
    this.logError();
  }

  /**
   * Logs the error using the appropriate logging level based on severity
   */
  private logError(): void {
    const logData = {
      component: 'BaseError',
      errorId: this.errorId,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      retryable: this.retryable,
      recoverable: this.recoverable,
      context: this.context
    };

    // Route to appropriate log level based on severity
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(this.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(this.message, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(this.message, logData);
        break;
    }
  }

  /**
   * Serializes error to JSON for API responses and logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      domain: this.domain,
      severity: this.severity,
      errorId: this.errorId,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Creates a new error instance with additional context merged in.
   * Useful for adding context as error bubbles up the call stack.
   */
  withContext(additionalContext: Partial<ErrorContext>): this {
    const newContext = { ...this.context, ...additionalContext };
    return new (this.constructor as new (...args: unknown[]) => this)(this.message, {
      ...this,
      context: newContext
    });
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public details?: Record<string, string[]>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: false,
      context
    });
  }
}

/**
 * Network error for connection and HTTP failures
 */
export class NetworkError extends BaseError {
  constructor(message: string = 'Network error', context?: ErrorContext) {
    super(message, {
      statusCode: 0,
      code: 'NETWORK_ERROR',
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoverable: true,
      context
    });
  }
}

/**
 * Authentication error for unauthorized access
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', context?: ErrorContext) {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      recoverable: true,
      context
    });
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource', context?: ErrorContext) {
    super(`${resource} not found`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      domain: ErrorDomain.EXTERNAL_SERVICE,
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoverable: false,
      context
    });
  }
}

/**
 * Cache error for caching system failures
 */
export class CacheError extends BaseError {
  constructor(message: string = 'Cache error', context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'CACHE_ERROR',
      domain: ErrorDomain.CACHE,
      severity: ErrorSeverity.LOW,
      retryable: true,
      recoverable: true,
      context
    });
  }
}

// ============================================================================
// NAVIGATION ERROR CLASSES
// ============================================================================

/**
 * Base class for navigation-related errors
 */
export class NavigationError extends BaseError {
  public readonly type: NavigationErrorType;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: NavigationErrorType = NavigationErrorType.NAVIGATION_ERROR,
    statusCode: number = 400,
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(message, {
      statusCode,
      code: type,
      domain: ErrorDomain.INTEGRATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: false,
      context,
    });
    this.type = type;
    this.details = details;
    this.isOperational = true;
  }
}

export class NavigationItemNotFoundError extends NavigationError {
  constructor(path: string, details?: Record<string, unknown>, context?: ErrorContext) {
    super(
      `Navigation item not found for path: ${path}`,
      NavigationErrorType.NAVIGATION_ITEM_NOT_FOUND,
      404,
      { path, ...details },
      context
    );
  }
}

export class InvalidNavigationPathError extends NavigationError {
  constructor(path: string, reason?: string, details?: Record<string, unknown>, context?: ErrorContext) {
    super(
      reason ?? `Invalid navigation path: ${path}`,
      NavigationErrorType.INVALID_NAVIGATION_PATH,
      400,
      { path, reason, ...details },
      context
    );
  }
}

export class NavigationAccessDeniedError extends NavigationError {
  constructor(
    path: string,
    reason: string,
    requiredRole?: string[],
    details?: Record<string, unknown>,
    context?: ErrorContext
  ) {
    super(
      `Access denied to navigation path: ${path} - ${reason}`,
      NavigationErrorType.NAVIGATION_ACCESS_DENIED,
      403,
      { path, reason, requiredRole, ...details },
      context
    );
  }
}

export class NavigationValidationError extends NavigationError {
  constructor(message: string, field: string, value: unknown, details?: Record<string, unknown>, context?: ErrorContext) {
    super(
      message,
      NavigationErrorType.NAVIGATION_VALIDATION_ERROR,
      422,
      { field, value, ...details },
      context
    );
  }
}

export class NavigationConfigurationError extends NavigationError {
  constructor(message: string, details?: Record<string, unknown>, context?: ErrorContext) {
    super(
      message,
      NavigationErrorType.NAVIGATION_CONFIGURATION_ERROR,
      500,
      details,
      context
    );
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Internal tracking entry for rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstErrorTime: number;
  lastErrorTime: number;
  errors: AppError[];
}

/**
 * Rate limiter prevents error floods by tracking error frequency per domain
 * and component. This protects logging systems and prevents cascading failures.
 */
export class ErrorRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxErrors: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(windowMs: number = 60000, maxErrors: number = 50) {
    this.windowMs = windowMs;
    this.maxErrors = maxErrors;
    this.startCleanup();
  }

  /**
   * Starts periodic cleanup of expired rate limit entries to prevent memory leaks
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.limits.forEach((entry, key) => {
        if (now > entry.resetTime) {
          this.limits.delete(key);
        }
      });
    }, 60000); // Clean up every minute
  }

  /**
   * Checks if an error should be rate limited based on its type and component.
   * Returns whether to limit and how long to wait before retrying.
   */
  shouldLimit(error: AppError): { limited: boolean; retryAfter: number } {
    const key = `${error.type}:${error.context?.component ?? 'unknown'}`;
    const now = Date.now();
    
    let entry = this.limits.get(key);
    
    // Create new entry if none exists or window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
        firstErrorTime: now,
        lastErrorTime: now,
        errors: [],
      };
      this.limits.set(key, entry);
    }

    // Update entry
    entry.count++;
    entry.lastErrorTime = now;
    entry.errors.push(error);

    // Check if limit exceeded
    const limited = entry.count > this.maxErrors;
    const retryAfter = limited ? entry.resetTime - now : 0;

    return { limited, retryAfter };
  }

  /**
   * Clears all rate limit tracking data
   */
  reset(): void {
    this.limits.clear();
  }

  /**
   * Cleanup method to stop intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============================================================================
// ERROR ANALYTICS
// ============================================================================

/**
 * Interface for error analytics providers (e.g., Sentry, DataDog)
 */
export interface ErrorAnalyticsProvider {
  name: string;
  track: (error: AppError) => Promise<void>;
  isEnabled: () => boolean;
}

/**
 * Service for tracking errors across multiple analytics platforms.
 * Supports pluggable providers for flexibility.
 */
export class ErrorAnalyticsService {
  private static instance: ErrorAnalyticsService;
  private providers = new Map<string, ErrorAnalyticsProvider>();
  private isEnabled = false;

  static getInstance(): ErrorAnalyticsService {
    if (!ErrorAnalyticsService.instance) {
      ErrorAnalyticsService.instance = new ErrorAnalyticsService();
    }
    return ErrorAnalyticsService.instance;
  }

  configure(config: { enabled: boolean; sentry?: Record<string, unknown>; datadog?: Record<string, unknown>; custom?: Record<string, unknown> }): void {
    this.isEnabled = config.enabled;

    // Add providers if configured
    if (config.sentry) {
      this.addProvider('sentry', {
        name: 'Sentry',
        track: async (error) => {
          // Sentry tracking would go here
          console.log('Tracking error with Sentry:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.datadog) {
      this.addProvider('datadog', {
        name: 'DataDog',
        track: async (error) => {
          // DataDog tracking would go here
          console.log('Tracking error with DataDog:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.custom) {
      this.addProvider('custom', {
        name: 'Custom Analytics',
        track: async (error) => {
          // Custom analytics tracking would go here
          console.log('Tracking error with Custom Analytics:', error);
        },
        isEnabled: () => true,
      });
    }
  }

  addProvider(name: string, provider: ErrorAnalyticsProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Tracks an error across all enabled analytics providers
   */
  async track(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    const trackPromises = Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .map(provider => 
        provider.track(error).catch(err => {
          logger.error(`Analytics provider ${provider.name} failed`, {
            component: 'ErrorAnalytics',
            error: err,
            errorId: error.id,
          });
        })
      );

    await Promise.allSettled(trackPromises);
  }

  getStats() {
    return {
      enabled: this.isEnabled,
      providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
        name: key,
        enabled: provider.isEnabled(),
      })),
    };
  }
}

// ============================================================================
// ERROR REPORTING
// ============================================================================

/**
 * Service for batching and sending error reports to a backend endpoint.
 * Implements batching to reduce network overhead and periodic flushing.
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private reportingEndpoint: string;
  private batchSize = 10;
  private flushInterval = 30000;
  private pendingReports: AppError[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isEnabled = true;

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private constructor() {
    this.reportingEndpoint = this.getReportingEndpoint();
    this.startPeriodicFlush();
  }

  /**
   * Gets reporting endpoint from environment or uses default
   */
  private getReportingEndpoint(): string {
    if (typeof process !== 'undefined' && process.env?.VITE_ERROR_REPORTING_URL) {
      return process.env.VITE_ERROR_REPORTING_URL;
    }
    return '/api/errors/report';
  }

  configure(options: {
    endpoint?: string;
    batchSize?: number;
    flushInterval?: number;
    enabled?: boolean;
  }): void {
    if (options.endpoint) this.reportingEndpoint = options.endpoint;
    if (options.batchSize !== undefined) this.batchSize = Math.max(1, options.batchSize);
    if (options.flushInterval !== undefined) {
      this.flushInterval = Math.max(5000, options.flushInterval);
      this.restartPeriodicFlush();
    }
    if (options.enabled !== undefined) this.isEnabled = options.enabled;
  }

  /**
   * Adds error to reporting queue and flushes if batch is full or critical
   */
  async reportError(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    // Safety check for browser environment
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    this.pendingReports.push(error);

    // Flush immediately for critical errors or when batch is full
    if (this.pendingReports.length >= this.batchSize || error.severity === ErrorSeverity.CRITICAL) {
      await this.flushReports();
    }
  }

  /**
   * Sends all pending error reports to the backend
   */
  private async flushReports(): Promise<void> {
    if (this.pendingReports.length === 0) return;

    const reports = [...this.pendingReports];
    this.pendingReports = [];

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: reports,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Reporting failed with status: ${response.status}`);
      }

      logger.info('Error reports sent successfully', {
        component: 'ErrorReportingService',
        count: reports.length,
      });
    } catch (reportError) {
      logger.error('Failed to send error reports', {
        component: 'ErrorReportingService',
        error: reportError,
        pendingCount: reports.length,
      });

      // Re-queue reports if we haven't exceeded memory limits
      if (this.pendingReports.length < this.batchSize * 2) {
        this.pendingReports.unshift(...reports);
      }
    }
  }

  /**
   * Sets up periodic flushing of error reports
   */
  private startPeriodicFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flushReports().catch(error => {
          logger.error('Error during periodic flush', {
            component: 'ErrorReportingService',
            error,
          });
        });
      }, this.flushInterval);
    }
  }

  private restartPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.startPeriodicFlush();
  }

  async forceFlush(): Promise<void> {
    await this.flushReports();
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingReports = [];
  }
}

// ============================================================================
// UNIFIED ERROR HANDLER
// ============================================================================

/**
 * Central error handling service that coordinates error capture, recovery,
 * analytics, and reporting. This is the main entry point for error handling.
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private errors = new Map<string, AppError>();
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorListeners = new Set<ErrorListener>();
  private notificationTimeout: NodeJS.Timeout | null = null;
  private pendingNotifications: AppError[] = [];
  private rateLimiter: ErrorRateLimiter;
  private analytics: ErrorAnalyticsService;
  private reporting: ErrorReportingService;

  private config: Required<ErrorHandlerConfig> = {
    maxErrors: 100,
    enableGlobalHandlers: true,
    enableRecovery: true,
    enableReporting: true,
    enableAnalytics: false,
    notificationDebounceMs: 100,
    logErrors: true,
  };

  static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler();
    }
    return UnifiedErrorHandler.instance;
  }

  private constructor() {
    this.rateLimiter = new ErrorRateLimiter(60000, 50);
    this.analytics = ErrorAnalyticsService.getInstance();
    this.reporting = ErrorReportingService.getInstance();
  }

  /**
   * Configures the error handler and sets up global error capture
   */
  configure(config: ErrorHandlerConfig = {}): void {
    this.config = { ...this.config, ...config };

    if (this.config.enableGlobalHandlers) {
      this.setupGlobalErrorHandlers();
    }

    this.setupDefaultRecoveryStrategies();
    this.analytics.configure({ enabled: this.config.enableAnalytics });
    this.reporting.configure({ enabled: this.config.enableReporting });
  }

  /**
   * Sets up global error and promise rejection handlers
   */
  private setupGlobalErrorHandlers(): void {
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
        context: { component: 'GlobalErrorHandler' },
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
        message: event.reason?.message ?? String(event.reason) ?? 'Unhandled promise rejection',
        details: {
          reason: event.reason,
          stack: event.reason?.stack,
          promise: event.promise,
        },
        context: { component: 'GlobalErrorHandler' },
        recoverable: false,
        retryable: false,
      });
    });
  }

  /**
   * Determines error severity from the error object
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
   * Sets up default recovery strategies for common error scenarios
   */
  private setupDefaultRecoveryStrategies(): void {
    // Strategy 1: Network retry with exponential backoff
    this.addRecoveryStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      canRecover: (error) =>
        error.type === ErrorDomain.NETWORK &&
        error.retryable &&
        (error.retryCount ?? 0) < 3,
      recover: async (error) => {
        const retryCount = (error.retryCount ?? 0) + 1;
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        error.retryCount = retryCount;
        return false; // Return false to indicate retry should happen
      },
      priority: 1,
      maxRetries: 3,
    });

    // Strategy 2: Authentication token refresh
    this.addRecoveryStrategy({
      id: 'auth-refresh',
      name: 'Authentication Refresh',
      description: 'Attempt to refresh authentication tokens',
      canRecover: (error) =>
        error.type === ErrorDomain.AUTHENTICATION &&
        error.recoverable,
      recover: async (error) => {
        try {
          const { tokenManager: secureTokenManager } = await import('./storage');
          logger.info('Attempting authentication refresh', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
          });
          return await secureTokenManager.refreshToken();
        } catch (refreshError) {
          logger.error('Authentication refresh failed', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
          });
          return false;
        }
      },
      priority: 2,
    });

    // Strategy 3: Cache clear and reload (last resort for critical errors)
    this.addRecoveryStrategy({
      id: 'cache-clear',
      name: 'Cache Clear and Reload',
      description: 'Clear application cache and reload the page',
      canRecover: (error) =>
        error.severity === ErrorSeverity.CRITICAL &&
        error.recoverable,
      recover: async (error) => {
        try {
          // Clear browser caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Clear non-critical localStorage items
          const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences'];
          Object.keys(localStorage).forEach(key => {
            if (!criticalKeys.includes(key)) {
              localStorage.removeItem(key);
            }
          });

          logger.info('Cache cleared, reloading application', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
          });

          // Reload page after short delay
          setTimeout(() => window.location.reload(), 500);
          return true;
        } catch (clearError) {
          logger.error('Cache clear failed', {
            component: 'UnifiedErrorHandler',
          }, clearError);
          return false;
        }
      },
      priority: 3,
    });
  }

  /**
   * Main entry point for handling errors. Processes error, attempts recovery,
   * sends to analytics and reporting, and notifies listeners.
   */
  handleError(errorData: Partial<AppError>): AppError {
    // Create a complete error object with defaults
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
    };

    // Check rate limiting to prevent error floods
    const rateLimitResult = this.rateLimiter.shouldLimit(error);
    if (rateLimitResult.limited) {
      logger.warn('Error rate limited', {
        component: 'UnifiedErrorHandler',
        errorId: error.id,
        retryAfter: rateLimitResult.retryAfter,
      });
      return error;
    }

    // Store error in memory for tracking
    this.storeError(error);

    // Log if enabled
    if (this.config.logErrors) {
      this.logError(error);
    }

    // Send to analytics and reporting services asynchronously
    this.analytics.track(error).catch(() => {});
    if (this.shouldReportError(error)) {
      this.reporting.reportError(error).catch(() => {});
    }

    // Queue notification for listeners
    this.queueNotification(error);

    // Attempt automatic recovery if enabled
    if (this.config.enableRecovery && error.recoverable) {
      this.attemptRecovery(error).catch(() => {});
    }

    return error;
  }

  /**
   * Determines whether an error should be sent to the reporting service
   * based on its severity and type
   */
  private shouldReportError(error: AppError): boolean {
    if (error.severity === ErrorSeverity.LOW) return false;
    if (error.severity === ErrorSeverity.CRITICAL) return true;
    if (error.type === ErrorDomain.NETWORK || error.type === ErrorDomain.EXTERNAL_SERVICE) return true;
    if (error.type === ErrorDomain.AUTHENTICATION) return true;
    if (error.type === ErrorDomain.SYSTEM && !error.recoverable) return true;
    return false;
  }

  /**
   * Attempts to recover from an error using registered recovery strategies.
   * Strategies are tried in priority order until one succeeds.
   */
  async attemptRecovery(error: AppError): Promise<boolean> {
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.priority - b.priority);

    if (applicableStrategies.length === 0) {
      return false;
    }

    for (const strategy of applicableStrategies) {
      try {
        logger.info('Attempting error recovery', {
          component: 'UnifiedErrorHandler',
          errorId: error.id,
          strategy: strategy.name,
        });

        const recovered = await strategy.recover(error);

        if (recovered) {
          error.recovered = true;
          error.recoveryStrategy = strategy.id;

          logger.info('Error recovery successful', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
            strategy: strategy.name,
          });

          return true;
        }
      } catch (recoveryError) {
        logger.error('Recovery strategy threw error', {
          component: 'UnifiedErrorHandler',
          errorId: error.id,
          strategy: strategy.name,
        }, recoveryError);
      }
    }

    return false;
  }

  /**
   * Stores error in memory with size limit enforcement
   */
  private storeError(error: AppError): void {
    this.errors.set(error.id, error);

    // Remove oldest error if we've exceeded the limit
    if (this.errors.size > this.config.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      if (oldestKey) {
        this.errors.delete(oldestKey);
      }
    }
  }

  /**
   * Generates a unique identifier for each error
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Logs error with appropriate severity level
   */
  private logError(error: AppError): void {
    const logData = {
      component: 'UnifiedErrorHandler',
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(error.message, logData, error.details);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logData, error.details);
        break;
      case ErrorSeverity.LOW:
        logger.info(error.message, logData, error.details);
        break;
    }
  }

  /**
   * Queues an error notification with debouncing to avoid overwhelming listeners
   */
  private queueNotification(error: AppError): void {
    this.pendingNotifications.push(error);

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = setTimeout(() => {
      this.flushNotifications();
    }, this.config.notificationDebounceMs);
  }

  /**
   * Sends all pending notifications to registered listeners
   */
  private flushNotifications(): void {
    const notifications = [...this.pendingNotifications];
    this.pendingNotifications = [];

    notifications.forEach(error => {
      this.errorListeners.forEach(listener => {
        try {
          listener(error);
        } catch (listenerError) {
          logger.error('Error listener threw error', {
            component: 'UnifiedErrorHandler',
            errorId: error.id,
          }, listenerError);
        }
      });
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Registers a new recovery strategy or updates an existing one
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    const existingIndex = this.recoveryStrategies.findIndex(s => s.id === strategy.id);
    if (existingIndex >= 0) {
      this.recoveryStrategies[existingIndex] = strategy;
    } else {
      this.recoveryStrategies.push(strategy);
    }
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Registers a listener to be notified when errors occur
   */
  addErrorListener(listener: ErrorListener): void {
    this.errorListeners.add(listener);
  }

  /**
   * Removes a previously registered error listener
   */
  removeErrorListener(listener: ErrorListener): void {
    this.errorListeners.delete(listener);
  }

  /**
   * Retrieves the most recent errors up to the specified limit
   */
  getRecentErrors(limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Retrieves errors filtered by domain type
   */
  getErrorsByType(type: ErrorDomain, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Retrieves errors filtered by severity level
   */
  getErrorsBySeverity(severity: ErrorSeverity, limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .filter(error => error.severity === severity)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clears all stored errors from memory
   */
  clearErrors(): void {
    this.errors.clear();
  }

  /**
   * Clears stored errors older than the specified age (ms)
   * Returns the number of removed entries
   */
  clearErrorsOlderThan(ageMs: number): number {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [id, err] of this.errors) {
      if (now - err.timestamp > ageMs) {
        keysToRemove.push(id);
      }
    }

    keysToRemove.forEach(k => this.errors.delete(k));
    return keysToRemove.length;
  }

  /**
   * Generates comprehensive statistics about tracked errors
   */
  getErrorStats() {
    const errors = Array.from(this.errors.values());
    const now = Date.now();

    const stats = {
      total: errors.length,
      byType: {} as Record<ErrorDomain, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: {
        lastHour: 0,
        last24Hours: 0,
        last7Days: 0,
      },
      recovered: errors.filter(e => e.recovered).length,
      retryable: errors.filter(e => e.retryable).length,
    };

    errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] ?? 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] ?? 0) + 1;

      const age = now - error.timestamp;
      if (age < 3600000) stats.recent.lastHour++;
      if (age < 86400000) stats.recent.last24Hours++;
      if (age < 604800000) stats.recent.last7Days++;
    });

    return stats;
  }

  /**
   * Resets the error handler to its initial state
   */
  reset(): void {
    this.errors.clear();
    this.errorListeners.clear();
    this.recoveryStrategies = [];
    this.pendingNotifications = [];
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  /**
   * Cleanup method to release resources
   */
  destroy(): void {
    this.reset();
    this.rateLimiter.destroy();
    this.reporting.destroy();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wraps an async operation in error handling, returning a result object
 * that indicates success or failure without throwing.
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<{ success: true; data: T } | { success: false; error: BaseError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const baseError = error instanceof BaseError
      ? error.withContext(context ?? {})
      : new BaseError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.MEDIUM,
          context,
          cause: error
        }
      );

    return { success: false, error: baseError };
  }
}

/**
 * Retries an async operation with exponential backoff on failure.
 * This is useful for transient failures like network issues.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    context?: ErrorContext;
    shouldRetry?: (error: BaseError) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    context = {},
    shouldRetry = (error) => error.retryable
  } = options;

  let lastError: BaseError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const baseError = error instanceof BaseError
        ? error
        : new BaseError(
          error instanceof Error ? error.message : 'Unknown error',
          {
            domain: ErrorDomain.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            context: { ...context, retryCount: attempt },
            cause: error
          }
        );

      lastError = baseError;

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt === maxRetries || !shouldRetry(baseError)) {
        throw baseError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Converts any error type to a BaseError with proper metadata
 */
export function createBaseError(
  error: unknown,
  defaultMessage = 'An error occurred',
  context?: ErrorContext
): BaseError {
  if (error instanceof BaseError) {
    return context ? error.withContext(context) : error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message, {
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause: error
    });
  }

  return new BaseError(
    typeof error === 'string' ? error : defaultMessage,
    {
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      context,
      cause: error
    }
  );
}

/**
 * Factory function for creating errors with specific properties
 */
export function createError(
  code: string,
  message: string,
  options: {
    statusCode?: number;
    domain?: ErrorDomain;
    severity?: ErrorSeverity;
    retryable?: boolean;
    recoverable?: boolean;
    context?: ErrorContext;
    cause?: Error | unknown;
  } = {}
): BaseError {
  return new BaseError(message, {
    code,
    ...options
  });
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * React hook that provides access to error handling functionality.
 * This allows components to handle errors, query error state, and
 * listen for error events.
 */
export function useErrorHandler() {
  const handler = UnifiedErrorHandler.getInstance();

  return {
    handleError: (errorData: Partial<AppError>) => handler.handleError(errorData),
    getRecentErrors: (limit?: number) => handler.getRecentErrors(limit),
    getErrorsByType: (type: ErrorDomain, limit?: number) => handler.getErrorsByType(type, limit),
    getErrorsBySeverity: (severity: ErrorSeverity, limit?: number) =>
      handler.getErrorsBySeverity(severity, limit),
    getErrorStats: () => handler.getErrorStats(),
    clearErrors: () => handler.clearErrors(),
    addErrorListener: (listener: ErrorListener) => handler.addErrorListener(listener),
    removeErrorListener: (listener: ErrorListener) => handler.removeErrorListener(listener),
  };
}

/**
 * React hook for integrating with React error boundaries.
 * Returns a callback that formats React errors for the error handler.
 */
export function useErrorBoundary() {
  const { handleError } = useErrorHandler();

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
    });
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates and handles a network error with appropriate defaults
 */
export function createNetworkError(
  message: string,
  details?: Record<string, unknown>,
  context?: Partial<ErrorContext>
): AppError {
  return errorHandler.handleError({
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
 * Creates and handles a validation error with appropriate defaults
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>,
  context?: Partial<ErrorContext>
): AppError {
  return errorHandler.handleError({
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
 * Creates and handles an authentication error with appropriate defaults
 */
export function createAuthError(
  message: string,
  details?: Record<string, unknown>,
  context?: Partial<ErrorContext>
): AppError {
  return errorHandler.handleError({
    type: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    recoverable: true,
    retryable: false,
  });
}

/**
 * Creates and handles a permission/authorization error
 */
export function createPermissionError(
  message: string,
  details?: Record<string, unknown>,
  context?: Partial<ErrorContext>
): AppError {
  return errorHandler.handleError({
    type: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });
}

/**
 * Creates and handles a server/external service error
 */
export function createServerError(
  message: string,
  details?: Record<string, unknown>,
  context?: Partial<ErrorContext>
): AppError {
  return errorHandler.handleError({
    type: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.CRITICAL,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });
}

/**
 * Reports a custom error with full control over all properties.
 * Useful for application-specific error scenarios.
 */
export function reportCustomError(
  message: string,
  type: ErrorDomain = ErrorDomain.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: Record<string, unknown>,
  context?: Record<string, unknown>
): void {
  const error = errorHandler.handleError({
    type,
    severity,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });

  errorReporting.reportError(error).catch(reportError => {
    logger.error('Failed to report custom error', {
      component: 'ErrorReporting',
      error: reportError,
      customError: error,
    });
  });
}

// ============================================================================
// CONSOLIDATED ERROR UTILITIES
// ============================================================================

// ============================================================================
// EXTENSION ERROR SUPPRESSION
// ============================================================================

/**
 * Suppresses errors caused by browser extensions
 */
export class ExtensionErrorSuppressor {
  private static instance: ExtensionErrorSuppressor;
  private suppressedPatterns: RegExp[] = [
    /chrome-extension:/,
    /moz-extension:/,
    /message channel closed before a response was received/,
    /Extension context invalidated/,
    /Could not establish connection/,
    /Failed to fetch.*chrome-extension/,
    /Request scheme 'chrome-extension' is unsupported/,
    /Denying load of chrome-extension:/,
    /Unregistered service worker/,
    /Resources must be listed in the web_accessible_resources/,
    /Unchecked runtime\.lastError/,
  ];

  private constructor() {
    this.init();
  }

  static getInstance(): ExtensionErrorSuppressor {
    if (!ExtensionErrorSuppressor.instance) {
      ExtensionErrorSuppressor.instance = new ExtensionErrorSuppressor();
    }
    return ExtensionErrorSuppressor.instance;
  }

  private init(): void {
    window.addEventListener('error', (event) => {
      if (this.shouldSuppress(event.message || '')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason?.toString() || '';
      if (this.shouldSuppress(message)) {
        event.preventDefault();
        return false;
      }
    });
  }

  private shouldSuppress(message: string): boolean {
    return this.suppressedPatterns.some(pattern => pattern.test(message));
  }

  addPattern(pattern: RegExp): void {
    this.suppressedPatterns.push(pattern);
  }
}

// ============================================================================
// EMERGENCY TRIAGE
// ============================================================================

export interface ComponentError {
  component: string;
  errorType: 'infinite-render' | 'race-condition' | 'memory-leak' | 'dependency-issue' | 'state-mutation' | 'event-listener-leak' | 'unknown';
  message: string;
  stack?: string;
  timestamp: number;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  lineNumber?: number;
}

export interface TriageReport {
  totalErrors: number;
  errorsByComponent: Map<string, ComponentError[]>;
  errorsByType: Map<string, ComponentError[]>;
  topOffenders: ComponentError[];
  criticalIssues: ComponentError[];
  baseline: {
    startTime: number;
    endTime: number;
    duration: number;
    errorRate: number;
  };
}

/**
 * Emergency triage tool for diagnosing critical frontend issues
 */
export class EmergencyTriageTool {
  private errors: ComponentError[] = [];
  private errorCounts: Map<string, number> = new Map();
  private renderCounts: Map<string, number> = new Map();
  private lastRenderTime: Map<string, number> = new Map();
  private startTime: number = Date.now();

  trackError(error: ComponentError): void {
    this.errors.push(error);
    const key = `${error.component}_${error.errorType}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  generateReport(): TriageReport {
    const errorsByComponent = new Map<string, ComponentError[]>();
    const errorsByType = new Map<string, ComponentError[]>();

    for (const error of this.errors) {
      if (!errorsByComponent.has(error.component)) {
        errorsByComponent.set(error.component, []);
      }
      errorsByComponent.get(error.component)!.push(error);

      if (!errorsByType.has(error.errorType)) {
        errorsByType.set(error.errorType, []);
      }
      errorsByType.get(error.errorType)!.push(error);
    }

    const topOffenders = this.errors
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const criticalIssues = this.errors
      .filter(error => error.severity === 'critical')
      .sort((a, b) => b.timestamp - a.timestamp);

    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const errorRate = (this.errors.length / duration) * 60000; // errors per minute

    return {
      totalErrors: this.errors.length,
      errorsByComponent,
      errorsByType,
      topOffenders,
      criticalIssues,
      baseline: {
        startTime: this.startTime,
        endTime,
        duration,
        errorRate
      }
    };
  }

  reset(): void {
    this.errors = [];
    this.errorCounts.clear();
    this.renderCounts.clear();
    this.lastRenderTime.clear();
    this.startTime = Date.now();
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Enhanced configuration interface for initializing the error handling system
 */
export interface ErrorIntegrationConfig {
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  enableAnalytics?: boolean;
  enableRateLimiting?: boolean;
  enableExtensionSuppression?: boolean;
  enableEmergencyTriage?: boolean;
  reportingEndpoint?: string;
  maxErrors?: number;
  notificationDebounceMs?: number;
  logErrors?: boolean;
  rateLimiting?: {
    windowMs?: number;
    maxErrors?: number;
  };
}

/**
 * Initializes the error handling system with the provided configuration.
 * This should be called once during application startup.
 */
export function initializeErrorHandling(config: ErrorIntegrationConfig = {}): void {
  const defaultConfig = {
    enableGlobalHandlers: true,
    enableRecovery: true,
    enableReporting: true,
    enableAnalytics: false,
    maxErrors: 100,
    notificationDebounceMs: 100,
    logErrors: true,
  };

  const finalConfig = { ...defaultConfig, ...config };

  errorHandler.configure(finalConfig);

  logger.info('Error handling system initialized', {
    component: 'ErrorIntegration',
    config: finalConfig,
  });
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const errorHandler = UnifiedErrorHandler.getInstance();
export const errorAnalytics = ErrorAnalyticsService.getInstance();
export const errorReporting = ErrorReportingService.getInstance();

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-initialize with default settings when running in browser
if (typeof window !== 'undefined') {
  initializeErrorHandling();

  // Flush pending error reports before page unload
  window.addEventListener('beforeunload', () => {
    errorReporting.forceFlush().catch(error => {
      console.error('Failed to flush error reports on unload:', error);
    });
  });
}

// ============================================================================
// ANALYTICS SETUP FUNCTIONS
// ============================================================================

/**
 * Setup Sentry analytics provider
 */
export async function setupSentry(config: { dsn: string; environment?: string }): Promise<void> {
  try {
    // In a real implementation, this would initialize Sentry SDK
    // import * as Sentry from '@sentry/browser';
    // Sentry.init({ dsn: config.dsn, environment: config.environment });

    console.log('📊 Sentry analytics configured:', config);
  } catch (error) {
    console.error('Failed to setup Sentry:', error);
    throw error;
  }
}

/**
 * Setup DataDog analytics provider
 */
export async function setupDataDog(config: { applicationId: string; clientToken: string; site?: string }): Promise<void> {
  try {
    // In a real implementation, this would initialize DataDog SDK
    // import { datadogRum } from '@datadog/browser-rum';
    // datadogRum.init({ applicationId: config.applicationId, clientToken: config.clientToken, site: config.site });

    console.log('📊 DataDog analytics configured:', config);
  } catch (error) {
    console.error('Failed to setup DataDog:', error);
    throw error;
  }
}

/**
 * Setup custom analytics provider
 */
export async function setupCustomAnalytics(config: { endpoint: string; apiKey?: string }): Promise<void> {
  try {
    // In a real implementation, this would setup custom analytics
    console.log('📊 Custom analytics configured:', config);
  } catch (error) {
    console.error('Failed to setup custom analytics:', error);
    throw error;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Error Classes
  BaseError,
  ValidationError,
  NetworkError,
  UnauthorizedError,
  NotFoundError,
  CacheError,
  NavigationError,
  NavigationItemNotFoundError,
  InvalidNavigationPathError,
  NavigationAccessDeniedError,
  NavigationValidationError,
  NavigationConfigurationError,

  // Service Classes
  ErrorRateLimiter,
  ErrorAnalyticsService,
  ErrorReportingService,
  UnifiedErrorHandler,

  // Singleton Instances
  errorHandler,
  errorAnalytics,
  errorReporting,

  // Utility Functions
  safeAsync,
  withRetry,
  createError,
  createBaseError,
  createNetworkError,
  createValidationError,
  createAuthError,
  reportCustomError,
  initializeErrorHandling,

  // Analytics Setup Functions
  setupSentry,
  setupDataDog,
  setupCustomAnalytics,

  // React Hooks
  useErrorHandler,
  useErrorBoundary,

  // Enums
  ErrorDomain,
  ErrorSeverity,
  NavigationErrorType,
};