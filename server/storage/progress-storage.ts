import { 
  userProgress,
  type UserProgress, 
  type InsertUserProgress,
  readDatabase,
  writeDatabase
} from '../../shared/database/connection.js';
import { eq, desc, sql } from 'drizzle-orm';
import { BaseStorage } from './base/BaseStorage.js';

// Constants for cache configuration
const CACHE_PREFIX = 'progress:';
const TYPE_CACHE_PREFIX = 'progress:type:';
const CACHE_TTL = 3600; // 1 hour

export class ProgressStorage extends BaseStorage<UserProgress> {
  constructor() {
    super({ prefix: 'progress', cacheTTL: 3600 });
  }

  /**
   * Gets all progress records for a user using Drizzle ORM
   */
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;

    return this.getCached(cacheKey, async () => {
      return await readDatabase.select().from(userProgress)
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
      const result = await readDatabase
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
