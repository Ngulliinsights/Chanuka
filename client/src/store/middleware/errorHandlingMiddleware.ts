/**
 * Error Handling Middleware for Chanuka Client
 * 
 * Captures and handles errors from actions and API calls.
 */

import { Middleware } from '@reduxjs/toolkit';
import { logger } from '../../utils/logger';

export const errorHandlingMiddleware: Middleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    logger.error('Action error caught by middleware', {
      component: 'ErrorHandlingMiddleware',
      action: action.type,
      error: error.toString()
    });
    
    // Dispatch error action
    store.dispatch({
      type: 'error/actionError',
      payload: {
        action: action.type,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
};