/**
 * Analytics Service (Engagement Metrics)
 *
 * Responsibilities:
 *  - Track per-entity engagement events (views, shares, downloads).
 *  - Aggregate engagement summaries with period-over-period trend deltas.
 *  - Build per-user engagement profiles.
 *  - Surface top content ranked by a composite engagement score.
 *  - Expose a lightweight real-time activity window.
 *
 * Caching strategy: cache-aside via `cacheService`.
 *  - General metrics:  5-minute TTL.
 *  - Real-time window: 30-second TTL.
 *  - Invalidated on every write that touches the affected entity.
 */

import { Result, Ok, Err } from '@shared/core/primitives/types/result';
import { logger } from '@server/infrastructure/observability';
import { readDb as readDatabase, withTransaction } from '@server/infrastructure/database';
import { bills, comments, bill_engagement } from '@server/infrastructure/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
// TimePeriod is a runtime enum — must be a value import, not `import type`.
import { TimePeriod } from '@shared/types/api/contracts/analytics.contracts';
import type {
  EngagementMetrics,
  EngagementSummary,
  UserEngagementProfile,
  TrackEngagementRequest,
  EngagementEntityType,
  EngagementEventType,
  EngagementMetadata,
  BillId,
  UserId,
} from '@shared/types/api/contracts/analytics.contracts';
import { cacheService } from '@server/infrastructure/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

type TxResult<T> = Result<T, Error>;

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * `cpu` and `memory` are intentionally nullable: they require an external
 * infrastructure metrics source that is not yet wired up.
 * Callers must handle `null` before rendering these values.
 */
interface SystemLoad {
  cpu: number | null;
  memory: number | null;
  requests: number;
}

interface RealTimeMetrics {
  activeUsers: number;
  currentSessions: number;
  topPages: Array<{ path: string; activeUsers: number }>;
  recentEvents: Array<{
    eventType: EngagementEventType;
    entityId: string;
    timestamp: string;
  }>;
  systemLoad: SystemLoad;
}

interface TopContentItem {
  entityId: string;
  entityType: EngagementEntityType;
  title: string;
  metrics: { views: number; engagement: number; score: number };
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

/** Row shape returned by the engagement aggregate query. */
interface EngagementAggRow {
  views: number;
  shares: number;
  downloads: number;
  uniqueUsers: number;
  comments: number;
  votes: number;
}

/** Row shape returned by the top-content query. */
interface TopContentRow {
  billId: string;
  title: string;
  views: number;
  comments: number;
  votes: number;
  shares: number;
}

/** Row shape returned by the real-time events query. */
interface RecentEventRow {
  eventType: string;
  entityId: string;
  timestamp: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'analytics';
const CACHE_TTL = 300;          // 5 minutes — general metrics
const REALTIME_CACHE_TTL = 30;  // 30 seconds — real-time window
const REALTIME_WINDOW_MS = 5 * 60 * 1_000;
const MAX_TOP_CONTENT = 100;

/**
 * Composite engagement score weights.
 * Centralised so ORDER BY and client-side score calculation stay in sync.
 */
const SCORE_WEIGHTS = {
  view:    1,
  comment: 5,
  share:   3,
  vote:    2,
} as const;

// ─── Shared column definitions ────────────────────────────────────────────────

/** Aggregate columns reused across entity-level queries. */
const engagementAggCols = {
  views:       sql<number>`COALESCE(SUM(${bill_engagement.viewCount}),     0)::int`,
  shares:      sql<number>`COALESCE(SUM(${bill_engagement.shareCount}),    0)::int`,
  downloads:   sql<number>`COALESCE(SUM(${bill_engagement.downloadCount}), 0)::int`,
  uniqueUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.userId})::int`,
};

/**
 * Composite score expression for ORDER BY.
 * Weights are inlined as literals so the DB can use them in the execution plan.
 * Must remain consistent with `computeScore()` below.
 */
const scoreOrderExpr = sql`
  COALESCE(SUM(${bill_engagement.viewCount}),  0) * ${SCORE_WEIGHTS.view}
  + COUNT(DISTINCT ${comments.id})             * ${SCORE_WEIGHTS.comment}
  + COALESCE(SUM(${bill_engagement.shareCount}), 0) * ${SCORE_WEIGHTS.share}
`;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Converts an unknown catch value to a guaranteed `Error`. */
function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Computes the composite engagement score from raw row values.
 * Must remain consistent with `scoreOrderExpr` above.
 */
function computeScore(row: Pick<TopContentRow, 'views' | 'comments' | 'shares' | 'votes'>): number {
  return (
    row.views    * SCORE_WEIGHTS.view    +
    row.comments * SCORE_WEIGHTS.comment +
    row.shares   * SCORE_WEIGHTS.share   +
    row.votes    * SCORE_WEIGHTS.vote
  );
}

/**
 * Fills in required `EngagementMetadata` defaults without an unsafe cast.
 * Caller-supplied values always win via the spread.
 * Only `source` is included because `campaign` and `medium` are not part
 * of the `EngagementMetadata` contract type.
 */
function resolveMetadata(partial?: Partial<EngagementMetadata>): EngagementMetadata {
  const defaults: EngagementMetadata = { source: '' };
  return { ...defaults, ...partial };
}

/**
 * Brand-cast helpers — used at service boundaries where the DB or request
 * layer gives us a plain `string` that the contracts expect as a branded ID.
 * The single source of truth for the brand shape lives in analytics.contracts.
 */
function asBillId(id: string): BillId { return id as unknown as BillId; }
function asUserId(id: string): UserId { return id as unknown as UserId; }

function getStartDateForPeriod(period: TimePeriod, endDate: Date): Date {
  const start = new Date(endDate);

  switch (period) {
    case TimePeriod.HOUR:     start.setHours(start.getHours()       - 1); break;
    case TimePeriod.DAY:      start.setDate(start.getDate()         - 1); break;
    case TimePeriod.WEEK:     start.setDate(start.getDate()         - 7); break;
    case TimePeriod.MONTH:    start.setMonth(start.getMonth()       - 1); break;
    case TimePeriod.QUARTER:  start.setMonth(start.getMonth()       - 3); break;
    case TimePeriod.YEAR:     start.setFullYear(start.getFullYear() - 1); break;
    case TimePeriod.ALL_TIME: start.setFullYear(2020);                    break;
  }

  return start;
}

/** Returns the current and previous `DateRange` for a given period. */
function resolveDateRanges(
  period: TimePeriod,
  dateFrom?: string,
  dateTo?: string,
): { current: DateRange; previous: DateRange } {
  const endDate   = dateTo   ? new Date(dateTo)   : new Date();
  const startDate = dateFrom ? new Date(dateFrom) : getStartDateForPeriod(period, endDate);
  const prevStart = getStartDateForPeriod(period, startDate);

  return {
    current:  { startDate, endDate },
    previous: { startDate: prevStart, endDate: startDate },
  };
}

function pctChange(current: number, previous: number): number {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

/**
 * Generic cache-aside wrapper.
 * Returns the cached value when present; otherwise runs `fn`, stores the
 * result, and returns it.
 */
async function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const cached = await cacheService.get<T>(key);
  if (cached !== null && cached !== undefined) return cached;

  const value = await fn();
  await cacheService.set(key, value, ttl);
  return value;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AnalyticsService {

  // ── Engagement Tracking ────────────────────────────────────────────────────

  async trackEngagement(
    data: TrackEngagementRequest,
    userId?: string,
  ): Promise<Result<EngagementMetrics, Error>> {
    try {
      return await withTransaction<TxResult<EngagementMetrics>>(async (tx) => {
        const now      = new Date();
        const metadata = resolveMetadata(data.metadata);

        const [inserted] = await tx
          .insert(bill_engagement)
          .values({
            billId:        data.entityId,
            userId:        userId ?? null,
            eventType:     data.eventType,
            metadata,
            createdAt:     now,
            viewCount:     data.eventType === 'view'     ? 1 : 0,
            shareCount:    data.eventType === 'share'    ? 1 : 0,
            downloadCount: data.eventType === 'download' ? 1 : 0,
          })
          .returning();

        if (userId) {
          logger.info(
            {
              action:       'engagement_tracked',
              userId,
              resourceType: data.entityType,
              resourceId:   data.entityId,
              metadata:     { eventType: data.eventType },
            },
            'User engagement tracked',
          );
        }

        await this.invalidateEngagementCaches(data.entityId, data.entityType);

        return new Ok<EngagementMetrics>({
          id:         inserted.id,
          entityId:   asBillId(data.entityId),
          entityType: data.entityType,
          userId:     userId ? asUserId(userId) : undefined,
          eventType:  data.eventType,
          metadata,
          timestamp:  now.toISOString(),
          duration:   data.duration,
          value:      data.value,
        });
      });
    } catch (err) {
      logger.error({ error: toError(err).message }, 'Failed to track engagement');
      return new Err(new Error('Failed to track engagement'));
    }
  }

  // ── Engagement Summary ─────────────────────────────────────────────────────

  async getEngagementSummary(
    entityId: string,
    entityType: EngagementEntityType,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Result<EngagementSummary, Error>> {
    const cacheKey = `${CACHE_PREFIX}:summary:${entityType}:${entityId}:${period}:${dateFrom ?? ''}:${dateTo ?? ''}`;

    try {
      const summary = await withCache<EngagementSummary>(cacheKey, CACHE_TTL, async () => {
        const { current, previous } = resolveDateRanges(period, dateFrom, dateTo);

        /**
         * Date filters are pushed into each join condition so counts are
         * scoped to the requested period and never inflate across all time.
         */
        const fetchMetrics = async (range: DateRange): Promise<EngagementAggRow> => {
          const [row] = await readDatabase
            .select({
              ...engagementAggCols,
              comments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
              votes:    sql<number>`0::int`,
            })
            .from(bill_engagement)
            .leftJoin(
              comments,
              and(
                eq(comments.billId, bill_engagement.billId),
                gte(comments.createdAt, range.startDate),
                lte(comments.createdAt, range.endDate),
              ),
            )
            .where(
              and(
                eq(bill_engagement.billId, entityId),
                gte(bill_engagement.createdAt, range.startDate),
                lte(bill_engagement.createdAt, range.endDate),
              ),
            );

          return row as EngagementAggRow;
        };

        const [metrics, prevMetrics] = await Promise.all([
          fetchMetrics(current),
          fetchMetrics(previous),
        ]);

        const totalEngagements = metrics.views + metrics.comments + metrics.shares;
        const engagementRate   = metrics.uniqueUsers > 0
          ? totalEngagements / metrics.uniqueUsers
          : 0;

        /**
         * Comment-to-view ratio: fraction of sessions that progressed beyond
         * a passive view. Not a standard web bounce rate — rename if the
         * definition diverges from product expectations.
         */
        const commentToViewRatio = metrics.views > 0
          ? metrics.comments / metrics.views
          : 0;

        return {
          entityId:   asBillId(entityId),
          entityType,
          period,
          metrics: {
            views:          metrics.views,
            uniqueViews:    metrics.uniqueUsers,
            comments:       metrics.comments,
            shares:         metrics.shares,
            votes:          metrics.votes,
            downloads:      metrics.downloads,
            timeSpent:      0,   // TODO: derive from session duration data
            bounceRate:     commentToViewRatio,
            engagementRate,
          },
          trends: {
            viewsChange:    pctChange(metrics.views,    prevMetrics.views),
            commentsChange: pctChange(metrics.comments, prevMetrics.comments),
            sharesChange:   pctChange(metrics.shares,   prevMetrics.shares),
            votesChange:    pctChange(metrics.votes,    prevMetrics.votes),
          },
          topSources: [], // TODO: implement source tracking
        } satisfies EngagementSummary;
      });

      return new Ok<EngagementSummary>(summary);
    } catch (err) {
      logger.error({ error: toError(err).message, entityId }, 'Failed to get engagement summary');
      return new Err(new Error('Failed to retrieve engagement summary'));
    }
  }

  // ── User Engagement Profile ────────────────────────────────────────────────

  async getUserEngagementProfile(
    userId: string,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Result<UserEngagementProfile, Error>> {
    const cacheKey = `${CACHE_PREFIX}:user:${userId}:${period}:${dateFrom ?? ''}:${dateTo ?? ''}`;

    try {
      const profile = await withCache<UserEngagementProfile>(cacheKey, CACHE_TTL, async () => {
        const { current } = resolveDateRanges(period, dateFrom, dateTo);

        // Fetch engagement and comments in separate queries to avoid join
        // fan-out that would inflate aggregate counts.
        const [engagementRow] = await readDatabase
          .select({
            totalSessions:   sql<number>`COUNT(DISTINCT ${bill_engagement.sessionId})::int`,
            totalTimeSpent:  sql<number>`COALESCE(SUM(${bill_engagement.viewCount}), 0)::int`,
            billsViewed:     sql<number>`COUNT(DISTINCT ${bill_engagement.billId})::int`,
            sharesPerformed: sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`,
          })
          .from(bill_engagement)
          .where(
            and(
              eq(bill_engagement.userId, userId),
              gte(bill_engagement.createdAt, current.startDate),
              lte(bill_engagement.createdAt, current.endDate),
            ),
          );

        const [commentsRow] = await readDatabase
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(comments)
          .where(
            and(
              eq(comments.userId, userId),
              gte(comments.createdAt, current.startDate),
              lte(comments.createdAt, current.endDate),
            ),
          );

        const safeEngagement = engagementRow ?? {
          totalSessions:   0,
          totalTimeSpent:  0,
          billsViewed:     0,
          sharesPerformed: 0,
        };

        const commentsPosted = commentsRow?.count ?? 0;
        const votesGiven     = 0; // TODO: wire to votes table

        const averageSessionDuration =
          safeEngagement.totalSessions > 0
            ? safeEngagement.totalTimeSpent / safeEngagement.totalSessions
            : 0;

        const engagementScore =
          commentsPosted                 * SCORE_WEIGHTS.comment +
          safeEngagement.sharesPerformed * SCORE_WEIGHTS.share   +
          safeEngagement.billsViewed     * SCORE_WEIGHTS.view;

        return {
          userId:  asUserId(userId),
          period,
          totalSessions:         safeEngagement.totalSessions,
          totalTimeSpent:        safeEngagement.totalTimeSpent,
          averageSessionDuration,
          billsViewed:           safeEngagement.billsViewed,
          commentsPosted,
          votesGiven,
          sharesPerformed:       safeEngagement.sharesPerformed,
          engagementScore,
          interests:       [], // TODO: implement interest detection
          activityPattern: [], // TODO: implement activity pattern analysis
        } satisfies UserEngagementProfile;
      });

      return new Ok<UserEngagementProfile>(profile);
    } catch (err) {
      logger.error({ error: toError(err).message, userId }, 'Failed to get user engagement profile');
      return new Err(new Error('Failed to retrieve user engagement profile'));
    }
  }

  // ── Top Content ────────────────────────────────────────────────────────────

  async getTopContent(params: {
    entityType?: EngagementEntityType;
    period: TimePeriod;
    metric?: 'views' | 'engagement' | 'shares' | 'comments';
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Result<TopContentItem[], Error>> {
    const cacheKey = `${CACHE_PREFIX}:top-content:${JSON.stringify(params)}`;

    try {
      const topContent = await withCache<TopContentItem[]>(cacheKey, CACHE_TTL, async () => {
        const { current } = resolveDateRanges(params.period, params.dateFrom, params.dateTo);
        const limit       = Math.min(params.limit ?? 10, MAX_TOP_CONTENT);

        const rows = await readDatabase
          .select({
            billId:   bills.id,
            title:    bills.title,
            views:    sql<number>`COALESCE(SUM(${bill_engagement.viewCount}),  0)::int`,
            comments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
            votes:    sql<number>`0::int`,
            shares:   sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`,
          })
          .from(bills)
          .leftJoin(
            bill_engagement,
            and(
              eq(bill_engagement.billId, bills.id),
              gte(bill_engagement.createdAt, current.startDate),
              lte(bill_engagement.createdAt, current.endDate),
            ),
          )
          .leftJoin(
            comments,
            and(
              eq(comments.billId, bills.id),
              gte(comments.createdAt, current.startDate),
              lte(comments.createdAt, current.endDate),
            ),
          )
          .groupBy(bills.id, bills.title)
          // `scoreOrderExpr` mirrors `computeScore()` — keep them in sync.
          .orderBy(desc(scoreOrderExpr))
          .limit(limit) as TopContentRow[];

        return rows.map((item): TopContentItem => ({
          entityId:   item.billId,
          entityType: 'bill' as EngagementEntityType,
          title:      item.title,
          metrics: {
            views:      item.views,
            engagement: item.comments + item.shares,
            score:      computeScore(item),
          },
          trend:            'stable',
          changePercentage: 0, // TODO: calculate actual change vs previous period
        }));
      });

      return new Ok<TopContentItem[]>(topContent);
    } catch (err) {
      logger.error({ error: toError(err).message }, 'Failed to get top content');
      return new Err(new Error('Failed to retrieve top content'));
    }
  }

  // ── Real-Time Metrics ──────────────────────────────────────────────────────

  async getRealTimeMetrics(): Promise<Result<RealTimeMetrics, Error>> {
    const cacheKey = `${CACHE_PREFIX}:realtime`;

    try {
      const metrics = await withCache<RealTimeMetrics>(cacheKey, REALTIME_CACHE_TTL, async () => {
        const windowStart = new Date(Date.now() - REALTIME_WINDOW_MS);

        const [activityRows, recentEventRows] = await Promise.all([
          readDatabase
            .select({
              activeUsers:  sql<number>`COUNT(DISTINCT ${bill_engagement.userId})::int`,
              requestCount: sql<number>`COUNT(*)::int`,
            })
            .from(bill_engagement)
            .where(gte(bill_engagement.createdAt, windowStart)),

          readDatabase
            .select({
              eventType: bill_engagement.eventType,
              entityId:  bill_engagement.billId,
              timestamp: bill_engagement.createdAt,
            })
            .from(bill_engagement)
            .where(gte(bill_engagement.createdAt, windowStart))
            .orderBy(desc(bill_engagement.createdAt))
            .limit(10),
        ]);

        const activityRow = activityRows[0] ?? { activeUsers: 0, requestCount: 0 };

        return {
          activeUsers:     activityRow.activeUsers,
          // currentSessions mirrors activeUsers until a session store is wired.
          currentSessions: activityRow.activeUsers,
          topPages:        [], // TODO: implement page tracking
          recentEvents: (recentEventRows as RecentEventRow[]).map((event) => ({
            eventType: event.eventType as EngagementEventType,
            entityId:  event.entityId,
            timestamp: event.timestamp.toISOString(),
          })),
          systemLoad: {
            // cpu and memory require an external infra metrics source.
            // They are typed as `number | null` — callers must handle null.
            cpu:      null,
            memory:   null,
            requests: activityRow.requestCount,
          },
        };
      });

      return new Ok<RealTimeMetrics>(metrics);
    } catch (err) {
      logger.error({ error: toError(err).message }, 'Failed to get real-time metrics');
      return new Err(new Error('Failed to retrieve real-time metrics'));
    }
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private async invalidateEngagementCaches(
    entityId: string,
    entityType: string,
  ): Promise<void> {
    if (!cacheService.invalidateByPattern) {
      logger.warn(
        { entityId, entityType },
        'Cache invalidation skipped: invalidateByPattern is not implemented',
      );
      return;
    }

    const patterns = [
      `${CACHE_PREFIX}:summary:${entityType}:${entityId}:*`,
      `${CACHE_PREFIX}:top-content:*`,
      `${CACHE_PREFIX}:realtime`,
    ];

    await Promise.all(patterns.map((pattern) => cacheService.invalidateByPattern!(pattern)));
  }
}

export const analyticsService = new AnalyticsService();