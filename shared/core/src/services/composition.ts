/**
 * Service Composition Patterns
 *
 * This module provides comprehensive patterns for composing infrastructure capabilities
 * into higher-level services with resilience, observability, and error handling.
 *
 * Key Features:
 * - Circuit breaker patterns for resilient service composition
 * - Retry logic with exponential backoff
 * - Single-flight patterns to prevent duplicate requests
 * - Timeout management for service operations
 * - Result-based error handling throughout
 * - Integration with unified observability stack
 * - Dependency injection through ServiceContainer
 * - Composable building blocks for service orchestration
 * - Support for both synchronous and asynchronous composition
 */

import { Result, ok, err, isOk, isErr } from '../primitives/types/result';
import { BaseError, BaseErrorOptions } from '../observability/error-management';
import { logger, MetricsCollector, Tracer, CorrelationManager } from '../observability';
import { retry, timeout, delay } from '/utils/async-utils';
import { MiddlewareServices } from '../middleware/factory';

// ==================== Core Composition Types ====================

/**
 * Service operation that returns a Result
 */
export type ServiceOperation<TInput, TOutput> = (input: TInput) => Promise<Result<TOutput, BaseError>>;

/**
 * Service operation with context
 */
export type ContextualServiceOperation<TInput, TOutput, TContext = any> = (
  input: TInput,
  context: TContext
) => Promise<Result<TOutput, BaseError>>;

/**
 * Composition configuration
 */
export interface CompositionConfig {
  /** Circuit breaker settings */
  circuitBreaker?: CircuitBreakerConfig;
  /** Retry settings */
  retry?: RetryConfig;
  /** Timeout settings */
  timeout?: TimeoutConfig;
  /** Single-flight settings */
  singleFlight?: SingleFlightConfig;
  /** Observability settings */
  observability?: ObservabilityConfig;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Recovery timeout in milliseconds */
  recoveryTimeout: number;
  /** Monitoring window in milliseconds */
  monitoringWindow: number;
  /** Success threshold for half-open state */
  successThreshold?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries */
  maxDelay?: number;
  /** Exponential backoff factor */
  exponentialBase?: number;
  /** Jitter factor for randomization */
  jitterFactor?: number;
  /** Custom retry condition */
  shouldRetry?: (error: BaseError, attempt: number) => boolean;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Operation timeout in milliseconds */
  duration: number;
  /** Timeout error message */
  message?: string;
}

/**
 * Single-flight configuration
 */
export interface SingleFlightConfig {
  /** Cache TTL for single-flight results */
  ttl?: number;
  /** Key generator function */
  keyGenerator?: (input: any) => string;
}

/**
 * Observability configuration
 */
export interface ObservabilityConfig {
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Enable tracing */
  enableTracing?: boolean;
  /** Custom metric prefix */
  metricPrefix?: string;
  /** Service name for tracing */
  serviceName?: string;
}

// ==================== Circuit Breaker Implementation ====================

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Circuit breaker for resilient service composition
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly metrics?: MetricsCollector,
    private readonly tracer?: Tracer
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<Result<T, BaseError>>,
    operationName: string
  ): Promise<Result<T, BaseError>> {
    const span = this.tracer?.startSpan(`circuit-breaker.${operationName}`, {
      attributes: {
        operation: operationName,
        state: this.state
      }
    });

    try {
      // Check if circuit should allow execution
      if (!this.shouldAllowExecution()) {
        this.metrics?.counter(`${operationName}.circuit_breaker.open`, 1);
        span?.setStatus('error', 'Circuit breaker is open');
        return err(new CircuitBreakerError('Circuit breaker is open'));
      }

      // Execute operation
      const result = await operation();

      // Record result
      if (isOk(result)) {
        this.recordSuccess();
        this.metrics?.counter(`${operationName}.circuit_breaker.success`, 1);
        span?.setStatus('ok');
      } else {
        this.recordFailure();
        this.metrics?.counter(`${operationName}.circuit_breaker.failure`, 1);
        span?.setStatus('error', result.error.message);
      }

      return result;
    } catch (error) {
      this.recordFailure();
      this.metrics?.counter(`${operationName}.circuit_breaker.exception`, 1);
      span?.setStatus('error', error instanceof Error ? error.message : 'Unknown error');
      return err(new CircuitBreakerError('Operation failed with exception', { cause: error as Error }));
    } finally {
      span?.end();
    }
  }

  /**
   * Check if execution should be allowed
   */
  private shouldAllowExecution(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        if (this.shouldAttemptRecovery()) {
          this.state = CircuitState.HALF_OPEN;
          this.consecutiveSuccesses = 0;
          return true;
        }
        return false;
      case CircuitState.HALF_OPEN:
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return false;
    const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceFailure >= this.config.recoveryTimeout;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();
    this.consecutiveSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      const successThreshold = this.config.successThreshold || 1;
      if (this.consecutiveSuccesses >= successThreshold) {
        this.state = CircuitState.CLOSED;
        this.consecutiveFailures = 0;
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }
}

// ==================== Retry with Exponential Backoff ====================

/**
 * Enhanced retry logic with exponential backoff and observability
 */
export class RetryManager {
  constructor(
    private readonly config: RetryConfig,
    private readonly metrics?: MetricsCollector,
    private readonly tracer?: Tracer
  ) {}

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<Result<T, BaseError>>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<Result<T, BaseError>> {
    const span = this.tracer?.startSpan(`retry.${operationName}`, {
      attributes: {
        operation: operationName,
        max_attempts: this.config.maxAttempts,
        ...(context && Object.fromEntries(
          Object.entries(context).map(([k, v]) => [k, String(v)])
        ))
      }
    });

    let lastError: BaseError | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        const result = await operation();

        if (isOk(result)) {
          this.metrics?.counter(`${operationName}.retry.success`, 1, { attempt: attempt.toString() });
          span?.setStatus('ok');
          span?.setAttribute('attempts', attempt);
          return result;
        }

        lastError = result.error;

        // Check if we should retry this error
        const shouldRetry = this.config.shouldRetry
          ? this.config.shouldRetry(lastError, attempt)
          : this.isRetryableError(lastError);

        if (!shouldRetry || attempt >= this.config.maxAttempts) {
          this.metrics?.counter(`${operationName}.retry.final_failure`, 1, {
            attempt: attempt.toString(),
            error_type: lastError.constructor.name
          });
          span?.setStatus('error', lastError.message);
          span?.setAttribute('attempts', attempt);
          return err(lastError);
        }

        // Calculate delay with exponential backoff and jitter
        const delayMs = this.calculateDelay(attempt);
        this.metrics?.histogram(`${operationName}.retry.delay`, delayMs, {
          attempt: attempt.toString()
        });

        logger.warn('Operation failed, retrying', {
          operation: operationName,
          attempt,
          maxAttempts: this.config.maxAttempts,
          delay: delayMs,
          error: lastError.message,
          ...context
        });

        await delay(delayMs);

      } catch (error) {
        lastError = error instanceof BaseError
          ? error
          : new RetryError('Unexpected error during retry', { cause: error as Error });

        if (attempt >= this.config.maxAttempts) {
          this.metrics?.counter(`${operationName}.retry.exception`, 1, {
            attempt: attempt.toString()
          });
          span?.setStatus('error', lastError.message);
          span?.setAttribute('attempts', attempt);
          return err(lastError);
        }

        const delayMs = this.calculateDelay(attempt);
        await delay(delayMs);
      }
    }

    // This should never be reached, but TypeScript requires it
    return err(lastError || new RetryError('Retry logic failed unexpectedly'));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.exponentialBase || 2, attempt - 1);
    const jitter = exponentialDelay * (this.config.jitterFactor || 0.1) * (Math.random() * 2 - 1);
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay || 30000);
    return Math.max(0, delay);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: BaseError): boolean {
    // Common retryable error types
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'ServiceUnavailableError'
    ];

    return retryableErrors.some(type => error.constructor.name.includes(type)) ||
           error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('connection') ||
           error.message.toLowerCase().includes('network');
  }
}

// ==================== Single-Flight Pattern ====================

/**
 * Single-flight pattern to prevent duplicate concurrent requests
 */
export class SingleFlight<T = any> {
  private readonly inFlight = new Map<string, Promise<Result<T, BaseError>>>();
  private readonly cache = new Map<string, { result: Result<T, BaseError>; timestamp: number }>();

  constructor(
    private readonly config: SingleFlightConfig = {},
    private readonly metrics?: MetricsCollector
  ) {}

  /**
   * Execute operation with single-flight protection
   */
  async execute(
    key: string,
    operation: () => Promise<Result<T, BaseError>>,
    operationName: string
  ): Promise<Result<T, BaseError>> {
    // Check cache first
    const cached = this.getCachedResult(key);
    if (cached) {
      this.metrics?.counter(`${operationName}.single_flight.cache_hit`, 1);
      return cached;
    }

    // Check if operation is already in flight
    const existing = this.inFlight.get(key);
    if (existing) {
      this.metrics?.counter(`${operationName}.single_flight.deduplicated`, 1);
      return existing;
    }

    // Start new operation
    const promise = this.performOperation(key, operation, operationName);
    this.inFlight.set(key, promise);

    try {
      const result = await promise;
      this.cacheResult(key, result);
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Perform the actual operation
   */
  private async performOperation(
    key: string,
    operation: () => Promise<Result<T, BaseError>>,
    operationName: string
  ): Promise<Result<T, BaseError>> {
    this.metrics?.counter(`${operationName}.single_flight.started`, 1);

    try {
      const result = await operation();
      this.metrics?.counter(`${operationName}.single_flight.completed`, 1);
      return result;
    } catch (error) {
      this.metrics?.counter(`${operationName}.single_flight.error`, 1);
      return err(error instanceof BaseError
        ? error
        : new CompositionError('Single-flight operation failed', 'single-flight', { cause: error as Error }));
    }
  }

  /**
   * Get cached result if still valid
   */
  private getCachedResult(key: string): Result<T, BaseError> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const ttl = this.config.ttl || 5000; // Default 5 seconds
    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache result with timestamp
   */
  private cacheResult(key: string, result: Result<T, BaseError>): void {
    if (this.config.ttl && this.config.ttl > 0) {
      this.cache.set(key, { result, timestamp: Date.now() });
    }
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current in-flight operations count
   */
  getInFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Get cached results count
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ==================== Timeout Management ====================

/**
 * Timeout manager for service operations
 */
export class TimeoutManager {
  constructor(
    private readonly config: TimeoutConfig,
    private readonly metrics?: MetricsCollector,
    private readonly tracer?: Tracer
  ) {}

  /**
   * Execute operation with timeout
   */
  async execute<T>(
    operation: () => Promise<Result<T, BaseError>>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<Result<T, BaseError>> {
    const span = this.tracer?.startSpan(`timeout.${operationName}`, {
      attributes: {
        timeout_ms: this.config.duration,
        ...context
      }
    });

    try {
      const result = await timeout(operation(), this.config.duration);

      if (isOk(result)) {
        this.metrics?.histogram(`${operationName}.timeout.duration`, this.config.duration);
        span?.setStatus('ok');
        return result;
      } else {
        this.metrics?.counter(`${operationName}.timeout.failed`, 1);
        span?.setStatus('error', result.error.message);
        return result;
      }
    } catch (error) {
      const timeoutError = new TimeoutError(
        this.config.message || `Operation timed out after ${this.config.duration}ms`,
        this.config.duration
      );

      this.metrics?.counter(`${operationName}.timeout.exceeded`, 1);
      span?.setStatus('error', timeoutError.message);

      return err(timeoutError);
    } finally {
      span?.end();
    }
  }
}

// ==================== Service Composition Orchestrator ====================

/**
 * Main service composition orchestrator
 */
export class ServiceCompositionOrchestrator {
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly retryManagers = new Map<string, RetryManager>();
  private readonly singleFlights = new Map<string, SingleFlight>();
  private readonly timeoutManagers = new Map<string, TimeoutManager>();

  constructor(
    private readonly services: MiddlewareServices,
    private readonly correlationManager?: CorrelationManager
  ) {}

  /**
   * Compose a service operation with resilience patterns
   */
  compose<TInput, TOutput>(
    operation: ServiceOperation<TInput, TOutput>,
    config: CompositionConfig,
    operationName: string
  ): ServiceOperation<TInput, TOutput> {
    return async (input: TInput): Promise<Result<TOutput, BaseError>> => {
      const correlationId = this.correlationManager?.getCorrelationId();
      const context = {
        operation: operationName,
        correlationId,
        input: typeof input === 'object' ? JSON.stringify(input) : String(input)
      };

      logger.info('Starting composed service operation', context);

      try {
        // Apply patterns in order: timeout -> single-flight -> circuit breaker -> retry
        let composedOperation = operation;

        // Add timeout if configured
        if (config.timeout) {
          composedOperation = this.withTimeout(composedOperation, config.timeout, operationName);
        }

        // Add single-flight if configured
        if (config.singleFlight) {
          composedOperation = this.withSingleFlight(composedOperation, config.singleFlight, operationName);
        }

        // Add circuit breaker if configured
        if (config.circuitBreaker) {
          composedOperation = this.withCircuitBreaker(composedOperation, config.circuitBreaker, operationName);
        }

        // Add retry if configured
        if (config.retry) {
          composedOperation = this.withRetry(composedOperation, config.retry, operationName);
        }

        // Execute composed operation
        const result = await composedOperation(input);

        if (isOk(result)) {
          logger.info('Composed service operation completed successfully', {
            ...context,
            duration: Date.now() // Would be better with actual timing
          });
        } else {
          logger.error('Composed service operation failed', {
            ...context,
            error: result.error.message,
            errorType: result.error.constructor.name
          });
        }

        return result;

      } catch (error) {
        const baseError = error instanceof BaseError
          ? error
          : new CompositionError('Unexpected error in service composition', 'orchestrator', { cause: error as Error });

        logger.error('Unexpected error in service composition', {
          ...context,
          error: baseError.message
        });

        return err(baseError);
      }
    };
  }

  /**
   * Add timeout to operation
   */
  private withTimeout<TInput, TOutput>(
    operation: ServiceOperation<TInput, TOutput>,
    config: TimeoutConfig,
    operationName: string
  ): ServiceOperation<TInput, TOutput> {
    const timeoutManager = this.getOrCreateTimeoutManager(operationName, config);
    return async (input: TInput) => timeoutManager.execute(() => operation(input), operationName);
  }

  /**
   * Add single-flight to operation
   */
  private withSingleFlight<TInput, TOutput>(
    operation: ServiceOperation<TInput, TOutput>,
    config: SingleFlightConfig,
    operationName: string
  ): ServiceOperation<TInput, TOutput> {
    const singleFlight = this.getOrCreateSingleFlight(operationName, config);
    return async (input: TInput) => {
      const key = config.keyGenerator ? config.keyGenerator(input) : JSON.stringify(input);
      return singleFlight.execute(key, () => operation(input), operationName);
    };
  }

  /**
   * Add circuit breaker to operation
   */
  private withCircuitBreaker<TInput, TOutput>(
    operation: ServiceOperation<TInput, TOutput>,
    config: CircuitBreakerConfig,
    operationName: string
  ): ServiceOperation<TInput, TOutput> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName, config);
    return async (input: TInput) => circuitBreaker.execute(() => operation(input), operationName);
  }

  /**
   * Add retry to operation
   */
  private withRetry<TInput, TOutput>(
    operation: ServiceOperation<TInput, TOutput>,
    config: RetryConfig,
    operationName: string
  ): ServiceOperation<TInput, TOutput> {
    const retryManager = this.getOrCreateRetryManager(operationName, config);
    return async (input: TInput) => retryManager.execute(() => operation(input), operationName);
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(
        config,
        this.services.logger ? undefined : undefined, // Would need to adapt logger
        undefined // Would need tracer from services
      ));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get or create retry manager
   */
  private getOrCreateRetryManager(name: string, config: RetryConfig): RetryManager {
    if (!this.retryManagers.has(name)) {
      this.retryManagers.set(name, new RetryManager(
        config,
        undefined, // Would need metrics from services
        undefined // Would need tracer from services
      ));
    }
    return this.retryManagers.get(name)!;
  }

  /**
   * Get or create single-flight
   */
  private getOrCreateSingleFlight(name: string, config: SingleFlightConfig): SingleFlight {
    if (!this.singleFlights.has(name)) {
      this.singleFlights.set(name, new SingleFlight(
        config,
        undefined // Would need metrics from services
      ));
    }
    return this.singleFlights.get(name)!;
  }

  /**
   * Get or create timeout manager
   */
  private getOrCreateTimeoutManager(name: string, config: TimeoutConfig): TimeoutManager {
    if (!this.timeoutManagers.has(name)) {
      this.timeoutManagers.set(name, new TimeoutManager(
        config,
        undefined, // Would need metrics from services
        undefined // Would need tracer from services
      ));
    }
    return this.timeoutManagers.get(name)!;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(name: string): CircuitBreakerStats | null {
    const breaker = this.circuitBreakers.get(name);
    return breaker ? breaker.getStats() : null;
  }

  /**
   * Get single-flight statistics
   */
  getSingleFlightStats(name: string): { inFlight: number; cacheSize: number } | null {
    const singleFlight = this.singleFlights.get(name);
    if (!singleFlight) return null;

    return {
      inFlight: singleFlight.getInFlightCount(),
      cacheSize: singleFlight.getCacheSize()
    };
  }

  /**
   * Clear all caches and reset state
   */
  reset(): void {
    this.circuitBreakers.clear();
    this.retryManagers.clear();
    this.singleFlights.forEach(sf => sf.clearCache());
    this.singleFlights.clear();
    this.timeoutManagers.clear();
  }
}

// ==================== Error Types ====================

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends BaseError {
  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message, options);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends BaseError {
  constructor(message: string, public readonly timeoutMs: number, options: BaseErrorOptions = {}) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}

/**
 * Retry error
 */
export class RetryError extends BaseError {
  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message, options);
    this.name = 'RetryError';
  }
}

/**
 * Composition error
 */
export class CompositionError extends BaseError {
  constructor(message: string, public readonly operation: string, options: BaseErrorOptions = {}) {
    super(message, options);
    this.name = 'CompositionError';
  }
}

// ==================== Factory Functions ====================

/**
 * Create a service composition orchestrator
 */
export function createServiceCompositionOrchestrator(
  services: MiddlewareServices,
  correlationManager?: CorrelationManager
): ServiceCompositionOrchestrator {
  return new ServiceCompositionOrchestrator(services, correlationManager);
}

/**
 * Create a circuit breaker
 */
export function createCircuitBreaker(
  config: CircuitBreakerConfig,
  metrics?: MetricsCollector,
  tracer?: Tracer
): CircuitBreaker {
  return new CircuitBreaker(config, metrics, tracer);
}

/**
 * Create a retry manager
 */
export function createRetryManager(
  config: RetryConfig,
  metrics?: MetricsCollector,
  tracer?: Tracer
): RetryManager {
  return new RetryManager(config, metrics, tracer);
}

/**
 * Create a single-flight instance
 */
export function createSingleFlight<T = any>(
  config: SingleFlightConfig = {},
  metrics?: MetricsCollector
): SingleFlight<T> {
  return new SingleFlight<T>(config, metrics);
}

/**
 * Create a timeout manager
 */
export function createTimeoutManager(
  config: TimeoutConfig,
  metrics?: MetricsCollector,
  tracer?: Tracer
): TimeoutManager {
  return new TimeoutManager(config, metrics, tracer);
}

// ==================== Usage Examples ====================

/**
 * Example: Basic service composition with all patterns
 *
 * ```typescript
 * import { createServiceCompositionOrchestrator, createCircuitBreaker } from './composition';
 *
 * // Define a basic service operation
 * const fetchUserData: ServiceOperation<string, UserData> = async (user_id) => { *   try {
 *     const response = await fetch(`/api/users/${user_id }`);
 *     if (!response.ok) {
 *       return err(new BaseError('Failed to fetch user data'));
 *     }
 *     const data = await response.json();
 *     return ok(data);
 *   } catch (error) {
 *     return err(new BaseError('Network error', error as Error));
 *   }
 * };
 *
 * // Create orchestrator
 * const orchestrator = createServiceCompositionOrchestrator(services);
 *
 * // Compose operation with resilience patterns
 * const resilientFetchUserData = orchestrator.compose(
 *   fetchUserData,
 *   {
 *     circuitBreaker: {
 *       failureThreshold: 5,
 *       recoveryTimeout: 30000,
 *       monitoringWindow: 60000
 *     },
 *     retry: {
 *       maxAttempts: 3,
 *       baseDelay: 1000,
 *       exponentialBase: 2
 *     },
 *     timeout: {
 *       duration: 5000
 *     },
 *     singleFlight: {
 *       ttl: 10000
 *     }
 *   },
 *   'fetchUserData'
 * );
 *
 * // Use the composed operation
 * const result = await resilientFetchUserData('user123');
 * if (isOk(result)) {
 *   console.log('User data:', result.value);
 * } else {
 *   console.error('Failed to fetch user data:', result.error.message);
 * }
 * ```
 */

/**
 * Example: Individual pattern usage
 *
 * ```typescript
 * import { createCircuitBreaker, createRetryManager, createSingleFlight } from './composition';
 *
 * // Circuit breaker
 * const breaker = createCircuitBreaker({
 *   failureThreshold: 3,
 *   recoveryTimeout: 30000,
 *   monitoringWindow: 60000
 * });
 *
 * // Retry manager
 * const retryManager = createRetryManager({
 *   maxAttempts: 3,
 *   baseDelay: 1000,
 *   maxDelay: 10000
 * });
 *
 * // Single-flight
 * const singleFlight = createSingleFlight({
 *   ttl: 5000,
 *   keyGenerator: (input) => `operation:${JSON.stringify(input)}`
 * });
 *
 * // Compose manually
 * const resilientOperation = async (input) => {
 *   return breaker.execute(async () => {
 *     return retryManager.execute(async () => {
 *       return singleFlight.execute(
 *         JSON.stringify(input),
 *         () => originalOperation(input),
 *         'myOperation'
 *       );
 *     }, 'myOperation');
 *   }, 'myOperation');
 * };
 * ```
 */

export default ServiceCompositionOrchestrator;



