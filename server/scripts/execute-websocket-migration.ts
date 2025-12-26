#!/usr/bin/env tsx
// ============================================================================
// WEBSOCKET MIGRATION EXECUTION SCRIPT
// ============================================================================
// Executes the WebSocket migration from custom implementation to Socket.IO
// For development environment with immediate switch

import { validateMigrationDeployment, validateSocketIOAuthentication, validateSocketIOInitialization, validateSubscriptionManagement, validateZeroDowntimeMigration } from '@server/scripts/validate-connection-migration.ts';
import { logger } from '@shared/core/observability/logging';
import { createServer } from 'http';

import { WebSocketMigrationDeployer } from '../../deploy-websocket-migration';

interface ExecutionOptions {
  port?: number;
  skipValidation?: boolean;
  enableRedis?: boolean;
  redisUrl?: string;
  dryRun?: boolean;
}

/**
 * Execute WebSocket migration with validation
 */
async function executeWebSocketMigration(options: ExecutionOptions = {}): Promise<void> {
  const {
    port = 3001,
    skipValidation = false,
    enableRedis = false,
    redisUrl = process.env.REDIS_URL,
    dryRun = false
  } = options;

  logger.info('🚀 Starting WebSocket migration execution', {
    component: 'WebSocketMigrationExecution',
    options: {
      port,
      skipValidation,
      enableRedis,
      dryRun,
      redisConfigured: !!redisUrl
    }
  });

  try {
    // Step 1: Pre-migration validation (if not skipped)
    if (!skipValidation) {
      logger.info('📋 Running pre-migration validation...');
      
      const validationResults = await runValidationSuite();
      const failedValidations = validationResults.filter(r => !r.success);
      
      if (failedValidations.length > 0) {
        logger.error('❌ Pre-migration validation failed', {
          component: 'WebSocketMigrationExecution',
          failedValidations: failedValidations.map(v => v.name)
        });
        
        if (!dryRun) {
          throw new Error(`Pre-migration validation failed: ${failedValidations.map(v => v.name).join(', ')}`);
        }
      } else {
        logger.info('✅ Pre-migration validation passed');
      }
    }

    // Step 2: Create HTTP server for migration
    const server = createServer();
    
    await new Promise<void>((resolve, reject) => {
      server.listen(port, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    logger.info(`🌐 HTTP server started on port ${port}`);

    // Step 3: Execute migration
    if (!dryRun) {
      logger.info('🔄 Executing WebSocket migration...');
      
      const deployer = new WebSocketMigrationDeployer({
        environment: 'development',
        deploymentStrategy: 'immediate',
        enableMonitoring: true,
        rollbackOnError: true,
        redisUrl: enableRedis ? redisUrl : undefined
      });

      await deployer.deploy(server);

      const migrationState = deployer.getMigrationState();
      const socketIOService = deployer.getSocketIOService();
      const metrics = socketIOService.getMetrics();

      logger.info('✅ WebSocket migration completed successfully', {
        component: 'WebSocketMigrationExecution',
        migrationDuration: migrationState.completionTime ? 
          migrationState.completionTime - migrationState.startTime : 'unknown',
        finalMetrics: metrics,
        errors: migrationState.errors
      });

      // Step 4: Post-migration validation
      if (!skipValidation) {
        logger.info('🔍 Running post-migration validation...');
        
        // Give the service a moment to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const postValidationResults = await runValidationSuite();
        const postFailedValidations = postValidationResults.filter(r => !r.success);
        
        if (postFailedValidations.length > 0) {
          logger.warn('⚠️ Post-migration validation had issues', {
            component: 'WebSocketMigrationExecution',
            failedValidations: postFailedValidations.map(v => v.name)
          });
        } else {
          logger.info('✅ Post-migration validation passed');
        }
      }

      // Step 5: Display migration summary
      displayMigrationSummary(deployer, migrationState, metrics);

      // Keep server running for testing (in development)
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 Development mode: Server will keep running for testing');
        logger.info(`📡 Socket.IO endpoint: http://localhost:${port}/socket.io`);
        logger.info('Press Ctrl+C to stop the server');
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          logger.info('🛑 Shutting down WebSocket migration server...');
          
          await socketIOService.shutdown();
          
          await new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
          
          logger.info('✅ Server shutdown complete');
          process.exit(0);
        });
        
        // Keep process alive
        return new Promise(() => {});
      } else {
        // Production: Clean shutdown after migration
        await socketIOService.shutdown();
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }

    } else {
      logger.info('🧪 Dry run completed - no actual migration performed');
      
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

  } catch (error) {
    logger.error('❌ WebSocket migration execution failed', {
      component: 'WebSocketMigrationExecution'
    }, error);
    
    throw error;
  }
}

/**
 * Run validation suite
 */
async function runValidationSuite(): Promise<Array<{ name: string; success: boolean; error?: string }>> {
  const validations = [
    { name: 'Socket.IO Initialization', fn: validateSocketIOInitialization },
    { name: 'Socket.IO Authentication', fn: validateSocketIOAuthentication },
    { name: 'Subscription Management', fn: validateSubscriptionManagement },
    { name: 'Migration Deployment', fn: validateMigrationDeployment },
    { name: 'Zero Downtime Migration', fn: validateZeroDowntimeMigration }
  ];

  const results = [];

  for (const validation of validations) {
    try {
      const success = await validation.fn();
      results.push({ name: validation.name, success });
    } catch (error) {
      results.push({ 
        name: validation.name, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

/**
 * Display migration summary
 */
function displayMigrationSummary(deployer: WebSocketMigrationDeployer, migrationState: any, metrics: any): void {
  const duration = migrationState.completionTime ? 
    migrationState.completionTime - migrationState.startTime : 0;

  console.log('\n' + '='.repeat(60));
  console.log('🎉 WEBSOCKET MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📊 Migration Status: ${migrationState.phase.toUpperCase()}`);
  console.log(`⏱️  Migration Duration: ${duration}ms`);
  console.log(`🔗 Total Connections: ${metrics.totalConnections}`);
  console.log(`📡 Active Connections: ${metrics.activeConnections}`);
  console.log(`📤 Messages Sent: ${metrics.messagesSent}`);
  console.log(`📥 Messages Received: ${metrics.messagesReceived}`);
  console.log(`❌ Errors: ${metrics.errors}`);
  
  if (migrationState.errors.length > 0) {
    console.log(`\n⚠️  Migration Errors:`);
    migrationState.errors.forEach((error: string, index: number) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n✅ Migration to Socket.IO completed successfully!');
  console.log('📋 Next steps:');
  console.log('   1. Update client applications to use Socket.IO client');
  console.log('   2. Test real-time functionality');
  console.log('   3. Monitor performance and error rates');
  console.log('   4. Remove legacy WebSocket implementation when ready');
  console.log('='.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): ExecutionOptions {
  const args = process.argv.slice(2);
  const options: ExecutionOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--port':
        options.port = parseInt(args[++i], 10);
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--enable-redis':
        options.enableRedis = true;
        break;
      case '--redis-url':
        options.redisUrl = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        displayHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          displayHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(`
WebSocket Migration Execution Script

Usage: tsx server/scripts/execute-websocket-migration.ts [options]

Options:
  --port <number>           Port to run the migration server on (default: 3001)
  --skip-validation         Skip pre and post migration validation
  --enable-redis            Enable Redis adapter for horizontal scaling
  --redis-url <url>         Redis connection URL (default: process.env.REDIS_URL)
  --dry-run                 Run validation only, don't perform actual migration
  --help                    Display this help message

Examples:
  # Basic migration
  tsx server/scripts/execute-websocket-migration.ts

  # Migration with custom port
  tsx server/scripts/execute-websocket-migration.ts --port 3002

  # Migration with Redis support
  tsx server/scripts/execute-websocket-migration.ts --enable-redis --redis-url redis://localhost:6379

  # Dry run with validation only
  tsx server/scripts/execute-websocket-migration.ts --dry-run

  # Skip validation for faster execution
  tsx server/scripts/execute-websocket-migration.ts --skip-validation
`);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArguments();
  
  executeWebSocketMigration(options)
    .then(() => {
      if (!options.dryRun && process.env.NODE_ENV !== 'development') {
        logger.info('🎉 WebSocket migration execution completed successfully');
        process.exit(0);
      }
      // In development mode, the process stays alive
    })
    .catch((error) => {
      logger.error('💥 WebSocket migration execution failed', {}, error);
      process.exit(1);
    });
}

export { executeWebSocketMigration };
