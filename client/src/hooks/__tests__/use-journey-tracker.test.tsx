import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useJourneyTracker, useJourneyAnalytics } from '../use-journey-tracker';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { UserJourneyTracker } from '@/services/UserJourneyTracker';
import React from 'react';
import { logger } from '../utils/logger.js';

// Mock the UserJourneyTracker
jest.mock('@/services/UserJourneyTracker');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
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
jest.mock('@/contexts/NavigationContext', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigation: () => ({
    currentPath: '/test-path',
    previousPath: '/',
    breadcrumbs: [],
    relatedPages: [],
    currentSection: 'legislative' as const,
    sidebarOpen: false,
    mobileMenuOpen: false,
    userRole: 'public' as const,
    preferences: {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
    },
    navigateTo: jest.fn(),
    updateBreadcrumbs: jest.fn(),
    updateRelatedPages: jest.fn(),
    toggleSidebar: jest.fn(),
    toggleMobileMenu: jest.fn(),
    updateUserRole: jest.fn(),
    updatePreferences: jest.fn(),
    addToRecentPages: jest.fn(),
  }),
}));

describe('useJourneyTracker', () => {
  let mockTracker: jest.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock tracker instance
    mockTracker = {
      startJourney: jest.fn(),
      trackStep: jest.fn(),
      trackConversionEvent: jest.fn(),
      completeJourney: jest.fn(),
      endJourney: jest.fn(),
      getJourney: jest.fn(),
      getUserJourneys: jest.fn(),
      getJourneyAnalytics: jest.fn(),
      getOptimizationRecommendations: jest.fn(),
      getGoalCompletionRate: jest.fn(),
      exportJourneyData: jest.fn(),
      clearAllData: jest.fn(),
    } as any;

    // Mock the getInstance method
    (UserJourneyTracker.getInstance as jest.Mock).mockReturnValue(mockTracker);
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
      
      expect(result.current.sessionId).toBeDefined();
      expect(typeof result.current.sessionId).toBe('string');
      expect(result.current.sessionId).toMatch(/^session_/);
    });

    it('should use provided session ID', () => {
      const customSessionId = 'custom-session-123';
      const { result } = renderHook(() => useJourneyTracker(customSessionId), { wrapper });
      
      expect(result.current.sessionId).toBe(customSessionId);
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
      
      act(() => {
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
      
      act(() => {
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
      
      act(() => {
        result.current.trackConversion('bill_analysis_viewed');
      });
      
      expect(mockTracker.trackConversionEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        'bill_analysis_viewed'
      );
    });

    it('should provide completeJourney method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      act(() => {
        result.current.completeJourney(true);
      });
      
      expect(mockTracker.completeJourney).toHaveBeenCalledWith(
        expect.stringMatching(/^session_/),
        true
      );
    });

    it('should provide endJourney method', () => {
      const { result } = renderHook(() => useJourneyTracker(), { wrapper });
      
      act(() => {
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
      
      act(() => {
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
      const mockUseLocation = jest.fn()
        .mockReturnValueOnce({ pathname: '/test-path' })
        .mockReturnValueOnce({ pathname: '/bills' });

      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
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

    it('should end journey on unmount', () => {
      mockTracker.getJourney.mockReturnValue({
        sessionId: 'test-session',
        userId: 'test-user',
        userRole: 'public',
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
  let mockTracker: jest.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTracker = {
      getJourneyAnalytics: jest.fn(),
      getOptimizationRecommendations: jest.fn(),
      getGoalCompletionRate: jest.fn(),
      exportJourneyData: jest.fn(),
    } as any;

    (UserJourneyTracker.getInstance as jest.Mock).mockReturnValue(mockTracker);
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
    
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');
    
    act(() => {
      result.current.getAnalytics(startDate, endDate, 'citizen');
      result.current.getOptimizations(startDate, endDate);
      result.current.getGoalCompletionRate('bill_research');
      result.current.exportData('csv');
    });
    
    expect(mockTracker.getJourneyAnalytics).toHaveBeenCalledWith(startDate, endDate, 'citizen');
    expect(mockTracker.getOptimizationRecommendations).toHaveBeenCalledWith(startDate, endDate);
    expect(mockTracker.getGoalCompletionRate).toHaveBeenCalledWith('bill_research');
    expect(mockTracker.exportJourneyData).toHaveBeenCalledWith('csv');
  });

  it('should handle export data with default format', () => {
    const { result } = renderHook(() => useJourneyAnalytics());
    
    act(() => {
      result.current.exportData();
    });
    
    expect(mockTracker.exportJourneyData).toHaveBeenCalledWith('json');
  });
});

describe('Hook Error Handling', () => {
  let mockTracker: jest.Mocked<UserJourneyTracker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTracker = {
      startJourney: jest.fn(),
      trackStep: jest.fn(),
      trackConversionEvent: jest.fn(),
      completeJourney: jest.fn(),
      endJourney: jest.fn(),
      getJourney: jest.fn(),
      getJourneyAnalytics: jest.fn(),
      getOptimizationRecommendations: jest.fn(),
      getGoalCompletionRate: jest.fn(),
      exportJourneyData: jest.fn(),
    } as any;

    (UserJourneyTracker.getInstance as jest.Mock).mockReturnValue(mockTracker);
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
      act(() => {
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
});