// ============================================================================
// FOUNDATION SCHEMA - Core Legislative Entities (OPTIMIZED v2.0)
// ============================================================================
// Kenyan Legislative Engagement Platform - Production-Ready Database Schema
// Optimized for performance, data integrity, and scalability
// PostgreSQL 15+ features utilized for maximum efficiency

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Only import enums actually used in this foundation schema
// Other enums (verificationStatusEnum, moderationStatusEnum, commentVoteTypeEnum, 
// billVoteTypeEnum, engagementTypeEnum, notificationTypeEnum, severityEnum)
// will be imported in their respective schema files (engagement.ts, moderation.ts, etc.)
import {
  kenyanCountyEnum,
  chamberEnum,
  partyEnum,
  billStatusEnum,
  userRoleEnum,
  anonymityLevelEnum,
} from "./enum";

// ============================================================================
// CORE USER TABLES - Kenya-Optimized Authentication & Profiles
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull(), // RFC 5321 max email length
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default('citizen'),

  // Kenya-specific: Track user's home location for relevant content recommendation
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),

  // Account verification and security - optimized token storage
  is_verified: boolean("is_verified").notNull().default(false),
  verification_token: varchar("verification_token", { length: 64 }),
  verification_expires_at: timestamp("verification_expires_at", { withTimezone: true }),
  password_reset_token: varchar("password_reset_token", { length: 64 }),
  password_reset_expires_at: timestamp("password_reset_expires_at", { withTimezone: true }),

  // Account lifecycle tracking
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  is_active: boolean("is_active").notNull().default(true),
}, (table) => ({
  // Unique constraint on email - automatically creates an index
  emailUnique: unique("users_email_unique").on(table.email),

  // Composite index for role-based queries with active filter
  roleActiveIdx: index("idx_users_role_active").on(table.role, table.is_active),

  // Partial index for location-based queries (only active users with location)
  countyActiveIdx: index("idx_users_county_active").on(table.county, table.is_active)
    .where(sql`${table.county} IS NOT NULL AND ${table.is_active} = true`),

  // Partial indexes for token lookups - significantly reduces index size
  verificationTokenIdx: index("idx_users_verification_token").on(table.verification_token)
    .where(sql`${table.verification_token} IS NOT NULL`),
  resetTokenIdx: index("idx_users_password_reset_token").on(table.password_reset_token)
    .where(sql`${table.password_reset_token} IS NOT NULL`),

  // Index for session management and analytics
  lastLoginIdx: index("idx_users_last_login").on(table.last_login_at)
    .where(sql`${table.is_active} = true`),
}));

export const user_profiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().unique().references(() => users.id, {
    onDelete: "cascade" // When user is deleted, profile is automatically removed
  }),

  // Personal identification - All optional for anonymity support
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  display_name: varchar("display_name", { length: 150 }),
  bio: text("bio"),

  // Anonymity and Privacy Controls
  anonymity_level: anonymityLevelEnum("anonymity_level").notNull().default('public'),
  anonymous_id: varchar("anonymous_id", { length: 20 }), // Auto-generated: "Citizen_A1B2C3" for anonymous users
  pseudonym: varchar("pseudonym", { length: 100 }), // User-chosen pseudonym for pseudonymous participation

  // Kenya-specific geographical hierarchy: County > Constituency > Ward
  // This enables hyper-local representation and targeted engagement
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),

  // National ID verification - hashed for GDPR & Data Protection Act 2019 compliance
  // Using SHA-256 produces 64 hex characters
  national_id_hash: varchar("national_id_hash", { length: 64 }),
  is_id_verified: boolean("is_id_verified").notNull().default(false),

  // Contact Information - CRITICAL MISSING FIELDS
  phone_number: varchar("phone_number", { length: 20 }), // E.164 format: +254XXXXXXXXX
  phone_verified: boolean("phone_verified").notNull().default(false),
  phone_verification_code: varchar("phone_verification_code", { length: 10 }),
  phone_verification_expires_at: timestamp("phone_verification_expires_at", { withTimezone: true }),

  // Communication Preferences - GDPR Compliance
  email_notifications_consent: boolean("email_notifications_consent").notNull().default(true),
  sms_notifications_consent: boolean("sms_notifications_consent").notNull().default(false),
  marketing_consent: boolean("marketing_consent").notNull().default(false),
  data_processing_consent: boolean("data_processing_consent").notNull().default(true),
  consent_date: timestamp("consent_date", { withTimezone: true }).notNull().defaultNow(),

  // Localization and Accessibility
  preferred_language: varchar("preferred_language", { length: 10 }).notNull().default('en'), // ISO 639-1
  timezone: varchar("timezone", { length: 50 }).notNull().default('Africa/Nairobi'),
  accessibility_needs: jsonb("accessibility_needs").notNull().default(sql`'{}'::jsonb`), // Screen reader, high contrast, etc.

  // Emergency Contact Information
  emergency_contact_name: varchar("emergency_contact_name", { length: 200 }),
  emergency_contact_phone: varchar("emergency_contact_phone", { length: 20 }),
  emergency_contact_relationship: varchar("emergency_contact_relationship", { length: 50 }),

  // Profile customization and privacy
  avatar_url: varchar("avatar_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  preferences: jsonb("preferences").notNull().default(sql`'{}'::jsonb`),
  privacy_settings: jsonb("privacy_settings").notNull().default(sql`'{
    "show_real_name": true,
    "show_location": true,
    "show_contact_info": false,
    "show_voting_history": false,
    "show_engagement_stats": true,
    "allow_direct_messages": true,
    "public_profile": true,
    "data_retention_preference": "standard",
    "analytics_participation": true,
    "research_participation": false
  }'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Partial index for statistical queries on verified users by location
  countyVerifiedIdx: index("idx_user_profiles_county_verified")
    .on(table.county, table.is_id_verified)
    .where(sql`${table.is_id_verified} = true AND ${table.county} IS NOT NULL`),

  // Index for user search by display name
  displayNameIdx: index("idx_user_profiles_display_name").on(table.display_name)
    .where(sql`${table.display_name} IS NOT NULL`),

  // Anonymity indexes
  anonymityLevelIdx: index("idx_user_profiles_anonymity_level").on(table.anonymity_level),
  anonymousIdIdx: index("idx_user_profiles_anonymous_id").on(table.anonymous_id)
    .where(sql`${table.anonymous_id} IS NOT NULL`),
  pseudonymIdx: index("idx_user_profiles_pseudonym").on(table.pseudonym)
    .where(sql`${table.pseudonym} IS NOT NULL`),

  // Contact information indexes
  phoneNumberIdx: index("idx_user_profiles_phone_number").on(table.phone_number)
    .where(sql`${table.phone_number} IS NOT NULL`),
  phoneVerifiedIdx: index("idx_user_profiles_phone_verified").on(table.phone_verified, table.phone_number)
    .where(sql`${table.phone_verified} = true AND ${table.phone_number} IS NOT NULL`),

  // Localization indexes
  languageIdx: index("idx_user_profiles_language").on(table.preferred_language),
  timezoneIdx: index("idx_user_profiles_timezone").on(table.timezone),

  // GIN index on preferences for JSONB querying
  preferencesIdx: index("idx_user_profiles_preferences")
    .using("gin", table.preferences),
  accessibilityIdx: index("idx_user_profiles_accessibility")
    .using("gin", table.accessibility_needs),
}));

// ============================================================================
// LEGISLATIVE ACTORS - MPs, Senators, and MCAs
// ============================================================================

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),

  // Kenya-specific political affiliation and representation
  party: partyEnum("party"),
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),
  chamber: chamberEnum("chamber").notNull(),

  // Official parliamentary identification
  mp_number: varchar("mp_number", { length: 50 }),
  position: varchar("position", { length: 100 }),
  role: varchar("role", { length: 100 }),

  // Biography and contact information
  bio: text("bio"),
  photo_url: varchar("photo_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }), // E.164 format: +254XXXXXXXXX
  office_location: text("office_location"),
  social_media: jsonb("social_media").notNull().default(sql`'{}'::jsonb`),

  // Transparency and accountability - Public Officers Ethics Act 2003 compliance
  financial_disclosures: jsonb("financial_disclosures").notNull().default(sql`'{}'::jsonb`),
  last_disclosure_date: date("last_disclosure_date"),

  // Performance metrics for constituent accountability
  voting_record: jsonb("voting_record").notNull().default(sql`'{}'::jsonb`),
  attendance_rate: numeric("attendance_rate", { precision: 5, scale: 2 }),

  // Term tracking - aligns with Kenya's 5-year electoral cycle
  term_start: date("term_start"),
  term_end: date("term_end"),
  is_active: boolean("is_active").notNull().default(true),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for filtering active sponsors - most common query pattern
  chamberCountyActiveIdx: index("idx_sponsors_chamber_county_active")
    .on(table.chamber, table.county, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Index for political analysis queries
  partyCountyIdx: index("idx_sponsors_party_county").on(table.party, table.county)
    .where(sql`${table.is_active} = true`),

  // Full-text search preparation
  nameIdx: index("idx_sponsors_name").on(table.name),

  // Unique constraint on MP number - PostgreSQL 15+ nulls not distinct feature
  mpNumberUnique: unique("sponsors_mp_number_unique").on(table.mp_number)
    .nullsNotDistinct(),

  // Data integrity constraints
  attendanceRateCheck: check("sponsors_attendance_rate_check",
    sql`${table.attendance_rate} IS NULL OR (${table.attendance_rate} >= 0 AND ${table.attendance_rate} <= 100)`),

  termDateCheck: check("sponsors_term_date_check",
    sql`${table.term_end} IS NULL OR ${table.term_start} IS NULL OR ${table.term_end} >= ${table.term_start}`),
}));

// ============================================================================
// PARLIAMENTARY COMMITTEES & PROCEDURES
// ============================================================================

export const committees = pgTable("committees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  chamber: chamberEnum("chamber").notNull(),
  description: text("description"),

  // Committee leadership - foreign keys with proper constraints
  chair_id: uuid("chair_id").references(() => sponsors.id, { onDelete: "set null" }),
  vice_chair_id: uuid("vice_chair_id").references(() => sponsors.id, { onDelete: "set null" }),

  // Metadata
  members_count: smallint("members_count").notNull().default(0),
  mandate: text("mandate"),
  contact_email: varchar("contact_email", { length: 320 }),

  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for most common query: active committees by chamber
  chamberActiveIdx: index("idx_committees_chamber_active")
    .on(table.chamber, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Index for committee search
  nameIdx: index("idx_committees_name").on(table.name),

  // Partial indexes for leadership lookups
  chairIdx: index("idx_committees_chair").on(table.chair_id)
    .where(sql`${table.chair_id} IS NOT NULL`),
  viceChairIdx: index("idx_committees_vice_chair").on(table.vice_chair_id)
    .where(sql`${table.vice_chair_id} IS NOT NULL`),

  // Ensure chair and vice chair are different people
  leadershipCheck: check("committees_leadership_check",
    sql`${table.chair_id} IS NULL OR ${table.vice_chair_id} IS NULL OR ${table.chair_id} != ${table.vice_chair_id}`),

  // Validate members count
  membersCountCheck: check("committees_members_count_check",
    sql`${table.members_count} >= 0`),
}));

export const committee_members = pgTable("committee_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  committee_id: uuid("committee_id").notNull().references(() => committees.id, {
    onDelete: "cascade" // If committee is deleted, memberships are removed
  }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, {
    onDelete: "cascade" // If sponsor is deleted, their memberships are removed
  }),

  role: varchar("role", { length: 100 }).notNull().default("member"),
  start_date: date("start_date").notNull().default(sql`CURRENT_DATE`),
  end_date: date("end_date"),
  is_active: boolean("is_active").notNull().default(true),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate memberships
  committeeSponsorUnique: unique("committee_members_committee_sponsor_unique")
    .on(table.committee_id, table.sponsor_id),

  // Optimized composite index for most common query pattern
  committeeActiveIdx: index("idx_committee_members_committee_active")
    .on(table.committee_id, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Index for reverse lookup: all committees a sponsor belongs to
  sponsorActiveIdx: index("idx_committee_members_sponsor_active")
    .on(table.sponsor_id, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Validate date ranges
  dateRangeCheck: check("committee_members_date_range_check",
    sql`${table.end_date} IS NULL OR ${table.end_date} >= ${table.start_date}`),
}));

export const parliamentary_sessions = pgTable("parliamentary_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_number: smallint("session_number").notNull(),
  parliament_number: smallint("parliament_number").notNull(),

  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  chamber: chamberEnum("chamber").notNull(),

  is_active: boolean("is_active").notNull().default(true),
  description: text("description"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ensure uniqueness of parliament/session/chamber combination
  parliamentSessionChamberUnique: unique("parliamentary_sessions_unique")
    .on(table.parliament_number, table.session_number, table.chamber),

  // Most common query: active sessions by chamber
  chamberActiveIdx: index("idx_parliamentary_sessions_chamber_active")
    .on(table.chamber, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Support date range queries efficiently
  dateRangeIdx: index("idx_parliamentary_sessions_date_range")
    .on(table.start_date, table.end_date),

  // Validate date logic
  dateRangeCheck: check("parliamentary_sessions_date_range_check",
    sql`${table.end_date} IS NULL OR ${table.end_date} >= ${table.start_date}`),

  // Validate session numbers are positive
  sessionNumberCheck: check("parliamentary_sessions_session_number_check",
    sql`${table.session_number} > 0 AND ${table.parliament_number} > 0`),
}));

export const parliamentary_sittings = pgTable("parliamentary_sittings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id").notNull().references(() => parliamentary_sessions.id, {
    onDelete: "cascade" // If session is deleted, sittings are removed
  }),

  sitting_date: date("sitting_date").notNull(),
  sitting_number: smallint("sitting_number"),

  agenda: jsonb("agenda").notNull().default(sql`'[]'::jsonb`),
  attendance_count: smallint("attendance_count").notNull().default(0),
  bills_discussed: jsonb("bills_discussed").notNull().default(sql`'[]'::jsonb`),

  // Official records - Hansard is Kenya's official parliamentary record
  minutes_url: varchar("minutes_url", { length: 500 }),
  hansard_url: varchar("hansard_url", { length: 500 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One sitting per session per date
  sessionDateUnique: unique("parliamentary_sittings_session_date_unique")
    .on(table.session_id, table.sitting_date),

  // Most common query: sittings by session, ordered by date
  sessionDateIdx: index("idx_parliamentary_sittings_session_date")
    .on(table.session_id, table.sitting_date),

  // Global chronological queries across all sessions
  dateIdx: index("idx_parliamentary_sittings_date").on(table.sitting_date),

  // GIN indexes for efficient JSONB querying
  agendaIdx: index("idx_parliamentary_sittings_agenda")
    .using("gin", table.agenda),
  billsDiscussedIdx: index("idx_parliamentary_sittings_bills_discussed")
    .using("gin", table.bills_discussed),

  // Validate attendance count
  attendanceCountCheck: check("parliamentary_sittings_attendance_count_check",
    sql`${table.attendance_count} >= 0`),
}));

// ============================================================================
// BILLS - Core Legislative Content
// ============================================================================

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Kenya's bill numbering convention: "Bill No. 15 of 2024"
  bill_number: varchar("bill_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  full_text: text("full_text"),

  // Bill classification and lifecycle tracking
  bill_type: varchar("bill_type", { length: 50 }),
  status: billStatusEnum("status").notNull().default("drafted"),

  // Timeline tracking for transparency
  introduced_date: date("introduced_date"),
  last_action_date: date("last_action_date"),

  // Parliamentary context
  chamber: chamberEnum("chamber").notNull(),
  parliament_session: varchar("parliament_session", { length: 50 }),

  // Sponsorship with proper foreign key
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, {
    onDelete: "set null" // Keep bill record even if sponsor is deleted
  }),

  // Committee assignment and reports
  committee: varchar("committee", { length: 255 }),
  committee_report_url: varchar("committee_report_url", { length: 500 }),

  // Kenya-specific: Geographic impact analysis for targeted engagement
  affected_counties: kenyanCountyEnum("affected_counties").array(),
  impact_areas: varchar("impact_areas", { length: 100 }).array(),

  // Constitutional Article 118: Public participation requirement
  public_participation_date: date("public_participation_date"),
  public_participation_venue: varchar("public_participation_venue", { length: 255 }),
  public_participation_status: varchar("public_participation_status", { length: 50 }),

  // Engagement metrics - using integers for better performance than bigint
  view_count: integer("view_count").notNull().default(0),
  comment_count: integer("comment_count").notNull().default(0),
  share_count: integer("share_count").notNull().default(0),
  vote_count_for: integer("vote_count_for").notNull().default(0),
  vote_count_against: integer("vote_count_against").notNull().default(0),
  engagement_score: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default(sql`0`),

  // Content categorization
  category: varchar("category", { length: 100 }),

  // Content organization and discovery
  tags: varchar("tags", { length: 100 }).array(),
  external_urls: jsonb("external_urls").notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),

  // AI/ML integration status tracking
  constitutional_analysis_status: varchar("constitutional_analysis_status", { length: 50 })
    .notNull().default("pending"),
  argument_synthesis_status: varchar("argument_synthesis_status", { length: 50 })
    .notNull().default("pending"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique constraint on bill number - each bill number appears once
  billNumberUnique: unique("bills_bill_number_unique").on(table.bill_number),

  // Covering index for bill listing queries (status + chamber + engagement)
  statusChamberEngagementIdx: index("idx_bills_status_chamber_engagement")
    .on(table.status, table.chamber, table.engagement_score),

  // GIN indexes for array columns - enables efficient containment queries
  affectedCountiesIdx: index("idx_bills_affected_counties")
    .using("gin", table.affected_counties),
  tagsIdx: index("idx_bills_tags")
    .using("gin", table.tags),
  impactAreasIdx: index("idx_bills_impact_areas")
    .using("gin", table.impact_areas),

  // Index for sponsor-based queries
  sponsorActiveIdx: index("idx_bills_sponsor")
    .on(table.sponsor_id, table.status)
    .where(sql`${table.sponsor_id} IS NOT NULL`),

  // Temporal indexes for date-based queries
  introducedDateIdx: index("idx_bills_introduced_date")
    .on(table.introduced_date)
    .where(sql`${table.introduced_date} IS NOT NULL`),
  lastActionDateIdx: index("idx_bills_last_action_date")
    .on(table.last_action_date)
    .where(sql`${table.last_action_date} IS NOT NULL`),

  // Full-text search index on title
  titleIdx: index("idx_bills_title").on(table.title),

  // GIN index for metadata JSONB queries
  metadataIdx: index("idx_bills_metadata")
    .using("gin", table.metadata),

  // Data integrity constraints
  engagementCountsCheck: check("bills_engagement_counts_check",
    sql`${table.view_count} >= 0 AND ${table.comment_count} >= 0 AND 
        ${table.vote_count_for} >= 0 AND ${table.vote_count_against} >= 0`),

  dateLogicCheck: check("bills_date_logic_check",
    sql`${table.last_action_date} IS NULL OR ${table.introduced_date} IS NULL OR 
        ${table.last_action_date} >= ${table.introduced_date}`),

  engagementScoreCheck: check("bills_engagement_score_check",
    sql`${table.engagement_score} >= 0`),
}));

// Note: bill_tags table removed - use bills.tags array column instead
// The bills table already has: tags: varchar("tags", { length: 100 }).array()
// With GIN index: tagsIdx: index("idx_bills_tags").using("gin", table.tags)

// ============================================================================
// RELATIONSHIPS - Drizzle ORM Relations (Bidirectional)
// ============================================================================

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(user_profiles, {
    fields: [users.id],
    references: [user_profiles.user_id],
  }),
}));

export const userProfilesRelations = relations(user_profiles, ({ one }) => ({
  user: one(users, {
    fields: [user_profiles.user_id],
    references: [users.id],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ many }) => ({
  bills: many(bills),
  committeeMemberships: many(committee_members),
  chairedCommittees: many(committees, { relationName: "chair" }),
  viceChairedCommittees: many(committees, { relationName: "viceChair" }),
}));

export const committeesRelations = relations(committees, ({ many, one }) => ({
  members: many(committee_members),
  chair: one(sponsors, {
    fields: [committees.chair_id],
    references: [sponsors.id],
    relationName: "chair",
  }),
  viceChair: one(sponsors, {
    fields: [committees.vice_chair_id],
    references: [sponsors.id],
    relationName: "viceChair",
  }),
}));

export const committeeMembersRelations = relations(committee_members, ({ one }) => ({
  committee: one(committees, {
    fields: [committee_members.committee_id],
    references: [committees.id],
  }),
  sponsor: one(sponsors, {
    fields: [committee_members.sponsor_id],
    references: [sponsors.id],
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [bills.sponsor_id],
    references: [sponsors.id],
  }),
}));

export const parliamentarySessionsRelations = relations(parliamentary_sessions, ({ many }) => ({
  sittings: many(parliamentary_sittings),
}));

export const parliamentarySittingsRelations = relations(parliamentary_sittings, ({ one }) => ({
  session: one(parliamentary_sessions, {
    fields: [parliamentary_sittings.session_id],
    references: [parliamentary_sessions.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - For TypeScript Type Safety
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserProfile = typeof user_profiles.$inferSelect;
export type NewUserProfile = typeof user_profiles.$inferInsert;

export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;

export type Committee = typeof committees.$inferSelect;
export type NewCommittee = typeof committees.$inferInsert;

export type CommitteeMember = typeof committee_members.$inferSelect;
export type NewCommitteeMember = typeof committee_members.$inferInsert;

export type ParliamentarySession = typeof parliamentary_sessions.$inferSelect;
export type NewParliamentarySession = typeof parliamentary_sessions.$inferInsert;

export type ParliamentarySitting = typeof parliamentary_sittings.$inferSelect;
export type NewParliamentarySitting = typeof parliamentary_sittings.$inferInsert;

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;