// ============================================================================
// TRANSPARENCY SCORER - ML Model for Transparency Assessment
// ============================================================================
// Scores transparency levels of bills, sponsors, and processes

import { z } from 'zod';

export const TransparencyInputSchema = z.object({
  entityType: z.enum(['bill', 'sponsor', 'process', 'institution']),
  entityId: z.string().uuid(),
  assessmentData: z.object({
    // For bills
    billData: z.object({
      hasPublicDrafts: z.boolean(),
      consultationPeriod: z.number(), // days
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
    
    // For sponsors
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
        frequency: z.number().min(0).max(1), // 0-1 scale
        quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
      }),
    }).optional(),
    
    // For processes
    processData: z.object({
      processType: z.enum(['legislative', 'budgetary', 'appointment', 'procurement']),
      publicNotice: z.object({
        provided: z.boolean(),
        advanceNotice: z.number(), // days
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
      changeRate: z.number(), // percentage change per period
    }),
  }),
});

export type TransparencyInput = z.infer<typeof TransparencyInputSchema>;
export type TransparencyOutput = z.infer<typeof TransparencyOutputSchema>;

export class TransparencyScorer {
  private modelVersion = '2.0.0';

  // Dimension weights for overall score calculation
  private readonly DIMENSION_WEIGHTS = {
    accessibility: 0.25,
    completeness: 0.25,
    timeliness: 0.15,
    participation: 0.20,
    accountability: 0.15,
  };

  // Scoring thresholds for grades
  private readonly GRADE_THRESHOLDS = {
    A: 85,
    B: 70,
    C: 55,
    D: 40,
    F: 0,
  };

  async assess(input: TransparencyInput): Promise<TransparencyOutput> {
    const validatedInput = TransparencyInputSchema.parse(input);
    
    // Calculate dimension scores based on entity type
    const dimensions = this.calculateDimensionScores(validatedInput);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(dimensions);
    
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

    return {
      overallScore,
      confidence,
      grade,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      benchmarking,
    };
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

  private scoreBillTransparency(billData: any) {
    // Accessibility scoring
    const accessibilityFactors = [];
    let accessibilityScore = 0;
    
    if (billData.hasPublicDrafts) {
      accessibilityScore += 30;
      accessibilityFactors.push('Public drafts available');
    }
    
    if (billData.votingRecord.isPublic) {
      accessibilityScore += 25;
      accessibilityFactors.push('Voting record is public');
    }
    
    if (billData.votingRecord.individualVotes) {
      accessibilityScore += 20;
      accessibilityFactors.push('Individual votes disclosed');
    }
    
    if (billData.impactAssessment.exists && billData.impactAssessment.isPublic) {
      accessibilityScore += 25;
      accessibilityFactors.push('Public impact assessment available');
    }

    // Completeness scoring
    const completenessFactors = [];
    let completenessScore = 0;
    
    if (billData.amendmentHistory.length > 0) {
      completenessScore += 30;
      completenessFactors.push('Amendment history documented');
      
      const publicAmendments = billData.amendmentHistory.filter((a: any) => a.isPublic).length;
      const amendmentTransparency = publicAmendments / billData.amendmentHistory.length;
      completenessScore += amendmentTransparency * 30;
      
      if (amendmentTransparency > 0.8) {
        completenessFactors.push('Most amendments are public');
      }
    }
    
    if (billData.impactAssessment.exists) {
      completenessScore += 20;
      completenessFactors.push('Impact assessment conducted');
      
      if (billData.impactAssessment.quality === 'excellent') {
        completenessScore += 20;
        completenessFactors.push('High-quality impact assessment');
      }
    }

    // Timeliness scoring
    const timelinessFactors = [];
    let timelinessScore = 50; // Base score
    
    if (billData.consultationPeriod >= 30) {
      timelinessScore += 30;
      timelinessFactors.push('Adequate consultation period (30+ days)');
    } else if (billData.consultationPeriod >= 14) {
      timelinessScore += 15;
      timelinessFactors.push('Moderate consultation period (14+ days)');
    } else {
      timelinessScore -= 20;
      timelinessFactors.push('Insufficient consultation period');
    }
    
    if (billData.consultationPeriod >= 60) {
      timelinessScore += 20;
      timelinessFactors.push('Extended consultation period (60+ days)');
    }

    // Participation scoring
    const participationFactors = [];
    let participationScore = 0;
    
    if (billData.publicHearings > 0) {
      participationScore += 40;
      participationFactors.push(`${billData.publicHearings} public hearing(s) held`);
      
      if (billData.publicHearings >= 3) {
        participationScore += 20;
        participationFactors.push('Multiple public hearings');
      }
    }
    
    if (billData.consultationPeriod > 0) {
      participationScore += 40;
      participationFactors.push('Public consultation period provided');
    }

    // Accountability scoring
    const accountabilityFactors = [];
    let accountabilityScore = 0;
    
    if (billData.votingRecord.isPublic && billData.votingRecord.individualVotes) {
      accountabilityScore += 50;
      accountabilityFactors.push('Full voting transparency');
    }
    
    if (billData.impactAssessment.exists && billData.impactAssessment.isPublic) {
      accountabilityScore += 30;
      accountabilityFactors.push('Public impact assessment');
    }
    
    if (billData.amendmentHistory.some((a: any) => a.isPublic)) {
      accountabilityScore += 20;
      accountabilityFactors.push('Amendment transparency');
    }

    return {
      accessibility: { score: Math.min(100, accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.min(100, completenessScore), factors: completenessFactors },
      timeliness: { score: Math.min(100, timelinessScore), factors: timelinessFactors },
      participation: { score: Math.min(100, participationScore), factors: participationFactors },
      accountability: { score: Math.min(100, accountabilityScore), factors: accountabilityFactors },
    };
  }

  private scoreSponsorTransparency(sponsorData: any) {
    // Accessibility scoring
    const accessibilityFactors = [];
    let accessibilityScore = 0;
    
    if (sponsorData.financialDisclosures.accessibility === 'public') {
      accessibilityScore += 50;
      accessibilityFactors.push('Financial disclosures are public');
    } else if (sponsorData.financialDisclosures.accessibility === 'restricted') {
      accessibilityScore += 25;
      accessibilityFactors.push('Financial disclosures have restricted access');
    }
    
    if (sponsorData.votingExplanations.providesExplanations) {
      accessibilityScore += 30;
      accessibilityFactors.push('Provides voting explanations');
    }
    
    if (sponsorData.conflictDeclarations.hasDeclarations) {
      accessibilityScore += 20;
      accessibilityFactors.push('Makes conflict declarations');
    }

    // Completeness scoring
    const completenessFactors = [];
    let completenessScore = 0;
    
    switch (sponsorData.financialDisclosures.completeness) {
      case 'complete':
        completenessScore += 40;
        completenessFactors.push('Complete financial disclosures');
        break;
      case 'partial':
        completenessScore += 20;
        completenessFactors.push('Partial financial disclosures');
        break;
      case 'none':
        completenessFactors.push('No financial disclosures');
        break;
    }
    
    if (sponsorData.conflictDeclarations.detail === 'detailed') {
      completenessScore += 30;
      completenessFactors.push('Detailed conflict declarations');
    } else if (sponsorData.conflictDeclarations.detail === 'basic') {
      completenessScore += 15;
      completenessFactors.push('Basic conflict declarations');
    }
    
    if (sponsorData.votingExplanations.quality === 'excellent') {
      completenessScore += 30;
      completenessFactors.push('High-quality voting explanations');
    } else if (sponsorData.votingExplanations.quality === 'good') {
      completenessScore += 20;
      completenessFactors.push('Good voting explanations');
    }

    // Timeliness scoring
    const timelinessFactors = [];
    let timelinessScore = 50; // Base score
    
    switch (sponsorData.financialDisclosures.timeliness) {
      case 'early':
        timelinessScore += 30;
        timelinessFactors.push('Early financial disclosure filing');
        break;
      case 'ontime':
        timelinessScore += 20;
        timelinessFactors.push('Timely financial disclosure filing');
        break;
      case 'overdue':
        timelinessScore -= 30;
        timelinessFactors.push('Overdue financial disclosures');
        break;
    }
    
    if (sponsorData.conflictDeclarations.frequency === 'always') {
      timelinessScore += 20;
      timelinessFactors.push('Consistent conflict declarations');
    }

    // Participation scoring
    const participationFactors = [];
    let participationScore = sponsorData.votingExplanations.frequency * 100;
    
    if (sponsorData.votingExplanations.frequency > 0.8) {
      participationFactors.push('Regularly explains voting decisions');
    } else if (sponsorData.votingExplanations.frequency > 0.5) {
      participationFactors.push('Sometimes explains voting decisions');
    } else {
      participationFactors.push('Rarely explains voting decisions');
    }

    // Accountability scoring
    const accountabilityFactors = [];
    let accountabilityScore = 0;
    
    if (sponsorData.financialDisclosures.hasDisclosures && 
        sponsorData.financialDisclosures.accessibility === 'public') {
      accountabilityScore += 40;
      accountabilityFactors.push('Public financial accountability');
    }
    
    if (sponsorData.conflictDeclarations.frequency === 'always') {
      accountabilityScore += 30;
      accountabilityFactors.push('Consistent conflict disclosure');
    }
    
    if (sponsorData.votingExplanations.providesExplanations) {
      accountabilityScore += 30;
      accountabilityFactors.push('Voting accountability');
    }

    return {
      accessibility: { score: Math.min(100, accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.min(100, completenessScore), factors: completenessFactors },
      timeliness: { score: Math.min(100, timelinessScore), factors: timelinessFactors },
      participation: { score: Math.min(100, participationScore), factors: participationFactors },
      accountability: { score: Math.min(100, accountabilityScore), factors: accountabilityFactors },
    };
  }

  private scoreProcessTransparency(processData: any) {
    // Accessibility scoring
    const accessibilityFactors = [];
    let accessibilityScore = 0;
    
    if (processData.documentation.availability === 'complete') {
      accessibilityScore += 30;
      accessibilityFactors.push('Complete documentation available');
    } else if (processData.documentation.availability === 'partial') {
      accessibilityScore += 15;
      accessibilityFactors.push('Partial documentation available');
    }
    
    if (processData.documentation.format === 'digital_accessible') {
      accessibilityScore += 25;
      accessibilityFactors.push('Digitally accessible documentation');
    }
    
    if (processData.documentation.language.includes('swahili')) {
      accessibilityScore += 20;
      accessibilityFactors.push('Documentation in Swahili');
    }
    
    if (processData.documentation.language.includes('local_languages')) {
      accessibilityScore += 25;
      accessibilityFactors.push('Documentation in local languages');
    }

    // Completeness scoring
    const completenessFactors = [];
    let completenessScore = 0;
    
    if (processData.publicNotice.provided) {
      completenessScore += 30;
      completenessFactors.push('Public notice provided');
    }
    
    if (processData.participation.allowsPublicInput) {
      completenessScore += 35;
      completenessFactors.push('Public input allowed');
    }
    
    if (processData.participation.feedbackProvided) {
      completenessScore += 35;
      completenessFactors.push('Feedback provided to participants');
    }

    // Timeliness scoring
    const timelinessFactors = [];
    let timelinessScore = 0;
    
    if (processData.publicNotice.advanceNotice >= 14) {
      timelinessScore += 50;
      timelinessFactors.push('Adequate advance notice (14+ days)');
    } else if (processData.publicNotice.advanceNotice >= 7) {
      timelinessScore += 25;
      timelinessFactors.push('Moderate advance notice (7+ days)');
    }
    
    if (processData.publicNotice.advanceNotice >= 30) {
      timelinessScore += 30;
      timelinessFactors.push('Extended advance notice (30+ days)');
    }
    
    if (processData.participation.feedbackProvided) {
      timelinessScore += 20;
      timelinessFactors.push('Timely feedback provided');
    }

    // Participation scoring
    const participationFactors = [];
    let participationScore = 0;
    
    if (processData.participation.allowsPublicInput) {
      participationScore += 40;
      participationFactors.push('Public input mechanisms available');
      
      const mechanismCount = processData.participation.inputMechanisms.length;
      participationScore += mechanismCount * 15;
      participationFactors.push(`${mechanismCount} input mechanism(s) available`);
    }
    
    switch (processData.publicNotice.accessibility) {
      case 'wide':
        participationScore += 20;
        participationFactors.push('Wide public notice accessibility');
        break;
      case 'moderate':
        participationScore += 10;
        participationFactors.push('Moderate public notice accessibility');
        break;
    }

    // Accountability scoring
    const accountabilityFactors = [];
    let accountabilityScore = 0;
    
    if (processData.documentation.availability === 'complete') {
      accountabilityScore += 40;
      accountabilityFactors.push('Complete process documentation');
    }
    
    if (processData.participation.feedbackProvided) {
      accountabilityScore += 30;
      accountabilityFactors.push('Feedback accountability');
    }
    
    if (processData.publicNotice.provided) {
      accountabilityScore += 30;
      accountabilityFactors.push('Public notice accountability');
    }

    return {
      accessibility: { score: Math.min(100, accessibilityScore), factors: accessibilityFactors },
      completeness: { score: Math.min(100, completenessScore), factors: completenessFactors },
      timeliness: { score: Math.min(100, timelinessScore), factors: timelinessFactors },
      participation: { score: Math.min(100, participationScore), factors: participationFactors },
      accountability: { score: Math.min(100, accountabilityScore), factors: accountabilityFactors },
    };
  }

  private calculateOverallScore(dimensions: any): number {
    let weightedScore = 0;
    
    for (const [dimension, weight] of Object.entries(this.DIMENSION_WEIGHTS)) {
      weightedScore += dimensions[dimension].score * weight;
    }
    
    return Math.round(weightedScore);
  }

  private calculateGrade(score: number): 'F' | 'D' | 'C' | 'B' | 'A' {
    if (score >= this.GRADE_THRESHOLDS.A) return 'A';
    if (score >= this.GRADE_THRESHOLDS.B) return 'B';
    if (score >= this.GRADE_THRESHOLDS.C) return 'C';
    if (score >= this.GRADE_THRESHOLDS.D) return 'D';
    return 'F';
  }

  private identifyStrengthsWeaknesses(dimensions: any) {
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

  private generateRecommendations(input: TransparencyInput, dimensions: any) {
    const recommendations = [];
    
    // Generate recommendations based on weak dimensions
    for (const [dimension, data] of Object.entries(dimensions)) {
      const typedData = data as { score: number; factors: string[] };
      if (typedData.score < 60) {
        const recs = this.getDimensionRecommendations(dimension, input.entityType, typedData.score);
        recommendations.push(...recs);
      }
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  }

  private getDimensionRecommendations(dimension: string, entityType: string, score: number) {
    const recommendations = [];
    const priority = score < 30 ? 'critical' : score < 50 ? 'high' : 'medium';
    
    switch (dimension) {
      case 'accessibility':
        recommendations.push({
          priority: priority as 'low' | 'medium' | 'high' | 'critical',
          action: 'Improve public access to information and documentation',
          expectedImprovement: 25,
          implementationDifficulty: 'moderate' as const,
        });
        break;
        
      case 'completeness':
        recommendations.push({
          priority: priority as 'low' | 'medium' | 'high' | 'critical',
          action: 'Provide more comprehensive information and documentation',
          expectedImprovement: 30,
          implementationDifficulty: 'moderate' as const,
        });
        break;
        
      case 'timeliness':
        recommendations.push({
          priority: priority as 'low' | 'medium' | 'high' | 'critical',
          action: 'Improve timing of information disclosure and public notice',
          expectedImprovement: 20,
          implementationDifficulty: 'easy' as const,
        });
        break;
        
      case 'participation':
        recommendations.push({
          priority: priority as 'low' | 'medium' | 'high' | 'critical',
          action: 'Enhance public participation mechanisms and opportunities',
          expectedImprovement: 35,
          implementationDifficulty: 'moderate' as const,
        });
        break;
        
      case 'accountability':
        recommendations.push({
          priority: priority as 'low' | 'medium' | 'high' | 'critical',
          action: 'Strengthen accountability and oversight mechanisms',
          expectedImprovement: 40,
          implementationDifficulty: 'hard' as const,
        });
        break;
    }
    
    return recommendations;
  }

  private performBenchmarking(input: TransparencyInput, score: number) {
    // Simplified benchmarking - in practice, this would use historical data
    const averageScores = {
      bill: 55,
      sponsor: 45,
      process: 50,
      institution: 60,
    };
    
    const averageScore = averageScores[input.entityType] || 50;
    const percentile = Math.min(100, Math.max(0, (score / 100) * 100));
    
    return {
      peerComparison: {
        percentile,
        averageScore,
        bestPracticeGap: Math.max(0, 90 - score), // Assume 90 is best practice
      },
      historicalTrend: {
        direction: score > averageScore ? 'improving' : score < averageScore ? 'declining' : 'stable' as const,
        changeRate: ((score - averageScore) / averageScore) * 100,
      },
    };
  }

  private calculateConfidence(input: TransparencyInput, dimensions: any): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence with more complete data
    const dataCompleteness = this.assessDataCompleteness(input);
    confidence += dataCompleteness * 0.2;
    
    // Increase confidence with consistent dimension scores
    const scores = Object.values(dimensions).map((d: any) => d.score);
    const variance = this.calculateVariance(scores);
    const consistencyBonus = Math.max(0, (1 - variance / 1000) * 0.1);
    confidence += consistencyBonus;
    
    return Math.min(1.0, confidence);
  }

  private assessDataCompleteness(input: TransparencyInput): number {
    // Simple heuristic for data completeness
    const { assessmentData } = input;
    let completeness = 0;
    
    if (input.entityType === 'bill' && assessmentData.billData) {
      completeness = 1.0; // Assume complete if provided
    } else if (input.entityType === 'sponsor' && assessmentData.sponsorData) {
      completeness = 1.0;
    } else if (input.entityType === 'process' && assessmentData.processData) {
      completeness = 1.0;
    }
    
    return completeness;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  getModelInfo() {
    return {
      name: 'Transparency Scorer',
      version: this.modelVersion,
      description: 'Assesses transparency levels across multiple dimensions',
      capabilities: [
        'Multi-dimensional transparency scoring',
        'Entity-specific assessment (bills, sponsors, processes)',
        'Benchmarking and comparison',
        'Actionable recommendations',
        'Grade assignment',
        'Trend analysis'
      ]
    };
  }
}

export const transparencyScorer = new TransparencyScorer();