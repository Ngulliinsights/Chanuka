/**
 * Drizzle User Repository Implementation
 *
 * Concrete implementation of IUserRepository using Drizzle ORM
 * Provides data access operations for users with proper error handling and Result types
 */

import type { IUserRepository } from '@server/domain/interfaces/user-repository.interface';
import { queryCache } from '@server/infrastructure/caching/query-cache';
import { databaseService } from '@server/infrastructure/database/database-service';
import { databaseLogger } from '@server/infrastructure/logging/database-logger';
import { performanceMonitor } from '@server/infrastructure/performance/performance-monitor';
import {
  newUserSchema,
  userProfileSchema,
  userSearchOptionsSchema,
  uuidParamSchema,
  validateRepositoryInput,
  validateSearchParams
} from '@server/infrastructure/validation/repository-validation';
import type { Maybe,Result } from '@shared/core';
import { Err, none,Ok, some } from '@shared/core';
import type { NewUser, NewUserProfile,User, UserProfile } from '@server/infrastructure/schema';
import { user_profiles,users } from '@server/infrastructure/schema';
import type { SQLWrapper } from 'drizzle-orm';
import { and, desc, eq, inArray,or, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';


export class DrizzleUserRepository implements IUserRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Private method to build common query conditions for user filtering methods
   */
  private buildUserQueryConditions(
    baseCondition: SQLWrapper,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
      is_active?: boolean;
      is_verified?: boolean;
    }
  ) {
    const conditions = [baseCondition];

    if (options?.role) {
      conditions.push(eq(users.role, options.role));
    }

    if (options?.is_active !== undefined) {
      conditions.push(eq(users.is_active, options.is_active));
    }

    if (options?.is_verified !== undefined) {
      conditions.push(eq(users.is_verified, options.is_verified));
    }

    return this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.created_at))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  /**
   * Private method to build common conditions for user count queries
   */
  private buildUserCountConditions(criteria?: {
    role?: string;
    county?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }): SQLWrapper[] {
    const conditions: SQLWrapper[] = [];

    if (criteria?.role) {
      conditions.push(eq(users.role, criteria.role));
    }

    if (criteria?.county) {
      conditions.push(eq(users.county, criteria.county));
    }

    if (criteria?.is_active !== undefined) {
      conditions.push(eq(users.is_active, criteria.is_active));
    }

    if (criteria?.is_verified !== undefined) {
      conditions.push(eq(users.is_verified, criteria.is_verified));
    }

    return conditions;
  }

  /**
   * Private method to build search query with user profiles join
   * Optimized with performance hints for full-text search
   */
  private buildUserSearchQuery(
    searchTerm: string,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
      is_active?: boolean;
    }
  ) {
    const searchCondition = or(
      sql`${users.email} ILIKE ${searchTerm}`,
      sql`${user_profiles.first_name} ILIKE ${searchTerm}`,
      sql`${user_profiles.last_name} ILIKE ${searchTerm}`,
      sql`${user_profiles.display_name} ILIKE ${searchTerm}`
    );

    const conditions = [searchCondition];

    if (options?.role) {
      conditions.push(eq(users.role, options.role));
    }

    if (options?.is_active !== undefined) {
      conditions.push(eq(users.is_active, options.is_active));
    }

    // Add performance hint for complex search queries
    const query = this.db
      .select()
      .from(users)
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
      .where(and(...conditions))
      .orderBy(desc(users.created_at))
      .limit(Math.min(options?.limit || 50, 1000)) // Cap at 1000 for performance
      .offset(options?.offset || 0);

    return query;
  }

  async create(user: NewUser): Promise<Result<User, Error>> {
    try {
      // Validate input data
      const validation = await validateRepositoryInput(newUserSchema, user, 'user creation');
      if (!validation.success) {
        return new Err(validation.error);
      }

      const result = await databaseLogger.logOperation(
        databaseLogger.createContextBuilder('users', 'user')
          .operation('create')
          .build(),
        async () => {
          const newUser = await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
            const [user] = await tx
              .insert(users)
              .values(validation.data)
              .returning();
            return user;
          });

          return {
            success: true,
            duration: 0, // Will be set by logger
            recordCount: 1,
            affectedIds: [newUser.id]
          };
        }
      );

      return new Ok(result.data);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create user'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<User>, Error>> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return new Ok(user ? some(user) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find user by ID'));
    }
  }

  async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return new Ok(user ? some(user) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find user by email'));
    }
  }

  async findByRole(
    role: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>> {
    try {
      const result = await this.buildUserQueryConditions(eq(users.role, role), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find users by role'));
    }
  }

  async findByCounty(
    county: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>> {
    try {
      const result = await this.buildUserQueryConditions(eq(users.county, county), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find users by county'));
    }
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>> {
    return performanceMonitor.monitorOperation(
      'user_search',
      async () => {
        try {
          // Validate search parameters
          const searchValidation = await validateSearchParams(query, options, userSearchOptionsSchema);
          if (!searchValidation.success) {
            return new Err(searchValidation.error);
          }

          const searchTerm = `%${searchValidation.query.toLowerCase()}%`;
          const result = await this.buildUserSearchQuery(searchTerm, searchValidation.options);
          return new Ok(result);
        } catch (error) {
          return new Err(error instanceof Error ? error : new Error('Failed to search users'));
        }
      },
      { query, options }
    );
  }

  async findActive(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<Result<User[], Error>> {
    try {
      const result = await this.buildUserQueryConditions(eq(users.is_active, true), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find active users'));
    }
  }

  async update(id: string, updates: Partial<NewUser>): Promise<Result<User, Error>> {
    try {
      // Get the current user for audit logging
      const currentUserResult = await this.findById(id);
      const currentUser = currentUserResult.isOk() ? currentUserResult.value : null;

      const result = await databaseLogger.logOperation(
        databaseLogger.createContextBuilder('users', 'user')
          .operation('update')
          .entityId(id)
          .build(),
        async () => {
          const updatedUser = await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
            const [user] = await tx
              .update(users)
              .set({
                ...updates,
                updated_at: new Date()
              })
              .where(eq(users.id, id))
              .returning();

            if (!user) {
              throw new Error('User not found');
            }

            return user;
          });

          // Log audit trail for sensitive user updates
          if (currentUser && (updates.role || updates.is_active !== undefined || updates.two_factor_enabled !== undefined)) {
            const changes: Record<string, { old: unknown; new: unknown }> = {};
            if (updates.role !== undefined && updates.role !== currentUser.role) {
              changes.role = { old: currentUser.role, new: updates.role };
            }
            if (updates.is_active !== undefined && updates.is_active !== currentUser.is_active) {
              changes.is_active = { old: currentUser.is_active, new: updates.is_active };
            }
            if (updates.two_factor_enabled !== undefined && updates.two_factor_enabled !== currentUser.two_factor_enabled) {
              changes.two_factor_enabled = { old: currentUser.two_factor_enabled, new: updates.two_factor_enabled };
            }

            if (Object.keys(changes).length > 0) {
              databaseLogger.logAudit({
                action: 'user_update',
                entityType: 'user',
                entityId: id,
                changes,
                sensitive: true,
                userId: id // Self-update or admin update
              });
            }
          }

          return {
            success: true,
            duration: 0,
            recordCount: 1,
            affectedIds: [updatedUser.id]
          };
        }
      );

      return new Ok(result.data);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update user'));
    }
  }

  async updateProfile(userId: string, profile: Partial<NewUserProfile>): Promise<Result<UserProfile, Error>> {
    try {
      // Validate user ID
      const idValidation = await validateRepositoryInput(uuidParamSchema, userId, 'user ID');
      if (!idValidation.success) {
        return new Err(idValidation.error);
      }

      // Validate profile data
      const profileValidation = await validateRepositoryInput(userProfileSchema, { user_id: userId, ...profile }, 'user profile update');
      if (!profileValidation.success) {
        return new Err(profileValidation.error);
      }

      const result = await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
        const [updatedProfile] = await tx
          .update(user_profiles)
          .set({
            ...profileValidation.data,
            updated_at: new Date()
          })
          .where(eq(user_profiles.user_id, idValidation.data))
          .returning();

        if (!updatedProfile) {
          // Create profile if it doesn't exist
          const [newProfile] = await tx
            .insert(user_profiles)
            .values({
              ...profileValidation.data,
              updated_at: new Date()
            })
            .returning();

          return newProfile;
        }

        return updatedProfile;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update user profile'));
    }
  }

  async getProfileByUserId(userId: string): Promise<Result<Maybe<UserProfile>, Error>> {
    try {
      const [profile] = await this.db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, userId))
        .limit(1);

      return new Ok(profile ? some(profile) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to get user profile'));
    }
  }

  async updateAuthTokens(
    id: string,
    tokens: {
      verification_token?: string;
      verification_expires_at?: Date;
      password_reset_token?: string;
      password_reset_expires_at?: Date;
    }
  ): Promise<Result<void, Error>> {
    try {
      const result = await databaseLogger.logOperation(
        databaseLogger.createContextBuilder('users', 'auth')
          .operation('update')
          .entityId(id)
          .build(),
        async () => {
          await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
            const updateResult = await tx
              .update(users)
              .set({
                ...tokens,
                updated_at: new Date()
              })
              .where(eq(users.id, id))
              .returning();

            if (updateResult.length === 0) {
              throw new Error('User not found');
            }
          });

          // Log audit trail for auth token updates (sensitive operation)
          const changes: Record<string, { old: unknown; new: unknown }> = {};
          if (tokens.verification_token !== undefined) {
            changes.verification_token = { old: '[REDACTED]', new: '[SET]' };
          }
          if (tokens.password_reset_token !== undefined) {
            changes.password_reset_token = { old: '[REDACTED]', new: '[SET]' };
          }
          if (tokens.verification_expires_at !== undefined) {
            changes.verification_expires_at = { old: '[REDACTED]', new: tokens.verification_expires_at };
          }
          if (tokens.password_reset_expires_at !== undefined) {
            changes.password_reset_expires_at = { old: '[REDACTED]', new: tokens.password_reset_expires_at };
          }

          if (Object.keys(changes).length > 0) {
            databaseLogger.logAudit({
              action: 'user_auth_tokens_update',
              entityType: 'auth',
              entityId: id,
              changes,
              sensitive: true,
              userId: id
            });
          }

          return {
            success: true,
            duration: 0,
            recordCount: 1,
            affectedIds: [id]
          };
        }
      );

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update auth tokens'));
    }
  }

  async updateSecuritySettings(
    id: string,
    security: {
      two_factor_enabled?: boolean;
      two_factor_secret?: string;
      backup_codes?: string[];
    }
  ): Promise<Result<void, Error>> {
    try {
      // Get current security settings for audit logging
      const currentUserResult = await this.findById(id);
      const currentUser = currentUserResult.isOk() ? currentUserResult.value : null;

      const result = await databaseLogger.logOperation(
        databaseLogger.createContextBuilder('users', 'security')
          .operation('update')
          .entityId(id)
          .build(),
        async () => {
          await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
            const updateResult = await tx
              .update(users)
              .set({
                ...security,
                updated_at: new Date()
              })
              .where(eq(users.id, id))
              .returning();

            if (updateResult.length === 0) {
              throw new Error('User not found');
            }
          });

          // Log audit trail for security settings changes
          if (currentUser) {
            const changes: Record<string, { old: unknown; new: unknown }> = {};
            if (security.two_factor_enabled !== undefined && security.two_factor_enabled !== currentUser.two_factor_enabled) {
              changes.two_factor_enabled = { old: currentUser.two_factor_enabled, new: security.two_factor_enabled };
            }
            if (security.two_factor_secret !== undefined) {
              changes.two_factor_secret = { old: '[REDACTED]', new: '[SET]' };
            }
            if (security.backup_codes !== undefined) {
              changes.backup_codes = { old: '[REDACTED]', new: '[UPDATED]' };
            }

            if (Object.keys(changes).length > 0) {
              databaseLogger.logAudit({
                action: 'user_security_update',
                entityType: 'security',
                entityId: id,
                changes,
                sensitive: true,
                userId: id
              });
            }
          }

          return {
            success: true,
            duration: 0,
            recordCount: 1,
            affectedIds: [id]
          };
        }
      );

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update security settings'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      // Get user info for audit logging before deletion
      const userResult = await this.findById(id);
      const userToDelete = userResult.isOk() ? userResult.value : null;

      const result = await databaseLogger.logOperation(
        databaseLogger.createContextBuilder('users', 'user')
          .operation('delete')
          .entityId(id)
          .build(),
        async () => {
          await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
            // Delete profile first due to foreign key constraint
            await tx
              .delete(user_profiles)
              .where(eq(user_profiles.user_id, id));

            // Then delete user
            const deleteResult = await tx
              .delete(users)
              .where(eq(users.id, id));

            if (deleteResult.rowCount === 0) {
              throw new Error('User not found');
            }
          });

          // Log audit trail for user deletion
          if (userToDelete) {
            databaseLogger.logAudit({
              action: 'user_delete',
              entityType: 'user',
              entityId: id,
              changes: {
                user_deleted: { old: userToDelete, new: null },
                email: { old: userToDelete.email, new: null },
                role: { old: userToDelete.role, new: null }
              },
              sensitive: true,
              userId: id // Could be admin or self-deletion
            });
          }

          return {
            success: true,
            duration: 0,
            recordCount: 1,
            affectedIds: [id]
          };
        }
      );

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete user'));
    }
  }

  async count(criteria?: {
    role?: string;
    county?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }): Promise<Result<number, Error>> {
    return queryCache.withCache(
      'user_count',
      criteria || {},
      async () => {
        try {
          const conditions = this.buildUserCountConditions(criteria);

          const query = this.db
            .select({ count: sql<number>`COUNT(*)` })
            .from(users);

          if (conditions.length > 0) {
            query.where(and(...conditions));
          }

          const [result] = await query;
          return new Ok(Number(result.count));
        } catch (error) {
          return new Err(error instanceof Error ? error : new Error('Failed to count users'));
        }
      },
      { ttl: 2 * 60 * 1000, keyPrefix: 'user_stats' } // Cache for 2 minutes
    );
  }

  async createBatch(users: NewUser[]): Promise<Result<User[], Error>> {
    try {
      if (!users.length) {
        return new Ok([]);
      }

      // Validate all input data
      const validations = await Promise.all(
        users.map((user, index) =>
          validateRepositoryInput(newUserSchema, user, `user creation at index ${index}`)
        )
      );

      const validationErrors = validations.filter(v => !v.success);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} users`));
      }

      const result = await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
        const newUsers = await tx
          .insert(users)
          .values(validations.map(v => v.data))
          .returning();

        return newUsers;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create users in batch'));
    }
  }

  async updateBatch(updates: Array<{ id: string; data: Partial<NewUser> }>): Promise<Result<User[], Error>> {
    try {
      if (!updates.length) {
        return new Ok([]);
      }

      // Validate all IDs and update data
      const validations = await Promise.all(
        updates.map(async (update, index) => {
          const idValidation = await validateRepositoryInput(uuidParamSchema, update.id, `user ID at index ${index}`);
          const dataValidation = await validateRepositoryInput(newUserSchema.partial(), update.data, `user update at index ${index}`);

          return {
            id: idValidation.success ? idValidation.data : null,
            data: dataValidation.success ? dataValidation.data : null,
            idError: idValidation.success ? null : idValidation.error,
            dataError: dataValidation.success ? null : dataValidation.error
          };
        })
      );

      const validationErrors = validations.filter(v => v.idError || v.dataError);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} updates`));
      }

      const result = await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
        const updatedUsers: User[] = [];

        // Process updates individually to handle potential conflicts
        for (const validation of validations) {
          if (!validation.id || !validation.data) continue;

          const [updatedUser] = await tx
            .update(users)
            .set({
              ...validation.data,
              updated_at: new Date()
            })
            .where(eq(users.id, validation.id))
            .returning();

          if (updatedUser) {
            updatedUsers.push(updatedUser);
          }
        }

        return updatedUsers;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update users in batch'));
    }
  }

  async deleteBatch(ids: string[]): Promise<Result<void, Error>> {
    try {
      if (!ids.length) {
        return new Ok(undefined);
      }

      // Validate all IDs
      const validations = await Promise.all(
        ids.map((id, index) =>
          validateRepositoryInput(uuidParamSchema, id, `user ID at index ${index}`)
        )
      );

      const validationErrors = validations.filter(v => !v.success);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} user IDs`));
      }

      await databaseService.withTransaction(async (tx: PgDatabase<any>) => {
        // Delete profiles first due to foreign key constraint
        await tx
          .delete(user_profiles)
          .where(inArray(user_profiles.user_id, validations.map(v => v.data)));

        // Then delete users
        await tx
          .delete(users)
          .where(inArray(users.id, validations.map(v => v.data)));
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete users in batch'));
    }
  }

  async findWithLazyProfiles(options?: {
    limit?: number;
    offset?: number;
    role?: string;
    is_active?: boolean;
  }): Promise<Result<Array<User & { loadProfile: () => Promise<Result<UserProfile, Error>> }>, Error>> {
    try {
      const result = await this.buildUserQueryConditions(
        options?.role ? eq(users.role, options.role) : sql`true`,
        options
      );

      // Transform users to include lazy profile loading
      const usersWithLazyProfiles = result.map(user => ({
        ...user,
        loadProfile: async (): Promise<Result<UserProfile, Error>> => {
          return performanceMonitor.monitorOperation(
            'lazy_load_user_profile',
            async () => {
              const [profile] = await this.db
                .select()
                .from(user_profiles)
                .where(eq(user_profiles.user_id, user.id))
                .limit(1);

              if (!profile) {
                return new Err(new Error('User profile not found'));
              }

              return new Ok(profile);
            },
            { userId: user.id }
          );
        }
      }));

      return new Ok(usersWithLazyProfiles);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find users with lazy profiles'));
    }
  }
}