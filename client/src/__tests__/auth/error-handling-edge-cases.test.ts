/**
 * Error Handling and Edge Case Validation Tests
 *
 * Comprehensive tests for error handling, edge cases, and security validation
 * in the refactored authentication system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '@client/services/AuthService';
import { AuthRepository, UserRepository } from '../mocks/services';
import { authApiService } from '@client/core/api/auth';
import { userApiService } from '@client/core/api/user';
import { globalApiClient } from '@client/core/api/client';
import { securityMonitor } from '@client/utils/security';
import { privacyCompliance } from '@client/utils/privacy-compliance';
import { validatePassword } from '@client/utils/security';
import { tokenManager } from '@client/utils/storage';
import { rbacManager } from '@client/utils/rbac';

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

vi.mock('../../utils/secure-token-manager', () => ({
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

describe('Error Handling and Edge Cases', () => {
  let authService: AuthService;
  let authRepository: AuthRepository;
  let userRepository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    authService = new AuthService();

    authRepository = new AuthRepository({
      baseEndpoint: '/api',
      cacheTTL: { user: 600000, session: 120000 },
      tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
    });

    userRepository = new UserRepository({
      baseEndpoint: '/api',
      cacheTTL: {
        profile: 300000,
        preferences: 1800000,
        savedBills: 180000,
        engagement: 300000,
        achievements: 600000,
        dashboard: 120000,
      },
    });

    // Set up default successful mocks
    vi.mocked(authApiService.login).mockResolvedValue({
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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthService Error Handling', () => {
    describe('Login Error Scenarios', () => {
      it('should handle network errors during login', async () => {
        vi.mocked(authApiService.login).mockRejectedValue(new Error('Network Error'));

        const result = await authService.login({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid credentials or network error');
      });

      it('should handle account lockout scenarios', async () => {
        vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(true);

        const result = await authService.login({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Account temporarily locked');
      });

      it('should handle invalid credentials gracefully', async () => {
        vi.mocked(authApiService.login).mockRejectedValue(new Error('Invalid credentials'));

        const result = await authService.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should handle malformed login responses', async () => {
        vi.mocked(authApiService.login).mockResolvedValue({} as any);

        const result = await authService.login({
          email: 'test@example.com',
          password: 'password123',
        });

        // Should handle gracefully even with malformed response
        expect(result).toHaveProperty('success');
      });
    });

    describe('Registration Error Scenarios', () => {
      it('should handle weak password validation', async () => {
        vi.mocked(validatePassword).mockReturnValue({
          isValid: false,
          errors: ['Password too weak', 'Missing special character'],
          strength: 'weak' as const,
          score: 20,
        });

        const result = await authService.register({
          email: 'test@example.com',
          password: 'weak',
          first_name: 'Test',
          last_name: 'User',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Password requirements not met');
      });

      it('should handle registration API failures', async () => {
        vi.mocked(authApiService.register).mockRejectedValue(new Error('Registration failed'));

        const result = await authService.register({
          email: 'test@example.com',
          password: 'StrongPassword123!',
          first_name: 'Test',
          last_name: 'User',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Registration failed');
      });

      it('should handle duplicate email registration', async () => {
        vi.mocked(authApiService.register).mockRejectedValue(new Error('Email already exists'));

        const result = await authService.register({
          email: 'existing@example.com',
          password: 'StrongPassword123!',
          first_name: 'Test',
          last_name: 'User',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('Token Management Edge Cases', () => {
      it('should handle token refresh failures gracefully', async () => {
        vi.mocked(authApiService.refreshTokens).mockRejectedValue(new Error('Refresh failed'));

        const result = await authService.refreshTokens();

        expect(result.success).toBe(false);
        expect(result.error).toContain('Session expired');
      });

      it('should handle invalid stored tokens', async () => {
        vi.mocked(tokenManager.validateToken).mockReturnValue({
          isValid: false,
          isExpired: true,
          needsRefresh: false,
        });

        vi.mocked(authApiService.refreshTokens).mockRejectedValue(new Error('Invalid refresh token'));

        const result = await authService.validateStoredTokens();

        expect(result).toBeNull();
      });

      it('should handle concurrent token refresh attempts', async () => {
        // This would require more complex mocking to test race conditions
        // For now, ensure the method exists and is callable
        const result = await authService.refreshTokens();
        expect(result).toHaveProperty('success');
      });
    });

    describe('Two-Factor Authentication Edge Cases', () => {
      it('should handle 2FA setup failures', async () => {
        vi.mocked(authApiService.setupTwoFactor).mockRejectedValue(new Error('2FA setup failed'));

        await expect(authService.setupTwoFactor()).rejects.toThrow('2FA setup failed');
      });

      it('should handle invalid 2FA tokens', async () => {
        vi.mocked(authApiService.enableTwoFactor).mockResolvedValue({ success: false, error: 'Invalid token' });

        const result = await authService.enableTwoFactor({
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
        }, 'invalid-token');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid verification code');
      });

      it('should handle 2FA verification failures', async () => {
        vi.mocked(authApiService.verifyTwoFactor).mockRejectedValue(new Error('Invalid 2FA token'));

        const result = await authService.verifyTwoFactor('invalid-token');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid verification code');
      });
    });

    describe('Privacy and Security Edge Cases', () => {
      it('should handle invalid privacy settings', async () => {
        vi.mocked(privacyCompliance.validatePrivacySettings).mockReturnValue({
          isValid: false,
          errors: ['Invalid visibility setting'],
          warnings: [],
        });

        const result = await authService.updatePrivacySettings({
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
        }, { profile_visibility: 'invalid' as any });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Privacy settings validation failed');
      });

      it('should handle data export request failures', async () => {
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('Export failed'));

        await expect(authService.requestDataExport('json', ['profile'])).rejects.toThrow('Export failed');
      });

      it('should handle data deletion request failures', async () => {
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('Deletion failed'));

        await expect(authService.requestDataDeletion('30days', ['profile'])).rejects.toThrow('Deletion failed');
      });
    });
  });

  describe('Repository Layer Error Handling', () => {
    describe('AuthRepository Edge Cases', () => {
      it('should handle API failures in login', async () => {
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('API Error'));

        await expect(authRepository.login({
          email: 'test@example.com',
          password: 'password123',
        })).rejects.toThrow();
      });

      it('should handle logout API failures gracefully', async () => {
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('Logout failed'));

        // Should not throw, just log warning
        await expect(authRepository.logout()).resolves.toBeUndefined();
      });

      it('should handle permission check failures', async () => {
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('Permission check failed'));

        const result = await authRepository.checkPermission('read', 'bills');
        expect(result).toBe(false); // Should default to false on error
      });

      it('should handle session management failures', async () => {
        vi.mocked(globalApiClient.get).mockRejectedValue(new Error('Sessions fetch failed'));

        await expect(authRepository.getActiveSessions()).rejects.toThrow();
      });
    });

    describe('UserRepository Edge Cases', () => {
      it('should handle profile fetch failures', async () => {
        vi.mocked(userApiService.getUserProfile).mockRejectedValue(new Error('Profile fetch failed'));

        await expect(userRepository.getUserProfile()).rejects.toThrow();
      });

      it('should handle saved bills fetch failures', async () => {
        vi.mocked(userApiService.getSavedBills).mockRejectedValue(new Error('Bills fetch failed'));

        await expect(userRepository.getSavedBills()).rejects.toThrow();
      });

      it('should handle engagement history failures', async () => {
        vi.mocked(userApiService.getEngagementHistory).mockRejectedValue(new Error('Engagement fetch failed'));

        await expect(userRepository.getEngagementHistory()).rejects.toThrow();
      });

      it('should handle avatar upload failures', async () => {
        vi.mocked(userApiService.uploadAvatar).mockRejectedValue(new Error('Upload failed'));

        await expect(userRepository.uploadAvatar(new File([], 'avatar.png'))).rejects.toThrow();
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle suspicious login attempts', async () => {
      vi.mocked(securityMonitor.recordLoginAttempt).mockReturnValue([
        { id: 'alert-123', user_id: 'user-123', alert_type: 'unusual_location', severity: 'medium' as const, description: 'Login from unusual location', triggered_at: new Date().toISOString(), resolved: false, resolved_at: null, actions_taken: [] }
      ]);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should still succeed but log security events
      expect(result.success).toBe(true);
    });

    it('should handle device fingerprint analysis failures', async () => {
      vi.mocked(securityMonitor.analyzeDeviceFingerprint).mockImplementation(() => {
        throw new Error('Fingerprint analysis failed');
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should still succeed despite fingerprint analysis failure
      expect(result.success).toBe(true);
    });

    it('should handle RBAC cache clearing failures', async () => {
      vi.mocked(rbacManager.clearUserCache).mockImplementation(() => {
        throw new Error('RBAC cache clear failed');
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should still succeed despite RBAC failure
      expect(result.success).toBe(true);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty or null inputs', async () => {
      // Test with empty email
      const result1 = await authService.login({
        email: '',
        password: 'password123',
      });
      expect(result1.success).toBe(false);

      // Test with null password
      const result2 = await authService.login({
        email: 'test@example.com',
        password: '',
      });
      expect(result2.success).toBe(false);
    });

    it('should handle malformed email addresses', async () => {
      const result = await authService.login({
        email: 'not-an-email',
        password: 'password123',
      });
      // API should handle validation, but service should not crash
      expect(result).toHaveProperty('success');
    });

    it('should handle extremely long inputs', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      const result = await authService.login({
        email: longEmail,
        password: longPassword,
      });
      // Should handle gracefully regardless of API response
      expect(result).toHaveProperty('success');
    });

    it('should handle special characters in inputs', async () => {
      const result = await authService.login({
        email: 'test+tag@example.com',
        password: 'P@ssw0rd!#$%^&*()',
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle concurrent login attempts', async () => {
      // Mock slow API response
      vi.mocked(authApiService.login).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
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
        }), 100))
      );

      // Start multiple concurrent login attempts
      const promises = [
        authService.login({ email: 'test@example.com', password: 'password123' }),
        authService.login({ email: 'test@example.com', password: 'password123' }),
        authService.login({ email: 'test@example.com', password: 'password123' }),
      ];

      const results = await Promise.all(promises);

      // All should complete without race condition issues
      results.forEach(result => {
        expect(result).toHaveProperty('success');
      });
    });

    it('should handle concurrent token refresh attempts', async () => {
      vi.mocked(authApiService.refreshTokens).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer' as const,
        }), 50))
      );

      // Start multiple concurrent refresh attempts
      const promises = [
        authService.refreshTokens(),
        authService.refreshTokens(),
        authService.refreshTokens(),
      ];

      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should handle cleanup on logout failures', async () => {
      vi.mocked(authApiService.logout).mockRejectedValue(new Error('Logout API failed'));

      // Should still clean up local state even if API fails
      await expect(authService.logout()).resolves.toBeUndefined();

      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should handle repository cleanup', async () => {
      await expect(authRepository.cleanup()).resolves.toBeUndefined();
      await expect(userRepository.cleanup).toBeUndefined(); // UserRepository doesn't have cleanup method
    });
  });

  describe('Network and Connectivity Issues', () => {
    it('should handle network timeouts', async () => {
      vi.mocked(authApiService.login).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      );

      const timeoutPromise = authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should eventually fail with timeout
      await expect(timeoutPromise).rejects.toThrow();
    });

    it('should handle connection refused errors', async () => {
      vi.mocked(authApiService.login).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle DNS resolution failures', async () => {
      vi.mocked(authApiService.login).mockRejectedValue(new Error('ENOTFOUND'));

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should handle partial API responses', async () => {
      vi.mocked(authApiService.login).mockResolvedValue({
        sessionId: 'session-123',
        // Missing user data
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 3600,
          tokenType: 'Bearer' as const,
        },
        requiresTwoFactor: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should handle gracefully even with missing data
      expect(result).toHaveProperty('success');
    });

    it('should handle inconsistent token data', async () => {
      vi.mocked(authApiService.refreshTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        // Missing refreshToken
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      } as any);

      const result = await authService.refreshTokens();

      // Should handle gracefully
      expect(result).toHaveProperty('success');
    });

    it('should handle malformed user data', async () => {
      vi.mocked(authApiService.login).mockResolvedValue({
        sessionId: 'session-123',
        user: {
          // Missing required fields
          email: 'test@example.com',
          // Missing id, name, etc.
        } as any,
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 3600,
          tokenType: 'Bearer' as const,
        },
        requiresTwoFactor: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Should handle gracefully
      expect(result).toHaveProperty('success');
    });
  });
});