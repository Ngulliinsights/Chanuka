/**
 * Sponsorship Analysis Types
 * 
 * Domain-specific types for sponsor conflict analysis, financial exposure, and transparency scoring.
 * Migrated from shared/types/bills.ts to maintain proper domain boundaries.
 */

import type {
  BillSection,
  Sponsor,
  FinancialBreakdown,
  TimelineEvent,
  ImplementationWorkarounds,
  AnalysisMethodology
} from '../../types/common.js';

export interface SponsorshipAnalysis { bill_id: number;
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
