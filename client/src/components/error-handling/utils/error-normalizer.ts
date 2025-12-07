/**
 * Error Normalization Utility
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import { ErrorSeverity } from '@client/core/error';
import { 
  BaseError, 
  NetworkError,
  CacheError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@client/core/error';


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

    case 'cache':
      normalizedError = new CacheError(message);
      break;

    case 'unauthorized':
      normalizedError = new UnauthorizedError(message);
      break;

    case 'notfound':
      normalizedError = new NotFoundError('Resource not found');
      break;

    case 'validation':
      normalizedError = new ValidationError(message) as BaseError;
      break;

    default:
      normalizedError = new BaseError(message, errorType || 'UNKNOWN_ERROR');
  }

  if (originalStack && !normalizedError.stack) {
    normalizedError.stack = originalStack;
  }

  return normalizedError;
}