// ============================================================================
// TRANSPARENCY ANALYSIS SCHEMA
// ============================================================================
// Track corporate influence, financial interests, and lobbying activities
// in the Kenyan legislative process

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, date, unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Import related table definitions from other schema files
import { users, sponsors, bills } from "./foundation";
import { kenyanCountyEnum, verificationStatusEnum } from "./enum";

// ============================================================================
// CORPORATE ENTITIES - Companies and organizations in legislative process
// ============================================================================

export const corporate_entities = pgTable("corporate_entities", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Entity identification - core identity fields
  entity_name: varchar("entity_name", { length: 500 }).notNull(),
  entity_type: varchar("entity_type", { length: 100 }).notNull(), // "corporation", "ngo", "association", "cooperative", "partnership"
  registration_number: varchar("registration_number", { length: 100 }).unique(),
  tax_id: varchar("tax_id", { length: 100 }),
  
  // Business classification
  industry_sector: varchar("industry_sector", { length: 100 }),
  business_description: text("business_description"),
  primary_activities: text("primary_activities").array().default(sql`ARRAY[]::text[]`),
  
  // Geographic presence - where the entity operates
  headquarters_county: kenyanCountyEnum("headquarters_county"),
  operating_counties: kenyanCountyEnum("operating_counties").array().default(sql`ARRAY[]::kenyan_county[]`),
  international_operations: boolean("international_operations").notNull().default(false),
  
  // Corporate structure - tracks parent-subsidiary relationships
  parent_company_id: uuid("parent_company_id").references((): any => corporate_entities.id, { onDelete: "set null" }),
  subsidiary_companies: uuid("subsidiary_companies").array().default(sql`ARRAY[]::uuid[]`),
  ownership_structure: jsonb("ownership_structure").default(sql`'{}'::jsonb`), // Stores complex ownership hierarchies
  
  // Financial profile - helps assess scale and influence
  annual_revenue_range: varchar("annual_revenue_range", { length: 50 }), // "0-1M", "1M-10M", "10M-100M", "100M+"
  employee_count_range: varchar("employee_count_range", { length: 50 }), // "1-10", "11-50", "51-200", "201-500", "500+"
  market_capitalization: numeric("market_capitalization", { precision: 15, scale: 2 }),
  
  // Regulatory compliance - tracks legal standing
  regulatory_licenses: text("regulatory_licenses").array().default(sql`ARRAY[]::text[]`),
  compliance_status: varchar("compliance_status", { length: 50 }).notNull().default("unknown"), // "compliant", "non_compliant", "under_review", "unknown"
  regulatory_violations: jsonb("regulatory_violations").default(sql`'[]'::jsonb`), // Array of violation records with dates and descriptions
  
  // Contact information
  official_address: text("official_address"),
  contact_email: varchar("contact_email", { length: 255 }),
  contact_phone: varchar("contact_phone", { length: 50 }),
  website_url: varchar("website_url", { length: 500 }),
  
  // Data provenance and verification - ensures data quality
  data_sources: text("data_sources").array().default(sql`ARRAY[]::text[]`),
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  last_verified_at: timestamp("last_verified_at"),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  
  // Status tracking
  is_active: boolean("is_active").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Primary lookup indexes for common queries
  entityNameIdx: index("idx_corporate_entities_name").on(table.entity_name),
  entityTypeIdx: index("idx_corporate_entities_type").on(table.entity_type),
  industrySectorIdx: index("idx_corporate_entities_industry").on(table.industry_sector),
  
  // Geographic indexes for location-based analysis
  headquartersCountyIdx: index("idx_corporate_entities_headquarters").on(table.headquarters_county),
  operatingCountiesIdx: index("idx_corporate_entities_operating").using("gin", table.operating_counties),
  
  // Relationship and verification indexes
  parentCompanyIdx: index("idx_corporate_entities_parent").on(table.parent_company_id),
  verificationStatusIdx: index("idx_corporate_entities_verification").on(table.verification_status),
  
  // Active status for filtering current entities
  isActiveIdx: index("idx_corporate_entities_active").on(table.is_active),
  
  // Composite index for common filtered queries
  typeIndustryIdx: index("idx_corporate_entities_type_industry").on(table.entity_type, table.industry_sector),
}));

// ============================================================================
// FINANCIAL INTERESTS - Track sponsor financial stakes in legislation
// ============================================================================

export const financial_interests = pgTable("financial_interests", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Core relationship - which sponsor has interest in which entity
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  corporate_entity_id: uuid("corporate_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Type and nature of interest
  interest_type: varchar("interest_type", { length: 100 }).notNull(), // "shareholding", "directorship", "consultancy", "family_business", "investment", "employment"
  interest_description: text("interest_description").notNull(),
  
  // Financial quantification - helps assess conflict severity
  ownership_percentage: numeric("ownership_percentage", { precision: 5, scale: 2 }), // For shareholdings
  estimated_value_range: varchar("estimated_value_range", { length: 50 }), // "0-100K", "100K-1M", "1M-10M", "10M+"
  annual_income_from_interest: varchar("annual_income_range", { length: 50 }),
  
  // Position details - for directorship, employment, consultancy roles
  position_title: varchar("position_title", { length: 255 }),
  position_responsibilities: text("position_responsibilities"),
  compensation_details: text("compensation_details"),
  
  // Timeline tracking - monitors when interests begin and end
  interest_start_date: date("interest_start_date"),
  interest_end_date: date("interest_end_date"),
  is_current: boolean("is_current").notNull().default(true),
  
  // Disclosure tracking - where did this information come from
  disclosure_source: varchar("disclosure_source", { length: 255 }).notNull(), // "parliamentary_register", "company_filings", "media_report", "investigation", "self_disclosure"
  disclosure_date: date("disclosure_date").notNull(),
  disclosure_document_url: varchar("disclosure_document_url", { length: 500 }),
  
  // Verification process - ensures accuracy
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verification_method: varchar("verification_method", { length: 100 }), // "document_review", "cross_reference", "official_confirmation"
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verified_at: timestamp("verified_at"),
  verification_notes: text("verification_notes"),
  
  // Conflict of interest assessment
  potential_conflict: boolean("potential_conflict").notNull().default(false),
  conflict_assessment: text("conflict_assessment"),
  conflict_severity: varchar("conflict_severity", { length: 20 }), // "low", "medium", "high", "critical"
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Relationship indexes for joining queries
  sponsorIdx: index("idx_financial_interests_sponsor").on(table.sponsor_id),
  corporateEntityIdx: index("idx_financial_interests_entity").on(table.corporate_entity_id),
  
  // Analysis indexes
  interestTypeIdx: index("idx_financial_interests_type").on(table.interest_type),
  isCurrentIdx: index("idx_financial_interests_current").on(table.is_current),
  verificationStatusIdx: index("idx_financial_interests_verification").on(table.verification_status),
  
  // Conflict detection indexes
  potentialConflictIdx: index("idx_financial_interests_conflict").on(table.potential_conflict),
  conflictSeverityIdx: index("idx_financial_interests_severity").on(table.conflict_severity),
  
  // Composite indexes for common query patterns
  sponsorEntityIdx: index("idx_financial_interests_sponsor_entity").on(table.sponsor_id, table.corporate_entity_id),
  currentConflictIdx: index("idx_financial_interests_current_conflict").on(table.is_current, table.potential_conflict),
  
  // Date range queries
  startDateIdx: index("idx_financial_interests_start_date").on(table.interest_start_date),
  
  // Uniqueness constraint to prevent duplicate entries
  uniqueSponsorEntityInterest: unique("unique_sponsor_entity_interest").on(
    table.sponsor_id, 
    table.corporate_entity_id, 
    table.interest_type, 
    table.interest_start_date
  ),
}));

// ============================================================================
// LOBBYING ACTIVITIES - Track lobbying efforts on specific bills
// ============================================================================

export const lobbying_activities = pgTable("lobbying_activities", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Core relationship - which entity lobbies on which bill
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  lobbying_entity_id: uuid("lobbying_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Lobbyist identification - who is doing the actual lobbying work
  lobbyist_name: varchar("lobbyist_name", { length: 255 }),
  lobbyist_firm: varchar("lobbyist_firm", { length: 255 }),
  
  // Lobbying position and objectives
  lobbying_position: varchar("lobbying_position", { length: 20 }).notNull(), // "support", "oppose", "amend", "neutral"
  lobbying_objectives: text("lobbying_objectives").array().default(sql`ARRAY[]::text[]`),
  key_arguments: text("key_arguments").array().default(sql`ARRAY[]::text[]`),
  
  // Financial transparency - how much is being spent
  lobbying_expenditure: numeric("lobbying_expenditure", { precision: 12, scale: 2 }),
  expenditure_period: varchar("expenditure_period", { length: 50 }), // "monthly", "quarterly", "annual", "campaign"
  expenditure_breakdown: jsonb("expenditure_breakdown").default(sql`'{}'::jsonb`), // Detailed spending categories
  
  // Targeting and methods - who they're lobbying and how
  target_officials: text("target_officials").array().default(sql`ARRAY[]::text[]`), // MPs, committee members, ministers
  lobbying_methods: text("lobbying_methods").array().default(sql`ARRAY[]::text[]`), // "meetings", "written_submissions", "public_hearings", "events", "media_campaigns", "research_reports"
  meeting_count: integer("meeting_count").notNull().default(0),
  
  // Timeline and activity frequency
  lobbying_start_date: date("lobbying_start_date").notNull(),
  lobbying_end_date: date("lobbying_end_date"),
  activity_frequency: varchar("activity_frequency", { length: 50 }), // "daily", "weekly", "monthly", "as_needed"
  
  // Legal compliance and registration
  registered_lobbying: boolean("registered_lobbying").notNull().default(false),
  registration_number: varchar("registration_number", { length: 100 }),
  compliance_status: varchar("compliance_status", { length: 50 }).notNull().default("unknown"), // "compliant", "non_compliant", "not_required", "unknown"
  
  // Data provenance
  data_source: varchar("data_source", { length: 255 }).notNull(), // "lobbying_register", "parliamentary_records", "media_reports", "freedom_of_information"
  source_document_url: varchar("source_document_url", { length: 500 }),
  reporting_period: varchar("reporting_period", { length: 100 }),
  
  // Impact assessment - how effective was the lobbying
  lobbying_effectiveness: varchar("lobbying_effectiveness", { length: 50 }), // "high", "medium", "low", "unknown", "unsuccessful"
  documented_influence: text("documented_influence"),
  bill_amendments_attributed: text("bill_amendments_attributed").array().default(sql`ARRAY[]::text[]`),
  
  // Verification
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verified_at: timestamp("verified_at"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Primary relationship indexes
  billIdx: index("idx_lobbying_activities_bill").on(table.bill_id),
  lobbyingEntityIdx: index("idx_lobbying_activities_entity").on(table.lobbying_entity_id),
  
  // Position and effectiveness analysis
  positionIdx: index("idx_lobbying_activities_position").on(table.lobbying_position),
  effectivenessIdx: index("idx_lobbying_activities_effectiveness").on(table.lobbying_effectiveness),
  
  // Timeline queries
  startDateIdx: index("idx_lobbying_activities_start_date").on(table.lobbying_start_date),
  endDateIdx: index("idx_lobbying_activities_end_date").on(table.lobbying_end_date),
  
  // Compliance tracking
  registeredIdx: index("idx_lobbying_activities_registered").on(table.registered_lobbying),
  complianceStatusIdx: index("idx_lobbying_activities_compliance").on(table.compliance_status),
  
  // Verification
  verificationStatusIdx: index("idx_lobbying_activities_verification").on(table.verification_status),
  
  // Composite indexes for common queries
  billEntityIdx: index("idx_lobbying_activities_bill_entity").on(table.bill_id, table.lobbying_entity_id),
  expenditureIdx: index("idx_lobbying_activities_expenditure").on(table.lobbying_expenditure),
  
  // Position effectiveness analysis
  positionEffectivenessIdx: index("idx_lobbying_activities_pos_eff").on(table.lobbying_position, table.lobbying_effectiveness),
}));

// ============================================================================
// BILL FINANCIAL CONFLICTS - Identified conflicts between bills and interests
// ============================================================================

export const bill_financial_conflicts = pgTable("bill_financial_conflicts", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Core three-way relationship: bill + sponsor + their financial interest
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  financial_interest_id: uuid("financial_interest_id").notNull().references(() => financial_interests.id, { onDelete: "cascade" }),
  
  // Conflict classification and analysis
  conflict_type: varchar("conflict_type", { length: 100 }).notNull(), // "direct_benefit", "competitive_advantage", "regulatory_relief", "market_protection", "elimination_of_competitor"
  conflict_description: text("conflict_description").notNull(),
  conflict_severity: varchar("conflict_severity", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  
  // Financial impact assessment - quantifies the stakes
  potential_financial_impact: varchar("potential_impact_range", { length: 50 }), // "0-100K", "100K-1M", "1M-10M", "10M-100M", "100M+"
  impact_mechanism: text("impact_mechanism"), // Detailed explanation of how the bill benefits the interest
  affected_provisions: text("affected_provisions").array().default(sql`ARRAY[]::text[]`), // Specific bill sections creating conflict
  
  // Detection methodology and confidence
  detection_method: varchar("detection_method", { length: 100 }).notNull(), // "automated_analysis", "manual_review", "public_report", "investigation", "algorithmic_pattern"
  confidence_level: numeric("confidence_level", { precision: 3, scale: 2 }).notNull(), // 0.00 to 1.00, where 1.00 is absolute certainty
  supporting_evidence: text("supporting_evidence").array().default(sql`ARRAY[]::text[]`),
  
  // Public transparency tracking
  publicly_disclosed: boolean("publicly_disclosed").notNull().default(false),
  disclosure_date: date("disclosure_date"),
  disclosure_method: varchar("disclosure_method", { length: 100 }), // "parliamentary_register", "media_report", "platform_analysis", "self_disclosure"
  
  // Resolution and lifecycle tracking
  conflict_status: varchar("conflict_status", { length: 50 }).notNull().default("identified"), // "identified", "disclosed", "recused", "resolved", "dismissed", "under_review"
  resolution_action: text("resolution_action"),
  resolution_date: date("resolution_date"),
  
  // Verification and quality control
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verified_at: timestamp("verified_at"),
  verification_notes: text("verification_notes"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Primary relationship indexes
  billIdx: index("idx_bill_financial_conflicts_bill").on(table.bill_id),
  sponsorIdx: index("idx_bill_financial_conflicts_sponsor").on(table.sponsor_id),
  financialInterestIdx: index("idx_bill_financial_conflicts_interest").on(table.financial_interest_id),
  
  // Classification and severity indexes
  conflictTypeIdx: index("idx_bill_financial_conflicts_type").on(table.conflict_type),
  conflictSeverityIdx: index("idx_bill_financial_conflicts_severity").on(table.conflict_severity),
  conflictStatusIdx: index("idx_bill_financial_conflicts_status").on(table.conflict_status),
  
  // Transparency tracking
  publiclyDisclosedIdx: index("idx_bill_financial_conflicts_disclosed").on(table.publicly_disclosed),
  
  // Composite indexes for complex queries
  billSponsorIdx: index("idx_bill_financial_conflicts_bill_sponsor").on(table.bill_id, table.sponsor_id),
  severityStatusIdx: index("idx_bill_financial_conflicts_sev_status").on(table.conflict_severity, table.conflict_status),
  
  // Confidence-based filtering
  confidenceLevelIdx: index("idx_bill_financial_conflicts_confidence").on(table.confidence_level),
  
  // Prevent duplicate conflict entries for same relationship
  uniqueConflict: unique("unique_bill_sponsor_interest_conflict").on(
    table.bill_id,
    table.sponsor_id,
    table.financial_interest_id
  ),
}));

// ============================================================================
// CROSS SECTOR OWNERSHIP - Track ownership relationships between entities
// ============================================================================

export const cross_sector_ownership = pgTable("cross_sector_ownership", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Ownership relationship - who owns whom
  owner_entity_id: uuid("owner_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  owned_entity_id: uuid("owned_entity_id").notNull().references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Ownership quantification
  ownership_percentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  ownership_type: varchar("ownership_type", { length: 100 }).notNull(), // "direct_shareholding", "indirect_control", "subsidiary", "joint_venture", "affiliate"
  control_level: varchar("control_level", { length: 50 }).notNull(), // "majority", "minority", "controlling", "non_controlling", "significant_influence"
  
  // Financial details of the ownership
  investment_value: numeric("investment_value", { precision: 15, scale: 2 }),
  acquisition_date: date("acquisition_date"),
  acquisition_method: varchar("acquisition_method", { length: 100 }), // "purchase", "merger", "inheritance", "formation", "asset_transfer"
  
  // Control mechanisms beyond ownership percentage
  voting_rights_percentage: numeric("voting_rights_percentage", { precision: 5, scale: 2 }),
  board_representation: integer("board_representation").notNull().default(0), // Number of board seats held
  management_control: boolean("management_control").notNull().default(false), // Direct operational control
  
  // Cross-sector implications - tracks influence across industries
  creates_cross_sector_influence: boolean("creates_cross_sector_influence").notNull().default(false),
  affected_sectors: text("affected_sectors").array().default(sql`ARRAY[]::text[]`),
  regulatory_implications: text("regulatory_implications"),
  
  // Data provenance
  data_source: varchar("data_source", { length: 255 }).notNull(),
  source_document_url: varchar("source_document_url", { length: 500 }),
  
  // Verification
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verified_by: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verified_at: timestamp("verified_at"),
  
  // Lifecycle tracking
  is_current: boolean("is_current").notNull().default(true),
  end_date: date("end_date"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Relationship indexes for ownership queries
  ownerEntityIdx: index("idx_cross_sector_ownership_owner").on(table.owner_entity_id),
  ownedEntityIdx: index("idx_cross_sector_ownership_owned").on(table.owned_entity_id),
  
  // Classification indexes
  ownershipTypeIdx: index("idx_cross_sector_ownership_type").on(table.ownership_type),
  controlLevelIdx: index("idx_cross_sector_ownership_control").on(table.control_level),
  
  // Cross-sector analysis
  crossSectorInfluenceIdx: index("idx_cross_sector_ownership_influence").on(table.creates_cross_sector_influence),
  affectedSectorsIdx: index("idx_cross_sector_ownership_sectors").using("gin", table.affected_sectors),
  
  // Status tracking
  isCurrentIdx: index("idx_cross_sector_ownership_current").on(table.is_current),
  verificationStatusIdx: index("idx_cross_sector_ownership_verification").on(table.verification_status),
  
  // Composite indexes
  ownerOwnedIdx: index("idx_cross_sector_ownership_relationship").on(table.owner_entity_id, table.owned_entity_id),
  controlInfluenceIdx: index("idx_cross_sector_ownership_control_influence").on(table.control_level, table.creates_cross_sector_influence),
  
  // Ownership percentage queries
  ownershipPercentageIdx: index("idx_cross_sector_ownership_percentage").on(table.ownership_percentage),
  
  // Prevent duplicate ownership records
  uniqueOwnership: unique("unique_owner_owned_relationship").on(
    table.owner_entity_id,
    table.owned_entity_id,
    table.acquisition_date
  ),
}));

// ============================================================================
// REGULATORY CAPTURE INDICATORS - Patterns suggesting regulatory capture
// ============================================================================

export const regulatory_capture_indicators = pgTable("regulatory_capture_indicators", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  
  // Context - what's being analyzed (at least one must be provided)
  bill_id: uuid("bill_id").references(() => bills.id, { onDelete: "cascade" }),
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "cascade" }),
  corporate_entity_id: uuid("corporate_entity_id").references(() => corporate_entities.id, { onDelete: "cascade" }),
  
  // Indicator classification and assessment
  indicator_type: varchar("indicator_type", { length: 100 }).notNull(), // "revolving_door", "concentrated_benefits", "weak_oversight", "industry_drafting", "disproportionate_access", "asymmetric_information"
  indicator_description: text("indicator_description").notNull(),
  indicator_strength: varchar("indicator_strength", { length: 20 }).notNull(), // "weak", "moderate", "strong", "very_strong"
  
  // Evidence quality and analysis rigor
  supporting_evidence: text("supporting_evidence").array().default(sql`ARRAY[]::text[]`),
  evidence_quality: varchar("evidence_quality", { length: 20 }).notNull(), // "low", "medium", "high", "verified"
  analysis_methodology: text("analysis_methodology"),
  
  // Pattern detection and historical context
  pattern_frequency: integer("pattern_frequency"), // How often this pattern appears in the dataset
  historical_precedents: text("historical_precedents").array().default(sql`ARRAY[]::text[]`),
  comparative_analysis: text("comparative_analysis"), // How this compares to similar cases
  
  // Risk assessment for public interest
  capture_risk_level: varchar("capture_risk_level", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  public_interest_impact: varchar("public_interest_impact", { length: 20 }), // "minimal", "moderate", "significant", "severe"
  
  // Detection metadata
  detection_date: date("detection_date").notNull(),
  detection_method: varchar("detection_method", { length: 100 }).notNull(), // "automated_analysis", "expert_review", "public_report", "statistical_analysis", "machine_learning"
  analyst_id: uuid("analyst_id").references(() => users.id, { onDelete: "set null" }),
  
  // Peer review and quality assurance
  peer_reviewed: boolean("peer_reviewed").notNull().default(false),
  review_date: date("review_date"),
  reviewer_id: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  reviewer_notes: text("reviewer_notes"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Context indexes for filtering by entity type
  billIdx: index("idx_regulatory_capture_indicators_bill").on(table.bill_id),
  sponsorIdx: index("idx_regulatory_capture_indicators_sponsor").on(table.sponsor_id),
  corporateEntityIdx: index("idx_regulatory_capture_indicators_entity").on(table.corporate_entity_id),
  
  // Classification indexes
  indicatorTypeIdx: index("idx_regulatory_capture_indicators_type").on(table.indicator_type),
  indicatorStrengthIdx: index("idx_regulatory_capture_indicators_strength").on(table.indicator_strength),
  
  // Risk assessment indexes
  captureRiskIdx: index("idx_regulatory_capture_indicators_risk").on(table.capture_risk_level),
  publicInterestImpactIdx: index("idx_regulatory_capture_indicators_impact").on(table.public_interest_impact),
  
  // Quality and review indexes
  evidenceQualityIdx: index("idx_regulatory_capture_indicators_evidence").on(table.evidence_quality),
  peerReviewedIdx: index("idx_regulatory_capture_indicators_reviewed").on(table.peer_reviewed),
  
  // Date and analyst tracking
  detectionDateIdx: index("idx_regulatory_capture_indicators_detection_date").on(table.detection_date),
  analystIdx: index("idx_regulatory_capture_indicators_analyst").on(table.analyst_id),
  
  // Composite indexes for analysis queries
  typeRiskIdx: index("idx_regulatory_capture_indicators_type_risk").on(table.indicator_type, table.capture_risk_level),
  strengthRiskIdx: index("idx_regulatory_capture_indicators_strength_risk").on(table.indicator_strength, table.capture_risk_level),
}));

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export const corporateEntitiesRelations = relations(corporate_entities, ({ one, many }) => ({
  // Self-referential relationship for corporate hierarchy
  parentCompany: one(corporate_entities, {
    fields: [corporate_entities.parent_company_id],
    references: [corporate_entities.id],
    relationName: "parent",
  }),
  subsidiaries: many(corporate_entities, {
    relationName: "parent",
  }),
  
  // User relationships for verification
  verifiedBy: one(users, {
    fields: [corporate_entities.verified_by],
    references: [users.id],
  }),
  
  // Activity relationships
  financialInterests: many(financial_interests),
  lobbyingActivities: many(lobbying_activities),
  
  // Ownership relationships
  ownershipAsOwner: many(cross_sector_ownership, {
    relationName: "owner",
  }),
  ownershipAsOwned: many(cross_sector_ownership, {
    relationName: "owned",
  }),
  
  // Analysis relationships
  regulatoryCaptureIndicators: many(regulatory_capture_indicators),
}));

export const financialInterestsRelations = relations(financial_interests, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [financial_interests.sponsor_id],
    references: [sponsors.id],
  }),
  corporateEntity: one(corporate_entities, {
    fields: [financial_interests.corporate_entity_id],
    references: [corporate_entities.id],
  }),
  verifiedBy: one(users, {
    fields: [financial_interests.verified_by],
    references: [users.id],
  }),
  billConflicts: many(bill_financial_conflicts),
}));

export const lobbyingActivitiesRelations = relations(lobbying_activities, ({ one }) => ({
  bill: one(bills, {
    fields: [lobbying_activities.bill_id],
    references: [bills.id],
  }),
  lobbyingEntity: one(corporate_entities, {
    fields: [lobbying_activities.lobbying_entity_id],
    references: [corporate_entities.id],
  }),
  verifiedBy: one(users, {
    fields: [lobbying_activities.verified_by],
    references: [users.id],
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
  verifiedBy: one(users, {
    fields: [bill_financial_conflicts.verified_by],
    references: [users.id],
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
  verifiedBy: one(users, {
    fields: [cross_sector_ownership.verified_by],
    references: [users.id],
  }),
}));

export const regulatoryCaptureIndicatorsRelations = relations(regulatory_capture_indicators, ({ one }) => ({
  bill: one(bills, {
    fields: [regulatory_capture_indicators.bill_id],
    references: [bills.id],
  }),
  sponsor: one(sponsors, {
    fields: [regulatory_capture_indicators.sponsor_id],
    references: [sponsors.id],
  }),
  corporateEntity: one(corporate_entities, {
    fields: [regulatory_capture_indicators.corporate_entity_id],
    references: [corporate_entities.id],
  }),
  analyst: one(users, {
    fields: [regulatory_capture_indicators.analyst_id],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [regulatory_capture_indicators.reviewer_id],
    references: [users.id],
  }),
}));