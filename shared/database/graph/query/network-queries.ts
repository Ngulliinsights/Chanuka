/**
 * Network Queries (REFACTORED)
 * IMPROVEMENTS: Added LIMIT clauses, pagination, proper error handling
 */
import type { Driver } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from '../error-adapter-v2';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, type PaginationOptions } from '../utils/query-builder';

const errorHandler = new GraphErrorHandler();

export async function getConnectedNodes(driver: Driver, nodeId: string, options: PaginationOptions = {}): Promise<any[]> {
  if (!nodeId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'nodeId required' });

  const baseQuery = `
    MATCH (n {id: $nodeId})-[r]-(connected)
    RETURN connected.id as id, type(r) as relationship_type,
           labels(connected)[0] as node_type
  `;

  const { query, params } = withPagination(baseQuery, options);

  try {
    const result = await executeCypherSafely(driver, query, { ...params, nodeId }, { mode: 'READ' });
    return result.records.map((r: any) => ({
      id: r.get('id'),
      relationship_type: r.get('relationship_type'),
      node_type: r.get('node_type')
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getConnectedNodes', nodeId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get connected nodes', cause: error as Error });
  }
}

export async function findShortestPath(driver: Driver, fromId: string, toId: string, maxHops: number = 5): Promise<any> {
  if (!fromId || !toId) {
    throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'fromId and toId required' });
  }

  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (from {id: $fromId}), (to {id: $toId})
       MATCH path = shortestPath((from)-[*1..$maxHops]-(to))
       RETURN path, length(path) as pathLength
       LIMIT 1`,
      { fromId, toId, maxHops },
      { mode: 'READ' }
    );

    if (result.records.length === 0) return null;

    return {
      path: result.records[0].get('path'),
      length: Number(result.records[0].get('pathLength'))
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'findShortestPath', fromId, toId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to find path', cause: error as Error });
  }
}
