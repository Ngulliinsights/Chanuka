// ============================================================================
// FEATURE FLAGS SCHEMA - Enhanced Feature Flag Management
// ============================================================================
// Supports: User targeting, percentage rollouts, A/B testing, analytics

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, varchar,
  index, unique, numeric
} from "drizzle-orm/pg-core";

import {
  primaryKeyUuid,
  auditFields,
  metadataField,
} from "./base-types";

// ============================================================================
// FEATURE FLAGS TABLE
// ============================================================================

export const featureFlags = pgTable("feature_flags", {
  id: primaryKeyUuid(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  
  // Rollout configuration
  rollout_percentage: integer("rollout_percentage").notNull().default(0),
  
  // User targeting
  user_targeting: jsonb("user_targeting").$type<{
    include?: string[];
    exclude?: string[];
    attributes?: Record<string, any>;
  }>(),
  
  // A/B testing configuration
  ab_test_config: jsonb("ab_test_config").$type<{
    variants: string[];
    distribution: number[];
    metrics: string[];
  }>(),
  
  // Dependencies
  dependencies: jsonb("dependencies").$type<string[]>().default(sql`'[]'::jsonb`),
  
  // Metadata
  metadata: metadataField(),
  
  // Audit fields
  ...auditFields(),
  updated_by: uuid("updated_by"),
}, (table) => ({
  // Unique constraint on name
  nameUnique: unique("feature_flags_name_unique").on(table.name),
  
  // Index for enabled flags
  enabledIdx: index("idx_feature_flags_enabled")
    .on(table.enabled, table.name)
    .where(sql`${table.enabled} = true`),
  
  // Index for rollout queries
  rolloutIdx: index("idx_feature_flags_rollout")
    .on(table.rollout_percentage, table.enabled),
}));

// ============================================================================
// FEATURE FLAG EVALUATIONS TABLE - Track flag evaluations for analytics
// ============================================================================

export const featureFlagEvaluations = pgTable("feature_flag_evaluations", {
  id: primaryKeyUuid(),
  flag_id: uuid("flag_id").notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id"),
  
  // Evaluation result
  enabled: boolean("enabled").notNull(),
  variant: varchar("variant", { length: 50 }),
  
  // Context
  evaluation_context: jsonb("evaluation_context").$type<Record<string, any>>(),
  
  // Timestamp
  evaluated_at: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index for analytics queries
  flagUserIdx: index("idx_feature_flag_evaluations_flag_user")
    .on(table.flag_id, table.user_id, table.evaluated_at.desc()),
  
  // Index for time-based analytics
  flagTimeIdx: index("idx_feature_flag_evaluations_flag_time")
    .on(table.flag_id, table.evaluated_at.desc()),
  
  // Index for variant analysis
  variantIdx: index("idx_feature_flag_evaluations_variant")
    .on(table.flag_id, table.variant, table.evaluated_at.desc())
    .where(sql`${table.variant} IS NOT NULL`),
}));

// ============================================================================
// FEATURE FLAG METRICS TABLE - Track performance metrics
// ============================================================================

export const featureFlagMetrics = pgTable("feature_flag_metrics", {
  id: primaryKeyUuid(),
  flag_id: uuid("flag_id").notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  
  // Metrics
  total_requests: integer("total_requests").notNull().default(0),
  enabled_requests: integer("enabled_requests").notNull().default(0),
  disabled_requests: integer("disabled_requests").notNull().default(0),
  error_count: integer("error_count").notNull().default(0),
  
  // Performance
  avg_response_time: numeric("avg_response_time", { precision: 10, scale: 2 }),
  
  // Time window
  window_start: timestamp("window_start", { withTimezone: true }).notNull(),
  window_end: timestamp("window_end", { withTimezone: true }).notNull(),
  
  // Metadata
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index for time-based queries
  flagTimeIdx: index("idx_feature_flag_metrics_flag_time")
    .on(table.flag_id, table.window_start.desc()),
  
  // Unique constraint on flag + time window
  flagWindowUnique: unique("feature_flag_metrics_flag_window_unique")
    .on(table.flag_id, table.window_start),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const featureFlagsRelations = relations(featureFlags, ({ many }) => ({
  evaluations: many(featureFlagEvaluations),
  metrics: many(featureFlagMetrics),
}));

export const featureFlagEvaluationsRelations = relations(featureFlagEvaluations, ({ one }) => ({
  flag: one(featureFlags, {
    fields: [featureFlagEvaluations.flag_id],
    references: [featureFlags.id],
  }),
}));

export const featureFlagMetricsRelations = relations(featureFlagMetrics, ({ one }) => ({
  flag: one(featureFlags, {
    fields: [featureFlagMetrics.flag_id],
    references: [featureFlags.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

export type FeatureFlagEvaluation = typeof featureFlagEvaluations.$inferSelect;
export type NewFeatureFlagEvaluation = typeof featureFlagEvaluations.$inferInsert;

export type FeatureFlagMetric = typeof featureFlagMetrics.$inferSelect;
export type NewFeatureFlagMetric = typeof featureFlagMetrics.$inferInsert;

