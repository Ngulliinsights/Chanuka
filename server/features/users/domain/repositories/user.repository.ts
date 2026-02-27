// ============================================================================
// USER REPOSITORY - Domain-Specific Repository
// ============================================================================
// Provides data access operations for users with domain-specific methods.
// Extends BaseRepository for infrastructure (caching, logging, error handling).

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { users, user_profiles } from '@server/infrastructure/schema';
import { eq, and, or, inArray, desc, asc, sql, like } from 'drizzle-orm';

/**
 * User entity type (inferred from schema)
 */
export type User = typeof users.$inferSelect;

/**
 * New user data type (for inserts)
 */
export type InsertUser = typeof users.$inferInsert;

/**
 * User profile type
 */
export type UserProfile = typeof user_profiles.$inferSelect;

/**
 * New user profile data type
 */
export type InsertUserProfile = typeof user_profiles.$inferInsert;

/**
 * User role enum
 */
export type UserRole = 'citizen' | 'representative' | 'admin' | 'moderator';

/**
 * Query options for user searches
 */
export interface UserQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'email';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User search options
 */
export interface UserSearchOptions extends UserQueryOptions {
  role?: UserRole | UserRole[];
  county?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

/**
 * User repository providing domain-specific data access methods.
 * 
 * DESIGN PRINCIPLES:
 * - Domain-specific methods (NOT generic CRUD)
 * - Methods reflect business operations
 * - Example: findByEmail(), findByVerificationToken()
 * - NOT: findById(), findAll()
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new UserRepository();
 * 
 * // Find by email
 * const result = await repository.findByEmail('user@example.com');
 * if (result.isOk && result.value !== null) {
 *   console.log('Found:', result.value.email);
 * }
 * 
 * // Find by role
 * const usersResult = await repository.findByRole('citizen', { limit: 10 });
 * if (usersResult.isOk) {
 *   console.log('Found', usersResult.value.length, 'users');
 * }
 * ```
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super({
      entityName: 'User',
      enableCache: true,
      cacheTTL: 300, // 5 minutes
      enableLogging: true,
    });
  }

  /**
   * Find user by email (unique identifier)
   * 
   * @param email - User email
   * @returns Result containing Maybe<User>
   */
  async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db: any) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        return results[0] ?? null;
      },
      `user:email:${email}`
    );
  }

  /**
   * Find user by verification token
   * 
   * @param token - Verification token
   * @returns Result containing Maybe<User>
   */
  async findByVerificationToken(token: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db: any) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.verification_token, token))
          .limit(1);
        return results[0] ?? null;
      },
      `user:verification:${token}`
    );
  }

  /**
   * Find user by password reset token
   * 
   * @param token - Password reset token
   * @returns Result containing Maybe<User>
   */
  async findByPasswordResetToken(token: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db: any) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.password_reset_token, token))
          .limit(1);
        return results[0] ?? null;
      },
      `user:reset:${token}`
    );
  }

  /**
   * Find users by role
   * 
   * @param role - User role or array of roles
   * @param options - Query options
   * @returns Result containing array of users
   */
  async findByRole(
    role: UserRole | UserRole[],
    options?: UserQueryOptions
  ): Promise<Result<User[], Error>> {
    const roles = Array.isArray(role) ? role : [role];
    
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(users)
          .where(inArray(users.role, roles));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = users[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(desc(users.created_at));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `user:role:${roles.sort().join(',')}`
    );
  }

  /**
   * Find users by county
   * 
   * @param county - County name
   * @param options - Query options
   * @returns Result containing array of users
   */
  async findByCounty(
    county: string,
    options?: UserQueryOptions
  ): Promise<Result<User[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(users)
          .where(eq(users.county, county));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = users[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(desc(users.created_at));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `user:county:${county}`
    );
  }

  /**
   * Find active users
   * 
   * @param options - Query options
   * @returns Result containing array of active users
   */
  async findActive(options?: UserQueryOptions): Promise<Result<User[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(users)
          .where(eq(users.is_active, true));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = users[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(desc(users.created_at));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `user:active:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Find verified users
   * 
   * @param options - Query options
   * @returns Result containing array of verified users
   */
  async findVerified(options?: UserQueryOptions): Promise<Result<User[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(users)
          .where(eq(users.is_verified, true));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = users[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(desc(users.created_at));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `user:verified:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Search users by keywords in email or profile
   * 
   * @param keywords - Search keywords
   * @param options - Search options
   * @returns Result containing array of users
   */
  async searchUsers(
    keywords: string,
    options?: UserSearchOptions
  ): Promise<Result<User[], Error>> {
    return this.executeRead(
      async (db: any) => {
        const searchPattern = `%${keywords.toLowerCase()}%`;
        
        // Build conditions
        const conditions = [
          or(
            like(sql`LOWER(${users.email})`, searchPattern),
            like(sql`LOWER(${users.name})`, searchPattern)
          )
        ];

        // Add role filter
        if (options?.role) {
          const roles = Array.isArray(options.role) ? options.role : [options.role];
          conditions.push(inArray(users.role, roles));
        }

        // Add county filter
        if (options?.county) {
          conditions.push(eq(users.county, options.county));
        }

        // Add active filter
        if (options?.isActive !== undefined) {
          conditions.push(eq(users.is_active, options.isActive));
        }

        // Add verified filter
        if (options?.isVerified !== undefined) {
          conditions.push(eq(users.is_verified, options.isVerified));
        }

        let query = db
          .select()
          .from(users)
          .where(and(...conditions));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = users[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(desc(users.created_at));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      }
      // No caching for search results
    );
  }

  /**
   * Get user profile by user ID
   * 
   * @param userId - User ID
   * @returns Result containing Maybe<UserProfile>
   */
  async getProfileByUserId(userId: string): Promise<Result<Maybe<UserProfile>, Error>> {
    return this.executeRead(
      async (db: any) => {
        const results = await db
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, userId))
          .limit(1);
        return results[0] ?? null;
      },
      `user:profile:${userId}`
    );
  }

  /**
   * Count users by criteria
   * 
   * @param criteria - Count criteria
   * @returns Result containing count
   */
  async count(criteria?: {
    role?: UserRole | UserRole[];
    county?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db: any) => {
        const conditions = [];

        if (criteria?.role) {
          const roles = Array.isArray(criteria.role) ? criteria.role : [criteria.role];
          conditions.push(inArray(users.role, roles));
        }

        if (criteria?.county) {
          conditions.push(eq(users.county, criteria.county));
        }

        if (criteria?.isActive !== undefined) {
          conditions.push(eq(users.is_active, criteria.isActive));
        }

        if (criteria?.isVerified !== undefined) {
          conditions.push(eq(users.is_verified, criteria.isVerified));
        }

        const query = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users);

        if (conditions.length > 0) {
          query.where(and(...conditions));
        }

        const [result] = await query;
        return Number(result.count);
      },
      criteria ? `user:count:${JSON.stringify(criteria)}` : 'user:count:all'
    );
  }

  /**
   * Create new user
   * 
   * @param data - User data
   * @returns Result containing created user
   */
  async create(data: InsertUser): Promise<Result<User, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .insert(users)
          .values(data)
          .returning();
        return results[0];
      },
      ['user:*']
    );
  }

  /**
   * Update user
   * 
   * @param email - User email
   * @param data - Partial user data
   * @returns Result containing updated user
   */
  async update(email: string, data: Partial<InsertUser>): Promise<Result<User, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .update(users)
          .set({ ...data, updated_at: new Date() })
          .where(eq(users.email, email))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User not found: ${email}`);
        }
        
        return results[0];
      },
      [`user:email:${email}`, 'user:*']
    );
  }

  /**
   * Update user authentication tokens
   * 
   * @param email - User email
   * @param tokens - Authentication tokens
   * @returns Result containing void
   */
  async updateAuthTokens(
    email: string,
    tokens: {
      verification_token?: string;
      verification_expires_at?: Date;
      password_reset_token?: string;
      password_reset_expires_at?: Date;
    }
  ): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .update(users)
          .set({ ...tokens, updated_at: new Date() })
          .where(eq(users.email, email))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User not found: ${email}`);
        }
      },
      [`user:email:${email}`, 'user:verification:*', 'user:reset:*', 'user:*']
    );
  }

  /**
   * Update user security settings
   * 
   * @param email - User email
   * @param security - Security settings
   * @returns Result containing void
   */
  async updateSecuritySettings(
    email: string,
    security: {
      two_factor_enabled?: boolean;
      two_factor_secret?: string;
      backup_codes?: string[];
    }
  ): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .update(users)
          .set({ ...security, updated_at: new Date() })
          .where(eq(users.email, email))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User not found: ${email}`);
        }
      },
      [`user:email:${email}`, 'user:*']
    );
  }

  /**
   * Update user profile
   * 
   * @param userId - User ID
   * @param profile - Profile data
   * @returns Result containing updated profile
   */
  async updateProfile(
    userId: string,
    profile: Partial<InsertUserProfile>
  ): Promise<Result<UserProfile, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        // Try to update existing profile
        const updateResults = await tx
          .update(user_profiles)
          .set({ ...profile, updated_at: new Date() })
          .where(eq(user_profiles.user_id, userId))
          .returning();
        
        if (updateResults.length > 0) {
          return updateResults[0];
        }
        
        // Create profile if it doesn't exist
        const createResults = await tx
          .insert(user_profiles)
          .values({ ...profile, user_id: userId })
          .returning();
        
        return createResults[0];
      },
      [`user:profile:${userId}`, 'user:*']
    );
  }

  /**
   * Delete user
   * 
   * @param email - User email
   * @returns Result containing void
   */
  async delete(email: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        // Get user ID first
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (!user) {
          throw new Error(`User not found: ${email}`);
        }
        
        // Delete profile first (foreign key constraint)
        await tx
          .delete(user_profiles)
          .where(eq(user_profiles.user_id, user.id));
        
        // Delete user
        await tx
          .delete(users)
          .where(eq(users.email, email));
      },
      [`user:email:${email}`, 'user:*']
    );
  }

  /**
   * Create multiple users in batch
   * 
   * @param data - Array of user data
   * @returns Result containing created users
   */
  async createBatch(data: InsertUser[]): Promise<Result<User[], Error>> {
    return this.executeBatchWrite(
      async (tx: any) => {
        return await tx
          .insert(users)
          .values(data)
          .returning();
      },
      'user:*'
    );
  }

  /**
   * Delete multiple users in batch
   * 
   * @param emails - Array of user emails
   * @returns Result containing void
   */
  async deleteBatch(emails: string[]): Promise<Result<void, Error>> {
    return this.executeBatchWrite(
      async (tx: any) => {
        // Get user IDs
        const userResults = await tx
          .select()
          .from(users)
          .where(inArray(users.email, emails));
        
        const userIds = userResults.map((u: any) => u.id);
        
        // Delete profiles first
        if (userIds.length > 0) {
          await tx
            .delete(user_profiles)
            .where(inArray(user_profiles.user_id, userIds));
        }
        
        // Delete users
        await tx
          .delete(users)
          .where(inArray(users.email, emails));
      },
      'user:*'
    );
  }
}
