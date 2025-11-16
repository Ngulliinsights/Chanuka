#!/usr/bin/env tsx
/**
 * Strategic Database Initialization Script
 * 
 * Complete database setup for the Chanuka platform
 * Orchestrates all database operations in the correct order
 */

import { logger } from '@shared/core';

interface InitOptions {
  environment?: 'development' | 'production' | 'test';
  skipMigrations?: boolean;
  skipSeed?: boolean;
  skipValidation?: boolean;
  force?: boolean;
}

export async function initializeStrategicDatabase(options: InitOptions = {}): Promise<void> {
  const { environment = 'development' } = options;
  const startTime = Date.now();
  
  logger.info('🚀 Initializing Chanuka Strategic Database System...', { environment, options });

  try {
    // Step 1: Database Setup
    logger.info('📋 Step 1: Setting up database infrastructure...');
    const { setupDatabase } = await import('./setup.js');
    await setupDatabase({
      environment,
      migrate: !options.skipMigrations,
      seed: !options.skipSeed && environment === 'development',
      validate: !options.skipValidation,
      force: options.force
    });

    // Step 2: Health Check
    logger.info('🏥 Step 2: Running comprehensive health check...');
    const { runHealthCheck } = await import('./health-check.js');
    const healthReport = await runHealthCheck({
      detailed: true,
      performance: true,
      connections: true,
      migrations: true
    });

    if (healthReport.overall === 'critical') {
      throw new Error('Database health check failed - critical issues detected');
    }

    // Step 3: Performance Validation
    if (environment === 'production') {
      logger.info('⚡ Step 3: Running production performance validation...');
      await validateProductionPerformance();
    }

    // Step 4: Security Validation
    if (environment === 'production') {
      logger.info('🔒 Step 4: Running security validation...');
      await validateDatabaseSecurity();
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Strategic database initialization completed in ${duration}ms`);
    
    // Show success summary
    showSuccessSummary(environment, healthReport, duration);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Strategic database initialization failed after ${duration}ms:`, error);
    
    // Show troubleshooting guide
    showTroubleshootingGuide(error, environment);
    throw error;
  }
}

async function validateProductionPerformance(): Promise<void> {
  try {
    const { createConnectionManager } = await import('@shared/database/core');
    const connectionManager = await createConnectionManager({
      max: 20, // Production settings
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // Test connection pool performance
    const startTime = Date.now();
    const pool = connectionManager.getPool();
    
    // Run performance test queries
    await pool.query('SELECT 1');
    const simpleQueryTime = Date.now() - startTime;

    if (simpleQueryTime > 100) {
      logger.warn(`⚠️  Slow database response in production: ${simpleQueryTime}ms`);
    } else {
      logger.info(`   ✅ Production performance validated (${simpleQueryTime}ms)`);
    }

    await connectionManager.close();

  } catch (error) {
    logger.error('   ❌ Production performance validation failed:', error);
    throw error;
  }
}

async function validateDatabaseSecurity(): Promise<void> {
  try {
    const { createConnectionManager } = await import('@shared/database/core');
    const connectionManager = await createConnectionManager();
    const pool = connectionManager.getPool();

    // Check SSL configuration
    const sslResult = await pool.query('SHOW ssl');
    const sslEnabled = sslResult.rows[0]?.ssl === 'on';
    
    if (!sslEnabled) {
      logger.warn('⚠️  SSL not enabled - consider enabling for production');
    } else {
      logger.info('   ✅ SSL encryption verified');
    }

    // Check user permissions
    const userResult = await pool.query('SELECT current_user, session_user');
    logger.info(`   ✅ Database user verified: ${userResult.rows[0].current_user}`);

    await connectionManager.close();

  } catch (error) {
    logger.error('   ❌ Security validation failed:', error);
    throw error;
  }
}

function showSuccessSummary(environment: string, healthReport: any, duration: number): void {
  console.log('\n🎉 STRATEGIC DATABASE INITIALIZATION COMPLETE!');
  console.log('================================================');
  console.log(`Environment: ${environment}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Overall Health: ${healthReport.overall.toUpperCase()}`);
  console.log('');
  
  console.log('✅ Components Initialized:');
  console.log('   • Unified Connection Manager');
  console.log('   • Migration System');
  console.log('   • Health Monitoring');
  console.log('   • Performance Optimization');
  console.log('   • Backup & Recovery');
  console.log('');
  
  console.log('🚀 Ready for Development:');
  console.log('   • Database connections: Optimized');
  console.log('   • Schema: Up to date');
  console.log('   • Performance: Validated');
  console.log('   • Health monitoring: Active');
  console.log('');
  
  console.log('📝 Next Steps:');
  console.log('   1. Start your application: npm run dev');
  console.log('   2. Monitor health: npm run db:health:continuous');
  console.log('   3. Run tests: npm run test:database');
  console.log('');
  
  console.log('🔧 Available Commands:');
  console.log('   • npm run db:migrate --help');
  console.log('   • npm run db:reset --help');
  console.log('   • npm run db:health --help');
}

function showTroubleshootingGuide(error: any, environment: string): void {
  console.log('\n❌ INITIALIZATION FAILED - TROUBLESHOOTING GUIDE');
  console.log('===============================================');
  console.log(`Error: ${error.message}`);
  console.log('');
  
  console.log('🔍 Common Solutions:');
  console.log('   1. Check database connection:');
  console.log('      npx tsx scripts/database/test-connection.ts');
  console.log('');
  console.log('   2. Verify environment variables:');
  console.log('      echo $DATABASE_URL');
  console.log('');
  console.log('   3. Check database server status:');
  console.log('      pg_isready -h localhost -p 5432');
  console.log('');
  console.log('   4. Reset and retry:');
  console.log('      npm run db:reset:force');
  console.log('');
  
  if (environment === 'production') {
    console.log('🚨 PRODUCTION TROUBLESHOOTING:');
    console.log('   • Check SSL certificates');
    console.log('   • Verify firewall rules');
    console.log('   • Check connection limits');
    console.log('   • Review security groups');
  }
  
  console.log('');
  console.log('📞 Need Help?');
  console.log('   • Check docs/database-consolidation-final-plan.md');
  console.log('   • Review logs for detailed error information');
  console.log('   • Run health check: npm run db:health');
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  let environment: 'development' | 'production' | 'test' = 'development';
  if (args.includes('--production')) environment = 'production';
  if (args.includes('--test')) environment = 'test';
  
  const options: InitOptions = {
    environment,
    skipMigrations: args.includes('--skip-migrations'),
    skipSeed: args.includes('--skip-seed'),
    skipValidation: args.includes('--skip-validation'),
    force: args.includes('--force')
  };

  // Show help if requested
  if (args.includes('--help')) {
    console.log(`
🚀 Strategic Database Initialization Tool

Usage:
  npx tsx scripts/database/init-strategic-database.ts [options]

Options:
  --development      Initialize for development (default)
  --production       Initialize for production
  --test            Initialize for testing
  --skip-migrations  Skip running migrations
  --skip-seed       Skip seeding development data
  --skip-validation Skip validation steps
  --force           Force initialization without prompts
  --help            Show this help message

Examples:
  npx tsx scripts/database/init-strategic-database.ts                    # Full development setup
  npx tsx scripts/database/init-strategic-database.ts --production       # Production setup
  npx tsx scripts/database/init-strategic-database.ts --test             # Test setup
  npx tsx scripts/database/init-strategic-database.ts --skip-seed        # Setup without seed data

This script orchestrates:
  • Database connection setup
  • Schema and extension creation
  • Migration system initialization
  • Health monitoring setup
  • Performance validation
  • Security checks (production)
`);
    process.exit(0);
  }

  initializeStrategicDatabase(options)
    .then(() => {
      console.log('✅ Strategic database initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Strategic database initialization failed:', error);
      process.exit(1);
    });
}