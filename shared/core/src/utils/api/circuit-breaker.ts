/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides resilience against cascading failures by temporarily stopping
 * requests to failing services and allowing them to recover.
 */

import { logger } from '../../observability/logging';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying half-open (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  successThreshold: number; // Number of successes needed to close from half-open
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {
    if (!config.name) {
      config.name = `circuit-${Date.now()}`;
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name}`,
          'CIRCUIT_OPEN'
        );
      }
      // Transition to half-open
      this.state = 'half-open';
      logger.info(`Circuit breaker ${this.config.name} transitioning to HALF-OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        // Close the circuit
        this.reset();
        logger.info(`Circuit breaker ${this.config.name} CLOSED after ${this.successes} successes`);
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(_error: Error): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    // Clean up old failures outside monitoring period
    this.cleanupOldFailures();

    if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      // Open the circuit
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      logger.warn(`Circuit breaker ${this.config.name} OPENED after ${this.failures} failures`);
    } else if (this.state === 'half-open') {
      // Go back to open state
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.successes = 0; // Reset success count
      logger.warn(`Circuit breaker ${this.config.name} returned to OPEN from HALF-OPEN`);
    }
  }

  /**
   * Clean up failures outside the monitoring period
   */
  private cleanupOldFailures(): void {
    if (!this.lastFailureTime) return;

    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    if (this.lastFailureTime < cutoffTime) {
      this.failures = 1; // Keep current failure
    }
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = 0;
    logger.info(`Circuit breaker ${this.config.name} manually reset to CLOSED`);
  }

  /**
   * Force the circuit breaker to open
   */
  open(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    logger.warn(`Circuit breaker ${this.config.name} manually opened`);
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      ...(this.lastFailureTime !== undefined && { lastFailureTime: this.lastFailureTime }),
      ...(this.lastSuccessTime !== undefined && { lastSuccessTime: this.lastSuccessTime }),
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Check if the circuit breaker can accept requests
   */
  canExecute(): boolean {
    return this.state === 'closed' ||
           (this.state === 'open' && Date.now() >= this.nextAttemptTime);
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ ...config, name });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Default circuit breaker configurations
 */
export const DEFAULT_CIRCUIT_CONFIGS = {
  API_ENDPOINT: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 3,
  } as CircuitBreakerConfig,

  EXTERNAL_SERVICE: {
    failureThreshold: 3,
    recoveryTimeout: 120000, // 2 minutes
    monitoringPeriod: 600000, // 10 minutes
    successThreshold: 2,
  } as CircuitBreakerConfig,

  DATABASE: {
    failureThreshold: 10,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 180000, // 3 minutes
    successThreshold: 5,
  } as CircuitBreakerConfig,
} as const;



