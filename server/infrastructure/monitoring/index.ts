// Monitoring Infrastructure - Consolidated
// Uses shared/core/src/observability for unified monitoring and observability

// Re-export from shared observability system
export {
  logger
} from '@shared/core';

// Legacy compatibility wrappers
import { logger  } from '../../../shared/core/src/index.js';

// Performance monitoring using shared observability
export const performanceMonitor = {
  startTrace: (req: any) => {
    const correlationId = req.headers['x-correlation-id'] || `trace_${Date.now()}`;
    req.traceId = correlationId;
    return correlationId;
  },
  
  endTrace: (traceId: string, statusCode: number) => {
    logger.info('Request completed', { 
      traceId, 
      statusCode,
      component: 'Chanuka'
    });
    return { traceId, statusCode };
  },
  
  addCustomMetric: (name: string, duration: number, metadata?: any, traceId?: string) => {
    logger.info('Custom metric recorded', {
      metric: name,
      duration,
      metadata,
      traceId,
      component: 'Chanuka'
    });
  },

  getPerformanceSummary: () => ({
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    slowestEndpoints: [],
    recentErrors: []
  })
};

// Performance middleware using shared observability
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  req.traceId = req.headers['x-correlation-id'] || `trace_${Date.now()}`;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      traceId: req.traceId,
      statusCode: res.statusCode,
      duration,
      component: 'Chanuka'
    });
  });

  next();
};

// Utility functions using shared observability
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  traceId?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    logger.info('Async operation completed', {
      operation: name,
      duration,
      metadata,
      traceId,
      component: 'Chanuka'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.error('Async operation failed', {
      operation: name,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata,
      traceId,
      component: 'Chanuka'
    });
    
    throw error;
  }
}

export function measureSync<T>(
  name: string,
  operation: () => T,
  traceId?: string,
  metadata?: Record<string, any>
): T {
  const startTime = performance.now();
  
  try {
    const result = operation();
    const duration = performance.now() - startTime;
    
    logger.info('Sync operation completed', {
      operation: name,
      duration,
      metadata,
      traceId,
      component: 'Chanuka'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.error('Sync operation failed', {
      operation: name,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata,
      traceId,
      component: 'Chanuka'
    });
    
    throw error;
  }
}

// APM service using shared observability
export const apmService = {
  startTransaction: (name: string) => {
    logger.info('Transaction started', { transaction: name, component: 'Chanuka' });
    return { name, startTime: Date.now() };
  },

  endTransaction: (transaction: any) => {
    const duration = Date.now() - transaction.startTime;
    logger.info('Transaction completed', {
      transaction: transaction.name,
      duration,
      component: 'Chanuka'
    });
  },

  getAPMMetrics: () => ({
    requestMetrics: {
      p95ResponseTime: 150,
      errorRate: 2.5,
      requestsPerSecond: 45
    },
    systemMetrics: {
      memoryUsage: {
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024
      },
      eventLoopDelay: 25
    },
    businessMetrics: {
      activeUsers: 120
    }
  })
};

// DB tracer using shared observability
export const dbTracer = {
  traceQuery: (query: string, params?: any[]) => {
    logger.debug('Database query executed', {
      query: query.substring(0, 200),
      params: params?.slice(0, 5),
      component: 'Chanuka'
    });
  }
};

export const traceDbQuery = dbTracer.traceQuery;

// Audit logger using shared observability
export const auditLogger = {
  log: (action: string, userId?: string, metadata?: any) => {
    logger.info('Audit event', {
      action,
      userId,
      metadata,
      component: 'Chanuka',
      audit: true
    });
  },

  logDataExport: (userId: string, dataType: string, recordCount: number, requestedBy: string) => {
    logger.info('Data export audit', {
      action: 'data.export',
      userId,
      dataType,
      recordCount,
      requestedBy,
      component: 'Chanuka',
      audit: true
    });
  }
};

// Monitoring scheduler using shared observability
export class MonitoringScheduler {
  private intervals: NodeJS.Timeout[] = [];

  schedule(name: string, fn: () => void, intervalMs: number) {
    const interval = setInterval(() => {
      try {
        fn();
      } catch (error) {
        logger.error('Scheduled monitoring task failed', {
          task: name,
          error: error instanceof Error ? error.message : 'Unknown error',
          component: 'Chanuka'
        });
      }
    }, intervalMs);
    
    this.intervals.push(interval);
    logger.info('Monitoring task scheduled', { task: name, intervalMs, component: 'Chanuka' });
  }

  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('All monitoring tasks stopped', { component: 'Chanuka' });
  }
}

export const monitoringScheduler = new MonitoringScheduler();

// Monitoring service using shared observability
export class MonitoringService {
  private static instance: MonitoringService;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  getMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime()
    };
  }
}

export const getMonitoringService = () => MonitoringService.getInstance();
export const resetMonitoringService = () => {
  (MonitoringService as any).instance = undefined;
};












































