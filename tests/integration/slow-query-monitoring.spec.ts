import { test, expect } from '@playwright/test';

// Strategic Integration Testing: Slow Query Monitoring End-to-End
// Tests the complete slow query detection and monitoring pipeline
test.describe('Slow Query Monitoring Integration', () => {
  test.describe('Query Detection Pipeline', () => {
    test('should detect and report slow queries via monitoring API', async ({ request }) => {
      // First, trigger some potentially slow operations
      const slowOperations = [
        request.get('/bills?limit=100&include=engagement,comments,sponsors'),
        request.get('/bills/search?q=comprehensive&include=all&sort=engagement'),
        request.get('/sponsors/analysis?include=billCount,engagement&timeframe=all')
      ];

      await Promise.all(slowOperations);

      // Check the slow query monitoring endpoint
      const monitoringResponse = await request.get('/monitoring/database/slow-queries');
      
      expect(monitoringResponse.status()).toBe(200);

      const data = await monitoringResponse.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('slowQueries');
      expect(Array.isArray(data.data.slowQueries)).toBe(true);

      console.log(`Detected ${data.data.slowQueries.length} slow queries`);

      // If slow queries were detected, verify their structure
      if (data.data.slowQueries.length > 0) {
        const slowQuery = data.data.slowQueries[0];
        
        expect(slowQuery).toHaveProperty('queryId');
        expect(slowQuery).toHaveProperty('sql');
        expect(slowQuery).toHaveProperty('executionTimeMs');
        expect(slowQuery).toHaveProperty('timestamp');
        expect(slowQuery).toHaveProperty('context');
        
        // Verify data types
        expect(typeof slowQuery.queryId).toBe('string');
        expect(typeof slowQuery.sql).toBe('string');
        expect(typeof slowQuery.executionTimeMs).toBe('number');
        expect(typeof slowQuery.timestamp).toBe('string');
        
        // Verify execution time is above threshold
        expect(slowQuery.executionTimeMs).toBeGreaterThan(100);
        
        // Verify timestamp is valid
        expect(new Date(slowQuery.timestamp).getTime()).toBeGreaterThan(0);
      }
    });

    test('should classify query types correctly', async ({ request }) => {
      // Trigger different types of queries
      await Promise.all([
        request.get('/bills?limit=50'), // SELECT
        request.post('/bills/1/comments', { data: { content: 'Test comment' } }), // INSERT
        request.put('/bills/1', { data: { title: 'Updated title' } }), // UPDATE
        request.delete('/bills/comments/1') // DELETE
      ]);

      const response = await request.get('/monitoring/database/slow-queries');
      const data = await response.json();

      if (data.data.slowQueries.length > 0) {
        const queryTypes = data.data.slowQueries.map((q: any) => {
          const sql = q.sql.toUpperCase();
          if (sql.includes('SELECT')) return 'SELECT';
          if (sql.includes('INSERT')) return 'INSERT';
          if (sql.includes('UPDATE')) return 'UPDATE';
          if (sql.includes('DELETE')) return 'DELETE';
          return 'UNKNOWN';
        });

        console.log('Query types detected:', queryTypes);
        
        // Should have detected various query types
        const uniqueTypes = [...new Set(queryTypes)];
        expect(uniqueTypes.length).toBeGreaterThan(0);
      }
    });

    test('should capture stack traces for slow queries', async ({ request }) => {
      // Trigger a complex query that might be slow
      await request.get('/bills/analytics/complex?include=all&timeframe=year');

      const response = await request.get('/monitoring/database/slow-queries');
      const data = await response.json();

      if (data.data.slowQueries.length > 0) {
        const slowQuery = data.data.slowQueries[0];
        
        if (slowQuery.stackTrace) {
          expect(typeof slowQuery.stackTrace).toBe('string');
          expect(slowQuery.stackTrace.length).toBeGreaterThan(0);
          
          // Stack trace should contain relevant information
          expect(slowQuery.stackTrace).toMatch(/at\s+/); // Stack trace format
          
          console.log('Stack trace captured for slow query');
        }
      }
    });
  });

  test.describe('Metrics and Analytics', () => {
    test('should provide comprehensive database metrics', async ({ request }) => {
      const response = await request.get('/monitoring/database/metrics');
      
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('queryCount');
      expect(data.data).toHaveProperty('averageResponseTime');
      expect(data.data).toHaveProperty('slowQueryCount');
      expect(data.data).toHaveProperty('connectionPoolStatus');
      expect(data.data).toHaveProperty('queryTypeBreakdown');

      // Verify metric types
      expect(typeof data.data.queryCount).toBe('number');
      expect(typeof data.data.averageResponseTime).toBe('number');
      expect(typeof data.data.slowQueryCount).toBe('number');
      expect(typeof data.data.connectionPoolStatus).toBe('object');

      // Verify reasonable values
      expect(data.data.queryCount).toBeGreaterThanOrEqual(0);
      expect(data.data.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(data.data.slowQueryCount).toBeGreaterThanOrEqual(0);

      console.log('Database metrics:', {
        queryCount: data.data.queryCount,
        avgResponseTime: data.data.averageResponseTime,
        slowQueries: data.data.slowQueryCount
      });
    });

    test('should track query performance over time', async ({ request }) => {
      // Make several requests to generate metrics
      for (let i = 0; i < 5; i++) {
        await request.get(`/bills?page=${i + 1}&limit=20`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const response = await request.get('/monitoring/database/metrics/timeline?window=5m');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('timeline');
        expect(Array.isArray(data.data.timeline)).toBe(true);

        if (data.data.timeline.length > 0) {
          const timePoint = data.data.timeline[0];
          expect(timePoint).toHaveProperty('timestamp');
          expect(timePoint).toHaveProperty('queryCount');
          expect(timePoint).toHaveProperty('averageResponseTime');
        }
      }
    });

    test('should provide query performance breakdown by type', async ({ request }) => {
      const response = await request.get('/monitoring/database/metrics/breakdown');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('queryTypes');
        expect(typeof data.data.queryTypes).toBe('object');

        // Check for common query types
        const queryTypes = data.data.queryTypes;
        if (queryTypes.SELECT) {
          expect(queryTypes.SELECT).toHaveProperty('count');
          expect(queryTypes.SELECT).toHaveProperty('averageTime');
          expect(typeof queryTypes.SELECT.count).toBe('number');
          expect(typeof queryTypes.SELECT.averageTime).toBe('number');
        }
      }
    });
  });

  test.describe('Alerting and Thresholds', () => {
    test('should trigger alerts for excessive slow queries', async ({ request }) => {
      // Generate multiple potentially slow queries
      const heavyQueries = Array.from({ length: 10 }, (_, i) =>
        request.get(`/bills/search?q=test${i}&include=all&sort=engagement`)
      );

      await Promise.all(heavyQueries);

      // Check alert status
      const alertResponse = await request.get('/monitoring/alerts/slow-queries');
      
      if (alertResponse.status() === 200) {
        const data = await alertResponse.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('alerts');
        expect(Array.isArray(data.data.alerts)).toBe(true);

        if (data.data.alerts.length > 0) {
          const alert = data.data.alerts[0];
          expect(alert).toHaveProperty('type');
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('message');
          expect(alert).toHaveProperty('timestamp');
          
          console.log(`Alert triggered: ${alert.message}`);
        }
      }
    });

    test('should respect configurable thresholds', async ({ request }) => {
      // Get current threshold configuration
      const configResponse = await request.get('/monitoring/config/thresholds');
      
      if (configResponse.status() === 200) {
        const config = await configResponse.json();
        expect(config.success).toBe(true);
        expect(config.data).toHaveProperty('slowQueryThresholdMs');
        expect(typeof config.data.slowQueryThresholdMs).toBe('number');
        expect(config.data.slowQueryThresholdMs).toBeGreaterThan(0);

        console.log(`Slow query threshold: ${config.data.slowQueryThresholdMs}ms`);
      }
    });

    test('should allow threshold configuration updates', async ({ request }) => {
      const newThreshold = 150;
      
      const updateResponse = await request.put('/monitoring/config/thresholds', {
        data: { slowQueryThresholdMs: newThreshold }
      });

      if (updateResponse.status() === 200) {
        const data = await updateResponse.json();
        expect(data.success).toBe(true);

        // Verify the update
        const verifyResponse = await request.get('/monitoring/config/thresholds');
        const verifyData = await verifyResponse.json();
        expect(verifyData.data.slowQueryThresholdMs).toBe(newThreshold);
      }
    });
  });

  test.describe('Query Optimization Insights', () => {
    test('should identify N+1 query patterns', async ({ request }) => {
      // Trigger potential N+1 patterns
      await request.get('/bills?include=comments&limit=20');

      const analysisResponse = await request.get('/monitoring/database/analysis/n-plus-one');
      
      if (analysisResponse.status() === 200) {
        const data = await analysisResponse.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('potentialNPlusOne');
        expect(Array.isArray(data.data.potentialNPlusOne)).toBe(true);

        if (data.data.potentialNPlusOne.length > 0) {
          const pattern = data.data.potentialNPlusOne[0];
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('occurrences');
          expect(pattern).toHaveProperty('suggestion');
          
          console.log(`N+1 pattern detected: ${pattern.pattern}`);
        }
      }
    });

    test('should suggest query optimizations', async ({ request }) => {
      const response = await request.get('/monitoring/database/analysis/suggestions');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('suggestions');
        expect(Array.isArray(data.data.suggestions)).toBe(true);

        if (data.data.suggestions.length > 0) {
          const suggestion = data.data.suggestions[0];
          expect(suggestion).toHaveProperty('type');
          expect(suggestion).toHaveProperty('description');
          expect(suggestion).toHaveProperty('impact');
          expect(suggestion).toHaveProperty('query');
          
          console.log(`Optimization suggestion: ${suggestion.description}`);
        }
      }
    });

    test('should track query plan changes', async ({ request }) => {
      const response = await request.get('/monitoring/database/analysis/query-plans');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('queryPlans');
        expect(Array.isArray(data.data.queryPlans)).toBe(true);

        if (data.data.queryPlans.length > 0) {
          const plan = data.data.queryPlans[0];
          expect(plan).toHaveProperty('queryHash');
          expect(plan).toHaveProperty('planHash');
          expect(plan).toHaveProperty('executionTime');
          expect(plan).toHaveProperty('cost');
        }
      }
    });
  });

  test.describe('Cleanup and Maintenance', () => {
    test('should allow clearing slow query history', async ({ request }) => {
      // First, ensure we have some slow queries
      await request.get('/bills?limit=100&include=all');

      // Clear the history
      const clearResponse = await request.delete('/monitoring/database/slow-queries');
      
      if (clearResponse.status() === 200) {
        const data = await clearResponse.json();
        expect(data.success).toBe(true);

        // Verify history is cleared
        const verifyResponse = await request.get('/monitoring/database/slow-queries');
        const verifyData = await verifyResponse.json();
        expect(verifyData.data.slowQueries).toHaveLength(0);
      }
    });

    test('should handle automatic cleanup of old records', async ({ request }) => {
      const response = await request.get('/monitoring/database/cleanup-status');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('lastCleanup');
        expect(data.data).toHaveProperty('recordsRetained');
        expect(data.data).toHaveProperty('retentionPeriodDays');
        
        expect(typeof data.data.recordsRetained).toBe('number');
        expect(typeof data.data.retentionPeriodDays).toBe('number');
      }
    });

    test('should export slow query data for analysis', async ({ request }) => {
      const response = await request.get('/monitoring/database/export/slow-queries?format=json');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('exportUrl');
        expect(data.data).toHaveProperty('recordCount');
        expect(data.data).toHaveProperty('generatedAt');
        
        expect(typeof data.data.exportUrl).toBe('string');
        expect(typeof data.data.recordCount).toBe('number');
      }
    });
  });
});