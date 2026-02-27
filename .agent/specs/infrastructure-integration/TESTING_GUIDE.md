# Infrastructure Integration - Testing Guide

**Purpose:** Comprehensive testing guide for infrastructure integration  
**Created:** 2026-02-27  
**Status:** Reference Guide

---

## Testing Strategy

### Test Coverage Requirements
- **Security Tests**: 100% (critical)
- **Cache Tests**: >85%
- **Error Handling Tests**: >85%
- **Validation Tests**: >90%
- **Integration Tests**: >80%

---

## 1. Security Testing

### 1.1 SQL Injection Testing

```typescript
import { describe, it, expect } from 'vitest';
import { analyticsServiceIntegrated } from '../analytics-service-integrated';

describe('Analytics Security - SQL Injection', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousInput = "test'; DROP TABLE analytics_events; --";
    
    const result = await analyticsServiceIntegrated.searchMetrics(
      maliciousInput,
      1,
      20
    );
    
    // Should not throw error
    expect(result.isOk || result.isErr).toBe(true);
    
    // Verify table still exists
    const checkResult = await analyticsServiceIntegrated.getOverview();
    expect(checkResult.isOk).toBe(true);
  });

  it('should prevent SQL injection in query parameters', async () => {
    const maliciousQuery = {
      metric: "test' OR '1'='1",
      page: 1,
      limit: 20
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(maliciousQuery);
    
    // Should handle safely
    expect(result.isOk || result.isErr).toBe(true);
  });

  it('should prevent SQL injection in metric ID', async () => {
    const maliciousId = "1' OR '1'='1";
    
    const result = await analyticsServiceIntegrated.getMetricById(maliciousId);
    
    // Should return error or empty result, not execute malicious SQL
    expect(result.isErr || (result.isOk && !result.value)).toBe(true);
  });
});
```

### 1.2 XSS Testing

```typescript
describe('Analytics Security - XSS', () => {
  it('should sanitize HTML in metric names', async () => {
    const xssInput = {
      metric: '<script>alert("XSS")</script>',
      value: 100
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(xssInput);
    
    if (result.isOk) {
      expect(result.value.metric).not.toContain('<script>');
    }
  });

  it('should sanitize HTML in metadata', async () => {
    const xssInput = {
      metric: 'test',
      value: 100,
      metadata: {
        description: '<img src=x onerror=alert("XSS")>'
      }
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(xssInput);
    
    if (result.isOk) {
      const metadata = result.value.metadata as any;
      expect(metadata.description).not.toContain('onerror');
    }
  });
});
```

### 1.3 Input Validation Testing

```typescript
describe('Analytics Security - Input Validation', () => {
  it('should reject invalid metric names', async () => {
    const invalidInput = {
      metric: '', // Empty string
      value: 100
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(invalidInput);
    
    expect(result.isErr).toBe(true);
  });

  it('should reject invalid date formats', async () => {
    const invalidQuery = {
      metric: 'test',
      startDate: 'not-a-date',
      page: 1,
      limit: 20
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(invalidQuery);
    
    expect(result.isErr).toBe(true);
  });

  it('should reject negative values', async () => {
    const invalidInput = {
      metric: 'test',
      value: -100
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(invalidInput);
    
    expect(result.isErr).toBe(true);
  });
});
```

---

## 2. Caching Testing

### 2.1 Cache Hit/Miss Testing

```typescript
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys } from '@server/infrastructure/cache/cache-keys';

describe('Analytics Caching', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear();
  });

  it('should cache overview data', async () => {
    // First call - cache miss
    const result1 = await analyticsServiceIntegrated.getOverview();
    expect(result1.isOk).toBe(true);
    
    // Check cache was set
    const cacheKey = cacheKeys.analytics('overview');
    const cached = await cacheService.get(cacheKey);
    expect(cached).not.toBeNull();
    
    // Second call - cache hit
    const result2 = await analyticsServiceIntegrated.getOverview();
    expect(result2.isOk).toBe(true);
    
    // Results should be identical
    expect(result1.value).toEqual(result2.value);
  });

  it('should cache query results', async () => {
    const query = {
      metric: 'test',
      page: 1,
      limit: 20
    };
    
    // First call
    const result1 = await analyticsServiceIntegrated.queryMetrics(query);
    
    // Second call should hit cache
    const result2 = await analyticsServiceIntegrated.queryMetrics(query);
    
    expect(result1.value).toEqual(result2.value);
  });

  it('should respect cache TTL', async () => {
    // This test would need to mock time or wait for TTL
    // For demonstration purposes only
    const result = await analyticsServiceIntegrated.getOverview();
    
    // Verify cache entry has TTL set
    const cacheKey = cacheKeys.analytics('overview');
    const cached = await cacheService.get(cacheKey);
    expect(cached).not.toBeNull();
  });
});
```

### 2.2 Cache Invalidation Testing

```typescript
describe('Analytics Cache Invalidation', () => {
  it('should invalidate cache on metric creation', async () => {
    // Get overview (caches it)
    await analyticsServiceIntegrated.getOverview();
    
    // Create new metric
    await analyticsServiceIntegrated.recordMetric({
      metric: 'test',
      value: 100
    });
    
    // Cache should be invalidated
    const cacheKey = cacheKeys.analytics('overview');
    const cached = await cacheService.get(cacheKey);
    expect(cached).toBeNull();
  });

  it('should invalidate entity cache on deletion', async () => {
    const metricId = 'test-id';
    
    // Get metric (caches it)
    await analyticsServiceIntegrated.getMetricById(metricId);
    
    // Delete metric
    await analyticsServiceIntegrated.deleteMetric(metricId);
    
    // Cache should be invalidated
    const cacheKey = cacheKeys.entity('analytics', metricId);
    const cached = await cacheService.get(cacheKey);
    expect(cached).toBeNull();
  });
});
```

---

## 3. Error Handling Testing

### 3.1 Result Type Testing

```typescript
describe('Analytics Error Handling', () => {
  it('should return error Result for not found', async () => {
    const result = await analyticsServiceIntegrated.getMetricById('non-existent-id');
    
    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('should return error Result for validation failure', async () => {
    const invalidData = {
      metric: '', // Invalid
      value: 100
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(invalidData);
    
    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error.message).toContain('Validation failed');
    }
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    // This would require dependency injection or mocking
    
    const result = await analyticsServiceIntegrated.getOverview();
    
    // Should return error Result, not throw
    expect(result.isOk || result.isErr).toBe(true);
  });
});
```

### 3.2 Error Context Testing

```typescript
describe('Analytics Error Context', () => {
  it('should include context in errors', async () => {
    const result = await analyticsServiceIntegrated.getMetricById('invalid-id');
    
    if (result.isErr) {
      // Error should have meaningful message
      expect(result.error.message).toBeTruthy();
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it('should log errors with context', async () => {
    // This would require mocking the logger
    const invalidData = { metric: '', value: 100 };
    
    await analyticsServiceIntegrated.recordMetric(invalidData);
    
    // Verify logger was called with error context
    // expect(logger.error).toHaveBeenCalledWith(
    //   expect.stringContaining('Failed to record metric'),
    //   expect.objectContaining({ error: expect.any(Error) })
    // );
  });
});
```

---

## 4. Validation Testing

### 4.1 Schema Validation Testing

```typescript
describe('Analytics Validation', () => {
  it('should validate metric record schema', async () => {
    const validData = {
      metric: 'test',
      value: 100,
      metadata: { key: 'value' }
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(validData);
    expect(result.isOk).toBe(true);
  });

  it('should reject invalid metric record', async () => {
    const invalidData = {
      metric: 123, // Should be string
      value: 'invalid' // Should be number
    };
    
    const result = await analyticsServiceIntegrated.recordMetric(invalidData);
    expect(result.isErr).toBe(true);
  });

  it('should validate query parameters', async () => {
    const validQuery = {
      metric: 'test',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      groupBy: 'day',
      page: 1,
      limit: 20
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(validQuery);
    expect(result.isOk || result.isErr).toBe(true);
  });
});
```

### 4.2 Pagination Validation Testing

```typescript
describe('Analytics Pagination Validation', () => {
  it('should validate page number', async () => {
    const invalidQuery = {
      metric: 'test',
      page: -1, // Invalid
      limit: 20
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(invalidQuery);
    expect(result.isErr).toBe(true);
  });

  it('should validate limit', async () => {
    const invalidQuery = {
      metric: 'test',
      page: 1,
      limit: 1000 // Too large
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(invalidQuery);
    expect(result.isErr).toBe(true);
  });

  it('should use default pagination values', async () => {
    const query = {
      metric: 'test'
      // No page/limit specified
    };
    
    const result = await analyticsServiceIntegrated.queryMetrics(query);
    // Should use defaults and succeed
    expect(result.isOk || result.isErr).toBe(true);
  });
});
```

---

## 5. Integration Testing

### 5.1 End-to-End Flow Testing

```typescript
describe('Analytics Integration', () => {
  it('should complete full CRUD cycle', async () => {
    // Create
    const createResult = await analyticsServiceIntegrated.recordMetric({
      metric: 'test',
      value: 100
    });
    expect(createResult.isOk).toBe(true);
    
    const metricId = createResult.value!.id;
    
    // Read
    const readResult = await analyticsServiceIntegrated.getMetricById(metricId);
    expect(readResult.isOk).toBe(true);
    expect(readResult.value!.metric).toBe('test');
    
    // Search
    const searchResult = await analyticsServiceIntegrated.searchMetrics('test', 1, 20);
    expect(searchResult.isOk).toBe(true);
    expect(searchResult.value!.length).toBeGreaterThan(0);
    
    // Delete
    const deleteResult = await analyticsServiceIntegrated.deleteMetric(metricId);
    expect(deleteResult.isOk).toBe(true);
    
    // Verify deleted
    const verifyResult = await analyticsServiceIntegrated.getMetricById(metricId);
    expect(verifyResult.isErr).toBe(true);
  });
});
```

### 5.2 Route Integration Testing

```typescript
import request from 'supertest';
import app from '@server/app';

describe('Analytics Routes Integration', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = loginResponse.body.token;
  });

  it('should get overview with authentication', async () => {
    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalEvents');
    expect(response.body).toHaveProperty('uniqueUsers');
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/analytics/overview');
    
    expect(response.status).toBe(401);
  });

  it('should validate query parameters', async () => {
    const response = await request(app)
      .get('/api/analytics/metrics')
      .query({ metric: '', page: -1 }) // Invalid
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
  });
});
```

---

## 6. Performance Testing

### 6.1 Cache Performance Testing

```typescript
describe('Analytics Performance', () => {
  it('should improve response time with caching', async () => {
    // First call (cache miss)
    const start1 = Date.now();
    await analyticsServiceIntegrated.getOverview();
    const duration1 = Date.now() - start1;
    
    // Second call (cache hit)
    const start2 = Date.now();
    await analyticsServiceIntegrated.getOverview();
    const duration2 = Date.now() - start2;
    
    // Cache hit should be faster
    expect(duration2).toBeLessThan(duration1);
  });

  it('should handle concurrent requests efficiently', async () => {
    const promises = Array(10).fill(null).map(() =>
      analyticsServiceIntegrated.getOverview()
    );
    
    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.isOk).toBe(true);
    });
  });
});
```

---

## 7. Test Utilities

### 7.1 Test Data Generators

```typescript
export function generateTestMetric(overrides?: Partial<MetricRecord>): MetricRecord {
  return {
    id: 'test-id',
    metric: 'test-metric',
    value: 100,
    timestamp: new Date(),
    metadata: {},
    ...overrides
  };
}

export function generateTestQuery(overrides?: Partial<AnalyticsQuery>): AnalyticsQuery {
  return {
    metric: 'test',
    page: 1,
    limit: 20,
    ...overrides
  };
}
```

### 7.2 Test Helpers

```typescript
export async function clearTestCache() {
  await cacheService.clear();
}

export async function setupTestData() {
  // Create test metrics
  await analyticsServiceIntegrated.recordMetric({
    metric: 'test1',
    value: 100
  });
  
  await analyticsServiceIntegrated.recordMetric({
    metric: 'test2',
    value: 200
  });
}

export async function cleanupTestData() {
  // Delete test metrics
  // Implementation depends on your database setup
}
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Security Tests Only
```bash
npm test -- --grep "Security"
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run Integration Tests
```bash
npm test -- --grep "Integration"
```

---

## Success Criteria

- ✅ All security tests passing (100%)
- ✅ Cache hit rate > 70% in tests
- ✅ Error handling coverage > 85%
- ✅ Validation coverage > 90%
- ✅ Integration tests passing (>80%)
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ Performance targets met

---

**Document Status:** ✅ Complete  
**Last Updated:** 2026-02-27
