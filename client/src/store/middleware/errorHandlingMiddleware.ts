/**
 * Error Handling Middleware for Client
 * 
 * Captures and handles errors from actions and API calls.
 */

import { Middleware, Action } from '@reduxjs/toolkit';

import { logger } from '@client/utils/logger';

export const errorHandlingMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  const reduxAction = action as Action & { type: string };
  try {
    return next(action);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Action error caught by middleware', {
      component: 'ErrorHandlingMiddleware',
      action: reduxAction.type,
      error: errorMessage
    });
    
    // Dispatch error action
    store.dispatch({
      type: 'error/actionError',
      payload: {
        action: reduxAction.type,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
};