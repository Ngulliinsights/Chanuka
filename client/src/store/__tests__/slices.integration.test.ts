/**
 * Store Slices Integration Tests
 *
 * Tests the integration between Redux store slices and their repositories.
 * Verifies that store slices properly use repositories and handle state updates.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Import store and slices
import { store } from '../index';
import { login, logout, setUser, setError, clearError } from '../slices/authSlice';
import { fetchOverviewMetrics, setActiveTab, setLoading, setError as setErrorAnalyticsError, updateFilters, resetFilters, updateRealTimeMetrics, addRealTimeError, addRealTimeAlert } from '../slices/errorAnalyticsSlice';

// Mock services
jest.mock('../../services', () => ({
  billsRepository: {
    getBills: jest.fn(),
    recordEngagement: jest.fn(),
    getBillById: jest.fn()
  },
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn()
  },
  errorAnalyticsRepository: {
    getOverviewMetrics: jest.fn()
  }
}));

// Mock AuthService separately
jest.mock('../../services/AuthService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn()
  }
}));

// Mock services
jest.mock('../../services/mockDataService', () => ({
  mockDataService: {
    loadData: jest.fn()
  }
}));

jest.mock('../../services/billsDataCache', () => ({
  billsDataCache: {
    getCachedBills: jest.fn(),
    getCachedBillsStats: jest.fn(),
    cacheBills: jest.fn(),
    cacheBillsStats: jest.fn(),
    clear: jest.fn()
  }
}));

jest.mock('../../services/billsPaginationService', () => ({
  billsPaginationService: {
    loadFirstPage: jest.fn(),
    loadNextPage: jest.fn(),
    reset: jest.fn()
  }
}));

jest.mock('../../services/billsWebSocketService', () => ({
  billsWebSocketService: {
    subscribeToBill: jest.fn(),
    unsubscribeFromBill: jest.fn()
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

describe('Store Slices Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });


  describe('Auth Slice Integration', () => {
    const mockUser = {
      id: 123,
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      verified: true,
      reputation: 100,
      joinedAt: '2024-01-01T00:00:00Z'
    };

    const mockAuthResponse = {
      success: true,
      data: {
        user: mockUser,
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh',
          expiresAt: Date.now() + 3600000
        }
      }
    };

    it('should handle successful login', async () => {
      const { authService } = require('@client/services/AuthService');

      authService.login = jest.fn().mockResolvedValue(mockAuthResponse);

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionExpiry).toBeDefined();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle login failure', async () => {
      const { authService } = require('@client/services/AuthService');

      authService.login = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

      await store.dispatch(login({ email: 'test@example.com', password: 'wrong' }));

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should handle logout', async () => {
      const { authService } = require('@client/services/AuthService');

      // First login
      authService.login = jest.fn().mockResolvedValue(mockAuthResponse);
      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Then logout
      authService.logout = jest.fn().mockResolvedValue(undefined);
      await store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiry).toBe(null);
      expect(state.loading).toBe(false);
    });

    it('should handle logout API failure gracefully', async () => {
      const { authService } = require('@client/services/AuthService');

      // First login
      authService.login = jest.fn().mockResolvedValue(mockAuthResponse);
      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Logout with API failure
      authService.logout = jest.fn().mockRejectedValue(new Error('API error'));
      await store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should update user profile', async () => {
      const { authService } = require('@client/services/AuthService');

      // First login
      authService.login = jest.fn().mockResolvedValue(mockAuthResponse);
      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      // Update profile
      const updates = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updates };
      authService.updateProfile = jest.fn().mockResolvedValue(updatedUser);

      await store.dispatch(authSlice.actions.updateProfile.fulfilled(updatedUser, 'updateProfile', updates));

      const state = store.getState().auth;
      expect(state.user).toEqual(updatedUser);
    });
  });

  describe('Error Analytics Slice Integration', () => {
    const mockFilters = {
      timeRange: { start: Date.now() - 86400000, end: Date.now(), preset: '24h' },
      severity: ['CRITICAL', 'HIGH'],
      domain: ['NETWORK'],
      component: []
    };

    const mockOverviewMetrics = {
      totalErrors: 1250,
      errorRate: 2.5,
      uniqueErrors: 45,
      affectedUsers: 320,
      averageResolutionTime: 1800000,
      severityDistribution: { CRITICAL: 25, HIGH: 150, MEDIUM: 875, LOW: 200 },
      domainDistribution: { NETWORK: 400, AUTHENTICATION: 300, VALIDATION: 350, SYSTEM: 200 },
      timeRange: { start: Date.now() - 86400000, end: Date.now(), preset: '24h' },
      lastUpdated: Date.now()
    };

    it('should fetch overview metrics successfully', async () => {
      const { errorAnalyticsRepository } = require('@client/services');

      errorAnalyticsRepository.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);

      await store.dispatch(fetchOverviewMetrics(mockFilters));

      const state = store.getState().errorAnalytics;
      expect(state.overviewMetrics).toEqual(mockOverviewMetrics);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.lastRefresh).toBeDefined();
    });

    it('should handle fetch errors', async () => {
      const { errorAnalyticsRepository } = require('@client/services');

      errorAnalyticsRepository.getOverviewMetrics.mockRejectedValue(new Error('API Error'));

      await store.dispatch(fetchOverviewMetrics(mockFilters));

      const state = store.getState().errorAnalytics;
      expect(state.overviewMetrics).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to fetch overview metrics');
    });

    it('should update filters', () => {
      const newFilters = {
        severity: ['CRITICAL'],
        domain: ['NETWORK', 'AUTHENTICATION']
      };

      store.dispatch(errorAnalyticsSlice.actions.updateFilters(newFilters));

      const state = store.getState().errorAnalytics;
      expect(state.filters).toEqual({ ...state.filters, ...newFilters });
    });

    it('should reset filters', () => {
      // First set some filters
      store.dispatch(errorAnalyticsSlice.actions.updateFilters({
        severity: ['CRITICAL'],
        domain: ['NETWORK']
      }));

      // Then reset
      store.dispatch(errorAnalyticsSlice.actions.resetFilters());

      const state = store.getState().errorAnalytics;
      expect(state.filters.severity).toEqual([]);
      expect(state.filters.domain).toEqual([]);
    });

    it('should handle real-time metrics updates', () => {
      const realTimeMetrics = {
        currentErrorRate: 1.2,
        activeAlerts: [{ id: 'alert-1', type: 'error_spike', severity: 'high' }],
        liveStream: [{ id: 'error-1', timestamp: Date.now(), severity: 'HIGH' }]
      };

      store.dispatch(errorAnalyticsSlice.actions.updateRealTimeMetrics(realTimeMetrics));

      const state = store.getState().errorAnalytics;
      expect(state.realTimeMetrics).toEqual(realTimeMetrics);
      expect(state.lastRefresh).toBeDefined();
    });

    it('should add real-time errors to live stream', () => {
      const errorEvent = {
        id: 'error-1',
        timestamp: Date.now(),
        severity: 'HIGH',
        message: 'Connection timeout'
      };

      store.dispatch(errorAnalyticsSlice.actions.addRealTimeError(errorEvent));

      const state = store.getState().errorAnalytics;
      expect(state.realTimeMetrics?.liveStream).toContain(errorEvent);
    });

    it('should add real-time alerts', () => {
      const alert = {
        id: 'alert-1',
        type: 'error_rate_spike',
        severity: 'high',
        message: 'Error rate exceeded threshold'
      };

      store.dispatch(errorAnalyticsSlice.actions.addRealTimeAlert(alert));

      const state = store.getState().errorAnalytics;
      expect(state.realTimeMetrics?.activeAlerts).toContain(alert);
    });
  });

  describe('Cross-Slice State Management', () => {
    it('should maintain independent state between slices', () => {
      // Dispatch actions to different slices
      store.dispatch(authSlice.actions.setUser(mockUser));
      store.dispatch(errorAnalyticsSlice.actions.setActiveTab('trends'));

      const state = store.getState();

      expect(state.auth.user).toEqual(mockUser);
      expect(state.errorAnalytics.activeTab).toBe('trends');
    });

    it('should handle loading states independently', () => {
      // Start loading in error analytics slice
      store.dispatch(errorAnalyticsSlice.actions.setLoading(true));

      const state = store.getState();

      expect(state.errorAnalytics.isLoading).toBe(true);
      expect(state.auth.isLoading).toBe(false); // Should remain false
    });
  });

  describe('Error Handling Across Slices', () => {
    it('should handle errors in different slices independently', () => {
      // Set error in auth slice
      store.dispatch(authSlice.actions.setError('Login failed'));

      // Set error in error analytics slice
      store.dispatch(errorAnalyticsSlice.actions.setError('Failed to fetch data'));

      const state = store.getState();

      expect(state.auth.error).toBe('Login failed');
      expect(state.errorAnalytics.error).toBe('Failed to fetch data');
    });

    it('should clear errors independently', () => {
      // Set errors first
      store.dispatch(authSlice.actions.setError('Login failed'));
      store.dispatch(errorAnalyticsSlice.actions.setError('API error'));

      // Clear auth error
      store.dispatch(authSlice.actions.clearError());

      const state = store.getState();

      expect(state.auth.error).toBe(null);
      expect(state.errorAnalytics.error).toBe('API error');
    });
  });
});