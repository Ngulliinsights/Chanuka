import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/core/index.js';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: Array<{
    path: string;
    method: string;
    duration: number;
    timestamp: Date;
  }>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowRequests: []
  };
  
  private responseTimes: number[] = [];
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly MAX_SLOW_REQUESTS = 100;

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  recordRequest(duration: number, req: Request) {
    this.metrics.requestCount++;
    this.responseTimes.push(duration);
    
    // Calculate rolling average (last 1000 requests)
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    // Track slow requests
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests.push({
        path: req.path,
        method: req.method,
        duration,
        timestamp: new Date()
      });
      
      // Keep only recent slow requests
      if (this.metrics.slowRequests.length > this.MAX_SLOW_REQUESTS) {
        this.metrics.slowRequests.shift();
      }
    }
  }
}

const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to capture timing
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Record performance metrics
    performanceMonitor.recordRequest(duration, req);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        component: 'Chanuka',
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export { performanceMonitor };
