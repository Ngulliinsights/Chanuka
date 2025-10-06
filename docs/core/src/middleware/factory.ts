import { Request, Response, NextFunction, Application } from 'express';
import type { LoggingService } from '../logging/service';
import { 
  type CacheService,
  type PerformanceMetrics as IPerformanceMetrics,
  type DetailedMetrics as IDetailedMetrics,
  type MiddlewareProvider,
  type HealthChecker,
  type RegularMiddleware
} from './types';
import { type ValidationService } from '../services/validation';
import { type RateLimitStore } from '../services/rate-limit';
import { AuthMiddlewareProvider } from './auth/provider';
import { CacheMiddlewareProvider } from './cache/provider';
import { ValidationMiddlewareProvider } from './validation/provider';
import { RateLimitMiddlewareProvider } from './rate-limit/provider';
import { ErrorHandlerMiddlewareProvider } from './error-handler/provider';

// Core interfaces for middleware configuration
interface MiddlewareFeature {
  readonly enabled: boolean;
  readonly priority: number;
  readonly options?: Readonly<Record<string, any>>;
}

interface GlobalConfig extends MiddlewareFeature {
  readonly performanceMonitoring?: boolean;
  readonly metricsRetentionSize?: number;
  readonly logMetricsInterval?: number;
}

interface MiddlewareConfig {
  readonly [key: string]: MiddlewareFeature;
  readonly global?: GlobalConfig;
}

// Performance tracking interfaces
export interface PerformanceMetrics extends IPerformanceMetrics {}

interface DetailedMetrics extends IDetailedMetrics {}

interface MiddlewareMetrics {
  readonly count: number;
  readonly averageMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
}

// Service dependencies interface
interface MiddlewareServices {
  readonly cache: CacheService;
  readonly validator: ValidationService;
  readonly rateLimitStore: RateLimitStore;
  readonly healthChecker: HealthChecker;
  readonly logger: LoggingService;
}

export class MiddlewareFactory {
  private readonly performanceMetrics = new Map<string, DetailedMetrics>();
  private readonly providers = new Map<string, MiddlewareProvider>();
  private readonly config: MiddlewareConfig;
  private readonly services: MiddlewareServices;
  
  // Configuration constants with sensible defaults
  private static readonly DEFAULT_METRICS_RETENTION = 1000;
  private static readonly DEFAULT_LOG_INTERVAL = 100;
  private static readonly PERCENTILE_95 = 0.95;
  private static readonly PERCENTILE_99 = 0.99;

  constructor(config: MiddlewareConfig, services: MiddlewareServices) {
    // Defensive copying to prevent external mutations
    this.config = this.deepFreeze(config);
    this.services = services;
    
    this.registerDefaultProviders();
    this.validateConfiguration();
  }

  /**
   * Deep freeze configuration to prevent accidental mutations
   * This ensures our configuration remains immutable after construction
   */
  private deepFreeze<T>(obj: T): T {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
      const value = (obj as any)[prop];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });
    return obj;
  }

  /**
   * Validate the entire configuration at startup
   * This catches configuration errors early rather than at runtime
   */
  private validateConfiguration(): void {
    const errors: string[] = [];
    
    Object.entries(this.config).forEach(([name, feature]) => {
      if (name === 'global') return;
      
      const middlewareFeature = feature as MiddlewareFeature;
      if (typeof middlewareFeature.priority !== 'number') {
        errors.push(`Invalid priority for middleware '${name}': must be a number`);
      }
      
      if (typeof middlewareFeature.enabled !== 'boolean') {
        errors.push(`Invalid enabled flag for middleware '${name}': must be boolean`);
      }
      
      // Validate that we have a provider for enabled middleware
      if (middlewareFeature.enabled && !this.providers.has(name)) {
        errors.push(`No provider available for enabled middleware: ${name}`);
      }
    });
    
    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
      this.services.logger.error('Configuration validation failed', new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }

  /**
   * Register all default middleware providers
   * Each provider encapsulates the logic for creating specific middleware types
   */
  private registerDefaultProviders(): void {
    const providerConfigs = [
      () => new AuthMiddlewareProvider(this.services),
      () => new CacheMiddlewareProvider(this.services.cache),
      () => new ValidationMiddlewareProvider(this.services.validator),
      () => new RateLimitMiddlewareProvider(this.services.rateLimitStore),
      () => new ErrorHandlerMiddlewareProvider()
    ];

    // Register each provider with proper error handling
    providerConfigs.forEach(createProvider => {
      try {
        const provider = createProvider();
        this.registerProvider(provider);
      } catch (error) {
        this.services.logger.error(
          'Failed to register provider',
          error instanceof Error ? error : new Error('Unknown provider registration error')
        );
      }
    });
  }

  /**
   * Register a new middleware provider
   * Allows for extensibility by adding custom middleware providers
   */
  registerProvider(provider: MiddlewareProvider): void {
    if (this.providers.has(provider.name)) {
      this.services.logger.warn(`Overriding existing provider: ${provider.name}`);
    }
    this.providers.set(provider.name, provider);
  }

  /**
   * Create all configured middleware in priority order
   * Returns functions that can be applied to an Express application
   */
  createMiddleware(): Array<(app: Application) => void> {
    const middlewares: Array<(app: Application) => void> = [];

    // Sort middleware by priority (lower numbers = higher priority)
    const sortedFeatures = this.getSortedEnabledFeatures();

    for (const [name, feature] of sortedFeatures) {
      const middleware = this.createSingleMiddleware(name, feature);
      if (middleware) {
        middlewares.push(middleware);
      }
    }

    this.services.logger.info(`Created ${middlewares.length} middleware functions`, {
      module: 'MiddlewareFactory',
      enabledMiddleware: sortedFeatures.map(([name]) => name)
    });

    return middlewares;
  }

  /**
   * Get sorted, enabled middleware features
   * Separates the sorting logic for better testability
   */
  private getSortedEnabledFeatures(): Array<[string, MiddlewareFeature]> {
    return Object.entries(this.config)
      .filter(([key, feature]) => {
        if (key === 'global') return false;
        return (feature as MiddlewareFeature).enabled;
      })
      .sort(([, a], [, b]) => {
        const featureA = a as MiddlewareFeature;
        const featureB = b as MiddlewareFeature;
        return featureA.priority - featureB.priority;
      });
  }

  /**
   * Create a single middleware with comprehensive error handling
   * Encapsulates the creation, validation, and wrapping logic
   */
  private createSingleMiddleware(
    name: string, 
    feature: MiddlewareFeature
  ): ((app: Application) => void) | null {
    const provider = this.providers.get(name);
    if (!provider) {
      this.services.logger.warn(`No provider found for middleware: ${name}`);
      return null;
    }

    // Validate options if the provider supports validation
    if (provider.validate && !this.validateMiddlewareOptions(provider, name, feature.options)) {
      return null;
    }

    try {
      const middlewareFn = provider.create(feature.options || {});
      if (!middlewareFn) {
        this.services.logger.warn(`Provider returned null middleware: ${name}`);
        return null;
      }

      return (app: Application) => {
        const wrappedMiddleware = this.wrapWithPerformanceMonitoring(name, middlewareFn as RegularMiddleware);
        app.use(wrappedMiddleware);
        
        this.services.logger.debug(`Applied middleware: ${name}`, {
          module: 'MiddlewareFactory',
          priority: feature.priority
        });
      };
    } catch (error) {
      const errorMessage = `Failed to create middleware: ${name}`;
      this.services.logger.error(
        errorMessage,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Validate middleware options using the provider's validator
   * Centralizes option validation logic
   */
  private validateMiddlewareOptions(
    provider: MiddlewareProvider,
    name: string,
    options: Record<string, any> | undefined
  ): boolean {
    if (!provider.validate) return true;
    
    try {
      const isValid = provider.validate(options || {});
      if (!isValid) {
        this.services.logger.error(`Invalid options for middleware: ${name}`, undefined, {
          module: 'MiddlewareFactory',
          options
        });
      }
      return isValid;
    } catch (error) {
      this.services.logger.error(
        `Option validation failed for middleware: ${name}`,
        error instanceof Error ? error : new Error('Validation error')
      );
      return false;
    }
  }

  /**
   * Wrap middleware with performance monitoring
   * Only adds monitoring overhead when explicitly enabled
   */
  private wrapWithPerformanceMonitoring(
    name: string,
    middleware: RegularMiddleware
  ): RegularMiddleware {
    if (!this.config.global?.performanceMonitoring) {
      return middleware;
    }

    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      const recordMetrics = () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
        this.updateMetrics(name, durationMs);
      };

      // Use once() to ensure cleanup happens only once
      res.once('finish', recordMetrics);
      res.once('close', recordMetrics);

      try {
        middleware(req, res, next);
      } catch (error) {
        recordMetrics();
        throw error;
      }
    };
  }

  /**
   * Update performance metrics with new timing data
   * Maintains rolling window of metrics for percentile calculations
   */
  private updateMetrics(name: string, durationMs: number): void {
    let metrics = this.performanceMetrics.get(name);
    if (!metrics) {
      metrics = {
        count: 0,
        totalDuration: 0,
        min: Infinity,
        max: -Infinity,
        durations: []
      };
      this.performanceMetrics.set(name, metrics);
    }

    // Update counters and bounds
    metrics.count++;
    metrics.totalDuration += durationMs;
    metrics.min = Math.min(metrics.min, durationMs);
    metrics.max = Math.max(metrics.max, durationMs);
    metrics.durations.push(durationMs);

    // Maintain rolling window to prevent unbounded memory growth
    const retentionSize = this.config.global?.metricsRetentionSize || MiddlewareFactory.DEFAULT_METRICS_RETENTION;
    if (metrics.durations.length > retentionSize) {
      metrics.durations.shift();
    }

    // Log metrics periodically to avoid log spam
    const logInterval = this.config.global?.logMetricsInterval || MiddlewareFactory.DEFAULT_LOG_INTERVAL;
    if (metrics.count % logInterval === 0) {
      this.logPerformanceMetrics(name, metrics);
    }
  }

  /**
   * Log comprehensive performance metrics
   * Provides detailed performance insights for monitoring
   */
  private logPerformanceMetrics(name: string, metrics: DetailedMetrics): void {
    const avg = metrics.totalDuration / metrics.count;
    const sortedDurations = [...metrics.durations].sort((a, b) => a - b);
    
    const p95Index = Math.floor(sortedDurations.length * MiddlewareFactory.PERCENTILE_95);
    const p99Index = Math.floor(sortedDurations.length * MiddlewareFactory.PERCENTILE_99);
    
    const p95 = sortedDurations[p95Index] || 0;
    const p99 = sortedDurations[p99Index] || 0;

    this.services.logger.info('Middleware Performance Metrics', {
      module: 'MiddlewareFactory',
      middleware: name,
      metrics: {
        invocations: metrics.count,
        averageMs: Number(avg.toFixed(3)),
        minMs: Number(metrics.min.toFixed(3)),
        maxMs: Number(metrics.max.toFixed(3)),
        p95Ms: Number(p95.toFixed(3)),
        p99Ms: Number(p99.toFixed(3)),
        sampleSize: sortedDurations.length
      }
    });
  }

  /**
   * Get comprehensive performance metrics for all middleware
   * Provides API for external monitoring systems
   */
  getPerformanceMetrics(): Record<string, MiddlewareMetrics> {
    const result: Record<string, MiddlewareMetrics> = {};
    
    for (const [name, metrics] of this.performanceMetrics.entries()) {
      const sortedDurations = [...metrics.durations].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedDurations.length * MiddlewareFactory.PERCENTILE_95);
      const p99Index = Math.floor(sortedDurations.length * MiddlewareFactory.PERCENTILE_99);
      
      result[name] = {
        count: metrics.count,
        averageMs: Number((metrics.totalDuration / metrics.count).toFixed(3)),
        minMs: Number(metrics.min.toFixed(3)),
        maxMs: Number(metrics.max.toFixed(3)),
        p95Ms: Number((sortedDurations[p95Index] || 0).toFixed(3)),
        p99Ms: Number((sortedDurations[p99Index] || 0).toFixed(3))
      };
    }

    return result;
  }

  /**
   * Get current configuration (readonly)
   * Allows external systems to inspect current middleware setup
   */
  getConfiguration(): MiddlewareConfig {
    return this.config;
  }

  /**
   * Get registered provider names
   * Useful for debugging and introspection
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Reset performance metrics
   * Useful for testing or when you want fresh metric collection
   */
  resetMetrics(): void {
    this.performanceMetrics.clear();
    this.services.logger.info('Performance metrics reset', {
      module: 'MiddlewareFactory'
    });
  }
}