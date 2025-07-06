import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { type InsertUserProgress, type UserProgress } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';

// Constants for cache configuration
const CACHE_PREFIX = 'progress:';
const TYPE_CACHE_PREFIX = 'progress:type:';
const CACHE_TTL = 3600; // 1 hour

export class ProgressStorage extends BaseStorage<UserProgress> {
  constructor(redis: Redis, pool: Pool) {
    super(redis, pool, { prefix: 'progress', cacheTTL: 3600 });
  }

  protected async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;

    return this.getCached(cacheKey, async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM user_progress WHERE "userId" = $1 ORDER BY "createdAt" DESC',
          [userId],
        );
        return result.rows;
      } finally {
        client.release();
      }
    });
  }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO user_progress(
          "userId",
          "achievementType",
          "achievementValue",
          level,
          badge,
          description,
          "unlockedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          progress.userId,
          progress.achievementType,
          progress.achievementValue,
          progress.level || null,
          progress.badge || null,
          progress.description || null,
          progress.unlockedAt || new Date(),
          progress.createdAt || new Date(),
          progress.updatedAt || new Date(),
        ],
      );

      await client.query('COMMIT');

      // Batch invalidate related caches
      await this.invalidateCache(`${progress.userId}`);
      await this.invalidateCache(`achievement:${progress.achievementType}:${progress.userId}`);
      await this.invalidateCache(`progress_stats:${progress.userId}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getProgressStats(userId: number): Promise<{ type: string; count: number }[]> {
    const cacheKey = `progress_stats:${userId}`;

    return this.getCached(cacheKey, async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          `SELECT type, COUNT(*) as count
           FROM user_progress
           WHERE "userId" = $1
           GROUP BY type`,
          [userId],
        );

        return result.rows.map(row => ({
          type: row.type,
          count: parseInt(row.count),
        }));
      } finally {
        client.release();
      }
    });
  }

  async healthCheck(): Promise<{ database: boolean; cache: boolean }> {
    let dbStatus = false;
    let cacheStatus = false;

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        dbStatus = true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      const pong = await this.redis.ping();
      cacheStatus = pong === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    return { database: dbStatus, cache: cacheStatus };
  }

  async shutdown(): Promise<void> {
    await Promise.all([this.redis.quit(), this.pool.end()]);
  }
}
