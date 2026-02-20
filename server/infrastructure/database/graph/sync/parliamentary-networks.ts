/**
 * Parliamentary Networks (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, added error handling, pagination
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, PaginationOptions } from '../utils/query-builder';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

export async function getParliamentarySession(driver: Driver, sessionId: string): Promise<any> {
  if (!sessionId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'sessionId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (s:ParliamentarySession {id: $sessionId})
       RETURN s.id as id, s.parliament_number as parliament_number,
              s.session_number as session_number, s.start_date as start_date,
              s.is_active as is_active`,
      { sessionId },
      { mode: 'READ' }
    );
    
    if (result.records.length === 0) return null;
    
    const r = result.records[0];
    return {
      id: r.get('id'),
      parliament_number: r.get('parliament_number'),
      session_number: r.get('session_number'),
      start_date: r.get('start_date'),
      is_active: r.get('is_active')
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getParliamentarySession', sessionId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get session', cause: error as Error });
  }
}

export async function getActiveMPs(driver: Driver, options: PaginationOptions = {}): Promise<unknown[]> {
  const baseQuery = `
    MATCH (p:Person {type: 'mp', is_active: true})
    RETURN p.id as id, p.name as name, p.constituency as constituency,
           p.party as party
    ORDER BY p.name ASC
  `;
  
  const { query, params } = withPagination(baseQuery, options);
  
  try {
    const result = await executeCypherSafely(driver, query, params, { mode: 'READ' });
    return result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      constituency: r.get('constituency'),
      party: r.get('party')
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getActiveMPs' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get active MPs', cause: error as Error });
  }
}
