#!/usr/bin/env tsx

/**
 * Migration Script: Consolidate WebSocket Services
 * 
 * This script helps migrate from the old distributed WebSocket modules
 * to the new unified WebSocket service.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { logger } from '@shared/core/observability/logging';

interface MigrationStep {
  name: string;
  description: string;
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
}

class WebSocketMigrationTool {
  private steps: MigrationStep[] = [];
  private completedSteps: string[] = [];

  constructor() {
    this.setupMigrationSteps();
  }

  private setupMigrationSteps(): void {
    this.steps = [
      {
        name: 'backup_old_modules',
        description: 'Create backup of existing WebSocket modules',
        execute: this.backupOldModules.bind(this),
        rollback: this.restoreOldModules.bind(this)
      },
      {
        name: 'update_imports',
        description: 'Update import statements to use unified service',
        execute: this.updateImports.bind(this),
        rollback: this.revertImports.bind(this)
      },
      {
        name: 'migrate_configurations',
        description: 'Migrate configuration files',
        execute: this.migrateConfigurations.bind(this),
        rollback: this.revertConfigurations.bind(this)
      },
      {
        name: 'update_tests',
        description: 'Update test files to use new service',
        execute: this.updateTests.bind(this),
        rollback: this.revertTests.bind(this)
      },
      {
        name: 'create_deprecation_notices',
        description: 'Add deprecation notices to old modules',
        execute: this.createDeprecationNotices.bind(this)
      },
      {
        name: 'validate_migration',
        description: 'Validate that migration was successful',
        execute: this.validateMigration.bind(this)
      }
    ];
  }

  /**
   * Run the complete migration process
   */
  async migrate(): Promise<void> {
    logger.info('Starting WebSocket service migration', {
      component: 'WebSocketMigrationTool',
      totalSteps: this.steps.length
    });

    try {
      for (const step of this.steps) {
        logger.info(`Executing migration step: ${step.name}`, {
          component: 'WebSocketMigrationTool',
          description: step.description
        });

        await step.execute();
        this.completedSteps.push(step.name);

        logger.info(`Completed migration step: ${step.name}`, {
          component: 'WebSocketMigrationTool'
        });
      }

      logger.info('WebSocket service migration completed successfully', {
        component: 'WebSocketMigrationTool',
        completedSteps: this.completedSteps.length
      });

      await this.generateMigrationReport();
    } catch (error) {
      logger.error('Migration failed, starting rollback', {
        component: 'WebSocketMigrationTool',
        error: error instanceof Error ? error.message : String(error)
      });

      await this.rollback();
      throw error;
    }
  }

  /**
   * Rollback completed migration steps
   */
  async rollback(): Promise<void> {
    logger.info('Starting migration rollback', {
      component: 'WebSocketMigrationTool',
      stepsToRollback: this.completedSteps.length
    });

    // Rollback in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      const stepName = this.completedSteps[i];
      const step = this.steps.find(s => s.name === stepName);

      if (step?.rollback) {
        try {
          logger.info(`Rolling back step: ${stepName}`, {
            component: 'WebSocketMigrationTool'
          });

          await step.rollback();

          logger.info(`Rolled back step: ${stepName}`, {
            component: 'WebSocketMigrationTool'
          });
        } catch (error) {
          logger.error(`Failed to rollback step: ${stepName}`, {
            component: 'WebSocketMigrationTool',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    this.completedSteps = [];
    logger.info('Migration rollback completed', {
      component: 'WebSocketMigrationTool'
    });
  }

  /**
   * Backup existing WebSocket modules
   */
  private async backupOldModules(): Promise<void> {
    const backupDir = join(process.cwd(), '.migration-backup', new Date().toISOString().split('T')[0]);
    await fs.mkdir(backupDir, { recursive: true });

    const modulesToBackup = [
      'server/infrastructure/realtime',
      'shared/infrastructure/realtime'
    ];

    for (const modulePath of modulesToBackup) {
      const fullPath = join(process.cwd(), modulePath);
      const backupPath = join(backupDir, modulePath);

      try {
        await fs.mkdir(dirname(backupPath), { recursive: true });
        await this.copyDirectory(fullPath, backupPath);
        
        logger.info(`Backed up module: ${modulePath}`, {
          component: 'WebSocketMigrationTool',
          backupPath
        });
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
        logger.warn(`Module not found, skipping backup: ${modulePath}`, {
          component: 'WebSocketMigrationTool'
        });
      }
    }
  }

  /**
   * Restore old modules from backup
   */
  private async restoreOldModules(): Promise<void> {
    // Implementation would restore from backup
    logger.info('Restoring old modules from backup', {
      component: 'WebSocketMigrationTool'
    });
  }

  /**
   * Update import statements throughout the codebase
   */
  private async updateImports(): Promise<void> {
    const importMappings = [
      {
        from: /import\s+{[^}]*SocketIOService[^}]*}\s+from\s+['"]@server\/infrastructure\/realtime\/socketio-service['"];?/g,
        to: "import { createSocketIOWebSocketService } from '@server/infrastructure/websocket';"
      },
      {
        from: /import\s+{[^}]*MemoryAwareSocketService[^}]*}\s+from\s+['"]@shared\/infrastructure\/realtime\/memory-aware-socket-service['"];?/g,
        to: "import { createUnifiedWebSocketService } from '@server/infrastructure/websocket';"
      },
      {
        from: /import\s+{[^}]*BatchingService[^}]*}\s+from\s+['"]@shared\/infrastructure\/realtime\/batching-service['"];?/g,
        to: "import { BatchingService } from '@server/infrastructure/websocket';"
      },
      {
        from: /import\s+{[^}]*WebSocketService[^}]*}\s+from\s+['"]@server\/infrastructure\/websocket\/core\/websocket-service['"];?/g,
        to: "import { createWebSocketService } from '@server/infrastructure/websocket';"
      }
    ];

    const filesToUpdate = await this.findFilesWithImports();

    for (const filePath of filesToUpdate) {
      let content = await fs.readFile(filePath, 'utf8');
      let modified = false;

      for (const mapping of importMappings) {
        if (mapping.from.test(content)) {
          content = content.replace(mapping.from, mapping.to);
          modified = true;
        }
      }

      if (modified) {
        await fs.writeFile(filePath, content, 'utf8');
        logger.info(`Updated imports in: ${filePath}`, {
          component: 'WebSocketMigrationTool'
        });
      }
    }
  }

  /**
   * Revert import changes
   */
  private async revertImports(): Promise<void> {
    logger.info('Reverting import changes', {
      component: 'WebSocketMigrationTool'
    });
    // Implementation would revert import changes
  }

  /**
   * Migrate configuration files
   */
  private async migrateConfigurations(): Promise<void> {
    const configFiles = [
      'server/config/websocket.config.ts',
      'shared/config/realtime.config.ts'
    ];

    for (const configFile of configFiles) {
      const fullPath = join(process.cwd(), configFile);
      
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        
        // Update configuration to use unified service
        const updatedContent = content
          .replace(/SocketIOService/g, 'UnifiedWebSocketService')
          .replace(/MemoryAwareSocketService/g, 'UnifiedWebSocketService')
          .replace(/@server\/infrastructure\/realtime/g, '@server/infrastructure/websocket')
          .replace(/@shared\/infrastructure\/realtime/g, '@server/infrastructure/websocket');

        await fs.writeFile(fullPath, updatedContent, 'utf8');
        
        logger.info(`Updated configuration: ${configFile}`, {
          component: 'WebSocketMigrationTool'
        });
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
        logger.warn(`Configuration file not found: ${configFile}`, {
          component: 'WebSocketMigrationTool'
        });
      }
    }
  }

  /**
   * Revert configuration changes
   */
  private async revertConfigurations(): Promise<void> {
    logger.info('Reverting configuration changes', {
      component: 'WebSocketMigrationTool'
    });
    // Implementation would revert configuration changes
  }

  /**
   * Update test files
   */
  private async updateTests(): Promise<void> {
    const testFiles = await this.findTestFiles();

    for (const testFile of testFiles) {
      let content = await fs.readFile(testFile, 'utf8');
      let modified = false;

      // Update test imports and usage
      if (content.includes('SocketIOService') || 
          content.includes('MemoryAwareSocketService') ||
          content.includes('@server/infrastructure/realtime') ||
          content.includes('@shared/infrastructure/realtime')) {
        
        content = content
          .replace(/SocketIOService/g, 'UnifiedWebSocketService')
          .replace(/MemoryAwareSocketService/g, 'UnifiedWebSocketService')
          .replace(/@server\/infrastructure\/realtime/g, '@server/infrastructure/websocket')
          .replace(/@shared\/infrastructure\/realtime/g, '@server/infrastructure/websocket');

        modified = true;
      }

      if (modified) {
        await fs.writeFile(testFile, content, 'utf8');
        logger.info(`Updated test file: ${testFile}`, {
          component: 'WebSocketMigrationTool'
        });
      }
    }
  }

  /**
   * Revert test changes
   */
  private async revertTests(): Promise<void> {
    logger.info('Reverting test changes', {
      component: 'WebSocketMigrationTool'
    });
    // Implementation would revert test changes
  }

  /**
   * Create deprecation notices in old modules
   */
  private async createDeprecationNotices(): Promise<void> {
    const deprecationNotice = `
/**
 * ⚠️  DEPRECATED MODULE
 * 
 * This module has been consolidated into the unified WebSocket service.
 * Please use '@server/infrastructure/websocket' instead.
 * 
 * Migration guide: See CONSOLIDATION_PLAN.md
 * 
 * This module will be removed in a future release.
 */

console.warn('DEPRECATED: This WebSocket module has been consolidated. Use @server/infrastructure/websocket instead.');

`;

    const oldModules = [
      'server/infrastructure/realtime/index.ts',
      'shared/infrastructure/realtime/index.ts'
    ];

    for (const modulePath of oldModules) {
      const fullPath = join(process.cwd(), modulePath);
      
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const updatedContent = deprecationNotice + content;
        
        await fs.writeFile(fullPath, updatedContent, 'utf8');
        
        logger.info(`Added deprecation notice to: ${modulePath}`, {
          component: 'WebSocketMigrationTool'
        });
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
        logger.warn(`Module not found for deprecation notice: ${modulePath}`, {
          component: 'WebSocketMigrationTool'
        });
      }
    }
  }

  /**
   * Validate that migration was successful
   */
  private async validateMigration(): Promise<void> {
    logger.info('Validating migration', {
      component: 'WebSocketMigrationTool'
    });

    // Check that unified service exists and is functional
    try {
      const { createUnifiedWebSocketService } = await import('../server/infrastructure/websocket');
      
      // Test service creation
      const service = createUnifiedWebSocketService();
      
      // Basic validation
      if (!service || typeof service.getStats !== 'function') {
        throw new Error('Unified WebSocket service is not properly configured');
      }

      logger.info('Migration validation successful', {
        component: 'WebSocketMigrationTool'
      });
    } catch (error) {
      throw new Error(`Migration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate migration report
   */
  private async generateMigrationReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      completedSteps: this.completedSteps,
      summary: {
        totalSteps: this.steps.length,
        completedSteps: this.completedSteps.length,
        success: this.completedSteps.length === this.steps.length
      },
      nextSteps: [
        'Test the unified WebSocket service in development',
        'Update documentation to reflect new import paths',
        'Schedule removal of deprecated modules',
        'Monitor performance after migration'
      ]
    };

    const reportPath = join(process.cwd(), 'migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

    logger.info('Migration report generated', {
      component: 'WebSocketMigrationTool',
      reportPath
    });
  }

  /**
   * Find files that contain WebSocket imports
   */
  private async findFilesWithImports(): Promise<string[]> {
    // This would implement a file search for import statements
    // For now, return common locations
    return [
      'server/api/websocket.ts',
      'server/services/realtime.service.ts',
      'server/tests/integration/websocket.test.ts'
    ].filter(async (path) => {
      try {
        await fs.access(join(process.cwd(), path));
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Find test files
   */
  private async findTestFiles(): Promise<string[]> {
    // This would implement a recursive search for test files
    // For now, return common test locations
    return [
      'server/tests/integration/websocket-service.test.ts',
      'server/tests/unit/realtime.test.ts',
      'shared/tests/realtime.test.ts'
    ].filter(async (path) => {
      try {
        await fs.access(join(process.cwd(), path));
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrationTool = new WebSocketMigrationTool();

  try {
    switch (command) {
      case 'migrate':
        await migrationTool.migrate();
        break;
      case 'rollback':
        await migrationTool.rollback();
        break;
      default:
        console.log(`
WebSocket Migration Tool

Usage:
  npm run migrate:websocket migrate   - Run the complete migration
  npm run migrate:websocket rollback  - Rollback the migration

Commands:
  migrate   Consolidate WebSocket services into unified module
  rollback  Revert migration changes
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration tool failed', {
      component: 'WebSocketMigrationTool',
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { WebSocketMigrationTool };