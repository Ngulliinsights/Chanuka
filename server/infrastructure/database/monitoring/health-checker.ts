/**
 * Health Checker
 *
 * Centralized health checking for database pools.
 * Extracted from pool.ts and monitoring.ts to provide unified health monitoring.
 */

import type { Pool } from 'pg';
import { logger } from '../../observability/core/logger';
import type { CircuitBreakerStrategy } from '../strategies';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PoolHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState?: string;
  circuitBreakerFailures?: number;
  utilizationPercentage: number;
  lastError?: string;
}

export interface HealthCheckConfig {
  name: string;
  maxConnections?: number;
  contentionThreshold?: number; // 0-1, percentage of max connections
  enableCircuitBreakerCheck?: boolean;
}

export interface HealthCheckResult {
  poolName: string;
  status: PoolHealthStatus;
  issues: string[];
  severity: 'healthy' | 'warning' | 'error' | 'critical';
}

// ============================================================================
// Health Checker Class
// ============================================================================

/**
 * HealthChecker
 *
 * Performs health checks on database pools and identifies issues.
 *
 * @example
 * ```typescript
 * const checker = new HealthChecker({
 *   name: 'primary',
 *   maxConnections: 20,
 *   contentionThreshold: 0.8
 * });
 *
 * const result = await checker.check(pool, circuitBreaker);
 * if (!result.status.isHealthy) {
 *   console.log('Issues:', result.issues);
 * }
 * ```
 */
export class HealthChecker {
  private config: Required<HealthCheckConfig>;
  private lastError?: string;

  constructor(config: HealthCheckConfig) {
    this.config = {
      maxConnections: 20,
      contentionThreshold: 0.8,
      enableCircuitBreakerCheck: true,
      ...config,
    };
  }

  /**
   * Perform a health check on a pool
   */
  async check(
    pool: Pool,
    circuitBreaker?: CircuitBreakerStrategy
  ): Promise<HealthCheckResult> {
    try {
      const status = await this.getHealthStatus(pool, circuitBreaker);
      const issues = this.identifyIssues(status);
      const severity = this.determineSeverity(status, issues);

      return {
        poolName: this.config.name,
        status,
        issues,
        severity,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.lastError = errorMessage;

      logger.error({
        poolName: this.config.name,
        error: errorMessage,
      }, 'Health check failed');

      return {
        poolName: this.config.name,
        status: this.createUnhealthyStatus(errorMessage),
        issues: [`Health check failed: ${errorMessage}`],
        severity: 'critical',
      };
    }
  }

  /**
   * Get health status from pool
   */
  private async getHealthStatus(
    pool: Pool,
    circuitBreaker?: CircuitBreakerStrategy
  ): Promise<PoolHealthStatus> {
    const totalConnections = pool.totalCount;
    const idleConnections = pool.idleCount;
    const waitingClients = pool.waitingCount;
    const utilizationPercentage = (totalConnections / this.config.maxConnections) * 100;

    const isHealthy = this.calculateHealthStatus(
      totalConnections,
      waitingClients,
      circuitBreaker
    );

    return {
      isHealthy,
      totalConnections,
      idleConnections,
      waitingClients,
      circuitBreakerState: circuitBreaker?.getState().state,
      circuitBreakerFailures: circuitBreaker?.getState().failures,
      utilizationPercentage,
      lastError: this.lastError,
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateHealthStatus(
    totalConnections: number,
    waitingClients: number,
    circuitBreaker?: CircuitBreakerStrategy
  ): boolean {
    // Check if we have connections
    if (totalConnections === 0) {
      return false;
    }

    // Check for high contention
    const contentionLimit = this.config.maxConnections * this.config.contentionThreshold;
    if (waitingClients >= contentionLimit) {
      return false;
    }

    // Check circuit breaker state
    if (this.config.enableCircuitBreakerCheck && circuitBreaker) {
      const state = circuitBreaker.getState();
      if (state.state === 'open') {
        return false;
      }
    }

    return true;
  }

  /**
   * Identify specific issues with the pool
   */
  private identifyIssues(status: PoolHealthStatus): string[] {
    const issues: string[] = [];

    // Check circuit breaker
    if (status.circuitBreakerState === 'open') {
      issues.push(
        `Circuit breaker is open - too many failures (${status.circuitBreakerFailures} errors)`
      );
    } else if (status.circuitBreakerState === 'half_open') {
      issues.push('Circuit breaker is in half-open state - testing recovery');
    }

    // Check connections
    if (status.totalConnections === 0) {
      issues.push('No active connections available - pool may be exhausted');
    }

    // Check contention
    const contentionRatio = status.totalConnections > 0
      ? status.waitingClients / status.totalConnections
      : 0;

    if (contentionRatio > this.config.contentionThreshold) {
      issues.push(
        `High connection contention - ${status.waitingClients} clients waiting for ${status.totalConnections} connections (${(contentionRatio * 100).toFixed(1)}% ratio)`
      );
    }

    // Check idle connections
    if (status.idleConnections === 0 && status.totalConnections > 0) {
      issues.push('All connections are busy - consider increasing pool size');
    }

    // Check utilization
    if (status.utilizationPercentage > 90) {
      issues.push(
        `High pool utilization - ${status.utilizationPercentage.toFixed(1)}% of max connections`
      );
    }

    // Check for errors
    if (status.lastError) {
      issues.push(`Pool error: ${status.lastError}`);
    }

    return issues;
  }

  /**
   * Determine severity level
   */
  private determineSeverity(
    status: PoolHealthStatus,
    issues: string[]
  ): 'healthy' | 'warning' | 'error' | 'critical' {
    if (issues.length === 0) {
      return 'healthy';
    }

    // Critical: Circuit breaker open or no connections
    if (status.circuitBreakerState === 'open' || status.totalConnections === 0) {
      return 'critical';
    }

    // Error: High contention or multiple issues
    const contentionRatio = status.totalConnections > 0
      ? status.waitingClients / status.totalConnections
      : 0;

    if (contentionRatio > this.config.contentionThreshold || issues.length > 2) {
      return 'error';
    }

    // Warning: Everything else
    return 'warning';
  }

  /**
   * Create an unhealthy status for error cases
   */
  private createUnhealthyStatus(errorMessage: string): PoolHealthStatus {
    return {
      isHealthy: false,
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      utilizationPercentage: 0,
      lastError: errorMessage,
    };
  }

  /**
   * Perform a quick connectivity test
   */
  async testConnection(pool: Pool): Promise<boolean> {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.lastError = errorMessage;

      logger.error({
        poolName: this.config.name,
        error: errorMessage,
      }, 'Connection test failed');

      return false;
    }
  }

  /**
   * Get pool name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get last error
   */
  getLastError(): string | undefined {
    return this.lastError;
  }

  /**
   * Clear last error
   */
  clearLastError(): void {
    this.lastError = undefined;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a health checker with default configuration
 */
export function createHealthChecker(config: HealthCheckConfig): HealthChecker {
  return new HealthChecker(config);
}

/**
 * Create a health checker for production
 */
export function createProductionHealthChecker(
  name: string,
  maxConnections: number = 20
): HealthChecker {
  return new HealthChecker({
    name,
    maxConnections,
    contentionThreshold: 0.8,
    enableCircuitBreakerCheck: true,
  });
}

/**
 * Create a health checker for testing
 */
export function createTestHealthChecker(name: string): HealthChecker {
  return new HealthChecker({
    name,
    maxConnections: 5,
    contentionThreshold: 0.9,
    enableCircuitBreakerCheck: false,
  });
}
