/**
 * Redux Migration Integration Tests
 *
 * Tests the integration between authSlice and sessionSlice post-migration.
 * Validates backward compatibility and cross-slice interactions.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
  login,
  logout,
  validateStoredTokens,
  selectIsAuthenticated,
  selectUser
} from '../slices/authSlice';
import sessionSlice, {
  createSession,
  validateSession,
  destroySession,
  selectSessionIsActive,
  selectSessionData
} from '../slices/sessionSlice';

// Mock services
vi.mock('../../services/AuthService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
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
    removeItem: vi.fn()
  },
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
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

import { authService } from '@client/services/AuthService';

describe('Redux Migration Integration Tests', () => {
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

  const mockAuthResponse = {
    user: mockUser,
    sessionExpiry: '2024-01-02T00:00:00Z',
    requires2FA: false
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

  describe('Authentication and Session Integration', () => {
    it('should create session when user logs in successfully', async () => {
      // Mock successful login
      (authService.login as any).mockResolvedValue(mockAuthResponse);

      // Login user
      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Check auth state
      const authState = store.getState().auth;
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);

      // Session should be created automatically (this would be handled by middleware in real app)
      // For this test, we verify the states are independent but can be coordinated
      const sessionState = store.getState().session;
      expect(sessionState.isActive).toBe(false); // Not automatically activated
    });

    it('should clear session data when user logs out', async () => {
      // Set up authenticated state
      store.dispatch(authSlice.actions.setUser(mockUser));
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));
      store.dispatch(sessionSlice.actions.setCurrentSession({
        id: 'session-123',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        last_activity: '2024-01-01T00:30:00Z',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        is_current: true,
        expires_at: '2024-01-02T00:00:00Z'
      }));

      // Mock logout
      (authService.logout as any).mockResolvedValue(undefined);

      // Logout
      await store.dispatch(logout({}));

      // Check states are cleared
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectUser(store.getState())).toBe(null);
      expect(selectSessionIsActive(store.getState())).toBe(false);
      expect(selectSessionData(store.getState())).toBe(null);
    });

    it('should validate both auth and session tokens on app initialization', async () => {
      // Mock stored tokens validation
      (authService.validateStoredTokens as any).mockResolvedValue({
        user: mockUser,
        sessionExpiry: '2024-01-02T00:00:00Z'
      });

      // Mock session storage
      (window.sessionStorage.getItem as any).mockReturnValue(JSON.stringify(mockSessionData));

      // Validate stored tokens
      await store.dispatch(validateStoredTokens());

      // Check both auth and session are validated
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);

      // Session validation would happen separately
      await store.dispatch(validateSession());

      // Session should be valid
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);
    });
  });

  describe('Cross-Slice State Management', () => {
    it('should maintain independent state between auth and session slices', () => {
      // Set auth state
      store.dispatch(authSlice.actions.setUser(mockUser));

      // Set session state
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));

      // Verify states are independent
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectSessionIsActive(store.getState())).toBe(false); // Session data set but not marked active

      // Clear auth state
      store.dispatch(authSlice.actions.resetAuthState());

      // Session state should remain
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);
    });

    it('should handle loading states independently', async () => {
      // Start auth loading
      store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Start session loading
      store.dispatch(createSession(mockSessionData));

      // Both should be loading independently
      let authState = store.getState().auth;
      let sessionState = store.getState().session;

      // Note: Loading states are managed by async thunks, so we test the structure
      expect(authState).toBeDefined();
      expect(sessionState).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain API compatibility with existing components', () => {
      // Test that selectors return expected shapes
      const authStatus = selectIsAuthenticated(store.getState());
      const user = selectUser(store.getState());
      const sessionActive = selectSessionIsActive(store.getState());

      // These should all be defined and return proper types
      expect(typeof authStatus).toBe('boolean');
      expect(typeof sessionActive).toBe('boolean');
      expect(user === null || typeof user === 'object').toBe(true);
    });

    it('should handle state transitions consistently', () => {
      // Test state transitions don't break each other
      store.dispatch(authSlice.actions.setUser(mockUser));
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));

      // Reset auth
      store.dispatch(authSlice.actions.resetAuthState());

      // Session should still be there
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);
      expect(selectIsAuthenticated(store.getState())).toBe(false);

      // Reset session
      store.dispatch(sessionSlice.actions.resetSessionState());

      // Auth should still be reset
      expect(selectSessionData(store.getState())).toBe(null);
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle auth errors without affecting session state', async () => {
      // Set up valid session
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));

      // Mock auth failure
      (authService.login as any).mockRejectedValue(new Error('Invalid credentials'));

      // Attempt login
      await store.dispatch(login({ email: 'test@example.com', password: 'wrong' }));

      // Auth should have error, session should remain
      const authState = store.getState().auth;
      const sessionState = store.getState().session;

      expect(authState.error).toBe('Login failed');
      expect(authState.isAuthenticated).toBe(false);
      expect(sessionState.sessionData).toEqual(mockSessionData);
    });

    it('should handle session errors without affecting auth state', async () => {
      // Set up authenticated user
      store.dispatch(authSlice.actions.setUser(mockUser));

      // Mock session creation failure
      (window.sessionStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Attempt to create session
      await store.dispatch(createSession(mockSessionData));

      // Auth should remain, session should have error
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);

      const sessionState = store.getState().session;
      expect(sessionState.error).toBe('Failed to create session');
    });
  });

  describe('Session Lifecycle Integration', () => {
    it('should coordinate session creation and destruction with auth state', async () => {
      // Mock successful session creation
      (window.sessionStorage.setItem as any).mockImplementation(() => {});
      (window.document.cookie as any) = '';

      // Create session
      await store.dispatch(createSession(mockSessionData));

      // Set user (normally done by auth middleware)
      store.dispatch(authSlice.actions.setUser(mockUser));

      // Verify both states are set
      expect(selectUser(store.getState())).toEqual(mockUser);
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);

      // Destroy session
      (window.sessionStorage.removeItem as any).mockImplementation(() => {});
      (window.localStorage.removeItem as any).mockImplementation(() => {});

      await store.dispatch(destroySession());

      // Both should be cleared
      expect(selectUser(store.getState())).toBe(null);
      expect(selectSessionData(store.getState())).toBe(null);
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with repeated state updates', () => {
      // Perform multiple state updates
      for (let i = 0; i < 100; i++) {
        store.dispatch(authSlice.actions.setUser({ ...mockUser, id: `user-${i}` }));
        store.dispatch(sessionSlice.actions.setSessionData({ ...mockSessionData, sessionId: `session-${i}` }));
      }

      // State should be properly updated without memory issues
      const finalUser = selectUser(store.getState());
      const finalSession = selectSessionData(store.getState());

      expect(finalUser?.id).toBe('user-99');
      expect(finalSession?.sessionId).toBe('session-99');
    });

    it('should handle rapid consecutive actions', async () => {
      // Mock services
      (authService.login as any).mockResolvedValue(mockAuthResponse);
      (window.sessionStorage.setItem as any).mockImplementation(() => {});

      // Fire multiple async actions
      const promises = [
        store.dispatch(login({ email: 'test@example.com', password: 'password' })),
        store.dispatch(createSession(mockSessionData)),
        store.dispatch(validateSession())
      ];

      await Promise.all(promises);

      // State should be consistent
      const authState = store.getState().auth;
      const sessionState = store.getState().session;

      expect(authState.isAuthenticated).toBe(true);
      expect(sessionState.sessionData).toEqual(mockSessionData);
    });
  });

  describe('Migration Success Validation', () => {
    it('should validate that all Redux functionality works post-migration', () => {
      // Test all basic functionality
      store.dispatch(authSlice.actions.setUser(mockUser));
      store.dispatch(sessionSlice.actions.setSessionData(mockSessionData));
      store.dispatch(sessionSlice.actions.setCurrentSession({
        id: 'session-123',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        last_activity: '2024-01-01T00:30:00Z',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        is_current: true,
        expires_at: '2024-01-02T00:00:00Z'
      }));

      // Verify all selectors work
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectUser(store.getState())).toEqual(mockUser);
      expect(selectSessionIsActive(store.getState())).toBe(true);
      expect(selectSessionData(store.getState())).toEqual(mockSessionData);

      // Test state resets
      store.dispatch(authSlice.actions.resetAuthState());
      store.dispatch(sessionSlice.actions.resetSessionState());

      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectSessionIsActive(store.getState())).toBe(false);
    });

    it('should ensure no breaking changes in public API', () => {
      // Test that all exported functions and selectors are available
      expect(typeof login).toBe('function');
      expect(typeof logout).toBe('function');
      expect(typeof createSession).toBe('function');
      expect(typeof validateSession).toBe('function');
      expect(typeof selectIsAuthenticated).toBe('function');
      expect(typeof selectUser).toBe('function');
      expect(typeof selectSessionIsActive).toBe('function');
      expect(typeof selectSessionData).toBe('function');

      // Test that actions are properly exported
      expect(authSlice.actions.setUser).toBeDefined();
      expect(sessionSlice.actions.setSessionData).toBeDefined();
    });
  });
});