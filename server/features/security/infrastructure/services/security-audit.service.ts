import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import {
  audit_payloads,
  system_audit_log
} from '@server/infrastructure/schema/integrity_operations';
import { and, count, desc, eq, gte, inArray, lte, type SQL, sql } from 'drizzle-orm';
import type { Request } from 'express';

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  event_type: string;
  severity: SeverityLevel;
  user_id?: string | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  resource?: string | undefined;
  action?: string | undefined;
  result?: string | undefined;
  success: boolean;
  details?: Record<string, unknown> | undefined;
  session_id?: string | undefined;
  timestamp?: Date | undefined;
}

export interface AuditQueryOptions {
  user_id?: string;
  ip_address?: string;
  event_type?: string;
  event_types?: string[];
  severity?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogRow {
  id: string;
  event_type: string;
  event_category: string;
  severity: SeverityLevel;
  actor_type: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_identifier: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_description: string | null;
  success: boolean;
  status_code: number | null;
  error_message: string | null;
  error_stack: string | null;
  source_ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  request_id: string | null;
  processing_time_ms: number | null;
  retention_period_days: number | null;
  created_at: Date;
  action_details: Record<string, unknown>;
  resource_usage: Record<string, unknown>;
  details: Record<string, unknown>;
}

export interface AuditReport {
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  };
  events: AuditLogRow[];
}

type AuthEventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'registration_attempt'
  | 'registration_success'
  | 'registration_failure';

type DataAccessAction =
  | 'read'
  | 'write'
  | 'update'
  | 'delete'
  | 'export'
  | 'bulk_read'
  | 'bulk_export';

type MatchField = 'user_id' | 'ip_address';

interface RequestWithSession extends Omit<Request, 'sessionID'> {
  sessionID?: string;
}

interface AuditLogInsertResult {
  id: string;
}

interface QueryResultRow {
  id: string;
  event_type: string;
  event_category: string;
  severity: SeverityLevel;
  actor_type: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_identifier: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_description: string | null;
  success: boolean;
  status_code: number | null;
  error_message: string | null;
  error_stack: string | null;
  source_ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  request_id: string | null;
  processing_time_ms: number | null;
  retention_period_days: number | null;
  created_at: Date;
  action_details: Record<string, unknown>;
  resource_usage: Record<string, unknown>;
}

interface CountResult {
  count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Security Audit Infrastructure Service
 * Records security events to the audit trail
 */
export class SecurityAuditService {
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const auditLogResult = await db
        .insert(system_audit_log)
        .values({
          event_type: event.event_type,
          event_category: 'security',
          actor_type: 'user',
          actor_id: event.user_id ?? null,
          action: event.action ?? 'unknown',
          source_ip: event.ip_address ?? null,
          user_agent: event.user_agent ?? null,
          target_description: event.resource ?? null,
          success: event.success,
          severity: event.severity,
          session_id: event.session_id ?? null,
        })
        .returning({ id: system_audit_log.id });

      const firstResult = auditLogResult[0] as AuditLogInsertResult | undefined;
      if (!firstResult) {
        throw new Error('Failed to insert audit log entry');
      }
      const auditLogId = firstResult.id;

      const payloadInserts: Array<{
        audit_log_id: string;
        payload_type: string;
        payload_data: Record<string, unknown>;
      }> = [];

      if (event.details && Object.keys(event.details).length > 0) {
        payloadInserts.push({
          audit_log_id: auditLogId,
          payload_type: 'action_details',
          payload_data: event.details,
        });
      }

      const resourceUsageData = event.details?.resource_usage;
      if (resourceUsageData && isRecord(resourceUsageData)) {
        payloadInserts.push({
          audit_log_id: auditLogId,
          payload_type: 'resource_usage',
          payload_data: resourceUsageData,
        });
      }

      if (payloadInserts.length > 0) {
        await writeDatabase.insert(audit_payloads).values(payloadInserts);
      }

    } catch (error) {
      logger.error('CRITICAL: Audit logging failed', { component: 'SecurityAudit' }, {
        error: error instanceof Error ? error.message : 'Unknown error',
        event_type: event.event_type,
        user_id: event.user_id ?? 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }

  async logAuthEvent(
    event_type: AuthEventType,
    req: Request | undefined,
    user_id: string | undefined,
    success = true,
    details?: Record<string, unknown>
  ): Promise<void> {
    const severity = this.determineAuthSeverity(event_type, success);

    await this.logSecurityEvent({
      event_type,
      severity,
      user_id,
      ip_address: this.extractClientIP(req),
      user_agent: req?.get?.('User-Agent') ?? 'unknown',
      result: success ? 'success' : 'failure',
      success,
      details: {
        ...details,
        attemptTimestamp: new Date().toISOString(),
        referer: req?.get?.('Referer'),
      },
      session_id: (req as RequestWithSession)?.sessionID ?? 'unknown',
    });
  }

  async logDataAccess(
    resource: string,
    action: DataAccessAction,
    req: Request | undefined,
    user_id: string | undefined,
    recordCount?: number,
    success = true,
    details?: Record<string, unknown>
  ): Promise<void> {
    const severity = this.determineDataAccessSeverity(action, recordCount);

    await this.logSecurityEvent({
      event_type: 'data_access',
      severity,
      user_id,
      ip_address: this.extractClientIP(req),
      user_agent: req?.get?.('User-Agent') ?? 'unknown',
      resource,
      action,
      result: success ? 'allowed' : 'denied',
      success,
      details: {
        recordCount,
        ...details,
        dataCategory: this.categorizeResource(resource),
      },
      session_id: (req as RequestWithSession)?.sessionID ?? 'unknown',
    });
  }

  async logAdminAction(
    action: string,
    req: Request | undefined,
    user_id: string,
    targetResource?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'admin_action',
      severity: 'high',
      user_id,
      ip_address: this.extractClientIP(req),
      user_agent: req?.get?.('User-Agent') ?? 'unknown',
      resource: targetResource,
      action,
      result: 'executed',
      success: true,
      details: {
        ...details,
        adminActionType: this.categorizeAdminAction(action),
      },
      session_id: (req as RequestWithSession)?.sessionID ?? 'unknown',
    });
  }

  async logSecuritySystemEvent(
    event_type: string,
    action: string,
    details?: Record<string, unknown>,
    severity: SeverityLevel = 'low'
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type,
      severity,
      action,
      result: 'completed',
      success: true,
      details: {
        ...details,
        systemGenerated: true,
        component: 'security_monitoring',
      },
    });
  }

  async queryAuditLogs(options: AuditQueryOptions): Promise<AuditLogRow[]> {
    try {
      const whereConditions: SQL[] = [];

      if (options.user_id) {
        whereConditions.push(eq(system_audit_log.actor_id, options.user_id));
      }
      if (options.ip_address) {
        whereConditions.push(eq(system_audit_log.source_ip, options.ip_address));
      }
      if (options.event_type) {
        whereConditions.push(eq(system_audit_log.event_type, options.event_type));
      }
      if (options.event_types && options.event_types.length > 0) {
        whereConditions.push(inArray(system_audit_log.event_type, options.event_types));
      }
      if (options.severity) {
        whereConditions.push(eq(system_audit_log.severity, options.severity as SeverityLevel));
      }
      if (options.start_date) {
        whereConditions.push(gte(system_audit_log.created_at, options.start_date));
      }
      if (options.end_date) {
        whereConditions.push(lte(system_audit_log.created_at, options.end_date));
      }

      let query = db
        .select({
          id: system_audit_log.id,
          event_type: system_audit_log.event_type,
          event_category: system_audit_log.event_category,
          severity: system_audit_log.severity,
          actor_type: system_audit_log.actor_type,
          actor_id: system_audit_log.actor_id,
          actor_role: system_audit_log.actor_role,
          actor_identifier: system_audit_log.actor_identifier,
          action: system_audit_log.action,
          target_type: system_audit_log.target_type,
          target_id: system_audit_log.target_id,
          target_description: system_audit_log.target_description,
          success: system_audit_log.success,
          status_code: system_audit_log.status_code,
          error_message: system_audit_log.error_message,
          error_stack: system_audit_log.error_stack,
          source_ip: system_audit_log.source_ip,
          user_agent: system_audit_log.user_agent,
          session_id: system_audit_log.session_id,
          request_id: system_audit_log.request_id,
          processing_time_ms: system_audit_log.processing_time_ms,
          retention_period_days: system_audit_log.retention_period_days,
          created_at: system_audit_log.created_at,
          action_details: sql<Record<string, unknown>>`COALESCE((
            SELECT payload_data
            FROM audit_payloads
            WHERE audit_log_id = ${system_audit_log.id} AND payload_type = 'action_details'
            LIMIT 1
          ), '{}')`.as('action_details'),
          resource_usage: sql<Record<string, unknown>>`COALESCE((
            SELECT payload_data
            FROM audit_payloads
            WHERE audit_log_id = ${system_audit_log.id} AND payload_type = 'resource_usage'
            LIMIT 1
          ), '{}')`.as('resource_usage'),
        })
        .from(system_audit_log);

      if (whereConditions.length > 0) {
        query = query.where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions)!);
      }

      query = query.orderBy(desc(system_audit_log.created_at));

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;

      return results.map((row: QueryResultRow): AuditLogRow => {
        const actionDetails = isRecord(row.action_details) ? row.action_details : {};
        const resourceUsage = isRecord(row.resource_usage) ? row.resource_usage : {};

        return {
          ...row,
          details: {
            ...actionDetails,
            resource_usage: resourceUsage,
          },
        };
      });

    } catch (error) {
      logger.error('Failed to query audit logs:', { component: 'SecurityAudit' }, error);
      throw new Error('Audit log query failed');
    }
  }

  async getEventCount(options: AuditQueryOptions): Promise<number> {
    try {
      const whereConditions: SQL[] = [];

      if (options.user_id) {
        whereConditions.push(eq(system_audit_log.actor_id, options.user_id));
      }
      if (options.ip_address) {
        whereConditions.push(eq(system_audit_log.source_ip, options.ip_address));
      }
      if (options.event_type) {
        whereConditions.push(eq(system_audit_log.event_type, options.event_type));
      }
      if (options.start_date) {
        whereConditions.push(gte(system_audit_log.created_at, options.start_date));
      }
      if (options.end_date) {
        whereConditions.push(lte(system_audit_log.created_at, options.end_date));
      }

      let query = db
        .select({ count: count() })
        .from(system_audit_log);

      if (whereConditions.length > 0) {
        query = query.where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions)!);
      }

      const result = await query;
      const firstResult = result[0] as CountResult | undefined;
      return firstResult ? Number(firstResult.count) : 0;
    } catch (error) {
      logger.error('Failed to get event count:', { component: 'SecurityAudit' }, error);
      return 0;
    }
  }

  async generateAuditReport(start_date: Date, end_date: Date): Promise<AuditReport> {
    try {
      const events = await this.queryAuditLogs({
        start_date,
        end_date,
        limit: 10000,
      });

      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      const uniqueIPs = new Set<string>();

      events.forEach(event => {
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

        if (event.actor_id) uniqueUsers.add(event.actor_id);
        if (event.source_ip) uniqueIPs.add(event.source_ip);
      });

      return {
        period: { start: start_date, end: end_date },
        summary: {
          totalEvents: events.length,
          eventsByType,
          eventsBySeverity,
          uniqueUsers: uniqueUsers.size,
          uniqueIPs: uniqueIPs.size,
        },
        events: events.slice(0, 100),
      };
    } catch (error) {
      logger.error('Failed to generate audit report:', { component: 'SecurityAudit' }, error);
      throw new Error('Audit report generation failed');
    }
  }

  async getRecentFailedLogins(
    user_idOrIP: string,
    since: Date,
    matchField: MatchField = 'user_id'
  ): Promise<AuditLogRow[]> {
    return await this.queryAuditLogs({
      [matchField]: user_idOrIP,
      event_type: 'login_failure',
      start_date: since,
    });
  }

  async getRecentDataAccessVolume(user_id: string, since: Date): Promise<number> {
    const events = await this.queryAuditLogs({
      user_id,
      event_type: 'data_access',
      start_date: since,
    });

    return events.reduce((total, event) => {
      const recordCount = event.details?.recordCount;
      return total + (typeof recordCount === 'number' ? recordCount : 0);
    }, 0);
  }

  private determineAuthSeverity(event_type: string, success: boolean): SeverityLevel {
    if (!success) {
      return 'medium';
    }

    if (event_type.includes('password')) {
      return 'medium';
    }

    return 'low';
  }

  private determineDataAccessSeverity(action: string, recordCount?: number): SeverityLevel {
    if (action.includes('export') || action.includes('bulk')) {
      return recordCount && recordCount > 1000 ? 'critical' : 'high';
    }

    if (action === 'delete') {
      return 'high';
    }

    if (recordCount && recordCount > 100) {
      return 'medium';
    }

    return 'low';
  }

  private categorizeResource(resource: string): string {
    if (resource.includes('user') || resource.includes('profile')) {
      return 'personal_data';
    }
    if (resource.includes('payment') || resource.includes('financial')) {
      return 'financial_data';
    }
    if (resource.includes('health') || resource.includes('medical')) {
      return 'health_data';
    }
    return 'general_data';
  }

  private categorizeAdminAction(action: string): string {
    if (action.includes('user') || action.includes('role')) {
      return 'user_management';
    }
    if (action.includes('config') || action.includes('setting')) {
      return 'configuration';
    }
    if (action.includes('permission') || action.includes('access')) {
      return 'access_control';
    }
    return 'general_admin';
  }

  private extractClientIP(req: Request | undefined): string {
    if (!req?.headers) {
      return 'unknown';
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
    }

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }

    return req.ip ?? 'unknown';
  }
}

export const securityAuditService = new SecurityAuditService();
