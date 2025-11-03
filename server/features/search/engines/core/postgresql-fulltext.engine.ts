// ============================================================================
// POSTGRESQL FULL-TEXT SEARCH ENGINE
// ============================================================================
// Advanced search using PostgreSQL's ts_vector and ts_query for best relevance

import { repositoryFactory } from '../../../../infrastructure/database/repositories/repository-factory.js';
import { SearchQuery, SearchResult } from '../types/search.types.js';

export class PostgreSQLFullTextEngine {
  private searchRepository = repositoryFactory.getSearchRepository();

  /**
   * Execute PostgreSQL full-text search with ts_vector and ts_query.
   * This provides the best search quality with relevance ranking.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerms = this.extractSearchTerms(query.query);

    // Build PostgreSQL ts_query with prefix matching for partial word support
    const tsQuery = searchTerms.map(term => `${term}:*`).join(' & ');

    // Execute searches in parallel for better performance
    const searchPromises = [];

    if (this.shouldSearchType(query, 'bills')) {
      searchPromises.push(this.searchRepository.searchBillsFullText(tsQuery, searchTerms, query));
    }

    if (this.shouldSearchType(query, 'sponsors')) {
      searchPromises.push(this.searchRepository.searchSponsorsFullText(tsQuery, searchTerms, query));
    }

    if (this.shouldSearchType(query, 'comments')) {
      searchPromises.push(this.searchRepository.searchCommentsFullText(tsQuery, searchTerms, query));
    }

    const allResults = await Promise.all(searchPromises);
    results.push(...allResults.flat());

    // Sort by relevance score descending
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
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
}