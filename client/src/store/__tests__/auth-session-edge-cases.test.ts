/**
 * Auth and Session Edge Cases Tests
 *
 * Tests edge cases for Redux migration including:
 * - Token refresh scenarios
 * - Session expiry handling
 * - Concurrent login scenarios
 * - Network failures and race conditions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
  login,
  logout,
  refreshTokens,
  validateStoredTokens,
  selectIsAuthenticated,
  selectUser,
  selectSessionExpiry
} from '../slices/authSlice';
import sessionSlice, {
  createSession,
  validateSession,
  destroySession,
  checkConcurrentSessions,
  selectSessionIsActive,
  selectSessionData,
  selectTimeUntilExpiry
} from '../slices/sessionSlice';

// Mock services
vi.mock('../../services/AuthService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshTokens: vi.fn(),
    validateStoredTokens: vi.fn()
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock browser APIs
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

Object.defineProperty(window, 'document', {
  value: {
    cookie: '',
    querySelector: vi.fn(),
    createElement: vi.fn(),
    head: { appendChild: vi.fn() }
  },
  writable: true
});

Object.defineProperty(window, 'crypto', {
  value: { getRandomValues: vi.fn().mockReturnValue(new Uint8Array(32)) },
  writable: true
});

import { authService } from '../../services/AuthService';

describe('Auth and Session Edge Cases', () => {
  let store: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    role: 'user',
    verification_status: 'verified',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    reputation: 100,
    expertise: 'general',
    two_factor_enabled: false,
    last_login: null,
    login_count: 1,
    account_locked: false,
    locked_until: null,
    password_changed_at: '2024-01-01T00:00:00Z',
    privacy_settings: {
      profile_visibility: 'public',
      email_visibility: 'private',
      activity_tracking: true,
      analytics_consent: true,
      marketing_consent: false,
      data_sharing_consent: false,
      location_tracking: false,
      personalized_content: true,
      third_party_integrations: false,
      notification_preferences: {
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        bill_updates: true,
        comment_replies: true,
        expert_insights: false,
        security_alerts: true,
        privacy_updates: true
      }
    },
    consent_given: [],
    data_retention_preference: {
      retention_period: '2years',
      auto_delete_inactive: false,
      export_before_delete: true
    }
  };

  const mockSessionData = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'user',
    sessionId: 'session-123',
    createdAt: '2024-01-01T00:00:00Z',
    lastActivity: '2024-01-01T00:30:00Z',
    deviceFingerprint: 'device-123',
    ipAddress: '192.168.1.1'
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
        session: sessionSlice
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Token Refresh Edge Cases', () => {
    it('should handle token refresh when tokens are about to expire', async () => {
      // Mock refresh with short expiry
      const soonExpiringResponse = {
        user: mockUser,
        sessionExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      };
      (authService.refreshTokens as any).mockResolvedValue(soonExpiringResponse);

      await store.dispatch(refreshTokens());

      expect(selectSessionExpiry(store.getState())).toBe(soonExpiringResponse.sessionExpiry);
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('should handle token refresh failure due to network error', async () => {
      (authService.refreshTokens as any).mockRejectedValue(new Error('Network error'));

      await store.dispatch(refreshTokens());

      // Should clear auth state on refresh failure
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectUser(store.getState())).toBe(null);
    });

    it('should handle token refresh race condition', async () => {
      // Mock slow first refresh
      let resolveFirstRefresh: any;
      const firstRefreshPromise = new Promise(resolve => {
        resolveFirstRefresh = resolve;
      });

      (authService.refreshTokens as any)
        .mockReturnValueOnce(firstRefreshPromise)
        .mockResolvedValueOnce({
          user: mockUser,
          sessionExpiry: '2024-01-02T00:00:00Z'
        });

      // Start first refresh
      const firstRefresh = store.dispatch(refreshTokens());

      // Start second refresh before first completes
      const secondRefresh = store.dispatch(refreshTokens());

      // Complete first refresh
      resolveFirstRefresh({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z'
      });

      await Promise.all([firstRefresh, secondRefresh]);

      // Final state should be consistent
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('should handle token refresh with invalid response', async () => {
      (authService.refreshTokens as any).mockResolvedValue({
        user: null, // Invalid response
        sessionExpiry: null
      });

      await store.dispatch(refreshTokens());

      // Should clear auth state
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });
  });

  describe('Session Expiry Edge Cases', () => {
    it('should handle session expiry during active use', async () => {
      // Set up active session
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      await store.dispatch(createSession(mockSessionData));

      // Mock expired session validation
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      const expiredSessionData = { ...mockSessionData, lastActivity: expiredTime };
      (window.sessionStorage.getItem as any).mockReturnValue(JSON.stringify(expiredSessionData));

      await store.dispatch(validateSession());

      // Should destroy expired session
      expect(selectSessionIsActive(store.getState())).toBe(false);
      expect(selectSessionData(store.getState())).toBe(null);
    });

    it('should handle session expiry warning threshold', () => {
      // Set up session with warning time approaching
      const warningTime = 4 * 60 * 1000; // 4 minutes
      const lastActivity = Date.now() - (30 * 60 * 1000 - warningTime); // Close to expiry

      store.dispatch(sessionSlice.actions.updateLastActivity());
      // Manually set last activity to test expiry calculation
      store.dispatch(sessionSlice.actions.updateLastActivity());

      const timeUntilExpiry = selectTimeUntilExpiry(store.getState());
      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThan(30 * 60 * 1000); // Less than 30 minutes
    });

    it('should handle session expiry with concurrent operations', async () => {
      // Set up session
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      await store.dispatch(createSession(mockSessionData));

      // Start multiple operations that might trigger during expiry
      const operations = [
        store.dispatch(validateSession()),
        store.dispatch(checkConcurrentSessions()),
        store.dispatch(sessionSlice.actions.recordActivity({ type: 'api', details: { action: 'test' } }))
      ];

      await Promise.all(operations);

      // Session should still be valid
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);
    });

    it('should handle session expiry cleanup', async () => {
      // Set up session and auth state
      store.dispatch(authSlice.actions.setUser(mockUser));
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      await store.dispatch(createSession(mockSessionData));

      // Mock expired session
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const expiredSessionData = { ...mockSessionData, lastActivity: expiredTime };
      (window.sessionStorage.getItem as any).mockReturnValue(JSON.stringify(expiredSessionData));

      await store.dispatch(validateSession());

      // Should clean up both session and auth state
      expect(selectSessionIsActive(store.getState())).toBe(false);
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });
  });

  describe('Concurrent Login Scenarios', () => {
    it('should handle multiple concurrent login attempts', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password' };

      // Mock successful login
      (authService.login as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z',
        requires2FA: false
      });

      // Start multiple login attempts
      const loginPromises = [
        store.dispatch(login(mockCredentials)),
        store.dispatch(login(mockCredentials)),
        store.dispatch(login(mockCredentials))
      ];

      await Promise.all(loginPromises);

      // Should only have one successful login
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);
    });

    it('should handle concurrent session validation and login', async () => {
      // Mock stored tokens
      (authService.validateStoredTokens as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z'
      });

      // Mock session data
      (window.sessionStorage.getItem as any).mockReturnValue(JSON.stringify(mockSessionData));

      // Start concurrent validation and login
      const operations = [
        store.dispatch(validateStoredTokens()),
        store.dispatch(validateSession()),
        store.dispatch(login({ email: 'test@example.com', password: 'password' }))
      ];

      // Mock login to succeed
      (authService.login as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z',
        requires2FA: false
      });

      await Promise.all(operations);

      // Final state should be consistent
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);
    });

    it('should handle concurrent logout and session operations', async () => {
      // Set up authenticated state
      store.dispatch(authSlice.actions.setUser(mockUser));
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      await store.dispatch(createSession(mockSessionData));

      // Mock logout
      (authService.logout as any).mockResolvedValue(undefined);

      // Start concurrent operations
      const operations = [
        store.dispatch(logout({})),
        store.dispatch(validateSession()),
        store.dispatch(checkConcurrentSessions())
      ];

      await Promise.all(operations);

      // Should be logged out
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectSessionIsActive(store.getState())).toBe(false);
    });

    it('should handle concurrent session creation attempts', async () => {
      // Mock session creation
      (window.sessionStorage.setItem as any).mockImplementation(() => {});

      // Start multiple session creation attempts
      const sessionPromises = [
        store.dispatch(createSession(mockSessionData)),
        store.dispatch(createSession({ ...mockSessionData, sessionId: 'session-456' })),
        store.dispatch(createSession({ ...mockSessionData, sessionId: 'session-789' }))
      ];

      await Promise.all(sessionPromises);

      // Should have session data (last one wins in Redux)
      expect(selectSessionData(store.getState())).toBeDefined();
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should handle login failure due to network timeout', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password' };

      // Mock network timeout
      (authService.login as any).mockRejectedValue(new Error('Network timeout'));

      await store.dispatch(login(mockCredentials));

      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(store.getState().auth.error).toBe('Login failed');
    });

    it('should handle session validation failure due to network issues', async () => {
      // Mock sessionStorage failure
      (window.sessionStorage.getItem as any).mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      await store.dispatch(validateSession());

      // Should reset session state
      expect(selectSessionIsActive(store.getState())).toBe(false);
    });

    it('should handle token refresh failure with retry logic', async () => {
      // Mock initial failure then success
      (authService.refreshTokens as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          user: mockUser,
          sessionExpiry: '2024-01-02T00:00:00Z'
        });

      // First attempt fails
      await store.dispatch(refreshTokens());
      expect(selectIsAuthenticated(store.getState())).toBe(false);

      // Second attempt succeeds
      await store.dispatch(refreshTokens());
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('should handle offline concurrent session checking', async () => {
      // Mock offline state
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true
      });

      await store.dispatch(checkConcurrentSessions());

      // Should handle offline gracefully
      expect(store.getState().session.error).toBeUndefined();
    });
  });

  describe('Race Condition Scenarios', () => {
    it('should handle rapid login/logout cycles', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password' };

      (authService.login as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z',
        requires2FA: false
      });
      (authService.logout as any).mockResolvedValue(undefined);

      // Rapid login/logout cycles
      for (let i = 0; i < 5; i++) {
        await store.dispatch(login(mockCredentials));
        expect(selectIsAuthenticated(store.getState())).toBe(true);

        await store.dispatch(logout({}));
        expect(selectIsAuthenticated(store.getState())).toBe(false);
      }
    });

    it('should handle concurrent token validation and refresh', async () => {
      // Mock stored tokens
      (authService.validateStoredTokens as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z'
      });

      (authService.refreshTokens as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z'
      });

      // Start concurrent validation and refresh
      await Promise.all([
        store.dispatch(validateStoredTokens()),
        store.dispatch(refreshTokens())
      ]);

      // Final state should be authenticated
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('should handle session activity recording during expiry', () => {
      // Set up session
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));

      // Record activity while session is expiring
      store.dispatch(sessionSlice.actions.recordActivity({ type: 'api', details: { action: 'test' } }));

      // Activity should be recorded
      const activityLog = store.getState().session.activityLog;
      expect(activityLog).toHaveLength(1);
      expect(activityLog[0].type).toBe('api');
    });
  });

  describe('State Consistency Edge Cases', () => {
    it('should maintain state consistency during error recovery', async () => {
      // Set up initial state
      store.dispatch(authSlice.actions.setUser(mockUser));
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      await store.dispatch(createSession(mockSessionData));

      // Simulate error condition
      (authService.refreshTokens as any).mockRejectedValue(new Error('Token expired'));

      await store.dispatch(refreshTokens());

      // Should recover to logged out state
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectSessionIsActive(store.getState())).toBe(false);
    });

    it('should handle partial state updates gracefully', async () => {
      // Mock incomplete auth response
      (authService.login as any).mockResolvedValue({
        user: mockUser,
        // Missing sessionExpiry
        requires2FA: false
      });

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Should still authenticate even with incomplete response
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);
    });

    it('should handle malformed session data', async () => {
      // Mock malformed session data
      (window.sessionStorage.getItem as any).mockReturnValue('{invalid json');

      await store.dispatch(validateSession());

      // Should handle error gracefully
      expect(selectSessionIsActive(store.getState())).toBe(false);
    });
  });
});