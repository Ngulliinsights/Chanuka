import { database as db, users, userSessions, billComments, billTracking, notifications } from '../../../shared/database/connection.js';
import { eq, count, desc, sql, and, gte, like, or, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { logger } from '../../utils/logger';

export interface UserManagementFilters {
  role?: string;
  status?: 'active' | 'inactive';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UserDetails {
  id: string;
  email: string;
  name: string;
  role: string;
  verificationStatus: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    expertise?: string[];
    organization?: string;
    bio?: string;
  };
  stats: {
    commentsCount: number;
    billsTracked: number;
    notificationsReceived: number;
    lastActivity: Date | null;
  };
  sessions: {
    active: number;
    lastSession: Date | null;
  };
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'verify' | 'reject' | 'delete' | 'changeRole';
  parameters?: {
    role?: string;
    reason?: string;
  };
}

export interface UserExportData {
  users: UserDetails[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    exportDate: Date;
  };
}

export class UserManagementService {
  private static instance: UserManagementService;
  private activityLogs: UserActivityLog[] = [];
  private logIdCounter = 1;

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  async getUserList(
    page = 1, 
    limit = 20, 
    filters?: UserManagementFilters
  ): Promise<{
    users: UserDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;
      const conditions = [];

      // Apply filters
      if (filters?.role) {
        conditions.push(eq(users.role, filters.role));
      }

      if (filters?.status === 'active') {
        conditions.push(eq(users.isActive, true));
      } else if (filters?.status === 'inactive') {
        conditions.push(eq(users.isActive, false));
      }

      if (filters?.verificationStatus) {
        conditions.push(eq(users.verificationStatus, filters.verificationStatus));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${users.name}) LIKE ${searchTerm}`,
            sql`LOWER(${users.email}) LIKE ${searchTerm}`
          )
        );
      }

      if (filters?.dateRange) {
        conditions.push(
          and(
            gte(users.createdAt, filters.dateRange.start),
            sql`${users.createdAt} <= ${filters.dateRange.end}`
          )
        );
      }

      // Build query
      let query = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verificationStatus: users.verificationStatus,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          expertise: users.expertise,
          organization: users.organization,
          bio: users.bio
        })
        .from(users);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const userList = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db.select({ count: count() }).from(users);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count: total }] = await countQuery;

      // Enhance user data with stats
      const enhancedUsers = await Promise.all(
        userList.map(async (user) => {
          const stats = await this.getUserStats(user.id);
          const sessions = await this.getUserSessions(user.id);

          return {
            ...user,
            profile: {
              expertise: user.expertise || [],
              organization: user.organization || undefined,
              bio: user.bio || undefined
            },
            stats,
            sessions
          };
        })
      );

      return {
        users: enhancedUsers,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user list:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  async getUserDetails(userId: string): Promise<UserDetails | null> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verificationStatus: users.verificationStatus,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          expertise: users.expertise,
          organization: users.organization,
          bio: users.bio
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return null;
      }

      const stats = await this.getUserStats(userId);
      const sessions = await this.getUserSessions(userId);

      return {
        ...user,
        profile: {
          expertise: user.expertise || [],
          organization: user.organization || undefined,
          bio: user.bio || undefined
        },
        stats,
        sessions
      };
    } catch (error) {
      logger.error('Error fetching user details:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  async updateUser(
    userId: string, 
    updates: {
      name?: string;
      email?: string;
      role?: string;
      verificationStatus?: string;
      isActive?: boolean;
      expertise?: string[];
      organization?: string;
      bio?: string;
    },
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Log the update action
      this.logUserActivity({
        userId: adminId,
        action: 'user_update',
        details: {
          targetUserId: userId,
          updates,
          timestamp: new Date()
        }
      });

      await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: 'User updated successfully'
      };
    } catch (error) {
      logger.error('Error updating user:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        message: 'Failed to update user'
      };
    }
  }

  async bulkUpdateUsers(
    operation: BulkUserOperation,
    adminId: string
  ): Promise<{ success: boolean; message: string; affectedCount: number }> {
    try {
      let updateData: any = { updatedAt: new Date() };
      let operationName = '';

      switch (operation.operation) {
        case 'activate':
          updateData.isActive = true;
          operationName = 'activated';
          break;
        case 'deactivate':
          updateData.isActive = false;
          operationName = 'deactivated';
          break;
        case 'verify':
          updateData.verificationStatus = 'verified';
          operationName = 'verified';
          break;
        case 'reject':
          updateData.verificationStatus = 'rejected';
          operationName = 'rejected';
          break;
        case 'changeRole':
          if (!operation.parameters?.role) {
            throw new Error('Role parameter required for role change operation');
          }
          updateData.role = operation.parameters.role;
          operationName = `role changed to ${operation.parameters.role}`;
          break;
        case 'delete':
          // For delete, we'll mark as inactive and add a deletion flag
          updateData.isActive = false;
          updateData.deletedAt = new Date();
          operationName = 'deleted';
          break;
        default:
          throw new Error('Invalid bulk operation');
      }

      // Log the bulk operation
      this.logUserActivity({
        userId: adminId,
        action: 'bulk_user_operation',
        details: {
          operation: operation.operation,
          userIds: operation.userIds,
          parameters: operation.parameters,
          timestamp: new Date()
        }
      });

      // Perform the bulk update
      const result = await db
        .update(users)
        .set(updateData)
        .where(inArray(users.id, operation.userIds));

      return {
        success: true,
        message: `${operation.userIds.length} users ${operationName} successfully`,
        affectedCount: operation.userIds.length
      };
    } catch (error) {
      logger.error('Error performing bulk user operation:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        message: `Failed to perform bulk operation: ${error.message}`,
        affectedCount: 0
      };
    }
  }

  async resetUserPassword(
    userId: string, 
    newPassword: string, 
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the password reset
      this.logUserActivity({
        userId: adminId,
        action: 'password_reset',
        details: {
          targetUserId: userId,
          timestamp: new Date()
        }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      logger.error('Error resetting user password:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }
  }

  async getUserActivityLogs(
    userId?: string,
    page = 1,
    limit = 50
  ): Promise<{
    logs: UserActivityLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let filteredLogs = this.activityLogs;

      if (userId) {
        filteredLogs = this.activityLogs.filter(log => log.userId === userId);
      }

      // Sort by timestamp descending
      filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = filteredLogs.length;
      const offset = (page - 1) * limit;
      const paginatedLogs = filteredLogs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user activity logs:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  async exportUserData(filters?: UserManagementFilters): Promise<UserExportData> {
    try {
      // Get all users matching filters (without pagination)
      const { users: userList } = await this.getUserList(1, 10000, filters);

      // Get summary statistics
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const [activeUsersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));
      const [verifiedUsersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.verificationStatus, 'verified'));

      return {
        users: userList,
        summary: {
          totalUsers: Number(totalUsersResult.count),
          activeUsers: Number(activeUsersResult.count),
          verifiedUsers: Number(verifiedUsersResult.count),
          exportDate: new Date()
        }
      };
    } catch (error) {
      logger.error('Error exporting user data:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      // Get comment count
      const [commentsResult] = await db
        .select({ count: count() })
        .from(billComments)
        .where(eq(billComments.userId, userId));

      // Get tracked bills count
      const [trackedBillsResult] = await db
        .select({ count: count() })
        .from(billTracking)
        .where(eq(billTracking.userId, userId));

      // Get notifications count
      const [notificationsResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(eq(notifications.userId, userId));

      // Get last activity (most recent comment or tracking action)
      const [lastComment] = await db
        .select({ createdAt: billComments.createdAt })
        .from(billComments)
        .where(eq(billComments.userId, userId))
        .orderBy(desc(billComments.createdAt))
        .limit(1);

      const [lastTracking] = await db
        .select({ createdAt: billTracking.createdAt })
        .from(billTracking)
        .where(eq(billTracking.userId, userId))
        .orderBy(desc(billTracking.createdAt))
        .limit(1);

      const lastActivity = [lastComment?.createdAt, lastTracking?.createdAt]
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;

      return {
        commentsCount: Number(commentsResult.count),
        billsTracked: Number(trackedBillsResult.count),
        notificationsReceived: Number(notificationsResult.count),
        lastActivity
      };
    } catch (error) {
      logger.error('Error fetching user stats:', { component: 'SimpleTool' }, error);
      return {
        commentsCount: 0,
        billsTracked: 0,
        notificationsReceived: 0,
        lastActivity: null
      };
    }
  }

  async getUserSessions(userId: string) {
    try {
      // Get active sessions count
      const [activeSessionsResult] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            sql`${userSessions.expiresAt} > NOW()`
          )
        );

      // Get last session
      const [lastSession] = await db
        .select({ createdAt: userSessions.createdAt })
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.createdAt))
        .limit(1);

      return {
        active: Number(activeSessionsResult.count),
        lastSession: lastSession?.createdAt || null
      };
    } catch (error) {
      logger.error('Error fetching user sessions:', { component: 'SimpleTool' }, error);
      return {
        active: 0,
        lastSession: null
      };
    }
  }

  private logUserActivity(activity: Omit<UserActivityLog, 'id' | 'timestamp'>) {
    const log: UserActivityLog = {
      id: `log-${this.logIdCounter++}`,
      timestamp: new Date(),
      ...activity
    };

    this.activityLogs.push(log);

    // Keep only last 1000 logs
    if (this.activityLogs.length > 1000) {
      this.activityLogs.shift();
    }
  }

  // Method to get user role statistics
  async getUserRoleStatistics() {
    try {
      const roleStats = await db
        .select({
          role: users.role,
          count: count(),
          active: sql<number>`SUM(CASE WHEN ${users.isActive} THEN 1 ELSE 0 END)`,
          verified: sql<number>`SUM(CASE WHEN ${users.verificationStatus} = 'verified' THEN 1 ELSE 0 END)`
        })
        .from(users)
        .groupBy(users.role);

      return roleStats.map(stat => ({
        role: stat.role,
        total: Number(stat.count),
        active: Number(stat.active),
        verified: Number(stat.verified)
      }));
    } catch (error) {
      logger.error('Error fetching user role statistics:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  // Method to get user verification statistics
  async getUserVerificationStatistics() {
    try {
      const verificationStats = await db
        .select({
          status: users.verificationStatus,
          count: count()
        })
        .from(users)
        .groupBy(users.verificationStatus);

      return verificationStats.map(stat => ({
        status: stat.status,
        count: Number(stat.count)
      }));
    } catch (error) {
      logger.error('Error fetching user verification statistics:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }
}

export const userManagementService = UserManagementService.getInstance();








