/**
 * Auth Slice Unit Tests
 *
 * Comprehensive unit tests for authSlice covering:
 * - Actions (sync and async thunks)
 * - Reducers (state transitions)
 * - Selectors (memoized computations)
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
  login,
  register,
  logout,
  refreshTokens,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactor,
  updateUserProfile,
  loginWithOAuth,
  extendSession,
  getActiveSessions,
  terminateSession,
  terminateAllSessions,
  updatePrivacySettings,
  requestDataExport,
  requestDataDeletion,
  getSecurityEvents,
  getSuspiciousActivity,
  validateStoredTokens,
  setUser,
  updateUser,
  clearError,
  setInitialized,
  setTwoFactorRequired,
  resetAuthState,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectSessionExpiry,
  selectIsInitialized,
  selectTwoFactorRequired,
  selectAuthStatus,
  selectUserProfile
} from '../authSlice';
import { User, RegisterData } from '@client/types/auth';

// Mock the auth service
vi.mock('../../../services/AuthService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshTokens: vi.fn(),
    verifyEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    setupTwoFactor: vi.fn(),
    enableTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn(),
    updateUserProfile: vi.fn(),
    loginWithOAuth: vi.fn(),
    extendSession: vi.fn(),
    getActiveSessions: vi.fn(),
    terminateSession: vi.fn(),
    terminateAllSessions: vi.fn(),
    updatePrivacySettings: vi.fn(),
    requestDataExport: vi.fn(),
    requestDataDeletion: vi.fn(),
    getSecurityEvents: vi.fn(),
    getSuspiciousActivity: vi.fn(),
    validateStoredTokens: vi.fn()
  }
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

import { authService } from '@client/services/AuthService';
import { logger } from '@client/utils/logger';

describe('Auth Slice', () => {
  let store: any;

  const mockUser: User = {
    id: '123',
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
      profile_visibility: 'public' as const,
      email_visibility: 'private' as const,
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
      retention_period: '2years' as const,
      auto_delete_inactive: false,
      export_before_delete: true
    }
  };

  const mockAuthResponse = {
    user: mockUser,
    sessionExpiry: '2024-01-02T00:00:00Z',
    requires2FA: false
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionExpiry: null,
        isInitialized: false,
        twoFactorRequired: false
      });
    });
  });

  describe('Synchronous Actions', () => {
    it('should set user', () => {
      store.dispatch(setUser(mockUser));
      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.twoFactorRequired).toBe(false);
    });

    it('should update user', () => {
      store.dispatch(setUser(mockUser));
      store.dispatch(updateUser({ name: 'Updated Name' }));
      const state = store.getState().auth;
      expect(state.user?.name).toBe('Updated Name');
    });

    it('should clear error', () => {
      store.dispatch(clearError());
      const state = store.getState().auth;
      expect(state.error).toBe(null);
    });

    it('should set initialized', () => {
      store.dispatch(setInitialized(true));
      const state = store.getState().auth;
      expect(state.isInitialized).toBe(true);
    });

    it('should set two factor required', () => {
      store.dispatch(setTwoFactorRequired(true));
      const state = store.getState().auth;
      expect(state.twoFactorRequired).toBe(true);
    });

    it('should reset auth state', () => {
      store.dispatch(setUser(mockUser));
      store.dispatch(setTwoFactorRequired(true));
      store.dispatch(setInitialized(true));

      store.dispatch(resetAuthState());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiry).toBe(null);
      expect(state.error).toBe(null);
      expect(state.twoFactorRequired).toBe(false);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Async Thunks - Login', () => {
    it('should handle login success', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password' };
      (authService.login as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(login(mockCredentials));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.sessionExpiry).toBe(mockAuthResponse.sessionExpiry);
      expect(state.error).toBe(null);
    });

    it('should handle login failure', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'wrong' };
      const errorMessage = 'Invalid credentials';
      (authService.login as any).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(login(mockCredentials));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle login with 2FA required', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password' };
      const responseWith2FA = { ...mockAuthResponse, requires2FA: true };
      (authService.login as any).mockResolvedValue(responseWith2FA);

      await store.dispatch(login(mockCredentials));

      const state = store.getState().auth;
      expect(state.twoFactorRequired).toBe(true);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Async Thunks - Registration', () => {
    it('should handle registration success', async () => {
      const mockData: RegisterData = {
        email: 'test@example.com',
        password: 'password',
        first_name: 'Test',
        last_name: 'User'
      };
      (authService.register as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(register(mockData));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle registration failure', async () => {
      const mockData: RegisterData = {
        email: 'test@example.com',
        password: 'password',
        first_name: 'Test',
        last_name: 'User'
      };
      const errorMessage = 'Registration failed';
      (authService.register as any).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(register(mockData));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('Async Thunks - Logout', () => {
    it('should handle logout success', async () => {
      // First login
      store.dispatch(setUser(mockUser));
      (authService.logout as any).mockResolvedValue(undefined);

      await store.dispatch(logout({}));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiry).toBe(null);
      expect(state.twoFactorRequired).toBe(false);
    });

    it('should handle logout API failure gracefully', async () => {
      // First login
      store.dispatch(setUser(mockUser));
      (authService.logout as any).mockRejectedValue(new Error('API error'));

      await store.dispatch(logout({}));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Async Thunks - Token Refresh', () => {
    it('should handle token refresh success', async () => {
      (authService.refreshTokens as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(refreshTokens());

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.sessionExpiry).toBe(mockAuthResponse.sessionExpiry);
      expect(state.error).toBe(null);
    });

    it('should handle token refresh failure', async () => {
      const errorMessage = 'Token refresh failed';
      (authService.refreshTokens as any).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(refreshTokens());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiry).toBe(null);
      expect(state.twoFactorRequired).toBe(false);
    });
  });

  describe('Async Thunks - Email Verification', () => {
    it('should handle email verification success', async () => {
      const token = 'verification-token';
      const response = { user: mockUser };
      (authService.verifyEmail as any).mockResolvedValue(response);

      await store.dispatch(verifyEmail(token));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.error).toBe(null);
    });

    it('should handle email verification failure', async () => {
      const token = 'invalid-token';
      const errorMessage = 'Invalid token';
      (authService.verifyEmail as any).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(verifyEmail(token));

      const state = store.getState().auth;
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('Async Thunks - Password Operations', () => {
    it('should handle password reset request', async () => {
      const email = 'test@example.com';
      (authService.requestPasswordReset as any).mockResolvedValue(undefined);

      await store.dispatch(requestPasswordReset({ email }));

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(email, undefined);
    });

    it('should handle password reset completion', async () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'newpassword',
        confirmPassword: 'newpassword'
      };
      (authService.resetPassword as any).mockResolvedValue(undefined);

      await store.dispatch(resetPassword(resetData));

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword,
        resetData.confirmPassword
      );
    });

    it('should handle password change', async () => {
      const changeData = {
        user: mockUser,
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      };
      (authService.changePassword as any).mockResolvedValue(undefined);

      await store.dispatch(changePassword(changeData));

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser,
        'oldpassword',
        'newpassword'
      );
    });
  });

  describe('Async Thunks - Two-Factor Authentication', () => {
    it('should handle two-factor setup', async () => {
      const setupResponse = { secret: 'secret', qrCode: 'qrcode' };
      (authService.setupTwoFactor as any).mockResolvedValue(setupResponse);

      await store.dispatch(setupTwoFactor());

      expect(authService.setupTwoFactor).toHaveBeenCalled();
    });

    it('should handle two-factor enable', async () => {
      // First set the user
      store.dispatch(setUser(mockUser));
      const enableData = { user: mockUser, token: '123456' };
      const response = { success: true };
      (authService.enableTwoFactor as any).mockResolvedValue(response);

      await store.dispatch(enableTwoFactor(enableData));

      const state = store.getState().auth;
      expect(state.user?.two_factor_enabled).toBe(true);
    });

    it('should handle two-factor disable', async () => {
      // First set the user
      store.dispatch(setUser(mockUser));
      const disableData = { user: mockUser, token: '123456' };
      (authService.disableTwoFactor as any).mockResolvedValue(undefined);

      await store.dispatch(disableTwoFactor(disableData));

      const state = store.getState().auth;
      expect(state.user?.two_factor_enabled).toBe(false);
    });

    it('should handle two-factor verification', async () => {
      const token = '123456';
      (authService.verifyTwoFactor as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(verifyTwoFactor(token));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.twoFactorRequired).toBe(false);
    });
  });

  describe('Async Thunks - Profile Management', () => {
    it('should handle profile update', async () => {
      const updates = { name: 'Updated Name' };
      const response = { user: { ...mockUser, ...updates } };
      (authService.updateUserProfile as any).mockResolvedValue(response);

      await store.dispatch(updateUserProfile({ user: mockUser, updates }));

      const state = store.getState().auth;
      expect(state.user?.name).toBe('Updated Name');
    });
  });

  describe('Async Thunks - OAuth', () => {
    it('should handle OAuth login', async () => {
      const oauthData = { code: 'auth-code', state: 'state' };
      (authService.loginWithOAuth as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(loginWithOAuth(oauthData));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Async Thunks - Session Management', () => {
    it('should handle session extension', async () => {
      (authService.extendSession as any).mockResolvedValue(undefined);

      await store.dispatch(extendSession());

      expect(authService.extendSession).toHaveBeenCalled();
    });

    it('should handle get active sessions', async () => {
      const sessions = [{ id: '1', device: 'desktop' }];
      (authService.getActiveSessions as any).mockResolvedValue(sessions);

      await store.dispatch(getActiveSessions());

      expect(authService.getActiveSessions).toHaveBeenCalled();
    });

    it('should handle terminate session', async () => {
      const sessionId = 'session-1';
      (authService.terminateSession as any).mockResolvedValue(undefined);

      await store.dispatch(terminateSession(sessionId));

      expect(authService.terminateSession).toHaveBeenCalledWith(sessionId);
    });

    it('should handle terminate all sessions', async () => {
      (authService.terminateAllSessions as any).mockResolvedValue(undefined);

      await store.dispatch(terminateAllSessions());

      expect(authService.terminateAllSessions).toHaveBeenCalled();
    });
  });

  describe('Async Thunks - Privacy and Security', () => {
    it('should handle privacy settings update', async () => {
      const settings = { profile_visibility: 'private' as const };
      (authService.updatePrivacySettings as any).mockResolvedValue(undefined);

      await store.dispatch(updatePrivacySettings({ user: mockUser, settings }));

      expect(authService.updatePrivacySettings).toHaveBeenCalledWith(mockUser, settings);
    });

    it('should handle data export request', async () => {
      const exportData = { format: 'json' as const, includes: ['profile'] };
      const response = { requestId: 'req-1' };
      (authService.requestDataExport as any).mockResolvedValue(response);

      await store.dispatch(requestDataExport(exportData));

      expect(authService.requestDataExport).toHaveBeenCalledWith('json', ['profile']);
    });

    it('should handle data deletion request', async () => {
      const deletionData = { retentionPeriod: '30days', includes: ['profile'] };
      const response = { requestId: 'req-1' };
      (authService.requestDataDeletion as any).mockResolvedValue(response);

      await store.dispatch(requestDataDeletion(deletionData));

      expect(authService.requestDataDeletion).toHaveBeenCalledWith('30days', ['profile']);
    });

    it('should handle security events retrieval', async () => {
      const events = [{ type: 'login', timestamp: Date.now() }];
      (authService.getSecurityEvents as any).mockResolvedValue(events);

      await store.dispatch(getSecurityEvents(50));

      expect(authService.getSecurityEvents).toHaveBeenCalledWith(50);
    });

    it('should handle suspicious activity retrieval', async () => {
      const activities = [{ type: 'unusual_login', severity: 'medium' }];
      (authService.getSuspiciousActivity as any).mockResolvedValue(activities);

      await store.dispatch(getSuspiciousActivity());

      expect(authService.getSuspiciousActivity).toHaveBeenCalled();
    });
  });

  describe('Async Thunks - Token Validation', () => {
    it('should handle stored token validation success', async () => {
      const validationResponse = { user: mockUser, sessionExpiry: '2024-01-02T00:00:00Z' };
      (authService.validateStoredTokens as any).mockResolvedValue(validationResponse);

      await store.dispatch(validateStoredTokens());

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('should handle stored token validation failure', async () => {
      (authService.validateStoredTokens as any).mockRejectedValue(new Error('Invalid tokens'));

      await store.dispatch(validateStoredTokens());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.twoFactorRequired).toBe(false);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      store.dispatch(setUser(mockUser));
      store.dispatch(setInitialized(true));
    });

    it('should select user', () => {
      const user = selectUser(store.getState());
      expect(user).toEqual(mockUser);
    });

    it('should select is authenticated', () => {
      const isAuthenticated = selectIsAuthenticated(store.getState());
      expect(isAuthenticated).toBe(true);
    });

    it('should select is loading', () => {
      // Loading is managed by async thunks, so we test the selector directly
      const isLoading = selectIsLoading(store.getState());
      expect(isLoading).toBe(false); // Initial state
    });

    it('should select auth error', () => {
      // Error is managed by async thunks, so we test the selector directly
      const error = selectAuthError(store.getState());
      expect(error).toBe(null); // Initial state
    });

    it('should select session expiry', () => {
      // Session expiry is managed by async thunks, so we test the selector directly
      const sessionExpiry = selectSessionExpiry(store.getState());
      expect(sessionExpiry).toBe(null); // Initial state
    });

    it('should select is initialized', () => {
      const isInitialized = selectIsInitialized(store.getState());
      expect(isInitialized).toBe(true);
    });

    it('should select two factor required', () => {
      store.dispatch(setTwoFactorRequired(true));
      const twoFactorRequired = selectTwoFactorRequired(store.getState());
      expect(twoFactorRequired).toBe(true);
    });

    it('should select auth status', () => {
      store.dispatch(setTwoFactorRequired(true));
      const status = selectAuthStatus(store.getState());
      expect(status).toEqual({
        isAuthenticated: true,
        isLoading: false,
        twoFactorRequired: true,
        needsTwoFactor: true
      });
    });

    it('should select user profile', () => {
      const profile = selectUserProfile(store.getState());
      expect(profile).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        twoFactorEnabled: mockUser.two_factor_enabled
      });
    });

    it('should return null for user profile when no user', () => {
      store.dispatch(resetAuthState());
      const profile = selectUserProfile(store.getState());
      expect(profile).toBe(null);
    });
  });

  describe('Loading States', () => {
    it('should set loading to true during async operations', () => {
      (authService.login as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false after async operations complete', async () => {
      (authService.login as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects thrown by services', async () => {
      (authService.login as any).mockRejectedValue('String error');

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });

    it('should clear error on successful operations', async () => {
      // Error clearing is tested through the async thunk behavior
      (authService.login as any).mockResolvedValue(mockAuthResponse);

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.error).toBe(null);
    });
  });

  describe('State Transitions', () => {
    it('should maintain state consistency during login flow', async () => {
      (authService.login as any).mockResolvedValue(mockAuthResponse);

      const promise = store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Check loading state
      let state = store.getState().auth;
      expect(state.isLoading).toBe(true);

      await promise;

      // Check final state
      state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    it('should reset state on logout', async () => {
      // Set up authenticated state
      store.dispatch(setUser(mockUser));
      store.dispatch(setTwoFactorRequired(true));

      (authService.logout as any).mockResolvedValue(undefined);
      await store.dispatch(logout({}));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.twoFactorRequired).toBe(false);
      expect(state.error).toBe(null);
      expect(state.sessionExpiry).toBe(null);
    });
  });
});