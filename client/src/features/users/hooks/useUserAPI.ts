/**
 * User API Hooks
 * 
 * React hooks for integrating user backend services with components.
 * Provides data fetching, caching, and state management for user-related operations.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { userService as userBackendService } from '@client/services/userService';
import { useAuthStore } from '@/store/slices/authSlice';
import { useUserDashboardStore } from '@/store/slices/userDashboardSlice';
import { logger } from '@client/utils/logger';
import type {
  UserProfile,
  NotificationPreferences,
} from '@client/services/userService';
import type {
  PrivacyControls,
  DataExportRequest,
  DashboardPreferences
} from '@client/types/user-dashboard';

// Query Keys - These create consistent cache keys for React Query
export const userQueryKeys = {
  all: ['user'] as const,
  profile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  dashboard: (userId: string) => [...userQueryKeys.all, 'dashboard', userId] as const,
  savedBills: (userId: string, page?: number) => [...userQueryKeys.all, 'savedBills', userId, page] as const,
  engagementHistory: (userId: string, options?: any) => [...userQueryKeys.all, 'engagement', userId, options] as const,
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
export function useUserDashboard(userId?: string, timeFilter?: { start?: string; end?: string }) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: [...userQueryKeys.dashboard(targetUserId || ''), timeFilter],
    queryFn: () => userBackendService.getDashboardDataForUser(targetUserId!, timeFilter),
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
      billId,
      options
    }: {
      userId: string;
      billId: number;
      options?: { notes?: string; tags?: string[]; notifications?: boolean }
    }) => userBackendService.saveBillForUser(userId, billId, options),
    onSuccess: (data, { userId, billId }) => {
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
export function useTrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({
      userId,
      billId,
      notificationSettings
    }: {
      userId: string;
      billId: number;
      notificationSettings?: any
    }) => userBackendService.trackBill(userId, billId, notificationSettings),
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });

      if (user?.id === userId && dashboardStore.trackBill) {
        dashboardStore.trackBill(data.id, data.notifications);
      }

      logger.info('Bill tracking started', { billId: data.id, userId });
    },
    onError: (error) => {
      logger.error('Failed to track bill', { error });
    }
  });
}

// Untrack Bill Mutation - Disables tracking for a specific bill
export function useUntrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({ userId, billId }: { userId: string; billId: number }) =>
      userBackendService.untrackBill(userId, billId),
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
  options?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
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
    mutationFn: (activity: {
      action_type: string;
      entity_type: string;
      entity_id: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      // Cast the activity to the expected type for the service
      return userBackendService.trackEngagement(activity as any);
    },
    onSuccess: (_, activity) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      
      // Update dashboard store with new engagement activity
      // Since the service returns void, we construct the engagement item ourselves
      if (user?.id && dashboardStore.addEngagementItem) {
        dashboardStore.addEngagementItem({
          id: `${activity.action_type}_${activity.entity_id}_${Date.now()}`,
          type: activity.action_type as any,
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
export function useCivicMetrics(userId?: string, timeRange?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.civicMetrics(targetUserId || '', timeRange),
    queryFn: () => userBackendService.getCivicMetrics(targetUserId!, timeRange),
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
export function useRecommendations(userId?: string, limit: number = 10) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.recommendations(targetUserId || ''),
    queryFn: () => userBackendService.getRecommendations(targetUserId!, limit),
    enabled: !!targetUserId,
    staleTime: 15 * 60 * 1000, // Recommendations can be cached longer
    retry: 2,
    gcTime: 30 * 60 * 1000
  });
}

// Dismiss Recommendation Mutation - Removes a recommendation from the list
export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const dashboardStore = useUserDashboardStore();

  return useMutation({
    mutationFn: ({ userId, billId, reason }: { userId: string; billId: number; reason?: string }) =>
      userBackendService.dismissRecommendation(userId, billId, reason),
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
export function useUserPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.preferences(targetUserId || ''),
    queryFn: () => userBackendService.getUserPreferences(targetUserId!),
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
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<DashboardPreferences> }) =>
      // Cast to match backend service expectations
      userBackendService.updateUserPreferences(userId, preferences as any),
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
export function useNotificationPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.notificationPreferences(targetUserId || ''),
    queryFn: () => userBackendService.getNotificationPreferences(targetUserId!),
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
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<NotificationPreferences> }) =>
      userBackendService.updateNotificationPreferences(userId, preferences),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.notificationPreferences(userId), data);
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
    queryFn: () => userBackendService.getPrivacyControls(targetUserId!),
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
    mutationFn: ({ userId, controls }: { userId: string; controls: Partial<PrivacyControls> }) =>
      // Cast to match backend service expectations
      userBackendService.updatePrivacyControls(userId, controls as any),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.privacyControls(userId), data);

      if (user?.id === userId && dashboardStore.updatePrivacyControls) {
        dashboardStore.updatePrivacyControls(data as unknown as PrivacyControls);
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
    mutationFn: ({ userId, request }: { userId: string; request: DataExportRequest }) =>
      userBackendService.requestDataExport(userId, request),
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

  return useCallback((activity: {
    action_type: string;
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user?.id) return;

    // Record activity in backend (fire and forget, non-blocking)
    userBackendService.recordActivity(activity)
      .catch(error => {
        logger.warn('Failed to record activity (non-critical)', { error });
      });

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
      if (dashboardStore.setDashboardData) {
        dashboardStore.setDashboardData(dashboardData);
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