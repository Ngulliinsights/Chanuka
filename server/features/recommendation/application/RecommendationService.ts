/**
 * Enhanced Recommendation Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export class RecommendationService {
  private inputSanitizer = new InputSanitizationService();

  async getRecommendations(userId: string, type: string): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // Aggressive caching for ML results (30 minutes)
      const cacheKey = cacheKeys.recommendation(sanitizedUserId, type);
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      const recommendations = await secureQueryBuilderService
        .select()
        .from('recommendations')
        .where('user_id', '=', sanitizedUserId)
        .where('type', '=', type)
        .orderBy('score', 'desc')
        .limit(10);

      await cacheService.set(cacheKey, recommendations, CACHE_TTL.RECOMMENDATIONS);
      return recommendations;
    }, { service: 'RecommendationService', operation: 'getRecommendations' });
  }
}

export const recommendationService = new RecommendationService();
