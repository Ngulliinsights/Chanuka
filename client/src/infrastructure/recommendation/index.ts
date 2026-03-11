/**
 * Recommendation Engine Feature
 * 
 * Public API for the recommendation engine feature
 */

// Types
export type {
  Recommendation,
  BillRecommendation,
  RecommendationResponse,
  SimilarBillsResponse,
  TrendingBillsResponse,
  EngagementTrackingRequest,
  EngagementTrackingResponse,
} from './types';

// API
export { recommendationApi } from './api/recommendation-api';

// Hooks
export {
  usePersonalizedRecommendations,
  useSimilarBills,
  useTrendingBills,
  useCollaborativeRecommendations,
  useTrackEngagement,
} from './hooks/useRecommendations';

// UI Components
export { RecommendationCard } from './ui/RecommendationCard';
export { RecommendationList } from './ui/RecommendationList';
export { RecommendationWidget } from './ui/RecommendationWidget';
export { PersonalizedRecommendationsWidget } from './ui/PersonalizedRecommendationsWidget';
export { TrendingBillsWidget } from './ui/TrendingBillsWidget';
export { SimilarBillsWidget } from './ui/SimilarBillsWidget';
