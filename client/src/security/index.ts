/**
 * Security Infrastructure Implementation
 * Comprehensive security system for the Chanuka platform
 */

import { logger } from '@client/utils/logger';
import { CSPManager } from './csp-manager';
import { CSRFProtection } from './csrf-protection';
import { InputSanitizer } from './input-sanitizer';
import { RateLimiter } from './rate-limiter';
import { VulnerabilityScanner } from './vulnerability-scanner';
import { SecurityMonitor } from './security-monitor';

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
    // In development mode, create a minimal security system to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development mode: using minimal security configuration');
      
      // Create minimal mock security system
      const mockSecuritySystem = {
        csp: { initialize: async () => {}, getNonce: () => 'dev-nonce' },
        csrf: { initialize: async () => {}, getToken: () => 'dev-token' },
        sanitizer: { sanitize: (input: string) => input },
        rateLimiter: { initialize: async () => {} },
        vulnerabilityScanner: { initialize: async () => {} },
        monitor: { initialize: async () => {} }
      };
      
      return mockSecuritySystem as any;
    }

    logger.info('Initializing security infrastructure', { config });

    // Initialize CSP Manager
    const csp = new CSPManager({
      enabled: config.enableCSP,
      reportUri: '/api/security/csp-report',
      reportOnly: process.env.NODE_ENV === 'development'
    });

    // Initialize CSRF Protection
    const csrf = new CSRFProtection({
      enabled: config.enableCSRF,
      tokenName: 'chanuka-csrf-token',
      headerName: 'X-CSRF-Token'
    });

    // Initialize Input Sanitizer
    const sanitizer = new InputSanitizer({
      enabled: config.enableInputSanitization,
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'title']
      }
    });

    // Initialize Rate Limiter
    const rateLimiter = new RateLimiter({
      enabled: config.enableRateLimit,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // per window
      skipSuccessfulRequests: false
    });

    // Initialize Vulnerability Scanner
    const vulnerabilityScanner = new VulnerabilityScanner({
      enabled: config.enableVulnerabilityScanning,
      scanInterval: config.scanInterval,
      reportEndpoint: '/api/security/vulnerability-report'
    });

    // Initialize Security Monitor
    const monitor = new SecurityMonitor({
      enabled: true,
      alertThreshold: 5,
      monitoringInterval: 30000 // 30 seconds
    });

    securitySystem = {
      csp,
      csrf,
      sanitizer,
      rateLimiter,
      vulnerabilityScanner,
      monitor
    };

    // Start security services
    await csp.initialize();
    await csrf.initialize();
    await rateLimiter.initialize();
    await vulnerabilityScanner.initialize();
    await monitor.initialize();

    logger.info('Security infrastructure initialized successfully');
    return securitySystem;

  } catch (error) {
    logger.error('Failed to initialize security infrastructure', error);
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

// Export individual components
export { CSPManager } from './csp-manager';
export { CSRFProtection } from './csrf-protection';
export { InputSanitizer } from './input-sanitizer';
export { RateLimiter } from './rate-limiter';
export { VulnerabilityScanner } from './vulnerability-scanner';
export { SecurityMonitor } from './security-monitor';

// Export types
export type { SecurityEvent, SecurityAlert, VulnerabilityReport } from './types';