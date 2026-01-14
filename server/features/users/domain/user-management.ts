import { logger  } from '@shared/core';
import { comments, database as db, notifications,sessions, users } from '@server/infrastructure/database';
import bcrypt from 'bcrypt';
import { and, count, desc, eq, gte, inArray,sql } from 'drizzle-orm';

// Type definitions for better code clarity and type safety
interface UserProfile {
  expertise?: string[];
  organization?: string;
  bio?: string;
}

export interface UserManagementFilters {
  role?: 'citizen' | 'expert' | 'admin' | 'moderator' | 'ambassador' | 'organizer';
  status?: 'active' | 'inactive';
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UserDetails {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
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
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface BulkUserOperation {
  user_ids: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'changeRole';
  parameters?: {
    role?: 'citizen' | 'expert' | 'admin' | 'moderator' | 'ambassador' | 'organizer';
    reason?: string;
  };
}

export interface UserExportData {
  users: UserDetails[];
  summary: {
    totalUsers: number;
    activeUsers: number;
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

  private constructor() {}

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Retrieves a paginated list of users with optional filtering.
   * This method builds dynamic query conditions based on the provided filters,
   * then executes both the data fetch and count query in parallel for optimal performance.
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

      // Execute both queries in parallel to minimize database round trips
      const [userList, countResult] = await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            is_active: users.is_active,
            last_login_at: users.last_login_at,
            created_at: users.created_at,
            updated_at: users.updated_at
          })
          .from(users)
          .where(whereClause)
          .orderBy(desc(users.created_at))
          .limit(limit)
          .offset(offset),

        db
          .select({ value: count() })
          .from(users)
          .where(whereClause)
      ]);

      const total = Number(countResult[0]?.value ?? 0);

      // Enrich each user with their statistics and session information
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
   * Retrieves complete details for a specific user including their activity stats
   * and current session information. Returns null if the user doesn't exist.
   */
  async getUserDetails(user_id: string): Promise<UserDetails | null> {
    try {
      const userResult = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          is_active: users.is_active,
          last_login_at: users.last_login_at,
          created_at: users.created_at,
          updated_at: users.updated_at
        })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        return null;
      }

      // Fetch related data in parallel for better performance
      const [stats, sessionInfo] = await Promise.all([
        this.getUserStats(user_id),
        this.getUserSessions(user_id)
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
   * Updates user information with comprehensive audit logging.
   * Only the provided fields will be updated, leaving others unchanged.
   */
  async updateUser(
    user_id: string,
    updates: {
      email?: string;
      role?: 'citizen' | 'expert' | 'admin' | 'moderator' | 'ambassador' | 'organizer';
      is_active?: boolean;
    },
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Create an audit trail before making changes
      this.logUserActivity({
        user_id: adminId,
        action: 'user_update',
        details: {
          targetUserId: user_id,
          updates,
          timestamp: new Date().toISOString()
        }
      });

      await db
        .update(users)
        .set({
          ...updates,
          updated_at: new Date()
        })
        .where(eq(users.id, user_id));

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
   * Performs bulk operations on multiple users efficiently in a single transaction.
   * Supports activation, deactivation, role changes, and soft deletion.
   */
  async bulkUpdateUsers(
    operation: BulkUserOperation,
    adminId: string
  ): Promise<{ success: boolean; message: string; affectedCount: number }> {
    try {
      if (operation.user_ids.length === 0) {
        return {
          success: false,
          message: 'No users specified for bulk operation',
          affectedCount: 0
        };
      }

      const { updateData, operationName } = this.getBulkOperationConfig(operation);

      // Log the bulk operation with full details for audit compliance
      this.logUserActivity({
        user_id: adminId,
        action: 'bulk_user_operation',
        details: {
          operation: operation.operation,
          user_ids: operation.user_ids,
          parameters: operation.parameters ?? {},
          timestamp: new Date().toISOString()
        }
      });

      // Execute the update for all specified users in one database operation
      await db
        .update(users)
        .set(updateData)
        .where(inArray(users.id, operation.user_ids));

      return {
        success: true,
        message: `${operation.user_ids.length} users ${operationName} successfully`,
        affectedCount: operation.user_ids.length
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
   * Resets a user's password with bcrypt hashing for security.
   * Note: This implementation assumes your schema has a password_hash field.
   * Adjust the field name to match your actual schema.
   */
  async resetUserPassword(
    user_id: string,
    newPassword: string,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Hash the password using bcrypt with a secure number of rounds
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update the user's password in the database
      await db
        .update(users)
        .set({
          password_hash: hashedPassword,
          updated_at: new Date()
        })
        .where(eq(users.id, user_id));

      // Log the password reset without exposing the actual password
      this.logUserActivity({
        user_id: adminId,
        action: 'password_reset',
        details: {
          targetUserId: user_id,
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
   * Retrieves activity logs with optional filtering by user.
   * Logs are stored in memory and automatically pruned when they exceed the maximum size.
   */
  async getUserActivityLogs(
    user_id?: string,
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
      // Filter logs by user if specified, otherwise return all logs
      const filteredLogs = user_id
        ? this.activityLogs.filter(log => log.user_id === user_id)
        : [...this.activityLogs];

      // Sort chronologically with most recent first
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
   * Exports user data with summary statistics for reporting purposes.
   * Uses a high limit to retrieve all matching users within reasonable bounds.
   */
  async exportUserData(filters?: UserManagementFilters): Promise<UserExportData> {
    try {
      const { users: userList } = await this.getUserList(1, MAX_EXPORT_LIMIT, filters);

      // Calculate summary statistics in parallel for efficiency
      const [totalCountResult, activeCountResult] = await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(users).where(eq(users.is_active, true))
      ]);

      return {
        users: userList,
        summary: {
          totalUsers: Number(totalCountResult[0]?.value ?? 0),
          activeUsers: Number(activeCountResult[0]?.value ?? 0),
          exportDate: new Date()
        }
      };
    } catch (error) {
      this.handleError('Error exporting user data', error);
      throw error;
    }
  }

  /**
   * Retrieves statistics grouped by user role for dashboard analytics.
   * This helps administrators understand the distribution of user types.
   */
  async getUserRoleStatistics() {
    try {
      const roleStats = await db
        .select({
          role: users.role,
          total: count(),
          active: sql<number>`SUM(CASE WHEN ${users.is_active} THEN 1 ELSE 0 END)`
        })
        .from(users)
        .groupBy(users.role);

      return roleStats.map((stat: { role: string; total: number; active: number }) => ({
        role: stat.role,
        total: Number(stat.total),
        active: Number(stat.active)
      }));
    } catch (error) {
      this.handleError('Error fetching user role statistics', error);
      throw error;
    }
  }

  // Private helper methods for internal operations

  /**
   * Builds dynamic filter conditions for database queries.
   * This centralizes filtering logic to ensure consistency across different operations.
   */
  private buildFilterConditions(filters?: UserManagementFilters) {
    const conditions: any[] = [];

    if (filters?.role) {
      // Cast the role string to the proper enum type for type safety
      conditions.push(eq(users.role, filters.role));
    }

    if (filters?.status === 'active') {
      conditions.push(eq(users.is_active, true));
    } else if (filters?.status === 'inactive') {
      conditions.push(eq(users.is_active, false));
    }

    if (filters?.search) {
      // Perform case-insensitive search across email field
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(sql`LOWER(${users.email}) LIKE ${searchTerm}`);
    }

    if (filters?.dateRange) {
      conditions.push(
        and(
          gte(users.created_at, filters.dateRange.start),
          sql`${users.created_at} <= ${filters.dateRange.end}`
        )
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Enriches basic user data with comprehensive stats and session information.
   * Uses parallel processing to fetch related data efficiently.
   */
  private async enrichUsersWithDetails(userList: any[]): Promise<UserDetails[]> {
    return Promise.all(
      userList.map(async (user) => {
        // Fetch stats and sessions in parallel for each user
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
   * Retrieves comprehensive activity statistics for a specific user.
   * Includes comment count, notifications, and most recent activity timestamp.
   */
  private async getUserStats(user_id: string) {
    try {
      // Execute all stat queries in parallel to minimize latency
      const [commentsResult, notificationsResult, lastCommentResult] = await Promise.all([
        db.select({ value: count() }).from(comments).where(eq(comments.user_id, user_id)),
        db.select({ value: count() }).from(notifications).where(eq(notifications.user_id, user_id)),
        db
          .select({ created_at: comments.created_at })
          .from(comments)
          .where(eq(comments.user_id, user_id))
          .orderBy(desc(comments.created_at))
          .limit(1)
      ]);

      return {
        commentsCount: Number(commentsResult[0]?.value ?? 0),
        billsTracked: 0, // Placeholder for future implementation when bill tracking is added
        notificationsReceived: Number(notificationsResult[0]?.value ?? 0),
        lastActivity: lastCommentResult[0]?.created_at ?? null
      };
    } catch (error) {
      this.handleError('Error fetching user stats', error);
      return this.getDefaultUserStats();
    }
  }

  /**
   * Retrieves session information showing active sessions and most recent login.
   * Active sessions are those whose expiration time is still in the future.
   */
  private async getUserSessions(user_id: string) {
    try {
      const [activeSessionsResult, lastSessionResult] = await Promise.all([
        db
          .select({ value: count() })
          .from(sessions)
          .where(
            and(
              eq(sessions.user_id, user_id),
              sql`${sessions.expires_at} > NOW()`
            )
          ),
        db
          .select({ created_at: sessions.created_at })
          .from(sessions)
          .where(eq(sessions.user_id, user_id))
          .orderBy(desc(sessions.created_at))
          .limit(1)
      ]);

      return {
        active: Number(activeSessionsResult[0]?.value ?? 0),
        lastSession: lastSessionResult[0]?.created_at ?? null
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
   * Configures the update data and operation name for bulk operations.
   * This mapping ensures consistent behavior across all bulk operation types.
   */
  private getBulkOperationConfig(operation: BulkUserOperation): {
    updateData: Partial<typeof users.$inferInsert> & { updated_at: Date };
    operationName: string;
  } {
    const updateData: any = {
      updated_at: new Date()
    };
    let operationName = '';

    switch (operation.operation) {
      case 'activate':
        updateData.is_active = true;
        operationName = 'activated';
        break;
      case 'deactivate':
        updateData.is_active = false;
        operationName = 'deactivated';
        break;
      case 'changeRole':
        if (!operation.parameters?.role) {
          throw new Error('Role parameter required for role change operation');
        }
        updateData.role = operation.parameters.role;
        operationName = `role changed to ${operation.parameters.role}`;
        break;
      case 'delete':
        // Soft delete by marking as inactive
        updateData.is_active = false;
        operationName = 'deleted';
        break;
      default:
        throw new Error('Invalid bulk operation');
    }

    return { updateData, operationName };
  }

  /**
   * Logs user activity to in-memory storage with automatic pruning.
   * Keeps only the most recent logs based on the configured maximum size.
   */
  private logUserActivity(activity: Omit<UserActivityLog, 'id' | 'timestamp'>) {
    const log: UserActivityLog = {
      id: `log-${this.logIdCounter++}`,
      timestamp: new Date(),
      ...activity
    };

    this.activityLogs.push(log);

    // Prune oldest logs when we exceed the maximum size
    if (this.activityLogs.length > ACTIVITY_LOG_MAX_SIZE) {
      this.activityLogs.shift();
    }
  }

  /**
   * Centralized error handling for consistent logging across the service.
   */
  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(message, { component: 'UserManagementService', error: errorMessage });
  }

  /**
   * Returns default user stats when fetching fails to ensure graceful degradation.
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

// Export singleton instance for easy consumption throughout the application
export const userManagementService = UserManagementService.getInstance();


