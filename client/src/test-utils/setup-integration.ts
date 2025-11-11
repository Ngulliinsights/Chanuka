/**
 * Integration Testing Setup for Chanuka Client UI
 * 
 * This file configures the test environment for integration tests
 * that test complete user workflows and API interactions
 */

import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import * as React from 'react';

// Ensure React is available globally
global.React = React;

// =============================================================================
// MOCK SERVICE WORKER SETUP
// =============================================================================

// Create MSW server for API mocking in integration tests
export const server = setupServer(
  // Bills API endpoints
  rest.get('/api/bills', (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';
    
    return res(
      ctx.json({
        data: Array.from({ length: parseInt(limit) }, (_, i) => ({
          id: `bill-${parseInt(page) * 10 + i}`,
          title: `Test Bill ${parseInt(page) * 10 + i}`,
          summary: 'A test bill for integration testing',
          status: 'active',
          category: 'healthcare',
          sponsor: 'Test Sponsor',
          introduced_date: new Date().toISOString(),
          last_action_date: new Date().toISOString(),
          votes: { yes: 45, no: 30, abstain: 5 },
          tags: ['test', 'integration'],
          urgency_level: 'medium',
          constitutional_flags: [],
          engagement_metrics: {
            views: 100,
            saves: 10,
            comments: 5,
            shares: 2,
          },
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 100,
          totalPages: 10,
        },
      })
    );
  }),

  rest.get('/api/bills/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        title: `Test Bill ${id}`,
        summary: 'Detailed test bill for integration testing',
        fullText: 'This is the full text of the test bill...',
        status: 'active',
        category: 'healthcare',
        sponsor: 'Test Sponsor',
        introduced_date: new Date().toISOString(),
        last_action_date: new Date().toISOString(),
        votes: { yes: 45, no: 30, abstain: 5 },
        tags: ['test', 'integration'],
        urgency_level: 'medium',
        constitutional_flags: [],
        engagement_metrics: {
          views: 100,
          saves: 10,
          comments: 5,
          shares: 2,
        },
        analysis: {
          constitutional_analysis: 'No constitutional concerns identified',
          expert_opinions: [],
          community_sentiment: 0.7,
        },
      })
    );
  }),

  // Search API endpoint
  rest.get('/api/search/bills', (req, res, ctx) => {
    const query = req.url.searchParams.get('q') || '';
    return res(
      ctx.json({
        results: [
          {
            id: 'search-result-1',
            title: `Search Result for "${query}"`,
            summary: 'A bill that matches your search query',
            status: 'active',
            relevance: 0.95,
            highlights: {
              title: [`Search Result for "<mark>${query}</mark>"`],
              summary: [`A bill that matches your <mark>${query}</mark> query`],
            },
          },
        ],
        total: 1,
        query,
      })
    );
  }),

  // User authentication endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        user: {
          id: 'test-user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'citizen',
        },
        token: 'mock-jwt-token',
      })
    );
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    return res(
      ctx.json({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verification_status: 'verified',
      })
    );
  }),

  // Community endpoints
  rest.get('/api/bills/:id/comments', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        comments: [
          {
            id: 'comment-1',
            content: 'This is a test comment',
            author: {
              id: 'user-1',
              name: 'Test User',
              role: 'citizen',
            },
            created_at: new Date().toISOString(),
            votes: { up: 5, down: 1 },
            replies: [],
          },
        ],
        total: 1,
      })
    );
  }),

  // Analytics endpoints
  rest.get('/api/analytics/engagement', (req, res, ctx) => {
    return res(
      ctx.json({
        totalParticipants: 1250,
        activeDiscussions: 23,
        expertContributions: 8,
        communityApproval: 72,
        sentimentScore: 0.65,
        trendingScore: 8.2,
      })
    );
  }),
);

// =============================================================================
// GLOBAL TEST SETUP
// =============================================================================

beforeAll(() => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' });
  
  // Mock console methods to reduce noise
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  // Clean up MSW server
  server.close();
});

afterEach(() => {
  // Reset MSW handlers after each test
  server.resetHandlers();
  
  // Clean up React Testing Library
  cleanup();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// =============================================================================
// INTEGRATION TEST UTILITIES
// =============================================================================

// Global integration test utilities
global.integrationTestUtils = {
  // Mock API delay
  addApiDelay: (delay: number = 100) => {
    server.use(
      rest.all('*', (req, res, ctx) => {
        return res(ctx.delay(delay));
      })
    );
  },

  // Mock API error
  mockApiError: (endpoint: string, status: number = 500, message: string = 'Server Error') => {
    server.use(
      rest.all(endpoint, (req, res, ctx) => {
        return res(ctx.status(status), ctx.json({ error: message }));
      })
    );
  },

  // Mock authentication state
  mockAuthenticatedUser: (user = {}) => {
    const mockUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      ...user,
    };

    server.use(
      rest.get('/api/auth/me', (req, res, ctx) => {
        return res(ctx.json(mockUser));
      })
    );

    return mockUser;
  },

  // Mock unauthenticated state
  mockUnauthenticatedUser: () => {
    server.use(
      rest.get('/api/auth/me', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
      })
    );
  },

  // Wait for API calls to complete
  waitForApiCalls: async (timeout: number = 5000) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        // In a real implementation, you'd check for pending requests
        // For now, we'll just wait a short time
        if (Date.now() - startTime > 100) {
          clearInterval(checkInterval);
          resolve(true);
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 10);
    });
  },

  // Simulate network conditions
  simulateSlowNetwork: () => {
    server.use(
      rest.all('*', (req, res, ctx) => {
        return res(ctx.delay(2000)); // 2 second delay
      })
    );
  },

  simulateOfflineMode: () => {
    server.use(
      rest.all('*', (req, res, ctx) => {
        return res.networkError('Network connection failed');
      })
    );
  },

  // Reset to normal network conditions
  resetNetworkConditions: () => {
    server.resetHandlers();
  },
};

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Set integration test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:3001/api';
process.env.INTEGRATION_TEST = 'true';

// Enhanced jsdom configuration for integration tests
if (typeof window !== 'undefined') {
  // Mock WebSocket for real-time features
  global.WebSocket = vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: WebSocket.OPEN,
    
    // Helper methods for testing
    simulateMessage: function(data: any) {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'message')
        .forEach(([, handler]: [string, Function]) => handler(event));
    },
    
    simulateOpen: function() {
      const event = new Event('open');
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'open')
        .forEach(([, handler]: [string, Function]) => handler(event));
    },
    
    simulateClose: function() {
      this.readyState = WebSocket.CLOSED;
      const event = new CloseEvent('close');
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'close')
        .forEach(([, handler]: [string, Function]) => handler(event));
    },
  }));

  // Mock performance API for Core Web Vitals testing
  Object.defineProperty(window, 'performance', {
    value: {
      ...window.performance,
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn((type: string) => {
        if (type === 'navigation') {
          return [{
            domContentLoadedEventEnd: 1000,
            domContentLoadedEventStart: 800,
            loadEventEnd: 1200,
            loadEventStart: 1100,
            responseStart: 200,
            requestStart: 100,
          }];
        }
        return [];
      }),
      now: vi.fn(() => Date.now()),
    },
    writable: true,
  });
}