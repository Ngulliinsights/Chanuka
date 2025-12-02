// import { HealthCheck } from '../../types';
type HealthCheck = any;

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
    // const totalUsedMB = heapUsedMB + externalMB;

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
    // const path = await import('path');

    const paths = options.paths ?? ['.'];
    const minFreeSpaceMB = options.minFreeSpaceMB ?? 1024; // 1GB default
    const warningThreshold = options.warningThreshold ?? 0.1; // 10% free
    const criticalThreshold = options.criticalThreshold ?? 0.05; // 5% free

    const results: Array<{
      path: string;
      totalMB?: number;
      freeMB?: number;
      freeRatio?: number;
      available?: string;
      error?: string;
      status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    }> = [];

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
          resolve({ statusCode: res.statusCode || 200 });
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
 * API endpoint health check
 */
export const createApiEndpointHealthCheck = (options: {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  expectedStatusCodes?: number[];
  maxResponseTime?: number;
  timeout?: number;
  followRedirects?: boolean;
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    headerName?: string;
  };
}): HealthCheck => ({
  name: options.name,
  description: `Checks API endpoint ${options.url}`,
  timeout: options.timeout ?? 10000,
  check: async () => {
    const startTime = Date.now();

    try {
      const fetchOptions: RequestInit = {
        method: options.method ?? 'GET',
        headers: {
          'User-Agent': 'APIHealthCheck/1.0',
          'Accept': 'application/json',
          ...options.headers,
        },
        redirect: options.followRedirects ? 'follow' : 'manual',
      };

      // Add authentication
      if (options.auth) {
        switch (options.auth.type) {
          case 'bearer':
            if (options.auth.token) {
              fetchOptions.headers = {
                ...fetchOptions.headers,
                'Authorization': `Bearer ${options.auth.token}`,
              };
            }
            break;
          case 'basic':
            if (options.auth.username && options.auth.password) {
              const credentials = btoa(`${options.auth.username}:${options.auth.password}`);
              fetchOptions.headers = {
                ...fetchOptions.headers,
                'Authorization': `Basic ${credentials}`,
              };
            }
            break;
          case 'api-key':
            if (options.auth.token && options.auth.headerName) {
              fetchOptions.headers = {
                ...fetchOptions.headers,
                [options.auth.headerName]: options.auth.token,
              };
            }
            break;
        }
      }

      if (options.body) {
        fetchOptions.body = options.body;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 10000);
      fetchOptions.signal = controller.signal;

      const response = await fetch(options.url, fetchOptions);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const expectedCodes = options.expectedStatusCodes ?? [200, 201, 202, 204];
      const maxResponseTime = options.maxResponseTime ?? 5000;

      const details = {
        statusCode: response.status,
        statusText: response.statusText,
        responseTime: duration,
        url: options.url,
        method: options.method ?? 'GET',
      };

      // Check response time
      if (duration > maxResponseTime) {
        return {
          status: 'degraded',
          message: `API response too slow: ${duration}ms > ${maxResponseTime}ms`,
          timestamp: new Date(),
          duration,
          details,
        };
      }

      // Check status code
      if (!expectedCodes.includes(response.status)) {
        return {
          status: 'unhealthy',
          message: `Unexpected status code: ${response.status} ${response.statusText}`,
          timestamp: new Date(),
          duration,
          details: { ...details, expectedCodes },
        };
      }

      return {
        status: 'healthy',
        message: `API endpoint responded successfully in ${duration}ms`,
        timestamp: new Date(),
        duration,
        details,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        status: 'unhealthy',
        message: `API endpoint unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration,
        error: error instanceof Error ? error : undefined,
        details: {
          url: options.url,
          method: options.method ?? 'GET',
        },
      };
    }
  },
});

/**
 * API service health check (checks multiple endpoints)
 */
export const createApiServiceHealthCheck = (options: {
  name: string;
  baseUrl: string;
  endpoints: Array<{
    path: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
    expectedStatusCodes?: number[];
    weight?: number; // Importance weight for overall health calculation
  }>;
  headers?: Record<string, string>;
  timeout?: number;
  maxResponseTime?: number;
  minHealthyEndpoints?: number; // Minimum number of endpoints that must be healthy
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    headerName?: string;
  };
}): HealthCheck => ({
  name: options.name,
  description: `Checks API service at ${options.baseUrl}`,
  timeout: options.timeout ?? 30000,
  check: async () => {
    const startTime = Date.now();
    const results: Array<{
      endpoint: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      statusCode?: number;
      error?: string;
    }> = [];

    let totalWeight = 0;
    let healthyWeight = 0;

    for (const endpoint of options.endpoints) {
      const endpointStartTime = Date.now();
      const weight = endpoint.weight ?? 1;
      totalWeight += weight;

      try {
        const url = options.baseUrl.replace(/\/$/, '') + endpoint.path;
        const fetchOptions: RequestInit = {
          method: endpoint.method ?? 'GET',
          headers: {
            'User-Agent': 'APIServiceHealthCheck/1.0',
            'Accept': 'application/json',
            ...options.headers,
          },
        };

        // Add authentication
        if (options.auth) {
          switch (options.auth.type) {
            case 'bearer':
              if (options.auth.token) {
                fetchOptions.headers = {
                  ...fetchOptions.headers,
                  'Authorization': `Bearer ${options.auth.token}`,
                };
              }
              break;
            case 'basic':
              if (options.auth.username && options.auth.password) {
                const credentials = btoa(`${options.auth.username}:${options.auth.password}`);
                fetchOptions.headers = {
                  ...fetchOptions.headers,
                  'Authorization': `Basic ${credentials}`,
                };
              }
              break;
            case 'api-key':
              if (options.auth.token && options.auth.headerName) {
                fetchOptions.headers = {
                  ...fetchOptions.headers,
                  [options.auth.headerName]: options.auth.token,
                };
              }
              break;
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 30000);
        fetchOptions.signal = controller.signal;

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const responseTime = Date.now() - endpointStartTime;
        const expectedCodes = endpoint.expectedStatusCodes ?? [200, 201, 202, 204];
        const maxResponseTime = options.maxResponseTime ?? 5000;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (!expectedCodes.includes(response.status)) {
          status = 'unhealthy';
        } else if (responseTime > maxResponseTime) {
          status = 'degraded';
        }

        results.push({
          endpoint: endpoint.path,
          status,
          responseTime,
          statusCode: response.status,
        });

        if (status === 'healthy') {
          healthyWeight += weight;
        }

      } catch (error) {
        const responseTime = Date.now() - endpointStartTime;
        results.push({
          endpoint: endpoint.path,
          status: 'unhealthy',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const minHealthy = options.minHealthyEndpoints ?? Math.ceil(options.endpoints.length * 0.8); // 80% default
    const healthRatio = totalWeight > 0 ? healthyWeight / totalWeight : 0;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyCount < minHealthy) {
      overallStatus = 'unhealthy';
    } else if (healthRatio < 0.9) { // Less than 90% healthy by weight
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      message: `API service: ${healthyCount}/${options.endpoints.length} endpoints healthy`,
      timestamp: new Date(),
      duration,
      details: {
        baseUrl: options.baseUrl,
        endpoints: results,
        summary: {
          total: options.endpoints.length,
          healthy: healthyCount,
          unhealthy: results.filter(r => r.status === 'unhealthy').length,
          degraded: results.filter(r => r.status === 'degraded').length,
          healthRatio,
          minHealthyRequired: minHealthy,
        },
      },
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








































