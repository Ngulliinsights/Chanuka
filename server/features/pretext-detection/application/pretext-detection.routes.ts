/**
 * Pretext Detection Routes
 * 
 * API endpoints for pretext detection feature
 */

import { Router } from 'express';
import { PretextDetectionController } from './pretext-detection.controller';
import { requireAuth } from '@server/middleware/auth';
import { featureFlagMiddleware } from '@server/features/feature-flags/application/middleware';
import { PretextHealthCheck } from '../infrastructure/pretext-health-check';

const router = Router();
const controller = new PretextDetectionController();
const healthCheck = new PretextHealthCheck();

// Apply feature flag middleware to all routes
router.use(featureFlagMiddleware('pretext-detection'));

// ============================================================================
// ANALYSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/pretext-detection/analyze
 * Analyze a bill for pretext indicators
 * 
 * Body:
 * - billId: string (required)
 * - force: boolean (optional) - force re-analysis even if cached
 */
router.post('/analyze', controller.analyze);

// ============================================================================
// ALERTS ENDPOINTS
// ============================================================================

/**
 * GET /api/pretext-detection/alerts
 * Get pretext alerts
 * 
 * Query params:
 * - status: string (optional) - filter by status (pending, approved, rejected)
 * - limit: number (optional) - limit number of results
 */
router.get('/alerts', requireAuth, controller.getAlerts);

/**
 * POST /api/pretext-detection/review
 * Review a pretext alert (admin only)
 * 
 * Body:
 * - alertId: string (required)
 * - status: 'approved' | 'rejected' (required)
 * - notes: string (optional)
 */
router.post('/review', requireAuth, controller.reviewAlert);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/pretext-detection/analytics
 * Get pretext detection analytics
 * 
 * Query params:
 * - startDate: string (optional) - ISO date string
 * - endDate: string (optional) - ISO date string
 */
router.get('/analytics', requireAuth, controller.getAnalytics);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/pretext-detection/health
 * Get health status of pretext detection service
 */
router.get('/health', async (req, res) => {
  try {
    const result = await healthCheck.check();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
