/**
 * AuthService Unit Tests
 *
 * Comprehensive unit tests for the AuthService class, focusing on business logic,
 * validation, security monitoring, and proper integration with dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '@client/services/AuthService';
import { LoginCredentials, RegisterData, User } from '@client/types/auth';

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
    validateToken: vi.fn(() => ({ isValid: false })),
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
import { logger } from '@client/utils/logger';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockAuthSession = {
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
        preferences: {
          notifications: true,
          emailAlerts: true,
          theme: 'light' as const,
          language: 'en',
        },
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
    } as any;

    it('should successfully login with valid credentials', async () => {
      // Arrange
      vi.mocked(authApiService.login).mockResolvedValue(mockAuthSession);
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(false);

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.sessionExpiry).toBeDefined();
      expect(authApiService.login).toHaveBeenCalledWith({
        email: validCredentials.email,
        password: validCredentials.password,
        rememberMe: undefined,
        twoFactorToken: undefined,
      });
      expect(securityMonitor.recordLoginAttempt).toHaveBeenCalledWith(
        '0.0.0.0',
        navigator.userAgent,
        true,
        'user-123'
      );
      expect(tokenManager.storeTokens).toHaveBeenCalled();
      expect(sessionManager.startSession).toHaveBeenCalled();
      expect(rbacManager.clearUserCache).toHaveBeenCalledWith('user-123');
    });

    it('should handle account lock due to failed attempts', async () => {
      // Arrange
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(true);

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account temporarily locked');
      expect(authApiService.login).not.toHaveBeenCalled();
    });

    it('should handle login failure and record failed attempt', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      vi.mocked(authApiService.login).mockRejectedValue(error);
      vi.mocked(securityMonitor.shouldLockAccount).mockReturnValue(false);

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials or network error');
      expect(securityMonitor.recordLoginAttempt).toHaveBeenCalledWith(
        '0.0.0.0',
        navigator.userAgent,
        false
      );
      expect(logger.error).toHaveBeenCalledWith('Login failed:', { component: 'AuthService' }, error);
    });

    it('should handle two-factor authentication requirement', async () => {
      // Arrange
      const twoFactorSession = { ...mockAuthSession, requiresTwoFactor: true };
      vi.mocked(authApiService.login).mockResolvedValue(twoFactorSession);

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result.success).toBe(true);
      expect(result.requires2FA).toBe(true);
    });

    it('should pass remember me flag to API', async () => {
      // Arrange
      const credentialsWithRemember: LoginCredentials = {
        ...validCredentials,
        remember_me: true,
      };
      vi.mocked(authApiService.login).mockResolvedValue(mockAuthSession);

      // Act
      await authService.login(credentialsWithRemember);

      // Assert
      expect(authApiService.login).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true })
      );
    });

    it('should pass two-factor token to API', async () => {
      // Arrange
      const credentialsWith2FA: LoginCredentials = {
        ...validCredentials,
        twoFactorToken: '123456',
      } as any;
      vi.mocked(authApiService.login).mockResolvedValue(mockAuthSession);

      // Act
      await authService.login(credentialsWith2FA);

      // Assert
      expect(authApiService.login).toHaveBeenCalledWith(
        expect.objectContaining({ twoFactorToken: '123456' })
      );
    });
  });

  describe('register', () => {
    const validRegisterData: RegisterData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      first_name: 'New',
      last_name: 'User',
    };

    const mockRegisterSession = {
      sessionId: 'session-456',
      user: {
        id: 'user-456',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'citizen' as const,
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        preferences: {
          notifications: true,
          emailAlerts: true,
          theme: 'light' as const,
          language: 'en',
        },
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
    } as any;

    it('should successfully register a new user', async () => {
      // Arrange
      vi.mocked(authApiService.register).mockResolvedValue(mockRegisterSession);

      // Act
      const result = await authService.register(validRegisterData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.sessionExpiry).toBeDefined();
      expect(validatePassword).toHaveBeenCalledWith(
        validRegisterData.password,
        undefined,
        {
          email: validRegisterData.email,
          name: `${validRegisterData.first_name} ${validRegisterData.last_name}`,
        }
      );
      expect(authApiService.register).toHaveBeenCalledWith({
        email: validRegisterData.email,
        password: validRegisterData.password,
        name: 'New User',
        confirmPassword: undefined,
        acceptTerms: undefined,
      });
      expect(sessionManager.startSession).toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      // Arrange
      vi.mocked(validatePassword).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak' as const,
        score: 20,
      });

      // Act
      const result = await authService.register(validRegisterData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password requirements not met');
      expect(authApiService.register).not.toHaveBeenCalled();
    });

    it('should handle privacy consent recording', async () => {
      // Arrange
      const registerDataWithConsent: RegisterData = {
        ...validRegisterData,
        consent_records: [
          {
            consent_type: 'analytics' as const,
            granted: true,
            version: '1.0.0',
            withdrawn_at: null,
          } as any,
        ],
      };
      vi.mocked(authApiService.register).mockResolvedValue(mockRegisterSession);

      // Act
      await authService.register(registerDataWithConsent);

      // Assert
      expect(privacyCompliance.recordConsent).toHaveBeenCalledWith(
        'pending',
        'analytics',
        true,
        '1.0.0'
      );
    });

    it('should handle registration failure', async () => {
      // Arrange
      const error = new Error('Registration failed');
      vi.mocked(authApiService.register).mockRejectedValue(error);

      // Act
      const result = await authService.register(validRegisterData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');
      expect(logger.error).toHaveBeenCalledWith('Registration failed:', { component: 'AuthService' }, error);
    });

    it('should log security event for registration', async () => {
      // Arrange
      vi.mocked(authApiService.register).mockResolvedValue(mockRegisterSession);

      // Act
      await authService.register(validRegisterData);

      // Assert
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith('user-456', 'login', {
        registration: true,
        device_fingerprint: 'device-fingerprint-123',
      });
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
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

    it('should successfully logout authenticated user', async () => {
      // Arrange
      vi.mocked(authApiService.logout).mockResolvedValue(undefined);

      // Act
      await authService.logout(mockUser);

      // Assert
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(mockUser.id, 'logout');
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
      expect(sessionManager.endSession).toHaveBeenCalled();
      expect(rbacManager.clearUserCache).toHaveBeenCalledWith(mockUser.id);
      expect(authApiService.logout).toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should handle logout API failure gracefully', async () => {
      // Arrange
      vi.mocked(authApiService.logout).mockRejectedValue(new Error('API Error'));

      // Act
      await authService.logout(mockUser);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Logout request failed:',
        { component: 'AuthService' },
        expect.any(Error)
      );
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should handle logout without user', async () => {
      // Act
      await authService.logout();

      // Assert
      expect(securityMonitor.createSecurityEvent).not.toHaveBeenCalled();
      expect(sessionManager.endSession).not.toHaveBeenCalled();
      expect(authApiService.logout).not.toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      } as any;
      const mockUser = {
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
      } as any;

      vi.mocked(authApiService.refreshTokens).mockResolvedValue(mockTokens);
      vi.mocked(authApiService.getCurrentUser).mockResolvedValue(mockUser as any);

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.sessionExpiry).toBeDefined();
      expect(tokenManager.storeTokens).toHaveBeenCalledWith(mockTokens, mockUser);
    });

    it('should handle token refresh failure', async () => {
      // Arrange
      vi.mocked(authApiService.refreshTokens).mockRejectedValue(new Error('Refresh failed'));

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session expired');
      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('validateStoredTokens', () => {
    it('should return null when no tokens exist', async () => {
      // Arrange
      vi.mocked(tokenManager.getTokens).mockReturnValue(null);

      // Act
      const result = await authService.validateStoredTokens();

      // Assert
      expect(result).toBeNull();
    });

    it('should refresh invalid tokens', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        expiresAt: Date.now() - 1000, // Expired
        tokenType: 'Bearer',
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      vi.mocked(tokenManager.getTokens).mockReturnValue(mockTokens);
      vi.mocked(tokenManager.validateToken).mockReturnValue({ isValid: false, isExpired: true, needsRefresh: false } as any);
      vi.mocked(authApiService.refreshTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      vi.mocked(authApiService.getCurrentUser).mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateStoredTokens();

      // Assert
      expect(result).toBeDefined();
      expect(result?.user).toBeDefined();
      expect(result?.sessionExpiry).toBeDefined();
      expect(sessionManager.startSession).toHaveBeenCalled();
    });

    it('should return user data for valid tokens', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() + 3600000, // Valid
        tokenType: 'Bearer',
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      vi.mocked(tokenManager.getTokens).mockReturnValue(mockTokens);
      vi.mocked(tokenManager.validateToken).mockReturnValue({ isValid: true });
      vi.mocked(authApiService.getCurrentUser).mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateStoredTokens();

      // Assert
      expect(result).toBeDefined();
      expect(result?.user).toBeDefined();
      expect(result?.sessionExpiry).toBeUndefined(); // No refresh needed
      expect(sessionManager.startSession).toHaveBeenCalled();
    });

    it('should handle token refresh failure', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'expired-access-token',
        refreshToken: 'expired-refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer',
      };

      vi.mocked(tokenManager.getTokens).mockReturnValue(mockTokens);
      vi.mocked(tokenManager.validateToken).mockReturnValue({ isValid: false });
      vi.mocked(authApiService.refreshTokens).mockRejectedValue(new Error('Refresh failed'));

      // Act
      const result = await authService.validateStoredTokens();

      // Assert
      expect(result).toBeNull();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
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

    it('should successfully change password', async () => {
      // Arrange
      vi.mocked(authApiService.changePassword).mockResolvedValue({ success: true });

      // Act
      const result = await authService.changePassword(
        mockUser,
        'oldpassword',
        'NewSecurePass123!'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(validatePassword).toHaveBeenCalledWith('NewSecurePass123!', undefined, {
        email: mockUser.email,
        name: mockUser.name,
        username: mockUser.username,
      });
      expect(authApiService.changePassword).toHaveBeenCalledWith('oldpassword', 'NewSecurePass123!');
      expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(mockUser.id, 'password_change');
      expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
    });

    it('should reject weak new password', async () => {
      // Arrange
      vi.mocked(validatePassword).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        strength: 'weak' as const,
        score: 20,
      });

      // Act
      const result = await authService.changePassword(
        mockUser,
        'oldpassword',
        'weak'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password requirements not met');
      expect(authApiService.changePassword).not.toHaveBeenCalled();
    });

    it('should handle password change failure', async () => {
      // Arrange
      vi.mocked(authApiService.changePassword).mockRejectedValue(new Error('Change failed'));

      // Act
      const result = await authService.changePassword(
        mockUser,
        'oldpassword',
        'NewSecurePass123!'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password change failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Two-Factor Authentication', () => {
    describe('setupTwoFactor', () => {
      it('should successfully setup two-factor authentication', async () => {
        // Arrange
        const mockSetup = {
          secret: 'TESTSECRET123',
          qrCode: 'data:image/png;base64,test',
          backupCodes: ['123456', '789012'],
        };
        vi.mocked(authApiService.setupTwoFactor).mockResolvedValue(mockSetup);

        // Act
        const result = await authService.setupTwoFactor();

        // Assert
        expect(result.secret).toBe('TESTSECRET123');
        expect(result.qr_code).toBe('data:image/png;base64,test');
        expect(result.backup_codes).toEqual(['123456', '789012']);
      });

      it('should handle setup failure', async () => {
        // Arrange
        vi.mocked(authApiService.setupTwoFactor).mockRejectedValue(new Error('Setup failed'));

        // Act & Assert
        await expect(authService.setupTwoFactor()).rejects.toThrow('Setup failed');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('enableTwoFactor', () => {
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

      it('should successfully enable two-factor authentication', async () => {
        // Arrange
        vi.mocked(authApiService.enableTwoFactor).mockResolvedValue({ success: true });

        // Act
        const result = await authService.enableTwoFactor(mockUser, '123456');

        // Assert
        expect(result.success).toBe(true);
        expect(securityMonitor.createSecurityEvent).toHaveBeenCalledWith(mockUser.id, 'two_factor_enabled');
        expect(securityMonitor.logSecurityEvent).toHaveBeenCalled();
      });

      it('should handle enable failure', async () => {
        // Arrange
        vi.mocked(authApiService.enableTwoFactor).mockResolvedValue({
          success: false,
          error: 'Invalid code'
        });

        // Act
        const result = await authService.enableTwoFactor(mockUser, 'wrong-code');

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid code');
      });
    });

    describe('verifyTwoFactor', () => {
      it('should successfully verify two-factor code', async () => {
        // Arrange
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'citizen',
            verified: true,
            twoFactorEnabled: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-123',
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        };
        vi.mocked(authApiService.verifyTwoFactor).mockResolvedValue(mockSession);

        // Act
        const result = await authService.verifyTwoFactor('123456');

        // Assert
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.sessionExpiry).toBeDefined();
        expect(sessionManager.startSession).toHaveBeenCalled();
      });

      it('should handle verification failure', async () => {
        // Arrange
        vi.mocked(authApiService.verifyTwoFactor).mockRejectedValue(new Error('Invalid code'));

        // Act
        const result = await authService.verifyTwoFactor('wrong-code');

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid verification code');
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Privacy and Security Features', () => {
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

    describe('updatePrivacySettings', () => {
      it('should successfully update privacy settings', async () => {
        // Arrange
        const newSettings = {
          profile_visibility: 'private' as const,
          analytics_consent: false,
        };
        vi.mocked(globalApiClient.put).mockResolvedValue({
          status: 200,
          data: { success: true }
        });

        // Act
        const result = await authService.updatePrivacySettings(mockUser, newSettings);

        // Assert
        expect(result.success).toBe(true);
        expect(privacyCompliance.validatePrivacySettings).toHaveBeenCalled();
        expect(globalApiClient.put).toHaveBeenCalledWith('/api/auth/privacy-settings', newSettings);
      });

      it('should reject invalid privacy settings', async () => {
        // Arrange
        vi.mocked(privacyCompliance.validatePrivacySettings).mockReturnValue({
          isValid: false,
          errors: ['Invalid setting'],
          warnings: [],
        });

        // Act
        const result = await authService.updatePrivacySettings(mockUser, {});

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Privacy settings validation failed');
        expect(globalApiClient.put).not.toHaveBeenCalled();
      });
    });

    describe('requestDataExport', () => {
      it('should successfully request data export', async () => {
        // Arrange
        const mockResponse = {
          id: 'export-123',
          user_id: 'user-123',
          requested_at: new Date().toISOString(),
          status: 'pending' as const,
          completed_at: null,
          download_url: null,
          expires_at: null,
          format: 'json' as const,
          includes: ['profile', 'bills'],
        };
        vi.mocked(globalApiClient.post).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        // Act
        const result = await authService.requestDataExport('json', ['profile', 'bills']);

        // Assert
        expect(result).toEqual(mockResponse);
        expect(globalApiClient.post).toHaveBeenCalledWith('/api/privacy/export', {
          format: 'json',
          includes: ['profile', 'bills'],
        });
      });

      it('should handle export request failure', async () => {
        // Arrange
        vi.mocked(globalApiClient.post).mockRejectedValue(new Error('Export failed'));

        // Act & Assert
        await expect(authService.requestDataExport('json', ['profile'])).rejects.toThrow('Export failed');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('getSecurityEvents', () => {
      it('should retrieve security events', async () => {
        // Arrange
        const mockEvents = [
          {
            id: 'event-1',
            user_id: 'user-123',
            event_type: 'login' as const,
            timestamp: new Date().toISOString(),
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            risk_score: 10,
            details: {},
          },
        ];
        vi.mocked(authApiService.getSecurityEvents).mockResolvedValue(mockEvents as any);

        // Act
        const result = await authService.getSecurityEvents(50);

        // Assert
        expect(result).toEqual(mockEvents);
        expect(authApiService.getSecurityEvents).toHaveBeenCalledWith(50);
      });

      it('should handle security events retrieval failure', async () => {
        // Arrange
        vi.mocked(authApiService.getSecurityEvents).mockRejectedValue(new Error('Failed to get events'));

        // Act & Assert
        await expect(authService.getSecurityEvents()).rejects.toThrow('Failed to get events');
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });
});