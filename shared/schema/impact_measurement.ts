// ============================================================================
// IMPACT MEASUREMENT SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Platform effectiveness, equity analysis, and outcome tracking
// This schema measures whether the platform is actually improving democratic participation

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, date, smallint, real
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import { bills, users } from "./foundation";
import { campaigns } from "./advocacy_coordination";
import { kenyanCountyEnum } from "./enum";

// ============================================================================
// PARTICIPATION COHORTS - Track user groups for equity analysis
// ============================================================================

export const participation_cohorts = pgTable("participation_cohorts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Cohort identification
  cohort_name: varchar("cohort_name", { length: 200 }).notNull(),
  cohort_type: varchar("cohort_type", { length: 50 }).notNull(), // "demographic", "geographic", "temporal", "behavioral"

  // Cohort definition
  definition_criteria: jsonb("definition_criteria").notNull(),

  // Geographic cohorts
  county: kenyanCountyEnum("county"),
  constituency: varchar("constituency", { length: 100 }),
  urban_rural: varchar("urban_rural", { length: 20 }), // "urban", "rural", "peri_urban"

  // Demographic cohorts
  age_range: varchar("age_range", { length: 30 }),
  gender: varchar("gender", { length: 20 }),
  education_level: varchar("education_level", { length: 50 }),
  income_bracket: varchar("income_bracket", { length: 50 }),

  // Digital access cohorts
  device_type: varchar("device_type", { length: 30 }), // "smartphone", "feature_phone", "computer", "shared_device"
  connectivity_level: varchar("connectivity_level", { length: 30 }), // "high_speed", "mobile_data", "intermittent", "offline_only"

  // Temporal cohorts
  registration_period: varchar("registration_period", { length: 50 }),
  cohort_start_date: date("cohort_start_date"),
  cohort_end_date: date("cohort_end_date"),

  // Cohort metrics
  total_members: integer("total_members").notNull().default(0),
  active_members: integer("active_members").notNull().default(0),

  // Analysis status
  is_active: boolean("is_active").notNull().default(true),
  analysis_frequency: varchar("analysis_frequency", { length: 20 }).notNull().default("monthly"), // "daily", "weekly", "monthly", "quarterly"

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Cohort type analysis
  typeActiveIdx: index("idx_participation_cohorts_type_active")
    .on(table.cohort_type, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Geographic cohort analysis
  countyUrbanRuralIdx: index("idx_participation_cohorts_county_urban_rural")
    .on(table.county, table.urban_rural)
    .where(sql`${table.county} IS NOT NULL`),

  // Demographic analysis
  ageGenderIdx: index("idx_participation_cohorts_age_gender")
    .on(table.age_range, table.gender)
    .where(sql`${table.age_range} IS NOT NULL AND ${table.gender} IS NOT NULL`),

  // Digital divide analysis
  deviceConnectivityIdx: index("idx_participation_cohorts_device_connectivity")
    .on(table.device_type, table.connectivity_level),
}));

// ============================================================================
// LEGISLATIVE OUTCOMES - Track what happens to bills after public engagement
// ============================================================================

export const legislative_outcomes = pgTable("legislative_outcomes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Outcome tracking
  final_status: varchar("final_status", { length: 50 }).notNull(), // "passed", "rejected", "withdrawn", "lapsed", "amended_passed"
  outcome_date: date("outcome_date").notNull(),

  // Legislative process metrics
  total_readings: smallint("total_readings").notNull().default(0),
  committee_stages: smallint("committee_stages").notNull().default(0),
  amendment_count: integer("amendment_count").notNull().default(0),

  // Public engagement metrics during process
  public_comments_received: integer("public_comments_received").notNull().default(0),
  public_participation_events: integer("public_participation_events").notNull().default(0),
  campaign_activities: integer("campaign_activities").notNull().default(0),

  // Voting details
  final_vote_for: integer("final_vote_for"),
  final_vote_against: integer("final_vote_against"),
  final_vote_abstain: integer("final_vote_abstain"),
  vote_margin: integer("vote_margin"), // Difference between for and against

  // Amendment analysis
  amendments_from_public_input: integer("amendments_from_public_input").notNull().default(0),
  substantive_changes_made: boolean("substantive_changes_made").notNull().default(false),
  changes_summary: text("changes_summary"),

  // Implementation tracking (for passed bills)
  implementation_status: varchar("implementation_status", { length: 30 }), // "not_applicable", "pending", "partial", "full", "delayed"
  implementation_date: date("implementation_date"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Outcome analysis
  finalStatusIdx: index("idx_legislative_outcomes_final_status")
    .on(table.final_status, table.outcome_date),

  // Public engagement impact
  publicEngagementIdx: index("idx_legislative_outcomes_public_engagement")
    .on(table.public_comments_received, table.amendments_from_public_input, table.substantive_changes_made),

  // Implementation tracking
  implementationStatusIdx: index("idx_legislative_outcomes_implementation_status")
    .on(table.implementation_status, table.implementation_date)
    .where(sql`${table.implementation_status} IS NOT NULL`),
}));

// ============================================================================
// BILL IMPLEMENTATION - Track post-passage implementation
// ============================================================================

export const bill_implementation = pgTable("bill_implementation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Implementation timeline
  expected_implementation_date: date("expected_implementation_date"),
  actual_implementation_date: date("actual_implementation_date"),
  implementation_delay_days: integer("implementation_delay_days"),

  // Implementation details
  implementing_agencies: varchar("implementing_agencies", { length: 200 }).array(),
  budget_allocated: numeric("budget_allocated", { precision: 15, scale: 2 }),
  budget_utilized: numeric("budget_utilized", { precision: 15, scale: 2 }),

  // Implementation progress
  implementation_percentage: numeric("implementation_percentage", { precision: 5, scale: 2 }), // 0-100
  key_milestones: jsonb("key_milestones").notNull().default(sql`'[]'::jsonb`),

  // Challenges and issues
  implementation_challenges: text("implementation_challenges"),
  legal_challenges: text("legal_challenges"),

  // Public monitoring
  citizen_reports_count: integer("citizen_reports_count").notNull().default(0),
  media_coverage_count: integer("media_coverage_count").notNull().default(0),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Implementation timeline analysis
  implementationTimelineIdx: index("idx_bill_implementation_implementation_timeline")
    .on(table.expected_implementation_date, table.actual_implementation_date, table.implementation_delay_days),

  // Budget utilization analysis
  budgetUtilizationIdx: index("idx_bill_implementation_budget_utilization")
    .on(table.budget_allocated, table.budget_utilized, table.implementation_percentage),

  // Public monitoring
  publicMonitoringIdx: index("idx_bill_implementation_public_monitoring")
    .on(table.citizen_reports_count, table.media_coverage_count),
}));

// ============================================================================
// ATTRIBUTION ASSESSMENTS - Measure platform's causal impact
// ============================================================================

export const attribution_assessments = pgTable("attribution_assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Assessment scope
  assessment_type: varchar("assessment_type", { length: 50 }).notNull(), // "bill_outcome", "amendment_influence", "participation_increase", "awareness_change"
  target_bill_id: uuid("target_bill_id").references(() => bills.id, { onDelete: "cascade" }),
  target_campaign_id: uuid("target_campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),

  // Assessment period
  assessment_start_date: date("assessment_start_date").notNull(),
  assessment_end_date: date("assessment_end_date").notNull(),

  // Methodology
  assessment_methodology: varchar("assessment_methodology", { length: 100 }).notNull(), // "before_after", "control_group", "regression_analysis", "expert_judgment"
  control_group_description: text("control_group_description"),

  // Attribution analysis
  platform_contribution_percentage: numeric("platform_contribution_percentage", { precision: 5, scale: 2 }), // 0-100
  confidence_level: numeric("confidence_level", { precision: 3, scale: 2 }), // 0.00-1.00

  // Evidence and metrics
  quantitative_evidence: jsonb("quantitative_evidence").notNull().default(sql`'{}'::jsonb`),
  qualitative_evidence: text("qualitative_evidence"),

  // Alternative explanations
  confounding_factors: text("confounding_factors"),
  alternative_explanations: text("alternative_explanations"),

  // Assessment quality
  assessor_id: uuid("assessor_id").references(() => users.id, { onDelete: "set null" }),
  peer_reviewed: boolean("peer_reviewed").notNull().default(false),
  methodology_validated: boolean("methodology_validated").notNull().default(false),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Assessment type analysis
  typeConfidenceIdx: index("idx_attribution_assessments_type_confidence")
    .on(table.assessment_type, table.confidence_level, table.platform_contribution_percentage),

  // Bill attribution tracking
  billAttributionIdx: index("idx_attribution_assessments_bill_attribution")
    .on(table.target_bill_id, table.platform_contribution_percentage)
    .where(sql`${table.target_bill_id} IS NOT NULL`),

  // Quality assurance
  qualityAssuranceIdx: index("idx_attribution_assessments_quality_assurance")
    .on(table.peer_reviewed, table.methodology_validated, table.confidence_level),
}));

// ============================================================================
// SUCCESS STORIES - Document positive outcomes and impact
// ============================================================================

export const success_stories = pgTable("success_stories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Story identification
  title: varchar("title", { length: 500 }).notNull(),
  story_type: varchar("story_type", { length: 50 }).notNull(), // "bill_improvement", "increased_participation", "transparency_win", "community_mobilization"

  // Story context
  related_bill_id: uuid("related_bill_id").references(() => bills.id, { onDelete: "set null" }),
  related_campaign_id: uuid("related_campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  geographic_scope: varchar("geographic_scope", { length: 50 }), // "national", "county", "constituency", "community"

  // Story content
  story_summary: text("story_summary").notNull(),
  detailed_narrative: text("detailed_narrative"),
  key_actors: jsonb("key_actors").notNull().default(sql`'[]'::jsonb`),

  // Impact metrics
  quantified_impact: jsonb("quantified_impact").notNull().default(sql`'{}'::jsonb`),
  people_affected: integer("people_affected"),

  // Evidence and verification
  evidence_sources: jsonb("evidence_sources").notNull().default(sql`'[]'::jsonb`),
  verification_status: varchar("verification_status", { length: 30 }).notNull().default("unverified"), // "unverified", "verified", "disputed"

  // Story lifecycle
  story_date: date("story_date").notNull(),
  is_featured: boolean("is_featured").notNull().default(false),
  is_public: boolean("is_public").notNull().default(true),

  // Attribution
  documented_by_id: uuid("documented_by_id").references(() => users.id, { onDelete: "set null" }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Story discovery
  typePublicIdx: index("idx_success_stories_type_public")
    .on(table.story_type, table.is_public, table.story_date)
    .where(sql`${table.is_public} = true`),

  // Featured stories
  featuredIdx: index("idx_success_stories_featured")
    .on(table.is_featured, table.story_date)
    .where(sql`${table.is_featured} = true`),

  // Geographic impact
  geographicScopeIdx: index("idx_success_stories_geographic_scope")
    .on(table.geographic_scope, table.people_affected),
}));

// ============================================================================
// GEOGRAPHIC EQUITY METRICS - Track participation across regions
// ============================================================================

export const geographic_equity_metrics = pgTable("geographic_equity_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Geographic scope
  county: kenyanCountyEnum("county").notNull(),
  constituency: varchar("constituency", { length: 100 }),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "quarterly"

  // Population context
  total_population: integer("total_population"),
  eligible_population: integer("eligible_population"), // Adults eligible to participate
  internet_penetration_rate: real("internet_penetration_rate"), // 0.0 to 1.0

  // Platform participation
  registered_users: integer("registered_users").notNull().default(0),
  active_users: integer("active_users").notNull().default(0),
  new_registrations: integer("new_registrations").notNull().default(0),

  // Engagement metrics
  comments_posted: integer("comments_posted").notNull().default(0),
  bills_viewed: integer("bills_viewed").notNull().default(0),
  votes_cast: integer("votes_cast").notNull().default(0),
  campaigns_joined: integer("campaigns_joined").notNull().default(0),

  // Offline engagement
  facilitation_sessions_held: integer("facilitation_sessions_held").notNull().default(0),
  offline_participants: integer("offline_participants").notNull().default(0),

  // Equity calculations
  participation_rate: real("participation_rate"), // active_users / eligible_population
  engagement_intensity: real("engagement_intensity"), // Average actions per active user
  digital_divide_index: real("digital_divide_index"), // Measure of digital access inequality

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Geographic time series
  countyDateIdx: index("idx_geographic_equity_metrics_county_date")
    .on(table.county, table.measurement_date),

  // Equity analysis
  participationRateIdx: index("idx_geographic_equity_metrics_participation_rate")
    .on(table.participation_rate, table.digital_divide_index),

  // Constituency comparison
  constituencyParticipationIdx: index("idx_geographic_equity_metrics_constituency_participation")
    .on(table.constituency, table.participation_rate)
    .where(sql`${table.constituency} IS NOT NULL`),
}));

// ============================================================================
// DEMOGRAPHIC EQUITY METRICS - Track participation across demographics
// ============================================================================

export const demographic_equity_metrics = pgTable("demographic_equity_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Demographic categories
  age_range: varchar("age_range", { length: 30 }),
  gender: varchar("gender", { length: 20 }),
  education_level: varchar("education_level", { length: 50 }),
  income_bracket: varchar("income_bracket", { length: 50 }),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(),

  // Population estimates
  estimated_population: integer("estimated_population"),

  // Platform participation
  registered_users: integer("registered_users").notNull().default(0),
  active_users: integer("active_users").notNull().default(0),

  // Engagement patterns
  average_session_duration: real("average_session_duration"), // Minutes
  average_actions_per_session: real("average_actions_per_session"),
  preferred_engagement_types: varchar("preferred_engagement_types", { length: 50 }).array(),

  // Barriers and challenges
  reported_barriers: jsonb("reported_barriers").notNull().default(sql`'[]'::jsonb`),
  support_needs: jsonb("support_needs").notNull().default(sql`'[]'::jsonb`),

  // Equity indicators
  participation_rate: real("participation_rate"),
  engagement_quality_score: real("engagement_quality_score"), // Composite measure of meaningful participation

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Demographic analysis
  ageGenderDateIdx: index("idx_demographic_equity_metrics_age_gender_date")
    .on(table.age_range, table.gender, table.measurement_date),

  // Participation equity
  participationEquityIdx: index("idx_demographic_equity_metrics_participation_equity")
    .on(table.participation_rate, table.engagement_quality_score),

  // Education and income analysis
  educationIncomeIdx: index("idx_demographic_equity_metrics_education_income")
    .on(table.education_level, table.income_bracket, table.participation_rate),
}));

// ============================================================================
// DIGITAL INCLUSION METRICS - Track digital divide impact
// ============================================================================

export const digital_inclusion_metrics = pgTable("digital_inclusion_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Measurement context
  measurement_date: date("measurement_date").notNull(),
  geographic_scope: varchar("geographic_scope", { length: 50 }), // "national", "county", "constituency"
  county: kenyanCountyEnum("county"),

  // Device access patterns
  smartphone_users: integer("smartphone_users").notNull().default(0),
  feature_phone_users: integer("feature_phone_users").notNull().default(0),
  computer_users: integer("computer_users").notNull().default(0),
  shared_device_users: integer("shared_device_users").notNull().default(0),

  // Connectivity patterns
  high_speed_users: integer("high_speed_users").notNull().default(0),
  mobile_data_users: integer("mobile_data_users").notNull().default(0),
  intermittent_connectivity_users: integer("intermittent_connectivity_users").notNull().default(0),
  offline_only_users: integer("offline_only_users").notNull().default(0),

  // Access method usage
  web_platform_usage: integer("web_platform_usage").notNull().default(0),
  mobile_app_usage: integer("mobile_app_usage").notNull().default(0),
  ussd_usage: integer("ussd_usage").notNull().default(0),
  ambassador_facilitated_usage: integer("ambassador_facilitated_usage").notNull().default(0),

  // Engagement quality by access method
  mobile_vs_desktop_access: jsonb("mobile_vs_desktop_access").notNull().default(sql`'{}'::jsonb`),
  mobile_only_users_percentage: real("mobile_only_users_percentage"),
  smartphone_vs_feature_phone: jsonb("smartphone_vs_feature_phone").default(sql`'{}'::jsonb`),

  // Digital literacy indicators
  device_diversity_index: real("device_diversity_index"),
  platform_switching_rate: real("platform_switching_rate"), // Users who use multiple access methods

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Geographic digital divide
  countyDigitalDivideIdx: index("idx_digital_inclusion_metrics_county_digital_divide")
    .on(table.county, table.measurement_date)
    .where(sql`${table.county} IS NOT NULL`),

  // Device access analysis
  deviceAccessIdx: index("idx_digital_inclusion_metrics_device_access")
    .on(table.smartphone_users, table.feature_phone_users, table.offline_only_users),

  // Platform usage patterns
  platformUsageIdx: index("idx_digital_inclusion_metrics_platform_usage")
    .on(table.web_platform_usage, table.ussd_usage, table.ambassador_facilitated_usage),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const participationCohortsRelations = relations(participation_cohorts, ({ many }) => ({
  geographicMetrics: many(geographic_equity_metrics),
  demographicMetrics: many(demographic_equity_metrics),
}));

export const legislativeOutcomesRelations = relations(legislative_outcomes, ({ one, many }) => ({
  bill: one(bills, {
    fields: [legislative_outcomes.bill_id],
    references: [bills.id],
  }),
  implementation: many(bill_implementation),
  attributionAssessments: many(attribution_assessments),
}));

export const billImplementationRelations = relations(bill_implementation, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_implementation.bill_id],
    references: [bills.id],
  }),
  outcome: one(legislative_outcomes, {
    fields: [bill_implementation.bill_id],
    references: [legislative_outcomes.bill_id],
  }),
}));

export const attributionAssessmentsRelations = relations(attribution_assessments, ({ one }) => ({
  targetBill: one(bills, {
    fields: [attribution_assessments.target_bill_id],
    references: [bills.id],
  }),
  targetCampaign: one(campaigns, {
    fields: [attribution_assessments.target_campaign_id],
    references: [campaigns.id],
  }),
  assessor: one(users, {
    fields: [attribution_assessments.assessor_id],
    references: [users.id],
  }),
}));

export const successStoriesRelations = relations(success_stories, ({ one }) => ({
  relatedBill: one(bills, {
    fields: [success_stories.related_bill_id],
    references: [bills.id],
  }),
  relatedCampaign: one(campaigns, {
    fields: [success_stories.related_campaign_id],
    references: [campaigns.id],
  }),
  documentedBy: one(users, {
    fields: [success_stories.documented_by_id],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ParticipationCohort = typeof participation_cohorts.$inferSelect;
export type NewParticipationCohort = typeof participation_cohorts.$inferInsert;

export type LegislativeOutcome = typeof legislative_outcomes.$inferSelect;
export type NewLegislativeOutcome = typeof legislative_outcomes.$inferInsert;

export type BillImplementation = typeof bill_implementation.$inferSelect;
export type NewBillImplementation = typeof bill_implementation.$inferInsert;

export type AttributionAssessment = typeof attribution_assessments.$inferSelect;
export type NewAttributionAssessment = typeof attribution_assessments.$inferInsert;

export type SuccessStory = typeof success_stories.$inferSelect;
export type NewSuccessStory = typeof success_stories.$inferInsert;

export type GeographicEquityMetric = typeof geographic_equity_metrics.$inferSelect;
export type NewGeographicEquityMetric = typeof geographic_equity_metrics.$inferInsert;

export type DemographicEquityMetric = typeof demographic_equity_metrics.$inferSelect;
export type NewDemographicEquityMetric = typeof demographic_equity_metrics.$inferInsert;

export type DigitalInclusionMetric = typeof digital_inclusion_metrics.$inferSelect;
export type NewDigitalInclusionMetric = typeof digital_inclusion_metrics.$inferInsert;

// ============================================================================
// PLATFORM PERFORMANCE INDICATORS - High-level KPIs
// ============================================================================

export const platform_performance_indicators = pgTable("platform_performance_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Indicator identification
  indicator_name: varchar("indicator_name", { length: 200 }).notNull(),
  indicator_category: varchar("indicator_category", { length: 50 }).notNull(), // "reach", "engagement", "impact", "equity"

  // Measurement
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(),

  // Values
  current_value: numeric("current_value", { precision: 15, scale: 4 }).notNull(),
  target_value: numeric("target_value", { precision: 15, scale: 4 }),
  baseline_value: numeric("baseline_value", { precision: 15, scale: 4 }),

  // Trend analysis
  previous_period_value: numeric("previous_period_value", { precision: 15, scale: 4 }),
  change_percentage: real("change_percentage"),
  trend_direction: varchar("trend_direction", { length: 20 }), // "improving", "declining", "stable"

  // Context
  calculation_method: text("calculation_method"),
  data_sources: varchar("data_sources", { length: 100 }).array(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // KPI tracking
  indicatorDateIdx: index("idx_platform_performance_indicators_indicator_date")
    .on(table.indicator_name, table.measurement_date),

  // Category analysis
  categoryTrendIdx: index("idx_platform_performance_indicators_category_trend")
    .on(table.indicator_category, table.trend_direction, table.measurement_date),
}));

// ============================================================================
// LEGISLATIVE IMPACT INDICATORS - Bills and policy outcomes
// ============================================================================

export const legislative_impact_indicators = pgTable("legislative_impact_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(),

  // Bill lifecycle metrics
  bills_introduced: integer("bills_introduced").notNull().default(0),
  bills_with_public_engagement: integer("bills_with_public_engagement").notNull().default(0),
  bills_amended_after_engagement: integer("bills_amended_after_engagement").notNull().default(0),
  bills_passed: integer("bills_passed").notNull().default(0),
  bills_rejected: integer("bills_rejected").notNull().default(0),

  // Public participation metrics
  average_comments_per_bill: real("average_comments_per_bill"),
  average_participants_per_bill: real("average_participants_per_bill"),
  public_participation_events_held: integer("public_participation_events_held").notNull().default(0),

  // Amendment influence
  amendments_from_public_input: integer("amendments_from_public_input").notNull().default(0),
  substantive_changes_percentage: real("substantive_changes_percentage"),

  // Implementation tracking
  bills_implemented_on_time: integer("bills_implemented_on_time").notNull().default(0),
  average_implementation_delay_days: real("average_implementation_delay_days"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Legislative impact time series
  measurementDateIdx: index("idx_legislative_impact_indicators_measurement_date")
    .on(table.measurement_date),

  // Public engagement impact
  engagementImpactIdx: index("idx_legislative_impact_indicators_engagement_impact")
    .on(table.bills_with_public_engagement, table.bills_amended_after_engagement),
}));

// ============================================================================
// CIVIC ENGAGEMENT INDICATORS - Citizen participation patterns
// ============================================================================

export const civic_engagement_indicators = pgTable("civic_engagement_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(),

  // User engagement
  total_registered_users: integer("total_registered_users").notNull().default(0),
  monthly_active_users: integer("monthly_active_users").notNull().default(0),
  daily_active_users: integer("daily_active_users").notNull().default(0),
  new_user_registrations: integer("new_user_registrations").notNull().default(0),

  // Content engagement
  comments_posted: integer("comments_posted").notNull().default(0),
  bills_viewed: integer("bills_viewed").notNull().default(0),
  votes_cast: integer("votes_cast").notNull().default(0),
  shares_made: integer("shares_made").notNull().default(0),

  // Campaign participation
  campaigns_created: integer("campaigns_created").notNull().default(0),
  campaign_participants: integer("campaign_participants").notNull().default(0),
  actions_completed: integer("actions_completed").notNull().default(0),

  // Quality metrics
  average_comment_length: real("average_comment_length"),
  constructive_comments_percentage: real("constructive_comments_percentage"),
  repeat_engagement_rate: real("repeat_engagement_rate"), // Users who engage multiple times

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Engagement time series
  measurementDateIdx: index("idx_civic_engagement_indicators_measurement_date")
    .on(table.measurement_date),

  // User activity patterns
  userActivityIdx: index("idx_civic_engagement_indicators_user_activity")
    .on(table.monthly_active_users, table.daily_active_users, table.repeat_engagement_rate),
}));

// ============================================================================
// FINANCIAL SUSTAINABILITY INDICATORS - Platform viability metrics
// ============================================================================

export const financial_sustainability_indicators = pgTable("financial_sustainability_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(),

  // Cost metrics
  infrastructure_costs: numeric("infrastructure_costs", { precision: 12, scale: 2 }).notNull().default('0'),
  personnel_costs: numeric("personnel_costs", { precision: 12, scale: 2 }).notNull().default('0'),
  operational_costs: numeric("operational_costs", { precision: 12, scale: 2 }).notNull().default('0'),
  total_costs: numeric("total_costs", { precision: 12, scale: 2 }).notNull().default('0'),

  // Revenue and funding
  grant_funding: numeric("grant_funding", { precision: 12, scale: 2 }).notNull().default('0'),
  subscription_revenue: numeric("subscription_revenue", { precision: 12, scale: 2 }).notNull().default('0'),
  service_revenue: numeric("service_revenue", { precision: 12, scale: 2 }).notNull().default('0'),
  total_revenue: numeric("total_revenue", { precision: 12, scale: 2 }).notNull().default('0'),

  // Efficiency metrics
  cost_per_active_user: numeric("cost_per_active_user", { precision: 8, scale: 2 }),
  cost_per_engagement: numeric("cost_per_engagement", { precision: 8, scale: 4 }),

  // Sustainability indicators
  funding_runway_months: real("funding_runway_months"),
  revenue_growth_rate: real("revenue_growth_rate"),
  cost_efficiency_trend: varchar("cost_efficiency_trend", { length: 20 }), // "improving", "declining", "stable"

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Financial time series
  measurementDateIdx: index("idx_financial_sustainability_indicators_measurement_date")
    .on(table.measurement_date),

  // Sustainability analysis
  sustainabilityIdx: index("idx_financial_sustainability_indicators_sustainability")
    .on(table.funding_runway_months, table.revenue_growth_rate, table.cost_efficiency_trend),
}));

// Additional type exports for new tables
export type PlatformPerformanceIndicator = typeof platform_performance_indicators.$inferSelect;
export type NewPlatformPerformanceIndicator = typeof platform_performance_indicators.$inferInsert;

export type LegislativeImpactIndicator = typeof legislative_impact_indicators.$inferSelect;
export type NewLegislativeImpactIndicator = typeof legislative_impact_indicators.$inferInsert;

export type CivicEngagementIndicator = typeof civic_engagement_indicators.$inferSelect;
export type NewCivicEngagementIndicator = typeof civic_engagement_indicators.$inferInsert;

export type FinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferSelect;
export type NewFinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferInsert;