/**
 * Trojan Bill Detector - MWANGA Stack
 * 
 * Three-tier trojan bill detection:
 * - Tier 1: Python scoring engine (heuristics) (<1ms)
 * - Tier 2: spaCy structural analysis (~50ms)
 * - Tier 3: Ollama chain-of-thought (high-risk bills only) (~2s)
 */

import { BaseAnalyzer } from './base-analyzer';
import type {
  TrojanBillInput,
  TrojanBillResult,
  TrojanBillFinding,
  AnalysisTier,
} from './types';

// Risk thresholds for tier escalation
const RISK_THRESHOLDS = {
  HIGH_PAGE_COUNT: 100,
  HIGH_SCHEDULE_COUNT: 5,
  MIN_CONSULTATION_DAYS: 30,
  HIGH_AMENDMENT_COUNT: 20,
};

// Suspicious patterns for Tier 1
const SUSPICIOUS_PATTERNS = [
  {
    pattern: /minister\s+may\s+(?:\w+\s+){0,5}without\s+(?:\w+\s+){0,3}oversight/gi,
    type: 'urgency' as const,
    severity: 'high' as const,
    description: 'Grants excessive ministerial discretion without oversight',
  },
  {
    pattern: /notwithstanding\s+(?:any|the)\s+(?:\w+\s+){0,3}constitution/gi,
    type: 'structural' as const,
    severity: 'critical' as const,
    description: 'Overrides constitutional protections',
  },
  {
    pattern: /without\s+(?:\w+\s+){0,3}judicial\s+review/gi,
    type: 'structural' as const,
    severity: 'critical' as const,
    description: 'Removes judicial oversight mechanisms',
  },
  {
    pattern: /such\s+(?:\w+\s+){0,5}(?:minister|cabinet)\s+(?:\w+\s+){0,3}fit/gi,
    type: 'urgency' as const,
    severity: 'medium' as const,
    description: 'Vague language grants undefined powers',
  },
];

export class TrojanBillDetector extends BaseAnalyzer<
  TrojanBillInput,
  TrojanBillResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: TrojanBillInput,
    tier: AnalysisTier
  ): Promise<TrojanBillResult> {
    switch (tier) {
      case 'tier1':
        return this.analyzeTier1(input);
      case 'tier2':
        return this.analyzeTier2(input);
      case 'tier3':
        return this.analyzeTier3(input);
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Tier 1: Pure Python/TypeScript scoring engine
   * Fast heuristic-based detection
   */
  private async analyzeTier1(input: TrojanBillInput): Promise<TrojanBillResult> {
    const findings: TrojanBillFinding[] = [];
    let totalScore = 0;

    // 1. Page count analysis
    const pageCountScore = this.analyzePageCount(input.metadata.pageCount);
    if (pageCountScore > 0) {
      findings.push({
        type: 'structural',
        severity: pageCountScore > 0.7 ? 'high' : 'medium',
        description: `Unusually long bill (${input.metadata.pageCount} pages)`,
        evidence: `Page count exceeds threshold of ${RISK_THRESHOLDS.HIGH_PAGE_COUNT}`,
        score: pageCountScore,
      });
      totalScore += pageCountScore * 0.15; // 15% weight
    }

    // 2. Consultation period analysis
    const consultationScore = this.analyzeConsultationPeriod(
      input.metadata.consultationPeriodDays
    );
    if (consultationScore > 0) {
      findings.push({
        type: 'consultation',
        severity: consultationScore > 0.7 ? 'critical' : 'high',
        description: `Inadequate consultation period (${input.metadata.consultationPeriodDays} days)`,
        evidence: `Consultation period below minimum of ${RISK_THRESHOLDS.MIN_CONSULTATION_DAYS} days`,
        score: consultationScore,
      });
      totalScore += consultationScore * 0.20; // 20% weight
    }

    // 3. Schedule density analysis
    const scheduleScore = this.analyzeScheduleDensity(
      input.metadata.scheduleCount,
      input.metadata.pageCount
    );
    if (scheduleScore > 0) {
      findings.push({
        type: 'schedule',
        severity: scheduleScore > 0.7 ? 'high' : 'medium',
        description: `High schedule density (${input.metadata.scheduleCount} schedules)`,
        evidence: `Schedule count exceeds threshold of ${RISK_THRESHOLDS.HIGH_SCHEDULE_COUNT}`,
        score: scheduleScore,
      });
      totalScore += scheduleScore * 0.20; // 20% weight
    }

    // 4. Amendment complexity analysis
    const amendmentScore = this.analyzeAmendmentComplexity(
      input.metadata.amendmentCount
    );
    if (amendmentScore > 0) {
      findings.push({
        type: 'amendment',
        severity: amendmentScore > 0.7 ? 'high' : 'medium',
        description: `High amendment count (${input.metadata.amendmentCount} amendments)`,
        evidence: `Amendment count exceeds threshold of ${RISK_THRESHOLDS.HIGH_AMENDMENT_COUNT}`,
        score: amendmentScore,
      });
      totalScore += amendmentScore * 0.15; // 15% weight
    }

    // 5. Urgency manipulation analysis
    const urgencyScore = this.analyzeUrgencyManipulation(
      input.metadata.urgencyDesignation,
      input.metadata.submissionDate
    );
    if (urgencyScore > 0) {
      findings.push({
        type: 'urgency',
        severity: urgencyScore > 0.7 ? 'critical' : 'high',
        description: `Suspicious urgency designation: ${input.metadata.urgencyDesignation}`,
        evidence: 'Urgency designation may be used to bypass scrutiny',
        score: urgencyScore,
      });
      totalScore += urgencyScore * 0.30; // 30% weight
    }

    // 6. Pattern matching for suspicious language
    const patternFindings = this.detectSuspiciousPatterns(input.billText);
    findings.push(...patternFindings);
    const patternScore = patternFindings.reduce((sum, f) => sum + f.score, 0) / patternFindings.length || 0;
    totalScore += patternScore * 0.20; // 20% weight (if patterns found)

    // Normalize total score to 0-1 range
    const overallRiskScore = Math.min(totalScore, 1.0);

    // If risk is high, trigger Tier 2
    if (overallRiskScore > 0.6 && findings.length > 0) {
      throw new Error('Tier 1 detected high risk, escalating to Tier 2');
    }

    return {
      overallRiskScore,
      riskLevel: this.calculateRiskLevel(overallRiskScore),
      findings,
      structuralAnomalyScore: pageCountScore,
      urgencyManipulationScore: urgencyScore,
      consultationAdequacyScore: consultationScore,
      scheduleDensityScore: scheduleScore,
      amendmentComplexityScore: amendmentScore,
    };
  }

  /**
   * Tier 2: spaCy structural analysis
   * Analyzes bill structure, readability, cross-references
   */
  private async analyzeTier2(input: TrojanBillInput): Promise<TrojanBillResult> {
    // TODO: Implement spaCy integration
    console.log('Tier 2: Analyzing bill structure with spaCy...');

    // Get Tier 1 results as baseline
    const tier1Results = await this.analyzeTier1(input);

    // Simulate spaCy analysis
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Additional structural analysis
    const structuralFindings: TrojanBillFinding[] = [
      {
        type: 'structural',
        severity: 'medium',
        description: 'Section length variance detected',
        evidence: 'Some sections are 10x longer than others, suggesting buried provisions',
        score: 0.6,
      },
      {
        type: 'structural',
        severity: 'medium',
        description: 'High cross-reference density',
        evidence: 'Excessive cross-references make bill difficult to understand',
        score: 0.5,
      },
    ];

    const combinedFindings = [...tier1Results.findings, ...structuralFindings];
    const structuralScore = structuralFindings.reduce((sum, f) => sum + f.score, 0) / structuralFindings.length;

    const overallRiskScore = Math.min(
      (tier1Results.overallRiskScore + structuralScore) / 2,
      1.0
    );

    // If still high risk, trigger Tier 3
    if (overallRiskScore > 0.7) {
      throw new Error('Tier 2 detected critical risk, escalating to Tier 3');
    }

    return {
      ...tier1Results,
      overallRiskScore,
      riskLevel: this.calculateRiskLevel(overallRiskScore),
      findings: combinedFindings,
      structuralAnomalyScore: structuralScore,
    };
  }

  /**
   * Tier 3: Ollama chain-of-thought analysis
   * Deep analysis for high-risk bills
   */
  private async analyzeTier3(input: TrojanBillInput): Promise<TrojanBillResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Deep analysis with Ollama chain-of-thought...');

    // Get Tier 2 results as baseline
    const tier2Results = await this.analyzeTier2(input);

    const prompt = `You are a Kenyan legislative expert. Analyze this bill for hidden provisions and deceptive techniques.

Bill Title: ${input.billText.substring(0, 100)}
Bill ID: ${input.billId}
Page Count: ${input.metadata.pageCount}
Consultation Period: ${input.metadata.consultationPeriodDays} days
Urgency: ${input.metadata.urgencyDesignation}

Preliminary Findings:
${tier2Results.findings.map((f) => `- ${f.description} (${f.severity})`).join('\n')}

Bill Text (excerpt):
${input.billText.substring(0, 2000)}...

Provide:
1. Detailed analysis of suspicious provisions
2. Assessment of deception techniques used
3. Constitutional concerns
4. Recommendations for scrutiny

Respond in JSON format with findings array.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock deep analysis findings
    const deepFindings: TrojanBillFinding[] = [
      {
        type: 'structural',
        severity: 'critical',
        description: 'Hidden provision in Schedule 3 grants broad regulatory powers',
        evidence: 'Schedule 3, Section 12(b) allows minister to create regulations without parliamentary approval',
        score: 0.9,
      },
    ];

    return {
      ...tier2Results,
      findings: [...tier2Results.findings, ...deepFindings],
      overallRiskScore: Math.min(tier2Results.overallRiskScore + 0.1, 1.0),
      riskLevel: 'critical',
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(result: TrojanBillResult, tier: AnalysisTier): number {
    const baseConfidence = result.findings.length > 0 ? 0.8 : 0.5;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.2, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.8, 0.9);
  }

  // Helper methods for Tier 1 analysis

  private analyzePageCount(pageCount: number): number {
    if (pageCount <= RISK_THRESHOLDS.HIGH_PAGE_COUNT) return 0;
    return Math.min((pageCount - RISK_THRESHOLDS.HIGH_PAGE_COUNT) / 100, 1.0);
  }

  private analyzeConsultationPeriod(days: number): number {
    if (days >= RISK_THRESHOLDS.MIN_CONSULTATION_DAYS) return 0;
    return (RISK_THRESHOLDS.MIN_CONSULTATION_DAYS - days) / RISK_THRESHOLDS.MIN_CONSULTATION_DAYS;
  }

  private analyzeScheduleDensity(scheduleCount: number, pageCount: number): number {
    if (scheduleCount <= RISK_THRESHOLDS.HIGH_SCHEDULE_COUNT) return 0;
    const density = scheduleCount / pageCount;
    return Math.min(density * 10, 1.0);
  }

  private analyzeAmendmentComplexity(amendmentCount: number): number {
    if (amendmentCount <= RISK_THRESHOLDS.HIGH_AMENDMENT_COUNT) return 0;
    return Math.min((amendmentCount - RISK_THRESHOLDS.HIGH_AMENDMENT_COUNT) / 50, 1.0);
  }

  private analyzeUrgencyManipulation(
    urgency?: string,
    submissionDate?: Date
  ): number {
    if (!urgency) return 0;
    if (urgency === 'emergency' || urgency === 'urgent') return 0.8;
    return 0;
  }

  private detectSuspiciousPatterns(text: string): TrojanBillFinding[] {
    const findings: TrojanBillFinding[] = [];

    for (const pattern of SUSPICIOUS_PATTERNS) {
      const matches = text.match(pattern.pattern);
      if (matches && matches.length > 0) {
        findings.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          evidence: `Found ${matches.length} instance(s): "${matches[0].substring(0, 100)}..."`,
          score: pattern.severity === 'critical' ? 0.9 : pattern.severity === 'high' ? 0.7 : 0.5,
        });
      }
    }

    return findings;
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const trojanBillDetector = new TrojanBillDetector({
  enableCaching: true,
  cacheExpiryMs: 3600000, // 1 hour
  enableFallback: true,
});
