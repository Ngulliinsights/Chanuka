// ============================================================================
// REAL-TIME ENGAGEMENT DOMAIN SCHEMA - OPTIMIZED
// ============================================================================
// Live engagement tracking, gamification, and real-time analytics
// Performance optimized for high-volume writes and real-time queries

import { relations, sql } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp, jsonb, uuid, varchar,
  index, decimal, unique, smallint, check } from 'drizzle-orm/pg-core';

import { users } from './foundation';

// ============================================================================
// ENGAGEMENT EVENTS (Time-series optimized, recommend TimescaleDB partitioning)
// ============================================================================

export const engagementEvents = pgTable('engagement_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  event_type: varchar('event_type', { length: 30 }).notNull(), // 'view', 'comment', 'vote', 'share', 'save', 'bookmark', 'follow'
  entity_type: varchar('entity_type', { length: 30 }).notNull(), // 'bill', 'comment', 'analysis', 'user'
  entity_id: uuid('entity_id').notNull(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Allow anonymous tracking
  session_id: varchar('session_id', { length: 64 }), // Shorter for better performance

  // Engagement metrics
  engagement_duration: integer('engagement_duration'), // Seconds engaged (for view events)
  engagement_depth: varchar('engagement_depth', { length: 12 }).default('superficial'), // 'superficial', 'moderate', 'deep'
  scroll_depth: smallint('scroll_depth'), // Percentage scrolled (0-100)
  interaction_count: smallint('interaction_count').default(0), // Clicks, hovers, etc.

  // Technical metadata
  event_metadata: jsonb('event_metadata'), // Flexible additional data
  user_agent: varchar('user_agent', { length: 512 }), // Truncated for performance
  ip_hash: varchar('ip_hash', { length: 64 }), // Store hash instead of raw IP for privacy
  referrer_url: varchar('referrer_url', { length: 512 }), // Truncated
  referrer_type: varchar('referrer_type', { length: 20 }), // 'search', 'social', 'direct', 'internal'
  device_type: varchar('device_type', { length: 10 }).default('desktop'), // 'mobile', 'tablet', 'desktop'

  // Geolocation (optional, for analytics)
  country: varchar('country', { length: 2 }), // ISO country code
  region: varchar('region', { length: 100 }),

  created_at: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // Composite indexes for common query patterns
  entity_time_idx: index('idx_engagement_entity_time').on(table.entity_type, table.entity_id, table.created_at.desc()),
  user_time_idx: index('idx_engagement_user_time').on(table.user_id, table.created_at.desc()),
  type_time_idx: index('idx_engagement_type_time').on(table.event_type, table.created_at.desc()),

  // For session analysis
  session_time_idx: index('idx_engagement_session_time').on(table.session_id, table.created_at),

  // For analytics aggregations
  time_type_entity_idx: index('idx_engagement_time_type_entity').on(table.created_at.desc(), table.event_type, table.entity_type),

  // For device/geo analytics
  device_time_idx: index('idx_engagement_device_time').on(table.device_type, table.created_at.desc()),

  // Constraint for engagement depth
  depthCheck: check('engagement_depth_check', sql`engagement_depth IN ('superficial', 'moderate', 'deep')`)
}));

// ============================================================================
// LIVE METRICS CACHE (High-performance counters)
// ============================================================================

export const liveMetricsCache = pgTable('live_metrics_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  metric_type: varchar('metric_type', { length: 40 }).notNull(),
  entity_type: varchar('entity_type', { length: 30 }).notNull(),
  entity_id: uuid('entity_id').notNull(),

  // Metrics
  metric_value: decimal('metric_value', { precision: 15, scale: 3 }).notNull().default('0'),
  previous_value: decimal('previous_value', { precision: 15, scale: 3 }),
  value_change: decimal('value_change', { precision: 15, scale: 3 }), // Denormalized for quick access
  change_percentage: decimal('change_percentage', { precision: 8, scale: 2 }),

  // Metadata
  metric_metadata: jsonb('metric_metadata'),
  aggregation_period: varchar('aggregation_period', { length: 20 }), // 'realtime', 'hourly', 'daily', 'weekly'

  // Timestamps
  calculated_at: timestamp('calculated_at', { mode: 'date' }).notNull().defaultNow(),
  expires_at: timestamp('expires_at', { mode: 'date' }), // For TTL-based cleanup

  // Versioning for optimistic locking
  version: integer('version').notNull().default(1)
}, (table) => ({
  // Primary lookup pattern
  unique_metric: unique('unique_metric_entity').on(table.metric_type, table.entity_type, table.entity_id, table.aggregation_period),

  // For expiration cleanup jobs
  expires_idx: index('idx_metrics_cache_expires').on(table.expires_at).where(sql`expires_at IS NOT NULL`),

  // For trending calculations
  calculated_value_idx: index('idx_metrics_cache_calculated_value').on(table.calculated_at.desc(), table.metric_value.desc()),

  // For entity-specific queries
  entity_type_idx: index('idx_metrics_cache_entity_type').on(table.entity_type, table.entity_id)
}));

// ============================================================================
// CIVIC ACHIEVEMENTS (Gamification)
// ============================================================================

export const civicAchievements = pgTable('civic_achievements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  achievement_key: varchar('achievement_key', { length: 80 }).notNull().unique(), // Unique identifier for code
  achievement_name: varchar('achievement_name', { length: 100 }).notNull(),
  achievement_category: varchar('achievement_category', { length: 30 }).notNull(), // 'participation', 'quality', 'impact', 'expertise', 'milestone'
  achievement_tier: varchar('achievement_tier', { length: 15 }).notNull().default('bronze'), // 'bronze', 'silver', 'gold', 'platinum', 'diamond'

  // Rewards
  points_value: integer('points_value').notNull().default(0),
  badge_image_url: varchar('badge_image_url', { length: 512 }),

  // Requirements and conditions
  // cSpell:ignore cooldown
  requirements: jsonb('requirements').notNull(), // Criteria for earning
  is_repeatable: boolean('is_repeatable').notNull().default(false),
  cooldown_days: smallint('cooldown_days'), // For repeatable achievements
  max_earns: smallint('max_earns'), // Max times achievement can be earned

  // Display
  description: text('description').notNull(),
  flavor_text: text('flavor_text'), // Fun description
  is_hidden: boolean('is_hidden').default(false), // Secret achievements
  sort_order: integer('sort_order').notNull().default(0),

  // Status
  is_active: boolean('is_active').notNull().default(true),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // Query patterns
  category_tier_idx: index('idx_achievements_category_tier').on(table.achievement_category, table.achievement_tier),
  active_visible_idx: index('idx_achievements_active_visible').on(table.is_active, table.is_hidden, table.sort_order),
  points_idx: index('idx_achievements_points').on(table.points_value.desc()),

  // Constraint checks
  tierCheck: check('achievement_tier_check', sql`achievement_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')`),
  pointsCheck: check('achievement_points_check', sql`points_value >= 0`)
}));

// ============================================================================
// USER ACHIEVEMENTS
// ============================================================================

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievement_id: uuid('achievement_id').notNull().references(() => civicAchievements.id, { onDelete: 'cascade' }),

  // Tracking
  earned_at: timestamp('earned_at', { mode: 'date' }).notNull().defaultNow(),
  times_earned: smallint('times_earned').notNull().default(1), // For repeatable achievements
  earning_context: jsonb('earning_context'), // What action earned it

  // Display preferences
  is_visible: boolean('is_visible').notNull().default(true), // User can hide achievements
  is_pinned: boolean('is_pinned').notNull().default(false), // Pin to profile

  // Notifications
  notification_sent: boolean('notification_sent').notNull().default(false),
  notified_at: timestamp('notified_at', { mode: 'date' })
}, (table) => ({
  // Ensure uniqueness for non-repeatable achievements
  unique_user_achievement: unique('unique_user_achievement').on(table.user_id, table.achievement_id),

  // Query patterns
  user_earned_idx: index('idx_user_achievements_user_earned').on(table.user_id, table.earned_at.desc()),
  achievement_count_idx: index('idx_user_achievements_achievement').on(table.achievement_id),
  visible_pinned_idx: index('idx_user_achievements_visible_pinned').on(table.user_id, table.is_visible, table.is_pinned),

  // Notification queue
  notification_pending_idx: index('idx_user_achievements_notification_pending').on(table.notification_sent, table.earned_at).where(sql`notification_sent = false`)
}));

// ============================================================================
// CIVIC SCORES (User reputation system)
// ============================================================================

export const civicScores = pgTable('civic_scores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Score components
  total_score: integer('total_score').notNull().default(0),
  participation_score: integer('participation_score').notNull().default(0),
  quality_score: integer('quality_score').notNull().default(0),
  impact_score: integer('impact_score').notNull().default(0),
  expertise_score: integer('expertise_score').notNull().default(0),
  consistency_score: integer('consistency_score').notNull().default(0), // Bonus for regular engagement

  // Rankings
  current_rank: integer('current_rank'),
  previous_rank: integer('previous_rank'),
  rank_change: integer('rank_change'),
  best_rank: integer('best_rank'), // All-time best rank

  // Streaks
  current_streak: smallint('current_streak').notNull().default(0), // Consecutive days active
  longest_streak: smallint('longest_streak').notNull().default(0),
  last_active_date: timestamp('last_active_date', { mode: 'date' }),

  // History and metadata
  score_history: jsonb('score_history'), // Track score changes over time
  milestones: jsonb('milestones'), // Score milestones reached

  // Versioning
  last_updated: timestamp('last_updated', { mode: 'date' }).notNull().defaultNow(),
  calculation_version: varchar('calculation_version', { length: 20 }).notNull()
}, (table) => ({
  // Leaderboard queries
  total_score_rank_idx: index('idx_civic_scores_total_rank').on(table.total_score.desc(), table.current_rank),
  rank_idx: index('idx_civic_scores_rank').on(table.current_rank).where(sql`current_rank IS NOT NULL`),

  // Component queries
  participation_idx: index('idx_civic_scores_participation').on(table.participation_score.desc()),
  quality_idx: index('idx_civic_scores_quality').on(table.quality_score.desc()),

  // Streak tracking
  streak_idx: index('idx_civic_scores_streak').on(table.current_streak.desc()),

  // Activity monitoring
  last_active_idx: index('idx_civic_scores_last_active').on(table.last_active_date.desc()),

  // Score constraints
  score_check: check('civic_scores_positive', sql`total_score >= 0 AND participation_score >= 0 AND quality_score >= 0 AND impact_score >= 0 AND expertise_score >= 0`)
}));

// ============================================================================
// ENGAGEMENT LEADERBOARDS (Pre-calculated rankings)
// ============================================================================

export const engagementLeaderboards = pgTable('engagement_leaderboards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leaderboard_type: varchar('leaderboard_type', { length: 30 }).notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'all_time'
  category: varchar('category', { length: 30 }).notNull(), // 'overall', 'comments', 'analysis', 'expertise', 'participation'
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Rankings
  score: decimal('score', { precision: 15, scale: 3 }).notNull(),
  rank: integer('rank').notNull(),
  previous_rank: integer('previous_rank'),
  rank_change: integer('rank_change'),
  percentile: decimal('percentile', { precision: 5, scale: 2 }), // Top X%

  // Period
  period_start: timestamp('period_start', { mode: 'date' }).notNull(),
  period_end: timestamp('period_end', { mode: 'date' }).notNull(),

  // Metadata
  total_participants: integer('total_participants'), // How many users in this leaderboard
  achievements: jsonb('achievements'), // Achievements earned this period

  calculated_at: timestamp('calculated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // Primary query pattern
  unique_user_period: unique('unique_user_leaderboard_period').on(
    table.user_id, table.leaderboard_type, table.category, table.period_start
  ),

  // Leaderboard display
  type_rank_idx: index('idx_leaderboards_type_rank').on(
    table.leaderboard_type, table.category, table.period_start, table.rank
  ),

  // User history
  user_type_idx: index('idx_leaderboards_user_type').on(
    table.user_id, table.leaderboard_type, table.period_start.desc()
  ),

  // Top performers
  score_rank_idx: index('idx_leaderboards_score_rank').on(
    table.leaderboard_type, table.category, table.score.desc()
  ).where(sql`rank <= 100`),

  // Current period queries
  current_period_idx: index('idx_leaderboards_current_period').on(
    table.leaderboard_type, table.category, table.period_end.desc()
  )
}));

// ============================================================================
// REAL-TIME NOTIFICATIONS
// ============================================================================

export const realTimeNotifications = pgTable('real_time_notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Content
  notification_type: varchar('notification_type', { length: 40 }).notNull(), // 'achievement', 'mention', 'reply', 'trending', 'milestone', 'leaderboard'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  action_url: varchar('action_url', { length: 512 }), // Where to navigate on click

  // Related entity
  entity_type: varchar('entity_type', { length: 30 }),
  entity_id: uuid('entity_id'),

  // Metadata
  priority: varchar('priority', { length: 10 }).notNull().default('normal'), // 'low', 'normal', 'high', 'urgent'
  category: varchar('category', { length: 30 }), // For grouping/filtering
  notification_data: jsonb('notification_data'),

  // Status tracking
  is_read: boolean('is_read').notNull().default(false),
  is_delivered: boolean('is_delivered').notNull().default(false),
  is_actioned: boolean('is_actioned').notNull().default(false), // User clicked/interacted

  // Delivery
  delivery_channel: varchar('delivery_channel', { length: 30 }), // 'websocket', 'push', 'email', 'sms'
  delivered_at: timestamp('delivered_at', { mode: 'date' }),
  read_at: timestamp('read_at', { mode: 'date' }),
  actioned_at: timestamp('actioned_at', { mode: 'date' }),

  // Lifecycle
  expires_at: timestamp('expires_at', { mode: 'date' }),
  created_at: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // User inbox queries
  user_unread_idx: index('idx_notifications_user_unread').on(
    table.user_id, table.is_read, table.created_at.desc()
  ).where(sql`is_read = false AND (expires_at IS NULL OR expires_at > NOW())`),

  // All user notifications
  user_created_idx: index('idx_notifications_user_created').on(
    table.user_id, table.created_at.desc()
  ),

  // Type filtering
  user_type_idx: index('idx_notifications_user_type').on(
    table.user_id, table.notification_type, table.created_at.desc()
  ),

  // Priority queue
  priority_idx: index('idx_notifications_priority').on(
    table.priority, table.is_delivered, table.created_at
  ).where(sql`is_delivered = false`),

  // Cleanup queries
  expires_idx: index('idx_notifications_expires').on(
    table.expires_at
  ).where(sql`expires_at IS NOT NULL AND is_read = false`),

  // Analytics
  delivery_stats_idx: index('idx_notifications_delivery_stats').on(
    table.notification_type, table.delivery_channel, table.is_delivered, table.is_read
  ),

  // Constraint checks
  priority_check: check('notification_priority_check', sql`priority IN ('low', 'normal', 'high', 'urgent')`)
}));

// ============================================================================
// ENGAGEMENT ANALYTICS (Aggregated insights)
// ============================================================================

export const engagementAnalytics = pgTable('engagement_analytics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analytics_type: varchar('analytics_type', { length: 40 }).notNull(), // 'session', 'user_journey', 'conversion', 'retention', 'funnel'

  // Scope
  entity_type: varchar('entity_type', { length: 30 }),
  entity_id: uuid('entity_id'),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  session_id: varchar('session_id', { length: 64 }),
  cohort: varchar('cohort', { length: 100 }), // User cohort for analysis

  // Time aggregation
  timeframe: varchar('timeframe', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  period_start: timestamp('period_start', { mode: 'date' }).notNull(),
  period_end: timestamp('period_end', { mode: 'date' }).notNull(),

  // Data
  analytics_data: jsonb('analytics_data').notNull(), // Raw aggregated data
  calculated_metrics: jsonb('calculated_metrics'), // Derived metrics (avg, median, etc.)

  // Metadata
  sample_size: integer('sample_size'), // Number of events/users in calculation
  confidence_score: decimal('confidence_score', { precision: 5, scale: 2 }), // Data quality indicator

  calculated_at: timestamp('calculated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // Time-series queries
  type_period_idx: index('idx_analytics_type_period').on(
    table.analytics_type, table.timeframe, table.period_start.desc()
  ),

  // Entity analytics
  entity_type_idx: index('idx_analytics_entity_type').on(
    table.entity_type, table.entity_id, table.period_start.desc()
  ).where(sql`entity_type IS NOT NULL AND entity_id IS NOT NULL`),

  // User analytics
  user_period_idx: index('idx_analytics_user_period').on(
    table.user_id, table.analytics_type, table.period_start.desc()
  ).where(sql`user_id IS NOT NULL`),

  // Cohort analysis
  cohort_type_idx: index('idx_analytics_cohort_type').on(
    table.cohort, table.analytics_type, table.period_start
  ).where(sql`cohort IS NOT NULL`),

  // Latest calculations
  latest_idx: index('idx_analytics_latest').on(
    table.analytics_type, table.timeframe, table.calculated_at.desc()
  )
}));

// ============================================================================
// USER ENGAGEMENT SUMMARY (Denormalized for quick access)
// ============================================================================

export const userEngagementSummary = pgTable('user_engagement_summary', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Activity counts
  total_views: integer('total_views').notNull().default(0),
  total_comments: integer('total_comments').notNull().default(0),
  total_votes: integer('total_votes').notNull().default(0),
  total_shares: integer('total_shares').notNull().default(0),
  total_followers: integer('total_followers').notNull().default(0),
  total_following: integer('total_following').notNull().default(0),

  // Engagement quality
  avg_engagement_duration: integer('avg_engagement_duration'), // Seconds
  deep_engagement_rate: decimal('deep_engagement_rate', { precision: 5, scale: 2 }), // Percentage

  // Recent activity
  last_activity_at: timestamp('last_activity_at', { mode: 'date' }),
  last_comment_at: timestamp('last_comment_at', { mode: 'date' }),
  last_vote_at: timestamp('last_vote_at', { mode: 'date' }),

  // Activity patterns
  active_days_count: integer('active_days_count').notNull().default(0),
  peak_activity_hour: smallint('peak_activity_hour'), // 0-23
  preferred_device: varchar('preferred_device', { length: 10 }),

  updated_at: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  // Activity queries
  last_activity_idx: index('idx_user_summary_last_activity').on(table.last_activity_at.desc()),
  total_comments_idx: index('idx_user_summary_comments').on(table.total_comments.desc()),
  engagement_rate_idx: index('idx_user_summary_engagement_rate').on(table.deep_engagement_rate.desc())
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const engagementEventsRelations = relations(engagementEvents, ({ one }) => ({
  user: one(users, {
    fields: [engagementEvents.user_id],
    references: [users.id]
  })
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.user_id],
    references: [users.id]
  }),
  achievement: one(civicAchievements, {
    fields: [userAchievements.achievement_id],
    references: [civicAchievements.id]
  })
}));

export const civicAchievementsRelations = relations(civicAchievements, ({ many }) => ({
  userAchievements: many(userAchievements)
}));

export const civicScoresRelations = relations(civicScores, ({ one }) => ({
  user: one(users, {
    fields: [civicScores.user_id],
    references: [users.id]
  })
}));

export const engagementLeaderboardsRelations = relations(engagementLeaderboards, ({ one }) => ({
  user: one(users, {
    fields: [engagementLeaderboards.user_id],
    references: [users.id]
  })
}));

export const realTimeNotificationsRelations = relations(realTimeNotifications, ({ one }) => ({
  user: one(users, {
    fields: [realTimeNotifications.user_id],
    references: [users.id]
  })
}));

export const engagementAnalyticsRelations = relations(engagementAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [engagementAnalytics.user_id],
    references: [users.id]
  })
}));

export const userEngagementSummaryRelations = relations(userEngagementSummary, ({ one }) => ({
  user: one(users, {
    fields: [userEngagementSummary.user_id],
    references: [users.id]
  })
}));

// ============================================================================
// TYPES
// ============================================================================

export type EngagementEvent = typeof engagementEvents.$inferSelect;
export type NewEngagementEvent = typeof engagementEvents.$inferInsert;

export type LiveMetricsCache = typeof liveMetricsCache.$inferSelect;
export type NewLiveMetricsCache = typeof liveMetricsCache.$inferInsert;

export type CivicAchievement = typeof civicAchievements.$inferSelect;
export type NewCivicAchievement = typeof civicAchievements.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

export type CivicScore = typeof civicScores.$inferSelect;
export type NewCivicScore = typeof civicScores.$inferInsert;

export type EngagementLeaderboard = typeof engagementLeaderboards.$inferSelect;
export type NewEngagementLeaderboard = typeof engagementLeaderboards.$inferInsert;

export type RealTimeNotification = typeof realTimeNotifications.$inferSelect;
export type NewRealTimeNotification = typeof realTimeNotifications.$inferInsert;

export type EngagementAnalytics = typeof engagementAnalytics.$inferSelect;
export type NewEngagementAnalytics = typeof engagementAnalytics.$inferInsert;

export type UserEngagementSummary = typeof userEngagementSummary.$inferSelect;
export type NewUserEngagementSummary = typeof userEngagementSummary.$inferInsert;

// ============================================================================
// PERFORMANCE NOTES
// ============================================================================

/*
RECOMMENDED OPTIMIZATIONS:

// cSpell:ignore hypertable
1. TimescaleDB Partitioning (engagementEvents):
   SELECT create_hypertable('engagement_events', 'created_at', chunk_time_interval => INTERVAL '1 week');

2. Retention Policies (auto-cleanup old data):
   SELECT add_retention_policy('engagement_events', INTERVAL '90 days');

3. Continuous Aggregates (for real-time metrics):
   // cSpell:ignore timescaledb
   CREATE MATERIALIZED VIEW engagement_hourly_stats
   WITH (timescaledb.continuous) AS
   SELECT time_bucket('1 hour', created_at) AS hour,
          event_type, entity_type, COUNT(*) as event_count
   FROM engagement_events
   GROUP BY hour, event_type, entity_type;

4. Partial Indexes (save space and improve performance):
   - Active users only indexes
   - Recent data indexes (last 30 days)
   - High-value user indexes

5. Connection Pooling:
   - Use PgBouncer for high-volume write scenarios
   - Separate read replicas for analytics queries

6. Caching Strategy:
   - Redis for hot leaderboards (top 100)
   - Redis for live metrics (5-minute cache)
   - CDN for static achievement images

7. Query Optimization:
   - Use EXPLAIN ANALYZE for slow queries
   - Consider materialized views for complex aggregations
   - Batch inserts for engagement events (use COPY or multi-row inserts)

8. Monitoring:
   - Track index usage: pg_stat_user_indexes
   - Monitor query performance: pg_stat_statements
   - Set up alerts for slow queries (>100ms)
*/
