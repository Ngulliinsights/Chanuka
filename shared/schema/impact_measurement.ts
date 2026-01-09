// ============================================================================
// IMPACT MEASUREMENT SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Platform effectiveness, equity analysis, and outcome tracking
// This schema measures whether the platform is actually improving democratic participation

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, date, smallint, real
} from "drizzle-orm/pg-core";

import { primaryKeyUuid, auditFields } from "./base-types";
import { kenyanCountyEnum } from "./enum";
import { bills } from "./foundation";
import { campaigns } from "./advocacy_coordination";

// ============================================================================
// PARTICIPATION COHORTS - Track user groups for equity analysis
// ============================================================================

export const participation_cohorts = pgTable("participation_cohorts", {
  id: primaryKeyUuid(),

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

  ...auditFields(),
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
  id: primaryKeyUuid(),
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

  ...auditFields(),
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
  id: primaryKeyUuid(),
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
  key_milestones: jsonb("key_milestones").notNull().default(sql`'{}'::jsonb`),

  // Challenges and issues
  implementation_challenges: text("implementation_challenges"),
  legal_challenges: text("legal_challenges"),

  // Public monitoring
  citizen_reports_count: integer("citizen_reports_count").notNull().default(0),
  media_coverage_count: integer("media_coverage_count").notNull().default(0),

  ...auditFields(),
}, (table) => ({
  // Implementation timeline analysis
  expectedDateIdx: index("idx_bill_implementation_expected_date")
    .on(table.expected_implementation_date),

  // Delayed implementation tracking
  delayIdx: index("idx_bill_implementation_delay")
    .on(table.implementation_delay_days)
    .where(sql`${table.implementation_delay_days} IS NOT NULL AND ${table.implementation_delay_days} > 0`),

  // Progress monitoring
  progressIdx: index("idx_bill_implementation_progress")
    .on(table.implementation_percentage),
}));

// ============================================================================
// ATTRIBUTION ASSESSMENTS - Impact attribution analysis
// ============================================================================

export const attribution_assessments = pgTable("attribution_assessments", {
  id: primaryKeyUuid(),

  // Assessment type and scope
  assessment_type: varchar("assessment_type", { length: 50 }).notNull(), // "bill_amendment", "policy_change", "legislative_outcome"
  assessment_date: date("assessment_date").notNull(),

  // Linked entities
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
  campaign_id: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

  // Attribution metrics
  platform_influence_score: real("platform_influence_score"), // 0-1 scale
  confidence_level: varchar("confidence_level", { length: 20 }), // "low", "medium", "high", "very_high"

  // Evidence of influence
  direct_evidence: jsonb("direct_evidence").notNull().default(sql`'[]'::jsonb`),
  // Examples: "sponsor cited public feedback", "amendment matches campaign demand"
  indirect_indicators: jsonb("indirect_indicators").notNull().default(sql`'[]'::jsonb`),
  // Examples: "timing correlation", "similar language used"

  // Causal analysis
  alternative_factors: jsonb("alternative_factors").notNull().default(sql`'[]'::jsonb`),
  // Other factors that might have influenced the outcome
  causal_mechanism: text("causal_mechanism"),
  // How the platform likely influenced the outcome

  // Outcome description
  outcome_description: text("outcome_description"),
  impact_magnitude: varchar("impact_magnitude", { length: 20 }), // "minor", "moderate", "significant", "major"

  // Assessment quality
  assessment_methodology: text("assessment_methodology"),
  limitations: text("limitations"),
  assessor_notes: text("assessor_notes"),

  ...auditFields(),
}, (table) => ({
  // Assessment type and date
  typeDate: index("idx_attribution_assessments_type_date")
    .on(table.assessment_type, table.assessment_date.desc()),

  // High-confidence attributions
  highConfidenceIdx: index("idx_attribution_assessments_high_confidence")
    .on(table.confidence_level, table.platform_influence_score.desc())
    .where(sql`${table.confidence_level} IN ('high', 'very_high')`),

  // Entity-specific assessments
  billIdx: index("idx_attribution_assessments_bill")
    .on(table.bill_id)
    .where(sql`${table.bill_id} IS NOT NULL`),

  campaignIdx: index("idx_attribution_assessments_campaign")
    .on(table.campaign_id)
    .where(sql`${table.campaign_id} IS NOT NULL`),
}));

// ============================================================================
// SUCCESS STORIES - Documented impact cases
// ============================================================================

export const success_stories = pgTable("success_stories", {
  id: primaryKeyUuid(),

  // Story metadata
  title: varchar("title", { length: 300 }).notNull(),
  story_type: varchar("story_type", { length: 50 }).notNull(), // "bill_amendment", "policy_influence", "community_mobilization"
  publication_date: date("publication_date"),
  is_published: boolean("is_published").notNull().default(false),

  // Story content
  summary: text("summary"),
  full_story: text("full_story"),
  key_takeaways: varchar("key_takeaways", { length: 200 }).array(),

  // Linked entities
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
  campaign_id: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  attribution_assessment_id: uuid("attribution_assessment_id")
    .references(() => attribution_assessments.id, { onDelete: "set null" }),

  // Participants
  featured_users: uuid("featured_users").array(), // User IDs
  participant_count: integer("participant_count"),

  // Impact metrics
  engagement_count: integer("engagement_count").notNull().default(0),
  reach_count: integer("reach_count").notNull().default(0),
  share_count: integer("share_count").notNull().default(0),

  // Media
  hero_image_url: varchar("hero_image_url", { length: 500 }),
  media_urls: varchar("media_urls", { length: 500 }).array(),
  video_url: varchar("video_url", { length: 500 }),

  // Tags and categorization
  tags: varchar("tags", { length: 50 }).array(),
  primary_impact_area: varchar("primary_impact_area", { length: 100 }),
  affected_counties: kenyanCountyEnum("affected_counties").array(),

  ...auditFields(),
}, (table) => ({
  // Published stories
  publishedIdx: index("idx_success_stories_published")
    .on(table.is_published, table.publication_date.desc())
    .where(sql`${table.is_published} = true`),

  // Story type
  typeIdx: index("idx_success_stories_type")
    .on(table.story_type, table.is_published),

  // Related entities
  billIdx: index("idx_success_stories_bill")
    .on(table.bill_id)
    .where(sql`${table.bill_id} IS NOT NULL`),

  campaignIdx: index("idx_success_stories_campaign")
    .on(table.campaign_id)
    .where(sql`${table.campaign_id} IS NOT NULL`),

  // Geographic spread
  countiesIdx: index("idx_success_stories_counties")
    .using("gin", table.affected_counties),

  // Tags for discovery
  tagsIdx: index("idx_success_stories_tags")
    .using("gin", table.tags),
}));

// ============================================================================
// EQUITY METRICS - Track participation equity across cohorts
// ============================================================================

export const equity_metrics = pgTable("equity_metrics", {
  id: primaryKeyUuid(),

  // Measurement period
  measurement_date: date("measurement_date").notNull(),
  measurement_period: varchar("measurement_period", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "quarterly"

  // Cohort reference
  cohort_id: uuid("cohort_id").notNull().references(() => participation_cohorts.id, {
    onDelete: "cascade"
  }),

  // Participation metrics
  registered_users: integer("registered_users").notNull().default(0),
  active_users: integer("active_users").notNull().default(0),
  engagement_rate: real("engagement_rate"), // Percentage
  average_actions_per_user: real("average_actions_per_user"),

  // Content engagement
  bills_viewed: integer("bills_viewed").notNull().default(0),
  comments_posted: integer("comments_posted").notNull().default(0),
  votes_cast: integer("votes_cast").notNull().default(0),
  campaigns_joined: integer("campaigns_joined").notNull().default(0),

  // Quality indicators
  high_quality_comments: integer("high_quality_comments").notNull().default(0),
  repeat_engagement_count: integer("repeat_engagement_count").notNull().default(0),

  // Comparison metrics (vs. overall platform average)
  participation_gap_percentage: real("participation_gap_percentage"),
  // Positive = cohort above average, Negative = cohort below average
  engagement_quality_gap: real("engagement_quality_gap"),

  // Trend indicators
  trend_direction: varchar("trend_direction", { length: 20 }), // "improving", "declining", "stable"
  period_over_period_change: real("period_over_period_change"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Time series analysis
  cohortDateIdx: index("idx_equity_metrics_cohort_date")
    .on(table.cohort_id, table.measurement_date.desc()),

  // Equity gap analysis
  gapIdx: index("idx_equity_metrics_gap")
    .on(table.participation_gap_percentage, table.measurement_date)
    .where(sql`${table.participation_gap_percentage} IS NOT NULL`),

  // Trend tracking
  trendIdx: index("idx_equity_metrics_trend")
    .on(table.trend_direction, table.measurement_date),
}));

// ============================================================================
// DEMOGRAPHIC IMPACT ANALYSIS - Track outcomes by demographics
// ============================================================================

export const demographic_impact_analysis = pgTable("demographic_impact_analysis", {
  id: primaryKeyUuid(),

  // Analysis period
  analysis_date: date("analysis_date").notNull(),
  analysis_period: varchar("analysis_period", { length: 20 }).notNull(),

  // Demographic segment
  demographic_dimension: varchar("demographic_dimension", { length: 50 }).notNull(),
  // "age", "gender", "county", "urban_rural", "education", "income", "digital_access"
  demographic_value: varchar("demographic_value", { length: 100 }).notNull(),
  // Specific value: "18-25", "female", "Nairobi", "urban", etc.

  // Population metrics
  segment_size: integer("segment_size").notNull().default(0),
  platform_users_count: integer("platform_users_count").notNull().default(0),
  representation_rate: real("representation_rate"), // % of segment on platform

  // Engagement patterns
  average_monthly_sessions: real("average_monthly_sessions"),
  average_session_duration_minutes: real("average_session_duration_minutes"),
  feature_usage_patterns: jsonb("feature_usage_patterns").notNull().default(sql`'{}'::jsonb`),

  // Impact on bills
  bills_engaged_with: integer("bills_engaged_with").notNull().default(0),
  bills_influenced: integer("bills_influenced").notNull().default(0),
  average_influence_score: real("average_influence_score"),

  // Barrier analysis
  identified_barriers: jsonb("identified_barriers").notNull().default(sql`'[]'::jsonb`),
  barrier_severity: varchar("barrier_severity", { length: 20 }), // "low", "medium", "high", "critical"

  // Recommendations
  recommendations: jsonb("recommendations").notNull().default(sql`'[]'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Demographic dimension analysis
  dimensionDateIdx: index("idx_demographic_impact_analysis_dimension_date")
    .on(table.demographic_dimension, table.analysis_date.desc()),

  // Representation gaps
  representationIdx: index("idx_demographic_impact_analysis_representation")
    .on(table.representation_rate, table.demographic_dimension)
    .where(sql`${table.representation_rate} IS NOT NULL`),

  // High-barrier segments
  barrierIdx: index("idx_demographic_impact_analysis_barrier")
    .on(table.barrier_severity, table.demographic_dimension)
    .where(sql`${table.barrier_severity} IN ('high', 'critical')`),
}));

// ============================================================================
// PLATFORM PERFORMANCE INDICATORS - Overall platform health metrics
// ============================================================================

export const platform_performance_indicators = pgTable("platform_performance_indicators", {
  id: primaryKeyUuid(),

  // Indicator identification
  indicator_name: varchar("indicator_name", { length: 100 }).notNull(),
  indicator_category: varchar("indicator_category", { length: 50 }).notNull(),
  // Categories: "engagement", "reach", "impact", "technical", "financial"

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
  id: primaryKeyUuid(),

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
  id: primaryKeyUuid(),

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
  id: primaryKeyUuid(),

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

// ============================================================================
// RELATIONS - Type-safe Drizzle ORM Relations
// ============================================================================

export const participationCohortsRelations = relations(participation_cohorts, ({ many }) => ({
  equityMetrics: many(equity_metrics),
}));

export const legislativeOutcomesRelations = relations(legislative_outcomes, ({ one }) => ({
  bill: one(bills, {
    fields: [legislative_outcomes.bill_id],
    references: [bills.id],
  }),
}));

export const billImplementationRelations = relations(bill_implementation, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_implementation.bill_id],
    references: [bills.id],
  }),
}));

export const attributionAssessmentsRelations = relations(attribution_assessments, ({ one, many }) => ({
  bill: one(bills, {
    fields: [attribution_assessments.bill_id],
    references: [bills.id],
  }),
  campaign: one(campaigns, {
    fields: [attribution_assessments.campaign_id],
    references: [campaigns.id],
  }),
  successStories: many(success_stories),
}));

export const successStoriesRelations = relations(success_stories, ({ one }) => ({
  bill: one(bills, {
    fields: [success_stories.bill_id],
    references: [bills.id],
  }),
  campaign: one(campaigns, {
    fields: [success_stories.campaign_id],
    references: [campaigns.id],
  }),
  attributionAssessment: one(attribution_assessments, {
    fields: [success_stories.attribution_assessment_id],
    references: [attribution_assessments.id],
  }),
}));

export const equityMetricsRelations = relations(equity_metrics, ({ one }) => ({
  cohort: one(participation_cohorts, {
    fields: [equity_metrics.cohort_id],
    references: [participation_cohorts.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
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

export type EquityMetric = typeof equity_metrics.$inferSelect;
export type NewEquityMetric = typeof equity_metrics.$inferInsert;

export type DemographicImpactAnalysis = typeof demographic_impact_analysis.$inferSelect;
export type NewDemographicImpactAnalysis = typeof demographic_impact_analysis.$inferInsert;

export type PlatformPerformanceIndicator = typeof platform_performance_indicators.$inferSelect;
export type NewPlatformPerformanceIndicator = typeof platform_performance_indicators.$inferInsert;

export type LegislativeImpactIndicator = typeof legislative_impact_indicators.$inferSelect;
export type NewLegislativeImpactIndicator = typeof legislative_impact_indicators.$inferInsert;

export type CivicEngagementIndicator = typeof civic_engagement_indicators.$inferSelect;
export type NewCivicEngagementIndicator = typeof civic_engagement_indicators.$inferInsert;

export type FinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferSelect;
export type NewFinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferInsert;
