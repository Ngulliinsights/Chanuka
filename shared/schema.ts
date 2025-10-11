import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";
import { logger } from '../server/utils/logger';

// ============================================================================
// CORE USER TABLES
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  role: text("role").notNull().default("citizen"), // citizen, expert, admin, journalist, advocate
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected
  preferences: jsonb("preferences").default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
  verificationStatusIdx: index("users_verification_status_idx").on(table.verificationStatus),
  activeVerifiedIdx: index("users_active_verified_idx").on(table.isActive, table.verificationStatus),
}));

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  expertise: text("expertise").array().default([]),
  location: text("location"),
  organization: text("organization"),
  verificationDocuments: jsonb("verification_documents").default([]),
  reputationScore: integer("reputation_score").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex("user_profiles_user_id_idx").on(table.userId),
  reputationIdx: index("user_profiles_reputation_idx").on(table.reputationScore),
  reputationCheck: check("reputation_score_check", sql`${table.reputationScore} >= 0`),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  isActiveIdx: index("sessions_is_active_idx").on(table.isActive),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index("refresh_tokens_session_id_idx").on(table.sessionId),
  tokenHashIdx: uniqueIndex("refresh_tokens_token_hash_idx").on(table.tokenHash),
  expiresAtIdx: index("refresh_tokens_expires_at_idx").on(table.expiresAt),
}));

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("password_resets_user_id_idx").on(table.userId),
  tokenHashIdx: uniqueIndex("password_resets_token_hash_idx").on(table.tokenHash),
  expiresAtIdx: index("password_resets_expires_at_idx").on(table.expiresAt),
}));

export const userSocialProfiles = pgTable("user_social_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // google, facebook, twitter, etc.
  providerId: text("provider_id").notNull(),
  username: text("username"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userProviderIdx: uniqueIndex("user_social_profiles_user_provider_idx").on(table.userId, table.provider),
  providerIdIdx: index("user_social_profiles_provider_id_idx").on(table.providerId),
}));

export const userInterests = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  interest: text("interest").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userInterestIdx: uniqueIndex("user_interests_user_interest_idx").on(table.userId, table.interest),
  interestIdx: index("user_interests_interest_idx").on(table.interest),
}));

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(),
  achievementValue: integer("achievement_value").notNull().default(0),
  level: integer("level").default(1),
  badge: text("badge"),
  description: text("description"),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_progress_user_id_idx").on(table.userId),
  achievementTypeIdx: index("user_progress_achievement_type_idx").on(table.achievementType),
  userAchievementIdx: uniqueIndex("user_progress_user_achievement_idx").on(table.userId, table.achievementType),
}));

// ============================================================================
// LEGISLATIVE CONTENT TABLES
// ============================================================================

export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // MP, Senator, etc.
  party: text("party"),
  constituency: text("constituency"),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  conflictLevel: text("conflict_level"), // low, medium, high
  financialExposure: numeric("financial_exposure", { precision: 12, scale: 2 }).default("0"),
  votingAlignment: numeric("voting_alignment", { precision: 5, scale: 2 }).default("0"),
  transparencyScore: numeric("transparency_score", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("sponsors_name_idx").on(table.name),
  partyIdx: index("sponsors_party_idx").on(table.party),
  isActiveIdx: index("sponsors_is_active_idx").on(table.isActive),
  nameEmailIdx: uniqueIndex("sponsors_name_email_idx").on(table.name, table.email),
}));

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  summary: text("summary"),
  status: text("status").notNull().default("introduced"), // introduced, committee, passed, failed, signed
  billNumber: text("bill_number"),
  sponsorId: integer("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),
  category: text("category"),
  tags: text("tags").array().default([]),
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"),
  complexityScore: integer("complexity_score"),
  constitutionalConcerns: jsonb("constitutional_concerns").default([]),
  stakeholderAnalysis: jsonb("stakeholder_analysis").default({}),
  introducedDate: timestamp("introduced_date"),
  lastActionDate: timestamp("last_action_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billNumberIdx: uniqueIndex("bills_bill_number_idx").on(table.billNumber),
  statusIdx: index("bills_status_idx").on(table.status),
  categoryIdx: index("bills_category_idx").on(table.category),
  sponsorIdIdx: index("bills_sponsor_id_idx").on(table.sponsorId),
  introducedDateIdx: index("bills_introduced_date_idx").on(table.introducedDate),
  engagementScoreIdx: index("bills_engagement_score_idx").on(table.engagementScore),
}));

export const billTags = pgTable("bill_tags", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  billTagIdx: uniqueIndex("bill_tags_bill_tag_idx").on(table.billId, table.tag),
  tagIdx: index("bill_tags_tag_idx").on(table.tag),
}));

export const billSponsorships = pgTable("bill_sponsorships", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  sponsorshipType: text("sponsorship_type").notNull(), // primary, co-sponsor, supporter
  sponsorshipDate: timestamp("sponsorship_date").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  billSponsorIdx: uniqueIndex("bill_sponsorships_bill_sponsor_idx").on(table.billId, table.sponsorId),
  sponsorIdIdx: index("bill_sponsorships_sponsor_id_idx").on(table.sponsorId),
  isActiveIdx: index("bill_sponsorships_is_active_idx").on(table.isActive),
}));

export const billComments = pgTable("bill_comments", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  commentType: text("comment_type").notNull().default("general"), // general, expert_analysis, concern, support
  isVerified: boolean("is_verified").notNull().default(false),
  parentCommentId: integer("parent_comment_id").references(() => billComments.id, { onDelete: "cascade" }),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_comments_bill_id_idx").on(table.billId),
  userIdIdx: index("bill_comments_user_id_idx").on(table.userId),
  parentCommentIdIdx: index("bill_comments_parent_comment_id_idx").on(table.parentCommentId),
  createdAtIdx: index("bill_comments_created_at_idx").on(table.createdAt),
}));

export const commentVotes = pgTable("comment_votes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => billComments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voteType: text("vote_type").notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  commentUserIdx: uniqueIndex("comment_votes_comment_user_idx").on(table.commentId, table.userId),
  userIdIdx: index("comment_votes_user_id_idx").on(table.userId),
}));

export const billEngagement = pgTable("bill_engagement", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewCount: integer("view_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).notNull().default("0"),
  lastEngaged: timestamp("last_engaged").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billUserIdx: uniqueIndex("bill_engagement_bill_user_idx").on(table.billId, table.userId),
  userIdIdx: index("bill_engagement_user_id_idx").on(table.userId),
  engagementScoreIdx: index("bill_engagement_score_idx").on(table.engagementScore),
  lastEngagedIdx: index("bill_engagement_last_engaged_idx").on(table.lastEngaged),
}));

export const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata").default({}),
  shareDate: timestamp("share_date").notNull().defaultNow(),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("social_shares_bill_id_idx").on(table.billId),
  userIdIdx: index("social_shares_user_id_idx").on(table.userId),
  platformIdx: index("social_shares_platform_idx").on(table.platform),
  shareDateIdx: index("social_shares_share_date_idx").on(table.shareDate),
}));

// ============================================================================
// ANALYSIS AND VERIFICATION TABLES
// ============================================================================

export const analysis = pgTable("analysis", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  analysisType: text("analysis_type").notNull(), // constitutional, stakeholder, impact, complexity
  results: jsonb("results").default({}),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
  modelVersion: text("model_version"),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billAnalysisTypeIdx: uniqueIndex("analysis_bill_type_idx").on(table.billId, table.analysisType),
  analysisTypeIdx: index("analysis_type_idx").on(table.analysisType),
  isApprovedIdx: index("analysis_is_approved_idx").on(table.isApproved),
}));

export const contentAnalysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // 'comment', 'bill'
  contentId: integer("content_id").notNull(),
  toxicityScore: numeric("toxicity_score", { precision: 5, scale: 4 }).notNull().default("0"),
  spamScore: numeric("spam_score", { precision: 5, scale: 4 }).notNull().default("0"),
  sentimentScore: numeric("sentiment_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
  readabilityScore: numeric("readability_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
  flags: text("flags").array().default([]),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.8"),
  modelVersion: text("model_version").notNull().default("1.0"),
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
}, (table) => ({
  contentIdx: uniqueIndex("content_analysis_content_idx").on(table.contentType, table.contentId),
  toxicityIdx: index("content_analysis_toxicity_idx").on(table.toxicityScore),
  spamIdx: index("content_analysis_spam_idx").on(table.spamScore),
}));

export const billSectionConflicts = pgTable("bill_section_conflicts", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  sectionNumber: text("section_number").notNull(),
  conflictType: text("conflict_type").notNull(), // constitutional, procedural, contradictory
  severity: text("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index("bill_section_conflicts_bill_id_idx").on(table.billId),
  severityIdx: index("bill_section_conflicts_severity_idx").on(table.severity),
  isResolvedIdx: index("bill_section_conflicts_is_resolved_idx").on(table.isResolved),
}));

export const expertVerifications = pgTable("expert_verifications", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  expertId: uuid("expert_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  verificationStatus: text("verification_status").notNull(), // verified, disputed, pending
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  billExpertIdx: uniqueIndex("expert_verifications_bill_expert_idx").on(table.billId, table.expertId),
  expertIdIdx: index("expert_verifications_expert_id_idx").on(table.expertId),
  statusIdx: index("expert_verifications_status_idx").on(table.verificationStatus),
}));

export const citizenVerifications = pgTable('citizen_verifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  billId: integer('bill_id').notNull().references(() => bills.id, { onDelete: "cascade" }),
  citizenId: uuid('citizen_id').notNull().references(() => users.id, { onDelete: "cascade" }),
  verificationType: varchar('verification_type', { length: 50 }).notNull(),
  verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('pending'),
  confidence: integer('confidence').notNull().default(0),
  evidence: jsonb('evidence').notNull().default('[]'),
  expertise: jsonb('expertise').notNull().default('{}'),
  reasoning: text('reasoning').notNull(),
  endorsements: integer('endorsements').notNull().default(0),
  disputes: integer('disputes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  billIdIdx: index("citizen_verifications_bill_id_idx").on(table.billId),
  citizenIdIdx: index("citizen_verifications_citizen_id_idx").on(table.citizenId),
  statusIdx: index("citizen_verifications_status_idx").on(table.verificationStatus),
  billCitizenIdx: uniqueIndex("citizen_verifications_bill_citizen_idx").on(table.billId, table.citizenId, table.verificationType),
}));

// ============================================================================
// STAKEHOLDER AND SPONSOR ANALYSIS
// ============================================================================

export const stakeholders = pgTable("stakeholders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  organization: text("organization"),
  sector: text("sector"),
  type: text("type").notNull(), // business, ngo, agency, individual
  influence: numeric("influence", { precision: 5, scale: 2 }).notNull().default("0.00"),
  votingHistory: jsonb("voting_history").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("stakeholders_name_idx").on(table.name),
  sectorIdx: index("stakeholders_sector_idx").on(table.sector),
  typeIdx: index("stakeholders_type_idx").on(table.type),
}));

export const sponsorAffiliations = pgTable("sponsor_affiliations", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  organization: text("organization").notNull(),
  role: text("role"),
  type: text("type").notNull(), // economic, professional, advocacy, cultural
  conflictType: text("conflict_type"), // financial, ownership, influence, representation
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_affiliations_sponsor_id_idx").on(table.sponsorId),
  organizationIdx: index("sponsor_affiliations_organization_idx").on(table.organization),
  isActiveIdx: index("sponsor_affiliations_is_active_idx").on(table.isActive),
}));

export const sponsorTransparency = pgTable("sponsor_transparency", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  disclosureType: text("disclosure_type").notNull(), // financial, business, family
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  source: text("source"),
  dateReported: timestamp("date_reported"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  sponsorIdIdx: index("sponsor_transparency_sponsor_id_idx").on(table.sponsorId),
  disclosureTypeIdx: index("sponsor_transparency_disclosure_type_idx").on(table.disclosureType),
  isVerifiedIdx: index("sponsor_transparency_is_verified_idx").on(table.isVerified),
}));

// ============================================================================
// MODERATION AND SAFETY
// ============================================================================

export const moderationFlags = pgTable("moderation_flags", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // 'comment', 'bill', 'user_profile'
  contentId: integer("content_id").notNull(),
  flagType: text("flag_type").notNull(), // 'spam', 'harassment', 'misinformation', etc.
  reason: text("reason").notNull(),
  reportedBy: uuid("reported_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'resolved', 'dismissed'
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  autoDetected: boolean("auto_detected").notNull().default(false),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_flags_content_idx").on(table.contentType, table.contentId),
  statusIdx: index("moderation_flags_status_idx").on(table.status),
  severityIdx: index("moderation_flags_severity_idx").on(table.severity),
  reportedByIdx: index("moderation_flags_reported_by_idx").on(table.reportedBy),
}));

export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  actionType: text("action_type").notNull(), // 'warn', 'hide', 'delete', 'ban_user', 'verify', 'highlight'
  reason: text("reason").notNull(),
  moderatorId: uuid("moderator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  duration: integer("duration"), // in hours, for temporary actions
  isReversible: boolean("is_reversible").notNull().default(true),
  reversedAt: timestamp("reversed_at"),
  reversedBy: uuid("reversed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("moderation_actions_content_idx").on(table.contentType, table.contentId),
  actionTypeIdx: index("moderation_actions_action_type_idx").on(table.actionType),
  moderatorIdIdx: index("moderation_actions_moderator_id_idx").on(table.moderatorId),
}));

// ============================================================================
// SECURITY AND COMPLIANCE
// ============================================================================

export const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"),
  action: text("action"),
  result: text("result").notNull(), // 'success', 'failure', 'blocked'
  severity: text("severity").notNull().default("info"), // 'info', 'warning', 'error', 'critical'
  details: jsonb("details").default({}),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("security_audit_logs_event_type_idx").on(table.eventType),
  userIdIdx: index("security_audit_logs_user_id_idx").on(table.userId),
  timestampIdx: index("security_audit_logs_timestamp_idx").on(table.timestamp),
  severityIdx: index("security_audit_logs_severity_idx").on(table.severity),
  resultIdx: index("security_audit_logs_result_idx").on(table.result),
}));

export const complianceChecks = pgTable("compliance_checks", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(),
  checkType: text("check_type").notNull(), // gdpr, ccpa, sox, pci_dss, custom
  description: text("description"),
  status: text("status").notNull().default("passing"), // passing, failing, warning, not_applicable
  lastChecked: timestamp("last_checked").notNull().defaultNow(),
  nextCheck: timestamp("next_check"),
  findings: jsonb("findings").default([]),
  remediation: text("remediation"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  automated: boolean("automated").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  checkTypeIdx: index("compliance_checks_check_type_idx").on(table.checkType),
  statusIdx: index("compliance_checks_status_idx").on(table.status),
  nextCheckIdx: index("compliance_checks_next_check_idx").on(table.nextCheck),
  priorityIdx: index("compliance_checks_priority_idx").on(table.priority),
}));

export const threatIntelligence = pgTable("threat_intelligence", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  threatType: text("threat_type").notNull(), // malicious_ip, bot, scanner, etc.
  severity: text("severity").notNull().default("medium"),
  source: text("source").notNull(), // internal, external_feed, manual
  description: text("description"),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  occurrences: integer("occurrences").notNull().default(1),
  blocked: boolean("blocked").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  ipAddressIdx: uniqueIndex("threat_intelligence_ip_address_idx").on(table.ipAddress),
  threatTypeIdx: index("threat_intelligence_threat_type_idx").on(table.threatType),
  severityIdx: index("threat_intelligence_severity_idx").on(table.severity),
  isActiveIdx: index("threat_intelligence_is_active_idx").on(table.isActive),
}));

// ============================================================================
// REGULATORY MONITORING
// ============================================================================

export const regulations = pgTable("regulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  status: text("status").notNull().default("proposed"), // proposed, enacted, repealed
  source: text("source"),
  sector: text("sector"),
  tags: text("tags").array().default([]),
  sponsorId: integer("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),
  effectiveDate: timestamp("effective_date"),
  complianceDeadline: timestamp("compliance_deadline"),
  affectedStakeholders: integer("affected_stakeholders").default(0),
  estimatedImpact: numeric("estimated_impact", { precision: 10, scale: 2 }).default("0"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("regulations_status_idx").on(table.status),
  sectorIdx: index("regulations_sector_idx").on(table.sector),
  effectiveDateIdx: index("regulations_effective_date_idx").on(table.effectiveDate),
}));

export const regulatoryChanges = pgTable("regulatory_changes", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulations.id, { onDelete: "cascade" }),
  changeType: text("change_type"),
  changesRequirements: boolean("changes_requirements").notNull().default(false),
  shortensDeadline: boolean("shortens_deadline").notNull().default(false),
  addsCosts: boolean("adds_costs").notNull().default(false),
  affectsCompliance: boolean("affects_compliance").notNull().default(false),
  details: jsonb("details").default({}),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  reportedBy: uuid("reported_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  regulationIdIdx: index("regulatory_changes_regulation_id_idx").on(table.regulationId),
  changeTypeIdx: index("regulatory_changes_change_type_idx").on(table.changeType),
  changedAtIdx: index("regulatory_changes_changed_at_idx").on(table.changedAt),
}));

export const regulatoryImpact = pgTable("regulatory_impact", {
  id: serial("id").primaryKey(),
  regulationId: uuid("regulation_id").notNull().references(() => regulations.id, { onDelete: "cascade" }),
  sector: text("sector"),
  impactLevel: text("impact_level"),
  affectedEntities: jsonb("affected_entities").default([]),
  mitigation: jsonb("mitigation").default({}),
  impactScore: numeric("impact_score", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  regulationIdIdx: index("regulatory_impact_regulation_id_idx").on(table.regulationId),
  sectorIdx: index("regulatory_impact_sector_idx").on(table.sector),
  impactLevelIdx: index("regulatory_impact_impact_level_idx").on(table.impactLevel),
}));

// ============================================================================
// DATA SYNCHRONIZATION
// ============================================================================

export const syncJobs = pgTable("sync_jobs", {
  id: text("id").primaryKey(),
  dataSourceId: text("data_source_id").notNull(),
  endpointId: text("endpoint_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, cancelled
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsSkipped: integer("records_skipped").notNull().default(0),
  isIncremental: boolean("is_incremental").notNull().default(true),
  lastSyncTimestamp: timestamp("last_sync_timestamp"),
  nextRunTime: timestamp("next_run_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("sync_jobs_status_idx").on(table.status),
  dataSourceIdx: index("sync_jobs_data_source_idx").on(table.dataSourceId),
  nextRunTimeIdx: index("sync_jobs_next_run_time_idx").on(table.nextRunTime),
}));

export const syncErrors = pgTable("sync_errors", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => syncJobs.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull(), // warning, error, critical
  message: text("message").notNull(),
  details: text("details"),
  recordId: text("record_id"),
  endpoint: text("endpoint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  jobIdIdx: index("sync_errors_job_id_idx").on(table.jobId),
  levelIdx: index("sync_errors_level_idx").on(table.level),
  timestampIdx: index("sync_errors_timestamp_idx").on(table.timestamp),
}));

export const conflicts = pgTable("conflicts", {
  id: text("id").primaryKey(),
  dataType: text("data_type").notNull(),
  recordId: text("record_id").notNull(),
  resolution: text("resolution").notNull().default("pending"), // pending, automatic, manual
  resolvedValue: text("resolved_value"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dataTypeRecordIdx: uniqueIndex("conflicts_data_type_record_idx").on(table.dataType, table.recordId),
  resolutionIdx: index("conflicts_resolution_idx").on(table.resolution),
}));

export const conflictSources = pgTable("conflict_sources", {
  id: serial("id").primaryKey(),
  conflictId: text("conflict_id").notNull().references(() => conflicts.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  value: text("value").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  priority: numeric("priority", { precision: 3, scale: 2 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  conflictIdIdx: index("conflict_sources_conflict_id_idx").on(table.conflictId),
  sourceIdIdx: index("conflict_sources_source_id_idx").on(table.sourceId),
}));

// ============================================================================
// NOTIFICATIONS AND MESSAGING
// ============================================================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // bill_update, comment_reply, verification_status
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedBillId: integer("related_bill_id").references(() => bills.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  typeIdx: index("notifications_type_idx").on(table.type),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  userReadIdx: index("notifications_user_read_idx").on(table.userId, table.isRead),
}));

// ============================================================================
// DASHBOARD SUPPORT TABLES
// ============================================================================

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("departments_name_idx").on(table.name),
  isActiveIdx: index("departments_is_active_idx").on(table.isActive),
}));

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  departmentIdIdx: index("evaluations_department_id_idx").on(table.departmentId),
  statusIdx: index("evaluations_status_idx").on(table.status),
}));

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(sessions),
  comments: many(billComments),
  engagements: many(billEngagement),
  notifications: many(notifications),
  interests: many(userInterests),
  progress: many(userProgress),
  socialProfiles: many(userSocialProfiles),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  session: one(sessions, {
    fields: [refreshTokens.sessionId],
    references: [sessions.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [bills.sponsorId],
    references: [sponsors.id],
  }),
  comments: many(billComments),
  engagements: many(billEngagement),
  analyses: many(analysis),
  sponsorships: many(billSponsorships),
  tags: many(billTags),
  sectionConflicts: many(billSectionConflicts),
  expertVerifications: many(expertVerifications),
  citizenVerifications: many(citizenVerifications),
  socialShares: many(socialShares),
}));

export const sponsorsRelations = relations(sponsors, ({ many }) => ({
  bills: many(bills),
  sponsorships: many(billSponsorships),
  affiliations: many(sponsorAffiliations),
  transparency: many(sponsorTransparency),
  regulations: many(regulations),
}));

export const billCommentsRelations = relations(billComments, ({ one, many }) => ({
  bill: one(bills, {
    fields: [billComments.billId],
    references: [bills.id],
  }),
  author: one(users, {
    fields: [billComments.userId],
    references: [users.id],
  }),
  parent: one(billComments, {
    fields: [billComments.parentCommentId],
    references: [billComments.id],
  }),
  replies: many(billComments),
  votes: many(commentVotes),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(billComments, {
    fields: [commentVotes.commentId],
    references: [billComments.id],
  }),
  user: one(users, {
    fields: [commentVotes.userId],
    references: [users.id],
  }),
}));

export const billEngagementRelations = relations(billEngagement, ({ one }) => ({
  bill: one(bills, {
    fields: [billEngagement.billId],
    references: [bills.id],
  }),
  user: one(users, {
    fields: [billEngagement.userId],
    references: [users.id],
  }),
}));

export const analysisRelations = relations(analysis, ({ one }) => ({
  bill: one(bills, {
    fields: [analysis.billId],
    references: [bills.id],
  }),
  approver: one(users, {
    fields: [analysis.approvedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedBill: one(bills, {
    fields: [notifications.relatedBillId],
    references: [bills.id],
  }),
}));

export const regulationsRelations = relations(regulations, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [regulations.sponsorId],
    references: [sponsors.id],
  }),
  changes: many(regulatoryChanges),
  impacts: many(regulatoryImpact),
}));

export const syncJobsRelations = relations(syncJobs, ({ many }) => ({
  errors: many(syncErrors),
}));

export const conflictsRelations = relations(conflicts, ({ many }) => ({
  sources: many(conflictSources),
}));

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  department: one(departments, {
    fields: [evaluations.departmentId],
    references: [departments.id],
  }),
}));

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(60),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().min(1),
  role: z.enum(["citizen", "expert", "admin", "journalist", "advocate"]).default("citizen"),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
  preferences: z.any().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
});

export const insertUserProfileSchema = z.object({
  userId: z.string().uuid(),
  bio: z.string().max(1000).optional(),
  expertise: z.array(z.string()).optional(),
  location: z.string().max(255).optional(),
  organization: z.string().max(255).optional(),
  verificationDocuments: z.any().optional(),
  reputationScore: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
});

export const insertUserProgressSchema = z.object({
  userId: z.string().uuid(),
  achievementType: z.string().min(1),
  achievementValue: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  badge: z.string().optional(),
  description: z.string().optional(),
  unlockedAt: z.date().default(() => new Date()),
});

export const insertBillSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().max(2000).optional(),
  status: z.enum(["introduced", "committee", "passed", "failed", "signed"]).default("introduced"),
  billNumber: z.string().max(50).optional(),
  sponsorId: z.number().int().positive().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  viewCount: z.number().int().min(0).default(0),
  shareCount: z.number().int().min(0).default(0),
  commentCount: z.number().int().min(0).default(0),
  engagementScore: z.number().min(0).default(0),
  complexityScore: z.number().int().min(1).max(10).optional(),
  introducedDate: z.date().optional(),
  lastActionDate: z.date().optional(),
});

export const insertBillCommentSchema = z.object({
  userId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  billId: z.number().int().positive(),
  commentType: z.enum(["general", "expert_analysis", "concern", "support"]).default("general"),
  isVerified: z.boolean().default(false),
  parentCommentId: z.number().int().positive().optional(),
  upvotes: z.number().int().min(0).default(0),
  downvotes: z.number().int().min(0).default(0),
});

export const insertSponsorSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(100),
  party: z.string().max(100).optional(),
  constituency: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional(),
  conflictLevel: z.enum(["low", "medium", "high"]).optional(),
});

export const insertAnalysisSchema = z.object({
  billId: z.number().int().positive(),
  analysisType: z.enum(["constitutional", "stakeholder", "impact", "complexity"]),
  results: z.any().optional(),
  confidence: z.number().min(0).max(1).optional(),
  modelVersion: z.string().max(50).optional(),
  isApproved: z.boolean().default(false),
  approvedBy: z.string().uuid().optional(),
});

export const insertStakeholderSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  organization: z.string().max(255).optional(),
  sector: z.string().max(100).optional(),
  type: z.enum(["business", "ngo", "agency", "individual"]),
  influence: z.number().min(0).max(100).default(0),
  votingHistory: z.any().optional(),
});

export const insertNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  relatedBillId: z.number().int().positive().optional(),
  isRead: z.boolean().default(false),
});

export const insertComplianceCheckSchema = z.object({
  checkName: z.string().min(1).max(255),
  checkType: z.enum(["gdpr", "ccpa", "sox", "pci_dss", "custom"]),
  description: z.string().optional(),
  status: z.enum(["passing", "failing", "warning", "not_applicable"]).default("passing"),
  findings: z.any().optional(),
  remediation: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  automated: z.boolean().default(true),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Session = typeof sessions.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type UserSocialProfile = typeof userSocialProfiles.$inferSelect;
export type UserInterest = typeof userInterests.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillTag = typeof billTags.$inferSelect;
export type BillSponsorship = typeof billSponsorships.$inferSelect;

export type BillComment = typeof billComments.$inferSelect;
export type InsertBillComment = z.infer<typeof insertBillCommentSchema>;
export type CommentVote = typeof commentVotes.$inferSelect;

export type BillEngagement = typeof billEngagement.$inferSelect;
export type SocialShare = typeof socialShares.$inferSelect;

export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type SponsorAffiliation = typeof sponsorAffiliations.$inferSelect;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;

export type Analysis = typeof analysis.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type BillSectionConflict = typeof billSectionConflicts.$inferSelect;
export type ExpertVerification = typeof expertVerifications.$inferSelect;
export type CitizenVerification = typeof citizenVerifications.$inferSelect;

export type Stakeholder = typeof stakeholders.$inferSelect;
export type InsertStakeholder = z.infer<typeof insertStakeholderSchema>;

export type ModerationFlag = typeof moderationFlags.$inferSelect;
export type ModerationAction = typeof moderationActions.$inferSelect;

export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;
export type ThreatIntelligence = typeof threatIntelligence.$inferSelect;

export type Regulation = typeof regulations.$inferSelect;
export type RegulatoryChange = typeof regulatoryChanges.$inferSelect;
export type RegulatoryImpact = typeof regulatoryImpact.$inferSelect;

export type SyncJob = typeof syncJobs.$inferSelect;
export type SyncError = typeof syncErrors.$inferSelect;
export type Conflict = typeof conflicts.$inferSelect;
export type ConflictSource = typeof conflictSources.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Department = typeof departments.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;

// ============================================================================
// EXTENDED TYPES WITH COMPUTED FIELDS
// ============================================================================

export type CommentWithEngagement = BillComment & {
  endorsements?: number;
  isHighlighted?: boolean;
  author?: Pick<User, 'id' | 'name' | 'role'>;
  replies?: CommentWithEngagement[];
  voteCount?: number;
};

export type BillWithDetails = Bill & {
  sponsor?: Sponsor;
  commentCount?: number;
  engagementScore?: number;
  tags?: BillTag[];
  analysisData?: Analysis[];
};

export type UserWithProfile = User & {
  profile?: UserProfile;
  interests?: string[];
  progressData?: UserProgress[];
};

export type SponsorWithTransparency = Sponsor & {
  affiliations?: SponsorAffiliation[];
  transparencyRecords?: SponsorTransparency[];
  billCount?: number;
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
};

export type SecurityMetrics = {
  totalThreats: number;
  activeThreats: number;
  blockedIps: number;
  recentAuditLogs: SecurityAuditLog[];
};






