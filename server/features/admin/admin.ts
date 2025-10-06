import { database as db, users, bills, billComments, analysis, notifications } from '../../../shared/database/connection.js';
import { eq, count, desc, sql, and, gte } from 'drizzle-orm';
import { systemHealthService } from '../../infrastructure/monitoring/system-health.js';
import { monitoringService } from '../../infrastructure/monitoring/monitoring.js';

export interface AdminStats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    byRole: { role: string; count: number }[];
  };
  bills: {
    total: number;
    byStatus: { status: string; count: number }[];
    newThisWeek: number;
  };
  engagement: {
    totalComments: number;
    totalAnalyses: number;
    activeUsers: number;
  };
  system: {
    databaseHealth: boolean;
    lastBackup?: Date;
    errorRate: number;
  };
}

export class AdminService {
  async getDashboardStats(): Promise<AdminStats> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get system health information
      const systemHealth = await systemHealthService.checkSystemHealth();
      const systemMetrics = await systemHealthService.getSystemMetrics();

      // User statistics
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
      const [newUsers] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, oneWeekAgo));
      
      const usersByRole = await db
        .select({
          role: users.role,
          count: count()
        })
        .from(users)
        .groupBy(users.role);

      // Bill statistics
      const [totalBills] = await db.select({ count: count() }).from(bills);
      const [newBills] = await db.select({ count: count() }).from(bills).where(gte(bills.createdAt, oneWeekAgo));
      
      const billsByStatus = await db
        .select({
          status: bills.status,
          count: count()
        })
        .from(bills)
        .groupBy(bills.status);

      // Engagement statistics
      const [totalComments] = await db.select({ count: count() }).from(billComments);
      const [totalAnalyses] = await db.select({ count: count() }).from(analysis);
      
      // Active users (users who have engaged in the last week)
      const [recentlyActiveUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.lastLoginAt, oneWeekAgo));

      return {
        users: {
          total: Number(totalUsers.count),
          active: Number(activeUsers.count),
          newThisWeek: Number(newUsers.count),
          byRole: usersByRole.map(r => ({ role: r.role, count: Number(r.count) }))
        },
        bills: {
          total: Number(totalBills.count),
          newThisWeek: Number(newBills.count),
          byStatus: billsByStatus.map(s => ({ status: s.status, count: Number(s.count) }))
        },
        engagement: {
          totalComments: Number(totalComments.count),
          totalAnalyses: Number(totalAnalyses.count),
          activeUsers: Number(recentlyActiveUsers.count)
        },
        system: {
          databaseHealth: systemHealth.checks.database.status === 'pass',
          errorRate: systemMetrics.api.errorRate / 100 // Convert percentage to decimal
        }
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Return fallback data if system health services fail
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      try {
        // Try to get basic stats without system health
        const [totalUsers] = await db.select({ count: count() }).from(users);
        const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
        const [newUsers] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, oneWeekAgo));
        const [totalBills] = await db.select({ count: count() }).from(bills);
        const [newBills] = await db.select({ count: count() }).from(bills).where(gte(bills.createdAt, oneWeekAgo));
        const [totalComments] = await db.select({ count: count() }).from(billComments);

        return {
          users: {
            total: Number(totalUsers.count),
            active: Number(activeUsers.count),
            newThisWeek: Number(newUsers.count),
            byRole: []
          },
          bills: {
            total: Number(totalBills.count),
            newThisWeek: Number(newBills.count),
            byStatus: []
          },
          engagement: {
            totalComments: Number(totalComments.count),
            totalAnalyses: 0,
            activeUsers: Number(activeUsers.count)
          },
          system: {
            databaseHealth: false,
            errorRate: 0.1 // High error rate to indicate issues
          }
        };
      } catch (fallbackError) {
        console.error('Error fetching fallback admin stats:', fallbackError);
        throw error;
      }
    }
  }

  async getUserManagement(page = 1, limit = 20, filters?: { role?: string; status?: string; search?: string }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [];

      if (filters?.role) {
        conditions.push(eq(users.role, filters.role));
      }

      if (filters?.status === 'active') {
        conditions.push(eq(users.isActive, true));
      } else if (filters?.status === 'inactive') {
        conditions.push(eq(users.isActive, false));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          sql`LOWER(${users.name}) LIKE ${searchTerm} OR LOWER(${users.email}) LIKE ${searchTerm}`
        );
      }

      let query = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verificationStatus: users.verificationStatus,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt
        })
        .from(users);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db.select({ count: count() }).from(users);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count: total }] = await countQuery;

      return {
        users: result,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user management data:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, updates: { isActive?: boolean; role?: string; verificationStatus?: string }) {
    try {
      await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async getSystemLogs(page = 1, limit = 50, level?: string) {
    try {
      // This would integrate with your logging system
      // For now, return mock data
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date(),
          level: 'info',
          message: 'User login successful',
          userId: 'user-123',
          metadata: { ip: '192.168.1.1' }
        },
        {
          id: 2,
          timestamp: new Date(),
          level: 'error',
          message: 'Database connection failed',
          metadata: { error: 'Connection timeout' }
        }
      ];

      return {
        logs: mockLogs,
        pagination: {
          page,
          limit,
          total: mockLogs.length,
          pages: 1
        }
      };
    } catch (error) {
      console.error('Error fetching system logs:', error);
      throw error;
    }
  }

  async getContentModeration(page = 1, limit = 20) {
    try {
      // Get comments that might need moderation
      const flaggedComments = await db
        .select({
          id: billComments.id,
          content: billComments.content,
          userId: billComments.userId,
          billId: billComments.billId,
          createdAt: billComments.createdAt,
          upvotes: billComments.upvotes,
          downvotes: billComments.downvotes,
          userName: users.name
        })
        .from(billComments)
        .innerJoin(users, eq(billComments.userId, users.id))
        .where(sql`${billComments.downvotes} > 5 OR LENGTH(${billComments.content}) > 1000`)
        .orderBy(desc(billComments.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        comments: flaggedComments,
        pagination: {
          page,
          limit,
          hasMore: flaggedComments.length === limit
        }
      };
    } catch (error) {
      console.error('Error fetching content moderation data:', error);
      throw error;
    }
  }

  async moderateComment(commentId: number, action: 'approve' | 'remove' | 'flag') {
    try {
      // Implement comment moderation logic
      console.log(`Moderating comment ${commentId} with action: ${action}`);
      return { success: true };
    } catch (error) {
      console.error('Error moderating comment:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();