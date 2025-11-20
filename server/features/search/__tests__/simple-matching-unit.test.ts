// ============================================================================
// SIMPLE MATCHING ENGINE UNIT TESTS
// ============================================================================
// Unit tests for the optimized simple matching engine functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleMatchingEngine } from '../engines/core/simple-matching.engine.js';
import { SearchQuery, SearchResult } from '../engines/types/search.types.js';

// Mock the repository factory
vi.mock('../../../../infrastructure/database/repositories/repository-factory.js', () => ({
  repositoryFactory: {
    getSearchRepository: () => ({
      searchOptimizedSimple: vi.fn(),
      searchSimple: vi.fn()
    })
  }
}));

describe('SimpleMatchingEngine Unit Tests', () => {
  let searchEngine: SimpleMatchingEngine;
  let mockRepository: any;

  beforeEach(() => {
    // Clear all mocks and create fresh instances
    vi.clearAllMocks();
    searchEngine = new SimpleMatchingEngine();
    
    // Get the mocked repository
    const { repositoryFactory } = require('../../../../infrastructure/database/repositories/repository-factory.js');
    mockRepository = repositoryFactory.getSearchRepository();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical queries', async () => {
      const query1: SearchQuery = {
        query: 'test query',
        pagination: { limit: 20, offset: 0 }
      };
      
      const query2: SearchQuery = {
        query: 'test query',
        pagination: { limit: 20, offset: 0 }
      };

      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'bill',
          title: 'Test Bill',
          relevanceScore: 0.8,
          metadata: {}
        }
      ];

      mockRepository.searchOptimizedSimple.mockResolvedValue(mockResults);

      // First call
      await searchEngine.search(query1);
      
      // Second call should use cache
      await searchEngine.search(query2);

      // Should only call repository once due to caching
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(1);
    });

    it('should generate different cache keys for different queries', async () => {
      const query1: SearchQuery = {
        query: 'test query 1',
        pagination: { limit: 20, offset: 0 }
      };
      
      const query2: SearchQuery = {
        query: 'test query 2',
        pagination: { limit: 20, offset: 0 }
      };

      const mockResults: SearchResult[] = [];
      mockRepository.searchOptimizedSimple.mockResolvedValue(mockResults);

      await searchEngine.search(query1);
      await searchEngine.search(query2);

      // Should call repository twice for different queries
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(2);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache results after successful search', async () => {
      const query: SearchQuery = {
        query: 'budget bill',
        pagination: { limit: 20, offset: 0 }
      };

      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'bill',
          title: 'Budget Bill 2024',
          relevanceScore: 0.9,
          metadata: { billNumber: 'B001' }
        }
      ];

      mockRepository.searchOptimizedSimple.mockResolvedValue(mockResults);

      // First search
      const results1 = await searchEngine.search(query);
      
      // Second search (should use cache)
      const results2 = await searchEngine.search(query);

      expect(results1).toEqual(results2);
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(1);
      
      const cacheStats = searchEngine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      const query: SearchQuery = {
        query: 'test query',
        pagination: { limit: 20, offset: 0 }
      };

      mockRepository.searchOptimizedSimple.mockResolvedValue([]);

      await searchEngine.search(query);
      
      let cacheStats = searchEngine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      searchEngine.clearCache();
      
      cacheStats = searchEngine.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to simple search when optimized search fails', async () => {
      const query: SearchQuery = {
        query: 'test query',
        pagination: { limit: 20, offset: 0 }
      };

      const fallbackResults: SearchResult[] = [
        {
          id: '1',
          type: 'bill',
          title: 'Fallback Result',
          relevanceScore: 0.5,
          metadata: {}
        }
      ];

      // Mock optimized search to fail
      mockRepository.searchOptimizedSimple.mockRejectedValue(new Error('Database error'));
      
      // Mock simple search to succeed
      mockRepository.searchSimple.mockResolvedValue(fallbackResults);

      const results = await searchEngine.search(query);

      expect(results).toEqual(fallbackResults);
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(1);
      expect(mockRepository.searchSimple).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics correctly', async () => {
      const query: SearchQuery = {
        query: 'statistics test',
        pagination: { limit: 20, offset: 0 }
      };

      mockRepository.searchOptimizedSimple.mockResolvedValue([]);

      // Initial stats
      let stats = searchEngine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.totalEntries).toBe(0);

      // After first search
      await searchEngine.search(query);
      stats = searchEngine.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.totalEntries).toBe(1);

      // After cache hit
      await searchEngine.search(query);
      stats = searchEngine.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(1); // Hit count should increase
    });
  });

  describe('Query Normalization', () => {
    it('should normalize queries for consistent caching', async () => {
      const query1: SearchQuery = {
        query: '  Test Query  ', // Extra spaces
        pagination: { limit: 20, offset: 0 }
      };
      
      const query2: SearchQuery = {
        query: 'test query', // Different case, no extra spaces
        pagination: { limit: 20, offset: 0 }
      };

      mockRepository.searchOptimizedSimple.mockResolvedValue([]);

      await searchEngine.search(query1);
      await searchEngine.search(query2);

      // Should use cache for normalized queries
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination Handling', () => {
    it('should create different cache entries for different pagination', async () => {
      const baseQuery = { query: 'test' };
      
      const query1: SearchQuery = {
        ...baseQuery,
        pagination: { limit: 20, offset: 0 }
      };
      
      const query2: SearchQuery = {
        ...baseQuery,
        pagination: { limit: 10, offset: 0 }
      };

      mockRepository.searchOptimizedSimple.mockResolvedValue([]);

      await searchEngine.search(query1);
      await searchEngine.search(query2);

      // Different pagination should result in different cache entries
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(2);
    });
  });

  describe('Filter Handling', () => {
    it('should create different cache entries for different filters', async () => {
      const baseQuery = { query: 'test' };
      
      const query1: SearchQuery = {
        ...baseQuery,
        filters: { status: ['active'] }
      };
      
      const query2: SearchQuery = {
        ...baseQuery,
        filters: { status: ['inactive'] }
      };

      mockRepository.searchOptimizedSimple.mockResolvedValue([]);

      await searchEngine.search(query1);
      await searchEngine.search(query2);

      // Different filters should result in different cache entries
      expect(mockRepository.searchOptimizedSimple).toHaveBeenCalledTimes(2);
    });
  });
});
