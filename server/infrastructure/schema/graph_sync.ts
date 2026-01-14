// ============================================================================
// SYNC TRACKING SCHEMA - Graph Synchronization Status
// ============================================================================
// Tracks synchronization state between PostgreSQL and Neo4j to detect:
// - Data divergence/conflicts
// - Sync failures and retries
// - Stale data in graph
// - Missing or orphaned nodes/relationships

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, varchar,
  index, unique, check
} from "drizzle-orm/pg-core";

import {
  primaryKeyUuid,
  auditFields,
} from "./base-types";

// ============================================================================
// SYNC STATUS TRACKING - Entity synchronization state
// ============================================================================
// Records when each entity was last synced to Neo4j
// Enables incremental sync and conflict detection

export const graph_sync_status = pgTable("graph_sync_status", {
  id: primaryKeyUuid(),

  // Entity identification
  entity_type: varchar("entity_type", { length: 50 }).notNull(),
  // Values: 'User', 'Person', 'Governor', 'Bill', 'Committee', 'Argument',
  //         'Claim', 'ParliamentarySession', 'ParliamentarySitting', 'Topic'

  entity_id: uuid("entity_id").notNull(),

  // Sync status tracking
  sync_status: varchar("sync_status", { length: 20 }).notNull().default("pending"),
  // Values: 'pending', 'in_progress', 'synced', 'failed', 'conflict'

  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),
  sync_attempts: integer("sync_attempts").notNull().default(0),
  max_sync_attempts: integer("max_sync_attempts").notNull().default(3),

  // Error tracking
  last_error: text("last_error"),
  error_details: jsonb("error_details").notNull().default(sql`'[]'::jsonb`),
  // Array of {attempt_number, timestamp, error_message, error_code}

  // Conflict detection
  has_conflicts: boolean("has_conflicts").notNull().default(false),
  conflict_details: jsonb("conflict_details").notNull().default(sql`'{}'::jsonb`),
  // {postgresql_values: {}, neo4j_values: {}, conflicting_fields: []}

  // Sync metadata
  synced_fields: varchar("synced_fields", { length: 1000 }).array(), // List of synced fields
  skipped_fields: varchar("skipped_fields", { length: 1000 }).array(), // Fields not synced

  // Relationships synced (for relationship tracking)
  synced_relationships: jsonb("synced_relationships").notNull().default(sql`'[]'::jsonb`),
  // Array of {relationship_type, target_entity_type, target_entity_id}

  // Data provenance
  source_system: varchar("source_system", { length: 50 }).notNull().default("postgresql"),
  // Primary source (always PostgreSQL for now)

  ...auditFields(),
}, (table) => ({
  // Unique: one sync record per entity
  entityUnique: unique("graph_sync_status_entity_unique")
    .on(table.entity_type, table.entity_id),

  // Hot path: Find entities needing sync
  syncStatusIdx: index("idx_graph_sync_status_pending")
    .on(table.sync_status, table.last_synced_at)
    .where(sql`${table.sync_status} IN ('pending', 'failed')`),

  // Conflict detection
  conflictIdx: index("idx_graph_sync_status_conflicts")
    .on(table.has_conflicts, table.entity_type)
    .where(sql`${table.has_conflicts} = true`),

  // Retry management
  retryIdx: index("idx_graph_sync_status_retry")
    .on(table.sync_attempts, table.sync_status)
    .where(sql`${table.sync_attempts} < ${table.max_sync_attempts} AND ${table.sync_status} = 'failed'`),

  // Find stale syncs (not synced in last 24 hours)
  staleIdx: index("idx_graph_sync_status_stale")
    .on(table.last_synced_at)
    .where(sql`${table.last_synced_at} < NOW() - INTERVAL '24 hours'`),

  // Entity type queries
  typeIdx: index("idx_graph_sync_status_type")
    .on(table.entity_type, table.sync_status),

  // Data validation
  attemptsCheck: check("sync_attempts_check",
    sql`${table.sync_attempts} >= 0 AND ${table.sync_attempts} <= ${table.max_sync_attempts}`),
}));

// ============================================================================
// SYNC FAILURE LOG - Detailed failure tracking
// ============================================================================
// Maintains history of all sync failures for debugging and monitoring

export const graph_sync_failures = pgTable("graph_sync_failures", {
  id: primaryKeyUuid(),

  // Reference to sync status
  sync_status_id: uuid("sync_status_id").notNull().references(() => graph_sync_status.id, {
    onDelete: "cascade"
  }),

  // Entity information
  entity_type: varchar("entity_type", { length: 50 }).notNull(),
  entity_id: uuid("entity_id").notNull(),

  // Failure details
  attempt_number: integer("attempt_number").notNull(),
  failure_type: varchar("failure_type", { length: 50 }).notNull(),
  // Values: 'connection_error', 'validation_error', 'constraint_violation',
  //         'timeout', 'data_type_mismatch', 'relationship_error', 'unknown'

  failure_message: text("failure_message").notNull(),
  error_code: varchar("error_code", { length: 50 }),
  stack_trace: text("stack_trace"),

  // Context
  failed_operation: varchar("failed_operation", { length: 200 }),
  // Example: "syncEntity('Person', {...})" or "createSponsorshipRelationship(...)"

  failed_payload: jsonb("failed_payload").notNull().default(sql`'{}'::jsonb`),
  // The data that failed to sync

  // Retry decision
  is_retryable: boolean("is_retryable").notNull().default(true),
  retry_after_seconds: integer("retry_after_seconds"),

  ...auditFields(),
}, (table) => ({
  // Find failures by entity
  entityIdx: index("idx_graph_sync_failures_entity")
    .on(table.entity_type, table.entity_id, table.created_at.desc()),

  // Find recent failures (last 24 hours)
  recentFailuresIdx: index("idx_graph_sync_failures_recent")
    .on(table.created_at.desc())
    .where(sql`${table.created_at} > NOW() - INTERVAL '24 hours'`),

  // Find retryable failures
  retryableIdx: index("idx_graph_sync_failures_retryable")
    .on(table.is_retryable, table.failure_type)
    .where(sql`${table.is_retryable} = true`),

  // Failure type analysis
  typeIdx: index("idx_graph_sync_failures_type")
    .on(table.failure_type, table.created_at.desc()),
}));

// ============================================================================
// SYNC RELATIONSHIP TRACKING - Relationship synchronization state
// ============================================================================
// Tracks which relationships have been synced between entities

export const graph_sync_relationships = pgTable("graph_sync_relationships", {
  id: primaryKeyUuid(),

  // Relationship definition
  from_entity_type: varchar("from_entity_type", { length: 50 }).notNull(),
  from_entity_id: uuid("from_entity_id").notNull(),

  to_entity_type: varchar("to_entity_type", { length: 50 }).notNull(),
  to_entity_id: uuid("to_entity_id").notNull(),

  relationship_type: varchar("relationship_type", { length: 100 }).notNull(),
  // Examples: 'SPONSORED', 'MEMBER_OF', 'ASSIGNED_TO', 'MENTIONS_TOPIC', etc.

  // PostgreSQL source
  source_table: varchar("source_table", { length: 100 }).notNull(),
  // Which PostgreSQL table/column this relationship comes from

  // Sync status
  sync_status: varchar("sync_status", { length: 20 }).notNull().default("pending"),
  // Values: 'pending', 'synced', 'failed'

  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),

  // Relationship properties (subset of Neo4j properties)
  relationship_properties: jsonb("relationship_properties").notNull().default(sql`'{}'::jsonb`),

  // Sync metadata
  is_deleted: boolean("is_deleted").notNull().default(false),
  // Set when relationship is deleted in PostgreSQL

  deleted_at: timestamp("deleted_at", { withTimezone: true }),

  ...auditFields(),
}, (table) => ({
  // Unique: one record per relationship
  relationshipUnique: unique("graph_sync_relationships_unique")
    .on(
      table.from_entity_type,
      table.from_entity_id,
      table.to_entity_type,
      table.to_entity_id,
      table.relationship_type
    ),

  // Find unsync'd relationships
  syncStatusIdx: index("idx_graph_sync_relationships_status")
    .on(table.sync_status, table.last_synced_at)
    .where(sql`${table.sync_status} IN ('pending', 'failed')`),

  // Find deleted relationships (for cleanup)
  deletedIdx: index("idx_graph_sync_relationships_deleted")
    .on(table.is_deleted)
    .where(sql`${table.is_deleted} = true`),

  // Find relationships from source entity
  fromEntityIdx: index("idx_graph_sync_relationships_from")
    .on(table.from_entity_type, table.from_entity_id),

  // Find relationships to target entity
  toEntityIdx: index("idx_graph_sync_relationships_to")
    .on(table.to_entity_type, table.to_entity_id),

  // Find relationships by type
  typeIdx: index("idx_graph_sync_relationships_type")
    .on(table.relationship_type, table.sync_status),
}));

// ============================================================================
// SYNC BATCH LOG - Batch synchronization tracking
// ============================================================================
// Records batch sync operations for monitoring and debugging

export const graph_sync_batches = pgTable("graph_sync_batches", {
  id: primaryKeyUuid(),

  // Batch identification
  batch_name: varchar("batch_name", { length: 100 }).notNull(),
  batch_type: varchar("batch_type", { length: 50 }).notNull(),
  // Values: 'full_sync', 'incremental_sync', 'entity_type_sync', 'relationship_sync', 'conflict_resolution'

  trigger_reason: varchar("trigger_reason", { length: 200 }),
  // Why was this batch triggered: 'scheduled', 'manual', 'failure_retry', 'conflict_detection'

  // Entity type(s) synced
  entity_types_synced: varchar("entity_types_synced", { length: 500 }).array(),

  // Batch statistics
  total_entities: integer("total_entities").notNull().default(0),
  synced_entities: integer("synced_entities").notNull().default(0),
  failed_entities: integer("failed_entities").notNull().default(0),
  skipped_entities: integer("skipped_entities").notNull().default(0),

  total_relationships: integer("total_relationships").notNull().default(0),
  synced_relationships: integer("synced_relationships").notNull().default(0),
  failed_relationships: integer("failed_relationships").notNull().default(0),

  // Timing
  started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  duration_seconds: integer("duration_seconds"),

  // Status
  batch_status: varchar("batch_status", { length: 20 }).notNull().default("in_progress"),
  // Values: 'in_progress', 'completed', 'failed', 'partial'

  // Monitoring
  batch_summary: text("batch_summary"),
  error_summary: text("error_summary"),

  // Batch configuration
  batch_size: integer("batch_size").notNull().default(100),
  // Number of entities processed per transaction

  ...auditFields(),
}, (table) => ({
  // Find recent batches
  recentBatchesIdx: index("idx_graph_sync_batches_recent")
    .on(table.started_at.desc()),

  // Find failed batches
  failedBatchesIdx: index("idx_graph_sync_batches_failed")
    .on(table.batch_status, table.completed_at)
    .where(sql`${table.batch_status} IN ('failed', 'partial')`),

  // Find batches by type
  typeIdx: index("idx_graph_sync_batches_type")
    .on(table.batch_type, table.batch_status),

  // Performance analysis: batches by duration
  durationIdx: index("idx_graph_sync_batches_duration")
    .on(table.duration_seconds)
    .where(sql`${table.completed_at} IS NOT NULL`),

  // Data validation
  statsCheck: check("sync_batch_stats_check",
    sql`${table.synced_entities} + ${table.failed_entities} + ${table.skipped_entities} = ${table.total_entities}`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe ORM relations
// ============================================================================

export const graphSyncStatusRelations = relations(graph_sync_status, ({ many }) => ({
  failures: many(graph_sync_failures),
  relationships: many(graph_sync_relationships),
}));

export const graphSyncFailuresRelations = relations(graph_sync_failures, ({ one }) => ({
  syncStatus: one(graph_sync_status, {
    fields: [graph_sync_failures.sync_status_id],
    references: [graph_sync_status.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript type safety
// ============================================================================

export type GraphSyncStatus = typeof graph_sync_status.$inferSelect;
export type NewGraphSyncStatus = typeof graph_sync_status.$inferInsert;

export type GraphSyncFailure = typeof graph_sync_failures.$inferSelect;
export type NewGraphSyncFailure = typeof graph_sync_failures.$inferInsert;

export type GraphSyncRelationship = typeof graph_sync_relationships.$inferSelect;
export type NewGraphSyncRelationship = typeof graph_sync_relationships.$inferInsert;

export type GraphSyncBatch = typeof graph_sync_batches.$inferSelect;
export type NewGraphSyncBatch = typeof graph_sync_batches.$inferInsert;
