/**
 * Transparency Analyzer - MWANGA Stack
 * 
 * Three-tier transparency assessment:
 * - Tier 1: Dimension scoring with rules (<5ms)
 * - Tier 2: Statistical benchmarking (~50ms)
 * - Tier 3: Ollama strategic recommendations (~1s)
 * 
 * Purpose: Score transparency across 5 dimensions (accessibility, completeness,
 * timeliness, participation, accountability) for bills, MPs, and processes.
 */

import { BaseAnalyzer } from './base-analyzer';
import type { AnalysisTier } from './types';

// ============================================================================
// Types
// ============================================================================

export interface TransparencyAnalysisInput {
  entityType: 'bill' | 'sponsor' | 'process' | 'institution';
  entityId: string;
  
  assessmentData: {
    billData?: {
      hasPublicDrafts: boolean;
      consultationPeriod: number; // days
      publicHearings: number;
      amendmentHistory: Array<{
        date: string;
        description: string;
        isPublic: boolean;
      }>;
      votingRecord: {
        isPublic: boolean;
        individualVotes: boolean;
      };
      impactAssessment: {
        exists: boolean;
        isPublic: boolean;
        quality?: 'poor' | 'fair' | 'good' | 'excellent';
      };
    };
    
    sponsorData?: {
      financialDisclosures: {
        hasDisclosures: boolean;
        completeness: 'none' | 'partial' | 'complete';
        timeliness: 'overdue' | 'ontime' | 'early';
        accessibility: 'private' | 'restricted' | 'public';
      };
      conflictDeclarations: {
        hasDeclarations: boolean;
        frequency: 'never' | 'rarely' | 'sometimes' | 'always';
        detail: 'vague' | 'basic' | 'detailed';
      };
      votingExplanations: {
        providesExplanations: boolean;
        frequency: number; // 0-1
        quality?: 'poor' | 'fair' | 'good' | 'excellent';
      };
    };
    
    processData?: {
      processType: 'legislative' | 'budgetary' | 'appointment' | 'procurement';
      publicNotice: {
        provided: boolean;
        advanceNotice: number; // days
        accessibility: 'limited' | 'moderate' | 'wide';
      };
      documentation: {
        availability: 'none' | 'limited' | 'partial' | 'complete';
        format: 'paper_only' | 'digital_limited' | 'digital_accessible';
        language: Array<'english' | 'swahili' | 'local_languages'>;
      };
      participation: {
        allowsPublicInput: boolean;
        inputMechanisms: Array<'written' | 'oral' | 'online' | 'hearings'>;
        feedbackProvided: boolean;
      };
    };
  };
  
  contextualFactors: {
    urgencyLevel: 'routine' | 'normal' | 'urgent' | 'emergency';
    publicInterest: 'low' | 'medium' | 'high' | 'very_high';
    mediaAttention: 'none' | 'minimal' | 'moderate' | 'high';
    stakeholderCount: number;
  };
}

export interface TransparencyAnalysisResult {
  overallScore: number; // 0-100
  confidence: number; // 0-1
  grade: 'F' | 'D' | 'C' | 'B' | 'A';
  
  dimensions: {
    accessibility: {
      score: number; // 0-100
      factors: string[];
    };
    completeness: {
      score: number; // 0-100
      factors: string[];
    };
    timeliness: {
      score: number; // 0-100
      factors: string[];
    };
    participation: {
      score: number; // 0-100
      factors: string[];
    };
    accountability: {
      score: number; // 0-100
      factors: string[];
    };
  };
  
  strengths: string[];
  weaknesses: string[];
  
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    expectedImprovement: number; // 0-100
    implementationDifficulty: 'easy' | 'moderate' | 'hard' | 'very_hard';
  }>;
  
  benchmarking: {
    peerComparison: {
      percentile: number; // 0-100
      averageScore: number; // 0-100
      bestPracticeGap: number;
    };
    historicalTrend: {
      direction: 'improving' | 'stable' | 'declining';
      changeRate: number;
    };
  };
  
  narrative: string;
}

// ============================================================================
// Analyzer Implementation
// ============================================================================

export class TransparencyAnalyzer extends BaseAnalyzer<
  TransparencyAnalysisInput,
  TransparencyAnalysisResult
> {
  private readonly DIMENSION_WEIGHTS = {
    accessibility: 0.25,
    completeness: 0.25,
    timeliness: 0.15,
    participation: 0.20,
    accountability: 0.15,
  };

  protected async analyzeWithTier(
    input: TransparencyAnalysisInput,
    tier: AnalysisTier
  ): Promise<TransparencyAnalysisResult> {
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
   * Tier 1: Dimension scoring with rules
   */
  private async analyzeTier1(
    input: TransparencyAnalysisInput
  ): Promise<TransparencyAnalysisResult> {
    // Score each dimension
    const dimensions = {
      accessibility: this.scoreAccessibility(input),
      completeness: this.scoreCompleteness(input),
      timeliness: this.scoreTimeliness(input),
      participation: this.scoreParticipation(input),
      accountability: this.scoreAccountability(input),
    };

    // Calculate overall score
    const overallScore =
      dimensions.accessibility.score * this.DIMENSION_WEIGHTS.accessibility +
      dimensions.completeness.score * this.DIMENSION_WEIGHTS.completeness +
      dimensions.timeliness.score * this.DIMENSION_WEIGHTS.timeliness +
      dimensions.participation.score * this.DIMENSION_WEIGHTS.participation +
      dimensions.accountability.score * this.DIMENSION_WEIGHTS.accountability;

    const grade = this.calculateGrade(overallScore);

    // Identify strengths and weaknesses
    const strengths = this.identifyStrengths(dimensions);
    const weaknesses = this.identifyWeaknesses(dimensions);

    // Generate basic recommendations
    const recommendations = this.generateBasicRecommendations(dimensions, weaknesses);

    // If score is very low, escalate to Tier 2 for benchmarking
    if (overallScore < 50) {
      throw new Error('Low transparency score detected, escalating to Tier 2 for benchmarking');
    }

    return {
      overallScore,
      confidence: 0.75,
      grade,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      benchmarking: {
        peerComparison: {
          percentile: 50,
          averageScore: 60,
          bestPracticeGap: 100 - overallScore,
        },
        historicalTrend: {
          direction: 'stable',
          changeRate: 0,
        },
      },
      narrative: `Transparency score: ${overallScore.toFixed(1)}/100 (Grade ${grade}). ${strengths.length} strengths, ${weaknesses.length} areas for improvement.`,
    };
  }

  /**
   * Tier 2: Statistical benchmarking
   */
  private async analyzeTier2(
    input: TransparencyAnalysisInput
  ): Promise<TransparencyAnalysisResult> {
    // TODO: Implement statistical benchmarking
    console.log('Tier 2: Running statistical benchmarking...');

    const tier1Results = await this.analyzeTier1(input);

    // Simulate benchmarking analysis
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Enhanced benchmarking (mock - replace with actual database queries)
    const enhancedBenchmarking = {
      peerComparison: {
        percentile: 45, // Below average
        averageScore: 65,
        bestPracticeGap: 100 - tier1Results.overallScore,
      },
      historicalTrend: {
        direction: 'declining' as const,
        changeRate: -2.5, // Declining 2.5 points per year
      },
    };

    // If declining trend or very low percentile, escalate to Tier 3
    if (enhancedBenchmarking.historicalTrend.direction === 'declining' || enhancedBenchmarking.peerComparison.percentile < 30) {
      throw new Error('Declining transparency trend detected, escalating to Tier 3 for strategic recommendations');
    }

    return {
      ...tier1Results,
      benchmarking: enhancedBenchmarking,
    };
  }

  /**
   * Tier 3: Ollama strategic recommendations
   */
  private async analyzeTier3(
    input: TransparencyAnalysisInput
  ): Promise<TransparencyAnalysisResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Generating strategic recommendations with Ollama...');

    const tier2Results = await this.analyzeTier2(input);

    const prompt = `You are a Kenyan transparency and governance expert. Analyze this transparency assessment and provide strategic recommendations.

Entity: ${input.entityType} (${input.entityId})
Overall Score: ${tier2Results.overallScore.toFixed(1)}/100 (Grade ${tier2Results.grade})

Dimension Scores:
- Accessibility: ${tier2Results.dimensions.accessibility.score}/100
- Completeness: ${tier2Results.dimensions.completeness.score}/100
- Timeliness: ${tier2Results.dimensions.timeliness.score}/100
- Participation: ${tier2Results.dimensions.participation.score}/100
- Accountability: ${tier2Results.dimensions.accountability.score}/100

Strengths: ${tier2Results.strengths.join(', ')}
Weaknesses: ${tier2Results.weaknesses.join(', ')}

Benchmarking:
- Percentile: ${tier2Results.benchmarking.peerComparison.percentile}th
- Trend: ${tier2Results.benchmarking.historicalTrend.direction}
- Change Rate: ${tier2Results.benchmarking.historicalTrend.changeRate}/year

Provide:
1. Strategic recommendations prioritized by impact
2. Implementation roadmap
3. Expected improvements
4. Plain-English summary for citizens

Keep it under 250 words, focused on actionable improvements.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock strategic recommendations
    const strategicRecommendations = [
      {
        priority: 'critical' as const,
        action: 'Publish all financial disclosures online in accessible format',
        expectedImprovement: 15,
        implementationDifficulty: 'moderate' as const,
      },
      {
        priority: 'high' as const,
        action: 'Extend consultation period to minimum 30 days',
        expectedImprovement: 10,
        implementationDifficulty: 'easy' as const,
      },
      {
        priority: 'high' as const,
        action: 'Implement online public participation platform',
        expectedImprovement: 12,
        implementationDifficulty: 'hard' as const,
      },
    ];

    const narrative = `This ${input.entityType} scores ${tier2Results.overallScore.toFixed(0)}/100 for transparency (Grade ${tier2Results.grade}), placing it in the ${tier2Results.benchmarking.peerComparison.percentile}th percentile. Key weaknesses: ${tier2Results.weaknesses.slice(0, 2).join(', ')}. The transparency trend is ${tier2Results.benchmarking.historicalTrend.direction}. Priority actions: ${strategicRecommendations[0].action}. Expected improvement: +${strategicRecommendations.reduce((sum, r) => sum + r.expectedImprovement, 0)} points if all recommendations implemented.`;

    return {
      ...tier2Results,
      recommendations: strategicRecommendations,
      narrative,
    };
  }

  protected getConfidence(result: TransparencyAnalysisResult, tier: AnalysisTier): number {
    const baseConfidence = result.overallScore > 30 ? 0.8 : 0.6;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.2, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.85, 0.9);
  }

  // Helper methods for dimension scoring

  private scoreAccessibility(input: TransparencyAnalysisInput): { score: number; factors: string[] } {
    let score = 0;
    const factors = [];

    if (input.assessmentData.billData) {
      if (input.assessmentData.billData.hasPublicDrafts) {
        score += 40;
        factors.push('Public drafts available');
      }
      if (input.assessmentData.billData.votingRecord.isPublic) {
        score += 30;
        factors.push('Voting record public');
      }
      if (input.assessmentData.billData.impactAssessment.isPublic) {
        score += 30;
        factors.push('Impact assessment public');
      }
    }

    if (input.assessmentData.sponsorData) {
      if (input.assessmentData.sponsorData.financialDisclosures.accessibility === 'public') {
        score += 50;
        factors.push('Financial disclosures public');
      }
    }

    return { score: Math.min(score, 100), factors };
  }

  private scoreCompleteness(input: TransparencyAnalysisInput): { score: number; factors: string[] } {
    let score = 0;
    const factors = [];

    if (input.assessmentData.billData) {
      if (input.assessmentData.billData.impactAssessment.exists) {
        score += 40;
        factors.push('Impact assessment exists');
      }
      if (input.assessmentData.billData.amendmentHistory.length > 0) {
        score += 30;
        factors.push('Amendment history documented');
      }
    }

    if (input.assessmentData.sponsorData) {
      if (input.assessmentData.sponsorData.financialDisclosures.completeness === 'complete') {
        score += 50;
        factors.push('Complete financial disclosures');
      }
    }

    return { score: Math.min(score, 100), factors };
  }

  private scoreTimeliness(input: TransparencyAnalysisInput): { score: number; factors: string[] } {
    let score = 50; // Base score
    const factors = [];

    if (input.assessmentData.billData) {
      if (input.assessmentData.billData.consultationPeriod >= 30) {
        score += 30;
        factors.push('Adequate consultation period');
      } else {
        score -= 20;
        factors.push('Insufficient consultation period');
      }
    }

    if (input.assessmentData.sponsorData) {
      if (input.assessmentData.sponsorData.financialDisclosures.timeliness === 'ontime') {
        score += 20;
        factors.push('Timely disclosures');
      }
    }

    return { score: Math.max(0, Math.min(score, 100)), factors };
  }

  private scoreParticipation(input: TransparencyAnalysisInput): { score: number; factors: string[] } {
    let score = 0;
    const factors = [];

    if (input.assessmentData.billData) {
      if (input.assessmentData.billData.publicHearings > 0) {
        score += 40;
        factors.push(`${input.assessmentData.billData.publicHearings} public hearings held`);
      }
    }

    if (input.assessmentData.processData) {
      if (input.assessmentData.processData.participation.allowsPublicInput) {
        score += 30;
        factors.push('Public input allowed');
      }
      if (input.assessmentData.processData.participation.feedbackProvided) {
        score += 30;
        factors.push('Feedback provided to participants');
      }
    }

    return { score: Math.min(score, 100), factors };
  }

  private scoreAccountability(input: TransparencyAnalysisInput): { score: number; factors: string[] } {
    let score = 0;
    const factors = [];

    if (input.assessmentData.billData) {
      if (input.assessmentData.billData.votingRecord.individualVotes) {
        score += 50;
        factors.push('Individual votes recorded');
      }
    }

    if (input.assessmentData.sponsorData) {
      if (input.assessmentData.sponsorData.votingExplanations.providesExplanations) {
        score += 30;
        factors.push('Voting explanations provided');
      }
      if (input.assessmentData.sponsorData.conflictDeclarations.hasDeclarations) {
        score += 20;
        factors.push('Conflict declarations made');
      }
    }

    return { score: Math.min(score, 100), factors };
  }

  private calculateGrade(score: number): 'F' | 'D' | 'C' | 'B' | 'A' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  private identifyStrengths(dimensions: any): string[] {
    const strengths = [];
    for (const [dim, data] of Object.entries(dimensions) as any) {
      if (data.score >= 70) {
        strengths.push(`Strong ${dim} (${data.score}/100)`);
      }
    }
    return strengths;
  }

  private identifyWeaknesses(dimensions: any): string[] {
    const weaknesses = [];
    for (const [dim, data] of Object.entries(dimensions) as any) {
      if (data.score < 50) {
        weaknesses.push(`Weak ${dim} (${data.score}/100)`);
      }
    }
    return weaknesses;
  }

  private generateBasicRecommendations(dimensions: any, weaknesses: string[]) {
    const recommendations = [];

    if (dimensions.accessibility.score < 50) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Improve public access to documents and data',
        expectedImprovement: 15,
        implementationDifficulty: 'moderate' as const,
      });
    }

    if (dimensions.participation.score < 50) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Increase public participation opportunities',
        expectedImprovement: 12,
        implementationDifficulty: 'moderate' as const,
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const transparencyAnalyzer = new TransparencyAnalyzer({
  enableCaching: true,
  cacheExpiryMs: 1800000, // 30 minutes
  enableFallback: true,
});
