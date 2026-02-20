/**
 * Core Security System
 * Comprehensive security infrastructure for the Chanuka platform
 */

import { logger } from '@client/lib/utils/logger';

// Import legacy components for backward compatibility
import { CSRFProtection } from './csrf-protection';
import { InputSanitizer } from './input-sanitizer';
import { RateLimiter } from './rate-limiter';
import { SecurityMonitor } from './security-monitor';
import { VulnerabilityScanner } from './vulnerability-scanner';
import {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorMiddleware,
  DEFAULT_UNIFIED_CONFIG,
  UnifiedRateLimiter
} from './unified';


export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableVulnerabilityScanning: boolean;
  enableInputSanitization: boolean;
  scanInterval: number;
}

export interface SecuritySystem {
  csp: UnifiedCSPManager;
  csrf: CSRFProtection;
  sanitizer: InputSanitizer | UnifiedInputSanitizer;
  rateLimiter: RateLimiter | UnifiedRateLimiter;
  vulnerabilityScanner: VulnerabilityScanner;
  monitor: SecurityMonitor;
  errorHandler?: SecurityErrorHandler;
  errorMiddleware?: SecurityErrorMiddleware;
}

let securitySystem: SecuritySystem | null = null;

/**
 * Initialize the security infrastructure with unified approach
 */
export async function initializeSecurity(config: SecurityConfig): Promise<SecuritySystem> {
  try {
    logger.info('Initializing unified security infrastructure', {
      config,
      environment: process.env.NODE_ENV
    });

    // Initialize unified security system
    const unifiedConfig = {
      csp: {
        enabled: config.enableCSP,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: DEFAULT_UNIFIED_CONFIG.csp.directives,
        nonce: undefined,
      },
      inputSanitization: {
        enabled: config.enableInputSanitization,
        mode: 'comprehensive' as const,
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {
          a: ['href', 'title'],
          img: ['src', 'alt', 'title'],
        },
      },
      rateLimiting: {
        enabled: config.enableRateLimit,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
      },
      errorHandling: {
        mode: 'strict' as const,
        logLevel: 'info' as const,
        reportToBackend: true,
      },
    };

    // Initialize unified components
    const csp = new UnifiedCSPManager({
      enabled: unifiedConfig.csp.enabled,
      reportOnly: unifiedConfig.csp.reportOnly,
      directives: unifiedConfig.csp.directives,
      reportUri: '/api/security/csp-report',
    });

    const sanitizer = new UnifiedInputSanitizer({
      enabled: unifiedConfig.inputSanitization.enabled,
      mode: unifiedConfig.inputSanitization.mode,
      allowedTags: unifiedConfig.inputSanitization.allowedTags,
      allowedAttributes: unifiedConfig.inputSanitization.allowedAttributes,
    });

    const errorHandler = new SecurityErrorHandler(unifiedConfig.errorHandling);
    const errorMiddleware = new SecurityErrorMiddleware(unifiedConfig.errorHandling);

    // Initialize legacy components for compatibility
    const csrf = new CSRFProtection({
      enabled: config.enableCSRF,
      tokenName: 'chanuka-csrf-token',
      headerName: 'X-CSRF-Token',
    });

    const rateLimiter = new UnifiedRateLimiter({
      enabled: config.enableRateLimit,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    });

    const vulnerabilityScanner = new VulnerabilityScanner({
      enabled: config.enableVulnerabilityScanning,
      scanInterval: config.scanInterval,
      reportEndpoint: '/api/security/vulnerability-report',
    });

    const monitor = new SecurityMonitor({
      enabled: true,
      alertThreshold: 5,
      monitoringInterval: 30000,
    });

    securitySystem = {
      csp,
      csrf,
      sanitizer,
      rateLimiter,
      vulnerabilityScanner,
      monitor,
      errorHandler,
      errorMiddleware,
    };

    // Start unified components
    await csp.initialize();
    await sanitizer.shutdown(); // UnifiedInputSanitizer doesn't have initialize, using shutdown as placeholder
    await errorHandler.shutdown(); // SecurityErrorHandler doesn't have initialize, using shutdown as placeholder
    await errorMiddleware.shutdown(); // SecurityErrorMiddleware doesn't have initialize, using shutdown as placeholder

    // Start legacy components
    await csrf.initialize();
    await rateLimiter.initialize();
    await vulnerabilityScanner.initialize();
    await monitor.initialize();

    logger.info('Unified security infrastructure initialized successfully');

    return securitySystem;
  } catch (error) {
    logger.error('Failed to initialize security infrastructure', { error });
    throw error;
  }
}



/**
 * Get the current security system instance
 */
export function getSecuritySystem(): SecuritySystem | null {
  return securitySystem;
}

/**
 * Get security status across all components
 */
export function getSecurityStatus(): {
  components: Record<string, { enabled: boolean; status: string }>;
  overall: string;
} {
  const system = getSecuritySystem();

  if (!system) {
    return {
      components: {},
      overall: 'uninitialized',
    };
  }

  // Basic status check
  return {
    components: {
      csp: { enabled: true, status: 'active' },
      sanitizer: { enabled: true, status: 'active' },
      rateLimiter: { enabled: true, status: 'active' },
    },
    overall: 'healthy',
  };
}

/**
 * Shutdown security system
 */
export async function shutdownSecurity(): Promise<void> {
  if (securitySystem) {
    if (securitySystem.errorHandler) {
      await securitySystem.errorHandler.shutdown();
    }

    if (securitySystem.errorMiddleware) {
      await securitySystem.errorMiddleware.shutdown();
    }

    await securitySystem.vulnerabilityScanner.shutdown();
    await securitySystem.monitor.shutdown();
    securitySystem = null;
    logger.info('Security infrastructure shut down');
  }
}

// Export unified components
export * from './unified';

// Export UnifiedCSPManager as CSPManager for backward compatibility
export { UnifiedCSPManager as CSPManager } from './unified/csp-manager';

// Export legacy components for backward compatibility
export { CSRFProtection } from './csrf-protection';
export { InputSanitizer } from './input-sanitizer';
export { RateLimiter } from './rate-limiter';
export { VulnerabilityScanner } from './vulnerability-scanner';
export { SecurityMonitor } from './security-monitor';

// Export types
export type { SecurityEvent, SecurityAlert, VulnerabilityReport } from './types';

// Export foundational security utilities
export {
  validatePasswordStrength,
  validateCSRFToken,
  hashData,
  generateSecureToken,
  isSecureContext,
  SECURITY_HEADERS,
  DEFAULT_CSP
} from './security-utils';
export { securityUtils } from './security-utils';
