/**
 * Engagement Synchronization - User Activity Graph (REFACTORED)
 *
 * Synchronizes PostgreSQL engagement events to Neo4j relationship networks
 * - Comments (discussion threads)
 * - Votes (support/oppose signals)
 * - Bookmarks (interest markers)
 * - Follows (network building)
 * - Civic scores (reputation metrics)
 * - Achievements (milestone tracking)
 *
 * IMPROVEMENTS:
 * - ✅ Fixed session leaks using withSession utility
 * - ✅ Added retry logic for resilience
 * - ✅ Added error handling with proper error types
 * - ✅ Added input validation
 * - ✅ Added structured logging
 * - ✅ Removed Cypher injection risks (already parameterized)
 * - ✅ Extracted configuration to constants
 */

import type { Driver } from 'neo4j-driver';
import { withWriteSession, withReadSession, executeCypherSafely } from './utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from './retry-utils';
import { ENGAGEMENT_CONFIG } from './config/graph-config';

const errorHandler = new GraphErrorHandler();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EngagementEvent {
  id: string;
  user_id: string;
  event_type: 'view' | 'comment' | 'vote' | 'bookmark' | 'follow' | 'achievement';
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface VoteRelationship {
  user_id: string;
  bill_id: string;
  vote_type: 'support' | 'oppose';
  timestamp: Date;
}

export interface CommentEvent {
  id: string;
  user_id: string;
  bill_id: string;
  text: string;
  created_at: Date;
}

export interface BookmarkRelationship {
  user_id: string;
  bill_id: string;
  created_at: Date;
}

export interface FollowRelationship {
  user_id: string;
  target_id: string;
  target_type: 'user' | 'person';
  created_at: Date;
}

export interface CivicScore {
  user_id: string;
  total_engagement_score: number;
  votes_cast: number;
  comments_made: number;
  bookmarks_created: number;
  achievements_earned: number;
  updated_at: Date;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  points: number;
  earned_at: Date;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Invalid user_id: must be a non-empty string',
    });
  }
}

function validateBillId(billId: string): void {
  if (!billId || typeof billId !== 'string') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Invalid bill_id: must be a non-empty string',
    });
  }
}

function validateVoteType(voteType: string): asserts voteType is 'support' | 'oppose' {
  if (voteType !== 'support' && voteType !== 'oppose') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: `Invalid vote_type: must be 'support' or 'oppose', got '${voteType}'`,
    });
  }
}

// ============================================================================
// VOTE SYNCHRONIZATION - Support/Oppose Signals
// ============================================================================

/**
 * Synchronize a vote relationship from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param userId - UUID of the user casting the vote
 * @param billId - UUID of the bill being voted on
 * @param voteType - Type of vote: 'support' or 'oppose'
 * @param timestamp - When the vote was cast (defaults to now)
 *
 * @throws {GraphError} If validation fails or sync fails after retries
 */
export async function syncVoteRelationship(
  driver: Driver,
  userId: string,
  billId: string,
  voteType: 'support' | 'oppose',
  timestamp: Date = new Date()
): Promise<void> {
  // Validate inputs
  validateUserId(userId);
  validateBillId(billId);
  validateVoteType(voteType);

  const cypher = `
    MATCH (user:User {id: $userId}), (bill:Bill {id: $billId})
    MERGE (user)-[rel:VOTED_ON]->(bill)
    SET rel.vote_type = $voteType,
        rel.created_at = $timestamp,
        rel.last_updated = timestamp()
    WITH user, bill, rel
    SET user.total_engagement_score = coalesce(user.total_engagement_score, 0) + $votePoints,
        bill.votes_count = coalesce(bill.votes_count, 0) + 1
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId,
        billId,
        voteType,
        timestamp,
        votePoints: ENGAGEMENT_CONFIG.VOTE_POINTS,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced vote relationship', { userId, billId, voteType });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncVoteRelationship',
      userId,
      billId,
      voteType,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync vote relationship for user ${userId} on bill ${billId}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// COMMENT SYNCHRONIZATION - Discussion Threads
// ============================================================================

/**
 * Synchronize a comment event from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param comment - Comment event to sync
 *
 * @throws {GraphError} If sync fails after retries
 */
export async function syncCommentEvent(
  driver: Driver,
  comment: CommentEvent
): Promise<void> {
  // Validate inputs
  validateUserId(comment.user_id);
  validateBillId(comment.bill_id);

  if (!comment.id || !comment.text) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Comment must have id and text',
    });
  }

  const cypher = `
    MATCH (user:User {id: $userId}), (bill:Bill {id: $billId})
    MERGE (comment:Comment {id: $commentId})
    SET comment.text = $text,
        comment.created_at = $createdAt,
        comment.sentiment_score = 0.0,
        comment.last_synced = timestamp()
    MERGE (user)-[r:COMMENTED_ON]->(bill)
    SET r.comment_count = coalesce(r.comment_count, 0) + 1,
        r.last_comment_at = $createdAt
    MERGE (user)-[:AUTHORED]->(comment)
    MERGE (comment)-[:ON_BILL]->(bill)
    WITH user, comment
    SET user.total_engagement_score = coalesce(user.total_engagement_score, 0) + $commentPoints
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId: comment.user_id,
        billId: comment.bill_id,
        commentId: comment.id,
        text: comment.text,
        createdAt: comment.created_at,
        commentPoints: ENGAGEMENT_CONFIG.COMMENT_POINTS,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced comment event', { commentId: comment.id, userId: comment.user_id });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncCommentEvent',
      commentId: comment.id,
      userId: comment.user_id,
      billId: comment.bill_id,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync comment ${comment.id}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// BOOKMARK SYNCHRONIZATION - Interest Markers
// ============================================================================

/**
 * Synchronize a bookmark relationship from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param userId - UUID of the user creating the bookmark
 * @param billId - UUID of the bill being bookmarked
 * @param timestamp - When the bookmark was created
 *
 * @throws {GraphError} If sync fails after retries
 */
export async function syncBookmarkRelationship(
  driver: Driver,
  userId: string,
  billId: string,
  timestamp: Date = new Date()
): Promise<void> {
  validateUserId(userId);
  validateBillId(billId);

  const cypher = `
    MATCH (user:User {id: $userId}), (bill:Bill {id: $billId})
    MERGE (user)-[rel:BOOKMARKED]->(bill)
    SET rel.created_at = $timestamp,
        rel.last_updated = timestamp()
    WITH user
    SET user.total_engagement_score = coalesce(user.total_engagement_score, 0) + $bookmarkPoints
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId,
        billId,
        timestamp,
        bookmarkPoints: ENGAGEMENT_CONFIG.BOOKMARK_POINTS,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced bookmark relationship', { userId, billId });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncBookmarkRelationship',
      userId,
      billId,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync bookmark for user ${userId} on bill ${billId}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// FOLLOW SYNCHRONIZATION - Network Building
// ============================================================================

/**
 * Synchronize a follow relationship from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param userId - UUID of the user following
 * @param targetId - UUID of the target being followed
 * @param targetType - Type of target: 'user' or 'person'
 * @param timestamp - When the follow was created
 *
 * @throws {GraphError} If sync fails after retries
 */
export async function syncFollowRelationship(
  driver: Driver,
  userId: string,
  targetId: string,
  targetType: 'user' | 'person',
  timestamp: Date = new Date()
): Promise<void> {
  validateUserId(userId);

  if (!targetId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Invalid target_id: must be a non-empty string',
    });
  }

  if (targetType !== 'user' && targetType !== 'person') {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: `Invalid target_type: must be 'user' or 'person', got '${targetType}'`,
    });
  }

  const targetLabel = targetType === 'person' ? 'Person' : 'User';

  const cypher = `
    MATCH (user:User {id: $userId}), (target:${targetLabel} {id: $targetId})
    MERGE (user)-[rel:FOLLOWS]->(target)
    SET rel.created_at = $timestamp,
        rel.last_updated = timestamp()
    WITH user, target
    SET user.total_engagement_score = coalesce(user.total_engagement_score, 0) + $followPoints,
        target.follower_count = coalesce(target.follower_count, 0) + 1
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId,
        targetId,
        timestamp,
        followPoints: ENGAGEMENT_CONFIG.FOLLOW_POINTS,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced follow relationship', { userId, targetId, targetType });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncFollowRelationship',
      userId,
      targetId,
      targetType,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync follow relationship for user ${userId}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// CIVIC SCORE SYNCHRONIZATION - Reputation Metrics
// ============================================================================

/**
 * Synchronize civic score from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param score - Civic score to sync
 *
 * @throws {GraphError} If sync fails after retries
 */
export async function syncCivicScore(
  driver: Driver,
  score: CivicScore
): Promise<void> {
  validateUserId(score.user_id);

  const cypher = `
    MATCH (user:User {id: $userId})
    SET user.total_engagement_score = $totalScore,
        user.votes_cast = $votesCast,
        user.comments_made = $commentsMade,
        user.bookmarks_created = $bookmarksCreated,
        user.achievements_earned = $achievementsEarned,
        user.civic_score_updated_at = $updatedAt
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId: score.user_id,
        totalScore: score.total_engagement_score,
        votesCast: score.votes_cast,
        commentsMade: score.comments_made,
        bookmarksCreated: score.bookmarks_created,
        achievementsEarned: score.achievements_earned,
        updatedAt: score.updated_at,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced civic score', { userId: score.user_id });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncCivicScore',
      userId: score.user_id,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync civic score for user ${score.user_id}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// ACHIEVEMENT SYNCHRONIZATION - Milestone Tracking
// ============================================================================

/**
 * Synchronize an achievement from PostgreSQL to Neo4j.
 *
 * @param driver - Neo4j driver instance
 * @param achievement - Achievement to sync
 *
 * @throws {GraphError} If sync fails after retries
 */
export async function syncAchievement(
  driver: Driver,
  achievement: Achievement
): Promise<void> {
  validateUserId(achievement.user_id);

  if (!achievement.id || !achievement.achievement_type) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Achievement must have id and achievement_type',
    });
  }

  const cypher = `
    MATCH (user:User {id: $userId})
    MERGE (ach:Achievement {id: $achievementId})
    SET ach.type = $type,
        ach.points = $points,
        ach.earned_at = $earnedAt
    MERGE (user)-[:EARNED_ACHIEVEMENT]->(ach)
    WITH user
    SET user.total_engagement_score = coalesce(user.total_engagement_score, 0) + $points
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        userId: achievement.user_id,
        achievementId: achievement.id,
        type: achievement.achievement_type,
        points: achievement.points,
        earnedAt: achievement.earned_at,
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced achievement', {
      achievementId: achievement.id,
      userId: achievement.user_id,
    });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncAchievement',
      achievementId: achievement.id,
      userId: achievement.user_id,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync achievement ${achievement.id}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// ENGAGEMENT COMMUNITY DETECTION
// ============================================================================

/**
 * Create engagement community clusters for a bill.
 * Groups users who voted similarly.
 *
 * @param driver - Neo4j driver instance
 * @param billId - UUID of the bill
 *
 * @throws {GraphError} If operation fails
 */
export async function createEngagementCommunity(
  driver: Driver,
  billId: string
): Promise<void> {
  validateBillId(billId);

  try {
    await withWriteSession(driver, async (session) => {
      // Find voting clusters - users voting same way on same bills
      await session.run(
        `
        MATCH (user1:User)-[v1:VOTED_ON]->(bill:Bill {id: $billId})
        MATCH (user2:User)-[v2:VOTED_ON]->(bill:Bill {id: $billId})
        WHERE user1.id < user2.id
          AND v1.vote_type = v2.vote_type
        MERGE (user1)-[rel:IN_COHORT]->(user2)
        SET rel.shared_votes = coalesce(rel.shared_votes, 0) + 1,
            rel.last_updated = timestamp()
        `,
        { billId }
      );

      // Create sentiment cluster node
      await session.run(
        `
        MATCH (bill:Bill {id: $billId})<-[v:VOTED_ON]-(user:User)
        WITH bill, v.vote_type as vote_type, count(user) as count,
             avg(user.total_engagement_score) as avg_engagement
        MERGE (cluster:SentimentCluster {id: $billId + '_' + vote_type})
        SET cluster.bill_id = $billId,
            cluster.vote_type = vote_type,
            cluster.member_count = count,
            cluster.avg_engagement = avg_engagement,
            cluster.last_updated = timestamp()
        MERGE (bill)-[:ENGAGING_COHORT]->(cluster)
        `,
        { billId }
      );
    });

    logger.info('Created engagement community', { billId });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'createEngagementCommunity',
      billId,
    });

    throw new GraphError({
      code: GraphErrorCode.OPERATION_FAILED,
      message: `Failed to create engagement community for bill ${billId}`,
      cause: error as Error,
    });
  }
}

// ============================================================================
// BATCH ENGAGEMENT SYNCHRONIZATION
// ============================================================================

/**
 * Synchronize multiple engagement events in batch.
 *
 * @param driver - Neo4j driver instance
 * @param events - Array of engagement events to sync
 * @returns Statistics about the batch sync
 */
export async function batchSyncEngagementEvents(
  driver: Driver,
  events: EngagementEvent[]
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  logger.info('Starting batch engagement sync', { eventCount: events.length });

  for (const event of events) {
    try {
      switch (event.event_type) {
        case 'vote': {
          const { vote_type } = event.metadata as { vote_type: string };
          validateVoteType(vote_type);
          await syncVoteRelationship(
            driver,
            event.user_id,
            event.entity_id,
            vote_type,
            event.created_at
          );
          synced++;
          break;
        }
        case 'comment': {
          const { text } = event.metadata as { text: string };
          await syncCommentEvent(driver, {
            id: event.id,
            user_id: event.user_id,
            bill_id: event.entity_id,
            text,
            created_at: event.created_at,
          });
          synced++;
          break;
        }
        case 'bookmark': {
          await syncBookmarkRelationship(
            driver,
            event.user_id,
            event.entity_id,
            event.created_at
          );
          synced++;
          break;
        }
        case 'follow': {
          const { target_type } = event.metadata as { target_type: string };
          if (target_type !== 'user' && target_type !== 'person') {
            throw new Error(`Invalid target_type: ${target_type}`);
          }
          await syncFollowRelationship(
            driver,
            event.user_id,
            event.entity_id,
            target_type,
            event.created_at
          );
          synced++;
          break;
        }
        default:
          logger.warn('Unknown event type', { eventType: event.event_type, eventId: event.id });
      }
    } catch (error) {
      failed++;
      const errorMsg = `Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logger.error('Failed to sync event', {
        eventId: event.id,
        eventType: event.event_type,
        error: errorMsg,
      });
    }
  }

  logger.info('Batch engagement sync completed', { synced, failed, total: events.length });

  return { synced, failed, errors };
}

// ============================================================================
// ENGAGEMENT PATTERN ANALYSIS
// ============================================================================

/**
 * Get engagement statistics for a user.
 *
 * @param driver - Neo4j driver instance
 * @param userId - UUID of the user
 * @returns Engagement statistics
 */
export async function getEngagementStats(
  driver: Driver,
  userId: string
): Promise<{
  total_votes: number;
  total_comments: number;
  total_bookmarks: number;
  followers: number;
  following: number;
  engagement_score: number;
}> {
  validateUserId(userId);

  try {
    return await withReadSession(driver, async (session) => {
      const result = await session.run(
        `
        MATCH (user:User {id: $userId})
        OPTIONAL MATCH (user)-[v:VOTED_ON]->(:Bill)
        WITH user, count(v) as votes
        OPTIONAL MATCH (user)-[:AUTHORED]->(:Comment)
        WITH user, votes, count(*) as comments
        OPTIONAL MATCH (user)-[b:BOOKMARKED]->(:Bill)
        WITH user, votes, comments, count(b) as bookmarks
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(user)
        WITH user, votes, comments, bookmarks, count(follower) as followers
        OPTIONAL MATCH (user)-[:FOLLOWS]->(following)
        WITH user, votes, comments, bookmarks, followers, count(following) as following
        RETURN votes, comments, bookmarks, followers, following,
               coalesce(user.total_engagement_score, 0) as engagement_score
        `,
        { userId }
      );

      if (result.records.length === 0) {
        return {
          total_votes: 0,
          total_comments: 0,
          total_bookmarks: 0,
          followers: 0,
          following: 0,
          engagement_score: 0,
        };
      }

      const record = result.records[0];
      return {
        total_votes: Number(record.get('votes')) || 0,
        total_comments: Number(record.get('comments')) || 0,
        total_bookmarks: Number(record.get('bookmarks')) || 0,
        followers: Number(record.get('followers')) || 0,
        following: Number(record.get('following')) || 0,
        engagement_score: Number(record.get('engagement_score')) || 0,
      };
    });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'getEngagementStats',
      userId,
    });

    throw new GraphError({
      code: GraphErrorCode.QUERY_FAILED,
      message: `Failed to get engagement stats for user ${userId}`,
      cause: error as Error,
    });
  }
}

/**
 * Check if an engagement event is a duplicate.
 *
 * @param driver - Neo4j driver instance
 * @param eventType - Type of engagement event
 * @param userId - UUID of the user
 * @param entityId - UUID of the entity
 * @param createdAt - Timestamp of the event
 * @returns True if duplicate exists
 */
export async function isEngagementDuplicate(
  driver: Driver,
  eventType: string,
  userId: string,
  entityId: string,
  createdAt: Date
): Promise<boolean> {
  validateUserId(userId);

  try {
    return await withReadSession(driver, async (session) => {
      let result;

      if (eventType === 'vote') {
        result = await session.run(
          `
          MATCH (user:User {id: $userId})-[rel:VOTED_ON]->(bill:Bill {id: $entityId})
          WHERE rel.created_at = $createdAt
          RETURN count(rel) > 0 as exists
          `,
          { userId, entityId, createdAt }
        );
      } else if (eventType === 'bookmark') {
        result = await session.run(
          `
          MATCH (user:User {id: $userId})-[rel:BOOKMARKED]->(bill:Bill {id: $entityId})
          WHERE rel.created_at = $createdAt
          RETURN count(rel) > 0 as exists
          `,
          { userId, entityId, createdAt }
        );
      } else {
        return false;
      }

      return result.records[0]?.get('exists') || false;
    });
  } catch (error) {
    logger.error('Failed to check duplicate engagement', {
      eventType,
      userId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - return false to allow sync to proceed
    return false;
  }
}
