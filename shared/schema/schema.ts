import {
  pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, check, inet, date, unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  userRoleEnum, verificationStatusEnum, billStatusEnum, commentTypeEnum, voteTypeEnum, sponsorshipTypeEnum,
  analysisTypeEnum, conflictTypeEnum, severityEnum, stakeholderTypeEnum, affiliationTypeEnum, affiliationConflictTypeEnum,
  disclosureTypeEnum, moderationContentTypeEnum, flagTypeEnum, /* moderationStatusEnum (REMOVED) */
  reportStatusEnum, incidentStatusEnum, complianceStatusEnum, evaluationStatusEnum, // <-- REFINED
  moderationActionTypeEnum, securityResultEnum, complianceCheckTypeEnum, threatTypeEnum, threatSourceEnum,
  regulationStatusEnum, syncStatusEnum, syncErrorLevelEnum, conflictResolutionEnum, notificationTypeEnum,
  attackPatternTypeEnum, securityAlertStatusEnum, verificationTypeEnum
} from "./enum";

// ============================================================================
// CORE USER TABLES
// ============================================================================

export const user = pgTable("user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(), // <-- REFINED
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
  avatarUrl: text("avatar_url"), // <-- ADDED
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
  expertiseIdx: index("user_profile_expertise_idx").using("gin", table.expertise), // <-- ADDED GIN INDEX
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
  email: varchar("email", { length: 320 }), // <-- REFINED
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
  // tags: text("tags").array().default([]), // <-- REMOVED (Redundant, use billTag table)
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCountCached: integer("comment_count_cached").notNull().default(0), // <-- REFINED (renamed)
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"),
  complexityScore: integer("complexity_score"),
  constitutionalConcerns: jsonb("constitutional_concerns").default([]),
  stakeholderAnalysis: jsonb("stakeholder_analysis").default({}),
  introducedDate: timestamp("introduced_date", { withTimezone: true }),
  lastActionDate: timestamp("last_action_date", { withTimezone: true }),
  // search_vector is stored in Postgres as tsvector (see SQL migrations).
  searchVector: text("search_vector"),
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
  viewCountIdx: index("bill_view_count_idx").on(table.viewCount),
  searchVectorIdx: index("bill_search_vector_idx").using("gin", table.searchVector),
  complexityCheck: check("bill_complexity_check", sql`${table.complexityScore} IS NULL OR (${table.complexityScore} >= 1 AND ${table.complexityScore} <= 10)`),
  countsCheck: check("bill_counts_check", sql`${table.viewCount} >= 0 AND ${table.shareCount} >= 0 AND ${table.commentCountCached} >= 0`),
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
  metadata: jsonb("metadata").default({}),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`), // <-- REFINED (was varchar)
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

// --- REFINED: Merged contentFlag and moderationFlag, and removed moderationQueue ---

// export const moderationFlag = pgTable("moderation_flag", { ... }); // <-- REMOVED
// export const moderationQueue = pgTable("moderation_queue", { ... }); // <-- REMOVED

export const contentReport = pgTable("content_report", { // <-- REFINED (was content_flag)
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  reportedBy: uuid("reported_by").notNull().references(() => user.id, { onDelete: "cascade" }), // <-- REFINED (was flaggerUserId)
  reportType: flagTypeEnum("report_type").notNull(), // <-- REFINED (was flagCategory)
  reason: text("reason").notNull(), // <-- REFINED (was flagReason)
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(), // <-- REFINED (using new enum)
  severity: severityEnum("severity").notNull().default("medium"), // <-- ADDED (from moderationFlag)
  autoDetected: boolean("auto_detected").notNull().default(false), // <-- ADDED (from moderationFlag)
  reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"), // <-- ADDED (from moderationFlag.resolution)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // <-- ADDED
}, (table) => ({
  contentIdx: index("content_report_content_idx").on(table.contentType, table.contentId),
  reportedByIdx: index("content_report_reporter_idx").on(table.reportedBy),
  statusIdx: index("content_report_status_idx").on(table.status, table.createdAt),
  categoryIdx: index("content_report_category_idx").on(table.reportType, table.createdAt),
  reviewedByIdx: index("content_report_reviewed_by_idx").on(table.reviewedBy),
  // This new index allows this table to function as a moderation queue:
  statusSeverityIdx: index("content_report_status_severity_idx").on(table.status, table.severity, table.createdAt), // <-- ADDED
}));

export const moderationAction = pgTable("moderation_action", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  actionType: moderationActionTypeEnum("action_type").notNull(),
  reason: text("reason").notNull(),
  moderatorId: uuid("moderator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  reportId: integer("report_id").references(() => contentReport.id, { onDelete: "set null" }), // <-- ADDED
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
  reportIdIdx: index("moderation_action_report_id_idx").on(table.reportId), // <-- ADDED
}));

// --- End of Moderation Refinement ---

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
  status: complianceStatusEnum("status").notNull().default("pending"), // <-- REFINED (using new enum)
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
  status: incidentStatusEnum("status").notNull().default("open"), // <-- REFINED (using new enum)
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
  eventDataIdx: index("analytics_event_data_idx").using("gin", table.eventData), // <-- ADDED GIN INDEX
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
  status: evaluationStatusEnum("status").notNull().default("pending"), // <-- REFINED (using new enum)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  departmentIdIdx: index("evaluation_department_id_idx").on(table.departmentId),
  statusIdx: index("evaluation_status_idx").on(table.status),
  departmentStatusIdx: index("evaluation_department_status_idx").on(table.departmentId, table.status),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Inferred types from tables
export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;
export type UserProfile = typeof userProfile.$inferSelect;
export type InsertUserProfile = typeof userProfile.$inferInsert;
export type Session = typeof session.$inferSelect;
export type InsertSession = typeof session.$inferInsert;
export type RefreshToken = typeof refreshToken.$inferSelect;
export type InsertRefreshToken = typeof refreshToken.$inferInsert;
export type PasswordReset = typeof passwordReset.$inferSelect;
export type InsertPasswordReset = typeof passwordReset.$inferInsert;
export type UserSocialProfile = typeof userSocialProfile.$inferSelect;
export type InsertUserSocialProfile = typeof userSocialProfile.$inferInsert;
export type UserInterest = typeof userInterest.$inferSelect;
export type InsertUserInterest = typeof userInterest.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

export type Sponsor = typeof sponsor.$inferSelect;
export type InsertSponsor = typeof sponsor.$inferInsert;
export type Bill = typeof bill.$inferSelect;
export type InsertBill = typeof bill.$inferInsert;
export type BillTag = typeof billTag.$inferSelect;
export type InsertBillTag = typeof billTag.$inferInsert;
export type BillSponsorship = typeof billSponsorship.$inferSelect;
export type InsertBillSponsorship = typeof billSponsorship.$inferInsert;
export type BillComment = typeof billComment.$inferSelect;
export type InsertBillComment = typeof billComment.$inferInsert;
export type CommentVote = typeof commentVote.$inferSelect;
export type InsertCommentVote = typeof commentVote.$inferInsert;
export type BillEngagement = typeof billEngagement.$inferSelect;
export type InsertBillEngagement = typeof billEngagement.$inferInsert;
export type SocialShare = typeof socialShare.$inferSelect;
export type InsertSocialShare = typeof socialShare.$inferInsert;

export type Analysis = typeof analysis.$inferSelect;
export type InsertAnalysis = typeof analysis.$inferInsert;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type InsertContentAnalysis = typeof contentAnalysis.$inferInsert;
export type BillSectionConflict = typeof billSectionConflict.$inferSelect;
export type InsertBillSectionConflict = typeof billSectionConflict.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type InsertVerification = typeof verification.$inferInsert;

export type Stakeholder = typeof stakeholder.$inferSelect;
export type InsertStakeholder = typeof stakeholder.$inferInsert;
export type SponsorAffiliation = typeof sponsorAffiliation.$inferSelect;
export type InsertSponsorAffiliation = typeof sponsorAffiliation.$inferInsert;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;
export type InsertSponsorTransparency = typeof sponsorTransparency.$inferInsert;

// --- REFINED: Moderation types ---
// export type ModerationFlag = typeof moderationFlag.$inferSelect; // <-- REMOVED
// export type InsertModerationFlag = typeof moderationFlag.$inferInsert; // <-- REMOVED
export type ModerationAction = typeof moderationAction.$inferSelect;
export type InsertModerationAction = typeof moderationAction.$inferInsert;
// export type ModerationQueue = typeof moderationQueue.$inferSelect; // <-- REMOVED
// export type InsertModerationQueue = typeof moderationQueue.$inferInsert; // <-- REMOVED
export type ContentReport = typeof contentReport.$inferSelect; // <-- REFINED (was ContentFlag)
export type InsertContentReport = typeof contentReport.$inferInsert; // <-- REFINED (was InsertContentFlag)
// --- End Refinement ---

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type InsertSecurityAuditLog = typeof securityAuditLog.$inferInsert;
export type ComplianceCheck = typeof complianceCheck.$inferSelect;
export type InsertComplianceCheck = typeof complianceCheck.$inferInsert;
export type ThreatIntelligence = typeof threatIntelligence.$inferSelect;
export type InsertThreatIntelligence = typeof threatIntelligence.$inferInsert;
export type SecurityIncident = typeof securityIncident.$inferSelect;
export type InsertSecurityIncident = typeof securityIncident.$inferInsert;
export type SecurityAlert = typeof securityAlert.$inferSelect;
export type InsertSecurityAlert = typeof securityAlert.$inferInsert;
export type AttackPattern = typeof attackPattern.$inferSelect;
export type InsertAttackPattern = typeof attackPattern.$inferInsert;

export type Regulation = typeof regulation.$inferSelect;
export type InsertRegulation = typeof regulation.$inferInsert;
export type RegulatoryChange = typeof regulatoryChange.$inferSelect;
export type InsertRegulatoryChange = typeof regulatoryChange.$inferInsert;
export type RegulatoryImpact = typeof regulatoryImpact.$inferSelect;
export type InsertRegulatoryImpact = typeof regulatoryImpact.$inferInsert;

export type SyncJob = typeof syncJob.$inferSelect;
export type InsertSyncJob = typeof syncJob.$inferInsert;
export type SyncError = typeof syncError.$inferSelect;
export type InsertSyncError = typeof syncError.$inferInsert;
export type Conflict = typeof conflict.$inferSelect;
export type InsertConflict = typeof conflict.$inferInsert;
export type ConflictSource = typeof conflictSource.$inferSelect;
export type InsertConflictSource = typeof conflictSource.$inferInsert;

export type Notification = typeof notification.$inferSelect;
export type InsertNotification = typeof notification.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvent.$inferInsert;
export type AnalyticsDailySummary = typeof analyticsDailySummary.$inferSelect;
export type InsertAnalyticsDailySummary = typeof analyticsDailySummary.$inferInsert;
export type UserActivitySummary = typeof userActivitySummary.$inferSelect;
export type InsertUserActivitySummary = typeof userActivitySummary.$inferInsert;
export type BillAnalyticsSummary = typeof billAnalyticsSummary.$inferSelect;
export type InsertBillAnalyticsSummary = typeof billAnalyticsSummary.$inferInsert;
export type SystemHealthMetric = typeof systemHealthMetric.$inferSelect;
export type InsertSystemHealthMetric = typeof systemHealthMetric.$inferInsert;

export type Department = typeof department.$inferSelect;
export type InsertDepartment = typeof department.$inferInsert;
export type Evaluation = typeof evaluation.$inferSelect;
export type InsertEvaluation = typeof evaluation.$inferInsert;

// ============================================================================
// PLURAL NAMING CONVENTIONS (for compatibility)
// ============================================================================

// Table exports with plural names
export const users = user;
export const userProfiles = userProfile;
export const sessions = session;
export const refreshTokens = refreshToken;
export const passwordResets = passwordReset;
export const userSocialProfiles = userSocialProfile;
export const userInterests = userInterest;
export const userProgresses = userProgress;

export const sponsors = sponsor;
export const bills = bill;
export const billTags = billTag;
export const billSponsorships = billSponsorship;
export const billComments = billComment;
export const commentVotes = commentVote;
export const billEngagements = billEngagement;
export const socialShares = socialShare;

export const analyses = analysis;
export const contentAnalyses = contentAnalysis;
export const billSectionConflicts = billSectionConflict;
export const verifications = verification;

export const stakeholders = stakeholder;
export const sponsorAffiliations = sponsorAffiliation;
export const sponsorTransparencies = sponsorTransparency;

// --- REFINED: Moderation plural exports ---
// export const moderationFlags = moderationFlag; // <-- REMOVED
export const moderationActions = moderationAction;
// export const moderationQueues = moderationQueue; // <-- REMOVED
export const contentReports = contentReport; // <-- REFINED (was contentFlags)
// --- End Refinement ---

export const securityAuditLogs = securityAuditLog;
export const complianceChecks = complianceCheck;
export const threatIntelligences = threatIntelligence;
export const securityIncidents = securityIncident;
export const securityAlerts = securityAlert;
export const attackPatterns = attackPattern;

export const regulations = regulation;
export const regulatoryChanges = regulatoryChange;
export const regulatoryImpacts = regulatoryImpact;

export const syncJobs = syncJob;
export const syncErrors = syncError;
export const conflicts = conflict;
export const conflictSources = conflictSource;

export const notifications = notification;

export const analyticsEvents = analyticsEvent;
export const analyticsDailySummaries = analyticsDailySummary;
export const userActivitySummaries = userActivitySummary;
export const billAnalyticsSummaries = billAnalyticsSummary;
export const systemHealthMetrics = systemHealthMetric;

export const departments = department;
export const evaluations = evaluation;

// ============================================================================
// CLIENT-SIDE TYPES (for dashboard components)
// ============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  category: string;
  recordedAt: string;
  metadata?: Record<string, any>;
}

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// VALIDATION SERVICE (for compatibility)
// ============================================================================

export const schemaValidationService = {
  validateUser: (data: any): boolean => {
    // Basic validation - can be enhanced
    return data && typeof data.email === 'string' && typeof data.name === 'string';
  },
  validateBill: (data: any): boolean => {
    return data && typeof data.title === 'string';
  },
  validateSponsor: (data: any): boolean => {
    return data && typeof data.name === 'string';
  }
};