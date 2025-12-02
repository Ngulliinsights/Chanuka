// ============================================================================
// INTEGRITY OPERATIONS SCHEMA
// ============================================================================
// Content moderation, verification, and platform integrity infrastructure

import {
  pgTable, text, integer, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, smallint, boolean
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  moderationStatusEnum,
  verificationStatusEnum,
  severityEnum
} from "./enum";

import { users } from "./foundation";
import { comments } from "./citizen_participation";

// ============================================================================
// CONTENT REPORTS - User reports of problematic content
// ============================================================================

export const content_reports = pgTable("content_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reported content - only one should be populated per report
  reported_comment_id: uuid("reported_comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reported_user_id: uuid("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Reporter information
  reporter_id: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reporter_anonymous: boolean("reporter_anonymous").notNull().default(false),
  
  // Report details - using smaller varchar for categories improves index performance
  report_category: varchar("report_category", { length: 50 }).notNull(), // "spam", "harassment", "misinformation", "hate_speech", "violence", "illegal_content"
  report_reason: text("report_reason").notNull(),
  report_severity: severityEnum("report_severity").notNull().default("medium"),
  
  // Evidence - storing URLs or file references, not actual files
  evidence_screenshots: varchar("evidence_screenshots", { length: 500 }).array(),
  additional_context: text("additional_context"),
  
  // Report processing
  report_status: varchar("report_status", { length: 50 }).notNull().default("pending"), // "pending", "under_review", "resolved", "dismissed", "escalated"
  assigned_moderator_id: uuid("assigned_moderator_id").references(() => users.id, { onDelete: "set null" }),
  
  // Resolution tracking
  resolution_action: varchar("resolution_action", { length: 100 }),
  resolution_notes: text("resolution_notes"),
  resolved_at: timestamp("resolved_at", { withTimezone: true }),
  
  // Feedback loop for improving moderation
  reporter_feedback: text("reporter_feedback"),
  reporter_satisfaction: smallint("reporter_satisfaction"), // 1-5 rating scale
  appeal_requested: boolean("appeal_requested").notNull().default(false),
  appeal_reason: text("appeal_reason"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for most common query pattern
  reporterStatusIdx: index("idx_content_reports_reporter_status").on(table.reporter_id, table.report_status),
  commentIdx: index("idx_content_reports_comment").on(table.reported_comment_id),
  userIdx: index("idx_content_reports_user").on(table.reported_user_id),
  // Composite index for moderator workload queries
  moderatorStatusIdx: index("idx_content_reports_moderator_status").on(table.assigned_moderator_id, table.report_status),
  // Severity and status together for prioritization
  severityStatusIdx: index("idx_content_reports_severity_status").on(table.report_severity, table.report_status),
  // Partial index for unresolved reports only (reduces index size)
  unresolvedIdx: index("idx_content_reports_unresolved").on(table.created_at).where(sql`report_status IN ('pending', 'under_review')`),
}));

// ============================================================================
// MODERATION QUEUE - Central queue for content moderation
// ============================================================================

export const moderation_queue = pgTable("moderation_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Content being moderated - polymorphic reference
  content_type: varchar("content_type", { length: 50 }).notNull(), // "comment", "user_profile", "campaign", "reply"
  content_id: uuid("content_id").notNull(),
  
  // Source of moderation request
  source_type: varchar("source_type", { length: 50 }).notNull(), // "user_report", "automated_flag", "moderator_review", "appeal"
  report_id: uuid("report_id").references(() => content_reports.id, { onDelete: "set null" }),
  
  // Priority and assignment - higher score = higher priority
  priority_score: numeric("priority_score", { precision: 5, scale: 2 }).notNull().default("5.0"),
  assigned_moderator_id: uuid("assigned_moderator_id").references(() => users.id, { onDelete: "set null" }),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),
  
  // Queue status
  queue_status: moderationStatusEnum("queue_status").notNull().default("pending"),
  
  // Review process tracking
  review_started_at: timestamp("review_started_at", { withTimezone: true }),
  review_completed_at: timestamp("review_completed_at", { withTimezone: true }),
  review_duration_seconds: integer("review_duration_seconds"), // Changed to seconds for better precision
  
  // Moderation decision
  moderation_action: varchar("moderation_action", { length: 100 }), // "approve", "reject", "edit", "suspend_user", "remove_content", "warn_user"
  moderation_reason: text("moderation_reason"),
  moderation_notes: text("moderation_notes"),
  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }), // For tracking decision certainty
  
  // Quality assurance workflow
  qa_review_required: boolean("qa_review_required").notNull().default(false),
  qa_reviewed_by: uuid("qa_reviewed_by").references(() => users.id, { onDelete: "set null" }),
  qa_review_notes: text("qa_review_notes"),
  qa_approved: boolean("qa_approved"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for content lookups
  contentTypeIdIdx: index("idx_moderation_queue_content_type_id").on(table.content_type, table.content_id),
  // Critical for queue management - pending items ordered by priority
  statusPriorityIdx: index("idx_moderation_queue_status_priority").on(table.queue_status, table.priority_score).where(sql`queue_status = 'pending'`),
  // Moderator workload tracking
  moderatorStatusIdx: index("idx_moderation_queue_moderator_status").on(table.assigned_moderator_id, table.queue_status),
  reportIdx: index("idx_moderation_queue_report").on(table.report_id),
  // QA workflow index
  qaRequiredIdx: index("idx_moderation_queue_qa_required").on(table.qa_review_required).where(sql`qa_review_required = true AND qa_reviewed_by IS NULL`),
}));

// ============================================================================
// EXPERT PROFILES - Verification and expertise tracking
// ============================================================================

export const expert_profiles = pgTable("expert_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Expertise areas - using structured arrays for better querying
  expertise_domains: varchar("expertise_domains", { length: 100 }).array().notNull(),
  specializations: varchar("specializations", { length: 100 }).array(),
  years_of_experience: smallint("years_of_experience"), // smallint sufficient for years
  
  // Professional background
  current_position: varchar("current_position", { length: 255 }),
  organization: varchar("organization", { length: 255 }),
  professional_bio: text("professional_bio"),
  
  // Credentials stored as structured JSONB
  educational_background: jsonb("educational_background").default(sql`'[]'::jsonb`), // [{degree, institution, year}]
  professional_certifications: varchar("professional_certifications", { length: 255 }).array(),
  publications: jsonb("publications").default(sql`'[]'::jsonb`), // [{title, journal, year, doi}]
  
  // Verification workflow
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verification_date: timestamp("verification_date", { withTimezone: true }),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verification_expires_at: timestamp("verification_expires_at", { withTimezone: true }), // Added expiry for re-verification
  
  // Verification evidence - storing references to secure document storage
  credential_documents: varchar("credential_documents", { length: 500 }).array(),
  reference_contacts: jsonb("reference_contacts").default(sql`'[]'::jsonb`), // [{name, organization, email, verified}]
  
  // Platform activity preferences
  review_capacity: varchar("review_capacity", { length: 50 }).notNull().default("occasional"), // "occasional", "regular", "frequent", "unavailable"
  review_expertise: jsonb("review_expertise").default(sql`'{}'::jsonb`), // {domain: confidence_level}
  available_for_review: boolean("available_for_review").notNull().default(true),
  
  // Performance metrics for quality tracking
  reviews_completed: integer("reviews_completed").notNull().default(0),
  reviews_accepted: integer("reviews_accepted").notNull().default(0), // Track acceptance rate
  review_quality_score: numeric("review_quality_score", { precision: 3, scale: 2 }),
  community_rating: numeric("community_rating", { precision: 3, scale: 2 }),
  average_review_time_hours: numeric("average_review_time_hours", { precision: 6, scale: 2 }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex("idx_expert_profiles_user").on(table.user_id),
  statusIdx: index("idx_expert_profiles_status").on(table.verification_status),
  // GIN index for array containment queries
  expertiseIdx: index("idx_expert_profiles_expertise").using("gin", table.expertise_domains),
  // Composite index for finding available experts by domain
  availableStatusIdx: index("idx_expert_profiles_available_status").on(table.available_for_review, table.verification_status).where(sql`available_for_review = true AND verification_status = 'verified'`),
  verifiedByIdx: index("idx_expert_profiles_verified_by").on(table.verified_by),
}));

// ============================================================================
// USER VERIFICATION - Identity and credential verification
// ============================================================================

export const user_verification = pgTable("user_verification", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Verification details
  verification_type: varchar("verification_type", { length: 100 }).notNull(), // "national_id", "address", "profession", "phone", "email"
  verification_level: smallint("verification_level").notNull().default(1), // 1=basic, 2=standard, 3=enhanced
  verification_documents: varchar("verification_documents", { length: 500 }).array(),
  
  // Verification data - sensitive data should be encrypted before storage
  verification_data: jsonb("verification_data").default(sql`'{}'::jsonb`),
  verification_hash: varchar("verification_hash", { length: 255 }), // Hash for duplicate detection
  
  // Verification process timestamps
  submitted_at: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  verified_at: timestamp("verified_at", { withTimezone: true }),
  verifier_id: uuid("verifier_id").references(() => users.id, { onDelete: "set null" }),
  
  // Verification outcome
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verification_notes: text("verification_notes"),
  rejection_reason: text("rejection_reason"), // Specific reason if rejected
  
  // Expiry and renewal tracking
  expires_at: timestamp("expires_at", { withTimezone: true }),
  renewal_required: boolean("renewal_required").notNull().default(false),
  renewal_reminder_sent: boolean("renewal_reminder_sent").notNull().default(false),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for user verification lookups
  userTypeIdx: index("idx_user_verification_user_type").on(table.user_id, table.verification_type),
  userStatusIdx: index("idx_user_verification_user_status").on(table.user_id, table.verification_status),
  statusIdx: index("idx_user_verification_status").on(table.verification_status),
  verifierIdx: index("idx_user_verification_verifier").on(table.verifier_id),
  // Partial index for pending verifications only
  pendingIdx: index("idx_user_verification_pending").on(table.submitted_at).where(sql`verification_status = 'pending'`),
  // Index for expiry tracking
  expiryIdx: index("idx_user_verification_expiry").on(table.expires_at).where(sql`expires_at IS NOT NULL AND verification_status = 'verified'`),
}));

// ============================================================================
// USER ACTIVITY LOG - Track user actions for security and audit
// ============================================================================

export const user_activity_log = pgTable("user_activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Activity details
  activity_type: varchar("activity_type", { length: 100 }).notNull(), // "login", "logout", "create_comment", "update_profile", "vote"
  activity_category: varchar("activity_category", { length: 50 }).notNull(), // "authentication", "content", "social", "admin"
  activity_description: text("activity_description"),
  
  // Context information
  ip_address: varchar("ip_address", { length: 45 }), // Supports both IPv4 and IPv6
  user_agent: text("user_agent"),
  session_id: varchar("session_id", { length: 255 }),
  request_id: varchar("request_id", { length: 255 }), // For correlating with application logs
  
  // Target entities - polymorphic reference
  target_type: varchar("target_type", { length: 50 }),
  target_id: uuid("target_id"),
  
  // Geographic context for security analysis
  location_data: jsonb("location_data").default(sql`'{}'::jsonb`), // {country, city, coordinates}
  
  // Risk assessment
  risk_score: numeric("risk_score", { precision: 3, scale: 2 }),
  anomaly_detected: boolean("anomaly_detected").notNull().default(false),
  anomaly_type: varchar("anomaly_type", { length: 100 }), // "unusual_location", "high_frequency", "suspicious_pattern"
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for user activity timeline
  userCreatedIdx: index("idx_user_activity_log_user_created").on(table.user_id, table.created_at),
  // Separate indexes for filtering
  typeIdx: index("idx_user_activity_log_type").on(table.activity_type),
  categoryIdx: index("idx_user_activity_log_category").on(table.activity_category),
  ipIdx: index("idx_user_activity_log_ip").on(table.ip_address),
  sessionIdx: index("idx_user_activity_log_session").on(table.session_id),
  // Partial index for anomalies only
  anomalyIdx: index("idx_user_activity_log_anomaly").on(table.user_id, table.created_at).where(sql`anomaly_detected = true`),
  // Time-based partitioning would be beneficial here
  createdAtIdx: index("idx_user_activity_log_created_at").on(table.created_at),
}));

// ============================================================================
// SYSTEM AUDIT LOG - System-level audit trail
// ============================================================================

export const system_audit_log = pgTable("system_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Audit event classification
  event_type: varchar("event_type", { length: 100 }).notNull(),
  event_category: varchar("event_category", { length: 50 }).notNull(), // "security", "data", "admin", "system", "compliance"
  severity: severityEnum("severity").notNull().default("low"),
  
  // Actor information
  actor_type: varchar("actor_type", { length: 50 }).notNull(), // "user", "system", "admin", "service"
  actor_id: uuid("actor_id"),
  actor_role: varchar("actor_role", { length: 50 }),
  actor_identifier: varchar("actor_identifier", { length: 255 }), // Username or service name
  
  // Action details
  action: varchar("action", { length: 100 }).notNull(), // "create", "update", "delete", "access", "export"
  action_details: jsonb("action_details").default(sql`'{}'::jsonb`),
  
  // Target information - what was acted upon
  target_type: varchar("target_type", { length: 50 }),
  target_id: uuid("target_id"),
  target_description: text("target_description"),
  
  // Outcome and error handling
  success: boolean("success").notNull(),
  status_code: integer("status_code"), // HTTP status code or application code
  error_message: text("error_message"),
  error_stack: text("error_stack"), // For debugging failed operations
  
  // Context for troubleshooting
  source_ip: varchar("source_ip", { length: 45 }),
  user_agent: text("user_agent"),
  session_id: varchar("session_id", { length: 255 }),
  request_id: varchar("request_id", { length: 255 }),
  
  // Performance metadata
  processing_time_ms: integer("processing_time_ms"),
  resource_usage: jsonb("resource_usage").default(sql`'{}'::jsonb`), // {cpu, memory, db_queries}
  
  // Compliance and retention
  retention_period_days: integer("retention_period_days").default(2555), // Default 7 years for compliance
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite indexes for common query patterns
  categoryCreatedIdx: index("idx_system_audit_log_category_created").on(table.event_category, table.created_at),
  actorCreatedIdx: index("idx_system_audit_log_actor_created").on(table.actor_id, table.created_at),
  // Individual indexes
  eventTypeIdx: index("idx_system_audit_log_event_type").on(table.event_type),
  targetTypeIdIdx: index("idx_system_audit_log_target_type_id").on(table.target_type, table.target_id),
  // Partial index for failures only
  failureIdx: index("idx_system_audit_log_failure").on(table.created_at, table.event_category).where(sql`success = false`),
  severityIdx: index("idx_system_audit_log_severity").on(table.severity, table.created_at),
}));

// ============================================================================
// SECURITY EVENTS - Security-related incidents and monitoring
// ============================================================================

export const security_events = pgTable("security_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Event classification
  event_type: varchar("event_type", { length: 100 }).notNull(), // "failed_login", "permission_denied", "rate_limit_exceeded", "suspicious_activity", "data_breach_attempt"
  event_subtype: varchar("event_subtype", { length: 100 }), // More specific categorization
  severity: severityEnum("severity").notNull(),
  
  // Detection details
  detection_method: varchar("detection_method", { length: 100 }).notNull(), // "automated", "manual", "user_report", "ai_model"
  detection_rule: varchar("detection_rule", { length: 100 }),
  detection_confidence: numeric("detection_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Actor information
  actor_user_id: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actor_ip_address: varchar("actor_ip_address", { length: 45 }),
  actor_session_id: varchar("actor_session_id", { length: 255 }),
  actor_fingerprint: varchar("actor_fingerprint", { length: 255 }), // Device fingerprint
  
  // Event details
  event_description: text("event_description").notNull(),
  event_evidence: jsonb("event_evidence").default(sql`'{}'::jsonb`), // Structured evidence data
  attack_vector: varchar("attack_vector", { length: 100 }), // "brute_force", "sql_injection", "xss", etc.
  
  // Impact assessment
  affected_systems: varchar("affected_systems", { length: 100 }).array(),
  affected_users: integer("affected_users").default(0),
  data_compromised: boolean("data_compromised").notNull().default(false),
  data_types_affected: varchar("data_types_affected", { length: 100 }).array(),
  service_impact: varchar("service_impact", { length: 100 }), // "none", "degraded", "partial_outage", "full_outage"
  
  // Response tracking
  automated_response: jsonb("automated_response").default(sql`'{}'::jsonb`), // Actions taken automatically
  manual_response_required: boolean("manual_response_required").notNull().default(false),
  response_initiated_by: uuid("response_initiated_by").references(() => users.id, { onDelete: "set null" }),
  response_initiated_at: timestamp("response_initiated_at", { withTimezone: true }),
  
  // Incident management
  incident_id: varchar("incident_id", { length: 100 }), // Link to incident management system
  escalated: boolean("escalated").notNull().default(false),
  escalated_to: varchar("escalated_to", { length: 100 }), // Team or individual
  
  // Resolution
  resolution_status: varchar("resolution_status", { length: 50 }).notNull().default("open"), // "open", "investigating", "contained", "resolved", "false_positive"
  resolution_notes: text("resolution_notes"),
  lessons_learned: text("lessons_learned"),
  resolved_at: timestamp("resolved_at", { withTimezone: true }),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite indexes for security monitoring
  severityStatusIdx: index("idx_security_events_severity_status").on(table.severity, table.resolution_status),
  userCreatedIdx: index("idx_security_events_user_created").on(table.actor_user_id, table.created_at),
  ipTypeIdx: index("idx_security_events_ip_type").on(table.actor_ip_address, table.event_type),
  // Individual indexes
  typeIdx: index("idx_security_events_type").on(table.event_type),
  // Partial index for unresolved high-severity events
  criticalOpenIdx: index("idx_security_events_critical_open").on(table.created_at).where(sql`severity IN ('high', 'critical') AND resolution_status IN ('open', 'investigating')`),
  // Data breach tracking
  dataBreachIdx: index("idx_security_events_data_breach").on(table.created_at).where(sql`data_compromised = true`),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const contentReportsRelations = relations(content_reports, ({ one, many }) => ({
  reportedComment: one(comments, {
    fields: [content_reports.reported_comment_id],
    references: [comments.id],
  }),
  reportedUser: one(users, {
    fields: [content_reports.reported_user_id],
    references: [users.id],
  }),
  reporter: one(users, {
    fields: [content_reports.reporter_id],
    references: [users.id],
    relationName: "reporter",
  }),
  assignedModerator: one(users, {
    fields: [content_reports.assigned_moderator_id],
    references: [users.id],
    relationName: "moderator",
  }),
  moderationQueue: many(moderation_queue),
}));

export const moderationQueueRelations = relations(moderation_queue, ({ one }) => ({
  assignedModerator: one(users, {
    fields: [moderation_queue.assigned_moderator_id],
    references: [users.id],
  }),
  report: one(content_reports, {
    fields: [moderation_queue.report_id],
    references: [content_reports.id],
  }),
  qaReviewer: one(users, {
    fields: [moderation_queue.qa_reviewed_by],
    references: [users.id],
    relationName: "qaReviewer",
  }),
}));

export const expertProfilesRelations = relations(expert_profiles, ({ one }) => ({
  user: one(users, {
    fields: [expert_profiles.user_id],
    references: [users.id],
  }),
  verifiedBy: one(users, {
    fields: [expert_profiles.verified_by],
    references: [users.id],
    relationName: "verifier",
  }),
}));

export const userVerificationRelations = relations(user_verification, ({ one }) => ({
  user: one(users, {
    fields: [user_verification.user_id],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [user_verification.verifier_id],
    references: [users.id],
    relationName: "verifier",
  }),
}));

export const userActivityLogRelations = relations(user_activity_log, ({ one }) => ({
  user: one(users, {
    fields: [user_activity_log.user_id],
    references: [users.id],
  }),
}));

export const systemAuditLogRelations = relations(system_audit_log, ({ one }) => ({
  actor: one(users, {
    fields: [system_audit_log.actor_id],
    references: [users.id],
  }),
  target: one(users, {
    fields: [system_audit_log.target_id],
    references: [users.id],
    relationName: "target",
  }),
}));

export const securityEventsRelations = relations(security_events, ({ one }) => ({
  actorUser: one(users, {
    fields: [security_events.actor_user_id],
    references: [users.id],
  }),
  responseInitiatedBy: one(users, {
    fields: [security_events.response_initiated_by],
    references: [users.id],
    relationName: "responseInitiator",
  }),
}));


