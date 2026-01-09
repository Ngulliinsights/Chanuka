// ============================================================================
// DOMAIN EXPORTS - Safeguards Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { rate_limits, contentFlags } from '@/shared/schema/domains/safeguards'
//
// CRITICAL: This domain handles security & platform protection:
// - Rate limiting (immediate protection)
// - Content moderation (community standards)
// - CIB detection (organized abuse)
// - Reputation system (trust & gamification)
// - Identity verification (fraud prevention)
// - Behavioral anomaly detection
//
// ALIGNMENT NOTE: Some tables may have relationships to integrity-operations domain
// For example, reputation flows into moderation decisions

export {
  // Rate limiting tables
  rateLimits,
  rateLimitConfig,
  rateLimitsRelations,

  // Content moderation tables
  contentFlags,
  contentFlagsRelations,

  // Moderation queue & decisions
  moderationQueue,
  moderationDecisions,
  moderationAppeals,
  moderationQueueRelations,
  moderationDecisionsRelations,
  moderationAppealsRelations,

  // Expert moderator tracking
  expertModeratorEligibility,
  expertModeratorEligibilityRelations,

  // Coordinated inauthentic behavior detection
  cibDetections,
  cibDetectionsRelations,

  // Behavioral anomaly detection
  behavioralAnomalies,
  behavioralAnomaliesRelations,

  // Activity & anomaly logging
  suspiciousActivityLogs,
  suspiciousActivityLogsRelations,

  // Reputation system
  reputationScores,
  reputationHistory,
  reputationScoresRelations,
  reputationHistoryRelations,

  // Identity verification
  identityVerification,
  deviceFingerprints,
  identityVerificationRelations,
  deviceFingerprintsRelations,

  // Enums
  rateLimitActionEnum,
  moderationActionEnum,
  flagReasonEnum,
  cibPatternEnum,
  reputationSourceEnum,
  verificationMethodEnum,
  iprsVerificationStatusEnum,
} from "../safeguards";

export type {
  RateLimitAction,
  ModerationAction,
  FlagReason,
  CibPattern,
  ReputationSource,
  VerificationMethod,
  IprsVerificationStatus,
} from "../safeguards";
