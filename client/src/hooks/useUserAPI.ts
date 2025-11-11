/**
 * User API Hooks
 * 
 * React hooks for integrating user backend services with components.
 * Provides data fetching, caching, and state management for user-related operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { userBackendService } from '../services/user-backend-service';
import { useAuthStore } from '../store/slices/authSlice';
import { useUserDashboardStore } from '../store/slices/userDashboardSlice';
import { logger } from '../utils/logger';
import type {
  UserProfile,
  SavedBill,
  UserEngagementActivity,
  UserNotificationPreferences,
  UserBadge,
  UserAchievement
} from '../services/user-backend-service';
import type {
  UserDashboardData,
  TrackedBill,
  CivicImpactMetrics,
  BillRecommendation,
  PrivacyControls,
  DataExportRequest,
  DashboardPreferences
} from '../types/user-dashboard';

// Query Keys
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

// User Profile Hook
export function useUserProfile(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.profile(targetUserId || ''),
    queryFn: () => userBackendService.getUserProfile(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

// User Profile Mutation
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) =>
      userBackendService.updateUserProfile(userId, updates),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.profile(userId), data);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });
      
      // Update auth store if updating current user
      if (user?.id === userId) {
        // Update user in auth store if needed
        logger.info('User profile updated successfully', { userId });
      }
    },
    onError: (error) => {
      logger.error('Failed to update user profile', { error });
    }
  });
}

// Dashboard Data Hook
export function useUserDashboard(userId?: string, timeFilter?: { start?: string; end?: string }) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: [...userQueryKeys.dashboard(targetUserId || ''), timeFilter],
    queryFn: () => userBackendService.getDashboardData(targetUserId!, timeFilter),
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
}

// Saved Bills Hook
export function useSavedBills(userId?: string, page: number = 1, limit: number = 20) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.savedBills(targetUserId || '', page),
    queryFn: () => userBackendService.getSavedBills(targetUserId!, page, limit),
    enabled: !!targetUserId,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true
  });
}

// Save Bill Mutation
export function useSaveBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ 
      userId, 
      billId, 
      options 
    }: { 
      userId: string; 
      billId: number; 
      options?: { notes?: string; tags?: string[]; notifications?: boolean } 
    }) => userBackendService.saveBill(userId, billId, options),
    onSuccess: (data, { userId }) => {
      // Invalidate saved bills queries
      queryClient.invalidateQueries({ queryKey: userQueryKeys.savedBills(userId) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().trackBill(data.bill_id);
      }
      
      logger.info('Bill saved successfully', { billId: data.bill_id, userId });
    },
    onError: (error) => {
      logger.error('Failed to save bill', { error });
    }
  });
}

// Unsave Bill Mutation
export function useUnsaveBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, billId }: { userId: string; billId: number }) =>
      userBackendService.unsaveBill(userId, billId),
    onSuccess: (_, { userId, billId }) => {
      // Invalidate saved bills queries
      queryClient.invalidateQueries({ queryKey: userQueryKeys.savedBills(userId) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().untrackBill(billId);
      }
      
      logger.info('Bill unsaved successfully', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to unsave bill', { error });
    }
  });
}

// Track Bill Mutation
export function useTrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

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
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().trackBill(data.id, data.notifications);
      }
      
      logger.info('Bill tracking started', { billId: data.id, userId });
    },
    onError: (error) => {
      logger.error('Failed to track bill', { error });
    }
  });
}

// Untrack Bill Mutation
export function useUntrackBill() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, billId }: { userId: string; billId: number }) =>
      userBackendService.untrackBill(userId, billId),
    onSuccess: (_, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.dashboard(userId) });
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().untrackBill(billId);
      }
      
      logger.info('Bill tracking stopped', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to untrack bill', { error });
    }
  });
}

// Engagement History Hook
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
    queryFn: () => userBackendService.getEngagementHistory(targetUserId!, options),
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true
  });
}

// Track Engagement Mutation
export function useTrackEngagement() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (activity: {
      action_type: string;
      entity_type: string;
      entity_id: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return userBackendService.trackEngagement(user.id, activity);
    },
    onSuccess: (data) => {
      // Update dashboard store
      if (user?.id) {
        useUserDashboardStore.getState().addEngagementItem({
          id: data.id,
          type: data.action_type as any,
          billId: data.entity_type === 'bill' ? parseInt(data.entity_id) : undefined,
          timestamp: data.timestamp,
          metadata: data.metadata
        });
      }
    },
    onError: (error) => {
      // Don't show error to user for engagement tracking
      logger.warn('Failed to track engagement (non-critical)', { error });
    }
  });
}

// Civic Metrics Hook
export function useCivicMetrics(userId?: string, timeRange?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.civicMetrics(targetUserId || '', timeRange),
    queryFn: () => userBackendService.getCivicMetrics(targetUserId!, timeRange),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

// User Badges Hook
export function useUserBadges(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.badges(targetUserId || ''),
    queryFn: () => userBackendService.getUserBadges(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// User Achievements Hook
export function useUserAchievements(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.achievements(targetUserId || ''),
    queryFn: () => userBackendService.getUserAchievements(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// Recommendations Hook
export function useRecommendations(userId?: string, limit: number = 10) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.recommendations(targetUserId || ''),
    queryFn: () => userBackendService.getRecommendations(targetUserId!, limit),
    enabled: !!targetUserId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2
  });
}

// Dismiss Recommendation Mutation
export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, billId, reason }: { userId: string; billId: number; reason?: string }) =>
      userBackendService.dismissRecommendation(userId, billId, reason),
    onSuccess: (_, { userId, billId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.recommendations(userId) });
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().dismissRecommendation(billId);
      }
      
      logger.info('Recommendation dismissed', { billId, userId });
    },
    onError: (error) => {
      logger.error('Failed to dismiss recommendation', { error });
    }
  });
}

// User Preferences Hook
export function useUserPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.preferences(targetUserId || ''),
    queryFn: () => userBackendService.getUserPreferences(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// Update User Preferences Mutation
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<DashboardPreferences> }) =>
      userBackendService.updateUserPreferences(userId, preferences),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.preferences(userId), data);
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().updatePreferences(data);
      }
      
      logger.info('User preferences updated', { userId });
    },
    onError: (error) => {
      logger.error('Failed to update user preferences', { error });
    }
  });
}

// Notification Preferences Hook
export function useNotificationPreferences(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.notificationPreferences(targetUserId || ''),
    queryFn: () => userBackendService.getNotificationPreferences(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// Update Notification Preferences Mutation
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<UserNotificationPreferences> }) =>
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

// Privacy Controls Hook
export function usePrivacyControls(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: userQueryKeys.privacyControls(targetUserId || ''),
    queryFn: () => userBackendService.getPrivacyControls(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// Update Privacy Controls Mutation
export function useUpdatePrivacyControls() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, controls }: { userId: string; controls: Partial<PrivacyControls> }) =>
      userBackendService.updatePrivacyControls(userId, controls),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userQueryKeys.privacyControls(userId), data);
      
      // Update dashboard store
      if (user?.id === userId) {
        useUserDashboardStore.getState().updatePrivacyControls(data);
      }
      
      logger.info('Privacy controls updated', { userId });
    },
    onError: (error) => {
      logger.error('Failed to update privacy controls', { error });
    }
  });
}

// Data Export Mutation
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

// Activity Recording Hook
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

    // Record in backend (fire and forget)
    userBackendService.recordActivity(user.id, activity);
    
    // Also track in engagement system
    trackEngagement.mutate(activity);
  }, [user?.id, trackEngagement]);
}

// Sync Dashboard Data Hook
export function useSyncDashboardData() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const dashboardQuery = useUserDashboard();

  const syncData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch fresh data from backend
      const dashboardData = await userBackendService.getDashboardData(user.id);
      
      // Update query cache
      queryClient.setQueryData(userQueryKeys.dashboard(user.id), dashboardData);
      
      // Update dashboard store
      useUserDashboardStore.getState().setDashboardData(dashboardData);
      
      logger.info('Dashboard data synced successfully');
    } catch (error) {
      logger.error('Failed to sync dashboard data', { error });
      throw error;
    }
  }, [user?.id, queryClient]);

  return {
    syncData,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error
  };
}

// Auto-sync Effect Hook
export function useAutoSyncDashboard(intervalMinutes: number = 15) {
  const { syncData } = useSyncDashboardData();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id || intervalMinutes <= 0) return;

    const interval = setInterval(() => {
      syncData().catch(error => {
        logger.warn('Auto-sync failed (non-critical)', { error });
      });
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id, intervalMinutes, syncData]);
}