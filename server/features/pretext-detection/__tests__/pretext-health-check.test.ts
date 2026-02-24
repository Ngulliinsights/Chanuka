/**
 * Pretext Detection Health Check Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PretextHealthCheck } from '../infrastructure/pretext-health-check';

// Mock dependencies
vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../infrastructure/pretext-cache', () => ({
  PretextCache: vi.fn()
}));

vi.mock('../infrastructure/pretext-repository', () => ({
  PretextRepository: vi.fn()
}));

describe('PretextHealthCheck', () => {
  let healthCheck: PretextHealthCheck;
  let mockCache: any;
  let mockRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    const { PretextCache } = require('../infrastructure/pretext-cache');
    const { PretextRepository } = require('../infrastructure/pretext-repository');
    
    mockCache = {
      getStats: vi.fn().mockReturnValue({ size: 10, ttl: 300000 })
    };
    
    mockRepository = {
      getAlerts: vi.fn().mockResolvedValue([])
    };
    
    PretextCache.mockImplementation(() => mockCache);
    PretextRepository.mockImplementation(() => mockRepository);
    
    healthCheck = new PretextHealthCheck();
  });

  describe('check()', () => {
    it('should return healthy status when all components are working', async () => {
      const result = await healthCheck.check();

      expect(result.status).toBe('healthy');
      expect(result.details.cache).toBe(true);
      expect(result.details.database).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details.errors).toBeUndefined();
    });

    it('should return degraded status when cache fails but database works', async () => {
      mockCache.getStats.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await healthCheck.check();

      expect(result.status).toBe('degraded');
      expect(result.details.cache).toBe(false);
      expect(result.details.database).toBe(true);
      expect(result.details.errors).toBeDefined();
      expect(result.details.errors).toContain('Cache check failed: Cache error');
    });

    it('should return down status when database fails', async () => {
      mockRepository.getAlerts.mockRejectedValue(new Error('Database error'));

      const result = await healthCheck.check();

      expect(result.status).toBe('down');
      expect(result.details.database).toBe(false);
      expect(result.details.errors).toBeDefined();
      expect(result.details.errors).toContain('Database check failed: Database error');
    });

    it('should return down status when both cache and database fail', async () => {
      mockCache.getStats.mockImplementation(() => {
        throw new Error('Cache error');
      });
      mockRepository.getAlerts.mockRejectedValue(new Error('Database error'));

      const result = await healthCheck.check();

      expect(result.status).toBe('down');
      expect(result.details.cache).toBe(false);
      expect(result.details.database).toBe(false);
      expect(result.details.errors).toHaveLength(2);
    });

    it('should measure response time', async () => {
      const result = await healthCheck.check();

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle unexpected errors gracefully', async () => {
      mockCache.getStats.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      mockRepository.getAlerts.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await healthCheck.check();

      expect(result.status).toBe('down');
      expect(result.details.errors).toBeDefined();
    });
  });
});
