// ============================================================================
// PARLIAMENTARY PROCESS SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Legislative procedures, bill readings, amendments, and committee processes
// This schema tracks the formal parliamentary workflow required by Kenya's Constitution

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";

import { primaryKeyUuid, auditFields } from "./base-types";
import { bills, sponsors } from "./foundation";

// ============================================================================
// COMMITTEES - Parliamentary committees
// ============================================================================

export const committees = pgTable("committees", {
  id: primaryKeyUuid(),
  name: varchar("name", { length: 200 }).notNull(),
  chamber: varchar("chamber", { length: 50 }).notNull(), // "national_assembly", "senate", "joint"
  committee_type: varchar("committee_type", { length: 100 }).notNull(),
  description: text("description"),
  ...auditFields(),
});

// ============================================================================
// PARLIAMENTARY SESSIONS - Legislative sessions
// ============================================================================

export const parliamentary_sessions = pgTable("parliamentary_sessions", {
  id: primaryKeyUuid(),
  session_number: integer("session_number").notNull(),
  session_name: varchar("session_name", { length: 200 }).notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  ...auditFields(),
});

// ============================================================================
// BILL COMMITTEE ASSIGNMENTS - Track committee responsibility for bills
// ============================================================================

export const bill_committee_assignments = pgTable("bill_committee_assignments", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  committee_id: uuid("committee_id").notNull().references(() => committees.id, { onDelete: "cascade" }),

  // Assignment details
  assignment_type: varchar("assignment_type", { length: 50 }).notNull(), // "primary", "secondary", "joint"
  assigned_date: date("assigned_date").notNull().default(sql`CURRENT_DATE`),
  assignment_reason: text("assignment_reason"),

  // Committee work status
  status: varchar("status", { length: 30 }).notNull().default("assigned"), // "assigned", "reviewing", "report_pending", "completed"
  expected_report_date: date("expected_report_date"),
  actual_report_date: date("actual_report_date"),

  // Committee report
  report_url: varchar("report_url", { length: 500 }),
  report_summary: text("report_summary"),
  committee_recommendation: varchar("committee_recommendation", { length: 50 }), // "approve", "reject", "amend"

  ...auditFields(),
}, (table) => ({
  // One primary assignment per bill - using partial unique index instead
  billAssignmentIdx: index("idx_bill_committee_assignments_bill_assignment")
    .on(table.bill_id, table.assignment_type, table.status),

  // Committee workload queries
  committeeStatusIdx: index("idx_bill_committee_assignments_committee_status")
    .on(table.committee_id, table.status, table.assigned_date),
}));

// ============================================================================
// BILL AMENDMENTS - Track proposed changes to bills
// ============================================================================

export const bill_amendments = pgTable("bill_amendments", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Amendment identification
  amendment_number: varchar("amendment_number", { length: 50 }).notNull(),
  amendment_title: varchar("amendment_title", { length: 500 }),

  // Amendment content
  section_affected: varchar("section_affected", { length: 100 }),
  amendment_type: varchar("amendment_type", { length: 30 }).notNull(), // "insertion", "deletion", "substitution", "new_clause"
  original_text: text("original_text"),
  proposed_text: text("proposed_text").notNull(),
  amendment_rationale: text("amendment_rationale"),

  // Amendment source
  proposed_by_id: uuid("proposed_by_id").references(() => sponsors.id, { onDelete: "set null" }),
  proposed_by_committee_id: uuid("proposed_by_committee_id").references(() => committees.id, { onDelete: "set null" }),
  proposed_date: date("proposed_date").notNull().default(sql`CURRENT_DATE`),

  // Amendment status
  status: varchar("status", { length: 30 }).notNull().default("proposed"), // "proposed", "debated", "approved", "rejected", "withdrawn"
  voting_date: date("voting_date"),
  votes_for: integer("votes_for").notNull().default(0),
  votes_against: integer("votes_against").notNull().default(0),
  votes_abstain: integer("votes_abstain").notNull().default(0),

  // Impact assessment
  constitutional_implications: text("constitutional_implications"),
  financial_implications: text("financial_implications"),

  ...auditFields(),
}, (table) => ({
  // Unique amendment number per bill
  billAmendmentNumberUnique: unique("bill_amendments_bill_amendment_number_unique")
    .on(table.bill_id, table.amendment_number),

  // Amendment status tracking
  billStatusIdx: index("idx_bill_amendments_bill_status")
    .on(table.bill_id, table.status, table.proposed_date),

  // Sponsor amendment tracking
  proposedByIdx: index("idx_bill_amendments_proposed_by")
    .on(table.proposed_by_id, table.status)
    .where(sql`${table.proposed_by_id} IS NOT NULL`),
}));

// ============================================================================
// BILL VERSIONS - Track bill text changes over time
// ============================================================================

export const bill_versions = pgTable("bill_versions", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Version identification
  version_number: varchar("version_number", { length: 20 }).notNull(),
  version_name: varchar("version_name", { length: 100 }), // "First Reading", "Committee Version", "Final"

  // Version content
  full_text: text("full_text").notNull(),
  summary_of_changes: text("summary_of_changes"),

  // Version metadata
  created_by_stage: varchar("created_by_stage", { length: 50 }), // "introduction", "committee", "amendment", "final"
  is_current_version: boolean("is_current_version").notNull().default(false),

  // Document references
  document_url: varchar("document_url", { length: 500 }),
  document_hash: varchar("document_hash", { length: 64 }), // SHA-256 for integrity

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique version number per bill
  billVersionNumberUnique: unique("bill_versions_bill_version_number_unique")
    .on(table.bill_id, table.version_number),

  // Current version tracking - using partial index instead
  billCurrentVersionIdx: index("idx_bill_versions_bill_current_version")
    .on(table.bill_id, table.is_current_version)
    .where(sql`${table.is_current_version} = true`),

  // Version chronology
  billVersionIdx: index("idx_bill_versions_bill_version")
    .on(table.bill_id, table.created_at),
}));

// ============================================================================
// BILL READINGS - Track formal parliamentary readings
// ============================================================================

export const bill_readings = pgTable("bill_readings", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  session_id: uuid("session_id").references(() => parliamentary_sessions.id, { onDelete: "set null" }),

  // Reading details
  reading_number: smallint("reading_number").notNull(), // 1, 2, or 3
  reading_date: date("reading_date").notNull(),
  reading_stage: varchar("reading_stage", { length: 50 }), // "first_reading", "second_reading", "committee_stage", "third_reading"

  // Reading outcome
  outcome: varchar("outcome", { length: 30 }), // "passed", "rejected", "deferred", "withdrawn"
  votes_for: integer("votes_for"),
  votes_against: integer("votes_against"),
  votes_abstain: integer("votes_abstain"),

  // Reading content
  debate_summary: text("debate_summary"),
  key_speakers: varchar("key_speakers", { length: 100 }).array(),
  hansard_reference: varchar("hansard_reference", { length: 100 }),

  // Next steps
  next_reading_scheduled: date("next_reading_scheduled"),

  ...auditFields(),
}, (table) => ({
  // One reading per number per bill
  billReadingNumberUnique: unique("bill_readings_bill_reading_number_unique")
    .on(table.bill_id, table.reading_number),

  // Reading chronology
  billReadingDateIdx: index("idx_bill_readings_bill_reading_date")
    .on(table.bill_id, table.reading_date),

  // Session readings
  sessionReadingIdx: index("idx_bill_readings_session_reading")
    .on(table.session_id, table.reading_date)
    .where(sql`${table.session_id} IS NOT NULL`),

  // Validate reading number
  readingNumberCheck: check("bill_readings_reading_number_check",
    sql`${table.reading_number} >= 1 AND ${table.reading_number} <= 3`),
}));

// ============================================================================
// PARLIAMENTARY VOTES - Individual MP voting records
// ============================================================================

export const parliamentary_votes = pgTable("parliamentary_votes", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),

  // Vote context
  vote_stage: varchar("vote_stage", { length: 50 }).notNull(), // "second_reading", "third_reading", "amendment_vote"
  vote_date: date("vote_date").notNull(),
  amendment_id: uuid("amendment_id").references(() => bill_amendments.id, { onDelete: "set null" }),

  // Vote details
  vote_choice: varchar("vote_choice", { length: 20 }).notNull(), // "yes", "no", "abstain", "absent"
  vote_explanation: text("vote_explanation"),

  // Voting session metadata
  session_id: uuid("session_id").references(() => parliamentary_sessions.id, { onDelete: "set null" }),
  hansard_reference: varchar("hansard_reference", { length: 100 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One vote per MP per bill per stage
  sponsorBillStageUnique: unique("parliamentary_votes_sponsor_bill_stage_unique")
    .on(table.sponsor_id, table.bill_id, table.vote_stage, table.amendment_id),

  // Bill voting analysis
  billStageVoteIdx: index("idx_parliamentary_votes_bill_stage_vote")
    .on(table.bill_id, table.vote_stage, table.vote_choice),

  // MP voting record
  sponsorVoteIdx: index("idx_parliamentary_votes_sponsor_vote")
    .on(table.sponsor_id, table.vote_date, table.vote_choice),
}));

// ============================================================================
// BILL COSPONSORS - Track bill co-sponsorship
// ============================================================================

export const bill_cosponsors = pgTable("bill_cosponsors", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),

  // Co-sponsorship details
  cosponsor_type: varchar("cosponsor_type", { length: 30 }).notNull().default("supporting"), // "supporting", "lead", "secondary"
  joined_date: date("joined_date").notNull().default(sql`CURRENT_DATE`),

  // Co-sponsor contribution
  contribution_description: text("contribution_description"),
  public_statement: text("public_statement"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One co-sponsorship per MP per bill
  billSponsorUnique: unique("bill_cosponsors_bill_sponsor_unique")
    .on(table.bill_id, table.sponsor_id),

  // Bill co-sponsor queries
  billCosponsorIdx: index("idx_bill_cosponsors_bill_cosponsor")
    .on(table.bill_id, table.cosponsor_type, table.joined_date),

  // MP co-sponsorship activity
  sponsorActivityIdx: index("idx_bill_cosponsors_sponsor_activity")
    .on(table.sponsor_id, table.joined_date),
}));

// ============================================================================
// PUBLIC PARTICIPATION EVENTS - Constitutional Article 118 Compliance
// ============================================================================

export const public_participation_events = pgTable("public_participation_events", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Event details
  event_type: varchar("event_type", { length: 50 }).notNull(), // "public_hearing", "stakeholder_forum", "county_consultation"
  event_title: varchar("event_title", { length: 500 }).notNull(),
  event_description: text("event_description"),

  // Event logistics
  event_date: date("event_date").notNull(),
  event_time: varchar("event_time", { length: 20 }),
  venue: varchar("venue", { length: 300 }),
  county: varchar("county", { length: 50 }),

  // Participation details
  expected_participants: integer("expected_participants"),
  actual_participants: integer("actual_participants"),
  registration_required: boolean("registration_required").notNull().default(false),
  registration_deadline: date("registration_deadline"),

  // Event outcomes
  event_status: varchar("event_status", { length: 30 }).notNull().default("scheduled"), // "scheduled", "completed", "cancelled", "postponed"
  summary_report_url: varchar("summary_report_url", { length: 500 }),
  key_outcomes: text("key_outcomes"),

  // Organizing committee
  organizing_committee_id: uuid("organizing_committee_id").references(() => committees.id, { onDelete: "set null" }),
  contact_person: varchar("contact_person", { length: 200 }),
  contact_email: varchar("contact_email", { length: 320 }),
  contact_phone: varchar("contact_phone", { length: 20 }),

  ...auditFields(),
}, (table) => ({
  // Event scheduling queries
  eventDateStatusIdx: index("idx_public_participation_events_event_date_status")
    .on(table.event_date, table.event_status),

  // Bill participation tracking
  billEventIdx: index("idx_public_participation_events_bill_event")
    .on(table.bill_id, table.event_date, table.event_status),

  // County participation queries
  countyEventIdx: index("idx_public_participation_events_county_event")
    .on(table.county, table.event_date)
    .where(sql`${table.county} IS NOT NULL`),
}));

// ============================================================================
// PUBLIC SUBMISSIONS - Citizen input during public participation
// ============================================================================

export const public_submissions = pgTable("public_submissions", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  event_id: uuid("event_id").references(() => public_participation_events.id, { onDelete: "set null" }),

  // Submitter information
  submitter_name: varchar("submitter_name", { length: 200 }),
  submitter_organization: varchar("submitter_organization", { length: 300 }),
  submitter_type: varchar("submitter_type", { length: 50 }), // "individual", "organization", "government_agency", "expert"
  submitter_contact: jsonb("submitter_contact").$type<{
    email?: string;
    phone?: string;
    address?: string;
  }>().default(sql`'{}'::jsonb`),

  // Submission content
  submission_title: varchar("submission_title", { length: 500 }),
  submission_text: text("submission_text").notNull(),
  position: varchar("position", { length: 20 }), // "support", "oppose", "amend", "neutral"

  // Submission metadata
  submission_method: varchar("submission_method", { length: 30 }).notNull(), // "online", "email", "physical", "verbal"
  submission_date: date("submission_date").notNull().default(sql`CURRENT_DATE`),

  // Processing status
  review_status: varchar("review_status", { length: 30 }).notNull().default("received"), // "received", "under_review", "acknowledged", "incorporated"
  committee_response: text("committee_response"),

  // Document attachments
  supporting_documents: varchar("supporting_documents", { length: 500 }).array(),

  ...auditFields(),
}, (table) => ({
  // Bill submission tracking
  billSubmissionIdx: index("idx_public_submissions_bill_submission")
    .on(table.bill_id, table.submission_date, table.review_status),

  // Event submission tracking
  eventSubmissionIdx: index("idx_public_submissions_event_submission")
    .on(table.event_id, table.submission_date)
    .where(sql`${table.event_id} IS NOT NULL`),

  // Review queue management
  reviewStatusIdx: index("idx_public_submissions_review_status")
    .on(table.review_status, table.submission_date),
}));

// ============================================================================
// PUBLIC HEARINGS - Formal hearing sessions
// ============================================================================

export const public_hearings = pgTable("public_hearings", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  event_id: uuid("event_id").references(() => public_participation_events.id, { onDelete: "set null" }),

  // Hearing details
  hearing_title: varchar("hearing_title", { length: 500 }).notNull(),
  hearing_date: date("hearing_date").notNull(),
  start_time: varchar("start_time", { length: 10 }),
  end_time: varchar("end_time", { length: 10 }),

  // Hearing logistics
  venue: varchar("venue", { length: 300 }),
  presiding_committee_id: uuid("presiding_committee_id").references(() => committees.id, { onDelete: "set null" }),
  chairperson_id: uuid("chairperson_id").references(() => sponsors.id, { onDelete: "set null" }),

  // Hearing participants
  invited_speakers: jsonb("invited_speakers").notNull().default(sql`'{}'::jsonb`),
  public_speakers: jsonb("public_speakers").notNull().default(sql`'{}'::jsonb`),

  // Hearing outcomes
  hearing_status: varchar("hearing_status", { length: 30 }).notNull().default("scheduled"), // "scheduled", "in_progress", "completed", "cancelled"
  transcript_url: varchar("transcript_url", { length: 500 }),
  video_url: varchar("video_url", { length: 500 }),
  summary_report: text("summary_report"),

  ...auditFields(),
}, (table) => ({
  // Hearing scheduling
  hearingDateStatusIdx: index("idx_public_hearings_hearing_date_status")
    .on(table.hearing_date, table.hearing_status),

  // Bill hearing tracking
  billHearingIdx: index("idx_public_hearings_bill_hearing")
    .on(table.bill_id, table.hearing_date),

  // Committee hearing workload
  committeeHearingIdx: index("idx_public_hearings_committee_hearing")
    .on(table.presiding_committee_id, table.hearing_date)
    .where(sql`${table.presiding_committee_id} IS NOT NULL`),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const billCommitteeAssignmentsRelations = relations(bill_committee_assignments, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_committee_assignments.bill_id],
    references: [bills.id],
  }),
  committee: one(committees, {
    fields: [bill_committee_assignments.committee_id],
    references: [committees.id],
  }),
}));

export const billAmendmentsRelations = relations(bill_amendments, ({ one, many }) => ({
  bill: one(bills, {
    fields: [bill_amendments.bill_id],
    references: [bills.id],
  }),
  proposedBy: one(sponsors, {
    fields: [bill_amendments.proposed_by_id],
    references: [sponsors.id],
  }),
  proposedByCommittee: one(committees, {
    fields: [bill_amendments.proposed_by_committee_id],
    references: [committees.id],
  }),
  votes: many(parliamentary_votes),
}));

export const billVersionsRelations = relations(bill_versions, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_versions.bill_id],
    references: [bills.id],
  }),
}));

export const billReadingsRelations = relations(bill_readings, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_readings.bill_id],
    references: [bills.id],
  }),
  session: one(parliamentary_sessions, {
    fields: [bill_readings.session_id],
    references: [parliamentary_sessions.id],
  }),
}));

export const parliamentaryVotesRelations = relations(parliamentary_votes, ({ one }) => ({
  bill: one(bills, {
    fields: [parliamentary_votes.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [parliamentary_votes.sponsor_id],
    references: [sponsors.id],
  }),
  amendment: one(bill_amendments, {
    fields: [parliamentary_votes.amendment_id],
    references: [bill_amendments.id],
  }),
  session: one(parliamentary_sessions, {
    fields: [parliamentary_votes.session_id],
    references: [parliamentary_sessions.id],
  }),
}));

export const billCosponsorsRelations = relations(bill_cosponsors, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_cosponsors.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [bill_cosponsors.sponsor_id],
    references: [sponsors.id],
  }),
}));

export const publicParticipationEventsRelations = relations(public_participation_events, ({ one, many }) => ({
  bill: one(bills, {
    fields: [public_participation_events.bill_id],
    references: [bills.id],
  }),
  organizingCommittee: one(committees, {
    fields: [public_participation_events.organizing_committee_id],
    references: [committees.id],
  }),
  submissions: many(public_submissions),
  hearings: many(public_hearings),
}));

export const publicSubmissionsRelations = relations(public_submissions, ({ one }) => ({
  bill: one(bills, {
    fields: [public_submissions.bill_id],
    references: [bills.id],
  }),
  event: one(public_participation_events, {
    fields: [public_submissions.event_id],
    references: [public_participation_events.id],
  }),
}));

export const publicHearingsRelations = relations(public_hearings, ({ one }) => ({
  bill: one(bills, {
    fields: [public_hearings.bill_id],
    references: [bills.id],
  }),
  event: one(public_participation_events, {
    fields: [public_hearings.event_id],
    references: [public_participation_events.id],
  }),
  presidingCommittee: one(committees, {
    fields: [public_hearings.presiding_committee_id],
    references: [committees.id],
  }),
  chairperson: one(sponsors, {
    fields: [public_hearings.chairperson_id],
    references: [sponsors.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BillCommitteeAssignment = typeof bill_committee_assignments.$inferSelect;
export type NewBillCommitteeAssignment = typeof bill_committee_assignments.$inferInsert;

export type BillAmendment = typeof bill_amendments.$inferSelect;
export type NewBillAmendment = typeof bill_amendments.$inferInsert;

export type BillVersion = typeof bill_versions.$inferSelect;
export type NewBillVersion = typeof bill_versions.$inferInsert;

export type BillReading = typeof bill_readings.$inferSelect;
export type NewBillReading = typeof bill_readings.$inferInsert;

export type ParliamentaryVote = typeof parliamentary_votes.$inferSelect;
export type NewParliamentaryVote = typeof parliamentary_votes.$inferInsert;

export type BillCosponsor = typeof bill_cosponsors.$inferSelect;
export type NewBillCosponsor = typeof bill_cosponsors.$inferInsert;

export type PublicParticipationEvent = typeof public_participation_events.$inferSelect;
export type NewPublicParticipationEvent = typeof public_participation_events.$inferInsert;

export type PublicSubmission = typeof public_submissions.$inferSelect;
export type NewPublicSubmission = typeof public_submissions.$inferInsert;

export type PublicHearing = typeof public_hearings.$inferSelect;
export type NewPublicHearing = typeof public_hearings.$inferInsert;
