// ============================================================================
// POSTGRESQL FULL-TEXT SEARCH ENGINE - PHASE 2 ENHANCED
// ============================================================================
// Advanced search using PostgreSQL's ts_vector and ts_query with:
// - Weighted search vectors (Title A, Summary B, Content C, Comments D)
// - Advanced ranking using ts_rank_cd() with custom weighting
// - Field-specific search prefixes (title:, sponsor:, status:)
// - Boolean operators (AND, OR, NOT) and parentheses grouping
// - Proximity search for phrase matching
// - Dual-engine integration capabilities

import { SearchQuery, SearchResult } from '../types/search.types';
import { ParsedQuery, searchSyntaxParser } from '../../utils/search-syntax-parser';
import { logger } from '../../../../infrastructure/observability/core/logger';
import { pool } from '../../../../infrastructure/database/pool';

interface QueryExpansionOptions {
  enableSynonyms: boolean;
  enableStemming: boolean;
  category?: string;
  maxExpansions: number;
}

export class PostgreSQLFullTextEngine {
  private readonly defaultExpansionOptions: QueryExpansionOptions = {
    enableSynonyms: true,
    enableStemming: true,
    maxExpansions: 5
  };

  /**
   * Execute enhanced PostgreSQL full-text search with Phase 2 capabilities.
   * Features:
   * - Advanced search syntax parsing (field searches, boolean operators, phrases)
   * - Weighted search vectors (Title A, Summary B, Content C, Comments D)
   * - Advanced ranking using ts_rank_cd() with custom weighting
   * - Field-specific search prefixes (title:, sponsor:, status:)
   * - Boolean operators (AND, OR, NOT) and parentheses grouping
   * - Proximity search for phrase matching
   * - Query expansion with synonyms
   * - Multi-factor ts_rank scoring
   * - Performance monitoring
   * - Automatic fallback strategies
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();
    const results: SearchResult[] = [];

    try {
      // Parse query using advanced syntax parser
      const parsedQuery: ParsedQuery = searchSyntaxParser.parse(query.query);

      // Extract and expand search terms
      const searchTerms = this.extractSearchTerms(query.query);
      const expandedQuery = await this.expandQuery(query.query, this.defaultExpansionOptions);

      // Build optimized ts_query with both original and expanded terms
      const tsQuery = this.buildOptimizedTsQuery(searchTerms, expandedQuery);

      // Build field-specific and boolean query components
      const queryComponents = this.buildAdvancedQueryComponents(parsedQuery, tsQuery);

      // Execute searches in parallel for better performance
      const searchPromises = [];

      if (this.shouldSearchType(query, 'bills')) {
        searchPromises.push(this.searchBillsEnhanced(queryComponents, searchTerms, query));
      }

      if (this.shouldSearchType(query, 'sponsors')) {
        searchPromises.push(this.searchSponsorsEnhanced(queryComponents, searchTerms, query));
      }

      if (this.shouldSearchType(query, 'comments')) {
        searchPromises.push(this.searchCommentsEnhanced(queryComponents, searchTerms, query));
      }

      const allResults = await Promise.all(searchPromises);
      results.push(...allResults.flat());

      // Apply enhanced relevance scoring with Phase 2 ranking
      const scoredResults = this.applyPhase2Scoring(results, parsedQuery, searchTerms);

      // Apply result diversity and quality filtering
      const filteredResults = this.applyResultFiltering(scoredResults, parsedQuery);

      // Log performance metrics
      const executionTime = Date.now() - startTime;
      await this.logSearchPerformance(query.query, 'full-text-phase2', filteredResults.length, executionTime);

      // Sort by enhanced relevance score descending
      return filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error({
        error: (error as Error).message,
        query: query.query,
        executionTime: Date.now() - startTime
      }, 'PostgreSQL full-text search failed');

      // Fallback to empty results on error
      return [];
    }
  }




  /**
   * Enhanced bills search with Phase 2 capabilities
   */
  // TODO: Replace 'any' with proper type definition
  private async searchBillsEnhanced(
    queryComponents: any,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    // Build dynamic WHERE clause from query components
    const whereConditions = [`b.search_vector @@ to_tsquery('english', $1)`];

    // Add field-specific conditions
    if (queryComponents.fieldConditions.length > 0) {
      whereConditions.push(...queryComponents.fieldConditions);
    }

    // Add proximity queries
    if (queryComponents.proximityQueries.length > 0) {
      whereConditions.push(...queryComponents.proximityQueries);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.bill_number,
        b.title,
        b.summary,
        b.status,
        b.chamber,
        b.created_at,
        -- Enhanced ts_rank with Phase 2 weighted vectors
        (
          -- Base relevance score with custom weights (A=title, B=summary, C=content, D=tags)
          ts_rank_cd(b.search_vector, to_tsquery('english', $1), '{0.1, 0.2, 0.4, 1.0}') * 1.0 +
          -- Title match bonus (higher weight for title matches)
          CASE WHEN b.search_vector @@ to_tsquery('english', $2 || ':A')
               THEN 0.5 ELSE 0.0 END +
          -- Exact phrase match bonus
          CASE WHEN b.title ILIKE '%' || $3 || '%' OR b.summary ILIKE '%' || $3 || '%'
               THEN 0.3 ELSE 0.0 END +
          -- Recency bonus (newer bills get slight boost)
          CASE WHEN b.created_at > NOW() - INTERVAL '6 months'
               THEN 0.1 ELSE 0.0 END +
          -- Engagement bonus
          (COALESCE(b.engagement_score, 0) / 1000.0) * 0.2
        ) as relevance_score
      FROM bills b
      WHERE ${whereClause}
        AND ($4::text IS NULL OR b.status = ANY(string_to_array($4, ',')))
        AND ($5::text IS NULL OR b.chamber = ANY(string_to_array($5, ',')))
      ORDER BY relevance_score DESC
      LIMIT $6
      `,
      [
        queryComponents.tsQuery,
        query.query,
        query.query,
        query.filters?.status?.join(',') || null,
        query.filters?.chamber?.join(',') || null,
        query.pagination?.limit || 50
      ]
    );

    // TODO: Replace 'any' with proper type definition
    return result.rows.map((bill: any) => ({
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
   * Enhanced sponsors search with Phase 2 capabilities
   */
  // TODO: Replace 'any' with proper type definition
  private async searchSponsorsEnhanced(
    queryComponents: any,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    // Build dynamic WHERE clause from query components
    const whereConditions = [`s.search_vector @@ to_tsquery('english', $1)`];

    // Add field-specific conditions
    if (queryComponents.fieldConditions.length > 0) {
      whereConditions.push(...queryComponents.fieldConditions);
    }

    // Add proximity queries
    if (queryComponents.proximityQueries.length > 0) {
      whereConditions.push(...queryComponents.proximityQueries);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.name,
        s.party,
        s.county,
        s.chamber,
        s.bio,
        -- Enhanced ts_rank with Phase 2 weighted vectors
        (
          -- Base relevance score with custom weights
          ts_rank_cd(s.search_vector, to_tsquery('english', $1), '{0.1, 0.2, 0.4, 1.0}') * 1.0 +
          -- Name match bonus (exact name matches get higher score)
          CASE WHEN s.search_vector @@ to_tsquery('english', $2 || ':A')
               THEN 0.8 ELSE 0.0 END +
          -- Exact phrase match bonus
          CASE WHEN s.name ILIKE '%' || $3 || '%' OR s.bio ILIKE '%' || $3 || '%'
               THEN 0.4 ELSE 0.0 END +
          -- Active sponsor bonus
          CASE WHEN s.is_active = true THEN 0.2 ELSE 0.0 END
        ) as relevance_score
      FROM sponsors s
      WHERE ${whereClause}
        AND ($4::text IS NULL OR s.chamber = ANY(string_to_array($4, ',')))
        AND ($5::text IS NULL OR s.county = ANY(string_to_array($5, ',')))
        AND s.is_active = true
      ORDER BY relevance_score DESC
      LIMIT $6
      `,
      [
        queryComponents.tsQuery,
        query.query,
        query.query,
        query.filters?.chamber?.join(',') || null,
        query.filters?.county?.join(',') || null,
        query.pagination?.limit || 50
      ]
    );

    // TODO: Replace 'any' with proper type definition
    return result.rows.map((sponsor: any) => ({
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
   * Enhanced comments search with Phase 2 capabilities
   */
  // TODO: Replace 'any' with proper type definition
  private async searchCommentsEnhanced(
    queryComponents: any,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    // Build dynamic WHERE clause from query components
    const whereConditions = [`c.search_vector @@ to_tsquery('english', $1)`];

    // Add field-specific conditions
    if (queryComponents.fieldConditions.length > 0) {
      whereConditions.push(...queryComponents.fieldConditions);
    }

    // Add proximity queries
    if (queryComponents.proximityQueries.length > 0) {
      whereConditions.push(...queryComponents.proximityQueries);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.content,
        c.bill_id,
        c.created_at,
        u.email as user_name,
        -- Enhanced ts_rank for comments with Phase 2 weighted vectors
        (
          ts_rank_cd(c.search_vector, to_tsquery('english', $1), '{0.1, 0.2, 0.4, 1.0}') * 1.0 +
          -- Exact phrase match bonus
          CASE WHEN c.content ILIKE '%' || $2 || '%' THEN 0.3 ELSE 0.0 END +
          -- Recency bonus for comments
          CASE WHEN c.created_at > NOW() - INTERVAL '30 days'
               THEN 0.2 ELSE 0.0 END
        ) as relevance_score
      FROM comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE ${whereClause}
        AND ($3::timestamp IS NULL OR c.created_at >= $3)
        AND ($4::timestamp IS NULL OR c.created_at <= $4)
      ORDER BY relevance_score DESC
      LIMIT $5
      `,
      [
        queryComponents.tsQuery,
        query.query,
        query.filters?.dateRange?.start || null,
        query.filters?.dateRange?.end || null,
        query.pagination?.limit || 50
      ]
    );

    // TODO: Replace 'any' with proper type definition
    return result.rows.map((comment: any) => ({
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
      const result = await pool.query(
        `SELECT expand_query_with_synonyms($1, $2) as expanded_query`,
        [originalQuery, options.category || null]
      );

      // TODO: Replace 'any' with proper type definition
      if (result.rows.length > 0) {
        const firstResult = result.rows[0] as Record<string, unknown>;
        if (firstResult?.expanded_query && typeof firstResult.expanded_query === 'string') {
          return firstResult.expanded_query.split(' | ').slice(0, options.maxExpansions);
        }
      }
    } catch (error) {
      logger.warn({
        error: (error as Error).message,
        query: originalQuery
      }, 'Query expansion failed, using original query');
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
   * Log search performance for monitoring and optimization
   */
  private async logSearchPerformance(
    query: string,
    searchType: string,
    resultsCount: number,
    executionTime: number
  ): Promise<void> {
    try {
      await pool.query(
        `SELECT log_search_performance($1, $2, $3, $4)`,
        [query, searchType, resultsCount, executionTime]
      );
    } catch (error) {
      // Don't fail search if logging fails
      logger.warn({
        error: (error as Error).message
      }, 'Failed to log search performance');
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
   * Build advanced query components from parsed query
   */
  private buildAdvancedQueryComponents(parsedQuery: ParsedQuery, baseTsQuery: string): {
    tsQuery: string;
    fieldConditions: string[];
    booleanQuery: string;
    proximityQueries: string[];
  } {
    const components = {
      tsQuery: baseTsQuery,
      fieldConditions: [] as string[],
      booleanQuery: '',
      proximityQueries: [] as string[],
    };

    // Handle field-specific searches
    for (const [field, value] of Object.entries(parsedQuery.fieldQueries)) {
      if (value) {
        switch (field) {
          case 'title':
            components.fieldConditions.push(`search_vector @@ to_tsquery('english', '${value}:A')`);
            break;
          case 'sponsor':
            components.fieldConditions.push(`sponsors.name ILIKE '%${value}%'`);
            break;
          case 'status':
            components.fieldConditions.push(`bills.status = '${value}'`);
            break;
          case 'content':
            components.fieldConditions.push(`search_vector @@ to_tsquery('english', '${value}:C')`);
            break;
          case 'comments':
            components.fieldConditions.push(`search_vector @@ to_tsquery('english', '${value}:D')`);
            break;
        }
      }
    }

    // Handle exact phrases with proximity
    for (const phrase of parsedQuery.exactPhrases) {
      components.proximityQueries.push(`search_vector @@ phraseto_tsquery('english', '${phrase}')`);
    }

    // Build boolean query from operators
    if (parsedQuery.metadata.hasBooleanOperators) {
      components.booleanQuery = this.buildBooleanQuery(parsedQuery);
    }

    return components;
  }

  /**
   * Build boolean query from parsed operators
   */
  private buildBooleanQuery(parsedQuery: ParsedQuery): string {
    // For now, use PostgreSQL's built-in boolean query parsing
    // In a more advanced implementation, we could construct complex boolean expressions
    const terms = [];

    if (parsedQuery.traditionalQuery) {
      terms.push(parsedQuery.traditionalQuery);
    }

    for (const exclusion of parsedQuery.exclusions) {
      terms.push(`NOT ${exclusion}`);
    }

    return terms.join(' AND ');
  }

  /**
   * Apply Phase 2 enhanced scoring with configurable weights
   */
  private applyPhase2Scoring(
    results: SearchResult[],
    parsedQuery: ParsedQuery,
    searchTerms: string[]
  ): SearchResult[] {
    const weights = parsedQuery.metadata;

    return results.map(result => {
      let enhancedScore = result.relevanceScore;

      // Apply semantic vs traditional weight balance
      enhancedScore *= weights.semanticWeight + weights.traditionalWeight;

      // Boost exact matches in title
      if (result.title.toLowerCase().includes(parsedQuery.originalQuery.toLowerCase())) {
        enhancedScore += 0.5;
      }

      // Boost results with multiple term matches
      const titleLower = result.title.toLowerCase();
      const summaryLower = (result.summary || '').toLowerCase();
      const matchingTerms = searchTerms.filter(term =>
        titleLower.includes(term) || summaryLower.includes(term)
      );

      enhancedScore += (matchingTerms.length / searchTerms.length) * 0.3;

      // Apply result type priority
      switch (result.type) {
        case 'bill':
          enhancedScore += 0.1;
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
   * Apply result diversity and quality filtering
   */
  private applyResultFiltering(results: SearchResult[], parsedQuery: ParsedQuery): SearchResult[] {
    let filtered = results;

    // Remove excluded terms
    if (parsedQuery.exclusions.length > 0) {
      filtered = filtered.filter(result => {
        const content = `${result.title} ${result.summary || ''}`.toLowerCase();
        return !parsedQuery.exclusions.some((exclusion: string) =>
          content.includes(exclusion.toLowerCase())
        );
      });
    }

    // Apply diversity filtering (limit results per type)
    const maxPerType = 10;
    const typeCounts = new Map<string, number>();
    filtered = filtered.filter(result => {
      const count = typeCounts.get(result.type) || 0;
      if (count >= maxPerType) return false;
      typeCounts.set(result.type, count + 1);
      return true;
    });

    // Apply quality threshold
    const minScore = 0.01;
    filtered = filtered.filter(result => result.relevanceScore >= minScore);

    return filtered;
  }

  /**
   * Get search performance statistics for monitoring
   */
  // TODO: Replace 'any' with proper type definition
  async getPerformanceStats(hoursBack: number = 24): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT * FROM get_search_performance_stats($1)`,
      [hoursBack]
    );

    return result.rows;
  }
}


