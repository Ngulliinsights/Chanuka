/**
 * Electoral Accountability Cache Service
 * 
 * Caching layer for expensive electoral accountability queries
 */

import { cacheFactory } from '@server/infrastructure/cache/cache-factory';
import { CACHE_TTL, CACHE_TAGS } from '../domain/electoral-accountability.constants';
import { logger } from '@server/infrastructure/observability';
import type {
  VotingRecord,
  RepresentativeGapAnalysis,
} from '@server/infrastructure/schema/electoral_accountability';

export class ElectoralAccountabilityCacheService {
  private cache = cacheFactory.createCache('electoral-accountability');

  // ============================================================================
  // MP SCORECARD CACHING
  // ============================================================================

  /**
   * Get cached MP scorecard
   */
  async getMPScorecard(
    sponsorId: string,
    constituency: string
  ): Promise<any | null> {
    const key = this.getScorecardKey(sponsorId, constituency);
    
    try {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.debug({ sponsorId, constituency }, 'MP scorecard cache hit');
      }
      return cached;
    } catch (error) {
      logger.error({ error, sponsorId, constituency }, 'Failed to get cached scorecard');
      return null;
    }
  }

  /**
   * Cache MP scorecard
   */
  async setMPScorecard(
    sponsorId: string,
    constituency: string,
    scorecard: any
  ): Promise<void> {
    const key = this.getScorecardKey(sponsorId, constituency);
    
    try {
      await this.cache.set(key, scorecard, {
        ttl: CACHE_TTL.MP_SCORECARD,
        tags: [
          CACHE_TAGS.ELECTORAL_ACCOUNTABILITY,
          CACHE_TAGS.SCORECARDS,
          `sponsor:${sponsorId}`,
          `constituency:${constituency}`,
        ],
      });
      
      logger.debug({ sponsorId, constituency }, 'MP scorecard cached');
    } catch (error) {
      logger.error({ error, sponsorId, constituency }, 'Failed to cache scorecard');
    }
  }

  /**
   * Invalidate MP scorecard cache
   */
  async invalidateMPScorecard(sponsorId: string, constituency: string): Promise<void> {
    const key = this.getScorecardKey(sponsorId, constituency);
    
    try {
      await this.cache.delete(key);
      logger.debug({ sponsorId, constituency }, 'MP scorecard cache invalidated');
    } catch (error) {
      logger.error({ error, sponsorId, constituency }, 'Failed to invalidate scorecard cache');
    }
  }

  // ============================================================================
  // CRITICAL GAPS CACHING
  // ============================================================================

  /**
   * Get cached critical gaps
   */
  async getCriticalGaps(
    constituency?: string,
    sponsorId?: string,
    minRiskScore?: number
  ): Promise<RepresentativeGapAnalysis[] | null> {
    const key = this.getCriticalGapsKey(constituency, sponsorId, minRiskScore);
    
    try {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.debug({ constituency, sponsorId, minRiskScore }, 'Critical gaps cache hit');
      }
      return cached;
    } catch (error) {
      logger.error({ error, constituency, sponsorId }, 'Failed to get cached critical gaps');
      return null;
    }
  }

  /**
   * Cache critical gaps
   */
  async setCriticalGaps(
    gaps: RepresentativeGapAnalysis[],
    constituency?: string,
    sponsorId?: string,
    minRiskScore?: number
  ): Promise<void> {
    const key = this.getCriticalGapsKey(constituency, sponsorId, minRiskScore);
    const tags = [CACHE_TAGS.ELECTORAL_ACCOUNTABILITY, CACHE_TAGS.GAP_ANALYSIS];
    
    if (constituency) tags.push(`constituency:${constituency}`);
    if (sponsorId) tags.push(`sponsor:${sponsorId}`);
    
    try {
      await this.cache.set(key, gaps, {
        ttl: CACHE_TTL.CRITICAL_GAPS,
        tags,
      });
      
      logger.debug({ constituency, sponsorId, count: gaps.length }, 'Critical gaps cached');
    } catch (error) {
      logger.error({ error, constituency, sponsorId }, 'Failed to cache critical gaps');
    }
  }

  // ============================================================================
  // VOTING RECORDS CACHING
  // ============================================================================

  /**
   * Get cached voting records
   */
  async getVotingRecords(
    sponsorId: string,
    constituency?: string
  ): Promise<VotingRecord[] | null> {
    const key = this.getVotingRecordsKey(sponsorId, constituency);
    
    try {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.debug({ sponsorId, constituency }, 'Voting records cache hit');
      }
      return cached;
    } catch (error) {
      logger.error({ error, sponsorId, constituency }, 'Failed to get cached voting records');
      return null;
    }
  }

  /**
   * Cache voting records
   */
  async setVotingRecords(
    records: VotingRecord[],
    sponsorId: string,
    constituency?: string
  ): Promise<void> {
    const key = this.getVotingRecordsKey(sponsorId, constituency);
    const tags = [
      CACHE_TAGS.ELECTORAL_ACCOUNTABILITY,
      CACHE_TAGS.VOTING_RECORDS,
      `sponsor:${sponsorId}`,
    ];
    
    if (constituency) tags.push(`constituency:${constituency}`);
    
    try {
      await this.cache.set(key, records, {
        ttl: CACHE_TTL.VOTING_RECORD,
        tags,
      });
      
      logger.debug({ sponsorId, constituency, count: records.length }, 'Voting records cached');
    } catch (error) {
      logger.error({ error, sponsorId, constituency }, 'Failed to cache voting records');
    }
  }

  // ============================================================================
  // CACHE INVALIDATION
  // ============================================================================

  /**
   * Invalidate all caches for a sponsor
   */
  async invalidateSponsorCaches(sponsorId: string): Promise<void> {
    try {
      await this.cache.deleteByTag(`sponsor:${sponsorId}`);
      logger.info({ sponsorId }, 'Sponsor caches invalidated');
    } catch (error) {
      logger.error({ error, sponsorId }, 'Failed to invalidate sponsor caches');
    }
  }

  /**
   * Invalidate all caches for a constituency
   */
  async invalidateConstituencyCaches(constituency: string): Promise<void> {
    try {
      await this.cache.deleteByTag(`constituency:${constituency}`);
      logger.info({ constituency }, 'Constituency caches invalidated');
    } catch (error) {
      logger.error({ error, constituency }, 'Failed to invalidate constituency caches');
    }
  }

  /**
   * Invalidate all electoral accountability caches
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.cache.deleteByTag(CACHE_TAGS.ELECTORAL_ACCOUNTABILITY);
      logger.info({ component: 'server' }, 'All electoral accountability caches invalidated');
    } catch (error) {
      logger.error({ error }, 'Failed to invalidate all caches');
    }
  }

  /**
   * Invalidate caches when voting record is created/updated
   */
  async onVotingRecordChanged(
    sponsorId: string,
    constituency: string,
    billId: string
  ): Promise<void> {
    try {
      // Invalidate sponsor-specific caches
      await this.invalidateSponsorCaches(sponsorId);
      
      // Invalidate constituency-specific caches
      await this.invalidateConstituencyCaches(constituency);
      
      logger.info(
        { sponsorId, constituency, billId },
        'Caches invalidated after voting record change'
      );
    } catch (error) {
      logger.error(
        { error, sponsorId, constituency, billId },
        'Failed to invalidate caches after voting record change'
      );
    }
  }

  /**
   * Invalidate caches when gap analysis is created/updated
   */
  async onGapAnalysisChanged(
    sponsorId: string,
    constituency: string
  ): Promise<void> {
    try {
      // Invalidate critical gaps caches
      await this.cache.deleteByTag(CACHE_TAGS.GAP_ANALYSIS);
      
      // Invalidate sponsor and constituency caches
      await this.invalidateSponsorCaches(sponsorId);
      await this.invalidateConstituencyCaches(constituency);
      
      logger.info(
        { sponsorId, constituency },
        'Caches invalidated after gap analysis change'
      );
    } catch (error) {
      logger.error(
        { error, sponsorId, constituency },
        'Failed to invalidate caches after gap analysis change'
      );
    }
  }

  // ============================================================================
  // CACHE KEY GENERATORS
  // ============================================================================

  private getScorecardKey(sponsorId: string, constituency: string): string {
    return `scorecard:${sponsorId}:${constituency}`;
  }

  private getCriticalGapsKey(
    constituency?: string,
    sponsorId?: string,
    minRiskScore?: number
  ): string {
    const parts = ['critical-gaps'];
    if (constituency) parts.push(`c:${constituency}`);
    if (sponsorId) parts.push(`s:${sponsorId}`);
    if (minRiskScore) parts.push(`r:${minRiskScore}`);
    return parts.join(':');
  }

  private getVotingRecordsKey(sponsorId: string, constituency?: string): string {
    const parts = ['voting-records', sponsorId];
    if (constituency) parts.push(constituency);
    return parts.join(':');
  }
}

export const electoralAccountabilityCacheService = new ElectoralAccountabilityCacheService();
