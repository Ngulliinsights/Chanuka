import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { UserJourneyTracker, JourneyAnalytics, JourneyOptimization } from '@/services/UserJourneyTracker';
import { UserRole, NavigationSection } from '@/types/navigation';

/**
 * Hook for tracking user journeys and analytics
 */
export function useJourneyTracker(sessionId?: string, userId?: string) {
  const location = useLocation();
  const navigation = useNavigation();
  const tracker = useRef(UserJourneyTracker.getInstance());
  const sessionIdRef = useRef(sessionId || generateSessionId());
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
  const startJourney = useCallback((userRole: UserRole = 'public') => {
    tracker.current.startJourney(sessionIdRef.current, userId, userRole);
  }, [userId]);

  /**
   * Track a page visit
   */
  const trackPageVisit = useCallback((
    pageId: string,
    section: NavigationSection,
    referrer?: string,
    interactionCount?: number
  ) => {
    tracker.current.trackStep(
      sessionIdRef.current,
      pageId,
      section,
      referrer,
      interactionCount
    );
  }, []);

  /**
   * Track a conversion event
   */
  const trackConversion = useCallback((eventName: string) => {
    tracker.current.trackConversionEvent(sessionIdRef.current, eventName);
  }, []);

  /**
   * Complete the current journey
   */
  const completeJourney = useCallback((goalAchieved: boolean = false) => {
    tracker.current.completeJourney(sessionIdRef.current, goalAchieved);
  }, []);

  /**
   * End the current journey
   */
  const endJourney = useCallback(() => {
    tracker.current.endJourney(sessionIdRef.current);
  }, []);

  /**
   * Get journey analytics
   */
  const getAnalytics = useCallback((
    startDate?: Date,
    endDate?: Date,
    userRole?: UserRole
  ): JourneyAnalytics => {
    return tracker.current.getJourneyAnalytics(startDate, endDate, userRole);
  }, []);

  /**
   * Get optimization recommendations
   */
  const getOptimizations = useCallback((
    startDate?: Date,
    endDate?: Date
  ): JourneyOptimization[] => {
    return tracker.current.getOptimizationRecommendations(startDate, endDate);
  }, []);

  /**
   * Get goal completion rate
   */
  const getGoalCompletionRate = useCallback((goalName: string): number => {
    return tracker.current.getGoalCompletionRate(goalName);
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
  }, [location.pathname, navigation.currentSection, navigation.userRole, startJourney, trackPageVisit]);

  // Track user role changes
  useEffect(() => {
    if (tracker.current.getJourney(sessionIdRef.current)) {
      // Update the journey with new user role
      const journey = tracker.current.getJourney(sessionIdRef.current);
      if (journey && journey.userRole !== navigation.userRole) {
        // End current journey and start new one with updated role
        endJourney();
        startJourney(navigation.userRole);
      }
    }
  }, [navigation.userRole, endJourney, startJourney]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // End journey when component unmounts (user leaves)
      if (tracker.current.getJourney(sessionIdRef.current)) {
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
    sessionId: sessionIdRef.current,
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
  const tracker = useRef(UserJourneyTracker.getInstance());

  const getAnalytics = useCallback((
    startDate?: Date,
    endDate?: Date,
    userRole?: UserRole
  ): JourneyAnalytics => {
    return tracker.current.getJourneyAnalytics(startDate, endDate, userRole);
  }, []);

  const getOptimizations = useCallback((
    startDate?: Date,
    endDate?: Date
  ): JourneyOptimization[] => {
    return tracker.current.getOptimizationRecommendations(startDate, endDate);
  }, []);

  const getGoalCompletionRate = useCallback((goalName: string): number => {
    return tracker.current.getGoalCompletionRate(goalName);
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