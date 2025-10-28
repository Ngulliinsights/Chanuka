import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS - Native PostgreSQL enums for type safety across the stack
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["citizen", "expert", "admin", "journalist", "advocate"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected", "disputed"]);
export const billStatusEnum = pgEnum("bill_status", ["introduced", "committee", "passed", "failed", "signed"]);
export const commentTypeEnum = pgEnum("comment_type", ["general", "expert_analysis", "concern", "support"]);
export const voteTypeEnum = pgEnum("vote_type", ["up", "down"]);
export const sponsorshipTypeEnum = pgEnum("sponsorship_type", ["primary", "co_sponsor", "supporter"]);
export const analysisTypeEnum = pgEnum("analysis_type", ["constitutional", "stakeholder", "impact", "complexity"]);
export const conflictTypeEnum = pgEnum("conflict_type", ["constitutional", "procedural", "contradictory"]);
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "high", "critical"]);
export const stakeholderTypeEnum = pgEnum("stakeholder_type", ["business", "ngo", "agency", "individual"]);
export const affiliationTypeEnum = pgEnum("affiliation_type", ["economic", "professional", "advocacy", "cultural"]);
export const affiliationConflictTypeEnum = pgEnum("affiliation_conflict_type", ["financial", "ownership", "influence", "representation", "none", "previous"]);
export const disclosureTypeEnum = pgEnum("disclosure_type", ["financial", "business", "family"]);
export const moderationContentTypeEnum = pgEnum("moderation_content_type", ["comment", "bill", "user_profile", "sponsor_transparency"]);
export const flagTypeEnum = pgEnum("flag_type", ["spam", "harassment", "misinformation", "inappropriate", "copyright", "other"]);

// --- REFINED: Split moderationStatusEnum for domain-specific contexts ---

// Original enum (for reference, now deprecated by specific enums):
// export const moderationStatusEnum = pgEnum("moderation_status", ["pending", "in_progress", "reviewed", "resolved", "dismissed", "escalated", "approved", "rejected", "active", "open", "investigating", "contained", "closed"]);

// NEW: For user-generated content reports (replaces contentFlag/moderationFlag)
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "resolved", "dismissed", "escalated"]);

// NEW: For security incidents
export const incidentStatusEnum = pgEnum("incident_status", ["open", "investigating", "contained", "resolved", "closed"]);

// NEW: For compliance checks
export const complianceStatusEnum = pgEnum("compliance_status", ["pending", "compliant", "non_compliant", "remediating"]);

// NEW: For the 'evaluation' table in the dashboard
export const evaluationStatusEnum = pgEnum("evaluation_status", ["pending", "screening", "interviewing", "rejected", "hired"]);

// --- End of refinement ---

export const moderationActionTypeEnum = pgEnum("moderation_action_type", ["warn", "hide", "delete", "ban_user", "verify", "highlight"]);
export const securityResultEnum = pgEnum("security_result", ["success", "failure", "blocked"]);
export const complianceCheckTypeEnum = pgEnum("compliance_check_type", ["gdpr", "ccpa", "sox", "pci_dss", "custom"]);
export const threatTypeEnum = pgEnum("threat_type", ["malicious_ip", "bot", "scanner"]);
export const threatSourceEnum = pgEnum("threat_source", ["internal", "external_feed", "manual"]);
export const regulationStatusEnum = pgEnum("regulation_status", ["proposed", "enacted", "repealed"]);
export const syncStatusEnum = pgEnum("sync_status", ["pending", "running", "completed", "failed", "cancelled"]);
export const syncErrorLevelEnum = pgEnum("sync_error_level", ["warning", "error", "critical"]);
export const conflictResolutionEnum = pgEnum("conflict_resolution", ["pending", "automatic", "manual"]);
export const notificationTypeEnum = pgEnum("notification_type", ["bill_update", "comment_reply", "verification_status"]);
export const attackPatternTypeEnum = pgEnum("attack_pattern_type", ["regex", "behavioral", "statistical"]);
export const securityAlertStatusEnum = pgEnum("security_alert_status", ["active", "acknowledged", "resolved", "dismissed"]);
export const verificationTypeEnum = pgEnum("verification_type", ["accuracy", "constitutional", "impact", "stakeholder", "community"]);
