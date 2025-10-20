/**
 * Loading-specific error types
 * Following navigation component patterns for error handling
 */

export enum LoadingErrorType {
  LOADING_ERROR = 'LOADING_ERROR',
  LOADING_TIMEOUT = 'LOADING_TIMEOUT',
  LOADING_VALIDATION_ERROR = 'LOADING_VALIDATION_ERROR',
  LOADING_CONFIGURATION_ERROR = 'LOADING_CONFIGURATION_ERROR',
  LOADING_OPERATION_FAILED = 'LOADING_OPERATION_FAILED',
  LOADING_NETWORK_ERROR = 'LOADING_NETWORK_ERROR',
  LOADING_ASSET_ERROR = 'LOADING_ASSET_ERROR',
  LOADING_STAGE_ERROR = 'LOADING_STAGE_ERROR'
}

export class LoadingError extends Error {
  public readonly type: LoadingErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: LoadingErrorType = LoadingErrorType.LOADING_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LoadingError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LoadingError);
    }
  }
}

export class LoadingTimeoutError extends LoadingError {
  constructor(operationId: string, timeout: number, details?: Record<string, any>) {
    super(
      `Loading operation timed out after ${timeout}ms: ${operationId}`,
      LoadingErrorType.LOADING_TIMEOUT,
      408,
      { operationId, timeout, ...details }
    );
  }
}

export class LoadingValidationError extends LoadingError {
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      LoadingErrorType.LOADING_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class LoadingConfigurationError extends LoadingError {
  constructor(message: string, configKey?: string, details?: Record<string, any>) {
    super(
      message,
      LoadingErrorType.LOADING_CONFIGURATION_ERROR,
      500,
      { configKey, ...details }
    );
  }
}

export class LoadingOperationFailedError extends LoadingError {
  constructor(
    operationId: string,
    reason: string,
    retryCount: number,
    details?: Record<string, any>
  ) {
    super(
      `Loading operation failed: ${operationId} - ${reason} (retry ${retryCount})`,
      LoadingErrorType.LOADING_OPERATION_FAILED,
      500,
      { operationId, reason, retryCount, ...details }
    );
  }
}

export class LoadingNetworkError extends LoadingError {
  constructor(
    message: string,
    connectionType?: string,
    isOnline?: boolean,
    details?: Record<string, any>
  ) {
    super(
      `Network error during loading: ${message}`,
      LoadingErrorType.LOADING_NETWORK_ERROR,
      503,
      { connectionType, isOnline, ...details }
    );
  }
}

export class LoadingAssetError extends LoadingError {
  constructor(
    assetPath: string,
    reason: string,
    details?: Record<string, any>
  ) {
    super(
      `Failed to load asset: ${assetPath} - ${reason}`,
      LoadingErrorType.LOADING_ASSET_ERROR,
      404,
      { assetPath, reason, ...details }
    );
  }
}

export class LoadingStageError extends LoadingError {
  constructor(
    stageId: string,
    stageName: string,
    reason: string,
    details?: Record<string, any>
  ) {
    super(
      `Loading stage failed: ${stageName} (${stageId}) - ${reason}`,
      LoadingErrorType.LOADING_STAGE_ERROR,
      500,
      { stageId, stageName, reason, ...details }
    );
  }
}

/**
 * Error utility functions
 */

export function isLoadingError(error: unknown): error is LoadingError {
  return error instanceof LoadingError;
}

export function isTimeoutError(error: unknown): error is LoadingTimeoutError {
  return error instanceof LoadingTimeoutError;
}

export function isValidationError(error: unknown): error is LoadingValidationError {
  return error instanceof LoadingValidationError;
}

export function isNetworkError(error: unknown): error is LoadingNetworkError {
  return error instanceof LoadingNetworkError;
}

export function isAssetError(error: unknown): error is LoadingAssetError {
  return error instanceof LoadingAssetError;
}

export function isStageError(error: unknown): error is LoadingStageError {
  return error instanceof LoadingStageError;
}

/**
 * Error classification helpers
 */

export function isRetryableError(error: LoadingError): boolean {
  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
    case LoadingErrorType.LOADING_NETWORK_ERROR:
    case LoadingErrorType.LOADING_ASSET_ERROR:
      return true;
    case LoadingErrorType.LOADING_VALIDATION_ERROR:
    case LoadingErrorType.LOADING_CONFIGURATION_ERROR:
      return false;
    case LoadingErrorType.LOADING_OPERATION_FAILED:
    case LoadingErrorType.LOADING_STAGE_ERROR:
      // Check if retry count hasn't exceeded limits
      return (error.details?.retryCount || 0) < (error.details?.maxRetries || 3);
    default:
      return false;
  }
}

export function getErrorSeverity(error: LoadingError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case LoadingErrorType.LOADING_VALIDATION_ERROR:
      return 'medium';
    case LoadingErrorType.LOADING_CONFIGURATION_ERROR:
      return 'high';
    case LoadingErrorType.LOADING_TIMEOUT:
    case LoadingErrorType.LOADING_NETWORK_ERROR:
      return 'medium';
    case LoadingErrorType.LOADING_OPERATION_FAILED:
      return 'high';
    case LoadingErrorType.LOADING_ASSET_ERROR:
      return 'low';
    case LoadingErrorType.LOADING_STAGE_ERROR:
      return 'medium';
    default:
      return 'medium';
  }
}

export function getErrorRecoveryStrategy(error: LoadingError): string[] {
  const strategies: string[] = [];

  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
      strategies.push('Increase timeout duration');
      strategies.push('Check network connection');
      strategies.push('Retry the operation');
      break;
    
    case LoadingErrorType.LOADING_NETWORK_ERROR:
      strategies.push('Check internet connection');
      strategies.push('Try again when connection is stable');
      strategies.push('Switch to offline mode if available');
      break;
    
    case LoadingErrorType.LOADING_ASSET_ERROR:
      strategies.push('Verify asset path is correct');
      strategies.push('Check if asset exists on server');
      strategies.push('Use fallback asset if available');
      break;
    
    case LoadingErrorType.LOADING_VALIDATION_ERROR:
      strategies.push('Check input parameters');
      strategies.push('Ensure data format is correct');
      strategies.push('Review validation requirements');
      break;
    
    case LoadingErrorType.LOADING_CONFIGURATION_ERROR:
      strategies.push('Review loading configuration');
      strategies.push('Check environment settings');
      strategies.push('Verify required dependencies');
      break;
    
    case LoadingErrorType.LOADING_OPERATION_FAILED:
      strategies.push('Retry the operation');
      strategies.push('Check operation parameters');
      strategies.push('Review error details for specific issues');
      break;
    
    case LoadingErrorType.LOADING_STAGE_ERROR:
      strategies.push('Skip to next stage if possible');
      strategies.push('Retry current stage');
      strategies.push('Check stage dependencies');
      break;
    
    default:
      strategies.push('Retry the operation');
      strategies.push('Check console for detailed error information');
      strategies.push('Contact support if issue persists');
      break;
  }

  return strategies;
}

/**
 * Error formatting utilities
 */

export function formatErrorMessage(error: LoadingError): string {
  const baseMessage = error.message;
  const details = error.details;
  
  if (!details || Object.keys(details).length === 0) {
    return baseMessage;
  }
  
  const relevantDetails = Object.entries(details)
    .filter(([key, value]) => 
      key !== 'zodError' && 
      value !== undefined && 
      value !== null
    )
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  
  return relevantDetails ? `${baseMessage} (${relevantDetails})` : baseMessage;
}

export function getErrorDisplayMessage(error: LoadingError): string {
  switch (error.type) {
    case LoadingErrorType.LOADING_TIMEOUT:
      return 'The operation is taking longer than expected. Please try again.';
    
    case LoadingErrorType.LOADING_NETWORK_ERROR:
      return 'Network connection issue. Please check your internet connection.';
    
    case LoadingErrorType.LOADING_ASSET_ERROR:
      return 'Failed to load required resources. Please refresh the page.';
    
    case LoadingErrorType.LOADING_VALIDATION_ERROR:
      return 'Invalid data provided. Please check your input.';
    
    case LoadingErrorType.LOADING_CONFIGURATION_ERROR:
      return 'Configuration error. Please contact support.';
    
    case LoadingErrorType.LOADING_OPERATION_FAILED:
      return 'Operation failed. Please try again.';
    
    case LoadingErrorType.LOADING_STAGE_ERROR:
      return 'Loading stage failed. Attempting to continue...';
    
    default:
      return 'An error occurred during loading. Please try again.';
  }
}