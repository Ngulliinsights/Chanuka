// ============================================================================
// POLITICAL ECONOMY SCHEMA - PRODUCTION OPTIMIZED v2.0
// ============================================================================
// Ethnicity & Power Distribution Analysis for Kenyan Legislative Context
// Tracks appointments, tenders, infrastructure, and historical advantage
// Optimized for: Performance, Data Integrity, Scalability, Type Safety

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, jsonb, numeric, uuid, varchar, date,
  index, smallint, check
} from "drizzle-orm/pg-core";

import { primaryKeyUuid, auditFields } from "./base-types";
import { kenyanCountyEnum, partyEnum } from "./enum";
import { sponsors, governors } from "./foundation";
// ============================================================================
// POLITICAL APPOINTMENTS - Patronage vs Competence Analysis
// ============================================================================

export const political_appointments = pgTable("political_appointments", {
  id: primaryKeyUuid(),

  // Person identification
  person_name: varchar("person_name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  institution: varchar("institution", { length: 255 }).notNull(),
  institution_type: varchar("institution_type", { length: 100 }),
  // Values: 'parastatal', 'commission', 'board', 'ministry', 'judiciary', 'military'

  // Link to sponsors if MP/Senator
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),

  // Demographics (CRITICAL for political economy analysis)
  ethnicity: varchar("ethnicity", { length: 50 }),
  // Kenya's 44+ ethnic communities: Kikuyu, Luo, Luhya, Kalenjin, Kamba, etc.

  home_county: kenyanCountyEnum("home_county"),
  gender: varchar("gender", { length: 20 }),
  // Values: 'male', 'female', 'non_binary', 'prefer_not_to_say'

  date_of_birth: date("date_of_birth"),
  age_at_appointment: smallint("age_at_appointment"),
  // Calculated field for analysis

  // Appointment context
  appointing_government: varchar("appointing_government", { length: 100 }).notNull(),
  // Example: "Uhuru Kenyatta (2013-2022)", "William Ruto (2022-present)"

  appointing_president: varchar("appointing_president", { length: 100 }),
  // Example: "Uhuru Kenyatta", "William Ruto"

  appointment_date: date("appointment_date").notNull(),
  departure_date: date("departure_date"),
  tenure_days: integer("tenure_days"),
  // Calculated: departure_date - appointment_date

  departure_reason: varchar("departure_reason", { length: 100 }),
  // Values: 'term_ended', 'resigned', 'dismissed', 'deceased', 'rotated', 'retired'

  // Competence metrics
  education_level: varchar("education_level", { length: 100 }),
  // Values: 'phd', 'masters', 'bachelors', 'diploma', 'certificate', 'secondary', 'other'

  relevant_experience_years: smallint("relevant_experience_years"),
  previous_positions: jsonb("previous_positions").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {"position": "CEO", "organization": "Kenya Power", "years": 5},
    {"position": "Director", "organization": "Treasury", "years": 3}
  ] */

  professional_qualifications: jsonb("professional_qualifications").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {"type": "CPA", "body": "ICPAK", "year": 2015},
    {"type": "Lawyer", "body": "LSK", "year": 2010}
  ] */

  // Competence vs Loyalty Classification
  appointment_type: varchar("appointment_type", { length: 50 }),
  // Values: 'competent_loyalist', 'pure_patron', 'technocrat', 'compromise', 'career_professional'

  competence_score: numeric("competence_score", { precision: 3, scale: 2 }),
  // 0.00-1.00 scale based on education + experience

  loyalty_indicator: varchar("loyalty_indicator", { length: 100 }),
  // Values: 'high_political_loyalty', 'moderate', 'technical_appointment', 'independent'

  // Political connections
  party_affiliation: partyEnum("party_affiliation"),
  coalition_membership: varchar("coalition_membership", { length: 100 }),
  political_relationship: varchar("political_relationship", { length: 255 }),
  // Example: "Campaign financier", "Ethnic coalition partner", "Merit appointment"

  // Performance tracking
  performance_contract_exists: boolean("performance_contract_exists").notNull().default(false),
  performance_rating: numeric("performance_rating", { precision: 3, scale: 2 }),
  // 0.00-1.00 scale

  achievements: jsonb("achievements").notNull().default(sql`'{}'::jsonb`),
  failures: jsonb("failures").notNull().default(sql`'{}'::jsonb`),

  // Accountability
  removed_for_non_performance: boolean("removed_for_non_performance").notNull().default(false),
  corruption_allegations: boolean("corruption_allegations").notNull().default(false),
  corruption_allegations_details: text("corruption_allegations_details"),

  court_cases: jsonb("court_cases").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {"case": "ACC v. John Doe", "year": 2023, "status": "ongoing", "outcome": null}
  ] */

  ...auditFields(),
}, (table) => ({
  // Hot path: Appointments by government and ethnicity
  govtEthnicityIdx: index("idx_appointments_govt_ethnicity")
    .on(table.appointing_government, table.ethnicity)
    .where(sql`${table.ethnicity} IS NOT NULL`),

  // Institution analysis
  institutionTypeIdx: index("idx_appointments_institution_type")
    .on(table.institution_type, table.appointment_date),

  // Ethnicity and county analysis
  ethnicityCountyIdx: index("idx_appointments_ethnicity_county")
    .on(table.ethnicity, table.home_county)
    .where(sql`${table.ethnicity} IS NOT NULL`),

  // Appointment type (patronage vs merit)
  typeCompetenceIdx: index("idx_appointments_type_competence")
    .on(table.appointment_type, table.competence_score),

  // Performance tracking
  performanceIdx: index("idx_appointments_performance")
    .on(table.performance_rating)
    .where(sql`${table.performance_rating} IS NOT NULL`),

  // Corruption tracking
  corruptionIdx: index("idx_appointments_corruption")
    .on(table.corruption_allegations, table.appointing_government)
    .where(sql`${table.corruption_allegations} = true`),

  // Sponsor linkage
  sponsorIdx: index("idx_appointments_sponsor")
    .on(table.sponsor_id)
    .where(sql`${table.sponsor_id} IS NOT NULL`),

  // Timeline queries
  appointmentDateIdx: index("idx_appointments_appointment_date")
    .on(table.appointment_date),

  // GIN indexes for JSONB
  previousPositionsIdx: index("idx_appointments_previous_positions")
    .using("gin", table.previous_positions),
  qualificationsIdx: index("idx_appointments_qualifications")
    .using("gin", table.professional_qualifications),
  courtCasesIdx: index("idx_appointments_court_cases")
    .using("gin", table.court_cases),

  // Validation: Scores must be 0-1
  scoresCheck: check("appointments_scores_check",
    sql`(${table.competence_score} IS NULL OR (${table.competence_score} >= 0 AND ${table.competence_score} <= 1))
      AND (${table.performance_rating} IS NULL OR (${table.performance_rating} >= 0 AND ${table.performance_rating} <= 1))`),

  // Validation: Experience and age positive
  positiveValuesCheck: check("appointments_positive_values_check",
    sql`(${table.relevant_experience_years} IS NULL OR ${table.relevant_experience_years} >= 0)
      AND (${table.age_at_appointment} IS NULL OR ${table.age_at_appointment} >= 18)
      AND (${table.tenure_days} IS NULL OR ${table.tenure_days} >= 0)`),

  // Validation: Dates in logical order
  datesCheck: check("appointments_dates_check",
    sql`(${table.departure_date} IS NULL OR ${table.departure_date} >= ${table.appointment_date})`),
}));

// ============================================================================
// INFRASTRUCTURE TENDERS - Contract Distribution by Ethnicity
// ============================================================================

export const infrastructure_tenders = pgTable("infrastructure_tenders", {
  id: primaryKeyUuid(),

  // Project identification
  project_name: varchar("project_name", { length: 255 }).notNull(),
  project_code: varchar("project_code", { length: 100 }),
  project_type: varchar("project_type", { length: 100 }).notNull(),
  // Values: 'road', 'railway', 'dam', 'electricity', 'water', 'port', 'airport', 'hospital', 'school'

  contracting_authority: varchar("contracting_authority", { length: 255 }).notNull(),

  // Financial details
  tender_value: numeric("tender_value", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('KES'),
  final_cost: numeric("final_cost", { precision: 18, scale: 2 }),
  cost_overrun_percentage: numeric("cost_overrun_percentage", { precision: 6, scale: 2 }),
  // ((final_cost - tender_value) / tender_value) * 100

  // Winner details
  winning_company: varchar("winning_company", { length: 255 }).notNull(),
  company_registration_number: varchar("company_registration_number", { length: 100 }),

  company_owners: jsonb("company_owners").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {
      "name": "John Doe",
      "ethnicity": "Kikuyu",
      "ownership_percentage": 60,
      "political_connection": "MP's brother",
      "political_connection_type": "family"
    }
  ] */

  beneficial_owners_disclosed: boolean("beneficial_owners_disclosed").notNull().default(false),

  // Political context
  government_at_time: varchar("government_at_time", { length: 100 }).notNull(),
  tender_date: date("tender_date").notNull(),
  award_date: date("award_date"),

  // Geographic context
  project_county: kenyanCountyEnum("project_county"),
  project_location: varchar("project_location", { length: 255 }),
  coalition_stronghold: boolean("coalition_stronghold"),
  // Is this county/region a stronghold of the ruling coalition?

  // Project timeline
  contract_start_date: date("contract_start_date"),
  planned_completion_date: date("planned_completion_date"),
  actual_completion_date: date("actual_completion_date"),

  // Performance
  project_status: varchar("project_status", { length: 50 }),
  // Values: 'planning', 'ongoing', 'completed', 'stalled', 'abandoned', 'delayed'

  completion_percentage: numeric("completion_percentage", { precision: 5, scale: 2 }),
  // 0-100 scale

  delay_days: integer("delay_days"),
  // Actual vs planned completion

  // Procurement integrity
  procurement_process: varchar("procurement_process", { length: 50 }),
  // Values: 'open_tender', 'restricted_tender', 'direct_procurement', 'emergency_procurement'

  corruption_allegations: boolean("corruption_allegations").notNull().default(false),
  allegations_description: text("allegations_description"),

  investigated: boolean("investigated").notNull().default(false),
  investigating_body: varchar("investigating_body", { length: 100 }),
  // Values: 'EACC', 'DCI', 'Auditor General', 'Parliament', 'PPRA'

  investigation_outcome: varchar("investigation_outcome", { length: 100 }),
  // Values: 'ongoing', 'cleared', 'charges_filed', 'conviction', 'acquittal'

  ...auditFields(),
}, (table) => ({
  // Hot path: Government and county analysis
  govtCountyIdx: index("idx_tenders_govt_county")
    .on(table.government_at_time, table.project_county)
    .where(sql`${table.project_county} IS NOT NULL`),

  // Project type analysis
  typeStatusIdx: index("idx_tenders_type_status")
    .on(table.project_type, table.project_status),

  // Status tracking
  statusDateIdx: index("idx_tenders_status_date")
    .on(table.project_status, table.tender_date),

  // Corruption tracking
  corruptionInvestigatedIdx: index("idx_tenders_corruption_investigated")
    .on(table.corruption_allegations, table.investigated)
    .where(sql`${table.corruption_allegations} = true`),

  // Value analysis
  valueDescIdx: index("idx_tenders_value_desc")
    .on(table.tender_value),

  // Timeline tracking
  tenderDateIdx: index("idx_tenders_tender_date")
    .on(table.tender_date),

  // GIN index for company owners (ethnicity analysis)
  ownersIdx: index("idx_tenders_owners")
    .using("gin", table.company_owners),

  // Validation: Financial values positive
  financialCheck: check("tenders_financial_check",
    sql`${table.tender_value} >= 0
      AND (${table.final_cost} IS NULL OR ${table.final_cost} >= 0)
      AND (${table.cost_overrun_percentage} IS NULL OR ${table.cost_overrun_percentage} >= -100)`),

  // Validation: Completion percentage 0-100
  completionCheck: check("tenders_completion_check",
    sql`${table.completion_percentage} IS NULL OR (${table.completion_percentage} >= 0 AND ${table.completion_percentage} <= 100)`),

  // Validation: Delay days can be negative (ahead of schedule) or positive
  delayCheck: check("tenders_delay_check",
    sql`${table.delay_days} IS NULL OR (${table.delay_days} >= -1000 AND ${table.delay_days} <= 10000)`),

  // Validation: Dates in logical order
  datesCheck: check("tenders_dates_check",
    sql`(${table.award_date} IS NULL OR ${table.tender_date} IS NULL OR ${table.award_date} >= ${table.tender_date})
      AND (${table.planned_completion_date} IS NULL OR ${table.contract_start_date} IS NULL OR ${table.planned_completion_date} >= ${table.contract_start_date})
      AND (${table.actual_completion_date} IS NULL OR ${table.contract_start_date} IS NULL OR ${table.actual_completion_date} >= ${table.contract_start_date})`),
}));

// ============================================================================
// ETHNIC ADVANTAGE SCORES - Historical Cumulative Benefit Analysis
// ============================================================================

export const ethnic_advantage_scores = pgTable("ethnic_advantage_scores", {
  community: varchar("community", { length: 100 }).primaryKey(),
  // Kenya's 44+ ethnic communities: Kikuyu, Luo, Luhya, Kalenjin, Kamba, Kisii, etc.

  // Population data
  population_2024: integer("population_2024"),
  population_percentage: numeric("population_percentage", { precision: 5, scale: 2 }),

  // Historical scores (0-100 scale, higher = more advantage received)
  colonial_era_score: numeric("colonial_era_score", { precision: 5, scale: 2 }),
  // 1900-1963: Railway employment, White Highlands, missionary schools, colonial administration

  colonial_education_score: numeric("colonial_education_score", { precision: 5, scale: 2 }),
  colonial_land_score: numeric("colonial_land_score", { precision: 5, scale: 2 }),
  colonial_administration_score: numeric("colonial_administration_score", { precision: 5, scale: 2 }),
  colonial_infrastructure_score: numeric("colonial_infrastructure_score", { precision: 5, scale: 2 }),

  // Presidential eras (0-100 scale)
  kenyatta_era_score: numeric("kenyatta_era_score", { precision: 5, scale: 2 }), // 1963-1978
  moi_era_score: numeric("moi_era_score", { precision: 5, scale: 2 }), // 1978-2002
  kibaki_era_score: numeric("kibaki_era_score", { precision: 5, scale: 2 }), // 2002-2013
  uhuru_era_score: numeric("uhuru_era_score", { precision: 5, scale: 2 }), // 2013-2022
  ruto_era_score: numeric("ruto_era_score", { precision: 5, scale: 2 }), // 2022-present

  // Current status indicators (2024)
  education_level_current: numeric("education_level_current", { precision: 5, scale: 2 }),
  // Average years of schooling

  median_income_current: numeric("median_income_current", { precision: 15, scale: 2 }),
  // Monthly median income in KES

  poverty_rate: numeric("poverty_rate", { precision: 5, scale: 2 }),
  // Percentage living below poverty line

  land_ownership_hectares: numeric("land_ownership_hectares", { precision: 15, scale: 2 }),
  // Average land ownership per household

  infrastructure_access: numeric("infrastructure_access", { precision: 5, scale: 2 }),
  // 0-100: Roads, electricity, water, healthcare, schools

  employment_in_government: numeric("employment_in_government", { precision: 5, scale: 2 }),
  // Percentage employed in government vs population percentage

  // Composite scores
  cumulative_advantage_score: numeric("cumulative_advantage_score", { precision: 5, scale: 2 }).notNull(),
  // 0-100: Total historical benefits received (weighted average of era scores)

  current_status_score: numeric("current_status_score", { precision: 5, scale: 2 }),
  // 0-100: Current wellbeing indicators

  deficit_score: numeric("deficit_score", { precision: 6, scale: 2 }),
  // Negative = disadvantaged, Positive = advantaged
  // Example: Kikuyu = +32.0 (received 32% more than fair share)
  //          Turkana = -29.5 (received 29.5% less than fair share)

  fairness_gap: numeric("fairness_gap", { precision: 6, scale: 2 }),
  // How much would need to be redistributed to achieve parity?

  // Methodology and transparency
  last_updated: date("last_updated").notNull().defaultNow(),
  methodology_version: varchar("methodology_version", { length: 20 }),

  data_sources: jsonb("data_sources").notNull().default(sql`'{}'::jsonb`),
  /* Structure: {
    "census": "Kenya National Bureau of Statistics 2019",
    "education": "Ministry of Education 2023",
    "poverty": "World Bank 2022"
  } */

  calculation_methodology: text("calculation_methodology"),
  notes: text("notes"),

  ...auditFields(),
}, (table) => ({
  // Hot path: Deficit score (most advantaged/disadvantaged)
  deficitScoreIdx: index("idx_advantage_deficit_score")
    .on(table.deficit_score),

  // Cumulative advantage ranking
  cumulativeIdx: index("idx_advantage_cumulative")
    .on(table.cumulative_advantage_score),

  // Current status
  currentStatusIdx: index("idx_advantage_current_status")
    .on(table.current_status_score),

  // Population analysis
  populationIdx: index("idx_advantage_population")
    .on(table.population_2024)
    .where(sql`${table.population_2024} IS NOT NULL`),

  // GIN index for data sources
  sourcesIdx: index("idx_advantage_sources")
    .using("gin", table.data_sources),

  // Validation: All scores 0-100 or NULL
  scoresCheck: check("advantage_scores_check",
    sql`(${table.colonial_era_score} IS NULL OR (${table.colonial_era_score} >= 0 AND ${table.colonial_era_score} <= 100))
      AND (${table.colonial_education_score} IS NULL OR (${table.colonial_education_score} >= 0 AND ${table.colonial_education_score} <= 100))
      AND (${table.colonial_land_score} IS NULL OR (${table.colonial_land_score} >= 0 AND ${table.colonial_land_score} <= 100))
      AND (${table.colonial_administration_score} IS NULL OR (${table.colonial_administration_score} >= 0 AND ${table.colonial_administration_score} <= 100))
      AND (${table.colonial_infrastructure_score} IS NULL OR (${table.colonial_infrastructure_score} >= 0 AND ${table.colonial_infrastructure_score} <= 100))
      AND (${table.kenyatta_era_score} IS NULL OR (${table.kenyatta_era_score} >= 0 AND ${table.kenyatta_era_score} <= 100))
      AND (${table.moi_era_score} IS NULL OR (${table.moi_era_score} >= 0 AND ${table.moi_era_score} <= 100))
      AND (${table.kibaki_era_score} IS NULL OR (${table.kibaki_era_score} >= 0 AND ${table.kibaki_era_score} <= 100))
      AND (${table.uhuru_era_score} IS NULL OR (${table.uhuru_era_score} >= 0 AND ${table.uhuru_era_score} <= 100))
      AND (${table.ruto_era_score} IS NULL OR (${table.ruto_era_score} >= 0 AND ${table.ruto_era_score} <= 100))
      AND (${table.cumulative_advantage_score} >= 0 AND ${table.cumulative_advantage_score} <= 100)
      AND (${table.current_status_score} IS NULL OR (${table.current_status_score} >= 0 AND ${table.current_status_score} <= 100))
      AND (${table.infrastructure_access} IS NULL OR (${table.infrastructure_access} >= 0 AND ${table.infrastructure_access} <= 100))`),

  // Validation: Rates and percentages
  ratesCheck: check("advantage_rates_check",
    sql`(${table.population_percentage} IS NULL OR (${table.population_percentage} >= 0 AND ${table.population_percentage} <= 100))
      AND (${table.poverty_rate} IS NULL OR (${table.poverty_rate} >= 0 AND ${table.poverty_rate} <= 100))`),

  // Validation: Positive values
  positiveCheck: check("advantage_positive_check",
    sql`(${table.population_2024} IS NULL OR ${table.population_2024} >= 0)
      AND (${table.education_level_current} IS NULL OR ${table.education_level_current} >= 0)
      AND (${table.median_income_current} IS NULL OR ${table.median_income_current} >= 0)
      AND (${table.land_ownership_hectares} IS NULL OR ${table.land_ownership_hectares} >= 0)
      AND (${table.employment_in_government} IS NULL OR ${table.employment_in_government} >= 0)`),
}));

// ============================================================================
// STRATEGIC INFRASTRUCTURE PROJECTS - Continuity Tracking
// ============================================================================

export const strategic_infrastructure_projects = pgTable("strategic_infrastructure_projects", {
  id: primaryKeyUuid(),

  // Project identification
  project_name: varchar("project_name", { length: 255 }).notNull().unique(),
  project_code: varchar("project_code", { length: 50 }).notNull().unique(),
  project_type: varchar("project_type", { length: 50 }).notNull(),
  // Values: 'electricity_generation', 'electricity_transmission', 'railway',
  //         'dam', 'port', 'highway', 'airport', 'digital_infrastructure'

  // Government tracking
  initiating_government: varchar("initiating_government", { length: 100 }).notNull(),
  initiating_president: varchar("initiating_president", { length: 100 }),
  current_government: varchar("current_government", { length: 100 }),

  continued_by_successor: boolean("continued_by_successor"),
  // Did the next government continue this project?

  governments_spanned: smallint("governments_spanned").notNull().default(1),
  // How many governments has this project spanned?

  // Timeline
  planned_start_date: date("planned_start_date"),
  actual_start_date: date("actual_start_date"),
  planned_completion_date: date("planned_completion_date"),
  actual_completion_date: date("actual_completion_date"),

  // Status
  project_status: varchar("project_status", { length: 50 }).notNull(),
  // Values: 'planned', 'design', 'procurement', 'construction', 'ongoing',
  //         'completed', 'stalled', 'abandoned', 'suspended'

  completion_percentage: numeric("completion_percentage", { precision: 5, scale: 2 }),

  // Abandonment tracking
  abandoned: boolean("abandoned").notNull().default(false),
  abandonment_date: date("abandonment_date"),
  abandonment_reason: text("abandonment_reason"),
  abandonment_government: varchar("abandonment_government", { length: 100 }),

  // Financial
  initial_budget: numeric("initial_budget", { precision: 18, scale: 2 }),
  currency: varchar("currency", { length: 10 }).notNull().default('KES'),
  total_spent: numeric("total_spent", { precision: 18, scale: 2 }),
  budget_overrun_percentage: numeric("budget_overrun_percentage", { precision: 6, scale: 2 }),

  // Continuity protection mechanisms
  legal_protection: boolean("legal_protection").notNull().default(false),
  protection_mechanism: text("protection_mechanism"),
  // Example: "PPP contract", "International treaty", "Strategic Infrastructure Act",
  //          "Vision 2030 flagship project"

  ppp_structure: boolean("ppp_structure").notNull().default(false),
  // Public-Private Partnership provides continuity protection

  international_financing: boolean("international_financing").notNull().default(false),
  financing_partners: varchar("financing_partners", { length: 100 }).array(),
  // Example: ["World Bank", "China Exim Bank", "AfDB"]

  ...auditFields(),
}, (table) => ({
  // Hot path: Status and continuation
  statusContinuedIdx: index("idx_infra_status_continued")
    .on(table.project_status, table.continued_by_successor),

  // Abandoned projects
  abandonedIdx: index("idx_infra_abandoned")
    .on(table.abandoned, table.abandonment_date)
    .where(sql`${table.abandoned} = true`),

  // Project type analysis
  typeStatusIdx: index("idx_infra_type_status")
    .on(table.project_type, table.project_status),

  // Government continuity
  govtsSpannedIdx: index("idx_infra_govts_spanned")
    .on(table.governments_spanned),

  // Protection mechanisms
  protectionIdx: index("idx_infra_protection")
    .on(table.legal_protection, table.ppp_structure)
    .where(sql`${table.legal_protection} = true OR ${table.ppp_structure} = true`),

  // GIN index for financing partners
  financingIdx: index("idx_infra_financing")
    .using("gin", table.financing_partners),

  // Validation: Completion percentage 0-100
  completionCheck: check("infra_completion_check",
    sql`${table.completion_percentage} IS NULL OR (${table.completion_percentage} >= 0 AND ${table.completion_percentage} <= 100)`),

  // Validation: Financial values positive
  financialCheck: check("infra_financial_check",
    sql`(${table.initial_budget} IS NULL OR ${table.initial_budget} >= 0)
      AND (${table.total_spent} IS NULL OR ${table.total_spent} >= 0)`),

  // Validation: Governments spanned positive
  govtsCheck: check("infra_govts_check",
    sql`${table.governments_spanned} >= 1 AND ${table.governments_spanned} <= 10`),

  // Validation: Dates in logical order
  datesCheck: check("infra_dates_check",
    sql`(${table.actual_start_date} IS NULL OR ${table.planned_start_date} IS NULL OR ${table.actual_start_date} >= ${table.planned_start_date})
      AND (${table.actual_completion_date} IS NULL OR ${table.actual_start_date} IS NULL OR ${table.actual_completion_date} >= ${table.actual_start_date})`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM Relations
// ============================================================================

export const politicalAppointmentsRelations = relations(political_appointments, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [political_appointments.sponsor_id],
    references: [sponsors.id],
  }),
}));

export const infrastructureTendersRelations = relations(infrastructure_tenders, () => ({
  // No direct relations - analysis done via JSONB queries
}));

export const ethnicAdvantageScoresRelations = relations(ethnic_advantage_scores, () => ({
  // Standalone reference table
}));

export const strategicInfrastructureProjectsRelations = relations(strategic_infrastructure_projects, () => ({
  // Standalone tracking table
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
// ============================================================================

export type PoliticalAppointment = typeof political_appointments.$inferSelect;
export type NewPoliticalAppointment = typeof political_appointments.$inferInsert;

export type InfrastructureTender = typeof infrastructure_tenders.$inferSelect;
export type NewInfrastructureTender = typeof infrastructure_tenders.$inferInsert;

export type EthnicAdvantageScore = typeof ethnic_advantage_scores.$inferSelect;
export type NewEthnicAdvantageScore = typeof ethnic_advantage_scores.$inferInsert;

export type StrategicInfrastructureProject = typeof strategic_infrastructure_projects.$inferSelect;
export type NewStrategicInfrastructureProject = typeof strategic_infrastructure_projects.$inferInsert;

// ============================================================================
// RELATIONS - Drizzle ORM Relations (moved from foundation.ts)
// ============================================================================
// These relations are defined here to avoid circular dependencies between
// foundation.ts and political_economy.ts

// Reverse relations for sponsors (appointments)
export const sponsorsAppointmentsRelations = relations(sponsors, ({ many }) => ({
  appointments: many(political_appointments),
}));

// Reverse relations for governors (appointments)
export const governorsAppointmentsRelations = relations(governors, ({ many }) => ({
  appointments: many(political_appointments),
}));
