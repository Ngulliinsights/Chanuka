// ============================================================================
// INTEGRATION MONITORING SCHEMA
// ============================================================================
// Tracks feature usage, performance metrics, health status, and alerts
// for all integrated features in the strategic integration project

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { auditFields, primaryKeyUuid } from "./base-types";

// ============================================================================
// INTEGRATION FEATURES - Registry of all integrated features
// ============================================================================

export const integrationFeatures = pgTable(
  "integration_features",
  {
    id: primaryKeyUuid(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(), // 'quick-wins', 'strategic', 'advanced'
    phase: integer("phase").notNull(), // 1, 2, or 3
    enabled: boolean("enabled").notNull().default(false),
    healthStatus: varchar("health_status", { length: 20 }).notNull().default('unknown'), // 'healthy', 'degraded', 'down', 'unknown'
    lastHealthCheck: timestamp("last_health_check"),
    metadata: jsonb("metadata"),
    ...auditFields,
  },
  (table) => ({
    nameIdx: index("integration_features_name_idx").on(table.name),
    categoryIdx: index("integration_features_category_idx").on(table.category),
    phaseIdx: index("integration_features_phase_idx").on(table.phase),
    healthStatusIdx: index("integration_features_health_status_idx").on(table.healthStatus),
  })
);

// ============================================================================
// FEATURE METRICS - Time-series metrics for feature usage and performance
// ============================================================================

export const featureMetrics = pgTable(
  "feature_metrics",
  {
    id: primaryKeyUuid(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => integrationFeatures.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    
    // Usage metrics
    activeUsers: integer("active_users").notNull().default(0),
    totalRequests: integer("total_requests").notNull().default(0),
    successfulRequests: integer("successful_requests").notNull().default(0),
    failedRequests: integer("failed_requests").notNull().default(0),
    
    // Performance metrics
    avgResponseTime: numeric("avg_response_time", { precision: 10, scale: 2 }), // milliseconds
    p95ResponseTime: numeric("p95_response_time", { precision: 10, scale: 2 }),
    p99ResponseTime: numeric("p99_response_time", { precision: 10, scale: 2 }),
    
    // Error metrics
    errorRate: numeric("error_rate", { precision: 5, scale: 4 }), // percentage (0-1)
    errorCount: integer("error_count").notNull().default(0),
    
    // Additional metrics
    metadata: jsonb("metadata"),
    ...auditFields,
  },
  (table) => ({
    featureTimestampIdx: index("feature_metrics_feature_timestamp_idx").on(
      table.featureId,
      table.timestamp
    ),
    timestampIdx: index("feature_metrics_timestamp_idx").on(table.timestamp),
  })
);

// ============================================================================
// HEALTH CHECKS - Feature health check results
// ============================================================================

export const healthChecks = pgTable(
  "health_checks",
  {
    id: primaryKeyUuid(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => integrationFeatures.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    status: varchar("status", { length: 20 }).notNull(), // 'healthy', 'degraded', 'down'
    responseTime: numeric("response_time", { precision: 10, scale: 2 }), // milliseconds
    statusCode: integer("status_code"),
    errorMessage: text("error_message"),
    details: jsonb("details"),
    ...auditFields,
  },
  (table) => ({
    featureTimestampIdx: index("health_checks_feature_timestamp_idx").on(
      table.featureId,
      table.timestamp
    ),
    statusIdx: index("health_checks_status_idx").on(table.status),
  })
);

// ============================================================================
// INTEGRATION ALERTS - Alerts for feature issues
// ============================================================================

export const integrationAlerts = pgTable(
  "integration_alerts",
  {
    id: primaryKeyUuid(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => integrationFeatures.id, { onDelete: "cascade" }),
    severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
    type: varchar("type", { length: 50 }).notNull(), // 'error_rate', 'response_time', 'health_check', 'usage'
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    threshold: jsonb("threshold"), // The threshold that was exceeded
    actualValue: jsonb("actual_value"), // The actual value that triggered the alert
    triggered: boolean("triggered").notNull().default(true),
    acknowledged: boolean("acknowledged").notNull().default(false),
    acknowledgedBy: uuid("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolved: boolean("resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    metadata: jsonb("metadata"),
    ...auditFields,
  },
  (table) => ({
    featureIdx: index("integration_alerts_feature_idx").on(table.featureId),
    severityIdx: index("integration_alerts_severity_idx").on(table.severity),
    triggeredIdx: index("integration_alerts_triggered_idx").on(table.triggered),
    resolvedIdx: index("integration_alerts_resolved_idx").on(table.resolved),
  })
);

// ============================================================================
// ALERT RULES - Configurable alert rules for monitoring
// ============================================================================

export const alertRules = pgTable(
  "alert_rules",
  {
    id: primaryKeyUuid(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => integrationFeatures.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    
    // Rule conditions
    metric: varchar("metric", { length: 50 }).notNull(), // 'error_rate', 'response_time', 'active_users', etc.
    operator: varchar("operator", { length: 20 }).notNull(), // 'gt', 'lt', 'eq', 'gte', 'lte'
    threshold: numeric("threshold", { precision: 10, scale: 2 }).notNull(),
    timeWindow: integer("time_window").notNull(), // minutes
    
    // Alert configuration
    severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
    cooldown: integer("cooldown").notNull().default(15), // minutes before re-alerting
    
    // Notification configuration
    notificationChannels: jsonb("notification_channels"), // ['email', 'webhook', 'log']
    
    metadata: jsonb("metadata"),
    ...auditFields,
  },
  (table) => ({
    featureIdx: index("alert_rules_feature_idx").on(table.featureId),
    enabledIdx: index("alert_rules_enabled_idx").on(table.enabled),
    uniqueFeatureMetric: unique("alert_rules_feature_metric_unique").on(
      table.featureId,
      table.name
    ),
  })
);

// ============================================================================
// INTEGRATION LOGS - Detailed logs for integration events
// ============================================================================

export const integrationLogs = pgTable(
  "integration_logs",
  {
    id: primaryKeyUuid(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => integrationFeatures.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    level: varchar("level", { length: 20 }).notNull(), // 'debug', 'info', 'warn', 'error'
    category: varchar("category", { length: 50 }).notNull(), // 'api', 'sync', 'health', 'alert'
    message: text("message").notNull(),
    details: jsonb("details"),
    userId: uuid("user_id"),
    requestId: varchar("request_id", { length: 100 }),
    ...auditFields,
  },
  (table) => ({
    featureTimestampIdx: index("integration_logs_feature_timestamp_idx").on(
      table.featureId,
      table.timestamp
    ),
    levelIdx: index("integration_logs_level_idx").on(table.level),
    categoryIdx: index("integration_logs_category_idx").on(table.category),
    timestampIdx: index("integration_logs_timestamp_idx").on(table.timestamp),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const integrationFeaturesRelations = relations(integrationFeatures, ({ many }) => ({
  metrics: many(featureMetrics),
  healthChecks: many(healthChecks),
  alerts: many(integrationAlerts),
  alertRules: many(alertRules),
  logs: many(integrationLogs),
}));

export const featureMetricsRelations = relations(featureMetrics, ({ one }) => ({
  feature: one(integrationFeatures, {
    fields: [featureMetrics.featureId],
    references: [integrationFeatures.id],
  }),
}));

export const healthChecksRelations = relations(healthChecks, ({ one }) => ({
  feature: one(integrationFeatures, {
    fields: [healthChecks.featureId],
    references: [integrationFeatures.id],
  }),
}));

export const integrationAlertsRelations = relations(integrationAlerts, ({ one }) => ({
  feature: one(integrationFeatures, {
    fields: [integrationAlerts.featureId],
    references: [integrationFeatures.id],
  }),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  feature: one(integrationFeatures, {
    fields: [alertRules.featureId],
    references: [integrationFeatures.id],
  }),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  feature: one(integrationFeatures, {
    fields: [integrationLogs.featureId],
    references: [integrationFeatures.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IntegrationFeature = typeof integrationFeatures.$inferSelect;
export type NewIntegrationFeature = typeof integrationFeatures.$inferInsert;

export type FeatureMetric = typeof featureMetrics.$inferSelect;
export type NewFeatureMetric = typeof featureMetrics.$inferInsert;

export type HealthCheck = typeof healthChecks.$inferSelect;
export type NewHealthCheck = typeof healthChecks.$inferInsert;

export type IntegrationAlert = typeof integrationAlerts.$inferSelect;
export type NewIntegrationAlert = typeof integrationAlerts.$inferInsert;

export type AlertRule = typeof alertRules.$inferSelect;
export type NewAlertRule = typeof alertRules.$inferInsert;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type NewIntegrationLog = typeof integrationLogs.$inferInsert;
