/**
 * Constitutional Analysis Types
 * 
 * Defines interfaces for constitutional analysis, legal precedents,
 * and civic action guidance functionality.
 */

export interface ConstitutionalFlag {
  id: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  category: string;
  description: string;
  affectedProvisions?: BillProvision[];
  constitutionalReference?: ConstitutionalReference[];
  expertAnalysis?: ExpertAnalysis[];
  communityDiscussion?: string;
}

export interface BillProvision {
  id: string;
  sectionNumber: string;
  title: string;
  content: string;
  constitutionalConcerns: string[];
}

export interface ConstitutionalReference {
  id: string;
  article: string;
  section?: string;
  title: string;
  fullText: string;
  interpretation: string;
  relevance: 'direct' | 'indirect' | 'contextual';
  historicalContext?: string;
}

export interface LegalPrecedent {
  id: string;
  caseName: string;
  court: string;
  year: number;
  citation: string;
  summary: string;
  relevanceScore: number;
  outcome: 'upheld' | 'struck_down' | 'modified' | 'remanded';
  keyPrinciples: string[];
  applicability: 'direct' | 'analogous' | 'distinguishable';
}

export interface ExpertAnalysis {
  id: string;
  expertId: string;
  analysis: string;
  confidence: number;
  methodology: string;
  sources: string[];
  lastUpdated: string;
  communityValidation: {
    upvotes: number;
    downvotes: number;
    comments: number;
    userVote?: 'up' | 'down' | null;
  };
  tags: string[];
}

export interface CivicActionStep {
  id: string;
  title: string;
  description: string;
  type: 'contact' | 'petition' | 'attend' | 'research' | 'share';
  difficulty: 'easy' | 'moderate' | 'advanced';
  timeRequired: string;
  impact: 'low' | 'medium' | 'high';
  resources?: Array<{
    title: string;
    url: string;
    type: 'guide' | 'template' | 'contact' | 'form';
  }>;
}

export interface ConstitutionalAnalysisData {
  billId: number;
  overallAssessment: {
    constitutionalityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    keyFindings: string[];
  };
  flags: ConstitutionalFlag[];
  precedents: LegalPrecedent[];
  expertConsensus: {
    agreementLevel: number;
    majorityPosition: string;
    minorityPositions: Array<{
      position: string;
      supportingExperts: number;
    }>;
  };
  civicActions: CivicActionStep[];
  lastUpdated: string;
}

export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low';
export type RelevanceType = 'direct' | 'indirect' | 'contextual';
export type ActionType = 'contact' | 'petition' | 'attend' | 'research' | 'share';
export type DifficultyLevel = 'easy' | 'moderate' | 'advanced';
export type ImpactLevel = 'low' | 'medium' | 'high';