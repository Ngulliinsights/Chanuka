/**
 * ML Intelligence Schema - MWANGA Stack
 * 
 * Database schema for ML/AI infrastructure supporting zero-training-first architecture.
 * Includes tables for interaction logging, conflict graphs, vector embeddings, and caching.
 * 
 * @module server/infrastructure/schema/ml_intelligence
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  real,
  doublePrecision,
  jsonb,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './foundation';
import { bills } from './foundation';

// ============================================================================
// ML Interaction Logs (for engagement model training)
// ============================================================================

export const mlInteractions = pgTable(
  'ml_interactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    billId: integer('bill_id').references(() => bills.id, { onDelete: 'cascade' }),
    interactionType: varchar('interaction_type', { length: 50 }).notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    
    // Feature engineering fields
    topicMatchScore: real('topic_match_score').default(0.0),
    hourOfDay: integer('hour_of_day'),
    dayOfWeek: integer('day_of_week'),
    urgencyLevel: integer('urgency_level'),
    contentLength: integer('content_length'),
    userHistoryCount: integer('user_history_count').default(0),
    trendingScore: real('trending_score').default(0.0),
    
    // Outcome
    engaged: boolean('engaged').notNull(),
    engagementDurationSeconds: integer('engagement_duration_seconds'),
    
    // Metadata
    sessionId: varchar('session_id', { length: 255 }),
    deviceType: varchar('device_type', { length: 50 }),
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_ml_interactions_user_id').on(table.userId),
    billIdIdx: index('idx_ml_interactions_bill_id').on(table.billId),
    timestampIdx: index('idx_ml_interactions_timestamp').on(table.timestamp),
    engagedIdx: index('idx_ml_interactions_engaged').on(table.engaged),
    hourCheck: check('hour_of_day_check', 'hour_of_day >= 0 AND hour_of_day < 24'),
    dayCheck: check('day_of_week_check', 'day_of_week >= 0 AND day_of_week < 7'),
    urgencyCheck: check('urgency_level_check', 'urgency_level >= 0 AND urgency_level <= 5'),
  })
);

export const mlInteractionsRelations = relations(mlInteractions, ({ one }) => ({
  user: one(users, {
    fields: [mlInteractions.userId],
    references: [users.id],
  }),
  bill: one(bills, {
    fields: [mlInteractions.billId],
    references: [bills.id],
  }),
}));

// ============================================================================
// Conflict Graph Nodes (for NetworkX conflict detection)
// ============================================================================

export const conflictGraphNodes = pgTable(
  'conflict_graph_nodes',
  {
    id: serial('id').primaryKey(),
    nodeType: varchar('node_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    entityName: varchar('entity_name', { length: 500 }).notNull(),
    
    // Node attributes
    metadata: jsonb('metadata').notNull().default('{}'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lastVerified: timestamp('last_verified'),
  },
  (table) => ({
    typeIdx: index('idx_conflict_nodes_type').on(table.nodeType),
    entityIdIdx: index('idx_conflict_nodes_entity_id').on(table.entityId),
    nameIdx: index('idx_conflict_nodes_name').on(table.entityName),
    uniqueTypeEntity: unique('unique_node_type_entity').on(table.nodeType, table.entityId),
  })
);

// ============================================================================
// Conflict Graph Edges (relationships between nodes)
// ============================================================================

export const conflictGraphEdges = pgTable(
  'conflict_graph_edges',
  {
    id: serial('id').primaryKey(),
    sourceNodeId: integer('source_node_id')
      .notNull()
      .references(() => conflictGraphNodes.id, { onDelete: 'cascade' }),
    targetNodeId: integer('target_node_id')
      .notNull()
      .references(() => conflictGraphNodes.id, { onDelete: 'cascade' }),
    
    relationshipType: varchar('relationship_type', { length: 100 }).notNull(),
    
    // Relationship strength and confidence
    strength: real('strength').default(1.0),
    confidence: real('confidence').default(1.0),
    
    // Source of relationship data
    sourceDocument: varchar('source_document', { length: 500 }),
    sourceUrl: text('source_url'),
    verified: boolean('verified').default(false),
    
    // Temporal validity
    validFrom: timestamp('valid_from', { mode: 'date' }),
    validUntil: timestamp('valid_until', { mode: 'date' }),
    
    // Metadata
    metadata: jsonb('metadata').notNull().default('{}'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index('idx_conflict_edges_source').on(table.sourceNodeId),
    targetIdx: index('idx_conflict_edges_target').on(table.targetNodeId),
    typeIdx: index('idx_conflict_edges_type').on(table.relationshipType),
    bothIdx: index('idx_conflict_edges_both').on(table.sourceNodeId, table.targetNodeId),
    uniqueEdge: unique('unique_edge').on(
      table.sourceNodeId,
      table.targetNodeId,
      table.relationshipType
    ),
    strengthCheck: check('strength_check', 'strength >= 0.0 AND strength <= 1.0'),
    confidenceCheck: check('confidence_check', 'confidence >= 0.0 AND confidence <= 1.0'),
  })
);

export const conflictGraphEdgesRelations = relations(conflictGraphEdges, ({ one }) => ({
  sourceNode: one(conflictGraphNodes, {
    fields: [conflictGraphEdges.sourceNodeId],
    references: [conflictGraphNodes.id],
    relationName: 'sourceEdges',
  }),
  targetNode: one(conflictGraphNodes, {
    fields: [conflictGraphEdges.targetNodeId],
    references: [conflictGraphNodes.id],
    relationName: 'targetEdges',
  }),
}));

// ============================================================================
// Vector Embeddings (optional - if using pgvector instead of ChromaDB)
// ============================================================================

export const vectorEmbeddings = pgTable(
  'vector_embeddings',
  {
    id: serial('id').primaryKey(),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    documentId: varchar('document_id', { length: 255 }).notNull(),
    
    // Document content
    chunkText: text('chunk_text').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    
    // Note: Vector embedding field requires pgvector extension
    // embedding: vector('embedding', { dimensions: 384 }),
    
    // Metadata
    metadata: jsonb('metadata').notNull().default('{}'),
    
    // Source information
    sourceTitle: varchar('source_title', { length: 500 }),
    sourceUrl: text('source_url'),
    sourceSection: varchar('source_section', { length: 255 }),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('idx_vector_embeddings_type').on(table.documentType),
    docIdIdx: index('idx_vector_embeddings_doc_id').on(table.documentId),
    uniqueChunk: unique('unique_chunk').on(
      table.documentType,
      table.documentId,
      table.chunkIndex
    ),
  })
);

// ============================================================================
// Sentiment Analysis Cache
// ============================================================================

export const sentimentCache = pgTable(
  'sentiment_cache',
  {
    id: serial('id').primaryKey(),
    textHash: varchar('text_hash', { length: 64 }).notNull().unique(),
    
    // Sentiment results
    sentiment: varchar('sentiment', { length: 20 }).notNull(),
    confidence: real('confidence').notNull(),
    scores: jsonb('scores').notNull(),
    
    // Analysis metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    language: varchar('language', { length: 10 }),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    accessCount: integer('access_count').default(1),
  },
  (table) => ({
    hashIdx: index('idx_sentiment_cache_hash').on(table.textHash),
    createdIdx: index('idx_sentiment_cache_created').on(table.createdAt),
    confidenceCheck: check('confidence_check', 'confidence >= 0.0 AND confidence <= 1.0'),
  })
);

// ============================================================================
// Constitutional Analysis Cache
// ============================================================================

export const constitutionalAnalysisCache = pgTable(
  'constitutional_analysis_cache',
  {
    id: serial('id').primaryKey(),
    billSectionHash: varchar('bill_section_hash', { length: 64 }).notNull().unique(),
    
    // Analysis results
    relevantArticles: jsonb('relevant_articles').notNull(),
    analysisSummary: text('analysis_summary'),
    riskLevel: varchar('risk_level', { length: 20 }),
    riskScore: real('risk_score'),
    
    // Analysis metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    modelVersion: varchar('model_version', { length: 50 }),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    accessCount: integer('access_count').default(1),
  },
  (table) => ({
    hashIdx: index('idx_constitutional_cache_hash').on(table.billSectionHash),
    riskIdx: index('idx_constitutional_cache_risk').on(table.riskLevel),
    riskScoreCheck: check('risk_score_check', 'risk_score >= 0.0 AND risk_score <= 1.0'),
  })
);

// ============================================================================
// Trojan Bill Detection Results
// ============================================================================

export const trojanBillDetections = pgTable(
  'trojan_bill_detections',
  {
    id: serial('id').primaryKey(),
    billId: integer('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    
    // Detection scores
    overallRiskScore: real('overall_risk_score').notNull(),
    riskLevel: varchar('risk_level', { length: 20 }).notNull(),
    
    // Individual risk factors
    structuralAnomalyScore: real('structural_anomaly_score'),
    urgencyManipulationScore: real('urgency_manipulation_score'),
    consultationAdequacyScore: real('consultation_adequacy_score'),
    scheduleDensityScore: real('schedule_density_score'),
    amendmentComplexityScore: real('amendment_complexity_score'),
    
    // Findings
    findings: jsonb('findings').notNull(),
    
    // Analysis metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    billIdIdx: index('idx_trojan_detections_bill_id').on(table.billId),
    riskLevelIdx: index('idx_trojan_detections_risk_level').on(table.riskLevel),
    scoreIdx: index('idx_trojan_detections_score').on(table.overallRiskScore),
    riskScoreCheck: check(
      'overall_risk_score_check',
      'overall_risk_score >= 0.0 AND overall_risk_score <= 1.0'
    ),
  })
);

export const trojanBillDetectionsRelations = relations(trojanBillDetections, ({ one }) => ({
  bill: one(bills, {
    fields: [trojanBillDetections.billId],
    references: [bills.id],
  }),
}));

// ============================================================================
// ML Model Metadata (for tracking model versions and performance)
// ============================================================================

export const mlModelMetadata = pgTable(
  'ml_model_metadata',
  {
    id: serial('id').primaryKey(),
    modelName: varchar('model_name', { length: 100 }).notNull(),
    modelVersion: varchar('model_version', { length: 50 }).notNull(),
    
    // Model details
    modelType: varchar('model_type', { length: 50 }).notNull(),
    modelPath: text('model_path'),
    
    // Training metadata
    trainedAt: timestamp('trained_at'),
    trainingSamples: integer('training_samples'),
    trainingDurationSeconds: integer('training_duration_seconds'),
    
    // Performance metrics
    accuracy: real('accuracy'),
    precisionScore: real('precision_score'),
    recall: real('recall'),
    f1Score: real('f1_score'),
    metrics: jsonb('metrics'),
    
    // Status
    isActive: boolean('is_active').default(false),
    deployedAt: timestamp('deployed_at'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_ml_models_name').on(table.modelName),
    activeIdx: index('idx_ml_models_active').on(table.isActive),
    uniqueVersion: unique('unique_model_version').on(table.modelName, table.modelVersion),
  })
);

// ============================================================================
// Conflict Detection Results Cache
// ============================================================================

export const conflictDetectionCache = pgTable(
  'conflict_detection_cache',
  {
    id: serial('id').primaryKey(),
    billId: integer('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    sponsorId: integer('sponsor_id'),
    
    // Detection results
    hasConflict: boolean('has_conflict').notNull(),
    conflictType: varchar('conflict_type', { length: 50 }),
    confidence: real('confidence'),
    
    // Conflict details
    conflictPath: jsonb('conflict_path'),
    narrative: text('narrative'),
    
    // Analysis metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
  },
  (table) => ({
    billIdIdx: index('idx_conflict_cache_bill_id').on(table.billId),
    sponsorIdx: index('idx_conflict_cache_sponsor').on(table.sponsorId),
    hasConflictIdx: index('idx_conflict_cache_has_conflict').on(table.hasConflict),
    confidenceCheck: check('confidence_check', 'confidence >= 0.0 AND confidence <= 1.0'),
  })
);

export const conflictDetectionCacheRelations = relations(
  conflictDetectionCache,
  ({ one }) => ({
    bill: one(bills, {
      fields: [conflictDetectionCache.billId],
      references: [bills.id],
    }),
  })
);

// ============================================================================
// Engagement Predictions (for A/B testing and monitoring)
// ============================================================================

export const engagementPredictions = pgTable(
  'engagement_predictions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    billId: integer('bill_id').references(() => bills.id, { onDelete: 'cascade' }),
    
    // Prediction
    predictedEngagementScore: real('predicted_engagement_score').notNull(),
    predictionTier: varchar('prediction_tier', { length: 20 }).notNull(),
    
    // Features used
    features: jsonb('features').notNull(),
    
    // Actual outcome (filled in later)
    actualEngaged: boolean('actual_engaged'),
    predictionCorrect: boolean('prediction_correct'),
    
    // Timestamps
    predictedAt: timestamp('predicted_at').notNull().defaultNow(),
    outcomeRecordedAt: timestamp('outcome_recorded_at'),
  },
  (table) => ({
    userIdx: index('idx_engagement_predictions_user').on(table.userId),
    billIdx: index('idx_engagement_predictions_bill').on(table.billId),
    predictedAtIdx: index('idx_engagement_predictions_predicted_at').on(table.predictedAt),
    scoreCheck: check(
      'predicted_engagement_score_check',
      'predicted_engagement_score >= 0.0 AND predicted_engagement_score <= 1.0'
    ),
  })
);

export const engagementPredictionsRelations = relations(
  engagementPredictions,
  ({ one }) => ({
    user: one(users, {
      fields: [engagementPredictions.userId],
      references: [users.id],
    }),
    bill: one(bills, {
      fields: [engagementPredictions.billId],
      references: [bills.id],
    }),
  })
);

// ============================================================================
// Bill Summarization Cache
// ============================================================================

export const billSummarizationCache = pgTable(
  'bill_summarization_cache',
  {
    id: serial('id').primaryKey(),
    billId: integer('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    billHash: varchar('bill_hash', { length: 64 }).notNull(),
    
    // Summarization parameters
    summarizationType: varchar('summarization_type', { length: 50 }).notNull(),
    targetAudience: varchar('target_audience', { length: 50 }),
    language: varchar('language', { length: 20 }),
    
    // Summary results
    executiveSummary: text('executive_summary').notNull(),
    keyProvisions: jsonb('key_provisions').notNull(),
    plainLanguageVersion: text('plain_language_version'),
    swahiliSummary: text('swahili_summary'),
    impactAnalysis: jsonb('impact_analysis'),
    keyTerms: jsonb('key_terms'),
    actionItems: jsonb('action_items'),
    
    // Metadata
    wordCount: jsonb('word_count').notNull(),
    readabilityScore: jsonb('readability_score').notNull(),
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    accessCount: integer('access_count').default(1),
  },
  (table) => ({
    billIdIdx: index('idx_bill_summary_cache_bill_id').on(table.billId),
    hashIdx: index('idx_bill_summary_cache_hash').on(table.billHash),
    typeIdx: index('idx_bill_summary_cache_type').on(table.summarizationType),
    uniqueConstraint: unique('unique_bill_summary').on(
      table.billHash,
      table.summarizationType,
      table.targetAudience,
      table.language
    ),
  })
);

export const billSummarizationCacheRelations = relations(
  billSummarizationCache,
  ({ one }) => ({
    bill: one(bills, {
      fields: [billSummarizationCache.billId],
      references: [bills.id],
    }),
  })
);

// ============================================================================
// Content Classification Cache
// ============================================================================

export const contentClassificationCache = pgTable(
  'content_classification_cache',
  {
    id: serial('id').primaryKey(),
    contentHash: varchar('content_hash', { length: 64 }).notNull().unique(),
    
    // Content metadata
    contentSource: varchar('content_source', { length: 50 }).notNull(),
    
    // Classification results
    classifications: jsonb('classifications').notNull(),
    
    // Analysis metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    tasksPerformed: jsonb('tasks_performed').notNull(),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    accessCount: integer('access_count').default(1),
  },
  (table) => ({
    hashIdx: index('idx_content_classification_hash').on(table.contentHash),
    sourceIdx: index('idx_content_classification_source').on(table.contentSource),
    createdIdx: index('idx_content_classification_created').on(table.createdAt),
  })
);

// ============================================================================
// Transparency Assessment Cache
// ============================================================================

export const transparencyAssessmentCache = pgTable(
  'transparency_assessment_cache',
  {
    id: serial('id').primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    assessmentHash: varchar('assessment_hash', { length: 64 }).notNull(),
    
    // Assessment results
    overallScore: real('overall_score').notNull(),
    grade: varchar('grade', { length: 1 }).notNull(),
    confidence: real('confidence').notNull(),
    
    // Dimension scores
    dimensions: jsonb('dimensions').notNull(),
    
    // Analysis details
    strengths: jsonb('strengths').notNull(),
    weaknesses: jsonb('weaknesses').notNull(),
    recommendations: jsonb('recommendations').notNull(),
    benchmarking: jsonb('benchmarking').notNull(),
    
    // Metadata
    tierUsed: varchar('tier_used', { length: 20 }).notNull(),
    narrative: text('narrative'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    accessCount: integer('access_count').default(1),
  },
  (table) => ({
    entityIdx: index('idx_transparency_cache_entity').on(table.entityType, table.entityId),
    hashIdx: index('idx_transparency_cache_hash').on(table.assessmentHash),
    scoreIdx: index('idx_transparency_cache_score').on(table.overallScore),
    gradeIdx: index('idx_transparency_cache_grade').on(table.grade),
    uniqueConstraint: unique('unique_transparency_assessment').on(
      table.entityType,
      table.entityId,
      table.assessmentHash
    ),
    scoreCheck: check('overall_score_check', 'overall_score >= 0.0 AND overall_score <= 100.0'),
    confidenceCheck: check('confidence_check', 'confidence >= 0.0 AND confidence <= 1.0'),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type MLInteraction = typeof mlInteractions.$inferSelect;
export type NewMLInteraction = typeof mlInteractions.$inferInsert;

export type ConflictGraphNode = typeof conflictGraphNodes.$inferSelect;
export type NewConflictGraphNode = typeof conflictGraphNodes.$inferInsert;

export type ConflictGraphEdge = typeof conflictGraphEdges.$inferSelect;
export type NewConflictGraphEdge = typeof conflictGraphEdges.$inferInsert;

export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;
export type NewVectorEmbedding = typeof vectorEmbeddings.$inferInsert;

export type SentimentCache = typeof sentimentCache.$inferSelect;
export type NewSentimentCache = typeof sentimentCache.$inferInsert;

export type ConstitutionalAnalysisCache = typeof constitutionalAnalysisCache.$inferSelect;
export type NewConstitutionalAnalysisCache = typeof constitutionalAnalysisCache.$inferInsert;

export type TrojanBillDetection = typeof trojanBillDetections.$inferSelect;
export type NewTrojanBillDetection = typeof trojanBillDetections.$inferInsert;

export type MLModelMetadata = typeof mlModelMetadata.$inferSelect;
export type NewMLModelMetadata = typeof mlModelMetadata.$inferInsert;

export type ConflictDetectionCache = typeof conflictDetectionCache.$inferSelect;
export type NewConflictDetectionCache = typeof conflictDetectionCache.$inferInsert;

export type EngagementPrediction = typeof engagementPredictions.$inferSelect;
export type NewEngagementPrediction = typeof engagementPredictions.$inferInsert;

export type BillSummarizationCache = typeof billSummarizationCache.$inferSelect;
export type NewBillSummarizationCache = typeof billSummarizationCache.$inferInsert;

export type ContentClassificationCache = typeof contentClassificationCache.$inferSelect;
export type NewContentClassificationCache = typeof contentClassificationCache.$inferInsert;

export type TransparencyAssessmentCache = typeof transparencyAssessmentCache.$inferSelect;
export type NewTransparencyAssessmentCache = typeof transparencyAssessmentCache.$inferInsert;
