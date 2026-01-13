// ============================================================================
// FOUNDATION SCHEMA - Core Legislative Entities
// ============================================================================
// Kenyan Legislative Engagement Platform - Production-Ready Database Schema
// Optimized for: High Performance, Data Integrity, Scalability, Type Safety
// PostgreSQL 15+ features: Partial indexes, JSONB, GIN, CHECK constraints, Generated columns

import { sql, relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";

import {
  primaryKeyUuid,
  auditFields,
  emailField,
  metadataField,
} from "./base-types";
import {
  kenyanCountyEnum,
  chamberEnum,
  partyEnum,
  billStatusEnum,
  userRoleEnum,
  anonymityLevelEnum,
} from "./enum";
import { participation_quality_audits } from "./participation_oversight";
import { political_appointments } from "./political_economy";
import { trojan_bill_analysis } from "./trojan_bill_detection";

// ============================================================================
// CORE USER TABLES - Kenya-Optimized Authentication & Profiles
// ============================================================================

export const users = pgTable("users", {
  id: primaryKeyUuid(),
  email: emailField(),
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
  backup_codes: metadataField(),

  // Security tracking
  failed_login_attempts: smallint("failed_login_attempts").notNull().default(0),
  account_locked_until: timestamp("account_locked_until", { withTimezone: true }),
  last_password_change: timestamp("last_password_change", { withTimezone: true }),

  // Account lifecycle
  ...auditFields(),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  last_login_ip: varchar("last_login_ip", { length: 45 }), // IPv6 compatible
  is_active: boolean("is_active").notNull().default(true),
  deactivation_reason: text("deactivation_reason"),
  deactivated_at: timestamp("deactivated_at", { withTimezone: true }),
}, (table) => ({
  // Unique constraint automatically creates index
  emailUnique: unique("users_email_unique").on(table.email),

  // Hot path: Role-based queries with active filter (covering index)
  roleActiveIdx: index("idx_users_role_active")
    .on(table.role, table.is_active, table.created_at.desc())
    .where(sql`${table.is_active} = true`),

  // Partial index: Location-based queries (only active users with location)
  countyActiveIdx: index("idx_users_county_active")
    .on(table.county, table.is_active, table.constituency)
    .where(sql`${table.county} IS NOT NULL AND ${table.is_active} = true`),

  // Partial indexes: Token lookups (significantly reduces index size)
  verificationTokenIdx: index("idx_users_verification_token")
    .on(table.verification_token, table.verification_expires_at)
    .where(sql`${table.verification_token} IS NOT NULL AND ${table.verification_expires_at} > NOW()`),

  resetTokenIdx: index("idx_users_password_reset_token")
    .on(table.password_reset_token, table.password_reset_expires_at)
    .where(sql`${table.password_reset_token} IS NOT NULL AND ${table.password_reset_expires_at} > NOW()`),

  // Session management and analytics
  lastLoginIdx: index("idx_users_last_login")
    .on(table.last_login_at.desc(), table.is_active)
    .where(sql`${table.is_active} = true`),

  // Security monitoring
  lockedAccountsIdx: index("idx_users_locked_accounts")
    .on(table.account_locked_until)
    .where(sql`${table.account_locked_until} > NOW()`),

  // Data validation
  failedAttemptsCheck: check("users_failed_attempts_check",
    sql`${table.failed_login_attempts} >= 0 AND ${table.failed_login_attempts} <= 10`),
}));

export const user_profiles = pgTable("user_profiles", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().unique().references(() => users.id, {
    onDelete: "cascade"
  }),

  // Personal identification (optional for anonymity support)
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  display_name: varchar("display_name", { length: 150 }),
  bio: text("bio"),
  bio_word_count: smallint("bio_word_count").default(0), // Denormalized for quick checks

  // Anonymity controls
  anonymity_level: anonymityLevelEnum("anonymity_level").notNull().default('public'),
  anonymous_id: varchar("anonymous_id", { length: 20 }).unique(), // "Citizen_A1B2C3"
  pseudonym: varchar("pseudonym", { length: 100 }),

  // Geographic hierarchy: County > Constituency > Ward
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  ward: varchar("ward", { length: 100 }),

  // National ID verification (hashed for Data Protection Act 2019)
  national_id_hash: varchar("national_id_hash", { length: 64 }), // SHA-256
  is_id_verified: boolean("is_id_verified").notNull().default(false),
  id_verification_date: timestamp("id_verification_date", { withTimezone: true }),
  id_verification_method: varchar("id_verification_method", { length: 50 }), // 'manual', 'iprs_integration', 'biometric'

  // Contact information
  phone_number: varchar("phone_number", { length: 20 }), // E.164: +254XXXXXXXXX
  phone_verified: boolean("phone_verified").notNull().default(false),
  phone_verification_code: varchar("phone_verification_code", { length: 10 }),
  phone_verification_expires_at: timestamp("phone_verification_expires_at", { withTimezone: true }),

  // GDPR/Data Protection Act 2019 compliant consent management
  email_notifications_consent: boolean("email_notifications_consent").notNull().default(true),
  sms_notifications_consent: boolean("sms_notifications_consent").notNull().default(false),
  marketing_consent: boolean("marketing_consent").notNull().default(false),
  data_processing_consent: boolean("data_processing_consent").notNull().default(true),
  consent_date: timestamp("consent_date", { withTimezone: true }).notNull().defaultNow(),
  consent_version: varchar("consent_version", { length: 20 }).notNull().default('1.0'),

  // Localization and accessibility
  preferred_language: varchar("preferred_language", { length: 10 }).notNull().default('en'), // 'en', 'sw'
  timezone: varchar("timezone", { length: 50 }).notNull().default('Africa/Nairobi'),
  accessibility_needs: metadataField(),

  // Emergency contact
  emergency_contact_name: varchar("emergency_contact_name", { length: 200 }),
  emergency_contact_phone: varchar("emergency_contact_phone", { length: 20 }),
  emergency_contact_relationship: varchar("emergency_contact_relationship", { length: 50 }),

  // Profile customization
  avatar_url: varchar("avatar_url", { length: 500 }),
  cover_image_url: varchar("cover_image_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  preferences: metadataField(),
  privacy_settings: metadataField(),

  // Profile completeness score (0-100)
  completeness_score: smallint("completeness_score").notNull().default(0),

  // Profile visibility
  is_public: boolean("is_public").notNull().default(true),
  profile_views: integer("profile_views").notNull().default(0),

  ...auditFields(),
}, (table) => ({
  // Verified users by location (statistical queries) - covering index
  countyVerifiedIdx: index("idx_user_profiles_county_verified")
    .on(table.county, table.is_id_verified, table.constituency)
    .where(sql`${table.is_id_verified} = true AND ${table.county} IS NOT NULL`),

  // User discovery and search
  displayNamePublicIdx: index("idx_user_profiles_display_name_public")
    .on(table.display_name, table.is_public)
    .where(sql`${table.display_name} IS NOT NULL AND ${table.is_public} = true`),

  // Anonymity lookups (hot path for anonymous users)
  anonymityLevelIdx: index("idx_user_profiles_anonymity_level")
    .on(table.anonymity_level, table.is_public),

  // Contact verification (for notification systems)
  phoneVerifiedIdx: index("idx_user_profiles_phone_verified")
    .on(table.phone_verified, table.sms_notifications_consent)
    .where(sql`${table.phone_verified} = true`),

  // Consent audit trail (GDPR compliance)
  consentVersionIdx: index("idx_user_profiles_consent_version")
    .on(table.consent_version, table.consent_date.desc()),

  // Data validation
  completenessCheck: check("user_profiles_completeness_check",
    sql`${table.completeness_score} >= 0 AND ${table.completeness_score} <= 100`),

  bioWordCountCheck: check("user_profiles_bio_word_count_check",
    sql`${table.bio_word_count} >= 0`),

  profileViewsCheck: check("user_profiles_profile_views_check",
    sql`${table.profile_views} >= 0`),
}));

// ============================================================================
// LEGISLATIVE ACTORS - Sponsors and Governors
// ============================================================================

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  party: partyEnum("party"),
  chamber: chamberEnum("chamber").notNull(),

  // Political affiliation
  party_coalition: varchar("party_coalition", { length: 100 }), // "Azimio la Umoja", "Kenya Kwanza", etc.
  party_position: varchar("party_position", { length: 100 }), // "Leader", "Whip", "Deputy", etc.

  // Geographic constituency
  constituency: varchar("constituency", { length: 100 }),
  county: kenyanCountyEnum("county"),

  // Contact information
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  office_address: text("office_address"),

  // Professional details
  bio: text("bio"),
  education: text("education"),
  professional_background: text("professional_background"),

  // Term information
  term_start_date: date("term_start_date"),
  term_end_date: date("term_end_date"),
  is_active: boolean("is_active").notNull().default(true),

  // External profiles
  website: varchar("website", { length: 500 }),
  twitter_handle: varchar("twitter_handle", { length: 50 }),
  facebook_profile: varchar("facebook_profile", { length: 255 }),

  // Performance metrics (denormalized)
  bills_sponsored: smallint("bills_sponsored").notNull().default(0),
  bills_passed: smallint("bills_passed").notNull().default(0),
  committee_memberships: smallint("committee_memberships").notNull().default(0),
  attendance_rate: numeric("attendance_rate", { precision: 5, scale: 2 }),
  performance_score: numeric("performance_score", { precision: 5, scale: 2 }),

  // Media and social
  photo_url: varchar("photo_url", { length: 500 }),
  social_media_metrics: metadataField(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Active sponsors by chamber (covering index)
  chamberActiveIdx: index("idx_sponsors_chamber_active")
    .on(table.chamber, table.is_active, table.party)
    .where(sql`${table.is_active} = true`),

  // Party and coalition queries
  partyCoalitionIdx: index("idx_sponsors_party_coalition")
    .on(table.party, table.party_coalition, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Geographic queries (county-based representation)
  countyConstituencyIdx: index("idx_sponsors_county_constituency")
    .on(table.county, table.constituency, table.is_active)
    .where(sql`${table.county} IS NOT NULL AND ${table.is_active} = true`),

  // Performance-based rankings
  performanceIdx: index("idx_sponsors_performance")
    .on(table.performance_score.desc(), table.is_active)
    .where(sql`${table.is_active} = true AND ${table.performance_score} IS NOT NULL`),

  // Legislative productivity
  billsPassedIdx: index("idx_sponsors_bills_passed")
    .on(table.bills_passed.desc(), table.chamber, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Social media discovery
  twitterIdx: index("idx_sponsors_twitter")
    .on(table.twitter_handle)
    .where(sql`${table.twitter_handle} IS NOT NULL`),

  // Data validation
  billCountsCheck: check("sponsors_bill_counts_check",
    sql`${table.bills_sponsored} >= 0 AND ${table.bills_passed} >= 0 AND ${table.bills_passed} <= ${table.bills_sponsored}`),

  committeeMembershipsCheck: check("sponsors_committee_memberships_check",
    sql`${table.committee_memberships} >= 0 AND ${table.committee_memberships} <= 20`),

  attendanceRateCheck: check("sponsors_attendance_rate_check",
    sql`${table.attendance_rate} IS NULL OR (${table.attendance_rate} >= 0 AND ${table.attendance_rate} <= 100)`),

  performanceScoreCheck: check("sponsors_performance_score_check",
    sql`${table.performance_score} IS NULL OR (${table.performance_score} >= 0 AND ${table.performance_score} <= 100)`),

  termDateCheck: check("sponsors_term_date_check",
    sql`${table.term_end_date} IS NULL OR ${table.term_end_date} >= ${table.term_start_date}`),
}));

export const governors = pgTable("governors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  county: kenyanCountyEnum("county").notNull().unique(),
  party: partyEnum("party"),

  // Political affiliation
  party_coalition: varchar("party_coalition", { length: 100 }),
  deputy_governor: varchar("deputy_governor", { length: 255 }),

  // Contact information
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  office_address: text("office_address"),

  // Professional details
  bio: text("bio"),
  education: text("education"),
  professional_background: text("professional_background"),

  // Term information
  term_start_date: date("term_start_date").notNull(),
  term_end_date: date("term_end_date"),
  term_number: smallint("term_number").notNull(), // First term = 1, Second term = 2
  is_active: boolean("is_active").notNull().default(true),

  // External profiles
  website: varchar("website", { length: 500 }),
  twitter_handle: varchar("twitter_handle", { length: 50 }),
  facebook_profile: varchar("facebook_profile", { length: 255 }),

  // Performance metrics
  bills_assented: smallint("bills_assented").notNull().default(0),
  bills_withheld: smallint("bills_withheld").notNull().default(0),
  development_projects: smallint("development_projects").notNull().default(0),
  performance_score: numeric("performance_score", { precision: 5, scale: 2 }),

  photo_url: varchar("photo_url", { length: 500 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Active governors by party
  partyActiveIdx: index("idx_governors_party_active")
    .on(table.party, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Term tracking
  termActiveIdx: index("idx_governors_term_active")
    .on(table.term_number, table.is_active, table.term_end_date)
    .where(sql`${table.is_active} = true`),

  // Performance rankings
  performanceIdx: index("idx_governors_performance")
    .on(table.performance_score.desc(), table.is_active)
    .where(sql`${table.is_active} = true AND ${table.performance_score} IS NOT NULL`),

  // Data validation
  termNumberCheck: check("governors_term_number_check",
    sql`${table.term_number} >= 1 AND ${table.term_number} <= 2`), // Kenya allows 2 terms max

  termDateCheck: check("governors_term_date_check",
    sql`${table.term_end_date} IS NULL OR ${table.term_end_date} >= ${table.term_start_date}`),

  billCountsCheck: check("governors_bill_counts_check",
    sql`${table.bills_assented} >= 0 AND ${table.bills_withheld} >= 0`),

  performanceScoreCheck: check("governors_performance_score_check",
    sql`${table.performance_score} IS NULL OR (${table.performance_score} >= 0 AND ${table.performance_score} <= 100)`),
}));

// ============================================================================
// COMMITTEES - Parliamentary & Senate Committees
// ============================================================================

export const committees = pgTable("committees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  chamber: chamberEnum("chamber").notNull(),

  // Committee type and function
  committee_type: varchar("committee_type", { length: 50 }).notNull(),
  // Types: 'standing', 'select', 'joint', 'ad_hoc', 'house_business'
  jurisdiction: varchar("jurisdiction", { length: 100 }).array(),
  mandate: text("mandate"),

  // Leadership
  chair_id: uuid("chair_id").references((): AnyPgColumn => sponsors.id, {
    onDelete: "set null"
  }),
  vice_chair_id: uuid("vice_chair_id").references((): AnyPgColumn => sponsors.id, {
    onDelete: "set null"
  }),

  // Membership
  members_count: smallint("members_count").notNull().default(0),
  quorum_required: smallint("quorum_required"),

  // Activity metrics
  meetings_count: smallint("meetings_count").notNull().default(0),
  bills_reviewed_count: smallint("bills_reviewed_count").notNull().default(0),
  reports_issued_count: smallint("reports_issued_count").notNull().default(0),

  // Status
  is_active: boolean("is_active").notNull().default(true),
  establishment_date: date("establishment_date"),
  dissolution_date: date("dissolution_date"),

  // Contact
  clerk_name: varchar("clerk_name", { length: 255 }),
  clerk_email: varchar("clerk_email", { length: 255 }),
  office_location: varchar("office_location", { length: 255 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Active committees by chamber (covering index)
  chamberActiveIdx: index("idx_committees_chamber_active")
    .on(table.chamber, table.is_active, table.committee_type)
    .where(sql`${table.is_active} = true`),

  // Committee type queries
  typeActiveIdx: index("idx_committees_type_active")
    .on(table.committee_type, table.is_active, table.chamber)
    .where(sql`${table.is_active} = true`),

  // Leadership lookups (composite for efficiency)
  chairChamberIdx: index("idx_committees_chair_chamber")
    .on(table.chair_id, table.chamber, table.is_active)
    .where(sql`${table.chair_id} IS NOT NULL AND ${table.is_active} = true`),

  // Jurisdiction searches
  jurisdictionIdx: index("idx_committees_jurisdiction")
    .using("gin", table.jurisdiction),

  // Performance tracking
  performanceIdx: index("idx_committees_performance")
    .on(table.bills_reviewed_count.desc(), table.reports_issued_count.desc())
    .where(sql`${table.is_active} = true`),

  // Validation: Chair and vice chair must be different
  leadershipCheck: check("committees_leadership_check",
    sql`${table.chair_id} IS NULL OR ${table.vice_chair_id} IS NULL OR ${table.chair_id} != ${table.vice_chair_id}`),

  membersCountCheck: check("committees_members_count_check",
    sql`${table.members_count} >= 0 AND ${table.members_count} <= 100`),

  quorumCheck: check("committees_quorum_check",
    sql`${table.quorum_required} IS NULL OR (${table.quorum_required} > 0 AND ${table.quorum_required} <= ${table.members_count})`),
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
  // Roles: 'chair', 'vice_chair', 'member', 'ex_officio'

  start_date: date("start_date").notNull().default(sql`CURRENT_DATE`),
  end_date: date("end_date"),
  is_active: boolean("is_active").notNull().default(true),

  // Performance tracking
  meetings_attended: smallint("meetings_attended").notNull().default(0),
  meetings_missed: smallint("meetings_missed").notNull().default(0),
  attendance_rate: numeric("attendance_rate", { precision: 5, scale: 2 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate memberships
  committeeSponsorUnique: unique("committee_members_committee_sponsor_unique")
    .on(table.committee_id, table.sponsor_id),

  // Hot path: Active members by committee (covering index)
  committeeActiveIdx: index("idx_committee_members_committee_active")
    .on(table.committee_id, table.is_active, table.role, table.attendance_rate)
    .where(sql`${table.is_active} = true`),

  // Reverse lookup: Sponsor's committees (covering index)
  sponsorActiveIdx: index("idx_committee_members_sponsor_active")
    .on(table.sponsor_id, table.is_active, table.committee_id)
    .where(sql`${table.is_active} = true`),

  // Performance queries
  attendanceIdx: index("idx_committee_members_attendance")
    .on(table.attendance_rate.desc(), table.is_active)
    .where(sql`${table.is_active} = true AND ${table.attendance_rate} IS NOT NULL`),

  // Date validation
  dateRangeCheck: check("committee_members_date_range_check",
    sql`${table.end_date} IS NULL OR ${table.end_date} >= ${table.start_date}`),

  attendanceRateCheck: check("committee_members_attendance_rate_check",
    sql`${table.attendance_rate} IS NULL OR (${table.attendance_rate} >= 0 AND ${table.attendance_rate} <= 100)`),

  meetingsCheck: check("committee_members_meetings_check",
    sql`${table.meetings_attended} >= 0 AND ${table.meetings_missed} >= 0`),

  roleCheck: check("committee_members_role_check",
    sql`${table.role} IN ('chair', 'vice_chair', 'member', 'ex_officio')`),
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

  // Session statistics (denormalized)
  sittings_count: smallint("sittings_count").notNull().default(0),
  bills_introduced_count: smallint("bills_introduced_count").notNull().default(0),
  bills_passed_count: smallint("bills_passed_count").notNull().default(0),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique parliament/session/chamber
  parliamentSessionChamberUnique: unique("parliamentary_sessions_unique")
    .on(table.parliament_number, table.session_number, table.chamber),

  // Hot path: Active sessions by chamber (covering index)
  chamberActiveIdx: index("idx_parliamentary_sessions_chamber_active")
    .on(table.chamber, table.is_active, table.start_date.desc())
    .where(sql`${table.is_active} = true`),

  // Date range queries for historical analysis
  dateRangeIdx: index("idx_parliamentary_sessions_date_range")
    .on(table.start_date, table.end_date, table.chamber),

  // Current session lookup
  currentSessionIdx: index("idx_parliamentary_sessions_current")
    .on(table.chamber, table.is_active, table.end_date)
    .where(sql`${table.is_active} = true AND (${table.end_date} IS NULL OR ${table.end_date} >= CURRENT_DATE)`),

  // Validation
  dateRangeCheck: check("parliamentary_sessions_date_range_check",
    sql`${table.end_date} IS NULL OR ${table.end_date} >= ${table.start_date}`),

  sessionNumberCheck: check("parliamentary_sessions_session_number_check",
    sql`${table.session_number} > 0 AND ${table.parliament_number} > 0`),

  sittingsCountCheck: check("parliamentary_sessions_sittings_count_check",
    sql`${table.sittings_count} >= 0 AND ${table.bills_introduced_count} >= 0 AND ${table.bills_passed_count} >= 0`),
}));

export const parliamentary_sittings = pgTable("parliamentary_sittings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id").notNull().references(() => parliamentary_sessions.id, {
    onDelete: "cascade"
  }),

  sitting_date: date("sitting_date").notNull(),
  sitting_number: smallint("sitting_number"),
  sitting_type: varchar("sitting_type", { length: 50 }).notNull().default('regular'),
  // Types: 'regular', 'special', 'emergency', 'committee_of_whole'

  agenda: jsonb("agenda").notNull().default(sql`'[]'::jsonb`),
  attendance_count: smallint("attendance_count").notNull().default(0),
  quorum_met: boolean("quorum_met").notNull().default(true),

  bills_discussed: jsonb("bills_discussed").notNull().default(sql`'[]'::jsonb`),
  motions_moved: jsonb("motions_moved").notNull().default(sql`'[]'::jsonb`),
  questions_answered: jsonb("questions_answered").notNull().default(sql`'[]'::jsonb`),

  // Duration tracking
  start_time: timestamp("start_time", { withTimezone: true }),
  end_time: timestamp("end_time", { withTimezone: true }),
  duration_minutes: smallint("duration_minutes"),

  // Official records (Hansard)
  minutes_url: varchar("minutes_url", { length: 500 }),
  hansard_url: varchar("hansard_url", { length: 500 }),
  video_url: varchar("video_url", { length: 500 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One sitting per session per date
  sessionDateUnique: unique("parliamentary_sittings_session_date_unique")
    .on(table.session_id, table.sitting_date),

  // Hot path: Sittings by session, ordered by date (covering index)
  sessionDateIdx: index("idx_parliamentary_sittings_session_date")
    .on(table.session_id, table.sitting_date.desc(), table.sitting_type),

  // Chronological queries across sessions
  dateTypeIdx: index("idx_parliamentary_sittings_date_type")
    .on(table.sitting_date.desc(), table.sitting_type),

  // Recent sittings with records
  recentRecordsIdx: index("idx_parliamentary_sittings_recent_records")
    .on(table.sitting_date.desc(), table.hansard_url)
    .where(sql`${table.hansard_url} IS NOT NULL AND ${table.sitting_date} >= CURRENT_DATE - INTERVAL '90 days'`),

  // GIN indexes for JSONB arrays (for containment searches)
  agendaIdx: index("idx_parliamentary_sittings_agenda")
    .using("gin", table.agenda),
  billsDiscussedIdx: index("idx_parliamentary_sittings_bills_discussed")
    .using("gin", table.bills_discussed),

  // Validation
  attendanceCountCheck: check("parliamentary_sittings_attendance_count_check",
    sql`${table.attendance_count} >= 0 AND ${table.attendance_count} <= 500`),

  durationCheck: check("parliamentary_sittings_duration_check",
    sql`${table.duration_minutes} IS NULL OR ${table.duration_minutes} >= 0`),

  timeRangeCheck: check("parliamentary_sittings_time_range_check",
    sql`${table.end_time} IS NULL OR ${table.start_time} IS NULL OR ${table.end_time} >= ${table.start_time}`),

  sittingTypeCheck: check("parliamentary_sittings_type_check",
    sql`${table.sitting_type} IN ('regular', 'special', 'emergency', 'committee_of_whole')`),
}));

// ============================================================================
// BILLS - Core Legislative Content
// ============================================================================

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Kenya's convention: "Bill No. 15 of 2024"
  bill_number: varchar("bill_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  title_normalized: varchar("title_normalized", { length: 500 }), // Lowercase for searches
  summary: text("summary"),
  full_text: text("full_text"),
  full_text_word_count: integer("full_text_word_count"),

  // Bill classification and lifecycle
  bill_type: varchar("bill_type", { length: 50 }),
  // Types: 'public', 'private', 'money', 'constitutional_amendment', 'county'
  status: billStatusEnum("status").notNull().default("first_reading"),
  previous_status: billStatusEnum("previous_status"),
  status_changed_at: timestamp("status_changed_at", { withTimezone: true }),

  // Timeline
  introduced_date: date("introduced_date"),
  last_action_date: date("last_action_date"),
  days_since_introduction: smallint("days_since_introduction"), // Denormalized
  expected_completion_date: date("expected_completion_date"),

  // Parliamentary context
  chamber: chamberEnum("chamber").notNull(),
  parliament_session: varchar("parliament_session", { length: 50 }),
  reading_stage: varchar("reading_stage", { length: 20 }),
  // Stages: 'first', 'second', 'third', 'presidential_assent'

  // Sponsorship
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, {
    onDelete: "set null"
  }),
  co_sponsors: uuid("co_sponsors").array(), // Array of sponsor IDs
  co_sponsors_count: smallint("co_sponsors_count").notNull().default(0),

  // Committee
  committee: varchar("committee", { length: 255 }),
  committee_id: uuid("committee_id").references(() => committees.id, {
    onDelete: "set null"
  }),
  committee_report_url: varchar("committee_report_url", { length: 500 }),
  committee_report_date: date("committee_report_date"),
  committee_recommendation: varchar("committee_recommendation", { length: 50 }),
  // Recommendations: 'approve', 'approve_with_amendments', 'reject', 'defer'

  // Governor assent (for county bills - Article 196, Constitution of Kenya)
  // Nullable: only populated for bills affecting counties
  governor_id: uuid("governor_id").references(() => governors.id, {
    onDelete: "set null"
  }),

  // Geographic impact
  affected_counties: kenyanCountyEnum("affected_counties").array(),
  affected_counties_count: smallint("affected_counties_count").notNull().default(0),
  impact_areas: varchar("impact_areas", { length: 100 }).array(),
  // Areas: 'health', 'education', 'security', 'economy', 'governance', etc.

  // Public participation (Article 118 - Constitution of Kenya)
  public_participation_required: boolean("public_participation_required").notNull().default(true),
  public_participation_date: date("public_participation_date"),
  public_participation_venue: varchar("public_participation_venue", { length: 255 }),
  public_participation_status: varchar("public_participation_status", { length: 50 }),
  public_submissions_count: integer("public_submissions_count").notNull().default(0),

  // Engagement metrics (denormalized for performance)
  view_count: integer("view_count").notNull().default(0),
  unique_viewers_count: integer("unique_viewers_count").notNull().default(0),
  comment_count: integer("comment_count").notNull().default(0),
  share_count: integer("share_count").notNull().default(0),
  bookmark_count: integer("bookmark_count").notNull().default(0),
  vote_count_for: integer("vote_count_for").notNull().default(0),
  vote_count_against: integer("vote_count_against").notNull().default(0),
  vote_count_neutral: integer("vote_count_neutral").notNull().default(0),

  // Computed engagement score (updated via trigger or batch job)
  engagement_score: numeric("engagement_score", { precision: 12, scale: 2 }).notNull().default(sql`0`),
  // Formula: (votes * 10) + (comments * 5) + (shares * 3) + (bookmarks * 2) + (views * 0.1)
  trending_score: numeric("trending_score", { precision: 12, scale: 2 }).notNull().default(sql`0`),
  // Time-decayed engagement score for "trending" calculations

  // Sentiment analysis (AI-processed)
  sentiment_score: numeric("sentiment_score", { precision: 5, scale: 2 }), // -1.00 to 1.00
  sentiment_magnitude: numeric("sentiment_magnitude", { precision: 5, scale: 2 }), // 0.00 to infinity
  positive_mentions: integer("positive_mentions").notNull().default(0),
  negative_mentions: integer("negative_mentions").notNull().default(0),
  neutral_mentions: integer("neutral_mentions").notNull().default(0),

  // Categorization
  category: varchar("category", { length: 100 }),
  sub_category: varchar("sub_category", { length: 100 }),
  tags: varchar("tags", { length: 100 }).array(),
  primary_sector: varchar("primary_sector", { length: 100 }),
  // Sectors: 'agriculture', 'health', 'education', 'infrastructure', etc.

  // External references
  external_urls: jsonb("external_urls").notNull().default(sql`'{}'::jsonb`),
  related_bills: uuid("related_bills").array(), // Array of bill IDs
  amendments: jsonb("amendments").notNull().default(sql`'[]'::jsonb`),

  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),

  // AI/ML processing status
  constitutional_analysis_status: varchar("constitutional_analysis_status", { length: 50 })
    .notNull().default("pending"),
  argument_synthesis_status: varchar("argument_synthesis_status", { length: 50 })
    .notNull().default("pending"),
  trojan_detection_status: varchar("trojan_detection_status", { length: 50 })
    .notNull().default("pending"),
  last_ai_analysis_at: timestamp("last_ai_analysis_at", { withTimezone: true }),

  // Quality and controversy indicators
  controversy_score: numeric("controversy_score", { precision: 5, scale: 2 }),
  // High score = high controversy (based on vote patterns, sentiment, etc.)
  quality_score: numeric("quality_score", { precision: 5, scale: 2 }),
  // Based on completeness, clarity, public input, etc.

  // Priority and urgency
  is_urgent: boolean("is_urgent").notNull().default(false),
  is_money_bill: boolean("is_money_bill").notNull().default(false),
  is_constitutional_amendment: boolean("is_constitutional_amendment").notNull().default(false),
  priority_level: varchar("priority_level", { length: 20 }).notNull().default('normal'),
  // Levels: 'low', 'normal', 'high', 'critical'

  // Full-text search vector (PostgreSQL tsvector)
  search_vector: text("search_vector"),
  // Generated from: title || ' ' || summary || ' ' || tags

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique bill number
  billNumberUnique: unique("bills_bill_number_unique").on(table.bill_number),

  // Hot path: Bill listing (status + chamber + engagement) - covering index
  statusChamberEngagementIdx: index("idx_bills_status_chamber_engagement")
    .on(table.status, table.chamber, table.engagement_score.desc(), table.last_action_date.desc()),

  // Trending bills
  trendingIdx: index("idx_bills_trending")
    .on(table.trending_score.desc(), table.status, table.chamber)
    .where(sql`${table.status} NOT IN ('passed', 'rejected', 'withdrawn')`),

  // GIN indexes for array columns (efficient containment queries)
  affectedCountiesIdx: index("idx_bills_affected_counties")
    .using("gin", table.affected_counties),
  tagsIdx: index("idx_bills_tags")
    .using("gin", table.tags),
  impactAreasIdx: index("idx_bills_impact_areas")
    .using("gin", table.impact_areas),
  coSponsorsIdx: index("idx_bills_co_sponsors")
    .using("gin", table.co_sponsors),

  // Sponsor queries (covering index)
  sponsorStatusIdx: index("idx_bills_sponsor_status")
    .on(table.sponsor_id, table.status, table.last_action_date.desc())
    .where(sql`${table.sponsor_id} IS NOT NULL`),

  // Committee queries
  committeeStatusIdx: index("idx_bills_committee_status")
    .on(table.committee_id, table.status)
    .where(sql`${table.committee_id} IS NOT NULL`),

  // Governor assent tracking (for county bills)
  governorStatusIdx: index("idx_bills_governor_status")
    .on(table.governor_id, table.status, table.affected_counties)
    .where(sql`${table.governor_id} IS NOT NULL`),

  // Temporal queries (covering indexes)
  introducedDateIdx: index("idx_bills_introduced_date")
    .on(table.introduced_date.desc(), table.status, table.chamber)
    .where(sql`${table.introduced_date} IS NOT NULL`),

  lastActionDateIdx: index("idx_bills_last_action_date")
    .on(table.last_action_date.desc(), table.status)
    .where(sql`${table.last_action_date} IS NOT NULL`),

  // Urgent bills
  urgentBillsIdx: index("idx_bills_urgent")
    .on(table.is_urgent, table.priority_level, table.last_action_date.desc())
    .where(sql`${table.is_urgent} = true AND ${table.status} NOT IN ('passed', 'rejected', 'withdrawn')`),

  // Public participation
  publicParticipationIdx: index("idx_bills_public_participation")
    .on(table.public_participation_required, table.public_participation_status, table.public_participation_date)
    .where(sql`${table.public_participation_required} = true`),

  // Full-text search (GIN on tsvector using SQL expression)
  searchVectorIdx: index("idx_bills_search_vector")
    .using("gin", sql`to_tsvector('english', COALESCE(${table.title}, '') || ' ' || COALESCE(${table.summary}, ''))`),

  // Title search (for autocomplete)
  titleSearchIdx: index("idx_bills_title_search")
    .on(table.title_normalized)
    .where(sql`${table.title_normalized} IS NOT NULL`),

  // Category and sector
  categorySectorIdx: index("idx_bills_category_sector")
    .on(table.category, table.primary_sector, table.status),

  // Controversy and quality
  controversyIdx: index("idx_bills_controversy")
    .on(table.controversy_score.desc(), table.status)
    .where(sql`${table.controversy_score} > 0.5 AND ${table.status} NOT IN ('passed', 'rejected', 'withdrawn')`),

  // AI analysis status
  aiAnalysisStatusIdx: index("idx_bills_ai_analysis_status")
    .on(table.constitutional_analysis_status, table.argument_synthesis_status, table.trojan_detection_status)
    .where(sql`${table.constitutional_analysis_status} = 'pending' OR ${table.argument_synthesis_status} = 'pending' OR ${table.trojan_detection_status} = 'pending'`),

  // JSONB metadata
  metadataIdx: index("idx_bills_metadata")
    .using("gin", table.metadata),
  amendmentsIdx: index("idx_bills_amendments")
    .using("gin", table.amendments),

  // Data validation
  engagementCountsCheck: check("bills_engagement_counts_check",
    sql`${table.view_count} >= 0 AND ${table.unique_viewers_count} >= 0 AND
        ${table.comment_count} >= 0 AND ${table.share_count} >= 0 AND
        ${table.bookmark_count} >= 0 AND ${table.vote_count_for} >= 0 AND
        ${table.vote_count_against} >= 0 AND ${table.vote_count_neutral} >= 0 AND
        ${table.unique_viewers_count} <= ${table.view_count}`),

  votesCheck: check("bills_votes_check",
    sql`${table.positive_mentions} >= 0 AND ${table.negative_mentions} >= 0 AND ${table.neutral_mentions} >= 0`),

  sentimentScoreCheck: check("bills_sentiment_score_check",
    sql`${table.sentiment_score} IS NULL OR (${table.sentiment_score} >= -1 AND ${table.sentiment_score} <= 1)`),

  controversyScoreCheck: check("bills_controversy_score_check",
    sql`${table.controversy_score} IS NULL OR (${table.controversy_score} >= 0 AND ${table.controversy_score} <= 1)`),

  qualityScoreCheck: check("bills_quality_score_check",
    sql`${table.quality_score} IS NULL OR (${table.quality_score} >= 0 AND ${table.quality_score} <= 1)`),

  priorityLevelCheck: check("bills_priority_level_check",
    sql`${table.priority_level} IN ('low', 'normal', 'high', 'critical')`),

  coSponsorsCountCheck: check("bills_co_sponsors_count_check",
    sql`${table.co_sponsors_count} >= 0`),
}));

// ============================================================================
// COUNTY BILL ASSENTS - Governor approval workflow for county bills
// ============================================================================
// Article 196 (Constitution of Kenya): County bills require governor assent.
// This table tracks the assent workflow and timeline for accountability.
// Nullable governor_id on bills table links to primary governor; this table
// provides detailed audit trail of assent events and timeline.

export const county_bill_assents = pgTable("county_bill_assents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, {
    onDelete: "cascade"
  }),
  governor_id: uuid("governor_id").notNull().references(() => governors.id, {
    onDelete: "restrict" // Prevent deletion of governor with active assent records
  }),

  // Assent workflow
  assent_status: varchar("assent_status", { length: 50 }).notNull().default("pending"),
  // Values: 'pending', 'approved', 'withheld', 'returned_with_comments', 'assented'

  assent_date: date("assent_date"),
  assent_comments: text("assent_comments"),

  // Timeline tracking
  sent_to_governor_date: date("sent_to_governor_date"),
  deadline_date: date("deadline_date"), // Constitutional 30-day period
  days_pending: smallint("days_pending").notNull().default(0), // Denormalized for queries

  // Data provenance
  provenance: varchar("provenance", { length: 100 }),
  // Values: 'official', 'scraped', 'manual', 'inferred'

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One assent record per bill-governor pair
  billGovernorUnique: unique("county_bill_assents_bill_governor_unique")
    .on(table.bill_id, table.governor_id),

  // Assent tracking queries
  statusDateIdx: index("idx_county_bill_assents_status_date")
    .on(table.assent_status, table.assent_date.desc()),

  // Governor workload tracking
  governorStatusIdx: index("idx_county_bill_assents_governor_status")
    .on(table.governor_id, table.assent_status, table.deadline_date),

  // Overdue assent tracking
  overdueIdx: index("idx_county_bill_assents_overdue")
    .on(table.deadline_date, table.assent_status)
    .where(sql`${table.deadline_date} < CURRENT_DATE AND ${table.assent_status} = 'pending'`),

  // Data validation
  daysPendingCheck: check("county_bill_assents_days_pending_check",
    sql`${table.days_pending} >= 0`),

  deadlineCheck: check("county_bill_assents_deadline_check",
    sql`${table.deadline_date} IS NULL OR ${table.sent_to_governor_date} IS NULL OR ${table.deadline_date} >= ${table.sent_to_governor_date}`),
}));

// ============================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

export const oauth_providers = pgTable("oauth_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider_name: varchar("provider_name", { length: 50 }).notNull().unique(),
  // Values: 'google', 'facebook', 'twitter', 'github', 'microsoft'

  client_id: varchar("client_id", { length: 255 }).notNull(),
  client_secret: varchar("client_secret", { length: 500 }).notNull(), // Encrypted

  // OAuth configuration
  authorization_url: varchar("authorization_url", { length: 500 }).notNull(),
  token_url: varchar("token_url", { length: 500 }).notNull(),
  user_info_url: varchar("user_info_url", { length: 500 }).notNull(),
  scope: varchar("scope", { length: 500 }).notNull(),

  // Feature flags
  is_enabled: boolean("is_enabled").notNull().default(true),
  allow_registration: boolean("allow_registration").notNull().default(true),
  require_email_verification: boolean("require_email_verification").notNull().default(false),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Provider lookup
  enabledProvidersIdx: index("idx_oauth_providers_enabled")
    .on(table.is_enabled, table.provider_name)
    .where(sql`${table.is_enabled} = true`),
}));

export const user_sessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade"
  }),

  // Session tokens
  session_token: varchar("session_token", { length: 255 }).notNull().unique(),
  refresh_token: varchar("refresh_token", { length: 255 }),

  // Session metadata
  device_info: jsonb("device_info").notNull().default(sql`'{}'::jsonb`),
  // Contains: user_agent, device_type, os, browser, ip_address

  ip_address: varchar("ip_address", { length: 45 }).notNull(),
  geolocation: jsonb("geolocation").notNull().default(sql`'{}'::jsonb`),
  // Contains: country, city, region, lat, lon

  // Session lifecycle
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  last_active_at: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),

  // Session status
  is_active: boolean("is_active").notNull().default(true),
  terminated_at: timestamp("terminated_at", { withTimezone: true }),
  termination_reason: varchar("termination_reason", { length: 100 }),
  // Reasons: 'logout', 'timeout', 'security', 'admin_action'
}, (table) => ({
  // Fast session lookup
  sessionTokenIdx: index("idx_user_sessions_session_token")
    .on(table.session_token, table.is_active, table.expires_at)
    .where(sql`${table.is_active} = true AND ${table.expires_at} > NOW()`),

  // User's active sessions
  userActiveIdx: index("idx_user_sessions_user_active")
    .on(table.user_id, table.is_active, table.last_active_at.desc())
    .where(sql`${table.is_active} = true`),

  // Expired sessions cleanup
  expiredIdx: index("idx_user_sessions_expired")
    .on(table.expires_at)
    .where(sql`${table.is_active} = true AND ${table.expires_at} < NOW()`),

  // Security monitoring (track logins from unusual locations)
  ipLocationIdx: index("idx_user_sessions_ip_location")
    .on(table.user_id, table.ip_address, table.created_at.desc()),

  // GIN index for device_info queries (e.g., find all mobile sessions)
  deviceInfoIdx: index("idx_user_sessions_device_info")
    .using("gin", table.device_info),
}));

export const oauth_tokens = pgTable("oauth_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade"
  }),
  provider_id: uuid("provider_id").notNull().references(() => oauth_providers.id, {
    onDelete: "cascade"
  }),

  // OAuth tokens
  access_token: varchar("access_token", { length: 1000 }).notNull(), // Encrypted
  refresh_token: varchar("refresh_token", { length: 1000 }), // Encrypted

  // Token lifecycle
  expires_at: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  token_metadata: jsonb("token_metadata").notNull().default(sql`'{}'::jsonb`),

  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique provider account per user
  userProviderUnique: unique("oauth_tokens_user_provider_unique").on(table.user_id, table.provider_id),

  // Token lookup
  userProviderIdx: index("idx_oauth_tokens_user_provider")
    .on(table.user_id, table.provider_id, table.expires_at)
    .where(sql`${table.expires_at} IS NULL OR ${table.expires_at} > NOW()`),

  // Token refresh queries
  refreshTokenIdx: index("idx_oauth_tokens_refresh")
    .on(table.user_id, table.refresh_token)
    .where(sql`${table.refresh_token} IS NOT NULL`),

  // Expired token cleanup
  expiresIdx: index("idx_oauth_tokens_expires")
    .on(table.expires_at)
    .where(sql`${table.expires_at} IS NOT NULL AND ${table.expires_at} < NOW()`),
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

export const governorsRelations = relations(governors, ({ many }) => ({
  appointments: many(political_appointments),
  countyBills: many(bills, { relationName: "governor_assent" }),
  billAssents: many(county_bill_assents),
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
  governor: one(governors, {
    fields: [bills.governor_id],
    references: [governors.id],
    relationName: "governor_assent",
  }),
  audits: many(participation_quality_audits),
  assents: many(county_bill_assents),
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

export const countyBillAssentsRelations = relations(county_bill_assents, ({ one }) => ({
  bill: one(bills, {
    fields: [county_bill_assents.bill_id],
    references: [bills.id],
  }),
  governor: one(governors, {
    fields: [county_bill_assents.governor_id],
    references: [governors.id],
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

export type Governor = typeof governors.$inferSelect;
export type NewGovernor = typeof governors.$inferInsert;

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

export type CountyBillAssent = typeof county_bill_assents.$inferSelect;
export type NewCountyBillAssent = typeof county_bill_assents.$inferInsert;
