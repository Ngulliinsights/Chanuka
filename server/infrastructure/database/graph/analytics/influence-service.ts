/**
 * Influence Service (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, added pagination, error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, PaginationOptions } from '../utils/query-builder';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

export async function calculateInfluenceScore(driver: Driver, personId: string): Promise<number> {
  if (!personId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'personId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p:Person {id: $personId})
       OPTIONAL MATCH (p)-[:SPONSORED_BY]->(b:Bill)
       WITH p, count(b) as bills
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(c:Committee)
       WITH p, bills, count(c) as committees
       OPTIONAL MATCH (p)-[:HAS_FINANCIAL_INTEREST]->(o:Organization)
       WITH p, bills, committees, count(o) as interests
       RETURN bills * 10 + committees * 5 + interests * 3 as influence_score`,
      { personId },
      { mode: 'READ' }
    );
    return Number(result.records[0]?.get('influence_score')) || 0;
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'calculateInfluenceScore', personId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Influence calculation failed', cause: error as Error });
  }
}

export async function getInfluencers(driver: Driver, options: PaginationOptions = {}): Promise<unknown[]> {
  const baseQuery = `
    MATCH (p:Person)
    WITH p, size((p)--()) as connections
    WHERE connections > 5
    RETURN p.id as id, p.name as name, connections
    ORDER BY connections DESC
  `;
  
  const { query, params } = withPagination(baseQuery, options);
  
  try {
    const result = await executeCypherSafely(driver, query, params, { mode: 'READ' });
    return result.records.map(r => ({ id: r.get('id'), name: r.get('name'), connections: r.get('connections') }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getInfluencers' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get influencers', cause: error as Error });
  }
}
