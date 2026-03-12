/**
 * Pretext Detection Routes
 * 
 * API endpoints for pretext detection feature
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { PretextDetectionController } from './controller';
import { authenticateToken } from '@server/middleware/auth';
import { PretextHealthCheck } from '../../infrastructure/pretext-health-check';

export const router: Router = Router();
const controller = new PretextDetectionController();
const healthCheck = new PretextHealthCheck();

// Feature flag check middleware (inline for now)
const checkFeatureFlag = async (_req: Request, _res: Response, next: NextFunction) => {
  // TODO: Implement feature flag check when feature-flags middleware is available
  // For now, allow all requests
  next();
};

// Apply feature flag middleware to all routes
router.use(checkFeatureFlag);

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
router.get('/alerts', authenticateToken, controller.getAlerts);

/**
 * POST /api/pretext-detection/review
 * Review a pretext alert (admin only)
 * 
 * Body:
 * - alertId: string (required)
 * - status: 'approved' | 'rejected' (required)
 * - notes: string (optional)
 */
router.post('/review', authenticateToken, controller.reviewAlert);

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
router.get('/analytics', authenticateToken, controller.getAnalytics);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/pretext-detection/health
 * Get health status of pretext detection service
 */
router.get('/health', async (_req, res) => {
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
