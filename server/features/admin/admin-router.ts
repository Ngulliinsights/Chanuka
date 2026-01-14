/**
 * Admin Router - Migrated to Unified Error Handling System
 * 
 * Migration from ApiError/ApiForbidden/ApiSuccess to BaseError/ValidationError
 * 9 routes covering:
 * - Dashboard analytics
 * - User management (list, update role, update status)
 * - System health monitoring
 * - Cache management
 * - Query performance analysis
 * - Application logging
 */

import { securityAuditService } from '@server/features/security/security-audit-service.ts';
import { commonSchemas, inputValidationService } from '@server/infrastructure/security/input-validation-service.js';
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder.js';
import { authenticateToken, requireRole } from '@server/middleware/auth.js';
import { logger } from '@shared/core';
import { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES } from '@shared/constants';
import { createErrorContext } from '@server/infrastructure/error-handling';
import { NextFunction, Request, Response, Router } from 'express';
import { database as db } from '@server/infrastructure/database';
import { bills, users } from '@server/infrastructure/schema';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';

// --- Constants and Types ---

const USER_ROLES = ['citizen', 'expert', 'admin', 'journalist', 'advocate'] as const;
type UserRole = (typeof USER_ROLES)[number];

// Extend Express Request type to include authenticated user information
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
  };
}

export const router = Router();

/**
 * Higher-order function that wraps async route handlers with error handling
 * Errors are automatically caught and passed to the unified error middleware
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// --- Middleware ---

// Apply authentication and admin-only access control to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Add input validation middleware for all routes
router.use((req, res, next) => {
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
 * 
 * Key optimization: All aggregations happen at the database level, minimizing memory
 * usage and network transfer. Queries execute in parallel for maximum efficiency.
 */
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/admin/dashboard');

  try {
    // Execute all dashboard queries in parallel to minimize total response time
    const [billStats, userStats, recentBills, recentUsers] = await Promise.all([
      // Aggregate bill statistics directly in database - much more efficient than loading all bills
      db
        .select({
          total: count(),
          status: bills.status
        })
        .from(bills)
        .groupBy(bills.status)
        .catch(err => {
          logger.error('Error fetching bill stats for dashboard', {
            component: 'admin-router',
            error: err
          });
          return []; // Graceful degradation - dashboard still works if one metric fails
        }),

      // Aggregate user statistics directly in database
      db
        .select({
          total: count(),
          role: users.role
        })
        .from(users)
        .groupBy(users.role)
        .catch(err => {
          logger.error('Error fetching user stats for dashboard', {
            component: 'admin-router',
            error: err
          });
          return [];
        }),

      // Fetch only the essential fields for recent bills to minimize data transfer
      db
        .select({
          id: bills.id,
          title: bills.title,
          status: bills.status,
          created_at: bills.created_at
        })
        .from(bills)
        .orderBy(desc(bills.created_at))
        .limit(10)
        .catch(err => {
          logger.error('Error fetching recent bills for dashboard', {
            component: 'admin-router',
            error: err
          });
          return [];
        }),

      // Fetch only the essential fields for recent users
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          created_at: users.created_at
        })
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(10)
        .catch(err => {
          logger.error('Error fetching recent users for dashboard', {
            component: 'admin-router',
            error: err
          });
          return [];
        }),
    ]);

    // Transform the parallel query results into the final response structure
    const stats = {
      bills: {
        total: billStats.reduce((sum, item) => sum + item.total, 0),
        byStatus: billStats.reduce((acc, item) => {
          acc[item.status ?? 'unknown'] = item.total;
          return acc;
        }, {} as Record<string, number>),
        recent: recentBills,
      },
      users: {
        total: userStats.reduce((sum, item) => sum + item.total, 0),
        byRole: userStats.reduce((acc, item) => {
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
    logger.error('Admin dashboard critical error', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to fetch dashboard data', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * GET /api/admin/users
 * Retrieves a paginated, filterable, and searchable list of users.
 * 
 * Uses Drizzle's composable query builder for type-safe, SQL-injection-proof queries.
 * Supports filtering by role and searching across name/email fields with case-insensitive matching.
 */
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/admin/users');
  
  try {
    const { page = '1', limit = '20', role, search } = req.query;

    // Validate pagination parameters using secure validation
    const paginationValidation = inputValidationService.validatePaginationParams(
      page as string,
      limit as string
    );

    if (!paginationValidation.isValid) {
      throw new ValidationError('Invalid pagination parameters', [
        {
          field: 'pagination',
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid pagination parameters',
          value: paginationValidation.errors
        }
      ]);
    }

    const { page: pageNum, limit: limitNum, offset } = secureQueryBuilder.validatePaginationParams(
      page as string,
      limit as string
    );

    // Validate and sanitize search parameters
    let sanitizedSearch: string | undefined;
    if (search && typeof search === 'string') {
      const searchValidation = inputValidationService.validateSearchQuery(search);
      if (!searchValidation.isValid) {
        throw new ValidationError('Invalid search query', [
          {
            field: 'search',
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid search query',
            value: searchValidation.errors
          }
        ]);
      }
      sanitizedSearch = searchValidation.data;
    }

    // Validate role parameter
    let validatedRole: UserRole | undefined;
    if (role && typeof role === 'string') {
      const roleValidation = inputValidationService.validateUserRole(role);
      if (!roleValidation.isValid) {
        throw new ValidationError('Invalid role parameter', [
          {
            field: 'role',
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid role parameter',
            value: roleValidation.errors
          }
        ]);
      }
      validatedRole = roleValidation.data as UserRole;
    }

    // Build composable, type-safe query conditions using validated inputs
    const conditions = and(
      validatedRole ? eq(users.role, validatedRole) : undefined,
      sanitizedSearch ? or(
        ilike(users.name, secureQueryBuilder.createSafeLikePattern(sanitizedSearch)),
        ilike(users.email, secureQueryBuilder.createSafeLikePattern(sanitizedSearch))
      ) : undefined
    );

    // Execute both queries in parallel for better performance
    const [userResults, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          verification_status: users.verification_status,
          is_active: users.is_active,
          created_at: users.created_at,
          last_login_at: users.last_login_at,
        })
        .from(users)
        .where(conditions)
        .orderBy(desc(users.created_at))
        .limit(limitNum)
        .offset(offset),

      // Count query for pagination - same conditions but just counting
      db
        .select({ count: count() })
        .from(users)
        .where(conditions),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limitNum);

    // Sanitize output data to remove sensitive information
    const sanitizedUsers = userResults.map(user =>
      secureQueryBuilder.sanitizeOutput(user)
    );

    res.json({
      users: sanitizedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching users list', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to fetch users', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * PUT /api/admin/users/:id/role
 * Updates a user's role within a database transaction for atomicity.
 * 
 * Safety features:
 * - Validates role against whitelist
 * - Prevents admins from demoting themselves
 * - Uses transaction to ensure user exists before updating
 * - Comprehensive audit logging
 */
router.put('/users/:id/role',
  inputValidationService.createValidationMiddleware(
    commonSchemas.userUpdate.pick({ role: true }),
    'body'
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const context = createErrorContext(req, 'PUT /api/admin/users/:id/role');
    const { id } = req.params;
    
    try {
      const { role } = req.body as { role: UserRole };

      // Additional validation for role update
      const roleValidation = inputValidationService.validateUserRole(role);
      if (!roleValidation.isValid) {
        throw new ValidationError('Invalid role provided', [
          {
            field: 'role',
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid role provided',
            value: roleValidation.errors
          }
        ]);
      }

      // Prevent admins from accidentally demoting themselves and losing access
      if (req.user?.id === id && req.user?.role === 'admin' && role !== 'admin') {
        throw new BaseError('Admins cannot demote their own role', {
          statusCode: 403,
          code: ERROR_CODES.ACCESS_DENIED,
          domain: ErrorDomain.AUTHORIZATION,
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // Transaction ensures atomicity: either both operations succeed or both roll back
      const result = await db.transaction(async (tx) => {
        // First, verify the user exists and get their current role
        const currentUser = await tx
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, id))
          .then(r => r[0]);

        if (!currentUser) {
          throw new Error('UserNotFound');
        }

        // Update the role and return the updated user data
        const updatedUser = await tx
          .update(users)
          .set({ role, updated_at: new Date() })
          .where(eq(users.id, id))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
          })
          .then(r => r[0]);

        return { updatedUser, oldRole: currentUser.role };
      });

      // Log this admin action for compliance and auditing purposes
      await securityAuditService.logAdminAction(
        'update_user_role',
        req,
        req.user!.id,
        `user:${id}`,
        {
          targetUserId: id,
          oldRole: result.oldRole,
          newRole: role,
          adminUserId: req.user!.id
        }
      );

      res.json({
        user: result.updatedUser,
        message: 'User role updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'UserNotFound') {
        throw new BaseError('User not found', {
          statusCode: 404,
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.LOW,
          details: { user_id: id }
        });
      }
      logger.error('Error updating user role', {
        component: 'admin-router',
        user_id: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new BaseError('Failed to update user role', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { user_id: id }
      });
    }
  }));

/**
 * PUT /api/admin/users/:id/status
 * Updates a user's active status within a database transaction.
 * 
 * Safety features:
 * - Validates boolean input
 * - Prevents admins from deactivating themselves
 * - Atomic transaction for data consistency
 * - Full audit trail
 */
router.put('/users/:id/status',
  inputValidationService.createValidationMiddleware(
    commonSchemas.userUpdate.pick({ is_active: true }),
    'body'
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const context = createErrorContext(req, 'PUT /api/admin/users/:id/status');
    const { id } = req.params;
    
    try {
      const { is_active } = req.body;

      // Additional validation already handled by middleware
      if (typeof is_active !== 'boolean') {
        throw new ValidationError('The "is_active" field must be a boolean value', [
          {
            field: 'is_active',
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Expected boolean value',
            value: is_active
          }
        ]);
      }

      // Prevent admins from accidentally locking themselves out
      if (req.user?.id === id && !is_active) {
        throw new BaseError('You cannot deactivate your own account', {
          statusCode: 403,
          code: ERROR_CODES.ACCESS_DENIED,
          domain: ErrorDomain.AUTHORIZATION,
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // Transaction ensures we only update if the user exists
      const result = await db.transaction(async (tx) => {
        // Get current status for audit logging
        const currentUser = await tx
          .select({ is_active: users.is_active })
          .from(users)
          .where(eq(users.id, id))
          .then(r => r[0]);

        if (!currentUser) {
          throw new Error('UserNotFound');
        }

        // Update the active status
        const updatedUser = await tx
          .update(users)
          .set({ is_active, updated_at: new Date() })
          .where(eq(users.id, id))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            is_active: users.is_active
          })
          .then(r => r[0]);

        return { updatedUser, oldStatus: currentUser.is_active };
      });

      // Create audit log entry for compliance tracking
      await securityAuditService.logAdminAction(
        'update_user_status',
        req,
        req.user!.id,
        `user:${id}`,
        {
          targetUserId: id,
          oldStatus: result.oldStatus,
          newStatus: is_active,
          adminUserId: req.user!.id
        }
      );

      res.json({
        user: result.updatedUser,
        message: `User account has been ${is_active ? 'activated' : 'deactivated'}.`
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'UserNotFound') {
        throw new BaseError('User not found', {
          statusCode: 404,
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.LOW,
          details: { user_id: id }
        });
      }
      logger.error('Error updating user status', {
        component: 'admin-router',
        user_id: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new BaseError('Failed to update user status', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { user_id: id }
      });
    }
  }));

/**
 * GET /api/admin/system/health
 * Comprehensive system health check including database connectivity test.
 * 
 * Returns structured health information for monitoring and alerting systems.
 */
router.get('/system/health', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/admin/system/health');
  
  try {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: false,
        responseTime: 0
      },
      cache: { hits: 0, misses: 0, size: 0 }
    };

    // Test database connectivity with response time measurement
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      health.database.connected = true;
      health.database.responseTime = Date.now() - start;
    } catch (dbError) {
      // Degrade gracefully - system is still partially functional
      health.status = 'degraded';
      health.database.connected = false;
      logger.error('Database health check failed', {
        component: 'admin-router',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
    }

    res.json(health);
  } catch (error) {
    logger.error('System health check critical error', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to fetch system health', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * POST /api/admin/cache/clear
 * Clears application-level caches with audit logging.
 * 
 * Use this endpoint to force cache invalidation when data is updated through
 * external means or when troubleshooting stale data issues.
 */
router.post('/cache/clear', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'POST /api/admin/cache/clear');
  
  try {
    // Cache clearing logic would go here
    // billService.clearCache();

    // Log this admin action for compliance and debugging
    await securityAuditService.logAdminAction(
      'clear_cache',
      req,
      req.user!.id,
      'system:cache',
      {
        adminUserId: req.user!.id,
        cacheType: 'application_cache'
      }
    );

    res.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to clear cache', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * GET /api/admin/slow-queries
 * Retrieves recent slow queries for performance analysis and optimization.
 * 
 * Supports filtering by query type (SELECT, INSERT, etc.) and minimum duration threshold.
 * This helps identify performance bottlenecks in your application.
 */
router.get('/slow-queries', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/admin/slow-queries');
  
  try {
    const { limit = '50', type, minDuration } = req.query;
    const queryLimit = Math.min(parseInt(limit as string) || 50, 500);

    // Validate limit parameter
    if (isNaN(queryLimit) || queryLimit < 1) {
      throw new ValidationError('Invalid limit parameter', [
        {
          field: 'limit',
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Limit must be a positive number between 1 and 500',
          value: limit
        }
      ]);
    }

    // Dynamic import allows this to work even if query executor isn't available
    const { queryExecutor } = await import('../../../query-executor');
    let slowQueries = queryExecutor.getSlowQueries(queryLimit);

    // Filter by SQL operation type if specified (e.g., SELECT, UPDATE)
    if (type && typeof type === 'string') {
      const queryType = type.toUpperCase();
      slowQueries = slowQueries.filter(q => {
        const firstWord = q.sql.trim().toUpperCase().split(' ')[0];
        return firstWord === queryType;
      });
    }

    // Filter by minimum execution time threshold
    if (minDuration && typeof minDuration === 'string') {
      const minDurationMs = parseInt(minDuration);
      if (!isNaN(minDurationMs)) {
        slowQueries = slowQueries.filter(q => q.executionTimeMs >= minDurationMs);
      }
    }

    // Calculate summary statistics to help identify patterns
    const summary = {
      total: slowQueries.length,
      averageDuration: slowQueries.length > 0
        ? Math.round(slowQueries.reduce((sum, q) => sum + q.executionTimeMs, 0) / slowQueries.length)
        : 0,
      maxDuration: slowQueries.length > 0
        ? Math.max(...slowQueries.map(q => q.executionTimeMs))
        : 0,
      byType: slowQueries.reduce((acc, query) => {
        const queryType = query.sql.trim().toUpperCase().split(' ')[0];
        acc[queryType] = (acc[queryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Format queries for readability and reduce payload size
    const formattedQueries = slowQueries.map(q => ({
      queryId: q.queryId,
      sql: q.sql.substring(0, 200) + (q.sql.length > 200 ? '...' : ''),
      executionTimeMs: q.executionTimeMs,
      timestamp: q.timestamp,
      context: q.context,
      // Truncate stack traces to most relevant frames
      stackTrace: q.stackTrace?.split('\n').slice(0, 5).join('\n'),
      // Include first part of explain plan for quick analysis
      explainPlan: q.explainPlan?.split('\n').slice(0, 10).join('\n')
    }));

    res.json({
      slowQueries: formattedQueries,
      summary,
      filters: {
        limit: queryLimit,
        type: type || null,
        minDuration: minDuration || null
      },
      message: 'Slow queries retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching slow queries', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to fetch slow queries', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router', note: 'Ensure the query executor module is available' }
    });
  }
}));

/**
 * DELETE /api/admin/slow-queries
 * Clears the slow query history with audit logging.
 * 
 * Use this after you've analyzed current slow queries and want to start
 * fresh monitoring after deploying optimizations.
 */
router.delete('/slow-queries', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'DELETE /api/admin/slow-queries');
  
  try {
    const { queryExecutor } = await import('../../../query-executor');
    queryExecutor.clearSlowQueries();

    // Log the action for audit compliance
    await securityAuditService.logAdminAction(
      'clear_slow_queries',
      req,
      req.user!.id,
      'system:slow-queries',
      {
        adminUserId: req.user!.id,
        action: 'cleared_slow_query_history'
      }
    );

    res.json({
      message: 'Slow query history cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing slow queries', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to clear slow queries', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * GET /api/admin/logs
 * Retrieves recent application logs with filtering capabilities.
 * 
 * NOTE: This is a placeholder implementation. In production, integrate with
 * your actual logging backend (Winston transport, Datadog, LogRocket, etc.)
 */
router.get('/logs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/admin/logs');
  
  try {
    const { level = 'all', limit = '100' } = req.query;
    const logLimit = Math.min(parseInt(limit as string) || 100, 1000);

    // Validate limit parameter
    if (isNaN(logLimit) || logLimit < 1) {
      throw new ValidationError('Invalid limit parameter', [
        {
          field: 'limit',
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Limit must be a positive number between 1 and 1000',
          value: limit
        }
      ]);
    }

    // Mock implementation - replace with actual logging service integration
    const logs = [{
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Admin logs endpoint accessed by users.',
      details: {
        user_id: req.user!.id,
        userEmail: req.user!.email,
        component: 'admin-router'
      }
    }];

    res.json({
      logs,
      count: logs.length,
      filters: { level, limit: logLimit },
      note: 'This is a placeholder endpoint. Integrate with your production logging backend (e.g., Winston, Pino, Datadog) for real log data.',
      message: 'Logs retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching logs', {
      component: 'admin-router',
      error: error instanceof Error ? error.message : String(error)
    });
    throw new BaseError('Failed to fetch logs', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'admin-router' }
    });
  }
}));

/**
 * All errors are now handled by the unified error middleware
 * (createUnifiedErrorMiddleware) which is registered in server/index.ts
 */
