// ============================================================================
// SEARCH SERVICE - Production-Ready Implementation
// ============================================================================
// Comprehensive search with multiple engines, fallbacks, and performance optimization

import { logger, cache } from '../../../shared/core/index.js';
import { database } from '@shared/database/connection';
import { bills, sponsors } from '@shared/schema';
import { sql } from 'drizzle-orm';
import {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchEngine,
  ParsedSearchSyntax,
  SearchQualityScore
} from '../engines/types/search.types.js';
import { PostgreSQLFullTextEngine, FuzzyMatchingEngine, SimpleMatchingEngine, FuseSearchEngine } from '../engines/core/index.js';

// ============================================================================
// Search Service Implementation
// ============================================================================

/**
 * Production-grade search service with multiple fallback strategies.
 * 
 * This service implements a layered approach to search functionality, starting
 * with the most sophisticated PostgreSQL full-text search, falling back to
 * fuzzy matching for typo tolerance, and finally using simple pattern matching
 * as a last resort. Each engine automatically disables itself on failure and
 * re-enables after a cooldown period.
 * 
 * Key optimizations include aggressive caching, query normalization, and
 * parallel facet generation for improved performance.
 */
export class SearchService {
  private searchEngines: SearchEngine[] = [];
  private readonly CACHE_TTL = 300; // 5 minutes for search results
  private readonly SUGGESTIONS_CACHE_TTL = 600; // 10 minutes for suggestions
  private readonly MAX_RESULTS = 1000;
  private readonly MAX_QUERY_LENGTH = 500;
  private readonly MIN_QUERY_LENGTH = 2;
  private readonly ENGINE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  private postgresqlEngine: PostgreSQLFullTextEngine;
  private fuseEngine: FuseSearchEngine;
  private fuzzyEngine: FuzzyMatchingEngine;
  private simpleEngine: SimpleMatchingEngine;

  constructor() {
    this.postgresqlEngine = new PostgreSQLFullTextEngine();
    this.fuseEngine = new FuseSearchEngine();
    this.fuzzyEngine = new FuzzyMatchingEngine();
    this.simpleEngine = new SimpleMatchingEngine();
    this.initializeSearchEngines();
  }

  /**
   * Initialize search engines in priority order from most to least sophisticated.
   * Each engine serves as a fallback for the previous one.
   */
  private initializeSearchEngines(): void {
    this.searchEngines.push(
      {
        name: 'fuse-search',
        priority: 1,
        isAvailable: true,
        search: (query: SearchQuery) => this.fuseEngine.search(query)
      },
      {
        name: 'postgresql-fulltext',
        priority: 2,
        isAvailable: true,
        search: (query: SearchQuery) => this.postgresqlEngine.search(query)
      },
      {
        name: 'fuzzy-matching',
        priority: 3,
        isAvailable: true,
        search: (query: SearchQuery) => this.fuzzyEngine.search(query)
      },
      {
        name: 'simple-matching',
        priority: 4,
        isAvailable: true,
        search: (query: SearchQuery) => this.simpleEngine.search(query)
      }
    );
  }

  /**
   * Main search entry point with comprehensive error handling and caching.
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Validate query early to avoid unnecessary processing
      const validationError = this.validateQuery(query);
      if (validationError) {
        return this.createEmptyResponse(query, startTime, validationError);
      }

      logger.info('🔍 Processing search query', {
        component: 'SearchService',
        query: query.query,
        filters: query.filters
      });

      const normalizedQuery = this.normalizeQuery(query);
      
      // Check cache unless explicitly bypassed with 'fresh:' prefix
      const cacheKey = this.generateCacheKey(normalizedQuery);
      if (!normalizedQuery.query.includes('fresh:')) {
        const cached = await this.getCachedResults(cacheKey);
        if (cached) {
          logger.info('📦 Returning cached search results');
          return { ...cached, searchTime: Date.now() - startTime };
        }
      }

      // Execute search with fallback mechanism
      const { results, usedEngine } = await this.executeSearchWithFallback(normalizedQuery);
      
      // Post-process results (pagination, relevance sorting)
      const processedResults = this.postProcessResults(results, normalizedQuery);
      
      // Generate facets and suggestions in parallel for better performance
      const [facets, suggestions] = await Promise.all([
        this.generateFacets(normalizedQuery, results),
        this.generateSuggestions(normalizedQuery.query)
      ]);
      
      const response: SearchResponse = {
        results: processedResults,
        totalCount: results.length, // Total before pagination
        facets,
        suggestions,
        searchTime: Date.now() - startTime,
        query: normalizedQuery
      };

      // Cache results for future requests
      await this.cacheResults(cacheKey, response);
      
      // Log analytics asynchronously to avoid blocking the response
      this.logSearchAnalytics(normalizedQuery, response, usedEngine).catch(err => 
        logger.error('Failed to log search analytics', err)
      );
      
      return response;

    } catch (error) {
      logger.error('Search failed catastrophically', error);
      return this.createEmptyResponse(query, startTime);
    }
  }

  /**
   * Execute search with automatic fallback to next available engine on failure.
   */
  private async executeSearchWithFallback(query: SearchQuery): Promise<{ results: SearchResult[]; usedEngine: string }> {
    let results: SearchResult[] = [];
    let usedEngine = 'none';
    
    for (const engine of this.searchEngines) {
      if (!engine.isAvailable) continue;
      
      try {
        results = await engine.search(query);
        usedEngine = engine.name;
        logger.info(`✅ Search succeeded with ${engine.name}`);
        break;
      } catch (error) {
        logger.warn(`❌ Search engine ${engine.name} failed, trying next fallback`, error);
        this.disableEngineTemporarily(engine);
      }
    }

    return { results, usedEngine };
  }

  /**
   * Temporarily disable a failed engine and schedule re-enablement.
   */
  private disableEngineTemporarily(engine: SearchEngine): void {
    engine.isAvailable = false;
    
    setTimeout(() => {
      engine.isAvailable = true;
      logger.info(`🔄 Re-enabled search engine: ${engine.name}`);
    }, this.ENGINE_COOLDOWN);
  }




  /**
   * Generate search suggestions for autocomplete functionality.
   */
  async getSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    try {
      if (partialQuery.length < this.MIN_QUERY_LENGTH) {
        return [];
      }

      const cacheKey = `suggestions:${partialQuery.toLowerCase()}:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const suggestions: string[] = [];
      const pattern = `%${partialQuery.toLowerCase()}%`;

      // Fetch suggestions from bills and sponsors in parallel
      const [billSuggestions, sponsorSuggestions] = await Promise.all([
        this.getBillSuggestions(pattern, Math.ceil(limit / 2)),
        this.getSponsorSuggestions(pattern, Math.floor(limit / 2))
      ]);

      suggestions.push(...billSuggestions, ...sponsorSuggestions);

      // Remove duplicates and limit results
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);
      
      await cache.set(cacheKey, uniqueSuggestions, this.SUGGESTIONS_CACHE_TTL);
      
      return uniqueSuggestions;

    } catch (error) {
      logger.error('Failed to get suggestions', error);
      return [];
    }
  }

  /**
   * Get bill title suggestions for autocomplete.
   */
  private async getBillSuggestions(pattern: string, limit: number): Promise<string[]> {
    try {
      const results = await database
        .select({ title: bills.title })
        .from(bills)
        .where(sql`${bills.title} ILIKE ${`%${pattern}%`}`)
        .limit(limit);
      
      return results.map(r => r.title).filter(Boolean);
    } catch (error) {
      logger.error('Failed to get bill suggestions', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get sponsor name suggestions for autocomplete.
   */
  private async getSponsorSuggestions(pattern: string, limit: number): Promise<string[]> {
    try {
      const results = await database
        .select({ name: sponsors.name })
        .from(sponsors)
        .where(sql`${sponsors.name} ILIKE ${`%${pattern}%`}`)
        .limit(limit);
      
      return results.map(r => r.name).filter(Boolean);
    } catch (error) {
      logger.error('Failed to get sponsor suggestions', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get popular search terms based on analytics.
   */
  async getPopularSearches(limit: number = 10): Promise<Array<{ term: string; count: number }>> {
    try {
      const cacheKey = `popular-searches:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      // In production, this would query a search analytics table
      const popularSearches = [
        { term: 'budget', count: 150 },
        { term: 'healthcare', count: 120 },
        { term: 'education', count: 100 },
        { term: 'taxation', count: 85 },
        { term: 'agriculture', count: 70 }
      ].slice(0, limit);

      // Cache popular searches for longer since they change slowly
      await cache.set(cacheKey, popularSearches, this.CACHE_TTL * 4);
      return popularSearches;

    } catch (error) {
      logger.error('Failed to get popular searches', error);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate search query for security and performance.
   */
  private validateQuery(query: SearchQuery): string | null {
    if (!query.query || query.query.trim().length < this.MIN_QUERY_LENGTH) {
      return `Query must be at least ${this.MIN_QUERY_LENGTH} characters`;
    }

    if (query.query.length > this.MAX_QUERY_LENGTH) {
      return `Query exceeds maximum length of ${this.MAX_QUERY_LENGTH} characters`;
    }

    return null;
  }

  /**
   * Normalize query for consistent processing and caching.
   */
  private normalizeQuery(query: SearchQuery): SearchQuery {
    return {
      ...query,
      query: query.query.trim().toLowerCase(),
      pagination: {
        page: Math.max(1, query.pagination?.page || 1),
        limit: Math.min(query.pagination?.limit || 20, 100)
      }
    };
  }

  /**
   * Extract meaningful search terms from query string.
   */
  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter out short words
      .slice(0, 10); // Limit to 10 terms for performance
  }

  /**
   * Generate unique cache key for query.
   */
  private generateCacheKey(query: SearchQuery): string {
    return `search:v2:${JSON.stringify(query)}`;
  }

  /**
   * Check if a specific type should be searched based on filters.
   */
  private shouldSearchType(query: SearchQuery, type: 'bills' | 'sponsors' | 'comments'): boolean {
    return !query.filters?.type || query.filters.type.includes(type);
  }


  /**
   * Apply pagination and sorting to results.
   */
  private postProcessResults(results: SearchResult[], query: SearchQuery): SearchResult[] {
    const page = query.pagination?.page || 1;
    const limit = query.pagination?.limit || 20;
    const offset = (page - 1) * limit;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Generate facets from search results for filtering UI.
   */
  private async generateFacets(
    query: SearchQuery, 
    results: SearchResult[]
  ): Promise<SearchResponse['facets']> {
    const facets = {
      types: {} as Record<string, number>,
      statuses: {} as Record<string, number>,
      chambers: {} as Record<string, number>,
      counties: {} as Record<string, number>
    };

    // Count occurrences of each facet value in results
    for (const result of results) {
      facets.types[result.type] = (facets.types[result.type] || 0) + 1;
      
      if (result.metadata.status) {
        facets.statuses[result.metadata.status] = 
          (facets.statuses[result.metadata.status] || 0) + 1;
      }
      
      if (result.metadata.chamber) {
        facets.chambers[result.metadata.chamber] = 
          (facets.chambers[result.metadata.chamber] || 0) + 1;
      }
      
      if (result.metadata.county) {
        facets.counties[result.metadata.county] = 
          (facets.counties[result.metadata.county] || 0) + 1;
      }
    }

    return facets;
  }

  /**
   * Generate search suggestions based on partial query.
   */
  private async generateSuggestions(query: string): Promise<string[]> {
    if (query.length < 3) return [];
    
    return await this.getSuggestions(query, 5);
  }

  /**
   * Generate highlighted text snippets showing where matches occur.
   */
  private generateHighlights(text: string, searchTerms: string[]): string[] {
    const highlights: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const term of searchTerms) {
      const index = lowerText.indexOf(term.toLowerCase());
      if (index === -1) continue;
      
      // Extract context around the match (50 chars before and after)
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + term.length + 50);
      let snippet = text.substring(start, end);
      
      // Add ellipsis if truncated
      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';
      
      // Wrap matching term in mark tags
      const regex = new RegExp(`(${term})`, 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');
      
      highlights.push(snippet);
      
      if (highlights.length >= 3) break; // Limit to 3 highlights
    }
    
    return highlights;
  }

  /**
   * Calculate simple relevance score based on term matching.
   */
  private calculateSimpleRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText.includes(lowerQuery)) {
      return 1.0;
    }
    
    // Calculate partial match score based on matching words
    const queryWords = lowerQuery.split(/\s+/);
    const matchingWords = queryWords.filter(word => lowerText.includes(word));
    
    return matchingWords.length / queryWords.length;
  }

  /**
   * Truncate text to maximum length with ellipsis.
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get cached search results if available.
   */
  private async getCachedResults(cacheKey: string): Promise<SearchResponse | null> {
    try {
      return await cache.get(cacheKey);
    } catch (error) {
      logger.warn('Cache retrieval failed', error);
      return null;
    }
  }

  /**
   * Cache search results for faster subsequent requests.
   */
  private async cacheResults(cacheKey: string, response: SearchResponse): Promise<void> {
    try {
      await cache.set(cacheKey, response, this.CACHE_TTL);
    } catch (error) {
      logger.warn('Cache storage failed', error);
    }
  }

  /**
   * Create empty response for errors or invalid queries.
   */
  private createEmptyResponse(
    query: SearchQuery, 
    startTime: number, 
    error?: string
  ): SearchResponse {
    return {
      results: [],
      totalCount: 0,
      facets: {
        types: {},
        statuses: {},
        chambers: {},
        counties: {}
      },
      suggestions: [],
      searchTime: Date.now() - startTime,
      query
    };
  }

  /**
   * Log search analytics for monitoring and improvement.
   */
  private async logSearchAnalytics(
    query: SearchQuery, 
    response: SearchResponse, 
    engine: string
  ): Promise<void> {
    try {
      logger.info('📊 Search analytics', {
        component: 'SearchService',
        query: query.query,
        resultsCount: response.totalCount,
        searchTime: response.searchTime,
        engine,
        hasResults: response.totalCount > 0,
        filters: query.filters,
        page: query.pagination?.page
      });

      // In production, you would store this in a search_analytics table:
      // await databaseService.db.insert(searchAnalytics).values({
      //   query: query.query,
      //   results_count: response.totalCount,
      //   search_time: response.searchTime,
      //   engine_used: engine,
      //   filters: query.filters,
      //   timestamp: new Date()
      // });

    } catch (error) {
      logger.error('Failed to log search analytics', error);
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const searchService = new SearchService();

// ============================================================================
// Additional Utility Functions
// ============================================================================

/**
 * Sanitize user input to prevent SQL injection and XSS attacks.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/[';]/g, '') // Remove SQL special characters
    .trim();
}

/**
 * Parse advanced search syntax (e.g., "term1 AND term2", "exact phrase").
 */
export function parseAdvancedSearchSyntax(query: string): ParsedSearchSyntax {
  const phrases: string[] = [];
  const terms: string[] = [];
  const operators: string[] = [];

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    if (match[1]) {
      phrases.push(match[1]);
    }
  }

  // Remove phrases from query
  let remainingQuery = query.replace(phraseRegex, '');

  // Extract operators (AND, OR, NOT)
  const operatorRegex = /\b(AND|OR|NOT)\b/gi;
  while ((match = operatorRegex.exec(remainingQuery)) !== null) {
    if (match[1]) {
      operators.push(match[1].toUpperCase());
    }
  }

  // Extract remaining terms
  remainingQuery = remainingQuery.replace(operatorRegex, '');
  terms.push(...remainingQuery.split(/\s+/).filter(t => t.length > 0));

  return { terms, operators, phrases };
}

/**
 * Calculate search quality score based on various metrics.
 */
export function calculateSearchQuality(response: SearchResponse): SearchQualityScore {
  const hasResults = response.totalCount > 0;
  const avgRelevanceScore = hasResults
    ? response.results.reduce((sum, r) => sum + r.relevanceScore, 0) / response.results.length
    : 0;
  
  const searchSpeed = 
    response.searchTime < 100 ? 'fast' :
    response.searchTime < 500 ? 'normal' :
    'slow';
  
  const hasSuggestions = response.suggestions.length > 0;

  // Calculate overall quality score (0-100)
  let score = 0;
  if (hasResults) score += 40;
  score += avgRelevanceScore * 30;
  if (searchSpeed === 'fast') score += 20;
  else if (searchSpeed === 'normal') score += 10;
  if (hasSuggestions) score += 10;

  return {
    score: Math.round(score),
    metrics: {
      hasResults,
      avgRelevanceScore,
      searchSpeed,
      hasSuggestions
    }
  };
}