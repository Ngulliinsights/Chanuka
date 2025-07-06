import { backOff } from 'exponential-backoff';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { pool } from '../../shared/database/pool.js';
import type { InsertSocialShare, SocialShare } from '../../shared/schema.js';
import { logger } from '../../shared/utils/logger.js';
import { BaseStorage } from './base/BaseStorage.js';

const CACHE_TTL = 3600; // 1 hour in seconds

export class SocialShareStorage extends BaseStorage<SocialShare> {
  constructor(redis: Redis, pool: Pool) {
    super(redis, pool, { prefix: 'social-share', cacheTTL: CACHE_TTL });
  }

  static async initializeSchema(pool: Pool): Promise<void> {
    const initializeWithRetry = async () => {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS social_shares (
            id SERIAL PRIMARY KEY,
            bill_id INTEGER NOT NULL,
            platform VARCHAR(50) NOT NULL,
            shared_by_user_id INTEGER NOT NULL,
            shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_social_shares_bill_id ON social_shares(bill_id);
          CREATE INDEX IF NOT EXISTS idx_social_shares_platform ON social_shares(platform);
        `);
      } finally {
        client.release();
      }
    };

    try {
      await backOff(() => initializeWithRetry(), {
        numOfAttempts: 5,
        startingDelay: 1000,
        maxDelay: 5000,
        timeMultiple: 2,
        retry: (e: any) => {
          logger.warn('Retrying schema initialization:', e);
          return true;
        },
      });
    } catch (err) {
      logger.error('Failed to initialize schema:', err);
      throw err;
    }
  }

  protected async getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const data = await fetchFn();
    await this.redis.setex(key, CACHE_TTL, JSON.stringify(data));
    return data;
  }

  protected async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async trackSocialShare(share: InsertSocialShare): Promise<SocialShare> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<SocialShare>(
        `INSERT INTO social_shares (bill_id, platform, user_id)
         VALUES ($1, $2, $3)
         RETURNING id, bill_id as "billId", platform, user_id as "userId", created_at as "createdAt"`,
        [share.billId, share.platform, share.userId],
      );

      const newShare = result.rows[0];

      // Invalidate relevant caches
      await Promise.all([
        this.invalidateCache(`socialShareStats:${share.billId}`),
        this.invalidateCache(`billShares:${share.billId}`),
        this.invalidateCache(`sharesByPlatform:${share.platform}`),
      ]);

      return newShare;
    } finally {
      client.release();
    }
  }

  async getSocialShareStats(billId: number): Promise<{ platform: string; count: number }[]> {
    return this.getCached(`socialShareStats:${billId}`, async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          `SELECT platform, COUNT(*) as count
           FROM social_shares
           WHERE bill_id = $1
           GROUP BY platform`,
          [billId],
        );
        return result.rows;
      } finally {
        client.release();
      }
    });
  }

  async getSharesByPlatform(platform: string): Promise<Map<number, SocialShare[]>> {
    return this.getCached(`sharesByPlatform:${platform}`, async () => {
      const result = await this.pool.query<SocialShare>(
        `SELECT s.*, b.title as "billTitle"
         FROM social_shares s
         JOIN bills b ON s.bill_id = b.id
         WHERE s.platform = $1
         ORDER BY s.created_at DESC`,
        [platform],
      );

      const grouped = new Map<number, SocialShare[]>();
      for (const share of result.rows) {
        const shares = grouped.get(share.billId) || [];
        shares.push(share);
        grouped.set(share.billId, shares);
      }
      return grouped;
    });
  }

  async getBillShares(billId: number): Promise<SocialShare[]> {
    return this.getCached(`billShares:${billId}`, async () => {
      const result = await this.pool.query<SocialShare>(
        `SELECT id, bill_id as "billId", platform, user_id as "userId",
                created_at as "createdAt", metadata, share_date as "shareDate",
                likes, shares, comments
         FROM social_shares
         WHERE bill_id = $1
         ORDER BY created_at DESC`,
        [billId],
      );
      return result.rows;
    });
  }

  // Optional: Add pagination methods if needed
  async getRecentShares(limit: number = 10): Promise<SocialShare[]> {
    return this.getCached(`recentShares:${limit}`, async () => {
      const result = await this.pool.query<SocialShare>(
        `SELECT id, bill_id as "billId", platform, user_id as "userId",
                created_at as "createdAt", metadata, share_date as "shareDate",
                likes, shares, comments
         FROM social_shares
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      return result.rows;
    });
  }
}

// Initialize schema when module is imported
SocialShareStorage.initializeSchema(pool).catch(err => {
  logger.error('Failed to initialize database schema:', err);
  // Don't exit process, let the error propagate
});
