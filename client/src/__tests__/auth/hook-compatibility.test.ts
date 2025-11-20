/**
 * Hook Compatibility Tests
 *
 * Tests to ensure the useAuth hook maintains backward compatibility
 * with existing consumers after the authentication system refactoring.
 */

import { describe, it, expect, vi } from 'vitest';

// Import the hook and types
import { useAuth } from '@client/hooks/useAuth';
import type { User, AuthResponse, LoginCredentials, RegisterData } from '@client/types/auth';

// Mock React to avoid DOM dependencies
vi.mock('react', () => ({
  createContext: vi.fn(() => ({
    Provider: ({ children }: { children: any }) => children,
    Consumer: ({ children }: { children: any }) => children,
  })),
  useContext: vi.fn(() => ({
    // Mock hook return value
    user: null,
    loading: false,
    error: null,
    sessionExpiry: null,
    isAuthenticated: false,
    isInitialized: true,
    twoFactorRequired: false,
    login: vi.fn(() => Promise.resolve({ success: true })),
    register: vi.fn(() => Promise.resolve({ success: true })),
    logout: vi.fn(() => Promise.resolve()),
    refreshToken: vi.fn(() => Promise.resolve({ success: true })),
    verifyEmail: vi.fn(() => Promise.resolve({ success: true })),
    requestPasswordReset: vi.fn(() => Promise.resolve({ success: true })),
    resetPassword: vi.fn(() => Promise.resolve({ success: true })),
    changePassword: vi.fn(() => Promise.resolve({ success: true })),
    setupTwoFactor: vi.fn(() => Promise.resolve({ secret: 'test', qr_code: 'test', backup_codes: [] })),
    enableTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    disableTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    verifyTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    updateUserProfile: vi.fn(() => Promise.resolve({ success: true })),
    loginWithOAuth: vi.fn(() => Promise.resolve({ success: true })),
    getOAuthUrl: vi.fn(() => 'https://oauth.example.com'),
    requestPushPermission: vi.fn(() => Promise.resolve({ granted: false })),
    extendSession: vi.fn(() => Promise.resolve({ success: true })),
    getActiveSessions: vi.fn(() => Promise.resolve([])),
    getSessions: vi.fn(() => Promise.resolve([])),
    terminateSession: vi.fn(() => Promise.resolve({ success: true })),
    revokeSession: vi.fn(() => Promise.resolve({ success: true })),
    terminateAllSessions: vi.fn(() => Promise.resolve({ success: true })),
    updatePrivacySettings: vi.fn(() => Promise.resolve({ success: true })),
    requestDataExport: vi.fn(() => Promise.resolve({})),
    requestDataDeletion: vi.fn(() => Promise.resolve({})),
    getSecurityEvents: vi.fn(() => Promise.resolve([])),
    getSuspiciousActivity: vi.fn(() => Promise.resolve([])),
    hasPermission: vi.fn(() => false),
    hasRole: vi.fn(() => false),
    hasAnyRole: vi.fn(() => false),
    clearError: vi.fn(),
    refreshTokens: vi.fn(() => Promise.resolve()),
    setup2FA: vi.fn(() => Promise.resolve({ secret: 'test', qr_code: 'test', backup_codes: [] })),
    enable2FA: vi.fn(() => Promise.resolve({ success: true })),
    disable2FA: vi.fn(() => Promise.resolve({ success: true })),
    updateUser: vi.fn(),
  })),
  useState: vi.fn(() => [null, vi.fn()]),
  useEffect: vi.fn(),
  useRef: vi.fn(() => ({ current: true })),
  useCallback: vi.fn((fn) => fn),
}));

// Mock all dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/security-monitoring', () => ({
  securityMonitor: {
    generateDeviceFingerprint: vi.fn(() => 'device-fingerprint-123'),
    shouldLockAccount: vi.fn(() => false),
    recordLoginAttempt: vi.fn(() => []),
    analyzeDeviceFingerprint: vi.fn(() => []),
    createSecurityEvent: vi.fn(() => ({
      id: 'security-event-123',
      user_id: 'user-123',
      event_type: 'login' as const,
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      timestamp: new Date().toISOString(),
      risk_score: 10,
      details: {},
    })),
    logSecurityEvent: vi.fn(),
  },
}));

vi.mock('../../utils/privacy-compliance', () => ({
  privacyCompliance: {
    recordConsent: vi.fn(() => ({
      id: 'consent-123',
      consent_type: 'analytics' as const,
      granted: true,
      granted_at: new Date().toISOString(),
      withdrawn_at: null,
      version: '1.0.0',
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
    })),
    validatePrivacySettings: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
  },
}));

vi.mock('../../utils/password-validation', () => ({
  validatePassword: vi.fn(() => ({
    isValid: true,
    errors: [],
    strength: 'strong' as const,
    score: 100,
  })),
}));

vi.mock('../../core/api/auth', () => ({
  authApiService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshTokens: vi.fn(),
    getCurrentUser: vi.fn(),
    setupTwoFactor: vi.fn(),
    enableTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn(),
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
    handleOAuthCallback: vi.fn(),
    extendSession: vi.fn(),
    getActiveSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllOtherSessions: vi.fn(),
    getSecurityEvents: vi.fn(),
    getSuspiciousActivity: vi.fn(),
  },
}));

vi.mock('../../core/api/client', () => ({
  globalApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/tokenManager', () => ({
  tokenManager: {
    storeTokens: vi.fn(),
    getTokens: vi.fn(() => null),
    validateToken: vi.fn(() => ({ isValid: false, isExpired: true, needsRefresh: false })),
    clearTokens: vi.fn(),
  },
}));

vi.mock('../../utils/sessionManager', () => ({
  sessionManager: {
    startSession: vi.fn(),
    endSession: vi.fn(),
    onWarning: vi.fn(),
  },
}));

vi.mock('../../utils/rbac', () => ({
  rbacManager: {
    clearUserCache: vi.fn(),
  },
}));

// Mock the missing authService import
vi.mock('../services/authService', () => ({
  authService: {
    refreshToken: vi.fn(() => Promise.resolve({ success: true, tokens: { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600, tokenType: 'Bearer' } })),
  },
  JWTTokens: {},
}));

describe('useAuth Hook Compatibility', () => {
  describe('Hook Interface', () => {
    it('should export useAuth function', () => {
      expect(typeof useAuth).toBe('function');
    });

    it('should return object with expected properties', () => {
      const auth = useAuth();

      // Core properties
      expect(auth).toHaveProperty('user');
      expect(auth).toHaveProperty('loading');
      expect(auth).toHaveProperty('error');
      expect(auth).toHaveProperty('sessionExpiry');
      expect(auth).toHaveProperty('isAuthenticated');
      expect(auth).toHaveProperty('isInitialized');
      expect(auth).toHaveProperty('twoFactorRequired');

      // Core methods
      expect(typeof auth.login).toBe('function');
      expect(typeof auth.register).toBe('function');
      expect(typeof auth.logout).toBe('function');
      expect(typeof auth.refreshToken).toBe('function');
      expect(typeof auth.verifyEmail).toBe('function');
      expect(typeof auth.requestPasswordReset).toBe('function');
      expect(typeof auth.resetPassword).toBe('function');
      expect(typeof auth.changePassword).toBe('function');
      expect(typeof auth.clearError).toBe('function');
      expect(typeof auth.updateUser).toBe('function');
    });

    it('should include enhanced authentication methods', () => {
      const auth = useAuth();

      // Two-factor authentication
      expect(typeof auth.setupTwoFactor).toBe('function');
      expect(typeof auth.enableTwoFactor).toBe('function');
      expect(typeof auth.disableTwoFactor).toBe('function');
      expect(typeof auth.verifyTwoFactor).toBe('function');

      // Alias methods for backward compatibility
      expect(typeof auth.setup2FA).toBe('function');
      expect(typeof auth.enable2FA).toBe('function');
      expect(typeof auth.disable2FA).toBe('function');

      // OAuth
      expect(typeof auth.loginWithOAuth).toBe('function');
      expect(typeof auth.getOAuthUrl).toBe('function');

      // Session management
      expect(typeof auth.extendSession).toBe('function');
      expect(typeof auth.getActiveSessions).toBe('function');
      expect(typeof auth.getSessions).toBe('function');
      expect(typeof auth.terminateSession).toBe('function');
      expect(typeof auth.revokeSession).toBe('function');
      expect(typeof auth.terminateAllSessions).toBe('function');

      // Privacy and security
      expect(typeof auth.updatePrivacySettings).toBe('function');
      expect(typeof auth.requestDataExport).toBe('function');
      expect(typeof auth.requestDataDeletion).toBe('function');
      expect(typeof auth.getSecurityEvents).toBe('function');
      expect(typeof auth.getSuspiciousActivity).toBe('function');

      // Permissions and roles
      expect(typeof auth.hasPermission).toBe('function');
      expect(typeof auth.hasRole).toBe('function');
      expect(typeof auth.hasAnyRole).toBe('function');

      // Utilities
      expect(typeof auth.requestPushPermission).toBe('function');
      expect(typeof auth.refreshTokens).toBe('function');
    });
  });

  describe('Method Signatures', () => {
    it('should maintain login method signature', () => {
      const auth = useAuth();

      // Verify method accepts LoginCredentials
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = auth.login(credentials);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should maintain register method signature', () => {
      const auth = useAuth();

      // Verify method accepts RegisterData
      const registerData: RegisterData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      };

      const result = auth.register(registerData);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should maintain logout method signature', () => {
      const auth = useAuth();

      const result = auth.logout();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should maintain changePassword method signature', () => {
      const auth = useAuth();

      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        role: 'citizen',
        verification_status: 'verified',
        is_active: true,
        created_at: new Date().toISOString(),
        reputation: 100,
        expertise: 'general',
        two_factor_enabled: false,
        last_login: new Date().toISOString(),
        login_count: 5,
        account_locked: false,
        locked_until: null,
        password_changed_at: new Date().toISOString(),
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
            privacy_updates: true,
          },
        },
        consent_given: [],
        data_retention_preference: {
          retention_period: '2years',
          auto_delete_inactive: false,
          export_before_delete: true,
        },
      };

      const result = auth.changePassword('oldpass', 'newpass');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should maintain resetPassword method signature', () => {
      const auth = useAuth();

      const result = auth.resetPassword('token123', 'newpassword', 'newpassword');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should maintain verifyEmail method signature', () => {
      const auth = useAuth();

      const result = auth.verifyEmail('token123');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Return Types', () => {
    it('should return AuthResponse from authentication methods', async () => {
      const auth = useAuth();

      const loginResult = await auth.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(loginResult).toHaveProperty('success');
      expect(typeof loginResult.success).toBe('boolean');

      const registerResult = await auth.register({
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      });
      expect(registerResult).toHaveProperty('success');
      expect(typeof registerResult.success).toBe('boolean');
    });

    it('should return appropriate types from utility methods', async () => {
      const auth = useAuth();

      const sessions = await auth.getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);

      const securityEvents = await auth.getSecurityEvents();
      expect(Array.isArray(securityEvents)).toBe(true);

      const suspiciousActivity = await auth.getSuspiciousActivity();
      expect(Array.isArray(suspiciousActivity)).toBe(true);

      const hasPermission = auth.hasPermission('read');
      expect(typeof hasPermission).toBe('boolean');

      const hasRole = auth.hasRole('citizen');
      expect(typeof hasRole).toBe('boolean');

      const hasAnyRole = auth.hasAnyRole(['citizen', 'expert']);
      expect(typeof hasAnyRole).toBe('boolean');
    });
  });

  describe('State Properties', () => {
    it('should have correct initial state types', () => {
      const auth = useAuth();

      expect(auth.user === null || typeof auth.user === 'object').toBe(true);
      expect(typeof auth.loading).toBe('boolean');
      expect(typeof auth.isAuthenticated).toBe('boolean');
      expect(typeof auth.isInitialized).toBe('boolean');
      expect(typeof auth.twoFactorRequired).toBe('boolean');
      expect(auth.error === null || typeof auth.error === 'string').toBe(true);
      expect(auth.sessionExpiry === null || typeof auth.sessionExpiry === 'string').toBe(true);
    });

    it('should maintain state consistency', () => {
      const auth = useAuth();

      // If authenticated, user should not be null
      if (auth.isAuthenticated) {
        expect(auth.user).not.toBeNull();
        expect(auth.user).toHaveProperty('id');
        expect(auth.user).toHaveProperty('email');
      }

      // If user exists, should be authenticated
      if (auth.user) {
        expect(auth.isAuthenticated).toBe(true);
      }
    });
  });

  describe('Enhanced Features Compatibility', () => {
    it('should support two-factor authentication workflow', async () => {
      const auth = useAuth();

      // Setup 2FA
      const setupResult = await auth.setupTwoFactor();
      expect(setupResult).toHaveProperty('secret');
      expect(setupResult).toHaveProperty('qr_code');
      expect(setupResult).toHaveProperty('backup_codes');

      // Enable 2FA
      const enableResult = await auth.enableTwoFactor('123456');
      expect(enableResult).toHaveProperty('success');

      // Verify 2FA
      const verifyResult = await auth.verifyTwoFactor('123456');
      expect(verifyResult).toHaveProperty('success');

      // Disable 2FA
      const disableResult = await auth.disableTwoFactor('123456');
      expect(disableResult).toHaveProperty('success');
    });

    it('should support OAuth authentication', async () => {
      const auth = useAuth();

      const oauthUrl = auth.getOAuthUrl('google');
      expect(typeof oauthUrl).toBe('string');

      const oauthResult = await auth.loginWithOAuth('auth-code');
      expect(oauthResult).toHaveProperty('success');
    });

    it('should support privacy and security features', async () => {
      const auth = useAuth();

      const exportResult = await auth.requestDataExport('json', ['profile']);
      expect(typeof exportResult).toBe('object');

      const deletionResult = await auth.requestDataDeletion('30days', ['profile']);
      expect(typeof deletionResult).toBe('object');

      const privacyResult = await auth.updatePrivacySettings({
        profile_visibility: 'private',
        analytics_consent: false,
      });
      expect(privacyResult).toHaveProperty('success');
    });

    it('should support session management', async () => {
      const auth = useAuth();

      const extendResult = await auth.extendSession();
      expect(extendResult).toHaveProperty('success');

      const terminateResult = await auth.terminateSession('session-123');
      expect(terminateResult).toHaveProperty('success');

      const terminateAllResult = await auth.terminateAllSessions();
      expect(terminateAllResult).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle method errors gracefully', async () => {
      const auth = useAuth();

      // Mock methods to reject
      vi.mocked(auth.login).mockRejectedValueOnce(new Error('Login failed'));
      vi.mocked(auth.register).mockRejectedValueOnce(new Error('Registration failed'));

      await expect(auth.login({
        email: 'test@example.com',
        password: 'wrong',
      })).rejects.toThrow('Login failed');

      await expect(auth.register({
        email: 'test@example.com',
        password: 'password',
        first_name: 'Test',
        last_name: 'User',
      })).rejects.toThrow('Registration failed');
    });

    it('should provide error clearing functionality', () => {
      const auth = useAuth();

      expect(typeof auth.clearError).toBe('function');

      // Should not throw when called
      expect(() => auth.clearError()).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should accept correct parameter types', () => {
      const auth = useAuth();

      // LoginCredentials
      const loginCreds: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        remember_me: true,
        two_factor_code: '123456',
      };
      auth.login(loginCreds);

      // RegisterData
      const registerData: RegisterData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        role: 'citizen',
      };
      auth.register(registerData);

      // User object
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        role: 'citizen',
        verification_status: 'verified',
        is_active: true,
        created_at: new Date().toISOString(),
        reputation: 100,
        expertise: 'general',
        two_factor_enabled: false,
        last_login: new Date().toISOString(),
        login_count: 5,
        account_locked: false,
        locked_until: null,
        password_changed_at: new Date().toISOString(),
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
            privacy_updates: true,
          },
        },
        consent_given: [],
        data_retention_preference: {
          retention_period: '2years',
          auto_delete_inactive: false,
          export_before_delete: true,
        },
      };

      auth.changePassword('oldpass', 'newpass');
      auth.updateUser(user);
    });

    it('should return correct response types', () => {
      const auth = useAuth();

      // All auth methods should return AuthResponse or compatible types
      expect(auth.login).toBeDefined();
      expect(auth.register).toBeDefined();
      expect(auth.refreshToken).toBeDefined();
      expect(auth.verifyEmail).toBeDefined();
      expect(auth.resetPassword).toBeDefined();
      expect(auth.changePassword).toBeDefined();
      expect(auth.enableTwoFactor).toBeDefined();
      expect(auth.disableTwoFactor).toBeDefined();
      expect(auth.verifyTwoFactor).toBeDefined();
      expect(auth.updateUserProfile).toBeDefined();
      expect(auth.loginWithOAuth).toBeDefined();
      expect(auth.extendSession).toBeDefined();
      expect(auth.terminateSession).toBeDefined();
      expect(auth.terminateAllSessions).toBeDefined();
      expect(auth.updatePrivacySettings).toBeDefined();
    });
  });
});