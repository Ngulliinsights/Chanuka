// ============================================================================
// UNIVERSAL ACCESS SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Offline engagement, community facilitation, and multi-modal access
// This schema ensures the platform serves all Kenyans, not just the digitally connected

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, check
} from "drizzle-orm/pg-core";

import { kenyanCountyEnum } from "./enum";
import { bills, users } from "./foundation";

// ============================================================================
// AMBASSADORS - Community facilitators for offline engagement
// ============================================================================

export const ambassadors = pgTable("ambassadors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Ambassador identification
  ambassador_code: varchar("ambassador_code", { length: 20 }).notNull().unique(),
  display_name: varchar("display_name", { length: 200 }).notNull(),

  // Contact and availability - at least one contact method required
  contact_phone: varchar("contact_phone", { length: 50 }),
  contact_email: varchar("contact_email", { length: 255 }),
  preferred_contact_method: varchar("preferred_contact_method", { length: 50 }).notNull(),

  // Geographic coverage
  primary_county: kenyanCountyEnum("primary_county").notNull(),
  primary_constituency: varchar("primary_constituency", { length: 100 }),
  coverage_areas: varchar("coverage_areas", { length: 100 }).array(),

  // Ambassador profile
  background: text("background"),
  languages_spoken: varchar("languages_spoken", { length: 50 }).array(),
  specializations: varchar("specializations", { length: 100 }).array(), // "youth", "women", "disability", "rural"

  // Capabilities and equipment
  has_smartphone: boolean("has_smartphone").notNull().default(false),
  has_laptop: boolean("has_laptop").notNull().default(false),
  connectivity_level: varchar("connectivity_level", { length: 50 }), // "good", "intermittent", "poor"

  // Ambassador status
  status: varchar("status", { length: 30 }).notNull().default("pending"), // "pending", "active", "inactive", "suspended"
  verification_status: varchar("verification_status", { length: 30 }).notNull().default("unverified"), // "unverified", "verified", "background_checked"

  // Training and certification
  training_completed: boolean("training_completed").notNull().default(false),
  training_completion_date: date("training_completion_date"),
  certification_level: varchar("certification_level", { length: 30 }), // "basic", "intermediate", "advanced"

  // Performance metrics
  sessions_conducted: integer("sessions_conducted").notNull().default(0),
  people_reached: integer("people_reached").notNull().default(0),
  last_activity_date: date("last_activity_date"),

  // Onboarding and management
  recruited_by_id: uuid("recruited_by_id").references(() => users.id, { onDelete: "set null" }),
  onboarding_date: date("onboarding_date").notNull().default(sql`CURRENT_DATE`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ambassador lookup and management
  statusCountyIdx: index("idx_ambassadors_status_county")
    .on(table.status, table.primary_county)
    .where(sql`${table.status} = 'active'`),

  // Geographic coverage queries
  coverageAreasIdx: index("idx_ambassadors_coverage_areas")
    .using("gin", table.coverage_areas),

  // Performance tracking
  activityPerformanceIdx: index("idx_ambassadors_activity_performance")
    .on(table.last_activity_date, table.sessions_conducted, table.people_reached),

  // Training status
  trainingStatusIdx: index("idx_ambassadors_training_status")
    .on(table.training_completed, table.certification_level),

  // Contact method validation
  contactMethodCheck: check("ambassadors_contact_method_check",
    sql`${table.contact_phone} IS NOT NULL OR ${table.contact_email} IS NOT NULL`),

  // Foreign key indexes
  userIdIdx: index("idx_ambassadors_user_id").on(table.user_id),
  recruitedByIdx: index("idx_ambassadors_recruited_by").on(table.recruited_by_id),

  // Status indexes
  verificationStatusIdx: index("idx_ambassadors_verification_status").on(table.verification_status),
}));

// ============================================================================
// COMMUNITIES - Geographic and demographic community definitions
// ============================================================================

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Community identification
  name: varchar("name", { length: 300 }).notNull(),
  community_type: varchar("community_type", { length: 50 }).notNull(), // "geographic", "demographic", "interest_based", "institutional"

  // Geographic definition
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),
  sub_location: varchar("sub_location", { length: 100 }),

  // Community characteristics
  estimated_population: integer("estimated_population"),
  primary_language: varchar("primary_language", { length: 50 }),
  secondary_languages: varchar("secondary_languages", { length: 50 }).array(),

  // Access characteristics
  internet_penetration: numeric("internet_penetration", { precision: 5, scale: 2 }), // Percentage 0-100
  smartphone_penetration: numeric("smartphone_penetration", { precision: 5, scale: 2 }),
  literacy_rate: numeric("literacy_rate", { precision: 5, scale: 2 }),

  // Community needs and interests
  primary_concerns: varchar("primary_concerns", { length: 100 }).array(),
  engagement_preferences: jsonb("engagement_preferences").notNull().default(sql`'{}'::jsonb`),

  // Community leadership
  traditional_leaders: jsonb("traditional_leaders").notNull().default(sql`'{}'::jsonb`),
  community_groups: jsonb("community_groups").notNull().default(sql`'{}'::jsonb`),

  // Assigned ambassadors
  primary_ambassador_id: uuid("primary_ambassador_id").references(() => ambassadors.id, { onDelete: "set null" }),
  secondary_ambassadors: uuid("secondary_ambassadors").array(),

  // Community status
  is_active: boolean("is_active").notNull().default(true),
  last_engagement_date: date("last_engagement_date"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Geographic community queries
  countyConstituencyIdx: index("idx_communities_county_constituency")
    .on(table.county, table.constituency, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Ambassador assignment queries
  primaryAmbassadorIdx: index("idx_communities_primary_ambassador")
    .on(table.primary_ambassador_id, table.is_active)
    .where(sql`${table.primary_ambassador_id} IS NOT NULL AND ${table.is_active} = true`),

  // Community characteristics
  accessCharacteristicsIdx: index("idx_communities_access_characteristics")
    .on(table.internet_penetration, table.smartphone_penetration),

  // Engagement tracking
  lastEngagementIdx: index("idx_communities_last_engagement")
    .on(table.last_engagement_date, table.is_active)
    .where(sql`${table.is_active} = true`),
}));

// ============================================================================
// FACILITATION SESSIONS - Offline community engagement sessions
// ============================================================================

export const facilitation_sessions = pgTable("facilitation_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Session identification
  session_code: varchar("session_code", { length: 30 }).notNull().unique(),
  session_title: varchar("session_title", { length: 500 }),

  // Session organization
  ambassador_id: uuid("ambassador_id").notNull().references(() => ambassadors.id, { onDelete: "cascade" }),
  community_id: uuid("community_id").references(() => communities.id, { onDelete: "set null" }),

  // Session logistics
  session_date: date("session_date").notNull(),
  start_time: varchar("start_time", { length: 10 }),
  end_time: varchar("end_time", { length: 10 }),
  venue: varchar("venue", { length: 300 }),
  venue_type: varchar("venue_type", { length: 50 }), // "community_center", "school", "church", "market", "home"

  // Session content
  bills_discussed: uuid("bills_discussed").array(),
  primary_bill_id: uuid("primary_bill_id").references(() => bills.id, { onDelete: "set null" }),
  session_agenda: text("session_agenda"),
  materials_used: varchar("materials_used", { length: 100 }).array(),

  // Participation details
  planned_participants: integer("planned_participants"),
  actual_participants: integer("actual_participants"),
  participant_demographics: jsonb("participant_demographics").notNull().default(sql`'{}'::jsonb`),

  // Session format and methods
  session_format: varchar("session_format", { length: 50 }), // "presentation", "discussion", "workshop", "town_hall"
  participation_methods: varchar("participation_methods", { length: 50 }).array(), // "verbal", "written", "voting", "drawing"
  language_used: varchar("language_used", { length: 50 }),

  // Session outcomes
  session_status: varchar("session_status", { length: 30 }).notNull().default("planned"), // "planned", "completed", "cancelled", "postponed"
  key_outcomes: text("key_outcomes"),
  action_items_generated: text("action_items_generated"),
  follow_up_needed: boolean("follow_up_needed").notNull().default(false),

  // Data collection
  feedback_collected: integer("feedback_collected").notNull().default(0),
  photos_taken: integer("photos_taken").notNull().default(0),
  audio_recorded: boolean("audio_recorded").notNull().default(false),

  // Sync status for offline-first design
  sync_status: varchar("sync_status", { length: 20 }).notNull().default("synced"), // "pending", "synced", "conflict"
  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ambassador session tracking
  ambassadorDateIdx: index("idx_facilitation_sessions_ambassador_date")
    .on(table.ambassador_id, table.session_date, table.session_status),

  // Community engagement tracking
  communityDateIdx: index("idx_facilitation_sessions_community_date")
    .on(table.community_id, table.session_date)
    .where(sql`${table.community_id} IS NOT NULL`),

  // Bill discussion tracking
  billDiscussionIdx: index("idx_facilitation_sessions_bill_discussion")
    .using("gin", table.bills_discussed),

  // Sync queue management
  syncStatusIdx: index("idx_facilitation_sessions_sync_status")
    .on(table.sync_status, table.last_synced_at)
    .where(sql`${table.sync_status} != 'synced'`),
}));

// ============================================================================
// OFFLINE SUBMISSIONS - Citizen input collected offline
// ============================================================================

export const offline_submissions = pgTable("offline_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Submission context
  session_id: uuid("session_id").references(() => facilitation_sessions.id, { onDelete: "set null" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  collected_by_id: uuid("collected_by_id").notNull().references(() => ambassadors.id, { onDelete: "cascade" }),

  // Participant information (anonymized)
  participant_code: varchar("participant_code", { length: 20 }), // Anonymous identifier
  participant_demographics: jsonb("participant_demographics").$type<{
    age_range?: string;
    gender?: string;
    education_level?: string;
    occupation?: string;
    county?: string;
    constituency?: string;
  }>().notNull().default(sql`'{}'::jsonb`),

  // Submission content
  submission_text: text("submission_text").notNull(),
  submission_language: varchar("submission_language", { length: 50 }),
  position: varchar("position", { length: 20 }), // "support", "oppose", "neutral", "question"

  // Collection method
  collection_method: varchar("collection_method", { length: 30 }).notNull(), // "verbal_transcribed", "written", "audio_recorded", "drawing"
  original_format: varchar("original_format", { length: 30 }), // "swahili", "english", "local_language", "visual"

  // Quality and verification
  transcription_quality: varchar("transcription_quality", { length: 20 }), // "high", "medium", "low", "needs_review"
  verified_by_participant: boolean("verified_by_participant").notNull().default(false),

  // Processing status
  processing_status: varchar("processing_status", { length: 30 }).notNull().default("collected"), // "collected", "transcribed", "translated", "processed"
  needs_translation: boolean("needs_translation").notNull().default(false),
  translated_text: text("translated_text"),

  // Attachments and media
  audio_file_path: varchar("audio_file_path", { length: 500 }),
  photo_file_paths: varchar("photo_file_paths", { length: 500 }).array(),

  // Sync and integration
  sync_status: varchar("sync_status", { length: 20 }).notNull().default("pending"), // "pending", "synced", "error"
  integrated_with_online: boolean("integrated_with_online").notNull().default(false),
  online_comment_id: uuid("online_comment_id"), // Link to comments table if integrated

  collected_at: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
  synced_at: timestamp("synced_at", { withTimezone: true }),
}, (table) => ({
  // Session submissions
  sessionCollectedIdx: index("idx_offline_submissions_session_collected")
    .on(table.session_id, table.collected_at)
    .where(sql`${table.session_id} IS NOT NULL`),

  // Bill submissions
  billPositionIdx: index("idx_offline_submissions_bill_position")
    .on(table.bill_id, table.position, table.collected_at),

  // Processing queue
  processingStatusIdx: index("idx_offline_submissions_processing_status")
    .on(table.processing_status, table.needs_translation, table.collected_at),

  // Sync queue
  syncStatusIdx: index("idx_offline_submissions_sync_status")
    .on(table.sync_status, table.collected_at)
    .where(sql`${table.sync_status} != 'synced'`),

  // Ambassador collection tracking
  collectedByIdx: index("idx_offline_submissions_collected_by")
    .on(table.collected_by_id, table.collected_at),
}));

// ============================================================================
// USSD SESSIONS - Feature phone access sessions
// ============================================================================

export const ussd_sessions = pgTable("ussd_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Session identification - session_id is network-provided unique identifier
  session_id: varchar("session_id", { length: 100 }).unique().notNull(),
  phone_number: varchar("phone_number", { length: 20 }).notNull(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // If user is registered

  // Session flow - current_menu tracks navigation state
  current_menu: varchar("current_menu", { length: 100 }).notNull().default("main"),
  menu_history: varchar("menu_history", { length: 100 }).array(),
  session_data: jsonb("session_data").notNull().default(sql`'{}'::jsonb`),

  // Session status
  session_active: boolean("session_active").notNull().default(true),
  session_start: timestamp("session_start", { withTimezone: true }).notNull().defaultNow(),
  session_end: timestamp("session_end", { withTimezone: true }),
  last_interaction: timestamp("last_interaction", { withTimezone: true }).notNull().defaultNow(),

  // Usage tracking
  menus_visited: integer("menus_visited").notNull().default(1),
  actions_performed: integer("actions_performed").notNull().default(0),
  bills_viewed: uuid("bills_viewed").array(),

  // Location and context
  county: kenyanCountyEnum("county"), // Inferred from phone area code if possible
  telecom_provider: varchar("telecom_provider", { length: 100 }), // "Safaricom", "Airtel", etc.

  // Session outcome
  session_outcome: varchar("session_outcome", { length: 50 }), // "completed", "timeout", "user_exit", "error"

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Session management
  sessionIdIdx: unique("idx_ussd_sessions_session_id").on(table.session_id),
  phoneNumberIdx: index("idx_ussd_sessions_phone_number").on(table.phone_number),
  phoneActiveIdx: index("idx_ussd_sessions_phone_active").on(table.phone_number, table.session_active),

  // User tracking and rate limiting
  userSessionIdx: index("idx_ussd_sessions_user_session")
    .on(table.user_id, table.session_start)
    .where(sql`${table.user_id} IS NOT NULL`),

  // Bill engagement tracking
  billsViewedIdx: index("idx_ussd_sessions_bills_viewed")
    .using("gin", table.bills_viewed),

  // Analytics and monitoring
  outcomeProviderIdx: index("idx_ussd_sessions_outcome_provider")
    .on(table.session_outcome, table.telecom_provider, table.session_start),
}));

// ============================================================================
// LOCALIZED CONTENT - Multi-language and culturally adapted content
// ============================================================================

export const localized_content = pgTable("localized_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Content identification
  content_type: varchar("content_type", { length: 50 }).notNull(), // "bill_summary", "constitutional_analysis", "help_text", "menu_item"
  source_id: uuid("source_id").notNull(), // ID of the source content (bill, analysis, etc.)
  content_key: varchar("content_key", { length: 100 }).notNull(), // Unique identifier for this content piece

  // Localization details
  language_code: varchar("language_code", { length: 10 }).notNull(), // ISO 639-1 codes
  country_code: varchar("country_code", { length: 5 }).notNull().default("KE"),
  cultural_context: varchar("cultural_context", { length: 50 }), // "urban", "rural", "youth", "elderly"

  // Content versions
  original_text: text("original_text").notNull(),
  localized_text: text("localized_text").notNull(),
  simplified_text: text("simplified_text"), // For low literacy audiences
  audio_url: varchar("audio_url", { length: 500 }), // Text-to-speech or human recording

  // Translation metadata
  translation_method: varchar("translation_method", { length: 30 }).notNull(), // "human", "machine", "hybrid", "community"
  translator_id: uuid("translator_id").references(() => users.id, { onDelete: "set null" }),
  translation_quality: varchar("translation_quality", { length: 20 }), // "draft", "reviewed", "approved", "native_speaker"

  // Content adaptation
  reading_level: varchar("reading_level", { length: 20 }), // "basic", "intermediate", "advanced"
  cultural_adaptations: text("cultural_adaptations"), // Notes on cultural modifications made

  // Usage and feedback
  usage_count: integer("usage_count").notNull().default(0),
  feedback_score: numeric("feedback_score", { precision: 3, scale: 2 }), // Average user rating
  needs_update: boolean("needs_update").notNull().default(false),

  // Version control
  version_number: integer("version_number").notNull().default(1),
  superseded_by: uuid("superseded_by"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Content lookup
  contentLanguageIdx: index("idx_localized_content_content_language")
    .on(table.content_type, table.source_id, table.language_code),

  // Translation workflow
  translationQualityIdx: index("idx_localized_content_translation_quality")
    .on(table.translation_method, table.translation_quality, table.needs_update),

  // Cultural adaptation queries
  culturalContextIdx: index("idx_localized_content_cultural_context")
    .on(table.cultural_context, table.reading_level, table.language_code),

  // Usage analytics
  usageCountIdx: index("idx_localized_content_usage_count")
    .on(table.usage_count, table.feedback_score),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const ambassadorsRelations = relations(ambassadors, ({ one, many }) => ({
  user: one(users, {
    fields: [ambassadors.user_id],
    references: [users.id],
  }),
  recruitedBy: one(users, {
    fields: [ambassadors.recruited_by_id],
    references: [users.id],
    relationName: "recruiter",
  }),
  primaryCommunities: many(communities),
  sessions: many(facilitation_sessions),
  offlineSubmissions: many(offline_submissions),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  primaryAmbassador: one(ambassadors, {
    fields: [communities.primary_ambassador_id],
    references: [ambassadors.id],
  }),
  sessions: many(facilitation_sessions),
}));

export const facilitationSessionsRelations = relations(facilitation_sessions, ({ one, many }) => ({
  ambassador: one(ambassadors, {
    fields: [facilitation_sessions.ambassador_id],
    references: [ambassadors.id],
  }),
  community: one(communities, {
    fields: [facilitation_sessions.community_id],
    references: [communities.id],
  }),
  primaryBill: one(bills, {
    fields: [facilitation_sessions.primary_bill_id],
    references: [bills.id],
  }),
  offlineSubmissions: many(offline_submissions),
}));

export const offlineSubmissionsRelations = relations(offline_submissions, ({ one }) => ({
  session: one(facilitation_sessions, {
    fields: [offline_submissions.session_id],
    references: [facilitation_sessions.id],
  }),
  bill: one(bills, {
    fields: [offline_submissions.bill_id],
    references: [bills.id],
  }),
  collectedBy: one(ambassadors, {
    fields: [offline_submissions.collected_by_id],
    references: [ambassadors.id],
  }),
}));

export const ussdSessionsRelations = relations(ussd_sessions, ({ one }) => ({
  user: one(users, {
    fields: [ussd_sessions.user_id],
    references: [users.id],
  }),
}));

export const localizedContentRelations = relations(localized_content, ({ one }) => ({
  translator: one(users, {
    fields: [localized_content.translator_id],
    references: [users.id],
  }),
  supersededBy: one(localized_content, {
    fields: [localized_content.superseded_by],
    references: [localized_content.id],
    relationName: "supersession",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Ambassador = typeof ambassadors.$inferSelect;
export type NewAmbassador = typeof ambassadors.$inferInsert;

export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;

export type FacilitationSession = typeof facilitation_sessions.$inferSelect;
export type NewFacilitationSession = typeof facilitation_sessions.$inferInsert;

export type OfflineSubmission = typeof offline_submissions.$inferSelect;
export type NewOfflineSubmission = typeof offline_submissions.$inferInsert;

export type UssdSession = typeof ussd_sessions.$inferSelect;
export type NewUssdSession = typeof ussd_sessions.$inferInsert;

export type LocalizedContent = typeof localized_content.$inferSelect;
export type NewLocalizedContent = typeof localized_content.$inferInsert;

// ============================================================================
// Accessibility-Specific Tables
// ============================================================================

/**
 * Assistive Technology Compatibility tracking
 */
export const assistive_technology_compatibility = pgTable('assistive_technology_compatibility', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  technology_name: varchar('technology_name', { length: 255 }).notNull(),
  technology_type: varchar('technology_type', { length: 100 }).notNull(),
  platform: varchar('platform', { length: 100 }).notNull(),
  compatibility_score: integer('compatibility_score').notNull(),
  browser_compatibility: jsonb('browser_compatibility').notNull(),
  feature_support: jsonb('feature_support').notNull(),
  recommendation: varchar('recommendation', { length: 100 }).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Accessibility Features tracking
 */
export const accessibility_features = pgTable('accessibility_features', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  feature_name: varchar('feature_name', { length: 255 }).notNull(),
  feature_category: varchar('feature_category', { length: 100 }).notNull(),
  user_impact_score: integer('user_impact_score').notNull(),
  target_disabilities: jsonb('target_disabilities').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Accessibility Audits
 */
export const accessibility_audits = pgTable('accessibility_audits', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  audit_type: varchar('audit_type', { length: 100 }).notNull(),
  scope: varchar('scope', { length: 100 }).notNull(),
  audited_components: jsonb('audited_components').notNull(),
  audit_methodology: varchar('audit_methodology', { length: 255 }).notNull(),
  auditor_info: jsonb('auditor_info').notNull(),
  findings: jsonb('findings').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  overall_compliance_score: integer('overall_compliance_score').notNull(),
  compliance_level: varchar('compliance_level', { length: 50 }).notNull(),
  audit_date: timestamp('audit_date').notNull(),
  follow_up_required: boolean('follow_up_required').default(false).notNull(),
  follow_up_date: timestamp('follow_up_date'),
  status: varchar('status', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Accessibility Feedback
 */
export const accessibility_feedback = pgTable('accessibility_feedback', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull(),
  feedback_type: varchar('feedback_type', { length: 100 }).notNull(),
  page_url: varchar('page_url', { length: 500 }).notNull(),
  component: varchar('component', { length: 255 }).notNull(),
  issue_category: varchar('issue_category', { length: 100 }).notNull(),
  severity: varchar('severity', { length: 50 }).notNull(),
  description: text('description').notNull(),
  expected_behavior: text('expected_behavior').notNull(),
  current_behavior: text('current_behavior').notNull(),
  steps_to_reproduce: jsonb('steps_to_reproduce').notNull(),
  browser_info: jsonb('browser_info').notNull(),
  assistive_technology_used: varchar('assistive_technology_used', { length: 255 }),
  screenshots: jsonb('screenshots'),
  status: varchar('status', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 50 }).notNull(),
  assigned_to: uuid('assigned_to'),
  resolution_notes: text('resolution_notes'),
  resolved_at: timestamp('resolved_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Inclusive Design Metrics
 */
export const inclusive_design_metrics = pgTable('inclusive_design_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  measurement_date: timestamp('measurement_date').notNull(),
  reporting_period: varchar('reporting_period', { length: 50 }).notNull(),
  user_diversity_metrics: jsonb('user_diversity_metrics').notNull(),
  accessibility_usage_metrics: jsonb('accessibility_usage_metrics').notNull(),
  content_accessibility_metrics: jsonb('content_accessibility_metrics').notNull(),
  technical_compliance_metrics: jsonb('technical_compliance_metrics').notNull(),
  inclusive_design_score: integer('inclusive_design_score').notNull(),
  benchmark_comparison: jsonb('benchmark_comparison').notNull(),
  improvement_recommendations: jsonb('improvement_recommendations').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * User Accessibility Preferences
 */
export const user_accessibility_preferences = pgTable('user_accessibility_preferences', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull(),
  visual_preferences: jsonb('visual_preferences').notNull(),
  auditory_preferences: jsonb('auditory_preferences').notNull(),
  motor_preferences: jsonb('motor_preferences').notNull(),
  cognitive_preferences: jsonb('cognitive_preferences').notNull(),
  assistive_technology: jsonb('assistive_technology').notNull(),
  last_used_features: jsonb('last_used_features').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Alternative Formats
 */
export const alternative_formats = pgTable('alternative_formats', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  content_type: varchar('content_type', { length: 100 }).notNull(),
  content_id: varchar('content_id', { length: 255 }).notNull(),
  format_type: varchar('format_type', { length: 100 }).notNull(),
  format_details: jsonb('format_details').notNull(),
  target_disabilities: jsonb('target_disabilities').notNull(),
  quality_score: integer('quality_score').notNull(),
  duration_minutes: integer('duration_minutes'),
  user_feedback: jsonb('user_feedback'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Offline Content Cache
 */
export const offline_content_cache = pgTable('offline_content_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull(),
  content_type: varchar('content_type', { length: 100 }).notNull(),
  content_id: varchar('content_id', { length: 255 }).notNull(),
  content_data: jsonb('content_data').notNull(),
  metadata: jsonb('metadata').notNull(),
  cache_timestamp: timestamp('cache_timestamp').defaultNow().notNull(),
  expiry_timestamp: timestamp('expiry_timestamp').notNull(),
  access_count: integer('access_count').default(0).notNull(),
  priority_level: varchar('priority_level', { length: 50 }).notNull(),
  device_info: jsonb('device_info').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Offline Sync Queue
 */
export const offline_sync_queue = pgTable('offline_sync_queue', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull(),
  operation_type: varchar('operation_type', { length: 100 }).notNull(),
  entity_type: varchar('entity_type', { length: 100 }).notNull(),
  entity_id: varchar('entity_id', { length: 255 }).notNull(),
  operation_data: jsonb('operation_data').notNull(),
  original_timestamp: timestamp('original_timestamp').notNull(),
  sync_attempts: integer('sync_attempts').default(0).notNull(),
  last_sync_attempt: timestamp('last_sync_attempt'),
  sync_status: varchar('sync_status', { length: 50 }).default('pending').notNull(),
  error_details: jsonb('error_details'),
  priority: varchar('priority', { length: 50 }).notNull(),
  device_info: jsonb('device_info').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});


