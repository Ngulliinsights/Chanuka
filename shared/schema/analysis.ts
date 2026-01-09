// ============================================================================
// ANALYSIS SCHEMA - Drizzle table for analysis records
// ============================================================================
import { sql } from "drizzle-orm";
import { pgTable, numeric, text, jsonb, boolean, timestamp, uuid as uuidType, varchar, index } from "drizzle-orm/pg-core";

import { bills, users } from "./foundation";

import { auditFields } from "./base-types";
export const analysis = pgTable("analysis", {
  id: uuidType("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuidType("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  analysis_type: varchar("analysis_type", { length: 50 }).notNull(),
  results: jsonb("results").notNull().default(sql`'{}'::jsonb`),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default(sql`0`),
  model_version: text("model_version"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  is_approved: boolean("is_approved").notNull().default(false),
  approved_by: uuidType("approved_by").references(() => users.id, { onDelete: "set null" }),
  ...auditFields(),
}, (table) => ({
  // Performance indexes for common queries
  billIdIdx: index("idx_analysis_bill_id").on(table.bill_id),
  analysisTypeIdx: index("idx_analysis_type").on(table.analysis_type),
  createdAtIdx: index("idx_analysis_created_at").on(table.created_at.desc()),
  approvedByIdx: index("idx_analysis_approved_by").on(table.approved_by)
    .where(sql`${table.approved_by} IS NOT NULL`),
}));

// Types
export type Analysis = typeof analysis.$inferSelect;
export type NewAnalysis = typeof analysis.$inferInsert;



