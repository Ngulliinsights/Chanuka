/**
 * Recommendation Engine API Client
 * 
 * API client for recommendation engine endpoints
 */

import { globalApiClient } from '@client/infrastructure/api';
import type {
  RecommendationResponse,
  SimilarBillsResponse,
  TrendingBillsResponse,
  EngagementTrackingRequest,
  EngagementTrackingResponse,
} from '../types';

/**
 * Recommendation Engine API Client
 */
export const recommendationApi = {
  /**
   * Get personalized recommendations for the authenticated user
   */
  async getPersonalized(limit: number = 10): Promise<RecommendationResponse> {
    const response = await globalApiClient.get<RecommendationResponse>(
      '/api/recommendation/personalized',
      { params: { limit } }
    );
    return response.data;
  },

  /**
   * Get similar bills based on a specific bill
   */
  async getSimilarBills(billId: number, limit: number = 5): Promise<SimilarBillsResponse> {
    const response = await globalApiClient.get<SimilarBillsResponse>(
      `/api/recommendation/similar/${billId}`,
      { params: { limit } }
    );
    return response.data;
  },

  /**
   * Get trending bills
   */
  async getTrending(days: number = 7, limit: number = 10): Promise<TrendingBillsResponse> {
    const response = await globalApiClient.get<TrendingBillsResponse>(
      '/api/recommendation/trending',
      { params: { days, limit } }
    );
    return response.data;
  },

  /**
   * Get collaborative filtering recommendations
   */
  async getCollaborative(limit: number = 10): Promise<RecommendationResponse> {
    const response = await globalApiClient.get<RecommendationResponse>(
      '/api/recommendation/collaborative',
      { params: { limit } }
    );
    return response.data;
  },

  /**
   * Track user engagement with a bill
   */
  async trackEngagement(request: EngagementTrackingRequest): Promise<EngagementTrackingResponse> {
    const response = await globalApiClient.post<EngagementTrackingResponse>(
      '/api/recommendation/track-engagement',
      request
    );
    return response.data;
  },
};
