// ============================================================================
// SEMANTIC SEARCH ENGINE - AI-Powered Vector Similarity Search
// ============================================================================
// Performs vector similarity search using cosine similarity with hybrid ranking.
// Combines semantic search with PostgreSQL full-text search for optimal results.
//
// NOTE ON QUERY STRATEGY
// ──────────────────────
// Drizzle's query builder collapses to `unknown` when SQL<unknown> expressions
// (e.g. cosine similarity via pgvector's <=> operator) are mixed with .where()
// chains. To preserve full TypeScript type safety without any unsafe casts, all
// primary queries use `database.execute<RowType>(sql`...`)` — raw parameterised
// SQL with an explicit generic row shape. This is idiomatic for vector workloads.

import { logger } from '../../../infrastructure/observability/core/logger';
import { readDatabase, writeDatabase, withTransaction } from '../../../infrastructure/database/connection';
import {
  searchQueries,
  ContentType,
  QueryType,
} from '../../../infrastructure/schema/search_system';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../services/embedding.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 20;
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;
const DEFAULT_SEMANTIC_WEIGHT = 0.7;
const DEFAULT_TRADITIONAL_WEIGHT = 0.3;

// ============================================================================
// TYPES
// ============================================================================

export interface SearchFilters {
  contentType?: ContentType[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  language?: string;
  /** Minimum cosine similarity score [0, 1]. Defaults to 0.5. */
  minSimilarity?: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  /**
   * When true, blends semantic score with PostgreSQL full-text ranking.
   * Weights are controlled by `semanticWeight` / `traditionalWeight`.
   */
  hybrid?: boolean;
  /** Weight for semantic score in hybrid mode. Default: 0.7 */
  semanticWeight?: number;
  /** Weight for full-text score in hybrid mode. Default: 0.3 */
  traditionalWeight?: number;
  /** Boost results by engagement/quality signals from the embedding record. */
  boostByEngagement?: boolean;
  /** Logged to search_queries for analytics when provided. */
  userId?: string;
  sessionId?: string;
}

export interface SearchResult {
  id: string;
  contentType: ContentType;
  title: string;
  summary: string;
  content: string;
  relevanceScore: number;
  semanticScore: number;
  traditionalScore?: number;
  metadata: {
    tags?: string[];
    language: string;
    qualityScore?: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  /** Approximate total matching rows (without limit/offset). */
  totalCount: number;
  query: string;
  searchType: QueryType;
  processingTimeMs: number;
  hasMore: boolean;
}

// ============================================================================
// INTERNAL ROW SHAPES  (only used to type database.execute<T> generics)
// ============================================================================

interface SearchRow {
  id: string;
  content_type: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  semantic_score: string;        // Postgres returns numerics as strings
  traditional_score: string | null;
  relevance_score: string;
  tags: string[] | null;
  language: string;
  quality_score: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CountRow {
  total: string;
}

interface AnalyticsRow {
  total_queries: string;
  avg_processing_ms: string | null;
  total_results: string | null;
  cache_hits: string | null;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SemanticSearchEngine {
  /**
   * Execute a semantic (or hybrid) search and return ranked results.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      limit = DEFAULT_LIMIT,
      offset = 0,
      filters = {},
      hybrid = false,
      semanticWeight = DEFAULT_SEMANTIC_WEIGHT,
      traditionalWeight = DEFAULT_TRADITIONAL_WEIGHT,
      boostByEngagement = false,
      userId,
      sessionId,
    } = options;

    const minSimilarity = filters.minSimilarity ?? DEFAULT_SIMILARITY_THRESHOLD;
    const searchType: QueryType = hybrid ? 'hybrid' : 'semantic';

    try {
      logger.debug({ query, options }, 'Starting semantic search');

      // 1. Generate embedding for the query.
      const { embedding } = await embeddingService.generateEmbedding(query);
      const vectorLiteral = `[${embedding.join(',')}]`;

      // 2. Build optional filter fragments.
      //    These are composed into the raw SQL templates as AND clauses.
      const contentTypeClause =
        filters.contentType && filters.contentType.length > 0
          ? sql`AND content_type = ANY(ARRAY[${sql.join(
              filters.contentType.map((t) => sql`${t}`),
              sql`, `,
            )}]::content_type[])`
          : sql``;

      const languageClause = filters.language
        ? sql`AND content_language = ${filters.language}`
        : sql``;

      const dateStartClause = filters.dateRange?.start
        ? sql`AND created_at >= ${filters.dateRange.start}`
        : sql``;

      const dateEndClause = filters.dateRange?.end
        ? sql`AND created_at <= ${filters.dateRange.end}`
        : sql``;

      // 3. Score expressions.
      //    Cosine similarity via pgvector: 1 - (embedding <=> query_vector).
      const semanticExpr = sql`1 - (embedding <=> ${vectorLiteral}::vector)`;

      const traditionalExpr = sql`ts_rank(
        to_tsvector('english',
          coalesce(content_title, '') || ' ' || coalesce(content_text, '')
        ),
        plainto_tsquery('english', ${query})
      )`;

      const blendedExpr = hybrid
        ? sql`(${semanticWeight}::float * (${semanticExpr})) + (${traditionalWeight}::float * (${traditionalExpr}))`
        : semanticExpr;

      const finalExpr = boostByEngagement
        ? sql`(${blendedExpr}) * (
              1
              + 0.1  * coalesce(quality_score::float, 0.5)
              + 0.05 * least(coalesce(engagement_score::float, 0) / 100.0, 1)
            )`
        : blendedExpr;

      // 4. Main results query — typed via the SearchRow generic.
      //    Using readDatabase with execute bypasses drizzle's builder inference, which
      //    collapses to `unknown` when pgvector SQL expressions enter .where().
      const rowsResult = await readDatabase(async (db) => {
        return db.execute(sql`
        SELECT
          content_id                            AS id,
          content_type,
          content_title                         AS title,
          content_summary                       AS summary,
          content_text                          AS content,
          (${semanticExpr})                     AS semantic_score,
          ${hybrid ? sql`(${traditionalExpr})` : sql`NULL`}
                                                AS traditional_score,
          (${finalExpr})                        AS relevance_score,
          content_tags                          AS tags,
          content_language                      AS language,
          quality_score,
          created_at,
          updated_at
        FROM content_embeddings
        WHERE (${semanticExpr}) > ${minSimilarity}
          ${contentTypeClause}
          ${languageClause}
          ${dateStartClause}
          ${dateEndClause}
          AND processing_status = 'completed'
        ORDER BY relevance_score DESC
        LIMIT  ${limit}
        OFFSET ${offset}
      `);
      });
      const rows = rowsResult.rows as unknown as SearchRow[];

      // 5. Separate count query for accurate pagination.
      const countResult = await readDatabase(async (db) => {
        return db.execute(sql`
        SELECT count(*)::text AS total
        FROM content_embeddings
        WHERE (${semanticExpr}) > ${minSimilarity}
          ${contentTypeClause}
          ${languageClause}
          ${dateStartClause}
          ${dateEndClause}
          AND processing_status = 'completed'
      `);
      });
      
      const countRows = countResult.rows as unknown as CountRow[];
      const countRow = countRows[0];
      if (!countRow) {
        throw new Error('Count query returned no results');
      }

      const totalCount = parseInt(countRow.total, 10);

      // 6. Map raw DB rows to SearchResult.
      const results: SearchResult[] = rows.map((r: SearchRow) => ({
        id: r.id,
        contentType: r.content_type as ContentType,
        title: r.title ?? 'Untitled',
        summary: r.summary ?? '',
        content: r.content ?? '',
        relevanceScore: parseFloat(r.relevance_score),
        semanticScore: parseFloat(r.semantic_score),
        traditionalScore:
          r.traditional_score != null ? parseFloat(r.traditional_score) : undefined,
        metadata: {
          tags: r.tags ?? undefined,
          language: r.language,
          qualityScore: r.quality_score != null ? parseFloat(r.quality_score) : undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        },
      }));

      const processingTimeMs = Date.now() - startTime;

      // 7. Fire-and-forget analytics logging.
      this.logSearchQuery({
        query,
        searchType,
        userId,
        sessionId,
        filters,
        processingTimeMs,
        totalResults: totalCount,
        resultsDisplayed: results.length,
        embedding,
      }).catch((err) => logger.warn({ err }, 'Failed to log search query'));

      logger.debug(
        { query, searchType, totalCount, processingTimeMs },
        'Semantic search completed',
      );

      return {
        results,
        totalCount,
        query,
        searchType,
        processingTimeMs,
        hasMore: offset + results.length < totalCount,
      };
    } catch (error) {
      logger.error({ query, error }, 'Semantic search failed');
      throw new Error(
        `Semantic search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve aggregated analytics for a given date.
   */
  async getSearchAnalytics(date: Date): Promise<Record<string, unknown>> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // Using readDatabase with execute avoids drizzle builder collapse on and(gte(...), lte(...)).
      const statsResult = await readDatabase(async (db) => {
        return db.execute(sql`
        SELECT
          count(*)::text                 AS total_queries,
          avg(processing_time_ms)::text  AS avg_processing_ms,
          sum(total_results)::text       AS total_results,
          sum(cache_hit)::text           AS cache_hits
        FROM search_queries
        WHERE created_at >= ${dayStart}
          AND created_at <= ${dayEnd}
      `);
      });
      
      const statsRows = statsResult.rows as unknown as AnalyticsRow[];
      const stats = statsRows[0];
      if (!stats) {
        return {
          totalQueries: 0,
          avgProcessingMs: 0,
          totalResults: 0,
          cacheHitRate: 0,
        };
      }

      // TypeScript now knows stats is defined
      const totalQueries = parseInt(stats.total_queries, 10);
      const cacheHits    = parseInt(stats.cache_hits ?? '0', 10);

      return {
        date:            date.toISOString().split('T')[0],
        totalQueries,
        avgProcessingMs: parseFloat(stats.avg_processing_ms ?? '0'),
        totalResults:    parseInt(stats.total_results ?? '0', 10),
        cacheHits,
        cacheHitRate:    totalQueries > 0 ? cacheHits / totalQueries : 0,
      };
    } catch (error) {
      logger.error({ error, date }, 'Failed to fetch search analytics');
      return {};
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Persist a record of the executed search for analytics.
   * Called fire-and-forget — never awaited by the caller.
   */
  private async logSearchQuery(params: {
    query: string;
    searchType: QueryType;
    userId?: string;
    sessionId?: string;
    filters: SearchFilters;
    processingTimeMs: number;
    totalResults: number;
    resultsDisplayed: number;
    embedding: number[];
  }): Promise<void> {
    // JSON round-trip converts SearchFilters interface → plain Record<string, unknown>,
    // which satisfies drizzle's jsonb column typing without an unsafe cast.
    const filtersJson = JSON.parse(JSON.stringify(params.filters)) as Record<string, unknown>;

    await withTransaction(async (tx) => {
      await tx.insert(searchQueries).values({
      query_text:         params.query,
      query_type:         params.searchType,
      user_id:            params.userId    ?? null,
      session_id:         params.sessionId ?? null,
      search_filters:     filtersJson,
      processing_time_ms: params.processingTimeMs,
      total_results:      params.totalResults,
      results_displayed:  params.resultsDisplayed,
      embedding:          params.embedding,
      cache_hit:          0, // Embedding-level cache hits tracked inside embeddingService
    });
    });
  }
}

// Export singleton instance
export const semanticSearchEngine = new SemanticSearchEngine();