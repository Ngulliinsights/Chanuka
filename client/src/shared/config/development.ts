/**
 * Development Configuration Override
 * Disables problematic features in development mode
 */

export const developmentConfig = {
  // Disable CSP in development to prevent script loading issues
  security: {
    enableCSP: false,
    enableCSRF: false,
    enableVulnerabilityScanning: false,
  },

  // Reduce session monitoring frequency
  session: {
    checkInterval: 300000, // 5 minutes instead of 1 minute
    enableActivityTracking: false, // Disable in development
    enableSecurityMonitoring: false,
  },

  // Disable performance monitoring that might cause issues
  performance: {
    enableRealtimeOptimization: false,
    enableWebVitalsMonitoring: false,
  },

  // HMR configuration
  hmr: {
    overlay: false, // Disable error overlay that might conflict
    clientPort: 5173,
  },
};

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
