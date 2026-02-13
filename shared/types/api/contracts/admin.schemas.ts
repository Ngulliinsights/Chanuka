/**
 * Admin API Validation Schemas
 * Zod schemas for runtime validation of admin endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const GetSystemStatusRequestSchema = z.object({
  includeServices: z.boolean().optional(),
});

export const GetSystemMetricsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['minute', 'hour', 'day']).optional(),
});

export const GetAuditLogsRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const CreateModerationActionRequestSchema = z.object({
  targetType: z.enum(['user', 'bill', 'comment']),
  targetId: z.string().uuid(),
  action: z.enum(['warn', 'suspend', 'ban', 'delete', 'restore']),
  reason: z.string().min(10).max(1000),
  duration: z.number().int().positive().optional(),
});

export const GetModerationActionsRequestSchema = z.object({
  moderatorId: z.string().uuid().optional(),
  targetType: z.enum(['user', 'bill', 'comment']).optional(),
  targetId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const UpdateUserRoleRequestSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
});

export const BulkDeleteRequestSchema = z.object({
  type: z.enum(['users', 'bills', 'comments']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(10).max(500),
});

// ============================================================================
// Response Schemas
// ============================================================================

const SystemStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down']),
  uptime: z.number().nonnegative(),
  version: z.string(),
  environment: z.string(),
  services: z.array(z.object({
    name: z.string(),
    status: z.enum(['healthy', 'degraded', 'down']),
    lastCheck: z.date(),
  })),
});

const SystemMetricsSchema = z.object({
  cpu: z.object({
    usage: z.number().min(0).max(100),
    cores: z.number().int().positive(),
  }),
  memory: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
    percentage: z.number().min(0).max(100),
  }),
  disk: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
    percentage: z.number().min(0).max(100),
  }),
  network: z.object({
    bytesIn: z.number().nonnegative(),
    bytesOut: z.number().nonnegative(),
  }),
});

const AuditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  timestamp: z.date(),
  ipAddress: z.string(),
  userAgent: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const ModerationActionSchema = z.object({
  id: z.string().uuid(),
  moderatorId: z.string().uuid(),
  targetType: z.enum(['user', 'bill', 'comment']),
  targetId: z.string().uuid(),
  action: z.enum(['warn', 'suspend', 'ban', 'delete', 'restore']),
  reason: z.string(),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
});

export const GetSystemStatusResponseSchema = z.object({
  status: SystemStatusSchema,
});

export const GetSystemMetricsResponseSchema = z.object({
  metrics: z.array(SystemMetricsSchema),
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});

export const GetAuditLogsResponseSchema = z.object({
  logs: z.array(AuditLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const CreateModerationActionResponseSchema = z.object({
  action: ModerationActionSchema,
  success: z.boolean(),
});

export const GetModerationActionsResponseSchema = z.object({
  actions: z.array(ModerationActionSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const UpdateUserRoleResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string().uuid(),
  newRole: z.string(),
});

export const BulkDeleteResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: z.number().int().nonnegative(),
  failedIds: z.array(z.string().uuid()),
  errors: z.array(z.object({
    id: z.string().uuid(),
    error: z.string(),
  })).optional(),
});
