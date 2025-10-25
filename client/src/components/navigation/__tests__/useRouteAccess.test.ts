import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRouteAccess } from '@/hooks/useRouteAccess';
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
  }),
}));

describe('useRouteAccess', () => {
  it('should allow access to public routes', () => {
    const { result } = renderHook(() => useRouteAccess('/'));

    expect(result.current.canAccess).toBe(true);
    expect(result.current.denialReason).toBeNull();
  });

  it('should allow access to routes accessible by citizen role', () => {
    const { result } = renderHook(() => useRouteAccess('/bills'));

    expect(result.current.canAccess).toBe(true);
    expect(result.current.denialReason).toBeNull();
  });

  it('should deny access to admin routes for non-admin users', () => {
    const { result } = renderHook(() => useRouteAccess('/admin'));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.denialReason).toBe('admin_required');
  });

  it('should deny access to expert-only routes for citizen users', () => {
    const { result } = renderHook(() => useRouteAccess('/expert-verification'));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.denialReason).toBe('insufficient_role');
  });

  it('should handle unauthenticated users', () => {
    // Mock unauthenticated user
    vi.mocked(require('@/hooks/use-auth').useAuth).mockReturnValue({
      user: null,
    });

    const { result } = renderHook(() => useRouteAccess('/dashboard'));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.denialReason).toBe('unauthenticated');
  });

  it('should handle invalid navigation paths', () => {
    const { result } = renderHook(() => useRouteAccess('invalid-path'));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
    expect(result.current.recoverySuggestions).toBeDefined();
  });

  it('should handle invalid user roles', () => {
    // Mock invalid user role
    vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
      userRole: 'invalid-role',
    });

    const { result } = renderHook(() => useRouteAccess('/'));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
  });

  it('should provide recovery suggestions for validation errors', () => {
    const { result } = renderHook(() => useRouteAccess(''));

    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeInstanceOf(NavigationValidationError);
    expect(Array.isArray(result.current.recoverySuggestions)).toBe(true);
    expect(result.current.recoverySuggestions!.length).toBeGreaterThan(0);
  });
});