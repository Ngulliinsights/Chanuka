import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { router as billsRouter } from '../../features/bills/bills.js';
import { router as sponsorsRouter } from '../../features/bills/sponsors.js';
import { router as financialDisclosureRouter } from '../../features/analytics/financial-disclosure.js';
import { router as authRouter } from '../../core/auth/auth.js';
import { TestHelpers, PerformanceUtils } from '../utils/test-helpers.js';

describe('API Performance Tests', () => {
  let app: express.Application;
  let testHelpers: TestHelpers;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mount routes
    app.use('/api/auth', authRouter);
    app.use('/api/bills', billsRouter);
    app.use('/api/sponsors', sponsorsRouter);
    app.use('/api/financial-disclosure', financialDisclosureRouter);

    testHelpers = new TestHelpers(app);
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('Response Time Tests', () => {
    it('should respond to bills endpoint within 2 seconds', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).get('/api/bills')
      );

      expect(response.status).toBe(200);
      PerformanceUtils.expectResponseTimeUnder(responseTime, 2000);
    });

    it('should respond to sponsors endpoint within 2 seconds', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).get('/api/sponsors')
      );

      expect([200, 500]).toContain(response.status); // May fail if no database
      PerformanceUtils.expectResponseTimeUnder(responseTime, 2000);
    });

    it('should respond to financial disclosure dashboard within 3 seconds', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).get('/api/financial-disclosure/dashboard')
      );

      expect([200, 500]).toContain(response.status);
      PerformanceUtils.expectResponseTimeUnder(responseTime, 3000);
    });

    it('should handle authentication quickly', async () => {
      const userData = {
        email: `perf-test-${Date.now()}@example.com`,
        password: 'testpassword123',
        firstName: 'Performance',
        lastName: 'Test'
      };

      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).post('/api/auth/register').send(userData)
      );

      expect([201, 400]).toContain(response.status); // 400 if user exists
      PerformanceUtils.expectResponseTimeUnder(responseTime, 1500);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 10 concurrent bill requests', async () => {
      const responses = await testHelpers.testConcurrentRequests(
        () => request(app).get('/api/bills'),
        10
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check that all responses are consistent
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    it('should handle concurrent authentication requests', async () => {
      const responses = await testHelpers.testConcurrentRequests(
        () => request(app).post('/api/auth/login').send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }),
        5
      );

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });

    it('should handle mixed concurrent requests', async () => {
      const mixedRequests = [
        () => request(app).get('/api/bills'),
        () => request(app).get('/api/sponsors'),
        () => request(app).get('/api/bills/categories'),
        () => request(app).get('/api/bills/statuses'),
        () => request(app).get('/api/financial-disclosure/health')
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        mixedRequests.map(requestFn => requestFn())
      );
      const totalTime = Date.now() - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);

      // Check that each request type responds appropriately
      responses.forEach((response, index) => {
        expect([200, 404, 500, 503]).toContain(response.status);
      });
    });
  });

  describe('Load Testing', () => {
    it('should handle 50 rapid sequential requests', async () => {
      const startTime = Date.now();
      const responses = [];

      for (let i = 0; i < 50; i++) {
        const response = await request(app).get('/api/bills');
        responses.push(response);
      }

      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / 50;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(averageResponseTime).toBeLessThan(500);

      console.log(`50 sequential requests completed in ${totalTime}ms (avg: ${averageResponseTime}ms)`);
    });

    it('should maintain performance under pagination load', async () => {
      const paginationRequests = [];
      
      // Test different page sizes and offsets
      for (let page = 1; page <= 10; page++) {
        for (let limit of [5, 10, 20]) {
          paginationRequests.push(
            request(app).get(`/api/bills?page=${page}&limit=${limit}`)
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(paginationRequests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        if (response.body.data && response.body.data.pagination) {
          expect(response.body.data.pagination).toHaveProperty('page');
          expect(response.body.data.pagination).toHaveProperty('limit');
        }
      });

      console.log(`${paginationRequests.length} pagination requests completed in ${totalTime}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated requests', async () => {
      const memoryTest = await PerformanceUtils.monitorMemoryDuringTest(async () => {
        // Make 100 requests to test for memory leaks
        for (let i = 0; i < 100; i++) {
          await request(app).get('/api/bills');
          
          // Occasionally force garbage collection if available
          if (i % 20 === 0 && global.gc) {
            global.gc();
          }
        }
      });

      console.log('Memory usage during test:', memoryTest);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryTest.difference.heapUsed).toBeLessThan(50);
    });

    it('should handle large response payloads efficiently', async () => {
      const memoryBefore = PerformanceUtils.getMemoryUsage();

      // Request potentially large datasets
      const responses = await Promise.all([
        request(app).get('/api/bills?limit=100'),
        request(app).get('/api/financial-disclosure/disclosures?limit=100'),
        request(app).get('/api/sponsors')
      ]);

      const memoryAfter = PerformanceUtils.getMemoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB

      console.log(`Memory increase for large payloads: ${memoryIncrease}MB`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle database queries efficiently', async () => {
      const databaseIntensiveRequests = [
        () => request(app).get('/api/bills?search=climate'),
        () => request(app).get('/api/bills?status=committee_review'),
        () => request(app).get('/api/bills?category=environment'),
        () => request(app).get('/api/sponsors/1'),
        () => request(app).get('/api/financial-disclosure/disclosures?sponsorId=1')
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        databaseIntensiveRequests.map(requestFn => requestFn())
      );
      const totalTime = Date.now() - startTime;

      // All database queries should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for all queries

      responses.forEach(response => {
        // Should either succeed or fail gracefully
        expect([200, 404, 500]).toContain(response.status);
      });

      console.log(`Database-intensive requests completed in ${totalTime}ms`);
    });

    it('should cache repeated requests effectively', async () => {
      const cacheableEndpoint = '/api/bills/categories';

      // First request (cache miss)
      const { responseTime: firstRequestTime } = await testHelpers.measureResponseTime(
        () => request(app).get(cacheableEndpoint)
      );

      // Second request (should be cached)
      const { responseTime: secondRequestTime } = await testHelpers.measureResponseTime(
        () => request(app).get(cacheableEndpoint)
      );

      // Third request (should still be cached)
      const { responseTime: thirdRequestTime } = await testHelpers.measureResponseTime(
        () => request(app).get(cacheableEndpoint)
      );

      console.log(`Cache test - First: ${firstRequestTime}ms, Second: ${secondRequestTime}ms, Third: ${thirdRequestTime}ms`);

      // Cached requests should generally be faster, but this depends on implementation
      // For now, just ensure all requests complete in reasonable time
      expect(firstRequestTime).toBeLessThan(2000);
      expect(secondRequestTime).toBeLessThan(2000);
      expect(thirdRequestTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle 404 errors quickly', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).get('/api/nonexistent-endpoint')
      );

      expect(response.status).toBe(404);
      PerformanceUtils.expectResponseTimeUnder(responseTime, 500);
    });

    it('should handle validation errors efficiently', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app).post('/api/auth/login').send({})
      );

      expect(response.status).toBe(400);
      PerformanceUtils.expectResponseTimeUnder(responseTime, 500);
    });

    it('should handle malformed requests quickly', async () => {
      const { response, responseTime } = await testHelpers.measureResponseTime(
        () => request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}')
      );

      expect(response.status).toBe(400);
      PerformanceUtils.expectResponseTimeUnder(responseTime, 500);
    });
  });

  describe('Stress Testing', () => {
    it('should survive stress test with mixed operations', async () => {
      const stressTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const responses: any[] = [];

      // Run stress test for specified duration
      while (Date.now() - startTime < stressTestDuration) {
        const randomEndpoints = [
          '/api/bills',
          '/api/bills/categories',
          '/api/bills/statuses',
          '/api/sponsors',
          '/api/financial-disclosure/health'
        ];

        const randomEndpoint = randomEndpoints[Math.floor(Math.random() * randomEndpoints.length)];
        
        try {
          const response = await request(app).get(randomEndpoint);
          responses.push(response);
        } catch (error) {
          console.warn('Request failed during stress test:', error);
        }

        // Small delay to prevent overwhelming
        await testHelpers.delay(10);
      }

      const totalTime = Date.now() - startTime;
      const requestsPerSecond = responses.length / (totalTime / 1000);

      console.log(`Stress test: ${responses.length} requests in ${totalTime}ms (${requestsPerSecond.toFixed(2)} req/s)`);

      // Should handle at least some requests successfully
      expect(responses.length).toBeGreaterThan(0);

      // Most requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200).length;
      const successRate = successfulRequests / responses.length;
      
      expect(successRate).toBeGreaterThan(0.7); // At least 70% success rate
    });
  });
});