/**
 * Security Module Index
 * Exports all security-related functionality
 */

// Core security service
export { 
  securityService, 
  SecurityService,
  type SecurityConfig,
  type SecurityStatus
} from './security-service';

// CSP management
export { 
  cspNonceManager, 
  CSPNonceManager 
} from './csp-nonce';

// Input sanitization
export { 
  inputSanitizer, 
  InputSanitizer,
  ValidationSchemas,
  schemas,
  type SanitizationOptions
} from './input-sanitizer';

// CSRF protection
export { 
  csrfProtection, 
  CSRFProtection,
  setupCSRFInterceptor,
  type CSRFToken
} from './csrf-protection';

// Rate limiting
export { 
  clientRateLimiter, 
  ClientRateLimiter,
  RateLimitConfigs,
  rateLimit,
  useRateLimit as useRateLimitDecorator,
  type RateLimitConfig,
  type RateLimitResult
} from './rate-limiter';

// Vulnerability scanning
export { 
  vulnerabilityScanner, 
  VulnerabilityScanner,
  type SecurityThreat,
  type SecurityScanResult
} from './vulnerability-scanner';

// React hooks
export { 
  useSecurity, 
  useSecureForm, 
  useRateLimit,
  ValidationSchemas as HookValidationSchemas,
  type UseSecurityOptions,
  type SecurityHookResult
} from '../hooks/useSecurity';

// Components
export { SecurityDashboard } from '../components/security/SecurityDashboard';

// Initialize security service with default configuration
export const initializeSecurity = (config?: Partial<SecurityConfig>) => {
  const service = SecurityService.getInstance(config);
  
  // Log initialization
  console.log('🔒 Chanuka Security initialized');
  
  return service;
};

// Security utilities
export const SecurityUtils = {
  /**
   * Quick security check for user input
   */
  isInputSafe: (input: string): boolean => {
    const result = inputSanitizer.performSecurityCheck(input);
    return result.isSafe;
  },

  /**
   * Sanitize user input quickly
   */
  sanitize: (input: string, maxLength = 1000): string => {
    return inputSanitizer.sanitizeText(input, maxLength);
  },

  /**
   * Generate secure random string
   */
  generateSecureToken: (length = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  /**
   * Check if current environment is secure
   */
  isSecureContext: (): boolean => {
    return window.isSecureContext && location.protocol === 'https:';
  },

  /**
   * Get security headers for API requests
   */
  getSecurityHeaders: (): Record<string, string> => {
    return {
      ...csrfProtection.getHeaders(),
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff'
    };
  }
};

// Export types
export type { SecurityConfig, SecurityStatus } from './security-service';
export type { SanitizationOptions } from './input-sanitizer';
export type { CSRFToken } from './csrf-protection';
export type { RateLimitConfig, RateLimitResult } from './rate-limiter';
export type { SecurityThreat, SecurityScanResult } from './vulnerability-scanner';
export type { UseSecurityOptions, SecurityHookResult } from '../hooks/useSecurity';