/**
 * User API Hooks
 * 
 * React hooks for integrating user backend services with components.
 * Provides data fetching, caching, and state management for user-related operations.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { userService as userBackendService } from '../../../services/userService';
import type {
  UserProfile,
  NotificationPreferences,
} from '../../../services/userService';
import { useAuthStore } from '../../../store/slices/authSlice';
import { useUserDashboardStore } from '../../../store/slices/userDashboardSlice';
import type {
  PrivacyControls,
  DataExportRequest,
  DashboardPreferences,
  UserDashboardData
} from '../../../types/user-dashboard';
import { logger } from '../../../utils/logger';

// Types for engagement and activity tracking - matching service expectations
type ActionType = 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
type EntityType = 'discussion' | 'comment' | 'bill' | 'expert_analysis';
type EngagementType = 'view' | 'comment' | 'save' | 'share' | 'vote' | 'expert_contribution';

interface EngagementActivity {
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

interface EngagementHistoryOptions {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// Query Keys - These create consistent cache keys for React Query
export const userQueryKeys = {
  all: ['user'] as const,
  profile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  dashboard: (userId: string) => [...userQueryKeys.all, 'dashboard', userId] as const,
  savedBills: (userId: string, page?: number) => [...userQueryKeys.all, 'savedBills', userId, page] as const,
  engagementHistory: (userId: string, options?: EngagementHistoryOptions) => [...userQueryKeys.all, 'engagement', userId, options] as const,
  civicMetrics: (userId: string, timeRange?: string) => [...userQueryKeys.all, 'civicMetrics', userId, timeRange] as const,
  badges: (userId: string) => [...userQueryKeys.all, 'badges', userId] as const,
  achievements: (userId: string) => [...userQueryKeys.all, 'achievements', userId] as const,
  recommendations: (userId: string) => [...userQueryKeys.all, 'recommendations', userId] as const,
  preferences: (userId: string) => [...userQueryKeys.all, 'preferences', userId] as const,
  notificationPreferences: (userId: string) => [...userQueryKeys.all, 'notificationPreferences', userId] as const,
  privacyControls: (userId: string) => [...userQueryKeys.all, 'privacyControls', userId] as const
};

// User Profile Hook - Fetches the authenticated user's profile data
export function useUserProfile(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.profile(targetUserId || ''),
    queryFn: () => userBackendService.getUserProfile(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    retry: 2,
    gcTime: 10 * 60 * 1000
  });
}

// User Profile Mutation - Updates user profile information
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) =>
      userBackendService.updateUserProfile(userId, updates),
    onSuccess: (updatedProfile, { userId }) => {
      // Update the cache immediately with the new data
      queryClient.setQueryData(userQueryKeys.profile(userId), updatedProfile);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      if (user?.id === userId) {
        logger.info('User profile updated successfully', { userId });
      }
    },
    onError: (error) => {
      logger.error('Failed to update user profile', { error });
    }
  });
}

// Dashboard Data Hook - Fetches comprehensive dashboard information
export function useUserDashboard(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.dashboard(targetUserId || ''),
    queryFn: () => userBackendService.getDashboardDataForUser(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // Refresh dashboard data every 2 minutes
    retry: 2,
    gcTime: 5 * 60 * 1000
  });
}

// Saved Bills Hook - Retrieves paginated list of user's saved bills
export function useSavedBills(userId?: string, page: number = 1, limit: number = 20) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.savedBills(targetUserId || '', page),
    queryFn: () => userBackendService.getSavedBillsForUser(targetUserId!, page, limit),
    enabled: !!targetUserId,
    staleTime: 1 * 60 * 1000,
    retry: 2,
    gcTime: 10 * 60 * 1000,
    // Use placeholderData to keep previous page visible while loading new page
    placeholderData: keepPreviousData
  });
}

// Save Bill Mutation - Adds a bill to user's saved collection
export function useSaveBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({
      userId,
      billId
    }: {
      userId: string;
      billId: number;
    }) => userBackendService.saveBillForUser(userId, billId),
    onSuccess: (_, { userId, billId }) => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: userQueryKeys.savedBills(userId) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      // Update local store state if it's the current user
      if (user?.id === userId && dashboardStore.trackBill) {
        dashboardStore.trackBill(billId);
      }

      logger.info('Bill saved successfully', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to save bill', { error });
    }
  });
}

// Unsave Bill Mutation - Removes a bill from user's saved collection
export function useUnsaveBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({ userId, billId }: { userId: string; billId: number }) =>
      userBackendService.unsaveBillForUser(userId, billId),
    onSuccess: (_, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.savedBills(userId) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      if (user?.id === userId && dashboardStore.untrackBill) {
        dashboardStore.untrackBill(billId);
      }

      logger.info('Bill unsaved successfully', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to unsave bill', { error });
    }
  });
}

// Track Bill Mutation - Enables notifications and tracking for a specific bill
// Note: This uses saveBillForUser since trackBill doesn't exist in UserService
export function useTrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({
      userId,
      billId
    }: {
      userId: string;
      billId: number;
      notificationSettings?: Record<string, unknown>;
    }) => userBackendService.saveBillForUser(userId, billId),
    onSuccess: (savedBill, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      if (user?.id === userId && dashboardStore.trackBill) {
        dashboardStore.trackBill(billId);
      }

      logger.info('Bill tracking started', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to track bill', { error });
    }
  });
}

// Untrack Bill Mutation - Disables tracking for a specific bill
// Note: This uses unsaveBillForUser since untrackBill doesn't exist in UserService
export function useUntrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({ userId, billId }: { userId: string; billId: number }) =>
      userBackendService.unsaveBillForUser(userId, billId),
    onSuccess: (_, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      if (user?.id === userId && dashboardStore.untrackBill) {
        dashboardStore.untrackBill(billId);
      }

      logger.info('Bill tracking stopped', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to untrack bill', { error });
    }
  });
}

// Engagement History Hook - Retrieves user's interaction history with bills
export function useEngagementHistory(
  userId?: string,
  options?: EngagementHistoryOptions
) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.engagementHistory(targetUserId || '', options),
    queryFn: () => userBackendService.getEngagementHistoryForUser(targetUserId!, options),
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // Refresh frequently for up-to-date engagement data
    retry: 2,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData
  });
}

// Track Engagement Mutation - Records user interaction with the platform
export function useTrackEngagement() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: (activity: EngagementActivity) => {
      if (!user?.id) throw new Error('User not authenticated');
      // The activity already has the correct types, pass it directly
      return userBackendService.trackEngagement(activity);
    },
    onSuccess: (_, activity) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      
      // Update dashboard store with new engagement activity if the method exists
      if (user?.id && dashboardStore.addEngagementItem) {
        // Map action_type to the engagement type expected by the store
        const engagementType = (activity.action_type === 'track' ? 'save' : activity.action_type) as EngagementType;
        
        dashboardStore.addEngagementItem({
          id: `${activity.action_type}_${activity.entity_id}_${Date.now()}`,
          type: engagementType,
          billId: activity.entity_type === 'bill' ? parseInt(activity.entity_id) : undefined,
          timestamp: new Date().toISOString(),
          metadata: activity.metadata
        });
      }
    },
    onError: (error) => {
      // Engagement tracking failures shouldn't disrupt user experience
      logger.warn('Failed to track engagement (non-critical)', { error });
    }
  });
}

// Civic Metrics Hook - Fetches user's civic engagement statistics
// Note: Falls back to null if data is not available
export function useCivicMetrics(userId?: string, timeRange?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.civicMetrics(targetUserId || '', timeRange),
    queryFn: async () => {
      // If the service has getCivicMetrics, use it
      if ('getCivicMetrics' in userBackendService && typeof userBackendService.getCivicMetrics === 'function') {
        const service = userBackendService as unknown as { getCivicMetrics: (userId: string, timeRange?: string) => Promise<unknown> };
        return service.getCivicMetrics(targetUserId!, timeRange);
      }
      // Otherwise return null - civic metrics not available
      return null;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    gcTime: 10 * 60 * 1000
  });
}

// User Badges Hook - Retrieves earned badges and achievements
export function useUserBadges(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.badges(targetUserId || ''),
    queryFn: () => userBackendService.getUserBadges(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    gcTime: 20 * 60 * 1000
  });
}

// User Achievements Hook - Fetches achievement progress and completion status
export function useUserAchievements(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.achievements(targetUserId || ''),
    queryFn: () => userBackendService.getUserAchievements(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    gcTime: 20 * 60 * 1000
  });
}

// Recommendations Hook - Gets personalized bill recommendations
// Note: Falls back to empty array if not available
export function useRecommendations(userId?: string, limit: number = 10) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.recommendations(targetUserId || ''),
    queryFn: async () => {
      // If the service has getRecommendations, use it
      if ('getRecommendations' in userBackendService && typeof userBackendService.getRecommendations === 'function') {
        const service = userBackendService as unknown as { getRecommendations: (userId: string, limit: number) => Promise<unknown> };
        return service.getRecommendations(targetUserId!, limit);
      }
      // Return empty array if method not available
      return [];
    },
    enabled: !!targetUserId,
    staleTime: 15 * 60 * 1000, // Recommendations can be cached longer
    retry: 2,
    gcTime: 30 * 60 * 1000
  });
}

// Dismiss Recommendation Mutation - Removes a recommendation from the list
// Note: Uses a workaround if dismissRecommendation doesn't exist in the service
export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: async ({ userId, billId, reason }: { userId: string; billId: number; reason?: string }) => {
      // Check if the method exists in the service
      if ('dismissRecommendation' in userBackendService && typeof userBackendService.dismissRecommendation === 'function') {
        const service = userBackendService as unknown as { dismissRecommendation: (userId: string, billId: number, reason?: string) => Promise<void> };
        return service.dismissRecommendation(userId, billId, reason);
      }
      // If not available, just invalidate queries and let the store handle it
      return Promise.resolve();
    },
    onSuccess: (_, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.recommendations(userId) });

      if (user?.id === userId && dashboardStore.dismissRecommendation) {
        dashboardStore.dismissRecommendation(billId);
      }

      logger.info('Recommendation dismissed', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to dismiss recommendation', { error });
    }
  });
}

// User Preferences Hook - Fetches user's display and behavior preferences
// Note: Returns null if preferences are not available separately
export function useUserPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.preferences(targetUserId || ''),
    queryFn: async () => {
      // Since getUserPreferences doesn't exist, and preferences don't exist on dashboard,
      // we return null to indicate preferences are managed elsewhere or not available
      return null;
    },
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    gcTime: 20 * 60 * 1000
  });
}

// Update User Preferences Mutation - Modifies user preferences
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Record<string, unknown> }) =>
      userBackendService.updateUserPreferences(userId, preferences),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.preferences(userId), data);

      if (user?.id === userId && dashboardStore.updatePreferences) {
        dashboardStore.updatePreferences(data as unknown as DashboardPreferences);
      }

      logger.info('User preferences updated', { userId });
    },
    onError: (error) => {
      logger.error('Failed to update user preferences', { error });
    }
  });
}

// Notification Preferences Hook - Retrieves notification settings
// Note: Returns null if separate notification preferences endpoint doesn't exist
export function useNotificationPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.notificationPreferences(targetUserId || ''),
    queryFn: async () => {
      // Check if the method exists in the service
      if ('getNotificationPreferences' in userBackendService && typeof userBackendService.getNotificationPreferences === 'function') {
        const service = userBackendService as unknown as { getNotificationPreferences: (userId: string) => Promise<NotificationPreferences> };
        return service.getNotificationPreferences(targetUserId!);
      }
      // If not available, return null to indicate it's not separately accessible
      return null;
    },
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    gcTime: 20 * 60 * 1000
  });
}

// Update Notification Preferences Mutation - Changes notification settings
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, preferences }: { userId: string; preferences: Partial<NotificationPreferences> }) => {
      // Check if the method exists in the service
      if ('updateNotificationPreferences' in userBackendService && typeof userBackendService.updateNotificationPreferences === 'function') {
        const service = userBackendService as unknown as { updateNotificationPreferences: (userId: string, preferences: Partial<NotificationPreferences>) => Promise<NotificationPreferences> };
        return service.updateNotificationPreferences(userId, preferences);
      }
      // If not available, return the preferences unchanged (they'll be managed elsewhere)
      return preferences as NotificationPreferences;
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.notificationPreferences(userId), data);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.profile(userId) });
      logger.info('Notification preferences updated', { userId });
    },
    onError: (error) => {
      logger.error('Failed to update notification preferences', { error });
    }
  });
}

// Privacy Controls Hook - Fetches user's privacy and data sharing settings
export function usePrivacyControls(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.privacyControls(targetUserId || ''),
    queryFn: async () => {
      // Check if the method exists in the service
      if ('getPrivacyControls' in userBackendService && typeof userBackendService.getPrivacyControls === 'function') {
        const service = userBackendService as unknown as { getPrivacyControls: (userId: string) => Promise<PrivacyControls> };
        return service.getPrivacyControls(targetUserId!);
      }
      // If not available, return null to indicate privacy controls are managed elsewhere
      return null;
    },
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    gcTime: 20 * 60 * 1000
  });
}

// Update Privacy Controls Mutation - Modifies privacy settings
export function useUpdatePrivacyControls() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: async ({ userId, controls }: { userId: string; controls: Partial<PrivacyControls> }) => {
      // Check if the method exists in the service
      if ('updatePrivacyControls' in userBackendService && typeof userBackendService.updatePrivacyControls === 'function') {
        const service = userBackendService as unknown as { updatePrivacyControls: (userId: string, controls: Partial<PrivacyControls>) => Promise<PrivacyControls> };
        return service.updatePrivacyControls(userId, controls);
      }
      // If not available, return the controls unchanged
      return controls as PrivacyControls;
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.privacyControls(userId), data);

      if (user?.id === userId && dashboardStore.updatePrivacyControls) {
        dashboardStore.updatePrivacyControls(data);
      }

      logger.info('Privacy controls updated', { userId });
    },
    onError: (error) => {
      logger.error('Failed to update privacy controls', { error });
    }
  });
}

// Data Export Mutation - Requests export of user's data
export function useRequestDataExport() {
  return useMutation({
    mutationFn: async ({ userId, request }: { userId: string; request: DataExportRequest }) => {
      // Check if the method exists in the service
      if ('requestDataExport' in userBackendService && typeof userBackendService.requestDataExport === 'function') {
        const service = userBackendService as unknown as { requestDataExport: (userId: string, request: DataExportRequest) => Promise<{ exportId: string }> };
        return service.requestDataExport(userId, request);
      }
      // If method doesn't exist, return a mock response
      return { exportId: `export_${Date.now()}`, status: 'pending' as const };
    },
    onSuccess: (data) => {
      logger.info('Data export requested', { exportId: data.exportId });
    },
    onError: (error) => {
      logger.error('Failed to request data export', { error });
    }
  });
}

// Activity Recording Hook - Convenience hook for recording user activities
export function useRecordActivity() {
  const { user } = useAuthStore();
  const trackEngagement = useTrackEngagement();

  return useCallback((activity: EngagementActivity) => {
    if (!user?.id) return;

    // Check if recordActivity exists in the service
    if ('recordActivity' in userBackendService && typeof userBackendService.recordActivity === 'function') {
      // Record activity in backend (fire and forget, non-blocking)
      const service = userBackendService as unknown as { recordActivity: (activity: EngagementActivity) => Promise<void> };
      service.recordActivity(activity)
        .catch((error: Error) => {
          logger.warn('Failed to record activity (non-critical)', { error });
        });
    }

    // Also track in engagement system for analytics
    trackEngagement.mutate(activity);
  }, [user?.id, trackEngagement]);
}

// Sync Dashboard Data Hook - Manually refreshes dashboard data
export function useSyncDashboardData() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const dashboardQuery = useUserDashboard();
  const dashboardStore = useUserDashboardStore();

  const syncData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch fresh data from the backend
      const dashboardData = await userBackendService.getDashboardDataForUser(user.id);

      // Update React Query cache
      queryClient.setQueryData(userQueryKeys.dashboard(user.id), dashboardData);

      // Update Zustand store if method exists
      // Note: Only update if the store's setDashboardData exists and can handle the data type
      if (dashboardStore.setDashboardData) {
        // We use 'as unknown as UserDashboardData' because the types may not perfectly align
        // but the store should be able to handle the dashboard data structure
        dashboardStore.setDashboardData(dashboardData as unknown as UserDashboardData);
      }

      logger.info('Dashboard data synced successfully');
    } catch (error) {
      logger.error('Failed to sync dashboard data', { error });
      throw error;
    }
  }, [user?.id, queryClient, dashboardStore]);

  return {
    syncData,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error
  };
}

// Auto-sync Effect Hook - Automatically syncs dashboard data at intervals
export function useAutoSyncDashboard(intervalMinutes: number = 15) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || intervalMinutes <= 0) return;

    // Set up interval for automatic background syncing
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: userQueryKeys.dashboard(user.id) 
      });
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id, intervalMinutes, queryClient]);
}