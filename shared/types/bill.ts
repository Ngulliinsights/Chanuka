
export interface BillAnalysis {
  billId: number;
  complexity: number;
  transparency: number;
  conflicts: ConflictIndicator[];
  sentiment: SentimentAnalysis;
  keyTerms: string[];
  summary: string;
  riskFactors: string[];
  lastUpdated: Date;
}

export interface ConflictIndicator {
  type: 'financial' | 'political' | 'personal' | 'professional';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  section: string;
}

export interface SentimentAnalysis {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SponsorshipAnalysis {
  billId: number;
  title: string;
  number: string;
  introduced: string;
  status: string;
  primarySponsor: Sponsor;
  coSponsors: Sponsor[];
  totalFinancialExposure: number;
  industryAlignment: number;
  sections: BillSection[];
  financialBreakdown: FinancialBreakdown;
  timeline: TimelineEvent[];
  implementationWorkarounds?: ImplementationWorkarounds;
  methodology: AnalysisMethodology;
}

export interface Sponsor {
  id: string;
  name: string;
  role: string;
  party: string;
  constituency: string;
  conflictLevel: 'low' | 'medium' | 'high' | 'critical';
  financialExposure: number;
  affiliations: Affiliation[];
  votingAlignment: number;
  transparency: TransparencyInfo;
  sections?: BillSection[];
}

export interface Affiliation {
  organization: string;
  role: string;
  type: 'committee' | 'professional' | 'financial' | 'board' | 'advisory' | 'executive' | 'political' | 'academic';
  conflictType: 'direct' | 'indirect' | 'minor';
}

export interface TransparencyInfo {
  disclosure: 'complete' | 'partial' | 'none';
  lastUpdated: string;
  publicStatements: number;
}

export interface BillSection {
  number: string;
  title: string;
  conflictLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsors?: string[];
  description: string;
}

export interface FinancialBreakdown {
  primarySponsor: number;
  coSponsorsTotal: number;
  industryContributions: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  type: 'financial' | 'governance' | 'legislative';
}

export interface ImplementationWorkarounds {
  totalImplemented: number;
  totalExecutiveOrders: number;
  totalCourtChallenges: number;
  lastUpdated: string;
  implementations: WorkaroundImplementation[];
}

export interface WorkaroundImplementation {
  id: string;
  type: string;
  title: string;
  dateImplemented: string;
  status: 'active' | 'under-review' | 'blocked';
  originalProvisions: string[];
  similarityScore: number;
  courtChallenges: CourtChallenge[];
}

export interface CourtChallenge {
  case: string;
  status: string;
  keyArgument: string;
  hearingDate: string;
}

export interface AnalysisMethodology {
  verificationSources: VerificationSource[];
  analysisStages: string[];
}

export interface VerificationSource {
  name: string;
  weight: number;
  reliability: 'high' | 'medium' | 'low';
}

export interface Bill {
  id: number;
  title: string;
  number: string;
  introduced_date: Date;
  status: string;
  summary?: string;
  full_text?: string;
  transparency_score?: number;
  conflict_indicators?: any;
  sections?: any[];
}
