import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { CleanupPlan } from './orchestrator';

export interface BackupSystemConfig {
  enabled: boolean;
  backupDirectory: string;
  compressionEnabled: boolean;
  checksumValidation: boolean;
  retentionDays: number;
  maxBackups: number;
}

export interface BackupManifest {
  id: string;
  timestamp: string;
  planId: string;
  files: BackupFileInfo[];
  checksums: Record<string, string>;
  metadata: {
    totalFiles: number;
    totalSize: number;
    compressionRatio?: number;
  };
}

export interface BackupFileInfo {
  originalPath: string;
  backupPath: string;
  size: number;
  checksum: string;
  lastModified: string;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  backupPath: string;
  manifest: BackupManifest;
  errors: string[];
  warnings: string[];
}

export class BackupSystem {
  private readonly config: BackupSystemConfig;
  private readonly rootPath: string;

  constructor(rootPath: string, config: Partial<BackupSystemConfig> = {}) {
    this.rootPath = rootPath;
    this.config = {
      enabled: true,
      backupDirectory: '.cleanup-backups',
      compressionEnabled: false,
      checksumValidation: true,
      retentionDays: 30,
      maxBackups: 10,
      ...config
    };
  }

  /**
   * Create a comprehensive backup before cleanup operations
   */
  async createBackup(plan: CleanupPlan): Promise<BackupResult> {
    if (!this.config.enabled) {
      throw new Error('Backup system is disabled');
    }

    const backupId = `backup-${Date.now()}-${this.generateShortId()}`;
    const backupPath = join(this.rootPath, this.config.backupDirectory, backupId);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Collect all files that will be affected
      const filesToBackup = this.collectFilesToBackup(plan);
      
      // Create backup manifest
      const manifest: BackupManifest = {
        id: backupId,
        timestamp: new Date().toISOString(),
        planId: plan.id,
        files: [],
        checksums: {},
        metadata: {
          totalFiles: filesToBackup.length,
          totalSize: 0
        }
      };

      // Backup each file
      for (const filePath of filesToBackup) {
        try {
          const backupInfo = await this.backupFile(filePath, backupPath);
          manifest.files.push(backupInfo);
          manifest.checksums[filePath] = backupInfo.checksum;
          manifest.metadata.totalSize += backupInfo.size;
        } catch (error) {
          errors.push(`Failed to backup ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Create backup of critical system files
      await this.backupCriticalFiles(backupPath, manifest);

      // Save manifest
      await fs.writeFile(
        join(backupPath, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Create restoration script
      await this.createRestorationScript(backupPath, manifest);

      // Verify backup integrity
      if (this.config.checksumValidation) {
        await this.verifyBackupIntegrity(backupPath, manifest);
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log(`✅ Backup created successfully: ${backupId}`);
      console.log(`📁 Backup location: ${backupPath}`);
      console.log(`📊 Files backed up: ${manifest.files.length}`);
      console.log(`💾 Total size: ${this.formatBytes(manifest.metadata.totalSize)}`);

      return {
        success: true,
        backupId,
        backupPath,
        manifest,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        backupId,
        backupPath,
        manifest: {} as BackupManifest,
        errors,
        warnings
      };
    }
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    const backupPath = join(this.rootPath, this.config.backupDirectory, backupId);
    const manifestPath = join(backupPath, 'manifest.json');

    try {
      // Load manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: BackupManifest = JSON.parse(manifestContent);

      console.log(`🔄 Restoring from backup: ${backupId}`);
      console.log(`📅 Backup created: ${manifest.timestamp}`);
      console.log(`📁 Files to restore: ${manifest.files.length}`);

      // Verify backup integrity before restoration
      if (this.config.checksumValidation) {
        await this.verifyBackupIntegrity(backupPath, manifest);
      }

      // Restore each file
      for (const fileInfo of manifest.files) {
        try {
          await this.restoreFile(fileInfo, backupPath);
        } catch (error) {
          console.error(`❌ Failed to restore ${fileInfo.originalPath}:`, error);
        }
      }

      console.log(`✅ Restoration completed from backup: ${backupId}`);

    } catch (error) {
      throw new Error(`Failed to restore from backup ${backupId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupManifest[]> {
    const backupDir = join(this.rootPath, this.config.backupDirectory);
    
    try {
      const backupFolders = await fs.readdir(backupDir);
      const backups: BackupManifest[] = [];

      for (const folder of backupFolders) {
        try {
          const manifestPath = join(backupDir, folder, 'manifest.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest: BackupManifest = JSON.parse(manifestContent);
          backups.push(manifest);
        } catch (error) {
          // Skip invalid backup folders
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    const backupPath = join(this.rootPath, this.config.backupDirectory, backupId);
    
    try {
      await fs.rmdir(backupPath, { recursive: true });
      console.log(`🗑️ Deleted backup: ${backupId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Collect all files that need to be backed up
   */
  private collectFilesToBackup(plan: CleanupPlan): string[] {
    const files = new Set<string>();

    // Files to be removed
    plan.filesToRemove.forEach(op => files.add(op.path));

    // Files to be moved
    plan.filesToMove.forEach(op => files.add(op.source));

    // Files to be consolidated
    plan.filesToConsolidate.forEach(op => {
      op.sources.forEach(source => files.add(source));
    });

    // Scripts to be merged
    plan.scriptsToMerge.forEach(op => {
      op.scripts.forEach(script => files.add(script));
    });

    return Array.from(files);
  }

  /**
   * Backup a single file
   */
  private async backupFile(filePath: string, backupBasePath: string): Promise<BackupFileInfo> {
    const sourcePath = join(this.rootPath, filePath);
    const backupFilePath = join(backupBasePath, 'files', filePath);

    // Create directory structure
    await fs.mkdir(dirname(backupFilePath), { recursive: true });

    // Copy file
    await fs.copyFile(sourcePath, backupFilePath);

    // Get file stats
    const stats = await fs.stat(sourcePath);

    // Calculate checksum
    const checksum = await this.calculateFileChecksum(sourcePath);

    return {
      originalPath: filePath,
      backupPath: join('files', filePath),
      size: stats.size,
      checksum,
      lastModified: stats.mtime.toISOString()
    };
  }

  /**
   * Backup critical system files
   */
  private async backupCriticalFiles(backupPath: string, manifest: BackupManifest): Promise<void> {
    const criticalFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      '.gitignore'
    ];

    const systemBackupPath = join(backupPath, 'system');
    await fs.mkdir(systemBackupPath, { recursive: true });

    for (const file of criticalFiles) {
      try {
        const sourcePath = join(this.rootPath, file);
        const backupFilePath = join(systemBackupPath, file);
        
        await fs.copyFile(sourcePath, backupFilePath);
        
        const stats = await fs.stat(sourcePath);
        const checksum = await this.calculateFileChecksum(sourcePath);

        manifest.files.push({
          originalPath: file,
          backupPath: join('system', file),
          size: stats.size,
          checksum,
          lastModified: stats.mtime.toISOString()
        });

        manifest.checksums[file] = checksum;
        manifest.metadata.totalSize += stats.size;

      } catch (error) {
        // Critical file doesn't exist, skip
      }
    }
  }

  /**
   * Create a restoration script
   */
  private async createRestorationScript(backupPath: string, manifest: BackupManifest): Promise<void> {
    const scriptContent = `#!/bin/bash

# Restoration script for backup: ${manifest.id}
# Created: ${manifest.timestamp}
# Files: ${manifest.files.length}

set -e

BACKUP_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$BACKUP_DIR/../../../" && pwd)"

echo "🔄 Restoring from backup: ${manifest.id}"
echo "📁 Backup directory: $BACKUP_DIR"
echo "🏠 Root directory: $ROOT_DIR"

# Restore files
${manifest.files.map(file => `
echo "Restoring: ${file.originalPath}"
mkdir -p "$(dirname "$ROOT_DIR/${file.originalPath}")"
cp "$BACKUP_DIR/${file.backupPath}" "$ROOT_DIR/${file.originalPath}"
`).join('')}

echo "✅ Restoration completed"
`;

    await fs.writeFile(join(backupPath, 'restore.sh'), scriptContent);
    await fs.chmod(join(backupPath, 'restore.sh'), 0o755);
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(backupPath: string, manifest: BackupManifest): Promise<void> {
    for (const fileInfo of manifest.files) {
      const backupFilePath = join(backupPath, fileInfo.backupPath);
      
      try {
        // Check if file exists
        await fs.access(backupFilePath);
        
        // Verify checksum
        const currentChecksum = await this.calculateFileChecksum(backupFilePath);
        if (currentChecksum !== fileInfo.checksum) {
          throw new Error(`Checksum mismatch for ${fileInfo.originalPath}`);
        }
      } catch (error) {
        throw new Error(`Backup integrity check failed for ${fileInfo.originalPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Restore a single file
   */
  private async restoreFile(fileInfo: BackupFileInfo, backupBasePath: string): Promise<void> {
    const backupFilePath = join(backupBasePath, fileInfo.backupPath);
    const restorePath = join(this.rootPath, fileInfo.originalPath);

    // Create directory structure
    await fs.mkdir(dirname(restorePath), { recursive: true });

    // Copy file back
    await fs.copyFile(backupFilePath, restorePath);

    // Verify checksum
    if (this.config.checksumValidation) {
      const checksum = await this.calculateFileChecksum(restorePath);
      if (checksum !== fileInfo.checksum) {
        throw new Error(`Checksum verification failed after restoration`);
      }
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    // Remove backups older than retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const oldBackups = backups.filter(backup => 
      new Date(backup.timestamp) < cutoffDate
    );

    // Remove excess backups (keep only maxBackups)
    const excessBackups = backups.slice(this.config.maxBackups);

    const backupsToDelete = [...oldBackups, ...excessBackups];

    for (const backup of backupsToDelete) {
      await this.deleteBackup(backup.id);
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate a short random ID
   */
  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}















































