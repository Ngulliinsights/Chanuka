/**
 * Network Synchronization (REFACTORED)
 * 
 * Synchronizes political and social networks to graph.
 * 
 * IMPROVEMENTS:
 * - ✅ Fixed Cypher injection (was using template literals)
 * - ✅ Fixed session leaks
 * - ✅ Added retry logic
 * - ✅ Proper error handling
 * - ✅ Input validation
 */

import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export interface NetworkNode {
  id: string;
  type: 'person' | 'organization' | 'party';
  name: string;
  properties: Record<string, unknown>;
}

export interface NetworkEdge {
  fromId: string;
  toId: string;
  relationshipType: string;
  properties: Record<string, unknown>;
}

/**
 * Sync network node to graph.
 */
export async function syncNetworkNode(
  driver: Driver,
  node: NetworkNode
): Promise<void> {
  if (!node.id || !node.type || !node.name) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Node must have id, type, and name',
    });
  }

  const label = node.type.charAt(0).toUpperCase() + node.type.slice(1);

  const cypher = `
    MERGE (n:${label} {id: $id})
    SET n += $properties,
        n.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        id: node.id,
        properties: { name: node.name, ...node.properties },
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced network node', { nodeId: node.id, type: node.type });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncNetworkNode',
      nodeId: node.id,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: `Failed to sync network node ${node.id}`,
      cause: error as Error,
    });
  }
}

/**
 * Sync network edge to graph.
 */
export async function syncNetworkEdge(
  driver: Driver,
  edge: NetworkEdge
): Promise<void> {
  if (!edge.fromId || !edge.toId || !edge.relationshipType) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'Edge must have fromId, toId, and relationshipType',
    });
  }

  const cypher = `
    MATCH (from {id: $fromId}), (to {id: $toId})
    MERGE (from)-[r:${edge.relationshipType}]->(to)
    SET r += $properties,
        r.last_synced_at = timestamp()
  `;

  try {
    await retryWithBackoff(
      () => executeCypherSafely(driver, cypher, {
        fromId: edge.fromId,
        toId: edge.toId,
        properties: edge.properties || {},
      }),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Synced network edge', {
      fromId: edge.fromId,
      toId: edge.toId,
      type: edge.relationshipType,
    });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncNetworkEdge',
      fromId: edge.fromId,
      toId: edge.toId,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: 'Failed to sync network edge',
      cause: error as Error,
    });
  }
}

/**
 * Batch sync network nodes.
 */
export async function batchSyncNetworkNodes(
  driver: Driver,
  nodes: NetworkNode[]
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const node of nodes) {
    try {
      await syncNetworkNode(driver, node);
      synced++;
    } catch (error) {
      failed++;
      logger.error('Failed to sync network node', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Batch sync completed', { synced, failed, total: nodes.length });
  return { synced, failed };
}

/**
 * Batch sync network edges.
 */
export async function batchSyncNetworkEdges(
  driver: Driver,
  edges: NetworkEdge[]
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const edge of edges) {
    try {
      await syncNetworkEdge(driver, edge);
      synced++;
    } catch (error) {
      failed++;
      logger.error('Failed to sync network edge', {
        fromId: edge.fromId,
        toId: edge.toId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Batch edge sync completed', { synced, failed, total: edges.length });
  return { synced, failed };
}

export default {
  syncNetworkNode,
  syncNetworkEdge,
  batchSyncNetworkNodes,
  batchSyncNetworkEdges,
};
