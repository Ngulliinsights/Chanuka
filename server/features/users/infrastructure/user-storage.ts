import {
  readDatabase,
  writeDatabase,
  pool,
  withTransaction,
  users,
  user_profiles,
  userSocialProfiles,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile
} from '@shared/shared/database/connection';
import { eq, and, or, sql } from 'drizzle-orm';
import type { StorageConfig } from '@/infrastructure/database/base/BaseStorage.js';
import { BaseStorage } from '@/infrastructure/database/base/BaseStorage.js';
import { logger   } from '@shared/core';

// Additional type definitions needed
export type OAuthProvider = 'google' | 'github' | 'twitter';

export interface SocialProfile {
  provider: OAuthProvider;
  id: string;
  name: string;
}

// Define a type for user data including the password hash
interface UserWithPasswordHash extends User {
  password_hash: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string; // This should be the hashed password
  first_name?: string;
  last_name?: string;
  role?: 'citizen' | 'admin' | 'expert' | 'journalist' | 'advocate';
}

export class UserStorage extends BaseStorage<User> {
  constructor(options: StorageConfig = {}) {
    super(options);
  }

  /**
   * Validates user ID format (UUID)
   * Centralizes ID validation logic
   */
  private validateUserId(id: string): void {
    // UUID validation - basic check for format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid user ID format: ${id}`);
    }
  }

  /**
   * Invalidates all cache entries related to a specific user
   * Centralized cache invalidation to ensure we don't miss any patterns
   */
  private async invalidateUserCache(user_id: string, username?: string, email?: string): Promise<void> { const cacheKeys = [`user:${user_id }`];

    if (username) {
      cacheKeys.push(`user:username:${username}`);
    }

    if (email) {
      cacheKeys.push(`user:email:${email}`);
    }

    // Invalidate all cache keys
    await this.invalidateCache(cacheKeys);
  }

  async getUser(id: string): Promise<User | null> {
    this.validateUserId(id);
    return this.getCached(`user:${id}`, async () => {
      const result = await readDatabase.select().from(users).where(eq(users.id, id));
      return result[0] || null;
    });
  }

  async getUserByName(name: string): Promise<User | null> {
    return this.getCached(`user:name:${name}`, async () => {
      const result = await readDatabase.select().from(users).where(eq(users.name, name));
      return result[0] || null;
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.getCached(`user:email:${email}`, async () => {
      const result = await readDatabase.select().from(users).where(eq(users.email, email));
      return result[0] || null;
    });
  }

  /**
   * Retrieves user with password hash for authentication
   * Note: This method intentionally does not cache the result for security
   */
  async getUserWithPasswordHash(email: string): Promise<UserWithPasswordHash | null> {
    const result = await readDatabase.select().from(users).where(eq(users.email, email));
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      ...user,
      password_hash: users.password_hash,
    };
  }

  async createUser(data: CreateUserData): Promise<User> {
    return withTransaction(async (tx) => {
      const userData = {
        name: data.name,
        email: data.email,
        password_hash: data.password, // Already hashed
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role || 'citizen',
        verification_status: 'pending' as const,
        is_active: true,
      };

      const result = await tx.insert(users).values(userData).returning();
      const user = result[0];

      // Invalidate relevant cache patterns
      await this.invalidateCache(['user:*']);

      return user;
    });
  }

  async getUserBySocialProfile(
    provider: OAuthProvider,
    profile_id: string,
  ): Promise<User | null> {
    // Consider adding caching for frequently accessed social profiles
    return this.getCached(`user:social:${provider}:${profile_id}`, async () => {
      const result = await readDatabase
        .select()
        .from(users)
        .innerJoin(userSocialProfiles, eq(users.id, userSocialProfiles.user_id))
        .where(and(
          eq(userSocialProfiles.provider, provider),
          eq(userSocialProfiles.providerId, profile_id)
        ));

      if (result.length === 0) return null;
      return result[0].users;
    });
  }

  async linkSocialProfile(user_id: string, profile: SocialProfile): Promise<User> { return withTransaction(async (tx) => {
      // Use UPSERT pattern for better reliability
      await tx.insert(userSocialProfiles).values({
        user_id: user_id,
        provider: profile.provider,
        providerId: profile.id,
        username: profile.name
       }).onConflictDoUpdate({
        target: [userSocialProfiles.user_id, userSocialProfiles.provider],
        set: {
          providerId: profile.id,
          username: profile.name
        }
      });

      // Fetch the updated user
      const userResult = await tx.select().from(users)
        .where(eq(users.id, user_id));

      if (userResult.length === 0) { throw new Error(`User not found: ${user_id }`);
      }

      const user = userResult[0];

      // Invalidate cache entries for this user and social profile
      await this.invalidateUserCache(user_id, users.name, users.email);
      await this.invalidateCache([`user:social:${profile.provider}:${profile.id}`]);

      return user;
    });
  }

  /**
   * Updates user's last login timestamp
   * Useful for tracking user activity without full profile updates
   */
  async updateLastLogin(user_id: string): Promise<void> {
    await withTransaction(async (tx) => {
      await tx.update(users)
        .set({ last_login_at: new Date() })
        .where(eq(users.id, user_id));
    });

    // Invalidate cache for this user
    await this.invalidateCache([`user:${ user_id }`]);
  }

  /**
   * Checks if a name is available
   * Useful for registration validation
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const result = await readDatabase.select({ count: sql<number>`1` })
      .from(users)
      .where(eq(users.name, name))
      .limit(1);
    return result.length === 0;
  }

  /**
   * Checks if an email is available
   * Useful for registration validation
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const result = await readDatabase.select({ count: sql<number>`1` })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result.length === 0;
  }

  /**
   * Implementation of abstract method from BaseStorage
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test basic database connectivity
      await readDatabase.select({ count: sql<number>`1` }).from(users).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  }
}















































