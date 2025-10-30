 import { Router } from 'express';
import {
  getPersonalizedRecommendations,
  getSimilarBills,
  getTrendingBills,
  getCollaborativeRecommendations,
} from '../application/RecommendationService';
import { trackEngagement } from '../application/EngagementTracker';
import { ApiSuccess, ApiError, ApiValidationError  } from '../../../../shared/core/src/utils/api';

const router = Router();

router.get('/personalized', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return ApiValidationError(res, 'Authenticated user required');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const dto = await getPersonalizedRecommendations(userId, limit);
  return ApiSuccess(res, dto);
});

router.get('/similar/:billId', async (req, res) => {
  const billId = Number(req.params.billId);
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await getSimilarBills(billId, limit);
  return ApiSuccess(res, data);
});

router.get('/trending', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 365);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await getTrendingBills(days, limit);
  return ApiSuccess(res, data);
});

router.get('/collaborative', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return ApiValidationError(res, 'Authenticated user required');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const dto = await getCollaborativeRecommendations(userId, limit);
  return ApiSuccess(res, dto);
});

router.post('/track-engagement', async (req, res) => {
  const { billId, engagementType } = req.body;
  if (!billId || !engagementType) return ApiValidationError(res, 'billId and engagementType required');
  const userId = req.user?.id;
  if (!userId) return ApiValidationError(res, 'Authenticated user required');
  await trackEngagement(userId, Number(billId), engagementType);
  return ApiSuccess(res, { ok: true });
});

export { router };












































