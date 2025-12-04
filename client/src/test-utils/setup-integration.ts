/**
 * Integration Testing Setup for Chanuka Client UI
 * 
 * This file configures the test environment for integration tests
 * that test complete user workflows and API interactions
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import * as React from 'react';
import { expect, afterEach, beforeAll, afterAll, vi, beforeEach } from 'vitest';

// Ensure React is available globally
global.React = React;

// Type declarations for global test utilities
declare global {
  var integrationTestUtils: {
    mockApiError: (endpoint: string, status?: number, message?: string) => void;
    mockAuthenticatedUser: (user?: any) => any;
    mockUnauthenticatedUser: () => void;
    waitForApiCalls: (timeout?: number) => Promise<boolean>;
    simulateSlowNetwork: () => void;
    simulateOfflineMode: () => void;
    resetNetworkConditions: () => void;
  };
  var WebSocket: any;
}

// =============================================================================
// MOCK SERVICE WORKER SETUP
// =============================================================================

// Create MSW server for API mocking in integration tests
export const server = setupServer(
  // Bills API endpoints
  http.get('/api/bills', ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '10';
    
    return HttpResponse.json({
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
    });
  }),

  http.get('/api/bills/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
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
    });
  }),

  // Search API endpoint
  http.get('/api/search/bills', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    return HttpResponse.json({
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
    });
  }),

  // User authentication endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
      },
      token: 'mock-jwt-token',
    });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json({
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verification_status: 'verified',
    });
  }),

  // Community endpoints
  http.get('/api/bills/:id/comments', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
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
    });
  }),

  // Analytics endpoints
  http.get('/api/analytics/engagement', () => {
    return HttpResponse.json({
      totalParticipants: 1250,
      activeDiscussions: 23,
      expertContributions: 8,
      communityApproval: 72,
      sentimentScore: 0.65,
      trendingScore: 8.2,
    });
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
      http.all(endpoint, () => {
        return HttpResponse.json({ error: message }, { status });
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
      http.get('/api/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    return mockUser;
  },

  // Mock unauthenticated state
  mockUnauthenticatedUser: () => {
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      http.all('*', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return HttpResponse.json({});
      })
    );
  },

  simulateOfflineMode: () => {
    server.use(
      http.all('*', () => {
        return HttpResponse.error();
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
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    send = vi.fn();
    close = vi.fn();
    readyState = MockWebSocket.OPEN;

    // Helper methods for testing
    simulateMessage(data: any) {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'message')
        .forEach(([, handler]: [string, Function]) => handler(event));
    }
    
    simulateOpen() {
      const event = new Event('open');
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'open')
        .forEach(([, handler]: [string, Function]) => handler(event));
    }
    
    simulateClose() {
      this.readyState = MockWebSocket.CLOSED;
      const event = new CloseEvent('close');
      this.addEventListener.mock.calls
        .filter(([type]: [string]) => type === 'close')
        .forEach(([, handler]: [string, Function]) => handler(event));
    }
  }

  global.WebSocket = MockWebSocket as any;

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