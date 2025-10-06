import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { billsService } from '../bills/bills.js';
import { ApiSuccess, ApiErrorResponse, ApiForbidden } from '../../utils/api-response.js';
import { database as db } from '../../../shared/database/connection.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = {
      bills: {
        total: 0,
        byStatus: {} as Record<string, number>,
        recent: [] as any[]
      },
      users: {
        total: 0,
        byRole: {} as Record<string, number>,
        recent: [] as any[]
      },
      system: {
        cacheStats: billsService.getCacheStats(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    try {
      // Get bill statistics
      const allBills = await billsService.getBills();
      stats.bills.total = allBills.length;
      
      // Count bills by status
      allBills.forEach(bill => {
        const status = bill.status || 'unknown';
        stats.bills.byStatus[status] = (stats.bills.byStatus[status] || 0) + 1;
      });

      // Get recent bills (last 10)
      stats.bills.recent = allBills
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10)
        .map(bill => ({
          id: bill.id,
          title: bill.title,
          status: bill.status,
          createdAt: bill.createdAt
        }));

    } catch (error) {
      console.error('Error fetching bill stats:', error);
    }

    try {
      // Get user statistics (basic query)
      const userCountResult = await db.execute('SELECT COUNT(*) as count FROM users');
      stats.users.total = parseInt(userCountResult.rows[0]?.count as string || '0');

      // Get users by role
      const roleCountResult = await db.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
      roleCountResult.rows.forEach((row: any) => {
        stats.users.byRole[row.role] = parseInt(row.count);
      });

      // Get recent users
      const recentUsersResult = await db.execute(
        'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'
      );
      stats.users.recent = recentUsersResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at
      }));

    } catch (error) {
      console.error('Error fetching user stats:', error);
    }

    return ApiSuccess(res, stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return ApiError(res, 'Failed to fetch dashboard data', 500);
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT id, name, email, role, verification_status, is_active, created_at, last_login_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params: any[] = [];
    let whereConditions: string[] = [];

    // Add role filter
    if (role && typeof role === 'string') {
      whereConditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }

    // Add search filter
    if (search && typeof search === 'string') {
      whereConditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    // Apply WHERE conditions
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const [usersResult, countResult] = await Promise.all([
      db.execute(query, params),
      db.execute(countQuery, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const users = usersResult.rows;
    const total = parseInt(countResult.rows[0]?.count as string || '0');
    const totalPages = Math.ceil(total / limitNum);

    return ApiSuccess(res, {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return ApiError(res, 'Failed to fetch users', 500);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['citizen', 'expert', 'admin', 'journalist', 'advocate'].includes(role)) {
      return ApiError(res, 'Invalid role specified', 400);
    }

    // Prevent self-demotion from admin
    if (req.user!.id === id && req.user!.role === 'admin' && role !== 'admin') {
      return ApiForbidden(res, 'Cannot demote yourself from admin role');
    }

    const result = await db.execute(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return ApiError(res, 'User not found', 404);
    }

    return ApiSuccess(res, {
      user: result.rows[0],
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return ApiError(res, 'Failed to update user role', 500);
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Update user active status
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return ApiError(res, 'isActive must be a boolean', 400);
    }

    // Prevent self-deactivation
    if (req.user!.id === id && !isActive) {
      return ApiForbidden(res, 'Cannot deactivate your own account');
    }

    const result = await db.execute(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, is_active',
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return ApiError(res, 'User not found', 404);
    }

    return ApiSuccess(res, {
      user: result.rows[0],
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return ApiError(res, 'Failed to update user status', 500);
  }
});

/**
 * GET /api/admin/system/health
 * Get detailed system health information
 */
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
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

    // Test database connection
    try {
      const start = Date.now();
      await db.execute('SELECT 1');
      health.database.connected = true;
      health.database.responseTime = Date.now() - start;
    } catch (error) {
      health.status = 'degraded';
      health.database.connected = false;
      console.error('Database health check failed:', error);
    }

    return ApiSuccess(res, health);
  } catch (error) {
    console.error('System health error:', error);
    return ApiError(res, 'Failed to fetch system health', 500);
  }
});

/**
 * POST /api/admin/cache/clear
 * Clear application caches
 */
router.post('/cache/clear', async (req, res) => {
  try {
    billsService.clearCache();

    return ApiSuccess(res, {
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return ApiError(res, 'Failed to clear cache', 500);
  }
});

/**
 * GET /api/admin/logs
 * Get recent application logs (basic implementation)
 */
router.get('/logs', async (req, res) => {
  try {
    const { level = 'all', limit = 100 } = req.query;
    const logLimit = Math.min(parseInt(limit as string) || 100, 1000);

    // This is a basic implementation - in production you'd want to integrate with your logging system
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Admin logs endpoint accessed',
        userId: req.user!.id
      }
    ];

    return ApiSuccess(res, {
      logs,
      count: logs.length,
      level,
      limit: logLimit
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return ApiError(res, 'Failed to fetch logs', 500);
  }
});

export { router };