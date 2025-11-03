// ============================================================================
// ADVOCACY COORDINATION SCHEMA
// ============================================================================
// Infrastructure for collective action and organized advocacy campaigns
// Optimized for performance, data integrity, and scalability

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, smallint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  campaignStatusEnum,
  actionTypeEnum,
  actionStatusEnum
} from "./enum";
import { bills, users } from "./foundation";

// ============================================================================
// CAMPAIGNS - Organized efforts around specific bills
// ============================================================================

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Campaign identification - slug is the primary lookup mechanism
  campaign_name: varchar("campaign_name", { length: 255 }).notNull(),
  campaign_slug: varchar("campaign_slug", { length: 100 }).unique().notNull(),
  
  // Target and focus - cascade behavior ensures data integrity when bill is deleted
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "cascade" }),
  target_offices: varchar("target_offices", { length: 255 }).array().default(sql`'{}'::varchar[]`),
  
  // Campaign description and messaging
  campaign_description: text("campaign_description").notNull(),
  campaign_goals: text("campaign_goals").array().default(sql`'{}'::text[]`),
  key_messages: jsonb("key_messages").default(sql`'{}'::jsonb`).$type<{
    primary_message?: string;
    talking_points?: string[];
    call_to_action?: string;
  }>(),
  
  // Campaign leadership - organizer is required, co-organizers are optional
  organizer_id: uuid("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  co_organizers: uuid("co_organizers").array().default(sql`'{}'::uuid[]`),
  
  // Campaign status and lifecycle
  status: campaignStatusEnum("status").notNull().default("draft"),
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
  
  // Geographic focus - empty arrays mean nationwide campaigns
  target_counties: kenyanCountyEnum("target_counties").array().default(sql`'{}'::text[]`),
  target_constituencies: varchar("target_constituencies", { length: 100 }).array().default(sql`'{}'::varchar[]`),
  
  // Campaign assets - all optional URLs
  campaign_logo_url: varchar("campaign_logo_url", { length: 500 }),
  campaign_website: varchar("campaign_website", { length: 255 }),
  social_media_hashtags: varchar("social_media_hashtags", { length: 100 }).array().default(sql`'{}'::varchar[]`),
  
  // Campaign metrics - automatically updated via triggers for consistency
  participant_count: integer("participant_count").notNull().default(0),
  action_completion_rate: numeric("action_completion_rate", { precision: 5, scale: 2 }).default('0'),
  total_actions_completed: integer("total_actions_completed").notNull().default(0),
  
  // Impact tracking - structured for queryability
  legislative_outcomes: jsonb("legislative_outcomes").default(sql`'[]'::jsonb`).$type<Array<{
    outcome_type: string;
    description: string;
    date: string;
    impact_level: 'low' | 'medium' | 'high';
  }>>(),
  media_mentions: integer("media_mentions").notNull().default(0),
  
  // Timeline - end_date is optional for ongoing campaigns
  start_date: date("start_date"),
  end_date: date("end_date"),
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Primary lookup index
  slugIdx: uniqueIndex("idx_campaigns_slug").on(table.campaign_slug),
  
  // Foreign key indexes for efficient joins
  organizerIdx: index("idx_campaigns_organizer").on(table.organizer_id),
  billIdx: index("idx_campaigns_bill").on(table.bill_id),
  
  // Filtering indexes
  statusIdx: index("idx_campaigns_status").on(table.status),
  visibilityIdx: index("idx_campaigns_visibility").on(table.visibility),
  
  // Array search indexes - GIN is essential for array containment queries
  targetCountiesIdx: index("idx_campaigns_target_counties").using("gin", table.target_counties),
  targetConstituenciesIdx: index("idx_campaigns_target_constituencies").using("gin", table.target_constituencies),
  
  // Date range queries for active campaigns
  dateRangeIdx: index("idx_campaigns_date_range").on(table.start_date, table.end_date),
  
  // Composite index for common query pattern: active campaigns by status
  statusStartDateIdx: index("idx_campaigns_status_start_date").on(table.status, table.start_date),
}));

// ============================================================================
// ACTION ITEMS - Concrete actions citizens can take
// ============================================================================

export const action_items = pgTable("action_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  
  // Action identification
  action_title: varchar("action_title", { length: 255 }).notNull(),
  action_description: text("action_description").notNull(),
  action_type: actionTypeEnum("action_type").notNull(),
  
  // Action instructions - structured for different action types
  detailed_instructions: text("detailed_instructions"),
  template_content: text("template_content"),
  target_contacts: jsonb("target_contacts").default(sql`'[]'::jsonb`).$type<Array<{
    name: string;
    role: string;
    email?: string;
    phone?: string;
    office?: string;
  }>>(),
  
  // Action requirements - using smallint for bounded values saves space
  estimated_time_minutes: smallint("estimated_time_minutes"),
  difficulty_level: varchar("difficulty_level", { length: 20 }).notNull().default("easy"),
  required_skills: varchar("required_skills", { length: 100 }).array().default(sql`'{}'::varchar[]`),
  
  // Geographic and demographic targeting
  target_counties: kenyanCountyEnum("target_counties").array().default(sql`'{}'::text[]`),
  target_demographics: jsonb("target_demographics").default(sql`'{}'::jsonb`).$type<{
    age_range?: string;
    profession?: string[];
    interests?: string[];
  }>(),
  
  // Action scheduling and prioritization
  due_date: date("due_date"),
  priority: smallint("priority").notNull().default(5),
  
  // Action lifecycle
  status: actionStatusEnum("status").notNull().default("active"),
  completion_requirements: jsonb("completion_requirements").default(sql`'{}'::jsonb`).$type<{
    requires_evidence?: boolean;
    requires_verification?: boolean;
    minimum_duration?: number;
    specific_steps?: string[];
  }>(),
  
  // Performance metrics - updated via database triggers
  assigned_count: integer("assigned_count").notNull().default(0),
  completion_count: integer("completion_count").notNull().default(0),
  completion_rate: numeric("completion_rate", { precision: 5, scale: 2 }).default('0'),
  
  // Social proof - motivates participation through peer examples
  success_stories: text("success_stories").array().default(sql`'{}'::text[]`),
  completion_testimonials: jsonb("completion_testimonials").default(sql`'[]'::jsonb`).$type<Array<{
    user_name?: string;
    testimonial: string;
    date: string;
    verified: boolean;
  }>>(),
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Foreign key index
  campaignIdx: index("idx_action_items_campaign").on(table.campaign_id),
  
  // Filtering and sorting indexes
  actionTypeIdx: index("idx_action_items_type").on(table.action_type),
  statusIdx: index("idx_action_items_status").on(table.status),
  
  // Array search index
  targetCountiesIdx: index("idx_action_items_target_counties").using("gin", table.target_counties),
  
  // Composite indexes for common query patterns
  campaignStatusIdx: index("idx_action_items_campaign_status").on(table.campaign_id, table.status),
  priorityDueDateIdx: index("idx_action_items_priority_due_date").on(table.priority, table.due_date),
  
  // Performance monitoring index
  completionRateIdx: index("idx_action_items_completion_rate").on(table.completion_rate),
}));

// ============================================================================
// CAMPAIGN PARTICIPANTS - Users participating in campaigns
// ============================================================================

export const campaign_participants = pgTable("campaign_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Participation metadata
  joined_at: timestamp("joined_at").notNull().defaultNow(),
  participation_role: varchar("participation_role", { length: 50 }).notNull().default("participant"),
  
  // Communication preferences - structured for notification routing
  notification_preferences: jsonb("notification_preferences").default(sql`'{}'::jsonb`).$type<{
    email_notifications?: boolean;
    sms_notifications?: boolean;
    push_notifications?: boolean;
    frequency?: 'immediate' | 'daily_digest' | 'weekly_digest';
    notification_types?: string[];
  }>(),
  
  // Activity tracking - automatically maintained
  actions_assigned: integer("actions_assigned").notNull().default(0),
  actions_completed: integer("actions_completed").notNull().default(0),
  personal_completion_rate: numeric("personal_completion_rate", { precision: 5, scale: 2 }).default('0'),
  
  // Engagement metrics - calculated for gamification and recognition
  last_activity_at: timestamp("last_activity_at"),
  engagement_score: numeric("engagement_score", { precision: 5, scale: 2 }).notNull().default(sql`0`),
  
  // Geographic context - enables localized action targeting
  user_county: kenyanCountyEnum("user_county"),
  user_constituency: varchar("user_constituency", { length: 100 }),
  
  // Skills and contributions - matches users to appropriate actions
  offered_skills: varchar("offered_skills", { length: 100 }).array().default(sql`'{}'::varchar[]`),
  contributions: jsonb("contributions").default(sql`'[]'::jsonb`).$type<Array<{
    contribution_type: string;
    description: string;
    date: string;
    recognized: boolean;
  }>>(),
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint ensures one participation record per user per campaign
  campaignUserUnique: uniqueIndex("campaign_participants_campaign_user_unique")
    .on(table.campaign_id, table.user_id),
  
  // Foreign key indexes
  campaignIdx: index("idx_campaign_participants_campaign").on(table.campaign_id),
  userIdx: index("idx_campaign_participants_user").on(table.user_id),
  
  // Role-based queries
  roleIdx: index("idx_campaign_participants_role").on(table.participation_role),
  
  // Engagement and activity tracking
  engagementIdx: index("idx_campaign_participants_engagement").on(table.engagement_score),
  lastActivityIdx: index("idx_campaign_participants_last_activity").on(table.last_activity_at),
  
  // Geographic targeting
  countyIdx: index("idx_campaign_participants_county").on(table.user_county),
  
  // Skills-based matching
  offeredSkillsIdx: index("idx_campaign_participants_offered_skills").using("gin", table.offered_skills),
  
  // Composite index for active participant queries
  campaignEngagementIdx: index("idx_campaign_participants_campaign_engagement")
    .on(table.campaign_id, table.engagement_score),
}));

// ============================================================================
// ACTION COMPLETIONS - Track completed actions
// ============================================================================

export const action_completions = pgTable("action_completions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action_item_id: uuid("action_item_id").notNull().references(() => action_items.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  
  // Completion details
  completed_at: timestamp("completed_at").notNull().defaultNow(),
  completion_method: varchar("completion_method", { length: 100 }).notNull(),
  
  // Evidence of completion - supports verification workflow
  completion_evidence: jsonb("completion_evidence").default(sql`'{}'::jsonb`).$type<{
    evidence_type?: 'screenshot' | 'recording' | 'document' | 'witness' | 'self_report';
    evidence_url?: string;
    evidence_description?: string;
    metadata?: Record<string, any>;
  }>(),
  completion_notes: text("completion_notes"),
  
  // Verification workflow - ensures quality and prevents fraud
  verified: boolean("verified").notNull().default(false),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verified_at: timestamp("verified_at"),
  verification_notes: text("verification_notes"),
  
  // Impact tracking - captures real-world outcomes
  reported_outcomes: jsonb("reported_outcomes").default(sql`'{}'::jsonb`).$type<{
    outcome_description?: string;
    mp_response?: string;
    commitment_received?: boolean;
    follow_up_scheduled?: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }>(),
  follow_up_required: boolean("follow_up_required").notNull().default(false),
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Foreign key indexes
  actionItemIdx: index("idx_action_completions_action_item").on(table.action_item_id),
  userIdx: index("idx_action_completions_user").on(table.user_id),
  campaignIdx: index("idx_action_completions_campaign").on(table.campaign_id),
  
  // Temporal analysis
  completedAtIdx: index("idx_action_completions_completed_at").on(table.completed_at),
  
  // Verification workflow queries
  verifiedIdx: index("idx_action_completions_verified").on(table.verified),
  verifiedByIdx: index("idx_action_completions_verified_by").on(table.verified_by),
  
  // Follow-up workflow
  followUpIdx: index("idx_action_completions_follow_up").on(table.follow_up_required),
  
  // Composite indexes for common analytical queries
  campaignCompletedAtIdx: index("idx_action_completions_campaign_completed_at")
    .on(table.campaign_id, table.completed_at),
  userCompletedAtIdx: index("idx_action_completions_user_completed_at")
    .on(table.user_id, table.completed_at),
  
  // Unique constraint prevents duplicate completions
  userActionUnique: uniqueIndex("action_completions_user_action_unique")
    .on(table.user_id, table.action_item_id),
}));

// ============================================================================
// CAMPAIGN IMPACT METRICS - Measure campaign effectiveness
// ============================================================================

export const campaign_impact_metrics = pgTable("campaign_impact_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  
  // Metric identification and value
  metric_type: varchar("metric_type", { length: 100 }).notNull(),
  metric_value: numeric("metric_value", { precision: 10, scale: 2 }).notNull(),
  metric_unit: varchar("metric_unit", { length: 50 }),
  
  // Attribution confidence - quantifies certainty of campaign impact
  attribution_confidence: varchar("attribution_confidence", { length: 20 }).notNull().default("medium"),
  attribution_evidence: text("attribution_evidence"),
  
  // Baseline comparison - enables before/after analysis
  measurement_date: date("measurement_date").notNull(),
  baseline_value: numeric("baseline_value", { precision: 10, scale: 2 }),
  
  // Data provenance - ensures transparency and reproducibility
  data_source: varchar("data_source", { length: 255 }),
  data_collection_method: varchar("data_collection_method", { length: 100 }),
  
  // Additional context for interpretation
  notes: text("notes"),
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Foreign key index
  campaignIdx: index("idx_campaign_impact_metrics_campaign").on(table.campaign_id),
  
  // Metric type analysis
  metricTypeIdx: index("idx_campaign_impact_metrics_type").on(table.metric_type),
  
  // Temporal analysis
  measurementDateIdx: index("idx_campaign_impact_metrics_measurement_date").on(table.measurement_date),
  
  // Composite indexes for time-series queries
  campaignDateIdx: index("idx_campaign_impact_metrics_campaign_date")
    .on(table.campaign_id, table.measurement_date),
  typeValueIdx: index("idx_campaign_impact_metrics_type_value")
    .on(table.metric_type, table.metric_value),
}));

// ============================================================================
// RELATIONSHIPS - Define traversal paths between entities
// ============================================================================

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  // Ownership relationship
  organizer: one(users, {
    fields: [campaigns.organizer_id],
    references: [users.id],
    relationName: "organized_campaigns",
  }),
  
  // Target relationship
  bill: one(bills, {
    fields: [campaigns.bill_id],
    references: [bills.id],
  }),
  
  // Collection relationships
  actionItems: many(action_items),
  participants: many(campaign_participants),
  impactMetrics: many(campaign_impact_metrics),
  completions: many(action_completions),
}));

export const actionItemsRelations = relations(action_items, ({ one, many }) => ({
  // Parent relationship
  campaign: one(campaigns, {
    fields: [action_items.campaign_id],
    references: [campaigns.id],
  }),
  
  // Collection relationship
  completions: many(action_completions),
}));

export const campaignParticipantsRelations = relations(campaign_participants, ({ one, many }) => ({
  // Parent relationships
  campaign: one(campaigns, {
    fields: [campaign_participants.campaign_id],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaign_participants.user_id],
    references: [users.id],
  }),
  
  // Activity relationship
  completions: many(action_completions),
}));

export const actionCompletionsRelations = relations(action_completions, ({ one }) => ({
  // Parent relationships
  actionItem: one(action_items, {
    fields: [action_completions.action_item_id],
    references: [action_items.id],
  }),
  user: one(users, {
    fields: [action_completions.user_id],
    references: [users.id],
    relationName: "user_completions",
  }),
  campaign: one(campaigns, {
    fields: [action_completions.campaign_id],
    references: [campaigns.id],
  }),
  
  // Verification relationship
  verifiedBy: one(users, {
    fields: [action_completions.verified_by],
    references: [users.id],
    relationName: "verified_completions",
  }),
}));

export const campaignImpactMetricsRelations = relations(campaign_impact_metrics, ({ one }) => ({
  // Parent relationship
  campaign: one(campaigns, {
    fields: [campaign_impact_metrics.campaign_id],
    references: [campaigns.id],
  }),
}));