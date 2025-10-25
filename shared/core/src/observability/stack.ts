/**
 * Observability Stack Implementation
 * 
 * This module provides the main ObservabilityStack class that coordinates
 * all observability components (logging, metrics, tracing, health) and
 * manages correlation ID propagation using AsyncLocalStorage.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Result, Ok, Err } from '../primitives/types';
import { BaseError } from './error-management';
import {
  Logger,
  MetricsCollector,
  Tracer,
  HealthChecker,
  CorrelationManager,
  CorrelationContext,
  ObservabilityConfig,
  LoggingConfig,
  MetricsConfig,
  TracingConfig,
  HealthConfig
} from './interfaces';
import { TelemetryIntegration, TelemetryConfig, createTelemetryIntegration, createDefaultTelemetryConfig } from './telemetry';
import { AsyncCorrelationManager } from './correlation';
import { E } from 'vitest/dist/chunks/environment.d.cL3nLXbE.js';
import { ok } from 'assert';

// ==================== Correlation Manager Implementation ====================

// Import the correlation manager from the dedicated module
// The AsyncCorrelationManager is now defined in correlation.ts

// ==================== Observability Stack Error Classes ====================

export class ObservabilityError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 500, 'OBSERVABILITY_ERROR', { cause }, false);
  }
}

export class ObservabilityInitializationError extends ObservabilityError {
  constructor(component: string, cause?: Error) {
    super(`Failed to initialize observability component: ${component}`, cause);
    this.errorCode = 'OBSERVABILITY_INIT_ERROR';
  }
}

export class ObservabilityConfigurationError extends ObservabilityError {
  constructor(message: string, config?: unknown) {
    super(`Observability configuration error: ${message}`, undefined);
    this.errorCode = 'OBSERVABILITY_CONFIG_ERROR';
    this.metadata = { config };
  }
}

// ==================== Observability Stack Implementation ====================

/**
 * Main ObservabilityStack class that coordinates all observability components
 */
export class ObservabilityStack {
  private logger?: Logger;
  private metrics?: MetricsCollector;
  private tracer?: Tracer;
  private health?: HealthChecker;
  private correlation: CorrelationManager;
  private telemetry?: TelemetryIntegration;
  private initialized = false;
  private readonly config: ObservabilityConfig;

  constructor(config: ObservabilityConfig = {}) {
    this.config = this.validateAndNormalizeConfig(config);
    this.correlation = new AsyncCorrelationManager({
      generateIds: this.config.correlation?.generateIds ?? true
    });
  }

  /**
   * Initialize all observability components in the correct order
   */
  async initialize(): Promise<Result<void, BaseError>> {
    if (this.initialized) {
      return new Ok(undefined);
    }

    try {
      // Initialize correlation manager first (no async initialization needed)
      
      // Initialize metrics collector
      if (this.config.metrics?.enabled !== false) {
        const metricsResult = await this.initializeMetrics();
        if (metricsResult.isError()) {
          return metricsResult;
        }
      }

      // Initialize tracer
      if (this.config.tracing?.enabled !== false) {
        const tracingResult = await this.initializeTracing();
        if (tracingResult.isError()) {
          return tracingResult;
        }
      }

      // Initialize logger (depends on metrics and tracing for instrumentation)
      if (this.config.logging !== undefined) {
        const loggingResult = await this.initializeLogging();
        if (loggingResult.isError()) {
          return loggingResult;
        }
      }

      // Initialize health checker last (may depend on other components)
      if (this.config.health?.enabled !== false) {
        const healthResult = await this.initializeHealth();
        if (healthResult.isErr()) {
          return healthResult;
        }
      }

      // Initialize telemetry integration if configured
      if (this.config.telemetry?.enabled !== false) {
        this.initializeTelemetry();
      }

      this.initialized = true;
      return new Ok(undefined);

    } catch (error) {
      return new Err(new ObservabilityInitializationError('stack', error as Error));
    }
  }

  /**
   * Get the logger instance
   */
  getLogger(): Logger {
    if (!this.logger) {
      throw new ObservabilityError('Logger not initialized. Call initialize() first.');
    }
    return this.logger;
  }

  /**
   * Get the metrics collector instance
   */
  getMetrics(): MetricsCollector {
    if (!this.metrics) {
      throw new ObservabilityError('Metrics collector not initialized. Call initialize() first.');
    }
    return this.metrics;
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      throw new ObservabilityError('Tracer not initialized. Call initialize() first.');
    }
    return this.tracer;
  }

  /**
   * Get the health checker instance
   */
  getHealth(): HealthChecker {
    if (!this.health) {
      throw new ObservabilityError('Health checker not initialized. Call initialize() first.');
    }
    return this.health;
  }

  /**
   * Get the correlation manager instance
   */
  getCorrelation(): CorrelationManager {
    return this.correlation;
  }

  /**
   * Start a new request context with correlation ID
   */
  startRequest(context?: Partial<CorrelationContext>): CorrelationContext {
    return this.correlation.startRequest(context);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.correlation.getCorrelationId();
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.correlation.getContext();
  }

  /**
   * Execute function with correlation context
   */
  withContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.correlation.withContext(context, fn);
  }

  /**
   * Execute async function with correlation context
   */
  async withContextAsync<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T> {
    return this.correlation.withContextAsync(context, fn);
  }

  /**
   * Shutdown all observability components
   */
  async shutdown(): Promise<Result<void, BaseError>> {
    try {
      const shutdownPromises: Promise<void>[] = [];

      // Shutdown components in reverse order of initialization
      if (this.health && 'shutdown' in this.health) {
        shutdownPromises.push((this.health as any).shutdown());
      }

      if (this.logger && 'shutdown' in this.logger) {
        shutdownPromises.push((this.logger as any).shutdown());
      }

      if (this.tracer && 'shutdown' in this.tracer) {
        shutdownPromises.push((this.tracer as any).shutdown());
      }

      if (this.metrics && 'shutdown' in this.metrics) {
        shutdownPromises.push((this.metrics as any).shutdown());
      }

      await Promise.all(shutdownPromises);
      this.initialized = false;
      return new Ok(undefined);

    } catch (error) {
      return new Err(new ObservabilityError('Failed to shutdown observability stack', error as Error));
    }
  }

  /**
   * Check if the observability stack is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current configuration
   */
  getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  // ==================== Private Initialization Methods ====================

  private async initializeMetrics(): Promise<Result<void, BaseError>> {
    try {
      // This would be implemented with actual metrics collector
      // For now, we'll create a placeholder that would be replaced with real implementation
      this.metrics = this.createMetricsCollector(this.config.metrics!);
      return new Ok(undefined);
    } catch (error) {
      return new Err(new ObservabilityInitializationError('metrics', error as Error));
    }
  }

  private async initializeTracing(): Promise<Result<void, BaseError>> {
    try {
      // This would be implemented with actual tracer
      // For now, we'll create a placeholder that would be replaced with real implementation
      this.tracer = this.createTracer(this.config.tracing!);
      return new Ok(undefined);
    } catch (error) {
      return new Err(new ObservabilityInitializationError('tracing', error as Error));
    }
  }

  private async initializeLogging(): Promise<Result<void, BaseError>> {
    try {
      // This would be implemented with actual logger
      // For now, we'll create a placeholder that would be replaced with real implementation
      this.logger = this.createLogger(this.config.logging!);
      return new Ok(undefined);
    } catch (error) {
      return new Err(new ObservabilityInitializationError('logging', error as Error));
    }
  }

  private async initializeHealth(): Promise<Result<void, BaseError>> {
    try {
      // This would be implemented with actual health checker
      // For now, we'll create a placeholder that would be replaced with real implementation
      this.health = this.createHealthChecker(this.config.health!);
      return new Ok(undefined);
    } catch (error) {
      return new Err(new ObservabilityInitializationError('health', error as Error));
    }
  }

  private initializeTelemetry(): void {
    const telemetryConfig = this.config.telemetry || createDefaultTelemetryConfig();
    this.telemetry = createTelemetryIntegration(telemetryConfig, this.correlation);
    // Type assertion needed due to interface differences
    this.telemetry.integrate(this.logger, this.metrics, this.tracer as any);
  }

  /**
   * Get the telemetry integration instance
   */
  getTelemetry(): TelemetryIntegration | undefined {
    return this.telemetry;
  }

  // ==================== Private Factory Methods ====================
  // These would be replaced with actual implementations in the real system

  private createMetricsCollector(config: MetricsConfig): MetricsCollector {
    // Import enhanced metrics collectors
    const {
      createAtomicCounter,
      createAtomicGauge,
      createAggregatingHistogram,
      createAggregatingSummary,
      createRegistry,
      defaultRegistry
    } = require('../metrics');

    // Create a registry for this stack instance
    const registry = createRegistry();

    // Return enhanced metrics collector implementation
    return {
      counter: (name: string, value?: number, labels?: Record<string, string>) => {
        // Placeholder implementation - would increment counter by value
        console.log(`Counter ${name} incremented by ${value || 1}`, labels);
      },
      gauge: (name: string, value: number, labels?: Record<string, string>) => {
        // Placeholder implementation - would set gauge value
        console.log(`Gauge ${name} set to ${value}`, labels);
      },
      histogram: (name: string, value: number, labels?: Record<string, string>) => {
        // Placeholder implementation - would record histogram observation
        console.log(`Histogram ${name} observed ${value}`, labels);
      },
      summary: (name: string, value: number, labels?: Record<string, string>) => {
        // Placeholder implementation - would record summary observation
        console.log(`Summary ${name} observed ${value}`, labels);
      },
      incrementGauge: (name: string, value?: number, labels?: Record<string, string>) => {
        const gauge = registry.get(name) as any;
        if (gauge && 'increment' in gauge) {
          gauge.increment(value, labels);
        }
      },
      decrementGauge: (name: string, value?: number, labels?: Record<string, string>) => {
        const gauge = registry.get(name) as any;
        if (gauge && 'decrement' in gauge) {
          gauge.decrement(value, labels);
        }
      },
      time: <T>(name: string, fn: () => T): T => {
        const start = Date.now();
        try {
          return fn();
        } finally {
          const duration = Date.now() - start;
          const histogram = registry.get(`${name}_duration`) as any;
          if (histogram && 'observe' in histogram) {
            histogram.observe(duration / 1000); // Convert to seconds
          }
        }
      },
      timeAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
        const start = Date.now();
        try {
          return await fn();
        } finally {
          const duration = Date.now() - start;
          const histogram = registry.get(`${name}_duration`) as any;
          if (histogram && 'observe' in histogram) {
            histogram.observe(duration / 1000); // Convert to seconds
          }
        }
      },
      getMetrics: () => registry.collect()
    };
  }

  private createTracer(config: TracingConfig): Tracer {
    // Import the new comprehensive tracer implementation
    const { createTracer: createNewTracer } = require('../tracing');

    return createNewTracer(
      config.serviceName,
      config.serviceVersion,
      config.samplingRate
    );
  }

  private createLogger(config: LoggingConfig): Logger {
    // Placeholder implementation - would be replaced with real logger
    const noop = () => {};
    return {
      trace: noop,
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
      fatal: noop,
      critical: noop,
      child: () => this.createLogger(config),
      withContext: <T>(context: any, fn: () => T) => fn(),
      withContextAsync: async <T>(context: any, fn: () => Promise<T>) => fn()
    };
  }

  private createHealthChecker(config: HealthConfig): HealthChecker {
    // Placeholder implementation - would be replaced with real health checker
    return {
      registerCheck: () => new Ok(undefined),
      unregisterCheck: () => new Ok(undefined),
      checkHealth: async () => new Ok({
        status: 'healthy' as const,
        timestamp: new Date(),
        duration: 0,
        checks: {},
        summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0, unknown: 0 }
      }),
      checkHealthFor: async () => new Ok({
        status: 'healthy' as const,
        message: '',
        timestamp: new Date(),
        duration: 0
      }),
      getRegisteredChecks: () => [],
      enableCheck: () => new Ok(undefined),
      disableCheck: () => new Ok(undefined),
      getCheckConfig: () => new Err(new BaseError('Check not found'))
    };
  }

  // ==================== Configuration Validation ====================

  private validateAndNormalizeConfig(config: ObservabilityConfig): ObservabilityConfig {
    const normalized: ObservabilityConfig = {
      logging: config.logging || {
        level: 'info',
        format: 'json',
        destination: 'stdout'
      },
      metrics: config.metrics || {
        enabled: true,
        prefix: 'app',
        exportInterval: 15000
      },
      tracing: config.tracing || {
        enabled: true,
        serviceName: 'unknown-service',
        samplingRate: 0.1
      },
      health: config.health || {
        enabled: true,
        checkInterval: 30000,
        cacheTTL: 10000,
        defaultTimeout: 5000,
        maxConcurrentChecks: 10
      },
      correlation: config.correlation || {
        enabled: true,
        generateIds: true,
        propagateHeaders: true
      }
    };

    // Validate required fields
    if (normalized.tracing?.enabled && !normalized.tracing.serviceName) {
      throw new ObservabilityConfigurationError('serviceName is required when tracing is enabled');
    }

    return normalized;
  }
}

// ==================== Factory Function ====================

/**
 * Create a new ObservabilityStack instance
 */
export function createObservabilityStack(config: ObservabilityConfig = {}): ObservabilityStack {
  return new ObservabilityStack(config);
}

// ==================== Default Export ====================

export default ObservabilityStack;