/**
 * Memory Health Check
 * 
 * Advanced memory monitoring with GC statistics and heap analysis
 * Based on patterns from optimized_health_system.md
 */

import { HealthCheck, HealthResult, HealthStatus } from '../types';
import { logger } from '../../shared/core/src/utils/logger';

export interface MemoryHealthConfig {
  maxRssBytes?: number;
  maxHeapUsedBytes?: number;
  warnRssBytes?: number;
  warnHeapUsedBytes?: number;
  checkGcStats?: boolean;
  maxHeapUtilization?: number;
}

export class MemoryHealthCheck implements HealthCheck {
  name = 'memory';
  critical = true;
  tags = ['system', 'performance'];
  timeout = 1000; // Memory check should be fast

  constructor(private config: MemoryHealthConfig = {}) {
    this.config = {
      maxRssBytes: 512 * 1024 * 1024, // 512MB
      warnRssBytes: 384 * 1024 * 1024, // 384MB
      maxHeapUsedBytes: 256 * 1024 * 1024, // 256MB  
      warnHeapUsedBytes: 192 * 1024 * 1024, // 192MB
      checkGcStats: true,
      maxHeapUtilization: 0.9, // 90%
      ...config
    };
  }

  async check(): Promise<HealthResult> {
    const start = Date.now();
    const memUsage = process.memoryUsage();
    
    const details: Record<string, any> = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      heapUtilization: memUsage.heapTotal > 0 ? memUsage.heapUsed / memUsage.heapTotal : 0,
      formatted: {
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        external: this.formatBytes(memUsage.external),
        arrayBuffers: this.formatBytes(memUsage.arrayBuffers)
      },
      limits: {
        maxRss: this.config.maxRssBytes,
        warnRss: this.config.warnRssBytes,
        maxHeap: this.config.maxHeapUsedBytes,
        warnHeap: this.config.warnHeapUsedBytes,
        maxHeapUtilization: this.config.maxHeapUtilization
      }
    };

    const warnings: string[] = [];
    let status: HealthStatus = 'healthy';

    // Check RSS memory
    if (memUsage.rss > this.config.maxRssBytes!) {
      status = 'unhealthy';
    } else if (memUsage.rss > this.config.warnRssBytes!) {
      status = 'degraded';
      warnings.push(`RSS memory high: ${this.formatBytes(memUsage.rss)} > ${this.formatBytes(this.config.warnRssBytes!)}`);
    }

    // Check heap memory
    if (memUsage.heapUsed > this.config.maxHeapUsedBytes!) {
      status = 'unhealthy';
    } else if (memUsage.heapUsed > this.config.warnHeapUsedBytes! && status === 'healthy') {
      status = 'degraded';
      warnings.push(`Heap memory high: ${this.formatBytes(memUsage.heapUsed)} > ${this.formatBytes(this.config.warnHeapUsedBytes!)}`);
    }

    // Check heap utilization
    const heapUtilization = memUsage.heapTotal > 0 ? memUsage.heapUsed / memUsage.heapTotal : 0;
    if (heapUtilization > this.config.maxHeapUtilization!) {
      if (status === 'healthy') {
        status = 'degraded';
      }
      warnings.push(`High heap utilization: ${(heapUtilization * 100).toFixed(1)}% > ${(this.config.maxHeapUtilization! * 100).toFixed(1)}%`);
    }

    // Add GC statistics if available and requested
    if (this.config.checkGcStats) {
      const gcStats = this.getGcStats();
      if (gcStats) {
        details.gc = gcStats;
      }
    }

    // Add process information
    details.process = {
      pid: process.pid,
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };

    const error = status === 'unhealthy' ? 
      `Memory usage critical - RSS: ${this.formatBytes(memUsage.rss)}, Heap: ${this.formatBytes(memUsage.heapUsed)}` : 
      undefined;

    return {
      status,
      latencyMs: Date.now() - start,
      error,
      details,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString()
    };
  }

  private getGcStats(): Record<string, any> | null {
    try {
      // Try to get GC stats if available
      if (typeof (process as any).memoryUsage.gc === 'function') {
        return (process as any).memoryUsage.gc();
      }

      // Alternative: check if v8 module is available
      try {
        const v8 = require('v8');
        if (v8.getHeapStatistics) {
          const heapStats = v8.getHeapStatistics();
          const heapSpaceStats = v8.getHeapSpaceStatistics();
          
          return {
            heap: heapStats,
            spaces: heapSpaceStats
          };
        }
      } catch (v8Error) {
        // v8 module not available
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Create a memory health check with environment-specific configuration
 */
export function createMemoryHealthCheck(options: Partial<MemoryHealthConfig> = {}): MemoryHealthCheck {
  // Adjust defaults based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let config: MemoryHealthConfig;
  
  if (isProduction) {
    // More conservative limits for production
    config = {
      maxRssBytes: 1024 * 1024 * 1024, // 1GB
      warnRssBytes: 768 * 1024 * 1024, // 768MB
      maxHeapUsedBytes: 512 * 1024 * 1024, // 512MB
      warnHeapUsedBytes: 384 * 1024 * 1024, // 384MB
      checkGcStats: true,
      maxHeapUtilization: 0.85,
      ...options
    };
  } else if (isDevelopment) {
    // More relaxed limits for development
    config = {
      maxRssBytes: 2048 * 1024 * 1024, // 2GB
      warnRssBytes: 1536 * 1024 * 1024, // 1.5GB
      maxHeapUsedBytes: 1024 * 1024 * 1024, // 1GB
      warnHeapUsedBytes: 768 * 1024 * 1024, // 768MB
      checkGcStats: false, // Less overhead in dev
      maxHeapUtilization: 0.95,
      ...options
    };
  } else {
    // Default configuration
    config = {
      maxRssBytes: 512 * 1024 * 1024, // 512MB
      warnRssBytes: 384 * 1024 * 1024, // 384MB
      maxHeapUsedBytes: 256 * 1024 * 1024, // 256MB
      warnHeapUsedBytes: 192 * 1024 * 1024, // 192MB
      checkGcStats: true,
      maxHeapUtilization: 0.9,
      ...options
    };
  }
  
  return new MemoryHealthCheck(config);
}






