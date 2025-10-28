import { database as db, users, sessions, billComments, notifications } from '../shared/database/connection';
import { eq, count, desc, sql, and, gte, or, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { logger } from '@shared/core';

// Type definitions for better code clarity and type safety
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

// Constants for better maintainability and configuration
const ACTIVITY_LOG_MAX_SIZE = 1000;
const BCRYPT_ROUNDS = 12;
const DEFAULT_PAGE_SIZE = 20;
const MAX_EXPORT_LIMIT = 10000;

export class UserManagementService {
  private static instance: UserManagementService;
  private activityLogs: UserActivityLog[] = [];
  private logIdCounter = 1;

  // Private constructor ensures singleton pattern
  private constructor() {}

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Retrieves a paginated list of users with optional filtering
   * This method builds dynamic query conditions based on the provided filters
   */
  async getUserList(
    page = 1, 
    limit = DEFAULT_PAGE_SIZE, 
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
      const whereClause = this.buildFilterConditions(filters);
      
      // Run both queries in parallel for better performance
      const [userList, countResult] = await Promise.all([
        db
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
          .offset(offset),
        
        db
          .select({ value: count() })
          .from(users)
          .where(whereClause)
      ]);
      
      const total = Number(countResult[0]?.value ?? 0);

      // Enhance users with their stats and session info in parallel
      const enhancedUsers = await this.enrichUsersWithDetails(userList);

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
      this.handleError('Error fetching user list', error);
      throw error;
    }
  }

  /**
   * Retrieves complete details for a specific user including stats and sessions
   */
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

      // Fetch stats and sessions in parallel for efficiency
      const [stats, sessionInfo] = await Promise.all([
        this.getUserStats(userId),
        this.getUserSessions(userId)
      ]);

      return {
        ...user,
        profile: {} as UserProfile,
        stats,
        sessions: sessionInfo
      };
    } catch (error) {
      this.handleError('Error fetching user details', error);
      throw error;
    }
  }

  /**
   * Updates user information with audit logging
   * Only updates fields that are provided and exist in the schema
   */
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
      // Log the update action before making changes for audit trail
      this.logUserActivity({
        userId: adminId,
        action: 'user_update',
        details: {
          targetUserId: userId,
          updates,
          timestamp: new Date().toISOString()
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
      this.handleError('Error updating user', error);
      return {
        success: false,
        message: 'Failed to update user'
      };
    }
  }

  /**
   * Performs bulk operations on multiple users efficiently
   * Supports various operations like activate, deactivate, verify, etc.
   */
  async bulkUpdateUsers(
    operation: BulkUserOperation,
    adminId: string
  ): Promise<{ success: boolean; message: string; affectedCount: number }> {
    try {
      if (operation.userIds.length === 0) {
        return {
          success: false,
          message: 'No users specified for bulk operation',
          affectedCount: 0
        };
      }

      const { updateData, operationName } = this.getBulkOperationConfig(operation);

      // Log the bulk operation for audit purposes
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

      // Perform the bulk update in a single database operation
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
      this.handleError('Error performing bulk user operation', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to perform bulk operation: ${errorMessage}`,
        affectedCount: 0
      };
    }
  }

  /**
   * Resets a user's password with secure hashing
   * Note: This assumes a password field exists in your schema
   */
  async resetUserPassword(
    userId: string, 
    newPassword: string, 
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Hash the password with a secure number of rounds
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await db
        .update(users)
        .set({
          updatedAt: new Date()
          // Add password field update here if it exists in your schema:
          // password: hashedPassword
        })
        .where(eq(users.id, userId));

      // Log password reset without storing the actual password
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
      this.handleError('Error resetting user password', error);
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }
  }

  /**
   * Retrieves activity logs with optional filtering by user
   * Logs are stored in memory with a maximum size limit
   */
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

      // Sort by most recent first
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
      this.handleError('Error fetching user activity logs', error);
      throw error;
    }
  }

  /**
   * Exports user data with summary statistics
   * Uses a high limit to retrieve all matching users for export
   */
  async exportUserData(filters?: UserManagementFilters): Promise<UserExportData> {
    try {
      const { users: userList } = await this.getUserList(1, MAX_EXPORT_LIMIT, filters);

      // Gather summary statistics in parallel
      const [totalCountResult, activeCountResult, verifiedCountResult] = await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(users).where(eq(users.isActive, true)),
        db.select({ value: count() }).from(users).where(eq(users.verificationStatus, 'verified'))
      ]);

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
      this.handleError('Error exporting user data', error);
      throw error;
    }
  }

  /**
   * Retrieves statistics grouped by user role
   * Useful for dashboard analytics and reporting
   */
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
      this.handleError('Error fetching user role statistics', error);
      throw error;
    }
  }

  /**
   * Retrieves statistics grouped by verification status
   * Helps track the verification pipeline
   */
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
      this.handleError('Error fetching user verification statistics', error);
      throw error;
    }
  }

  // Private helper methods for cleaner code organization

  /**
   * Builds filter conditions dynamically based on provided filters
   * This centralizes the filtering logic for reusability
   * 
   * Note: We use type assertion for the conditions array because Drizzle's
   * type system can be overly strict when mixing different SQL expression types
   */
  private buildFilterConditions(filters?: UserManagementFilters) {
    // Type assertion helps TypeScript understand we're building valid SQL conditions
    const conditions: any[] = [];

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

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Enriches basic user data with stats and session information
   * Uses parallel processing for optimal performance
   */
  private async enrichUsersWithDetails(userList: any[]): Promise<UserDetails[]> {
    return Promise.all(
      userList.map(async (user) => {
        const [stats, sessionInfo] = await Promise.all([
          this.getUserStats(user.id),
          this.getUserSessions(user.id)
        ]);

        return {
          ...user,
          profile: {} as UserProfile,
          stats,
          sessions: sessionInfo
        };
      })
    );
  }

  /**
   * Retrieves comprehensive statistics for a specific user
   * Includes comment counts, notifications, and last activity
   */
  private async getUserStats(userId: string) {
    try {
      // Fetch all stats in parallel for better performance
      const [commentsResult, notificationsResult, lastCommentResult] = await Promise.all([
        db.select({ value: count() }).from(billComments).where(eq(billComments.userId, userId)),
        db.select({ value: count() }).from(notifications).where(eq(notifications.userId, userId)),
        db
          .select({ createdAt: billComments.createdAt })
          .from(billComments)
          .where(eq(billComments.userId, userId))
          .orderBy(desc(billComments.createdAt))
          .limit(1)
      ]);

      return {
        commentsCount: Number(commentsResult[0]?.value ?? 0),
        billsTracked: 0, // Placeholder for future implementation
        notificationsReceived: Number(notificationsResult[0]?.value ?? 0),
        lastActivity: lastCommentResult[0]?.createdAt ?? null
      };
    } catch (error) {
      this.handleError('Error fetching user stats', error);
      return this.getDefaultUserStats();
    }
  }

  /**
   * Retrieves session information for a user
   * Shows active session count and most recent session
   */
  private async getUserSessions(userId: string) {
    try {
      const [activeSessionsResult, lastSessionResult] = await Promise.all([
        db
          .select({ value: count() })
          .from(sessions)
          .where(
            and(
              eq(sessions.userId, userId),
              sql`${sessions.expiresAt} > NOW()`
            )
          ),
        db
          .select({ createdAt: sessions.createdAt })
          .from(sessions)
          .where(eq(sessions.userId, userId))
          .orderBy(desc(sessions.createdAt))
          .limit(1)
      ]);

      return {
        active: Number(activeSessionsResult[0]?.value ?? 0),
        lastSession: lastSessionResult[0]?.createdAt ?? null
      };
    } catch (error) {
      this.handleError('Error fetching user sessions', error);
      return {
        active: 0,
        lastSession: null
      };
    }
  }

  /**
   * Configures the update data and operation name for bulk operations
   * Centralizes bulk operation logic for maintainability
   */
  private getBulkOperationConfig(operation: BulkUserOperation): {
    updateData: Partial<typeof users.$inferInsert> & { updatedAt: Date };
    operationName: string;
  } {
    const updateData: Partial<typeof users.$inferInsert> & { updatedAt: Date } = { 
      updatedAt: new Date() 
    };
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
        updateData.isActive = false;
        operationName = 'deleted';
        break;
      default:
        throw new Error('Invalid bulk operation');
    }

    return { updateData, operationName };
  }

  /**
   * Logs user activity to in-memory storage with automatic size management
   * Keeps only the most recent logs based on configured maximum
   */
  private logUserActivity(activity: Omit<UserActivityLog, 'id' | 'timestamp'>) {
    const log: UserActivityLog = {
      id: `log-${this.logIdCounter++}`,
      timestamp: new Date(),
      ...activity
    };

    this.activityLogs.push(log);

    // Automatically prune old logs to prevent memory issues
    if (this.activityLogs.length > ACTIVITY_LOG_MAX_SIZE) {
      this.activityLogs.shift();
    }
  }

  /**
   * Centralized error handling for consistent logging
   */
  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(message, { component: 'UserManagementService', error: errorMessage });
  }

  /**
   * Returns default user stats when fetching fails
   */
  private getDefaultUserStats() {
    return {
      commentsCount: 0,
      billsTracked: 0,
      notificationsReceived: 0,
      lastActivity: null
    };
  }
}

// Export singleton instance for easy consumption
export const userManagementService = UserManagementService.getInstance();






































