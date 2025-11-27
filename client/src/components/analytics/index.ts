/**
 * Analytics Components Index
 * 
 * Exports all analytics-related components for the Chanuka platform.
 */

export { EngagementDashboard } from './engagement-dashboard';
export { JourneyAnalyticsDashboard } from './JourneyAnalyticsDashboard';
export { RealTimeEngagementDashboard } from './real-time-engagement-dashboard';
export { RealTimeEngagementDemo } from './real-time-engagement-demo';

// Re-export types
export type {
  LiveEngagementMetrics,
  PersonalEngagementScore,
  CommunitysentimentAnalysis,
  ExpertVerificationMetrics,
  EngagementStatistics,
  TemporalAnalyticsData,
  RealTimeEngagementUpdate,
  EngagementAnalyticsConfig,
  CivicEngagementGoal,
  ContributionQualityMetrics,
  CommunityImpactMetrics,
  EngagementTrend,
  UserEngagementProfile,
  EngagementNotification,
  AnalyticsExportData
} from '@client/types/engagement-analytics';

// Re-export hooks
export { useRealTimeEngagement, generateMockEngagementData } from '../../hooks/useRealTimeEngagement';