// Prefer canonical types from shared schema as single source of truth.
// Import the user-related types and expose small local aliases when convenient.
import type {
  User as SharedUser,
  InsertUser as SharedInsertUser,
  UserProgress as SharedUserProgress,
  InsertUserProgress as SharedInsertUserProgress,
  UserSocialProfile as SharedUserSocialProfile,
} from '../../shared/schema/types';

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
  viewCount?: number;
  shareCount?: number;
  dueDate?: Date | null;
  requiresAction?: boolean | null;
  urgency?: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  viewCount?: number;
  shareCount?: number;
  tags?: string[];
}

// Stakeholder-related types
export interface Stakeholder {
  id: number;
  name: string;
  email: string | null;
  organization: string | null;
  sector: string | null;
  influence?: string;
  biography?: string | null;
  phone?: string | null;
  office?: string | null;
  metadata?: Record<string, any>;
  votingHistory?: Array<{ billId: number; vote: 'yes' | 'no' | 'abstain'; date: string }>;
  createdAt: Date;
  updatedAt: Date;
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
export interface BillComment {
  id: number;
  billId: number;
  userId: number;
  content: string;
  parentId: number | null;
  endorsements: number;
  isHighlighted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertBillComment {
  billId: number;
  userId: number;
  content: string;
  parentId?: number | null;
}

// Progress-related types
/*
  Other domain types (Bill, Stakeholder, etc.) remain defined locally here
  for now. If you want, we can also import these from shared/schema to
  centralize everything. I left them in place to minimize risk and scope.
*/

// Social sharing types
export interface SocialShare {
  id: number;
  billId: number;
  userId: number;
  platform: string;
  metadata?: Record<string, any>;
  shareDate?: Date;
  likes?: number;
  shares?: number;
  comments?: number;
  createdAt: Date;
}

export interface InsertSocialShare {
  billId: number;
  userId: number;
  platform: string;
  metadata?: Record<string, any>;
}

// Database tables (mock for import compatibility)
export const users = {};
export const bills = {};
export const stakeholders = {};
export const billComments = {};
export const userProgress = {};
export const socialShares = {};












































