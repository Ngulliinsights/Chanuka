// ============================================================================
// CONSTITUTIONAL INTELLIGENCE SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Constitutional analysis, legal precedents, and expert review infrastructure
// This schema enables the platform's core value proposition of constitutional analysis

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import { bills, users } from "./foundation";

// ============================================================================
// CONSTITUTIONAL PROVISIONS - Kenya's Constitution Structure
// ============================================================================

export const constitutional_provisions = pgTable("constitutional_provisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Constitutional hierarchy: Chapter > Article > Section > Clause
  chapter_number: smallint("chapter_number").notNull(),
  article_number: smallint("article_number"),
  section_number: smallint("section_number"),
  clause_number: smallint("clause_number"),
  
  // Content
  title: varchar("title", { length: 500 }).notNull(),
  full_text: text("full_text").notNull(),
  summary: text("summary"),
  
  // Legal metadata
  is_fundamental_right: boolean("is_fundamental_right").notNull().default(false),
  is_directive_principle: boolean("is_directive_principle").notNull().default(false),
  enforcement_mechanism: varchar("enforcement_mechanism", { length: 100 }),
  
  // Relationships and cross-references
  related_provisions: uuid("related_provisions").array(),
  keywords: varchar("keywords", { length: 100 }).array(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique constitutional reference
  constitutionalRefUnique: unique("constitutional_provisions_ref_unique")
    .on(table.chapter_number, table.article_number, table.section_number, table.clause_number),
  
  // Indexes for constitutional queries
  chapterArticleIdx: index("idx_constitutional_provisions_chapter_article")
    .on(table.chapter_number, table.article_number),
  fundamentalRightsIdx: index("idx_constitutional_provisions_fundamental_rights")
    .on(table.is_fundamental_right)
    .where(sql`${table.is_fundamental_right} = true`),
  
  // GIN index for keyword searches
  keywordsIdx: index("idx_constitutional_provisions_keywords")
    .using("gin", table.keywords),
}));

// ============================================================================
// CONSTITUTIONAL ANALYSES - AI + Expert Analysis of Bills
// ============================================================================

export const constitutional_analyses = pgTable("constitutional_analyses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Analysis metadata
  analysis_type: varchar("analysis_type", { length: 50 }).notNull(), // "automated", "expert", "hybrid"
  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Constitutional implications
  constitutional_provisions_cited: uuid("constitutional_provisions_cited").array(),
  potential_violations: jsonb("potential_violations").notNull().default(sql`'[]'::jsonb`),
  constitutional_alignment: varchar("constitutional_alignment", { length: 20 }), // "aligned", "concerning", "violates"
  
  // Analysis content
  executive_summary: text("executive_summary").notNull(),
  detailed_analysis: text("detailed_analysis"),
  recommendations: text("recommendations"),
  
  // Expert review
  requires_expert_review: boolean("requires_expert_review").notNull().default(false),
  expert_reviewed: boolean("expert_reviewed").notNull().default(false),
  expert_reviewer_id: uuid("expert_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  expert_notes: text("expert_notes"),
  
  // Audit trail
  analysis_version: integer("analysis_version").notNull().default(1),
  superseded_by: uuid("superseded_by").references(() => constitutional_analyses.id, { onDelete: "set null" }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One current analysis per bill
  billCurrentAnalysisIdx: index("idx_constitutional_analyses_bill_current")
    .on(table.bill_id, table.superseded_by)
    .where(sql`${table.superseded_by} IS NULL`),
  
  // Expert review queue
  expertReviewQueueIdx: index("idx_constitutional_analyses_expert_review")
    .on(table.requires_expert_review, table.expert_reviewed, table.created_at)
    .where(sql`${table.requires_expert_review} = true AND ${table.expert_reviewed} = false`),
  
  // Constitutional alignment queries
  alignmentIdx: index("idx_constitutional_analyses_alignment")
    .on(table.constitutional_alignment, table.confidence_score),
}));

// ============================================================================
// LEGAL PRECEDENTS - Case Law and Judicial Decisions
// ============================================================================

export const legal_precedents = pgTable("legal_precedents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Case identification
  case_name: varchar("case_name", { length: 500 }).notNull(),
  case_number: varchar("case_number", { length: 100 }),
  court_level: varchar("court_level", { length: 50 }).notNull(), // "High Court", "Court of Appeal", "Supreme Court"
  
  // Case details
  judgment_date: date("judgment_date"),
  judges: varchar("judges", { length: 100 }).array(),
  case_summary: text("case_summary"),
  legal_principle: text("legal_principle"),
  
  // Constitutional relevance
  constitutional_provisions_involved: uuid("constitutional_provisions_involved").array(),
  precedent_strength: varchar("precedent_strength", { length: 20 }), // "binding", "persuasive", "distinguishable"
  
  // Document references
  judgment_url: varchar("judgment_url", { length: 500 }),
  citation: varchar("citation", { length: 200 }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Case lookup indexes
  caseNameIdx: index("idx_legal_precedents_case_name").on(table.case_name),
  courtLevelDateIdx: index("idx_legal_precedents_court_level_date")
    .on(table.court_level, table.judgment_date),
  
  // Constitutional provision lookups
  constitutionalProvisionsIdx: index("idx_legal_precedents_constitutional_provisions")
    .using("gin", table.constitutional_provisions_involved),
}));

// ============================================================================
// EXPERT REVIEW QUEUE - Human Expert Oversight
// ============================================================================

export const expert_review_queue = pgTable("expert_review_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Review target
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Review metadata
  priority_level: varchar("priority_level", { length: 20 }).notNull().default("medium"), // "low", "medium", "high", "urgent"
  review_reason: varchar("review_reason", { length: 100 }).notNull(), // "low_confidence", "complex_issue", "public_interest"
  
  // Assignment
  assigned_expert_id: uuid("assigned_expert_id").references(() => users.id, { onDelete: "set null" }),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),
  
  // Review status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "assigned", "in_review", "completed", "escalated"
  
  // Completion
  completed_at: timestamp("completed_at", { withTimezone: true }),
  review_notes: text("review_notes"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Review queue management
  statusPriorityIdx: index("idx_expert_review_queue_status_priority")
    .on(table.status, table.priority_level, table.created_at),
  
  // Expert assignment queries
  assignedExpertIdx: index("idx_expert_review_queue_assigned_expert")
    .on(table.assigned_expert_id, table.status)
    .where(sql`${table.assigned_expert_id} IS NOT NULL`),
  
  // Bill review tracking
  billStatusIdx: index("idx_expert_review_queue_bill_status")
    .on(table.bill_id, table.status),
}));

// ============================================================================
// ANALYSIS AUDIT TRAIL - Track Changes and Decisions
// ============================================================================

export const analysis_audit_trail = pgTable("analysis_audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Audit target
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),
  
  // Change details
  action_type: varchar("action_type", { length: 50 }).notNull(), // "created", "updated", "reviewed", "superseded"
  actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actor_type: varchar("actor_type", { length: 20 }).notNull(), // "system", "expert", "admin"
  
  // Change content
  changes_made: jsonb("changes_made").notNull().default(sql`'{}'::jsonb`),
  reason: text("reason"),
  
  // Metadata
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Audit trail queries
  analysisActionIdx: index("idx_analysis_audit_trail_analysis_action")
    .on(table.analysis_id, table.action_type, table.created_at),
  
  // Actor tracking
  actorTypeIdx: index("idx_analysis_audit_trail_actor_type")
    .on(table.actor_type, table.created_at),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const constitutionalProvisionsRelations = relations(constitutional_provisions, ({ many }) => ({
  analyses: many(constitutional_analyses),
  precedents: many(legal_precedents),
}));

export const constitutionalAnalysesRelations = relations(constitutional_analyses, ({ one, many }) => ({
  bill: one(bills, {
    fields: [constitutional_analyses.bill_id],
    references: [bills.id],
  }),
  expertReviewer: one(users, {
    fields: [constitutional_analyses.expert_reviewer_id],
    references: [users.id],
  }),
  supersededBy: one(constitutional_analyses, {
    fields: [constitutional_analyses.superseded_by],
    references: [constitutional_analyses.id],
    relationName: "supersession",
  }),
  supersedes: many(constitutional_analyses, {
    relationName: "supersession",
  }),
  reviewQueue: many(expert_review_queue),
  auditTrail: many(analysis_audit_trail),
}));

export const legalPrecedentsRelations = relations(legal_precedents, ({ many }) => ({
  constitutionalProvisions: many(constitutional_provisions),
}));

export const expertReviewQueueRelations = relations(expert_review_queue, ({ one }) => ({
  analysis: one(constitutional_analyses, {
    fields: [expert_review_queue.analysis_id],
    references: [constitutional_analyses.id],
  }),
  bill: one(bills, {
    fields: [expert_review_queue.bill_id],
    references: [bills.id],
  }),
  assignedExpert: one(users, {
    fields: [expert_review_queue.assigned_expert_id],
    references: [users.id],
  }),
}));

export const analysisAuditTrailRelations = relations(analysis_audit_trail, ({ one }) => ({
  analysis: one(constitutional_analyses, {
    fields: [analysis_audit_trail.analysis_id],
    references: [constitutional_analyses.id],
  }),
  actor: one(users, {
    fields: [analysis_audit_trail.actor_id],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ConstitutionalProvision = typeof constitutional_provisions.$inferSelect;
export type NewConstitutionalProvision = typeof constitutional_provisions.$inferInsert;

export type ConstitutionalAnalysis = typeof constitutional_analyses.$inferSelect;
export type NewConstitutionalAnalysis = typeof constitutional_analyses.$inferInsert;

export type LegalPrecedent = typeof legal_precedents.$inferSelect;
export type NewLegalPrecedent = typeof legal_precedents.$inferInsert;

export type ExpertReviewQueue = typeof expert_review_queue.$inferSelect;
export type NewExpertReviewQueue = typeof expert_review_queue.$inferInsert;

export type AnalysisAuditTrail = typeof analysis_audit_trail.$inferSelect;
export type NewAnalysisAuditTrail = typeof analysis_audit_trail.$inferInsert;