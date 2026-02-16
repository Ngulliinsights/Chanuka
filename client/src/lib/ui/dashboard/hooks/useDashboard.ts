/**
 * Main dashboard data management hook
 * Following navigation component hook patterns
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  DashboardError,
  DashboardDataFetchError,
  DashboardActionError,
  DashboardTopicError,
} from '@client/core/error';
import { getRecoveryStrategy, executeRecovery } from '@client/core/recovery';
import {
  validateDashboardData,
  validateActionItem,
  validateTrackedTopic,
  safeValidateDashboardConfig,
} from '@client/core/validation';
import { useBills } from '@client/features/bills';
import type {
  DashboardData,
  DashboardAppConfig,
  UseDashboardResult,
  ActionItem,
  TrackedTopic,
} from '@client/lib/types';

const DEFAULT_CONFIG: DashboardAppConfig = {
  refreshInterval: 30000, // 30 seconds
  maxActionItems: 10,
  maxTrackedTopics: 20,
  enableAutoRefresh: true,
  showCompletedActions: false,
  defaultView: 'activity',
};

export function useDashboard(config?: Partial<DashboardAppConfig>): UseDashboardResult {
  const billsQuery = useBills();

  const [dashboardConfig] = useState<DashboardAppConfig>(() => {
    const configValidation = safeValidateDashboardConfig({ ...DEFAULT_CONFIG, ...config });
    return configValidation.success ? configValidation.data : DEFAULT_CONFIG;
  });

  const [error, setError] = useState<DashboardError | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      await billsQuery.refetch();
      setLastRefresh(new Date());
      setRetryCount(0);
    } catch (refreshError: unknown) {
      const dashboardError = new DashboardDataFetchError(
        'refresh',
        refreshError instanceof Error ? refreshError.message : 'Refresh failed'
      );
      setError(dashboardError);
      setRetryCount(prev => prev + 1);
    }
  }, [billsQuery]);

  // Transform bills data to dashboard data format
  const dashboardData: DashboardData = useMemo(
    () => {
      const billsData = billsQuery.data as { summary?: any; actionItems?: ActionItem[]; trackedTopics?: TrackedTopic[] } | undefined;
      return {
        summary: billsData?.summary || {
          billsTracked: 0,
          actionsNeeded: 0,
          topicsCount: 0,
          recentActivity: 0,
          completedActions: 0,
          pendingActions: 0,
          lastUpdated: new Date(),
        },
        actionItems: (billsData?.actionItems as ActionItem[]) || [],
        trackedTopics: (billsData?.trackedTopics as TrackedTopic[]) || [],
        isLoading: billsQuery.isLoading,
        error: billsQuery.error,
        lastRefresh,
      };
    },
    [billsQuery.data, billsQuery.isLoading, billsQuery.error, lastRefresh]
  );

  // Validate dashboard data
  useEffect(() => {
    if (
      !billsQuery.isLoading &&
      (dashboardData.summary || dashboardData.actionItems || dashboardData.trackedTopics)
    ) {
      try {
        validateDashboardData(dashboardData);
        setError(null);
        setRetryCount(0);
        setLastRefresh(new Date());
      } catch (validationError: unknown) {
        const dashboardError =
          validationError instanceof DashboardError
            ? validationError
            : new DashboardDataFetchError(
                'validation',
                validationError instanceof Error ? validationError.message : 'Validation failed'
              );
        setError(dashboardError);
      }
    }
  }, [
    billsQuery.data,
    billsQuery.isLoading,
    dashboardData.summary,
    dashboardData.actionItems,
    dashboardData.trackedTopics,
    dashboardData,
  ]);

  // Handle bills error
  useEffect(() => {
    if (billsQuery.error) {
      const dashboardError = new DashboardDataFetchError('bills-api', billsQuery.error.message);
      setError(dashboardError);
    }
  }, [billsQuery.error]);

  // Auto-refresh functionality
  useEffect(() => {
    if (dashboardConfig.enableAutoRefresh && dashboardConfig.refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, dashboardConfig.refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }

    return undefined;
  }, [dashboardConfig.enableAutoRefresh, dashboardConfig.refreshInterval, refresh]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLastRefresh(null);
  }, []);

  const addTopic = useCallback(
    async (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => {
      try {
        const newTopic: TrackedTopic = {
          ...topic,
          id: `topic-${Date.now()}`,
          created_at: new Date(),
        };

        validateTrackedTopic(newTopic);

        // TODO: Implement actual API call to add topic
        console.log('Adding topic:', newTopic);

        await refresh();
      } catch (topicError: unknown) {
        const dashboardError = new DashboardTopicError(
          'add',
          undefined,
          topicError instanceof Error ? topicError.message : 'Add topic failed'
        );
        setError(dashboardError);
        throw dashboardError;
      }
    },
    [refresh]
  );

  const removeTopic = useCallback(
    async (topicId: string) => {
      try {
        // TODO: Implement actual API call to remove topic
        console.log('Removing topic:', topicId);

        await refresh();
      } catch (topicError: unknown) {
        const dashboardError = new DashboardTopicError(
          'remove',
          topicId,
          topicError instanceof Error ? topicError.message : 'Remove topic failed'
        );
        setError(dashboardError);
        throw dashboardError;
      }
    },
    [refresh]
  );

  const completeAction = useCallback(
    async (actionId: string) => {
      try {
        // TODO: Implement actual API call to complete action
        console.log('Completing action:', actionId);

        await refresh();
      } catch (actionError: unknown) {
        const dashboardError = new DashboardActionError(
          'complete',
          actionError instanceof Error ? actionError.message : 'Complete action failed'
        );
        setError(dashboardError);
        throw dashboardError;
      }
    },
    [refresh]
  );

  const addAction = useCallback(
    async (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const newAction: ActionItem = {
          ...action,
          id: `action-${Date.now()}`,
          created_at: new Date(),
          updated_at: new Date(),
        };

        validateActionItem(newAction);

        // TODO: Implement actual API call to add action
        console.log('Adding action:', newAction);

        await refresh();
      } catch (actionError: unknown) {
        const dashboardError = new DashboardActionError(
          'add',
          actionError instanceof Error ? actionError.message : 'Add action failed'
        );
        setError(dashboardError);
        throw dashboardError;
      }
    },
    [refresh]
  );

  // Recovery functionality
  const recovery = {
    canRecover: error
      ? getRecoveryStrategy({
          error,
          data: dashboardData,
          config: dashboardConfig,
          retryCount,
          lastSuccessfulFetch: lastRefresh || undefined,
        }).canRecover
      : false,

    suggestions: error
      ? getRecoveryStrategy({
          error,
          data: dashboardData,
          config: dashboardConfig,
          retryCount,
          lastSuccessfulFetch: lastRefresh || undefined,
        }).suggestions
      : [],

    recover: async (): Promise<boolean> => {
      if (!error) return true;

      const strategy = getRecoveryStrategy({
        error,
        data: dashboardData,
        config: dashboardConfig,
        retryCount,
        lastSuccessfulFetch: lastRefresh || undefined,
      });

      const recovered = await executeRecovery(strategy, {
        error,
        data: dashboardData,
        config: dashboardConfig,
        retryCount,
        lastSuccessfulFetch: lastRefresh || undefined,
      });

      if (recovered) {
        await refresh();
        return true;
      }

      return false;
    },
  };

  return {
    data: dashboardData,
    loading: billsQuery.isLoading,
    error,
    actions: {
      refresh,
      reset,
      addTopic,
      removeTopic,
      completeAction,
      addAction,
    },
    recovery,
  };
}
