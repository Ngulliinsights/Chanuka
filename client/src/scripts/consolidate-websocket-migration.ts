/**
 * WebSocket Consolidation Migration Script
 *
 * Consolidates all WebSocket-related logic from scattered locations into core/realtime
 * following FSD (Feature-Sliced Design) principles.
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationTask {
  source: string;
  target: string;
  action: 'move' | 'copy' | 'merge' | 'delete';
  description: string;
}

const MIGRATION_TASKS: MigrationTask[] = [
  // Move existing WebSocket services to core/realtime/services
  {
    source: 'client/src/services/webSocketService.ts',
    target: 'client/src/infrastructure/realtime/services/legacy-websocket-service.ts',
    action: 'move',
    description: 'Move legacy WebSocket service to core/realtime (will be deprecated)',
  },
  {
    source: 'client/src/services/CommunityWebSocketManager.ts',
    target: 'client/src/infrastructure/realtime/services/legacy-community-websocket.ts',
    action: 'move',
    description: 'Move legacy community WebSocket manager to core/realtime (will be deprecated)',
  },
  {
    source: 'client/src/services/community-websocket-extension.ts',
    target: 'client/src/infrastructure/realtime/services/legacy-community-extension.ts',
    action: 'move',
    description: 'Move legacy community WebSocket extension to core/realtime (will be deprecated)',
  },

  // Move WebSocket hooks to core/realtime/hooks
  {
    source: 'client/src/hooks/use-websocket.ts',
    target: 'client/src/infrastructure/realtime/hooks/use-websocket-legacy.ts',
    action: 'move',
    description: 'Move legacy WebSocket hook (will be replaced by new implementation)',
  },
  {
    source: 'client/src/hooks/useRealTimeEngagement.ts',
    target: 'client/src/infrastructure/realtime/hooks/use-realtime-engagement-legacy.ts',
    action: 'move',
    description: 'Move legacy real-time engagement hook to core/realtime',
  },

  // Move WebSocket utilities to core/realtime/utils
  {
    source: 'client/src/utils/realtime-optimizer.ts',
    target: 'client/src/infrastructure/realtime/utils/optimizer.ts',
    action: 'move',
    description: 'Move real-time optimizer to core/realtime',
  },

  // Move WebSocket examples to core/realtime/examples
  {
    source: 'client/src/examples/WebSocketIntegrationExample.tsx',
    target: 'client/src/infrastructure/realtime/examples/integration-example.tsx',
    action: 'move',
    description: 'Move WebSocket integration example to core/realtime',
  },

  // Update import statements in affected files
  {
    source: 'client/src/features/bills/services/tracking.ts',
    target: 'client/src/features/bills/services/tracking.ts',
    action: 'merge',
    description: 'Update imports to use consolidated WebSocket service',
  },

  // Update store slice imports
  {
    source: 'client/src/store/slices/realTimeSlice.ts',
    target: 'client/src/store/slices/realTimeSlice.ts',
    action: 'merge',
    description: 'Update real-time slice to use consolidated types',
  },

  // Update existing WebSocket usage in core API
  {
    source: 'client/src/infrastructure/api/websocket.ts',
    target: 'client/src/infrastructure/api/websocket-legacy.ts',
    action: 'move',
    description: 'Move existing WebSocket implementation to legacy (will be replaced)',
  },
];

class WebSocketConsolidationMigrator {
  private dryRun: boolean;
  private verbose: boolean;

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.dryRun = options.dryRun ?? false;
    this.verbose = options.verbose ?? false;
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting WebSocket consolidation migration...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    // Create target directories
    await this.createDirectories();

    // Execute migration tasks
    for (const task of MIGRATION_TASKS) {
      await this.executeTask(task);
    }

    // Update import statements
    await this.updateImportStatements();

    // Create index files
    await this.createIndexFiles();

    // Update main exports
    await this.updateMainExports();

    console.log('');
    console.log('✅ WebSocket consolidation migration completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the migrated files for any manual adjustments needed');
    console.log('2. Update any remaining import statements in your codebase');
    console.log('3. Test the consolidated WebSocket functionality');
    console.log('4. Remove any unused legacy files');
  }

  private async createDirectories(): Promise<void> {
    const directories = [
      'client/src/infrastructure/realtime',
      'client/src/infrastructure/realtime/websocket',
      'client/src/infrastructure/realtime/services',
      'client/src/infrastructure/realtime/hooks',
      'client/src/infrastructure/realtime/utils',
      'client/src/infrastructure/realtime/examples',
      'client/src/infrastructure/realtime/types',
    ];

    for (const dir of directories) {
      if (!this.dryRun) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      if (this.verbose) {
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  private async executeTask(task: MigrationTask): Promise<void> {
    console.log(`${this.getActionIcon(task.action)} ${task.description}`);

    if (this.dryRun) {
      console.log(`   Would ${task.action}: ${task.source} -> ${task.target}`);
      return;
    }

    try {
      switch (task.action) {
        case 'move':
          await this.moveFile(task.source, task.target);
          break;
        case 'copy':
          await this.copyFile(task.source, task.target);
          break;
        case 'merge':
          await this.mergeFile(task.source, task.target);
          break;
        case 'delete':
          await this.deleteFile(task.source);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to ${task.action} ${task.source}:`, error);
    }
  }

  private async moveFile(source: string, target: string): Promise<void> {
    if (!fs.existsSync(source)) {
      console.log(`   ⚠️  Source file not found: ${source}`);
      return;
    }

    // Ensure target directory exists
    const targetDir = path.dirname(target);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Read source file
    const content = await fs.promises.readFile(source, 'utf-8');

    // Update imports in the content
    const updatedContent = this.updateImportsInContent(content, source, target);

    // Write to target
    await fs.promises.writeFile(target, updatedContent);

    // Remove source
    await fs.promises.unlink(source);

    if (this.verbose) {
      console.log(`   ✅ Moved: ${source} -> ${target}`);
    }
  }

  private async copyFile(source: string, target: string): Promise<void> {
    if (!fs.existsSync(source)) {
      console.log(`   ⚠️  Source file not found: ${source}`);
      return;
    }

    // Ensure target directory exists
    const targetDir = path.dirname(target);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Read source file
    const content = await fs.promises.readFile(source, 'utf-8');

    // Update imports in the content
    const updatedContent = this.updateImportsInContent(content, source, target);

    // Write to target
    await fs.promises.writeFile(target, updatedContent);

    if (this.verbose) {
      console.log(`   ✅ Copied: ${source} -> ${target}`);
    }
  }

  private async mergeFile(source: string, target: string): Promise<void> {
    // For merge operations, we update import statements in existing files
    if (!fs.existsSync(target)) {
      console.log(`   ⚠️  Target file not found: ${target}`);
      return;
    }

    const content = await fs.promises.readFile(target, 'utf-8');
    const updatedContent = this.updateImportsInContent(content, target, target);

    if (content !== updatedContent) {
      await fs.promises.writeFile(target, updatedContent);
      if (this.verbose) {
        console.log(`   ✅ Updated imports in: ${target}`);
      }
    }
  }

  private async deleteFile(source: string): Promise<void> {
    if (!fs.existsSync(source)) {
      console.log(`   ⚠️  File not found: ${source}`);
      return;
    }

    await fs.promises.unlink(source);

    if (this.verbose) {
      console.log(`   ✅ Deleted: ${source}`);
    }
  }

  private updateImportsInContent(content: string, sourcePath: string, targetPath: string): string {
    // Update import statements to use the new consolidated paths
    const importMappings = [
      // WebSocket service imports - update to use new consolidated services
      {
        from: /from ['"]@client\/services\/webSocketService['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },
      {
        from: /from ['"]@client\/services\/CommunityWebSocketManager['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },
      {
        from: /from ['"]@client\/services\/community-websocket-extension['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },

      // Hook imports - update to use new consolidated hooks
      {
        from: /from ['"]@client\/hooks\/use-websocket['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },
      {
        from: /from ['"]@client\/hooks\/useRealTimeEngagement['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },

      // Utility imports
      {
        from: /from ['"]@client\/utils\/realtime-optimizer['"];?/g,
        to: "from '@client/infrastructure/realtime/utils/optimizer';",
      },

      // Core API WebSocket imports
      {
        from: /from ['"]@client\/core\/api\/websocket['"];?/g,
        to: "from '@client/infrastructure/realtime';",
      },

      // Type imports - update to use consolidated types
      {
        from: /from ['"]@client\/types\/realtime['"];?/g,
        to: "from '@client/infrastructure/realtime/types';",
      },

      // Store slice imports
      {
        from: /from ['"]@client\/store\/slices\/realTimeSlice['"];?/g,
        to: "from '@client/store/slices/realTimeSlice';", // Keep existing, but update its imports
      },

      // Relative imports within the realtime module
      {
        from: /from ['"]\.\.\/\.\.\/\.\.\/utils\/logger['"];?/g,
        to: "from '@client/lib/utils/logger';",
      },
      {
        from: /from ['"]\.\.\/\.\.\/\.\.\/types\/realtime['"];?/g,
        to: "from '../types';",
      },

      // Update specific service references
      {
        from: /webSocketService/g,
        to: 'realTimeService',
      },
      {
        from: /communityWebSocketManager/g,
        to: 'realTimeService.getCommunityService()',
      },
      {
        from: /billTrackingService/g,
        to: 'realTimeService.getBillTrackingService()',
      },
    ];

    let updatedContent = content;

    for (const mapping of importMappings) {
      updatedContent = updatedContent.replace(mapping.from, mapping.to);
    }

    return updatedContent;
  }

  private async updateImportStatements(): Promise<void> {
    console.log('🔄 Updating import statements across codebase...');

    const filesToUpdate = [
      'client/src/features/bills/services/tracking.ts',
      'client/src/features/community/hooks/useCommunityWebSocket.ts',
      'client/src/features/notifications/ui/NotificationCenter.tsx',
      'client/src/features/dashboard/pages/dashboard.tsx',
      'client/src/features/analytics/pages/analytics-dashboard.tsx',
    ];

    for (const filePath of filesToUpdate) {
      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const updatedContent = this.updateImportsInContent(content, filePath, filePath);

          if (content !== updatedContent && !this.dryRun) {
            await fs.promises.writeFile(filePath, updatedContent);
          }

          if (this.verbose) {
            console.log(`   ✅ Updated imports in: ${filePath}`);
          }
        } catch (error) {
          console.error(`   ❌ Failed to update imports in ${filePath}:`, error);
        }
      }
    }
  }

  private async createIndexFiles(): Promise<void> {
    console.log('📝 Creating index files...');

    const indexFiles = [
      {
        path: 'client/src/infrastructure/realtime/services/index.ts',
        content: `/**
 * Real-time Services
 */

export { RealTimeService } from './realtime-service';
export { BillTrackingService } from './bill-tracking';
export { CommunityService } from './community';
export { NotificationService } from './notifications';

// Legacy exports (deprecated)
export { WebSocketService } from './websocket-service';
export { CommunityWebSocketManager } from './community-websocket';`,
      },
      {
        path: 'client/src/infrastructure/realtime/hooks/index.ts',
        content: `/**
 * Real-time Hooks
 */

export { useWebSocket } from './use-websocket';
export { useRealTimeEngagement } from './use-realtime-engagement';
export { useBillTracking } from './use-bill-tracking';
export { useCommunityRealTime } from './use-community-realtime';`,
      },
      {
        path: 'client/src/infrastructure/realtime/utils/index.ts',
        content: `/**
 * Real-time Utilities
 */

export { EventEmitter } from './event-emitter';
export { WebSocketOptimizer } from './optimizer';`,
      },
    ];

    for (const indexFile of indexFiles) {
      if (!this.dryRun) {
        await fs.promises.writeFile(indexFile.path, indexFile.content);
      }

      if (this.verbose) {
        console.log(`   ✅ Created: ${indexFile.path}`);
      }
    }
  }

  private async updateMainExports(): Promise<void> {
    console.log('🔧 Updating main core exports...');

    const coreIndexPath = 'client/src/infrastructure/index.ts';

    if (!fs.existsSync(coreIndexPath)) {
      console.log('   ⚠️  Core index file not found, skipping...');
      return;
    }

    const content = await fs.promises.readFile(coreIndexPath, 'utf-8');

    // Add realtime exports if not already present
    if (!content.includes('realtime')) {
      const realtimeExport = `
// Real-time and WebSocket functionality
export * from './realtime';`;

      const updatedContent = content + realtimeExport;

      if (!this.dryRun) {
        await fs.promises.writeFile(coreIndexPath, updatedContent);
      }

      if (this.verbose) {
        console.log(`   ✅ Updated: ${coreIndexPath}`);
      }
    }
  }

  private getActionIcon(action: string): string {
    switch (action) {
      case 'move':
        return '📦';
      case 'copy':
        return '📋';
      case 'merge':
        return '🔄';
      case 'delete':
        return '🗑️';
      default:
        return '⚙️';
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const migrator = new WebSocketConsolidationMigrator({ dryRun, verbose });

  try {
    await migrator.migrate();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { WebSocketConsolidationMigrator };
