// ============================================================================
// POSTGRESQL FULL-TEXT SEARCH ENGINE - ENHANCED
// ============================================================================
// Advanced search using PostgreSQL's ts_vector and ts_query with:
// - GIN indexes for optimal performance
// - Enhanced ts_rank scoring with multiple factors
// - Query expansion with synonyms and stemming
// - Performance monitoring and analytics

import { database } from '@shared/database';
import { bills, sponsors, comments, users } from '@shared/schema';
import { sql, desc } from 'drizzle-orm';
import { SearchQuery, SearchResult } from '../types/search.types.js';
import { logger } from '@shared/core/index.js';
import { databaseService } from '@/infrastructure/database/database-service';

interface QueryExpansionOptions {
  enableSynonyms: boolean;
  enableStemming: boolean;
  category?: string;
  maxExpansions: number;
}

interface SearchPerformanceMetrics {
  executionTime: number;
  resultsCount: number;
  queryComplexity: number;
  indexUsage: boolean;
}

export class PostgreSQLFullTextEngine {
  private readonly defaultExpansionOptions: QueryExpansionOptions = {
    enableSynonyms: true,
    enableStemming: true,
    maxExpansions: 5
  };

  /**
   * Execute enhanced PostgreSQL full-text search with improved relevance ranking.
   * Features:
   * - Query expansion with synonyms
   * - Multi-factor ts_rank scoring
   * - Performance monitoring
   * - Automatic fallback strategies
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();
    const results: SearchResult[] = [];

    try {
      // Extract and expand search terms
      const searchTerms = this.extractSearchTerms(query.query);
      const expandedQuery = await this.expandQuery(query.query, this.defaultExpansionOptions);
      
      // Build optimized ts_query with both original and expanded terms
      const tsQuery = this.buildOptimizedTsQuery(searchTerms, expandedQuery);
      
      // Execute searches in parallel for better performance
      const searchPromises = [];

      if (this.shouldSearchType(query, 'bills')) {
        searchPromises.push(this.searchBillsEnhanced(tsQuery, searchTerms, query));
      }

      if (this.shouldSearchType(query, 'sponsors')) {
        searchPromises.push(this.searchSponsorsEnhanced(tsQuery, searchTerms, query));
      }

      if (this.shouldSearchType(query, 'comments')) {
        searchPromises.push(this.searchCommentsEnhanced(tsQuery, searchTerms, query));
      }

      const allResults = await Promise.all(searchPromises);
      results.push(...allResults.flat());

      // Apply enhanced relevance scoring
      const scoredResults = this.applyEnhancedScoring(results, query.query, searchTerms);

      // Log performance metrics
      const executionTime = Date.now() - startTime;
      await this.logSearchPerformance(query.query, 'fulltext', scoredResults.length, executionTime);

      // Sort by enhanced relevance score descending
      return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error('PostgreSQL full-text search failed', { 
        error: (error as Error).message,
        query: query.query,
        executionTime: Date.now() - startTime
      });
      
      // Fallback to empty results on error
      return [];
    }
  }




  /**
   * Enhanced bills search with improved ts_rank scoring
   */
  private async searchBillsEnhanced(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const result = await databaseService.executeRawQuery(
      `
      SELECT 
        id,
        bill_number,
        title,
        summary,
        status,
        chamber,
        created_at,
        -- Enhanced ts_rank with multiple factors
        (
          -- Base relevance score
          ts_rank_cd(
            to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')),
            to_tsquery('english', $1),
            32 -- Use cover density ranking
          ) * 1.0 +
          -- Title match bonus (higher weight for title matches)
          CASE WHEN to_tsvector('english', title) @@ to_tsquery('english', $1) 
               THEN 0.5 ELSE 0.0 END +
          -- Exact phrase match bonus
          CASE WHEN title ILIKE '%' || $2 || '%' OR summary ILIKE '%' || $2 || '%'
               THEN 0.3 ELSE 0.0 END +
          -- Recency bonus (newer bills get slight boost)
          CASE WHEN created_at > NOW() - INTERVAL '6 months' 
               THEN 0.1 ELSE 0.0 END +
          -- Engagement bonus
          (COALESCE(engagement_score, 0) / 1000.0) * 0.2
        ) as relevance_score
      FROM bills
      WHERE 
        to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')) 
        @@ to_tsquery('english', $1)
        AND ($3::text IS NULL OR status = ANY(string_to_array($3, ',')))
        AND ($4::text IS NULL OR chamber = ANY(string_to_array($4, ',')))
      ORDER BY relevance_score DESC
      LIMIT $5
      `,
      [
        tsQuery,
        query.query,
        query.filters?.status?.join(',') || null,
        query.filters?.chamber?.join(',') || null,
        query.pagination?.limit || 50
      ],
      [],
      'searchBillsEnhanced'
    );

    return result.data.map((bill: any) => ({
      id: bill.id,
      type: 'bill' as const,
      title: bill.title,
      summary: bill.summary || undefined,
      relevanceScore: Number(bill.relevance_score) || 0,
      metadata: {
        billNumber: bill.bill_number,
        status: bill.status,
        chamber: bill.chamber,
        created_at: bill.created_at
      },
      highlights: this.generateHighlights(
        `${bill.title} ${bill.summary || ''}`,
        searchTerms
      )
    }));
  }

  /**
   * Enhanced sponsors search with improved ts_rank scoring
   */
  private async searchSponsorsEnhanced(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const result = await databaseService.executeRawQuery(
      `
      SELECT 
        id,
        name,
        party,
        county,
        chamber,
        bio,
        -- Enhanced ts_rank with multiple factors
        (
          -- Base relevance score
          ts_rank_cd(
            to_tsvector('english', name || ' ' || COALESCE(bio, '')),
            to_tsquery('english', $1),
            32
          ) * 1.0 +
          -- Name match bonus (exact name matches get higher score)
          CASE WHEN to_tsvector('english', name) @@ to_tsquery('english', $1) 
               THEN 0.8 ELSE 0.0 END +
          -- Exact phrase match bonus
          CASE WHEN name ILIKE '%' || $2 || '%' OR bio ILIKE '%' || $2 || '%'
               THEN 0.4 ELSE 0.0 END +
          -- Active sponsor bonus
          CASE WHEN is_active = true THEN 0.2 ELSE 0.0 END
        ) as relevance_score
      FROM sponsors
      WHERE 
        to_tsvector('english', name || ' ' || COALESCE(bio, '')) @@ to_tsquery('english', $1)
        AND ($3::text IS NULL OR chamber = ANY(string_to_array($3, ',')))
        AND ($4::text IS NULL OR county = ANY(string_to_array($4, ',')))
        AND is_active = true
      ORDER BY relevance_score DESC
      LIMIT $5
      `,
      [
        tsQuery,
        query.query,
        query.filters?.chamber?.join(',') || null,
        query.filters?.county?.join(',') || null,
        query.pagination?.limit || 50
      ],
      [],
      'searchSponsorsEnhanced'
    );

    return result.data.map((sponsor: any) => ({
      id: sponsor.id,
      type: 'sponsor' as const,
      title: sponsor.name,
      summary: sponsor.bio || undefined,
      relevanceScore: Number(sponsor.relevance_score) || 0,
      metadata: {
        party: sponsor.party,
        county: sponsor.county,
        chamber: sponsor.chamber
      },
      highlights: this.generateHighlights(
        `${sponsor.name} ${sponsor.bio || ''}`,
        searchTerms
      )
    }));
  }

  /**
   * Enhanced comments search with improved ts_rank scoring
   */
  private async searchCommentsEnhanced(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const result = await databaseService.executeRawQuery(
      `
      SELECT 
        c.id,
        c.content,
        c.bill_id,
        c.created_at,
        u.email as user_name,
        -- Enhanced ts_rank for comments
        (
          ts_rank_cd(
            to_tsvector('english', c.content),
            to_tsquery('english', $1),
            32
          ) * 1.0 +
          -- Exact phrase match bonus
          CASE WHEN c.content ILIKE '%' || $2 || '%' THEN 0.3 ELSE 0.0 END +
          -- Recency bonus for comments
          CASE WHEN c.created_at > NOW() - INTERVAL '30 days' 
               THEN 0.2 ELSE 0.0 END
        ) as relevance_score
      FROM comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE 
        to_tsvector('english', c.content) @@ to_tsquery('english', $1)
        AND ($3::timestamp IS NULL OR c.created_at >= $3)
        AND ($4::timestamp IS NULL OR c.created_at <= $4)
      ORDER BY relevance_score DESC
      LIMIT $5
      `,
      [
        tsQuery,
        query.query,
        query.filters?.dateRange?.start || null,
        query.filters?.dateRange?.end || null,
        query.pagination?.limit || 50
      ],
      [],
      'searchCommentsEnhanced'
    );

    return result.data.map((comment: any) => ({
      id: comment.id,
      type: 'comment' as const,
      title: `Comment by ${comment.user_name}`,
      summary: this.truncateText(comment.content, 200),
      relevanceScore: Number(comment.relevance_score) || 0,
      metadata: {
        bill_id: comment.bill_id,
        userName: comment.user_name,
        created_at: comment.created_at
      },
      highlights: this.generateHighlights(comment.content, searchTerms)
    }));
  }

  /**
   * Expand query with synonyms and related terms
   */
  private async expandQuery(
    originalQuery: string,
    options: QueryExpansionOptions
  ): Promise<string[]> {
    if (!options.enableSynonyms) {
      return [];
    }

    try {
      const result = await databaseService.executeRawQuery(
        `SELECT expand_query_with_synonyms($1, $2) as expanded_query`,
        [originalQuery, options.category || null],
        [],
        'expandQuery'
      );

      if (result.data.length > 0 && (result.data[0] as any)?.expanded_query) {
        return (result.data[0] as any).expanded_query.split(' | ').slice(0, options.maxExpansions);
      }
    } catch (error) {
      logger.warn('Query expansion failed, using original query', { 
        error: (error as Error).message,
        query: originalQuery 
      });
    }

    return [];
  }

  /**
   * Build optimized ts_query combining original and expanded terms
   */
  private buildOptimizedTsQuery(searchTerms: string[], expandedTerms: string[]): string {
    // Start with original terms (higher weight)
    const originalQuery = searchTerms.map(term => `${term}:*`).join(' & ');
    
    if (expandedTerms.length === 0) {
      return originalQuery;
    }

    // Add expanded terms with OR logic (lower weight)
    const expandedQuery = expandedTerms.map(term => `${term}:*`).join(' | ');
    
    // Combine: (original terms) OR (expanded terms with lower weight)
    return `(${originalQuery}) | (${expandedQuery})`;
  }

  /**
   * Apply enhanced relevance scoring with multiple factors
   */
  private applyEnhancedScoring(
    results: SearchResult[],
    originalQuery: string,
    searchTerms: string[]
  ): SearchResult[] {
    const queryLower = originalQuery.toLowerCase();
    
    return results.map(result => {
      let enhancedScore = result.relevanceScore;
      
      // Boost exact matches in title
      if (result.title.toLowerCase().includes(queryLower)) {
        enhancedScore += 0.5;
      }
      
      // Boost results with multiple term matches
      const titleLower = result.title.toLowerCase();
      const summaryLower = (result.summary || '').toLowerCase();
      const matchingTerms = searchTerms.filter(term => 
        titleLower.includes(term) || summaryLower.includes(term)
      );
      
      enhancedScore += (matchingTerms.length / searchTerms.length) * 0.3;
      
      // Boost based on result type priority
      switch (result.type) {
        case 'bill':
          enhancedScore += 0.1; // Bills are most important
          break;
        case 'sponsor':
          enhancedScore += 0.05;
          break;
        case 'comment':
          // Comments get no additional boost
          break;
      }
      
      return {
        ...result,
        relevanceScore: enhancedScore
      };
    });
  }

  /**
   * Log search performance for monitoring and optimization
   */
  private async logSearchPerformance(
    query: string,
    searchType: string,
    resultsCount: number,
    executionTime: number
  ): Promise<void> {
    try {
      await databaseService.executeRawQuery(
        `SELECT log_search_performance($1, $2, $3, $4)`,
        [query, searchType, resultsCount, executionTime],
        [],
        'logSearchPerformance'
      );
    } catch (error) {
      // Don't fail search if logging fails
      logger.warn('Failed to log search performance', { 
        error: (error as Error).message 
      });
    }
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
   * Check if a specific type should be searched based on filters.
   */
  private shouldSearchType(query: SearchQuery, type: 'bills' | 'sponsors' | 'comments'): boolean {
    return !query.filters?.type || query.filters.type.includes(type);
  }

  /**
   * Generate highlighted text snippets for search results
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
   * Truncate text to specified length with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get search performance statistics for monitoring
   */
  async getPerformanceStats(hoursBack: number = 24): Promise<any[]> {
    const result = await databaseService.executeRawQuery(
      `SELECT * FROM get_search_performance_stats($1)`,
      [hoursBack],
      [],
      'getPerformanceStats'
    );

    return result.data;
  }
}