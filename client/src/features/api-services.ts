/**
 * API Services Index
 * Centralized exports for all modernized API services
 */

// Government Data
export { governmentDataApiService } from './government-data/services/government-data-api.service';
export * from './government-data/hooks/useGovernmentData';

// Community
export { communityApiService } from './community/services/community-api.service';
export * from './community/hooks/useCommunity';

// Analytics (Engagement Metrics)
export { analyticsApiService } from './analytics/services/analytics-api.service';

// Bills (existing, for reference)
export { billsApiService } from './bills/services/api';

// Re-export shared types for convenience
export type {
  // Government Data
  GovernmentData,
  GovernmentDataQueryParams,
  CreateGovernmentDataRequest,
  UpdateGovernmentDataRequest,
  GovernmentDataType,
  GovernmentDataSource,
  GovernmentDataStatus,

  // Community
  Comment,
  Vote,
  Report,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateVoteRequest,
  CreateReportRequest,
  CommentQueryParams,
  VoteQueryParams,
  ReportQueryParams,

  // Analytics
  EngagementMetrics,
  EngagementSummary,
  UserEngagementProfile,
  TrackEngagementRequest,
  AnalyticsQueryParams,
  EngagementQueryParams,
  TimePeriod,
  EngagementEntityType,
  EngagementEventType,

  // Core API
  ApiResponse,
  BaseQueryParams,
  HealthCheckResponse,
  MetadataResponse,
} from '@shared/types/api/contracts';

// Base API service for extending
export {
  BaseApiService,
  CacheableApiService,
  SyncableApiService,
} from '@shared/core/api/base-api-service';
