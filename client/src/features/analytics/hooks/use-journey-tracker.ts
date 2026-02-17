import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { useNavigation } from '@client/core/navigation/context';
import {
  userJourneyTracker,
  JourneyAnalytics,
} from '@client/features/analytics/model/user-journey-tracker';
import { UserRole, NavigationSection } from '@client/lib/types/navigation';

/**
 * Hook for tracking user journeys and analytics
 */
export function useJourneyTracker(session_id?: string, user_id?: string) {
  const location = useLocation();
  const navigation = useNavigation();
  const tracker = useRef(userJourneyTracker);
  const sessionIdRef = useRef(session_id || generateSessionId());
  const lastPageRef = useRef<string>('');
  const pageStartTimeRef = useRef<Date>(new Date());

  /**
   * Generate a unique session ID
   */
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start tracking the user journey
   */
  const startJourney = useCallback(
    (user_role?: UserRole) => {
      // Map navigation UserRole to journey tracker UserRole
      const mappedRole = mapToJourneyRole(user_role || 'public');
      tracker.current.startJourney(user_id, mappedRole);
    },
    [user_id]
  );

  /**
   * Map navigation UserRole to journey tracker UserRole
   */
  function mapToJourneyRole(role: UserRole): 'admin' | 'expert' | 'citizen' | 'guest' {
    if (role === 'admin') return 'admin';
    if (role === 'expert') return 'expert';
    if (role === 'citizen' || role === 'user') return 'citizen';
    return 'guest';
  }

  /**
   * Map navigation NavigationSection to journey tracker NavigationSection
   */
  function mapToJourneySection(section: NavigationSection): 'legislative' | 'community' | 'admin' | 'user' | 'tools' {
    if (section === 'system') return 'tools'; // Map system to tools
    return section as 'legislative' | 'community' | 'admin' | 'user' | 'tools';
  }

  /**
   * Track a page visit
   */
  const trackPageVisit = useCallback(
    (pageId: string, section: NavigationSection, referrer?: string, interactionCount?: number) => {
      const mappedSection = mapToJourneySection(section);
      tracker.current.trackPageVisit(pageId, mappedSection, referrer);
    },
    []
  );

  /**
   * Track a conversion event
   */
  const trackConversion = useCallback((eventName: string) => {
    tracker.current.trackInteraction(eventName);
  }, []);

  /**
   * Complete the current journey
   */
  const completeJourney = useCallback((goalAchieved: boolean = false) => {
    tracker.current.endJourney(goalAchieved);
  }, []);

  /**
   * End the current journey
   */
  const endJourney = useCallback(() => {
    tracker.current.endJourney();
  }, []);

  /**
   * Get journey analytics
   */
  const getAnalytics = useCallback(
    (start_date?: Date, end_date?: Date): JourneyAnalytics => {
      const timeRange = start_date && end_date ? { start: start_date, end: end_date } : undefined;
      return tracker.current.getJourneyAnalytics(timeRange);
    },
    []
  );

  /**
   * Get optimization recommendations
   */
  const getOptimizations = useCallback((start_date?: Date, end_date?: Date): unknown[] => {
    // No dedicated optimization API in the tracker; return an empty list for now.
    return [];
  }, []);

  /**
   * Get goal completion rate
   */
  const getGoalCompletionRate = useCallback((goalName: string): number => {
    // No per-goal API; compute a naive rate from journey analytics
    const analytics = tracker.current.getJourneyAnalytics();
    // Placeholder: return 0 if not available
    return 0;
  }, []);

  // Auto-track page visits when location changes
  useEffect(() => {
    const currentPage = location.pathname;

    // Skip if same page
    if (currentPage === lastPageRef.current) {
      return;
    }

    // Start journey if not already started
    if (!tracker.current.getJourney(sessionIdRef.current)) {
      startJourney(navigation.userRole);
    }

    // Track the page visit
    trackPageVisit(
      currentPage,
      navigation.currentSection,
      lastPageRef.current || document.referrer
    );

    lastPageRef.current = currentPage;
    pageStartTimeRef.current = new Date();
  }, [
    location.pathname,
    navigation.currentSection,
    navigation.userRole,
    startJourney,
    trackPageVisit,
  ]);

  // Track user role changes
  useEffect(() => {
    if (tracker.current.getJourney(sessionIdRef.current)) {
      // Update the journey with new user role
      const journey = tracker.current.getJourney(sessionIdRef.current);
      if (journey && journey.user_role !== mapToJourneyRole(navigation.userRole)) {
        // End current journey and start new one with updated role
        endJourney();
        startJourney(navigation.userRole);
      }
    }
  }, [navigation.userRole, endJourney, startJourney]);

  // Cleanup on unmount
  useEffect(() => {
    const currentTracker = tracker.current;
    const currentSessionId = sessionIdRef.current;
    return () => {
      // End journey when component unmounts (user leaves)
      if (currentTracker.getJourney(currentSessionId)) {
        endJourney();
      }
    };
  }, [endJourney]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized browser
        endJourney();
      } else {
        // User returned to the page
        startJourney(navigation.userRole);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigation.userRole, startJourney, endJourney]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = () => {
      endJourney();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [endJourney]);

  return {
    session_id: sessionIdRef.current,
    startJourney,
    trackPageVisit,
    trackConversion,
    completeJourney,
    endJourney,
    getAnalytics,
    getOptimizations,
    getGoalCompletionRate,

    // Convenience methods for common conversion events
    trackBillAnalysisViewed: () => trackConversion('bill_analysis_viewed'),
    trackCommentPosted: () => trackConversion('comment_posted'),
    trackExpertVerificationCompleted: () => trackConversion('expert_verification_completed'),
    trackUserRegistered: () => trackConversion('user_registered'),
    trackProfileCompleted: () => trackConversion('profile_completed'),
    trackBillTracked: () => trackConversion('bill_tracked'),
    trackSearchPerformed: () => trackConversion('search_performed'),
  };
}

/**
 * Hook for journey analytics (read-only)
 */
export function useJourneyAnalytics() {
  const tracker = useRef(userJourneyTracker);

  const getAnalytics = useCallback(
    (start_date?: Date, end_date?: Date): JourneyAnalytics => {
      const timeRange = start_date && end_date ? { start: start_date, end: end_date } : undefined;
      return tracker.current.getJourneyAnalytics(timeRange);
    },
    []
  );

  const getOptimizations = useCallback((start_date?: Date, end_date?: Date): unknown[] => {
    // No dedicated optimization API in the tracker; return an empty list for now.
    return [];
  }, []);

  const getGoalCompletionRate = useCallback((goalName: string): number => {
    // No per-goal API; compute a naive rate from journey analytics
    const analytics = tracker.current.getJourneyAnalytics();
    // Placeholder: return 0 if not available
    return 0;
  }, []);

  const exportData = useCallback((format: 'json' | 'csv' = 'json'): string => {
    return tracker.current.exportJourneyData(format);
  }, []);

  return {
    getAnalytics,
    getOptimizations,
    getGoalCompletionRate,
    exportData,
  };
}
