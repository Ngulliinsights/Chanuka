// ============================================================================
// CITIZEN PARTICIPATION SCHEMA - OPTIMIZED
// ============================================================================
// Public-facing interaction layer for citizen engagement in legislative processes
// This schema handles user sessions, comments, voting, tracking, and notifications

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  chamberEnum,
  billStatusEnum,
  userRoleEnum,
  verificationStatusEnum,
  moderationStatusEnum,
  commentVoteTypeEnum,
  billVoteTypeEnum,
  engagementTypeEnum,
  notificationTypeEnum
} from "./enum";
import { users, bills } from "./foundation";

// ============================================================================
// SESSIONS - User session management with security considerations
// ============================================================================

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  
  // Session metadata stored as JSONB for flexibility (IP, user agent, device info)
  data: jsonb("data").default(sql`'{}'::jsonb`).notNull(),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index optimizes the most common query: finding active sessions for a user
  userExpiresIdx: index("idx_sessions_user_expires").on(table.user_id, table.expires_at),
  expiresAtIdx: index("idx_sessions_expires_at").on(table.expires_at),
}));

// ============================================================================
// COMMENTS - Threaded citizen feedback on bills with moderation
// ============================================================================

export const comments: any = pgTable("comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Core comment content
  comment_text: text("comment_text").notNull(),
  comment_summary: varchar("comment_summary", { length: 500 }),
  
  // Threading structure - supports nested conversations
  parent_comment_id: uuid("parent_comment_id").references(() => comments.id, { onDelete: "cascade" }),
  thread_depth: integer("thread_depth").notNull().default(0),
  
  // Citizen position and sentiment analysis
  position: varchar("position", { length: 20 }), // "support", "oppose", "neutral", "question"
  sentiment_score: numeric("sentiment_score", { precision: 3, scale: 2 }), // Range: -1.00 to 1.00
  
  // Content quality and moderation workflow
  is_constructive: boolean("is_constructive").notNull().default(true),
  moderation_status: moderationStatusEnum("moderation_status").notNull().default("pending"),
  moderation_notes: text("moderation_notes"),
  moderated_by: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderated_at: timestamp("moderated_at", { withTimezone: true }),
  
  // Engagement metrics - denormalized for performance
  upvote_count: integer("upvote_count").notNull().default(0),
  downvote_count: integer("downvote_count").notNull().default(0),
  reply_count: integer("reply_count").notNull().default(0),
  
  // Geographic context for constituency-based analysis
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),
  
  // AI processing and report generation flags
  argument_extracted: boolean("argument_extracted").notNull().default(false),
  included_in_brief: boolean("included_in_brief").notNull().default(false),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Most common query: get comments for a bill ordered by creation
  billCreatedIdx: index("idx_comments_bill_created").on(table.bill_id, table.created_at),
  
  // User activity queries
  userCreatedIdx: index("idx_comments_user_created").on(table.user_id, table.created_at),
  
  // Threading queries
  parentDepthIdx: index("idx_comments_parent_depth").on(table.parent_comment_id, table.thread_depth),
  
  // Moderation dashboard queries
  moderationCreatedIdx: index("idx_comments_moderation_created").on(table.moderation_status, table.created_at),
  
  // Geographic analysis queries
  countyBillIdx: index("idx_comments_county_bill").on(table.user_county, table.bill_id),
  
  // AI processing queue
  argumentExtractedIdx: index("idx_comments_argument_extracted").on(table.argument_extracted)
    .where(sql`${table.argument_extracted} = false`),
}));

// ============================================================================
// COMMENT VOTES - Quality-based voting system for comment ranking
// ============================================================================

export const comment_votes = pgTable("comment_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  comment_id: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  vote_type: commentVoteTypeEnum("vote_type").notNull(),
  
  // Optional context for understanding voting patterns
  voting_reason: text("voting_reason"),
  
  // Future-proofing for reputation-based weighted voting
  vote_weight: integer("vote_weight").notNull().default(1),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Enforce one vote per user per comment
  commentUserUnique: unique("comment_votes_comment_user_unique").on(table.comment_id, table.user_id),
  
  // Query votes for a comment
  commentTypeIdx: index("idx_comment_votes_comment_type").on(table.comment_id, table.vote_type),
  
  // User voting history
  userCreatedIdx: index("idx_comment_votes_user_created").on(table.user_id, table.created_at),
}));

// ============================================================================
// BILL VOTES - Direct citizen voting on legislation
// ============================================================================

export const bill_votes = pgTable("bill_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  vote_type: billVoteTypeEnum("vote_type").notNull(), // "support", "oppose", "abstain"
  
  // Context for vote reasoning and transparency
  voting_reason: text("voting_reason"),
  public_vote: boolean("public_vote").notNull().default(true),
  
  // Geographic attribution for constituency representation
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One vote per user per bill
  billUserUnique: unique("bill_votes_bill_user_unique").on(table.bill_id, table.user_id),
  
  // Aggregate vote counts by bill and type
  billTypeIdx: index("idx_bill_votes_bill_type").on(table.bill_id, table.vote_type),
  
  // Geographic vote analysis
  countyBillIdx: index("idx_bill_votes_county_bill").on(table.user_county, table.bill_id),
  
  // User voting history
  userCreatedIdx: index("idx_bill_votes_user_created").on(table.user_id, table.created_at),
}));

// ============================================================================
// BILL ENGAGEMENT - Analytics for user interaction patterns
// ============================================================================

export const bill_engagement = pgTable("bill_engagement", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Engagement type: "view", "share", "download", "bookmark", "print"
  engagement_type: engagementTypeEnum("engagement_type").notNull(),

  // Flexible storage for type-specific metadata
  engagement_value: jsonb("engagement_value").default(sql`'{}'::jsonb`).notNull(),

  // Geographic context for engagement analysis
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),

  // Session analytics
  session_duration_seconds: integer("session_duration_seconds"),
  device_type: varchar("device_type", { length: 50 }),

  // Engagement metrics
  view_count: integer("view_count").notNull().default(0),
  comment_count: integer("comment_count").notNull().default(0),
  share_count: integer("share_count").notNull().default(0),
  engagement_score: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default(sql`0`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Track unique engagement types per user per bill
  billUserTypeUnique: unique("bill_engagement_bill_user_type_unique")
    .on(table.bill_id, table.user_id, table.engagement_type),
  
  // Engagement analytics by bill
  billTypeCreatedIdx: index("idx_bill_engagement_bill_type_created")
    .on(table.bill_id, table.engagement_type, table.created_at),
  
  // User engagement history
  userTypeCreatedIdx: index("idx_bill_engagement_user_type_created")
    .on(table.user_id, table.engagement_type, table.created_at),
  
  // Time-series analysis
  createdAtIdx: index("idx_bill_engagement_created_at").on(table.created_at),
}));

// ============================================================================
// BILL TRACKING PREFERENCES - User notification settings per bill
// ============================================================================

export const bill_tracking_preferences = pgTable("bill_tracking_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Granular notification preferences
  notify_on_status_change: boolean("notify_on_status_change").notNull().default(true),
  notify_on_new_comments: boolean("notify_on_new_comments").notNull().default(false),
  notify_on_hearing_scheduled: boolean("notify_on_hearing_scheduled").notNull().default(true),
  notify_on_committee_report: boolean("notify_on_committee_report").notNull().default(true),
  
  // Notification batching: "immediate", "daily", "weekly"
  notification_frequency: varchar("notification_frequency", { length: 20 }).notNull().default("immediate"),
  
  // Tracking metadata
  tracking_started_at: timestamp("tracking_started_at", { withTimezone: true }).notNull().defaultNow(),
  tracking_reason: text("tracking_reason"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One tracking preference per user per bill
  userBillUnique: unique("bill_tracking_preferences_user_bill_unique").on(table.user_id, table.bill_id),
  
  // Query all bills a user is tracking
  userFrequencyIdx: index("idx_bill_tracking_user_frequency")
    .on(table.user_id, table.notification_frequency),
  
  // Query all users tracking a bill
  billNotifyIdx: index("idx_bill_tracking_bill_notify")
    .on(table.bill_id, table.notify_on_status_change),
}));

// ============================================================================
// NOTIFICATIONS - Unified notification delivery system
// ============================================================================

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Notification content
  notification_type: notificationTypeEnum("notification_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Related entities for deep linking
  related_bill_id: uuid("related_bill_id").references(() => bills.id, { onDelete: "cascade" }),
  related_comment_id: uuid("related_comment_id").references(() => comments.id, { onDelete: "cascade" }),
  related_user_id: uuid("related_user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // User interaction tracking
  is_read: boolean("is_read").notNull().default(false),
  read_at: timestamp("read_at", { withTimezone: true }),
  is_dismissed: boolean("is_dismissed").notNull().default(false),
  
  // Multi-channel delivery: "in_app", "email", "sms", "push"
  delivery_method: varchar("delivery_method", { length: 50 }).notNull().default("in_app"),
  delivery_status: varchar("delivery_status", { length: 50 }).notNull().default("pending"),
  
  // Call-to-action tracking
  action_taken: boolean("action_taken").notNull().default(false),
  action_type: varchar("action_type", { length: 50 }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Notification inbox query (unread first, then by date)
  userReadCreatedIdx: index("idx_notifications_user_read_created")
    .on(table.user_id, table.is_read, table.created_at),
  
  // Notification type filtering
  userTypeReadIdx: index("idx_notifications_user_type_read")
    .on(table.user_id, table.notification_type, table.is_read),
  
  // Delivery queue processing
  deliveryStatusIdx: index("idx_notifications_delivery_status")
    .on(table.delivery_status, table.created_at)
    .where(sql`${table.delivery_status} = 'pending'`),
  
  // Bill-related notification lookup
  billCreatedIdx: index("idx_notifications_bill_created")
    .on(table.related_bill_id, table.created_at),
}));

// ============================================================================
// ALERT PREFERENCES - Global user notification preferences
// ============================================================================

export const alert_preferences = pgTable("alert_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Category-level toggles
  bill_alerts: boolean("bill_alerts").notNull().default(true),
  comment_alerts: boolean("comment_alerts").notNull().default(true),
  campaign_alerts: boolean("campaign_alerts").notNull().default(true),
  system_alerts: boolean("system_alerts").notNull().default(true),
  
  // Channel preferences with consent tracking
  email_notifications: boolean("email_notifications").notNull().default(true),
  sms_notifications: boolean("sms_notifications").notNull().default(false),
  push_notifications: boolean("push_notifications").notNull().default(true),
  whatsapp_notifications: boolean("whatsapp_notifications").notNull().default(false),
  
  // Contact method verification status
  email_verified: boolean("email_verified").notNull().default(false),
  phone_verified: boolean("phone_verified").notNull().default(false),
  
  // Batching and timing: "immediate", "hourly", "daily", "weekly"
  digest_frequency: varchar("digest_frequency", { length: 20 }).notNull().default("daily"),
  
  // Quiet hours stored as {"start": "22:00", "end": "08:00", "timezone": "Africa/Nairobi"}
  quiet_hours: jsonb("quiet_hours").default(sql`'{"start": "22:00", "end": "08:00"}'::jsonb`).notNull(),
  
  // Geographic interest areas
  county_alerts: kenyanCountyEnum("county_alerts").array(),
  constituency_alerts: varchar("constituency_alerts", { length: 100 }).array(),
  
  // Language and accessibility preferences for notifications
  notification_language: varchar("notification_language", { length: 10 }).notNull().default('en'),
  accessibility_format: varchar("accessibility_format", { length: 50 }), // "plain_text", "high_contrast", "audio"
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One preference record per user
  userUnique: unique("alert_preferences_user_unique").on(table.user_id),
  
  // Indexes for notification delivery queries
  emailVerifiedIdx: index("idx_alert_preferences_email_verified")
    .on(table.email_verified, table.email_notifications)
    .where(sql`${table.email_verified} = true AND ${table.email_notifications} = true`),
  phoneVerifiedIdx: index("idx_alert_preferences_phone_verified")
    .on(table.phone_verified, table.sms_notifications)
    .where(sql`${table.phone_verified} = true AND ${table.sms_notifications} = true`),
}));

// ============================================================================
// USER CONTACT METHODS - Multiple verified contact methods per user
// ============================================================================

export const user_contact_methods = pgTable("user_contact_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Contact method details
  contact_type: varchar("contact_type", { length: 20 }).notNull(), // "email", "phone", "whatsapp"
  contact_value: varchar("contact_value", { length: 320 }).notNull(), // Email or phone number
  
  // Verification status
  is_verified: boolean("is_verified").notNull().default(false),
  verification_code: varchar("verification_code", { length: 10 }),
  verification_expires_at: timestamp("verification_expires_at", { withTimezone: true }),
  verified_at: timestamp("verified_at", { withTimezone: true }),
  
  // Usage preferences
  is_primary: boolean("is_primary").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),
  
  // Delivery tracking
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  delivery_failures: integer("delivery_failures").notNull().default(0),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique contact method per user
  userContactUnique: unique("user_contact_methods_user_contact_unique")
    .on(table.user_id, table.contact_type, table.contact_value),
  
  // Only one primary contact method per type per user (using partial index)
  userTypePrimaryIdx: index("idx_user_contact_methods_user_type_primary")
    .on(table.user_id, table.contact_type)
    .where(sql`${table.is_primary} = true`),
  
  // Indexes for contact method lookups
  contactValueIdx: index("idx_user_contact_methods_contact_value").on(table.contact_value),
  userVerifiedIdx: index("idx_user_contact_methods_user_verified")
    .on(table.user_id, table.is_verified, table.is_active)
    .where(sql`${table.is_verified} = true AND ${table.is_active} = true`),
  
  // Index for verification code lookups
  verificationCodeIdx: index("idx_user_contact_methods_verification_code")
    .on(table.verification_code)
    .where(sql`${table.verification_code} IS NOT NULL`),
}));

// ============================================================================
// RELATIONSHIPS - Define Drizzle ORM relations for type-safe queries
// ============================================================================

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
    relationName: "parent",
  }),
  replies: many(comments, {
    relationName: "parent",
  }),
  votes: many(comment_votes),
  moderatedBy: one(users, {
    fields: [comments.moderated_by],
    references: [users.id],
    relationName: "moderator",
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
    relationName: "relatedUser",
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