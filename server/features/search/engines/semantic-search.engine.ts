// ============================================================================
// SEMANTIC SEARCH ENGINE - AI-Powered Vector Similarity Search
// ============================================================================
// Performs vector similarity search using cosine similarity with hybrid ranking
// Combines semantic search with traditional search for optimal results

import { database } from '@shared/database';
import { bills, sponsors } from '@shared/schema';
import { comments } from '@shared/schema';
import { content_embeddings, search_queries, SearchQuery, QueryType } from '@shared/schema/search_system';
import { embeddingService } from './embedding-service';
import { eq, or, sql, desc } from 'drizzle-orm';
import { logger } from '@shared/core';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: {
    contentType?: ('bill' | 'sponsor' | 'comment')[];
    status?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    county?: string;
    constituency?: string;
  };
  hybrid?: boolean; // Enable hybrid search (semantic + traditional)
  semanticWeight?: number; // Weight for semantic score (0-1)
  traditionalWeight?: number; // Weight for traditional score (0-1)
}

export interface SearchResult {
  id: string;
  contentType: 'bill' | 'sponsor' | 'comment';
  title: string;
  summary?: string;
  content: string;
  relevanceScore: number;
  semanticScore?: number;
  traditionalScore?: number;
  metadata: {
    status?: string;
    county?: string;
    constituency?: string;
    createdAt: Date;
    updatedAt?: Date;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  searchType: QueryType;
  processingTimeMs: number;
  hasMore: boolean;
}

export class SemanticSearchEngine {
  private readonly defaultLimit = 20;
  private readonly maxLimit = 100;

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Perform semantic search with optional hybrid ranking
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      limit = this.defaultLimit,
      offset = 0,
      filters = {},
      hybrid = true,
      semanticWeight = 0.7,
      traditionalWeight = 0.3,
    } = options;

    try {
      logger.debug('Starting semantic search', {
        query,
        limit,
        offset,
        hybrid,
        filters: Object.keys(filters),
      });

      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Log the search query
      const searchQueryRecord = await this.logSearchQuery({
        queryText: query,
        queryType: hybrid ? QueryType.HYBRID : QueryType.SEMANTIC,
        searchFilters: filters,
        embedding: queryEmbedding.embedding,
        processingTimeMs: 0, // Will update after search completes
      });

      let results: SearchResult[] = [];
      let totalCount = 0;

      if (hybrid) {
        // Perform hybrid search
        const hybridResults = await this.performHybridSearch(
          query,
          queryEmbedding.embedding,
          { ...options, semanticWeight, traditionalWeight }
        );
        results = hybridResults.results;
        totalCount = hybridResults.totalCount;
      } else {
        // Perform pure semantic search
        const semanticResults = await this.performSemanticSearch(
          queryEmbedding.embedding,
          options
        );
        results = semanticResults.results;
        totalCount = semanticResults.totalCount;
      }

      const processingTimeMs = Date.now() - startTime;

      // Update search query with processing time
      await database
        .update(search_queries)
        .set({
          processingTimeMs,
          totalResults: totalCount,
          relevantResults: results.length,
        })
        .where(eq(search_queries.id, searchQueryRecord.id));

      const response: SearchResponse = {
        results,
        totalCount,
        query,
        searchType: hybrid ? QueryType.HYBRID : QueryType.SEMANTIC,
        processingTimeMs,
        hasMore: (offset + limit) < totalCount,
      };

      logger.debug('Semantic search completed', {
        query,
        resultCount: results.length,
        totalCount,
        processingTimeMs,
        searchType: response.searchType,
      });

      return response;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        processingTimeMs,
      });
      throw error;
    }
  }

  /**
   * Perform pure semantic search using vector similarity
   */
  private async performSemanticSearch(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const { limit = this.defaultLimit, offset = 0, filters = {} } = options;

    // For now, use a simplified approach - get all embeddings and calculate similarity in JS
    // In production, you'd want to use PostgreSQL's vector extension for better performance
    let embeddingsQuery = database
      .select({
        id: content_embeddings.contentId,
        contentType: content_embeddings.contentType,
        title: content_embeddings.contentTitle,
        summary: content_embeddings.contentSummary,
        embedding: content_embeddings.embedding,
        createdAt: content_embeddings.createdAt,
        updatedAt: content_embeddings.updatedAt,
      })
      .from(content_embeddings)
      .where(eq(content_embeddings.processingStatus, 'completed'));

    // Apply content type filters
    if (filters.contentType?.length) {
      embeddingsQuery = embeddingsQuery.where(sql`${content_embeddings.contentType} = ANY(${filters.contentType})`);
    }

    const embeddings = await embeddingsQuery;

    // Calculate cosine similarity for each embedding
    const resultsWithScores = embeddings.map(emb => ({
      ...emb,
      semanticScore: this.cosineSimilarity(queryEmbedding, emb.embedding),
    }));

    // Sort by similarity score (descending)
    resultsWithScores.sort((a, b) => b.semanticScore - a.semanticScore);

    // Apply pagination
    const paginatedResults = resultsWithScores.slice(offset, offset + limit);

    // Enrich results with additional metadata
    const results = await this.enrichSearchResults(paginatedResults, filters);

    return { results, totalCount: resultsWithScores.length };
  }

  /**
   * Perform hybrid search combining semantic and traditional search
   */
  private async performHybridSearch(
    query: string,
    queryEmbedding: number[],
    options: SearchOptions & { semanticWeight: number; traditionalWeight: number }
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const { limit = this.defaultLimit, offset = 0, filters = {}, semanticWeight, traditionalWeight } = options;

    // Get semantic results
    const semanticResults = await this.performSemanticSearch(queryEmbedding, { ...options, limit: limit * 2 });

    // Get traditional search results
    const traditionalResults = await this.performTraditionalSearch(query, { ...options, limit: limit * 2 });

    // Combine and rank results using hybrid scoring
    const combinedResults = this.combineHybridResults(
      semanticResults.results,
      traditionalResults.results,
      semanticWeight,
      traditionalWeight
    );

    // Apply final filtering, sorting, and pagination
    const filteredResults = this.applyFilters(combinedResults, filters);
    const sortedResults = filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      totalCount: filteredResults.length,
    };
  }

  /**
   * Perform traditional text search (fallback/hybrid component)
   */
  private async performTraditionalSearch(
    query: string,
    options: SearchOptions
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const { limit = this.defaultLimit, filters = {} } = options;

    // Simple text search implementation
    // In production, this could use PostgreSQL full-text search or Elasticsearch
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

    if (searchTerms.length === 0) {
      return { results: [], totalCount: 0 };
    }

    const results: SearchResult[] = [];

    // Search bills
    if (!filters.contentType || filters.contentType.includes('bill')) {
      const billResults = await database
        .select({
          id: bills.id,
          title: bills.title,
          summary: bills.summary,
          content: sql<string>`concat(${bills.title}, ' ', ${bills.summary}, ' ', ${bills.full_text})`,
          status: bills.status,
          county: bills.affected_counties,
          createdAt: bills.created_at,
        })
        .from(bills)
        .where(
          or(
            ...searchTerms.map(term => sql`${bills.title} ILIKE ${`%${term}%`}`),
            ...searchTerms.map(term => sql`${bills.summary} ILIKE ${`%${term}%`}`),
            ...searchTerms.map(term => sql`${bills.full_text} ILIKE ${`%${term}%`}`)
          )
        )
        .limit(limit);

      results.push(...billResults.map(bill => ({
        id: bill.id,
        contentType: 'bill' as const,
        title: bill.title || '',
        summary: bill.summary || undefined,
        content: bill.content,
        relevanceScore: 0, // Will be calculated in hybrid scoring
        traditionalScore: this.calculateTraditionalScore(query, bill.content),
        metadata: {
          status: bill.status,
          county: bill.county?.[0],
          createdAt: bill.createdAt,
        },
      })));
    }

    // Search sponsors
    if (!filters.contentType || filters.contentType.includes('sponsor')) {
      const sponsorResults = await database
        .select({
          id: sponsors.id,
          name: sponsors.name,
          bio: sponsors.bio,
          content: sql<string>`concat(${sponsors.name}, ' ', ${sponsors.bio})`,
          county: sponsors.county,
          createdAt: sponsors.created_at,
        })
        .from(sponsors)
        .where(
          or(
            ...searchTerms.map(term => sql`${sponsors.name} ILIKE ${`%${term}%`}`),
            ...searchTerms.map(term => sql`${sponsors.bio} ILIKE ${`%${term}%`}`)
          )
        )
        .limit(limit);

      results.push(...sponsorResults.map(sponsor => ({
        id: sponsor.id,
        contentType: 'sponsor' as const,
        title: sponsor.name,
        summary: sponsor.bio || undefined,
        content: sponsor.content,
        relevanceScore: 0,
        traditionalScore: this.calculateTraditionalScore(query, sponsor.content),
        metadata: {
          county: sponsor.county,
          createdAt: sponsor.createdAt,
        },
      })));
    }

    // Search comments
    if (!filters.contentType || filters.contentType.includes('comment')) {
      const commentResults = await database
        .select({
          id: comments.id,
          content: comments.comment_text,
          userCounty: comments.user_county,
          createdAt: comments.created_at,
        })
        .from(comments)
        .where(
          or(
            ...searchTerms.map(term => sql`${comments.comment_text} ILIKE ${`%${term}%`}`)
          )
        )
        .limit(limit);

      results.push(...commentResults.map(comment => ({
        id: comment.id,
        contentType: 'comment' as const,
        title: 'Comment',
        content: comment.content,
        relevanceScore: 0,
        traditionalScore: this.calculateTraditionalScore(query, comment.content),
        metadata: {
          county: comment.userCounty,
          createdAt: comment.createdAt,
        },
      })));
    }

    return { results, totalCount: results.length };
  }

  /**
   * Combine semantic and traditional search results with weighted scoring
   */
  private combineHybridResults(
    semanticResults: SearchResult[],
    traditionalResults: SearchResult[],
    semanticWeight: number,
    traditionalWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results
    semanticResults.forEach(result => {
      const key = `${result.contentType}:${result.id}`;
      resultMap.set(key, {
        ...result,
        relevanceScore: (result.semanticScore || 0) * semanticWeight,
      });
    });

    // Add/merge traditional results
    traditionalResults.forEach(result => {
      const key = `${result.contentType}:${result.id}`;
      const existing = resultMap.get(key);

      if (existing) {
        // Merge results
        existing.relevanceScore += (result.traditionalScore || 0) * traditionalWeight;
        existing.traditionalScore = result.traditionalScore;
      } else {
        // Add new result
        resultMap.set(key, {
          ...result,
          relevanceScore: (result.traditionalScore || 0) * traditionalWeight,
        });
      }
    });

    return Array.from(resultMap.values());
  }

  /**
   * Calculate traditional text matching score
   */
  private calculateTraditionalScore(query: string, text: string): number {
    if (!text) return 0;

    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const textLower = text.toLowerCase();

    let score = 0;
    for (const term of queryTerms) {
      // Exact matches get higher score
      const exactMatches = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
      score += exactMatches * 0.5;

      // Partial matches get lower score
      const partialMatches = (textLower.match(new RegExp(term, 'g')) || []).length;
      score += (partialMatches - exactMatches) * 0.2;
    }

    // Normalize score
    return Math.min(score / queryTerms.length, 1);
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(results: SearchResult[], filters: SearchOptions['filters']): SearchResult[] {
    return results.filter(result => {
      // Content type filter
      if (filters?.contentType && !filters.contentType.includes(result.contentType)) {
        return false;
      }

      // Status filter
      if (filters?.status && result.metadata.status && !filters.status.includes(result.metadata.status)) {
        return false;
      }

      // Date range filter
      if (filters?.dateRange) {
        const createdAt = result.metadata.createdAt;
        if (filters.dateRange.start && createdAt < filters.dateRange.start) return false;
        if (filters.dateRange.end && createdAt > filters.dateRange.end) return false;
      }

      // Geographic filters
      if (filters?.county && result.metadata.county !== filters.county) return false;
      if (filters?.constituency && result.metadata.constituency !== filters.constituency) return false;

      return true;
    });
  }

  /**
   * Enrich search results with additional metadata
   */
  private async enrichSearchResults(
    semanticResults: any[],
    filters: SearchOptions['filters']
  ): Promise<SearchResult[]> {
    // This is a simplified version. In production, you might want to batch these queries
    const enrichedResults: SearchResult[] = [];

    for (const result of semanticResults) {
      let metadata: SearchResult['metadata'];

      switch (result.contentType) {
        case 'bill':
          const bill = await database
            .select({
              status: bills.status,
              county: sql<string>`${bills.affected_counties}[1]`,
              createdAt: bills.created_at,
              updatedAt: bills.updated_at,
            })
            .from(bills)
            .where(eq(bills.id, result.id))
            .limit(1);
          metadata = bill[0] ? {
            status: bill[0].status,
            county: bill[0].county,
            createdAt: bill[0].createdAt,
            updatedAt: bill[0].updatedAt,
          } : {
            createdAt: result.createdAt,
          };
          break;

        case 'sponsor':
          const sponsor = await database
            .select({
              county: sponsors.county,
              createdAt: sponsors.created_at,
              updatedAt: sponsors.updated_at,
            })
            .from(sponsors)
            .where(eq(sponsors.id, result.id))
            .limit(1);
          metadata = sponsor[0] ? {
            county: sponsor[0].county,
            createdAt: sponsor[0].createdAt,
            updatedAt: sponsor[0].updatedAt,
          } : {
            createdAt: result.createdAt,
          };
          break;

        case 'comment':
          const comment = await database
            .select({
              userCounty: comments.user_county,
              createdAt: comments.created_at,
              updatedAt: comments.updated_at,
            })
            .from(comments)
            .where(eq(comments.id, result.id))
            .limit(1);
          metadata = comment[0] ? {
            county: comment[0].userCounty,
            createdAt: comment[0].createdAt,
            updatedAt: comment[0].updatedAt,
          } : {
            createdAt: result.createdAt,
          };
          break;

        default:
          metadata = { createdAt: result.createdAt };
      }

      enrichedResults.push({
        id: result.id,
        contentType: result.contentType,
        title: result.title || '',
        summary: result.summary,
        content: '', // Not needed for display
        relevanceScore: result.semanticScore || 0,
        semanticScore: result.semanticScore,
        metadata,
      });
    }

    return enrichedResults;
  }

  /**
   * Log search query for analytics
   */
  private async logSearchQuery(data: {
    queryText: string;
    queryType: QueryType;
    searchFilters: any;
    embedding: number[];
    processingTimeMs: number;
  }): Promise<SearchQuery> {
    const [query] = await database
      .insert(search_queries)
      .values(data)
      .returning();

    return query;
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(date: Date): Promise<any> {
    // Implementation for search analytics aggregation
    // This would typically be run as a scheduled job
    logger.warn('Search analytics aggregation not implemented');
    return {};
  }
}

// Export singleton instance
export const semanticSearchEngine = new SemanticSearchEngine();
