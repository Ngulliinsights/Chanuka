/**
 * Monitoring and Community API Contracts
 * Type-safe specifications for monitoring, health checks, and community discussion endpoints
 */

import { ApiResponse, type HealthCheckResponse } from './core.contracts';

// Re-export types for convenience
export type { HealthCheckResponse } from './core.contracts';
export type { Comment, CreateCommentRequest, CreateVoteRequest, Vote } from './community.contracts';

// ============================================================================
// MONITORING CONTRACTS
// ============================================================================

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  dimensions?: Record<string, string>;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringDashboard {
  health: HealthCheckResponse;
  alerts: Alert[];
  metrics: Record<string, number>;
  recentEvents: Array<{
    timestamp: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
}

// ============================================================================
// COMMUNITY CONTRACTS (re-exported from community.contracts)
// ============================================================================

/**
 * Use CommunityComment, CommunityCreateCommentRequest, CommunityCreateVoteRequest, CommunityVote
 * from the exports above for community discussion features
 */

// ============================================================================
// ENDPOINT RESPONSE TYPES (Monitoring Only)
// ============================================================================

export type GetHealthCheckResponse = ApiResponse<HealthCheckResponse>;
export type GetMonitoringDashboardResponse = ApiResponse<MonitoringDashboard>;
export type GetMetricsResponse = ApiResponse<Metric[]>;
export type GetAlertsResponse = ApiResponse<Alert[]>;

/**
 * For community response types (Comment, Discussion, Vote), please refer to:
 * - community.contracts.ts for core community types
 * - comment.contract.ts and comment.schemas.ts for comment-specific responses
 */
