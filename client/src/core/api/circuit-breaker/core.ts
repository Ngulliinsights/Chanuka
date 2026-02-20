/**
 * Circuit Breaker Core Implementation
 * 
 * Extracted to prevent circular dependencies.
 * This module contains the core circuit breaker logic.
 */

import type { CircuitBreakerState, CircuitBreakerConfig } from './types';

export class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      halfOpenMaxCalls: 3,
      ...config,
    };
  }

  private getServiceKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return url;
    }
  }

  private getState(serviceKey: string): CircuitBreakerState {
    if (!this.states.has(serviceKey)) {
      this.states.set(serviceKey, {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        failures: 0,
        successes: 0,
        rejected: 0,
        failureRate: 0,
        averageResponseTime: 0,
      });
    }
    return this.states.get(serviceKey)!;
  }

  private updateState(serviceKey: string, state: Partial<CircuitBreakerState>): void {
    const currentState = this.getState(serviceKey);
    this.states.set(serviceKey, { ...currentState, ...state });
  }

  canExecute(url: string): { allowed: boolean; reason?: string } {
    const serviceKey = this.getServiceKey(url);
    const state = this.getState(serviceKey);
    const now = Date.now();

    switch (state.state) {
      case 'closed':
        return { allowed: true };

      case 'open':
        if (state.nextRetryTime && now >= state.nextRetryTime) {
          this.updateState(serviceKey, {
            state: 'half-open',
            successCount: 0,
          });
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Circuit breaker is open for ${serviceKey}. Next retry at ${new Date(state.nextRetryTime || 0).toISOString()}`,
        };

      case 'half-open':
        if ((state.successCount || 0) < this.config.halfOpenMaxCalls) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Circuit breaker is half-open and has reached max calls for ${serviceKey}`,
        };

      default:
        return { allowed: true };
    }
  }

  recordSuccess(url: string): void {
    const serviceKey = this.getServiceKey(url);
    const state = this.getState(serviceKey);

    const newSuccesses = state.successes + 1;
    const totalRequests = state.failures + newSuccesses;
    const newFailureRate = totalRequests > 0 ? (state.failures / totalRequests) * 100 : 0;

    if (state.state === 'half-open') {
      const newSuccessCount = (state.successCount || 0) + 1;
      if (newSuccessCount >= this.config.halfOpenMaxCalls) {
        this.updateState(serviceKey, {
          state: 'closed',
          failureCount: 0,
          successCount: 0,
          lastFailureTime: undefined,
          nextRetryTime: undefined,
          successes: newSuccesses,
          failureRate: newFailureRate,
        });
      } else {
        this.updateState(serviceKey, {
          successCount: newSuccessCount,
          successes: newSuccesses,
          failureRate: newFailureRate,
        });
      }
    } else if (state.state === 'closed') {
      this.updateState(serviceKey, {
        failureCount: 0,
        successes: newSuccesses,
        failureRate: newFailureRate,
      });
    }
  }

  recordFailure(url: string): void {
    const serviceKey = this.getServiceKey(url);
    const state = this.getState(serviceKey);
    const now = Date.now();

    const newFailureCount = (state.failureCount || 0) + 1;
    const newFailures = state.failures + 1;
    const totalRequests = newFailures + state.successes;
    const newFailureRate = totalRequests > 0 ? (newFailures / totalRequests) * 100 : 0;

    if (state.state === 'half-open') {
      this.updateState(serviceKey, {
        state: 'open',
        failureCount: newFailureCount,
        lastFailureTime: now,
        nextRetryTime: now + this.config.recoveryTimeout,
        successCount: 0,
        failures: newFailures,
        failureRate: newFailureRate,
      });
    } else if (newFailureCount >= this.config.failureThreshold) {
      this.updateState(serviceKey, {
        state: 'open',
        failureCount: newFailureCount,
        lastFailureTime: now,
        nextRetryTime: now + this.config.recoveryTimeout,
        failures: newFailures,
        failureRate: newFailureRate,
      });
    } else {
      this.updateState(serviceKey, {
        failureCount: newFailureCount,
        lastFailureTime: now,
        failures: newFailures,
        failureRate: newFailureRate,
      });
    }
  }

  getStats(): Record<string, CircuitBreakerState> {
    return Object.fromEntries(this.states.entries());
  }
}

// Global circuit breaker instance
export const circuitBreaker = new CircuitBreaker();

// Export utility function
export function getCircuitBreakerStats(): Record<string, CircuitBreakerState> {
  return circuitBreaker.getStats();
}
