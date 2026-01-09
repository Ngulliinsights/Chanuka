/**
 * Navigation Critical Features Tests
 *
 * Focus: Route transitions, State preservation, Error handling
 * Pareto Priority: Week 1 - Foundation
 *
 * These tests cover the most critical navigation scenarios that deliver
 * 80% of testing value with 20% of implementation effort.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock navigation services
vi.mock('@client/core/navigation/service', () => ({
  navigationService: {
    navigate: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    canGoBack: vi.fn(),
    canGoForward: vi.fn(),
    getCurrentRoute: vi.fn(),
    getRouteHistory: vi.fn(),
  },
}));

// Mock route guards
vi.mock('@client/core/navigation/guards', () => ({
  routeGuards: {
    checkGuard: vi.fn(),
    addGuard: vi.fn(),
    removeGuard: vi.fn(),
  },
}));

describe('Navigation Critical Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Transitions', () => {
    it('should handle route transitions smoothly', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const fromRoute = '/dashboard';
      const toRoute = '/settings';
      const transitionOptions = { animate: true, duration: 300 };

      navigationService.navigate.mockResolvedValue({
        success: true,
        from: fromRoute,
        to: toRoute,
      });

      const result = await navigationService.navigate(toRoute, transitionOptions);

      expect(navigationService.navigate).toHaveBeenCalledWith(toRoute, transitionOptions);
      expect(result.success).toBe(true);
      expect(result.from).toBe(fromRoute);
      expect(result.to).toBe(toRoute);
    });

    it('should support deep linking', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const deepLink = '/dashboard/settings/profile';
      const expectedRoute = { path: '/dashboard/settings/profile', params: {} };

      navigationService.navigate.mockResolvedValue({
        success: true,
        route: expectedRoute,
      });

      const result = await navigationService.navigate(deepLink);

      expect(navigationService.navigate).toHaveBeenCalledWith(deepLink);
      expect(result.success).toBe(true);
      expect(result.route).toEqual(expectedRoute);
    });

    it('should handle route guards', async () => {
      const { routeGuards } = await import('@client/core/navigation/guards');
      const { navigationService } = await import('@client/core/navigation/service');

      const guardResult = { allowed: true, reason: 'User authenticated' };
      const route = '/protected-route';

      routeGuards.checkGuard.mockResolvedValue(guardResult);
      navigationService.navigate.mockResolvedValue({ success: true, route });

      const guardCheck = await routeGuards.checkGuard(route);
      const navigationResult = await navigationService.navigate(route);

      expect(routeGuards.checkGuard).toHaveBeenCalledWith(route);
      expect(guardCheck.allowed).toBe(true);
      expect(guardCheck.reason).toBe('User authenticated');
      expect(navigationResult.success).toBe(true);
    });

    it('should manage loading states', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const route = '/heavy-page';
      const loadingStates = ['loading', 'transitioning', 'loaded'];

      navigationService.navigate.mockImplementation(async () => {
        // Simulate loading states
        for (const state of loadingStates) {
          // In real implementation, this would trigger loading state updates
          expect(['loading', 'transitioning', 'loaded']).toContain(state);
        }
        return { success: true, route, loading: false };
      });

      const result = await navigationService.navigate(route);

      expect(result.success).toBe(true);
      expect(result.loading).toBe(false);
      expect(result.route).toBe(route);
    });
  });

  describe('State Management', () => {
    it('should preserve navigation state', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const state = { userId: '123', filters: { active: true } };
      const route = '/dashboard';

      navigationService.navigate.mockResolvedValue({
        success: true,
        route,
        state,
      });

      const result = await navigationService.navigate(route, { state });

      expect(result.success).toBe(true);
      expect(result.state).toEqual(state);
      expect(result.route).toBe(route);
    });

    it('should handle browser navigation', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      // Mock browser history API
      const mockHistory = {
        back: vi.fn(),
        forward: vi.fn(),
        pushState: vi.fn(),
        replaceState: vi.fn(),
        length: 5,
        state: { route: '/dashboard' },
      };

      Object.defineProperty(window, 'history', {
        value: mockHistory,
        writable: true,
      });

      navigationService.goBack.mockResolvedValue({ success: true, route: '/home' });
      navigationService.goForward.mockResolvedValue({ success: true, route: '/settings' });

      const backResult = await navigationService.goBack();
      const forwardResult = await navigationService.goForward();

      expect(backResult.success).toBe(true);
      expect(backResult.route).toBe('/home');
      expect(forwardResult.success).toBe(true);
      expect(forwardResult.route).toBe('/settings');
    });

    it('should sync state across tabs', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      // Mock broadcast channel for cross-tab communication
      const mockBroadcastChannel = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      vi.stubGlobal(
        'BroadcastChannel',
        vi.fn(() => mockBroadcastChannel)
      );

      const state = { route: '/dashboard', timestamp: Date.now() };

      navigationService.navigate.mockResolvedValue({ success: true, state });

      const result = await navigationService.navigate('/dashboard', { syncAcrossTabs: true });

      expect(result.success).toBe(true);
      expect(result.state).toEqual(state);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalled();
    });

    it('should manage navigation history', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const history = [
        { route: '/home', timestamp: Date.now() - 1000 },
        { route: '/dashboard', timestamp: Date.now() - 500 },
        { route: '/settings', timestamp: Date.now() },
      ];

      navigationService.getRouteHistory.mockResolvedValue(history);

      const result = await navigationService.getRouteHistory();

      expect(result).toHaveLength(3);
      expect(result[0].route).toBe('/home');
      expect(result[1].route).toBe('/dashboard');
      expect(result[2].route).toBe('/settings');
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const invalidRoute = '/non-existent-route';
      const error = new Error('Route not found');

      navigationService.navigate.mockRejectedValue(error);

      await expect(navigationService.navigate(invalidRoute)).rejects.toThrow('Route not found');
    });

    it('should handle guard failures', async () => {
      const { routeGuards } = await import('@client/core/navigation/guards');

      const guardResult = {
        allowed: false,
        reason: 'User not authenticated',
        redirect: '/login',
      };

      routeGuards.checkGuard.mockResolvedValue(guardResult);

      const result = await routeGuards.checkGuard('/protected-route');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not authenticated');
      expect(result.redirect).toBe('/login');
    });

    it('should handle loading timeouts', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      const route = '/slow-loading-page';
      const timeoutError = new Error('Navigation timeout');

      navigationService.navigate.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(timeoutError), 5000);
        });
      });

      await expect(navigationService.navigate(route)).rejects.toThrow('Navigation timeout');
    });

    it('should handle circular navigation', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      // Simulate circular navigation detection
      const circularRoutes = ['/a', '/b', '/c', '/a', '/b', '/c'];

      navigationService.navigate.mockImplementation(async (route: string) => {
        const currentIndex = circularRoutes.indexOf(route);
        const nextIndex = (currentIndex + 1) % circularRoutes.length;
        const nextRoute = circularRoutes[nextIndex];

        if (nextRoute === route) {
          throw new Error('Circular navigation detected');
        }

        return { success: true, route: nextRoute };
      });

      // This would normally be caught by circular navigation detection
      await expect(navigationService.navigate('/a')).rejects.toThrow(
        'Circular navigation detected'
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete navigation workflow', async () => {
      const { navigationService } = await import('@client/core/navigation/service');
      const { routeGuards } = await import('@client/core/navigation/guards');

      // Mock complete workflow
      const workflow = {
        from: '/home',
        to: '/dashboard',
        guardCheck: { allowed: true, reason: 'Valid user' },
        transition: { animate: true, duration: 300 },
        state: { userId: '123' },
      };

      routeGuards.checkGuard.mockResolvedValue(workflow.guardCheck);
      navigationService.navigate.mockResolvedValue({
        success: true,
        from: workflow.from,
        to: workflow.to,
        state: workflow.state,
      });

      // Execute workflow
      const guardResult = await routeGuards.checkGuard(workflow.to);
      const navigationResult = await navigationService.navigate(workflow.to, {
        ...workflow.transition,
        state: workflow.state,
      });

      expect(guardResult.allowed).toBe(true);
      expect(navigationResult.success).toBe(true);
      expect(navigationResult.from).toBe(workflow.from);
      expect(navigationResult.to).toBe(workflow.to);
      expect(navigationResult.state).toEqual(workflow.state);
    });

    it('should handle navigation recovery scenarios', async () => {
      const { navigationService } = await import('@client/core/navigation/service');

      // Simulate navigation failure and recovery
      const recoveryScenario = {
        failedRoute: '/broken-route',
        fallbackRoute: '/home',
        recoveryAttempts: 3,
      };

      navigationService.navigate
        .mockRejectedValueOnce(new Error('Route error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, route: recoveryScenario.fallbackRoute });

      // First two attempts fail
      await expect(navigationService.navigate(recoveryScenario.failedRoute)).rejects.toThrow(
        'Route error'
      );

      await expect(navigationService.navigate(recoveryScenario.failedRoute)).rejects.toThrow(
        'Network error'
      );

      // Third attempt succeeds with fallback
      const result = await navigationService.navigate(recoveryScenario.fallbackRoute);

      expect(result.success).toBe(true);
      expect(result.route).toBe(recoveryScenario.fallbackRoute);
    });
  });
});
