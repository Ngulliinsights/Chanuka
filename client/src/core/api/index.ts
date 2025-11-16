// Barrel export for all API-related modules
export * from './cache';
export * from './client';
export * from './config';
export * from './errors';
export * from './interceptors';
export * from './registry';
export * from './types';
export * from './websocket';

// Selective exports to avoid conflicts
export type { LoginCredentials, RegisterData, AuthUser, AuthTokens, AuthSession } from './auth';
export type { BillsSearchParams, PaginatedBillsResponse, BillEngagementData, BillComment } from './bills';
export type { DiscussionThread, Comment, CommentFormData, CommentReport, ModerationAction, ModerationViolationType, Expert, ActivityItem, TrendingTopic, CommunityStats, LocalImpactMetrics } from './community';
export type { UserProfile, UserBadge, UserAchievement, ActivitySummary, SavedBill, UserEngagementHistory, UserPreferences } from './user';
export type { Notification, NotificationPreferences, NotificationType, NotificationCategory } from './notifications';
export type { SystemHealth, SystemStats, SystemActivity, SystemSchema, SystemEnvironment } from './system';

// Re-export commonly used instances
export { globalApiClient } from './client';
export { globalCache } from './cache';
export { globalConfig } from './config';
export { globalErrorHandler } from './errors';
export { globalServiceLocator } from './registry';
export { globalWebSocketPool } from './websocket';

// Re-export API service instances
export { authApiService } from './client';
export { communityApiService } from './community';
export { systemApiService } from './system';
export { userApiService } from './user';
export { notificationApiService } from './notifications';
export { performanceApiService } from './performance';
export { privacyAnalyticsApiService } from './privacy';
export { analyticsApiService } from './analytics';
export { searchApiClient } from './search';