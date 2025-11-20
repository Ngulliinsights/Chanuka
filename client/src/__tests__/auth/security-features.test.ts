/**
 * Security Features Verification Tests
 *
 * Tests to ensure that all security features remain intact
 * after the authentication system refactoring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@client/services/AuthService';
import { AuthRepository } from '../mocks/services';
import { authApiService } from '@client/core/api/auth';
import { securityMonitor } from '@client/utils/security-monitoring';
import { privacyCompliance } from '@client/utils/privacy-compliance';
import { tokenManager } from '@client/utils/tokenManager';
import { sessionManager } from '@client/utils/session-manager';
import { rbacManager } from '@client/utils/rbac';
import type { User } from '@client/types/auth';

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
    recordLoginAttempt: vi.fn(() => [
      {
        id: 'alert-1',
        user_id: 'user-123',
        alert_type: 'unusual_location' as const,
        severity: 'medium' as const,
        description: 'Login from unusual location',
        triggered_at: new Date().toISOString(),
        resolved: false,
        resolved_at: null,
        actions_taken: [],
      },
    ]),
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
  validatePassword: vi.fn((password, oldPassword, context) => {
    // Simulate strong password validation
    const isValid = password.length >= 12 &&
                   /[A-Z]/.test(password) &&
                   /[a-z]/.test(password) &&
                   /\d/.test(password) &&
                   /[!@#$%^&*]/.test(password);

    if (!isValid) {
      return {
        isValid: false,
        errors: ['Password must be at least 12 characters with uppercase, lowercase, number, and special character'],
        strength: 'weak' as const,
        score: 20,
      };
    }

    return {
      isValid: true,
      errors: [],
      strength: 'strong' as const,
      score: 100,
    };
  }),
}));

vi.mock('../../core/api/auth', () => ({
  authApiService: {
    login: vi.fn(() => Promise.resolve({
      sessionId: 'session-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen' as const,
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    register: vi.fn(() => Promise.resolve({
      sessionId: 'session-456',
      user: {
        id: 'user-456',
        email: 'new@example.com',
        name: 'New User',
        role: 'citizen' as const,
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    logout: vi.fn(() => Promise.resolve()),
    refreshTokens: vi.fn(() => Promise.resolve({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer' as const,
    })),
    getCurrentUser: vi.fn(() => Promise.resolve({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen' as const,
      verified: true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
      permissions: [],
    })),
    setupTwoFactor: vi.fn(() => Promise.resolve({
      secret: 'TESTSECRET123',
      qrCode: 'data:image/png;base64,test',
      backupCodes: ['123456', '789012'],
    })),
    enableTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    disableTwoFactor: vi.fn(() => Promise.resolve()),
    verifyTwoFactor: vi.fn(() => Promise.resolve({
      sessionId: 'session-789',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen' as const,
        verified: true,
        twoFactorEnabled: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'access-token-789',
        refreshToken: 'refresh-token-789',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    changePassword: vi.fn(() => Promise.resolve()),
    requestPasswordReset: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Updated User',
      role: 'citizen' as const,
      verified: true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
      permissions: [],
    })),
    handleOAuthCallback: vi.fn(() => Promise.resolve({
      sessionId: 'session-oauth',
      user: {
        id: 'user-oauth',
        email: 'oauth@example.com',
        name: 'OAuth User',
        role: 'citizen' as const,
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    extendSession: vi.fn(() => Promise.resolve()),
    getActiveSessions: vi.fn(() => Promise.resolve([])),
    revokeSession: vi.fn(() => Promise.resolve()),
    revokeAllOtherSessions: vi.fn(() => Promise.resolve()),
    getSecurityEvents: vi.fn(() => Promise.resolve([])),
    getSuspiciousActivity: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../core/api/client', () => ({
  globalApiClient: {
    post: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    get: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    put: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    delete: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
    getConfig: vi.fn(() => ({
      baseUrl: 'http://localhost:3000',
      timeout: 10000,
      retry: { attempts: 3 },
      cache: { enabled: true },
      websocket: { enabled: false },
      headers: {},
    })),
  },
  UnifiedApiClientImpl: class {
    constructor(config: any) {}
    get = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    post = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    put = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
    delete = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
  },
}));

vi.mock('../../utils/tokenManager', () => ({
  tokenManager: {
    storeTokens: vi.fn(),
    getTokens: vi.fn(() => ({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    })),
    validateToken: vi.fn(() => ({ isValid: true, payload: {} })),
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

describe('Security Features Verification', () => {
  let authService: AuthService;
  let authRepository: AuthRepository;

  // Helper to create properly typed User objects
  const createMockUser = (): User => ({
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
        privacy_updates: true,
      },
    },
    consent_given: [],
    data_retention_preference: {
      retention_period: '2years' as const,
      auto_delete_inactive: false,
      export_before_delete: true,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    authService = new AuthService();

    authRepository = new AuthRepository({
      baseEndpoint: '/api',
      cacheTTL: { user: 600000, session: 120000 },
      tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements during registration', async () => {
      // Test weak password rejection
      const weakResult = await authService.register({
        email: 'test@example.com',
        password: 'weak',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(weakResult.success).toBe(false);
      expect(weakResult.error).toContain('Password requirements not met');
    });

    it('should accept strong passwords', async () => {
      const strongResult = await authService.register({
        email: 'test@example.com',
        password: 'StrongPassword123!',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(strongResult.success).toBe(true);
    });

    it('should validate password strength during password changes', async () => {
      const mockUser = {
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

      // Test weak password change rejection
      const weakChangeResult = await authService.changePassword(mockUser, 'oldpass', 'weak');
      expect(weakChangeResult.success).toBe(false);
      expect(weakChangeResult.error).toContain('Password requirements not met');

      // Test strong password change acceptance
      const strongChangeResult = await authService.changePassword(mockUser, 'oldpass', 'NewStrongPassword123!');
      expect(strongChangeResult.success).toBe(true);
    });
  });

  describe('Account Lockout Protection', () => {
    it('should prevent login when account is locked', async () => {
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(true);

      const result = await authService.login({
        email: 'locked@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account temporarily locked');
    });

    it('should allow login when account is not locked', async () => {
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(false);

      const result = await authService.login({
        email: 'normal@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Security Monitoring Integration', () => {
    it('should record login attempts with security monitoring', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(securityMonitor.recordLoginAttempt).toHaveBeenCalledWith(
        '0.0.0.0', // currentIP (mocked)
        navigator.userAgent,
        true, // successful login
        expect.any(String) // user id
      );
    });

    it('should analyze device fingerprints during login', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(securityMonitor.analyzeDeviceFingerprint).toHaveBeenCalled();
      expect(securityMonitor.generateDeviceFingerprint).toHaveBeenCalled();
    });

    it('should create security events for authentication actions', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        expect.any(String), // user id
        'login',
        expect.any(Object) // additional details
      );
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('Two-Factor Authentication Security', () => {
    it('should require user authentication for 2FA setup', async () => {
      // Should throw error when no user is provided
      await expect(authService.setupTwoFactor()).rejects.toThrow();
    });

    it('should generate secure 2FA secrets', async () => {
      const setupResult = await authService.setupTwoFactor();

      expect(setupResult.secret).toBeDefined();
      expect(setupResult.secret).toMatch(/^[A-Z2-7]+$/); // Base32 format
      expect(setupResult.qr_code).toBeDefined();
      expect(setupResult.backup_codes).toHaveLength(2);
      expect(setupResult.backup_codes[0]).toMatch(/^\d{6}$/); // 6-digit codes
    });

    it('should validate 2FA tokens before enabling', async () => {
      const mockUser = {
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

      // Mock API to return invalid token
      vi.mocked(authApiService.enableTwoFactor).mockResolvedValueOnce({ success: false, error: 'Invalid token' });

      const result = await authService.enableTwoFactor(mockUser, 'invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid verification code');
    });

    it('should log security events for 2FA changes', async () => {
      const mockUser = {
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

      await authService.enableTwoFactor(mockUser, '123456');

      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'two_factor_enabled'
      );

      await authService.disableTwoFactor(mockUser, '123456');

      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'two_factor_disabled'
      );
    });
  });

  describe('Session Security', () => {
    it('should securely manage session tokens', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(tokenManager.storeTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(Number),
          tokenType: 'Bearer',
        }),
        expect.any(Object) // user object
      );
    });

    it('should clear tokens on logout', async () => {
      const mockUser = {
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

      await authService.logout(mockUser);

      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(sessionManager.endSession).toHaveBeenCalled();
      expect(rbacManager.clearUserCache).toHaveBeenCalledWith('user-123');
    });

    it('should handle session extension securely', async () => {
      const result = await authService.extendSession();

      expect(result.success).toBe(true);
      expect(authApiService.extendSession).toHaveBeenCalled();
    });
  });

  describe('Privacy Compliance', () => {
    it('should record consent during registration', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'StrongPassword123!',
        first_name: 'Test',
        last_name: 'User',
        consent_records: [
          {
            consent_type: 'analytics',
            granted: true,
            version: '1.0.0',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(privacyCompliance.recordConsent).toHaveBeenCalledWith(
        'pending',
        'analytics',
        true,
        '1.0.0'
      );
    });

    it('should validate privacy settings before updating', async () => {
      const mockUser = {
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

      // Test valid privacy settings
      const validResult = await authService.updatePrivacySettings(mockUser, {
        profile_visibility: 'private',
        analytics_consent: false,
      });

      expect(validResult.success).toBe(true);
      expect(privacyCompliance.validatePrivacySettings).toHaveBeenCalled();
    });

    it('should reject invalid privacy settings', async () => {
      vi.mocked(privacyCompliance.validatePrivacySettings).mockReturnValue({
        isValid: false,
        errors: ['Invalid visibility setting'],
        warnings: [],
      });

      const mockUser = {
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

      const invalidResult = await authService.updatePrivacySettings(mockUser, {
        profile_visibility: 'invalid' as any,
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Privacy settings validation failed');
    });
  });

  describe('Data Protection', () => {
    it('should support secure data export', async () => {
      const mockUser = {
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

      const exportResult = await authService.requestDataExport('json', ['profile', 'activity']);

      expect(exportResult).toHaveProperty('id');
      expect(exportResult).toHaveProperty('format', 'json');
      expect(exportResult).toHaveProperty('includes');
      expect(exportResult.includes).toContain('profile');
    });

    it('should support secure data deletion', async () => {
      const mockUser = {
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

      const deletionResult = await authService.requestDataDeletion('30days', ['profile', 'activity']);

      expect(deletionResult).toHaveProperty('id');
      expect(deletionResult).toHaveProperty('retention_period', '30days');
      expect(deletionResult).toHaveProperty('includes');
      expect(deletionResult.includes).toContain('profile');
    });
  });

  describe('Audit Trail', () => {
    it('should maintain security event logging', async () => {
      const mockUser = {
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

      // Test password change logging
      await authService.changePassword(mockUser, 'oldpass', 'NewStrongPassword123!');

      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'password_change'
      );

      // Test logout logging
      await authService.logout(mockUser);

      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'logout'
      );
    });

    it('should provide access to security events', async () => {
      const mockUser = {
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

      const securityEvents = await authService.getSecurityEvents(50);

      expect(Array.isArray(securityEvents)).toBe(true);
      expect(authApiService.getSecurityEvents).toHaveBeenCalledWith(50);
    });

    it('should provide access to suspicious activity alerts', async () => {
      const mockUser = {
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

      const alerts = await authService.getSuspiciousActivity();

      expect(Array.isArray(alerts)).toBe(true);
      expect(authApiService.getSuspiciousActivity).toHaveBeenCalled();
    });
  });
});