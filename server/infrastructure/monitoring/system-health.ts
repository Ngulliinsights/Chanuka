import { database as db } from '../../../shared/database/connection.js';
import { sql } from 'drizzle-orm';
import os from 'os';
import process from 'process';
import { logger } from '@shared/core/src/observability/logging';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  checks: {
    database: { status: 'pass' | 'warn' | 'fail'; message: string; responseTime?: number };
    memory: { status: 'pass' | 'warn' | 'fail'; message: string; usage?: number };
    api: { status: 'pass' | 'warn' | 'fail'; message: string; errorRate?: number };
    errors: { status: 'pass' | 'warn' | 'fail'; message: string; count?: number };
  };
  recommendations: string[];
}

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connected: boolean;
    responseTime: number;
    activeConnections: number;
    queryStats: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
      errorRate: number;
    };
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    unresolvedErrors: number;
  };
}

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errors: {
    rate: number;
    count: number;
    types: { [key: string]: number };
  };
  database: {
    queryTime: {
      average: number;
      slowQueries: number;
    };
    connections: {
      active: number;
      idle: number;
      total: number;
    };
  };
}

export class SystemHealthService {
  private static instance: SystemHealthService;
  private metricsHistory: SystemMetrics[] = [];
  private errorCounts: Map<string, number> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private queryTimes: number[] = [];

  public static getInstance(): SystemHealthService {
    if (!SystemHealthService.instance) {
      SystemHealthService.instance = new SystemHealthService();
    }
    return SystemHealthService.instance;
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    const checks = {
      database: await this.checkDatabase(),
      memory: await this.checkMemory(),
      api: await this.checkAPI(),
      errors: await this.checkErrors()
    };

    const score = this.calculateHealthScore(checks);
    const status = this.determineHealthStatus(score);
    const recommendations = this.generateRecommendations(checks);

    return {
      status,
      score,
      checks,
      recommendations
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const databaseMetrics = await this.getDatabaseMetrics();
    const apiMetrics = this.getAPIMetrics();
    const errorMetrics = this.getErrorMetrics();

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      uptime: process.uptime() * 1000, // Convert to milliseconds
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
        loadAverage: os.loadavg()
      },
      database: databaseMetrics,
      api: apiMetrics,
      errors: errorMetrics
    };

    // Store metrics history (keep last 100 entries)
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const responseTimesArray = [...this.responseTimes];
    responseTimesArray.sort((a, b) => a - b);

    const p50Index = Math.floor(responseTimesArray.length * 0.5);
    const p95Index = Math.floor(responseTimesArray.length * 0.95);
    const p99Index = Math.floor(responseTimesArray.length * 0.99);

    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);

    const errorTypes: { [key: string]: number } = {};
    this.errorCounts.forEach((count, type) => {
      errorTypes[type] = count;
    });

    return {
      responseTime: {
        p50: responseTimesArray[p50Index] || 0,
        p95: responseTimesArray[p95Index] || 0,
        p99: responseTimesArray[p99Index] || 0,
        average: responseTimesArray.reduce((sum, time) => sum + time, 0) / responseTimesArray.length || 0
      },
      throughput: {
        requestsPerSecond: totalRequests / 60, // Approximate
        requestsPerMinute: totalRequests,
        requestsPerHour: totalRequests * 60
      },
      errors: {
        rate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        count: totalErrors,
        types: errorTypes
      },
      database: {
        queryTime: {
          average: this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length || 0,
          slowQueries: this.queryTimes.filter(time => time > 1000).length
        },
        connections: {
          active: 5, // Would get from actual connection pool
          idle: 3,
          total: 8
        }
      }
    };
  }

  // Method to record API request metrics
  recordAPIRequest(responseTime: number, statusCode: number, endpoint: string) {
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    const key = `${endpoint}_${Math.floor(statusCode / 100)}xx`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    if (statusCode >= 400) {
      const errorKey = `${statusCode}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }
  }

  // Method to record database query metrics
  recordDatabaseQuery(queryTime: number, success: boolean) {
    this.queryTimes.push(queryTime);
    
    // Keep only last 1000 query times
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }

    if (!success) {
      this.errorCounts.set('database_error', (this.errorCounts.get('database_error') || 0) + 1);
    }
  }

  private async checkDatabase(): Promise<{ status: 'pass' | 'warn' | 'fail'; message: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          status: 'warn',
          message: 'Database responding slowly',
          responseTime
        };
      }

      return {
        status: 'pass',
        message: 'Database healthy',
        responseTime
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connection failed'
      };
    }
  }

  private async checkMemory(): Promise<{ status: 'pass' | 'warn' | 'fail'; message: string; usage?: number }> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    if (memoryUsagePercent > 90) {
      return {
        status: 'fail',
        message: 'Critical memory usage',
        usage: memoryUsagePercent
      };
    } else if (memoryUsagePercent > 80) {
      return {
        status: 'warn',
        message: 'High memory usage',
        usage: memoryUsagePercent
      };
    }

    return {
      status: 'pass',
      message: 'Memory usage normal',
      usage: memoryUsagePercent
    };
  }

  private async checkAPI(): Promise<{ status: 'pass' | 'warn' | 'fail'; message: string; errorRate?: number }> {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    if (errorRate > 10) {
      return {
        status: 'fail',
        message: 'High API error rate',
        errorRate
      };
    } else if (errorRate > 5) {
      return {
        status: 'warn',
        message: 'Elevated API error rate',
        errorRate
      };
    }

    return {
      status: 'pass',
      message: 'API performing well',
      errorRate
    };
  }

  private async checkErrors(): Promise<{ status: 'pass' | 'warn' | 'fail'; message: string; count?: number }> {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const criticalErrors = this.errorCounts.get('500') || 0;

    if (criticalErrors > 10) {
      return {
        status: 'fail',
        message: 'Multiple critical errors detected',
        count: totalErrors
      };
    } else if (totalErrors > 50) {
      return {
        status: 'warn',
        message: 'Elevated error count',
        count: totalErrors
      };
    }

    return {
      status: 'pass',
      message: 'Error levels normal',
      count: totalErrors
    };
  }

  private calculateHealthScore(checks: SystemHealth['checks']): number {
    let score = 100;
    
    Object.values(checks).forEach(check => {
      if (check.status === 'fail') {
        score -= 25;
      } else if (check.status === 'warn') {
        score -= 10;
      }
    });

    return Math.max(0, score);
  }

  private determineHealthStatus(score: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'degraded';
    return 'unhealthy';
  }

  private generateRecommendations(checks: SystemHealth['checks']): string[] {
    const recommendations: string[] = [];

    if (checks.database.status === 'fail') {
      recommendations.push('Check database connection and restart if necessary');
    } else if (checks.database.status === 'warn') {
      recommendations.push('Monitor database performance and consider optimization');
    }

    if (checks.memory.status === 'fail') {
      recommendations.push('Critical memory usage - restart application or increase memory allocation');
    } else if (checks.memory.status === 'warn') {
      recommendations.push('Monitor memory usage and consider garbage collection optimization');
    }

    if (checks.api.status === 'fail') {
      recommendations.push('High API error rate - check logs and fix critical issues');
    } else if (checks.api.status === 'warn') {
      recommendations.push('Monitor API performance and investigate error patterns');
    }

    if (checks.errors.status === 'fail') {
      recommendations.push('Multiple critical errors detected - immediate investigation required');
    } else if (checks.errors.status === 'warn') {
      recommendations.push('Review error logs and address recurring issues');
    }

    return recommendations;
  }

  private async getDatabaseMetrics() {
    try {
      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
        activeConnections: 5, // Would get from actual connection pool
        queryStats: {
          totalQueries: this.queryTimes.length,
          averageQueryTime: this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length || 0,
          slowQueries: this.queryTimes.filter(time => time > 1000).length,
          errorRate: (this.errorCounts.get('database_error') || 0) / Math.max(this.queryTimes.length, 1) * 100
        }
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: 0,
        activeConnections: 0,
        queryStats: {
          totalQueries: 0,
          averageQueryTime: 0,
          slowQueries: 0,
          errorRate: 100
        }
      };
    }
  }

  private getAPIMetrics() {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length || 0;

    return {
      totalRequests,
      averageResponseTime,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      requestsPerMinute: totalRequests // Simplified calculation
    };
  }

  private getErrorMetrics() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const criticalErrors = (this.errorCounts.get('500') || 0) + (this.errorCounts.get('database_error') || 0);

    return {
      totalErrors,
      errorRate: totalErrors / 60, // Errors per minute (simplified)
      criticalErrors,
      unresolvedErrors: Math.floor(totalErrors * 0.1) // Assume 10% unresolved
    };
  }

  // Method to get metrics history for charts
  getMetricsHistory(limit = 50): SystemMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  // Method to clear old metrics (for memory management)
  clearOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(metric => metric.timestamp > oneHourAgo);
    
    // Clear old request/error counts
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.responseTimes.splice(0, Math.max(0, this.responseTimes.length - 500));
    this.queryTimes.splice(0, Math.max(0, this.queryTimes.length - 500));
  }
}

export const systemHealthService = SystemHealthService.getInstance();






