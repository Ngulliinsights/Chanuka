// ============================================================================
// CONSTITUTIONAL ANALYSIS - Type Definitions
// ============================================================================
// Shared types and interfaces for the constitutional analysis feature

import { ConstitutionalAnalysis,ConstitutionalProvision, LegalPrecedent } from '@server/infrastructure/schema/index.js';

// ============================================================================
// Analysis Request & Response Types
// ============================================================================

export interface AnalysisRequest {
  bill_id: string;
  billTitle: string;
  billContent: string;
  billType?: string;
  urgentAnalysis?: boolean;
}

export interface AnalysisResult {
  bill_id: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  overallConfidence: number; // 0-100
  analyses: ConstitutionalAnalysis[];
  flaggedForExpertReview: boolean;
  summary: {
    totalProvisions: number;
    highRiskCount: number;
    lowConfidenceCount: number;
    requiresUrgentReview: boolean;
  };
  processingTime: number;
}

// ============================================================================
// Provision Matching Types
// ============================================================================

export interface ProvisionMatch {
  provision: ConstitutionalProvision;
  relevanceScore: number; // 0-100
  matchedKeywords: string[];
  contextSnippets: string[];
  matchType: 'keyword' | 'semantic' | 'structural';
}

export interface ProvisionSearchCriteria {
  keywords: string[];
  rightsCategories?: string[];
  articleNumbers?: number[];
  minRelevanceScore?: number;
  maxResults?: number;
}

// ============================================================================
// Precedent Matching Types
// ============================================================================

export interface PrecedentMatch {
  precedent: LegalPrecedent;
  relevanceScore: number; // 0-100
  bindingLevel: 'binding' | 'persuasive' | 'informational';
  matchFactors: {
    keywordMatches: string[];
    conceptualSimilarity: number;
    courtHierarchyWeight: number;
    citationFrequency: number;
  };
}

export interface PrecedentSearchCriteria {
  provisionId?: string;
  keywords: string[];
  courtLevels?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  minRelevanceScore?: number;
  maxResults?: number;
}

// ============================================================================
// Expert Review Types
// ============================================================================

export interface ExpertReviewFlag {
  analysis_id: string;
  bill_id: string;
  flagReason: 'low_confidence' | 'high_risk' | 'complex_precedents' | 'novel_issue' | 'conflicting_analysis';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedReviewTime: number; // minutes
  requiredExpertise: string[];
  flaggedAt: Date;
  assignedExpert?: string;
  reviewDeadline?: Date;
}

export interface ExpertReviewCriteria {
  minConfidenceThreshold: number;
  riskLevelsRequiringReview: string[];
  complexityFactors: {
    maxPrecedentConflicts: number;
    maxAnalysisUncertainty: number;
    novelIssueDetection: boolean;
  };
}

// ============================================================================
// Analysis Configuration Types
// ============================================================================

export interface AnalysisConfiguration {
  provisionMatching: {
    keywordWeighting: number;
    semanticWeighting: number;
    structuralWeighting: number;
    minRelevanceThreshold: number;
  };
  precedentAnalysis: {
    courtHierarchyWeights: {
      supreme_court: number;
      court_of_appeal: number;
      high_court: number;
      subordinate_court: number;
    };
    recencyWeighting: number;
    citationWeighting: number;
    minRelevanceThreshold: number;
  };
  riskAssessment: {
    rightsViolationMultiplier: number;
    precedentConflictMultiplier: number;
    confidencePenalty: number;
  };
  expertReview: {
    autoFlagThresholds: {
      confidence: number;
      risk: string[];
      complexity: number;
    };
    priorityCalculation: {
      urgencyFactors: string[];
      timeConstraints: number;
    };
  };
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface AnalysisSearchFilters {
  billIds?: string[];
  riskLevels?: string[];
  confidenceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
  expertReviewStatus?: 'pending' | 'in_progress' | 'completed' | 'not_required';
  analysisTypes?: string[];
}

export interface AnalysisStatistics {
  totalAnalyses: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  averageConfidence: number;
  expertReviewStats: {
    pending: number;
    inProgress: number;
    completed: number;
    averageReviewTime: number;
  };
  processingStats: {
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

// ============================================================================
// Database Query Types
// ============================================================================

export interface ProvisionQueryOptions {
  includeKeywords?: boolean;
  includeFullText?: boolean;
  sortBy?: 'relevance' | 'article_number' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PrecedentQueryOptions {
  includeHolding?: boolean;
  includeFacts?: boolean;
  sortBy?: 'relevance' | 'judgment_date' | 'citation_count';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AnalysisQueryOptions {
  includeProvision?: boolean;
  includePrecedents?: boolean;
  includeReasoningChain?: boolean;
  sortBy?: 'created_at' | 'confidence' | 'risk' | 'impact_severity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ConstitutionalAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ConstitutionalAnalysisError';
  }
}

export class ProvisionMatchingError extends ConstitutionalAnalysisError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PROVISION_MATCHING_ERROR', details);
    this.name = 'ProvisionMatchingError';
  }
}

export class PrecedentAnalysisError extends ConstitutionalAnalysisError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PRECEDENT_ANALYSIS_ERROR', details);
    this.name = 'PrecedentAnalysisError';
  }
}

export class ExpertReviewError extends ConstitutionalAnalysisError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'EXPERT_REVIEW_ERROR', details);
    this.name = 'ExpertReviewError';
  }
}


