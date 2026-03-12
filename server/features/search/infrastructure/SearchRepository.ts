import { User } from '@server/features/users/domain/entities/user';
/**
 * Search Repository - Domain-Specific Repository
 * 
 * Provides data access operations for search queries and saved searches.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { searchQueries, savedSearches } from '@server/infrastructure/schema/search_system';
import { sql, desc, eq, and } from 'drizzle-orm';
import { bills } from '@server/infrastructure/schema/foundation';
import { db } from '@server/infrastructure/database';

/**
 * Search query entity type (inferred from schema)
 */
export type SearchQuery = typeof searchQueries.$inferSelect;

/**
 * Saved search entity type (inferred from schema)
 */
export type SavedSearch = typeof savedSearches.$inferSelect;

/**
 * New search query data type (for inserts)
 */
export type InsertSearchQuery = typeof searchQueries.$inferInsert;

/**
 * New saved search data type (for inserts)
 */
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: Record<string, unknown>;
}

/**
 * Popular search item
 */
export interface PopularSearchItem {
  query: string;
  searchCount: number;
  lastSearched: string;
  avgResults: number;
}

/**
 * Search metadata
 */
export interface SearchMetadata {
  totalDocuments: number;
  lastIndexed: string;
  availableFilters: {
    billStatus: string[];
    categories: string[];
    locations: string[];
    tags: string[];
  };
  searchTips: string[];
}

/**
 * Search repository providing domain-specific data access methods.
 * 
 * DESIGN PRINCIPLES:
 * - Domain-specific methods (NOT generic CRUD)
 * - Methods reflect business operations
 * - Example: recordSearch(), getHistory(), getPopularSearches()
 * - Returns Result types for explicit error handling
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new SearchRepository();
 * 
 * // Record a search
 * const result = await repository.recordSearch({
 *   queryText: 'climate change',
 *   resultCount: 42,
 *   userId: 'user-uuid'
 * });
 * 
 * // Get search history
 * const historyResult = await repository.getHistory('user-uuid', 10);
 * if (historyResult.isOk()) {
 *   console.log('Found', historyResult.value.length, 'searches');
 * }
 * ```
 */
export class SearchRepository extends BaseRepository<SearchQuery> {
  constructor() {
    super({
      entityName: 'SearchQuery',
      enableCache: true,
      cacheTTL: 180, // 3 minutes (high volatility - search patterns change frequently)
      enableLogging: true,
    });
  }

  /**
   * Record a search query
   * 
   * @param data - Search query data
   * @returns Result containing void (success) or Error
   */
  async recordSearch(data: {
    queryText: string;
    resultCount: number;
    userId?: string;
    sessionId?: string;
    filters?: Record<string, unknown>;
    processingTimeMs?: number;
  }): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (db) => {
        await db.insert(searchQueries).values({
          user_id: data.userId ?? null,
          session_id: data.sessionId ?? null,
          query_text: data.queryText,
          search_filters: data.filters ?? {},
          total_results: data.resultCount,
          processing_time_ms: data.processingTimeMs ?? null,
        });
      },
      data.userId ? [`search:history:${data.userId}`] : []
    );
  }


  /**
   * Get search history for a user
   * 
   * @param userId - User ID (optional for anonymous searches)
   * @param limit - Maximum number of results
   * @returns Result containing array of search history items
   */
  async getHistory(
    userId: string | undefined,
    limit: number
  ): Promise<Result<SearchHistoryItem[], Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = userId ? eq(searchQueries.user_id, userId) : undefined;

        const rows = await db
          .select({
            id: searchQueries.id,
            query: searchQueries.query_text,
            timestamp: searchQueries.created_at,
            resultCount: searchQueries.total_results,
            filters: searchQueries.search_filters,
          })
          .from(searchQueries)
          .where(conditions)
          .orderBy(desc(searchQueries.created_at))
          .limit(limit);

        return rows.map(row => ({
          id: row.id,
          query: row.query,
          timestamp: row.timestamp.toISOString(),
          resultCount: row.resultCount,
          filters: row.filters as Record<string, unknown> | undefined,
        }));
      },
      userId ? `search:history:${userId}` : undefined
    );
  }

  /**
   * Clear search history
   * 
   * @param userId - User ID (optional - if not provided, clears all history)
   * @returns Result containing void (success) or Error
   */
  async clearHistory(userId?: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (db) => {
        if (userId) {
          await db.delete(searchQueries).where(eq(searchQueries.user_id, userId));
        } else {
          await db.delete(searchQueries);
        }
      },
      userId ? [`search:history:${userId}`] : ['search:*']
    );
  }

  /**
   * Get recent searches
   * 
   * @param limit - Maximum number of results
   * @param userId - User ID (optional)
   * @returns Result containing array of recent searches
   */
  async getRecentSearches(
    limit: number,
    userId?: string
  ): Promise<Result<SearchHistoryItem[], Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = userId ? eq(searchQueries.user_id, userId) : undefined;

        const rows = await db
          .select({
            id: searchQueries.id,
            query: searchQueries.query_text,
            timestamp: searchQueries.created_at,
            resultCount: searchQueries.total_results,
          })
          .from(searchQueries)
          .where(conditions)
          .orderBy(desc(searchQueries.created_at))
          .limit(limit);

        return rows.map(row => ({
          id: row.id,
          query: row.query,
          timestamp: row.timestamp.toISOString(),
          resultCount: row.resultCount,
        }));
      },
      userId ? `search:recent:${userId}` : undefined
    );
  }

  /**
   * Get popular searches
   * 
   * @param limit - Maximum number of results
   * @param days - Number of days to look back (default: 30)
   * @returns Result containing array of popular searches
   */
  async getPopularSearches(
    limit: number,
    days: number = 30
  ): Promise<Result<PopularSearchItem[], Error>> {
    return this.executeRead(
      async (db) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const rows = await db.execute(sql`
          SELECT
            query_text,
            count(*) as search_count,
            max(created_at) as last_searched,
            avg(total_results) as avg_results
          FROM search_queries
          WHERE created_at >= ${cutoff.toISOString()}
          GROUP BY query_text
          ORDER BY search_count DESC
          LIMIT ${limit}
        `) as unknown as Array<{
          query_text: string;
          search_count: string;
          last_searched: string;
          avg_results: string;
        }>;

        return rows.map(row => ({
          query: row.query_text,
          searchCount: Number(row.search_count),
          lastSearched: row.last_searched,
          avgResults: Math.round(Number(row.avg_results) || 0),
        }));
      },
      `search:popular:${days}d`
    );
  }


  /**
   * Save a search for later use
   * 
   * @param data - Saved search data
   * @returns Result containing created saved search
   */
  async saveSearch(data: {
    userId?: string;
    name: string;
    description?: string;
    query: Record<string, unknown>;
    filters?: Record<string, unknown>;
    isPublic?: boolean;
    tags?: string[];
  }): Promise<Result<SavedSearch, Error>> {
    return this.executeWrite(
      async (db) => {
        const [saved] = await db
          .insert(savedSearches)
          .values({
            user_id: data.userId ?? null,
            name: data.name,
            description: data.description ?? null,
            query: data.query,
            filters: data.filters ?? {},
            is_public: data.isPublic ?? false,
            tags: data.tags ?? [],
          })
          .returning();

        return saved;
      },
      data.userId ? [`search:saved:${data.userId}`] : []
    );
  }

  /**
   * Get saved searches for a user
   * 
   * @param userId - User ID (optional - if not provided, returns public searches)
   * @returns Result containing array of saved searches
   */
  async getSavedSearches(userId?: string): Promise<Result<SavedSearch[], Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = userId
          ? eq(savedSearches.user_id, userId)
          : eq(savedSearches.is_public, true);

        const rows = await db
          .select()
          .from(savedSearches)
          .where(conditions)
          .orderBy(desc(savedSearches.created_at));

        return rows;
      },
      userId ? `search:saved:${userId}` : 'search:saved:public'
    );
  }

  /**
   * Delete a saved search
   * 
   * @param id - Saved search ID
   * @param userId - User ID (optional - for authorization)
   * @returns Result containing boolean (true if deleted)
   */
  async deleteSavedSearch(id: string, userId?: string): Promise<Result<boolean, Error>> {
    return this.executeWrite(
      async (db) => {
        const conditions = userId
          ? and(eq(savedSearches.id, id), eq(savedSearches.user_id, userId))
          : eq(savedSearches.id, id);

        const result = await db
          .delete(savedSearches)
          .where(conditions)
          .returning({ id: savedSearches.id });

        return result.length > 0;
      },
      userId ? [`search:saved:${userId}`, `search:saved:${id}`] : [`search:saved:${id}`]
    );
  }

  /**
   * Get and update a saved search (increments use count)
   * 
   * @param id - Saved search ID
   * @param userId - User ID (optional - for authorization)
   * @returns Result containing Maybe<query object>
   */
  async getAndUpdateSavedSearch(
    id: string,
    userId?: string
  ): Promise<Result<Maybe<Record<string, unknown>>, Error>> {
    return this.executeWrite(
      async (db) => {
        const conditions = userId
          ? and(eq(savedSearches.id, id), eq(savedSearches.user_id, userId))
          : eq(savedSearches.id, id);

        const rows = await db
          .select({ query: savedSearches.query })
          .from(savedSearches)
          .where(conditions)
          .limit(1);

        if (rows.length === 0) return null;

        await db
          .update(savedSearches)
          .set({
            use_count: sql`use_count + 1`,
            last_executed_at: new Date(),
            updated_at: new Date(),
          })
          .where(conditions);

        return rows[0].query as Record<string, unknown>;
      },
      userId ? [`search:saved:${userId}`, `search:saved:${id}`] : [`search:saved:${id}`]
    );
  }


  /**
   * Get search metadata (total documents, filters, tips)
   * 
   * @returns Result containing search metadata
   */
  async getMetadata(): Promise<Result<SearchMetadata, Error>> {
    return this.executeRead(
      async (db) => {
        const [countResult] = await db.execute(sql`
          SELECT count(*) as total, max(updated_at) as last_updated
          FROM bills
        `) as unknown as Array<{ total: string; last_updated: string | null }>;

        const statusRows = await db.execute(sql`
          SELECT DISTINCT status FROM bills WHERE status IS NOT NULL ORDER BY status
        `) as unknown as Array<{ status: string }>;

        const categoryRows = await db.execute(sql`
          SELECT DISTINCT category FROM bills WHERE category IS NOT NULL ORDER BY category
        `) as unknown as Array<{ category: string }>;

        const tagRows = await db.execute(sql`
          SELECT DISTINCT unnest(tags) as tag FROM bills WHERE tags IS NOT NULL ORDER BY tag LIMIT 50
        `) as unknown as Array<{ tag: string }>;

        return {
          totalDocuments: Number(countResult?.total ?? 0),
          lastIndexed: countResult?.last_updated ?? new Date().toISOString(),
          availableFilters: {
            billStatus: statusRows.map(r => r.status),
            categories: categoryRows.map(r => r.category),
            locations: ['national', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'],
            tags: tagRows.map(r => r.tag),
          },
          searchTips: [
            'Use quotes for exact phrase matching: "climate change"',
            'Exclude terms with minus: healthcare -insurance',
            'Filter by category using the sidebar filters',
            'Sort results by relevance, date, or title',
          ],
        };
      },
      'search:metadata'
    );
  }

  /**
   * Get related searches based on query
   * 
   * @param query - Search query
   * @param limit - Maximum number of results (default: 5)
   * @returns Result containing array of related searches
   */
  async getRelatedSearches(
    query: string,
    limit: number = 5
  ): Promise<Result<Array<{ text: string; type: string; score: number }>, Error>> {
    return this.executeRead(
      async (db) => {
        if (query.length < 2) return [];

        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return [];

        const likePattern = `%${words[0]}%`;

        const rows = await db.execute(sql`
          SELECT query_text, count(*) as freq
          FROM search_queries
          WHERE query_text ILIKE ${likePattern}
            AND query_text != ${query}
            AND total_results > 0
          GROUP BY query_text
          ORDER BY freq DESC
          LIMIT ${limit}
        `) as unknown as Array<{ query_text: string; freq: string }>;

        return rows.map(row => ({
          text: row.query_text,
          type: 'related',
          score: Number(row.freq),
        }));
      },
      `search:related:${query.substring(0, 50)}`
    );
  }

  /**
   * Get search result by ID and type
   * 
   * @param type - Result type (e.g., 'bill')
   * @param id - Result ID
   * @returns Result containing Maybe<search result>
   */
  async getSearchResultById(
    type: string,
    id: string
  ): Promise<Result<Maybe<{
    id: string;
    type: string;
    title: string;
    description: string;
    relevanceScore: number;
    metadata: Record<string, unknown>;
  }>, Error>> {
    return this.executeRead(
      async (db) => {
        if (type === 'bill') {
          const [bill] = await db.execute(sql`
            SELECT id, title, summary, status, category, created_at, updated_at
            FROM bills
            WHERE id = ${id}
            LIMIT 1
          `) as unknown as Array<{
            id: string;
            title: string;
            summary: string;
            status: string;
            category: string;
            created_at: string;
            updated_at: string;
          }>;

          if (!bill) return null;

          return {
            id: bill.id,
            type: 'bill',
            title: bill.title,
            description: bill.summary || '',
            relevanceScore: 1.0,
            metadata: {
              status: bill.status,
              category: bill.category,
              created_at: bill.created_at,
              updated_at: bill.updated_at,
            },
          };
        }

        return null;
      },
      `search:result:${type}:${id}`
    );
  }
}

// Export singleton instance
export const searchRepository = new SearchRepository();
