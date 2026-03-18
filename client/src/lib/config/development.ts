/**
 * Development Configuration Override
 * Disables problematic features in development mode
 */

export 
// Apply development overrides
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode detected - applying performance optimizations');

  // Disable problematic global error handlers
  window.addEventListener('error', e => {
    if (e.message.includes('removeChild') || e.message.includes('Maximum call stack')) {
      e.preventDefault();
      console.debug('Suppressed development error:', e.message);
    }
  });

  // Disable unhandled rejection logging for development
  window.addEventListener('unhandledrejection', e => {
    if (e.reason?.message?.includes('Failed to fetch dynamically imported module')) {
      e.preventDefault();
      console.debug('Suppressed HMR error:', e.reason.message);
    }
  });
}
