/**
 * Community Repository Unit Tests
 *
 * Tests the CommunityRepository class methods with mocked API responses.
 * Focuses on comments, discussions, and community engagement features.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { CommunityRepository } from '../community';
import { UnifiedApiClientImpl } from '../../core/api/client';
import { Comment, DiscussionThread, User } from '../../core/api/types';

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

describe('CommunityRepository', () => {
  let repository: CommunityRepository;
  let mockApiClient: jest.Mocked<UnifiedApiClientImpl>;
  let mockWebSocketService: any;

  const mockConfig = {
    baseEndpoint: '/api',
    cacheTTL: {
      comments: 120000,
      discussions: 300000,
      engagement: 600000
    },
    pagination: {
      defaultLimit: 20,
      maxLimit: 100
    },
    moderation: {
      enablePreModeration: false,
      autoHideThreshold: -5
    }
  };

  const mockComment: Comment = {
    id: 1,
    billId: 123,
    userId: 456,
    content: 'This is a test comment',
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
  };

  const mockDiscussionThread: DiscussionThread = {
    id: 1,
    billId: 123,
    title: 'Test Discussion',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    participantCount: 5,
    messageCount: 12,
    lastActivity: '2024-01-01T02:00:00Z',
    pinned: false,
    locked: false
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

    repository = new CommunityRepository(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDiscussionThread', () => {
    it('should get discussion thread for a bill', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockDiscussionThread,
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

      const result = await repository.getDiscussionThread(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/discussion',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.discussions }
        })
      );
      expect(result).toEqual(mockDiscussionThread);
    });
  });

  describe('getComments', () => {
    const mockCommentsResponse = {
      comments: [mockComment],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        hasNext: false,
        hasPrevious: false
      }
    };

    it('should get comments with default parameters', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockCommentsResponse,
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

      const result = await repository.getComments(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/comments?page=1&limit=20',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.comments }
        })
      );
      expect(result).toEqual(mockCommentsResponse);
    });

    it('should get comments with custom parameters', async () => {
      const billId = 123;
      const params = {
        page: 2,
        limit: 50,
        sort: 'most_voted' as const,
        expertOnly: true,
        parentId: 5
      };

      const mockResponse = {
        data: mockCommentsResponse,
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

      const result = await repository.getComments(billId, params);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/comments?page=2&limit=50&sort=most_voted&expert_only=true&parent_id=5',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.comments }
        })
      );
      expect(result).toEqual(mockCommentsResponse);
    });

    it('should enforce max limit', async () => {
      const billId = 123;
      const params = {
        limit: 150 // Exceeds maxLimit
      };

      const mockResponse = {
        data: mockCommentsResponse,
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

      await repository.getComments(billId, params);

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
        parentId: 5
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
        parent_id: commentData.parentId
      });
      expect(result).toEqual(mockComment);
    });

    it('should add root comment without parent ID', async () => {
      const commentData = {
        billId: 123,
        content: 'This is a root comment'
      };

      const mockResponse = {
        data: { ...mockComment, parentId: undefined },
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
        parent_id: undefined
      });
      expect(result.parentId).toBeUndefined();
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 1;
      const content = 'Updated comment content';

      const updatedComment = { ...mockComment, content, updatedAt: '2024-01-02T00:00:00Z' };

      const mockResponse = {
        data: updatedComment,
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
      expect(result).toEqual(updatedComment);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const commentId = 1;

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

      await repository.deleteComment(commentId);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/comments/1');
    });
  });

  describe('voteComment', () => {
    it('should vote on comment successfully', async () => {
      const commentId = 1;
      const vote = 'up';

      const votedComment = { ...mockComment, voteCount: 6, userVote: 'up' };

      const mockResponse = {
        data: votedComment,
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
      expect(result).toEqual(votedComment);
    });
  });

  describe('reportComment', () => {
    it('should report comment successfully', async () => {
      const commentId = 1;
      const reason = 'spam';
      const details = 'This comment contains spam content';

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

      await repository.reportComment(commentId, reason, details);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/comments/1/report', {
        reason,
        details
      });
    });

    it('should report comment without details', async () => {
      const commentId = 1;
      const reason = 'inappropriate';

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

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/comments/1/report', {
        reason
      });
    });
  });

  describe('getCommentReplies', () => {
    const mockRepliesResponse = {
      replies: [
        { ...mockComment, id: 2, parentId: 1, content: 'This is a reply' }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        hasNext: false
      }
    };

    it('should get comment replies with default parameters', async () => {
      const commentId = 1;

      const mockResponse = {
        data: mockRepliesResponse,
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

      const result = await repository.getCommentReplies(commentId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/comments/1/replies?page=1&limit=20',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.comments }
        })
      );
      expect(result).toEqual(mockRepliesResponse);
    });

    it('should get comment replies with custom parameters', async () => {
      const commentId = 1;
      const page = 2;
      const limit = 10;

      const mockResponse = {
        data: mockRepliesResponse,
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

      const result = await repository.getCommentReplies(commentId, page, limit);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/comments/1/replies?page=2&limit=10',
        expect.any(Object)
      );
      expect(result).toEqual(mockRepliesResponse);
    });
  });

  describe('createDiscussionThread', () => {
    it('should create discussion thread successfully', async () => {
      const billId = 123;
      const title = 'New Discussion Thread';
      const content = 'This is the initial message';

      const mockResponse = {
        data: mockDiscussionThread,
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

      const result = await repository.createDiscussionThread(billId, title, content);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/bills/123/discussions', {
        title,
        content
      });
      expect(result).toEqual(mockDiscussionThread);
    });
  });

  describe('getDiscussionThreads', () => {
    const mockThreadsResponse = {
      threads: [mockDiscussionThread],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        hasNext: false
      }
    };

    it('should get discussion threads with default parameters', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockThreadsResponse,
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

      const result = await repository.getDiscussionThreads(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/discussions?page=1&limit=10',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.discussions }
        })
      );
      expect(result).toEqual(mockThreadsResponse);
    });
  });

  describe('addDiscussionMessage', () => {
    it('should add discussion message successfully', async () => {
      const threadId = 1;
      const content = 'This is a new message in the discussion';

      const mockMessage = {
        id: 1,
        threadId,
        content,
        author: mockComment.author,
        createdAt: '2024-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: mockMessage,
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

      const result = await repository.addDiscussionMessage(threadId, content);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/discussions/1/messages', {
        content
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getEngagementStats', () => {
    const mockStats = {
      total_comments: 25,
      total_discussions: 3,
      active_participants: 18,
      expert_contributions: 7,
      controversial_comments: 2,
      last_activity: '2024-01-01T02:00:00Z'
    };

    it('should get engagement statistics', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockStats,
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

      const result = await repository.getEngagementStats(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/community/stats',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.engagement }
        })
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('getTopContributors', () => {
    const mockContributors = {
      contributors: [
        {
          user: mockComment.author,
          comment_count: 15,
          vote_count: 45,
          reputation: 150
        }
      ]
    };

    it('should get top contributors with default limit', async () => {
      const billId = 123;

      const mockResponse = {
        data: mockContributors,
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

      const result = await repository.getTopContributors(billId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/contributors?limit=10',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.engagement }
        })
      );
      expect(result).toEqual(mockContributors);
    });

    it('should get top contributors with custom limit', async () => {
      const billId = 123;
      const limit = 25;

      const mockResponse = {
        data: mockContributors,
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

      const result = await repository.getTopContributors(billId, limit);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/bills/123/contributors?limit=25',
        expect.any(Object)
      );
      expect(result).toEqual(mockContributors);
    });
  });

  describe('WebSocket Integration', () => {
    it('should initialize WebSocket integration on construction', () => {
      // WebSocket service should be initialized in constructor
      expect(mockWebSocketService.on).toHaveBeenCalledWith('commentUpdate', expect.any(Function));
      expect(mockWebSocketService.on).toHaveBeenCalledWith('discussionUpdate', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const commentData = {
        billId: 123,
        content: 'Test comment'
      };

      await expect(repository.addComment(commentData)).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Request timeout'));

      await expect(repository.getDiscussionThread(123)).rejects.toThrow('Request timeout');
    });
  });
});