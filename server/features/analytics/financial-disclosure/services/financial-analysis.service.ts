// Financial Analysis Service
// Handles financial impact assessment, relationship mapping, and network analysis

import { cache, logger, DatabaseError  } from '@shared/core/src/index.js';
import { FinancialDisclosureConfig } from '../config';
import { disclosureProcessingService } from './disclosure-processing.service';
import type {
  FinancialDisclosure,
  FinancialRelationship,
  ConflictOfInterest,
  RelationshipMapping,
  SponsorAffiliation
} from '../../types/index.js';

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

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.relationshipMap,
        async () => {
          // Gather all relationship data sources in parallel
          const [sponsorInfo, disclosures, affiliations] = await Promise.all([
            disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
            disclosureProcessingService.getDisclosureData(sponsor_id),
            disclosureProcessingService.getAffiliations(sponsor_id)
          ]);

          // Build relationships from financial disclosures
          const disclosureRelationships = disclosures
            .filter(d => d.source && d.amount)
            .map(d => this.mapDisclosureToRelationship(sponsor_id, d));

          // Build relationships from organizational affiliations
          const affiliationRelationships = affiliations
            .map(a => this.mapAffiliationToRelationship(sponsor_id, a));

          // Combine and deduplicate to handle entities appearing in both sources
          const allRelationships = [...disclosureRelationships, ...affiliationRelationships];
          const uniqueRelationships = this.deduplicateRelationships(allRelationships);

          // Calculate total financial exposure across all relationships
          const totalFinancialExposure = uniqueRelationships.reduce(
            (sum, r) => sum + (r.financialValue || 0),
            0
          );

          // Detect potential conflicts of interest
          const detectedConflicts = this.detectConflictsOfInterest(uniqueRelationships);

          // Perform network analysis to understand relationship patterns
          const networkMetrics = this.calculateNetworkMetrics(
            uniqueRelationships,
            totalFinancialExposure
          );

          // Assess overall risk considering both exposure and conflicts
          const riskAssessment = this.assessOverallRisk(
            totalFinancialExposure,
            detectedConflicts
          );

          return {
            sponsor_id,
            sponsorName: sponsorInfo.name,
            relationships: uniqueRelationships,
            totalFinancialExposure,
            riskAssessment,
            detectedConflicts,
            networkMetrics,
            lastMappingUpdate: new Date()
          };
        }
      );
    } catch (error) {
      logger.error('Error building relationship map:', { sponsor_id }, error);
      throw new DatabaseError('Failed to build financial relationship map');
    }
  }

  /**
   * Detects conflicts of interest by analyzing relationship patterns.
   */
  private detectConflictsOfInterest(
    relationships: FinancialRelationship[]
  ): ConflictOfInterest[] {
    const conflicts: ConflictOfInterest[] = [];

    // Group relationships by entity to find overlapping connections
    const entityMap = new Map<string, FinancialRelationship[]>();
    for (const rel of relationships) {
      const key = rel.relatedEntity.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, []);
      }
      entityMap.get(key)!.push(rel);
    }

    // Analyze each entity for conflicting relationship types
    for (const [entity, rels] of Array.from(entityMap.entries())) {
      if (rels.length < 2) continue;

      // Check for ownership/business + investment conflicts
      const hasOwnership = rels.some(r =>
        r.relationshipType === 'ownership' || r.relationshipType === 'business_partner'
      );
      const hasInvestment = rels.some(r => r.relationshipType === 'investment');

      if (hasOwnership && hasInvestment) {
        const totalValue = rels.reduce((sum, r) => sum + (r.financialValue || 0), 0);

        conflicts.push({
          entity,
          severity: totalValue > 1_000_000 ? 'critical' : 'high',
          description: `Dual-role conflict: Sponsor has both ownership/business relationship and financial investment with '${entity}', creating potential for competing interests.`,
          relatedRelationships: rels,
          potentialImpact: totalValue > 1_000_000
            ? `High financial exposure (KSh ${totalValue.toLocaleString()}) amplifies conflict risk.`
            : `Moderate financial exposure may influence decision-making.`
        });
      }

      // Check for high-value employment + investment conflicts
      const hasEmployment = rels.some(r => r.relationshipType === 'employment');
      if (hasEmployment && hasInvestment) {
        const totalValue = rels.reduce((sum, r) => sum + (r.financialValue || 0), 0);
        const minConflictValue = this.config.analytics.conflictDetection.minimumConflictValue;

        if (totalValue > minConflictValue) {
          conflicts.push({
            entity,
            severity: 'medium',
            description: `Employment-investment overlap: Sponsor is both employed by and invested in '${entity}'.`,
            relatedRelationships: rels,
            potentialImpact: `Financial interest (KSh ${totalValue.toLocaleString()}) may affect employment decisions or vice versa.`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Calculates network metrics to understand relationship patterns and risk.
   */
  private calculateNetworkMetrics(
    relationships: FinancialRelationship[],
    totalExposure: number
  ) {
    // Centrality: measures how connected this sponsor is to other entities
    const relationshipCount = relationships.length;
    const avgStrength = relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.strength, 0) / relationships.length
      : 0;
    const centralityScore = Math.min((relationshipCount * 10) + avgStrength, 100);

    // Clustering: measures how interconnected the relationships are
    const strongRelationships = relationships.filter(r =>
      r.strength > this.config.analytics.networkMetrics.strongRelationshipThreshold
    ).length;
    const clusteringCoefficient = relationships.length > 0
      ? (strongRelationships / relationships.length) * 100
      : 0;

    // Risk Propagation: measures potential for risk to spread through network
    const criticalCount = relationships.filter(r => r.conflictPotential === 'critical').length;
    const highCount = relationships.filter(r => r.conflictPotential === 'high').length;
    const riskPropagation = Math.min((criticalCount * 30) + (highCount * 15), 100);

    // Risk Concentration: measures if financial exposure is concentrated or diversified
    const riskConcentration = this.calculateRiskConcentration(relationships, totalExposure);

    return {
      centralityScore: Math.round(centralityScore),
      clusteringCoefficient: Math.round(clusteringCoefficient),
      riskPropagation: Math.round(riskPropagation),
      riskConcentration: Math.round(riskConcentration)
    };
  }

  /**
   * Calculates risk concentration using a Herfindahl-Hirschman Index (HHI) approach.
   */
  private calculateRiskConcentration(
    relationships: FinancialRelationship[],
    totalExposure: number
  ): number {
    if (totalExposure === 0 || relationships.length === 0) return 0;

    // Calculate the sum of squared proportions (HHI)
    const hhi = relationships.reduce((sum, rel) => {
      const proportion = (rel.financialValue || 0) / totalExposure;
      return sum + (proportion * proportion);
    }, 0);

    // Convert HHI to a 0-100 scale
    return hhi * 100;
  }

  /**
   * Converts a financial disclosure into a relationship object for network analysis.
   */
  private mapDisclosureToRelationship(
    sponsor_id: number,
    disclosure: FinancialDisclosure
  ): FinancialRelationship {
    // Map disclosure types to relationship types
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      'financial': 'investment',
      'business': 'ownership',
      'investment': 'investment',
      'income': 'employment',
      'family': 'family',
      'debt': 'investment',
      'real_estate': 'ownership',
      'gifts': 'family'
    };

    return {
      sponsor_id,
      relatedEntity: disclosure.source!,
      relationshipType: typeMapping[disclosure.disclosureType] || 'investment',
      strength: this.calculateFinancialStrength(disclosure.amount || 0),
      financialValue: disclosure.amount,
      is_active: true,
      conflictPotential: disclosure.riskLevel
    };
  }

  /**
   * Converts an organizational affiliation into a relationship object.
   */
  private mapAffiliationToRelationship(
    sponsor_id: number,
    affiliation: SponsorAffiliation
  ): FinancialRelationship {
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      'economic': 'business_partner',
      'professional': 'employment',
      'ownership': 'ownership',
      'family': 'family'
    };

    return {
      sponsor_id,
      relatedEntity: affiliation.organization || 'Unknown Organization',
      relationshipType: typeMapping[affiliation.type] || 'business_partner',
      strength: this.calculateAffiliationStrength(affiliation),
      start_date: affiliation.start_date ? new Date(affiliation.start_date) : undefined,
      end_date: affiliation.end_date ? new Date(affiliation.end_date) : undefined,
      is_active: Boolean(affiliation.is_active),
      conflictPotential: this.assessAffiliationConflict(affiliation)
    };
  }

  /**
   * Calculates relationship strength based on financial value.
   */
  private calculateFinancialStrength(amount: number): number {
    if (amount >= 1_000_000) return 100;
    if (amount >= 500_000) return 80;
    if (amount >= 100_000) return 60;
    if (amount >= 50_000) return 40;
    return 20;
  }

  /**
   * Calculates relationship strength for affiliations based on
   * activity status and conflict indicators.
   */
  private calculateAffiliationStrength(affiliation: SponsorAffiliation): number {
    let strength = 50;
    if (affiliation.is_active) strength += 30;
    if (affiliation.conflictType) strength += 20;
    return Math.min(strength, 100);
  }

  /**
   * Assesses conflict potential for an affiliation relationship.
   */
  private assessAffiliationConflict(
    affiliation: SponsorAffiliation
  ): FinancialRelationship['conflictPotential'] {
    if (affiliation.conflictType === 'ownership') return 'critical';
    if (affiliation.conflictType === 'financial') return 'high';
    if (affiliation.type === 'economic') return 'medium';
    return 'low';
  }

  /**
   * Assesses overall relationship risk based on financial exposure and
   * detected conflicts of interest.
   */
  private assessOverallRisk(
    exposure: number,
    conflicts: ConflictOfInterest[]
  ): RelationshipMapping['riskAssessment'] {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const highConflicts = conflicts.filter(c => c.severity === 'high').length;
    const thresholds = this.config.riskThresholds.financial_exposure;

    // Critical conditions
    if (exposure > thresholds.high || criticalConflicts > 0) {
      return 'critical';
    }
    // High risk conditions
    if (exposure > thresholds.medium || highConflicts > 2) {
      return 'high';
    }
    // Medium risk conditions
    if (exposure > thresholds.low || highConflicts > 0) {
      return 'medium';
    }
    // Low risk
    return 'low';
  }

  /**
   * Deduplicates relationships that refer to the same entity, merging
   * their financial values and keeping the stronger connection.
   */
  private deduplicateRelationships(
    relationships: FinancialRelationship[]
  ): FinancialRelationship[] {
    const seen = new Map<string, FinancialRelationship>();

    for (const rel of relationships) {
      const key = `${rel.relatedEntity.toLowerCase()}_${rel.relationshipType}`;
      const existing = seen.get(key);

      if (!existing || rel.strength > existing.strength) {
        // If this is a duplicate, merge the financial values
        if (existing && existing.financialValue) {
          rel.financialValue = (rel.financialValue || 0) + existing.financialValue;
        }
        seen.set(key, rel);
      }
    }

    return Array.from(seen.values());
  }
}

export const financialAnalysisService = new FinancialAnalysisService();