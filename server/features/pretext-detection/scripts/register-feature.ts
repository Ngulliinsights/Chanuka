/**
 * Register Pretext Detection Feature with Monitoring System
 * 
 * Run this script to register the pretext detection feature with the monitoring system
 */

import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';
import { logger } from '@server/infrastructure/observability';

async function registerPretextDetection() {
  try {
    logger.info('Registering pretext detection feature with monitoring system...');

    await integrationMonitor.registerFeature({
      id: 'pretext-detection',
      name: 'Pretext Detection',
      description: 'Analyzes legislative text for misleading language and hidden provisions',
      version: '1.0.0',
      enabled: true,
      healthStatus: 'healthy',
      dependencies: ['ml-models', 'feature-flags', 'notifications'],
      endpoints: [
        '/api/pretext-detection/analyze',
        '/api/pretext-detection/alerts',
        '/api/pretext-detection/review',
        '/api/pretext-detection/analytics'
      ],
      metadata: {
        category: 'analysis',
        priority: 'critical',
        owner: 'backend-team'
      }
    });

    // Add alert rules
    await integrationMonitor.addAlertRule({
      featureId: 'pretext-detection',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds 5%',
      condition: {
        metric: 'errorRate',
        operator: '>',
        threshold: 5,
        window: 300 // 5 minutes
      },
      severity: 'high',
      enabled: true
    });

    await integrationMonitor.addAlertRule({
      featureId: 'pretext-detection',
      name: 'Slow Response Time',
      description: 'Alert when p95 response time exceeds 500ms',
      condition: {
        metric: 'p95ResponseTime',
        operator: '>',
        threshold: 500,
        window: 300
      },
      severity: 'medium',
      enabled: true
    });

    logger.info('Pretext detection feature registered successfully');
  } catch (error) {
    logger.error({
      component: 'RegisterPretextDetection',
      error
    }, 'Failed to register pretext detection feature');
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  registerPretextDetection()
    .then(() => {
      console.log('✅ Pretext detection feature registered');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to register pretext detection feature:', error);
      process.exit(1);
    });
}

export { registerPretextDetection };
