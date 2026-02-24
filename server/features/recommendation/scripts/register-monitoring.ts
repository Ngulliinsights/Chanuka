/**
 * Register Recommendation Engine with Monitoring System
 * 
 * This script registers the recommendation engine as a monitored feature
 * and sets up alert rules for performance and error tracking.
 */

import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';
import { logger } from '@server/infrastructure/observability';

const FEATURE_ID = 'recommendation-engine';

export async function registerRecommendationMonitoring(): Promise<void> {
  try {
    logger.info('Registering recommendation engine with monitoring system...');
    
    // Register the feature
    await integrationMonitor.registerFeature({
      id: FEATURE_ID,
      name: 'recommendation-engine',
      displayName: 'Recommendation Engine',
      description: 'Personalized bill recommendations using collaborative and content-based filtering',
      version: '1.0.0',
      enabled: true,
      healthStatus: 'unknown',
      dependencies: ['database', 'cache'],
      endpoints: [
        '/api/recommendation/personalized',
        '/api/recommendation/similar/:bill_id',
        '/api/recommendation/trending',
        '/api/recommendation/collaborative',
        '/api/recommendation/track-engagement',
      ],
      metadata: {
        algorithms: ['collaborative-filtering', 'content-based-filtering'],
        caching: 'redis',
        targetResponseTime: 200,
      },
    });
    
    logger.info('Recommendation engine registered successfully');
    
    // Add alert rules
    logger.info('Setting up alert rules...');
    
    // Response time alert (> 200ms)
    await integrationMonitor.addAlertRule({
      featureId: FEATURE_ID,
      name: 'High Response Time',
      description: 'Average response time exceeds 200ms',
      metric: 'avg_response_time',
      operator: 'gt',
      threshold: '200',
      severity: 'medium',
      enabled: true,
      cooldown: 15, // 15 minutes
    });
    
    // Error rate alert (> 5%)
    await integrationMonitor.addAlertRule({
      featureId: FEATURE_ID,
      name: 'High Error Rate',
      description: 'Error rate exceeds 5%',
      metric: 'error_rate',
      operator: 'gt',
      threshold: '0.05',
      severity: 'high',
      enabled: true,
      cooldown: 10, // 10 minutes
    });
    
    // P95 response time alert (> 500ms)
    await integrationMonitor.addAlertRule({
      featureId: FEATURE_ID,
      name: 'High P95 Response Time',
      description: 'P95 response time exceeds 500ms',
      metric: 'p95_response_time',
      operator: 'gt',
      threshold: '500',
      severity: 'medium',
      enabled: true,
      cooldown: 15, // 15 minutes
    });
    
    // Failed requests alert (> 10 in a window)
    await integrationMonitor.addAlertRule({
      featureId: FEATURE_ID,
      name: 'High Failed Requests',
      description: 'Failed requests exceed threshold',
      metric: 'failed_requests',
      operator: 'gt',
      threshold: '10',
      severity: 'high',
      enabled: true,
      cooldown: 10, // 10 minutes
    });
    
    logger.info('Alert rules configured successfully');
    
    // Log initial event
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'system',
      'Recommendation engine monitoring initialized',
      {
        timestamp: new Date(),
        version: '1.0.0',
      }
    );
    
    logger.info('Recommendation engine monitoring setup complete');
  } catch (error) {
    logger.error('Failed to register recommendation engine monitoring', { error });
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  registerRecommendationMonitoring()
    .then(() => {
      logger.info('Monitoring registration complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Monitoring registration failed', { error });
      process.exit(1);
    });
}
