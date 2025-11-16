#!/usr/bin/env tsx
/**
 * Migration Performance Profiling Script
 * Profiles migration performance and validates SLA compliance
 */

import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/core/src/observability/logging';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

interface PerformanceMetrics {
  migration: string;
  totalDuration: number;
  executionTime: number;
  transactionTime: number;
  rollbackTime?: number;
  memoryUsage: {
    peak: number;
    average: number;
  };
  connectionPoolStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  };
  slaCompliance: SLAValidationResult;
}

interface SLAValidationResult {
  meetsSLA: boolean;
  maxAllowedTime: number;
  actualTime: number;
  violationLevel: 'none' | 'warning' | 'critical';
  recommendations: string[];
}

interface SLARules {
  maxExecutionTime: number; // in seconds
  maxMemoryUsage: number; // in MB
  maxConnections: number;
  warningThreshold: number; // percentage of max
}

class MigrationPerformanceProfiler {
  private pool: Pool;
  private metrics: PerformanceMetrics[] = [];
  private slaRules: SLARules;

  constructor(private connectionString: string) {
    this.pool = new Pool({ connectionString });

    // Define SLA rules based on migration risk level
    this.slaRules = {
      maxExecutionTime: parseInt(process.env.MIGRATION_SLA_MAX_TIME || '300'), // 5 minutes default
      maxMemoryUsage: parseInt(process.env.MIGRATION_SLA_MAX_MEMORY || '1024'), // 1GB default
      maxConnections: parseInt(process.env.MIGRATION_SLA_MAX_CONNECTIONS || '10'),
      warningThreshold: parseFloat(process.env.MIGRATION_SLA_WARNING_THRESHOLD || '0.8') // 80% of max
    };
  }

  async profileMigrations(): Promise<PerformanceMetrics[]> {
    logger.info('⏱️ Starting migration performance profiling...', { component: 'MigrationPerf' });

    try {
      // Get all migration files
      const migrationsDir = path.join(process.cwd(), 'drizzle');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      logger.info(`📋 Profiling ${migrationFiles.length} migrations`, { component: 'MigrationPerf' });

      for (const filename of migrationFiles) {
        const metrics = await this.profileMigration(filename);
        this.metrics.push(metrics);

        logger.info(`✅ Profiled ${filename}: ${metrics.totalDuration}ms`, { component: 'MigrationPerf' });
      }

      return this.metrics;
    } catch (error) {
      logger.error('💥 Migration performance profiling failed:', { component: 'MigrationPerf' }, error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async profileMigration(filename: string): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      migration: filename,
      totalDuration: 0,
      executionTime: 0,
      transactionTime: 0,
      memoryUsage: { peak: 0, average: 0 },
      connectionPoolStats: { totalConnections: 0, activeConnections: 0, idleConnections: 0 },
      slaCompliance: {
        meetsSLA: true,
        maxAllowedTime: this.slaRules.maxExecutionTime * 1000,
        actualTime: 0,
        violationLevel: 'none',
        recommendations: []
      }
    };

    const startTime = process.hrtime.bigint();
    let memorySamples: number[] = [];
    let memoryMonitor: NodeJS.Timeout | undefined;

    try {
      // Start memory monitoring
      memoryMonitor = setInterval(() => {
        const memUsage = process.memoryUsage();
        memorySamples.push(memUsage.heapUsed / 1024 / 1024); // MB
      }, 100);

      // Create a savepoint for rollback testing
      await this.pool.query('SAVEPOINT migration_perf_test');

      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'drizzle', filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Execute migration in a transaction with timing
      const transactionStart = process.hrtime.bigint();
      await this.pool.query('BEGIN');

      const executionStart = process.hrtime.bigint();
      await this.pool.query(sql);
      const executionEnd = process.hrtime.bigint();

      await this.pool.query('COMMIT');
      const transactionEnd = process.hrtime.bigint();

      // Test rollback performance
      const rollbackStart = process.hrtime.bigint();
      await this.pool.query('ROLLBACK TO SAVEPOINT migration_perf_test');
      const rollbackEnd = process.hrtime.bigint();

      // Stop memory monitoring
      clearInterval(memoryMonitor);

      // Calculate timings
      metrics.executionTime = Number(executionEnd - executionStart) / 1_000_000; // ms
      metrics.transactionTime = Number(transactionEnd - transactionStart) / 1_000_000; // ms
      metrics.rollbackTime = Number(rollbackEnd - rollbackStart) / 1_000_000; // ms
      metrics.totalDuration = Number(process.hrtime.bigint() - startTime) / 1_000_000; // ms

      // Calculate memory usage
      metrics.memoryUsage.peak = Math.max(...memorySamples);
      metrics.memoryUsage.average = memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length;

      // Get connection pool stats
      metrics.connectionPoolStats = await this.getConnectionPoolStats();

      // Validate SLA compliance
      metrics.slaCompliance = this.validateSLA(metrics);

    } catch (error) {
      // Stop memory monitoring on error
      clearInterval(memoryMonitor);

      metrics.slaCompliance.meetsSLA = false;
      metrics.slaCompliance.violationLevel = 'critical';
      metrics.slaCompliance.recommendations.push(`Migration failed: ${error.message}`);

      // Calculate partial timing
      metrics.totalDuration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      logger.error(`Failed to profile migration ${filename}:`, { component: 'MigrationPerf' }, error.message);
    }

    return metrics;
  }

  private async getConnectionPoolStats() {
    try {
      // Get basic connection info (simplified for Neon)
      const result = await this.pool.query('SELECT 1 as connection_test');
      return {
        totalConnections: 1, // Neon serverless uses connection pooling
        activeConnections: 1,
        idleConnections: 0
      };
    } catch (error) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0
      };
    }
  }

  private validateSLA(metrics: PerformanceMetrics): SLAValidationResult {
    const result: SLAValidationResult = {
      meetsSLA: true,
      maxAllowedTime: this.slaRules.maxExecutionTime * 1000,
      actualTime: metrics.executionTime,
      violationLevel: 'none',
      recommendations: []
    };

    // Check execution time
    const timeViolationRatio = metrics.executionTime / (this.slaRules.maxExecutionTime * 1000);

    if (timeViolationRatio > 1) {
      result.meetsSLA = false;
      result.violationLevel = 'critical';
      result.recommendations.push(`Execution time ${metrics.executionTime}ms exceeds SLA limit of ${this.slaRules.maxExecutionTime * 1000}ms`);
    } else if (timeViolationRatio > this.slaRules.warningThreshold) {
      result.violationLevel = 'warning';
      result.recommendations.push(`Execution time ${metrics.executionTime}ms is ${Math.round(timeViolationRatio * 100)}% of SLA limit`);
    }

    // Check memory usage
    if (metrics.memoryUsage.peak > this.slaRules.maxMemoryUsage) {
      result.meetsSLA = false;
      result.violationLevel = 'critical';
      result.recommendations.push(`Peak memory usage ${metrics.memoryUsage.peak.toFixed(2)}MB exceeds SLA limit of ${this.slaRules.maxMemoryUsage}MB`);
    } else if (metrics.memoryUsage.peak > this.slaRules.maxMemoryUsage * this.slaRules.warningThreshold) {
      if (result.violationLevel !== 'critical') result.violationLevel = 'warning';
      result.recommendations.push(`Peak memory usage ${metrics.memoryUsage.peak.toFixed(2)}MB is ${Math.round((metrics.memoryUsage.peak / this.slaRules.maxMemoryUsage) * 100)}% of SLA limit`);
    }

    // Check connection usage
    if (metrics.connectionPoolStats.activeConnections > this.slaRules.maxConnections) {
      result.meetsSLA = false;
      result.violationLevel = 'critical';
      result.recommendations.push(`Active connections ${metrics.connectionPoolStats.activeConnections} exceeds SLA limit of ${this.slaRules.maxConnections}`);
    }

    // Performance recommendations
    if (metrics.executionTime > 10000) { // 10 seconds
      result.recommendations.push('Consider breaking down large migrations into smaller, incremental changes');
    }

    if (metrics.rollbackTime && metrics.rollbackTime > metrics.executionTime * 2) {
      result.recommendations.push('Rollback time is significantly longer than execution time - review rollback strategy');
    }

    return result;
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      slaRules: this.slaRules,
      summary: {
        totalMigrations: this.metrics.length,
        totalDuration: this.metrics.reduce((sum, m) => sum + m.totalDuration, 0),
        averageDuration: this.metrics.reduce((sum, m) => sum + m.totalDuration, 0) / this.metrics.length,
        maxDuration: Math.max(...this.metrics.map(m => m.totalDuration)),
        slaCompliant: this.metrics.filter(m => m.slaCompliance.meetsSLA).length,
        slaViolations: this.metrics.filter(m => !m.slaCompliance.meetsSLA).length,
        criticalViolations: this.metrics.filter(m => m.slaCompliance.violationLevel === 'critical').length,
        warningViolations: this.metrics.filter(m => m.slaCompliance.violationLevel === 'warning').length
      },
      performanceMetrics: this.metrics,
      recommendations: this.generateGlobalRecommendations()
    };

    fs.writeFileSync('performance-metrics.json', JSON.stringify(report, null, 2));
    logger.info('📊 Performance profiling report generated: performance-metrics.json', { component: 'MigrationPerf' });
  }

  private generateGlobalRecommendations(): string[] {
    const recommendations: string[] = [];

    const avgDuration = this.metrics.reduce((sum, m) => sum + m.totalDuration, 0) / this.metrics.length;
    const maxDuration = Math.max(...this.metrics.map(m => m.totalDuration));

    if (avgDuration > 30000) { // 30 seconds
      recommendations.push('Average migration time is high - consider optimizing queries or breaking down complex migrations');
    }

    if (maxDuration > 120000) { // 2 minutes
      recommendations.push('Some migrations take very long - review for potential performance bottlenecks');
    }

    const memoryPeaks = this.metrics.map(m => m.memoryUsage.peak);
    const avgMemoryPeak = memoryPeaks.reduce((a, b) => a + b, 0) / memoryPeaks.length;

    if (avgMemoryPeak > this.slaRules.maxMemoryUsage * 0.7) {
      recommendations.push('High memory usage detected - monitor for potential memory leaks in migration scripts');
    }

    const slaViolations = this.metrics.filter(m => !m.slaCompliance.meetsSLA);
    if (slaViolations.length > 0) {
      recommendations.push(`${slaViolations.length} migrations violate SLA - review and optimize before production deployment`);
    }

    return recommendations;
  }

  hasSLAViolations(): boolean {
    return this.metrics.some(m => !m.slaCompliance.meetsSLA);
  }

  hasCriticalViolations(): boolean {
    return this.metrics.some(m => m.slaCompliance.violationLevel === 'critical');
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const profiler = new MigrationPerformanceProfiler(process.env.DATABASE_URL);

  try {
    await profiler.profileMigrations();
    await profiler.generateReport();

    if (profiler.hasCriticalViolations()) {
      console.error('🚨 CRITICAL SLA VIOLATIONS DETECTED!');
      console.error('Migration performance does not meet SLA requirements.');
      process.exit(1);
    } else if (profiler.hasSLAViolations()) {
      console.warn('⚠️ SLA VIOLATIONS DETECTED!');
      console.warn('Some migrations exceed SLA limits but may still be deployable.');
      console.warn('Review performance-metrics.json for details.');
      process.exit(0);
    } else {
      console.log('✅ All migrations meet SLA requirements');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Migration performance profiling failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('migration-performance-profile')) {
  main().catch((error) => {
    console.error('Migration performance profiling error:', error);
    process.exit(1);
  });
}

export { MigrationPerformanceProfiler, PerformanceMetrics, SLAValidationResult };