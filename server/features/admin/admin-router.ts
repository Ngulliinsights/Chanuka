import { Router, Request, Response } from 'express';
import { sql, eq, and, or, ilike, desc, count } from 'drizzle-orm';

// Local Application Imports
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { billsService } from '../bills/index.js';
import { securityAuditService } from '../../features/security/security-audit-service.js';
import { ApiSuccess, ApiError, ApiForbidden } from '../../../shared/core/src/utilities/api';
import { logger } from '../../../shared/core/src/observability/logging';

// Database & Schema Imports
import { database as db } from '../../../shared/database/connection';
import { user, bill } from '../../../shared/schema/schema.js';

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

const router = Router();

// --- Middleware ---

// Apply authentication and admin-only access control to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// --- Route Handlers ---

/**
 * GET /api/admin/dashboard
 * Retrieves comprehensive dashboard statistics with fully optimized database queries.
 * 
 * Key optimization: All aggregations happen at the database level, minimizing memory
 * usage and network transfer. Queries execute in parallel for maximum efficiency.
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Execute all dashboard queries in parallel to minimize total response time
    const [billStats, userStats, recentBills, recentUsers] = await Promise.all([
      // Aggregate bill statistics directly in database - much more efficient than loading all bills
      db
        .select({
          total: count(),
          status: bill.status
        })
        .from(bill)
        .groupBy(bill.status)
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
           role: user.role
         })
         .from(user)
         .groupBy(user.role)
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
          id: bill.id,
          title: bill.title,
          status: bill.status,
          createdAt: bill.createdAt
        })
        .from(bill)
        .orderBy(desc(bill.createdAt))
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
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        })
        .from(user)
        .orderBy(desc(user.createdAt))
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
        cacheStats: billsService.getCacheStats(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    return ApiSuccess(res, stats);
  } catch (error) {
    logger.error('Admin dashboard critical error', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to fetch dashboard data', 500);
  }
});

/**
 * GET /api/admin/users
 * Retrieves a paginated, filterable, and searchable list of users.
 * 
 * Uses Drizzle's composable query builder for type-safe, SQL-injection-proof queries.
 * Supports filtering by role and searching across name/email fields with case-insensitive matching.
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', role, search } = req.query;
    
    // Sanitize and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Cap at 100 to prevent abuse
    const offset = (pageNum - 1) * limitNum;

    // Build composable, type-safe query conditions
    // The 'and' function filters out undefined conditions automatically
    const conditions = and(
      role && typeof role === 'string'
        ? eq(user.role, role as UserRole)
        : undefined,
      search && typeof search === 'string'
        ? or(
            ilike(user.name, `%${search}%`),
            ilike(user.email, `%${search}%`)
          )
        : undefined
    );

    // Execute both queries in parallel for better performance
    const [userResults, totalResult] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })
        .from(user)
        .where(conditions)
        .orderBy(desc(user.createdAt))
        .limit(limitNum)
        .offset(offset),

      // Count query for pagination - same conditions but just counting
      db
        .select({ count: count() })
        .from(user)
        .where(conditions),
    ]);
    
    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limitNum);

    return ApiSuccess(res, {
      users: userResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
    });
  } catch (error) {
    logger.error('Error fetching users list', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to fetch users', 500);
  }
});

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
router.put('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { role } = req.body as { role: UserRole };

    // Validate the role against our whitelist
    if (!role || !USER_ROLES.includes(role)) {
      return ApiError(res, `Invalid role. Valid roles are: ${USER_ROLES.join(', ')}`, 400);
    }

    // Prevent admins from accidentally demoting themselves and losing access
    if (req.user?.id === id && req.user?.role === 'admin' && role !== 'admin') {
      return ApiForbidden(res, 'Admins cannot demote their own role.');
    }

    // Transaction ensures atomicity: either both operations succeed or both roll back
    const result = await db.transaction(async (tx) => {
      // First, verify the user exists and get their current role
      const currentUser = await tx
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, id))
        .then(r => r[0]);
      
      if (!currentUser) {
        throw new Error('UserNotFound');
      }

      // Update the role and return the updated user data
       const updatedUser = await tx
         .update(user)
         .set({ role, updatedAt: new Date() })
         .where(eq(user.id, id))
         .returning({
           id: user.id,
           name: user.name,
           email: user.email,
           role: user.role
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

    return ApiSuccess(res, { 
      user: result.updatedUser, 
      message: 'User role updated successfully' 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UserNotFound') {
      return ApiError(res, 'User not found', 404);
    }
    logger.error('Error updating user role', { 
      component: 'admin-router', 
      userId: id, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to update user role', 500);
  }
});

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
router.put('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { isActive } = req.body;

    // Strict type validation for the boolean field
    if (typeof isActive !== 'boolean') {
      return ApiError(res, 'The "isActive" field must be a boolean value.', 400);
    }

    // Prevent admins from accidentally locking themselves out
    if (req.user?.id === id && !isActive) {
      return ApiForbidden(res, 'You cannot deactivate your own account.');
    }

    // Transaction ensures we only update if the user exists
    const result = await db.transaction(async (tx) => {
      // Get current status for audit logging
      const currentUser = await tx
        .select({ isActive: user.isActive })
        .from(user)
        .where(eq(user.id, id))
        .then(r => r[0]);
      
      if (!currentUser) {
        throw new Error('UserNotFound');
      }

      // Update the active status
       const updatedUser = await tx
         .update(user)
         .set({ isActive, updatedAt: new Date() })
         .where(eq(user.id, id))
         .returning({
           id: user.id,
           name: user.name,
           email: user.email,
           isActive: user.isActive
         })
         .then(r => r[0]);

      return { updatedUser, oldStatus: currentUser.isActive };
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
        newStatus: isActive, 
        adminUserId: req.user!.id 
      }
    );

    return ApiSuccess(res, { 
      user: result.updatedUser, 
      message: `User account has been ${isActive ? 'activated' : 'deactivated'}.` 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UserNotFound') {
      return ApiError(res, 'User not found', 404);
    }
    logger.error('Error updating user status', { 
      component: 'admin-router', 
      userId: id, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to update user status', 500);
  }
});

/**
 * GET /api/admin/system/health
 * Comprehensive system health check including database connectivity test.
 * 
 * Returns structured health information for monitoring and alerting systems.
 */
router.get('/system/health', async (req: AuthenticatedRequest, res: Response) => {
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
      cache: billsService.getCacheStats()
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

    return ApiSuccess(res, health);
  } catch (error) {
    logger.error('System health check critical error', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to fetch system health', 500);
  }
});

/**
 * POST /api/admin/cache/clear
 * Clears application-level caches with audit logging.
 * 
 * Use this endpoint to force cache invalidation when data is updated through
 * external means or when troubleshooting stale data issues.
 */
router.post('/cache/clear', async (req: AuthenticatedRequest, res: Response) => {
  try {
    billsService.clearCache();

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

    return ApiSuccess(res, { 
      message: 'Cache cleared successfully', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    logger.error('Error clearing cache', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to clear cache', 500);
  }
});

/**
 * GET /api/admin/slow-queries
 * Retrieves recent slow queries for performance analysis and optimization.
 * 
 * Supports filtering by query type (SELECT, INSERT, etc.) and minimum duration threshold.
 * This helps identify performance bottlenecks in your application.
 */
router.get('/slow-queries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50', type, minDuration } = req.query;
    const queryLimit = Math.min(parseInt(limit as string) || 50, 500);

    // Dynamic import allows this to work even if query executor isn't available
    const { queryExecutor } = await import('../../infrastructure/database/core/query-executor.js');
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

    return ApiSuccess(res, {
      slowQueries: formattedQueries,
      summary,
      filters: {
        limit: queryLimit,
        type: type || null,
        minDuration: minDuration || null
      }
    });
  } catch (error) {
    logger.error('Error fetching slow queries', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to fetch slow queries. Ensure the query executor module is available.', 500);
  }
});

/**
 * DELETE /api/admin/slow-queries
 * Clears the slow query history with audit logging.
 * 
 * Use this after you've analyzed current slow queries and want to start
 * fresh monitoring after deploying optimizations.
 */
router.delete('/slow-queries', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queryExecutor } = await import('../../infrastructure/database/core/query-executor.js');
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

    return ApiSuccess(res, { 
      message: 'Slow query history cleared successfully', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    logger.error('Error clearing slow queries', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to clear slow queries', 500);
  }
});

/**
 * GET /api/admin/logs
 * Retrieves recent application logs with filtering capabilities.
 * 
 * NOTE: This is a placeholder implementation. In production, integrate with
 * your actual logging backend (Winston transport, Datadog, LogRocket, etc.)
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { level = 'all', limit = '100' } = req.query;
    const logLimit = Math.min(parseInt(limit as string) || 100, 1000);

    // Mock implementation - replace with actual logging service integration
    const logs = [{
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Admin logs endpoint accessed by user.',
      details: { 
        userId: req.user!.id, 
        userEmail: req.user!.email,
        component: 'admin-router' 
      }
    }];

    return ApiSuccess(res, {
      logs, 
      count: logs.length, 
      filters: { level, limit: logLimit },
      note: 'This is a placeholder endpoint. Integrate with your production logging backend (e.g., Winston, Pino, Datadog) for real log data.'
    });
  } catch (error) {
    logger.error('Error fetching logs', { 
      component: 'admin-router', 
      error: error instanceof Error ? error.message : String(error) 
    });
    return ApiError(res, 'Failed to fetch logs', 500);
  }
});

export { router };





































