/**
 * Analytics Integration Component
 *
 * Automatically integrates comprehensive analytics tracking throughout the application
 * Tracks user journeys, performance metrics, and engagement across all personas
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@client/core/auth';
import { useComprehensiveAnalytics } from '@client/features/analytics/hooks/use-comprehensive-analytics';
import { userJourneyTracker, type NavigationSection } from '@client/features/analytics/model/user-journey-tracker';
import { UserRole } from '@shared/types/core/enums';
import { logger } from '@client/lib/utils/logger';

/**
 * Analytics Integration Hook
 *
 * Provides automatic analytics tracking for the entire application
 */
export function useAnalyticsIntegration() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const {
    trackEvent,
    trackPageView,
    trackUserInteraction,
    trackConversion,
    trackError,
    trackPerformance,
    isEnabled,
  } = useComprehensiveAnalytics({
    enabled: true,
    autoTrackPageViews: true,
    autoTrackPerformance: true,
    autoTrackErrors: true,
  });

  const journeyTracker = useRef(userJourneyTracker);
  const sessionId = useRef<string>();
  const pageStartTime = useRef<Date>(new Date());
  const interactionCount = useRef<number>(0);

  /**
   * Initialize session tracking
   */
  useEffect(() => {
    if (!sessionId.current) {
      const userRole = isAuthenticated ? (user?.role as UserRole) || UserRole.Citizen : UserRole.Public;

      // Start journey using the centralized tracker; it returns a session id
      sessionId.current = journeyTracker.current.startJourney(user?.id, userRole as any);

      logger.info('Analytics session started', {
        sessionId: sessionId.current,
        userRole,
        userId: user?.id,
      });
    }
  }, [isAuthenticated, user]);

  /**
   * Track page navigation and journey steps
   */
  useEffect(() => {
    if (!sessionId.current || !isEnabled) return;

    const currentSection = getCurrentSection(location.pathname);
    const userRole = isAuthenticated ? (user?.role as UserRole) || UserRole.Citizen : UserRole.Public;

    // Track journey step
    journeyTracker.current.trackPageVisit(location.pathname, currentSection, document.referrer);

    // Track page view event
    trackPageView(location.pathname, {
      section: currentSection,
      userRole,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });

    // Reset interaction count for new page
    interactionCount.current = 0;
    pageStartTime.current = new Date();

    logger.debug('Page navigation tracked', {
      path: location.pathname,
      section: currentSection,
      userRole,
    });
  }, [location.pathname, isAuthenticated, user, trackPageView, isEnabled]);

  /**
   * Track user interactions automatically
   */
  useEffect(() => {
    if (!isEnabled) return;

    const handleInteraction = (event: Event) => {
      interactionCount.current++;

      const target = event.target as HTMLElement;
      const elementInfo = getElementInfo(target);

      trackUserInteraction(elementInfo.selector, event.type, {
        elementText: elementInfo.text,
        elementType: elementInfo.type,
        timestamp: new Date().toISOString(),
        interactionCount: interactionCount.current,
      });

      // Also update journey tracker state
      journeyTracker.current.trackInteraction(event.type);
    };

    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || form.className || 'unknown-form';

      trackConversion('form_submission', 1, {
        formId,
        formAction: form.action,
        timestamp: new Date().toISOString(),
      });

      // Track journey conversion event in the centralized tracker
      journeyTracker.current.trackInteraction('form_submission');
    };

    const handleSearchSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const searchInput = form.querySelector(
        'input[type="search"], input[name*="search"], input[placeholder*="search"]'
      ) as HTMLInputElement;

      if (searchInput?.value) {
        trackConversion('search_performed', 1, {
          query: searchInput.value,
          timestamp: new Date().toISOString(),
        });

        // Track journey conversion event in the centralized tracker
        journeyTracker.current.trackInteraction('search_performed');
      }
    };

    // Add event listeners
    document.addEventListener('click', handleInteraction, { passive: true });
    document.addEventListener('submit', handleFormSubmit, { passive: true });
    document.addEventListener('submit', handleSearchSubmit, { passive: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('submit', handleSearchSubmit);
    };
  }, [trackUserInteraction, trackConversion, isEnabled]);

  /**
   * Track performance metrics automatically
   */
  useEffect(() => {
    if (!isEnabled) return undefined;

    const trackPagePerformance = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      try {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          trackPerformance({
            pageId: location.pathname,
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            firstContentfulPaint: 0, // Will be updated by Web Vitals
            largestContentfulPaint: 0, // Will be updated by Web Vitals
            cumulativeLayoutShift: 0, // Will be updated by Web Vitals
            firstInputDelay: 0, // Will be updated by Web Vitals
            timeToInteractive: navigation.domInteractive - navigation.fetchStart,
            resourceCount: performance.getEntriesByType('resource').length,
            errorCount: 0,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.warn('Failed to track page performance', { error });
      }
    };

    // Track performance after page load
    if (document.readyState === 'complete') {
      trackPagePerformance();
      return undefined;
    } else {
      window.addEventListener('load', trackPagePerformance);
      return () => window.removeEventListener('load', trackPagePerformance);
    }
  }, [location.pathname, trackPerformance, isEnabled]);

  /**
   * Track errors automatically
   */
  useEffect(() => {
    if (!isEnabled) return;

    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error('Unhandled Promise Rejection'), {
        reason: event.reason,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError, isEnabled]);

  /**
   * Handle session cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionId.current) {
        journeyTracker.current.endJourney();
        logger.info('Analytics session ended', { sessionId: sessionId.current });
      }
    };
  }, []);

  return {
    sessionId: sessionId.current,
    trackEvent,
    trackPageView,
    trackUserInteraction,
    trackConversion,
    trackError,
    trackPerformance,
    isEnabled,
  };
}

/**
 * Analytics Integration Component
 *
 * Automatically integrates analytics tracking when mounted
 */
export const AnalyticsIntegration: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useAnalyticsIntegration();
  return <>{children}</>;
};

/**
 * Utility function to determine current navigation section
 */
function getCurrentSection(pathname: string): NavigationSection {
  if (pathname.includes('/bills') || pathname.includes('/legislative')) return 'legislative';
  if (pathname.includes('/community')) return 'community';
  if (pathname.includes('/admin')) return 'admin';
  if (pathname.includes('/search') || pathname.includes('/profile') || pathname.includes('/account') || pathname.includes('/dashboard')) return 'user';
  return 'tools';
}

/**
 * Utility function to extract element information for tracking
 */
function getElementInfo(element: HTMLElement): {
  selector: string;
  text: string;
  type: string;
} {
  const tagName = element.tagName.toLowerCase();
  const id = element.id;
  const className = element.className;
  const text = element.textContent?.trim().substring(0, 50) || '';

  let selector = tagName;
  if (id) {
    selector += `#${id}`;
  } else if (className) {
    const firstClass = className.split(' ')[0];
    selector += `.${firstClass}`;
  }

  return {
    selector,
    text,
    type: tagName,
  };
}

export default AnalyticsIntegration;
