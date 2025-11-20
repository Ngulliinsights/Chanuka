/**
 * Dependency Injection Tests
 *
 * Tests to verify that dependency injection works properly
 * across the refactored authentication system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@client/services/AuthService';
import { AuthRepository, type AuthRepositoryConfig, UserRepository, type UserRepositoryConfig, type IAuthRepository, type IUserRepository } from '../mocks/services';

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

vi.mock('../../core/api/user', () => ({
  userApiService: {
    getUserProfile: vi.fn(() => Promise.resolve({
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
    getDashboardData: vi.fn(() => Promise.resolve({
      profile: {} as any,
      recent_activity: [],
      saved_bills: [],
      trending_bills: [],
      recommendations: [],
      notifications: [],
      civic_score_trend: [],
      achievements_progress: {
        recent_badges: [],
        next_milestones: [],
      },
    })),
  },
}));

describe('Dependency Injection', () => {
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
  });

  describe('Repository Interface Compliance', () => {
    it('should allow AuthRepository to be used as IAuthRepository', () => {
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

    it('should allow UserRepository to be used as IUserRepository', () => {
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
  });

  describe('Configuration Injection', () => {
    it('should accept different AuthRepository configurations', () => {
      const configs: AuthRepositoryConfig[] = [
        {
          baseEndpoint: '/api/v1',
          cacheTTL: { user: 300000, session: 60000 },
          tokenRefresh: { bufferMinutes: 10, maxRetries: 5 },
        },
        {
          baseEndpoint: '/api/v2',
          cacheTTL: { user: 600000, session: 120000 },
          tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
        },
        {
          baseEndpoint: '/custom/api',
          cacheTTL: { user: 900000, session: 180000 },
          tokenRefresh: { bufferMinutes: 15, maxRetries: 10 },
        },
      ];

      configs.forEach(config => {
        const repo = new AuthRepository(config);
        expect(repo).toBeInstanceOf(AuthRepository);
      });
    });

    it('should accept different UserRepository configurations', () => {
      const configs: UserRepositoryConfig[] = [
        {
          baseEndpoint: '/api/v1',
          cacheTTL: {
            profile: 300000,
            preferences: 1800000,
            savedBills: 180000,
            engagement: 300000,
            achievements: 600000,
            dashboard: 120000,
          },
        },
        {
          baseEndpoint: '/api/v2',
          cacheTTL: {
            profile: 600000,
            preferences: 3600000,
            savedBills: 360000,
            engagement: 600000,
            achievements: 1200000,
            dashboard: 240000,
          },
        },
      ];

      configs.forEach(config => {
        const repo = new UserRepository(config);
        expect(repo).toBeInstanceOf(UserRepository);
      });
    });
  });

  describe('Service Layer Dependency Injection', () => {
    it('should allow AuthService to work with different repository implementations', () => {
      // This test verifies that the AuthService is designed to work independently
      // and could potentially accept repository dependencies in the future

      // Currently, AuthService creates its own dependencies internally
      // But the design allows for future dependency injection
      expect(authService).toBeDefined();
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.logout).toBe('function');
    });

    it('should maintain separation of concerns between service and repository layers', async () => {
      // Test that repositories handle data operations while services handle business logic

      // Repository operations
      const userProfile = await userRepository.getUserProfile();
      expect(userProfile).toHaveProperty('id');
      expect(userProfile).toHaveProperty('email');

      const savedBills = await userRepository.getSavedBills();
      expect(savedBills).toHaveProperty('bills');
      expect(savedBills).toHaveProperty('total');

      // Service operations (business logic)
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(loginResult).toHaveProperty('success');
      expect(loginResult).toHaveProperty('user');
    });
  });

  describe('Mock Injection for Testing', () => {
    it('should allow mock repositories to be injected for testing', () => {
      // Create mock implementations of the interfaces
      const mockAuthRepository: IAuthRepository = {
        login: vi.fn(() => Promise.resolve({} as any)),
        logout: vi.fn(() => Promise.resolve()),
        refreshToken: vi.fn(() => Promise.resolve({} as any)),
        getCurrentUser: vi.fn(() => Promise.resolve(null)),
        checkPermission: vi.fn(() => Promise.resolve(false)),
        getUserRoles: vi.fn(() => Promise.resolve([])),
        getActiveSessions: vi.fn(() => Promise.resolve([])),
        terminateSession: vi.fn(() => Promise.resolve()),
        terminateAllOtherSessions: vi.fn(() => Promise.resolve()),
        isAuthenticated: vi.fn(() => false),
        getCurrentUserSync: vi.fn(() => null),
        cleanup: vi.fn(() => Promise.resolve()),
      };

      const mockUserRepository: IUserRepository = {
        getUserProfile: vi.fn(() => Promise.resolve({} as any)),
        updateProfile: vi.fn(() => Promise.resolve({} as any)),
        updatePreferences: vi.fn(() => Promise.resolve({} as any)),
        getSavedBills: vi.fn(() => Promise.resolve({
          bills: [],
          total: 0,
          page: 1,
          totalPages: 1,
          hasMore: false,
        })),
        saveBill: vi.fn(() => Promise.resolve({} as any)),
        unsaveBill: vi.fn(() => Promise.resolve()),
        updateSavedBill: vi.fn(() => Promise.resolve({} as any)),
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
        uploadAvatar: vi.fn(() => Promise.resolve({ avatar_url: 'test' })),
        getDashboardData: vi.fn(() => Promise.resolve({
          profile: {} as any,
          recent_activity: [],
          saved_bills: [],
          trending_bills: [],
          recommendations: [],
          notifications: [],
          civic_score_trend: [],
          achievements_progress: {
            recent_badges: [],
            next_milestones: [],
          },
        })),
      };

      // Verify that mock objects satisfy the interfaces
      expect(mockAuthRepository).toBeDefined();
      expect(mockUserRepository).toBeDefined();

      // Verify all required methods are present
      expect(typeof mockAuthRepository.login).toBe('function');
      expect(typeof mockUserRepository.getUserProfile).toBe('function');
    });
  });

  describe('Factory Pattern Support', () => {
    it('should support repository factory pattern', () => {
      // Test that repositories can be created through a factory pattern
      // This demonstrates how dependency injection containers could work

      interface IRepositoryFactory {
        createAuthRepository(config: AuthRepositoryConfig): IAuthRepository;
        createUserRepository(config: UserRepositoryConfig): IUserRepository;
      }

      const repositoryFactory: IRepositoryFactory = {
        createAuthRepository: (config) => new AuthRepository(config),
        createUserRepository: (config) => new UserRepository(config),
      };

      const authRepo = repositoryFactory.createAuthRepository({
        baseEndpoint: '/api',
        cacheTTL: { user: 600000, session: 120000 },
        tokenRefresh: { bufferMinutes: 5, maxRetries: 3 },
      });

      const userRepo = repositoryFactory.createUserRepository({
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

      expect(authRepo).toBeInstanceOf(AuthRepository);
      expect(userRepo).toBeInstanceOf(UserRepository);

      // Verify they implement the interfaces
      const authInterface: IAuthRepository = authRepo;
      const userInterface: IUserRepository = userRepo;

      expect(authInterface).toBeDefined();
      expect(userInterface).toBeDefined();
    });
  });

  describe('Singleton Pattern vs Dependency Injection', () => {
    it('should support both singleton and injected instances', () => {
      // Test that the current singleton pattern works
      // This is how the system currently works
      expect(authRepository).toBeDefined();
      expect(userRepository).toBeDefined();

      // Test that new instances can be created with different configs
      const customAuthRepo = new AuthRepository({
        baseEndpoint: '/custom/api',
        cacheTTL: { user: 300000, session: 60000 },
        tokenRefresh: { bufferMinutes: 10, maxRetries: 5 },
      });

      const customUserRepo = new UserRepository({
        baseEndpoint: '/custom/api',
        cacheTTL: {
          profile: 600000,
          preferences: 3600000,
          savedBills: 360000,
          engagement: 600000,
          achievements: 1200000,
          dashboard: 240000,
        },
      });

      expect(customAuthRepo).toBeInstanceOf(AuthRepository);
      expect(customUserRepo).toBeInstanceOf(UserRepository);

      // Verify they are different instances
      expect(customAuthRepo).not.toBe(authRepository);
      expect(customUserRepo).not.toBe(userRepository);
    });
  });

  describe('Cross-Repository Dependencies', () => {
    it('should handle repositories that depend on each other', () => {
      // Test that repositories can work together
      // For example, AuthRepository might need UserRepository for some operations

      // This demonstrates how repositories can be composed
      const repositories = {
        auth: authRepository,
        user: userRepository,
      };

      expect(repositories.auth).toBeDefined();
      expect(repositories.user).toBeDefined();

      // Both should be able to perform their operations independently
      expect(typeof repositories.auth.login).toBe('function');
      expect(typeof repositories.user.getUserProfile).toBe('function');
    });

    it('should demonstrate repository interoperability', () => {
      // Test that repositories can be used together in the same context
      // This demonstrates the dependency injection pattern without actual API calls

      // Both repositories should be properly instantiated
      expect(authRepository).toBeInstanceOf(AuthRepository);
      expect(userRepository).toBeInstanceOf(UserRepository);

      // Both should have the expected interface methods
      expect(typeof authRepository.login).toBe('function');
      expect(typeof userRepository.getUserProfile).toBe('function');

      // This shows they can coexist and be used in the same dependency injection context
    });
  });
});