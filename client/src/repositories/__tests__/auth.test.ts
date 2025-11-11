/**
 * Auth Repository Unit Tests
 *
 * Tests the AuthRepository class methods with mocked API responses.
 * Focuses on authentication, user management, and session handling.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { AuthRepository } from '../auth';
import { UnifiedApiClientImpl } from '../../core/api/client';
import { User } from '../../core/api/types';

// Mock the unified API client
jest.mock('../../core/api/client', () => ({
  UnifiedApiClientImpl: jest.fn(),
  globalApiClient: {
    getConfig: jest.fn(() => ({
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
      retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
      cache: { defaultTTL: 300000, maxSize: 100, storage: 'memory' },
      websocket: { url: 'ws://localhost:3000', reconnect: { enabled: true } },
      headers: { 'Content-Type': 'application/json' }
    }))
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let mockApiClient: jest.Mocked<UnifiedApiClientImpl>;

  const mockConfig = {
    baseEndpoint: '/api',
    cacheTTL: {
      user: 600000,
      profile: 300000,
      preferences: 1800000,
      session: 120000
    },
    tokenRefresh: {
      bufferMinutes: 5,
      maxRetries: 3
    }
  };

  const mockUser: User = {
    id: 123,
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    verified: true,
    expertStatus: 'verified',
    reputation: 150,
    joinedAt: '2024-01-01T00:00:00Z'
  };

  const mockAuthResponse = {
    success: true,
    data: {
      user: mockUser,
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000
      }
    },
    message: 'Login successful'
  };

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    } as any;

    (UnifiedApiClientImpl as jest.Mock).mockImplementation(() => mockApiClient);

    repository = new AuthRepository(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.login(credentials);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(result).toEqual(mockAuthResponse);
      expect(repository.isAuthenticated()).toBe(true);
      expect(repository.getCurrentUserSync()).toEqual(mockUser);
    });

    it('should schedule token refresh on successful login', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      // Mock setTimeout
      jest.spyOn(global, 'setTimeout');

      await repository.login(credentials);

      expect(setTimeout).toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrongpassword' };

      mockApiClient.post.mockRejectedValue(new Error('Invalid credentials'));

      await expect(repository.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(repository.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);
      await repository.login({ email: 'test@example.com', password: 'password123' });
      mockApiClient.post.mockClear();
    });

    it('should logout user successfully', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await repository.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(repository.isAuthenticated()).toBe(false);
      expect(repository.getCurrentUserSync()).toBe(null);
    });

    it('should handle logout API failure gracefully', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API error'));

      await repository.logout();

      // Should still clear local state even if API fails
      expect(repository.isAuthenticated()).toBe(false);
      expect(repository.getCurrentUserSync()).toBe(null);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        success: true,
        data: {
          user: mockUser,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresAt: Date.now() + 3600000
          }
        }
      };

      const mockResponse = {
        data: mockRefreshResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.refreshToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should return cached user if available', async () => {
      // Set up authenticated state
      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);
      await repository.login({ email: 'test@example.com', password: 'password123' });

      const result = await repository.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch user from API if not cached', async () => {
      const mockResponse = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.user }
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null on API error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API error'));

      const result = await repository.getCurrentUser();

      expect(result).toBe(null);
    });
  });

  describe('getUserProfile', () => {
    const mockProfile = {
      id: 123,
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      bio: 'Test bio',
      preferences: {
        notifications: true,
        theme: 'dark'
      }
    };

    it('should get current user profile', async () => {
      const mockResponse = {
        data: mockProfile,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getUserProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/users/profile',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.profile }
        })
      );
      expect(result).toEqual(mockProfile);
    });

    it('should get specific user profile', async () => {
      const userId = '456';

      const mockResponse = {
        data: { ...mockProfile, id: 456 },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getUserProfile(userId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/users/456/profile',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.profile }
        })
      );
      expect(result.id).toBe(456);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { displayName: 'Updated Name', bio: 'Updated bio' };
      const updatedProfile = { ...mockUser, ...updates };

      const mockResponse = {
        data: updatedProfile,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await repository.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/users/profile', updates);
      expect(result).toEqual(updatedProfile);
    });

    it('should update current user cache when updating own profile', async () => {
      // Set up authenticated state
      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);
      await repository.login({ email: 'test@example.com', password: 'password123' });

      const updates = { displayName: 'Updated Name' };
      const updatedProfile = { ...mockUser, ...updates };

      const updateResponse = {
        data: updatedProfile,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-124'
      };

      mockApiClient.put.mockResolvedValue(updateResponse);

      await repository.updateProfile(updates);

      expect(repository.getCurrentUserSync()).toEqual(updatedProfile);
    });
  });

  describe('getSavedBills', () => {
    const mockSavedBills = {
      bills: [
        {
          id: 'bill-1',
          billId: '123',
          title: 'Test Bill',
          notes: 'Important bill',
          tags: ['environment'],
          savedAt: '2024-01-01T00:00:00Z'
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    };

    it('should get saved bills with default parameters', async () => {
      const mockResponse = {
        data: mockSavedBills,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getSavedBills();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/users/saved-bills?page=1&limit=20',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.profile }
        })
      );
      expect(result).toEqual(mockSavedBills);
    });

    it('should get saved bills with filters', async () => {
      const filters = {
        status: 'active',
        urgency: 'high',
        tags: ['environment', 'health']
      };

      const mockResponse = {
        data: mockSavedBills,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getSavedBills(1, 10, filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/users/saved-bills?page=1&limit=10&status=active&urgency=high&tags=environment%2Chealth',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.profile }
        })
      );
      expect(result).toEqual(mockSavedBills);
    });
  });

  describe('saveBill', () => {
    it('should save bill successfully', async () => {
      const billId = '123';
      const notes = 'Important bill';
      const tags = ['environment'];

      const mockSavedBill = {
        id: 'saved-123',
        billId,
        title: 'Test Bill',
        notes,
        tags,
        savedAt: new Date().toISOString()
      };

      const mockResponse = {
        data: mockSavedBill,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.saveBill(billId, notes, tags);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/users/saved-bills', {
        bill_id: billId,
        notes,
        tags,
        notification_enabled: true
      });
      expect(result).toEqual(mockSavedBill);
    });
  });

  describe('unsaveBill', () => {
    it('should unsave bill successfully', async () => {
      const billId = '123';

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      await repository.unsaveBill(billId);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/users/saved-bills/123');
    });
  });

  describe('getAchievements', () => {
    const mockAchievements = {
      badges: [
        { id: 'badge-1', name: 'First Comment', description: 'Made your first comment' }
      ],
      achievements: [
        { id: 'ach-1', name: 'Active Citizen', description: 'High engagement score', progress: 85 }
      ],
      next_milestones: [
        { id: 'next-1', name: 'Expert Contributor', description: 'Reach 100 comments', threshold: 100 }
      ]
    };

    it('should get user achievements', async () => {
      const mockResponse = {
        data: mockAchievements,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getAchievements();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/users/achievements',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.profile }
        })
      );
      expect(result).toEqual(mockAchievements);
    });
  });

  describe('checkPermission', () => {
    it('should check permission successfully', async () => {
      const resource = 'bills';
      const action = 'create';

      const mockResponse = {
        data: { granted: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.checkPermission(resource, action);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/check-permission', {
        resource,
        action
      });
      expect(result).toBe(true);
    });

    it('should return false on permission denied', async () => {
      const mockResponse = {
        data: { granted: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.checkPermission('admin', 'delete');

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API error'));

      const result = await repository.checkPermission('bills', 'read');

      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should get active sessions', async () => {
      const mockSessions = [
        { id: 'session-1', device: 'Chrome', lastActivity: '2024-01-01T00:00:00Z' }
      ];

      const mockResponse = {
        data: mockSessions,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getActiveSessions();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/auth/sessions',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.session }
        })
      );
      expect(result).toEqual(mockSessions);
    });

    it('should terminate session', async () => {
      const sessionId = 'session-123';

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      await repository.terminateSession(sessionId);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/auth/sessions/session-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(repository.login({ email: 'test@example.com', password: 'password' }))
        .rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Request timeout'));

      const result = await repository.getCurrentUser();

      expect(result).toBe(null);
    });
  });

  describe('Token Refresh Timer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule token refresh', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await repository.login(credentials);

      expect(setTimeout).toHaveBeenCalled();
    });

    it('should clear token refresh timer on logout', async () => {
      // Set up authenticated state
      const mockResponse = {
        data: mockAuthResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);
      await repository.login({ email: 'test@example.com', password: 'password123' });

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await repository.logout();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});