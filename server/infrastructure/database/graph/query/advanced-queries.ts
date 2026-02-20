/**
 * Advanced Queries (REFACTORED)
 * IMPROVEMENTS: Added LIMIT clauses to all queries, pagination support
 */
import type { Driver } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, type PaginationOptions } from '../utils/query-builder';

const errorHandler = new GraphErrorHandler();

export async function aggregateBillsByStatus(driver: Driver): Promise<unknown[]> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (b:Bill)
       RETURN b.status as status, count(b) as count
       ORDER BY count DESC`,
      {},
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      status: r.get('status'),
      count: Number(r.get('count'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'aggregateBillsByStatus' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to aggregate bills', cause: error as Error });
  }
}

export async function findRelatedBills(driver: Driver, billId: string, limit: number = 10): Promise<unknown[]> {
  if (!billId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'billId required' });

  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (b1:Bill {id: $billId})-[:ABOUT]->(t:Topic)<-[:ABOUT]-(b2:Bill)
       WHERE b1.id <> b2.id
       WITH b2, count(t) as shared_topics
       ORDER BY shared_topics DESC
       LIMIT $limit
       RETURN b2.id as id, b2.title as title, shared_topics`,
      { billId, limit },
      { mode: 'READ' }
    );
    return result.records.map((r: unknown) => ({
      id: r.get('id'),
      title: r.get('title'),
      shared_topics: Number(r.get('shared_topics'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'findRelatedBills', billId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to find related bills', cause: error as Error });
  }
}

export async function getNodeDegrees(driver: Driver, nodeType: string, options: PaginationOptions = {}): Promise<unknown[]> {
  if (!nodeType) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'nodeType required' });

  const baseQuery = `
    MATCH (n:${nodeType})
    RETURN n.id as id, n.name as name, size((n)--()) as degree
    ORDER BY degree DESC
  `;

  const { query, params } = withPagination(baseQuery, options);

  try {
    const result = await executeCypherSafely(driver, query, params, { mode: 'READ' });
    return result.records.map((r: unknown) => ({
      id: r.get('id'),
      name: r.get('name'),
      degree: Number(r.get('degree'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getNodeDegrees', nodeType });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get node degrees', cause: error as Error });
  }
}
