/**
 * Bills Feature Integration Tests
 * 
 * Tests the complete integration of the bills feature:
 * - Server endpoints
 * - Database operations
 * - Client API compatibility
 * - Error handling
 * - Authentication/Authorization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@server/index';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { bills, comments, bill_engagement, users } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

// Test data
let testBillId: number;
let testCommentId: number;
let testUserId: string;
let authToken: string;
let expertToken: string;

describe('Bills Feature Integration Tests', () => {
  
  beforeAll(async () => {
    // Setup: Create test user and get auth token
    const testUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'user',
      is_active: true,
    };
    
    await writeDatabase.insert(users).values(testUser);
    testUserId = testUser.id;
    
    // Mock auth token (in real tests, you'd get this from auth service)
    authToken = 'Bearer test-token-' + testUserId;
    
    // Create expert user for endorsement tests
    const expertUser = {
      id: 'expert-user-' + Date.now(),
      email: 'expert@example.com',
      password_hash: 'hashed_password',
      role: 'expert',
      is_active: true,
    };
    
    await writeDatabase.insert(users).values(expertUser);
    expertToken = 'Bearer expert-token-' + expertUser.id;
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    if (testBillId) {
      await writeDatabase.delete(bills).where(eq(bills.id, testBillId));
    }
    if (testCommentId) {
      await writeDatabase.delete(comments).where(eq(comments.id, testCommentId));
    }
    if (testUserId) {
      await writeDatabase.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('Core Bill Operations', () => {
    
    it('should create a new bill', async () => {
      const billData = {
        bill_number: 'TEST-BILL-' + Date.now(),
        title: 'Test Bill for Integration Testing',
        description: 'This is a comprehensive test bill to verify the integration of the bills feature across server, client, and database layers.',
        status: 'introduced',
        category: 'technology',
        sponsor_id: 1,
      };

      const response = await request(app)
        .post('/api/bills')
        .set('Authorization', authToken)
        .send(billData)
        .expect(201);

      expect(response.body).toHaveProperty('bill');
      expect(response.body.bill).toHaveProperty('id');
      expect(response.body.bill.title).toBe(billData.title);
      
      testBillId = response.body.bill.id;
    });

    it('should retrieve all bills', async () => {
      const response = await request(app)
        .get('/api/bills')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('bills');
      expect(Array.isArray(response.body.bills)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    it('should retrieve a specific bill by ID', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}`)
        .expect(200);

      expect(response.body).toHaveProperty('bill');
      expect(response.body.bill.id).toBe(testBillId);
    });

    it('should increment bill share count', async () => {
      const response = await request(app)
        .post(`/api/bills/${testBillId}/share`)
        .expect(200);

      expect(response.body).toHaveProperty('bill');
      expect(response.body.bill.share_count).toBeGreaterThan(0);
    });
  });

  describe('Bill Tracking', () => {
    
    it('should track a bill', async () => {
      const response = await request(app)
        .post(`/api/bills/${testBillId}/track`)
        .set('Authorization', authToken)
        .send({
          tracking_types: ['status_changes', 'new_comments'],
          alert_frequency: 'immediate',
          alert_channels: ['in_app', 'email'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('preferences');
    });

    it('should untrack a bill', async () => {
      const response = await request(app)
        .post(`/api/bills/${testBillId}/untrack`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('untracked');
    });

    it('should require authentication for tracking', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/track`)
        .expect(401);
    });
  });

  describe('Comments & Engagement', () => {
    
    it('should create a comment on a bill', async () => {
      const commentData = {
        content: 'This is a test comment for integration testing.',
      };

      const response = await request(app)
        .post(`/api/bills/${testBillId}/comments`)
        .set('Authorization', authToken)
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty('comment');
      expect(response.body.comment.content).toBe(commentData.content);
      
      testCommentId = response.body.comment.id;
    });

    it('should retrieve comments for a bill', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('comments');
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThan(0);
    });

    it('should vote on a comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${testCommentId}/vote`)
        .set('Authorization', authToken)
        .send({ type: 'up' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('upvotes');
    });

    it('should validate vote type', async () => {
      await request(app)
        .post(`/api/comments/${testCommentId}/vote`)
        .set('Authorization', authToken)
        .send({ type: 'invalid' })
        .expect(400);
    });

    it('should allow experts to endorse comments', async () => {
      const response = await request(app)
        .post(`/api/comments/${testCommentId}/endorse`)
        .set('Authorization', expertToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('endorsements');
    });

    it('should prevent non-experts from endorsing', async () => {
      await request(app)
        .post(`/api/comments/${testCommentId}/endorse`)
        .set('Authorization', authToken)
        .expect(403);
    });

    it('should record engagement', async () => {
      const response = await request(app)
        .post(`/api/bills/${testBillId}/engagement`)
        .set('Authorization', authToken)
        .send({ type: 'view' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('recorded');
    });

    it('should validate engagement type', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/engagement`)
        .set('Authorization', authToken)
        .send({ type: 'invalid' })
        .expect(400);
    });
  });

  describe('Bill Analysis & Sponsors', () => {
    
    it('should retrieve bill sponsors', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/sponsors`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve bill analysis', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/analysis`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve sponsorship analysis (original path)', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/sponsorship-analysis`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should retrieve sponsorship analysis (alias path)', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/analysis/sponsorship`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Metadata Endpoints', () => {
    
    it('should retrieve bill categories', async () => {
      const response = await request(app)
        .get('/api/bills/meta/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('description');
    });

    it('should retrieve bill statuses', async () => {
      const response = await request(app)
        .get('/api/bills/meta/statuses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('order');
    });
  });

  describe('Polls Feature', () => {
    
    let testPollId: number;

    it('should create a poll', async () => {
      const pollData = {
        question: 'Do you support this test bill?',
        options: ['Strongly Support', 'Support', 'Neutral', 'Oppose', 'Strongly Oppose'],
        endDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const response = await request(app)
        .post(`/api/bills/${testBillId}/polls`)
        .set('Authorization', authToken)
        .send(pollData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.question).toBe(pollData.question);
      expect(response.body.data.options).toHaveLength(5);
      
      testPollId = response.body.data.id;
    });

    it('should validate poll question length', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/polls`)
        .set('Authorization', authToken)
        .send({
          question: 'Short?',
          options: ['Yes', 'No'],
        })
        .expect(400);
    });

    it('should validate poll options count', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/polls`)
        .set('Authorization', authToken)
        .send({
          question: 'Do you support this bill?',
          options: ['Yes'], // Only 1 option
        })
        .expect(400);
    });

    it('should validate poll end date', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/polls`)
        .set('Authorization', authToken)
        .send({
          question: 'Do you support this bill?',
          options: ['Yes', 'No'],
          endDate: '2020-01-01T00:00:00Z', // Past date
        })
        .expect(400);
    });

    it('should retrieve polls for a bill', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/polls`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should require authentication for poll creation', async () => {
      await request(app)
        .post(`/api/bills/${testBillId}/polls`)
        .send({
          question: 'Do you support this bill?',
          options: ['Yes', 'No'],
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    
    it('should return 404 for non-existent bill', async () => {
      await request(app)
        .get('/api/bills/999999')
        .expect(404);
    });

    it('should return 400 for invalid bill ID', async () => {
      await request(app)
        .get('/api/bills/invalid')
        .expect(400);
    });

    it('should return 404 for non-existent comment', async () => {
      await request(app)
        .post('/api/comments/999999/vote')
        .set('Authorization', authToken)
        .send({ type: 'up' })
        .expect(404);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/bills')
        .query({ limit: 200 }) // Exceeds max
        .expect(400);
    });
  });

  describe('Database Integration', () => {
    
    it('should persist bill data in database', async () => {
      const [bill] = await readDatabase
        .select()
        .from(bills)
        .where(eq(bills.id, testBillId))
        .limit(1);

      expect(bill).toBeDefined();
      expect(bill.id).toBe(testBillId);
      expect(bill.title).toContain('Test Bill');
    });

    it('should persist comment data in database', async () => {
      const [comment] = await readDatabase
        .select()
        .from(comments)
        .where(eq(comments.id, testCommentId))
        .limit(1);

      expect(comment).toBeDefined();
      expect(comment.id).toBe(testCommentId);
      expect(comment.bill_id).toBe(testBillId);
    });

    it('should persist engagement data in database', async () => {
      const engagements = await readDatabase
        .select()
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, testBillId));

      expect(engagements.length).toBeGreaterThan(0);
    });
  });

  describe('Client API Compatibility', () => {
    
    it('should return data in expected client format for bills list', async () => {
      const response = await request(app)
        .get('/api/bills')
        .expect(200);

      // Verify response matches client expectations
      expect(response.body).toHaveProperty('bills');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('hasMore');
      
      if (response.body.bills.length > 0) {
        const bill = response.body.bills[0];
        expect(bill).toHaveProperty('id');
        expect(bill).toHaveProperty('title');
        expect(bill).toHaveProperty('status');
      }
    });

    it('should return data in expected client format for single bill', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}`)
        .expect(200);

      expect(response.body).toHaveProperty('bill');
      const bill = response.body.bill;
      expect(bill).toHaveProperty('id');
      expect(bill).toHaveProperty('title');
      expect(bill).toHaveProperty('description');
      expect(bill).toHaveProperty('status');
    });

    it('should return data in expected client format for comments', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/comments`)
        .expect(200);

      expect(response.body).toHaveProperty('comments');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('bill_id');
    });

    it('should return data in expected client format for polls', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}/polls`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      
      if (response.body.data.length > 0) {
        const poll = response.body.data[0];
        expect(poll).toHaveProperty('id');
        expect(poll).toHaveProperty('billId');
        expect(poll).toHaveProperty('question');
        expect(poll).toHaveProperty('options');
        expect(poll).toHaveProperty('totalVotes');
      }
    });
  });
});
