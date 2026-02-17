import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { searchQueries, savedSearches } from '@server/infrastructure/schema/search_system';
import { sql, desc, eq, and, ilike, count } from 'drizzle-orm';
import { bills } from '@server/infrastructure/schema/foundation';

export class SearchRepository {
  async recordSearch(
    queryText: string,
    resultCount: number,
    userId?: string,
    sessionId?: string,
    filters?: Record<string, unknown>,
    processingTimeMs?: number,
  ): Promise<void> {
    try {
      await writeDatabase
        .insert(searchQueries)
        .values({
          user_id: userId ?? null,
          session_id: sessionId ?? null,
          query_text: queryText,
          search_filters: filters ?? {},
          total_results: resultCount,
          processing_time_ms: processingTimeMs ?? null,
        });
    } catch (error) {
      logger.error('Failed to record search', { error: String(error) });
    }
  }

  async getHistory(
    userId: string | undefined,
    limit: number,
  ): Promise<Array<{
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
    filters?: Record<string, unknown>;
  }>> {
    try {
      const conditions = userId ? eq(searchQueries.user_id, userId) : undefined;

      const rows = await readDatabase
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
    } catch (error) {
      logger.error('Failed to get search history', { error: String(error) });
      return [];
    }
  }

  async clearHistory(userId?: string): Promise<void> {
    try {
      if (userId) {
        await writeDatabase
          .delete(searchQueries)
          .where(eq(searchQueries.user_id, userId));
      } else {
        await writeDatabase.delete(searchQueries);
      }
    } catch (error) {
      logger.error('Failed to clear search history', { error: String(error) });
    }
  }

  async getRecentSearches(
    limit: number,
    userId?: string,
  ): Promise<Array<{
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
  }>> {
    try {
      const conditions = userId ? eq(searchQueries.user_id, userId) : undefined;

      const rows = await readDatabase
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
    } catch (error) {
      logger.error('Failed to get recent searches', { error: String(error) });
      return [];
    }
  }

  async getPopularSearches(
    limit: number,
    days: number = 30,
  ): Promise<Array<{
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
  }>> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const rows = await readDatabase.execute(sql`
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

      return rows.map((row, idx) => ({
        id: `popular_${idx}`,
        query: row.query_text,
        timestamp: row.last_searched,
        resultCount: Math.round(Number(row.avg_results) || 0),
      }));
    } catch (error) {
      logger.error('Failed to get popular searches', { error: String(error) });
      return [];
    }
  }

  async saveSearch(data: {
    userId?: string;
    name: string;
    description?: string;
    query: Record<string, unknown>;
    filters?: Record<string, unknown>;
    is_public?: boolean;
    tags?: string[];
  }): Promise<{
    id: string;
    name: string;
    query: unknown;
    description?: string | null;
    is_public: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    useCount: number;
  }> {
    const [saved] = await writeDatabase
      .insert(savedSearches)
      .values({
        user_id: data.userId ?? null,
        name: data.name,
        description: data.description ?? null,
        query: data.query,
        filters: data.filters ?? {},
        is_public: data.is_public ?? false,
        tags: data.tags ?? [],
      })
      .returning();

    return {
      id: saved.id,
      name: saved.name,
      query: saved.query,
      description: saved.description,
      is_public: saved.is_public,
      tags: saved.tags,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
      useCount: saved.use_count,
    };
  }

  async getSavedSearches(
    userId?: string,
  ): Promise<Array<{
    id: string;
    name: string;
    query: unknown;
    description?: string | null;
    is_public: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    useCount: number;
    lastExecuted?: string | null;
  }>> {
    try {
      const conditions = userId
        ? eq(savedSearches.user_id, userId)
        : eq(savedSearches.is_public, true);

      const rows = await readDatabase
        .select()
        .from(savedSearches)
        .where(conditions)
        .orderBy(desc(savedSearches.created_at));

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        query: row.query,
        description: row.description,
        is_public: row.is_public,
        tags: row.tags,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        useCount: row.use_count,
        lastExecuted: row.last_executed_at?.toISOString() ?? null,
      }));
    } catch (error) {
      logger.error('Failed to get saved searches', { error: String(error) });
      return [];
    }
  }

  async deleteSavedSearch(id: string, userId?: string): Promise<boolean> {
    try {
      const conditions = userId
        ? and(eq(savedSearches.id, id), eq(savedSearches.user_id, userId))
        : eq(savedSearches.id, id);

      const result = await writeDatabase
        .delete(savedSearches)
        .where(conditions)
        .returning({ id: savedSearches.id });

      return result.length > 0;
    } catch (error) {
      logger.error('Failed to delete saved search', { error: String(error), id });
      return false;
    }
  }

  async getAndUpdateSavedSearch(
    id: string,
    userId?: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const conditions = userId
        ? and(eq(savedSearches.id, id), eq(savedSearches.user_id, userId))
        : eq(savedSearches.id, id);

      const rows = await readDatabase
        .select({ query: savedSearches.query })
        .from(savedSearches)
        .where(conditions)
        .limit(1);

      if (rows.length === 0) return null;

      await writeDatabase
        .update(savedSearches)
        .set({
          use_count: sql`use_count + 1`,
          last_executed_at: new Date(),
          updated_at: new Date(),
        })
        .where(conditions);

      return rows[0].query as Record<string, unknown>;
    } catch (error) {
      logger.error('Failed to execute saved search', { error: String(error), id });
      return null;
    }
  }

  async getMetadata(): Promise<{
    totalDocuments: number;
    lastIndexed: string;
    availableFilters: {
      billStatus: string[];
      categories: string[];
      locations: string[];
      tags: string[];
    };
    searchTips: string[];
  }> {
    try {
      const [countResult] = await readDatabase.execute(sql`
        SELECT count(*) as total, max(updated_at) as last_updated
        FROM bills
      `) as unknown as Array<{ total: string; last_updated: string | null }>;

      const statusRows = await readDatabase.execute(sql`
        SELECT DISTINCT status FROM bills WHERE status IS NOT NULL ORDER BY status
      `) as unknown as Array<{ status: string }>;

      const categoryRows = await readDatabase.execute(sql`
        SELECT DISTINCT category FROM bills WHERE category IS NOT NULL ORDER BY category
      `) as unknown as Array<{ category: string }>;

      const tagRows = await readDatabase.execute(sql`
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
    } catch (error) {
      logger.error('Failed to get search metadata', { error: String(error) });
      return {
        totalDocuments: 0,
        lastIndexed: new Date().toISOString(),
        availableFilters: {
          billStatus: [],
          categories: [],
          locations: [],
          tags: [],
        },
        searchTips: [],
      };
    }
  }

  async getRelatedSearches(
    query: string,
    limit: number = 5,
  ): Promise<Array<{
    text: string;
    type: string;
    score: number;
  }>> {
    try {
      if (query.length < 2) return [];

      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (words.length === 0) return [];

      const likePattern = `%${words[0]}%`;

      const rows = await readDatabase.execute(sql`
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
    } catch (error) {
      logger.error('Failed to get related searches', { error: String(error) });
      return [];
    }
  }

  async getSearchResultById(
    type: string,
    id: string,
  ): Promise<{
    id: string;
    type: string;
    title: string;
    description: string;
    relevanceScore: number;
    metadata: Record<string, unknown>;
  } | null> {
    try {
      if (type === 'bill') {
        const [bill] = await readDatabase.execute(sql`
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
    } catch (error) {
      logger.error('Failed to get search result', { error: String(error), type, id });
      return null;
    }
  }
}

export const searchRepository = new SearchRepository();
