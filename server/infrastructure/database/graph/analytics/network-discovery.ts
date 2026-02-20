/**
 * Network Discovery (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, session leaks, added error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely, withReadSession } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export async function discoverInfluenceNetwork(driver: Driver, personId: string, maxDepth: number = 2): Promise<unknown[]> {
  if (!personId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'personId required' });
  
  try {
    return await withReadSession(driver, async (session) => {
      const result = await session.run(
        `MATCH path = (p:Person {id: $personId})-[*1..$maxDepth]-(connected)
         RETURN path LIMIT 100`,
        { personId, maxDepth }
      );
      return result.records.map(r => r.get('path'));
    });
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'discoverInfluenceNetwork', personId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Network discovery failed', cause: error as Error });
  }
}

export async function findCommunities(driver: Driver, threshold: number = 0.7): Promise<unknown[]> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p1:Person)-[v1:VOTED]->(b:Bill)<-[v2:VOTED]-(p2:Person)
       WHERE p1.id < p2.id AND v1.position = v2.position
       WITH p1, p2, count(b) as shared_votes
       WHERE shared_votes > $threshold * 10
       RETURN p1.id as person1, p2.id as person2, shared_votes`,
      { threshold },
      { mode: 'READ' }
    );
    return result.records.map(r => ({ person1: r.get('person1'), person2: r.get('person2'), votes: r.get('shared_votes') }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'findCommunities' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Community detection failed', cause: error as Error });
  }
}
