import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { suggestionEngineService } from '../engines/suggestion/index.js';
import { parallelQueryExecutor } from '@client/utils/parallel-query-executor';
import { historyCleanupService } from '@client/services/history-cleanup.service';
import { suggestionRankingService } from '../engines/suggestion/index.js';

describe('Search Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    AUTOCOMPLETE_MAX_TIME: 500, // 500ms
    PARALLEL_QUERY_MAX_TIME: 300, // 300ms
    RANKING_MAX_TIME: 100, // 100ms
    HISTORY_CLEANUP_MAX_TIME: 200, // 200ms
    MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  };

  beforeAll(async () => {
    // Warm up services
    await suggestionEngineService.getAutocompleteSuggestions('test', 5);
  });

  afterAll(() => {
    // Cleanup
    if (global.gc) {
      global.gc();
    }
  });

  describe('Autocomplete Performance', () => {
    it('should return autocomplete suggestions within performance threshold', async () => {
      const queries = ['health', 'climate', 'education', 'tech', 'infra'];
      const results = [];

      for (const query of queries) {
        const startTime = Date.now();
        const result = await suggestionEngineService.getAutocompleteSuggestions(query, 10);
        const duration = Date.now() - startTime;

        results.push({ query, duration, suggestionCount: result.suggestions.length });
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTOCOMPLETE_MAX_TIME);
        expect(result.suggestions).toBeDefined();
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Average autocomplete duration: ${avgDuration}ms`);
      
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTOCOMPLETE_MAX_TIME * 0.8);
    });

    it('should handle concurrent autocomplete requests efficiently', async () => {
      const concurrentQueries = Array(10).fill(0).map((_, i) => `query${i}`);
      
      const startTime = Date.now();
      const promises = concurrentQueries.map(query => 
        suggestionEngineService.getAutocompleteSuggestions(query, 5)
      );
      
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;
      
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTOCOMPLETE_MAX_TIME * 2);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.suggestions).toBeDefined();
      });
    });

    it('should maintain performance with large result sets', async () => {
      const startTime = Date.now();
      const result = await suggestionEngineService.getAutocompleteSuggestions('a', 50);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTOCOMPLETE_MAX_TIME * 1.5);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Parallel Query Executor Performance', () => {
    it('should execute parallel queries within threshold', async () => {
      const tasks = [
        {
          name: 'task1',
          query: () => new Promise(resolve => setTimeout(() => resolve('result1'), 50)),
          fallback: 'fallback1'
        },
        {
          name: 'task2', 
          query: () => new Promise(resolve => setTimeout(() => resolve('result2'), 75)),
          fallback: 'fallback2'
        },
        {
          name: 'task3',
          query: () => new Promise(resolve => setTimeout(() => resolve('result3'), 100)),
          fallback: 'fallback3'
        }
      ];

      const startTime = Date.now();
      const results = await parallelQueryExecutor.executeParallel(tasks);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PARALLEL_QUERY_MAX_TIME);
      expect(Object.keys(results)).toHaveLength(3);
      expect(results.task1.success).toBe(true);
      expect(results.task2.success).toBe(true);
      expect(results.task3.success).toBe(true);
    });

    it('should handle query failures gracefully without performance impact', async () => {
      const tasks = [
        {
          name: 'success',
          query: () => Promise.resolve('success'),
          fallback: 'fallback'
        },
        {
          name: 'failure',
          query: () => Promise.reject(new Error('Test error')),
          fallback: 'fallback'
        }
      ];

      const startTime = Date.now();
      const results = await parallelQueryExecutor.executeParallel(tasks);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PARALLEL_QUERY_MAX_TIME);
      expect(results.success.success).toBe(true);
      expect(results.failure.success).toBe(false);
      expect(results.failure.data).toBe('fallback');
    });

    it('should respect timeout settings', async () => {
      const tasks = [
        {
          name: 'timeout_task',
          query: () => new Promise(resolve => setTimeout(() => resolve('late'), 1000)),
          fallback: 'timeout_fallback',
          timeout: 100
        }
      ];

      const startTime = Date.now();
      const results = await parallelQueryExecutor.executeParallel(tasks);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should timeout quickly
      expect(results.timeout_task.success).toBe(false);
      expect(results.timeout_task.data).toBe('timeout_fallback');
    });
  });

  describe('Suggestion Ranking Performance', () => {
    it('should rank suggestions within performance threshold', async () => {
      const suggestions = Array(100).fill(0).map((_, i) => ({
        term: `suggestion ${i}`,
        type: 'bill_title' as const,
        frequency: Math.floor(Math.random() * 100),
        metadata: { bill_id: i  }
      }));

      const context = {
        query: 'suggestion',
        searchContext: { category: 'healthcare' },
        userHistory: ['suggestion 1', 'suggestion 5'],
        popularTerms: new Map([['suggestion', 50]])
      };

      const startTime = Date.now();
      const ranked = suggestionRankingService.rankSuggestions(suggestions, context);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RANKING_MAX_TIME);
      expect(ranked).toHaveLength(100);
      
      // Verify ranking order (higher scores should come first)
      for (let i = 1; i < ranked.length; i++) {
        const current = suggestionRankingService.calculateRelevanceScore(ranked[i], 'suggestion');
        const previous = suggestionRankingService.calculateRelevanceScore(ranked[i-1], 'suggestion');
        expect(current).toBeLessThanOrEqual(previous);
      }
    });

    it('should handle large suggestion sets efficiently', async () => {
      const largeSuggestionSet = Array(1000).fill(0).map((_, i) => ({
        term: `large suggestion ${i}`,
        type: 'category' as const,
        frequency: Math.floor(Math.random() * 1000),
        metadata: { category: `category${i % 10}` }
      }));

      const context = {
        query: 'large',
        searchContext: {},
        userHistory: [],
        popularTerms: new Map()
      };

      const startTime = Date.now();
      const ranked = suggestionRankingService.rankSuggestions(largeSuggestionSet, context);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RANKING_MAX_TIME * 2);
      expect(ranked).toHaveLength(1000);
    });

    it('should diversify suggestions without significant performance impact', async () => {
      const suggestions = [
        ...Array(20).fill(0).map((_, i) => ({ term: `bill ${i}`, type: 'bill_title' as const, frequency: 10 })),
        ...Array(20).fill(0).map((_, i) => ({ term: `sponsor ${i}`, type: 'sponsor' as const, frequency: 8 })),
        ...Array(20).fill(0).map((_, i) => ({ term: `category ${i}`, type: 'category' as const, frequency: 6 }))
      ];

      const startTime = Date.now();
      const diversified = suggestionRankingService.diversifySuggestions(suggestions, 5);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
      expect(diversified.length).toBeGreaterThan(0);
      
      // Check type distribution
      const typeCount = diversified.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.values(typeCount).forEach(count => {
        expect(count).toBeLessThanOrEqual(5); // Max per type
      });
    });
  });

  describe('History Cleanup Performance', () => {
    it('should cleanup large history efficiently', async () => {
      const largeHistory = new Map();
      
      // Create large history dataset
      for (let i = 0; i < 10000; i++) {
        largeHistory.set(`term${i}`, {
          term: `term${i}`,
          frequency: Math.floor(Math.random() * 100),
          lastAccessed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      const startTime = Date.now();
      const cleaned = historyCleanupService.cleanupHistory(largeHistory, {
        maxHistorySize: 5000,
        cleanupThreshold: 0.2
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HISTORY_CLEANUP_MAX_TIME);
      expect(cleaned.size).toBeLessThanOrEqual(5000);
      expect(cleaned.size).toBeGreaterThan(4000); // Should keep most entries
    });

    it('should handle frequent updates efficiently', async () => {
      const history = new Map();
      const terms = Array(100).fill(0).map((_, i) => `frequent_term_${i}`);

      const startTime = Date.now();
      
      // Simulate frequent updates
      for (let i = 0; i < 1000; i++) {
        const randomTerm = terms[Math.floor(Math.random() * terms.length)];
        historyCleanupService.updateHistoryEntry(history, randomTerm);
      }
      
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HISTORY_CLEANUP_MAX_TIME);
      expect(history.size).toBeLessThanOrEqual(100);
    });

    it('should merge multiple histories efficiently', async () => {
      const histories = Array(5).fill(0).map(() => {
        const history = new Map();
        for (let i = 0; i < 1000; i++) {
          history.set(`term${i}`, {
            term: `term${i}`,
            frequency: Math.floor(Math.random() * 50),
            lastAccessed: new Date()
          });
        }
        return history;
      });

      const startTime = Date.now();
      const merged = historyCleanupService.mergeHistories(histories);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HISTORY_CLEANUP_MAX_TIME);
      expect(merged.size).toBeGreaterThan(0);
      expect(merged.size).toBeLessThanOrEqual(1000); // Should deduplicate
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not exceed memory thresholds during intensive operations', async () => {
      const getMemoryUsage = () => {
        if (process.memoryUsage) {
          return process.memoryUsage().heapUsed;
        }
        return 0;
      };

      const initialMemory = getMemoryUsage();

      // Perform intensive operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(suggestionEngineService.getAutocompleteSuggestions(`query${i}`, 20));
      }
      
      await Promise.all(promises);
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE);
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained load without degradation', async () => {
      const iterations = 20;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await suggestionEngineService.getAutocompleteSuggestions(`load_test_${i}`, 10);
        const duration = Date.now() - startTime;
        durations.push(duration);
      }

      // Check that performance doesn't degrade significantly over time
      const firstHalf = durations.slice(0, iterations / 2);
      const secondHalf = durations.slice(iterations / 2);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
      
      // All requests should be within threshold
      durations.forEach(duration => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTOCOMPLETE_MAX_TIME);
      });
    });
  });
});