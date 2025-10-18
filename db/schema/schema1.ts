/**
 * DEPRECATED: This schema file is deprecated and will be removed.
 * Use shared/schema.ts as the authoritative schema definition.
 * This file is kept temporarily for migration purposes only.
 *
 * @deprecated Use shared/schema.ts instead
 */

import { pgTable, uniqueIndex, index, foreignKey, serial, text, integer, numeric, jsonb, timestamp, uuid, boolean, varchar, unique, check, inet, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bills = pgTable("bills", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	content: text(),
	summary: text(),
	status: text().default('introduced').notNull(),
	billNumber: text("bill_number"),
	sponsorId: integer("sponsor_id"),
	category: text(),
	tags: text().array().default([""]),
	viewCount: integer("view_count").default(0).notNull(),
	shareCount: integer("share_count").default(0).notNull(),
	commentCount: integer("comment_count").default(0).notNull(),
	engagementScore: numeric("engagement_score", { precision: 10, scale:  2 }).default('0').notNull(),
	complexityScore: integer("complexity_score"),
	constitutionalConcerns: jsonb("constitutional_concerns").default([]),
	stakeholderAnalysis: jsonb("stakeholder_analysis").default({}),
	introducedDate: timestamp("introduced_date", { mode: 'string' }),
	lastActionDate: timestamp("last_action_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	// search_vector is stored in Postgres as tsvector (see SQL migrations).
	// Drizzle in this repo doesn't provide a tsvector builder; use text here so the deprecated schema compiles.
	// The authoritative schema and migration live in shared/schema and drizzle/*.sql respectively.
	searchVector: text("search_vector"),
}, (table) => {
	return {
		billNumberIdx: uniqueIndex("bills_bill_number_idx").using("btree", table.billNumber.asc().nullsLast()),
		categoryIdx: index("bills_category_idx").using("btree", table.category.asc().nullsLast()),
		engagementScoreIdx: index("bills_engagement_score_idx").using("btree", table.engagementScore.asc().nullsLast()),
		introducedDateIdx: index("bills_introduced_date_idx").using("btree", table.introducedDate.asc().nullsLast()),
		sponsorIdIdx: index("bills_sponsor_id_idx").using("btree", table.sponsorId.asc().nullsLast()),
		statusIdx: index("bills_status_idx").using("btree", table.status.asc().nullsLast()),
		idxBillsCategoryDate: index("idx_bills_category_date").using("btree", table.category.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxBillsSearchVector: index("idx_bills_search_vector").using("gin", table.searchVector.asc().nullsLast()),
		idxBillsSponsorStatus: index("idx_bills_sponsor_status").using("btree", table.sponsorId.asc().nullsLast(), table.status.asc().nullsLast()),
		idxBillsStatusCategoryDate: index("idx_bills_status_category_date").using("btree", table.status.asc().nullsLast(), table.category.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxBillsStatusDate: index("idx_bills_status_date").using("btree", table.status.asc().nullsLast(), table.lastActionDate.desc().nullsFirst()),
		idxBillsViewCount: index("idx_bills_view_count").using("btree", table.viewCount.desc().nullsFirst()),
		billsSponsorIdSponsorsIdFk: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "bills_sponsor_id_sponsors_id_fk"
		}).onDelete("set null"),
	}
});

export const billEngagement = pgTable("bill_engagement", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	userId: uuid("user_id").notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	commentCount: integer("comment_count").default(0).notNull(),
	shareCount: integer("share_count").default(0).notNull(),
	engagementScore: numeric("engagement_score", { precision: 10, scale:  2 }).default('0').notNull(),
	lastEngaged: timestamp("last_engaged", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billUserIdx: uniqueIndex("bill_engagement_bill_user_idx").using("btree", table.billId.asc().nullsLast(), table.userId.asc().nullsLast()),
		lastEngagedIdx: index("bill_engagement_last_engaged_idx").using("btree", table.lastEngaged.asc().nullsLast()),
		scoreIdx: index("bill_engagement_score_idx").using("btree", table.engagementScore.asc().nullsLast()),
		userIdIdx: index("bill_engagement_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		idxBillEngagementBillScore: index("idx_bill_engagement_bill_score").using("btree", table.billId.asc().nullsLast(), table.engagementScore.desc().nullsFirst()),
		idxBillEngagementLastEngaged: index("idx_bill_engagement_last_engaged").using("btree", table.lastEngaged.desc().nullsFirst()),
		idxBillEngagementUserScore: index("idx_bill_engagement_user_score").using("btree", table.userId.asc().nullsLast(), table.engagementScore.desc().nullsFirst()),
		billEngagementBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_engagement_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		billEngagementUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bill_engagement_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const billComments = pgTable("bill_comments", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text().notNull(),
	commentType: text("comment_type").default('general').notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	parentCommentId: integer("parent_comment_id"),
	upvotes: integer().default(0).notNull(),
	downvotes: integer().default(0).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billIdIdx: index("bill_comments_bill_id_idx").using("btree", table.billId.asc().nullsLast()),
		createdAtIdx: index("bill_comments_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		parentCommentIdIdx: index("bill_comments_parent_comment_id_idx").using("btree", table.parentCommentId.asc().nullsLast()),
		userIdIdx: index("bill_comments_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		idxBillCommentsBillCreated: index("idx_bill_comments_bill_created").using("btree", table.billId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxBillCommentsBillParentCreated: index("idx_bill_comments_bill_parent_created").using("btree", table.billId.asc().nullsLast(), table.parentCommentId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxBillCommentsParent: index("idx_bill_comments_parent").using("btree", table.parentCommentId.asc().nullsLast()).where(sql`(parent_comment_id IS NOT NULL)`),
		idxBillCommentsUserCreated: index("idx_bill_comments_user_created").using("btree", table.userId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxBillCommentsVotes: index("idx_bill_comments_votes").using("btree", table.upvotes.desc().nullsFirst(), table.downvotes.asc().nullsLast()),
		billCommentsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_comments_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		billCommentsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bill_comments_user_id_users_id_fk"
		}).onDelete("cascade"),
		billCommentsParentCommentIdBillCommentsIdFk: foreignKey({
			columns: [table.parentCommentId],
			foreignColumns: [table.id],
			name: "bill_comments_parent_comment_id_bill_comments_id_fk"
		}).onDelete("cascade"),
	}
});

export const billTags = pgTable("bill_tags", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	tag: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billTagIdx: uniqueIndex("bill_tags_bill_tag_idx").using("btree", table.billId.asc().nullsLast(), table.tag.asc().nullsLast()),
		tagIdx: index("bill_tags_tag_idx").using("btree", table.tag.asc().nullsLast()),
		billTagsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_tags_bill_id_bills_id_fk"
		}).onDelete("cascade"),
	}
});

export const citizenVerifications = pgTable("citizen_verifications", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	citizenId: uuid("citizen_id").notNull(),
	verificationType: varchar("verification_type", { length: 50 }).notNull(),
	verificationStatus: varchar("verification_status", { length: 50 }).default('pending').notNull(),
	confidence: integer().default(0).notNull(),
	evidence: jsonb().default([]).notNull(),
	expertise: jsonb().default({}).notNull(),
	reasoning: text().notNull(),
	endorsements: integer().default(0).notNull(),
	disputes: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billCitizenIdx: uniqueIndex("citizen_verifications_bill_citizen_idx").using("btree", table.billId.asc().nullsLast(), table.citizenId.asc().nullsLast(), table.verificationType.asc().nullsLast()),
		billIdIdx: index("citizen_verifications_bill_id_idx").using("btree", table.billId.asc().nullsLast()),
		citizenIdIdx: index("citizen_verifications_citizen_id_idx").using("btree", table.citizenId.asc().nullsLast()),
		statusIdx: index("citizen_verifications_status_idx").using("btree", table.verificationStatus.asc().nullsLast()),
		citizenVerificationsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "citizen_verifications_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		citizenVerificationsCitizenIdUsersIdFk: foreignKey({
			columns: [table.citizenId],
			foreignColumns: [users.id],
			name: "citizen_verifications_citizen_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const billSectionConflicts = pgTable("bill_section_conflicts", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	sectionNumber: text("section_number").notNull(),
	conflictType: text("conflict_type").notNull(),
	severity: text().notNull(),
	description: text().notNull(),
	recommendation: text(),
	isResolved: boolean("is_resolved").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billIdIdx: index("bill_section_conflicts_bill_id_idx").using("btree", table.billId.asc().nullsLast()),
		isResolvedIdx: index("bill_section_conflicts_is_resolved_idx").using("btree", table.isResolved.asc().nullsLast()),
		severityIdx: index("bill_section_conflicts_severity_idx").using("btree", table.severity.asc().nullsLast()),
		billSectionConflictsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_section_conflicts_bill_id_bills_id_fk"
		}).onDelete("cascade"),
	}
});

export const commentVotes = pgTable("comment_votes", {
	id: serial().primaryKey().notNull(),
	commentId: integer("comment_id").notNull(),
	userId: uuid("user_id").notNull(),
	voteType: text("vote_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		commentUserIdx: uniqueIndex("comment_votes_comment_user_idx").using("btree", table.commentId.asc().nullsLast(), table.userId.asc().nullsLast()),
		userIdIdx: index("comment_votes_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		commentVotesCommentIdBillCommentsIdFk: foreignKey({
			columns: [table.commentId],
			foreignColumns: [billComments.id],
			name: "comment_votes_comment_id_bill_comments_id_fk"
		}).onDelete("cascade"),
		commentVotesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comment_votes_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const conflicts = pgTable("conflicts", {
	id: text().primaryKey().notNull(),
	dataType: text("data_type").notNull(),
	recordId: text("record_id").notNull(),
	resolution: text().default('pending').notNull(),
	resolvedValue: text("resolved_value"),
	resolvedBy: text("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	confidence: numeric({ precision: 3, scale:  2 }).default('0.00').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		dataTypeRecordIdx: uniqueIndex("conflicts_data_type_record_idx").using("btree", table.dataType.asc().nullsLast(), table.recordId.asc().nullsLast()),
		resolutionIdx: index("conflicts_resolution_idx").using("btree", table.resolution.asc().nullsLast()),
	}
});

export const complianceChecks = pgTable("compliance_checks", {
	id: serial().primaryKey().notNull(),
	checkName: text("check_name").notNull(),
	checkType: text("check_type").notNull(),
	description: text(),
	status: text().default('passing').notNull(),
	lastChecked: timestamp("last_checked", { mode: 'string' }).defaultNow().notNull(),
	nextCheck: timestamp("next_check", { mode: 'string' }),
	findings: jsonb().default([]),
	remediation: text(),
	priority: text().default('medium').notNull(),
	automated: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		checkTypeIdx: index("compliance_checks_check_type_idx").using("btree", table.checkType.asc().nullsLast()),
		nextCheckIdx: index("compliance_checks_next_check_idx").using("btree", table.nextCheck.asc().nullsLast()),
		priorityIdx: index("compliance_checks_priority_idx").using("btree", table.priority.asc().nullsLast()),
		statusIdx: index("compliance_checks_status_idx").using("btree", table.status.asc().nullsLast()),
	}
});

export const billSponsorships = pgTable("bill_sponsorships", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	sponsorId: integer("sponsor_id").notNull(),
	sponsorshipType: text("sponsorship_type").notNull(),
	sponsorshipDate: timestamp("sponsorship_date", { mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billIdIdx: index("bill_sponsorships_bill_id_idx").using("btree", table.billId.asc().nullsLast()),
		billSponsorIdx: uniqueIndex("bill_sponsorships_bill_sponsor_idx").using("btree", table.billId.asc().nullsLast(), table.sponsorId.asc().nullsLast()),
		isActiveIdx: index("bill_sponsorships_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		sponsorIdIdx: index("bill_sponsorships_sponsor_id_idx").using("btree", table.sponsorId.asc().nullsLast()),
		idxBillSponsorshipsBillType: index("idx_bill_sponsorships_bill_type").using("btree", table.billId.asc().nullsLast(), table.sponsorshipType.asc().nullsLast()),
		idxBillSponsorshipsSponsorActive: index("idx_bill_sponsorships_sponsor_active").using("btree", table.sponsorId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		billSponsorshipsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_sponsorships_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		billSponsorshipsSponsorIdSponsorsIdFk: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "bill_sponsorships_sponsor_id_sponsors_id_fk"
		}).onDelete("cascade"),
	}
});

export const contentAnalysis = pgTable("content_analysis", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	toxicityScore: numeric("toxicity_score", { precision: 5, scale:  4 }).default('0').notNull(),
	spamScore: numeric("spam_score", { precision: 5, scale:  4 }).default('0').notNull(),
	sentimentScore: numeric("sentiment_score", { precision: 5, scale:  4 }).default('0.5').notNull(),
	readabilityScore: numeric("readability_score", { precision: 5, scale:  4 }).default('0.5').notNull(),
	flags: text().array().default([""]),
	confidence: numeric({ precision: 5, scale:  4 }).default('0.8').notNull(),
	modelVersion: text("model_version").default('1.0').notNull(),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		contentIdx: uniqueIndex("content_analysis_content_idx").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		spamIdx: index("content_analysis_spam_idx").using("btree", table.spamScore.asc().nullsLast()),
		toxicityIdx: index("content_analysis_toxicity_idx").using("btree", table.toxicityScore.asc().nullsLast()),
	}
});

export const drizzleMigrations = pgTable("drizzle_migrations", {
	id: serial().primaryKey().notNull(),
	hash: varchar({ length: 255 }).notNull(),
	filename: text().notNull(),
	executedAt: timestamp("executed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	rollbackSql: text("rollback_sql"),
	checksum: varchar({ length: 255 }).notNull(),
	executionTimeMs: integer("execution_time_ms"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxDrizzleMigrationsExecutedAt: index("idx_drizzle_migrations_executed_at").using("btree", table.executedAt.asc().nullsLast()),
		idxDrizzleMigrationsFilename: index("idx_drizzle_migrations_filename").using("btree", table.filename.asc().nullsLast()),
		idxDrizzleMigrationsHash: index("idx_drizzle_migrations_hash").using("btree", table.hash.asc().nullsLast()),
		drizzleMigrationsHashKey: unique("drizzle_migrations_hash_key").on(table.hash),
	}
});

export const expertVerifications = pgTable("expert_verifications", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	expertId: uuid("expert_id").notNull(),
	verificationStatus: text("verification_status").notNull(),
	confidence: numeric({ precision: 5, scale:  4 }).default('0'),
	feedback: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billExpertIdx: uniqueIndex("expert_verifications_bill_expert_idx").using("btree", table.billId.asc().nullsLast(), table.expertId.asc().nullsLast()),
		expertIdIdx: index("expert_verifications_expert_id_idx").using("btree", table.expertId.asc().nullsLast()),
		statusIdx: index("expert_verifications_status_idx").using("btree", table.verificationStatus.asc().nullsLast()),
		expertVerificationsBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "expert_verifications_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		expertVerificationsExpertIdUsersIdFk: foreignKey({
			columns: [table.expertId],
			foreignColumns: [users.id],
			name: "expert_verifications_expert_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const moderationActions = pgTable("moderation_actions", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	actionType: text("action_type").notNull(),
	reason: text().notNull(),
	moderatorId: uuid("moderator_id").notNull(),
	duration: integer(),
	isReversible: boolean("is_reversible").default(true).notNull(),
	reversedAt: timestamp("reversed_at", { mode: 'string' }),
	reversedBy: uuid("reversed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		actionTypeIdx: index("moderation_actions_action_type_idx").using("btree", table.actionType.asc().nullsLast()),
		contentIdx: index("moderation_actions_content_idx").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		moderatorIdIdx: index("moderation_actions_moderator_id_idx").using("btree", table.moderatorId.asc().nullsLast()),
		moderationActionsModeratorIdUsersIdFk: foreignKey({
			columns: [table.moderatorId],
			foreignColumns: [users.id],
			name: "moderation_actions_moderator_id_users_id_fk"
		}).onDelete("cascade"),
		moderationActionsReversedByUsersIdFk: foreignKey({
			columns: [table.reversedBy],
			foreignColumns: [users.id],
			name: "moderation_actions_reversed_by_users_id_fk"
		}).onDelete("set null"),
	}
});

export const moderationFlags = pgTable("moderation_flags", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	flagType: text("flag_type").notNull(),
	reason: text().notNull(),
	reportedBy: uuid("reported_by").notNull(),
	status: text().default('pending').notNull(),
	severity: text().default('medium').notNull(),
	autoDetected: boolean("auto_detected").default(false).notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		contentIdx: index("moderation_flags_content_idx").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		reportedByIdx: index("moderation_flags_reported_by_idx").using("btree", table.reportedBy.asc().nullsLast()),
		severityIdx: index("moderation_flags_severity_idx").using("btree", table.severity.asc().nullsLast()),
		statusIdx: index("moderation_flags_status_idx").using("btree", table.status.asc().nullsLast()),
		moderationFlagsReportedByUsersIdFk: foreignKey({
			columns: [table.reportedBy],
			foreignColumns: [users.id],
			name: "moderation_flags_reported_by_users_id_fk"
		}).onDelete("cascade"),
		moderationFlagsReviewedByUsersIdFk: foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "moderation_flags_reviewed_by_users_id_fk"
		}).onDelete("set null"),
	}
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	relatedBillId: integer("related_bill_id"),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxNotificationsTypeCreated: index("idx_notifications_type_created").using("btree", table.type.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxNotificationsUserUnread: index("idx_notifications_user_unread").using("btree", table.userId.asc().nullsLast(), table.isRead.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		createdAtIdx: index("notifications_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		isReadIdx: index("notifications_is_read_idx").using("btree", table.isRead.asc().nullsLast()),
		typeIdx: index("notifications_type_idx").using("btree", table.type.asc().nullsLast()),
		userIdIdx: index("notifications_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		userReadIdx: index("notifications_user_read_idx").using("btree", table.userId.asc().nullsLast(), table.isRead.asc().nullsLast()),
		notificationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
		notificationsRelatedBillIdBillsIdFk: foreignKey({
			columns: [table.relatedBillId],
			foreignColumns: [bills.id],
			name: "notifications_related_bill_id_bills_id_fk"
		}).onDelete("cascade"),
	}
});

export const passwordResets = pgTable("password_resets", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		expiresAtIdx: index("password_resets_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
		tokenHashIdx: uniqueIndex("password_resets_token_hash_idx").using("btree", table.tokenHash.asc().nullsLast()),
		userIdIdx: index("password_resets_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		passwordResetsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_resets_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const refreshTokens = pgTable("refresh_tokens", {
	id: serial().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isRevoked: boolean("is_revoked").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		expiresAtIdx: index("refresh_tokens_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
		sessionIdIdx: index("refresh_tokens_session_id_idx").using("btree", table.sessionId.asc().nullsLast()),
		tokenHashIdx: uniqueIndex("refresh_tokens_token_hash_idx").using("btree", table.tokenHash.asc().nullsLast()),
		refreshTokensSessionIdSessionsIdFk: foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "refresh_tokens_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	}
});

export const departments = pgTable("departments", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		isActiveIdx: index("departments_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		nameIdx: uniqueIndex("departments_name_idx").using("btree", table.name.asc().nullsLast()),
	}
});

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	token: text(),
}, (table) => {
	return {
		idxSessionsExpiresAt: index("idx_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast()),
		idxSessionsUserActive: index("idx_sessions_user_active").using("btree", table.userId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		expiresAtIdx: index("sessions_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
		isActiveIdx: index("sessions_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		userIdIdx: index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		sessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const regulatoryImpact = pgTable("regulatory_impact", {
	id: serial().primaryKey().notNull(),
	regulationId: uuid("regulation_id").notNull(),
	sector: text(),
	impactLevel: text("impact_level"),
	affectedEntities: jsonb("affected_entities").default([]),
	mitigation: jsonb().default({}),
	impactScore: numeric("impact_score", { precision: 5, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		impactLevelIdx: index("regulatory_impact_impact_level_idx").using("btree", table.impactLevel.asc().nullsLast()),
		regulationIdIdx: index("regulatory_impact_regulation_id_idx").using("btree", table.regulationId.asc().nullsLast()),
		sectorIdx: index("regulatory_impact_sector_idx").using("btree", table.sector.asc().nullsLast()),
		regulatoryImpactRegulationIdRegulationsIdFk: foreignKey({
			columns: [table.regulationId],
			foreignColumns: [regulations.id],
			name: "regulatory_impact_regulation_id_regulations_id_fk"
		}).onDelete("cascade"),
	}
});

export const socialShares = pgTable("social_shares", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	platform: text().notNull(),
	userId: uuid("user_id").notNull(),
	metadata: jsonb().default({}),
	shareDate: timestamp("share_date", { mode: 'string' }).defaultNow().notNull(),
	likes: integer().default(0).notNull(),
	shares: integer().default(0).notNull(),
	comments: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billIdIdx: index("social_shares_bill_id_idx").using("btree", table.billId.asc().nullsLast()),
		platformIdx: index("social_shares_platform_idx").using("btree", table.platform.asc().nullsLast()),
		shareDateIdx: index("social_shares_share_date_idx").using("btree", table.shareDate.asc().nullsLast()),
		userIdIdx: index("social_shares_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		socialSharesBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "social_shares_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		socialSharesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "social_shares_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const regulations = pgTable("regulations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	content: text(),
	status: text().default('proposed').notNull(),
	source: text(),
	sector: text(),
	tags: text().array().default([""]),
	sponsorId: integer("sponsor_id"),
	effectiveDate: timestamp("effective_date", { mode: 'string' }),
	complianceDeadline: timestamp("compliance_deadline", { mode: 'string' }),
	affectedStakeholders: integer("affected_stakeholders").default(0),
	estimatedImpact: numeric("estimated_impact", { precision: 10, scale:  2 }).default('0'),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		effectiveDateIdx: index("regulations_effective_date_idx").using("btree", table.effectiveDate.asc().nullsLast()),
		sectorIdx: index("regulations_sector_idx").using("btree", table.sector.asc().nullsLast()),
		statusIdx: index("regulations_status_idx").using("btree", table.status.asc().nullsLast()),
		regulationsSponsorIdSponsorsIdFk: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "regulations_sponsor_id_sponsors_id_fk"
		}).onDelete("set null"),
	}
});

export const sponsorAffiliations = pgTable("sponsor_affiliations", {
	id: serial().primaryKey().notNull(),
	sponsorId: integer("sponsor_id").notNull(),
	organization: text().notNull(),
	role: text(),
	type: text().notNull(),
	conflictType: text("conflict_type"),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxSponsorAffiliationsActive: index("idx_sponsor_affiliations_active").using("btree", table.sponsorId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		isActiveIdx: index("sponsor_affiliations_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		organizationIdx: index("sponsor_affiliations_organization_idx").using("btree", table.organization.asc().nullsLast()),
		sponsorIdIdx: index("sponsor_affiliations_sponsor_id_idx").using("btree", table.sponsorId.asc().nullsLast()),
		sponsorAffiliationsSponsorIdSponsorsIdFk: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "sponsor_affiliations_sponsor_id_sponsors_id_fk"
		}).onDelete("cascade"),
	}
});

export const sponsorTransparency = pgTable("sponsor_transparency", {
	id: serial().primaryKey().notNull(),
	sponsorId: integer("sponsor_id").notNull(),
	disclosureType: text("disclosure_type").notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }),
	source: text(),
	dateReported: timestamp("date_reported", { mode: 'string' }),
	isVerified: boolean("is_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		disclosureTypeIdx: index("sponsor_transparency_disclosure_type_idx").using("btree", table.disclosureType.asc().nullsLast()),
		isVerifiedIdx: index("sponsor_transparency_is_verified_idx").using("btree", table.isVerified.asc().nullsLast()),
		sponsorIdIdx: index("sponsor_transparency_sponsor_id_idx").using("btree", table.sponsorId.asc().nullsLast()),
		sponsorTransparencySponsorIdSponsorsIdFk: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "sponsor_transparency_sponsor_id_sponsors_id_fk"
		}).onDelete("cascade"),
	}
});

export const sponsors = pgTable("sponsors", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	role: text().notNull(),
	party: text(),
	constituency: text(),
	email: text(),
	phone: text(),
	bio: text(),
	photoUrl: text("photo_url"),
	conflictLevel: text("conflict_level"),
	financialExposure: numeric("financial_exposure", { precision: 12, scale:  2 }).default('0'),
	votingAlignment: numeric("voting_alignment", { precision: 5, scale:  2 }).default('0'),
	transparencyScore: numeric("transparency_score", { precision: 5, scale:  2 }).default('0'),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxSponsorsConflictLevel: index("idx_sponsors_conflict_level").using("btree", table.conflictLevel.asc().nullsLast()),
		idxSponsorsTransparencyScore: index("idx_sponsors_transparency_score").using("btree", table.transparencyScore.desc().nullsFirst()),
		sponsorNameIdx: index("sponsor_name_idx").using("btree", table.name.asc().nullsLast()),
		sponsorPartyIdx: index("sponsor_party_idx").using("btree", table.party.asc().nullsLast()),
		isActiveIdx: index("sponsors_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		nameEmailIdx: uniqueIndex("sponsors_name_email_idx").using("btree", table.name.asc().nullsLast(), table.email.asc().nullsLast()),
		nameIdx: index("sponsors_name_idx").using("btree", table.name.asc().nullsLast()),
		partyIdx: index("sponsors_party_idx").using("btree", table.party.asc().nullsLast()),
	}
});

export const regulatoryChanges = pgTable("regulatory_changes", {
	id: serial().primaryKey().notNull(),
	regulationId: uuid("regulation_id").notNull(),
	changeType: text("change_type"),
	changesRequirements: boolean("changes_requirements").default(false).notNull(),
	shortensDeadline: boolean("shortens_deadline").default(false).notNull(),
	addsCosts: boolean("adds_costs").default(false).notNull(),
	affectsCompliance: boolean("affects_compliance").default(false).notNull(),
	details: jsonb().default({}),
	changedAt: timestamp("changed_at", { mode: 'string' }).defaultNow().notNull(),
	reportedBy: uuid("reported_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		changeTypeIdx: index("regulatory_changes_change_type_idx").using("btree", table.changeType.asc().nullsLast()),
		changedAtIdx: index("regulatory_changes_changed_at_idx").using("btree", table.changedAt.asc().nullsLast()),
		regulationIdIdx: index("regulatory_changes_regulation_id_idx").using("btree", table.regulationId.asc().nullsLast()),
		regulatoryChangesRegulationIdRegulationsIdFk: foreignKey({
			columns: [table.regulationId],
			foreignColumns: [regulations.id],
			name: "regulatory_changes_regulation_id_regulations_id_fk"
		}).onDelete("cascade"),
		regulatoryChangesReportedByUsersIdFk: foreignKey({
			columns: [table.reportedBy],
			foreignColumns: [users.id],
			name: "regulatory_changes_reported_by_users_id_fk"
		}).onDelete("set null"),
	}
});

export const stakeholders = pgTable("stakeholders", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text(),
	organization: text(),
	sector: text(),
	type: text().notNull(),
	influence: numeric({ precision: 5, scale:  2 }).default('0.00').notNull(),
	votingHistory: jsonb("voting_history").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		nameIdx: index("stakeholders_name_idx").using("btree", table.name.asc().nullsLast()),
		sectorIdx: index("stakeholders_sector_idx").using("btree", table.sector.asc().nullsLast()),
		typeIdx: index("stakeholders_type_idx").using("btree", table.type.asc().nullsLast()),
	}
});

export const userInterests = pgTable("user_interests", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	interest: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxUserInterestsUserInterest: index("idx_user_interests_user_interest").using("btree", table.userId.asc().nullsLast(), table.interest.asc().nullsLast()),
		interestIdx: index("user_interests_interest_idx").using("btree", table.interest.asc().nullsLast()),
		userInterestIdx: uniqueIndex("user_interests_user_interest_idx").using("btree", table.userId.asc().nullsLast(), table.interest.asc().nullsLast()),
		userInterestsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_interests_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const userProfiles = pgTable("user_profiles", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	bio: text(),
	expertise: text().array().default([""]),
	location: text(),
	organization: text(),
	verificationDocuments: jsonb("verification_documents").default([]),
	reputationScore: integer("reputation_score").default(0).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxUserProfilesReputation: index("idx_user_profiles_reputation").using("btree", table.reputationScore.desc().nullsFirst()),
		reputationIdx: index("user_profiles_reputation_idx").using("btree", table.reputationScore.asc().nullsLast()),
		userIdIdx: uniqueIndex("user_profiles_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		userProfilesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
		reputationScoreCheck: check("reputation_score_check", sql`reputation_score >= 0`),
	}
});

export const threatIntelligence = pgTable("threat_intelligence", {
	id: serial().primaryKey().notNull(),
	ipAddress: text("ip_address").notNull(),
	threatType: text("threat_type").notNull(),
	severity: text().default('medium').notNull(),
	source: text().notNull(),
	description: text(),
	firstSeen: timestamp("first_seen", { mode: 'string' }).defaultNow().notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).defaultNow().notNull(),
	occurrences: integer().default(1).notNull(),
	blocked: boolean().default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		ipAddressIdx: uniqueIndex("threat_intelligence_ip_address_idx").using("btree", table.ipAddress.asc().nullsLast()),
		isActiveIdx: index("threat_intelligence_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		severityIdx: index("threat_intelligence_severity_idx").using("btree", table.severity.asc().nullsLast()),
		threatTypeIdx: index("threat_intelligence_threat_type_idx").using("btree", table.threatType.asc().nullsLast()),
	}
});

export const userProgress = pgTable("user_progress", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	achievementType: text("achievement_type").notNull(),
	achievementValue: integer("achievement_value").default(0).notNull(),
	level: integer().default(1),
	badge: text(),
	description: text(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		achievementTypeIdx: index("user_progress_achievement_type_idx").using("btree", table.achievementType.asc().nullsLast()),
		userAchievementIdx: uniqueIndex("user_progress_user_achievement_idx").using("btree", table.userId.asc().nullsLast(), table.achievementType.asc().nullsLast()),
		userIdIdx: index("user_progress_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		userProgressUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_progress_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const userSocialProfiles = pgTable("user_social_profiles", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	providerId: text("provider_id").notNull(),
	username: text(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		providerIdIdx: index("user_social_profiles_provider_id_idx").using("btree", table.providerId.asc().nullsLast()),
		userProviderIdx: uniqueIndex("user_social_profiles_user_provider_idx").using("btree", table.userId.asc().nullsLast(), table.provider.asc().nullsLast()),
		userSocialProfilesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_social_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const conflictSources = pgTable("conflict_sources", {
	id: serial().primaryKey().notNull(),
	conflictId: text("conflict_id").notNull(),
	sourceId: text("source_id").notNull(),
	sourceName: text("source_name").notNull(),
	value: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	priority: numeric({ precision: 3, scale:  2 }).notNull(),
	confidence: numeric({ precision: 3, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		conflictIdIdx: index("conflict_sources_conflict_id_idx").using("btree", table.conflictId.asc().nullsLast()),
		sourceIdIdx: index("conflict_sources_source_id_idx").using("btree", table.sourceId.asc().nullsLast()),
		conflictSourcesConflictIdConflictsIdFk: foreignKey({
			columns: [table.conflictId],
			foreignColumns: [conflicts.id],
			name: "conflict_sources_conflict_id_conflicts_id_fk"
		}).onDelete("cascade"),
	}
});

export const analysis = pgTable("analysis", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	analysisType: text("analysis_type").notNull(),
	results: jsonb().default({}),
	confidence: numeric({ precision: 5, scale:  4 }).default('0'),
	modelVersion: text("model_version"),
	isApproved: boolean("is_approved").default(false).notNull(),
	approvedBy: uuid("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		billTypeIdx: uniqueIndex("analysis_bill_type_idx").using("btree", table.billId.asc().nullsLast(), table.analysisType.asc().nullsLast()),
		isApprovedIdx: index("analysis_is_approved_idx").using("btree", table.isApproved.asc().nullsLast()),
		typeIdx: index("analysis_type_idx").using("btree", table.analysisType.asc().nullsLast()),
		analysisBillIdBillsIdFk: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "analysis_bill_id_bills_id_fk"
		}).onDelete("cascade"),
		analysisApprovedByUsersIdFk: foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "analysis_approved_by_users_id_fk"
		}).onDelete("set null"),
	}
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	name: text().notNull(),
	role: text().default('citizen').notNull(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	preferences: jsonb().default({}),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxUsersEmailActive: index("idx_users_email_active").using("btree", table.email.asc().nullsLast()).where(sql`(is_active = true)`),
		idxUsersVerificationStatus: index("idx_users_verification_status").using("btree", table.verificationStatus.asc().nullsLast()),
		activeVerifiedIdx: index("users_active_verified_idx").using("btree", table.isActive.asc().nullsLast(), table.verificationStatus.asc().nullsLast()),
		emailIdx: uniqueIndex("users_email_idx").using("btree", table.email.asc().nullsLast()),
		roleIdx: index("users_role_idx").using("btree", table.role.asc().nullsLast()),
		verificationStatusIdx: index("users_verification_status_idx").using("btree", table.verificationStatus.asc().nullsLast()),
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const evaluations = pgTable("evaluations", {
	id: serial().primaryKey().notNull(),
	candidateName: text("candidate_name").notNull(),
	departmentId: integer("department_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		departmentIdIdx: index("evaluations_department_id_idx").using("btree", table.departmentId.asc().nullsLast()),
		statusIdx: index("evaluations_status_idx").using("btree", table.status.asc().nullsLast()),
		evaluationsDepartmentIdDepartmentsIdFk: foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "evaluations_department_id_departments_id_fk"
		}).onDelete("cascade"),
	}
});

export const syncJobs = pgTable("sync_jobs", {
	id: text().primaryKey().notNull(),
	dataSourceId: text("data_source_id").notNull(),
	endpointId: text("endpoint_id").notNull(),
	status: text().default('pending').notNull(),
	startTime: timestamp("start_time", { mode: 'string' }),
	endTime: timestamp("end_time", { mode: 'string' }),
	recordsProcessed: integer("records_processed").default(0).notNull(),
	recordsUpdated: integer("records_updated").default(0).notNull(),
	recordsCreated: integer("records_created").default(0).notNull(),
	recordsSkipped: integer("records_skipped").default(0).notNull(),
	isIncremental: boolean("is_incremental").default(true).notNull(),
	lastSyncTimestamp: timestamp("last_sync_timestamp", { mode: 'string' }),
	nextRunTime: timestamp("next_run_time", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		dataSourceIdx: index("sync_jobs_data_source_idx").using("btree", table.dataSourceId.asc().nullsLast()),
		nextRunTimeIdx: index("sync_jobs_next_run_time_idx").using("btree", table.nextRunTime.asc().nullsLast()),
		statusIdx: index("sync_jobs_status_idx").using("btree", table.status.asc().nullsLast()),
	}
});

export const syncErrors = pgTable("sync_errors", {
	id: serial().primaryKey().notNull(),
	jobId: text("job_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	level: text().notNull(),
	message: text().notNull(),
	details: text(),
	recordId: text("record_id"),
	endpoint: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		jobIdIdx: index("sync_errors_job_id_idx").using("btree", table.jobId.asc().nullsLast()),
		levelIdx: index("sync_errors_level_idx").using("btree", table.level.asc().nullsLast()),
		timestampIdx: index("sync_errors_timestamp_idx").using("btree", table.timestamp.asc().nullsLast()),
		syncErrorsJobIdSyncJobsIdFk: foreignKey({
			columns: [table.jobId],
			foreignColumns: [syncJobs.id],
			name: "sync_errors_job_id_sync_jobs_id_fk"
		}).onDelete("cascade"),
	}
});

export const moderationQueue = pgTable("moderation_queue", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	userId: uuid("user_id"),
	flags: jsonb().default([]).notNull(),
	priority: integer().default(1).notNull(),
	status: text().default('pending').notNull(),
	autoFlagged: boolean("auto_flagged").default(false),
	flagReasons: text("flag_reasons").array().default([""]),
	moderatorId: uuid("moderator_id"),
	moderatorNotes: text("moderator_notes"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxModerationQueueAutoFlagged: index("idx_moderation_queue_auto_flagged").using("btree", table.autoFlagged.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxModerationQueueContent: index("idx_moderation_queue_content").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		idxModerationQueueModerator: index("idx_moderation_queue_moderator").using("btree", table.moderatorId.asc().nullsLast()),
		idxModerationQueueStatusPriority: index("idx_moderation_queue_status_priority").using("btree", table.status.asc().nullsLast(), table.priority.desc().nullsFirst(), table.createdAt.asc().nullsLast()),
		idxModerationQueueUser: index("idx_moderation_queue_user").using("btree", table.userId.asc().nullsLast()),
		moderationQueueUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "moderation_queue_user_id_fkey"
		}).onDelete("cascade"),
		moderationQueueModeratorIdFkey: foreignKey({
			columns: [table.moderatorId],
			foreignColumns: [users.id],
			name: "moderation_queue_moderator_id_fkey"
		}).onDelete("set null"),
		moderationQueueContentTypeCheck: check("moderation_queue_content_type_check", sql`content_type = ANY (ARRAY['bill_comment'::text, 'bill'::text, 'user_profile'::text, 'sponsor_transparency'::text])`),
		moderationQueuePriorityCheck: check("moderation_queue_priority_check", sql`(priority >= 1) AND (priority <= 5)`),
		moderationQueueStatusCheck: check("moderation_queue_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'escalated'::text])`),
	}
});

export const analyticsEvents = pgTable("analytics_events", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	eventCategory: text("event_category").notNull(),
	userId: uuid("user_id"),
	sessionId: text("session_id"),
	billId: integer("bill_id"),
	commentId: integer("comment_id"),
	sponsorId: integer("sponsor_id"),
	eventData: jsonb("event_data").default({}),
	userAgent: text("user_agent"),
	ipAddress: inet("ip_address"),
	referrer: text(),
	pageUrl: text("page_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxAnalyticsEventsBill: index("idx_analytics_events_bill").using("btree", table.billId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxAnalyticsEventsCategoryDate: index("idx_analytics_events_category_date").using("btree", table.eventCategory.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxAnalyticsEventsSession: index("idx_analytics_events_session").using("btree", table.sessionId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxAnalyticsEventsTypeDate: index("idx_analytics_events_type_date").using("btree", table.eventType.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxAnalyticsEventsUserDate: index("idx_analytics_events_user_date").using("btree", table.userId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		analyticsEventsSponsorIdFkey: foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "analytics_events_sponsor_id_fkey"
		}).onDelete("cascade"),
		analyticsEventsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "analytics_events_user_id_fkey"
		}).onDelete("set null"),
		analyticsEventsBillIdFkey: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "analytics_events_bill_id_fkey"
		}).onDelete("cascade"),
		analyticsEventsCommentIdFkey: foreignKey({
			columns: [table.commentId],
			foreignColumns: [billComments.id],
			name: "analytics_events_comment_id_fkey"
		}).onDelete("cascade"),
	}
});

export const analyticsDailySummary = pgTable("analytics_daily_summary", {
	id: serial().primaryKey().notNull(),
	date: date().notNull(),
	eventType: text("event_type").notNull(),
	eventCategory: text("event_category"),
	totalEvents: integer("total_events").default(0).notNull(),
	uniqueUsers: integer("unique_users").default(0).notNull(),
	uniqueSessions: integer("unique_sessions").default(0).notNull(),
	billInteractions: integer("bill_interactions").default(0),
	commentInteractions: integer("comment_interactions").default(0),
	searchQueries: integer("search_queries").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxAnalyticsDailyCategory: index("idx_analytics_daily_category").using("btree", table.eventCategory.asc().nullsLast(), table.date.desc().nullsFirst()),
		idxAnalyticsDailyDateType: index("idx_analytics_daily_date_type").using("btree", table.date.desc().nullsFirst(), table.eventType.asc().nullsLast()),
		analyticsDailySummaryDateEventTypeEventCategoryKey: unique("analytics_daily_summary_date_event_type_event_category_key").on(table.date, table.eventType, table.eventCategory),
	}
});

export const userActivitySummary = pgTable("user_activity_summary", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	date: date().notNull(),
	billsViewed: integer("bills_viewed").default(0),
	billsTracked: integer("bills_tracked").default(0),
	commentsPosted: integer("comments_posted").default(0),
	commentsUpvoted: integer("comments_upvoted").default(0),
	commentsDownvoted: integer("comments_downvoted").default(0),
	searchesPerformed: integer("searches_performed").default(0),
	sessionDurationMinutes: integer("session_duration_minutes").default(0),
	engagementScore: numeric("engagement_score", { precision: 10, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxUserActivityDate: index("idx_user_activity_date").using("btree", table.date.desc().nullsFirst()),
		idxUserActivityEngagement: index("idx_user_activity_engagement").using("btree", table.engagementScore.desc().nullsFirst(), table.date.desc().nullsFirst()),
		idxUserActivityUserDate: index("idx_user_activity_user_date").using("btree", table.userId.asc().nullsLast(), table.date.desc().nullsFirst()),
		userActivitySummaryUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_activity_summary_user_id_fkey"
		}).onDelete("cascade"),
		userActivitySummaryUserIdDateKey: unique("user_activity_summary_user_id_date_key").on(table.userId, table.date),
	}
});

export const billAnalyticsSummary = pgTable("bill_analytics_summary", {
	id: serial().primaryKey().notNull(),
	billId: integer("bill_id").notNull(),
	date: date().notNull(),
	views: integer().default(0),
	uniqueViewers: integer("unique_viewers").default(0),
	comments: integer().default(0),
	shares: integer().default(0),
	trackingUsers: integer("tracking_users").default(0),
	engagementScore: numeric("engagement_score", { precision: 10, scale:  2 }).default('0'),
	sentimentPositive: integer("sentiment_positive").default(0),
	sentimentNegative: integer("sentiment_negative").default(0),
	sentimentNeutral: integer("sentiment_neutral").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxBillAnalyticsBillDate: index("idx_bill_analytics_bill_date").using("btree", table.billId.asc().nullsLast(), table.date.desc().nullsFirst()),
		idxBillAnalyticsEngagement: index("idx_bill_analytics_engagement").using("btree", table.engagementScore.desc().nullsFirst(), table.date.desc().nullsFirst()),
		idxBillAnalyticsViews: index("idx_bill_analytics_views").using("btree", table.views.desc().nullsFirst(), table.date.desc().nullsFirst()),
		billAnalyticsSummaryBillIdFkey: foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_analytics_summary_bill_id_fkey"
		}).onDelete("cascade"),
		billAnalyticsSummaryBillIdDateKey: unique("bill_analytics_summary_bill_id_date_key").on(table.billId, table.date),
	}
});

export const contentFlags = pgTable("content_flags", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	flaggerUserId: uuid("flagger_user_id").notNull(),
	flagReason: text("flag_reason").notNull(),
	flagCategory: text("flag_category").notNull(),
	description: text(),
	status: text().default('pending').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxContentFlagsCategory: index("idx_content_flags_category").using("btree", table.flagCategory.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		idxContentFlagsContent: index("idx_content_flags_content").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		idxContentFlagsFlagger: index("idx_content_flags_flagger").using("btree", table.flaggerUserId.asc().nullsLast()),
		idxContentFlagsStatus: index("idx_content_flags_status").using("btree", table.status.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
		contentFlagsFlaggerUserIdFkey: foreignKey({
			columns: [table.flaggerUserId],
			foreignColumns: [users.id],
			name: "content_flags_flagger_user_id_fkey"
		}).onDelete("cascade"),
		contentFlagsReviewedByFkey: foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "content_flags_reviewed_by_fkey"
		}).onDelete("set null"),
		contentFlagsContentTypeCheck: check("content_flags_content_type_check", sql`content_type = ANY (ARRAY['bill_comment'::text, 'bill'::text, 'user_profile'::text])`),
		contentFlagsFlagCategoryCheck: check("content_flags_flag_category_check", sql`flag_category = ANY (ARRAY['spam'::text, 'harassment'::text, 'misinformation'::text, 'inappropriate'::text, 'copyright'::text, 'other'::text])`),
		contentFlagsStatusCheck: check("content_flags_status_check", sql`status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'escalated'::text])`),
	}
});

export const systemHealthMetrics = pgTable("system_health_metrics", {
	id: serial().primaryKey().notNull(),
	metricName: text("metric_name").notNull(),
	metricValue: numeric("metric_value").notNull(),
	metricUnit: text("metric_unit"),
	metricCategory: text("metric_category").notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	metadata: jsonb().default({}),
}, (table) => {
	return {
		idxSystemHealthCategoryTime: index("idx_system_health_category_time").using("btree", table.metricCategory.asc().nullsLast(), table.recordedAt.desc().nullsFirst()),
		idxSystemHealthNameTime: index("idx_system_health_name_time").using("btree", table.metricName.asc().nullsLast(), table.recordedAt.desc().nullsFirst()),
	}
});

export const securityAuditLogs = pgTable("security_audit_logs", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	userId: uuid("user_id"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	resource: text(),
	action: text(),
	result: text().notNull(),
	severity: text().default('info').notNull(),
	details: jsonb().default({}),
	sessionId: text("session_id"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	success: boolean().default(true),
	riskScore: integer("risk_score").default(0),
}, (table) => {
	return {
		idxSecurityAuditLogsRiskScore: index("idx_security_audit_logs_risk_score").using("btree", table.riskScore.asc().nullsLast()),
		eventTypeIdx: index("security_audit_logs_event_type_idx").using("btree", table.eventType.asc().nullsLast()),
		resultIdx: index("security_audit_logs_result_idx").using("btree", table.result.asc().nullsLast()),
		severityIdx: index("security_audit_logs_severity_idx").using("btree", table.severity.asc().nullsLast()),
		timestampIdx: index("security_audit_logs_timestamp_idx").using("btree", table.timestamp.asc().nullsLast()),
		userIdIdx: index("security_audit_logs_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		securityAuditLogsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "security_audit_logs_user_id_users_id_fk"
		}).onDelete("set null"),
	}
});
