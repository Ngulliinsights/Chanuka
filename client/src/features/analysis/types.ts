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

export interface FinancialInterestDetail {
  id: string;
  source: string;
  amount: number;
  industry: string;
  category: string;
  date: string;
  description: string;
  verified: boolean;
}

export interface OrganizationalConnectionDetail {
  id: string;
  organizationName: string;
  role: string;
  startDate: string;
  endDate?: string;
  transparencyScore: number;
}

export interface VotingPatternDetail {
  billId: string;
  billTitle: string;
  vote: 'yes' | 'no' | 'abstain';
  date: string;
  alignment: number;
  financialCorrelation?: number;
}

export interface ConflictAnalysis {
  conflicts: ConflictOfInterest[];
  score: number;
  summary: string;
  // Extended properties for UI components
  sponsorId?: string;
  sponsorName?: string;
  financialInterests?: FinancialInterestDetail[];
  organizationalConnections?: OrganizationalConnectionDetail[];
  votingPatterns?: VotingPatternDetail[];
  transparencyScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
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
  financialCorrelation?: number;
}

export interface TransparencyScore {
  overall: number;
  disclosure: number;
  funding: number;
  voting: number;
}

export interface NetworkNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill' | 'industry';
  name: string;
  connections: string[];
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
  // Visual properties
  size?: number;
  color?: string;
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
  // Extended properties for visualization
  description?: string;
  amount?: number;
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

// Re-export the comprehensive ImplementationWorkaround from types/index.ts
export type { ImplementationWorkaround } from './types/index';

export interface ConflictVisualizationProps {
  data: NetworkData;
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
}

export interface AccessibilityFallbackData {
  summary: string;
  details: string[];
  recommendations: string[];
  // Extended for network visualization
  connections?: Array<{
    from: string;
    to: string;
    relationship: string;
  }>;
}
