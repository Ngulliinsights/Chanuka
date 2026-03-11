/**
 * Sponsors Feature Types
 * Client-side type definitions for sponsors functionality
 */

// ============================================================================
// Core Sponsor Types
// ============================================================================

export interface Sponsor {
  id: number;
  name: string;
  party: string;
  role?: string | null;
  constituency?: string | null;
  contact_info?: string | null;
  is_active: boolean;
  transparency_score?: number | null;
  financial_exposure?: number | null;
  voting_alignment?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorSearchOptions {
  party?: string;
  role?: string;
  constituency?: string;
  conflict_level?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'party' | 'transparency_score' | 'financial_exposure';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Affiliation Types
// ============================================================================

export interface SponsorAffiliation {
  id: number;
  sponsor_id: number;
  organization: string;
  role?: string | null;
  type: string;
  conflictType?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface SponsorAffiliationInput {
  sponsor_id: number;
  organization: string;
  role?: string | null;
  type: string;
  conflictType?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

// ============================================================================
// Transparency Types
// ============================================================================

export interface SponsorTransparency {
  id: number;
  sponsor_id: number;
  disclosure?: string | null;
  disclosureType?: string | null;
  description: string;
  amount?: number | null;
  source?: string | null;
  dateReported?: string | null;
  is_verified?: boolean | null;
}

export interface SponsorTransparencyInput {
  sponsor_id: number;
  disclosureType: string;
  description: string;
  amount?: string | number | null;
  source?: string | null;
  dateReported?: string | null;
  is_verified?: boolean;
}

// ============================================================================
// Conflict Analysis Types
// ============================================================================

export type ConflictType =
  | 'financial_direct'
  | 'financial_indirect'
  | 'organizational'
  | 'family_business'
  | 'voting_pattern'
  | 'timing_suspicious'
  | 'disclosure_incomplete';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConflictDetectionResult {
  conflictId: string;
  sponsor_id: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedBills: number[];
  financialImpact: number;
  detectedAt: string;
  confidence: number;
  evidence: string[];
  relatedAffiliationId?: number;
  relatedTransparencyId?: number;
}

export interface RiskProfile {
  overallScore: number;
  level: ConflictSeverity;
  breakdown: {
    financialRisk: number;
    affiliationRisk: number;
    transparencyRisk: number;
    behavioralRisk: number;
  };
  recommendations: string[];
}

// ============================================================================
// Network Visualization Types
// ============================================================================

export interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflict_level: ConflictSeverity;
  size: number;
  color: string;
  metadata?: Record<string, unknown>;
}

export interface ConflictEdge {
  source: string;
  target: string;
  type: ConflictType;
  weight: number;
  severity: ConflictSeverity;
  label?: string;
}

export interface ConflictCluster {
  id: string;
  members: string[];
  centerNode: string;
  conflictDensity: number;
  riskLevel: ConflictSeverity;
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  clustering: number;
  centralityScores: Record<string, number>;
  riskDistribution: Record<ConflictSeverity, number>;
}

export interface ConflictMapping {
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  clusters: ConflictCluster[];
  metrics: NetworkMetrics;
}

// ============================================================================
// Trend Analysis Types
// ============================================================================

export interface ConflictPrediction {
  bill_id: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
}

export interface ConflictTrend {
  sponsor_id: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  risk_score: number;
  predictions: ConflictPrediction[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedSponsorsResponse {
  data: Sponsor[];
  count: number;
  total?: number;
  page?: number;
  limit?: number;
}

export interface SponsorStatistics {
  total: number;
  active: number;
  parties: number;
  constituencies: number;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

export interface SponsorsQueryParams {
  page?: number;
  limit?: number;
  query?: string;
  party?: string;
  role?: string;
  constituency?: string;
  is_active?: boolean;
  sortBy?: 'name' | 'party' | 'transparency_score' | 'financial_exposure';
  sortOrder?: 'asc' | 'desc';
}