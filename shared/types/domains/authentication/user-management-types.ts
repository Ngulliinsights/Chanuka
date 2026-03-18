/**
 * User Management Types
 * 
 * Server-side types for user management operations, filtering, and persistence.
 * Migrated from server/features/users/domain/* files.
 * 
 * These types define the structure for:
 * - User filtering and querying
 * - User details and statistics
 * - Activity logging
 * - Bulk operations
 * - Data exports
 * 
 * @module shared/types/domains/authentication/user-management-types
 */

import { UserRole } from '../../core/enums';

// ============================================================================
// User Profile and Preferences
// ============================================================================

/**
 * User profile data
 * Stores user biographical information and expertise
 */
export interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

/**
 * User interest data
 * Tracks topics and areas of interest for personalization
 */
export interface UserInterestData {
  interests: string[];
}

/**
 * User notification preferences
 * Stores user-specific configuration for notifications and UI
 */
export interface UserNotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  billCategories?: string[];
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Bill tracking preferences
 * Global defaults for bill notifications and filtering
 * These serve as defaults unless overridden by per-bill settings
 */
export interface BillTrackingPreferences {
  // Global defaults for which event types trigger notifications
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  
  // Global default notification frequency
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  
  // Global default enabled notification channels
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  
  // Global quiet hours settings
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone?: string; // IANA timezone string (e.g., "Africa/Nairobi")
  };
  
  // Global smart filtering settings
  smartFiltering: {
    enabled: boolean;
    interestBasedFiltering: boolean;
    priorityThreshold: 'low' | 'medium' | 'high';
    categoryFilters: string[];
    keywordFilters: string[];
    sponsorFilters: string[];
  };
  
  // Global advanced settings
  advancedSettings?: {
    digestSchedule?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number; // 0=Sun, 6=Sat for weekly
    };
  };
}

/**
 * Extended user notification preferences
 * Includes both basic and advanced notification settings
 */
export interface UserNotificationPreferences extends BillTrackingPreferences {
  // Additional notification-specific settings can be added here
}

// ============================================================================
// User Management and Querying
// ============================================================================

/**
 * Filters for user list queries
 * Used to filter, search, and page through users
 */
export interface UserManagementFilters {
  role?: UserRole | (typeof UserRole)[keyof typeof UserRole];
  status?: 'active' | 'inactive';
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Detailed user information with statistics
 * Enriched user data with engagement metrics and session info
 */
export interface UserDetails {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  profile?: UserProfileData;
  stats: {
    commentsCount: number;
    billsTracked: number;
    notificationsReceived: number;
    lastActivity: Date | null;
  };
  sessions: {
    active: number;
    lastSession: Date | null;
  };
}

/**
 * User activity log entry
 * Records user actions for audit and analytics
 */
export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Bulk user operation request
 * For performing operations on multiple users at once
 */
export interface BulkUserOperation {
  user_ids: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'changeRole';
  parameters?: {
    role?: UserRole | (typeof UserRole)[keyof typeof UserRole];
    reason?: string;
  };
}

/**
 * User export data
 * Full dataset for exporting user information
 */
export interface UserExportData {
  users: UserDetails[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    exportDate: Date;
  };
}

// ============================================================================
// User Verification and Expertise
// ============================================================================

/**
 * Citizen verification record
 * Tracks identity verification for citizen users
 */
export interface CitizenVerification {
  user_id: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: Date;
  rejected_at?: Date;
  rejection_reason?: string;
  verification_notes?: string;
  evidence?: Evidence[];
}

/**
 * Evidence for citizen verification
 * Document or data supporting identity verification
 */
export interface Evidence {
  id: string;
  type: string;
  url: string;
  uploaded_at: Date;
  verified: boolean;
}

/**
 * Expertise level tracking
 * Records user expertise in specific areas
 */
export interface ExpertiseLevel {
  domain: string;
  level: 'novice' | 'intermediate' | 'expert' | 'master';
  verified: boolean;
  verified_by?: string;
  verified_at?: Date;
}

/**
 * Extended expert profile
 * Additional details for expert-verified users
 */
export interface ExtendedExpert {
  user_id: string;
  expertise_areas: ExpertiseLevel[];
  analysis_count: number;
  helpful_votes: number;
  rating: number;
  bio: string;
  credentials?: string;
  verified: boolean;
  verified_at?: Date;
}

/**
 * Expert analysis object
 * Analysis produced by expert users
 */
export interface Analysis {
  id: string;
  expert_id: string;
  bill_id: string;
  content: string;
  created_at: Date;
  helpful_votes: number;
  rating: number;
}

/**
 * Extended verification task
 * Verification request for expert status
 */
export interface ExtendedVerificationTask {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: Date;
  completed_at?: Date;
  reviewer_id?: string;
  review_notes?: string;
  supporting_documents: string[];
}
