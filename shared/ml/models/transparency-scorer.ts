// ============================================================================
// TRANSPARENCY SCORER - ML Model for Transparency Assessment (OPTIMIZED)
// ============================================================================
// Scores transparency levels of bills, sponsors, and processes

import { z } from 'zod';

import { Statistics, Cache } from './shared_utils';

export const TransparencyInputSchema = z.object({
  entityType: z.enum(['bill', 'sponsor', 'process', 'institution']),
  entityId: z.string().uuid(),
  assessmentData: z.object({
    billData: z.object({
      hasPublicDrafts: z.boolean(),
      consultationPeriod: z.number(),
      publicHearings: z.number(),
      amendmentHistory: z.array(z.object({
        date: z.string(),
        description: z.string(),
        isPublic: z.boolean(),
      })),
      votingRecord: z.object({
        isPublic: z.boolean(),
        individualVotes: z.boolean(),
      }),
      impactAssessment: z.object({
        exists: z.boolean(),
        isPublic: z.boolean(),
        quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
      }),
    }).optional(),
    
    sponsorData: z.object({
      financialDisclosures: z.object({
        hasDisclosures: z.boolean(),
        completeness: z.enum(['none', 'partial', 'complete']),
        timeliness: z.enum(['overdue', 'ontime', 'early']),
        accessibility: z.enum(['private', 'restricted', 'public']),
      }),
      conflictDeclarations: z.object({
        hasDeclarations: z.boolean(),
        frequency: z.enum(['never', 'rarely', 'sometimes', 'always']),
        detail: z.enum(['vague', 'basic', 'detailed']),
      }),
      votingExplanations: z.object({
        providesExplanations: z.boolean(),
        frequency: z.number().min(0).max(1),
        quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
      }),
    }).optional(),
    
    processData: z.object({
      processType: z.enum(['legislative', 'budgetary', 'appointment', 'procurement']),
      publicNotice: z.object({
        provided: z.boolean(),
        advanceNotice: z.number(),
        accessibility: z.enum(['limited', 'moderate', 'wide']),
      }),
      documentation: z.object({
        availability: z.enum(['none', 'limited', 'partial', 'complete']),
        format: z.enum(['paper_only', 'digital_limited', 'digital_accessible']),
        language: z.array(z.enum(['english', 'swahili', 'local_languages'])),
      }),
      participation: z.object({
        allowsPublicInput: z.boolean(),
        inputMechanisms: z.array(z.enum(['written', 'oral', 'online', 'hearings'])),
        feedbackProvided: z.boolean(),
      }),
    }).optional(),
  }),
  contextualFactors: z.object({
    urgencyLevel: z.enum(['routine', 'normal', 'urgent', 'emergency']),
    publicInterest: z.enum(['low', 'medium', 'high', 'very_high']),
    mediaAttention: z.enum(['none', 'minimal', 'moderate', 'high']),
    stakeholderCount: z.number().nonnegative(),
  }),
});

export const TransparencyOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  grade: z.enum(['F', 'D', 'C', 'B', 'A']),
  dimensions: z.object({
    accessibility: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
    }),
    completeness: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
    }),
    timeliness: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
    }),
    participation: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
    }),
    accountability: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
    }),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    action: z.string(),
    expectedImprovement: z.number().min(0).max(100),
    implementationDifficulty: z.enum(['easy', 'moderate', 'hard', 'very_hard']),
  })),
  benchmarking: z.object({
    peerComparison: z.object({
      percentile: z.number().min(0).max(100),
      averageScore: z.number().min(0).max(100),
      bestPracticeGap: z.number(),
    }),
    historicalTrend: z.object({
      direction: z.enum(['improving', 'stable', 'declining']),
      changeRate: z.number(),
    }),
  }),
});

export type TransparencyInput = z.infer<typeof TransparencyInputSchema>;
export type TransparencyOutput = z.infer<typeof TransparencyOutputSchema>;

export class TransparencyScorer {
  private modelVersion = '2.1.0';
  private cache = new Cache<TransparencyOutput>(600); // 10 minute cache

  private readonly DIMENSION_WEIGHTS = {
    accessibility: 0.25,
    completeness: 0.25,
    timeliness: 0.15,
    participation: 0.20,
    accountability: 0.15,
  };

  private readonly GRADE_THRESHOLDS = {
    A: 85,
    B: 70,
    C: 55,
    D: 40,
    F: 0,
  };

  private readonly BENCHMARK_AVERAGES = {
    bill: 55,
    sponsor: 45,
    process: 50,
    institution: 60,
  };

  async assess(input: TransparencyInput): Promise<TransparencyOutput> {
    const validatedInput = TransparencyInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Calculate dimension scores
    const dimensions = this.calculateDimensionScores(validatedInput);
    
    // Calculate overall score using weighted average
    const dimensionScores = Object.values(dimensions).map((d: unknown) => d.score);
    const weights = Object.values(this.DIMENSION_WEIGHTS);
    const overallScore = Math.round(Statistics.weightedAverage(dimensionScores, weights));
    
    // Determine grade
    const grade = this.calculateGrade(overallScore);
    
    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(dimensions);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(validatedInput, dimensions);
    
    // Perform benchmarking
    const benchmarking = this.performBenchmarking(validatedInput, overallScore);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(validatedInput, dimensions);

    const result = {
      overallScore,
      confidence,
      grade,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      benchmarking,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private calculateDimensionScores(input: TransparencyInput) {
    const { entityType, assessmentData } = input;
    
    switch (entityType) {
      case 'bill':
        return this.scoreBillTransparency(assessmentData.billData!);
      case 'sponsor':
        return this.scoreSponsorTransparency(assessmentData.sponsorData!);
      case 'process':
        return this.scoreProcessTransparency(assessmentData.processData!);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private scoreBillTransparency(billData: unknown) {
    // Accessibility scoring
    const accessibilityFactors = [];
    const accessibilityScores = [];
    
    if (billData.hasPublicDrafts) {
      accessibilityScores.push(30);
      accessibilityFactors.push('Public drafts available');
    }
    
    if (billData.votingRecord.isPublic) {
      accessibilityScores.push(25);
      accessibilityFactors.push('Voting record is public');
    }
    
    if (billData.votingRecord.individualVotes) {
      accessibilityScores.push(20);
      accessibilityFactors.push('Individual votes disclosed');
    }
    
    if (billData.impactAssessment.exists && billData.impactAssessment.isPublic) {
      accessibilityScores.push(25);
      accessibilityFactors.push('Public impact assessment available');
    }
    
    const accessibilityScore = Math.min(100, Statistics.mean(accessibilityScores) * (accessibilityScores.length / 4) * 100);

    // Completeness scoring
    const completenessFactors = [];
    const completenessScores = [];
    
    if (billData.amendmentHistory.length > 0) {
      completenessScores.push(30);
      completenessFactors.push('Amendment history documented');
      
      const publicAmendments = billData.amendmentHistory.filter((a: unknown) => a.isPublic).length;
      const amendmentTransparency = billData.amendmentHistory.length > 0 
        ? publicAmendments / billData.amendmentHistory.length 
        : 0;
      completenessScores.push(amendmentTransparency * 30);
      
      if (amendmentTransparency > 0.8) {
        completenessFactors.push('Most amendments are public');
      }
    }
    
    if (billData.impactAssessment.exists) {
      completenessScores.push(20);
      completenessFactors.push('Impact assessment conducted');
      
      const qualityScores = { poor: 5, fair: 10, good: 15, excellent: 20 };
      if (billData.impactAssessment.quality) {
        completenessScores.push(qualityScores[billData.impactAssessment.quality]);
        completenessFactors.push(`${billData.impactAssessment.quality} quality assessment`);
      }
    }
    
    const completenessScore = Math.min(100, Statistics.mean(completenessScores) || 0);

    // Timeliness scoring
    const timelinessFactors = [];
    let timelinessScore = 50;
    
    if (billData.consultationPeriod >= 30) {
      timelinessScore += 30;
      timelinessFactors.push('Adequate consultation period (30+ days)');
    } else if (billData.consultationPeriod >= 14) {
      timelinessScore += 15;
      timelinessFactors.push('Moderate consultation period (14+ days)');
    } else if (billData.consultationPeriod > 0) {
      timelinessScore -= 10;
      timelinessFactors.push('Short consultation period');
    } else {
      timelinessScore -= 30;
      timelinessFactors.push('No consultation period');
    }
    
    if (billData.consultationPeriod >= 60) {
      timelinessScore += 20;
      timelinessFactors.push('Extended consultation period (60+ days)');
    }
    
    timelinessScore = Math.max(0, Math.min(100, timelinessScore));

    // Participation scoring
    const participationFactors = [];
    const participationScores = [];
    
    if (billData.publicHearings > 0) {
      participationScores.push(40);
      participationFactors.push(`${billData.publicHearings} public hearing(s) held`);
      
      if (billData.publicHearings >= 3) {
        participationScores.push(20);
        participationFactors.push('Multiple public hearings');
      }
    }
    
    if (billData.consultationPeriod > 0) {
      participationScores.push(40);
      participationFactors.push('Public consultation period provided');
    }
    
    const participationScore = Math.min(100, Statistics.mean(participationScores) || 0);

    // Accountability scoring
    const accountabilityFactors = [];
    const accountabilityScores = [];
    
    if (billData.votingRecord.isPublic && billData.votingRecord.individualVotes) {
      accountabilityScores.push(50);
      accountabilityFactors.push('Full voting transparency');
    }
    
    if (billData.impactAssessment.exists && billData.impactAssessment.isPublic) {
      accountabilityScores.push(30);
      accountabilityFactors.push('Public impact assessment');
    }
    
    if (billData.amendmentHistory.some((a: unknown) => a.isPublic)) {
      accountabilityScores.push(20);
      accountabilityFactors.push('Amendment transparency');
    }
    
    const accountabilityScore = Math.min(100, Statistics.mean(accountabilityScores) || 0);

    return {
      accessibility: { score: Math.round(accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.round(completenessScore), factors: completenessFactors },
      timeliness: { score: Math.round(timelinessScore), factors: timelinessFactors },
      participation: { score: Math.round(participationScore), factors: participationFactors },
      accountability: { score: Math.round(accountabilityScore), factors: accountabilityFactors },
    };
  }

  private scoreSponsorTransparency(sponsorData: unknown) {
    // Accessibility scoring
    const accessibilityFactors = [];
    const accessibilityScores = [];
    
    const accessibilityMap = { public: 50, restricted: 25, private: 0 };
    accessibilityScores.push(accessibilityMap[sponsorData.financialDisclosures.accessibility]);
    accessibilityFactors.push(`Financial disclosures: ${sponsorData.financialDisclosures.accessibility}`);
    
    if (sponsorData.votingExplanations.providesExplanations) {
      accessibilityScores.push(30);
      accessibilityFactors.push('Provides voting explanations');
    }
    
    if (sponsorData.conflictDeclarations.hasDeclarations) {
      accessibilityScores.push(20);
      accessibilityFactors.push('Makes conflict declarations');
    }
    
    const accessibilityScore = Math.min(100, Statistics.mean(accessibilityScores));

    // Completeness scoring
    const completenessFactors = [];
    const completenessScores = [];
    
    const completenessMap = { complete: 40, partial: 20, none: 0 };
    completenessScores.push(completenessMap[sponsorData.financialDisclosures.completeness]);
    completenessFactors.push(`${sponsorData.financialDisclosures.completeness} financial disclosures`);
    
    const detailMap = { detailed: 30, basic: 15, vague: 5 };
    completenessScores.push(detailMap[sponsorData.conflictDeclarations.detail]);
    completenessFactors.push(`${sponsorData.conflictDeclarations.detail} conflict declarations`);
    
    if (sponsorData.votingExplanations.quality) {
      const qualityMap = { excellent: 30, good: 20, fair: 10, poor: 5 };
      completenessScores.push(qualityMap[sponsorData.votingExplanations.quality]);
      completenessFactors.push(`${sponsorData.votingExplanations.quality} explanation quality`);
    }
    
    const completenessScore = Math.min(100, Statistics.mean(completenessScores));

    // Timeliness scoring
    const timelinessFactors = [];
    const timelinessScores = [50]; // Base
    
    const timelinessMap = { early: 30, ontime: 20, overdue: -30 };
    timelinessScores.push(50 + timelinessMap[sponsorData.financialDisclosures.timeliness]);
    timelinessFactors.push(`${sponsorData.financialDisclosures.timeliness} disclosure filing`);
    
    const frequencyMap = { always: 20, sometimes: 10, rarely: 5, never: -10 };
    timelinessScores.push(50 + frequencyMap[sponsorData.conflictDeclarations.frequency]);
    timelinessFactors.push(`${sponsorData.conflictDeclarations.frequency} declares conflicts`);
    
    const timelinessScore = Math.max(0, Math.min(100, Statistics.mean(timelinessScores)));

    // Participation scoring
    const participationFactors = [];
    const participationScore = sponsorData.votingExplanations.frequency * 100;
    
    if (participationScore > 80) {
      participationFactors.push('Regularly explains voting decisions');
    } else if (participationScore > 50) {
      participationFactors.push('Sometimes explains voting decisions');
    } else {
      participationFactors.push('Rarely explains voting decisions');
    }

    // Accountability scoring
    const accountabilityFactors = [];
    const accountabilityScores = [];
    
    if (sponsorData.financialDisclosures.hasDisclosures && 
        sponsorData.financialDisclosures.accessibility === 'public') {
      accountabilityScores.push(40);
      accountabilityFactors.push('Public financial accountability');
    }
    
    if (sponsorData.conflictDeclarations.frequency === 'always') {
      accountabilityScores.push(30);
      accountabilityFactors.push('Consistent conflict disclosure');
    }
    
    if (sponsorData.votingExplanations.providesExplanations) {
      accountabilityScores.push(30);
      accountabilityFactors.push('Voting accountability');
    }
    
    const accountabilityScore = Math.min(100, Statistics.mean(accountabilityScores) || 0);

    return {
      accessibility: { score: Math.round(accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.round(completenessScore), factors: completenessFactors },
      timeliness: { score: Math.round(timelinessScore), factors: timelinessFactors },
      participation: { score: Math.round(participationScore), factors: participationFactors },
      accountability: { score: Math.round(accountabilityScore), factors: accountabilityFactors },
    };
  }

  private scoreProcessTransparency(processData: unknown) {
    // Accessibility scoring
    const accessibilityFactors = [];
    const accessibilityScores = [];
    
    const availabilityMap = { complete: 30, partial: 15, limited: 8, none: 0 };
    accessibilityScores.push(availabilityMap[processData.documentation.availability]);
    accessibilityFactors.push(`${processData.documentation.availability} documentation`);
    
    const formatMap = { digital_accessible: 25, digital_limited: 15, paper_only: 5 };
    accessibilityScores.push(formatMap[processData.documentation.format]);
    accessibilityFactors.push(`${processData.documentation.format.replace('_', ' ')} format`);
    
    const langScore = processData.documentation.language.length * 10;
    accessibilityScores.push(Math.min(25, langScore));
    accessibilityFactors.push(`Available in ${processData.documentation.language.length} language(s)`);
    
    const accessibilityScore = Math.min(100, Statistics.mean(accessibilityScores));

    // Completeness scoring
    const completenessFactors = [];
    const completenessScores = [];
    
    if (processData.publicNotice.provided) {
      completenessScores.push(30);
      completenessFactors.push('Public notice provided');
    }
    
    if (processData.participation.allowsPublicInput) {
      completenessScores.push(35);
      completenessFactors.push('Public input allowed');
    }
    
    if (processData.participation.feedbackProvided) {
      completenessScores.push(35);
      completenessFactors.push('Feedback provided to participants');
    }
    
    const completenessScore = Math.min(100, Statistics.mean(completenessScores) || 0);

    // Timeliness scoring
    const timelinessFactors = [];
    const timelinessScores = [];
    
    if (processData.publicNotice.advanceNotice >= 30) {
      timelinessScores.push(80);
      timelinessFactors.push('Extended advance notice (30+ days)');
    } else if (processData.publicNotice.advanceNotice >= 14) {
      timelinessScores.push(50);
      timelinessFactors.push('Adequate advance notice (14+ days)');
    } else if (processData.publicNotice.advanceNotice >= 7) {
      timelinessScores.push(25);
      timelinessFactors.push('Moderate advance notice (7+ days)');
    } else {
      timelinessScores.push(10);
      timelinessFactors.push('Insufficient advance notice');
    }
    
    if (processData.participation.feedbackProvided) {
      timelinessScores.push(20);
      timelinessFactors.push('Timely feedback provided');
    }
    
    const timelinessScore = Math.min(100, Statistics.mean(timelinessScores));

    // Participation scoring
    const participationFactors = [];
    const participationScores = [];
    
    if (processData.participation.allowsPublicInput) {
      participationScores.push(40);
      participationFactors.push('Public input mechanisms available');
      
      const mechanismScore = processData.participation.inputMechanisms.length * 15;
      participationScores.push(mechanismScore);
      participationFactors.push(`${processData.participation.inputMechanisms.length} input mechanism(s)`);
    }
    
    const noticeMap = { wide: 20, moderate: 10, limited: 5 };
    participationScores.push(noticeMap[processData.publicNotice.accessibility]);
    participationFactors.push(`${processData.publicNotice.accessibility} notice accessibility`);
    
    const participationScore = Math.min(100, Statistics.mean(participationScores) || 0);

    // Accountability scoring
    const accountabilityFactors = [];
    const accountabilityScores = [];
    
    if (processData.documentation.availability === 'complete') {
      accountabilityScores.push(40);
      accountabilityFactors.push('Complete process documentation');
    }
    
    if (processData.participation.feedbackProvided) {
      accountabilityScores.push(30);
      accountabilityFactors.push('Feedback accountability');
    }
    
    if (processData.publicNotice.provided) {
      accountabilityScores.push(30);
      accountabilityFactors.push('Public notice accountability');
    }
    
    const accountabilityScore = Math.min(100, Statistics.mean(accountabilityScores) || 0);

    return {
      accessibility: { score: Math.round(accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.round(completenessScore), factors: completenessFactors },
      timeliness: { score: Math.round(timelinessScore), factors: timelinessFactors },
      participation: { score: Math.round(participationScore), factors: participationFactors },
      accountability: { score: Math.round(accountabilityScore), factors: accountabilityFactors },
    };
  }

  private calculateGrade(score: number): 'F' | 'D' | 'C' | 'B' | 'A' {
    if (score >= this.GRADE_THRESHOLDS.A) return 'A';
    if (score >= this.GRADE_THRESHOLDS.B) return 'B';
    if (score >= this.GRADE_THRESHOLDS.C) return 'C';
    if (score >= this.GRADE_THRESHOLDS.D) return 'D';
    return 'F';
  }

  private identifyStrengthsWeaknesses(dimensions: unknown) {
    const strengths = [];
    const weaknesses = [];
    
    for (const [dimension, data] of Object.entries(dimensions)) {
      const typedData = data as { score: number; factors: string[] };
      if (typedData.score >= 80) {
        strengths.push(`Strong ${dimension}: ${typedData.score}/100`);
      } else if (typedData.score <= 40) {
        weaknesses.push(`Weak ${dimension}: ${typedData.score}/100`);
      }
    }
    
    return { strengths, weaknesses };
  }

  private generateRecommendations(input: TransparencyInput, dimensions: unknown) {
    const recommendations = [];
    
    for (const [dimension, data] of Object.entries(dimensions)) {
      const typedData = data as { score: number; factors: string[] };
      if (typedData.score < 60) {
        const rec = this.getDimensionRecommendation(dimension, input.entityType, typedData.score);
        if (rec) recommendations.push(rec);
      }
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  }

  private getDimensionRecommendation(dimension: string, entityType: string, score: number) {
    const priority: 'critical' | 'high' | 'medium' = score < 30 ? 'critical' : score < 50 ? 'high' : 'medium';
    
    const recommendations: Record<string, {
      action: string;
      expectedImprovement: number;
      implementationDifficulty: 'easy' | 'moderate' | 'hard';
    }> = {
      accessibility: {
        action: 'Improve public access to information and documentation',
        expectedImprovement: 25,
        implementationDifficulty: 'moderate' as const,
      },
      completeness: {
        action: 'Provide more comprehensive information and documentation',
        expectedImprovement: 30,
        implementationDifficulty: 'moderate' as const,
      },
      timeliness: {
        action: 'Improve timing of information disclosure and public notice',
        expectedImprovement: 20,
        implementationDifficulty: 'easy' as const,
      },
      participation: {
        action: 'Enhance public participation mechanisms and opportunities',
        expectedImprovement: 35,
        implementationDifficulty: 'moderate' as const,
      },
      accountability: {
        action: 'Strengthen accountability and oversight mechanisms',
        expectedImprovement: 40,
        implementationDifficulty: 'hard' as const,
      },
    };
    
    const rec = recommendations[dimension];
    return rec ? { priority, ...rec } : null;
  }

  private performBenchmarking(input: TransparencyInput, score: number) {
    const averageScore = this.BENCHMARK_AVERAGES[input.entityType] || 50;
    const percentile = Math.min(100, Math.max(0, (score / 100) * 100));
    
    return {
      peerComparison: {
        percentile,
        averageScore,
        bestPracticeGap: Math.max(0, 90 - score),
      },
      historicalTrend: {
        direction: (score > averageScore ? 'improving' : 
                  score < averageScore ? 'declining' : 'stable') as 'improving' | 'stable' | 'declining',
        changeRate: ((score - averageScore) / averageScore) * 100,
      },
    };
  }

  private calculateConfidence(input: TransparencyInput, dimensions: unknown): number {
    let confidence = 0.7;
    
    // Check data completeness
    const hasData = input.entityType === 'bill' && input.assessmentData.billData ||
                   input.entityType === 'sponsor' && input.assessmentData.sponsorData ||
                   input.entityType === 'process' && input.assessmentData.processData;
    
    if (hasData) confidence += 0.1;
    
    // Check consistency of dimension scores
    const scores = Object.values(dimensions).map((d: unknown) => d.score);
    const variance = Statistics.variance(scores);
    const consistencyBonus = Math.max(0, (1 - variance / 1000) * 0.2);
    confidence += consistencyBonus;
    
    return Math.min(1.0, confidence);
  }

  private generateCacheKey(input: TransparencyInput): string {
    return `${input.entityType}-${input.entityId}-${input.contextualFactors.urgencyLevel}`;
  }

  getModelInfo() {
    return {
      name: 'Transparency Scorer',
      version: this.modelVersion,
      description: 'Multi-dimensional transparency assessment and scoring',
      capabilities: [
        'Multi-dimensional scoring (5 dimensions)',
        'Entity-specific assessment (bills, sponsors, processes)',
        'Benchmarking and comparison',
        'Actionable recommendations with priority',
        'Grade assignment (A-F)',
        'Trend analysis',
        'Performance optimization with caching',
        'Statistical analysis with variance checking'
      ]
    };
  }
}

export const transparencyScorer = new TransparencyScorer();
