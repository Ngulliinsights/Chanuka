import { UserJourneyTracker, UserJourney, JourneyStep } from '../UserJourneyTracker';
import { UserRole, NavigationSection } from '@/types/navigation';
import { logger } from '@shared/core';

describe('UserJourneyTracker', () => {
  let tracker: UserJourneyTracker;
  const mockSessionId = 'test-session-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    // Get fresh instance and clear data
    tracker = UserJourneyTracker.getInstance();
    tracker.clearAllData();
  });

  describe('Journey Management', () => {
    it('should start a new journey', () => {
      tracker.startJourney(mockSessionId, mockUserId, 'citizen');
      
      const journey = tracker.getJourney(mockSessionId);
      expect(journey).toBeDefined();
      expect(journey?.sessionId).toBe(mockSessionId);
      expect(journey?.userId).toBe(mockUserId);
      expect(journey?.userRole).toBe('citizen');
      expect(journey?.completed).toBe(false);
      expect(journey?.steps).toHaveLength(0);
    });

    it('should track journey steps', () => {
      tracker.startJourney(mockSessionId, mockUserId, 'public');
      
      // Track first step
      tracker.trackStep(mockSessionId, '/', 'legislative');
      
      let journey = tracker.getJourney(mockSessionId);
      expect(journey?.steps).toHaveLength(1);
      expect(journey?.steps[0].pageId).toBe('/');
      expect(journey?.steps[0].section).toBe('legislative');
      
      // Track second step
      tracker.trackStep(mockSessionId, '/bills', 'legislative', '/');
      
      journey = tracker.getJourney(mockSessionId);
      expect(journey?.steps).toHaveLength(2);
      expect(journey?.steps[1].pageId).toBe('/bills');
      expect(journey?.steps[1].referrer).toBe('/');
      
      // First step should now have time spent calculated
      expect(journey?.steps[0].timeSpent).toBeGreaterThan(0);
    });

    it('should track conversion events', () => {
      tracker.startJourney(mockSessionId, mockUserId, 'citizen');
      
      tracker.trackConversionEvent(mockSessionId, 'bill_analysis_viewed');
      tracker.trackConversionEvent(mockSessionId, 'comment_posted');
      
      const journey = tracker.getJourney(mockSessionId);
      expect(journey?.conversionEvents).toContain('bill_analysis_viewed');
      expect(journey?.conversionEvents).toContain('comment_posted');
      expect(journey?.conversionEvents).toHaveLength(2);
    });

    it('should complete a journey', () => {
      tracker.startJourney(mockSessionId, mockUserId, 'expert');
      tracker.trackStep(mockSessionId, '/', 'legislative');
      tracker.trackStep(mockSessionId, '/bills', 'legislative');
      
      tracker.completeJourney(mockSessionId, true);
      
      const journey = tracker.getJourney(mockSessionId);
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(true);
      expect(journey?.endTime).toBeDefined();
      expect(journey?.totalTimeSpent).toBeGreaterThan(0);
    });

    it('should end a journey without completion', () => {
      tracker.startJourney(mockSessionId, mockUserId, 'public');
      tracker.trackStep(mockSessionId, '/', 'legislative');
      tracker.trackStep(mockSessionId, '/bills', 'legislative');
      
      tracker.endJourney(mockSessionId);
      
      const journey = tracker.getJourney(mockSessionId);
      expect(journey?.completed).toBe(true);
      expect(journey?.goalAchieved).toBe(false);
      expect(journey?.steps[journey.steps.length - 1].exitPoint).toBe(true);
    });
  });

  describe('Analytics Calculation', () => {
    beforeEach(() => {
      // Create sample journeys for testing
      createSampleJourneys();
    });

    it('should calculate basic analytics', () => {
      const analytics = tracker.getJourneyAnalytics();
      
      expect(analytics.totalJourneys).toBeGreaterThan(0);
      expect(analytics.completionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.completionRate).toBeLessThanOrEqual(1);
      expect(analytics.averageJourneyLength).toBeGreaterThan(0);
      expect(analytics.bounceRate).toBeGreaterThanOrEqual(0);
      expect(analytics.bounceRate).toBeLessThanOrEqual(1);
    });

    it('should filter analytics by user role', () => {
      const allAnalytics = tracker.getJourneyAnalytics();
      const citizenAnalytics = tracker.getJourneyAnalytics(undefined, undefined, 'citizen');
      
      expect(citizenAnalytics.totalJourneys).toBeLessThanOrEqual(allAnalytics.totalJourneys);
    });

    it('should filter analytics by date range', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const filteredAnalytics = tracker.getJourneyAnalytics(yesterday, tomorrow);
      const allAnalytics = tracker.getJourneyAnalytics();
      
      expect(filteredAnalytics.totalJourneys).toBeLessThanOrEqual(allAnalytics.totalJourneys);
    });

    it('should calculate popular paths', () => {
      const analytics = tracker.getJourneyAnalytics();
      
      expect(analytics.popularPaths).toBeDefined();
      expect(analytics.popularPaths.length).toBeGreaterThan(0);
      
      const firstPath = analytics.popularPaths[0];
      expect(firstPath.path).toBeDefined();
      expect(firstPath.frequency).toBeGreaterThan(0);
      expect(firstPath.completionRate).toBeGreaterThanOrEqual(0);
      expect(firstPath.completionRate).toBeLessThanOrEqual(1);
    });

    it('should calculate drop-off points', () => {
      const analytics = tracker.getJourneyAnalytics();
      
      expect(analytics.dropOffPoints).toBeDefined();
      
      if (analytics.dropOffPoints.length > 0) {
        const dropOff = analytics.dropOffPoints[0];
        expect(dropOff.pageId).toBeDefined();
        expect(dropOff.dropOffRate).toBeGreaterThan(0);
        expect(dropOff.dropOffRate).toBeLessThanOrEqual(1);
        expect(dropOff.improvementSuggestions).toBeDefined();
      }
    });

    it('should calculate conversion funnels', () => {
      const analytics = tracker.getJourneyAnalytics();
      
      expect(analytics.conversionFunnels).toBeDefined();
      expect(analytics.conversionFunnels.length).toBeGreaterThan(0);
      
      const funnel = analytics.conversionFunnels[0];
      expect(funnel.name).toBeDefined();
      expect(funnel.steps).toBeDefined();
      expect(funnel.conversionRates).toBeDefined();
      expect(funnel.dropOffPoints).toBeDefined();
      expect(funnel.steps.length).toBe(funnel.conversionRates.length);
      expect(funnel.steps.length).toBe(funnel.dropOffPoints.length);
    });
  });

  describe('Journey Optimization', () => {
    beforeEach(() => {
      createSampleJourneysWithDropOffs();
    });

    it('should generate optimization recommendations', () => {
      const optimizations = tracker.getOptimizationRecommendations();
      
      expect(optimizations).toBeDefined();
      expect(Array.isArray(optimizations)).toBe(true);
      
      if (optimizations.length > 0) {
        const optimization = optimizations[0];
        expect(optimization.pageId).toBeDefined();
        expect(optimization.optimizationType).toBeDefined();
        expect(optimization.priority).toMatch(/^(high|medium|low)$/);
        expect(optimization.description).toBeDefined();
        expect(optimization.expectedImpact).toBeGreaterThanOrEqual(0);
        expect(optimization.expectedImpact).toBeLessThanOrEqual(1);
        expect(optimization.implementationEffort).toMatch(/^(low|medium|high)$/);
      }
    });

    it('should prioritize high-impact optimizations', () => {
      const optimizations = tracker.getOptimizationRecommendations();
      
      if (optimizations.length > 1) {
        // Check that high priority items come first
        const highPriorityIndex = optimizations.findIndex(opt => opt.priority === 'high');
        const lowPriorityIndex = optimizations.findIndex(opt => opt.priority === 'low');
        
        if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
          expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
        }
      }
    });
  });

  describe('Goal Completion Tracking', () => {
    it('should calculate goal completion rates', () => {
      // Create journeys that complete the bill_research goal
      createBillResearchJourneys();
      
      const completionRate = tracker.getGoalCompletionRate('bill_research');
      expect(completionRate).toBeGreaterThanOrEqual(0);
      expect(completionRate).toBeLessThanOrEqual(1);
    });

    it('should return 0 for unknown goals', () => {
      const completionRate = tracker.getGoalCompletionRate('unknown_goal');
      expect(completionRate).toBe(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      createSampleJourneys();
    });

    it('should export data as JSON', () => {
      const jsonData = tracker.exportJourneyData('json');
      
      expect(typeof jsonData).toBe('string');
      expect(() => JSON.parse(jsonData)).not.toThrow();
      
      const parsed = JSON.parse(jsonData);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export data as CSV', () => {
      const csvData = tracker.exportJourneyData('csv');
      
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('sessionId');
      expect(csvData).toContain('userRole');
      
      const lines = csvData.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });
  });

  describe('User Journey Retrieval', () => {
    it('should get user journeys by user ID', () => {
      tracker.startJourney('session1', 'user1', 'citizen');
      tracker.startJourney('session2', 'user1', 'citizen');
      tracker.startJourney('session3', 'user2', 'expert');
      
      tracker.completeJourney('session1');
      tracker.completeJourney('session2');
      tracker.completeJourney('session3');
      
      const user1Journeys = tracker.getUserJourneys('user1');
      const user2Journeys = tracker.getUserJourneys('user2');
      
      expect(user1Journeys).toHaveLength(2);
      expect(user2Journeys).toHaveLength(1);
      expect(user1Journeys.every(j => j.userId === 'user1')).toBe(true);
      expect(user2Journeys.every(j => j.userId === 'user2')).toBe(true);
    });
  });

  // Helper functions for creating test data
  function createSampleJourneys() {
    // Journey 1: Complete bill research journey
    tracker.startJourney('journey1', 'user1', 'citizen');
    tracker.trackStep('journey1', '/', 'legislative');
    tracker.trackStep('journey1', '/bills', 'legislative');
    tracker.trackStep('journey1', '/bills/123', 'legislative');
    tracker.trackStep('journey1', '/bills/123/analysis', 'legislative');
    tracker.trackConversionEvent('journey1', 'bill_analysis_viewed');
    tracker.completeJourney('journey1', true);

    // Journey 2: Incomplete journey (bounce)
    tracker.startJourney('journey2', 'user2', 'public');
    tracker.trackStep('journey2', '/', 'legislative');
    tracker.endJourney('journey2');

    // Journey 3: Community engagement journey
    tracker.startJourney('journey3', 'user3', 'expert');
    tracker.trackStep('journey3', '/', 'legislative');
    tracker.trackStep('journey3', '/community', 'community');
    tracker.trackStep('journey3', '/bills/456', 'legislative');
    tracker.trackConversionEvent('journey3', 'comment_posted');
    tracker.completeJourney('journey3', true);

    // Journey 4: Admin workflow
    tracker.startJourney('journey4', 'admin1', 'admin');
    tracker.trackStep('journey4', '/admin', 'admin');
    tracker.trackStep('journey4', '/admin/database', 'admin');
    tracker.completeJourney('journey4', true);
  }

  function createSampleJourneysWithDropOffs() {
    // Create journeys with high drop-off rates on specific pages
    for (let i = 0; i < 10; i++) {
      tracker.startJourney(`dropoff-journey-${i}`, `user-${i}`, 'public');
      tracker.trackStep(`dropoff-journey-${i}`, '/', 'legislative');
      tracker.trackStep(`dropoff-journey-${i}`, '/bills', 'legislative');
      
      // 70% drop off at bills page
      if (i < 7) {
        tracker.endJourney(`dropoff-journey-${i}`);
      } else {
        tracker.trackStep(`dropoff-journey-${i}`, '/bills/123', 'legislative');
        tracker.completeJourney(`dropoff-journey-${i}`, true);
      }
    }
  }

  function createBillResearchJourneys() {
    // Complete bill research journeys
    for (let i = 0; i < 3; i++) {
      tracker.startJourney(`research-complete-${i}`, `user-${i}`, 'citizen');
      tracker.trackStep(`research-complete-${i}`, '/', 'legislative');
      tracker.trackStep(`research-complete-${i}`, '/bills', 'legislative');
      tracker.trackStep(`research-complete-${i}`, '/bills/123', 'legislative');
      tracker.trackStep(`research-complete-${i}`, '/bills/123/analysis', 'legislative');
      tracker.completeJourney(`research-complete-${i}`, true);
    }

    // Incomplete bill research journeys
    for (let i = 0; i < 2; i++) {
      tracker.startJourney(`research-incomplete-${i}`, `user-${i + 10}`, 'citizen');
      tracker.trackStep(`research-incomplete-${i}`, '/', 'legislative');
      tracker.trackStep(`research-incomplete-${i}`, '/bills', 'legislative');
      tracker.endJourney(`research-incomplete-${i}`);
    }
  }
});

describe('UserJourneyTracker Singleton', () => {
  it('should return the same instance', () => {
    const instance1 = UserJourneyTracker.getInstance();
    const instance2 = UserJourneyTracker.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should maintain state across getInstance calls', () => {
    const instance1 = UserJourneyTracker.getInstance();
    instance1.startJourney('test-session', 'test-user', 'citizen');
    
    const instance2 = UserJourneyTracker.getInstance();
    const journey = instance2.getJourney('test-session');
    
    expect(journey).toBeDefined();
    expect(journey?.sessionId).toBe('test-session');
  });
});

describe('UserJourneyTracker Edge Cases', () => {
  let tracker: UserJourneyTracker;

  beforeEach(() => {
    tracker = UserJourneyTracker.getInstance();
    tracker.clearAllData();
  });

  it('should handle tracking steps without starting journey', () => {
    // Should auto-start journey
    tracker.trackStep('auto-session', '/', 'legislative');
    
    const journey = tracker.getJourney('auto-session');
    expect(journey).toBeDefined();
    expect(journey?.steps).toHaveLength(1);
  });

  it('should handle invalid conversion events', () => {
    tracker.startJourney('test-session', 'test-user', 'citizen');
    
    // Should not add invalid events
    tracker.trackConversionEvent('test-session', 'invalid_event');
    
    const journey = tracker.getJourney('test-session');
    expect(journey?.conversionEvents).toHaveLength(0);
  });

  it('should handle completing non-existent journey', () => {
    // Should not throw error
    expect(() => {
      tracker.completeJourney('non-existent-session');
    }).not.toThrow();
  });

  it('should handle empty analytics gracefully', () => {
    const analytics = tracker.getJourneyAnalytics();
    
    expect(analytics.totalJourneys).toBe(0);
    expect(analytics.completionRate).toBe(0);
    expect(analytics.bounceRate).toBe(0);
    expect(analytics.popularPaths).toHaveLength(0);
    expect(analytics.dropOffPoints).toHaveLength(0);
  });
});











































