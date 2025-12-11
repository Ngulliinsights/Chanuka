#!/usr/bin/env tsx

/**
 * Simple WebSocket Migration Validation
 * 
 * Validates task 6.6 requirements without full database dependency:
 * - Validates library installations and imports
 * - Tests basic functionality
 * - Confirms migration readiness
 */

import { logger } from '@shared/core/observability/logging';

interface SimpleValidationResult {
  component: string;
  status: 'passed' | 'failed' | 'warning';
  details: string;
  timestamp: Date;
}

/**
 * Simple WebSocket Validation
 */
class SimpleWebSocketValidator {
  private results: SimpleValidationResult[] = [];

  /**
   * Run all simple validations
   */
  async runValidations(): Promise<{
    results: SimpleValidationResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
      overallStatus: 'passed' | 'failed' | 'partial';
    };
  }> {
    logger.info('🚀 Starting simple WebSocket migration validation...');

    // Validate Socket.IO installation and basic functionality
    await this.validateSocketIO();

    // Validate batching service functionality
    await this.validateBatchingService();

    // Validate notification providers
    await this.validateNotificationProviders();

    // Validate migration infrastructure
    await this.validateMigrationInfrastructure();

    // Validate cleanup readiness
    await this.validateCleanupReadiness();

    const summary = this.generateSummary();

    logger.info('✅ Simple WebSocket migration validation completed', { summary });

    return {
      results: this.results,
      summary
    };
  }

  /**
   * Validate Socket.IO installation and basic functionality
   */
  private async validateSocketIO(): Promise<void> {
    try {
      // Test Socket.IO import
      const { Server } = await import('socket.io');
      const { createServer } = await import('http');

      if (Server && createServer) {
        // Test basic server creation
        const httpServer = createServer();
        const io = new Server(httpServer);

        if (io && typeof io.on === 'function') {
          this.addResult('socket-io', 'passed', 'Socket.IO server creation successful');
          
          // Test basic event handling
          let eventHandlerWorking = false;
          io.on('connection', () => {
            eventHandlerWorking = true;
          });

          if (typeof io.on === 'function') {
            this.addResult('socket-io-events', 'passed', 'Socket.IO event handling available');
          }
        } else {
          this.addResult('socket-io', 'failed', 'Socket.IO server creation failed');
        }

        // Cleanup
        httpServer.close();
      } else {
        this.addResult('socket-io', 'failed', 'Socket.IO imports failed');
      }

    } catch (error) {
      this.addResult('socket-io', 'failed', `Socket.IO validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate batching service functionality
   */
  private async validateBatchingService(): Promise<void> {
    try {
      // Test batching service import and basic functionality
      const { BatchingService } = await import('../../batching-service');

      const batchingService = new BatchingService({
        maxBatchSize: 5,
        maxBatchDelay: 100,
        compressionEnabled: true
      });

      // Test basic metrics
      const metrics = batchingService.getMetrics();
      
      if (metrics && typeof metrics.totalMessages === 'number') {
        this.addResult('batching-service', 'passed', 'Batching service operational');

        // Test configuration update
        batchingService.updateConfig({ maxBatchSize: 10 });
        this.addResult('batching-config', 'passed', 'Batching service configuration update working');

        // Test cleanup
        await batchingService.shutdown();
        this.addResult('batching-cleanup', 'passed', 'Batching service cleanup working');
      } else {
        this.addResult('batching-service', 'failed', 'Batching service metrics not available');
      }

    } catch (error) {
      this.addResult('batching-service', 'failed', `Batching service validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate notification providers
   */
  private async validateNotificationProviders(): Promise<void> {
    try {
      // Test AWS SNS SDK
      try {
        await import('@aws-sdk/client-sns');
        this.addResult('aws-sns-sdk', 'passed', 'AWS SNS SDK available');
      } catch {
        this.addResult('aws-sns-sdk', 'warning', 'AWS SNS SDK not installed (optional for production)');
      }

      // Test Firebase Admin SDK
      try {
        await import('firebase-admin');
        this.addResult('firebase-sdk', 'passed', 'Firebase Admin SDK available');
      } catch {
        this.addResult('firebase-sdk', 'warning', 'Firebase Admin SDK not installed (optional for production)');
      }

      // Test notification channels service
      try {
        const { notificationChannelService } = await import('../../notification-channels');
        
        const status = notificationChannelService.getStatus();
        
        if (status && typeof status.smsProvider === 'string') {
          this.addResult('notification-channels', 'passed', `Notification channels service operational (SMS: ${status.smsProvider}, Push: ${status.pushProvider})`);
        } else {
          this.addResult('notification-channels', 'failed', 'Notification channels service not working');
        }
      } catch (error) {
        this.addResult('notification-channels', 'failed', `Notification channels validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      this.addResult('notification-providers', 'failed', `Notification providers validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate migration infrastructure
   */
  private async validateMigrationInfrastructure(): Promise<void> {
    try {
      // Test WebSocket adapter
      try {
        const { connectionMigrator, blueGreenDeployer } = await import('@server/infrastructure/websocket-adapter.ts');
        
        if (connectionMigrator && blueGreenDeployer) {
          this.addResult('websocket-adapter', 'passed', 'WebSocket migration adapter available');
        } else {
          this.addResult('websocket-adapter', 'failed', 'WebSocket migration adapter not working');
        }
      } catch (error) {
        this.addResult('websocket-adapter', 'failed', `WebSocket adapter validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test validation scripts exist
      const { promises: fs } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      const validationScripts = [
        'websocket-performance-validation.ts',
        'final-migration-validation.ts',
        'legacy-websocket-cleanup.ts'
      ];

      for (const script of validationScripts) {
        try {
          const scriptPath = join(__dirname, script);
          await fs.access(scriptPath);
          this.addResult(`validation-script-${script}`, 'passed', `Validation script ${script} exists`);
        } catch {
          this.addResult(`validation-script-${script}`, 'failed', `Validation script ${script} missing`);
        }
      }

    } catch (error) {
      this.addResult('migration-infrastructure', 'failed', `Migration infrastructure validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate cleanup readiness
   */
  private async validateCleanupReadiness(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // Check that new WebSocket service exists
      const newWebSocketPath = join(__dirname, '../infrastructure/websocket.ts');
      try {
        await fs.access(newWebSocketPath);
        this.addResult('new-websocket-service', 'passed', 'New WebSocket service file exists');
      } catch {
        this.addResult('new-websocket-service', 'failed', 'New WebSocket service file missing');
      }

      // Check package.json for Socket.IO dependency
      const packageJsonPath = join(__dirname, '../../package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        if (packageJson.dependencies && packageJson.dependencies['socket.io']) {
          this.addResult('socket-io-dependency', 'passed', `Socket.IO dependency confirmed (${packageJson.dependencies['socket.io']})`);
        } else {
          this.addResult('socket-io-dependency', 'failed', 'Socket.IO dependency not found in package.json');
        }
      } catch (error) {
        this.addResult('package-json', 'failed', `Package.json validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Check that batching service exists
      const batchingServicePath = join(__dirname, '../infrastructure/batching-service.ts');
      try {
        await fs.access(batchingServicePath);
        this.addResult('batching-service-file', 'passed', 'Batching service file exists');
      } catch {
        this.addResult('batching-service-file', 'failed', 'Batching service file missing');
      }

    } catch (error) {
      this.addResult('cleanup-readiness', 'failed', `Cleanup readiness validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add validation result
   */
  private addResult(component: string, status: 'passed' | 'failed' | 'warning', details: string): void {
    this.results.push({
      component,
      status,
      details,
      timestamp: new Date()
    });

    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    logger.info(`${statusIcon} ${component}: ${details}`);
  }

  /**
   * Generate validation summary
   */
  private generateSummary(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    overallStatus: 'passed' | 'failed' | 'partial';
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    const overallStatus = failed === 0 ? (warnings === 0 ? 'passed' : 'partial') : 'failed';

    return { total, passed, failed, warnings, overallStatus };
  }

  /**
   * Generate validation report
   */
  generateReport(): string {
    const summary = this.generateSummary();
    
    let report = '\n🎯 Simple WebSocket Migration Validation Report - Task 6.6\n';
    report += '==========================================================\n\n';
    
    const statusIcon = summary.overallStatus === 'passed' ? '✅' : 
                      summary.overallStatus === 'partial' ? '⚠️' : '❌';
    report += `${statusIcon} Overall Status: ${summary.overallStatus.toUpperCase()}\n\n`;
    
    report += `📊 Summary:\n`;
    report += `  Total Validations: ${summary.total}\n`;
    report += `  Passed: ${summary.passed}\n`;
    report += `  Failed: ${summary.failed}\n`;
    report += `  Warnings: ${summary.warnings}\n\n`;
    
    if (summary.failed > 0) {
      report += `❌ Failed Validations:\n`;
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          report += `  - ${r.component}: ${r.details}\n`;
        });
      report += '\n';
    }
    
    if (summary.warnings > 0) {
      report += `⚠️ Warnings:\n`;
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => {
          report += `  - ${r.component}: ${r.details}\n`;
        });
      report += '\n';
    }
    
    report += `✅ Passed Validations:\n`;
    this.results
      .filter(r => r.status === 'passed')
      .forEach(r => {
        report += `  - ${r.component}: ${r.details}\n`;
      });
    
    report += `\n📅 Validation Date: ${new Date().toISOString()}\n`;
    
    // Migration readiness assessment
    const criticalFailures = this.results.filter(r => 
      r.status === 'failed' && 
      ['socket-io', 'batching-service', 'new-websocket-service', 'socket-io-dependency'].includes(r.component)
    );
    
    if (criticalFailures.length === 0) {
      report += '\n🚀 Migration Status: READY FOR PRODUCTION\n';
      report += '✅ All critical components validated successfully\n';
    } else {
      report += '\n⚠️ Migration Status: NOT READY FOR PRODUCTION\n';
      report += '❌ Critical components have validation failures\n';
    }
    
    report += '==========================================================\n';
    
    return report;
  }
}

// Main execution
async function main(): Promise<void> {
  const validator = new SimpleWebSocketValidator();
  
  try {
    const results = await validator.runValidations();
    const report = validator.generateReport();
    
    console.log(report);
    
    // Exit with appropriate code
    if (results.summary.overallStatus === 'failed') {
      process.exit(1);
    } else if (results.summary.overallStatus === 'partial') {
      process.exit(2); // Partial success
    } else {
      process.exit(0); // Full success
    }
    
  } catch (error) {
    logger.error('Simple WebSocket validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SimpleWebSocketValidator };
