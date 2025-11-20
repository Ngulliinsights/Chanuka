// ============================================================================
// ARGUMENT INTELLIGENCE SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Argument extraction, synthesis, and evidence tracking for citizen input
// This schema transforms scattered comments into structured legislative input

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import { bills, users } from "./foundation";
// import { comments } from "./citizen_participation"; // Unused import

// ============================================================================
// ARGUMENTS - Structured Claims Extracted from Comments
// ============================================================================

export const argumentTable = pgTable("arguments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Argument content
  argument_text: text("argument_text").notNull(),
  argument_summary: varchar("argument_summary", { length: 500 }),
  position: varchar("position", { length: 20 }).notNull(), // "support", "oppose", "neutral", "conditional"
  
  // Argument classification
  argument_type: varchar("argument_type", { length: 50 }), // "economic", "constitutional", "social", "procedural"
  strength_score: numeric("strength_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Source tracking
  source_comments: uuid("source_comments").array(),
  extraction_method: varchar("extraction_method", { length: 20 }).notNull(), // "automated", "manual", "hybrid"
  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }),
  
  // Engagement metrics
  support_count: integer("support_count").notNull().default(0),
  opposition_count: integer("opposition_count").notNull().default(0),
  citizen_endorsements: integer("citizen_endorsements").notNull().default(0),
  
  // Quality and moderation
  is_verified: boolean("is_verified").notNull().default(false),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  quality_score: numeric("quality_score", { precision: 3, scale: 2 }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Bill arguments queries
  billPositionIdx: index("idx_arguments_bill_position")
    .on(table.bill_id, table.position, table.strength_score),
  
  // Quality and verification
  verifiedQualityIdx: index("idx_arguments_verified_quality")
    .on(table.is_verified, table.quality_score)
    .where(sql`${table.is_verified} = true`),
  
  // Source comment tracking
  sourceCommentsIdx: index("idx_arguments_source_comments")
    .using("gin", table.source_comments),
}));

// ============================================================================
// CLAIMS - Deduplicated Factual Assertions
// ============================================================================

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Claim content
  claim_text: text("claim_text").notNull(),
  claim_summary: varchar("claim_summary", { length: 300 }),
  claim_type: varchar("claim_type", { length: 50 }), // "factual", "predictive", "normative", "causal"
  
  // Verification status
  verification_status: varchar("verification_status", { length: 20 }).notNull().default("unverified"), // "verified", "disputed", "false", "unverified"
  fact_check_url: varchar("fact_check_url", { length: 500 }),
  
  // Supporting information
  supporting_arguments: uuid("supporting_arguments").array(),
  contradicting_arguments: uuid("contradicting_arguments").array(),
  
  // Frequency and impact
  mention_count: integer("mention_count").notNull().default(1),
  bills_referenced: uuid("bills_referenced").array(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Claim verification queries
  verificationStatusIdx: index("idx_claims_verification_status")
    .on(table.verification_status, table.mention_count),
  
  // Bill reference tracking
  billsReferencedIdx: index("idx_claims_bills_referenced")
    .using("gin", table.bills_referenced),
  
  // Full-text search on claims
  claimTextIdx: index("idx_claims_claim_text").on(table.claim_text),
}));

// ============================================================================
// EVIDENCE - Supporting Documentation and Sources
// ============================================================================

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Evidence content
  evidence_type: varchar("evidence_type", { length: 50 }).notNull(), // "document", "data", "expert_opinion", "precedent"
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  
  // Source information
  source_url: varchar("source_url", { length: 500 }),
  source_organization: varchar("source_organization", { length: 200 }),
  publication_date: date("publication_date"),
  
  // Credibility assessment
  credibility_score: numeric("credibility_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  peer_reviewed: boolean("peer_reviewed").notNull().default(false),
  
  // Relationships
  supports_claims: uuid("supports_claims").array(),
  contradicts_claims: uuid("contradicts_claims").array(),
  supports_arguments: uuid("supports_arguments").array(),
  
  // Usage tracking
  citation_count: integer("citation_count").notNull().default(0),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Evidence type and credibility
  typeCredibilityIdx: index("idx_evidence_type_credibility")
    .on(table.evidence_type, table.credibility_score),
  
  // Peer reviewed evidence
  peerReviewedIdx: index("idx_evidence_peer_reviewed")
    .on(table.peer_reviewed, table.credibility_score)
    .where(sql`${table.peer_reviewed} = true`),
  
  // Claims and arguments support
  supportsClaimsIdx: index("idx_evidence_supports_claims")
    .using("gin", table.supports_claims),
  supportsArgumentsIdx: index("idx_evidence_supports_arguments")
    .using("gin", table.supports_arguments),
}));

// ============================================================================
// ARGUMENT RELATIONSHIPS - How Arguments Relate to Each Other
// ============================================================================

export const argument_relationships = pgTable("argument_relationships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Relationship participants
  source_argument_id: uuid("source_argument_id").notNull().references(() => argumentTable.id, { onDelete: "cascade" }),
  target_argument_id: uuid("target_argument_id").notNull().references(() => argumentTable.id, { onDelete: "cascade" }),
  
  // Relationship type
  relationship_type: varchar("relationship_type", { length: 50 }).notNull(), // "supports", "contradicts", "refines", "generalizes"
  strength: numeric("strength", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Context
  explanation: text("explanation"),
  detected_by: varchar("detected_by", { length: 20 }).notNull(), // "automated", "manual", "crowd"
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate relationships
  sourceTargetUnique: unique("argument_relationships_source_target_unique")
    .on(table.source_argument_id, table.target_argument_id),
  
  // Relationship queries
  sourceTypeIdx: index("idx_argument_relationships_source_type")
    .on(table.source_argument_id, table.relationship_type),
  targetTypeIdx: index("idx_argument_relationships_target_type")
    .on(table.target_argument_id, table.relationship_type),
}));

// ============================================================================
// LEGISLATIVE BRIEFS - Synthesized Reports for Lawmakers
// ============================================================================

export const legislative_briefs = pgTable("legislative_briefs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Brief metadata
  brief_type: varchar("brief_type", { length: 50 }).notNull(), // "public_input", "constitutional", "stakeholder", "comprehensive"
  title: varchar("title", { length: 500 }).notNull(),
  
  // Brief content
  executive_summary: text("executive_summary").notNull(),
  key_arguments: jsonb("key_arguments").notNull().default(sql`'[]'::jsonb`),
  stakeholder_positions: jsonb("stakeholder_positions").notNull().default(sql`'{}'::jsonb`),
  public_sentiment: jsonb("public_sentiment").notNull().default(sql`'{}'::jsonb`),
  
  // Constitutional analysis integration
  constitutional_implications: text("constitutional_implications"),
  legal_precedents_cited: uuid("legal_precedents_cited").array(),
  
  // Generation metadata
  generated_by: varchar("generated_by", { length: 20 }).notNull(), // "automated", "expert", "hybrid"
  data_cutoff_date: timestamp("data_cutoff_date", { withTimezone: true }).notNull(),
  
  // Distribution tracking
  delivered_to_committee: boolean("delivered_to_committee").notNull().default(false),
  committee_response: text("committee_response"),
  public_release_date: timestamp("public_release_date", { withTimezone: true }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Bill brief queries
  billTypeIdx: index("idx_legislative_briefs_bill_type")
    .on(table.bill_id, table.brief_type),
  
  // Committee delivery tracking
  committeeDeliveryIdx: index("idx_legislative_briefs_committee_delivery")
    .on(table.delivered_to_committee, table.created_at),
  
  // Public release tracking
  publicReleaseIdx: index("idx_legislative_briefs_public_release")
    .on(table.public_release_date)
    .where(sql`${table.public_release_date} IS NOT NULL`),
}));

// ============================================================================
// SYNTHESIS JOBS - Background Processing for Argument Analysis
// ============================================================================

export const synthesis_jobs = pgTable("synthesis_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Job configuration
  job_type: varchar("job_type", { length: 50 }).notNull(), // "argument_extraction", "claim_deduplication", "brief_generation"
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "cascade" }),
  
  // Job status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "running", "completed", "failed"
  progress_percentage: smallint("progress_percentage").notNull().default(0),
  
  // Job parameters
  parameters: jsonb("parameters").notNull().default(sql`'{}'::jsonb`),
  
  // Results
  results: jsonb("results").notNull().default(sql`'{}'::jsonb`),
  error_message: text("error_message"),
  
  // Timing
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Job queue management
  statusTypeIdx: index("idx_synthesis_jobs_status_type")
    .on(table.status, table.job_type, table.created_at),
  
  // Bill job tracking
  billStatusIdx: index("idx_synthesis_jobs_bill_status")
    .on(table.bill_id, table.status)
    .where(sql`${table.bill_id} IS NOT NULL`),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const argumentsRelations = relations(argumentTable, ({ one, many }) => ({
  bill: one(bills, {
    fields: [argumentTable.bill_id],
    references: [bills.id],
  }),
  verifiedBy: one(users, {
    fields: [argumentTable.verified_by],
    references: [users.id],
  }),
  sourceRelationships: many(argument_relationships, { relationName: "source" }),
  targetRelationships: many(argument_relationships, { relationName: "target" }),
}));

export const claimsRelations = relations(claims, ({ many }) => ({
  supportingEvidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ many }) => ({
  supportedClaims: many(claims),
  supportedArguments: many(argumentTable),
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
}));

export const legislativeBriefsRelations = relations(legislative_briefs, ({ one }) => ({
  bill: one(bills, {
    fields: [legislative_briefs.bill_id],
    references: [bills.id],
  }),
}));

export const synthesisJobsRelations = relations(synthesis_jobs, ({ one }) => ({
  bill: one(bills, {
    fields: [synthesis_jobs.bill_id],
    references: [bills.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Argument = typeof argumentTable.$inferSelect;
export type NewArgument = typeof argumentTable.$inferInsert;

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;

export type ArgumentRelationship = typeof argument_relationships.$inferSelect;
export type NewArgumentRelationship = typeof argument_relationships.$inferInsert;

export type LegislativeBrief = typeof legislative_briefs.$inferSelect;
export type NewLegislativeBrief = typeof legislative_briefs.$inferInsert;

export type SynthesisJob = typeof synthesis_jobs.$inferSelect;
export type NewSynthesisJob = typeof synthesis_jobs.$inferInsert;


