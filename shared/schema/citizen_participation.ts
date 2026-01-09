// ============================================================================
// CITIZEN PARTICIPATION SCHEMA - PRODUCTION FINAL
// ============================================================================
// Public-facing interaction layer for citizen engagement in legislative processes
// Handles: User sessions, comments, voting, tracking, and notifications
//
// PURPOSE: Enable direct democratic participation by citizens
// USERS: General public, registered citizens
//
// DESIGN PRINCIPLES:
// 1. Security-first: Hashed verification codes, attempt limits, audit trails
// 2. Performance: Partial indexes, denormalized engagement scores
// 3. Reliability: Multi-channel delivery, retry logic, bounce detection
// 4. Data integrity: CHECK constraints, proper foreign keys
// 5. Operational monitoring: Activity tracking, delivery metrics
// ============================================================================

import { sql, relations } from "drizzle-orm";
import {
    pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
    index, unique, check, foreignKey
} from "drizzle-orm/pg-core";

import { auditFields, primaryKeyUuid, metadataField } from "./base-types";
import {
  kenyanCountyEnum,
  moderationStatusEnum,
  commentVoteTypeEnum,
  billVoteTypeEnum,
  engagementTypeEnum,
  notificationTypeEnum,
  positionEnum,
  notificationFrequencyEnum,
  digestFrequencyEnum,
  notificationLanguageEnum,
  accessibilityFormatEnum,
  priorityEnum,
  deliveryStatusEnum,
  contactTypeEnum,
  deviceTypeEnum
} from "./enum";
import { users, bills } from "./foundation";

// ============================================================================
// USER INTERESTS - Explicit interest tracking for personalized recommendations
// ============================================================================
// STRATEGIC IMPORTANCE:
// - Solves cold start problem for new users
// - Enables quality recommendations without behavioral tracking
// - Allows users to explicitly express preferences
// - Foundation for smart notification filtering

export const user_interests = pgTable("user_interests", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  interest: varchar("interest", { length: 100 }).notNull(),

  // Interest metadata for weighted recommendations
  interest_strength: integer("interest_strength").notNull().default(5).$type<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(),
  interest_source: varchar("interest_source", { length: 50 }).notNull().default("user_selected"),
  // Values: "user_selected", "inferred", "imported"

  ...auditFields(),
}, (table) => ({
  // Prevent duplicate interests per user
  userInterestUnique: unique("user_interests_user_interest_unique").on(table.user_id, table.interest),

  // Primary query: Get all interests for user (sorted by strength)
  userStrengthIdx: index("idx_user_interests_user_strength").on(table.user_id, table.interest_strength.desc()),

  // Reverse lookup: Find users interested in topic
  interestUserIdx: index("idx_user_interests_interest_user").on(table.interest, table.user_id),

  // Data validation
  strengthCheck: check("interest_strength_range", sql`${table.interest_strength} BETWEEN 1 AND 10`),
}));

// ============================================================================
// SESSIONS - User session management with enhanced security
// ============================================================================

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),

  // Session metadata: IP, user agent, device info, geolocation
  metadata: metadataField(),

  // Security tracking - enables session timeout detection
  last_activity_at: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),

  ...auditFields(),
}, (table) => ({
  // Hot path: Find active sessions for user (most common query)
  userExpiresIdx: index("idx_sessions_user_expires").on(table.user_id),

  // Cleanup query: Delete expired sessions
  expiresAtIdx: index("idx_sessions_expires_at").on(table.expires_at),

  // Security audit: Track inactive sessions
  lastActivityIdx: index("idx_sessions_last_activity").on(table.last_activity_at),
}));

// ============================================================================
// COMMENTS - Threaded citizen feedback with moderation workflow
// ============================================================================

export const comments = pgTable("comments", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Core content
  comment_text: text("comment_text").notNull(),
  comment_summary: varchar("comment_summary", { length: 500 }),

  // Threading - supports nested conversations (max depth recommended: 5)
  parent_comment_id: uuid("parent_comment_id"),
  thread_depth: integer("thread_depth").notNull().default(0),
  thread_root_id: uuid("thread_root_id"), // Denormalized for O(1) thread retrieval

  // Citizen position and AI-generated sentiment
  position: positionEnum("position"),
  sentiment_score: numeric("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00

  // Content quality and moderation
  is_constructive: boolean("is_constructive").notNull().default(true),
  moderation_status: moderationStatusEnum("moderation_status").notNull().default("pending"),
  moderation_notes: text("moderation_notes"),
  moderated_by: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderated_at: timestamp("moderated_at", { withTimezone: true }),

  // Engagement metrics - denormalized for performance (updated via triggers)
  upvote_count: integer("upvote_count").notNull().default(0),
  downvote_count: integer("downvote_count").notNull().default(0),
  reply_count: integer("reply_count").notNull().default(0),
  engagement_score: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0.00"),
  // Calculated: (upvotes - downvotes) + (replies * 2) + time_decay_factor

  // Geographic context for constituency analysis
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),

  // AI processing pipeline flags
  sentiment_analyzed: boolean("sentiment_analyzed").notNull().default(false),
  argument_extracted: boolean("argument_extracted").notNull().default(false),
  included_in_brief: boolean("included_in_brief").notNull().default(false),

  // Soft delete support - preserves data while hiding from users
  is_deleted: boolean("is_deleted").notNull().default(false),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),

  ...auditFields(),
}, (table) => ({
  // Self-referencing foreign key for threaded comments
  parentCommentFk: foreignKey({
    columns: [table.parent_comment_id],
    foreignColumns: [table.id],
  }).onDelete("cascade"),

  // Hot path: Get approved comments for bill, sorted by engagement
  billApprovedEngagementIdx: index("idx_comments_bill_approved_engagement")
    .on(table.bill_id, table.engagement_score.desc())
    .where(sql`${table.moderation_status} = 'approved' AND ${table.is_deleted} = false`),

  // Thread navigation: Get all replies to a comment
  parentThreadIdx: index("idx_comments_parent_thread")
    .on(table.parent_comment_id, table.created_at)
    .where(sql`${table.parent_comment_id} IS NOT NULL`),

  // Root thread optimization: Get all comments in a thread (O(1) instead of recursive)
  threadRootCreatedIdx: index("idx_comments_thread_root_created")
    .on(table.thread_root_id, table.created_at)
    .where(sql`${table.thread_root_id} IS NOT NULL`),

  // User activity: Get user's comment history
  userCreatedIdx: index("idx_comments_user_created")
    .on(table.user_id, table.created_at.desc()),

  // Moderation queue: Pending comments oldest first
  moderationPendingIdx: index("idx_comments_moderation_pending")
    .on(table.created_at)
    .where(sql`${table.moderation_status} = 'pending' AND ${table.is_deleted} = false`),

  // Geographic analysis: Comments by county and bill
  countyBillApprovedIdx: index("idx_comments_county_bill_approved")
    .on(table.user_county, table.bill_id)
    .where(sql`${table.moderation_status} = 'approved'`),

  // AI processing queues
  sentimentQueueIdx: index("idx_comments_sentiment_queue")
    .on(table.created_at)
    .where(sql`${table.sentiment_analyzed} = false AND ${table.moderation_status} = 'approved'`),

  argumentQueueIdx: index("idx_comments_argument_queue")
    .on(table.created_at)
    .where(sql`${table.argument_extracted} = false AND ${table.moderation_status} = 'approved'`),

  // Data validation
  threadDepthCheck: check("thread_depth_range", sql`${table.thread_depth} BETWEEN 0 AND 10`),
  sentimentCheck: check("sentiment_range", sql`${table.sentiment_score} BETWEEN -1.00 AND 1.00`),
  countsPositiveCheck: check("counts_positive",
    sql`${table.upvote_count} >= 0 AND ${table.downvote_count} >= 0 AND ${table.reply_count} >= 0`),
}));

// ============================================================================
// COMMENT VOTES - Quality-based voting for democratic ranking
// ============================================================================

export const comment_votes = pgTable("comment_votes", {
  id: primaryKeyUuid(),
  comment_id: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  vote_type: commentVoteTypeEnum("vote_type").notNull(), // "upvote", "downvote"

  // Optional qualitative feedback
  voting_reason: varchar("voting_reason", { length: 500 }),

  // Reputation-weighted voting (future enhancement)
  vote_weight: integer("vote_weight").notNull().default(1),

  ...auditFields(),
}, (table) => ({
  // Enforce one vote per user per comment
  commentUserUnique: unique("comment_votes_comment_user_unique").on(table.comment_id, table.user_id),

  // Aggregate votes: Count by comment and type
  commentTypeIdx: index("idx_comment_votes_comment_type").on(table.comment_id, table.vote_type),

  // User voting history
  userCreatedIdx: index("idx_comment_votes_user_created").on(table.user_id, table.created_at.desc()),

  // Vote weight validation
  weightCheck: check("vote_weight_positive", sql`${table.vote_weight} > 0`),
}));

// ============================================================================
// BILL VOTES - Direct democratic input on legislation
// ============================================================================

export const bill_votes = pgTable("bill_votes", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  vote_type: billVoteTypeEnum("vote_type").notNull(), // "support", "oppose", "abstain"

  // Transparency and reasoning
  voting_reason: text("voting_reason"),
  public_vote: boolean("public_vote").notNull().default(true),
  vote_confidence: integer("vote_confidence").notNull().default(5).$type<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(),
  // How confident is the user in their position? Enables confidence-weighted analysis

  // Geographic attribution for constituency representation
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),

  ...auditFields(),
}, (table) => ({
  // Enforce one vote per user per bill
  billUserUnique: unique("bill_votes_bill_user_unique").on(table.bill_id, table.user_id),

  // Aggregate counts: Votes by bill and type
  billTypePublicIdx: index("idx_bill_votes_bill_type_public")
    .on(table.bill_id, table.vote_type)
    .where(sql`${table.public_vote} = true`),

  // Geographic analysis: Votes by county
  countyBillTypeIdx: index("idx_bill_votes_county_bill_type")
    .on(table.user_county, table.bill_id, table.vote_type)
    .where(sql`${table.user_county} IS NOT NULL`),

  // Constituency breakdown - enables representative comparison
  constituencyBillIdx: index("idx_bill_votes_constituency_bill")
    .on(table.user_constituency, table.bill_id)
    .where(sql`${table.user_constituency} IS NOT NULL`),

  // User voting history
  userCreatedIdx: index("idx_bill_votes_user_created").on(table.user_id, table.created_at.desc()),

  // Confidence validation
  confidenceCheck: check("vote_confidence_range", sql`${table.vote_confidence} BETWEEN 1 AND 10`),
}));

// ============================================================================
// BILL ENGAGEMENT - Comprehensive interaction analytics
// ============================================================================

export const bill_engagement = pgTable("bill_engagement", {
  id: primaryKeyUuid(),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Engagement type: "view", "share", "download", "bookmark", "print"
  engagement_type: engagementTypeEnum("engagement_type").notNull(),

  // Type-specific metadata (share platform, download format, etc.)
  engagement_metadata: jsonb("engagement_metadata").default(sql`'{}'::jsonb`).notNull(),

  // Geographic context
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),

  // Session context for analytics
  session_duration_seconds: integer("session_duration_seconds"),
  device_type: deviceTypeEnum("device_type"),
  referral_source: varchar("referral_source", { length: 100 }), // Traffic source tracking

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Track unique engagement: One record per user/bill/type combination
  billUserTypeUnique: unique("bill_engagement_bill_user_type_unique")
    .on(table.bill_id, table.user_id, table.engagement_type),

  // Analytics: Engagement timeline by bill
  billTypeCreatedIdx: index("idx_bill_engagement_bill_type_created")
    .on(table.bill_id, table.engagement_type, table.created_at.desc()),

  // User analytics: Engagement history
  userTypeCreatedIdx: index("idx_bill_engagement_user_type_created")
    .on(table.user_id, table.engagement_type, table.created_at.desc()),

  // Time-series analysis: Engagement trends
  typeCreatedIdx: index("idx_bill_engagement_type_created")
    .on(table.engagement_type, table.created_at.desc()),

  // Geographic engagement patterns
  countyTypeIdx: index("idx_bill_engagement_county_type")
    .on(table.user_county, table.engagement_type)
    .where(sql`${table.user_county} IS NOT NULL`),

  // Duration validation
  durationCheck: check("session_duration_positive",
    sql`${table.session_duration_seconds} IS NULL OR ${table.session_duration_seconds} >= 0`),
}));

// ============================================================================
// BILL TRACKING PREFERENCES - Granular notification controls per bill
// ============================================================================

export const bill_tracking_preferences = pgTable("bill_tracking_preferences", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Granular notification triggers
  notify_on_status_change: boolean("notify_on_status_change").notNull().default(true),
  notify_on_new_comments: boolean("notify_on_new_comments").notNull().default(false),
  notify_on_comment_replies: boolean("notify_on_comment_replies").notNull().default(true),
  notify_on_hearing_scheduled: boolean("notify_on_hearing_scheduled").notNull().default(true),
  notify_on_committee_report: boolean("notify_on_committee_report").notNull().default(true),
  notify_on_voting_opened: boolean("notify_on_voting_opened").notNull().default(true),

  // Batching preference: "immediate", "daily_digest", "weekly_digest"
  notification_frequency: notificationFrequencyEnum("notification_frequency").notNull().default("realtime"),

  // Tracking metadata
  tracking_started_at: timestamp("tracking_started_at", { withTimezone: true }).notNull().defaultNow(),
  tracking_reason: varchar("tracking_reason", { length: 200 }),

  // Active tracking flag (user can pause)
  is_active: boolean("is_active").notNull().default(true),

  ...auditFields(),
}, (table) => ({
  // Enforce one tracking preference per user per bill
  userBillUnique: unique("bill_tracking_preferences_user_bill_unique").on(table.user_id, table.bill_id),

  // Notification delivery: Get users tracking bill with specific trigger
  billStatusActiveIdx: index("idx_bill_tracking_bill_status_active")
    .on(table.bill_id, table.notify_on_status_change)
    .where(sql`${table.is_active} = true AND ${table.notify_on_status_change} = true`),

  // Digest batching: Group by frequency
  userFrequencyActiveIdx: index("idx_bill_tracking_user_frequency_active")
    .on(table.user_id, table.notification_frequency)
    .where(sql`${table.is_active} = true`),

  // User dashboard: All tracked bills
  userActiveCreatedIdx: index("idx_bill_tracking_user_active_created")
    .on(table.user_id, table.is_active, table.tracking_started_at.desc()),
}));

// ============================================================================
// NOTIFICATIONS - Multi-channel notification delivery system
// ============================================================================

export const notifications = pgTable("notifications", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Notification content
  notification_type: notificationTypeEnum("notification_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),

  // Related entities for deep linking and context
  related_bill_id: uuid("related_bill_id").references(() => bills.id, { onDelete: "cascade" }),
  related_comment_id: uuid("related_comment_id").references(() => comments.id, { onDelete: "cascade" }),
  related_user_id: uuid("related_user_id").references(() => users.id, { onDelete: "cascade" }),

  // Priority level: "low", "normal", "high", "urgent"
  priority: priorityEnum("priority").notNull().default("normal"),

  // User interaction tracking
  is_read: boolean("is_read").notNull().default(false),
  read_at: timestamp("read_at", { withTimezone: true }),
  is_dismissed: boolean("is_dismissed").notNull().default(false),
  dismissed_at: timestamp("dismissed_at", { withTimezone: true }),

  // Multi-channel delivery (can send to multiple channels simultaneously)
  delivery_channels: varchar("delivery_channels", { length: 50 }).array().notNull().default(sql`ARRAY['in_app']::varchar[]`),
  // Values: "in_app", "email", "sms", "push", "whatsapp"

  delivery_status: deliveryStatusEnum("delivery_status").notNull().default("pending"),
  // Values: "pending", "sent", "delivered", "failed", "retrying"

  // Retry logic for failed deliveries
  delivery_attempts: integer("delivery_attempts").notNull().default(0),
  last_delivery_attempt: timestamp("last_delivery_attempt", { withTimezone: true }),
  delivery_error: text("delivery_error"),

  // Call-to-action tracking
  action_url: varchar("action_url", { length: 500 }),
  action_taken: boolean("action_taken").notNull().default(false),
  action_taken_at: timestamp("action_taken_at", { withTimezone: true }),

  // Expiration support (auto-dismiss old notifications)
  expires_at: timestamp("expires_at", { withTimezone: true }),

  ...auditFields(),
}, (table) => ({
  // Hot path: User inbox (unread first, then by priority and date)
  userReadPriorityIdx: index("idx_notifications_user_read_priority")
    .on(table.user_id, table.is_read, table.priority, table.created_at.desc())
    .where(sql`${table.is_dismissed} = false`),

  // Notification filtering by type
  userTypeReadIdx: index("idx_notifications_user_type_read")
    .on(table.user_id, table.notification_type, table.is_read),

  // Delivery queue: Pending notifications oldest first
  deliveryQueueIdx: index("idx_notifications_delivery_queue")
    .on(table.delivery_status, table.created_at)
    .where(sql`${table.delivery_status} IN ('pending', 'retrying')`),

  // Cleanup: Expired notifications
  expiredIdx: index("idx_notifications_expired")
    .on(table.expires_at)
    .where(sql`${table.expires_at} < NOW() AND ${table.is_dismissed} = false`),

  // Analytics: Bill-related notifications
  billTypeCreatedIdx: index("idx_notifications_bill_type_created")
    .on(table.related_bill_id, table.notification_type, table.created_at.desc())
    .where(sql`${table.related_bill_id} IS NOT NULL`),

  // Delivery validation
  attemptsCheck: check("delivery_attempts_positive", sql`${table.delivery_attempts} >= 0`),
}));

// ============================================================================
// ALERT PREFERENCES - Global user notification preferences
// ============================================================================

export const alert_preferences = pgTable("alert_preferences", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Category-level toggles
  bill_alerts: boolean("bill_alerts").notNull().default(true),
  comment_alerts: boolean("comment_alerts").notNull().default(true),
  campaign_alerts: boolean("campaign_alerts").notNull().default(true),
  system_alerts: boolean("system_alerts").notNull().default(true),

  // Channel preferences with verification tracking (separate enabled/verified)
  email_enabled: boolean("email_enabled").notNull().default(true),
  email_verified: boolean("email_verified").notNull().default(false),

  sms_enabled: boolean("sms_enabled").notNull().default(false),
  sms_verified: boolean("sms_verified").notNull().default(false),

  push_enabled: boolean("push_enabled").notNull().default(true),
  push_token: text("push_token"), // FCM/APNS token storage

  whatsapp_enabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsapp_verified: boolean("whatsapp_verified").notNull().default(false),

  // Digest preferences: "never", "immediate", "hourly", "daily", "weekly"
  digest_frequency: digestFrequencyEnum("digest_frequency").notNull().default("daily"),
  digest_time: varchar("digest_time", { length: 5 }).default("09:00"), // HH:MM format

  // Quiet hours: {"start": "22:00", "end": "08:00", "timezone": "Africa/Nairobi"}
  quiet_hours: jsonb("quiet_hours").default(sql`'{}'::jsonb`).notNull(),
  quiet_hours_enabled: boolean("quiet_hours_enabled").notNull().default(true),

  // Geographic interest areas for location-based alerts
  county_alerts: kenyanCountyEnum("county_alerts").array(),
  constituency_alerts: varchar("constituency_alerts", { length: 100 }).array(),

  // Language and accessibility
  notification_language: notificationLanguageEnum("notification_language").notNull().default('english'),
  // Values: "en", "sw" (English, Swahili)

  accessibility_format: accessibilityFormatEnum("accessibility_format"),
  // Values: "standard", "plain_text", "high_contrast", "screen_reader"

  ...auditFields(),
}, (table) => ({
  // Delivery queries: Active verified channels
  emailActiveIdx: index("idx_alert_preferences_email_active")
    .on(table.user_id)
    .where(sql`${table.email_verified} = true AND ${table.email_enabled} = true`),

  smsActiveIdx: index("idx_alert_preferences_sms_active")
    .on(table.user_id)
    .where(sql`${table.sms_verified} = true AND ${table.sms_enabled} = true`),

  // Digest batching
  digestFrequencyIdx: index("idx_alert_preferences_digest_frequency")
    .on(table.digest_frequency, table.digest_time)
    .where(sql`${table.digest_frequency} != 'never'`),
}));

// ============================================================================
// USER CONTACT METHODS - Multi-channel verified contact management
// ============================================================================

export const user_contact_methods = pgTable("user_contact_methods", {
  id: primaryKeyUuid(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Contact details
  contact_type: contactTypeEnum("contact_type").notNull(),
  // Values: "email", "phone", "whatsapp"

  contact_value: varchar("contact_value", { length: 320 }).notNull(),
  // Email (max 320 chars RFC 5321) or phone number (E.164 format)

  // Verification workflow with SECURITY
  is_verified: boolean("is_verified").notNull().default(false),
  verification_code: varchar("verification_code", { length: 10 }), // Temporary, cleared after verification
  verification_code_hash: varchar("verification_code_hash", { length: 64 }), // SHA-256 hash for security
  verification_expires_at: timestamp("verification_expires_at", { withTimezone: true }),
  verification_attempts: integer("verification_attempts").notNull().default(0),
  verified_at: timestamp("verified_at", { withTimezone: true }),

  // Contact preferences
  is_primary: boolean("is_primary").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),

  // Delivery reliability tracking
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  successful_deliveries: integer("successful_deliveries").notNull().default(0),
  failed_deliveries: integer("failed_deliveries").notNull().default(0),
  bounce_detected: boolean("bounce_detected").notNull().default(false),
  bounce_detected_at: timestamp("bounce_detected_at", { withTimezone: true }),

  ...auditFields(),
}, (table) => ({
  // Enforce unique contact value per user
  userContactUnique: unique("user_contact_methods_user_contact_unique")
    .on(table.user_id, table.contact_type, table.contact_value),

  // Primary contact lookup
  userTypePrimaryIdx: index("idx_user_contact_methods_user_type_primary")
    .on(table.user_id, table.contact_type, table.is_primary)
    .where(sql`${table.is_primary} = true`),

  // Verified active contacts for delivery
  userVerifiedActiveIdx: index("idx_user_contact_methods_user_verified_active")
    .on(table.user_id, table.contact_type)
    .where(sql`${table.is_verified} = true AND ${table.is_active} = true AND ${table.bounce_detected} = false`),

  // Verification code lookup (with expiry check)
  verificationCodeIdx: index("idx_user_contact_methods_verification_code")
    .on(table.verification_code_hash)
    .where(sql`${table.verification_code_hash} IS NOT NULL AND ${table.verification_expires_at} > NOW()`),

  // Global contact value lookup (prevent abuse, detect duplicates)
  contactValueIdx: index("idx_user_contact_methods_contact_value").on(table.contact_value),

  // Validation constraints
  attemptsCheck: check("verification_attempts_range", sql`${table.verification_attempts} BETWEEN 0 AND 10`),
  deliveryCheck: check("delivery_counts_positive",
    sql`${table.successful_deliveries} >= 0 AND ${table.failed_deliveries} >= 0`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM relations
// ============================================================================

export const userInterestsRelations = relations(user_interests, ({ one }) => ({
  user: one(users, {
    fields: [user_interests.user_id],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  bill: one(bills, {
    fields: [comments.bill_id],
    references: [bills.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parent_comment_id],
    references: [comments.id],
    relationName: "comment_thread",
  }),
  replies: many(comments, {
    relationName: "comment_thread",
  }),
  votes: many(comment_votes),
  moderatedBy: one(users, {
    fields: [comments.moderated_by],
    references: [users.id],
    relationName: "comment_moderator",
  }),
  notifications: many(notifications),
}));

export const commentVotesRelations = relations(comment_votes, ({ one }) => ({
  comment: one(comments, {
    fields: [comment_votes.comment_id],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [comment_votes.user_id],
    references: [users.id],
  }),
}));

export const billVotesRelations = relations(bill_votes, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_votes.bill_id],
    references: [bills.id],
  }),
  user: one(users, {
    fields: [bill_votes.user_id],
    references: [users.id],
  }),
}));

export const billEngagementRelations = relations(bill_engagement, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_engagement.bill_id],
    references: [bills.id],
  }),
  user: one(users, {
    fields: [bill_engagement.user_id],
    references: [users.id],
  }),
}));

export const billTrackingPreferencesRelations = relations(bill_tracking_preferences, ({ one }) => ({
  user: one(users, {
    fields: [bill_tracking_preferences.user_id],
    references: [users.id],
  }),
  bill: one(bills, {
    fields: [bill_tracking_preferences.bill_id],
    references: [bills.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
  relatedBill: one(bills, {
    fields: [notifications.related_bill_id],
    references: [bills.id],
  }),
  relatedComment: one(comments, {
    fields: [notifications.related_comment_id],
    references: [comments.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.related_user_id],
    references: [users.id],
    relationName: "notification_related_user",
  }),
}));

export const alertPreferencesRelations = relations(alert_preferences, ({ one }) => ({
  user: one(users, {
    fields: [alert_preferences.user_id],
    references: [users.id],
  }),
}));

export const userContactMethodsRelations = relations(user_contact_methods, ({ one }) => ({
  user: one(users, {
    fields: [user_contact_methods.user_id],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript type safety
// ============================================================================

export type UserInterest = typeof user_interests.$inferSelect;
export type NewUserInterest = typeof user_interests.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type CommentVote = typeof comment_votes.$inferSelect;
export type NewCommentVote = typeof comment_votes.$inferInsert;

export type BillVote = typeof bill_votes.$inferSelect;
export type NewBillVote = typeof bill_votes.$inferInsert;

export type BillEngagement = typeof bill_engagement.$inferSelect;
export type NewBillEngagement = typeof bill_engagement.$inferInsert;

export type BillTrackingPreference = typeof bill_tracking_preferences.$inferSelect;
export type NewBillTrackingPreference = typeof bill_tracking_preferences.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AlertPreference = typeof alert_preferences.$inferSelect;
export type NewAlertPreference = typeof alert_preferences.$inferInsert;

export type UserContactMethod = typeof user_contact_methods.$inferSelect;
export type NewUserContactMethod = typeof user_contact_methods.$inferInsert;
