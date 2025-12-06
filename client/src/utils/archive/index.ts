/**
 * Chanuka Platform Utilities - Consolidated Edition
 *
 * This module provides the public API for the Chanuka Legislative Platform utilities.
 * All utilities have been consolidated into focused, well-organized modules.
 *
 * @packageDocumentation
 */

// ============================================================================
// CONSOLIDATED MODULES
// ============================================================================

// Core utilities
export { logger } from './logger';

// Consolidated modules
export * from './dev-tools';
export * from './testing';
export * from './security';
export * from './performance';
export * from './storage';
export * from './mobile';
export * from './api';
export * from './browser';
export * from './assets';
export * from './errors';

// Legacy v1 namespace for backward compatibility
export * as v1 from './v1';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

// Most commonly used utilities
export { cn } from './cn';
export { tokenManager as secureTokenManager, sessionManager } from './storage';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Consolidated modules
  devTools: () => import('./dev-tools'),
  testing: () => import('./testing'),
  security: () => import('./security'),
  performance: () => import('./performance'),
  storage: () => import('./storage'),
  mobile: () => import('./mobile'),
  api: () => import('./api'),
  browser: () => import('./browser'),
  assets: () => import('./assets'),
  errors: () => import('./errors'),
  
  // Core utilities
  logger: () => import('./logger'),
  cn: () => import('./cn'),
  secureTokenManager: () => import('./storage'),
  sessionManager: () => import('./storage'),
};