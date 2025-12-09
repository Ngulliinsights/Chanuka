/**
 * Navigation Analytics Component
 * 
 * Advanced analytics integration for navigation behavior tracking.
 * Implements Phase 2 recommendations for navigation analytics.
 */

import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { navigationUtils } from '@client/utils/navigation';
import { logger } from '@client/utils/logger';

interface NavigationAnalyticsProps {
  children: React.ReactNode;
  enablePageViews?: boolean;
  enableUserJourney?: boolean;
  enablePerformanceTracking?: boolean;
}

interface NavigationMetrics {
  pageLoadTime: number;
  navigationTime: number;
  userInteractions: number;
  searchQueries: string[];
  mostVisitedPages: string[];
}

export function NavigationAnalytics({
  children,
  enablePageViews = true,
  enableUserJourney = true,
  enablePerformanceTracking = true
}: NavigationAnalyticsProps) {
  const location = useLocation();
  const [metrics, setMetrics] = React.useState<NavigationMetrics>({
    pageLoadTime: 0,
    navigationTime: 0,
    userInteractions: 0,
    searchQueries: [],
    mostVisitedPages: []
  });

  // Track page views
  useEffect(() => {
    if (!enablePageViews) return;

    const startTime = performance.now();
    
    navigationUtils.trackNavigationEvent('page_view', {
      path: location.pathname,
      source: 'navigation_analytics'
    });

    // Track page load performance
    if (enablePerformanceTracking) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            setMetrics(prev => ({
              ...prev,
              pageLoadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
              navigationTime: performance.now() - startTime
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });

      return () => observer.disconnect();
    }
  }, [location.pathname, enablePageViews, enablePerformanceTracking]);

  // Track user journey
  useEffect(() => {
    if (!enableUserJourney) return;

    const handleUserInteraction = () => {
      setMetrics(prev => ({
        ...prev,
        userInteractions: prev.userInteractions + 1
      }));
    };

    // Track clicks, keyboard interactions, and touch events
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [enableUserJourney]);

  // Analytics reporting
  const reportAnalytics = useCallback(() => {
    try {
      logger.info('Navigation Analytics Report', {
        path: location.pathname,
        metrics,
        timestamp: new Date().toISOString()
      });

      // Here you could send to analytics service
      // Example: analytics.track('navigation_metrics', metrics);
    } catch (error) {
      logger.error('Failed to report navigation analytics', { error });
    }
  }, [location.pathname, metrics]);

  // Report analytics periodically
  useEffect(() => {
    const interval = setInterval(reportAnalytics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [reportAnalytics]);

  return (
    <NavigationAnalyticsContext.Provider value={{ metrics, reportAnalytics }}>
      {children}
    </NavigationAnalyticsContext.Provider>
  );
}

// Context for accessing analytics data
const NavigationAnalyticsContext = React.createContext<{
  metrics: NavigationMetrics;
  reportAnalytics: () => void;
} | null>(null);

export function useNavigationAnalytics() {
  const context = React.useContext(NavigationAnalyticsContext);
  if (!context) {
    throw new Error('useNavigationAnalytics must be used within NavigationAnalytics');
  }
  return context;
}

// HOC for wrapping components with analytics
export function withNavigationAnalytics<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AnalyticsWrappedComponent(props: P) {
    return (
      <NavigationAnalytics>
        <Component {...props} />
      </NavigationAnalytics>
    );
  };
}

export default NavigationAnalytics;