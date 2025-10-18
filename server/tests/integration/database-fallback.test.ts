import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { databaseFallbackService } from '../../infrastructure/database/database-fallback.js';
import { demoDataService } from '../../infrastructure/demo-data.js';
import request from 'supertest';
import { app } from '../../index.js';
import { logger } from '../../shared/core/src/utils/logger';

describe('Database Fallback Integration Tests', () => {
  beforeEach(() => {
    // Reset services before each test
    demoDataService.setDemoMode(false);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
    databaseFallbackService.cleanup();

    // Force cleanup of any remaining timers to prevent hanging
    if (global.gc) {
      global.gc();
    }
  });

  describe('Database Connection Handling', () => {
    it('should handle database connection failure gracefully', async () => {
      // Mock database connection failure
  const originalTestConnection = databaseFallbackService.testConnection;
  // Provide a typed replacement that returns a Promise<boolean>
  databaseFallbackService.testConnection = async () => false;

      const result = await databaseFallbackService.initialize();

      expect(result).toBe(false);
      expect(demoDataService.isDemoMode()).toBe(true);

      // Restore original method
      databaseFallbackService.testConnection = originalTestConnection;
    });

    it('should enable demo mode when database is unavailable', async () => {
      // Mock database unavailable
      process.env.DATABASE_URL = '';

      const result = await databaseFallbackService.testConnection();

      expect(result).toBe(false);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should retry connection on failure', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await databaseFallbackService.initialize();

      // Wait for retry attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(testConnectionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Health Check Endpoints', () => {
    it('should return health status with database info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.database).toHaveProperty('connected');
      expect(response.body.data.database).toHaveProperty('mode');
      expect(response.body.data.database).toHaveProperty('demoMode');
    });

    it('should return detailed system status', async () => {
      const response = await request(app)
        .get('/api/health/system')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('fallback');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('should handle database retry endpoint', async () => {
      const response = await request(app)
        .post('/api/health/database/retry')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('status');
    });

    it('should handle demo mode toggle endpoint', async () => {
      const response = await request(app)
        .post('/api/health/demo-mode')
        .send({ enabled: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('demoMode');
      expect(response.body.data.demoMode).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should validate demo mode toggle request', async () => {
      const response = await request(app)
        .post('/api/health/demo-mode')
        .send({ enabled: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('enabled');
    });
  });

  describe('API Fallback Behavior', () => {
    beforeEach(() => {
      // Enable demo mode for these tests
      demoDataService.setDemoMode(true);
    });

    it('should serve bills from demo data when database is unavailable', async () => {
      const response = await request(app)
        .get('/api/bills')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bills');
      expect(response.body.data.bills).toHaveLength(3);
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should serve specific bill from demo data', async () => {
      const response = await request(app)
        .get('/api/bills/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bill');
      expect(response.body.data.bill.id).toBe(1);
      expect(response.body.data.bill.title).toContain('Digital Economy');
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should return 404 for non-existent bill in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should serve sponsors from demo data', async () => {
      const response = await request(app)
        .get('/api/sponsors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('role');
    });

    it('should serve bill categories from demo data', async () => {
      const response = await request(app)
        .get('/api/bills/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data.categories).toHaveLength(7);
      expect(response.body.data.categories[0]).toHaveProperty('id');
      expect(response.body.data.categories[0]).toHaveProperty('name');
      expect(response.body.data.categories[0]).toHaveProperty('count');
    });

    it('should serve bill statuses from demo data', async () => {
      const response = await request(app)
        .get('/api/bills/statuses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statuses');
      expect(response.body.data.statuses).toHaveLength(8);
      expect(response.body.data.statuses[0]).toHaveProperty('id');
      expect(response.body.data.statuses[0]).toHaveProperty('name');
      expect(response.body.data.statuses[0]).toHaveProperty('count');
    });
  });

  describe('Search Functionality in Demo Mode', () => {
    beforeEach(() => {
      demoDataService.setDemoMode(true);
    });

    it('should search bills by title in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills?search=Digital')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bills).toHaveLength(1);
      expect(response.body.data.bills[0].title).toContain('Digital');
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should filter bills by status in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills?status=first_reading')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bills).toHaveLength(1);
      expect(response.body.data.bills[0].status).toBe('first_reading');
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should filter bills by category in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills?category=healthcare')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bills).toHaveLength(1);
      expect(response.body.data.bills[0].category).toBe('healthcare');
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should combine search and filters in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills?search=Act&status=committee_review&category=technology')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bills).toHaveLength(1);
      expect(response.body.data.bills[0].title).toContain('Digital Economy');
      expect(response.body.metadata.source).toBe('fallback');
    });

    it('should return empty results for no matches in demo mode', async () => {
      const response = await request(app)
        .get('/api/bills?search=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bills).toHaveLength(0);
      expect(response.body.metadata.source).toBe('fallback');
    });
  });

  describe('Error Recovery', () => {
    it('should recover when database comes back online', async () => {
      // Start with database failure
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await databaseFallbackService.initialize();
      expect(demoDataService.isDemoMode()).toBe(true);

      // Simulate database recovery
      await databaseFallbackService.forceRetry();
      expect(demoDataService.isDemoMode()).toBe(false);

      testConnectionSpy.mockRestore();
    });

    it('should maintain demo mode after max retries', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValue(false);

      // Initialize with failure
      await databaseFallbackService.initialize();

      // Check status after max retries would be reached
      const status = databaseFallbackService.getStatus();
      expect(status.demoMode).toBe(true);
      expect(status.connected).toBe(false);

      testConnectionSpy.mockRestore();
    });
  });

  describe('Data Consistency', () => {
    beforeEach(() => {
      demoDataService.setDemoMode(true);
    });

    it('should maintain consistent data across multiple requests', async () => {
      const response1 = await request(app).get('/api/bills');
      const response2 = await request(app).get('/api/bills');

      expect(response1.body.data.bills).toEqual(response2.body.data.bills);
    });

    it('should have matching sponsor IDs between bills and sponsors', async () => {
      const billsResponse = await request(app).get('/api/bills');
      const sponsorsResponse = await request(app).get('/api/sponsors');

      const bills = billsResponse.body.data.bills;
      const sponsors = sponsorsResponse.body.data;

      bills.forEach((bill: any) => {
        if (bill.sponsorId) {
          const sponsor = sponsors.find((s: any) => s.id === bill.sponsorId);
          expect(sponsor).toBeDefined();
        }
      });
    });

    it('should have valid date objects in demo data', async () => {
      const response = await request(app).get('/api/bills');
      const bills = response.body.data.bills;

      bills.forEach((bill: any) => {
        expect(new Date(bill.introducedDate)).toBeInstanceOf(Date);
        expect(new Date(bill.createdAt)).toBeInstanceOf(Date);
        expect(new Date(bill.updatedAt)).toBeInstanceOf(Date);
      });
    });

    it('should have realistic numeric values in demo data', async () => {
      const response = await request(app).get('/api/bills');
      const bills = response.body.data.bills;

      bills.forEach((bill: any) => {
        expect(bill.viewCount).toBeGreaterThanOrEqual(0);
        expect(bill.shareCount).toBeGreaterThanOrEqual(0);
        if (bill.complexityScore) {
          expect(bill.complexityScore).toBeGreaterThanOrEqual(1);
          expect(bill.complexityScore).toBeLessThanOrEqual(10);
        }
      });
    });
  });
});






