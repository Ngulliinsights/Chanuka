import { relations } from "drizzle-orm/relations";
import { sponsors, bills, billEngagement, users, billComments, billTags, citizenVerifications, billSectionConflicts, commentVotes, billSponsorships, expertVerifications, moderationActions, moderationFlags, notifications, passwordResets, sessions, refreshTokens, regulations, regulatoryImpact, socialShares, sponsorAffiliations, sponsorTransparency, regulatoryChanges, userInterests, userProfiles, userProgress, userSocialProfiles, conflicts, conflictSources, analysis, departments, evaluations, syncJobs, syncErrors, moderationQueue, analyticsEvents, userActivitySummary, billAnalyticsSummary, contentFlags, securityAuditLogs } from "./schema";

export const billsRelations = relations(bills, ({one, many}) => ({
	sponsor: one(sponsors, {
		fields: [bills.sponsorId],
		references: [sponsors.id]
	}),
	billEngagements: many(billEngagement),
	billComments: many(billComments),
	billTags: many(billTags),
	citizenVerifications: many(citizenVerifications),
	billSectionConflicts: many(billSectionConflicts),
	billSponsorships: many(billSponsorships),
	expertVerifications: many(expertVerifications),
	notifications: many(notifications),
	socialShares: many(socialShares),
	analyses: many(analysis),
	analyticsEvents: many(analyticsEvents),
	billAnalyticsSummaries: many(billAnalyticsSummary),
}));

export const sponsorsRelations = relations(sponsors, ({many}) => ({
	bills: many(bills),
	billSponsorships: many(billSponsorships),
	regulations: many(regulations),
	sponsorAffiliations: many(sponsorAffiliations),
	sponsorTransparencies: many(sponsorTransparency),
	analyticsEvents: many(analyticsEvents),
}));

export const billEngagementRelations = relations(billEngagement, ({one}) => ({
	bill: one(bills, {
		fields: [billEngagement.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [billEngagement.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	billEngagements: many(billEngagement),
	billComments: many(billComments),
	citizenVerifications: many(citizenVerifications),
	commentVotes: many(commentVotes),
	expertVerifications: many(expertVerifications),
	moderationActions_moderatorId: many(moderationActions, {
		relationName: "moderationActions_moderatorId_users_id"
	}),
	moderationActions_reversedBy: many(moderationActions, {
		relationName: "moderationActions_reversedBy_users_id"
	}),
	moderationFlags_reportedBy: many(moderationFlags, {
		relationName: "moderationFlags_reportedBy_users_id"
	}),
	moderationFlags_reviewedBy: many(moderationFlags, {
		relationName: "moderationFlags_reviewedBy_users_id"
	}),
	notifications: many(notifications),
	passwordResets: many(passwordResets),
	sessions: many(sessions),
	socialShares: many(socialShares),
	regulatoryChanges: many(regulatoryChanges),
	userInterests: many(userInterests),
	userProfiles: many(userProfiles),
	userProgresses: many(userProgress),
	userSocialProfiles: many(userSocialProfiles),
	analyses: many(analysis),
	moderationQueues_userId: many(moderationQueue, {
		relationName: "moderationQueue_userId_users_id"
	}),
	moderationQueues_moderatorId: many(moderationQueue, {
		relationName: "moderationQueue_moderatorId_users_id"
	}),
	analyticsEvents: many(analyticsEvents),
	userActivitySummaries: many(userActivitySummary),
	contentFlags_flaggerUserId: many(contentFlags, {
		relationName: "contentFlags_flaggerUserId_users_id"
	}),
	contentFlags_reviewedBy: many(contentFlags, {
		relationName: "contentFlags_reviewedBy_users_id"
	}),
	securityAuditLogs: many(securityAuditLogs),
}));

export const billCommentsRelations = relations(billComments, ({one, many}) => ({
	bill: one(bills, {
		fields: [billComments.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [billComments.userId],
		references: [users.id]
	}),
	billComment: one(billComments, {
		fields: [billComments.parentCommentId],
		references: [billComments.id],
		relationName: "billComments_parentCommentId_billComments_id"
	}),
	billComments: many(billComments, {
		relationName: "billComments_parentCommentId_billComments_id"
	}),
	commentVotes: many(commentVotes),
	analyticsEvents: many(analyticsEvents),
}));

export const billTagsRelations = relations(billTags, ({one}) => ({
	bill: one(bills, {
		fields: [billTags.billId],
		references: [bills.id]
	}),
}));

export const citizenVerificationsRelations = relations(citizenVerifications, ({one}) => ({
	bill: one(bills, {
		fields: [citizenVerifications.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [citizenVerifications.citizenId],
		references: [users.id]
	}),
}));

export const billSectionConflictsRelations = relations(billSectionConflicts, ({one}) => ({
	bill: one(bills, {
		fields: [billSectionConflicts.billId],
		references: [bills.id]
	}),
}));

export const commentVotesRelations = relations(commentVotes, ({one}) => ({
	billComment: one(billComments, {
		fields: [commentVotes.commentId],
		references: [billComments.id]
	}),
	user: one(users, {
		fields: [commentVotes.userId],
		references: [users.id]
	}),
}));

export const billSponsorshipsRelations = relations(billSponsorships, ({one}) => ({
	bill: one(bills, {
		fields: [billSponsorships.billId],
		references: [bills.id]
	}),
	sponsor: one(sponsors, {
		fields: [billSponsorships.sponsorId],
		references: [sponsors.id]
	}),
}));

export const expertVerificationsRelations = relations(expertVerifications, ({one}) => ({
	bill: one(bills, {
		fields: [expertVerifications.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [expertVerifications.expertId],
		references: [users.id]
	}),
}));

export const moderationActionsRelations = relations(moderationActions, ({one}) => ({
	user_moderatorId: one(users, {
		fields: [moderationActions.moderatorId],
		references: [users.id],
		relationName: "moderationActions_moderatorId_users_id"
	}),
	user_reversedBy: one(users, {
		fields: [moderationActions.reversedBy],
		references: [users.id],
		relationName: "moderationActions_reversedBy_users_id"
	}),
}));

export const moderationFlagsRelations = relations(moderationFlags, ({one}) => ({
	user_reportedBy: one(users, {
		fields: [moderationFlags.reportedBy],
		references: [users.id],
		relationName: "moderationFlags_reportedBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [moderationFlags.reviewedBy],
		references: [users.id],
		relationName: "moderationFlags_reviewedBy_users_id"
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
	bill: one(bills, {
		fields: [notifications.relatedBillId],
		references: [bills.id]
	}),
}));

export const passwordResetsRelations = relations(passwordResets, ({one}) => ({
	user: one(users, {
		fields: [passwordResets.userId],
		references: [users.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	session: one(sessions, {
		fields: [refreshTokens.sessionId],
		references: [sessions.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	refreshTokens: many(refreshTokens),
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const regulatoryImpactRelations = relations(regulatoryImpact, ({one}) => ({
	regulation: one(regulations, {
		fields: [regulatoryImpact.regulationId],
		references: [regulations.id]
	}),
}));

export const regulationsRelations = relations(regulations, ({one, many}) => ({
	regulatoryImpacts: many(regulatoryImpact),
	sponsor: one(sponsors, {
		fields: [regulations.sponsorId],
		references: [sponsors.id]
	}),
	regulatoryChanges: many(regulatoryChanges),
}));

export const socialSharesRelations = relations(socialShares, ({one}) => ({
	bill: one(bills, {
		fields: [socialShares.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [socialShares.userId],
		references: [users.id]
	}),
}));

export const sponsorAffiliationsRelations = relations(sponsorAffiliations, ({one}) => ({
	sponsor: one(sponsors, {
		fields: [sponsorAffiliations.sponsorId],
		references: [sponsors.id]
	}),
}));

export const sponsorTransparencyRelations = relations(sponsorTransparency, ({one}) => ({
	sponsor: one(sponsors, {
		fields: [sponsorTransparency.sponsorId],
		references: [sponsors.id]
	}),
}));

export const regulatoryChangesRelations = relations(regulatoryChanges, ({one}) => ({
	regulation: one(regulations, {
		fields: [regulatoryChanges.regulationId],
		references: [regulations.id]
	}),
	user: one(users, {
		fields: [regulatoryChanges.reportedBy],
		references: [users.id]
	}),
}));

export const userInterestsRelations = relations(userInterests, ({one}) => ({
	user: one(users, {
		fields: [userInterests.userId],
		references: [users.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const userProgressRelations = relations(userProgress, ({one}) => ({
	user: one(users, {
		fields: [userProgress.userId],
		references: [users.id]
	}),
}));

export const userSocialProfilesRelations = relations(userSocialProfiles, ({one}) => ({
	user: one(users, {
		fields: [userSocialProfiles.userId],
		references: [users.id]
	}),
}));

export const conflictSourcesRelations = relations(conflictSources, ({one}) => ({
	conflict: one(conflicts, {
		fields: [conflictSources.conflictId],
		references: [conflicts.id]
	}),
}));

export const conflictsRelations = relations(conflicts, ({many}) => ({
	conflictSources: many(conflictSources),
}));

export const analysisRelations = relations(analysis, ({one}) => ({
	bill: one(bills, {
		fields: [analysis.billId],
		references: [bills.id]
	}),
	user: one(users, {
		fields: [analysis.approvedBy],
		references: [users.id]
	}),
}));

export const evaluationsRelations = relations(evaluations, ({one}) => ({
	department: one(departments, {
		fields: [evaluations.departmentId],
		references: [departments.id]
	}),
}));

export const departmentsRelations = relations(departments, ({many}) => ({
	evaluations: many(evaluations),
}));

export const syncErrorsRelations = relations(syncErrors, ({one}) => ({
	syncJob: one(syncJobs, {
		fields: [syncErrors.jobId],
		references: [syncJobs.id]
	}),
}));

export const syncJobsRelations = relations(syncJobs, ({many}) => ({
	syncErrors: many(syncErrors),
}));

export const moderationQueueRelations = relations(moderationQueue, ({one}) => ({
	user_userId: one(users, {
		fields: [moderationQueue.userId],
		references: [users.id],
		relationName: "moderationQueue_userId_users_id"
	}),
	user_moderatorId: one(users, {
		fields: [moderationQueue.moderatorId],
		references: [users.id],
		relationName: "moderationQueue_moderatorId_users_id"
	}),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({one}) => ({
	sponsor: one(sponsors, {
		fields: [analyticsEvents.sponsorId],
		references: [sponsors.id]
	}),
	user: one(users, {
		fields: [analyticsEvents.userId],
		references: [users.id]
	}),
	bill: one(bills, {
		fields: [analyticsEvents.billId],
		references: [bills.id]
	}),
	billComment: one(billComments, {
		fields: [analyticsEvents.commentId],
		references: [billComments.id]
	}),
}));

export const userActivitySummaryRelations = relations(userActivitySummary, ({one}) => ({
	user: one(users, {
		fields: [userActivitySummary.userId],
		references: [users.id]
	}),
}));

export const billAnalyticsSummaryRelations = relations(billAnalyticsSummary, ({one}) => ({
	bill: one(bills, {
		fields: [billAnalyticsSummary.billId],
		references: [bills.id]
	}),
}));

export const contentFlagsRelations = relations(contentFlags, ({one}) => ({
	user_flaggerUserId: one(users, {
		fields: [contentFlags.flaggerUserId],
		references: [users.id],
		relationName: "contentFlags_flaggerUserId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [contentFlags.reviewedBy],
		references: [users.id],
		relationName: "contentFlags_reviewedBy_users_id"
	}),
}));

export const securityAuditLogsRelations = relations(securityAuditLogs, ({one}) => ({
	user: one(users, {
		fields: [securityAuditLogs.userId],
		references: [users.id]
	}),
}));