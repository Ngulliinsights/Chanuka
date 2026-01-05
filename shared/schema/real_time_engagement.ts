// ============================================================================
// REAL-TIME ENGAGEMENT DOMAIN SCHEMA
// ============================================================================
// Live engagement tracking, gamification, and real-time analytics

import { relations, sql } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp, jsonb, uuid, varchar,
  index, decimal, unique } from 'drizzle-orm/pg-core';

import { users } from './foundation';

// ============================================================================
// ENGAGEMENT EVENTS (Partitioned by time)
// ============================================================================

export const engagementEvents = pgTable('engagement_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'view', 'comment', 'vote', 'share', 'save'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'bill', 'comment', 'analysis'
  entityId: uuid('entity_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }), // Track anonymous sessions
  engagementDuration: integer('engagement_duration'), // Seconds engaged
  engagementDepth: varchar('engagement_depth', { length: 20 }), // 'superficial', 'moderate', 'deep'
  eventMetadata: jsonb('event_metadata'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  referrerUrl: text('referrer_url'),
  deviceType: varchar('device_type', { length: 20 }), // 'mobile', 'tablet', 'desktop'
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  entityIdx: index('idx_engagement_entity').on(table.entityType, table.entityId),
  userIdx: index('idx_engagement_user').on(table.userId),
  sessionIdx: index('idx_engagement_session').on(table.sessionId),
  timeIdx: index('idx_engagement_time').on(table.createdAt),
  typeIdx: index('idx_engagement_type').on(table.eventType),
  depthIdx: index('idx_engagement_depth').on(table.engagementDepth),
  deviceIdx: index('idx_engagement_device').on(table.deviceType)
}));

// ============================================================================
// LIVE METRICS CACHE
// ============================================================================

export const liveMetricsCache = pgTable('live_metrics_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'bill_views', 'comment_count', 'sentiment_score'
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  metricValue: decimal('metric_value', { precision: 10, scale: 2 }).notNull(),
  metricMetadata: jsonb('metric_metadata'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // For TTL-based cleanup
  version: integer('version').default(1) // For optimistic locking
}, (table) => ({
  entityIdx: index('idx_metrics_cache_entity').on(table.entityType, table.entityId),
  typeIdx: index('idx_metrics_cache_type').on(table.metricType),
  expiresIdx: index('idx_metrics_cache_expires').on(table.expiresAt),
  calculatedIdx: index('idx_metrics_cache_calculated').on(table.calculatedAt),
  uniqueMetric: unique('unique_metric_entity').on(table.metricType, table.entityType, table.entityId)
}));

// ============================================================================
// CIVIC ACHIEVEMENTS
// ============================================================================

export const civicAchievements = pgTable('civic_achievements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  achievementName: varchar('achievement_name', { length: 100 }).notNull(),
  achievementCategory: varchar('achievement_category', { length: 50 }), // 'participation', 'quality', 'impact', 'expertise'
  achievementTier: varchar('achievement_tier', { length: 20 }), // 'bronze', 'silver', 'gold', 'platinum'
  pointsValue: integer('points_value').notNull(),
  requirements: jsonb('requirements').notNull(), // Criteria for earning achievement
  iconUrl: varchar('icon_url', { length: 255 }),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: index('idx_achievements_name').on(table.achievementName),
  categoryIdx: index('idx_achievements_category').on(table.achievementCategory),
  tierIdx: index('idx_achievements_tier').on(table.achievementTier),
  pointsIdx: index('idx_achievements_points').on(table.pointsValue),
  activeIdx: index('idx_achievements_active').on(table.isActive),
  sortIdx: index('idx_achievements_sort').on(table.sortOrder)
}));

// ============================================================================
// USER ACHIEVEMENTS
// ============================================================================

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  achievementId: uuid('achievement_id').references(() => civicAchievements.id).notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
  earningContext: jsonb('earning_context'), // What action earned it
  isVisible: boolean('is_visible').default(true), // User can hide achievements
  notificationSent: boolean('notification_sent').default(false)
}, (table) => ({
  userIdx: index('idx_user_achievements_user').on(table.userId),
  achievementIdx: index('idx_user_achievements_achievement').on(table.achievementId),
  earnedIdx: index('idx_user_achievements_earned').on(table.earnedAt),
  visibleIdx: index('idx_user_achievements_visible').on(table.isVisible),
  uniqueUserAchievement: unique('unique_user_achievement').on(table.userId, table.achievementId)
}));

// ============================================================================
// CIVIC SCORES
// ============================================================================

export const civicScores = pgTable('civic_scores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  totalScore: integer('total_score').default(0),
  participationScore: integer('participation_score').default(0),
  qualityScore: integer('quality_score').default(0),
  impactScore: integer('impact_score').default(0),
  expertiseScore: integer('expertise_score').default(0),
  currentRank: integer('current_rank'),
  previousRank: integer('previous_rank'),
  rankChange: integer('rank_change'), // Calculated field
  scoreHistory: jsonb('score_history'), // Track score over time
  lastUpdated: timestamp('last_updated').defaultNow(),
  calculationVersion: varchar('calculation_version', { length: 20 })
}, (table) => ({
  userIdx: unique('unique_civic_score_user').on(table.userId),
  totalScoreIdx: index('idx_civic_scores_total').on(table.totalScore),
  rankIdx: index('idx_civic_scores_rank').on(table.currentRank),
  updatedIdx: index('idx_civic_scores_updated').on(table.lastUpdated)
}));

// ============================================================================
// ENGAGEMENT LEADERBOARDS
// ============================================================================

export const engagementLeaderboards = pgTable('engagement_leaderboards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leaderboardType: varchar('leaderboard_type', { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly', 'all_time'
  category: varchar('category', { length: 50 }), // 'overall', 'comments', 'analysis', 'expertise'
  userId: uuid('user_id').references(() => users.id).notNull(),
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),
  rank: integer('rank').notNull(),
  previousRank: integer('previous_rank'),
  rankChange: integer('rank_change'),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  calculatedAt: timestamp('calculated_at').defaultNow()
}, (table) => ({
  typeIdx: index('idx_leaderboards_type').on(table.leaderboardType),
  categoryIdx: index('idx_leaderboards_category').on(table.category),
  userIdx: index('idx_leaderboards_user').on(table.userId),
  scoreIdx: index('idx_leaderboards_score').on(table.score),
  rankIdx: index('idx_leaderboards_rank').on(table.rank),
  periodIdx: index('idx_leaderboards_period').on(table.periodStart, table.periodEnd),
  uniqueUserPeriod: unique('unique_user_leaderboard_period').on(table.userId, table.leaderboardType, table.category, table.periodStart)
}));

// ============================================================================
// REAL-TIME NOTIFICATIONS
// ============================================================================

export const realTimeNotifications = pgTable('real_time_notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  notificationType: varchar('notification_type', { length: 50 }), // 'achievement', 'mention', 'reply', 'trending'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  isRead: boolean('is_read').default(false),
  isDelivered: boolean('is_delivered').default(false),
  deliveryChannel: varchar('delivery_channel', { length: 50 }), // 'websocket', 'push', 'email'
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  expiresAt: timestamp('expires_at'),
  notificationData: jsonb('notification_data'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  typeIdx: index('idx_notifications_type').on(table.notificationType),
  priorityIdx: index('idx_notifications_priority').on(table.priority),
  readIdx: index('idx_notifications_read').on(table.isRead),
  deliveredIdx: index('idx_notifications_delivered').on(table.isDelivered),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
  expiresIdx: index('idx_notifications_expires').on(table.expiresAt)
}));

// ============================================================================
// ENGAGEMENT ANALYTICS
// ============================================================================

export const engagementAnalytics = pgTable('engagement_analytics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analyticsType: varchar('analytics_type', { length: 50 }), // 'session', 'user_journey', 'conversion', 'retention'
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  userId: uuid('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }),
  analyticsData: jsonb('analytics_data').notNull(),
  calculatedMetrics: jsonb('calculated_metrics'),
  timeframe: varchar('timeframe', { length: 20 }), // 'hourly', 'daily', 'weekly'
  calculatedAt: timestamp('calculated_at').defaultNow()
}, (table) => ({
  typeIdx: index('idx_analytics_type').on(table.analyticsType),
  entityIdx: index('idx_analytics_entity').on(table.entityType, table.entityId),
  userIdx: index('idx_analytics_user').on(table.userId),
  sessionIdx: index('idx_analytics_session').on(table.sessionId),
  timeframeIdx: index('idx_analytics_timeframe').on(table.timeframe),
  calculatedIdx: index('idx_analytics_calculated').on(table.calculatedAt)
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const engagementEventsRelations = relations(engagementEvents, ({ one }) => ({
  user: one(users, {
    fields: [engagementEvents.userId],
    references: [users.id]
  })
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id]
  }),
  achievement: one(civicAchievements, {
    fields: [userAchievements.achievementId],
    references: [civicAchievements.id]
  })
}));

export const civicAchievementsRelations = relations(civicAchievements, ({ many }) => ({
  userAchievements: many(userAchievements)
}));

export const civicScoresRelations = relations(civicScores, ({ one }) => ({
  user: one(users, {
    fields: [civicScores.userId],
    references: [users.id]
  })
}));

export const engagementLeaderboardsRelations = relations(engagementLeaderboards, ({ one }) => ({
  user: one(users, {
    fields: [engagementLeaderboards.userId],
    references: [users.id]
  })
}));

export const realTimeNotificationsRelations = relations(realTimeNotifications, ({ one }) => ({
  user: one(users, {
    fields: [realTimeNotifications.userId],
    references: [users.id]
  })
}));

export const engagementAnalyticsRelations = relations(engagementAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [engagementAnalytics.userId],
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


