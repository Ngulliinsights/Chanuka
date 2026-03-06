/**
 * MWANGA Stack Type Definitions
 * Shared types for ML/AI models
 */

// ============================================================================
// Common Types
// ============================================================================

export type AnalysisTier = 'tier1' | 'tier2' | 'tier3';

export interface TierResult<T> {
  result: T;
  tier: AnalysisTier;
  confidence: number;
  latencyMs: number;
  cached: boolean;
}

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  modelType: string;
  lastUpdated: Date;
}

// ============================================================================
// Sentiment Analysis Types
// ============================================================================

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  scores: SentimentScores;
  language?: 'en' | 'sw' | 'mixed';
}

export interface SentimentAnalysisInput {
  text: string;
  context?: string;
  language?: 'en' | 'sw' | 'auto';
}

// ============================================================================
// Constitutional Analysis Types
// ============================================================================

export interface ConstitutionalArticle {
  article: string; // e.g., "43(1)(a)"
  title: string;
  text: string;
  similarity: number;
}

export interface ConstitutionalAnalysisResult {
  relevantArticles: ConstitutionalArticle[];
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  citations: string[];
}

export interface ConstitutionalAnalysisInput {
  billSection: string;
  billTitle?: string;
  context?: string;
}

// ============================================================================
// Trojan Bill Detection Types
// ============================================================================

export interface TrojanBillFinding {
  type: 'structural' | 'urgency' | 'consultation' | 'schedule' | 'amendment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  score: number;
}

export interface TrojanBillResult {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: TrojanBillFinding[];
  structuralAnomalyScore: number;
  urgencyManipulationScore: number;
  consultationAdequacyScore: number;
  scheduleDensityScore: number;
  amendmentComplexityScore: number;
}

export interface TrojanBillInput {
  billId: number;
  billText: string;
  metadata: {
    pageCount: number;
    consultationPeriodDays: number;
    amendmentCount: number;
    scheduleCount: number;
    urgencyDesignation?: string;
    submissionDate: Date;
  };
}

// ============================================================================
// Conflict Detection Types
// ============================================================================

export interface ConflictGraphNode {
  id: number;
  nodeType: 'sponsor' | 'company' | 'industry' | 'bill' | 'person';
  entityId: string;
  entityName: string;
  metadata: Record<string, unknown>;
}

export interface ConflictGraphEdge {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  relationshipType: 'owns' | 'employed_by' | 'sponsors' | 'regulates' | 'benefits_from';
  strength: number;
  confidence: number;
  sourceDocument?: string;
}

export interface ConflictPath {
  nodes: ConflictGraphNode[];
  edges: ConflictGraphEdge[];
  pathStrength: number;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: 'direct' | 'indirect' | 'potential';
  confidence: number;
  conflictPaths: ConflictPath[];
  narrative: string;
}

export interface ConflictDetectionInput {
  billId: number;
  sponsorId: number;
  billText?: string;
}

// ============================================================================
// Engagement Prediction Types
// ============================================================================

export interface EngagementFeatures {
  topicMatchScore: number;
  hourOfDay: number;
  dayOfWeek: number;
  urgencyLevel: number;
  contentLength: number;
  userHistoryCount: number;
  trendingScore: number;
}

export interface EngagementPredictionResult {
  engagementScore: number;
  predictedEngaged: boolean;
  features: EngagementFeatures;
  tier: 'rules' | 'model';
}

export interface EngagementPredictionInput {
  userId: number;
  billId: number;
  timestamp?: Date;
}

// ============================================================================
// Electoral Accountability Types
// ============================================================================

export interface ElectoralAccountabilityInput {
  // MP Information
  sponsorId: number;
  sponsorName: string;
  constituency: string;
  county: string;
  
  // Voting Record
  billId: number;
  billTitle: string;
  mpVote: 'yes' | 'no' | 'abstain';
  voteDate: Date;
  
  // Constituency Sentiment
  constituentSupport: number; // 0-100
  constituentOppose: number; // 0-100
  constituentNeutral: number; // 0-100
  sampleSize: number;
  confidenceLevel: number; // 0-1
  
  // Electoral Context
  daysUntilElection: number;
  previousElectionMargin?: number;
  
  // Historical Context (optional)
  mpHistoricalAlignment?: number; // 0-100
  billUrgency?: 'routine' | 'normal' | 'urgent' | 'emergency';
}

export interface ElectoralAccountabilityResult {
  // Gap Analysis
  alignmentGap: number; // 0-100
  gapSeverity: 'low' | 'medium' | 'high' | 'critical';
  isMisaligned: boolean;
  
  // Positions
  constituentPosition: 'support' | 'oppose' | 'neutral';
  representativeVote: 'yes' | 'no' | 'abstain';
  
  // Electoral Risk
  electoralRiskScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  
  // Predictions
  voteChangeLikelihood: number; // 0-1
  campaignSuccessProbability: number; // 0-1
  electoralImpact: 'negligible' | 'minor' | 'moderate' | 'significant' | 'critical';
  
  // Recommendations
  recommendations: string[];
  suggestedActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }>;
  
  // Narrative
  summary: string;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class MLModelError extends Error {
  constructor(
    message: string,
    public readonly modelName: string,
    public readonly tier: AnalysisTier,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MLModelError';
  }
}

export class TierFallbackError extends Error {
  constructor(
    message: string,
    public readonly failedTier: AnalysisTier,
    public readonly fallbackTier: AnalysisTier
  ) {
    super(message);
    this.name = 'TierFallbackError';
  }
}
