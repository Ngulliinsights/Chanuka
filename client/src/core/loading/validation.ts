/**
 * Loading System Validation
 * Validates loading operations and configurations
 */

import { LoadingOperation, LoadingScenario, ProgressiveStage, LoadingError } from '@client/types';

export class LoadingValidationError extends LoadingError {
  constructor(message: string, public field?: string, metadata?: Record<string, any>) {
    super('validation', message, 'VALIDATION_ERROR', { field, ...metadata });
    this.name = 'LoadingValidationError';
  }
}

/**
 * Validate loading operation
 */
export function validateLoadingOperation(operation: LoadingOperation): void {
  if (!operation.id || typeof operation.id !== 'string') {
    throw new LoadingValidationError('Operation ID is required and must be a string', 'id');
  }

  if (!operation.type || !['page', 'component', 'api', 'asset', 'progressive', 'form', 'navigation'].includes(operation.type)) {
    throw new LoadingValidationError('Invalid operation type', 'type');
  }

  if (!operation.priority || !['high', 'medium', 'low'].includes(operation.priority)) {
    throw new LoadingValidationError('Invalid priority level', 'priority');
  }

  if (operation.retryCount < 0) {
    throw new LoadingValidationError('Retry count cannot be negative', 'retryCount');
  }

  if (operation.maxRetries < 0) {
    throw new LoadingValidationError('Max retries cannot be negative', 'maxRetries');
  }

  if (operation.timeout && operation.timeout <= 0) {
    throw new LoadingValidationError('Timeout must be positive', 'timeout');
  }

  if (operation.progress !== undefined && (operation.progress < 0 || operation.progress > 100)) {
    throw new LoadingValidationError('Progress must be between 0 and 100', 'progress');
  }
}

/**
 * Safe validation that returns result instead of throwing
 */
export function safeValidateLoadingOperation(operation: LoadingOperation): { success: boolean; error?: LoadingValidationError } {
  try {
    validateLoadingOperation(operation);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof LoadingValidationError ? error : new LoadingValidationError('Unknown validation error')
    };
  }
}

/**
 * Validate loading scenario
 */
export function validateLoadingScenario(scenario: LoadingScenario): void {
  if (!scenario.id || typeof scenario.id !== 'string') {
    throw new LoadingValidationError('Scenario ID is required and must be a string', 'id');
  }

  if (!scenario.name || typeof scenario.name !== 'string') {
    throw new LoadingValidationError('Scenario name is required and must be a string', 'name');
  }

  if (!scenario.priority || !['high', 'medium', 'low'].includes(scenario.priority)) {
    throw new LoadingValidationError('Invalid priority level', 'priority');
  }

  if (scenario.maxRetries < 0) {
    throw new LoadingValidationError('Max retries cannot be negative', 'maxRetries');
  }

  if (scenario.defaultTimeout <= 0) {
    throw new LoadingValidationError('Default timeout must be positive', 'defaultTimeout');
  }

  if (!scenario.retryStrategy || !['exponential', 'linear', 'none'].includes(scenario.retryStrategy)) {
    throw new LoadingValidationError('Invalid retry strategy', 'retryStrategy');
  }

  if (scenario.stages) {
    scenario.stages.forEach((stage, index) => {
      try {
        validateProgressiveStage(stage);
      } catch (error) {
        throw new LoadingValidationError(
          `Invalid stage at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          `stages[${index}]`
        );
      }
    });
  }
}

/**
 * Validate progressive stage
 */
export function validateProgressiveStage(stage: ProgressiveStage): void {
  if (!stage.id || typeof stage.id !== 'string') {
    throw new LoadingValidationError('Stage ID is required and must be a string', 'id');
  }

  if (!stage.message || typeof stage.message !== 'string') {
    throw new LoadingValidationError('Stage message is required and must be a string', 'message');
  }

  if (stage.duration !== undefined && stage.duration <= 0) {
    throw new LoadingValidationError('Stage duration must be positive', 'duration');
  }

  if (stage.progress !== undefined && (stage.progress < 0 || stage.progress > 100)) {
    throw new LoadingValidationError('Stage progress must be between 0 and 100', 'progress');
  }
}

/**
 * Validate loading configuration
 */
export function validateLoadingConfig(config: any): void {
  if (config.timeout !== undefined && config.timeout <= 0) {
    throw new LoadingValidationError('Timeout must be positive', 'timeout');
  }

  if (config.retryLimit !== undefined && config.retryLimit < 0) {
    throw new LoadingValidationError('Retry limit cannot be negative', 'retryLimit');
  }

  if (config.retryDelay !== undefined && config.retryDelay < 0) {
    throw new LoadingValidationError('Retry delay cannot be negative', 'retryDelay');
  }

  if (config.timeoutWarningThreshold !== undefined &&
      (config.timeoutWarningThreshold < 0 || config.timeoutWarningThreshold > 1)) {
    throw new LoadingValidationError('Timeout warning threshold must be between 0 and 1', 'timeoutWarningThreshold');
  }
}

/**
 * Validate operation compatibility with connection
 */
export function validateOperationConnectionCompatibility(
  operation: LoadingOperation,
  connectionType: string,
  isOnline: boolean
): { compatible: boolean; reason?: string } {
  if (!isOnline && operation.priority === 'low') {
    return {
      compatible: false,
      reason: 'Low priority operations are skipped when offline'
    };
  }

  if (connectionType === 'slow' && operation.priority === 'low') {
    return {
      compatible: false,
      reason: 'Low priority operations are skipped on slow connections'
    };
  }

  return { compatible: true };
}