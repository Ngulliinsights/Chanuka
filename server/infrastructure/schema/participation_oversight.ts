// ============================================================================
// PARTICIPATION OVERSIGHT SCHEMA
// ============================================================================
// Constitutional compliance monitoring and quality assessment of public
// participation processes in legislative workflows
//
// PURPOSE: Detect and prevent:
// - Participation washing (collecting but ignoring public input)
// - Elite capture (only privileged voices heard)
// - Timing manipulation (rushed processes)
// - Constitutional violations (Articles 10, 118, 232)
//
// USERS: Auditors, Civil Society Organizations, Parliamentary Oversight, Public
// ============================================================================

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar, date,
  index, check
} from "drizzle-orm/pg-core";

import { primaryKeyUuid, auditFields } from "./base-types";
import { kenyanCountyEnum } from "./enum";
import { bills, users } from "./foundation";
// ============================================================================
// PARTICIPATION QUALITY AUDITS - Constitutional compliance assessment
// ============================================================================
// Evaluates whether public participation met constitutional requirements
// per Kenya Constitution Articles 10 (national values), 118 (public
// participation), and 232 (values and principles of public service)

export const participation_quality_audits = pgTable("participation_quality_audits", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // =========================================================================
  // AUDIT METADATA
  // =========================================================================
  audit_date: date("audit_date").notNull().defaultNow(),
  audit_version: integer("audit_version").notNull().default(1),
  // Allows multiple audits of same bill over time

  auditor_type: varchar("auditor_type", { length: 50 }).notNull(),
  // Values: "automated", "expert_panel", "civil_society", "parliamentary",
  //         "constitutional_commission", "media_investigation"

  auditor_id: uuid("auditor_id").references(() => users.id, { onDelete: "set null" }),
  auditor_organization: varchar("auditor_organization", { length: 200 }),
  // E.g., "Kenya National Commission on Human Rights", "Transparency International Kenya"

  audit_methodology: varchar("audit_methodology", { length: 100 }),
  // Values: "quantitative", "qualitative", "mixed_methods", "documentary_review"

  // =========================================================================
  // TIMELINE ASSESSMENT - Was adequate time provided?
  // =========================================================================
  participation_start_date: date("participation_start_date"),
  participation_end_date: date("participation_end_date"),

  days_allocated: integer("days_allocated"),
  // Calculated: participation_end_date - participation_start_date

  minimum_days_required: integer("minimum_days_required").default(21),
  // Constitutional standard: Minimum 21 days for meaningful participation

  adequate_time: boolean("adequate_time"),
  // TRUE if days_allocated >= minimum_days_required

  timeline_manipulation_notes: text("timeline_manipulation_notes"),
  // Evidence of rushed processes, holiday timing, etc.

  // =========================================================================
  // ACCESSIBILITY ASSESSMENT - Was the public properly informed?
  // =========================================================================
  adequate_notice: boolean("adequate_notice").notNull(),
  // Were citizens given proper notice through multiple channels?

  notice_days_given: integer("notice_days_given"),
  // Days between announcement and participation start

  notice_channels_used: varchar("notice_channels_used", { length: 50 }).array(),
  // Values: ["newspaper", "website", "social_media", "community_meetings",
  //          "radio", "tv", "sms_alerts", "county_offices"]

  notice_quality_score: numeric("notice_quality_score", { precision: 5, scale: 2 }),
  // 0-100: Quality and reach of notification efforts

  // =========================================================================
  // GEOGRAPHIC COVERAGE - Were all regions represented?
  // =========================================================================
  geographic_coverage_score: numeric("geographic_coverage_score", { precision: 5, scale: 2 }),
  // 0-100: Percentage of counties with meaningful participation

  counties_covered: kenyanCountyEnum("counties_covered").array(),
  counties_required: integer("counties_required").default(47),
  // All 47 counties should have opportunity to participate

  urban_rural_balance: varchar("urban_rural_balance", { length: 20 }),
  // Values: "urban_only", "rural_only", "urban_heavy", "rural_heavy",
  //         "balanced", "mixed"

  geographic_barriers_detected: boolean("geographic_barriers_detected").notNull().default(false),
  // Were certain regions systematically excluded?

  regional_participation_data: jsonb("regional_participation_data").default(sql`'{}'::jsonb`).notNull(),
  // Detailed breakdown: {"Nairobi": {"submissions": 245, "participants": 180}, ...}

  // =========================================================================
  // INCLUSIVITY ASSESSMENT - Were marginalized groups included?
  // =========================================================================
  marginalized_groups_reached: boolean("marginalized_groups_reached").notNull(),
  // Were specific efforts made to include vulnerable populations?

  marginalized_groups_included: varchar("marginalized_groups_included", { length: 100 }).array(),
  // Values: ["youth", "women", "persons_with_disabilities", "minorities",
  //          "pastoralists", "informal_sector", "rural_poor", "elderly"]

  inclusivity_measures_taken: text("inclusivity_measures_taken"),
  // Description of affirmative outreach efforts

  language_accessibility: boolean("language_accessibility").notNull(),
  languages_available: varchar("languages_available", { length: 20 }).array(),
  // Values: ["english", "swahili", "kikuyu", "luo", "luhya", "kalenjin",
  //          "kamba", "somali", "other_indigenous"]

  disability_accommodations: boolean("disability_accommodations").notNull(),
  accommodation_types: varchar("accommodation_types", { length: 50 }).array(),
  // Values: ["sign_language", "braille", "audio_format", "easy_read",
  //          "accessible_venues", "assistive_technology"]

  literacy_accommodations: boolean("literacy_accommodations").notNull().default(false),
  // Were accommodations made for low-literacy participants?

  socioeconomic_barriers_addressed: boolean("socioeconomic_barriers_addressed").notNull().default(false),
  // Transport costs, venue accessibility, timing for working people

  // =========================================================================
  // SUBMISSION ANALYSIS - What was the quality of participation?
  // =========================================================================
  total_submissions: integer("total_submissions").notNull().default(0),
  // Total comments/submissions received

  unique_participants: integer("unique_participants").notNull().default(0),
  // Number of distinct individuals/organizations

  submissions_acknowledged: integer("submissions_acknowledged").notNull().default(0),
  // How many received official acknowledgment?

  submissions_analyzed: integer("submissions_analyzed").notNull().default(0),
  // How many were substantively reviewed?

  submissions_incorporated: integer("submissions_incorporated").notNull().default(0),
  // How many led to actual changes in the bill?

  incorporation_rate: numeric("incorporation_rate", { precision: 5, scale: 2 }),
  // (submissions_incorporated / total_submissions) * 100

  acknowledgment_rate: numeric("acknowledgment_rate", { precision: 5, scale: 2 }),
  // (submissions_acknowledged / total_submissions) * 100

  analysis_rate: numeric("analysis_rate", { precision: 5, scale: 2 }),
  // (submissions_analyzed / total_submissions) * 100

  participation_demographics: jsonb("participation_demographics").default(sql`'{}'::jsonb`).notNull(),
  // Who participated? {"gender": {"male": 60, "female": 40}, "age_groups": {...}}

  // =========================================================================
  // RESPONSE QUALITY - Did authorities engage meaningfully?
  // =========================================================================
  feedback_provided: boolean("feedback_provided").notNull(),
  // Was feedback given to participants?

  feedback_quality: varchar("feedback_quality", { length: 20 }).notNull(),
  // Values: "none", "minimal", "adequate", "comprehensive", "exemplary"

  feedback_timeliness: varchar("feedback_timeliness", { length: 20 }),
  // Values: "immediate", "timely", "delayed", "very_delayed", "never"

  feedback_channels: varchar("feedback_channels", { length: 50 }).array(),
  // How was feedback delivered? ["email", "website", "public_meeting",
  //                               "individual_letters", "report"]

  public_hearing_held: boolean("public_hearing_held").notNull().default(false),
  public_hearings_count: integer("public_hearings_count").default(0),

  committee_engagement_quality: varchar("committee_engagement_quality", { length: 20 }),
  // Values: "none", "minimal", "adequate", "excellent"

  official_response_document: text("official_response_document"),
  // Link to official response/report

  // =========================================================================
  // RED FLAGS - Constitutional violations detected
  // =========================================================================
  participation_washing_detected: boolean("participation_washing_detected").notNull().default(false),
  // Views collected but systematically ignored
  participation_washing_evidence: text("participation_washing_evidence"),

  elite_capture_detected: boolean("elite_capture_detected").notNull().default(false),
  // Only connected/privileged groups got meaningful access
  elite_capture_evidence: text("elite_capture_evidence"),

  timing_manipulation_detected: boolean("timing_manipulation_detected").notNull().default(false),
  // Rushed timeline, inadequate notice, strategic timing
  timing_manipulation_evidence: text("timing_manipulation_evidence"),

  post_hoc_amendments_detected: boolean("post_hoc_amendments_detected").notNull().default(false),
  // Significant changes made AFTER participation concluded
  post_hoc_amendments_evidence: text("post_hoc_amendments_evidence"),

  access_barriers_detected: boolean("access_barriers_detected").notNull().default(false),
  // Technical, linguistic, procedural, or economic barriers
  access_barriers_evidence: text("access_barriers_evidence"),

  procedural_irregularities_detected: boolean("procedural_irregularities_detected").notNull().default(false),
  // Violations of standing orders or procedure
  procedural_irregularities_evidence: text("procedural_irregularities_evidence"),

  conflicts_of_interest_detected: boolean("conflicts_of_interest_detected").notNull().default(false),
  // Stakeholders with undisclosed interests dominated process
  conflicts_of_interest_evidence: text("conflicts_of_interest_evidence"),

  // =========================================================================
  // OVERALL QUALITY SCORES (0-100)
  // =========================================================================
  participation_quality_score: numeric("participation_quality_score", { precision: 5, scale: 2 }),
  // Composite score: weighted average of component scores

  // Component scores for transparency and debugging
  timeline_score: numeric("timeline_score", { precision: 5, scale: 2 }),
  // Based on: adequate_time, days_allocated, notice quality

  accessibility_score: numeric("accessibility_score", { precision: 5, scale: 2 }),
  // Based on: geographic coverage, notice adequacy, channels used

  inclusivity_score: numeric("inclusivity_score", { precision: 5, scale: 2 }),
  // Based on: marginalized groups, language access, accommodations

  response_quality_score: numeric("response_quality_score", { precision: 5, scale: 2 }),
  // Based on: feedback quality, incorporation rate, engagement

  process_integrity_score: numeric("process_integrity_score", { precision: 5, scale: 2 }),
  // Based on: absence of red flags, procedural compliance

  // =========================================================================
  // CONSTITUTIONAL COMPLIANCE
  // =========================================================================
  constitutional_compliance: boolean("constitutional_compliance").notNull(),
  // Overall: Does this meet constitutional standards?

  compliance_articles: varchar("compliance_articles", { length: 20 }).array(),
  // Kenya Constitution articles assessed: ["10", "118", "232", "35"]

  articles_violated: varchar("articles_violated", { length: 20 }).array(),
  // Which articles were violated (if any)?

  compliance_notes: text("compliance_notes"),
  // Detailed legal assessment

  legal_concerns: text("legal_concerns"),
  // Potential grounds for legal challenge

  remedial_actions_recommended: text("remedial_actions_recommended"),
  // What should be done to fix the process?

  // =========================================================================
  // EVIDENCE AND DOCUMENTATION
  // =========================================================================
  evidence_documents: jsonb("evidence_documents").notNull().default(sql`'{}'::jsonb`),
  // Array of references: [{"type": "report", "url": "...", "title": "..."}, ...]

  statistical_evidence: jsonb("statistical_evidence").notNull().default(sql`'{}'::jsonb`),
  // Quantitative data supporting findings

  witness_statements: jsonb("witness_statements").default(sql`'{}'::jsonb`),
  // Testimonies from participants or observers

  media_coverage: jsonb("media_coverage").default(sql`'{}'::jsonb`),
  // News articles documenting the process

  official_documents: jsonb("official_documents").default(sql`'{}'::jsonb`),
  // Parliamentary records, committee reports, hansard

  // =========================================================================
  // AUDIT STATUS AND REVIEW
  // =========================================================================
  audit_status: varchar("audit_status", { length: 20 }).notNull().default("draft"),
  // Values: "draft", "peer_review", "published", "contested", "revised", "archived"

  peer_reviewed: boolean("peer_reviewed").notNull().default(false),
  peer_reviewers: varchar("peer_reviewers", { length: 200 }).array(),

  published_at: timestamp("published_at", { withTimezone: true }),
  publication_venue: varchar("publication_venue", { length: 200 }),
  // Where was this published? "Parliamentary website", "CSO report", etc.

  contested_at: timestamp("contested_at", { withTimezone: true }),
  contested_by: varchar("contested_by", { length: 200 }),
  contest_reason: text("contest_reason"),
  contest_response: text("contest_response"),

  revised_at: timestamp("revised_at", { withTimezone: true }),
  revision_reason: text("revision_reason"),

  // =========================================================================
  // RECOMMENDATIONS AND IMPACT
  // =========================================================================
  recommendations: text("recommendations"),
  // What should change in future processes?

  best_practices_identified: text("best_practices_identified"),
  // What worked well and should be replicated?

  lessons_learned: text("lessons_learned"),

  impact_on_bill: varchar("impact_on_bill", { length: 50 }),
  // Values: "no_impact", "minor_amendments", "major_revision",
  //         "process_restarted", "bill_withdrawn"

  policy_changes_triggered: text("policy_changes_triggered"),
  // Did this audit lead to procedural reforms?

  public_awareness_impact: varchar("public_awareness_impact", { length: 20 }),
  // Values: "none", "low", "moderate", "high", "viral"

  // =========================================================================
  // METADATA
  // =========================================================================
  ...auditFields(),
  created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updated_by: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),

}, (table) => ({
  // =========================================================================
  // INDEXES - Optimized for oversight queries
  // =========================================================================

  // Primary lookup: Get all audits for a bill
  billAuditDateIdx: index("idx_participation_audits_bill_audit_date")
    .on(table.bill_id, table.audit_date),

  // Published audits by quality score (for public dashboard)
  scorePublishedIdx: index("idx_participation_audits_score_published")
    .on(table.participation_quality_score)
    .where(sql`${table.audit_status} = 'published'`),

  // Constitutional compliance monitoring
  compliancePublishedIdx: index("idx_participation_audits_compliance_published")
    .on(table.constitutional_compliance, table.audit_date)
    .where(sql`${table.audit_status} = 'published'`),

  // Non-compliant bills (priority oversight)
  nonCompliantIdx: index("idx_participation_audits_non_compliant")
    .on(table.bill_id, table.audit_date)
    .where(sql`${table.constitutional_compliance} = false AND ${table.audit_status} = 'published'`),

  // Red flag detection - Any serious issues
  anyRedFlagIdx: index("idx_participation_audits_any_red_flag")
    .on(table.bill_id, table.audit_date)
    .where(sql`(${table.participation_washing_detected} = true
      OR ${table.elite_capture_detected} = true
      OR ${table.timing_manipulation_detected} = true
      OR ${table.post_hoc_amendments_detected} = true
      OR ${table.access_barriers_detected} = true
      OR ${table.procedural_irregularities_detected} = true
      OR ${table.conflicts_of_interest_detected} = true)
      AND ${table.audit_status} = 'published'`),

  // Participation washing detection (most serious violation)
  washingDetectedIdx: index("idx_participation_audits_washing")
    .on(table.audit_date)
    .where(sql`${table.participation_washing_detected} = true AND ${table.audit_status} = 'published'`),

  // Elite capture detection
  eliteCaptureIdx: index("idx_participation_audits_elite_capture")
    .on(table.audit_date)
    .where(sql`${table.elite_capture_detected} = true AND ${table.audit_status} = 'published'`),

  // Low quality participation processes (score < 50)
  lowQualityIdx: index("idx_participation_audits_low_quality")
    .on(table.participation_quality_score, table.audit_date)
    .where(sql`${table.participation_quality_score} < 50 AND ${table.audit_status} = 'published'`),

  // Very poor processes (score < 25)
  criticalQualityIdx: index("idx_participation_audits_critical_quality")
    .on(table.bill_id, table.audit_date)
    .where(sql`${table.participation_quality_score} < 25 AND ${table.audit_status} = 'published'`),

  // Auditor tracking and accountability
  auditorTypeIdx: index("idx_participation_audits_auditor_type")
    .on(table.auditor_type, table.audit_date),

  auditorOrgIdx: index("idx_participation_audits_auditor_org")
    .on(table.auditor_organization, table.audit_date)
    .where(sql`${table.auditor_organization} IS NOT NULL`),

  // Audit status workflow
  statusDateIdx: index("idx_participation_audits_status_date")
    .on(table.audit_status, table.audit_date),

  // Draft audits (work in progress)
  draftAuditsIdx: index("idx_participation_audits_drafts")
    .on(table.created_at)
    .where(sql`${table.audit_status} = 'draft'`),

  // Contested audits (requiring review)
  contestedIdx: index("idx_participation_audits_contested")
    .on(table.contested_at)
    .where(sql`${table.audit_status} = 'contested'`),

  // Time-series analysis: Audit trends over time
  auditDateIdx: index("idx_participation_audits_audit_date")
    .on(table.audit_date),

  // Geographic coverage analysis
  coverageScoreIdx: index("idx_participation_audits_coverage_score")
    .on(table.geographic_coverage_score)
    .where(sql`${table.audit_status} = 'published'`),

  // Inclusivity performance
  inclusivityScoreIdx: index("idx_participation_audits_inclusivity_score")
    .on(table.inclusivity_score)
    .where(sql`${table.audit_status} = 'published'`),

  // =========================================================================
  // CHECK CONSTRAINTS - Data validation
  // =========================================================================

  // All scores must be 0-100 or NULL
  scoresRangeCheck: check("scores_range_check",
    sql`(${table.participation_quality_score} IS NULL OR ${table.participation_quality_score} BETWEEN 0 AND 100)
      AND (${table.timeline_score} IS NULL OR ${table.timeline_score} BETWEEN 0 AND 100)
      AND (${table.accessibility_score} IS NULL OR ${table.accessibility_score} BETWEEN 0 AND 100)
      AND (${table.inclusivity_score} IS NULL OR ${table.inclusivity_score} BETWEEN 0 AND 100)
      AND (${table.response_quality_score} IS NULL OR ${table.response_quality_score} BETWEEN 0 AND 100)
      AND (${table.process_integrity_score} IS NULL OR ${table.process_integrity_score} BETWEEN 0 AND 100)
      AND (${table.geographic_coverage_score} IS NULL OR ${table.geographic_coverage_score} BETWEEN 0 AND 100)
      AND (${table.notice_quality_score} IS NULL OR ${table.notice_quality_score} BETWEEN 0 AND 100)`),

  // Rates must be 0-100 or NULL
  ratesRangeCheck: check("rates_range_check",
    sql`(${table.incorporation_rate} IS NULL OR ${table.incorporation_rate} BETWEEN 0 AND 100)
      AND (${table.acknowledgment_rate} IS NULL OR ${table.acknowledgment_rate} BETWEEN 0 AND 100)
      AND (${table.analysis_rate} IS NULL OR ${table.analysis_rate} BETWEEN 0 AND 100)`),

  // Submission counts must be logical
  submissionsLogicCheck: check("submissions_logic_check",
    sql`${table.total_submissions} >= 0
      AND ${table.unique_participants} >= 0
      AND ${table.unique_participants} <= ${table.total_submissions}
      AND ${table.submissions_acknowledged} >= 0
      AND ${table.submissions_acknowledged} <= ${table.total_submissions}
      AND ${table.submissions_analyzed} >= 0
      AND ${table.submissions_analyzed} <= ${table.total_submissions}
      AND ${table.submissions_incorporated} >= 0
      AND ${table.submissions_incorporated} <= ${table.total_submissions}
      AND ${table.submissions_incorporated} <= ${table.submissions_analyzed}`),

  // Days and counts must be non-negative
  positiveCountsCheck: check("positive_counts_check",
    sql`(${table.days_allocated} IS NULL OR ${table.days_allocated} >= 0)
      AND (${table.minimum_days_required} IS NULL OR ${table.minimum_days_required} >= 0)
      AND (${table.notice_days_given} IS NULL OR ${table.notice_days_given} >= 0)
      AND (${table.counties_required} IS NULL OR ${table.counties_required} >= 0)
      AND (${table.public_hearings_count} IS NULL OR ${table.public_hearings_count} >= 0)
      AND ${table.audit_version} > 0`),

  // Dates must be in logical order
  datesLogicCheck: check("dates_logic_check",
    sql`(${table.participation_start_date} IS NULL OR ${table.participation_end_date} IS NULL
      OR ${table.participation_start_date} <= ${table.participation_end_date})`),
}));

// ============================================================================
// RELATIONS - Cross-schema connections
// ============================================================================

export const participationQualityAuditsRelations = relations(participation_quality_audits, ({ one }) => ({
  // The bill being audited
  bill: one(bills, {
    fields: [participation_quality_audits.bill_id],
    references: [bills.id],
  }),

  // The person/organization conducting the audit
  auditor: one(users, {
    fields: [participation_quality_audits.auditor_id],
    references: [users.id],
  }),

  // Audit record management
  createdBy: one(users, {
    fields: [participation_quality_audits.created_by],
    references: [users.id],
    relationName: "audit_creator",
  }),

  updatedBy: one(users, {
    fields: [participation_quality_audits.updated_by],
    references: [users.id],
    relationName: "audit_updater",
  }),
}));;

// ============================================================================
// TYPE EXPORTS - TypeScript type safety
// ============================================================================

export type ParticipationQualityAudit = typeof participation_quality_audits.$inferSelect;
export type NewParticipationQualityAudit = typeof participation_quality_audits.$inferInsert;

// ============================================================================
// HELPER TYPES - For common query patterns
// ============================================================================

export type AuditWithRedFlags = ParticipationQualityAudit & {
  hasRedFlags: boolean;
  redFlagCount: number;
  criticalIssues: string[];
};

export type AuditSummary = Pick<ParticipationQualityAudit,
  | 'id'
  | 'bill_id'
  | 'audit_date'
  | 'participation_quality_score'
  | 'constitutional_compliance'
  | 'audit_status'
> & {
  hasRedFlags: boolean;
};

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'contested' | 'pending_audit';

// ============================================================================
// SCORING WEIGHTS - For calculating composite scores
// ============================================================================

export const AUDIT_SCORING_WEIGHTS = {
  timeline: 0.15,        // 15% - Was enough time given?
  accessibility: 0.25,    // 25% - Could people access the process?
  inclusivity: 0.25,      // 25% - Were marginalized groups included?
  response_quality: 0.20, // 20% - Was feedback meaningful?
  process_integrity: 0.15 // 15% - Were procedures followed?
} as const;

// Red flag severity levels
export const RED_FLAG_SEVERITY = {
  participation_washing: 'critical',    // Most serious
  elite_capture: 'critical',
  timing_manipulation: 'high',
  post_hoc_amendments: 'high',
  access_barriers: 'medium',
  procedural_irregularities: 'medium',
  conflicts_of_interest: 'high'
} as const;

// ============================================================================
// RELATIONS - Drizzle ORM Relations (moved from foundation.ts)
// ============================================================================
// These relations are defined here to avoid circular dependencies between
// foundation.ts and participation_oversight.ts
// NOTE: participationQualityAuditsRelations already defined above at line 478

// Reverse relations for users (audits)
export const usersAuditsRelations = relations(users, ({ many }) => ({
  audits: many(participation_quality_audits, { relationName: "auditor" }),
  createdAudits: many(participation_quality_audits, { relationName: "audit_creator" }),
  updatedAudits: many(participation_quality_audits, { relationName: "audit_updater" }),
}));

// Reverse relations for bills (audits)
export const billsAuditsRelations = relations(bills, ({ many }) => ({
  audits: many(participation_quality_audits),
}));
