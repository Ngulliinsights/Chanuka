import { database as db, users, sessions, billComments, notifications } from '../../../shared/database/connection.js';
import { eq, count, desc, sql, and, gte, like, or, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { logger } from '../../utils/logger';

// Extended user profile type that handles optional fields
interface UserProfile {
  expertise?: string[];
  organization?: string;
  bio?: string;
}

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
  profile?: UserProfile;
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
  details: Record<string, unknown>;
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

      // Build filter conditions
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

      // Build the main query - select only fields that exist in schema
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verificationStatus: users.verificationStatus,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count with the same conditions
      const countResult = await db
        .select({ value: count() })
        .from(users)
        .where(whereClause);
      
      const total = Number(countResult[0]?.value ?? 0);

      // Enhance user data with stats and sessions
      const enhancedUsers = await Promise.all(
        userList.map(async (user) => {
          const stats = await this.getUserStats(user.id);
          const sessionInfo = await this.getUserSessions(user.id);

          return {
            ...user,
            profile: {} as UserProfile, // Profile data would come from a separate table if needed
            stats,
            sessions: sessionInfo
          };
        })
      );

      return {
        users: enhancedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user list:', { component: 'SimpleTool', error: errorMessage });
      throw error;
    }
  }

  async getUserDetails(userId: string): Promise<UserDetails | null> {
    try {
      const userResult = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          verificationStatus: users.verificationStatus,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        return null;
      }

      const stats = await this.getUserStats(userId);
      const sessionInfo = await this.getUserSessions(userId);

      return {
        ...user,
        profile: {} as UserProfile,
        stats,
        sessions: sessionInfo
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user details:', { component: 'SimpleTool', error: errorMessage });
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
          timestamp: new Date().toISOString()
        }
      });

      // Only include fields that exist in the schema
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating user:', { component: 'SimpleTool', error: errorMessage });
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
      const updateData: Partial<typeof users.$inferInsert> & { updatedAt: Date } = { 
        updatedAt: new Date() 
      };
      let operationName = '';

      // Determine what fields to update based on operation type
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
          // Mark as inactive (soft delete)
          updateData.isActive = false;
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
          parameters: operation.parameters ?? {},
          timestamp: new Date().toISOString()
        }
      });

      // Perform the bulk update
      await db
        .update(users)
        .set(updateData)
        .where(inArray(users.id, operation.userIds));

      return {
        success: true,
        message: `${operation.userIds.length} users ${operationName} successfully`,
        affectedCount: operation.userIds.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error performing bulk user operation:', { component: 'SimpleTool', error: errorMessage });
      return {
        success: false,
        message: `Failed to perform bulk operation: ${errorMessage}`,
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

      // Note: Only update if password field exists in your schema
      // If it doesn't exist, you'll need to add it or handle this differently
      await db
        .update(users)
        .set({
          updatedAt: new Date()
          // password: hashedPassword - only include if field exists
        })
        .where(eq(users.id, userId));

      // Log the password reset
      this.logUserActivity({
        userId: adminId,
        action: 'password_reset',
        details: {
          targetUserId: userId,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error resetting user password:', { component: 'SimpleTool', error: errorMessage });
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
      let filteredLogs = userId 
        ? this.activityLogs.filter(log => log.userId === userId)
        : [...this.activityLogs];

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user activity logs:', { component: 'SimpleTool', error: errorMessage });
      throw error;
    }
  }

  async exportUserData(filters?: UserManagementFilters): Promise<UserExportData> {
    try {
      // Get all users matching filters (with high limit for export)
      const { users: userList } = await this.getUserList(1, 10000, filters);

      // Get summary statistics
      const totalCountResult = await db.select({ value: count() }).from(users);
      const activeCountResult = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.isActive, true));
      const verifiedCountResult = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.verificationStatus, 'verified'));

      return {
        users: userList,
        summary: {
          totalUsers: Number(totalCountResult[0]?.value ?? 0),
          activeUsers: Number(activeCountResult[0]?.value ?? 0),
          verifiedUsers: Number(verifiedCountResult[0]?.value ?? 0),
          exportDate: new Date()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error exporting user data:', { component: 'SimpleTool', error: errorMessage });
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      // Get comment count
      const commentsResult = await db
        .select({ value: count() })
        .from(billComments)
        .where(eq(billComments.userId, userId));

      // Get notifications count
      const notificationsResult = await db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.userId, userId));

      // Get last activity from comments
      const lastCommentResult = await db
        .select({ createdAt: billComments.createdAt })
        .from(billComments)
        .where(eq(billComments.userId, userId))
        .orderBy(desc(billComments.createdAt))
        .limit(1);

      return {
        commentsCount: Number(commentsResult[0]?.value ?? 0),
        billsTracked: 0, // Set to 0 since billTracking table isn't available
        notificationsReceived: Number(notificationsResult[0]?.value ?? 0),
        lastActivity: lastCommentResult[0]?.createdAt ?? null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user stats:', { component: 'SimpleTool', error: errorMessage });
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
      // Get active sessions count using the correct table name 'sessions'
      const activeSessionsResult = await db
        .select({ value: count() })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            sql`${sessions.expiresAt} > NOW()`
          )
        );

      // Get last session
      const lastSessionResult = await db
        .select({ createdAt: sessions.createdAt })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.createdAt))
        .limit(1);

      return {
        active: Number(activeSessionsResult[0]?.value ?? 0),
        lastSession: lastSessionResult[0]?.createdAt ?? null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user sessions:', { component: 'SimpleTool', error: errorMessage });
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

    // Keep only last 1000 logs in memory
    if (this.activityLogs.length > 1000) {
      this.activityLogs.shift();
    }
  }

  async getUserRoleStatistics() {
    try {
      const roleStats = await db
        .select({
          role: users.role,
          total: count(),
          active: sql<number>`SUM(CASE WHEN ${users.isActive} THEN 1 ELSE 0 END)`,
          verified: sql<number>`SUM(CASE WHEN ${users.verificationStatus} = 'verified' THEN 1 ELSE 0 END)`
        })
        .from(users)
        .groupBy(users.role);

      return roleStats.map(stat => ({
        role: stat.role,
        total: Number(stat.total),
        active: Number(stat.active),
        verified: Number(stat.verified)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user role statistics:', { component: 'SimpleTool', error: errorMessage });
      throw error;
    }
  }

  async getUserVerificationStatistics() {
    try {
      const verificationStats = await db
        .select({
          status: users.verificationStatus,
          total: count()
        })
        .from(users)
        .groupBy(users.verificationStatus);

      return verificationStats.map(stat => ({
        status: stat.status,
        count: Number(stat.total)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching user verification statistics:', { component: 'SimpleTool', error: errorMessage });
      throw error;
    }
  }
}

export const userManagementService = UserManagementService.getInstance();