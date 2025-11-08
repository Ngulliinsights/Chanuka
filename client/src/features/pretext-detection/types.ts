// Core types for Pretext Detection & Civic Remediation Suite

export interface PretextScore {
  billId: string;
  score: number; // 0-100
  confidence: number; // 0-1
  lastUpdated: Date;
  indicators: {
    timing: {
      score: number;
      description: string;
      evidence: string[];
    };
    beneficiaryMismatch: {
      score: number;
      description: string;
      evidence: string[];
    };
    scopeCreep: {
      score: number;
      description: string;
      evidence: string[];
    };
    networkCentrality: {
      score: number;
      description: string;
      evidence: string[];
    };
  };
  rationale: string[];
  sources: Source[];
  reviewStatus: 'pending' | 'verified' | 'disputed' | 'archived';
  reviewedBy?: string;
  reviewDate?: Date;
}

export interface Source {
  id: string;
  type: 'hansard' | 'news' | 'procurement' | 'social_media' | 'court_record';
  title: string;
  url: string;
  date: Date;
  credibility: number; // 0-1
  excerpt?: string;
}

export interface BillAnalysis {
  billId: string;
  title: string;
  sponsor: string;
  introducedDate: Date;
  status: string;
  pretextScore?: PretextScore;
  timeline: TimelineEvent[];
  stakeholders: Stakeholder[];
  relatedEvents: RelatedEvent[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: 'crisis' | 'bill_introduced' | 'amendment' | 'procurement' | 'media_coverage';
  title: string;
  description: string;
  sources: Source[];
  significance: 'low' | 'medium' | 'high';
}

export interface Stakeholder {
  id: string;
  name: string;
  type: 'politician' | 'company' | 'organization';
  role: string;
  connections: Connection[];
  financialInterests?: FinancialInterest[];
}

export interface Connection {
  targetId: string;
  type: 'donor' | 'contractor' | 'board_member' | 'family' | 'business_partner';
  strength: number; // 0-1
  verified: boolean;
  sources: Source[];
}

export interface FinancialInterest {
  type: 'contract' | 'donation' | 'asset' | 'shareholding';
  amount?: number;
  currency?: string;
  date: Date;
  description: string;
  sources: Source[];
}

export interface RelatedEvent {
  id: string;
  type: 'protest' | 'crisis' | 'scandal' | 'election';
  title: string;
  date: Date;
  description: string;
  correlation: number; // -1 to 1
  sources: Source[];
}

export interface CivicAction {
  id: string;
  type: 'foi' | 'petition' | 'complaint' | 'public_participation';
  title: string;
  description: string;
  template: string;
  requiredFields: FormField[];
  localContacts: Contact[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  successRate?: number;
}

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: string;
}

export interface Contact {
  id: string;
  name: string;
  type: 'legal_aid' | 'government_office' | 'cso' | 'media';
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  location: {
    county: string;
    constituency?: string;
    coordinates?: [number, number];
  };
  services: string[];
  availability: string;
}

export interface RightsCard {
  id: string;
  scenario: 'arrest' | 'accident' | 'corruption_report' | 'small_claims';
  title: string;
  description: string;
  steps: RightsStep[];
  contacts: Contact[];
  language: 'en' | 'sw' | 'other';
  lastUpdated: Date;
}

export interface RightsStep {
  order: number;
  title: string;
  description: string;
  critical: boolean;
  timeframe?: string;
  legalBasis?: string;
}

export interface UserSubmission {
  id: string;
  type: 'suspicious_pattern' | 'correction' | 'additional_evidence';
  billId?: string;
  description: string;
  evidence: Source[];
  submittedAt: Date;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  anonymous: boolean;
  userId?: string;
}

export interface AnalysisConfig {
  weights: {
    timing: number;
    beneficiaryMismatch: number;
    scopeCreep: number;
    networkCentrality: number;
  };
  thresholds: {
    flagging: number; // minimum score to flag
    highRisk: number; // score for high-risk classification
    reviewRequired: number; // score requiring human review
  };
  timeWindows: {
    crisisToBill: number; // days
    billToContract: number; // days
    mediaCoordination: number; // days
  };
}