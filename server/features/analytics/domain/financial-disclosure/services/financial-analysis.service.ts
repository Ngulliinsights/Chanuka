// Financial Analysis Service
// Handles financial impact assessment, relationship mapping, and network analysis

import type {
  ConflictOfInterest,
  FinancialDisclosure,
  FinancialRelationship,
  RelationshipMapping,
  SponsorAffiliation,
} from '../types';
import { FinancialDisclosureConfig } from '../config';
import { createDatabaseError, createNotFoundError } from '@server/infrastructure/error-handling';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { disclosureProcessingService } from './disclosure-processing.service';

/**
 * Financial Analysis Service
 *
 * Responsible for:
 * - Financial impact assessment
 * - Relationship mapping and network analysis
 * - Conflict of interest detection
 * - Risk assessment based on financial exposure
 */
export class FinancialAnalysisService {
  private readonly config = FinancialDisclosureConfig;

  /**
   * Builds a comprehensive relationship map that reveals networks of financial
   * connections and potential conflicts of interest.
   */
  async buildRelationshipMap(sponsor_id: number): Promise<RelationshipMapping> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.relationships(sponsor_id);

      const cached = await cacheService.get<RelationshipMapping>(cacheKey);
      if (cached) return cached;

      const result = await (async () => {
          // Gather all relationship data sources in parallel.
          const [sponsorInfo, disclosures, affiliations] = await Promise.all([
            disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
            disclosureProcessingService.getDisclosureData(sponsor_id),
            disclosureProcessingService.getAffiliations(sponsor_id),
          ]);

          if (!sponsorInfo) {
            throw createNotFoundError(
              'Sponsor', String(sponsor_id),
              { service: 'financial-analysis', operation: 'buildRelationshipMap' },
            );
          }

          // Build relationships from financial disclosures.
          const disclosureRelationships = disclosures
            .filter((d): d is FinancialDisclosure & { source: string; amount: number } =>
              d.source != null && d.amount != null,
            )
            .map((d) => this.mapDisclosureToRelationship(sponsor_id, d));

          // Build relationships from organisational affiliations.
          const affiliationRelationships = affiliations.map((a) =>
            this.mapAffiliationToRelationship(sponsor_id, a),
          );

          // Combine and deduplicate to handle entities appearing in both sources.
          const uniqueRelationships = this.deduplicateRelationships([
            ...disclosureRelationships,
            ...affiliationRelationships,
          ]);

          // Calculate total financial exposure across all relationships.
          const totalFinancialExposure = uniqueRelationships.reduce(
            (sum, r) => sum + (r.financialValue ?? 0),
            0,
          );

          const detectedConflicts = this.detectConflictsOfInterest(uniqueRelationships);
          const networkMetrics = this.calculateNetworkMetrics(
            uniqueRelationships,
            totalFinancialExposure,
          );
          const riskAssessment = this.assessOverallRisk(totalFinancialExposure, detectedConflicts);

          return {
            sponsor_id,
            sponsorName: sponsorInfo.name,
            relationships: uniqueRelationships,
            totalFinancialExposure,
            riskAssessment,
            detectedConflicts,
            networkMetrics,
            lastMappingUpdate: new Date(),
          };
        })();

      await cacheService.set(cacheKey, result, this.config.cache.ttl.relationshipMap);
      return result;
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error building relationship map');
      throw createDatabaseError(
        'buildRelationshipMap',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'financial-analysis', operation: 'buildRelationshipMap' },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  /**
   * Detects conflicts of interest by analysing relationship patterns.
   * Looks for dual-role situations where a sponsor has overlapping relationship
   * types (e.g. ownership + investment, or employment + investment) with the
   * same external entity.
   */
  private detectConflictsOfInterest(
    relationships: FinancialRelationship[],
  ): ConflictOfInterest[] {
    const conflicts: ConflictOfInterest[] = [];

    // Group relationships by normalised entity name.
    const entityMap = new Map<string, FinancialRelationship[]>();
    for (const rel of relationships) {
      const key = rel.relatedEntity.toLowerCase();
      const group = entityMap.get(key) ?? [];
      group.push(rel);
      entityMap.set(key, group);
    }

    for (const [entity, rels] of entityMap) {
      if (rels.length < 2) continue;

      const hasOwnership = rels.some(
        (r) => r.relationshipType === 'ownership' || r.relationshipType === 'business_partner',
      );
      const hasInvestment = rels.some((r) => r.relationshipType === 'investment');
      const hasEmployment = rels.some((r) => r.relationshipType === 'employment');
      const totalValue = rels.reduce((sum, r) => sum + (r.financialValue ?? 0), 0);

      if (hasOwnership && hasInvestment) {
        conflicts.push({
          entity,
          severity: totalValue > 1_000_000 ? 'critical' : 'high',
          description: `Dual-role conflict: Sponsor has both ownership/business relationship and financial investment with '${entity}', creating potential for competing interests.`,
          relatedRelationships: rels,
          potentialImpact:
            totalValue > 1_000_000
              ? `High financial exposure (KSh ${totalValue.toLocaleString()}) amplifies conflict risk.`
              : 'Moderate financial exposure may influence decision-making.',
        });
      }

      if (hasEmployment && hasInvestment) {
        const minConflictValue = this.config.analytics.conflictDetection.minimumConflictValue;
        if (totalValue > minConflictValue) {
          conflicts.push({
            entity,
            severity: 'medium',
            description: `Employment-investment overlap: Sponsor is both employed by and invested in '${entity}'.`,
            relatedRelationships: rels,
            potentialImpact: `Financial interest (KSh ${totalValue.toLocaleString()}) may affect employment decisions or vice versa.`,
          });
        }
      }
    }

    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // Network Metrics
  // ---------------------------------------------------------------------------

  /** Calculates network metrics to understand relationship patterns and risk. */
  private calculateNetworkMetrics(
    relationships: FinancialRelationship[],
    totalExposure: number,
  ): RelationshipMapping['networkMetrics'] {
    const count = relationships.length;

    const avgStrength =
      count > 0 ? relationships.reduce((s, r) => s + r.strength, 0) / count : 0;

    const centralityScore = Math.min(count * 10 + avgStrength, 100);

    const strongRelationships = relationships.filter(
      (r) => r.strength > this.config.analytics.networkMetrics.strongRelationshipThreshold,
    ).length;
    const clusteringCoefficient = count > 0 ? (strongRelationships / count) * 100 : 0;

    const criticalCount = relationships.filter(
      (r) => r.conflictPotential === 'critical',
    ).length;
    const highCount = relationships.filter((r) => r.conflictPotential === 'high').length;
    const riskPropagation = Math.min(criticalCount * 30 + highCount * 15, 100);

    const riskConcentration = this.calculateRiskConcentration(relationships, totalExposure);

    return {
      centralityScore: Math.round(centralityScore),
      clusteringCoefficient: Math.round(clusteringCoefficient),
      riskPropagation: Math.round(riskPropagation),
      riskConcentration: Math.round(riskConcentration),
    };
  }

  /**
   * Calculates risk concentration using a Herfindahl-Hirschman Index (HHI) approach.
   * Returns a 0–100 score where 100 represents full concentration in one entity.
   */
  private calculateRiskConcentration(
    relationships: FinancialRelationship[],
    totalExposure: number,
  ): number {
    if (totalExposure === 0 || relationships.length === 0) return 0;

    const hhi = relationships.reduce((sum, rel) => {
      const proportion = (rel.financialValue ?? 0) / totalExposure;
      return sum + proportion * proportion;
    }, 0);

    return hhi * 100;
  }

  // ---------------------------------------------------------------------------
  // Risk Assessment
  // ---------------------------------------------------------------------------

  /**
   * Assesses overall relationship risk based on financial exposure and
   * detected conflicts of interest.
   */
  private assessOverallRisk(
    exposure: number,
    conflicts: ConflictOfInterest[],
  ): RelationshipMapping['riskAssessment'] {
    const criticalConflicts = conflicts.filter((c) => c.severity === 'critical').length;
    const highConflicts = conflicts.filter((c) => c.severity === 'high').length;
    const thresholds = this.config.riskThresholds.financial_exposure;

    if (exposure > thresholds.high || criticalConflicts > 0) return 'critical';
    if (exposure > thresholds.medium || highConflicts > 2) return 'high';
    if (exposure > thresholds.low || highConflicts > 0) return 'medium';
    return 'low';
  }

  // ---------------------------------------------------------------------------
  // Mapping Helpers
  // ---------------------------------------------------------------------------

  /** Converts a financial disclosure into a relationship object for network analysis. */
  private mapDisclosureToRelationship(
    sponsor_id: number,
    disclosure: FinancialDisclosure,
  ): FinancialRelationship {
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      financial: 'investment',
      business: 'ownership',
      investment: 'investment',
      income: 'employment',
      family: 'family',
      debt: 'investment',
      real_estate: 'ownership',
      gifts: 'family',
    };

    return {
      sponsor_id,
      relatedEntity: disclosure.source!,
      relationshipType: typeMapping[disclosure.disclosureType] ?? 'investment',
      strength: this.calculateFinancialStrength(disclosure.amount ?? 0),
      financialValue: disclosure.amount,
      is_active: true,
      conflictPotential: disclosure.riskLevel,
    };
  }

  /** Converts an organisational affiliation into a relationship object. */
  private mapAffiliationToRelationship(
    sponsor_id: number,
    affiliation: SponsorAffiliation,
  ): FinancialRelationship {
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      economic: 'business_partner',
      professional: 'employment',
      ownership: 'ownership',
      family: 'family',
    };

    return {
      sponsor_id,
      relatedEntity: affiliation.organization || 'Unknown Organization',
      relationshipType: typeMapping[affiliation.type] ?? 'business_partner',
      strength: this.calculateAffiliationStrength(affiliation),
      start_date: affiliation.start_date ? new Date(affiliation.start_date) : undefined,
      end_date: affiliation.end_date ? new Date(affiliation.end_date) : undefined,
      is_active: Boolean(affiliation.is_active),
      conflictPotential: this.assessAffiliationConflict(affiliation),
    };
  }

  /** Scores relationship strength (0–100) based on disclosed financial value. */
  private calculateFinancialStrength(amount: number): number {
    if (amount >= 1_000_000) return 100;
    if (amount >= 500_000) return 80;
    if (amount >= 100_000) return 60;
    if (amount >= 50_000) return 40;
    return 20;
  }

  /**
   * Scores affiliation strength (0–100) based on activity status and conflict
   * indicators. Active affiliations with known conflict types score highest.
   */
  private calculateAffiliationStrength(affiliation: SponsorAffiliation): number {
    let strength = 50;
    if (affiliation.is_active) strength += 30;
    if (affiliation.conflictType) strength += 20;
    return Math.min(strength, 100);
  }

  /** Maps affiliation conflict type to a risk tier. */
  private assessAffiliationConflict(
    affiliation: SponsorAffiliation,
  ): FinancialRelationship['conflictPotential'] {
    if (affiliation.conflictType === 'ownership') return 'critical';
    if (affiliation.conflictType === 'financial') return 'high';
    if (affiliation.type === 'economic') return 'medium';
    return 'low';
  }

  // ---------------------------------------------------------------------------
  // Deduplication
  // ---------------------------------------------------------------------------

  /**
   * Deduplicates relationships that refer to the same entity and type.
   * When a duplicate is found, the record with the higher strength wins and
   * the financial values are summed.
   */
  private deduplicateRelationships(
    relationships: FinancialRelationship[],
  ): FinancialRelationship[] {
    const seen = new Map<string, FinancialRelationship>();

    for (const rel of relationships) {
      const key = `${rel.relatedEntity.toLowerCase()}_${rel.relationshipType}`;
      const existing = seen.get(key);

      if (!existing || rel.strength > existing.strength) {
        if (existing?.financialValue) {
          rel.financialValue = (rel.financialValue ?? 0) + existing.financialValue;
        }
        seen.set(key, rel);
      }
    }

    return Array.from(seen.values());
  }
}

export const financialAnalysisService = new FinancialAnalysisService();