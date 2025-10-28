// Barrel exports for shared/schema
export * from "./schema";
export * from "./enum";
export * from "./validation";

// Export types explicitly to avoid conflicts
export type {
  UserDto, UserProfileDto, BillDto, SponsorDto, AnalysisDto,
  StakeholderDto, NotificationDto, ComplianceCheckDto,
  SocialShareDto, VerificationDto, UserRow, User, UserProfileRow,
  UserProfile, BillRow, Bill
} from "./types";

// Export table definitions explicitly for database pool
export {
  user, userProfile, session, refreshToken, passwordReset, userSocialProfile, userInterest, userProgress,
  sponsor, bill, billTag, billSponsorship, billComment, commentVote, billEngagement, userBillTrackingPreference, socialShare,
  analysis, contentAnalysis, billSectionConflict, verification,
  stakeholder, sponsorAffiliation, sponsorTransparency,
  contentReport, moderationAction,
  securityAuditLog, complianceCheck, threatIntelligence, securityIncident, securityAlert, attackPattern,
  regulation, regulatoryChange, regulatoryImpact,
  syncJob, syncError, conflict, conflictSource,
  notification,
  analyticsEvent, analyticsDailySummary, userActivitySummary, billAnalyticsSummary, systemHealthMetric,
  department, evaluation,
  // Plural versions
  users, userProfiles, sessions, refreshTokens, passwordResets, userSocialProfiles, userInterests, userProgresses,
  sponsors, bills, billTags, billSponsorships, billComments, commentVotes, billEngagements, userBillTrackingPreferences, socialShares,
  analyses, contentAnalyses, billSectionConflicts, verifications,
  stakeholders, sponsorAffiliations, sponsorTransparencies,
  contentReports, moderationActions,
  securityAuditLogs, complianceChecks, threatIntelligences, securityIncidents, securityAlerts, attackPatterns,
  regulations, regulatoryChanges, regulatoryImpacts,
  syncJobs, syncErrors, conflicts, conflictSources,
  notifications,
  analyticsEvents, analyticsDailySummaries, userActivitySummaries, billAnalyticsSummaries, systemHealthMetrics,
  departments, evaluations
} from "./schema";

// Note: `searchVector` column is represented as text in TypeScript schema
// and the true tsvector column + GIN index are created via SQL migrations.
export * from "./searchVectorMigration";






































