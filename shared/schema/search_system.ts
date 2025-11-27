// ============================================================================
// INTELLIGENT SEARCH SYSTEM SCHEMA - AI-Powered Semantic Search
// ============================================================================
// Foundation for vector-based semantic search with AI embeddings
// Supports hybrid ranking combining semantic and traditional search

import {
  pgTable, text, integer, timestamp, jsonb, uuid, varchar,
  index, unique, decimal, boolean, date
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import { users } from "./foundation";

// Custom vector type for pgvector (will be handled at runtime)
const vector = (dimensions: number) => text(`vector(${dimensions})`);

// ============================================================================
// CONTENT EMBEDDINGS - Store AI-generated embeddings for searchable content
// ============================================================================

export const content_embeddings = pgTable("content_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'bill', 'sponsor', 'comment'
  contentId: uuid("content_id").notNull(), // References bills.id, sponsors.id, or comments.id
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256 hash for change detection

  // AI embedding vector (OpenAI text-embedding-3-small produces 1536 dimensions)
  embedding: vector(1536), // Custom vector type from pgvector

  // Content metadata for efficient filtering
  contentTitle: text("content_title"),
  contentSummary: text("content_summary"),
  contentTags: varchar("content_tags", { length: 100 }).array(),

  // Processing metadata
  modelVersion: varchar("model_version", { length: 50 }).notNull().default('text-embedding-3-small'),
  processingStatus: varchar("processing_status", { length: 30 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processingAttempts: integer("processing_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Indexes for content embeddings
  contentTypeIdIdx: index("idx_content_embeddings_content_type_id").on(table.contentType, table.contentId),
  processingStatusIdx: index("idx_content_embeddings_processing_status").on(table.processingStatus),
  updatedAtIdx: index("idx_content_embeddings_updated_at").on(table.updatedAt),

  // Unique constraint to prevent duplicate embeddings
  uniqueContent: unique("idx_content_embeddings_unique").on(table.contentType, table.contentId),
}));

// ============================================================================
// SEARCH QUERIES - Track user search patterns and analytics
// ============================================================================

export const search_queries = pgTable("search_queries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

  // Query details
  query_text: text("query_text").notNull(),
  query_type: varchar("query_type", { length: 30 }).notNull().default('semantic'), // 'semantic', 'traditional', 'hybrid'
  search_filters: jsonb("search_filters").notNull().default(sql`'{}'::jsonb`), // Store filter parameters

  // Query processing
  embedding: vector(1536), // Query embedding for semantic search
  processing_time_ms: integer("processing_time_ms"), // How long the search took

  // Results metadata
  total_results: integer("total_results").notNull().default(0),
  relevant_results: integer("relevant_results").notNull().default(0),
  clicked_result_id: uuid("clicked_result_id"), // Which result was clicked (if any)

  // Geographic context
  user_county: varchar("user_county", { length: 50 }),
  user_constituency: varchar("user_constituency", { length: 100 }),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Indexes for search analytics
  userCreatedIdx: index("idx_search_queries_user_created").on(table.user_id, table.created_at),
  typeCreatedIdx: index("idx_search_queries_type_created").on(table.query_type, table.created_at),
  countyIdx: index("idx_search_queries_county").on(table.user_county),
}));

// ============================================================================
// SEARCH ANALYTICS - Aggregate search performance and user behavior
// ============================================================================

export const search_analytics = pgTable("search_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),

  // Query volume metrics
  totalQueries: integer("total_queries").notNull().default(0),
  semanticQueries: integer("semantic_queries").notNull().default(0),
  traditionalQueries: integer("traditional_queries").notNull().default(0),
  hybridQueries: integer("hybrid_queries").notNull().default(0),

  // Performance metrics
  avgProcessingTimeMs: integer("avg_processing_time_ms"),
  avgResultsCount: decimal("avg_results_count", { precision: 5, scale: 2 }),

  // User engagement metrics
  clickThroughRate: decimal("click_through_rate", { precision: 5, scale: 3 }), // Percentage of queries with clicks
  avgSessionDurationSeconds: integer("avg_session_duration_seconds"),

  // Geographic breakdown (top counties by search volume)
  topSearchCounties: jsonb("top_search_counties").notNull().default(sql`'[]'::jsonb`),

  // Popular search terms
  popularTerms: jsonb("popular_terms").notNull().default(sql`'[]'::jsonb`),

  // Content type distribution
  contentTypeDistribution: jsonb("content_type_distribution").notNull().default(sql`'{}'::jsonb`),

  // Error tracking
  failedQueries: integer("failed_queries").notNull().default(0),
  errorRate: decimal("error_rate", { precision: 5, scale: 3 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Indexes for analytics queries
  dateUnique: unique("idx_search_analytics_date").on(table.date),
  createdAtIdx: index("idx_search_analytics_created_at").on(table.createdAt),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const contentEmbeddingsRelations = relations(content_embeddings, ({ one }) => ({
  // Note: Dynamic relations to bills, sponsors, comments based on content_type
  // Relations are handled at the application level due to polymorphic nature
}));

export const searchQueriesRelations = relations(search_queries, ({ one }) => ({
  user: one(users, {
    fields: [search_queries.user_id],
    references: [users.id],
  }),
}));

export const searchAnalyticsRelations = relations(search_analytics, ({}) => ({
  // Analytics table is primarily for reporting, no outbound relations needed
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ContentEmbedding = typeof content_embeddings.$inferSelect;
export type NewContentEmbedding = typeof content_embeddings.$inferInsert;

export type SearchQuery = typeof search_queries.$inferSelect;
export type NewSearchQuery = typeof search_queries.$inferInsert;

export type SearchAnalytics = typeof search_analytics.$inferSelect;
export type NewSearchAnalytics = typeof search_analytics.$inferInsert;

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export const ContentType = {
  BILL: 'bill',
  SPONSOR: 'sponsor',
  COMMENT: 'comment',
} as const;

export type ContentType = typeof ContentType[keyof typeof ContentType];

export const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus];

export const QueryType = {
  SEMANTIC: 'semantic',
  TRADITIONAL: 'traditional',
  HYBRID: 'hybrid',
} as const;

export type QueryType = typeof QueryType[keyof typeof QueryType];


