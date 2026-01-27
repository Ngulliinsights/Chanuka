/**
 * Comprehensive Analytics Hook
 *
 * React hook for integrating with the comprehensive analytics tracker
 * Provides easy-to-use methods for tracking events and accessing analytics data
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  ComprehensiveAnalyticsTracker,
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsDashboardData,
  PagePerformanceMetrics,
  UserEngagementMetrics,
} from '@client/core/analytics/comprehensive-tracker';
import { useNavigation } from '@client/core/navigation/context';
import { logger } from '@client/lib/utils/logger';

/**
 * Hook options for customizing analytics behavior
 */
export interface UseComprehensiveAnalyticsOptions {
  enabled?: boolean;
  autoTrackPageViews?: boolean;
  autoTrackPerformance?: boolean;
  autoTrackErrors?: boolean;
  flushInterval?: number;
  sessionTimeout?: number;
}

/**
 * Analytics tracking methods and data
 */
export interface ComprehensiveAnalyticsHook {
  // Tracking methods
  trackEvent: (eventType: AnalyticsEventType, data?: Record<string, unknown>) => Promise<void>;
  trackPageView: (page?: string, additionalData?: Record<string, unknown>) => Promise<void>;
  trackUserInteraction: (
    element: string,
    action: string,
    data?: Record<string, unknown>
  ) => Promise<void>;
  trackConversion: (
    conversionType: string,
    value?: number,
    data?: Record<string, unknown>
  ) => Promise<void>;
  trackError: (error: Error, context?: Record<string, unknown>) => Promise<void>;
  trackPerformance: (metrics: Partial<PagePerformanceMetrics>) => Promise<void>;

  // Data access methods
  getDashboardData: () => Promise<AnalyticsDashboardData>;
  getMetrics: () => ReturnType<ComprehensiveAnalyticsTracker['getMetrics']>;
  exportData: () => ReturnType<ComprehensiveAnalyticsTracker['exportData']>;

  // Configuration methods
  setEnabled: (enabled: boolean) => void;
  clearData: () => void;

  // State
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  lastEventTime: Date | null;
}

/**
 * Default options for the analytics hook
 */
const DEFAULT_OPTIONS: Required<UseComprehensiveAnalyticsOptions> = {
  enabled: true,
  autoTrackPageViews: true,
  autoTrackPerformance: true,
  autoTrackErrors: true,
  flushInterval: 30000, // 30 seconds
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
};

/**
 * Comprehensive Analytics Hook
 */
export function useComprehensiveAnalytics(
  options: UseComprehensiveAnalyticsOptions = {}
): ComprehensiveAnalyticsHook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const location = useLocation();
  const navigation = useNavigation();

  const trackerRef = useRef<ComprehensiveAnalyticsTracker>();
  const [isEnabled, setIsEnabledState] = useState(mergedOptions.enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  const sessionStartRef = useRef<Date>(new Date());
  const lastActivityRef = useRef<Date>(new Date());
  const pageStartTimeRef = useRef<Date>(new Date());

  /**
   * Initialize the analytics tracker
   */
  useEffect(() => {
    try {
      trackerRef.current = ComprehensiveAnalyticsTracker.getInstance();
      trackerRef.current.setEnabled(mergedOptions.enabled);

      logger.info('Comprehensive analytics hook initialized');
    } catch (err) {
      logger.error('Failed to initialize comprehensive analytics', { error: err });
      setError('Failed to initialize analytics');
    }
  }, [mergedOptions.enabled]);

  /**
   * Auto-track page views when location changes
   */
  useEffect(() => {
    if (!mergedOptions.autoTrackPageViews || !trackerRef.current || !isEnabled) {
      return;
    }

    const trackPageView = async () => {
      try {
        await trackerRef.current!.trackEvent({
          type: 'page_view',
          data: {
            path: location.pathname,
            search: location.search,
            hash: location.hash,
            referrer: document.referrer,
            timeOnPreviousPage: Date.now() - pageStartTimeRef.current.getTime(),
          },
        });

        pageStartTimeRef.current = new Date();
        setLastEventTime(new Date());
        setError(null);
      } catch (err) {
        logger.error('Failed to track page view', { error: err, path: location.pathname });
        setError('Failed to track page view');
      }
    };

    trackPageView();
  }, [
    location.pathname,
    location.search,
    location.hash,
    mergedOptions.autoTrackPageViews,
    isEnabled,
  ]);

  /**
   * Auto-track performance metrics
   */
  useEffect(() => {
    if (!mergedOptions.autoTrackPerformance || !trackerRef.current || !isEnabled) {
      return;
    }

    const trackPerformanceMetrics = () => {
      if (typeof window === 'undefined' || !window.performance) {
        return;
      }

      try {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          const metrics: Partial<PagePerformanceMetrics> = {
            pageId: location.pathname,
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            timeToInteractive: navigation.domInteractive - navigation.fetchStart,
            timestamp: new Date(),
          };

          trackerRef.current!.trackEvent({
            type: 'performance_issue',
            data: { performanceMetrics: metrics },
          });
        }
      } catch (err) {
        logger.warn('Failed to track performance metrics', { error: err });
      }
    };

    // Track performance after page load
    if (document.readyState === 'complete') {
      trackPerformanceMetrics();
    } else {
      window.addEventListener('load', trackPerformanceMetrics);
      return () => window.removeEventListener('load', trackPerformanceMetrics);
    }
  }, [location.pathname, mergedOptions.autoTrackPerformance, isEnabled]);

  /**
   * Auto-track JavaScript errors
   */
  useEffect(() => {
    if (!mergedOptions.autoTrackErrors || !trackerRef.current || !isEnabled) {
      return;
    }

    const handleError = (event: ErrorEvent) => {
      trackerRef.current!.trackEvent({
        type: 'error_occurred',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackerRef.current!.trackEvent({
        type: 'error_occurred',
        data: {
          message: 'Unhandled Promise Rejection',
          reason: event.reason,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [mergedOptions.autoTrackErrors, isEnabled]);

  /**
   * Session timeout handling
   */
  useEffect(() => {
    if (!isEnabled || !trackerRef.current) {
      return;
    }

    const checkSessionTimeout = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();

      if (timeSinceLastActivity > mergedOptions.sessionTimeout) {
        // Session timed out - track session end
        trackerRef.current!.trackEvent({
          type: 'user_interaction',
          data: {
            action: 'session_timeout',
            sessionDuration: now.getTime() - sessionStartRef.current.getTime(),
            lastActivity: lastActivityRef.current.toISOString(),
          },
        });

        // Reset session
        sessionStartRef.current = now;
        lastActivityRef.current = now;
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isEnabled, mergedOptions.sessionTimeout]);

  /**
   * Track a custom analytics event
   */
  const trackEvent = useCallback(
    async (eventType: AnalyticsEventType, data?: Record<string, unknown>): Promise<void> => {
      if (!trackerRef.current || !isEnabled) {
        return;
      }

      try {
        setIsLoading(true);

        await trackerRef.current.trackEvent({
          type: eventType,
          data: {
            ...data,
            sessionDuration: Date.now() - sessionStartRef.current.getTime(),
            timeOnPage: Date.now() - pageStartTimeRef.current.getTime(),
          },
        });

        lastActivityRef.current = new Date();
        setLastEventTime(new Date());
        setError(null);
      } catch (err) {
        logger.error('Failed to track event', { error: err, eventType, data });
        setError(`Failed to track ${eventType} event`);
      } finally {
        setIsLoading(false);
      }
    },
    [isEnabled]
  );

  /**
   * Track a page view event
   */
  const trackPageView = useCallback(
    async (page?: string, additionalData?: Record<string, unknown>): Promise<void> => {
      const pageToTrack = page || location.pathname;

      await trackEvent('page_view', {
        page: pageToTrack,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        ...additionalData,
      });
    },
    [trackEvent, location.pathname]
  );

  /**
   * Track a user interaction event
   */
  const trackUserInteraction = useCallback(
    async (element: string, action: string, data?: Record<string, unknown>): Promise<void> => {
      await trackEvent('user_interaction', {
        element,
        action,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    [trackEvent]
  );

  /**
   * Track a conversion event
   */
  const trackConversion = useCallback(
    async (
      conversionType: string,
      value?: number,
      data?: Record<string, unknown>
    ): Promise<void> => {
      await trackEvent('conversion_event', {
        conversionType,
        value,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    [trackEvent]
  );

  /**
   * Track an error event
   */
  const trackError = useCallback(
    async (error: Error, context?: Record<string, unknown>): Promise<void> => {
      await trackEvent('error_occurred', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent]
  );

  /**
   * Track performance metrics
   */
  const trackPerformance = useCallback(
    async (metrics: Partial<PagePerformanceMetrics>): Promise<void> => {
      await trackEvent('performance_issue', {
        performanceMetrics: {
          pageId: location.pathname,
          timestamp: new Date(),
          ...metrics,
        },
      });
    },
    [trackEvent, location.pathname]
  );

  /**
   * Get dashboard data
   */
  const getDashboardData = useCallback(async (): Promise<AnalyticsDashboardData> => {
    if (!trackerRef.current) {
      throw new Error('Analytics tracker not initialized');
    }

    try {
      setIsLoading(true);
      const data = await trackerRef.current.getAnalyticsDashboard();
      setError(null);
      return data;
    } catch (err) {
      logger.error('Failed to get dashboard data', { error: err });
      setError('Failed to load dashboard data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get current metrics
   */
  const getMetrics = useCallback(() => {
    if (!trackerRef.current) {
      return {
        eventCount: 0,
        userEngagementCount: 0,
        pageMetricsCount: 0,
        isEnabled: false,
      };
    }

    return trackerRef.current.getMetrics();
  }, []);

  /**
   * Export analytics data
   */
  const exportData = useCallback(() => {
    if (!trackerRef.current) {
      return {
        events: [],
        engagement: [],
        pageMetrics: [],
        timestamp: new Date(),
      };
    }

    return trackerRef.current.exportData();
  }, []);

  /**
   * Enable/disable analytics tracking
   */
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    if (trackerRef.current) {
      trackerRef.current.setEnabled(enabled);
    }
    logger.info(`Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  /**
   * Clear all analytics data
   */
  const clearData = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.clearData();
    }
    setLastEventTime(null);
    setError(null);
    logger.info('Analytics data cleared');
  }, []);

  return {
    // Tracking methods
    trackEvent,
    trackPageView,
    trackUserInteraction,
    trackConversion,
    trackError,
    trackPerformance,

    // Data access methods
    getDashboardData,
    getMetrics,
    exportData,

    // Configuration methods
    setEnabled,
    clearData,

    // State
    isEnabled,
    isLoading,
    error,
    lastEventTime,
  };
}

/**
 * Hook for tracking specific user interactions with automatic event binding
 */
export function useInteractionTracking(elementId?: string) {
  const { trackUserInteraction } = useComprehensiveAnalytics();

  const trackClick = useCallback(
    (element?: string, data?: Record<string, unknown>) => {
      trackUserInteraction(element || elementId || 'unknown', 'click', data);
    },
    [trackUserInteraction, elementId]
  );

  const trackHover = useCallback(
    (element?: string, data?: Record<string, unknown>) => {
      trackUserInteraction(element || elementId || 'unknown', 'hover', data);
    },
    [trackUserInteraction, elementId]
  );

  const trackFocus = useCallback(
    (element?: string, data?: Record<string, unknown>) => {
      trackUserInteraction(element || elementId || 'unknown', 'focus', data);
    },
    [trackUserInteraction, elementId]
  );

  const trackScroll = useCallback(
    (element?: string, data?: Record<string, unknown>) => {
      trackUserInteraction(element || elementId || 'unknown', 'scroll', data);
    },
    [trackUserInteraction, elementId]
  );

  return {
    trackClick,
    trackHover,
    trackFocus,
    trackScroll,
  };
}

/**
 * Hook for tracking form interactions and conversions
 */
export function useFormTracking(formId: string) {
  const { trackUserInteraction, trackConversion } = useComprehensiveAnalytics();

  const trackFormStart = useCallback(
    (data?: Record<string, unknown>) => {
      trackUserInteraction(formId, 'form_start', data);
    },
    [trackUserInteraction, formId]
  );

  const trackFormSubmit = useCallback(
    (data?: Record<string, unknown>) => {
      trackConversion('form_submission', 1, { formId, ...data });
    },
    [trackConversion, formId]
  );

  const trackFormError = useCallback(
    (error: string, data?: Record<string, unknown>) => {
      trackUserInteraction(formId, 'form_error', { error, ...data });
    },
    [trackUserInteraction, formId]
  );

  const trackFieldInteraction = useCallback(
    (fieldName: string, action: string, data?: Record<string, unknown>) => {
      trackUserInteraction(`${formId}.${fieldName}`, action, data);
    },
    [trackUserInteraction, formId]
  );

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackFieldInteraction,
  };
}

/**
 * Hook for tracking search interactions
 */
export function useSearchTracking() {
  const { trackUserInteraction, trackConversion } = useComprehensiveAnalytics();

  const trackSearchQuery = useCallback(
    (query: string, filters?: Record<string, unknown>) => {
      trackUserInteraction('search', 'query', { query, filters });
    },
    [trackUserInteraction]
  );

  const trackSearchResult = useCallback(
    (query: string, resultCount: number, clickedResult?: string) => {
      trackUserInteraction('search', 'results', {
        query,
        resultCount,
        clickedResult,
      });

      if (clickedResult) {
        trackConversion('search_click', 1, { query, clickedResult });
      }
    },
    [trackUserInteraction, trackConversion]
  );

  const trackSearchFilter = useCallback(
    (filterType: string, filterValue: string) => {
      trackUserInteraction('search', 'filter', { filterType, filterValue });
    },
    [trackUserInteraction]
  );

  return {
    trackSearchQuery,
    trackSearchResult,
    trackSearchFilter,
  };
}

export default useComprehensiveAnalytics;
