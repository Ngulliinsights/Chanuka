/**
 * Mock Data Hook
 * 
 * React hook for accessing mock data with loading states, error handling,
 * and real-time updates integration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mockDataService, dataLoaders, RealTimeEvent } from '../services/mockDataService';
import { logger } from '../utils/logger';

/**
 * Hook state interface
 */
interface MockDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Hook options interface
 */
interface UseMockDataOptions {
  autoLoad?: boolean;
  enableRealTimeUpdates?: boolean;
  refetchOnMount?: boolean;
  cacheKey?: string;
}

/**
 * Default options
 */
const defaultOptions: UseMockDataOptions = {
  autoLoad: true,
  enableRealTimeUpdates: false,
  refetchOnMount: false
};

/**
 * Hook for loading single data type
 */
export function useMockData<T>(
  key: keyof typeof dataLoaders,
  options: UseMockDataOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<MockDataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const realTimeListenerRef = useRef<((event: RealTimeEvent) => void) | null>(null);

  /**
   * Load data function
   */
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await mockDataService.loadData<T>(key);
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      logger.debug(`Mock data loaded successfully for ${key}`, {
        component: 'useMockData',
        dataType: typeof data,
        hasData: data !== null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      logger.error(`Failed to load mock data for ${key}`, {
        component: 'useMockData',
        error: errorMessage
      });
    }
  }, [key]);

  /**
   * Refresh data function
   */
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Real-time event handler
   */
  const handleRealTimeEvent = useCallback((event: RealTimeEvent) => {
    // Check if this event is relevant to our data type
    const relevantEvents = {
      bills: ['bill_status_change', 'bill_engagement_update'],
      activityItems: ['new_comment', 'user_activity'],
      trendingTopics: ['trending_update'],
      liveEngagementMetrics: ['bill_engagement_update', 'user_activity'],
      communityStats: ['new_comment', 'user_activity'],
      realTimeEvents: ['*'] // All events are relevant for real-time events
    };

    const keyRelevantEvents = relevantEvents[key as keyof typeof relevantEvents];
    if (keyRelevantEvents && (keyRelevantEvents.includes('*') || keyRelevantEvents.includes(event.type))) {
      logger.debug(`Real-time update triggered for ${key}`, {
        component: 'useMockData',
        eventType: event.type,
        eventId: event.id
      });
      
      // Refresh data after a short delay to batch updates
      setTimeout(() => {
        refresh();
      }, 100);
    }
  }, [key, refresh]);

  /**
   * Setup real-time updates
   */
  useEffect(() => {
    if (opts.enableRealTimeUpdates) {
      realTimeListenerRef.current = handleRealTimeEvent;
      mockDataService.addRealTimeListener(handleRealTimeEvent);

      return () => {
        if (realTimeListenerRef.current) {
          mockDataService.removeRealTimeListener(realTimeListenerRef.current);
        }
      };
    }
  }, [opts.enableRealTimeUpdates, handleRealTimeEvent]);

  /**
   * Initial data loading
   */
  useEffect(() => {
    if (opts.autoLoad && (!state.data || opts.refetchOnMount)) {
      loadData();
    }
  }, [opts.autoLoad, opts.refetchOnMount, loadData, state.data]);

  return {
    ...state,
    refresh,
    isLoading: state.loading,
    hasData: state.data !== null,
    hasError: state.error !== null
  };
}

/**
 * Hook for loading multiple data types
 */
export function useMockDataBatch(
  keys: (keyof typeof dataLoaders)[],
  options: UseMockDataOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<{
    data: Record<string, any>;
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
  }>({
    data: {},
    loading: false,
    error: null,
    lastUpdated: null
  });

  /**
   * Load batch data function
   */
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await mockDataService.loadBatchData(keys);
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      logger.debug('Mock batch data loaded successfully', {
        component: 'useMockDataBatch',
        keys,
        loadedKeys: Object.keys(data)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      logger.error('Failed to load mock batch data', {
        component: 'useMockDataBatch',
        keys,
        error: errorMessage
      });
    }
  }, [keys]);

  /**
   * Refresh data function
   */
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Initial data loading
   */
  useEffect(() => {
    if (opts.autoLoad && (Object.keys(state.data).length === 0 || opts.refetchOnMount)) {
      loadData();
    }
  }, [opts.autoLoad, opts.refetchOnMount, loadData, state.data]);

  return {
    ...state,
    refresh,
    isLoading: state.loading,
    hasData: Object.keys(state.data).length > 0,
    hasError: state.error !== null
  };
}

/**
 * Hook for real-time events
 */
export function useRealTimeEvents(
  eventTypes?: string[],
  maxEvents: number = 50
) {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const realTimeListenerRef = useRef<((event: RealTimeEvent) => void) | null>(null);

  /**
   * Handle real-time events
   */
  const handleRealTimeEvent = useCallback((event: RealTimeEvent) => {
    // Filter by event types if specified
    if (eventTypes && !eventTypes.includes(event.type)) {
      return;
    }

    setEvents(prev => {
      const newEvents = [event, ...prev];
      // Keep only the most recent events
      return newEvents.slice(0, maxEvents);
    });
  }, [eventTypes, maxEvents]);

  /**
   * Setup real-time listener
   */
  useEffect(() => {
    realTimeListenerRef.current = handleRealTimeEvent;
    mockDataService.addRealTimeListener(handleRealTimeEvent);

    // Load initial events
    const initialEvents = mockDataService.getRecentEvents(maxEvents);
    setEvents(initialEvents);

    return () => {
      if (realTimeListenerRef.current) {
        mockDataService.removeRealTimeListener(realTimeListenerRef.current);
      }
    };
  }, [handleRealTimeEvent, maxEvents]);

  /**
   * Clear events
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  /**
   * Trigger specific event
   */
  const triggerEvent = useCallback((eventType: string) => {
    mockDataService.triggerRealTimeEvent(eventType);
  }, []);

  return {
    events,
    clearEvents,
    triggerEvent,
    eventCount: events.length
  };
}

/**
 * Hook for mock data service status
 */
export function useMockDataService() {
  const [status, setStatus] = useState(mockDataService.getStatus());

  /**
   * Refresh status
   */
  const refreshStatus = useCallback(() => {
    setStatus(mockDataService.getStatus());
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    mockDataService.clearCache();
    refreshStatus();
  }, [refreshStatus]);

  /**
   * Validate data
   */
  const validateData = useCallback(() => {
    return mockDataService.validateData();
  }, []);

  /**
   * Update status periodically
   */
  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    status,
    refreshStatus,
    clearCache,
    validateData,
    cacheStats: status.cacheStats
  };
}