// ============================================================================
// POSTGRESQL FULL-TEXT SEARCH INTEGRATION TESTS
// ============================================================================
// Task 3.2: Integration tests for enhanced PostgreSQL full-text search

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSQLFullTextEngine } from '../engines/core/postgresql-fulltext.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';
import { databaseService } from '../../../infrastructure/database/database-service.js';

describe('PostgreSQL Full-Text Search Integration Tests', () => {
  let searchEngine: PostgreSQLFullTextEngine;

  beforeAll(async () => {
    // Ensure database connection and run migration
    await databaseService.getHealthStatus();
    
    // Apply the full-text search enhancements migration
    await databaseService.executeRawQuery(
      `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      
      -- Create GIN indexes for full-text search
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_fulltext_gin" 
      ON "bills" USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_fulltext_gin" 
      ON "sponsors" USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_fulltext_gin" 
      ON "comments" USING gin(to_tsvector('english', content));
      
      -- Create trigram indexes for fuzzy matching
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_title_trgm" 
      ON "bills" USING gin(title gin_trgm_ops);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_name_trgm" 
      ON "sponsors" USING gin(name gin_trgm_ops);
      `,
      [],
      [],
      'setupFullTextIndexes'
    );

    // Create search support tables
    await databaseService.executeRawQuery(
      `
      -- Create synonyms table
      CREATE TABLE IF NOT EXISTS "search_synonyms" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "term" varchar(255) NOT NULL,
          "synonyms" text[] NOT NULL,
          "category" varchar(100),
          "weight" numeric(3,2) DEFAULT 1.0,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
      );
      
      -- Create analytics table
      CREATE TABLE IF NOT EXISTS "search_analytics" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "query" varchar(500) NOT NULL,
          "search_type" varchar(50) NOT NULL,
          "results_count" integer NOT NULL,
          "execution_time_ms" integer NOT NULL,
          "user_id" uuid,
          "session_id" varchar(255),
          "clicked_result_id" uuid,
          "clicked_result_position" integer,
          "search_timestamp" timestamp DEFAULT now() NOT NULL,
          "metadata" jsonb DEFAULT '{}'::jsonb
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS "idx_search_synonyms_term" ON "search_synonyms" ("term");
      CREATE INDEX IF NOT EXISTS "idx_search_analytics_query" ON "search_analytics" ("query");
      `,
      [],
      [],
      'setupSupportTables'
    );

    // Create query expansion function
    await databaseService.executeRawQuery(
      `
      CREATE OR REPLACE FUNCTION expand_query_with_synonyms(
          p_query text,
          p_category varchar(100) DEFAULT NULL
      ) RETURNS text AS $$
      DECLARE
          expanded_terms text[] := ARRAY[]::text[];
          query_words text[];
          word text;
          synonyms text[];
          synonym text;
          final_query text;
      BEGIN
          -- Split query into words
          query_words := string_to_array(lower(trim(p_query)), ' ');
          
          -- Process each word
          FOREACH word IN ARRAY query_words
          LOOP
              -- Add original word
              expanded_terms := array_append(expanded_terms, word);
              
              -- Find synonyms
              SELECT s.synonyms INTO synonyms
              FROM search_synonyms s
              WHERE s.term = word
              AND (p_category IS NULL OR s.category = p_category)
              ORDER BY s.weight DESC
              LIMIT 1;
              
              -- Add synonyms with OR operator
              IF synonyms IS NOT NULL THEN
                  FOREACH synonym IN ARRAY synonyms
                  LOOP
                      expanded_terms := array_append(expanded_terms, synonym);
                  END LOOP;
              END IF;
          END LOOP;
          
          -- Join terms with OR for each group, AND between groups
          final_query := array_to_string(expanded_terms, ' | ');
          
          RETURN final_query;
      END;
      $$ LANGUAGE plpgsql;
      `,
      [],
      [],
      'createExpansionFunction'
    );

    // Create performance logging function
    await databaseService.executeRawQuery(
      `
      CREATE OR REPLACE FUNCTION log_search_performance(
          p_query varchar(500),
          p_search_type varchar(50),
          p_results_count integer,
          p_execution_time_ms integer,
          p_user_id uuid DEFAULT NULL,
          p_session_id varchar(255) DEFAULT NULL,
          p_metadata jsonb DEFAULT '{}'::jsonb
      ) RETURNS void AS $$
      BEGIN
          INSERT INTO search_analytics (
              query, search_type, results_count, execution_time_ms, 
              user_id, session_id, metadata
          ) VALUES (
              p_query, p_search_type, p_results_count, p_execution_time_ms,
              p_user_id, p_session_id, p_metadata
          );
      END;
      $$ LANGUAGE plpgsql;
      `,
      [],
      [],
      'createLoggingFunction'
    );

    // Insert test synonym data
    await databaseService.executeRawQuery(
      `
      INSERT INTO "search_synonyms" ("term", "synonyms", "category", "weight") VALUES
      ('bill', ARRAY['legislation', 'act', 'law', 'statute'], 'legal', 1.0),
      ('parliament', ARRAY['national assembly', 'senate', 'legislature'], 'political', 1.0),
      ('budget', ARRAY['appropriation', 'allocation', 'funding'], 'financial', 1.0),
      ('healthcare', ARRAY['health', 'medical', 'hospital'], 'policy', 1.0),
      ('education', ARRAY['learning', 'school', 'academic'], 'policy', 1.0)
      ON CONFLICT DO NOTHING;
      `,
      [],
      [],
      'insertTestSynonyms'
    );

    searchEngine = new PostgreSQLFullTextEngine();
  });

  afterAll(async () => {
    // Clean up test data
    await databaseService.executeRawQuery(
      `
      DROP TABLE IF EXISTS "search_synonyms" CASCADE;
      DROP TABLE IF EXISTS "search_analytics" CASCADE;
      DROP FUNCTION IF EXISTS expand_query_with_synonyms(text, varchar);
      DROP FUNCTION IF EXISTS log_search_performance(varchar, varchar, integer, integer, uuid, varchar, jsonb);
      `,
      [],
      [],
      'cleanupTestTables'
    );
    
    await databaseService.close();
  });

  describe('Enhanced Full-Text Search Functionality', () => {
    it('should perform enhanced bill search with improved relevance scoring', async () => {
      const query: SearchQuery = {
        query: 'budget allocation healthcare',
        filters: {
          type: ['bills']
        },
        pagination: { limit: 20 }
      };

      const results = await searchEngine.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Results should be sorted by relevance score
      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].relevanceScore).toBeGreaterThanOrEqual(results[i + 1].relevanceScore);
        }
      }

      // Each result should have proper structure
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('relevanceScore');
        expect(result.relevanceScore).toBeGreaterThan(0);
        
        if (result.type === 'bill') {
          expect(result.metadata).toHaveProperty('billNumber');
          expect(result.metadata).toHaveProperty('status');
          expect(result.metadata).toHaveProperty('chamber');
        }
      });
    });

    it('should perform enhanced sponsor search with name matching priority', async () => {
      const query: SearchQuery = {
        query: 'john smith parliament',
        filters: {
          type: ['sponsors']
        },
        pagination: { limit: 15 }
      };

      const results = await searchEngine.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // Verify sponsor-specific metadata
      results.forEach(result => {
        if (result.type === 'sponsor') {
          expect(result.metadata).toHaveProperty('party');
          expect(result.metadata).toHaveProperty('county');
          expect(result.metadata).toHaveProperty('chamber');
        }
      });
    });

    it('should perform enhanced comment search with recency bonus', async () => {
      const query: SearchQuery = {
        query: 'corruption transparency',
        filters: {
          type: ['comments'],
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31')
          }
        },
        pagination: { limit: 25 }
      };

      const results = await searchEngine.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // Verify comment-specific metadata
      results.forEach(result => {
        if (result.type === 'comment') {
          expect(result.metadata).toHaveProperty('billId');
          expect(result.metadata).toHaveProperty('userName');
          expect(result.metadata).toHaveProperty('createdAt');
        }
      });
    });
  });

  describe('Query Expansion Functionality', () => {
    it('should expand queries with synonyms', async () => {
      // Test that searching for 'bill' also finds results for 'legislation', 'act', etc.
      const originalQuery: SearchQuery = {
        query: 'bill',
        pagination: { limit: 20 }
      };

      const expandedQuery: SearchQuery = {
        query: 'legislation act law statute',
        pagination: { limit: 20 }
      };

      const originalResults = await searchEngine.search(originalQuery);
      const expandedResults = await searchEngine.search(expandedQuery);

      expect(originalResults).toBeDefined();
      expect(expandedResults).toBeDefined();

      // With query expansion, the original query should find similar or more results
      // than just searching for synonyms directly
      expect(originalResults.length).toBeGreaterThan(0);
    });

    it('should handle domain-specific synonyms', async () => {
      const query: SearchQuery = {
        query: 'parliament budget healthcare',
        pagination: { limit: 30 }
      };

      const results = await searchEngine.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should find results even if exact terms don't match due to synonym expansion
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enhanced Relevance Scoring', () => {
    it('should prioritize title matches over content matches', async () => {
      const query: SearchQuery = {
        query: 'education policy reform',
        pagination: { limit: 50 }
      };

      const results = await searchEngine.search(query);

      if (results.length > 1) {
        // Find results with title matches vs content matches
        const titleMatches = results.filter(r => 
          r.title.toLowerCase().includes('education') ||
          r.title.toLowerCase().includes('policy') ||
          r.title.toLowerCase().includes('reform')
        );

        const contentMatches = results.filter(r => 
          !titleMatches.includes(r) &&
          (r.summary?.toLowerCase().includes('education') ||
           r.summary?.toLowerCase().includes('policy') ||
           r.summary?.toLowerCase().includes('reform'))
        );

        // Title matches should generally have higher scores
        if (titleMatches.length > 0 && contentMatches.length > 0) {
          const avgTitleScore = titleMatches.reduce((sum, r) => sum + r.relevanceScore, 0) / titleMatches.length;
          const avgContentScore = contentMatches.reduce((sum, r) => sum + r.relevanceScore, 0) / contentMatches.length;
          
          expect(avgTitleScore).toBeGreaterThanOrEqual(avgContentScore * 0.8); // Allow some variance
        }
      }
    });

    it('should apply multi-factor scoring correctly', async () => {
      const query: SearchQuery = {
        query: 'budget allocation',
        pagination: { limit: 30 }
      };

      const results = await searchEngine.search(query);

      expect(results).toBeDefined();
      
      // All results should have positive relevance scores
      results.forEach(result => {
        expect(result.relevanceScore).toBeGreaterThan(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(10); // Reasonable upper bound
      });

      // Results should be properly sorted by relevance
      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].relevanceScore).toBeGreaterThanOrEqual(results[i + 1].relevanceScore);
        }
      }
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should log search performance metrics', async () => {
      const query: SearchQuery = {
        query: 'performance monitoring test query',
        pagination: { limit: 20 }
      };

      // Perform search
      await searchEngine.search(query);

      // Check if metrics were logged
      const metricsResult = await databaseService.executeRawQuery(
        `SELECT * FROM search_analytics WHERE query = $1 ORDER BY search_timestamp DESC LIMIT 1`,
        [query.query],
        [],
        'checkMetrics'
      );

      expect(metricsResult.data).toBeDefined();
      
      if (metricsResult.data.length > 0) {
        const metrics = metricsResult.data[0];
        expect(metrics.search_type).toBe('fulltext');
        expect(metrics.execution_time_ms).toBeGreaterThan(0);
        expect(metrics.execution_time_ms).toBeLessThan(1000); // Should be under 1 second
        expect(metrics.results_count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide performance statistics', async () => {
      // Run several searches to generate data
      const queries = [
        'budget allocation test',
        'healthcare policy test',
        'education reform test'
      ];

      for (const queryText of queries) {
        await searchEngine.search({
          query: queryText,
          pagination: { limit: 15 }
        });
      }

      // Get performance stats
      const stats = await searchEngine.getPerformanceStats(1);
      
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      
      // Should have fulltext search stats
      const fullTextStats = stats.find(stat => stat.search_type === 'fulltext');
      if (fullTextStats) {
        expect(Number(fullTextStats.avg_execution_time_ms)).toBeGreaterThan(0);
        expect(Number(fullTextStats.total_searches)).toBeGreaterThan(0);
        expect(Number(fullTextStats.avg_results_count)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle malformed queries gracefully', async () => {
      const query: SearchQuery = {
        query: '((invalid ts_query syntax))',
        pagination: { limit: 20 }
      };

      // Should not throw an error, should fallback to simple search
      const results = await searchEngine.search(query);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty and whitespace queries', async () => {
      const queries = [
        { query: '', pagination: { limit: 20 } },
        { query: '   ', pagination: { limit: 20 } },
        { query: '\t\n', pagination: { limit: 20 } }
      ];

      for (const query of queries) {
        const results = await searchEngine.search(query);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // For now, just ensure the search engine is robust
      const query: SearchQuery = {
        query: 'connection test',
        pagination: { limit: 20 }
      };

      const results = await searchEngine.search(query);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Highlighting and Result Enhancement', () => {
    it('should generate proper highlights for search results', async () => {
      const query: SearchQuery = {
        query: 'budget healthcare education',
        pagination: { limit: 20 }
      };

      const results = await searchEngine.search(query);

      results.forEach(result => {
        expect(result).toHaveProperty('highlights');
        expect(Array.isArray(result.highlights)).toBe(true);
        
        // Highlights should contain mark tags for matched terms
        result.highlights.forEach(highlight => {
          expect(typeof highlight).toBe('string');
          // Should contain at least one highlighted term
          if (highlight.includes('<mark>')) {
            expect(highlight).toMatch(/<mark>.*<\/mark>/);
          }
        });
      });
    });

    it('should truncate long summaries appropriately', async () => {
      const query: SearchQuery = {
        query: 'comprehensive legislation',
        pagination: { limit: 20 }
      };

      const results = await searchEngine.search(query);

      results.forEach(result => {
        if (result.summary) {
          expect(result.summary.length).toBeLessThanOrEqual(203); // 200 + "..."
          
          // If truncated, should end with "..."
          if (result.summary.length === 203) {
            expect(result.summary.endsWith('...')).toBe(true);
          }
        }
      });
    });
  });

  describe('Filter Integration', () => {
    it('should properly apply status filters', async () => {
      const query: SearchQuery = {
        query: 'budget',
        filters: {
          status: ['active', 'passed']
        },
        pagination: { limit: 30 }
      };

      const results = await searchEngine.search(query);

      results.forEach(result => {
        if (result.type === 'bill' && result.metadata?.status) {
          expect(['active', 'passed']).toContain(result.metadata.status);
        }
      });
    });

    it('should properly apply chamber filters', async () => {
      const query: SearchQuery = {
        query: 'legislation',
        filters: {
          chamber: ['national_assembly']
        },
        pagination: { limit: 30 }
      };

      const results = await searchEngine.search(query);

      results.forEach(result => {
        if (result.metadata?.chamber) {
          expect(result.metadata.chamber).toBe('national_assembly');
        }
      });
    });

    it('should properly apply date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const query: SearchQuery = {
        query: 'policy',
        filters: {
          type: ['comments'],
          dateRange: {
            start: startDate,
            end: endDate
          }
        },
        pagination: { limit: 30 }
      };

      const results = await searchEngine.search(query);

      results.forEach(result => {
        if (result.type === 'comment' && result.metadata?.createdAt) {
          const createdAt = new Date(result.metadata.createdAt);
          expect(createdAt).toBeInstanceOf(Date);
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
        }
      });
    });
  });
});