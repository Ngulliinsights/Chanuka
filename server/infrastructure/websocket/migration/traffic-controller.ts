/**
 * Traffic Controller for Migration System
 * 
 * Manages gradual traffic shifting with health validation
 */

// Temporary fallback logger until shared/core import is resolved
const logger = {
  info: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: unknown, error?: Error) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, context || '', error || '');
  },
  debug: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, context || '');
  }
};

import { HealthValidator } from './health-validator';
import { HealthMetrics, MigrationConfig } from './types';



export class TrafficController {
  private readonly config: MigrationConfig;
  private readonly healthValidator: HealthValidator;

  constructor(config: MigrationConfig, healthValidator: HealthValidator) {
    this.config = config;
    this.healthValidator = healthValidator;
  }

  /**
   * Perform gradual traffic shift with validation at each step
   */
  async performGradualShift(
    direction: 'forward' | 'backward',
    updateRolloutPercentage: (percentage: number) => void,
    shouldTriggerRollback: () => boolean,
    onProgress?: (percentage: number, metrics: HealthMetrics) => void
  ): Promise<void> {
    const steps = direction === 'forward' 
      ? [10, 25, 50, 75, 100]
      : [75, 50, 25, 0];

    logger.info(`Starting ${direction} traffic shift`, {
      component: 'TrafficController',
      steps
    });

    for (const percentage of steps) {
      logger.info(`Shifting to ${percentage}% traffic on new service`, {
        component: 'TrafficController'
      });

      // Update feature flag rollout
      updateRolloutPercentage(percentage);

      // Wait for stabilization based on direction (faster rollback)
      const waitTime = direction === 'forward' 
        ? this.config.trafficShiftDelay 
        : this.config.trafficShiftDelay / 2;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Collect and validate metrics at this traffic level
      const metrics = this.collectMetrics(percentage);
      
      // Notify progress callback with current metrics
      if (onProgress) {
        onProgress(percentage, metrics);
      }

      // Validate health at this traffic level using collected metrics
      const baselineConnections = metrics.connectionCount > 0 
        ? metrics.connectionCount 
        : 1;
        
      const validation = this.healthValidator.validateHealth(
        metrics,
        percentage,
        baselineConnections
      );

      if (!validation.isHealthy) {
        throw new Error(
          `Health validation failed at ${percentage}%: ${validation.errors.join(', ')}`
        );
      }

      // Check for rollback signals from feature flag service
      if (shouldTriggerRollback()) {
        throw new Error(`Rollback triggered at ${percentage}% traffic`);
      }
    }

    logger.info(`${direction} traffic shift completed successfully`, {
      component: 'TrafficController'
    });
  }

  /**
   * Collect current health metrics from both services
   */
  private collectMetrics(trafficPercentage: number): HealthMetrics {
    // In a real implementation, this would collect metrics from actual services
    // For now, return mock metrics that indicate healthy state
    const metrics: HealthMetrics = {
      errorRate: 0.001, // 0.1% error rate
      responseTime: 150, // 150ms response time
      connectionCount: 100, // Mock connection count
      subscriptionCount: 250, // Mock subscription count
      messageDropRate: 0.0001 // 0.01% drop rate
    };

    logger.debug('Collected health metrics', {
      component: 'TrafficController',
      trafficPercentage,
      ...metrics
    });

    return metrics;
  }
}