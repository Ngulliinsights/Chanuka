import { database as db } from '../../../shared/database/connection';
import { user, bill, billComment, analysis, notification } from '../../../shared/schema';
import { eq, count, desc, sql, and, gte } from 'drizzle-orm';
import { systemHealthService } from '../../infrastructure/monitoring/system-health.js';
import { alertingService, notificationSchedulerService } from '../../infrastructure/notifications/index.js';
import { logger } from '@shared/core';

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
      const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(user);
      const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.isActive, true));
      const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(gte(user.createdAt, oneWeekAgo));

      const usersByRole = await db
        .select({
          role: user.role,
          count: sql<number>`count(*)`
        })
        .from(user)
        .groupBy(user.role);

      // Bill statistics
       const [totalBills] = await db.select({ count: sql<number>`count(*)` }).from(bill);
       const [newBills] = await db.select({ count: sql<number>`count(*)` }).from(bill).where(gte(bill.createdAt, oneWeekAgo));

       const billsByStatus = await db
         .select({
           status: bill.status,
           count: sql<number>`count(*)`
         })
         .from(bill)
         .groupBy(bill.status);

      // Engagement statistics
       const [totalComments] = await db.select({ count: sql<number>`count(*)` }).from(billComment);
       const [totalAnalyses] = await db.select({ count: sql<number>`count(*)` }).from(analysis);

      // Active users (users who have engaged in the last week)
       const [recentlyActiveUsers] = await db
         .select({ count: sql<number>`count(*)` })
         .from(user)
         .where(gte(user.lastLoginAt, oneWeekAgo));

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
      logger.error('Error fetching admin stats:', { component: 'Chanuka' }, { error });
      // Return fallback data if system health services fail
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      try {
        // Try to get basic stats without system health
        const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(user);
        const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.isActive, true));
        const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(gte(user.createdAt, oneWeekAgo));
        const [totalBills] = await db.select({ count: sql<number>`count(*)` }).from(bill);
        const [newBills] = await db.select({ count: sql<number>`count(*)` }).from(bill).where(gte(bill.createdAt, oneWeekAgo));
        const [totalComments] = await db.select({ count: sql<number>`count(*)` }).from(billComment);

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
        logger.error('Error fetching fallback admin stats:', { component: 'Chanuka' }, { error: fallbackError });
        throw error;
      }
    }
  }

  async getUserManagement(page = 1, limit = 20, filters?: { role?: string; status?: string; search?: string }) {
    try {
      const offset = (page - 1) * limit;
      const conditions: any[] = [];

      if (filters?.role) {
        conditions.push(eq(user.role, filters.role));
      }

      if (filters?.status === 'active') {
        conditions.push(eq(user.isActive, true));
      } else if (filters?.status === 'inactive') {
        conditions.push(eq(user.isActive, false));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          sql`LOWER(${user.name}) LIKE ${searchTerm} OR LOWER(${user.email}) LIKE ${searchTerm}`
        );
      }

      let baseQuery = db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          verificationStatus: user.verificationStatus,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        })
        .from(user);

      // Apply conditions
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const result = await baseQuery
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(user);
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
      logger.error('Error fetching user management data:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }

  async updateUserStatus(userId: string, updates: { isActive?: boolean; role?: string; verificationStatus?: string }) {
    try {
      await db
        .update(user)
        .set(updates as any)
        .where(eq(user.id, userId));

      return { success: true };
    } catch (error) {
      logger.error('Error updating user status:', { component: 'Chanuka' }, { error });
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
      logger.error('Error fetching system logs:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }

  async getContentModeration(page = 1, limit = 20) {
    try {
      // Get comments that might need moderation
      const flaggedComments = await db
        .select({
          id: billComment.id,
          content: billComment.content,
          userId: billComment.userId,
          billId: billComment.billId,
          createdAt: billComment.createdAt,
          upvotes: billComment.upvotes,
          downvotes: billComment.downvotes,
          userName: user.name
        })
        .from(billComment)
        .innerJoin(user, eq(billComment.userId, user.id))
        .where(sql`${billComment.downvotes} > 5 OR LENGTH(${billComment.content}) > 1000`)
        .orderBy(desc(billComment.createdAt))
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
      logger.error('Error fetching content moderation data:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }

  async moderateComment(commentId: number, action: 'approve' | 'remove' | 'flag') {
    try {
      // Implement comment moderation logic
      console.log(`Moderating comment ${commentId} with action: ${action}`);
      return { success: true };
    } catch (error) {
      logger.error('Error moderating comment:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }
}

export const adminService = new AdminService();

// Export router from admin-router
export { router } from './admin-router';













































