/**
 * Advanced Analytics (REFACTORED)
 * IMPROVEMENTS: Fixed missing LIMIT clauses, added pagination
 */
import type { Driver } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { withPagination, PaginationOptions } from './utils/query-builder';
import { executeCypherSafely } from './utils/session-manager';

const errorHandler = new GraphErrorHandler();

export async function calculateNetworkDensity(driver: Driver): Promise<number> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (n)
       WITH count(n) as nodeCount
       MATCH ()-[r]->()
       WITH nodeCount, count(r) as relCount
       RETURN toFloat(relCount) / (nodeCount * (nodeCount - 1)) as density`,
      {},
      { mode: 'READ' }
    );
    return Number(result.records[0]?.get('density')) || 0;
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'calculateNetworkDensity' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to calculate density', cause: error as Error });
  }
}

export async function detectCommunities(driver: Driver): Promise<Array<{ id: unknown; community: unknown }>> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p:Person)
       WHERE exists((p)--())
       WITH p
       LIMIT 1000
       RETURN p.id as id, p.party as community
       ORDER BY community`,
      {},
      { mode: 'READ' }
    );
    return result.records.map((r) => ({
      id: r.get('id'),
      community: r.get('community')
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'detectCommunities' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to detect communities', cause: error as Error });
  }
}

export async function getCentralityMetrics(driver: Driver, options: PaginationOptions = {}): Promise<Array<{ id: unknown; name: unknown; degree_centrality: number }>> {
  const baseQuery = `
    MATCH (p:Person)
    WITH p, size((p)--()) as degree
    WHERE degree > 0
    RETURN p.id as id, p.name as name, degree
    ORDER BY degree DESC
  `;

  const { query, params } = withPagination(baseQuery, options);

  try {
    const result = await executeCypherSafely(driver, query, params, { mode: 'READ' });
    return result.records.map((r) => ({
      id: r.get('id'),
      name: r.get('name'),
      degree_centrality: Number(r.get('degree'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getCentralityMetrics' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get centrality metrics', cause: error as Error });
  }
}
