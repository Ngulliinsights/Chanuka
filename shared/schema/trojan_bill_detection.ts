// ============================================================================
// TROJAN BILL DETECTION SCHEMA - PRODUCTION OPTIMIZED v2.0
// ============================================================================
// Real-time detection of hidden agendas in ACTIVE legislation
// PURPOSE: Alert citizens and MPs BEFORE bills pass
// TIMING: During legislative process (not after rejection)
//
// This is DISTINCT from implementationWorkarounds (which tracks AFTER rejection)
// PostgreSQL 15+ features utilized for efficient real-time analysis

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar, date,
  index, check
} from "drizzle-orm/pg-core";

import { bills, users } from "./foundation";

// ============================================================================
// TROJAN BILL ANALYSIS - Real-Time Detection Results
// ============================================================================
// Analyzes ACTIVE bills for hidden provisions while still in legislative process

export const trojan_bill_analysis = pgTable("trojan_bill_analysis", {
  bill_id: uuid("bill_id").primaryKey().references(() => bills.id, {
    onDelete: "cascade"
  }),

  bill_name: varchar("bill_name", { length: 500 }),
  
  // Risk Assessment (0-100 scale)
  trojan_risk_score: numeric("trojan_risk_score", { precision: 5, scale: 2 }),
  // 0-100: How likely this bill has hidden agendas
  // 0-30: Low risk
  // 31-60: Medium risk
  // 61-80: High risk
  // 81-100: Critical risk

  // What the bill CLAIMS to do
  stated_purpose: text("stated_purpose"),
  
  // What it ACTUALLY does (hidden provisions)
  hidden_provisions: jsonb("hidden_provisions").notNull().default(sql`'[]'::jsonb`),
  /* Structure: [
    {
      "section": "Section 47(3)(b)",
      "stated_purpose": "Consumer protection measures",
      "hidden_agenda": "Mass surveillance powers for security services",
      "severity": "critical",
      "constitutional_concern": "Article 31 (Privacy)",
      "affected_rights": ["privacy", "freedom_of_expression"]
    }
  ] */

  // Detection metadata
  detection_method: varchar("detection_method", { length: 50 }),
  // Values: 'automated', 'expert', 'crowdsourced', 'hybrid', 'ai_analysis'
  
  detection_date: date("detection_date"),
  
  detection_confidence: numeric("detection_confidence", { precision: 3, scale: 2 }),
  // 0.00-1.00: AI/expert confidence in detection

  // Analysis details
  analysis_summary: text("analysis_summary"),
  // Brief explanation of what was found
  
  detailed_analysis: text("detailed_analysis"),
  // Full analysis with evidence
  
  red_flags: varchar("red_flags", { length: 100 }).array(),
  // Values: ["rushed_process", "buried_provisions", "vague_language", 
  //          "excessive_powers", "weak_oversight", "undefined_terms"]

  // Public alerting
  public_alert_issued: boolean("public_alert_issued").notNull().default(false),
  alert_issued_date: date("alert_issued_date"),
  alert_channels: varchar("alert_channels", { length: 50 }).array(),
  // Values: ["website", "social_media", "sms", "email", "press_release", "public_hearing"]
  
  alert_reach: integer("alert_reach"),
  // How many people were alerted

  // Impact tracking
  media_coverage: boolean("media_coverage").notNull().default(false),
  media_mentions: integer("media_mentions").default(0),
  
  parliamentary_awareness: boolean("parliamentary_awareness").notNull().default(false),
  // Did MPs become aware of the hidden provisions?
  
  amendments_proposed: boolean("amendments_proposed").notNull().default(false),
  // Were amendments proposed to fix the issues?

  // Outcome tracking
  outcome: varchar("outcome", { length: 50 }),
  // Values: 'passed_as_is' (detection failed), 
  //         'amended' (provisions removed/modified),
  //         'defeated' (bill rejected),
  //         'withdrawn' (sponsor withdrew),
  //         'pending' (still in process)
  
  outcome_date: date("outcome_date"),
  
  detection_impact_score: numeric("detection_impact_score", { precision: 5, scale: 2 }),
  // 0-100: How much did the detection change the outcome?

  // Analysis metadata
  analyzed_by: uuid("analyzed_by").references(() => users.id, { onDelete: "set null" }),
  analysis_version: integer("analysis_version").notNull().default(1),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: High-risk bills (alert queue)
  highRiskIdx: index("idx_trojan_bill_analysis_high_risk")
    .on(table.trojan_risk_score.desc(), table.detection_date.desc())
    .where(sql`${table.trojan_risk_score} >= 60 AND ${table.outcome} IS NULL`),

  // Critical risk bills (immediate attention)
  criticalRiskIdx: index("idx_trojan_bill_analysis_critical_risk")
    .on(table.trojan_risk_score.desc())
    .where(sql`${table.trojan_risk_score} >= 80`),

  // Alert queue (not yet alerted)
  alertQueueIdx: index("idx_trojan_bill_analysis_alert_queue")
    .on(table.public_alert_issued, table.trojan_risk_score.desc())
    .where(sql`${table.public_alert_issued} = false AND ${table.trojan_risk_score} >= 60`),

  // Detection method analysis
  detectionMethodIdx: index("idx_trojan_bill_analysis_detection_method")
    .on(table.detection_method, table.detection_confidence.desc()),

  // Outcome tracking
  outcomeIdx: index("idx_trojan_bill_analysis_outcome")
    .on(table.outcome, table.outcome_date.desc()),

  // Success stories (amendments/defeats)
  successIdx: index("idx_trojan_bill_analysis_success")
    .on(table.outcome, table.detection_impact_score.desc())
    .where(sql`${table.outcome} IN ('amended', 'defeated', 'withdrawn')`),

  // Timeline queries
  detectionDateIdx: index("idx_trojan_bill_analysis_detection_date")
    .on(table.detection_date.desc()),

  // GIN index for hidden provisions JSONB queries
  hiddenProvisionsIdx: index("idx_trojan_bill_analysis_hidden_provisions")
    .using("gin", table.hidden_provisions),

  // GIN index for red flags
  redFlagsIdx: index("idx_trojan_bill_analysis_red_flags")
    .using("gin", table.red_flags),

  // GIN index for alert channels
  alertChannelsIdx: index("idx_trojan_bill_analysis_alert_channels")
    .using("gin", table.alert_channels),

  // Validation: Risk score 0-100
  riskScoreCheck: check("trojan_bill_analysis_risk_score_check",
    sql`${table.trojan_risk_score} IS NULL OR (${table.trojan_risk_score} >= 0 AND ${table.trojan_risk_score} <= 100)`),

  // Validation: Confidence 0-1
  confidenceCheck: check("trojan_bill_analysis_confidence_check",
    sql`${table.detection_confidence} IS NULL OR (${table.detection_confidence} >= 0 AND ${table.detection_confidence} <= 1)`),

  // Validation: Impact score 0-100
  impactScoreCheck: check("trojan_bill_analysis_impact_score_check",
    sql`${table.detection_impact_score} IS NULL OR (${table.detection_impact_score} >= 0 AND ${table.detection_impact_score} <= 100)`),

  // Validation: Alert reach non-negative
  alertReachCheck: check("trojan_bill_analysis_alert_reach_check",
    sql`${table.alert_reach} IS NULL OR ${table.alert_reach} >= 0`),

  // Validation: Media mentions non-negative
  mediaMentionsCheck: check("trojan_bill_analysis_media_mentions_check",
    sql`${table.media_mentions} >= 0`),

  // Validation: Version positive
  versionCheck: check("trojan_bill_analysis_version_check",
    sql`${table.analysis_version} > 0`),
}));

// ============================================================================
// HIDDEN PROVISIONS - Detailed Analysis of Deceptive Elements
// ============================================================================
// Each row is one hidden provision within a bill

export const hidden_provisions = pgTable("hidden_provisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  bill_id: uuid("bill_id").notNull().references(() => trojan_bill_analysis.bill_id, {
    onDelete: "cascade"
  }),

  // Provision identification
  provision_text: text("provision_text"),
  provision_location: varchar("provision_location", { length: 50 }),
  // Example: "Section 47(3)(b)", "Schedule 2, Part A"

  // What it claims vs what it does
  stated_purpose: text("stated_purpose"),
  // What the provision SAYS it does
  
  hidden_agenda: text("hidden_agenda"),
  // What it ACTUALLY does

  // Categorization
  power_type: varchar("power_type", { length: 100 }),
  // Values: 'surveillance', 'censorship', 'detention', 'asset_seizure',
  //         'executive_power', 'immunity', 'weakened_oversight'

  deception_technique: varchar("deception_technique", { length: 50 }),
  // Values: 'buried_deep', 'technical_language', 'vague_definitions',
  //         'broad_discretion', 'schedule_hiding', 'cross_reference_confusion'

  // Constitutional implications
  affected_rights: jsonb("affected_rights").notNull().default(sql`'[]'::jsonb`),
  // Constitutional articles affected: ["Article 31 (Privacy)", "Article 33 (Expression)"]
  
  affected_institutions: jsonb("affected_institutions").notNull().default(sql`'[]'::jsonb`),
  // Which institutions get new powers/lose oversight

  constitutional_articles_violated: varchar("constitutional_articles_violated", { length: 20 }).array(),
  // Example: ["Article 31", "Article 33", "Article 47"]

  // Severity assessment
  severity: varchar("severity", { length: 20 }),
  // Values: 'low', 'medium', 'high', 'critical'
  
  urgency: varchar("urgency", { length: 20 }),
  // Values: 'routine', 'concerning', 'urgent', 'emergency'
  // How quickly must this be addressed?

  // Detection details
  detected_by: varchar("detected_by", { length: 100 }),
  // Who/what detected this provision
  
  detection_confidence: numeric("detection_confidence", { precision: 3, scale: 2 }),
  // 0.00-1.00 confidence
  
  evidence: text("evidence"),
  // Supporting evidence for the hidden agenda claim

  // Public education
  plain_language_explanation: text("plain_language_explanation"),
  // Explain in simple terms for citizens
  
  comparable_provisions: text("comparable_provisions").array(),
  // Similar provisions in other bills/laws for context

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Bill provisions by severity
  billSeverityIdx: index("idx_hidden_provisions_bill_severity")
    .on(table.bill_id, table.severity, table.urgency),

  // High severity provisions
  highSeverityIdx: index("idx_hidden_provisions_high_severity")
    .on(table.severity, table.urgency)
    .where(sql`${table.severity} IN ('high', 'critical')`),

  // Power type analysis
  powerTypeIdx: index("idx_hidden_provisions_power_type")
    .on(table.power_type, table.severity),

  // Deception technique tracking
  techniqueIdx: index("idx_hidden_provisions_technique")
    .on(table.deception_technique),

  // Constitutional violations
  violationsIdx: index("idx_hidden_provisions_violations")
    .using("gin", table.constitutional_articles_violated),

  // GIN indexes for JSONB arrays
  affectedRightsIdx: index("idx_hidden_provisions_affected_rights")
    .using("gin", table.affected_rights),
  
  affectedInstitutionsIdx: index("idx_hidden_provisions_affected_institutions")
    .using("gin", table.affected_institutions),

  // Full-text search on provision text
  provisionTextIdx: index("idx_hidden_provisions_text")
    .on(table.provision_text),

  // Validation: Severity enumeration
  severityCheck: check("hidden_provisions_severity_check",
    sql`${table.severity} IS NULL OR ${table.severity} IN ('low', 'medium', 'high', 'critical')`),

  // Validation: Urgency enumeration
  urgencyCheck: check("hidden_provisions_urgency_check",
    sql`${table.urgency} IS NULL OR ${table.urgency} IN ('routine', 'concerning', 'urgent', 'emergency')`),

  // Validation: Detection confidence 0-1
  confidenceCheck: check("hidden_provisions_confidence_check",
    sql`${table.detection_confidence} IS NULL OR (${table.detection_confidence} >= 0 AND ${table.detection_confidence} <= 1)`),
}));

// ============================================================================
// TROJAN TECHNIQUES - Deception Methods Used
// ============================================================================
// Tracks HOW bills hide their true intent

export const trojan_techniques = pgTable("trojan_techniques", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  bill_id: uuid("bill_id").notNull().references(() => trojan_bill_analysis.bill_id, {
    onDelete: "cascade"
  }),

  // Technique classification
  technique_type: varchar("technique_type", { length: 50 }),
  // Values: 'burying' (hide in 100+ pages), 
  //         'technical_language' (obscure with jargon),
  //         'definitions' (redefine terms),
  //         'schedules' (hide in schedules),
  //         'cross_references' (complex references),
  //         'vague_language' (intentionally unclear),
  //         'broad_discretion' (unlimited ministerial power)

  // Description and examples
  description: text("description"),
  example: text("example"),
  // Specific example from this bill

  // Effectiveness assessment
  effectiveness_rating: integer("effectiveness_rating"),
  // 1-10: How well did this hide the agenda?
  // 10 = Very effective (almost nobody noticed)
  // 1 = Ineffective (easily spotted)

  // Detection difficulty
  detection_difficulty: varchar("detection_difficulty", { length: 20 }),
  // Values: 'easy', 'moderate', 'hard', 'very_hard'

  // Countermeasures
  detection_method: text("detection_method"),
  // How to spot this technique
  
  countermeasure: text("countermeasure"),
  // How to counter this technique (for citizens/MPs)

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Technique type analysis
  techniqueTypeIdx: index("idx_trojan_techniques_type")
    .on(table.technique_type, table.effectiveness_rating.desc()),

  // Effectiveness analysis
  effectivenessIdx: index("idx_trojan_techniques_effectiveness")
    .on(table.effectiveness_rating.desc()),

  // Detection difficulty
  difficultyIdx: index("idx_trojan_techniques_difficulty")
    .on(table.detection_difficulty),

  // Composite index for bill-based technique queries
  billTechniqueIdx: index("idx_trojan_techniques_bill_type")
    .on(table.bill_id, table.technique_type),

  // Validation: Effectiveness rating 1-10
  effectivenessCheck: check("trojan_techniques_effectiveness_check",
    sql`${table.effectiveness_rating} IS NULL OR (${table.effectiveness_rating} >= 1 AND ${table.effectiveness_rating} <= 10)`),
}));

// ============================================================================
// DETECTION SIGNALS - Risk Indicators and Metrics
// ============================================================================
// Individual risk signals that contribute to overall trojan_risk_score

export const detection_signals = pgTable("detection_signals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  bill_id: uuid("bill_id").notNull().references(() => trojan_bill_analysis.bill_id, {
    onDelete: "cascade"
  }),

  // Signal identification
  signal_type: varchar("signal_type", { length: 50 }),
  // Values: 'page_count_high' (100+ pages),
  //         'schedule_heavy' (lots in schedules),
  //         'rushed_timeline' (too fast),
  //         'minimal_consultation' (no public input),
  //         'technical_jargon_density' (hard to read),
  //         'broad_ministerial_powers' (too much discretion),
  //         'weak_oversight' (no checks),
  //         'late_amendments' (last-minute changes)

  signal_value: numeric("signal_value", { precision: 10, scale: 4 }),
  // Numeric value of the signal (flexible precision)
  // Example: page_count_high = 147 pages

  signal_description: text("signal_description"),
  // What this signal means

  // Risk contribution
  contributes_to_risk: boolean("contributes_to_risk").notNull().default(true),
  risk_weight: numeric("risk_weight", { precision: 5, scale: 2 }),
  // 0-100: How much does this signal contribute to trojan_risk_score?

  // Threshold comparison
  threshold_value: numeric("threshold_value", { precision: 10, scale: 4 }),
  // What's the normal/acceptable value?
  
  threshold_exceeded: boolean("threshold_exceeded").notNull().default(false),
  // Did this signal exceed the threshold?

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for signal type queries
  billSignalTypeIdx: index("idx_detection_signals_bill_type")
    .on(table.bill_id, table.signal_type),

  // High-risk signals
  highRiskSignalsIdx: index("idx_detection_signals_high_risk")
    .on(table.contributes_to_risk, table.threshold_exceeded, table.risk_weight.desc())
    .where(sql`${table.contributes_to_risk} = true AND ${table.threshold_exceeded} = true`),

  // Signal value analysis
  signalValueIdx: index("idx_detection_signals_value")
    .on(table.signal_type, table.signal_value),

  // Risk contribution analysis
  contributesIdx: index("idx_detection_signals_contributes")
    .on(table.contributes_to_risk, table.risk_weight.desc()),

  // Full-text search on signal description
  descriptionIdx: index("idx_detection_signals_description")
    .on(table.signal_description),

  // Validation: Risk weight 0-100
  riskWeightCheck: check("detection_signals_risk_weight_check",
    sql`${table.risk_weight} IS NULL OR (${table.risk_weight} >= 0 AND ${table.risk_weight} <= 100)`),
}));

// ============================================================================
// RELATIONSHIPS - Drizzle ORM Relations (Bidirectional)
// ============================================================================

export const trojanBillAnalysisRelations = relations(trojan_bill_analysis, ({ one, many }) => ({
  bill: one(bills, {
    fields: [trojan_bill_analysis.bill_id],
    references: [bills.id],
  }),
  analyzedBy: one(users, {
    fields: [trojan_bill_analysis.analyzed_by],
    references: [users.id],
  }),
  hiddenProvisions: many(hidden_provisions),
  trojanTechniques: many(trojan_techniques),
  detectionSignals: many(detection_signals),
}));

export const hiddenProvisionsRelations = relations(hidden_provisions, ({ one }) => ({
  analysis: one(trojan_bill_analysis, {
    fields: [hidden_provisions.bill_id],
    references: [trojan_bill_analysis.bill_id],
  }),
}));

export const trojanTechniquesRelations = relations(trojan_techniques, ({ one }) => ({
  analysis: one(trojan_bill_analysis, {
    fields: [trojan_techniques.bill_id],
    references: [trojan_bill_analysis.bill_id],
  }),
}));

export const detectionSignalsRelations = relations(detection_signals, ({ one }) => ({
  analysis: one(trojan_bill_analysis, {
    fields: [detection_signals.bill_id],
    references: [trojan_bill_analysis.bill_id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - For TypeScript Type Safety
// ============================================================================

export type TrojanBillAnalysis = typeof trojan_bill_analysis.$inferSelect;
export type NewTrojanBillAnalysis = typeof trojan_bill_analysis.$inferInsert;

export type HiddenProvision = typeof hidden_provisions.$inferSelect;
export type NewHiddenProvision = typeof hidden_provisions.$inferInsert;

export type TrojanTechnique = typeof trojan_techniques.$inferSelect;
export type NewTrojanTechnique = typeof trojan_techniques.$inferInsert;

export type DetectionSignal = typeof detection_signals.$inferSelect;
export type NewDetectionSignal = typeof detection_signals.$inferInsert;

// ============================================================================
// UTILITY FUNCTIONS & CONSTANTS
// ============================================================================

// Risk score thresholds
export const TROJAN_RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
  CRITICAL: 90
} as const;

// Severity levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// Alert priority by risk score
export const getAlertPriority = (riskScore: number): string => {
  if (riskScore >= TROJAN_RISK_THRESHOLDS.CRITICAL) return 'immediate';
  if (riskScore >= TROJAN_RISK_THRESHOLDS.HIGH) return 'urgent';
  if (riskScore >= TROJAN_RISK_THRESHOLDS.MEDIUM) return 'high';
  return 'normal';
};