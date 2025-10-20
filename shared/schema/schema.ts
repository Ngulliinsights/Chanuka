import {
  pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar,
  index, uniqueIndex, check, inet, date, unique, pgEnum // Ensure pgEnum is imported
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
// Assuming enums are correctly defined in ./enum and exported
import {
  userRoleEnum, verificationStatusEnum, billStatusEnum, commentTypeEnum, voteTypeEnum, sponsorshipTypeEnum,
  analysisTypeEnum, conflictTypeEnum, severityEnum, stakeholderTypeEnum, affiliationTypeEnum, affiliationConflictTypeEnum,
  disclosureTypeEnum, moderationContentTypeEnum, flagTypeEnum,
  reportStatusEnum, incidentStatusEnum, complianceStatusEnum, evaluationStatusEnum, // Refined enums
  moderationActionTypeEnum, securityResultEnum, complianceCheckTypeEnum, threatTypeEnum, threatSourceEnum,
  regulationStatusEnum, syncStatusEnum, syncErrorLevelEnum, conflictResolutionEnum, notificationTypeEnum,
  attackPatternTypeEnum, securityAlertStatusEnum, verificationTypeEnum
} from "./enum"; // Ensure path is correct

// ============================================================================
// CORE USER TABLES
// ============================================================================

export const user = pgTable("user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("citizen"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  preferences: jsonb("preferences").default({}), // Stores GLOBAL preferences
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
  avatarUrl: text("avatar_url"),
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
  expertiseIdx: index("user_profile_expertise_idx").using("gin", table.expertise),
  reputationCheck: check("user_profile_reputation_check", sql`${table.reputationScore} >= 0`),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token"), // Consider removing if using secure session IDs only
  refreshTokenHash: text("refresh_token_hash"), // Store hash, not the token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true), // For explicit logout/revocation
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("session_user_id_idx").on(table.userId),
  activeExpiresIdx: index("session_active_expires_idx").on(table.isActive, table.expiresAt),
}));

export const refreshToken = pgTable("refresh_token", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(), // Hash of the refresh token
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
  tokenHash: text("token_hash").notNull().unique(), // Hash of the reset token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("password_reset_user_id_idx").on(table.userId),
  validTokensIdx: index("password_reset_valid_tokens_idx").on(table.expiresAt, table.isUsed), // Index for finding valid tokens
}));

export const userSocialProfile = pgTable("user_social_profile", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g., 'google', 'github'
  providerId: text("provider_id").notNull(), // ID from the provider
  username: text("username"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Store tokens securely (encrypted or hashed depending on use case)
  accessToken: text("access_token"), // Potentially encrypted
  refreshToken: text("refresh_token"), // Potentially encrypted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userProviderUnique: uniqueIndex("user_social_profile_user_provider_idx").on(table.userId, table.provider),
  providerIdIdx: index("user_social_profile_provider_id_idx").on(table.provider, table.providerId),
}));

export const userInterest = pgTable("user_interest", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  interest: text("interest").notNull(), // e.g., 'healthcare', 'technology'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userInterestUnique: uniqueIndex("user_interest_user_interest_idx").on(table.userId, table.interest),
  interestIdx: index("user_interest_interest_idx").on(table.interest), // Index interests for finding users with similar interests
}));

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(), // e.g., 'comments_posted', 'bills_tracked'
  achievementValue: integer("achievement_value").notNull().default(0),
  level: integer("level").default(1),
  badge: text("badge"), // URL or identifier for awarded badge
  description: text("description").notNull(), // Description of the achievement/level
  recommendation: text("recommendation"), // Suggestion for next steps
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
  role: text("role").notNull(), // e.g., 'Senator', 'Representative'
  party: text("party"),
  constituency: text("constituency"),
  email: varchar("email", { length: 320 }),
  phone: text("phone"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  conflictLevel: severityEnum("conflict_level").default('low'), // Default level
  financialExposure: numeric("financial_exposure", { precision: 12, scale: 2 }).default("0"),
  votingAlignment: numeric("voting_alignment", { precision: 5, scale: 2 }).default("0"), // e.g., 0-100 score
  transparencyScore: numeric("transparency_score", { precision: 5, scale: 2 }).default("0"), // e.g., 0-100 score
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("sponsor_name_idx").on(table.name),
  partyIdx: index("sponsor_party_idx").on(table.party),
  activeIdx: index("sponsor_active_idx").on(table.isActive),
}));

export const bill = pgTable("bill", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"), // Longer official description
  content: text("content"), // Full bill text
  summary: text("summary"), // Shorter, human-readable summary
  status: billStatusEnum("status").notNull().default("introduced"),
  billNumber: text("bill_number").unique(), // Official number (e.g., HR-123)
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }), // Primary sponsor
  category: text("category"), // e.g., 'Healthcare', 'Environment'
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCountCached: integer("comment_count_cached").notNull().default(0), // Denormalized count, updated by triggers/service
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"), // Calculated score
  complexityScore: integer("complexity_score"), // 1-10 score based on analysis
  constitutionalConcerns: jsonb("constitutional_concerns").default([]), // Store array of concern objects
  stakeholderAnalysis: jsonb("stakeholder_analysis").default({}), // Store analysis results
  introducedDate: timestamp("introduced_date", { withTimezone: true }),
  lastActionDate: timestamp("last_action_date", { withTimezone: true }),
  searchVector: text("search_vector"), // Populated by trigger (tsvector in PG)
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

// Many-to-many relationship for bill tags
export const billTag = pgTable("bill_tag", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(), // The actual tag text (e.g., 'privacy')
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billTagUnique: uniqueIndex("bill_tag_bill_tag_idx").on(table.billId, table.tag),
  tagIdx: index("bill_tag_tag_idx").on(table.tag), // Index tags for finding bills by tag
  billIdIdx: index("bill_tag_bill_id_idx").on(table.billId),
}));

// Track multiple sponsors per bill
export const billSponsorship = pgTable("bill_sponsorship", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  sponsorshipType: sponsorshipTypeEnum("sponsorship_type").notNull(), // primary vs co-sponsor
  sponsorshipDate: timestamp("sponsorship_date", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true), // For tracking withdrawn sponsorships
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billSponsorUnique: uniqueIndex("bill_sponsorship_bill_sponsor_idx").on(table.billId, table.sponsorId), // Sponsor can only sponsor a bill once
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
  isVerified: boolean("is_verified").notNull().default(false), // e.g., verified expert comment
  parentCommentId: integer("parent_comment_id").references(() => billComment.id, { onDelete: "cascade" }), // For threading
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false), // Soft delete
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_comment_bill_id_idx").on(table.billId),
  userIdIdx: index("bill_comment_user_id_idx").on(table.userId),
  parentCommentIdIdx: index("bill_comment_parent_comment_id_idx").on(table.parentCommentId), // Index for fetching replies
  createdAtIdx: index("bill_comment_created_at_idx").on(table.createdAt), // For sorting by recent
  billCreatedIdx: index("bill_comment_bill_created_idx").on(table.billId, table.createdAt), // Compound index
  verifiedIdx: index("bill_comment_verified_idx").on(table.isVerified, table.billId),
  votesCheck: check("bill_comment_votes_check", sql`${table.upvotes} >= 0 AND ${table.downvotes} >= 0`),
}));

// Track individual user votes on comments
export const commentVote = pgTable("comment_vote", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => billComment.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  voteType: voteTypeEnum("vote_type").notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), // For tracking vote changes
}, (table) => ({
  commentUserUnique: uniqueIndex("comment_vote_comment_user_idx").on(table.commentId, table.userId), // User can only vote once per comment
  commentIdIdx: index("comment_vote_comment_id_idx").on(table.commentId),
  userIdIdx: index("comment_vote_user_id_idx").on(table.userId),
}));

// Tracks engagement metrics per user per bill (basis for tracking)
export const billEngagement = pgTable("bill_engagement", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  viewCount: integer("view_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0), // Comments by this user on this bill
  shareCount: integer("share_count").notNull().default(0), // Shares by this user of this bill
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"), // Calculated score for this user/bill pair
  lastEngagedAt: timestamp("last_engaged_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), // When tracking started / first engagement
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billUserUnique: uniqueIndex("bill_engagement_bill_user_idx").on(table.billId, table.userId),
  userIdIdx: index("bill_engagement_user_id_idx").on(table.userId),
  engagementScoreIdx: index("bill_engagement_score_idx").on(table.engagementScore),
  lastEngagedIdx: index("bill_engagement_last_engaged_idx").on(table.lastEngagedAt),
  userEngagedIdx: index("bill_engagement_user_engaged_idx").on(table.userId, table.lastEngagedAt),
  countsCheck: check("bill_engagement_counts_check", sql`${table.viewCount} >= 0 AND ${table.commentCount} >= 0 AND ${table.shareCount} >= 0`),
}));

// *** ADDED: userBillTrackingPreference table ***
export const userBillTrackingPreference = pgTable("user_bill_tracking_preference", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  trackingTypes: text("tracking_types").array().notNull().default(sql`ARRAY['status_changes', 'new_comments']::text[]`),
  alertFrequency: text("alert_frequency").notNull().default('immediate'),
  alertChannels: text("alert_channels").array().notNull().default(sql`ARRAY['in_app', 'email']::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userBillUnique: unique("user_bill_preference_unique").on(table.userId, table.billId),
  userIdIdx: index("user_bill_preference_user_id_idx").on(table.userId),
  billIdIdx: index("user_bill_preference_bill_id_idx").on(table.billId),
  activeIdx: index("user_bill_preference_active_idx").on(table.isActive),
}));
// *** END ADDED TABLE ***

// Tracks social media shares originating from the platform
export const socialShare = pgTable("social_share", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // e.g., 'twitter', 'facebook'
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }), // User who initiated share
  metadata: jsonb("metadata").default({}), // e.g., shared URL, campaign ID
  sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
  // Optional: Track external engagement if API allows (likes, shares on the platform)
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
  analysisType: analysisTypeEnum("analysis_type").notNull(), // Type of analysis performed
  results: jsonb("results").default({}), // Structured results of the analysis
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"), // Confidence score (0-1)
  modelVersion: text("model_version"), // Version of the model/logic used
  metadata: jsonb("metadata").default({}), // Additional context
  isApproved: boolean("is_approved").notNull().default(false), // Has analysis been reviewed/approved?
  approvedBy: uuid("approved_by").references(() => user.id, { onDelete: "set null" }), // User who approved
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

// Automated content analysis scores (toxicity, spam, etc.)
export const contentAnalysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(), // 'comment', 'bill', etc.
  contentId: integer("content_id").notNull(), // ID of the content item
  toxicityScore: numeric("toxicity_score", { precision: 5, scale: 4 }).notNull().default("0"),
  spamScore: numeric("spam_score", { precision: 5, scale: 4 }).notNull().default("0"),
  sentimentScore: numeric("sentiment_score", { precision: 5, scale: 4 }).notNull().default("0.5"), // 0=neg, 1=pos
  readabilityScore: numeric("readability_score", { precision: 5, scale: 4 }).notNull().default("0.5"), // 0=hard, 1=easy
  flags: text("flags").array().default([]), // Specific flags raised (e.g., 'hate_speech', 'pii')
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.8"), // Confidence in scores
  modelVersion: text("model_version").notNull().default("1.0"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  contentUnique: uniqueIndex("content_analysis_content_idx").on(table.contentType, table.contentId),
  toxicityIdx: index("content_analysis_toxicity_idx").on(table.toxicityScore), // Index high scores for review
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

// Conflicts identified within specific bill sections
export const billSectionConflict = pgTable("bill_section_conflict", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  sectionNumber: text("section_number").notNull(), // Identifier for the section (e.g., 'Sec. 101(a)')
  conflictType: conflictTypeEnum("conflict_type").notNull(),
  severity: severityEnum("severity").notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation"), // Suggested resolution
  isResolved: boolean("is_resolved").notNull().default(false),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_section_conflict_bill_id_idx").on(table.billId),
  severityIdx: index("bill_section_conflict_severity_idx").on(table.severity),
  isResolvedIdx: index("bill_section_conflict_is_resolved_idx").on(table.isResolved),
  billResolvedIdx: index("bill_section_conflict_bill_resolved_idx").on(table.billId, table.isResolved), // Index unresolved conflicts
}));

// User-submitted verifications/analyses of bills
export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  userRole: userRoleEnum("user_role").notNull(), // Role of user at time of verification
  verificationType: verificationTypeEnum("verification_type").notNull(), // What aspect was verified
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0"), // User's confidence
  evidence: jsonb("evidence").default([]), // Links, citations, documents
  expertise: jsonb("expertise").default({}), // Relevant expertise claimed
  reasoning: text("reasoning"), // Justification for the verification status
  feedback: text("feedback"), // Community feedback on this verification
  endorsements: integer("endorsements").notNull().default(0), // Count of endorsements from others
  disputes: integer("disputes").notNull().default(0), // Count of disputes
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("verification_bill_id_idx").on(table.billId),
  userIdIdx: index("verification_user_id_idx").on(table.userId),
  statusIdx: index("verification_status_idx").on(table.verificationStatus),
  billUserTypeUnique: uniqueIndex("verification_bill_user_type_idx").on(table.billId, table.userId, table.verificationType), // User verifies one aspect per bill once
  confidenceCheck: check("verification_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  countsCheck: check("verification_counts_check", sql`${table.endorsements} >= 0 AND ${table.disputes} >= 0`),
}));

// ============================================================================
// STAKEHOLDER AND SPONSOR ANALYSIS
// ============================================================================

// General stakeholder information (can be linked to users or represent organizations)
export const stakeholder = pgTable("stakeholder", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  organization: text("organization"),
  sector: text("sector"),
  type: stakeholderTypeEnum("type").notNull(),
  influence: numeric("influence", { precision: 5, scale: 2 }).notNull().default("0.00"), // Estimated influence score
  // votingHistory: jsonb("voting_history").default([]), // Removed, better tracked elsewhere if needed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("stakeholder_name_idx").on(table.name),
  sectorIdx: index("stakeholder_sector_idx").on(table.sector),
  typeIdx: index("stakeholder_type_idx").on(table.type),
  sectorTypeIdx: index("stakeholder_sector_type_idx").on(table.sector, table.type),
  influenceCheck: check("stakeholder_influence_check", sql`${table.influence} >= 0 AND ${table.influence} <= 100`),
}));

// Affiliations between sponsors and external organizations
export const sponsorAffiliation = pgTable("sponsor_affiliation", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  organization: text("organization").notNull(),
  role: text("role"), // Role within the organization (e.g., 'Board Member', 'Consultant')
  type: affiliationTypeEnum("type").notNull(), // Nature of the affiliation
  conflictType: affiliationConflictTypeEnum("conflict_type").default('none'), // Potential conflict type
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_affiliation_sponsor_id_idx").on(table.sponsorId),
  organizationIdx: index("sponsor_affiliation_organization_idx").on(table.organization),
  activeIdx: index("sponsor_affiliation_active_idx").on(table.isActive),
  sponsorActiveIdx: index("sponsor_affiliation_sponsor_active_idx").on(table.sponsorId, table.isActive), // Index active affiliations per sponsor
}));

// Sponsor financial transparency disclosures
export const sponsorTransparency = pgTable("sponsor_transparency", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  disclosureType: disclosureTypeEnum("disclosure_type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }), // Optional amount
  source: text("source"), // Source of funds/interest
  dateReported: timestamp("date_reported", { withTimezone: true }),
  isVerified: boolean("is_verified").notNull().default(false), // Has this disclosure been verified?
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_transparency_sponsor_id_idx").on(table.sponsorId),
  disclosureTypeIdx: index("sponsor_transparency_disclosure_type_idx").on(table.disclosureType),
  isVerifiedIdx: index("sponsor_transparency_is_verified_idx").on(table.isVerified),
  sponsorVerifiedIdx: index("sponsor_transparency_sponsor_verified_idx").on(table.sponsorId, table.isVerified), // Index verified disclosures per sponsor
}));

// ============================================================================
// MODERATION AND SAFETY
// ============================================================================

// Consolidated table for content reports (replaces contentFlag, moderationFlag, moderationQueue)
export const contentReport = pgTable("content_report", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(), // ID of the reported item (comment, bill, user profile)
  reportedBy: uuid("reported_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  reportType: flagTypeEnum("report_type").notNull(), // Category of the report
  reason: text("reason").notNull(), // User-provided reason
  description: text("description"), // Optional additional details
  status: reportStatusEnum("status").default("pending").notNull(), // Current status of the report
  severity: severityEnum("severity").notNull().default("medium"), // Severity assigned (manual or auto)
  autoDetected: boolean("auto_detected").notNull().default(false), // Was this detected by automated systems?
  reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "set null" }), // Moderator who reviewed
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"), // Notes from the moderator
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  contentIdx: index("content_report_content_idx").on(table.contentType, table.contentId),
  reportedByIdx: index("content_report_reporter_idx").on(table.reportedBy),
  statusIdx: index("content_report_status_idx").on(table.status, table.createdAt), // Index pending reports by time
  categoryIdx: index("content_report_category_idx").on(table.reportType, table.createdAt),
  reviewedByIdx: index("content_report_reviewed_by_idx").on(table.reviewedBy),
  // Index for moderation queue functionality: Pending reports, ordered by severity then time
  statusSeverityIdx: index("content_report_status_severity_idx").on(table.status, table.severity, table.createdAt),
}));

// Actions taken by moderators
export const moderationAction = pgTable("moderation_action", {
  id: serial("id").primaryKey(),
  contentType: moderationContentTypeEnum("content_type").notNull(),
  contentId: integer("content_id").notNull(), // ID of the item acted upon
  actionType: moderationActionTypeEnum("action_type").notNull(), // e.g., 'hide', 'delete', 'ban_user'
  reason: text("reason").notNull(), // Reason for the action
  moderatorId: uuid("moderator_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  reportId: integer("report_id").references(() => contentReport.id, { onDelete: "set null" }), // Link to the report that triggered action
  duration: integer("duration"), // Duration in seconds (for temporary bans/mutes)
  isReversible: boolean("is_reversible").notNull().default(true), // Can this action be undone?
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  reversedBy: uuid("reversed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_action_content_idx").on(table.contentType, table.contentId), // Index actions by content
  actionTypeIdx: index("moderation_action_action_type_idx").on(table.actionType),
  moderatorIdIdx: index("moderation_action_moderator_id_idx").on(table.moderatorId),
  reversedByIdx: index("moderation_action_reversed_by_idx").on(table.reversedBy),
  createdAtIdx: index("moderation_action_created_at_idx").on(table.createdAt),
  reportIdIdx: index("moderation_action_report_id_idx").on(table.reportId),
}));

// ============================================================================
// SECURITY AND COMPLIANCE
// ============================================================================

// Logs significant security-related events
export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // e.g., 'login_failed', 'permission_changed', 'data_exported'
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }), // User involved (if applicable)
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"), // Resource affected (e.g., 'bill:123', 'user:abc')
  action: text("action"), // Action performed
  result: securityResultEnum("result").notNull(), // 'success', 'failure', 'blocked'
  severity: severityEnum("severity").notNull().default("info"),
  details: jsonb("details").default({}), // Additional context
  sessionId: text("session_id"), // Link to session if available
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), // Redundant? timestamp usually suffices
}, (table) => ({
  eventTypeIdx: index("security_audit_log_event_type_idx").on(table.eventType),
  userIdIdx: index("security_audit_log_user_id_idx").on(table.userId),
  timestampIdx: index("security_audit_log_timestamp_idx").on(table.timestamp), // Primary time index
  severityIdx: index("security_audit_log_severity_idx").on(table.severity),
  resultIdx: index("security_audit_log_result_idx").on(table.result),
  severityTimestampIdx: index("security_audit_log_severity_timestamp_idx").on(table.severity, table.timestamp), // Index high severity events
}));

// Tracks status of compliance checks (GDPR, CCPA, etc.)
export const complianceCheck = pgTable("compliance_check", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(), // Name of the check (e.g., 'GDPR Data Deletion')
  checkType: complianceCheckTypeEnum("check_type").notNull(), // Category (e.g., 'gdpr')
  description: text("description"),
  status: complianceStatusEnum("status").notNull().default("pending"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }), // For scheduled checks
  findings: jsonb("findings").default([]), // Details of compliance issues found
  remediation: text("remediation"), // Steps taken or planned for remediation
  priority: severityEnum("priority").notNull().default("medium"), // Priority of the check/finding
  automated: boolean("automated").notNull().default(true), // Was the check automated?
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  checkTypeIdx: index("compliance_check_check_type_idx").on(table.checkType),
  statusIdx: index("compliance_check_status_idx").on(table.status), // Index non-compliant checks
  nextCheckIdx: index("compliance_check_next_check_idx").on(table.nextCheckAt),
  priorityIdx: index("compliance_check_priority_idx").on(table.priority),
  statusPriorityIdx: index("compliance_check_status_priority_idx").on(table.status, table.priority), // Index high-priority non-compliant checks
}));

// Stores known threat intelligence data (e.g., malicious IPs)
export const threatIntelligence = pgTable("threat_intelligence", {
  id: serial("id").primaryKey(),
  ipAddress: inet("ip_address").notNull().unique(), // The malicious IP
  threatType: threatTypeEnum("threat_type").notNull(), // Type of threat (bot, scanner, etc.)
  severity: severityEnum("severity").notNull().default("medium"),
  source: threatSourceEnum("source").notNull(), // Where the info came from
  description: text("description"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  occurrences: integer("occurrences").notNull().default(1), // How many times observed
  isBlocked: boolean("is_blocked").notNull().default(false), // Is this IP currently blocked?
  isActive: boolean("is_active").notNull().default(true), // Is this threat considered current?
  expiresAt: timestamp("expires_at", { withTimezone: true }), // When the block/threat info expires
  metadata: jsonb("metadata").default({}), // Additional data from the source
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  threatTypeIdx: index("threat_intelligence_threat_type_idx").on(table.threatType),
  severityIdx: index("threat_intelligence_severity_idx").on(table.severity),
  isActiveIdx: index("threat_intelligence_is_active_idx").on(table.isActive), // Index active threats
  activeBlockedIdx: index("threat_intelligence_active_blocked_idx").on(table.isActive, table.isBlocked), // Index active blocks
  occurrencesCheck: check("threat_intelligence_occurrences_check", sql`${table.occurrences} >= 1`),
}));

// Tracks security incidents
export const securityIncident = pgTable("security_incident", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(), // e.g., 'data_breach', 'dos', 'unauthorized_access'
  severity: severityEnum("severity").notNull(),
  status: incidentStatusEnum("status").notNull().default("open"),
  description: text("description").notNull(),
  affectedUsers: text("affected_users").array().default([]), // List of user IDs or patterns
  detectionMethod: text("detection_method"),
  firstDetectedAt: timestamp("first_detected_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }), // If ongoing
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  assignedTo: uuid("assigned_to").references(() => user.id, { onDelete: "set null" }), // User handling the incident
  evidence: jsonb("evidence").default({}), // Links to logs, screenshots, etc.
  mitigationSteps: text("mitigation_steps").array().default([]), // Steps taken to resolve
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  incidentTypeIdx: index("security_incident_type_idx").on(table.incidentType),
  severityIdx: index("security_incident_severity_idx").on(table.severity),
  statusIdx: index("security_incident_status_idx").on(table.status), // Index open incidents
  assignedToIdx: index("security_incident_assigned_to_idx").on(table.assignedTo),
  statusSeverityIdx: index("security_incident_status_severity_idx").on(table.status, table.severity), // Index open, high severity incidents
}));

// Individual security alerts (can be linked to incidents)
export const securityAlert = pgTable("security_alert", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(), // Specific alert rule triggered
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(), // System that generated the alert (e.g., 'WAF', 'IDS', 'AuditLog')
  status: securityAlertStatusEnum("status").notNull().default("active"),
  assignedTo: uuid("assigned_to").references(() => user.id, { onDelete: "set null" }), // User investigating
  metadata: jsonb("metadata").default({}), // Details from the source event
  incidentId: integer("incident_id").references(() => securityIncident.id, { onDelete: "set null" }), // Link to parent incident
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  alertTypeIdx: index("security_alert_type_idx").on(table.alertType),
  severityIdx: index("security_alert_severity_idx").on(table.severity),
  statusIdx: index("security_alert_status_idx").on(table.status), // Index active alerts
  incidentIdIdx: index("security_alert_incident_id_idx").on(table.incidentId),
  statusSeverityIdx: index("security_alert_status_severity_idx").on(table.status, table.severity), // Index active, high severity alerts
}));

// Defines known attack patterns for detection systems
export const attackPattern = pgTable("attack_pattern", {
  id: serial("id").primaryKey(),
  patternName: text("pattern_name").notNull(), // Human-readable name
  patternType: attackPatternTypeEnum("pattern_type").notNull(), // 'regex', 'behavioral', etc.
  pattern: text("pattern").notNull(), // The actual pattern (regex, rule, etc.)
  description: text("description"),
  severity: severityEnum("severity").notNull(), // Severity if this pattern is matched
  isEnabled: boolean("is_enabled").default(true), // Enable/disable pattern matching
  falsePositiveRate: integer("false_positive_rate").default(0), // Estimated or measured FP rate (0-100)
  detectionCount: integer("detection_count").default(0), // How many times this pattern has hit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  patternNameIdx: index("attack_pattern_name_idx").on(table.patternName),
  patternTypeIdx: index("attack_pattern_type_idx").on(table.patternType),
  enabledIdx: index("attack_pattern_enabled_idx").on(table.isEnabled), // Index enabled patterns
}));

// ============================================================================
// REGULATORY MONITORING
// ============================================================================

// Stores information about external regulations
export const regulation = pgTable("regulation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // Full text or link
  status: regulationStatusEnum("status").notNull().default("proposed"),
  source: text("source"), // Issuing body or URL
  sector: text("sector"), // Sector affected
  tags: text("tags").array().default([]),
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }), // Sponsor if legislative
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  complianceDeadline: timestamp("compliance_deadline", { withTimezone: true }),
  // affectedStakeholders: integer("affected_stakeholders").default(0), // Removed - use regulatoryImpact table
  // estimatedImpact: numeric("estimated_impact", { precision: 10, scale: 2 }).default("0"), // Removed - use regulatoryImpact table
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

// Tracks changes to regulations over time
export const regulatoryChange = pgTable("regulatory_change", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulation.id, { onDelete: "cascade" }),
  changeType: text("change_type"), // e.g., 'amendment', 'clarification', 'repeal'
  // Flags indicating nature of change
  changesRequirements: boolean("changes_requirements").notNull().default(false),
  shortensDeadline: boolean("shortens_deadline").notNull().default(false),
  addsCosts: boolean("adds_costs").notNull().default(false),
  affectsCompliance: boolean("affects_compliance").notNull().default(false),
  details: jsonb("details").default({}), // Specific changes made
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  reportedBy: uuid("reported_by").references(() => user.id, { onDelete: "set null" }), // User who noted the change
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  regulationIdIdx: index("regulatory_change_regulation_id_idx").on(table.regulationId),
  changeTypeIdx: index("regulatory_change_change_type_idx").on(table.changeType),
  changedAtIdx: index("regulatory_change_changed_at_idx").on(table.changedAt),
  regulationChangedIdx: index("regulatory_change_regulation_changed_idx").on(table.regulationId, table.changedAt),
  reportedByIdx: index("regulatory_change_reported_by_idx").on(table.reportedBy),
}));

// Assesses the impact of regulations on different sectors/entities
export const regulatoryImpact = pgTable("regulatory_impact", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulation.id, { onDelete: "cascade" }),
  sector: text("sector"), // Sector impacted
  impactLevel: severityEnum("impact_level").default('medium'), // low, medium, high, critical
  affectedEntities: jsonb("affected_entities").default([]), // Specific types of entities affected
  mitigation: jsonb("mitigation").default({}), // Potential mitigation strategies
  impactScore: numeric("impact_score", { precision: 5, scale: 2 }).default("0"), // Calculated impact score
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

// Tracks data synchronization jobs from external sources
export const syncJob = pgTable("sync_job", {
  id: text("id").primaryKey(), // Unique ID for the job run
  dataSourceId: text("data_source_id").notNull(), // Identifier for the data source
  endpointId: text("endpoint_id").notNull(), // Specific endpoint/table synced
  status: syncStatusEnum("status").notNull().default("pending"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsSkipped: integer("records_skipped").notNull().default(0),
  isIncremental: boolean("is_incremental").notNull().default(true),
  lastSyncTimestamp: timestamp("last_sync_timestamp", { withTimezone: true }), // Timestamp used for incremental sync
  nextRunTime: timestamp("next_run_time", { withTimezone: true }), // For scheduled jobs
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("sync_job_status_idx").on(table.status), // Index failed/pending jobs
  dataSourceIdx: index("sync_job_data_source_idx").on(table.dataSourceId),
  nextRunTimeIdx: index("sync_job_next_run_time_idx").on(table.nextRunTime), // Index jobs ready to run
  dataSourceStatusIdx: index("sync_job_data_source_status_idx").on(table.dataSourceId, table.status),
  recordsCheck: check("sync_job_records_check", sql`${table.recordsProcessed} >= 0 AND ${table.recordsUpdated} >= 0 AND ${table.recordsCreated} >= 0 AND ${table.recordsSkipped} >= 0`),
}));

// Logs errors encountered during sync jobs
export const syncError = pgTable("sync_error", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => syncJob.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  level: syncErrorLevelEnum("level").notNull(), // warning, error, critical
  message: text("message").notNull(),
  details: text("details"), // Stack trace or more info
  recordId: text("record_id"), // ID of the record that caused the error (if applicable)
  endpoint: text("endpoint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  jobIdIdx: index("sync_error_job_id_idx").on(table.jobId),
  levelIdx: index("sync_error_level_idx").on(table.level),
  timestampIdx: index("sync_error_timestamp_idx").on(table.timestamp),
  jobTimestampIdx: index("sync_error_job_timestamp_idx").on(table.jobId, table.timestamp), // Index errors by job and time
}));

// Tracks data conflicts arising from multiple sources
export const conflict = pgTable("conflict", {
  id: text("id").primaryKey(), // Unique ID for the conflict instance
  dataType: text("data_type").notNull(), // e.g., 'bill', 'sponsor'
  recordId: text("record_id").notNull(), // ID of the record with conflicting data
  resolution: conflictResolutionEnum("resolution").notNull().default("pending"), // 'pending', 'automatic', 'manual'
  resolvedValue: text("resolved_value"), // The final value after resolution
  resolvedBy: uuid("resolved_by").references(() => user.id, { onDelete: "set null" }), // User who resolved manually
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("0.00"), // Confidence in automatic resolution
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dataTypeRecordUnique: uniqueIndex("conflict_data_type_record_idx").on(table.dataType, table.recordId),
  resolutionIdx: index("conflict_resolution_idx").on(table.resolution), // Index pending conflicts
  dataTypeIdx: index("conflict_data_type_idx").on(table.dataType),
  resolvedByIdx: index("conflict_resolved_by_idx").on(table.resolvedBy),
  confidenceCheck: check("conflict_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
}));

// Stores the conflicting values from different sources for a specific conflict
export const conflictSource = pgTable("conflict_source", {
  id: serial("id").primaryKey(),
  conflictId: text("conflict_id").notNull().references(() => conflict.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(), // Identifier of the data source
  sourceName: text("source_name").notNull(), // Human-readable name
  value: text("value").notNull(), // The conflicting value from this source
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(), // When this value was observed
  priority: numeric("priority", { precision: 3, scale: 2 }).notNull(), // Priority of the source (0-1)
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(), // Confidence in this source's value (0-1)
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

// Stores individual notification messages for users
export const notification = pgTable("notification", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(), // 'bill_update', 'comment_reply', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedBillId: integer("related_bill_id").references(() => bill.id, { onDelete: "cascade" }), // Link to relevant bill
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notification_user_id_idx").on(table.userId),
  isReadIdx: index("notification_is_read_idx").on(table.isRead),
  typeIdx: index("notification_type_idx").on(table.type),
  createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
  userReadCreatedIdx: index("notification_user_read_created_idx").on(table.userId, table.isRead, table.createdAt), // Index unread notifications per user, ordered by time
}));

// ============================================================================
// ANALYTICS AND METRICS TABLES
// ============================================================================

// Raw event stream for analytics
export const analyticsEvent = pgTable("analytics_event", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // e.g., 'page_view', 'bill_track', 'comment_post'
  eventCategory: text("event_category").notNull(), // e.g., 'navigation', 'engagement', 'search'
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }), // Link to user if logged in
  sessionId: text("session_id"), // Unique session identifier
  billId: integer("bill_id").references(() => bill.id, { onDelete: "set null" }),
  commentId: integer("comment_id").references(() => billComment.id, { onDelete: "set null" }),
  sponsorId: integer("sponsor_id").references(() => sponsor.id, { onDelete: "set null" }),
  eventData: jsonb("event_data").default({}), // Custom data related to the event
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
  eventDataIdx: index("analytics_event_data_idx").using("gin", table.eventData), // GIN index for querying JSONB
}));

// Pre-aggregated daily summaries for faster reporting
export const analyticsDailySummary = pgTable("analytics_daily_summary", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category"), // Optional category aggregation
  totalEvents: integer("total_events").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  uniqueSessions: integer("unique_sessions").default(0).notNull(),
  // Add specific metric columns as needed
  billInteractions: integer("bill_interactions").default(0),
  commentInteractions: integer("comment_interactions").default(0),
  searchQueries: integer("search_queries").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When the summary was generated
}, (table) => ({
  dateTypeIdx: index("analytics_daily_summary_date_type_idx").on(table.date, table.eventType),
  categoryDateIdx: index("analytics_daily_summary_category_date_idx").on(table.eventCategory, table.date),
  uniqueDateTypeCategory: unique("analytics_daily_summary_date_type_category_key").on(table.date, table.eventType, table.eventCategory), // Ensure uniqueness
  countsCheck: check("analytics_daily_summary_counts_check", sql`${table.totalEvents} >= 0 AND ${table.uniqueUsers} >= 0 AND ${table.uniqueSessions} >= 0`),
}));

// Daily summary of user activity
export const userActivitySummary = pgTable("user_activity_summary", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  billsViewed: integer("bills_viewed").default(0),
  billsTracked: integer("bills_tracked").default(0), // Count of bills actively tracked on this day
  commentsPosted: integer("comments_posted").default(0),
  commentsUpvoted: integer("comments_upvoted").default(0),
  commentsDownvoted: integer("comments_downvoted").default(0),
  searchesPerformed: integer("searches_performed").default(0),
  sessionDurationMinutes: integer("session_duration_minutes").default(0), // Total session time
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).default("0"), // Daily engagement score
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index("user_activity_summary_user_date_idx").on(table.userId, table.date),
  dateIdx: index("user_activity_summary_date_idx").on(table.date),
  engagementDateIdx: index("user_activity_summary_engagement_date_idx").on(table.engagementScore, table.date),
  uniqueUserDate: unique("user_activity_summary_user_date_key").on(table.userId, table.date),
  countsCheck: check("user_activity_summary_counts_check", sql`${table.billsViewed} >= 0 AND ${table.commentsPosted} >= 0 AND ${table.sessionDurationMinutes} >= 0`),
}));

// Daily summary of bill analytics
export const billAnalyticsSummary = pgTable("bill_analytics_summary", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  views: integer("views").default(0),
  uniqueViewers: integer("unique_viewers").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  trackingUsers: integer("tracking_users").default(0), // Users actively tracking this bill on this day
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).default("0"),
  // Sentiment scores aggregated from comments/analysis
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

// Stores system health metrics (CPU, memory, DB connections, etc.)
export const systemHealthMetric = pgTable("system_health_metric", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(), // e.g., 'cpu_usage', 'db_connections_active'
  metricValue: numeric("metric_value").notNull(),
  metricUnit: text("metric_unit"), // e.g., '%', 'count', 'ms'
  metricCategory: text("metric_category").notNull(), // e.g., 'system', 'database', 'api'
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  metadata: jsonb("metadata").default({}), // Hostname, service name, etc.
}, (table) => ({
  categoryTimeIdx: index("system_health_metric_category_time_idx").on(table.metricCategory, table.recordedAt),
  nameTimeIdx: index("system_health_metric_name_time_idx").on(table.metricName, table.recordedAt),
  recordedAtIdx: index("system_health_metric_recorded_at_idx").on(table.recordedAt), // Primary time index
}));

// ============================================================================
// DASHBOARD SUPPORT TABLES
// ============================================================================

// Example table for dashboard feature
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

// Example table for dashboard feature
export const evaluation = pgTable("evaluation", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull(),
  departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
  status: evaluationStatusEnum("status").notNull().default("pending"),
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
// *** ADDED: New Type ***
export type UserBillTrackingPreference = typeof userBillTrackingPreference.$inferSelect;
export type InsertUserBillTrackingPreference = typeof userBillTrackingPreference.$inferInsert;
// *** END ADDED Type ***
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
export type ModerationAction = typeof moderationAction.$inferSelect;
export type InsertModerationAction = typeof moderationAction.$inferInsert;
export type ContentReport = typeof contentReport.$inferSelect;
export type InsertContentReport = typeof contentReport.$inferInsert;
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
// *** ADDED: Plural Export ***
export const userBillTrackingPreferences = userBillTrackingPreference;
// *** END ADDED Export ***
export const socialShares = socialShare;

export const analyses = analysis;
export const contentAnalyses = contentAnalysis;
export const billSectionConflicts = billSectionConflict;
export const verifications = verification;

export const stakeholders = stakeholder;
export const sponsorAffiliations = sponsorAffiliation;
export const sponsorTransparencies = sponsorTransparency;

// --- REFINED: Moderation plural exports ---
export const moderationActions = moderationAction;
export const contentReports = contentReport;
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