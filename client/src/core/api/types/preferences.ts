/**
 * Preferences Types
 *
 * Type definitions for user preferences and settings
 */

// ============================================================================
// Bill Tracking Preferences
// ============================================================================

export type UpdateFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export interface BillTrackingPreferences {
  readonly statusChanges: boolean;
  readonly newComments: boolean;
  readonly votingSchedule: boolean;
  readonly amendments: boolean;
  readonly updateFrequency: UpdateFrequency;
  readonly notificationChannels: NotificationChannels;
  readonly trackedBills: ReadonlyArray<number>;
}

// ============================================================================
// Notification Preferences
// ============================================================================

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationChannels {
  readonly inApp: boolean;
  readonly email: boolean;
  readonly push: boolean;
}

export interface QuietHours {
  readonly enabled: boolean;
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
}

export interface NotificationPreferences {
  readonly channels: NotificationChannels;
  readonly quietHours?: QuietHours;
  readonly priority: NotificationPriority;
}

// ============================================================================
// Display Preferences
// ============================================================================

export interface DisplayPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly density: 'comfortable' | 'compact';
  readonly language: string;
}

// ============================================================================
// Dashboard Preferences (migrated from user-dashboard types)
// ============================================================================

export interface TemporalFilter {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface DashboardPreferences {
  layout: 'compact' | 'detailed' | 'cards';
  showWelcomeMessage: boolean;
  defaultTimeFilter: TemporalFilter['period'];
  pinnedSections: string[];
  hiddenSections: string[];
  refreshInterval: number; // in minutes
}

export interface PrivacyControls {
  profileVisibility: 'public' | 'private' | 'contacts';
  showActivity: boolean;
  showMetrics: boolean;
  showRecommendations: boolean;
  allowDataExport: boolean;
  allowAnalytics: boolean;
}

export interface DataExportRequest {
  format: 'json' | 'csv' | 'pdf';
  includePersonalData: boolean;
  includeActivityHistory: boolean;
  includeMetrics: boolean;
  includeComments: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// User Dashboard Data Types (migrated from user-dashboard types)
// ============================================================================

export interface TrackedBill {
  id: number;
  billNumber: string;
  title: string;
  status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed' | 'vetoed';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  lastStatusChange: string;
  userEngagement: {
    saved: boolean;
    commented: boolean;
    shared: boolean;
    viewCount: number;
    lastViewed: string;
  };
  notifications: {
    statusChanges: boolean;
    newComments: boolean;
    expertAnalysis: boolean;
  };
}

export interface EngagementHistoryItem {
  id: string;
  type: 'view' | 'comment' | 'share' | 'save' | 'vote' | 'expert_contribution';
  billId?: number;
  billTitle?: string;
  timestamp: string;
  metadata?: {
    commentId?: string;
    shareTarget?: string;
    voteType?: 'up' | 'down';
    contributionType?: 'analysis' | 'review';
  };
}

export interface CivicImpactMetrics {
  personalScore: number;
  scoreBreakdown: {
    participation: number;
    quality: number;
    consistency: number;
    influence: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    earnedAt: string;
    category: 'participation' | 'quality' | 'influence' | 'consistency';
  }>;
  monthlyTrend: Array<{
    month: string;
    score: number;
    activities: number;
  }>;
  comparisons: {
    averageUser: number;
    percentile: number;
    rank?: number;
    totalUsers?: number;
  };
}

export interface BillRecommendation {
  bill: {
    id: number;
    billNumber: string;
    title: string;
    summary: string;
    status: string;
    urgencyLevel: string;
    policyAreas: string[];
  };
  relevanceScore: number;
  reasons: Array<{
    type: 'interest_match' | 'activity_pattern' | 'expert_recommendation' | 'trending';
    description: string;
    weight: number;
  }>;
  confidence: number;
}

export interface UserDashboardData {
  trackedBills: TrackedBill[];
  recentActivity: EngagementHistoryItem[];
  civicMetrics: CivicImpactMetrics;
  recommendations: BillRecommendation[];
  notifications: Array<{
    id: string;
    type: 'bill_status' | 'new_comment' | 'expert_analysis' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
  }>;
  stats: {
    totalBillsTracked: number;
    totalComments: number;
    totalShares: number;
    streakDays: number;
    joinedDate: string;
  };
}

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  readonly billTracking: BillTrackingPreferences;
  readonly notifications: NotificationPreferences;
  readonly display: DisplayPreferences;
  readonly dashboard?: DashboardPreferences;
  readonly privacy?: PrivacyControls;
}
