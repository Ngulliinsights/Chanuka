/**
 * Super Aggressive Console Suppressor
 * For maximum console silence in development
 */

export function applySuperAggressiveSuppression(): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🔇 Applying super aggressive console suppression...');

  // Store originals
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  // Patterns for complete suppression
  const suppressPatterns = [
    /HMR/i, /WebSocket/i, /Service Worker/i, /redux-persist/i,
    /ERR_CONNECTION_REFUSED/i, /Failed to load resource/i,
    /chrome-extension/i, /VITE_.*is not set/i, /development placeholder/i,
    /Re-optimizing dependencies/i, /vite config has changed/i,
    /Duplicate key/i, /Download the React DevTools/i,
    /Unchecked runtime/i, /message port closed/i,
    /Performance optimization/i, /Long task detected/i,
    /Slow component render/i, /Vulnerability scan/i
  ];

  // Override all console methods
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(p => p.test(message))) return;
    if (message.includes('[INFO]') && (
      message.includes('Performance') || 
      message.includes('Service Worker') ||
      message.includes('polyfills') ||
      message.includes('Browser compatibility')
    )) return;
    originalLog.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(p => p.test(message))) return;
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(p => p.test(message))) return;
    originalError.apply(console, args);
  };

  console.info = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressPatterns.some(p => p.test(message))) return;
    if (message.includes('[INFO]')) return; // Suppress all [INFO] logs
    originalInfo.apply(console, args);
  };

  console.log('✅ Super aggressive suppression active - console will be very quiet');
}

// Auto-apply
if (typeof window !== 'undefined') {
  applySuperAggressiveSuppression();
}
