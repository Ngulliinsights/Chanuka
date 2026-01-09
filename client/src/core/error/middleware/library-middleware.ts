/**
 * Library Services Error Middleware
 *
 * Handles service layer error patterns with retry logic, circuit breaker
 * implementation, and service-specific error recovery strategies.
 */

import { AppError, RecoveryStrategy } from '../types';
import {
  ErrorDomain,
  ErrorSeverity,
  ErrorReporter,
  ErrorTransformer,
  RecoveryAction,
  coreErrorHandler,
  ErrorAnalyticsService,
} from '../index';

/**
 * Library service error codes
 */
export enum LibraryErrorCode {
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
  SERVICE_RATE_LIMITED = 'SERVICE_RATE_LIMITED',
  SERVICE_CIRCUIT_OPEN = 'SERVICE_CIRCUIT_OPEN',
  SERVICE_DEPENDENCY_ERROR = 'SERVICE_DEPENDENCY_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  NETWORK_PARTITION = 'NETWORK_PARTITION',
  SERVICE_DEGRADATION = 'SERVICE_DEGRADATION',
  LOAD_BALANCER_ERROR = 'LOAD_BALANCER_ERROR',
}

/**
 * Service error context
 */
interface ServiceErrorContext {
  serviceName?: string;
  operation?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  responseTime?: number;
  retryCount?: number;
  circuitBreakerState?: 'closed' | 'open' | 'half-open';
  cacheHit?: boolean;
  fallbackUsed?: boolean;
  serviceVersion?: string;
  instanceId?: string;
  loadMetrics?: {
    activeConnections?: number;
    queueLength?: number;
    errorRate?: number;
  };
  [key: string]: unknown;
}

/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  successThreshold: number;
}

/**
 * Library middleware configuration
 */
interface LibraryMiddlewareConfig {
  enableCircuitBreaker: boolean;
  enableRetryLogic: boolean;
  enableCaching: boolean;
  enableLoadBalancing: boolean;
  defaultRetryAttempts: number;
  defaultTimeout: number;
  circuitBreakerConfig: CircuitBreakerConfig;
  enableServiceDegradation: boolean;
  enableFallbackServices: boolean;
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new AppError(
          `Circuit breaker is OPEN for service: ${serviceName}`,
          LibraryErrorCode.SERVICE_CIRCUIT_OPEN,
          ErrorDomain.NETWORK,
          ErrorSeverity.HIGH,
          {
            context: { serviceName, circuitBreakerState: this.state },
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successes = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Service Retry Handler
 */
class ServiceRetryHandler {
  private retryAttempts = new Map<string, number>();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    serviceName: string,
    maxRetries: number,
    backoffStrategy: (attempt: number) => number = (attempt) => Math.pow(2, attempt) * 1000
  ): Promise<T> {
    const operationKey = `${serviceName}:${Date.now()}`;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.retryAttempts.set(operationKey, attempt);
        const result = await operation();
        this.retryAttempts.delete(operationKey);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && this.shouldRetry(error as AppError)) {
          const delay = backoffStrategy(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        break;
      }
    }

    this.retryAttempts.delete(operationKey);
    throw lastError!;
  }

  private shouldRetry(error: AppError): boolean {
    // Don't retry certain types of errors
    const nonRetryableCodes = [
      LibraryErrorCode.SERVICE_CIRCUIT_OPEN,
      LibraryErrorCode.SERVICE_RATE_LIMITED,
    ];

    return !nonRetryableCodes.includes(error.code as LibraryErrorCode);
  }

  getRetryMetrics() {
    return {
      activeRetries: this.retryAttempts.size,
      retryAttempts: Object.fromEntries(this.retryAttempts),
    };
  }
}

/**
 * Library Services Error Middleware
 *
 * Handles service layer errors with circuit breaker, retry logic, and
 * service-specific recovery strategies.
 */
export class LibraryErrorMiddleware implements ErrorReporter, ErrorTransformer {
  private config: LibraryMiddlewareConfig;
  private analyticsService: ErrorAnalyticsService;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryHandler = new ServiceRetryHandler();
  private serviceMetrics = new Map<string, ServiceErrorContext>();
  private fallbackServices = new Map<string, () => Promise<unknown>>();

  constructor(config: Partial<LibraryMiddlewareConfig> = {}) {
    this.config = {
      enableCircuitBreaker: true,
      enableRetryLogic: true,
      enableCaching: true,
      enableLoadBalancing: false,
      defaultRetryAttempts: 3,
      defaultTimeout: 30000,
      circuitBreakerConfig: {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 60000,
        successThreshold: 3,
      },
      enableServiceDegradation: true,
      enableFallbackServices: true,
      ...config,
    };

    this.analyticsService = ErrorAnalyticsService.getInstance();

    // Register with core error handler
    coreErrorHandler.addReporter(this);
  }

  /**
   * Execute service operation with middleware protection
   */
  async executeServiceOperation<T>(
    serviceName: string,
    operation: () => Promise<T>,
    options: {
      retryAttempts?: number;
      timeout?: number;
      useCircuitBreaker?: boolean;
      useFallback?: boolean;
    } = {}
  ): Promise<T> {
    const {
      retryAttempts = this.config.defaultRetryAttempts,
      timeout = this.config.defaultTimeout,
      useCircuitBreaker = this.config.enableCircuitBreaker,
      useFallback = this.config.enableFallbackServices,
    } = options;

    const startTime = Date.now();

    try {
      // Apply circuit breaker
      if (useCircuitBreaker) {
        const circuitBreaker = this.getCircuitBreaker(serviceName);
        return await circuitBreaker.execute(async () => {
          // Apply timeout
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Service timeout')), timeout)
          );

          // Apply retry logic
          if (this.config.enableRetryLogic) {
            return await this.retryHandler.executeWithRetry(
              () => Promise.race([operation(), timeoutPromise]),
              serviceName,
              retryAttempts
            );
          }

          return await Promise.race([operation(), timeoutPromise]);
        }, serviceName);
      }

      // Execute without circuit breaker
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Service timeout')), timeout)
      );

      if (this.config.enableRetryLogic) {
        return await this.retryHandler.executeWithRetry(
          () => Promise.race([operation(), timeoutPromise]),
          serviceName,
          retryAttempts
        );
      }

      return await Promise.race([operation(), timeoutPromise]);

    } catch (error) {
      const serviceError = this.createServiceError(error as Error, serviceName, {
        responseTime: Date.now() - startTime,
        operation: operation.name,
      });

      // Try fallback service
      if (useFallback && this.fallbackServices.has(serviceName)) {
        try {
          const fallbackResult = await this.fallbackServices.get(serviceName)!();
          if (serviceError.context) {
            serviceError.context.fallbackUsed = true;
          }
          return fallbackResult as T;
        } catch (fallbackError) {
          // Fallback also failed, report both errors
          await coreErrorHandler.handleError(serviceError);
          throw fallbackError;
        }
      }

      await coreErrorHandler.handleError(serviceError);
      throw serviceError;
    }
  }

  /**
   * Report service errors with enhanced context
   */
  async report(error: AppError): Promise<void> {
    if (!this.isServiceError(error)) {
      return;
    }

    const serviceContext = this.extractServiceContext(error);

    // Update service metrics
    this.updateServiceMetrics(serviceContext);

    // Monitor service health
    await this.monitorServiceHealth(error, serviceContext);

    // Detect service degradation
    if (this.config.enableServiceDegradation) {
      await this.detectServiceDegradation(error, serviceContext);
    }

    // Analytics tracking
    await this.trackServiceAnalytics(error, serviceContext);
  }

  /**
   * Transform service errors with recovery strategies
   */
  transform(error: AppError): AppError {
    if (!this.isServiceError(error)) {
      return error;
    }

    const serviceContext = this.extractServiceContext(error);
    const recoveryStrategies = this.getServiceRecoveryStrategies(error, serviceContext);

    return new AppError(
      error.message,
      error.code,
      error.type,
      error.severity,
      {
        ...error,
        context: {
          ...error.context,
          ...serviceContext,
        },
        recoveryStrategies,
        recoverable: this.isRecoverableServiceError(error),
        retryable: this.isRetryableServiceError(error),
      }
    );
  }

  /**
   * Check if error is service-related
   */
  private isServiceError(error: AppError): boolean {
    return (
      error.type === ErrorDomain.NETWORK ||
      Object.values(LibraryErrorCode).includes(error.code as LibraryErrorCode) ||
      error.message.toLowerCase().includes('service') ||
      error.message.toLowerCase().includes('api') ||
      error.context?.serviceName
    );
  }

  /**
   * Extract service-specific context from error
   */
  private extractServiceContext(error: AppError): ServiceErrorContext {
    const context: ServiceErrorContext = {
      serviceName: error.context?.serviceName as string,
      operation: error.context?.operation as string,
      endpoint: error.context?.endpoint as string,
      method: error.context?.method as string,
      requestId: error.context?.requestId as string,
      responseTime: error.context?.responseTime as number,
      retryCount: error.context?.retryCount as number,
      circuitBreakerState: error.context?.circuitBreakerState as ServiceErrorContext['circuitBreakerState'],
      cacheHit: error.context?.cacheHit as boolean,
      fallbackUsed: error.context?.fallbackUsed as boolean,
      serviceVersion: error.context?.serviceVersion as string,
      instanceId: error.context?.instanceId as string,
      loadMetrics: error.context?.loadMetrics as ServiceErrorContext['loadMetrics'],
    };

    return context;
  }

  /**
   * Create service-specific AppError
   */
  private createServiceError(
    error: Error,
    serviceName: string,
    additionalContext: Partial<ServiceErrorContext>
  ): AppError {
    const errorCode = this.determineServiceErrorCode(error);
    const severity = this.determineServiceErrorSeverity(errorCode);

    return new AppError(
      error.message,
      errorCode,
      ErrorDomain.NETWORK,
      severity,
      {
        context: {
          serviceName,
          ...additionalContext,
        },
        cause: error,
        recoverable: true,
        retryable: this.isRetryableServiceErrorCode(errorCode),
      }
    );
  }

  /**
   * Determine service error code based on error type
   */
  private determineServiceErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return LibraryErrorCode.SERVICE_TIMEOUT;
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return LibraryErrorCode.SERVICE_RATE_LIMITED;
    }

    if (message.includes('circuit') && message.includes('open')) {
      return LibraryErrorCode.SERVICE_CIRCUIT_OPEN;
    }

    if (message.includes('unavailable') || message.includes('503')) {
      return LibraryErrorCode.SERVICE_UNAVAILABLE;
    }

    if (message.includes('cache')) {
      return LibraryErrorCode.CACHE_ERROR;
    }

    return LibraryErrorCode.SERVICE_DEPENDENCY_ERROR;
  }

  /**
   * Determine error severity based on service context
   */
  private determineServiceErrorSeverity(errorCode: string): ErrorSeverity {
    switch (errorCode) {
      case LibraryErrorCode.SERVICE_CIRCUIT_OPEN:
      case LibraryErrorCode.SERVICE_UNAVAILABLE:
        return ErrorSeverity.CRITICAL;
      case LibraryErrorCode.SERVICE_TIMEOUT:
      case LibraryErrorCode.SERVICE_RATE_LIMITED:
        return ErrorSeverity.HIGH;
      case LibraryErrorCode.CACHE_ERROR:
      case LibraryErrorCode.SERVICE_DEPENDENCY_ERROR:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Check if service error code is retryable
   */
  private isRetryableServiceErrorCode(errorCode: string): boolean {
    const nonRetryableCodes = [
      LibraryErrorCode.SERVICE_CIRCUIT_OPEN,
      LibraryErrorCode.SERVICE_RATE_LIMITED,
    ];

    return !nonRetryableCodes.includes(errorCode as LibraryErrorCode);
  }

  /**
   * Get recovery strategies for service errors
   */
  private getServiceRecoveryStrategies(
    error: AppError,
    context: ServiceErrorContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (error.code) {
      case LibraryErrorCode.SERVICE_TIMEOUT:
        strategies.push({
          id: 'service-retry-timeout',
          type: RecoveryAction.RETRY,
          name: 'Retry with Timeout',
          description: 'Retry the service call with increased timeout',
          automatic: true,
          priority: 1,
          maxRetries: 2,
          asyncAction: async () => {
            // Implementation would retry with longer timeout
            return true; // Placeholder
          },
        });
        break;

      case LibraryErrorCode.SERVICE_RATE_LIMITED:
        strategies.push({
          id: 'service-backoff-retry',
          type: RecoveryAction.RETRY,
          name: 'Exponential Backoff Retry',
          description: 'Retry with exponential backoff after rate limit',
          automatic: true,
          priority: 1,
          maxRetries: 3,
        });
        break;

      case LibraryErrorCode.CACHE_ERROR:
        strategies.push({
          id: 'service-cache-fallback',
          type: RecoveryAction.CACHE_CLEAR,
          name: 'Cache Fallback',
          description: 'Use cached data as fallback',
          automatic: true,
          priority: 1,
        });
        break;

      case LibraryErrorCode.SERVICE_UNAVAILABLE:
        strategies.push({
          id: 'service-degradation-mode',
          type: RecoveryAction.RELOAD,
          name: 'Service Degradation',
          description: 'Enable degraded service mode',
          automatic: false,
          priority: 2,
        });
        break;
    }

    return strategies;
  }

  /**
   * Check if service error is recoverable
   */
  private isRecoverableServiceError(error: AppError): boolean {
    const recoverableCodes = [
      LibraryErrorCode.SERVICE_TIMEOUT,
      LibraryErrorCode.SERVICE_RATE_LIMITED,
      LibraryErrorCode.CACHE_ERROR,
      LibraryErrorCode.SERVICE_DEPENDENCY_ERROR,
    ];

    return recoverableCodes.includes(error.code as LibraryErrorCode);
  }

  /**
   * Check if service error is retryable
   */
  private isRetryableServiceError(error: AppError): boolean {
    return this.isRetryableServiceErrorCode(error.code);
  }

  /**
   * Get or create circuit breaker for service
   */
  private getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(this.config.circuitBreakerConfig));
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Update service metrics
   */
  private updateServiceMetrics(context: ServiceErrorContext): void {
    if (!context.serviceName) return;

    const existing = this.serviceMetrics.get(context.serviceName) || {};
    this.serviceMetrics.set(context.serviceName, {
      ...existing,
      ...context,
    });
  }

  /**
   * Monitor service health
   */
  private async monitorServiceHealth(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    if (!context.serviceName) return;

    // Check circuit breaker state
    const circuitBreaker = this.circuitBreakers.get(context.serviceName);
    if (circuitBreaker && circuitBreaker.getState() === CircuitBreakerState.OPEN) {
      const circuitError = new AppError(
        `Service circuit breaker opened for: ${context.serviceName}`,
        LibraryErrorCode.SERVICE_CIRCUIT_OPEN,
        ErrorDomain.NETWORK,
        ErrorSeverity.CRITICAL,
        {
          context: {
            ...context,
            circuitBreakerState: circuitBreaker.getState(),
          },
        }
      );

      await coreErrorHandler.handleError(circuitError);
    }
  }

  /**
   * Detect service degradation
   */
  private async detectServiceDegradation(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    if (!context.serviceName || !context.loadMetrics?.errorRate) return;

    if (context.loadMetrics.errorRate > 0.5) { // 50% error rate
      const degradationError = new AppError(
        `Service degradation detected for: ${context.serviceName}`,
        LibraryErrorCode.SERVICE_DEGRADATION,
        ErrorDomain.NETWORK,
        ErrorSeverity.HIGH,
        {
          context,
        }
      );

      await coreErrorHandler.handleError(degradationError);
    }
  }

  /**
   * Track service analytics
   */
  private async trackServiceAnalytics(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    await this.analyticsService.track(error);
  }

  /**
   * Register fallback service
   */
  registerFallbackService(serviceName: string, fallbackFn: () => Promise<unknown>): void {
    this.fallbackServices.set(serviceName, fallbackFn);
  }

  /**
   * Get service metrics
   */
  getServiceMetrics() {
    const circuitBreakerMetrics = Object.fromEntries(
      Array.from(this.circuitBreakers.entries()).map(([name, cb]) => [name, cb.getMetrics()])
    );

    return {
      services: Object.fromEntries(this.serviceMetrics),
      circuitBreakers: circuitBreakerMetrics,
      retryMetrics: this.retryHandler.getRetryMetrics(),
      fallbackServices: Array.from(this.fallbackServices.keys()),
    };
  }

  /**
   * Reset service tracking
   */
  resetTracking(): void {
    this.serviceMetrics.clear();
    // Note: Don't reset circuit breakers as they maintain state intentionally
  }
}

// Export singleton instance
export const libraryErrorMiddleware = new LibraryErrorMiddleware();

// Export types and classes
export type { ServiceErrorContext, LibraryMiddlewareConfig, CircuitBreakerConfig };
export { CircuitBreaker, ServiceRetryHandler };
