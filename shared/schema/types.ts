import { z } from "zod";
import * as validation from "./validation";
import type {
  user, userProfile, session, refreshToken, passwordReset, userSocialProfile, userInterest, userProgress,
  bill, billTag, billSponsorship, billComment, commentVote, billEngagement, socialShare, sponsor,
  sponsorAffiliation, sponsorTransparency, analysis, contentAnalysis, billSectionConflict, verification,
  stakeholder, moderationAction, /* moderationFlag, moderationQueue, (REMOVED) */
  contentReport, // <-- REFINED (was contentFlag)
  securityAuditLog, complianceCheck, threatIntelligence, securityIncident, securityAlert, attackPattern,
  regulation, regulatoryChange, regulatoryImpact, syncJob, syncError, conflict, conflictSource, notification,
  analyticsEvent, analyticsDailySummary, userActivitySummary, billAnalyticsSummary, systemHealthMetric,
  department, evaluation
} from "./schema";

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================
// NOTE: This file historically exposed a mix of Zod-derived (validation) types
// and Drizzle-inferred DB row types under the same names which led to
// ambiguity. We're making Drizzle (DB) row shapes the canonical types for
// domain entities and installing explicit aliases for Zod "select" schemas
// as `*Dto` (data transfer / validation shapes). Where a DB table exists we
// export three symbols:
//   - <Name>Row  => the Drizzle-inferred DB row shape
//   - <Name>Dto  => the Zod-derived select/validation shape
//   - <Name>     => canonical alias pointing to <Name>Row (for minimal churn)

// Zod-derived DTOs (keep original validation schemas accessible)
export type UserDto = z.infer<typeof validation.selectUserSchema>;
export type UserProfileDto = z.infer<typeof validation.selectUserProfileSchema>;
export type BillDto = z.infer<typeof validation.selectBillSchema>;
export type SponsorDto = z.infer<typeof validation.selectSponsorSchema>;
export type AnalysisDto = z.infer<typeof validation.selectAnalysisSchema>;
export type StakeholderDto = z.infer<typeof validation.selectStakeholderSchema>;
export type NotificationDto = z.infer<typeof validation.selectNotificationSchema>;
export type ComplianceCheckDto = z.infer<typeof validation.selectComplianceCheckSchema>;
export type SocialShareDto = z.infer<typeof validation.selectSocialShareSchema>;
export type VerificationDto = z.infer<typeof validation.selectVerificationSchema>;

// When a corresponding Drizzle table exists we expose the DB row type and
// make it the canonical exported name. The DB table bindings are imported
// from `./schema` at the top of this file (see imports).
export type UserRow = typeof user.$inferSelect;
export type User = UserRow;

export type UserProfileRow = typeof userProfile.$inferSelect;
export type UserProfile = UserProfileRow;

export type BillRow = typeof bill.$inferSelect;
export type Bill = BillRow;

export type SponsorRow = typeof sponsor.$inferSelect;
export type Sponsor = SponsorRow;

export type AnalysisRow = typeof analysis.$inferSelect;
export type Analysis = AnalysisRow;

export type StakeholderRow = typeof stakeholder.$inferSelect;
export type Stakeholder = StakeholderRow;

export type NotificationRow = typeof notification.$inferSelect;
export type Notification = NotificationRow;

export type ComplianceCheckRow = typeof complianceCheck.$inferSelect;
export type ComplianceCheck = ComplianceCheckRow;

export type SocialShareRow = typeof socialShare.$inferSelect;
export type SocialShare = SocialShareRow;

export type VerificationRow = typeof verification.$inferSelect;
export type Verification = VerificationRow;

// Select Types (Inferred from Drizzle Table)
export type Session = typeof session.$inferSelect;
export type RefreshToken = typeof refreshToken.$inferSelect;
export type PasswordReset = typeof passwordReset.$inferSelect;
export type UserSocialProfile = typeof userSocialProfile.$inferSelect;
export type UserInterest = typeof userInterest.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;

export type BillTag = typeof billTag.$inferSelect;
export type BillSponsorship = typeof billSponsorship.$inferSelect;
export type BillComment = typeof billComment.$inferSelect;
export type CommentVote = typeof commentVote.$inferSelect;
export type BillEngagement = typeof billEngagement.$inferSelect;

export type SponsorAffiliation = typeof sponsorAffiliation.$inferSelect;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;

export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type BillSectionConflict = typeof billSectionConflict.$inferSelect;

// --- REFINED: Moderation types ---
// export type ModerationFlag = typeof moderationFlag.$inferSelect; // <-- REMOVED
export type ModerationAction = typeof moderationAction.$inferSelect;
// export type ModerationQueue = typeof moderationQueue.$inferSelect; // <-- REMOVED
export type ContentReport = typeof contentReport.$inferSelect; // <-- REFINED (was ContentFlag)
// --- End Refinement ---

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type ThreatIntelligence = typeof threatIntelligence.$inferSelect;
export type SecurityIncident = typeof securityIncident.$inferSelect;
export type SecurityAlert = typeof securityAlert.$inferSelect;
export type AttackPattern = typeof attackPattern.$inferSelect;

export type Regulation = typeof regulation.$inferSelect;
export type RegulatoryChange = typeof regulatoryChange.$inferSelect;
export type RegulatoryImpact = typeof regulatoryImpact.$inferSelect;

export type SyncJob = typeof syncJob.$inferSelect;
export type SyncError = typeof syncError.$inferSelect;
export type Conflict = typeof conflict.$inferSelect;
export type ConflictSource = typeof conflictSource.$inferSelect;

export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type AnalyticsDailySummary = typeof analyticsDailySummary.$inferSelect;
export type UserActivitySummary = typeof userActivitySummary.$inferSelect;
export type BillAnalyticsSummary = typeof billAnalyticsSummary.$inferSelect;
export type SystemHealthMetric = typeof systemHealthMetric.$inferSelect;

export type Department = typeof department.$inferSelect;
export type Evaluation = typeof evaluation.$inferSelect;

// Insert Types
export type InsertUser = z.infer<typeof validation.insertUserSchema>;
export type InsertUserProfile = z.infer<typeof validation.insertUserProfileSchema>;
export type InsertUserProgress = z.infer<typeof validation.insertUserProgressSchema>;
export type InsertBill = z.infer<typeof validation.insertBillSchema>;
export type InsertBillComment = z.infer<typeof validation.insertBillCommentSchema>;
export type InsertSponsor = z.infer<typeof validation.insertSponsorSchema>;
export type InsertAnalysis = z.infer<typeof validation.insertAnalysisSchema>;
export type InsertStakeholder = z.infer<typeof validation.insertStakeholderSchema>;
export type InsertNotification = z.infer<typeof validation.insertNotificationSchema>;
export type InsertComplianceCheck = z.infer<typeof validation.insertComplianceCheckSchema>;
export type InsertSocialShare = z.infer<typeof validation.insertSocialShareSchema>;
export type InsertVerification = z.infer<typeof validation.insertVerificationSchema>;

// --- ADDED: Missing insert types ---
export type InsertBillSponsorship = z.infer<typeof validation.insertBillSponsorshipSchema>;
export type InsertCommentVote = z.infer<typeof validation.insertCommentVoteSchema>;
export type InsertBillTag = z.infer<typeof validation.insertBillTagSchema>;
export type InsertUserInterest = z.infer<typeof validation.insertUserInterestSchema>;

// --- REFINED: Moderation insert types ---
// export type InsertModerationFlag = ... // <-- REMOVED
// export type InsertModerationQueue = ... // <-- REMOVED
export type InsertContentReport = z.infer<typeof validation.insertContentReportSchema>; // <-- REFINED
// --- End Refinement ---

// ============================================================================
// EXTENDED TYPES WITH COMPUTED FIELDS
// ============================================================================

export type CommentWithAuthorAndVotes = BillComment & {
  author?: Pick<User, "id" | "name" | "role"> & {
    profile?: Pick<UserProfile, "avatarUrl" | "reputationScore">
  }; // <-- REFINED
  replies?: CommentWithAuthorAndVotes[];
  voteCount: number;
  netVotes: number;
};

export type BillWithDetails = Bill & {
  sponsor?: Sponsor;
  tags?: BillTag[]; // <-- REFINED (was string[], now BillTag[])
  analyses?: Analysis[];
  liveCommentCount?: number; // <-- REFINED (distinguished from commentCountCached)
  engagementMetrics?: BillEngagement;
};

export type UserWithProfile = User & {
  profile?: UserProfile;
  interests?: UserInterest[];
  progress?: UserProgress[];
  // <-- REFINED: Removed reputationScore, as it's available via profile.reputationScore
};

export type SponsorWithDetails = Sponsor & {
  affiliations?: SponsorAffiliation[];
  transparencies?: SponsorTransparency[];
  billCount?: number;
  activeConflicts?: number;
};

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export type DepartmentStat = {
  name: string;
  relationHires: number;
  totalHires: number;
  score: number;
};

export type RadarDatum = {
  subject: string;
  candidate: number;
  department: number;
  expected: number;
};

export type EngagementMetrics = {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  averageEngagementScore: number;
  topBills: BillWithDetails[];
  trendingTopics: string[];
};

export type SecurityMetrics = {
  totalThreats: number;
  activeThreats: number;
  blockedIps: number;
  recentAuditLogs: SecurityAuditLog[];
  criticalAlerts: number;
};

export type AnalyticsMetrics = {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  topContent: BillWithDetails[];
  userGrowth: number;
  engagementRate: number;
};

export type ModerationMetrics = {
  pendingReports: number; // <-- REFINED (was pendingReviews)
  autoFlaggedReports: number; // <-- REFINED
  averageReviewTime: number;
  autoFlagAccuracy: number;
  resolvedToday: number;
};