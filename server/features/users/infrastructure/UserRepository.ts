// ============================================================================
// USER REPOSITORY - Domain-Specific Repository
// ============================================================================
// Provides data access operations for users with domain-specific methods.
// Extends BaseRepository for infrastructure (caching, logging, error handling).

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { users, user_profiles } from '@server/infrastructure/schema';
import { eq, and, inArray, desc, asc, sql, like } from 'drizzle-orm';

/**
 * User entity type (inferred from schema)
 */
export type User = typeof users.$inferSelect;

/**
 * New user data type (for inserts)
 */
export type InsertUser = typeof users.$inferInsert;

/**
 * User profile entity type
 */
export type UserProfile = typeof user_profiles.$inferSelect;

/**
 * User role enum
 */
export type UserRole = 'citizen' | 'admin' | 'moderator' | 'expert' | 'verified_citizen';

/**
 * Query options for user searches
 */
export interface UserQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'last_login_at' | 'email';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User search options
 */
export interface UserSearchOptions extends UserQueryOptions {
  role?: UserRole | UserRole[];
  is_verified?: boolean;
  is_active?: boolean;
  county?: string;
}

/**
 * User repository providing domain-specific data access methods.
 * 
 * DESIGN PRINCIPLES:
 * - Domain-specific methods (NOT generic CRUD)
 * - Methods reflect business operations
 * - Example: findByEmail(), findByRole(), searchUsers()
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
 * const usersResult = await repository.findByRole('expert');
 * if (usersResult.isOk) {
 *   console.log('Found', usersResult.value.length, 'experts');
 * }
 * ```
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super({
      entityName: 'User',
      enableCache: true,
      cacheTTL: 1800, // 30 minutes (low volatility)
      enableLogging: true,
    });
  }

  /**
   * Find user by ID
   * 
   * @param id - User ID
   * @returns Result containing Maybe<User>
   * 
   * @example
   * ```typescript
   * const result = await repository.findById('user-uuid');
   * if (result.isOk && result.value !== null) {
   *   console.log('Found:', result.value.email);
   * }
   * ```
   */
  async findById(id: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `user:id:${id}`
    );
  }

  /**
   * Find user by email (unique identifier)
   * 
   * @param email - User email
   * @returns Result containing Maybe<User>
   * 
   * @example
   * ```typescript
   * const result = await repository.findByEmail('user@example.com');
   * if (result.isOk) {
   *   const user = result.value;
   *   if (user !== null) {
   *     console.log('Found:', user.email);
   *   } else {
   *     console.log('User not found');
   *   }
   * }
   * ```
   */
  async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        return results[0] ?? null;
      },
      `user:email:${email.toLowerCase()}`
    );
  }

  /**
   * Find users by role
   * 
   * @param role - User role or array of roles
   * @param options - Query options (pagination, sorting)
   * @returns Result containing array of users
   * 
   * @example
   * ```typescript
   * const result = await repository.findByRole('expert', {
   *   limit: 10,
   *   sortBy: 'created_at',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async findByRole(
    role: UserRole | UserRole[],
    options?: UserQueryOptions
  ): Promise<Result<User[], Error>> {
    const roles = Array.isArray(role) ? role : [role];
    
    return this.executeRead(
      async (db) => {
        const baseQuery = db
          .select()
          .from(users)
          .where(inArray(users.role, roles));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc' 
              ? baseQuery.orderBy(asc(users[options.sortBy]))
              : baseQuery.orderBy(desc(users[options.sortBy])))
          : baseQuery.orderBy(desc(users.created_at));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
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
      async (db) => {
        const baseQuery = db
          .select()
          .from(users)
          .where(eq(users.county, county));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(users[options.sortBy]))
              : baseQuery.orderBy(desc(users[options.sortBy])))
          : baseQuery.orderBy(desc(users.created_at));

        // Apply pagination
        const limitedQuery = options?.limit
          ? sortedQuery.limit(options.limit)
          : sortedQuery;

        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
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
      async (db) => {
        const baseQuery = db
          .select()
          .from(users)
          .where(eq(users.is_active, true));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(users[options.sortBy]))
              : baseQuery.orderBy(desc(users[options.sortBy])))
          : baseQuery.orderBy(desc(users.last_login_at));

        // Apply pagination
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;

        return await sortedQuery.limit(limit).offset(offset);
      },
      `user:active:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Search users by keywords in email or display name
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
      async (db) => {
        const searchPattern = `%${keywords.toLowerCase()}%`;
        
        // Build conditions
        const conditions = [
          like(sql`LOWER(${users.email})`, searchPattern)
        ];

        // Add role filter
        if (options?.role) {
          const roles = Array.isArray(options.role) ? options.role : [options.role];
          conditions.push(inArray(users.role, roles));
        }

        // Add verification filter
        if (options?.is_verified !== undefined) {
          conditions.push(eq(users.is_verified, options.is_verified));
        }

        // Add active filter
        if (options?.is_active !== undefined) {
          conditions.push(eq(users.is_active, options.is_active));
        }

        // Add county filter
        if (options?.county) {
          conditions.push(eq(users.county, options.county));
        }

        const baseQuery = db
          .select()
          .from(users)
          .where(and(...conditions));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(users[options.sortBy]))
              : baseQuery.orderBy(desc(users[options.sortBy])))
          : baseQuery.orderBy(desc(users.created_at));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      }
      // No caching for search results (too many variations)
    );
  }

  /**
   * Find users by IDs
   *
   * @param ids - Array of user IDs
   * @param options - Query options with optional filters
   * @returns Result containing array of users
   */
  async findByIds(
    ids: string[],
    options?: UserQueryOptions & {
      role?: UserRole | UserRole[];
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>> {
    if (ids.length === 0) {
      return new Ok([]);
    }

    return this.executeRead(
      async (db) => {
        const conditions = [inArray(users.id, ids)];

        // Add optional filters
        if (options?.role) {
          const roles = Array.isArray(options.role) ? options.role : [options.role];
          conditions.push(inArray(users.role, roles));
        }
        if (options?.is_active !== undefined) {
          conditions.push(eq(users.is_active, options.is_active));
        }

        const baseQuery = db
          .select()
          .from(users)
          .where(and(...conditions));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(users[options.sortBy]))
              : baseQuery.orderBy(desc(users[options.sortBy])))
          : baseQuery.orderBy(desc(users.created_at));

        // Apply pagination
        const limitedQuery = options?.limit
          ? sortedQuery.limit(options.limit)
          : sortedQuery;

        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      }
      // No caching for ID-based queries (too many variations)
    );
  }

  /**
   * Find recent users
   * 
   * @param options - Query options
   * @returns Result containing array of recent users
   */
  async findRecent(options?: UserQueryOptions): Promise<Result<User[], Error>> {
    return this.executeRead(
      async (db) => {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        
        const query = db
          .select()
          .from(users)
          .where(eq(users.is_active, true))
          .orderBy(desc(users.created_at))
          .limit(limit)
          .offset(offset);

        return await query;
      },
      `user:recent:${options?.limit ?? 20}:${options?.offset ?? 0}`
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
    is_verified?: boolean;
    is_active?: boolean;
    county?: string;
  }): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = [];

        if (criteria?.role) {
          const roles = Array.isArray(criteria.role) ? criteria.role : [criteria.role];
          conditions.push(inArray(users.role, roles));
        }

        if (criteria?.is_verified !== undefined) {
          conditions.push(eq(users.is_verified, criteria.is_verified));
        }

        if (criteria?.is_active !== undefined) {
          conditions.push(eq(users.is_active, criteria.is_active));
        }

        if (criteria?.county) {
          conditions.push(eq(users.county, criteria.county));
        }

        const baseQuery = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users);

        const query = conditions.length > 0
          ? baseQuery.where(and(...conditions))
          : baseQuery;

        const result = await query;
        return Number(result[0]?.count ?? 0);
      },
      criteria ? `user:count:${JSON.stringify(criteria)}` : 'user:count:all'
    );
  }

  /**
   * Get user profile by user ID
   * 
   * @param userId - User ID
   * @returns Result containing Maybe<UserProfile>
   */
  async getUserProfile(userId: string): Promise<Result<Maybe<UserProfile>, Error>> {
    return this.executeRead(
      async (db) => {
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
   * Create new user
   * 
   * @param data - User data
   * @returns Result containing created user
   */
  async create(data: InsertUser): Promise<Result<User, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(users)
          .values(data)
          .returning();
        return results[0];
      },
      ['user:*'] // Invalidate all user caches
    );
  }

  /**
   * Update user
   * 
   * @param id - User ID
   * @param data - Partial user data
   * @returns Result containing updated user
   */
  async update(id: string, data: Partial<InsertUser>): Promise<Result<User, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(users)
          .set({ ...data, updated_at: new Date() })
          .where(eq(users.id, id))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User not found: ${id}`);
        }
        
        return results[0];
      },
      [`user:id:${id}`, 'user:*']
    );
  }

  /**
   * Update user profile
   * 
   * @param userId - User ID
   * @param data - Partial profile data
   * @returns Result containing updated profile
   */
  async updateProfile(
    userId: string,
    data: Partial<typeof user_profiles.$inferInsert>
  ): Promise<Result<UserProfile, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(user_profiles)
          .set({ ...data, updated_at: new Date() })
          .where(eq(user_profiles.user_id, userId))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User profile not found: ${userId}`);
        }
        
        return results[0];
      },
      [`user:profile:${userId}`, `user:id:${userId}`, 'user:*']
    );
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   * 
   * @param id - User ID
   * @returns Result containing void
   */
  async delete(id: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        const result = await tx
          .update(users)
          .set({ 
            is_active: false,
            deactivated_at: new Date(),
            updated_at: new Date()
          })
          .where(eq(users.id, id));
        
        if (!result || result.rowCount === 0) {
          throw new Error(`User not found: ${id}`);
        }
        return undefined;
      },
      [`user:id:${id}`, 'user:*']
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
      async (tx) => {
        const results = await tx
          .insert(users)
          .values(data)
          .returning();
        return results;
      },
      'user:*'
    );
  }

  /**
   * Update multiple users in batch
   * 
   * @param updates - Array of updates with user ID and data
   * @returns Result containing updated users
   */
  async updateBatch(
    updates: Array<{ id: string; data: Partial<InsertUser> }>
  ): Promise<Result<User[], Error>> {
    return this.executeBatchWrite(
      async (tx) => {
        const updatedUsers: User[] = [];

        for (const update of updates) {
          const results = await tx
            .update(users)
            .set({ ...update.data, updated_at: new Date() })
            .where(eq(users.id, update.id))
            .returning();
          
          if (results.length > 0) {
            updatedUsers.push(results[0]);
          }
        }

        return updatedUsers;
      },
      'user:*'
    );
  }
}
