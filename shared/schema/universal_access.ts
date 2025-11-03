// ============================================================================
// UNIVERSAL ACCESS SCHEMA - OPTIMIZED
// ============================================================================
// Offline engagement and community facilitation infrastructure
// Optimized for performance, data integrity, and scalability

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  ambassadorStatusEnum,
  sessionTypeEnum,
  participationMethodEnum
} from "./enum";

import { users, bills } from "./foundation";
import { comments } from "./citizen_participation";

// ============================================================================
// AMBASSADORS - Community facilitators for offline engagement
// ============================================================================

export const ambassadors = pgTable("ambassadors", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Ambassador identification - code follows pattern: COUNTY-YYYY-NNNN
  ambassador_code: varchar("ambassador_code", { length: 20 }).unique().notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),
  
  // Geographic coverage - primary_county required, additional counties optional
  primary_county: kenyanCountyEnum("primary_county").notNull(),
  coverage_counties: kenyanCountyEnum("coverage_counties").array(),
  primary_constituency: varchar("primary_constituency", { length: 100 }),
  coverage_constituencies: varchar("coverage_constituencies", { length: 100 }).array(),
  
  // Languages and accessibility - at least one language required
  languages_spoken: varchar("languages_spoken", { length: 50 }).array().notNull(),
  accessibility_accommodations: varchar("accessibility_accommodations", { length: 100 }).array(),
  
  // Skills and expertise - helps match ambassadors to session types
  areas_of_expertise: varchar("areas_of_expertise", { length: 100 }).array(),
  professional_background: text("professional_background"),
  
  // Contact and availability - at least one contact method required
  contact_phone: varchar("contact_phone", { length: 50 }),
  contact_email: varchar("contact_email", { length: 255 }),
  preferred_contact_method: varchar("preferred_contact_method", { length: 50 }).notNull(),
  
  // Availability schedule stores weekly availability as JSON
  availability_schedule: jsonb("availability_schedule").default(sql`'{}'::jsonb`).notNull(),
  max_sessions_per_month: integer("max_sessions_per_month").notNull().default(4),
  
  // Ambassador status and verification - verification_date set when status becomes 'active'
  status: ambassadorStatusEnum("status").notNull().default("pending"),
  verification_date: timestamp("verification_date"),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  
  // Training and capacity - certification_level increases with completed sessions
  training_completed: boolean("training_completed").notNull().default(false),
  training_completion_date: timestamp("training_completion_date"),
  certification_level: varchar("certification_level", { length: 50 }).default("level_1"),
  
  // Performance metrics - automatically updated from session data
  sessions_conducted: integer("sessions_conducted").notNull().default(0),
  total_participants_reached: integer("total_participants_reached").notNull().default(0),
  average_session_rating: numeric("average_session_rating", { precision: 3, scale: 2 }),
  
  // Compensation and support - tier determines reimbursement rates
  compensation_tier: varchar("compensation_tier", { length: 50 }).default("standard"),
  support_resources: jsonb("support_resources").default(sql`'{}'::jsonb`).notNull(),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraints
  userIdx: uniqueIndex("idx_ambassadors_user").on(table.user_id),
  codeIdx: uniqueIndex("idx_ambassadors_code").on(table.ambassador_code),
  
  // Query optimization indexes - most common filters first
  statusCountyIdx: index("idx_ambassadors_status_county").on(table.status, table.primary_county),
  primaryCountyIdx: index("idx_ambassadors_primary_county").on(table.primary_county),
  statusIdx: index("idx_ambassadors_status").on(table.status),
  verifiedByIdx: index("idx_ambassadors_verified_by").on(table.verified_by),
  
  // Composite index for ambassador search and assignment
  certificationStatusIdx: index("idx_ambassadors_cert_status").on(table.certification_level, table.status),
  
  // Data integrity constraints
  sessionsNonNegative: check("chk_ambassadors_sessions_non_negative", 
    sql`${table.sessions_conducted} >= 0`),
  participantsNonNegative: check("chk_ambassadors_participants_non_negative",
    sql`${table.total_participants_reached} >= 0`),
  ratingInRange: check("chk_ambassadors_rating_range",
    sql`${table.average_session_rating} IS NULL OR (${table.average_session_rating} >= 0 AND ${table.average_session_rating} <= 5)`),
  maxSessionsPositive: check("chk_ambassadors_max_sessions_positive",
    sql`${table.max_sessions_per_month} > 0`),
  verificationLogic: check("chk_ambassadors_verification_logic",
    sql`(${table.status} = 'active' AND ${table.verification_date} IS NOT NULL AND ${table.verified_by} IS NOT NULL) OR (${table.status} != 'active')`),
}));

// ============================================================================
// COMMUNITIES - Geographic and demographic communities served
// ============================================================================

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Community identification - type determines required fields
  community_name: varchar("community_name", { length: 255 }).notNull(),
  community_type: varchar("community_type", { length: 50 }).notNull(),
  
  // Geographic details - county required for geographic communities
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),
  location_description: text("location_description"),
  
  // Demographics - helps target appropriate content and ambassadors
  population_estimate: integer("population_estimate"),
  demographic_profile: jsonb("demographic_profile").default(sql`'{}'::jsonb`),
  
  // Access and infrastructure - critical for planning session format
  internet_connectivity: varchar("internet_connectivity", { length: 50 }).default("low"),
  mobile_penetration: varchar("mobile_penetration", { length: 50 }).default("medium"),
  electricity_access: varchar("electricity_access", { length: 50 }).default("partial"),
  
  // Languages and communication - determines content localization needs
  primary_languages: varchar("primary_languages", { length: 50 }).array().notNull(),
  preferred_communication: varchar("preferred_communication", { length: 100 }).array(),
  
  // Community leadership - key for session planning and follow-up
  community_leaders: jsonb("community_leaders").default(sql`'[]'::jsonb`).notNull(),
  trusted_messengers: jsonb("trusted_messengers").default(sql`'[]'::jsonb`).notNull(),
  
  // Engagement history - tracks previous sessions and outcomes
  previous_engagement: jsonb("previous_engagement").default(sql`'[]'::jsonb`).notNull(),
  engagement_readiness: varchar("engagement_readiness", { length: 50 }).notNull().default("unknown"),
  
  // Accessibility needs - ensures inclusive session planning
  special_accommodation_needs: varchar("special_accommodation_needs", { length: 100 }).array(),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Search and filtering indexes
  nameIdx: index("idx_communities_name").on(table.community_name),
  typeCountyIdx: index("idx_communities_type_county").on(table.community_type, table.county),
  countyIdx: index("idx_communities_county").on(table.county),
  typeIdx: index("idx_communities_type").on(table.community_type),
  constituencyIdx: index("idx_communities_constituency").on(table.constituency),
  
  // Full-text search on community name
  nameTextIdx: index("idx_communities_name_text").using("gin", sql`to_tsvector('english', ${table.community_name})`),
  
  // Data validation
  populationPositive: check("chk_communities_population_positive",
    sql`${table.population_estimate} IS NULL OR ${table.population_estimate} > 0`),
  validConnectivity: check("chk_communities_connectivity",
    sql`${table.internet_connectivity} IN ('high', 'medium', 'low', 'none')`),
}));

// ============================================================================
// FACILITATION SESSIONS - Offline community engagement events
// ============================================================================

export const facilitation_sessions = pgTable("facilitation_sessions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Session identification
  session_title: varchar("session_title", { length: 500 }).notNull(),
  session_type: sessionTypeEnum("session_type").notNull(),
  
  // Organizing ambassador - cascade delete if ambassador removed
  ambassador_id: uuid("ambassador_id").notNull().references(() => ambassadors.id, { onDelete: "cascade" }),
  
  // Target community and bills - preserve sessions if community deleted
  community_id: uuid("community_id").references(() => communities.id, { onDelete: "set null" }),
  target_bills: uuid("target_bills").array(),
  
  // Session logistics - scheduled_date and time are required for planning
  scheduled_date: date("scheduled_date").notNull(),
  scheduled_time: varchar("scheduled_time", { length: 50 }).notNull(),
  duration_minutes: integer("duration_minutes").notNull().default(120),
  
  // Venue information - physical location details
  venue_name: varchar("venue_name", { length: 255 }).notNull(),
  venue_address: text("venue_address"),
  venue_type: varchar("venue_type", { length: 50 }).default("community_hall"),
  
  // Geographic context - denormalized for faster queries
  county: kenyanCountyEnum("county").notNull(),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),
  
  // Accessibility and accommodations - tracked for reporting and compliance
  accessibility_features: varchar("accessibility_features", { length: 100 }).array(),
  materials_provided: varchar("materials_provided", { length: 100 }).array(),
  
  // Session content and format - detailed agenda in JSON structure
  session_agenda: jsonb("session_agenda").default(sql`'[]'::jsonb`).notNull(),
  discussion_topics: text("discussion_topics").array(),
  educational_materials: jsonb("educational_materials").default(sql`'{}'::jsonb`).notNull(),
  
  // Participation tracking - expected helps with planning, actual for reporting
  expected_participants: integer("expected_participants").notNull().default(20),
  actual_participants: integer("actual_participants"),
  participant_demographics: jsonb("participant_demographics").default(sql`'{}'::jsonb`),
  
  // Session outcomes - status drives workflow and notifications
  session_status: varchar("session_status", { length: 50 }).notNull().default("scheduled"),
  completion_notes: text("completion_notes"),
  
  // Feedback and evaluation - collected post-session for quality improvement
  participant_feedback: jsonb("participant_feedback").default(sql`'[]'::jsonb`).notNull(),
  session_rating: numeric("session_rating", { precision: 3, scale: 2 }),
  improvement_suggestions: text("improvement_suggestions"),
  
  // Follow-up actions - critical for sustained community engagement
  follow_up_required: boolean("follow_up_required").notNull().default(false),
  follow_up_actions: jsonb("follow_up_actions").default(sql`'[]'::jsonb`).notNull(),
  
  // Resources and costs - for budgeting and reimbursement
  resources_used: jsonb("resources_used").default(sql`'{}'::jsonb`).notNull(),
  session_cost: numeric("session_cost", { precision: 10, scale: 2 }),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // High-traffic query indexes
  ambassadorStatusIdx: index("idx_facilitation_ambassador_status").on(table.ambassador_id, table.session_status),
  ambassadorIdx: index("idx_facilitation_sessions_ambassador").on(table.ambassador_id),
  communityIdx: index("idx_facilitation_sessions_community").on(table.community_id),
  
  // Date-based queries for scheduling and reporting
  dateStatusIdx: index("idx_facilitation_date_status").on(table.scheduled_date, table.session_status),
  scheduledDateIdx: index("idx_facilitation_sessions_scheduled_date").on(table.scheduled_date),
  
  // Geographic filtering
  countyStatusIdx: index("idx_facilitation_county_status").on(table.county, table.session_status),
  countyIdx: index("idx_facilitation_sessions_county").on(table.county),
  
  // Status and type for dashboard queries
  statusIdx: index("idx_facilitation_sessions_status").on(table.session_status),
  sessionTypeIdx: index("idx_facilitation_sessions_type").on(table.session_type),
  
  // Data integrity constraints
  durationPositive: check("chk_facilitation_duration_positive",
    sql`${table.duration_minutes} > 0`),
  expectedParticipantsPositive: check("chk_facilitation_expected_positive",
    sql`${table.expected_participants} > 0`),
  actualParticipantsNonNegative: check("chk_facilitation_actual_non_negative",
    sql`${table.actual_participants} IS NULL OR ${table.actual_participants} >= 0`),
  ratingInRange: check("chk_facilitation_rating_range",
    sql`${table.session_rating} IS NULL OR (${table.session_rating} >= 0 AND ${table.session_rating} <= 5)`),
  validStatus: check("chk_facilitation_valid_status",
    sql`${table.session_status} IN ('scheduled', 'completed', 'cancelled', 'postponed', 'in_progress')`),
  completionLogic: check("chk_facilitation_completion_logic",
    sql`(${table.session_status} = 'completed' AND ${table.actual_participants} IS NOT NULL) OR (${table.session_status} != 'completed')`),
}));

// ============================================================================
// OFFLINE SUBMISSIONS - Feedback collected during offline sessions
// ============================================================================

export const offline_submissions = pgTable("offline_submissions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Link to session - cascade delete when session removed
  session_id: uuid("session_id").notNull().references(() => facilitation_sessions.id, { onDelete: "cascade" }),
  
  // Participant information - anonymized identifier for tracking without PII
  participant_id: varchar("participant_id", { length: 100 }),
  participant_consent: boolean("participant_consent").notNull().default(true),
  
  // Submission content - type determines processing workflow
  submission_type: varchar("submission_type", { length: 50 }).notNull(),
  submission_content: text("submission_content").notNull(),
  
  // Target bills/topics - enables aggregation by legislation
  related_bills: uuid("related_bills").array(),
  topic_tags: text("topic_tags").array(),
  
  // Position and sentiment - for analysis and reporting
  position: varchar("position", { length: 20 }),
  sentiment_score: numeric("sentiment_score", { precision: 3, scale: 2 }),
  
  // Demographics - optional with explicit consent for analysis
  participant_age_range: varchar("participant_age_range", { length: 20 }),
  participant_gender: varchar("participant_gender", { length: 20 }),
  participant_occupation: varchar("participant_occupation", { length: 100 }),
  participant_county: kenyanCountyEnum("participant_county"),
  
  // Translation and processing - handles multi-language submissions
  original_language: varchar("original_language", { length: 50 }).notNull(),
  translated_content: text("translated_content"),
  translation_confidence: numeric("translation_confidence", { precision: 3, scale: 2 }),
  
  // Processing status - tracks integration into main system
  processing_status: varchar("processing_status", { length: 50 }).notNull().default("pending"),
  entered_into_system: boolean("entered_into_system").notNull().default(false),
  system_comment_id: uuid("system_comment_id").references(() => comments.id, { onDelete: "set null" }),
  
  // Metadata - tracks who recorded the submission
  submission_method: varchar("submission_method", { length: 50 }).notNull().default("verbal"),
  recorded_by: uuid("recorded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Processing workflow indexes
  processingStatusIdx: index("idx_offline_submissions_processing_status").on(table.processing_status),
  statusSessionIdx: index("idx_offline_submissions_status_session").on(table.processing_status, table.session_id),
  
  // Session-based queries
  sessionIdx: index("idx_offline_submissions_session").on(table.session_id),
  
  // Integration tracking
  enteredIntoSystemIdx: index("idx_offline_submissions_entered").on(table.entered_into_system),
  
  // Analysis indexes
  positionIdx: index("idx_offline_submissions_position").on(table.position),
  participantCountyIdx: index("idx_offline_submissions_county").on(table.participant_county),
  submissionTypeIdx: index("idx_offline_submissions_type").on(table.submission_type),
  
  // GIN index for array searches on related bills and tags
  relatedBillsIdx: index("idx_offline_submissions_bills").using("gin", table.related_bills),
  topicTagsIdx: index("idx_offline_submissions_tags").using("gin", table.topic_tags),
  
  // Data validation
  validSubmissionType: check("chk_offline_valid_submission_type",
    sql`${table.submission_type} IN ('comment', 'vote', 'question', 'concern', 'suggestion')`),
  validPosition: check("chk_offline_valid_position",
    sql`${table.position} IS NULL OR ${table.position} IN ('support', 'oppose', 'neutral')`),
  sentimentInRange: check("chk_offline_sentiment_range",
    sql`${table.sentiment_score} IS NULL OR (${table.sentiment_score} >= -1 AND ${table.sentiment_score} <= 1)`),
  translationConfidenceRange: check("chk_offline_translation_confidence",
    sql`${table.translation_confidence} IS NULL OR (${table.translation_confidence} >= 0 AND ${table.translation_confidence} <= 1)`),
}));

// ============================================================================
// USSD SESSIONS - Mobile-based engagement for low-connectivity areas
// ============================================================================

export const ussd_sessions = pgTable("ussd_sessions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Session identification - session_id is network-provided unique identifier
  session_id: varchar("session_id", { length: 100 }).unique().notNull(),
  phone_number: varchar("phone_number", { length: 20 }).notNull(),
  
  // Session flow - current_menu tracks navigation state
  current_menu: varchar("current_menu", { length: 100 }).notNull().default("main"),
  session_data: jsonb("session_data").default(sql`'{}'::jsonb`).notNull(),
  
  // User context - location from mobile network operator
  user_location: varchar("user_location", { length: 100 }),
  language_preference: varchar("language_preference", { length: 50 }).notNull().default("english"),
  
  // Engagement tracking - links session to specific legislation
  bill_context: uuid("bill_context").references(() => bills.id, { onDelete: "set null" }),
  participation_method: participationMethodEnum("participation_method"),
  
  // Session state - active sessions are periodically cleaned up
  session_active: boolean("session_active").notNull().default(true),
  last_interaction_at: timestamp("last_interaction_at").notNull().defaultNow(),
  session_duration_seconds: integer("session_duration_seconds"),
  
  // Collected data - stores user responses throughout session
  collected_responses: jsonb("collected_responses").default(sql`'{}'::jsonb`).notNull(),
  response_count: integer("response_count").notNull().default(0),
  
  // Completion tracking
  session_completed: boolean("session_completed").notNull().default(false),
  completion_at: timestamp("completion_at"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint on external session ID
  sessionIdIdx: uniqueIndex("idx_ussd_sessions_session_id").on(table.session_id),
  
  // User tracking and rate limiting
  phoneNumberIdx: index("idx_ussd_sessions_phone_number").on(table.phone_number),
  phoneActiveIdx: index("idx_ussd_sessions_phone_active").on(table.phone_number, table.session_active),
  
  // Bill engagement tracking
  billContextIdx: index("idx_ussd_sessions_bill_context").on(table.bill_context),
  
  // Session cleanup and monitoring
  lastInteractionIdx: index("idx_ussd_sessions_last_interaction").on(table.last_interaction_at),
  sessionActiveIdx: index("idx_ussd_sessions_active").on(table.session_active),
  activeInteractionIdx: index("idx_ussd_active_interaction").on(table.session_active, table.last_interaction_at),
  
  // Data validation
  responseCountNonNegative: check("chk_ussd_response_count_non_negative",
    sql`${table.response_count} >= 0`),
  durationNonNegative: check("chk_ussd_duration_non_negative",
    sql`${table.session_duration_seconds} IS NULL OR ${table.session_duration_seconds} >= 0`),
  completionLogic: check("chk_ussd_completion_logic",
    sql`(${table.session_completed} = true AND ${table.completion_at} IS NOT NULL) OR (${table.session_completed} = false)`),
}));

// ============================================================================
// LOCALIZED CONTENT - Content adapted for specific communities
// ============================================================================

export const localized_content = pgTable("localized_content", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Content identification - links to original source material
  content_type: varchar("content_type", { length: 50 }).notNull(),
  original_content_id: uuid("original_content_id"),
  
  // Localization target - community takes precedence over county
  target_community_id: uuid("target_community_id").references(() => communities.id, { onDelete: "cascade" }),
  target_county: kenyanCountyEnum("target_county"),
  target_languages: varchar("target_languages", { length: 50 }).array().notNull(),
  
  // Localized content - adapted for cultural context
  localized_title: varchar("localized_title", { length: 500 }).notNull(),
  localized_content: text("localized_content").notNull(),
  cultural_context: jsonb("cultural_context").default(sql`'{}'::jsonb`).notNull(),
  
  // Localization metadata - tracks creation method and quality
  localization_method: varchar("localization_method", { length: 100 }).notNull(),
  localization_confidence: numeric("localization_confidence", { precision: 3, scale: 2 }),
  
  // Review and validation - community input ensures cultural appropriateness
  community_reviewed: boolean("community_reviewed").notNull().default(false),
  community_review_date: timestamp("community_review_date"),
  community_feedback: text("community_feedback"),
  
  // Usage tracking - helps prioritize content updates
  usage_count: integer("usage_count").notNull().default(0),
  last_used_at: timestamp("last_used_at"),
  
  // Content metadata
  created_by: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewed_by: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Content discovery indexes
  contentTypeIdx: index("idx_localized_content_type").on(table.content_type),
  typeCountyIdx: index("idx_localized_content_type_county").on(table.content_type, table.target_county),
  communityIdx: index("idx_localized_content_community").on(table.target_community_id),
  countyIdx: index("idx_localized_content_county").on(table.target_county),
  
  // Language filtering with GIN index for array containment
  languageIdx: index("idx_localized_content_language").using("gin", table.target_languages),
  
  // Quality and review tracking
  communityReviewedIdx: index("idx_localized_content_reviewed").on(table.community_reviewed),
  reviewStatusIdx: index("idx_localized_content_review_status").on(table.community_reviewed, table.target_county),
  
  // Usage analytics
  usageIdx: index("idx_localized_content_usage").on(table.usage_count),
  createdByIdx: index("idx_localized_content_created_by").on(table.created_by),
  
  // Full-text search on localized content
  contentTextIdx: index("idx_localized_content_text").using("gin", sql`to_tsvector('english', ${table.localized_content})`),
  
  // Data validation
  validContentType: check("chk_localized_valid_content_type",
    sql`${table.content_type} IN ('bill_summary', 'civic_education', 'how_to_guide', 'faq', 'announcement')`),
  validLocalizationMethod: check("chk_localized_valid_method",
    sql`${table.localization_method} IN ('human_translation', 'community_adaptation', 'ai_localization', 'hybrid')`),
  confidenceInRange: check("chk_localized_confidence_range",
    sql`${table.localization_confidence} IS NULL OR (${table.localization_confidence} >= 0 AND ${table.localization_confidence} <= 1)`),
  usageCountNonNegative: check("chk_localized_usage_non_negative",
    sql`${table.usage_count} >= 0`),
  reviewLogic: check("chk_localized_review_logic",
    sql`(${table.community_reviewed} = true AND ${table.community_review_date} IS NOT NULL) OR (${table.community_reviewed} = false)`),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const ambassadorsRelations = relations(ambassadors, ({ one, many }) => ({
  // Each ambassador belongs to one user account
  user: one(users, {
    fields: [ambassadors.user_id],
    references: [users.id],
  }),
  // Tracks who verified this ambassador (admin user)
  verifiedBy: one(users, {
    fields: [ambassadors.verified_by],
    references: [users.id],
    relationName: "verifier",
  }),
  // One ambassador can conduct many sessions
  sessions: many(facilitation_sessions),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  // One community can have many facilitation sessions
  sessions: many(facilitation_sessions),
  // One community can have many pieces of localized content
  localizedContent: many(localized_content),
}));

export const facilitationSessionsRelations = relations(facilitation_sessions, ({ one, many }) => ({
  // Each session is led by one ambassador
  ambassador: one(ambassadors, {
    fields: [facilitation_sessions.ambassador_id],
    references: [ambassadors.id],
  }),
  // Each session targets one community (optional)
  community: one(communities, {
    fields: [facilitation_sessions.community_id],
    references: [communities.id],
  }),
  // One session can generate many offline submissions
  offlineSubmissions: many(offline_submissions),
}));

export const offlineSubmissionsRelations = relations(offline_submissions, ({ one }) => ({
  // Each submission belongs to one facilitation session
  session: one(facilitation_sessions, {
    fields: [offline_submissions.session_id],
    references: [facilitation_sessions.id],
  }),
  // Tracks which user (ambassador) recorded this submission
  recordedBy: one(users, {
    fields: [offline_submissions.recorded_by],
    references: [users.id],
  }),
  // Links to the system comment if submission was entered digitally
  systemComment: one(comments, {
    fields: [offline_submissions.system_comment_id],
    references: [comments.id],
  }),
}));

export const ussdSessionsRelations = relations(ussd_sessions, ({ one }) => ({
  // Links USSD session to a specific bill being discussed
  billContext: one(bills, {
    fields: [ussd_sessions.bill_context],
    references: [bills.id],
  }),
}));

export const localizedContentRelations = relations(localized_content, ({ one }) => ({
  // Content is targeted at one community (optional)
  targetCommunity: one(communities, {
    fields: [localized_content.target_community_id],
    references: [communities.id],
  }),
  // Content is created by one user
  createdBy: one(users, {
    fields: [localized_content.created_by],
    references: [users.id],
  }),
  // Content is reviewed by one user (optional)
  reviewedBy: one(users, {
    fields: [localized_content.reviewed_by],
    references: [users.id],
    relationName: "reviewer",
  }),
}));