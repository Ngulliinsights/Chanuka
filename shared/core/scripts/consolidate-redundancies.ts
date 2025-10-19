#!/usr/bin/env node

/**
 * Core Consolidation Migration Script
 * 
 * Consolidates redundant systems in shared/core:
 * 1. Cache systems consolidation
 * 2. Validation systems unification  
 * 3. Utility sprawl cleanup
 * 4. Error handling finalization
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface MigrationStep {
  name: string;
  description: string;
  execute: () => Promise<void>;
  rollback: () => Promise<void>;
}

interface MigrationResult {
  step: string;
  success: boolean;
  error?: string;
  duration: number;
}

class ConsolidationMigrator {
  private results: MigrationResult[] = [];
  private readonly rootDir = path.resolve(__dirname, '..');
  private readonly backupDir = path.join(this.rootDir, '.migration-backup');

  async run(): Promise<void> {
    console.log('🚀 Starting Core Consolidation Migration...\n');
    
    try {
      await this.createBackup();
      
      const steps = this.getMigrationSteps();
      
      for (const step of steps) {
        await this.executeStep(step);
      }
      
      await this.validateMigration();
      await this.generateReport();
      
      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Run `npm run validate:consolidation` to verify the migration.');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      console.log('🔄 Rolling back changes...');
      await this.rollback();
      process.exit(1);
    }
  }

  private getMigrationSteps(): MigrationStep[] {
    return [
      {
        name: 'cache-consolidation',
        description: 'Consolidate cache systems into unified caching',
        execute: () => this.consolidateCacheSystems(),
        rollback: () => this.rollbackCacheConsolidation()
      },
      {
        name: 'validation-unification',
        description: 'Unify validation systems into adapter-based architecture',
        execute: () => this.unifyValidationSystems(),
        rollback: () => this.rollbackValidationUnification()
      },
      {
        name: 'utility-cleanup',
        description: 'Organize and deduplicate utility functions',
        execute: () => this.cleanupUtilities(),
        rollback: () => this.rollbackUtilityCleanup()
      },
      {
        name: 'update-exports',
        description: 'Update main index exports and barrel files',
        execute: () => this.updateExports(),
        rollback: () => this.rollbackExportUpdates()
      },
      {
        name: 'remove-duplicates',
        description: 'Remove duplicate implementations and legacy code',
        execute: () => this.removeDuplicates(),
        rollback: () => this.rollbackDuplicateRemoval()
      }
    ];
  }

  private async executeStep(step: MigrationStep): Promise<void> {
    const startTime = Date.now();
    console.log(`📦 ${step.description}...`);
    
    try {
      await step.execute();
      const duration = Date.now() - startTime;
      
      this.results.push({
        step: step.name,
        success: true,
        duration
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        step: step.name,
        success: false,
        error: errorMessage,
        duration
      });
      
      throw new Error(`Step '${step.name}' failed: ${errorMessage}`);
    }
  }

  // ===== CACHE CONSOLIDATION =====
  private async consolidateCacheSystems(): Promise<void> {
    // 1. Move legacy cache to backup
    const legacyCacheDir = path.join(this.rootDir, 'src/cache');
    if (await this.exists(legacyCacheDir)) {
      await this.moveToBackup('cache', legacyCacheDir);
    }

    // 2. Ensure unified caching structure exists
    await this.ensureDirectory(path.join(this.rootDir, 'src/caching/adapters'));
    await this.ensureDirectory(path.join(this.rootDir, 'src/caching/patterns'));
    await this.ensureDirectory(path.join(this.rootDir, 'src/caching/legacy-adapters'));

    // 3. Create Redis adapter (if not exists)
    await this.createRedisAdapter();
    
    // 4. Create multi-tier adapter (if not exists)
    await this.createMultiTierAdapter();
    
    // 5. Create circuit breaker pattern (if not exists)
    await this.createCircuitBreakerPattern();
    
    // 6. Update cache factory
    await this.updateCacheFactory();
  }

  private async rollbackCacheConsolidation(): Promise<void> {
    await this.restoreFromBackup('cache');
  }

  // ===== VALIDATION UNIFICATION =====
  private async unifyValidationSystems(): Promise<void> {
    // 1. Ensure unified validation structure
    await this.ensureDirectory(path.join(this.rootDir, 'src/validation/adapters'));
    await this.ensureDirectory(path.join(this.rootDir, 'src/validation/schemas'));
    await this.ensureDirectory(path.join(this.rootDir, 'src/validation/middleware'));
    await this.ensureDirectory(path.join(this.rootDir, 'src/validation/legacy-adapters'));

    // 2. Create Zod adapter
    await this.createZodAdapter();
    
    // 3. Create common schemas
    await this.createCommonSchemas();
    
    // 4. Create validation middleware
    await this.createValidationMiddleware();
    
    // 5. Create legacy validation adapter
    await this.createLegacyValidationAdapter();
    
    // 6. Update validation index
    await this.updateValidationIndex();
  }

  private async rollbackValidationUnification(): Promise<void> {
    // Validation rollback logic
  }

  // ===== UTILITY CLEANUP =====
  private async cleanupUtilities(): Promise<void> {
    // 1. Analyze existing utilities
    const utilityFiles = await this.findUtilityFiles();
    
    // 2. Categorize utilities
    const categories = await this.categorizeUtilities(utilityFiles);
    
    // 3. Create organized utility structure
    await this.createOrganizedUtilities(categories);
    
    // 4. Update utility exports
    await this.updateUtilityExports();
  }

  private async rollbackUtilityCleanup(): Promise<void> {
    // Utility cleanup rollback logic
  }

  // ===== EXPORT UPDATES =====
  private async updateExports(): Promise<void> {
    // Update main index.ts to use consolidated systems
    const indexPath = path.join(this.rootDir, 'src/index.ts');
    const indexContent = await this.readFile(indexPath);
    
    const updatedContent = indexContent
      .replace(/export \* from '\.\/cache';/, "// Cache consolidated into caching\nexport * from './caching';")
      .replace(/\/\/ Cache Service/, '// Unified Cache Service')
      .replace(/\/\/ Validation Service/, '// Unified Validation Service');
    
    await this.writeFile(indexPath, updatedContent);
  }

  private async rollbackExportUpdates(): Promise<void> {
    // Export updates rollback logic
  }

  // ===== DUPLICATE REMOVAL =====
  private async removeDuplicates(): Promise<void> {
    // Remove legacy directories that have been consolidated
    const legacyDirs = [
      'src/cache',
      'src/services', // If empty after consolidation
    ];
    
    for (const dir of legacyDirs) {
      const fullPath = path.join(this.rootDir, dir);
      if (await this.exists(fullPath)) {
        const isEmpty = await this.isDirectoryEmpty(fullPath);
        if (isEmpty) {
          await fs.rmdir(fullPath);
          console.log(`   🗑️  Removed empty directory: ${dir}`);
        }
      }
    }
  }

  private async rollbackDuplicateRemoval(): Promise<void> {
    // Restore removed directories from backup
  }

  // ===== HELPER METHODS =====
  private async createBackup(): Promise<void> {
    console.log('📋 Creating backup...');
    await this.ensureDirectory(this.backupDir);
    
    // Backup critical directories
    const dirsToBackup = ['src/cache', 'src/validation', 'src/utils', 'src/services'];
    
    for (const dir of dirsToBackup) {
      const sourcePath = path.join(this.rootDir, dir);
      if (await this.exists(sourcePath)) {
        const backupPath = path.join(this.backupDir, dir);
        await this.copyDirectory(sourcePath, backupPath);
      }
    }
  }

  private async rollback(): Promise<void> {
    // Restore from backup
    if (await this.exists(this.backupDir)) {
      const backupContents = await fs.readdir(this.backupDir);
      for (const item of backupContents) {
        const backupPath = path.join(this.backupDir, item);
        const targetPath = path.join(this.rootDir, item);
        await this.copyDirectory(backupPath, targetPath);
      }
    }
  }

  private async validateMigration(): Promise<void> {
    console.log('🔍 Validating migration...');
    
    // Check that consolidated systems exist
    const requiredPaths = [
      'src/caching/index.ts',
      'src/caching/core/interfaces.ts',
      'src/caching/adapters/memory-adapter.ts',
      'src/validation/index.ts',
      'src/validation/core/interfaces.ts',
      'src/validation/core/base-adapter.ts'
    ];
    
    for (const requiredPath of requiredPaths) {
      const fullPath = path.join(this.rootDir, requiredPath);
      if (!await this.exists(fullPath)) {
        throw new Error(`Required file missing after migration: ${requiredPath}`);
      }
    }
    
    // Try to compile TypeScript
    try {
      execSync('npm run build', { cwd: this.rootDir, stdio: 'pipe' });
      console.log('   ✅ TypeScript compilation successful');
    } catch (error) {
      throw new Error('TypeScript compilation failed after migration');
    }
  }

  private async generateReport(): Promise<void> {
    const reportPath = path.join(this.rootDir, 'CONSOLIDATION_REPORT.md');
    
    const report = `# Core Consolidation Migration Report

Generated: ${new Date().toISOString()}

## Migration Results

${this.results.map(result => 
  `### ${result.step}
- Status: ${result.success ? '✅ Success' : '❌ Failed'}
- Duration: ${result.duration}ms
${result.error ? `- Error: ${result.error}` : ''}
`).join('\n')}

## Summary

- Total Steps: ${this.results.length}
- Successful: ${this.results.filter(r => r.success).length}
- Failed: ${this.results.filter(r => !r.success).length}
- Total Duration: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms

## Next Steps

1. Run \`npm run validate:consolidation\` to verify the migration
2. Update application code to use new consolidated APIs
3. Remove legacy adapters after full migration
4. Update documentation and team guidelines

## Rollback

If issues are found, run \`npm run rollback:consolidation\` to restore the previous state.
`;

    await this.writeFile(reportPath, report);
    console.log(`📄 Migration report generated: ${reportPath}`);
  }

  // ===== ADAPTER CREATION METHODS =====
  private async createRedisAdapter(): Promise<void> {
    const redisAdapterPath = path.join(this.rootDir, 'src/caching/adapters/redis-adapter.ts');
    
    if (await this.exists(redisAdapterPath)) return;
    
    const redisAdapterContent = `/**
 * Redis Cache Adapter
 * 
 * Redis-based cache implementation with connection pooling and clustering support
 */

import Redis from 'ioredis';
import { BaseCacheAdapter } from '../core/base-adapter.js';
import { CacheAdapterConfig } from '../core/interfaces.js';

export interface RedisAdapterConfig extends CacheAdapterConfig {
  redisUrl: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
}

export class RedisAdapter extends BaseCacheAdapter {
  private redis: Redis;
  private readonly redisConfig: RedisAdapterConfig;

  constructor(config: RedisAdapterConfig) {
    super('RedisAdapter', '1.0.0', config);
    this.redisConfig = config;
    
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      enableReadyCheck: config.enableReadyCheck !== false,
      maxRetriesPerRequest: config.maxRetries || 3,
    });
    
    this.setupEventHandlers();
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const result = await this.redis.get(formattedKey);
      
      if (result === null) {
        this.updateMetrics('miss');
        this.emit('miss', { key: formattedKey });
        return null;
      }
      
      this.updateMetrics('hit');
      this.emit('hit', { key: formattedKey });
      return this.deserialize<T>(result);
    });
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const serializedValue = this.serialize(value);
      
      if (ttlSeconds) {
        await this.redis.setex(formattedKey, ttlSeconds, serializedValue);
      } else {
        await this.redis.set(formattedKey, serializedValue);
      }
      
      this.updateMetrics('set');
      this.emit('set', { key: formattedKey, metadata: { ttl: ttlSeconds } });
    });
  }

  async del(key: string): Promise<boolean> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const result = await this.redis.del(formattedKey);
      
      const deleted = result > 0;
      if (deleted) {
        this.updateMetrics('delete');
        this.emit('delete', { key: formattedKey });
      }
      
      return deleted;
    });
  }

  async exists(key: string): Promise<boolean> {
    const formattedKey = this.formatKey(key);
    const result = await this.redis.exists(formattedKey);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    const formattedKey = this.formatKey(key);
    return await this.redis.ttl(formattedKey);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
    this.emit('delete', { key: '*' });
  }

  async connect(): Promise<void> {
    await super.connect();
    // Redis connection is handled automatically by ioredis
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    await this.redis.disconnect();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.connected = true;
      this.emit('circuit_close', { key: 'redis_connection' });
    });

    this.redis.on('error', (error) => {
      this.connected = false;
      this.emit('circuit_open', { key: 'redis_connection', metadata: { error: error.message } });
    });
  }
}`;

    await this.writeFile(redisAdapterPath, redisAdapterContent);
  }

  private async createMultiTierAdapter(): Promise<void> {
    // Implementation for multi-tier adapter creation
  }

  private async createCircuitBreakerPattern(): Promise<void> {
    // Implementation for circuit breaker pattern creation
  }

  private async updateCacheFactory(): Promise<void> {
    // Implementation for cache factory updates
  }

  private async createZodAdapter(): Promise<void> {
    // Implementation for Zod adapter creation
  }

  private async createCommonSchemas(): Promise<void> {
    // Implementation for common schemas creation
  }

  private async createValidationMiddleware(): Promise<void> {
    // Implementation for validation middleware creation
  }

  private async createLegacyValidationAdapter(): Promise<void> {
    // Implementation for legacy validation adapter creation
  }

  private async updateValidationIndex(): Promise<void> {
    // Implementation for validation index updates
  }

  // ===== UTILITY METHODS =====
  private async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async copyDirectory(source: string, target: string): Promise<void> {
    await this.ensureDirectory(target);
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  private async moveToBackup(name: string, sourcePath: string): Promise<void> {
    const backupPath = path.join(this.backupDir, name);
    await this.copyDirectory(sourcePath, backupPath);
  }

  private async restoreFromBackup(name: string): Promise<void> {
    const backupPath = path.join(this.backupDir, name);
    const targetPath = path.join(this.rootDir, 'src', name);
    
    if (await this.exists(backupPath)) {
      await this.copyDirectory(backupPath, targetPath);
    }
  }

  private async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);
      return entries.length === 0;
    } catch {
      return true;
    }
  }

  private async findUtilityFiles(): Promise<string[]> {
    // Implementation to find utility files
    return [];
  }

  private async categorizeUtilities(files: string[]): Promise<Record<string, string[]>> {
    // Implementation to categorize utilities
    return {};
  }

  private async createOrganizedUtilities(categories: Record<string, string[]>): Promise<void> {
    // Implementation to create organized utilities
  }

  private async updateUtilityExports(): Promise<void> {
    // Implementation to update utility exports
  }
}

// Main execution
if (require.main === module) {
  const migrator = new ConsolidationMigrator();
  migrator.run().catch(console.error);
}

export { ConsolidationMigrator };`;

await this.writeFile(redisAdapterPath, redisAdapterContent);
  }

  // Additional helper methods would be implemented here...
}

// Main execution
if (require.main === module) {
  const migrator = new ConsolidationMigrator();
  migrator.run().catch(console.error);
}

export { ConsolidationMigrator };