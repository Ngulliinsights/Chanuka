/**
 * Unified Observability Stack Interface
 *
 * This interface provides a high-level abstraction over the observability infrastructure,
 * consolidating logging, metrics, tracing, health checks, and error management into
 * a single, consistent API for client and server modules to consume.
 */

import { Result, err } from '../primitives/types/result';
import { CorrelationContext } from './interfaces';

/**
 * Unified Observability Stack Interface
 *
 * Provides a consistent, high-level API for all observability operations across the application.
 * This interface abstracts away the complexity of different observability components
 * and provides a unified interface for logging, metrics, tracing, health checks, and error management.
 */
export interface IObservabilityStack {
  /**
   * Initialize all observability components
   *
   * @returns Result indicating success or failure of initialization
   */
  initialize(): Promise<Result<void>>;

  /**
   * Get the logger instance
   */
  getLogger(): any; // Using any for now to avoid circular dependencies

  /**
   * Get the metrics collector instance
   */
  getMetrics(): any; // Using any for now to avoid circular dependencies

  /**
   * Get the tracer instance
   */
  getTracer(): any; // Using any for now to avoid circular dependencies

  /**
   * Get the health checker instance
   */
  getHealth(): any; // Using any for now to avoid circular dependencies

  /**
   * Get the correlation manager instance
   */
  getCorrelation(): any; // Using any for now to avoid circular dependencies

  /**
   * Start a new request context with correlation ID
   */
  startRequest(context?: Partial<CorrelationContext>): CorrelationContext;

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined;

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined;

  /**
   * Execute function with correlation context
   */
  withContext<T>(context: CorrelationContext, fn: () => T): T;

  /**
   * Execute async function with correlation context
   */
  withContextAsync<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T>;

  /**
   * Shutdown all observability components
   */
  shutdown(): Promise<Result<void>>;

  /**
   * Check if the observability stack is initialized
   */
  isInitialized(): boolean;

  /**
   * Get the current configuration
   */
  getConfig(): any; // Using any for now to avoid circular dependencies

  /**
   * Get the telemetry integration instance
   */
  getTelemetry(): any | undefined; // Using any for now to avoid circular dependencies

  // ==================== High-Level Convenience Methods ====================

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an error message
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void;

  /**
   * Start a tracing span
   */
  startSpan(name: string, parentSpan?: any): any;

  /**
   * Perform a health check
   */
  checkHealth(): Promise<Result<any>>;

  /**
   * Time a function execution
   */
  time<T>(name: string, fn: () => T): T;

  /**
   * Time an async function execution
   */
  timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Factory function type for creating observability stacks
 */
export type ObservabilityStackFactory = (config?: any) => Promise<Result<IObservabilityStack>>;

/**
 * Registry for observability stack factories
 */
export class ObservabilityStackRegistry {
  private static factories = new Map<string, ObservabilityStackFactory>();

  /**
   * Register an observability stack factory
   */
  static register(type: string, factory: ObservabilityStackFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Create an observability stack instance
   */
  static async create(type: string, config?: any): Promise<Result<IObservabilityStack>> {
    const factory = this.factories.get(type);
    if (!factory) {
      return err(new Error(`No observability stack factory registered for type: ${type}`));
    }
    return factory(config);
  }

  /**
   * Get registered factory types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}