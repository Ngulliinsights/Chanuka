// ============================================================================
// TRANSPARENCY INTELLIGENCE SCHEMA - PRODUCTION OPTIMIZED v2.0
// ============================================================================
// Financial transparency, conflict detection, and Trojan Bill tracking
// Optimized for: Performance, Data Integrity, Scalability, Type Safety

import { sql, relations } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, integer, decimal, boolean, timestamp, jsonb, text, date,
  index, check
} from 'drizzle-orm/pg-core';

import { bills, sponsors, users } from './foundation';

// ============================================================================
// FINANCIAL DISCLOSURES - Transparency Tracking
// ============================================================================

export const financialDisclosures = pgTable('financial_disclosures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),
  disclosureYear: integer('disclosure_year').notNull(),
  disclosureType: varchar('disclosure_type', { length: 50 }),
  // Values: 'annual', 'quarterly', 'transaction'

  source: varchar('source', { length: 100 }),
  // Values: 'official_filing', 'public_record', 'investigation'

  filingDate: date('filing_date'),
  disclosureData: jsonb('disclosure_data').notNull(),
  // Flexible storage for disclosure details

  verificationStatus: varchar('verification_status', { length: 20 }).default('unverified'),
  // Values: 'unverified', 'pending', 'verified', 'disputed'

  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  sponsorIdx: index('idx_financial_disclosures_sponsor').on(table.sponsorId),
  yearIdx: index('idx_financial_disclosures_year').on(table.disclosureYear),
  statusIdx: index('idx_financial_disclosures_status').on(table.verificationStatus),

  // Composite index for sponsor-year queries
  sponsorYearIdx: index('idx_financial_disclosures_sponsor_year')
    .on(table.sponsorId, table.disclosureYear.desc()),

  // Validation: Disclosure year reasonable range
  yearCheck: check('financial_disclosures_year_check',
    sql`${table.disclosureYear} >= 2000 AND ${table.disclosureYear} <= 2100`),

  // Validation: Disclosure type enumeration
  disclosureTypeCheck: check('financial_disclosures_disclosure_type_check',
    sql`${table.disclosureType} IS NULL OR ${table.disclosureType} IN ('annual', 'quarterly', 'transaction')`),

  // Validation: Source enumeration
  sourceCheck: check('financial_disclosures_source_check',
    sql`${table.source} IS NULL OR ${table.source} IN ('official_filing', 'public_record', 'investigation')`),

  // Validation: Verification status enumeration
  verificationStatusCheck: check('financial_disclosures_verification_status_check',
    sql`${table.verificationStatus} IN ('unverified', 'pending', 'verified', 'disputed')`),
}));

// ============================================================================
// FINANCIAL INTERESTS - Specific Interest Tracking
// ============================================================================

export const financialInterests = pgTable('financial_interests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  disclosureId: uuid('disclosure_id').references(() => financialDisclosures.id).notNull(),

  interestType: varchar('interest_type', { length: 50 }).notNull(),
  // Values: 'stock', 'business', 'property', 'income', 'gift', 'loan'

  entityName: varchar('entity_name', { length: 255 }),
  industrySector: varchar('industry_sector', { length: 100 }),

  // Value ranges
  estimatedValueMin: decimal('estimated_value_min', { precision: 15, scale: 2 }),
  estimatedValueMax: decimal('estimated_value_max', { precision: 15, scale: 2 }),

  ownershipPercentage: decimal('ownership_percentage', { precision: 5, scale: 2 }),
  // 0-100 scale

  interestMetadata: jsonb('interest_metadata'),

  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  disclosureIdx: index('idx_financial_interests_disclosure').on(table.disclosureId),
  typeIdx: index('idx_financial_interests_type').on(table.interestType),
  sectorIdx: index('idx_financial_interests_sector').on(table.industrySector),

  // Value analysis
  valueRangeIdx: index('idx_financial_interests_value')
    .on(table.estimatedValueMin, table.estimatedValueMax),

  // Validation: Value min <= max
  valueLogicCheck: check('financial_interests_value_logic_check',
    sql`${table.estimatedValueMin} IS NULL OR ${table.estimatedValueMax} IS NULL
      OR ${table.estimatedValueMin} <= ${table.estimatedValueMax}`),

  // Validation: Values non-negative
  valuePositiveCheck: check('financial_interests_value_positive_check',
    sql`(${table.estimatedValueMin} IS NULL OR ${table.estimatedValueMin} >= 0)
      AND (${table.estimatedValueMax} IS NULL OR ${table.estimatedValueMax} >= 0)`),

  // Validation: Ownership percentage 0-100
  ownershipCheck: check('financial_interests_ownership_check',
    sql`${table.ownershipPercentage} IS NULL
      OR (${table.ownershipPercentage} >= 0 AND ${table.ownershipPercentage} <= 100)`),

  // Validation: Interest type enumeration
  interestTypeCheck: check('financial_interests_interest_type_check',
    sql`${table.interestType} IN ('stock', 'business', 'property', 'income', 'gift', 'loan')`),
}));

// ============================================================================
// CONFLICT DETECTION - Conflict of Interest Analysis
// ============================================================================

export const conflictDetections = pgTable('conflict_detections', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  billId: uuid('bill_id').references(() => bills.id).notNull(),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),

  conflictType: varchar('conflict_type', { length: 50 }).notNull(),
  // Values: 'financial', 'employment', 'familial', 'organizational', 'political'

  severityLevel: varchar('severity_level', { length: 20 }),
  // Values: 'low', 'medium', 'high', 'critical'

  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }),
  // 0.00-1.00 scale (AI confidence in detection)

  detectionMethod: varchar('detection_method', { length: 50 }),
  // Values: 'automatic', 'manual', 'hybrid', 'crowdsourced'

  evidenceData: jsonb('evidence_data').notNull(),
  // Supporting evidence for the conflict

  // Expert review
  reviewedByExpert: boolean('reviewed_by_expert').default(false),
  expertConsensus: varchar('expert_consensus', { length: 20 }),
  // Values: 'confirmed', 'disputed', 'unclear', 'dismissed'

  publicDisclosureQuality: varchar('public_disclosure_quality', { length: 20 }),
  // Values: 'complete', 'partial', 'inadequate', 'none'

  // Resolution tracking
  resolutionStatus: varchar('resolution_status', { length: 30 }),
  // Values: 'unresolved', 'sponsor_recused', 'disclosure_made', 'dismissed'

  resolutionDate: timestamp('resolution_date', { withTimezone: true }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Hot path: Bill conflicts
  billSeverityIdx: index('idx_conflicts_bill_severity')
    .on(table.billId, table.severityLevel),

  // Sponsor conflict tracking
  sponsorSeverityIdx: index('idx_conflicts_sponsor_severity')
    .on(table.sponsorId, table.severityLevel),

  // Severity analysis
  severityIdx: index('idx_conflicts_severity')
    .on(table.severityLevel, table.confidenceScore.desc()),

  // Type analysis
  typeIdx: index('idx_conflicts_type')
    .on(table.conflictType, table.severityLevel),

  // Expert review queue
  reviewQueueIdx: index('idx_conflicts_review_queue')
    .on(table.reviewedByExpert, table.severityLevel)
    .where(sql`${table.reviewedByExpert} = false`),

  // Resolution tracking
  resolutionIdx: index('idx_conflicts_resolution')
    .on(table.resolutionStatus, table.resolutionDate.desc()),

  // GIN index for evidence
  evidenceIdx: index('idx_conflicts_evidence')
    .using('gin', table.evidenceData),

  // Validation: Confidence score 0-1
  confidenceCheck: check('conflict_detections_confidence_check',
    sql`${table.confidenceScore} IS NULL
      OR (${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1)`),

  // Validation: Conflict type enumeration
  conflictTypeCheck: check('conflict_detections_conflict_type_check',
    sql`${table.conflictType} IN ('financial', 'employment', 'familial', 'organizational', 'political')`),

  // Validation: Severity level enumeration
  severityLevelCheck: check('conflict_detections_severity_level_check',
    sql`${table.severityLevel} IS NULL OR ${table.severityLevel} IN ('low', 'medium', 'high', 'critical')`),

  // Validation: Detection method enumeration
  detectionMethodCheck: check('conflict_detections_detection_method_check',
    sql`${table.detectionMethod} IS NULL OR ${table.detectionMethod} IN ('automatic', 'manual', 'hybrid', 'crowdsourced')`),

  // Validation: Expert consensus enumeration
  expertConsensusCheck: check('conflict_detections_expert_consensus_check',
    sql`${table.expertConsensus} IS NULL OR ${table.expertConsensus} IN ('confirmed', 'disputed', 'unclear', 'dismissed')`),

  // Validation: Public disclosure quality enumeration
  publicDisclosureQualityCheck: check('conflict_detections_public_disclosure_quality_check',
    sql`${table.publicDisclosureQuality} IS NULL OR ${table.publicDisclosureQuality} IN ('complete', 'partial', 'inadequate', 'none')`),

  // Validation: Resolution status enumeration
  resolutionStatusCheck: check('conflict_detections_resolution_status_check',
    sql`${table.resolutionStatus} IS NULL OR ${table.resolutionStatus} IN ('unresolved', 'sponsor_recused', 'disclosure_made', 'dismissed')`),
}));

// ============================================================================
// INFLUENCE NETWORKS - Power Relationship Mapping
// ============================================================================

export const influenceNetworks = pgTable('influence_networks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  // Source entity
  sourceEntityType: varchar('source_entity_type', { length: 50 }).notNull(),
  // Values: 'sponsor', 'organization', 'industry', 'donor', 'lobbyist'

  sourceEntityId: uuid('source_entity_id').notNull(),

  // Target entity
  targetEntityType: varchar('target_entity_type', { length: 50 }).notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),

  // Relationship details
  relationshipType: varchar('relationship_type', { length: 50 }),
  // Values: 'financial', 'employment', 'board_membership', 'donation',
  //         'family', 'business_partner', 'advisor'

  relationshipStrength: decimal('relationship_strength', { precision: 5, scale: 2 }),
  // 0-100 scale (higher = stronger relationship)

  evidenceSources: jsonb('evidence_sources'),
  // References to supporting evidence

  // Timeline
  activeFrom: date('active_from'),
  activeTo: date('active_to'),
  isActive: boolean('is_active').default(true),

  // Impact assessment
  influenceScore: decimal('influence_score', { precision: 5, scale: 2 }),
  // 0-100 scale (potential influence level)

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Network queries
  sourceIdx: index('idx_influence_source')
    .on(table.sourceEntityType, table.sourceEntityId, table.isActive),

  targetIdx: index('idx_influence_target')
    .on(table.targetEntityType, table.targetEntityId, table.isActive),

  // Relationship analysis
  relationshipTypeIdx: index('idx_influence_relationship_type')
    .on(table.relationshipType, table.relationshipStrength.desc()),

  // Active relationships
  activeIdx: index('idx_influence_active')
    .on(table.isActive, table.activeFrom.desc())
    .where(sql`${table.isActive} = true`),

  // Influence scoring
  influenceScoreIdx: index('idx_influence_score')
    .on(table.influenceScore.desc())
    .where(sql`${table.influenceScore} IS NOT NULL`),

  // GIN index for evidence sources
  evidenceSourcesIdx: index('idx_influence_evidence')
    .using('gin', table.evidenceSources),

  // Validation: Relationship strength 0-100
  strengthCheck: check('influence_networks_strength_check',
    sql`${table.relationshipStrength} IS NULL
      OR (${table.relationshipStrength} >= 0 AND ${table.relationshipStrength} <= 100)`),

  // Validation: Influence score 0-100
  influenceCheck: check('influence_networks_influence_check',
    sql`${table.influenceScore} IS NULL
      OR (${table.influenceScore} >= 0 AND ${table.influenceScore} <= 100)`),

  // Validation: Date logic
  dateLogicCheck: check('influence_networks_date_logic_check',
    sql`${table.activeFrom} IS NULL OR ${table.activeTo} IS NULL
      OR ${table.activeFrom} <= ${table.activeTo}`),

  // Validation: Source entity type enumeration
  sourceEntityTypeCheck: check('influence_networks_source_entity_type_check',
    sql`${table.sourceEntityType} IN ('sponsor', 'organization', 'industry', 'donor', 'lobbyist')`),

  // Validation: Target entity type enumeration
  targetEntityTypeCheck: check('influence_networks_target_entity_type_check',
    sql`${table.targetEntityType} IN ('sponsor', 'organization', 'industry', 'donor', 'lobbyist')`),

  // Validation: Relationship type enumeration
  relationshipTypeCheck: check('influence_networks_relationship_type_check',
    sql`${table.relationshipType} IS NULL OR ${table.relationshipType} IN ('financial', 'employment', 'board_membership', 'donation', 'family', 'business_partner', 'advisor')`),
}));

// ============================================================================
// IMPLEMENTATION WORKAROUNDS - "TROJAN BILL" DETECTION SYSTEM
// ============================================================================
// This table tracks when rejected bills are reimplemented through other means
// This IS the "Trojan Bill" detection system - no separate schema needed!

export const implementationWorkarounds = pgTable('implementation_workarounds', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  originalBillId: uuid('original_bill_id').references(() => bills.id).notNull(),
  // The bill that was rejected by Parliament

  workaroundType: varchar('workaround_type', { length: 50 }),
  // Values: 'executive_order', 'administrative_rule', 'court_decision',
  //         'budget_allocation', 'regulatory_change', 'subsidiary_legislation'

  workaroundDocumentId: varchar('workaround_document_id', { length: 255 }),
  // Reference to the workaround document (Gazette notice, court case, etc.)

  implementingBody: varchar('implementing_body', { length: 255 }),
  // Which entity implemented the workaround
  // Values: 'Executive', 'Judiciary', 'Regulatory Agency', 'County Government'

  implementationDate: date('implementation_date'),

  // What was reimplemented
  provisionsReimplemented: text('provisions_reimplemented').array(),
  // Which rejected provisions were sneaked back in

  similarityScore: decimal('similarity_score', { precision: 5, scale: 2 }),
  // 0-100: How similar to original bill (THIS IS "TROJAN RISK SCORE")
  // Higher = more similar = more suspicious

  detectionMethod: varchar('detection_method', { length: 50 }),
  // Values: 'automated', 'expert_analysis', 'civil_society', 'media', 'whistleblower'

  detectionDate: date('detection_date'),
  detectionConfidence: decimal('detection_confidence', { precision: 3, scale: 2 }),
  // 0.00-1.00 scale

  // Status and challenges
  status: varchar('status', { length: 20 }),
  // Values: 'active', 'challenged', 'overturned', 'modified', 'withdrawn'

  legalChallenges: jsonb('legal_challenges').default(sql`'{}'::jsonb`),
  /* Structure: [
    {
      "case": "Okiya Omtatah v Attorney General",
      "court": "High Court",
      "date": "2024-03-15",
      "status": "pending"
    }
  ] */

  publicAlertIssued: boolean('public_alert_issued').default(false),
  alertIssuedDate: date('alert_issued_date'),

  // Detailed analysis
  hiddenAgenda: text('hidden_agenda'),
  // What the workaround is really trying to achieve

  constitutionalConcerns: text('constitutional_concerns').array(),
  // Which constitutional articles are potentially violated

  affectedRights: text('affected_rights').array(),
  // Which rights/freedoms are impacted

  workaroundMetadata: jsonb('workaround_metadata'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Hot path: Find workarounds for a bill
  billIdx: index('idx_workarounds_bill')
    .on(table.originalBillId, table.status),

  // Type and status
  typeStatusIdx: index('idx_workarounds_type_status')
    .on(table.workaroundType, table.status),

  // High-risk workarounds (similarity > 70)
  highRiskIdx: index('idx_workarounds_high_risk')
    .on(table.similarityScore.desc())
    .where(sql`${table.similarityScore} >= 70`),

  // Active workarounds
  activeIdx: index('idx_workarounds_active')
    .on(table.status, table.implementationDate.desc())
    .where(sql`${table.status} = 'active'`),

  // Challenged workarounds
  challengedIdx: index('idx_workarounds_challenged')
    .on(table.status, table.implementationDate.desc())
    .where(sql`${table.status} = 'challenged'`),

  // Implementation timeline
  implementationDateIdx: index('idx_workarounds_implementation_date')
    .on(table.implementationDate.desc()),

  // Detection method analysis
  detectionMethodIdx: index('idx_workarounds_detection_method')
    .on(table.detectionMethod, table.detectionConfidence.desc()),

  // GIN indexes for arrays
  provisionsIdx: index('idx_workarounds_provisions')
    .using('gin', table.provisionsReimplemented),
  challengesIdx: index('idx_workarounds_challenges')
    .using('gin', table.legalChallenges),
  concernsIdx: index('idx_workarounds_concerns')
    .using('gin', table.constitutionalConcerns),
  rightsIdx: index('idx_workarounds_rights')
    .using('gin', table.affectedRights),

  // Validation: Similarity score 0-100
  similarityCheck: check('implementation_workarounds_similarity_check',
    sql`${table.similarityScore} IS NULL
      OR (${table.similarityScore} >= 0 AND ${table.similarityScore} <= 100)`),

  // Validation: Detection confidence 0-1
  confidenceCheck: check('implementation_workarounds_confidence_check',
    sql`${table.detectionConfidence} IS NULL
      OR (${table.detectionConfidence} >= 0 AND ${table.detectionConfidence} <= 1)`),

  // Validation: Workaround type enumeration
  workaroundTypeCheck: check('implementation_workarounds_workaround_type_check',
    sql`${table.workaroundType} IS NULL OR ${table.workaroundType} IN ('executive_order', 'administrative_rule', 'court_decision', 'budget_allocation', 'regulatory_change', 'subsidiary_legislation')`),

  // Validation: Detection method enumeration
  detectionMethodCheck: check('implementation_workarounds_detection_method_check',
    sql`${table.detectionMethod} IS NULL OR ${table.detectionMethod} IN ('automated', 'expert_analysis', 'civil_society', 'media', 'whistleblower')`),

  // Validation: Status enumeration
  statusCheck: check('implementation_workarounds_status_check',
    sql`${table.status} IN ('active', 'challenged', 'overturned', 'modified', 'withdrawn')`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM Relations
// ============================================================================

export const transparencyFinancialDisclosuresRelations = relations(financialDisclosures, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [financialDisclosures.sponsorId],
    references: [sponsors.id]
  }),
  verifier: one(users, {
    fields: [financialDisclosures.verifiedBy],
    references: [users.id]
  }),
  interests: many(financialInterests)
}));

export const transparencyFinancialInterestsRelations = relations(financialInterests, ({ one }) => ({
  disclosure: one(financialDisclosures, {
    fields: [financialInterests.disclosureId],
    references: [financialDisclosures.id]
  })
}));

export const conflictDetectionsRelations = relations(conflictDetections, ({ one }) => ({
  bill: one(bills, {
    fields: [conflictDetections.billId],
    references: [bills.id]
  }),
  sponsor: one(sponsors, {
    fields: [conflictDetections.sponsorId],
    references: [sponsors.id]
  })
}));

export const influenceNetworksRelations = relations(influenceNetworks, () => ({
  // Polymorphic relations handled at application level
}));

export const implementationWorkaroundsRelations = relations(implementationWorkarounds, ({ one }) => ({
  originalBill: one(bills, {
    fields: [implementationWorkarounds.originalBillId],
    references: [bills.id]
  })
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
// ============================================================================

export type FinancialDisclosure = typeof financialDisclosures.$inferSelect;
export type NewFinancialDisclosure = typeof financialDisclosures.$inferInsert;

export type FinancialInterest = typeof financialInterests.$inferSelect;
export type NewFinancialInterest = typeof financialInterests.$inferInsert;

export type ConflictDetection = typeof conflictDetections.$inferSelect;
export type NewConflictDetection = typeof conflictDetections.$inferInsert;

export type InfluenceNetwork = typeof influenceNetworks.$inferSelect;
export type NewInfluenceNetwork = typeof influenceNetworks.$inferInsert;

export type ImplementationWorkaround = typeof implementationWorkarounds.$inferSelect;
export type NewImplementationWorkaround = typeof implementationWorkarounds.$inferInsert;
