/**
 * Integration Tests for Migrated Route Handlers
 * 
 * Tests that migrated routes maintain API compatibility while using
 * the new Boom error system internally.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { migratedBillsRouter } from '@server/features/bills/presentation/bills-router-migrated.ts';
import { boomErrorMiddleware, errorContextMiddleware } from '@server/middleware/boom-error-middleware.js';

// Mock the bill service
vi.mock('../../features/bills/application/bills.js', () => ({
  billService: {
    getBills: vi.fn(),
    getBillsByTags: vi.fn(),
    getBill: vi.fn(),
    createBill: vi.fn(),
    incrementBillViews: vi.fn(),
    incrementBillShares: vi.fn(),
    getBillComments: vi.fn(),
    createBillComment: vi.fn(),
    getCommentReplies: vi.fn(),
    updateBillCommentEndorsements: vi.fn(),
    highlightComment: vi.fn(),
    unhighlightComment: vi.fn(),
    getCacheStats: vi.fn()
  },
  BillNotFoundError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BillNotFoundError';
    }
  },
  CommentNotFoundError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CommentNotFoundError';
    }
  },
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

// Mock authentication middleware
vi.mock('../../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      name: 'Test User'
    };
    next();
  }
}));

// Mock security audit service
vi.mock('../../security/security-audit-service.js', () => ({
  securityAuditService: {
    logDataAccess: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Migrated Route Handlers Integration Tests', () => {
  let app: express.Express;
  let billService: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(errorContextMiddleware);
    app.use('/api/bills', migratedBillsRouter);
    app.use(boomErrorMiddleware);

    // Get the mocked bill service
    const { billService: mockBillService } = await import('@server/features/bills/application/bills.ts');
    billService = mockBillService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bills', () => {
    it('should return bills successfully', async () => {
      const mockBills = [
        { id: 1, title: 'Test Bill 1', status: 'active' },
        { id: 2, title: 'Test Bill 2', status: 'draft' }
      ];
      billService.getBills.mockResolvedValue(mockBills);

      const response = await request(app)
        .get('/api/bills')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          bills: mockBills,
          count: 2,
          hasMore: false
        }
      });
    });

    it('should handle pagination parameters', async () => {
      const mockBills = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Test Bill ${i + 1}`,
        status: 'active'
      }));
      billService.getBills.mockResolvedValue(mockBills);

      const response = await request(app)
        .get('/api/bills?limit=10&offset=5')
        .expect(200);

      expect(response.body.data.bills).toHaveLength(10);
      expect(response.body.data.pagination).toMatchObject({
        limit: 10,
        offset: 5,
        next: 15
      });
    });

    it('should return validation error for invalid pagination', async () => {
      const response = await request(app)
        .get('/api/bills?limit=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.stringContaining('Limit must be a positive number'),
          category: expect.any(String),
          retryable: false
        }
      });
    });

    it('should filter bills by tags', async () => {
      const mockBills = [
        { id: 1, title: 'Healthcare Bill', tags: ['healthcare'] }
      ];
      billService.getBillsByTags.mockResolvedValue(mockBills);

      const response = await request(app)
        .get('/api/bills?tags=healthcare,education')
        .expect(200);

      expect(billService.getBillsByTags).toHaveBeenCalledWith(['healthcare', 'education']);
      expect(response.body.data.bills).toEqual(mockBills);
    });

    it('should return validation error for empty tags', async () => {
      const response = await request(app)
        .get('/api/bills?tags=')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('At least one valid tag must be provided')
        }
      });
    });
  });

  describe('GET /api/bills/:id', () => {
    it('should return a specific bill', async () => {
      const mockBill = { id: 1, title: 'Test Bill', status: 'active' };
      billService.getBill.mockResolvedValue(mockBill);
      billService.incrementBillViews.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/bills/1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          bill: mockBill
        }
      });
      expect(billService.getBill).toHaveBeenCalledWith(1);
    });

    it('should return validation error for invalid ID', async () => {
      const response = await request(app)
        .get('/api/bills/invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Bill ID must be a valid positive number')
        }
      });
    });

    it('should return not found error for non-existent bill', async () => {
      const { BillNotFoundError } = await import('@server/features/bills/application/bills.ts');
      billService.getBill.mockRejectedValue(new BillNotFoundError('Bill not found'));

      const response = await request(app)
        .get('/api/bills/999')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String)
        }
      });
    });
  });

  describe('POST /api/bills', () => {
    it('should create a new bill successfully', async () => {
      const newBill = { id: 1, title: 'New Bill', status: 'draft' };
      billService.createBill.mockResolvedValue(newBill);

      const billData = {
        title: 'New Bill',
        description: 'A new bill for testing',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/bills')
        .send(billData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          bill: newBill,
          message: 'Bill created successfully'
        }
      });
      expect(billService.createBill).toHaveBeenCalledWith({
        ...billData,
        sponsor_id: 'test-user-123'
      });
    });

    it('should handle validation errors during bill creation', async () => {
      const { ValidationError } = await import('@server/features/bills/application/bills.ts');
      billService.createBill.mockRejectedValue(new ValidationError('Title is required'));

      const response = await request(app)
        .post('/api/bills')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          category: expect.any(String)
        }
      });
    });
  });

  describe('POST /api/bills/:id/share', () => {
    it('should increment share count successfully', async () => {
      const updatedBill = { id: 1, title: 'Test Bill', shares: 5 };
      billService.incrementBillShares.mockResolvedValue(updatedBill);

      const response = await request(app)
        .post('/api/bills/1/share')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          bill: updatedBill,
          shares: 5,
          message: 'Share count updated'
        }
      });
    });
  });

  describe('GET /api/bills/:id/comments', () => {
    it('should return comments for a bill', async () => {
      const mockComments = [
        { id: 1, content: 'Great bill!', created_at: '2023-01-01T00:00:00Z' },
        { id: 2, content: 'Needs improvement', created_at: '2023-01-02T00:00:00Z' }
      ];
      billService.getBillComments.mockResolvedValue(mockComments);

      const response = await request(app)
        .get('/api/bills/1/comments')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comments: expect.arrayContaining(mockComments),
          count: 2,
          bill_id: 1
        }
      });
    });

    it('should filter highlighted comments', async () => {
      const mockComments = [
        { id: 1, content: 'Great bill!', isHighlighted: true },
        { id: 2, content: 'Regular comment', isHighlighted: false }
      ];
      billService.getBillComments.mockResolvedValue(mockComments);

      const response = await request(app)
        .get('/api/bills/1/comments?highlighted=true')
        .expect(200);

      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.comments[0].isHighlighted).toBe(true);
    });

    it('should validate sortBy parameter', async () => {
      const response = await request(app)
        .get('/api/bills/1/comments?sortBy=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('sortBy must be one of: recent, popular, endorsements')
        }
      });
    });
  });

  describe('POST /api/bills/:id/comments', () => {
    it('should create a new comment successfully', async () => {
      const newComment = { id: 1, content: 'New comment', user_id: 'test-user-123' };
      billService.createBillComment.mockResolvedValue(newComment);

      const commentData = {
        content: 'New comment',
        position: 'support'
      };

      const response = await request(app)
        .post('/api/bills/1/comments')
        .send(commentData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comment: newComment,
          message: 'Comment created successfully'
        }
      });
    });
  });

  describe('PUT /api/bills/comments/:comment_id/endorsements', () => {
    it('should update endorsements successfully', async () => {
      const updatedComment = { id: 1, content: 'Test comment', endorsements: 10 };
      billService.updateBillCommentEndorsements.mockResolvedValue(updatedComment);

      const response = await request(app)
        .put('/api/bills/comments/1/endorsements')
        .send({ endorsements: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comment: updatedComment,
          message: 'Endorsements updated successfully'
        }
      });
    });

    it('should validate endorsements value', async () => {
      const response = await request(app)
        .put('/api/bills/comments/1/endorsements')
        .send({ endorsements: -1 })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Endorsements must be a non-negative integer')
        }
      });
    });
  });

  describe('PUT /api/bills/comments/:comment_id/highlight', () => {
    it('should highlight comment for admin user', async () => {
      // Mock admin user
      const authMock = await import('../../middleware/auth.js');
      vi.mocked(authMock.authenticateToken).mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'admin-user-123',
          email: 'admin@example.com',
          role: 'admin',
          name: 'Admin User'
        };
        next();
      });

      const updatedComment = { id: 1, content: 'Test comment', isHighlighted: true };
      billService.highlightComment.mockResolvedValue(updatedComment);

      const response = await request(app)
        .put('/api/bills/comments/1/highlight')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comment: updatedComment,
          message: 'Comment highlighted successfully'
        }
      });
    });

    it('should deny access for non-admin user', async () => {
      const response = await request(app)
        .put('/api/bills/comments/1/highlight')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Insufficient permissions')
        }
      });
    });
  });

  describe('GET /api/bills/cache/stats', () => {
    it('should return cache stats for admin user', async () => {
      // Mock admin user
      const authMock = await import('../../middleware/auth.js');
      vi.mocked(authMock.authenticateToken).mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'admin-user-123',
          email: 'admin@example.com',
          role: 'admin',
          name: 'Admin User'
        };
        next();
      });

      const mockStats = { hitRate: 0.85, totalRequests: 1000 };
      billService.getCacheStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/bills/cache/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          cacheStats: mockStats,
          timestamp: expect.any(String),
          message: 'Cache statistics retrieved successfully'
        }
      });
    });

    it('should deny access for non-admin user', async () => {
      const response = await request(app)
        .get('/api/bills/cache/stats')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Insufficient permissions')
        }
      });
    });
  });

  describe('Error Handling Consistency', () => {
    it('should maintain consistent error response format across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/bills/invalid-id' },
        { method: 'get', path: '/api/bills?limit=invalid' },
        { method: 'get', path: '/api/bills/1/comments?sortBy=invalid' },
        { method: 'put', path: '/api/bills/comments/1/endorsements', body: { endorsements: 'invalid' } }
      ];

      for (const endpoint of endpoints) {
        const req = request(app)[endpoint.method as keyof typeof request](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }

        const response = await req.expect(400);

        // All error responses should have the same structure
        expect(response.body).toMatchObject({
          success: false,
          error: {
            id: expect.any(String),
            code: expect.any(String),
            message: expect.any(String),
            category: expect.any(String),
            retryable: expect.any(Boolean),
            timestamp: expect.any(String)
          },
          metadata: {
            service: 'legislative-platform',
            requestId: expect.any(String)
          }
        });
      }
    });
  });
});
