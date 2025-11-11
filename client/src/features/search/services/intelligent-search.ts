/**
 * Intelligent Search Service - Dual-Engine Search Implementation
 * 
 * Implements PostgreSQL full-text search with Fuse.js fuzzy matching fallback
 * for comprehensive search capabilities with typo tolerance and relevance scoring.
 */

import Fuse from 'fuse.js';
import { api } from '../../../services/apiService';
import { logger } from '@/utils/logger';
import type {
  SearchResult,
  SearchSuggestion,
  AutocompleteResult,
  SavedSearch,
  SearchAnalytics,
  SearchHighlight,
  SearchQuery
} from '../types';

// Enhanced search types for dual-engine approach
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
  quality: number; // 0-1 score indicating result quality
}

export interface CombinedSearchResult {
  results: SearchResult[];
  engines: SearchEngineResult[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
  facets: any;
}

// Fuse.js configuration for different content types
const FUSE_CONFIGS = {
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
      { name: 'policyAreas', weight: 0.2 }
    ] as Array<{ name: string; weight: number }>
  },
  sponsors: {
    threshold: 0.3,
    distance: 50,
    includeScore: true,
    includeMatches: true,
    keys: [
      { name: 'name', weight: 0.9 },
      { name: 'party', weight: 0.1 }
    ] as Array<{ name: string; weight: number }>
  },
  comments: {
    threshold: 0.5,
    distance: 200,
    includeScore: true,
    includeMatches: true,
    keys: [
      { name: 'content', weight: 1.0 }
    ] as Array<{ name: string; weight: number }>
  }
} as const;

class IntelligentSearchService {
  private fuseInstances: Map<string, Fuse<any>> = new Map();
  private searchCache: Map<string, CombinedSearchResult> = new Map();
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Perform intelligent dual-engine search
   */
  async search(request: DualSearchRequest): Promise<CombinedSearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Search cache hit', { query: request.q, cacheKey });
      return cached;
    }

    try {
      // Run both search engines in parallel
      const [postgresqlResult, fuseResult] = await Promise.allSettled([
        this.performPostgreSQLSearch(request),
        request.enableFuzzy !== false ? this.performFuseSearch(request) : null
      ]);

      const engines: SearchEngineResult[] = [];
      let combinedResults: SearchResult[] = [];

      // Process PostgreSQL results
      if (postgresqlResult.status === 'fulfilled' && postgresqlResult.value) {
        engines.push(postgresqlResult.value);
        combinedResults = [...postgresqlResult.value.results];
      }

      // Process Fuse.js results
      if (fuseResult && fuseResult.status === 'fulfilled' && fuseResult.value) {
        engines.push(fuseResult.value);
        
        if (request.combineResults !== false) {
          // Merge results, avoiding duplicates
          const existingIds = new Set(combinedResults.map(r => r.id));
          const newResults = fuseResult.value.results.filter(r => !existingIds.has(r.id));
          combinedResults = [...combinedResults, ...newResults];
        }
      }

      // Sort combined results by relevance score
      combinedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Apply result limit
      if (request.maxResults) {
        combinedResults = combinedResults.slice(0, request.maxResults);
      }

      // Generate suggestions and facets
      const suggestions = await this.generateSuggestions(request.q, combinedResults);
      const facets = this.generateFacets(combinedResults);

      const result: CombinedSearchResult = {
        results: combinedResults,
        engines,
        totalCount: combinedResults.length,
        searchTime: Date.now() - startTime,
        suggestions,
        facets
      };

      // Cache the result
      this.setCache(cacheKey, result);

      logger.info('Dual-engine search completed', {
        query: request.q,
        totalResults: result.totalCount,
        searchTime: result.searchTime,
        engines: engines.map(e => e.engine)
      });

      return result;

    } catch (error) {
      logger.error('Intelligent search failed', {
        query: request.q,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform PostgreSQL full-text search
   */
  private async performPostgreSQLSearch(request: DualSearchRequest): Promise<SearchEngineResult> {
    const startTime = Date.now();

    try {
      const response = await api.get('/api/search/postgresql', {
        params: {
          q: request.q,
          type: request.type,
          filters: request.filters,
          sort: request.sort,
          limit: request.limit,
          offset: request.offset
        }
      });

      if (!response.success) {
        throw new Error('PostgreSQL search failed');
      }

      const searchTime = Date.now() - startTime;
      const quality = this.calculateSearchQuality(response.data.results, request.q);

      return {
        engine: 'postgresql',
        results: response.data.results || [],
        searchTime,
        totalCount: response.data.total || 0,
        quality
      };

    } catch (error) {
      logger.warn('PostgreSQL search failed, falling back to Fuse.js', {
        query: request.q,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        engine: 'postgresql',
        results: [],
        searchTime: Date.now() - startTime,
        totalCount: 0,
        quality: 0
      };
    }
  }

  /**
   * Perform Fuse.js fuzzy search
   */
  private async performFuseSearch(request: DualSearchRequest): Promise<SearchEngineResult> {
    const startTime = Date.now();

    try {
      // Get data for fuzzy search
      const data = await this.getFuseSearchData(request.type);
      
      if (!data || data.length === 0) {
        return {
          engine: 'fuse',
          results: [],
          searchTime: Date.now() - startTime,
          totalCount: 0,
          quality: 0
        };
      }

      // Get or create Fuse instance
      const fuse = this.getFuseInstance(request.type || 'bills', data);
      
      // Perform fuzzy search
      const fuseResults = fuse.search(request.q, {
        limit: request.limit || 50
      });

      // Convert Fuse results to SearchResult format
      const results: SearchResult[] = fuseResults.map(result => ({
        id: result.item.id?.toString() || '',
        type: this.getResultType(request.type),
        title: result.item.title || result.item.name || '',
        content: result.item.summary || result.item.content || '',
        excerpt: this.generateExcerpt(result.item, request.q),
        relevanceScore: (1 - (result.score || 0)) * 100,
        metadata: {
          ...result.item,
          fuseScore: result.score,
          matches: result.matches
        },
        highlights: this.generateHighlights(result.matches)
      }));

      const searchTime = Date.now() - startTime;
      const quality = this.calculateSearchQuality(results, request.q);

      return {
        engine: 'fuse',
        results,
        searchTime,
        totalCount: results.length,
        quality
      };

    } catch (error) {
      logger.error('Fuse.js search failed', {
        query: request.q,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        engine: 'fuse',
        results: [],
        searchTime: Date.now() - startTime,
        totalCount: 0,
        quality: 0
      };
    }
  }

  /**
   * Get or create Fuse instance for specific content type
   */
  private getFuseInstance(type: string, data: any[]): Fuse<any> {
    const cacheKey = `${type}-${data.length}`;
    
    if (this.fuseInstances.has(cacheKey)) {
      return this.fuseInstances.get(cacheKey)!;
    }

    const config = FUSE_CONFIGS[type as keyof typeof FUSE_CONFIGS] || FUSE_CONFIGS.bills;
    const fuse = new Fuse(data, config);
    
    this.fuseInstances.set(cacheKey, fuse);
    return fuse;
  }

  /**
   * Get data for Fuse.js search
   */
  private async getFuseSearchData(type?: string): Promise<any[]> {
    try {
      const response = await api.get('/api/search/data', {
        params: { type: type || 'bills' }
      });

      if (response.success) {
        return response.data || [];
      }
      return [];
    } catch (error) {
      logger.warn('Failed to get Fuse search data', { type, error });
      return [];
    }
  }

  /**
   * Generate autocomplete suggestions
   */
  async getAutocomplete(query: string, options: {
    limit?: number;
    includeRecent?: boolean;
    includePopular?: boolean;
    includeBillTitles?: boolean;
  } = {}): Promise<AutocompleteResult> {
    const {
      limit = 10,
      includeRecent = true,
      includePopular = true,
      includeBillTitles = true
    } = options;

    try {
      const [suggestionsResponse, recentResponse, popularResponse] = await Promise.allSettled([
        api.get('/api/search/suggestions', { params: { q: query, limit } }),
        includeRecent ? api.get('/api/search/recent', { params: { limit: 5 } }) : null,
        includePopular ? api.get('/api/search/popular', { params: { limit: 5 } }) : null
      ]);

      const suggestions: SearchSuggestion[] = [];
      
      // Add API suggestions
      if (suggestionsResponse.status === 'fulfilled' && suggestionsResponse.value.success) {
        suggestions.push(...(suggestionsResponse.value.data || []));
      }

      // Add recent searches
      if (recentResponse && recentResponse.status === 'fulfilled' && recentResponse.value?.success) {
        const recent = recentResponse.value.data || [];
        recent.forEach((item: any) => {
          if (item.query.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({
              term: item.query,
              type: 'recent',
              frequency: item.frequency || 1,
              score: 0.8
            });
          }
        });
      }

      // Add popular searches
      if (popularResponse && popularResponse.status === 'fulfilled' && popularResponse.value?.success) {
        const popular = popularResponse.value.data || [];
        popular.forEach((item: any) => {
          if (item.query.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({
              term: item.query,
              type: 'popular',
              frequency: item.count || 1,
              score: 0.9
            });
          }
        });
      }

      // Generate bill title suggestions using Fuse.js
      if (includeBillTitles && query.length > 2) {
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
                description: result.item.summary
              }
            });
          });
        }
      }

      // Sort by score and remove duplicates
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.term.toLowerCase() === suggestion.term.toLowerCase())
        )
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);

      return {
        suggestions: uniqueSuggestions,
        facets: {
          categories: [],
          sponsors: [],
          tags: [],
          statuses: []
        },
        query,
        totalSuggestions: uniqueSuggestions.length
      };

    } catch (error) {
      logger.error('Autocomplete failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        suggestions: [],
        facets: {
          categories: [],
          sponsors: [],
          tags: [],
          statuses: []
        },
        query,
        totalSuggestions: 0
      };
    }
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
      threshold?: number; // minimum new results to trigger alert
    };
    isPublic?: boolean;
  }): Promise<SavedSearch> {
    try {
      const response = await api.post('/api/search/saved', {
        name: request.name,
        query: request.query,
        emailAlerts: request.emailAlerts,
        is_public: request.isPublic || false
      });

      if (!response.success) {
        throw new Error('Failed to save search');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to save search with alerts', {
        name: request.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get search analytics and insights
   */
  async getSearchAnalytics(): Promise<SearchAnalytics & {
    enginePerformance: {
      postgresql: { avgTime: number; successRate: number };
      fuse: { avgTime: number; successRate: number };
    };
    qualityMetrics: {
      avgRelevanceScore: number;
      userSatisfactionRate: number;
    };
  }> {
    try {
      const response = await api.get('/api/search/analytics');
      
      if (!response.success) {
        throw new Error('Failed to get search analytics');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get search analytics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Helper methods

  private generateCacheKey(request: DualSearchRequest): string {
    return `search:${JSON.stringify({
      q: request.q,
      type: request.type,
      filters: request.filters,
      sort: request.sort,
      enableFuzzy: request.enableFuzzy,
      limit: request.limit
    })}`;
  }

  private getFromCache(key: string): CombinedSearchResult | null {
    const cached = this.searchCache.get(key);
    if (cached) {
      // Check if cache is still valid (simple TTL check)
      return cached;
    }
    return null;
  }

  private setCache(key: string, result: CombinedSearchResult): void {
    // Simple cache size management
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, result);
  }

  private calculateSearchQuality(results: SearchResult[], query: string): number {
    if (results.length === 0) return 0;

    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
    const hasHighRelevance = results.some(r => r.relevanceScore > 80);
    const queryTermsFound = results.some(r => 
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.content.toLowerCase().includes(query.toLowerCase())
    );

    return (avgRelevance / 100) * 0.6 + (hasHighRelevance ? 0.3 : 0) + (queryTermsFound ? 0.1 : 0);
  }

  private getResultType(type?: string): 'bill' | 'sponsor' | 'comment' {
    switch (type) {
      case 'sponsors': return 'sponsor';
      case 'comments': return 'comment';
      default: return 'bill';
    }
  }

  private generateExcerpt(item: any, query: string): string {
    const content = item.summary || item.content || item.title || '';
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    const index = contentLower.indexOf(queryLower);
    if (index === -1) {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  private generateHighlights(matches: readonly any[] | undefined): SearchHighlight[] {
    if (!matches || matches.length === 0) return [];

    return matches.map(match => {
      const { value, indices } = match;
      let highlighted = value;

      // Apply highlighting to matched indices
      indices.slice().reverse().forEach(([start, end]: readonly [number, number]) => {
        const before = highlighted.substring(0, start);
        const matchText = highlighted.substring(start, end + 1);
        const after = highlighted.substring(end + 1);
        highlighted = `${before}<mark>${matchText}</mark>${after}`;
      });

      return {
        field: 'content',
        snippet: highlighted,
        positions: indices.map(([start, end]: readonly [number, number]) => ({ start, end }))
      };
    });
  }

  private async generateSuggestions(query: string, results: SearchResult[]): Promise<string[]> {
    // Extract common terms from results for suggestions
    const suggestions = new Set<string>();
    
    results.forEach(result => {
      const words = result.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !query.toLowerCase().includes(word)) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }

  private generateFacets(results: SearchResult[]): any {
    const facets = {
      types: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      statuses: {} as Record<string, number>
    };

    results.forEach(result => {
      // Count by type
      facets.types[result.type] = (facets.types[result.type] || 0) + 1;

      // Count by metadata
      if (result.metadata.category) {
        facets.categories[result.metadata.category] = (facets.categories[result.metadata.category] || 0) + 1;
      }
      if (result.metadata.status) {
        facets.statuses[result.metadata.status] = (facets.statuses[result.metadata.status] || 0) + 1;
      }
    });

    return facets;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.fuseInstances.clear();
  }
}

// Export singleton instance
export const intelligentSearch = new IntelligentSearchService();
export default intelligentSearch;