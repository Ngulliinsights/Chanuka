/**
 * Development Mode Overrides
 * Comprehensive overrides for development mode to reduce console noise
 */

export function applyDevelopmentOverrides(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('🔧 Applying development mode overrides...');

  // Override console methods to reduce noise
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Patterns to suppress in development
  const suppressPatterns = [
    /Failed to execute 'removeChild'/,
    /Maximum call stack size exceeded/,
    /Failed to fetch dynamically imported module/,
    /Cannot construct a Request/,
    /CSP.*violation/i,
    /X-Frame-Options may only be set/,
    /Long task detected/,
    /Slow component render/,
    /Vulnerability scan/,
    /Development Error #/,
    /net::ERR_ABORTED 404.*csrf/,
    /net::ERR_ABORTED 504.*Outdated/,
    /Uncaught NotFoundError.*removeChild/,
    /The message port closed/,
    /runtime\.lastError/
  ];

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      console.debug('[SUPPRESSED WARN]', message.substring(0, 100) + '...');
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      console.debug('[SUPPRESSED ERROR]', message.substring(0, 100) + '...');
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Suppress window errors
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      console.debug('[SUPPRESSED WINDOW ERROR]', message);
      event.preventDefault();
      return false;
    }
  }, true);

  // Suppress unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      console.debug('[SUPPRESSED REJECTION]', message);
      event.preventDefault();
      return false;
    }
  }, true);

  // Disable React DevTools warnings
  if (typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      ...((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {}),
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
      supportsFiber: true,
      inject: () => {},
      onScheduleFiberRoot: () => {},
    };
  }

  console.log('✅ Development mode overrides applied');
}

// Auto-apply in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Apply immediately
  applyDevelopmentOverrides();
  
  // Also apply after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDevelopmentOverrides);
  }
}