/**
 * Enhanced Search Service - Complete Infrastructure Integration
 * 
 * Integrates ALL infrastructure components:
 * - ✅ Validation (Zod schemas)
 * - ✅ Caching (cache-keys.ts with aggressive caching)
 * - ✅ Security (SecureQueryBuilder, SQL injection prevention)
 * - ✅ Error Handling (Result types)
 * - ✅ Transactions (for search history)
 */

import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { sql } from 'drizzle-orm';

// Infrastructure imports
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL, createCacheInvalidation } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  GlobalSearchSchema,
  BillSearchSchema,
  UserSearchSchema,
  CommentSearchSchema,
  AutocompleteSchema,
  SaveSearchSchema,
  GetSearchHistorySchema,
  GetPopularSearchesSchema,
  type GlobalSearchInput,
  type BillSearchInput,
  type UserSearchInput,
  type CommentSearchInput,
  type AutocompleteInput,
  type SaveSearchInput,
  type GetSearchHistoryInput,
  type GetPopularSearchesInput,
} from './search-validation.schemas';

// Domain types
interface SearchResult {
  id: string;
  type: 'bill' | 'user' | 'comment' | 'discussion';
  title: string;
  snippet: string;
  relevance_score: number;
  metadata: Record<string, any>;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

/**
 * Enhanced SearchService with complete infrastructure integration
 */
export class SearchService {
  private inputSanitizer = new InputSanitizationService();
  private cacheInvalidation = createCacheInvalidation(cacheService);

  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================

  /**
   * Global search across all content types with aggressive caching
   */
  async globalSearch(searchInput: GlobalSearchInput): Promise<AsyncServiceResult<SearchResponse>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(GlobalSearchSchema, searchInput);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      const sanitizedQuery = this.inputSanitizer.sanitizeString(validatedInput.query);

      // 2. Check cache (aggressive caching for search)
      const cacheKey = cacheKeys.search(sanitizedQuery, {
        type: validatedInput.type,
        filters: validatedInput.filters,
        sort: validatedInput.sort,
        page: validatedInput.page,
        limit: validatedInput.limit,
      });
      const cached = await cacheService.get<SearchResponse>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for global search');
        return cached;
      }

      // 3. Execute search based on type
      const page = validatedInput.page ? parseInt(validatedInput.page) : 1;
      const limit = validatedInput.limit ? parseInt(validatedInput.limit) : 20;
      const offset = (page - 1) * limit;

      let results: SearchResult[] = [];
      let total = 0;

      if (validatedInput.type === 'all') {
        // Search across all types
        const [billResults, userResults, commentResults] = await Promise.all([
          this.searchBills(sanitizedQuery, limit / 3),
          this.searchUsers(sanitizedQuery, limit / 3),
          this.searchComments(sanitizedQuery, limit / 3),
        ]);

        results = [...billResults, ...userResults, ...commentResults]
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, limit);
        total = results.length;
      } else {
        // Type-specific search
        switch (validatedInput.type) {
          case 'bills':
            results = await this.searchBills(sanitizedQuery, limit, offset);
            break;
          case 'users':
            results = await this.searchUsers(sanitizedQuery, limit, offset);
            break;
          case 'comments':
            results = await this.searchComments(sanitizedQuery, limit, offset);
            break;
        }
        total = results.length;
      }

      const response: SearchResponse = {
        results,
        total,
        page,
        limit,
        query: sanitizedQuery,
      };

      // 4. Cache results (5 minutes for search)
      await cacheService.set(cacheKey, response, CACHE_TTL.SEARCH);

      // 5. Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'search_executed',
        severity: 'low',
        ip_address: 'internal',
        user_agent: 'enhanced-search-service',
        resource: 'search',
        action: 'search',
        success: true,
        details: {
          query: sanitizedQuery,
          type: validatedInput.type,
          result_count: total,
        },
      });

      return response;
    }, { service: 'SearchService', operation: 'globalSearch' });
  }

  // ============================================================================
  // TYPE-SPECIFIC SEARCH METHODS
  // ============================================================================

  /**
   * Search bills with caching
   */
  async searchBills(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    const searchPattern = `%${query.toLowerCase()}%`;

    const results = await secureQueryBuilderService
      .select()
      .from('bills')
      .where('title', 'LIKE', searchPattern)
      .orWhere('summary', 'LIKE', searchPattern)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return results.map(bill => ({
      id: bill.id,
      type: 'bill' as const,
      title: bill.title,
      snippet: bill.summary?.substring(0, 200) || '',
      relevance_score: this.calculateRelevance(query, bill.title + ' ' + bill.summary),
      metadata: {
        status: bill.status,
        category: bill.category,
        created_at: bill.created_at,
      },
    }));
  }

  /**
   * Search users with caching
   */
  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    const searchPattern = `%${query.toLowerCase()}%`;

    const results = await secureQueryBuilderService
      .select()
      .from('users')
      .where('email', 'LIKE', searchPattern)
      .limit(limit)
      .offset(offset);

    return results.map(user => ({
      id: user.id,
      type: 'user' as const,
      title: user.email,
      snippet: `User role: ${user.role}`,
      relevance_score: this.calculateRelevance(query, user.email),
      metadata: {
        role: user.role,
        is_verified: user.is_verified,
        created_at: user.created_at,
      },
    }));
  }

  /**
   * Search comments with caching
   */
  async searchComments(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    const searchPattern = `%${query.toLowerCase()}%`;

    const results = await secureQueryBuilderService
      .select()
      .from('comments')
      .where('content', 'LIKE', searchPattern)
      .where('moderation_status', '=', 'approved')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return results.map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      title: `Comment on bill ${comment.bill_id}`,
      snippet: this.inputSanitizer.sanitizeHtml(comment.content.substring(0, 200)),
      relevance_score: this.calculateRelevance(query, comment.content),
      metadata: {
        bill_id: comment.bill_id,
        user_id: comment.user_id,
        created_at: comment.created_at,
      },
    }));
  }

  // ============================================================================
  // BILL SEARCH (DETAILED)
  // ============================================================================

  /**
   * Detailed bill search with filters and caching
   */
  async billSearch(searchInput: BillSearchInput): Promise<AsyncServiceResult<SearchResponse>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(BillSearchSchema, searchInput);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      const sanitizedQuery = this.inputSanitizer.sanitizeString(validatedInput.query);

      // 2. Check cache
      const cacheKey = cacheKeys.search(sanitizedQuery, {
        type: 'bills',
        ...validatedInput,
      });
      const cached = await cacheService.get<SearchResponse>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill search');
        return cached;
      }

      // 3. Build query with filters
      const page = validatedInput.page ? parseInt(validatedInput.page) : 1;
      const limit = validatedInput.limit ? parseInt(validatedInput.limit) : 20;
      const offset = (page - 1) * limit;

      let query = secureQueryBuilderService
        .select()
        .from('bills');

      // Apply search
      const searchPattern = `%${sanitizedQuery.toLowerCase()}%`;
      query = query.where('title', 'LIKE', searchPattern)
        .orWhere('summary', 'LIKE', searchPattern);

      // Apply filters
      if (validatedInput.category) {
        query = query.where('category', '=', validatedInput.category);
      }
      if (validatedInput.status) {
        query = query.where('status', '=', validatedInput.status);
      }
      if (validatedInput.sponsor_id) {
        query = query.where('sponsor_id', '=', validatedInput.sponsor_id);
      }

      // Execute query
      const results = await query
        .orderBy(validatedInput.sort === 'date' ? 'created_at' : 'title', 'desc')
        .limit(limit)
        .offset(offset);

      const searchResults: SearchResult[] = results.map(bill => ({
        id: bill.id,
        type: 'bill' as const,
        title: bill.title,
        snippet: bill.summary?.substring(0, 200) || '',
        relevance_score: this.calculateRelevance(sanitizedQuery, bill.title + ' ' + bill.summary),
        metadata: {
          status: bill.status,
          category: bill.category,
          created_at: bill.created_at,
        },
      }));

      const response: SearchResponse = {
        results: searchResults,
        total: searchResults.length,
        page,
        limit,
        query: sanitizedQuery,
      };

      // 4. Cache results
      await cacheService.set(cacheKey, response, CACHE_TTL.SEARCH);

      return response;
    }, { service: 'SearchService', operation: 'billSearch' });
  }

  // ============================================================================
  // AUTOCOMPLETE
  // ============================================================================

  /**
   * Autocomplete suggestions with aggressive caching
   */
  async autocomplete(input: AutocompleteInput): Promise<AsyncServiceResult<string[]>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(AutocompleteSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      const sanitizedQuery = this.inputSanitizer.sanitizeString(validatedInput.query);

      // 2. Check cache (10 minutes for autocomplete)
      const cacheKey = cacheKeys.search(`autocomplete:${sanitizedQuery}`, {
        type: validatedInput.type,
        limit: validatedInput.limit,
      });
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for autocomplete');
        return cached;
      }

      // 3. Get suggestions based on type
      const searchPattern = `${sanitizedQuery.toLowerCase()}%`;
      let suggestions: string[] = [];

      if (validatedInput.type === 'bills' || validatedInput.type === 'all') {
        const billTitles = await secureQueryBuilderService
          .select('title')
          .from('bills')
          .where('title', 'LIKE', searchPattern)
          .limit(validatedInput.limit);
        
        suggestions.push(...billTitles.map(b => b.title));
      }

      // Remove duplicates and limit
      suggestions = [...new Set(suggestions)].slice(0, validatedInput.limit);

      // 4. Cache results (10 minutes)
      await cacheService.set(cacheKey, suggestions, CACHE_TTL.MEDIUM);

      return suggestions;
    }, { service: 'SearchService', operation: 'autocomplete' });
  }

  // ============================================================================
  // SEARCH HISTORY
  // ============================================================================

  /**
   * Save search query to history with transaction
   */
  async saveSearch(data: SaveSearchInput, userId: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(SaveSearchSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedData = validation.data!;
      const sanitizedQuery = this.inputSanitizer.sanitizeString(validatedData.query);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // 2. Execute with transaction
      await withTransaction(async () => {
        await secureQueryBuilderService
          .insert('search_history')
          .values({
            user_id: sanitizedUserId,
            query: sanitizedQuery,
            type: validatedData.type,
            filters: validatedData.filters ? JSON.stringify(validatedData.filters) : null,
            result_count: validatedData.result_count,
            created_at: new Date(),
          });
      });

      // 3. Invalidate user's search history cache
      await cacheService.delete(cacheKeys.user(sanitizedUserId, 'search-history'));

      return true;
    }, { service: 'SearchService', operation: 'saveSearch' });
  }

  /**
   * Get user's search history with caching
   */
  async getSearchHistory(input: GetSearchHistoryInput): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(GetSearchHistorySchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      const sanitizedUserId = this.inputSanitizer.sanitizeString(validatedInput.user_id);

      // 2. Check cache
      const cacheKey = cacheKeys.user(sanitizedUserId, 'search-history');
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for search history');
        return cached;
      }

      // 3. Query database
      const limit = validatedInput.limit ? parseInt(validatedInput.limit) : 20;
      
      const history = await secureQueryBuilderService
        .select()
        .from('search_history')
        .where('user_id', '=', sanitizedUserId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      // 4. Cache results (30 minutes)
      await cacheService.set(cacheKey, history, CACHE_TTL.HALF_HOUR);

      return history;
    }, { service: 'SearchService', operation: 'getSearchHistory' });
  }

  /**
   * Get popular searches with aggressive caching
   */
  async getPopularSearches(input: GetPopularSearchesInput): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(GetPopularSearchesSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;

      // 2. Check cache (1 hour for popular searches)
      const cacheKey = cacheKeys.analytics('popular-searches', {
        timeframe: validatedInput.timeframe,
        type: validatedInput.type,
      });
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for popular searches');
        return cached;
      }

      // 3. Calculate date range
      const now = new Date();
      let dateFrom = new Date();
      switch (validatedInput.timeframe) {
        case 'day':
          dateFrom.setDate(now.getDate() - 1);
          break;
        case 'week':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case 'month':
          dateFrom.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          dateFrom = new Date(0);
          break;
      }

      // 4. Query popular searches
      const limit = validatedInput.limit ? parseInt(validatedInput.limit) : 10;
      
      let query = secureQueryBuilderService
        .select('query', sql`COUNT(*) as count`)
        .from('search_history')
        .where('created_at', '>=', dateFrom.toISOString());

      if (validatedInput.type) {
        query = query.where('type', '=', validatedInput.type);
      }

      const popular = await query
        .groupBy('query')
        .orderBy('count', 'desc')
        .limit(limit);

      // 5. Cache results (1 hour)
      await cacheService.set(cacheKey, popular, CACHE_TTL.HOUR);

      return popular;
    }, { service: 'SearchService', operation: 'getPopularSearches' });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate relevance score (simple implementation)
   */
  private calculateRelevance(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact match
    if (textLower === queryLower) return 1.0;
    
    // Contains query
    if (textLower.includes(queryLower)) return 0.8;
    
    // Word match
    const queryWords = queryLower.split(' ');
    const matchedWords = queryWords.filter(word => textLower.includes(word));
    return matchedWords.length / queryWords.length * 0.6;
  }
}

/**
 * Factory function to create enhanced search service instance
 */
export function createEnhancedSearchService(): SearchService {
  return new SearchService();
}

/**
 * Singleton instance
 */
export const enhancedSearchService = createEnhancedSearchService();
