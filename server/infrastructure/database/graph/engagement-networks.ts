/**
 * Engagement Networks (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, N+1 queries, session leaks
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely, executeBatch } from './utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from './retry-utils';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export async function createEngagementNetwork(driver: Driver, billId: string): Promise<void> {
  if (!billId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'billId required' });
  
  try {
    await retryWithBackoff(
      () => executeCypherSafely(
        driver,
        `MATCH (b:Bill {id: $billId})<-[v:VOTED_ON]-(u:User)
         WITH b, v.vote_type as vote_type, collect(u) as users
         MERGE (cluster:EngagementCluster {id: $billId + '_' + vote_type})
         SET cluster.vote_type = vote_type,
             cluster.bill_id = $billId,
             cluster.member_count = size(users),
             cluster.last_updated = timestamp()`,
        { billId }
      ),
      RETRY_PRESETS.DATABASE_OPERATION
    );
    logger.info('Created engagement network', { billId });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'createEngagementNetwork', billId });
    throw new GraphError({ code: GraphErrorCode.SYNC_FAILED, message: 'Failed to create engagement network', cause: error as Error });
  }
}

export async function findSimilarUsers(driver: Driver, userId: string, limit: number = 10): Promise<any[]> {
  if (!userId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'userId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (u1:User {id: $userId})-[v1:VOTED_ON]->(b:Bill)<-[v2:VOTED_ON]-(u2:User)
       WHERE u1.id <> u2.id AND v1.vote_type = v2.vote_type
       WITH u2, count(b) as shared_votes
       ORDER BY shared_votes DESC
       LIMIT $limit
       RETURN u2.id as user_id, u2.email as email, shared_votes`,
      { userId, limit },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      user_id: r.get('user_id'),
      email: r.get('email'),
      shared_votes: Number(r.get('shared_votes'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'findSimilarUsers', userId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to find similar users', cause: error as Error });
  }
}
