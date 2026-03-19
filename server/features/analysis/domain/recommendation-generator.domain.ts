/**
 * Recommendation Generator — Pure Domain Logic
 *
 * This module contains stateless, pure functions that generate human-readable
 * recommended actions based on analysis results. Extracted from the
 * BillComprehensiveAnalysisService orchestrator to honour single-responsibility:
 *
 *  - The orchestrator coordinates async pipelines.
 *  - This module owns the grading rubric and string generation.
 *
 * Because these functions are pure (no I/O, no database, no logger), they can
 * be unit-tested with zero mocks.
 */

import type { ConstitutionalAnalysisResult } from '@server/features/analysis/application/constitutional-analysis.service';
import type { StakeholderAnalysisResult } from '@server/features/analysis/application/stakeholder-analysis.service';
import type { TransparencyScoreResult } from '@server/features/analysis/application/transparency-analysis.service';
import type { ConflictSummary } from '@server/features/analysis/application/bill-comprehensive-analysis.service';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generates a prioritised list of recommended actions for a bill based on
 * the combined output of every analysis sub-service.
 *
 * The order of the returned actions reflects severity:
 *   1. Constitutional risks (highest priority)
 *   2. Conflict-of-interest risks
 *   3. Transparency deficiencies
 *   4. Negative economic / social impact
 */
export function generateRecommendedActions(
  constitutional: ConstitutionalAnalysisResult,
  conflict: ConflictSummary,
  stakeholder: StakeholderAnalysisResult,
  transparency: TransparencyScoreResult,
): string[] {
  const actions: string[] = [];

  // --- Constitutional -------------------------------------------------------
  if (constitutional.riskAssessment === 'high') {
    actions.push(
      'High constitutional risk detected. Recommend detailed legal review and possible amendment.',
    );
  } else if (constitutional.riskAssessment === 'medium') {
    actions.push(
      'Moderate constitutional concerns identified. Review flagged sections.',
    );
  }

  for (const c of constitutional.concerns) {
    if (c.severity === 'critical' || c.severity === 'major') {
      actions.push(
        `Address major/critical constitutional concern: ${c.concern} (${c.article})`,
      );
    }
  }

  // --- Conflict of Interest -------------------------------------------------
  if (conflict.overallRisk === 'critical') {
    actions.push(
      'Critical conflict of interest risk. Recommend sponsor recusal and independent ethics review.',
    );
  } else if (conflict.overallRisk === 'high') {
    actions.push(
      'High conflict of interest risk. Mandate full disclosure from affected sponsors and monitor closely.',
    );
  }

  if (conflict.directConflictCount > 0) {
    actions.push(
      `Address ${conflict.directConflictCount} direct financial conflict(s).`,
    );
  }

  // --- Transparency ---------------------------------------------------------
  if (transparency.grade === 'D' || transparency.grade === 'F') {
    actions.push(
      'Low transparency score. Increase public access to documents and process details.',
    );
  }

  if (transparency.breakdown.sponsorDisclosure < 60) {
    actions.push('Improve sponsor disclosure transparency.');
  }

  // --- Stakeholder & Economic Impact ----------------------------------------
  if (
    stakeholder.economicImpact.netImpact < 0 &&
    stakeholder.economicImpact.confidence > 60
  ) {
    actions.push(
      'Negative net economic impact projected. Re-evaluate economic assumptions or seek mitigation.',
    );
  }

  if (stakeholder.socialImpact.equityEffect < -30) {
    actions.push(
      'Potential negative equity impact identified. Review for fairness and consider amendments.',
    );
  }

  if (stakeholder.negativelyAffected.length > 0) {
    const names = stakeholder.negativelyAffected
      .slice(0, 3)
      .map((s) => s.name)
      .join(', ');
    actions.push(
      `Address concerns of negatively affected stakeholders: ${names}.`,
    );
  }

  // --- Fallback -------------------------------------------------------------
  if (actions.length === 0) {
    actions.push(
      'No immediate high-priority actions recommended based on automated analysis.',
    );
  }

  return actions;
}

/**
 * Calculates an overall confidence score (30–95) for the comprehensive
 * analysis based on the quality and risk signals from each sub-analysis.
 *
 * Deductions are applied for:
 *  - Each constitutional concern (−1.5 per concern)
 *  - Each affected sponsor (−1 per sponsor)
 *  - Low stakeholder economic-impact confidence (up to −20)
 *  - Low transparency score (−5 if below 50)
 */
export function calculateOverallConfidence(
  constitutional: ConstitutionalAnalysisResult,
  conflict: ConflictSummary,
  stakeholder: StakeholderAnalysisResult,
  transparency: TransparencyScoreResult,
): number {
  let confidence = 80;

  confidence -= constitutional.concerns.length * 1.5;
  confidence -= conflict.affectedSponsorsCount * 1;
  confidence -= (100 - stakeholder.economicImpact.confidence) * 0.2;
  confidence -= transparency.overall < 50 ? 5 : 0;

  return Math.max(30, Math.min(95, Math.round(confidence)));
}
