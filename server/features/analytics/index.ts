/**
 * Analytics Feature Index
 * Modernized exports following standardized patterns
 */

// Services
export { analyticsService } from './application/analytics.service';

// Routes
export { default as analyticsRoutes } from './presentation/http/routes/analytics.routes';

// Types (re-export from shared contracts)
export type {
  EngagementMetrics,
  EngagementSummary,
  UserEngagementProfile,
  TrackEngagementRequest,
  BatchTrackEngagementRequest,
  AnalyticsQueryParams,
  EngagementQueryParams,
  TimePeriod,
  EngagementEntityType,
  EngagementEventType,
  MetricType
} from '@shared/types/api/contracts/analytics.contracts';