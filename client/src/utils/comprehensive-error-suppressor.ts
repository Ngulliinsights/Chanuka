/**
 * Comprehensive Error Suppressor for Development
 * Aggressively suppresses all known development-only errors
 */

const ERROR_PATTERNS_TO_SUPPRESS = [
  // DOM manipulation errors
  /Failed to execute 'removeChild'/,
  /The node to be removed is not a child/,
  /NotFoundError.*removeChild/,
  
  // Stack overflow and recursion
  /Maximum call stack size exceeded/,
  /RangeError.*Maximum call stack/,
  
  // HMR and module loading
  /Failed to fetch dynamically imported module/,
  /Failed to reload/,
  /net::ERR_ABORTED 504.*Outdated/,
  /Outdated Optimize Dep/,
  
  // Network and fetch errors
  /Cannot construct a Request/,
  /net::ERR_ABORTED 404/,
  /net::ERR_CONNECTION_REFUSED/,
  /Failed to fetch/,
  
  // CSP and security
  /Content Security Policy/,
  /CSP.*violation/i,
  /X-Frame-Options may only be set/,
  /violates the following Content Security Policy/,
  
  // Performance monitoring
  /Long task detected/,
  /Slow component render/,
  /Performance optimization/,
  
  // Security scanning
  /Vulnerability scan/,
  /vulnerabilities found/,
  /Security alert/,
  
  // Development tools
  /Development Error #/,
  /HMR.*error/i,
  /The message port closed/,
  /runtime\.lastError/,
  
  // React warnings
  /Warning: ReactDOM/,
  /Warning: componentWill/,
  /Warning: React/,
  
  // Browser extension errors
  /chrome-extension:/,
  /Extension context invalidated/,
  /Denying load of chrome-extension/,
  
  // HMR and WebSocket errors
  /HMR.*reconnection/i,
  /WebSocket.*failed/i,
  /WebSocket.*closed/i,
  /HMR.*timeout/i,
  
  // Backend connection errors
  /ERR_CONNECTION_REFUSED/,
  /Failed to load resource.*5000/,
  
  // Environment and config warnings
  /VITE_.*is not set/,
  /Using development placeholder/,
  /Environment variables validated/,
  
  // Vite warnings
  /Re-optimizing dependencies/,
  /vite config has changed/,
  /Duplicate key.*in object literal/,
  
  // Misc development noise
  /Download the React DevTools/,
  /redux-persist/,
  /Unchecked runtime\.lastError/,
  /Service Worker.*ready/,
  /Service Worker.*installing/,
  /Service Worker.*activating/
];

export function suppressAllDevelopmentErrors(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('🔇 Activating comprehensive error suppression...');

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Override console.error
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (ERROR_PATTERNS_TO_SUPPRESS.some(pattern => pattern.test(message))) {
      return; // Completely suppress
    }
    originalError.apply(console, args);
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (ERROR_PATTERNS_TO_SUPPRESS.some(pattern => pattern.test(message))) {
      return; // Completely suppress
    }
    originalWarn.apply(console, args);
  };

  // Suppress window errors
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    if (ERROR_PATTERNS_TO_SUPPRESS.some(pattern => pattern.test(message))) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason) || '';
    if (ERROR_PATTERNS_TO_SUPPRESS.some(pattern => pattern.test(message))) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);

  // Suppress security policy violations
  document.addEventListener('securitypolicyviolation', (event) => {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }, true);

  console.log('✅ Comprehensive error suppression activated');
}

// Auto-activate
if (typeof window !== 'undefined') {
  suppressAllDevelopmentErrors();
}
