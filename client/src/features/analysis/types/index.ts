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
  connections?: string[]; // Array of connected node IDs
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
  originalBillId: string;
  workaroundBillId: string;
  originalBillTitle: string;
  workaroundBillTitle: string;
  detectionReason: string;
  similarityScore: number;

  // Enhanced workaround type classification for Kenyan context
  workaroundType:
    | 'legislative_repackaging'
    | 'executive_directive'
    | 'regulatory_implementation'
    | 'budget_allocation'
    | 'emergency_powers'
    | 'administrative_circular'
    | 'judicial_interpretation'
    | 'county_bypass'
    | 'multi_ministry_coordination'
    | 'statutory_instrument';

  // Enhanced bypass mechanism details for Kenyan governance
  bypassMechanism: {
    primaryTactic: string;
    institutionalLevel: 'national' | 'county' | 'sub_county' | 'multi_level';
    branchOfGovernment: 'legislature' | 'executive' | 'judiciary' | 'multi_branch';
    timingStrategy: 'immediate' | 'delayed' | 'phased' | 'conditional';
    scopeReduction: boolean;
    languageObfuscation: boolean;
    proceduralWorkaround: boolean;
  };

  similarityAnalysis: {
    textSimilarity: number;
    structuralSimilarity: number;
    intentSimilarity: number;
    keyDifferences: string[];
    commonElements: string[];
    policyObjectiveSimilarity: number;
    implementationPathSimilarity: number;
    stakeholderImpactSimilarity: number;
    enforcementMechanismSimilarity: number;
  };

  verification_status: 'pending' | 'verified' | 'rejected';
  alertStatus: 'active' | 'resolved' | 'dismissed';
  publicNotificationSent: boolean;

  // Enhanced evidence tracking for Kenyan context
  evidenceDocuments: Array<{
    type:
      | 'parliamentary_hansard'
      | 'executive_directive'
      | 'regulatory_notice'
      | 'budget_document'
      | 'administrative_circular'
      | 'court_ruling'
      | 'ministry_guidance'
      | 'gazette_notice'
      | 'statutory_instrument';
    url: string;
    description: string;
    dateIssued: string;
    issuingAuthority: string;
  }>;

  // Enhanced tracking of circumvention patterns
  circumventionPattern: {
    previousRejectionDetails: {
      rejectionType:
        | 'parliamentary_defeat'
        | 'public_opposition'
        | 'constitutional_challenge'
        | 'regulatory_review'
        | 'presidential_assent_delay'
        | 'high_court_ruling'
        | 'senate_rejection';
      rejectionDate: string;
      rejectionReason: string;
      oppositionSources: string[];
    };
    workaroundStrategy: {
      authorityUsed: string;
      justificationProvided: string;
      publicParticipationBypassed: boolean;
      parliamentaryOversightBypassed: boolean;
      constitutionalConcerns: string[];
    };
  };

  communityConfirmations: number;
  reportedBy: {
    id: string;
    name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;

  // Legacy fields for backward compatibility with ImplementationWorkaroundsTracker
  originalProvision?: string;
  workaroundMethod?: string;
  implementationDate?: string;
  effectiveness?: number;
  relatedInterests?: string[];
  description?: string;
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
