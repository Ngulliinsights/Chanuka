/**
 * User Account Integration Component
 * Consolidates backend integration, real-time updates, and state management
 * for all user account functionality
 */

import React, { useEffect, useState } from 'react';

import { useAuth } from '@client/features/users/hooks/useAuth';
import { 
  useUserDashboard,
  useSavedBills,
  useEngagementHistory,
  useCivicMetrics,
  useUserBadges,
  useUserAchievements,
  useRecommendations,
  useUserPreferences,
  useNotificationPreferences,
  usePrivacyControls,
  useTrackEngagement,
  useRecordActivity
} from '@client/features/users/hooks/useUserAPI';
import { notificationService } from '@client/services/notification-service';
import { useUserDashboardStore } from '@client/store/slices/userDashboardSlice';
import { logger } from '@client/utils/logger';

import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/loading-spinner';

interface UserAccountIntegrationProps {
  children: React.ReactNode;
}

export function UserAccountIntegration({ children }: UserAccountIntegrationProps) {
  const { user, isAuthenticated } = useAuth();
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Consolidated data hooks
  const dashboardQuery = useUserDashboard(user?.id);
  const savedBillsQuery = useSavedBills(user?.id, 1, 20);
  const engagementQuery = useEngagementHistory(user?.id, { limit: 50 });
  const civicMetricsQuery = useCivicMetrics(user?.id);
  const badgesQuery = useUserBadges(user?.id);
  const achievementsQuery = useUserAchievements(user?.id);
  const recommendationsQuery = useRecommendations(user?.id);
  const preferencesQuery = useUserPreferences(user?.id);
  const notificationPrefsQuery = useNotificationPreferences(user?.id);
  const privacyControlsQuery = usePrivacyControls(user?.id);

  // Activity tracking
  const trackEngagement = useTrackEngagement();
  const recordActivity = useRecordActivity();

  // Dashboard store
  const { 
    setDashboardData, 
    updatePreferences, 
    updatePrivacyControls,
    setError,
    refreshDashboard 
  } = useUserDashboardStore();

  // Initialize account integration
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initializeAccount();
    } else {
      setIsInitializing(false);
    }
  }, [isAuthenticated, user?.id]);

  // Sync data to stores when queries complete
  useEffect(() => {
    if (dashboardQuery.data) {
      setDashboardData(dashboardQuery.data);
    }
  }, [dashboardQuery.data, setDashboardData]);

  useEffect(() => {
    if (preferencesQuery.data) {
      updatePreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data, updatePreferences]);

  useEffect(() => {
    if (privacyControlsQuery.data) {
      updatePrivacyControls(privacyControlsQuery.data);
    }
  }, [privacyControlsQuery.data, updatePrivacyControls]);

  // Initialize notification service
  useEffect(() => {
    if (isAuthenticated && user?.id && notificationPrefsQuery.data) {
      initializeNotifications();
    }
  }, [isAuthenticated, user?.id, notificationPrefsQuery.data]);

  const initializeAccount = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);

      if (!user?.id) {
        throw new Error('User ID not available');
      }

      // Track account initialization
      recordActivity({
        action_type: 'initialize',
        entity_type: 'account',
        entity_id: 'user-account',
        metadata: { timestamp: new Date().toISOString() }
      });

      logger.info('Account integration initialized', { userId: user.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize account';
      setInitializationError(errorMessage);
      logger.error('Account initialization failed', { error });
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      if (!user?.id) return;

      await notificationService.initialize();
      
      if (notificationPrefsQuery.data) {
        const preferences = {
          inApp: true,
          email: notificationPrefsQuery.data.email_notifications,
          push: notificationPrefsQuery.data.push_notifications,
          sms: notificationPrefsQuery.data.sms_notifications,
          billStatusChanges: notificationPrefsQuery.data.bill_status_changes,
          newComments: notificationPrefsQuery.data.new_comments,
          expertAnalysis: notificationPrefsQuery.data.expert_analysis,
          weeklyDigest: notificationPrefsQuery.data.weekly_digest,
          trendingBills: notificationPrefsQuery.data.trending_bills,
          communityUpdates: notificationPrefsQuery.data.community_updates,
          frequency: notificationPrefsQuery.data.frequency,
          quietHours: notificationPrefsQuery.data.quiet_hours
        };

        notificationService.updatePreferences(preferences, user.id);
      }

      await notificationService.loadNotifications(user.id, 1, 20);
      logger.info('Notification service initialized for user', { userId: user.id });
    } catch (error) {
      logger.warn('Failed to initialize notifications (non-critical)', { error });
    }
  };

  // Real-time updates and activity tracking
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity({
          action_type: 'focus',
          entity_type: 'account',
          entity_id: 'user-account',
          metadata: { timestamp: new Date().toISOString() }
        });
      } else {
        recordActivity({
          action_type: 'blur',
          entity_type: 'account',
          entity_id: 'user-account',
          metadata: { timestamp: new Date().toISOString() }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.id, recordActivity]);

  // Error handling
  const hasError = dashboardQuery.error || 
                   savedBillsQuery.error || 
                   engagementQuery.error || 
                   civicMetricsQuery.error || 
                   initializationError;

  const isLoading = isInitializing || 
                    dashboardQuery.isLoading || 
                    preferencesQuery.isLoading || 
                    privacyControlsQuery.isLoading;

  // Retry function
  const handleRetry = () => {
    setInitializationError(null);
    dashboardQuery.refetch();
    savedBillsQuery.refetch();
    engagementQuery.refetch();
    civicMetricsQuery.refetch();
    badgesQuery.refetch();
    achievementsQuery.refetch();
    recommendationsQuery.refetch();
    preferencesQuery.refetch();
    notificationPrefsQuery.refetch();
    privacyControlsQuery.refetch();
  };

  // Don't render anything if user is not authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading state during initialization
  if (isLoading && !hasError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (hasError) {
    const errorMessage = initializationError || 
                        dashboardQuery.error?.message || 
                        'Failed to load account data';

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorMessage 
          message={errorMessage}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return <>{children}</>;
}

export default UserAccountIntegration;