/**
 * SAFEGUARDS SCHEMA REFINEMENT IMPLEMENTATION
 * Essential additions for complete safeguard ecosystem
 * These should be added to shared/schema/safeguards.ts
 */

// ============================================================================
// HIGH-PRIORITY ADDITIONS
// ============================================================================

// 1. SAFEGUARD CONFIG AUDIT TRAIL
//    Purpose: Track all changes to safeguard configurations for compliance
//    Replaces: Manual logging, audit logs in external systems
//    Impacts: Regulatory compliance, accountability

export const safeguardConfigAudit = pgTable('safeguard_config_audit', {
  id: primaryKeyUuid(),
  
  // What was changed
  config_type: varchar('config_type', { length: 100 }).notNull(), // 'rate_limit', 'moderation_policy', 'emergency_mode'
  config_entity_id: uuid('config_entity_id'), // FK to rate_limit_config, etc.
  config_name: varchar('config_name', { length: 255 }).notNull(), // Human-readable name
  
  // Who changed it
  changed_by: uuid('changed_by').references(() => users.id).notNull(),
  change_timestamp: timestamp('change_timestamp', { withTimezone: true }).notNull().defaultNow(),
  
  // What changed
  change_description: text('change_description').notNull(), // "Updated login_attempt limit from 10 to 5"
  old_values: jsonb('old_values'), // Before snapshot
  new_values: jsonb('new_values'), // After snapshot
  reason_for_change: text('reason_for_change').notNull(), // Why was this changed?
  
  // Approval
  requires_approval: boolean('requires_approval').default(false),
  approved_by: uuid('approved_by').references(() => users.id),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  
  // Status
  is_applied: boolean('is_applied').default(true),
  applied_at: timestamp('applied_at', { withTimezone: true }).defaultNow(),
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  typeIdx: index('idx_safeguard_audit_type')
    .on(table.config_type, table.change_timestamp),
  userIdx: index('idx_safeguard_audit_user')
    .on(table.changed_by, table.change_timestamp),
  unapprovedIdx: index('idx_safeguard_audit_unapproved')
    .on(table.requires_approval, table.approved_by)
    .where('requires_approval = true AND approved_by IS NULL'),
}));

// ============================================================================

// 2. EMERGENCY SAFEGUARD MODE
//    Purpose: Activate enhanced protections during crises
//    Replaces: Manual intervention, ad-hoc rate limit changes
//    Impacts: Crisis response, user messaging, system load

export const emergencySafeguardMode = pgTable('emergency_safeguard_mode', {
  id: primaryKeyUuid(),
  
  // Identification
  mode_name: varchar('mode_name', { length: 100 }).notNull(), // "Misinformation Surge - Election Day"
  mode_level: varchar('mode_level', { length: 20 }).notNull(), // 'yellow', 'orange', 'red'
  is_active: boolean('is_active').default(false).notNull(),
  
  // Lifecycle
  activated_at: timestamp('activated_at', { withTimezone: true }).defaultNow(),
  deactivated_at: timestamp('deactivated_at', { withTimezone: true }),
  scheduled_deactivation: timestamp('scheduled_deactivation', { withTimezone: true }), // Auto-disable
  
  // Context
  reason: text('reason').notNull(), // "Coordinated misinformation campaign detected"
  triggered_by: uuid('triggered_by').references(() => users.id).notNull(),
  
  // Global adjustments (multiplicative)
  global_rate_limit_multiplier: decimal('global_rate_limit_multiplier', { precision: 2, scale: 2 }).default('0.5'), // 50% of normal
  moderation_priority_boost: integer('moderation_priority_boost').default(1), // +1 to all priorities
  
  // Automatic actions
  auto_flag_all_content: boolean('auto_flag_all_content').default(false),
  require_manual_approval_for_new_accounts: boolean('require_manual_approval_for_new_accounts').default(false),
  lock_new_account_creation: boolean('lock_new_account_creation').default(false),
  pause_reputation_gains: boolean('pause_reputation_gains').default(false),
  
  // Scope
  affected_bill_ids: jsonb('affected_bill_ids').default('[]'), // Specific bills under attack
  affected_topics: jsonb('affected_topics').default('[]'), // Keywords: 'election', 'healthcare'
  affected_regions: jsonb('affected_regions').default('[]'), // Counties affected
  
  // Communication
  public_announcement: text('public_announcement'), // What to tell users
  internal_briefing: text('internal_briefing'), // What to tell staff
  is_publicly_disclosed: boolean('is_publicly_disclosed').default(true),
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  activeIdx: index('idx_emergency_mode_active')
    .on(table.is_active)
    .where('is_active = true'),
  levelIdx: index('idx_emergency_mode_level')
    .on(table.mode_level, table.activated_at),
}));

// ============================================================================

// 3. RATE LIMIT WHITELIST & BLACKLIST
//    Purpose: Granular control over rate limiting exceptions
//    Replaces: Manual code changes, hardcoded exemptions
//    Impacts: Critical user access, bot prevention

export const rateLimitWhitelist = pgTable('rate_limit_whitelist', {
  id: primaryKeyUuid(),
  
  // What's whitelisted
  whitelist_type: varchar('whitelist_type', { length: 30 }).notNull(), // 'user', 'ip', 'device_fingerprint'
  whitelist_value: varchar('whitelist_value', { length: 255 }).notNull(), // UUID, IP address, or fingerprint hash
  
  // Why whitelisted
  reason: text('reason').notNull(), // "News agency bulk API access"
  whitelisted_by: uuid('whitelisted_by').references(() => users.id).notNull(),
  
  // Scope
  applies_to_actions: jsonb('applies_to_actions').default('[]'), // ['api_call', 'search_query'] or [] = all
  
  // Validity
  is_active: boolean('is_active').default(true).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }), // Automatic expiry
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  typeValueIdx: uniqueIndex('unique_whitelist_entry')
    .on(table.whitelist_type, table.whitelist_value),
  activeIdx: index('idx_whitelist_active')
    .on(table.is_active, table.expires_at),
}));

export const rateLimitBlacklist = pgTable('rate_limit_blacklist', {
  id: primaryKeyUuid(),
  
  // What's blacklisted
  blacklist_type: varchar('blacklist_type', { length: 30 }).notNull(), // 'user', 'ip', 'device_fingerprint'
  blacklist_value: varchar('blacklist_value', { length: 255 }).notNull(),
  
  // Why blacklisted
  reason: text('reason').notNull(), // "Detected bot farm from ASN 12345"
  severity: varchar('severity', { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  blacklisted_by: uuid('blacklisted_by').references(() => users.id).notNull(),
  
  // Consequences
  action_taken: varchar('action_taken', { length: 100 }), // 'instant_block', 'rate_limit_0', 'quarantine'
  
  // Validity
  is_active: boolean('is_active').default(true).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  
  // Intelligence
  threat_source: varchar('threat_source', { length: 100 }), // "ClickFraud Network 2024"
  cross_reference: jsonb('cross_reference').default('{}'), // Links to CIB detections, etc.
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  typeValueIdx: uniqueIndex('unique_blacklist_entry')
    .on(table.blacklist_type, table.blacklist_value),
  severityIdx: index('idx_blacklist_severity')
    .on(table.severity, table.is_active),
  activeIdx: index('idx_blacklist_active')
    .on(table.is_active, table.expires_at),
}));

// ============================================================================

// 4. MODERATION PRIORITY RULES ENGINE
//    Purpose: Automatic prioritization based on content severity
//    Replaces: Manual queue assignment, ad-hoc escalation
//    Impacts: Moderation SLA, harmful content dwell time

export const moderationPriorityRules = pgTable('moderation_priority_rules', {
  id: primaryKeyUuid(),
  
  // Rule identification
  rule_name: varchar('rule_name', { length: 100 }).notNull(), // "Tribal slur instant escalation"
  rule_description: text('rule_description'),
  
  // Trigger condition
  trigger_flag_reason: flagReasonEnum('trigger_flag_reason').notNull(),
  
  // Priority assignment
  priority_level: integer('priority_level').notNull(), // 1 (critical) to 5 (low)
  sla_hours: integer('sla_hours').notNull(), // Hours to resolve
  
  // Automatic actions
  auto_quarantine_content: boolean('auto_quarantine_content').default(false), // Hide from feed during review
  auto_shadow_ban_author: boolean('auto_shadow_ban_author').default(false), // Hide user's content temporarily
  require_board_review: boolean('require_board_review').default(false), // Must escalate to Ethics Board
  auto_suspend_if_repeat: integer('auto_suspend_if_repeat'), // Suspend after N violations
  auto_ban_threshold: integer('auto_ban_threshold'), // Permanent ban after N violations
  
  // Notification
  notify_local_moderators: boolean('notify_local_moderators').default(true),
  notify_regional_coordinator: boolean('notify_regional_coordinator').default(false),
  notify_national_coordinator: boolean('notify_national_coordinator').default(false),
  
  // Status
  is_active: boolean('is_active').default(true).notNull(),
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  reasonIdx: uniqueIndex('unique_priority_rule')
    .on(table.trigger_flag_reason, table.priority_level),
  activeIdx: index('idx_priority_rules_active')
    .on(table.is_active),
}));

// ============================================================================

// 5. APPEAL REVIEW BOARD ASSIGNMENTS
//    Purpose: Track appeal escalation to oversight board
//    Replaces: Spreadsheets, manual tracking
//    Impacts: Appeal transparency, oversight accountability

export const appealReviewBoard = pgTable('appeal_review_board', {
  id: primaryKeyUuid(),
  
  // Reference
  appeal_id: uuid('appeal_id').references(() => moderationAppeals.id, { onDelete: 'cascade' }).notNull(),
  
  // Board member
  board_member_id: uuid('board_member_id').references(() => users.id).notNull(),
  
  // Timeline
  assignment_date: timestamp('assignment_date', { withTimezone: true }).notNull().defaultNow(),
  assignment_reason: text('assignment_reason'), // "Escalated: High profile case"
  review_deadline: timestamp('review_deadline', { withTimezone: true }).notNull(),
  
  // Review
  review_started_at: timestamp('review_started_at', { withTimezone: true }),
  review_completed_at: timestamp('review_completed_at', { withTimezone: true }),
  
  // Decision
  board_decision: moderationActionEnum('board_decision'),
  decision_reason: text('decision_reason').notNull(),
  additional_evidence_required: boolean('additional_evidence_required').default(false),
  
  // Impact
  original_decision_overturned: boolean('original_decision_overturned').default(false),
  
  // Transparency
  is_public_disclosure: boolean('is_public_disclosure').default(true),
  public_statement: text('public_statement'), // Why board made this decision
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  appealIdx: index('idx_appeal_board_appeal')
    .on(table.appeal_id),
  memberIdx: index('idx_appeal_board_member')
    .on(table.board_member_id, table.assignment_date),
  deadlineIdx: index('idx_appeal_board_deadline')
    .on(table.review_deadline)
    .where('review_completed_at IS NULL'),
  decisionIdx: index('idx_appeal_board_decision')
    .on(table.board_decision, table.review_completed_at),
}));

// ============================================================================

// 6. SAFEGUARD SYSTEM METRICS
//    Purpose: Track effectiveness of safeguard system
//    Replaces: Manual reporting, external dashboards
//    Impacts: Policy decisions, feature prioritization

export const safeguardMetrics = pgTable('safeguard_metrics', {
  id: primaryKeyUuid(),
  
  // Period
  metric_date: timestamp('metric_date', { withTimezone: true }).notNull(),
  metric_period: varchar('metric_period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  
  // Content Moderation Metrics
  total_flags_received: integer('total_flags_received').default(0),
  flags_acted_upon: integer('flags_acted_upon').default(0),
  false_positive_rate: decimal('false_positive_rate', { precision: 5, scale: 2 }), // Percentage
  average_review_time_hours: decimal('average_review_time_hours', { precision: 8, scale: 2 }),
  sla_violation_count: integer('sla_violation_count').default(0),
  sla_violation_rate: decimal('sla_violation_rate', { precision: 5, scale: 2 }),
  
  // Appeal Metrics
  total_appeals_filed: integer('total_appeals_filed').default(0),
  appeals_resolved: integer('appeals_resolved').default(0),
  appeal_overturn_rate: decimal('appeal_overturn_rate', { precision: 5, scale: 2 }),
  average_appeal_resolution_days: decimal('average_appeal_resolution_days', { precision: 8, scale: 2 }),
  
  // Rate Limiting Metrics
  rate_limit_violations: integer('rate_limit_violations').default(0),
  accounts_temporarily_blocked: integer('accounts_temporarily_blocked').default(0),
  false_positive_blocks: integer('false_positive_blocks').default(0),
  legitimate_blocks_percentage: decimal('legitimate_blocks_percentage', { precision: 5, scale: 2 }),
  
  // CIB Detection Metrics
  cib_patterns_detected: integer('cib_patterns_detected').default(0),
  cib_patterns_confirmed: integer('cib_patterns_confirmed').default(0),
  cib_false_positives: integer('cib_false_positives').default(0),
  accounts_suspended_for_cib: integer('accounts_suspended_for_cib').default(0),
  content_removed_for_cib: integer('content_removed_for_cib').default(0),
  
  // Reputation System Metrics
  average_reputation_decay: decimal('average_reputation_decay', { precision: 8, scale: 2 }),
  users_below_minimum_threshold: integer('users_below_minimum_threshold').default(0),
  reputation_appeals_filed: integer('reputation_appeals_filed').default(0),
  
  // Identity Verification Metrics
  new_verifications_completed: integer('new_verifications_completed').default(0),
  verification_success_rate: decimal('verification_success_rate', { precision: 5, scale: 2 }),
  iprs_failures: integer('iprs_failures').default(0),
  
  // Public Transparency
  is_public: boolean('is_public').default(true),
  
  ...auditFields(),
  metadata: metadataField(),
}, (table) => ({
  dateIdx: index('idx_metrics_date')
    .on(table.metric_date, table.metric_period),
  periodIdx: index('idx_metrics_period')
    .on(table.metric_period),
  publicIdx: index('idx_metrics_public')
    .on(table.is_public, table.metric_date)
    .where('is_public = true'),
}));

// ============================================================================
// RELATIONS FOR NEW TABLES
// ============================================================================

export const safeguardConfigAuditRelations = relations(safeguardConfigAudit, ({ one }) => ({
  changedByUser: one(users, {
    fields: [safeguardConfigAudit.changed_by],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [safeguardConfigAudit.approved_by],
    references: [users.id],
  }),
}));

export const emergencySafeguardModeRelations = relations(emergencySafeguardMode, ({ one }) => ({
  triggeredByUser: one(users, {
    fields: [emergencySafeguardMode.triggered_by],
    references: [users.id],
  }),
}));

export const rateLimitWhitelistRelations = relations(rateLimitWhitelist, ({ one }) => ({
  whitelistedByUser: one(users, {
    fields: [rateLimitWhitelist.whitelisted_by],
    references: [users.id],
  }),
}));

export const rateLimitBlacklistRelations = relations(rateLimitBlacklist, ({ one }) => ({
  blacklistedByUser: one(users, {
    fields: [rateLimitBlacklist.blacklisted_by],
    references: [users.id],
  }),
}));

export const appealReviewBoardRelations = relations(appealReviewBoard, ({ one }) => ({
  appeal: one(moderationAppeals, {
    fields: [appealReviewBoard.appeal_id],
    references: [moderationAppeals.id],
  }),
  boardMember: one(users, {
    fields: [appealReviewBoard.board_member_id],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SafeguardConfigAudit = typeof safeguardConfigAudit.$inferSelect;
export type NewSafeguardConfigAudit = typeof safeguardConfigAudit.$inferInsert;

export type EmergencySafeguardMode = typeof emergencySafeguardMode.$inferSelect;
export type NewEmergencySafeguardMode = typeof emergencySafeguardMode.$inferInsert;

export type RateLimitWhitelist = typeof rateLimitWhitelist.$inferSelect;
export type NewRateLimitWhitelist = typeof rateLimitWhitelist.$inferInsert;

export type RateLimitBlacklist = typeof rateLimitBlacklist.$inferSelect;
export type NewRateLimitBlacklist = typeof rateLimitBlacklist.$inferInsert;

export type ModerationPriorityRule = typeof moderationPriorityRules.$inferSelect;
export type NewModerationPriorityRule = typeof moderationPriorityRules.$inferInsert;

export type AppealReviewBoard = typeof appealReviewBoard.$inferSelect;
export type NewAppealReviewBoard = typeof appealReviewBoard.$inferInsert;

export type SafeguardMetrics = typeof safeguardMetrics.$inferSelect;
export type NewSafeguardMetrics = typeof safeguardMetrics.$inferInsert;
