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
} from "../database/connection";

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
  oauth_providers,
  oauth_tokens,
  user_sessions,
  usersRelations,
  userProfilesRelations,
  sponsorsRelations,
  committeesRelations,
  committeeMembersRelations,
  parliamentarySessionsRelations,
  parliamentarySittingsRelations,
  billsRelations,
  oauthProvidersRelations,
  oauthTokensRelations,
  userSessionsRelations
} from "./foundation";

// ============================================================================
// CITIZEN PARTICIPATION SCHEMA
// ============================================================================
export {
  user_interests,
  sessions,
  comments,
  comment_votes,
  bill_votes,
  bill_engagement,
  bill_tracking_preferences,
  notifications,
  alert_preferences,
  user_contact_methods,
  userInterestsRelations,
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
// PARTICIPATION OVERSIGHT SCHEMA
// ============================================================================
export {
  participation_quality_audits,
  participationQualityAuditsRelations,
  AUDIT_SCORING_WEIGHTS,
  RED_FLAG_SEVERITY
} from "./participation_oversight";

// ============================================================================
// SCHEMA OBJECT - For backward compatibility
// ============================================================================
import { users as usersTable, user_profiles as userProfilesTable, sponsors as sponsorsTable, committees as committeesTable, committee_members as committeeMembersTable, parliamentary_sessions as parliamentarySessionsTable, parliamentary_sittings as parliamentarySittingsTable, bills as billsTable, oauth_providers as oauthProvidersTable, oauth_tokens as oauthTokensTable, user_sessions as userSessionsTable } from "./foundation";
import { user_interests as userInterestsTable, bill_engagement as billEngagementTable, comments as commentsTable } from "./citizen_participation";
import { participation_quality_audits as participationQualityAuditsTable } from "./participation_oversight";
import { analysis as analysisTable } from "./analysis";
import { trojan_bill_analysis as trojanBillAnalysisTable, hidden_provisions as hiddenProvisionsTable, trojan_techniques as trojanTechniquesTable, detection_signals as detectionSignalsTable } from "./trojan_bill_detection";
import { political_appointments as politicalAppointmentsTable, infrastructure_tenders as infrastructureTendersTable, ethnic_advantage_scores as ethnicAdvantageScoresTable, strategic_infrastructure_projects as strategicInfrastructureProjectsTable } from "./political_economy";
import { market_sectors as marketSectorsTable, economic_impact_assessments as economicImpactAssessmentsTable, market_stakeholders as marketStakeholdersTable, stakeholder_positions as stakeholderPositionsTable, market_trends as marketTrendsTable } from "./market_intelligence";
import { public_promises as publicPromisesTable, shadow_ledger_entries as shadowLedgerEntriesTable, promise_accountability_tracking as promiseAccountabilityTrackingTable } from "./accountability_ledger";

export const schema = {
  users: usersTable,
  user_profiles: userProfilesTable,
  sponsors: sponsorsTable,
  committees: committeesTable,
  committee_members: committeeMembersTable,
  parliamentary_sessions: parliamentarySessionsTable,
  parliamentary_sittings: parliamentarySittingsTable,
  bills: billsTable,
  oauth_providers: oauthProvidersTable,
  oauth_tokens: oauthTokensTable,
  user_sessions: userSessionsTable,
  user_interests: userInterestsTable,
  bill_engagement: billEngagementTable,
  comments: commentsTable,
  participation_quality_audits: participationQualityAuditsTable,
  analysis: analysisTable,
  trojan_bill_analysis: trojanBillAnalysisTable,
  hidden_provisions: hiddenProvisionsTable,
  trojan_techniques: trojanTechniquesTable,
  detection_signals: detectionSignalsTable,
  political_appointments: politicalAppointmentsTable,
  infrastructure_tenders: infrastructureTendersTable,
  ethnic_advantage_scores: ethnicAdvantageScoresTable,
  strategic_infrastructure_projects: strategicInfrastructureProjectsTable,
  market_sectors: marketSectorsTable,
  economic_impact_assessments: economicImpactAssessmentsTable,
  market_stakeholders: marketStakeholdersTable,
  stakeholder_positions: stakeholderPositionsTable,
  market_trends: marketTrendsTable,
  public_promises: publicPromisesTable,
  shadow_ledger_entries: shadowLedgerEntriesTable,
  promise_accountability_tracking: promiseAccountabilityTrackingTable
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
  constitutional_vulnerabilities,
  underutilized_provisions,
  elite_literacy_assessment,
  constitutional_loopholes,
  elite_knowledge_scores,
  constitutionalProvisionsRelations,
  constitutionalAnalysesRelations,
  legalPrecedentsRelations,
  expertReviewQueueRelations,
  analysisAuditTrailRelations,
  constitutionalVulnerabilitiesRelations,
  underutilizedProvisionsRelations,
  eliteLiteracyAssessmentRelations,
  constitutionalLoopholesRelations,
  eliteKnowledgeScoresRelations
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
  audit_payloads,
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
// TRANSPARENCY INTELLIGENCE SCHEMA
// ============================================================================
export {
  financialDisclosures,
  financialInterests,
  conflictDetections,
  influenceNetworks,
  implementationWorkarounds,
  transparencyFinancialDisclosuresRelations,
  transparencyFinancialInterestsRelations,
  conflictDetectionsRelations,
  implementationWorkaroundsRelations
} from "./transparency_intelligence";

// ============================================================================
// EXPERT VERIFICATION SCHEMA
// ============================================================================
export {
  expertCredentials,
  expertDomains,
  credibilityScores,
  expertReviews,
  peerValidations,
  expertActivity,
  expertCredentialsRelations,
  expertDomainsRelations,
  credibilityScoresRelations,
  expertReviewsRelations,
  peerValidationsRelations,
  expertActivityRelations
} from "./expert_verification";

// ============================================================================
// ADVANCED DISCOVERY SCHEMA
// ============================================================================
export {
  searchQueries,
  discoveryPatterns,
  billRelationships,
  searchAnalytics,
  trendingTopics,
  userRecommendations,
  searchQueriesRelations,
  billRelationshipsRelations,
  searchAnalyticsRelations,
  userRecommendationsRelations
} from "./advanced_discovery";

// ============================================================================
// REAL-TIME ENGAGEMENT SCHEMA
// ============================================================================
export {
  engagementEvents,
  liveMetricsCache,
  civicAchievements,
  userAchievements,
  civicScores,
  engagementLeaderboards,
  realTimeNotifications,
  engagementAnalytics,
  engagementEventsRelations,
  userAchievementsRelations,
  civicAchievementsRelations,
  civicScoresRelations,
  engagementLeaderboardsRelations,
  realTimeNotificationsRelations,
  engagementAnalyticsRelations
} from "./real_time_engagement";

// ============================================================================
// ANALYSIS SCHEMA
// ============================================================================
export { analysis } from "./analysis";

// ============================================================================
// TROJAN BILL DETECTION SCHEMA
// ============================================================================
export {
  trojan_bill_analysis,
  hidden_provisions,
  trojan_techniques,
  detection_signals,
  trojanBillAnalysisRelations,
  hiddenProvisionsRelations,
  trojanTechniquesRelations,
  detectionSignalsRelations
} from "./trojan_bill_detection";

// ============================================================================
// POLITICAL ECONOMY SCHEMA
// ============================================================================
export {
  political_appointments,
  infrastructure_tenders,
  ethnic_advantage_scores,
  strategic_infrastructure_projects,
  politicalAppointmentsRelations,
  infrastructureTendersRelations,
  ethnicAdvantageScoresRelations,
  strategicInfrastructureProjectsRelations
} from "./political_economy";

// ============================================================================
// MARKET INTELLIGENCE SCHEMA
// ============================================================================
export {
  market_sectors,
  economic_impact_assessments,
  market_stakeholders,
  stakeholder_positions,
  market_trends,
  marketSectorsRelations,
  economicImpactAssessmentsRelations,
  marketStakeholdersRelations,
  stakeholderPositionsRelations,
  marketTrendsRelations
} from "./market_intelligence";

// ============================================================================
// ACCOUNTABILITY LEDGER SCHEMA
// ============================================================================
export {
  public_promises,
  shadow_ledger_entries,
  promise_accountability_tracking,
  publicPromisesRelations,
  shadowLedgerEntriesRelations,
  promiseAccountabilityTrackingRelations
} from "./accountability_ledger";

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
  NewBill,
  OAuthProvider,
  NewOAuthProvider,
  OAuthToken,
  NewOAuthToken,
  UserSession,
  NewUserSession
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

// Analysis types
export type { Analysis, NewAnalysis } from "./analysis";

// Transparency Intelligence types
export type {
  FinancialDisclosure,
  NewFinancialDisclosure,
  FinancialInterest,
  NewFinancialInterest,
  ConflictDetection,
  NewConflictDetection,
  InfluenceNetwork,
  NewInfluenceNetwork,
  ImplementationWorkaround,
  NewImplementationWorkaround
} from "./transparency_intelligence";

// Expert Verification types
export type {
  ExpertCredential,
  NewExpertCredential,
  ExpertDomain,
  NewExpertDomain,
  CredibilityScore,
  NewCredibilityScore,
  ExpertReview,
  NewExpertReview,
  PeerValidation,
  NewPeerValidation,
  ExpertActivity,
  NewExpertActivity
} from "./expert_verification";

// Advanced Discovery types
export type {
  SearchQuery,
  NewSearchQuery,
  DiscoveryPattern,
  NewDiscoveryPattern,
  BillRelationship,
  NewBillRelationship,
  SearchAnalytics,
  NewSearchAnalytics,
  TrendingTopic,
  NewTrendingTopic,
  UserRecommendation,
  NewUserRecommendation
} from "./advanced_discovery";

// Real-Time Engagement types
export type {
  EngagementEvent,
  NewEngagementEvent,
  LiveMetricsCache,
  NewLiveMetricsCache,
  CivicAchievement,
  NewCivicAchievement,
  UserAchievement,
  NewUserAchievement,
  CivicScore,
  NewCivicScore,
  EngagementLeaderboard,
  NewEngagementLeaderboard,
  RealTimeNotification,
  NewRealTimeNotification,
  EngagementAnalytics,
  NewEngagementAnalytics
} from "./real_time_engagement";

// Political Economy types
export type {
  PoliticalAppointment,
  NewPoliticalAppointment,
  InfrastructureTender,
  NewInfrastructureTender,
  EthnicAdvantageScore,
  NewEthnicAdvantageScore,
  StrategicInfrastructureProject,
  NewStrategicInfrastructureProject
} from "./political_economy";

// Market Intelligence types
export type {
  MarketSector,
  NewMarketSector,
  EconomicImpactAssessment,
  NewEconomicImpactAssessment,
  MarketStakeholder,
  NewMarketStakeholder,
  StakeholderPosition,
  NewStakeholderPosition,
  MarketTrend,
  NewMarketTrend
} from "./market_intelligence";

// Accountability Ledger types
export type {
  PublicPromise,
  NewPublicPromise,
  ShadowLedgerEntry,
  NewShadowLedgerEntry,
  PromiseTracking,
  NewPromiseTracking
} from "./accountability_ledger";

// Trojan Bill Detection types
export type {
  TrojanBillAnalysis,
  NewTrojanBillAnalysis,
  HiddenProvision,
  NewHiddenProvision,
  TrojanTechnique,
  NewTrojanTechnique,
  DetectionSignal,
  NewDetectionSignal
} from "./trojan_bill_detection";

// Constitutional Intelligence types
export type {
  ConstitutionalProvision,
  NewConstitutionalProvision,
  ConstitutionalAnalysis,
  NewConstitutionalAnalysis,
  LegalPrecedent,
  NewLegalPrecedent,
  ExpertReviewQueue,
  NewExpertReviewQueue,
  AnalysisAuditTrail,
  NewAnalysisAuditTrail,
  ConstitutionalVulnerability,
  NewConstitutionalVulnerability,
  UnderutilizedProvision,
  NewUnderutilizedProvision,
  EliteLiteracyAssessment,
  NewEliteLiteracyAssessment,
  ConstitutionalLoophole,
  NewConstitutionalLoophole,
  EliteKnowledgeScore,
  NewEliteKnowledgeScore
} from "./constitutional_intelligence";

// Citizen Participation types
export type {
  UserInterest,
  NewUserInterest,
  Session,
  NewSession,
  Comment,
  NewComment,
  CommentVote,
  NewCommentVote,
  BillVote,
  NewBillVote,
  BillEngagement,
  NewBillEngagement,
  BillTrackingPreference,
  NewBillTrackingPreference,
  Notification,
  NewNotification,
  AlertPreference,
  NewAlertPreference,
  UserContactMethod,
  NewUserContactMethod
} from "./citizen_participation";

// Participation Oversight types
export type {
  ParticipationQualityAudit,
  NewParticipationQualityAudit,
  AuditWithRedFlags,
  AuditSummary,
  ComplianceStatus
} from "./participation_oversight";

// Architecture Component type for planning interface
export interface ArchitectureComponent {
  id: number;
  name: string;
  description: string;
  status?: 'stable' | 'active_dev' | 'refactoring' | 'planned';
  type?: 'service' | 'component' | 'hook' | 'utility';
  dependencies?: string[];
  created_at?: Date;
  updated_at?: Date;
}

// Additional types for project management components
export interface Checkpoint {
  id: number;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'failed' | 'planned';
  created_at: string;
  updated_at: string;
  targetDate?: string;
  successRate?: number;
  phase?: string;
  metrics?: {
    features_completed: number;
    features_total: number;
  };
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  expiryDate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnalyticsMetric {
  id: number;
  name: string;
  value: number;
  timestamp: string;
  type: string;
}

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
- market_intelligence.ts: Market dynamics, economic impact, and stakeholder analysis
- accountability_ledger.ts: Promise tracking, violation records, and governance accountability

Each domain has corresponding tests in __tests__/ directory.
*/


