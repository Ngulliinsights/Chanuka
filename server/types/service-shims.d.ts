// Valid ambient module shims for commonly-imported relative modules.
// Use wildcard module names (no relative paths) so TypeScript accepts them.

declare module '*database-service.js' {
  const databaseService: any;
  export default databaseService;
}

declare module '*real-time-tracking.js' {
  export const realTimeTracker: any;
  export default realTimeTracker;
}

declare module '*test-helpers.js' {
  export const TestHelpers: any;
  export const PerformanceUtils: any;
  export default TestHelpers;
}

declare module '*performance-monitoring.js' {
  export const performanceMonitoring: any;
  export const MonitoringConfig: any;
  export const MonitoringLevel: any;
  export const SamplingStrategy: any;
  export default performanceMonitoring;
}

declare module '*email.service.js' {
  export function getEmailService(...args: any[]): any;
  export default getEmailService;
}

declare module '*enhanced-notification.js' {
  export const enhancedNotificationService: any;
  export type EnhancedNotificationData = any;
  export default enhancedNotificationService;
}

// Generic catch-all for server services imported with patterns like '../services/*'
// Avoid ambient relative module declarations (they cause TS2436). If you
// need a specific relative import shim, prefer a precise wildcard above.

export {};
// Shims for relative service modules that are frequently imported with .js
declare module '../../infrastructure/database/database-service.js' {
  const databaseService: any;
  export default databaseService;
}

declare module '../../features/bills/real-time-tracking.js' {
  export const realTimeTracker: any;
  export default realTimeTracker;
}

declare module '../utils/test-helpers.js' {
  export const TestHelpers: any;
  export const PerformanceUtils: any;
  export default TestHelpers;
}

declare module '*database-service.js' {
  const databaseService: any;
  export default databaseService;
}

declare module '*performance-monitoring.js' {
  const performanceMonitoring: any;
  export default performanceMonitoring;
}

// Broad shims for common relative imports under server
declare module '../../services/*' {
  const whatever: any;
  export default whatever;
}

declare module '../services/*' {
  const whatever: any;
  export default whatever;
}

declare module './*' {
  const whatever: any;
  export default whatever;
}





































