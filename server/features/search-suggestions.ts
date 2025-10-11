import { eq, desc, and, sql, count, ilike, or, inArray } from "drizzle-orm";
import { databaseService } from "../services/database-service";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../infrastructure/cache/cache-service";
import * as schema from "../../shared/schema";
import { logger } from '../../utils/logger';

// Search suggestion interfaces
export interface SearchSuggestion {
  term: string;
  type: 'bill_title' | 'category' | 'sponsor' | 'tag' | 'popular' | 'recent';
  frequency: number;
  metadata?: {
    billId?: number;
    sponsorId?: number;
    category?: string;
    description?: string;
  };
}

export interface AutocompleteFacets {
  categories: Array<{ name: string; count: number }>;
  sponsors: Array<{ name: string; id: number; count: number }>;
  tags: Array<{ name: string; count: number }>;
  statuses: Array<{ name: string; count: number }>;
}

export interface AutocompleteResult {
  suggestions: SearchSuggestion[];
  facets: AutocompleteFacets;
  popularSearches: string[];
}

export interface SearchContext {
  category?: string;
  status?: string;
  sponsorId?: number;
  recentSearches?: string[];
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  clickedResults?: number[];
}

// Configuration constants
const CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_HISTORY_SIZE: 10000,
  HISTORY_CLEANUP_THRESHOLD: 0.1,
  DEFAULT_SUGGESTION_LIMIT: 10,
  SIMILARITY_THRESHOLD: 0.3,
  MIN_TERM_LENGTH: 3,
  MIN_TERM_FREQUENCY: 1,
  
  // Distribution of suggestion types
  SUGGESTION_DISTRIBUTION: {
    BILL_TITLES: 0.5,
    CATEGORIES: 0.2,
    SPONSORS: 0.2,
    TAGS: 0.1
  }
} as const;

/**
 * Optimized Search Suggestions and Autocomplete Service
 * Features:
 * - Parallel query execution for better performance
 * - Full-text search support
 * - Intelligent caching strategies
 * - Input validation and sanitization
 * - Better error handling
 */
export class SearchSuggestionsService {
  private db = databaseService.getDatabase();
  private searchHistory: Map<string, number> = new Map();
  private popularTerms: Map<string, number> = new Map();

  /**
   * Get autocomplete suggestions with optimized parallel queries
   */
  async getAutocompleteSuggestions(
    partialQuery: string,
    limit: number = CONFIG.DEFAULT_SUGGESTION_LIMIT,
    includeMetadata: boolean = true
  ): Promise<AutocompleteResult> {
    // Validate and sanitize input
    const sanitizedQuery = this.sanitizeQuery(partialQuery);
    if (sanitizedQuery.length < CONFIG.MIN_QUERY_LENGTH) {
      return this.getEmptyAutocompleteResult();
    }

    const cacheKey = CACHE_KEYS.SEARCH_RESULTS(sanitizedQuery);
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await databaseService.withFallback(
      async () => {
        // Execute all queries in parallel for better performance
        const [suggestions, facets, popularSearches] = await Promise.all([
          this.generateSuggestions(sanitizedQuery, limit),
          this.generateAutocompleteFacets(sanitizedQuery),
          this.getPopularSearchTerms(5)
        ]);

        return { suggestions, facets, popularSearches };
      },
      this.getFallbackAutocompleteResult(sanitizedQuery),
      `getAutocompleteSuggestions(${sanitizedQuery})`
    );

    // Cache successful database results
    if (result.source === 'database') {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.SEARCH_RESULTS);
    }

    return result.data;
  }

  /**
   * Get contextual suggestions with optimized distribution
   */
  async getContextualSuggestions(
    query: string,
    context: SearchContext,
    limit: number = 8
  ): Promise<SearchSuggestion[]> {
    const sanitizedQuery = this.sanitizeQuery(query);
    
    const result = await databaseService.withFallback(
      async () => {
        // Calculate limits based on distribution
        const limits = {
          titles: Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.BILL_TITLES),
          categories: Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.CATEGORIES),
          sponsors: Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.SPONSORS),
          tags: Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.TAGS)
        };

        // Execute all suggestion queries in parallel
        const [titleSuggestions, categorySuggestions, sponsorSuggestions, tagSuggestions] = 
          await Promise.all([
            this.getBillTitleSuggestions(sanitizedQuery, context, limits.titles),
            this.getCategorySuggestions(sanitizedQuery, context, limits.categories),
            this.getSponsorSuggestions(sanitizedQuery, context, limits.sponsors),
            this.getTagSuggestions(sanitizedQuery, context, limits.tags)
          ]);

        // Combine and sort by relevance score
        const allSuggestions = [
          ...titleSuggestions,
          ...categorySuggestions,
          ...sponsorSuggestions,
          ...tagSuggestions
        ];

        return this.rankSuggestions(allSuggestions, sanitizedQuery, context)
          .slice(0, limit);
      },
      this.getFallbackSuggestions(sanitizedQuery, limit),
      `getContextualSuggestions(${sanitizedQuery})`
    );

    return result.data;
  }

  /**
   * Get popular search terms with better caching
   */
  async getPopularSearchTerms(limit: number = 20): Promise<string[]> {
    const cacheKey = CACHE_KEYS.ANALYTICS();
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult.slice(0, limit);
    }

    // Try to get from in-memory popular terms
    if (this.popularTerms.size > 0) {
      const terms = Array.from(this.popularTerms.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([term]) => term);
      
      if (terms.length > 0) {
        await cacheService.set(cacheKey, terms, CACHE_TTL.LONG);
        return terms;
      }
    }

    // Fallback to static popular terms
    const popularTerms = this.getStaticPopularTerms().slice(0, limit);
    await cacheService.set(cacheKey, popularTerms, CACHE_TTL.LONG);
    return popularTerms;
  }

  /**
   * Get trending search terms with proper analysis
   */
  async getTrendingSearchTerms(limit: number = 10): Promise<SearchSuggestion[]> {
    // Analyze search history for trending patterns
    if (this.searchHistory.size > 10) {
      const recentSearches = Array.from(this.searchHistory.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([term, frequency]) => ({
          term,
          type: 'recent' as const,
          frequency
        }));

      if (recentSearches.length > 0) {
        return recentSearches;
      }
    }

    // Fallback to static trending terms
    return this.getStaticTrendingTerms(limit);
  }

  /**
   * Record search analytics with efficient storage
   */
  async recordSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      const sanitizedQuery = this.sanitizeQuery(analytics.query);
      
      // Update search history efficiently
      this.updateSearchHistory(sanitizedQuery);
      this.updatePopularTerms(sanitizedQuery);

      // Perform cleanup if needed
      this.cleanupHistoryIfNeeded();

      // Log for monitoring (can be replaced with proper analytics service)
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Search analytics:', { component: 'SimpleTool' }, {
          query: sanitizedQuery,
          resultCount: analytics.resultCount,
          timestamp: analytics.timestamp
        });
      }
    } catch (error) {
      logger.error('Error recording search analytics:', { component: 'SimpleTool' }, error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Get spell-corrected suggestions using full-text search
   */
  async getSpellCorrectedSuggestions(query: string): Promise<string[]> {
    const sanitizedQuery = this.sanitizeQuery(query);
    
    const result = await databaseService.withFallback(
      async () => {
        // Use PostgreSQL's similarity and full-text search for better results
        const corrections = await this.db.execute(sql`
          SELECT DISTINCT 
            title,
            similarity(title, ${sanitizedQuery}) as sim,
            ts_rank(search_vector, plainto_tsquery('english', ${sanitizedQuery})) as rank
          FROM bills 
          WHERE 
            similarity(title, ${sanitizedQuery}) > ${CONFIG.SIMILARITY_THRESHOLD}
            OR search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
          ORDER BY 
            GREATEST(sim, rank) DESC
          LIMIT 5
        `);

        return corrections.map((row: any) => row.title as string);
      },
      [],
      `getSpellCorrectedSuggestions(${sanitizedQuery})`
    );

    return result.data;
  }

  /**
   * Get related search terms using optimized full-text search
   */
  async getRelatedSearchTerms(query: string, limit: number = 8): Promise<string[]> {
    const sanitizedQuery = this.sanitizeQuery(query);
    
    const result = await databaseService.withFallback(
      async () => {
        const relatedTerms = await this.db.execute(sql`
          WITH term_frequencies AS (
            SELECT 
              unnest(tsvector_to_array(search_vector)) as term,
              COUNT(*) as frequency
            FROM bills 
            WHERE search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
            GROUP BY term
          )
          SELECT term, frequency
          FROM term_frequencies
          WHERE 
            LENGTH(term) > ${CONFIG.MIN_TERM_LENGTH}
            AND frequency > ${CONFIG.MIN_TERM_FREQUENCY}
            AND term NOT IN (SELECT unnest(string_to_array(${sanitizedQuery}, ' ')))
          ORDER BY frequency DESC
          LIMIT ${limit}
        `);

        return relatedTerms.map((row: any) => row.term as string);
      },
      this.getFallbackRelatedTerms(sanitizedQuery, limit),
      `getRelatedSearchTerms(${sanitizedQuery})`
    );

    return result.data;
  }

  // Private helper methods

  /**
   * Sanitize and validate search query
   */
  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  /**
   * Generate suggestions with optimized parallel queries
   */
  private async generateSuggestions(
    partialQuery: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    // Calculate limits for each suggestion type
    const titleLimit = Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.BILL_TITLES);
    const categoryLimit = Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.CATEGORIES);
    const sponsorLimit = Math.ceil(limit * CONFIG.SUGGESTION_DISTRIBUTION.SPONSORS);

    // Execute all queries in parallel
    const [titleSuggestions, categorySuggestions, sponsorSuggestions] = await Promise.all([
      this.fetchBillTitleSuggestions(partialQuery, titleLimit),
      this.fetchCategorySuggestions(partialQuery, categoryLimit),
      this.fetchSponsorSuggestions(partialQuery, sponsorLimit)
    ]);

    // Combine and deduplicate
    const allSuggestions = [
      ...titleSuggestions,
      ...categorySuggestions,
      ...sponsorSuggestions
    ];

    // Sort by frequency and relevance, then limit
    return allSuggestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Fetch bill title suggestions with optimized query
   */
  private async fetchBillTitleSuggestions(
    query: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const results = await this.db
      .select({
        title: schema.bills.title,
        id: schema.bills.id,
        category: schema.bills.category,
        viewCount: schema.bills.viewCount
      })
      .from(schema.bills)
      .where(
        or(
          ilike(schema.bills.title, `${query}%`), // Prefix match (faster)
          ilike(schema.bills.title, `%${query}%`) // Contains match
        )
      )
      .orderBy(desc(schema.bills.viewCount))
      .limit(limit);

    return results.map((bill: { title: string; id: number; category: string | null; viewCount: number | null }) => ({
      term: bill.title,
      type: 'bill_title' as const,
      frequency: bill.viewCount || 0,
      metadata: {
        billId: bill.id,
        category: bill.category || undefined,
        description: `Bill: ${bill.title.substring(0, 100)}`
      }
    }));
  }

  /**
   * Fetch category suggestions with aggregation
   */
  private async fetchCategorySuggestions(
    query: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const results = await this.db
      .select({
        category: schema.bills.category,
        count: count()
      })
      .from(schema.bills)
      .where(
        and(
          sql`${schema.bills.category} IS NOT NULL`,
          or(
            ilike(schema.bills.category, `${query}%`),
            ilike(schema.bills.category, `%${query}%`)
          )
        )
      )
      .groupBy(schema.bills.category)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((cat: { category: string | null; count: number }) => ({
      term: cat.category || '',
      type: 'category' as const,
      frequency: cat.count,
      metadata: {
        category: cat.category || undefined,
        description: `Category: ${cat.category}`
      }
    }));
  }

  /**
   * Fetch sponsor suggestions
   */
  private async fetchSponsorSuggestions(
    query: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const results = await this.db
      .select({
        name: schema.sponsors.name,
        id: schema.sponsors.id,
        role: schema.sponsors.role,
        party: schema.sponsors.party,
        sponsorshipCount: count(schema.billSponsorships.id)
      })
      .from(schema.sponsors)
      .leftJoin(schema.billSponsorships, eq(schema.sponsors.id, schema.billSponsorships.sponsorId))
      .where(
        or(
          ilike(schema.sponsors.name, `${query}%`),
          ilike(schema.sponsors.name, `%${query}%`)
        )
      )
      .groupBy(schema.sponsors.id, schema.sponsors.name, schema.sponsors.role, schema.sponsors.party)
      .orderBy(desc(count(schema.billSponsorships.id)))
      .limit(limit);

    return results.map((sponsor: { name: string; id: number; role: string | null; party: string | null; sponsorshipCount: number }) => ({
      term: sponsor.name,
      type: 'sponsor' as const,
      frequency: sponsor.sponsorshipCount,
      metadata: {
        sponsorId: sponsor.id,
        description: `${sponsor.role}: ${sponsor.name}${sponsor.party ? ` (${sponsor.party})` : ''}`
      }
    }));
  }

  /**
   * Generate facets with parallel execution
   */
  private async generateAutocompleteFacets(partialQuery: string): Promise<AutocompleteFacets> {
    const [categories, sponsors, statuses] = await Promise.all([
      this.fetchCategoryFacets(),
      this.fetchSponsorFacets(),
      this.fetchStatusFacets()
    ]);

    return {
      categories,
      sponsors,
      tags: [], // TODO: Implement when tags are normalized
      statuses
    };
  }

  private async fetchCategoryFacets() {
    const results = await this.db
      .select({
        name: schema.bills.category,
        count: count()
      })
      .from(schema.bills)
      .where(sql`${schema.bills.category} IS NOT NULL`)
      .groupBy(schema.bills.category)
      .orderBy(desc(count()))
      .limit(10);

    return results.map((c: { name: string | null; count: number }) => ({ name: c.name || '', count: c.count }));
  }

  private async fetchSponsorFacets() {
    const results = await this.db
      .select({
        name: schema.sponsors.name,
        id: schema.sponsors.id,
        count: count(schema.billSponsorships.id)
      })
      .from(schema.sponsors)
      .leftJoin(schema.billSponsorships, eq(schema.sponsors.id, schema.billSponsorships.sponsorId))
      .groupBy(schema.sponsors.id, schema.sponsors.name)
      .orderBy(desc(count(schema.billSponsorships.id)))
      .limit(10);

    return results.map((s: { name: string; id: number; count: number }) => ({ name: s.name, id: s.id, count: s.count }));
  }

  private async fetchStatusFacets() {
    const results = await this.db
      .select({
        name: schema.bills.status,
        count: count()
      })
      .from(schema.bills)
      .groupBy(schema.bills.status)
      .orderBy(desc(count()))
      .limit(10);

    return results.map((s: { name: string; count: number }) => ({ name: s.name, count: s.count }));
  }

  /**
   * Rank suggestions based on relevance and context
   */
  private rankSuggestions(
    suggestions: SearchSuggestion[],
    query: string,
    context: SearchContext
  ): SearchSuggestion[] {
    return suggestions.map((suggestion: SearchSuggestion) => {
      let score = suggestion.frequency;

      // Boost exact prefix matches
      if (suggestion.term.toLowerCase().startsWith(query)) {
        score *= 2;
      }

      // Boost context matches
      if (context.category && suggestion.metadata?.category === context.category) {
        score *= 1.5;
      }

      if (context.sponsorId && suggestion.metadata?.sponsorId === context.sponsorId) {
        score *= 1.5;
      }

      // Boost recent searches
      if (context.recentSearches?.includes(suggestion.term)) {
        score *= 1.3;
      }

      return { ...suggestion, frequency: score };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Update search history efficiently
   */
  private updateSearchHistory(query: string): void {
    const currentCount = this.searchHistory.get(query) || 0;
    this.searchHistory.set(query, currentCount + 1);
  }

  /**
   * Update popular terms
   */
  private updatePopularTerms(query: string): void {
    const currentCount = this.popularTerms.get(query) || 0;
    this.popularTerms.set(query, currentCount + 1);
  }

  /**
   * Clean up history when it exceeds threshold
   */
  private cleanupHistoryIfNeeded(): void {
    if (this.searchHistory.size > CONFIG.MAX_HISTORY_SIZE) {
      const entriesToRemove = Math.floor(
        CONFIG.MAX_HISTORY_SIZE * CONFIG.HISTORY_CLEANUP_THRESHOLD
      );

      const sortedEntries = Array.from(this.searchHistory.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, entriesToRemove);

      sortedEntries.forEach(([key]) => this.searchHistory.delete(key));
    }
  }

  /**
   * Get contextual bill title suggestions with filters
   */
  private async getBillTitleSuggestions(
    query: string,
    context: SearchContext,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const conditions = [ilike(schema.bills.title, `%${query}%`)];

    if (context.category) {
      conditions.push(eq(schema.bills.category, context.category));
    }

    if (context.status) {
      conditions.push(eq(schema.bills.status, context.status));
    }

    const results = await this.db
      .select({
        title: schema.bills.title,
        id: schema.bills.id,
        viewCount: schema.bills.viewCount
      })
      .from(schema.bills)
      .where(and(...conditions))
      .orderBy(desc(schema.bills.viewCount))
      .limit(limit);

    return results.map((bill: { title: string; id: number; category: string | null; viewCount: number | null }) => ({
      term: bill.title,
      type: 'bill_title' as const,
      frequency: bill.viewCount || 0,
      metadata: { billId: bill.id }
    }));
  }

  private async getCategorySuggestions(
    query: string,
    context: SearchContext,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const results = await this.db
      .select({
        category: schema.bills.category,
        count: count()
      })
      .from(schema.bills)
      .where(
        and(
          sql`${schema.bills.category} IS NOT NULL`,
          ilike(schema.bills.category, `%${query}%`)
        )
      )
      .groupBy(schema.bills.category)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((cat: { category: string | null; count: number }) => ({
      term: cat.category || '',
      type: 'category' as const,
      frequency: cat.count,
      metadata: { category: cat.category || undefined }
    }));
  }

  private async getSponsorSuggestions(
    query: string,
    context: SearchContext,
    limit: number
  ): Promise<SearchSuggestion[]> {
    const results = await this.db
      .select({
        name: schema.sponsors.name,
        id: schema.sponsors.id
      })
      .from(schema.sponsors)
      .where(ilike(schema.sponsors.name, `%${query}%`))
      .limit(limit);

    return results.map((sponsor: { name: string; id: number; role: string | null; party: string | null; sponsorshipCount: number }) => ({
      term: sponsor.name,
      type: 'sponsor' as const,
      frequency: 10,
      metadata: { sponsorId: sponsor.id }
    }));
  }

  private async getTagSuggestions(
    query: string,
    context: SearchContext,
    limit: number
  ): Promise<SearchSuggestion[]> {
    // TODO: Implement when tags are properly normalized in schema
    return [];
  }

  // Fallback and utility methods

  private getEmptyAutocompleteResult(): AutocompleteResult {
    return {
      suggestions: [],
      facets: {
        categories: [],
        sponsors: [],
        tags: [],
        statuses: []
      },
      popularSearches: []
    };
  }

  private getFallbackAutocompleteResult(partialQuery: string): AutocompleteResult {
    const fallbackSuggestions = this.getStaticPopularTerms()
      .filter(term => term.toLowerCase().includes(partialQuery))
      .slice(0, 5)
      .map((term: string) => ({
        term,
        type: 'popular' as const,
        frequency: 10
      }));

    return {
      suggestions: fallbackSuggestions,
      facets: {
        categories: [
          { name: 'Healthcare', count: 25 },
          { name: 'Environment', count: 18 },
          { name: 'Technology', count: 15 }
        ],
        sponsors: [],
        tags: [],
        statuses: [
          { name: 'Committee Review', count: 45 },
          { name: 'First Reading', count: 32 }
        ]
      },
      popularSearches: this.getStaticPopularTerms().slice(0, 3)
    };
  }

  private getFallbackSuggestions(query: string, limit: number): SearchSuggestion[] {
    return this.getStaticPopularTerms()
      .filter(term => term.toLowerCase().includes(query))
      .slice(0, limit)
      .map((term: string) => ({
        term,
        type: 'popular' as const,
        frequency: 10
      }));
  }

  private getFallbackRelatedTerms(query: string, limit: number): string[] {
    const relatedTermsMap: Record<string, string[]> = {
      healthcare: ['medical', 'insurance', 'medicare', 'medicaid', 'hospital', 'health'],
      climate: ['environment', 'carbon', 'emissions', 'renewable', 'green', 'energy'],
      education: ['school', 'student', 'teacher', 'university', 'funding', 'learning'],
      technology: ['digital', 'internet', 'privacy', 'data', 'cyber', 'innovation'],
      infrastructure: ['roads', 'bridges', 'transport', 'construction', 'public works']
    };

    const queryLower = query.toLowerCase();
    for (const [key, terms] of Object.entries(relatedTermsMap)) {
      if (queryLower.includes(key)) {
        return terms.slice(0, limit);
      }
    }

    return [];
  }

  private getStaticPopularTerms(): string[] {
    return [
      'healthcare reform',
      'climate change',
      'digital privacy',
      'education funding',
      'infrastructure bill',
      'tax policy',
      'renewable energy',
      'social security',
      'immigration reform',
      'cybersecurity',
      'affordable housing',
      'minimum wage',
      'student loans',
      'medicare',
      'veterans affairs',
      'small business',
      'trade policy',
      'environmental protection',
      'criminal justice',
      'transportation'
    ];
  }

  private getStaticTrendingTerms(limit: number): SearchSuggestion[] {
    return [
      { term: 'artificial intelligence regulation', type: 'popular' as const, frequency: 45 },
      { term: 'electric vehicle incentives', type: 'popular' as const, frequency: 38 },
      { term: 'remote work legislation', type: 'popular' as const, frequency: 32 },
      { term: 'data protection act', type: 'popular' as const, frequency: 28 },
      { term: 'green energy transition', type: 'popular' as const, frequency: 25 }
    ].slice(0, limit);
  }
}

// Export singleton instance
export const searchSuggestionsService = new SearchSuggestionsService();








