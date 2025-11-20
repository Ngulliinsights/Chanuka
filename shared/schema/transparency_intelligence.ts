// ============================================================================
// TRANSPARENCY INTELLIGENCE DOMAIN SCHEMA
// ============================================================================
// Financial transparency, conflict detection, and influence network tracking

import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, jsonb, text, date, index, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bills, sponsors, users } from './foundation';

// ============================================================================
// FINANCIAL DISCLOSURES
// ============================================================================

export const financialDisclosures = pgTable('financial_disclosures', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),
  disclosureYear: integer('disclosure_year').notNull(),
  disclosureType: varchar('disclosure_type', { length: 50 }), // 'annual', 'quarterly', 'transaction'
  source: varchar('source', { length: 100 }), // 'official_filing', 'public_record', 'investigation'
  filingDate: date('filing_date'),
  disclosureData: jsonb('disclosure_data').notNull(), // Flexible storage for disclosure details
  verificationStatus: varchar('verification_status', { length: 20 }).default('unverified'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  sponsorIdx: index('idx_financial_disclosures_sponsor').on(table.sponsorId),
  yearIdx: index('idx_financial_disclosures_year').on(table.disclosureYear),
  statusIdx: index('idx_financial_disclosures_status').on(table.verificationStatus)
}));

export const financialInterests = pgTable('financial_interests', {
  id: uuid('id').primaryKey().defaultRandom(),
  disclosureId: uuid('disclosure_id').references(() => financialDisclosures.id).notNull(),
  interestType: varchar('interest_type', { length: 50 }).notNull(), // 'stock', 'business', 'property', 'income'
  entityName: varchar('entity_name', { length: 255 }),
  industrySector: varchar('industry_sector', { length: 100 }),
  estimatedValueMin: decimal('estimated_value_min', { precision: 15, scale: 2 }),
  estimatedValueMax: decimal('estimated_value_max', { precision: 15, scale: 2 }),
  ownershipPercentage: decimal('ownership_percentage', { precision: 5, scale: 2 }),
  interestMetadata: jsonb('interest_metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  disclosureIdx: index('idx_financial_interests_disclosure').on(table.disclosureId),
  typeIdx: index('idx_financial_interests_type').on(table.interestType),
  sectorIdx: index('idx_financial_interests_sector').on(table.industrySector)
}));

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

export const conflictDetections = pgTable('conflict_detections', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id').references(() => bills.id).notNull(),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),
  conflictType: varchar('conflict_type', { length: 50 }).notNull(), // 'financial', 'employment', 'familial', 'organizational'
  severityLevel: varchar('severity_level', { length: 20 }), // 'low', 'medium', 'high', 'critical'
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }), // AI confidence in detection
  detectionMethod: varchar('detection_method', { length: 50 }), // 'automatic', 'manual', 'hybrid'
  evidenceData: jsonb('evidence_data').notNull(), // Supporting evidence
  reviewedByExpert: boolean('reviewed_by_expert').default(false),
  expertConsensus: varchar('expert_consensus', { length: 20 }), // 'confirmed', 'disputed', 'unclear'
  publicDisclosureQuality: varchar('public_disclosure_quality', { length: 20 }), // 'complete', 'partial', 'inadequate'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  billIdx: index('idx_conflicts_bill').on(table.billId),
  sponsorIdx: index('idx_conflicts_sponsor').on(table.sponsorId),
  severityIdx: index('idx_conflicts_severity').on(table.severityLevel),
  typeIdx: index('idx_conflicts_type').on(table.conflictType)
}));

// ============================================================================
// INFLUENCE NETWORKS
// ============================================================================

export const influenceNetworks = pgTable('influence_networks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceEntityType: varchar('source_entity_type', { length: 50 }).notNull(), // 'sponsor', 'organization', 'industry'
  sourceEntityId: uuid('source_entity_id').notNull(),
  targetEntityType: varchar('target_entity_type', { length: 50 }).notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }), // 'financial', 'employment', 'board_membership', 'donation'
  relationshipStrength: decimal('relationship_strength', { precision: 5, scale: 2 }), // 0-100 scale
  evidenceSources: jsonb('evidence_sources'),
  activeFrom: date('active_from'),
  activeTo: date('active_to'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  sourceIdx: index('idx_influence_source').on(table.sourceEntityType, table.sourceEntityId),
  targetIdx: index('idx_influence_target').on(table.targetEntityType, table.targetEntityId),
  relationshipIdx: index('idx_influence_relationship').on(table.relationshipType)
}));

// ============================================================================
// IMPLEMENTATION WORKAROUNDS
// ============================================================================

export const implementationWorkarounds = pgTable('implementation_workarounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalBillId: uuid('original_bill_id').references(() => bills.id).notNull(),
  workaroundType: varchar('workaround_type', { length: 50 }), // 'executive_order', 'administrative_rule', 'court_decision', 'budget_allocation'
  workaroundDocumentId: varchar('workaround_document_id', { length: 255 }),
  implementingBody: varchar('implementing_body', { length: 255 }), // Which entity implemented the workaround
  implementationDate: date('implementation_date'),
  provisionsReimplemented: text('provisions_reimplemented').array(), // Which rejected provisions were reimplemented
  similarityScore: decimal('similarity_score', { precision: 5, scale: 2 }), // How similar to original bill
  detectionMethod: varchar('detection_method', { length: 50 }),
  status: varchar('status', { length: 20 }), // 'active', 'challenged', 'overturned'
  workaroundMetadata: jsonb('workaround_metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  billIdx: index('idx_workarounds_bill').on(table.originalBillId),
  typeIdx: index('idx_workarounds_type').on(table.workaroundType),
  statusIdx: index('idx_workarounds_status').on(table.status),
  implementationIdx: index('idx_workarounds_implementation').on(table.implementationDate)
}));

// ============================================================================
// RELATIONS
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

export const implementationWorkaroundsRelations = relations(implementationWorkarounds, ({ one }) => ({
  originalBill: one(bills, {
    fields: [implementationWorkarounds.originalBillId],
    references: [bills.id]
  })
}));

// ============================================================================
// TYPES
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


