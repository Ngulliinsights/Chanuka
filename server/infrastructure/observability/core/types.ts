/**
 * Observability Types
 *
 * Single source of truth for all types used across the observability stack.
 * No business logic — pure type declarations only.
 */

import type { Logger } from './logger';

// ─── Logger ──────────────────────────────────────────────────────────────────

export interface ObservabilityStack {
  getLogger(context?: string): Logger;
  getMetrics(): MetricsProvider;
}

export interface MetricsProvider {
  counter(name: string, value: number, tags?: Record<string, string | number>): void;
  histogram(name: string, value: number, tags?: Record<string, string | number>): void;
}

// ─── Security ────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Severity  = 'low' | 'medium' | 'high' | 'critical';

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'admin_action'
  | 'suspicious_activity';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: Severity;
  description: string;
  user_id?: string;
  ip: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  timestamp: Date;
  user_id?: string;
  action: string;
  resource?: string;
  ip: string;
  user_agent?: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  session_id?: string;
  correlationId?: string;
  sensitive?: boolean;
  risk_level?: RiskLevel;
  request_body?: unknown;
  response_size?: number;
}

// ─── Database ────────────────────────────────────────────────────────────────

export type DbOperation = 'create' | 'read' | 'update' | 'delete' | 'search' | 'count' | 'batch';

export type AuditAction =
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_security_update'
  | 'user_auth_tokens_update'
  | 'batch_operation';

export type AuditEntityType = 'user' | 'bill' | 'sponsor' | 'profile' | 'security' | 'auth';

export interface DatabaseOperationContext {
  operation: DbOperation;
  table: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseOperationResult {
  success: boolean;
  duration: number;
  recordCount?: number;
  affectedIds?: string[];
  error?: Error;
  slowQuery?: boolean;
  queryDetails?: {
    sql?: string;
    params?: unknown[];
    executionPlan?: unknown;
  };
}

export interface AuditOperation {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  sensitive: boolean;
  severity?: Severity;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ─── Performance ─────────────────────────────────────────────────────────────

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: { warning: number; critical: number };
}

export interface OperationMetrics {
  operationId: string;
  service: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  resourceUsage: {
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter?: NodeJS.MemoryUsage;
    cpuTime?: number;
  };
}

export interface ServicePerformanceReport {
  service: string;
  timeframe: string;
  metrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    successRate: number;
  };
  operations: Array<{
    operation: string;
    count: number;
    averageTime: number;
    errorCount: number;
  }>;
  recommendations: string[];
}

export interface SystemHealthMetrics {
  timestamp: Date;
  cpu: { usage: number; loadAverage: number[] };
  memory: {
    used: number; free: number; total: number;
    heapUsed: number; heapTotal: number;
  };
  database: {
    connectionCount: number; activeQueries: number;
    averageQueryTime: number; slowQueries: number;
  };
  cache: {
    hitRate: number; missRate: number;
    evictionRate: number; memoryUsage: number;
  };
  network: {
    inboundTraffic: number; outboundTraffic: number; activeConnections: number;
  };
}

// ─── Log Aggregation ─────────────────────────────────────────────────────────

export interface LogAggregationResult {
  timeRange: { start: Date; end: Date };
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByComponent: Record<string, number>;
  logsByOperation: Record<string, number>;
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalErrors: number;
  };
  topErrors: Array<{
    message: string; count: number; component: string; lastSeen: Date;
  }>;
  securityEvents: Array<{
    type: string; severity: string; count: number; lastSeen: Date;
  }>;
}

export interface AlertCondition {
  id: string;
  name: string;
  type: 'error_rate' | 'slow_requests' | 'security_events' | 'log_volume';
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  lastTriggered?: Date;
  cooldown: number;   // minutes
}

export interface AlertRule {
  condition: AlertCondition;
  severity: Severity;
  message: string;
  actions: Array<{
    type: 'log' | 'email' | 'webhook' | 'slack';
    target: string;
    template?: string;
  }>;
}