
import { database as db } from '../shared/database/connection';
import { 
  socialShares,
  bills,
  type SocialShare, 
  type InsertSocialShare
} from '../../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';
import { BaseStorage } from '../../infrastructure/database/base/BaseStorage.js';

const CACHE_TTL = 3600; // 1 hour in seconds

export class SocialShareStorage extends BaseStorage<SocialShare> {
  constructor() {
    super({ prefix: 'social-share' });
  }

  // Implement required abstract method
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check for in-memory storage
      return true;
    } catch (error) {
      logger.error('SocialShareStorage health check failed:', { component: 'Chanuka' }, error);
      return false;
    }
  }

  async trackSocialShare(share: InsertSocialShare): Promise<SocialShare> {
    return this.withTransaction(async (tx) => {
      const result = await tx.insert(socialShares).values({
        ...share,
        shareDate: share.shareDate || new Date(),
      }).returning();

      const newShare = result[0];

      // Invalidate relevant caches
      await Promise.all([
        this.invalidateCache(`socialShareStats:${share.billId}`),
        this.invalidateCache(`billShares:${share.billId}`),
        this.invalidateCache(`sharesByPlatform:${share.platform}`),
      ]);

      return newShare;
    });
  }

  async getSocialShareStats(billId: number): Promise<{ platform: string; count: number }[]> {
    return this.getCached(`socialShareStats:${billId}`, async () => {
      const result = await db
        .select({
          platform: socialShares.platform,
          count: sql<number>`COUNT(*)`
        })
        .from(socialShares)
        .where(eq(socialShares.billId, billId))
        .groupBy(socialShares.platform);

      return result.map(row => ({
        platform: row.platform,
        count: Number(row.count),
      }));
    });
  }

  async getSharesByPlatform(platform: string): Promise<Map<number, SocialShare[]>> {
    return this.getCached(`sharesByPlatform:${platform}`, async () => {
      const result = await db
        .select({
          id: socialShares.id,
          billId: socialShares.billId,
          platform: socialShares.platform,
          userId: socialShares.userId,
          metadata: socialShares.metadata,
          shareDate: socialShares.shareDate,
          likes: socialShares.likes,
          shares: socialShares.shares,
          comments: socialShares.comments,
          createdAt: socialShares.createdAt,
          billTitle: bills.title
        })
        .from(socialShares)
        .innerJoin(bills, eq(socialShares.billId, bills.id))
        .where(eq(socialShares.platform, platform))
        .orderBy(desc(socialShares.createdAt));

      const grouped = new Map<number, SocialShare[]>();
      for (const share of result) {
        const shares = grouped.get(share.billId) || [];
        shares.push(share as SocialShare);
        grouped.set(share.billId, shares);
      }
      return grouped;
    });
  }

  async getBillShares(billId: number): Promise<SocialShare[]> {
    return this.getCached(`billShares:${billId}`, async () => {
      return await db.select().from(socialShares)
        .where(eq(socialShares.billId, billId))
        .orderBy(desc(socialShares.createdAt));
    });
  }

  // Optional: Add pagination methods if needed
  async getRecentShares(limit: number = 10): Promise<SocialShare[]> {
    return this.getCached(`recentShares:${limit}`, async () => {
      return await db.select().from(socialShares)
        .orderBy(desc(socialShares.createdAt))
        .limit(limit);
    });
  }
}





































