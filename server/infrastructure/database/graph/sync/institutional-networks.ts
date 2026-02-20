/**
 * Institutional Networks (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, added pagination, error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, PaginationOptions } from '../utils/query-builder';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

export async function getCommitteeNetwork(driver: Driver, committeeId: string): Promise<any> {
  if (!committeeId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'committeeId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (c:Committee {id: $committeeId})
       OPTIONAL MATCH (c)<-[:MEMBER_OF]-(p:Person)
       OPTIONAL MATCH (c)<-[:ASSIGNED_TO]-(b:Bill)
       RETURN c.id as committee_id, c.name as name,
              collect(DISTINCT p.id) as members,
              collect(DISTINCT b.id) as bills`,
      { committeeId },
      { mode: 'READ' }
    );
    
    if (result.records.length === 0) return null;
    
    const record = result.records[0];
    return {
      committee_id: record.get('committee_id'),
      name: record.get('name'),
      members: record.get('members'),
      bills: record.get('bills')
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getCommitteeNetwork', committeeId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get committee network', cause: error as Error });
  }
}

export async function getPartyNetwork(driver: Driver, party: string, options: PaginationOptions = {}): Promise<unknown[]> {
  if (!party) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'party required' });
  
  const baseQuery = `
    MATCH (p:Person {party: $party})
    OPTIONAL MATCH (p)-[:SPONSORED_BY]->(b:Bill)
    RETURN p.id as id, p.name as name, count(b) as bills_sponsored
    ORDER BY bills_sponsored DESC
  `;
  
  const { query, params } = withPagination(baseQuery, options);
  
  try {
    const result = await executeCypherSafely(driver, query, { ...params, party }, { mode: 'READ' });
    return result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      bills_sponsored: Number(r.get('bills_sponsored'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getPartyNetwork', party });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get party network', cause: error as Error });
  }
}
