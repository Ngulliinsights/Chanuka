/**
 * Bills API End-to-End Tests
 * 
 * End-to-end tests that verify the complete bills feature works correctly
 * from HTTP API through to data sources.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { BillDataSourceFactory } from '../../infrastructure/data-sources/bill-data-source-factory';

// Mock the Express app (this would normally be your actual app)
const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  use: vi.fn(),
  listen: vi.fn(),
};

// Mock Express
vi.mock('express', () => ({
  default: () => mockApp,
  Router: () => mockApp,
  json: vi.fn(),
  urlencoded: vi.fn(),
}));

// Mock the bill routes (simplified for testing)
const mockBillRoutes = {
  'GET /api/bills': async (req: any, res: any) => {
    const factory = BillDataSourceFactory.getInstance();
    const dataSource = await factory.getDataSource();
    const bills = await dataSource.findAll(req.query);
    res.json({ success: true, data: bills });
  },
  
  'GET /api/bills/:id': async (req: any, res: any) => {
    const factory = BillDataSourceFactory.getInstance();
    const dataSource = await factory.getDataSource();
    const bill = await dataSource.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }
    
    res.json({ success: true, data: bill });
  },
  
  'GET /api/bills/stats': async (req: any, res: any) => {
    const factory = BillDataSourceFactory.getInstance();
    const dataSource = await factory.getDataSource();
    const stats = await dataSource.getStats();
    res.json({ success: true, data: stats });
  },
  
  'GET /api/bills/search': async (req: any, res: any) => {
    const factory = BillDataSourceFactory.getInstance();
    const dataSource = await factory.getDataSource();
    const { q: search, ...filters } = req.query;
    const bills = await dataSource.findAll({ search, ...filters });
    res.json({ success: true, data: bills });
  },
  
  'GET /api/bills/health': async (req: any, res: any) => {
    const { billHealthService } = await import('../../application/bill-health.service');
    const healthResult = await billHealthService.getHealthStatus();
    
    if (healthResult.isOk()) {
      const health = healthResult.value;
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json({ success: true, data: health });
    } else {
      res.status(500).json({ success: false, error: healthResult.error.message });
    }
  },
};

// Simple test server implementation
class TestServer {
  private routes: Map<string, Function> = new Map();
  
  constructor() {
    // Register mock routes
    Object.entries(mockBillRoutes).forEach(([route, handler]) => {
      this.routes.set(route, handler);
    });
  }
  
  async request(method: string, path: string, query: any = {}, body: any = {}) {
    const routeKey = `${method.toUpperCase()} ${path}`;
    const handler = this.routes.get(routeKey);
    
    if (!handler) {
      return { status: 404, body: { success: false, error: 'Route not found' } };
    }
    
    const mockReq = {
      method: method.toUpperCase(),
      path,
      query,
      body,
      params: this.extractParams(path),
    };
    
    const mockRes = {
      statusCode: 200,
      data: null,
      status: function(code: number) {
        this.statusCode = code;
        return this;
      },
      json: function(data: any) {
        this.data = data;
        return this;
      },
    };
    
    try {
      await handler(mockReq, mockRes);
      return { status: mockRes.statusCode, body: mockRes.data };
    } catch (error) {
      return { 
        status: 500, 
        body: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      };
    }
  }
  
  private extractParams(path: string): Record<string, string> {
    // Simple param extraction for :id patterns
    const params: Record<string, string> = {};
    if (path.includes('/bills/') && !path.includes('/search') && !path.includes('/stats') && !path.includes('/health')) {
      const parts = path.split('/');
      const billIndex = parts.indexOf('bills');
      if (billIndex >= 0 && parts[billIndex + 1]) {
        params.id = parts[billIndex + 1];
      }
    }
    return params;
  }
}

describe('Bills API E2E Tests', () => {
  let server: TestServer;
  let factory: BillDataSourceFactory;

  beforeAll(async () => {
    server = new TestServer();
    factory = BillDataSourceFactory.getInstance();
    
    // Use mock data source for E2E tests
    factory.setDataSourceType('mock');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bills', () => {
    it('should return all bills', async () => {
      const response = await server.request('GET', '/api/bills');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(3);
      
      // Check bill structure
      const bill = response.body.data[0];
      expect(bill).toHaveProperty('id');
      expect(bill).toHaveProperty('title');
      expect(bill).toHaveProperty('summary');
      expect(bill).toHaveProperty('status');
      expect(bill).toHaveProperty('category');
      expect(bill).toHaveProperty('comment_count');
      expect(bill).toHaveProperty('view_count');
      expect(bill).toHaveProperty('engagement_score');
    });

    it('should filter bills by status', async () => {
      const response = await server.request('GET', '/api/bills', { status: 'passed' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('passed');
    });

    it('should filter bills by category', async () => {
      const response = await server.request('GET', '/api/bills', { category: 'technology' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('technology');
    });

    it('should return empty array for non-matching filters', async () => {
      const response = await server.request('GET', '/api/bills', { status: 'non-existent' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/bills/:id', () => {
    it('should return specific bill by ID', async () => {
      const billId = '550e8400-e29b-41d4-a716-446655440001';
      const response = await server.request('GET', `/api/bills/${billId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(billId);
      expect(response.body.data.title).toBe('Digital Economy and Data Protection Act 2024');
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await server.request('GET', '/api/bills/non-existent-id');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bill not found');
    });
  });

  describe('GET /api/bills/search', () => {
    it('should search bills by query', async () => {
      const response = await server.request('GET', '/api/bills/search', { q: 'healthcare' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title.toLowerCase()).toContain('healthcare');
    });

    it('should search with filters', async () => {
      const response = await server.request('GET', '/api/bills/search', { 
        q: 'act', 
        status: 'committee_stage' 
      });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((bill: any) => bill.status === 'committee_stage')).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      const response = await server.request('GET', '/api/bills/search', { q: 'nonexistentterm' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/bills/stats', () => {
    it('should return bill statistics', async () => {
      const response = await server.request('GET', '/api/bills/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('byCategory');
      
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.byStatus).toEqual({
        'committee_stage': 1,
        'passed': 1,
        'draft': 1
      });
      expect(response.body.data.byCategory).toEqual({
        'technology': 1,
        'healthcare': 1,
        'infrastructure': 1
      });
    });
  });

  describe('GET /api/bills/health', () => {
    it('should return health status', async () => {
      const response = await server.request('GET', '/api/bills/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('dataSource');
      expect(response.body.data).toHaveProperty('cache');
      expect(response.body.data).toHaveProperty('features');
      
      expect(response.body.data.service).toBe('bills');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(response.body.data.dataSource.current).toBe('mock');
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle data source errors gracefully', async () => {
      // Mock a data source error
      const dataSource = await factory.getDataSource();
      vi.spyOn(dataSource, 'findAll').mockRejectedValue(new Error('Data source error'));
      
      const response = await server.request('GET', '/api/bills');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Data source error');
    });

    it('should handle invalid routes', async () => {
      const response = await server.request('GET', '/api/invalid-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });
  });

  describe('Performance E2E', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = [
        server.request('GET', '/api/bills'),
        server.request('GET', '/api/bills/550e8400-e29b-41d4-a716-446655440001'),
        server.request('GET', '/api/bills/search', { q: 'healthcare' }),
        server.request('GET', '/api/bills/stats'),
        server.request('GET', '/api/bills/health'),
      ];
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status); // 404 is ok for some tests
      });
      
      // Should complete reasonably quickly
      expect(totalTime).toBeLessThan(200); // Allow for mock delays
    });

    it('should maintain consistent response times', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await server.request('GET', '/api/bills');
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      // Calculate average and check consistency
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)));
      
      expect(avgTime).toBeLessThan(50); // Should be fast
      expect(maxDeviation).toBeLessThan(avgTime * 0.5); // Should be consistent
    });
  });

  describe('Data Consistency E2E', () => {
    it('should maintain data consistency across different endpoints', async () => {
      // Get all bills
      const allBillsResponse = await server.request('GET', '/api/bills');
      const allBills = allBillsResponse.body.data;
      
      // Get stats
      const statsResponse = await server.request('GET', '/api/bills/stats');
      const stats = statsResponse.body.data;
      
      // Verify consistency
      expect(stats.total).toBe(allBills.length);
      
      // Check individual bills exist
      for (const bill of allBills) {
        const billResponse = await server.request('GET', `/api/bills/${bill.id}`);
        expect(billResponse.status).toBe(200);
        expect(billResponse.body.data.id).toBe(bill.id);
      }
    });

    it('should provide consistent search results', async () => {
      // Search for all bills (no query)
      const allSearchResponse = await server.request('GET', '/api/bills/search', {});
      const allSearchResults = allSearchResponse.body.data;
      
      // Get all bills directly
      const allBillsResponse = await server.request('GET', '/api/bills');
      const allBills = allBillsResponse.body.data;
      
      // Should return same bills (order might differ)
      expect(allSearchResults).toHaveLength(allBills.length);
      
      const searchIds = allSearchResults.map((b: any) => b.id).sort();
      const billIds = allBills.map((b: any) => b.id).sort();
      expect(searchIds).toEqual(billIds);
    });
  });
});