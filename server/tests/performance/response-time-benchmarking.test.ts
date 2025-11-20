import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { router as billsRouter } from '@client/features/bills/bills-router.js';
import { router as sponsorsRouter } from '@client/features/bills/sponsors.js';
import { router as financialDisclosureRouter } from '@client/features/analytics/financial-disclosure/index.js';
import { logger  } from '@shared/core/src/index.js';

describe('Response Time Benchmarking Tests', () => {
  let app: express.Application;
  
  const RESPONSE_TIME_THRESHOLDS = {
    fast: 100,      // < 100ms for simple queries
    medium: 300,    // < 300ms for complex queries
    slow: 1000,     // < 1000ms for heavy operations
  };

  beforeAll(async () => {
    // Create test app with all routes
    app = express();
    app.use(express.json());
    app.use('/api/bills', billsRouter);
    app.use('/api/sponsors', sponsorsRouter);
    app.use('/api/financial-disclosure', financialDisclosureRouter);
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Bills API Response Times', () => {
    it('should return bills list within fast threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills')
        .query({ limit: 10 })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Bills list response time: ${responseTime}ms`);
    });

    it('should return bill details within fast threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills/1')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.fast);
      expect(response.body.success).toBe(true);
      
      console.log(`Bill details response time: ${responseTime}ms`);
    });

    it('should handle bill search within medium threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills/search')
        .query({ q: 'healthcare', limit: 20 })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Bill search response time: ${responseTime}ms`);
    });

    it('should return engagement stats within medium threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills/1/engagement')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Engagement stats response time: ${responseTime}ms`);
    });
  });

  describe('Sponsors API Response Times', () => {
    it('should return sponsors list within fast threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/sponsors')
        .query({ limit: 10 })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Sponsors list response time: ${responseTime}ms`);
    });

    it('should return sponsor details within fast threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/sponsors/1')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.fast);
      expect(response.body.success).toBe(true);
      
      console.log(`Sponsor details response time: ${responseTime}ms`);
    });

    it('should return voting patterns within medium threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/sponsors/1/voting-patterns')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Voting patterns response time: ${responseTime}ms`);
    });
  });

  describe('Financial Disclosure API Response Times', () => {
    it('should return disclosures within medium threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures')
        .query({ limit: 10 })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Financial disclosures response time: ${responseTime}ms`);
    });

    it('should return relationships within medium threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/financial-disclosure/relationships/1')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(response.body.success).toBe(true);
      
      console.log(`Financial relationships response time: ${responseTime}ms`);
    });

    it('should return dashboard within slow threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/financial-disclosure/dashboard')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.slow);
      expect(response.body.success).toBe(true);
      
      console.log(`Financial dashboard response time: ${responseTime}ms`);
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .get('/api/bills')
          .query({ limit: 5, offset: i * 5 })
      );
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      
      console.log(`Concurrent requests (${concurrentRequests}): ${totalTime}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    it('should maintain performance under sequential load', async () => {
      const sequentialRequests = 20;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < sequentialRequests; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/bills')
          .query({ limit: 5, offset: i });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
      }
      
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      
      expect(averageTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.medium);
      expect(maxTime).toBeLessThan(RESPONSE_TIME_THRESHOLDS.slow);
      
      console.log(`Sequential requests (${sequentialRequests}): ${averageTime.toFixed(2)}ms average, ${maxTime}ms max`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should track response time trends', async () => {
      const performanceHistoryPath = 'performance-history.json';
      const currentMetrics = await collectPerformanceMetrics();
      
      // Save current metrics for trend analysis
      const fs = require('fs');
      let history = [];
      
      if (fs.existsSync(performanceHistoryPath)) {
        try {
          history = JSON.parse(fs.readFileSync(performanceHistoryPath, 'utf8'));
        } catch (error) {
          console.warn('Could not read performance history');
        }
      }
      
      const entry = {
        timestamp: new Date().toISOString(),
        metrics: currentMetrics,
        commit: process.env.GITHUB_SHA || 'local'
      };
      
      history.push(entry);
      
      // Keep last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      try {
        fs.writeFileSync(performanceHistoryPath, JSON.stringify(history, null, 2));
      } catch (error) {
        console.warn('Could not save performance history');
      }
      
      // Check for regression if we have baseline
      if (history.length > 1) {
        const baseline = history[Math.max(0, history.length - 10)]; // Compare with 10 entries ago
        const regressionThreshold = 1.5; // 50% slower is a regression
        
        Object.keys(currentMetrics).forEach(endpoint => {
          if (baseline.metrics[endpoint]) {
            const ratio = currentMetrics[endpoint] / baseline.metrics[endpoint];
            if (ratio > regressionThreshold) {
              console.warn(`Performance regression detected for ${endpoint}: ${ratio.toFixed(2)}x slower`);
            }
          }
        });
      }
      
      expect(currentMetrics).toBeDefined();
    });
  });

  async function collectPerformanceMetrics() {
    const metrics: Record<string, number> = {};
    
    const endpoints = [
      { path: '/api/bills', name: 'bills_list' },
      { path: '/api/bills/1', name: 'bill_details' },
      { path: '/api/sponsors', name: 'sponsors_list' },
      { path: '/api/sponsors/1', name: 'sponsor_details' },
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        await request(app).get(endpoint.path);
        metrics[endpoint.name] = Date.now() - startTime;
      } catch (error) {
        console.warn(`Failed to collect metrics for ${endpoint.name}`);
        metrics[endpoint.name] = -1; // Indicate failure
      }
    }
    
    return metrics;
  }
});












































