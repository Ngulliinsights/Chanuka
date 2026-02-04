/**
 * Unified Security System - Main Export
 * 
 * Provides a unified, consistent security system that maintains backward compatibility
 * while improving code quality and maintainability.
 */

// Core interfaces and types
export * from './security-interface';
import { SecurityHealth, SecurityMetrics, UnifiedSecurityConfig } from './security-interface';

// Security components
import { UnifiedCSPManager } from './csp-manager';
import { UnifiedInputSanitizer } from './input-sanitizer';
import { SecurityErrorHandler, SecurityErrorFactory, SecurityOperationError } from './error-handler';
import { SecurityErrorMiddleware, createSecurityErrorMiddleware } from './error-middleware';
import { UnifiedRateLimiter } from './rate-limiter';

// Configuration
import {
  STANDARD_CSP_CONFIG,
  getCSPConfig,
  validateCSPDirectives,
  mergeCSPDirectives,
  addCSPSources,
  removeCSPSources,
  generateCSPHeader,
  parseCSPHeader,
  isCSPSecure,
  RECOMMENDED_CSP_CONFIGS
} from './csp-config';

export {
  STANDARD_CSP_CONFIG,
  getCSPConfig,
  validateCSPDirectives,
  mergeCSPDirectives,
  addCSPSources,
  removeCSPSources,
  generateCSPHeader,
  parseCSPHeader,
  isCSPSecure,
  RECOMMENDED_CSP_CONFIGS
};

// Migration utilities
import { SecurityMigrationUtils } from '../migration/migration-utils';

// System (Class, Config, Helpers)
import {
  DEFAULT_UNIFIED_CONFIG,
  UnifiedSecuritySystem,
  initializeUnifiedSecurity,
  isUnifiedSecurityEnabled,
  getSecurityStatus,
  securityUtils
} from './system';

export * from './system';

// Export components
export {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorFactory,
  SecurityOperationError,
  SecurityErrorMiddleware,
  createSecurityErrorMiddleware,
  UnifiedRateLimiter,
  SecurityMigrationUtils
};

// Default export for backward compatibility
const unifiedSystem = {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorMiddleware,
  SecurityMigrationUtils,
  STANDARD_CSP_CONFIG,
  DEFAULT_UNIFIED_CONFIG,
  UnifiedSecuritySystem,
  initializeUnifiedSecurity,
  isUnifiedSecurityEnabled,
  getSecurityStatus,
  securityUtils,
};

export default unifiedSystem;
