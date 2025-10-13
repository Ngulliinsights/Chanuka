# Optimized Health Monitoring System - Task 7

## Key Improvements Overview

The refined system introduces several critical enhancements that address production concerns while maintaining the zero-downtime, drop-in nature of the original design.

## Enhanced Type System

```typescript
// core/src/health/types.ts
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  check(): Promise<HealthResult>;
  // Optional configuration for check-specific behavior
  timeout?: number;
  critical?: boolean; // Whether this check failing should mark overall system as unhealthy
  tags?: string[]; // For grouping and filtering checks
}

export interface HealthResult {
  status: HealthStatus;
  latencyMs: number;
  error?: string;
  details?: Record<string, any>;
  // Timestamp when this specific check was performed
  timestamp: string;
  // Optional warning messages for degraded state
  warnings?: string[];
}

export interface OverallHealth {
  status: HealthStatus;
  uptime: number;
  environment: string;
  version: string;
  timestamp: string;
  // Enhanced check results with metadata
  checks: Record<string, HealthResult & { critical: boolean; tags: string[] }>;
  // Summary statistics
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical_failures: number;
  };
}

export interface HealthCheckerConfig {
  timeoutMs?: number;
  // Parallel vs sequential execution
  parallelExecution?: boolean;
  // Whether to fail fast on first critical failure
  failFast?: boolean;
  // Cache results for this many milliseconds to avoid overwhelming checks
  cacheMs?: number;
  // Tags to include/exclude
  includeTags?: string[];
  excludeTags?: string[];
}
```

## Improved Health Checker with Caching and Error Resilience

```typescript
// core/src/health/HealthChecker.ts
import { HealthCheck, HealthResult, OverallHealth, HealthCheckerConfig, HealthStatus } from './types';
import { Logger } from '../logging';

interface CachedResult {
  result: HealthResult;
  timestamp: number;
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private cache: Map<string, CachedResult> = new Map();
  private startTime = Date.now();
  private logger = Logger.getInstance();

  constructor(private config: HealthCheckerConfig = {}) {
    // Set sensible defaults
    this.config = {
      timeoutMs: 5000,
      parallelExecution: true,
      failFast: false,
      cacheMs: 0, // No caching by default
      ...config
    };
  }

  register(check: HealthCheck): void {
    if (this.checks.has(check.name)) {
      throw new Error(`Health check with name '${check.name}' is already registered`);
    }
    this.checks.set(check.name, check);
    this.logger.info(`Registered health check: ${check.name}`, {
      critical: check.critical ?? false,
      tags: check.tags ?? []
    });
  }

  unregister(checkName: string): boolean {
    const removed = this.checks.delete(checkName);
    this.cache.delete(checkName);
    if (removed) {
      this.logger.info(`Unregistered health check: ${checkName}`);
    }
    return removed;
  }

  async run(): Promise<OverallHealth> {
    const filteredChecks = this.getFilteredChecks();
    
    if (filteredChecks.length === 0) {
      return this.buildEmptyResponse();
    }

    const checkResults = await this.executeChecks(filteredChecks);
    return this.buildHealthResponse(checkResults);
  }

  private getFilteredChecks(): Array<{ name: string; check: HealthCheck }> {
    const allChecks = Array.from(this.checks.entries()).map(([name, check]) => ({ name, check }));
    
    return allChecks.filter(({ check }) => {
      // Filter by include tags
      if (this.config.includeTags?.length) {
        const checkTags = check.tags ?? [];
        if (!this.config.includeTags.some(tag => checkTags.includes(tag))) {
          return false;
        }
      }
      
      // Filter by exclude tags
      if (this.config.excludeTags?.length) {
        const checkTags = check.tags ?? [];
        if (this.config.excludeTags.some(tag => checkTags.includes(tag))) {
          return false;
        }
      }
      
      return true;
    });
  }

  private async executeChecks(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    if (this.config.parallelExecution) {
      return this.executeChecksParallel(filteredChecks);
    } else {
      return this.executeChecksSequential(filteredChecks);
    }
  }

  private async executeChecksParallel(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    const promises = filteredChecks.map(async ({ name, check }) => {
      const result = await this.executeCheck(name, check);
      return { name, result, check };
    });

    return Promise.all(promises);
  }

  private async executeChecksSequential(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    const results = [];
    
    for (const { name, check } of filteredChecks) {
      const result = await this.executeCheck(name, check);
      results.push({ name, result, check });
      
      // Fail fast if configured and this is a critical check that failed
      if (this.config.failFast && check.critical && result.status === 'unhealthy') {
        this.logger.warn(`Failing fast due to critical check failure: ${name}`);
        break;
      }
    }
    
    return results;
  }

  private async executeCheck(name: string, check: HealthCheck): Promise<HealthResult> {
    // Check cache first
    if (this.config.cacheMs && this.config.cacheMs > 0) {
      const cached = this.cache.get(name);
      if (cached && Date.now() - cached.timestamp < this.config.cacheMs) {
        this.logger.debug(`Using cached result for health check: ${name}`);
        return cached.result;
      }
    }

    const start = Date.now();
    
    try {
      const timeoutMs = check.timeout ?? this.config.timeoutMs!;
      const result = await this.withTimeout(check.check(), timeoutMs);
      
      // Add timestamp to result
      const timestampedResult = {
        ...result,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result if caching is enabled
      if (this.config.cacheMs && this.config.cacheMs > 0) {
        this.cache.set(name, {
          result: timestampedResult,
          timestamp: Date.now()
        });
      }
      
      // Log the result for monitoring
      this.logger.debug(`Health check completed: ${name}`, {
        status: result.status,
        latencyMs: result.latencyMs,
        critical: check.critical ?? false
      });
      
      return timestampedResult;
      
    } catch (error: any) {
      const latencyMs = Date.now() - start;
      const errorResult: HealthResult = {
        status: 'unhealthy',
        latencyMs,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.logger.error(`Health check failed: ${name}`, {
        error: error.message,
        latencyMs,
        critical: check.critical ?? false
      });
      
      return errorResult;
    }
  }

  private buildHealthResponse(
    checkResults: Array<{ name: string; result: HealthResult; check: HealthCheck }>
  ): OverallHealth {
    const checks: Record<string, HealthResult & { critical: boolean; tags: string[] }> = {};
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    let criticalFailures = 0;
    
    for (const { name, result, check } of checkResults) {
      checks[name] = {
        ...result,
        critical: check.critical ?? false,
        tags: check.tags ?? []
      };
      
      switch (result.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'degraded':
          degradedCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          if (check.critical) {
            criticalFailures++;
          }
          break;
      }
    }
    
    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';
    if (criticalFailures > 0) {
      overallStatus = 'unhealthy';
    } else if (unhealthyCount > 0 || degradedCount > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      uptime: Date.now() - this.startTime,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '0.0.0',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checkResults.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        critical_failures: criticalFailures
      }
    };
  }

  private buildEmptyResponse(): OverallHealth {
    return {
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '0.0.0',
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        critical_failures: 0
      }
    };
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
      ),
    ]);
  }
}
```

## Enhanced Database Health Check with Connection Pool Monitoring

```typescript
// core/src/health/checks/database.check.ts
import { HealthCheck, HealthResult, HealthStatus } from '../types';
import { DatabaseService } from '../../database';

export interface DatabaseHealthConfig {
  // Query to test database connectivity (defaults to SELECT 1)
  testQuery?: string;
  // Maximum acceptable query latency in milliseconds
  maxLatencyMs?: number;
  // Minimum number of available connections in pool
  minPoolConnections?: number;
}

export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';
  critical = true; // Database is typically critical
  tags = ['infrastructure', 'storage'];

  constructor(
    private db: DatabaseService,
    private config: DatabaseHealthConfig = {}
  ) {
    this.config = {
      testQuery: 'SELECT 1',
      maxLatencyMs: 1000,
      minPoolConnections: 1,
      ...config
    };
  }

  async check(): Promise<HealthResult> {
    const start = Date.now();
    const details: Record<string, any> = {};
    const warnings: string[] = [];

    try {
      // Test basic connectivity
      await this.db.query(this.config.testQuery!);
      const latencyMs = Date.now() - start;
      
      // Check connection pool status if available
      if (typeof this.db.getPoolStatus === 'function') {
        const poolStatus = this.db.getPoolStatus();
        details.pool = poolStatus;
        
        if (poolStatus.available < this.config.minPoolConnections!) {
          warnings.push(`Low available connections: ${poolStatus.available} < ${this.config.minPoolConnections}`);
        }
        
        if (poolStatus.waiting > 0) {
          warnings.push(`${poolStatus.waiting} connections waiting for pool`);
        }
      }
      
      // Determine status based on latency and warnings
      let status: HealthStatus = 'healthy';
      if (latencyMs > this.config.maxLatencyMs!) {
        status = 'degraded';
        warnings.push(`High latency: ${latencyMs}ms > ${this.config.maxLatencyMs}ms`);
      }
      
      if (warnings.length > 0 && status === 'healthy') {
        status = 'degraded';
      }
      
      return {
        status,
        latencyMs,
        details,
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        details,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

## Smart Redis Health Check with Cluster Support

```typescript
// core/src/health/checks/redis.check.ts
import { Redis, Cluster } from 'ioredis';
import { HealthCheck, HealthResult, HealthStatus } from '../types';

export interface RedisHealthConfig {
  maxLatencyMs?: number;
  testKey?: string;
  checkClusterNodes?: boolean;
}

export class RedisHealthCheck implements HealthCheck {
  name = 'redis';
  critical = false; // Redis might be used for caching, not always critical
  tags = ['infrastructure', 'cache'];

  constructor(
    private redis: Redis | Cluster,
    private config: RedisHealthConfig = {}
  ) {
    this.config = {
      maxLatencyMs: 100,
      testKey: 'health:ping',
      checkClusterNodes: true,
      ...config
    };
  }

  async check(): Promise<HealthResult> {
    const start = Date.now();
    const details: Record<string, any> = {};
    const warnings: string[] = [];

    try {
      // Test basic connectivity with ping
      await this.redis.ping();
      let latencyMs = Date.now() - start;
      
      // Test read/write operations
      const testStart = Date.now();
      await this.redis.setex(this.config.testKey!, 10, 'ping');
      const value = await this.redis.get(this.config.testKey!);
      const rwLatency = Date.now() - testStart;
      
      if (value !== 'ping') {
        throw new Error('Redis read/write test failed');
      }
      
      latencyMs = Math.max(latencyMs, rwLatency);
      details.operations = { ping: Date.now() - start, readWrite: rwLatency };
      
      // Check cluster status if this is a cluster connection
      if (this.redis instanceof Cluster && this.config.checkClusterNodes) {
        const nodes = this.redis.nodes();
        const nodeStatuses = await Promise.allSettled(
          nodes.map(async (node) => {
            const nodeStart = Date.now();
            await node.ping();
            return { 
              status: node.status,
              latency: Date.now() - nodeStart,
              address: `${node.options.host}:${node.options.port}`
            };
          })
        );
        
        const healthyNodes = nodeStatuses.filter(result => result.status === 'fulfilled').length;
        const totalNodes = nodeStatuses.length;
        
        details.cluster = {
          totalNodes,
          healthyNodes,
          nodes: nodeStatuses.map(result => 
            result.status === 'fulfilled' ? result.value : { error: 'rejected' }
          )
        };
        
        if (healthyNodes < totalNodes) {
          warnings.push(`${totalNodes - healthyNodes} cluster nodes unhealthy`);
        }
      }
      
      // Check memory usage
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        details.memoryUsed = parseInt(memoryMatch[1]);
      }
      
      // Determine status
      let status: HealthStatus = 'healthy';
      if (latencyMs > this.config.maxLatencyMs!) {
        status = 'degraded';
        warnings.push(`High latency: ${latencyMs}ms > ${this.config.maxLatencyMs}ms`);
      }
      
      if (warnings.length > 0 && status === 'healthy') {
        status = 'degraded';
      }
      
      return {
        status,
        latencyMs,
        details,
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        details,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

## Advanced Memory Health Check with GC Monitoring

```typescript
// core/src/health/checks/memory.check.ts
import { HealthCheck, HealthResult, HealthStatus } from '../types';

export interface MemoryHealthConfig {
  maxRssBytes?: number;
  maxHeapUsedBytes?: number;
  warnRssBytes?: number;
  warnHeapUsedBytes?: number;
  checkGcStats?: boolean;
}

export class MemoryHealthCheck implements HealthCheck {
  name = 'memory';
  critical = true;
  tags = ['system', 'performance'];

  constructor(private config: MemoryHealthConfig = {}) {
    this.config = {
      maxRssBytes: 512 * 1024 * 1024, // 512MB
      warnRssBytes: 384 * 1024 * 1024, // 384MB
      maxHeapUsedBytes: 256 * 1024 * 1024, // 256MB  
      warnHeapUsedBytes: 192 * 1024 * 1024, // 192MB
      checkGcStats: true,
      ...config
    };
  }

  async check(): Promise<HealthResult> {
    const memUsage = process.memoryUsage();
    const details: Record<string, any> = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      limits: {
        maxRss: this.config.maxRssBytes,
        warnRss: this.config.warnRssBytes,
        maxHeap: this.config.maxHeapUsedBytes,
        warnHeap: this.config.warnHeapUsedBytes
      }
    };

    const warnings: string[] = [];
    let status: HealthStatus = 'healthy';

    // Check RSS memory
    if (memUsage.rss > this.config.maxRssBytes!) {
      status = 'unhealthy';
    } else if (memUsage.rss > this.config.warnRssBytes!) {
      status = 'degraded';
      warnings.push(`RSS memory high: ${Math.round(memUsage.rss / 1024 / 1024)}MB > ${Math.round(this.config.warnRssBytes! / 1024 / 1024)}MB`);
    }

    // Check heap memory
    if (memUsage.heapUsed > this.config.maxHeapUsedBytes!) {
      status = 'unhealthy';
    } else if (memUsage.heapUsed > this.config.warnHeapUsedBytes! && status === 'healthy') {
      status = 'degraded';
      warnings.push(`Heap memory high: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB > ${Math.round(this.config.warnHeapUsedBytes! / 1024 / 1024)}MB`);
    }

    // Add GC statistics if available and requested
    if (this.config.checkGcStats && global.gc) {
      try {
        const gcStats = (process as any).memoryUsage.gc?.();
        if (gcStats) {
          details.gc = gcStats;
        }
      } catch (error) {
        // GC stats might not be available, that's okay
      }
    }

    const error = status === 'unhealthy' ? 
      `Memory usage critical - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB` : 
      undefined;

    return {
      status,
      latencyMs: 0, // Memory check is synchronous
      error,
      details,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Enhanced Express Middleware with Multiple Endpoints

```typescript
// core/src/health/middleware/healthCheckEndpoint.ts
import { Request, Response, NextFunction } from 'express';
import { HealthChecker } from '../HealthChecker';
import { Logger } from '../../logging';

export interface HealthEndpointConfig {
  // Whether to include detailed check information
  includeDetails?: boolean;
  // Whether to cache responses
  cacheMs?: number;
  // Custom response transformation
  transformResponse?: (health: any) => any;
  // Security headers
  enableCors?: boolean;
  // Rate limiting
  maxRequestsPerMinute?: number;
}

export function createHealthEndpoints(
  checker: HealthChecker, 
  config: HealthEndpointConfig = {}
) {
  const logger = Logger.getInstance();
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  const applyRateLimit = (req: Request, res: Response): boolean => {
    if (!config.maxRequestsPerMinute) return true;
    
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    const clientData = requestCounts.get(clientId) || { count: 0, resetTime: now + windowMs };
    
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    clientData.count++;
    requestCounts.set(clientId, clientData);
    
    if (clientData.count > config.maxRequestsPerMinute) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return false;
    }
    
    return true;
  };

  // Main health endpoint
  const healthEndpoint = async (req: Request, res: Response) => {
    try {
      if (!applyRateLimit(req, res)) return;
      
      // Apply CORS if enabled
      if (config.enableCors) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
      }
      
      const report = await checker.run();
      
      // Transform response if transformer provided
      const response = config.transformResponse ? 
        config.transformResponse(report) : 
        report;
      
      // Set appropriate status code
      const statusCode = report.status === 'healthy' ? 200 : 
                        report.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(response);
      
      logger.debug('Health check completed', {
        status: report.status,
        checkCount: report.summary.total,
        criticalFailures: report.summary.critical_failures
      });
      
    } catch (error: any) {
      logger.error('Health endpoint failure', { error: error.message });
      res.status(503).json({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Lightweight readiness endpoint (for load balancers)
  const readinessEndpoint = async (req: Request, res: Response) => {
    try {
      if (!applyRateLimit(req, res)) return;
      
      const report = await checker.run();
      
      // Only return minimal data for readiness
      const ready = report.summary.critical_failures === 0;
      
      res.status(ready ? 200 : 503).json({
        ready,
        timestamp: report.timestamp
      });
      
    } catch (error: any) {
      res.status(503).json({ ready: false, error: error.message });
    }
  };

  // Liveness endpoint (very minimal for orchestrators)  
  const livenessEndpoint = (req: Request, res: Response) => {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({ alive: true, timestamp: new Date().toISOString() });
  };

  return {
    health: healthEndpoint,
    readiness: readinessEndpoint, 
    liveness: livenessEndpoint
  };
}

// Backward compatibility
export function healthCheckEndpoint(checker: HealthChecker, config?: HealthEndpointConfig) {
  return createHealthEndpoints(checker, config).health;
}
```

## Usage Example with All Enhancements

```typescript
// server/app.ts - Enhanced integration
import express from 'express';
import { HealthChecker, createHealthEndpoints } from '../core/src/health';
import { RedisHealthCheck, DatabaseHealthCheck, MemoryHealthCheck } from '../core/src/health';
import { Redis } from 'ioredis';
import { DatabaseService } from '../server/infrastructure/database';

const app = express();

// Create health checker with advanced configuration
const healthChecker = new HealthChecker({
  timeoutMs: 5000,
  parallelExecution: true,
  cacheMs: 30000, // Cache results for 30 seconds
  failFast: false
});

// Register checks with enhanced configuration
const redis = new Redis(process.env.REDIS_URL);
healthChecker.register(new RedisHealthCheck(redis, {
  maxLatencyMs: 50, // Stricter latency requirement
  checkClusterNodes: true
}));

const db = new DatabaseService();
healthChecker.register(new DatabaseHealthCheck(db, {
  maxLatencyMs: 500,
  minPoolConnections: 2
}));

healthChecker.register(new MemoryHealthCheck({
  maxRssBytes: 1024 * 1024 * 1024, // 1GB
  warnRssBytes: 768 * 1024 * 1024, // 768MB
  checkGcStats: true
}));

// Create multiple health endpoints
const healthEndpoints = createHealthEndpoints(healthChecker, {
  includeDetails: true,
  enableCors: true,
  maxRequestsPerMinute: 60,
  transformResponse: (health) => {
    // Custom response transformation for external consumers
    if (process.env.NODE_ENV === 'production') {
      // Remove sensitive details in production
      delete health.checks.database?.details?.pool;
    }
    return health;
  }
});

// Register the endpoints
app.get('/health', healthEndpoints.health);          // Detailed health info
app.get('/health/ready', healthEndpoints.readiness); // For load balancers  
app.get('/health/live', healthEndpoints.liveness);   // For orchestrators

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Health checks will automatically reflect unhealthy state
  // as connections close
});

export default app;
```
