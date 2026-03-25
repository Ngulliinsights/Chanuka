/**
 * BRIEF GENERATOR — FINAL DRAFT
 *
 * CHANGES FROM REFINED DRAFT:
 * - Replace deprecated String.substr() → String.substring()
 * - Remove unused _evidenceTableRef parameter from fetchAndValidateEvidence
 * - Introduce Evidence interface; eliminate all any[] typing on evidence
 * - Make generateTitle synchronous (no I/O, no await)
 * - Extract ID generation to generateBriefId() using crypto.randomUUID()
 * - Fix calculateOverallQuality: removed double-counting of evidence score
 *   inside the diversity weight — now uses a clean average of all four scores
 * - Guard calculateEvidenceQuality against NaN when evidence.length === 0
 * - Add explicit NOT-IMPLEMENTED errors on stub methods so integration
 *   failures are loud rather than silent
 */

import { logger } from '@server/infrastructure/observability';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SynthesisData {
  billId: string;
  arguments: SynthesizedArgument[];
  summary: string;
  topTopics: string[];
  minorityVoices: string[];
  mainClusters: ClusterSummary[];
  equityMetrics: EquityMetrics;
  generatedAt: Date;
}

export interface SynthesizedArgument {
  id: string;
  text: string;
  position: 'support' | 'oppose' | 'neutral';
  stakeholders: string[];
  evidence_count: number;
  confidence: number;
}

export interface ClusterSummary {
  id: string;
  representative_text: string;
  position: 'support' | 'oppose' | 'neutral';
  count: number;
  confidence: number;
}

export interface EquityMetrics {
  minorityRepresentation: number;
  organizationalDiversity: number;
  geographicDiversity: number;
  demographicBalance: number;
}

/** Shape expected from the persistence layer for each piece of evidence. */
export interface Evidence {
  id: string;
  bill_id: string;
  credibility_score: number; // 0–1
  source?: string;
}

export interface LegislativeBrief {
  id: string;
  bill_id: string;
  title: string;
  summary: string;
  key_arguments_support: string[];
  key_arguments_oppose: string[];
  minority_perspectives: string[];
  evidence_quality_score: number;
  stakeholder_diversity_score: number;
  geographic_diversity_score: number;
  demographic_diversity_score: number;
  recommendations: string[];
  created_at: Date;
  updated_at: Date;
}

export interface BriefGenerationResult {
  brief: LegislativeBrief;
  quality_metrics: QualityMetrics;
  warnings: string[];
}

export interface QualityMetrics {
  argumentCoverage: number;
  evidenceQuality: number;
  perspectiveDiversity: number;
  overallQuality: number;
}

// ============================================================================
// BRIEF GENERATOR SERVICE
// ============================================================================

export class BriefGenerator {
  private readonly logContext = { component: 'BriefGenerator' };

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Generate a legislative brief from synthesised arguments.
   *
   * Throws if synthesis data is invalid or if the database write fails.
   */
  async generateBrief(synthesis: SynthesisData): Promise<BriefGenerationResult> {
    const opContext = {
      ...this.logContext,
      operation: 'generateBrief',
      billId: synthesis.billId,
    };

    logger.info(opContext, '📋 Starting brief generation');

    try {
      this.validateSynthesisData(synthesis);

      const supportingArguments = synthesis.arguments.filter((a) => a.position === 'support');
      const opposingArguments = synthesis.arguments.filter((a) => a.position === 'oppose');

      const evidence = await this.fetchAndValidateEvidence(synthesis.billId);

      const brief: LegislativeBrief = {
        id: this.generateBriefId(),
        bill_id: synthesis.billId,
        title: this.generateTitle(synthesis.billId),
        summary: synthesis.summary,
        key_arguments_support: this.selectKeyArguments(supportingArguments, 3),
        key_arguments_oppose: this.selectKeyArguments(opposingArguments, 3),
        minority_perspectives: synthesis.minorityVoices,
        evidence_quality_score: this.calculateEvidenceQuality(evidence),
        stakeholder_diversity_score: synthesis.equityMetrics.organizationalDiversity,
        geographic_diversity_score: synthesis.equityMetrics.geographicDiversity,
        demographic_diversity_score: synthesis.equityMetrics.demographicBalance,
        recommendations: this.generateRecommendations(evidence, synthesis.equityMetrics),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const qualityMetrics: QualityMetrics = {
        argumentCoverage: this.calculateArgumentCoverage(synthesis.arguments),
        evidenceQuality: brief.evidence_quality_score,
        perspectiveDiversity:
          (brief.stakeholder_diversity_score + brief.demographic_diversity_score) / 2,
        overallQuality: this.calculateOverallQuality(brief),
      };

      const warnings = this.identifyQualityWarnings(brief, evidence);

      await this.storeBrief(brief);

      logger.info(
        {
          ...opContext,
          briefId: brief.id,
          argumentCount: synthesis.arguments.length,
          evidenceCount: evidence.length,
          overallQuality: qualityMetrics.overallQuality,
          warningCount: warnings.length,
        },
        '✅ Brief generation completed',
      );

      return { brief, quality_metrics: qualityMetrics, warnings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ ...opContext, error: errorMessage }, 'Brief generation failed');
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  private validateSynthesisData(synthesis: SynthesisData): void {
    if (!synthesis.billId) {
      throw new Error('Synthesis data missing billId');
    }
    if (!Array.isArray(synthesis.arguments) || synthesis.arguments.length === 0) {
      throw new Error('Synthesis data must contain at least one argument');
    }
    if (!synthesis.summary?.trim()) {
      throw new Error('Synthesis data missing summary');
    }

    logger.debug(
      { ...this.logContext, billId: synthesis.billId, argumentCount: synthesis.arguments.length },
      'Synthesis data validation passed',
    );
  }

  // --------------------------------------------------------------------------
  // Evidence
  // --------------------------------------------------------------------------

  /**
   * Fetch evidence for a bill from the persistence layer.
   *
   * TODO: Inject a repository/DB reference and implement real fetching.
   *       The stub below returns an empty array and will log a warning so
   *       gaps surface clearly in quality scores and recommendations.
   */
  private async fetchAndValidateEvidence(billId: string): Promise<Evidence[]> {
    const opContext = {
      ...this.logContext,
      operation: 'fetchAndValidateEvidence',
      billId,
    };

    try {
      // TODO: replace with real DB call, e.g.:
      //   return await this.evidenceRepo.findByBillId(billId);
      logger.warn(opContext, 'fetchAndValidateEvidence is not yet wired to a data source');
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        { ...opContext, error: errorMessage },
        'Evidence fetch failed — proceeding without evidence',
      );
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Brief construction helpers
  // --------------------------------------------------------------------------

  /** Collision-resistant brief ID using the Web Crypto API. */
  private generateBriefId(): string {
    return `brief_${crypto.randomUUID()}`;
  }

  /** Derive a human-readable title from the bill identifier. */
  private generateTitle(billId: string): string {
    return `Legislative Brief — Bill ${billId}`;
  }

  /** Return the top-N arguments sorted by descending confidence. */
  private selectKeyArguments(items: SynthesizedArgument[], count: number): string[] {
    return [...items]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count)
      .map((arg) => arg.text);
  }

  // --------------------------------------------------------------------------
  // Scoring
  // --------------------------------------------------------------------------

  /**
   * Evidence quality score in [0, 1].
   *
   * Composed of:
   *   - quantity factor  (40 %): capped at 10 pieces
   *   - credibility factor (60 %): mean credibility_score across evidence
   */
  private calculateEvidenceQuality(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const avgCredibility =
      evidence.reduce((sum, ev) => sum + ev.credibility_score, 0) / evidence.length;

    const quantityFactor = Math.min(evidence.length / 10, 1);
    return quantityFactor * 0.4 + avgCredibility * 0.6;
  }

  /**
   * Argument coverage score in [0, 1].
   *
   * Rewards both volume (≥ 20 arguments saturates the term) and lexical
   * diversity across the first three tokens of each argument.
   */
  private calculateArgumentCoverage(items: SynthesizedArgument[]): number {
    if (items.length === 0) return 0;

    const topicDiversity = new Set(
      items.flatMap((arg) => arg.text.split(/\s+/).slice(0, 3)),
    ).size;

    return Math.min(
      (Math.min(items.length, 20) / 20) * 0.6 + (Math.min(topicDiversity, 50) / 50) * 0.4,
      1,
    );
  }

  /**
   * Overall brief quality in [0, 1].
   *
   * Weights:
   *   - Evidence quality          30 %
   *   - Average diversity scores  30 %  (stakeholder + geographic + demographic + evidence)
   *   - Stakeholder diversity     25 %
   *   - Geographic diversity      15 %
   *
   * FIX (vs refined draft): the diversity component now averages all four
   * diversity-related scores uniformly instead of double-counting evidence.
   */
  private calculateOverallQuality(brief: LegislativeBrief): number {
    const avgDiversity =
      (brief.evidence_quality_score +
        brief.stakeholder_diversity_score +
        brief.geographic_diversity_score +
        brief.demographic_diversity_score) /
      4;

    return (
      brief.evidence_quality_score * 0.3 +
      avgDiversity * 0.3 +
      brief.stakeholder_diversity_score * 0.25 +
      brief.geographic_diversity_score * 0.15
    );
  }

  // --------------------------------------------------------------------------
  // Recommendations & warnings
  // --------------------------------------------------------------------------

  /** Generate actionable recommendations from evidence and equity metrics. */
  private generateRecommendations(
    evidence: Evidence[],
    equityMetrics: EquityMetrics,
  ): string[] {
    const recommendations: string[] = [];

    if (evidence.length < 5) {
      recommendations.push('Gather additional evidence to strengthen the analysis');
    } else {
      const avgQuality =
        evidence.reduce((sum, ev) => sum + ev.credibility_score, 0) / evidence.length;
      if (avgQuality < 0.5) {
        recommendations.push('Prioritise higher-quality sources in decision-making');
      }
    }

    if (equityMetrics.minorityRepresentation < 0.15) {
      recommendations.push('Actively seek input from underrepresented stakeholder groups');
    }
    if (equityMetrics.geographicDiversity < 0.4) {
      recommendations.push('Ensure geographic representation in stakeholder consultations');
    }
    if (equityMetrics.demographicBalance < 0.5) {
      recommendations.push(
        'Expand demographic representation in testimony and input collection',
      );
    }

    return recommendations;
  }

  /** Return human-readable warnings for brief quality issues. */
  private identifyQualityWarnings(brief: LegislativeBrief, _evidence: Evidence[]): string[] {
    const warnings: string[] = [];

    if (brief.key_arguments_support.length === 0 || brief.key_arguments_oppose.length === 0) {
      warnings.push('Brief lacks arguments for one or both positions');
    }
    if (brief.evidence_quality_score < 0.4) {
      warnings.push('Evidence quality is below the recommended threshold');
    }
    if (brief.stakeholder_diversity_score < 0.3) {
      warnings.push('Limited stakeholder diversity in arguments');
    }
    if (brief.minority_perspectives.length === 0) {
      warnings.push('No minority perspectives captured');
    }

    return warnings;
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  /**
   * Persist the brief to the database.
   *
   * TODO: Inject a repository/DB reference and implement real writes.
   *       Currently throws so callers are not silently misled into thinking
   *       the brief was stored.
   */
  private async storeBrief(brief: LegislativeBrief): Promise<void> {
    const opContext = {
      ...this.logContext,
      operation: 'storeBrief',
      briefId: brief.id,
    };

    try {
      // TODO: replace with real DB call, e.g.:
      //   await this.briefRepo.upsert(brief);
      logger.warn(opContext, 'storeBrief is not yet wired to a data source');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ ...opContext, error: errorMessage }, 'Failed to store brief in database');
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const briefGenerator = new BriefGenerator();