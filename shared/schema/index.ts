// ============================================================================
// MAIN SCHEMA INDEX - Enhanced Multi-Database Architecture
// ============================================================================
// Exports all schemas organized by domain with multi-database support

// ============================================================================
// CORE INFRASTRUCTURE - Database connections and utilities
// ============================================================================
export {
  operationalDb,
  analyticsDb, 
  securityDb,
  database as db, // Default export (operational)
  checkDatabaseHealth,
  closeDatabaseConnections
} from "../database";

// Base types are now defined inline in each schema file

// ============================================================================
// ENUMS - Shared across all domains
// ============================================================================
export * from "./enum";

// ============================================================================
// FOUNDATION SCHEMA - Core Legislative Entities
// ============================================================================
export {
  users,
  user_profiles,
  sponsors,
  committees,
  committee_members,
  parliamentary_sessions,
  parliamentary_sittings,
  bills,
  usersRelations,
  userProfilesRelations,
  sponsorsRelations,
  committeesRelations,
  committeeMembersRelations,
  parliamentarySessionsRelations,
  parliamentarySittingsRelations,
  billsRelations
} from "./foundation";

// ============================================================================
// CITIZEN PARTICIPATION SCHEMA
// ============================================================================
export {
  sessions,
  comments,
  comment_votes,
  bill_votes,
  bill_engagement,
  bill_tracking_preferences,
  notifications,
  alert_preferences,
  user_contact_methods,
  sessionsRelations,
  commentsRelations,
  commentVotesRelations,
  billVotesRelations,
  billEngagementRelations,
  billTrackingPreferencesRelations,
  notificationsRelations,
  alertPreferencesRelations,
  userContactMethodsRelations
} from "./citizen_participation";

// ============================================================================
// SCHEMA OBJECT - For backward compatibility
// ============================================================================
import { users as usersTable, user_profiles as userProfilesTable, sponsors as sponsorsTable, committees as committeesTable, committee_members as committeeMembersTable, parliamentary_sessions as parliamentarySessionsTable, parliamentary_sittings as parliamentarySittingsTable, bills as billsTable } from "./foundation";
import { bill_engagement as billEngagementTable, comments as commentsTable } from "./citizen_participation";

export const schema = {
  users: usersTable,
  user_profiles: userProfilesTable,
  sponsors: sponsorsTable,
  committees: committeesTable,
  committee_members: committeeMembersTable,
  parliamentary_sessions: parliamentarySessionsTable,
  parliamentary_sittings: parliamentarySittingsTable,
  bills: billsTable,
  bill_engagement: billEngagementTable,
  comments: commentsTable
};

// ============================================================================
// CITIZEN PARTICIPATION SCHEMA (Table Aliases)
// ============================================================================
export {
  sessions as sessionsTable,
  comments as commentsTable,
  comment_votes as commentVotesTable,
  bill_votes as billVotesTable,
  bill_engagement as billEngagementTable,
  bill_tracking_preferences as billTrackingPreferencesTable,
  notifications as notificationsTable,
  alert_preferences as alertPreferencesTable,
  user_contact_methods as userContactMethodsTable
} from "./citizen_participation";

// ============================================================================
// PARLIAMENTARY PROCESS SCHEMA
// ============================================================================
export {
  bill_committee_assignments,
  bill_amendments,
  bill_versions,
  bill_readings,
  parliamentary_votes,
  bill_cosponsors,
  public_participation_events,
  public_submissions,
  public_hearings,
  billCommitteeAssignmentsRelations,
  billAmendmentsRelations,
  billVersionsRelations,
  billReadingsRelations,
  parliamentaryVotesRelations,
  billCosponsorsRelations,
  publicParticipationEventsRelations,
  publicSubmissionsRelations,
  publicHearingsRelations
} from "./parliamentary_process";

// ============================================================================
// CONSTITUTIONAL INTELLIGENCE SCHEMA
// ============================================================================
export {
  constitutional_provisions,
  constitutional_analyses,
  legal_precedents,
  expert_review_queue,
  analysis_audit_trail,
  constitutionalProvisionsRelations,
  constitutionalAnalysesRelations,
  legalPrecedentsRelations,
  expertReviewQueueRelations,
  analysisAuditTrailRelations
} from "./constitutional_intelligence";

// ============================================================================
// ARGUMENT INTELLIGENCE SCHEMA
// ============================================================================
export {
  argumentTable as arguments,
  claims,
  evidence,
  argument_relationships,
  legislative_briefs,
  synthesis_jobs,
  argumentsRelations,
  claimsRelations,
  evidenceRelations,
  argumentRelationshipsRelations,
  legislativeBriefsRelations,
  synthesisJobsRelations
} from "./argument_intelligence";

// ============================================================================
// ADVOCACY COORDINATION SCHEMA
// ============================================================================
export {
  campaigns,
  action_items,
  campaign_participants,
  action_completions,
  campaign_impact_metrics,
  coalition_relationships,
  campaignsRelations,
  actionItemsRelations,
  campaignParticipantsRelations,
  actionCompletionsRelations,
  campaignImpactMetricsRelations,
  coalitionRelationshipsRelations
} from "./advocacy_coordination";

// ============================================================================
// UNIVERSAL ACCESS SCHEMA
// ============================================================================
export {
  ambassadors,
  communities,
  facilitation_sessions,
  offline_submissions,
  ussd_sessions,
  localized_content,
  ambassadorsRelations,
  communitiesRelations,
  facilitationSessionsRelations,
  offlineSubmissionsRelations,
  ussdSessionsRelations,
  localizedContentRelations
} from "./universal_access";

// ============================================================================
// TRANSPARENCY ANALYSIS SCHEMA
// ============================================================================
export {
  corporate_entities,
  financial_interests,
  lobbying_activities,
  bill_financial_conflicts,
  cross_sector_ownership,
  regulatory_capture_indicators,
  corporateEntitiesRelations,
  financialInterestsRelations,
  lobbyingActivitiesRelations,
  billFinancialConflictsRelations,
  crossSectorOwnershipRelations,
  regulatoryCaptureIndicatorsRelations
} from "./transparency_analysis";

// ============================================================================
// IMPACT MEASUREMENT SCHEMA
// ============================================================================
export {
  participation_cohorts,
  legislative_outcomes,
  bill_implementation,
  attribution_assessments,
  success_stories,
  geographic_equity_metrics,
  demographic_equity_metrics,
  digital_inclusion_metrics,
  platform_performance_indicators,
  legislative_impact_indicators,
  civic_engagement_indicators,
  financial_sustainability_indicators,
  participationCohortsRelations,
  legislativeOutcomesRelations,
  billImplementationRelations,
  attributionAssessmentsRelations,
  successStoriesRelations
} from "./impact_measurement";

// ============================================================================
// INTEGRITY OPERATIONS SCHEMA
// ============================================================================
export {
  content_reports,
  moderation_queue,
  expert_profiles,
  user_verification,
  user_activity_log,
  system_audit_log,
  security_events,
  contentReportsRelations,
  moderationQueueRelations,
  expertProfilesRelations,
  userVerificationRelations,
  userActivityLogRelations,
  systemAuditLogRelations,
  securityEventsRelations
} from "./integrity_operations";

// ============================================================================
// PLATFORM OPERATIONS SCHEMA
// ============================================================================
export {
  data_sources,
  sync_jobs,
  external_bill_references,
  analytics_events,
  bill_impact_metrics,
  county_engagement_stats,
  trending_analysis,
  user_engagement_summary,
  platform_health_metrics,
  content_performance,
  dataSourcesRelations,
  syncJobsRelations,
  externalBillReferencesRelations,
  analyticsEventsRelations,
  billImpactMetricsRelations,
  countyEngagementStatsRelations,
  userEngagementSummaryRelations,
  contentPerformanceRelations
} from "./platform_operations";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Foundation types
export type {
  User,
  NewUser,
  UserProfile,
  NewUserProfile,
  Sponsor,
  NewSponsor,
  Committee,
  NewCommittee,
  CommitteeMember,
  NewCommitteeMember,
  ParliamentarySession,
  NewParliamentarySession,
  ParliamentarySitting,
  NewParliamentarySitting,
  Bill,
  NewBill
} from "./foundation";

// Impact measurement types
export type {
  ParticipationCohort,
  NewParticipationCohort,
  LegislativeOutcome,
  NewLegislativeOutcome,
  BillImplementation,
  NewBillImplementation,
  AttributionAssessment,
  NewAttributionAssessment,
  SuccessStory,
  NewSuccessStory,
  GeographicEquityMetric,
  NewGeographicEquityMetric,
  DemographicEquityMetric,
  NewDemographicEquityMetric,
  DigitalInclusionMetric,
  NewDigitalInclusionMetric,
  PlatformPerformanceIndicator,
  NewPlatformPerformanceIndicator,
  LegislativeImpactIndicator,
  NewLegislativeImpactIndicator,
  CivicEngagementIndicator,
  NewCivicEngagementIndicator,
  FinancialSustainabilityIndicator,
  NewFinancialSustainabilityIndicator
} from "./impact_measurement";

// Platform operations types
export type {
  DataSource,
  NewDataSource,
  SyncJob,
  NewSyncJob,
  ExternalBillReference,
  NewExternalBillReference,
  AnalyticsEvent,
  NewAnalyticsEvent,
  BillImpactMetric,
  NewBillImpactMetric,
  CountyEngagementStats,
  NewCountyEngagementStats,
  TrendingAnalysis,
  NewTrendingAnalysis,
  UserEngagementSummary,
  NewUserEngagementSummary,
  PlatformHealthMetrics,
  NewPlatformHealthMetrics,
  ContentPerformance,
  NewContentPerformance
} from "./platform_operations";

// Enum types
export type {
  KenyanCounty,
  Chamber,
  Party,
  BillStatus,
  UserRole,
  VerificationStatus,
  ModerationStatus,
  CommentVoteType,
  BillVoteType,
  EngagementType,
  NotificationType,
  Severity,
  CourtLevel,
  CampaignStatus,
  ActionType,
  ActionStatus,
  AmbassadorStatus,
  SessionType,
  ParticipationMethod
} from "./enum";

// ============================================================================
// ARCHITECTURE NOTES
// ============================================================================
/*
CURRENT PHASE: Phase One - Enhanced Single Database
- All domains use the operational database (operationalDb)
- Multi-database connections are available but point to same instance
- Existing domain files and tests remain unchanged
- New core infrastructure supports future multi-database evolution

FUTURE PHASE: Phase Two - True Multi-Database Architecture  
- Analytics tables move to separate analyticsDb instance
- Security tables move to separate securityDb instance
- Data synchronization between databases
- Domain files remain the same, only connection usage changes

DOMAIN ORGANIZATION:
- foundation.ts: Core legislative entities (bills, sponsors, committees)
- citizen_participation.ts: User engagement (comments, votes, tracking)
- parliamentary_process.ts: Legislative procedures (readings, amendments)
- constitutional_intelligence.ts: Constitutional analysis and review
- argument_intelligence.ts: Argument synthesis and evidence tracking
- advocacy_coordination.ts: Campaign coordination and collective action
- universal_access.ts: Offline engagement and community facilitation
- integrity_operations.ts: Content moderation and verification
- platform_operations.ts: Analytics, metrics, and data sources

Each domain has corresponding tests in __tests__/ directory.
*/