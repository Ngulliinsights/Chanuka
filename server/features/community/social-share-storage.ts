
import { database as db } from '../shared/database/connection';
import { 
  social_shares,
  bills,
  type SocialShare, 
  type InsertSocialShare
} from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger   } from '../../../shared/core/src/index.js';
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
      const result = await tx.insert(social_shares).values({
        ...share,
        shareDate: share.shareDate || new Date(),
      }).returning();

      const newShare = result[0];

      // Invalidate relevant caches
      await Promise.all([
        this.invalidateCache(`social_shareStats:${share.bill_id}`),
        this.invalidateCache(`billShares:${share.bill_id}`),
        this.invalidateCache(`sharesByPlatform:${share.platform}`),
      ]);

      return newShare;
    });
  }

  async getSocialShareStats(bill_id: number): Promise<{ platform: string; count: number }[]> { return this.getCached(`social_shareStats:${bill_id }`, async () => {
      const result = await db
        .select({
          platform: social_shares.platform,
          count: sql<number>`COUNT(*)`
        })
        .from(social_shares)
        .where(eq(social_shares.bill_id, bill_id))
        .groupBy(social_shares.platform);

      return result.map(row => ({
        platform: row.platform,
        count: Number(row.count),
      }));
    });
  }

  async getSharesByPlatform(platform: string): Promise<Map<number, SocialShare[]>> {
    return this.getCached(`sharesByPlatform:${platform}`, async () => { const result = await db
        .select({
          id: social_shares.id,
          bill_id: social_shares.bill_id,
          platform: social_shares.platform,
          user_id: social_shares.user_id,
          metadata: social_shares.metadata,
          shareDate: social_shares.shareDate,
          likes: social_shares.likes,
          shares: social_shares.shares,
          comments: social_shares.comments,
          created_at: social_shares.created_at,
          billTitle: bills.title
          })
        .from(social_shares)
        .innerJoin(bills, eq(social_shares.bill_id, bills.id))
        .where(eq(social_shares.platform, platform))
        .orderBy(desc(social_shares.created_at));

      const grouped = new Map<number, SocialShare[]>();
      for (const share of result) {
        const shares = grouped.get(share.bill_id) || [];
        shares.push(share as SocialShare);
        grouped.set(share.bill_id, shares);
      }
      return grouped;
    });
  }

  async getBillShares(bill_id: number): Promise<SocialShare[]> { return this.getCached(`billShares:${bill_id }`, async () => { return await db.select().from(social_shares)
        .where(eq(social_shares.bill_id, bill_id))
        .orderBy(desc(social_shares.created_at));
     });
  }

  // Optional: Add pagination methods if needed
  async getRecentShares(limit: number = 10): Promise<SocialShare[]> {
    return this.getCached(`recentShares:${limit}`, async () => {
      return await db.select().from(social_shares)
        .orderBy(desc(social_shares.created_at))
        .limit(limit);
    });
  }
}






































