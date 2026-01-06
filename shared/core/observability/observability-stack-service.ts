/**
 * Unified Observability Stack Service Implementation
 *
 * Implementation of the IObservabilityStack interface that wraps the existing
 * observability infrastructure and provides a unified API for client and server modules.
 */

import { Result, ok, err } from '../primitives/types/result';

import { BaseError } from './error-management/errors/base-error';
import { CorrelationContext, ObservabilityConfig } from './interfaces';
import {
  IObservabilityStack,
  ObservabilityStackRegistry
} from './iobservability-stack';
import { ObservabilityStack } from './stack';

/**
 * Observability operation error
 */
export class ObservabilityOperationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'OBSERVABILITY_OPERATION_ERROR', ...(cause && { cause }) });
  }
}

/**
 * Unified Observability Stack Service Implementation
 *
 * Wraps the existing observability infrastructure to provide a consistent,
 * high-level API for observability operations.
 */
export class ObservabilityStackService implements IObservabilityStack {
  private stack: ObservabilityStack;

  constructor(config?: ObservabilityConfig) {
    this.stack = new ObservabilityStack(config);
  }

  /**
   * Initialize the observability stack
   */
  async initialize(): Promise<Result<void>> {
    try {
      return await this.stack.initialize();
    } catch (error) {
      return err(new ObservabilityOperationError('Failed to initialize observability stack', error as Error));
    }
  }

  /**
   * Get the logger instance
   */
  getLogger(): any {
    return this.stack.getLogger();
  }

  /**
   * Get the metrics collector instance
   */
  getMetrics(): any {
    return this.stack.getMetrics();
  }

  /**
   * Get the tracer instance
   */
  getTracer(): any {
    return this.stack.getTracer();
  }

  /**
   * Get the health checker instance
   */
  getHealth(): any {
    return this.stack.getHealth();
  }

  /**
   * Get the correlation manager instance
   */
  getCorrelation(): any {
    return this.stack.getCorrelation();
  }

  /**
   * Start a new request context with correlation ID
   */
  startRequest(context?: Partial<CorrelationContext>): CorrelationContext {
    return this.stack.startRequest(context);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.stack.getCorrelationId();
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.stack.getContext();
  }

  /**
   * Execute function with correlation context
   */
  withContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.stack.withContext(context, fn);
  }

  /**
   * Execute async function with correlation context
   */
  async withContextAsync<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T> {
    return this.stack.withContextAsync(context, fn);
  }

  /**
   * Shutdown the observability stack
   */
  async shutdown(): Promise<Result<void>> {
    try {
      return await this.stack.shutdown();
    } catch (error) {
      return err(new ObservabilityOperationError('Failed to shutdown observability stack', error as Error));
    }
  }

  /**
   * Check if the observability stack is initialized
   */
  isInitialized(): boolean {
    return this.stack.isInitialized();
  }

  /**
   * Get the current configuration
   */
  getConfig(): any {
    return this.stack.getConfig();
  }

  /**
   * Get the telemetry integration instance
   */
  getTelemetry(): any | undefined {
    return this.stack.getTelemetry();
  }

  // ==================== High-Level Convenience Methods ====================

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    try {
      const logger = this.stack.getLogger();
      if (logger && typeof logger.info === 'function') {
        logger.info(message, meta);
      } else {
        console.info(message, meta);
      }
    } catch (error) {
      console.warn('Failed to log info message:', error);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    try {
      const logger = this.stack.getLogger();
      if (logger && typeof logger.error === 'function') {
        logger.error(message, { error, ...meta });
      } else {
        console.error(message, error, meta);
      }
    } catch (logError) {
      console.warn('Failed to log error message:', logError);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    try {
      const logger = this.stack.getLogger();
      if (logger && typeof logger.warn === 'function') {
        logger.warn(message, meta);
      } else {
        console.warn(message, meta);
      }
    } catch (error) {
      console.warn('Failed to log warning message:', error);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    try {
      const logger = this.stack.getLogger();
      if (logger && typeof logger.debug === 'function') {
        logger.debug(message, meta);
      } else {
        console.debug(message, meta);
      }
    } catch (error) {
      console.warn('Failed to log debug message:', error);
    }
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    try {
      const metrics = this.stack.getMetrics();
      if (metrics && typeof metrics.gauge === 'function') {
        metrics.gauge(name, value, labels);
      }
    } catch (error) {
      console.warn('Failed to record metric:', error);
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    try {
      const metrics = this.stack.getMetrics();
      if (metrics && typeof metrics.counter === 'function') {
        metrics.counter(name, 1, labels);
      }
    } catch (error) {
      console.warn('Failed to increment counter:', error);
    }
  }

  /**
   * Start a tracing span
   */
  startSpan(name: string, parentSpan?: any): any {
    try {
      const tracer = this.stack.getTracer();
      if (tracer && typeof tracer.startSpan === 'function') {
        return tracer.startSpan(name, { parent: parentSpan });
      }
    } catch (error) {
      console.warn('Failed to start span:', error);
    }
    return null;
  }

  /**
   * Perform a health check
   */
  async checkHealth(): Promise<Result<any>> {
    try {
      const health = this.stack.getHealth();
      if (health && typeof health.checkHealth === 'function') {
        return await health.checkHealth();
      }
      return ok({ status: 'unknown', message: 'Health checker not available' });
    } catch (error) {
      return err(new ObservabilityOperationError('Failed to perform health check', error as Error));
    }
  }

  /**
   * Time a function execution
   */
  time<T>(name: string, fn: () => T): T {
    try {
      const metrics = this.stack.getMetrics();
      if (metrics && typeof metrics.time === 'function') {
        return metrics.time(name, fn);
      }
      return fn();
    } catch (error) {
      console.warn('Failed to time function:', error);
      return fn();
    }
  }

  /**
   * Time an async function execution
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    try {
      const metrics = this.stack.getMetrics();
      if (metrics && typeof metrics.timeAsync === 'function') {
        return await metrics.timeAsync(name, fn);
      }
      return await fn();
    } catch (error) {
      console.warn('Failed to time async function:', error);
      return await fn();
    }
  }
}

/**
 * Factory function for creating observability stack services
 */
export async function createObservabilityStackService(config?: ObservabilityConfig): Promise<Result<IObservabilityStack>> {
  try {
    const service = new ObservabilityStackService(config);
    const initResult = await service.initialize();
    if (initResult.isErr()) {
      return err(initResult.error);
    }
    return ok(service);
  } catch (error) {
    return err(new ObservabilityOperationError('Failed to create observability stack service', error as Error));
  }
}

// Register the default observability stack factory
ObservabilityStackRegistry.register('default', createObservabilityStackService);