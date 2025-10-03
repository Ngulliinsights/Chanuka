import { 
  database, 
  readDatabase, 
  writeDatabase, 
  pool,
  users,
  userProfiles,
  userSocialProfiles,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile
} from '../../shared/database/connection.js';
import { eq, and, or } from 'drizzle-orm';
import type { StorageOptions } from './base/BaseStorage.js';
import { BaseStorage } from './base/BaseStorage.js';

// Define a type for user data including the password hash
interface UserWithPasswordHash extends User {
  passwordHash: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string; // This should be the hashed password
  firstName?: string;
  lastName?: string;
  role?: 'citizen' | 'admin' | 'expert' | 'journalist' | 'advocate';
}

export class UserStorage extends BaseStorage<User> {
  constructor(options: StorageOptions = {}) {
    super(pool, options);
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
      passwordHash: user.passwordHash,
    };
  }

  async createUser(data: CreateUserData): Promise<User> {
    const userData: InsertUser = {
      name: data.name,
      email: data.email,
      passwordHash: data.password, // Already hashed
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: data.role || 'citizen',
      verificationStatus: 'pending',
      isActive: true,
        ],
      );

      const user = result.rows[0];

      // Handle social profiles if provided - batch insert for better performance
      if (data.socialProfiles && data.socialProfiles.length > 0) {
        const socialProfileValues = data.socialProfiles.map(profile => 
          [user.id, profile.provider, profile.id, profile.name]
        );

        // Use a single query with multiple values for better performance
        const placeholders = socialProfileValues.map((_, index) => 
          `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
        ).join(', ');

        const flatValues = socialProfileValues.flat();

        // Insert social profiles using Drizzle ORM
        const socialProfileData = data.socialProfiles.map(profile => ({
          userId: user.id,
          provider: profile.provider,
          providerId: profile.id,
          username: profile.name
        }));
        await tx.insert(userSocialProfiles).values(socialProfileData);
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
        const result = await readDatabase
          .select()
          .from(users)
          .innerJoin(userSocialProfiles, eq(users.id, userSocialProfiles.userId))
          .where(and(
            eq(userSocialProfiles.provider, provider),
            eq(userSocialProfiles.providerId, profileId)
          ));

        if (result.length === 0) return null;
        return result[0].users;
      });
      return result;
    });
  }

  async linkSocialProfile(userId: string, profile: SocialProfile): Promise<UserProfile> {
    return this.withTransaction(async client => {
      const numericUserId = this.parseUserId(userId);

      // Use UPSERT pattern for better reliability
      await writeDatabase.insert(userSocialProfiles).values({
        userId: userId,
        provider: profile.provider,
        providerId: profile.id,
        username: profile.name
      }).onConflictDoUpdate({
        target: [userSocialProfiles.userId, userSocialProfiles.provider],
        set: {
          providerId: profile.id,
          username: profile.name
        }
      });

      // Fetch the updated user profile
      const userResult = await readDatabase.select().from(users)
        .where(eq(users.id, userId));

      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      const user = userResult.rows[0];

      // Invalidate cache entries for this user and social profile
      await this.invalidateUserCache(userId, user.name, user.email);
      await this.invalidateCache(`user:social:${profile.provider}:${profile.id}`);

      return this.mapRowToUserProfile(user);
    });
  }

  /**
   * Updates user's last login timestamp
   * Useful for tracking user activity without full profile updates
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.withTransaction(async client => {
      await writeDatabase.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));
    });

    // Invalidate cache for this user
    await this.invalidateCache(`user:${userId}`);
  }

  /**
   * Checks if a name is available
   * Useful for registration validation
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const result = await this.withTransaction(async client => {
      const result = await readDatabase.select({ count: sql<number>`1` })
        .from(users)
        .where(eq(users.name, name))
        .limit(1);
      return result.length === 0;
    });
    return result;
  }

  /**
   * Checks if an email is available
   * Useful for registration validation
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const result = await this.withTransaction(async client => {
      const result = await readDatabase.select({ count: sql<number>`1` })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return result.length === 0;
    });
    return result;
  }
}