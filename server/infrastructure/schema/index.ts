// ============================================================================
// MAIN SCHEMA INDEX - Enhanced Multi-Database Architecture
// ============================================================================
// Exports all schemas organized by domain with multi-database support
//
// PERFORMANCE OPTIMIZATION:
// - Use granular domain imports for faster builds:
// - Use this main index for full schema access (slower):
//
// See /domains/ folder for domain-specific exports

// ============================================================================
// CORE INFRASTRUCTURE - Database connections and utilities
// ============================================================================
// NOTE: Database module should be imported directly to avoid circular dependencies
// import { db, pool, getDatabase } from '@server/infrastructure/database';
//
// This re-export has been removed to prevent circular dependency issues
// between schema and database modules.

// ============================================================================
// BASE TYPES - Centralized shared type patterns
// ============================================================================
export {
  // Helpers
  auditFields,
  softDeleteField,
  fullAuditFields,
  primaryKeyUuid,
  foreignKeyUuid,
  metadataField,
  descriptionField,
  statusField,
  auditedFlagField,
  emailField,
  nameField,
  displayNameField,
  codeField,
  BaseTypeHelpers,
  // Interfaces
  type BaseEntity,
  type SoftDeletable,
  type FullAuditEntity,
  type VersionedEntity,
  type UserTrackableEntity,
  type MetadataEntity,
  type SearchableEntity,
  // Patterns & constants
  EMAIL_PATTERN,
  PHONE_PATTERN,
  SLUG_PATTERN,
  UUID_PATTERN,
  BASE_TYPES_VERSION,
  BASE_TYPES_CHANGELOG,
} from "./base-types";

// ============================================================================
// SCHEMA INTEGRATION - Unified Type System with Standardized Patterns
// ============================================================================
export {
  // Core integration types
  users,
  userRelations,

  // Branded types for type safety
  type UserId,
  type BillId,
  type SessionId,
  type ModerationId,
  type LegislatorId,
  type CommitteeId,
  type SponsorId,
  type AmendmentId,
  type ConferenceId,

  // Validation types
  type ValidatedUser,
  ValidatedUserType,
  UserSchema,

  // Type guards
  isUser,
  isUserId,

  // Utility functions
  createUserId,
  createBillId,
  createSessionId,

  // Version information
  SCHEMA_INTEGRATION_VERSION,
  SCHEMA_INTEGRATION_CHANGELOG,
} from "./integration";

// ============================================================================
// SCHEMA INTEGRATION EXTENDED - Comprehensive Relationship Migration
// ============================================================================
export {
  // Extended entity tables with comprehensive relationships
  bills,
  sponsors,
  governors,
  committees,

  // Type-safe relationships using branded types
  sponsorRelations,
  governorRelations,
  committeeRelations,
  billRelations,

  // Extended validation types
  type ValidatedBill,
  type ValidatedSponsor,
  ValidatedBillType,
  ValidatedSponsorType,
  BillSchema,
  SponsorSchema,

  // Extended type guards
  isBill,
  isSponsor,
  isGovernor,
  isCommittee,

  // Extended database types
  type Bill,
  type NewBill,
  type Sponsor,
  type NewSponsor,
  type Governor,
  type NewGovernor,
  type Committee,
  type NewCommittee,

  // Version information
  SCHEMA_INTEGRATION_EXTENDED_VERSION,
  SCHEMA_INTEGRATION_EXTENDED_CHANGELOG,
} from "./integration-extended";

// ============================================================================
// VALIDATION INTEGRATION - Comprehensive Database Validation Layer
// ============================================================================
export {
  // Database validation registry
  DatabaseValidationRegistry,

  // Validation utilities
  validateDatabaseEntity,
  validateDatabaseEntityAsync,
  validateDatabaseBatch,
  validateBrandedId,
  validateBrandedIds,
  validateDatabaseConstraints,
  validateDatabaseTransaction,

  // Constraint schemas
  DatabaseConstraintSchemas,

  // Types
  type TransactionValidationResult,

  // Version information
  VALIDATION_INTEGRATION_VERSION,
  VALIDATION_INTEGRATION_CHANGELOG,
} from "./validation-integration";

// ============================================================================
// SCHEMA GENERATORS - Type generation and utilities
// ============================================================================
export {
  // Branded ID generators
  BrandedIdGenerator,

  // Schema transformation utilities
  transformData,
  type SchemaTransformConfig,

  // Type-to-schema registry
  TypeSchemaRegistry,

  // Enhanced validation utilities
  validateWithContext,
  type ValidationContext,

  // Schema introspection
  introspectSchema,
  type SchemaIntrospectionResult,

  // Schema composition utilities
  composeSchemas,
  extendSchema,

  // Version information
  SCHEMA_GENERATORS_VERSION,
  SCHEMA_GENERATORS_CHANGELOG,
} from "./schema-generators";

// ============================================================================
// ENUMS - Shared across all domains
// ============================================================================
export * from "./enum";

// ============================================================================
// ENUM VALIDATION - Runtime type-safe validation layer
// ============================================================================
export {
  ENUM_REGISTRY,
  ENUM_SCHEMA_VERSION,
  ENUM_CHANGELOG,
  isValidEnum,
  assertEnum,
  getEnumValues,
  validateEnums,
  generateEnumReport,
  VALID_PARTIES,
  VALID_ROLES,
  VALID_BILL_STATUSES,
} from "./enum-validator";

// ============================================================================
// RUNTIME SCHEMA VALIDATION - Zod-based payload validation (consolidated)
// ============================================================================
// Validators have been consolidated into shared/core/validation/schemas/
// to centralize all validation logic and avoid duplication

export {
  SCHEMA_VERSION,
  SCHEMA_CHANGELOG,
  SchemaMigrations,
  applyMigration,
  getLatestVersion,
  isVersionSupported,
  // Entity validators
  UserCreateSchema,
  UserUpdateSchema,
  UserProfileCreateSchema,
  UserProfileUpdateSchema,
  CommentCreateSchema,
  CommentUpdateSchema,
  BillVoteCreateSchema,
  BillVoteUpdateSchema,
  BillEngagementCreateSchema,
  BillEngagementUpdateSchema,
  // Validation functions
  validateUserCreate,
  validateUserCreateSafe,
  validateUserProfileCreate,
  validateCommentCreate,
  validateBillVoteCreate,
  validateBillEngagementCreate,
  validateBatch,
  getEntitySchema,
  validateByEntitySchema,
  entitySchemas,
  // Types
  type UserCreate,
  type UserUpdate,
  type UserProfileCreate,
  type UserProfileUpdate,
  type CommentCreate,
  type CommentUpdate,
  type BillVoteCreate,
  type BillVoteUpdate,
  type BillEngagementCreate,
  type BillEngagementUpdate,
} from '@server/infrastructure/core/validation/schemas';

// ============================================================================
// WEBSOCKET TYPES - Unified WebSocket type system
// ============================================================================

// Enums
export {
  ConnectionState,
  WebSocketErrorCode,
  SubscriptionPriority,
  NotificationPriority
} from "./websocket";

// Core Interfaces
export type {
  WebSocketMessage,
  ConnectionQuality,
  ConnectionMetrics,
  WebSocketError
} from "./websocket";

// Configuration
export type {
  ReconnectConfig,
  HeartbeatConfig,
  MessageConfig,
  WebSocketAuthConfig,
  WebSocketConfig,
  WebSocketServerConfig
} from "./websocket";

// Domain Data Types
export type {
  BillUpdate,
  NotificationData,
  CommunityUpdate
} from "./websocket";

// Message Types
export type {
  AuthMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  HeartbeatMessage,
  BillUpdateMessage,
  CommunityUpdateMessage,
  NotificationMessage,
  ErrorMessage,
  ConnectionMessage,
  SystemMessage
} from "./websocket";

// Union Types
export type {
  ClientToServerMessage,
  ServerToClientMessage,
  AnyWebSocketMessage
} from "./websocket";

// State & Tracking
export type {
  ClientInfo,
  WebSocketStats,
  Subscription,
  WebSocketSubscription,
  WebSocketNotification
} from "./websocket";

// Handlers
export type {
  MessageHandler,
  ConnectionHandler,
  ErrorHandler,
  FilterFunction,
  RealTimeHandlers,
  WebSocketEvents
} from "./websocket";

// Type Guards
export {
  isClientToServerMessage,
  isServerToClientMessage,
  isHeartbeatMessage,
  isValidWebSocketMessage
} from "./websocket";

// ============================================================================
// FOUNDATION SCHEMA - Core Legislative Entities
// ============================================================================
export {
  users,
  user_profiles,
  sponsors,
  governors,
  committees,
  committee_members,
  parliamentary_sessions,
  parliamentary_sittings,
  bills,
  county_bill_assents,
  oauth_providers,
  oauth_tokens,
  user_sessions,
  usersRelations,
  userProfilesRelations,
  sponsorsRelations,
  governorsRelations,
  committeesRelations,
  committeeMembersRelations,
  parliamentarySessionsRelations,
  parliamentarySittingsRelations,
  billsRelations,
  countyBillAssentsRelations,
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
import { public_promises as publicPromisesTable, shadow_ledger_entries as shadowLedgerEntriesTable, promise_accountability_tracking as promiseAccountabilityTrackingTable } from "./accountability_ledger";
import { analysis as analysisTable } from "./analysis";
import { user_interests as userInterestsTable, bill_engagement as billEngagementTable, comments as commentsTable } from "./citizen_participation";
import { users as usersTable, user_profiles as userProfilesTable, sponsors as sponsorsTable, committees as committeesTable, committee_members as committeeMembersTable, parliamentary_sessions as parliamentarySessionsTable, parliamentary_sittings as parliamentarySittingsTable, bills as billsTable, oauth_providers as oauthProvidersTable, oauth_tokens as oauthTokensTable, user_sessions as userSessionsTable } from "./foundation";
import { market_sectors as marketSectorsTable, economic_impact_assessments as economicImpactAssessmentsTable, market_stakeholders as marketStakeholdersTable, stakeholder_positions as stakeholderPositionsTable, market_trends as marketTrendsTable } from "./market_intelligence";
import { participation_quality_audits as participationQualityAuditsTable } from "./participation_oversight";
import { political_appointments as politicalAppointmentsTable, infrastructure_tenders as infrastructureTendersTable, ethnic_advantage_scores as ethnicAdvantageScoresTable, strategic_infrastructure_projects as strategicInfrastructureProjectsTable } from "./political_economy";
import { trojan_bill_analysis as trojanBillAnalysisTable, hidden_provisions as hiddenProvisionsTable, trojan_techniques as trojanTechniquesTable, detection_signals as detectionSignalsTable } from "./trojan_bill_detection";

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
// SAFEGUARDS SCHEMA - Platform Protection & Integrity
// ============================================================================
export {
  // Rate limiting
  rateLimits,
  rateLimitConfig,
  rateLimitsRelations,

  // Content moderation
  contentFlags,
  contentFlagsRelations,

  // Moderation queue & decisions
  moderationQueue,
  moderationDecisions,
  moderationAppeals,
  moderationQueueRelations,
  moderationDecisionsRelations,
  moderationAppealsRelations,

  // Expert moderator tracking
  expertModeratorEligibility,
  expertModeratorEligibilityRelations,

  // CIB detection
  cibDetections,
  cibDetectionsRelations,

  // Behavioral anomalies
  behavioralAnomalies,
  behavioralAnomaliesRelations,

  // Activity logging
  suspiciousActivityLogs,
  suspiciousActivityLogsRelations,

  // Reputation system
  reputationScores,
  reputationHistory,
  reputationScoresRelations,
  reputationHistoryRelations,

  // Identity verification
  identityVerification,
  deviceFingerprints,
  identityVerificationRelations,
  deviceFingerprintsRelations,

  // Enums
  rateLimitActionEnum,
  moderationActionEnum,
  flagReasonEnum,
  cibPatternEnum,
  reputationSourceEnum,
  verificationMethodEnum,
  iprsVerificationStatusEnum
} from "./safeguards";

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

// Safeguards types
export type {
  RateLimit,
  NewRateLimit,
  RateLimitConfig,
  NewRateLimitConfig,
  ContentFlag,
  NewContentFlag,
  ModerationQueueItem,
  NewModerationQueueItem,
  ModerationDecision,
  NewModerationDecision,
  ModerationAppeal,
  NewModerationAppeal,
  ExpertModeratorEligibility,
  NewExpertModeratorEligibility,
  CIBDetection,
  NewCIBDetection,
  BehavioralAnomaly,
  NewBehavioralAnomaly,
  SuspiciousActivityLog,
  NewSuspiciousActivityLog,
  ReputationScore,
  NewReputationScore,
  ReputationHistoryEntry,
  NewReputationHistoryEntry,
  IdentityVerification,
  NewIdentityVerification,
  DeviceFingerprint,
  NewDeviceFingerprint
} from "./safeguards";

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


