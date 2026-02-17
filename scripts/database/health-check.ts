#!/usr/bin/env tsx

/**
 * Enhanced Database Health Check Script
 * 
 * Leverages the unified database infrastructure for comprehensive health monitoring.
 * This script demonstrates the new cohesive approach to database operations.
 * 
 * Usage:
 *   npm run db:health
 *   npm run db:health -- --detailed --continuous
 *   npm run db:health -- --json --performance
 */

import { BaseDatabaseScript, ScriptContext, ScriptResult, ScriptOptions } from '@server/infrastructure/database/utils/base-script';

// ============================================================================
// Enhanced Health Check Configuration
// ============================================================================

interface EnhancedHealthCheckOptions extends ScriptOptions {
  detailed?: boolean;
  performance?: boolean;
  continuous?: boolean;
  interval?: number;
  json?: boolean;
}

interface HealthCheckReport {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'critical';
  environment: string;
  uptime: number;
  components: {
    orchestrator: ComponentHealth;
    connections: ComponentHealth;
    performance: ComponentHealth;
    monitoring: ComponentHealth;
  };
  metrics: {
    responseTime: number;
    connectionUtilization: number;
    averageQueryTime: number;
    errorRate: number;
  };
  recommendations: string[];
}

interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
  duration: number;
}

// ============================================================================
// Enhanced Health Check Script Class
// ============================================================================

class EnhancedHealthCheckScript extends BaseDatabaseScript {
  constructor() {
    super('enhanced-health-check', 'Comprehensive database health monitoring using unified infrastructure');
  }

  protected parseArguments(args: string[]): EnhancedHealthCheckOptions {
    const baseOptions = super.parseArguments(args);
    const enhancedOptions: EnhancedHealthCheckOptions = { ...baseOptions };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--detailed':
          enhancedOptions.detailed = true;
          break;
        case '--performance':
          enhancedOptions.performance = true;
          break;
        case '--continuous':
          enhancedOptions.continuous = true;
          break;
        case '--interval':
          enhancedOptions.interval = parseInt(args[++i]) || 30000;
          break;
        case '--json':
          enhancedOptions.json = true;
          break;
      }
    }

    return enhancedOptions;
  }

  protected showHelp(): void {
    console.log(`
Enhanced Database Health Check - Unified Infrastructure

Usage: npm run db:health [options]

Options:
  --detailed             Run comprehensive health analysis
  --performance          Include performance benchmarking
  --continuous           Run continuous monitoring
  --interval <ms>        Set monitoring interval (default: 30000ms)
  --json                 Output results in JSON format
  --dry-run              Preview health checks without execution
  --verbose, -v          Enable verbose logging
  --force, -f            Skip confirmation prompts
  --environment <env>    Set environment (development, staging, production)
  --help, -h             Show this help message

Examples:
  npm run db:health                           # Basic health check
  npm run db:health -- --detailed            # Comprehensive analysis
  npm run db:health -- --performance         # Performance focus
  npm run db:health -- --continuous          # Continuous monitoring
  npm run db:health -- --json --detailed     # JSON output with details
    `);
  }

  async execute(context: ScriptContext): Promise<ScriptResult> {
    const options = context.options as EnhancedHealthCheckOptions;
    const startTime = Date.now();

    try {
      if (options.continuous) {
        return await this.runContinuousHealthCheck(context);
      } else {
        const report = await this.performHealthCheck(context);
        
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          this.displayHealthReport(report, context);
        }

        const duration = Date.now() - startTime;
        return {
          success: report.overall !== 'critical',
          message: `Health check completed - Status: ${report.overall}`,
          duration,
          details: report,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      context.logger.logError('Health check execution failed', error);
      
      return {
        success: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async performHealthCheck(context: ScriptContext): Promise<HealthCheckReport> {
    const { orchestrator, config, logger, options } = context;
    const enhancedOptions = options as EnhancedHealthCheckOptions;

    logger.logOperation('Starting comprehensive health check');

    const report: HealthCheckReport = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      environment: config.getCurrentEnvironment(),
      uptime: orchestrator.getUptime(),
      components: {
        orchestrator: await this.checkOrchestrator(orchestrator, logger),
        connections: await this.checkConnections(orchestrator, logger, enhancedOptions.detailed),
        performance: await this.checkPerformance(orchestrator, logger, enhancedOptions.performance),
        monitoring: await this.checkMonitoring(orchestrator, logger),
      },
      metrics: {
        responseTime: 0,
        connectionUtilization: 0,
        averageQueryTime: 0,
        errorRate: 0,
      },
      recommendations: [],
    };

    // Calculate overall health status
    const componentStatuses = Object.values(report.components).map(c => c.status);
    if (componentStatuses.includes('critical')) {
      report.overall = 'critical';
    } else if (componentStatuses.includes('warning')) {
      report.overall = 'warning';
    }

    // Calculate metrics
    await this.calculateMetrics(report, orchestrator);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    logger.logSuccess(`Health check completed - Overall status: ${report.overall}`);
    return report;
  }

  private async checkOrchestrator(orchestrator: unknown, logger: unknown): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      logger.logVerbose('Checking orchestrator status');
      
      const status = await orchestrator.getStatus();
      const duration = Date.now() - startTime;

      if (!status.initialized) {
        return {
          status: 'critical',
          message: 'Orchestrator not properly initialized',
          details: status,
          duration,
        };
      }

      if (!status.healthy) {
        return {
          status: 'warning',
          message: 'Orchestrator reports unhealthy status',
          details: status,
          duration,
        };
      }

      return {
        status: 'healthy',
        message: `Orchestrator operational (uptime: ${Math.round(status.uptime / 1000)}s)`,
        details: status,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'critical',
        message: `Orchestrator check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error },
        duration,
      };
    }
  }

  private async checkConnections(orchestrator: unknown, logger: unknown, detailed = false): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      logger.logVerbose('Checking connection health');
      
      const connectionManager = orchestrator.getConnectionManager();
      const healthStatus = await connectionManager.checkDatabaseHealth();
      const metrics = connectionManager.getMetrics();
      
      const duration = Date.now() - startTime;
      const utilizationPercent = (metrics.activeConnections / metrics.totalConnections) * 100;

      const details = detailed ? {
        healthStatus,
        metrics,
        utilizationPercent,
      } : {
        utilizationPercent,
        activeConnections: metrics.activeConnections,
        totalConnections: metrics.totalConnections,
      };

      if (!healthStatus.overall) {
        return {
          status: 'critical',
          message: 'Database connections are unhealthy',
          details,
          duration,
        };
      }

      if (utilizationPercent > 90) {
        return {
          status: 'critical',
          message: `Critical connection utilization: ${utilizationPercent.toFixed(1)}%`,
          details,
          duration,
        };
      }

      if (utilizationPercent > 70) {
        return {
          status: 'warning',
          message: `High connection utilization: ${utilizationPercent.toFixed(1)}%`,
          details,
          duration,
        };
      }

      return {
        status: 'healthy',
        message: `Connections healthy (${metrics.activeConnections}/${metrics.totalConnections} active)`,
        details,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'critical',
        message: `Connection check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error },
        duration,
      };
    }
  }

  private async checkPerformance(orchestrator: unknown, logger: unknown, detailed = false): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      logger.logVerbose('Checking performance metrics');
      
      const connectionManager = orchestrator.getConnectionManager();
      const metrics = connectionManager.getMetrics();
      
      // Perform a simple query test
      const queryStartTime = Date.now();
      const db = connectionManager.getDatabase();
      await db.execute('SELECT 1 as test');
      const queryTime = Date.now() - queryStartTime;
      
      const duration = Date.now() - startTime;

      const details = detailed ? {
        metrics,
        testQueryTime: queryTime,
        averageQueryTime: metrics.averageQueryTime,
        totalQueries: metrics.totalQueries,
      } : {
        testQueryTime: queryTime,
        averageQueryTime: metrics.averageQueryTime,
      };

      if (queryTime > 1000) {
        return {
          status: 'critical',
          message: `Critical query performance: ${queryTime}ms`,
          details,
          duration,
        };
      }

      if (queryTime > 500 || metrics.averageQueryTime > 500) {
        return {
          status: 'warning',
          message: `Slow query performance detected: ${queryTime}ms`,
          details,
          duration,
        };
      }

      return {
        status: 'healthy',
        message: `Performance optimal (query: ${queryTime}ms, avg: ${metrics.averageQueryTime.toFixed(1)}ms)`,
        details,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'critical',
        message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error },
        duration,
      };
    }
  }

  private async checkMonitoring(orchestrator: unknown, logger: unknown): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      logger.logVerbose('Checking monitoring systems');
      
      const healthMonitor = orchestrator.getHealthMonitor();
      const duration = Date.now() - startTime;

      if (!healthMonitor) {
        return {
          status: 'warning',
          message: 'Health monitoring not enabled',
          details: { enabled: false },
          duration,
        };
      }

      const isRunning = healthMonitor.isRunning();
      const metrics = healthMonitor.getMetrics();

      const details = {
        isRunning,
        metrics,
      };

      if (!isRunning) {
        return {
          status: 'warning',
          message: 'Health monitor not running',
          details,
          duration,
        };
      }

      return {
        status: 'healthy',
        message: `Monitoring active (${metrics.totalChecks} checks performed)`,
        details,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'warning',
        message: `Monitoring check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error },
        duration,
      };
    }
  }

  private async calculateMetrics(report: HealthCheckReport, orchestrator: unknown): Promise<void> {
    try {
      const metrics = await orchestrator.getMetrics();
      
      report.metrics = {
        responseTime: Date.now() - new Date(report.timestamp).getTime(),
        connectionUtilization: (metrics.connections.active / metrics.connections.total) * 100,
        averageQueryTime: metrics.performance.averageQueryTime,
        errorRate: metrics.performance.errorRate,
      };
    } catch (error) {
      // Use default metrics if calculation fails
      report.metrics = {
        responseTime: 0,
        connectionUtilization: 0,
        averageQueryTime: 0,
        errorRate: 0,
      };
    }
  }

  private generateRecommendations(report: HealthCheckReport): string[] {
    const recommendations: string[] = [];

    // Orchestrator recommendations
    if (report.components.orchestrator.status === 'critical') {
      recommendations.push('URGENT: Fix orchestrator initialization issues');
    }

    // Connection recommendations
    if (report.components.connections.status === 'critical') {
      recommendations.push('URGENT: Address critical connection issues');
    } else if (report.components.connections.status === 'warning') {
      recommendations.push('Monitor connection pool utilization - consider scaling');
    }

    // Performance recommendations
    if (report.components.performance.status === 'critical') {
      recommendations.push('URGENT: Investigate critical performance issues');
    } else if (report.components.performance.status === 'warning') {
      recommendations.push('Consider query optimization and indexing');
    }

    // Monitoring recommendations
    if (report.components.monitoring.status === 'warning') {
      recommendations.push('Enable or fix health monitoring systems');
    }

    // Metric-based recommendations
    if (report.metrics.connectionUtilization > 80) {
      recommendations.push('Consider increasing connection pool size');
    }

    if (report.metrics.averageQueryTime > 200) {
      recommendations.push('Review slow queries and database indexes');
    }

    if (report.metrics.errorRate > 0.05) {
      recommendations.push('Investigate high error rate in database operations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Database infrastructure is healthy - continue monitoring');
    }

    return recommendations;
  }

  private displayHealthReport(report: HealthCheckReport, context: ScriptContext): void {
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌'
    };

    console.log('\n🏥 Enhanced Database Health Report');
    console.log('==================================');
    console.log(`Overall Status: ${statusEmoji[report.overall]} ${report.overall.toUpperCase()}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Uptime: ${Math.round(report.uptime / 1000)}s`);
    console.log('');

    console.log('Component Health:');
    Object.entries(report.components).forEach(([name, component]) => {
      console.log(`  ${statusEmoji[component.status]} ${name}: ${component.message} (${component.duration}ms)`);
    });

    console.log('\nMetrics:');
    console.log(`  Response Time: ${report.metrics.responseTime}ms`);
    console.log(`  Connection Utilization: ${report.metrics.connectionUtilization.toFixed(1)}%`);
    console.log(`  Average Query Time: ${report.metrics.averageQueryTime.toFixed(1)}ms`);
    console.log(`  Error Rate: ${(report.metrics.errorRate * 100).toFixed(2)}%`);

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('');
  }

  private async runContinuousHealthCheck(context: ScriptContext): Promise<ScriptResult> {
    const { logger, options } = context;
    const enhancedOptions = options as EnhancedHealthCheckOptions;
    const interval = enhancedOptions.interval || 30000;
    
    logger.logOperation(`Starting continuous health monitoring (${interval}ms interval)`);
    logger.logOperation('Press Ctrl+C to stop');

    let checkCount = 0;
    const startTime = Date.now();

    const runCheck = async () => {
      try {
        checkCount++;
        logger.logVerbose(`Running health check #${checkCount}`);
        
        const report = await this.performHealthCheck(context);
        
        if (enhancedOptions.json) {
          console.log(JSON.stringify({ checkNumber: checkCount, ...report }, null, 2));
        } else {
          console.log(`\n--- Health Check #${checkCount} ---`);
          this.displayHealthReport(report, context);
        }
        
      } catch (error) {
        logger.logError(`Health check #${checkCount} failed`, error);
      }
    };

    // Run initial check
    await runCheck();

    // Set up interval
    const intervalId = setInterval(runCheck, interval);

    // Handle graceful shutdown
    const cleanup = () => {
      logger.logOperation('Stopping continuous health monitoring...');
      clearInterval(intervalId);
      
      const duration = Date.now() - startTime;
      logger.logComplete(`Continuous monitoring stopped after ${checkCount} checks`, duration);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Return a promise that never resolves (continuous operation)
    return new Promise(() => {});
  }
}

// ============================================================================
// Script Execution
// ============================================================================

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const script = new EnhancedHealthCheckScript();
  const args = process.argv.slice(2);
  
  script.run(args)
    .then((result) => {
      if (result.success) {
        console.log(`✅ ${result.message}`);
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Script execution failed:', error);
      process.exit(1);
    });
}

export { EnhancedHealthCheckScript };
export const runHealthCheck = {};

export const displayResults = {};
