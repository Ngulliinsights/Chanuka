/**
 * Health Validator for Migration System
 * 
 * Handles all health validation logic with progressive thresholds
 */

import { HealthMetrics, MigrationConfig } from './types';


export class HealthValidator {
  private readonly config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  /**
   * Get error threshold based on current traffic percentage
   * More lenient thresholds at lower traffic percentages allow for safe exploration
   */
  getErrorThreshold(trafficPercentage: number): number {
    if (trafficPercentage <= 10) return 0.02;   // 2% during initial canary
    if (trafficPercentage <= 25) return 0.015;  // 1.5% during early rollout
    if (trafficPercentage <= 50) return 0.01;   // 1% during mid rollout
    return 0.005;                                // 0.5% for production traffic
  }

  /**
   * Get response time threshold based on traffic percentage
   */
  getResponseTimeThreshold(trafficPercentage: number): number {
    if (trafficPercentage <= 10) return 800;
    if (trafficPercentage <= 25) return 600;
    if (trafficPercentage <= 50) return 500;
    return 400;
  }

  /**
   * Get connection loss threshold with increasing leniency during active migration
   * Natural for connections to transition between services during migration
   */
  getConnectionLossThreshold(trafficPercentage: number): number {
    if (trafficPercentage <= 25) return 0.95;  // 5% loss tolerated
    if (trafficPercentage <= 50) return 0.90;  // 10% during active migration
    if (trafficPercentage <= 75) return 0.85;  // 15% during major migration
    return 0.80;                                // 20% during final transition
  }

  /**
   * Validate all health metrics against thresholds
   */
  validateHealth(
    metrics: HealthMetrics,
    trafficPercentage: number,
    baselineConnections: number
  ): { isHealthy: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check error rate with progressive threshold
    const errorThreshold = this.getErrorThreshold(trafficPercentage);
    if (metrics.errorRate > errorThreshold) {
      errors.push(
        `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(errorThreshold * 100).toFixed(2)}%`
      );
    }

    // Check response time with progressive threshold
    const responseThreshold = this.getResponseTimeThreshold(trafficPercentage);
    if (metrics.responseTime > responseThreshold) {
      errors.push(
        `Response time ${metrics.responseTime.toFixed(0)}ms exceeds threshold ${responseThreshold}ms`
      );
    }

    // Check connection stability with migration-aware threshold
    const lossThreshold = this.getConnectionLossThreshold(trafficPercentage);
    if (metrics.connectionCount < baselineConnections * lossThreshold) {
      const lossPercentage = ((baselineConnections - metrics.connectionCount) / baselineConnections * 100).toFixed(1);
      errors.push(
        `Connection loss ${lossPercentage}% exceeds threshold ${((1 - lossThreshold) * 100).toFixed(1)}%`
      );
    }

    // Check message drop rate (strict threshold regardless of traffic)
    if (metrics.messageDropRate > 0.01) {
      errors.push(
        `Message drop rate ${(metrics.messageDropRate * 100).toFixed(2)}% exceeds 1% threshold`
      );
    }

    return {
      isHealthy: errors.length === 0,
      errors
    };
  }

  /**
   * Get the configured validation interval for monitoring
   */
  getValidationInterval(): number {
    return this.config.validationInterval;
  }

  /**
   * Get the configured migration timeout
   */
  getMigrationTimeout(): number {
    return this.config.migrationTimeout;
  }
}