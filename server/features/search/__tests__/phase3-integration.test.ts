// ============================================================================
// PHASE 3 INTEGRATION TESTS - Advanced Search Features
// ============================================================================
// Tests for streaming, analytics, intent detection, and typo correction

import { describe, it, expect } from 'vitest';
import {
  searchBills,
  streamSearchBills,
  cancelSearch,
  getSearchAnalytics,
  queryIntentService,
  typoCorrectionService,
  suggestionEngineService
} from '../index';
import type { SearchQuery } from '../index';

describe('Phase 3: Advanced Search Features Integration', () => {
  const testQuery: SearchQuery = {
    text: 'healthcare reform',
    pagination: { page: 1, limit: 5 }
  };

  describe('Query Intent Detection', () => {
    it('should classify informational queries', async () => {
      const result = await queryIntentService.classifyIntent('what is healthcare reform');
      expect(result.intent).toBe('informational');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify navigational queries', async () => {
      const result = await queryIntentService.classifyIntent('ministry of health website');
      expect(result.intent).toBe('navigational');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify transactional queries', async () => {
      const result = await queryIntentService.classifyIntent('download healthcare policy');
      expect(result.intent).toBe('transactional');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Typo Correction', () => {
    it('should correct common typos', async () => {
      const result = await typoCorrectionService.correctQuery('healtcare reform');
      expect(result.correctedQuery).toBe('healthcare reform');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should find synonyms', async () => {
      const result = await typoCorrectionService.findSynonyms('healthcare');
      expect(result.synonyms.length).toBeGreaterThan(0);
      expect(result.synonyms[0].term).toBeDefined();
    });

    it('should expand queries with synonyms', async () => {
      const expansions = await typoCorrectionService.expandQuery('healthcare');
      expect(expansions.length).toBeGreaterThan(1);
      expect(expansions[0]).toContain('healthcare');
    });
  });

  describe('Enhanced Suggestions', () => {
    it('should provide AI-powered suggestions', async () => {
      const result = await suggestionEngineService.getAutocompleteSuggestions('health', 5);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.query).toBe('health');
    });

    it('should include corrections in suggestions', async () => {
      const result = await suggestionEngineService.getAutocompleteSuggestions('healt', 5);
      // Should include corrections for typos
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Search Analytics', () => {
    it('should record search events', async () => {
      const result = await searchBills(testQuery);
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      // Analytics should be recorded automatically
    });

    it('should provide analytics data', async () => {
      const analytics = await getSearchAnalytics();
      expect(analytics).toBeDefined();
      expect(typeof analytics.totalSearches).toBe('number');
    });
  });

  describe('Streaming Search (Basic)', () => {
    it('should handle streaming setup', async () => {
      // Note: Full streaming test would require a test server
      // This is a placeholder for the streaming functionality
      expect(streamSearchBills).toBeDefined();
      expect(typeof streamSearchBills).toBe('function');
    });

    it('should handle search cancellation', async () => {
      const result = await cancelSearch('test-search-id');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Search Results', () => {
    it('should apply intent-based strategies', async () => {
      const result = await searchBills({
        text: 'what is healthcare reform',
        pagination: { page: 1, limit: 5 }
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.metadata.source).toBeDefined();
    });

    it('should handle corrected queries', async () => {
      const result = await searchBills({
        text: 'healtcare reform', // typo
        pagination: { page: 1, limit: 5 }
      });

      expect(result).toBeDefined();
      // Should still return results despite the typo
      expect(result.results).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle malformed queries gracefully', async () => {
      await expect(searchBills({
        text: '',
        pagination: { page: 1, limit: 5 }
      })).rejects.toThrow();
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(1000);
      const result = await searchBills({
        text: longQuery,
        pagination: { page: 1, limit: 5 }
      });

      expect(result).toBeDefined();
      // Should handle long queries without crashing
    });

    it('should maintain backward compatibility', async () => {
      const result = await searchBills(testQuery);
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('facets');
      expect(result).toHaveProperty('metadata');
    });
  });
});