/**
 * ML Service Feature Flag Configuration
 * 
 * Configuration for enabling gradual rollout of the real ML service.
 */

import { featureFlagsService } from '@/infrastructure/migration/feature-flags.service.js';
import { logger  } from '@shared/core/src/index.js';

/**
 * Initialize ML service feature flag with default settings
 */
export function initializeMLFeatureFlag(): void {
  try {
    // Configure the ML service migration feature flag
    featureFlagsService.updateFlag('utilities-ml-service-migration', {
      name: 'utilities-ml-service-migration',
      enabled: true,
      rolloutPercentage: parseInt(process.env.ML_SERVICE_ROLLOUT_PERCENTAGE || '10', 10), // Start with 10%
      fallbackEnabled: true,
      conditions: {
        environment: process.env.NODE_ENV,
        userGroups: ['beta_testers', 'internal_users'] // Optional: limit to specific user groups
      }
    });

    logger.info('ML service feature flag initialized', {
      component: 'analytics',
      operation: 'initializeMLFeatureFlag',
      rolloutPercentage: process.env.ML_SERVICE_ROLLOUT_PERCENTAGE || '10',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    logger.error('Failed to initialize ML service feature flag:', {
      component: 'analytics',
      operation: 'initializeMLFeatureFlag'
    }, error instanceof Error ? error : { message: String(error) });
  }
}

/**
 * Enable gradual rollout of ML service
 */
export async function enableMLServiceRollout(percentage: number): Promise<void> {
  try {
    await featureFlagsService.enableGradualRollout('utilities-ml-service-migration', percentage);
    
    logger.info('ML service rollout updated', {
      component: 'analytics',
      operation: 'enableMLServiceRollout',
      rolloutPercentage: percentage
    });
  } catch (error) {
    logger.error('Failed to enable ML service rollout:', {
      component: 'analytics',
      operation: 'enableMLServiceRollout',
      percentage
    }, error instanceof Error ? error : { message: String(error) });
    throw error;
  }
}

/**
 * Rollback ML service to mock implementation
 */
export async function rollbackMLService(): Promise<void> {
  try {
    await featureFlagsService.rollbackFeature('utilities-ml-service-migration');
    
    logger.info('ML service rolled back to mock implementation', {
      component: 'analytics',
      operation: 'rollbackMLService'
    });
  } catch (error) {
    logger.error('Failed to rollback ML service:', {
      component: 'analytics',
      operation: 'rollbackMLService'
    }, error instanceof Error ? error : { message: String(error) });
    throw error;
  }
}

/**
 * Get current ML service rollout status
 */
export function getMLServiceStatus(): {
  enabled: boolean;
  rolloutPercentage: number;
  fallbackEnabled: boolean;
} {
  try {
    const flag = featureFlagsService.getFlag('utilities-ml-service-migration');
    
    return {
      enabled: flag?.enabled || false,
      rolloutPercentage: flag?.rolloutPercentage || 0,
      fallbackEnabled: flag?.fallbackEnabled || true
    };
  } catch (error) {
    logger.error('Failed to get ML service status:', {
      component: 'analytics',
      operation: 'getMLServiceStatus'
    }, error instanceof Error ? error : { message: String(error) });
    
    return {
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    };
  }
}
