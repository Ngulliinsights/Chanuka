/**
 * Shared types for the conflict detection system
 */
import { z } from 'zod';

export const AnalyzeSponsorConflictsSchema = z.object({
  sponsor_id: z.number().int().positive(),
  bill_id: z.number().int().positive().optional()
});

export type AnalyzeSponsorConflictsInput = z.infer<typeof AnalyzeSponsorConflictsSchema>;

/**
 * Represents a comprehensive conflict of interest analysis for a sponsor
 */
export interface ConflictAnalysis { sponsor_id: number;
  sponsorName: string;
  bill_id?: number;
  billTitle?: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  financialConflicts: FinancialConflict[];
  professionalConflicts: ProfessionalConflict[];
  votingAnomalies: VotingAnomaly[];
  transparency_score: number;
  transparencyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
  lastAnalyzed: Date;
  confidence: number;
 }

/**
 * Represents a financial conflict arising from investments, employment, or family interests
 */
export interface FinancialConflict {
  id: string;
  type: 'direct_investment' | 'indirect_investment' | 'employment' | 'consulting' | 'board_position' | 'family_interest';
  organization: string;
  description: string;
  financialValue: number;
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedBills: number[];
  billSections: string[];
  evidenceStrength: number;
  detectionMethod: 'disclosure_analysis' | 'pattern_matching' | 'cross_reference' | 'manual_review';
  lastUpdated: Date;
}

/**
 * Represents a professional conflict from roles or affiliations
 */
export interface ProfessionalConflict {
  id: string;
  type: 'leadership_role' | 'advisory_position' | 'ownership_stake' | 'family_business';
  organization: string;
  role: string;
  description: string;
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedBills: number[];
  relationshipStrength: number;
  start_date?: Date;
  end_date?: Date;
  is_active: boolean;
  evidenceStrength: number;
  detectionMethod: 'affiliation_analysis' | 'pattern_matching' | 'disclosure_analysis';
  lastUpdated: Date;
}

/**
 * Represents a voting behavior anomaly that could indicate a conflict of interest
 */
export interface VotingAnomaly { id: string;
  type: 'party_deviation' | 'pattern_inconsistency' | 'financial_correlation' | 'timing_suspicious';
  bill_id: number;
  billTitle: string;
  expectedBehavior: string;
  actualBehavior: string;
  description: string;
  contextFactors: string[];
  anomalyScore: number;
  detectionDate: Date;
 }

/**
 * Configuration for conflict detection thresholds and weights
 */
export interface ConflictDetectionConfig {
  financialThresholds: {
    direct: number;
    indirect: number;
    family: number;
  };
  professionalWeights: {
    leadership: number;
    advisory: number;
    ownership: number;
  };
  votingAnomalyThresholds: {
    partyDeviation: number;
    patternInconsistency: number;
  };
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Stakeholder information
 */
export interface Stakeholder {
  id: string;
  name: string;
  type: 'individual' | 'organization' | 'industry' | 'government';
  interests: StakeholderInterest[];
  influence: number;
  transparency: number;
}

/**
 * Stakeholder interest in a bill or issue
 */
export interface StakeholderInterest { bill_id?: number;
  issueArea: string;
  position: 'support' | 'oppose' | 'neutral';
  strength: number;
  financialImpact?: number;
  description: string;
 }

/**
 * Validated vote data
 */
export interface ValidatedVote { vote: 'yes' | 'no';
  bill_id: number;
  billTitle: string;
  billCategory: string;
  confidence?: number;
  partyPosition?: string;
 }

/**
 * Category statistics for voting analysis
 */
export interface CategoryStats {
  yes: number;
  no: number;
  votes: ValidatedVote[];
}

/**
 * Custom error class for conflict detection
 */
export class ConflictDetectionError extends Error { constructor(
    message: string,
    public readonly code: string,
    public readonly sponsor_id?: number,
    public readonly bill_id?: number
  ) {
    super(message);
    this.name = 'ConflictDetectionError';
   }
}

/**
 * Type guard for vote validation
 */
export function isValidVote(vote: unknown): vote is ValidatedVote {
  if (!vote || typeof vote !== 'object') return false;
  const v = vote as Record<string, unknown>;
  return typeof v.vote === 'string' &&
    (v.vote === 'yes' || v.vote === 'no') &&
    typeof v.bill_id === 'number' &&
    typeof v.billTitle === 'string';
}


