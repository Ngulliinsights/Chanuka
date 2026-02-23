/**
 * Circuit Breaker Monitoring and Error Correlation
 *
 * Provides monitoring capabilities for circuit breaker states and integrates
 * with the error correlation system for comprehensive observability.
 */

import { logger } from '@client/lib/utils/logger';

import { BaseError, ErrorDomain, ErrorSeverity } from '../error';
import { getCircuitBreakerStats } from './circuit-breaker/core';
import type { CircuitBreakerState, CircuitBreakerEvent, ServiceHealthStatus, ErrorCorrelation } from './circuit-breaker/types';

// Re-export types for convenience
export type { CircuitBreakerState, CircuitBreakerEvent, ServiceHealthStatus, ErrorCorrelation };

/**
 * Circuit breaker monitoring and error correlation manager
 */
export class CircuitBreakerMonitor {
  private eventListeners: Map<string, ((event: CircuitBreakerEvent) => void)[]> = new Map();
  private errorCorrelations: Map<string, ErrorCorrelation> = new Map();
  private serviceHealthCache: Map<string, ServiceHealthStatus> = new Map();
  private monitoringInterval?: number;
  private isMonitoring = false;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Starts monitoring circuit breaker states
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateServiceHealth();
    }, intervalMs);

    logger.info('Circuit breaker monitoring started', {
      component: 'CircuitBreakerMonitor',
      intervalMs,
    });
  }

  /**
   * Stops monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;

    logger.info('Circuit breaker monitoring stopped', {
      component: 'CircuitBreakerMonitor',
    });
  }

  /**
   * Records a circuit breaker event
   */
  recordEvent(event: CircuitBreakerEvent): void {
    logger.info('Circuit breaker event recorded', {
      component: 'CircuitBreakerMonitor',
      serviceName: event.serviceName,
      state: event.state,
      metrics: event.metrics,
      correlationId: event.correlationId,
    });

    // Update service health cache
    this.updateServiceHealthFromEvent(event);

    // Notify listeners
    const listeners = this.eventListeners.get(event.serviceName) || [];
    const globalListeners = this.eventListeners.get('*') || [];

    [...listeners, ...globalListeners].forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Circuit breaker event listener error', {
          component: 'CircuitBreakerMonitor',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle state-specific actions
    this.handleStateChange(event);
  }

  /**
   * Records an error for correlation tracking
   */
  recordError(error: BaseError): void {
    const correlationId = error.metadata.correlationId;
    if (!correlationId) {
      return;
    }

    let correlation = this.errorCorrelations.get(correlationId);

    if (!correlation) {
      correlation = {
        correlationId,
        errors: [],
        services: [],
        startTime: new Date(),
        resolved: false,
        recoveryAttempts: 0,
      };
      this.errorCorrelations.set(correlationId, correlation);
    }

    correlation.errors.push(error);

    // Extract service name from error context
    const serviceName = error.metadata.context?.serviceName as string;
    if (serviceName && !correlation.services.includes(serviceName)) {
      correlation.services.push(serviceName);
    }

    logger.debug('Error recorded for correlation', {
      component: 'CircuitBreakerMonitor',
      correlationId,
      errorCode: error.code,
      serviceName,
      totalErrors: correlation.errors.length,
    });

    // Auto-resolve old correlations
    this.cleanupOldCorrelations();
  }

  /**
   * Marks an error correlation as resolved
   */
  resolveCorrelation(correlationId: string): void {
    const correlation = this.errorCorrelations.get(correlationId);
    if (correlation) {
      correlation.resolved = true;
      correlation.endTime = new Date();

      logger.info('Error correlation resolved', {
        component: 'CircuitBreakerMonitor',
        correlationId,
        duration: correlation.endTime.getTime() - correlation.startTime.getTime(),
        totalErrors: correlation.errors.length,
        services: correlation.services,
      });
    }
  }

  /**
   * Records a recovery attempt
   */
  recordRecoveryAttempt(correlationId: string, success: boolean): void {
    const correlation = this.errorCorrelations.get(correlationId);
    if (correlation) {
      correlation.recoveryAttempts++;

      if (success) {
        this.resolveCorrelation(correlationId);
      }

      logger.info('Recovery attempt recorded', {
        component: 'CircuitBreakerMonitor',
        correlationId,
        success,
        totalAttempts: correlation.recoveryAttempts,
      });
    }
  }

  /**
   * Gets current service health status
   */
  getServiceHealth(serviceName?: string): ServiceHealthStatus[] {
    if (serviceName) {
      const health = this.serviceHealthCache.get(serviceName);
      return health ? [health] : [];
    }

    return Array.from(this.serviceHealthCache.values());
  }

  /**
   * Gets error correlations
   */
  getErrorCorrelations(resolved?: boolean): ErrorCorrelation[] {
    const correlations = Array.from(this.errorCorrelations.values());

    if (resolved !== undefined) {
      return correlations.filter(c => c.resolved === resolved);
    }

    return correlations;
  }

  /**
   * Gets circuit breaker statistics
   */
  getCircuitBreakerStatistics(): Record<string, CircuitBreakerState> {
    return getCircuitBreakerStats();
  }

  /**
   * Adds an event listener for circuit breaker events
   */
  addEventListener(
    serviceName: string | '*',
    listener: (event: CircuitBreakerEvent) => void
  ): void {
    const listeners = this.eventListeners.get(serviceName) || [];
    listeners.push(listener);
    this.eventListeners.set(serviceName, listeners);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(
    serviceName: string | '*',
    listener: (event: CircuitBreakerEvent) => void
  ): void {
    const listeners = this.eventListeners.get(serviceName) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(serviceName, listeners);
    }
  }

  /**
   * Gets monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    servicesMonitored: number;
    activeCorrelations: number;
    totalEvents: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      servicesMonitored: this.serviceHealthCache.size,
      activeCorrelations: this.getErrorCorrelations(false).length,
      totalEvents: Array.from(this.eventListeners.values()).reduce(
        (total, listeners) => total + listeners.length,
        0
      ),
    };
  }

  /**
   * Private methods
   */
  private updateServiceHealth(): void {
    const stats = getCircuitBreakerStats();

    Object.entries(stats).forEach(([serviceName, state]) => {
      const health: ServiceHealthStatus = {
        serviceName,
        healthy: state.state === 'closed',
        state: state.state as 'open' | 'closed' | 'half-open',
        lastFailure: state.lastFailureTime ? new Date(state.lastFailureTime) : undefined,
        lastSuccess: (state as CircuitBreakerState).lastSuccessTime
          ? new Date((state as CircuitBreakerState).lastSuccessTime!)
          : undefined,
        failureRate: state.failureRate || 0,
        averageResponseTime: state.averageResponseTime || 0,
        totalRequests: (state.failures || 0) + (state.successes || 0),
        reason:
          state.state === 'open' ? `Circuit breaker open (${state.failures} failures)` : undefined,
      };

      this.serviceHealthCache.set(serviceName, health);
    });
  }

  private updateServiceHealthFromEvent(event: CircuitBreakerEvent): void {
    const health: ServiceHealthStatus = {
      serviceName: event.serviceName,
      healthy: event.state === 'closed',
      state: event.state,
      failureRate: event.metrics.failureRate,
      averageResponseTime: event.metrics.averageResponseTime,
      totalRequests: event.metrics.failures + event.metrics.successes,
      reason:
        event.state === 'open'
          ? `Circuit breaker open (${event.metrics.failures} failures)`
          : undefined,
    };

    this.serviceHealthCache.set(event.serviceName, health);
  }

  private handleStateChange(event: CircuitBreakerEvent): void {
    switch (event.state) {
      case 'open':
        this.handleCircuitBreakerOpen(event);
        break;
      case 'half-open':
        this.handleCircuitBreakerHalfOpen(event);
        break;
      case 'closed':
        this.handleCircuitBreakerClosed(event);
        break;
    }
  }

  private handleCircuitBreakerOpen(event: CircuitBreakerEvent): void {
    logger.warn('Circuit breaker opened', {
      component: 'CircuitBreakerMonitor',
      serviceName: event.serviceName,
      metrics: event.metrics,
    });

    // Create error for circuit breaker opening
    const error = new BaseError(`Circuit breaker opened for ${event.serviceName}`, {
      statusCode: 503,
      code: 'CIRCUIT_BREAKER_OPENED',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      correlationId: event.correlationId,
      context: {
        serviceName: event.serviceName,
        metrics: event.metrics,
      },
      retryable: true,
    });

    if (event.correlationId) {
      this.recordError(error);
    }
  }

  private handleCircuitBreakerHalfOpen(event: CircuitBreakerEvent): void {
    logger.info('Circuit breaker half-open', {
      component: 'CircuitBreakerMonitor',
      serviceName: event.serviceName,
      metrics: event.metrics,
    });

    if (event.correlationId) {
      this.recordRecoveryAttempt(event.correlationId, false);
    }
  }

  private handleCircuitBreakerClosed(event: CircuitBreakerEvent): void {
    logger.info('Circuit breaker closed', {
      component: 'CircuitBreakerMonitor',
      serviceName: event.serviceName,
      metrics: event.metrics,
    });

    if (event.correlationId) {
      this.recordRecoveryAttempt(event.correlationId, true);
    }
  }

  private cleanupOldCorrelations(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const [correlationId, correlation] of this.errorCorrelations.entries()) {
      const age = now - correlation.startTime.getTime();
      if (age > maxAge || (correlation.resolved && age > 60 * 60 * 1000)) {
        // 1 hour for resolved
        this.errorCorrelations.delete(correlationId);
      }
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopMonitoring();
    this.eventListeners.clear();
    this.errorCorrelations.clear();
    this.serviceHealthCache.clear();
  }
}

/**
 * Global circuit breaker monitor instance
 */
export const circuitBreakerMonitor = new CircuitBreakerMonitor();

/**
 * Convenience functions
 */
export function recordCircuitBreakerEvent(event: CircuitBreakerEvent): void {
  circuitBreakerMonitor.recordEvent(event);
}

export function recordError(error: BaseError): void {
  circuitBreakerMonitor.recordError(error);
}

export function getServiceHealth(serviceName?: string): ServiceHealthStatus[] {
  return circuitBreakerMonitor.getServiceHealth(serviceName);
}

export function getErrorCorrelations(resolved?: boolean): ErrorCorrelation[] {
  return circuitBreakerMonitor.getErrorCorrelations(resolved);
}

export function getMonitoringStatus() {
  return circuitBreakerMonitor.getMonitoringStatus();
}
