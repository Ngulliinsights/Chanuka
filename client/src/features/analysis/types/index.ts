/**
 * Analysis Feature Types
 *
 * Types for conflict of interest analysis, financial transparency,
 * and sponsor relationship analysis
 * Following Feature-Sliced Design principles with co-located types
 */

export interface FinancialInterest {
  id: string;
  source: string;
  amount: number;
  industry: string;
  category: 'donation' | 'investment' | 'employment' | 'contract' | 'gift';
  date: string;
  description: string;
  verified: boolean;
}

export interface OrganizationalConnection {
  id: string;
  organizationName: string;
  organizationType: 'corporation' | 'nonprofit' | 'lobbyist' | 'trade_association' | 'government';
  connectionType: 'board_member' | 'employee' | 'consultant' | 'donor' | 'partner';
  strength: number;
  startDate: string;
  endDate?: string;
  description: string;
  verified: boolean;
}

export interface VotingPattern {
  billId: string;
  billTitle: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  date: string;
  relatedIndustries: string[];
  financialCorrelation: number;
}

export interface TransparencyScore {
  overall: number;
  financialDisclosure: number;
  votingHistory: number;
  industryConnections: number;
  methodology: string;
  lastUpdated: string;
}

export interface ConflictAnalysis {
  sponsorId: number;
  sponsorName: string;
  financialInterests: FinancialInterest[];
  organizationalConnections: OrganizationalConnection[];
  votingPatterns: VotingPattern[];
  transparencyScore: TransparencyScore;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'sponsor' | 'organization' | 'industry' | 'bill';
  size: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type: 'financial' | 'organizational' | 'voting' | 'industry';
  amount?: number;
  description: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface ImplementationWorkaround {
  id: string;
  originalProvision: string;
  workaroundMethod: string;
  implementationDate: string;
  effectiveness: number;
  relatedInterests: string[];
  description: string;
}

export interface ConflictVisualizationProps {
  conflictAnalysis: ConflictAnalysis;
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export interface AccessibilityFallbackData {
  sponsors: Array<{
    name: string;
    riskLevel: string;
    financialInterests: number;
    organizationalConnections: number;
    transparencyScore: number;
  }>;
  connections: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
    description: string;
  }>;
  summary: {
    totalConnections: number;
    highRiskConnections: number;
    averageTransparencyScore: number;
    topIndustries: string[];
  };
}
