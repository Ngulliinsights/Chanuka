// Disclosure Processing Service
// Handles core data retrieval, enrichment, and basic processing operations

import {
  sponsors, sponsorTransparency, sponsorAffiliations
} from "@shared/schema";
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
  async getDisclosureData(sponsorId?: number): Promise<FinancialDisclosure[]> {
    try {
      const cacheKey = sponsorId
        ? this.config.cache.keyPrefixes.disclosures(sponsorId)
        : this.config.cache.keyPrefixes.allDisclosures();

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.disclosureData,
        async () => {
          // Build the query with optional sponsor filtering
          let query = readDatabase
            .select({
              id: sponsorTransparency.id,
              sponsorId: sponsorTransparency.sponsorId,
              disclosureType: sponsorTransparency.disclosureType,
              description: sponsorTransparency.description,
              amount: sponsorTransparency.amount,
              source: sponsorTransparency.source,
              dateReported: sponsorTransparency.dateReported,
              isVerified: sponsorTransparency.isVerified,
              createdAt: sponsorTransparency.createdAt
            })
            .from(sponsorTransparency)
            .innerJoin(sponsors, eq(sponsorTransparency.sponsorId, sponsors.id));

          if (sponsorId) {
            query = query.where(eq(sponsorTransparency.sponsorId, sponsorId));
          }

          const rawData = await query.orderBy(desc(sponsorTransparency.dateReported));

          // Transform each raw record into an enriched disclosure object
          return rawData.map(disclosure => this.enrichDisclosure(disclosure));
        }
      );
    } catch (error) {
      logger.error('Error retrieving disclosure data:', { sponsorId }, error);
      throw new DatabaseError('Failed to retrieve disclosure data for analysis');
    }
  }

  /**
   * Retrieves basic sponsor information from the database.
   */
  async getSponsorBasicInfo(sponsorId: number): Promise<SponsorInfo> {
    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsorId);

    return await cache.getOrSetCache(
      cacheKey,
      this.config.cache.ttl.sponsorInfo,
      async () => {
        const result = await readDatabase
          .select({
            id: sponsors.id,
            name: sponsors.name,
            isActive: sponsors.isActive
          })
          .from(sponsors)
          .where(eq(sponsors.id, sponsorId))
          .limit(1);

        if (!result.length) {
          throw new NotFoundError('Sponsor', sponsorId.toString());
        }

        return result[0];
      }
    );
  }

  /**
   * Retrieves affiliation records for a sponsor from the database.
   */
  async getAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    try {
      return await readDatabase
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsorId, sponsorId));
    } catch (error) {
      logger.warn('Failed to fetch affiliations:', { sponsorId, error });
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
      .where(eq(sponsors.isActive, true));

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
        verified: sql<number>`SUM(CASE WHEN ${sponsorTransparency.isVerified} THEN 1 ELSE 0 END)`
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
      sponsorId: raw.sponsorId,
      disclosureType: raw.disclosureType,
      description: raw.description || '',
      amount: raw.amount ? Number(raw.amount) : undefined,
      source: raw.source || undefined,
      dateReported: new Date(raw.dateReported),
      isVerified: Boolean(raw.isVerified),
      completenessScore: this.calculateIndividualCompletenessScore(raw),
      riskLevel: this.assessIndividualRiskLevel(raw),
      lastUpdated: new Date(raw.createdAt || raw.dateReported)
    };
  }

  /**
   * Calculates a simple completeness score for an individual disclosure
   * based on presence of key fields.
   */
  private calculateIndividualCompletenessScore(disclosure: any): number {
    let score = 40; // Base score for having a disclosure
    if (disclosure.isVerified) score += 30;
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
    const verified = Boolean(disclosure.isVerified);

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