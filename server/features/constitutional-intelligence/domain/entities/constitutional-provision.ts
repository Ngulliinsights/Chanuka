// ============================================================================
// CONSTITUTIONAL INTELLIGENCE - DOMAIN ENTITIES
// ============================================================================
// Domain entities for constitutional analysis following DDD patterns

export interface ConstitutionalProvision {
  id: string;
  articleNumber: number;
  articleTitle: string;
  sectionNumber?: string;
  subsectionNumber?: string;
  provisionText: string;
  provisionSummary?: string;
  rightsCategory?: string;
  keywords: string[];
  hierarchyPath: string;
  is_active: boolean;
}

export interface LegalPrecedent {
  id: string;
  caseName: string;
  caseCitation: string;
  courtLevel: 'supreme_court' | 'court_of_appeal' | 'high_court';
  judgmentDate: Date;
  constitutionalProvisions: string[];
  caseSummary: string;
  holding: string;
  relevanceScore: number; // 0-100
  isBinding: boolean;
  isOverruled: boolean;
}

export interface ConstitutionalAnalysis {
  id: string;
  bill_id: string;
  provisionId: string;
  analysisType: 'potential_conflict' | 'requires_compliance' | 'empowers' | 'restricts' | 'clarifies';
  confidencePercentage: number; // 0-100
  analysisText: string;
  reasoningChain?: any;
  supportingPrecedents: string[];
  constitutionalRisk: 'low' | 'medium' | 'high' | 'critical';
  riskExplanation: string;
  impactSeverityPercentage: number; // 0-100
  requiresExpertReview: boolean;
  expertReviewed: boolean;
  analysisMethod: string;
  analysisVersion: string;
  created_at: Date;
  updated_at: Date;
}

export class ConstitutionalAnalysisAggregate {
  constructor(
    public readonly bill_id: string,
    public readonly analyses: ConstitutionalAnalysis[],
    public readonly overallRisk: 'low' | 'medium' | 'high' | 'critical',
    public readonly confidence: number,
    public readonly requiresExpertReview: boolean,
    public readonly created_at: Date = new Date()
  ) {}

  // Business logic methods
  hasHighRiskAnalyses(): boolean {
    return this.analyses.some(a => a.constitutionalRisk === 'high' || a.constitutionalRisk === 'critical');
  }

  getLowConfidenceAnalyses(): ConstitutionalAnalysis[] {
    return this.analyses.filter(a => a.confidencePercentage < 75);
  }

  getHighImpactAnalyses(): ConstitutionalAnalysis[] {
    return this.analyses.filter(a => a.impactSeverityPercentage >= 70);
  }

  needsUrgentReview(): boolean {
    return this.overallRisk === 'critical' || 
           this.analyses.some(a => a.constitutionalRisk === 'critical' && a.confidencePercentage > 80);
  }

  generateSummary(): {
    totalAnalyses: number;
    riskDistribution: Record<string, number>;
    averageConfidence: number;
    flaggedForReview: number;
  } {
    const riskDistribution = this.analyses.reduce((acc, analysis) => {
      acc[analysis.constitutionalRisk] = (acc[analysis.constitutionalRisk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = this.analyses.length > 0 
      ? this.analyses.reduce((sum, a) => sum + a.confidencePercentage, 0) / this.analyses.length
      : 0;

    const flaggedForReview = this.analyses.filter(a => a.requiresExpertReview).length;

    return {
      totalAnalyses: this.analyses.length,
      riskDistribution,
      averageConfidence,
      flaggedForReview
    };
  }
}


