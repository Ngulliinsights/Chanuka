import { Router } from 'express';
import { validateRequest } from '@server/middleware/validation/validate-request';
import { marketController } from './market.controller';
import { AddPriceSchema, GetHistorySchema, GetMetricsSchema } from './market.validation';
import { requireAuth } from '@server/infrastructure/auth';
import { rateLimiter } from '@server/middleware/security/rate-limiter';

const router = Router();

// Apply strict rate limiting to market signals to prevent manipulation
const signalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many price signals from this IP, please try again after 15 minutes'
});

router.post(
  '/price',
  signalRateLimiter,
  requireAuth,
  validateRequest(AddPriceSchema),
  marketController.addPrice
);

router.get(
  '/metrics/:productId',
  validateRequest(GetMetricsSchema),
  marketController.getMetrics
);

router.get(
  '/history/:productId',
  validateRequest(GetHistorySchema),
  marketController.getPriceHistory
);

export const marketRoutes = router;
