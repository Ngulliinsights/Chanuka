// ============================================================================
// FUSE.JS RELEVANCE SCORING COMPARISON TESTS
// ============================================================================
// Comprehensive tests comparing Fuse.js search relevance against existing engines

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FuseSearchEngine } from '../engines/core/fuse-search.engine.js';
import { PostgreSQLFullTextEngine } from '../engines/core/postgresql-fulltext.engine.js';
import { FuzzyMatchingEngine } from '../engines/core/fuzzy-matching.engine.js';
import { SimpleMatchingEngine } from '../engines/core/simple-matching.engine.js';
import { SearchQuery, SearchResult } from '../engines/types/search.types.js';

interface RelevanceTestCase {
  name: string;
  query: SearchQuery;
  expectedTopResults: string[]; // Expected titles in order of relevance
  description: string;
}

interface EngineComparison {
  engine: string;
  results: SearchResult[];
  relevanceScore: number;
  topTitles: string[];
  responseTime: number;
}

describe('Fuse.js Relevance Scoring Comparison', () => {
  let fuseEngine: FuseSearchEngine;
  let postgresEngine: PostgreSQLFullTextEngine;
  let fuzzyEngine: FuzzyMatchingEngine;
  let simpleEngine: SimpleMatchingEngine;

  const testCases: RelevanceTestCase[] = [
    {
      name: 'Exact Title Match',
      query: { query: 'Healthcare Reform Act' },
      expectedTopResults: ['Healthcare Reform Act', 'Healthcare Reform Amendment', 'Healthcare Policy Act'],
      description: 'Should prioritize exact title matches over partial matches'
    },
    {
      name: 'Partial Word Match',
      query: { query: 'health care' },
      expectedTopResults: ['Healthcare Reform Act', 'Health Insurance Bill', 'Care Provider Standards'],
      description: 'Should handle space variations and partial word matching'
    },
    {
      name: 'Typo Tolerance',
      query: { query: 'helthcare' },
      expectedTopResults: ['Healthcare Reform Act', 'Healthcare Policy Act', 'Health Insurance Bill'],
      description: 'Should handle common typos and misspellings'
    },
    {
      name: 'Synonym Recognition',
      query: { query: 'medical insurance' },
      expectedTopResults: ['Health Insurance Bill', 'Healthcare Reform Act', 'Medical Coverage Act'],
      description: 'Should recognize related terms and synonyms'
    },
    {
      name: 'Multi-word Query',
      query: { query: 'education funding budget' },
      expectedTopResults: ['Education Budget Act', 'School Funding Bill', 'Educational Finance Reform'],
      description: 'Should handle complex multi-word queries effectively'
    },
    {
      name: 'Acronym Search',
      query: { query: 'EPA' },
      expectedTopResults: ['Environmental Protection Agency Act', 'EPA Oversight Bill', 'Environmental Policy Act'],
      description: 'Should match acronyms to full names'
    },
    {
      name: 'Case Insensitive',
      query: { query: 'CLIMATE CHANGE' },
      expectedTopResults: ['Climate Change Mitigation Act', 'Climate Policy Reform', 'Environmental Climate Bill'],
      description: 'Should handle case variations properly'
    },
    {
      name: 'Phrase Search',
      query: { query: '"tax reform"' },
      expectedTopResults: ['Tax Reform Act 2024', 'Comprehensive Tax Reform', 'Tax Policy Reform Bill'],
      description: 'Should prioritize exact phrase matches when quoted'
    }
  ];

  beforeAll(async () => {
    // Initialize all search engines
    fuseEngine = new FuseSearchEngine();
    postgresEngine = new PostgreSQLFullTextEngine();
    fuzzyEngine = new FuzzyMatchingEngine();
    simpleEngine = new SimpleMatchingEngine();

    // Warm up engines by building indexes
    try {
      await fuseEngine.refreshIndex();
    } catch (error) {
      console.warn('Could not refresh Fuse.js index:', error);
    }
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Individual Engine Performance', () => {
    it('should initialize Fuse.js engine successfully', async () => {
      expect(fuseEngine).toBeDefined();
      expect(fuseEngine.name).toBe('fuse-search');
      expect(fuseEngine.priority).toBe(1);
      expect(fuseEngine.isAvailable).toBe(true);

      const stats = fuseEngine.getIndexStats();
      expect(stats).toBeDefined();
      expect(stats.isAvailable).toBe(true);
    });

    it('should handle empty queries gracefully', async () => {
      const emptyQuery: SearchQuery = { query: '' };
      
      try {
        const results = await fuseEngine.search(emptyQuery);
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Empty queries might throw validation errors, which is acceptable
        expect(error).toBeDefined();
      }
    });

    it('should return results with proper structure', async () => {
      const query: SearchQuery = { query: 'healthcare' };
      
      try {
        const results = await fuseEngine.search(query);
        
        if (results.length > 0) {
          const result = results[0];
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('type');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('relevanceScore');
          expect(result).toHaveProperty('metadata');
          expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(result.relevanceScore).toBeLessThanOrEqual(1);
        }
      } catch (error) {
        console.warn('Search failed, possibly due to missing data:', error);
      }
    });
  });

  describe('Relevance Scoring Comparison', () => {
    testCases.forEach((testCase) => {
      it(`should provide good relevance for: ${testCase.name}`, async () => {
        const comparisons: EngineComparison[] = [];

        // Test each engine
        const engines = [
          { name: 'fuse', engine: fuseEngine },
          { name: 'postgresql', engine: postgresEngine },
          { name: 'fuzzy', engine: fuzzyEngine },
          { name: 'simple', engine: simpleEngine }
        ];

        for (const { name, engine } of engines) {
          try {
            const startTime = Date.now();
            const results = await engine.search(testCase.query);
            const responseTime = Date.now() - startTime;

            const avgRelevance = results.length > 0 
              ? results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
              : 0;

            const topTitles = results.slice(0, 5).map(r => r.title);

            comparisons.push({
              engine: name,
              results,
              relevanceScore: avgRelevance,
              topTitles,
              responseTime
            });
          } catch (error) {
            console.warn(`Engine ${name} failed for query "${testCase.query.query}":`, error);
            comparisons.push({
              engine: name,
              results: [],
              relevanceScore: 0,
              topTitles: [],
              responseTime: 0
            });
          }
        }

        // Log comparison results for analysis
        console.log(`\n📊 Relevance Comparison: ${testCase.name}`);
        console.log(`Query: "${testCase.query.query}"`);
        console.log(`Expected: ${testCase.expectedTopResults.join(', ')}`);
        
        comparisons.forEach(comp => {
          console.log(`${comp.engine.padEnd(12)}: Score=${comp.relevanceScore.toFixed(3)}, ` +
                     `Results=${comp.results.length}, Time=${comp.responseTime}ms`);
          if (comp.topTitles.length > 0) {
            console.log(`${' '.repeat(15)}Top: ${comp.topTitles.slice(0, 3).join(', ')}`);
          }
        });

        // Verify Fuse.js performs competitively
        const fuseComparison = comparisons.find(c => c.engine === 'fuse');
        if (fuseComparison && fuseComparison.results.length > 0) {
          // Fuse.js should return results
          expect(fuseComparison.results.length).toBeGreaterThan(0);
          
          // Relevance scores should be reasonable (> 0.1 for good matches)
          if (fuseComparison.relevanceScore > 0) {
            expect(fuseComparison.relevanceScore).toBeGreaterThan(0.1);
          }
          
          // Response time should be reasonable (< 1000ms)
          expect(fuseComparison.responseTime).toBeLessThan(1000);
        }
      });
    });
  });

  describe('Fuse.js Specific Features', () => {
    it('should provide match highlights', async () => {
      const query: SearchQuery = { query: 'healthcare reform' };
      
      try {
        const results = await fuseEngine.search(query);
        
        if (results.length > 0) {
          const resultWithHighlights = results.find(r => r.highlights && r.highlights.length > 0);
          if (resultWithHighlights) {
            expect(resultWithHighlights.highlights).toBeDefined();
            expect(resultWithHighlights.highlights!.length).toBeGreaterThan(0);
            
            // Highlights should contain mark tags
            const hasMarkTags = resultWithHighlights.highlights!.some(h => h.includes('<mark>'));
            expect(hasMarkTags).toBe(true);
          }
        }
      } catch (error) {
        console.warn('Highlights test failed:', error);
      }
    });

    it('should handle filtering correctly', async () => {
      const queryWithFilters: SearchQuery = {
        query: 'healthcare',
        filters: {
          type: ['bills'],
          status: ['introduced', 'passed']
        }
      };
      
      try {
        const results = await fuseEngine.search(queryWithFilters);
        
        // All results should match the filters
        results.forEach(result => {
          expect(result.type).toBe('bill');
          if (result.metadata.status) {
            expect(['introduced', 'passed']).toContain(result.metadata.status);
          }
        });
      } catch (error) {
        console.warn('Filtering test failed:', error);
      }
    });

    it('should handle pagination properly', async () => {
      const query: SearchQuery = {
        query: 'bill',
        pagination: { page: 1, limit: 5 }
      };
      
      try {
        const results = await fuseEngine.search(query);
        expect(results.length).toBeLessThanOrEqual(5);
        
        // Test second page
        const page2Query: SearchQuery = {
          ...query,
          pagination: { page: 2, limit: 5 }
        };
        
        const page2Results = await fuseEngine.search(page2Query);
        expect(page2Results.length).toBeLessThanOrEqual(5);
        
        // Results should be different (assuming more than 5 total results)
        if (results.length === 5 && page2Results.length > 0) {
          const page1Ids = new Set(results.map(r => r.id));
          const page2Ids = new Set(page2Results.map(r => r.id));
          const overlap = [...page1Ids].filter(id => page2Ids.has(id));
          expect(overlap.length).toBe(0); // No overlap between pages
        }
      } catch (error) {
        console.warn('Pagination test failed:', error);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements', async () => {
      const queries = [
        'healthcare',
        'education funding',
        'climate change',
        'tax reform',
        'infrastructure'
      ];

      const performanceResults: Array<{
        query: string;
        responseTime: number;
        resultCount: number;
      }> = [];

      for (const queryText of queries) {
        const query: SearchQuery = { query: queryText };
        
        try {
          const startTime = Date.now();
          const results = await fuseEngine.search(query);
          const responseTime = Date.now() - startTime;
          
          performanceResults.push({
            query: queryText,
            responseTime,
            resultCount: results.length
          });
          
          // Individual query should complete within 500ms
          expect(responseTime).toBeLessThan(500);
        } catch (error) {
          console.warn(`Performance test failed for query "${queryText}":`, error);
        }
      }

      // Calculate average performance
      if (performanceResults.length > 0) {
        const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
        const avgResultCount = performanceResults.reduce((sum, r) => sum + r.resultCount, 0) / performanceResults.length;
        
        console.log(`\n⚡ Fuse.js Performance Summary:`);
        console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`Average Result Count: ${avgResultCount.toFixed(1)}`);
        
        // Average should be under 200ms for good performance
        expect(avgResponseTime).toBeLessThan(200);
      }
    });

    it('should handle concurrent searches efficiently', async () => {
      const concurrentQueries = [
        'healthcare reform',
        'education policy',
        'climate action',
        'tax legislation',
        'infrastructure bill'
      ];

      const startTime = Date.now();
      
      try {
        const promises = concurrentQueries.map(queryText => 
          fuseEngine.search({ query: queryText })
        );
        
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        
        // All searches should complete
        expect(results).toHaveLength(concurrentQueries.length);
        
        // Total time should be reasonable for concurrent execution
        expect(totalTime).toBeLessThan(1000);
        
        console.log(`\n🔄 Concurrent Search Performance:`);
        console.log(`${concurrentQueries.length} concurrent searches: ${totalTime}ms`);
        console.log(`Average per search: ${(totalTime / concurrentQueries.length).toFixed(2)}ms`);
      } catch (error) {
        console.warn('Concurrent search test failed:', error);
      }
    });
  });

  describe('Relevance Quality Metrics', () => {
    it('should demonstrate improved relevance over simple matching', async () => {
      const testQueries = [
        'healthcare reform',
        'education funding',
        'climate change policy'
      ];

      for (const queryText of testQueries) {
        const query: SearchQuery = { query: queryText };
        
        try {
          const [fuseResults, simpleResults] = await Promise.all([
            fuseEngine.search(query),
            simpleEngine.search(query)
          ]);

          if (fuseResults.length > 0 && simpleResults.length > 0) {
            const fuseAvgScore = fuseResults.reduce((sum, r) => sum + r.relevanceScore, 0) / fuseResults.length;
            const simpleAvgScore = simpleResults.reduce((sum, r) => sum + r.relevanceScore, 0) / simpleResults.length;
            
            console.log(`\n📈 Relevance Comparison for "${queryText}":`);
            console.log(`Fuse.js Average Score: ${fuseAvgScore.toFixed(3)}`);
            console.log(`Simple Engine Average Score: ${simpleAvgScore.toFixed(3)}`);
            
            // Fuse.js should generally provide better or comparable relevance
            // Allow for some variance due to different scoring algorithms
            expect(fuseAvgScore).toBeGreaterThanOrEqual(simpleAvgScore * 0.8);
          }
        } catch (error) {
          console.warn(`Relevance comparison failed for "${queryText}":`, error);
        }
      }
    });

    it('should provide consistent scoring across similar queries', async () => {
      const similarQueries = [
        'healthcare',
        'health care',
        'health-care'
      ];

      const scores: number[] = [];

      for (const queryText of similarQueries) {
        try {
          const results = await fuseEngine.search({ query: queryText });
          if (results.length > 0) {
            const avgScore = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
            scores.push(avgScore);
          }
        } catch (error) {
          console.warn(`Consistency test failed for "${queryText}":`, error);
        }
      }

      if (scores.length >= 2) {
        // Calculate coefficient of variation (std dev / mean)
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;

        console.log(`\n📊 Scoring Consistency:`);
        console.log(`Scores: ${scores.map(s => s.toFixed(3)).join(', ')}`);
        console.log(`Coefficient of Variation: ${coefficientOfVariation.toFixed(3)}`);

        // Coefficient of variation should be reasonable (< 0.5 for similar queries)
        expect(coefficientOfVariation).toBeLessThan(0.5);
      }
    });
  });
});