/**
 * Content Security Policy (CSP) Configuration
 * Provides comprehensive CSP headers for enhanced security
 * Prevents XSS attacks and other code injection vulnerabilities
 */

import { setCSPHeader as setCSPHeaderSafe } from './meta-tag-manager';

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'report-uri'?: string;
  'report-to'?: string;
}

// Predefined CSP configurations for different environments
export const CSP_CONFIGS = {
  // Strict CSP for production
  strict: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'"],
    'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for now, but should be moved to files
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://api.example.com'], // Replace with actual API domains
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': true,
    'block-all-mixed-content': true,
  } as CSPDirectives,

  // Development CSP (more permissive)
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'http://localhost:*', 'ws://localhost:*', 'wss://localhost:*'], // Allow eval and inline for dev tools
    'script-src-elem': ["'self'", "'unsafe-inline'", 'http://localhost:*'], // Allow dynamic script loading
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'http:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'connect-src': ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
    'media-src': ["'self'", 'data:', 'blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'", 'blob:'],
  } as CSPDirectives,

  // Minimal CSP for legacy support
  minimal: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'http:'],
    'connect-src': ["'self'", 'https:', 'http:'],
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'", 'blob:'],
  } as CSPDirectives,
};

/**
 * Generate CSP header string from directives
 */
export function generateCSPHeader(directives: CSPDirectives): string {
  const policies: string[] = [];

  for (const [directive, values] of Object.entries(directives)) {
    if (directive === 'upgrade-insecure-requests' && values === true) {
      policies.push('upgrade-insecure-requests');
    } else if (directive === 'block-all-mixed-content' && values === true) {
      policies.push('block-all-mixed-content');
    } else if (directive === 'report-uri' && typeof values === 'string') {
      policies.push(`report-uri ${values}`);
    } else if (directive === 'report-to' && typeof values === 'string') {
      policies.push(`report-to ${values}`);
    } else if (Array.isArray(values)) {
      policies.push(`${directive} ${values.join(' ')}`);
    }
  }

  return policies.join('; ');
}

/**
 * Get CSP configuration based on environment
 */
export function getCSPConfig(environment: 'production' | 'development' | 'minimal' = 'production'): CSPDirectives {
  return CSP_CONFIGS[environment] || CSP_CONFIGS.strict;
}

/**
 * Generate CSP nonce for inline scripts/styles
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').substring(0, 16);
}

/**
 * Apply CSP nonce to script/style elements
 */
export function applyCSPNonce(element: HTMLScriptElement | HTMLStyleElement, nonce: string): void {
  element.setAttribute('nonce', nonce);
}

/**
 * Set CSP header on document (client-side)
 * Note: This is mainly for development/testing. CSP should be set server-side.
 * Some directives like frame-ancestors are not supported in meta tags and will be filtered out.
 */

export function setCSPHeader(policy: string | CSPDirectives): void {
  try {
    // Convert CSPDirectives to string if needed
    let policyString: string;
    if (typeof policy === 'string') {
      policyString = policy;
    } else {
      policyString = generateCSPHeader(policy);
    }
    
    // Validate that we have a string
    if (!policyString || typeof policyString !== 'string') {
      console.warn('CSP: Invalid policy provided, skipping CSP header setup');
      return;
    }
    
    // Filter out directives not supported in meta tags
    const unsupportedInMeta = ['frame-ancestors', 'report-uri', 'report-to'];
    const filteredPolicy = policyString
      .split(';')
      .filter(directive => {
        const directiveName = directive.trim().split(' ')[0];
        return !unsupportedInMeta.includes(directiveName);
      })
      .join(';');
    
    if (filteredPolicy.trim()) {
      // Use the meta tag manager to prevent duplicates
      setCSPHeaderSafe(filteredPolicy);
    }
    
    // Log info about filtered directives (not a warning)
    const filtered = policyString.split(';').length - filteredPolicy.split(';').length;
    if (filtered > 0) {
      console.info(`CSP: ${filtered} directives filtered for meta tag compatibility`);
    }
  } catch (error) {
    console.error('Failed to set CSP header:', error);
  }
}

/**
 * Validate CSP configuration
 */
export function validateCSPConfig(directives: CSPDirectives): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for dangerous patterns
  if (directives['script-src']?.includes("'unsafe-inline'")) {
    errors.push("Warning: 'unsafe-inline' in script-src allows XSS attacks");
  }

  if (directives['style-src']?.includes("'unsafe-inline'")) {
    errors.push("Warning: 'unsafe-inline' in style-src allows CSS injection");
  }

  if (directives['script-src']?.includes("'unsafe-eval'")) {
    errors.push("Warning: 'unsafe-eval' in script-src allows code injection");
  }

  if (directives['object-src']?.includes("'self'") || directives['object-src']?.includes('*')) {
    errors.push("Warning: Allowing object-src can lead to security vulnerabilities");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * CSP violation report handler
 */
export function handleCSPViolation(event: SecurityPolicyViolationEvent): void {
  console.error('CSP Violation:', {
    documentURI: event.documentURI,
    violatedDirective: event.violatedDirective,
    effectiveDirective: event.effectiveDirective,
    originalPolicy: event.originalPolicy,
    blockedURI: event.blockedURI,
    statusCode: event.statusCode,
  });

  // Send report to server if report-uri is configured
  if (event.originalPolicy.includes('report-uri')) {
    fetch('/api/csp-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/csp-report',
      },
      body: JSON.stringify({
        'csp-report': {
          'document-uri': event.documentURI,
          'violated-directive': event.violatedDirective,
          'effective-directive': event.effectiveDirective,
          'original-policy': event.originalPolicy,
          'blocked-uri': event.blockedURI,
          'status-code': event.statusCode,
        },
      }),
    }).catch(error => {
      console.error('Failed to send CSP report:', error);
    });
  }
}

/**
 * Initialize CSP violation reporting
 */
export function initializeCSPReporting(): void {
  document.addEventListener('securitypolicyviolation', handleCSPViolation);
}