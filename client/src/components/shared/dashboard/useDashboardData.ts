import { useEffect, useState } from 'react';
import { useUserDashboardSelectors, useUserDashboardStore } from '@client/store/slices/userDashboardSlice';
import { useAuthStore } from '@client/store/slices/authSlice';
import { logger } from '@client/utils/logger';

export interface UseDashboardDataOptions {
  autoLoad?: boolean;
  trackEngagement?: boolean;
  activeTab?: string;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { autoLoad = true, trackEngagement = false, activeTab } = options;

  const { user } = useAuthStore();
  const {
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    timeFilter,
    hasData,
    isDataStale,
    filteredEngagementHistory,
    engagementStats,
    refreshDashboard,
    setTimeFilter,
    setError
  } = useUserDashboardSelectors();

  const dashboardStore = useUserDashboardStore();

  // Modal states
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    if (user && autoLoad && !hasData) {
      loadDashboardData();
    }
  }, [user, autoLoad, hasData]);

  // Auto-refresh based on preferences
  useEffect(() => {
    if (!preferences.refreshInterval || preferences.refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (isDataStale) {
        refreshDashboard();
      }
    }, preferences.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [preferences.refreshInterval, isDataStale, refreshDashboard]);

  // Track engagement when tab changes
  useEffect(() => {
    if (trackEngagement && user && activeTab) {
      dashboardStore.addEngagementItem({
        id: `dashboard_view_${Date.now()}`,
        type: 'view',
        billId: undefined,
        timestamp: new Date().toISOString()
      });
    }
  }, [activeTab, user, trackEngagement]);

  const loadDashboardData = async () => {
    try {
      // In a real implementation, this would fetch from API
      // For now, we'll use mock data or trigger store loading
      await refreshDashboard();
    } catch (error) {
      logger.error('Failed to load dashboard data', { error });
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshDashboard();
    } catch (error) {
      logger.error('Failed to refresh dashboard', { error });
    }
  };

  const updatePreferences = (prefs: Partial<typeof preferences>) => {
    dashboardStore.updatePreferences(prefs);
  };

  const updatePrivacyControls = (controls: Partial<typeof privacyControls>) => {
    dashboardStore.updatePrivacyControls(controls);
  };

  const requestDataExport = async (request: any) => {
    return await dashboardStore.requestDataExport(request);
  };

  return {
    // Data
    user,
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    timeFilter,
    hasData,
    filteredEngagementHistory,
    engagementStats,

    // Actions
    refreshDashboard: handleRefresh,
    setTimeFilter,
    updatePreferences,
    updatePrivacyControls,
    requestDataExport,

    // Modal states
    showPrivacyModal,
    setShowPrivacyModal,
    showExportModal,
    setShowExportModal,
    showPreferencesModal,
    setShowPreferencesModal,

    // Store access for advanced usage
    dashboardStore
  };
}