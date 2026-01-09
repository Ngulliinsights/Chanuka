/**
 * Core Relationship Models (FULLY REFACTORED & OPTIMIZED)
 *
 * Defines and manages core relationship types for the legislative graph,
 * including synchronization logic for entities from PostgreSQL.
 *
 * IMPROVEMENTS:
 * - ✅ Added error handling to ALL functions (was 0 try-catch blocks)
 * - ✅ Added retry logic for resilience
 * - ✅ Added comprehensive input validation
 * - ✅ Fixed all session management (no leaks)
 * - ✅ Added structured logging
 * - ✅ Proper TypeScript types (no 'any' usage)
 * - ✅ Uses centralized configuration
 * - ✅ Fixed import ordering
 * - ✅ Enhanced type safety with generics
 */

import type { Driver } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from './retry-utils';
import { executeCypherSafely } from './utils/session-manager';

const errorHandler = new GraphErrorHandler();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PersonNode {
  id: string;
  name: string;
  name_normalized?: string;
  type: 'mp' | 'governor' | 'citizen' | 'expert' | 'official';
  email?: string;
  phone?: string;
  county?: string;
  constituency?: string;
  ward?: string;
  ethnicity?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  party?: string;
  previous_parties?: string[];
  coalition?: string;
  chamber?: 'national_assembly' | 'senate' | 'county_assembly';
  mp_number?: string;
  position?: string;
  role?: string;
  bio?: string;
  education?: Array<{ degree: string; institution: string }>;
  professional_background?: string;
  photo_url?: string;
  website?: string;
  office_location?: string;
  social_media?: Record<string, string>;
  has_pending_cases?: boolean;
  financial_disclosures_count?: number;
  voting_record?: Record<string, unknown>;
  attendance_rate?: number;
  bills_sponsored_count?: number;
  bills_passed_count?: number;
  public_rating?: number;
  rating_count?: number;
  follower_count?: number;
  term_start?: string;
  term_end?: string;
  election_date?: string;
  is_active?: boolean;
  is_verified?: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface OrganizationNode {
  id: string;
  name: string;
  type: 'corporate' | 'ngo' | 'media' | 'think_tank' | 'government';
  industry?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface BillNode {
  id: string;
  bill_number: string;
  title: string;
  title_normalized?: string;
  summary?: string;
  status: string;
  previous_status?: string;
  chamber: 'national_assembly' | 'senate' | 'county_assembly';
  sponsor_id?: string;
  co_sponsors?: string[];
  co_sponsors_count?: number;
  committee_id?: string;
  committee_recommendation?: string;
  introduced_date: string;
  last_action_date?: string;
  expected_completion_date?: string;
  affected_counties?: string[];
  impact_areas?: string[];
  view_count?: number;
  comment_count?: number;
  vote_count_for?: number;
  vote_count_against?: number;
  vote_count_neutral?: number;
  engagement_score?: number;
  trending_score?: number;
  sentiment_score?: number;
  positive_mentions?: number;
  negative_mentions?: number;
  neutral_mentions?: number;
  category?: string;
  sub_category?: string;
  tags?: string[];
  primary_sector?: string;
  controversy_score?: number;
  quality_score?: number;
  is_urgent?: boolean;
  is_money_bill?: boolean;
  is_constitutional_amendment?: boolean;
  priority_level?: 'low' | 'normal' | 'high' | 'critical';
  is_verified?: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CommitteeNode {
  id: string;
  name: string;
  chamber: string;
  chair_id?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface TopicNode {
  id: string;
  name: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ArgumentNode {
  id: string;
  bill_id: string;
  argument_text: string;
  argument_summary?: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  argument_type?: 'economic' | 'constitutional' | 'social' | 'procedural';
  strength_score?: number;
  confidence_score?: number;
  author_id?: string;
  extraction_method?: 'automated' | 'manual' | 'hybrid';
  source_comments?: string[];
  support_count?: number;
  opposition_count?: number;
  citizen_endorsements?: number;
  is_verified?: boolean;
  verified_by?: string;
  quality_score?: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface UserNode {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  bio?: string;
  county?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_active?: boolean;
  anonymity_level?: 'public' | 'verified_pseudonym' | 'anonymous';
  comments_count?: number;
  votes_count?: number;
  follower_count?: number;
  following_count?: number;
  email_notifications_consent?: boolean;
  data_processing_consent?: boolean;
  is_verified_in_db?: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface GovernorNode {
  id: string;
  name: string;
  name_normalized?: string;
  county: string;
  party?: string;
  previous_parties?: string[];
  coalition?: string;
  ethnicity?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  bio?: string;
  education?: Array<{ degree: string; institution: string }>;
  photo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  has_pending_cases?: boolean;
  financial_disclosures_count?: number;
  completed_projects_count?: number;
  budget_execution_rate?: number;
  public_rating?: number;
  rating_count?: number;
  term_start?: string;
  term_end?: string;
  election_date?: string;
  term_number?: number;
  is_active?: boolean;
  is_verified?: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ParliamentarySessionNode {
  id: string;
  parliament_number: number;
  session_number: number;
  chamber: 'national_assembly' | 'senate';
  start_date: string;
  end_date?: string;
  sittings_count?: number;
  bills_introduced_count?: number;
  bills_passed_count?: number;
  is_active?: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ParliamentarySittingNode {
  id: string;
  session_id: string;
  sitting_date: string;
  sitting_type: 'regular' | 'special' | 'emergency' | 'committee_of_whole';
  attendance_count?: number;
  quorum_met?: boolean;
  duration_minutes?: number;
  bills_discussed?: string[];
  motions_moved?: string[];
  questions_answered?: string[];
  minutes_url?: string;
  hansard_url?: string;
  video_url?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ClaimNode {
  id: string;
  claim_text: string;
  claim_summary?: string;
  claim_type?: 'factual' | 'predictive' | 'normative' | 'causal';
  verification_status: 'verified' | 'disputed' | 'false' | 'unverified';
  fact_check_url?: string;
  mention_count?: number;
  importance_score?: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// Union type for all node types
export type GraphNode =
  | PersonNode
  | OrganizationNode
  | BillNode
  | CommitteeNode
  | TopicNode
  | ArgumentNode
  | UserNode
  | GovernorNode
  | ParliamentarySessionNode
  | ParliamentarySittingNode
  | ClaimNode;

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateNodeId(id: string, entityType: string): void {
  if (!id || typeof id !== 'string') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: `Invalid ${entityType} id: must be a non-empty string`,
    });
  }
}

function validateNodeProperties<T extends Record<string, unknown>>(
  node: T,
  requiredFields: (keyof T)[],
  entityType: string
): void {
  for (const field of requiredFields) {
    if (!node[field]) {
      throw new GraphError({
        code: GraphErrorCode.INVALID_INPUT,
        message: `${entityType} is missing required field: ${String(field)}`,
      });
    }
  }
}

// ============================================================================
// NODE SYNCHRONIZATION FUNCTIONS
// ============================================================================

export async function syncPersonToGraph(driver: Driver, person: PersonNode): Promise<void> {
  validateNodeProperties(person, ['id', 'name', 'created_at', 'updated_at'], 'Person');

  const cypher = `
    MERGE (p:Person {id: $id})
    SET p += $properties,
        p.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: person.id, properties: person }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced person to graph', { personId: person.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncPersonToGraph', personId: person.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync person ${person.id}`,
      cause: error as Error,
    });
  }
}

export async function syncOrganizationToGraph(driver: Driver, org: OrganizationNode): Promise<void> {
  validateNodeProperties(org, ['id', 'name', 'created_at', 'updated_at'], 'Organization');

  const cypher = `
    MERGE (o:Organization {id: $id})
    SET o += $properties,
        o.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: org.id, properties: org }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced organization to graph', { orgId: org.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncOrganizationToGraph', orgId: org.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync organization ${org.id}`,
      cause: error as Error,
    });
  }
}

export async function syncBillToGraph(driver: Driver, bill: BillNode): Promise<void> {
  validateNodeProperties(bill, ['id', 'bill_number', 'title', 'introduced_date'], 'Bill');

  const cypher = `
    MERGE (b:Bill {id: $id})
    SET b += $properties,
        b.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: bill.id, properties: bill }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced bill to graph', { billId: bill.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncBillToGraph', billId: bill.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync bill ${bill.id}`,
      cause: error as Error,
    });
  }
}

export async function syncCommitteeToGraph(driver: Driver, committee: CommitteeNode): Promise<void> {
  validateNodeProperties(committee, ['id', 'name'], 'Committee');

  const cypher = `
    MERGE (c:Committee {id: $id})
    SET c += $properties,
        c.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: committee.id, properties: committee }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced committee to graph', { committeeId: committee.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncCommitteeToGraph', committeeId: committee.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync committee ${committee.id}`,
      cause: error as Error,
    });
  }
}

export async function syncTopicToGraph(driver: Driver, topic: TopicNode): Promise<void> {
  validateNodeProperties(topic, ['id', 'name'], 'Topic');

  const cypher = `
    MERGE (t:Topic {id: $id})
    SET t += $properties,
        t.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: topic.id, properties: topic }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced topic to graph', { topicId: topic.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncTopicToGraph', topicId: topic.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync topic ${topic.id}`,
      cause: error as Error,
    });
  }
}

export async function syncArgumentToGraph(driver: Driver, argument: ArgumentNode): Promise<void> {
  validateNodeProperties(argument, ['id', 'bill_id', 'argument_text'], 'Argument');

  const cypher = `
    MERGE (a:Argument {id: $id})
    SET a += $properties,
        a.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: argument.id, properties: argument }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced argument to graph', { argumentId: argument.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncArgumentToGraph', argumentId: argument.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync argument ${argument.id}`,
      cause: error as Error,
    });
  }
}

export async function syncUserToGraph(driver: Driver, user: UserNode): Promise<void> {
  validateNodeProperties(user, ['id', 'email'], 'User');

  const cypher = `
    MERGE (u:User {id: $id})
    SET u += $properties,
        u.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: user.id, properties: user }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced user to graph', { userId: user.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncUserToGraph', userId: user.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync user ${user.id}`,
      cause: error as Error,
    });
  }
}

export async function syncGovernorToGraph(driver: Driver, governor: GovernorNode): Promise<void> {
  validateNodeProperties(governor, ['id', 'name', 'county'], 'Governor');

  const cypher = `
    MERGE (g:Governor {id: $id})
    SET g += $properties,
        g.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: governor.id, properties: governor }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced governor to graph', { governorId: governor.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncGovernorToGraph', governorId: governor.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync governor ${governor.id}`,
      cause: error as Error,
    });
  }
}

export async function syncParliamentarySessionToGraph(driver: Driver, session: ParliamentarySessionNode): Promise<void> {
  validateNodeProperties(session, ['id', 'parliament_number', 'session_number'], 'ParliamentarySession');

  const cypher = `
    MERGE (s:ParliamentarySession {id: $id})
    SET s += $properties,
        s.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: session.id, properties: session }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced parliamentary session to graph', { sessionId: session.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncParliamentarySessionToGraph', sessionId: session.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync parliamentary session ${session.id}`,
      cause: error as Error,
    });
  }
}

export async function syncParliamentarySittingToGraph(driver: Driver, sitting: ParliamentarySittingNode): Promise<void> {
  validateNodeProperties(sitting, ['id', 'session_id', 'sitting_date'], 'ParliamentarySitting');

  const cypher = `
    MERGE (s:ParliamentarySitting {id: $id})
    SET s += $properties,
        s.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: sitting.id, properties: sitting }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced parliamentary sitting to graph', { sittingId: sitting.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncParliamentarySittingToGraph', sittingId: sitting.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync parliamentary sitting ${sitting.id}`,
      cause: error as Error,
    });
  }
}

export async function syncClaimToGraph(driver: Driver, claim: ClaimNode): Promise<void> {
  validateNodeProperties(claim, ['id', 'claim_text'], 'Claim');

  const cypher = `
    MERGE (c:Claim {id: $id})
    SET c += $properties,
        c.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id: claim.id, properties: claim }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Synced claim to graph', { claimId: claim.id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'syncClaimToGraph', claimId: claim.id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync claim ${claim.id}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// RELATIONSHIP CREATION FUNCTIONS
// ============================================================================

export async function createSponsorshipRelationship(driver: Driver, personId: string, billId: string): Promise<void> {
  validateNodeId(personId, 'Person');
  validateNodeId(billId, 'Bill');

  const cypher = `
    MATCH (p:Person {id: $personId}), (b:Bill {id: $billId})
    MERGE (p)-[r:SPONSORED_BY]->(b)
    SET r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, billId }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created sponsorship relationship', { personId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createSponsorshipRelationship', personId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create sponsorship relationship`,
      cause: error as Error,
    });
  }
}

export async function createCommitteeMembershipRelationship(driver: Driver, personId: string, committeeId: string, role?: string): Promise<void> {
  validateNodeId(personId, 'Person');
  validateNodeId(committeeId, 'Committee');

  const cypher = `
    MATCH (p:Person {id: $personId}), (c:Committee {id: $committeeId})
    MERGE (p)-[r:MEMBER_OF]->(c)
    SET r.role = $role,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, committeeId, role }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created committee membership', { personId, committeeId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createCommitteeMembershipRelationship', personId, committeeId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create committee membership`,
      cause: error as Error,
    });
  }
}

export async function createBillAssignmentRelationship(driver: Driver, billId: string, committeeId: string): Promise<void> {
  validateNodeId(billId, 'Bill');
  validateNodeId(committeeId, 'Committee');

  const cypher = `
    MATCH (b:Bill {id: $billId}), (c:Committee {id: $committeeId})
    MERGE (b)-[r:ASSIGNED_TO]->(c)
    SET r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { billId, committeeId }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created bill assignment', { billId, committeeId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createBillAssignmentRelationship', billId, committeeId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create bill assignment`,
      cause: error as Error,
    });
  }
}

export async function createTopicMentionRelationship(driver: Driver, billId: string, topicId: string): Promise<void> {
  validateNodeId(billId, 'Bill');
  validateNodeId(topicId, 'Topic');

  const cypher = `
    MATCH (b:Bill {id: $billId}), (t:Topic {id: $topicId})
    MERGE (b)-[r:ABOUT]->(t)
    SET r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { billId, topicId }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created topic mention', { billId, topicId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createTopicMentionRelationship', billId, topicId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create topic mention`,
      cause: error as Error,
    });
  }
}

export async function createArgumentRelationship(driver: Driver, argumentId: string, billId: string): Promise<void> {
  validateNodeId(argumentId, 'Argument');
  validateNodeId(billId, 'Bill');

  const cypher = `
    MATCH (a:Argument {id: $argumentId}), (b:Bill {id: $billId})
    MERGE (a)-[r:ARGUES]->(b)
    SET r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { argumentId, billId }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created argument relationship', { argumentId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createArgumentRelationship', argumentId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create argument relationship`,
      cause: error as Error,
    });
  }
}

export async function createFinancialInterestRelationship(
  driver: Driver,
  personId: string,
  orgId: string,
  interestType: string,
  amount?: number
): Promise<void> {
  validateNodeId(personId, 'Person');
  validateNodeId(orgId, 'Organization');

  const cypher = `
    MATCH (p:Person {id: $personId}), (o:Organization {id: $orgId})
    MERGE (p)-[r:HAS_FINANCIAL_INTEREST]->(o)
    SET r.type = $interestType,
        r.amount = $amount,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, orgId, interestType, amount }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created financial interest', { personId, orgId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createFinancialInterestRelationship', personId, orgId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create financial interest`,
      cause: error as Error,
    });
  }
}

export async function createVotingRelationship(
  driver: Driver,
  personId: string,
  billId: string,
  position: 'yes' | 'no' | 'abstain'
): Promise<void> {
  validateNodeId(personId, 'Person');
  validateNodeId(billId, 'Bill');

  const cypher = `
    MATCH (p:Person {id: $personId}), (b:Bill {id: $billId})
    MERGE (p)-[r:VOTED]->(b)
    SET r.position = $position,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, billId, position }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created voting relationship', { personId, billId, position });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createVotingRelationship', personId, billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create voting relationship`,
      cause: error as Error,
    });
  }
}

export async function createVotingCoalitionRelationship(
  driver: Driver,
  person1Id: string,
  person2Id: string,
  agreementRate: number
): Promise<void> {
  validateNodeId(person1Id, 'Person');
  validateNodeId(person2Id, 'Person');

  const cypher = `
    MATCH (p1:Person {id: $person1Id}), (p2:Person {id: $person2Id})
    MERGE (p1)-[r:VOTING_COALITION]-(p2)
    SET r.agreement_rate = $agreementRate,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { person1Id, person2Id, agreementRate }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created voting coalition', { person1Id, person2Id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createVotingCoalitionRelationship', person1Id, person2Id });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create voting coalition`,
      cause: error as Error,
    });
  }
}

export async function createAffiliationRelationship(
  driver: Driver,
  personId: string,
  orgId: string,
  role?: string
): Promise<void> {
  validateNodeId(personId, 'Person');
  validateNodeId(orgId, 'Organization');

  const cypher = `
    MATCH (p:Person {id: $personId}), (o:Organization {id: $orgId})
    MERGE (p)-[r:AFFILIATED_WITH]->(o)
    SET r.role = $role,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { personId, orgId, role }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created affiliation', { personId, orgId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createAffiliationRelationship', personId, orgId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create affiliation`,
      cause: error as Error,
    });
  }
}

export async function createDocumentReferenceRelationship(
  driver: Driver,
  billId: string,
  documentUrl: string,
  documentType: string
): Promise<void> {
  validateNodeId(billId, 'Bill');

  const cypher = `
    MATCH (b:Bill {id: $billId})
    MERGE (b)-[r:HAS_DOCUMENT {url: $documentUrl}]->(d:Document {url: $documentUrl})
    SET r.type = $documentType,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { billId, documentUrl, documentType }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.debug('Created document reference', { billId, documentUrl });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createDocumentReferenceRelationship', billId });
    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to create document reference`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export async function getEntity<T extends GraphNode = GraphNode>(
  driver: Driver,
  label: string,
  id: string
): Promise<T | null> {
  validateNodeId(id, label);

  const cypher = `
    MATCH (n:${label} {id: $id})
    RETURN n
  `;

  try {
    const result = await executeCypherSafely(driver, cypher, { id }, { mode: 'READ' });
    return (result.records[0]?.get('n').properties as T) || null;
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getEntity', label, id });
    throw new GraphError({
      code: GraphErrorCode.QUERY_FAILED,
      message: `Failed to get entity ${label}:${id}`,
      cause: error as Error,
    });
  }
}

export async function deleteEntity(driver: Driver, label: string, id: string): Promise<void> {
  validateNodeId(id, label);

  const cypher = `
    MATCH (n:${label} {id: $id})
    DETACH DELETE n
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, { id }),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    console.info('Deleted entity', { label, id });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'deleteEntity', label, id });
    throw new GraphError({
      code: GraphErrorCode.OPERATION_FAILED,
      message: `Failed to delete entity ${label}:${id}`,
      cause: error as Error,
    });
  }
}
