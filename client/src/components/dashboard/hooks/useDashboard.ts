/**
 * Main dashboard data management hook
 * Following navigation component hook patterns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBills } from '..\..\..\hooks\use-bills';
import type { 
  DashboardData, 
  DashboardConfig, 
  UseDashboardResult,
  ActionItem,
  TrackedTopic 
} from '../types';
import { 
  validateDashboardData, 
  validateActionItem, 
  validateTrackedTopic,
  safeValidateDashboardConfig 
} from '../validation';
import { 
  DashboardError, 
  DashboardDataFetchError, 
  DashboardActionError,
  DashboardTopicError 
} from '../errors';
import { getRecoveryStrategy, executeRecovery } from '../recovery';

const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 30000, // 30 seconds
  maxActionItems: 10,
  maxTrackedTopics: 20,
  enableAutoRefresh: true,
  showCompletedActions: false,
  defaultView: 'activity'
};

export function useDashboard(config?: Partial<DashboardConfig>): UseDashboardResult {
  const { 
    summary, 
    actionItems, 
    trackedTopics, 
    isLoading: billsLoading,
    error: billsError,
    refetch: refetchBills 
  } = useBills();

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(() => {
    const configValidation = safeValidateDashboardConfig({ ...DEFAULT_CONFIG, ...config });
    return configValidation.success ? configValidation.data : DEFAULT_CONFIG;
  });

  const [error, setError] = useState<DashboardError | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Transform bills data to dashboard data format
  const dashboardData: DashboardData = {
    summary: summary || {
      billsTracked: 0,
      actionsNeeded: 0,
      topicsCount: 0,
      recentActivity: 0,
      completedActions: 0,
      pendingActions: 0,
      lastUpdated: new Date()
    },
    actionItems: actionItems || [],
    trackedTopics: trackedTopics || [],
    isLoading: billsLoading,
    error: billsError,
    lastRefresh
  };

  // Validate dashboard data
  useEffect(() => {
    if (!billsLoading && (summary || actionItems || trackedTopics)) {
      try {
        validateDashboardData(dashboardData);
        setError(null);
        setRetryCount(0);
        setLastRefresh(new Date());
      } catch (validationError) {
        const dashboardError = validationError instanceof DashboardError 
          ? validationError 
          : new DashboardDataFetchError('validation', validationError.message);
        setError(dashboardError);
      }
    }
  }, [summary, actionItems, trackedTopics, billsLoading]);

  // Handle bills error
  useEffect(() => {
    if (billsError) {
      const dashboardError = new DashboardDataFetchError('bills-api', billsError.message);
      setError(dashboardError);
    }
  }, [billsError]);

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
  }, [dashboardConfig.enableAutoRefresh, dashboardConfig.refreshInterval]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      await refetchBills();
      setLastRefresh(new Date());
      setRetryCount(0);
    } catch (refreshError) {
      const dashboardError = new DashboardDataFetchError('refresh', refreshError.message);
      setError(dashboardError);
      setRetryCount(prev => prev + 1);
    }
  }, [refetchBills]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLastRefresh(null);
  }, []);

  const addTopic = useCallback(async (topic: Omit<TrackedTopic, 'id' | 'createdAt'>) => {
    try {
      const newTopic: TrackedTopic = {
        ...topic,
        id: `topic-${Date.now()}`,
        createdAt: new Date()
      };
      
      validateTrackedTopic(newTopic);
      
      // TODO: Implement actual API call to add topic
      console.log('Adding topic:', newTopic);
      
      await refresh();
    } catch (topicError) {
      const dashboardError = new DashboardTopicError('add', undefined, topicError.message);
      setError(dashboardError);
      throw dashboardError;
    }
  }, [refresh]);

  const removeTopic = useCallback(async (topicId: string) => {
    try {
      // TODO: Implement actual API call to remove topic
      console.log('Removing topic:', topicId);
      
      await refresh();
    } catch (topicError) {
      const dashboardError = new DashboardTopicError('remove', topicId, topicError.message);
      setError(dashboardError);
      throw dashboardError;
    }
  }, [refresh]);

  const completeAction = useCallback(async (actionId: string) => {
    try {
      // TODO: Implement actual API call to complete action
      console.log('Completing action:', actionId);
      
      await refresh();
    } catch (actionError) {
      const dashboardError = new DashboardActionError('complete', actionError.message);
      setError(dashboardError);
      throw dashboardError;
    }
  }, [refresh]);

  const addAction = useCallback(async (action: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAction: ActionItem = {
        ...action,
        id: `action-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      validateActionItem(newAction);
      
      // TODO: Implement actual API call to add action
      console.log('Adding action:', newAction);
      
      await refresh();
    } catch (actionError) {
      const dashboardError = new DashboardActionError('add', actionError.message);
      setError(dashboardError);
      throw dashboardError;
    }
  }, [refresh]);

  // Recovery functionality
  const recovery = {
    canRecover: error ? getRecoveryStrategy({ 
      error, 
      data: dashboardData, 
      config: dashboardConfig, 
      retryCount,
      lastSuccessfulFetch: lastRefresh 
    }).canRecover : false,
    
    suggestions: error ? getRecoveryStrategy({ 
      error, 
      data: dashboardData, 
      config: dashboardConfig, 
      retryCount,
      lastSuccessfulFetch: lastRefresh 
    }).suggestions : [],
    
    recover: async (): Promise<boolean> => {
      if (!error) return true;
      
      const strategy = getRecoveryStrategy({ 
        error, 
        data: dashboardData, 
        config: dashboardConfig, 
        retryCount,
        lastSuccessfulFetch: lastRefresh 
      });
      
      const recovered = await executeRecovery(strategy, { 
        error, 
        data: dashboardData, 
        config: dashboardConfig, 
        retryCount,
        lastSuccessfulFetch: lastRefresh 
      });
      
      if (recovered) {
        await refresh();
        return true;
      }
      
      return false;
    }
  };

  return {
    data: dashboardData,
    loading: billsLoading,
    error,
    actions: {
      refresh,
      reset,
      addTopic,
      removeTopic,
      completeAction,
      addAction
    },
    recovery
  };
}