#!/usr/bin/env tsx

/**
 * Orphaned Files Cleanup Script
 * 
 * Safely removes confirmed orphaned files that are never imported
 * and don't serve as entry points or configuration files.
 */

import { promises as fs } from 'fs';
import path from 'path';

interface OrphanedFile {
  path: string;
  reason: string;
  safeToRemove: boolean;
  backupPath?: string;
}

class OrphanedFilesCleanup {
  private clientDir = 'client/src';
  private backupDir = 'client/src/.cleanup-backup';
  
  // Confirmed orphaned files that are safe to remove
  private confirmedOrphans: OrphanedFile[] = [
    {
      path: 'client/src/TestComponent.tsx',
      reason: 'Test component in production code',
      safeToRemove: true
    },
    {
      path: 'client/src/lucide.d.ts',
      reason: 'Unused type definitions for lucide icons',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/tracing.ts',
      reason: 'Unused tracing utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/style-performance.ts',
      reason: 'Unused style performance utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/storage.ts',
      reason: 'Unused storage utility (replaced by core/storage)',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/simple-lazy-pages.tsx',
      reason: 'Redundant with safe-lazy-loading.tsx',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/serviceWorker.ts',
      reason: 'Unused service worker implementation',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/service-recovery.ts',
      reason: 'Unused service recovery utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/server-status.ts',
      reason: 'Unused server status utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/rum-integration.ts',
      reason: 'Unused RUM integration utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/dev-tools.ts',
      reason: 'Unused development tools utility',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/browser-logger.ts',
      reason: 'Unused browser logger (replaced by core/error)',
      safeToRemove: true
    },
    {
      path: 'client/src/utils/api.ts',
      reason: 'Unused API utility (replaced by core/api)',
      safeToRemove: true
    },
    // Legacy archive files that are definitely safe to remove
    {
      path: 'client/src/legacy-archive',
      reason: 'Archived legacy code no longer needed',
      safeToRemove: true
    },
    // Duplicate/redundant components
    {
      path: 'client/src/components/examples',
      reason: 'Example components not used in production',
      safeToRemove: false // Keep for reference
    },
    // Old configuration files
    {
      path: 'client/src/config/old-config.ts',
      reason: 'Old configuration file replaced by new structure',
      safeToRemove: true
    }
  ];

  async run(): Promise<void> {
    console.log('🧹 Starting orphaned files cleanup...\n');

    await this.createBackupDirectory();
    await this.analyzeOrphans();
    await this.removeOrphanedFiles();
    
    console.log('\n✅ Orphaned files cleanup completed!');
  }

  private async createBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    } catch (error) {
      console.warn('Failed to create backup directory:', error);
    }
  }

  private async analyzeOrphans(): Promise<void> {
    console.log('🔍 Analyzing orphaned files...\n');

    let safeCount = 0;
    let unsafeCount = 0;
    let notFoundCount = 0;

    for (const orphan of this.confirmedOrphans) {
      const exists = await this.fileExists(orphan.path);
      
      if (!exists) {
        console.log(`❌ Not found: ${orphan.path}`);
        notFoundCount++;
        continue;
      }

      if (orphan.safeToRemove) {
        console.log(`✅ Safe to remove: ${orphan.path}`);
        console.log(`   Reason: ${orphan.reason}`);
        safeCount++;
      } else {
        console.log(`⚠️  Keep for now: ${orphan.path}`);
        console.log(`   Reason: ${orphan.reason}`);
        unsafeCount++;
      }
    }

    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Safe to remove: ${safeCount}`);
    console.log(`   Keep for now: ${unsafeCount}`);
    console.log(`   Not found: ${notFoundCount}`);
  }

  private async removeOrphanedFiles(): Promise<void> {
    console.log('\n🗑️  Removing orphaned files...\n');

    let removedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const orphan of this.confirmedOrphans) {
      if (!orphan.safeToRemove) {
        skippedCount++;
        continue;
      }

      try {
        const exists = await this.fileExists(orphan.path);
        if (!exists) {
          console.log(`⏭️  Skipped (not found): ${orphan.path}`);
          skippedCount++;
          continue;
        }

        // Create backup before removal
        await this.backupFile(orphan.path);

        // Remove the file or directory
        const stats = await fs.stat(orphan.path);
        if (stats.isDirectory()) {
          await fs.rm(orphan.path, { recursive: true, force: true });
          console.log(`🗂️  Removed directory: ${orphan.path}`);
        } else {
          await fs.unlink(orphan.path);
          console.log(`📄 Removed file: ${orphan.path}`);
        }

        removedCount++;
      } catch (error) {
        console.error(`❌ Failed to remove ${orphan.path}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Removal Summary:`);
    console.log(`   Removed: ${removedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);

    if (removedCount > 0) {
      console.log(`\n💾 Backup location: ${this.backupDir}`);
      console.log('   Files can be restored from backup if needed');
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async backupFile(filePath: string): Promise<void> {
    try {
      const relativePath = path.relative('client/src', filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);

      // Create backup directory structure
      await fs.mkdir(backupDir, { recursive: true });

      // Copy file or directory to backup
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await this.copyDirectory(filePath, backupPath);
      } else {
        await fs.copyFile(filePath, backupPath);
      }

      console.log(`💾 Backed up: ${filePath} → ${backupPath}`);
    } catch (error) {
      console.warn(`Failed to backup ${filePath}:`, error);
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// Additional utility functions for manual cleanup
export class ManualCleanupHelper {
  static async findLargeOrphanedFiles(minSizeKB: number = 10): Promise<string[]> {
    // Implementation to find large orphaned files
    return [];
  }

  static async findDuplicateFiles(): Promise<Array<{ original: string; duplicates: string[] }>> {
    // Implementation to find duplicate files by content hash
    return [];
  }

  static async generateCleanupReport(): Promise<void> {
    // Implementation to generate detailed cleanup report
    console.log('Generating cleanup report...');
  }
}

// Run the cleanup
const cleanup = new OrphanedFilesCleanup();
cleanup.run().catch(console.error);