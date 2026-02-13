/**
 * Generated Database Table Types
 * Auto-generated from Drizzle schema definitions using $inferSelect and $inferInsert
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run db:generate-types' to regenerate
 * 
 * Generated: 2026-02-11T17:05:33.030Z
 * 
 * This file uses Drizzle's built-in type inference to ensure database types
 * stay synchronized with schema definitions. Each table gets two types:
 * - *Table: The full row type (from $inferSelect)
 * - *TableInsert: The insert type (from $inferInsert, omits auto-generated fields)
 */

// Import all schema definitions
import * as schema from '../../../server/infrastructure/schema';

// Import branded types for entity IDs
import type {
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  VoteId,
  SessionId,
  NotificationId,
  AmendmentId,
  ActionId,
  SponsorId,
  ArgumentId,
  ArgumentEvidenceId,
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from '../core/branded';

// ============================================================================
// Database Table Types (Inferred from Drizzle Schema)
// ============================================================================

/**
 * public_promises table type (database representation)
 * Inferred from Drizzle schema: schema.public_promises
 * 
 * This type represents a complete row from the public_promises table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PublicPromisesTable = typeof schema.public_promises.$inferSelect;

/**
 * public_promises insert type (for creating new records)
 * Inferred from Drizzle schema: schema.public_promises
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PublicPromisesTableInsert = typeof schema.public_promises.$inferInsert;

/**
 * shadow_ledger_entries table type (database representation)
 * Inferred from Drizzle schema: schema.shadow_ledger_entries
 * 
 * This type represents a complete row from the shadow_ledger_entries table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ShadowLedgerEntriesTable = typeof schema.shadow_ledger_entries.$inferSelect;

/**
 * shadow_ledger_entries insert type (for creating new records)
 * Inferred from Drizzle schema: schema.shadow_ledger_entries
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ShadowLedgerEntriesTableInsert = typeof schema.shadow_ledger_entries.$inferInsert;

/**
 * promise_accountability_tracking table type (database representation)
 * Inferred from Drizzle schema: schema.promise_accountability_tracking
 * 
 * This type represents a complete row from the promise_accountability_tracking table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PromiseAccountabilityTrackingTable = typeof schema.promise_accountability_tracking.$inferSelect;

/**
 * promise_accountability_tracking insert type (for creating new records)
 * Inferred from Drizzle schema: schema.promise_accountability_tracking
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PromiseAccountabilityTrackingTableInsert = typeof schema.promise_accountability_tracking.$inferInsert;

/**
 * searchQueries table type (database representation)
 * Inferred from Drizzle schema: schema.searchQueries
 * 
 * This type represents a complete row from the searchQueries table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SearchQueriesTable = typeof schema.searchQueries.$inferSelect;

/**
 * searchQueries insert type (for creating new records)
 * Inferred from Drizzle schema: schema.searchQueries
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SearchQueriesTableInsert = typeof schema.searchQueries.$inferInsert;

/**
 * discoveryPatterns table type (database representation)
 * Inferred from Drizzle schema: schema.discoveryPatterns
 * 
 * This type represents a complete row from the discoveryPatterns table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type DiscoveryPatternsTable = typeof schema.discoveryPatterns.$inferSelect;

/**
 * discoveryPatterns insert type (for creating new records)
 * Inferred from Drizzle schema: schema.discoveryPatterns
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type DiscoveryPatternsTableInsert = typeof schema.discoveryPatterns.$inferInsert;

/**
 * billRelationships table type (database representation)
 * Inferred from Drizzle schema: schema.billRelationships
 * 
 * This type represents a complete row from the billRelationships table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillRelationshipsTable = typeof schema.billRelationships.$inferSelect;

/**
 * billRelationships insert type (for creating new records)
 * Inferred from Drizzle schema: schema.billRelationships
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillRelationshipsTableInsert = typeof schema.billRelationships.$inferInsert;

/**
 * searchAnalytics table type (database representation)
 * Inferred from Drizzle schema: schema.searchAnalytics
 * 
 * This type represents a complete row from the searchAnalytics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SearchAnalyticsTable = typeof schema.searchAnalytics.$inferSelect;

/**
 * searchAnalytics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.searchAnalytics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SearchAnalyticsTableInsert = typeof schema.searchAnalytics.$inferInsert;

/**
 * trendingTopics table type (database representation)
 * Inferred from Drizzle schema: schema.trendingTopics
 * 
 * This type represents a complete row from the trendingTopics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type TrendingTopicsTable = typeof schema.trendingTopics.$inferSelect;

/**
 * trendingTopics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.trendingTopics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type TrendingTopicsTableInsert = typeof schema.trendingTopics.$inferInsert;

/**
 * userRecommendations table type (database representation)
 * Inferred from Drizzle schema: schema.userRecommendations
 * 
 * This type represents a complete row from the userRecommendations table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserRecommendationsTable = typeof schema.userRecommendations.$inferSelect;

/**
 * userRecommendations insert type (for creating new records)
 * Inferred from Drizzle schema: schema.userRecommendations
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserRecommendationsTableInsert = typeof schema.userRecommendations.$inferInsert;

/**
 * campaigns table type (database representation)
 * Inferred from Drizzle schema: schema.campaigns
 * 
 * This type represents a complete row from the campaigns table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CampaignsTable = typeof schema.campaigns.$inferSelect;

/**
 * campaigns insert type (for creating new records)
 * Inferred from Drizzle schema: schema.campaigns
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CampaignsTableInsert = typeof schema.campaigns.$inferInsert;

/**
 * action_items table type (database representation)
 * Inferred from Drizzle schema: schema.action_items
 * 
 * This type represents a complete row from the action_items table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ActionItemsTable = typeof schema.action_items.$inferSelect;

/**
 * action_items insert type (for creating new records)
 * Inferred from Drizzle schema: schema.action_items
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ActionItemsTableInsert = typeof schema.action_items.$inferInsert;

/**
 * campaign_participants table type (database representation)
 * Inferred from Drizzle schema: schema.campaign_participants
 * 
 * This type represents a complete row from the campaign_participants table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CampaignParticipantsTable = typeof schema.campaign_participants.$inferSelect;

/**
 * campaign_participants insert type (for creating new records)
 * Inferred from Drizzle schema: schema.campaign_participants
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CampaignParticipantsTableInsert = typeof schema.campaign_participants.$inferInsert;

/**
 * action_completions table type (database representation)
 * Inferred from Drizzle schema: schema.action_completions
 * 
 * This type represents a complete row from the action_completions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ActionCompletionsTable = typeof schema.action_completions.$inferSelect;

/**
 * action_completions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.action_completions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ActionCompletionsTableInsert = typeof schema.action_completions.$inferInsert;

/**
 * campaign_impact_metrics table type (database representation)
 * Inferred from Drizzle schema: schema.campaign_impact_metrics
 * 
 * This type represents a complete row from the campaign_impact_metrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CampaignImpactMetricsTable = typeof schema.campaign_impact_metrics.$inferSelect;

/**
 * campaign_impact_metrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.campaign_impact_metrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CampaignImpactMetricsTableInsert = typeof schema.campaign_impact_metrics.$inferInsert;

/**
 * coalition_relationships table type (database representation)
 * Inferred from Drizzle schema: schema.coalition_relationships
 * 
 * This type represents a complete row from the coalition_relationships table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CoalitionRelationshipsTable = typeof schema.coalition_relationships.$inferSelect;

/**
 * coalition_relationships insert type (for creating new records)
 * Inferred from Drizzle schema: schema.coalition_relationships
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CoalitionRelationshipsTableInsert = typeof schema.coalition_relationships.$inferInsert;

/**
 * analysis table type (database representation)
 * Inferred from Drizzle schema: schema.analysis
 * 
 * This type represents a complete row from the analysis table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AnalysisTable = typeof schema.analysis.$inferSelect;

/**
 * analysis insert type (for creating new records)
 * Inferred from Drizzle schema: schema.analysis
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AnalysisTableInsert = typeof schema.analysis.$inferInsert;

/**
 * argumentTable table type (database representation)
 * Inferred from Drizzle schema: schema.argumentTable
 * 
 * This type represents a complete row from the argumentTable table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ArgumentTableTable = typeof schema.argumentTable.$inferSelect;

/**
 * argumentTable insert type (for creating new records)
 * Inferred from Drizzle schema: schema.argumentTable
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ArgumentTableTableInsert = typeof schema.argumentTable.$inferInsert;

/**
 * claims table type (database representation)
 * Inferred from Drizzle schema: schema.claims
 * 
 * This type represents a complete row from the claims table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ClaimsTable = typeof schema.claims.$inferSelect;

/**
 * claims insert type (for creating new records)
 * Inferred from Drizzle schema: schema.claims
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ClaimsTableInsert = typeof schema.claims.$inferInsert;

/**
 * evidence table type (database representation)
 * Inferred from Drizzle schema: schema.evidence
 * 
 * This type represents a complete row from the evidence table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EvidenceTable = typeof schema.evidence.$inferSelect;

/**
 * evidence insert type (for creating new records)
 * Inferred from Drizzle schema: schema.evidence
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EvidenceTableInsert = typeof schema.evidence.$inferInsert;

/**
 * argument_relationships table type (database representation)
 * Inferred from Drizzle schema: schema.argument_relationships
 * 
 * This type represents a complete row from the argument_relationships table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ArgumentRelationshipsTable = typeof schema.argument_relationships.$inferSelect;

/**
 * argument_relationships insert type (for creating new records)
 * Inferred from Drizzle schema: schema.argument_relationships
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ArgumentRelationshipsTableInsert = typeof schema.argument_relationships.$inferInsert;

/**
 * legislative_briefs table type (database representation)
 * Inferred from Drizzle schema: schema.legislative_briefs
 * 
 * This type represents a complete row from the legislative_briefs table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LegislativeBriefsTable = typeof schema.legislative_briefs.$inferSelect;

/**
 * legislative_briefs insert type (for creating new records)
 * Inferred from Drizzle schema: schema.legislative_briefs
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LegislativeBriefsTableInsert = typeof schema.legislative_briefs.$inferInsert;

/**
 * synthesis_jobs table type (database representation)
 * Inferred from Drizzle schema: schema.synthesis_jobs
 * 
 * This type represents a complete row from the synthesis_jobs table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SynthesisJobsTable = typeof schema.synthesis_jobs.$inferSelect;

/**
 * synthesis_jobs insert type (for creating new records)
 * Inferred from Drizzle schema: schema.synthesis_jobs
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SynthesisJobsTableInsert = typeof schema.synthesis_jobs.$inferInsert;

/**
 * user_interests table type (database representation)
 * Inferred from Drizzle schema: schema.user_interests
 * 
 * This type represents a complete row from the user_interests table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserInterestsTable = typeof schema.user_interests.$inferSelect;

/**
 * user_interests insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_interests
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserInterestsTableInsert = typeof schema.user_interests.$inferInsert;

/**
 * sessions table type (database representation)
 * Inferred from Drizzle schema: schema.sessions
 * 
 * This type represents a complete row from the sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SessionsTable = typeof schema.sessions.$inferSelect;

/**
 * sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SessionsTableInsert = typeof schema.sessions.$inferInsert;

/**
 * comments table type (database representation)
 * Inferred from Drizzle schema: schema.comments
 * 
 * This type represents a complete row from the comments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommentsTable = typeof schema.comments.$inferSelect;

/**
 * comments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.comments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommentsTableInsert = typeof schema.comments.$inferInsert;

/**
 * comment_votes table type (database representation)
 * Inferred from Drizzle schema: schema.comment_votes
 * 
 * This type represents a complete row from the comment_votes table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommentVotesTable = typeof schema.comment_votes.$inferSelect;

/**
 * comment_votes insert type (for creating new records)
 * Inferred from Drizzle schema: schema.comment_votes
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommentVotesTableInsert = typeof schema.comment_votes.$inferInsert;

/**
 * bill_votes table type (database representation)
 * Inferred from Drizzle schema: schema.bill_votes
 * 
 * This type represents a complete row from the bill_votes table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillVotesTable = typeof schema.bill_votes.$inferSelect;

/**
 * bill_votes insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_votes
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillVotesTableInsert = typeof schema.bill_votes.$inferInsert;

/**
 * bill_engagement table type (database representation)
 * Inferred from Drizzle schema: schema.bill_engagement
 * 
 * This type represents a complete row from the bill_engagement table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillEngagementTable = typeof schema.bill_engagement.$inferSelect;

/**
 * bill_engagement insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_engagement
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillEngagementTableInsert = typeof schema.bill_engagement.$inferInsert;

/**
 * bill_tracking_preferences table type (database representation)
 * Inferred from Drizzle schema: schema.bill_tracking_preferences
 * 
 * This type represents a complete row from the bill_tracking_preferences table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillTrackingPreferencesTable = typeof schema.bill_tracking_preferences.$inferSelect;

/**
 * bill_tracking_preferences insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_tracking_preferences
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillTrackingPreferencesTableInsert = typeof schema.bill_tracking_preferences.$inferInsert;

/**
 * notifications table type (database representation)
 * Inferred from Drizzle schema: schema.notifications
 * 
 * This type represents a complete row from the notifications table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type NotificationsTable = typeof schema.notifications.$inferSelect;

/**
 * notifications insert type (for creating new records)
 * Inferred from Drizzle schema: schema.notifications
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type NotificationsTableInsert = typeof schema.notifications.$inferInsert;

/**
 * alert_preferences table type (database representation)
 * Inferred from Drizzle schema: schema.alert_preferences
 * 
 * This type represents a complete row from the alert_preferences table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AlertPreferencesTable = typeof schema.alert_preferences.$inferSelect;

/**
 * alert_preferences insert type (for creating new records)
 * Inferred from Drizzle schema: schema.alert_preferences
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AlertPreferencesTableInsert = typeof schema.alert_preferences.$inferInsert;

/**
 * user_contact_methods table type (database representation)
 * Inferred from Drizzle schema: schema.user_contact_methods
 * 
 * This type represents a complete row from the user_contact_methods table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserContactMethodsTable = typeof schema.user_contact_methods.$inferSelect;

/**
 * user_contact_methods insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_contact_methods
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserContactMethodsTableInsert = typeof schema.user_contact_methods.$inferInsert;

/**
 * constitutional_provisions table type (database representation)
 * Inferred from Drizzle schema: schema.constitutional_provisions
 * 
 * This type represents a complete row from the constitutional_provisions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ConstitutionalProvisionsTable = typeof schema.constitutional_provisions.$inferSelect;

/**
 * constitutional_provisions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.constitutional_provisions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ConstitutionalProvisionsTableInsert = typeof schema.constitutional_provisions.$inferInsert;

/**
 * constitutional_analyses table type (database representation)
 * Inferred from Drizzle schema: schema.constitutional_analyses
 * 
 * This type represents a complete row from the constitutional_analyses table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ConstitutionalAnalysesTable = typeof schema.constitutional_analyses.$inferSelect;

/**
 * constitutional_analyses insert type (for creating new records)
 * Inferred from Drizzle schema: schema.constitutional_analyses
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ConstitutionalAnalysesTableInsert = typeof schema.constitutional_analyses.$inferInsert;

/**
 * legal_precedents table type (database representation)
 * Inferred from Drizzle schema: schema.legal_precedents
 * 
 * This type represents a complete row from the legal_precedents table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LegalPrecedentsTable = typeof schema.legal_precedents.$inferSelect;

/**
 * legal_precedents insert type (for creating new records)
 * Inferred from Drizzle schema: schema.legal_precedents
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LegalPrecedentsTableInsert = typeof schema.legal_precedents.$inferInsert;

/**
 * expert_review_queue table type (database representation)
 * Inferred from Drizzle schema: schema.expert_review_queue
 * 
 * This type represents a complete row from the expert_review_queue table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertReviewQueueTable = typeof schema.expert_review_queue.$inferSelect;

/**
 * expert_review_queue insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expert_review_queue
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertReviewQueueTableInsert = typeof schema.expert_review_queue.$inferInsert;

/**
 * analysis_audit_trail table type (database representation)
 * Inferred from Drizzle schema: schema.analysis_audit_trail
 * 
 * This type represents a complete row from the analysis_audit_trail table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AnalysisAuditTrailTable = typeof schema.analysis_audit_trail.$inferSelect;

/**
 * analysis_audit_trail insert type (for creating new records)
 * Inferred from Drizzle schema: schema.analysis_audit_trail
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AnalysisAuditTrailTableInsert = typeof schema.analysis_audit_trail.$inferInsert;

/**
 * constitutional_vulnerabilities table type (database representation)
 * Inferred from Drizzle schema: schema.constitutional_vulnerabilities
 * 
 * This type represents a complete row from the constitutional_vulnerabilities table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ConstitutionalVulnerabilitiesTable = typeof schema.constitutional_vulnerabilities.$inferSelect;

/**
 * constitutional_vulnerabilities insert type (for creating new records)
 * Inferred from Drizzle schema: schema.constitutional_vulnerabilities
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ConstitutionalVulnerabilitiesTableInsert = typeof schema.constitutional_vulnerabilities.$inferInsert;

/**
 * underutilized_provisions table type (database representation)
 * Inferred from Drizzle schema: schema.underutilized_provisions
 * 
 * This type represents a complete row from the underutilized_provisions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UnderutilizedProvisionsTable = typeof schema.underutilized_provisions.$inferSelect;

/**
 * underutilized_provisions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.underutilized_provisions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UnderutilizedProvisionsTableInsert = typeof schema.underutilized_provisions.$inferInsert;

/**
 * elite_literacy_assessment table type (database representation)
 * Inferred from Drizzle schema: schema.elite_literacy_assessment
 * 
 * This type represents a complete row from the elite_literacy_assessment table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EliteLiteracyAssessmentTable = typeof schema.elite_literacy_assessment.$inferSelect;

/**
 * elite_literacy_assessment insert type (for creating new records)
 * Inferred from Drizzle schema: schema.elite_literacy_assessment
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EliteLiteracyAssessmentTableInsert = typeof schema.elite_literacy_assessment.$inferInsert;

/**
 * constitutional_loopholes table type (database representation)
 * Inferred from Drizzle schema: schema.constitutional_loopholes
 * 
 * This type represents a complete row from the constitutional_loopholes table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ConstitutionalLoopholesTable = typeof schema.constitutional_loopholes.$inferSelect;

/**
 * constitutional_loopholes insert type (for creating new records)
 * Inferred from Drizzle schema: schema.constitutional_loopholes
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ConstitutionalLoopholesTableInsert = typeof schema.constitutional_loopholes.$inferInsert;

/**
 * elite_knowledge_scores table type (database representation)
 * Inferred from Drizzle schema: schema.elite_knowledge_scores
 * 
 * This type represents a complete row from the elite_knowledge_scores table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EliteKnowledgeScoresTable = typeof schema.elite_knowledge_scores.$inferSelect;

/**
 * elite_knowledge_scores insert type (for creating new records)
 * Inferred from Drizzle schema: schema.elite_knowledge_scores
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EliteKnowledgeScoresTableInsert = typeof schema.elite_knowledge_scores.$inferInsert;

/**
 * expertCredentials table type (database representation)
 * Inferred from Drizzle schema: schema.expertCredentials
 * 
 * This type represents a complete row from the expertCredentials table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertCredentialsTable = typeof schema.expertCredentials.$inferSelect;

/**
 * expertCredentials insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expertCredentials
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertCredentialsTableInsert = typeof schema.expertCredentials.$inferInsert;

/**
 * expertDomains table type (database representation)
 * Inferred from Drizzle schema: schema.expertDomains
 * 
 * This type represents a complete row from the expertDomains table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertDomainsTable = typeof schema.expertDomains.$inferSelect;

/**
 * expertDomains insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expertDomains
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertDomainsTableInsert = typeof schema.expertDomains.$inferInsert;

/**
 * credibilityScores table type (database representation)
 * Inferred from Drizzle schema: schema.credibilityScores
 * 
 * This type represents a complete row from the credibilityScores table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CredibilityScoresTable = typeof schema.credibilityScores.$inferSelect;

/**
 * credibilityScores insert type (for creating new records)
 * Inferred from Drizzle schema: schema.credibilityScores
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CredibilityScoresTableInsert = typeof schema.credibilityScores.$inferInsert;

/**
 * expertReviews table type (database representation)
 * Inferred from Drizzle schema: schema.expertReviews
 * 
 * This type represents a complete row from the expertReviews table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertReviewsTable = typeof schema.expertReviews.$inferSelect;

/**
 * expertReviews insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expertReviews
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertReviewsTableInsert = typeof schema.expertReviews.$inferInsert;

/**
 * peerValidations table type (database representation)
 * Inferred from Drizzle schema: schema.peerValidations
 * 
 * This type represents a complete row from the peerValidations table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PeerValidationsTable = typeof schema.peerValidations.$inferSelect;

/**
 * peerValidations insert type (for creating new records)
 * Inferred from Drizzle schema: schema.peerValidations
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PeerValidationsTableInsert = typeof schema.peerValidations.$inferInsert;

/**
 * expertActivity table type (database representation)
 * Inferred from Drizzle schema: schema.expertActivity
 * 
 * This type represents a complete row from the expertActivity table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertActivityTable = typeof schema.expertActivity.$inferSelect;

/**
 * expertActivity insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expertActivity
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertActivityTableInsert = typeof schema.expertActivity.$inferInsert;

/**
 * users table type (database representation)
 * Inferred from Drizzle schema: schema.users
 * 
 * This type represents a complete row from the users table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UsersTable = typeof schema.users.$inferSelect;

/**
 * users insert type (for creating new records)
 * Inferred from Drizzle schema: schema.users
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UsersTableInsert = typeof schema.users.$inferInsert;

/**
 * user_profiles table type (database representation)
 * Inferred from Drizzle schema: schema.user_profiles
 * 
 * This type represents a complete row from the user_profiles table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserProfilesTable = typeof schema.user_profiles.$inferSelect;

/**
 * user_profiles insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_profiles
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserProfilesTableInsert = typeof schema.user_profiles.$inferInsert;

/**
 * sponsors table type (database representation)
 * Inferred from Drizzle schema: schema.sponsors
 * 
 * This type represents a complete row from the sponsors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SponsorsTable = typeof schema.sponsors.$inferSelect;

/**
 * sponsors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.sponsors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SponsorsTableInsert = typeof schema.sponsors.$inferInsert;

/**
 * governors table type (database representation)
 * Inferred from Drizzle schema: schema.governors
 * 
 * This type represents a complete row from the governors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GovernorsTable = typeof schema.governors.$inferSelect;

/**
 * governors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.governors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GovernorsTableInsert = typeof schema.governors.$inferInsert;

/**
 * committees table type (database representation)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type represents a complete row from the committees table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommitteesTable = typeof schema.committees.$inferSelect;

/**
 * committees insert type (for creating new records)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommitteesTableInsert = typeof schema.committees.$inferInsert;

/**
 * committee_members table type (database representation)
 * Inferred from Drizzle schema: schema.committee_members
 * 
 * This type represents a complete row from the committee_members table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommitteeMembersTable = typeof schema.committee_members.$inferSelect;

/**
 * committee_members insert type (for creating new records)
 * Inferred from Drizzle schema: schema.committee_members
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommitteeMembersTableInsert = typeof schema.committee_members.$inferInsert;

/**
 * parliamentary_sessions table type (database representation)
 * Inferred from Drizzle schema: schema.parliamentary_sessions
 * 
 * This type represents a complete row from the parliamentary_sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParliamentarySessionsTable = typeof schema.parliamentary_sessions.$inferSelect;

/**
 * parliamentary_sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.parliamentary_sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParliamentarySessionsTableInsert = typeof schema.parliamentary_sessions.$inferInsert;

/**
 * parliamentary_sittings table type (database representation)
 * Inferred from Drizzle schema: schema.parliamentary_sittings
 * 
 * This type represents a complete row from the parliamentary_sittings table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParliamentarySittingsTable = typeof schema.parliamentary_sittings.$inferSelect;

/**
 * parliamentary_sittings insert type (for creating new records)
 * Inferred from Drizzle schema: schema.parliamentary_sittings
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParliamentarySittingsTableInsert = typeof schema.parliamentary_sittings.$inferInsert;

/**
 * bills table type (database representation)
 * Inferred from Drizzle schema: schema.bills
 * 
 * This type represents a complete row from the bills table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillsTable = typeof schema.bills.$inferSelect;

/**
 * bills insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bills
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillsTableInsert = typeof schema.bills.$inferInsert;

/**
 * county_bill_assents table type (database representation)
 * Inferred from Drizzle schema: schema.county_bill_assents
 * 
 * This type represents a complete row from the county_bill_assents table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CountyBillAssentsTable = typeof schema.county_bill_assents.$inferSelect;

/**
 * county_bill_assents insert type (for creating new records)
 * Inferred from Drizzle schema: schema.county_bill_assents
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CountyBillAssentsTableInsert = typeof schema.county_bill_assents.$inferInsert;

/**
 * oauth_providers table type (database representation)
 * Inferred from Drizzle schema: schema.oauth_providers
 * 
 * This type represents a complete row from the oauth_providers table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type OauthProvidersTable = typeof schema.oauth_providers.$inferSelect;

/**
 * oauth_providers insert type (for creating new records)
 * Inferred from Drizzle schema: schema.oauth_providers
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type OauthProvidersTableInsert = typeof schema.oauth_providers.$inferInsert;

/**
 * user_sessions table type (database representation)
 * Inferred from Drizzle schema: schema.user_sessions
 * 
 * This type represents a complete row from the user_sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserSessionsTable = typeof schema.user_sessions.$inferSelect;

/**
 * user_sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserSessionsTableInsert = typeof schema.user_sessions.$inferInsert;

/**
 * oauth_tokens table type (database representation)
 * Inferred from Drizzle schema: schema.oauth_tokens
 * 
 * This type represents a complete row from the oauth_tokens table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type OauthTokensTable = typeof schema.oauth_tokens.$inferSelect;

/**
 * oauth_tokens insert type (for creating new records)
 * Inferred from Drizzle schema: schema.oauth_tokens
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type OauthTokensTableInsert = typeof schema.oauth_tokens.$inferInsert;

/**
 * graph_sync_status table type (database representation)
 * Inferred from Drizzle schema: schema.graph_sync_status
 * 
 * This type represents a complete row from the graph_sync_status table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GraphSyncStatusTable = typeof schema.graph_sync_status.$inferSelect;

/**
 * graph_sync_status insert type (for creating new records)
 * Inferred from Drizzle schema: schema.graph_sync_status
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GraphSyncStatusTableInsert = typeof schema.graph_sync_status.$inferInsert;

/**
 * graph_sync_failures table type (database representation)
 * Inferred from Drizzle schema: schema.graph_sync_failures
 * 
 * This type represents a complete row from the graph_sync_failures table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GraphSyncFailuresTable = typeof schema.graph_sync_failures.$inferSelect;

/**
 * graph_sync_failures insert type (for creating new records)
 * Inferred from Drizzle schema: schema.graph_sync_failures
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GraphSyncFailuresTableInsert = typeof schema.graph_sync_failures.$inferInsert;

/**
 * graph_sync_relationships table type (database representation)
 * Inferred from Drizzle schema: schema.graph_sync_relationships
 * 
 * This type represents a complete row from the graph_sync_relationships table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GraphSyncRelationshipsTable = typeof schema.graph_sync_relationships.$inferSelect;

/**
 * graph_sync_relationships insert type (for creating new records)
 * Inferred from Drizzle schema: schema.graph_sync_relationships
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GraphSyncRelationshipsTableInsert = typeof schema.graph_sync_relationships.$inferInsert;

/**
 * graph_sync_batches table type (database representation)
 * Inferred from Drizzle schema: schema.graph_sync_batches
 * 
 * This type represents a complete row from the graph_sync_batches table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GraphSyncBatchesTable = typeof schema.graph_sync_batches.$inferSelect;

/**
 * graph_sync_batches insert type (for creating new records)
 * Inferred from Drizzle schema: schema.graph_sync_batches
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GraphSyncBatchesTableInsert = typeof schema.graph_sync_batches.$inferInsert;

/**
 * participation_cohorts table type (database representation)
 * Inferred from Drizzle schema: schema.participation_cohorts
 * 
 * This type represents a complete row from the participation_cohorts table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParticipationCohortsTable = typeof schema.participation_cohorts.$inferSelect;

/**
 * participation_cohorts insert type (for creating new records)
 * Inferred from Drizzle schema: schema.participation_cohorts
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParticipationCohortsTableInsert = typeof schema.participation_cohorts.$inferInsert;

/**
 * legislative_outcomes table type (database representation)
 * Inferred from Drizzle schema: schema.legislative_outcomes
 * 
 * This type represents a complete row from the legislative_outcomes table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LegislativeOutcomesTable = typeof schema.legislative_outcomes.$inferSelect;

/**
 * legislative_outcomes insert type (for creating new records)
 * Inferred from Drizzle schema: schema.legislative_outcomes
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LegislativeOutcomesTableInsert = typeof schema.legislative_outcomes.$inferInsert;

/**
 * bill_implementation table type (database representation)
 * Inferred from Drizzle schema: schema.bill_implementation
 * 
 * This type represents a complete row from the bill_implementation table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillImplementationTable = typeof schema.bill_implementation.$inferSelect;

/**
 * bill_implementation insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_implementation
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillImplementationTableInsert = typeof schema.bill_implementation.$inferInsert;

/**
 * attribution_assessments table type (database representation)
 * Inferred from Drizzle schema: schema.attribution_assessments
 * 
 * This type represents a complete row from the attribution_assessments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AttributionAssessmentsTable = typeof schema.attribution_assessments.$inferSelect;

/**
 * attribution_assessments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.attribution_assessments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AttributionAssessmentsTableInsert = typeof schema.attribution_assessments.$inferInsert;

/**
 * success_stories table type (database representation)
 * Inferred from Drizzle schema: schema.success_stories
 * 
 * This type represents a complete row from the success_stories table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SuccessStoriesTable = typeof schema.success_stories.$inferSelect;

/**
 * success_stories insert type (for creating new records)
 * Inferred from Drizzle schema: schema.success_stories
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SuccessStoriesTableInsert = typeof schema.success_stories.$inferInsert;

/**
 * equity_metrics table type (database representation)
 * Inferred from Drizzle schema: schema.equity_metrics
 * 
 * This type represents a complete row from the equity_metrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EquityMetricsTable = typeof schema.equity_metrics.$inferSelect;

/**
 * equity_metrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.equity_metrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EquityMetricsTableInsert = typeof schema.equity_metrics.$inferInsert;

/**
 * demographic_impact_analysis table type (database representation)
 * Inferred from Drizzle schema: schema.demographic_impact_analysis
 * 
 * This type represents a complete row from the demographic_impact_analysis table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type DemographicImpactAnalysisTable = typeof schema.demographic_impact_analysis.$inferSelect;

/**
 * demographic_impact_analysis insert type (for creating new records)
 * Inferred from Drizzle schema: schema.demographic_impact_analysis
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type DemographicImpactAnalysisTableInsert = typeof schema.demographic_impact_analysis.$inferInsert;

/**
 * platform_performance_indicators table type (database representation)
 * Inferred from Drizzle schema: schema.platform_performance_indicators
 * 
 * This type represents a complete row from the platform_performance_indicators table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PlatformPerformanceIndicatorsTable = typeof schema.platform_performance_indicators.$inferSelect;

/**
 * platform_performance_indicators insert type (for creating new records)
 * Inferred from Drizzle schema: schema.platform_performance_indicators
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PlatformPerformanceIndicatorsTableInsert = typeof schema.platform_performance_indicators.$inferInsert;

/**
 * legislative_impact_indicators table type (database representation)
 * Inferred from Drizzle schema: schema.legislative_impact_indicators
 * 
 * This type represents a complete row from the legislative_impact_indicators table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LegislativeImpactIndicatorsTable = typeof schema.legislative_impact_indicators.$inferSelect;

/**
 * legislative_impact_indicators insert type (for creating new records)
 * Inferred from Drizzle schema: schema.legislative_impact_indicators
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LegislativeImpactIndicatorsTableInsert = typeof schema.legislative_impact_indicators.$inferInsert;

/**
 * civic_engagement_indicators table type (database representation)
 * Inferred from Drizzle schema: schema.civic_engagement_indicators
 * 
 * This type represents a complete row from the civic_engagement_indicators table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CivicEngagementIndicatorsTable = typeof schema.civic_engagement_indicators.$inferSelect;

/**
 * civic_engagement_indicators insert type (for creating new records)
 * Inferred from Drizzle schema: schema.civic_engagement_indicators
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CivicEngagementIndicatorsTableInsert = typeof schema.civic_engagement_indicators.$inferInsert;

/**
 * financial_sustainability_indicators table type (database representation)
 * Inferred from Drizzle schema: schema.financial_sustainability_indicators
 * 
 * This type represents a complete row from the financial_sustainability_indicators table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type FinancialSustainabilityIndicatorsTable = typeof schema.financial_sustainability_indicators.$inferSelect;

/**
 * financial_sustainability_indicators insert type (for creating new records)
 * Inferred from Drizzle schema: schema.financial_sustainability_indicators
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type FinancialSustainabilityIndicatorsTableInsert = typeof schema.financial_sustainability_indicators.$inferInsert;

/**
 * bills table type (database representation)
 * Inferred from Drizzle schema: schema.bills
 * 
 * This type represents a complete row from the bills table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillsTable = typeof schema.bills.$inferSelect;

/**
 * bills insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bills
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillsTableInsert = typeof schema.bills.$inferInsert;

/**
 * sponsors table type (database representation)
 * Inferred from Drizzle schema: schema.sponsors
 * 
 * This type represents a complete row from the sponsors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SponsorsTable = typeof schema.sponsors.$inferSelect;

/**
 * sponsors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.sponsors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SponsorsTableInsert = typeof schema.sponsors.$inferInsert;

/**
 * committees table type (database representation)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type represents a complete row from the committees table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommitteesTable = typeof schema.committees.$inferSelect;

/**
 * committees insert type (for creating new records)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommitteesTableInsert = typeof schema.committees.$inferInsert;

/**
 * governors table type (database representation)
 * Inferred from Drizzle schema: schema.governors
 * 
 * This type represents a complete row from the governors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type GovernorsTable = typeof schema.governors.$inferSelect;

/**
 * governors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.governors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type GovernorsTableInsert = typeof schema.governors.$inferInsert;

/**
 * users table type (database representation)
 * Inferred from Drizzle schema: schema.users
 * 
 * This type represents a complete row from the users table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UsersTable = typeof schema.users.$inferSelect;

/**
 * users insert type (for creating new records)
 * Inferred from Drizzle schema: schema.users
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UsersTableInsert = typeof schema.users.$inferInsert;

/**
 * content_reports table type (database representation)
 * Inferred from Drizzle schema: schema.content_reports
 * 
 * This type represents a complete row from the content_reports table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ContentReportsTable = typeof schema.content_reports.$inferSelect;

/**
 * content_reports insert type (for creating new records)
 * Inferred from Drizzle schema: schema.content_reports
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ContentReportsTableInsert = typeof schema.content_reports.$inferInsert;

/**
 * moderation_queue table type (database representation)
 * Inferred from Drizzle schema: schema.moderation_queue
 * 
 * This type represents a complete row from the moderation_queue table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ModerationQueueTable = typeof schema.moderation_queue.$inferSelect;

/**
 * moderation_queue insert type (for creating new records)
 * Inferred from Drizzle schema: schema.moderation_queue
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ModerationQueueTableInsert = typeof schema.moderation_queue.$inferInsert;

/**
 * expert_profiles table type (database representation)
 * Inferred from Drizzle schema: schema.expert_profiles
 * 
 * This type represents a complete row from the expert_profiles table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertProfilesTable = typeof schema.expert_profiles.$inferSelect;

/**
 * expert_profiles insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expert_profiles
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertProfilesTableInsert = typeof schema.expert_profiles.$inferInsert;

/**
 * user_verification table type (database representation)
 * Inferred from Drizzle schema: schema.user_verification
 * 
 * This type represents a complete row from the user_verification table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserVerificationTable = typeof schema.user_verification.$inferSelect;

/**
 * user_verification insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_verification
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserVerificationTableInsert = typeof schema.user_verification.$inferInsert;

/**
 * user_activity_log table type (database representation)
 * Inferred from Drizzle schema: schema.user_activity_log
 * 
 * This type represents a complete row from the user_activity_log table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserActivityLogTable = typeof schema.user_activity_log.$inferSelect;

/**
 * user_activity_log insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_activity_log
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserActivityLogTableInsert = typeof schema.user_activity_log.$inferInsert;

/**
 * audit_payloads table type (database representation)
 * Inferred from Drizzle schema: schema.audit_payloads
 * 
 * This type represents a complete row from the audit_payloads table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AuditPayloadsTable = typeof schema.audit_payloads.$inferSelect;

/**
 * audit_payloads insert type (for creating new records)
 * Inferred from Drizzle schema: schema.audit_payloads
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AuditPayloadsTableInsert = typeof schema.audit_payloads.$inferInsert;

/**
 * system_audit_log table type (database representation)
 * Inferred from Drizzle schema: schema.system_audit_log
 * 
 * This type represents a complete row from the system_audit_log table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SystemAuditLogTable = typeof schema.system_audit_log.$inferSelect;

/**
 * system_audit_log insert type (for creating new records)
 * Inferred from Drizzle schema: schema.system_audit_log
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SystemAuditLogTableInsert = typeof schema.system_audit_log.$inferInsert;

/**
 * security_events table type (database representation)
 * Inferred from Drizzle schema: schema.security_events
 * 
 * This type represents a complete row from the security_events table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SecurityEventsTable = typeof schema.security_events.$inferSelect;

/**
 * security_events insert type (for creating new records)
 * Inferred from Drizzle schema: schema.security_events
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SecurityEventsTableInsert = typeof schema.security_events.$inferInsert;

/**
 * market_sectors table type (database representation)
 * Inferred from Drizzle schema: schema.market_sectors
 * 
 * This type represents a complete row from the market_sectors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type MarketSectorsTable = typeof schema.market_sectors.$inferSelect;

/**
 * market_sectors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.market_sectors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type MarketSectorsTableInsert = typeof schema.market_sectors.$inferInsert;

/**
 * economic_impact_assessments table type (database representation)
 * Inferred from Drizzle schema: schema.economic_impact_assessments
 * 
 * This type represents a complete row from the economic_impact_assessments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EconomicImpactAssessmentsTable = typeof schema.economic_impact_assessments.$inferSelect;

/**
 * economic_impact_assessments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.economic_impact_assessments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EconomicImpactAssessmentsTableInsert = typeof schema.economic_impact_assessments.$inferInsert;

/**
 * market_stakeholders table type (database representation)
 * Inferred from Drizzle schema: schema.market_stakeholders
 * 
 * This type represents a complete row from the market_stakeholders table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type MarketStakeholdersTable = typeof schema.market_stakeholders.$inferSelect;

/**
 * market_stakeholders insert type (for creating new records)
 * Inferred from Drizzle schema: schema.market_stakeholders
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type MarketStakeholdersTableInsert = typeof schema.market_stakeholders.$inferInsert;

/**
 * stakeholder_positions table type (database representation)
 * Inferred from Drizzle schema: schema.stakeholder_positions
 * 
 * This type represents a complete row from the stakeholder_positions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type StakeholderPositionsTable = typeof schema.stakeholder_positions.$inferSelect;

/**
 * stakeholder_positions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.stakeholder_positions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type StakeholderPositionsTableInsert = typeof schema.stakeholder_positions.$inferInsert;

/**
 * market_trends table type (database representation)
 * Inferred from Drizzle schema: schema.market_trends
 * 
 * This type represents a complete row from the market_trends table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type MarketTrendsTable = typeof schema.market_trends.$inferSelect;

/**
 * market_trends insert type (for creating new records)
 * Inferred from Drizzle schema: schema.market_trends
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type MarketTrendsTableInsert = typeof schema.market_trends.$inferInsert;

/**
 * committees table type (database representation)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type represents a complete row from the committees table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommitteesTable = typeof schema.committees.$inferSelect;

/**
 * committees insert type (for creating new records)
 * Inferred from Drizzle schema: schema.committees
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommitteesTableInsert = typeof schema.committees.$inferInsert;

/**
 * parliamentary_sessions table type (database representation)
 * Inferred from Drizzle schema: schema.parliamentary_sessions
 * 
 * This type represents a complete row from the parliamentary_sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParliamentarySessionsTable = typeof schema.parliamentary_sessions.$inferSelect;

/**
 * parliamentary_sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.parliamentary_sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParliamentarySessionsTableInsert = typeof schema.parliamentary_sessions.$inferInsert;

/**
 * bill_committee_assignments table type (database representation)
 * Inferred from Drizzle schema: schema.bill_committee_assignments
 * 
 * This type represents a complete row from the bill_committee_assignments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillCommitteeAssignmentsTable = typeof schema.bill_committee_assignments.$inferSelect;

/**
 * bill_committee_assignments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_committee_assignments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillCommitteeAssignmentsTableInsert = typeof schema.bill_committee_assignments.$inferInsert;

/**
 * bill_amendments table type (database representation)
 * Inferred from Drizzle schema: schema.bill_amendments
 * 
 * This type represents a complete row from the bill_amendments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillAmendmentsTable = typeof schema.bill_amendments.$inferSelect;

/**
 * bill_amendments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_amendments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillAmendmentsTableInsert = typeof schema.bill_amendments.$inferInsert;

/**
 * bill_versions table type (database representation)
 * Inferred from Drizzle schema: schema.bill_versions
 * 
 * This type represents a complete row from the bill_versions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillVersionsTable = typeof schema.bill_versions.$inferSelect;

/**
 * bill_versions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_versions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillVersionsTableInsert = typeof schema.bill_versions.$inferInsert;

/**
 * bill_readings table type (database representation)
 * Inferred from Drizzle schema: schema.bill_readings
 * 
 * This type represents a complete row from the bill_readings table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillReadingsTable = typeof schema.bill_readings.$inferSelect;

/**
 * bill_readings insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_readings
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillReadingsTableInsert = typeof schema.bill_readings.$inferInsert;

/**
 * parliamentary_votes table type (database representation)
 * Inferred from Drizzle schema: schema.parliamentary_votes
 * 
 * This type represents a complete row from the parliamentary_votes table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParliamentaryVotesTable = typeof schema.parliamentary_votes.$inferSelect;

/**
 * parliamentary_votes insert type (for creating new records)
 * Inferred from Drizzle schema: schema.parliamentary_votes
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParliamentaryVotesTableInsert = typeof schema.parliamentary_votes.$inferInsert;

/**
 * bill_cosponsors table type (database representation)
 * Inferred from Drizzle schema: schema.bill_cosponsors
 * 
 * This type represents a complete row from the bill_cosponsors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillCosponsorsTable = typeof schema.bill_cosponsors.$inferSelect;

/**
 * bill_cosponsors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_cosponsors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillCosponsorsTableInsert = typeof schema.bill_cosponsors.$inferInsert;

/**
 * public_participation_events table type (database representation)
 * Inferred from Drizzle schema: schema.public_participation_events
 * 
 * This type represents a complete row from the public_participation_events table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PublicParticipationEventsTable = typeof schema.public_participation_events.$inferSelect;

/**
 * public_participation_events insert type (for creating new records)
 * Inferred from Drizzle schema: schema.public_participation_events
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PublicParticipationEventsTableInsert = typeof schema.public_participation_events.$inferInsert;

/**
 * public_submissions table type (database representation)
 * Inferred from Drizzle schema: schema.public_submissions
 * 
 * This type represents a complete row from the public_submissions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PublicSubmissionsTable = typeof schema.public_submissions.$inferSelect;

/**
 * public_submissions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.public_submissions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PublicSubmissionsTableInsert = typeof schema.public_submissions.$inferInsert;

/**
 * public_hearings table type (database representation)
 * Inferred from Drizzle schema: schema.public_hearings
 * 
 * This type represents a complete row from the public_hearings table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PublicHearingsTable = typeof schema.public_hearings.$inferSelect;

/**
 * public_hearings insert type (for creating new records)
 * Inferred from Drizzle schema: schema.public_hearings
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PublicHearingsTableInsert = typeof schema.public_hearings.$inferInsert;

/**
 * participation_quality_audits table type (database representation)
 * Inferred from Drizzle schema: schema.participation_quality_audits
 * 
 * This type represents a complete row from the participation_quality_audits table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ParticipationQualityAuditsTable = typeof schema.participation_quality_audits.$inferSelect;

/**
 * participation_quality_audits insert type (for creating new records)
 * Inferred from Drizzle schema: schema.participation_quality_audits
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ParticipationQualityAuditsTableInsert = typeof schema.participation_quality_audits.$inferInsert;

/**
 * data_sources table type (database representation)
 * Inferred from Drizzle schema: schema.data_sources
 * 
 * This type represents a complete row from the data_sources table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type DataSourcesTable = typeof schema.data_sources.$inferSelect;

/**
 * data_sources insert type (for creating new records)
 * Inferred from Drizzle schema: schema.data_sources
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type DataSourcesTableInsert = typeof schema.data_sources.$inferInsert;

/**
 * sync_jobs table type (database representation)
 * Inferred from Drizzle schema: schema.sync_jobs
 * 
 * This type represents a complete row from the sync_jobs table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SyncJobsTable = typeof schema.sync_jobs.$inferSelect;

/**
 * sync_jobs insert type (for creating new records)
 * Inferred from Drizzle schema: schema.sync_jobs
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SyncJobsTableInsert = typeof schema.sync_jobs.$inferInsert;

/**
 * external_bill_references table type (database representation)
 * Inferred from Drizzle schema: schema.external_bill_references
 * 
 * This type represents a complete row from the external_bill_references table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExternalBillReferencesTable = typeof schema.external_bill_references.$inferSelect;

/**
 * external_bill_references insert type (for creating new records)
 * Inferred from Drizzle schema: schema.external_bill_references
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExternalBillReferencesTableInsert = typeof schema.external_bill_references.$inferInsert;

/**
 * analytics_events table type (database representation)
 * Inferred from Drizzle schema: schema.analytics_events
 * 
 * This type represents a complete row from the analytics_events table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AnalyticsEventsTable = typeof schema.analytics_events.$inferSelect;

/**
 * analytics_events insert type (for creating new records)
 * Inferred from Drizzle schema: schema.analytics_events
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AnalyticsEventsTableInsert = typeof schema.analytics_events.$inferInsert;

/**
 * bill_impact_metrics table type (database representation)
 * Inferred from Drizzle schema: schema.bill_impact_metrics
 * 
 * This type represents a complete row from the bill_impact_metrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillImpactMetricsTable = typeof schema.bill_impact_metrics.$inferSelect;

/**
 * bill_impact_metrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_impact_metrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillImpactMetricsTableInsert = typeof schema.bill_impact_metrics.$inferInsert;

/**
 * county_engagement_stats table type (database representation)
 * Inferred from Drizzle schema: schema.county_engagement_stats
 * 
 * This type represents a complete row from the county_engagement_stats table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CountyEngagementStatsTable = typeof schema.county_engagement_stats.$inferSelect;

/**
 * county_engagement_stats insert type (for creating new records)
 * Inferred from Drizzle schema: schema.county_engagement_stats
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CountyEngagementStatsTableInsert = typeof schema.county_engagement_stats.$inferInsert;

/**
 * trending_analysis table type (database representation)
 * Inferred from Drizzle schema: schema.trending_analysis
 * 
 * This type represents a complete row from the trending_analysis table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type TrendingAnalysisTable = typeof schema.trending_analysis.$inferSelect;

/**
 * trending_analysis insert type (for creating new records)
 * Inferred from Drizzle schema: schema.trending_analysis
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type TrendingAnalysisTableInsert = typeof schema.trending_analysis.$inferInsert;

/**
 * user_engagement_summary table type (database representation)
 * Inferred from Drizzle schema: schema.user_engagement_summary
 * 
 * This type represents a complete row from the user_engagement_summary table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserEngagementSummaryTable = typeof schema.user_engagement_summary.$inferSelect;

/**
 * user_engagement_summary insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_engagement_summary
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserEngagementSummaryTableInsert = typeof schema.user_engagement_summary.$inferInsert;

/**
 * platform_health_metrics table type (database representation)
 * Inferred from Drizzle schema: schema.platform_health_metrics
 * 
 * This type represents a complete row from the platform_health_metrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PlatformHealthMetricsTable = typeof schema.platform_health_metrics.$inferSelect;

/**
 * platform_health_metrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.platform_health_metrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PlatformHealthMetricsTableInsert = typeof schema.platform_health_metrics.$inferInsert;

/**
 * content_performance table type (database representation)
 * Inferred from Drizzle schema: schema.content_performance
 * 
 * This type represents a complete row from the content_performance table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ContentPerformanceTable = typeof schema.content_performance.$inferSelect;

/**
 * content_performance insert type (for creating new records)
 * Inferred from Drizzle schema: schema.content_performance
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ContentPerformanceTableInsert = typeof schema.content_performance.$inferInsert;

/**
 * political_appointments table type (database representation)
 * Inferred from Drizzle schema: schema.political_appointments
 * 
 * This type represents a complete row from the political_appointments table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type PoliticalAppointmentsTable = typeof schema.political_appointments.$inferSelect;

/**
 * political_appointments insert type (for creating new records)
 * Inferred from Drizzle schema: schema.political_appointments
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type PoliticalAppointmentsTableInsert = typeof schema.political_appointments.$inferInsert;

/**
 * infrastructure_tenders table type (database representation)
 * Inferred from Drizzle schema: schema.infrastructure_tenders
 * 
 * This type represents a complete row from the infrastructure_tenders table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type InfrastructureTendersTable = typeof schema.infrastructure_tenders.$inferSelect;

/**
 * infrastructure_tenders insert type (for creating new records)
 * Inferred from Drizzle schema: schema.infrastructure_tenders
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type InfrastructureTendersTableInsert = typeof schema.infrastructure_tenders.$inferInsert;

/**
 * ethnic_advantage_scores table type (database representation)
 * Inferred from Drizzle schema: schema.ethnic_advantage_scores
 * 
 * This type represents a complete row from the ethnic_advantage_scores table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EthnicAdvantageScoresTable = typeof schema.ethnic_advantage_scores.$inferSelect;

/**
 * ethnic_advantage_scores insert type (for creating new records)
 * Inferred from Drizzle schema: schema.ethnic_advantage_scores
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EthnicAdvantageScoresTableInsert = typeof schema.ethnic_advantage_scores.$inferInsert;

/**
 * strategic_infrastructure_projects table type (database representation)
 * Inferred from Drizzle schema: schema.strategic_infrastructure_projects
 * 
 * This type represents a complete row from the strategic_infrastructure_projects table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type StrategicInfrastructureProjectsTable = typeof schema.strategic_infrastructure_projects.$inferSelect;

/**
 * strategic_infrastructure_projects insert type (for creating new records)
 * Inferred from Drizzle schema: schema.strategic_infrastructure_projects
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type StrategicInfrastructureProjectsTableInsert = typeof schema.strategic_infrastructure_projects.$inferInsert;

/**
 * engagementEvents table type (database representation)
 * Inferred from Drizzle schema: schema.engagementEvents
 * 
 * This type represents a complete row from the engagementEvents table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EngagementEventsTable = typeof schema.engagementEvents.$inferSelect;

/**
 * engagementEvents insert type (for creating new records)
 * Inferred from Drizzle schema: schema.engagementEvents
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EngagementEventsTableInsert = typeof schema.engagementEvents.$inferInsert;

/**
 * liveMetricsCache table type (database representation)
 * Inferred from Drizzle schema: schema.liveMetricsCache
 * 
 * This type represents a complete row from the liveMetricsCache table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LiveMetricsCacheTable = typeof schema.liveMetricsCache.$inferSelect;

/**
 * liveMetricsCache insert type (for creating new records)
 * Inferred from Drizzle schema: schema.liveMetricsCache
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LiveMetricsCacheTableInsert = typeof schema.liveMetricsCache.$inferInsert;

/**
 * civicAchievements table type (database representation)
 * Inferred from Drizzle schema: schema.civicAchievements
 * 
 * This type represents a complete row from the civicAchievements table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CivicAchievementsTable = typeof schema.civicAchievements.$inferSelect;

/**
 * civicAchievements insert type (for creating new records)
 * Inferred from Drizzle schema: schema.civicAchievements
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CivicAchievementsTableInsert = typeof schema.civicAchievements.$inferInsert;

/**
 * userAchievements table type (database representation)
 * Inferred from Drizzle schema: schema.userAchievements
 * 
 * This type represents a complete row from the userAchievements table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserAchievementsTable = typeof schema.userAchievements.$inferSelect;

/**
 * userAchievements insert type (for creating new records)
 * Inferred from Drizzle schema: schema.userAchievements
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserAchievementsTableInsert = typeof schema.userAchievements.$inferInsert;

/**
 * civicScores table type (database representation)
 * Inferred from Drizzle schema: schema.civicScores
 * 
 * This type represents a complete row from the civicScores table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CivicScoresTable = typeof schema.civicScores.$inferSelect;

/**
 * civicScores insert type (for creating new records)
 * Inferred from Drizzle schema: schema.civicScores
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CivicScoresTableInsert = typeof schema.civicScores.$inferInsert;

/**
 * engagementLeaderboards table type (database representation)
 * Inferred from Drizzle schema: schema.engagementLeaderboards
 * 
 * This type represents a complete row from the engagementLeaderboards table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EngagementLeaderboardsTable = typeof schema.engagementLeaderboards.$inferSelect;

/**
 * engagementLeaderboards insert type (for creating new records)
 * Inferred from Drizzle schema: schema.engagementLeaderboards
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EngagementLeaderboardsTableInsert = typeof schema.engagementLeaderboards.$inferInsert;

/**
 * realTimeNotifications table type (database representation)
 * Inferred from Drizzle schema: schema.realTimeNotifications
 * 
 * This type represents a complete row from the realTimeNotifications table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RealTimeNotificationsTable = typeof schema.realTimeNotifications.$inferSelect;

/**
 * realTimeNotifications insert type (for creating new records)
 * Inferred from Drizzle schema: schema.realTimeNotifications
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RealTimeNotificationsTableInsert = typeof schema.realTimeNotifications.$inferInsert;

/**
 * engagementAnalytics table type (database representation)
 * Inferred from Drizzle schema: schema.engagementAnalytics
 * 
 * This type represents a complete row from the engagementAnalytics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EngagementAnalyticsTable = typeof schema.engagementAnalytics.$inferSelect;

/**
 * engagementAnalytics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.engagementAnalytics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EngagementAnalyticsTableInsert = typeof schema.engagementAnalytics.$inferInsert;

/**
 * userEngagementSummary table type (database representation)
 * Inferred from Drizzle schema: schema.userEngagementSummary
 * 
 * This type represents a complete row from the userEngagementSummary table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserEngagementSummaryTable = typeof schema.userEngagementSummary.$inferSelect;

/**
 * userEngagementSummary insert type (for creating new records)
 * Inferred from Drizzle schema: schema.userEngagementSummary
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserEngagementSummaryTableInsert = typeof schema.userEngagementSummary.$inferInsert;

/**
 * rateLimits table type (database representation)
 * Inferred from Drizzle schema: schema.rateLimits
 * 
 * This type represents a complete row from the rateLimits table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RateLimitsTable = typeof schema.rateLimits.$inferSelect;

/**
 * rateLimits insert type (for creating new records)
 * Inferred from Drizzle schema: schema.rateLimits
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RateLimitsTableInsert = typeof schema.rateLimits.$inferInsert;

/**
 * rateLimitConfig table type (database representation)
 * Inferred from Drizzle schema: schema.rateLimitConfig
 * 
 * This type represents a complete row from the rateLimitConfig table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RateLimitConfigTable = typeof schema.rateLimitConfig.$inferSelect;

/**
 * rateLimitConfig insert type (for creating new records)
 * Inferred from Drizzle schema: schema.rateLimitConfig
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RateLimitConfigTableInsert = typeof schema.rateLimitConfig.$inferInsert;

/**
 * contentFlags table type (database representation)
 * Inferred from Drizzle schema: schema.contentFlags
 * 
 * This type represents a complete row from the contentFlags table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ContentFlagsTable = typeof schema.contentFlags.$inferSelect;

/**
 * contentFlags insert type (for creating new records)
 * Inferred from Drizzle schema: schema.contentFlags
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ContentFlagsTableInsert = typeof schema.contentFlags.$inferInsert;

/**
 * moderationQueue table type (database representation)
 * Inferred from Drizzle schema: schema.moderationQueue
 * 
 * This type represents a complete row from the moderationQueue table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ModerationQueueTable = typeof schema.moderationQueue.$inferSelect;

/**
 * moderationQueue insert type (for creating new records)
 * Inferred from Drizzle schema: schema.moderationQueue
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ModerationQueueTableInsert = typeof schema.moderationQueue.$inferInsert;

/**
 * moderationDecisions table type (database representation)
 * Inferred from Drizzle schema: schema.moderationDecisions
 * 
 * This type represents a complete row from the moderationDecisions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ModerationDecisionsTable = typeof schema.moderationDecisions.$inferSelect;

/**
 * moderationDecisions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.moderationDecisions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ModerationDecisionsTableInsert = typeof schema.moderationDecisions.$inferInsert;

/**
 * moderationAppeals table type (database representation)
 * Inferred from Drizzle schema: schema.moderationAppeals
 * 
 * This type represents a complete row from the moderationAppeals table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ModerationAppealsTable = typeof schema.moderationAppeals.$inferSelect;

/**
 * moderationAppeals insert type (for creating new records)
 * Inferred from Drizzle schema: schema.moderationAppeals
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ModerationAppealsTableInsert = typeof schema.moderationAppeals.$inferInsert;

/**
 * expertModeratorEligibility table type (database representation)
 * Inferred from Drizzle schema: schema.expertModeratorEligibility
 * 
 * This type represents a complete row from the expertModeratorEligibility table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ExpertModeratorEligibilityTable = typeof schema.expertModeratorEligibility.$inferSelect;

/**
 * expertModeratorEligibility insert type (for creating new records)
 * Inferred from Drizzle schema: schema.expertModeratorEligibility
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ExpertModeratorEligibilityTableInsert = typeof schema.expertModeratorEligibility.$inferInsert;

/**
 * cibDetections table type (database representation)
 * Inferred from Drizzle schema: schema.cibDetections
 * 
 * This type represents a complete row from the cibDetections table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CibDetectionsTable = typeof schema.cibDetections.$inferSelect;

/**
 * cibDetections insert type (for creating new records)
 * Inferred from Drizzle schema: schema.cibDetections
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CibDetectionsTableInsert = typeof schema.cibDetections.$inferInsert;

/**
 * behavioralAnomalies table type (database representation)
 * Inferred from Drizzle schema: schema.behavioralAnomalies
 * 
 * This type represents a complete row from the behavioralAnomalies table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BehavioralAnomaliesTable = typeof schema.behavioralAnomalies.$inferSelect;

/**
 * behavioralAnomalies insert type (for creating new records)
 * Inferred from Drizzle schema: schema.behavioralAnomalies
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BehavioralAnomaliesTableInsert = typeof schema.behavioralAnomalies.$inferInsert;

/**
 * suspiciousActivityLogs table type (database representation)
 * Inferred from Drizzle schema: schema.suspiciousActivityLogs
 * 
 * This type represents a complete row from the suspiciousActivityLogs table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SuspiciousActivityLogsTable = typeof schema.suspiciousActivityLogs.$inferSelect;

/**
 * suspiciousActivityLogs insert type (for creating new records)
 * Inferred from Drizzle schema: schema.suspiciousActivityLogs
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SuspiciousActivityLogsTableInsert = typeof schema.suspiciousActivityLogs.$inferInsert;

/**
 * reputationScores table type (database representation)
 * Inferred from Drizzle schema: schema.reputationScores
 * 
 * This type represents a complete row from the reputationScores table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ReputationScoresTable = typeof schema.reputationScores.$inferSelect;

/**
 * reputationScores insert type (for creating new records)
 * Inferred from Drizzle schema: schema.reputationScores
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ReputationScoresTableInsert = typeof schema.reputationScores.$inferInsert;

/**
 * reputationHistory table type (database representation)
 * Inferred from Drizzle schema: schema.reputationHistory
 * 
 * This type represents a complete row from the reputationHistory table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ReputationHistoryTable = typeof schema.reputationHistory.$inferSelect;

/**
 * reputationHistory insert type (for creating new records)
 * Inferred from Drizzle schema: schema.reputationHistory
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ReputationHistoryTableInsert = typeof schema.reputationHistory.$inferInsert;

/**
 * identityVerification table type (database representation)
 * Inferred from Drizzle schema: schema.identityVerification
 * 
 * This type represents a complete row from the identityVerification table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type IdentityVerificationTable = typeof schema.identityVerification.$inferSelect;

/**
 * identityVerification insert type (for creating new records)
 * Inferred from Drizzle schema: schema.identityVerification
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type IdentityVerificationTableInsert = typeof schema.identityVerification.$inferInsert;

/**
 * deviceFingerprints table type (database representation)
 * Inferred from Drizzle schema: schema.deviceFingerprints
 * 
 * This type represents a complete row from the deviceFingerprints table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type DeviceFingerprintsTable = typeof schema.deviceFingerprints.$inferSelect;

/**
 * deviceFingerprints insert type (for creating new records)
 * Inferred from Drizzle schema: schema.deviceFingerprints
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type DeviceFingerprintsTableInsert = typeof schema.deviceFingerprints.$inferInsert;

/**
 * safeguardConfigAudit table type (database representation)
 * Inferred from Drizzle schema: schema.safeguardConfigAudit
 * 
 * This type represents a complete row from the safeguardConfigAudit table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SafeguardConfigAuditTable = typeof schema.safeguardConfigAudit.$inferSelect;

/**
 * safeguardConfigAudit insert type (for creating new records)
 * Inferred from Drizzle schema: schema.safeguardConfigAudit
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SafeguardConfigAuditTableInsert = typeof schema.safeguardConfigAudit.$inferInsert;

/**
 * emergencySafeguardMode table type (database representation)
 * Inferred from Drizzle schema: schema.emergencySafeguardMode
 * 
 * This type represents a complete row from the emergencySafeguardMode table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type EmergencySafeguardModeTable = typeof schema.emergencySafeguardMode.$inferSelect;

/**
 * emergencySafeguardMode insert type (for creating new records)
 * Inferred from Drizzle schema: schema.emergencySafeguardMode
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type EmergencySafeguardModeTableInsert = typeof schema.emergencySafeguardMode.$inferInsert;

/**
 * rateLimitWhitelist table type (database representation)
 * Inferred from Drizzle schema: schema.rateLimitWhitelist
 * 
 * This type represents a complete row from the rateLimitWhitelist table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RateLimitWhitelistTable = typeof schema.rateLimitWhitelist.$inferSelect;

/**
 * rateLimitWhitelist insert type (for creating new records)
 * Inferred from Drizzle schema: schema.rateLimitWhitelist
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RateLimitWhitelistTableInsert = typeof schema.rateLimitWhitelist.$inferInsert;

/**
 * rateLimitBlacklist table type (database representation)
 * Inferred from Drizzle schema: schema.rateLimitBlacklist
 * 
 * This type represents a complete row from the rateLimitBlacklist table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RateLimitBlacklistTable = typeof schema.rateLimitBlacklist.$inferSelect;

/**
 * rateLimitBlacklist insert type (for creating new records)
 * Inferred from Drizzle schema: schema.rateLimitBlacklist
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RateLimitBlacklistTableInsert = typeof schema.rateLimitBlacklist.$inferInsert;

/**
 * moderationPriorityRules table type (database representation)
 * Inferred from Drizzle schema: schema.moderationPriorityRules
 * 
 * This type represents a complete row from the moderationPriorityRules table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ModerationPriorityRulesTable = typeof schema.moderationPriorityRules.$inferSelect;

/**
 * moderationPriorityRules insert type (for creating new records)
 * Inferred from Drizzle schema: schema.moderationPriorityRules
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ModerationPriorityRulesTableInsert = typeof schema.moderationPriorityRules.$inferInsert;

/**
 * appealReviewBoard table type (database representation)
 * Inferred from Drizzle schema: schema.appealReviewBoard
 * 
 * This type represents a complete row from the appealReviewBoard table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AppealReviewBoardTable = typeof schema.appealReviewBoard.$inferSelect;

/**
 * appealReviewBoard insert type (for creating new records)
 * Inferred from Drizzle schema: schema.appealReviewBoard
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AppealReviewBoardTableInsert = typeof schema.appealReviewBoard.$inferInsert;

/**
 * safeguardMetrics table type (database representation)
 * Inferred from Drizzle schema: schema.safeguardMetrics
 * 
 * This type represents a complete row from the safeguardMetrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SafeguardMetricsTable = typeof schema.safeguardMetrics.$inferSelect;

/**
 * safeguardMetrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.safeguardMetrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SafeguardMetricsTableInsert = typeof schema.safeguardMetrics.$inferInsert;

/**
 * contentEmbeddings table type (database representation)
 * Inferred from Drizzle schema: schema.contentEmbeddings
 * 
 * This type represents a complete row from the contentEmbeddings table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ContentEmbeddingsTable = typeof schema.contentEmbeddings.$inferSelect;

/**
 * contentEmbeddings insert type (for creating new records)
 * Inferred from Drizzle schema: schema.contentEmbeddings
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ContentEmbeddingsTableInsert = typeof schema.contentEmbeddings.$inferInsert;

/**
 * searchQueries table type (database representation)
 * Inferred from Drizzle schema: schema.searchQueries
 * 
 * This type represents a complete row from the searchQueries table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SearchQueriesTable = typeof schema.searchQueries.$inferSelect;

/**
 * searchQueries insert type (for creating new records)
 * Inferred from Drizzle schema: schema.searchQueries
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SearchQueriesTableInsert = typeof schema.searchQueries.$inferInsert;

/**
 * searchAnalytics table type (database representation)
 * Inferred from Drizzle schema: schema.searchAnalytics
 * 
 * This type represents a complete row from the searchAnalytics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type SearchAnalyticsTable = typeof schema.searchAnalytics.$inferSelect;

/**
 * searchAnalytics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.searchAnalytics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type SearchAnalyticsTableInsert = typeof schema.searchAnalytics.$inferInsert;

/**
 * corporate_entities table type (database representation)
 * Inferred from Drizzle schema: schema.corporate_entities
 * 
 * This type represents a complete row from the corporate_entities table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CorporateEntitiesTable = typeof schema.corporate_entities.$inferSelect;

/**
 * corporate_entities insert type (for creating new records)
 * Inferred from Drizzle schema: schema.corporate_entities
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CorporateEntitiesTableInsert = typeof schema.corporate_entities.$inferInsert;

/**
 * financial_interests table type (database representation)
 * Inferred from Drizzle schema: schema.financial_interests
 * 
 * This type represents a complete row from the financial_interests table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type FinancialInterestsTable = typeof schema.financial_interests.$inferSelect;

/**
 * financial_interests insert type (for creating new records)
 * Inferred from Drizzle schema: schema.financial_interests
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type FinancialInterestsTableInsert = typeof schema.financial_interests.$inferInsert;

/**
 * lobbying_activities table type (database representation)
 * Inferred from Drizzle schema: schema.lobbying_activities
 * 
 * This type represents a complete row from the lobbying_activities table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LobbyingActivitiesTable = typeof schema.lobbying_activities.$inferSelect;

/**
 * lobbying_activities insert type (for creating new records)
 * Inferred from Drizzle schema: schema.lobbying_activities
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LobbyingActivitiesTableInsert = typeof schema.lobbying_activities.$inferInsert;

/**
 * bill_financial_conflicts table type (database representation)
 * Inferred from Drizzle schema: schema.bill_financial_conflicts
 * 
 * This type represents a complete row from the bill_financial_conflicts table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type BillFinancialConflictsTable = typeof schema.bill_financial_conflicts.$inferSelect;

/**
 * bill_financial_conflicts insert type (for creating new records)
 * Inferred from Drizzle schema: schema.bill_financial_conflicts
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type BillFinancialConflictsTableInsert = typeof schema.bill_financial_conflicts.$inferInsert;

/**
 * cross_sector_ownership table type (database representation)
 * Inferred from Drizzle schema: schema.cross_sector_ownership
 * 
 * This type represents a complete row from the cross_sector_ownership table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CrossSectorOwnershipTable = typeof schema.cross_sector_ownership.$inferSelect;

/**
 * cross_sector_ownership insert type (for creating new records)
 * Inferred from Drizzle schema: schema.cross_sector_ownership
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CrossSectorOwnershipTableInsert = typeof schema.cross_sector_ownership.$inferInsert;

/**
 * regulatory_capture_indicators table type (database representation)
 * Inferred from Drizzle schema: schema.regulatory_capture_indicators
 * 
 * This type represents a complete row from the regulatory_capture_indicators table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type RegulatoryCaptureIndicatorsTable = typeof schema.regulatory_capture_indicators.$inferSelect;

/**
 * regulatory_capture_indicators insert type (for creating new records)
 * Inferred from Drizzle schema: schema.regulatory_capture_indicators
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type RegulatoryCaptureIndicatorsTableInsert = typeof schema.regulatory_capture_indicators.$inferInsert;

/**
 * financialDisclosures table type (database representation)
 * Inferred from Drizzle schema: schema.financialDisclosures
 * 
 * This type represents a complete row from the financialDisclosures table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type FinancialDisclosuresTable = typeof schema.financialDisclosures.$inferSelect;

/**
 * financialDisclosures insert type (for creating new records)
 * Inferred from Drizzle schema: schema.financialDisclosures
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type FinancialDisclosuresTableInsert = typeof schema.financialDisclosures.$inferInsert;

/**
 * financialInterests table type (database representation)
 * Inferred from Drizzle schema: schema.financialInterests
 * 
 * This type represents a complete row from the financialInterests table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type FinancialInterestsTable = typeof schema.financialInterests.$inferSelect;

/**
 * financialInterests insert type (for creating new records)
 * Inferred from Drizzle schema: schema.financialInterests
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type FinancialInterestsTableInsert = typeof schema.financialInterests.$inferInsert;

/**
 * conflictDetections table type (database representation)
 * Inferred from Drizzle schema: schema.conflictDetections
 * 
 * This type represents a complete row from the conflictDetections table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ConflictDetectionsTable = typeof schema.conflictDetections.$inferSelect;

/**
 * conflictDetections insert type (for creating new records)
 * Inferred from Drizzle schema: schema.conflictDetections
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ConflictDetectionsTableInsert = typeof schema.conflictDetections.$inferInsert;

/**
 * influenceNetworks table type (database representation)
 * Inferred from Drizzle schema: schema.influenceNetworks
 * 
 * This type represents a complete row from the influenceNetworks table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type InfluenceNetworksTable = typeof schema.influenceNetworks.$inferSelect;

/**
 * influenceNetworks insert type (for creating new records)
 * Inferred from Drizzle schema: schema.influenceNetworks
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type InfluenceNetworksTableInsert = typeof schema.influenceNetworks.$inferInsert;

/**
 * implementationWorkarounds table type (database representation)
 * Inferred from Drizzle schema: schema.implementationWorkarounds
 * 
 * This type represents a complete row from the implementationWorkarounds table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ImplementationWorkaroundsTable = typeof schema.implementationWorkarounds.$inferSelect;

/**
 * implementationWorkarounds insert type (for creating new records)
 * Inferred from Drizzle schema: schema.implementationWorkarounds
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ImplementationWorkaroundsTableInsert = typeof schema.implementationWorkarounds.$inferInsert;

/**
 * trojan_bill_analysis table type (database representation)
 * Inferred from Drizzle schema: schema.trojan_bill_analysis
 * 
 * This type represents a complete row from the trojan_bill_analysis table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type TrojanBillAnalysisTable = typeof schema.trojan_bill_analysis.$inferSelect;

/**
 * trojan_bill_analysis insert type (for creating new records)
 * Inferred from Drizzle schema: schema.trojan_bill_analysis
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type TrojanBillAnalysisTableInsert = typeof schema.trojan_bill_analysis.$inferInsert;

/**
 * hidden_provisions table type (database representation)
 * Inferred from Drizzle schema: schema.hidden_provisions
 * 
 * This type represents a complete row from the hidden_provisions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type HiddenProvisionsTable = typeof schema.hidden_provisions.$inferSelect;

/**
 * hidden_provisions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.hidden_provisions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type HiddenProvisionsTableInsert = typeof schema.hidden_provisions.$inferInsert;

/**
 * trojan_techniques table type (database representation)
 * Inferred from Drizzle schema: schema.trojan_techniques
 * 
 * This type represents a complete row from the trojan_techniques table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type TrojanTechniquesTable = typeof schema.trojan_techniques.$inferSelect;

/**
 * trojan_techniques insert type (for creating new records)
 * Inferred from Drizzle schema: schema.trojan_techniques
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type TrojanTechniquesTableInsert = typeof schema.trojan_techniques.$inferInsert;

/**
 * detection_signals table type (database representation)
 * Inferred from Drizzle schema: schema.detection_signals
 * 
 * This type represents a complete row from the detection_signals table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type DetectionSignalsTable = typeof schema.detection_signals.$inferSelect;

/**
 * detection_signals insert type (for creating new records)
 * Inferred from Drizzle schema: schema.detection_signals
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type DetectionSignalsTableInsert = typeof schema.detection_signals.$inferInsert;

/**
 * ambassadors table type (database representation)
 * Inferred from Drizzle schema: schema.ambassadors
 * 
 * This type represents a complete row from the ambassadors table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AmbassadorsTable = typeof schema.ambassadors.$inferSelect;

/**
 * ambassadors insert type (for creating new records)
 * Inferred from Drizzle schema: schema.ambassadors
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AmbassadorsTableInsert = typeof schema.ambassadors.$inferInsert;

/**
 * communities table type (database representation)
 * Inferred from Drizzle schema: schema.communities
 * 
 * This type represents a complete row from the communities table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type CommunitiesTable = typeof schema.communities.$inferSelect;

/**
 * communities insert type (for creating new records)
 * Inferred from Drizzle schema: schema.communities
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type CommunitiesTableInsert = typeof schema.communities.$inferInsert;

/**
 * facilitation_sessions table type (database representation)
 * Inferred from Drizzle schema: schema.facilitation_sessions
 * 
 * This type represents a complete row from the facilitation_sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type FacilitationSessionsTable = typeof schema.facilitation_sessions.$inferSelect;

/**
 * facilitation_sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.facilitation_sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type FacilitationSessionsTableInsert = typeof schema.facilitation_sessions.$inferInsert;

/**
 * offline_submissions table type (database representation)
 * Inferred from Drizzle schema: schema.offline_submissions
 * 
 * This type represents a complete row from the offline_submissions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type OfflineSubmissionsTable = typeof schema.offline_submissions.$inferSelect;

/**
 * offline_submissions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.offline_submissions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type OfflineSubmissionsTableInsert = typeof schema.offline_submissions.$inferInsert;

/**
 * ussd_sessions table type (database representation)
 * Inferred from Drizzle schema: schema.ussd_sessions
 * 
 * This type represents a complete row from the ussd_sessions table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UssdSessionsTable = typeof schema.ussd_sessions.$inferSelect;

/**
 * ussd_sessions insert type (for creating new records)
 * Inferred from Drizzle schema: schema.ussd_sessions
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UssdSessionsTableInsert = typeof schema.ussd_sessions.$inferInsert;

/**
 * localized_content table type (database representation)
 * Inferred from Drizzle schema: schema.localized_content
 * 
 * This type represents a complete row from the localized_content table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type LocalizedContentTable = typeof schema.localized_content.$inferSelect;

/**
 * localized_content insert type (for creating new records)
 * Inferred from Drizzle schema: schema.localized_content
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type LocalizedContentTableInsert = typeof schema.localized_content.$inferInsert;

/**
 * assistive_technology_compatibility table type (database representation)
 * Inferred from Drizzle schema: schema.assistive_technology_compatibility
 * 
 * This type represents a complete row from the assistive_technology_compatibility table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AssistiveTechnologyCompatibilityTable = typeof schema.assistive_technology_compatibility.$inferSelect;

/**
 * assistive_technology_compatibility insert type (for creating new records)
 * Inferred from Drizzle schema: schema.assistive_technology_compatibility
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AssistiveTechnologyCompatibilityTableInsert = typeof schema.assistive_technology_compatibility.$inferInsert;

/**
 * accessibility_features table type (database representation)
 * Inferred from Drizzle schema: schema.accessibility_features
 * 
 * This type represents a complete row from the accessibility_features table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AccessibilityFeaturesTable = typeof schema.accessibility_features.$inferSelect;

/**
 * accessibility_features insert type (for creating new records)
 * Inferred from Drizzle schema: schema.accessibility_features
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AccessibilityFeaturesTableInsert = typeof schema.accessibility_features.$inferInsert;

/**
 * accessibility_audits table type (database representation)
 * Inferred from Drizzle schema: schema.accessibility_audits
 * 
 * This type represents a complete row from the accessibility_audits table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AccessibilityAuditsTable = typeof schema.accessibility_audits.$inferSelect;

/**
 * accessibility_audits insert type (for creating new records)
 * Inferred from Drizzle schema: schema.accessibility_audits
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AccessibilityAuditsTableInsert = typeof schema.accessibility_audits.$inferInsert;

/**
 * accessibility_feedback table type (database representation)
 * Inferred from Drizzle schema: schema.accessibility_feedback
 * 
 * This type represents a complete row from the accessibility_feedback table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AccessibilityFeedbackTable = typeof schema.accessibility_feedback.$inferSelect;

/**
 * accessibility_feedback insert type (for creating new records)
 * Inferred from Drizzle schema: schema.accessibility_feedback
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AccessibilityFeedbackTableInsert = typeof schema.accessibility_feedback.$inferInsert;

/**
 * inclusive_design_metrics table type (database representation)
 * Inferred from Drizzle schema: schema.inclusive_design_metrics
 * 
 * This type represents a complete row from the inclusive_design_metrics table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type InclusiveDesignMetricsTable = typeof schema.inclusive_design_metrics.$inferSelect;

/**
 * inclusive_design_metrics insert type (for creating new records)
 * Inferred from Drizzle schema: schema.inclusive_design_metrics
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type InclusiveDesignMetricsTableInsert = typeof schema.inclusive_design_metrics.$inferInsert;

/**
 * user_accessibility_preferences table type (database representation)
 * Inferred from Drizzle schema: schema.user_accessibility_preferences
 * 
 * This type represents a complete row from the user_accessibility_preferences table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type UserAccessibilityPreferencesTable = typeof schema.user_accessibility_preferences.$inferSelect;

/**
 * user_accessibility_preferences insert type (for creating new records)
 * Inferred from Drizzle schema: schema.user_accessibility_preferences
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type UserAccessibilityPreferencesTableInsert = typeof schema.user_accessibility_preferences.$inferInsert;

/**
 * alternative_formats table type (database representation)
 * Inferred from Drizzle schema: schema.alternative_formats
 * 
 * This type represents a complete row from the alternative_formats table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type AlternativeFormatsTable = typeof schema.alternative_formats.$inferSelect;

/**
 * alternative_formats insert type (for creating new records)
 * Inferred from Drizzle schema: schema.alternative_formats
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type AlternativeFormatsTableInsert = typeof schema.alternative_formats.$inferInsert;

/**
 * offline_content_cache table type (database representation)
 * Inferred from Drizzle schema: schema.offline_content_cache
 * 
 * This type represents a complete row from the offline_content_cache table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type OfflineContentCacheTable = typeof schema.offline_content_cache.$inferSelect;

/**
 * offline_content_cache insert type (for creating new records)
 * Inferred from Drizzle schema: schema.offline_content_cache
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type OfflineContentCacheTableInsert = typeof schema.offline_content_cache.$inferInsert;

/**
 * offline_sync_queue table type (database representation)
 * Inferred from Drizzle schema: schema.offline_sync_queue
 * 
 * This type represents a complete row from the offline_sync_queue table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type OfflineSyncQueueTable = typeof schema.offline_sync_queue.$inferSelect;

/**
 * offline_sync_queue insert type (for creating new records)
 * Inferred from Drizzle schema: schema.offline_sync_queue
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type OfflineSyncQueueTableInsert = typeof schema.offline_sync_queue.$inferInsert;

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract update type (all fields optional except id)
 * Use this for partial updates to existing records.
 */
export type UpdateType<T> = Partial<Omit<T, 'id' | 'created_at'>> & Pick<T, 'id'>;

/**
 * Extract the type of a single column from a table type
 */
export type ColumnType<T, K extends keyof T> = T[K];

/**
 * Make specific fields required in a type
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific fields optional in a type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
