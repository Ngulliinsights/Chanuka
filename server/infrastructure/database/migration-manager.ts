/**
 * Database Migration Manager
 * 
 * Handles database migrations with:
 * - Automatic migration execution
 * - Rollback capabilities
 * - Migration validation
 * - Performance monitoring
 * - Data integrity checks
 */

import { Pool } from 'pg';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { logger } from '../../../shared/core/src/index.js';

export interface MigrationFile {
  filename: string;
  version: string;
  description: string;
  sql: string;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  executionTime: number;
  error?: Error;
  rollbackSql?: string;
}

export interface MigrationStatus {
  currentVersion: string;
  pendingMigrations: string[];
  appliedMigrations: MigrationRecord[];
  lastMigration: Date | null;
}

export interface MigrationRecord {
  version: string;
  filename: string;
  checksum: string;
  executedAt: Date;
  executionTime: number;
  success: boolean;
}

export class DatabaseMigrationManager {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = 'drizzle') {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTracking(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations__ (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          filename VARCHAR(255) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          execution_time INTEGER NOT NULL,
          success BOOLEAN NOT NULL DEFAULT true,
          rollback_sql TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_migrations_version ON __drizzle_migrations__(version);
        CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON __drizzle_migrations__(executed_at);
      `);

      logger.info('Migration tracking table initialized', {
        component: 'MigrationManager'
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    const client = await this.pool.connect();
    
    try {
      // Get applied migrations
      const appliedResult = await client.query(`
        SELECT version, filename, checksum, executed_at, execution_time, success
        FROM __drizzle_migrations__
        WHERE success = true
        ORDER BY executed_at DESC
      `);

      const appliedMigrations: MigrationRecord[] = appliedResult.rows.map(row => ({
        version: row.version,
        filename: row.filename,
        checksum: row.checksum,
        executedAt: row.executed_at,
        executionTime: row.execution_time,
        success: row.success
      }));

      // Get available migrations
      const availableMigrations = await this.getAvailableMigrations();
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));
      
      const pendingMigrations = availableMigrations
        .filter(m => !appliedVersions.has(m.version))
        .map(m => m.version);

      const currentVersion = appliedMigrations[0]?.version ?? '0';

      const lastMigration = appliedMigrations[0]?.executedAt ?? null;

      return {
        currentVersion,
        pendingMigrations,
        appliedMigrations,
        lastMigration
      };
    } finally {
      client.release();
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    await this.initializeMigrationTracking();
    
    const status = await this.getMigrationStatus();
    const availableMigrations = await this.getAvailableMigrations();
    
    const pendingMigrations = availableMigrations.filter(m => 
      status.pendingMigrations.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations to run', {
        component: 'MigrationManager'
      });
      return [];
    }

    logger.info(`Running ${pendingMigrations.length} pending migrations`, {
      component: 'MigrationManager',
      migrations: pendingMigrations.map(m => m.version)
    });

    const results: MigrationResult[] = [];

    for (const migration of pendingMigrations) {
      const result = await this.runSingleMigration(migration);
      results.push(result);

      if (!result.success) {
        logger.error(`Migration ${migration.version} failed, stopping`, {
          component: 'MigrationManager',
          error: result.error?.message
        });
        break;
      }
    }

    return results;
  }

  /**
   * Run a single migration
   */
  private async runSingleMigration(migration: MigrationFile): Promise<MigrationResult> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      logger.info(`Running migration: ${migration.version}`, {
        component: 'MigrationManager',
        filename: migration.filename
      });

      // Execute migration SQL
      await client.query(migration.sql);

      // Record successful migration
      await client.query(`
        INSERT INTO __drizzle_migrations__ 
        (version, filename, checksum, execution_time, success)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        migration.version,
        migration.filename,
        migration.checksum,
        Date.now() - startTime,
        true
      ]);

      await client.query('COMMIT');

      const executionTime = Date.now() - startTime;

      logger.info(`Migration ${migration.version} completed successfully`, {
        component: 'MigrationManager',
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        version: migration.version,
        executionTime
      };

    } catch (error) {
      await client.query('ROLLBACK');

      const executionTime = Date.now() - startTime;
      const migrationError = error instanceof Error ? error : new Error(String(error));

      // Record failed migration
      try {
        await client.query(`
          INSERT INTO __drizzle_migrations__ 
          (version, filename, checksum, execution_time, success)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          migration.version,
          migration.filename,
          migration.checksum,
          executionTime,
          false
        ]);
      } catch (recordError) {
        logger.error('Failed to record migration failure', {
          component: 'MigrationManager',
          error: recordError instanceof Error ? recordError.message : String(recordError)
        });
      }

      logger.error(`Migration ${migration.version} failed`, {
        component: 'MigrationManager',
        error: migrationError.message,
        executionTime: `${executionTime}ms`
      });

      return {
        success: false,
        version: migration.version,
        executionTime,
        error: migrationError
      };

    } finally {
      client.release();
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(targetVersion: string): Promise<MigrationResult[]> {
    const status = await this.getMigrationStatus();
    
    const migrationsToRollback = status.appliedMigrations.filter(m => 
      m.version > targetVersion
    ).sort((a, b) => b.version.localeCompare(a.version)); // Reverse order

    if (migrationsToRollback.length === 0) {
      logger.info(`Already at or before version ${targetVersion}`, {
        component: 'MigrationManager'
      });
      return [];
    }

    logger.warn(`Rolling back ${migrationsToRollback.length} migrations to version ${targetVersion}`, {
      component: 'MigrationManager',
      migrations: migrationsToRollback.map(m => m.version)
    });

    const results: MigrationResult[] = [];

    for (const migration of migrationsToRollback) {
      const result = await this.rollbackSingleMigration(migration);
      results.push(result);

      if (!result.success) {
        logger.error(`Rollback of ${migration.version} failed, stopping`, {
          component: 'MigrationManager',
          error: result.error?.message
        });
        break;
      }
    }

    return results;
  }

  /**
   * Rollback a single migration
   */
  private async rollbackSingleMigration(migration: MigrationRecord): Promise<MigrationResult> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      logger.warn(`Rolling back migration: ${migration.version}`, {
        component: 'MigrationManager',
        filename: migration.filename
      });

      // Get rollback SQL if available
      const rollbackResult = await client.query(`
        SELECT rollback_sql FROM __drizzle_migrations__ 
        WHERE version = $1 AND success = true
      `, [migration.version]);

      if (rollbackResult.rows.length === 0) {
        throw new Error(`No rollback information found for migration ${migration.version}`);
      }

      const rollbackSql = rollbackResult.rows[0].rollback_sql;
      if (!rollbackSql) {
        throw new Error(`No rollback SQL available for migration ${migration.version}`);
      }

      // Execute rollback SQL
      await client.query(rollbackSql);

      // Remove migration record
      await client.query(`
        DELETE FROM __drizzle_migrations__ WHERE version = $1
      `, [migration.version]);

      await client.query('COMMIT');

      const executionTime = Date.now() - startTime;

      logger.info(`Migration ${migration.version} rolled back successfully`, {
        component: 'MigrationManager',
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        version: migration.version,
        executionTime
      };

    } catch (error) {
      await client.query('ROLLBACK');

      const executionTime = Date.now() - startTime;
      const rollbackError = error instanceof Error ? error : new Error(String(error));

      logger.error(`Rollback of ${migration.version} failed`, {
        component: 'MigrationManager',
        error: rollbackError.message,
        executionTime: `${executionTime}ms`
      });

      return {
        success: false,
        version: migration.version,
        executionTime,
        error: rollbackError
      };

    } finally {
      client.release();
    }
  }

  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if migration table exists
      const client = await this.pool.connect();
      
      try {
        const tableResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '__drizzle_migrations__'
          );
        `);

        if (!tableResult.rows[0].exists) {
          issues.push('Migration tracking table does not exist');
          return { valid: false, issues };
        }

        // Get applied migrations
        const appliedResult = await client.query(`
          SELECT version, filename, checksum FROM __drizzle_migrations__
          WHERE success = true ORDER BY version
        `);

        // Get available migration files
        const availableMigrations = await this.getAvailableMigrations();
        const availableMap = new Map(availableMigrations.map(m => [m.version, m]));

        // Check for missing files
        for (const applied of appliedResult.rows) {
          const available = availableMap.get(applied.version);
          if (!available) {
            issues.push(`Applied migration ${applied.version} has no corresponding file`);
            continue;
          }

          // Check checksum integrity
          if (available.checksum !== applied.checksum) {
            issues.push(`Migration ${applied.version} checksum mismatch - file may have been modified`);
          }
        }

        // Check for gaps in migration sequence
        const appliedVersions = appliedResult.rows.map(r => r.version).sort();
        const availableVersions = availableMigrations.map(m => m.version).sort();

        for (let i = 0; i < appliedVersions.length - 1; i++) {
          const current = appliedVersions[i];
          const next = appliedVersions[i + 1];
          
          const currentIndex = availableVersions.indexOf(current);
          const nextIndex = availableVersions.indexOf(next);
          
          if (nextIndex - currentIndex > 1) {
            const skipped = availableVersions.slice(currentIndex + 1, nextIndex);
            issues.push(`Migrations skipped: ${skipped.join(', ')}`);
          }
        }

      } finally {
        client.release();
      }

    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get available migration files
   */
  private async getAvailableMigrations(): Promise<MigrationFile[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files.filter(f => f.endsWith('.sql'));

      const migrations: MigrationFile[] = [];

      for (const filename of migrationFiles) {
        const filePath = join(this.migrationsPath, filename);
        const sql = await readFile(filePath, 'utf-8');
        
        // Extract version from filename (assuming format: YYYYMMDDHHMMSS_description.sql)
        const versionMatch = filename.match(/^(\d{14})/);
        const version = versionMatch?.[1] ?? filename.replace('.sql', '');
        
        // Extract description
        const description = filename.replace(/^\d{14}_/, '').replace('.sql', '').replace(/_/g, ' ');
        
        // Calculate checksum
        const checksum = this.calculateChecksum(sql);

        migrations.push({
          filename,
          version,
          description,
          sql,
          checksum
        });
      }

      return migrations.sort((a, b) => a.version.localeCompare(b.version));

    } catch (error) {
      logger.error('Failed to read migration files', {
        component: 'MigrationManager',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a new migration file
   */
  async createMigration(description: string, sql: string, rollbackSql?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `${timestamp}_${description.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = join(this.migrationsPath, filename);

    let migrationContent = `-- Migration: ${description}\n-- Created: ${new Date().toISOString()}\n\n${sql}`;

    if (rollbackSql) {
      migrationContent += `\n\n-- Rollback SQL:\n-- ${rollbackSql.replace(/\n/g, '\n-- ')}`;
    }

    await writeFile(filePath, migrationContent);

    logger.info(`Created migration file: ${filename}`, {
      component: 'MigrationManager'
    });

    return filename;
  }
}

// Export singleton instance
let migrationManager: DatabaseMigrationManager | null = null;

export function createMigrationManager(pool: Pool, migrationsPath?: string): DatabaseMigrationManager {
  if (migrationManager) {
    return migrationManager;
  }
  
  migrationManager = new DatabaseMigrationManager(pool, migrationsPath);
  return migrationManager;
}

export function getMigrationManager(): DatabaseMigrationManager {
  if (!migrationManager) {
    throw new Error('Migration manager not initialized. Call createMigrationManager() first.');
  }
  
  return migrationManager;
}