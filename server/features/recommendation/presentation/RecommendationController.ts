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

router.get('/personalized', async (req, res) => { const user_id = req.user?.id;
  if (!user_id) return ApiValidationError(res, 'Authenticated user required');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const dto = await getPersonalizedRecommendations(user_id, limit);
  return ApiSuccess(res, dto);
 });

router.get('/similar/:bill_id', async (req, res) => { const bill_id = Number(req.params.bill_id);
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await getSimilarBills(bill_id, limit);
  return ApiSuccess(res, data);
 });

router.get('/trending', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 365);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await getTrendingBills(days, limit);
  return ApiSuccess(res, data);
});

router.get('/collaborative', async (req, res) => { const user_id = req.user?.id;
  if (!user_id) return ApiValidationError(res, 'Authenticated user required');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const dto = await getCollaborativeRecommendations(user_id, limit);
  return ApiSuccess(res, dto);
 });

router.post('/track-engagement', async (req, res) => { const { bill_id, engagement_type  } = req.body;
  if (!bill_id || !engagement_type) return ApiValidationError(res, 'bill_id and engagement_type required');
  const user_id = req.user?.id;
  if (!user_id) return ApiValidationError(res, 'Authenticated user required');
  await trackEngagement(user_id, Number(bill_id), engagement_type);
  return ApiSuccess(res, { ok: true });
});

export { router };












































