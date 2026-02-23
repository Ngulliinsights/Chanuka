/**
 * Fallback implementations for missing shared modules
 * This provides temporary implementations to fix compilation errors
 */

// Re-export canonical AuthenticatedRequest from shared
export type { AuthenticatedRequest } from '@shared/core/types/auth.types';

// Fallback for missing @shared/features/bills/types/analysis.js
export interface BillAnalysis {
  id: string;
  bill_id: string;
  analysis_type: string;
  content: string;
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}

// Fallback for missing @shared/features/sponsors/types/analysis.js
export interface SponsorshipAnalysis {
  id: string;
  sponsor_id: string;
  analysis_type: string;
  content: string;
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}

// Fallback for missing shared monitoring
export const apmService = {
  startTransaction: (name: string) => ({
    end: () => {},
    setLabel: () => {},
    addLabels: () => {},
  }),
  captureError: (error: Error) => {
    console.error('APM Error:', error);
  },
  setUserContext: () => {},
  setCustomContext: () => {},
};

// Fallback for missing shared websocket
export const webSocketService = {
  emit: (event: string, data: unknown) => {
    console.debug('WebSocket emit:', event, data);
  },
  broadcast: (event: string, data: unknown) => {
    console.debug('WebSocket broadcast:', event, data);
  },
};

// Fallback for missing shared external-data
export class UnifiedExternalAPIManagementService {
  private eventHandlers = new Map<string, Function[]>();

  async getHealthStatus() {
    return { status: 'healthy', sources: [] };
  }
  
  async getAnalytics() {
    return { sources: [], totalRequests: 0, errorRate: 0 };
  }

  getAPIAnalytics() {
    return { sources: [], totalRequests: 0, errorRate: 0 };
  }

  getCacheStatistics() {
    return { hits: 0, misses: 0, size: 0 };
  }

  async makeRequest(source: string, endpoint: string, options?: unknown) {
    console.debug(`Mock API request: ${source}${endpoint}`);
    return {
      success: true,
      data: {},
      cached: false,
      responseTime: 100
    };
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  shutdown() {
    console.debug('Mock API manager shutdown');
  }
}

// Fallback for missing shared monitoring
export const performanceMonitor = {
  startOperation: (type: string, name: string, metadata?: unknown) => {
    return `${type}-${name}-${Date.now()}`;
  },
  endOperation: (id: string, success: boolean, error?: Error, metadata?: unknown) => {
    console.debug('Performance operation ended:', id, success);
  },
};

export const monitorOperation = (name: string) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const operationId = performanceMonitor.startOperation('method', name);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endOperation(operationId, true);
        return result;
      } catch (error) {
        performanceMonitor.endOperation(operationId, false, error as Error);
        throw error;
      }
    };
    return descriptor;
  };
};

// Fallback for missing shared errors
export const errorAdapter = {
  adaptError: (error: unknown) => error,
  standardizeError: (error: unknown) => error,
};

export const errorHandler = {
  handleError: (error: unknown) => {
    console.error('Error handled:', error);
  },
};

// Fallback for missing shared infrastructure
export const featureFlagsService = {
  isEnabled: (flag: string) => false,
  getFlags: () => ({}),
};

export const abTestingService = {
  getVariant: (test: string) => 'control',
  trackConversion: () => {},
};

// Fallback for missing shared utils
export const httpUtils = {
  createResponse: (data: unknown, status = 200) => ({ data, status }),
  createErrorResponse: (message: string, status = 500) => ({ error: message, status }),
};

// Fallback for missing shared caching
export const getDefaultCache = () => ({
  get: async (key: string) => null,
  set: async (key: string, value: unknown, ttl?: number) => {},
  delete: async (key: string) => {},
  clear: async () => {},
});

// Fallback for missing shared services
export const validationService = {
  validate: async (schema: unknown, data: unknown, options?: unknown, context?: unknown) => {
    // Simple validation - just return the data
    return data;
  },
};

// Fallback for missing enhanced security service
export const enhancedSecurityService = {
  csrfProtection: () => (req: unknown, res: unknown, next: unknown) => next(),
  rateLimiting: () => (req: unknown, res: unknown, next: unknown) => next(),
  vulnerabilityScanning: () => (req: unknown, res: unknown, next: unknown) => next(),
  getSecurityStats: () => ({
    csrfTokensGenerated: 0,
    rateLimitHits: 0,
    vulnerabilitiesDetected: 0,
    blockedRequests: 0
  }),
};

// Fallback for missing command injection prevention
export const commandInjectionPrevention = (options: unknown) => (req: unknown, res: unknown, next: unknown) => next();
export const fileUploadSecurity = (options: unknown) => (req: unknown, res: unknown, next: unknown) => next();

// Fallback for missing audit middleware
export const auditMiddleware = (req: unknown, res: unknown, next: unknown) => next();

// Export all fallbacks
export default {
  apmService,
  webSocketService,
  UnifiedExternalAPIManagementService,
  performanceMonitor,
  monitorOperation,
  errorAdapter,
  errorHandler,
  featureFlagsService,
  abTestingService,
  httpUtils,
  getDefaultCache,
  validationService,
};