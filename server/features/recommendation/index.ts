export { RecommendationService } from './application/RecommendationService';

export {
  getPersonalizedRecommendations,
  getSimilarBills,
  getTrendingBills,
  getCollaborativeRecommendations,
  trackEngagement,
} from './application/RecommendationService';

export type {
  PersonalizedRecommendationsDto,
  SimilarBillsDto,
  TrendingBillsDto,
  CollaborativeRecommendationsDto,
  EngagementTrackingDto,
} from './domain/recommendation.dto';

// Export new routes
export { default as recommendationRouter } from './application/recommendation.routes';








































