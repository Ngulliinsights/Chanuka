// ============================================================================
// CONSTITUTIONAL INTELLIGENCE SCHEMA - OPTIMIZED VERSION
// ============================================================================
// Infrastructure for analyzing bills against Kenya's constitutional framework
// Tracks provisions, analyses, precedents, and expert review workflows

import {
  pgTable, text, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, date, pgEnum, check, smallint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

import {
  kenyanCountyEnum,
  chamberEnum,
  courtLevelEnum,
  userRoleEnum
} from "./enum";

import { users, bills } from "./foundation";

// ============================================================================
// ENUMS - Domain-specific types for constitutional analysis
// ============================================================================

export const analysisTypeEnum = pgEnum("analysis_type", [
  "potential_conflict",
  "requires_compliance", 
  "empowers",
  "restricts",
  "clarifies"
]);

export const constitutionalRiskEnum = pgEnum("constitutional_risk", [
  "low",
  "medium", 
  "high",
  "critical"
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "assigned",
  "in_review",
  "completed",
  "escalated"
]);

export const changeTypeEnum = pgEnum("change_type", [
  "created",
  "updated",
  "reviewed",
  "approved",
  "rejected",
  "amended"
]);

// ============================================================================
// CONSTITUTIONAL PROVISIONS - Hierarchical structure of Kenya's constitution
// ============================================================================
// Stores the complete text and metadata of constitutional articles, organized
// in a tree structure that mirrors the constitution's chapter/article hierarchy

export const constitutional_provisions = pgTable("constitutional_provisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Hierarchical structure: Chapter > Part > Article > Section > Subsection
  // This allows precise referencing of any constitutional element
  chapter_number: integer("chapter_number"),
  chapter_title: varchar("chapter_title", { length: 255 }),
  
  part_number: integer("part_number"),
  part_title: varchar("part_title", { length: 255 }),
  
  // Every provision must have at least an article reference
  article_number: integer("article_number").notNull(),
  article_title: varchar("article_title", { length: 255 }).notNull(),
  
  // Optional deeper nesting for complex articles
  section_number: varchar("section_number", { length: 20 }),
  subsection_number: varchar("subsection_number", { length: 20 }),
  
  // The actual constitutional text and human-readable summary
  provision_text: text("provision_text").notNull(),
  provision_summary: text("provision_summary"),
  
  // Self-referential relationship for hierarchical queries
  // Enables finding all subsections under a parent article
  parent_provision_id: uuid("parent_provision_id"),
  
  // Materialized path for efficient tree traversal (e.g., "4.37.1.a")
  // Allows querying all descendants without recursive joins
  hierarchy_path: varchar("hierarchy_path", { length: 100 }).notNull(),
  hierarchy_level: integer("hierarchy_level").notNull().default(0),
  
  // Legal classification and cross-references
  rights_category: varchar("rights_category", { length: 100 }), 
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  related_provisions: uuid("related_provisions").array().default(sql`ARRAY[]::uuid[]`),
  
  // Precomputed tsvector for full-text search performance
  // Generated from provision_text, provision_summary, and keywords
  search_vector: text("search_vector"),
  
  // Track amendments and updates to provisions
  amendment_history: jsonb("amendment_history"),
  is_active: boolean("is_active").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Composite index for efficient hierarchy traversal
  hierarchyPathLevelIdx: index("idx_provisions_hierarchy_path_level")
    .on(table.hierarchy_path, table.hierarchy_level),
  
  // Essential lookup indexes
  articleIdx: index("idx_provisions_article").on(table.article_number),
  categoryIdx: index("idx_provisions_category").on(table.rights_category)
    .where(sql`${table.rights_category} IS NOT NULL`),
  
  // Full-text search using GIN index for array and text search
  searchVectorIdx: index("idx_provisions_search_vector")
    .using("gin", sql`to_tsvector('english', ${table.search_vector})`),
  keywordsIdx: index("idx_provisions_keywords").using("gin", table.keywords),
  
  // Active provisions lookup
  activeIdx: index("idx_provisions_active")
    .on(table.is_active, table.article_number)
    .where(sql`${table.is_active} = true`),
  
  // Unique constraint on hierarchy path to prevent duplicates
  hierarchyPathUnique: uniqueIndex("idx_provisions_hierarchy_path_unique")
    .on(table.hierarchy_path),
  
  // Foreign key to self for parent-child relationship
  parentProvisionFk: check(
    "chk_provisions_parent_not_self",
    sql`${table.parent_provision_id} IS NULL OR ${table.parent_provision_id} != ${table.id}`
  ),
}));

// ============================================================================
// CONSTITUTIONAL ANALYSES - Links bills to constitutional provisions
// ============================================================================
// Each record represents one identified relationship between a bill and a
// constitutional provision, with confidence scoring and risk assessment
//
// PERCENTAGE STORAGE: All percentage fields are stored as smallint (0-100)
// This approach provides several advantages over float storage:
// - Integer arithmetic is faster and more predictable than floating point
// - Avoids floating point rounding errors (0.1 + 0.2 != 0.3 problem)
// - Uses less storage: smallint = 2 bytes vs numeric = variable 8+ bytes
// - Perfectly adequate precision for human-readable percentages
// - Easier to validate with simple range checks
// - More intuitive for business users who think in whole percentages

export const constitutional_analyses = pgTable("constitutional_analyses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign keys to bills and provisions being analyzed
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  provision_id: uuid("provision_id").notNull().references(() => constitutional_provisions.id),
  
  // Type and confidence of the analysis
  analysis_type: analysisTypeEnum("analysis_type").notNull(),
  
  // Confidence level stored as integer percentage (0-100)
  // Example: 85 represents 85% confidence
  // Application layer can display as "85%" or convert to 0.85 for calculations
  confidence_percentage: smallint("confidence_percentage").notNull(),
  
  // Detailed explanation of the analysis
  analysis_text: text("analysis_text").notNull(),
  
  // Structured machine-readable reasoning chain
  // Stores the logical steps that led to this conclusion for transparency
  reasoning_chain: jsonb("reasoning_chain"),
  
  // Links to supporting legal precedents that informed this analysis
  supporting_precedents: uuid("supporting_precedents").array().default(sql`ARRAY[]::uuid[]`),
  
  // Risk assessment for constitutional challenges
  constitutional_risk: constitutionalRiskEnum("constitutional_risk").notNull(),
  risk_explanation: text("risk_explanation").notNull(),
  
  // Impact severity as integer percentage (0-100)
  // Represents the magnitude of potential constitutional impact
  // 0 = negligible impact, 100 = fundamental constitutional violation
  impact_severity_percentage: smallint("impact_severity_percentage").notNull().default(50),
  
  // Expert review workflow
  requires_expert_review: boolean("requires_expert_review").notNull().default(false),
  expert_reviewed: boolean("expert_reviewed").notNull().default(false),
  expert_reviewer_id: uuid("expert_reviewer_id"),
  expert_review_date: timestamp("expert_review_date"),
  expert_notes: text("expert_notes"),
  
  // Expert's confidence adjustment stored as signed integer (-100 to +100)
  // Positive values indicate expert is MORE confident than the model
  // Negative values indicate expert is LESS confident than the model
  // Zero means expert agrees with model's confidence level
  // Example: model says 75%, expert adjustment of +10 = 85% final confidence
  expert_confidence_adjustment: smallint("expert_confidence_adjustment"),
  
  // Track the methodology used for this analysis
  analysis_method: varchar("analysis_method", { length: 100 }).notNull(),
  analysis_version: varchar("analysis_version", { length: 50 }).notNull(),
  model_metadata: jsonb("model_metadata"), // Store model parameters, training date, etc.
  
  // Performance tracking
  analysis_duration_ms: integer("analysis_duration_ms"),
  
  // Soft delete for maintaining audit history
  is_superseded: boolean("is_superseded").notNull().default(false),
  superseded_by_id: uuid("superseded_by_id"),
  superseded_at: timestamp("superseded_at"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Primary lookup patterns
  billProvisionIdx: uniqueIndex("idx_analyses_bill_provision_unique")
    .on(table.bill_id, table.provision_id, table.analysis_type)
    .where(sql`${table.is_superseded} = false`),
  
  // Risk-based queries for dashboards
  // Ordered by confidence percentage for quick filtering of high-confidence findings
  billRiskIdx: index("idx_analyses_bill_risk")
    .on(table.bill_id, table.constitutional_risk, table.confidence_percentage)
    .where(sql`${table.is_superseded} = false`),
  
  // Expert review queue queries
  reviewRequiredIdx: index("idx_analyses_review_required")
    .on(table.requires_expert_review, table.expert_reviewed, table.created_at)
    .where(sql`${table.requires_expert_review} = true AND ${table.expert_reviewed} = false`),
  
  // Precedent-based queries
  precedentsIdx: index("idx_analyses_precedents")
    .using("gin", table.supporting_precedents),
  
  // Analysis method performance tracking
  methodVersionIdx: index("idx_analyses_method_version")
    .on(table.analysis_method, table.analysis_version),
  
  // Low confidence threshold index for flagging uncertain analyses
  // Captures analyses with confidence below 75% for potential expert review
  lowConfidenceIdx: index("idx_analyses_low_confidence")
    .on(table.confidence_percentage, table.created_at)
    .where(sql`${table.confidence_percentage} < 75`),
  
  // High impact findings for priority attention
  highImpactIdx: index("idx_analyses_high_impact")
    .on(table.impact_severity_percentage, table.constitutional_risk)
    .where(sql`${table.impact_severity_percentage} >= 70`),
  
  // Ensure expert reviewer exists if review is marked complete
  expertReviewCheck: check(
    "chk_analyses_expert_review",
    sql`(${table.expert_reviewed} = false) OR (${table.expert_reviewed} = true AND ${table.expert_reviewer_id} IS NOT NULL AND ${table.expert_review_date} IS NOT NULL)`
  ),
  
  // Confidence percentage must be between 0 and 100
  confidenceRangeCheck: check(
    "chk_analyses_confidence_range",
    sql`${table.confidence_percentage} >= 0 AND ${table.confidence_percentage} <= 100`
  ),
  
  // Impact severity percentage must be between 0 and 100
  impactSeverityRangeCheck: check(
    "chk_analyses_impact_severity_range",
    sql`${table.impact_severity_percentage} >= 0 AND ${table.impact_severity_percentage} <= 100`
  ),
  
  // Expert adjustment must be between -100 and +100
  expertAdjustmentRangeCheck: check(
    "chk_analyses_expert_adjustment_range",
    sql`${table.expert_confidence_adjustment} IS NULL OR (${table.expert_confidence_adjustment} >= -100 AND ${table.expert_confidence_adjustment} <= 100)`
  ),
}));

// ============================================================================
// LEGAL PRECEDENTS - Court cases and constitutional interpretations
// ============================================================================
// Stores landmark cases that establish how provisions should be interpreted
//
// RELEVANCE SCORING: Uses integer scoring (0-100) rather than decimal scores
// This makes the system more intuitive - a score of 85 is immediately understood
// as "highly relevant" without needing to know if 0.85 is on a 0-1 or 0-10 scale

export const legal_precedents = pgTable("legal_precedents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Case identification
  case_name: varchar("case_name", { length: 500 }).notNull(),
  case_citation: varchar("case_citation", { length: 200 }).notNull(),
  case_number: varchar("case_number", { length: 100 }),
  
  // Court hierarchy and timing
  court_level: courtLevelEnum("court_level").notNull(),
  judgment_date: date("judgment_date").notNull(),
  
  // Links to constitutional provisions interpreted in this case
  constitutional_provisions: uuid("constitutional_provisions").array().notNull().default(sql`ARRAY[]::uuid[]`),
  
  // Case content and legal reasoning
  case_summary: text("case_summary").notNull(),
  holding: text("holding").notNull(), // The binding legal principle
  reasoning: text("reasoning"), // Why the court reached this conclusion
  key_quotes: jsonb("key_quotes"), // Important passages from the judgment
  
  // Interpretive methodology used by the court
  interpretive_approach: varchar("interpretive_approach", { length: 100 }),
  
  // Access to full text
  judgment_url: varchar("judgment_url", { length: 500 }),
  judgment_pdf_path: varchar("judgment_pdf_path", { length: 500 }),
  full_text: text("full_text"),
  full_text_vector: text("full_text_vector"), // For full-text search
  
  // Precedent strength stored as integer percentage (0-100)
  // Calculated based on multiple factors:
  // - Court level (Supreme Court = highest weight)
  // - Age of precedent (recent cases may be more relevant)
  // - Citation frequency (how often other courts reference this case)
  // - Consistency with other precedents
  // Example: Supreme Court landmark case from last 5 years, frequently cited = 95
  relevance_score_percentage: smallint("relevance_score_percentage").notNull().default(50),
  
  // Citation tracking to measure precedent influence
  citation_count: integer("citation_count").notNull().default(0),
  last_cited_date: timestamp("last_cited_date"),
  
  // Precedent status
  is_binding: boolean("is_binding").notNull().default(true),
  is_overruled: boolean("is_overruled").notNull().default(false),
  overruled_by_id: uuid("overruled_by_id"),
  overruled_date: date("overruled_date"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Case lookup and uniqueness
  citationUniqueIdx: uniqueIndex("idx_precedents_citation_unique")
    .on(table.case_citation),
  caseNameIdx: index("idx_precedents_case_name").on(table.case_name),
  
  // Court and date filtering
  courtLevelDateIdx: index("idx_precedents_court_level_date")
    .on(table.court_level, table.judgment_date),
  
  // Provision-based lookup for finding relevant cases
  provisionsIdx: index("idx_precedents_provisions")
    .using("gin", table.constitutional_provisions),
  
  // Relevance and citation tracking for surfacing most important precedents
  // Ordered by relevance percentage DESC to quickly find authoritative cases
  relevanceIdx: index("idx_precedents_relevance")
    .on(table.relevance_score_percentage, table.citation_count)
    .where(sql`${table.is_binding} = true AND ${table.is_overruled} = false`),
  
  // Full-text search on judgment content
  fullTextVectorIdx: index("idx_precedents_full_text_vector")
    .using("gin", sql`to_tsvector('english', ${table.full_text_vector})`),
  
  // Active binding precedents for current legal analysis
  bindingActiveIdx: index("idx_precedents_binding_active")
    .on(table.is_binding, table.is_overruled)
    .where(sql`${table.is_binding} = true AND ${table.is_overruled} = false`),
  
  // Ensure overruled precedents have required metadata
  overruledCheck: check(
    "chk_precedents_overruled",
    sql`(${table.is_overruled} = false) OR (${table.is_overruled} = true AND ${table.overruled_by_id} IS NOT NULL AND ${table.overruled_date} IS NOT NULL)`
  ),
  
  // Relevance score must be between 0 and 100
  relevanceRangeCheck: check(
    "chk_precedents_relevance_range",
    sql`${table.relevance_score_percentage} >= 0 AND ${table.relevance_score_percentage} <= 100`
  ),
}));

// ============================================================================
// EXPERT REVIEW QUEUE - Human verification workflow for uncertain analyses
// ============================================================================
// Manages the assignment and tracking of analyses that need expert review
//
// COMPLEXITY & CONFIDENCE: Uses integer percentages for intuitive understanding
// A complexity score of 85 means "very complex" - immediately clear to reviewers
// Expert confidence of 90 means "high confidence" - no mental conversion needed

export const expert_review_queue = pgTable("expert_review_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Links to the analysis requiring review
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Priority scoring (1-10 scale for simplicity)
  // Using a smaller scale here because priority is categorical:
  // 1-3 = low, 4-6 = medium, 7-9 = high, 10 = critical
  priority: smallint("priority").notNull().default(5),
  
  // Complexity score as integer percentage (0-100)
  // Estimates how difficult this review will be:
  // 0-30 = straightforward, 31-60 = moderate, 61-85 = complex, 86-100 = highly complex
  // Based on factors like number of provisions involved, precedent conflicts, etc.
  complexity_score_percentage: smallint("complexity_score_percentage"),
  
  uncertainty_flags: text("uncertainty_flags").array().notNull().default(sql`ARRAY[]::text[]`),
  automated_risk_flags: jsonb("automated_risk_flags"), // Specific concerns raised by automation
  
  // Expert assignment and workflow
  assigned_expert_id: uuid("assigned_expert_id").references(() => users.id, { onDelete: "set null" }),
  assigned_at: timestamp("assigned_at"),
  due_date: timestamp("due_date"), // Optional deadline for high-priority items
  
  status: reviewStatusEnum("status").notNull().default("pending"),
  
  // Expert's assessment upon review completion
  expert_assessment: text("expert_assessment"),
  
  // Expert confidence in their own assessment stored as percentage (0-100)
  // This allows tracking expert certainty separately from the analysis confidence
  // High expert confidence (>80) means reviewer is sure of their assessment
  // Low expert confidence (<60) may trigger additional senior review
  expert_confidence_percentage: smallint("expert_confidence_percentage"),
  
  recommended_action: varchar("recommended_action", { length: 100 }),
  requires_escalation: boolean("requires_escalation").notNull().default(false),
  escalation_reason: text("escalation_reason"),
  
  // Performance tracking
  reviewed_at: timestamp("reviewed_at"),
  review_duration_minutes: integer("review_duration_minutes"),
  
  // Feedback loop for improving automation
  // Measures how accurate the automated analysis was compared to expert review
  automation_accuracy_percentage: smallint("automation_accuracy_percentage"),
  feedback_to_system: text("feedback_to_system"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate queue entries for same analysis
  analysisUniqueIdx: uniqueIndex("idx_review_queue_analysis_unique")
    .on(table.analysis_id),
  
  // Work queue queries for expert dashboard
  statusPriorityIdx: index("idx_review_queue_status_priority")
    .on(table.status, table.priority, table.created_at),
  
  // Expert workload tracking
  assignedExpertStatusIdx: index("idx_review_queue_assigned_expert_status")
    .on(table.assigned_expert_id, table.status)
    .where(sql`${table.assigned_expert_id} IS NOT NULL`),
  
  // High-priority pending items for alerts
  pendingHighPriorityIdx: index("idx_review_queue_pending_high_priority")
    .on(table.priority, table.created_at)
    .where(sql`${table.status} = 'pending' AND ${table.priority} >= 7`),
  
  // Complex cases that may need senior reviewers
  highComplexityIdx: index("idx_review_queue_high_complexity")
    .on(table.complexity_score_percentage, table.status)
    .where(sql`${table.complexity_score_percentage} >= 70`),
  
  // Due date tracking for overdue items
  dueDateIdx: index("idx_review_queue_due_date")
    .on(table.due_date, table.status)
    .where(sql`${table.due_date} IS NOT NULL AND ${table.status} IN ('pending', 'assigned', 'in_review')`),
  
  // Ensure assignment metadata is consistent
  assignmentCheck: check(
    "chk_review_queue_assignment",
    sql`(${table.assigned_expert_id} IS NULL AND ${table.assigned_at} IS NULL) OR (${table.assigned_expert_id} IS NOT NULL AND ${table.assigned_at} IS NOT NULL)`
  ),
  
  // Priority must be in valid range (1-10)
  priorityRangeCheck: check(
    "chk_review_queue_priority_range",
    sql`${table.priority} >= 1 AND ${table.priority} <= 10`
  ),
  
  // Complexity score must be between 0 and 100
  complexityRangeCheck: check(
    "chk_review_queue_complexity_range",
    sql`${table.complexity_score_percentage} IS NULL OR (${table.complexity_score_percentage} >= 0 AND ${table.complexity_score_percentage} <= 100)`
  ),
  
  // Expert confidence must be between 0 and 100
  expertConfidenceRangeCheck: check(
    "chk_review_queue_expert_confidence_range",
    sql`${table.expert_confidence_percentage} IS NULL OR (${table.expert_confidence_percentage} >= 0 AND ${table.expert_confidence_percentage} <= 100)`
  ),
  
  // Automation accuracy must be between 0 and 100
  automationAccuracyRangeCheck: check(
    "chk_review_queue_automation_accuracy_range",
    sql`${table.automation_accuracy_percentage} IS NULL OR (${table.automation_accuracy_percentage} >= 0 AND ${table.automation_accuracy_percentage} <= 100)`
  ),
  
  // Escalation requires reason
  escalationCheck: check(
    "chk_review_queue_escalation",
    sql`(${table.requires_escalation} = false) OR (${table.requires_escalation} = true AND ${table.escalation_reason} IS NOT NULL)`
  ),
}));

// ============================================================================
// ANALYSIS AUDIT TRAIL - Complete change history for compliance and debugging
// ============================================================================
// Immutable log of all changes to constitutional analyses for auditability

export const analysis_audit_trail = pgTable("analysis_audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Links to the analysis being modified
  analysis_id: uuid("analysis_id").notNull().references(() => constitutional_analyses.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  
  // Change details
  change_type: changeTypeEnum("change_type").notNull(),
  field_changed: varchar("field_changed", { length: 100 }),
  old_value: jsonb("old_value"), // Store as JSONB for flexibility
  new_value: jsonb("new_value"),
  
  // Explanation and context
  change_reason: text("change_reason"),
  automated_reasoning: jsonb("automated_reasoning"), // Machine-readable reason if automated
  
  // Actor who made the change (human or system)
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  system_process: varchar("system_process", { length: 100 }),
  
  // Client and session information for debugging
  ip_address: varchar("ip_address", { length: 45 }), // IPv6 compatible
  user_agent: text("user_agent"),
  session_id: uuid("session_id"),
  
  // Performance metrics
  processing_time_ms: integer("processing_time_ms"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Analysis history queries
  analysisCreatedIdx: index("idx_audit_trail_analysis_created")
    .on(table.analysis_id, table.created_at),
  
  // Bill-level audit queries
  billCreatedIdx: index("idx_audit_trail_bill_created")
    .on(table.bill_id, table.created_at),
  
  // User activity tracking
  userCreatedIdx: index("idx_audit_trail_user_created")
    .on(table.user_id, table.created_at)
    .where(sql`${table.user_id} IS NOT NULL`),
  
  // Change type filtering
  changeTypeIdx: index("idx_audit_trail_change_type")
    .on(table.change_type, table.created_at),
  
  // Time-based queries for audit reports
  createdAtIdx: index("idx_audit_trail_created_at")
    .on(table.created_at),
  
  // System vs human changes
  systemProcessIdx: index("idx_audit_trail_system_process")
    .on(table.system_process, table.created_at)
    .where(sql`${table.system_process} IS NOT NULL`),
  
  // Ensure either user or system made the change
  actorCheck: check(
    "chk_audit_trail_actor",
    sql`${table.user_id} IS NOT NULL OR ${table.system_process} IS NOT NULL`
  ),
}));

// ============================================================================
// RELATIONSHIPS - Define Drizzle ORM relations for type-safe joins
// ============================================================================

export const constitutionalProvisionsRelations = relations(
  constitutional_provisions,
  ({ many, one }) => ({
    // Self-referential parent-child relationship
    parent: one(constitutional_provisions, {
      fields: [constitutional_provisions.parent_provision_id],
      references: [constitutional_provisions.id],
      relationName: "parent",
    }),
    children: many(constitutional_provisions, {
      relationName: "parent",
    }),
    // All analyses referencing this provision
    analyses: many(constitutional_analyses),
  })
);

export const constitutionalAnalysesRelations = relations(
  constitutional_analyses,
  ({ one, many }) => ({
    // Link to the bill being analyzed
    bill: one(bills, {
      fields: [constitutional_analyses.bill_id],
      references: [bills.id],
    }),
    // Link to the constitutional provision
    provision: one(constitutional_provisions, {
      fields: [constitutional_analyses.provision_id],
      references: [constitutional_provisions.id],
    }),
    // Link to expert review if flagged
    expertReview: one(expert_review_queue, {
      fields: [constitutional_analyses.id],
      references: [expert_review_queue.analysis_id],
    }),
    // All audit trail entries for this analysis
    auditTrail: many(analysis_audit_trail),
  })
);

export const legalPrecedentsRelations = relations(
  legal_precedents,
  ({ one }) => ({
    // Link to overruling case if this precedent was overruled
    overruledBy: one(legal_precedents, {
      fields: [legal_precedents.overruled_by_id],
      references: [legal_precedents.id],
      relationName: "overruledBy",
    }),
  })
);

export const expertReviewQueueRelations = relations(
  expert_review_queue,
  ({ one }) => ({
    // Link to the analysis being reviewed
    analysis: one(constitutional_analyses, {
      fields: [expert_review_queue.analysis_id],
      references: [constitutional_analyses.id],
    }),
    // Link to the bill for context
    bill: one(bills, {
      fields: [expert_review_queue.bill_id],
      references: [bills.id],
    }),
    // Link to the expert assigned to review
    assignedExpert: one(users, {
      fields: [expert_review_queue.assigned_expert_id],
      references: [users.id],
    }),
  })
);

export const analysisAuditTrailRelations = relations(
  analysis_audit_trail,
  ({ one }) => ({
    // Link to the analysis that was changed
    analysis: one(constitutional_analyses, {
      fields: [analysis_audit_trail.analysis_id],
      references: [constitutional_analyses.id],
    }),
    // Link to the bill for context
    bill: one(bills, {
      fields: [analysis_audit_trail.bill_id],
      references: [bills.id],
    }),
    // Link to the user who made the change
    user: one(users, {
      fields: [analysis_audit_trail.user_id],
      references: [users.id],
    }),
  })
);