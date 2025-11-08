import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import React from 'react';
import {
  ResponsiveLayoutManager,
  getResponsiveManager,
  useResponsiveLayout,
  ResponsiveUtils,
  createResponsiveStyles,
  BREAKPOINTS,
} from '../responsive-layout';

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

global.ResizeObserver = mockResizeObserver as any;
mockResizeObserver.mockImplementation((callback) => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
}));

// Mock window properties
const mockInnerWidth = 1024;
const mockInnerHeight = 768;

Object.defineProperty(window, 'innerWidth', {
  value: mockInnerWidth,
  writable: true,
});

Object.defineProperty(window, 'innerHeight', {
  value: mockInnerHeight,
  writable: true,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

// Mock React hooks for testing
const mockUseState = vi.fn();
const mockUseEffect = vi.fn();

vi.doMock('react', () => ({
  useState: mockUseState,
  useEffect: mockUseEffect,
}));

describe('ResponsiveLayoutManager', () => {
  let manager: ResponsiveLayoutManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (global as any).responsiveManager = null;
    manager = new ResponsiveLayoutManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with correct state', () => {
      const state = manager.getCurrentState();
      expect(state.breakpoint).toBe('lg');
      expect(state.isMobile).toBe(false);
      expect(state.isTablet).toBe(false);
      expect(state.isDesktop).toBe(true);
      expect(state.width).toBe(1024);
      expect(state.height).toBe(768);
      expect(state.orientation).toBe('landscape');
    });

    it('should setup ResizeObserver when available', () => {
      expect(mockResizeObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalledWith(document.documentElement);
    });

    it('should fallback to window resize event when ResizeObserver not available', () => {
      delete (global as any).ResizeObserver;
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const newManager = new ResponsiveLayoutManager();

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });

      newManager.destroy();
      global.ResizeObserver = mockResizeObserver as any;
    });
  });

  describe('State Calculation', () => {
    it('should calculate mobile state', () => {
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      const state = manager['calculateState']();
      expect(state.breakpoint).toBe('sm');
      expect(state.isMobile).toBe(true);
      expect(state.isTablet).toBe(false);
      expect(state.isDesktop).toBe(false);
    });

    it('should calculate tablet state', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      const state = manager['calculateState']();
      expect(state.breakpoint).toBe('md');
      expect(state.isMobile).toBe(false);
      expect(state.isTablet).toBe(true);
      expect(state.isDesktop).toBe(false);
    });

    it('should calculate desktop state', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      const state = manager['calculateState']();
      expect(state.breakpoint).toBe('xl');
      expect(state.isMobile).toBe(false);
      expect(state.isTablet).toBe(false);
      expect(state.isDesktop).toBe(true);
    });

    it('should calculate portrait orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      const state = manager['calculateState']();
      expect(state.orientation).toBe('portrait');
    });

    it('should calculate landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'innerHeight', { value: 600 });
      const state = manager['calculateState']();
      expect(state.orientation).toBe('landscape');
    });
  });

  describe('Event Handling', () => {
    it('should handle resize events with debouncing', () => {
      vi.useFakeTimers();
      const updateStateSpy = vi.spyOn(manager as any, 'updateState');

      manager['handleResize']();

      expect(updateStateSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(updateStateSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle orientation change', () => {
      const updateStateSpy = vi.spyOn(manager as any, 'updateState');

      manager['handleOrientationChange']();

      expect(updateStateSpy).toHaveBeenCalled();
    });

    it('should update state when changed', () => {
      const notifySpy = vi.spyOn(manager as any, 'notifyListeners');

      // Change width to trigger state change
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      manager['updateState']();

      expect(notifySpy).toHaveBeenCalled();
    });

    it('should not notify when state unchanged', () => {
      const notifySpy = vi.spyOn(manager as any, 'notifyListeners');

      manager['updateState']();

      expect(notifySpy).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe and notify listeners', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(manager.getCurrentState());

      // Trigger state change
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      manager['updateState']();

      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      manager.subscribe(errorListener);

      // This should not throw
      expect(() => {
        Object.defineProperty(window, 'innerWidth', { value: 600 });
        manager['updateState']();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should destroy properly', () => {
      manager.destroy();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(manager['listeners'].size).toBe(0);
    });

    it('should clear timeout on destroy', () => {
      vi.useFakeTimers();
      manager['handleResize']();

      manager.destroy();

      expect(manager['resizeTimeout']).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getResponsiveManager();
      const instance2 = getResponsiveManager();
      expect(instance1).toBe(instance2);
    });
  });
});

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseState.mockReturnValue([{}, vi.fn()]);
    mockUseEffect.mockReturnValue(vi.fn());
  });

  it('should return responsive state', () => {
    // Mock SSR environment
    delete (global as any).window;

    const result = renderHook(() => useResponsiveLayout());

    expect(result.breakpoint).toBe('lg');
    expect(result.isDesktop).toBe(true);

    // Restore window
    global.window = window;
  });

  it('should subscribe to manager on mount', () => {
    const mockSubscribe = vi.fn();
    const mockManager = { subscribe: mockSubscribe, getCurrentState: vi.fn() };
    vi.mocked(getResponsiveManager).mockReturnValue(mockManager as any);

    renderHook(() => useResponsiveLayout());

    expect(mockSubscribe).toHaveBeenCalled();
  });
});

describe('ResponsiveUtils', () => {
  describe('getContainerMaxWidth', () => {
    it('should return correct max width for breakpoint', () => {
      expect(ResponsiveUtils.getContainerMaxWidth('sm')).toBe('640px');
      expect(ResponsiveUtils.getContainerMaxWidth('lg')).toBe('1024px');
      expect(ResponsiveUtils.getContainerMaxWidth('2xl')).toBe('1536px');
    });
  });

  describe('getGridColumns', () => {
    it('should return correct columns for breakpoint', () => {
      expect(ResponsiveUtils.getGridColumns('xs')).toBe(1);
      expect(ResponsiveUtils.getGridColumns('sm')).toBe(2);
      expect(ResponsiveUtils.getGridColumns('md')).toBe(3);
      expect(ResponsiveUtils.getGridColumns('lg')).toBe(4);
      expect(ResponsiveUtils.getGridColumns('xl')).toBe(6);
      expect(ResponsiveUtils.getGridColumns('2xl', 8)).toBe(8);
    });
  });

  describe('getSpacing', () => {
    it('should return correct spacing for breakpoint and scale', () => {
      expect(ResponsiveUtils.getSpacing('md', 'md')).toBe('1.25rem');
      expect(ResponsiveUtils.getSpacing('lg', 'lg')).toBe('2rem');
    });
  });

  describe('matchesMediaQuery', () => {
    it('should return true for matching query', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      expect(ResponsiveUtils.matchesMediaQuery('(min-width: 768px)')).toBe(true);
    });

    it('should return false for non-matching query', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      expect(ResponsiveUtils.matchesMediaQuery('(min-width: 1200px)')).toBe(false);
    });

    it('should return false in SSR', () => {
      delete (global as any).window;
      expect(ResponsiveUtils.matchesMediaQuery('(min-width: 768px)')).toBe(false);
      global.window = window;
    });
  });

  describe('getFontSize', () => {
    it('should return correct font size for breakpoint and size', () => {
      expect(ResponsiveUtils.getFontSize('md', 'base')).toBe('1.125rem');
      expect(ResponsiveUtils.getFontSize('xl', 'xl')).toBe('1.875rem');
    });
  });

  describe('generateResponsiveClasses', () => {
    it('should generate responsive classes', () => {
      const classes = ResponsiveUtils.generateResponsiveClasses('base-class', {
        sm: 'sm-class',
        md: 'md-class',
      });
      expect(classes).toBe('base-class sm:sm-class md:md-class');
    });

    it('should handle xs breakpoint without prefix', () => {
      const classes = ResponsiveUtils.generateResponsiveClasses('base', {
        xs: 'xs-class',
        lg: 'lg-class',
      });
      expect(classes).toBe('base xs-class lg:lg-class');
    });
  });
});

describe('createResponsiveStyles', () => {
  it('should create responsive styles based on current breakpoint', () => {
    const styles = {
      sm: { fontSize: '14px' },
      md: { fontSize: '16px' },
      lg: { fontSize: '18px' },
    };

    const result = createResponsiveStyles(styles);
    expect(result).toEqual({ fontSize: '18px' });
  });

  it('should merge styles from smaller breakpoints', () => {
    const styles = {
      sm: { fontSize: '14px', color: 'blue' },
      lg: { fontSize: '18px' },
    };

    const result = createResponsiveStyles(styles);
    expect(result).toEqual({ fontSize: '18px', color: 'blue' });
  });
});

describe('BREAKPOINTS', () => {
  it('should have correct breakpoint values', () => {
    expect(BREAKPOINTS.xs).toBe(0);
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
    expect(BREAKPOINTS['2xl']).toBe(1536);
  });
});

// Helper function for hook testing (simplified)
function renderHook<T>(hook: () => T): T {
  let result: T;
  const TestComponent = () => {
    result = hook();
    return null;
  };

  // Mock React rendering
  TestComponent();

  return result!;
}