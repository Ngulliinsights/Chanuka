// ============================================================================
// PLATFORM OPERATIONS SCHEMA - REFINED VERSION
// ============================================================================
// Analytics, metrics, and platform performance tracking with enhanced 
// integrity, performance, and observability features

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  engagementTypeEnum,
  billStatusEnum
} from "./enum";

import { bills, users } from "./foundation";
import { comments } from "./citizen_participation";

// ============================================================================
// DATA SOURCES - Track where legislative data comes from
// ============================================================================

export const data_sources = pgTable("data_sources", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Source identification - unique name prevents duplicate configurations
  source_name: varchar("source_name", { length: 255 }).notNull(),
  source_type: varchar("source_type", { length: 100 }).notNull(), 
  // Expected values: "parliament_api", "scraping", "manual_entry", "third_party"
  source_url: varchar("source_url", { length: 1000 }), // Increased from 500 for longer URLs
  
  // Authentication and access - encrypted credentials stored in JSONB
  auth_method: varchar("auth_method", { length: 100 }), 
  // Examples: "oauth2", "api_key", "basic_auth", "none"
  auth_credentials: jsonb("auth_credentials").default(sql`'{}'::jsonb`),
  
  // Data quality metrics - helps prioritize reliable sources
  reliability_score: numeric("reliability_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  last_successful_sync: timestamp("last_successful_sync"),
  sync_failure_count: integer("sync_failure_count").notNull().default(0),
  consecutive_failures: integer("consecutive_failures").notNull().default(0), 
  // New: track consecutive failures for auto-disabling problematic sources
  
  // Configuration - controls sync behavior
  sync_frequency: varchar("sync_frequency", { length: 50 }).notNull().default("daily"),
  // Expected values: "realtime", "hourly", "daily", "weekly", "manual"
  sync_parameters: jsonb("sync_parameters").default(sql`'{}'::jsonb`),
  // Stores source-specific config like rate limits, endpoints, filters
  
  // Status and health - operational monitoring
  is_active: boolean("is_active").notNull().default(true),
  last_health_check: timestamp("last_health_check"),
  health_status: varchar("health_status", { length: 50 }).default("unknown"), 
  // New: "healthy", "degraded", "unhealthy", "unknown"
  health_details: jsonb("health_details").default(sql`'{}'::jsonb`), 
  // New: detailed health metrics and issues
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  created_by: uuid("created_by"), // New: track who configured this source
  
}, (table) => ({
  // Ensures source names are unique across the system
  nameIdx: uniqueIndex("idx_data_sources_name").on(table.source_name),
  
  // Optimizes filtering by type (common query pattern)
  typeIdx: index("idx_data_sources_type").on(table.source_type),
  
  // Supports operational dashboards showing active/inactive sources
  activeIdx: index("idx_data_sources_active").on(table.is_active),
  
  // New: quickly find sources needing attention
  healthIdx: index("idx_data_sources_health").on(table.health_status),
  
  // New: composite index for finding active sources by type (common pattern)
  activeTypeIdx: index("idx_data_sources_active_type").on(table.is_active, table.source_type),
}));

// ============================================================================
// SYNC JOBS - Track data synchronization processes
// ============================================================================

export const sync_jobs = pgTable("sync_jobs", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  data_source_id: uuid("data_source_id").notNull()
    .references(() => data_sources.id, { onDelete: "cascade" }),
  
  // Job identification - name helps identify job purpose in logs
  job_name: varchar("job_name", { length: 255 }).notNull(),
  job_type: varchar("job_type", { length: 100 }).notNull(), 
  // Expected: "full_sync", "incremental", "validation", "backfill"
  
  // Execution details - complete lifecycle tracking
  status: varchar("status", { length: 50 }).notNull().default("queued"), 
  // Lifecycle: "queued" -> "running" -> "completed"/"failed"/"cancelled"
  priority: integer("priority").notNull().default(5), 
  // New: 1-10 scale, higher = more urgent
  
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  duration_seconds: integer("duration_seconds"),
  timeout_seconds: integer("timeout_seconds").default(3600), 
  // New: prevent runaway jobs
  
  // Results tracking - detailed outcome metrics
  records_processed: integer("records_processed").default(0),
  records_created: integer("records_created").default(0),
  records_updated: integer("records_updated").default(0),
  records_deleted: integer("records_deleted").default(0),
  records_skipped: integer("records_skipped").default(0), 
  // New: track intentionally skipped records
  
  // Error handling - comprehensive error tracking
  error_count: integer("error_count").notNull().default(0),
  error_details: jsonb("error_details").default(sql`'[]'::jsonb`),
  // Stores array of error objects with timestamp, message, context
  last_error: text("last_error"),
  retry_count: integer("retry_count").notNull().default(0), 
  // New: track retry attempts
  max_retries: integer("max_retries").default(3), 
  // New: configurable retry limit
  
  // Performance metrics - for optimization and capacity planning
  memory_usage_mb: integer("memory_usage_mb"),
  memory_peak_mb: integer("memory_peak_mb"), 
  // New: track peak memory usage
  cpu_usage_percent: numeric("cpu_usage_percent", { precision: 5, scale: 2 }),
  
  // Progress tracking - enables progress bars in UI
  progress_percent: numeric("progress_percent", { precision: 5, scale: 2 }).default(sql`0`), 
  // New: 0.00 to 100.00
  progress_message: varchar("progress_message", { length: 500 }), 
  // New: human-readable status
  
  // Metadata for diagnostics
  triggered_by: varchar("triggered_by", { length: 50 }).default("scheduled"), 
  // New: "scheduled", "manual", "webhook", "dependency"
  parent_job_id: uuid("parent_job_id"), 
  // New: for job chains and dependencies
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  // Find all jobs for a specific data source
  dataSourceIdx: index("idx_sync_jobs_data_source").on(table.data_source_id),
  
  // Monitor currently running or queued jobs
  statusIdx: index("idx_sync_jobs_status").on(table.status),
  
  // Time-series analysis of job execution
  startedAtIdx: index("idx_sync_jobs_started_at").on(table.started_at),
  
  // New: find jobs by completion time for reporting
  completedAtIdx: index("idx_sync_jobs_completed_at").on(table.completed_at),
  
  // New: priority queue for job scheduling
  statusPriorityIdx: index("idx_sync_jobs_status_priority")
    .on(table.status, table.priority, table.created_at),
  
  // New: track job dependencies and chains
  parentJobIdx: index("idx_sync_jobs_parent").on(table.parent_job_id),
  
  // New: composite index for operational monitoring
  sourceStatusIdx: index("idx_sync_jobs_source_status")
    .on(table.data_source_id, table.status, table.started_at),
}));

// ============================================================================
// EXTERNAL BILL REFERENCES - Links to external bill sources
// ============================================================================

export const external_bill_references = pgTable("external_bill_references", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  bill_id: uuid("bill_id").notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  
  // External reference - connects internal bills to external systems
  external_id: varchar("external_id", { length: 255 }).notNull(),
  external_source: varchar("external_source", { length: 100 }).notNull(),
  // Examples: "parliament_ke", "kenya_law", "hansard", "news_outlet"
  external_url: varchar("external_url", { length: 1000 }), // Increased for long URLs
  
  // Reference metadata - tracks reference quality and status
  reference_type: varchar("reference_type", { length: 50 }).notNull(), 
  // Expected: "official", "news", "analysis", "document", "video"
  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }), 
  // New: 0.00-1.00, how confident we are this reference is correct
  
  last_verified: timestamp("last_verified"),
  last_checked: timestamp("last_checked"), 
  // New: separate checking from verification
  verification_status: varchar("verification_status", { length: 50 })
    .notNull().default("active"),
  // Expected: "active", "broken", "moved", "outdated", "unverified"
  
  // Metadata extracted from external source
  external_metadata: jsonb("external_metadata").default(sql`'{}'::jsonb`), 
  // New: store title, description, publication date, etc.
  
  // Usage tracking
  access_count: integer("access_count").default(0), 
  // New: how often this reference is accessed
  last_accessed: timestamp("last_accessed"), 
  // New: when users last clicked this reference
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  // Prevents duplicate references from same source for same bill
  billExternalUnique: uniqueIndex("external_bill_references_bill_external_unique")
    .on(table.bill_id, table.external_source, table.external_id),
  
  // Find all external references for a bill
  billIdx: index("idx_external_bill_references_bill").on(table.bill_id),
  
  // Find all references from a particular source
  sourceIdx: index("idx_external_bill_references_source").on(table.external_source),
  
  // New: find references needing verification
  verificationIdx: index("idx_external_bill_references_verification")
    .on(table.verification_status, table.last_verified),
  
  // New: optimize lookup by external ID (reverse lookup from external systems)
  externalIdIdx: index("idx_external_bill_references_external_id")
    .on(table.external_source, table.external_id),
}));

// ============================================================================
// ANALYTICS EVENTS - User interaction and engagement tracking
// ============================================================================

export const analytics_events = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Event identification - structured event naming for analysis
  event_name: varchar("event_name", { length: 100 }).notNull(),
  // Convention: "entity_action" (e.g., "bill_viewed", "comment_posted")
  event_category: varchar("event_category", { length: 50 }).notNull(),
  // Examples: "engagement", "navigation", "conversion", "error"
  event_action: varchar("event_action", { length: 50 }), 
  // New: granular action within category
  
  // User context - anonymous and authenticated tracking
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymous_id: varchar("anonymous_id", { length: 255 }), 
  // New: track users before authentication
  session_id: varchar("session_id", { length: 255 }),
  
  // Page/location context - understand user journey
  page_url: varchar("page_url", { length: 1000 }), // Increased from 500
  page_title: varchar("page_title", { length: 255 }),
  referrer_url: varchar("referrer_url", { length: 1000 }),
  referrer_type: varchar("referrer_type", { length: 50 }), 
  // New: "search", "social", "direct", "internal"
  
  // Target entities - what the user interacted with
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
  comment_id: uuid("comment_id").references(() => comments.id, { onDelete: "set null" }),
  user_target_id: uuid("user_target_id"), 
  // New: for events about other users (follows, mentions)
  
  // Event properties - flexible storage for event-specific data
  event_properties: jsonb("event_properties").default(sql`'{}'::jsonb`),
  // Stores event-specific data like vote type, scroll depth, etc.
  
  // Technical context - device and browser fingerprinting
  user_agent: text("user_agent"),
  device_type: varchar("device_type", { length: 50 }), 
  // Examples: "desktop", "mobile", "tablet"
  device_vendor: varchar("device_vendor", { length: 50 }), 
  // New: "Apple", "Samsung", etc.
  browser: varchar("browser", { length: 50 }),
  browser_version: varchar("browser_version", { length: 50 }), 
  // New: track specific versions
  operating_system: varchar("operating_system", { length: 50 }),
  os_version: varchar("os_version", { length: 50 }), 
  // New: track specific versions
  screen_resolution: varchar("screen_resolution", { length: 20 }), 
  // New: "1920x1080"
  
  // Geographic context - location-based analysis
  ip_address: varchar("ip_address", { length: 45 }), // IPv6 compatible
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  county: kenyanCountyEnum("county"), 
  // New: Kenya-specific geography
  latitude: numeric("latitude", { precision: 10, scale: 7 }), 
  // New: precise location
  longitude: numeric("longitude", { precision: 10, scale: 7 }), 
  // New: precise location
  
  // Performance metrics - user experience monitoring
  page_load_time_ms: integer("page_load_time_ms"),
  time_on_page_ms: integer("time_on_page_ms"),
  dom_interactive_ms: integer("dom_interactive_ms"), 
  // New: DOM ready time
  first_paint_ms: integer("first_paint_ms"), 
  // New: first visual change
  
  // A/B testing and experiments
  experiment_id: varchar("experiment_id", { length: 100 }), 
  // New: track experiment exposure
  experiment_variant: varchar("experiment_variant", { length: 50 }), 
  // New: which variant shown
  
  // Timestamp - when event occurred
  created_at: timestamp("created_at").notNull().defaultNow(),
  
}, (table) => ({
  // Find all events for a user
  userIdx: index("idx_analytics_events_user").on(table.user_id),
  
  // Analyze specific event types
  eventIdx: index("idx_analytics_events_event").on(table.event_name),
  
  // Category-based reporting
  categoryIdx: index("idx_analytics_events_category").on(table.event_category),
  
  // Bill-specific analytics
  billIdx: index("idx_analytics_events_bill").on(table.bill_id),
  
  // Session analysis and reconstruction
  sessionIdx: index("idx_analytics_events_session").on(table.session_id),
  
  // Time-series analysis (most important for analytics)
  createdAtIdx: index("idx_analytics_events_created_at").on(table.created_at),
  
  // New: anonymous user tracking before authentication
  anonymousIdx: index("idx_analytics_events_anonymous").on(table.anonymous_id),
  
  // New: geographic analysis
  countyIdx: index("idx_analytics_events_county").on(table.county),
  
  // New: experiment analysis
  experimentIdx: index("idx_analytics_events_experiment")
    .on(table.experiment_id, table.experiment_variant),
  
  // New: composite index for common query pattern: events by user over time
  userTimeIdx: index("idx_analytics_events_user_time")
    .on(table.user_id, table.created_at),
  
  // New: composite index for event funnel analysis
  categoryActionIdx: index("idx_analytics_events_category_action")
    .on(table.event_category, table.event_action, table.created_at),
}));

// ============================================================================
// BILL IMPACT METRICS - Measure bill engagement and impact
// ============================================================================

export const bill_impact_metrics = pgTable("bill_impact_metrics", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  bill_id: uuid("bill_id").notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  
  // Metric identification - structured metric taxonomy
  metric_type: varchar("metric_type", { length: 100 }).notNull(), 
  // Examples: "views", "comments", "votes", "shares", "downloads"
  metric_category: varchar("metric_category", { length: 50 }).notNull(), 
  // Examples: "engagement", "reach", "influence", "sentiment"
  
  // Metric values - supports both counts and calculated metrics
  total_value: numeric("total_value", { precision: 15, scale: 2 }).notNull(), 
  // Increased precision for large numbers
  unique_value: numeric("unique_value", { precision: 15, scale: 2 }),
  average_value: numeric("average_value", { precision: 10, scale: 2 }), 
  // New: mean value
  median_value: numeric("median_value", { precision: 10, scale: 2 }), 
  // New: median for skewed distributions
  
  // Change metrics - track growth and trends
  change_from_previous: numeric("change_from_previous", { precision: 10, scale: 2 }), 
  // New: absolute change
  change_percent: numeric("change_percent", { precision: 10, scale: 2 }), 
  // New: percentage change
  
  // Time period - flexible time-based analysis
  measurement_date: date("measurement_date").notNull(),
  time_period: varchar("time_period", { length: 20 }).notNull(), 
  // Expected: "hourly", "daily", "weekly", "monthly", "quarterly", "total"
  period_start: timestamp("period_start"), 
  // New: exact period boundaries
  period_end: timestamp("period_end"), 
  // New: exact period boundaries
  
  // Demographics breakdown - understand audience composition
  county_breakdown: jsonb("county_breakdown").default(sql`'{}'::jsonb`),
  // Structure: {"nairobi": 450, "mombasa": 230, ...}
  demographic_breakdown: jsonb("demographic_breakdown").default(sql`'{}'::jsonb`),
  // Structure: {"age_18_24": 120, "gender_female": 340, ...}
  
  // Source tracking - where engagement originated
  source_breakdown: jsonb("source_breakdown").default(sql`'{}'::jsonb`),
  // Structure: {"organic": 500, "social": 300, "email": 100}
  platform_breakdown: jsonb("platform_breakdown").default(sql`'{}'::jsonb`), 
  // New: {"web": 600, "mobile": 300, "api": 50}
  
  // Quality indicators
  data_quality_score: numeric("data_quality_score", { precision: 3, scale: 2 }), 
  // New: confidence in metric accuracy
  sample_size: integer("sample_size"), 
  // New: for estimated metrics
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  // Prevents duplicate metrics for same bill/type/period
  billMetricUnique: uniqueIndex("bill_impact_metrics_bill_metric_period_unique")
    .on(table.bill_id, table.metric_type, table.measurement_date, table.time_period),
  
  // Find all metrics for a specific bill
  billIdx: index("idx_bill_impact_metrics_bill").on(table.bill_id),
  
  // Analyze specific metric types across bills
  metricTypeIdx: index("idx_bill_impact_metrics_type").on(table.metric_type),
  
  // Time-series analysis of metrics
  dateIdx: index("idx_bill_impact_metrics_date").on(table.measurement_date),
  
  // New: category-based aggregation
  categoryIdx: index("idx_bill_impact_metrics_category").on(table.metric_category),
  
  // New: composite index for bill metrics over time (most common query)
  billDateIdx: index("idx_bill_impact_metrics_bill_date")
    .on(table.bill_id, table.measurement_date),
  
  // New: find metrics by type and time period
  typeTimePeriodIdx: index("idx_bill_impact_metrics_type_period")
    .on(table.metric_type, table.time_period, table.measurement_date),
}));

// ============================================================================
// COUNTY ENGAGEMENT STATS - Geographic engagement patterns
// ============================================================================

export const county_engagement_stats = pgTable("county_engagement_stats", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  county: kenyanCountyEnum("county").notNull(),
  
  // User metrics - understanding active user base
  active_users: integer("active_users").notNull().default(0),
  new_users: integer("new_users").notNull().default(0), 
  // New: users who joined in period
  returning_users: integer("returning_users").notNull().default(0), 
  // New: users who returned
  total_engagements: integer("total_engagements").notNull().default(0),
  
  // Bill-specific engagement - platform feature usage
  bills_viewed: integer("bills_viewed").notNull().default(0),
  bills_viewed_unique: integer("bills_viewed_unique").notNull().default(0), 
  // New: unique bills viewed
  comments_posted: integer("comments_posted").notNull().default(0),
  votes_cast: integer("votes_cast").notNull().default(0),
  votes_support: integer("votes_support").notNull().default(0), 
  // New: breakdown of vote types
  votes_oppose: integer("votes_oppose").notNull().default(0), 
  // New: breakdown of vote types
  shares_count: integer("shares_count").notNull().default(0), 
  // New: social shares
  
  // Platform usage - session and time metrics
  sessions_count: integer("sessions_count").notNull().default(0),
  average_session_duration: numeric("average_session_duration", { precision: 8, scale: 2 }),
  // In seconds
  median_session_duration: numeric("median_session_duration", { precision: 8, scale: 2 }), 
  // New: median for skewed distributions
  total_time_spent: numeric("total_time_spent", { precision: 12, scale: 2 }), 
  // New: aggregate time in seconds
  
  // Engagement quality - depth of interaction
  avg_engagements_per_user: numeric("avg_engagements_per_user", { precision: 8, scale: 2 }), 
  // New: engagement depth
  avg_bills_per_user: numeric("avg_bills_per_user", { precision: 8, scale: 2 }), 
  // New: breadth of interest
  comment_rate: numeric("comment_rate", { precision: 5, scale: 2 }), 
  // New: percentage of viewers who comment
  
  // Demographics - audience composition
  user_demographics: jsonb("user_demographics").default(sql`'{}'::jsonb`),
  // Structure: {"age_groups": {...}, "gender": {...}, "education": {...}}
  
  // Device and platform
  device_breakdown: jsonb("device_breakdown").default(sql`'{}'::jsonb`), 
  // New: {"mobile": 0.65, "desktop": 0.30, "tablet": 0.05}
  
  // Time period - consistent with other metrics tables
  measurement_date: date("measurement_date").notNull(),
  time_period: varchar("time_period", { length: 20 }).notNull().default("monthly"),
  
  // Trends - comparative analytics
  growth_rate: numeric("growth_rate", { precision: 8, scale: 2 }), 
  // Percentage growth from previous period
  engagement_trend: varchar("engagement_trend", { length: 20 }), 
  // "increasing", "stable", "decreasing"
  rank_by_engagement: integer("rank_by_engagement"), 
  // New: county ranking
  percentile: numeric("percentile", { precision: 5, scale: 2 }), 
  // New: where county falls in distribution
  
  // Comparison metrics
  vs_national_average: numeric("vs_national_average", { precision: 8, scale: 2 }), 
  // New: how county compares to national average
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  // Prevents duplicate stats for same county/date
  countyDateUnique: uniqueIndex("county_engagement_stats_county_date_unique")
    .on(table.county, table.measurement_date, table.time_period),
  
  // Geographic filtering
  countyIdx: index("idx_county_engagement_stats_county").on(table.county),
  
  // Time-series analysis
  dateIdx: index("idx_county_engagement_stats_date").on(table.measurement_date),
  
  // New: find top performing counties
  engagementIdx: index("idx_county_engagement_stats_engagement")
    .on(table.total_engagements, table.measurement_date),
  
  // New: track user growth by county
  usersIdx: index("idx_county_engagement_stats_users")
    .on(table.active_users, table.new_users),
  
  // New: composite for common query: county stats over time
  countyDateTimeIdx: index("idx_county_engagement_stats_county_date_time")
    .on(table.county, table.time_period, table.measurement_date),
}));

// ============================================================================
// TRENDING ANALYSIS - Identify trending bills and topics
// ============================================================================

export const trending_analysis = pgTable("trending_analysis", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Analysis period - when and how long
  analysis_date: date("analysis_date").notNull(),
  time_window_hours: integer("time_window_hours").notNull(),
  analysis_start: timestamp("analysis_start").notNull(), 
  // New: exact analysis boundaries
  analysis_end: timestamp("analysis_end").notNull(), 
  // New: exact analysis boundaries
  
  // Trending bills - what's hot right now
  trending_bills: jsonb("trending_bills").default(sql`'[]'::jsonb`),
  // Structure: [{bill_id, trend_score, rank, change}, ...]
  trending_topics: jsonb("trending_topics").default(sql`'[]'::jsonb`),
  // Structure: [{topic, score, related_bills, change}, ...]
  emerging_topics: jsonb("emerging_topics").default(sql`'[]'::jsonb`), 
  // New: newly appearing topics
  
  // Trend factors - what drives trending
  engagement_velocity: jsonb("engagement_velocity").default(sql`'{}'::jsonb`),
  // Rate of engagement increase per bill
  social_media_mentions: jsonb("social_media_mentions").default(sql`'{}'::jsonb`),
  // External social signals
  news_coverage: jsonb("news_coverage").default(sql`'{}'::jsonb`),
  // Media attention metrics
  search_trends: jsonb("search_trends").default(sql`'{}'::jsonb`), 
  // New: search volume changes
  
  // Geographic trends - where things are trending
  county_trends: jsonb("county_trends").default(sql`'{}'::jsonb`),
  // Which counties show highest engagement per topic
  regional_differences: jsonb("regional_differences").default(sql`'{}'::jsonb`), 
  // New: compare regions
  
  // Sentiment analysis
  sentiment_trends: jsonb("sentiment_trends").default(sql`'{}'::jsonb`), 
  // New: positive/negative sentiment shifts
  
  // Analysis metadata - how analysis was performed
  analysis_method: varchar("analysis_method", { length: 100 }).notNull(),
  // Examples: "velocity_based", "ml_prediction", "composite_score"
  algorithm_version: varchar("algorithm_version", { length: 50 }), 
  // New: track algorithm changes
  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }),
  // 0.00-1.00, how confident in trending predictions
  
  // Statistical measures
  sample_size: integer("sample_size"), 
  // New: number of data points analyzed
  statistical_significance: numeric("statistical_significance", { precision: 5, scale: 4 }), 
  // New: p-value or significance measure
  
  // Performance tracking
  computation_time_ms: integer("computation_time_ms"), 
  // New: how long analysis took
  data_freshness_minutes: integer("data_freshness_minutes"), 
  // New: age of data when analyzed
  
  // Audit fields
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  // Prevents duplicate analysis for same date/window
  dateWindowUnique: uniqueIndex("trending_analysis_date_window_unique")
    .on(table.analysis_date, table.time_window_hours),
  
  // Time-series of trending analysis
  analysisDateIdx: index("idx_trending_analysis_date").on(table.analysis_date),
  
  // New: find analysis by method for comparison
  methodIdx: index("idx_trending_analysis_method").on(table.analysis_method),
  
  // New: track analysis quality
  confidenceIdx: index("idx_trending_analysis_confidence")
    .on(table.confidence_score, table.analysis_date),
  
  // New: composite for finding recent reliable analysis
  dateConfidenceIdx: index("idx_trending_analysis_date_confidence")
    .on(table.analysis_date, table.confidence_score),
}));

// ============================================================================
// USER ENGAGEMENT SUMMARY - Aggregate user activity metrics
// ============================================================================

export const user_engagement_summary = pgTable("user_engagement_summary", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Time period
  measurement_date: date("measurement_date").notNull(),
  time_period: varchar("time_period", { length: 20 }).notNull().default("monthly"),
  
  // Activity metrics
  sessions_count: integer("sessions_count").notNull().default(0),
  total_time_spent_seconds: integer("total_time_spent_seconds").notNull().default(0),
  days_active: integer("days_active").notNull().default(0),
  
  // Content engagement
  bills_viewed: integer("bills_viewed").notNull().default(0),
  bills_viewed_unique: integer("bills_viewed_unique").notNull().default(0),
  comments_posted: integer("comments_posted").notNull().default(0),
  votes_cast: integer("votes_cast").notNull().default(0),
  shares_made: integer("shares_made").notNull().default(0),
  
  // Social engagement
  comments_received: integer("comments_received").notNull().default(0),
  likes_received: integer("likes_received").notNull().default(0),
  mentions_received: integer("mentions_received").notNull().default(0),
  followers_gained: integer("followers_gained").notNull().default(0),
  followers_lost: integer("followers_lost").notNull().default(0),
  
  // Engagement quality
  engagement_score: numeric("engagement_score", { precision: 10, scale: 2 }),
  influence_score: numeric("influence_score", { precision: 10, scale: 2 }),
  
  // Behavioral patterns
  most_active_time: varchar("most_active_time", { length: 50 }),
  most_active_day: varchar("most_active_day", { length: 20 }),
  preferred_device: varchar("preferred_device", { length: 50 }),
  
  // Content preferences
  topic_interests: jsonb("topic_interests").default(sql`'{}'::jsonb`),
  engagement_distribution: jsonb("engagement_distribution").default(sql`'{}'::jsonb`),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  userDateUnique: uniqueIndex("user_engagement_summary_user_date_unique")
    .on(table.user_id, table.measurement_date, table.time_period),
  userIdx: index("idx_user_engagement_summary_user").on(table.user_id),
  dateIdx: index("idx_user_engagement_summary_date").on(table.measurement_date),
  engagementScoreIdx: index("idx_user_engagement_summary_score")
    .on(table.engagement_score, table.measurement_date),
}));

// ============================================================================
// PLATFORM HEALTH METRICS - Overall system health monitoring
// ============================================================================

export const platform_health_metrics = pgTable("platform_health_metrics", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Time period
  measurement_timestamp: timestamp("measurement_timestamp").notNull(),
  measurement_period_minutes: integer("measurement_period_minutes").notNull().default(5),
  
  // System performance
  avg_response_time_ms: integer("avg_response_time_ms"),
  p95_response_time_ms: integer("p95_response_time_ms"),
  p99_response_time_ms: integer("p99_response_time_ms"),
  error_rate: numeric("error_rate", { precision: 5, scale: 4 }),
  
  // Traffic metrics
  requests_total: integer("requests_total"),
  requests_per_second: numeric("requests_per_second", { precision: 10, scale: 2 }),
  unique_visitors: integer("unique_visitors"),
  concurrent_users: integer("concurrent_users"),
  
  // Database metrics
  db_connection_pool_size: integer("db_connection_pool_size"),
  db_active_connections: integer("db_active_connections"),
  db_query_time_avg_ms: integer("db_query_time_avg_ms"),
  db_slow_queries_count: integer("db_slow_queries_count"),
  
  // Cache metrics
  cache_hit_rate: numeric("cache_hit_rate", { precision: 5, scale: 4 }),
  cache_memory_usage_mb: integer("cache_memory_usage_mb"),
  
  // API metrics
  api_calls_total: integer("api_calls_total"),
  api_success_rate: numeric("api_success_rate", { precision: 5, scale: 4 }),
  api_rate_limit_hits: integer("api_rate_limit_hits"),
  
  // Resource utilization
  cpu_usage_percent: numeric("cpu_usage_percent", { precision: 5, scale: 2 }),
  memory_usage_percent: numeric("memory_usage_percent", { precision: 5, scale: 2 }),
  disk_usage_percent: numeric("disk_usage_percent", { precision: 5, scale: 2 }),
  
  // Service status
  services_healthy: integer("services_healthy"),
  services_degraded: integer("services_degraded"),
  services_down: integer("services_down"),
  
  // Alerts and incidents
  alerts_triggered: integer("alerts_triggered").default(0),
  incidents_active: integer("incidents_active").default(0),
  
  // Overall health
  health_score: numeric("health_score", { precision: 3, scale: 2 }),
  health_status: varchar("health_status", { length: 50 }),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  
}, (table) => ({
  timestampUnique: uniqueIndex("platform_health_metrics_timestamp_unique")
    .on(table.measurement_timestamp, table.measurement_period_minutes),
  timestampIdx: index("idx_platform_health_metrics_timestamp")
    .on(table.measurement_timestamp),
  healthStatusIdx: index("idx_platform_health_metrics_status")
    .on(table.health_status, table.measurement_timestamp),
}));

// ============================================================================
// CONTENT PERFORMANCE - Track performance of different content types
// ============================================================================

export const content_performance = pgTable("content_performance", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Content identification
  content_type: varchar("content_type", { length: 50 }).notNull(),
  content_id: uuid("content_id").notNull(),
  
  // Time period
  measurement_date: date("measurement_date").notNull(),
  time_period: varchar("time_period", { length: 20 }).notNull().default("daily"),
  
  // Reach metrics
  impressions: integer("impressions").notNull().default(0),
  unique_views: integer("unique_views").notNull().default(0),
  reach_rate: numeric("reach_rate", { precision: 5, scale: 4 }),
  
  // Engagement metrics
  engagements_total: integer("engagements_total").notNull().default(0),
  engagement_rate: numeric("engagement_rate", { precision: 5, scale: 4 }),
  average_time_spent_seconds: integer("average_time_spent_seconds"),
  scroll_depth_average: numeric("scroll_depth_average", { precision: 5, scale: 2 }),
  
  // Interaction breakdown
  clicks: integer("clicks").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  reactions: integer("reactions").default(0),
  bookmarks: integer("bookmarks").default(0),
  
  // Conversion metrics
  click_through_rate: numeric("click_through_rate", { precision: 5, scale: 4 }),
  conversion_rate: numeric("conversion_rate", { precision: 5, scale: 4 }),
  
  // Audience
  audience_breakdown: jsonb("audience_breakdown").default(sql`'{}'::jsonb`),
  top_counties: jsonb("top_counties").default(sql`'[]'::jsonb`),
  
  // Performance indicators
  virality_score: numeric("virality_score", { precision: 10, scale: 2 }),
  quality_score: numeric("quality_score", { precision: 5, scale: 2 }),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  
}, (table) => ({
  contentUnique: uniqueIndex("content_performance_content_date_unique")
    .on(table.content_type, table.content_id, table.measurement_date, table.time_period),
  contentIdx: index("idx_content_performance_content")
    .on(table.content_type, table.content_id),
  dateIdx: index("idx_content_performance_date").on(table.measurement_date),
  engagementIdx: index("idx_content_performance_engagement")
    .on(table.engagement_rate, table.measurement_date),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const dataSourcesRelations = relations(data_sources, ({ many }) => ({
  syncJobs: many(sync_jobs),
}));

export const syncJobsRelations = relations(sync_jobs, ({ one, many }) => ({
  dataSource: one(data_sources, {
    fields: [sync_jobs.data_source_id],
    references: [data_sources.id],
  }),
  parentJob: one(sync_jobs, {
    fields: [sync_jobs.parent_job_id],
    references: [sync_jobs.id],
  }),
  childJobs: many(sync_jobs),
}));

export const externalBillReferencesRelations = relations(external_bill_references, ({ one }) => ({
  bill: one(bills, {
    fields: [external_bill_references.bill_id],
    references: [bills.id],
  }),
}));

export const analyticsEventsRelations = relations(analytics_events, ({ one }) => ({
  user: one(users, {
    fields: [analytics_events.user_id],
    references: [users.id],
  }),
  bill: one(bills, {
    fields: [analytics_events.bill_id],
    references: [bills.id],
  }),
  comment: one(comments, {
    fields: [analytics_events.comment_id],
    references: [comments.id],
  }),
}));

export const billImpactMetricsRelations = relations(bill_impact_metrics, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_impact_metrics.bill_id],
    references: [bills.id],
  }),
}));

export const countyEngagementStatsRelations = relations(county_engagement_stats, ({ one }) => ({
  // Note: kenyanCountyEnum is an enum, not a table, so this relation is conceptual
  // The actual constraint is enforced by the enum type
}));

export const userEngagementSummaryRelations = relations(user_engagement_summary, ({ one }) => ({
  user: one(users, {
    fields: [user_engagement_summary.user_id],
    references: [users.id],
  }),
}));

export const contentPerformanceRelations = relations(content_performance, ({ one }) => ({
  // Polymorphic relationship - content_id can reference different tables
  // based on content_type. Implement specific relations in application code.
}));

// ============================================================================
// TYPE EXPORTS FOR APPLICATION USE
// ============================================================================

export type DataSource = typeof data_sources.$inferSelect;
export type NewDataSource = typeof data_sources.$inferInsert;

export type SyncJob = typeof sync_jobs.$inferSelect;
export type NewSyncJob = typeof sync_jobs.$inferInsert;

export type ExternalBillReference = typeof external_bill_references.$inferSelect;
export type NewExternalBillReference = typeof external_bill_references.$inferInsert;

export type AnalyticsEvent = typeof analytics_events.$inferSelect;
export type NewAnalyticsEvent = typeof analytics_events.$inferInsert;

export type BillImpactMetric = typeof bill_impact_metrics.$inferSelect;
export type NewBillImpactMetric = typeof bill_impact_metrics.$inferInsert;

export type CountyEngagementStats = typeof county_engagement_stats.$inferSelect;
export type NewCountyEngagementStats = typeof county_engagement_stats.$inferInsert;

export type TrendingAnalysis = typeof trending_analysis.$inferSelect;
export type NewTrendingAnalysis = typeof trending_analysis.$inferInsert;

export type UserEngagementSummary = typeof user_engagement_summary.$inferSelect;
export type NewUserEngagementSummary = typeof user_engagement_summary.$inferInsert;

export type PlatformHealthMetrics = typeof platform_health_metrics.$inferSelect;
export type NewPlatformHealthMetrics = typeof platform_health_metrics.$inferInsert;

export type ContentPerformance = typeof content_performance.$inferSelect;
export type NewContentPerformance = typeof content_performance.$inferInsert;