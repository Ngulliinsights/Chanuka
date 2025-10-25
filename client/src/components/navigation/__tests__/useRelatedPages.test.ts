import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRelatedPages } from '@/hooks/useRelatedPages';
import { NavigationValidationError } from '../errors';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', role: 'citizen' },
  }),
}));

// Mock the unified navigation hook
vi.mock('@/hooks/use-unified-navigation', () => ({
  useUnifiedNavigation: () => ({
    userRole: 'citizen',
    preferences: {
      favoritePages: [],
      recentlyVisited: [],
    },
  }),
}));

describe('useRelatedPages', () => {
  it('should return related pages for bills path', () => {
    const { result } = renderHook(() => useRelatedPages('/bills'));

    expect(result.current.relatedPages).toBeDefined();
    expect(Array.isArray(result.current.relatedPages)).toBe(true);
    expect(result.current.totalCount).toBeGreaterThanOrEqual(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('should return related pages for home path', () => {
    const { result } = renderHook(() => useRelatedPages('/'));

    expect(result.current.relatedPages).toBeDefined();
    expect(Array.isArray(result.current.relatedPages)).toBe(true);
  });

  it('should limit results when maxResults is specified', () => {
    const { result } = renderHook(() => useRelatedPages('/bills', { maxResults: 2 }));

    expect(result.current.relatedPages.length).toBeLessThanOrEqual(2);
  });

  it('should include breadcrumbs when requested', () => {
    const { result } = renderHook(() =>
      useRelatedPages('/bills', { includeBreadcrumbs: true })
    );

    expect(result.current.relatedPages).toBeDefined();
    // Should include breadcrumb pages
    const breadcrumbPages = result.current.relatedPages.filter(
      page => page.type === 'parent'
    );
    expect(breadcrumbPages.length).toBeGreaterThan(0);
  });

  it('should handle empty relationships gracefully', () => {
    const { result } = renderHook(() => useRelatedPages('/non-existent-path'));

    expect(result.current.relatedPages).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('should handle invalid navigation paths', () => {
    const { result } = renderHook(() => useRelatedPages('invalid-path'));

    expect(result.current.relatedPages).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
    expect(result.current.recoverySuggestions).toBeDefined();
  });

  it('should handle invalid user roles', () => {
    // Mock invalid user role
    vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
      userRole: 'invalid-role',
      preferences: {
        favoritePages: [],
        recentlyVisited: [],
      },
    });

    const { result } = renderHook(() => useRelatedPages('/'));

    expect(result.current.relatedPages).toEqual([]);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
  });

  it('should handle invalid options', () => {
    const { result } = renderHook(() => useRelatedPages('/', { maxResults: -1 }));

    expect(result.current.relatedPages).toEqual([]);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
    expect(result.current.recoverySuggestions).toBeDefined();
  });

  it('should provide recovery suggestions for validation errors', () => {
    const { result } = renderHook(() => useRelatedPages('', { maxResults: 0 }));

    expect(result.current.relatedPages).toEqual([]);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
    expect(Array.isArray(result.current.recoverySuggestions)).toBe(true);
    expect(result.current.recoverySuggestions!.length).toBeGreaterThan(0);
  });
});