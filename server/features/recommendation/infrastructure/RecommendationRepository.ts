import { User } from '@server/features/users/domain/entities/user';
import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
// FIXME: Invalid import - Comment out invalid @shared subdirectory imports
// import type { PlainBill } from '@shared/domain/recommendation.dto';
import {
  bill_engagement,
  bill_tags,
  bills,
  user_interests,
} from '@server/infrastructure/schema';
import { db } from '@server/infrastructure/database';
import { bills } from '@server/infrastructure/schema';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';

export class RecommendationRepository extends BaseRepository<PlainBill> {
  constructor() {
    super({
      entityName: 'Recommendation',
      enableCache: true,
      cacheTTL: 1800, // 30 minutes (ML-based recommendations, moderate volatility)
      enableLogging: true,
    });
  }

  /*  ==========  User  ==========  */
  async getUserInterests(user_id: string): Promise<Result<string[], Error>> {
    return this.executeRead(
      async (db) => {
        const rows = await db
          .select({ interest: user_interests.interest })
          .from(user_interests)
          .where(eq(user_interests.user_id, user_id));
        return rows.map(r => r.interest);
      },
      `recommendation:interests:${user_id}`
    );
  }

  async getUserEngagedBillIds(user_id: string): Promise<Result<number[], Error>> {
    return this.executeRead(
      async (db) => {
        const rows = await db
          .select({ bill_id: bill_engagement.bill_id })
          .from(bill_engagement)
          .where(eq(bill_engagement.user_id, user_id));
        return [...new Set(rows.map(r => r.bill_id as number))] as number[];
      },
      `recommendation:engaged:${user_id}`
    );
  }

  /*  ==========  Bill  ==========  */
  async getBillsByIds(ids: number[]): Promise<Result<PlainBill[], Error>> {
    if (!ids.length) return Ok([]);

    return this.executeRead(
      async (db) => {
        const rows = await db.select().from(bills).where(inArray(bills.id, ids));
        return rows.map(r => this.toPlain(r));
      },
      `recommendation:bills:${ids.slice(0, 5).join(',')}`
    );
  }

  async getBillsByTags(tags: string[], excludeIds: number[]): Promise<Result<PlainBill[], Error>> {
    if (!tags.length) return Ok([]);

    return this.executeRead(
      async (db) => {
        const tagRows = await db
          .select({ bill_id: bill_tags.bill_id })
          .from(bill_tags)
          .where(inArray(bill_tags.tag, tags));
        const bill_ids = [...new Set(tagRows.map(r => r.bill_id as number))].filter((id: unknown) => !excludeIds.includes(id as number));
        if (!bill_ids.length) return [];
        const rows = await db.select().from(bills).where(inArray(bills.id, bill_ids));
        return rows.map(r => this.toPlain(r));
      },
      `recommendation:tags:${tags.slice(0, 3).join(',')}`
    );
  }

  async getTrendingBillIds(days: number, limit: number): Promise<Result<number[], Error>> {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.executeRead(
      async (db) => {
        const rows = await db
          .select({ bill_id: bill_engagement.bill_id })
          .from(bill_engagement)
          .where(gt(bill_engagement.lastEngaged, threshold))
          .groupBy(bill_engagement.bill_id)
          .orderBy(desc(sql`sum(${bill_engagement.engagement_score})`))
          .limit(limit);
        return rows.map(r => r.bill_id);
      },
      `recommendation:trending:${days}:${limit}`
    );
  }

  /*  ==========  Collaborative  ==========  */
  async getSimilarUserIds(user_id: string, interests: string[]): Promise<Result<string[], Error>> {
    if (!interests.length) return Ok([]);

    const minShared = Math.max(1, Math.floor(interests.length * 0.4));

    return this.executeRead(
      async (db) => {
        const rows = await db
          .select({
            user_id: user_interests.user_id,
            shared: sql<number>`count(distinct ${user_interests.interest})`,
          })
          .from(user_interests)
          .where(and(inArray(user_interests.interest, interests), sql`${user_interests.user_id} <> ${user_id}`))
          .groupBy(user_interests.user_id)
          .having(sql`count(distinct ${user_interests.interest}) >= ${minShared}`)
          .orderBy(desc(sql`count(distinct ${user_interests.interest})`))
          .limit(50);
        return rows.map(r => r.user_id);
      },
      `recommendation:similar:${user_id}`
    );
  }

  async getEngagementByUsers(user_ids: string[]): Promise<Result<Array<{ user_id: string; bill_id: number; score: number }>, Error>> {
    return this.executeRead(
      async (db) => {
        const rows = await db
          .select({
            user_id: bill_engagement.user_id,
            bill_id: bill_engagement.bill_id,
            score: bill_engagement.engagement_score,
          })
          .from(bill_engagement)
          .where(inArray(bill_engagement.user_id, user_ids));
        return rows.map(r => ({
          user_id: r.user_id,
          bill_id: r.bill_id as number,
          score: r.score ?? 0
        }));
      },
      `recommendation:engagement:${user_ids.slice(0, 3).join(',')}`
    );
  }

  /*  ==========  Engagement tracking – atomic upsert  ==========  */
  async upsertEngagement(user_id: string, bill_id: number, type: 'view' | 'comment' | 'share'): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        const existing = await tx
          .select()
          .from(bill_engagement)
          .where(and(eq(bill_engagement.user_id, user_id), eq(bill_engagement.bill_id, bill_id)))
          .limit(1);
        const now = new Date();
        if (existing.length) {
          const row = existing[0];
          const updates = {
            lastEngaged: now,
            updated_at: now,
            view_count: row.view_count ?? 0,
            comment_count: row.comment_count ?? 0,
            share_count: row.share_count ?? 0,
          };
          if (type === 'view') updates.view_count++;
          if (type === 'comment') updates.comment_count++;
          if (type === 'share') updates.share_count++;

          const updatesWithScore = {
            ...updates,
            engagement_score: this.calcScore(updates.view_count, updates.comment_count, updates.share_count)
          };

          await tx
            .update(bill_engagement)
            .set(updatesWithScore)
            .where(and(eq(bill_engagement.user_id, user_id), eq(bill_engagement.bill_id, bill_id)));
        } else {
          const view_count = type === 'view' ? 1 : 0;
          const comment_count = type === 'comment' ? 1 : 0;
          const share_count = type === 'share' ? 1 : 0;
          await tx.insert(bill_engagement).values({
            user_id,
            bill_id,
            view_count,
            comment_count,
            share_count,
            engagement_score: this.calcScore(view_count, comment_count, share_count),
            lastEngaged: now,
            created_at: now,
            updated_at: now,
          });
        }
      },
      [`recommendation:engaged:${user_id}`, `recommendation:trending:*`, `recommendation:engagement:*`]
    );
  }

  /*  ==========  Tag helpers  ==========  */
  async getTagsForBill(bill_id: number): Promise<Result<string[], Error>> {
    return this.executeRead(
      async (db) => {
        const rows = await db.select({ tag: bill_tags.tag }).from(bill_tags).where(eq(bill_tags.bill_id, bill_id));
        return rows.map(r => r.tag);
      },
      `recommendation:bill:tags:${bill_id}`
    );
  }

  /*  ----------  private  ----------  */
  private calcScore(v: number, c: number, s: number): number {
    const WEIGHTS = { VIEW: 0.1, COMMENT: 0.5, SHARE: 0.3 } as const;
    return v * WEIGHTS.VIEW + c * WEIGHTS.COMMENT + s * WEIGHTS.SHARE;
  }

  private toPlain(row: unknown): PlainBill {
    return { ...row };
  }
}









































