/**
 * Admin API Contracts
 * Type-safe API contracts for admin-related endpoints
 */

import { UserId, BillId } from '../../core/branded';

// ============================================================================
// Domain Types
// ============================================================================

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  environment: string;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: Date;
  }>;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface AuditLog {
  id: string;
  userId: UserId;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

export interface ModerationAction {
  id: string;
  moderatorId: UserId;
  targetType: 'user' | 'bill' | 'comment';
  targetId: string;
  action: 'warn' | 'suspend' | 'ban' | 'delete' | 'restore';
  reason: string;
  timestamp: Date;
  expiresAt?: Date;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Get System Status Request
 */
export interface GetSystemStatusRequest {
  includeServices?: boolean;
}

/**
 * Get System Metrics Request (query params)
 */
export interface GetSystemMetricsRequest {
  startDate?: string;
  endDate?: string;
  granularity?: 'minute' | 'hour' | 'day';
}

/**
 * Get Audit Logs Request (query params)
 */
export interface GetAuditLogsRequest {
  userId?: UserId;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Moderation Action Request
 */
export interface CreateModerationActionRequest {
  targetType: 'user' | 'bill' | 'comment';
  targetId: string;
  action: 'warn' | 'suspend' | 'ban' | 'delete' | 'restore';
  reason: string;
  duration?: number; // in hours
}

/**
 * Get Moderation Actions Request (query params)
 */
export interface GetModerationActionsRequest {
  moderatorId?: UserId;
  targetType?: 'user' | 'bill' | 'comment';
  targetId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Update User Role Request
 */
export interface UpdateUserRoleRequest {
  userId: UserId;
  role: string;
}

/**
 * Bulk Delete Request
 */
export interface BulkDeleteRequest {
  type: 'users' | 'bills' | 'comments';
  ids: string[];
  reason: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Get System Status Response
 */
export interface GetSystemStatusResponse {
  status: SystemStatus;
}

/**
 * Get System Metrics Response
 */
export interface GetSystemMetricsResponse {
  metrics: SystemMetrics[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Get Audit Logs Response
 */
export interface GetAuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Create Moderation Action Response
 */
export interface CreateModerationActionResponse {
  action: ModerationAction;
  success: boolean;
}

/**
 * Get Moderation Actions Response
 */
export interface GetModerationActionsResponse {
  actions: ModerationAction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Update User Role Response
 */
export interface UpdateUserRoleResponse {
  success: boolean;
  userId: UserId;
  newRole: string;
}

/**
 * Bulk Delete Response
 */
export interface BulkDeleteResponse {
  success: boolean;
  deletedCount: number;
  failedIds: string[];
  errors?: Array<{
    id: string;
    error: string;
  }>;
}
