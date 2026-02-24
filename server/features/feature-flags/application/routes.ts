// ============================================================================
// FEATURE FLAGS ROUTES - API Endpoints
// ============================================================================

import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { FeatureFlagController } from './controller';
import { authenticateToken } from '@server/middleware/auth';

const router: RouterType = Router();
const controller = new FeatureFlagController();

// ============================================================================
// ADMIN ROUTES - Require authentication and admin role
// ============================================================================

// Flag management
router.post('/flags', authenticateToken, controller.createFlag);
router.get('/flags', authenticateToken, controller.getAllFlags);
router.get('/flags/:name', authenticateToken, controller.getFlag);
router.put('/flags/:name', authenticateToken, controller.updateFlag);
router.delete('/flags/:name', authenticateToken, controller.deleteFlag);

// Flag control
router.post('/flags/:name/toggle', authenticateToken, controller.toggleFlag);
router.post('/flags/:name/rollout', authenticateToken, controller.updateRollout);

// Analytics
router.get('/flags/:name/analytics', authenticateToken, controller.getAnalytics);

// ============================================================================
// PUBLIC ROUTES - Flag evaluation (can be used by client)
// ============================================================================

router.post('/flags/:name/evaluate', controller.evaluateFlag);

export default router;
