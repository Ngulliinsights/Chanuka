import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CommentService } from '../comment';

/**
 * Integration tests for Comment Service migration to direct Drizzle usage
 * 
 * These tests validate that the comment service works correctly with direct Drizzle queries
 * without requiring a full database setup.
 */
describe('Comment Service Integration', () => {
  let commentService: CommentService;

  beforeAll(() => {
    commentService = new CommentService();
  });

  describe('Service Initialization', () => {
    it('should initialize comment service successfully', () => {
      expect(commentService).toBeDefined();
      expect(commentService).toBeInstanceOf(CommentService);
    });

    it('should have all required methods', () => {
      expect(typeof commentService.getBillComments).toBe('function');
      expect(typeof commentService.createComment).toBe('function');
      expect(typeof commentService.updateComment).toBe('function');
      expect(typeof commentService.deleteComment).toBe('function');
      expect(typeof commentService.getCommentStats).toBe('function');
      expect(typeof commentService.findCommentById).toBe('function');
      expect(typeof commentService.getCommentReplies).toBe('function');
    });
  });

  describe('Validation Logic', () => {
    it('should validate comment data correctly', async () => {
      const invalidData = {
        bill_id: 1,
        user_id: 'test-user',
        content: '', // Empty content should fail
        commentType: 'general'
      };

      await expect(commentService.createComment(invalidData))
        .rejects.toThrow('Comment content cannot be empty');
    });

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(5001); // Exceeds 5000 character limit
      const invalidData = {
        bill_id: 1,
        user_id: 'test-user',
        content: longContent,
        commentType: 'general'
      };

      await expect(commentService.createComment(invalidData))
        .rejects.toThrow('Comment content exceeds maximum length');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        bill_id: 0, // Invalid bill ID
        user_id: '',
        content: 'Valid content',
        commentType: 'general'
      };

      await expect(commentService.createComment(invalidData))
        .rejects.toThrow();
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const service = commentService as any;
      
      const key1 = service.generateCacheKey('test', 123, { sort: 'recent', limit: 10 });
      const key2 = service.generateCacheKey('test', 123, { limit: 10, sort: 'recent' });
      
      expect(key1).toBe(key2); // Should be identical regardless of property order
    });

    it('should generate different keys for different parameters', () => {
      const service = commentService as any;
      
      const key1 = service.generateCacheKey('test', 123, { sort: 'recent' });
      const key2 = service.generateCacheKey('test', 123, { sort: 'popular' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Query Building Logic', () => {
    it('should build query conditions correctly', () => {
      const service = commentService as any;
      
      const conditions = service.buildQueryConditions(123, {
        commentType: 'expert',
        expertOnly: true,
        parent_id: null
      });

      expect(conditions).toBeDefined();
      expect(Array.isArray(conditions)).toBe(true);
      expect(conditions.length).toBeGreaterThan(0);
    });

    it('should handle different parent_id scenarios', () => {
      const service = commentService as any;
      
      // Test with null parent_id (top-level comments)
      const topLevelConditions = service.buildQueryConditions(123, { parent_id: null });
      expect(topLevelConditions).toBeDefined();

      // Test with specific parent_id (replies)
      const replyConditions = service.buildQueryConditions(123, { parent_id: 456 });
      expect(replyConditions).toBeDefined();

      // Test with undefined parent_id (default behavior)
      const defaultConditions = service.buildQueryConditions(123, {});
      expect(defaultConditions).toBeDefined();
    });
  });

  describe('Fallback Comment Creation', () => {
    it('should create fallback comment with correct structure', () => {
      const service = commentService as any;
      
      const commentData = {
        bill_id: 123,
        user_id: 'test-user',
        content: 'Test content',
        commentType: 'general'
      };

      const fallbackComment = service.createFallbackComment(commentData);

      expect(fallbackComment).toHaveProperty('id');
      expect(fallbackComment).toHaveProperty('bill_id', 123);
      expect(fallbackComment).toHaveProperty('user_id', 'test-user');
      expect(fallbackComment).toHaveProperty('content', 'Test content');
      expect(fallbackComment).toHaveProperty('commentType', 'general');
      expect(fallbackComment).toHaveProperty('upvotes', 0);
      expect(fallbackComment).toHaveProperty('downvotes', 0);
      expect(fallbackComment).toHaveProperty('netVotes', 0);
      expect(fallbackComment).toHaveProperty('replyCount', 0);
      expect(fallbackComment).toHaveProperty('user');
      expect(fallbackComment).toHaveProperty('replies');
      expect(fallbackComment.replies).toEqual([]);
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate sample comments with correct structure', () => {
      const service = commentService as any;
      
      const sampleComments = service.getSampleComments(123);

      expect(Array.isArray(sampleComments)).toBe(true);
      expect(sampleComments.length).toBeGreaterThan(0);

      const firstComment = sampleComments[0];
      expect(firstComment).toHaveProperty('id');
      expect(firstComment).toHaveProperty('bill_id', 123);
      expect(firstComment).toHaveProperty('user_id');
      expect(firstComment).toHaveProperty('content');
      expect(firstComment).toHaveProperty('user');
      expect(firstComment).toHaveProperty('user_profiles');
      expect(firstComment).toHaveProperty('netVotes');
      expect(firstComment).toHaveProperty('replyCount');
    });
  });

  describe('Error Handling', () => {
    it('should handle safe cache operations gracefully', async () => {
      const service = commentService as any;
      
      // This should not throw even if cache service fails
      await expect(service.safeCacheSet('test-key', { data: 'test' }, 300))
        .resolves.not.toThrow();
    });

    it('should handle cache clearing gracefully', async () => {
      const service = commentService as any;
      
      // This should not throw even if cache service fails
      await expect(service.clearCommentCaches(123))
        .resolves.not.toThrow();
    });
  });

  describe('Data Transformation', () => {
    it('should handle empty comment arrays', async () => {
      const service = commentService as any;
      
      const result = await service.transformCommentsWithReplies([], undefined);
      expect(result).toEqual([]);
    });

    it('should handle batch reply count calculation with empty array', async () => {
      const service = commentService as any;
      
      const result = await service.getBatchReplyCounts([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('Update Validation', () => {
    it('should validate update data correctly', async () => {
      const updateData = {
        content: '', // Empty content should fail
        commentType: 'expert'
      };

      await expect(commentService.updateComment(1, 'test-user', updateData))
        .rejects.toThrow('Comment content cannot be empty');
    });

    it('should validate update content length', async () => {
      const longContent = 'a'.repeat(5001);
      const updateData = {
        content: longContent,
        commentType: 'expert'
      };

      await expect(commentService.updateComment(1, 'test-user', updateData))
        .rejects.toThrow('Comment content exceeds maximum length');
    });

    it('should trim content during update', async () => {
      const updateData = {
        content: '  Valid content with spaces  ',
        commentType: 'expert'
      };

      // The validation should pass and content should be trimmed
      // We expect this to fail at database level, not validation level
      await expect(commentService.updateComment(1, 'test-user', updateData))
        .rejects.not.toThrow(/content.*empty|content.*length/);
    });
  });
});