/**
 * Server-side Method Timing Service
 *
 * Provides comprehensive method-level performance monitoring for server-side operations.
 * Integrates with the unified performance monitoring system.
 */

import { EventEmitter } from 'events';
import { logger } from '../observability/logging';

export interface MethodTimingData {
  /** Method name */
  methodName: string;
  /** Class/service name */
  className?: string;
  /** Execution time in milliseconds */
  duration: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Success status */
  success: boolean;
  /** Error details if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Environment */
  environment: string;
  /** Server instance identifier */
  instanceId: string;
}

export interface MethodTimingStats {
  /** Method name */
  methodName: string;
  /** Total calls */
  totalCalls: number;
  /** Successful calls */
  successfulCalls: number;
  /** Failed calls */
  failedCalls: number;
  /** Average duration */
  averageDuration: number;
  /** Median duration */
  medianDuration: number;
  /** 95th percentile duration */
  p95Duration: number;
  /** 99th percentile duration */
  p99Duration: number;
  /** Min duration */
  minDuration: number;
  /** Max duration */
  maxDuration: number;
  /** Last execution time */
  lastExecutionTime: number;
}

export interface MethodTimingConfig {
  /** Whether to enable method timing */
  enabled: boolean;
  /** Sampling rate (0-1) */
  samplingRate: number;
  /** Methods to exclude from timing */
  excludeMethods: string[];
  /** Methods to include (if specified, only these will be timed) */
  includeMethods?: string[];
  /** Slow method threshold (ms) */
  slowMethodThreshold: number;
  /** Whether to log slow methods */
  logSlowMethods: boolean;
  /** Whether to collect detailed stats */
  collectStats: boolean;
}

export class MethodTimingService extends EventEmitter {
  private timings: MethodTimingData[] = [];
  private stats: Map<string, MethodTimingStats> = new Map();
  private config: MethodTimingConfig;
  private instanceId: string;
  private environment: string;

  constructor(config?: Partial<MethodTimingConfig>) {
    super();

    this.instanceId = process.env.INSTANCE_ID || `instance-${Date.now()}`;
    this.environment = process.env.NODE_ENV || 'development';

    this.config = {
      enabled: true,
      samplingRate: 1.0, // Sample all by default
      excludeMethods: [],
      includeMethods: undefined,
      slowMethodThreshold: 1000, // 1 second
      logSlowMethods: true,
      collectStats: true,
      ...config,
    };

    this.setupCleanup();
  }

  /**
   * Start timing a method execution
   */
  startTiming(methodName: string, className?: string, metadata?: Record<string, any>): TimingHandle {
    if (!this.config.enabled) {
      return new NoOpTimingHandle();
    }

    // Check sampling rate
    if (Math.random() > this.config.samplingRate) {
      return new NoOpTimingHandle();
    }

    // Check include/exclude filters
    if (!this.shouldTimeMethod(methodName)) {
      return new NoOpTimingHandle();
    }

    const startTime = Date.now();
    const startTimePrecise = process.hrtime.bigint();

    return new ActiveTimingHandle(
      methodName,
      className,
      startTime,
      startTimePrecise,
      metadata,
      this
    );
  }

  /**
   * Record a timing manually
   */
  recordTiming(data: Omit<MethodTimingData, 'environment' | 'instanceId'>): void {
    const fullData: MethodTimingData = {
      ...data,
      environment: this.environment,
      instanceId: this.instanceId,
    };

    this.timings.push(fullData);

    // Update stats if enabled
    if (this.config.collectStats) {
      this.updateStats(fullData);
    }

    // Check for slow methods
    if (this.config.logSlowMethods && data.duration > this.config.slowMethodThreshold) {
      this.logSlowMethod(fullData);
    }

    this.emit('timing-recorded', fullData);

    // Keep only recent timings (last 1000)
    if (this.timings.length > 1000) {
      this.timings = this.timings.slice(-500);
    }
  }

  /**
   * Get timing statistics for a method
   */
  getMethodStats(methodName: string): MethodTimingStats | null {
    return this.stats.get(methodName) || null;
  }

  /**
   * Get all method statistics
   */
  getAllStats(): MethodTimingStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get recent timings
   */
  getRecentTimings(limit: number = 100): MethodTimingData[] {
    return this.timings.slice(-limit);
  }

  /**
   * Get slow methods
   */
  getSlowMethods(threshold: number = this.config.slowMethodThreshold): MethodTimingData[] {
    return this.timings.filter(t => t.duration > threshold);
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.timings = [];
    this.stats.clear();
    logger.info('Method timing data cleared', { component: 'method-timing' });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MethodTimingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Method timing configuration updated', {
      component: 'method-timing',
      config: this.config
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): MethodTimingConfig {
    return { ...this.config };
  }

  private shouldTimeMethod(methodName: string): boolean {
    // Check exclude list
    if (this.config.excludeMethods.includes(methodName)) {
      return false;
    }

    // If include list is specified, only time those methods
    if (this.config.includeMethods && this.config.includeMethods.length > 0) {
      return this.config.includeMethods.includes(methodName);
    }

    return true;
  }

  private updateStats(data: MethodTimingData): void {
    const existing = this.stats.get(data.methodName);
    const durations = this.getMethodDurations(data.methodName);

    if (existing) {
      existing.totalCalls++;
      if (data.success) {
        existing.successfulCalls++;
      } else {
        existing.failedCalls++;
      }
      existing.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      existing.medianDuration = this.calculateMedian(durations);
      existing.p95Duration = this.calculatePercentile(durations, 95);
      existing.p99Duration = this.calculatePercentile(durations, 99);
      existing.minDuration = Math.min(existing.minDuration, data.duration);
      existing.maxDuration = Math.max(existing.maxDuration, data.duration);
      existing.lastExecutionTime = data.endTime;
    } else {
      this.stats.set(data.methodName, {
        methodName: data.methodName,
        totalCalls: 1,
        successfulCalls: data.success ? 1 : 0,
        failedCalls: data.success ? 0 : 1,
        averageDuration: data.duration,
        medianDuration: data.duration,
        p95Duration: data.duration,
        p99Duration: data.duration,
        minDuration: data.duration,
        maxDuration: data.duration,
        lastExecutionTime: data.endTime,
      });
    }
  }

  private getMethodDurations(methodName: string): number[] {
    return this.timings
      .filter(t => t.methodName === methodName)
      .map(t => t.duration)
      .sort((a, b) => a - b);
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private logSlowMethod(data: MethodTimingData): void {
    logger.warn('Slow method detected', {
      component: 'method-timing',
      methodName: data.methodName,
      className: data.className,
      duration: data.duration,
      threshold: this.config.slowMethodThreshold,
      metadata: data.metadata,
    });
  }

  private setupCleanup(): void {
    // Clean up old stats periodically (every hour)
    setInterval(() => {
      this.cleanupOldStats();
    }, 60 * 60 * 1000);
  }

  private cleanupOldStats(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.timings = this.timings.filter(t => t.endTime > cutoffTime);

    // Recalculate stats for remaining data
    this.stats.clear();
    this.timings.forEach(timing => this.updateStats(timing));

    logger.info('Old method timing data cleaned up', {
      component: 'method-timing',
      remainingTimings: this.timings.length
    });
  }
}

/**
 * Timing handle for active timing
 */
export interface TimingHandle {
  end(success?: boolean, error?: string, metadata?: Record<string, any>): void;
}

/**
 * Active timing handle implementation
 */
class ActiveTimingHandle implements TimingHandle {
  constructor(
    private methodName: string,
    private className: string | undefined,
    private startTime: number,
    private startTimePrecise: bigint,
    private initialMetadata: Record<string, any> | undefined,
    private service: MethodTimingService
  ) {}

  end(success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const endTime = Date.now();
    const endTimePrecise = process.hrtime.bigint();
    const duration = Number(endTimePrecise - this.startTimePrecise) / 1_000_000; // Convert to milliseconds

    this.service.recordTiming({
      methodName: this.methodName,
      className: this.className,
      duration,
      startTime: this.startTime,
      endTime,
      success,
      error,
      metadata: { ...this.initialMetadata, ...metadata },
    });
  }
}

/**
 * No-op timing handle for when timing is disabled or filtered out
 */
class NoOpTimingHandle implements TimingHandle {
  end(): void {
    // No-op
  }
}

/**
 * Decorator for automatic method timing
 */
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value;
  const methodName = `${target.constructor.name}.${propertyKey}`;

  descriptor.value = function (...args: any[]) {
    const timingService = getGlobalMethodTimingService();
    const handle = timingService.startTiming(propertyKey, target.constructor.name);

    try {
      const result = originalMethod.apply(this, args);
      if (result instanceof Promise) {
        return result
          .then((res) => {
            handle.end(true);
            return res;
          })
          .catch((err) => {
            handle.end(false, err.message);
            throw err;
          });
      } else {
        handle.end(true);
        return result;
      }
    } catch (error) {
      handle.end(false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
}

/**
 * Manual timing helper function
 */
export function timeMethod<T>(
  methodName: string,
  className: string | undefined,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): T | Promise<T> {
  const timingService = getGlobalMethodTimingService();
  const handle = timingService.startTiming(methodName, className, metadata);

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then((res) => {
          handle.end(true);
          return res;
        })
        .catch((err) => {
          handle.end(false, err.message);
          throw err;
        });
    } else {
      handle.end(true);
      return result;
    }
  } catch (error) {
    handle.end(false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Global instance
let globalMethodTimingService: MethodTimingService | null = null;

/**
 * Get the global method timing service instance
 */
export function getGlobalMethodTimingService(): MethodTimingService {
  if (!globalMethodTimingService) {
    globalMethodTimingService = new MethodTimingService();
  }
  return globalMethodTimingService;
}

/**
 * Set the global method timing service instance
 */
export function setGlobalMethodTimingService(service: MethodTimingService): void {
  globalMethodTimingService = service;
}

// Export singleton instance
export const methodTimingService = getGlobalMethodTimingService();