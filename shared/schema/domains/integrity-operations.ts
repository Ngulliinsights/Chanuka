// ============================================================================
// DOMAIN EXPORTS - Integrity Operations Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { content_reports, moderation_queue } from '@/shared/schema/domains/integrity-operations'

export {
  content_reports,
  moderation_queue,
  expert_profiles,
  user_verification,
  user_activity_log,
  audit_payloads,
  system_audit_log,
  security_events,
  contentReportsRelations,
  moderationQueueRelations,
  expertProfilesRelations,
  userVerificationRelations,
  userActivityLogRelations,
  systemAuditLogRelations,
  securityEventsRelations
} from "./integrity_operations";
