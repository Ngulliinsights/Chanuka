/**
 * Enhanced Recommendation Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { getNeo4jDriver } from '@server/infrastructure/database/graph/core/sync-executor';
import { recommendBills } from '@server/infrastructure/database/graph/analytics/recommendation-engine';

import { InputSanitizationService } from '@server/features/security';
import { RecommendationRepository } from '../infrastructure/RecommendationRepository';
import type { PlainBill } from '../domain/recommendation.dto';
import { logger } from '@server/infrastructure/observability';

export class RecommendationService {
  private inputSanitizer = new InputSanitizationService();
  private repository = new RecommendationRepository();

  async getRecommendations(userId: string, type: string): Promise<AsyncServiceResult<PlainBill[]>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // Get user interests
      const interestsResult = await this.repository.getUserInterests(sanitizedUserId);
      if (interestsResult.isErr) {
        throw interestsResult.error;
      }
      const interests = interestsResult.value;

      // Get engaged bills
      const engagedResult = await this.repository.getUserEngagedBillIds(sanitizedUserId);
      if (engagedResult.isErr) {
        throw engagedResult.error;
      }
      const engagedBillIds = engagedResult.value;

      // Get recommendations based on type
      let recommendations: PlainBill[] = [];
      
      if (type === 'trending') {
        const trendingResult = await this.repository.getTrendingBillIds(7, 10);
        if (trendingResult.isErr) {
          throw trendingResult.error;
        }
        const trendingIds = trendingResult.value;
        
        const billsResult = await this.repository.getBillsByIds(trendingIds);
        if (billsResult.isErr) {
          throw billsResult.error;
        }
        recommendations = billsResult.value;
      } else if (type === 'interests' && interests.length > 0) {
        const driver = getNeo4jDriver();
        if (driver) {
          try {
            const graphRecs = await recommendBills(driver, sanitizedUserId, 10);
            const billIds = (graphRecs as Array<{ id: string | number }>).map(r => Number(r.id));
            if (billIds.length > 0) {
              const billsResult = await this.repository.getBillsByIds(billIds);
              if (billsResult.isErr) throw billsResult.error;
              recommendations = billsResult.value;
            }
          } catch (e) {
            logger.warn(
              { service: 'RecommendationService', operation: 'getRecommendations', error: e },
              'Graph recommendation failed, falling back to SQL',
            );
          }
        }

        if (recommendations.length === 0) {
          const billsResult = await this.repository.getBillsByTags(interests, engagedBillIds);
          if (billsResult.isErr) {
            throw billsResult.error;
          }
          recommendations = billsResult.value;
        }
      }

      return recommendations;
    }, { service: 'RecommendationService', operation: 'getRecommendations' });
  }

  async trackEngagement(userId: string, billId: number, type: 'view' | 'comment' | 'share'): Promise<AsyncServiceResult<void>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);
      
      const result = await this.repository.upsertEngagement(sanitizedUserId, billId, type);
      if (result.isErr) {
        throw result.error;
      }
    }, { service: 'RecommendationService', operation: 'trackEngagement' });
  }

  async getSimilarUsers(userId: string): Promise<AsyncServiceResult<string[]>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);
      
      // Get user interests
      const interestsResult = await this.repository.getUserInterests(sanitizedUserId);
      if (interestsResult.isErr) {
        throw interestsResult.error;
      }
      const interests = interestsResult.value;

      // Get similar users
      const similarResult = await this.repository.getSimilarUserIds(sanitizedUserId, interests);
      if (similarResult.isErr) {
        throw similarResult.error;
      }
      
      return similarResult.value;
    }, { service: 'RecommendationService', operation: 'getSimilarUsers' });
  }
}

export const recommendationService = new RecommendationService();
