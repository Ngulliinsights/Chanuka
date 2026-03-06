/**
 * React Query Integration
 * Integrates error system with React Query
 */

import { ErrorFactory } from '../core/factory';
import { errorHandler } from '../core/handler';

/**
 * Create error handler for React Query
 */
export function createQueryErrorHandler() {
  return {
    /**
     * Handle query errors
     */
    onError: (error: Error) => {
      const clientError = ErrorFactory.createFromError(error, {
        component: 'ReactQuery',
        operation: 'query',
      });
      errorHandler.handleError(clientError);
    },

    /**
     * Custom retry logic for specific errors
     */
    retry: (failureCount: number, error: Error) => {
      // Don't retry auth errors
      if (error.message.includes('auth') || error.message.includes('401')) {
        return false;
      }

      // Don't retry validation errors
      if (error.message.includes('validation') || error.message.includes('400')) {
        return false;
      }

      // Default retry (3 attempts)
      return failureCount < 3;
    },

    /**
     * Exponential backoff with jitter
     */
    retryDelay: (attemptIndex: number) => {
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
  };
}

/**
 * Create mutation error handler
 */
export function createMutationErrorHandler() {
  return {
    onError: (error: Error) => {
      const clientError = ErrorFactory.createFromError(error, {
        component: 'ReactQuery',
        operation: 'mutation',
      });
      errorHandler.handleError(clientError);
    },
  };
}
