// ============================================================================
// TRANSPARENCY ANALYSIS SCHEMA - CRITICAL MISSING DOMAIN
// ============================================================================
// Corporate influence tracking, financial conflicts, and lobbying analysis
// This schema enables "follow the money" accountability features

import {
  pgTable, text, integer, timestamp, jsonb, numeric, uuid, varchar,
  index, boolean, date, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import { bills, sponsors } from "./foundation";

// ============================================================================
// CORPORATE ENTITIES - Companies, organizations, and institutions
// ============================================================================

export const corporate_entities = pgTable("corporate_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity identification
  name: varchar("name", { length: 500 }).notNull(),
  legal_name: varchar("legal_name", { length: 500 }),
  registration_number: varchar("registration_number", { length: 100 }),
  entity_type: varchar("entity_type", { length: 50 }).notNull(), // "corporation", "ngo", "government_agency", "international_org"
  
  // Business classification
  industry_sector: varchar("industry_sector", { length: 100 }),
  business_activities: varchar("business_activities", { length: 100 }).array(),
  annual_revenue: numeric("annual_revenue", { precision: 15, scale: 2 }),
  employee_count: integer("employee_count"),
  
  // Registration and legal status
  incorporation_date: date("incorporation_date"),
  registration_country: varchar("registration_country", { length: 5 }).notNull().default("KE"),
  tax_id: varchar("tax_id", { length: 50 }),
  
  // Contact information
  headquarters_address: text("headquarters_address"),
  kenya_office_address: text("kenya_office_address"),
  official_address: text("official_address"),
  contact_email: varchar("contact_email", { length: 255 }),
  contact_phone: varchar("contact_phone", { length: 50 }),
  website_url: varchar("website_url", { length: 500 }),
  
  // Ownership and structure
  parent_company_id: uuid("parent_company_id"),
  ownership_structure: jsonb("ownership_structure").notNull().default(sql`'{}'::jsonb`),
  key_executives: jsonb("key_executives").notNull().default(sql`'[]'::jsonb`),
  
  // Public profile
  is_publicly_traded: boolean("is_publicly_traded").notNull().default(false),
  stock_exchange: varchar("stock_exchange", { length: 50 }),
  stock_symbol: varchar("stock_symbol", { length: 20 }),
  
  // Regulatory status
  regulatory_licenses: varchar("regulatory_licenses", { length: 100 }).array(),
  compliance_status: varchar("compliance_status", { length: 30 }), // "compliant", "under_review", "violations"
  
  // Data quality and verification
  data_source: varchar("data_source", { length: 100 }), // "official_registry", "public_filings", "media_reports", "user_submitted"
  verification_status: varchar("verification_status", { length: 30 }).notNull().default("unverified"), // "unverified", "verified", "disputed"
  last_updated: date("last_updated").notNull().default(sql`CURRENT_DATE`),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Entity lookup and search
  nameIdx: index("idx_corporate_entities_name").on(table.name),
  registrationNumberIdx: index("idx_corporate_entities_registration_number")
    .on(table.registration_number)
    .where(sql`${table.registration_number} IS NOT NULL`),
  
  // Industry and business analysis
  industrySectorIdx: index("idx_corporate_entities_industry_sector")
    .on(table.industry_sector, table.annual_revenue),
  
  // Ownership hierarchy
  parentCompanyIdx: index("idx_corporate_entities_parent_company")
    .on(table.parent_company_id)
    .where(sql`${table.parent_company_id} IS NOT NULL`),
  
  // Public company tracking
  publiclyTradedIdx: index("idx_corporate_entities_publicly_traded")
    .on(table.is_publicly_traded, table.stock_exchange)
    .where(sql`${table.is_publicly_traded} = true`),
  
  // Data quality
  verificationStatusIdx: index("idx_corporate_entities_verification_status")
    .on(table.verification_status, table.last_updated),
}));

// ============================================================================
// FINANCIAL INTERESTS - Individual financial stakes and conflicts
// ============================================================================

export const financial_interests = pgTable("financial_interests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Interest holder
  holder_type: varchar("holder_type", { length: 30 }).notNull(), // "sponsor", "family_member", "associate"
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "cascade" }),
  holder_name: varchar("holder_name", { length: 200 }), // For non-sponsor holders
  relationship_to_sponsor: varchar("relationship_to_sponsor", { length: 100 }), // "spouse", "child", "business_partner"
  
  // Financial interest details
  entity_id: uuid("entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  interest_type: varchar("interest_type", { length: 50 }).notNull(), // "shareholding", "directorship", "employment", "consultancy", "contract"
  
  // Interest specifics
  position_title: varchar("position_title", { length: 200 }),
  ownership_percentage: numeric("ownership_percentage", { precision: 5, scale: 2 }),
  estimated_value: numeric("estimated_value", { precision: 15, scale: 2 }),
  annual_income: numeric("annual_income", { precision: 12, scale: 2 }),
  
  // Timeline
  start_date: date("start_date"),
  end_date: date("end_date"),
  is_current: boolean("is_current").notNull().default(true),
  
  // Disclosure information
  disclosure_source: varchar("disclosure_source", { length: 100 }), // "parliamentary_register", "company_filings", "media_investigation"
  disclosure_date: date("disclosure_date"),
  is_publicly_disclosed: boolean("is_publicly_disclosed").notNull().default(false),
  
  // Conflict assessment
  potential_conflict: boolean("potential_conflict").notNull().default(false),
  conflict_description: text("conflict_description"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Sponsor interest tracking
  sponsorEntityIdx: index("idx_financial_interests_sponsor_entity")
    .on(table.sponsor_id, table.entity_id, table.is_current)
    .where(sql`${table.sponsor_id} IS NOT NULL`),
  
  // Entity stakeholder analysis
  entityInterestIdx: index("idx_financial_interests_entity_interest")
    .on(table.entity_id, table.interest_type, table.is_current),
  
  // Conflict identification
  potentialConflictIdx: index("idx_financial_interests_potential_conflict")
    .on(table.potential_conflict, table.is_current)
    .where(sql`${table.potential_conflict} = true AND ${table.is_current} = true`),
  
  // Disclosure tracking
  disclosureStatusIdx: index("idx_financial_interests_disclosure_status")
    .on(table.is_publicly_disclosed, table.disclosure_date),
}));

// ============================================================================
// LOBBYING ACTIVITIES - Formal and informal influence attempts
// ============================================================================

export const lobbying_activities = pgTable("lobbying_activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Lobbying identification
  activity_type: varchar("activity_type", { length: 50 }).notNull(), // "meeting", "communication", "event", "campaign", "gift"
  
  // Parties involved
  lobbyist_entity_id: uuid("lobbyist_entity_id").references(() => corporate_entities.id, { onDelete: "set null" }),
  lobbyist_name: varchar("lobbyist_name", { length: 200 }),
  target_sponsor_id: uuid("target_sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),
  target_institution: varchar("target_institution", { length: 200 }), // "Parliament", "Ministry of Health", etc.
  
  // Activity details
  activity_date: date("activity_date").notNull(),
  activity_description: text("activity_description").notNull(),
  topics_discussed: varchar("topics_discussed", { length: 100 }).array(),
  
  // Legislative targets
  target_bills: uuid("target_bills").array(),
  policy_areas: varchar("policy_areas", { length: 100 }).array(),
  
  // Financial aspects
  estimated_cost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  gifts_or_benefits: text("gifts_or_benefits"),
  
  // Disclosure and transparency
  disclosure_required: boolean("disclosure_required").notNull().default(false),
  is_disclosed: boolean("is_disclosed").notNull().default(false),
  disclosure_reference: varchar("disclosure_reference", { length: 200 }),
  
  // Data source and verification
  information_source: varchar("information_source", { length: 100 }), // "official_register", "media_report", "whistleblower", "investigation"
  source_reliability: varchar("source_reliability", { length: 20 }), // "high", "medium", "low", "unverified"
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Lobbyist activity tracking
  lobbyistDateIdx: index("idx_lobbying_activities_lobbyist_date")
    .on(table.lobbyist_entity_id, table.activity_date)
    .where(sql`${table.lobbyist_entity_id} IS NOT NULL`),
  
  // Target analysis
  targetSponsorIdx: index("idx_lobbying_activities_target_sponsor")
    .on(table.target_sponsor_id, table.activity_date)
    .where(sql`${table.target_sponsor_id} IS NOT NULL`),
  
  // Bill lobbying tracking
  targetBillsIdx: index("idx_lobbying_activities_target_bills")
    .using("gin", table.target_bills),
  
  // Disclosure compliance
  disclosureComplianceIdx: index("idx_lobbying_activities_disclosure_compliance")
    .on(table.disclosure_required, table.is_disclosed, table.activity_date),
}));

// ============================================================================
// BILL FINANCIAL CONFLICTS - Specific conflicts between bills and interests
// ============================================================================

export const bill_financial_conflicts = pgTable("bill_financial_conflicts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Conflict parties
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "cascade" }),
  financial_interest_id: uuid("financial_interest_id").references(() => financial_interests.id, { onDelete: "cascade" }),
  entity_id: uuid("entity_id").references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Conflict analysis
  conflict_type: varchar("conflict_type", { length: 50 }).notNull(), // "direct_benefit", "competitive_advantage", "regulatory_relief", "contract_opportunity"
  conflict_severity: varchar("conflict_severity", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  
  // Impact assessment
  potential_financial_impact: numeric("potential_financial_impact", { precision: 15, scale: 2 }),
  impact_description: text("impact_description").notNull(),
  affected_bill_sections: varchar("affected_bill_sections", { length: 100 }).array(),
  
  // Detection and analysis
  detection_method: varchar("detection_method", { length: 50 }).notNull(), // "automated", "manual_review", "public_report", "investigation"
  analysis_confidence: numeric("analysis_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Status and resolution
  conflict_status: varchar("conflict_status", { length: 30 }).notNull().default("identified"), // "identified", "disclosed", "recused", "resolved", "disputed"
  resolution_notes: text("resolution_notes"),
  
  // Public awareness
  is_public: boolean("is_public").notNull().default(false),
  media_coverage: jsonb("media_coverage").notNull().default(sql`'[]'::jsonb`),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Bill conflict analysis
  billConflictIdx: index("idx_bill_financial_conflicts_bill_conflict")
    .on(table.bill_id, table.conflict_severity, table.conflict_status),
  
  // Sponsor conflict tracking
  sponsorConflictIdx: index("idx_bill_financial_conflicts_sponsor_conflict")
    .on(table.sponsor_id, table.conflict_severity)
    .where(sql`${table.sponsor_id} IS NOT NULL`),
  
  // Entity impact analysis
  entityImpactIdx: index("idx_bill_financial_conflicts_entity_impact")
    .on(table.entity_id, table.potential_financial_impact)
    .where(sql`${table.entity_id} IS NOT NULL`),
  
  // Public disclosure tracking
  publicDisclosureIdx: index("idx_bill_financial_conflicts_public_disclosure")
    .on(table.is_public, table.conflict_severity, table.created_at),
}));

// ============================================================================
// CROSS SECTOR OWNERSHIP - Track ownership networks across industries
// ============================================================================

export const cross_sector_ownership = pgTable("cross_sector_ownership", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Ownership relationship
  owner_entity_id: uuid("owner_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  owned_entity_id: uuid("owned_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Ownership details
  ownership_type: varchar("ownership_type", { length: 50 }).notNull(), // "direct_shareholding", "subsidiary", "joint_venture", "partnership"
  ownership_percentage: numeric("ownership_percentage", { precision: 5, scale: 2 }),
  control_level: varchar("control_level", { length: 30 }), // "controlling", "significant", "minority", "passive"
  
  // Timeline
  relationship_start: date("relationship_start"),
  relationship_end: date("relationship_end"),
  is_current: boolean("is_current").notNull().default(true),
  
  // Cross-sector analysis
  creates_cross_sector_influence: boolean("creates_cross_sector_influence").notNull().default(false),
  affected_sectors: varchar("affected_sectors", { length: 100 }).array(),
  
  // Data source
  data_source: varchar("data_source", { length: 100 }),
  verification_status: varchar("verification_status", { length: 30 }).notNull().default("unverified"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ownership network analysis
  ownerOwnedIdx: index("idx_cross_sector_ownership_owner_owned")
    .on(table.owner_entity_id, table.owned_entity_id, table.is_current),
  
  // Cross-sector influence tracking
  crossSectorInfluenceIdx: index("idx_cross_sector_ownership_cross_sector_influence")
    .on(table.creates_cross_sector_influence, table.is_current)
    .where(sql`${table.creates_cross_sector_influence} = true AND ${table.is_current} = true`),
  
  // Sector analysis
  affectedSectorsIdx: index("idx_cross_sector_ownership_affected_sectors")
    .using("gin", table.affected_sectors),
  
  // Prevent self-ownership
  selfOwnershipCheck: check("cross_sector_ownership_self_ownership_check",
    sql`${table.owner_entity_id} != ${table.owned_entity_id}`),
}));

// ============================================================================
// REGULATORY CAPTURE INDICATORS - Systematic influence patterns
// ============================================================================

export const regulatory_capture_indicators = pgTable("regulatory_capture_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Indicator identification
  indicator_type: varchar("indicator_type", { length: 50 }).notNull(), // "revolving_door", "concentrated_lobbying", "regulatory_favoritism", "policy_alignment"
  
  // Entities involved
  entity_id: uuid("entity_id").references(() => corporate_entities.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "cascade" }),
  regulatory_body: varchar("regulatory_body", { length: 200 }),
  
  // Indicator details
  indicator_description: text("indicator_description").notNull(),
  evidence_summary: text("evidence_summary"),
  
  // Measurement
  indicator_strength: varchar("indicator_strength", { length: 20 }).notNull(), // "weak", "moderate", "strong", "very_strong"
  confidence_level: numeric("confidence_level", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Timeline and patterns
  pattern_start_date: date("pattern_start_date"),
  pattern_end_date: date("pattern_end_date"),
  is_ongoing: boolean("is_ongoing").notNull().default(true),
  
  // Impact assessment
  affected_policies: varchar("affected_policies", { length: 100 }).array(),
  estimated_public_cost: numeric("estimated_public_cost", { precision: 15, scale: 2 }),
  
  // Detection and analysis
  detection_method: varchar("detection_method", { length: 50 }), // "pattern_analysis", "investigation", "whistleblower", "academic_study"
  analysis_methodology: text("analysis_methodology"),
  
  // Status and follow-up
  investigation_status: varchar("investigation_status", { length: 30 }).notNull().default("identified"), // "identified", "under_investigation", "confirmed", "disputed", "resolved"
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Indicator type analysis
  typeStrengthIdx: index("idx_regulatory_capture_indicators_type_strength")
    .on(table.indicator_type, table.indicator_strength, table.is_ongoing),
  
  // Entity capture analysis
  entityCaptureIdx: index("idx_regulatory_capture_indicators_entity_capture")
    .on(table.entity_id, table.indicator_strength)
    .where(sql`${table.entity_id} IS NOT NULL`),
  
  // Sponsor influence analysis
  sponsorInfluenceIdx: index("idx_regulatory_capture_indicators_sponsor_influence")
    .on(table.sponsor_id, table.indicator_strength)
    .where(sql`${table.sponsor_id} IS NOT NULL`),
  
  // Investigation tracking
  investigationStatusIdx: index("idx_regulatory_capture_indicators_investigation_status")
    .on(table.investigation_status, table.created_at),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const corporateEntitiesRelations = relations(corporate_entities, ({ one, many }) => ({
  parentCompany: one(corporate_entities, {
    fields: [corporate_entities.parent_company_id],
    references: [corporate_entities.id],
    relationName: "parentChild",
  }),
  subsidiaries: many(corporate_entities, {
    relationName: "parentChild",
  }),
  financialInterests: many(financial_interests),
  lobbyingActivities: many(lobbying_activities),
  billConflicts: many(bill_financial_conflicts),
  ownedEntities: many(cross_sector_ownership, { relationName: "owner" }),
  ownerEntities: many(cross_sector_ownership, { relationName: "owned" }),
  captureIndicators: many(regulatory_capture_indicators),
}));

export const financialInterestsRelations = relations(financial_interests, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [financial_interests.sponsor_id],
    references: [sponsors.id],
  }),
  entity: one(corporate_entities, {
    fields: [financial_interests.entity_id],
    references: [corporate_entities.id],
  }),
  billConflicts: many(bill_financial_conflicts),
}));

export const lobbyingActivitiesRelations = relations(lobbying_activities, ({ one }) => ({
  lobbyistEntity: one(corporate_entities, {
    fields: [lobbying_activities.lobbyist_entity_id],
    references: [corporate_entities.id],
  }),
  targetSponsor: one(sponsors, {
    fields: [lobbying_activities.target_sponsor_id],
    references: [sponsors.id],
  }),
}));

export const billFinancialConflictsRelations = relations(bill_financial_conflicts, ({ one }) => ({
  bill: one(bills, {
    fields: [bill_financial_conflicts.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [bill_financial_conflicts.sponsor_id],
    references: [sponsors.id],
  }),
  financialInterest: one(financial_interests, {
    fields: [bill_financial_conflicts.financial_interest_id],
    references: [financial_interests.id],
  }),
  entity: one(corporate_entities, {
    fields: [bill_financial_conflicts.entity_id],
    references: [corporate_entities.id],
  }),
}));

export const crossSectorOwnershipRelations = relations(cross_sector_ownership, ({ one }) => ({
  ownerEntity: one(corporate_entities, {
    fields: [cross_sector_ownership.owner_entity_id],
    references: [corporate_entities.id],
    relationName: "owner",
  }),
  ownedEntity: one(corporate_entities, {
    fields: [cross_sector_ownership.owned_entity_id],
    references: [corporate_entities.id],
    relationName: "owned",
  }),
}));

export const regulatoryCaptureIndicatorsRelations = relations(regulatory_capture_indicators, ({ one }) => ({
  entity: one(corporate_entities, {
    fields: [regulatory_capture_indicators.entity_id],
    references: [corporate_entities.id],
  }),
  sponsor: one(sponsors, {
    fields: [regulatory_capture_indicators.sponsor_id],
    references: [sponsors.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CorporateEntity = typeof corporate_entities.$inferSelect;
export type NewCorporateEntity = typeof corporate_entities.$inferInsert;

export type FinancialInterest = typeof financial_interests.$inferSelect;
export type NewFinancialInterest = typeof financial_interests.$inferInsert;

export type LobbyingActivity = typeof lobbying_activities.$inferSelect;
export type NewLobbyingActivity = typeof lobbying_activities.$inferInsert;

export type BillFinancialConflict = typeof bill_financial_conflicts.$inferSelect;
export type NewBillFinancialConflict = typeof bill_financial_conflicts.$inferInsert;

export type CrossSectorOwnership = typeof cross_sector_ownership.$inferSelect;
export type NewCrossSectorOwnership = typeof cross_sector_ownership.$inferInsert;

export type RegulatoryCaptureIndicator = typeof regulatory_capture_indicators.$inferSelect;
export type NewRegulatoryCaptureIndicator = typeof regulatory_capture_indicators.$inferInsert;


