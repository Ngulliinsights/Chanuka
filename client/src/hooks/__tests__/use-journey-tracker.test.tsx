import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useJourneyTracker, useJourneyAnalytics } from '../use-journey-tracker';
import { createNavigationProvider } from '@client/core/navigation/context';
import { UserJourneyTracker } from '@client/services/UserJourneyTracker';
import React from 'react';
import { logger } from '@client/utils/logger';

// Mock the UserJourneyTracker
vi.mock('@/services/UserJourneyTracker');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/test-path',
    search: '',
    hash: '',
    state: null,
    key: 'test-key'
  }),
  useNavigate: () => mockNavigate,
}));

// Mock NavigationContext
vi.mock('@/contexts/NavigationContext', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigation: () => ({
    currentPath: '/test-path',
    previousPath: '/',
    breadcrumbs: [],
    relatedPages: [],
    currentSection: 'legislative' as const,
    sidebarOpen: false,
    mobileMenuOpen: false,
    user_role: 'public' as const,
    preferences: {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
    },
    navigateTo: vi.fn(),
    updateBreadcrumbs: vi.fn(),
    updateRelatedPages: vi.fn(),
    toggleSidebar: vi.fn(),
    toggleMobileMenu: vi.fn(),
    updateUserRole: vi.fn(),
    updatePreferences: vi.fn(),
    addToRecentPages: vi.fn(),
  }),
}));

describe('useJourneyTracker', () => {
  let mockTracker: vi.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock tracker instance
    mockTracker = {
      startJourney: vi.fn(),
      trackStep: vi.fn(),
      trackConversionEvent: vi.fn(),
      completeJourney: vi.fn(),
      endJourney: vi.fn(),
      getJourney: vi.fn(),
      getUserJourneys: vi.fn(),
      getJourneyAnalytics: vi.fn(),
      getOptimizationRecommendations: vi.fn(),
      getGoalCompletionRate: vi.fn(),
      exportJourneyData: vi.fn(),
      clearAllData: vi.fn(),
    } as any;

    // Mock the getInstance method
    (UserJourneyTracker.getInstance as vi.Mock).mockReturnValue(mockTracker);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <NavigationProvider>
        {children}
      </NavigationProvider>
    </BrowserRouter>
  );

  describe('Hook Initialization', () => {
    it('should initialize with a session ID', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      expect(result.current.session_id).toBeDefined();
      expect(typeof result.current.session_id).toBe('string');
      expect(result.current.session_id).toMatch(/^session_/);
    });

    it('should use provided session ID', () => {
      const customSessionId = 'custom-session-123';
      const { result } = renderHook(() => useJourneyTracker(customSessionId), { wrapper });
      
      expect(result.current.session_id).toBe(customSessionId);
    });

    it('should start journey on mount', () => {
      renderHook(() => useJourneyTracker(), { wrapper });
      
      expect(mockTracker.startJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        undefined,
        'public'
      );
    });
  });

  describe('Journey Tracking Methods', () => {
    it('should provide startJourney method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.startJourney('citizen');
      });
      
      expect(mockTracker.startJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        undefined,
        'citizen'
      );
    });

    it('should provide trackPageVisit method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.trackPageVisit('/bills', 'legislative', '/', 5);
      });
      
      expect(mockTracker.trackStep).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        '/bills',
        'legislative',
        '/',
        5
      );
    });

    it('should provide trackConversion method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.trackConversion('bill_analysis_viewed');
      });
      
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'bill_analysis_viewed'
      );
    });

    it('should provide completeJourney method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.completeJourney(true);
      });
      
      expect(mockTracker.completeJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        true
      );
    });

    it('should provide endJourney method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.endJourney();
      });
      
      expect(mockTracker.endJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/)
      );
    });
  });

  describe('Analytics Methods', () => {
    it('should provide getAnalytics method', () => {
      const mockAnalytics = {
        totalJourneys: 10,
        completedJourneys: 8,
        averageJourneyLength: 3.5,
        averageTimeSpent: 120000,
        completionRate: 0.8,
        bounceRate: 0.1,
        popularPaths: [],
        dropOffPoints: [],
        conversionFunnels: [],
      };
      
      mockTracker.getJourneyAnalytics.mockReturnValue(mockAnalytics);
      
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      const analytics = result.current.getAnalytics();
      
      expect(mockTracker.getJourneyAnalytics).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined
      );
      expect(analytics).toEqual(mockAnalytics);
    });

    it('should provide getOptimizations method', () => {
      const mockOptimizations = [
        {
          pageId: '/bills',
          optimizationType: 'reduce_friction' as const,
          priority: 'high' as const,
          description: 'High drop-off rate',
          expectedImpact: 0.3,
          implementationEffort: 'medium' as const,
        },
      ];
      
      mockTracker.getOptimizationRecommendations.mockReturnValue(mockOptimizations);
      
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      const optimizations = result.current.getOptimizations();
      
      expect(mockTracker.getOptimizationRecommendations).toHaveBeenCalledWith(
        undefined,
        undefined
      );
      expect(optimizations).toEqual(mockOptimizations);
    });

    it('should provide getGoalCompletionRate method', () => {
      mockTracker.getGoalCompletionRate.mockReturnValue(0.75);
      
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      const completionRate = result.current.getGoalCompletionRate('bill_research');
      
      expect(mockTracker.getGoalCompletionRate).toHaveBeenCalledWith('bill_research');
      expect(completionRate).toBe(0.75);
    });
  });

  describe('Convenience Methods', () => {
    it('should provide convenience methods for common conversions', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      await act(() => {
        result.current.trackBillAnalysisViewed();
        result.current.trackCommentPosted();
        result.current.trackExpertVerificationCompleted();
        result.current.trackUserRegistered();
        result.current.trackProfileCompleted();
        result.current.trackBillTracked();
        result.current.trackSearchPerformed();
      });
      
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'bill_analysis_viewed'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'comment_posted'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'expert_verification_completed'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'user_registered'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'profile_completed'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'bill_tracked'
      );
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'search_performed'
      );
    });
  });

  describe('Automatic Tracking', () => {
    it('should automatically track page visits on location change', () => {
      // Mock location change
      const mockUseLocation = vi.fn()
        .mockReturnValueOnce({ pathname: '/test-path' })
        .mockReturnValueOnce({ pathname: '/bills' });

      vi.doMock('react-router-dom', () => ({
        ...vi.requireActual('react-router-dom'),
        useLocation: mockUseLocation,
      }));

      const { rerender } = renderHook(() => useJourneyTracker(), { wrapper });
      
      // Clear previous calls
      mockTracker.trackStep.mockClear();
      
      // Trigger rerender with new location
      rerender();
      
      // Should track the page visit
      expect(mockTracker.trackStep).toHaveBeenCalled();
    });

    it('should end journey on unmount', () => { mockTracker.getJourney.mockReturnValue({
        session_id: 'test-session',
        user_id: 'test-user',
        user_role: 'public',
        startTime: new Date(),
        steps: [],
        completed: false,
        totalTimeSpent: 0,
        conversionEvents: [],
       });

      const { unmount } = renderHook(() => useJourneyTracker(), { wrapper });
      
      unmount();
      
      expect(mockTracker.endJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/)
      );
    });
  });
});

describe('useJourneyAnalytics', () => {
  let mockTracker: vi.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTracker = {
      getJourneyAnalytics: vi.fn(),
      getOptimizationRecommendations: vi.fn(),
      getGoalCompletionRate: vi.fn(),
      exportJourneyData: vi.fn(),
    } as any;

    (UserJourneyTracker.getInstance as vi.Mock).mockReturnValue(mockTracker);
  });

  it('should provide analytics methods', () => {
    const { result } = renderHook(() => useJourneyAnalytics());
    
    expect(result.current.getAnalytics).toBeDefined();
    expect(result.current.getOptimizations).toBeDefined();
    expect(result.current.getGoalCompletionRate).toBeDefined();
    expect(result.current.exportData).toBeDefined();
  });

  it('should call tracker methods with correct parameters', () => {
    const { result } = renderHook(() => useJourneyAnalytics());
    
    const start_date = new Date('2023-01-01');
    const end_date = new Date('2023-12-31');
    
    await act(() => {
      result.current.getAnalytics(start_date, end_date, 'citizen');
      result.current.getOptimizations(start_date, end_date);
      result.current.getGoalCompletionRate('bill_research');
      result.current.exportData('csv');
    });
    
    expect(mockTracker.getJourneyAnalytics).toHaveBeenCalledWith(start_date, end_date, 'citizen');
    expect(mockTracker.getOptimizationRecommendations).toHaveBeenCalledWith(start_date, end_date);
    expect(mockTracker.getGoalCompletionRate).toHaveBeenCalledWith('bill_research');
    expect(mockTracker.exportJourneyData).toHaveBeenCalledWith('csv');
  });

  it('should handle export data with default format', () => {
    const { result } = renderHook(() => useJourneyAnalytics());
    
    await act(() => {
      result.current.exportData();
    });
    
    expect(mockTracker.exportJourneyData).toHaveBeenCalledWith('json');
  });
});

describe('Hook Error Handling', () => {
  let mockTracker: vi.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTracker = {
      startJourney: vi.fn(),
      trackStep: vi.fn(),
      trackConversionEvent: vi.fn(),
      completeJourney: vi.fn(),
      endJourney: vi.fn(),
      getJourney: vi.fn(),
      getJourneyAnalytics: vi.fn(),
      getOptimizationRecommendations: vi.fn(),
      getGoalCompletionRate: vi.fn(),
      exportJourneyData: vi.fn(),
    } as any;

    (UserJourneyTracker.getInstance as vi.Mock).mockReturnValue(mockTracker);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <NavigationProvider>
        {children}
      </NavigationProvider>
    </BrowserRouter>
  );

  it('should handle tracker method errors gracefully', () => {
    mockTracker.trackStep.mockImplementation(() => {
      throw new Error('Tracker error');
    });

    const { result } = renderHook(() => useJourneyTracker(), { wrapper });
    
    // Should not throw error
    expect(() => {
      await act(() => {
        result.current.trackPageVisit('/test', 'legislative');
      });
    }).not.toThrow();
  });

  it('should handle analytics errors gracefully', () => {
    mockTracker.getJourneyAnalytics.mockImplementation(() => {
      throw new Error('Analytics error');
    });

    const { result } = renderHook(() => useJourneyAnalytics());

    // Should not throw error
    expect(() => {
      result.current.getAnalytics();
    }).not.toThrow();
  });

  describe('Complex State Interactions', () => {
    it('should handle concurrent journey tracking with multiple sessions', async () => {
      const { result: result1 } = renderHook(() => useJourneyTracker('session-1'), { wrapper });
      const { result: result2 } = renderHook(() => useJourneyTracker('session-2'), { wrapper });

      // Track different paths for each session
      await act(() => {
        result1.current.trackPageVisit('/bills', 'legislative');
        result2.current.trackPageVisit('/community', 'community');
      });

      expect(mockTracker.trackStep).toHaveBeenCalledWith('session-1', '/bills', 'legislative', undefined, undefined);
      expect(mockTracker.trackStep).toHaveBeenCalledWith('session-2', '/community', 'community', undefined, undefined);
    });

    it('should manage state transitions during complex user flows', async () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });

      // Simulate complex user flow with multiple state changes
      await act(() => {
        result.current.trackPageVisit('/', 'home');
      });

      // Simulate async operation (like API call)
      await new Promise(resolve => setTimeout(resolve, 100));

      await act(() => {
        result.current.trackPageVisit('/bills', 'legislative');
        result.current.trackConversion('search_performed');
      });

      await act(() => {
        result.current.trackPageVisit('/bills/123', 'legislative');
        result.current.trackConversion('bill_analysis_viewed');
      });

      await act(() => {
        result.current.completeJourney(true);
      });

      expect(mockTracker.trackStep).toHaveBeenCalledTimes(3);
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledTimes(2);
      expect(mockTracker.completeJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        true
      );
    });

    it('should handle rapid state changes and race conditions', async () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });

      // Simulate rapid user interactions
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          act(() => {
            result.current.trackPageVisit(`/page-${i}`, 'navigation');
          })
        );
      }

      await Promise.all(promises);

      expect(mockTracker.trackStep).toHaveBeenCalledTimes(5);
    });

    it('should maintain state consistency across hook re-renders', async () => {
      const { result, rerender } = renderHook(() => useJourneyTracker('test-session'), { wrapper });

      await act(() => {
        result.current.trackPageVisit('/initial', 'navigation');
      });

      // Force re-render
      rerender();

      await act(() => {
        result.current.trackPageVisit('/second', 'navigation');
      });

      expect(mockTracker.trackStep).toHaveBeenCalledWith('test-session', '/initial', 'navigation', undefined, undefined);
      expect(mockTracker.trackStep).toHaveBeenCalledWith('test-session', '/second', 'navigation', undefined, undefined);
    });

    it('should handle complex analytics queries with multiple filters', () => {
      const { result } = renderHook(() => useJourneyAnalytics());

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      act(() => {
        result.current.getAnalytics(startDate, endDate, 'expert');
      });

      expect(mockTracker.getJourneyAnalytics).toHaveBeenCalledWith(startDate, endDate, 'expert');
    });

    it('should manage state during error recovery scenarios', async () => {
      mockTracker.trackStep.mockImplementationOnce(() => {
        throw new Error('Temporary tracking error');
      }).mockImplementationOnce(() => {
        // Succeed on retry
      });

      const { result } = renderHook(() => useJourneyTracker(), { wrapper });

      // First call fails
      await act(() => {
        result.current.trackPageVisit('/test', 'navigation');
      });

      // Second call succeeds
      await act(() => {
        result.current.trackPageVisit('/test2', 'navigation');
      });

      expect(mockTracker.trackStep).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle complex conversion funnel tracking', async () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });

      // Track a complete conversion funnel
      await act(() => {
        result.current.trackPageVisit('/', 'home');
        result.current.trackPageVisit('/bills', 'legislative');
        result.current.trackPageVisit('/bills/123', 'legislative');
        result.current.trackPageVisit('/bills/123/analysis', 'analysis');
        result.current.trackBillAnalysisViewed();
        result.current.trackCommentPosted();
        result.current.completeJourney(true);
      });

      expect(mockTracker.trackStep).toHaveBeenCalledTimes(4);
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledTimes(2);
      expect(mockTracker.completeJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        true
      );
    });

    it('should manage state during navigation context changes', async () => {
      // Mock changing navigation context
      const mockUseNavigation = vi.fn()
        .mockReturnValueOnce({
          currentPath: '/',
          currentSection: 'home' as const,
          user_role: 'public' as const,
        })
        .mockReturnValueOnce({
          currentPath: '/bills',
          currentSection: 'legislative' as const,
          user_role: 'expert' as const,
        });

      vi.doMock('@/contexts/NavigationContext', () => ({
        useNavigation: mockUseNavigation,
      }));

      const { result, rerender } = renderHook(() => useJourneyTracker(), { wrapper });

      await act(() => {
        result.current.trackPageVisit('/initial', 'home');
      });

      rerender();

      await act(() => {
        result.current.trackPageVisit('/bills', 'legislative');
      });

      expect(mockTracker.trackStep).toHaveBeenCalledTimes(2);
    });

    it('should handle complex optimization recommendation queries', () => {
      const { result } = renderHook(() => useJourneyAnalytics());

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      act(() => {
        result.current.getOptimizations(startDate, endDate);
      });

      expect(mockTracker.getOptimizationRecommendations).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should maintain state isolation between multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useJourneyTracker('session-a'), { wrapper });
      const { result: result2 } = renderHook(() => useJourneyTracker('session-b'), { wrapper });

      expect(result1.current.session_id).toBe('session-a');
      expect(result2.current.session_id).toBe('session-b');
      expect(result1.current.session_id).not.toBe(result2.current.session_id);
    });
  });
});

