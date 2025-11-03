// Disclosure Processing Service
// Handles core data retrieval, enrichment, and basic processing operations

import {
  sponsors, sponsorTransparency, sponsorAffiliations
} from "@shared/foundation";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { readDatabase } from '@shared/database/connection';
import { cache, logger, NotFoundError, DatabaseError } from '@shared/core';
import { FinancialDisclosureConfig } from '../config';
import type {
  FinancialDisclosure,
  SponsorInfo,
  SponsorAffiliation
} from '../../types/index.js';

/**
 * Disclosure Processing Service
 * 
 * Responsible for:
 * - Core data retrieval and caching
 * - Data enrichment with calculated fields
 * - Basic sponsor information management
 * - Affiliation data processing
 */
export class DisclosureProcessingService {
  private readonly config = FinancialDisclosureConfig;

  /**
   * Retrieves financial disclosure data with enrichment and caching.
   * This method adds calculated fields like completeness scores and risk levels
   * to the raw database records, providing a foundation for further analysis.
   */
  async getDisclosureData(sponsor_id?: number): Promise<FinancialDisclosure[]> {
    try {
      const cacheKey = sponsor_id
        ? this.config.cache.keyPrefixes.disclosures(sponsor_id)
        : this.config.cache.keyPrefixes.allDisclosures();

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.disclosureData,
        async () => {
          // Build the query with optional sponsor filtering
          let query = readDatabase
            .select({
              id: sponsorTransparency.id,
              sponsor_id: sponsorTransparency.sponsor_id,
              disclosureType: sponsorTransparency.disclosureType,
              description: sponsorTransparency.description,
              amount: sponsorTransparency.amount,
              source: sponsorTransparency.source,
              dateReported: sponsorTransparency.dateReported,
              is_verified: sponsorTransparency.is_verified,
              created_at: sponsorTransparency.created_at
            })
            .from(sponsorTransparency)
            .innerJoin(sponsors, eq(sponsorTransparency.sponsor_id, sponsors.id));

          if (sponsor_id) {
            query = query.where(eq(sponsorTransparency.sponsor_id, sponsor_id));
          }

          const rawData = await query.orderBy(desc(sponsorTransparency.dateReported));

          // Transform each raw record into an enriched disclosure object
          return rawData.map(disclosure => this.enrichDisclosure(disclosure));
        }
      );
    } catch (error) {
      logger.error('Error retrieving disclosure data:', { sponsor_id }, error);
      throw new DatabaseError('Failed to retrieve disclosure data for analysis');
    }
  }

  /**
   * Retrieves basic sponsor information from the database.
   */
  async getSponsorBasicInfo(sponsor_id: number): Promise<SponsorInfo> {
    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsor_id);

    return await cache.getOrSetCache(
      cacheKey,
      this.config.cache.ttl.sponsorInfo,
      async () => {
        const result = await readDatabase
          .select({
            id: sponsors.id,
            name: sponsors.name,
            is_active: sponsors.is_active
          })
          .from(sponsors)
          .where(eq(sponsors.id, sponsor_id))
          .limit(1);

        if (!result.length) {
          throw new NotFoundError('Sponsor', sponsor_id.toString());
        }

        return result[0];
      }
    );
  }

  /**
   * Retrieves affiliation records for a sponsor from the database.
   */
  async getAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    try {
      return await readDatabase
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsor_id, sponsor_id));
    } catch (error) {
      logger.warn('Failed to fetch affiliations:', { sponsor_id, error });
      return [];
    }
  }

  /**
   * Retrieves basic statistics about active sponsors in the system.
   */
  async getSponsorStatistics() {
    const result = await readDatabase
      .select({ total: count() })
      .from(sponsors)
      .where(eq(sponsors.is_active, true));

    return { total: result[0]?.total || 0 };
  }

  /**
   * Gathers statistics about disclosure submissions, including counts by type
   * and verification status.
   */
  async getDisclosureStatistics() {
    const stats = await readDatabase
      .select({
        disclosureType: sponsorTransparency.disclosureType,
        total: count(),
        verified: sql<number>`SUM(CASE WHEN ${sponsorTransparency.is_verified} THEN 1 ELSE 0 END)`
      })
      .from(sponsorTransparency)
      .groupBy(sponsorTransparency.disclosureType);

    const byType: Record<string, number> = {};
    let totalCount = 0;
    let verifiedCount = 0;

    for (const stat of stats) {
      const typeTotal = stat.total || 0;
      const typeVerified = Number(stat.verified) || 0;

      byType[stat.disclosureType] = typeTotal;
      totalCount += typeTotal;
      verifiedCount += typeVerified;
    }

    return {
      total: totalCount,
      verified: verifiedCount,
      pending: totalCount - verifiedCount,
      byType
    };
  }

  /**
   * Enriches raw disclosure data with calculated fields for completeness
   * scoring and risk assessment.
   */
  private enrichDisclosure(raw: any): FinancialDisclosure {
    return {
      id: raw.id,
      sponsor_id: raw.sponsor_id,
      disclosureType: raw.disclosureType,
      description: raw.description || '',
      amount: raw.amount ? Number(raw.amount) : undefined,
      source: raw.source || undefined,
      dateReported: new Date(raw.dateReported),
      is_verified: Boolean(raw.is_verified),
      completenessScore: this.calculateIndividualCompletenessScore(raw),
      riskLevel: this.assessIndividualRiskLevel(raw),
      lastUpdated: new Date(raw.created_at || raw.dateReported)
    };
  }

  /**
   * Calculates a simple completeness score for an individual disclosure
   * based on presence of key fields.
   */
  private calculateIndividualCompletenessScore(disclosure: any): number {
    let score = 40; // Base score for having a disclosure
    if (disclosure.is_verified) score += 30;
    if (disclosure.amount) score += 20;
    if (disclosure.source) score += 10;
    return Math.min(score, 100);
  }

  /**
   * Assesses risk level for an individual disclosure based on amount
   * and verification status.
   */
  private assessIndividualRiskLevel(disclosure: any): FinancialDisclosure['riskLevel'] {
    const amount = Number(disclosure.amount) || 0;
    const verified = Boolean(disclosure.is_verified);

    // Unverified high-value disclosures are highest risk
    if (!verified && amount > 1_000_000) return 'critical';
    if (!verified && amount > 500_000) return 'high';
    if (amount > this.config.thresholds.income) return 'medium';
    return 'low';
  }

  /**
   * Finds the most recent disclosure date from a set of disclosures.
   */
  getLatestDisclosureDate(disclosures: FinancialDisclosure[]): Date {
    if (disclosures.length === 0) return new Date(0);
    return new Date(Math.max(...disclosures.map(d => d.dateReported.getTime())));
  }
}

export const disclosureProcessingService = new DisclosureProcessingService();