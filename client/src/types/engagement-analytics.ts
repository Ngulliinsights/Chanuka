/**
 * Types for Real-Time Engagement Analytics
 * 
 * Defines interfaces for engagement metrics, sentiment analysis,
 * expert verification, and gamification elements.
 */

export interface LiveEngagementMetrics {
  communityApproval: number;
  totalParticipants: number;
  expertSupport: number;
  activeDiscussions: number;
  lastUpdated: string;
}

export interface PersonalEngagementScore {
  totalScore: number;
  breakdown: {
    participation: number;
    quality: number;
    expertise: number;
    community: number;
  };
  rank: number;
  totalUsers: number;
  trend: 'up' | 'down' | 'stable';
  methodology: {
    description: string;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
      currentScore: number;
    }>;
  };
}

export interface CommunitysentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trending: Array<{
    topic: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    change: number;
    volume: number;
  }>;
  polls: Array<{
    id: string;
    question: string;
    responses: number;
    results: Array<{
      option: string;
      votes: number;
      percentage: number;
    }>;
    endTime: string;
  }>;
}

export interface ExpertVerificationMetrics {
  totalExperts: number;
  activeExperts: number;
  averageCredibility: number;
  verificationStats: {
    official: number;
    domain: number;
    identity: number;
  };
  topExperts: Array<{
    id: string;
    name: string;
    credibilityScore: number;
    specializations: string[];
    recentContributions: number;
    communityRating: number;
  }>;
}

export interface EngagementStatistics {
  leaderboard: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
    badge: string;
    contributions: {
      comments: number;
      votes: number;
      shares: number;
    };
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedBy: number;
  }>;
  streaks: {
    current: number;
    longest: number;
    type: 'daily' | 'weekly';
  };
}

export interface TemporalAnalyticsData {
  hourly: Array<{
    hour: number;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
  daily: Array<{
    date: string;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
  weekly: Array<{
    week: string;
    engagement: number;
    participants: number;
    sentiment: number;
  }>;
}

export interface RealTimeEngagementUpdate {
  type: 'engagement_update' | 'sentiment_update' | 'expert_update' | 'leaderboard_update';
  data: {
    liveMetrics?: Partial<LiveEngagementMetrics>;
    sentiment?: Partial<CommunitysentimentAnalysis>;
    expertMetrics?: Partial<ExpertVerificationMetrics>;
    stats?: Partial<EngagementStatistics>;
  };
  timestamp: string;
}

export interface EngagementAnalyticsConfig {
  updateInterval: number;
  enableRealTime: boolean;
  enableNotifications: boolean;
  gamificationEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
}

export interface CivicEngagementGoal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  deadline?: string;
  category: 'participation' | 'quality' | 'community' | 'expertise';
}

export interface ContributionQualityMetrics {
  averageLength: number;
  citationCount: number;
  upvoteRatio: number;
  expertEndorsements: number;
  factualAccuracy: number;
  constructiveness: number;
}

export interface CommunityImpactMetrics {
  billsInfluenced: number;
  policiesAffected: number;
  citizensReached: number;
  mediaAttention: number;
  legislativeResponse: number;
}

export interface EngagementTrend {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface UserEngagementProfile {
  userId: string;
  totalScore: number;
  level: number;
  badges: string[];
  achievements: string[];
  specializations: string[];
  contributionHistory: Array<{
    date: string;
    type: 'comment' | 'vote' | 'share' | 'analysis';
    billId: number;
    score: number;
  }>;
  impactMetrics: CommunityImpactMetrics;
  qualityMetrics: ContributionQualityMetrics;
}

export interface EngagementNotification {
  id: string;
  type: 'achievement' | 'milestone' | 'trending' | 'expert_response' | 'community_update';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  read: boolean;
}

export interface AnalyticsExportData {
  format: 'json' | 'csv' | 'xlsx';
  dateRange: {
    start: string;
    end: string;
  };
  includePersonalData: boolean;
  includeSentimentData: boolean;
  includeExpertData: boolean;
  includeTemporalData: boolean;
}

export interface AnalyticsFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  billId?: string;
  userId?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  minEngagement?: number;
  expertOnly?: boolean;
  sortBy?: 'recent' | 'engagement' | 'sentiment';
  limit?: number;
  offset?: number;
}