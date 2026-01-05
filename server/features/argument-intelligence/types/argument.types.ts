/**
 * Argument Intelligence Type Definitions
 */

export interface Claim {
  id: string;
  text: string;
  type: ClaimType;
  confidence: number;
  sources: string[];
  position: 'support' | 'oppose' | 'neutral';
}

export type ClaimType =
  | 'factual'
  | 'value'
  | 'policy'
  | 'interpretive'
  | 'procedural';

export interface Evidence {
  id: string;
  claimId: string;
  text: string;
  type: EvidenceType;
  quality: EvidenceQuality;
  source?: string;
  verified: boolean;
}

export type EvidenceType =
  | 'statistical'
  | 'anecdotal'
  | 'expert_opinion'
  | 'legal_precedent'
  | 'empirical_study'
  | 'constitutional_reference';

export interface EvidenceQuality {
  score: number; // 0-1
  factors: {
    credibility: number;
    relevance: number;
    recency: number;
    verifiability: number;
  };
}

export interface Argument {
  id: string;
  billId: string;
  userId: string;
  claims: Claim[];
  evidence: Evidence[];
  reasoning: string;
  strength: number;
  position: 'support' | 'oppose' | 'neutral';
  createdAt: Date;
  processedAt?: Date;
}

export interface ArgumentCluster {
  id: string;
  billId: string;
  name: string;
  description: string;
  arguments: string[]; // argument IDs
  representativeClaims: Claim[];
  size: number;
  cohesion: number; // 0-1
  position: 'support' | 'oppose' | 'mixed';
}
