 import { databaseService } from '@/services/database-service';
 import { readDatabase } from '@shared/database/connection';
import {
  billEngagement,
  userInterests,
  bills,
  billTags,
  billSponsorships,
  sponsors,
} from '@shared/schema';
import { eq, and, inArray, or, sql, SQL, gt, desc, count } from 'drizzle-orm';
import type { PlainBill } from '../domain/recommendation.dto';

export class RecommendationRepository {
  private get db() {
  return readDatabase;
  }
  /*  ==========  User  ==========  */
  async getUserInterests(userId: string): Promise<string[]> {
  const db = readDatabase;
    const rows = await db
      .select({ interest: userInterests.interest })
      .from(userInterests)
      .where(eq(userInterests.userId, userId));
    return rows.map(r => r.interest);
  }

  async getUserEngagedBillIds(userId: string): Promise<number[]> {
  const db = readDatabase;
    const rows = await db
      .select({ billId: billEngagement.billId })
      .from(billEngagement)
      .where(eq(billEngagement.userId, userId));
    return [...new Set(rows.map(r => r.billId as number))] as number[];
  }

  /*  ==========  Bill  ==========  */
  async getBillsByIds(ids: number[]): Promise<PlainBill[]> {
    if (!ids.length) return [];
  const db = readDatabase;
    const rows = await db.select().from(bills).where(inArray(bills.id, ids));
    return rows.map(r => this.toPlain(r));
  }

  async getBillsByTags(tags: string[], excludeIds: number[]): Promise<PlainBill[]> {
    if (!tags.length) return [];
  const db = readDatabase;
    const tagRows = await db
      .select({ billId: billTags.billId })
      .from(billTags)
      .where(inArray(billTags.tag, tags));
    const billIds = [...new Set(tagRows.map(r => r.billId as number))].filter((id: unknown) => !excludeIds.includes(id as number));
    if (!billIds.length) return [];
    const rows = await db.select().from(bills).where(inArray(bills.id, billIds));
    return rows.map(r => this.toPlain(r));
  }

  async getTrendingBillIds(days: number, limit: number): Promise<number[]> {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = readDatabase;
    const rows = await db
      .select({ billId: billEngagement.billId })
      .from(billEngagement)
      .where(gt(billEngagement.lastEngaged, threshold))
      .groupBy(billEngagement.billId)
      .orderBy(desc(sql`sum(${billEngagement.engagementScore})`))
      .limit(limit);
    return rows.map(r => r.billId);
  }

  /*  ==========  Collaborative  ==========  */
  async getSimilarUserIds(userId: string, interests: string[]): Promise<string[]> {
    if (!interests.length) return [];
    const minShared = Math.max(1, Math.floor(interests.length * 0.4));
  const db = readDatabase;
    const rows = await db
      .select({
        userId: userInterests.userId,
        shared: sql<number>`count(distinct ${userInterests.interest})`,
      })
      .from(userInterests)
      .where(and(inArray(userInterests.interest, interests), sql`${userInterests.userId} <> ${userId}`))
      .groupBy(userInterests.userId)
      .having(sql`count(distinct ${userInterests.interest}) >= ${minShared}`)
      .orderBy(desc(sql`count(distinct ${userInterests.interest})`))
      .limit(50);
    return rows.map(r => r.userId);
  }

  async getEngagementByUsers(userIds: string[]): Promise<Array<{ userId: string; billId: number; score: number }>> {
  const db = readDatabase;
    const rows = await db
      .select({
        userId: billEngagement.userId,
        billId: billEngagement.billId,
        score: billEngagement.engagementScore,
      })
      .from(billEngagement)
      .where(inArray(billEngagement.userId, userIds));
    return rows as any[];
  }

  /*  ==========  Engagement tracking – atomic upsert  ==========  */
  async upsertEngagement(userId: string, billId: number, type: 'view' | 'comment' | 'share'): Promise<void> {
  const db = readDatabase;
    const existing = await db
      .select()
      .from(billEngagement)
      .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)))
      .limit(1);
    const now = new Date();
    if (existing.length) {
      const row = existing[0];
      const updates = {
        lastEngaged: now,
        updatedAt: now,
        viewCount: row.viewCount ?? 0,
        commentCount: row.commentCount ?? 0,
        shareCount: row.shareCount ?? 0,
      };
      if (type === 'view') updates.viewCount++;
      if (type === 'comment') updates.commentCount++;
      if (type === 'share') updates.shareCount++;
      (updates as any).engagementScore = this.calcScore(updates.viewCount, updates.commentCount, updates.shareCount);
      await db
        .update(billEngagement)
        .set(updates)
        .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)));
    } else {
      const viewCount = type === 'view' ? 1 : 0;
      const commentCount = type === 'comment' ? 1 : 0;
      const shareCount = type === 'share' ? 1 : 0;
      await db.insert(billEngagement).values({
        userId,
        billId,
        viewCount,
        commentCount,
        shareCount,
        engagementScore: this.calcScore(viewCount, commentCount, shareCount),
        lastEngaged: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /*  ==========  Tag helpers  ==========  */
  async getTagsForBill(billId: number): Promise<string[]> {
  const db = readDatabase;
    const rows = await db.select({ tag: billTags.tag }).from(billTags).where(eq(billTags.billId, billId));
    return rows.map(r => r.tag);
  }

  /*  ----------  private  ----------  */
  private calcScore(v: number, c: number, s: number): number {
    const WEIGHTS = { VIEW: 0.1, COMMENT: 0.5, SHARE: 0.3 } as const;
    return v * WEIGHTS.VIEW + c * WEIGHTS.COMMENT + s * WEIGHTS.SHARE;
  }

  private toPlain(row: any): PlainBill {
    return { ...row };
  }
}






































