// Disclosure Processing Service
// Handles core data retrieval, enrichment, and basic processing operations

import type { FinancialDisclosure, SponsorAffiliation, SponsorInfo } from '../types';
import { FinancialDisclosureConfig } from '../config';
import { createDatabaseError } from '@server/infrastructure/error-handling';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { readDb as readDatabase } from '@server/infrastructure/database';
import { sponsors, sponsorAffiliations, sponsorTransparency } from '@server/infrastructure/schema';
import { count, desc, eq, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Shape returned directly by the disclosure SELECT query. */
type RawDisclosureRow = {
  id: number;
  sponsor_id: number;
  disclosureType: string;
  description: string | null;
  amount: string | null;
  source: string | null;
  dateReported: string;
  is_verified: boolean;
  created_at: string | null;
};

type DisclosureStatRow = {
  disclosureType: string;
  total: number;
  verified: number;
};

// Completeness score weights — must sum to 100.
const SCORE_WEIGHTS = {
  base: 40,
  verified: 30,
  amount: 20,
  source: 10,
} as const satisfies Record<string, number>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Responsible for:
 * - Core data retrieval and caching
 * - Data enrichment with calculated fields
 * - Basic sponsor information management
 * - Affiliation data processing
 */
export class DisclosureProcessingService {
  private readonly config = FinancialDisclosureConfig;

  /**
   * Retrieves financial disclosures, enriching each record with a completeness
   * score and risk level. Results are cached per sponsor (or globally when no
   * sponsor_id is supplied).
   */
  async getDisclosureData(sponsorId?: number): Promise<FinancialDisclosure[]> {
    const cacheKey = sponsorId
      ? this.config.cache.keyPrefixes.disclosures(sponsorId)
      : this.config.cache.keyPrefixes.allDisclosures();

    const cached = await cacheService.get<FinancialDisclosure[]>(cacheKey);
    if (cached) return cached;

    try {
      const query = readDatabase
        .select({
          id: sponsorTransparency.id,
          sponsor_id: sponsorTransparency.sponsor_id,
          disclosureType: sponsorTransparency.disclosureType,
          description: sponsorTransparency.description,
          amount: sponsorTransparency.amount,
          source: sponsorTransparency.source,
          dateReported: sponsorTransparency.dateReported,
          is_verified: sponsorTransparency.is_verified,
          created_at: sponsorTransparency.created_at,
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsor_id, sponsors.id))
        .orderBy(desc(sponsorTransparency.dateReported));

      const rows = (await (sponsorId
        ? query.where(eq(sponsorTransparency.sponsor_id, sponsorId))
        : query
      )) as RawDisclosureRow[];

      const result = rows.map((row) => this.enrichDisclosure(row));
      await cacheService.set(cacheKey, result, this.config.cache.ttl.disclosureData);
      return result;
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to retrieve disclosure data');
      throw createDatabaseError(
        'getDisclosureData',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'disclosure-processing', operation: 'getDisclosureData' },
      );
    }
  }

  /**
   * Returns basic sponsor info from cache or database.
   * Returns null (rather than throwing) when the sponsor does not exist or
   * on transient read failures, so callers can degrade gracefully.
   */
  async getSponsorBasicInfo(sponsorId: number): Promise<SponsorInfo | null> {
    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsorId);

    const cached = await cacheService.get<SponsorInfo>(cacheKey);
    if (cached) return cached;

    try {
      const [row] = await readDatabase
        .select({ id: sponsors.id, name: sponsors.name, is_active: sponsors.is_active })
        .from(sponsors)
        .where(eq(sponsors.id, sponsorId))
        .limit(1);

      if (!row) return null;

      const sponsorInfo = row as SponsorInfo;
      await cacheService.set(cacheKey, sponsorInfo, this.config.cache.ttl.sponsorInfo);
      return sponsorInfo;
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to fetch sponsor basic info');
      return null;
    }
  }

  /**
   * Returns affiliation records for the given sponsor.
   * Returns an empty array on failure so the caller is not blocked.
   */
  async getAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    const cacheKey = this.config.cache.keyPrefixes.affiliations(sponsorId);

    const cached = await cacheService.get<SponsorAffiliation[]>(cacheKey);
    if (cached) return cached;

    try {
      const rows = (await readDatabase
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsor_id, sponsorId))) as SponsorAffiliation[];

      await cacheService.set(cacheKey, rows, this.config.cache.ttl.affiliationData);
      return rows;
    } catch (error) {
      logger.warn({ sponsorId, error }, 'Failed to fetch affiliations');
      return [];
    }
  }

  /** Returns the total number of active sponsors. */
  async getSponsorStatistics(): Promise<{ total: number }> {
    const cacheKey = this.config.cache.keyPrefixes.sponsorStats();

    const cached = await cacheService.get<{ total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const [row] = await readDatabase
        .select({ total: count() })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      const result = { total: row?.total ?? 0 };
      await cacheService.set(cacheKey, result, this.config.cache.ttl.statistics);
      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch sponsor statistics');
      throw createDatabaseError(
        'getSponsorStatistics',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'disclosure-processing', operation: 'getSponsorStatistics' },
      );
    }
  }

  /**
   * Returns disclosure counts broken down by type and verification status.
   */
  async getDisclosureStatistics(): Promise<{
    total: number;
    verified: number;
    pending: number;
    byType: Record<string, number>;
  }> {
    const cacheKey = this.config.cache.keyPrefixes.disclosureStats();

    const cached = await cacheService.get<Awaited<ReturnType<typeof this.getDisclosureStatistics>>>(cacheKey);
    if (cached) return cached;

    try {
      const stats = (await readDatabase
        .select({
          disclosureType: sponsorTransparency.disclosureType,
          total: count(),
          verified: sql<number>`SUM(CASE WHEN ${sponsorTransparency.is_verified} = true THEN 1 ELSE 0 END)`,
        })
        .from(sponsorTransparency)
        .groupBy(sponsorTransparency.disclosureType)) as DisclosureStatRow[];

      const byType: Record<string, number> = {};
      let totalCount = 0;
      let verifiedCount = 0;

      for (const { disclosureType, total, verified } of stats) {
        byType[disclosureType] = total;
        totalCount += total;
        verifiedCount += Number(verified) || 0;
      }

      const result = {
        total: totalCount,
        verified: verifiedCount,
        pending: totalCount - verifiedCount,
        byType,
      };

      await cacheService.set(cacheKey, result, this.config.cache.ttl.statistics);
      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch disclosure statistics');
      throw createDatabaseError(
        'getDisclosureStatistics',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'disclosure-processing', operation: 'getDisclosureStatistics' },
      );
    }
  }

  /**
   * Returns the most recent dateReported across a set of disclosures.
   * Returns the epoch when the array is empty so callers always get a valid Date.
   *
   * Uses reduce rather than spread + Math.max to avoid a stack overflow when
   * disclosures is very large.
   */
  getLatestDisclosureDate(disclosures: FinancialDisclosure[]): Date {
    if (!disclosures.length) return new Date(0);

    const latestMs = disclosures.reduce(
      (max, d) => Math.max(max, d.dateReported.getTime()),
      0,
    );

    return new Date(latestMs);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Converts a raw DB row into a fully enriched FinancialDisclosure. */
  private enrichDisclosure(raw: RawDisclosureRow): FinancialDisclosure {
    // Parse once; reused for both dateReported and lastUpdated fallback.
    const reportedDate = new Date(raw.dateReported);

    return {
      id: raw.id,
      sponsor_id: raw.sponsor_id,
      disclosureType: raw.disclosureType,
      description: raw.description ?? '',
      amount: raw.amount != null ? Number(raw.amount) : undefined,
      source: raw.source ?? undefined,
      dateReported: reportedDate,
      is_verified: Boolean(raw.is_verified),
      completenessScore: this.calculateCompletenessScore(raw),
      riskLevel: this.assessRiskLevel(raw),
      lastUpdated: raw.created_at ? new Date(raw.created_at) : reportedDate,
    };
  }

  /**
   * Scores a single disclosure 0–100 based on the presence of key fields.
   *
   * Weight breakdown (must sum to 100):
   *   40 — base existence
   *   30 — verified
   *   20 — amount present
   *   10 — source present
   *
   * The result is clamped to [0, 100] to stay correct if weights are adjusted.
   */
  private calculateCompletenessScore(raw: RawDisclosureRow): number {
    let score = SCORE_WEIGHTS.base;
    if (raw.is_verified) score += SCORE_WEIGHTS.verified;
    if (raw.amount != null) score += SCORE_WEIGHTS.amount;
    if (raw.source != null) score += SCORE_WEIGHTS.source;
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Assigns a risk tier based on verification status and declared amount.
   * Unverified high-value disclosures carry the highest risk.
   *
   * Tiers:
   *   critical — unverified AND amount > 1 000 000
   *   high     — unverified AND amount > 500 000
   *   medium   — amount exceeds configured income threshold
   *   low      — everything else
   */
  private assessRiskLevel(raw: RawDisclosureRow): FinancialDisclosure['riskLevel'] {
    const amount = raw.amount != null && !isNaN(Number(raw.amount)) ? Number(raw.amount) : 0;
    const verified = Boolean(raw.is_verified);

    if (!verified && amount > 1_000_000) return 'critical';
    if (!verified && amount > 500_000) return 'high';
    if (amount > this.config.thresholds.income) return 'medium';
    return 'low';
  }
}

export const disclosureProcessingService = new DisclosureProcessingService();