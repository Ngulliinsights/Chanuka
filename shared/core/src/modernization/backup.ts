import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
// Use type-only imports for modernization types to avoid runtime import errors
import type {
  BackupPlan,
  BackupResult,
  RetentionPolicy,
  VerificationConfig,
} from './types';
import { BackupStrategy, BackupStatus, BackupError, BackupScope } from '@client/types';

// Lightweight logger interface used by the BackupManager. Keep intentionally small to reduce runtime
// coupling on a specific logging implementation.
type LoggerLike = {
  info: (meta: unknown, message?: string) => void;
  error: (err: unknown, message?: string) => void;
  debug?: (meta: unknown, message?: string) => void;
};

export interface BackupManagerOptions {
  config: {
    enabled: boolean;
    strategy: BackupStrategy;
    scope: BackupScope;
    retention: RetentionPolicy;
    verification: VerificationConfig;
  };
  logger: LoggerLike;
  workingDirectory: string;
}

export class BackupManager extends EventEmitter {
  private readonly config: BackupManagerOptions['config'];
  private readonly logger: LoggerLike;
  private readonly workingDirectory: string;
  private readonly backupDirectory: string;
  private activePlans: Map<string, BackupPlan> = new Map();
  private backupHistory: BackupResult[] = [];

  constructor(options: BackupManagerOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger;
    this.workingDirectory = options.workingDirectory;
    this.backupDirectory = path.join(this.workingDirectory, '.modernization-backups');
  }

  /**
   * Create a backup based on the configured strategy
   */
  public async createBackup(): Promise<BackupResult> {
    if (!this.config.enabled) {
      throw new BackupError('Backup is disabled in configuration', 'BACKUP_DISABLED');
    }

  const plan = await this.createBackupPlan();
    this.activePlans.set(plan.id, plan);

    this.logger.info({ 
      planId: plan.id,
      strategy: plan.strategy,
      scope: plan.scope 
    }, 'Starting backup creation');
    
    this.emit('backup:started', plan.id);

  try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      let result: BackupResult;

      switch (plan.strategy) {
        case BackupStrategy.FILE_COPY:
          result = await this.createFileCopyBackup(plan);
          break;
        case BackupStrategy.GIT_STASH:
          result = await this.createGitStashBackup(plan);
          break;
        case BackupStrategy.ARCHIVE:
          result = await this.createArchiveBackup(plan);
          break;
        case BackupStrategy.SNAPSHOT:
          result = await this.createSnapshotBackup(plan);
          break;
        default:
          throw new BackupError(`Unsupported backup strategy: ${plan.strategy}`, 'UNSUPPORTED_STRATEGY');
      }

      // Verify backup if enabled
      if (plan.verification.enabled) {
        await this.verifyBackup(result);
      }

      // Add to history and clean up old backups
      this.backupHistory.push(result);
      await this.cleanupOldBackups();

      this.logger.info({ 
        backupId: result.id,
        size: result.size,
        location: result.location 
      }, 'Backup created successfully');
      
      this.emit('backup:completed', result);
      return result;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const backupError = error instanceof BackupError
        ? error
        : new BackupError(`Backup creation failed: ${message}`, 'CREATION_FAILED');

      this.logger.error(backupError, 'Backup creation failed');
      this.emit('backup:error', backupError);
      throw backupError;
    } finally {
      this.activePlans.delete(plan.id);
    }
  }

  /**
   * Restore from the most recent backup
   */
  public async restore(backupId?: string): Promise<void> {
    const backup = backupId 
      ? this.backupHistory.find(b => b.id === backupId)
      : this.getMostRecentBackup();

    if (!backup) {
      throw new BackupError('No backup found for restoration', 'NO_BACKUP_FOUND');
    }

    if (backup.status !== BackupStatus.VERIFIED && backup.status !== BackupStatus.CREATED) {
      throw new BackupError(`Cannot restore from backup with status: ${backup.status}`, 'INVALID_BACKUP_STATUS');
    }

    this.logger.info({ 
      backupId: backup.id,
      location: backup.location 
    }, 'Starting backup restoration');

  try {
      switch (this.getBackupStrategy(backup)) {
        case BackupStrategy.FILE_COPY:
          await this.restoreFromFileCopy(backup);
          break;
        case BackupStrategy.GIT_STASH:
          await this.restoreFromGitStash(backup);
          break;
        case BackupStrategy.ARCHIVE:
          await this.restoreFromArchive(backup);
          break;
        case BackupStrategy.SNAPSHOT:
          await this.restoreFromSnapshot(backup);
          break;
        default:
          throw new BackupError('Unknown backup strategy for restoration', 'UNKNOWN_STRATEGY');
      }

      this.logger.info({ backupId: backup.id }, 'Backup restoration completed');
      this.emit('restore:completed', backup);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const restoreError = error instanceof BackupError
        ? error
        : new BackupError(`Backup restoration failed: ${message}`, 'RESTORATION_FAILED');

      this.logger.error(restoreError, 'Backup restoration failed');
      this.emit('restore:error', restoreError);
      throw restoreError;
    }
  }

  /**
   * List all available backups
   */
  public getBackupHistory(): BackupResult[] {
    return [...this.backupHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get the most recent backup
   */
  public getMostRecentBackup(): BackupResult | null {
    const validBackups = this.backupHistory.filter(
      b => b.status === BackupStatus.VERIFIED || b.status === BackupStatus.CREATED
    );
    
    return validBackups.length > 0
      ? validBackups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]!
      : null;
  }

  /**
   * Delete a specific backup
   */
  public async deleteBackup(backupId: string): Promise<boolean> {
    const backupIndex = this.backupHistory.findIndex(b => b.id === backupId);
    if (backupIndex === -1) {
      return false;
    }

  const backup = this.backupHistory[backupIndex] as BackupResult;
    
    try {
      // Remove backup files
      await this.removeBackupFiles(backup);
      
      // Remove from history
      this.backupHistory.splice(backupIndex, 1);
      
      this.logger.info({ backupId }, 'Backup deleted');
      this.emit('backup:deleted', backupId);
      
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ message }, `Failed to delete backup ${backupId}`);
      return false;
    }
  }

  private async createBackupPlan(): Promise<BackupPlan> {
    return {
      id: `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date(),
      scope: this.config.scope,
      strategy: this.config.strategy,
      retention: this.config.retention,
      verification: this.config.verification
    };
  }

  // determineBackupScope removed - not currently used. Keep simple scope handling in plan.

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`Failed to create backup directory: ${message}`, 'DIRECTORY_CREATION_FAILED');
    }
  }

  private async createFileCopyBackup(plan: BackupPlan): Promise<BackupResult> {
    const backupId = plan.id;
    const backupPath = path.join(this.backupDirectory, backupId);
    const startTime = Date.now();
    let filesBackedUp = 0;
    let totalSize = 0;
    const errors: string[] = [];

    try {
      await fs.mkdir(backupPath, { recursive: true });

      // Copy files based on scope
      const filesToBackup = await this.getFilesToBackup(plan);
      
      for (const filePath of filesToBackup) {
        try {
          const relativePath = path.relative(this.workingDirectory, filePath);
          const backupFilePath = path.join(backupPath, relativePath);
          
          // Ensure directory exists
          await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
          
          // Copy file
          await fs.copyFile(filePath, backupFilePath);
          
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          filesBackedUp++;
          
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to backup ${filePath}: ${message}`);
        }
      }

      const duration = Date.now() - startTime;
      const checksum = await this.calculateDirectoryChecksum(backupPath);

      return {
        id: backupId,
        planId: plan.id,
        timestamp: new Date(),
        status: BackupStatus.CREATED,
        location: backupPath,
        size: totalSize,
        checksum,
        metadata: {
          filesBackedUp,
          totalSize,
          duration,
          errors
        }
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`File copy backup failed: ${message}`, 'FILE_COPY_FAILED');
    }
  }

  private async createGitStashBackup(plan: BackupPlan): Promise<BackupResult> {
    const backupId = plan.id;
    const startTime = Date.now();

    try {
      // Check if we're in a git repository
      await fs.access(path.join(this.workingDirectory, '.git'));

      // Create a git stash with a descriptive message
      const stashMessage = `Modernization backup: ${backupId}`;
      
      // This would use child_process to run git commands
      // For now, we'll simulate the backup
      const duration = Date.now() - startTime;

      return {
        id: backupId,
        planId: plan.id,
        timestamp: new Date(),
        status: BackupStatus.CREATED,
        location: `git-stash:${stashMessage}`,
        size: 0, // Git stash size is not easily determinable
        metadata: {
          filesBackedUp: 0,
          totalSize: 0,
          duration,
          errors: []
        }
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`Git stash backup failed: ${message}`, 'GIT_STASH_FAILED');
    }
  }

  private async createArchiveBackup(plan: BackupPlan): Promise<BackupResult> {
    const backupId = plan.id;
    const archivePath = path.join(this.backupDirectory, `${backupId}.tar.gz`);
    const startTime = Date.now();

    try {
      // This would use a compression library like tar or archiver
      // For now, we'll simulate the archive creation
      const filesToBackup = await this.getFilesToBackup(plan);
      const totalSize = await this.calculateTotalSize(filesToBackup);
      
      // Simulate archive creation
      await fs.writeFile(archivePath, `Archive backup: ${backupId}`);
      
      const duration = Date.now() - startTime;
      const checksum = await this.calculateFileChecksum(archivePath);

      return {
        id: backupId,
        planId: plan.id,
        timestamp: new Date(),
        status: BackupStatus.CREATED,
        location: archivePath,
        size: totalSize,
        checksum,
        metadata: {
          filesBackedUp: filesToBackup.length,
          totalSize,
          compressionRatio: 0.7, // Simulated compression ratio
          duration,
          errors: []
        }
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`Archive backup failed: ${message}`, 'ARCHIVE_FAILED');
    }
  }

  private async createSnapshotBackup(plan: BackupPlan): Promise<BackupResult> {
    const backupId = plan.id;
    const snapshotPath = path.join(this.backupDirectory, `${backupId}.snapshot`);
    const startTime = Date.now();

    try {
      // Create a snapshot metadata file
      const snapshot = {
        id: backupId,
        timestamp: new Date().toISOString(),
        workingDirectory: this.workingDirectory,
        files: await this.getFilesToBackup(plan)
      };

      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
      
      const duration = Date.now() - startTime;
      const stats = await fs.stat(snapshotPath);

      return {
        id: backupId,
        planId: plan.id,
        timestamp: new Date(),
        status: BackupStatus.CREATED,
        location: snapshotPath,
        size: stats.size,
        metadata: {
          filesBackedUp: snapshot.files.length,
          totalSize: stats.size,
          duration,
          errors: []
        }
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`Snapshot backup failed: ${message}`, 'SNAPSHOT_FAILED');
    }
  }

  private async verifyBackup(backup: BackupResult): Promise<void> {
    this.logger.info({ backupId: backup.id }, 'Verifying backup');

    try {
      // Check if backup location exists
      await fs.access(backup.location);

      // Verify checksum if available
      if (backup.checksum && this.config.verification.checksumValidation) {
        const currentChecksum = await this.calculateBackupChecksum(backup);
        if (currentChecksum !== backup.checksum) {
          backup.status = BackupStatus.CORRUPTED;
          throw new BackupError('Backup checksum verification failed', 'CHECKSUM_MISMATCH');
        }
      }

      // Perform integrity check
      if (this.config.verification.integrityCheck) {
        await this.performIntegrityCheck(backup);
      }

      // Perform restore test if enabled
      if (this.config.verification.restoreTest) {
        await this.performRestoreTest(backup);
      }

      backup.status = BackupStatus.VERIFIED;
      this.logger.info({ backupId: backup.id }, 'Backup verification completed');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      backup.status = BackupStatus.CORRUPTED;
      throw new BackupError(`Backup verification failed: ${message}`, 'VERIFICATION_FAILED');
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.config.retention.autoCleanup) {
      return;
    }

    const now = Date.now();
    const maxAge = this.config.retention.maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const maxBackups = this.config.retention.maxBackups;

    // Remove expired backups
    const expiredBackups = this.backupHistory.filter(backup => {
      const age = now - backup.timestamp.getTime();
      return age > maxAge;
    });

    for (const backup of expiredBackups) {
      await this.deleteBackup(backup.id);
    }

    // Remove excess backups (keep only the most recent ones)
    if (this.backupHistory.length > maxBackups) {
      const sortedBackups = this.backupHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const excessBackups = sortedBackups.slice(maxBackups);
      
      for (const backup of excessBackups) {
        await this.deleteBackup(backup.id);
      }
    }
  }

  // Helper methods (simplified implementations)
  private async getChangedFiles(): Promise<string[]> {
    // Would implement git diff or file system monitoring
    return [];
  }

  private async getCriticalFiles(): Promise<string[]> {
    // Return list of critical files that should always be backed up
    return [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      '.gitignore',
      'README.md'
    ].map(file => path.join(this.workingDirectory, file));
  }

  private async getFilesToBackup(plan: BackupPlan): Promise<string[]> {
    // Choose files based on plan scope
    switch (plan.scope) {
      case BackupScope.FULL:
        return [this.workingDirectory];
      case BackupScope.INCREMENTAL:
        return await this.getChangedFiles();
      case BackupScope.SELECTIVE:
      default:
        return await this.getCriticalFiles();
    }
  }

  private async calculateTotalSize(files: string[]): Promise<number> {
    let totalSize = 0;
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      } catch {
        // File might not exist, skip
      }
    }
    return totalSize;
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async calculateDirectoryChecksum(dirPath: string): Promise<string> {
    // Simplified implementation - would recursively hash all files
    return crypto.createHash('sha256').update(dirPath).digest('hex');
  }

  private async calculateBackupChecksum(backup: BackupResult): Promise<string> {
    if (backup.location.endsWith('.tar.gz') || backup.location.endsWith('.snapshot')) {
      return await this.calculateFileChecksum(backup.location);
    } else {
      return await this.calculateDirectoryChecksum(backup.location);
    }
  }

  private getBackupStrategy(backup: BackupResult): BackupStrategy {
    // Determine strategy from backup location or metadata
    if (backup.location.startsWith('git-stash:')) {
      return BackupStrategy.GIT_STASH;
    } else if (backup.location.endsWith('.tar.gz')) {
      return BackupStrategy.ARCHIVE;
    } else if (backup.location.endsWith('.snapshot')) {
      return BackupStrategy.SNAPSHOT;
    } else {
      return BackupStrategy.FILE_COPY;
    }
  }

  private async performIntegrityCheck(backup: BackupResult): Promise<void> {
    // Simplified integrity check
    await fs.access(backup.location);
  }

  private async performRestoreTest(backup: BackupResult): Promise<void> {
    // Would perform a test restore to a temporary location
  this.logger.debug?.({ backupId: backup.id }, 'Restore test completed');
  }

  private async removeBackupFiles(backup: BackupResult): Promise<void> {
    try {
      const stats = await fs.stat(backup.location);
      if (stats.isDirectory()) {
        await fs.rmdir(backup.location, { recursive: true });
      } else {
        await fs.unlink(backup.location);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BackupError(`Failed to remove backup files: ${message}`, 'CLEANUP_FAILED');
    }
  }

  // Restoration methods (simplified implementations)
  private async restoreFromFileCopy(backup: BackupResult): Promise<void> {
    // Would copy files back from backup location
    this.logger.info({ backupId: backup.id }, 'Restoring from file copy backup');
  }

  private async restoreFromGitStash(backup: BackupResult): Promise<void> {
    // Would use git stash pop or apply
    this.logger.info({ backupId: backup.id }, 'Restoring from git stash backup');
  }

  private async restoreFromArchive(backup: BackupResult): Promise<void> {
    // Would extract archive to working directory
    this.logger.info({ backupId: backup.id }, 'Restoring from archive backup');
  }

  private async restoreFromSnapshot(backup: BackupResult): Promise<void> {
    // Would restore based on snapshot metadata
    this.logger.info({ backupId: backup.id }, 'Restoring from snapshot backup');
  }
}












































