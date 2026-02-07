/**
 * Analysis Feature Types
 * Type definitions for analysis features
 */

export interface ConflictOfInterestAnalysisProps {
  sponsorId: string;
  billId?: string;
  showDetails?: boolean;
  onConflictDetected?: (conflicts: ConflictOfInterest[]) => void;
}

export interface ConflictOfInterest {
  id: string;
  sponsorId: string;
  billId: string;
  type: 'financial' | 'political' | 'personal';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
}

export interface ConflictAnalysis {
  conflicts: ConflictOfInterest[];
  score: number;
  summary: string;
}

export interface FinancialInterest {
  id: string;
  sponsorId: string;
  type: 'donation' | 'investment' | 'employment' | 'other';
  amount: number;
  source: string;
  date: Date;
}

export interface VotingPattern {
  billId: string;
  vote: 'yes' | 'no' | 'abstain';
  date: Date;
  alignment: number;
}

export interface TransparencyScore {
  overall: number;
  disclosure: number;
  funding: number;
  voting: number;
}

export interface NetworkNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  connections: string[];
}

export interface TransparencyAnalysis {
  score: number;
  factors: {
    disclosure: number;
    funding: number;
    voting: number;
  };
  recommendations: string[];
}

export interface PatternAnalysis {
  patterns: Array<{
    type: string;
    frequency: number;
    significance: number;
  }>;
  insights: string[];
}


export interface AnalysisResult {
  id: string;
  type: string;
  score: number;
  data: any;
}

export interface SponsorAnalysis {
  sponsorId: string;
  conflicts: ConflictOfInterest[];
  transparency: TransparencyScore;
  votingPatterns: VotingPattern[];
}

export interface BillAnalysis {
  billId: string;
  complexity: number;
  impact: string[];
  stakeholders: string[];
}

export interface NetworkLink {
  source: string;
  target: string;
  type: 'financial' | 'political' | 'organizational';
  strength: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface OrganizationalConnection {
  organizationId: string;
  organizationName: string;
  role: string;
  startDate: Date;
  endDate?: Date;
}

export interface ImplementationWorkaround {
  id: string;
  type: string;
  description: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface ConflictVisualizationProps {
  data: NetworkData;
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
}

export interface AccessibilityFallbackData {
  summary: string;
  details: string[];
  recommendations: string[];
}
