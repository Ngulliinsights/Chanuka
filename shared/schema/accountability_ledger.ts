// ============================================================================
// ACCOUNTABILITY LEDGER SCHEMA - The "Shadow Ledger"
// ============================================================================
// Immutable record of broken promises, missing funds, and governance gaps.
// Context: The "Receipt" of theft that cannot be erased.

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, date
} from "drizzle-orm/pg-core";

import { primaryKeyUuid } from "./base-types";
import { kenyanCountyEnum, violationTypeEnum } from "./enum";
import { bills, sponsors, users } from "./foundation";

// ============================================================================
// PUBLIC PROMISES - The Baseline
// ============================================================================

export const public_promises = pgTable("public_promises", {
  id: primaryKeyUuid(),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),

  // The Promise
  promise_text: text("promise_text").notNull(),
  promise_category: varchar("category", { length: 50 }).notNull(),
  geographic_target: kenyanCountyEnum("geographic_target"),

  // Timeline
  date_made: date("date_made").notNull(),
  promised_completion_date: date("promised_completion_date"),

  // Status
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, broken, fulfilled
  fulfillment_percentage: numeric("fulfillment_pct", { precision: 5, scale: 2 }),

  // Linkage
  related_bill_id: uuid("related_bill_id").references(() => bills.id),
  source_url: varchar("source_url", { length: 500 }), // Video/Tweet proof

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sponsorStatusIdx: index("idx_promises_sponsor_status").on(table.sponsor_id, table.status),
  brokenIdx: index("idx_promises_broken").on(table.status).where(sql`${table.status} = 'broken'`),
}));

// ============================================================================
// SHADOW LEDGER ENTRIES - The Violation Record
// ============================================================================

export const shadow_ledger_entries = pgTable("shadow_ledger_entries", {
  id: primaryKeyUuid(),
  entry_number: varchar("entry_number", { length: 50 }).unique().notNull(), // SL-2024-001

  // The Target
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id),
  entity_name: varchar("entity_name", { length: 255 }), // e.g., "Nairobi County"

  // The Violation
  violation_type: violationTypeEnum("violation_type").notNull(),
  description: text("description").notNull(),

  // The Cost (Economic Enforcement)
  estimated_loss_amount: numeric("estimated_loss_amount", { precision: 16, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('KES'),

  // Evidence (The Receipts)
  evidence_links: jsonb("evidence_links").notNull(), // Array of URLs/Hashes
  verified_by_expert: boolean("verified_by_expert").default(false),
  expert_verifier_id: uuid("verifier_id").references(() => users.id),

  // Impact
  is_ongoing: boolean("is_ongoing").default(false),
  affected_counties: kenyanCountyEnum("affected_counties").array(),

  // Linkage
  related_promise_id: uuid("related_promise_id").references(() => public_promises.id),
  related_bill_id: uuid("related_bill_id").references(() => bills.id),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  lossIdx: index("idx_ledger_loss").on(table.estimated_loss_amount.desc()),
  sponsorViolationIdx: index("idx_ledger_sponsor_violation").on(table.sponsor_id, table.violation_type),
}));

// ============================================================================
// PROMISE TRACKING - Updates & Audit Trail
// ============================================================================

export const promise_accountability_tracking = pgTable("promise_accountability_tracking", {
  id: primaryKeyUuid(),
  promise_id: uuid("promise_id").notNull().references(() => public_promises.id, { onDelete: "cascade" }),

  update_date: date("update_date").notNull(),
  new_status: varchar("new_status", { length: 50 }),
  progress_description: text("progress_description").notNull(),

  evidence_url: varchar("evidence_url", { length: 500 }),
  reported_by: uuid("reported_by").references(() => users.id),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const publicPromisesRelations = relations(public_promises, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [public_promises.sponsor_id],
    references: [sponsors.id],
  }),
  bill: one(bills, {
    fields: [public_promises.related_bill_id],
    references: [bills.id],
  }),
  trackingUpdates: many(promise_accountability_tracking),
  ledgerEntries: many(shadow_ledger_entries),
}));

export const shadowLedgerEntriesRelations = relations(shadow_ledger_entries, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [shadow_ledger_entries.sponsor_id],
    references: [sponsors.id],
  }),
  relatedPromise: one(public_promises, {
    fields: [shadow_ledger_entries.related_promise_id],
    references: [public_promises.id],
  }),
  relatedBill: one(bills, {
    fields: [shadow_ledger_entries.related_bill_id],
    references: [bills.id],
  }),
}));

export const promiseAccountabilityTrackingRelations = relations(promise_accountability_tracking, ({ one }) => ({
  promise: one(public_promises, {
    fields: [promise_accountability_tracking.promise_id],
    references: [public_promises.id],
  }),
  reporter: one(users, {
    fields: [promise_accountability_tracking.reported_by],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================
export type PublicPromise = typeof public_promises.$inferSelect;
export type NewPublicPromise = typeof public_promises.$inferInsert;
export type ShadowLedgerEntry = typeof shadow_ledger_entries.$inferSelect;
export type NewShadowLedgerEntry = typeof shadow_ledger_entries.$inferInsert;
export type PromiseTracking = typeof promise_accountability_tracking.$inferSelect;
export type NewPromiseTracking = typeof promise_accountability_tracking.$inferInsert;
