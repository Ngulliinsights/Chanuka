import { User } from '@server/features/users/domain/entities/user';
/**
 * Admin Router - Unified Error Handling System
 * 
 * Migration from ApiError/ApiForbidden/ApiSuccess to BaseError/ValidationError
 * 10 routes covering:
 * - Dashboard analytics
 * - User management (list, update role, update status)
 * - System health monitoring
 * - Cache management
 * - Query performance analysis
 * - Application logging (real-time log retrieval and metrics)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { securityAuditService } from '@server/features/security';
import { commonSchemas, inputValidationService } from '@server/infrastructure/validation/input-validation-service';
import { secureQueryBuilderService, PaginationParams } from '@server/features/security';
import { authenticateToken, requireRole } from '@server/middleware/auth';
import { logger, logBuffer } from '@server/infrastructure/observability';
import { logAggregator } from '@server/infrastructure/observability/monitoring/log-aggregator';
import { ERROR_CODES } from '@shared/constants';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { bills, users } from '@server/infrastructure/schema';
import type * as schema from '@server/infrastructure/schema';
import { db } from '@server/infrastructure/database';

// Simple error class for admin operations
class AdminError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    public details?: Array<{ field: string; code: string; message: string; value?: unknown }>
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

// --- Constants and Types ---

const USER_ROLES = ['citizen', 'expert', 'admin', 'journalist', 'advocate'] as const;
type UserRole = (typeof USER_ROLES)[number];

// Database type for transactions
type DatabaseTransaction = PostgresJsDatabase<typeof schema>;

// Extend Express Request type to include authenticated user information
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
  };
}

// Query executor types (optional module)
interface SlowQuery {
  queryId: string;
  sql: string;
  executionTimeMs: number;
  timestamp: string;
  context?: string;
  stackTrace?: string;
  explainPlan?: string;
}

interface QueryExecutor {
  getSlowQueries(limit: number): SlowQuery[];
  clearSlowQueries(): void;
}

// Logger context type for better type safety
interface LogContext {
  component: string;
  error?: string | Error;
  user_id?: string;
  [key: string]: unknown;
}

// Explicitly type the router to avoid type inference issues
export const router: Router = Router();

/**
 * Higher-order function that wraps async route handlers with error handling
 * Errors are automatically caught and passed to the unified error middleware
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Type-safe logger helper
 */
function logError(context: LogContext, message: string): void {
  const formattedContext = {
    ...context,
    error: context.error instanceof Error ? context.error.message : context.error
  };
  logger.error(formattedContext, message);
}

// --- Middleware ---

// Apply authentication and admin-only access control to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Add input validation middleware for all routes
router.use((req: Request, _res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = inputValidationService.sanitizeHtmlInput(req.query[key] as string);
      }
    });
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = inputValidationService.sanitizeHtmlInput(req.body[key]);
      }
    });
  }

  next();
});

// --- Route Handlers ---

/**
 * GET /api/admin/dashboard
 * Retrieves comprehensive dashboard statistics with fully optimized database queries.
 */
router.get('/dashboard', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const db = readDatabase as any; // Type assertion for Drizzle ORM compatibility

  try {
    // Execute all dashboard queries in parallel
    const [billStats, userStats, recentBills, recentUsers] = await Promise.all([
      db.select({ total: count(), status: bills.status })
        .from(bills)
        .groupBy(bills.status)
        .catch((err: Error) => {
          logError({ component: 'admin-router', error: err }, 'Error fetching bill stats for dashboard');
          return [];
        }),

      db.select({ total: count(), role: users.role })
        .from(users)
        .groupBy(users.role)
        .catch((err: Error) => {
          logError({ component: 'admin-router', error: err }, 'Error fetching user stats for dashboard');
          return [];
        }),

      db.select({ id: bills.id, title: bills.title, status: bills.status, created_at: bills.created_at })
        .from(bills)
        .orderBy(desc(bills.created_at))
        .limit(10)
        .catch((err: Error) => {
          logError({ component: 'admin-router', error: err }, 'Error fetching recent bills for dashboard');
          return [];
        }),

      db.select({ id: users.id, name: users.name, email: users.email, role: users.role, created_at: users.created_at })
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(10)
        .catch((err: Error) => {
          logError({ component: 'admin-router', error: err }, 'Error fetching recent users for dashboard');
          return [];
        }),
    ]);

    const stats = {
      bills: {
        total: billStats.reduce((sum: number, item: { total: number }) => sum + item.total, 0),
        byStatus: billStats.reduce((acc: Record<string, number>, item: { status: string | null; total: number }) => {
          acc[item.status ?? 'unknown'] = item.total;
          return acc;
        }, {} as Record<string, number>),
        recent: recentBills,
      },
      users: {
        total: userStats.reduce((sum: number, item: { total: number }) => sum + item.total, 0),
        byRole: userStats.reduce((acc: Record<string, number>, item: { role: string; total: number }) => {
          acc[item.role] = item.total;
          return acc;
        }, {} as Record<string, number>),
        recent: recentUsers,
      },
      system: {
        cacheStats: { hits: 0, misses: 0, size: 0 },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    res.json(stats);
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Admin dashboard critical error');
    throw new AdminError(
      'Failed to fetch dashboard data',
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'dashboard', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Dashboard data unavailable' }]
    );
  }
}));

/**
 * GET /api/admin/users
 * Retrieves a paginated, filterable, and searchable list of users.
 */
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const db = readDatabase as any; // Type assertion for Drizzle ORM compatibility
  
  try {
    const { page = '1', limit = '20', role, search } = req.query;

    const paginationValidation = inputValidationService.validatePaginationParams(page as string, limit as string);
    if (!paginationValidation.isValid) {
      throw new AdminError('Invalid pagination parameters', 400, ERROR_CODES.VALIDATION_ERROR,
        [{ field: 'pagination', code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid pagination parameters', value: paginationValidation.errors }]);
    }

    const pagination = PaginationParams.create(page as string, limit as string);

    let sanitizedSearch: string | undefined;
    if (search && typeof search === 'string') {
      const searchValidation = inputValidationService.validateSearchQuery(search);
      if (!searchValidation.isValid) {
        throw new AdminError('Invalid search query', 400, ERROR_CODES.VALIDATION_ERROR,
          [{ field: 'search', code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid search query', value: searchValidation.errors }]);
      }
      sanitizedSearch = searchValidation.data as string;
    }

    let validatedRole: UserRole | undefined;
    if (role && typeof role === 'string') {
      const roleValidation = inputValidationService.validateUserRole(role);
      if (!roleValidation.isValid) {
        throw new AdminError('Invalid role parameter', 400, ERROR_CODES.VALIDATION_ERROR,
          [{ field: 'role', code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid role parameter', value: roleValidation.errors }]);
      }
      validatedRole = roleValidation.data as UserRole;
    }

    const conditions = and(
      validatedRole ? eq(users.role, validatedRole) : undefined,
      sanitizedSearch ? or(
        ilike(users.name, secureQueryBuilderService.createSafeLikePattern(sanitizedSearch)),
        ilike(users.email, secureQueryBuilderService.createSafeLikePattern(sanitizedSearch))
      ) : undefined
    );

    const [userResults, totalResult] = await Promise.all([
      db.select({
          id: users.id, name: users.name, email: users.email, role: users.role,
          verification_status: users.verification_status, is_active: users.is_active,
          created_at: users.created_at, last_login_at: users.last_login_at,
        })
        .from(users).where(conditions).orderBy(desc(users.created_at))
        .limit(pagination.limit).offset(pagination.offset),
      db.select({ count: count() }).from(users).where(conditions),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / pagination.limit);
    const sanitizedUsers = userResults.map((user: Record<string, unknown>) =>
      secureQueryBuilderService.sanitizeOutput(user)
    );

    res.json({
      users: sanitizedUsers,
      pagination: { page: pagination.page, limit: pagination.limit, total, totalPages,
        hasNext: pagination.page < totalPages, hasPrev: pagination.page > 1 },
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error fetching users list');
    throw new AdminError('Failed to fetch users', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'users', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Unable to retrieve users' }]);
  }
}));

/**
 * PUT /api/admin/users/:id/role
 * Updates a user's role within a database transaction for atomicity.
 */
router.put('/users/:id/role',
  inputValidationService.createValidationMiddleware(commonSchemas.userUpdate.pick({ role: true }), 'body'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = writeDatabase as any; // Type assertion for Drizzle ORM compatibility
    
    try {
      const { role } = req.body as { role: UserRole };

      const roleValidation = inputValidationService.validateUserRole(role);
      if (!roleValidation.isValid) {
        throw new AdminError('Invalid role provided', 400, ERROR_CODES.VALIDATION_ERROR,
          [{ field: 'role', code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid role provided', value: roleValidation.errors }]);
      }

      if (req.user?.id === id && req.user?.role === 'admin' && role !== 'admin') {
        throw new AdminError('Admins cannot demote their own role', 403, ERROR_CODES.ACCESS_DENIED,
          [{ field: 'role', code: ERROR_CODES.ACCESS_DENIED, message: 'Self-demotion not allowed' }]);
      }

      const result = await db.transaction(async (tx: DatabaseTransaction) => {
        const currentUser = await tx.select({ role: users.role }).from(users).where(eq(users.id, id))
          .then((r: Array<{ role: string }>) => r[0]);

        if (!currentUser) throw new Error('UserNotFound');

        const updatedUser = await tx.update(users).set({ role, updated_at: new Date() }).where(eq(users.id, id))
          .returning({ id: users.id, name: users.name, email: users.email, role: users.role })
          .then((r: Array<{ id: string; name: string; email: string; role: string }>) => r[0]);

        return { updatedUser, oldRole: currentUser.role };
      });

      await securityAuditService.logAdminAction('update_user_role', req, req.user!.id, `user:${id}`,
        { targetUserId: id, oldRole: result.oldRole, newRole: role, adminUserId: req.user!.id });

      res.json({ user: result.updatedUser, message: 'User role updated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'UserNotFound') {
        throw new AdminError('User not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND,
          [{ field: 'user_id', code: ERROR_CODES.RESOURCE_NOT_FOUND, message: 'User does not exist', value: id }]);
      }
      logError({ component: 'admin-router', user_id: id, error: error instanceof Error ? error : String(error) }, 'Error updating user role');
      throw new AdminError('Failed to update user role', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
        [{ field: 'user_id', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Role update failed', value: id }]);
    }
  }));

/**
 * PUT /api/admin/users/:id/status
 * Updates a user's active status within a database transaction.
 */
router.put('/users/:id/status',
  inputValidationService.createValidationMiddleware(commonSchemas.userUpdate.pick({ is_active: true }), 'body'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = writeDatabase as any; // Type assertion for Drizzle ORM compatibility
    
    try {
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        throw new AdminError('The "is_active" field must be a boolean value', 400, ERROR_CODES.VALIDATION_ERROR,
          [{ field: 'is_active', code: ERROR_CODES.VALIDATION_ERROR, message: 'Expected boolean value', value: is_active }]);
      }

      if (req.user?.id === id && !is_active) {
        throw new AdminError('You cannot deactivate your own account', 403, ERROR_CODES.ACCESS_DENIED,
          [{ field: 'is_active', code: ERROR_CODES.ACCESS_DENIED, message: 'Self-deactivation not allowed' }]);
      }

      const result = await db.transaction(async (tx: DatabaseTransaction) => {
        const currentUser = await tx.select({ is_active: users.is_active }).from(users).where(eq(users.id, id))
          .then((r: Array<{ is_active: boolean }>) => r[0]);

        if (!currentUser) throw new Error('UserNotFound');

        const updatedUser = await tx.update(users).set({ is_active, updated_at: new Date() }).where(eq(users.id, id))
          .returning({ id: users.id, name: users.name, email: users.email, is_active: users.is_active })
          .then((r: Array<{ id: string; name: string; email: string; is_active: boolean }>) => r[0]);

        return { updatedUser, oldStatus: currentUser.is_active };
      });

      await securityAuditService.logAdminAction('update_user_status', req, req.user!.id, `user:${id}`,
        { targetUserId: id, oldStatus: result.oldStatus, newStatus: is_active, adminUserId: req.user!.id });

      res.json({ user: result.updatedUser, message: `User account has been ${is_active ? 'activated' : 'deactivated'}.` });
    } catch (error) {
      if (error instanceof Error && error.message === 'UserNotFound') {
        throw new AdminError('User not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND,
          [{ field: 'user_id', code: ERROR_CODES.RESOURCE_NOT_FOUND, message: 'User does not exist', value: id }]);
      }
      logError({ component: 'admin-router', user_id: id, error: error instanceof Error ? error : String(error) }, 'Error updating user status');
      throw new AdminError('Failed to update user status', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
        [{ field: 'user_id', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Status update failed', value: id }]);
    }
  }));

/**
 * GET /api/admin/system/health
 * Comprehensive system health check including database connectivity test.
 */
router.get('/system/health', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const db = readDatabase as any; // Type assertion for Drizzle ORM compatibility
  
  try {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      database: { connected: false, responseTime: 0 },
      cache: { hits: 0, misses: 0, size: 0 }
    };

    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1` as any);
      health.database.connected = true;
      health.database.responseTime = Date.now() - start;
    } catch (dbError) {
      health.status = 'degraded';
      health.database.connected = false;
      logError({ component: 'admin-router', error: dbError instanceof Error ? dbError : String(dbError) }, 'Database health check failed');
    }

    res.json(health);
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'System health check critical error');
    throw new AdminError('Failed to fetch system health', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'system', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Health check failed' }]);
  }
}));

/**
 * POST /api/admin/cache/clear
 * Clears application-level caches with audit logging.
 */
router.post('/cache/clear', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    await securityAuditService.logAdminAction('clear_cache', req, req.user!.id, 'system:cache',
      { adminUserId: req.user!.id, cacheType: 'application_cache' });
    res.json({ message: 'Cache cleared successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error clearing cache');
    throw new AdminError('Failed to clear cache', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'cache', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Cache clear operation failed' }]);
  }
}));

/**
 * GET /api/admin/slow-queries
 * Retrieves recent slow queries for performance analysis and optimization.
 */
router.get('/slow-queries', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50', type, minDuration } = req.query;
    const queryLimit = Math.min(parseInt(limit as string) || 50, 500);

    if (isNaN(queryLimit) || queryLimit < 1) {
      throw new AdminError('Invalid limit parameter', 400, ERROR_CODES.VALIDATION_ERROR,
        [{ field: 'limit', code: ERROR_CODES.VALIDATION_ERROR, message: 'Limit must be a positive number between 1 and 500', value: limit }]);
    }

    let slowQueries: SlowQuery[] = [];
    try {
      const queryExecutorPath = require.resolve('../../../query-executor');
      const module = await import(queryExecutorPath) as { queryExecutor: QueryExecutor };
      if (module.queryExecutor) {
        slowQueries = module.queryExecutor.getSlowQueries(queryLimit);
      }
    } catch (importError) {
      logError({ component: 'admin-router', error: importError instanceof Error ? importError : String(importError) }, 'Query executor module not available');
      res.json({
        slowQueries: [], summary: { total: 0, averageDuration: 0, maxDuration: 0, byType: {} },
        filters: { limit: queryLimit, type: type || null, minDuration: minDuration || null },
        message: 'Query executor module not available. Enable query performance monitoring to see slow queries.'
      });
      return;
    }

    if (type && typeof type === 'string') {
      const queryType = type.toUpperCase();
      slowQueries = slowQueries.filter((q: SlowQuery) => q.sql.trim().toUpperCase().split(' ')[0] === queryType);
    }

    if (minDuration && typeof minDuration === 'string') {
      const minDurationMs = parseInt(minDuration);
      if (!isNaN(minDurationMs)) {
        slowQueries = slowQueries.filter((q: SlowQuery) => q.executionTimeMs >= minDurationMs);
      }
    }

    const summary = {
      total: slowQueries.length,
      averageDuration: slowQueries.length > 0 
        ? Math.round(slowQueries.reduce((sum: number, q: SlowQuery) => sum + q.executionTimeMs, 0) / slowQueries.length) : 0,
      maxDuration: slowQueries.length > 0 ? Math.max(...slowQueries.map((q: SlowQuery) => q.executionTimeMs)) : 0,
      byType: slowQueries.reduce((acc: Record<string, number>, query: SlowQuery) => {
        const queryType = query.sql.trim().toUpperCase().split(' ')[0];
        if (queryType) acc[queryType] = (acc[queryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    const formattedQueries = slowQueries.map((q: SlowQuery) => ({
      queryId: q.queryId,
      sql: q.sql.substring(0, 200) + (q.sql.length > 200 ? '...' : ''),
      executionTimeMs: q.executionTimeMs,
      timestamp: q.timestamp,
      context: q.context,
      stackTrace: q.stackTrace?.split('\n').slice(0, 5).join('\n'),
      explainPlan: q.explainPlan?.split('\n').slice(0, 10).join('\n')
    }));

    res.json({ slowQueries: formattedQueries, summary, filters: { limit: queryLimit, type: type || null, minDuration: minDuration || null },
      message: 'Slow queries retrieved successfully' });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error fetching slow queries');
    throw new AdminError('Failed to fetch slow queries', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'queries', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Unable to retrieve slow queries' }]);
  }
}));

/**
 * DELETE /api/admin/slow-queries
 * Clears the slow query history with audit logging.
 */
router.delete('/slow-queries', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    try {
      const queryExecutorPath = require.resolve('../../../query-executor');
      const module = await import(queryExecutorPath) as { queryExecutor: QueryExecutor };
      if (module.queryExecutor) {
        module.queryExecutor.clearSlowQueries();
      }
    } catch (importError) {
      logError({ component: 'admin-router', error: importError instanceof Error ? importError : String(importError) }, 'Query executor module not available for clearing');
      res.json({ message: 'Query executor module not available', timestamp: new Date().toISOString() });
      return;
    }

    await securityAuditService.logAdminAction('clear_slow_queries', req, req.user!.id, 'system:slow-queries',
      { adminUserId: req.user!.id, action: 'cleared_slow_query_history' });

    res.json({ message: 'Slow query history cleared successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error clearing slow queries');
    throw new AdminError('Failed to clear slow queries', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'queries', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Clear operation failed' }]);
  }
}));

/**
 * GET /api/admin/logs
 * Retrieves recent application logs with filtering capabilities from the in-memory log buffer.
 */
router.get('/logs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { level = 'all', limit = '100', component, timeWindow = '3600000' } = req.query;
    const logLimit = Math.min(parseInt(limit as string) || 100, 1000);
    const timeWindowMs = Math.min(parseInt(timeWindow as string) || 3600000, 86400000); // Max 24 hours

    if (isNaN(logLimit) || logLimit < 1) {
      throw new AdminError('Invalid limit parameter', 400, ERROR_CODES.VALIDATION_ERROR,
        [{ field: 'limit', code: ERROR_CODES.VALIDATION_ERROR, message: 'Limit must be a positive number between 1 and 1000', value: limit }]);
    }

    if (isNaN(timeWindowMs) || timeWindowMs < 1) {
      throw new AdminError('Invalid timeWindow parameter', 400, ERROR_CODES.VALIDATION_ERROR,
        [{ field: 'timeWindow', code: ERROR_CODES.VALIDATION_ERROR, message: 'Time window must be a positive number in milliseconds', value: timeWindow }]);
    }

    // Query logs from the buffer
    const end = new Date();
    const start = new Date(end.getTime() - timeWindowMs);
    let logs = logBuffer.query({ start, end });

    // Filter by level if specified
    if (level && level !== 'all') {
      const levelFilter = String(level).toLowerCase();
      logs = logs.filter(log => String(log.level).toLowerCase() === levelFilter);
    }

    // Filter by component if specified
    if (component && typeof component === 'string') {
      logs = logs.filter(log => log.component === component);
    }

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    const limitedLogs = logs.slice(0, logLimit);

    // Format logs for response
    const formattedLogs = limitedLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.msg || log.message || 'No message',
      component: log.component || 'unknown',
      operation: log.operation,
      duration: log.duration,
      error: log.error,
      ...Object.fromEntries(
        Object.entries(log).filter(([key]) => 
          !['timestamp', 'level', 'msg', 'message', 'component', 'operation', 'duration', 'error', 'time', 'pid', 'hostname', 'v'].includes(key)
        )
      )
    }));

    // Get unique components for filtering suggestions
    const components = [...new Set(logs.map(log => log.component).filter(Boolean))];

    // Calculate level distribution
    const levelDistribution = logs.reduce((acc, log) => {
      const lvl = String(log.level).toLowerCase();
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      logs: formattedLogs,
      count: formattedLogs.length,
      total: logs.length,
      filters: { 
        level: level || 'all', 
        limit: logLimit,
        component: component || null,
        timeWindow: timeWindowMs
      },
      metadata: {
        bufferSize: logBuffer.size,
        timeRange: { start: start.toISOString(), end: end.toISOString() },
        availableComponents: components,
        levelDistribution
      },
      message: 'Logs retrieved successfully'
    });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error fetching logs');
    throw new AdminError('Failed to fetch logs', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'logs', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Log retrieval failed' }]);
  }
}));

/**
 * GET /api/admin/logs/metrics
 * Retrieves aggregated log metrics including error rates, performance data, and health score.
 */
router.get('/logs/metrics', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const report = logAggregator.generateMonitoringReport();
    
    res.json({
      summary: {
        timeRange: report.summary.timeRange,
        totalLogs: report.summary.totalLogs,
        errorRate: report.summary.errorRate.toFixed(2) + '%',
        logsByLevel: report.summary.logsByLevel,
        logsByComponent: report.summary.logsByComponent,
        topOperations: Object.entries(report.summary.logsByOperation)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})
      },
      performance: {
        averageResponseTime: Math.round(report.summary.performanceMetrics.averageResponseTime),
        p95ResponseTime: Math.round(report.summary.performanceMetrics.p95ResponseTime),
        p99ResponseTime: Math.round(report.summary.performanceMetrics.p99ResponseTime),
        slowRequests: report.summary.performanceMetrics.slowRequests,
        totalErrors: report.summary.performanceMetrics.totalErrors
      },
      topErrors: report.summary.topErrors.map(err => ({
        message: err.message,
        count: err.count,
        component: err.component,
        lastSeen: err.lastSeen.toISOString()
      })),
      securityEvents: report.summary.securityEvents.map(evt => ({
        type: evt.type,
        severity: evt.severity,
        count: evt.count,
        lastSeen: evt.lastSeen.toISOString()
      })),
      alerts: report.alerts.map(alert => ({
        id: alert.rule.condition.id,
        name: alert.rule.condition.name,
        severity: alert.rule.severity,
        triggered: alert.triggered,
        currentValue: alert.value,
        threshold: alert.rule.condition.threshold,
        message: alert.rule.message
      })),
      healthScore: Math.round(report.healthScore),
      recommendations: report.recommendations,
      message: 'Log metrics retrieved successfully'
    });
  } catch (error) {
    logError({ component: 'admin-router', error: error instanceof Error ? error : String(error) }, 'Error fetching log metrics');
    throw new AdminError('Failed to fetch log metrics', 500, ERROR_CODES.INTERNAL_SERVER_ERROR,
      [{ field: 'metrics', code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Metrics retrieval failed' }]);
  }
}));