/**
 * Enhanced Database Operation Logger
 *
 * Provides comprehensive logging for all database operations with structured data,
 * performance metrics, audit trails, and correlation tracking.
 */

import { logger } from '@shared/core';
import { errorTracker } from '@server/core/errors/error-tracker';

export interface DatabaseOperationContext {
  operation: 'create' | 'read' | 'update' | 'delete' | 'search' | 'count' | 'batch';
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
  action: 'user_create' | 'user_update' | 'user_delete' | 'user_security_update' | 'user_auth_tokens_update' | 'batch_operation';
  entityType: 'user' | 'bill' | 'sponsor' | 'profile' | 'security' | 'auth';
  entityId: string;
  userId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  sensitive: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

export class DatabaseLogger {
  private static instance: DatabaseLogger;

  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  /**
   * Log a database operation with full context and performance metrics
   */
  async logOperation(
    context: DatabaseOperationContext,
    operation: () => Promise<DatabaseOperationResult>,
    additionalMetadata?: Record<string, unknown>
  ): Promise<DatabaseOperationResult> {
    const startTime = performance.now();
    const operationId = this.generateOperationId();

    try {
      // Log operation start
      logger.debug('Database operation started', {
        component: 'database',
        operation: context.operation,
        table: context.table,
        entityType: context.entityType,
        entityId: context.entityId,
        userId: context.userId,
        correlationId: context.correlationId,
        operationId,
        ...additionalMetadata
      });

      const result = await operation();
      const duration = performance.now() - startTime;

      // Update result with duration
      result.duration = duration;
      result.slowQuery = duration > SLOW_QUERY_THRESHOLD;

      // Log operation completion
      this.logOperationCompletion(context, result, operationId, additionalMetadata);

      // Log performance metrics for slow queries
      if (result.slowQuery) {
        this.logSlowQuery(context, result, operationId);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const result: DatabaseOperationResult = {
        success: false,
        duration,
        error: error as Error,
        slowQuery: duration > SLOW_QUERY_THRESHOLD
      };

      // Log operation failure
      this.logOperationFailure(context, result, operationId, additionalMetadata);

      // Track error with error tracker
      errorTracker.trackError(error as Error, {
        endpoint: `database_${context.operation}_${context.table}`,
        user_id: context.userId,
        correlationId: context.correlationId,
        operationId,
        entityId: context.entityId,
        table: context.table,
        entityType: context.entityType
      }, 'medium', 'database');

      throw error;
    }
  }

  /**
   * Log audit trail for sensitive operations
   */
  logAudit(operation: AuditOperation): void {
    const auditEntry = {
      timestamp: new Date(),
      action: operation.action,
      entityType: operation.entityType,
      entityId: operation.entityId,
      userId: operation.userId,
      changes: operation.changes,
      sensitive: operation.sensitive,
      ipAddress: operation.ipAddress,
      userAgent: operation.userAgent,
      sessionId: operation.sessionId,
      correlationId: this.generateCorrelationId()
    };

    // Log to security logger
    logger.logSecurityEvent({
      event: operation.action,
      severity: operation.sensitive ? 'high' : 'medium',
      user_id: operation.userId,
      ip: operation.ipAddress,
      session_id: operation.sessionId,
      details: {
        entityType: operation.entityType,
        entityId: operation.entityId,
        changes: operation.changes,
        sensitive: operation.sensitive
      }
    }, `Security audit: ${operation.action} on ${operation.entityType} ${operation.entityId}`);

    // Log structured audit entry
    logger.info('Audit trail entry', {
      component: 'audit',
      operation: 'security_event',
      audit: auditEntry,
      tags: ['audit', 'security', operation.sensitive ? 'sensitive' : 'normal']
    });
  }

  /**
   * Log database query performance metrics
   */
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
    }
  ): void {
    const isSlow = duration > SLOW_QUERY_THRESHOLD;
    const isVerySlow = duration > VERY_SLOW_QUERY_THRESHOLD;

    logger.logPerformance(operation, duration, {
      component: 'database',
      table,
      operation,
      slowQuery: isSlow,
      verySlowQuery: isVerySlow,
      queryDetails,
      threshold: SLOW_QUERY_THRESHOLD,
      exceeded: isSlow,
      tags: isVerySlow ? ['slow-query', 'performance-issue'] : isSlow ? ['slow-query'] : undefined
    });

    // Log detailed query analysis for very slow queries
    if (isVerySlow) {
      logger.warn('Very slow database query detected', {
        component: 'database',
        table,
        operation,
        duration,
        queryDetails,
        recommendation: 'Consider query optimization, indexing, or caching',
        tags: ['performance', 'optimization-needed']
      });
    }
  }

  /**
   * Log batch operation details
   */
  logBatchOperation(
    context: DatabaseOperationContext,
    batchSize: number,
    results: DatabaseOperationResult[],
    totalDuration: number
  ): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = totalDuration / batchSize;
    const slowOperations = results.filter(r => r.slowQuery).length;

    logger.info('Batch database operation completed', {
      component: 'database',
      operation: 'batch',
      table: context.table,
      entityType: context.entityType,
      batchSize,
      successful,
      failed,
      totalDuration,
      avgDuration,
      slowOperations,
      successRate: (successful / batchSize) * 100,
      userId: context.userId,
      correlationId: context.correlationId,
      tags: failed > 0 ? ['batch', 'partial-failure'] : ['batch', 'success']
    });

    // Log individual failures in batch
    results.filter(r => !r.success).forEach((result, index) => {
      logger.error('Batch operation item failed', {
        component: 'database',
        operation: context.operation,
        table: context.table,
        batchIndex: index,
        error: result.error?.message,
        duration: result.duration,
        correlationId: context.correlationId
      });
    });
  }

  /**
   * Create operation context builder for fluent API
   */
  createContextBuilder(table: string, entityType: string) {
    return new DatabaseOperationContextBuilder(table, entityType);
  }

  private logOperationCompletion(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string,
    additionalMetadata?: Record<string, unknown>
  ): void {
    const logLevel = result.slowQuery ? 'warn' : 'info';

    logger[logLevel](`Database operation completed: ${context.operation} ${context.table}`, {
      component: 'database',
      operation: context.operation,
      table: context.table,
      entityType: context.entityType,
      entityId: context.entityId,
      userId: context.userId,
      correlationId: context.correlationId,
      operationId,
      success: result.success,
      duration: result.duration,
      recordCount: result.recordCount,
      affectedIds: result.affectedIds,
      slowQuery: result.slowQuery,
      ...additionalMetadata
    });
  }

  private logOperationFailure(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string,
    additionalMetadata?: Record<string, unknown>
  ): void {
    logger.error(`Database operation failed: ${context.operation} ${context.table}`, {
      component: 'database',
      operation: context.operation,
      table: context.table,
      entityType: context.entityType,
      entityId: context.entityId,
      userId: context.userId,
      correlationId: context.correlationId,
      operationId,
      duration: result.duration,
      error: result.error?.message,
      stack: result.error?.stack,
      slowQuery: result.slowQuery,
      ...additionalMetadata
    });
  }

  private logSlowQuery(
    context: DatabaseOperationContext,
    result: DatabaseOperationResult,
    operationId: string
  ): void {
    logger.warn('Slow database query detected', {
      component: 'database',
      operation: context.operation,
      table: context.table,
      entityType: context.entityType,
      entityId: context.entityId,
      userId: context.userId,
      correlationId: context.correlationId,
      operationId,
      duration: result.duration,
      recordCount: result.recordCount,
      queryDetails: result.queryDetails,
      recommendation: 'Consider query optimization, indexing, or caching',
      tags: ['performance', 'slow-query']
    });
  }

  private generateOperationId(): string {
    return `db_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Fluent API builder for database operation contexts
 */
export class DatabaseOperationContextBuilder {
  private context: DatabaseOperationContext;

  constructor(table: string, entityType: string) {
    this.context = {
      operation: 'read',
      table,
      entityType
    };
  }

  operation(op: DatabaseOperationContext['operation']): this {
    this.context.operation = op;
    return this;
  }

  entityId(id: string): this {
    this.context.entityId = id;
    return this;
  }

  userId(id: string): this {
    this.context.userId = id;
    return this;
  }

  correlationId(id: string): this {
    this.context.correlationId = id;
    return this;
  }

  sessionId(id: string): this {
    this.context.sessionId = id;
    return this;
  }

  ipAddress(ip: string): this {
    this.context.ipAddress = ip;
    return this;
  }

  userAgent(agent: string): this {
    this.context.userAgent = agent;
    return this;
  }

  metadata(meta: Record<string, unknown>): this {
    this.context.metadata = meta;
    return this;
  }

  build(): DatabaseOperationContext {
    return { ...this.context };
  }
}

// Export singleton instance
export const databaseLogger = DatabaseLogger.getInstance();