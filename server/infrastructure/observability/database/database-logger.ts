/**
 * Database Logger
 *
 * Responsibility: instrument and log database operations.
 * Does NOT make security-level judgments — callers supply severity
 * via the AuditOperation.sensitive / severity fields.
 * The only external dependencies are the core logger and the error tracker.
 */

import { errorTracker } from '../monitoring/error-tracker';
import { logger } from '../core/logger';
import {
  DB_SLOW_QUERY_MS,
  DB_VERY_SLOW_QUERY_MS,
} from '../monitoring/monitoring-policy';
import type {
  AuditOperation,
  DatabaseOperationContext,
  DatabaseOperationResult,
} from '../core/types';

const COMPONENT = 'database';

// ─── Main class ───────────────────────────────────────────────────────────────

export class DatabaseLogger {
  private static instance: DatabaseLogger;

  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  /**
   * Wrap a database operation with timing, result logging, and error tracking.
   * The `operation` callback performs the actual DB work.
   */
  async logOperation(
    context: DatabaseOperationContext,
    operation: () => Promise<DatabaseOperationResult>,
    additionalMetadata?: Record<string, unknown>,
  ): Promise<DatabaseOperationResult> {
    const startTime   = performance.now();
    const operationId = generateId('db_op');

    logger.debug(
      { component: COMPONENT, ...context, operationId, ...additionalMetadata },
      'Database operation started',
    );

    try {
      const result   = await operation();
      const duration = performance.now() - startTime;

      result.duration  = duration;
      result.slowQuery = duration > DB_SLOW_QUERY_MS;

      this.emitCompletion(context, result, operationId, additionalMetadata);
      if (result.slowQuery) this.emitSlowQuery(context, result, operationId);

      return result;
    } catch (err) {
      const duration = performance.now() - startTime;
      const result: DatabaseOperationResult = {
        success:   false,
        duration,
        error:     err as Error,
        slowQuery: duration > DB_SLOW_QUERY_MS,
      };

      this.emitFailure(context, result, operationId, additionalMetadata);

      // Forward to centralised error tracker with context derived from the operation
      const errCtx: Record<string, string> = {
        endpoint: `database_${context.operation}_${context.table}`,
      };
      if (context.userId)        errCtx['user_id']  = context.userId;
      if (context.correlationId) errCtx['traceId']  = context.correlationId;

      errorTracker.trackError(err as Error, errCtx, 'medium', 'database');
      throw err;
    }
  }

  /**
   * Persist an audit trail entry.
   * Severity is supplied by the caller — this method does not reclassify it.
   */
  logAudit(operation: AuditOperation): void {
    const severity = operation.severity ?? (operation.sensitive ? 'high' : 'medium');

    logger.logSecurityEvent(
      {
        event:      operation.action,
        severity,
        user_id:    operation.userId,
        ip:         operation.ipAddress,
        session_id: operation.sessionId,
        details: {
          entityType: operation.entityType,
          entityId:   operation.entityId,
          changes:    operation.changes,
          sensitive:  operation.sensitive,
        },
      },
      `Security audit: ${operation.action} on ${operation.entityType} ${operation.entityId}`,
    );

    logger.info(
      {
        component: 'audit',
        operation: 'security_event',
        audit: {
          timestamp:     new Date(),
          correlationId: generateId('corr'),
          ...operation,
        },
        tags: ['audit', 'security', operation.sensitive ? 'sensitive' : 'normal'],
      },
      'Audit trail entry',
    );
  }

  /** Emit performance metrics for a specific query. */
  logQueryPerformance(
    table: string,
    operation: string,
    duration: number,
    queryDetails?: {
      sql?: string;
      params?: unknown[];
      recordCount?: number;
      indexUsed?: boolean;
      executionPlan?: unknown;
    },
  ): void {
    const isSlow     = duration > DB_SLOW_QUERY_MS;
    const isVerySlow = duration > DB_VERY_SLOW_QUERY_MS;

    logger.logPerformance(operation, duration, {
      component:     COMPONENT,
      table,
      slowQuery:     isSlow,
      verySlowQuery: isVerySlow,
      queryDetails,
      threshold:     DB_SLOW_QUERY_MS,
      exceeded:      isSlow,
      tags: isVerySlow
        ? ['slow-query', 'performance-issue']
        : isSlow ? ['slow-query'] : undefined,
    });

    if (isVerySlow) {
      logger.warn(
        {
          component:      COMPONENT,
          table,
          operation,
          duration,
          queryDetails,
          recommendation: 'Consider query optimisation, indexing, or caching',
          tags:           ['performance', 'optimisation-needed'],
        },
        'Very slow database query detected',
      );
    }
  }

  /** Summarise the outcome of a batch of operations. */
  logBatchOperation(
    context: DatabaseOperationContext,
    batchSize: number,
    results: DatabaseOperationResult[],
    totalDuration: number,
  ): void {
    const successful     = results.filter((r) => r.success).length;
    const failed         = results.filter((r) => !r.success).length;
    const slowOperations = results.filter((r) => r.slowQuery).length;

    logger.info(
      {
        component:    COMPONENT,
        operation:    'batch',
        table:        context.table,
        entityType:   context.entityType,
        batchSize,
        successful,
        failed,
        totalDuration,
        avgDuration:  totalDuration / batchSize,
        slowOperations,
        successRate:  (successful / batchSize) * 100,
        userId:       context.userId,
        correlationId: context.correlationId,
        tags: failed > 0 ? ['batch', 'partial-failure'] : ['batch', 'success'],
      },
      'Batch database operation completed',
    );

    results
      .filter((r) => !r.success)
      .forEach((result, index) => {
        logger.error(
          {
            component:    COMPONENT,
            operation:    context.operation,
            table:        context.table,
            batchIndex:   index,
            error:        result.error?.message,
            duration:     result.duration,
            correlationId: context.correlationId,
          },
          'Batch operation item failed',
        );
      });
  }

  /** Fluent builder for DatabaseOperationContext. */
  createContextBuilder(table: string, entityType: string): DatabaseOperationContextBuilder {
    return new DatabaseOperationContextBuilder(table, entityType);
  }

  // ─── Private emitters ──────────────────────────────────────────────────────

  private emitCompletion(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string,
    meta?: Record<string, unknown>,
  ): void {
    const level = result.slowQuery ? 'warn' : 'info';
    logger[level](
      {
        component:   COMPONENT,
        ...context,
        operationId,
        success:     result.success,
        duration:    result.duration,
        recordCount: result.recordCount,
        affectedIds: result.affectedIds,
        slowQuery:   result.slowQuery,
        ...meta,
      },
      `Database operation completed: ${context.operation} ${context.table}`,
    );
  }

  private emitFailure(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string,
    meta?: Record<string, unknown>,
  ): void {
    logger.error(
      {
        component:  COMPONENT,
        ...context,
        operationId,
        duration:   result.duration,
        error:      result.error?.message,
        stack:      result.error?.stack,
        slowQuery:  result.slowQuery,
        ...meta,
      },
      `Database operation failed: ${context.operation} ${context.table}`,
    );
  }

  private emitSlowQuery(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string,
  ): void {
    logger.warn(
      {
        component:      COMPONENT,
        ...context,
        operationId,
        duration:       result.duration,
        recordCount:    result.recordCount,
        queryDetails:   result.queryDetails,
        recommendation: 'Consider query optimisation, indexing, or caching',
        tags:           ['performance', 'slow-query'],
      },
      'Slow database query detected',
    );
  }
}

// ─── Fluent context builder ───────────────────────────────────────────────────

export class DatabaseOperationContextBuilder {
  private ctx: DatabaseOperationContext;

  constructor(table: string, entityType: string) {
    this.ctx = { operation: 'read', table, entityType };
  }

  operation(op: DatabaseOperationContext['operation']): this { this.ctx.operation = op; return this; }
  entityId(id: string): this     { this.ctx.entityId = id;      return this; }
  userId(id: string): this       { this.ctx.userId = id;        return this; }
  correlationId(id: string): this{ this.ctx.correlationId = id; return this; }
  sessionId(id: string): this    { this.ctx.sessionId = id;     return this; }
  ipAddress(ip: string): this    { this.ctx.ipAddress = ip;     return this; }
  userAgent(ua: string): this    { this.ctx.userAgent = ua;     return this; }
  metadata(m: Record<string, unknown>): this { this.ctx.metadata = m; return this; }
  build(): DatabaseOperationContext { return { ...this.ctx }; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const databaseLogger = DatabaseLogger.getInstance();