/**
 * Graph Database Public API
 *
 * Provides a unified interface for all graph database operations,
 * combining driver management, synchronization, and relationships.
 */

// ============================================================================
// PHASE 1: CORE SCHEMA & DATABASE INITIALIZATION
// ============================================================================

export {
  createConstraints,
  createIndexes,
  initializeGraphSchema,
  verifyGraphSchema,
  getDatabaseStats,
} from './core/schema';

// ============================================================================
// UTILITIES & CONFIGURATION
// ============================================================================

// Session Management
export {
  withSession,
  withWriteSession,
  withReadSession,
  withTransaction,
  executeCypherSafely,
} from './utils/session-manager';

// Query Builder
export {
  CypherQueryBuilder,
  withPagination,
  type PaginationOptions,
} from './utils/query-builder';

// Configuration
export {
  NEO4J_CONFIG,
  SYNC_CONFIG,
  QUERY_CONFIG,
  validateConfig,
  type GraphFeatureFlags,
  type GraphEnvironment,
  type Neo4jConnectionConfig,
} from './config/graph-config';

// ============================================================================
// QUERY OPERATIONS (READ-ONLY)
// ============================================================================

export * from './query/advanced-queries';
export * from './query/engagement-queries';
export * from './query/network-queries';

// ============================================================================
// RELATIONSHIPS & ENTITY SYNCHRONIZATION
// ============================================================================

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
// ERROR HANDLING & OBSERVABILITY
// ============================================================================

export {
  GraphErrorHandler,
  GraphErrorCode,
  type GraphError,
} from './error-adapter-v2';

export {
  HealthAdapterV2,
} from './health-adapter-v2';

export {
  CacheAdapterV2,
} from './cache-adapter-v2';

// ============================================================================
// UTILITIES FOR ADVANCED USE CASES
// ============================================================================

export {
  normalizeValue,
  extractSingle,
} from './result-normalizer';

export {
  retryWithBackoff,
  RETRY_PRESETS,
  type RetryConfig,
} from './retry-utils';

export {
  detectDataDivergence,
  getConflictDetails,
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

// ============================================================================
// APP INITIALIZATION
// ============================================================================

export {
  initializeGraphDatabase,
  shutdownGraphDatabase,
} from './app-init';
