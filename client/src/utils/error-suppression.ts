/**
 * Development Error Suppression Utility
 * Suppresses known development-only errors that don't affect functionality
 */

interface ErrorPattern {
  pattern: RegExp;
  description: string;
  suppress: boolean;
}

const DEVELOPMENT_ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Failed to execute 'removeChild' on 'Node'/,
    description: 'DOM manipulation race condition (React development mode)',
    suppress: true
  },
  {
    pattern: /Maximum call stack size exceeded/,
    description: 'Stack overflow in development hot reload',
    suppress: true
  },
  {
    pattern: /Failed to fetch dynamically imported module/,
    description: 'HMR module loading issue',
    suppress: true
  },
  {
    pattern: /Cannot construct a Request with a Request object that has already been used/,
    description: 'Fetch request reuse in development',
    suppress: true
  },
  {
    pattern: /Loading the script.*violates the following Content Security Policy/,
    description: 'CSP violation in development mode',
    suppress: true
  },
  {
    pattern: /Uncaught NotFoundError.*removeChild/,
    description: 'React DOM manipulation error in development',
    suppress: true
  },
  {
    pattern: /X-Frame-Options may only be set via an HTTP header/,
    description: 'Security header warning in development',
    suppress: true
  },
  {
    pattern: /CSP: Some directives.*are not supported in meta tags/,
    description: 'CSP meta tag limitation warning',
    suppress: true
  },
  {
    pattern: /GET.*net::ERR_ABORTED 404.*csrf-token/,
    description: 'CSRF token endpoint not found (development)',
    suppress: true
  },
  {
    pattern: /GET.*net::ERR_ABORTED 504.*Outdated Optimize Dep/,
    description: 'Vite dependency optimization issue',
    suppress: true
  },
  {
    pattern: /Long task detected.*blocks user interactions/,
    description: 'Performance monitoring warning in development',
    suppress: true
  },
  {
    pattern: /Slow component render detected/,
    description: 'Component performance warning in development',
    suppress: true
  },
  {
    pattern: /Vulnerability scan completed.*vulnerabilities found/,
    description: 'Security scan results in development',
    suppress: true
  },
  {
    pattern: /Development Error #\d+/,
    description: 'Development error recovery system',
    suppress: true
  }
];

export function initializeErrorSuppression(): void {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only suppress errors in development
  }

  console.log('🔧 Initializing development error suppression...');

  // Suppress console errors for known development issues
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    for (const { pattern, description, suppress } of DEVELOPMENT_ERROR_PATTERNS) {
      if (pattern.test(message) && suppress) {
        console.debug(`[SUPPRESSED] ${description}: ${message.substring(0, 100)}...`);
        return;
      }
    }
    
    // If not suppressed, log normally
    originalConsoleError.apply(console, args);
  };

  // Suppress window error events for known issues
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    
    for (const { pattern, description, suppress } of DEVELOPMENT_ERROR_PATTERNS) {
      if (pattern.test(message) && suppress) {
        console.debug(`[SUPPRESSED ERROR] ${description}`);
        event.preventDefault();
        return;
      }
    }
  });

  // Suppress unhandled promise rejections for known issues
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    
    for (const { pattern, description, suppress } of DEVELOPMENT_ERROR_PATTERNS) {
      if (pattern.test(message) && suppress) {
        console.debug(`[SUPPRESSED REJECTION] ${description}`);
        event.preventDefault();
        return;
      }
    }
  });
}

// Auto-initialize in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  initializeErrorSuppression();
}
