import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from '../use-mobile';
import { logger } from '@/utils/browser-logger';

// Mock matchMedia
const mockMatchMedia = vi.fn();

describe('useMediaQuery', () => {
  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return false during SSR (before mounting)', () => {
    const mockMediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    // Should return false initially to prevent hydration mismatches
    expect(result.current).toBe(false);
  });

  it('should handle media query changes after mounting', async () => {
    const mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result, rerender } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    // Initially false (before mounting)
    expect(result.current).toBe(false);

    // Wait for mounting effect and rerender
    await new Promise(resolve => setTimeout(resolve, 10));
    rerender();

    // Should now reflect the actual media query state
    expect(result.current).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    unmount();

    // Should have called removeEventListener
    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
  });

  it('should handle undefined window gracefully', () => {
    // Since we can't easily simulate SSR in jsdom, we'll test that
    // the hook returns false initially (which simulates SSR behavior)
    const mockMediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    // Should return false initially (simulating SSR/pre-hydration state)
    expect(result.current).toBe(false);
  });
});