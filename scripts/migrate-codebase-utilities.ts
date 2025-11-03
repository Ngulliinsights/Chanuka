#!/usr/bin/env node

/**
 * Codebase-Wide Utility Migration Script
 * 
 * Migrates scattered utility functions across the entire codebase into a unified system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface MigrationConfig {
  category?: string;
  dryRun?: boolean;
  skipBackup?: boolean;
  verbose?: boolean;
}

class CodebaseUtilityMigrator {
  private readonly rootDir = process.cwd();
  private config: MigrationConfig;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      dryRun: false,
      skipBackup: false,
      verbose: false,
      ...config
    };
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting Codebase-Wide Utility Migration...\n');

    if (this.config.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }

    try {
      // Step 1: Create unified utility architecture
      await this.createUnifiedArchitecture();

      // Step 2: Create unified implementations
      await this.createUnifiedImplementations();

      // Step 3: Create legacy adapters
      await this.createLegacyAdapters();

      // Step 4: Generate migration report
      await this.generateMigrationReport();

      console.log('\n✅ Utility migration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  private async createUnifiedArchitecture(): Promise<void> {
    console.log('🏗️  Creating unified utility architecture...');
    
    const directories = [
      'shared/core/utilities',
      'shared/core/utilities/api',
      'shared/core/utilities/logging',
      'shared/core/utilities/performance',
      'shared/core/utilities/database',
      'shared/core/utilities/validation'
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.rootDir, dir);
      if (!this.config.dryRun) {
        await this.ensureDirectory(fullPath);
      }
      console.log(`   📁 Created ${dir}`);
    }

    // Create main index file
    await this.createMainIndexFile();
    
    console.log('   ✅ Architecture created\n');
  }

  private async createMainIndexFile(): Promise<void> {
    const mainIndex = `/**
 * Unified Utilities - Main Entry Point
 */

export * from './api';
export * from './logging';
export * from './performance';
export * from './database';
export * from './validation';

export const USE_UNIFIED_UTILITIES = process.env.USE_UNIFIED_UTILITIES === 'true';
export const UTILITIES_VERSION = '1.0.0';
`;

    if (!this.config.dryRun) {
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/index.ts'),
        mainIndex,
        'utf-8'
      );
    }
  }

  private async createUnifiedImplementations(): Promise<void> {
    console.log('🔧 Creating unified implementations...');
    
    // Create API utilities
    await this.createApiUtilities();
    
    // Create logging utilities
    await this.createLoggingUtilities();
    
    // Create performance utilities
    await this.createPerformanceUtilities();
    
    console.log('   ✅ Implementations created\n');
  }

  private async createApiUtilities(): Promise<void> {
    const apiUtilities = `/**
 * Unified API Response Utilities
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  duration?: number;
  source?: string;
}

export class UnifiedApiResponse {
  static success<T>(data: T, message?: string, metadata?: Partial<ResponseMetadata>): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static error(
    message: string, 
    code?: string, 
    details?: Record<string, any>,
    metadata?: Partial<ResponseMetadata>
  ): ErrorResponse {
    return {
      success: false,
      error: { message, code, details },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static validation(errors: Array<{ field: string; message: string }>): ErrorResponse {
    return this.error('Validation failed', 'VALIDATION_ERROR', { errors });
  }
}

// Legacy compatibility exports
export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = UnifiedApiResponse.success;
export const ApiError = UnifiedApiResponse.error;
export const ApiNotFound = (message = 'Resource not found') => 
  UnifiedApiResponse.error(message, 'NOT_FOUND');
export const ApiValidationError = (errors: any[]) => 
  UnifiedApiResponse.validation(errors);
export const ApiForbidden = (message = 'Access forbidden') => 
  UnifiedApiResponse.error(message, 'FORBIDDEN');
`;

    if (!this.config.dryRun) {
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/api/response.ts'),
        apiUtilities,
        'utf-8'
      );

      // Create API index
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/api/index.ts'),
        `export * from './response';\n`,
        'utf-8'
      );
    }
  }

  private async createLoggingUtilities(): Promise<void> {
    const loggingUtilities = `/**
 * Unified Logger
 */

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface LoggerConfig {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  format?: 'json' | 'text';
  enableColors?: boolean;
  enableTimestamp?: boolean;
}

export abstract class BaseLogger {
  protected config: LoggerConfig;
  protected readonly levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'INFO',
      format: 'text',
      enableColors: true,
      enableTimestamp: true,
      ...config
    };
  }

  abstract log(entry: LogEntry): void;

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.log({ level: 'DEBUG', message, timestamp: new Date(), metadata });
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('INFO')) {
      this.log({ level: 'INFO', message, timestamp: new Date(), metadata });
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('WARN')) {
      this.log({ level: 'WARN', message, timestamp: new Date(), metadata });
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog('ERROR')) {
      this.log({ level: 'ERROR', message, timestamp: new Date(), error, metadata });
    }
  }

  private shouldLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): boolean {
    return this.levels[level] >= this.levels[this.config.level];
  }
}

export class ServerLogger extends BaseLogger {
  log(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    
    if (entry.level === 'ERROR') {
      console.error(formatted);
    } else if (entry.level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = this.config.enableTimestamp 
      ? \`[\${entry.timestamp.toISOString()}]\` 
      : '';
    
    const level = \`[\${entry.level}]\`;
    const message = entry.message;
    const metadata = entry.metadata ? \` \${JSON.stringify(entry.metadata)}\` : '';
    const error = entry.error ? \` Error: \${entry.error.message}\` : '';
    
    return \`\${timestamp} \${level} \${message}\${metadata}\${error}\`;
  }
}

export class ClientLogger extends BaseLogger {
  log(entry: LogEntry): void {
    const args = [this.formatMessage(entry)];
    
    if (entry.metadata) args.push(entry.metadata);
    if (entry.error) args.push(entry.error);

    switch (entry.level) {
      case 'DEBUG': console.debug(...args); break;
      case 'INFO': console.info(...args); break;
      case 'WARN': console.warn(...args); break;
      case 'ERROR': console.error(...args); break;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = this.config.enableTimestamp 
      ? \`[\${entry.timestamp.toLocaleTimeString()}]\` 
      : '';
    
    return \`\${timestamp} [\${entry.level}] \${entry.message}\`;
  }
}

export class UnifiedLogger {
  private static instance: BaseLogger;

  static createServerLogger(config?: Partial<LoggerConfig>): BaseLogger {
    return new ServerLogger(config);
  }

  static createClientLogger(config?: Partial<LoggerConfig>): BaseLogger {
    return new ClientLogger(config);
  }

  static getInstance(): BaseLogger {
    if (!this.instance) {
      if (typeof window !== 'undefined') {
        this.instance = this.createClientLogger();
      } else {
        this.instance = this.createServerLogger();
      }
    }
    return this.instance;
  }
}

export const logger = UnifiedLogger.getInstance();
`;

    if (!this.config.dryRun) {
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/logging/unified-logger.ts'),
        loggingUtilities,
        'utf-8'
      );

      // Create logging index
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/logging/index.ts'),
        `export * from './unified-logger';\n`,
        'utf-8'
      );
    }
  }

  private async createPerformanceUtilities(): Promise<void> {
    const performanceUtilities = `/**
 * Unified Performance Monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceTimer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class UnifiedPerformanceMonitor {
  private static timers = new Map<string, PerformanceTimer>();
  private static metrics: PerformanceMetric[] = [];

  static startTimer(name: string): PerformanceTimer {
    const timer: PerformanceTimer = {
      name,
      startTime: this.now()
    };
    
    this.timers.set(name, timer);
    return timer;
  }

  static endTimer(name: string): PerformanceTimer | null {
    const timer = this.timers.get(name);
    if (!timer) return null;

    timer.endTime = this.now();
    timer.duration = timer.endTime - timer.startTime;
    
    this.recordMetric({
      name: \`timer.\${name}\`,
      value: timer.duration,
      unit: 'ms',
      timestamp: new Date()
    });

    this.timers.delete(name);
    return timer;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  private static now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    } else if (typeof process !== 'undefined' && process.hrtime) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    } else {
      return Date.now();
    }
  }
}

// Legacy compatibility
export const PerformanceUtils = UnifiedPerformanceMonitor;
export const startTimer = UnifiedPerformanceMonitor.startTimer.bind(UnifiedPerformanceMonitor);
export const endTimer = UnifiedPerformanceMonitor.endTimer.bind(UnifiedPerformanceMonitor);
export const measureAsync = UnifiedPerformanceMonitor.measureAsync.bind(UnifiedPerformanceMonitor);
`;

    if (!this.config.dryRun) {
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/performance/monitoring.ts'),
        performanceUtilities,
        'utf-8'
      );

      // Create performance index
      await fs.writeFile(
        path.join(this.rootDir, 'shared/core/utilities/performance/index.ts'),
        `export * from './monitoring';\n`,
        'utf-8'
      );
    }
  }

  private async createLegacyAdapters(): Promise<void> {
    console.log('🔗 Creating legacy adapters...');
    
    // Create API response legacy adapter
    const apiLegacyAdapter = `/**
 * LEGACY ADAPTER: API Response Utilities
 */

import { 
  UnifiedApiResponse, 
  ApiResponse, 
  ErrorResponse 
} from '@shared/core/src/utils/api'-utils';

console.warn(
  '[DEPRECATED] server/utils/api-response.ts is deprecated. ' +
  'Please import from '@shared/core/src/utils/api'-utils instead.'
);

export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = UnifiedApiResponse.success;
export const ApiError = UnifiedApiResponse.error;
export const ApiNotFound = (message = 'Resource not found') => 
  UnifiedApiResponse.error(message, 'NOT_FOUND');
export const ApiValidationError = (errors: any[]) => 
  UnifiedApiResponse.validation(errors);

export type { ApiResponse, ErrorResponse };
`;

    // Create logger legacy adapter
    const loggerLegacyAdapter = `/**
 * LEGACY ADAPTER: Server Logger
 */

import { UnifiedLogger } from '@shared/core/observability/logging';

console.warn(
  '[DEPRECATED] server/utils/logger.ts is deprecated. ' +
  'Please import from @shared/core/observability/logging instead.'
);

const serverLogger = UnifiedLogger.createServerLogger({
  level: process.env.LOG_LEVEL as any || 'INFO'
});

export const logger = {
  info: (message: string, meta?: any) => serverLogger.info(message, meta),
  error: (message: string, error?: Error, meta?: any) => serverLogger.error(message, error, meta),
  warn: (message: string, meta?: any) => serverLogger.warn(message, meta),
  debug: (message: string, meta?: any) => serverLogger.debug(message, meta),
  log: (message: string, meta?: any) => serverLogger.info(message, meta)
};

export default logger;
`;

    if (!this.config.dryRun) {
      // Backup and replace existing files
      const legacyFiles = [
        { path: 'server/utils/api-response.ts', content: apiLegacyAdapter },
        { path: 'server/utils/logger.ts', content: loggerLegacyAdapter }
      ];

      for (const file of legacyFiles) {
        const fullPath = path.join(this.rootDir, file.path);
        
        if (await this.exists(fullPath)) {
          await fs.rename(fullPath, `${fullPath}.backup`);
        }
        
        await this.ensureDirectory(path.dirname(fullPath));
        await fs.writeFile(fullPath, file.content, 'utf-8');
        
        console.log(`   🔗 Created legacy adapter for ${file.path}`);
      }
    }
    
    console.log('   ✅ Legacy adapters created\n');
  }

  private async generateMigrationReport(): Promise<void> {
    const reportPath = path.join(this.rootDir, 'UTILITY_MIGRATION_REPORT.md');
    
    const report = `# Utility Migration Report

**Generated:** ${new Date().toISOString()}
**Mode:** ${this.config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}

## Summary

- **Unified Architecture:** Created
- **API Utilities:** Consolidated
- **Logging Utilities:** Unified
- **Performance Utilities:** Consolidated
- **Legacy Adapters:** Created for backward compatibility

## Created Files

### Unified Utilities
- \`shared/core/utilities/index.ts\` - Main entry point
- \`shared/core/utilities/api/response.ts\` - Unified API responses
- \`shared/core/utilities/logging/unified-logger.ts\` - Unified logging
- \`shared/core/utilities/performance/monitoring.ts\` - Performance monitoring

### Legacy Adapters
- \`server/utils/api-response.ts\` - API response legacy adapter
- \`server/utils/logger.ts\` - Logger legacy adapter

## Usage

### New Unified API
\`\`\`typescript
import { UnifiedApiResponse } from '@shared/core/src/utils/api'-utils';
import { logger } from '@shared/core/observability/logging';
import { UnifiedPerformanceMonitor } from '@shared/core/src/utils/performance-utils';

// API responses
const response = UnifiedApiResponse.success(data);

// Logging
logger.info('Operation completed', { user_id: 123  });

// Performance monitoring
const timer = UnifiedPerformanceMonitor.startTimer('operation');
// ... do work
UnifiedPerformanceMonitor.endTimer('operation');
\`\`\`

### Legacy Compatibility
Existing imports continue to work with deprecation warnings:
\`\`\`typescript
import { ApiResponseWrapper } from '@shared/core/src/utils/api'-response'; // Still works
import { logger } from '@shared/core/src/utils/browser-logger''; // Still works
\`\`\`

## Next Steps

1. **Test the migration** thoroughly
2. **Update imports** to use unified utilities
3. **Remove legacy adapters** after full migration
4. **Update documentation**

## Feature Flags

Control the migration with environment variables:
\`\`\`bash
USE_UNIFIED_UTILITIES=true
USE_UNIFIED_API_UTILITIES=true
USE_UNIFIED_LOGGER=true
\`\`\`

---

*Generated by utility migration script*
`;

    if (!this.config.dryRun) {
      await fs.writeFile(reportPath, report, 'utf-8');
    }
    
    console.log(`📄 Migration report ${this.config.dryRun ? 'would be' : ''} saved: ${reportPath}`);
  }

  // Utility methods
  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }
}

// CLI interface
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--category':
        config.category = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--skip-backup':
        config.skipBackup = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
    }
  }
  
  return config;
}

// Main execution
const config = parseArgs();
const migrator = new CodebaseUtilityMigrator(config);

migrator.migrate()
  .then(() => {
    console.log('\n🎉 Utility migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

export { CodebaseUtilityMigrator };
