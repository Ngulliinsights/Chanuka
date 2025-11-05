// ============================================================================
// ANALYSIS SCHEMA - Drizzle table for analysis records
// ============================================================================
import { pgTable, integer, numeric, text, jsonb, boolean, timestamp, uuid as uuidType, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bills, users } from "./foundation";

export const analysis = pgTable("analysis", {
  id: integer("id").primaryKey(),
  bill_id: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  analysis_type: varchar("analysis_type", { length: 50 }).notNull(),
  results: jsonb("results").notNull().default(sql`'{}'::jsonb`),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default(sql`0`),
  model_version: text("model_version"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  is_approved: boolean("is_approved").notNull().default(false),
  approved_by: uuidType("approved_by").references(() => users.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique per bill and analysis type could be enforced via migration
  // Add indexes in SQL migrations as needed
}));

// Types
export type Analysis = typeof analysis.$inferSelect;
export type NewAnalysis = typeof analysis.$inferInsert;
