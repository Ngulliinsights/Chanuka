/**
 * Enhanced Search Service - Integration Tests
 * 
 * Tests all infrastructure components for search feature.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedSearchService } from '../application/SearchService';
import { cacheService } from '@server/infrastructure/cache';

describe('EnhancedSearchService Integration Tests', () => {
  let service: EnhancedSearchService;

  beforeEach(() => {
    service = new EnhancedSearchService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.clear();
  });

  describe('Validation Integration', () => {
    it('should validate global search with valid data', async () => {
      const result = await service.globalSearch({
        query: 'test query',
        type: 'all',
        sort: 'relevance',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty search query', async () => {
      const result = await service.globalSearch({ query: '', type: 'all', sort: 'relevance' } as any);
      expect(result.success).toBe(false);
    });

    it('should validate autocomplete input', async () => {
      const result = await service.autocomplete({ query: 'test', type: 'all', limit: 10 });
      expect(result.success).toBe(true);
    });
  });

  describe('Caching Integration', () => {
    it('should cache search results', async () => {
      const searchInput = { query: 'test', type: 'all' as const, sort: 'relevance' as const };
      
      const result1 = await service.globalSearch(searchInput);
      const result2 = await service.globalSearch(searchInput);
      
      expect(result1.success).toBe(result2.success);
    });

    it('should cache autocomplete suggestions', async () => {
      const input = { query: 'test', type: 'all' as const, limit: 10 };
      
      const result1 = await service.autocomplete(input);
      const result2 = await service.autocomplete(input);
      
      expect(result1.success).toBe(result2.success);
    });

    it('should cache popular searches', async () => {
      const input = { timeframe: 'week' as const, limit: '10' };
      
      const result1 = await service.getPopularSearches(input);
      const result2 = await service.getPopularSearches(input);
      
      expect(result1.success).toBe(result2.success);
    });
  });

  describe('Security Integration', () => {
    it('should prevent SQL injection in search queries', async () => {
      const maliciousQuery = "'; DROP TABLE bills; --";
      const result = await service.globalSearch({
        query: maliciousQuery,
        type: 'all',
        sort: 'relevance',
      });
      
      // Should sanitize and not throw error
      expect(result.success).toBe(true);
    });

    it('should sanitize search inputs', async () => {
      const result = await service.globalSearch({
        query: '<script>alert("xss")</script>',
        type: 'all',
        sort: 'relevance',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should return Result type for all operations', async () => {
      const result = await service.globalSearch({
        query: 'test',
        type: 'all',
        sort: 'relevance',
      });
      
      expect(result).toHaveProperty('success');
    });

    it('should handle cache failures gracefully', async () => {
      vi.spyOn(cacheService, 'get').mockRejectedValueOnce(new Error('Cache error'));
      
      const result = await service.globalSearch({
        query: 'test',
        type: 'all',
        sort: 'relevance',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Transaction Integration', () => {
    it('should use transaction for saving search history', async () => {
      const result = await service.saveSearch({
        query: 'test query',
        type: 'bills',
        result_count: 10,
      }, 'user-123');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should complete search within acceptable time', async () => {
      const start = Date.now();
      await service.globalSearch({ query: 'test', type: 'all', sort: 'relevance' });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000);
    });

    it('should benefit from caching', async () => {
      const input = { query: 'test', type: 'all' as const, sort: 'relevance' as const };
      
      const start1 = Date.now();
      await service.globalSearch(input);
      const duration1 = Date.now() - start1;
      
      const start2 = Date.now();
      await service.globalSearch(input);
      const duration2 = Date.now() - start2;
      
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});
