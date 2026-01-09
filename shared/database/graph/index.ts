/**
 * Graph Database Public API
 *
 * Provides a unified interface for all graph database operations,
 * combining driver management, synchronization, and relationships.
 */

export {
  initializeNeo4jDriver,
  getNeo4jDriver,
  closeNeo4jDriver,
  executeReadQuery,
  executeWriteQuery,
  executeTransaction,
  checkNeo4jConnectivity,
  getNeo4jStats,
  type Neo4jConfig,
  type QueryResult,
} from './driver';

export {
  syncEntity,
  syncEntities,
  syncRelationship,
  syncRelationships,
  deleteEntity,
  clearAllData,
  getEntity,
  getEntities,
  countEntities,
  type GraphEntity,
  type GraphRelationship,
  type SyncResult,
} from './sync-service';

export {
  createConstraints,
  createIndexes,
  initializeGraphSchema,
  verifyGraphSchema,
  getDatabaseStats,
} from './core/schema';

export {
  createOrUpdateFinancialInterest,
  createOrUpdateLobbyingRelationship,
  createMediaInfluenceRelationship,
  createCampaignContributionRelationship,
  createOrUpdateVotingCoalition,
  createProfessionalNetworkRelationship,
  createPolicyInfluenceRelationship,
  createMediaCoverageRelationship,
  createExpertOpinionRelationship,
  createSectorInfluenceRelationship,
  createStakeholderInfluenceRelationship,
  createCrossPartyAllianceRelationship,
  type FinancialInterest,
  type LobbyingRelationship,
  type MediaInfluenceRelationship,
  type CampaignContribution,
  type VotingCoalitionRelationship,
} from './advanced-relationships';

export {
  findInfluencePaths,
  detectVotingCoalitions,
  detectPoliticalCommunities,
  findKeyInfluencers,
  analyzeBillInfluenceFlow,
  findFinancialInfluencePatterns,
  type InfluencePath,
  type VotingCoalition,
  type PoliticalCommunity,
} from './pattern-discovery';

export {
  batchSyncAdvancedRelationships,
  syncFinancialInterests,
  syncLobbyingRelationships,
  syncCampaignContributions,
  syncMediaInfluenceRelationships,
  syncVotingCoalitions,
  syncProfessionalNetworks,
  syncPolicyInfluenceRelationships,
  calculateAndSyncVotingCoalitions,
  type ChangeEvent,
} from './advanced-sync';

export * from './query/advanced-queries';

export {
  syncPersonToGraph,
  syncOrganizationToGraph,
  syncBillToGraph,
  syncCommitteeToGraph,
  syncTopicToGraph,
  syncArgumentToGraph,
  createSponsorshipRelationship,
  createCommitteeMembershipRelationship,
  createBillAssignmentRelationship,
  createTopicMentionRelationship,
  createArgumentRelationship,
  createFinancialInterestRelationship,
  createVotingRelationship,
  createVotingCoalitionRelationship,
  createAffiliationRelationship,
  createDocumentReferenceRelationship,
  type PersonNode,
  type OrganizationNode,
  type BillNode,
  type CommitteeNode,
  type TopicNode,
  type ArgumentNode,
} from './relationships';

// ============================================================================
// Network Implementation (15 Relationship Types)
// ============================================================================

// Parliamentary Networks (6 types)
export {
  ParliamentaryNetworks,
  createAmendmentNetwork,
  linkAmendmentConflicts,
  createCommitteeReviewJourney,
  linkCommitteeRoutes,
  createSessionParticipation,
  createBillVersionChain,
  linkVersionEvolution,
  createSponsorshipNetwork,
  linkCoSponsorshipAlliances,
  createBillDependencyNetwork,
  type Amendment,
  type AmendmentConflict,
  type CommitteeReview,
  type CommitteeRoute,
  type SessionParticipation,
  type BillVersion,
  type VersionEvolution,
  type Sponsorship,
  type CoSponsorshipAlliance,
  type BillDependency,
} from './parliamentary-networks';

// Institutional Networks (5 types)
export {
  InstitutionalNetworks,
  createAppointmentNetwork,
  linkPatronageChains,
  createEthnicRepresentation,
  createEthnicVotingBlocs,
  linkEthnicNetworks,
  createTenderNetwork,
  createInfrastructureAllocationNetwork,
  createEducationalNetwork,
  createProfessionalNetwork,
  linkMentorshipNetworks,
  createCareerTransitionNetwork,
  type Appointment,
  type PatronageLink,
  type EthnicRepresentation,
  type EthnicVotingBloc,
  type EthnicNetworkLink,
  type TenderAward,
  type InfrastructureAllocation,
  type EducationalCredential,
  type ProfessionalCredential,
  type MentorshipLink,
  type CareerTransition,
} from './institutional-networks';

// Engagement Networks (5 types)
export {
  EngagementNetworks,
  createCommentNetwork,
  linkCommentThreads,
  createSentimentClusters,
  createCampaignParticipationNetwork,
  linkParticipantCoordination,
  createActionItemNetwork,
  linkActionProgression,
  createConstituencyEngagementNetwork,
  createLocalAdvocacyNetwork,
  createUserInfluenceNetwork,
  linkTrustNetworks,
  type Comment,
  type CommentThread,
  type SentimentCluster,
  type CampaignParticipant,
  type ParticipantCoordination,
  type ActionItem,
  type ActionProgression,
  type ConstituencyEngagement,
  type LocalAdvocacy,
  type UserInfluence,
  type TrustLink,
} from './engagement-networks';

// Network Discovery
export {
  NetworkDiscovery,
  detectAmendmentCoalitions,
  analyzeCommitteeBottlenecks,
  identifyBillEvolutionPatterns,
  findSponsorshipPatterns,
  detectPatronageNetworks,
  analyzeEthnicRepresentation,
  detectTenderAnomalies,
  analyzeEducationalNetworks,
  mapSentimentClusters,
  identifyKeyAdvocates,
  analyzeCampaignEffectiveness,
  detectConstituencyMobilization,
  mapUserInfluenceNetworks,
} from './network-discovery';

// Network Synchronization
export {
  NetworkSync,
  syncParliamentaryNetworks,
  syncInstitutionalNetworks,
  syncEngagementNetworks,
  syncAllNetworks,
  handleNetworkChangeEvent,
  type SyncStatistics,
} from './network-sync';

// Network Queries
export { NetworkQueries } from './network-queries';

// ============================================================================
// SAFEGUARDS NETWORKS (Phase 3) - Platform Protection & Trust Layer
// ============================================================================

export {
  syncModerationEntity,
  syncModerationDecision,
  syncModerationAppeal,
  linkModeratorExpertise,
  syncReputationScore,
  syncReputationHistory,
  syncReputationTier,
  syncVerificationRecord,
  syncDeviceFingerprint,
  detectMultiAccountDeviceSharing,
  syncContentFlag,
  syncFlagPattern,
  syncBehavioralAnomaly,
  syncCoordinationIndicator,
  syncRateLimitStatus,
  batchSyncSafeguards,
  type ModerationEntity,
  type ModerationDecision,
  type ModerationAppeal,
  type ReputationScore,
  type ReputationHistory,
  type VerificationRecord,
  type DeviceFingerprint,
  type ContentFlag,
  type BehavioralAnomaly,
  type CoordinationIndicator,
  type RateLimitStatus,
} from './safeguards-networks';

// ============================================================================
// PHASE 4: PRODUCTION INTEGRATION
// ============================================================================

// GraphQL API - Graph-specific implementation
export {
  GraphQLResolvers,
  graphqlSchema,
  type GraphQLContext,
  type QueryResult,
  type InfluencePathResult,
  type NetworkAnalysisResult,
  type BillAnalysisResult,
  type AdvocacyNetworkResult,
} from './graphql-api';

// Caching Adapter - Wraps core/caching
export {
  GraphCacheAdapter,
  GraphCacheKeyGenerator,
  getGraphCache,
  initializeGraphCache,
} from './cache-adapter';

// Error Handler Adapter - Wraps core/observability
export {
  GraphErrorHandler,
  GraphError,
  GraphErrorCode,
  getGraphErrorHandler,
  initializeGraphErrorHandler,
} from './error-adapter';

// Health Monitor Adapter - Wraps core/observability
export {
  GraphHealthMonitor,
  getGraphHealthMonitor,
  initializeGraphHealthMonitor,
  type GraphHealthMetrics,
} from './health-adapter';
// ================== PHASE 4 PRODUCTION HARDENING (V2 MODULES) ==================
// These v2 modules provide improved implementations with better type safety,
// error handling, caching, and observability. New code should prefer these.

// Centralized Neo4j Client - Parameterized queries, timeouts, error handling
export {
  Neo4jClient,
  createNeo4jClient,
  type QueryOptions,
  type PaginationParams,
} from './neo4j-client';

// Transaction Executor - Retries, backoff, idempotency support
export {
  TransactionExecutor,
  createTransactionExecutor,
  type TransactionOptions,
  type IdempotencyStore,
} from './transaction-executor';

// Influence Service - Encapsulates influence discovery logic
export {
  InfluenceService,
  createInfluenceService,
  type InfluenceNode,
  type InfluenceRelationship,
  type InfluencePathResult,
  type InfluenceScoreResult,
} from './influence-service';

// Pattern Discovery Service - Encapsulates pattern detection algorithms
export {
  PatternDiscoveryService,
  createPatternDiscoveryService,
  type PatternNode,
  type CoalitionPattern,
  type CommunityPattern,
  type VotingPattern,
} from './pattern-discovery-service';

// Hardened Cache Adapter V2 - Stampede protection, metrics, strong typing
export {
  GraphCacheAdapterV2,
  createGraphCacheAdapterV2,
  type CacheMetrics,
} from './cache-adapter-v2';

// Improved Error Adapter V2 - Deterministic error mapping, correlation IDs, tracing
export {
  GraphErrorHandlerV2,
  createGraphErrorHandlerV2,
  GraphErrorCode,
  type GraphError,
} from './error-adapter-v2';

// Optimized Health Adapter V2 - Liveness/readiness, cached metrics
export {
  GraphHealthAdapterV2,
  createGraphHealthAdapterV2,
  type HealthCheckResult,
  HealthLevel,
} from './health-adapter-v2';

// Test Harness - Neo4j test container setup, fixtures, utilities
export {
  setupGraphTestEnvironment,
  teardownGraphTestEnvironment,
  getTestDriver,
  resetGraphDatabase,
  createTestFixtures,
  exampleTest,
} from './test-harness';
// ============================================================================
// NEW: Core Utilities for Phase 8 Fixes
// ============================================================================

// Result Normalization - Safe Neo4j value conversion
export {
  normalizeValue,
  mapRecords,
  extractSingleValue,
  getRecordCount,
  type PlainNode,
  type PlainRelationship,
} from './result-normalizer';

// Retry Logic - Exponential backoff with jitter
export {
  retryWithBackoff,
  calculateBackoffDelay,
  sleep,
  RETRY_PRESETS,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './retry-utils';

// Idempotency Ledger - Track write operations to prevent duplicates
export {
  InMemoryIdempotencyLedger,
  createIdempotencyKey,
  createResultMarker,
  type IdempotencyRecord,
  type IIdempotencyLedger,
} from './idempotency-ledger';

// Operation Guards - Validate operations before execution
export {
  FullScanGuard,
  IdempotencyGuard,
  RelationshipExistsGuard,
  DeleteGuard,
  GuardRegistry,
  validateBeforeExecution,
  createGuards,
  type OperationValidation,
} from './operation-guard';

// V1/V2 Adapter - Gradual migration support
export {
  Neo4jClientV1Adapter,
  createLegacyAdapter,
  printMigrationGuide,
  MIGRATION_GUIDES,
  type LegacyQueryOptions,
} from './v1-v2-adapter';

// Neo4j Client - Core query execution
export {
  Neo4jClient,
  createNeo4jClient,
  type QueryOptions,
  type PaginationParams,
} from './neo4j-client';

// Graph Error Handling - Enhanced error detection
export {
  GraphErrorHandler,
  getGraphErrorHandler,
  initializeGraphErrorHandler,
  GraphErrorCode,
  type GraphError as CoreGraphError,
} from './error-adapter';
// ============================================================================
// PHASE 2: SYNCHRONIZATION (PostgreSQL ↔ Neo4j)
// ============================================================================

// Sync Executor - High-level orchestration
export {
  initializeSyncService,
  shutdownSyncService,
  triggerFullSync,
  getSyncServiceStatus,
  verifyDataConsistency,
  detectConflicts,
  resolveConflict,
  isServiceInitialized,
  getServiceConfig,
  type SyncServiceConfig,
} from './core/sync-executor';

// Batch Sync Runner - Polling executor
export {
  runBatchSync,
  startSyncScheduler,
  stopSyncScheduler,
  getSyncSchedulerStatus,
  type SyncResult,
  type BatchSyncStats,
} from './core/batch-sync-runner';

// Sync Triggers - PostgreSQL trigger definitions
export {
  initializeSyncTriggers,
  dropSyncTriggers,
  onEntityChangeTriggerFunction,
  onArrayFieldChangeTriggerFunction,
  onEntityDeleteTriggerFunction,
  triggerOnUsersInsertUpdate,
  triggerOnSponsorsInsertUpdate,
  triggerOnGovernorsInsertUpdate,
  triggerOnBillsInsertUpdate,
  triggerOnArgumentsInsertUpdate,
  triggerOnClaimsInsertUpdate,
  triggerOnParliamentarySessionsInsertUpdate,
  triggerOnParliamentarySittingsInsertUpdate,
} from '../schema/sync-triggers';
// App Initialization - One-line setup for Phase 2
export {
  initializePhase2Sync,
  shutdownPhase2Sync,
  getSyncConfig,
  getFormattedSyncStatus,
  watchSyncStatus,
  stopWatchingSyncStatus,
  checkSyncHealth,
} from './app-init';

// Sync Monitoring - REST API endpoints
export {
  handleSyncStatus,
  handleSyncHealth,
  handleFormattedStatus,
  handleTriggerSync,
  handleTriggerSyncAndWait,
  handleListConflicts,
  handleDetectConflict,
  handleResolveConflict,
  registerSyncRoutes,
  registerSyncRoutesFastify,
} from './sync-monitoring';

// ============================================================================
// PHASE 3: INTELLIGENCE LAYER EXPORTS
// ============================================================================

// Engagement Synchronization
export {
  syncVoteRelationship,
  syncCommentEvent,
  syncBookmarkRelationship,
  syncFollowRelationship,
  syncCivicScore,
  syncAchievement,
  createEngagementCommunity,
  batchSyncEngagementEvents,
  getEngagementStats,
  isEngagementDuplicate,
  type EngagementEvent,
  type VoteRelationship,
  type CommentEvent,
  type BookmarkRelationship,
  type FollowRelationship,
  type CivicScore,
  type Achievement,
} from './engagement-sync';

// Engagement Queries - Pattern Analysis
export {
  findSimilarBills,
  getInfluentialUsersForBill,
  rankUsersByInfluenceGlobally,
  getEngagementCommunities,
  getRecommendedBillsForUser,
  getExpertCommentersForBill,
  getFollowingChain,
  getTrendingBills,
  getEngagementPatterns,
  getUserCohorts,
  type SimilarBill,
  type InfluentialUser,
  type RecommendedBill,
  type EngagementCommunity,
  type ExpertCommenter,
  type TrendingBill,
  type EngagementPattern,
  type UserCohort,
} from './engagement-queries';

// Recommendation Engine
export {
  recommendBillsByCollaborativeFiltering,
  recommendBillsByContentSimilarity,
  recommendBillsByTrust,
  recommendBillsByInfluencers,
  recommendBillsByExpertise,
  generateHybridRecommendations,
  getRecommendationMetrics,
  recordRecommendationFeedback,
  type PersonalizedRecommendation,
  type RecommendationExplanation,
  type RecommendationMetrics,
  type ExpertRecommendation,
} from './recommendation-engine';

// Advanced Analytics
export {
  detectVotingCoalitions,
  analyzeAmendmentChains,
  analyzeCrossPartyInfluence,
  trackReputationEvolution,
  analyzeModerationPatterns,
  detectContentRiskPatterns,
  computeNetworkRobustness,
  findInfluenceBottlenecks,
  type VotingCoalition,
  type AmendmentChain,
  type CrossPartyInfluence,
  type ReputationEvolution,
  type ModerationPattern,
  type ContentRiskPattern,
  type NetworkRobustness,
  type InfluenceBottleneck,
} from './advanced-analytics';

// Conflict Resolution & Data Consistency
export {
  detectDataDivergence,
  getConflictDetails,
  resolveConflict,
  getUnresolvedConflicts,
  replayMissedSyncs,
  getSyncHealthMetrics,
  logConflict,
  resolvePendingConflicts,
  type DataDivergence,
  type ConflictDetails,
  type UnresolvedConflict,
  type ResolutionResult,
  type MissedSync,
  type SyncHealthMetrics,
} from './conflict-resolver';
