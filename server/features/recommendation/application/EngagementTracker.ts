 import { RecommendationRepository } from '../infrastructure/RecommendationRepository';
import { RecommendationCache } from '../infrastructure/RecommendationCache';
import { logger  } from '../../../../shared/core/src/index.js';

const repo = new RecommendationRepository();
const cache = new RecommendationCache();

export async function trackEngagement(userId: string, billId: number, type: 'view' | 'comment' | 'share'): Promise<void> {
  try {
    await repo.upsertEngagement(userId, billId, type);
    await cache.invalidateUser(userId); // original cache-delete logic
  } catch (e) {
    logger.error('Engagement tracker error', e);
    throw e; // re-throw to keep original behaviour
  }
}






































