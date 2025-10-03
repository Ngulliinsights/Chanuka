import { 
  socialShares,
  bills,
  type SocialShare, 
  type InsertSocialShare,
  readDatabase,
  writeDatabase
} from '../../shared/database/connection.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../../shared/utils/logger.js';
import { BaseStorage } from './base/BaseStorage.js';

const CACHE_TTL = 3600; // 1 hour in seconds

export class SocialShareStorage extends BaseStorage<SocialShare> {
  constructor() {
    super({ prefix: 'social-share', cacheTTL: CACHE_TTL });
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
      const result = await readDatabase
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
      const result = await readDatabase
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
      return await readDatabase.select().from(socialShares)
        .where(eq(socialShares.billId, billId))
        .orderBy(desc(socialShares.createdAt));
    });
  }

  // Optional: Add pagination methods if needed
  async getRecentShares(limit: number = 10): Promise<SocialShare[]> {
    return this.getCached(`recentShares:${limit}`, async () => {
      return await readDatabase.select().from(socialShares)
        .orderBy(desc(socialShares.createdAt))
        .limit(limit);
    });
  }
}
