/**
 * Unified Security System - Main Export
 *
 * Provides a unified, consistent security system that maintains backward compatibility
 * while improving code quality and maintainability.
 */

// Core interfaces and types
export * from './security-interface';

// Security components
import { UnifiedCSPManager } from './csp-manager';
import { UnifiedInputSanitizer } from './input-sanitizer';
import { SecurityErrorHandler, SecurityErrorFactory, SecurityOperationError } from './error-handler';
import { SecurityErrorMiddleware, createSecurityErrorMiddleware } from './error-middleware';

// Configuration
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
} from './csp-config';

// Migration utilities
import { SecurityCompatibilityLayer } from '../migration/compatibility-layer';
import { SecurityMigrationUtils } from '../migration/migration-utils';

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
  RECOMMENDED_CSP_CONFIGS,
} from './csp-config';

// Legacy compatibility exports (for backward compatibility)
// legacy exports removed to avoid duplicate/declaration conflicts — use unified API instead

// Default unified configuration
export const DEFAULT_UNIFIED_CONFIG = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: STANDARD_CSP_CONFIG.development,
    nonce: undefined,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive',
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
    allowedAttributes: { a: ['href', 'target'] },
  },
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
  },
  errorHandling: {
    mode: 'strict',
    logLevel: 'info',
    reportToBackend: true,
  },
} as const;

/**
 * Create unified security system instance
 */
export function createUnifiedSecuritySystem(config?: Partial<typeof DEFAULT_UNIFIED_CONFIG>) {
  const finalConfig = { ...DEFAULT_UNIFIED_CONFIG, ...config };

  return {
    cspManager: new UnifiedCSPManager({
      enabled: finalConfig.csp.enabled,
      reportOnly: finalConfig.csp.reportOnly,
      directives: finalConfig.csp.directives,
      reportUri: '/api/security/csp-violations',
    }),
    sanitizer: new UnifiedInputSanitizer({
      enabled: finalConfig.inputSanitization.enabled,
      mode: finalConfig.inputSanitization.mode,
      allowedTags: finalConfig.inputSanitization.allowedTags,
      allowedAttributes: finalConfig.inputSanitization.allowedAttributes,
    }),
    errorHandler: new SecurityErrorHandler(finalConfig.errorHandling),
    errorMiddleware: new SecurityErrorMiddleware(finalConfig.errorHandling),
    compatibilityLayer: new SecurityCompatibilityLayer(),
  };
}

/**
 * Initialize unified security system with default configuration
 */
export async function initializeUnifiedSecurity(config?: Partial<typeof DEFAULT_UNIFIED_CONFIG>) {
  const system = createUnifiedSecuritySystem(config);

  await Promise.all([
    system.cspManager.initialize(),
    system.sanitizer.initialize(config?.inputSanitization),
    system.errorHandler.initialize(config?.errorHandling),
    system.errorMiddleware.initialize(config?.errorHandling),
  ]);

  return system;
}

/**
 * Check if unified security is enabled
 */
export function isUnifiedSecurityEnabled(): boolean {
  return process.env.USE_UNIFIED_SECURITY === 'true' ||
         process.env.NODE_ENV === 'production';
}

/**
 * Get current security status across all components
 */
export function getSecurityStatus() {
  // This would aggregate status from all security components
  return {
    unified: isUnifiedSecurityEnabled(),
    components: {
      csp: { enabled: true, status: 'healthy' },
      sanitization: { enabled: true, status: 'healthy' },
      errorHandling: { enabled: true, status: 'healthy' },
    },
    overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
  };
}

/**
 * Security system utilities
 */
export const securityUtils = {
  /**
   * Sanitize input using unified sanitizer
   */
  sanitizeInput: async (input: string, options?: any) => {
    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
    });
    const result = await sanitizer.sanitize(input, options);
    return result.sanitized;
  },

  /**
   * Generate CSP header using unified configuration
   */
  generateCSPHeader: (directives?: any) => {
    const cspManager = new UnifiedCSPManager({
      enabled: true,
      reportOnly: false,
      directives: directives || STANDARD_CSP_CONFIG.development,
      reportUri: '/api/security/csp-violations',
    });
    return cspManager.generateCSPHeader();
  },

  /**
   * Handle security errors consistently
   */
  handleSecurityError: (error: any, config?: any) => {
    const errorHandler = new SecurityErrorHandler(config || {
      mode: 'strict',
      logLevel: 'info',
      reportToBackend: true,
    });
    return errorHandler.handleSecurityError(error);
  },
};

// Export for backward compatibility
export default {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorMiddleware,
  SecurityCompatibilityLayer,
  SecurityMigrationUtils,
  STANDARD_CSP_CONFIG,
  DEFAULT_UNIFIED_CONFIG,
  createUnifiedSecuritySystem,
  initializeUnifiedSecurity,
  isUnifiedSecurityEnabled,
  getSecurityStatus,
  securityUtils,
};
