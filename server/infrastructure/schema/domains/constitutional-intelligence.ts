// ============================================================================
// DOMAIN EXPORTS - Constitutional Intelligence Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { constitutional_provisions, legal_precedents } from '@server/infrastructure/schema/domains/constitutional-intelligence'

export {
  constitutional_provisions,
  constitutional_analyses,
  legal_precedents,
  expert_review_queue,
  analysis_audit_trail,
  constitutional_vulnerabilities,
  underutilized_provisions,
  elite_literacy_assessment,
  constitutional_loopholes,
  elite_knowledge_scores,
  constitutionalProvisionsRelations,
  constitutionalAnalysesRelations,
  legalPrecedentsRelations,
  expertReviewQueueRelations,
  analysisAuditTrailRelations,
  constitutionalVulnerabilitiesRelations,
  underutilizedProvisionsRelations,
  eliteLiteracyAssessmentRelations,
  constitutionalLoopholesRelations,
  eliteKnowledgeScoresRelations
} from "./constitutional_intelligence";

export type {
  ConstitutionalProvision,
  NewConstitutionalProvision,
  ConstitutionalAnalysis,
  NewConstitutionalAnalysis,
  LegalPrecedent,
  NewLegalPrecedent,
  ExpertReviewQueue,
  NewExpertReviewQueue,
  AnalysisAuditTrail,
  NewAnalysisAuditTrail,
  ConstitutionalVulnerability,
  NewConstitutionalVulnerability,
  UnderutilizedProvision,
  NewUnderutilizedProvision,
  EliteLiteracyAssessment,
  NewEliteLiteracyAssessment,
  ConstitutionalLoophole,
  NewConstitutionalLoophole,
  EliteKnowledgeScore,
  NewEliteKnowledgeScore
} from "./constitutional_intelligence";
