import { EventEmitter } from 'events';
import { BaseError, ErrorDomain, ErrorSeverity } from '../../primitives/errors';
import { SystemError } from '../errors/specialized';

export interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  rejected: number;
  lastFailureTime: Date | undefined;
  lastSuccessTime: Date | undefined;
  state: CircuitBreakerState;
  totalCalls: number;
  slowCalls: number;
  averageResponseTime: number;
  failureRate: number;
  slowCallRate: number;
  currentThreshold: number;
}

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  halfOpenRetries?: number;
  windowSize?: number;
  slowCallDurationThreshold?: number;
  slowCallRateThreshold?: number;
  minimumThreshold?: number;
  maximumThreshold?: number;
  thresholdAdjustmentFactor?: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Enhanced CircuitBreaker with adaptive thresholds and comprehensive metrics
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private rejectedCount: number = 0;
  private totalCalls: number = 0;
  private slowCalls: number = 0;
  private lastStateChange: Date = new Date();
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private responseTimeWindow: number[] = [];
  private currentThreshold: number;
  private readonly name: string;

  constructor(private readonly options: CircuitBreakerOptions = {}) {
    super();
    this.name = options.name || 'default';
    this.currentThreshold = options.failureThreshold || 5;

    // Set defaults for all options
    const defaults: Required<CircuitBreakerOptions> = {
      name: 'default',
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      halfOpenRetries: 3,
      windowSize: 100,
      slowCallDurationThreshold: 1000,
      slowCallRateThreshold: 50,
      minimumThreshold: 2,
      maximumThreshold: 20,
      thresholdAdjustmentFactor: 1.5,
    };

    this.options = { ...defaults, ...options };
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (!this.shouldAttemptReset()) {
        this.rejectedCount++;
        throw new SystemError('Circuit breaker is open', {
          code: 'CIRCUIT_BREAKER_OPEN',
          details: {
            breakerName: this.name,
            metrics: this.getMetrics(),
          },
        });
      }
      this.transitionToHalfOpen();
    }

    const startTime = Date.now();
    try {
      const result = await Promise.race([
        action(),
        this.createTimeout(this.options.slowCallDurationThreshold!),
      ]);

      const duration = Date.now() - startTime;
      await this.recordSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordFailure(duration);

      if (error instanceof Error) {
        throw new SystemError(error.message, {
          code: 'CIRCUIT_BREAKER_FAILURE',
          cause: error,
          details: {
            breakerName: this.name,
            duration,
            metrics: this.getMetrics(),
          },
        });
      }
      throw error;
    }
  }

  private createTimeout(duration: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), duration)
    );
  }

  private async recordSuccess(duration: number): Promise<void> {
    this.updateResponseTimeWindow(duration);
    this.lastSuccessTime = new Date();

    if (duration > this.options.slowCallDurationThreshold!) {
      this.slowCalls++;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold!) {
        await this.reset();
      }
    }

    this.emit('success', {
      duration,
      metrics: this.getMetrics(),
    });
  }

  private async recordFailure(duration: number): Promise<void> {
    this.updateResponseTimeWindow(duration);
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.shouldOpen()) {
      await this.transitionToOpen();
    }

    this.emit('failure', {
      duration,
      metrics: this.getMetrics(),
    });
  }

  private updateResponseTimeWindow(duration: number): void {
    this.responseTimeWindow.push(duration);
    if (this.responseTimeWindow.length > this.options.windowSize!) {
      this.responseTimeWindow.shift();
    }
  }

  private shouldOpen(): boolean {
    const failureRate = (this.failures / this.totalCalls) * 100;
    const slowCallRate = (this.slowCalls / this.totalCalls) * 100;

    return (
      this.failures >= this.currentThreshold ||
      slowCallRate >= this.options.slowCallRateThreshold! ||
      failureRate >= 50
    );
  }

  private shouldAttemptReset(): boolean {
    return (
      Date.now() - this.lastStateChange.getTime() >= this.options.timeout!
    );
  }

  private async transitionToOpen(): Promise<void> {
    this.state = CircuitBreakerState.OPEN;
    this.lastStateChange = new Date();
    this.adjustThreshold(true);

    const metrics = this.getMetrics();
    console.warn('Circuit breaker transitioned to OPEN state', {
      module: 'CircuitBreaker',
      metrics,
      breakerName: this.name
    });
    this.emit('open', { metrics });
  }

  private async transitionToHalfOpen(): Promise<void> {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successes = 0;
    this.lastStateChange = new Date();

    const metrics = this.getMetrics();
    console.info('Circuit breaker transitioned to HALF-OPEN state', {
      module: 'CircuitBreaker',
      metrics,
      breakerName: this.name
    });
    this.emit('half-open', { metrics });
  }

  private async reset(): Promise<void> {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.slowCalls = 0;
    this.lastStateChange = new Date();
    this.adjustThreshold(false);

    const metrics = this.getMetrics();
    console.info('Circuit breaker transitioned to CLOSED state', {
      module: 'CircuitBreaker',
      metrics,
      breakerName: this.name
    });
    this.emit('close', { metrics });
  }

  private adjustThreshold(increase: boolean): void {
    if (increase) {
      this.currentThreshold = Math.min(
        this.currentThreshold * this.options.thresholdAdjustmentFactor!,
        this.options.maximumThreshold!
      );
    } else {
      this.currentThreshold = Math.max(
        this.currentThreshold / this.options.thresholdAdjustmentFactor!,
        this.options.minimumThreshold!
      );
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    const totalCalls = Math.max(this.totalCalls, 1); // Prevent division by zero
    return {
      failures: this.failures,
      successes: this.successes,
      rejected: this.rejectedCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
      totalCalls: this.totalCalls,
      slowCalls: this.slowCalls,
      averageResponseTime:
        this.responseTimeWindow.reduce((a, b) => a + b, 0) /
        this.responseTimeWindow.length,
      failureRate: (this.failures / totalCalls) * 100,
      slowCallRate: (this.slowCalls / totalCalls) * 100,
      currentThreshold: this.currentThreshold,
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force the circuit breaker to a specific state (for testing/admin purposes)
   */
  forceState(state: CircuitBreakerState): void {
    this.state = state;
    this.lastStateChange = new Date();
    this.emit('state-forced', { state, metrics: this.getMetrics() });
  }

  /**
   * Reset all metrics (for testing purposes)
   */
  resetMetrics(): void {
    this.failures = 0;
    this.successes = 0;
    this.rejectedCount = 0;
    this.totalCalls = 0;
    this.slowCalls = 0;
    this.lastFailureTime = undefined as any;
    this.lastSuccessTime = undefined as any;
    this.responseTimeWindow = [];
    this.currentThreshold = this.options.failureThreshold || 5;
  }
}