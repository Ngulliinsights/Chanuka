/**
 * Array Field Sync (REFACTORED)
 * IMPROVEMENTS: Batch operations, error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from './utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from './retry-utils';

const errorHandler = new GraphErrorHandler();

export async function syncArrayField(
  driver: Driver,
  nodeId: string,
  fieldName: string,
  values: any[]
): Promise<void> {
  if (!nodeId || !fieldName) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'nodeId and fieldName are required',
    });
  }

  try {
    await retryWithBackoff(
      () => executeCypherSafely(
        driver,
        `MATCH (n {id: $nodeId})
         SET n.$fieldName = $values`,
        { nodeId, values }
      ),
      RETRY_PRESETS.DATABASE_OPERATION
    );
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'syncArrayField',
      nodeId,
      fieldName,
    });

    throw new GraphError({
      code: GraphErrorCode.SYNC_FAILED,
      message: 'Failed to sync array field',
      cause: error as Error,
    });
  }
}

export default { syncArrayField };
