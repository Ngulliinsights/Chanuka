/**
 * Core Security System
 * Comprehensive security infrastructure for the Chanuka platform
 */

import { logger } from '@client/lib/utils/logger';

// Import core components
import { CSRFProtection } from './csrf-protection';
import { InputSanitizer } from './input-sanitizer';
import { RateLimiter } from './rate-limiter';
import { SecurityMonitor } from './security-monitor';
import { VulnerabilityScanner } from './vulnerability-scanner';
import { CSPManager } from './csp-manager';
import { getCSPConfig } from './csp-config';

export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableVulnerabilityScanning: boolean;
  enableInputSanitization: boolean;
  scanInterval: number;
}

export interface SecuritySystem {
  csp: CSPManager;
  csrf: CSRFProtection;
  sanitizer: InputSanitizer;
  rateLimiter: RateLimiter;
  vulnerabilityScanner: VulnerabilityScanner;
  monitor: SecurityMonitor;
}

let securitySystem: SecuritySystem | null = null;

/**
 * Initialize the security infrastructure
 */
export async function initializeSecurity(config: SecurityConfig): Promise<SecuritySystem> {
  try {
    logger.info('Initializing security infrastructure', {
      config,
      environment: process.env.NODE_ENV,
    });

    const csp = new CSPManager({
      enabled: config.enableCSP,
      reportOnly: process.env.NODE_ENV === 'development',
      directives: getCSPConfig(process.env.NODE_ENV),
      reportUri: '/api/security/csp-report',
    });

    const csrf = new CSRFProtection({
      enabled: config.enableCSRF,
      tokenName: 'chanuka-csrf-token',
      headerName: 'X-CSRF-Token',
    });

    const sanitizer = new InputSanitizer({
      enabled: config.enableInputSanitization,
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: { a: ['href'] },
    });

    const rateLimiter = new RateLimiter({
      enabled: config.enableRateLimit,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
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
    };

    // Start components
    await csp.initialize();
    await csrf.initialize();
    await rateLimiter.initialize();
    await vulnerabilityScanner.initialize();
    await monitor.initialize();

    logger.info('Security infrastructure initialized successfully');

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
    await securitySystem.vulnerabilityScanner.shutdown();
    await securitySystem.monitor.shutdown();
    securitySystem = null;
    logger.info('Security infrastructure shut down');
  }
}

// Export core components
export { CSPManager } from './csp-manager';
export * from './csp-config';
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
  DEFAULT_CSP,
} from './security-utils';
export { securityUtils } from './security-utils';
