import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  currentPhase: text("current_phase").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  phase: text("phase").notNull(),
  status: text("status").notNull().default("planned"), // planned, in_progress, completed, failed
  targetDate: timestamp("target_date"),
  completedDate: timestamp("completed_date"),
  successRate: integer("success_rate"), // percentage
  metrics: jsonb("metrics"), // JSON object with various metrics
  createdAt: timestamp("created_at").defaultNow(),
});

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0),
  status: text("status").notNull().default("inactive"), // inactive, testing, active, disabled
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  metricType: text("metric_type").notNull(), // dau, engagement, retention, etc.
  value: integer("value").notNull(),
  change: integer("change"), // percentage change from previous period
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const pivotDecisions = pgTable("pivot_decisions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  checkpointId: integer("checkpoint_id"),
  decisionType: text("decision_type").notNull(), // continue, pivot_ai, pivot_community
  reasoning: text("reasoning"),
  metrics: jsonb("metrics"), // Decision criteria and scores
  status: text("status").notNull().default("pending"), // pending, approved, implemented
  createdAt: timestamp("created_at").defaultNow(),
});

export const architectureComponents = pgTable("architecture_components", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // core, plugin, service
  status: text("status").notNull(), // stable, active_dev, refactoring, planned
  isSwappable: boolean("is_swappable").default(false),
  dependencies: jsonb("dependencies"), // Array of component IDs
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({ id: true, createdAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true });
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics).omit({ id: true, recordedAt: true });
export const insertPivotDecisionSchema = createInsertSchema(pivotDecisions).omit({ id: true, createdAt: true });
export const insertArchitectureComponentSchema = createInsertSchema(architectureComponents).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type PivotDecision = typeof pivotDecisions.$inferSelect;
export type InsertPivotDecision = z.infer<typeof insertPivotDecisionSchema>;
export type ArchitectureComponent = typeof architectureComponents.$inferSelect;
export type InsertArchitectureComponent = z.infer<typeof insertArchitectureComponentSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
