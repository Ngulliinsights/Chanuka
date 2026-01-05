// ============================================================================
// FOUNDATION SCHEMA - Core Legislative Entities (PRODUCTION v3.0)
// ============================================================================
// Kenyan Legislative Engagement Platform - Production-Ready Database Schema
// Optimized for: Performance, Data Integrity, Scalability, Type Safety
// PostgreSQL 15+ features: Partial indexes, JSONB, GIN, CHECK constraints

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";

import {
  kenyanCountyEnum,
  chamberEnum,
  partyEnum,
  billStatusEnum,
  userRoleEnum,
  anonymityLevelEnum,
} from "./enum";

import { participation_quality_audits } from "./participation_oversight";
import { trojan_bill_analysis } from "./trojan_bill_detection";
import { political_appointments } from "./political_economy";

// ============================================================================
// CORE USER TABLES - Kenya-Optimized Authentication & Profiles
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull(), // RFC 5321 max email length
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default('citizen'),

  // Kenya-specific: Track user's home location for content recommendation
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),

  // Account verification and security
  is_verified: boolean("is_verified").notNull().default(false),
  verification_token: varchar("verification_token", { length: 64 }),
  verification_expires_at: timestamp("verification_expires_at", { withTimezone: true }),
  password_reset_token: varchar("password_reset_token", { length: 64 }),
  password_reset_expires_at: timestamp("password_reset_expires_at", { withTimezone: true }),

  // Two-factor authentication
  two_factor_enabled: boolean("two_factor_enabled").notNull().default(false),
  two_factor_secret: varchar("two_factor_secret", { length: 32 }),
  backup_codes: jsonb("backup_codes").notNull().default(sql`'{}'::jsonb`),

  // Account lifecycle
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  is_active: boolean("is_active").notNull().default(true),
}, (table) => ({
  // Unique constraint automatically creates index
  emailUnique: unique("users_email_unique").on(table.email),

  // Hot path: Role-based queries with active filter
  roleActiveIdx: index("idx_users_role_active").on(table.role, table.is_active),

  // Partial index: Location-based queries (only active users with location)
  countyActiveIdx: index("idx_users_county_active").on(table.county, table.is_active)
    .where(sql`${table.county} IS NOT NULL AND ${table.is_active} = true`),

  // Partial indexes: Token lookups (significantly reduces index size)
  verificationTokenIdx: index("idx_users_verification_token").on(table.verification_token)
    .where(sql`${table.verification_token} IS NOT NULL`),
  resetTokenIdx: index("idx_users_password_reset_token").on(table.password_reset_token)
    .where(sql`${table.password_reset_token} IS NOT NULL`),

  // Session management and analytics
  lastLoginIdx: index("idx_users_last_login").on(table.last_login_at)
    .where(sql`${table.is_active} = true`),
}));

export const user_profiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().unique().references(() => users.id, {
    onDelete: "cascade"
  }),

  // Personal identification (optional for anonymity support)
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  display_name: varchar("display_name", { length: 150 }),
  bio: text("bio"),

  // Anonymity controls
  anonymity_level: anonymityLevelEnum("anonymity_level").notNull().default('public'),
  anonymous_id: varchar("anonymous_id", { length: 20 }), // "Citizen_A1B2C3"
  pseudonym: varchar("pseudonym", { length: 100 }),

  // Geographic hierarchy: County > Constituency > Ward
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),

  // National ID verification (hashed for Data Protection Act 2019)
  national_id_hash: varchar("national_id_hash", { length: 64 }), // SHA-256
  is_id_verified: boolean("is_id_verified").notNull().default(false),

  // Contact information
  phone_number: varchar("phone_number", { length: 20 }), // E.164: +254XXXXXXXXX
  phone_verified: boolean("phone_verified").notNull().default(false),
  phone_verification_code: varchar("phone_verification_code", { length: 10 }),
  phone_verification_expires_at: timestamp("phone_verification_expires_at", { withTimezone: true }),

  // GDPR-compliant consent management
  email_notifications_consent: boolean("email_notifications_consent").notNull().default(true),
  sms_notifications_consent: boolean("sms_notifications_consent").notNull().default(false),
  marketing_consent: boolean("marketing_consent").notNull().default(false),
  data_processing_consent: boolean("data_processing_consent").notNull().default(true),
  consent_date: timestamp("consent_date", { withTimezone: true }).notNull().defaultNow(),

  // Localization and accessibility
  preferred_language: varchar("preferred_language", { length: 10 }).notNull().default('en'),
  timezone: varchar("timezone", { length: 50 }).notNull().default('Africa/Nairobi'),
  accessibility_needs: jsonb("accessibility_needs").notNull().default(sql`'{}'::jsonb`),

  // Emergency contact
  emergency_contact_name: varchar("emergency_contact_name", { length: 200 }),
  emergency_contact_phone: varchar("emergency_contact_phone", { length: 20 }),
  emergency_contact_relationship: varchar("emergency_contact_relationship", { length: 50 }),

  // Profile customization
  avatar_url: varchar("avatar_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  preferences: jsonb("preferences").notNull().default(sql`'{}'::jsonb`),
  privacy_settings: jsonb("privacy_settings").notNull().default(sql`'{}'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Verified users by location (statistical queries)
  countyVerifiedIdx: index("idx_user_profiles_county_verified")
    .on(table.county, table.is_id_verified)
    .where(sql`${table.is_id_verified} = true AND ${table.county} IS NOT NULL`),

  // User search by display name
  displayNameIdx: index("idx_user_profiles_display_name").on(table.display_name)
    .where(sql`${table.display_name} IS NOT NULL`),

  // Anonymity lookups
  anonymityLevelIdx: index("idx_user_profiles_anonymity_level").on(table.anonymity_level),
  anonymousIdIdx: index("idx_user_profiles_anonymous_id").on(table.anonymous_id)
    .where(sql`${table.anonymous_id} IS NOT NULL`),
  pseudonymIdx: index("idx_user_profiles_pseudonym").on(table.pseudonym)
    .where(sql`${table.pseudonym} IS NOT NULL`),

  // Contact verification
  phoneVerifiedIdx: index("idx_user_profiles_phone_verified")
    .on(table.phone_verified, table.phone_number)
    .where(sql`${table.phone_verified} = true AND ${table.phone_number} IS NOT NULL`),

  // GIN indexes for JSONB
  preferencesIdx: index("idx_user_profiles_preferences")
    .using("gin", table.preferences),
  accessibilityIdx: index("idx_user_profiles_accessibility")
    .using("gin", table.accessibility_needs),
}));

// ============================================================================
// LEGISLATIVE ACTORS - MPs, Senators, MCAs
// ============================================================================
// CRITICAL: Added ethnicity and gender fields for political economy analysis

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),

  // Demographics - CRITICAL for political economy analysis
  ethnicity: varchar("ethnicity", { length: 50 }),
  // Kenya's 44+ ethnic communities: Kikuyu, Luo, Luhya, Kalenjin, Kamba, etc.
  gender: varchar("gender", { length: 20 }),
  // Values: 'male', 'female', 'non_binary', 'prefer_not_to_say'
  date_of_birth: date("date_of_birth"),

  // Political affiliation and representation
  party: partyEnum("party"),
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),
  chamber: chamberEnum("chamber").notNull(),

  // Official identification
  mp_number: varchar("mp_number", { length: 50 }),
  position: varchar("position", { length: 100 }),
  role: varchar("role", { length: 100 }),

  // Biography and contact
  bio: text("bio"),
  photo_url: varchar("photo_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }), // E.164: +254XXXXXXXXX
  office_location: text("office_location"),
  social_media: jsonb("social_media").notNull().default(sql`'{}'::jsonb`),

  // Transparency - Public Officers Ethics Act 2003 compliance
  financial_disclosures: jsonb("financial_disclosures").notNull().default(sql`'{}'::jsonb`),
  last_disclosure_date: date("last_disclosure_date"),

  // Performance metrics
  voting_record: jsonb("voting_record").notNull().default(sql`'{}'::jsonb`),
  attendance_rate: numeric("attendance_rate", { precision: 5, scale: 2 }),

  // Term tracking (Kenya's 5-year electoral cycle)
  term_start: date("term_start"),
  term_end: date("term_end"),
  is_active: boolean("is_active").notNull().default(true),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Active sponsors by chamber and county
  chamberCountyActiveIdx: index("idx_sponsors_chamber_county_active")
    .on(table.chamber, table.county, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Political analysis: Party and county
  partyCountyIdx: index("idx_sponsors_party_county").on(table.party, table.county)
    .where(sql`${table.is_active} = true`),

  // CRITICAL: Demographic analysis indexes for political economy
  ethnicityActiveIdx: index("idx_sponsors_ethnicity_active")
    .on(table.ethnicity, table.is_active)
    .where(sql`${table.ethnicity} IS NOT NULL AND ${table.is_active} = true`),

  ethnicityGenderIdx: index("idx_sponsors_ethnicity_gender")
    .on(table.ethnicity, table.gender)
    .where(sql`${table.ethnicity} IS NOT NULL AND ${table.is_active} = true`),

  // Full-text search on name
  nameIdx: index("idx_sponsors_name").on(table.name),

  // Unique MP number (nulls not distinct)
  mpNumberUnique: unique("sponsors_mp_number_unique").on(table.mp_number)
    .nullsNotDistinct(),

  // Data validation
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

  // Committee leadership
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
  // Hot path: Active committees by chamber
  chamberActiveIdx: index("idx_committees_chamber_active")
    .on(table.chamber, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Committee search
  nameIdx: index("idx_committees_name").on(table.name),

  // Leadership lookups
  chairIdx: index("idx_committees_chair").on(table.chair_id)
    .where(sql`${table.chair_id} IS NOT NULL`),
  viceChairIdx: index("idx_committees_vice_chair").on(table.vice_chair_id)
    .where(sql`${table.vice_chair_id} IS NOT NULL`),

  // Validation: Chair and vice chair must be different
  leadershipCheck: check("committees_leadership_check",
    sql`${table.chair_id} IS NULL OR ${table.vice_chair_id} IS NULL OR ${table.chair_id} != ${table.vice_chair_id}`),

  membersCountCheck: check("committees_members_count_check",
    sql`${table.members_count} >= 0`),
}));

export const committee_members = pgTable("committee_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  committee_id: uuid("committee_id").notNull().references(() => committees.id, {
    onDelete: "cascade"
  }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, {
    onDelete: "cascade"
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

  // Hot path: Active members by committee
  committeeActiveIdx: index("idx_committee_members_committee_active")
    .on(table.committee_id, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Reverse lookup: Sponsor's committees
  sponsorActiveIdx: index("idx_committee_members_sponsor_active")
    .on(table.sponsor_id, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Date validation
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
  // Unique parliament/session/chamber
  parliamentSessionChamberUnique: unique("parliamentary_sessions_unique")
    .on(table.parliament_number, table.session_number, table.chamber),

  // Hot path: Active sessions by chamber
  chamberActiveIdx: index("idx_parliamentary_sessions_chamber_active")
    .on(table.chamber, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Date range queries
  dateRangeIdx: index("idx_parliamentary_sessions_date_range")
    .on(table.start_date, table.end_date),

  // Validation
  dateRangeCheck: check("parliamentary_sessions_date_range_check",
    sql`${table.end_date} IS NULL OR ${table.end_date} >= ${table.start_date}`),

  sessionNumberCheck: check("parliamentary_sessions_session_number_check",
    sql`${table.session_number} > 0 AND ${table.parliament_number} > 0`),
}));

export const parliamentary_sittings = pgTable("parliamentary_sittings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id").notNull().references(() => parliamentary_sessions.id, {
    onDelete: "cascade"
  }),

  sitting_date: date("sitting_date").notNull(),
  sitting_number: smallint("sitting_number"),

  agenda: jsonb("agenda").notNull().default(sql`'{}'::jsonb`),
  attendance_count: smallint("attendance_count").notNull().default(0),
  bills_discussed: jsonb("bills_discussed").notNull().default(sql`'{}'::jsonb`),

  // Official records (Hansard)
  minutes_url: varchar("minutes_url", { length: 500 }),
  hansard_url: varchar("hansard_url", { length: 500 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One sitting per session per date
  sessionDateUnique: unique("parliamentary_sittings_session_date_unique")
    .on(table.session_id, table.sitting_date),

  // Hot path: Sittings by session, ordered by date
  sessionDateIdx: index("idx_parliamentary_sittings_session_date")
    .on(table.session_id, table.sitting_date.desc()),

  // Chronological queries across sessions
  dateIdx: index("idx_parliamentary_sittings_date").on(table.sitting_date.desc()),

  // GIN indexes for JSONB arrays
  agendaIdx: index("idx_parliamentary_sittings_agenda")
    .using("gin", table.agenda),
  billsDiscussedIdx: index("idx_parliamentary_sittings_bills_discussed")
    .using("gin", table.bills_discussed),

  // Validation
  attendanceCountCheck: check("parliamentary_sittings_attendance_count_check",
    sql`${table.attendance_count} >= 0`),
}));

// ============================================================================
// BILLS - Core Legislative Content
// ============================================================================

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Kenya's convention: "Bill No. 15 of 2024"
  bill_number: varchar("bill_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  full_text: text("full_text"),

  // Bill classification and lifecycle
  bill_type: varchar("bill_type", { length: 50 }),
  status: billStatusEnum("status").notNull().default("first_reading"),

  // Timeline
  introduced_date: date("introduced_date"),
  last_action_date: date("last_action_date"),

  // Parliamentary context
  chamber: chamberEnum("chamber").notNull(),
  parliament_session: varchar("parliament_session", { length: 50 }),

  // Sponsorship
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, {
    onDelete: "set null"
  }),

  // Committee
  committee: varchar("committee", { length: 255 }),
  committee_report_url: varchar("committee_report_url", { length: 500 }),

  // Geographic impact
  affected_counties: kenyanCountyEnum("affected_counties").array(),
  impact_areas: varchar("impact_areas", { length: 100 }).array(),

  // Public participation (Article 118)
  public_participation_date: date("public_participation_date"),
  public_participation_venue: varchar("public_participation_venue", { length: 255 }),
  public_participation_status: varchar("public_participation_status", { length: 50 }),

  // Engagement metrics (denormalized for performance)
  view_count: integer("view_count").notNull().default(0),
  comment_count: integer("comment_count").notNull().default(0),
  share_count: integer("share_count").notNull().default(0),
  vote_count_for: integer("vote_count_for").notNull().default(0),
  vote_count_against: integer("vote_count_against").notNull().default(0),

  // Computed engagement score
  engagement_score: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default(sql`0`),
  // Formula: (votes * 10) + (comments * 5) + (shares * 3) + (views * 0.1)

  // Categorization
  category: varchar("category", { length: 100 }),
  tags: varchar("tags", { length: 100 }).array(),

  // External references
  external_urls: jsonb("external_urls").notNull().default(sql`'{}'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),

  // AI/ML processing status
  constitutional_analysis_status: varchar("constitutional_analysis_status", { length: 50 })
    .notNull().default("pending"),
  argument_synthesis_status: varchar("argument_synthesis_status", { length: 50 })
    .notNull().default("pending"),

  // Full-text search vector (PostgreSQL tsvector)
  search_vector: text("search_vector"),
  // Generated from: title || ' ' || summary || ' ' || tags

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique bill number
  billNumberUnique: unique("bills_bill_number_unique").on(table.bill_number),

  // Hot path: Bill listing (status + chamber + engagement)
  statusChamberEngagementIdx: index("idx_bills_status_chamber_engagement")
    .on(table.status, table.chamber, table.engagement_score.desc()),

  // GIN indexes for array columns (efficient containment queries)
  affectedCountiesIdx: index("idx_bills_affected_counties")
    .using("gin", table.affected_counties),
  tagsIdx: index("idx_bills_tags")
    .using("gin", table.tags),
  impactAreasIdx: index("idx_bills_impact_areas")
    .using("gin", table.impact_areas),

  // Sponsor queries
  sponsorStatusIdx: index("idx_bills_sponsor_status")
    .on(table.sponsor_id, table.status)
    .where(sql`${table.sponsor_id} IS NOT NULL`),

  // Temporal queries
  introducedDateIdx: index("idx_bills_introduced_date")
    .on(table.introduced_date.desc())
    .where(sql`${table.introduced_date} IS NOT NULL`),
  lastActionDateIdx: index("idx_bills_last_action_date")
    .on(table.last_action_date.desc())
    .where(sql`${table.last_action_date} IS NOT NULL`),

  // Full-text search (GIN on tsvector)
  searchVectorIdx: index("idx_bills_search_vector")
    .using("gin", sql`to_tsvector('english', COALESCE(${table.title}, '') || ' ' || COALESCE(${table.summary}, ''))`),

  // Title search (for simpler queries)
  titleIdx: index("idx_bills_title").on(table.title),

  // JSONB metadata
  metadataIdx: index("idx_bills_metadata")
    .using("gin", table.metadata),

  // Data validation
  engagementCountsCheck: check("bills_engagement_counts_check",
    sql`${table.view_count} >= 0 AND ${table.comment_count} >= 0 AND
        ${table.share_count} >= 0 AND ${table.vote_count_for} >= 0 AND ${table.vote_count_against} >= 0`),

  dateLogicCheck: check("bills_date_logic_check",
    sql`${table.last_action_date} IS NULL OR ${table.introduced_date} IS NULL OR
        ${table.last_action_date} >= ${table.introduced_date}`),

  engagementScoreCheck: check("bills_engagement_score_check",
    sql`${table.engagement_score} >= 0`),
}));

// ============================================================================
// AUTHENTICATION EXTENSIONS - OAuth, Sessions, Security
// ============================================================================

export const oauth_providers = pgTable("oauth_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider_name: varchar("provider_name", { length: 50 }).notNull(),
  client_id: varchar("client_id", { length: 255 }).notNull(),
  client_secret: varchar("client_secret", { length: 255 }).notNull(),
  authorization_url: varchar("authorization_url", { length: 500 }).notNull(),
  token_url: varchar("token_url", { length: 500 }).notNull(),
  user_info_url: varchar("user_info_url", { length: 500 }),
  scopes: varchar("scopes", { length: 500 }).notNull().default('openid profile email'),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  providerNameUnique: unique("oauth_providers_provider_name_unique").on(table.provider_name),
  providerActiveIdx: index("idx_oauth_providers_active").on(table.is_active),
}));

export const oauth_tokens = pgTable("oauth_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider_id: uuid("provider_id").notNull().references(() => oauth_providers.id, { onDelete: "cascade" }),
  provider_user_id: varchar("provider_user_id", { length: 255 }).notNull(),
  access_token: varchar("access_token", { length: 500 }).notNull(),
  refresh_token: varchar("refresh_token", { length: 500 }),
  token_type: varchar("token_type", { length: 50 }).notNull().default('Bearer'),
  expires_at: timestamp("expires_at", { withTimezone: true }),
  scope: varchar("scope", { length: 500 }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userProviderUnique: unique("oauth_tokens_user_provider_unique").on(table.user_id, table.provider_id),
  userIdx: index("idx_oauth_tokens_user").on(table.user_id),
  providerIdx: index("idx_oauth_tokens_provider").on(table.provider_id),
  expiresIdx: index("idx_oauth_tokens_expires").on(table.expires_at),
}));

export const user_sessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  session_token: varchar("session_token", { length: 255 }).notNull().unique(),

  // Session metadata
  device_info: jsonb("device_info").notNull().default(sql`'{}'::jsonb`),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  location: jsonb("location"),

  // Session lifecycle
  is_active: boolean("is_active").notNull().default(true),
  last_activity: timestamp("last_activity", { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: User's active sessions
  userActiveIdx: index("idx_user_sessions_user_active")
    .on(table.user_id, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Session token lookup
  sessionTokenIdx: index("idx_user_sessions_token").on(table.session_token),

  // Cleanup expired sessions
  expiresIdx: index("idx_user_sessions_expires").on(table.expires_at)
    .where(sql`${table.expires_at} < NOW()`),

  // Security auditing
  lastActivityIdx: index("idx_user_sessions_last_activity").on(table.last_activity.desc()),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM Relations
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(user_profiles, {
    fields: [users.id],
    references: [user_profiles.user_id],
  }),
  sessions: many(user_sessions),
  oauthTokens: many(oauth_tokens),
  audits: many(participation_quality_audits, { relationName: "auditor" }),
  createdAudits: many(participation_quality_audits, { relationName: "audit_creator" }),
  updatedAudits: many(participation_quality_audits, { relationName: "audit_updater" }),
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
  appointments: many(political_appointments),
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

export const billsRelations = relations(bills, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [bills.sponsor_id],
    references: [sponsors.id],
  }),
  audits: many(participation_quality_audits),
  trojanAnalysis: one(trojan_bill_analysis, {
    fields: [bills.id],
    references: [trojan_bill_analysis.bill_id],
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

export const oauthProvidersRelations = relations(oauth_providers, ({ many }) => ({
  tokens: many(oauth_tokens),
}));

export const oauthTokensRelations = relations(oauth_tokens, ({ one }) => ({
  user: one(users, {
    fields: [oauth_tokens.user_id],
    references: [users.id],
  }),
  provider: one(oauth_providers, {
    fields: [oauth_tokens.provider_id],
    references: [oauth_providers.id],
  }),
}));

export const userSessionsRelations = relations(user_sessions, ({ one }) => ({
  user: one(users, {
    fields: [user_sessions.user_id],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
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

export type OAuthProvider = typeof oauth_providers.$inferSelect;
export type NewOAuthProvider = typeof oauth_providers.$inferInsert;

export type OAuthToken = typeof oauth_tokens.$inferSelect;
export type NewOAuthToken = typeof oauth_tokens.$inferInsert;

export type UserSession = typeof user_sessions.$inferSelect;
export type NewUserSession = typeof user_sessions.$inferInsert;