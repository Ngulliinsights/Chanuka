/**
 * Idempotency Ledger (REFACTORED)
 * 
 * Prevents duplicate operations and ensures idempotent sync.
 * 
 * IMPROVEMENTS:
 * - ✅ Fixed session leaks
 * - ✅ Added retry logic
 * - ✅ Proper error handling
 * - ✅ Logging integration
 * - ✅ Type safety
 */

import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export interface OperationRecord {
  operation_id: string;
  operation_type: string;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
  retry_count: number;
}

/**
 * Check if operation has already been executed.
 */
export async function isOperationExecuted(
  driver: Driver,
  operationId: string
): Promise<boolean> {
  if (!operationId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'operation_id is required',
    });
  }

  try {
    const result = await executeCypherSafely(
      driver,
      `
      MATCH (op:OperationLedger {operation_id: $operationId})
      WHERE op.status = 'completed'
      RETURN count(op) > 0 as executed
      `,
      { operationId },
      { mode: 'READ' }
    );

    return result.records[0]?.get('executed') || false;
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'isOperationExecuted',
      operationId,
    });

    // On error, assume not executed to allow retry
    return false;
  }
}

/**
 * Record operation start.
 */
export async function recordOperationStart(
  driver: Driver,
  operationId: string,
  operationType: string,
  entityType: string,
  entityId: string
): Promise<void> {
  if (!operationId || !operationType || !entityType || !entityId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'All operation parameters are required',
    });
  }

  try {
    await retryWithBackoff(
      () => executeCypherSafely(
        driver,
        `
        MERGE (op:OperationLedger {operation_id: $operationId})
        ON CREATE SET 
          op.operation_type = $operationType,
          op.entity_type = $entityType,
          op.entity_id = $entityId,
          op.status = 'pending',
          op.created_at = timestamp(),
          op.retry_count = 0
        ON MATCH SET
          op.retry_count = op.retry_count + 1,
          op.status = 'pending'
        `,
        { operationId, operationType, entityType, entityId }
      ),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Recorded operation start', { operationId, operationType });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'recordOperationStart',
      operationId,
    });

    throw new GraphError({
      code: GraphErrorCode.OPERATION_FAILED,
      message: 'Failed to record operation start',
      cause: error as Error,
    });
  }
}

/**
 * Record operation completion.
 */
export async function recordOperationComplete(
  driver: Driver,
  operationId: string
): Promise<void> {
  if (!operationId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'operation_id is required',
    });
  }

  try {
    await retryWithBackoff(
      () => executeCypherSafely(
        driver,
        `
        MATCH (op:OperationLedger {operation_id: $operationId})
        SET op.status = 'completed',
            op.completed_at = timestamp()
        `,
        { operationId }
      ),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Recorded operation complete', { operationId });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'recordOperationComplete',
      operationId,
    });

    throw new GraphError({
      code: GraphErrorCode.OPERATION_FAILED,
      message: 'Failed to record operation completion',
      cause: error as Error,
    });
  }
}

/**
 * Record operation failure.
 */
export async function recordOperationFailure(
  driver: Driver,
  operationId: string,
  errorMessage: string
): Promise<void> {
  if (!operationId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'operation_id is required',
    });
  }

  try {
    await retryWithBackoff(
      () => executeCypherSafely(
        driver,
        `
        MATCH (op:OperationLedger {operation_id: $operationId})
        SET op.status = 'failed',
            op.error_message = $errorMessage,
            op.failed_at = timestamp()
        `,
        { operationId, errorMessage }
      ),
      RETRY_PRESETS.DATABASE_OPERATION
    );

    logger.debug('Recorded operation failure', { operationId, errorMessage });
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'recordOperationFailure',
      operationId,
    });

    // Don't throw - failure to record failure shouldn't break the flow
  }
}

/**
 * Execute operation with idempotency check.
 */
export async function executeIdempotent<T>(
  driver: Driver,
  operationId: string,
  operationType: string,
  entityType: string,
  entityId: string,
  operation: () => Promise<T>
): Promise<T> {
  // Check if already executed
  const alreadyExecuted = await isOperationExecuted(driver, operationId);
  
  if (alreadyExecuted) {
    logger.info('Operation already executed, skipping', { operationId });
    return null as T; // Return null for idempotent operations
  }

  // Record operation start
  await recordOperationStart(driver, operationId, operationType, entityType, entityId);

  try {
    // Execute operation
    const result = await operation();

    // Record completion
    await recordOperationComplete(driver, operationId);

    return result;
  } catch (error) {
    // Record failure
    await recordOperationFailure(
      driver,
      operationId,
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
}

/**
 * Get operation status.
 */
export async function getOperationStatus(
  driver: Driver,
  operationId: string
): Promise<OperationRecord | null> {
  if (!operationId) {
    throw new GraphError({
      code: GraphErrorCode.INVALID_INPUT,
      message: 'operation_id is required',
    });
  }

  try {
    const result = await executeCypherSafely(
      driver,
      `
      MATCH (op:OperationLedger {operation_id: $operationId})
      RETURN op
      `,
      { operationId },
      { mode: 'READ' }
    );

    if (result.records.length === 0) {
      return null;
    }

    const op = result.records[0].get('op').properties;
    return {
      operation_id: op.operation_id,
      operation_type: op.operation_type,
      entity_type: op.entity_type,
      entity_id: op.entity_id,
      status: op.status,
      created_at: new Date(op.created_at),
      completed_at: op.completed_at ? new Date(op.completed_at) : undefined,
      error_message: op.error_message,
      retry_count: Number(op.retry_count) || 0,
    };
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'getOperationStatus',
      operationId,
    });

    return null;
  }
}

/**
 * Clean up old operation records.
 */
export async function cleanupOldOperations(
  driver: Driver,
  daysToKeep: number = 30
): Promise<number> {
  try {
    const result = await executeCypherSafely(
      driver,
      `
      MATCH (op:OperationLedger)
      WHERE op.created_at < timestamp() - duration({days: $daysToKeep})
        AND op.status = 'completed'
      WITH op
      LIMIT 1000
      DETACH DELETE op
      RETURN count(op) as deleted
      `,
      { daysToKeep }
    );

    const deleted = Number(result.records[0]?.get('deleted')) || 0;
    logger.info('Cleaned up old operations', { deleted, daysToKeep });
    return deleted;
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'cleanupOldOperations',
      daysToKeep,
    });

    return 0;
  }
}

export default {
  isOperationExecuted,
  recordOperationStart,
  recordOperationComplete,
  recordOperationFailure,
  executeIdempotent,
  getOperationStatus,
  cleanupOldOperations,
};
