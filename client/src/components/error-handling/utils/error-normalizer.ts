/**
 * Error Normalization Utility
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import { 
  BaseError, 
  ErrorSeverity,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  TooManyRequestsError
} from '../../../core/error';

export function normalizeError(
  error: any,
  errorType?: string,
  errorSeverity?: ErrorSeverity,
  context?: any
): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  const message = error?.message || String(error || 'Unknown error occurred');
  const originalStack = error?.stack;

  const errorContext = {
    component: 'ErrorFallback',
    errorContext: context,
    originalError: error,
    errorType,
    normalizedAt: new Date().toISOString()
  };

  let normalizedError: BaseError;

  switch (errorType) {
    case 'network':
      normalizedError = new NetworkError(message);
      break;

    case 'chunk':
      normalizedError = new ExternalServiceError(message);
      break;

    case 'timeout':
      normalizedError = new ServiceUnavailableError(message);
      break;

    case 'database':
      normalizedError = new DatabaseError(message);
      break;

    case 'cache':
      normalizedError = new CacheError(message);
      break;

    case 'unauthorized':
      normalizedError = new UnauthorizedError(message);
      break;

    case 'forbidden':
      normalizedError = new ForbiddenError(message);
      break;

    case 'notfound':
      normalizedError = new NotFoundError('Resource not found');
      break;

    case 'validation':
      normalizedError = new ValidationError(message) as BaseError;
      break;

    case 'conflict':
      normalizedError = new ConflictError(message);
      break;

    case 'ratelimit':
      normalizedError = new TooManyRequestsError(message);
      break;

    case 'memory':
    case 'security':
      normalizedError = new BaseError(message, errorType === 'memory' ? 'MEMORY_ERROR' : 'SECURITY_ERROR');
      break;

    default:
      normalizedError = new BaseError(message, 'UNKNOWN_ERROR');
  }

  if (originalStack && !normalizedError.stack) {
    normalizedError.stack = originalStack;
  }

  return normalizedError;
}