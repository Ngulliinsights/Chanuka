/**
 * Intelligent Search Service - Dual-Engine Search Implementation
 *
 * Implements PostgreSQL full-text search with Fuse.js fuzzy matching fallback
 * for comprehensive search capabilities with typo tolerance and relevance scoring.
 *
 * Key optimizations:
 * - Enhanced type safety with strict null checks
 * - Improved caching with TTL support
 * - Better error handling and fallback strategies
 * - Performance monitoring and metrics
 * - Memory-efficient Fuse instance management
 */

import Fuse, { type IFuseOptions } from 'fuse.js';

import { searchApiClient } from '@client/core/api/search';
import { logger } from '@client/shared/utils/logger';

import type { SearchResult, SearchMetadata } from '../types';

interface SearchSuggestion {
  term: string;
  type: string;
  frequency?: number;
  score?: number;
  id?: string;
  metadata?: any;
}

interface AutocompleteResult {
  suggestions: SearchSuggestion[];
  facets: {
    categories: string[];
    sponsors: string[];
    tags: string[];
    statuses: string[];
  };
  query: string;
  totalSuggestions: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: any;
  createdAt: string;
}

interface SearchAnalytics {
  totalSearches: number;
  popularQueries: string[];
  avgResponseTime: number;
}

interface SearchHighlight {
  field: string;
  snippet: string;
  positions: Array<{ start: number; end: number }>;
}

interface SearchQuery {
  q: string;
  type?: 'bills' | 'users' | 'comments' | 'all';
  sort?: 'relevance' | 'date' | 'popularity';
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface DualSearchRequest extends SearchQuery {
  enableFuzzy?: boolean;
  fuzzyThreshold?: number;
  combineResults?: boolean;
  maxResults?: number;
  highlightMatches?: boolean;
}

export interface SearchEngineResult {
  engine: 'postgresql' | 'fuse';
  results: SearchResult[];
  searchTime: number;
  totalCount: number;
  quality: number;
}

export interface CombinedSearchResult {
  results: SearchResult[];
  engines: SearchEngineResult[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
  facets: SearchFacets;
}

interface SearchFacets {
  types: Record<string, number>;
  categories: Record<string, number>;
  statuses: Record<string, number>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

// ============================================================================
// Configuration Constants
// ============================================================================

const FUSE_CONFIGS: Record<string, IFuseOptions<any>> = {
  bills: {
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'summary', weight: 0.3 },
      { name: 'billNumber', weight: 0.5 },
      { name: 'policyAreas', weight: 0.2 },
    ],
  },
  sponsors: {
    threshold: 0.3,
    distance: 50,
    includeScore: true,
    includeMatches: true,
    keys: [
      { name: 'name', weight: 0.9 },
      { name: 'party', weight: 0.1 },
    ],
  },
  comments: {
    threshold: 0.5,
    distance: 200,
    includeScore: true,
    includeMatches: true,
    keys: [{ name: 'content', weight: 1.0 }],
  },
};

const CACHE_CONFIG = {
  MAX_SIZE: 100,
  TTL_MS: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute
} as const;

const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
  MIN_QUERY_LENGTH: 2,
  AUTOCOMPLETE_LIMIT: 10,
  SUGGESTION_LIMIT: 5,
} as const;

// ============================================================================
// Main Service Class
// ============================================================================

class IntelligentSearchService {
  private fuseInstances: Map<string, { instance: Fuse<any>; timestamp: number }> = new Map();
  private searchCache: Map<string, CacheEntry<CombinedSearchResult>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeCacheCleanup();
  }

  /**
   * Initialize automatic cache cleanup to prevent memory leaks
   */
  private initializeCacheCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, CACHE_CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Perform intelligent dual-engine search with automatic fallback
   */
  async search(request: DualSearchRequest): Promise<CombinedSearchResult> {
    // Validate input early to fail fast
    if (!request.q || request.q.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return this.createEmptyResult();
    }

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache with validation
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Search cache hit', {
        query: request.q,
        cacheAge: Date.now() - cached.timestamp,
      });
      return cached.data;
    }

    try {
      // Execute both search engines in parallel for optimal performance
      const [postgresqlResult, fuseResult] = await Promise.allSettled([
        this.performPostgreSQLSearch(request),
        request.enableFuzzy !== false ? this.performFuseSearch(request) : null,
      ]);

      const engines: SearchEngineResult[] = [];
      const combinedResults = this.mergeSearchResults(
        postgresqlResult,
        fuseResult,
        request,
        engines
      );

      // Apply result limit after merging to get the best results
      const limitedResults = request.maxResults
        ? combinedResults.slice(0, request.maxResults)
        : combinedResults;

      // Generate intelligent suggestions and facets
      const [suggestions, facets] = await Promise.all([
        this.generateSuggestions(request.q, limitedResults),
        Promise.resolve(this.generateFacets(limitedResults)),
      ]);

      const result: CombinedSearchResult = {
        results: limitedResults,
        engines,
        totalCount: limitedResults.length,
        searchTime: Date.now() - startTime,
        suggestions,
        facets,
      };

      // Cache the result with metadata
      this.setCache(cacheKey, result);

      logger.info('Dual-engine search completed', {
        query: request.q,
        totalResults: result.totalCount,
        searchTime: result.searchTime,
        engines: engines.map(e => ({
          engine: e.engine,
          resultCount: e.results.length,
          quality: e.quality.toFixed(2),
        })),
      });

      return result;
    } catch (error) {
      logger.error('Intelligent search failed', {
        query: request.q,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return empty result rather than throwing to maintain UX
      return this.createEmptyResult();
    }
  }

  /**
   * Merge results from multiple search engines with deduplication
   */
  private mergeSearchResults(
    postgresqlResult: PromiseSettledResult<SearchEngineResult>,
    fuseResult: PromiseSettledResult<SearchEngineResult | null>,
    request: DualSearchRequest,
    engines: SearchEngineResult[]
  ): SearchResult[] {
    let combinedResults: SearchResult[] = [];

    // Process PostgreSQL results
    if (postgresqlResult.status === 'fulfilled' && postgresqlResult.value) {
      engines.push(postgresqlResult.value);
      combinedResults = [...postgresqlResult.value.results];
    }

    // Process Fuse.js results with intelligent merging
    if (fuseResult && fuseResult.status === 'fulfilled' && fuseResult.value) {
      engines.push(fuseResult.value);

      if (request.combineResults !== false) {
        // Merge results while avoiding duplicates using efficient Set lookup
        const existingIds = new Set(combinedResults.map(r => r.id));
        const newResults = fuseResult.value.results.filter(r => !existingIds.has(r.id));
        combinedResults = [...combinedResults, ...newResults];
      }
    }

    // Sort by relevance score (descending) for optimal results ordering
    combinedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return combinedResults;
  }

  /**
   * Perform PostgreSQL full-text search with robust parameter handling
   */
  private async performPostgreSQLSearch(request: DualSearchRequest): Promise<SearchEngineResult> {
    const startTime = Date.now();

    try {
      // Build params with only defined values for cleaner API calls
      const params: Record<string, string | number | boolean> = { q: request.q };

      if (request.type !== undefined) params.type = request.type;
      if (request.sort !== undefined) params.sort = request.sort;
      if (request.limit !== undefined)
        params.limit = Math.min(request.limit, SEARCH_CONFIG.MAX_LIMIT);
      if (request.offset !== undefined) params.offset = request.offset;
      if (request.filters !== undefined) params.filters = JSON.stringify(request.filters);

      const response = await searchApiClient.searchPostgreSQL(params);

      if (response.status !== 200 || !response.data) {
        throw new Error('PostgreSQL search returned unsuccessful response');
      }

      const searchTime = Date.now() - startTime;
      const results = response.data.results || [];
      const quality = this.calculateSearchQuality(results, request.q);

      return {
        engine: 'postgresql',
        results,
        searchTime,
        totalCount: response.data.total || results.length,
        quality,
      };
    } catch (error) {
      const searchTime = Date.now() - startTime;

      logger.warn('PostgreSQL search failed, results will rely on Fuse.js fallback', {
        query: request.q,
        searchTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        engine: 'postgresql',
        results: [],
        searchTime,
        totalCount: 0,
        quality: 0,
      };
    }
  }

  /**
   * Perform Fuse.js fuzzy search with efficient instance caching
   */
  private async performFuseSearch(request: DualSearchRequest): Promise<SearchEngineResult> {
    const startTime = Date.now();

    try {
      // Retrieve data for fuzzy search with error handling
      const data = await this.getFuseSearchData(request.type);

      if (!data || data.length === 0) {
        logger.debug('No data available for Fuse.js search', { type: request.type });
        return this.createEmptyEngineResult('fuse', startTime);
      }

      // Get or create Fuse instance with caching
      const fuse = this.getFuseInstance(request.type || 'bills', data);

      // Perform fuzzy search with configurable limit
      const fuseResults = fuse.search(request.q, {
        limit: request.limit || SEARCH_CONFIG.DEFAULT_LIMIT,
      });

      // Transform Fuse results to standardized format
      const results: SearchResult[] = fuseResults.map(result => ({
        id: result.item.id?.toString() || crypto.randomUUID(),
        type: this.getResultType(request.type),
        title: result.item.title || result.item.name || 'Untitled',
        content: result.item.summary || result.item.content || '',
        excerpt: this.generateExcerpt(result.item, request.q),
        relevanceScore: this.calculateFuseRelevanceScore(result.score),
        metadata: {
          ...result.item,
          fuseScore: result.score,
          matches: result.matches,
        },
        highlights:
          request.highlightMatches !== false ? this.generateHighlights(result.matches) : [],
      }));

      const searchTime = Date.now() - startTime;
      const quality = this.calculateSearchQuality(results, request.q);

      return {
        engine: 'fuse',
        results,
        searchTime,
        totalCount: results.length,
        quality,
      };
    } catch (error) {
      logger.error('Fuse.js search failed', {
        query: request.q,
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.createEmptyEngineResult('fuse', startTime);
    }
  }

  /**
   * Convert Fuse.js score (0-1, lower is better) to relevance score (0-100, higher is better)
   */
  private calculateFuseRelevanceScore(fuseScore: number | undefined): number {
    if (fuseScore === undefined) return 50; // Default middle score
    return Math.round((1 - fuseScore) * 100);
  }

  /**
   * Get or create Fuse instance with memory-efficient caching
   */
  private getFuseInstance(type: string, data: unknown[]): Fuse<any> {
    const cacheKey = `${type}-${data.length}`;
    const cached = this.fuseInstances.get(cacheKey);

    // Return cached instance if still valid (within 10 minutes)
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      return cached.instance;
    }

    // Create new instance with appropriate configuration
    const config = FUSE_CONFIGS[type as keyof typeof FUSE_CONFIGS] || FUSE_CONFIGS.bills;
    const fuse = new Fuse(data, config);

    // Cleanup old instances if we have too many
    if (this.fuseInstances.size >= 10) {
      const oldestKey = Array.from(this.fuseInstances.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      this.fuseInstances.delete(oldestKey);
    }

    this.fuseInstances.set(cacheKey, { instance: fuse, timestamp: Date.now() });
    return fuse;
  }

  /**
   * Fetch data for Fuse.js search with robust type handling
   */
  private async getFuseSearchData(type?: string): Promise<any[]> {
    try {
      const response = await searchApiClient.getSearchData(type);

      if (response.status === 200 && response.data) {
        // Safely extract array data with multiple fallback paths
        const data = response.data.results || response.data;
        return Array.isArray(data) ? data : [];
      }

      return [];
    } catch (error) {
      logger.warn('Failed to fetch Fuse search data', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Generate intelligent autocomplete suggestions with multiple sources
   */
  async getAutocomplete(
    query: string,
    options: {
      limit?: number;
      includeRecent?: boolean;
      includePopular?: boolean;
      includeBillTitles?: boolean;
    } = {}
  ): Promise<AutocompleteResult> {
    const {
      limit = SEARCH_CONFIG.AUTOCOMPLETE_LIMIT,
      includeRecent = true,
      includePopular = true,
      includeBillTitles = true,
    } = options;

    // Validate query length
    if (!query || query.trim().length < 2) {
      return this.createEmptyAutocompleteResult(query);
    }

    try {
      // Fetch from multiple sources in parallel for speed
      const [suggestionsResponse, recentResponse, popularResponse] = await Promise.allSettled([
        searchApiClient.getSuggestions(query, limit),
        includeRecent ? searchApiClient.getRecentSearches(5) : null,
        includePopular ? searchApiClient.getPopularSearches(5) : null,
      ]);

      const suggestions: SearchSuggestion[] = [];

      // Process API suggestions
      this.addApiSuggestions(suggestions, suggestionsResponse);

      // Process recent searches
      if (recentResponse && recentResponse.status === 'fulfilled') {
        this.addRecentSuggestions(suggestions, recentResponse.value, query);
      }

      // Process popular searches
      if (popularResponse && popularResponse.status === 'fulfilled') {
        this.addPopularSuggestions(suggestions, popularResponse.value, query);
      }

      // Add bill title suggestions using fuzzy search
      if (includeBillTitles && query.length > 2) {
        await this.addBillTitleSuggestions(suggestions, query);
      }

      // Deduplicate, sort, and limit suggestions
      const uniqueSuggestions = this.deduplicateAndSortSuggestions(suggestions, limit);

      return {
        suggestions: uniqueSuggestions,
        facets: {
          categories: [],
          sponsors: [],
          tags: [],
          statuses: [],
        },
        query,
        totalSuggestions: uniqueSuggestions.length,
      };
    } catch (error) {
      logger.error('Autocomplete failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.createEmptyAutocompleteResult(query);
    }
  }

  /**
   * Add API-generated suggestions to the collection
   */
  private addApiSuggestions(
    suggestions: SearchSuggestion[],
    response: PromiseSettledResult<unknown>
  ): void {
    if (response.status === 'fulfilled') {
      const apiSuggestions = response.value as SearchSuggestion[];
      if (Array.isArray(apiSuggestions)) {
        suggestions.push(...apiSuggestions);
      }
    }
  }

  /**
   * Add recent search suggestions that match the query
   */
  private addRecentSuggestions(
    suggestions: SearchSuggestion[],
    response: unknown,
    query: string
  ): void {
    const recentData = response as any[];
    if (Array.isArray(recentData)) {
      recentData.forEach((item: any) => {
        if (item.query && item.query.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            term: item.query,
            type: 'recent',
            frequency: item.frequency || 1,
            score: 0.8,
          });
        }
      });
    }
  }

  /**
   * Add popular search suggestions that match the query
   */
  private addPopularSuggestions(
    suggestions: SearchSuggestion[],
    response: unknown,
    query: string
  ): void {
    const popularData = response as any[];
    if (Array.isArray(popularData)) {
      popularData.forEach((item: any) => {
        if (item.query && item.query.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            term: item.query,
            type: 'popular',
            frequency: item.count || 1,
            score: 0.9,
          });
        }
      });
    }
  }

  /**
   * Add bill title suggestions using fuzzy matching
   */
  private async addBillTitleSuggestions(
    suggestions: SearchSuggestion[],
    query: string
  ): Promise<void> {
    try {
      const billData = await this.getFuseSearchData('bills');
      if (billData.length > 0) {
        const fuse = this.getFuseInstance('bills', billData);
        const results = fuse.search(query, { limit: 3 });

        results.forEach(result => {
          suggestions.push({
            term: result.item.title,
            type: 'bill_title',
            frequency: 1,
            score: 1 - (result.score || 0),
            id: result.item.id?.toString(),
            metadata: {
              bill_id: result.item.id,
              description: result.item.summary,
            },
          });
        });
      }
    } catch (error) {
      logger.debug('Failed to add bill title suggestions', { query, error });
    }
  }

  /**
   * Deduplicate and sort suggestions by score
   */
  private deduplicateAndSortSuggestions(
    suggestions: SearchSuggestion[],
    limit: number
  ): SearchSuggestion[] {
    return suggestions
      .filter(
        (suggestion, index, self) =>
          index === self.findIndex(s => s.term.toLowerCase() === suggestion.term.toLowerCase())
      )
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  /**
   * Save search with email alert configuration
   */
  async saveSearchWithAlerts(request: {
    name: string;
    query: DualSearchRequest;
    emailAlerts?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
      threshold?: number;
    };
    isPublic?: boolean;
  }): Promise<SavedSearch> {
    try {
      const response = await searchApiClient.saveSearch({
        name: request.name,
        query: request.query,
        is_public: request.isPublic || false,
      });

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to save search');
      }

      // Note: emailAlerts functionality would need to be implemented separately
      // as it's not part of the current SaveSearchRequest interface

      logger.info('Search saved successfully', {
        name: request.name,
        hasAlerts: !!request.emailAlerts?.enabled,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to save search with alerts', {
        name: request.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get comprehensive search analytics and performance metrics
   */
  async getSearchAnalytics(): Promise<
    SearchAnalytics & {
      enginePerformance: {
        postgresql: { avgTime: number; successRate: number };
        fuse: { avgTime: number; successRate: number };
      };
      qualityMetrics: {
        avgRelevanceScore: number;
        userSatisfactionRate: number;
      };
    }
  > {
    try {
      const response = await searchApiClient.getSearchAnalytics();

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get search analytics');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get search analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // Cache Management Methods
  // ============================================================================

  /**
   * Generate deterministic cache key from search request
   */
  private generateCacheKey(request: DualSearchRequest): string {
    const keyObject = {
      q: request.q.toLowerCase().trim(),
      type: request.type,
      filters: request.filters,
      sort: request.sort,
      enableFuzzy: request.enableFuzzy,
      limit: request.limit,
    };
    return `search:${JSON.stringify(keyObject)}`;
  }

  /**
   * Retrieve item from cache with validity check
   */
  private getFromCache(key: string): CacheEntry<CombinedSearchResult> | null {
    const cached = this.searchCache.get(key);

    if (cached) {
      const age = Date.now() - cached.timestamp;

      // Check if cache is still valid
      if (age < CACHE_CONFIG.TTL_MS) {
        cached.hits++;
        return cached;
      } else {
        // Remove expired entry
        this.searchCache.delete(key);
      }
    }

    return null;
  }

  /**
   * Store item in cache with automatic size management
   */
  private setCache(key: string, result: CombinedSearchResult): void {
    // Implement LRU eviction if cache is full
    if (this.searchCache.size >= CACHE_CONFIG.MAX_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.searchCache.set(key, {
      data: result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let leastHits = Infinity;

    // Find entry with oldest timestamp and fewest hits
    for (const [key, entry] of this.searchCache.entries()) {
      if (
        entry.timestamp < oldestTime ||
        (entry.timestamp === oldestTime && entry.hits < leastHits)
      ) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        leastHits = entry.hits;
      }
    }

    if (oldestKey) {
      this.searchCache.delete(oldestKey);
      logger.debug('Evicted cache entry', { key: oldestKey, hits: leastHits });
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.searchCache.entries()) {
      if (now - entry.timestamp > CACHE_CONFIG.TTL_MS) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.searchCache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug('Cleaned up expired cache entries', { count: keysToDelete.length });
    }
  }

  /**
   * Clear all caches manually
   */
  clearCache(): void {
    this.searchCache.clear();
    this.fuseInstances.clear();
    logger.info('All caches cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    searchCache: { size: number; maxSize: number };
    fuseInstances: { size: number };
    hitRate: number;
  } {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.searchCache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }

    return {
      searchCache: {
        size: this.searchCache.size,
        maxSize: CACHE_CONFIG.MAX_SIZE,
      },
      fuseInstances: {
        size: this.fuseInstances.size,
      },
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  }

  // ============================================================================
  // Utility and Helper Methods
  // ============================================================================

  /**
   * Calculate search quality score based on multiple factors
   */
  private calculateSearchQuality(results: SearchResult[], query: string): number {
    if (results.length === 0) return 0;

    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
    const hasHighRelevance = results.some(r => r.relevanceScore > 80);
    const queryLower = query.toLowerCase();

    const queryTermsFound = results.some(
      r =>
        r.title.toLowerCase().includes(queryLower) || r.content.toLowerCase().includes(queryLower)
    );

    // Weighted quality calculation
    return (avgRelevance / 100) * 0.6 + (hasHighRelevance ? 0.3 : 0) + (queryTermsFound ? 0.1 : 0);
  }

  /**
   * Map search type to result type
   */
  private getResultType(type?: string): 'bill' | 'sponsor' | 'comment' {
    switch (type) {
      case 'sponsors':
        return 'sponsor';
      case 'comments':
        return 'comment';
      default:
        return 'bill';
    }
  }

  /**
   * Generate contextual excerpt with query highlighting
   */
  private generateExcerpt(item: any, query: string): string {
    const content = item.summary || item.content || item.title || '';
    const maxLength = 200;
    const contextWindow = 50;

    if (!content) return '';

    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);

    // If query not found, return beginning of content
    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Extract excerpt around the query match
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(content.length, index + query.length + contextWindow);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  /**
   * Generate highlights from Fuse.js match data
   */
  private generateHighlights(matches: readonly any[] | undefined): SearchHighlight[] {
    if (!matches || matches.length === 0) return [];

    return matches
      .map(match => {
        if (!match.value || !match.indices) return null;

        const { value, indices } = match;
        let highlighted = value;

        // Apply highlighting in reverse order to maintain correct positions
        indices
          .slice()
          .reverse()
          .forEach(([start, end]: readonly [number, number]) => {
            const before = highlighted.substring(0, start);
            const matchText = highlighted.substring(start, end + 1);
            const after = highlighted.substring(end + 1);
            highlighted = `${before}<mark>${matchText}</mark>${after}`;
          });

        return {
          field: match.key || 'content',
          snippet: highlighted,
          positions: indices.map(([start, end]: readonly [number, number]) => ({
            start,
            end,
          })),
        };
      })
      .filter((h): h is SearchHighlight => h !== null);
  }

  /**
   * Generate intelligent search suggestions from results
   */
  private async generateSuggestions(query: string, results: SearchResult[]): Promise<string[]> {
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/));

    // Extract relevant terms from top results
    results.slice(0, 10).forEach(result => {
      const words = result.title.toLowerCase().split(/\s+/);

      words.forEach(word => {
        // Add words that are:
        // - Longer than 3 characters
        // - Not already in the query
        // - Likely to be meaningful (simple heuristic)
        if (word.length > 3 && !queryWords.has(word) && !this.isCommonStopWord(word)) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, SEARCH_CONFIG.SUGGESTION_LIMIT);
  }

  /**
   * Check if word is a common stop word
   */
  private isCommonStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'that',
      'this',
      'with',
      'from',
      'have',
      'been',
      'will',
      'would',
      'could',
      'should',
      'about',
      'their',
      'there',
      'which',
      'when',
      'where',
      'while',
      'what',
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Generate faceted search data for filtering
   */
  private generateFacets(results: SearchResult[]): SearchFacets {
    const facets: SearchFacets = {
      types: {},
      categories: {},
      statuses: {},
    };

    results.forEach(result => {
      // Count by type
      facets.types[result.type] = (facets.types[result.type] || 0) + 1;

      // Count by category if available
      if (result.metadata?.category) {
        const category = result.metadata.category;
        facets.categories[category] = (facets.categories[category] || 0) + 1;
      }

      // Count by status if available
      if (result.metadata?.status) {
        const status = result.metadata.status;
        facets.statuses[status] = (facets.statuses[status] || 0) + 1;
      }
    });

    return facets;
  }

  /**
   * Create empty search result for error cases
   */
  private createEmptyResult(): CombinedSearchResult {
    return {
      results: [],
      engines: [],
      totalCount: 0,
      searchTime: 0,
      suggestions: [],
      facets: {
        types: {},
        categories: {},
        statuses: {},
      },
    };
  }

  /**
   * Create empty engine result for error cases
   */
  private createEmptyEngineResult(
    engine: 'postgresql' | 'fuse',
    startTime: number
  ): SearchEngineResult {
    return {
      engine,
      results: [],
      searchTime: Date.now() - startTime,
      totalCount: 0,
      quality: 0,
    };
  }

  /**
   * Create empty autocomplete result
   */
  private createEmptyAutocompleteResult(query: string): AutocompleteResult {
    return {
      suggestions: [],
      facets: {
        categories: [],
        sponsors: [],
        tags: [],
        statuses: [],
      },
      query,
      totalSuggestions: 0,
    };
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearCache();
    logger.info('IntelligentSearchService destroyed');
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const intelligentSearch = new IntelligentSearchService();
export default intelligentSearch;

// Export for testing purposes
export { IntelligentSearchService };
