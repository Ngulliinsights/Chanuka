import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

/**
 * Log Rotation Manager
 * 
 * Handles log file rotation, compression, and cleanup based on configurable policies.
 */
export class LogRotationManager {
  private static instance: LogRotationManager;

  constructor(
    private readonly logDir: string,
    private readonly config: RotationConfig = defaultRotationConfig
  ) {
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Start rotation check interval
    this.startRotationCheck();
  }

  static getInstance(logDir: string): LogRotationManager {
    if (!LogRotationManager.instance) {
      LogRotationManager.instance = new LogRotationManager(logDir);
    }
    return LogRotationManager.instance;
  }

  /**
   * Perform log rotation check and rotate if needed
   */
  async checkRotation(): Promise<void> {
    try {
      const files = await readdir(this.logDir);
      
      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = await stat(filePath);
        
        if (this.shouldRotate(stats)) {
          await this.rotateLog(filePath);
        }
      }

      // Cleanup old archives
      await this.cleanupOldArchives();
    } catch (error) {
      console.error('Error during log rotation:', error);
    }
  }

  /**
   * Check if a log file should be rotated based on size and age
   */
  private shouldRotate(stats: fs.Stats): boolean {
    const sizeExceeded = stats.size > this.config.maxSize;
    const ageExceeded = (Date.now() - stats.mtime.getTime()) > this.config.maxAge;
    
    return sizeExceeded || ageExceeded;
  }

  /**
   * Rotate a specific log file
   */
  private async rotateLog(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(filePath, '.log');
    const archivePath = path.join(
      this.logDir,
      'archive',
      `${baseName}-${timestamp}.log.gz`
    );

    try {
      // Create a new empty log file
      const tempPath = `${filePath}.new`;
      await fs.promises.writeFile(tempPath, '');

      // Ensure archive directory exists
      await mkdir(path.dirname(archivePath), { recursive: true });

      // Compress current log file
      const readStream = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(archivePath);
      const gzip = zlib.createGzip();

      await new Promise<void>((resolve, reject) => {
        readStream
          .pipe(gzip)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });

      // Replace old log with new empty one
      await rename(tempPath, filePath);

    } catch (error) {
      console.error(`Error rotating log file ${filePath}:`, error);
      // Cleanup any temporary files
      try {
        await unlink(`${filePath}.new`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Clean up old archived logs based on retention policy
   */
  private async cleanupOldArchives(): Promise<void> {
    const archiveDir = path.join(this.logDir, 'archive');
    
    try {
      const files = await readdir(archiveDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(archiveDir, file);
        const stats = await stat(filePath);
        
        const age = now - stats.mtime.getTime();
        if (age > this.config.retentionPeriod) {
          await unlink(filePath);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error cleaning up old archives:', error);
      }
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await mkdir(this.logDir, { recursive: true });
      await mkdir(path.join(this.logDir, 'archive'), { recursive: true });
    } catch (error) {
      console.error('Error creating log directories:', error);
    }
  }

  /**
   * Start periodic rotation check
   */
  private startRotationCheck(): void {
    setInterval(() => {
      this.checkRotation().catch(error => {
        console.error('Error in rotation check interval:', error);
      });
    }, this.config.checkInterval);
  }
}

interface RotationConfig {
  maxSize: number;        // Maximum size in bytes before rotation
  maxAge: number;         // Maximum age in milliseconds before rotation
  retentionPeriod: number; // How long to keep archived logs in milliseconds
  checkInterval: number;   // How often to check for rotation in milliseconds
}

const defaultRotationConfig: RotationConfig = {
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  checkInterval: 5 * 60 * 1000 // 5 minutes
};
