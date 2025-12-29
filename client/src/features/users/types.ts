// Users feature types
import { User, Bill } from '@client/shared/types';
import { BillRecommendation } from '@client/shared/types/user-dashboard';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  billTrackingAlerts: boolean;
  commentReplies: boolean;
  weeklyDigest: boolean;
}

export interface VerificationStatus {
  citizen: VerificationLevel;
  expert: VerificationLevel;
  documents: VerificationDocument[];
  lastVerifiedAt?: string;
  expires_at?: string;
}

export interface VerificationDocument {
  id: string;
  type: 'id' | 'license' | 'passport' | 'certificate' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  url: string;
  notes?: string;
}

export type VerificationLevel = 'unverified' | 'pending' | 'verified' | 'expert';

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  website?: string;
  github?: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showEmail: boolean;
  showPhone: boolean;
  showActivity: boolean;
  allowMessaging: boolean;
}

export interface NotificationPreferences {
  email: {
    bills: boolean;
    comments: boolean;
    system: boolean;
    marketing: boolean;
  };
  push: {
    bills: boolean;
    comments: boolean;
    system: boolean;
  };
  sms: {
    urgent: boolean;
    verification: boolean;
  };
}

// API request/response types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  expertise?: string[];
  socialLinks?: Partial<SocialLinks>;
}

export interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  billTrackingAlerts?: boolean;
  commentReplies?: boolean;
  weeklyDigest?: boolean;
}

export interface VerificationRequest {
  documents: File[];
  type: 'citizen' | 'expert';
  notes?: string;
}

// Response types
export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}

export interface ProfileResponse {
  profile: UserProfile;
  isComplete: boolean;
}

export interface VerificationResponse {
  status: VerificationStatus;
  message: string;
  nextSteps?: string[];
}

// Additional types for consolidated API features
export interface SavedBillsFilters {
  status?: string;
  urgency?: string;
  tags?: string[];
  policyArea?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SavedBillsResponse {
  bills: Bill[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface EngagementHistoryFilters {
  action_type?: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type?: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  date_from?: string;
  date_to?: string;
}

export interface EngagementHistoryItem {
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EngagementHistoryResponse {
  history: EngagementHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  analytics: {
    most_active_day: string;
    total_actions: number;
    action_breakdown: Record<string, number>;
    entity_breakdown: Record<string, number>;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  joined_date: string;
  civic_score: number;
  badge_count: number;
  verification_status: 'unverified' | 'verified' | 'expert';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned_at: string;
  category: 'participation' | 'quality' | 'influence' | 'consistency';
  icon?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  threshold: number;
  current_progress: number;
  target_date?: string;
  reward?: string;
}

export interface Notification {
  id: string;
  type: 'bill_status' | 'new_comment' | 'expert_analysis' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
}

export interface DashboardData {
  profile: UserProfile;
  recent_activity: EngagementHistoryItem[];
  saved_bills: Bill[];
  trending_bills: Bill[];
  recommendations: BillRecommendation[];
  notifications: Notification[];
  civic_score_trend: Array<{ date: string; score: number }>;
  achievements_progress: {
    recent_badges: Achievement[];
    next_milestones: Milestone[];
  };
}





































