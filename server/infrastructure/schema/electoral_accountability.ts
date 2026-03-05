// ============================================================================
// ELECTORAL ACCOUNTABILITY SCHEMA - The Primary Feature
// ============================================================================
// Converts legislative transparency into measurable electoral consequence.
// Maps MP voting records to constituencies and tracks electoral pressure.

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, date, integer
} from "drizzle-orm/pg-core";

import { primaryKeyUuid, auditFields, metadataField } from "./base-types";
import { kenyanCountyEnum, chamberEnum } from "./enum";
import { bills, sponsors, users } from "./foundation";

// ============================================================================
// VOTING RECORDS - Core Electoral Accountability Data
// ============================================================================

export const voting_records = pgTable("voting_records", {
  id: primaryKeyUuid(),
  
  // The Vote
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  vote: varchar("vote", { length: 20 }).notNull(), // 'yes', 'no', 'abstain', 'absent'
  vote_date: timestamp("vote_date", { withTimezone: true }).notNull(),
  
  // Parliamentary Context
  chamber: chamberEnum("chamber").notNull(),
  session_number: varchar("session_number", { length: 50 }),
  reading_stage: varchar("reading_stage", { length: 50 }), // 'first', 'second', 'third', 'committee'
  
  // Geographic Mapping (Critical for Electoral Accountability)
  county: kenyanCountyEnum("county").notNull(),
  constituency: varchar("constituency", { length: 100 }).notNull(),
  ward: varchar("ward", { length: 100 }),
  
  // Electoral Context
  days_until_next_election: integer("days_until_next_election"), // Calculated field
  election_cycle: varchar("election_cycle", { length: 20 }), // '2022-2027'
  
  // Accountability Metrics
  constituent_sentiment_score: numeric("constituent_sentiment_score", { precision: 5, scale: 2 }), // -100 to +100
  alignment_with_constituency: numeric("alignment_with_constituency", { precision: 5, scale: 2 }), // 0 to 100
  
  // Evidence & Transparency
  hansard_reference: varchar("hansard_reference", { length: 255 }),
  video_timestamp: varchar("video_timestamp", { length: 50 }),
  source_url: varchar("source_url", { length: 500 }),
  
  // Metadata
  metadata: metadataField(),
  ...auditFields(),
}, (table) => ({
  // Hot path: Constituency-level queries
  constituencyVoteIdx: index("idx_voting_records_constituency")
    .on(table.constituency, table.vote_date.desc(), table.vote),
  
  // MP voting history
  sponsorVoteIdx: index("idx_voting_records_sponsor")
    .on(table.sponsor_id, table.vote_date.desc()),
  
  // Bill voting analysis
  billVoteIdx: index("idx_voting_records_bill")
    .on(table.bill_id, table.vote, table.constituency),
  
  // Electoral pressure tracking
  electionCycleIdx: index("idx_voting_records_election_cycle")
    .on(table.election_cycle, table.days_until_next_election),
  
  // Alignment analysis
  alignmentIdx: index("idx_voting_records_alignment")
    .on(table.alignment_with_constituency.desc(), table.constituency)
    .where(sql`${table.alignment_with_constituency} IS NOT NULL`),
}));

// ============================================================================
// CONSTITUENCY SENTIMENT - Ward-Level Community Voice
// ============================================================================

export const constituency_sentiment = pgTable("constituency_sentiment", {
  id: primaryKeyUuid(),
  
  // Geographic Scope
  county: kenyanCountyEnum("county").notNull(),
  constituency: varchar("constituency", { length: 100 }).notNull(),
  ward: varchar("ward", { length: 100 }),
  
  // Bill Context
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Aggregated Sentiment
  support_count: integer("support_count").notNull().default(0),
  oppose_count: integer("oppose_count").notNull().default(0),
  neutral_count: integer("neutral_count").notNull().default(0),
  total_responses: integer("total_responses").notNull().default(0),
  
  // Calculated Metrics
  sentiment_score: numeric("sentiment_score", { precision: 5, scale: 2 }), // -100 to +100
  confidence_level: numeric("confidence_level", { precision: 5, scale: 2 }), // 0 to 100
  sample_size_adequate: boolean("sample_size_adequate").default(false),
  
  // Demographics (Anonymized Aggregates)
  age_distribution: jsonb("age_distribution"), // { '18-25': 45, '26-35': 120, ... }
  gender_distribution: jsonb("gender_distribution"), // { 'male': 89, 'female': 112, 'other': 3 }
  
  // Temporal Context
  snapshot_date: timestamp("snapshot_date", { withTimezone: true }).notNull().defaultNow(),
  last_updated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  
  // Metadata
  metadata: metadataField(),
  ...auditFields(),
}, (table) => ({
  // Primary lookup: Bill sentiment by constituency
  billConstituencyIdx: index("idx_constituency_sentiment_bill_constituency")
    .on(table.bill_id, table.constituency, table.sentiment_score.desc()),
  
  // Geographic aggregation
  countyBillIdx: index("idx_constituency_sentiment_county_bill")
    .on(table.county, table.bill_id, table.total_responses.desc()),
  
  // Ward-level granularity
  wardBillIdx: index("idx_constituency_sentiment_ward_bill")
    .on(table.ward, table.bill_id)
    .where(sql`${table.ward} IS NOT NULL`),
  
  // Temporal analysis
  snapshotIdx: index("idx_constituency_sentiment_snapshot")
    .on(table.snapshot_date.desc(), table.bill_id),
}));

// ============================================================================
// REPRESENTATIVE GAP ANALYSIS - The Accountability Distance
// ============================================================================

export const representative_gap_analysis = pgTable("representative_gap_analysis", {
  id: primaryKeyUuid(),
  
  // The Gap
  voting_record_id: uuid("voting_record_id").notNull().references(() => voting_records.id, { onDelete: "cascade" }),
  sentiment_id: uuid("sentiment_id").notNull().references(() => constituency_sentiment.id, { onDelete: "cascade" }),
  
  // Calculated Gap Metrics
  alignment_gap: numeric("alignment_gap", { precision: 5, scale: 2 }).notNull(), // 0 to 100
  gap_severity: varchar("gap_severity", { length: 20 }), // 'low', 'medium', 'high', 'critical'
  
  // Context
  bill_id: uuid("bill_id").notNull().references(() => bills.id),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id),
  constituency: varchar("constituency", { length: 100 }).notNull(),
  
  // Electoral Impact
  electoral_risk_score: numeric("electoral_risk_score", { precision: 5, scale: 2 }), // 0 to 100
  days_until_election: integer("days_until_election"),
  
  // Analysis Details
  constituent_position: varchar("constituent_position", { length: 20 }), // 'support', 'oppose', 'neutral'
  representative_vote: varchar("representative_vote", { length: 20 }), // 'yes', 'no', 'abstain', 'absent'
  is_misaligned: boolean("is_misaligned").notNull().default(false),
  
  // Metadata
  analysis_date: timestamp("analysis_date", { withTimezone: true }).notNull().defaultNow(),
  metadata: metadataField(),
  ...auditFields(),
}, (table) => ({
  // Critical gaps (high electoral risk)
  criticalGapsIdx: index("idx_gap_analysis_critical")
    .on(table.gap_severity, table.electoral_risk_score.desc())
    .where(sql`${table.gap_severity} IN ('high', 'critical')`),
  
  // MP accountability tracking
  sponsorGapIdx: index("idx_gap_analysis_sponsor")
    .on(table.sponsor_id, table.alignment_gap.desc(), table.analysis_date.desc()),
  
  // Constituency accountability
  constituencyGapIdx: index("idx_gap_analysis_constituency")
    .on(table.constituency, table.is_misaligned, table.analysis_date.desc()),
  
  // Electoral cycle tracking
  electionRiskIdx: index("idx_gap_analysis_election_risk")
    .on(table.days_until_election, table.electoral_risk_score.desc())
    .where(sql`${table.days_until_election} IS NOT NULL AND ${table.days_until_election} <= 730`), // 2 years
}));

// ============================================================================
// ELECTORAL PRESSURE CAMPAIGNS - Organized Accountability
// ============================================================================

export const electoral_pressure_campaigns = pgTable("electoral_pressure_campaigns", {
  id: primaryKeyUuid(),
  
  // Campaign Identity
  campaign_name: varchar("campaign_name", { length: 255 }).notNull(),
  campaign_slug: varchar("campaign_slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  
  // Target
  target_sponsor_id: uuid("target_sponsor_id").notNull().references(() => sponsors.id),
  target_constituency: varchar("target_constituency", { length: 100 }).notNull(),
  target_county: kenyanCountyEnum("target_county").notNull(),
  
  // Trigger
  triggered_by_bill_id: uuid("triggered_by_bill_id").references(() => bills.id),
  triggered_by_gap_id: uuid("triggered_by_gap_id").references(() => representative_gap_analysis.id),
  
  // Campaign Status
  status: varchar("status", { length: 50 }).notNull().default('active'), // 'active', 'successful', 'failed', 'closed'
  start_date: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  end_date: timestamp("end_date", { withTimezone: true }),
  
  // Metrics
  participant_count: integer("participant_count").notNull().default(0),
  signature_count: integer("signature_count").notNull().default(0),
  media_mentions: integer("media_mentions").notNull().default(0),
  social_media_reach: integer("social_media_reach").notNull().default(0),
  
  // Outcomes
  representative_responded: boolean("representative_responded").default(false),
  vote_changed: boolean("vote_changed").default(false),
  policy_changed: boolean("policy_changed").default(false),
  electoral_impact: text("electoral_impact"),
  
  // Organizers
  created_by: uuid("created_by").notNull().references(() => users.id),
  organizer_ids: uuid("organizer_ids").array(),
  
  // Metadata
  metadata: metadataField(),
  ...auditFields(),
}, (table) => ({
  // Active campaigns by constituency
  activeConstituencyIdx: index("idx_pressure_campaigns_active_constituency")
    .on(table.target_constituency, table.status, table.start_date.desc())
    .where(sql`${table.status} = 'active'`),
  
  // MP accountability tracking
  sponsorCampaignsIdx: index("idx_pressure_campaigns_sponsor")
    .on(table.target_sponsor_id, table.status, table.participant_count.desc()),
  
  // Success tracking
  successfulCampaignsIdx: index("idx_pressure_campaigns_successful")
    .on(table.status, table.vote_changed, table.end_date.desc())
    .where(sql`${table.status} = 'successful' OR ${table.vote_changed} = true`),
}));

// ============================================================================
// ACCOUNTABILITY DASHBOARDS - Civil Society Data Exports
// ============================================================================

export const accountability_dashboard_exports = pgTable("accountability_dashboard_exports", {
  id: primaryKeyUuid(),
  
  // Export Identity
  export_name: varchar("export_name", { length: 255 }).notNull(),
  export_type: varchar("export_type", { length: 50 }).notNull(), // 'mp_scorecard', 'constituency_report', 'campaign_data'
  
  // Scope
  constituency: varchar("constituency", { length: 100 }),
  county: kenyanCountyEnum("county"),
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id),
  
  // Time Range
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  
  // Data
  export_data: jsonb("export_data").notNull(),
  summary_statistics: jsonb("summary_statistics"),
  
  // Access Control
  requested_by: uuid("requested_by").notNull().references(() => users.id),
  organization: varchar("organization", { length: 255 }),
  purpose: text("purpose"),
  
  // Status
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'approved', 'delivered', 'rejected'
  approved_by: uuid("approved_by").references(() => users.id),
  approval_date: timestamp("approval_date", { withTimezone: true }),
  
  // Delivery
  download_url: varchar("download_url", { length: 500 }),
  download_expires_at: timestamp("download_expires_at", { withTimezone: true }),
  download_count: integer("download_count").notNull().default(0),
  
  // Metadata
  metadata: metadataField(),
  ...auditFields(),
}, (table) => ({
  // User exports
  userExportsIdx: index("idx_dashboard_exports_user")
    .on(table.requested_by, table.created_at.desc()),
  
  // Constituency exports
  constituencyExportsIdx: index("idx_dashboard_exports_constituency")
    .on(table.constituency, table.export_type, table.status),
  
  // Pending approvals
  pendingApprovalsIdx: index("idx_dashboard_exports_pending")
    .on(table.status, table.created_at)
    .where(sql`${table.status} = 'pending'`),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const votingRecordsRelations = relations(voting_records, ({ one, many }) => ({
  bill: one(bills, {
    fields: [voting_records.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [voting_records.sponsor_id],
    references: [sponsors.id],
  }),
  gapAnalyses: many(representative_gap_analysis),
}));

export const constituencySentimentRelations = relations(constituency_sentiment, ({ one, many }) => ({
  bill: one(bills, {
    fields: [constituency_sentiment.bill_id],
    references: [bills.id],
  }),
  gapAnalyses: many(representative_gap_analysis),
}));

export const representativeGapAnalysisRelations = relations(representative_gap_analysis, ({ one }) => ({
  votingRecord: one(voting_records, {
    fields: [representative_gap_analysis.voting_record_id],
    references: [voting_records.id],
  }),
  sentiment: one(constituency_sentiment, {
    fields: [representative_gap_analysis.sentiment_id],
    references: [constituency_sentiment.id],
  }),
  bill: one(bills, {
    fields: [representative_gap_analysis.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [representative_gap_analysis.sponsor_id],
    references: [sponsors.id],
  }),
}));

export const electoralPressureCampaignsRelations = relations(electoral_pressure_campaigns, ({ one }) => ({
  targetSponsor: one(sponsors, {
    fields: [electoral_pressure_campaigns.target_sponsor_id],
    references: [sponsors.id],
  }),
  triggeredByBill: one(bills, {
    fields: [electoral_pressure_campaigns.triggered_by_bill_id],
    references: [bills.id],
  }),
  triggeredByGap: one(representative_gap_analysis, {
    fields: [electoral_pressure_campaigns.triggered_by_gap_id],
    references: [representative_gap_analysis.id],
  }),
  creator: one(users, {
    fields: [electoral_pressure_campaigns.created_by],
    references: [users.id],
  }),
}));

export const accountabilityDashboardExportsRelations = relations(accountability_dashboard_exports, ({ one }) => ({
  requester: one(users, {
    fields: [accountability_dashboard_exports.requested_by],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [accountability_dashboard_exports.approved_by],
    references: [users.id],
  }),
  sponsor: one(sponsors, {
    fields: [accountability_dashboard_exports.sponsor_id],
    references: [sponsors.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type VotingRecord = typeof voting_records.$inferSelect;
export type NewVotingRecord = typeof voting_records.$inferInsert;

export type ConstituencySentiment = typeof constituency_sentiment.$inferSelect;
export type NewConstituencySentiment = typeof constituency_sentiment.$inferInsert;

export type RepresentativeGapAnalysis = typeof representative_gap_analysis.$inferSelect;
export type NewRepresentativeGapAnalysis = typeof representative_gap_analysis.$inferInsert;

export type ElectoralPressureCampaign = typeof electoral_pressure_campaigns.$inferSelect;
export type NewElectoralPressureCampaign = typeof electoral_pressure_campaigns.$inferInsert;

export type AccountabilityDashboardExport = typeof accountability_dashboard_exports.$inferSelect;
export type NewAccountabilityDashboardExport = typeof accountability_dashboard_exports.$inferInsert;
