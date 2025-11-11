/**
 * Bills Repository Unit Tests
 *
 * Tests the BillsRepository class methods with mocked API responses.
 * Focuses on bill CRUD operations, search, engagement tracking, and WebSocket integration.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { BillsRepository } from '../bills';
import { UnifiedApiClientImpl } from '../../core/api/client';
import { Bill, PaginatedResponse, Comment, EngagementType } from '../../core/api/types';

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

// Mock WebSocket service
jest.mock('../../services/webSocketService', () => ({
  getWebSocketService: jest.fn(() => ({
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
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

describe('BillsRepository', () => {
  let repository: BillsRepository;
  let mockApiClient: jest.Mocked<UnifiedApiClientImpl>;
  let mockWebSocketService: any;

  const mockConfig = {
    baseEndpoint: '/api',
    cacheTTL: {
      bills: 300000,
      search: 120000,
      engagement: 30000
    },
    pagination: {
      defaultLimit: 12,
      maxLimit: 100
    }
  };

  const mockBill: Bill = {
    id: 123,
    billNumber: 'HB-123',
    title: 'Test Bill Title',
    summary: 'A test bill for testing purposes',
    status: 'introduced',
    urgencyLevel: 'medium',
    introducedDate: '2024-01-01',
    lastUpdated: '2024-01-01T00:00:00Z',
    sponsors: [
      {
        id: 1,
        name: 'Test Sponsor',
        party: 'Independent',
        position: 'Representative'
      }
    ],
    constitutionalFlags: [],
    viewCount: 150,
    saveCount: 25,
    commentCount: 10,
    shareCount: 5,
    policyAreas: ['Environment', 'Health'],
    complexity: 'medium',
    readingTime: 15
  };

  const mockPaginatedResponse: PaginatedResponse<Bill> = {
    data: [mockBill],
    pagination: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    }
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

    // Create mock WebSocket service
    mockWebSocketService = {
      on: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };

    (UnifiedApiClientImpl as jest.Mock).mockImplementation(() => mockApiClient);

    repository = new BillsRepository(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBills', () => {
    it('should get paginated bills with default parameters', async () => {
      const mockResponse = {
        data: mockPaginatedResponse,
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

      const result = await repository.getBills();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills?status=&urgency=&policyAreas=&sponsors=&sortBy=date&sortOrder=desc&page=1&limit=12',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should get bills with custom parameters', async () => {
      const params = {
        status: ['introduced', 'committee'],
        urgency: ['high'],
        page: 2,
        limit: 20
      };

      const mockResponse = {
        data: mockPaginatedResponse,
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

      const result = await repository.getBills(params);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills?status=introduced%2Ccommittee&urgency=high&page=2&limit=20',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('searchBills', () => {
    it('should search bills with query', async () => {
      const searchParams = {
        query: 'environment',
        status: ['introduced'],
        page: 1,
        limit: 10
      };

      const mockResponse = {
        data: mockPaginatedResponse,
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

      const result = await repository.searchBills(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/search?query=environment&status=introduced&page=1&limit=10',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.search }
        })
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getBillById', () => {
    it('should get bill by ID and subscribe to updates', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockBill,
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

      const result = await repository.getBillById(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockBill);
    });
  });

  describe('recordEngagement', () => {
    it('should record engagement successfully', async () => {
      const billId = 123;
      const type: EngagementType = 'view';

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

      await repository.recordEngagement(billId, type);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/bills/123/engagement',
        { type },
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.engagement }
        })
      );
    });

    it('should handle engagement recording failure silently', async () => {
      const billId = 123;
      const type: EngagementType = 'view';

      mockApiClient.post.mockRejectedValue(new Error('API error'));

      // Should not throw error
      await expect(repository.recordEngagement(billId, type)).resolves.toBeUndefined();
    });
  });

  describe('getBillComments', () => {
    const mockComments: PaginatedResponse<Comment> = {
      data: [
        {
          id: 1,
          billId: 123,
          userId: 456,
          content: 'Test comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          author: {
            id: 456,
            username: 'testuser',
            email: 'test@example.com',
            displayName: 'Test User',
            verified: true,
            reputation: 100,
            joinedAt: '2024-01-01T00:00:00Z'
          },
          replies: [],
          voteCount: 5,
          userVote: null,
          moderated: false
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }
    };

    it('should get bill comments with default parameters', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockComments,
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

      const result = await repository.getBillComments(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/comments?page=1&limit=20',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockComments);
    });

    it('should get bill comments with custom parameters', async () => {
      const billId = 123;
      const page = 2;
      const limit = 50;

      const mockResponse = {
        data: mockComments,
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

      const result = await repository.getBillComments(billId, page, limit);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/comments?page=2&limit=50',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockComments);
    });

    it('should enforce max limit', async () => {
      const billId = 123;
      const limit = 150; // Exceeds maxLimit

      const mockResponse = {
        data: mockComments,
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

      await repository.getBillComments(billId, 1, limit);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/comments?page=1&limit=100',
        expect.any(Object)
      );
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      const commentData = {
        billId: 123,
        content: 'This is a test comment',
        parentId: undefined
      };

      const mockComment: Comment = {
        id: 1,
        billId: 123,
        userId: 456,
        content: commentData.content,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        author: {
          id: 456,
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          verified: true,
          reputation: 100,
          joinedAt: '2024-01-01T00:00:00Z'
        },
        replies: [],
        voteCount: 0,
        userVote: null,
        moderated: false
      };

      const mockResponse = {
        data: mockComment,
        status: 201,
        statusText: 'Created',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.addComment(commentData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/bills/123/comments', {
        content: commentData.content,
        parentId: commentData.parentId
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 1;
      const content = 'Updated comment content';

      const mockUpdatedComment: Comment = {
        id: commentId,
        billId: 123,
        userId: 456,
        content,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        author: {
          id: 456,
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          verified: true,
          reputation: 100,
          joinedAt: '2024-01-01T00:00:00Z'
        },
        replies: [],
        voteCount: 0,
        userVote: null,
        moderated: false
      };

      const mockResponse = {
        data: mockUpdatedComment,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const result = await repository.updateComment(commentId, content);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/comments/1', { content });
      expect(result).toEqual(mockUpdatedComment);
    });
  });

  describe('voteComment', () => {
    it('should vote on comment successfully', async () => {
      const commentId = 1;
      const vote = 'up';

      const mockResponse = {
        data: { id: commentId, voteCount: 6 },
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

      const result = await repository.voteComment(commentId, vote as 'up' | 'down');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/comments/1/vote', { vote });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('reportComment', () => {
    it('should report comment successfully', async () => {
      const commentId = 1;
      const reason = 'spam';

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

      await repository.reportComment(commentId, reason);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/comments/1/report', { reason });
    });
  });

  describe('getCategories', () => {
    it('should get bill categories', async () => {
      const mockCategories = ['Environment', 'Health', 'Education', 'Economy'];

      const mockResponse = {
        data: mockCategories,
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

      const result = await repository.getCategories();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/categories',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getStatuses', () => {
    it('should get bill statuses', async () => {
      const mockStatuses = ['introduced', 'committee', 'passed', 'failed'];

      const mockResponse = {
        data: mockStatuses,
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

      const result = await repository.getStatuses();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/statuses',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.bills }
        })
      );
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('WebSocket Integration', () => {
    it('should initialize WebSocket integration on construction', () => {
      // WebSocket service should be initialized in constructor
      expect(mockWebSocketService.on).toHaveBeenCalledWith('billUpdate', expect.any(Function));
      expect(mockWebSocketService.on).toHaveBeenCalledWith('billEngagement', expect.any(Function));
    });

    it('should subscribe to bill updates when getting bill by ID', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockBill,
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

      await repository.getBillById(billId);

      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('bill:123', ['status_change', 'new_comment', 'engagement_update']);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(repository.getBillById(123)).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Request timeout'));

      const commentData = {
        billId: 123,
        content: 'Test comment'
      };

      await expect(repository.addComment(commentData)).rejects.toThrow('Request timeout');
    });
  });

  describe('Query Parameter Building', () => {
    it('should build query parameters correctly', () => {
      const params = {
        status: ['introduced', 'committee'],
        urgency: ['high'],
        policyAreas: ['Environment'],
        page: 2,
        limit: 20
      };

      // Access private method through type assertion
      const repositoryAny = repository as any;
      const queryParams = repositoryAny.buildQueryParams(params);

      expect(queryParams.toString()).toBe('status=introduced%2Ccommittee&urgency=high&policyAreas=Environment&page=2&limit=20');
    });

    it('should handle empty parameters', () => {
      const params = {};

      const repositoryAny = repository as any;
      const queryParams = repositoryAny.buildQueryParams(params);

      expect(queryParams.toString()).toBe('');
    });
  });
});