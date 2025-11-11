/**
 * API Middleware for Chanuka Client
 * 
 * Handles API requests, caching, error handling, and retry logic.
 */

import { Middleware } from '@reduxjs/toolkit';
import { logger } from '../../utils/logger';

export const apiMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle API-related actions
  if (action.type?.startsWith('api/')) {
    logger.debug('API action dispatched', { 
      component: 'ApiMiddleware',
      action: action.type
    });
  }

  return next(action);
};