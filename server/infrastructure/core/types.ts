// TODO: Fix import when shared/schema/types is available
// For now, define types locally
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface InsertUser {
  username: string;
  email: string;
  role?: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  achievement_type: string;
  progress_value: number;
  created_at: Date;
  updated_at: Date;
}

export interface InsertUserProgress {
  user_id: string;
  achievement_type: string;
  progress_value: number;
}

export interface SocialProfile {
  platform: string;
  profile_id: string;
  username: string;
}

// Bill-related types
export interface Bill {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'introduced' | 'committee' | 'passed' | 'enacted' | 'failed';
  content: string;
  summary: string;
  dateIntroduced: Date | null;
  proposedDate: Date | null;
  lastUpdated: Date | null;
  votingDate: Date | null;
  stakeholderIds: number[] | null;
  view_count?: number;
  share_count?: number;
  due_date?: Date | null;
  requiresAction?: boolean | null;
  urgency?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsertBill {
  title: string;
  description: string;
  status: 'draft' | 'introduced' | 'committee' | 'passed' | 'enacted' | 'failed';
  content: string;
  summary: string;
  dateIntroduced?: Date | null;
  proposedDate?: Date | null;
  votingDate?: Date | null;
  stakeholderIds?: number[] | null;
  view_count?: number;
  share_count?: number;
  tags?: string[];
}

// Stakeholder-related types
export interface Stakeholder { id: number;
  name: string;
  email: string | null;
  organization: string | null;
  sector: string | null;
  influence?: string;
  biography?: string | null;
  phone?: string | null;
  office?: string | null;
  metadata?: Record<string, unknown>;
  votingHistory?: Array<{ bill_id: number; vote: 'yes' | 'no' | 'abstain'; date: string  }>;
  created_at: Date;
  updated_at: Date;
}

export interface InsertStakeholder {
  name: string;
  email?: string | null;
  organization?: string | null;
  sector?: string | null;
  metadata?: Record<string, unknown>;
  influence?: string;
  biography?: string | null;
  phone?: string | null;
  office?: string | null;
}

// Comment-related types
export interface BillComment { id: number;
  bill_id: number;
  user_id: number;
  content: string;
  parent_id: number | null;
  endorsements: number;
  isHighlighted: boolean;
  created_at: Date;
  updated_at: Date;
  }

export interface InsertBillComment { bill_id: number;
  user_id: number;
  content: string;
  parent_id?: number | null;
  }

// Progress-related types
/*
  Other domain types (Bill, Stakeholder, etc.) remain defined locally here
  for now. If you want, we can also import these from shared/schema to
  centralize everything. I left them in place to minimize risk and scope.
*/

// Social sharing types
export interface SocialShare { id: number;
  bill_id: number;
  user_id: number;
  platform: string;
  metadata?: Record<string, unknown>;
  shareDate?: Date;
  likes?: number;
  shares?: number;
  comments?: number;
  created_at: Date;
  }

export interface InsertSocialShare { bill_id: number;
  user_id: number;
  platform: string;
  metadata?: Record<string, unknown>;
  }

// Database tables (mock for import compatibility)
export const users = {};
export const bills = {};
export const stakeholders = {};
export const comments = {};
export const user_progress = {};
export const social_shares = {};














































