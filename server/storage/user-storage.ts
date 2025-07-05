import { type OAuthProvider, type SocialProfile, type UserProfile } from '@shared/types/auth.js';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import type { StorageOptions } from './base/BaseStorage.js';
import { BaseStorage } from './base/BaseStorage.js';

// Define a type for user data including the password hash
interface UserWithPasswordHash extends UserProfile {
  passwordHash: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string; // This should be the hashed password
  role?: 'user' | 'admin' | 'expert';
  avatarUrl?: string | null;
  displayName?: string | null;
  expertise?: string | null;
  socialProfiles?: SocialProfile[];
}

export class UserStorage extends BaseStorage<UserProfile> {
  protected redis: Redis;
  protected pool: Pool;

  // Cache user SQL fields as constants to avoid repetition and ensure consistency
  private static readonly USER_SELECT_FIELDS = 
    'id, username, email, display_name, role, avatar_url, expertise, created_at, last_login_at';

  private static readonly USER_INSERT_FIELDS = 
    'username, email, password, role, avatar_url, display_name, expertise';

  private static readonly USER_INSERT_PLACEHOLDERS = '$1, $2, $3, $4, $5, $6, $7';

  constructor(redis: Redis, pool: Pool, options: StorageOptions = {}) {
    super(redis, pool, options);
    this.redis = redis;
    this.pool = pool;
  }

  /**
   * Maps a database row to a UserProfile object
   * Centralizes the mapping logic to ensure consistency across all methods
   */
  private mapRowToUserProfile(row: any): UserProfile {
    return {
      id: String(row.id), // Ensure ID is always string for consistency
      username: row.username,
      email: row.email,
      displayName: row.display_name || null,
      role: row.role || 'user',
      avatarUrl: row.avatar_url,
      expertise: row.expertise || null,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at || null, // Simplified to use consistent field name
    };
  }

  /**
   * Converts string ID to integer for database queries
   * Centralizes ID conversion logic and adds validation
   */
  private parseUserId(id: string): number {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid user ID: ${id}`);
    }
    return numericId;
  }

  /**
   * Invalidates all cache entries related to a specific user
   * Centralized cache invalidation to ensure we don't miss any patterns
   */
  private async invalidateUserCache(userId: string, username?: string, email?: string): Promise<void> {
    const cacheKeys = [`user:${userId}`];

    if (username) {
      cacheKeys.push(`user:username:${username}`);
    }

    if (email) {
      cacheKeys.push(`user:email:${email}`);
    }

    // Invalidate all cache keys in parallel for better performance
    await Promise.all(cacheKeys.map(key => this.invalidateCache(key)));
  }

  async getUser(id: string): Promise<UserProfile | null> {
    return this.getCached(`user:${id}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          `SELECT ${UserStorage.USER_SELECT_FIELDS} FROM users WHERE id = $1`,
          [this.parseUserId(id)],
        );

        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    return this.getCached(`user:username:${username}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          `SELECT ${UserStorage.USER_SELECT_FIELDS} FROM users WHERE username = $1`,
          [username],
        );
        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return this.getCached(`user:email:${email}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          `SELECT ${UserStorage.USER_SELECT_FIELDS} FROM users WHERE email = $1`,
          [email],
        );
        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  /**
   * Retrieves user with password hash for authentication
   * Note: This method intentionally does not cache the result for security
   */
  async getUserWithPasswordHash(username: string): Promise<UserWithPasswordHash | null> {
    const result = await this.withTransaction(async client => {
      const userResult = await client.query(
        `SELECT ${UserStorage.USER_SELECT_FIELDS}, password FROM users WHERE username = $1`,
        [username],
      );

      if (userResult.rows.length === 0) return null;

      const user = userResult.rows[0];
      const userProfile = this.mapRowToUserProfile(user);

      return {
        ...userProfile,
        passwordHash: user.password,
      };
    });
    return result;
  }

  async createUser(data: CreateUserData): Promise<UserProfile> {
    return this.withTransaction(async client => {
      // Insert the main user record
      const result = await client.query(
        `INSERT INTO users (${UserStorage.USER_INSERT_FIELDS})
         VALUES (${UserStorage.USER_INSERT_PLACEHOLDERS})
         RETURNING ${UserStorage.USER_SELECT_FIELDS}`,
        [
          data.username,
          data.email,
          data.password, // Already hashed
          data.role || 'user',
          data.avatarUrl || null,
          data.displayName || null,
          data.expertise || null,
        ],
      );

      const user = result.rows[0];

      // Handle social profiles if provided - batch insert for better performance
      if (data.socialProfiles && data.socialProfiles.length > 0) {
        const socialProfileValues = data.socialProfiles.map(profile => 
          [user.id, profile.provider, profile.profileId, profile.username]
        );

        // Use a single query with multiple values for better performance
        const placeholders = socialProfileValues.map((_, index) => 
          `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
        ).join(', ');

        const flatValues = socialProfileValues.flat();

        await client.query(
          `INSERT INTO user_social_profiles (user_id, provider, profile_id, username)
           VALUES ${placeholders}`,
          flatValues,
        );
      }

      // Invalidate relevant cache patterns
      await this.invalidateCache(`user:*`);

      return this.mapRowToUserProfile(user);
    });
  }

  async getUserBySocialProfile(
    provider: OAuthProvider,
    profileId: string,
  ): Promise<UserProfile | null> {
    // Consider adding caching for frequently accessed social profiles
    return this.getCached(`user:social:${provider}:${profileId}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          `SELECT u.id, u.username, u.email, u.display_name, u.role, u.avatar_url, u.expertise, u.created_at, u.last_login_at
           FROM users u
           JOIN user_social_profiles sp ON sp.user_id = u.id
           WHERE sp.provider = $1 AND sp.profile_id = $2`,
          [provider, profileId],
        );

        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  async linkSocialProfile(userId: string, profile: SocialProfile): Promise<UserProfile> {
    return this.withTransaction(async client => {
      const numericUserId = this.parseUserId(userId);

      // Use UPSERT pattern for better reliability
      await client.query(
        `INSERT INTO user_social_profiles (user_id, provider, profile_id, username)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET 
           profile_id = EXCLUDED.profile_id, 
           username = EXCLUDED.username`,
        [numericUserId, profile.provider, profile.profileId, profile.username],
      );

      // Fetch the updated user profile
      const userResult = await client.query(
        `SELECT ${UserStorage.USER_SELECT_FIELDS} FROM users WHERE id = $1`,
        [numericUserId],
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      const user = userResult.rows[0];

      // Invalidate cache entries for this user and social profile
      await this.invalidateUserCache(userId, user.username, user.email);
      await this.invalidateCache(`user:social:${profile.provider}:${profile.profileId}`);

      return this.mapRowToUserProfile(user);
    });
  }

  /**
   * Updates user's last login timestamp
   * Useful for tracking user activity without full profile updates
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.withTransaction(async client => {
      await client.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [this.parseUserId(userId)],
      );
    });

    // Invalidate cache for this user
    await this.invalidateCache(`user:${userId}`);
  }

  /**
   * Checks if a username is available
   * Useful for registration validation
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const result = await this.withTransaction(async client => {
      const userResult = await client.query(
        'SELECT 1 FROM users WHERE username = $1 LIMIT 1',
        [username],
      );
      return userResult.rows.length === 0;
    });
    return result;
  }

  /**
   * Checks if an email is available
   * Useful for registration validation
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const result = await this.withTransaction(async client => {
      const userResult = await client.query(
        'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
        [email],
      );
      return userResult.rows.length === 0;
    });
    return result;
  }
}