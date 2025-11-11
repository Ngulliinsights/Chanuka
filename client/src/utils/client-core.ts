/**
 * Client-Safe Core Utilities
 * Browser-compatible implementations of shared functionality
 */

import { initializeCSPReporting, getCSPConfig, setCSPHeader } from './csp-headers';

// Re-export logger and types from the main client logger
export { 
  logger, 
  type LogContext, 
  ErrorDomain, 
  ErrorSeverity, 
  BaseError,
  ValidationError 
} from './logger';

export interface Performance {
  mark: (name: string) => void;
  measure: (name: string, startMark: string, endMark: string) => void;
  getEntriesByType: (type: string) => PerformanceEntry[];
  clearMarks: () => void;
  clearMeasures: () => void;
}

// Browser-safe performance monitoring
// Error types are now exported from the main logger above

export const performanceMonitor: Performance = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        console.warn('Performance measurement failed:', e);
      }
    }
  },
  getEntriesByType: (type: string) => {
    if (typeof performance !== 'undefined') {
      return performance.getEntriesByType(type);
    }
    return [];
  },
  clearMarks: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
    }
  },
  clearMeasures: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMeasures();
    }
  }
};

// Initialize CSP reporting on module load
if (typeof document !== 'undefined') {
  initializeCSPReporting();

  // Set CSP header based on environment
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const cspConfig = getCSPConfig(environment);
  setCSPHeader(cspConfig);
}

// Simple validation service for API responses
export const validationService = {
  validate: async (schema: any, data: any) => {
    // Simple validation - in a real app this would use Zod or similar
    if (schema && typeof schema.parse === 'function') {
      return schema.parse(data);
    }
    return data;
  }
};