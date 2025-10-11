// Define all the types that were previously imported from @shared/schema

// User-related types
export interface User {
  id: number;
  username: string;
  email: string;
  expertise: string | null;
  onboardingCompleted: boolean;
  googleId: string | null;
  avatarUrl: string | null;
  reputation: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin' | 'expert';
  socialProfiles: SocialProfile[];
}

export interface InsertUser {
  username: string;
  email: string;
  password?: string;
  role?: 'user' | 'admin' | 'expert';
  expertise?: string | null;
  onboardingCompleted?: boolean;
  googleId?: string | null;
  avatarUrl?: string | null;
}

export interface SocialProfile {
  id?: number;
  userId?: number;
  platform: string;
  profileId: string;
  username: string;
  avatarUrl?: string;
  createdAt?: Date;
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
export interface UserProgress {
  id: number;
  userId: number;
  achievementType: string;
  achievementValue: number;
  level?: string | null;
  badge?: string | null;
  description?: string | null;
  unlockedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface InsertUserProgress {
  userId: number;
  achievementType: string;
  achievementValue: number;
  level?: string | null;
  badge?: string | null;
  description?: string | null;
  metadata?: Record<string, any>;
}

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







