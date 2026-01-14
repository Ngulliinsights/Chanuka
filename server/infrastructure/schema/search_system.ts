// ============================================================================
// INTELLIGENT SEARCH SYSTEM SCHEMA - AI-Powered Semantic Search
// ============================================================================
// Foundation for vector-based semantic search with AI embeddings
// Supports hybrid ranking combining semantic and traditional search
//
// Features:
// - Vector embeddings for semantic similarity search (pgvector)
// - Search query tracking and analytics
// - Content deduplication via hash comparison
// - Performance monitoring and optimization
// - Geographic search patterns analysis

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  varchar,
  index,
  unique,
  decimal,
  date,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";

import { primaryKeyUuid } from "./base-types";
import { users } from "./foundation";
// ============================================================================
// ENUMS - Standardized values for type safety
// ============================================================================

export const contentTypeEnum = pgEnum("content_type", [
  "bill",
  "sponsor",
  "comment",
  "amendment",
  "hearing",
  "report",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "retrying",
]);

export const queryTypeEnum = pgEnum("query_type", [
  "semantic",
  "traditional",
  "hybrid",
  "autocomplete",
]);

// ============================================================================
// CUSTOM TYPES
// ============================================================================

/**
 * Vector type for pgvector extension
 * Note: Requires pgvector extension installed: CREATE EXTENSION vector;
 *
 * For Drizzle ORM compatibility, we use text type with custom SQL cast
 * At runtime, pgvector will handle the actual vector operations
 */
const vector = (dimensions: number) =>
  text(`vector(${dimensions})`).$type<number[]>();

// ============================================================================
// CONTENT EMBEDDINGS - Store AI-generated embeddings for searchable content
// ============================================================================

export const contentEmbeddings = pgTable(
  "content_embeddings",
  {
    id: primaryKeyUuid(),

    // Content identification
    content_type: contentTypeEnum("content_type").notNull(),
    content_id: uuid("content_id").notNull(),
    content_hash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256 hash

    // AI embedding vector (OpenAI text-embedding-3-small: 1536 dimensions)
    embedding: vector(1536).notNull(),

    // Content metadata for filtering and display
    content_title: text("content_title"),
    content_summary: text("content_summary"),
    content_text: text("content_text"), // Full text for keyword fallback
    content_tags: text("content_tags").array(),
    content_language: varchar("content_language", { length: 10 }).notNull().default("en"),

    // Content quality/relevance scoring
    quality_score: decimal("quality_score", { precision: 3, scale: 2 }).default("0.5"),
    view_count: integer("view_count").notNull().default(0),
    engagement_score: decimal("engagement_score", { precision: 5, scale: 2 }).default("0"),

    // Processing metadata
    model_version: varchar("model_version", { length: 50 })
      .notNull()
      .default("text-embedding-3-small"),
    processing_status: processingStatusEnum("processing_status")
      .notNull()
      .default("pending"),
    processing_attempts: integer("processing_attempts").notNull().default(0),
    processing_duration_ms: integer("processing_duration_ms"),
    last_attempt_at: timestamp("last_attempt_at", { withTimezone: true }),
    error_message: text("error_message"),
    error_code: varchar("error_code", { length: 50 }),

    // Audit timestamps
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // Primary lookup indexes
    contentTypeIdIdx: index("idx_ce_content_type_id").on(
      table.content_type,
      table.content_id
    ),
    contentHashIdx: index("idx_ce_content_hash").on(table.content_hash),

    // Processing and monitoring indexes
    processingStatusIdx: index("idx_ce_processing_status")
      .on(table.processing_status)
      .where(sql`${table.processing_status} != 'completed'`), // Partial index for efficiency

    processingAttemptsIdx: index("idx_ce_processing_attempts")
      .on(table.processing_attempts, table.last_attempt_at)
      .where(sql`${table.processing_attempts} > 3`), // Track problematic entries

    // Analytics indexes
    qualityScoreIdx: index("idx_ce_quality_score").on(table.quality_score),
    updatedAtIdx: index("idx_ce_updated_at").on(table.updated_at),
    createdAtIdx: index("idx_ce_created_at").on(table.created_at),

    // Language filtering
    languageIdx: index("idx_ce_language").on(table.content_language),

    // cSpell:ignore HNSW hnsw
    // Vector similarity index (HNSW for fast approximate nearest neighbor)
    // Note: This is added via migration SQL, not Drizzle ORM
    // CREATE INDEX idx_ce_embedding_hnsw ON content_embeddings
    // USING hnsw (embedding vector_cosine_ops);

    // Unique constraint to prevent duplicate embeddings
    uniqueContent: unique("uq_ce_content").on(table.content_type, table.content_id),

    // Check constraints for data validation
    checkProcessingAttempts: check(
      "chk_ce_processing_attempts",
      sql`${table.processing_attempts} >= 0 AND ${table.processing_attempts} <= 10`
    ),
    checkQualityScore: check(
      "chk_ce_quality_score",
      sql`${table.quality_score} >= 0 AND ${table.quality_score} <= 1`
    ),
    checkViewCount: check(
      "chk_ce_view_count",
      sql`${table.view_count} >= 0`
    ),
  })
);

// ============================================================================
// SEARCH QUERIES - Track user search patterns and analytics
// ============================================================================

export const searchQueries = pgTable(
  "search_queries",
  {
    id: primaryKeyUuid(),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    session_id: varchar("session_id", { length: 100 }), // Track multi-query sessions

    // Query details
    query_text: text("query_text").notNull(),
    query_type: queryTypeEnum("query_type").notNull().default("semantic"),
    query_language: varchar("query_language", { length: 10 }).notNull().default("en"),
    search_filters: jsonb("search_filters").notNull().default(sql`'{}'::jsonb`),

    // Query processing
    embedding: vector(1536), // Query embedding for semantic search
    processing_time_ms: integer("processing_time_ms"),
    cache_hit: integer("cache_hit").notNull().default(0), // 0 = miss, 1 = hit

    // Results metadata
    total_results: integer("total_results").notNull().default(0),
    results_displayed: integer("results_displayed").notNull().default(0),
    clicked_result_id: uuid("clicked_result_id"),
    clicked_result_position: integer("clicked_result_position"), // Position in results (1-based)
    clicked_at: timestamp("clicked_at", { withTimezone: true }),

    // User context
    user_county: varchar("user_county", { length: 100 }),
    user_constituency: varchar("user_constituency", { length: 100 }),
    user_ip_hash: varchar("user_ip_hash", { length: 64 }), // Hashed for privacy
    user_agent: text("user_agent"),

    // Relevance feedback
    user_rating: integer("user_rating"), // 1-5 star rating (optional)
    feedback_text: text("feedback_text"),
    is_relevant: integer("is_relevant"), // 0 = not relevant, 1 = relevant, null = no feedback

    // Timestamps
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // User and session tracking
    userCreatedIdx: index("idx_sq_user_created").on(
      table.user_id,
      table.created_at
    ),
    sessionCreatedIdx: index("idx_sq_session_created").on(
      table.session_id,
      table.created_at
    ),

    // Search type analysis
    typeCreatedIdx: index("idx_sq_type_created").on(
      table.query_type,
      table.created_at
    ),

    // Geographic analysis
    countyIdx: index("idx_sq_county").on(table.user_county),
    constituencyIdx: index("idx_sq_constituency").on(table.user_constituency),

    // Performance monitoring
    processingTimeIdx: index("idx_sq_processing_time").on(table.processing_time_ms),
    cacheHitIdx: index("idx_sq_cache_hit").on(
      table.cache_hit,
      table.created_at
    ),

    // Engagement tracking
    clickedResultIdx: index("idx_sq_clicked_result").on(
      table.clicked_result_id
    ).where(sql`${table.clicked_result_id} IS NOT NULL`),

    // Time-series analysis
    createdAtIdx: index("idx_sq_created_at").on(table.created_at),

    // Check constraints
    checkRating: check(
      "chk_sq_rating",
      sql`${table.user_rating} IS NULL OR (${table.user_rating} >= 1 AND ${table.user_rating} <= 5)`
    ),
    checkIsRelevant: check(
      "chk_sq_is_relevant",
      sql`${table.is_relevant} IS NULL OR ${table.is_relevant} IN (0, 1)`
    ),
    checkCacheHit: check(
      "chk_sq_cache_hit",
      sql`${table.cache_hit} IN (0, 1)`
    ),
    checkClickPosition: check(
      "chk_sq_click_position",
      sql`${table.clicked_result_position} IS NULL OR ${table.clicked_result_position} > 0`
    ),
  })
);

// ============================================================================
// SEARCH ANALYTICS - Aggregate search performance and user behavior
// ============================================================================

export const searchAnalytics = pgTable(
  "search_analytics",
  {
    id: primaryKeyUuid(),
    analytics_date: date("analytics_date").notNull(),
    analytics_hour: integer("analytics_hour"), // 0-23 for hourly breakdown

    // Query volume metrics
    total_queries: integer("total_queries").notNull().default(0),
    unique_users: integer("unique_users").notNull().default(0),
    unique_sessions: integer("unique_sessions").notNull().default(0),

    // Query type breakdown
    semantic_queries: integer("semantic_queries").notNull().default(0),
    traditional_queries: integer("traditional_queries").notNull().default(0),
    hybrid_queries: integer("hybrid_queries").notNull().default(0),
    autocomplete_queries: integer("autocomplete_queries").notNull().default(0),

    // Performance metrics
    avg_processing_time_ms: integer("avg_processing_time_ms"),
    p95_processing_time_ms: integer("p95_processing_time_ms"), // 95th percentile
    avg_results_count: decimal("avg_results_count", { precision: 8, scale: 2 }),
    cache_hit_rate: decimal("cache_hit_rate", { precision: 5, scale: 3 }), // Percentage

    // User engagement metrics
    queries_with_clicks: integer("queries_with_clicks").notNull().default(0),
    click_through_rate: decimal("click_through_rate", { precision: 5, scale: 3 }),
    avg_click_position: decimal("avg_click_position", { precision: 5, scale: 2 }),
    queries_with_feedback: integer("queries_with_feedback").notNull().default(0),
    avg_user_rating: decimal("avg_user_rating", { precision: 3, scale: 2 }),

    // Geographic breakdown
    top_counties: jsonb("top_counties").notNull().default(sql`'[]'::jsonb`),
    top_constituencies: jsonb("top_constituencies").notNull().default(sql`'[]'::jsonb`),

    // Content insights
    popular_search_terms: jsonb("popular_search_terms")
      .notNull()
      .default(sql`'[]'::jsonb`),
    trending_topics: jsonb("trending_topics").notNull().default(sql`'[]'::jsonb`),
    content_type_distribution: jsonb("content_type_distribution")
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Quality metrics
    zero_result_queries: integer("zero_result_queries").notNull().default(0),
    zero_result_rate: decimal("zero_result_rate", { precision: 5, scale: 3 }),
    failed_queries: integer("failed_queries").notNull().default(0),
    error_rate: decimal("error_rate", { precision: 5, scale: 3 }),

    // Timestamps
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // Primary time-based indexes
    dateUnique: unique("uq_sa_date_hour").on(
      table.analytics_date,
      table.analytics_hour
    ),
    dateIdx: index("idx_sa_date").on(table.analytics_date),
    dateHourIdx: index("idx_sa_date_hour").on(
      table.analytics_date,
      table.analytics_hour
    ),

    // Metric-based indexes for reporting
    volumeIdx: index("idx_sa_volume").on(
      table.total_queries,
      table.analytics_date
    ),
    performanceIdx: index("idx_sa_performance").on(
      table.avg_processing_time_ms,
      table.analytics_date
    ),
    engagementIdx: index("idx_sa_engagement").on(
      table.click_through_rate,
      table.analytics_date
    ),

    // Time-series indexes
    createdAtIdx: index("idx_sa_created_at").on(table.created_at),

    // Check constraints
    checkHour: check(
      "chk_sa_hour",
      sql`${table.analytics_hour} IS NULL OR (${table.analytics_hour} >= 0 AND ${table.analytics_hour} <= 23)`
    ),
    checkRates: check(
      "chk_sa_rates",
      sql`
        (${table.click_through_rate} IS NULL OR (${table.click_through_rate} >= 0 AND ${table.click_through_rate} <= 1)) AND
        (${table.cache_hit_rate} IS NULL OR (${table.cache_hit_rate} >= 0 AND ${table.cache_hit_rate} <= 1)) AND
        (${table.zero_result_rate} IS NULL OR (${table.zero_result_rate} >= 0 AND ${table.zero_result_rate} <= 1)) AND
        (${table.error_rate} IS NULL OR (${table.error_rate} >= 0 AND ${table.error_rate} <= 1))
      `
    ),
    checkRating: check(
      "chk_sa_rating",
      sql`${table.avg_user_rating} IS NULL OR (${table.avg_user_rating} >= 1 AND ${table.avg_user_rating} <= 5)`
    ),
  })
);

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const contentEmbeddingsRelations = relations(contentEmbeddings, () => ({
  // Note: Polymorphic relations to bills, sponsors, comments, etc.
  // Relations are handled at the application level based on content_type
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.user_id],
    references: [users.id],
  }),
}));

export const searchAnalyticsRelations = relations(searchAnalytics, () => ({
  // Analytics table is primarily for reporting, no outbound relations
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ContentEmbedding = typeof contentEmbeddings.$inferSelect;
export type NewContentEmbedding = typeof contentEmbeddings.$inferInsert;

export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type NewSearchAnalytics = typeof searchAnalytics.$inferInsert;

// Enum type exports
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type ProcessingStatus = (typeof processingStatusEnum.enumValues)[number];
export type QueryType = (typeof queryTypeEnum.enumValues)[number];

// ============================================================================
// HELPER FUNCTIONS & CONSTANTS
// ============================================================================

/**
 * Default embedding model configuration
 */
export const EMBEDDING_CONFIG = {
  MODEL: "text-embedding-3-small",
  DIMENSIONS: 1536,
  MAX_TOKENS: 8191,
  BATCH_SIZE: 100,
} as const;

/**
 * Search query performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  FAST_QUERY_MS: 100,
  ACCEPTABLE_QUERY_MS: 500,
  SLOW_QUERY_MS: 1000,
} as const;

/**
 * Analytics aggregation intervals
 */
export const ANALYTICS_INTERVALS = {
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

/**
 * SQL helper for computing cosine similarity between vectors
 * Usage: sql`${cosineSimilarity(table.embedding, ${queryEmbedding})}`
 */
export const cosineSimilarity = (column: object, queryVector: string) =>
  sql`1 - (${column} <=> ${queryVector}::vector)`;

/**
 * SQL helper for finding similar content by vector
 * Returns top N most similar embeddings
 */
export const findSimilarContent = (
  queryVector: string,
  limit: number = 10,
  minSimilarity: number = 0.7
) => sql`
  SELECT
    *,
    1 - (embedding <=> ${queryVector}::vector) AS similarity
  FROM content_embeddings
  WHERE 1 - (embedding <=> ${queryVector}::vector) > ${minSimilarity}
  ORDER BY embedding <=> ${queryVector}::vector
  LIMIT ${limit}
`;
