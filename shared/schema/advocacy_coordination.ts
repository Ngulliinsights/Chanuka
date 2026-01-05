// ============================================================================
// ADVOCACY COORDINATION SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Campaign management, collective action, and civil society coordination
// This schema transforms individual engagement into organized advocacy

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check
} from "drizzle-orm/pg-core";

import { kenyanCountyEnum } from "./enum";
import { bills, users } from "./foundation";

// ============================================================================
// CAMPAIGNS - Organized advocacy efforts around bills
// ============================================================================

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Campaign identification
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description").notNull(),

  // Campaign targets
  target_bills: uuid("target_bills").array(),
  primary_bill_id: uuid("primary_bill_id").references(() => bills.id, { onDelete: "set null" }),

  // Campaign goals and messaging
  campaign_goal: text("campaign_goal").notNull(),
  key_messages: varchar("key_messages", { length: 300 }).array(),
  call_to_action: text("call_to_action").notNull(),

  // Campaign organizers
  created_by_id: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organization_name: varchar("organization_name", { length: 300 }),
  organization_type: varchar("organization_type", { length: 50 }), // "ngo", "cbo", "professional_body", "grassroots"

  // Campaign status and timeline
  status: varchar("status", { length: 30 }).notNull().default("draft"), // "draft", "active", "paused", "completed", "cancelled"
  launch_date: date("launch_date"),
  target_end_date: date("target_end_date"),
  actual_end_date: date("actual_end_date"),

  // Geographic scope
  geographic_scope: varchar("geographic_scope", { length: 30 }).notNull(), // "national", "regional", "county", "constituency"
  target_counties: kenyanCountyEnum("target_counties").array(),
  target_constituencies: varchar("target_constituencies", { length: 100 }).array(),

  // Campaign metrics
  participant_count: integer("participant_count").notNull().default(0),
  target_participant_count: integer("target_participant_count"),
  actions_completed: integer("actions_completed").notNull().default(0),

  // Campaign resources
  budget: numeric("budget", { precision: 12, scale: 2 }),
  funding_sources: jsonb("funding_sources").notNull().default(sql`'{}'::jsonb`),

  // Visibility and moderation
  is_public: boolean("is_public").notNull().default(true),
  requires_approval: boolean("requires_approval").notNull().default(false),
  moderation_status: varchar("moderation_status", { length: 30 }).notNull().default("approved"), // "pending", "approved", "rejected"

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Campaign discovery
  statusPublicIdx: index("idx_campaigns_status_public")
    .on(table.status, table.is_public, table.launch_date)
    .where(sql`${table.is_public} = true`),

  // Bill campaigns
  primaryBillIdx: index("idx_campaigns_primary_bill")
    .on(table.primary_bill_id, table.status)
    .where(sql`${table.primary_bill_id} IS NOT NULL`),

  // Geographic campaigns
  targetCountiesIdx: index("idx_campaigns_target_counties")
    .using("gin", table.target_counties),

  // Organization campaigns
  organizationIdx: index("idx_campaigns_organization")
    .on(table.organization_name, table.status)
    .where(sql`${table.organization_name} IS NOT NULL`),

  // Campaign timeline validation
  dateRangeCheck: check("campaigns_date_range_check",
    sql`${table.target_end_date} IS NULL OR ${table.launch_date} IS NULL OR ${table.target_end_date} >= ${table.launch_date}`),
}));

// ============================================================================
// ACTION ITEMS - Specific actions participants can take
// ============================================================================

export const action_items = pgTable("action_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),

  // Action identification
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  action_type: varchar("action_type", { length: 50 }).notNull(), // "email_mp", "phone_call", "petition_sign", "social_share", "attend_event"

  // Action difficulty and impact
  difficulty_level: varchar("difficulty_level", { length: 20 }).notNull(), // "easy", "moderate", "advanced"
  estimated_time_minutes: smallint("estimated_time_minutes"),
  impact_score: smallint("impact_score").notNull().default(1), // 1-10 scale

  // Action configuration
  action_config: jsonb("action_config").$type<{
    target_contacts?: Array<{
      name: string;
      role: string;
      email?: string;
      phone?: string;
      office?: string;
    }>;
    email_template?: {
      subject: string;
      body: string;
      script_template?: string;
      talking_points?: string[];
      contact_method?: string;
    };
    social_media?: {
      platforms: string[];
      suggested_text: string;
      hashtags: string[];
      image_url?: string;
    };
    petition?: {
      petition_url: string;
      target_signatures: number;
    };
    event?: {
      event_type: string;
      location_guidance: string;
      materials_needed: string[];
    };
  }>().notNull().default(sql`'{}'::jsonb`),

  // Action status
  is_active: boolean("is_active").notNull().default(true),
  completion_count: integer("completion_count").notNull().default(0),
  target_completions: integer("target_completions"),

  // Action ordering and prerequisites
  display_order: smallint("display_order").notNull().default(1),
  prerequisite_actions: uuid("prerequisite_actions").array(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Campaign actions
  campaignActiveOrderIdx: index("idx_action_items_campaign_active_order")
    .on(table.campaign_id, table.is_active, table.display_order)
    .where(sql`${table.is_active} = true`),

  // Action type queries
  typeActiveIdx: index("idx_action_items_type_active")
    .on(table.action_type, table.is_active, table.completion_count),

  // Difficulty and impact filtering
  difficultyImpactIdx: index("idx_action_items_difficulty_impact")
    .on(table.difficulty_level, table.impact_score),
}));

// ============================================================================
// CAMPAIGN PARTICIPANTS - Users who joined campaigns
// ============================================================================

export const campaign_participants = pgTable("campaign_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Participation details
  joined_date: date("joined_date").notNull().default(sql`CURRENT_DATE`),
  participation_level: varchar("participation_level", { length: 30 }).notNull().default("supporter"), // "supporter", "active", "organizer", "leader"

  // Participant preferences
  notification_preferences: jsonb("notification_preferences").$type<{
    email_updates: boolean;
    sms_updates: boolean;
    action_reminders: boolean;
    milestone_alerts: boolean;
  }>().notNull().default(sql`'{}'::jsonb`),

  // Participant activity
  actions_completed: integer("actions_completed").notNull().default(0),
  last_action_date: date("last_action_date"),

  // Participant contribution
  volunteer_skills: varchar("volunteer_skills", { length: 100 }).array(),
  availability: jsonb("availability").notNull().default(sql`'{}'::jsonb`),

  // Geographic context
  participant_county: kenyanCountyEnum("participant_county"),
  participant_constituency: varchar("participant_constituency", { length: 100 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One participation per user per campaign
  campaignUserUnique: unique("campaign_participants_campaign_user_unique")
    .on(table.campaign_id, table.user_id),

  // Campaign participant queries
  campaignLevelIdx: index("idx_campaign_participants_campaign_level")
    .on(table.campaign_id, table.participation_level, table.joined_date),

  // User campaign activity
  userActivityIdx: index("idx_campaign_participants_user_activity")
    .on(table.user_id, table.last_action_date, table.actions_completed),

  // Geographic participation analysis
  countyParticipationIdx: index("idx_campaign_participants_county_participation")
    .on(table.participant_county, table.campaign_id)
    .where(sql`${table.participant_county} IS NOT NULL`),
}));

// ============================================================================
// ACTION COMPLETIONS - Track individual action completions
// ============================================================================

export const action_completions = pgTable("action_completions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action_item_id: uuid("action_item_id").notNull().references(() => action_items.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),

  // Completion details
  completed_date: date("completed_date").notNull().default(sql`CURRENT_DATE`),
  completion_method: varchar("completion_method", { length: 50 }), // "platform", "external", "offline", "verified"

  // Completion evidence
  completion_notes: text("completion_notes"),
  evidence_url: varchar("evidence_url", { length: 500 }),
  verification_status: varchar("verification_status", { length: 30 }).notNull().default("self_reported"), // "self_reported", "verified", "disputed"

  // Impact tracking
  target_contacted: varchar("target_contacted", { length: 200 }),
  response_received: boolean("response_received").notNull().default(false),
  response_content: text("response_content"),

  // Completion metadata
  completion_data: jsonb("completion_data").notNull().default(sql`'{}'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One completion per user per action
  actionUserUnique: unique("action_completions_action_user_unique")
    .on(table.action_item_id, table.user_id),

  // Campaign completion tracking
  campaignCompletionIdx: index("idx_action_completions_campaign_completion")
    .on(table.campaign_id, table.completed_date, table.verification_status),

  // User action history
  userActionHistoryIdx: index("idx_action_completions_user_action_history")
    .on(table.user_id, table.completed_date),

  // Response tracking
  responseReceivedIdx: index("idx_action_completions_response_received")
    .on(table.response_received, table.completed_date)
    .where(sql`${table.response_received} = true`),
}));

// ============================================================================
// CAMPAIGN IMPACT METRICS - Measure campaign effectiveness
// ============================================================================

export const campaign_impact_metrics = pgTable("campaign_impact_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),

  // Metric identification
  metric_date: date("metric_date").notNull().default(sql`CURRENT_DATE`),
  metric_type: varchar("metric_type", { length: 50 }).notNull(), // "participation", "engagement", "reach", "outcome"

  // Participation metrics
  total_participants: integer("total_participants").notNull().default(0),
  new_participants_today: integer("new_participants_today").notNull().default(0),
  active_participants: integer("active_participants").notNull().default(0),

  // Engagement metrics
  actions_completed_today: integer("actions_completed_today").notNull().default(0),
  total_actions_completed: integer("total_actions_completed").notNull().default(0),
  average_actions_per_participant: numeric("average_actions_per_participant", { precision: 5, scale: 2 }),

  // Reach metrics
  social_media_shares: integer("social_media_shares").notNull().default(0),
  email_opens: integer("email_opens").notNull().default(0),
  website_visits: integer("website_visits").notNull().default(0),

  // Outcome metrics
  legislative_responses: integer("legislative_responses").notNull().default(0),
  media_mentions: integer("media_mentions").notNull().default(0),
  policy_changes: integer("policy_changes").notNull().default(0),

  // Geographic distribution
  county_participation: jsonb("county_participation").notNull().default(sql`'{}'::jsonb`),

  // Detailed metrics
  detailed_metrics: jsonb("detailed_metrics").notNull().default(sql`'{}'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One metric record per campaign per date per type
  campaignDateTypeUnique: unique("campaign_impact_metrics_campaign_date_type_unique")
    .on(table.campaign_id, table.metric_date, table.metric_type),

  // Time series analysis
  campaignMetricTimeIdx: index("idx_campaign_impact_metrics_campaign_metric_time")
    .on(table.campaign_id, table.metric_type, table.metric_date),

  // Cross-campaign analysis
  typeMetricIdx: index("idx_campaign_impact_metrics_type_metric")
    .on(table.metric_type, table.metric_date),
}));

// ============================================================================
// COALITION RELATIONSHIPS - Track partnerships between organizations
// ============================================================================

export const coalition_relationships = pgTable("coalition_relationships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Coalition participants
  primary_campaign_id: uuid("primary_campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  partner_campaign_id: uuid("partner_campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),

  // Relationship details
  relationship_type: varchar("relationship_type", { length: 50 }).notNull(), // "coalition", "endorsement", "coordination", "opposition"
  relationship_strength: varchar("relationship_strength", { length: 20 }), // "weak", "moderate", "strong"

  // Collaboration details
  collaboration_areas: varchar("collaboration_areas", { length: 100 }).array(),
  shared_resources: jsonb("shared_resources").notNull().default(sql`'{}'::jsonb`),
  joint_actions: uuid("joint_actions").array(),

  // Relationship status
  status: varchar("status", { length: 30 }).notNull().default("active"), // "proposed", "active", "paused", "ended"
  established_date: date("established_date").notNull().default(sql`CURRENT_DATE`),
  end_date: date("end_date"),

  // Relationship outcomes
  collaboration_notes: text("collaboration_notes"),
  success_metrics: jsonb("success_metrics").notNull().default(sql`'{}'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate relationships
  primaryPartnerUnique: unique("coalition_relationships_primary_partner_unique")
    .on(table.primary_campaign_id, table.partner_campaign_id),

  // Coalition network analysis
  primaryTypeIdx: index("idx_coalition_relationships_primary_type")
    .on(table.primary_campaign_id, table.relationship_type, table.status),

  // Partner network analysis
  partnerTypeIdx: index("idx_coalition_relationships_partner_type")
    .on(table.partner_campaign_id, table.relationship_type, table.status),

  // Prevent self-relationships
  selfRelationshipCheck: check("coalition_relationships_self_relationship_check",
    sql`${table.primary_campaign_id} != ${table.partner_campaign_id}`),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  primaryBill: one(bills, {
    fields: [campaigns.primary_bill_id],
    references: [bills.id],
  }),
  createdBy: one(users, {
    fields: [campaigns.created_by_id],
    references: [users.id],
  }),
  actionItems: many(action_items),
  participants: many(campaign_participants),
  completions: many(action_completions),
  impactMetrics: many(campaign_impact_metrics),
  primaryCoalitions: many(coalition_relationships, { relationName: "primary" }),
  partnerCoalitions: many(coalition_relationships, { relationName: "partner" }),
}));

export const actionItemsRelations = relations(action_items, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [action_items.campaign_id],
    references: [campaigns.id],
  }),
  completions: many(action_completions),
}));

export const campaignParticipantsRelations = relations(campaign_participants, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaign_participants.campaign_id],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaign_participants.user_id],
    references: [users.id],
  }),
}));

export const actionCompletionsRelations = relations(action_completions, ({ one }) => ({
  actionItem: one(action_items, {
    fields: [action_completions.action_item_id],
    references: [action_items.id],
  }),
  user: one(users, {
    fields: [action_completions.user_id],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [action_completions.campaign_id],
    references: [campaigns.id],
  }),
}));

export const campaignImpactMetricsRelations = relations(campaign_impact_metrics, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaign_impact_metrics.campaign_id],
    references: [campaigns.id],
  }),
}));

export const coalitionRelationshipsRelations = relations(coalition_relationships, ({ one }) => ({
  primaryCampaign: one(campaigns, {
    fields: [coalition_relationships.primary_campaign_id],
    references: [campaigns.id],
    relationName: "primary",
  }),
  partnerCampaign: one(campaigns, {
    fields: [coalition_relationships.partner_campaign_id],
    references: [campaigns.id],
    relationName: "partner",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type ActionItem = typeof action_items.$inferSelect;
export type NewActionItem = typeof action_items.$inferInsert;

export type CampaignParticipant = typeof campaign_participants.$inferSelect;
export type NewCampaignParticipant = typeof campaign_participants.$inferInsert;

export type ActionCompletion = typeof action_completions.$inferSelect;
export type NewActionCompletion = typeof action_completions.$inferInsert;

export type CampaignImpactMetrics = typeof campaign_impact_metrics.$inferSelect;
export type NewCampaignImpactMetrics = typeof campaign_impact_metrics.$inferInsert;

export type CoalitionRelationship = typeof coalition_relationships.$inferSelect;
export type NewCoalitionRelationship = typeof coalition_relationships.$inferInsert;


