import { eq, desc, and, sql, count, ilike, or, asc, gt, gte, lte, inArray } from "drizzle-orm";
import { databaseService } from "../services/database-service";
import { cacheService, CACHE_TTL } from "../infrastructure/cache/cache-service";
import { searchSuggestionsService } from "./search-suggestions";
import * as schema from "../../shared/schema";
import { Bill, BillComment, Sponsor } from "../../shared/schema";
import { logger } from '../../utils/logger';

// Search interfaces and types
export interface SearchQuery {
  text: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  options?: SearchOptions;
}

export interface SearchFilters {
  status?: string[];
  category?: string[];
  sponsorId?: string[]; // Fixed: Changed from number[] to string[] to match UUID type
  dateFrom?: Date;
  dateTo?: Date;
  complexityMin?: number;
  complexityMax?: number;
  tags?: string[];
}

export interface SearchPagination {
  page: number;
  limit: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'engagement';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  includeSnippets?: boolean;
  includeHighlights?: boolean;
  minRelevanceScore?: number;
  searchType?: 'simple' | 'phrase' | 'boolean';
}

export interface SearchResult {
  bill: Bill;
  relevanceScore: number;
  snippet?: string;
  highlights?: string[];
  matchedFields: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  facets: SearchFacets;
  suggestions?: string[];
  metadata: {
    searchTime: number;
    source: 'database' | 'fallback' | 'cache';
    queryType: string;
  };
}

export interface SearchFacets {
  status: Array<{ value: string; count: number; label: string }>;
  category: Array<{ value: string; count: number; label: string }>;
  sponsors: Array<{ value: string; count: number; label: string }>; // Fixed: Changed from number to string
  complexity: Array<{ range: string; count: number; min: number; max: number }>;
  dateRanges: Array<{ range: string; count: number; from: Date; to: Date }>;
}

export interface SearchSuggestion {
  term: string;
  frequency: number;
  type: 'popular' | 'recent' | 'related' | 'bill_title' | 'category' | 'sponsor' | 'tag';
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  clickedResults: number[];
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface SearchQueryResult {
  bill: Bill;
  rank: number;
  snippet: string | null;
}

interface FacetQueryResult {
  value: string;
  count: number;
}

// Cache key generators - Fixed to match actual usage
const SEARCH_CACHE_KEYS = {
  SEARCH_RESULTS: (query: string, filters: string) => `search:results:${query}:${filters}`,
  SUGGESTIONS: (query: string, limit: number) => `search:suggestions:${query}:${limit}`,
  POPULAR_SEARCHES: 'search:popular',
  INDEX_HEALTH: 'search:index_health'
} as const;

/**
 * Comprehensive Search Service with PostgreSQL full-text search capabilities
 */
export class SearchService {
  private db = databaseService.getDatabase();
  
  // Constants for search configuration
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;
  private readonly MIN_QUERY_LENGTH = 2;
  private readonly MAX_SNIPPET_WORDS = 50;
  private readonly MIN_RELEVANCE_THRESHOLD = 0.001;
  
  // Request-scoped query cache for memoization
  private readonly queryCache = new Map<string, any>();

  /**
   * Perform full-text search across bills with advanced filtering and ranking
   */
  async searchBills(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    const sanitizedQuery = this.sanitizeSearchQuery(query);
    
    if (!sanitizedQuery.text && !sanitizedQuery.filters) {
      return this.getEmptySearchResponse(sanitizedQuery, startTime);
    }
    
    const cacheKey = this.generateCacheKey(sanitizedQuery);

    // Check cache first
    const cachedResult = await cacheService.get<SearchResponse>(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          searchTime: Date.now() - startTime,
          source: 'cache' as const
        }
      };
    }

    // Execute search with fallback handling
    const result = await databaseService.withFallback(
      async () => this.executeDatabaseSearch(sanitizedQuery, startTime),
      this.getFallbackSearchResponse(sanitizedQuery, startTime),
      `searchBills(${sanitizedQuery.text})`
    );

    // Cache successful results (fire-and-forget)
    if (result.source === 'database' && result.data.results.length > 0) {
      cacheService.set(cacheKey, result.data, CACHE_TTL.SEARCH_RESULTS);
    }

    // Record analytics asynchronously
    this.recordSearchAnalytics({
      query: sanitizedQuery.text,
      resultCount: result.data.results.length,
      clickedResults: [],
      timestamp: new Date()
    }).catch((err: Error) => logger.error('Analytics recording failed:', { component: 'SimpleTool' }, err));

    return result.data;
  }

  /**
   * Execute the actual database search query
   */
  private async executeDatabaseSearch(
    query: SearchQuery, 
    startTime: number
  ): Promise<SearchResponse> {
    const searchVector = this.buildSearchVector(query.text, query.options?.searchType);
    const conditions = this.buildSearchConditions(query.filters, searchVector);
    const pagination = this.normalizePagination(query.pagination);
    const offset = (pagination.page - 1) * pagination.limit;

    const rankExpression = sql<number>`ts_rank_cd(search_vector, ${searchVector}, 32)`;
    
    const searchQuery = this.db
      .select({
        bill: schema.bills,
        rank: rankExpression,
        snippet: query.options?.includeSnippets 
          ? sql<string>`ts_headline(
              'english', 
              coalesce(${schema.bills.content}, ${schema.bills.description}, ${schema.bills.summary}, ''), 
              ${searchVector}, 
              'MaxWords=${this.MAX_SNIPPET_WORDS}, MinWords=10, ShortWord=3, HighlightAll=false, MaxFragments=3, FragmentDelimiter=" ... "'
            )`
          : sql<string>`NULL`
      })
      .from(schema.bills)
      .where(and(...conditions));

    const sortedQuery = this.applySorting(
      searchQuery, 
      pagination.sortBy, 
      pagination.sortOrder,
      rankExpression
    );

    // Parallel query execution
    const [results, totalResult] = await Promise.all([
      sortedQuery.limit(pagination.limit).offset(offset),
      this.getSearchCount(conditions)
    ]);

    const total = totalResult[0]?.count || 0;
    
    const minScore = query.options?.minRelevanceScore ?? this.MIN_RELEVANCE_THRESHOLD;
    const filteredResults = results.filter((r: SearchQueryResult) => r.rank >= minScore);

    // Batch process highlights
    const searchTerms = this.extractSearchTerms(query.text);
    const searchResults: SearchResult[] = filteredResults.map((result: SearchQueryResult) => {
      const highlights = query.options?.includeHighlights 
        ? this.extractHighlightsOptimized(result.bill, searchTerms)
        : undefined;
      
      return {
        bill: result.bill,
        relevanceScore: result.rank,
        snippet: result.snippet || undefined,
        highlights,
        matchedFields: highlights || []
      };
    });

    // Conditional facet and suggestion generation
    const shouldGenerateFacets = total > 0 && total < 10000;
    const shouldGenerateSuggestions = searchResults.length === 0;
    
    const [facets, suggestions] = await Promise.all([
      shouldGenerateFacets 
        ? this.generateSearchFacets(searchVector, query.filters)
        : this.getEmptyFacets(),
      shouldGenerateSuggestions 
        ? this.generateSearchSuggestions(query.text)
        : Promise.resolve(undefined)
    ]);

    return {
      results: searchResults,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit)
      },
      facets,
      suggestions,
      metadata: {
        searchTime: Date.now() - startTime,
        source: 'database' as const,
        queryType: query.options?.searchType || 'simple'
      }
    };
  }

  /**
   * Get search suggestions and autocomplete
   */
  async getSearchSuggestions(
    partialQuery: string, 
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    if (partialQuery.length < this.MIN_QUERY_LENGTH) {
      return [];
    }

    const normalizedLimit = Math.max(1, Math.min(limit, 20));
    const cacheKey = SEARCH_CACHE_KEYS.SUGGESTIONS(partialQuery, normalizedLimit);
    
    const cached = await cacheService.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    try {
      const autocompleteResult = await searchSuggestionsService.getAutocompleteSuggestions(
        partialQuery, 
        normalizedLimit,
        true
      );

      // Cache for 5 minutes
      await cacheService.set(cacheKey, autocompleteResult.suggestions, 300);
      
      return autocompleteResult.suggestions;
    } catch (error) {
      logger.error('Error getting search suggestions:', { component: 'SimpleTool' }, error);
      return this.getFallbackSuggestions(partialQuery, normalizedLimit);
    }
  }

  /**
   * Get popular search terms for trending searches display
   */
  async getPopularSearchTerms(limit: number = 20): Promise<SearchSuggestion[]> {
    const cacheKey = SEARCH_CACHE_KEYS.POPULAR_SEARCHES;
    const cachedResult = await cacheService.get<SearchSuggestion[]>(cacheKey);
    
    if (cachedResult) {
      return cachedResult.slice(0, limit);
    }

    // Static popular terms as fallback
    const popularTerms: SearchSuggestion[] = [
      { term: 'healthcare', frequency: 156, type: 'popular' as const },
      { term: 'climate change', frequency: 134, type: 'popular' as const },
      { term: 'digital privacy', frequency: 98, type: 'popular' as const },
      { term: 'education funding', frequency: 87, type: 'popular' as const },
      { term: 'infrastructure', frequency: 76, type: 'popular' as const },
      { term: 'tax reform', frequency: 65, type: 'popular' as const },
      { term: 'renewable energy', frequency: 54, type: 'popular' as const },
      { term: 'social security', frequency: 43, type: 'popular' as const }
    ].slice(0, limit);

    await cacheService.set(cacheKey, popularTerms, CACHE_TTL.LONG);
    return popularTerms;
  }

  /**
   * Rebuild search indexes for all bills
   */
  async rebuildSearchIndexes(batchSize: number = 1000): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      const [{ count: needsUpdate }] = await this.db
        .select({ count: count() })
        .from(schema.bills)
        .where(or(
          sql`search_vector IS NULL`,
          sql`search_vector = to_tsvector('')`
        ));

      if (needsUpdate === 0) {
        logger.info('All search indexes are up to date', { component: 'SimpleTool' });
        return { updated: 0, errors: 0 };
      }

      // Weighted index update: A (title) > B (summary) > C (description) > D (content)
      const result = await this.db.execute(sql`
        UPDATE bills 
        SET search_vector = 
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(content, '')), 'D'),
          updated_at = NOW()
        WHERE search_vector IS NULL OR search_vector = to_tsvector('')
      `);

      updated = result.rowCount || 0;

      await this.clearSearchCaches();

      console.log(`Search index rebuild completed: ${updated} bills updated`);
    } catch (error) {
      logger.error('Error rebuilding search indexes:', { component: 'SimpleTool' }, error);
      errors = 1;
    }

    return { updated, errors };
  }

  /**
   * Get search index health status for monitoring
   */
  async getSearchIndexHealth(): Promise<{
    totalBills: number;
    indexedBills: number;
    missingIndexes: number;
    indexHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const cacheKey = SEARCH_CACHE_KEYS.INDEX_HEALTH;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const result = await databaseService.withFallback(
      async () => {
        const [stats] = await this.db.execute(sql`
          SELECT 
            COUNT(*) as total_bills,
            COUNT(search_vector) FILTER (WHERE search_vector IS NOT NULL AND search_vector != to_tsvector('')) as indexed_bills,
            COUNT(*) FILTER (WHERE search_vector IS NULL OR search_vector = to_tsvector('')) as missing_indexes
          FROM bills
        `);

        const totalBills = Number(stats.total_bills) || 0;
        const indexedBills = Number(stats.indexed_bills) || 0;
        const missingIndexes = Number(stats.missing_indexes) || 0;

        const indexRatio = totalBills > 0 ? indexedBills / totalBills : 1;
        
        let indexHealth: 'healthy' | 'degraded' | 'critical';
        if (indexRatio >= 0.95) {
          indexHealth = 'healthy';
        } else if (indexRatio >= 0.80) {
          indexHealth = 'degraded';
        } else {
          indexHealth = 'critical';
        }

        const healthData = {
          totalBills,
          indexedBills,
          missingIndexes,
          indexHealth
        };

        // Cache for 5 minutes
        await cacheService.set(cacheKey, healthData, 300);

        return healthData;
      },
      {
        totalBills: 0,
        indexedBills: 0,
        missingIndexes: 0,
        indexHealth: 'critical' as const
      },
      'getSearchIndexHealth'
    );

    return result.data;
  }

  // Private helper methods

  private sanitizeSearchQuery(query: SearchQuery): SearchQuery {
    return {
      text: query.text.trim().slice(0, 500),
      filters: query.filters,
      pagination: query.pagination,
      options: query.options
    };
  }

  private generateCacheKey(query: SearchQuery): string {
    const filterStr = query.filters 
      ? `${query.filters.status?.join(',')}:${query.filters.category?.join(',')}:${query.filters.sponsorId?.join(',')}`
      : '';
    const pageStr = query.pagination 
      ? `${query.pagination.page}:${query.pagination.limit}:${query.pagination.sortBy}`
      : '';
    
    return SEARCH_CACHE_KEYS.SEARCH_RESULTS(query.text, `${filterStr}:${pageStr}`);
  }

  private normalizePagination(pagination?: SearchPagination): Required<SearchPagination> {
    return {
      page: Math.max(1, pagination?.page ?? this.DEFAULT_PAGE),
      limit: Math.min(Math.max(1, pagination?.limit ?? this.DEFAULT_LIMIT), this.MAX_LIMIT),
      sortBy: pagination?.sortBy ?? 'relevance',
      sortOrder: pagination?.sortOrder ?? 'desc'
    };
  }

  private buildSearchVector(query: string, searchType: string = 'simple'): any {
    const cacheKey = `${query}:${searchType}`;
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey);
    }
    
    const cleanQuery = query.trim()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    let result;
    if (!cleanQuery) {
      result = sql`to_tsquery('')`;
    } else {
      switch (searchType) {
        case 'phrase':
          result = sql`phraseto_tsquery('english', ${cleanQuery})`;
          break;
        case 'boolean':
          result = sql`to_tsquery('english', ${cleanQuery})`;
          break;
        case 'simple':
        default:
          result = sql`plainto_tsquery('english', ${cleanQuery})`;
      }
    }
    
    this.queryCache.set(cacheKey, result);
    return result;
  }

  private buildSearchConditions(filters?: SearchFilters, searchVector?: any): any[] {
    const conditions: any[] = [];

    if (searchVector) {
      conditions.push(sql`search_vector @@ ${searchVector}`);
    }

    if (!filters) return conditions.length ? conditions : [sql`1=1`];

    if (filters.status?.length) {
      conditions.push(inArray(schema.bills.status, filters.status));
    }

    if (filters.category?.length) {
      conditions.push(inArray(schema.bills.category, filters.category));
    }

    // Fixed: sponsorId is now string[] to match UUID type
    if (filters.sponsorId?.length) {
      conditions.push(inArray(schema.bills.sponsorId, filters.sponsorId));
    }

    if (filters.dateFrom) {
      conditions.push(gte(schema.bills.introducedDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(schema.bills.introducedDate, filters.dateTo));
    }

    if (filters.complexityMin !== undefined) {
      conditions.push(gte(schema.bills.complexityScore, filters.complexityMin));
    }
    if (filters.complexityMax !== undefined) {
      conditions.push(lte(schema.bills.complexityScore, filters.complexityMax));
    }

    if (filters.tags?.length) {
      conditions.push(sql`${schema.bills.tags} && ${filters.tags}`);
    }

    return conditions.length ? conditions : [sql`1=1`];
  }

  private applySorting(
    query: any, 
    sortBy: string = 'relevance', 
    sortOrder: string = 'desc',
    rankExpression?: any
  ) {
    const direction = sortOrder === 'asc' ? asc : desc;
    
    switch (sortBy) {
      case 'date':
        return query.orderBy(direction(schema.bills.introducedDate));
      case 'title':
        return query.orderBy(direction(schema.bills.title));
      case 'engagement':
        return query.orderBy(direction(schema.bills.viewCount));
      case 'relevance':
      default:
        return rankExpression ? query.orderBy(desc(rankExpression)) : query;
    }
  }

  private async getSearchCount(conditions: any[]): Promise<Array<{ count: number }>> {
    return this.db
      .select({ count: count() })
      .from(schema.bills)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 10);
  }

  private extractHighlightsOptimized(bill: Bill, searchTerms: string[]): string[] {
    if (!searchTerms.length) return [];
    
    const highlights: string[] = [];
    
    const fieldsToCheck = [
      { field: bill.title, name: 'title' },
      { field: bill.summary, name: 'summary' },
      { field: bill.description, name: 'description' },
      { field: bill.content, name: 'content' }
    ];

    for (const { field, name } of fieldsToCheck) {
      if (field) {
        const fieldLower = field.toLowerCase();
        if (searchTerms.some(term => fieldLower.includes(term))) {
          highlights.push(name);
        }
      }
    }

    return highlights;
  }

  private async generateSearchFacets(
    searchVector: any,
    filters?: SearchFilters
  ): Promise<SearchFacets> {
    try {
      const baseConditions = this.buildSearchConditions(filters, searchVector);

      const [statusFacets, categoryFacets] = await Promise.all([
        this.db
          .select({
            value: schema.bills.status,
            count: count()
          })
          .from(schema.bills)
          .where(baseConditions.length ? and(...baseConditions) : undefined)
          .groupBy(schema.bills.status)
          .orderBy(desc(count()))
          .limit(10),
        
        this.db
          .select({
            value: schema.bills.category,
            count: count()
          })
          .from(schema.bills)
          .where(and(
            sql`${schema.bills.category} IS NOT NULL`,
            ...(baseConditions.length ? baseConditions : [])
          ))
          .groupBy(schema.bills.category)
          .orderBy(desc(count()))
          .limit(15)
      ]);

      return {
        status: statusFacets.map((f: FacetQueryResult) => ({
          value: f.value,
          count: f.count,
          label: this.formatFacetLabel(f.value)
        })),
        category: categoryFacets.map((f: FacetQueryResult) => ({
          value: f.value || '',
          count: f.count,
          label: this.formatFacetLabel(f.value || '')
        })),
        sponsors: [],
        complexity: [],
        dateRanges: []
      };
    } catch (error) {
      logger.error('Error generating search facets:', { component: 'SimpleTool' }, error);
      return this.getEmptyFacets();
    }
  }

  private getEmptyFacets(): SearchFacets {
    return {
      status: [],
      category: [],
      sponsors: [],
      complexity: [],
      dateRanges: []
    };
  }

  private formatFacetLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      const suggestions = await searchSuggestionsService.getAutocompleteSuggestions(
        query,
        5,
        false
      );
      
      return suggestions.suggestions.map(s => s.term);
    } catch (error) {
      logger.error('Error generating suggestions:', { component: 'SimpleTool' }, error);
      return this.getFallbackSuggestionsList(query);
    }
  }

  private getFallbackSuggestionsList(query: string): string[] {
    const commonTerms = [
      'healthcare reform',
      'climate change',
      'digital privacy',
      'education funding',
      'infrastructure bill',
      'tax policy',
      'renewable energy',
      'social security'
    ];

    const queryLower = query.toLowerCase();
    
    const substringMatches = commonTerms.filter(s => 
      s.toLowerCase().includes(queryLower)
    );
    
    if (substringMatches.length > 0) {
      return substringMatches.slice(0, 5);
    }
    
    return commonTerms
      .filter(s => this.calculateLevenshteinDistance(s.toLowerCase(), queryLower) <= 3)
      .slice(0, 5);
  }

  private calculateLevenshteinDistance(str1: string, str2: string, maxDistance: number = 10): number {
    if (Math.abs(str1.length - str2.length) > maxDistance) {
      return maxDistance + 1;
    }
    
    const matrix: number[][] = Array(str2.length + 1).fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str2.length; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      let minInRow = Infinity;
      for (let j = 1; j <= str1.length; j++) {
        const cost = str2[i - 1] === str1[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + cost,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
        minInRow = Math.min(minInRow, matrix[i][j]);
      }
      
      if (minInRow > maxDistance) {
        return maxDistance + 1;
      }
    }

    return matrix[str2.length][str1.length];
  }

  private async recordSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      logger.info('Search analytics:', { component: 'SimpleTool' }, {
        query: analytics.query,
        resultCount: analytics.resultCount,
        timestamp: analytics.timestamp.toISOString()
      });
    } catch (error) {
      logger.error('Error recording search analytics:', { component: 'SimpleTool' }, error);
    }
  }

  private getEmptySearchResponse(query: SearchQuery, startTime: number): SearchResponse {
    return {
      results: [],
      pagination: {
        page: query.pagination?.page ?? this.DEFAULT_PAGE,
        limit: query.pagination?.limit ?? this.DEFAULT_LIMIT,
        total: 0,
        pages: 0
      },
      facets: this.getEmptyFacets(),
      suggestions: [
        'Try searching for a topic like "healthcare" or "climate change"',
        'Use specific keywords to narrow your search'
      ],
      metadata: {
        searchTime: Date.now() - startTime,
        source: 'database',
        queryType: 'empty'
      }
    };
  }

  private getFallbackSearchResponse(query: SearchQuery, startTime: number): SearchResponse {
    console.warn('Using fallback search - database unavailable');
    
    return {
      results: [],
      pagination: {
        page: query.pagination?.page ?? this.DEFAULT_PAGE,
        limit: query.pagination?.limit ?? this.DEFAULT_LIMIT,
        total: 0,
        pages: 0
      },
      facets: this.getEmptyFacets(),
      suggestions: [
        'Search service is temporarily unavailable',
        'Please try again in a moment'
      ],
      metadata: {
        searchTime: Date.now() - startTime,
        source: 'fallback',
        queryType: 'simple'
      }
    };
  }

  private getFallbackSuggestions(partialQuery: string, limit: number): SearchSuggestion[] {
    const fallbackTerms = [
      'healthcare',
      'climate change',
      'digital privacy',
      'education',
      'infrastructure',
      'tax reform',
      'renewable energy',
      'social security'
    ];

    const queryLower = partialQuery.toLowerCase();
    
    return fallbackTerms
      .filter(term => term.toLowerCase().includes(queryLower))
      .slice(0, limit)
      .map(term => ({
        term,
        frequency: 10,
        type: 'popular' as const
      }));
  }

  private async clearSearchCaches(): Promise<void> {
    try {
      await Promise.all([
        cacheService.deletePattern('search:*'),
        cacheService.deletePattern('suggestions:*'),
        cacheService.delete(SEARCH_CACHE_KEYS.POPULAR_SEARCHES)
      ]);
      
      this.queryCache.clear();
      
      logger.info('Search caches cleared successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Error clearing search caches:', { component: 'SimpleTool' }, error);
    }
  }

  async warmupSearchCache(commonQueries: string[] = []): Promise<void> {
    const defaultQueries = [
      'healthcare',
      'climate change',
      'education',
      'infrastructure',
      'tax reform'
    ];
    
    const queriesToWarmup = commonQueries.length > 0 ? commonQueries : defaultQueries;
    
    console.log(`Warming up search cache with ${queriesToWarmup.length} queries`);
    
    const concurrencyLimit = 3;
    for (let i = 0; i < queriesToWarmup.length; i += concurrencyLimit) {
      const batch = queriesToWarmup.slice(i, i + concurrencyLimit);
      await Promise.all(
        batch.map(query => 
          this.searchBills({ text: query }).catch((err: Error) => 
            console.error(`Failed to warmup query "${query}":`, err)
          )
        )
      );
    }
    
    logger.info('Search cache warmup completed', { component: 'SimpleTool' });
  }

  async getSearchMetrics(): Promise<{
    avgSearchTime: number;
    cacheHitRate: number;
    totalSearches: number;
    failedSearches: number;
  }> {
    // TODO: Implement proper metrics collection
    return {
      avgSearchTime: 0,
      cacheHitRate: 0,
      totalSearches: 0,
      failedSearches: 0
    };
  }
}

export const searchService = new SearchService();








