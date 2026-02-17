/**
 * Example: User Storage with Transformers
 * 
 * This example shows how to integrate transformers into the UserStorage class.
 * This is a reference implementation - the actual integration should be done
 * as part of task 5.3.
 * 
 * Requirements: 4.1, 4.3
 */

import { type NewUser, type User as DbUser, users } from '@server/infrastructure/schema';
import { eq, sql } from 'drizzle-orm';
import { BaseStorage } from './base';

// Import domain types and transformers
import type { User } from '@shared/types/domains/authentication/user';
import type { UserId } from '@shared/types/core/branded';
import { userDbToDomain } from '@shared/utils/transformers/entities/user';

/**
 * User Storage with Transformer Integration
 * 
 * Key changes from original:
 * 1. Generic type changed from DbUser to User (domain type)
 * 2. All methods return domain types
 * 3. Transformers used at DB boundary
 */
export class UserStorageWithTransformers extends BaseStorage<User> {
  constructor() {
    super({ prefix: 'users' });
  }

  /**
   * Get user by ID
   * Returns domain User type
   */
  async getUser(id: UserId): Promise<User | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [dbUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id as string));
      
      // Transform DB → Domain at the boundary
      return dbUser ? userDbToDomain.transform(dbUser as DbUser) : undefined;
    });
  }

  /**
   * Get user by email
   * Returns domain User type
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.getCached(`email:${email}`, async () => {
      const [dbUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      // Transform DB → Domain at the boundary
      return dbUser ? userDbToDomain.transform(dbUser as DbUser) : undefined;
    });
  }

  /**
   * Create user
   * Accepts domain User type, returns domain User type
   */
  async createUser(user: User): Promise<User> {
    // Transform Domain → DB before insert
    const dbUser = userDbToDomain.reverse(user);
    
    // Insert into database
    const [created] = await this.db
      .insert(users)
      .values(dbUser as NewUser)
      .returning();
    
    // Invalidate caches
    await this.invalidateCache('all');
    
    // Transform DB → Domain before returning
    return userDbToDomain.transform(created as DbUser);
  }

  /**
   * Update user
   * Accepts domain User type, returns domain User type
   */
  async updateUser(user: User): Promise<User> {
    // Transform Domain → DB before update
    const dbUser = userDbToDomain.reverse(user);
    
    // Update in database
    const [updated] = await this.db
      .update(users)
      .set(dbUser as Partial<DbUser>)
      .where(eq(users.id, user.id as string))
      .returning();
    
    // Invalidate specific user cache
    await this.invalidateCache(`id:${user.id}`);
    await this.invalidateCache(`email:${user.email}`);
    
    // Transform DB → Domain before returning
    return userDbToDomain.transform(updated as DbUser);
  }

  /**
   * Update last login
   * Accepts domain UserId
   */
  async updateLastLogin(id: UserId): Promise<void> {
    await this.db
      .update(users)
      .set({ last_active: new Date() })
      .where(eq(users.id, id as string));
    
    // Invalidate specific user cache so next fetch gets fresh timestamp
    await this.invalidateCache(`id:${id}`);
  }

  /**
   * Check if email is available
   * Pure query method - no transformation needed
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.email, email));
    
    return Number(result?.count || 0) === 0;
  }

  /**
   * Get multiple users by IDs
   * Returns array of domain User types
   */
  async getUsersByIds(ids: UserId[]): Promise<User[]> {
    const dbUsers = await this.db
      .select()
      .from(users)
      .where(sql`${users.id} = ANY(${ids})`);
    
    // Transform each DB user to domain user
    return dbUsers.map(dbUser => userDbToDomain.transform(dbUser as DbUser));
  }

  /**
   * Search users
   * Returns array of domain User types
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const dbUsers = await this.db
      .select()
      .from(users)
      .where(sql`${users.username} ILIKE ${'%' + query + '%'} OR ${users.email} ILIKE ${'%' + query + '%'}`)
      .limit(limit);
    
    // Transform each DB user to domain user
    return dbUsers.map(dbUser => userDbToDomain.transform(dbUser as DbUser));
  }
}

/**
 * Usage Example in Service Layer
 */
export class UserServiceExample {
  constructor(private userStorage: UserStorageWithTransformers) {}

  /**
   * Service methods work with domain types
   * No transformation needed - storage handles it
   */
  async getUserById(id: UserId): Promise<User | null> {
    const user = await this.userStorage.getUser(id);
    return user ?? null;
  }

  async createUser(userData: {
    email: string;
    username: string;
    password: string;
  }): Promise<User> {
    // Create domain entity
    const user: User = {
      id: crypto.randomUUID() as UserId,
      email: userData.email,
      username: userData.username,
      role: 'user' as unknown,
      status: 'active' as unknown,
      profile: null,
      preferences: {},
      verification: 'unverified' as unknown,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Storage handles transformation
    return await this.userStorage.createUser(user);
  }
}

/**
 * Usage Example in API Route
 */
import { Router } from 'express';
import { userDomainToApi } from '@shared/utils/transformers/entities/user';
import type { ApiUser } from '@shared/utils/transformers/entities/user';

export function createUserRoutes(userService: UserServiceExample): Router {
  const router = Router();

  /**
   * GET /api/users/:id
   * Returns API representation
   */
  router.get('/users/:id', async (req, res) => {
    const userId = req.params.id as UserId;
    
    // Service returns domain type
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Transform Domain → API for response
    const apiUser: ApiUser = userDomainToApi.transform(user);
    
    res.json(apiUser);
  });

  /**
   * POST /api/users
   * Accepts API representation
   */
  router.post('/users', async (req, res) => {
    const { email, username, password } = req.body;
    
    // Service works with domain types
    const user = await userService.createUser({
      email,
      username,
      password,
    });
    
    // Transform Domain → API for response
    const apiUser: ApiUser = userDomainToApi.transform(user);
    
    res.status(201).json(apiUser);
  });

  return router;
}
