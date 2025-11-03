// ============================================================================
// PARLIAMENTARY PROCESS SCHEMA - OPTIMIZED
// ============================================================================
// Tracks legislative workflow: sessions, readings, amendments, and public participation

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, primaryKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  chamberEnum,
  billStatusEnum
} from "./enum";

import {
  bills,
  sponsors,
  committees,
  parliamentary_sessions,
  parliamentary_sittings
} from "./foundation";

// ============================================================================
// BILL COMMITTEE ASSIGNMENTS
// ============================================================================
// Tracks which committees review which bills, including hearing schedules
// and committee recommendations throughout the review process

export const bill_committee_assignments = pgTable("bill_committee_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  committee_id: uuid("committee_id").notNull().references(() => committees.id, { onDelete: "cascade" }),
  
  // Assignment metadata
  assignment_date: date("assignment_date").notNull(),
  assignment_reason: text("assignment_reason"),
  priority_level: varchar("priority_level", { length: 20 }).notNull().default("normal"), // urgent, high, normal, low
  
  // Review workflow tracking
  review_status: varchar("review_status", { length: 50 }).notNull().default("assigned"), // assigned, in_progress, completed, deferred
  review_start_date: date("review_start_date"),
  review_completion_date: date("review_completion_date"),
  
  // Public hearing coordination
  public_hearing_scheduled: boolean("public_hearing_scheduled").notNull().default(false),
  public_hearing_date: date("public_hearing_date"),
  public_hearing_venue: varchar("public_hearing_venue", { length: 255 }),
  
  // Committee outputs
  committee_report_url: varchar("committee_report_url", { length: 500 }),
  committee_report_summary: text("committee_report_summary"),
  committee_recommendations: jsonb("committee_recommendations").$type<Array<{
    recommendation: string;
    priority: string;
    rationale?: string;
  }>>().default(sql`'[]'::jsonb`),
  
  // Amendment statistics (denormalized for quick access)
  amendments_proposed: integer("amendments_proposed").notNull().default(0),
  amendments_adopted: integer("amendments_adopted").notNull().default(0),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Ensure each bill-committee pairing is unique
  billCommitteeUnique: uniqueIndex("bill_committee_assignments_bill_committee_idx")
    .on(table.bill_id, table.committee_id),
  // Optimized indexes for common query patterns
  billIdx: index("bill_committee_assignments_bill_idx").on(table.bill_id),
  committeeIdx: index("bill_committee_assignments_committee_idx").on(table.committee_id),
  // Composite index for date-based queries filtered by status
  statusDateIdx: index("bill_committee_assignments_status_date_idx")
    .on(table.review_status, table.assignment_date),
  // Support queries for upcoming hearings
  hearingDateIdx: index("bill_committee_assignments_hearing_date_idx")
    .on(table.public_hearing_date)
    .where(sql`${table.public_hearing_scheduled} = true`),
}));

// ============================================================================
// BILL AMENDMENTS
// ============================================================================
// Comprehensive tracking of proposed changes to bills, including voting records
// and public engagement metrics for each amendment

export const bill_amendments = pgTable("bill_amendments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Amendment identification
  amendment_number: varchar("amendment_number", { length: 50 }).notNull(),
  amendment_title: varchar("amendment_title", { length: 500 }),
  
  // Proposer details
  proposer_id: uuid("proposer_id").references(() => sponsors.id, { onDelete: "set null" }),
  proposer_type: varchar("proposer_type", { length: 50 }).notNull().default("sponsor"), // sponsor, committee, citizen, government
  
  // Amendment content and context
  section_to_amend: varchar("section_to_amend", { length: 100 }),
  original_text: text("original_text"),
  proposed_text: text("proposed_text").notNull(),
  amendment_rationale: text("amendment_rationale"),
  
  // Lifecycle status
  status: varchar("status", { length: 50 }).notNull().default("proposed"), // proposed, under_review, adopted, rejected, withdrawn
  
  // Committee-level voting (if applicable)
  committee_vote_for: integer("committee_vote_for").notNull().default(0),
  committee_vote_against: integer("committee_vote_against").notNull().default(0),
  committee_vote_abstain: integer("committee_vote_abstain").notNull().default(0),
  
  // House-level voting
  house_vote_for: integer("house_vote_for").notNull().default(0),
  house_vote_against: integer("house_vote_against").notNull().default(0),
  house_vote_abstain: integer("house_vote_abstain").notNull().default(0),
  
  // Timeline milestones
  proposed_date: date("proposed_date").notNull(),
  committee_decision_date: date("committee_decision_date"),
  house_decision_date: date("house_decision_date"),
  
  // Impact analysis
  impact_assessment: text("impact_assessment"),
  constitutional_implications: jsonb("constitutional_implications").$type<{
    articles_affected?: string[];
    compliance_status?: string;
    legal_opinion?: string;
  }>().default(sql`'{}'::jsonb`),
  
  // Public engagement metrics
  public_support_count: integer("public_support_count").notNull().default(0),
  public_oppose_count: integer("public_oppose_count").notNull().default(0),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  billIdx: index("bill_amendments_bill_idx").on(table.bill_id),
  proposerIdx: index("bill_amendments_proposer_idx").on(table.proposer_id),
  // Composite index for filtering by bill and status together
  billStatusIdx: index("bill_amendments_bill_status_idx")
    .on(table.bill_id, table.status),
  // Support chronological queries
  proposedDateIdx: index("bill_amendments_proposed_date_idx").on(table.proposed_date),
  // Unique constraint on amendment numbers within each bill
  amendmentNumberUnique: uniqueIndex("bill_amendments_bill_number_idx")
    .on(table.bill_id, table.amendment_number),
}));

// ============================================================================
// BILL VERSIONS
// ============================================================================
// Maintains version history as bills evolve through amendments and revisions
// Enables comparison between versions and tracks the current authoritative text

export const bill_versions = pgTable("bill_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Version metadata
  version_number: integer("version_number").notNull(),
  version_date: date("version_date").notNull(),
  version_type: varchar("version_type", { length: 50 }).notNull(), // original, committee_amended, house_amended, final, enrolled
  
  // Document content
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  full_text: text("full_text").notNull(),
  
  // Change tracking
  changes_summary: text("changes_summary"),
  amendments_incorporated: uuid("amendments_incorporated").array().default(sql`ARRAY[]::uuid[]`),
  
  // Source attribution
  version_source: varchar("version_source", { length: 100 }).notNull(), // sponsor, committee, house_vote, presidential_assent
  source_document_url: varchar("source_document_url", { length: 500 }),
  
  // Version control
  is_current_version: boolean("is_current_version").notNull().default(false),
  publication_status: varchar("publication_status", { length: 50 }).notNull().default("draft"), // draft, published, archived
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Enforce unique version numbers per bill
  billVersionUnique: uniqueIndex("bill_versions_bill_version_idx")
    .on(table.bill_id, table.version_number),
  billIdx: index("bill_versions_bill_idx").on(table.bill_id),
  versionDateIdx: index("bill_versions_date_idx").on(table.version_date),
  // Partial index for quickly finding the current version
  currentVersionIdx: index("bill_versions_current_idx")
    .on(table.bill_id, table.is_current_version)
    .where(sql`${table.is_current_version} = true`),
}));

// ============================================================================
// BILL READINGS
// ============================================================================
// Records each formal reading stage in parliament, including debate details
// and voting outcomes that determine a bill's progression

export const bill_readings = pgTable("bill_readings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Reading specification
  reading_number: integer("reading_number").notNull(), // 1, 2, 3
  reading_type: varchar("reading_type", { length: 50 }).notNull(), // first, second, third, reconsideration
  
  // Parliamentary context
  parliamentary_session_id: uuid("parliamentary_session_id").references(() => parliamentary_sessions.id),
  sitting_id: uuid("sitting_id").references(() => parliamentary_sittings.id),
  
  // Reading results
  reading_date: date("reading_date").notNull(),
  reading_outcome: varchar("reading_outcome", { length: 50 }).notNull(), // passed, rejected, deferred, withdrawn
  
  // Voting tallies
  vote_for: integer("vote_for").notNull().default(0),
  vote_against: integer("vote_against").notNull().default(0),
  vote_abstain: integer("vote_abstain").notNull().default(0),
  total_present: integer("total_present").notNull().default(0),
  
  // Debate documentation
  debate_duration_minutes: integer("debate_duration_minutes"),
  key_debate_points: text("key_debate_points").array().default(sql`ARRAY[]::text[]`),
  hansard_reference: varchar("hansard_reference", { length: 100 }),
  
  // Forward planning
  next_action_required: varchar("next_action_required", { length: 100 }),
  next_scheduled_date: date("next_scheduled_date"),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Ensure only one record per reading stage per bill
  billReadingUnique: uniqueIndex("bill_readings_bill_reading_idx")
    .on(table.bill_id, table.reading_number),
  billIdx: index("bill_readings_bill_idx").on(table.bill_id),
  // Support chronological and outcome-based queries
  readingDateIdx: index("bill_readings_date_idx").on(table.reading_date),
  outcomeIdx: index("bill_readings_outcome_idx").on(table.reading_outcome),
  // Link to parliamentary sessions for session-based reporting
  sessionIdx: index("bill_readings_session_idx").on(table.parliamentary_session_id),
}));

// ============================================================================
// PARLIAMENTARY VOTES
// ============================================================================
// Individual voting records for each sponsor on bills and amendments
// Enables transparency and accountability tracking

export const parliamentary_votes = pgTable("parliamentary_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  
  // Vote context
  vote_type: varchar("vote_type", { length: 50 }).notNull(), // reading, amendment, procedural, final_passage
  reading_number: integer("reading_number"),
  amendment_id: uuid("amendment_id").references(() => bill_amendments.id, { onDelete: "set null" }),
  
  // Vote position
  vote_position: varchar("vote_position", { length: 20 }).notNull(), // for, against, abstain, absent, paired
  vote_weight: integer("vote_weight").notNull().default(1),
  
  // Public explanation
  vote_explanation: text("vote_explanation"),
  public_statement_url: varchar("public_statement_url", { length: 500 }),
  
  // Session linkage
  parliamentary_session_id: uuid("parliamentary_session_id").references(() => parliamentary_sessions.id),
  sitting_id: uuid("sitting_id").references(() => parliamentary_sittings.id),
  
  vote_date: date("vote_date").notNull(),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Prevent duplicate votes from same sponsor on same matter
  billSponsorVoteUnique: uniqueIndex("parliamentary_votes_unique_idx")
    .on(table.bill_id, table.sponsor_id, table.vote_type, table.reading_number, table.amendment_id),
  // Support queries by bill, sponsor, and date
  billIdx: index("parliamentary_votes_bill_idx").on(table.bill_id),
  sponsorIdx: index("parliamentary_votes_sponsor_idx").on(table.sponsor_id),
  voteDateIdx: index("parliamentary_votes_date_idx").on(table.vote_date),
  // Composite index for sponsor voting analysis
  sponsorPositionIdx: index("parliamentary_votes_sponsor_position_idx")
    .on(table.sponsor_id, table.vote_position),
  amendmentIdx: index("parliamentary_votes_amendment_idx").on(table.amendment_id),
}));

// ============================================================================
// BILL COSPONSORS
// ============================================================================
// Tracks sponsorship relationships, distinguishing between primary sponsors
// and supporting cosponsors

export const bill_cosponsors = pgTable("bill_cosponsors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  
  // Sponsorship role
  sponsorship_role: varchar("sponsorship_role", { length: 50 }).notNull().default("cosponsor"), // primary, cosponsor, supporter
  sponsorship_order: integer("sponsorship_order").notNull().default(1), // For display ordering
  
  // Timeline
  joined_date: date("joined_date").notNull(),
  withdrawal_date: date("withdrawal_date"),
  is_active: boolean("is_active").notNull().default(true),
  
  // Motivation and contribution
  contribution_description: text("contribution_description"),
  constituency_interest: text("constituency_interest"),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Each sponsor can only have one role per bill
  billSponsorUnique: uniqueIndex("bill_cosponsors_bill_sponsor_idx")
    .on(table.bill_id, table.sponsor_id),
  billIdx: index("bill_cosponsors_bill_idx").on(table.bill_id),
  sponsorIdx: index("bill_cosponsors_sponsor_idx").on(table.sponsor_id),
  // Filter active cosponsors efficiently
  activeIdx: index("bill_cosponsors_active_idx")
    .on(table.bill_id, table.is_active)
    .where(sql`${table.is_active} = true`),
  roleIdx: index("bill_cosponsors_role_idx").on(table.sponsorship_role),
}));

// ============================================================================
// PUBLIC PARTICIPATION EVENTS
// ============================================================================
// Schedules and tracks public engagement opportunities like hearings,
// consultations, and town halls

export const public_participation_events = pgTable("public_participation_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Event identification
  event_type: varchar("event_type", { length: 100 }).notNull(), // public_hearing, consultation, town_hall, stakeholder_forum
  event_title: varchar("event_title", { length: 500 }).notNull(),
  event_description: text("event_description"),
  
  // Scheduling details
  event_date: date("event_date").notNull(),
  event_time: varchar("event_time", { length: 50 }), // Start time
  duration_hours: numeric("duration_hours", { precision: 3, scale: 1 }),
  
  // Location information
  venue_name: varchar("venue_name", { length: 255 }),
  venue_address: text("venue_address"),
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  
  // Accessibility features
  accessibility_info: text("accessibility_info"),
  language_support: varchar("language_support", { length: 100 }).array().default(sql`ARRAY[]::varchar[]`), // Languages available
  
  // Organizing body
  organizing_committee_id: uuid("organizing_committee_id").references(() => committees.id),
  organizing_office: varchar("organizing_office", { length: 255 }),
  
  // Registration requirements
  registration_required: boolean("registration_required").notNull().default(true),
  registration_deadline: date("registration_deadline"),
  max_participants: integer("max_participants"),
  registration_url: varchar("registration_url", { length: 500 }),
  
  // Event lifecycle
  event_status: varchar("event_status", { length: 50 }).notNull().default("scheduled"), // scheduled, ongoing, completed, cancelled, postponed
  actual_attendance: integer("actual_attendance"),
  event_outcomes: text("event_outcomes"),
  
  // Digital access
  livestream_url: varchar("livestream_url", { length: 500 }),
  recording_url: varchar("recording_url", { length: 500 }),
  event_photos: varchar("event_photos", { length: 500 }).array().default(sql`ARRAY[]::varchar[]`),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  billIdx: index("public_participation_events_bill_idx").on(table.bill_id),
  // Support location-based and date-based queries
  eventDateIdx: index("public_participation_events_date_idx").on(table.event_date),
  countyIdx: index("public_participation_events_county_idx").on(table.county),
  // Filter by status for active event management
  statusIdx: index("public_participation_events_status_idx").on(table.event_status),
  // Composite index for upcoming events
  upcomingEventsIdx: index("public_participation_events_upcoming_idx")
    .on(table.event_status, table.event_date)
    .where(sql`${table.event_status} IN ('scheduled', 'ongoing')`),
  committeeIdx: index("public_participation_events_committee_idx").on(table.organizing_committee_id),
}));

// ============================================================================
// PUBLIC SUBMISSIONS
// ============================================================================
// Formal written or oral submissions from citizens and organizations
// regarding pending legislation

export const public_submissions = pgTable("public_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Submission details
  submission_type: varchar("submission_type", { length: 100 }).notNull(), // written, oral, petition, memorandum, technical_brief
  submission_title: varchar("submission_title", { length: 500 }).notNull(),
  submission_content: text("submission_content").notNull(),
  
  // Submitter identification
  submitter_type: varchar("submitter_type", { length: 50 }).notNull(), // individual, organization, coalition, government_agency
  submitter_name: varchar("submitter_name", { length: 255 }).notNull(),
  submitter_contact: jsonb("submitter_contact").$type<{
    email?: string;
    phone?: string;
    address?: string;
  }>().default(sql`'{}'::jsonb`),
  
  // Organization context (if applicable)
  organization_name: varchar("organization_name", { length: 255 }),
  organization_type: varchar("organization_type", { length: 100 }), // ngo, professional_body, trade_union, business_association
  organization_representation: text("organization_representation"), // Who they represent
  
  // Submission metadata
  submission_date: date("submission_date").notNull(),
  submission_method: varchar("submission_method", { length: 50 }).notNull(), // email, physical, online_portal, in_person
  
  // Target audience
  target_committee_id: uuid("target_committee_id").references(() => committees.id),
  
  // Submission content analysis
  key_recommendations: text("key_recommendations").array().default(sql`ARRAY[]::text[]`),
  supporting_documents: varchar("supporting_documents", { length: 500 }).array().default(sql`ARRAY[]::varchar[]`),
  
  // Committee response and incorporation
  committee_response: text("committee_response"),
  response_date: date("response_date"),
  incorporation_status: varchar("incorporation_status", { length: 50 }).default("pending"), // pending, reviewed, incorporated, rejected, acknowledged
  
  // Visibility and consent
  is_public: boolean("is_public").notNull().default(true),
  publication_consent: boolean("publication_consent").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  billIdx: index("public_submissions_bill_idx").on(table.bill_id),
  submissionDateIdx: index("public_submissions_date_idx").on(table.submission_date),
  submitterTypeIdx: index("public_submissions_submitter_type_idx").on(table.submitter_type),
  committeeIdx: index("public_submissions_committee_idx").on(table.target_committee_id),
  // Support filtering by incorporation status for committee review
  incorporationStatusIdx: index("public_submissions_incorporation_idx")
    .on(table.target_committee_id, table.incorporation_status),
  // Filter public submissions efficiently
  publicVisibilityIdx: index("public_submissions_public_idx")
    .on(table.is_public)
    .where(sql`${table.is_public} = true`),
}));

// ============================================================================
// PUBLIC HEARINGS
// ============================================================================
// Detailed records of public hearing sessions, including attendance,
// presentations, and outcomes

export const public_hearings = pgTable("public_hearings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  participation_event_id: uuid("participation_event_id").notNull()
    .references(() => public_participation_events.id, { onDelete: "cascade" }),
  
  // Hearing details
  hearing_title: varchar("hearing_title", { length: 500 }),
  hearing_purpose: text("hearing_purpose"),
  
  // Committee and officials present
  presiding_official: varchar("presiding_official", { length: 255 }),
  committee_members_present: uuid("committee_members_present").array().default(sql`ARRAY[]::uuid[]`),
  
  // Participation metrics
  registered_attendees: integer("registered_attendees"),
  actual_attendees: integer("actual_attendees"),
  public_presentations: integer("public_presentations").notNull().default(0),
  
  // Hearing format and structure
  hearing_format: varchar("hearing_format", { length: 100 }).notNull().default("standard"), // standard, panel, roundtable, workshop
  time_allocation: jsonb("time_allocation").$type<{
    presentation_minutes?: number;
    qa_minutes?: number;
    total_minutes?: number;
  }>().default(sql`'{}'::jsonb`),
  
  // Documentation
  hearing_minutes_url: varchar("hearing_minutes_url", { length: 500 }),
  presentations_received: integer("presentations_received").notNull().default(0),
  
  // Outcomes and analysis
  key_issues_raised: text("key_issues_raised").array().default(sql`ARRAY[]::text[]`),
  committee_conclusions: text("committee_conclusions"),
  follow_up_actions: jsonb("follow_up_actions").$type<Array<{
    action: string;
    responsible_party?: string;
    deadline?: string;
    status?: string;
  }>>().default(sql`'[]'::jsonb`),
  
  // Evaluation metrics
  hearing_effectiveness: varchar("hearing_effectiveness", { length: 50 }), // highly_effective, effective, moderately_effective, ineffective
  participant_satisfaction: numeric("participant_satisfaction", { precision: 3, scale: 2 }), // 0.00 to 5.00 rating
  
  created_at: timestamp("created_at").notNull().default(sql`now()`),
  updated_at: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  eventIdx: index("public_hearings_event_idx").on(table.participation_event_id),
  presidingOfficialIdx: index("public_hearings_presiding_idx").on(table.presiding_official),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================
// These relationships enable Drizzle ORM to automatically join tables
// and provide type-safe nested queries

export const billCommitteeAssignmentsRelations = relations(bill_committee_assignments, ({ one, many }) => ({
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
  proposer: one(sponsors, {
    fields: [bill_amendments.proposer_id],
    references: [sponsors.id],
  }),
  parliamentaryVotes: many(parliamentary_votes),
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
  parliamentarySession: one(parliamentary_sessions, {
    fields: [bill_readings.parliamentary_session_id],
    references: [parliamentary_sessions.id],
  }),
  sitting: one(parliamentary_sittings, {
    fields: [bill_readings.sitting_id],
    references: [parliamentary_sittings.id],
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
  parliamentarySession: one(parliamentary_sessions, {
    fields: [parliamentary_votes.parliamentary_session_id],
    references: [parliamentary_sessions.id],
  }),
  sitting: one(parliamentary_sittings, {
    fields: [parliamentary_votes.sitting_id],
    references: [parliamentary_sittings.id],
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
  publicHearings: many(public_hearings),
}));

export const publicSubmissionsRelations = relations(public_submissions, ({ one }) => ({
  bill: one(bills, {
    fields: [public_submissions.bill_id],
    references: [bills.id],
  }),
  targetCommittee: one(committees, {
    fields: [public_submissions.target_committee_id],
    references: [committees.id],
  }),
}));

export const publicHearingsRelations = relations(public_hearings, ({ one }) => ({
  participationEvent: one(public_participation_events, {
    fields: [public_hearings.participation_event_id],
    references: [public_participation_events.id],
  }),
}));