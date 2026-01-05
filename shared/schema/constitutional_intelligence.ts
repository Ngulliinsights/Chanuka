// ============================================================================
// CONSTITUTIONAL INTELLIGENCE SCHEMA - PRODUCTION OPTIMIZED v2.0
// ============================================================================
// Constitutional analysis, legal precedents, and expert review infrastructure
// Enables the platform's core value proposition: constitutional analysis
// Optimized for: Performance, Data Integrity, Scalability, Type Safety

import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, unique, date, smallint, check, foreignKey
} from "drizzle-orm/pg-core";

import { bills, users, sponsors } from "./foundation";

// ============================================================================
// CONSTITUTIONAL PROVISIONS - Kenya's Constitution 2010 Structure
// ============================================================================

export const constitutional_provisions = pgTable("constitutional_provisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Constitutional hierarchy: Chapter > Article > Section > Clause
  chapter_number: smallint("chapter_number").notNull(),
  article_number: smallint("article_number"),
  section_number: smallint("section_number"),
  clause_number: smallint("clause_number"),

  // Content
  title: varchar("title", { length: 500 }).notNull(),
  full_text: text("full_text").notNull(),
  summary: text("summary"),

  // Legal metadata
  is_fundamental_right: boolean("is_fundamental_right").notNull().default(false),
  // Bill of Rights: Articles 19-59

  is_directive_principle: boolean("is_directive_principle").notNull().default(false),
  // National Values and Principles: Article 10

  enforcement_mechanism: varchar("enforcement_mechanism", { length: 100 }),
  // Values: 'judicial_review', 'legislative_action', 'administrative_action', 'automatic'

  // Cross-references and relationships
  related_provisions: uuid("related_provisions").array(),
  keywords: varchar("keywords", { length: 100 }).array(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique constitutional reference (one row per article/section/clause)
  constitutionalRefUnique: unique("constitutional_provisions_ref_unique")
    .on(table.chapter_number, table.article_number, table.section_number, table.clause_number),

  // Hot path: Chapter and article lookups
  chapterArticleIdx: index("idx_constitutional_provisions_chapter_article")
    .on(table.chapter_number, table.article_number),

  // Partial index: Fundamental rights (Bill of Rights)
  fundamentalRightsIdx: index("idx_constitutional_provisions_fundamental_rights")
    .on(table.chapter_number, table.article_number)
    .where(sql`${table.is_fundamental_right} = true`),

  // Directive principles lookup
  directivePrinciplesIdx: index("idx_constitutional_provisions_directive_principles")
    .on(table.chapter_number)
    .where(sql`${table.is_directive_principle} = true`),

  // GIN indexes for array searches
  keywordsIdx: index("idx_constitutional_provisions_keywords")
    .using("gin", table.keywords),
  relatedProvisionsIdx: index("idx_constitutional_provisions_related")
    .using("gin", table.related_provisions),

  // Validation: Chapter numbers are positive
  chapterCheck: check("constitutional_provisions_chapter_check",
    sql`${table.chapter_number} > 0`),
}));

// ============================================================================
// CONSTITUTIONAL ANALYSES - AI + Expert Analysis of Bills
// ============================================================================

export const constitutional_analyses = pgTable("constitutional_analyses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Analysis metadata
  analysis_type: varchar("analysis_type", { length: 50 }).notNull(),
  // Values: 'automated', 'expert', 'hybrid', 'crowd_sourced'

  confidence_score: numeric("confidence_score", { precision: 3, scale: 2 }),
  // 0.00 to 1.00 scale

  // Constitutional implications
  constitutional_provisions_cited: uuid("constitutional_provisions_cited").array(),
  potential_violations: jsonb("potential_violations").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {
      "provision": "Article 47",
      "violation_type": "procedural_fairness",
      "severity": "high",
      "explanation": "Bill lacks fair administrative procedures"
    }
  ] */

  constitutional_alignment: varchar("constitutional_alignment", { length: 20 }),
  // Values: 'aligned', 'concerning', 'violates', 'neutral'

  // Analysis content
  executive_summary: text("executive_summary").notNull(),
  detailed_analysis: text("detailed_analysis"),
  recommendations: text("recommendations"),

  // Expert review workflow
  requires_expert_review: boolean("requires_expert_review").notNull().default(false),
  expert_reviewed: boolean("expert_reviewed").notNull().default(false),
  expert_reviewer_id: uuid("expert_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  expert_notes: text("expert_notes"),
  expert_reviewed_at: timestamp("expert_reviewed_at", { withTimezone: true }),

  // Version control and audit trail
  analysis_version: integer("analysis_version").notNull().default(1),
  superseded_by: uuid("superseded_by"),

  // Publication status
  is_published: boolean("is_published").notNull().default(false),
  published_at: timestamp("published_at", { withTimezone: true }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Self-referencing foreign key for version control
  supersededByFk: foreignKey({
    columns: [table.superseded_by],
    foreignColumns: [table.id],
  }).onDelete("set null"),

  // Hot path: Get current analysis for bill
  billCurrentAnalysisIdx: index("idx_constitutional_analyses_bill_current")
    .on(table.bill_id, table.analysis_version.desc())
    .where(sql`${table.superseded_by} IS NULL AND ${table.is_published} = true`),

  // Expert review queue (most common query)
  expertReviewQueueIdx: index("idx_constitutional_analyses_expert_review_queue")
    .on(table.requires_expert_review, table.expert_reviewed, table.created_at)
    .where(sql`${table.requires_expert_review} = true AND ${table.expert_reviewed} = false`),

  // Alignment and confidence queries
  alignmentConfidenceIdx: index("idx_constitutional_analyses_alignment_confidence")
    .on(table.constitutional_alignment, table.confidence_score.desc()),

  // Violations analysis
  alignmentViolationsIdx: index("idx_constitutional_analyses_violations")
    .on(table.constitutional_alignment)
    .where(sql`${table.constitutional_alignment} = 'violates'`),

  // GIN indexes for arrays and JSONB
  provisionsIdx: index("idx_constitutional_analyses_provisions")
    .using("gin", table.constitutional_provisions_cited),
  violationsIdx: index("idx_constitutional_analyses_potential_violations")
    .using("gin", table.potential_violations),

  // Validation: Confidence score range
  confidenceCheck: check("constitutional_analyses_confidence_check",
    sql`${table.confidence_score} IS NULL OR (${table.confidence_score} >= 0 AND ${table.confidence_score} <= 1)`),

  // Version validation
  versionCheck: check("constitutional_analyses_version_check",
    sql`${table.analysis_version} > 0`),
}));

// ============================================================================
// LEGAL PRECEDENTS - Kenyan Case Law and Judicial Decisions
// ============================================================================

export const legal_precedents = pgTable("legal_precedents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Case identification
  case_name: varchar("case_name", { length: 500 }).notNull(),
  case_number: varchar("case_number", { length: 100 }),
  court_level: varchar("court_level", { length: 50 }).notNull(),
  // Values: 'Supreme Court', 'Court of Appeal', 'High Court', 'Magistrates Court',
  //         'Environment and Land Court', 'Employment and Labour Relations Court'

  // Case details
  judgment_date: date("judgment_date"),
  judges: varchar("judges", { length: 100 }).array(),
  case_summary: text("case_summary"),
  legal_principle: text("legal_principle"),
  // The ratio decidendi - binding legal principle established

  // Constitutional relevance
  constitutional_provisions_involved: uuid("constitutional_provisions_involved").array(),
  precedent_strength: varchar("precedent_strength", { length: 20 }),
  // Values: 'binding', 'persuasive', 'distinguishable', 'overruled'

  // Document references
  judgment_url: varchar("judgment_url", { length: 500 }),
  citation: varchar("citation", { length: 200 }),
  // Kenya Law Reports format: [2020] eKLR

  // Impact assessment
  cited_by_count: integer("cited_by_count").notNull().default(0),
  // How many times this precedent has been cited

  overruled_by: uuid("overruled_by"),
  // If this precedent was overruled by a higher court

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Self-referencing foreign key for overruling
  overruledByFk: foreignKey({
    columns: [table.overruled_by],
    foreignColumns: [table.id],
  }).onDelete("set null"),

  // Case name search
  caseNameIdx: index("idx_legal_precedents_case_name").on(table.case_name),

  // Court hierarchy queries (recent judgments first)
  courtLevelDateIdx: index("idx_legal_precedents_court_level_date")
    .on(table.court_level, table.judgment_date.desc()),

  // Binding precedents (Supreme Court)
  bindingPrecedentsIdx: index("idx_legal_precedents_binding")
    .on(table.court_level, table.precedent_strength, table.judgment_date.desc())
    .where(sql`${table.precedent_strength} = 'binding'`),

  // Citation impact
  citedByIdx: index("idx_legal_precedents_cited_by")
    .on(table.cited_by_count.desc())
    .where(sql`${table.cited_by_count} > 0`),

  // GIN indexes for arrays
  constitutionalProvisionsIdx: index("idx_legal_precedents_constitutional_provisions")
    .using("gin", table.constitutional_provisions_involved),
  judgesIdx: index("idx_legal_precedents_judges")
    .using("gin", table.judges),

  // Validation
  citedByCheck: check("legal_precedents_cited_by_check",
    sql`${table.cited_by_count} >= 0`),
}));

// ============================================================================
// EXPERT REVIEW QUEUE - Human Expert Oversight Workflow
// ============================================================================

export const expert_review_queue = pgTable("expert_review_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Review target
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),

  // Review priority and reason
  priority_level: varchar("priority_level", { length: 20 }).notNull().default("medium"),
  // Values: 'low', 'medium', 'high', 'urgent'

  review_reason: varchar("review_reason", { length: 100 }).notNull(),
  // Values: 'low_confidence', 'complex_issue', 'public_interest',
  //         'controversial', 'constitutional_violation', 'precedent_conflict'

  // Expert assignment
  assigned_expert_id: uuid("assigned_expert_id").references(() => users.id, { onDelete: "set null" }),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),

  // Auto-assignment fields
  required_expertise: varchar("required_expertise", { length: 100 }).array(),
  // Values: ['constitutional_law', 'administrative_law', 'human_rights', etc.]

  // Review workflow
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // Values: 'pending', 'assigned', 'in_review', 'completed', 'escalated', 'cancelled'

  // Completion tracking
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  review_duration_hours: numeric("review_duration_hours", { precision: 6, scale: 2 }),

  review_notes: text("review_notes"),
  review_outcome: varchar("review_outcome", { length: 50 }),
  // Values: 'approved', 'approved_with_changes', 'rejected', 'needs_revision'

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Pending queue (oldest first, high priority first)
  pendingQueueIdx: index("idx_expert_review_queue_pending")
    .on(table.status, table.priority_level, table.created_at)
    .where(sql`${table.status} = 'pending'`),

  // Expert workload management
  assignedExpertStatusIdx: index("idx_expert_review_queue_assigned_expert")
    .on(table.assigned_expert_id, table.status, table.created_at)
    .where(sql`${table.assigned_expert_id} IS NOT NULL`),

  // Bill tracking
  billStatusIdx: index("idx_expert_review_queue_bill_status")
    .on(table.bill_id, table.status),

  // Performance analytics
  completedReviewsIdx: index("idx_expert_review_queue_completed")
    .on(table.completed_at.desc(), table.review_duration_hours)
    .where(sql`${table.status} = 'completed'`),

  // GIN index for expertise matching
  expertiseIdx: index("idx_expert_review_queue_expertise")
    .using("gin", table.required_expertise),

  // Validation: Duration positive
  durationCheck: check("expert_review_queue_duration_check",
    sql`${table.review_duration_hours} IS NULL OR ${table.review_duration_hours} >= 0`),
}));

// ============================================================================
// ANALYSIS AUDIT TRAIL - Complete Change History
// ============================================================================

export const analysis_audit_trail = pgTable("analysis_audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Audit target
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),

  // Action details
  action_type: varchar("action_type", { length: 50 }).notNull(),
  // Values: 'created', 'updated', 'reviewed', 'superseded', 'published', 'unpublished'

  actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actor_type: varchar("actor_type", { length: 20 }).notNull(),
  // Values: 'system', 'expert', 'admin', 'ai_model'

  // Change content
  changes_made: jsonb("changes_made").notNull().default(sql`'{}'::jsonb`),
  /* Structure: {
    "field": "constitutional_alignment",
    "old_value": "concerning",
    "new_value": "violates",
    "confidence_change": 0.15
  } */

  reason: text("reason"),

  // Security and tracking
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  session_id: varchar("session_id", { length: 255 }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Audit trail by analysis (recent first)
  analysisCreatedIdx: index("idx_analysis_audit_trail_analysis_created")
    .on(table.analysis_id, table.created_at.desc()),

  // Action type tracking
  actionTypeCreatedIdx: index("idx_analysis_audit_trail_action_type")
    .on(table.action_type, table.created_at.desc()),

  // Actor tracking
  actorTypeCreatedIdx: index("idx_analysis_audit_trail_actor_type")
    .on(table.actor_type, table.actor_id, table.created_at.desc()),

  // GIN index for change content search
  changesIdx: index("idx_analysis_audit_trail_changes")
    .using("gin", table.changes_made),
}));

// ============================================================================
// CONSTITUTIONAL VULNERABILITIES - Systematic Weakness Tracking
// ============================================================================

export const constitutional_vulnerabilities = pgTable("constitutional_vulnerabilities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Vulnerability identification
  vulnerability_name: varchar("vulnerability_name", { length: 200 }).notNull().unique(),
  source: varchar("source", { length: 20 }).notNull(),
  // Values: 'UK', 'US', 'Kenyan', 'hybrid'

  // Risk assessment
  severity: varchar("severity", { length: 20 }).notNull(),
  // Values: 'critical', 'high', 'medium', 'low'

  exploitation_status: varchar("exploitation_status", { length: 30 }).notNull(),
  // Values: 'not_exploited', 'attempted', 'currently_exploited', 'fully_exploited', 'closed'

  probability: numeric("probability", { precision: 3, scale: 2 }),
  // 0.00 to 1.00 (likelihood of exploitation)

  // Content
  description: text("description").notNull(),
  evidence: text("evidence"),
  exploitation_examples: jsonb("exploitation_examples").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {
      "date": "2023-05-15",
      "actor": "Executive",
      "method": "Presidential directive",
      "outcome": "Constitutional challenge pending"
    }
  ] */

  // Research and analysis
  research_questions: varchar("research_questions", { length: 500 }).array(),

  // Prevention and remediation
  prevention_measures: text("prevention_measures"),
  closure_strategy: text("closure_strategy"),
  closure_difficulty: varchar("closure_difficulty", { length: 20 }),
  // Values: 'easy', 'moderate', 'hard', 'requires_amendment'

  // Relationships
  related_provisions: uuid("related_provisions").array(),
  related_bills: uuid("related_bills").array(),

  // Tracking
  first_identified_date: date("first_identified_date"),
  last_exploitation_date: date("last_exploitation_date"),
  times_exploited: integer("times_exploited").notNull().default(0),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Active vulnerabilities by severity
  severityStatusIdx: index("idx_constitutional_vulnerabilities_severity_status")
    .on(table.severity, table.exploitation_status, table.probability.desc())
    .where(sql`${table.exploitation_status} != 'closed'`),

  // Source analysis
  sourceIdx: index("idx_constitutional_vulnerabilities_source")
    .on(table.source, table.severity),

  // Exploitation tracking
  exploitedIdx: index("idx_constitutional_vulnerabilities_exploited")
    .on(table.exploitation_status, table.times_exploited.desc())
    .where(sql`${table.times_exploited} > 0`),

  // GIN indexes for arrays
  researchQuestionsIdx: index("idx_constitutional_vulnerabilities_research")
    .using("gin", table.research_questions),
  relatedProvisionsIdx: index("idx_constitutional_vulnerabilities_provisions")
    .using("gin", table.related_provisions),
  relatedBillsIdx: index("idx_constitutional_vulnerabilities_bills")
    .using("gin", table.related_bills),
  examplesIdx: index("idx_constitutional_vulnerabilities_examples")
    .using("gin", table.exploitation_examples),

  // Validation
  probabilityCheck: check("constitutional_vulnerabilities_probability_check",
    sql`${table.probability} IS NULL OR (${table.probability} >= 0 AND ${table.probability} <= 1)`),
  timesExploitedCheck: check("constitutional_vulnerabilities_times_exploited_check",
    sql`${table.times_exploited} >= 0`),
}));

// ============================================================================
// UNDERUTILIZED PROVISIONS - Dormant Constitutional Powers
// ============================================================================

export const underutilized_provisions = pgTable("underutilized_provisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Provision identification
  provision_reference: varchar("provision_reference", { length: 50 }).notNull().unique(),
  // Example: "Article 35", "Article 258"

  provision_title: varchar("provision_title", { length: 200 }).notNull(),

  // Power assessment
  power_granted: text("power_granted").notNull(),
  current_use_rate: varchar("current_use_rate", { length: 20 }),
  // Values: 'never_used', '<5%', '<10%', 'low', 'medium'

  potential_impact: varchar("potential_impact", { length: 20 }).notNull(),
  // Values: 'very_high', 'high', 'medium', 'low'

  // Usage tracking
  times_invoked: integer("times_invoked").notNull().default(0),
  last_invoked_date: date("last_invoked_date"),
  invocation_examples: jsonb("invocation_examples").notNull().default(sql`'{}'::jsonb`),

  // Activation strategy
  activation_strategy: text("activation_strategy"),
  barriers_to_use: jsonb("barriers_to_use").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {
      "barrier": "Lack of awareness",
      "severity": "high",
      "solution": "Public education campaign"
    }
  ] */

  // Relationships
  related_provisions: uuid("related_provisions").array(),
  research_questions: varchar("research_questions", { length: 500 }).array(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: High-impact underutilized provisions
  impactUseRateIdx: index("idx_underutilized_provisions_impact_use")
    .on(table.potential_impact, table.current_use_rate),

  // Reference lookup
  referenceIdx: index("idx_underutilized_provisions_reference")
    .on(table.provision_reference),

  // Tracking invocations
  invokedIdx: index("idx_underutilized_provisions_invoked")
    .on(table.times_invoked.desc(), table.last_invoked_date.desc())
    .where(sql`${table.times_invoked} > 0`),

  // GIN indexes for arrays and JSONB
  researchQuestionsIdx: index("idx_underutilized_provisions_research")
    .using("gin", table.research_questions),
  relatedProvisionsIdx: index("idx_underutilized_provisions_related")
    .using("gin", table.related_provisions),
  barriersIdx: index("idx_underutilized_provisions_barriers")
    .using("gin", table.barriers_to_use),
  examplesIdx: index("idx_underutilized_provisions_examples")
    .using("gin", table.invocation_examples),

  // Validation
  timesInvokedCheck: check("underutilized_provisions_times_invoked_check",
    sql`${table.times_invoked} >= 0`),
}));

// ============================================================================
// ELITE LITERACY ASSESSMENT - Constitutional Knowledge Test Questions
// ============================================================================

export const elite_literacy_assessment = pgTable("elite_literacy_assessment", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Assessment target
  target_group: varchar("target_group", { length: 50 }).notNull(),
  // Values: 'MPs', 'Senators', 'Governors', 'Judges', 'Cabinet Secretaries', 'PSs'

  // Question categorization
  question_category: varchar("question_category", { length: 50 }).notNull(),
  // Values: 'constitutional_knowledge', 'institutional_powers', 'legislative_procedure',
  //         'public_finance', 'rights_jurisprudence'

  difficulty_level: varchar("difficulty_level", { length: 20 }).notNull().default('basic'),
  // Values: 'basic', 'intermediate', 'advanced', 'expert'

  // Question content
  question: text("question").notNull(),
  correct_answer: text("correct_answer").notNull(),

  // Multiple choice options (if applicable)
  answer_options: jsonb("answer_options").notNull().default(sql`'{}'::jsonb`),
  /* Structure: [
    {"option": "A", "text": "Senate has equal power to US Senate"},
    {"option": "B", "text": "Senate limited to county matters (Article 96)"}
  ] */

  // Explanation
  explanation: text("explanation"),
  relevant_articles: varchar("relevant_articles", { length: 50 }).array(),
  // Example: ["Article 96", "Article 109", "Article 110"]

  // Expected performance
  expected_performance: varchar("expected_performance", { length: 20 }),
  // Values: '100%', '>90%', '>70%', '>50%', 'poor', 'mixed'

  // Usage statistics
  times_asked: integer("times_asked").notNull().default(0),
  times_correct: integer("times_correct").notNull().default(0),
  average_score: numeric("average_score", { precision: 5, scale: 2 }),

  // Question status
  is_active: boolean("is_active").notNull().default(true),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Get questions by target group and difficulty
  targetGroupDifficultyIdx: index("idx_elite_literacy_assessment_target_difficulty")
    .on(table.target_group, table.difficulty_level, table.is_active)
    .where(sql`${table.is_active} = true`),

  // Category queries
  categoryTargetIdx: index("idx_elite_literacy_assessment_category_target")
    .on(table.question_category, table.target_group),

  // Performance analysis
  performanceIdx: index("idx_elite_literacy_assessment_performance")
    .on(table.expected_performance, table.average_score.desc()),

  // GIN indexes
  articlesIdx: index("idx_elite_literacy_assessment_articles")
    .using("gin", table.relevant_articles),
  optionsIdx: index("idx_elite_literacy_assessment_options")
    .using("gin", table.answer_options),

  // Validation
  statsCheck: check("elite_literacy_assessment_stats_check",
    sql`${table.times_asked} >= 0 AND ${table.times_correct} >= 0 AND ${table.times_correct} <= ${table.times_asked}`),
  averageScoreCheck: check("elite_literacy_assessment_average_score_check",
    sql`${table.average_score} IS NULL OR (${table.average_score} >= 0 AND ${table.average_score} <= 100)`),
}));

// ============================================================================
// CONSTITUTIONAL LOOPHOLES - Exploitable Gaps in the Constitution
// ============================================================================

export const constitutional_loopholes = pgTable("constitutional_loopholes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Loophole identification
  loophole_name: varchar("loophole_name", { length: 200 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  // Values: 'ambiguous_language', 'missing_provisions', 'contradictory_provisions',
  //         'weak_enforcement', 'discretionary_power', 'undefined_term'

  // Constitutional context
  constitutional_provision: varchar("constitutional_provision", { length: 100 }).notNull(),
  problematic_text: text("problematic_text"),

  // Risk assessment
  exploitation_risk: varchar("exploitation_risk", { length: 20 }).notNull(),
  // Values: 'critical', 'high', 'medium', 'low'

  priority: varchar("priority", { length: 20 }).notNull(),
  // Values: 'urgent', 'high', 'medium', 'low'

  // Content
  description: text("description").notNull(),
  exploitation_scenario: text("exploitation_scenario"),
  exploitation_examples: jsonb("exploitation_examples").notNull().default(sql`'{}'::jsonb`),

  // Prevention and closure
  prevention_strategy: text("prevention_strategy"),
  proposed_amendment: text("proposed_amendment"),
  alternative_interpretations: jsonb("alternative_interpretations").notNull().default(sql`'{}'::jsonb`),

  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default('open'),
  // Values: 'open', 'partially_closed', 'closed', 'worsening'

  times_exploited: integer("times_exploited").notNull().default(0),
  last_exploitation_date: date("last_exploitation_date"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: High-risk open loopholes
  riskStatusIdx: index("idx_constitutional_loopholes_risk_status")
    .on(table.exploitation_risk, table.status, table.priority)
    .where(sql`${table.status} = 'open' OR ${table.status} = 'worsening'`),

  // Category analysis
  categoryRiskIdx: index("idx_constitutional_loopholes_category_risk")
    .on(table.category, table.exploitation_risk),

  // Provision lookup
  provisionIdx: index("idx_constitutional_loopholes_provision")
    .on(table.constitutional_provision),

  // Exploitation tracking
  exploitedIdx: index("idx_constitutional_loopholes_exploited")
    .on(table.times_exploited.desc(), table.last_exploitation_date.desc())
    .where(sql`${table.times_exploited} > 0`),

  // GIN indexes for JSONB
  examplesIdx: index("idx_constitutional_loopholes_examples")
    .using("gin", table.exploitation_examples),
  interpretationsIdx: index("idx_constitutional_loopholes_interpretations")
    .using("gin", table.alternative_interpretations),

  // Validation
  timesExploitedCheck: check("constitutional_loopholes_times_exploited_check",
    sql`${table.times_exploited} >= 0`),
}));

// ============================================================================
// ELITE KNOWLEDGE SCORES - Individual Legislator Assessment Results
// ============================================================================
// Complements elite_literacy_assessment (which stores questions)
// This table stores WHO took assessments and THEIR results

export const elite_knowledge_scores = pgTable("elite_knowledge_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Link to legislator
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),

  // For non-sponsor officials (governors, cabinet secretaries)
  official_name: varchar("official_name", { length: 255 }),
  official_type: varchar("official_type", { length: 50 }),
  // Values: 'mp', 'senator', 'governor', 'cabinet_secretary', 'principal_secretary',
  //         'commissioner', 'judge'

  // Assessment metadata
  assessment_date: date("assessment_date").notNull(),
  assessment_version: varchar("assessment_version", { length: 20 }),
  assessment_type: varchar("assessment_type", { length: 50 }).notNull().default('written_test'),
  // Values: 'written_test', 'interview', 'performance_observation', 'speech_analysis'

  // Overall scores
  total_questions: integer("total_questions").notNull(),
  correct_answers: integer("correct_answers").notNull(),
  percentage_score: numeric("percentage_score", { precision: 5, scale: 2 }).notNull(),

  // Category breakdown (matches elite_literacy_assessment categories)
  constitutional_knowledge: numeric("constitutional_knowledge", { precision: 5, scale: 2 }),
  institutional_powers: numeric("institutional_powers", { precision: 5, scale: 2 }),
  legislative_procedure: numeric("legislative_procedure", { precision: 5, scale: 2 }),
  public_finance: numeric("public_finance", { precision: 5, scale: 2 }),
  rights_jurisprudence: numeric("rights_jurisprudence", { precision: 5, scale: 2 }),

  // Critical errors - YOUR SENATOR EXAMPLE DOCUMENTED HERE
  critical_errors: jsonb("critical_errors").notNull().default(sql`'{}'::jsonb`),
  /* Example structure:
  [
    {
      "question_id": "uuid-of-question",
      "error": "Answered that Kenyan Senate has equal power to US Senate",
      "correct_answer": "Senate limited to county matters per Article 96(1). Does NOT have equal power to National Assembly on national legislation.",
      "article_violated": "Article 96",
      "category": "institutional_powers",
      "severity": "high"
    }
  ] */

  // Knowledge gaps
  weak_areas: varchar("weak_areas", { length: 100 }).array(),
  // Example: ["institutional_powers", "public_finance"]

  // Recommendations
  training_recommended: boolean("training_recommended").notNull().default(false),
  training_priority: varchar("training_priority", { length: 20 }),
  // Values: 'low', 'medium', 'high', 'urgent'

  recommended_topics: varchar("recommended_topics", { length: 100 }).array(),

  // Audit trail
  assessed_by: uuid("assessed_by").references(() => users.id, { onDelete: "set null" }),
  // If expert-administered assessment

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Hot path: Sponsor's assessment history
  sponsorDateIdx: index("idx_knowledge_scores_sponsor_date")
    .on(table.sponsor_id, table.assessment_date.desc())
    .where(sql`${table.sponsor_id} IS NOT NULL`),

  // Performance analysis
  scoreIdx: index("idx_knowledge_scores_percentage")
    .on(table.percentage_score.desc(), table.assessment_date.desc()),

  // Low performers (need training)
  lowPerformersIdx: index("idx_knowledge_scores_low_performers")
    .on(table.percentage_score, table.training_priority)
    .where(sql`${table.percentage_score} < 50`),

  // Official type tracking
  typeScoreIdx: index("idx_knowledge_scores_type_score")
    .on(table.official_type, table.percentage_score.desc()),

  // Training recommendations
  trainingIdx: index("idx_knowledge_scores_training")
    .on(table.training_recommended, table.training_priority)
    .where(sql`${table.training_recommended} = true`),

  // GIN indexes for arrays and JSONB
  weakAreasIdx: index("idx_knowledge_scores_weak_areas")
    .using("gin", table.weak_areas),
  criticalErrorsIdx: index("idx_knowledge_scores_critical_errors")
    .using("gin", table.critical_errors),
  topicsIdx: index("idx_knowledge_scores_recommended_topics")
    .using("gin", table.recommended_topics),

  // Validation: Score calculations
  answersCheck: check("elite_knowledge_scores_answers_check",
    sql`${table.correct_answers} >= 0 AND ${table.correct_answers} <= ${table.total_questions}`),
  questionsCheck: check("elite_knowledge_scores_questions_check",
    sql`${table.total_questions} > 0`),
  percentageCheck: check("elite_knowledge_scores_percentage_check",
    sql`${table.percentage_score} >= 0 AND ${table.percentage_score} <= 100`),
  categoriesCheck: check("elite_knowledge_scores_categories_check",
    sql`(${table.constitutional_knowledge} IS NULL OR (${table.constitutional_knowledge} >= 0 AND ${table.constitutional_knowledge} <= 100))
      AND (${table.institutional_powers} IS NULL OR (${table.institutional_powers} >= 0 AND ${table.institutional_powers} <= 100))
      AND (${table.legislative_procedure} IS NULL OR (${table.legislative_procedure} >= 0 AND ${table.legislative_procedure} <= 100))
      AND (${table.public_finance} IS NULL OR (${table.public_finance} >= 0 AND ${table.public_finance} <= 100))
      AND (${table.rights_jurisprudence} IS NULL OR (${table.rights_jurisprudence} >= 0 AND ${table.rights_jurisprudence} <= 100))`),
}));

// ============================================================================
// RELATIONSHIPS - Type-safe Drizzle ORM Relations
// ============================================================================

export const constitutionalProvisionsRelations = relations(constitutional_provisions, ({ many }) => ({
  analyses: many(constitutional_analyses),
  precedents: many(legal_precedents),
}));

export const constitutionalAnalysesRelations = relations(constitutional_analyses, ({ one, many }) => ({
  bill: one(bills, {
    fields: [constitutional_analyses.bill_id],
    references: [bills.id],
  }),
  expertReviewer: one(users, {
    fields: [constitutional_analyses.expert_reviewer_id],
    references: [users.id],
  }),
  supersededBy: one(constitutional_analyses, {
    fields: [constitutional_analyses.superseded_by],
    references: [constitutional_analyses.id],
    relationName: "supersession",
  }),
  supersedes: many(constitutional_analyses, {
    relationName: "supersession",
  }),
  reviewQueue: many(expert_review_queue),
  auditTrail: many(analysis_audit_trail),
}));

export const legalPrecedentsRelations = relations(legal_precedents, ({ one, many }) => ({
  constitutionalProvisions: many(constitutional_provisions),
  overruledBy: one(legal_precedents, {
    fields: [legal_precedents.overruled_by],
    references: [legal_precedents.id],
    relationName: "overruling",
  }),
  overruledCases: many(legal_precedents, {
    relationName: "overruling",
  }),
}));

export const expertReviewQueueRelations = relations(expert_review_queue, ({ one }) => ({
  analysis: one(constitutional_analyses, {
    fields: [expert_review_queue.analysis_id],
    references: [constitutional_analyses.id],
  }),
  bill: one(bills, {
    fields: [expert_review_queue.bill_id],
    references: [bills.id],
  }),
  assignedExpert: one(users, {
    fields: [expert_review_queue.assigned_expert_id],
    references: [users.id],
  }),
}));

export const analysisAuditTrailRelations = relations(analysis_audit_trail, ({ one }) => ({
  analysis: one(constitutional_analyses, {
    fields: [analysis_audit_trail.analysis_id],
    references: [constitutional_analyses.id],
  }),
  actor: one(users, {
    fields: [analysis_audit_trail.actor_id],
    references: [users.id],
  }),
}));

export const constitutionalVulnerabilitiesRelations = relations(constitutional_vulnerabilities, ({ many }) => ({
  relatedConstitutionalProvisions: many(constitutional_provisions),
}));

export const underutilizedProvisionsRelations = relations(underutilized_provisions, ({ many }) => ({
  relatedConstitutionalProvisions: many(constitutional_provisions),
}));

export const eliteLiteracyAssessmentRelations = relations(elite_literacy_assessment, ({ }) => ({
  // No direct relations - questions are standalone
}));

export const constitutionalLoopholesRelations = relations(constitutional_loopholes, ({ }) => ({
  // No direct relations - loopholes reference provisions via varchar
}));

export const eliteKnowledgeScoresRelations = relations(elite_knowledge_scores, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [elite_knowledge_scores.sponsor_id],
    references: [sponsors.id],
  }),
  assessor: one(users, {
    fields: [elite_knowledge_scores.assessed_by],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
// ============================================================================

export type ConstitutionalProvision = typeof constitutional_provisions.$inferSelect;
export type NewConstitutionalProvision = typeof constitutional_provisions.$inferInsert;

export type ConstitutionalAnalysis = typeof constitutional_analyses.$inferSelect;
export type NewConstitutionalAnalysis = typeof constitutional_analyses.$inferInsert;

export type LegalPrecedent = typeof legal_precedents.$inferSelect;
export type NewLegalPrecedent = typeof legal_precedents.$inferInsert;

export type ExpertReviewQueue = typeof expert_review_queue.$inferSelect;
export type NewExpertReviewQueue = typeof expert_review_queue.$inferInsert;

export type AnalysisAuditTrail = typeof analysis_audit_trail.$inferSelect;
export type NewAnalysisAuditTrail = typeof analysis_audit_trail.$inferInsert;

export type ConstitutionalVulnerability = typeof constitutional_vulnerabilities.$inferSelect;
export type NewConstitutionalVulnerability = typeof constitutional_vulnerabilities.$inferInsert;

export type UnderutilizedProvision = typeof underutilized_provisions.$inferSelect;
export type NewUnderutilizedProvision = typeof underutilized_provisions.$inferInsert;

export type EliteLiteracyAssessment = typeof elite_literacy_assessment.$inferSelect;
export type NewEliteLiteracyAssessment = typeof elite_literacy_assessment.$inferInsert;

export type ConstitutionalLoophole = typeof constitutional_loopholes.$inferSelect;
export type NewConstitutionalLoophole = typeof constitutional_loopholes.$inferInsert;

export type EliteKnowledgeScore = typeof elite_knowledge_scores.$inferSelect;
export type NewEliteKnowledgeScore = typeof elite_knowledge_scores.$inferInsert;