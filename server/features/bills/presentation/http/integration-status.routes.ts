/**
 * Integration Status Routes
 * 
 * Provides endpoints to monitor and control bill integrations
 */

import { Router, type Request, type Response } from 'express';
import { billLifecycleHooks } from '../../application/bill-lifecycle-hooks';
import { logger } from '@server/infrastructure/observability';

const router: Router = Router();

/**
 * GET /api/bills/integration/status
 * Get current integration status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = {
      hooksEnabled: billLifecycleHooks.isHooksEnabled(),
      availableFeatures: await checkAvailableFeatures(),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get integration status');
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status',
    });
  }
});

/**
 * POST /api/bills/integration/enable
 * Enable bill lifecycle hooks
 */
router.post('/enable', async (_req: Request, res: Response) => {
  try {
    billLifecycleHooks.setEnabled(true);
    
    logger.info('Bill lifecycle hooks enabled');
    
    res.json({
      success: true,
      message: 'Bill lifecycle hooks enabled',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to enable hooks');
    res.status(500).json({
      success: false,
      error: 'Failed to enable hooks',
    });
  }
});

/**
 * POST /api/bills/integration/disable
 * Disable bill lifecycle hooks
 */
router.post('/disable', async (_req: Request, res: Response) => {
  try {
    billLifecycleHooks.setEnabled(false);
    
    logger.info('Bill lifecycle hooks disabled');
    
    res.json({
      success: true,
      message: 'Bill lifecycle hooks disabled',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to disable hooks');
    res.status(500).json({
      success: false,
      error: 'Failed to disable hooks',
    });
  }
});

/**
 * Check which integration features are available
 */
async function checkAvailableFeatures(): Promise<{
  pretextDetection: boolean;
  constitutionalAnalysis: boolean;
  marketIntelligence: boolean;
  notifications: boolean;
  recommendations: boolean;
}> {
  const features = {
    pretextDetection: false,
    constitutionalAnalysis: false,
    marketIntelligence: false,
    notifications: false,
    recommendations: false,
  };

  // Check pretext detection
  try {
    await import('@server/features/pretext-detection');
    features.pretextDetection = true;
  } catch {
    // Feature not available
  }

  // Check constitutional analysis
  try {
    await import('@server/features/constitutional-analysis');
    features.constitutionalAnalysis = true;
  } catch {
    // Feature not available
  }

  // Check market intelligence
  try {
    await import('@server/features/market/market.service');
    features.marketIntelligence = true;
  } catch {
    // Feature not available
  }

  // Check notifications
  try {
    await import('@server/features/notifications');
    features.notifications = true;
  } catch {
    // Feature not available
  }

  // Check recommendations
  try {
    await import('@server/features/recommendation');
    features.recommendations = true;
  } catch {
    // Feature not available
  }

  return features;
}

export { router as integrationStatusRouter };
