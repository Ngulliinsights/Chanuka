import { readDatabase } from '@shared/database';
import { databaseService } from '@/infrastructure/database/database-service.js';
import { cacheService } from '@/infrastructure/cache/cache-service.js';
import { logger  } from '@shared/core';
import * as schema from "@shared/schema";
import { eq, desc, and, sql, count, like, or, gte } from "drizzle-orm";

import {
  SearchSuggestion,
  AutocompleteFacets,
  AutocompleteResult,
  SearchContext,
  SearchAnalytics
} from "./types/search.types";
// Query builder service removed - using direct Drizzle queries
import { parallelQueryExecutor, QueryTask } from "@server/utils/parallel-query-executor";
import { suggestionRankingService, type RankingContext } from "./suggestion-ranking.service";

/**
 * Internal type for tracking search history entries
 * This matches the structure needed for SearchContext
 */
interface HistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
  frequency: number;
}

/**
 * Internal type for ranking context that includes user behavior data
 * This wraps SearchContext with additional metadata for the ranking algorithm
 */
interface RankingContextInternal {
  searchContext: SearchContext;
  query: string;
  timestamp: number;
}

/**
 * Helper to generate cache keys with consistent formatting
 * This creates a centralized way to generate cache keys for search results
 */
const generateCacheKey = (query: string): string => {
  return `search:results:${query.toLowerCase().trim()}`;
};

/**
 * Configuration constants - centralized for easy tuning and maintenance
 * All magic numbers are defined here to make the service more maintainable
 */
const CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEFAULT_SUGGESTION_LIMIT: 10,
  SIMILARITY_THRESHOLD: 0.3,
  MIN_TERM_LENGTH: 3,
  MIN_TERM_FREQUENCY: 1,

  // Cache settings for performance optimization
  CACHE_TTL_SECONDS: 300, // 5 minutes for search results

  // Memory management thresholds to prevent unbounded growth
  MAX_HISTORY_ENTRIES: 1000,
  MAX_POPULAR_TERMS: 500,
  HISTORY_RETENTION_DAYS: 30,

  // Distribution of suggestion types (must sum to 1.0)
  // These weights determine how many suggestions come from each source
  SUGGESTION_DISTRIBUTION: {
    BILL_TITLES: 0.4,
    CATEGORIES: 0.15,
    SPONSORS: 0.15,
    TAGS: 0.1,
    AI_CORRECTIONS: 0.1,
    RELATED_TERMS: 0.1
  },

  // Facet limits to prevent overwhelming the user interface
  MAX_FACET_VALUES: 10,

  // Scoring weights for relevance calculation
  SCORING: {
    EXACT_MATCH: 1.0,
    STARTS_WITH: 0.9,
    CONTAINS: 0.7,
    LEVENSHTEIN_THRESHOLD: 0.5,
    MIN_SCORE: 0.1,
    AI_CORRECTION_BOOST: 0.8,
    CONTEXTUAL_BOOST: 0.6
  },

  // AI-powered features configuration
  AI: {
    ENABLE_CORRECTIONS: true,
    ENABLE_EXPANSION: true,
    ENABLE_CONTEXTUAL: true,
    MAX_CORRECTIONS: 3,
    MAX_EXPANSIONS: 5,
    CONTEXT_WINDOW_DAYS: 7
  }
} as const;

/**
 * Main suggestion engine that orchestrates all search suggestion functionality
 * This service provides autocomplete, faceted search, and search analytics
 * with emphasis on security, performance, and maintainability.
 *
 * Key features:
 * - Parallel query execution for optimal performance
 * - In-memory caching with LRU eviction
 * - SQL injection prevention through parameterized queries
 * - Graceful degradation when queries fail
 */
export class SuggestionEngineService {
  private get db() {
    return readDatabase;
  }

  // In-memory caches with LRU eviction support
  // These maintain user search patterns and popular terms
  private searchHistory: Map<string, HistoryEntry> = new Map();
  private popularTerms: Map<string, { count: number; lastUpdated: number }> = new Map();
  private lastCleanup: number = Date.now();

  /**
   * Get autocomplete suggestions with optimized parallel queries
   * This is the main entry point for autocomplete functionality.
   * It coordinates multiple data sources and combines them intelligently.
   *
   * @param partialQuery - The user's partial search query
   * @param limit - Maximum number of suggestions to return
   * @param includeMetadata - Whether to include additional metadata like result counts
   * @returns Promise with suggestions, facets, and optional metadata
   */
  async getAutocompleteSuggestions(
    partialQuery: string,
    limit: number = CONFIG.DEFAULT_SUGGESTION_LIMIT,
    includeMetadata: boolean = true
  ): Promise<AutocompleteResult> {
    // Sanitize input to prevent SQL injection and validate minimum query length
    const sanitizedQuery = this.sanitizeQuery(partialQuery);
    if (sanitizedQuery.length < CONFIG.MIN_QUERY_LENGTH) {
      return this.getEmptyAutocompleteResult();
    }

    // Check cache first to avoid unnecessary database queries
    // Using our local cache key generator instead of the imported one
    const cacheKey = generateCacheKey(sanitizedQuery);
    const cachedResult = await cacheService.get<AutocompleteResult>(cacheKey);
    if (cachedResult) {
      logger.debug('Cache hit for search query', { query: sanitizedQuery });
      return cachedResult;
    }

    // Execute queries with fallback handling for resilience
    // Build a concrete fallback value (with correct typing) to pass to the
    // database service. The database service's withFallback returns a
    // DatabaseResult<T>, so we extract `.data` below when returning.
    const fallbackValue: AutocompleteResult = this.getEmptyAutocompleteResult();

    const dbResult = await databaseService.withFallback(
      async () => {
        // Define parallel query tasks for concurrent execution
        // This allows us to fetch suggestions and facets simultaneously
        const tasks: QueryTask[] = [
          {
            name: 'suggestions',
            query: () => this.generateSuggestions(sanitizedQuery, limit),
            fallback: []
          },
          {
            name: 'facets',
            query: () => this.generateAutocompleteFacets(sanitizedQuery),
            fallback: this.getEmptyFacets()
          }
        ];

        const results = await parallelQueryExecutor.executeParallel(tasks);

        // Log any failed queries for monitoring and debugging
        if (results.suggestions === undefined || results.facets === undefined) {
          logger.warn('Some parallel queries failed', {
            query: sanitizedQuery,
            hasSuggestions: results.suggestions !== undefined,
            hasFacets: results.facets !== undefined
          });
        }

        // The parallel executor returns QueryResult objects, but we need the actual data
        // We use type assertions through 'unknown' as a safe intermediate step
        const suggestionsList = (results.suggestions as unknown as SearchSuggestion[]) || [];
        const facetsData = (results.facets as unknown as AutocompleteFacets) || this.getEmptyFacets();

        // Construct the properly typed result
        const autocompleteResult: AutocompleteResult = {
          suggestions: suggestionsList,
          facets: facetsData,
          query: sanitizedQuery,
          totalSuggestions: suggestionsList.length,
          metadata: includeMetadata ? await this.getSearchMetadata(sanitizedQuery) : undefined
        };

        // Cache the result with TTL for future requests
        await cacheService.set(cacheKey, autocompleteResult, CONFIG.CACHE_TTL_SECONDS);
        return autocompleteResult;
      },
      // Pass a concrete fallback value (not a function) to match the
      // DatabaseService.withFallback signature
      fallbackValue,
      'autocomplete-suggestions'
    );

    // Extract and return the actual autocomplete data from the DatabaseResult
    return dbResult.data;
  }

  /**
   * Generate search suggestions from multiple sources in parallel
   * This orchestrates fetching suggestions from bills, categories, sponsors, tags, and AI-powered sources
   * Uses Promise.allSettled to ensure partial results even if some queries fail
   */
  private async generateSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const distribution = CONFIG.SUGGESTION_DISTRIBUTION;

    // Calculate proportional limits for each suggestion type
    // This ensures a good mix of different suggestion types
    const billTitleLimit = Math.ceil(limit * distribution.BILL_TITLES);
    const categoryLimit = Math.ceil(limit * distribution.CATEGORIES);
    const sponsorLimit = Math.ceil(limit * distribution.SPONSORS);
    const tagLimit = Math.ceil(limit * distribution.TAGS);
    const aiCorrectionLimit = Math.ceil(limit * distribution.AI_CORRECTIONS);
    const relatedTermsLimit = Math.ceil(limit * distribution.RELATED_TERMS);

    // Execute all suggestion queries concurrently for better performance
    // Promise.allSettled ensures we get results from successful queries even if others fail
    const results = await Promise.allSettled([
      this.getBillTitleSuggestions(query, billTitleLimit),
      this.getCategorySuggestions(query, categoryLimit),
      this.getSponsorSuggestions(query, sponsorLimit),
      this.getTagSuggestions(query, tagLimit),
      this.getAICorrections(query, aiCorrectionLimit),
      this.getRelatedTerms(query, relatedTermsLimit)
    ]);

    // Collect successful results and log failures for monitoring
    const [billSuggestions, categorySuggestions, sponsorSuggestions, tagSuggestions, aiCorrections, relatedTerms] = results;

    if (billSuggestions.status === 'fulfilled') {
      suggestions.push(...billSuggestions.value);
    } else {
      logger.error('Failed to fetch bill suggestions', {
        error: billSuggestions.reason,
        query
      });
    }

    if (categorySuggestions.status === 'fulfilled') {
      suggestions.push(...categorySuggestions.value);
    } else {
      logger.error('Failed to fetch category suggestions', {
        error: categorySuggestions.reason,
        query
      });
    }

    if (sponsorSuggestions.status === 'fulfilled') {
      suggestions.push(...sponsorSuggestions.value);
    } else {
      logger.error('Failed to fetch sponsor suggestions', {
        error: sponsorSuggestions.reason,
        query
      });
    }

    if (tagSuggestions.status === 'fulfilled') {
      suggestions.push(...tagSuggestions.value);
    } else {
      logger.error('Failed to fetch tag suggestions', {
        error: tagSuggestions.reason,
        query
      });
    }

    if (aiCorrections.status === 'fulfilled') {
      suggestions.push(...aiCorrections.value);
    } else {
      logger.error('Failed to fetch AI corrections', {
        error: aiCorrections.reason,
        query
      });
    }

    if (relatedTerms.status === 'fulfilled') {
      suggestions.push(...relatedTerms.value);
    } else {
      logger.error('Failed to fetch related terms', {
        error: relatedTerms.reason,
        query
      });
    }

    // Create ranking context with user behavior data for personalization
    const context: RankingContextInternal = {
      searchContext: this.getSearchContext(),
      query,
      timestamp: Date.now()
    };

    // Build a RankingContext expected by the ranking service. We convert
    // the internal searchContext's popularTerms array into a Map to match
    // the RankingContext shape used by the ranking algorithms.
    const popularTermsMap = new Map<string, number>(
      (context.searchContext.popularTerms || []).map((pt: any) => [pt.term, pt.frequency])
    );

    const rankingContext: RankingContext = {
      query: context.query,
      searchContext: context.searchContext,
      userHistory: (context.searchContext.userHistory || []).map((h: any) => h.query),
      popularTerms: popularTermsMap
    };

    // Rank suggestions using the ranking service with constructed context
    const rankedSuggestions = await suggestionRankingService.rankSuggestions(
      suggestions,
      rankingContext
    );

    return rankedSuggestions.slice(0, limit);
  }

  /**
   * Get bill title suggestions using parameterized queries
   * Returns bills whose titles match the search query, ordered by recency
   */
  private async getBillTitleSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const searchPattern = `%${query}%`;

    const results = await this.db
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

    // Map database results to SearchSuggestion format with proper metadata
    // Each field in metadata provides context that helps users understand the suggestion
    return results.map(bill => ({
      term: bill.title,
      frequency: 1, // Individual bills have frequency of 1
      score: this.calculateRelevanceScore(bill.title, query),
      type: 'bill_title',
      id: `bill-${bill.id}`,
      metadata: { bill_id: bill.id,
        sponsor_id: bill.sponsor_id,
        category: bill.category,
        description: bill.status // Using status as a proxy for quick description
       }
    }));
  }

  /**
   * Get category suggestions with aggregation
   * Returns categories that match the query with their bill counts
   */
  private async getCategorySuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const searchPattern = `%${query}%`;

    const results = await this.db
      .select({
        category: schema.bills.category,
        count: count()
      })
      .from(schema.bills)
      .where(like(schema.bills.category, searchPattern))
      .groupBy(schema.bills.category)
      .orderBy(desc(count()))
      .limit(limit);

    // Map categories to SearchSuggestion format
    // The frequency here represents how many bills are in this category
    return results.map(result => ({
      term: result.category,
      frequency: result.count,
      score: this.calculateRelevanceScore(result.category, query),
      type: 'category',
      id: `category-${result.category}`,
      metadata: {
        category: result.category,
        description: `${result.count} bills in this category`
      }
    }));
  }

  /**
   * Get sponsor suggestions with aggregation
   * Returns sponsors that match the query with their bill counts
   */
  private async getSponsorSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const searchPattern = `%${query}%`;

    const results = await this.db
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

    // Map sponsors to SearchSuggestion format with proper metadata
    return results.map(result => ({
      term: result.sponsor,
      frequency: result.count,
      score: this.calculateRelevanceScore(result.sponsor, query),
      type: 'sponsor',
      id: `sponsor-${result.sponsor_id}`,
      metadata: {
        sponsor_id: result.sponsor_id,
        description: `${result.count} bills sponsored`
      }
    }));
  }

  /**
   * Get tag suggestions with proper array handling
   * PostgreSQL stores tags as comma-separated strings, so we need to unnest them
   */
  private async getTagSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const searchPattern = `%${query}%`;

    try {
      const results = await this.db
        .select({
          tag: sql<string>`unnest(string_to_array(${schema.bills.tags}, ','))`.as('tag'),
          count: count()
        })
        .from(schema.bills)
        .where(like(schema.bills.tags, searchPattern))
        .groupBy(sql`unnest(string_to_array(${schema.bills.tags}, ','))`)
        .orderBy(desc(count()))
        .limit(limit);

      // Map tags to SearchSuggestion format
      return results.map(result => ({
        term: result.tag.trim(),
        frequency: result.count,
        score: this.calculateRelevanceScore(result.tag, query),
        type: 'tag',
        id: `tag-${result.tag.trim()}`,
        metadata: {
          description: `Used in ${result.count} bills`
        }
      }));
    } catch (error) {
      logger.error('Tag suggestion query failed - check schema structure', {
        error,
        query
      });
      return [];
    }
  }

  /**
   * Generate autocomplete facets with consolidated query for performance
   * Facets allow users to filter their search results by various dimensions
   */
  private async generateAutocompleteFacets(query: string): Promise<AutocompleteFacets> {
    const searchPattern = `%${query}%`;

    try {
      // Fetch all relevant data in a single query for efficiency
      const facetData = await this.db
        .select({
          category: schema.bills.category,
          sponsor: schema.bills.sponsor,
          sponsor_id: schema.bills.sponsor_id,
          status: schema.bills.status
        })
        .from(schema.bills)
        .where(
          or(
            like(schema.bills.title, searchPattern),
            like(schema.bills.description, searchPattern)
          )
        );

      // Aggregate results by facet type using Maps for efficient counting
      const categoryMap = new Map<string, number>();
      const sponsorMap = new Map<string, { id: number; count: number }>();
      const statusMap = new Map<string, number>();

      for (const row of facetData) {
        categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + 1);

        const sponsorData = sponsorMap.get(row.sponsor) || { id: row.sponsor_id, count: 0 };
        sponsorData.count += 1;
        sponsorMap.set(row.sponsor, sponsorData);

        statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1);
      }

      // Convert maps to facet structures with all required fields
      const categories = Array.from(categoryMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, CONFIG.MAX_FACET_VALUES)
        .map(([name, count]) => ({
          name,
          count,
          value: name,
          label: name
        }));

      const sponsors = Array.from(sponsorMap.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, CONFIG.MAX_FACET_VALUES)
        .map(([name, data]) => ({
          name,
          id: data.id,
          count: data.count,
          value: name,
          label: name
        }));

      const statuses = Array.from(statusMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({
          name,
          count,
          value: name,
          label: name
        }));

      // Fetch tag facets separately due to array processing requirements
      const tags = await this.getTagFacets(searchPattern);

      return {
        categories,
        sponsors,
        tags,
        statuses,
        dateRanges: await this.getDateRangeFacets(searchPattern)
      };
    } catch (error) {
      logger.error('Failed to generate facets', { error, query });
      return this.getEmptyFacets();
    }
  }

  /**
   * Get tag facets with proper structure
   * Tags require special handling because they're stored as comma-separated strings
   */
  private async getTagFacets(searchPattern: string) {
    try {
      const results = await this.db
        .select({
          tag: sql<string>`unnest(string_to_array(${schema.bills.tags}, ','))`.as('tag'),
          count: count()
        })
        .from(schema.bills)
        .where(like(schema.bills.tags, searchPattern))
        .groupBy(sql`unnest(string_to_array(${schema.bills.tags}, ','))`)
        .orderBy(desc(count()))
        .limit(CONFIG.MAX_FACET_VALUES);

      return results.map(result => ({
        name: result.tag.trim(),
        count: result.count,
        value: result.tag.trim(),
        label: result.tag.trim()
      }));
    } catch (error) {
      logger.error('Failed to get tag facets', { error });
      return [];
    }
  }

  /**
   * Get AI-powered query corrections for typos and misspellings
   * Uses fuzzy matching and common typo patterns
   */
  private async getAICorrections(query: string, limit: number): Promise<SearchSuggestion[]> {
    if (!CONFIG.AI.ENABLE_CORRECTIONS) return [];

    const corrections: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Common typo corrections (could be enhanced with ML model)
    const commonCorrections: Record<string, string[]> = {
      'healtcare': ['healthcare'],
      'heathcare': ['healthcare'],
      'helthcare': ['healthcare'],
      'eduction': ['education'],
      'enviornment': ['environment'],
      'climat': ['climate'],
      'chang': ['change'],
      'taxs': ['taxes'],
      'polciy': ['policy'],
      'goverment': ['government'],
      'parliment': ['parliament'],
      'legistation': ['legislation'],
      'amendmant': ['amendment'],
      'constituion': ['constitution'],
      'electon': ['election'],
      'votng': ['voting']
    };

    // Check for exact matches in common corrections
    for (const [typo, correctionsList] of Object.entries(commonCorrections)) {
      if (lowerQuery.includes(typo)) {
        for (const correction of correctionsList.slice(0, CONFIG.AI.MAX_CORRECTIONS)) {
          corrections.push({
            term: correction,
            frequency: 1,
            score: CONFIG.SCORING.AI_CORRECTION_BOOST,
            type: 'ai_correction',
            id: `correction-${correction}`,
            metadata: {
              originalQuery: query,
              correctionType: 'typo',
              confidence: 0.8
            }
          });
        }
      }
    }

    // Phonetic matching for names (simplified Soundex-like approach)
    const phoneticMatches = await this.getPhoneticCorrections(query, limit - corrections.length);
    corrections.push(...phoneticMatches);

    return corrections.slice(0, limit);
  }

  /**
   * Get related terms and query expansions
   * Suggests semantically related terms and broader/narrower concepts
   */
  private async getRelatedTerms(query: string, limit: number): Promise<SearchSuggestion[]> {
    if (!CONFIG.AI.ENABLE_EXPANSION) return [];

    const expansions: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Semantic expansions (could be enhanced with word embeddings)
    const semanticExpansions: Record<string, string[]> = {
      'healthcare': ['medical', 'health', 'insurance', 'hospital', 'doctor', 'patient'],
      'education': ['school', 'student', 'teacher', 'university', 'learning', 'curriculum'],
      'climate': ['environment', 'global warming', 'carbon', 'emission', 'sustainability'],
      'tax': ['revenue', 'finance', 'budget', 'income', 'economic', 'fiscal'],
      'infrastructure': ['transport', 'road', 'railway', 'bridge', 'construction', 'development'],
      'security': ['safety', 'protection', 'defense', 'law enforcement', 'crime prevention'],
      'agriculture': ['farming', 'food', 'crop', 'farmer', 'rural development'],
      'technology': ['digital', 'innovation', 'internet', 'computer', 'software', 'ai']
    };

    // Find matching expansions
    for (const [term, relatedTerms] of Object.entries(semanticExpansions)) {
      if (lowerQuery.includes(term) || term.includes(lowerQuery)) {
        for (const relatedTerm of relatedTerms.slice(0, CONFIG.AI.MAX_EXPANSIONS)) {
          expansions.push({
            term: relatedTerm,
            frequency: 1,
            score: CONFIG.SCORING.CONTEXTUAL_BOOST,
            type: 'related_term',
            id: `expansion-${relatedTerm}`,
            metadata: {
              originalQuery: query,
              expansionType: 'semantic',
              confidence: 0.7
            }
          });
        }
      }
    }

    // Contextual suggestions based on user history
    if (CONFIG.AI.ENABLE_CONTEXTUAL) {
      const contextualSuggestions = await this.getContextualSuggestions(query, limit - expansions.length);
      expansions.push(...contextualSuggestions);
    }

    return expansions.slice(0, limit);
  }

  /**
   * Get phonetic corrections using simplified Soundex algorithm
   */
  private async getPhoneticCorrections(query: string, limit: number): Promise<SearchSuggestion[]> {
    // Simplified phonetic matching - in production, use proper phonetic algorithms
    const phoneticMap: Record<string, string> = {
      'a': '0', 'e': '0', 'i': '0', 'o': '0', 'u': '0', 'y': '0',
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6'
    };

    const corrections: SearchSuggestion[] = [];
    const queryPhonetic = this.generatePhoneticCode(query);

    // Check against known terms (simplified - would query database in production)
    const knownTerms = ['healthcare', 'education', 'environment', 'infrastructure', 'government'];

    for (const term of knownTerms) {
      if (this.generatePhoneticCode(term) === queryPhonetic && term !== query.toLowerCase()) {
        corrections.push({
          term,
          frequency: 1,
          score: CONFIG.SCORING.AI_CORRECTION_BOOST * 0.8,
          type: 'phonetic_correction',
          id: `phonetic-${term}`,
          metadata: {
            originalQuery: query,
            correctionType: 'phonetic',
            confidence: 0.6
          }
        });
      }
    }

    return corrections.slice(0, limit);
  }

  /**
   * Generate simplified phonetic code
   */
  private generatePhoneticCode(word: string): string {
    if (!word) return '';

    const phoneticMap: Record<string, string> = {
      'a': '0', 'e': '0', 'i': '0', 'o': '0', 'u': '0', 'y': '0',
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6'
    };

    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.length === 0) return '';

    let code: string = cleaned.charAt(0); // Keep first letter
    let prevCode = '';

    for (let i = 1; i < cleaned.length && code.length < 4; i++) {
      const charCode = phoneticMap[cleaned[i]] || '';
      if (charCode && charCode !== '0' && charCode !== prevCode) {
        code += charCode;
        prevCode = charCode;
      }
    }

    // Pad with zeros to make 4 characters
    while (code.length < 4) {
      code += '0';
    }

    return code;
  }

  /**
   * Get contextual suggestions based on user search history
   */
  private async getContextualSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const searchContext = this.getSearchContext();

    // Analyze recent searches for patterns
    const recentQueries = searchContext.userHistory || [];
    const recentTerms = new Set<string>();

    // Extract terms from recent queries within context window
    const contextWindow = Date.now() - (CONFIG.AI.CONTEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    for (const historyItem of recentQueries) {
      if (historyItem.timestamp > contextWindow) {
        const terms = historyItem.query.toLowerCase().split(/\s+/);
        terms.forEach(term => {
          if (term.length >= CONFIG.MIN_TERM_LENGTH) {
            recentTerms.add(term);
          }
        });
      }
    }

    // Find related terms based on co-occurrence in user history
    const currentTerms = query.toLowerCase().split(/\s+/);
    for (const currentTerm of currentTerms) {
      for (const recentTerm of recentTerms) {
        if (recentTerm !== currentTerm && this.calculateSemanticSimilarity(currentTerm, recentTerm) > 0.3) {
          suggestions.push({
            term: recentTerm,
            frequency: 1,
            score: CONFIG.SCORING.CONTEXTUAL_BOOST,
            type: 'contextual_suggestion',
            id: `contextual-${recentTerm}`,
            metadata: {
              originalQuery: query,
              suggestionType: 'user_history',
              confidence: 0.5
            }
          });
        }
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Calculate semantic similarity between terms (simplified)
   */
  private calculateSemanticSimilarity(term1: string, term2: string): number {
    // Simple Jaccard similarity for demonstration
    const set1 = new Set(term1.split(''));
    const set2 = new Set(term2.split(''));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Get date range facets with actual counts
   * Provides facets for common time ranges like "Last 30 days", "Last year", etc.
   */
  private async getDateRangeFacets(searchPattern: string) {
    const now = new Date();
    const ranges = [
      { label: 'Last 30 days', value: 'last_30_days', days: 30 },
      { label: 'Last 90 days', value: 'last_90_days', days: 90 },
      { label: 'Last year', value: 'last_year', days: 365 }
    ];

    try {
      // Calculate counts for each date range in parallel
      const countPromises = ranges.map(async (range) => {
        const start_date = new Date(now);
        startDate.setDate(start_date.getDate() - range.days);

        const result = await this.db
          .select({ count: count() })
          .from(schema.bills)
          .where(
            and(
              gte(schema.bills.created_at, start_date),
              or(
                like(schema.bills.title, searchPattern),
                like(schema.bills.description, searchPattern)
              )
            )
          );

        return {
          value: range.value,
          label: range.label,
          count: result[0]?.count || 0
        };
      });

      const rangeCounts = await Promise.all(countPromises);

      // Add "All time" facet
      const allTimeCount = await this.db
        .select({ count: count() })
        .from(schema.bills)
        .where(
          or(
            like(schema.bills.title, searchPattern),
            like(schema.bills.description, searchPattern)
          )
        );

      rangeCounts.push({
        value: 'all_time',
        label: 'All time',
        count: allTimeCount[0]?.count || 0
      });

      return rangeCounts;
    } catch (error) {
      logger.error('Failed to calculate date range facets', { error });
      // Return zero counts as fallback
      return [
        ...ranges.map(r => ({ value: r.value, label: r.label, count: 0 })),
        { value: 'all_time', label: 'All time', count: 0 }
      ];
    }
  }

  /**
   * Calculate relevance score using multiple similarity metrics
   * This provides a numeric score indicating how well text matches the query
   * Higher scores indicate better matches
   */
  private calculateRelevanceScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match gets highest score
    if (lowerText === lowerQuery) {
      return CONFIG.SCORING.EXACT_MATCH;
    }

    // Prefix match gets very high score (user is likely typing this)
    if (lowerText.startsWith(lowerQuery)) {
      return CONFIG.SCORING.STARTS_WITH;
    }

    // Substring match gets good score
    if (lowerText.includes(lowerQuery)) {
      return CONFIG.SCORING.CONTAINS;
    }

    // Fall back to Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(lowerText, lowerQuery);
    const maxLength = Math.max(lowerText.length, lowerQuery.length);
    const similarity = 1 - (distance / maxLength);

    if (similarity < CONFIG.SCORING.LEVENSHTEIN_THRESHOLD) {
      return CONFIG.SCORING.MIN_SCORE;
    }

    return Math.max(CONFIG.SCORING.MIN_SCORE, similarity * 0.6);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * This measures the minimum number of single-character edits needed to transform one string into another
   * Used for fuzzy matching in search
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize first column and row
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix using dynamic programming
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get search metadata including total results count
   * This provides additional context about the search results
   */
  private async getSearchMetadata(query: string) {
    const searchPattern = `%${query}%`;

    try {
      const totalBills = await this.db
        .select({ count: count() })
        .from(schema.bills)
        .where(
          or(
            like(schema.bills.title, searchPattern),
            like(schema.bills.description, searchPattern)
          )
        );

      return {
        totalResults: totalBills[0]?.count || 0,
        searchTime: Date.now(),
        query: query
      };
    } catch (error) {
      logger.error('Failed to get search metadata', { error, query });
      return {
        totalResults: 0,
        searchTime: Date.now(),
        query: query
      };
    }
  }

  /**
   * Get search context for ranking with cleaned history
   * This provides user behavior data to the ranking algorithm
   */
  private getSearchContext(): SearchContext {
    this.performMemoryCleanup();

    return {
      userHistory: Array.from(this.searchHistory.values()),
      popularTerms: Array.from(this.popularTerms.entries()).map(([term, data]) => ({
        term,
        frequency: data.count
      })),
      timestamp: Date.now()
    };
  }

  /**
   * Get empty autocomplete result as fallback
   * Used when queries are too short or when errors occur
   */
  private getEmptyAutocompleteResult(): AutocompleteResult {
    return {
      suggestions: [],
      facets: this.getEmptyFacets(),
      query: '',
      totalSuggestions: 0
    };
  }

  /**
   * Get empty facets structure
   * Used as fallback when facet queries fail
   */
  private getEmptyFacets(): AutocompleteFacets {
    return {
      categories: [],
      sponsors: [],
      tags: [],
      statuses: [],
      dateRanges: []
    };
  }

  /**
   * Update search history with LRU eviction
   * This tracks user searches to improve future suggestions
   */
  async updateSearchHistory(query: string, resultCount: number): Promise<void> {
    const now = Date.now();

    const entry: HistoryEntry = {
      query,
      timestamp: now,
      resultCount,
      frequency: (this.searchHistory.get(query)?.frequency || 0) + 1
    };

    this.searchHistory.set(query, entry);

    // Extract and track individual terms for popular term tracking
    const terms = query.toLowerCase().split(/\s+/).filter(term =>
      term.length >= CONFIG.MIN_TERM_LENGTH
    );

    for (const term of terms) {
      const current = this.popularTerms.get(term);
      this.popularTerms.set(term, {
        count: (current?.count || 0) + 1,
        lastUpdated: now
      });
    }

    this.performMemoryCleanup();
  }

  /**
   * Perform memory cleanup with both size and time-based eviction
   * This prevents unbounded memory growth by removing old or infrequent entries
   */
  private performMemoryCleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Only perform cleanup once per hour to avoid performance impact
    if (now - this.lastCleanup < oneHour) {
      return;
    }

    this.lastCleanup = now;
    const retentionMs = CONFIG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Clean search history
    if (this.searchHistory.size > CONFIG.MAX_HISTORY_ENTRIES) {
      const entries = Array.from(this.searchHistory.entries());

      // First remove old entries
      entries.forEach(([key, entry]) => {
        if (now - entry.timestamp > retentionMs) {
          this.searchHistory.delete(key);
        }
      });

      // If still over limit, remove least frequently used entries
      if (this.searchHistory.size > CONFIG.MAX_HISTORY_ENTRIES) {
        const sortedEntries = Array.from(this.searchHistory.entries())
          .sort(([, a], [, b]) => a.frequency - b.frequency);

        const toRemove = this.searchHistory.size - CONFIG.MAX_HISTORY_ENTRIES;
        sortedEntries.slice(0, toRemove).forEach(([key]) => {
          this.searchHistory.delete(key);
        });
      }

      logger.info('Search history cleanup performed', {
        remainingEntries: this.searchHistory.size
      });
    }

    // Clean popular terms cache
    if (this.popularTerms.size > CONFIG.MAX_POPULAR_TERMS) {
      const terms = Array.from(this.popularTerms.entries());

      // First remove old terms
      terms.forEach(([key, data]) => {
        if (now - data.lastUpdated > retentionMs) {
          this.popularTerms.delete(key);
        }
      });

      // If still over limit, remove least popular terms
      if (this.popularTerms.size > CONFIG.MAX_POPULAR_TERMS) {
        const sortedTerms = Array.from(this.popularTerms.entries())
          .sort(([, a], [, b]) => a.count - b.count);

        const toRemove = this.popularTerms.size - CONFIG.MAX_POPULAR_TERMS;
        sortedTerms.slice(0, toRemove).forEach(([key]) => {
          this.popularTerms.delete(key);
        });
      }

      logger.info('Popular terms cleanup performed', {
        remainingTerms: this.popularTerms.size
      });
    }
  }

  /**
   * Sanitize and validate search query
   * Migrated from QueryBuilderService to use direct implementation
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
   * Get search analytics aggregated from search history
   * Returns individual search records as SearchAnalytics objects
   *
   * IMPORTANT: The timestamp field must be a Date object, not a number
   * This matches the SearchAnalytics type definition
   */
  async getSearchAnalytics(): Promise<SearchAnalytics[]> {
    try {
      // Convert search history entries to SearchAnalytics format
      // Each history entry becomes an analytics record with proper Date typing
      const analyticsRecords = Array.from(this.searchHistory.values())
        .map(entry => ({
          query: entry.query,
          resultCount: entry.resultCount,
          timestamp: new Date(entry.timestamp) // Convert number to Date object
        }));

      return analyticsRecords;
    } catch (error) {
      logger.error('Failed to generate search analytics', { error });
      return [];
    }
  }

  /**
   * Get aggregated search statistics
   * This provides summary metrics about search usage patterns
   * Use this method when you need high-level analytics rather than individual records
   */
  async getAggregatedAnalytics() {
    try {
      const totalSearches = Array.from(this.searchHistory.values())
        .reduce((sum, entry) => sum + entry.frequency, 0);

      const topQueries = Array.from(this.searchHistory.entries())
        .sort(([, a], [, b]) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(([query, entry]) => ({
          query,
          frequency: entry.frequency,
          avgResults: entry.resultCount,
          lastSearched: new Date(entry.timestamp)
        }));

      const topTerms = Array.from(this.popularTerms.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 20)
        .map(([term, data]) => ({
          term,
          frequency: data.count,
          lastUsed: new Date(data.lastUpdated)
        }));

      const totalResults = Array.from(this.searchHistory.values())
        .reduce((sum, entry) => sum + entry.resultCount, 0);

      return {
        totalSearches,
        uniqueQueries: this.searchHistory.size,
        topQueries,
        topTerms,
        avgResultsPerQuery: totalSearches > 0 ? totalResults / totalSearches : 0,
        timestamp: new Date(),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate aggregated analytics', { error });
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        topQueries: [],
        topTerms: [],
        avgResultsPerQuery: 0,
        timestamp: new Date(),
        generatedAt: new Date()
      };
    }
  }

  /**
   * Clear search history and popular terms caches
   * Useful for testing or when you need to reset user tracking data
   */
  clearHistory(): void {
    this.searchHistory.clear();
    this.popularTerms.clear();
    this.lastCleanup = Date.now();
    logger.info('Search history and popular terms cleared');
  }

  /**
   * Get cache statistics for monitoring
   * Returns information about current cache sizes and memory usage
   */
  getCacheStats() {
    return {
      searchHistorySize: this.searchHistory.size,
      popularTermsSize: this.popularTerms.size,
      lastCleanup: new Date(this.lastCleanup),
      memoryUsageEstimate: this.estimateMemoryUsage(),
      oldestEntry: this.getOldestHistoryEntry(),
      newestEntry: this.getNewestHistoryEntry()
    };
  }

  /**
   * Get the oldest entry in search history
   * Useful for monitoring data retention
   */
  private getOldestHistoryEntry(): Date | null {
    let oldestTimestamp = Date.now();
    let hasEntries = false;

    this.searchHistory.forEach(entry => {
      hasEntries = true;
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return hasEntries ? new Date(oldestTimestamp) : null;
  }

  /**
   * Get the newest entry in search history
   * Useful for monitoring activity
   */
  private getNewestHistoryEntry(): Date | null {
    let newestTimestamp = 0;
    let hasEntries = false;

    this.searchHistory.forEach(entry => {
      hasEntries = true;
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    });

    return hasEntries ? new Date(newestTimestamp) : null;
  }

  /**
   * Estimate memory usage of in-memory caches
   * This is an approximation for monitoring purposes
   * Returns the estimated size in bytes
   */
  private estimateMemoryUsage(): number {
    let totalBytes = 0;

    // Estimate search history size (rough approximation)
    // Each character in UTF-16 is 2 bytes, plus overhead for numbers
    this.searchHistory.forEach((entry, key) => {
      totalBytes += key.length * 2; // UTF-16 characters
      totalBytes += entry.query.length * 2;
      totalBytes += 24; // timestamp, resultCount, frequency (8 bytes each)
    });

    // Estimate popular terms size
    this.popularTerms.forEach((data, term) => {
      totalBytes += term.length * 2;
      totalBytes += 16; // count and lastUpdated (8 bytes each)
    });

    // Add overhead for Map structures (approximate)
    totalBytes += (this.searchHistory.size * 50); // Map entry overhead
    totalBytes += (this.popularTerms.size * 50); // Map entry overhead

    return totalBytes;
  }

  /**
   * Export search history for backup or analysis
   * Returns a JSON-serializable object containing all search data
   */
  exportSearchData() {
    return {
      searchHistory: Array.from(this.searchHistory.entries()).map(([key, entry]) => ({
        key,
        ...entry,
        timestampDate: new Date(entry.timestamp)
      })),
      popularTerms: Array.from(this.popularTerms.entries()).map(([term, data]) => ({
        term,
        count: data.count,
        lastUpdated: new Date(data.lastUpdated)
      })),
      exportedAt: new Date(),
      stats: {
        totalHistoryEntries: this.searchHistory.size,
        totalPopularTerms: this.popularTerms.size,
        estimatedMemoryUsage: this.estimateMemoryUsage()
      }
    };
  }

  /**
   * Import search history from a previous export
   * Useful for restoring data or transferring between instances
   *
   * @param data - The data object from exportSearchData()
   * @param merge - If true, merge with existing data; if false, replace
   */
  importSearchData(data: any, merge: boolean = false): void {
    try {
      if (!merge) {
        this.searchHistory.clear();
        this.popularTerms.clear();
      }

      // Import search history
      if (data.searchHistory && Array.isArray(data.searchHistory)) {
        data.searchHistory.forEach((item: any) => {
          const entry: HistoryEntry = {
            query: item.query,
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime(),
            resultCount: item.resultCount,
            frequency: item.frequency
          };
          this.searchHistory.set(item.key, entry);
        });
      }

      // Import popular terms
      if (data.popularTerms && Array.isArray(data.popularTerms)) {
        data.popularTerms.forEach((item: any) => {
          this.popularTerms.set(item.term, {
            count: item.count,
            lastUpdated: typeof item.lastUpdated === 'number' ? item.lastUpdated : new Date(item.lastUpdated).getTime()
          });
        });
      }

      logger.info('Search data imported successfully', {
        historyEntries: this.searchHistory.size,
        popularTerms: this.popularTerms.size,
        mergeMode: merge
      });
    } catch (error) {
      logger.error('Failed to import search data', { error });
      throw new Error('Search data import failed');
    }
  }

  /**
   * Get recent searches for a specific time period
   * Useful for showing "recent searches" in the UI
   *
   * @param minutes - Number of minutes to look back
   * @param limit - Maximum number of results to return
   */
  getRecentSearches(minutes: number = 60, limit: number = 10): Array<{
    query: string;
    timestamp: Date;
    resultCount: number;
  }> {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);

    return Array.from(this.searchHistory.values())
      .filter(entry => entry.timestamp >= cutoffTime)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(entry => ({
        query: entry.query,
        timestamp: new Date(entry.timestamp),
        resultCount: entry.resultCount
      }));
  }

  /**
   * Get trending searches based on recent frequency spikes
   * Identifies queries that are becoming more popular
   *
   * @param limit - Maximum number of trending queries to return
   */
  getTrendingSearches(limit: number = 5): Array<{
    query: string;
    frequency: number;
    recentCount: number;
  }> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    // Calculate recent vs total frequency
    const trends = Array.from(this.searchHistory.entries())
      .map(([query, entry]) => {
        // Count how many searches in last hour vs total
        const recentCount = entry.timestamp >= oneHourAgo ? entry.frequency : 0;
        return {
          query,
          frequency: entry.frequency,
          recentCount,
          trendScore: entry.frequency > 0 ? recentCount / entry.frequency : 0
        };
      })
      .filter(item => item.recentCount > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);

    return trends;
  }
}

// Export singleton instance for use throughout the application
export const suggestionEngineService = new SuggestionEngineService();
