// ============================================================================
// MARKET INTELLIGENCE SCHEMA - PRODUCTION OPTIMIZED v1.0
// ============================================================================
// Market dynamics, economic impact analysis, and stakeholder influence tracking
// Enables understanding of economic forces behind legislative decisions
// Optimized for: Performance, Data Integrity, Scalability, Type Safety

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, jsonb, numeric, uuid, varchar, index, unique, date, check
    index, unique, date, smallint, check, foreignKey
} from "drizzle-orm/pg-core";

import {
    kenyanCountyEnum
} from "./enum";
import { primaryKeyUuid, auditFields } from "./base-types";
import { commodityCategoryEnum, reliabilityScoreEnum } from "./enum";
import { bills } from "./foundation";
// ============================================================================
// MARKET SECTORS - Economic sector classification and tracking
// ============================================================================

export const market_sectors = pgTable("market_sectors", {
    id: primaryKeyUuid(),

    // Sector identification
    sector_name: varchar("sector_name", { length: 200 }).notNull().unique(),
    sector_code: varchar("sector_code", { length: 20 }).notNull().unique(),
    // Example: "AGRI", "TECH", "FINA", "ENER", "HEAL"

    parent_sector_id: uuid("parent_sector_id"),
    // Hierarchical sector organization

    // Economic metrics
    gdp_contribution_percentage: numeric("gdp_contribution_percentage", { precision: 5, scale: 2 }),
    // Sector's contribution to Kenya's GDP

    employment_percentage: numeric("employment_percentage", { precision: 5, scale: 2 }),
    // Percentage of workforce employed in this sector

    export_value_usd: numeric("export_value_usd", { precision: 18, scale: 2 }),
    // Annual export value in USD

    // Regulatory environment
    regulatory_intensity: varchar("regulatory_intensity", { length: 20 }),
    // Values: 'light', 'moderate', 'heavy', 'complex'

    key_regulators: varchar("key_regulators", { length: 100 }).array(),
    // Example: ["CBK", "CMA", "EPRA", "CAK"]

    // Market characteristics
    market_concentration: varchar("market_concentration", { length: 20 }),
    // Values: 'fragmented', 'competitive', 'oligopoly', 'monopoly'

    foreign_ownership_allowed: boolean("foreign_ownership_allowed").notNull().default(true),
    foreign_ownership_limit: numeric("foreign_ownership_limit", { precision: 5, scale: 2 }),
    // Percentage limit on foreign ownership

    // Political sensitivity
    political_sensitivity: varchar("political_sensitivity", { length: 20 }),
    // Values: 'low', 'medium', 'high', 'strategic'

    government_involvement: varchar("government_involvement", { length: 30 }),
    // Values: 'minimal', 'regulatory', 'participant', 'dominant'

    // Sector metadata
    description: text("description"),
    key_players: jsonb("key_players").notNull().default(sql`'{}'::jsonb`),
    /* Structure: [
      {
        "name": "Safaricom PLC",
        "market_share": 65.2,
        "type": "private",
        "ownership": "public_listed"
      }
    ] */

    ...auditFields(),
}, (table) => ({
    // Self-referencing foreign key for hierarchical sectors
    parentSectorFk: foreignKey({
        columns: [table.parent_sector_id],
        foreignColumns: [table.id],
    }).onDelete("set null"),

    // Sector hierarchy queries
    parentSectorIdx: index("idx_market_sectors_parent")
        .on(table.parent_sector_id)
        .where(sql`${table.parent_sector_id} IS NOT NULL`),

    // Economic impact analysis
    gdpContributionIdx: index("idx_market_sectors_gdp_contribution")
        .on(table.gdp_contribution_percentage.desc())
        .where(sql`${table.gdp_contribution_percentage} IS NOT NULL`),

    // Political sensitivity tracking
    politicalSensitivityIdx: index("idx_market_sectors_political_sensitivity")
        .on(table.political_sensitivity, table.government_involvement),

    // Regulatory analysis
    regulatoryIntensityIdx: index("idx_market_sectors_regulatory_intensity")
        .on(table.regulatory_intensity),

    // GIN indexes for arrays
    regulatorsIdx: index("idx_market_sectors_regulators")
        .using("gin", table.key_regulators),
    playersIdx: index("idx_market_sectors_players")
        .using("gin", table.key_players),

    // Validation: Percentages 0-100
    percentageCheck: check("market_sectors_percentage_check",
        sql`(${table.gdp_contribution_percentage} IS NULL OR (${table.gdp_contribution_percentage} >= 0 AND ${table.gdp_contribution_percentage} <= 100))
      AND (${table.employment_percentage} IS NULL OR (${table.employment_percentage} >= 0 AND ${table.employment_percentage} <= 100))
      AND (${table.foreign_ownership_limit} IS NULL OR (${table.foreign_ownership_limit} >= 0 AND ${table.foreign_ownership_limit} <= 100))`),

    // Validation: Export value positive
    exportValueCheck: check("market_sectors_export_value_check",
        sql`${table.export_value_usd} IS NULL OR ${table.export_value_usd} >= 0`),
}));

// ============================================================================
// ECONOMIC IMPACT ASSESSMENTS - Bill impact on market sectors
// ============================================================================

export const economic_impact_assessments = pgTable("economic_impact_assessments", {
    id: primaryKeyUuid(),
    bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    sector_id: uuid("sector_id").notNull().references(() => market_sectors.id, { onDelete: "cascade" }),

    // Impact assessment
    impact_type: varchar("impact_type", { length: 30 }).notNull(),
    // Values: 'regulatory', 'taxation', 'market_access', 'competition', 'compliance_cost'

    impact_magnitude: varchar("impact_magnitude", { length: 20 }),
    // Values: 'negligible', 'minor', 'moderate', 'major', 'transformative'

    impact_direction: varchar("impact_direction", { length: 20 }),
    // Values: 'positive', 'negative', 'neutral', 'mixed'

    confidence_level: numeric("confidence_level", { precision: 3, scale: 2 }),
    // 0.00 to 1.00 scale

    // Quantitative estimates
    estimated_cost_impact: numeric("estimated_cost_impact", { precision: 18, scale: 2 }),
    // Estimated cost impact in KES (positive = cost increase, negative = savings)

    estimated_revenue_impact: numeric("estimated_revenue_impact", { precision: 18, scale: 2 }),
    // Estimated revenue impact in KES

    estimated_employment_impact: integer("estimated_employment_impact"),
    // Estimated job creation/loss (positive = jobs created, negative = jobs lost)

    // Timeline
    impact_timeline: varchar("impact_timeline", { length: 20 }),
    // Values: 'immediate', 'short_term', 'medium_term', 'long_term'

    implementation_period_months: smallint("implementation_period_months"),

    // Analysis details
    analysis_methodology: varchar("analysis_methodology", { length: 50 }),
    // Values: 'expert_assessment', 'economic_modeling', 'stakeholder_survey', 'comparative_analysis'

    key_assumptions: text("key_assumptions"),
    risk_factors: text("risk_factors"),

    // Stakeholder perspectives
    industry_position: varchar("industry_position", { length: 20 }),
    // Values: 'strongly_support', 'support', 'neutral', 'oppose', 'strongly_oppose'

    government_position: varchar("government_position", { length: 20 }),

    // Assessment metadata
    assessed_by: uuid("assessed_by").references(() => users.id, { onDelete: "set null" }),
    assessment_date: date("assessment_date").notNull().default(sql`CURRENT_DATE`),

    ...auditFields(),
}, (table) => ({
    // Hot path: Bill impact analysis
    billSectorIdx: index("idx_economic_impact_bill_sector")
        .on(table.bill_id, table.sector_id),

    // Impact magnitude analysis
    magnitudeDirectionIdx: index("idx_economic_impact_magnitude_direction")
        .on(table.impact_magnitude, table.impact_direction),

    // Sector impact tracking
    sectorImpactIdx: index("idx_economic_impact_sector_impact")
        .on(table.sector_id, table.impact_magnitude, table.impact_direction),

    // Timeline analysis
    timelineIdx: index("idx_economic_impact_timeline")
        .on(table.impact_timeline, table.implementation_period_months),

    // Assessment tracking
    assessedByIdx: index("idx_economic_impact_assessed_by")
        .on(table.assessed_by, table.assessment_date.desc())
        .where(sql`${table.assessed_by} IS NOT NULL`),

    // Validation: Confidence level 0-1
    confidenceCheck: check("economic_impact_confidence_check",
        sql`${table.confidence_level} IS NULL OR (${table.confidence_level} >= 0 AND ${table.confidence_level} <= 1)`),

    // Validation: Implementation period positive
    implementationPeriodCheck: check("economic_impact_implementation_period_check",
        sql`${table.implementation_period_months} IS NULL OR ${table.implementation_period_months} > 0`),
}));

// ============================================================================
// MARKET STAKEHOLDERS - Key economic actors and their interests
// ============================================================================

export const market_stakeholders = pgTable("market_stakeholders", {
    id: primaryKeyUuid(),

    // Stakeholder identification
    stakeholder_name: varchar("stakeholder_name", { length: 300 }).notNull(),
    stakeholder_type: varchar("stakeholder_type", { length: 50 }).notNull(),
    // Values: 'corporation', 'industry_association', 'trade_union', 'cooperative',
    //         'professional_body', 'lobby_group', 'think_tank'

    // Economic profile
    annual_revenue: numeric("annual_revenue", { precision: 18, scale: 2 }),
    employee_count: integer("employee_count"),
    market_capitalization: numeric("market_capitalization", { precision: 18, scale: 2 }),

    // Sector involvement
    primary_sector_id: uuid("primary_sector_id").references(() => market_sectors.id, { onDelete: "set null" }),
    secondary_sectors: uuid("secondary_sectors").array(),

    // Geographic presence
    headquarters_county: kenyanCountyEnum("headquarters_county"),
    operational_counties: kenyanCountyEnum("operational_counties").array(),

    // Ownership structure
    ownership_type: varchar("ownership_type", { length: 30 }),
    // Values: 'private', 'public_listed', 'state_owned', 'cooperative', 'foreign_owned', 'joint_venture'

    foreign_ownership_percentage: numeric("foreign_ownership_percentage", { precision: 5, scale: 2 }),

    // Political connections
    political_affiliations: jsonb("political_affiliations").notNull().default(sql`'{}'::jsonb`),
    /* Structure: [
      {
        "type": "board_member",
        "person": "John Doe",
        "position": "Former Cabinet Secretary",
        "relationship_strength": "high"
      }
    ] */

    lobbying_expenditure_annual: numeric("lobbying_expenditure_annual", { precision: 15, scale: 2 }),

    // Influence metrics
    political_influence_score: numeric("political_influence_score", { precision: 5, scale: 2 }),
    // 0-100 scale based on connections, expenditure, success rate

    media_influence_score: numeric("media_influence_score", { precision: 5, scale: 2 }),
    // Based on media mentions, owned media, advertising spend

    // Contact and transparency
    website: varchar("website", { length: 500 }),
    contact_email: varchar("contact_email", { length: 320 }),
    public_affairs_contact: varchar("public_affairs_contact", { length: 200 }),

    // Transparency metrics
    financial_disclosure_quality: varchar("financial_disclosure_quality", { length: 20 }),
    // Values: 'excellent', 'good', 'adequate', 'poor', 'none'

    ...auditFields(),
}, (table) => ({
    // Stakeholder type analysis
    typeIdx: index("idx_market_stakeholders_type")
        .on(table.stakeholder_type),

    // Sector involvement
    primarySectorIdx: index("idx_market_stakeholders_primary_sector")
        .on(table.primary_sector_id)
        .where(sql`${table.primary_sector_id} IS NOT NULL`),

    // Geographic presence
    headquartersIdx: index("idx_market_stakeholders_headquarters")
        .on(table.headquarters_county)
        .where(sql`${table.headquarters_county} IS NOT NULL`),

    // Influence scoring
    politicalInfluenceIdx: index("idx_market_stakeholders_political_influence")
        .on(table.political_influence_score.desc())
        .where(sql`${table.political_influence_score} IS NOT NULL`),

    mediaInfluenceIdx: index("idx_market_stakeholders_media_influence")
        .on(table.media_influence_score.desc())
        .where(sql`${table.media_influence_score} IS NOT NULL`),

    // Revenue analysis
    revenueIdx: index("idx_market_stakeholders_revenue")
        .on(table.annual_revenue.desc())
        .where(sql`${table.annual_revenue} IS NOT NULL`),

    // GIN indexes for arrays
    secondarySectorsIdx: index("idx_market_stakeholders_secondary_sectors")
        .using("gin", table.secondary_sectors),
    operationalCountiesIdx: index("idx_market_stakeholders_operational_counties")
        .using("gin", table.operational_counties),
    politicalAffiliationsIdx: index("idx_market_stakeholders_political_affiliations")
        .using("gin", table.political_affiliations),

    // Validation: Percentages 0-100
    percentageCheck: check("market_stakeholders_percentage_check",
        sql`(${table.foreign_ownership_percentage} IS NULL OR (${table.foreign_ownership_percentage} >= 0 AND ${table.foreign_ownership_percentage} <= 100))
      AND (${table.political_influence_score} IS NULL OR (${table.political_influence_score} >= 0 AND ${table.political_influence_score} <= 100))
      AND (${table.media_influence_score} IS NULL OR (${table.media_influence_score} >= 0 AND ${table.media_influence_score} <= 100))`),

    // Validation: Financial values positive
    financialCheck: check("market_stakeholders_financial_check",
        sql`(${table.annual_revenue} IS NULL OR ${table.annual_revenue} >= 0)
      AND (${table.market_capitalization} IS NULL OR ${table.market_capitalization} >= 0)
      AND (${table.lobbying_expenditure_annual} IS NULL OR ${table.lobbying_expenditure_annual} >= 0)
      AND (${table.employee_count} IS NULL OR ${table.employee_count} >= 0)`),
}));

// ============================================================================
// STAKEHOLDER POSITIONS - Positions on specific bills
// ============================================================================

export const stakeholder_positions = pgTable("stakeholder_positions", {
    id: primaryKeyUuid(),
    stakeholder_id: uuid("stakeholder_id").notNull().references(() => market_stakeholders.id, { onDelete: "cascade" }),
    bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

    // Position details
    position: varchar("position", { length: 20 }).notNull(),
    // Values: 'strongly_support', 'support', 'neutral', 'oppose', 'strongly_oppose'

    position_strength: numeric("position_strength", { precision: 3, scale: 2 }),
    // 0.00 to 1.00 scale (how strongly they hold this position)

    public_position: boolean("public_position").notNull().default(true),
    // Whether they've taken a public stance

    // Position rationale
    stated_reasons: text("stated_reasons"),
    economic_interests: text("economic_interests"),
    // How the bill affects their economic interests

    // Advocacy activities
    lobbying_activities: jsonb("lobbying_activities").notNull().default(sql`'{}'::jsonb`),
    /* Structure: [
      {
        "date": "2024-03-15",
        "type": "meeting",
        "target": "Finance Committee",
        "description": "Presented position paper on tax implications"
      }
    ] */

    public_statements: jsonb("public_statements").notNull().default(sql`'{}'::jsonb`),
    /* Structure: [
      {
        "date": "2024-03-20",
        "medium": "press_release",
        "title": "Industry Concerns on Proposed Legislation",
        "url": "https://example.com/statement"
      }
    ] */

    // Coalition building
    coalition_memberships: varchar("coalition_memberships", { length: 200 }).array(),
    // Names of coalitions they've joined for this bill

    // Influence activities
    campaign_contributions_related: numeric("campaign_contributions_related", { precision: 15, scale: 2 }),
    // Contributions made during bill consideration period

    media_spend_related: numeric("media_spend_related", { precision: 15, scale: 2 }),
    // Media/advertising spend related to this bill

    // Position tracking
    position_first_stated: date("position_first_stated"),
    position_last_updated: date("position_last_updated"),

    ...auditFields(),
}, (table) => ({
    // Unique position per stakeholder per bill
    stakeholderBillUnique: unique("stakeholder_positions_stakeholder_bill_unique")
        .on(table.stakeholder_id, table.bill_id),

    // Bill position analysis
    billPositionIdx: index("idx_stakeholder_positions_bill_position")
        .on(table.bill_id, table.position, table.position_strength.desc()),

    // Stakeholder activity tracking
    stakeholderPositionIdx: index("idx_stakeholder_positions_stakeholder_position")
        .on(table.stakeholder_id, table.position),

    // Public positions
    publicPositionIdx: index("idx_stakeholder_positions_public")
        .on(table.public_position, table.position)
        .where(sql`${table.public_position} = true`),

    // Coalition analysis
    coalitionIdx: index("idx_stakeholder_positions_coalition")
        .using("gin", table.coalition_memberships),

    // GIN indexes for JSONB
    lobbyingActivitiesIdx: index("idx_stakeholder_positions_lobbying")
        .using("gin", table.lobbying_activities),
    publicStatementsIdx: index("idx_stakeholder_positions_statements")
        .using("gin", table.public_statements),

    // Validation: Position strength 0-1
    positionStrengthCheck: check("stakeholder_positions_strength_check",
        sql`${table.position_strength} IS NULL OR (${table.position_strength} >= 0 AND ${table.position_strength} <= 1)`),

    // Validation: Financial values positive
    financialCheck: check("stakeholder_positions_financial_check",
        sql`(${table.campaign_contributions_related} IS NULL OR ${table.campaign_contributions_related} >= 0)
      AND (${table.media_spend_related} IS NULL OR ${table.media_spend_related} >= 0)`),
}));

// ============================================================================
// MARKET TRENDS - Economic trend tracking and analysis
// ============================================================================

export const market_trends = pgTable("market_trends", {
    id: primaryKeyUuid(),

    // Trend identification
    trend_name: varchar("trend_name", { length: 200 }).notNull(),
    trend_category: varchar("trend_category", { length: 50 }).notNull(),
    // Values: 'technological', 'regulatory', 'demographic', 'economic', 'social', 'environmental'

    // Affected sectors
    primary_sector_id: uuid("primary_sector_id").references(() => market_sectors.id, { onDelete: "set null" }),
    affected_sectors: uuid("affected_sectors").array(),

    // Trend characteristics
    trend_direction: varchar("trend_direction", { length: 20 }),
    // Values: 'emerging', 'growing', 'mature', 'declining', 'disruptive'

    impact_magnitude: varchar("impact_magnitude", { length: 20 }),
    // Values: 'low', 'medium', 'high', 'transformative'

    timeline: varchar("timeline", { length: 20 }),
    // Values: 'immediate', 'short_term', 'medium_term', 'long_term'

    // Trend analysis
    description: text("description").notNull(),
    key_drivers: text("key_drivers"),
    potential_impacts: text("potential_impacts"),

    // Legislative relevance
    legislative_implications: text("legislative_implications"),
    related_bills: uuid("related_bills").array(),

    // Trend metrics
    confidence_level: numeric("confidence_level", { precision: 3, scale: 2 }),
    // 0.00 to 1.00 scale

    evidence_strength: varchar("evidence_strength", { length: 20 }),
    // Values: 'weak', 'moderate', 'strong', 'conclusive'

    // Tracking
    first_identified: date("first_identified").notNull(),
    last_updated: date("last_updated").notNull().default(sql`CURRENT_DATE`),

    ...auditFields(),
}, (table) => ({
    // Trend category analysis
    categoryDirectionIdx: index("idx_market_trends_category_direction")
        .on(table.trend_category, table.trend_direction),

    // Impact analysis
    impactMagnitudeIdx: index("idx_market_trends_impact_magnitude")
        .on(table.impact_magnitude, table.timeline),

    // Sector impact
    primarySectorIdx: index("idx_market_trends_primary_sector")
        .on(table.primary_sector_id)
        .where(sql`${table.primary_sector_id} IS NOT NULL`),

    // Timeline tracking
    timelineIdx: index("idx_market_trends_timeline")
        .on(table.timeline, table.first_identified.desc()),

    // GIN indexes for arrays
    affectedSectorsIdx: index("idx_market_trends_affected_sectors")
        .using("gin", table.affected_sectors),
    relatedBillsIdx: index("idx_market_trends_related_bills")
        .using("gin", table.related_bills),

    // Validation: Confidence level 0-1
    confidenceCheck: check("market_trends_confidence_check",
        sql`${table.confidence_level} IS NULL OR (${table.confidence_level} >= 0 AND ${table.confidence_level} <= 1)`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM Relations
// ============================================================================

export const marketSectorsRelations = relations(market_sectors, ({ one, many }) => ({
    parentSector: one(market_sectors, {
        fields: [market_sectors.parent_sector_id],
        references: [market_sectors.id],
        relationName: "parent_child_sectors",
    }),
    childSectors: many(market_sectors, { relationName: "parent_child_sectors" }),
    economicImpactAssessments: many(economic_impact_assessments),
    primaryStakeholders: many(market_stakeholders),
    primaryTrends: many(market_trends),
}));

export const economicImpactAssessmentsRelations = relations(economic_impact_assessments, ({ one }) => ({
    bill: one(bills, {
        fields: [economic_impact_assessments.bill_id],
        references: [bills.id],
    }),
    sector: one(market_sectors, {
        fields: [economic_impact_assessments.sector_id],
        references: [market_sectors.id],
    }),
    assessor: one(users, {
        fields: [economic_impact_assessments.assessed_by],
        references: [users.id],
    }),
}));

export const marketStakeholdersRelations = relations(market_stakeholders, ({ one, many }) => ({
    primarySector: one(market_sectors, {
        fields: [market_stakeholders.primary_sector_id],
        references: [market_sectors.id],
    }),
    positions: many(stakeholder_positions),
}));

export const stakeholderPositionsRelations = relations(stakeholder_positions, ({ one }) => ({
    stakeholder: one(market_stakeholders, {
        fields: [stakeholder_positions.stakeholder_id],
        references: [market_stakeholders.id],
    }),
    bill: one(bills, {
        fields: [stakeholder_positions.bill_id],
        references: [bills.id],
    }),
}));

export const marketTrendsRelations = relations(market_trends, ({ one }) => ({
    primarySector: one(market_sectors, {
        fields: [market_trends.primary_sector_id],
        references: [market_sectors.id],
    }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
// ============================================================================

export type MarketSector = typeof market_sectors.$inferSelect;
export type NewMarketSector = typeof market_sectors.$inferInsert;

export type EconomicImpactAssessment = typeof economic_impact_assessments.$inferSelect;
export type NewEconomicImpactAssessment = typeof economic_impact_assessments.$inferInsert;

export type MarketStakeholder = typeof market_stakeholders.$inferSelect;
export type NewMarketStakeholder = typeof market_stakeholders.$inferInsert;

export type StakeholderPosition = typeof stakeholder_positions.$inferSelect;
export type NewStakeholderPosition = typeof stakeholder_positions.$inferInsert;

export type MarketTrend = typeof market_trends.$inferSelect;
export type NewMarketTrend = typeof market_trends.$inferInsert;
