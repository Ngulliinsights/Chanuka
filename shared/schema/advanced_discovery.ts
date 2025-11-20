// ============================================================================
// ADVANCED DISCOVERY DOMAIN SCHEMA
// ============================================================================
// Search intelligence, discovery patterns, and bill relationship mapping

import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, jsonb, text, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, bills } from './foundation';

// ============================================================================
// SEARCH QUERIES & INTELLIGENCE
// ============================================================================

export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  queryText: text('query_text').notNull(),
  queryIntent: varchar('query_intent', { length: 50 }), // 'exploratory', 'specific', 'comparative', 'monitoring'
  searchContext: jsonb('search_context'), // User context: previous searches, viewed bills, etc.
  filtersApplied: jsonb('filters_applied'),
  resultsReturned: integer('results_returned'),
  resultsClicked: integer('results_clicked'),
  querySatisfaction: decimal('query_satisfaction', { precision: 3, scale: 2 }), // Implicit satisfaction score
  sessionId: varchar('session_id', { length: 255 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_search_user').on(table.userId),
  createdIdx: index('idx_search_created').on(table.createdAt),
  intentIdx: index('idx_search_intent').on(table.queryIntent),
  sessionIdx: index('idx_search_session').on(table.sessionId),
  satisfactionIdx: index('idx_search_satisfaction').on(table.querySatisfaction)
}));

// ============================================================================
// DISCOVERY PATTERNS
// ============================================================================

export const discoveryPatterns = pgTable('discovery_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  patternType: varchar('pattern_type', { length: 50 }), // 'trending', 'controversial', 'related_cluster', 'impact_prediction'
  entityIds: uuid('entity_ids').array().notNull(), // Bills or topics involved in pattern
  patternStrength: decimal('pattern_strength', { precision: 5, scale: 2 }), // How strong the pattern is
  patternMetadata: jsonb('pattern_metadata'), // Details about the pattern
  detectedAt: timestamp('detected_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Patterns are time-bound
  validationCount: integer('validation_count').default(0), // User validations
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // AI confidence
  impactScore: decimal('impact_score', { precision: 5, scale: 2 }), // Predicted impact
  isActive: boolean('is_active').default(true)
}, (table) => ({
  typeIdx: index('idx_discovery_type').on(table.patternType),
  detectedIdx: index('idx_discovery_detected').on(table.detectedAt),
  expiresIdx: index('idx_discovery_expires').on(table.expiresAt),
  strengthIdx: index('idx_discovery_strength').on(table.patternStrength),
  activeIdx: index('idx_discovery_active').on(table.isActive),
  confidenceIdx: index('idx_discovery_confidence').on(table.confidenceScore)
}));

// ============================================================================
// BILL RELATIONSHIPS
// ============================================================================

export const billRelationships = pgTable('bill_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  billAId: uuid('bill_a_id').references(() => bills.id).notNull(),
  billBId: uuid('bill_b_id').references(() => bills.id).notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }), // 'similar', 'conflicting', 'dependent', 'superseding'
  relationshipStrength: decimal('relationship_strength', { precision: 5, scale: 2 }), // 0-100 scale
  relationshipBasis: jsonb('relationship_basis'), // Why they're related
  discoveredBy: varchar('discovered_by', { length: 50 }), // 'automatic', 'expert', 'community'
  discoveredAt: timestamp('discovered_at').defaultNow(),
  validatedBy: uuid('validated_by').references(() => users.id),
  validatedAt: timestamp('validated_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  billAIdx: index('idx_bill_rel_a').on(table.billAId),
  billBIdx: index('idx_bill_rel_b').on(table.billBId),
  typeIdx: index('idx_bill_rel_type').on(table.relationshipType),
  strengthIdx: index('idx_bill_rel_strength').on(table.relationshipStrength),
  discoveredIdx: index('idx_bill_rel_discovered').on(table.discoveredBy),
  activeIdx: index('idx_bill_rel_active').on(table.isActive),
  // Ensure bill_a_id < bill_b_id to prevent duplicates
  uniquePair: unique('unique_bill_pair').on(table.billAId, table.billBId)
}));

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

export const searchAnalytics = pgTable('search_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryId: uuid('query_id').references(() => searchQueries.id),
  analyticsType: varchar('analytics_type', { length: 50 }), // 'click_through', 'dwell_time', 'refinement', 'abandonment'
  entityType: varchar('entity_type', { length: 50 }), // 'bill', 'sponsor', 'topic'
  entityId: uuid('entity_id'),
  analyticsValue: decimal('analytics_value', { precision: 10, scale: 2 }), // Numeric value (time, score, etc.)
  analyticsMetadata: jsonb('analytics_metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  queryIdx: index('idx_search_analytics_query').on(table.queryId),
  typeIdx: index('idx_search_analytics_type').on(table.analyticsType),
  entityIdx: index('idx_search_analytics_entity').on(table.entityType, table.entityId),
  createdIdx: index('idx_search_analytics_created').on(table.createdAt)
}));

// ============================================================================
// TRENDING TOPICS
// ============================================================================

export const trendingTopics = pgTable('trending_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicName: varchar('topic_name', { length: 255 }).notNull(),
  topicCategory: varchar('topic_category', { length: 100 }), // 'policy_area', 'keyword', 'entity'
  trendScore: decimal('trend_score', { precision: 8, scale: 2 }).notNull(),
  trendVelocity: decimal('trend_velocity', { precision: 8, scale: 2 }), // Rate of change
  relatedBillIds: uuid('related_bill_ids').array().default([]),
  searchVolume: integer('search_volume').default(0),
  engagementVolume: integer('engagement_volume').default(0),
  sentimentScore: decimal('sentiment_score', { precision: 3, scale: 2 }), // -1 to 1
  trendMetadata: jsonb('trend_metadata'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
  expiresAt: timestamp('expires_at')
}, (table) => ({
  nameIdx: index('idx_trending_name').on(table.topicName),
  categoryIdx: index('idx_trending_category').on(table.topicCategory),
  scoreIdx: index('idx_trending_score').on(table.trendScore),
  velocityIdx: index('idx_trending_velocity').on(table.trendVelocity),
  calculatedIdx: index('idx_trending_calculated').on(table.calculatedAt),
  expiresIdx: index('idx_trending_expires').on(table.expiresAt)
}));

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

export const userRecommendations = pgTable('user_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  recommendationType: varchar('recommendation_type', { length: 50 }), // 'bill', 'topic', 'expert', 'discussion'
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  recommendationScore: decimal('recommendation_score', { precision: 5, scale: 2 }), // 0-100
  recommendationReason: jsonb('recommendation_reason'), // Why this was recommended
  algorithmVersion: varchar('algorithm_version', { length: 20 }),
  isViewed: boolean('is_viewed').default(false),
  isClicked: boolean('is_clicked').default(false),
  isBookmarked: boolean('is_bookmarked').default(false),
  feedbackScore: decimal('feedback_score', { precision: 3, scale: 2 }), // User feedback
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at')
}, (table) => ({
  userIdx: index('idx_recommendations_user').on(table.userId),
  typeIdx: index('idx_recommendations_type').on(table.recommendationType),
  entityIdx: index('idx_recommendations_entity').on(table.entityType, table.entityId),
  scoreIdx: index('idx_recommendations_score').on(table.recommendationScore),
  viewedIdx: index('idx_recommendations_viewed').on(table.isViewed),
  createdIdx: index('idx_recommendations_created').on(table.createdAt),
  expiresIdx: index('idx_recommendations_expires').on(table.expiresAt)
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const searchQueriesRelations = relations(searchQueries, ({ one, many }) => ({
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id]
  }),
  analytics: many(searchAnalytics)
}));

export const billRelationshipsRelations = relations(billRelationships, ({ one }) => ({
  billA: one(bills, {
    fields: [billRelationships.billAId],
    references: [bills.id]
  }),
  billB: one(bills, {
    fields: [billRelationships.billBId],
    references: [bills.id]
  }),
  validator: one(users, {
    fields: [billRelationships.validatedBy],
    references: [users.id]
  })
}));

export const searchAnalyticsRelations = relations(searchAnalytics, ({ one }) => ({
  query: one(searchQueries, {
    fields: [searchAnalytics.queryId],
    references: [searchQueries.id]
  })
}));

export const userRecommendationsRelations = relations(userRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [userRecommendations.userId],
    references: [users.id]
  })
}));

// ============================================================================
// TYPES
// ============================================================================

export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;

export type DiscoveryPattern = typeof discoveryPatterns.$inferSelect;
export type NewDiscoveryPattern = typeof discoveryPatterns.$inferInsert;

export type BillRelationship = typeof billRelationships.$inferSelect;
export type NewBillRelationship = typeof billRelationships.$inferInsert;

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type NewSearchAnalytics = typeof searchAnalytics.$inferInsert;

export type TrendingTopic = typeof trendingTopics.$inferSelect;
export type NewTrendingTopic = typeof trendingTopics.$inferInsert;

export type UserRecommendation = typeof userRecommendations.$inferSelect;
export type NewUserRecommendation = typeof userRecommendations.$inferInsert;


