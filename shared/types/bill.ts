
import type {
  Bill,
  BillStatus,
  ConflictIndicator,
  BillSection,
  Sponsor,
  SentimentAnalysis,
  Affiliation,
  TransparencyInfo,
  FinancialBreakdown,
  TimelineEvent,
  ImplementationWorkarounds,
  AnalysisMethodology
} from './common.js';

export interface BillAnalysis {
  id: number;
  billId: number;
  complexity: number;
  transparency: number;
  conflicts: ConflictIndicator[];
  sentiment: SentimentAnalysis;
  keyTerms: string[];
  summary: string;
  riskFactors: string[];
  recommendations?: string[];
  lastUpdated: Date;
  createdAt: Date;
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














































