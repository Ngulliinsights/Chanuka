/**
 * Error Normalization Utility
 * Extracted from ErrorFallback.tsx to reduce file size and improve reusability
 */

import { ErrorSeverity } from '../../constants';
import {
  BaseError,
  NetworkError,
  CacheError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../../classes';

export function normalizeError(
  error: Record<string, unknown> | unknown,
  errorType?: string,
  _errorSeverity?: ErrorSeverity,
  _context?: Record<string, unknown>
): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  const message = (error as any)?.message || String(error || 'Unknown error occurred');
  const originalStack = (error as any)?.stack;

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
      normalizedError = new BaseError(message, { code: errorType || 'UNKNOWN_ERROR' });
  }

  if (originalStack && !normalizedError.stack) {
    normalizedError.stack = originalStack;
  }

  return normalizedError;
}
