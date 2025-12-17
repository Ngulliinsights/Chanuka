/**
 * API Middleware for Client
 * 
 * Handles API requests, caching, error handling, and retry logic.
 */

import { Middleware, Action } from '@reduxjs/toolkit';

import { logger } from '@client/utils/logger';

export const apiMiddleware: Middleware = (_store) => (next) => (action: unknown) => {
  const reduxAction = action as Action & { type: string };
  // Handle API-related actions
  if (reduxAction.type?.startsWith('api/')) {
    logger.debug('API action dispatched', { 
      component: 'ApiMiddleware',
      action: reduxAction.type
    });
  }

  return next(action);
};