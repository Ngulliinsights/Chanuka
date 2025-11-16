#!/usr/bin/env tsx

/**
 * Legacy WebSocket Cleanup Script
 * 
 * Removes old WebSocket service after successful migration validation
 * Performs systematic cleanup with proper archiving and safety checks
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { logger } from '@shared/core/observability/logging';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CleanupItem {
  path: string;
  type: 'file' | 'directory';
  action: 'delete' | 'archive' | 'rename';
  reason: string;
  dependencies?: string[];
}

interface CleanupResult {
  item: CleanupItem;
  status: 'success' | 'failed' | 'skipped';
  details: string;
  timestamp: Date;
}

/**
 * Legacy WebSocket Cleanup Manager
 */
export class LegacyWebSocketCleanup {
  private cleanupResults: CleanupResult[] = [];
  private archiveDir: string;
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.archiveDir = join(__dirname, '../../archive/websocket-migration');
  }

  /**
   * Run complete cleanup process
   */
  async runCleanup(): Promise<{
    results: CleanupResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      skipped: number;
    };
  }> {
    logger.info('🧹 Starting legacy WebSocket cleanup...', { dryRun: this.dryRun });

    try {
      // Create archive directory
      await this.createArchiveDirectory();

      // Define cleanup items
      const cleanupItems = this.defineCleanupItems();

      // Validate migration completion before cleanup
      await this.validateMigrationCompletion();

      // Process each cleanup item
      for (const item of cleanupItems) {
        await this.processCleanupItem(item);
      }

      // Generate summary
      const summary = this.generateSummary();

      logger.info('✅ Legacy WebSocket cleanup completed', {
        dryRun: this.dryRun,
        summary
      });

      return {
        results: this.cleanupResults,
        summary
      };

    } catch (error) {
      logger.error('❌ Legacy WebSocket cleanup failed', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Define items to be cleaned up
   */
  private defineCleanupItems(): CleanupItem[] {
    return [
      // Legacy WebSocket service files
      {
        path: 'server/infrastructure/legacy-websocket.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy WebSocket implementation replaced by Socket.IO',
        dependencies: ['server/infrastructure/websocket.ts']
      },
      {
        path: 'server/infrastructure/legacy-websocket-service.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy WebSocket service replaced by Socket.IO service'
      },
      
      // Legacy connection management
      {
        path: 'server/infrastructure/legacy-connection-manager.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy connection management replaced by Socket.IO connection handling'
      },
      
      // Legacy notification channels (if they exist)
      {
        path: 'server/infrastructure/notifications/legacy-notification-channels.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy notification channels replaced by provider SDKs'
      },
      
      // Legacy WebSocket tests
      {
        path: 'server/__tests__/legacy-websocket.test.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy WebSocket tests no longer needed'
      },
      
      // Legacy configuration files
      {
        path: 'server/config/legacy-websocket-config.ts',
        type: 'file',
        action: 'archive',
        reason: 'Legacy WebSocket configuration replaced by Socket.IO config'
      },
      
      // Temporary migration files
      {
        path: 'server/infrastructure/websocket-migration-temp.ts',
        type: 'file',
        action: 'delete',
        reason: 'Temporary migration file no longer needed'
      },
      
      // Legacy documentation
      {
        path: 'docs/legacy-websocket-architecture.md',
        type: 'file',
        action: 'archive',
        reason: 'Legacy architecture documentation for historical reference'
      }
    ];
  }

  /**
   * Validate that migration is complete before cleanup
   */
  private async validateMigrationCompletion(): Promise<void> {
    logger.info('🔍 Validating migration completion before cleanup...');

    // Check that new WebSocket service exists and is functional
    const newWebSocketPath = join(__dirname, '../infrastructure/websocket.ts');
    try {
      await fs.access(newWebSocketPath);
      logger.info('✅ New WebSocket service file exists');
    } catch {
      throw new Error('New WebSocket service not found - migration may not be complete');
    }

    // Check that Socket.IO is properly installed
    const packageJsonPath = join(__dirname, '../../package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (!packageJson.dependencies['socket.io']) {
        throw new Error('Socket.IO not found in dependencies');
      }
      logger.info('✅ Socket.IO dependency confirmed');
    } catch (error) {
      throw new Error(`Package.json validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check that batching service exists
    const batchingServicePath = join(__dirname, '../infrastructure/batching-service.ts');
    try {
      await fs.access(batchingServicePath);
      logger.info('✅ Batching service exists');
    } catch {
      throw new Error('Batching service not found - WebSocket migration may not be complete');
    }

    // Validate that notification providers are implemented
    const notificationChannelsPath = join(__dirname, '../infrastructure/notifications/notification-channels.ts');
    try {
      const content = await fs.readFile(notificationChannelsPath, 'utf-8');
      if (content.includes('TODO') && content.includes('AWS SNS') && content.includes('Firebase')) {
        logger.warn('⚠️ Notification providers may still have TODO comments');
      } else {
        logger.info('✅ Notification providers appear to be implemented');
      }
    } catch {
      logger.warn('⚠️ Could not validate notification providers');
    }

    logger.info('✅ Migration completion validation passed');
  }

  /**
   * Create archive directory for legacy files
   */
  private async createArchiveDirectory(): Promise<void> {
    if (this.dryRun) {
      logger.info('📁 [DRY RUN] Would create archive directory:', { path: this.archiveDir });
      return;
    }

    try {
      await fs.mkdir(this.archiveDir, { recursive: true });
      
      // Create archive metadata
      const metadata = {
        archiveDate: new Date().toISOString(),
        migrationPhase: 'Phase 5: WebSocket Migration',
        description: 'Legacy WebSocket implementation files archived after successful migration to Socket.IO',
        originalPaths: [],
        notes: 'These files were part of the custom WebSocket implementation that was replaced by Socket.IO with batching and provider SDK integration'
      };
      
      await fs.writeFile(
        join(this.archiveDir, 'archive-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      logger.info('📁 Archive directory created', { path: this.archiveDir });
    } catch (error) {
      throw new Error(`Failed to create archive directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process individual cleanup item
   */
  private async processCleanupItem(item: CleanupItem): Promise<void> {
    const fullPath = join(__dirname, '../../', item.path);
    
    try {
      // Check if file/directory exists
      try {
        await fs.access(fullPath);
      } catch {
        this.addCleanupResult(item, 'skipped', 'File/directory does not exist');
        return;
      }

      // Check dependencies if specified
      if (item.dependencies) {
        for (const dep of item.dependencies) {
          const depPath = join(__dirname, '../../', dep);
          try {
            await fs.access(depPath);
          } catch {
            this.addCleanupResult(item, 'skipped', `Dependency not found: ${dep}`);
            return;
          }
        }
      }

      // Perform action based on type
      switch (item.action) {
        case 'archive':
          await this.archiveItem(item, fullPath);
          break;
        case 'delete':
          await this.deleteItem(item, fullPath);
          break;
        case 'rename':
          await this.renameItem(item, fullPath);
          break;
      }

    } catch (error) {
      this.addCleanupResult(item, 'failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Archive a file or directory
   */
  private async archiveItem(item: CleanupItem, fullPath: string): Promise<void> {
    const archivePath = join(this.archiveDir, item.path);
    const archiveParentDir = dirname(archivePath);

    if (this.dryRun) {
      this.addCleanupResult(item, 'success', `[DRY RUN] Would archive to: ${archivePath}`);
      return;
    }

    try {
      // Create parent directories in archive
      await fs.mkdir(archiveParentDir, { recursive: true });

      // Copy file/directory to archive
      if (item.type === 'file') {
        await fs.copyFile(fullPath, archivePath);
      } else {
        await this.copyDirectory(fullPath, archivePath);
      }

      // Remove original after successful archive
      if (item.type === 'file') {
        await fs.unlink(fullPath);
      } else {
        await fs.rmdir(fullPath, { recursive: true });
      }

      this.addCleanupResult(item, 'success', `Archived to: ${archivePath}`);

    } catch (error) {
      throw new Error(`Failed to archive ${item.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file or directory
   */
  private async deleteItem(item: CleanupItem, fullPath: string): Promise<void> {
    if (this.dryRun) {
      this.addCleanupResult(item, 'success', '[DRY RUN] Would delete');
      return;
    }

    try {
      if (item.type === 'file') {
        await fs.unlink(fullPath);
      } else {
        await fs.rmdir(fullPath, { recursive: true });
      }

      this.addCleanupResult(item, 'success', 'Deleted successfully');

    } catch (error) {
      throw new Error(`Failed to delete ${item.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rename a file or directory
   */
  private async renameItem(item: CleanupItem, fullPath: string): Promise<void> {
    const newPath = `${fullPath}.legacy`;

    if (this.dryRun) {
      this.addCleanupResult(item, 'success', `[DRY RUN] Would rename to: ${newPath}`);
      return;
    }

    try {
      await fs.rename(fullPath, newPath);
      this.addCleanupResult(item, 'success', `Renamed to: ${newPath}`);

    } catch (error) {
      throw new Error(`Failed to rename ${item.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  /**
   * Add cleanup result
   */
  private addCleanupResult(item: CleanupItem, status: 'success' | 'failed' | 'skipped', details: string): void {
    this.cleanupResults.push({
      item,
      status,
      details,
      timestamp: new Date()
    });

    const statusIcon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    logger.info(`${statusIcon} ${item.action} ${item.path}: ${details}`);
  }

  /**
   * Generate cleanup summary
   */
  private generateSummary(): {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  } {
    const total = this.cleanupResults.length;
    const successful = this.cleanupResults.filter(r => r.status === 'success').length;
    const failed = this.cleanupResults.filter(r => r.status === 'failed').length;
    const skipped = this.cleanupResults.filter(r => r.status === 'skipped').length;

    return { total, successful, failed, skipped };
  }

  /**
   * Generate cleanup report
   */
  generateReport(): string {
    const summary = this.generateSummary();
    
    let report = '\n📋 Legacy WebSocket Cleanup Report\n';
    report += '=====================================\n\n';
    
    report += `📊 Summary:\n`;
    report += `  Total Items: ${summary.total}\n`;
    report += `  Successful: ${summary.successful}\n`;
    report += `  Failed: ${summary.failed}\n`;
    report += `  Skipped: ${summary.skipped}\n\n`;
    
    if (summary.failed > 0) {
      report += `❌ Failed Items:\n`;
      this.cleanupResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          report += `  - ${r.item.path}: ${r.details}\n`;
        });
      report += '\n';
    }
    
    if (summary.skipped > 0) {
      report += `⏭️ Skipped Items:\n`;
      this.cleanupResults
        .filter(r => r.status === 'skipped')
        .forEach(r => {
          report += `  - ${r.item.path}: ${r.details}\n`;
        });
      report += '\n';
    }
    
    report += `✅ Successful Items:\n`;
    this.cleanupResults
      .filter(r => r.status === 'success')
      .forEach(r => {
        report += `  - ${r.item.path}: ${r.details}\n`;
      });
    
    report += `\n📁 Archive Location: ${this.archiveDir}\n`;
    report += `🕒 Cleanup Date: ${new Date().toISOString()}\n`;
    
    return report;
  }
}

// Main execution function
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const cleanup = new LegacyWebSocketCleanup(dryRun);
  
  try {
    const results = await cleanup.runCleanup();
    
    console.log(cleanup.generateReport());
    
    if (results.summary.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Legacy WebSocket cleanup failed', {}, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export type { CleanupItem, CleanupResult };