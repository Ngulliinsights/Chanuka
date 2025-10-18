import { z } from "zod";
import * as validation from "./validation";
import type {
  user, userProfile, session, refreshToken, passwordReset, userSocialProfile, userInterest, userProgress,
  bill, billTag, billSponsorship, billComment, commentVote, billEngagement, socialShare, sponsor,
  sponsorAffiliation, sponsorTransparency, analysis, contentAnalysis, billSectionConflict, verification,
  stakeholder, moderationFlag, moderationAction, moderationQueue, contentFlag, securityAuditLog,
  complianceCheck, threatIntelligence, securityIncident, securityAlert, attackPattern, regulation,
  regulatoryChange, regulatoryImpact, syncJob, syncError, conflict, conflictSource, notification,
  analyticsEvent, analyticsDailySummary, userActivitySummary, billAnalyticsSummary, systemHealthMetric,
  department, evaluation
} from "./schema";

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

// Select Types (Inferred from Zod)
export type User = z.infer<typeof validation.selectUserSchema>;
export type UserProfile = z.infer<typeof validation.selectUserProfileSchema>;
export type Bill = z.infer<typeof validation.selectBillSchema>;
export type Sponsor = z.infer<typeof validation.selectSponsorSchema>;
export type Analysis = z.infer<typeof validation.selectAnalysisSchema>;
export type Stakeholder = z.infer<typeof validation.selectStakeholderSchema>;
export type Notification = z.infer<typeof validation.selectNotificationSchema>;
export type ComplianceCheck = z.infer<typeof validation.selectComplianceCheckSchema>;
export type SocialShare = z.infer<typeof validation.selectSocialShareSchema>;
export type Verification = z.infer<typeof validation.selectVerificationSchema>;

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

export type ModerationFlag = typeof moderationFlag.$inferSelect;
export type ModerationAction = typeof moderationAction.$inferSelect;
export type ModerationQueue = typeof moderationQueue.$inferSelect;
export type ContentFlag = typeof contentFlag.$inferSelect;

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

// ============================================================================
// EXTENDED TYPES WITH COMPUTED FIELDS
// ============================================================================

export type CommentWithAuthorAndVotes = BillComment & {
  author?: Pick<User, "id" | "name" | "role">;
  replies?: CommentWithAuthorAndVotes[];
  voteCount: number;
  netVotes: number;
};

export type BillWithDetails = Bill & {
  sponsor?: Sponsor;
  tags?: BillTag[];
  analyses?: Analysis[];
  commentCount?: number;
  engagementMetrics?: BillEngagement;
};

export type UserWithProfile = User & {
  profile?: UserProfile;
  interests?: UserInterest[];
  progress?: UserProgress[];
  reputationScore?: number;
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
  pendingReviews: number;
  flaggedContent: number;
  averageReviewTime: number;
  autoFlagAccuracy: number;
  resolvedToday: number;
};