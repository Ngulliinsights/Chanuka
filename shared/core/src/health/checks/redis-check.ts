/**
 * Redis Health Check
 * 
 * Comprehensive Redis health monitoring with cluster support
 * Based on patterns from optimized_health_system.md
 */

import { Redis, Cluster } from 'ioredis';
import { HealthCheck, HealthResult, HealthStatus } from '../types';
import { logger } from '../utils/logger';

export interface RedisHealthConfig {
  maxLatencyMs?: number;
  testKey?: string;
  checkClusterNodes?: boolean;
  checkMemoryUsage?: boolean;
  maxMemoryUsageBytes?: number;
}

export class RedisHealthCheck implements HealthCheck {
  name = 'redis';
  critical = false; // Redis might be used for caching, not always critical
  tags = ['infrastructure', 'cache'];
  timeout?: number;

  constructor(
    private redis: Redis | Cluster,
    private config: RedisHealthConfig = {}
  ) {
    this.config = {
      maxLatencyMs: 100,
      testKey: 'health:ping',
      checkClusterNodes: true,
      checkMemoryUsage: true,
      maxMemoryUsageBytes: 1024 * 1024 * 1024, // 1GB
      ...config
    };
    
    this.timeout = this.config.maxLatencyMs! * 3; // Allow 3x latency for timeout
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
      details.operations = { 
        ping: Date.now() - start, 
        readWrite: rwLatency 
      };
      
      // Check cluster status if this is a cluster connection
      if (this.redis instanceof Cluster && this.config.checkClusterNodes) {
        const clusterInfo = await this.checkClusterHealth();
        details.cluster = clusterInfo.details;
        warnings.push(...clusterInfo.warnings);
      }
      
      // Check memory usage
      if (this.config.checkMemoryUsage) {
        const memoryInfo = await this.checkMemoryUsage();
        details.memory = memoryInfo.details;
        warnings.push(...memoryInfo.warnings);
      }
      
      // Check Redis info
      const info = await this.redis.info('server');
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      if (versionMatch) {
        details.version = versionMatch[1];
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

  private async checkClusterHealth(): Promise<{
    details: Record<string, any>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      const cluster = this.redis as Cluster;
      const nodes = cluster.nodes();
      
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
      
      const details = {
        totalNodes,
        healthyNodes,
        nodes: nodeStatuses.map(result => 
          result.status === 'fulfilled' ? result.value : { error: 'rejected' }
        )
      };
      
      if (healthyNodes < totalNodes) {
        warnings.push(`${totalNodes - healthyNodes} cluster nodes unhealthy`);
      }
      
      if (healthyNodes === 0) {
        warnings.push('All cluster nodes are unhealthy');
      }
      
      return { details, warnings };
    } catch (error) {
      warnings.push(`Cluster health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { details: { error: 'cluster_check_failed' }, warnings };
    }
  }

  private async checkMemoryUsage(): Promise<{
    details: Record<string, any>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const maxMemoryMatch = info.match(/maxmemory:(\d+)/);
      
      const details: Record<string, any> = {};
      
      if (memoryMatch) {
        const usedMemory = parseInt(memoryMatch[1]);
        details.usedMemory = usedMemory;
        details.usedMemoryHuman = this.formatBytes(usedMemory);
        
        if (usedMemory > this.config.maxMemoryUsageBytes!) {
          warnings.push(`High memory usage: ${this.formatBytes(usedMemory)} > ${this.formatBytes(this.config.maxMemoryUsageBytes!)}`);
        }
      }
      
      if (maxMemoryMatch) {
        const maxMemory = parseInt(maxMemoryMatch[1]);
        details.maxMemory = maxMemory;
        details.maxMemoryHuman = this.formatBytes(maxMemory);
        
        if (memoryMatch && maxMemory > 0) {
          const usedMemory = parseInt(memoryMatch[1]);
          const usagePercent = (usedMemory / maxMemory) * 100;
          details.usagePercent = Math.round(usagePercent * 100) / 100;
          
          if (usagePercent > 90) {
            warnings.push(`Memory usage critical: ${usagePercent.toFixed(1)}%`);
          } else if (usagePercent > 80) {
            warnings.push(`Memory usage high: ${usagePercent.toFixed(1)}%`);
          }
        }
      }
      
      return { details, warnings };
    } catch (error) {
      warnings.push(`Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { details: { error: 'memory_check_failed' }, warnings };
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}






