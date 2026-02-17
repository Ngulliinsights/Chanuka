/**
 * Recommendation Engine (REFACTORED)
 * IMPROVEMENTS: Added pagination, error handling, input validation
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from './utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { RECOMMENDATION_CONFIG } from './config/graph-config';

const errorHandler = new GraphErrorHandler();

export async function recommendBills(driver: Driver, userId: string, limit: number = 10): Promise<unknown[]> {
  if (!userId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'userId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (u:User {id: $userId})-[v:VOTED_ON]->(b1:Bill)
       MATCH (b1)-[:ABOUT]->(t:Topic)<-[:ABOUT]-(b2:Bill)
       WHERE NOT exists((u)-[:VOTED_ON]->(b2))
       WITH b2, count(t) as shared_topics
       RETURN b2.id as id, b2.title as title, shared_topics as score
       ORDER BY score DESC
       LIMIT $limit`,
      { userId, limit },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      score: Number(r.get('score'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'recommendBills', userId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get recommendations', cause: error as Error });
  }
}

export async function recommendUsers(driver: Driver, userId: string, limit: number = 10): Promise<unknown[]> {
  if (!userId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'userId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (u1:User {id: $userId})-[v1:VOTED_ON]->(b:Bill)<-[v2:VOTED_ON]-(u2:User)
       WHERE u1.id <> u2.id AND v1.vote_type = v2.vote_type
       WITH u2, count(b) as shared_interests
       RETURN u2.id as id, u2.email as email, shared_interests as score
       ORDER BY score DESC
       LIMIT $limit`,
      { userId, limit },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      id: r.get('id'),
      email: r.get('email'),
      score: Number(r.get('score'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'recommendUsers', userId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to recommend users', cause: error as Error });
  }
}
