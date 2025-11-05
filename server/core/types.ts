// Prefer canonical types from shared schema as single source of truth.
// Import the user-related types and expose small local aliases when convenient.
import type {
  User as SharedUser,
  InsertUser as SharedInsertUser,
  UserProgress as SharedUserProgress,
  InsertUserProgress as SharedInsertUserProgress,
  UserSocialProfile as SharedUserSocialProfile,
} from '@shared/schema/types';

export type User = SharedUser;
export type InsertUser = SharedInsertUser;
export type UserProgress = SharedUserProgress;
export type InsertUserProgress = SharedInsertUserProgress;
export type SocialProfile = SharedUserSocialProfile;

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
  metadata?: Record<string, any>;
  votingHistory?: Array<{ bill_id: number; vote: 'yes' | 'no' | 'abstain'; date: string  }>;
  created_at: Date;
  updated_at: Date;
}

export interface InsertStakeholder {
  name: string;
  email?: string | null;
  organization?: string | null;
  sector?: string | null;
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
  shareDate?: Date;
  likes?: number;
  shares?: number;
  comments?: number;
  created_at: Date;
  }

export interface InsertSocialShare { bill_id: number;
  user_id: number;
  platform: string;
  metadata?: Record<string, any>;
  }

// Database tables (mock for import compatibility)
export const users = {};
export const bills = {};
export const stakeholders = {};
export const comments = {};
export const user_progress = {};
export const social_shares = {};













































