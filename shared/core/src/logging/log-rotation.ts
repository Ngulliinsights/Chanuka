/**
 * Log rotation utilities for file management
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { logger } from './logger';

export interface LogRotationOptions {
  maxFileSize: string; // e.g., '10MB', '100KB'
  maxFiles: number;
  rotateDaily?: boolean;
  compress?: boolean;
}

export class LogRotationManager {
  private rotationOptions: LogRotationOptions;
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: LogRotationOptions) {
    this.rotationOptions = options;
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const [, size, unit] = match;
    const multiplier = units[unit.toUpperCase()];
    if (!multiplier) {
      throw new Error(`Unknown size unit: ${unit}`);
    }

    return parseFloat(size) * multiplier;
  }

  /**
   * Check if file needs rotation based on size
   */
  async shouldRotateBySize(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const maxSize = this.parseSize(this.rotationOptions.maxFileSize);
      return stats.size >= maxSize;
    } catch (error) {
      // File doesn't exist or can't be accessed
      return false;
    }
  }

  /**
   * Rotate log file
   */
  async rotateFile(filePath: string): Promise<void> {
    try {
      const dir = dirname(filePath);
      const fileName = filePath.split('/').pop() || 'app.log';
      const baseName = fileName.replace(/\.log$/, '');
      
      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${baseName}.${timestamp}.log`;
      const backupPath = join(dir, backupName);

      // Move current log to backup
      await fs.rename(filePath, backupPath);

      // Compress if enabled
      if (this.rotationOptions.compress) {
        await this.compressFile(backupPath);
      }

      // Clean up old files
      await this.cleanupOldFiles(dir, baseName);

      console.log(`Log rotated: ${filePath} -> ${backupPath}`);
    } catch (error) {
      console.error(`Failed to rotate log file ${filePath}:`, error);
    }
  }

  /**
   * Compress log file (simple gzip simulation)
   */
  private async compressFile(filePath: string): Promise<void> {
    try {
      // In a real implementation, you would use zlib to compress
      // For now, just rename to indicate compression
      const compressedPath = `${filePath}.gz`;
      await fs.rename(filePath, compressedPath);
    } catch (error) {
      console.error(`Failed to compress file ${filePath}:`, error);
    }
  }

  /**
   * Clean up old log files beyond maxFiles limit
   */
  private async cleanupOldFiles(dir: string, baseName: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      const logFiles = files
        .filter(file => file.startsWith(baseName) && file !== `${baseName}.log`)
        .map(file => ({
          name: file,
          path: join(dir, file),
        }));

      // Sort by modification time (newest first)
      const fileStats = await Promise.all(
        logFiles.map(async file => ({
          ...file,
          stats: await fs.stat(file.path),
        }))
      );

      fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove files beyond maxFiles limit
      const filesToDelete = fileStats.slice(this.rotationOptions.maxFiles);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`Deleted old log file: ${file.name}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup old files in ${dir}:`, error);
    }
  }

  /**
   * Set up automatic rotation checking
   */
  setupRotationCheck(filePath: string, checkInterval: number = 60000): void {
    const timer = setInterval(async () => {
      if (await this.shouldRotateBySize(filePath)) {
        await this.rotateFile(filePath);
      }
    }, checkInterval);

    this.rotationTimers.set(filePath, timer);
  }

  /**
   * Stop rotation checking for a file
   */
  stopRotationCheck(filePath: string): void {
    const timer = this.rotationTimers.get(filePath);
    if (timer) {
      clearInterval(timer);
      this.rotationTimers.delete(filePath);
    }
  }

  /**
   * Stop all rotation checks
   */
  stopAllRotationChecks(): void {
    for (const [filePath] of this.rotationTimers) {
      this.stopRotationCheck(filePath);
    }
  }
}

/**
 * Create log rotation manager with default options
 */
export function createLogRotationManager(options?: Partial<LogRotationOptions>): LogRotationManager {
  const defaultOptions: LogRotationOptions = {
    maxFileSize: '10MB',
    maxFiles: 5,
    rotateDaily: false,
    compress: true,
  };

  return new LogRotationManager({ ...defaultOptions, ...options });
}






