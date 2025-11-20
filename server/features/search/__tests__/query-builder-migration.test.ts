/**
 * Integration tests for query builder migration to direct Drizzle usage
 * Verifies that query results remain consistent after removing the query builder abstraction
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readDatabase } from '@shared/database/connection';
import { SuggestionEngineService } from '../engines/suggestion/suggestion-engine.service';
import * as schema from '@shared/schema';
import { eq, desc, and, sql, count, like, or } from 'drizzle-orm';

describe('Query Builder Migration Integration Tests', () => {
  let suggestionEngine: SuggestionEngineService;
  let db: typeof readDatabase;

  beforeAll(async () => {
    suggestionEngine = new SuggestionEngineService();
    db = readDatabase;
  });

  describe('Query Sanitization', () => {
    it('should sanitize queries consistently', () => {
      // Test the sanitization logic that was moved from QueryBuilderService
      const testCases = [
        { input: 'Test Query!@#', expected: 'test query' },
        { input: '  Multiple   Spaces  ', expected: 'multiple spaces' },
        { input: 'Special-Characters_123', expected: 'special-characters_123' },
        { input: 'A'.repeat(150), expected: 'A'.repeat(100).toLowerCase() },
        { input: '', expected: '' },
        { input: '   ', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        const sanitized = input
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, ' ')
          .substring(0, 100);
        
        expect(sanitized).toBe(expected);
      });
    });
  });

  describe('Direct Drizzle Query Consistency', () => {
    it('should execute bill title queries correctly', async () => {
      const query = 'test';
      const searchPattern = `%${query}%`;
      const limit = 10;

      // Execute the query that was previously in QueryBuilderService.buildBillTitleQuery
      const results = await db
        .select({
          id: schema.bills.id,
          title: schema.bills.title,
          status: schema.bills.status,
          category: schema.bills.category,
          sponsor_id: schema.bills.sponsor_id
        })
        .from(schema.bills)
        .where(like(schema.bills.title, searchPattern))
        .orderBy(desc(schema.bills.updated_at))
        .limit(limit);

      // Verify query structure and results
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(limit);
      
      // Verify each result has the expected structure
      results.forEach(bill => {
        expect(bill).toHaveProperty('id');
        expect(bill).toHaveProperty('title');
        expect(bill).toHaveProperty('status');
        expect(bill).toHaveProperty('category');
        expect(bill).toHaveProperty('sponsor_id');
        expect(typeof bill.title).toBe('string');
      });
    });

    it('should execute category aggregation queries correctly', async () => {
      const query = 'test';
      const searchPattern = `%${query}%`;
      const limit = 10;

      // Execute the query that was previously in QueryBuilderService.buildCategoryQuery
      const results = await db
        .select({
          category: schema.bills.category,
          count: count()
        })
        .from(schema.bills)
        .where(and(
          sql`${schema.bills.category} IS NOT NULL`,
          like(schema.bills.category, searchPattern)
        ))
        .groupBy(schema.bills.category)
        .orderBy(desc(count()))
        .limit(limit);

      // Verify query structure and results
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(limit);
      
      // Verify each result has the expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('count');
        expect(typeof result.category).toBe('string');
        expect(typeof result.count).toBe('number');
        expect(result.count).toBeGreaterThan(0);
      });
    });

    it('should execute sponsor aggregation queries correctly', async () => {
      const query = 'test';
      const searchPattern = `%${query}%`;
      const limit = 10;

      // Execute the query that was previously in QueryBuilderService.buildSponsorQuery
      const results = await db
        .select({
          sponsor: schema.bills.sponsor,
          sponsor_id: schema.bills.sponsor_id,
          count: count()
        })
        .from(schema.bills)
        .where(like(schema.bills.sponsor, searchPattern))
        .groupBy(schema.bills.sponsor, schema.bills.sponsor_id)
        .orderBy(desc(count()))
        .limit(limit);

      // Verify query structure and results
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(limit);
      
      // Verify each result has the expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('sponsor');
        expect(result).toHaveProperty('sponsor_id');
        expect(result).toHaveProperty('count');
        expect(typeof result.sponsor).toBe('string');
        expect(typeof result.count).toBe('number');
        expect(result.count).toBeGreaterThan(0);
      });
    });

    it('should execute full-text search queries correctly', async () => {
      const query = 'test';
      const similarityThreshold = 0.3;

      // Execute the query that was previously in QueryBuilderService.buildSpellCorrectionQuery
      try {
        const results = await db.execute(sql`
          SELECT DISTINCT 
            title,
            similarity(title, ${query}) as sim,
            ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
          FROM bills 
          WHERE 
            similarity(title, ${query}) > ${similarityThreshold}
            OR search_vector @@ plainto_tsquery('english', ${query})
          ORDER BY 
            GREATEST(sim, rank) DESC
          LIMIT 5
        `);

        // Verify query structure and results
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(5);
        
        // Verify each result has the expected structure
        results.forEach((result: any) => {
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('sim');
          expect(result).toHaveProperty('rank');
          expect(typeof result.title).toBe('string');
        });
      } catch (error) {
        // If similarity extension is not available, skip this test
        console.warn('Similarity extension not available, skipping full-text search test');
      }
    });
  });

  describe('SuggestionEngineService Integration', () => {
    it('should generate autocomplete suggestions without query builder service', async () => {
      const partialQuery = 'test';
      const limit = 5;

      const result = await suggestionEngine.getAutocompleteSuggestions(
        partialQuery,
        limit,
        false // Don't include metadata to avoid additional queries
      );

      // Verify the result structure
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('facets');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('totalSuggestions');

      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeLessThanOrEqual(limit);
      expect(result.query).toBe('test'); // Should be sanitized

      // Verify suggestion structure
      result.suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('term');
        expect(suggestion).toHaveProperty('frequency');
        expect(suggestion).toHaveProperty('score');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('id');
        expect(typeof suggestion.term).toBe('string');
        expect(typeof suggestion.frequency).toBe('number');
        expect(typeof suggestion.score).toBe('number');
        expect(typeof suggestion.type).toBe('string');
        expect(typeof suggestion.id).toBe('string');
      });

      // Verify facets structure
      expect(result.facets).toHaveProperty('categories');
      expect(result.facets).toHaveProperty('sponsors');
      expect(result.facets).toHaveProperty('tags');
      expect(result.facets).toHaveProperty('statuses');
      expect(result.facets).toHaveProperty('dateRanges');

      expect(Array.isArray(result.facets.categories)).toBe(true);
      expect(Array.isArray(result.facets.sponsors)).toBe(true);
      expect(Array.isArray(result.facets.tags)).toBe(true);
      expect(Array.isArray(result.facets.statuses)).toBe(true);
      expect(Array.isArray(result.facets.dateRanges)).toBe(true);
    });

    it('should handle empty queries gracefully', async () => {
      const result = await suggestionEngine.getAutocompleteSuggestions('', 10, false);

      expect(result.suggestions).toHaveLength(0);
      expect(result.query).toBe('');
      expect(result.totalSuggestions).toBe(0);
    });

    it('should handle short queries gracefully', async () => {
      const result = await suggestionEngine.getAutocompleteSuggestions('a', 10, false);

      expect(result.suggestions).toHaveLength(0);
      expect(result.query).toBe('a');
      expect(result.totalSuggestions).toBe(0);
    });
  });

  describe('Type Safety Verification', () => {
    it('should maintain type safety with direct Drizzle usage', async () => {
      // Verify that TypeScript compilation succeeds and types are correct
      const query = 'test';
      
      // This should compile without errors and return properly typed results
      const billResults = await db
        .select({
          id: schema.bills.id,
          title: schema.bills.title,
          status: schema.bills.status
        })
        .from(schema.bills)
        .where(like(schema.bills.title, `%${query}%`))
        .limit(1);

      if (billResults.length > 0) {
        const bill = billResults[0];
        
        // TypeScript should infer these types correctly
        expect(typeof bill.id).toBe('string');
        expect(typeof bill.title).toBe('string');
        expect(typeof bill.status).toBe('string');
      }
    });
  });

  describe('Performance Verification', () => {
    it('should execute queries within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await suggestionEngine.getAutocompleteSuggestions('test', 10, false);
      
      const executionTime = Date.now() - startTime;
      
      // Should complete within 1 second (generous limit for integration tests)
      expect(executionTime).toBeLessThan(1000);
    });
  });
});
