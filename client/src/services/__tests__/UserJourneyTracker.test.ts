import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserJourneyTracker } from '../UserJourneyTracker';

// Mock Date to control timestamps
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

describe('UserJourneyTracker', () => {
  let tracker: UserJourneyTracker;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.setSystemTime(mockDate);
    // Reset singleton instance
    (UserJourneyTracker as any).instance = null;
    tracker = UserJourneyTracker.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UserJourneyTracker.getInstance();
      const instance2 = UserJourneyTracker.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('startJourney', () => {
    it('should create a new journey', () => {
      tracker.startJourney('session-1', 'user-1', 'public');

      const journey = tracker.getJourney('session-1');
      expect(journey).toEqual({
        session_id: 'session-1',
        user_id: 'user-1',
        user_role: 'public',
        startTime: mockDate,
        steps: [],
        completed: false,
        totalTimeSpent: 0,
        conversionEvents: [],
      });
    });

    it('should use default role when not provided', () => {
      tracker.startJourney('session-1');

      const journey = tracker.getJourney('session-1');
      expect(journey?.user_role).toBe('public');
    });
  });

  describe('trackStep', () => {
    it('should add a step to the journey', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'home' as any);

      const journey = tracker.getJourney('session-1');
      expect(journey?.steps).toHaveLength(1);
      expect(journey?.steps[0]).toEqual({
        pageId: '/home',
        timestamp: mockDate,
        timeSpent: 0,
        user_role: 'public',
        section: 'home' as any,
        referrer: undefined,
        interactionCount: undefined,
      });
    });

    it('should auto-start journey if not exists', () => {
      tracker.trackStep('session-1', '/home', 'home' as any);

      const journey = tracker.getJourney('session-1');
      expect(journey).toBeDefined();
      expect(journey?.steps).toHaveLength(1);
    });

    it('should calculate time spent on previous step', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'home' as any);

      // Advance time
      vi.advanceTimersByTime(5000);
      tracker.trackStep('session-1', '/about', 'about' as any);

      const journey = tracker.getJourney('session-1');
      expect(journey?.steps[0].timeSpent).toBe(5000);
      expect(journey?.totalTimeSpent).toBe(5000);
    });

    it('should include referrer and interaction count', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'home' as any, '/referrer', 5);

      const journey = tracker.getJourney('session-1');
      expect(journey?.steps[0].referrer).toBe('/referrer');
      expect(journey?.steps[0].interactionCount).toBe(5);
    });
  });

  describe('trackConversionEvent', () => {
    it('should add conversion event to journey', () => {
      tracker.startJourney('session-1');
      tracker.trackConversionEvent('session-1', 'bill_analysis_viewed');

      const journey = tracker.getJourney('session-1');
      expect(journey?.conversionEvents).toContain('bill_analysis_viewed');
    });

    it('should not add invalid conversion events', () => {
      tracker.startJourney('session-1');
      tracker.trackConversionEvent('session-1', 'invalid_event');

      const journey = tracker.getJourney('session-1');
      expect(journey?.conversionEvents).toHaveLength(0);
    });

    it('should do nothing for non-existent journey', () => {
      tracker.trackConversionEvent('session-1', 'bill_analysis_viewed');
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('completeJourney', () => {
    it('should mark journey as completed', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'navigation');

      vi.advanceTimersByTime(10000);
      tracker.completeJourney('session-1', true);

      const journey = tracker.getJourney('session-1');
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(true);
      expect(journey?.endTime).toEqual(new Date(mockDate.getTime() + 10000));
    });

    it('should calculate final time spent', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'navigation');

      vi.advanceTimersByTime(5000);
      tracker.completeJourney('session-1');

      const journey = tracker.getJourney('session-1');
      expect(journey?.steps[0].timeSpent).toBe(5000);
      expect(journey?.totalTimeSpent).toBe(5000);
    });

    it('should calculate bounce rate', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'navigation');
      tracker.completeJourney('session-1');

      const journey = tracker.getJourney('session-1');
      expect(journey?.bounceRate).toBe(1); // Only one step
    });

    it('should do nothing for non-existent journey', () => {
      tracker.completeJourney('session-1');
      expect(true).toBe(true);
    });
  });

  describe('endJourney', () => {
    it('should mark last step as exit point', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'navigation');
      tracker.trackStep('session-1', '/about', 'content');

      tracker.endJourney('session-1');

      const journey = tracker.getJourney('session-1');
      expect(journey?.steps[1].exitPoint).toBe(true);
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(false);
    });
  });

  describe('getJourneyAnalytics', () => {
    beforeEach(() => {
      // Create some test journeys
      tracker.startJourney('session-1', 'user-1', 'public');
      tracker.trackStep('session-1', '/home', 'navigation');
      vi.advanceTimersByTime(2000);
      tracker.trackStep('session-1', '/bills', 'legislative');
      vi.advanceTimersByTime(3000);
      tracker.completeJourney('session-1', true);

      tracker.startJourney('session-2', 'user-2', 'expert');
      tracker.trackStep('session-2', '/home', 'navigation');
      vi.advanceTimersByTime(1000);
      tracker.endJourney('session-2');
    });

    it('should calculate overall analytics', () => {
      tracker.startJourney('session-1', 'user-1', 'public');
      tracker.trackStep('session-1', '/home', 'home' as any);
      vi.advanceTimersByTime(2000);
      tracker.trackStep('session-1', '/bills', 'bills' as any);
      vi.advanceTimersByTime(3000);
      tracker.completeJourney('session-1', true);

      tracker.startJourney('session-2', 'user-2', 'expert');
      tracker.trackStep('session-2', '/home', 'home' as any);
      vi.advanceTimersByTime(1000);
      tracker.endJourney('session-2');

      const analytics = tracker.getJourneyAnalytics();

      expect(analytics.totalJourneys).toBe(2);
      expect(analytics.completedJourneys).toBe(1);
      expect(analytics.averageJourneyLength).toBe(1.5); // (2 + 1) / 2
      expect(analytics.averageTimeSpent).toBe(3000); // (5000 + 1000) / 2
      expect(analytics.completionRate).toBe(0.5);
      expect(analytics.bounceRate).toBe(0.5);
    });

    it('should filter by user role', () => {
      const analytics = tracker.getJourneyAnalytics(undefined, undefined, 'expert');

      expect(analytics.totalJourneys).toBe(1);
      expect(analytics.completedJourneys).toBe(0);
    });

    it('should filter by date range', () => {
      const startDate = new Date(mockDate.getTime() - 1000);
      const endDate = new Date(mockDate.getTime() + 1000);

      const analytics = tracker.getJourneyAnalytics(startDate, endDate);

      expect(analytics.totalJourneys).toBe(2);
    });
  });

  describe('calculatePopularPaths', () => {
    it('should identify popular navigation paths', () => {
      // Create journeys with similar paths
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'home' as any);
      tracker.trackStep('session-1', '/bills', 'bills' as any);
      tracker.completeJourney('session-1');

      tracker.startJourney('session-2');
      tracker.trackStep('session-2', '/home', 'home' as any);
      tracker.trackStep('session-2', '/bills', 'bills' as any);
      tracker.completeJourney('session-2');

      const analytics = tracker.getJourneyAnalytics();
      const popularPaths = analytics.popularPaths;

      expect(popularPaths).toHaveLength(1);
      expect(popularPaths[0].path).toEqual(['/home', '/bills']);
      expect(popularPaths[0].frequency).toBe(2);
      expect(popularPaths[0].completionRate).toBe(1);
    });
  });

  describe('calculateDropOffPoints', () => {
    it('should identify pages with high drop-off rates', () => {
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/home', 'home' as any);
      tracker.trackStep('session-1', '/bills', 'bills' as any);
      tracker.endJourney('session-1'); // Exit from /bills

      tracker.startJourney('session-2');
      tracker.trackStep('session-2', '/home', 'home' as any);
      tracker.endJourney('session-2'); // Exit from /home

      const analytics = tracker.getJourneyAnalytics();
      const dropOffPoints = analytics.dropOffPoints;

      expect(dropOffPoints).toHaveLength(2);
      const homeDropOff = dropOffPoints.find(p => p.pageId === '/home');
      const billsDropOff = dropOffPoints.find(p => p.pageId === '/bills');

      expect(homeDropOff?.dropOffRate).toBe(0.5); // 1 exit out of 2 visits
      expect(billsDropOff?.dropOffRate).toBe(1); // 1 exit out of 1 visit
    });
  });

  describe('calculateConversionFunnels', () => {
    it('should calculate conversion rates for predefined funnels', () => {
      // Create journey that follows bill research funnel
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/', 'home' as any);
      tracker.trackStep('session-1', '/bills', 'bills' as any);
      tracker.trackStep('session-1', '/bills/123', 'bills' as any);
      tracker.trackStep('session-1', '/bills/123/analysis', 'analysis' as any);
      tracker.completeJourney('session-1');

      const analytics = tracker.getJourneyAnalytics();
      const funnels = analytics.conversionFunnels;

      const billFunnel = funnels.find(f => f.name === 'Bill Research Funnel');
      expect(billFunnel).toBeDefined();
      expect(billFunnel?.conversionRates).toEqual([1, 1, 1, 1]);
      expect(billFunnel?.totalConversions).toBe(1);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should generate recommendations based on analytics', () => {
      // Create journey with drop-off
      tracker.startJourney('session-1');
      tracker.trackStep('session-1', '/problematic-page', 'page' as any);
      tracker.endJourney('session-1');

      const recommendations = tracker.getOptimizationRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].pageId).toBe('/problematic-page');
      expect(recommendations[0].optimizationType).toBe('reduce_friction');
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('getActiveJourneyCount', () => {
    it('should return count of active journeys', () => {
      expect(tracker.getActiveJourneyCount()).toBe(0);

      tracker.startJourney('session-1');
      expect(tracker.getActiveJourneyCount()).toBe(1);

      tracker.completeJourney('session-1');
      expect(tracker.getActiveJourneyCount()).toBe(0);
    });
  });

  describe('getJourney', () => {
    it('should return journey from active or completed journeys', () => {
      tracker.startJourney('session-1');
      expect(tracker.getJourney('session-1')).toBeDefined();

      tracker.completeJourney('session-1');
      expect(tracker.getJourney('session-1')).toBeDefined();
    });

    it('should return undefined for non-existent journey', () => {
      expect(tracker.getJourney('non-existent')).toBeUndefined();
    });
  });

  describe('clearOldJourneys', () => {
    it('should remove journeys older than specified days', () => {
      tracker.startJourney('session-1');
      tracker.completeJourney('session-1');

      // Advance time by 40 days
      vi.advanceTimersByTime(40 * 24 * 60 * 60 * 1000);

      tracker.clearOldJourneys(30);

      expect(tracker.getJourney('session-1')).toBeUndefined();
    });
  });

  describe('User Journey Outcomes and Success Metrics', () => {
    it('should track successful bill research journeys', () => {
      tracker.startJourney('research-session', 'user-1', 'public');

      // Complete bill research funnel
      tracker.trackStep('research-session', '/', 'home' as any);
      vi.advanceTimersByTime(2000);
      tracker.trackStep('research-session', '/bills', 'bills' as any);
      vi.advanceTimersByTime(3000);
      tracker.trackStep('research-session', '/bills/123', 'bills' as any);
      vi.advanceTimersByTime(5000);
      tracker.trackStep('research-session', '/bills/123/analysis', 'analysis' as any);
      vi.advanceTimersByTime(10000);

      // Track conversion events
      tracker.trackConversionEvent('research-session', 'bill_analysis_viewed');
      tracker.trackConversionEvent('research-session', 'search_performed');

      tracker.completeJourney('research-session', true);

      const journey = tracker.getJourney('research-session');
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(true);
      expect(journey?.conversionEvents).toContain('bill_analysis_viewed');
      expect(journey?.totalTimeSpent).toBeGreaterThan(19000); // Sum of all steps
    });

    it('should track community engagement outcomes', () => {
      tracker.startJourney('community-session', 'user-2', 'expert');

      // Community engagement flow
      tracker.trackStep('community-session', '/', 'home' as any);
      vi.advanceTimersByTime(1500);
      tracker.trackStep('community-session', '/community', 'community' as any);
      vi.advanceTimersByTime(4000);
      tracker.trackStep('community-session', '/bills/456', 'bills' as any);
      vi.advanceTimersByTime(6000);
      tracker.trackStep('community-session', '/bills/456/comments', 'comments' as any);
      vi.advanceTimersByTime(8000);

      tracker.trackConversionEvent('community-session', 'comment_posted');
      tracker.trackConversionEvent('community-session', 'bill_tracked');

      tracker.completeJourney('community-session', true);

      const journey = tracker.getJourney('community-session');
      expect(journey?.goalAchieved).toBe(true);
      expect(journey?.conversionEvents).toContain('comment_posted');
      expect(journey?.user_role).toBe('expert');
    });

    it('should track failed journeys and identify pain points', () => {
      tracker.startJourney('failed-session', 'user-3', 'public');

      // User gets stuck and leaves
      tracker.trackStep('failed-session', '/', 'home' as any);
      vi.advanceTimersByTime(1000);
      tracker.trackStep('failed-session', '/bills', 'bills' as any);
      vi.advanceTimersByTime(2000);
      // User exits from bills page
      tracker.endJourney('failed-session');

      const journey = tracker.getJourney('failed-session');
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(false);
      expect(journey?.bounceRate).toBe(0); // More than one step
      expect(journey?.steps[1].exitPoint).toBe(true);
    });

    it('should calculate conversion funnel success rates', () => {
      // Create multiple journeys with different outcomes
      const journeys = [
        { id: 'success-1', steps: ['/', '/bills', '/bills/1', '/bills/1/analysis'], success: true },
        { id: 'success-2', steps: ['/', '/bills', '/bills/2', '/bills/2/analysis'], success: true },
        { id: 'partial-1', steps: ['/', '/bills', '/bills/3'], success: false },
        { id: 'bounce-1', steps: ['/'], success: false },
      ];

      journeys.forEach(({ id, steps, success }) => {
        tracker.startJourney(id);
        steps.forEach((step, index) => {
          tracker.trackStep(id, step, 'navigation' as any);
          if (index < steps.length - 1) {
            vi.advanceTimersByTime(1000);
          }
        });

        if (success) {
          tracker.trackConversionEvent(id, 'bill_analysis_viewed');
          tracker.completeJourney(id, true);
        } else {
          tracker.endJourney(id);
        }
      });

      const analytics = tracker.getJourneyAnalytics();
      const billFunnel = analytics.conversionFunnels.find(f => f.name === 'Bill Research Funnel');

      expect(billFunnel).toBeDefined();
      expect(billFunnel?.totalConversions).toBe(2);
      expect(billFunnel?.conversionRates[3]).toBe(0.5); // 2 out of 4 started, 2 completed
    });

    it('should identify user journey pain points and bottlenecks', () => {
      // Create journeys that highlight common issues
      const problemJourneys = [
        { id: 'slow-page', steps: ['/', '/slow-page'], exitAt: 1 },
        { id: 'confusing-flow', steps: ['/', '/confusing', '/even-more-confusing'], exitAt: 2 },
        { id: 'error-page', steps: ['/', '/error-page'], exitAt: 1 },
      ];

      problemJourneys.forEach(({ id, steps, exitAt }) => {
        tracker.startJourney(id);
        steps.forEach((step, index) => {
          tracker.trackStep(id, step, 'navigation' as any);
          if (index === exitAt) {
            tracker.endJourney(id);
            return;
          }
          vi.advanceTimersByTime(500);
        });
      });

      const analytics = tracker.getJourneyAnalytics();
      const dropOffPoints = analytics.dropOffPoints;

      expect(dropOffPoints.length).toBeGreaterThan(0);
      const highDropOffPages = dropOffPoints.filter(p => p.dropOffRate > 0.5);
      expect(highDropOffPages.length).toBeGreaterThan(0);
    });

    it('should track user onboarding completion rates', () => {
      const onboardingJourneys = [
        { id: 'complete-onboarding', steps: ['/', '/onboarding', '/dashboard', '/profile'], complete: true },
        { id: 'partial-onboarding', steps: ['/', '/onboarding', '/dashboard'], complete: false },
        { id: 'failed-onboarding', steps: ['/', '/onboarding'], complete: false },
      ];

      onboardingJourneys.forEach(({ id, steps, complete }) => {
        tracker.startJourney(id, `user-${id}`, 'public');
        steps.forEach(step => {
          tracker.trackStep(id, step, 'navigation' as any);
          vi.advanceTimersByTime(1000);
        });

        if (complete) {
          tracker.trackConversionEvent(id, 'user_registered');
          tracker.trackConversionEvent(id, 'profile_completed');
          tracker.completeJourney(id, true);
        } else {
          tracker.endJourney(id);
        }
      });

      const analytics = tracker.getJourneyAnalytics();
      const onboardingFunnel = analytics.conversionFunnels.find(f => f.name === 'User Onboarding Funnel');

      expect(onboardingFunnel).toBeDefined();
      expect(onboardingFunnel?.totalConversions).toBe(1);
      expect(onboardingFunnel?.conversionRates[3]).toBe(0.33); // 1 out of 3 completed
    });

    it('should measure user engagement and interaction quality', () => {
      tracker.startJourney('engaged-session', 'user-engaged', 'expert');

      // Track highly engaged journey with many interactions
      tracker.trackStep('engaged-session', '/', 'home' as any, undefined, 15);
      vi.advanceTimersByTime(5000);
      tracker.trackStep('engaged-session', '/bills', 'bills' as any, '/', 25);
      vi.advanceTimersByTime(8000);
      tracker.trackStep('engaged-session', '/bills/789', 'bills' as any, '/bills', 40);
      vi.advanceTimersByTime(12000);

      tracker.trackConversionEvent('engaged-session', 'bill_analysis_viewed');
      tracker.trackConversionEvent('engaged-session', 'comment_posted');
      tracker.trackConversionEvent('engaged-session', 'search_performed');

      tracker.completeJourney('engaged-session', true);

      const journey = tracker.getJourney('engaged-session');
      const totalInteractions = journey?.steps.reduce((sum, step) => sum + (step.interactionCount || 0), 0);

      expect(totalInteractions).toBe(80); // 15 + 25 + 40
      expect(journey?.conversionEvents.length).toBe(3);
      expect(journey?.totalTimeSpent).toBeGreaterThan(20000);
    });

    it('should analyze user role behavior patterns', () => {
      const roleJourneys = [
        { id: 'public-1', role: 'public', path: ['/', '/bills', '/bills/1'] },
        { id: 'public-2', role: 'public', path: ['/', '/community'] },
        { id: 'expert-1', role: 'expert', path: ['/', '/bills', '/bills/2', '/bills/2/analysis'] },
        { id: 'expert-2', role: 'expert', path: ['/', '/expert-verification', '/bills/3/analysis'] },
      ];

      roleJourneys.forEach(({ id, role, path }) => {
        tracker.startJourney(id, `user-${id}`, role as any);
        path.forEach(step => {
          tracker.trackStep(id, step, 'navigation' as any);
          vi.advanceTimersByTime(1000);
        });
        tracker.completeJourney(id, path.length > 2);
      });

      const publicAnalytics = tracker.getJourneyAnalytics(undefined, undefined, 'public');
      const expertAnalytics = tracker.getJourneyAnalytics(undefined, undefined, 'expert');

      expect(publicAnalytics.totalJourneys).toBe(2);
      expect(expertAnalytics.totalJourneys).toBe(2);
      expect(expertAnalytics.completionRate).toBeGreaterThan(publicAnalytics.completionRate);
    });

    it('should track goal achievement and success metrics', () => {
      const goalJourneys = [
        { id: 'goal-achieved', goal: 'bill_research', achieved: true },
        { id: 'goal-partial', goal: 'bill_research', achieved: false },
        { id: 'goal-failed', goal: 'bill_research', achieved: false },
      ];

      goalJourneys.forEach(({ id, goal, achieved }) => {
        tracker.startJourney(id, `user-${id}`, 'public');

        // Simulate goal-oriented paths
        tracker.trackStep(id, '/', 'home' as any);
        vi.advanceTimersByTime(1000);
        tracker.trackStep(id, '/bills', 'bills' as any);
        vi.advanceTimersByTime(2000);

        if (achieved) {
          tracker.trackStep(id, '/bills/123', 'bills' as any);
          vi.advanceTimersByTime(3000);
          tracker.trackStep(id, '/bills/123/analysis', 'analysis' as any);
          vi.advanceTimersByTime(5000);
          tracker.trackConversionEvent(id, 'bill_analysis_viewed');
          tracker.completeJourney(id, true);
        } else {
          tracker.endJourney(id);
        }
      });

      const analytics = tracker.getJourneyAnalytics();
      expect(analytics.completionRate).toBe(0.33); // 1 out of 3
      expect(analytics.totalJourneys).toBe(3);
    });
  });
});
