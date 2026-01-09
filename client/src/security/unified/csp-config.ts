/**
 * Standardized CSP Configuration
 * Environment-aware CSP directives
 */

import { CSPDirectives } from './security-interface';

/**
 * Standard CSP configurations for different environments
 */
export const STANDARD_CSP_CONFIG: Record<string, CSPDirectives> = {
  development: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Vite HMR
      "'unsafe-inline'", // Required for development
      'https://cdn.chanuka.ke',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      'ws://localhost:*',
      'http://localhost:*',
      'https://api.chanuka.ke',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'media-src': [],
    'child-src': [],
    'worker-src': [],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },

  production: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'strict-dynamic'",
      'https://cdn.chanuka.ke',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https://cdn.chanuka.ke'],
    'connect-src': [
      "'self'",
      'wss://ws.chanuka.ke',
      'https://api.chanuka.ke',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.chanuka.ke'],
    'media-src': [],
    'child-src': [],
    'worker-src': [],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  },

  staging: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'strict-dynamic'",
      'https://cdn.chanuka.ke',
      'https://staging-cdn.chanuka.ke',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https://cdn.chanuka.ke', 'https://staging-cdn.chanuka.ke'],
    'connect-src': [
      "'self'",
      'wss://staging-ws.chanuka.ke',
      'https://staging-api.chanuka.ke',
      'https://api.chanuka.ke', // Allow fallback to production API
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.chanuka.ke'],
    'media-src': [],
    'child-src': [],
    'worker-src': [],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  },
};

/**
 * Get CSP configuration for current environment
 */
export function getCSPConfig(environment?: string): CSPDirectives {
  const env = environment || process.env.NODE_ENV || 'development';
  return STANDARD_CSP_CONFIG[env] || STANDARD_CSP_CONFIG.development;
}

/**
 * Validate CSP directives
 */
export function validateCSPDirectives(directives: CSPDirectives): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required directives
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
  for (const directive of requiredDirectives) {
    if (!directives[directive as keyof CSPDirectives]) {
      errors.push(`Missing required directive: ${directive}`);
    }
  }

  // Check for unsafe directives in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const unsafeDirectives = ['unsafe-eval', 'unsafe-inline'];
    for (const [directive, sources] of Object.entries(directives) as [keyof CSPDirectives, string[]][]) {
      for (const source of sources) {
        if (unsafeDirectives.some(unsafe => source.includes(unsafe))) {
          warnings.push(`Unsafe directive ${source} found in ${String(directive)} for production environment`);
        }
      }
    }
  }

  // Check for deprecated directives
  const deprecatedDirectives = ['plugin-types', 'reflected-xss', 'reflected-xss-report'];
  for (const directive of deprecatedDirectives) {
    if (directives[directive as keyof CSPDirectives]) {
      warnings.push(`Deprecated directive ${directive} found`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Merge CSP directives with priority
 */
export function mergeCSPDirectives(
  base: CSPDirectives,
  overrides: Partial<CSPDirectives>
): CSPDirectives {
  const result: CSPDirectives = { ...base };
  for (const [key, value] of Object.entries(overrides) as [keyof CSPDirectives, string[]][]) {
    if (value && value.length > 0) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Add additional sources to existing directives
 */
export function addCSPSources(
  directives: CSPDirectives,
  additions: Partial<Record<keyof CSPDirectives, string[]>>
): CSPDirectives {
  const result: CSPDirectives = { ...directives };
  for (const [directive, sources] of Object.entries(additions) as [keyof CSPDirectives, string[]][]) {
    if (sources && sources.length > 0) {
      const currentSources = result[directive] || [];
      result[directive] = [...new Set([...currentSources, ...sources])];
    }
  }

  return result;
}

/**
 * Remove sources from existing directives
 */
export function removeCSPSources(
  directives: CSPDirectives,
  removals: Partial<Record<keyof CSPDirectives, string[]>>
): CSPDirectives {
  const result: CSPDirectives = { ...directives };
  for (const [directive, sources] of Object.entries(removals) as [keyof CSPDirectives, string[]][]) {
    if (sources && sources.length > 0) {
      const currentSources = result[directive] || [];
      result[directive] = currentSources.filter(s => !sources.includes(s));
    }
  }

  return result;
}

/**
 * Generate CSP header string from directives
 */
export function generateCSPHeader(directives: CSPDirectives): string {
  return (Object.entries(directives) as [keyof CSPDirectives, string[]][])
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return String(directive);
      }
      return `${String(directive)} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Parse CSP header string into directives
 */
export function parseCSPHeader(header: string): CSPDirectives {
  const directives: CSPDirectives = {
    'default-src': [],
    'script-src': [],
    'style-src': [],
    'img-src': [],
    'font-src': [],
    'connect-src': [],
    'media-src': [],
    'object-src': [],
    'child-src': [],
    'worker-src': [],
    'frame-src': [],
    'form-action': [],
    'frame-ancestors': [],
    'base-uri': [],
  };

  const directivePairs = header.split(';');
  for (const pair of directivePairs) {
    const [directive, ...sources] = pair.trim().split(/\s+/);
    if (directive && sources.length > 0) {
      directives[directive as keyof CSPDirectives] = sources;
    }
  }

  return directives;
}

/**
 * Check if CSP configuration is secure
 */
export function isCSPSecure(directives: CSPDirectives): boolean {
  // Check for dangerous configurations
  const dangerousSources = ["'unsafe-eval'", "'unsafe-inline'", '*'];

  for (const [directive, sources] of Object.entries(directives) as [keyof CSPDirectives, string[]][]) {
    // Allow unsafe-inline for style-src in development only
    if (directive === 'style-src' && process.env.NODE_ENV === 'development') {
      continue;
    }

    for (const source of sources) {
      if (dangerousSources.includes(source)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get recommended CSP configuration for specific use cases
 */
export const RECOMMENDED_CSP_CONFIGS = {
  /**
   * Strict CSP for high-security applications
   */
  strict: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },

  /**
   * Balanced CSP for most web applications
   */
  balanced: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https:'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },

  /**
   * Permissive CSP for development and testing
   */
  permissive: {
    'default-src': ["'self'", '*'],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", '*'],
    'style-src': ["'self'", "'unsafe-inline'", '*'],
    'img-src': ["'self'", 'data:', '*'],
    'font-src': ["'self'", '*'],
    'connect-src': ["'self'", '*'],
    'object-src': ["'self'", '*'],
    'frame-src': ["'self'", '*'],
    'frame-ancestors': ["'self'", '*'],
    'base-uri': ["'self'", '*'],
    'form-action': ["'self'", '*'],
  },
} as const;
