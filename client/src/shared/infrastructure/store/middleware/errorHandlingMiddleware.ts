/**
 * Error Handling Middleware for Client
 *
 * Integrates with core error system to capture and handle errors from actions and API calls.
 */

import { Middleware, Action } from '@reduxjs/toolkit';

import {
  ErrorDomain,
  ErrorSeverity,
  coreErrorHandler,
  createError,
} from '@/core/error';
import { logger } from '../../../../utils/logger';

export const errorHandlingMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  const reduxAction = action as Action & { type: string };

  try {
    return next(action);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Create error through core system
    const appError = createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.HIGH,
      `Redux action error: ${errorMessage}`,
      {
        details: {
          actionType: reduxAction.type,
          originalError: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
        },
        context: {
          component: 'ReduxMiddleware',
          operation: 'action_execution',
          actionType: reduxAction.type,
        },
        recoverable: false,
        retryable: false,
      }
    );

    // Handle through core system
    coreErrorHandler.handleError(appError);

    // Additional Redux-specific logging
    logger.error('Action error caught by middleware', {
      component: 'ErrorHandlingMiddleware',
      action: reduxAction.type,
      error: errorMessage,
      errorId: appError.id,
    });

    // Dispatch Redux-specific error action for UI state management
    store.dispatch({
      type: 'error/actionError',
      payload: {
        action: reduxAction.type,
        error: errorMessage,
        errorId: appError.id,
        timestamp: new Date().toISOString(),
        domain: appError.type,
        severity: appError.severity,
      }
    });

    throw error;
  }
};
