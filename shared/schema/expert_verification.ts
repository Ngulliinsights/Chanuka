// ============================================================================
// EXPERT VERIFICATION DOMAIN SCHEMA
// ============================================================================
// Expert credentials, verification, and credibility scoring system

import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, jsonb, text, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './foundation';

// ============================================================================
// EXPERT CREDENTIALS
// ============================================================================

export const expertCredentials = pgTable('expert_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  credentialType: varchar('credential_type', { length: 50 }).notNull(), // 'academic', 'professional', 'institutional'
  institution: varchar('institution', { length: 255 }),
  verificationMethod: varchar('verification_method', { length: 50 }), // 'document', 'institutional_email', 'peer_review'
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  expiresAt: timestamp('expires_at'),
  credentialData: jsonb('credential_data'), // Flexible storage for credential details
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_expert_credentials_user').on(table.userId),
  typeIdx: index('idx_expert_credentials_type').on(table.credentialType),
  institutionIdx: index('idx_expert_credentials_institution').on(table.institution),
  verifiedIdx: index('idx_expert_credentials_verified').on(table.verifiedAt),
  expiresIdx: index('idx_expert_credentials_expires').on(table.expiresAt)
}));

// ============================================================================
// EXPERT DOMAINS
// ============================================================================

export const expertDomains = pgTable('expert_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  domainCategory: varchar('domain_category', { length: 100 }).notNull(), // 'constitutional_law', 'healthcare', 'finance', etc.
  expertiseLevel: varchar('expertise_level', { length: 20 }), // 'expert', 'specialist', 'practitioner'
  yearsExperience: integer('years_experience'),
  credentialIds: uuid('credential_ids').array().default([]), // References to supporting credentials
  peerValidations: integer('peer_validations').default(0),
  communityValidations: integer('community_validations').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_expert_domains_user').on(table.userId),
  categoryIdx: index('idx_expert_domains_category').on(table.domainCategory),
  levelIdx: index('idx_expert_domains_level').on(table.expertiseLevel),
  userCategoryUnique: unique('unique_user_domain').on(table.userId, table.domainCategory)
}));

// ============================================================================
// CREDIBILITY SCORES
// ============================================================================

export const credibilityScores = pgTable('credibility_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  domainCategory: varchar('domain_category', { length: 100 }),
  baseScore: decimal('base_score', { precision: 5, scale: 2 }).default('50.0'), // Starting credibility
  expertiseBonus: decimal('expertise_bonus', { precision: 5, scale: 2 }).default('0.0'),
  communityAdjustment: decimal('community_adjustment', { precision: 5, scale: 2 }).default('0.0'),
  peerAdjustment: decimal('peer_adjustment', { precision: 5, scale: 2 }).default('0.0'),
  historicalAccuracy: decimal('historical_accuracy', { precision: 5, scale: 2 }), // Track prediction accuracy
  finalScore: decimal('final_score', { precision: 5, scale: 2 }), // Calculated field
  lastCalculated: timestamp('last_calculated').defaultNow(),
  calculationMetadata: jsonb('calculation_metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userDomainIdx: index('idx_credibility_user_domain').on(table.userId, table.domainCategory),
  finalScoreIdx: index('idx_credibility_final_score').on(table.finalScore),
  userIdx: index('idx_credibility_user').on(table.userId),
  domainIdx: index('idx_credibility_domain').on(table.domainCategory),
  userDomainUnique: unique('unique_user_credibility_domain').on(table.userId, table.domainCategory)
}));

// ============================================================================
// EXPERT REVIEWS
// ============================================================================

export const expertReviews = pgTable('expert_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  expertId: uuid('expert_id').references(() => users.id).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'bill', 'analysis', 'comment'
  entityId: uuid('entity_id').notNull(),
  reviewType: varchar('review_type', { length: 50 }), // 'verification', 'analysis', 'fact_check'
  reviewStatus: varchar('review_status', { length: 20 }), // 'pending', 'approved', 'rejected', 'needs_revision'
  reviewContent: text('review_content'),
  confidenceLevel: decimal('confidence_level', { precision: 3, scale: 2 }), // 0-1 scale
  reviewMetadata: jsonb('review_metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  expertIdx: index('idx_expert_reviews_expert').on(table.expertId),
  entityIdx: index('idx_expert_reviews_entity').on(table.entityType, table.entityId),
  statusIdx: index('idx_expert_reviews_status').on(table.reviewStatus),
  typeIdx: index('idx_expert_reviews_type').on(table.reviewType)
}));

// ============================================================================
// PEER VALIDATIONS
// ============================================================================

export const peerValidations = pgTable('peer_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  validatorId: uuid('validator_id').references(() => users.id).notNull(),
  targetExpertId: uuid('target_expert_id').references(() => users.id).notNull(),
  domainCategory: varchar('domain_category', { length: 100 }),
  validationType: varchar('validation_type', { length: 50 }), // 'endorsement', 'credential_verification', 'expertise_assessment'
  validationScore: decimal('validation_score', { precision: 3, scale: 2 }), // 0-1 scale
  validationReason: text('validation_reason'),
  validationMetadata: jsonb('validation_metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  validatorIdx: index('idx_peer_validations_validator').on(table.validatorId),
  targetIdx: index('idx_peer_validations_target').on(table.targetExpertId),
  domainIdx: index('idx_peer_validations_domain').on(table.domainCategory),
  typeIdx: index('idx_peer_validations_type').on(table.validationType),
  validatorTargetUnique: unique('unique_validator_target_domain').on(table.validatorId, table.targetExpertId, table.domainCategory)
}));

// ============================================================================
// EXPERT ACTIVITY TRACKING
// ============================================================================

export const expertActivity = pgTable('expert_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  expertId: uuid('expert_id').references(() => users.id).notNull(),
  activityType: varchar('activity_type', { length: 50 }), // 'review', 'analysis', 'comment', 'verification'
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  activityScore: decimal('activity_score', { precision: 5, scale: 2 }), // Impact score of the activity
  qualityMetrics: jsonb('quality_metrics'), // Detailed quality assessment
  communityFeedback: jsonb('community_feedback'), // Upvotes, downvotes, comments
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  expertIdx: index('idx_expert_activity_expert').on(table.expertId),
  typeIdx: index('idx_expert_activity_type').on(table.activityType),
  entityIdx: index('idx_expert_activity_entity').on(table.entityType, table.entityId),
  createdIdx: index('idx_expert_activity_created').on(table.createdAt)
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const expertCredentialsRelations = relations(expertCredentials, ({ one }) => ({
  user: one(users, {
    fields: [expertCredentials.userId],
    references: [users.id]
  }),
  verifier: one(users, {
    fields: [expertCredentials.verifiedBy],
    references: [users.id]
  })
}));

export const expertDomainsRelations = relations(expertDomains, ({ one }) => ({
  user: one(users, {
    fields: [expertDomains.userId],
    references: [users.id]
  })
}));

export const credibilityScoresRelations = relations(credibilityScores, ({ one }) => ({
  user: one(users, {
    fields: [credibilityScores.userId],
    references: [users.id]
  })
}));

export const expertReviewsRelations = relations(expertReviews, ({ one }) => ({
  expert: one(users, {
    fields: [expertReviews.expertId],
    references: [users.id]
  })
}));

export const peerValidationsRelations = relations(peerValidations, ({ one }) => ({
  validator: one(users, {
    fields: [peerValidations.validatorId],
    references: [users.id]
  }),
  targetExpert: one(users, {
    fields: [peerValidations.targetExpertId],
    references: [users.id]
  })
}));

export const expertActivityRelations = relations(expertActivity, ({ one }) => ({
  expert: one(users, {
    fields: [expertActivity.expertId],
    references: [users.id]
  })
}));

// ============================================================================
// TYPES
// ============================================================================

export type ExpertCredential = typeof expertCredentials.$inferSelect;
export type NewExpertCredential = typeof expertCredentials.$inferInsert;

export type ExpertDomain = typeof expertDomains.$inferSelect;
export type NewExpertDomain = typeof expertDomains.$inferInsert;

export type CredibilityScore = typeof credibilityScores.$inferSelect;
export type NewCredibilityScore = typeof credibilityScores.$inferInsert;

export type ExpertReview = typeof expertReviews.$inferSelect;
export type NewExpertReview = typeof expertReviews.$inferInsert;

export type PeerValidation = typeof peerValidations.$inferSelect;
export type NewPeerValidation = typeof peerValidations.$inferInsert;

export type ExpertActivity = typeof expertActivity.$inferSelect;
export type NewExpertActivity = typeof expertActivity.$inferInsert;


