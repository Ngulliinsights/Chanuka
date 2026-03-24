/**
 * API Contracts Index
 * Centralized exports for all API contracts
 */

// Core contracts
export * from './core.contracts';

// Endpoint contract system
export * from './endpoint';

// Feature-specific contracts
export * from './government-data.contracts';
export * from './analytics.contracts';

// Community contracts
export * from './community.contracts';

// New detailed contracts
export * from './feature-flags.contracts';
export * from './bill.contract';
// NOTE: comment.contract re-exports exclude CreateCommentRequest and UpdateCommentRequest
// to avoid conflict with community.contracts (which exports the legacy string-typed versions).
// Consumers wanting the branded-type versions should import directly from './comment.contract'.
export type {
  GetCommentRequest,
  ListCommentsRequest,
  DeleteCommentRequest,
  VoteCommentRequest,
  CreateCommentResponse,
  GetCommentResponse,
  UpdateCommentResponse,
  ListCommentsResponse,
  GetCommentThreadResponse,
  DeleteCommentResponse,
  VoteCommentResponse,
} from './comment.contract';
export * from './notification.contract';
export * from './search.contract';
export type { GetHealthCheckResponse, GetMonitoringDashboardResponse, GetMetricsResponse, GetAlertsResponse, Metric, Alert, MonitoringDashboard } from './monitoring-community.contracts';

// Validation schemas (runtime validation)
export * from './validation.schemas';

// Modernized generic API contracts
export * from './user.contract';
export * from './admin.contract';