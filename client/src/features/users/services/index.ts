/**
 * User Services Index
 *
 * Exports all user-related services for easy importing
 */

// Core services
export { authService } from './auth-service';
export { userProfileService } from './profile-service';
export { dashboardService } from './dashboard-service';
export { engagementService } from './engagement-service';
export { achievementService } from './achievements-service';

// Legacy compatibility
export { userService as legacyUserService, UserService } from './user-service-legacy';

// Re-export types for convenience
export type {
  AuthCredentials,
  RegisterData,
  AuthSession,
  AuthUser,
  UserProfile,
  UserPreferences,
  DashboardData,
  SavedBill,
  UserEngagementHistory,
  EngagementFilters,
  Recommendation,
  Notification,
  UserBadge,
  UserAchievement,
  ActivitySummary
} from '@client/shared/services/interfaces';
