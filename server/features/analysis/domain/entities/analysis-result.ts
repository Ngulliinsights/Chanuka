// --- Constitutional Analysis ---
export interface ConstitutionalConcern {
    section: string;
    concern: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    article: string;
    explanation: string;
  }
  
  export interface LegalPrecedent {
    caseName: string;
    year: number;
    relevance: number;
    outcome: string;
    applicability: string;
  }
  
  export interface ConstitutionalAnalysisResult {
      constitutionalityScore: number;
      concerns: ConstitutionalConcern[];
      precedents: LegalPrecedent[];
      riskAssessment: 'low' | 'medium' | 'high';
  }
  
  // --- Stakeholder Analysis ---
  export interface StakeholderGroup {
    name: string;
    sizeEstimate: number;
    impactLevel: 'positive' | 'negative' | 'neutral' | 'mixed';
    confidence: number;
  }
  
  export interface PopulationImpact {
    demographic: string;
    affectedEstimate: number;
    impactType: 'benefit' | 'burden' | 'mixed' | 'neutral';
    description: string;
  }
  
  export interface EconomicImpact {
    estimatedCost: number;
    estimatedBenefit: number;
    netImpact: number;
    timeframe: string;
    confidence: number;
    assumptions?: string[];
  }
  
  export interface SocialImpact {
    equityEffect: number;
    accessibilityEffect: number;
    publicHealthEffect: number;
    environmentalEffect: number;
  }
  
  export interface StakeholderAnalysisResult {
      primaryBeneficiaries: StakeholderGroup[];
      negativelyAffected: StakeholderGroup[];
      affectedPopulations: PopulationImpact[];
      economicImpact: EconomicImpact;
      socialImpact: SocialImpact;
  }
  
  // --- Transparency Analysis ---
  export interface TransparencyScoreResult {
    overall: number;
    breakdown: {
      sponsorDisclosure: number;
      legislativeProcess: number;
      financialConflicts: number;
      publicAccessibility: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  }
  
  // --- Public Interest Analysis ---
  export interface PublicInterestScoreResult {
      score: number;
      factors: {
          economicScoreNormalized: number;
          socialScoreNormalized: number;
          transparency_score: number;
      };
      assessment: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
  }
  
  // --- Conflict Analysis Summary (defined based on sponsor conflict service output) ---
  export interface ConflictSummary {
      overallRisk: 'low' | 'medium' | 'high' | 'critical';
      affectedSponsorsCount: number;
      totalFinancialExposureEstimate: number;
      directConflictCount: number;
      indirectConflictCount: number;
      // relatedConflictDetails?: unknown[]; // Keep details out of domain entity if possible
  }
  
  
  // --- Comprehensive Analysis (Aggregate Root) ---
  // This entity represents the complete analysis result for a bills.
  export class ComprehensiveAnalysis { constructor(
      public readonly bill_id: number,
      public readonly analysis_id: string,
      public readonly timestamp: Date,
      public constitutionalAnalysis: ConstitutionalAnalysisResult,
      public conflictAnalysisSummary: ConflictSummary,
      public stakeholderImpact: StakeholderAnalysisResult,
      public transparency_score: TransparencyScoreResult,
      public publicInterestScore: PublicInterestScoreResult,
      public recommendedActions: string[],
      public overallConfidence: number,
      // Optional: Add versioning or status
      public version: string = '1.0',
      public status: 'completed' | 'failed' | 'in_progress' = 'completed'
    ) { }
  
    // Potential business logic methods can go here, e.g.,
    // needsReview(): boolean {
    //   return this.conflictAnalysisSummary.overallRisk === 'critical' || this.constitutionalAnalysis.riskAssessment === 'high';
    // }
  }



