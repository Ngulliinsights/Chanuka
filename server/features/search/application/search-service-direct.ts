import { logger } from '@shared/core/observability/logging';
import { db } from '@server/infrastructure/database/pool.js';
import {
  type Bill,
  bills,
  type Comment,
  comments,
  type Sponsor,
  sponsors,
  type User,
  users} from '@server/infrastructure/schema';
import { and, asc, count, desc, eq, inArray, isNotNull,like, or, sql } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SearchQuery {
  text: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  sorting?: SearchSorting;
}

export interface SearchFilters {
  billStatus?: string[];
  sponsors?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchSorting {
  field: 'relevance' | 'date' | 'title' | 'status';
  order: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  type: 'bill' | 'sponsor' | 'comment';
  title: string;
  content: string;
  snippet: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: SearchFacets;
  query: SearchQuery;
  executionTime: number;
}

export interface SearchFacets {
  types: { [key: string]: number };
  statuses: { [key: string]: number };
  sponsors: { [key: string]: number };
  categories: { [key: string]: number };
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

/**
 * SearchService - Direct database search service using Drizzle ORM
 *
 * This service provides direct database queries for search operations,
 * optimized for performance with comprehensive search capabilities across
 * bills, sponsors, and comments. This is the direct database implementation
 * that complements the multi-engine search service.
 */
export class SearchService {
  private get database() {
    return db;
  }

  // ============================================================================
  // MAIN SEARCH OPERATIONS
  // ============================================================================

  /**
   * Perform comprehensive search across all content types
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const logContext = { 
      component: 'SearchService', 
      operation: 'search',
      query: query.text,
      filters: query.filters 
    };
    logger.debug('Performing comprehensive search', logContext);

    try {
      // Perform searches in parallel for better performance
      const [billResults, sponsorResults, commentResults] = await Promise.all([
        this.searchBills(query),
        this.searchSponsors(query),
        this.searchComments(query)
      ]);

      // Combine and sort results by relevance
      const allResults = [
        ...billResults.map(r => ({ ...r, type: 'bill' as const })),
        ...sponsorResults.map(r => ({ ...r, type: 'sponsor' as const })),
        ...commentResults.map(r => ({ ...r, type: 'comment' as const }))
      ].sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Apply pagination
      const { page = 1, limit = 20 } = query.pagination || {};
      const startIndex = (page - 1) * limit;
      const paginatedResults = allResults.slice(startIndex, startIndex + limit);

      // Calculate facets
      const facets = this.calculateFacets(allResults);

      const executionTime = Date.now() - startTime;
      
      logger.debug('✅ Search completed', { 
        ...logContext, 
        totalResults: allResults.length,
        executionTime 
      });

      return {
        results: paginatedResults,
        totalCount: allResults.length,
        facets,
        query,
        executionTime
      };
    } catch (error) {
      logger.error('Failed to perform search', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Search bills with full-text capabilities
   */
  async searchBills(query: SearchQuery): Promise<SearchResult[]> {
    const logContext = { 
      component: 'SearchService', 
      operation: 'searchBills',
      query: query.text 
    };
    logger.debug('Searching bills', logContext);

    try {
      const searchPattern = `%${query.text}%`;
      let dbQuery = this.database
        .select({
          id: bills.id,
          title: bills.title,
          content: bills.content,
          status: bills.status,
          introduced_date: bills.introduced_date,
          summary: bills.summary
        })
        .from(bills)
        .where(
          or(
            like(bills.title, searchPattern),
            like(bills.content, searchPattern),
            like(bills.summary, searchPattern)
          )
        );

      // Apply filters
      if (query.filters?.billStatus?.length) {
        dbQuery = dbQuery.where(inArray(bills.status, query.filters.billStatus));
      }

      if (query.filters?.dateRange) {
        dbQuery = dbQuery.where(
          and(
            sql`${bills.introduced_date} >= ${query.filters.dateRange.start}`,
            sql`${bills.introduced_date} <= ${query.filters.dateRange.end}`
          )
        );
      }

      // Apply sorting
      const { field = 'relevance', order = 'desc' } = query.sorting || {};
      if (field === 'date') {
        dbQuery = dbQuery.orderBy(order === 'desc' ? desc(bills.introduced_date) : asc(bills.introduced_date));
      } else if (field === 'title') {
        dbQuery = dbQuery.orderBy(order === 'desc' ? desc(bills.title) : asc(bills.title));
      }

      const results = await dbQuery.limit(100); // Reasonable limit for performance

      const searchResults = results.map(bill => ({
        id: bill.id.toString(),
        type: 'bill' as const,
        title: bill.title || 'Untitled Bill',
        content: bill.content || bill.summary || '',
        snippet: this.generateSnippet(bill.content || bill.summary || '', query.text),
        relevanceScore: this.calculateRelevanceScore(
          query.text,
          [bill.title, bill.content, bill.summary].filter(Boolean).join(' ')
        ),
        metadata: {
          status: bill.status,
          introduced_date: bill.introduced_date,
          bill_id: bill.id
        }
      }));

      logger.debug('✅ Bills search completed', { 
        ...logContext, 
        count: searchResults.length 
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search bills', { ...logContext, error });
      return [];
    }
  }

  /**
   * Search sponsors
   */
  async searchSponsors(query: SearchQuery): Promise<SearchResult[]> {
    const logContext = { 
      component: 'SearchService', 
      operation: 'searchSponsors',
      query: query.text 
    };
    logger.debug('Searching sponsors', logContext);

    try {
      const searchPattern = `%${query.text}%`;
      const results = await this.database
        .select({
          id: sponsors.id,
          name: sponsors.name,
          party: sponsors.party,
          constituency: sponsors.constituency,
          role: sponsors.role,
          bio: sponsors.bio
        })
        .from(sponsors)
        .where(
          or(
            like(sponsors.name, searchPattern),
            like(sponsors.party, searchPattern),
            like(sponsors.constituency, searchPattern),
            like(sponsors.bio, searchPattern)
          )
        )
        .limit(50);

      const searchResults = results.map(sponsor => ({
        id: sponsor.id.toString(),
        type: 'sponsor' as const,
        title: sponsor.name || 'Unknown Sponsor',
        content: [sponsor.party, sponsor.constituency, sponsor.role, sponsor.bio]
          .filter(Boolean)
          .join(' '),
        snippet: this.generateSnippet(
          [sponsor.party, sponsor.constituency, sponsor.bio].filter(Boolean).join(' '),
          query.text
        ),
        relevanceScore: this.calculateRelevanceScore(
          query.text,
          [sponsor.name, sponsor.party, sponsor.constituency, sponsor.bio]
            .filter(Boolean)
            .join(' ')
        ),
        metadata: {
          party: sponsor.party,
          constituency: sponsor.constituency,
          role: sponsor.role,
          sponsor_id: sponsor.id
        }
      }));

      logger.debug('✅ Sponsors search completed', { 
        ...logContext, 
        count: searchResults.length 
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search sponsors', { ...logContext, error });
      return [];
    }
  }

  /**
   * Search comments
   */
  async searchComments(query: SearchQuery): Promise<SearchResult[]> {
    const logContext = { 
      component: 'SearchService', 
      operation: 'searchComments',
      query: query.text 
    };
    logger.debug('Searching comments', logContext);

    try {
      const searchPattern = `%${query.text}%`;
      const results = await this.database
        .select({
          id: comments.id,
          content: comments.content,
          created_at: comments.created_at,
          bill_id: comments.bill_id,
          user_id: comments.user_id
        })
        .from(comments)
        .where(like(comments.content, searchPattern))
        .orderBy(desc(comments.created_at))
        .limit(50);

      const searchResults = results.map(comment => ({
        id: comment.id.toString(),
        type: 'comment' as const,
        title: `Comment on Bill ${comment.bill_id}`,
        content: comment.content || '',
        snippet: this.generateSnippet(comment.content || '', query.text),
        relevanceScore: this.calculateRelevanceScore(query.text, comment.content || ''),
        metadata: {
          bill_id: comment.bill_id,
          user_id: comment.user_id,
          created_at: comment.created_at,
          comment_id: comment.id
        }
      }));

      logger.debug('✅ Comments search completed', { 
        ...logContext, 
        count: searchResults.length 
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search comments', { ...logContext, error });
      return [];
    }
  }

  // ============================================================================
  // SPECIALIZED SEARCH OPERATIONS
  // ============================================================================

  /**
   * Search for bills by specific criteria
   */
  async searchBillsByStatus(status: string): Promise<Bill[]> {
    const logContext = { 
      component: 'SearchService', 
      operation: 'searchBillsByStatus',
      status 
    };
    logger.debug('Searching bills by status', logContext);

    try {
      const results = await this.database
        .select()
        .from(bills)
        .where(eq(bills.status, status))
        .orderBy(desc(bills.introduced_date));

      logger.debug('✅ Bills by status search completed', { 
        ...logContext, 
        count: results.length 
      });

      return results;
    } catch (error) {
      logger.error('Failed to search bills by status', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    const logContext = { 
      component: 'SearchService', 
      operation: 'getSearchSuggestions',
      partialQuery,
      limit 
    };
    logger.debug('Getting search suggestions', logContext);

    try {
      const searchPattern = `${partialQuery}%`;
      
      // Get suggestions from bill titles
      const billSuggestions = await this.database
        .selectDistinct({ title: bills.title })
        .from(bills)
        .where(like(bills.title, searchPattern))
        .limit(limit);

      // Get suggestions from sponsor names
      const sponsorSuggestions = await this.database
        .selectDistinct({ name: sponsors.name })
        .from(sponsors)
        .where(like(sponsors.name, searchPattern))
        .limit(limit);

      const suggestions = [
        ...billSuggestions.map(b => b.title).filter(Boolean),
        ...sponsorSuggestions.map(s => s.name).filter(Boolean)
      ].slice(0, limit);

      logger.debug('✅ Search suggestions generated', { 
        ...logContext, 
        count: suggestions.length 
      });

      return suggestions;
    } catch (error) {
      logger.error('Failed to get search suggestions', { ...logContext, error });
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate a snippet with highlighted search terms
   */
  private generateSnippet(content: string, searchTerm: string, maxLength: number = 200): string {
    if (!content || !searchTerm) return content?.substring(0, maxLength) || '';

    const lowerContent = content.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    const index = lowerContent.indexOf(lowerSearchTerm);

    if (index === -1) {
      return content.substring(0, maxLength);
    }

    // Calculate snippet boundaries
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + searchTerm.length + 150);
    
    let snippet = content.substring(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Calculate relevance score based on term frequency and position
   */
  private calculateRelevanceScore(searchTerm: string, content: string): number {
    if (!content || !searchTerm) return 0;

    const lowerContent = content.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Count occurrences
    const matches = (lowerContent.match(new RegExp(lowerSearchTerm, 'g')) || []).length;
    
    // Base score from frequency
    let score = matches * 10;
    
    // Bonus for exact matches
    if (lowerContent.includes(lowerSearchTerm)) {
      score += 20;
    }
    
    // Bonus for matches at the beginning
    if (lowerContent.startsWith(lowerSearchTerm)) {
      score += 30;
    }
    
    // Normalize by content length
    score = score / Math.log(content.length + 1);
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate search facets for filtering
   */
  private calculateFacets(results: SearchResult[]): SearchFacets {
    const facets: SearchFacets = {
      types: {},
      statuses: {},
      sponsors: {},
      categories: {}
    };

    results.forEach(result => {
      // Count by type
      facets.types[result.type] = (facets.types[result.type] || 0) + 1;
      
      // Count by status (for bills)
      if (result.metadata.status) {
        facets.statuses[result.metadata.status] = (facets.statuses[result.metadata.status] || 0) + 1;
      }
      
      // Count by party (for sponsors)
      if (result.metadata.party) {
        facets.sponsors[result.metadata.party] = (facets.sponsors[result.metadata.party] || 0) + 1;
      }
    });

    return facets;
  }

  /**
   * Health check for the search service
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date; stats: any }> {
    try {
      const [billCount] = await this.database.select({ count: count() }).from(bills);
      const [sponsorCount] = await this.database.select({ count: count() }).from(sponsors);
      const [commentCount] = await this.database.select({ count: count() }).from(comments);
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        stats: {
          bills: billCount.count,
          sponsors: sponsorCount.count,
          comments: commentCount.count
        }
      };
    } catch (error) {
      logger.error('Search service health check failed', { 
        component: 'SearchService',
        error 
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        stats: null
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of SearchService for application-wide use.
 */
export const searchService = new SearchService();


