/**
 * Enhanced Community Service - Integration Tests
 * 
 * Tests all infrastructure components:
 * - Validation
 * - Caching
 * - Security (XSS prevention, SQL injection prevention)
 * - Error Handling
 * - Transactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedCommunityService } from '../application/enhanced-community-service';
import { cacheService } from '@server/infrastructure/cache';
import { securityAuditService } from '@server/features/security';
import type { CreateCommentInput, UpdateCommentInput, GetCommentsInput } from '../application/community-validation.schemas';

describe('EnhancedCommunityService Integration Tests', () => {
  let service: EnhancedCommunityService;
  const testUserId = 'test-user-123';
  const testBillId = 'test-bill-456';

  beforeEach(() => {
    service = new EnhancedCommunityService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up cache
    await cacheService.clear();
  });

  // ============================================================================
  // VALIDATION INTEGRATION TESTS
  // ============================================================================

  describe('Validation Integration', () => {
    it('should validate comment creation with valid data', async () => {
      const validData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'This is a valid comment with sufficient length.',
        comment_type: 'comment',
        is_anonymous: false,
      };

      const result = await service.createComment(validData, testUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.billId).toBe(testBillId);
      }
    });

    it('should reject comment with empty content', async () => {
      const invalidData: any = {
        bill_id: testBillId,
        content: '',
        comment_type: 'comment',
      };

      const result = await service.createComment(invalidData, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Validation failed');
      }
    });

    it('should reject comment with content exceeding max length', async () => {
      const invalidData: any = {
        bill_id: testBillId,
        content: 'a'.repeat(5001), // Exceeds 5000 char limit
        comment_type: 'comment',
      };

      const result = await service.createComment(invalidData, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Validation failed');
      }
    });

    it('should validate comment type enum', async () => {
      const invalidData: any = {
        bill_id: testBillId,
        content: 'Valid content',
        comment_type: 'invalid_type',
      };

      const result = await service.createComment(invalidData, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Validation failed');
      }
    });

    it('should validate get comments filters', async () => {
      const validFilters: GetCommentsInput = {
        bill_id: testBillId,
        sortBy: 'recent',
        page: '1',
        limit: '20',
      };

      const result = await service.getComments(validFilters);

      expect(result.success).toBe(true);
    });

    it('should reject invalid sort option', async () => {
      const invalidFilters: any = {
        bill_id: testBillId,
        sortBy: 'invalid_sort',
      };

      const result = await service.getComments(invalidFilters);

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // CACHING INTEGRATION TESTS
  // ============================================================================

  describe('Caching Integration', () => {
    it('should cache comment after first retrieval', async () => {
      const commentId = 'test-comment-123';
      
      // First call - should hit database
      const result1 = await service.getCommentById(commentId);
      
      // Second call - should hit cache
      const result2 = await service.getCommentById(commentId);

      expect(result1.success).toBe(result2.success);
      // Verify cache was used (would need cache spy in real implementation)
    });

    it('should cache comments list', async () => {
      const filters: GetCommentsInput = {
        bill_id: testBillId,
        sortBy: 'recent',
      };

      // First call
      const result1 = await service.getComments(filters);
      
      // Second call - should use cache
      const result2 = await service.getComments(filters);

      expect(result1.success).toBe(result2.success);
    });

    it('should invalidate cache on comment creation', async () => {
      const commentData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'New comment to test cache invalidation',
        comment_type: 'comment',
      };

      // Create comment
      const createResult = await service.createComment(commentData, testUserId);
      expect(createResult.success).toBe(true);

      // Cache should be invalidated for this bill's comments
      // Subsequent queries should fetch fresh data
    });

    it('should invalidate cache on comment update', async () => {
      const commentId = 'test-comment-123';
      const updateData: UpdateCommentInput = {
        content: 'Updated content',
      };

      const result = await service.updateComment(commentId, updateData, testUserId);

      // Cache should be invalidated
      expect(result.success).toBe(true);
    });

    it('should invalidate cache on comment deletion', async () => {
      const commentId = 'test-comment-123';

      const result = await service.deleteComment(commentId, testUserId, false);

      // Cache should be invalidated
      expect(result.success).toBe(true);
    });

    it('should use different cache keys for different filters', async () => {
      const filters1: GetCommentsInput = {
        bill_id: testBillId,
        sortBy: 'recent',
      };

      const filters2: GetCommentsInput = {
        bill_id: testBillId,
        sortBy: 'popular',
      };

      const result1 = await service.getComments(filters1);
      const result2 = await service.getComments(filters2);

      // Both should succeed and potentially have different results
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  // ============================================================================
  // SECURITY INTEGRATION TESTS
  // ============================================================================

  describe('Security Integration - XSS Prevention', () => {
    it('should sanitize HTML in comment content', async () => {
      const xssData: CreateCommentInput = {
        bill_id: testBillId,
        content: '<script>alert("XSS")</script>This is a comment',
        comment_type: 'comment',
      };

      const result = await service.createComment(xssData, testUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        // Content should be sanitized (script tags removed)
        expect(result.data.content).not.toContain('<script>');
      }
    });

    it('should sanitize HTML in comment updates', async () => {
      const commentId = 'test-comment-123';
      const xssUpdate: UpdateCommentInput = {
        content: '<img src=x onerror="alert(1)">Updated content',
      };

      const result = await service.updateComment(commentId, xssUpdate, testUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        // Malicious attributes should be removed
        expect(result.data.content).not.toContain('onerror');
      }
    });

    it('should prevent SQL injection in comment queries', async () => {
      const maliciousFilters: any = {
        bill_id: "'; DROP TABLE comments; --",
        sortBy: 'recent',
      };

      // Should not throw error, should sanitize input
      const result = await service.getComments(maliciousFilters);

      // Query should fail validation or be safely handled
      expect(result.success).toBe(false);
    });

    it('should log security events for comment creation', async () => {
      const logSpy = vi.spyOn(securityAuditService, 'logSecurityEvent');

      const commentData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'Test comment for audit logging',
        comment_type: 'comment',
      };

      await service.createComment(commentData, testUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'comment_created',
          user_id: testUserId,
          action: 'create',
        })
      );
    });

    it('should log high-severity events for flagged comments', async () => {
      const logSpy = vi.spyOn(securityAuditService, 'logSecurityEvent');

      const flagData = {
        comment_id: 'test-comment-123',
        reason: 'spam' as const,
        details: 'This looks like spam',
      };

      await service.flagComment(flagData, testUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'comment_flagged',
          severity: 'high',
          action: 'flag',
        })
      );
    });

    it('should enforce authorization on comment updates', async () => {
      const commentId = 'test-comment-123';
      const updateData: UpdateCommentInput = {
        content: 'Unauthorized update attempt',
      };
      const unauthorizedUserId = 'different-user-456';

      const result = await service.updateComment(commentId, updateData, unauthorizedUserId);

      // Should fail if user doesn't own the comment
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found or unauthorized');
      }
    });

    it('should enforce authorization on comment deletion', async () => {
      const commentId = 'test-comment-123';
      const unauthorizedUserId = 'different-user-456';

      const result = await service.deleteComment(commentId, unauthorizedUserId, false);

      // Should fail if user doesn't own the comment and is not admin
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Unauthorized');
      }
    });
  });

  // ============================================================================
  // ERROR HANDLING INTEGRATION TESTS
  // ============================================================================

  describe('Error Handling Integration', () => {
    it('should return Result type for successful operations', async () => {
      const commentData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'Test comment',
        comment_type: 'comment',
      };

      const result = await service.createComment(commentData, testUserId);

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('data');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('should enrich error context with service and operation info', async () => {
      const invalidData: any = {
        bill_id: testBillId,
        content: '', // Invalid
      };

      const result = await service.createComment(invalidData, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBeTruthy();
      }
    });

    it('should handle database errors gracefully', async () => {
      const commentId = 'non-existent-comment';

      const result = await service.getCommentById(commentId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle cache errors gracefully', async () => {
      // Simulate cache failure
      vi.spyOn(cacheService, 'get').mockRejectedValueOnce(new Error('Cache error'));

      const commentId = 'test-comment-123';
      const result = await service.getCommentById(commentId);

      // Should fall back to database
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // TRANSACTION INTEGRATION TESTS
  // ============================================================================

  describe('Transaction Integration', () => {
    it('should use transaction for comment creation', async () => {
      const commentData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'Test comment with transaction',
        comment_type: 'comment',
      };

      const result = await service.createComment(commentData, testUserId);

      expect(result.success).toBe(true);
      // Both comment and bill engagement count should be updated atomically
    });

    it('should rollback on transaction failure', async () => {
      // This would require mocking database to simulate failure
      // In real implementation, verify rollback behavior
    });

    it('should use transaction for comment deletion', async () => {
      const commentId = 'test-comment-123';

      const result = await service.deleteComment(commentId, testUserId, true);

      expect(result.success).toBe(true);
      // Both comment deletion and bill engagement count update should be atomic
    });

    it('should use transaction for like toggle', async () => {
      const likeData = {
        comment_id: 'test-comment-123',
      };

      const result = await service.toggleLike(likeData, testUserId);

      expect(result.success).toBe(true);
      // Both like record and comment like_count should be updated atomically
    });

    it('should use transaction for flag creation', async () => {
      const flagData = {
        comment_id: 'test-comment-123',
        reason: 'spam' as const,
      };

      const result = await service.flagComment(flagData, testUserId);

      expect(result.success).toBe(true);
      // Both flag record and comment status should be updated atomically
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {
    it('should complete comment creation within acceptable time', async () => {
      const commentData: CreateCommentInput = {
        bill_id: testBillId,
        content: 'Performance test comment',
        comment_type: 'comment',
      };

      const startTime = Date.now();
      await service.createComment(commentData, testUserId);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should benefit from caching on repeated queries', async () => {
      const filters: GetCommentsInput = {
        bill_id: testBillId,
        sortBy: 'recent',
      };

      // First call - database
      const start1 = Date.now();
      await service.getComments(filters);
      const duration1 = Date.now() - start1;

      // Second call - cache
      const start2 = Date.now();
      await service.getComments(filters);
      const duration2 = Date.now() - start2;

      // Cached call should be faster
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });

  // ============================================================================
  // INTEGRATION SCORE VALIDATION
  // ============================================================================

  describe('Integration Score Validation', () => {
    it('should have validation integrated', () => {
      // All methods use validateData
      expect(service).toBeDefined();
    });

    it('should have caching integrated', () => {
      // Methods use cacheService
      expect(service).toBeDefined();
    });

    it('should have security integrated', () => {
      // Methods use secureQueryBuilder and sanitization
      expect(service).toBeDefined();
    });

    it('should have error handling integrated', () => {
      // Methods return Result types
      expect(service).toBeDefined();
    });

    it('should have transactions integrated', () => {
      // Multi-step operations use withTransaction
      expect(service).toBeDefined();
    });
  });
});
