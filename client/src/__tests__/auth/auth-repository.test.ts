/**
 * AuthRepository Unit Tests
 *
 * Comprehensive unit tests for the AuthRepository class, focusing on data persistence,
 * session management, RBAC, and proper integration with the unified API client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthRepository, type AuthRepositoryConfig } from '../mocks/services';
import { LoginCredentials } from '../../core/api/auth';

// Mock all dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../core/api/client', () => ({
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
  globalApiClient: {
    getConfig: vi.fn(() => ({
      baseUrl: 'http://localhost:3000',
      timeout: 10000,
      retry: { attempts: 3 },
      cache: { enabled: true },
      websocket: { enabled: false },
      headers: {},
    })),
  },
}));

// Import mocks for direct manipulation
import { UnifiedApiClientImpl, globalApiClient } from '../../core/api/client';
import { logger } from '../../utils/logger';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockApiClient: any;
  let config: AuthRepositoryConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      baseEndpoint: '/api',
      cacheTTL: {
        user: 10 * 60 * 1000, // 10 minutes
        session: 2 * 60 * 1000, // 2 minutes
      },
      tokenRefresh: {
        bufferMinutes: 5,
        maxRetries: 3,
      },
    };

    // Create repository and get reference to mocked API client
    authRepository = new AuthRepository(config);
    mockApiClient = (authRepository as any).apiClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(authRepository).toBeInstanceOf(AuthRepository);
      expect(mockApiClient).toBeInstanceOf(UnifiedApiClientImpl);
      expect(mockApiClient.config).toBeDefined();
    });

    it('should inherit configuration from global API client', () => {
      const globalConfig = {
        baseUrl: 'http://localhost:3000',
        timeout: 10000,
        retry: { attempts: 3 },
        cache: { enabled: true },
        websocket: { enabled: false },
        headers: { 'X-Test': 'test' },
      };

      (globalApiClient.getConfig as any).mockReturnValue(globalConfig);

      const newRepo = new AuthRepository(config);
      const newMockClient = (newRepo as any).apiClient;

      expect(newMockClient.config.baseUrl).toBe(globalConfig.baseUrl);
      expect(newMockClient.config.timeout).toBe(globalConfig.timeout);
    });
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
    };

    it('should successfully authenticate user and store user data', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue({
        data: mockAuthSession,
        status: 200,
      });

      // Act
      const result = await authRepository.login(validCredentials);

      // Assert
      expect(result).toEqual(mockAuthSession);
      expect(mockApiClient.post).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/login`, validCredentials);
      expect(authRepository.isAuthenticated()).toBe(true);
      expect(authRepository.getCurrentUserSync()).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'Test_User',
        first_name: 'Test',
        last_name: 'User',
        role: 'citizen',
        verification_status: 'verified',
        is_active: true,
        created_at: mockAuthSession.user.createdAt,
        reputation: 0,
        expertise: '',
        two_factor_enabled: false,
        last_login: mockAuthSession.user.lastLogin,
        login_count: 1,
        account_locked: false,
        locked_until: null,
        password_changed_at: mockAuthSession.user.createdAt,
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
      expect(logger.info).toHaveBeenCalledWith('User logged in successfully', { userId: 'user-123' });
    });

    it('should schedule token refresh when login succeeds', async () => {
      // Arrange
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      const sessionWithFutureExpiry = {
        ...mockAuthSession,
        expiresAt: new Date(futureExpiry).toISOString(),
      };

      mockApiClient.post.mockResolvedValue({
        data: sessionWithFutureExpiry,
        status: 200,
      });

      // Mock setTimeout to capture the refresh scheduling
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Act
      await authRepository.login(validCredentials);

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalled();
      const [callback, delay] = setTimeoutSpy.mock.calls[0];

      // The delay should be expiresAt - bufferMinutes
      const expectedDelay = futureExpiry - Date.now() - (config.tokenRefresh.bufferMinutes * 60 * 1000);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(expectedDelay + 1000); // Allow some tolerance

      // Cleanup
      setTimeoutSpy.mockRestore();
    });

    it('should handle login failure', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      mockApiClient.post.mockRejectedValue(error);

      // Act & Assert
      await expect(authRepository.login(validCredentials)).rejects.toThrow('Invalid credentials');
      expect(logger.error).toHaveBeenCalledWith('Failed to get current user', { error });
      expect(authRepository.isAuthenticated()).toBe(false);
    });

    it('should clear previous user data on new login', async () => {
      // Arrange - First login
      mockApiClient.post.mockResolvedValueOnce({
        data: mockAuthSession,
        status: 200,
      });

      await authRepository.login(validCredentials);
      expect(authRepository.isAuthenticated()).toBe(true);

      // Arrange - Second login with different user
      const differentSession = {
        ...mockAuthSession,
        user: { ...mockAuthSession.user, id: 'user-456', email: 'different@example.com' },
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: differentSession,
        status: 200,
      });

      // Act
      await authRepository.login(validCredentials);

      // Assert
      expect(authRepository.getCurrentUserSync()?.id).toBe('user-456');
      expect(authRepository.getCurrentUserSync()?.email).toBe('different@example.com');
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const mockSession = {
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
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: mockSession,
        status: 200,
      });

      await authRepository.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should successfully logout and clear user data', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValueOnce({ status: 200 });

      // Act
      await authRepository.logout();

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/logout`);
      expect(authRepository.isAuthenticated()).toBe(false);
      expect(authRepository.getCurrentUserSync()).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('User logged out successfully');
    });

    it('should handle logout API failure gracefully', async () => {
      // Arrange
      const error = new Error('Network error');
      mockApiClient.post.mockRejectedValueOnce(error);

      // Act
      await authRepository.logout();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Logout API call failed, but proceeding with local cleanup', { error });
      expect(authRepository.isAuthenticated()).toBe(false);
      expect(authRepository.getCurrentUserSync()).toBeNull();
    });

    it('should clear token refresh timer on logout', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue({ status: 200 });

      // Mock setTimeout and clearTimeout
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // First login to set up timer
      const futureExpiry = Date.now() + 3600000;
      const sessionWithFutureExpiry = {
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
        expiresAt: new Date(futureExpiry).toISOString(),
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: sessionWithFutureExpiry,
        status: 200,
      });

      await authRepository.login({ email: 'test@example.com', password: 'password123' });

      // Act - logout
      await authRepository.logout();

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Cleanup
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh authentication token', async () => {
      // Arrange
      const mockRefreshResponse = {
        success: true,
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer' as const,
          },
        },
      };

      mockApiClient.post.mockResolvedValue({
        data: mockRefreshResponse,
        status: 200,
      });

      // Act
      const result = await authRepository.refreshToken();

      // Assert
      expect(result).toEqual(mockRefreshResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/refresh`);
      expect(logger.debug).toHaveBeenCalledWith('Token refreshed successfully');
    });

    it('should schedule new token refresh after successful refresh', async () => {
      // Arrange
      const mockRefreshResponse = {
        success: true,
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer' as const,
          },
        },
      };

      mockApiClient.post.mockResolvedValue({
        data: mockRefreshResponse,
        status: 200,
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Act
      await authRepository.refreshToken();

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalled();

      // Cleanup
      setTimeoutSpy.mockRestore();
    });

    it('should handle token refresh failure', async () => {
      // Arrange
      const error = new Error('Token refresh failed');
      mockApiClient.post.mockRejectedValue(error);

      // Act & Assert
      await expect(authRepository.refreshToken()).rejects.toThrow('Token refresh failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return cached user if available', async () => {
      // Arrange - Set up cached user
      const mockSession = {
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
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: mockSession,
        status: 200,
      });

      await authRepository.login({ email: 'test@example.com', password: 'password123' });

      // Act
      const result = await authRepository.getCurrentUser();

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(mockApiClient.get).not.toHaveBeenCalled(); // Should use cache
    });

    it('should fetch user from API if not cached', async () => {
      // Arrange
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
      };

      mockApiClient.get.mockResolvedValue({
        data: mockUser,
        status: 200,
      });

      // Act
      const result = await authRepository.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/me`, {
        cache: { ttl: config.cacheTTL.user }
      });
    });

    it('should handle API failure when fetching current user', async () => {
      // Arrange
      const error = new Error('API Error');
      mockApiClient.get.mockRejectedValue(error);

      // Act
      const result = await authRepository.getCurrentUser();

      // Assert
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Failed to get current user', { error });
    });
  });

  describe('checkPermission', () => {
    it('should successfully check user permission', async () => {
      // Arrange
      const mockResponse = { granted: true };
      mockApiClient.post.mockResolvedValue({
        data: mockResponse,
        status: 200,
      });

      // Act
      const result = await authRepository.checkPermission('bills', 'read');

      // Assert
      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/check-permission`, {
        resource: 'bills',
        action: 'read',
      });
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const error = new Error('Permission denied');
      mockApiClient.post.mockRejectedValue(error);

      // Act
      const result = await authRepository.checkPermission('admin', 'write');

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Permission check failed', {
        resource: 'admin',
        action: 'write',
        error,
      });
    });
  });

  describe('getUserRoles', () => {
    const mockRoles = [
      { id: 'role-1', name: 'Citizen', permissions: ['read:bills'] },
      { id: 'role-2', name: 'Expert', permissions: ['read:bills', 'write:comments'] },
    ];

    it('should get roles for current user', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue({
        data: mockRoles,
        status: 200,
      });

      // Act
      const result = await authRepository.getUserRoles();

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockApiClient.get).toHaveBeenCalledWith(`${config.baseEndpoint}/users/roles`, {
        cache: { ttl: config.cacheTTL.user }
      });
    });

    it('should get roles for specific user', async () => {
      // Arrange
      const userId = 'user-456';
      mockApiClient.get.mockResolvedValue({
        data: mockRoles,
        status: 200,
      });

      // Act
      const result = await authRepository.getUserRoles(userId);

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockApiClient.get).toHaveBeenCalledWith(`${config.baseEndpoint}/users/${userId}/roles`, {
        cache: { ttl: config.cacheTTL.user }
      });
    });
  });

  describe('getActiveSessions', () => {
    const mockSessions = [
      {
        id: 'session-1',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'Chrome',
        is_current: true,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      {
        id: 'session-2',
        user_id: 'user-123',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        last_activity: new Date(Date.now() - 1800000).toISOString(),
        ip_address: '192.168.1.1',
        user_agent: 'Firefox',
        is_current: false,
        expires_at: new Date(Date.now() + 1800000).toISOString(),
      },
    ];

    it('should retrieve active sessions with caching', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue({
        data: mockSessions,
        status: 200,
      });

      // Act
      const result = await authRepository.getActiveSessions();

      // Assert
      expect(result).toEqual(mockSessions);
      expect(mockApiClient.get).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/sessions`, {
        cache: { ttl: config.cacheTTL.session }
      });
    });

    it('should handle session retrieval failure', async () => {
      // Arrange
      const error = new Error('Failed to get sessions');
      mockApiClient.get.mockRejectedValue(error);

      // Act & Assert
      await expect(authRepository.getActiveSessions()).rejects.toThrow('Failed to get sessions');
    });
  });

  describe('terminateSession', () => {
    it('should successfully terminate a specific session', async () => {
      // Arrange
      const sessionId = 'session-456';
      mockApiClient.delete.mockResolvedValue({
        status: 200,
      });

      // Act
      await authRepository.terminateSession(sessionId);

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/sessions/${sessionId}`);
      expect(logger.info).toHaveBeenCalledWith('Session terminated', { sessionId });
    });

    it('should handle session termination failure', async () => {
      // Arrange
      const sessionId = 'session-456';
      const error = new Error('Session not found');
      mockApiClient.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(authRepository.terminateSession(sessionId)).rejects.toThrow('Session not found');
    });
  });

  describe('terminateAllOtherSessions', () => {
    it('should successfully terminate all other sessions', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue({
        status: 200,
      });

      // Act
      await authRepository.terminateAllOtherSessions();

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith(`${config.baseEndpoint}/auth/sessions/others`);
      expect(logger.info).toHaveBeenCalledWith('All other sessions terminated');
    });

    it('should handle bulk session termination failure', async () => {
      // Arrange
      const error = new Error('Bulk termination failed');
      mockApiClient.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(authRepository.terminateAllOtherSessions()).rejects.toThrow('Bulk termination failed');
    });
  });

  describe('cleanup', () => {
    it('should clear all user data and timers', async () => {
      // Arrange - Set up authenticated state with timer
      const futureExpiry = Date.now() + 3600000;
      const sessionWithFutureExpiry = {
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
        expiresAt: new Date(futureExpiry).toISOString(),
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: sessionWithFutureExpiry,
        status: 200,
      });

      await authRepository.login({ email: 'test@example.com', password: 'password123' });

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Act
      await authRepository.cleanup();

      // Assert
      expect(authRepository.isAuthenticated()).toBe(false);
      expect(authRepository.getCurrentUserSync()).toBeNull();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Authentication State Methods', () => {
    describe('isAuthenticated', () => {
      it('should return true when user is logged in', async () => {
        // Arrange
        const mockSession = {
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
        };

        mockApiClient.post.mockResolvedValueOnce({
          data: mockSession,
          status: 200,
        });

        await authRepository.login({ email: 'test@example.com', password: 'password123' });

        // Act & Assert
        expect(authRepository.isAuthenticated()).toBe(true);
      });

      it('should return false when user is not logged in', () => {
        // Act & Assert
        expect(authRepository.isAuthenticated()).toBe(false);
      });

      it('should return false after logout', async () => {
        // Arrange - Login first
        const mockSession = {
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
        };

        mockApiClient.post.mockResolvedValueOnce({
          data: mockSession,
          status: 200,
        });

        await authRepository.login({ email: 'test@example.com', password: 'password123' });

        // Arrange - Then logout
        mockApiClient.post.mockResolvedValueOnce({ status: 200 });

        // Act
        await authRepository.logout();

        // Assert
        expect(authRepository.isAuthenticated()).toBe(false);
      });
    });

    describe('getCurrentUserSync', () => {
      it('should return current user synchronously', async () => {
        // Arrange - Login to set user
        const mockSession = {
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
        };

        mockApiClient.post.mockResolvedValueOnce({
          data: mockSession,
          status: 200,
        });

        await authRepository.login({ email: 'test@example.com', password: 'password123' });

        // Act
        const user = authRepository.getCurrentUserSync();

        // Assert
        expect(user).toBeDefined();
        expect(user?.id).toBe('user-123');
        expect(user?.email).toBe('test@example.com');
      });

      it('should return null when no user is logged in', () => {
        // Act
        const user = authRepository.getCurrentUserSync();

        // Assert
        expect(user).toBeNull();
      });
    });
  });
});