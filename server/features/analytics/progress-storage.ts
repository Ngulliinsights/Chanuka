import { database as db } from '../shared/database/connection.js';
import { 
  userProgress,
  type UserProgress, 
  type InsertUserProgress
} from '../../../shared/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { BaseStorage } from './base/BaseStorage.js';

// Constants for cache configuration
const CACHE_PREFIX = 'progress:';
const TYPE_CACHE_PREFIX = 'progress:type:';
const CACHE_TTL = 3600; // 1 hour

export class ProgressStorage extends BaseStorage<UserProgress> {
  constructor() {
    super({ prefix: 'progress' });
  }

  // Implement required abstract method
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check for in-memory storage
      return true;
    } catch (error) {
      console.error('ProgressStorage health check failed:', error);
      return false;
    }
  }

  /**
   * Gets all progress records for a user using Drizzle ORM
   */
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;

    return this.getCached(cacheKey, async () => {
      return await db.select().from(userProgress)
        .where(eq(userProgress.userId, userId))
        .orderBy(desc(userProgress.createdAt));
    });
  }

  /**
   * Creates or updates user progress using Drizzle ORM
   */
  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    return this.withTransaction(async (tx) => {
      const result = await tx.insert(userProgress).values({
        ...progress,
        unlockedAt: progress.unlockedAt || new Date(),
      }).returning();

      const newProgress = result[0];

      // Batch invalidate related caches
      await this.invalidateCache(`${progress.userId}`);
      await this.invalidateCache(`achievement:${progress.achievementType}:${progress.userId}`);
      await this.invalidateCache(`progress_stats:${progress.userId}`);

      return newProgress;
    });
  }

  /**
   * Gets progress statistics for a user using Drizzle ORM
   */
  async getProgressStats(userId: string): Promise<{ type: string; count: number }[]> {
    const cacheKey = `progress_stats:${userId}`;

    return this.getCached(cacheKey, async () => {
      const result = await db
        .select({
          type: userProgress.achievementType,
          count: sql<number>`COUNT(*)`
        })
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .groupBy(userProgress.achievementType);

      return result.map(row => ({
        type: row.type,
        count: Number(row.count),
      }));
    });
  }
}
