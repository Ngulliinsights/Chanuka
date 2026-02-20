import { alertingService, notificationSchedulerService } from '@server/infrastructure/notifications/index';
import { logger } from '@server/infrastructure/observability';
import { database as db } from '@server/infrastructure/database';
import { and, count, desc, eq, gte,sql } from 'drizzle-orm';

import { analysis, bill, comments, notification,users  } from '@shared/schema';

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
      // const systemHealth = await systemHealthService.checkSystemHealth(); // TODO: Create system health service
      // const systemMetrics = await systemHealthService.getSystemMetrics(); // TODO: Create system health service
      const systemHealth = { checks: { database: { status: 'pass' } } };
      const systemMetrics = { api: { errorRate: 5 } };

      // User statistics
      const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(user);
      const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(eq(users.is_active, true));
      const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(gte(users.created_at, oneWeekAgo));

      const usersByRole = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)`
        })
        .from(user)
        .groupBy(users.role);

      // Bill statistics
       const [totalBills] = await db.select({ count: sql<number>`count(*)` }).from(bill);
       const [newBills] = await db.select({ count: sql<number>`count(*)` }).from(bill).where(gte(bills.created_at, oneWeekAgo));

       const billsByStatus = await db
         .select({
           status: bills.status,
           count: sql<number>`count(*)`
         })
         .from(bill)
         .groupBy(bills.status);

      // Engagement statistics
       const [totalComments] = await db.select({ count: sql<number>`count(*)` }).from(comments);
       const [totalAnalyses] = await db.select({ count: sql<number>`count(*)` }).from(analysis);

      // Active users (users who have engaged in the last week)
       const [recentlyActiveUsers] = await db
         .select({ count: sql<number>`count(*)` })
         .from(user)
         .where(gte(users.last_login_at, oneWeekAgo));

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
        const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(eq(users.is_active, true));
        const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(user).where(gte(users.created_at, oneWeekAgo));
        const [totalBills] = await db.select({ count: sql<number>`count(*)` }).from(bill);
        const [newBills] = await db.select({ count: sql<number>`count(*)` }).from(bill).where(gte(bills.created_at, oneWeekAgo));
        const [totalComments] = await db.select({ count: sql<number>`count(*)` }).from(comments);

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
      const conditions: unknown[] = [];

      if (filters?.role) {
        conditions.push(eq(users.role, filters.role));
      }

      if (filters?.status === 'active') {
        conditions.push(eq(users.is_active, true));
      } else if (filters?.status === 'inactive') {
        conditions.push(eq(users.is_active, false));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          sql`LOWER(${users.name}) LIKE ${searchTerm} OR LOWER(${users.email}) LIKE ${searchTerm}`
        );
      }

      let baseQuery = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verification_status: users.verification_status,
          is_active: users.is_active,
          last_login_at: users.last_login_at,
          created_at: users.created_at
        })
        .from(user);

      // Apply conditions
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const result = await baseQuery
        .orderBy(desc(users.created_at))
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

  async updateUserStatus(user_id: string, updates: { is_active?: boolean; role?: string; verification_status?: string }) { try {
      await db
        .update(user)
        .set(updates as any)
        .where(eq(users.id, user_id));

      return { success: true  };
    } catch (error) {
      logger.error('Error updating user status:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }

  async getSystemLogs(page = 1, limit = 50, level?: string) { try {
      // This would integrate with your logging system
      // For now, return mock data
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date(),
          level: 'info',
          message: 'User login successful',
          user_id: 'user-123',
          metadata: { ip: '192.168.1.1'  }
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

  async getContentModeration(page = 1, limit = 20) { try {
      // Get comments that might need moderation
      const flaggedComments = await db
        .select({
          id: comments.id,
          content: comments.content,
          user_id: comments.user_id,
          bill_id: comments.bill_id,
          created_at: comments.created_at,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          userName: users.name
          })
        .from(comments)
        .innerJoin(user, eq(comments.user_id, users.id))
        .where(sql`${comments.downvotes} > 5 OR LENGTH(${comments.content}) > 1000`)
        .orderBy(desc(comments.created_at))
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

  async moderateComment(comment_id: number, action: 'approve' | 'remove' | 'flag') {
    try {
      // Implement comment moderation logic
      console.log(`Moderating comment ${comment_id} with action: ${action}`);
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

















































