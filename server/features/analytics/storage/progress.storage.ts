import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import {
  type InsertUserProgress,
  user_progress,
  type UserProgress} from '@server/infrastructure/schema';
import { desc, eq, sql } from 'drizzle-orm';

import { BaseStorage } from '@/infrastructure/database/base/BaseStorage';

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
      logger.error('ProgressStorage health check failed:', { component: 'Chanuka' }, error);
      return false;
    }
  }

  /**
   * Gets all progress records for a user using Drizzle ORM
   */
  async getUserProgress(user_id: string): Promise<UserProgress[]> {
    const cacheKey = `${CACHE_PREFIX}${ user_id }`;

    return this.getCached(cacheKey, async () => { return await readDatabase.select().from(user_progress)
        .where(eq(user_progress.user_id, user_id))
        .orderBy(desc(user_progress.created_at));
     });
  }

  /**
   * Creates or updates user progress using Drizzle ORM
   */
  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    return this.withTransaction(async (tx) => {
      const result = await tx.insert(user_progress).values({
        ...progress,
        unlocked_at: progress.unlocked_at || new Date(),
      }).returning();

      const newProgress = result[0];

      // Batch invalidate related caches
      await this.invalidateCache(`${progress.user_id}`);
      await this.invalidateCache(`achievement:${progress.achievement_type}:${progress.user_id}`);
      await this.invalidateCache(`progress_stats:${progress.user_id}`);

      return newProgress;
    });
  }

  /**
   * Gets progress statistics for a user using Drizzle ORM
   */
  async getProgressStats(user_id: string): Promise<{ type: string; count: number }[]> { const cacheKey = `progress_stats:${user_id }`;

    return this.getCached(cacheKey, async () => {
      const result = await db
        .select({
          type: user_progress.achievement_type,
          count: sql<number>`COUNT(*)`
        })
        .from(user_progress)
        .where(eq(user_progress.user_id, user_id))
        .groupBy(user_progress.achievement_type);

      return result.map(row => ({
        type: row.type,
        count: Number(row.count),
      }));
    });
  }
}









































