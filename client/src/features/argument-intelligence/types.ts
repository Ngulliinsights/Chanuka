/**
 * Argument Intelligence Types
 * 
 * Type definitions for argument intelligence features including
 * clustering, sentiment analysis, quality metrics, and position tracking.
 */

export interface Argument {
  id: string;
  bill_id: string;
  user_id: string;
  argument_text: string;
  argument_type: 'evidence-based' | 'normative' | 'causal' | 'comparative';
  position: 'support' | 'oppose' | 'neutral';
  strength: number;
  confidence: number;
  created_at: string;
  claims?: Claim[];
  evidence?: Evidence[];
}

export interface Claim {
  id: string;
  text: string;
  type: 'normative' | 'factual' | 'causal';
  confidence: number;
}

export interface Evidence {
  id: string;
  text: string;
  type: 'statistical' | 'expert' | 'anecdotal' | 'legal';
  credibility: number;
  source?: string;
}

export interface ArgumentCluster {
  id: string;
  name: string;
  size: number;
  position: 'support' | 'oppose' | 'neutral';
  cohesion: number;
  representativeClaims: string[];
  members: string[];
}

export interface SentimentData {
  overall: number;
  support: number;
  oppose: number;
  neutral: number;
  distribution: {
    position: 'support' | 'oppose' | 'neutral';
    count: number;
    averageSentiment: number;
  }[];
}

export interface QualityMetrics {
  clarity: number;
  evidence: number;
  reasoning: number;
  relevance: number;
  constructiveness: number;
}

export interface PositionTracking {
  userId: string;
  billId: string;
  positions: {
    timestamp: string;
    position: 'support' | 'oppose' | 'neutral';
    strength: number;
  }[];
}

export interface ArgumentStatistics {
  bill_id: string;
  totalArguments: number;
  positionBreakdown: {
    support: number;
    oppose: number;
    neutral: number;
  };
  typeBreakdown: {
    'evidence-based': number;
    normative: number;
    causal: number;
    comparative: number;
  };
  averageStrength: number;
  averageConfidence: number;
  claimsExtracted: number;
  evidenceFound: number;
  topStakeholders: {
    group: string;
    argumentCount: number;
    averageStrength: number;
  }[];
}

export interface ArgumentMapNode {
  id: string;
  type: 'argument' | 'claim' | 'evidence';
  label: string;
  position: 'support' | 'oppose' | 'neutral';
  strength: number;
}

export interface ArgumentMapEdge {
  source: string;
  target: string;
  type: 'supports' | 'opposes' | 'refutes' | 'extends';
  weight: number;
}

export interface ArgumentMap {
  nodes: ArgumentMapNode[];
  edges: ArgumentMapEdge[];
  clusters: ArgumentCluster[];
}

export interface ArgumentFilters {
  argumentType?: string;
  position?: 'support' | 'oppose' | 'neutral';
  minConfidence?: number;
  minStrength?: number;
  searchQuery?: string;
  clusterId?: string;
}

export interface ArgumentSearchResult {
  query: string;
  arguments: {
    id: string;
    text: string;
    relevance: number;
    bill_id: string;
  }[];
  count: number;
}
