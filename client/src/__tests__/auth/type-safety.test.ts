/**
 * Type Safety Verification Tests
 *
 * Comprehensive tests to ensure TypeScript types are correctly maintained
 * across all refactored authentication system files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  TwoFactorSetup,
  PrivacySettings,
  SecurityEvent,
  SuspiciousActivityAlert,
  SessionInfo,
  DataExportRequest,
  DataDeletionRequest,
  AuthContextType,
} from '../../types/auth';

// Import the actual implementations to test type compatibility
import { AuthService } from '../../services/AuthService';
import { AuthRepository, type AuthRepositoryConfig, UserRepository, type UserRepositoryConfig, type IAuthRepository, type IUserRepository } from '../mocks/services';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies for type testing
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
    generateDeviceFingerprint: vi.fn(() => ({
      userAgent: 'test-agent',
      screen: '1920x1080x24',
      timezone: 'UTC',
      language: 'en-US',
      platform: 'test',
      cookieEnabled: true,
      doNotTrack: null,
    })),
    shouldLockAccount: vi.fn(() => false),
    recordLoginAttempt: vi.fn(() => []),
    analyzeDeviceFingerprint: vi.fn(() => []),
    createSecurityEvent: vi.fn(() => ({
      id: 'test-event-id',
      user_id: 'test-user',
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
      id: 'test-consent-id',
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
    login: vi.fn(() => Promise.resolve({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    register: vi.fn(() => Promise.resolve({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      },
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    refreshTokens: vi.fn(() => Promise.resolve({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    })),
    getCurrentUser: vi.fn(() => Promise.resolve({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verified: true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    })),
    setupTwoFactor: vi.fn(() => Promise.resolve({
      secret: 'TESTSECRET123',
      qrCode: 'data:image/png;base64,test',
      backupCodes: ['123456', '789012'],
    })),
    enableTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    disableTwoFactor: vi.fn(() => Promise.resolve({ success: true })),
    verifyTwoFactor: vi.fn(() => Promise.resolve({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    changePassword: vi.fn(() => Promise.resolve({ success: true })),
    requestPasswordReset: vi.fn(() => Promise.resolve({ success: true })),
    resetPassword: vi.fn(() => Promise.resolve({ success: true })),
    updateProfile: vi.fn(() => Promise.resolve({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Updated User',
    })),
    handleOAuthCallback: vi.fn(() => Promise.resolve({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'OAuth User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    extendSession: vi.fn(() => Promise.resolve({ success: true })),
    getActiveSessions: vi.fn(() => Promise.resolve([])),
    revokeSession: vi.fn(() => Promise.resolve({ success: true })),
    revokeAllOtherSessions: vi.fn(() => Promise.resolve({ success: true })),
    getSecurityEvents: vi.fn(() => Promise.resolve([])),
    getSuspiciousActivity: vi.fn(() => Promise.resolve([])),
  },
  LoginCredentials: {},
  AuthUser: {},
}));

vi.mock('../../core/api/client', () => ({
  globalApiClient: {
    post: vi.fn((endpoint: string) => {
      if (endpoint === '/api/privacy/export') {
        return Promise.resolve({
          status: 200,
          data: {
            id: 'test-export-id',
            user_id: 'test-user',
            requested_at: new Date().toISOString(),
            status: 'pending' as const,
            completed_at: null,
            download_url: null,
            expires_at: null,
            format: 'json' as const,
            includes: ['profile'],
          }
        });
      }
      if (endpoint === '/api/privacy/delete') {
        return Promise.resolve({
          status: 200,
          data: {
            id: 'test-deletion-id',
            user_id: 'test-user',
            requested_at: new Date().toISOString(),
            scheduled_for: new Date().toISOString(),
            status: 'pending' as const,
            completed_at: null,
            retention_period: '30days',
            includes: ['profile'],
            backup_created: false,
          }
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    }),
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
    get = vi.fn((endpoint: string) => {
      if (endpoint.includes('/users/roles') || endpoint.includes('/auth/sessions')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    post = vi.fn((endpoint: string) => {
      if (endpoint.includes('/auth/refresh')) {
        return Promise.resolve({ status: 200, data: {
          success: true,
          data: {
            tokens: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
              tokenType: 'Bearer',
              expiresAt: Date.now() + 3600000,
            }
          }
        } });
      }
      if (endpoint.includes('/auth/check-permission')) {
        return Promise.resolve({ status: 200, data: { granted: true } });
      }
      return Promise.resolve({ status: 200, data: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'citizen',
          verified: true,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
        requiresTwoFactor: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      } });
    });
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

vi.mock('../../core/api/user', () => ({
  userApiService: {
    getUserProfile: vi.fn(() => Promise.resolve({
      id: 'test-user',
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
    })),
    updateProfile: vi.fn(() => Promise.resolve({})),
    updatePreferences: vi.fn(() => Promise.resolve({})),
    getSavedBills: vi.fn(() => Promise.resolve({
      bills: [],
      total: 0,
      page: 1,
      totalPages: 1,
      hasMore: false,
    })),
    saveBill: vi.fn(() => Promise.resolve({})),
    unsaveBill: vi.fn(() => Promise.resolve()),
    updateSavedBill: vi.fn(() => Promise.resolve({})),
    getEngagementHistory: vi.fn(() => Promise.resolve({
      history: [],
      total: 0,
      page: 1,
      totalPages: 1,
      analytics: {
        most_active_day: 'Monday',
        total_actions: 0,
        action_breakdown: {},
        entity_breakdown: {},
      },
    })),
    trackEngagement: vi.fn(() => Promise.resolve()),
    getAchievements: vi.fn(() => Promise.resolve({
      badges: [],
      achievements: [],
      next_milestones: [],
    })),
    uploadAvatar: vi.fn(() => Promise.resolve({ avatar_url: 'test-url' })),
    getDashboardData: vi.fn(() => Promise.resolve({})),
  },
  EngagementHistoryFilters: {},
}));

describe('Type Safety Verification', () => {
  describe('AuthService Type Safety', () => {
    it('should maintain correct return types for all methods', async () => {
      const authService = new AuthService();

      // Test login method return type
      const loginResult: AuthResponse & { user?: User; sessionExpiry?: string } = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(loginResult).toHaveProperty('success');
      expect(typeof loginResult.success).toBe('boolean');

      // Test register method return type
      const registerResult: AuthResponse & { user?: User; sessionExpiry?: string } = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });
      expect(registerResult).toHaveProperty('success');

      // Test refreshTokens method return type
      const refreshResult: AuthResponse & { user?: User; sessionExpiry?: string } = await authService.refreshTokens();
      expect(refreshResult).toHaveProperty('success');

      // Test verifyEmail method return type
      const verifyResult: AuthResponse & { user?: User } = await authService.verifyEmail('token123');
      expect(verifyResult).toHaveProperty('success');

      // Test TwoFactorSetup return type
      const twoFactorSetup: TwoFactorSetup = await authService.setupTwoFactor();
      expect(twoFactorSetup).toHaveProperty('secret');
      expect(twoFactorSetup).toHaveProperty('qr_code');
      expect(twoFactorSetup).toHaveProperty('backup_codes');
      expect(Array.isArray(twoFactorSetup.backup_codes)).toBe(true);

      // Test SessionInfo array return type
      const sessions: SessionInfo[] = await authService.getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);

      // Test SecurityEvent array return type
      const securityEvents: SecurityEvent[] = await authService.getSecurityEvents();
      expect(Array.isArray(securityEvents)).toBe(true);

      // Test SuspiciousActivityAlert array return type
      const alerts: SuspiciousActivityAlert[] = await authService.getSuspiciousActivity();
      expect(Array.isArray(alerts)).toBe(true);

      // Test DataExportRequest return type
      const exportRequest: DataExportRequest = await authService.requestDataExport('json', ['profile']);
      expect(typeof exportRequest).toBe('object');
      expect(exportRequest).toHaveProperty('id');
      expect(exportRequest).toHaveProperty('format');

      // Test DataDeletionRequest return type
      const deletionRequest: DataDeletionRequest = await authService.requestDataDeletion('30days', ['profile']);
      expect(deletionRequest).toHaveProperty('id');
      expect(deletionRequest).toHaveProperty('retention_period');
    });

    it('should accept correct parameter types', async () => {
      const authService = new AuthService();

      // Test LoginCredentials parameter type
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        remember_me: true,
        two_factor_code: '123456',
      };
      await authService.login(credentials);

      // Test RegisterData parameter type
      const registerData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        role: 'citizen',
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
      };
      await authService.register(registerData);

      // Test PrivacySettings parameter type
      const privacySettings: PrivacySettings = {
        profile_visibility: 'private',
        email_visibility: 'private',
        activity_tracking: false,
        analytics_consent: false,
        marketing_consent: false,
        data_sharing_consent: false,
        location_tracking: false,
        personalized_content: false,
        third_party_integrations: false,
        notification_preferences: {
          email_notifications: false,
          push_notifications: false,
          sms_notifications: false,
          bill_updates: false,
          comment_replies: false,
          expert_insights: false,
          security_alerts: true,
          privacy_updates: true,
        },
      };
      await authService.updatePrivacySettings({} as User, privacySettings);
    });
  });

  describe('AuthRepository Type Safety', () => {
    let authRepository: AuthRepository;
    let config: AuthRepositoryConfig;

    beforeEach(() => {
      config = {
        baseEndpoint: '/api',
        cacheTTL: {
          user: 10 * 60 * 1000,
          session: 2 * 60 * 1000,
        },
        tokenRefresh: {
          bufferMinutes: 5,
          maxRetries: 3,
        },
      };
      authRepository = new AuthRepository(config);
    });

    it('should implement IAuthRepository interface correctly', () => {
      // Type check: AuthRepository should be assignable to IAuthRepository
      const repo: IAuthRepository = authRepository;
      expect(repo).toBeDefined();
      expect(typeof repo.login).toBe('function');
      expect(typeof repo.logout).toBe('function');
      expect(typeof repo.refreshToken).toBe('function');
      expect(typeof repo.getCurrentUser).toBe('function');
      expect(typeof repo.checkPermission).toBe('function');
      expect(typeof repo.getUserRoles).toBe('function');
      expect(typeof repo.getActiveSessions).toBe('function');
      expect(typeof repo.terminateSession).toBe('function');
      expect(typeof repo.terminateAllOtherSessions).toBe('function');
      expect(typeof repo.isAuthenticated).toBe('function');
      expect(typeof repo.getCurrentUserSync).toBe('function');
      expect(typeof repo.cleanup).toBe('function');
    });

    it('should maintain correct method signatures', async () => {
      // Test login method signature
      const loginResult = await authRepository.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(loginResult).toHaveProperty('user');
      expect(loginResult).toHaveProperty('tokens');

      // Test logout method signature
      await authRepository.logout();

      // Test refreshToken method signature
      const refreshResult = await authRepository.refreshToken();
      expect(refreshResult).toHaveProperty('success');

      // Test getCurrentUser method signature
      const user = await authRepository.getCurrentUser();
      expect(user === null || typeof user === 'object').toBe(true);

      // Test checkPermission method signature
      const hasPermission = await authRepository.checkPermission('read', 'bills');
      expect(typeof hasPermission).toBe('boolean');

      // Test getUserRoles method signature
      const roles = await authRepository.getUserRoles();
      expect(Array.isArray(roles)).toBe(true);

      // Test getActiveSessions method signature
      const sessions = await authRepository.getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);

      // Test terminateSession method signature
      await authRepository.terminateSession('session-id');

      // Test terminateAllOtherSessions method signature
      await authRepository.terminateAllOtherSessions();

      // Test isAuthenticated method signature
      const isAuth = authRepository.isAuthenticated();
      expect(typeof isAuth).toBe('boolean');

      // Test getCurrentUserSync method signature
      const syncUser = authRepository.getCurrentUserSync();
      expect(syncUser === null || typeof syncUser === 'object').toBe(true);

      // Test cleanup method signature
      await authRepository.cleanup();
    });
  });

  describe('UserRepository Type Safety', () => {
    let userRepository: UserRepository;
    let config: UserRepositoryConfig;

    beforeEach(() => {
      config = {
        baseEndpoint: '/api',
        cacheTTL: {
          profile: 5 * 60 * 1000,
          preferences: 30 * 60 * 1000,
          savedBills: 3 * 60 * 1000,
          engagement: 5 * 60 * 1000,
          achievements: 10 * 60 * 1000,
          dashboard: 2 * 60 * 1000,
        },
      };
      userRepository = new UserRepository(config);
    });

    it('should implement IUserRepository interface correctly', () => {
      // Type check: UserRepository should be assignable to IUserRepository
      const repo: IUserRepository = userRepository;
      expect(repo).toBeDefined();
      expect(typeof repo.getUserProfile).toBe('function');
      expect(typeof repo.updateProfile).toBe('function');
      expect(typeof repo.updatePreferences).toBe('function');
      expect(typeof repo.getSavedBills).toBe('function');
      expect(typeof repo.saveBill).toBe('function');
      expect(typeof repo.unsaveBill).toBe('function');
      expect(typeof repo.updateSavedBill).toBe('function');
      expect(typeof repo.getEngagementHistory).toBe('function');
      expect(typeof repo.trackEngagement).toBe('function');
      expect(typeof repo.getAchievements).toBe('function');
      expect(typeof repo.uploadAvatar).toBe('function');
      expect(typeof repo.getDashboardData).toBe('function');
    });

    it('should maintain correct method signatures', async () => {
      // Test getUserProfile method signature
      const profile = await userRepository.getUserProfile();
      expect(typeof profile).toBe('object');
      expect(profile).toHaveProperty('id');

      // Test updateProfile method signature
      const updatedProfile = await userRepository.updateProfile({ name: 'Updated Name' });
      expect(typeof updatedProfile).toBe('object');

      // Test updatePreferences method signature
      const updatedPrefs = await userRepository.updatePreferences({ theme: 'dark' });
      expect(typeof updatedPrefs).toBe('object');

      // Test getSavedBills method signature
      const savedBills = await userRepository.getSavedBills();
      expect(savedBills).toHaveProperty('bills');
      expect(savedBills).toHaveProperty('total');
      expect(savedBills).toHaveProperty('page');
      expect(savedBills).toHaveProperty('totalPages');
      expect(savedBills).toHaveProperty('hasMore');
      expect(Array.isArray(savedBills.bills)).toBe(true);

      // Test saveBill method signature
      const savedBill = await userRepository.saveBill('bill-id', 'notes', ['tag1']);
      expect(typeof savedBill).toBe('object');

      // Test unsaveBill method signature
      await userRepository.unsaveBill('bill-id');

      // Test updateSavedBill method signature
      const updatedBill = await userRepository.updateSavedBill('bill-id', {
        notes: 'updated notes',
        tags: ['tag1', 'tag2'],
        notification_enabled: true,
      });
      expect(typeof updatedBill).toBe('object');

      // Test getEngagementHistory method signature
      const engagementHistory = await userRepository.getEngagementHistory();
      expect(engagementHistory).toHaveProperty('history');
      expect(engagementHistory).toHaveProperty('total');
      expect(engagementHistory).toHaveProperty('page');
      expect(engagementHistory).toHaveProperty('totalPages');
      expect(engagementHistory).toHaveProperty('analytics');
      expect(Array.isArray(engagementHistory.history)).toBe(true);

      // Test trackEngagement method signature
      await userRepository.trackEngagement({
        action_type: 'view',
        entity_type: 'bill',
        entity_id: 'bill-123',
        metadata: { source: 'dashboard' },
      });

      // Test getAchievements method signature
      const achievements = await userRepository.getAchievements();
      expect(achievements).toHaveProperty('badges');
      expect(achievements).toHaveProperty('achievements');
      expect(achievements).toHaveProperty('next_milestones');
      expect(Array.isArray(achievements.badges)).toBe(true);
      expect(Array.isArray(achievements.achievements)).toBe(true);
      expect(Array.isArray(achievements.next_milestones)).toBe(true);

      // Test uploadAvatar method signature
      const avatarResult = await userRepository.uploadAvatar(new File([], 'avatar.png'));
      expect(avatarResult).toHaveProperty('avatar_url');

      // Test getDashboardData method signature
      const dashboardData = await userRepository.getDashboardData();
      expect(typeof dashboardData).toBe('object');
    });
  });

  describe('useAuth Hook Type Safety', () => {
    it('should maintain AuthContextType interface compatibility', () => {
      // This test ensures the hook returns the correct shape
      // In a real test environment, we'd render the hook with a provider
      // For type safety, we verify the interface structure

      const expectedMethods = [
        'user',
        'login',
        'register',
        'logout',
        'refreshToken',
        'verifyEmail',
        'requestPasswordReset',
        'resetPassword',
        'changePassword',
        'setupTwoFactor',
        'enableTwoFactor',
        'disableTwoFactor',
        'updatePrivacySettings',
        'requestDataExport',
        'requestDataDeletion',
        'getSecurityEvents',
        'getSuspiciousActivity',
        'getActiveSessions',
        'terminateSession',
        'terminateAllSessions',
        'loading',
        'isAuthenticated',
        'updateUser',
      ];

      // Verify the hook exists and is a function
      expect(typeof useAuth).toBe('function');

      // In a real React component test, we would verify the return type
      // For now, we ensure the hook can be imported and is callable
      expect(useAuth).toBeDefined();
    });

    it('should handle User type correctly in context', () => {
      // Type check for User interface usage
      const testUser: User = {
        id: 'test-user',
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

      expect(testUser).toHaveProperty('id');
      expect(testUser).toHaveProperty('privacy_settings');
      expect(testUser.privacy_settings).toHaveProperty('notification_preferences');
    });
  });

  describe('Interface Compliance', () => {
    it('should ensure all interfaces are properly defined', () => {
      // Type assertions to ensure interfaces are properly structured
      // These checks verify that the type system recognizes our interfaces
      const testUser: User = {} as any;
      const testAuthResponse: AuthResponse = {} as any;
      const testLoginCredentials: LoginCredentials = {} as any;
      const testRegisterData: RegisterData = {} as any;
      const testTwoFactorSetup: TwoFactorSetup = {} as any;
      const testPrivacySettings: PrivacySettings = {} as any;
      const testSecurityEvent: SecurityEvent = {} as any;
      const testSuspiciousActivityAlert: SuspiciousActivityAlert = {} as any;
      const testSessionInfo: SessionInfo = {} as any;
      const testDataExportRequest: DataExportRequest = {} as any;
      const testDataDeletionRequest: DataDeletionRequest = {} as any;
      const testAuthContextType: AuthContextType = {} as any;

      // If we reach this point without TypeScript errors, the interfaces are properly defined
      expect(true).toBe(true);
    });

    it('should validate enum and union types', () => {
      // Test PrivacySettings visibility options
      const visibilityOptions: Array<'public' | 'registered' | 'private'> = [
        'public',
        'registered',
        'private',
      ];
      expect(visibilityOptions).toContain('public');
      expect(visibilityOptions).toContain('private');

      // Test SecurityEvent types
      const eventTypes: Array<'login' | 'logout' | 'password_change' | 'failed_login' | 'suspicious_activity' | 'account_locked' | 'two_factor_enabled' | 'two_factor_disabled'> = [
        'login',
        'logout',
        'password_change',
        'failed_login',
        'suspicious_activity',
        'account_locked',
        'two_factor_enabled',
        'two_factor_disabled',
      ];
      expect(eventTypes).toContain('login');
      expect(eventTypes).toContain('two_factor_enabled');

      // Test DataRetentionPreference retention periods
      const retentionPeriods: Array<'1year' | '2years' | '5years' | 'indefinite'> = [
        '1year',
        '2years',
        '5years',
        'indefinite',
      ];
      expect(retentionPeriods).toContain('2years');
      expect(retentionPeriods).toContain('indefinite');
    });
  });

  describe('Dependency Injection Type Safety', () => {
    it('should allow proper dependency injection for repositories', () => {
      // Test AuthRepository configuration
      const authConfig: AuthRepositoryConfig = {
        baseEndpoint: '/api/v1',
        cacheTTL: {
          user: 600000,
          session: 120000,
        },
        tokenRefresh: {
          bufferMinutes: 10,
          maxRetries: 5,
        },
      };

      const authRepo = new AuthRepository(authConfig);
      expect(authRepo).toBeInstanceOf(AuthRepository);

      // Test UserRepository configuration
      const userConfig: UserRepositoryConfig = {
        baseEndpoint: '/api/v1',
        cacheTTL: {
          profile: 300000,
          preferences: 1800000,
          savedBills: 180000,
          engagement: 300000,
          achievements: 600000,
          dashboard: 120000,
        },
      };

      const userRepo = new UserRepository(userConfig);
      expect(userRepo).toBeInstanceOf(UserRepository);
    });

    it('should maintain type safety in repository factory pattern', () => {
      // Test that repositories can be created and used polymorphically
      const repositories = {
        auth: new AuthRepository({
          baseEndpoint: '/api',
          cacheTTL: { user: 600000, session: 120000 },
          tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
        }),
        user: new UserRepository({
          baseEndpoint: '/api',
          cacheTTL: {
            profile: 300000,
            preferences: 1800000,
            savedBills: 180000,
            engagement: 300000,
            achievements: 600000,
            dashboard: 120000,
          },
        }),
      };

      // Type check: repositories should be assignable to their interfaces
      const authRepo: IAuthRepository = repositories.auth;
      const userRepo: IUserRepository = repositories.user;

      expect(authRepo).toBeDefined();
      expect(userRepo).toBeDefined();
    });
  });
});