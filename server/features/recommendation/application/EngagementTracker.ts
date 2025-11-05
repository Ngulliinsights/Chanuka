 import { RecommendationRepository } from '../infrastructure/RecommendationRepository';
import { RecommendationCache } from '../infrastructure/RecommendationCache';
import { logger  } from '@shared/core/index.js';

const repo = new RecommendationRepository();
const cache = new RecommendationCache();

export async function trackEngagement(user_id: string, bill_id: number, type: 'view' | 'comment' | 'share'): Promise<void> { try {
    await repo.upsertEngagement(user_id, bill_id, type);
    await cache.invalidateUser(user_id); // original cache-delete logic
    } catch (e) {
    logger.error('Engagement tracker error', e);
    throw e; // re-throw to keep original behaviour
  }
}






































