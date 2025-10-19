import { HealthCheck } from './types';

// ==================== Built-in Health Checks ====================

/**
 * Memory health check
 */
export const createMemoryHealthCheck = (options: {
  maxHeapUsageMB?: number;
  maxExternalUsageMB?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
} = {}): HealthCheck => ({
  name: 'memory',
  description: 'Checks system memory usage',
  check: async () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    const totalUsedMB = heapUsedMB + externalMB;

    const maxHeap = options.maxHeapUsageMB ?? 1024; // 1GB default
    const maxExternal = options.maxExternalUsageMB ?? 512; // 512MB default
    const warningThreshold = options.warningThreshold ?? 0.8;
    const criticalThreshold = options.criticalThreshold ?? 0.9;

    const heapRatio = heapUsedMB / maxHeap;
    const externalRatio = externalMB / maxExternal;
    const maxRatio = Math.max(heapRatio, externalRatio);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (maxRatio >= criticalThreshold) {
      status = 'unhealthy';
    } else if (maxRatio >= warningThreshold) {
      status = 'degraded';
    }

    return {
      status,
      message: `Memory usage: ${heapUsedMB}MB heap, ${externalMB}MB external`,
      timestamp: new Date(),
      duration: 0,
      details: {
        heapUsed: heapUsedMB,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: externalMB,
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapRatio,
        externalRatio,
        maxRatio,
      },
    };
  },
});

/**
 * Disk space health check
 */
export const createDiskHealthCheck = (options: {
  paths?: string[];
  minFreeSpaceMB?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
} = {}): HealthCheck => ({
  name: 'disk',
  description: 'Checks disk space availability',
  check: async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const paths = options.paths ?? ['.'];
    const minFreeSpaceMB = options.minFreeSpaceMB ?? 1024; // 1GB default
    const warningThreshold = options.warningThreshold ?? 0.1; // 10% free
    const criticalThreshold = options.criticalThreshold ?? 0.05; // 5% free

    const results = [];

    for (const checkPath of paths) {
      try {
        const stats = await (fs as any).statvfs ? (fs as any).statvfs(checkPath) : null;

        if (!stats) {
          // Fallback for systems without statvfs
          results.push({
            path: checkPath,
            available: 'unknown',
            status: 'unknown' as const,
          });
          continue;
        }

        const total = Number(stats.blocks) * Number(stats.frsize);
        const free = Number(stats.bavail) * Number(stats.frsize);
        const freeMB = Math.round(free / 1024 / 1024);
        const freeRatio = free / total;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (freeMB < minFreeSpaceMB || freeRatio <= criticalThreshold) {
          status = 'unhealthy';
        } else if (freeRatio <= warningThreshold) {
          status = 'degraded';
        }

        results.push({
          path: checkPath,
          totalMB: Math.round(total / 1024 / 1024),
          freeMB,
          freeRatio,
          status,
        });
      } catch (error) {
        results.push({
          path: checkPath,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'unhealthy' as const,
        });
      }
    }

    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      message: `Disk check completed for ${paths.length} path(s)`,
      timestamp: new Date(),
      duration: 0,
      details: { paths: results },
    };
  },
});

/**
 * External service health check
 */
export const createExternalServiceHealthCheck = (options: {
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatusCodes?: number[];
  body?: string;
  followRedirects?: boolean;
}): HealthCheck => ({
  name: `external-service:${new URL(options.url).hostname}`,
  description: `Checks external service at ${options.url}`,
  check: async () => {
    const startTime = Date.now();

    try {
      const https = await import('https');
      const http = await import('http');
      const url = new URL(options.url);

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method ?? 'GET',
        headers: {
          'User-Agent': 'HealthCheck/1.0',
          ...options.headers,
        },
        timeout: options.timeout ?? 5000,
        rejectUnauthorized: false, // Allow self-signed certificates
      };

      const result = await new Promise<{ statusCode?: number; error?: Error }>((resolve) => {
        const req = (url.protocol === 'https:' ? https : http).request(requestOptions, (res) => {
          resolve({ statusCode: res.statusCode });
        });

        req.on('error', (error) => {
          resolve({ error });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ error: new Error('Request timeout') });
        });

        if (options.body) {
          req.write(options.body);
        }

        req.end();
      });

      const duration = Date.now() - startTime;

      if (result.error) {
        return {
          status: 'unhealthy',
          message: `Service unreachable: ${result.error.message}`,
          timestamp: new Date(),
          duration,
          error: result.error,
        };
      }

      const expectedCodes = options.expectedStatusCodes ?? [200, 201, 202, 204];
      const isExpectedStatus = result.statusCode && expectedCodes.includes(result.statusCode);

      if (!isExpectedStatus) {
        return {
          status: 'unhealthy',
          message: `Unexpected status code: ${result.statusCode}`,
          timestamp: new Date(),
          duration,
          details: { statusCode: result.statusCode, expectedCodes },
        };
      }

      return {
        status: 'healthy',
        message: `Service responded with status ${result.statusCode}`,
        timestamp: new Date(),
        duration,
        details: { statusCode: result.statusCode, url: options.url },
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration,
        error: error instanceof Error ? error : undefined,
      };
    }
  },
});

/**
 * Process health check
 */
export const createProcessHealthCheck = (options: {
  pid?: number;
  processName?: string;
  checkMemory?: boolean;
  checkCpu?: boolean;
  maxMemoryMB?: number;
  maxCpuPercent?: number;
} = {}): HealthCheck => ({
  name: 'process',
  description: 'Checks current process health',
  check: async () => {
    const details: Record<string, unknown> = {};

    // Check if process is running
    try {
      process.kill(options.pid ?? process.pid, 0); // Signal 0 doesn't kill, just checks
      details.running = true;
    } catch {
      return {
        status: 'unhealthy',
        message: 'Process is not running',
        timestamp: new Date(),
        duration: 0,
        details: { pid: options.pid ?? process.pid },
      };
    }

    // Memory check
    if (options.checkMemory !== false) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const maxMemoryMB = options.maxMemoryMB ?? 2048; // 2GB default

      details.heapUsedMB = heapUsedMB;
      details.maxMemoryMB = maxMemoryMB;

      if (heapUsedMB > maxMemoryMB) {
        return {
          status: 'unhealthy',
          message: `Memory usage too high: ${heapUsedMB}MB > ${maxMemoryMB}MB`,
          timestamp: new Date(),
          duration: 0,
          details,
        };
      }
    }

    // CPU check (simplified - in production you'd want more sophisticated monitoring)
    if (options.checkCpu !== false) {
      // This is a basic check - production systems should use proper CPU monitoring
      details.cpuUsage = 'unknown';
    }

    return {
      status: 'healthy',
      message: 'Process is healthy',
      timestamp: new Date(),
      duration: 0,
      details,
    };
  },
});

/**
 * Custom health check factory
 */
export const createCustomHealthCheck = (options: {
  name: string;
  description?: string;
  checkFunction: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string; details?: Record<string, unknown> }>;
  timeout?: number;
  tags?: string[];
}): HealthCheck => ({
  name: options.name,
  description: options.description,
  timeout: options.timeout ?? 5000,
  tags: options.tags,
  check: async () => {
    const startTime = Date.now();

    try {
      const result = await options.checkFunction();
      const duration = Date.now() - startTime;

      return {
        status: result.status,
        message: result.message,
        timestamp: new Date(),
        duration,
        details: result.details,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: `Custom check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration,
        error: error instanceof Error ? error : undefined,
      };
    }
  },
});

// ==================== Pre-configured Health Checks ====================

export const defaultHealthChecks = {
  memory: createMemoryHealthCheck(),
  disk: createDiskHealthCheck(),
  process: createProcessHealthCheck(),
} as const;




































