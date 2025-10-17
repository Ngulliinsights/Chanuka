import {
  pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, check, inet, date, unique, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

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
export const affiliationConflictTypeEnum = pgEnum("affiliation_conflict_type", ["financial", "ownership", "influence", "representation"]);
export const disclosureTypeEnum = pgEnum("disclosure_type", ["financial", "business", "family"]);
export const moderationContentTypeEnum = pgEnum("moderation_content_type", ["comment", "bill", "user_profile", "sponsor_transparency"]);
export const flagTypeEnum = pgEnum("flag_type", ["spam", "harassment", "misinformation", "inappropriate", "copyright", "other"]);
export const moderationStatusEnum = pgEnum("moderation_status", ["pending", "in_progress", "reviewed", "resolved", "dismissed", "escalated", "approved", "rejected", "active", "open", "investigating", "contained", "closed"]);
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

// ============================================================================
// CORE USER TABLES
// ============================================================================
// Design: UUID primary keys prevent enumeration attacks and support distributed systems

export const user = pgTable("user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("citizen"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  preferences: jsonb("preferences").default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("user_email_idx").on(table.email),
  roleIdx: index("user_role_idx").on(table.role),
  activeVerifiedIdx: index("user_active_verified_idx").on(table.isActive, table.verificationStatus),
  createdAtIdx: index("user_created_at_idx").on(table.createdAt),
}));

export const userProfile = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }).unique(),
  bio: text("bio"),
  expertise: text("expertise").array().default([]),
  location: text("location"),
  organization: text("organization"),
  verificationDocuments: jsonb("verification_documents").default([]),
  reputationScore: integer("reputation_score").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("user_profile_user_id_idx").on(table.userId),
  reputationIdx: index("user_profile_reputation_idx").on(table.reputationScore),
  publicIdx: index("user_profile_public_idx").on(table.isPublic),
  reputationCheck: check("user_profile_reputation_check", sql`${table.reputationScore} >= 0`),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token"),
  refreshTokenHash: text("refresh_token_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("session_user_id_idx").on(table.userId),
  tokenIdx: index("session_token_idx").on(table.token),
  activeExpiresIdx: index("session_active_expires_idx").on(table.isActive, table.expiresAt),
}));

export const refreshToken = pgTable("refresh_token", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index("refresh_token_session_id_idx").on(table.sessionId),
  expiresNotRevokedIdx: index("refresh_token_expires_not_revoked_idx").on(table.expiresAt, table.isRevoked),
}));

export const passwordReset = pgTable("password_reset", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("password_reset_user_id_idx").on(table.userId),
  validTokensIdx: index("password_reset_valid_tokens_idx").on(table.expiresAt, table.isUsed),
}));

export const userSocialProfile = pgTable("user_social_profile", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  username: text("username"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userProviderUnique: uniqueIndex("user_social_profile_user_provider_idx").on(table.userId, table.provider),
  providerIdIdx: index("user_social_profile_provider_id_idx").on(table.provider, table.providerId),
}));

export const userInterest = pgTable("user_interest", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  interest: text("interest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userInterestUnique: uniqueIndex("user_interest_user_interest_idx").on(table.userId, table.interest),
  interestIdx: index("user_interest_interest_idx").on(table.interest),
}));

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(),
  achievementValue: integer("achievement_value").notNull().default(0),
  level: integer("level").default(1),
  badge: text("badge"),
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_progress_user_id_idx").on(table.userId),
  userAchievementUnique: uniqueIndex("user_progress_user_achievement_idx").on(table.userId, table.achievementType),
  levelCheck: check("user_progress_level_check", sql`${table.level} >= 1`),
  valueCheck: check("user_progress_value_check", sql`${table.achievementValue} >= 0`),
}));

// ============================================================================
// LEGISLATIVE CONTENT TABLES
// ============================================================================

export const sponsor = pgTable("sponsor", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  party: text("party"),
  constituency: text("constituency"),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  conflictLevel: severityEnum("conflict_level"),
  financialExposure: numeric("financial_exposure", { precision: 12, scale: 2 }).default("0"),
  votingAlignment: numeric("voting_alignment", { precision: 5, scale: 2 }).default("0"),
  transparencyScore: numeric("transparency_score", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameEmailUnique: uniqueIndex("sponsor_name_email_idx").on(table.name, table.email),
  nameIdx: index("sponsor_name_idx").on(table.name),
  partyIdx: index("sponsor_party_idx").on(table.party),
  activeIdx: index("sponsor_active_idx").on(table.isActive),
}));

export const bill = pgTable("bill", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  summary: text("summary"),
  status: billStatusEnum("status").notNull().default("introduced"),
  billNumber: text("bill_number").unique(),
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }),
  category: text("category"),
  tags: text("tags").array().default([]),
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"),
  complexityScore: integer("complexity_score"),
  constitutionalConcerns: jsonb("constitutional_concerns").default([]),
  stakeholderAnalysis: jsonb("stakeholder_analysis").default({}),
  introducedDate: timestamp("introduced_date", { withTimezone: true }),
  lastActionDate: timestamp("last_action_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("bill_status_idx").on(table.status),
  categoryIdx: index("bill_category_idx").on(table.category),
  sponsorIdIdx: index("bill_sponsor_id_idx").on(table.sponsorId),
  engagementScoreIdx: index("bill_engagement_score_idx").on(table.engagementScore),
  introducedDateIdx: index("bill_introduced_date_idx").on(table.introducedDate),
  statusCategoryIdx: index("bill_status_category_idx").on(table.status, table.category),
  recentActiveIdx: index("bill_recent_active_idx").on(table.lastActionDate, table.status),
  complexityCheck: check("bill_complexity_check", sql`${table.complexityScore} IS NULL OR (${table.complexityScore} >= 1 AND ${table.complexityScore} <= 10)`),
  countsCheck: check("bill_counts_check", sql`${table.viewCount} >= 0 AND ${table.shareCount} >= 0 AND ${table.commentCount} >= 0`),
}));

export const billTag = pgTable("bill_tag", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billTagUnique: uniqueIndex("bill_tag_bill_tag_idx").on(table.billId, table.tag),
  tagIdx: index("bill_tag_tag_idx").on(table.tag),
  billIdIdx: index("bill_tag_bill_id_idx").on(table.billId),
}));

export const billSponsorship = pgTable("bill_sponsorship", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  sponsorshipType: sponsorshipTypeEnum("sponsorship_type").notNull(),
  sponsorshipDate: timestamp("sponsorship_date", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billSponsorUnique: uniqueIndex("bill_sponsorship_bill_sponsor_idx").on(table.billId, table.sponsorId),
  sponsorIdIdx: index("bill_sponsorship_sponsor_id_idx").on(table.sponsorId),
  activeIdx: index("bill_sponsorship_active_idx").on(table.isActive),
  billActiveIdx: index("bill_sponsorship_bill_active_idx").on(table.billId, table.isActive),
}));

export const billComment = pgTable("bill_comment", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  commentType: commentTypeEnum("comment_type").notNull().default("general"),
  isVerified: boolean("is_verified").notNull().default(false),
  parentCommentId: integer("parent_comment_id").references(() => billComment.id, { onDelete: "cascade" }),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_comment_bill_id_idx").on(table.billId),
  userIdIdx: index("bill_comment_user_id_idx").on(table.userId),
  parentCommentIdIdx: index("bill_comment_parent_comment_id_idx").on(table.parentCommentId),
  createdAtIdx: index("bill_comment_created_at_idx").on(table.createdAt),
  billCreatedIdx: index("bill_comment_bill_created_idx").on(table.billId, table.createdAt),
  verifiedIdx: index("bill_comment_verified_idx").on(table.isVerified, table.billId),
  votesCheck: check("bill_comment_votes_check", sql`${table.upvotes} >= 0 AND ${table.downvotes} >= 0`),
}));

export const commentVote = pgTable("comment_vote", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => billComment.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  voteType: voteTypeEnum("vote_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  commentUserUnique: uniqueIndex("comment_vote_comment_user_idx").on(table.commentId, table.userId),
  commentIdIdx: index("comment_vote_comment_id_idx").on(table.commentId),
  userIdIdx: index("comment_vote_user_id_idx").on(table.userId),
}));

export const billEngagement = pgTable("bill_engagement", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  viewCount: integer("view_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"),
  lastEngagedAt: timestamp("last_engaged_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billUserUnique: uniqueIndex("bill_engagement_bill_user_idx").on(table.billId, table.userId),
  userIdIdx: index("bill_engagement_user_id_idx").on(table.userId),
  engagementScoreIdx: index("bill_engagement_score_idx").on(table.engagementScore),
  lastEngagedIdx: index("bill_engagement_last_engaged_idx").on(table.lastEngagedAt),
  userEngagedIdx: index("bill_engagement_user_engaged_idx").on(table.userId, table.lastEngagedAt),
  countsCheck: check("bill_engagement_counts_check", sql`${table.viewCount} >= 0 AND ${table.commentCount} >= 0 AND ${table.shareCount} >= 0`),
}));

export const socialShare = pgTable("social_share", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata").default({}),
  sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("social_share_bill_id_idx").on(table.billId),
  userIdIdx: index("social_share_user_id_idx").on(table.userId),
  platformIdx: index("social_share_platform_idx").on(table.platform),
  shareDateIdx: index("social_share_share_date_idx").on(table.sharedAt),
  billPlatformIdx: index("social_share_bill_platform_idx").on(table.billId, table.platform),
  countsCheck: check("social_share_counts_check", sql`${table.likes} >= 0 AND ${table.shares} >= 0 AND ${table.comments} >= 0`),
}));

// ============================================================================
// ANALYSIS AND VERIFICATION TABLES
// ============================================================================

export const analysis = pgTable("analysis", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  analysisType: analysisTypeEnum("analysis_type").notNull(),
  results: jsonb("results").default({}),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
  modelVersion: text("model_version"),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: uuid("approved_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billAnalysisTypeUnique: uniqueIndex("analysis_bill_type_idx").on(table.billId, table.analysisType),
  analysisTypeIdx: index("analysis_type_idx").on(table.analysisType),
  isApprovedIdx: index("analysis_is_approved_idx").on(table.isApproved),
  billApprovedIdx: index("analysis_bill_approved_idx").on(table.billId, table.isApproved),
  approvedByIdx: index("analysis_approved_by_idx").on(table.approvedBy),
  confidenceCheck: check("analysis_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
}));

export const contentAnalysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  toxicityScore: numeric("toxicity_score", { precision: 5, scale: 4 }).notNull().default("0"),
  spamScore: numeric("spam_score", { precision: 5, scale: 4 }).notNull().default("0"),
  sentimentScore: numeric("sentiment_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
  readabilityScore: numeric("readability_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
  flags: text("flags").array().default([]),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.8"),
  modelVersion: text("model_version").notNull().default("1.0"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  contentUnique: uniqueIndex("content_analysis_content_idx").on(table.contentType, table.contentId),
  toxicityIdx: index("content_analysis_toxicity_idx").on(table.toxicityScore),
  spamIdx: index("content_analysis_spam_idx").on(table.spamScore),
  contentTypeIdx: index("content_analysis_content_type_idx").on(table.contentType),
  analyzedAtIdx: index("content_analysis_analyzed_at_idx").on(table.analyzedAt),
  scoresCheck: check("content_analysis_scores_check", sql`
    ${table.toxicityScore} >= 0 AND ${table.toxicityScore} <= 1 AND
    ${table.spamScore} >= 0 AND ${table.spamScore} <= 1 AND
    ${table.sentimentScore} >= 0 AND ${table.sentimentScore} <= 1 AND
    ${table.readabilityScore} >= 0 AND ${table.readabilityScore} <= 1 AND
    ${table.confidence} >= 0 AND ${table.confidence} <= 1
  `),
}));

export const billSectionConflict = pgTable("bill_section_conflict", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  sectionNumber: text("section_number").notNull(),
  conflictType: conflictTypeEnum("conflict_type").notNull(),
  severity: severityEnum("severity").notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  isResolved: boolean("is_resolved").notNull().default(false),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_section_conflict_bill_id_idx").on(table.billId),
  severityIdx: index("bill_section_conflict_severity_idx").on(table.severity),
  isResolvedIdx: index("bill_section_conflict_is_resolved_idx").on(table.isResolved),
  billResolvedIdx: index("bill_section_conflict_bill_resolved_idx").on(table.billId, table.isResolved),
}));

export const verification = pgTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  userRole: userRoleEnum("user_role").notNull(),
  verificationType: verificationTypeEnum("verification_type").notNull(),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  evidence: jsonb("evidence").default([]),
  expertise: jsonb("expertise").default({}),
  reasoning: text("reasoning"),
  feedback: text("feedback"),
  endorsements: integer("endorsements").notNull().default(0),
  disputes: integer("disputes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("verification_bill_id_idx").on(table.billId),
  userIdIdx: index("verification_user_id_idx").on(table.userId),
  statusIdx: index("verification_status_idx").on(table.verificationStatus),
  billUserTypeUnique: uniqueIndex("verification_bill_user_type_idx").on(table.billId, table.userId, table.verificationType),
  confidenceCheck: check("verification_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  countsCheck: check("verification_counts_check", sql`${table.endorsements} >= 0 AND ${table.disputes} >= 0`),
}));

// ============================================================================
// STAKEHOLDER AND SPONSOR ANALYSIS
// ============================================================================

export const stakeholder = pgTable("stakeholder", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  organization: text("organization"),
  sector: text("sector"),
  type: stakeholderTypeEnum("type").notNull(),
  influence: numeric("influence", { precision: 5, scale: 2 }).notNull().default("0.00"),
  votingHistory: jsonb("voting_history").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("stakeholder_name_idx").on(table.name),
  sectorIdx: index("stakeholder_sector_idx").on(table.sector),
  typeIdx: index("stakeholder_type_idx").on(table.type),
  sectorTypeIdx: index("stakeholder_sector_type_idx").on(table.sector, table.type),
  influenceCheck: check("stakeholder_influence_check", sql`${table.influence} >= 0 AND ${table.influence} <= 100`),
}));

export const sponsorAffiliation = pgTable("sponsor_affiliation", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  organization: text("organization").notNull(),
  role: text("role"),
  type: affiliationTypeEnum("type").notNull(),
  conflictType: affiliationConflictTypeEnum("conflict_type"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_affiliation_sponsor_id_idx").on(table.sponsorId),
  organizationIdx: index("sponsor_affiliation_organization_idx").on(table.organization),
  activeIdx: index("sponsor_affiliation_active_idx").on(table.isActive),
  sponsorActiveIdx: index("sponsor_affiliation_sponsor_active_idx").on(table.sponsorId, table.isActive),
}));

export const sponsorTransparency = pgTable("sponsor_transparency", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  disclosureType: disclosureTypeEnum("disclosure_type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  source: text("source"),
  dateReported: timestamp("date_reported", { withTimezone: true }),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_transparency_sponsor_id_idx").on(table.sponsorId),
  disclosureTypeIdx: index("sponsor_transparency_disclosure_type_idx").on(table.disclosureType),
  isVerifiedIdx: index("sponsor_transparency_is_verified_idx").on(table.isVerified),
  sponsorVerifiedIdx: index("sponsor_transparency_sponsor_verified_idx").on(table.sponsorId, table.isVerified),
}));

// ============================================================================
// MODERATION AND SAFETY
// ============================================================================

export const moderationFlag = pgTable("moderation_flag", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  flagType: flagTypeEnum("flag_type").notNull(),
  reason: text("reason").notNull(),
  reportedBy: uuid("reported_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: moderationStatusEnum("status").notNull().default("pending"),
  severity: severityEnum("severity").notNull().default("medium"),
  autoDetected: boolean("auto_detected").notNull().default(false),
  reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_flag_content_idx").on(table.contentType, table.contentId),
  statusIdx: index("moderation_flag_status_idx").on(table.status),
  severityIdx: index("moderation_flag_severity_idx").on(table.severity),
  reportedByIdx: index("moderation_flag_reported_by_idx").on(table.reportedBy),
  reviewedByIdx: index("moderation_flag_reviewed_by_idx").on(table.reviewedBy),
  statusSeverityIdx: index("moderation_flag_status_severity_idx").on(table.status, table.severity),
}));

export const moderationAction = pgTable("moderation_action", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  actionType: moderationActionTypeEnum("action_type").notNull(),
  reason: text("reason").notNull(),
  moderatorId: uuid("moderator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  duration: integer("duration"),
  isReversible: boolean("is_reversible").notNull().default(true),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  reversedBy: uuid("reversed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_action_content_idx").on(table.contentType, table.contentId),
  actionTypeIdx: index("moderation_action_action_type_idx").on(table.actionType),
  moderatorIdIdx: index("moderation_action_moderator_id_idx").on(table.moderatorId),
  reversedByIdx: index("moderation_action_reversed_by_idx").on(table.reversedBy),
  createdAtIdx: index("moderation_action_created_at_idx").on(table.createdAt),
}));

export const moderationQueue = pgTable("moderation_queue", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  flags: jsonb("flags").default([]).notNull(),
  priority: integer("priority").default(1).notNull(),
  status: moderationStatusEnum("status").default("pending").notNull(),
  autoFlagged: boolean("auto_flagged").default(false),
  flagReasons: text("flag_reasons").array().default([]),
  moderatorId: uuid("moderator_id").references(() => user.id, { onDelete: "set null" }),
  moderatorNotes: text("moderator_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_queue_content_idx").on(table.contentType, table.contentId),
  statusPriorityIdx: index("moderation_queue_status_priority_idx").on(table.status, table.priority, table.createdAt),
  autoFlaggedIdx: index("moderation_queue_auto_flagged_idx").on(table.autoFlagged, table.createdAt),
  moderatorIdx: index("moderation_queue_moderator_idx").on(table.moderatorId),
  userIdx: index("moderation_queue_user_idx").on(table.userId),
  priorityCheck: check("moderation_queue_priority_check", sql`${table.priority} >= 1 AND ${table.priority} <= 5`),
}));

export const contentFlag = pgTable("content_flag", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  flaggerUserId: uuid("flagger_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  flagReason: text("flag_reason").notNull(),
  flagCategory: flagTypeEnum("flag_category").notNull(),
  description: text("description"),
  status: moderationStatusEnum("status").default("pending").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  contentIdx: index("content_flag_content_idx").on(table.contentType, table.contentId),
  flaggerIdx: index("content_flag_flagger_idx").on(table.flaggerUserId),
  statusIdx: index("content_flag_status_idx").on(table.status, table.createdAt),
  categoryIdx: index("content_flag_category_idx").on(table.flagCategory, table.createdAt),
  reviewedByIdx: index("content_flag_reviewed_by_idx").on(table.reviewedBy),
}));

// ============================================================================
// SECURITY AND COMPLIANCE
// ============================================================================

export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"),
  action: text("action"),
  result: securityResultEnum("result").notNull(),
  severity: severityEnum("severity").notNull().default("info"),
  details: jsonb("details").default({}),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("security_audit_log_event_type_idx").on(table.eventType),
  userIdIdx: index("security_audit_log_user_id_idx").on(table.userId),
  timestampIdx: index("security_audit_log_timestamp_idx").on(table.timestamp),
  severityIdx: index("security_audit_log_severity_idx").on(table.severity),
  resultIdx: index("security_audit_log_result_idx").on(table.result),
  severityTimestampIdx: index("security_audit_log_severity_timestamp_idx").on(table.severity, table.timestamp),
}));

export const complianceCheck = pgTable("compliance_check", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(),
  checkType: complianceCheckTypeEnum("check_type").notNull(),
  description: text("description"),
  status: moderationStatusEnum("status").notNull().default("pending"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  findings: jsonb("findings").default([]),
  remediation: text("remediation"),
  priority: severityEnum("priority").notNull().default("medium"),
  automated: boolean("automated").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  checkTypeIdx: index("compliance_check_check_type_idx").on(table.checkType),
  statusIdx: index("compliance_check_status_idx").on(table.status),
  nextCheckIdx: index("compliance_check_next_check_idx").on(table.nextCheckAt),
  priorityIdx: index("compliance_check_priority_idx").on(table.priority),
  statusPriorityIdx: index("compliance_check_status_priority_idx").on(table.status, table.priority),
}));

export const threatIntelligence = pgTable("threat_intelligence", {
  id: serial("id").primaryKey(),
  ipAddress: inet("ip_address").notNull().unique(),
  threatType: threatTypeEnum("threat_type").notNull(),
  severity: severityEnum("severity").notNull().default("medium"),
  source: threatSourceEnum("source").notNull(),
  description: text("description"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  occurrences: integer("occurrences").notNull().default(1),
  isBlocked: boolean("is_blocked").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  threatTypeIdx: index("threat_intelligence_threat_type_idx").on(table.threatType),
  severityIdx: index("threat_intelligence_severity_idx").on(table.severity),
  isActiveIdx: index("threat_intelligence_is_active_idx").on(table.isActive),
  activeBlockedIdx: index("threat_intelligence_active_blocked_idx").on(table.isActive, table.isBlocked),
  occurrencesCheck: check("threat_intelligence_occurrences_check", sql`${table.occurrences} >= 1`),
}));

export const securityIncident = pgTable("security_incident", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  severity: severityEnum("severity").notNull(),
  status: moderationStatusEnum("status").notNull().default("open"),
  description: text("description").notNull(),
  affectedUsers: text("affected_users").array().default([]),
  detectionMethod: text("detection_method"),
  firstDetectedAt: timestamp("first_detected_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  assignedTo: uuid("assigned_to").references(() => user.id, { onDelete: "set null" }),
  evidence: jsonb("evidence").default({}),
  mitigationSteps: text("mitigation_steps").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  incidentTypeIdx: index("security_incident_type_idx").on(table.incidentType),
  severityIdx: index("security_incident_severity_idx").on(table.severity),
  statusIdx: index("security_incident_status_idx").on(table.status),
  assignedToIdx: index("security_incident_assigned_to_idx").on(table.assignedTo),
  statusSeverityIdx: index("security_incident_status_severity_idx").on(table.status, table.severity),
}));

export const securityAlert = pgTable("security_alert", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  status: securityAlertStatusEnum("status").notNull().default("active"),
  assignedTo: uuid("assigned_to").references(() => user.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),
  incidentId: integer("incident_id").references(() => securityIncident.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  alertTypeIdx: index("security_alert_type_idx").on(table.alertType),
  severityIdx: index("security_alert_severity_idx").on(table.severity),
  statusIdx: index("security_alert_status_idx").on(table.status),
  incidentIdIdx: index("security_alert_incident_id_idx").on(table.incidentId),
  statusSeverityIdx: index("security_alert_status_severity_idx").on(table.status, table.severity),
}));

export const attackPattern = pgTable("attack_pattern", {
  id: serial("id").primaryKey(),
  patternName: text("pattern_name").notNull(),
  patternType: attackPatternTypeEnum("pattern_type").notNull(),
  pattern: text("pattern").notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  falsePositiveRate: integer("false_positive_rate").default(0),
  detectionCount: integer("detection_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  patternNameIdx: index("attack_pattern_name_idx").on(table.patternName),
  patternTypeIdx: index("attack_pattern_type_idx").on(table.patternType),
  enabledIdx: index("attack_pattern_enabled_idx").on(table.isEnabled),
}));

// ============================================================================
// REGULATORY MONITORING
// ============================================================================

export const regulation = pgTable("regulation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  status: regulationStatusEnum("status").notNull().default("proposed"),
  source: text("source"),
  sector: text("sector"),
  tags: text("tags").array().default([]),
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }),
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  complianceDeadline: timestamp("compliance_deadline", { withTimezone: true }),
  affectedStakeholders: integer("affected_stakeholders").default(0),
  estimatedImpact: numeric("estimated_impact", { precision: 10, scale: 2 }).default("0"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("regulation_status_idx").on(table.status),
  sectorIdx: index("regulation_sector_idx").on(table.sector),
  effectiveDateIdx: index("regulation_effective_date_idx").on(table.effectiveDate),
  statusSectorIdx: index("regulation_status_sector_idx").on(table.status, table.sector),
  sponsorIdIdx: index("regulation_sponsor_id_idx").on(table.sponsorId),
}));

export const regulatoryChange = pgTable("regulatory_change", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulation.id, { onDelete: "cascade" }),
  changeType: text("change_type"),
  changesRequirements: boolean("changes_requirements").notNull().default(false),
  shortensDeadline: boolean("shortens_deadline").notNull().default(false),
  addsCosts: boolean("adds_costs").notNull().default(false),
  affectsCompliance: boolean("affects_compliance").notNull().default(false),
  details: jsonb("details").default({}),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  reportedBy: uuid("reported_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  regulationIdIdx: index("regulatory_change_regulation_id_idx").on(table.regulationId),
  changeTypeIdx: index("regulatory_change_change_type_idx").on(table.changeType),
  changedAtIdx: index("regulatory_change_changed_at_idx").on(table.changedAt),
  regulationChangedIdx: index("regulatory_change_regulation_changed_idx").on(table.regulationId, table.changedAt),
  reportedByIdx: index("regulatory_change_reported_by_idx").on(table.reportedBy),
}));

export const regulatoryImpact = pgTable("regulatory_impact", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulation.id, { onDelete: "cascade" }),
  sector: text("sector"),
  impactLevel: severityEnum("impact_level"),
  affectedEntities: jsonb("affected_entities").default([]),
  mitigation: jsonb("mitigation").default({}),
  impactScore: numeric("impact_score", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  regulationIdIdx: index("regulatory_impact_regulation_id_idx").on(table.regulationId),
  sectorIdx: index("regulatory_impact_sector_idx").on(table.sector),
  impactLevelIdx: index("regulatory_impact_impact_level_idx").on(table.impactLevel),
  sectorImpactIdx: index("regulatory_impact_sector_impact_idx").on(table.sector, table.impactLevel),
}));

// ============================================================================
// DATA SYNCHRONIZATION
// ============================================================================

export const syncJob = pgTable("sync_job", {
  id: text("id").primaryKey(),
  dataSourceId: text("data_source_id").notNull(),
  endpointId: text("endpoint_id").notNull(),
  status: syncStatusEnum("status").notNull().default("pending"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsSkipped: integer("records_skipped").notNull().default(0),
  isIncremental: boolean("is_incremental").notNull().default(true),
  lastSyncTimestamp: timestamp("last_sync_timestamp", { withTimezone: true }),
  nextRunTime: timestamp("next_run_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("sync_job_status_idx").on(table.status),
  dataSourceIdx: index("sync_job_data_source_idx").on(table.dataSourceId),
  nextRunTimeIdx: index("sync_job_next_run_time_idx").on(table.nextRunTime),
  dataSourceStatusIdx: index("sync_job_data_source_status_idx").on(table.dataSourceId, table.status),
  recordsCheck: check("sync_job_records_check", sql`${table.recordsProcessed} >= 0 AND ${table.recordsUpdated} >= 0 AND ${table.recordsCreated} >= 0 AND ${table.recordsSkipped} >= 0`),
}));

export const syncError = pgTable("sync_error", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => syncJob.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  level: syncErrorLevelEnum("level").notNull(),
  message: text("message").notNull(),
  details: text("details"),
  recordId: text("record_id"),
  endpoint: text("endpoint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  jobIdIdx: index("sync_error_job_id_idx").on(table.jobId),
  levelIdx: index("sync_error_level_idx").on(table.level),
  timestampIdx: index("sync_error_timestamp_idx").on(table.timestamp),
  jobTimestampIdx: index("sync_error_job_timestamp_idx").on(table.jobId, table.timestamp),
}));

export const conflict = pgTable("conflict", {
  id: text("id").primaryKey(),
  dataType: text("data_type").notNull(),
  recordId: text("record_id").notNull(),
  resolution: conflictResolutionEnum("resolution").notNull().default("pending"),
  resolvedValue: text("resolved_value"),
  resolvedBy: uuid("resolved_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dataTypeRecordUnique: uniqueIndex("conflict_data_type_record_idx").on(table.dataType, table.recordId),
  resolutionIdx: index("conflict_resolution_idx").on(table.resolution),
  dataTypeIdx: index("conflict_data_type_idx").on(table.dataType),
  resolvedByIdx: index("conflict_resolved_by_idx").on(table.resolvedBy),
  confidenceCheck: check("conflict_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
}));

export const conflictSource = pgTable("conflict_source", {
  id: serial("id").primaryKey(),
  conflictId: text("conflict_id").notNull().references(() => conflict.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  value: text("value").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  priority: numeric("priority", { precision: 3, scale: 2 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conflictIdIdx: index("conflict_source_conflict_id_idx").on(table.conflictId),
  sourceIdIdx: index("conflict_source_source_id_idx").on(table.sourceId),
  conflictTimestampIdx: index("conflict_source_conflict_timestamp_idx").on(table.conflictId, table.timestamp),
  priorityCheck: check("conflict_source_priority_check", sql`${table.priority} >= 0 AND ${table.priority} <= 1`),
  confidenceCheck: check("conflict_source_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
}));

// ============================================================================
// NOTIFICATIONS AND MESSAGING
// ============================================================================

export const notification = pgTable("notification", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedBillId: integer("related_bill_id").references(() => bill.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notification_user_id_idx").on(table.userId),
  isReadIdx: index("notification_is_read_idx").on(table.isRead),
  typeIdx: index("notification_type_idx").on(table.type),
  createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
  userReadCreatedIdx: index("notification_user_read_created_idx").on(table.userId, table.isRead, table.createdAt),
}));

// ============================================================================
// ANALYTICS AND METRICS TABLES
// ============================================================================

export const analyticsEvent = pgTable("analytics_event", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category").notNull(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  billId: integer("bill_id").references(() => bill.id, { onDelete: "set null" }),
  commentId: integer("comment_id").references(() => billComment.id, { onDelete: "set null" }),
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }),
  eventData: jsonb("event_data").default({}),
  userAgent: text("user_agent"),
  ipAddress: inet("ip_address"),
  referrer: text("referrer"),
  pageUrl: text("page_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  typeCreatedIdx: index("analytics_event_type_created_idx").on(table.eventType, table.createdAt),
  categoryCreatedIdx: index("analytics_event_category_created_idx").on(table.eventCategory, table.createdAt),
  userCreatedIdx: index("analytics_event_user_created_idx").on(table.userId, table.createdAt),
  sessionCreatedIdx: index("analytics_event_session_created_idx").on(table.sessionId, table.createdAt),
  billCreatedIdx: index("analytics_event_bill_created_idx").on(table.billId, table.createdAt),
}));

export const analyticsDailySummary = pgTable("analytics_daily_summary", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category"),
  totalEvents: integer("total_events").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  uniqueSessions: integer("unique_sessions").default(0).notNull(),
  billInteractions: integer("bill_interactions").default(0),
  commentInteractions: integer("comment_interactions").default(0),
  searchQueries: integer("search_queries").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  dateTypeIdx: index("analytics_daily_summary_date_type_idx").on(table.date, table.eventType),
  categoryDateIdx: index("analytics_daily_summary_category_date_idx").on(table.eventCategory, table.date),
  uniqueDateTypeCategory: unique("analytics_daily_summary_date_type_category_key").on(table.date, table.eventType, table.eventCategory),
  countsCheck: check("analytics_daily_summary_counts_check", sql`${table.totalEvents} >= 0 AND ${table.uniqueUsers} >= 0 AND ${table.uniqueSessions} >= 0`),
}));

export const userActivitySummary = pgTable("user_activity_summary", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  billsViewed: integer("bills_viewed").default(0),
  billsTracked: integer("bills_tracked").default(0),
  commentsPosted: integer("comments_posted").default(0),
  commentsUpvoted: integer("comments_upvoted").default(0),
  commentsDownvoted: integer("comments_downvoted").default(0),
  searchesPerformed: integer("searches_performed").default(0),
  sessionDurationMinutes: integer("session_duration_minutes").default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index("user_activity_summary_user_date_idx").on(table.userId, table.date),
  dateIdx: index("user_activity_summary_date_idx").on(table.date),
  engagementDateIdx: index("user_activity_summary_engagement_date_idx").on(table.engagementScore, table.date),
  uniqueUserDate: unique("user_activity_summary_user_date_key").on(table.userId, table.date),
  countsCheck: check("user_activity_summary_counts_check", sql`${table.billsViewed} >= 0 AND ${table.commentsPosted} >= 0 AND ${table.sessionDurationMinutes} >= 0`),
}));

export const billAnalyticsSummary = pgTable("bill_analytics_summary", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  views: integer("views").default(0),
  uniqueViewers: integer("unique_viewers").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  trackingUsers: integer("tracking_users").default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).default("0"),
  sentimentPositive: integer("sentiment_positive").default(0),
  sentimentNegative: integer("sentiment_negative").default(0),
  sentimentNeutral: integer("sentiment_neutral").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  billDateIdx: index("bill_analytics_summary_bill_date_idx").on(table.billId, table.date),
  engagementDateIdx: index("bill_analytics_summary_engagement_date_idx").on(table.engagementScore, table.date),
  viewsDateIdx: index("bill_analytics_summary_views_date_idx").on(table.views, table.date),
  uniqueBillDate: unique("bill_analytics_summary_bill_date_key").on(table.billId, table.date),
  countsCheck: check("bill_analytics_summary_counts_check", sql`${table.views} >= 0 AND ${table.comments} >= 0 AND ${table.shares} >= 0 AND ${table.sentimentPositive} >= 0 AND ${table.sentimentNegative} >= 0 AND ${table.sentimentNeutral} >= 0`),
}));

export const systemHealthMetric = pgTable("system_health_metric", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricValue: numeric("metric_value").notNull(),
  metricUnit: text("metric_unit"),
  metricCategory: text("metric_category").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  metadata: jsonb("metadata").default({}),
}, (table) => ({
  categoryTimeIdx: index("system_health_metric_category_time_idx").on(table.metricCategory, table.recordedAt),
  nameTimeIdx: index("system_health_metric_name_time_idx").on(table.metricName, table.recordedAt),
  recordedAtIdx: index("system_health_metric_recorded_at_idx").on(table.recordedAt),
}));

// ============================================================================
// DASHBOARD SUPPORT TABLES
// ============================================================================

export const department = pgTable("department", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  isActiveIdx: index("department_is_active_idx").on(table.isActive),
}));

export const evaluation = pgTable("evaluation", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull(),
  departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
  status: moderationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  departmentIdIdx: index("evaluation_department_id_idx").on(table.departmentId),
  statusIdx: index("evaluation_status_idx").on(table.status),
  departmentStatusIdx: index("evaluation_department_status_idx").on(table.departmentId, table.status),
}));

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, { fields: [user.id], references: [userProfile.userId] }),
  sessions: many(session),
  comments: many(billComment),
  engagements: many(billEngagement),
  notifications: many(notification),
  interests: many(userInterest),
  progress: many(userProgress),
  socialProfiles: many(userSocialProfile),
  commentVotes: many(commentVote),
  socialShares: many(socialShare),
  activitySummaries: many(userActivitySummary),
  verifications: many(verification),
  moderationFlags: many(moderationFlag, { relationName: "reporter" }),
  moderationActions: many(moderationAction, { relationName: "moderator" }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one, many }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
  refreshTokens: many(refreshToken),
}));

export const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
  session: one(session, { fields: [refreshToken.sessionId], references: [session.id] }),
}));

export const billRelations = relations(bill, ({ one, many }) => ({
  sponsor: one(sponsor, { fields: [bill.sponsorId], references: [sponsor.id] }),
  comments: many(billComment),
  engagements: many(billEngagement),
  analyses: many(analysis),
  sponsorships: many(billSponsorship),
  tags: many(billTag),
  sectionConflicts: many(billSectionConflict),
  verifications: many(verification),
  socialShares: many(socialShare),
  notifications: many(notification),
  analyticsSummaries: many(billAnalyticsSummary),
}));

export const sponsorRelations = relations(sponsor, ({ many }) => ({
  bills: many(bill),
  sponsorships: many(billSponsorship),
  affiliations: many(sponsorAffiliation),
  transparencies: many(sponsorTransparency),
  regulations: many(regulation),
}));

export const billCommentRelations = relations(billComment, ({ one, many }) => ({
  bill: one(bill, { fields: [billComment.billId], references: [bill.id] }),
  author: one(user, { fields: [billComment.userId], references: [user.id] }),
  parent: one(billComment, { fields: [billComment.parentCommentId], references: [billComment.id], relationName: "replies" }),
  replies: many(billComment, { relationName: "replies" }),
  votes: many(commentVote),
}));

export const commentVoteRelations = relations(commentVote, ({ one }) => ({
  comment: one(billComment, { fields: [commentVote.commentId], references: [billComment.id] }),
  user: one(user, { fields: [commentVote.userId], references: [user.id] }),
}));

export const billEngagementRelations = relations(billEngagement, ({ one }) => ({
  bill: one(bill, { fields: [billEngagement.billId], references: [bill.id] }),
  user: one(user, { fields: [billEngagement.userId], references: [user.id] }),
}));

export const analysisRelations = relations(analysis, ({ one }) => ({
  bill: one(bill, { fields: [analysis.billId], references: [bill.id] }),
  approver: one(user, { fields: [analysis.approvedBy], references: [user.id] }),
}));

export const verificationRelations = relations(verification, ({ one }) => ({
  bill: one(bill, { fields: [verification.billId], references: [bill.id] }),
  user: one(user, { fields: [verification.userId], references: [user.id] }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
  relatedBill: one(bill, { fields: [notification.relatedBillId], references: [bill.id] }),
}));

export const regulationRelations = relations(regulation, ({ one, many }) => ({
  sponsor: one(sponsor, { fields: [regulation.sponsorId], references: [sponsor.id] }),
  changes: many(regulatoryChange),
  impacts: many(regulatoryImpact),
}));

export const syncJobRelations = relations(syncJob, ({ many }) => ({
  errors: many(syncError),
}));

export const conflictRelations = relations(conflict, ({ many, one }) => ({
  sources: many(conflictSource),
  resolver: one(user, { fields: [conflict.resolvedBy], references: [user.id] }),
}));

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  department: one(department, { fields: [evaluation.departmentId], references: [department.id] }),
}));

export const departmentRelations = relations(department, ({ many }) => ({
  evaluations: many(evaluation),
}));

export const billTagRelations = relations(billTag, ({ one }) => ({
  bill: one(bill, { fields: [billTag.billId], references: [bill.id] }),
}));

export const billSponsorshipRelations = relations(billSponsorship, ({ one }) => ({
  bill: one(bill, { fields: [billSponsorship.billId], references: [bill.id] }),
  sponsor: one(sponsor, { fields: [billSponsorship.sponsorId], references: [sponsor.id] }),
}));

export const socialShareRelations = relations(socialShare, ({ one }) => ({
  bill: one(bill, { fields: [socialShare.billId], references: [bill.id] }),
  user: one(user, { fields: [socialShare.userId], references: [user.id] }),
}));

export const sponsorAffiliationRelations = relations(sponsorAffiliation, ({ one }) => ({
  sponsor: one(sponsor, { fields: [sponsorAffiliation.sponsorId], references: [sponsor.id] }),
}));

export const sponsorTransparencyRelations = relations(sponsorTransparency, ({ one }) => ({
  sponsor: one(sponsor, { fields: [sponsorTransparency.sponsorId], references: [sponsor.id] }),
}));

export const billAnalyticsSummaryRelations = relations(billAnalyticsSummary, ({ one }) => ({
  bill: one(bill, { fields: [billAnalyticsSummary.billId], references: [bill.id] }),
}));

export const userActivitySummaryRelations = relations(userActivitySummary, ({ one }) => ({
  user: one(user, { fields: [userActivitySummary.userId], references: [user.id] }),
}));

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Select Schemas
export const selectUserSchema = createSelectSchema(user);
export const selectUserProfileSchema = createSelectSchema(userProfile);
export const selectBillSchema = createSelectSchema(bill);
export const selectSponsorSchema = createSelectSchema(sponsor);
export const selectAnalysisSchema = createSelectSchema(analysis);
export const selectStakeholderSchema = createSelectSchema(stakeholder);
export const selectNotificationSchema = createSelectSchema(notification);
export const selectComplianceCheckSchema = createSelectSchema(complianceCheck);
export const selectSocialShareSchema = createSelectSchema(socialShare);
export const selectVerificationSchema = createSelectSchema(verification);

// Insert Schemas
export const insertUserSchema = createInsertSchema(user, {
  email: (schema) => schema.email.email("Invalid email format"),
  passwordHash: (schema) => schema.passwordHash.min(60, "Password hash must be at least 60 characters"),
  name: (schema) => schema.name.min(1, "Name is required"),
});

export const insertUserProfileSchema = createInsertSchema(userProfile, {
  bio: (schema) => schema.bio.max(1000, "Bio must be 1000 characters or less"),
  location: (schema) => schema.location.max(255, "Location must be 255 characters or less"),
  organization: (schema) => schema.organization.max(255, "Organization must be 255 characters or less"),
});

export const insertUserProgressSchema = createInsertSchema(userProgress);

export const insertBillSchema = createInsertSchema(bill, {
  title: (schema) => schema.title.min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  summary: (schema) => schema.summary.max(2000, "Summary must be 2000 characters or less"),
  complexityScore: (schema) => schema.complexityScore.min(1).max(10),
});

export const insertBillCommentSchema = createInsertSchema(billComment, {
  content: (schema) => schema.content.min(1, "Content is required").max(5000, "Content must be 5000 characters or less"),
});

export const insertSponsorSchema = createInsertSchema(sponsor, {
  name: (schema) => schema.name.min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  role: (schema) => schema.role.min(1, "Role is required").max(100, "Role must be 100 characters or less"),
  email: (schema) => schema.email.email("Invalid email format"),
});

export const insertAnalysisSchema = createInsertSchema(analysis);
export const insertStakeholderSchema = createInsertSchema(stakeholder);
export const insertNotificationSchema = createInsertSchema(notification);
export const insertComplianceCheckSchema = createInsertSchema(complianceCheck);
export const insertSocialShareSchema = createInsertSchema(socialShare);
export const insertVerificationSchema = createInsertSchema(verification);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

// Select Types
export type User = z.infer<typeof selectUserSchema>;
export type UserProfile = z.infer<typeof selectUserProfileSchema>;
export type Session = typeof session.$inferSelect;
export type RefreshToken = typeof refreshToken.$inferSelect;
export type PasswordReset = typeof passwordReset.$inferSelect;
export type UserSocialProfile = typeof userSocialProfile.$inferSelect;
export type UserInterest = typeof userInterest.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;

export type Bill = z.infer<typeof selectBillSchema>;
export type BillTag = typeof billTag.$inferSelect;
export type BillSponsorship = typeof billSponsorship.$inferSelect;
export type BillComment = typeof billComment.$inferSelect;
export type CommentVote = typeof commentVote.$inferSelect;
export type BillEngagement = typeof billEngagement.$inferSelect;
export type SocialShare = z.infer<typeof selectSocialShareSchema>;

export type Sponsor = z.infer<typeof selectSponsorSchema>;
export type SponsorAffiliation = typeof sponsorAffiliation.$inferSelect;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;

export type Analysis = z.infer<typeof selectAnalysisSchema>;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type BillSectionConflict = typeof billSectionConflict.$inferSelect;
export type Verification = z.infer<typeof selectVerificationSchema>;

export type Stakeholder = z.infer<typeof selectStakeholderSchema>;

export type ModerationFlag = typeof moderationFlag.$inferSelect;
export type ModerationAction = typeof moderationAction.$inferSelect;
export type ModerationQueue = typeof moderationQueue.$inferSelect;
export type ContentFlag = typeof contentFlag.$inferSelect;

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type ComplianceCheck = z.infer<typeof selectComplianceCheckSchema>;
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

export type Notification = z.infer<typeof selectNotificationSchema>;

export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type AnalyticsDailySummary = typeof analyticsDailySummary.$inferSelect;
export type UserActivitySummary = typeof userActivitySummary.$inferSelect;
export type BillAnalyticsSummary = typeof billAnalyticsSummary.$inferSelect;
export type SystemHealthMetric = typeof systemHealthMetric.$inferSelect;

export type Department = typeof department.$inferSelect;
export type Evaluation = typeof evaluation.$inferSelect;

// Insert Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertBillComment = z.infer<typeof insertBillCommentSchema>;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type InsertStakeholder = z.infer<typeof insertStakeholderSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;
export type InsertSocialShare = z.infer<typeof insertSocialShareSchema>;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

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