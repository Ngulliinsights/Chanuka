/**
 * Advanced Relationship Models - Phase 2 (REFACTORED)
 *
 * Adds complex relationship types for influence tracking, financial interests,
 * and higher-order relationships between entities.
 *
 * IMPROVEMENTS:
 * - ✅ Fixed all 12 async functions (was 0 try-catch blocks)
 * - ✅ Added retry logic
 * - ✅ Added input validation
 * - ✅ Fixed session management
 * - ✅ Proper error handling
 * - ✅ Structured logging
 */

import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FinancialInterest {
  type: 'directorship' | 'investment' | 'consulting' | 'ownership';
  value_range?: string;
  percentage?: number;
  acquisition_date?: string;
  verified: boolean;
  source: 'public_disclosure' | 'media_report' | 'internal';
  disclosure_date: string;
}

export interface LobbyingRelationship {
  amount_spent: number;
  period: string;
  issues: string[];
  registered: boolean;
  registration_date?: string;
}

export interface MediaInfluenceRelationship {
  frequency: 'daily' | 'weekly' | 'monthly' | 'sporadic';
  tone: 'positive' | 'negative' | 'neutral' | 'mixed';
  reach: number;
  engagement_rate: number;
  platforms: string[];
}

export interface CampaignContribution {
  amount: number;
  date: string;
  type: 'individual' | 'corporate' | 'pac' | 'foreign';
  reported: boolean;
  donor_id?: string;
}

export interface VotingCoalitionRelationship {
  strength: number;
  agreement_rate: number;
  last_vote_date?: string;
  duration_months?: number;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateIds(id1: string, id2: string, context: string): void {
  if (!id1 || typeof id1 !== 'string') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: `${context}: first ID is invalid`,
    });
  }
  if (!id2 || typeof id2 !== 'string') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: `${context}: second ID is invalid`,
    });
  }
}

// ============================================================================
// RELATIONSHIP CREATION FUNCTIONS
// ============================================================================

export async function createOrUpdateFinancialInterest(
  driver: Driver,
  personId: string,
  orgId: string,
  interest: FinancialInterest
): Promise<void> {
  validateIds(personId, orgId, 'createOrUpdateFinancialInterest');

  const cypher = `
    MATCH (p:Person {id: $personId}), (o:Organization {id: $orgId})
    MERGE (p)-[r:HAS_FINANCIAL_INTEREST]->(o)
    SET r += $interest,
        r.last_updated = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, orgId, interest }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created financial interest', { personId, orgId, type: interest.type });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createOrUpdateFinancialInterest', personId, orgId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create financial interest`,
      cause: error as Error,
    });
  }
}

export async function createOrUpdateLobbyingRelationship(
  driver: Driver,
  orgId: string,
  personId: string,
  lobbying: LobbyingRelationship
): Promise<void> {
  validateIds(orgId, personId, 'createOrUpdateLobbyingRelationship');

  const cypher = `
    MATCH (o:Organization {id: $orgId}), (p:Person {id: $personId})
    MERGE (o)-[r:LOBBIES]->(p)
    SET r += $lobbying,
        r.last_updated = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { orgId, personId, lobbying }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created lobbying relationship', { orgId, personId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createOrUpdateLobbyingRelationship', orgId, personId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create lobbying relationship`,
      cause: error as Error,
    });
  }
}

export async function createMediaInfluenceRelationship(
  driver: Driver,
  mediaOrgId: string,
  personId: string,
  influence: MediaInfluenceRelationship
): Promise<void> {
  validateIds(mediaOrgId, personId, 'createMediaInfluenceRelationship');

  const cypher = `
    MATCH (m:Organization {id: $mediaOrgId}), (p:Person {id: $personId})
    MERGE (m)-[r:INFLUENCES_MEDIA]->(p)
    SET r += $influence,
        r.last_updated = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { mediaOrgId, personId, influence }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created media influence relationship', { mediaOrgId, personId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createMediaInfluenceRelationship', mediaOrgId, personId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create media influence relationship`,
      cause: error as Error,
    });
  }
}

export async function createCampaignContributionRelationship(
  driver: Driver,
  donorId: string,
  personId: string,
  contribution: CampaignContribution
): Promise<void> {
  validateIds(donorId, personId, 'createCampaignContributionRelationship');

  const cypher = `
    MATCH (d {id: $donorId}), (p:Person {id: $personId})
    MERGE (d)-[r:CONTRIBUTES_TO_CAMPAIGN]->(p)
    SET r += $contribution,
        r.recorded_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { donorId, personId, contribution }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created campaign contribution', { donorId, personId, amount: contribution.amount });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createCampaignContributionRelationship', donorId, personId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create campaign contribution`,
      cause: error as Error,
    });
  }
}

export async function createOrUpdateVotingCoalition(
  driver: Driver,
  person1Id: string,
  person2Id: string,
  coalition: VotingCoalitionRelationship
): Promise<void> {
  validateIds(person1Id, person2Id, 'createOrUpdateVotingCoalition');

  const cypher = `
    MATCH (p1:Person {id: $person1Id}), (p2:Person {id: $person2Id})
    MERGE (p1)-[r:VOTING_COALITION]-(p2)
    SET r += $coalition,
        r.last_updated = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { person1Id, person2Id, coalition }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created voting coalition', { person1Id, person2Id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createOrUpdateVotingCoalition', person1Id, person2Id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create voting coalition`,
      cause: error as Error,
    });
  }
}

export async function createProfessionalNetworkRelationship(
  driver: Driver,
  person1Id: string,
  person2Id: string,
  connectionType: 'colleague' | 'mentor' | 'mentee' | 'collaborator',
  startDate?: string
): Promise<void> {
  validateIds(person1Id, person2Id, 'createProfessionalNetworkRelationship');

  const cypher = `
    MATCH (p1:Person {id: $person1Id}), (p2:Person {id: $person2Id})
    MERGE (p1)-[r:PROFESSIONAL_NETWORK]-(p2)
    SET r.connection_type = $connectionType,
        r.start_date = $startDate,
        r.last_updated = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { person1Id, person2Id, connectionType, startDate: startDate || new Date().toISOString() }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created professional network', { person1Id, person2Id, connectionType });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createProfessionalNetworkRelationship', person1Id, person2Id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create professional network`,
      cause: error as Error,
    });
  }
}

export async function createPolicyInfluenceRelationship(
  driver: Driver,
  orgId: string,
  billId: string,
  influenceScore: number,
  methods: string[]
): Promise<void> {
  validateIds(orgId, billId, 'createPolicyInfluenceRelationship');

  const cypher = `
    MATCH (o:Organization {id: $orgId}), (b:Bill {id: $billId})
    MERGE (o)-[r:INFLUENCES_POLICY]->(b)
    SET r.influence_score = $influenceScore,
        r.methods = $methods,
        r.created_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { orgId, billId, influenceScore, methods }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created policy influence', { orgId, billId, influenceScore });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createPolicyInfluenceRelationship', orgId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create policy influence`,
      cause: error as Error,
    });
  }
}

export async function createMediaCoverageRelationship(
  driver: Driver,
  mediaOrgId: string,
  billId: string,
  coverage: { tone: 'supportive' | 'critical' | 'neutral'; volume: number; reach: number }
): Promise<void> {
  validateIds(mediaOrgId, billId, 'createMediaCoverageRelationship');

  const cypher = `
    MATCH (m:Organization {id: $mediaOrgId}), (b:Bill {id: $billId})
    MERGE (m)-[r:COVERS]->(b)
    SET r += $coverage,
        r.last_article_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { mediaOrgId, billId, coverage }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created media coverage', { mediaOrgId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createMediaCoverageRelationship', mediaOrgId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create media coverage`,
      cause: error as Error,
    });
  }
}

export async function createExpertOpinionRelationship(
  driver: Driver,
  expertId: string,
  billId: string,
  opinion: { stance: 'support' | 'oppose' | 'neutral'; expertise_area: string; credibility_score: number }
): Promise<void> {
  validateIds(expertId, billId, 'createExpertOpinionRelationship');

  const cypher = `
    MATCH (e:Person {id: $expertId}), (b:Bill {id: $billId})
    MERGE (e)-[r:EXPERT_OPINION]->(b)
    SET r += $opinion,
        r.opinion_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { expertId, billId, opinion }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created expert opinion', { expertId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createExpertOpinionRelationship', expertId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create expert opinion`,
      cause: error as Error,
    });
  }
}

export async function createSectorInfluenceRelationship(
  driver: Driver,
  industryTag: string,
  billId: string,
  impact: { positive_impact: boolean; impact_magnitude: number; affected_companies: number }
): Promise<void> {
  if (!industryTag || !billId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'industryTag and billId are required',
    });
  }

  const cypher = `
    MATCH (t:Topic {id: $industryTag}), (b:Bill {id: $billId})
    MERGE (t)-[r:SECTOR_IMPACT]->(b)
    SET r += $impact,
        r.analyzed_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { industryTag, billId, impact }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created sector influence', { industryTag, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createSectorInfluenceRelationship', industryTag, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create sector influence`,
      cause: error as Error,
    });
  }
}

export async function createStakeholderInfluenceRelationship(
  driver: Driver,
  stakeholderId: string,
  billId: string,
  influence: {
    stake_type: 'direct' | 'indirect';
    priority_level: 'critical' | 'high' | 'medium' | 'low';
    expected_benefit: string;
    mobilization_capacity: number;
  }
): Promise<void> {
  validateIds(stakeholderId, billId, 'createStakeholderInfluenceRelationship');

  const cypher = `
    MATCH (s:Organization {id: $stakeholderId}), (b:Bill {id: $billId})
    MERGE (s)-[r:STAKEHOLDER_INFLUENCE]->(b)
    SET r += $influence,
        r.identified_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { stakeholderId, billId, influence }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created stakeholder influence', { stakeholderId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createStakeholderInfluenceRelationship', stakeholderId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create stakeholder influence`,
      cause: error as Error,
    });
  }
}

export async function createCrossPartyAllianceRelationship(
  driver: Driver,
  person1Id: string,
  person2Id: string,
  alliance: {
    party1: string;
    party2: string;
    bills_collaborated: number;
    agreement_rate: number;
    alliance_strength: 'strong' | 'moderate' | 'weak';
  }
): Promise<void> {
  validateIds(person1Id, person2Id, 'createCrossPartyAllianceRelationship');

  const cypher = `
    MATCH (p1:Person {id: $person1Id}), (p2:Person {id: $person2Id})
    MERGE (p1)-[r:CROSS_PARTY_ALLIANCE]-(p2)
    SET r += $alliance,
        r.formed_date = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { person1Id, person2Id, alliance }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.debug('Created cross-party alliance', { person1Id, person2Id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createCrossPartyAllianceRelationship', person1Id, person2Id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create cross-party alliance`,
      cause: error as Error,
    });
  }
}
