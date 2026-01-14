import { type NewUser,type User, users } from '@server/infrastructure/schema';
import { eq, sql } from 'drizzle-orm';

import { BaseStorage } from './base';

export class UserStorage extends BaseStorage<User> {
  constructor() {
    super({ prefix: 'users' });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [user] = await this.db.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.getCached(`email:${email}`, async () => {
      const [user] = await this.db.select().from(users).where(eq(users.email, email));
      return user;
    });
  }

  async createUser(data: NewUser): Promise<User> {
    // 1. Write to DB
    const [user] = await this.db.insert(users).values(data).returning();
    
    // 2. Invalidate potential list caches (if you had a 'list users' feature)
    await this.invalidateCache('all');
    
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db.update(users)
      .set({ last_active: new Date() }) // Assuming schema has last_active
      .where(eq(users.id, id));
      
    // Invalidate specific user cache so next fetch gets fresh timestamp
    await this.invalidateCache(`id:${id}`);
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.email, email));
      
    return Number(result?.count || 0) === 0;
  }
}