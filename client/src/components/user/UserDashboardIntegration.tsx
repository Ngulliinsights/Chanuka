/**
 * User Dashboard Integration Component
 * 
 * Handles backend integration for user dashboard functionality including
 * data synchronization, real-time updates, and error handling.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
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
} from '../../hooks/useUserAPI';
import { useUserDashboardStore } from '../../store/slices/userDashboardSlice';
import { notificationService } from '../../services/notification-service';
import { logger } from '../../utils/logger';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';

interface UserDashboardIntegrationProps {
  children: React.ReactNode;
}

export function UserDashboardIntegration({ children }: UserDashboardIntegrationProps) {
  const { user, isAuthenticated } = useAuth();
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Dashboard data hooks
  const dashboardQuery = useUserDashboard(user?.id);
  const savedBillsQuery = useSavedBills(user?.id, 1, 20);
  const engagementQuery = useEngagementHistory(user?.id, { limit: 50 });
  const civicMetricsQuery = useCivicMetrics(user?.id);
  const badgesQuery = useUserBadges(user?.id);
  const achievementsQuery = useUserAchievements(user?.id);
  const recommendationsQuery = useRecommendations(user?.id);
  
  // Preferences hooks
  const preferencesQuery = useUserPreferences(user?.id);
  const notificationPrefsQuery = useNotificationPreferences(user?.id);
  const privacyControlsQuery = usePrivacyControls(user?.id);

  // Activity tracking
  const trackEngagement = useTrackEngagement();
  const recordActivity = useRecordActivity();

  // Dashboard store
  const { setDashboardData, updatePreferences, updatePrivacyControls } = useUserDashboardStore();

  // Initialize dashboard integration
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initializeDashboard();
    } else {
      setIsInitializing(false);
    }
  }, [isAuthenticated, user?.id]);

  // Sync data to dashboard store when queries complete
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

  const initializeDashboard = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);

      if (!user?.id) {
        throw new Error('User ID not available');
      }

      // Track dashboard initialization
      recordActivity({
        action_type: 'initialize',
        entity_type: 'dashboard',
        entity_id: 'user-dashboard',
        metadata: { timestamp: new Date().toISOString() }
      });

      logger.info('Dashboard integration initialized', { userId: user.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize dashboard';
      setInitializationError(errorMessage);
      logger.error('Dashboard initialization failed', { error });
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      if (!user?.id) return;

      // Initialize notification service with user preferences
      await notificationService.initialize();
      
      // Load user notification preferences
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

      // Load recent notifications
      await notificationService.loadNotifications(user.id, 1, 20);

      logger.info('Notification service initialized for user', { userId: user.id });
    } catch (error) {
      logger.warn('Failed to initialize notifications (non-critical)', { error });
    }
  };

  // Handle real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Set up WebSocket listeners for real-time updates
    const unsubscribers: (() => void)[] = [];

    // Listen for bill status changes
    const handleBillStatusChange = (data: any) => {
      if (data.billId && data.newStatus) {
        // Invalidate dashboard data to trigger refresh
        dashboardQuery.refetch();
        
        // Show notification
        notificationService.notifyBillStatusChange(
          data.billId,
          data.billTitle || 'Unknown Bill',
          data.oldStatus || 'Unknown',
          data.newStatus
        );
      }
    };

    // Listen for new comments
    const handleNewComment = (data: any) => {
      if (data.billId && data.commenterName) {
        // Show notification
        notificationService.notifyNewComment(
          data.billId,
          data.billTitle || 'Unknown Bill',
          data.commenterName
        );
      }
    };

    // Listen for expert analysis
    const handleExpertAnalysis = (data: any) => {
      if (data.billId && data.expertName) {
        // Invalidate dashboard data to trigger refresh
        dashboardQuery.refetch();
        
        // Show notification
        notificationService.notifyExpertAnalysis(
          data.billId,
          data.billTitle || 'Unknown Bill',
          data.expertName
        );
      }
    };

    // Listen for achievements
    const handleAchievement = (data: any) => {
      if (data.title && data.description) {
        // Invalidate achievements query
        achievementsQuery.refetch();
        
        // Show notification
        notificationService.notifyAchievement(data.title, data.description);
      }
    };

    // Set up WebSocket event listeners (this would integrate with your WebSocket service)
    // For now, we'll just log that we're setting up listeners
    logger.info('Setting up real-time event listeners', { userId: user.id });

    return () => {
      // Clean up listeners
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [isAuthenticated, user?.id]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity({
          action_type: 'focus',
          entity_type: 'dashboard',
          entity_id: 'user-dashboard',
          metadata: { timestamp: new Date().toISOString() }
        });
      } else {
        recordActivity({
          action_type: 'blur',
          entity_type: 'dashboard',
          entity_id: 'user-dashboard',
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
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (hasError) {
    const errorMessage = initializationError || 
                        dashboardQuery.error?.message || 
                        'Failed to load dashboard data';

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorMessage 
          message={errorMessage}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Render children with integration context
  return <>{children}</>;
}

export default UserDashboardIntegration;