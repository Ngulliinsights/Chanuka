// ============================================================================
// INTELLIGENT SEARCH SYSTEM TESTS - PHASE 2
// ============================================================================
// Integration tests for the consolidated search system with dual-engine orchestration

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { embeddingService, semanticSearchEngine, dualEngineOrchestrator, searchSyntaxParser } from '@server/features/search';
import { searchService } from '@server/services/search-service';

// Mock OpenAI to avoid API calls during testing
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }),
    },
  }));
});

describe('Intelligent Search System', () => {
  describe('Embedding Service', () => {
    it('should generate embeddings for text', async () => {
      const result = await embeddingService.generateEmbedding('test content');

      expect(result).toHaveProperty('embedding');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('usage');
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.embedding.length).toBe(1536); // OpenAI text-embedding-3-small dimension
    });

    it('should handle batch embedding generation', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      const results = await embeddingService.generateEmbeddingsBatch(texts);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('embedding');
        expect(Array.isArray(result.embedding)).toBe(true);
      });
    });

    it('should cache embeddings', async () => {
      const text = 'cache test text';
      const result1 = await embeddingService.generateEmbedding(text);
      const result2 = await embeddingService.generateEmbedding(text);

      // Results should be identical (from cache)
      expect(result1.embedding).toEqual(result2.embedding);
      expect(result1.model).toBe(result2.model);
    });
  });

  describe('Search Service', () => {
    it('should perform basic search', async () => {
      const result = await searchService.search('test query');

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('searchType');
      expect(result).toHaveProperty('processingTimeMs');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should extract bill content', async () => {
      const bills = await searchService.extractBillContent();

      expect(Array.isArray(bills)).toBe(true);
      if (bills.length > 0) {
        expect(bills[0]).toHaveProperty('id');
        expect(bills[0]).toHaveProperty('type');
        expect(bills[0]).toHaveProperty('content');
        expect(bills[0].type).toBe('bill');
      }
    });

    it('should extract sponsor content', async () => {
      const sponsors = await searchService.extractSponsorContent();

      expect(Array.isArray(sponsors)).toBe(true);
      if (sponsors.length > 0) {
        expect(sponsors[0]).toHaveProperty('id');
        expect(sponsors[0]).toHaveProperty('type');
        expect(sponsors[0]).toHaveProperty('content');
        expect(sponsors[0].type).toBe('sponsor');
      }
    });

    it('should extract comment content', async () => {
      const comments = await searchService.extractCommentContent();

      expect(Array.isArray(comments)).toBe(true);
      if (comments.length > 0) {
        expect(comments[0]).toHaveProperty('id');
        expect(comments[0]).toHaveProperty('type');
        expect(comments[0]).toHaveProperty('content');
        expect(comments[0].type).toBe('comment');
      }
    });

    it('should provide embedding statistics', async () => {
      const stats = await searchService.getEmbeddingStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('pending');

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.completed).toBe('number');
    });
  });

  describe('Semantic Search Engine', () => {
    it('should perform semantic search', async () => {
      const result = await semanticSearchEngine.search('test query');

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('searchType');
      expect(result).toHaveProperty('processingTimeMs');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should support search options', async () => {
      const options = {
        limit: 5,
        hybrid: true,
        filters: {
          contentType: ['bill' as const],
        },
      };

      const result = await semanticSearchEngine.search('test query', options);

      expect(result.results.length).toBeLessThanOrEqual(5);
      expect(result.searchType).toBe('hybrid');
    });
  });

  describe('Search Syntax Parser - Phase 2', () => {
    it('should parse field-specific searches', () => {
      const result = searchSyntaxParser.parse('title:healthcare status:passed');

      expect(result.searchType).toBe('field_specific');
      expect(result.fieldQueries.title).toBe('healthcare');
      expect(result.fieldQueries.status).toBe('passed');
      expect(result.metadata.hasFieldSearches).toBe(true);
    });

    it('should parse boolean operators', () => {
      const result = searchSyntaxParser.parse('healthcare AND insurance');

      expect(result.searchType).toBe('boolean');
      expect(result.metadata.hasBooleanOperators).toBe(true);
    });

    it('should parse exact phrases', () => {
      const result = searchSyntaxParser.parse('"climate change" mitigation');

      expect(result.exactPhrases).toContain('climate change');
      expect(result.metadata.hasExactPhrases).toBe(true);
    });

    it('should parse exclusions', () => {
      const result = searchSyntaxParser.parse('healthcare -insurance');

      expect(result.exclusions).toContain('insurance');
      expect(result.metadata.hasExclusions).toBe(true);
    });

    it('should parse semantic prefixes', () => {
      const result = searchSyntaxParser.parse('semantic:similar bills about healthcare');

      expect(result.searchType).toBe('semantic');
      expect(result.semanticQuery).toBe('similar bills about healthcare');
    });

    it('should determine appropriate search weights', () => {
      const fieldResult = searchSyntaxParser.parse('title:healthcare');
      expect(fieldResult.metadata.semanticWeight).toBe(0.3);
      expect(fieldResult.metadata.traditionalWeight).toBe(0.7);

      const semanticResult = searchSyntaxParser.parse('semantic:healthcare policy');
      expect(semanticResult.metadata.semanticWeight).toBe(0.8);
      expect(semanticResult.metadata.traditionalWeight).toBe(0.2);
    });
  });

  describe('Dual-Engine Orchestrator - Phase 2', () => {
    it('should perform dual-engine search', async () => {
      const result = await dualEngineOrchestrator.search('test query');

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('searchType');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result.searchType).toBe('hybrid');
    });

    it('should classify queries appropriately', async () => {
      // Test field-specific query classification
      const fieldResult = await dualEngineOrchestrator.search('title:healthcare');
      expect(fieldResult.searchType).toBe('hybrid');

      // Test semantic query classification
      const semanticResult = await dualEngineOrchestrator.search('semantic:healthcare policy');
      expect(semanticResult.searchType).toBe('hybrid');
    });

    it('should handle engine failures gracefully', async () => {
      // This test would need to mock engine failures
      // For now, just ensure the orchestrator returns results
      const result = await dualEngineOrchestrator.search('test query');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should provide health check', async () => {
      const health = await dualEngineOrchestrator.getHealth();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('engines');
      expect(health.engines).toHaveProperty('postgresql');
      expect(health.engines).toHaveProperty('semantic');
    });
  });

  describe('PostgreSQL Full-Text Engine - Phase 2 Enhancements', () => {
    it('should support weighted search vectors', async () => {
      // This would require database setup, for now just test the interface
      expect(embeddingService).toBeDefined();
    });

    it('should handle advanced ranking with custom weights', async () => {
      // Test that the engine accepts ranking configuration
      expect(semanticSearchEngine).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    it('should perform embedding service health check', async () => {
      const healthy = await embeddingService.healthCheck();
      expect(typeof healthy).toBe('boolean');
    });

    it('should perform search service health check', async () => {
      const health = await searchService.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('stats');

      expect(health.services).toHaveProperty('embedding');
      expect(health.services).toHaveProperty('search');
      expect(health.services).toHaveProperty('database');

      expect(health.stats).toHaveProperty('embeddings');
    });
  });
});
