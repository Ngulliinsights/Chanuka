/**
 * Rollback Mechanism for Module Consolidation
 * 
 * Provides backup and restore functionality to rollback failed consolidations.
 * Ensures atomic operations with validation after rollback.
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rm = promisify(fs.rm);

/**
 * Represents a backup of the current module state
 */
export interface Backup {
  /** Unique identifier for this backup */
  id: string;
  /** Timestamp when backup was created */
  timestamp: Date;
  /** Path to backup directory */
  backupPath: string;
  /** List of files included in backup */
  files: string[];
  /** Metadata about the consolidation */
  metadata: BackupMetadata;
}

/**
 * Metadata about a backup
 */
export interface BackupMetadata {
  /** Name of the consolidation operation */
  operation: string;
  /** Source modules being consolidated */
  sourceModules: string[];
  /** Target module name */
  targetModule: string;
  /** Base directory of the modules */
  baseDir: string;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  backup?: Backup;
  error?: string;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  filesRestored: number;
  buildPassed: boolean;
  error?: string;
}

/**
 * Configuration for rollback operations
 */
export interface RollbackConfig {
  /** Directory to store backups */
  backupDir: string;
  /** Whether to validate build after rollback */
  validateBuild: boolean;
  /** Command to run for build validation */
  buildCommand: string;
}

/**
 * Default rollback configuration
 */
const DEFAULT_CONFIG: RollbackConfig = {
  backupDir: '.kiro/backups/consolidation',
  validateBuild: true,
  buildCommand: 'npm run build',
};

/**
 * Recursively copies a directory
 * 
 * @param src - Source directory
 * @param dest - Destination directory
 * @returns Array of copied file paths
 */
async function copyDirectory(src: string, dest: string): Promise<string[]> {
  const copiedFiles: string[] = [];
  
  // Create destination directory
  await mkdir(dest, { recursive: true });
  
  // Read source directory
  const entries = await readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      const subFiles = await copyDirectory(srcPath, destPath);
      copiedFiles.push(...subFiles);
    } else {
      // Copy file
      await copyFile(srcPath, destPath);
      copiedFiles.push(srcPath);
    }
  }
  
  return copiedFiles;
}

/**
 * Creates a backup of the current module state
 * 
 * @param metadata - Metadata about the consolidation
 * @param config - Rollback configuration
 * @returns Backup result
 */
export async function createBackup(
  metadata: BackupMetadata,
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<BackupResult> {
  try {
    // Generate unique backup ID
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const backupPath = path.join(config.backupDir, backupId);
    
    // Create backup directory
    await mkdir(backupPath, { recursive: true });
    
    // Copy all source modules to backup
    const allFiles: string[] = [];
    
    for (const moduleName of metadata.sourceModules) {
      const modulePath = path.join(metadata.baseDir, moduleName);
      
      // Check if module exists
      try {
        await stat(modulePath);
      } catch {
        // Module doesn't exist, skip
        continue;
      }
      
      // Copy module to backup
      const moduleBackupPath = path.join(backupPath, moduleName);
      const copiedFiles = await copyDirectory(modulePath, moduleBackupPath);
      allFiles.push(...copiedFiles);
    }
    
    // Save metadata
    const metadataPath = path.join(backupPath, 'metadata.json');
    await fs.promises.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
    const backup: Backup = {
      id: backupId,
      timestamp: new Date(),
      backupPath,
      files: allFiles,
      metadata,
    };
    
    // Save backup manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    await fs.promises.writeFile(
      manifestPath,
      JSON.stringify(backup, null, 2),
      'utf-8'
    );
    
    return {
      success: true,
      backup,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Restores a backup to its original location
 * 
 * @param backup - Backup to restore
 * @param config - Rollback configuration
 * @returns Restore result
 */
export async function restoreBackup(
  backup: Backup,
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<RestoreResult> {
  const result: RestoreResult = {
    success: false,
    filesRestored: 0,
    buildPassed: false,
  };
  
  try {
    const { metadata, backupPath } = backup;
    
    // Remove target module if it exists
    const targetPath = path.join(metadata.baseDir, metadata.targetModule);
    try {
      await rm(targetPath, { recursive: true, force: true });
    } catch {
      // Target doesn't exist, that's fine
    }
    
    // Restore each source module
    for (const moduleName of metadata.sourceModules) {
      const moduleBackupPath = path.join(backupPath, moduleName);
      const moduleRestorePath = path.join(metadata.baseDir, moduleName);
      
      // Check if backup exists
      try {
        await stat(moduleBackupPath);
      } catch {
        // Backup doesn't exist, skip
        continue;
      }
      
      // Remove existing module if present
      try {
        await rm(moduleRestorePath, { recursive: true, force: true });
      } catch {
        // Module doesn't exist, that's fine
      }
      
      // Copy backup to original location
      const restoredFiles = await copyDirectory(moduleBackupPath, moduleRestorePath);
      result.filesRestored += restoredFiles.length;
    }
    
    result.success = true;
    
    // Validate build if configured
    if (config.validateBuild) {
      result.buildPassed = await validateBuild(config.buildCommand);
      
      if (!result.buildPassed) {
        result.error = 'Build validation failed after rollback';
      }
    } else {
      result.buildPassed = true;
    }
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

/**
 * Validates that the build passes after rollback
 * 
 * @param buildCommand - Command to run for build validation
 * @returns True if build passes, false otherwise
 */
export async function validateBuild(buildCommand: string): Promise<boolean> {
  try {
    // Run build command
    const { stdout, stderr } = await execAsync(buildCommand, {
      timeout: 120000, // 2 minute timeout
    });
    
    // Check for errors in output
    if (stderr && stderr.toLowerCase().includes('error')) {
      console.error('Build validation failed:', stderr);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Build validation error:', error);
    return false;
  }
}

/**
 * Lists all available backups
 * 
 * @param config - Rollback configuration
 * @returns Array of backups
 */
export async function listBackups(
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<Backup[]> {
  const backups: Backup[] = [];
  
  try {
    // Check if backup directory exists
    try {
      await stat(config.backupDir);
    } catch {
      // Backup directory doesn't exist
      return backups;
    }
    
    // Read backup directory
    const entries = await readdir(config.backupDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const backupPath = path.join(config.backupDir, entry.name);
        const manifestPath = path.join(backupPath, 'manifest.json');
        
        try {
          const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
          const backup = JSON.parse(manifestContent) as Backup;
          
          // Convert timestamp string back to Date
          backup.timestamp = new Date(backup.timestamp);
          
          backups.push(backup);
        } catch {
          // Invalid backup, skip
          continue;
        }
      }
    }
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
  } catch (error) {
    console.error('Error listing backups:', error);
  }
  
  return backups;
}

/**
 * Deletes a backup
 * 
 * @param backupId - ID of backup to delete
 * @param config - Rollback configuration
 * @returns True if deleted successfully
 */
export async function deleteBackup(
  backupId: string,
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    const backupPath = path.join(config.backupDir, backupId);
    await rm(backupPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error('Error deleting backup:', error);
    return false;
  }
}

/**
 * Finds the most recent backup for a specific operation
 * 
 * @param operation - Operation name to search for
 * @param config - Rollback configuration
 * @returns Most recent backup or undefined
 */
export async function findLatestBackup(
  operation: string,
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<Backup | undefined> {
  const backups = await listBackups(config);
  
  return backups.find(backup => backup.metadata.operation === operation);
}

/**
 * Performs a complete rollback of a consolidation operation
 * 
 * @param operation - Name of the operation to rollback
 * @param config - Rollback configuration
 * @returns Restore result
 */
export async function rollbackConsolidation(
  operation: string,
  config: RollbackConfig = DEFAULT_CONFIG
): Promise<RestoreResult> {
  // Find the latest backup for this operation
  const backup = await findLatestBackup(operation, config);
  
  if (!backup) {
    return {
      success: false,
      filesRestored: 0,
      buildPassed: false,
      error: `No backup found for operation: ${operation}`,
    };
  }
  
  // Restore the backup
  return restoreBackup(backup, config);
}
