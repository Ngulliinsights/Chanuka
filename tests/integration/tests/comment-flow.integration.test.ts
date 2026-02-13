/**
 * Comment Flow Integration Tests
 * Tests comment creation and retrieval flows
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';
import { users, bills, sponsors } from '../../../server/infrastructure/schema/foundation';
import { eq } from 'drizzle-orm';

describe('Feature: full-stack-integration - Comment Flow Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  describe('Comment Creation Flow (client→server→database)', () => {
    it('should create a comment on a bill', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const [user] = await db.insert(users).values({
        email: 'commenter@example.com',
        password_hash: '$2b$10$test',
        role: 'citizen',
        is_verified: true,
        is_active: true,
      }).returning();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Comment',
        chamber: 'senate',
        party: 'jubilee',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 10 of 2024',
        title: 'Comment Test Bill',
        summary: 'Testing comments',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-05'),
      }).returning();

      // Login as user
      await apiClient.setAuthToken('test-token'); // Mock auth for test

      // Create comment via API
      const commentData = {
        bill_id: bill.id,
        user_id: user.id,
        content: 'This is a test comment on the bill',
        parent_comment_id: null,
      };

      const response = await apiClient.createComment(commentData);

      // Verify API response
      expect(response.comment).toBeDefined();
      expect(response.comment.content).toBe(commentData.content);
      expect(response.comment.bill_id).toBe(bill.id);
      expect(response.comment.user_id).toBe(user.id);
    });

    it('should create nested comment (reply)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const [user] = await db.insert(users).values({
        email: 'replier@example.com',
        password_hash: '$2b$10$test',
        role: 'citizen',
        is_verified: true,
        is_active: true,
      }).returning();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Reply',
        chamber: 'national_assembly',
        party: 'odm',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 11 of 2024',
        title: 'Reply Test Bill',
        summary: 'Testing replies',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'national_assembly',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-06'),
      }).returning();

      // Create parent comment
      const parentCommentData = {
        bill_id: bill.id,
        user_id: user.id,
        content: 'Parent comment',
        parent_comment_id: null,
      };

      const parentResponse = await apiClient.createComment(parentCommentData);

      // Create reply
      const replyData = {
        bill_id: bill.id,
        user_id: user.id,
        content: 'Reply to parent comment',
        parent_comment_id: parentResponse.comment.id,
      };

      const replyResponse = await apiClient.createComment(replyData);

      expect(replyResponse.comment.parent_comment_id).toBe(parentResponse.comment.id);
      expect(replyResponse.comment.content).toBe(replyData.content);
    });
  });

  describe('Comment Retrieval Flow', () => {
    it('should retrieve all comments for a bill', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const [user] = await db.insert(users).values({
        email: 'viewer@example.com',
        password_hash: '$2b$10$test',
        role: 'citizen',
        is_verified: true,
        is_active: true,
      }).returning();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator View',
        chamber: 'senate',
        party: 'wiper',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 12 of 2024',
        title: 'View Comments Bill',
        summary: 'Testing comment retrieval',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-07'),
      }).returning();

      // Create multiple comments
      const commentsData = Array.from({ length: 3 }, (_, i) => ({
        bill_id: bill.id,
        user_id: user.id,
        content: `Test comment ${i + 1}`,
        parent_comment_id: null,
      }));

      for (const commentData of commentsData) {
        await apiClient.createComment(commentData);
      }

      // Retrieve comments
      const response = await apiClient.getBillComments(bill.id);

      expect(response.comments).toBeDefined();
      expect(response.comments.length).toBe(3);
    });
  });

  describe('Data Transformation Verification', () => {
    it('should maintain data integrity through transformation pipeline', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const [user] = await db.insert(users).values({
        email: 'transform@example.com',
        password_hash: '$2b$10$test',
        role: 'citizen',
        is_verified: true,
        is_active: true,
      }).returning();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Transform',
        chamber: 'national_assembly',
        party: 'ford_kenya',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 13 of 2024',
        title: 'Transform Comment Bill',
        summary: 'Testing transformation',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'national_assembly',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-08'),
      }).returning();

      // Create comment via API
      const commentData = {
        bill_id: bill.id,
        user_id: user.id,
        content: 'Transform test comment',
        parent_comment_id: null,
      };

      const apiResponse = await apiClient.createComment(commentData);

      // Verify transformations
      expect(apiResponse.comment.bill_id).toBe(bill.id);
      expect(apiResponse.comment.user_id).toBe(user.id);
      expect(apiResponse.comment.content).toBe(commentData.content);
    });
  });
});
