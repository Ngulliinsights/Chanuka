#!/usr/bin/env tsx

/**
 * Database Integration Initialization Script
 * 
 * Initializes and tests the comprehensive database integration system
 */

import { config } from 'dotenv';
import { 
  createDatabaseIntegration, 
  getDatabaseIntegration,
  closeDatabaseIntegration,
  defaultDatabaseConfig 
} from '@server/infrastructure/database/index.js';
import { logger } from '@shared/core/src/index.js';

// Load environment variables
config();

async function initializeDatabaseIntegration() {
  logger.info('Starting database integration initialization', {
    component: 'DatabaseInit'
  });

  try {
    // Create database integration service
    const dbIntegration = createDatabaseIntegration(defaultDatabaseConfig);

    // Initialize the service
    await dbIntegration.initialize();

    // Run health check
    const healthStatus = await dbIntegration.getHealthStatus();
    
    logger.info('Database health check completed', {
      component: 'DatabaseInit',
      overall: healthStatus.overall,
      components: Object.keys(healthStatus.components).reduce((acc, key) => {
        acc[key] = healthStatus.components[key as keyof typeof healthStatus.components].status;
        return acc;
      }, {} as Record<string, string>)
    });

    // Display recommendations
    if (healthStatus.recommendations.length > 0) {
      logger.info('Database recommendations:', {
        component: 'DatabaseInit',
        recommendations: healthStatus.recommendations
      });
    }

    // Test basic database operations
    await testDatabaseOperations(dbIntegration);

    logger.info('Database integration initialization completed successfully', {
      component: 'DatabaseInit'
    });

    return dbIntegration;

  } catch (error) {
    logger.error('Database integration initialization failed', {
      component: 'DatabaseInit',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function testDatabaseOperations(dbIntegration: unknown) {
  logger.info('Testing database operations', {
    component: 'DatabaseInit'
  });

  try {
    // Test basic query
    const result = await dbIntegration.query('SELECT NOW() as current_time, version() as pg_version');
    logger.info('Database connection test successful', {
      component: 'DatabaseInit',
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version.split(' ')[0]
    });

    // Test transaction
    await dbIntegration.transaction(async (client: unknown) => {
      await client.query('SELECT 1 as test');
      logger.info('Database transaction test successful', {
        component: 'DatabaseInit'
      });
    });

    // Get service instances for additional testing
    const services = dbIntegration.getServices();

    // Test migration status
    const migrationStatus = await services.migrationManager.getMigrationStatus();
    logger.info('Migration status check', {
      component: 'DatabaseInit',
      currentVersion: migrationStatus.currentVersion,
      pendingMigrations: migrationStatus.pendingMigrations.length,
      appliedMigrations: migrationStatus.appliedMigrations.length
    });

    // Test connection pool metrics
    const poolMetrics = services.connectionPool.getMetrics();
    logger.info('Connection pool metrics', {
      component: 'DatabaseInit',
      totalConnections: poolMetrics.totalConnections,
      activeConnections: poolMetrics.activeConnections,
      idleConnections: poolMetrics.idleConnections,
      totalQueries: poolMetrics.totalQueries,
      averageQueryTime: `${poolMetrics.averageQueryTime.toFixed(2)}ms`
    });

    // Test monitoring (if enabled)
    if (defaultDatabaseConfig.monitoring.enabled) {
      const currentMetrics = services.monitoring.getCurrentMetrics();
      if (currentMetrics) {
        logger.info('Database monitoring active', {
          component: 'DatabaseInit',
          timestamp: currentMetrics.timestamp,
          connectionUtilization: `${currentMetrics.connections.utilizationPercent.toFixed(1)}%`,
          cacheHitRatio: `${currentMetrics.performance.cacheHitRatio.toFixed(1)}%`
        });
      }
    }

    logger.info('All database operation tests passed', {
      component: 'DatabaseInit'
    });

  } catch (error) {
    logger.error('Database operation test failed', {
      component: 'DatabaseInit',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function runValidationTest() {
  logger.info('Running database validation test', {
    component: 'DatabaseInit'
  });

  try {
    const dbIntegration = getDatabaseIntegration();
    const services = dbIntegration.getServices();

    // Run validation
    const validationReport = await services.validation.runValidation();
    
    logger.info('Database validation completed', {
      component: 'DatabaseInit',
      overallScore: `${validationReport.overallScore.toFixed(1)}%`,
      totalRules: validationReport.totalRules,
      passedRules: validationReport.passedRules,
      failedRules: validationReport.failedRules,
      criticalViolations: validationReport.criticalViolations
    });

    if (validationReport.recommendations.length > 0) {
      logger.info('Validation recommendations:', {
        component: 'DatabaseInit',
        recommendations: validationReport.recommendations
      });
    }

    // Run integrity checks
    const integrityResults = await services.validation.runIntegrityChecks();
    const failedChecks = integrityResults.filter(r => !r.passed);
    
    logger.info('Database integrity checks completed', {
      component: 'DatabaseInit',
      totalChecks: integrityResults.length,
      failedChecks: failedChecks.length
    });

    if (failedChecks.length > 0) {
      logger.warn('Integrity check failures found', {
        component: 'DatabaseInit',
        failures: failedChecks.map(f => ({
          checkType: f.checkType,
          table: f.table,
          issueCount: f.issueCount
        }))
      });
    }

  } catch (error) {
    logger.error('Database validation test failed', {
      component: 'DatabaseInit',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function runIndexAnalysisTest() {
  logger.info('Running database index analysis test', {
    component: 'DatabaseInit'
  });

  try {
    const dbIntegration = getDatabaseIntegration();
    const services = dbIntegration.getServices();

    // Run index analysis
    const indexReport = await services.indexOptimizer.analyzeIndexes();
    
    logger.info('Database index analysis completed', {
      component: 'DatabaseInit',
      totalIndexes: indexReport.totalIndexes,
      unusedIndexes: indexReport.unusedIndexes,
      missingIndexes: indexReport.missingIndexes.length,
      performanceImpact: indexReport.performanceImpact
    });

    // Show top recommendations
    const highPriorityMissing = indexReport.missingIndexes.filter(m => m.priority === 'high');
    if (highPriorityMissing.length > 0) {
      logger.info('High priority missing indexes:', {
        component: 'DatabaseInit',
        missing: highPriorityMissing.map(m => ({
          table: m.tableName,
          columns: m.columns,
          reason: m.reason
        }))
      });
    }

    const unusedRecommendations = indexReport.recommendations.filter(r => r.recommendation.action === 'drop');
    if (unusedRecommendations.length > 0) {
      logger.info('Unused indexes found:', {
        component: 'DatabaseInit',
        unused: unusedRecommendations.map(r => ({
          index: r.indexName,
          table: r.tableName,
          size: r.size,
          reason: r.recommendation.reason
        }))
      });
    }

  } catch (error) {
    logger.error('Database index analysis test failed', {
      component: 'DatabaseInit',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function main() {
  try {
    // Initialize database integration
    await initializeDatabaseIntegration();

    // Run validation test
    await runValidationTest();

    // Run index analysis test
    await runIndexAnalysisTest();

    logger.info('Database integration initialization and testing completed successfully', {
      component: 'DatabaseInit'
    });

    // Keep the process running for a bit to see monitoring in action
    if (defaultDatabaseConfig.monitoring.enabled) {
      logger.info('Monitoring is enabled. Keeping process alive for 30 seconds to observe metrics...', {
        component: 'DatabaseInit'
      });

      await new Promise(resolve => setTimeout(resolve, 30000));
    }

  } catch (error) {
    logger.error('Database integration initialization failed', {
      component: 'DatabaseInit',
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  } finally {
    // Clean shutdown
    await closeDatabaseIntegration();
    logger.info('Database integration shutdown completed', {
      component: 'DatabaseInit'
    });
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...', {
    component: 'DatabaseInit'
  });
  await closeDatabaseIntegration();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...', {
    component: 'DatabaseInit'
  });
  await closeDatabaseIntegration();
  process.exit(0);
});

// Run the initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}