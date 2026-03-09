/**
 * Shared Analysis Types
 * 
 * Types for comprehensive bill analysis including constitutional analysis,
 * stakeholder impact, transparency scoring, and public interest assessment.
 * 
 * These types are shared between client and server to ensure type safety
 * across the full stack.
 */

// ============================================================================
// Constitutional Analysis Types
// ============================================================================

export interface ConstitutionalConcern {
  section: string;
  concern: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  article: string;
  explanation: string;
  provisionId?: string;
}

export interface LegalPrecedent {
  id?: string;
  caseName: string;
  year: number;
  relevance: number;
  outcome: string;
  applicability: string;
  citation?: string;
}

export interface ConstitutionalAnalysisResult {
  constitutionalityScore: number;
  concerns: ConstitutionalConcern[];
  precedents: LegalPrecedent[];
  riskAssessment: 'low' | 'medium' | 'high';
  confidenceLevel: number;
  requiresExpertReview: boolean;
  metadata: {
    analysisTimestamp: Date;
    billContentLength: number;
    patternsMatched: number;
    precedentsFound: number;
  };
}

// ============================================================================
// Stakeholder Analysis Types
// ============================================================================

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

// ============================================================================
// Conflict Analysis Types
// ============================================================================

export interface ConflictSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsorsCount: number;
  totalFinancialExposureEstimate: number;
  directConflictCount: number;
  indirectConflictCount: number;
  relatedConflictDetails?: unknown[];
}

// ============================================================================
// Transparency Analysis Types
// ============================================================================

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

// ============================================================================
// Public Interest Analysis Types
// ============================================================================

export interface PublicInterestScoreResult {
  score: number;
  factors: {
    economicScoreNormalized: number;
    socialScoreNormalized: number;
    transparency_score: number;
  };
  assessment: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
}

// ============================================================================
// Comprehensive Bill Analysis
// ============================================================================

export interface ComprehensiveBillAnalysis {
  bill_id: string;
  analysis_id: string;
  timestamp: Date;
  constitutionalAnalysis: ConstitutionalAnalysisResult;
  conflictAnalysisSummary: ConflictSummary;
  stakeholderImpact: StakeholderAnalysisResult;
  transparency_score: TransparencyScoreResult;
  publicInterestScore: PublicInterestScoreResult;
  recommendedActions: string[];
  overallConfidence: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetComprehensiveAnalysisParams {
  bill_id: string;
  force?: boolean;
}

export interface TriggerAnalysisParams {
  bill_id: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notify_on_complete?: boolean;
}

export interface GetAnalysisHistoryParams {
  bill_id: string;
  limit?: number;
  offset?: number;
  type?: 'all' | 'comprehensive' | 'constitutional' | 'stakeholder' | 'transparency';
}

export interface AnalysisHistoryEntry {
  analysis_id: string;
  bill_id: string;
  analysis_type: string;
  timestamp: Date;
  confidence: number;
  summary?: string;
}
