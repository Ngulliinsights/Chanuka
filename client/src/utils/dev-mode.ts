/**
 * Development Mode Detector and Configuration
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Development feature flags
export const devConfig = {
  suppressErrors: isDevelopment,
  suppressWarnings: isDevelopment,
  disableCSP: isDevelopment,
  disableCSRF: isDevelopment,
  disableVulnerabilityScanning: isDevelopment,
  disablePerformanceMonitoring: isDevelopment,
  disableActivityTracking: isDevelopment,
  mockBackendCalls: isDevelopment,
  skipSecurityInitialization: isDevelopment,
};

// Apply global development overrides
if (isDevelopment && typeof window !== 'undefined') {
  // Disable React DevTools console messages
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    supportsFiber: true,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
  
  // Suppress React warnings
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Warning:') || 
        message.includes('React') ||
        message.includes('componentWill') ||
        message.includes('ReactDOM.render')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export default devConfig;
