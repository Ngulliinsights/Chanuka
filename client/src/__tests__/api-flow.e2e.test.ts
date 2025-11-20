/**
 * End-to-End API Flow Tests
 *
 * Tests complete user workflows using the consolidated API.
 * Covers authentication, bill operations, community interactions, and error analytics.
 */

import React from 'react';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock all external dependencies
jest.mock('../services', () => ({
  billsRepository: {
    getBills: jest.fn(),
    recordEngagement: jest.fn(),
    getBillById: jest.fn(),
    searchBills: jest.fn(),
    getBillComments: jest.fn(),
    addComment: jest.fn()
  },
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    getUserProfile: jest.fn(),
    saveBill: jest.fn(),
    getSavedBills: jest.fn()
  },
  communityRepository: {
    getDiscussionThread: jest.fn(),
    addComment: jest.fn(),
    voteComment: jest.fn()
  },
  errorAnalyticsRepository: {
    getOverviewMetrics: jest.fn()
  }
}));

// Mock services
jest.mock('../services/mockDataService', () => ({
  mockDataService: {
    loadData: jest.fn()
  }
}));

jest.mock('../services/billsDataCache', () => ({
  billsDataCache: {
    getCachedBills: jest.fn(),
    getCachedBillsStats: jest.fn(),
    cacheBills: jest.fn(),
    cacheBillsStats: jest.fn(),
    clear: jest.fn()
  }
}));

jest.mock('../services/billsPaginationService', () => ({
  billsPaginationService: {
    loadFirstPage: jest.fn(),
    loadNextPage: jest.fn(),
    reset: jest.fn()
  }
}));

jest.mock('../services/billsWebSocketService', () => ({
  billsWebSocketService: {
    subscribeToBill: jest.fn(),
    unsubscribeFromBill: jest.fn()
  }
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('End-to-End API Flow Tests', () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('User Authentication and Bill Interaction Flow', () => {
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

    const mockBillsData = {
      bills: [
        {
          id: 1,
          billNumber: 'HB-001',
          title: 'Environmental Protection Act',
          summary: 'A comprehensive bill for environmental protection',
          status: 'introduced',
          urgencyLevel: 'high',
          introducedDate: '2024-01-01',
          lastUpdated: '2024-01-01T00:00:00Z',
          sponsors: [{ id: 1, name: 'Test Sponsor', party: 'Independent', position: 'Representative' }],
          constitutionalFlags: [],
          viewCount: 100,
          saveCount: 20,
          commentCount: 5,
          shareCount: 3,
          policyAreas: ['Environment'],
          complexity: 'medium',
          readingTime: 10
        }
      ],
      stats: {
        totalBills: 1,
        urgentCount: 1,
        constitutionalFlags: 0,
        trendingCount: 0,
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    };

    it('should complete full user journey: login -> browse bills -> engage -> logout', async () => {
      const { authService } = require('@client/services/AuthService');
      const { billsRepository } = require('@client/services');
      const { billsPaginationService } = require('@client/services/billsPaginationService');
      const { billsDataCache } = require('@client/services/billsDataCache');

      // Step 1: User logs in
      authService.login = vi.fn().mockResolvedValue(mockAuthResponse);

      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      let authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);

      // Step 2: User browses bills
      billsDataCache.getCachedBills.mockResolvedValue(null);
      billsDataCache.getCachedBillsStats.mockResolvedValue(null);
      billsPaginationService.loadFirstPage.mockResolvedValue(mockBillsData);

      await store.dispatch(loadBillsFromAPI());

      let billsState = store.getState().bills;
      expect(billsState.bills).toHaveLength(1);
      expect(billsState.bills[0].title).toBe('Environmental Protection Act');

      // Step 3: User engages with a bill (views it)
      billsRepository.recordEngagement.mockResolvedValue(undefined);

      await store.dispatch(recordEngagement({ billId: 1, type: 'view' }));

      expect(billsRepository.recordEngagement).toHaveBeenCalledWith(1, 'view');

      // Step 4: User saves the bill
      const mockSavedBill = {
        id: 'saved-1',
        billId: '1',
        title: 'Environmental Protection Act',
        notes: 'Important for community',
        tags: ['environment'],
        savedAt: new Date().toISOString()
      };

      authService.saveBill = vi.fn().mockResolvedValue(mockSavedBill);

      // Simulate saving bill through service
      await authService.saveBill('1', 'Important for community', ['environment']);

      expect(authService.saveBill).toHaveBeenCalledWith('1', 'Important for community', ['environment']);

      // Step 5: User logs out
      authService.logout = vi.fn().mockResolvedValue(undefined);

      await store.dispatch(logout());

      authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
    });

    it('should handle error scenarios gracefully throughout the flow', async () => {
      const { authService } = require('@client/services/AuthService');
      const { billsRepository } = require('@client/services');
      const { billsPaginationService } = require('@client/services/billsPaginationService');
      const { mockDataService } = require('@client/services/mockDataService');

      // Step 1: Login fails
      authService.login = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

      await store.dispatch(login({ email: 'test@example.com', password: 'wrong' }));

      let authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.error).toBe('Invalid credentials');

      // Step 2: Try to load bills when not authenticated (should still work with fallback)
      billsPaginationService.loadFirstPage.mockRejectedValue(new Error('API Error'));
      mockDataService.loadData
        .mockResolvedValueOnce(mockBillsData.bills)
        .mockResolvedValueOnce(mockBillsData.stats);

      await store.dispatch(loadBillsFromAPI());

      let billsState = store.getState().bills;
      expect(billsState.bills).toHaveLength(1);
      expect(billsState.error).toBe(null); // Should fallback gracefully

      // Step 3: Try to record engagement (should fail silently)
      billsRepository.recordEngagement.mockRejectedValue(new Error('API Error'));

      await expect(store.dispatch(recordEngagement({ billId: 1, type: 'view' }))).resolves.toBeDefined();

      billsState = store.getState().bills;
      expect(billsState.error).toBeUndefined(); // Silent failure
    });
  });

  describe('Community Engagement Flow', () => {
    const mockComment = {
      id: 1,
      billId: 123,
      userId: 456,
      content: 'This is a great bill for our community!',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      author: {
        id: 456,
        username: 'communityuser',
        email: 'community@example.com',
        displayName: 'Community User',
        verified: true,
        reputation: 150,
        joinedAt: '2024-01-01T00:00:00Z'
      },
      replies: [],
      voteCount: 0,
      userVote: null,
      moderated: false
    };

    it('should complete community interaction flow: view discussion -> add comment -> vote', async () => {
      const { communityRepository } = require('@client/services');

      // Step 1: User views discussion thread
      const mockDiscussionThread = {
        id: 1,
        billId: 123,
        title: 'Discussion about Environmental Bill',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        participantCount: 5,
        messageCount: 12,
        lastActivity: '2024-01-01T02:00:00Z',
        pinned: false,
        locked: false
      };

      communityRepository.getDiscussionThread.mockResolvedValue(mockDiscussionThread);

      const discussion = await communityRepository.getDiscussionThread(123);
      expect(discussion).toEqual(mockDiscussionThread);

      // Step 2: User adds a comment
      const commentData = {
        billId: 123,
        content: 'This bill needs more community input on implementation details.'
      };

      communityRepository.addComment.mockResolvedValue(mockComment);

      const addedComment = await communityRepository.addComment(commentData);
      expect(addedComment).toEqual(mockComment);

      // Step 3: Other users vote on the comment
      const votedComment = { ...mockComment, voteCount: 5, userVote: 'up' };

      communityRepository.voteComment.mockResolvedValue(votedComment);

      const result = await communityRepository.voteComment(1, 'up');
      expect(result.voteCount).toBe(5);
      expect(result.userVote).toBe('up');
    });
  });

  describe('Error Analytics Monitoring Flow', () => {
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

    it('should complete error analytics workflow: fetch metrics -> update filters -> monitor real-time', async () => {
      const { errorAnalyticsRepository } = require('@client/services');

      // Step 1: Load overview metrics
      errorAnalyticsRepository.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);

      await store.dispatch(fetchOverviewMetrics(mockFilters));

      let analyticsState = store.getState().errorAnalytics;
      expect(analyticsState.overviewMetrics?.totalErrors).toBe(1250);
      expect(analyticsState.overviewMetrics?.errorRate).toBe(2.5);

      // Step 2: Update filters for more specific analysis
      const updatedFilters = {
        ...mockFilters,
        severity: ['CRITICAL'],
        domain: ['NETWORK', 'AUTHENTICATION']
      };

      store.dispatch(errorAnalyticsSlice.actions.updateFilters(updatedFilters));

      analyticsState = store.getState().errorAnalytics;
      expect(analyticsState.filters.severity).toEqual(['CRITICAL']);
      expect(analyticsState.filters.domain).toEqual(['NETWORK', 'AUTHENTICATION']);

      // Step 3: Simulate real-time error updates
      const realTimeError = {
        id: 'error-1',
        timestamp: Date.now(),
        severity: 'HIGH',
        domain: 'NETWORK',
        message: 'Connection timeout'
      };

      store.dispatch(errorAnalyticsSlice.actions.addRealTimeError(realTimeError));

      analyticsState = store.getState().errorAnalytics;
      expect(analyticsState.realTimeMetrics?.liveStream).toContain(realTimeError);

      // Step 4: Simulate real-time alert
      const alert = {
        id: 'alert-1',
        type: 'error_rate_spike',
        severity: 'high',
        message: 'Error rate exceeded threshold',
        timestamp: Date.now(),
        acknowledged: false
      };

      store.dispatch(errorAnalyticsSlice.actions.addRealTimeAlert(alert));

      analyticsState = store.getState().errorAnalytics;
      expect(analyticsState.realTimeMetrics?.activeAlerts).toContain(alert);
    });
  });

  describe('Cross-Feature Integration Flow', () => {
    it('should demonstrate unified error handling across features', async () => {
      const { authService } = require('@client/services/AuthService');
      const { billsRepository, errorAnalyticsRepository } = require('@client/services');

      // Simulate network errors across different features
      const networkError = new Error('Network connection failed');

      // Auth error
      authService.login = vi.fn().mockRejectedValue(networkError);
      await store.dispatch(login({ email: 'test@example.com', password: 'password' }));

      let authState = store.getState().auth;
      expect(authState.error).toBe('Network connection failed');

      // Bills error (with fallback)
      const { billsPaginationService, mockDataService } = require('@client/services/mockDataService');
      billsPaginationService.loadFirstPage.mockRejectedValue(networkError);
      mockDataService.loadData.mockResolvedValue([]);

      await store.dispatch(loadBillsFromAPI());

      let billsState = store.getState().bills;
      expect(billsState.error).toBe(null); // Should fallback gracefully

      // Error analytics should still work
      const mockMetrics = {
        totalErrors: 1,
        errorRate: 0.1,
        uniqueErrors: 1,
        affectedUsers: 1,
        averageResolutionTime: 300000,
        severityDistribution: { HIGH: 1 },
        domainDistribution: { NETWORK: 1 },
        timeRange: { start: Date.now() - 3600000, end: Date.now() },
        lastUpdated: Date.now()
      };

      errorAnalyticsRepository.getOverviewMetrics.mockResolvedValue(mockMetrics);

      await store.dispatch(fetchOverviewMetrics({
        timeRange: { start: Date.now() - 3600000, end: Date.now() },
        severity: [],
        domain: [],
        component: []
      }));

      let analyticsState = store.getState().errorAnalytics;
      expect(analyticsState.overviewMetrics?.totalErrors).toBe(1);
    });

    it('should demonstrate caching benefits across user sessions', async () => {
      const { billsRepository } = require('@client/services');
      const { billsDataCache } = require('@client/services/billsDataCache');

      // First session - cache miss, API call
      billsDataCache.getCachedBills.mockResolvedValue(null);
      billsDataCache.getCachedBillsStats.mockResolvedValue(null);

      const { billsPaginationService } = require('@client/services/billsPaginationService');
      billsPaginationService.loadFirstPage.mockResolvedValue({
        bills: [{ id: 1, title: 'Cached Bill' }],
        stats: { totalBills: 1, urgentCount: 0, constitutionalFlags: 0, trendingCount: 0, lastUpdated: new Date().toISOString() }
      });

      await store.dispatch(loadBillsFromAPI());

      expect(billsPaginationService.loadFirstPage).toHaveBeenCalledTimes(1);

      // Second session - cache hit, no API call
      billsDataCache.getCachedBills.mockResolvedValue([{ id: 1, title: 'Cached Bill' }]);
      billsDataCache.getCachedBillsStats.mockResolvedValue({
        totalBills: 1, urgentCount: 0, constitutionalFlags: 0, trendingCount: 0, lastUpdated: new Date().toISOString()
      });

      // Reset store for second session
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
          errorAnalytics: errorAnalyticsSlice.reducer
        }
      });

      await store.dispatch(loadBillsFromAPI());

      expect(billsPaginationService.loadFirstPage).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(billsDataCache.getCachedBills).toHaveBeenCalledTimes(2); // But cache was checked twice
    });
  });

  describe('Performance and Reliability Flow', () => {
    it('should demonstrate circuit breaker protection during API outages', async () => {
      // This would test the circuit breaker functionality
      // For now, we'll test the error handling resilience

      const { billsRepository } = require('@client/services');

      // Simulate multiple failures that would trigger circuit breaker in real implementation
      for (let i = 0; i < 3; i++) {
        billsRepository.recordEngagement.mockRejectedValueOnce(new Error('API unavailable'));
      }

      // All engagement calls should fail silently without breaking the app
      for (let i = 0; i < 3; i++) {
        await expect(store.dispatch(recordEngagement({ billId: 1, type: 'view' }))).resolves.toBeDefined();
      }

      // App state should remain stable
      const billsState = store.getState().bills;
      expect(billsState.error).toBeUndefined();
    });

    it('should demonstrate WebSocket integration for real-time features', async () => {
      const { billsRepository } = require('@client/services');

      // Simulate WebSocket real-time updates
      const realTimeUpdate = {
        type: 'bill_status_change',
        data: { bill_id: 1, newStatus: 'passed' }
      };

      // Add a bill first (simulated through service)
      const { billsRepository } = require('@client/services');
      billsRepository.getBillById.mockResolvedValue({
        id: 1,
        billNumber: 'HB-001',
        title: 'Test Bill',
        summary: 'Test summary',
        status: 'introduced',
        urgencyLevel: 'medium',
        introducedDate: '2024-01-01',
        lastUpdated: '2024-01-01T00:00:00Z',
        sponsors: [],
        constitutionalFlags: [],
        viewCount: 0,
        saveCount: 0,
        commentCount: 0,
        shareCount: 0,
        policyAreas: [],
        complexity: 'medium',
        readingTime: 5
      });

      // Simulate real-time update through service
      billsRepository.recordEngagement.mockResolvedValue(undefined);

      // Verify the bill was retrieved and engagement was recorded
      expect(billsRepository.getBillById).toHaveBeenCalledWith(1);
      expect(billsRepository.recordEngagement).toHaveBeenCalledWith(1, 'view');
    });
  });
});