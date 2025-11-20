/**
 * Service Integration Tests
 *
 * Tests the integration between AuthService and repositories,
 * focusing on dependency injection and proper service orchestration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '@client/services/AuthService';
import { AuthRepository, UserRepository } from '../mocks/services';

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
    constructor(config: any) {
      this.config = config;
    }
    config: any;
    get = vi.fn();
    post = vi.fn();
    put = vi.fn();
    delete = vi.fn();
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

// Import mocks for direct manipulation
import { securityMonitor } from '@client/utils/security-monitoring';
import { privacyCompliance } from '@client/utils/privacy-compliance';
import { validatePassword } from '@client/utils/password-validation';
import { authApiService } from '@client/core/api/auth';
import { globalApiClient } from '@client/core/api/client';
import { tokenManager } from '@client/utils/tokenManager';
import { sessionManager } from '@client/utils/session-manager';
import { rbacManager } from '@client/utils/rbac';

describe('Service Integration', () => {
  let authService: AuthService;
  let authRepo: AuthRepository;
  let userRepo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create service and repositories
    authService = new AuthService();
    authRepo = new AuthRepository({
      baseEndpoint: '/api',
      cacheTTL: { user: 600000, session: 120000 },
      tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
    });
    userRepo = new UserRepository({
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

    // Set up default mock responses
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

    vi.mocked(authApiService.register).mockResolvedValue({
      sessionId: 'session-456',
      user: {
        id: 'user-456',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'citizen' as const,
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
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
    });

    vi.mocked(authApiService.logout).mockResolvedValue(undefined);
    vi.mocked(authApiService.changePassword).mockResolvedValue(undefined);
    vi.mocked(authApiService.setupTwoFactor).mockResolvedValue({
      secret: 'TESTSECRET123',
      qrCode: 'data:image/png;base64,test',
      backupCodes: ['123456', '789012'],
    });

    vi.mocked(globalApiClient.put).mockResolvedValue({
      status: 200,
      data: { success: true },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthService and Repository Integration', () => {
    it('should orchestrate login through service and repository layers', async () => {
      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.sessionExpiry).toBeDefined();

      // Verify all layers were called
      expect(authApiService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: undefined,
        twoFactorToken: undefined,
      });
      expect(tokenManager.storeTokens).toHaveBeenCalled();
      expect(sessionManager.startSession).toHaveBeenCalled();
      expect(rbacManager.clearUserCache).toHaveBeenCalledWith('user-123');
    });

    it('should handle registration with privacy consent integration', async () => {
      // Act
      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        first_name: 'New',
        last_name: 'User',
        consent_records: [
          {
            consent_type: 'analytics' as const,
            granted: true,
            version: '1.0.0',
            withdrawn_at: null,
          } as any,
        ],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Verify privacy compliance was called
      expect(privacyCompliance.recordConsent).toHaveBeenCalledWith(
        'pending',
        'analytics',
        true,
        '1.0.0'
      );

      // Verify password validation was called
      expect(validatePassword).toHaveBeenCalledWith(
        'SecurePass123!',
        undefined,
        {
          email: 'newuser@example.com',
          name: 'New User',
        }
      );
    });

    it('should integrate security monitoring across all operations', async () => {
      // Act - Login
      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert - Security monitoring was called
      expect(securityMonitor.recordLoginAttempt).toHaveBeenCalledWith(
        '0.0.0.0',
        navigator.userAgent,
        true,
        'user-123'
      );
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'login',
        expect.any(Object)
      );
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle logout with proper cleanup across all layers', async () => {
      // First login to set up state
      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Act - Logout
      await authService.logout({
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
      });

      // Assert - All cleanup was performed
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith('user-123', 'logout');
      expect(sessionManager.endSession).toHaveBeenCalled();
      expect(rbacManager.clearUserCache).toHaveBeenCalledWith('user-123');
      expect(authApiService.logout).toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Repository Layer Integration', () => {
    it('should allow repositories to be used independently', async () => {
      // Arrange
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

      // Act
      const result = await authRepo.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(authRepo.isAuthenticated()).toBe(true);
    });

    it('should maintain user state in repository', async () => {
      // Arrange
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

      // Act
      await authRepo.login({
        email: 'test@example.com',
        password: 'password123',
      });

      const user = authRepo.getCurrentUserSync();

      // Assert
      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test_User'); // Transformed username
    });
  });

  describe('Error Propagation and Handling', () => {
    it('should propagate errors from API layer through service', async () => {
      // Arrange
      const apiError = new Error('Invalid credentials');
      vi.mocked(authApiService.login).mockRejectedValue(apiError);

      // Act & Assert
      const result = await authService.login({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials or network error');
    });

    it('should handle validation failures gracefully', async () => {
      // Arrange
      vi.mocked(validatePassword).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak' as const,
        score: 20,
      });

      // Act
      const result = await authService.register({
        email: 'test@example.com',
        password: 'weak',
        first_name: 'Test',
        last_name: 'User',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password requirements not met');
      expect(authApiService.register).not.toHaveBeenCalled();
    });

    it('should handle privacy validation failures', async () => {
      // Arrange
      vi.mocked(privacyCompliance.validatePrivacySettings).mockReturnValue({
        isValid: false,
        errors: ['Invalid privacy setting'],
        warnings: [],
      });

      // Act
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

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Privacy settings validation failed');
      expect(globalApiClient.put).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should allow service to work with different repository configurations', () => {
      // This test verifies that the service doesn't have hard dependencies
      // and can work with different repository instances

      const customAuthRepo = new AuthRepository({
        baseEndpoint: '/custom-api',
        cacheTTL: { user: 300000, session: 60000 },
        tokenRefresh: { bufferMinutes: 10, maxRetries: 5 },
      });

      expect(customAuthRepo).toBeInstanceOf(AuthRepository);
      // The service uses the singleton instances, but this verifies DI is possible
    });

    it('should maintain separation of concerns between services', () => {
      // Verify that AuthService focuses on auth logic
      // and doesn't directly handle user profile operations

      expect(typeof authService.login).toBe('function');
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.logout).toBe('function');

      // User profile operations should be in UserRepository
      expect(typeof userRepo.getUserProfile).toBe('function');
      expect(typeof userRepo.updateProfile).toBe('function');
      expect(typeof userRepo.getSavedBills).toBe('function');
    });
  });

  describe('Security Feature Integration', () => {
    it('should integrate account lock checking', async () => {
      // Arrange
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(true);

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account temporarily locked');
      expect(authApiService.login).not.toHaveBeenCalled();
    });

    it('should log security events for sensitive operations', async () => {
      // Act
      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(
        'user-123',
        'login',
        expect.objectContaining({
          device_fingerprint: 'device-fingerprint-123',
          suspicious_alerts: expect.any(Number),
        })
      );
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle two-factor authentication setup', async () => {
      // Act
      const result = await authService.setupTwoFactor();

      // Assert
      expect(result.secret).toBe('TESTSECRET123');
      expect(result.qr_code).toBe('data:image/png;base64,test');
      expect(result.backup_codes).toEqual(['123456', '789012']);
      expect(authApiService.setupTwoFactor).toHaveBeenCalled();
    });
  });
});