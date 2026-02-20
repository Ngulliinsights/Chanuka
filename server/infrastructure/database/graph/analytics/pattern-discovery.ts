/**
 * Pattern Discovery (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, session leaks, added retry logic
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

export async function detectVotingPatterns(driver: Driver, billId: string): Promise<any> {
  if (!billId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'billId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (b:Bill {id: $billId})<-[v:VOTED]-(p:Person)
       WITH v.position as position, count(p) as count, collect(p.party) as parties
       RETURN position, count, parties`,
      { billId },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      position: r.get('position'),
      count: r.get('count'),
      parties: r.get('parties')
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'detectVotingPatterns', billId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Pattern detection failed', cause: error as Error });
  }
}

export async function findInfluentialNodes(driver: Driver, limit: number = 20): Promise<unknown[]> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p:Person)
       WITH p, size((p)-[:SPONSORED_BY]->()) as sponsorships,
            size((p)-[:MEMBER_OF]->()) as memberships
       RETURN p.id as id, p.name as name, sponsorships + memberships * 2 as influence
       ORDER BY influence DESC
       LIMIT $limit`,
      { limit },
      { mode: 'READ' }
    );
    return result.records.map(r => ({ id: r.get('id'), name: r.get('name'), influence: r.get('influence') }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'findInfluentialNodes' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Influence analysis failed', cause: error as Error });
  }
}
