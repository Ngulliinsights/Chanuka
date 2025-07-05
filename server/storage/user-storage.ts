import { type OAuthProvider, type SocialProfile, type UserProfile } from '@shared/types/auth.js';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import type { StorageOptions } from './base/BaseStorage.js'; // Corrected import path
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
  displayName?: string | null; // Added missing field
  expertise?: string | null; // Added missing field
  socialProfiles?: SocialProfile[];
}

export class UserStorage extends BaseStorage<UserProfile> {
  protected redis: Redis; // Changed from private to protected
  protected pool: Pool; // Changed from private to protected

  constructor(redis: Redis, pool: Pool, options: StorageOptions = {}) {
    super(redis, pool, options);
    this.redis = redis;
    this.pool = pool;
  }

  // Helper to map DB row to UserProfile
  private mapRowToUserProfile(row: any): UserProfile {
    return {
      id: String(row.id), // Ensure ID is string
      username: row.username,
      email: row.email,
      displayName: row.display_name || null, // Add displayName
      role: row.role || 'user',
      avatarUrl: row.avatar_url,
      expertise: row.expertise || null, // Added missing expertise field
      createdAt: row.created_at,
      lastLoginAt: row.last_active || row.last_login_at || null, // Use last_login_at or last_active
    };
  }

  async getUser(id: string): Promise<UserProfile | null> {
    // ID should be string
    return this.getCached(`user:${id}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          'SELECT id, username, email, display_name, role, avatar_url, expertise, created_at, last_login_at FROM users WHERE id = $1', // Fetch display_name, expertise, last_login_at
          [parseInt(id)], // Convert string ID to number for query if DB uses integer ID
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
          'SELECT id, username, email, display_name, role, avatar_url, expertise, created_at, last_login_at FROM users WHERE username = $1', // Added expertise
          [username],
        );
        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  // New method to get user by email
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return this.getCached(`user:email:${email}`, async () => {
      const result = await this.withTransaction(async client => {
        const userResult = await client.query(
          'SELECT id, username, email, display_name, role, avatar_url, expertise, created_at, last_login_at FROM users WHERE email = $1', // Added expertise
          [email],
        );
        if (userResult.rows.length === 0) return null;
        return this.mapRowToUserProfile(userResult.rows[0]);
      });
      return result;
    });
  }

  // New method to get user with password hash
  async getUserWithPasswordHash(username: string): Promise<UserWithPasswordHash | null> {
    // Don't cache password hash
    const result = await this.withTransaction(async client => {
      const userResult = await client.query(
        'SELECT id, username, email, display_name, role, avatar_url, created_at, last_login_at, password FROM users WHERE username = $1', // Added expertise
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
      const { username, email, password, role = 'user', avatarUrl = null } = data;

      const result = await client.query(
        `INSERT INTO users (username, email, password, role, avatar_url, display_name, expertise)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, email, display_name, role, avatar_url, expertise, created_at, last_login_at`, // Added expertise
        [
          data.username,
          data.email,
          data.password, // Already hashed
          data.role || 'user',
          data.avatarUrl,
          data.displayName, // Added displayName
          data.expertise, // Added expertise
        ],
      );

      const user = result.rows[0];

      // Handle social profiles if provided
      if (data.socialProfiles && data.socialProfiles.length > 0) {
        for (const profile of data.socialProfiles) {
          await client.query(
            `INSERT INTO user_social_profiles (user_id, provider, profile_id, username)
             VALUES ($1, $2, $3, $4)`, // Use 'provider' column
            [user.id, profile.provider, profile.profileId, profile.username],
          );
        }
      }

      await this.invalidateCache(`user:*`);
      return this.mapRowToUserProfile(user);
    });
  }

  async getUserBySocialProfile(
    provider: OAuthProvider,
    profileId: string,
  ): Promise<UserProfile | null> {
    // Consider caching this if frequently accessed
    return this.withTransaction(async client => {
      const result = await client.query(
        `SELECT u.id, u.username, u.email, u.display_name, u.role, u.avatar_url, u.created_at, u.last_login_at
         FROM users u
         JOIN user_social_profiles sp ON sp.user_id = u.id
         WHERE sp.provider = $1 AND sp.profile_id = $2`, // Use 'provider' column
        [provider, profileId],
      );

      if (result.rows.length === 0) return null;
      return this.mapRowToUserProfile(result.rows[0]);
    });
  }

  async linkSocialProfile(userId: string, profile: SocialProfile): Promise<UserProfile> {
    // userId should be string
    return this.withTransaction(async client => {
      await client.query(
        `INSERT INTO user_social_profiles (user_id, provider, profile_id, username)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) DO UPDATE SET profile_id = EXCLUDED.profile_id, username = EXCLUDED.username`, // Use 'provider', add conflict handling
        [parseInt(userId), profile.provider, profile.profileId, profile.username], // Convert string ID if needed
      );

      const userResult = await client.query(
        'SELECT id, username, email, display_name, role, avatar_url, created_at, last_login_at FROM users WHERE id = $1',
        [parseInt(userId)], // Convert string ID if needed
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      await this.invalidateCache(`user:${userId}`);
      await this.invalidateCache(`user:username:${user.username}`);
      await this.invalidateCache(`user:email:${user.email}`);

      return this.mapRowToUserProfile(user);
    });
  }
}
