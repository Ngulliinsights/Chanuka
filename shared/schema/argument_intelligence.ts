// ============================================================================
// ARGUMENT INTELLIGENCE SCHEMA - OPTIMIZED
// ============================================================================
// Transform raw citizen input into structured knowledge lawmakers can act on

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, smallint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  verificationStatusEnum
} from "./enum";

import { bills, users } from "./foundation";
import { comments } from "./citizen_participation";

// ============================================================================
// ARGUMENTS - Extracted structured claims from citizen comments
// ============================================================================

export const argumentTable = pgTable("arguments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  comment_id: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Argument structure - using constrained varchar for better performance on enum-like values
  argument_type: varchar("argument_type", { length: 20 }).notNull(), // "claim", "evidence", "reasoning", "prediction", "value"
  position: varchar("position", { length: 12 }).notNull(), // "support", "oppose", "neutral", "conditional"
  
  extracted_text: text("extracted_text").notNull(),
  normalized_text: text("normalized_text"), // Cleaned version for deduplication and comparison
  
  // Classification - using PostgreSQL array types for flexible categorization
  topic_tags: text("topic_tags").array(), // ["healthcare", "taxation", "environment"]
  affected_groups: text("affected_groups").array(), // ["farmers", "urban_residents", "women"]
  
  // Quality metrics - using smallint where range is limited for storage efficiency
  extraction_confidence: smallint("extraction_confidence").notNull(), // 0-100 (stored as integer, displayed as percentage)
  coherence_score: smallint("coherence_score"), // 0-100
  evidence_quality: varchar("evidence_quality", { length: 10 }), // "none", "weak", "moderate", "strong"
  
  // Hierarchical relationships
  parent_argument_id: uuid("parent_argument_id").references(() => argumentTable.id, { onDelete: "set null" }), // Sub-arguments
  claim_id: uuid("claim_id").references(() => claims.id, { onDelete: "set null" }), // Link to canonical claim
  
  // Extraction metadata - important for auditing and quality improvement
  extraction_method: varchar("extraction_method", { length: 50 }).notNull(), // "rule_based", "ml_model", "llm_gpt4"
  extraction_timestamp: timestamp("extraction_timestamp", { withTimezone: true }).notNull().defaultNow(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Primary access patterns - optimized for common queries
  commentIdx: index("idx_arguments_comment").on(table.comment_id),
  billIdx: index("idx_arguments_bill").on(table.bill_id),
  claimIdx: index("idx_arguments_claim").on(table.claim_id).where(sql`${table.claim_id} IS NOT NULL`), // Partial index for linked arguments only
  
  // Position analysis queries
  billPositionIdx: index("idx_arguments_bill_position").on(table.bill_id, table.position),
  
  // Array search optimization
  topicTagsIdx: index("idx_arguments_topic_tags").using("gin", table.topic_tags),
  affectedGroupsIdx: index("idx_arguments_affected_groups").using("gin", table.affected_groups),
  
  // Quality filtering - combined index for threshold queries
  qualityIdx: index("idx_arguments_quality")
    .on(table.bill_id, table.extraction_confidence, table.evidence_quality)
    .where(sql`${table.extraction_confidence} >= 70`), // Only index high-quality arguments
  
  // Time-based queries for analytics
  extractionTimeIdx: index("idx_arguments_extraction_time").on(table.extraction_timestamp),
}));

// ============================================================================
// CLAIMS - Deduplicated canonical statements across similar arguments
// ============================================================================

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Core claim representation
  claim_text: text("claim_text").notNull(),
  claim_summary: varchar("claim_summary", { length: 500 }), // Concise version for UI display
  position: varchar("position", { length: 12 }).notNull(), // "support", "oppose", "neutral"
  
  // Clustering and aggregation metrics
  argument_cluster_size: integer("argument_cluster_size").notNull().default(1),
  source_arguments: uuid("source_arguments").array(), // Original arguments synthesized into this claim
  
  // Geographic and demographic reach - critical for representation analysis
  expressing_users_count: integer("expressing_users_count").notNull().default(0),
  counties_represented: kenyanCountyEnum("counties_represented").array(),
  demographic_spread: jsonb("demographic_spread"), // {"urban": 45, "rural": 67, "youth_18_25": 32}
  
  // Evidence strength indicators
  supporting_evidence_count: integer("supporting_evidence_count").notNull().default(0),
  evidence_quality_avg: smallint("evidence_quality_avg"), // 0-100 average
  expert_endorsements: integer("expert_endorsements").notNull().default(0),
  
  // Importance scoring for prioritization
  importance_score: numeric("importance_score", { precision: 7, scale: 2 }).notNull().default(sql`0`), // Allows for complex scoring algorithms
  novelty_score: smallint("novelty_score"), // 0-100, how unique is this perspective
  
  // Categorization for organizing briefs
  claim_category: varchar("claim_category", { length: 50 }), // "constitutional", "economic", "social", "procedural"
  affected_provisions: text("affected_provisions").array(), // Constitutional articles or statutory provisions
  
  // Fact-checking workflow
  fact_check_status: verificationStatusEnum("fact_check_status").notNull().default("pending"),
  fact_check_notes: text("fact_check_notes"),
  fact_check_sources: jsonb("fact_check_sources"), // Array of {url, title, date, credibility}
  fact_checked_by: uuid("fact_checked_by").references(() => users.id),
  fact_checked_at: timestamp("fact_checked_at", { withTimezone: true }),
  
  // Impact tracking
  included_in_briefs_count: integer("included_in_briefs_count").notNull().default(0),
  legislative_response: text("legislative_response"),
  response_received_at: timestamp("response_received_at", { withTimezone: true }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Core access patterns
  billIdx: index("idx_claims_bill").on(table.bill_id),
  billPositionIdx: index("idx_claims_bill_position").on(table.bill_id, table.position),
  
  // Prioritization queries - most important for brief generation
  importanceIdx: index("idx_claims_importance").on(table.importance_score).where(sql`${table.importance_score} > 5.0`),
  billImportanceIdx: index("idx_claims_bill_importance")
    .on(table.bill_id, table.importance_score, table.argument_cluster_size)
    .where(sql`${table.importance_score} > 5.0`), // Composite index for top claims per bill
  
  // Categorization and filtering
  categoryIdx: index("idx_claims_category").on(table.claim_category),
  countiesIdx: index("idx_claims_counties").using("gin", table.counties_represented),
  
  // Fact-checking workflow
  factCheckStatusIdx: index("idx_claims_fact_check_status").on(table.fact_check_status, table.bill_id),
  
  // Full-text search on claim text for semantic queries
  claimTextSearchIdx: index("idx_claims_text_search").using("gin", sql`to_tsvector('english', ${table.claim_text})`),
}));

// ============================================================================
// EVIDENCE - Track sources that support or refute claims
// ============================================================================

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Evidence classification
  evidence_type: varchar("evidence_type", { length: 50 }).notNull(), // "research", "govt_data", "news", "expert_testimony", "lived_experience"
  evidence_text: text("evidence_text").notNull(),
  evidence_summary: varchar("evidence_summary", { length: 500 }),
  
  // Source metadata - structured for citation generation
  source_title: varchar("source_title", { length: 500 }),
  source_author: varchar("source_author", { length: 255 }),
  source_organization: varchar("source_organization", { length: 255 }),
  source_url: varchar("source_url", { length: 1000 }),
  publication_date: date("publication_date"),
  
  // Credibility assessment - critical for evidence quality filtering
  source_credibility: varchar("source_credibility", { length: 10 }), // "high", "medium", "low", "unknown"
  credibility_reasoning: text("credibility_reasoning"),
  peer_reviewed: boolean("peer_reviewed").notNull().default(false),
  
  // Verification workflow
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verification_method: varchar("verification_method", { length: 50 }), // "automated", "manual", "expert"
  verified_by: uuid("verified_by").references(() => users.id),
  verified_at: timestamp("verified_at", { withTimezone: true }),
  verification_notes: text("verification_notes"),
  
  // Linkage - using arrays for many-to-many relationships without junction tables
  supporting_arguments: uuid("supporting_arguments").array(),
  supporting_claims: uuid("supporting_claims").array(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Evidence discovery and filtering
  evidenceTypeIdx: index("idx_evidence_type").on(table.evidence_type),
  sourceOrgIdx: index("idx_evidence_source_org").on(table.source_organization),
  credibilityIdx: index("idx_evidence_credibility")
    .on(table.source_credibility, table.verification_status),
  
  // Verification workflow
  verificationStatusIdx: index("idx_evidence_verification_status")
    .on(table.verification_status)
    .where(sql`${table.verification_status} = 'pending'`), // Partial index for pending items
  verifiedByIdx: index("idx_evidence_verified_by").on(table.verified_by),
  
  // Temporal queries
  publicationDateIdx: index("idx_evidence_publication_date").on(table.publication_date),
  
  // Array relationship queries
  supportingArgumentsIdx: index("idx_evidence_supporting_arguments").using("gin", table.supporting_arguments),
  supportingClaimsIdx: index("idx_evidence_supporting_claims").using("gin", table.supporting_claims),
}));

// ============================================================================
// ARGUMENT RELATIONSHIPS - Graph of how arguments connect and interact
// ============================================================================

export const argument_relationships = pgTable("argument_relationships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  source_argument_id: uuid("source_argument_id").notNull().references(() => argumentTable.id, { onDelete: "cascade" }),
  target_argument_id: uuid("target_argument_id").notNull().references(() => argumentTable.id, { onDelete: "cascade" }),
  
  // Relationship semantics
  relationship_type: varchar("relationship_type", { length: 20 }).notNull(), // "supports", "contradicts", "elaborates", "analogous"
  relationship_strength: smallint("relationship_strength"), // 0-100 confidence score
  
  reasoning: text("reasoning"), // Explanation of the relationship
  supporting_evidence_ids: uuid("supporting_evidence_ids").array(), // Evidence that demonstrates this relationship
  
  // Context for scoping queries
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Graph traversal optimization - both directions
  sourceIdx: index("idx_arg_rel_source").on(table.source_argument_id),
  targetIdx: index("idx_arg_rel_target").on(table.target_argument_id),
  
  // Scoped queries
  billIdx: index("idx_arg_rel_bill").on(table.bill_id),
  billTypeIdx: index("idx_arg_rel_bill_type").on(table.bill_id, table.relationship_type),
  
  // Quality filtering for strong relationships
  strengthIdx: index("idx_arg_rel_strength")
    .on(table.relationship_strength, table.relationship_type)
    .where(sql`${table.relationship_strength} >= 70`),
  
  // Prevent duplicate relationships
  uniqueRelationship: uniqueIndex("idx_arg_rel_unique")
    .on(table.source_argument_id, table.target_argument_id, table.relationship_type),
}));

// ============================================================================
// LEGISLATIVE BRIEFS - Synthesized documents for decision-makers
// ============================================================================

export const legislative_briefs = pgTable("legislative_briefs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  brief_title: varchar("brief_title", { length: 500 }).notNull(),
  brief_summary: text("brief_summary").notNull(),
  brief_version: integer("brief_version").notNull().default(1), // Track iterations and updates
  
  // Content structure - using JSONB for flexible structured data
  key_claims_ids: uuid("key_claims_ids").array(), // References to claims table
  constitutional_implications: jsonb("constitutional_implications"),
  stakeholder_positions: jsonb("stakeholder_positions"), // {group_name: {position, key_points, count}}
  
  // Representation metrics - essential for legitimacy
  constituent_participation: jsonb("constituent_participation"), // {total_participants, unique_comments, avg_quality}
  geographic_distribution: jsonb("geographic_distribution"), // {county: participation_count}
  demographic_breakdown: jsonb("demographic_breakdown"), // {age_groups, gender, urban_rural}
  
  // Delivery tracking for accountability
  delivery_status: varchar("delivery_status", { length: 20 }).notNull().default("draft"), // "draft", "ready", "sent", "acknowledged"
  delivery_method: varchar("delivery_method", { length: 50 }), // "email", "hand_delivery", "parliamentary_portal"
  delivered_to: jsonb("delivered_to"), // [{recipient_name, office, email, delivery_timestamp}]
  delivery_date: timestamp("delivery_date", { withTimezone: true }),
  
  // Response tracking - measuring impact
  responses_received: integer("responses_received").notNull().default(0),
  response_summary: text("response_summary"),
  response_attachments: jsonb("response_attachments"), // [{type, url, received_date}]
  
  // Generation metadata for transparency
  generated_by: uuid("generated_by").references(() => users.id),
  generation_method: varchar("generation_method", { length: 50 }).notNull(), // "automated", "semi_automated", "manual"
  generation_timestamp: timestamp("generation_timestamp", { withTimezone: true }).notNull().defaultNow(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Core queries
  billIdx: index("idx_briefs_bill").on(table.bill_id),
  deliveryStatusIdx: index("idx_briefs_delivery_status").on(table.delivery_status),
  
  // Workflow tracking
  billVersionIdx: index("idx_briefs_bill_version").on(table.bill_id, table.brief_version),
  deliveryDateIdx: index("idx_briefs_delivery_date").on(table.delivery_date),
  
  // Impact analysis
  generationMethodIdx: index("idx_briefs_generation_method").on(table.generation_method),
  
  // Array searches
  keyClaimsIdx: index("idx_briefs_key_claims").using("gin", table.key_claims_ids),
}));

// ============================================================================
// SYNTHESIS JOBS - Background processing tracking for async operations
// ============================================================================

export const synthesis_jobs = pgTable("synthesis_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  job_type: varchar("job_type", { length: 30 }).notNull(), // "extract_args", "cluster_claims", "verify_evidence", "generate_brief"
  
  // Processing state machine
  status: varchar("status", { length: 20 }).notNull().default("queued"), // "queued", "processing", "completed", "failed", "cancelled"
  progress_percent: smallint("progress_percent").notNull().default(0), // 0-100
  
  // Input/output metrics for monitoring
  input_count: integer("input_count"), // e.g., comments to process
  output_count: integer("output_count"), // e.g., arguments extracted
  
  // Error handling for resilience
  error_message: text("error_message"),
  error_stack: text("error_stack"), // Full stack trace for debugging
  retry_count: smallint("retry_count").notNull().default(0),
  max_retries: smallint("max_retries").notNull().default(3),
  
  // Processing metadata for distributed systems
  processing_node: varchar("processing_node", { length: 100 }), // Server/worker identifier
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  duration_seconds: integer("duration_seconds"), // Computed: completed_at - started_at
  
  // Configuration for job execution
  job_config: jsonb("job_config"), // Job-specific parameters
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Job queue management
  billIdx: index("idx_synthesis_jobs_bill").on(table.bill_id),
  statusIdx: index("idx_synthesis_jobs_status").on(table.status),
  queueIdx: index("idx_synthesis_jobs_queue")
    .on(table.status, table.created_at)
    .where(sql`${table.status} IN ('queued', 'processing')`), // Active jobs only
  
  // Job type filtering
  jobTypeIdx: index("idx_synthesis_jobs_type").on(table.job_type),
  billTypeIdx: index("idx_synthesis_jobs_bill_type").on(table.bill_id, table.job_type, table.status),
  
  // Performance monitoring
  createdAtIdx: index("idx_synthesis_jobs_created_at").on(table.created_at),
  durationIdx: index("idx_synthesis_jobs_duration").on(table.duration_seconds).where(sql`${table.duration_seconds} IS NOT NULL`),
}));

// ============================================================================
// RELATIONSHIPS (Drizzle ORM)
// ============================================================================

export const argumentsRelations = relations(argumentTable, ({ one, many }) => ({
  comment: one(comments, {
    fields: [argumentTable.comment_id],
    references: [comments.id],
  }),
  bill: one(bills, {
    fields: [argumentTable.bill_id],
    references: [bills.id],
  }),
  claim: one(claims, {
    fields: [argumentTable.claim_id],
    references: [claims.id],
  }),
  parentArgument: one(argumentTable, {
    fields: [argumentTable.parent_argument_id],
    references: [argumentTable.id],
    relationName: "hierarchy",
  }),
  childArguments: many(argumentTable, {
    relationName: "hierarchy",
  }),
  outgoingRelationships: many(argument_relationships, {
    relationName: "source",
  }),
  incomingRelationships: many(argument_relationships, {
    relationName: "target",
  }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  bill: one(bills, {
    fields: [claims.bill_id],
    references: [bills.id],
  }),
  factCheckedBy: one(users, {
    fields: [claims.fact_checked_by],
    references: [users.id],
  }),
  arguments: many(argumentTable),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  verifiedBy: one(users, {
    fields: [evidence.verified_by],
    references: [users.id],
  }),
}));

export const argumentRelationshipsRelations = relations(argument_relationships, ({ one }) => ({
  sourceArgument: one(argumentTable, {
    fields: [argument_relationships.source_argument_id],
    references: [argumentTable.id],
    relationName: "source",
  }),
  targetArgument: one(argumentTable, {
    fields: [argument_relationships.target_argument_id],
    references: [argumentTable.id],
    relationName: "target",
  }),
  bill: one(bills, {
    fields: [argument_relationships.bill_id],
    references: [bills.id],
  }),
}));

export const legislativeBriefsRelations = relations(legislative_briefs, ({ one }) => ({
  bill: one(bills, {
    fields: [legislative_briefs.bill_id],
    references: [bills.id],
  }),
  generatedBy: one(users, {
    fields: [legislative_briefs.generated_by],
    references: [users.id],
  }),
}));

export const synthesisJobsRelations = relations(synthesis_jobs, ({ one }) => ({
  bill: one(bills, {
    fields: [synthesis_jobs.bill_id],
    references: [bills.id],
  }),
}));