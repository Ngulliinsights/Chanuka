// ============================================================================
// IMPACT MEASUREMENT SCHEMA - REFACTORED & OPTIMIZED
// ============================================================================
// Version: 3.0.0
// Date: 2025-11-02
// 
// Key Improvements:
// 1. Legislative outcomes split into core outcomes + implementation tracking
// 2. Equity metrics split by dimension for better query performance
// 3. Impact indicators split by domain (platform, legislative, civic, financial)
// 4. Reduced field redundancy and improved normalization
// 5. Strategic denormalization only where query performance demands it

import {
    pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
    index, uniqueIndex, date, smallint, real, check
  } from "drizzle-orm/pg-core";
  import { sql } from "drizzle-orm";
  import { relations } from "drizzle-orm";
  
  import {
    kenyanCountyEnum,
    billStatusEnum,
    verificationStatusEnum
  } from "./enum";
  
  import {
    users,
    bills
  } from "./foundation";
  
  import {
    bill_amendments
  } from "./parliamentary_process";
  
  import {
    campaigns
  } from "./advocacy_coordination";
  
  // ============================================================================
  // PARTICIPATION COHORTS - NO CHANGES (Well-designed as is)
  // ============================================================================
  
  export const participation_cohorts: any = pgTable("participation_cohorts", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Cohort identification
    cohort_name: varchar("cohort_name", { length: 255 }).notNull(),
    cohort_type: varchar("cohort_type", { length: 50 }).notNull(),
    cohort_slug: varchar("cohort_slug", { length: 255 }).notNull(),
    cohort_criteria: jsonb("cohort_criteria").notNull(),
    cohort_description: text("cohort_description").notNull(),
    cohort_hypothesis: text("cohort_hypothesis"),
    
    // Measurement period
    measurement_period_start: date("measurement_period_start").notNull(),
    measurement_period_end: date("measurement_period_end"),
    is_ongoing: boolean("is_ongoing").notNull().default(true),
    measurement_frequency: varchar("measurement_frequency", { length: 20 }),
    
    // Cohort composition
    total_users: integer("total_users").notNull().default(0),
    active_users: integer("active_users").notNull().default(0),
    churned_users: integer("churned_users").notNull().default(0),
    reactivated_users: integer("reactivated_users").notNull().default(0),
    demographic_breakdown: jsonb("demographic_breakdown").notNull().default(sql`'{}'::jsonb`),
    geographic_distribution: jsonb("geographic_distribution").notNull().default(sql`'{}'::jsonb`),
    
    // Engagement metrics
    average_sessions_per_user: real("average_sessions_per_user"),
    median_sessions_per_user: real("median_sessions_per_user"),
    average_comments_per_user: real("average_comments_per_user"),
    average_votes_per_user: real("average_votes_per_user"),
    bills_tracked_per_user: real("bills_tracked_per_user"),
    average_session_duration_minutes: real("average_session_duration_minutes"),
    
    // Behavioral patterns
    peak_activity_times: jsonb("peak_activity_times").notNull().default(sql`'{}'::jsonb`),
    preferred_bill_categories: text("preferred_bill_categories").array().default(sql`'{}'::text[]`),
    engagement_consistency_score: real("engagement_consistency_score"),
    engagement_intensity_score: real("engagement_intensity_score"),
    
    // Advocacy participation
    campaign_participation_rate: real("campaign_participation_rate"),
    action_completion_rate: real("action_completion_rate"),
    offline_session_attendance: integer("offline_session_attendance").notNull().default(0),
    advocacy_leadership_count: integer("advocacy_leadership_count").notNull().default(0),
    
    // Digital access patterns
    mobile_vs_desktop_usage: jsonb("mobile_vs_desktop_usage").notNull().default(sql`'{}'::jsonb`),
    connectivity_patterns: jsonb("connectivity_patterns").notNull().default(sql`'{}'::jsonb`),
    ussd_usage_rate: real("ussd_usage_rate"),
    average_bandwidth_tier: varchar("average_bandwidth_tier", { length: 20 }),
    
    // Retention metrics
    retention_rate_30_days: real("retention_rate_30_days"),
    retention_rate_90_days: real("retention_rate_90_days"),
    retention_rate_180_days: real("retention_rate_180_days"),
    churn_rate: real("churn_rate"),
    average_user_lifetime_days: real("average_user_lifetime_days"),
    referral_rate: real("referral_rate"),
    
    // Impact indicators (normalized 0-1)
    legislative_awareness_score: real("legislative_awareness_score"),
    civic_knowledge_improvement: real("civic_knowledge_improvement"),
    political_efficacy_score: real("political_efficacy_score"),
    democratic_participation_score: real("democratic_participation_score"),
    
    // Comparative analysis
    comparison_baseline_cohort_id: uuid("comparison_baseline_cohort_id").references(() => participation_cohorts.id, { onDelete: "set null" }),
    relative_engagement_index: real("relative_engagement_index"),
    cohort_distinctiveness_score: real("cohort_distinctiveness_score"),
    
    // Statistical rigor
    analysis_method: varchar("analysis_method", { length: 100 }).notNull(),
    confidence_level: real("confidence_level"),
    margin_of_error: real("margin_of_error"),
    sample_size: integer("sample_size"),
    is_statistically_significant: boolean("is_statistically_significant").notNull().default(false),
    statistical_power: real("statistical_power"),
    
    // Quality
    data_completeness_percentage: real("data_completeness_percentage").notNull().default(100),
    data_quality_issues: text("data_quality_issues").array().default(sql`'{}'::text[]`),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    last_analyzed_at: timestamp("last_analyzed_at"),
  }, (table) => ({
    cohortSlugIdx: uniqueIndex("uniq_cohort_slug").on(table.cohort_slug),
    cohortNamePeriodIdx: index("idx_cohort_name_period").on(table.cohort_name, table.measurement_period_start),
    cohortTypeOngoingIdx: index("idx_cohort_type_ongoing").on(table.cohort_type, table.is_ongoing),
    measurementPeriodIdx: index("idx_cohort_measurement_period").on(table.measurement_period_start, table.measurement_period_end),
    activeUsersIdx: index("idx_cohort_active_users").on(table.active_users),
    engagementScoreIdx: index("idx_cohort_engagement").on(table.engagement_consistency_score, table.engagement_intensity_score),
    
    periodOrderCheck: check("chk_cohort_period_order", sql`${table.measurement_period_end} IS NULL OR ${table.measurement_period_end} >= ${table.measurement_period_start}`),
    activeUsersCheck: check("chk_cohort_active_users", sql`${table.active_users} <= ${table.total_users}`),
  }));
  
  // ============================================================================
  // LEGISLATIVE OUTCOMES - SPLIT INTO TWO TABLES
  // ============================================================================
  // Rationale: Separates core outcome data from post-implementation tracking
  // Benefits: Faster queries on outcomes, optional implementation tracking
  
  // TABLE 1: Core Legislative Outcomes
  export const legislative_outcomes = pgTable("legislative_outcomes", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Core relationships
    bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    amendment_id: uuid("amendment_id").references(() => bill_amendments.id, { onDelete: "set null" }),
    
    // Outcome classification
    outcome_type: varchar("outcome_type", { length: 50 }).notNull(),
    outcome_subtype: varchar("outcome_subtype", { length: 50 }),
    outcome_date: date("outcome_date").notNull(),
    outcome_description: text("outcome_description").notNull(),
    final_text_url: text("final_text_url"),
    gazette_notice_url: text("gazette_notice_url"),
    
    // Parliamentary voting
    total_votes_cast: smallint("total_votes_cast"),
    votes_for: smallint("votes_for"),
    votes_against: smallint("votes_against"),
    abstentions: smallint("abstentions"),
    absent_members: smallint("absent_members"),
    vote_margin_percentage: real("vote_margin_percentage"),
    voting_pattern_analysis: jsonb("voting_pattern_analysis").default(sql`'{}'::jsonb`),
    
    // Committee process
    committee_recommendation: varchar("committee_recommendation", { length: 50 }),
    committee_vote_margin: varchar("committee_vote_margin", { length: 50 }),
    number_of_readings: smallint("number_of_readings").notNull().default(0),
    amendments_proposed: smallint("amendments_proposed").notNull().default(0),
    amendments_accepted: smallint("amendments_accepted").notNull().default(0),
    amendments_rejected: smallint("amendments_rejected").notNull().default(0),
    amendments_acceptance_rate: real("amendments_acceptance_rate"),
    
    // Timeline metrics (days)
    days_from_introduction: smallint("days_from_introduction"),
    days_in_committee: smallint("days_in_committee"),
    days_between_readings: jsonb("days_between_readings").notNull().default(sql`'[]'::jsonb`),
    total_process_duration_days: smallint("total_process_duration_days"),
    expected_duration_days: smallint("expected_duration_days"),
    process_efficiency_score: real("process_efficiency_score"),
    
    // Public engagement correlation
    total_public_comments: integer("total_public_comments").notNull().default(0),
    total_public_votes: integer("total_public_votes").notNull().default(0),
    unique_participants: integer("unique_participants").notNull().default(0),
    public_support_percentage: real("public_support_percentage"),
    public_opposition_percentage: real("public_opposition_percentage"),
    public_neutral_percentage: real("public_neutral_percentage"),
    peak_engagement_date: date("peak_engagement_date"),
    engagement_momentum_score: real("engagement_momentum_score"),
    engagement_timeline: jsonb("engagement_timeline").default(sql`'[]'::jsonb`),
    
    // Campaign correlation
    active_campaigns_count: smallint("active_campaigns_count").notNull().default(0),
    campaign_participants_total: integer("campaign_participants_total").notNull().default(0),
    actions_completed_total: integer("actions_completed_total").notNull().default(0),
    campaign_start_to_outcome_days: smallint("campaign_start_to_outcome_days"),
    campaign_effectiveness_score: real("campaign_effectiveness_score"),
    
    // Media and public attention
    media_mentions_count: integer("media_mentions_count").notNull().default(0),
    social_media_engagement: jsonb("social_media_engagement").notNull().default(sql`'{}'::jsonb`),
    expert_analyses_count: smallint("expert_analyses_count").notNull().default(0),
    public_attention_score: real("public_attention_score"),
    media_sentiment_score: real("media_sentiment_score"),
    
    // Constitutional and legal analysis
    constitutional_concerns_raised: smallint("constitutional_concerns_raised").notNull().default(0),
    expert_reviews_conducted: smallint("expert_reviews_conducted").notNull().default(0),
    constitutional_risk_level: varchar("constitutional_risk_level", { length: 20 }),
    legal_challenges_filed: smallint("legal_challenges_filed").notNull().default(0),
    
    // Stakeholder landscape
    cso_positions_recorded: smallint("cso_positions_recorded").notNull().default(0),
    corporate_lobbying_detected: boolean("corporate_lobbying_detected").notNull().default(false),
    financial_conflicts_identified: smallint("financial_conflicts_identified").notNull().default(0),
    stakeholder_alignment_score: real("stakeholder_alignment_score"),
    opposition_intensity_score: real("opposition_intensity_score"),
    
    // Data quality and verification
    data_sources: text("data_sources").array().default(sql`'{}'::text[]`),
    verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
    verified_at: timestamp("verified_at"),
    verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verification_notes: text("verification_notes"),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    billOutcomeTypeIdx: index("idx_outcome_bill_type").on(table.bill_id, table.outcome_type),
    outcomeDateTypeIdx: index("idx_outcome_date_type").on(table.outcome_date, table.outcome_type),
    verificationStatusIdx: index("idx_outcome_verification").on(table.verification_status),
    publicEngagementIdx: index("idx_outcome_public_engagement").on(table.public_support_percentage, table.total_public_comments),
    processDurationIdx: index("idx_outcome_duration").on(table.total_process_duration_days),
    campaignCorrelationIdx: index("idx_outcome_campaign").on(table.active_campaigns_count, table.campaign_effectiveness_score),
    
    uniqueBillOutcome: uniqueIndex("uniq_bill_outcome").on(table.bill_id, table.outcome_type, table.outcome_date),
    votingLogicCheck: check("chk_outcome_votes", sql`${table.total_votes_cast} = ${table.votes_for} + ${table.votes_against} + ${table.abstentions}`),
    amendmentsLogicCheck: check("chk_outcome_amendments", sql`${table.amendments_proposed} = ${table.amendments_accepted} + ${table.amendments_rejected}`),
  }));
  
  // TABLE 2: Bill Implementation Tracking (Post-Passage)
  export const bill_implementations = pgTable("bill_implementations", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Core relationships
    legislative_outcome_id: uuid("legislative_outcome_id").notNull().references(() => legislative_outcomes.id, { onDelete: "cascade" }),
    bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    
    // Implementation status
    implementation_status: varchar("implementation_status", { length: 50 }).notNull(),
    implementation_date: date("implementation_date"),
    implementation_deadline: date("implementation_deadline"),
    implementation_progress_percentage: real("implementation_progress_percentage").notNull().default(0),
    
    // Implementation challenges and tracking
    implementation_challenges: text("implementation_challenges").array().default(sql`'{}'::text[]`),
    milestones_completed: jsonb("milestones_completed").notNull().default(sql`'[]'::jsonb`),
    milestones_pending: jsonb("milestones_pending").notNull().default(sql`'[]'::jsonb`),
    
    // Subsidiary legislation
    regulations_required: smallint("regulations_required").notNull().default(0),
    regulations_published: smallint("regulations_published").notNull().default(0),
    regulations_pending: smallint("regulations_pending").notNull().default(0),
    regulation_details: jsonb("regulation_details").default(sql`'[]'::jsonb`),
    
    // Budgetary allocation
    budget_allocated: numeric("budget_allocated", { precision: 15, scale: 2 }),
    budget_disbursed: numeric("budget_disbursed", { precision: 15, scale: 2 }),
    budget_utilization_percentage: real("budget_utilization_percentage"),
    
    // Impact assessment (measured outcomes)
    beneficiaries_reached: integer("beneficiaries_reached"),
    beneficiary_demographics: jsonb("beneficiary_demographics").default(sql`'{}'::jsonb`),
    geographic_coverage: kenyanCountyEnum("geographic_coverage").array().default(sql`'{}'::kenyan_county[]`),
    economic_impact_estimate: numeric("economic_impact_estimate", { precision: 15, scale: 2 }),
    social_impact_description: text("social_impact_description"),
    environmental_impact_description: text("environmental_impact_description"),
    
    // Unintended consequences
    unintended_consequences: text("unintended_consequences").array().default(sql`'{}'::text[]`),
    mitigation_measures: text("mitigation_measures").array().default(sql`'{}'::text[]`),
    
    // Monitoring and evaluation
    monitoring_framework: jsonb("monitoring_framework").default(sql`'{}'::jsonb`),
    evaluation_reports: text("evaluation_reports").array().default(sql`'{}'::text[]`),
    last_evaluation_date: date("last_evaluation_date"),
    next_evaluation_due: date("next_evaluation_due"),
    
    // Stakeholder feedback post-implementation
    citizen_satisfaction_score: real("citizen_satisfaction_score"),
    civil_society_assessment: text("civil_society_assessment"),
    expert_evaluations: jsonb("expert_evaluations").default(sql`'[]'::jsonb`),
    
    // Compliance and enforcement
    compliance_rate: real("compliance_rate"),
    enforcement_actions: integer("enforcement_actions").notNull().default(0),
    violations_reported: integer("violations_reported").notNull().default(0),
    
    // Data sources
    data_sources: text("data_sources").array().default(sql`'{}'::text[]`),
    verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
    verified_at: timestamp("verified_at"),
    verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    outcomeIdx: uniqueIndex("uniq_implementation_outcome").on(table.legislative_outcome_id),
    billIdx: index("idx_implementation_bill").on(table.bill_id),
    statusIdx: index("idx_implementation_status").on(table.implementation_status),
    progressIdx: index("idx_implementation_progress").on(table.implementation_progress_percentage),
    verificationIdx: index("idx_implementation_verification").on(table.verification_status),
    
    deadlineCheck: check("chk_implementation_deadline", sql`${table.implementation_deadline} IS NULL OR ${table.implementation_deadline} >= ${table.implementation_date}`),
    progressCheck: check("chk_implementation_progress", sql`${table.implementation_progress_percentage} BETWEEN 0 AND 100`),
    regulationsCheck: check("chk_implementation_regulations", sql`${table.regulations_published} + ${table.regulations_pending} <= ${table.regulations_required}`),
  }));
  
  // ============================================================================
  // ATTRIBUTION ASSESSMENTS - NO CHANGES (Well-designed as is)
  // ============================================================================
  
  export const attribution_assessments: any = pgTable("attribution_assessments", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Core relationships
    legislative_outcome_id: uuid("legislative_outcome_id").notNull().references(() => legislative_outcomes.id, { onDelete: "cascade" }),
    bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    
    // Attribution hypothesis
    attribution_type: varchar("attribution_type", { length: 50 }).notNull(),
    attribution_description: text("attribution_description").notNull(),
    attribution_confidence: varchar("attribution_confidence", { length: 20 }).notNull(),
    attribution_narrative: text("attribution_narrative"),
    
    // Evidence documentation
    supporting_evidence: text("supporting_evidence").array().notNull().default(sql`'{}'::text[]`),
    evidence_strength: varchar("evidence_strength", { length: 20 }).notNull(),
    evidence_quality_score: real("evidence_quality_score"),
    evidence_types: text("evidence_types").array().default(sql`'{}'::text[]`),
    
    // Quantitative analysis
    correlation_coefficient: real("correlation_coefficient"),
    statistical_significance_p_value: real("statistical_significance_p_value"),
    confidence_interval_lower: real("confidence_interval_lower"),
    confidence_interval_upper: real("confidence_interval_upper"),
    effect_size: real("effect_size"),
    effect_size_interpretation: varchar("effect_size_interpretation", { length: 20 }),
    
    // Causal inference
    causal_mechanism: text("causal_mechanism").notNull(),
    alternative_explanations: text("alternative_explanations").array().notNull().default(sql`'{}'::text[]`),
    confounding_factors: text("confounding_factors").array().notNull().default(sql`'{}'::text[]`),
    confounding_factors_addressed: jsonb("confounding_factors_addressed").default(sql`'{}'::jsonb`),
    causal_pathway_strength: varchar("causal_pathway_strength", { length: 20 }),
    
    // Temporal analysis
    intervention_start_date: date("intervention_start_date"),
    intervention_end_date: date("intervention_end_date"),
    outcome_lag_days: smallint("outcome_lag_days"),
    temporal_correlation_score: real("temporal_correlation_score"),
    timing_consistency_with_theory: boolean("timing_consistency_with_theory"),
    
    // Participation metrics snapshot
    public_comments_at_outcome: integer("public_comments_at_outcome").notNull().default(0),
    public_votes_at_outcome: integer("public_votes_at_outcome").notNull().default(0),
    campaign_participants_at_outcome: integer("campaign_participants_at_outcome").notNull().default(0),
    actions_completed_at_outcome: integer("actions_completed_at_outcome").notNull().default(0),
    engagement_growth_rate: real("engagement_growth_rate"),
    
    // Comparative analysis
    similar_bills_analyzed: smallint("similar_bills_analyzed").notNull().default(0),
    comparative_outcomes: jsonb("comparative_outcomes").notNull().default(sql`'[]'::jsonb`),
    relative_engagement_level: varchar("relative_engagement_level", { length: 20 }),
    comparative_effect_size: real("comparative_effect_size"),
    difference_in_differences_estimate: real("difference_in_differences_estimate"),
    
    // Attribution quantification
    attribution_percentage: real("attribution_percentage"),
    attribution_percentage_lower_bound: real("attribution_percentage_lower_bound"),
    attribution_percentage_upper_bound: real("attribution_percentage_upper_bound"),
    attribution_calculation_method: varchar("attribution_calculation_method", { length: 100 }),
    
    // Methodology rigor
    analysis_method: varchar("analysis_method", { length: 100 }).notNull(),
    analysis_framework: varchar("analysis_framework", { length: 100 }),
    control_group_used: boolean("control_group_used").notNull().default(false),
    control_group_description: text("control_group_description"),
    randomization_applied: boolean("randomization_applied").notNull().default(false),
    quasi_experimental_design: boolean("quasi_experimental_design").notNull().default(false),
    bias_mitigation_strategies: text("bias_mitigation_strategies").array().default(sql`'{}'::text[]`),
    
    // Review and validation
    peer_reviewed: boolean("peer_reviewed").notNull().default(false),
    number_of_reviewers: smallint("number_of_reviewers").notNull().default(0),
    reviewer_consensus: boolean("reviewer_consensus").notNull().default(false),
    external_validation: boolean("external_validation").notNull().default(false),
    external_validator_organization: varchar("external_validator_organization", { length: 255 }),
    validation_notes: text("validation_notes"),
    methodological_limitations: text("methodological_limitations").array().default(sql`'{}'::text[]`),
    
    // Validity assessment
    internal_validity_score: real("internal_validity_score"),
    external_validity_score: real("external_validity_score"),
    construct_validity_score: real("construct_validity_score"),
    overall_quality_rating: varchar("overall_quality_rating", { length: 20 }),
    
    // Analysis metadata
    analyst_id: uuid("analyst_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    analysis_date: date("analysis_date").notNull(),
    analysis_version: smallint("analysis_version").notNull().default(1),
    supersedes_assessment_id: uuid("supersedes_assessment_id").references(() => attribution_assessments.id, { onDelete: "set null" }),
    
    // Lessons
    key_insights: text("key_insights").array().default(sql`'{}'::text[]`),
    implications_for_future: text("implications_for_future"),
    recommended_follow_up_research: text("recommended_follow_up_research"),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  }, (table) => ({
    outcomeAttributionIdx: index("idx_attribution_outcome_type").on(table.legislative_outcome_id, table.attribution_type),
    billAttributionIdx: index("idx_attribution_bill").on(table.bill_id),
    confidenceEvidenceIdx: index("idx_attribution_confidence_evidence").on(table.attribution_confidence, table.evidence_strength),
    analystDateIdx: index("idx_attribution_analyst_date").on(table.analyst_id, table.analysis_date),
    validationIdx: index("idx_attribution_validation").on(table.peer_reviewed, table.external_validation),
    versionChainIdx: index("idx_attribution_version_chain").on(table.supersedes_assessment_id, table.analysis_version),
    
    uniqueOutcomeTypeAnalyst: uniqueIndex("uniq_outcome_type_analyst_version").on(table.legislative_outcome_id, table.attribution_type, table.analyst_id, table.analysis_version),
    attributionBoundsCheck: check("chk_attribution_bounds", sql`${table.attribution_percentage} BETWEEN 0 AND 100`),
  }));
  
  // ============================================================================
  // SUCCESS STORIES - NO CHANGES (Well-designed as is)
  // ============================================================================
  
  export const success_stories = pgTable("success_stories", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Story identification
    story_title: varchar("story_title", { length: 255 }).notNull(),
    story_slug: varchar("story_slug", { length: 255 }).notNull(),
    story_summary: text("story_summary").notNull(),
    story_category: varchar("story_category", { length: 50 }).notNull(),
    story_tags: text("story_tags").array().default(sql`'{}'::text[]`),
    primary_language: varchar("primary_language", { length: 10 }).notNull().default('en'),
    
    // Relational links
    bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
    campaign_id: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    legislative_outcome_id: uuid("legislative_outcome_id").references(() => legislative_outcomes.id, { onDelete: "set null" }),
    related_attribution_id: uuid("related_attribution_id").references(() => attribution_assessments.id, { onDelete: "set null" }),
    
    // Narrative content
    detailed_narrative: text("detailed_narrative").notNull(),
    key_participants: jsonb("key_participants").notNull().default(sql`'[]'::jsonb`),
    timeline_of_events: jsonb("timeline_of_events").notNull().default(sql`'[]'::jsonb`),
    story_start_date: date("story_start_date").notNull(),
    story_end_date: date("story_end_date"),
    story_duration_days: smallint("story_duration_days"),
    
    // Impact scope
    citizens_involved: integer("citizens_involved"),
    organizations_involved: smallint("organizations_involved"),
    mps_engaged: smallint("mps_engaged"),
    committees_engaged: smallint("committees_engaged"),
    geographic_reach: kenyanCountyEnum("geographic_reach").array().default(sql`'{}'::kenyan_county[]`),
    national_significance: boolean("national_significance").notNull().default(false),
    
    // Measurable outcomes
    policy_changes_achieved: text("policy_changes_achieved").array().notNull().default(sql`'{}'::text[]`),
    transparency_improvements: text("transparency_improvements").array().notNull().default(sql`'{}'::text[]`),
    democratic_participation_increase: text("democratic_participation_increase").array().notNull().default(sql`'{}'::text[]`),
    quantitative_impact_metrics: jsonb("quantitative_impact_metrics").notNull().default(sql`'{}'::jsonb`),
    lives_impacted_estimate: integer("lives_impacted_estimate"),
    economic_value_estimate: numeric("economic_value_estimate", { precision: 15, scale: 2 }),
    
    // Platform contribution
    platform_features_used: text("platform_features_used").array().notNull().default(sql`'{}'::text[]`),
    platform_contribution_description: text("platform_contribution_description").notNull(),
    platform_criticality: varchar("platform_criticality", { length: 20 }),
    without_platform_counterfactual: text("without_platform_counterfactual"),
    platform_innovation_highlighted: text("platform_innovation_highlighted"),
    
    // Verification
    verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
    verification_date: date("verification_date"),
    evidence_documents: text("evidence_documents").array().notNull().default(sql`'{}'::text[]`),
    media_coverage: text("media_coverage").array().notNull().default(sql`'{}'::text[]`),
    official_acknowledgments: text("official_acknowledgments").array().notNull().default(sql`'{}'::text[]`),
    evidence_strength_rating: varchar("evidence_strength_rating", { length: 20 }),
    fact_checking_notes: text("fact_checking_notes"),
    
    // Stakeholder validation
    participant_testimonials: jsonb("participant_testimonials").notNull().default(sql`'[]'::jsonb`),
    expert_validation: text("expert_validation"),
    independent_verification: boolean("independent_verification").notNull().default(false),
    independent_verifier_organization: varchar("independent_verifier_organization", { length: 255 }),
    verification_methodology: text("verification_methodology"),
    
    // Learning and replication
    replicability_assessment: text("replicability_assessment"),
    replicability_score: real("replicability_score"),
    lessons_learned: text("lessons_learned").array().notNull().default(sql`'{}'::text[]`),
    success_factors: text("success_factors").array().notNull().default(sql`'{}'::text[]`),
    challenges_overcome: text("challenges_overcome").array().notNull().default(sql`'{}'::text[]`),
    recommendations_for_replication: text("recommendations_for_replication").array().default(sql`'{}'::text[]`),
    contextual_factors: text("contextual_factors").array().default(sql`'{}'::text[]`),
    
    // Publication
    published: boolean("published").notNull().default(false),
    publication_date: date("publication_date"),
    featured: boolean("featured").notNull().default(false),
    featured_from: date("featured_from"),
    featured_until: date("featured_until"),
    target_audiences: text("target_audiences").array().notNull().default(sql`'{}'::text[]`),
    external_publications: text("external_publications").array().default(sql`'{}'::text[]`),
    multimedia_assets: jsonb("multimedia_assets").default(sql`'[]'::jsonb`),
    
    // Engagement
    views_count: integer("views_count").notNull().default(0),
    shares_count: integer("shares_count").notNull().default(0),
    downloads_count: integer("downloads_count").notNull().default(0),
    citation_count: integer("citation_count").notNull().default(0),
    engagement_rate: real("engagement_rate"),
    
    // SEO
    meta_description: text("meta_description"),
    keywords: text("keywords").array().default(sql`'{}'::text[]`),
    
    // Metadata
    documented_by: uuid("documented_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    co_authors: uuid("co_authors").array().default(sql`'{}'::uuid[]`),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    last_reviewed_at: timestamp("last_reviewed_at"),
  }, (table) => ({
    storySlugIdx: uniqueIndex("uniq_story_slug").on(table.story_slug),
    categoryPublishedIdx: index("idx_story_category_published").on(table.story_category, table.published),
    verificationStatusIdx: index("idx_story_verification").on(table.verification_status),
    featuredPublishedIdx: index("idx_story_featured_published").on(table.featured, table.published),
    billCampaignIdx: index("idx_story_bill_campaign").on(table.bill_id, table.campaign_id),
    geographicReachIdx: index("idx_story_geographic").using("gin", table.geographic_reach),
    storyTagsIdx: index("idx_story_tags").using("gin", table.story_tags),
    publicationDateIdx: index("idx_story_publication_date").on(table.publication_date).where(sql`${table.published} = true`),
    engagementIdx: index("idx_story_engagement").on(table.views_count, table.shares_count),
    
    featuredDatesCheck: check("chk_story_featured_dates", sql`${table.featured_until} IS NULL OR ${table.featured_until} >= ${table.featured_from}`),
    storyDurationCheck: check("chk_story_dates", sql`${table.story_end_date} IS NULL OR ${table.story_end_date} >= ${table.story_start_date}`),
  }));
  
  // ============================================================================
  // EQUITY METRICS - SPLIT INTO THREE DOMAIN-SPECIFIC TABLES
  // ============================================================================
  // Rationale: Geographic, demographic, and digital equity are distinct domains
  // Benefits: Targeted queries, independent analysis, clearer ownership
  
  // TABLE 1: Geographic Equity Metrics
  export const geographic_equity_metrics = pgTable("geographic_equity_metrics", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Measurement period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // County-level distribution
    county_participation_distribution: jsonb("county_participation_distribution").notNull().default(sql`'{}'::jsonb`),
    constituency_coverage_percentage: real("constituency_coverage_percentage"),
    counties_with_zero_participation: smallint("counties_with_zero_participation").notNull().default(0),
    counties_with_low_participation: smallint("counties_with_low_participation").notNull().default(0),
    
    // Urban vs Rural
    urban_participation_rate: real("urban_participation_rate"),
    rural_participation_rate: real("rural_participation_rate"),
    urban_rural_participation_ratio: real("urban_rural_participation_ratio"),
    peri_urban_participation_rate: real("peri_urban_participation_rate"),
    
    // Regional patterns
    regional_distribution: jsonb("regional_distribution").notNull().default(sql`'{}'::jsonb`),
    cross_regional_engagement: real("cross_regional_engagement"),
    
    // Equity indices
    geographic_concentration_index: real("geographic_concentration_index"),
    geographic_equity_index: real("geographic_equity_index").notNull(),
    county_diversity_score: real("county_diversity_score"),
    
    // Offline reach
    offline_session_coverage: jsonb("offline_session_coverage").notNull().default(sql`'{}'::jsonb`),
    ambassador_geographic_distribution: jsonb("ambassador_geographic_distribution").default(sql`'{}'::jsonb`),
    
    // Barriers and interventions
    geographic_barriers_identified: text("geographic_barriers_identified").array().default(sql`'{}'::text[]`),
    infrastructure_gaps: text("infrastructure_gaps").array().default(sql`'{}'::text[]`),
    targeted_outreach_by_county: jsonb("targeted_outreach_by_county").default(sql`'{}'::jsonb`),
    
    // Trends
    month_over_month_change: real("month_over_month_change"),
    year_over_year_change: real("year_over_year_change"),
    trend_direction: varchar("trend_direction", { length: 20 }),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    data_sources_used: text("data_sources_used").array().notNull().default(sql`'{}'::text[]`),
    sample_size: integer("sample_size"),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_geo_equity_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_geo_equity_fiscal_quarter").on(table.fiscal_quarter),
    equityIndexIdx: index("idx_geo_equity_index").on(table.geographic_equity_index),
    trendIdx: index("idx_geo_equity_trend").on(table.trend_direction),
  }));
  
  // TABLE 2: Demographic Equity Metrics
  export const demographic_equity_metrics = pgTable("demographic_equity_metrics", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Measurement period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // Age equity
    age_group_distribution: jsonb("age_group_distribution").notNull().default(sql`'{}'::jsonb`),
    youth_participation_rate: real("youth_participation_rate"),
    senior_participation_rate: real("senior_participation_rate"),
    age_diversity_score: real("age_diversity_score"),
    generational_engagement_gaps: jsonb("generational_engagement_gaps").default(sql`'{}'::jsonb`),
    
    // Gender equity
    gender_participation_distribution: jsonb("gender_participation_distribution").notNull().default(sql`'{}'::jsonb`),
    female_participation_rate: real("female_participation_rate"),
    male_participation_rate: real("male_participation_rate"),
    non_binary_participation_rate: real("non_binary_participation_rate"),
    gender_participation_ratio: real("gender_participation_ratio"),
    gender_parity_score: real("gender_parity_score"),
    
    // Gender in leadership
    campaign_leadership_by_gender: jsonb("campaign_leadership_by_gender").default(sql`'{}'::jsonb`),
    comment_quality_by_gender: jsonb("comment_quality_by_gender").default(sql`'{}'::jsonb`),
    
    // Socioeconomic dimensions
    education_level_distribution: jsonb("education_level_distribution").notNull().default(sql`'{}'::jsonb`),
    occupation_distribution: jsonb("occupation_distribution").notNull().default(sql`'{}'::jsonb`),
    income_bracket_distribution: jsonb("income_bracket_distribution").default(sql`'{}'::jsonb`),
    formal_informal_employment_ratio: real("formal_informal_employment_ratio"),
    
    // Marginalized groups tracking
    persons_with_disabilities_rate: real("persons_with_disabilities_rate"),
    refugee_idp_participation_rate: real("refugee_idp_participation_rate"),
    minority_ethnic_groups_rate: real("minority_ethnic_groups_rate"),
    
    // Participation quality by demographic
    engagement_depth_by_demographic: jsonb("engagement_depth_by_demographic").notNull().default(sql`'{}'::jsonb`),
    voice_amplification_score: real("voice_amplification_score"),
    
    // Composite indices
    demographic_equity_index: real("demographic_equity_index").notNull(),
    intersectional_equity_score: real("intersectional_equity_score"),
    
    // Barriers and interventions
    demographic_barriers: text("demographic_barriers").array().default(sql`'{}'::text[]`),
    targeted_programs: jsonb("targeted_programs").default(sql`'{}'::jsonb`),
    intervention_effectiveness: jsonb("intervention_effectiveness").default(sql`'{}'::jsonb`),
    
    // Trends
    month_over_month_change: real("month_over_month_change"),
    year_over_year_change: real("year_over_year_change"),
    trend_direction: varchar("trend_direction", { length: 20 }),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    data_sources_used: text("data_sources_used").array().notNull().default(sql`'{}'::text[]`),
    sample_size: integer("sample_size"),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_demo_equity_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_demo_equity_fiscal_quarter").on(table.fiscal_quarter),
    equityIndexIdx: index("idx_demo_equity_index").on(table.demographic_equity_index),
    genderParityIdx: index("idx_demo_gender_parity").on(table.gender_parity_score),
    trendIdx: index("idx_demo_equity_trend").on(table.trend_direction),
  }));
  
  // TABLE 3: Digital Inclusion Metrics
  export const digital_inclusion_metrics = pgTable("digital_inclusion_metrics", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Measurement period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // Device access
    mobile_vs_desktop_access: jsonb("mobile_vs_desktop_access").notNull().default(sql`'{}'::jsonb`),
    mobile_only_users_percentage: real("mobile_only_users_percentage"),
    smartphone_vs_feature_phone: jsonb("smartphone_vs_feature_phone").default(sql`'{}'::jsonb`),
    device_diversity_index: real("device_diversity_index"),
    
    // Connectivity patterns
    internet_connectivity_levels: jsonb("internet_connectivity_levels").notNull().default(sql`'{}'::jsonb`),
    average_connection_speed_mbps: real("average_connection_speed_mbps"),
    median_connection_speed_mbps: real("median_connection_speed_mbps"),
    connectivity_reliability_score: real("connectivity_reliability_score"),
    data_cost_burden_by_region: jsonb("data_cost_burden_by_region").default(sql`'{}'::jsonb`),
    
    // Alternative access methods
    ussd_usage_rate: real("ussd_usage_rate"),
    ussd_usage_by_region: jsonb("ussd_usage_by_region").notNull().default(sql`'{}'::jsonb`),
    sms_notification_engagement: real("sms_notification_engagement"),
    offline_mode_usage: real("offline_mode_usage"),
    alternative_access_methods_usage: real("alternative_access_methods_usage"),
    
    // Digital literacy proxy
    digital_literacy_proxy_score: real("digital_literacy_proxy_score"),
    feature_adoption_rate: real("feature_adoption_rate"),
    help_documentation_usage: real("help_documentation_usage"),
    error_recovery_success_rate: real("error_recovery_success_rate"),
    
    // Language and accessibility
    language_usage_distribution: jsonb("language_usage_distribution").notNull().default(sql`'{}'::jsonb`),
    swahili_content_usage_rate: real("swahili_content_usage_rate"),
    english_content_usage_rate: real("english_content_usage_rate"),
    local_language_demand: jsonb("local_language_demand").default(sql`'{}'::jsonb`),
    
    // Accessibility accommodations
    accessibility_accommodation_usage: jsonb("accessibility_accommodation_usage").notNull().default(sql`'{}'::jsonb`),
    screen_reader_usage_rate: real("screen_reader_usage_rate"),
    high_contrast_mode_usage: real("high_contrast_mode_usage"),
    text_size_adjustment_usage: real("text_size_adjustment_usage"),
    keyboard_navigation_usage: real("keyboard_navigation_usage"),
    
    // Content localization effectiveness
    localized_content_effectiveness: jsonb("localized_content_effectiveness").notNull().default(sql`'{}'::jsonb`),
    translation_quality_feedback: jsonb("translation_quality_feedback").default(sql`'{}'::jsonb`),
    
    // Composite indices
    digital_inclusion_index: real("digital_inclusion_index").notNull(),
    connectivity_equity_score: real("connectivity_equity_score"),
    device_equity_score: real("device_equity_score"),
    
    // Digital divide indicators
    digital_divide_severity: varchar("digital_divide_severity", { length: 20 }),
    most_affected_regions: text("most_affected_regions").array().default(sql`'{}'::text[]`),
    infrastructure_gap_priority: jsonb("infrastructure_gap_priority").default(sql`'{}'::jsonb`),
    
    // Intervention tracking
    connectivity_programs_reach: integer("connectivity_programs_reach"),
    device_provision_programs: jsonb("device_provision_programs").default(sql`'{}'::jsonb`),
    digital_literacy_training_participants: integer("digital_literacy_training_participants"),
    intervention_roi_score: real("intervention_roi_score"),
    
    // Trends
    month_over_month_change: real("month_over_month_change"),
    year_over_year_change: real("year_over_year_change"),
    trend_direction: varchar("trend_direction", { length: 20 }),
    
    // Benchmarking
    national_digital_inclusion_benchmark: real("national_digital_inclusion_benchmark"),
    sector_benchmark_comparison: real("sector_benchmark_comparison"),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    data_sources_used: text("data_sources_used").array().notNull().default(sql`'{}'::text[]`),
    sample_size: integer("sample_size"),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_digital_equity_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_digital_equity_fiscal_quarter").on(table.fiscal_quarter),
    inclusionIndexIdx: index("idx_digital_inclusion_index").on(table.digital_inclusion_index),
    mobileOnlyIdx: index("idx_digital_mobile_only").on(table.mobile_only_users_percentage),
    trendIdx: index("idx_digital_equity_trend").on(table.trend_direction),
  }));
  
  // ============================================================================
  // IMPACT INDICATORS - SPLIT INTO FOUR DOMAIN-SPECIFIC TABLES
  // ============================================================================
  // Rationale: Platform, legislative, civic, and financial metrics serve different stakeholders
  // Benefits: Targeted reporting, independent update cycles, clearer ownership
  
  // TABLE 1: Platform Performance Indicators
  export const platform_performance_indicators = pgTable("platform_performance_indicators", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Time period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // User growth and reach
    total_registered_users: integer("total_registered_users").notNull(),
    monthly_active_users: integer("monthly_active_users").notNull(),
    weekly_active_users: integer("weekly_active_users").notNull(),
    daily_active_users: integer("daily_active_users").notNull(),
    new_users_this_period: integer("new_users_this_period").notNull(),
    user_growth_rate: real("user_growth_rate"),
    user_retention_rate: real("user_retention_rate"),
    user_churn_rate: real("user_churn_rate"),
    
    // Engagement depth
    total_sessions: integer("total_sessions").notNull(),
    average_sessions_per_user: real("average_sessions_per_user"),
    average_session_duration_minutes: real("average_session_duration_minutes"),
    median_session_duration_minutes: real("median_session_duration_minutes"),
    bounce_rate: real("bounce_rate"),
    pages_per_session: real("pages_per_session"),
    
    // Content engagement
    total_comments_posted: integer("total_comments_posted").notNull(),
    total_votes_cast: integer("total_votes_cast").notNull(),
    total_bills_tracked: integer("total_bills_tracked").notNull(),
    total_bills_commented_on: integer("total_bills_commented_on").notNull(),
    content_shares: integer("content_shares").notNull(),
    engagement_quality_score: real("engagement_quality_score"),
    
    // System performance
    platform_uptime_percentage: real("platform_uptime_percentage").notNull(),
    average_response_time_ms: integer("average_response_time_ms").notNull(),
    p95_response_time_ms: integer("p95_response_time_ms"),
    p99_response_time_ms: integer("p99_response_time_ms"),
    error_rate: real("error_rate"),
    successful_transaction_rate: real("successful_transaction_rate"),
    api_call_volume: integer("api_call_volume"),
    
    // User satisfaction
    user_satisfaction_score: real("user_satisfaction_score"),
    net_promoter_score: real("net_promoter_score"),
    customer_effort_score: real("customer_effort_score"),
    support_tickets_created: integer("support_tickets_created"),
    support_tickets_resolved: integer("support_tickets_resolved"),
    average_resolution_time_hours: real("average_resolution_time_hours"),
    first_contact_resolution_rate: real("first_contact_resolution_rate"),
    
    // Content volume
    total_bills_in_system: integer("total_bills_in_system").notNull(),
    total_educational_resources: integer("total_educational_resources").notNull(),
    content_creation_rate: real("content_creation_rate"),
    content_update_frequency: real("content_update_frequency"),
    
    // Trends
    period_over_period_growth: real("period_over_period_growth"),
    year_over_year_growth: real("year_over_year_growth"),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    calculated_by: uuid("calculated_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_platform_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_platform_fiscal_quarter").on(table.fiscal_quarter),
    mauIdx: index("idx_platform_mau").on(table.monthly_active_users),
    uptimeIdx: index("idx_platform_uptime").on(table.platform_uptime_percentage),
    
    activeUserLogicCheck: check("chk_platform_active_users", 
      sql`${table.daily_active_users} <= ${table.weekly_active_users} 
      AND ${table.weekly_active_users} <= ${table.monthly_active_users}`),
    uptimeCheck: check("chk_platform_uptime", sql`${table.platform_uptime_percentage} BETWEEN 0 AND 100`),
  }));
  
  // TABLE 2: Legislative Impact Indicators
  export const legislative_impact_indicators = pgTable("legislative_impact_indicators", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Time period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // Bill engagement
    bills_with_platform_engagement: integer("bills_with_platform_engagement").notNull(),
    percentage_of_active_bills_engaged: real("percentage_of_active_bills_engaged"),
    bills_with_high_engagement: integer("bills_with_high_engagement"),
    average_comments_per_bill: real("average_comments_per_bill"),
    average_votes_per_bill: real("average_votes_per_bill"),
    
    // Citizen amendment proposals
    amendments_proposed_by_citizens: integer("amendments_proposed_by_citizens").notNull(),
    amendments_accepted: integer("amendments_accepted").notNull(),
    amendments_rejected: integer("amendments_rejected").notNull(),
    amendment_acceptance_rate: real("amendment_acceptance_rate"),
    
    // Legislative influence
    bills_influenced_count: integer("bills_influenced_count").notNull(),
    bills_influenced_percentage: real("bills_influenced_percentage"),
    bills_amended_with_platform_input: integer("bills_amended_with_platform_input"),
    bills_withdrawn_after_concerns: integer("bills_withdrawn_after_concerns"),
    legislative_responsiveness_score: real("legislative_responsiveness_score"),
    
    // Transparency and analysis
    bills_with_constitutional_analysis: integer("bills_with_constitutional_analysis").notNull(),
    expert_analyses_published: integer("expert_analyses_published").notNull(),
    financial_conflicts_disclosed: integer("financial_conflicts_disclosed").notNull(),
    mp_financial_disclosures_tracked: integer("mp_financial_disclosures_tracked").notNull(),
    transparency_score: real("transparency_score"),
    
    // Accountability outcomes
    accountability_incidents_documented: integer("accountability_incidents_documented").notNull(),
    corruption_cases_highlighted: integer("corruption_cases_highlighted"),
    follow_up_actions_tracked: integer("follow_up_actions_tracked"),
    
    // Parliamentary engagement
    mps_actively_engaging: integer("mps_actively_engaging").notNull(),
    mp_engagement_rate: real("mp_engagement_rate"),
    committees_engaged: integer("committees_engaged"),
    parliamentary_questions_influenced: integer("parliamentary_questions_influenced"),
    
    // Civic participation in legislative process
    citizens_testifying_to_committees: integer("citizens_testifying_to_committees"),
    public_petitions_submitted: integer("public_petitions_submitted"),
    public_petitions_successful: integer("public_petitions_successful"),
    petition_success_rate: real("petition_success_rate"),
    
    // Media and public attention
    media_mentions: integer("media_mentions").notNull(),
    positive_media_mentions: integer("positive_media_mentions").notNull(),
    neutral_media_mentions: integer("neutral_media_mentions").notNull(),
    negative_media_mentions: integer("negative_media_mentions").notNull(),
    media_sentiment_score: real("media_sentiment_score"),
    
    // Trends
    period_over_period_growth: real("period_over_period_growth"),
    year_over_year_growth: real("year_over_year_growth"),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    calculated_by: uuid("calculated_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_legislative_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_legislative_fiscal_quarter").on(table.fiscal_quarter),
    billsInfluencedIdx: index("idx_legislative_bills_influenced").on(table.bills_influenced_percentage),
    responsivityIdx: index("idx_legislative_responsiveness").on(table.legislative_responsiveness_score),
  }));
  
  // TABLE 3: Civic Engagement Indicators
  export const civic_engagement_indicators = pgTable("civic_engagement_indicators", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Time period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // Campaign effectiveness
    active_campaigns: integer("active_campaigns").notNull(),
    completed_campaigns: integer("completed_campaigns").notNull(),
    successful_campaigns: integer("successful_campaigns").notNull(),
    campaign_success_rate: real("campaign_success_rate"),
    average_campaign_participants: real("average_campaign_participants"),
    median_campaign_participants: real("median_campaign_participants"),
    total_advocacy_actions_completed: integer("total_advocacy_actions_completed").notNull(),
    campaign_effectiveness_index: real("campaign_effectiveness_index"),
    
    // Offline engagement
    offline_engagement_sessions: integer("offline_engagement_sessions").notNull(),
    offline_session_participants: integer("offline_session_participants").notNull(),
    average_participants_per_session: real("average_participants_per_session"),
    counties_with_offline_sessions: smallint("counties_with_offline_sessions"),
    
    // Civic education and awareness
    educational_content_views: integer("educational_content_views"),
    educational_content_completions: integer("educational_content_completions"),
    civic_knowledge_improvement: real("civic_knowledge_improvement"),
    legislative_awareness_score: real("legislative_awareness_score"),
    
    // Democratic efficacy
    political_efficacy_increase: real("political_efficacy_increase"),
    trust_in_institutions_change: real("trust_in_institutions_change"),
    perception_of_voice_being_heard: real("perception_of_voice_being_heard"),
    democratic_participation_index: real("democratic_participation_index"),
    
    // Community building
    user_to_user_interactions: integer("user_to_user_interactions"),
    peer_support_exchanges: integer("peer_support_exchanges"),
    community_moderators_active: integer("community_moderators_active"),
    community_health_score: real("community_health_score"),
    
    // Social media reach
    social_media_reach: integer("social_media_reach"),
    social_media_engagement: integer("social_media_engagement"),
    social_media_conversion_rate: real("social_media_conversion_rate"),
    brand_awareness_score: real("brand_awareness_score"),
    
    // Organizational capacity
    active_staff_count: smallint("active_staff_count"),
    active_volunteer_count: smallint("active_volunteer_count"),
    active_ambassador_count: smallint("active_ambassador_count"),
    partner_organizations_count: smallint("partner_organizations_count"),
    
    // Equity achievements
    marginalized_groups_participation_rate: real("marginalized_groups_participation_rate"),
    youth_engagement_rate: real("youth_engagement_rate"),
    rural_digital_inclusion_rate: real("rural_digital_inclusion_rate"),
    gender_parity_score: real("gender_parity_score"),
    overall_equity_score: real("overall_equity_score"),
    
    // Trends
    period_over_period_growth: real("period_over_period_growth"),
    year_over_year_growth: real("year_over_year_growth"),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    calculated_by: uuid("calculated_by").references(() => users.id, { onDelete: "set null" }),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_civic_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_civic_fiscal_quarter").on(table.fiscal_quarter),
    campaignSuccessIdx: index("idx_civic_campaign_success").on(table.campaign_success_rate),
    equityScoreIdx: index("idx_civic_equity_score").on(table.overall_equity_score),
    participationIdx: index("idx_civic_participation_index").on(table.democratic_participation_index),
  }));
  
  // TABLE 4: Financial Sustainability Indicators
  export const financial_sustainability_indicators = pgTable("financial_sustainability_indicators", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
    
    // Time period
    measurement_date: date("measurement_date").notNull(),
    measurement_period: varchar("measurement_period", { length: 20 }).notNull(),
    fiscal_quarter: varchar("fiscal_quarter", { length: 10 }),
    fiscal_year: varchar("fiscal_year", { length: 10 }),
    
    // Revenue streams
    total_revenue: numeric("total_revenue", { precision: 12, scale: 2 }).notNull(),
    grant_revenue: numeric("grant_revenue", { precision: 12, scale: 2 }),
    donation_revenue: numeric("donation_revenue", { precision: 12, scale: 2 }),
    earned_revenue: numeric("earned_revenue", { precision: 12, scale: 2 }),
    other_revenue: numeric("other_revenue", { precision: 12, scale: 2 }),
    
    // Recurring revenue
    monthly_recurring_revenue: numeric("monthly_recurring_revenue", { precision: 12, scale: 2 }),
    recurring_revenue_percentage: real("recurring_revenue_percentage"),
    
    // Fundraising metrics
    total_donors: integer("total_donors"),
    new_donors: integer("new_donors"),
    retained_donors: integer("retained_donors"),
    donor_retention_rate: real("donor_retention_rate"),
    average_donation_amount: numeric("average_donation_amount", { precision: 10, scale: 2 }),
    
    // Grant portfolio
    active_grants: smallint("active_grants"),
    grant_concentration_risk: real("grant_concentration_risk"),
    largest_grant_percentage: real("largest_grant_percentage"),
    grant_renewal_rate: real("grant_renewal_rate"),
    
    // Expenditures
    total_expenses: numeric("total_expenses", { precision: 12, scale: 2 }).notNull(),
    program_expenses: numeric("program_expenses", { precision: 12, scale: 2 }),
    admin_expenses: numeric("admin_expenses", { precision: 12, scale: 2 }),
    fundraising_expenses: numeric("fundraising_expenses", { precision: 12, scale: 2 }),
    program_expense_ratio: real("program_expense_ratio"),
    
    // Financial health
    net_income: numeric("net_income", { precision: 12, scale: 2 }),
    operating_reserve_months: real("operating_reserve_months"),
    current_ratio: real("current_ratio"),
    debt_to_asset_ratio: real("debt_to_asset_ratio"),
    
    // Efficiency metrics
    cost_per_active_user: numeric("cost_per_active_user", { precision: 10, scale: 2 }),
    cost_per_bill_engaged: numeric("cost_per_bill_engaged", { precision: 10, scale: 2 }),
    cost_per_campaign: numeric("cost_per_campaign", { precision: 10, scale: 2 }),
    fundraising_efficiency_ratio: real("fundraising_efficiency_ratio"),
    
    // Impact ROI
    estimated_democratic_value_created: numeric("estimated_democratic_value_created", { precision: 15, scale: 2 }),
    social_return_on_investment: real("social_return_on_investment"),
    cost_effectiveness_score: real("cost_effectiveness_score"),
    
    // Sustainability scoring
    revenue_diversification_score: real("revenue_diversification_score"),
    financial_stability_score: real("financial_stability_score"),
    sustainability_score: real("sustainability_score"),
    
    // Strategic goals
    strategic_goal_achievement_percentage: real("strategic_goal_achievement_percentage"),
    okr_completion_rate: real("okr_completion_rate"),
    annual_target_progress_percentage: real("annual_target_progress_percentage"),
    
    // Trends
    revenue_growth_rate: real("revenue_growth_rate"),
    expense_growth_rate: real("expense_growth_rate"),
    year_over_year_financial_health: real("year_over_year_financial_health"),
    
    // Quality
    data_completeness_score: real("data_completeness_score").notNull().default(100),
    
    // Audit
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    calculated_by: uuid("calculated_by").references(() => users.id, { onDelete: "set null" }),
    calculation_notes: text("calculation_notes"),
  }, (table) => ({
    measurementDateIdx: uniqueIndex("uniq_financial_date_period").on(table.measurement_date, table.measurement_period),
    fiscalQuarterIdx: index("idx_financial_fiscal_quarter").on(table.fiscal_quarter),
    sustainabilityIdx: index("idx_financial_sustainability").on(table.sustainability_score),
    stabilityIdx: index("idx_financial_stability").on(table.financial_stability_score),
  }));
  
  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================
  
  export const participationCohortsRelations = relations(participation_cohorts, ({ one }) => ({
    creator: one(users, {
      fields: [participation_cohorts.created_by],
      references: [users.id],
      relationName: "cohort_creator",
    }),
    baselineCohort: one(participation_cohorts, {
      fields: [participation_cohorts.comparison_baseline_cohort_id],
      references: [participation_cohorts.id],
      relationName: "cohort_comparison",
    }),
  }));
  
  export const legislativeOutcomesRelations = relations(legislative_outcomes, ({ one, many }) => ({
    bill: one(bills, {
      fields: [legislative_outcomes.bill_id],
      references: [bills.id],
    }),
    amendment: one(bill_amendments, {
      fields: [legislative_outcomes.amendment_id],
      references: [bill_amendments.id],
    }),
    verifier: one(users, {
      fields: [legislative_outcomes.verified_by],
      references: [users.id],
      relationName: "outcome_verifier",
    }),
    creator: one(users, {
      fields: [legislative_outcomes.created_by],
      references: [users.id],
      relationName: "outcome_creator",
    }),
    implementation: one(bill_implementations),
    attributionAssessments: many(attribution_assessments),
    successStories: many(success_stories),
  }));
  
  export const billImplementationsRelations = relations(bill_implementations, ({ one }) => ({
    legislativeOutcome: one(legislative_outcomes, {
      fields: [bill_implementations.legislative_outcome_id],
      references: [legislative_outcomes.id],
    }),
    bill: one(bills, {
      fields: [bill_implementations.bill_id],
      references: [bills.id],
    }),
    verifier: one(users, {
      fields: [bill_implementations.verified_by],
      references: [users.id],
      relationName: "implementation_verifier",
    }),
    creator: one(users, {
      fields: [bill_implementations.created_by],
      references: [users.id],
      relationName: "implementation_creator",
    }),
  }));
  
  export const attributionAssessmentsRelations = relations(attribution_assessments, ({ one }) => ({
    legislativeOutcome: one(legislative_outcomes, {
      fields: [attribution_assessments.legislative_outcome_id],
      references: [legislative_outcomes.id],
    }),
    bill: one(bills, {
      fields: [attribution_assessments.bill_id],
      references: [bills.id],
    }),
    analyst: one(users, {
      fields: [attribution_assessments.analyst_id],
      references: [users.id],
      relationName: "assessment_analyst",
    }),
    supersededAssessment: one(attribution_assessments, {
      fields: [attribution_assessments.supersedes_assessment_id],
      references: [attribution_assessments.id],
      relationName: "assessment_version_chain",
    }),
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
    legislativeOutcome: one(legislative_outcomes, {
      fields: [success_stories.legislative_outcome_id],
      references: [legislative_outcomes.id],
    }),
    relatedAttribution: one(attribution_assessments, {
      fields: [success_stories.related_attribution_id],
      references: [attribution_assessments.id],
      relationName: "story_attribution",
    }),
    documentedBy: one(users, {
      fields: [success_stories.documented_by],
      references: [users.id],
      relationName: "story_documenter",
    }),
    verifiedBy: one(users, {
      fields: [success_stories.verified_by],
      references: [users.id],
      relationName: "story_verifier",
    }),
  }));
  
  export const geographicEquityMetricsRelations = relations(geographic_equity_metrics, ({ one }) => ({
    creator: one(users, {
      fields: [geographic_equity_metrics.created_by],
      references: [users.id],
      relationName: "geo_equity_creator",
    }),
  }));
  
  export const demographicEquityMetricsRelations = relations(demographic_equity_metrics, ({ one }) => ({
    creator: one(users, {
      fields: [demographic_equity_metrics.created_by],
      references: [users.id],
      relationName: "demo_equity_creator",
    }),
  }));
  
  export const digitalInclusionMetricsRelations = relations(digital_inclusion_metrics, ({ one }) => ({
    creator: one(users, {
      fields: [digital_inclusion_metrics.created_by],
      references: [users.id],
      relationName: "digital_equity_creator",
    }),
  }));
  
  export const platformPerformanceIndicatorsRelations = relations(platform_performance_indicators, ({ one }) => ({
    calculator: one(users, {
      fields: [platform_performance_indicators.calculated_by],
      references: [users.id],
      relationName: "platform_calculator",
    }),
  }));
  
  export const legislativeImpactIndicatorsRelations = relations(legislative_impact_indicators, ({ one }) => ({
    calculator: one(users, {
      fields: [legislative_impact_indicators.calculated_by],
      references: [users.id],
      relationName: "legislative_calculator",
    }),
  }));
  
  export const civicEngagementIndicatorsRelations = relations(civic_engagement_indicators, ({ one }) => ({
    calculator: one(users, {
      fields: [civic_engagement_indicators.calculated_by],
      references: [users.id],
      relationName: "civic_calculator",
    }),
  }));
  
  export const financialSustainabilityIndicatorsRelations = relations(financial_sustainability_indicators, ({ one }) => ({
    calculator: one(users, {
      fields: [financial_sustainability_indicators.calculated_by],
      references: [users.id],
      relationName: "financial_calculator",
    }),
  }));
  
  // ============================================================================
  // TYPE EXPORTS
  // ============================================================================
  
  export type ParticipationCohort = typeof participation_cohorts.$inferSelect;
  export type NewParticipationCohort = typeof participation_cohorts.$inferInsert;
  
  export type LegislativeOutcome = typeof legislative_outcomes.$inferSelect;
  export type NewLegislativeOutcome = typeof legislative_outcomes.$inferInsert;
  
  export type BillImplementation = typeof bill_implementations.$inferSelect;
  export type NewBillImplementation = typeof bill_implementations.$inferInsert;
  
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
  
  export type PlatformPerformanceIndicator = typeof platform_performance_indicators.$inferSelect;
  export type NewPlatformPerformanceIndicator = typeof platform_performance_indicators.$inferInsert;
  
  export type LegislativeImpactIndicator = typeof legislative_impact_indicators.$inferSelect;
  export type NewLegislativeImpactIndicator = typeof legislative_impact_indicators.$inferInsert;
  
  export type CivicEngagementIndicator = typeof civic_engagement_indicators.$inferSelect;
  export type NewCivicEngagementIndicator = typeof civic_engagement_indicators.$inferInsert;
  
  export type FinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferSelect;
  export type NewFinancialSustainabilityIndicator = typeof financial_sustainability_indicators.$inferInsert;
  
  // ============================================================================
  // SCHEMA METADATA
  // ============================================================================
  
  export const SCHEMA_VERSION = "3.0.0";
  export const REFACTORING_DATE = "2025-11-02";
  
  export const REFACTORING_SUMMARY = {
    tablesAdded: 8, // 3 equity + 4 impact + 1 implementation
    tablesRemoved: 2, // Old equity_metrics, impact_indicators
    tablesRefactored: 1, // legislative_outcomes split
    tablesUnchanged: 3, // participation_cohorts, attribution_assessments, success_stories
    
    rationale: {
      legislative_outcomes: "Separated post-passage implementation tracking from core outcome data",
      equity_metrics: "Split into geographic, demographic, and digital domains for targeted analysis",
      impact_indicators: "Split into platform, legislative, civic, and financial domains for stakeholder-specific reporting",
    },
    
    benefits: [
      "Faster queries: Domain-specific tables reduce unnecessary joins",
      "Independent update cycles: Different metrics can be updated at different frequencies",
      "Clearer ownership: Each table has a clear owner and purpose",
      "Better performance: Smaller tables with focused indexes",
      "Easier maintenance: Changes to one domain don't affect others",
      "Stakeholder alignment: Each stakeholder gets their relevant metrics",
    ],
    
    tradeoffs: [
      "More tables to manage (13 vs 6)",
      "Composite dashboards require joins across multiple tables",
      "Slightly more complex schema to understand initially",
    ],
    
    recommendation: "The refactoring is strongly recommended. The benefits significantly outweigh the tradeoffs, especially as the platform scales."
  } as const;
  
  // ============================================================================
  // QUERY PATTERNS FOR REFACTORED SCHEMA
  // ============================================================================
  
  /**
   * Get complete equity picture for a period
   */
  export const getCompleteEquityMetrics = sql`
    SELECT 
      g.measurement_date,
      g.geographic_equity_index,
      d.demographic_equity_index,
      di.digital_inclusion_index,
      (g.geographic_equity_index + d.demographic_equity_index + di.digital_inclusion_index) / 3 as overall_equity_index
    FROM geographic_equity_metrics g
    JOIN demographic_equity_metrics d 
      ON g.measurement_date = d.measurement_date 
      AND g.measurement_period = d.measurement_period
    JOIN digital_inclusion_metrics di 
      ON g.measurement_date = di.measurement_date 
      AND g.measurement_period = di.measurement_period
    WHERE g.measurement_period = 'monthly'
    ORDER BY g.measurement_date DESC;
  `;
  
  /**
   * Executive dashboard: All indicators for a period
   */
  export const getExecutiveDashboard = sql`
    SELECT 
      p.measurement_date,
      p.monthly_active_users,
      p.user_growth_rate,
      l.bills_influenced_percentage,
      l.legislative_responsiveness_score,
      c.campaign_success_rate,
      c.democratic_participation_index,
      f.sustainability_score,
      f.social_return_on_investment
    FROM platform_performance_indicators p
    JOIN legislative_impact_indicators l 
      ON p.measurement_date = l.measurement_date
    JOIN civic_engagement_indicators c 
      ON p.measurement_date = c.measurement_date
    JOIN financial_sustainability_indicators f 
      ON p.measurement_date = f.measurement_date
    WHERE p.measurement_period = 'monthly'
    ORDER BY p.measurement_date DESC
    LIMIT 12;
  `;
  
  /**
   * Bill lifecycle with outcome and implementation
   */
  export const getBillLifecycle = sql`
    SELECT 
      b.title,
      lo.outcome_type,
      lo.outcome_date,
      lo.public_support_percentage,
      bi.implementation_status,
      bi.implementation_progress_percentage,
      bi.beneficiaries_reached
    FROM bills b
    JOIN legislative_outcomes lo ON b.id = lo.bill_id
    LEFT JOIN bill_implementations bi ON lo.id = bi.legislative_outcome_id
    WHERE b.id = $1;
  `;
  
  // ============================================================================
  // MIGRATION GUIDE
  // ============================================================================
  
  export const MIGRATION_GUIDE = {
    from: "2.0.0 (original schema)",
    to: "3.0.0 (refactored schema)",
    
    steps: [
      {
        step: 1,
        action: "Create new tables",
        tables: [
          "bill_implementations",
          "geographic_equity_metrics",
          "demographic_equity_metrics",
          "digital_inclusion_metrics",
          "platform_performance_indicators",
          "legislative_impact_indicators",
          "civic_engagement_indicators",
          "financial_sustainability_indicators",
        ],
      },
      {
        step: 2,
        action: "Migrate data from legislative_outcomes",
        description: "Split implementation-related fields into bill_implementations table",
        sql: `
          INSERT INTO bill_implementations (
            legislative_outcome_id, bill_id, implementation_status,
            implementation_date, implementation_deadline, ...
          )
          SELECT 
            id, bill_id, implementation_status,
            implementation_date, implementation_deadline, ...
          FROM legislative_outcomes
          WHERE implementation_status IS NOT NULL;
        `,
      },
      {
        step: 3,
        action: "Migrate data from equity_metrics",
        description: "Split into geographic, demographic, and digital tables",
        sql: `
          -- Geographic
          INSERT INTO geographic_equity_metrics (...)
          SELECT measurement_date, county_participation_distribution, ...
          FROM equity_metrics;
          
          -- Demographic
          INSERT INTO demographic_equity_metrics (...)
          SELECT measurement_date, age_group_distribution, ...
          FROM equity_metrics;
          
          -- Digital
          INSERT INTO digital_inclusion_metrics (...)
          SELECT measurement_date, mobile_vs_desktop_access, ...
          FROM equity_metrics;
        `,
      },
      {
        step: 4,
        action: "Migrate data from impact_indicators",
        description: "Split into four domain-specific tables",
        sql: `
          -- Platform
          INSERT INTO platform_performance_indicators (...)
          SELECT measurement_date, total_registered_users, ...
          FROM impact_indicators;
          
          -- Legislative
          INSERT INTO legislative_impact_indicators (...)
          SELECT measurement_date, bills_with_platform_engagement, ...
          FROM impact_indicators;
          
          -- Civic
          INSERT INTO civic_engagement_indicators (...)
          SELECT measurement_date, active_campaigns, ...
          FROM impact_indicators;
          
          -- Financial
          INSERT INTO financial_sustainability_indicators (...)
          SELECT measurement_date, monthly_recurring_revenue, ...
          FROM impact_indicators;
        `,
      },
      {
        step: 5,
        action: "Update application queries",
        description: "Refactor queries to use new table structure",
      },
      {
        step: 6,
        action: "Remove old implementation fields from legislative_outcomes",
        sql: `
          ALTER TABLE legislative_outcomes
          DROP COLUMN implementation_status,
          DROP COLUMN implementation_date,
          DROP COLUMN implementation_deadline,
          ... (all implementation-related columns);
        `,
      },
      {
        step: 7,
        action: "Drop old tables",
        sql: `
          DROP TABLE equity_metrics;
          DROP TABLE impact_indicators;
        `,
      },
    ],
    
    rollbackPlan: "Keep backup of old tables for 90 days. Original tables can be reconstructed by joining refactored tables.",
    
    testingChecklist: [
      "Verify row counts match between old and new tables",
      "Test all dashboard queries against new schema",
      "Verify foreign key relationships are intact",
      "Test equity metrics aggregation across three tables",
      "Test impact indicators aggregation across four tables",
      "Verify implementation tracking for passed bills",
      "Performance test common query patterns",
      "Validate data completeness in all new tables",
    ],
  } as const;