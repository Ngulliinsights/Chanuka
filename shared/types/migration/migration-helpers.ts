/**
 * MIGRATION HELPERS - Utility Functions for Type Migration
 *
 * Helper functions and utilities to assist with type migration processes
 */

import { BaseEntity, FullAuditEntity } from '../../schema/base-types';
import { LoadingOperation } from '../../shared/types/loading';
import { MigrationConfig } from './migration-config';

// ============================================================================
// MIGRATION UTILITY FUNCTIONS
// ============================================================================

export class MigrationHelpers {
  // ============================================================================
  // FIELD MAPPING UTILITIES
  // ============================================================================

  static createFieldMapping<
    T extends Record<string, any>,
    S extends Record<string, any>
  >(sourceFields: (keyof T)[], targetFields: (keyof S)[]): Record<string, string> {
    if (sourceFields.length !== targetFields.length) {
      throw new Error('Source and target field arrays must have the same length');
    }

    const mapping: Record<string, string> = {};
    for (let i = 0; i < sourceFields.length; i++) {
      mapping[String(sourceFields[i])] = String(targetFields[i]);
    }

    return mapping;
  }

  static createFieldMappingWithTransform<
    T extends Record<string, any>,
    S extends Record<string, any>
  >(
    sourceFields: (keyof T)[],
    targetFields: (keyof S)[],
    transforms?: Array<(value: any) => any>
  ): Record<string, string | ((value: any) => any)> {
    if (sourceFields.length !== targetFields.length) {
      throw new Error('Source and target field arrays must have the same length');
    }

    if (transforms && transforms.length !== sourceFields.length) {
      throw new Error('Transforms array must have the same length as field arrays');
    }

    const mapping: Record<string, string | ((value: any) => any)> = {};
    for (let i = 0; i < sourceFields.length; i++) {
      if (transforms && transforms[i]) {
        mapping[String(sourceFields[i])] = transforms[i];
      } else {
        mapping[String(sourceFields[i])] = String(targetFields[i]);
      }
    }

    return mapping;
  }

  // ============================================================================
  // DATA TRANSFORMATION UTILITIES
  // ============================================================================

  static transformDateToTimestamp(date: Date | string | number | null | undefined): number | null {
    if (date === null || date === undefined) return null;
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'string') return new Date(date).getTime();
    if (typeof date === 'number') return date;
    return null;
  }

  static transformTimestampToDate(timestamp: number | null | undefined): Date | null {
    if (timestamp === null || timestamp === undefined) return null;
    return new Date(timestamp);
  }

  static normalizeString(value: string | null | undefined, defaultValue: string = ''): string {
    if (value === null || value === undefined) return defaultValue;
    return String(value).trim();
  }

  static normalizeBoolean(value: any, defaultValue: boolean = false): boolean {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  }

  static normalizeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // ============================================================================
  // MIGRATION SAFETY UTILITIES
  // ============================================================================

  static createMigrationSafetyWrapper<T>(
    migrationFn: (data: any) => T,
    config: MigrationConfig
  ): (data: any) => T | null {
    return (data: any): T | null => {
      try {
        if (config.logMigrationDetails) {
          console.log('Starting migration for:', typeof data);
        }

        const result = migrationFn(data);

        if (config.logMigrationDetails) {
          console.log('Migration completed successfully');
        }

        return result;
      } catch (error) {
        console.error('Migration failed:', error);

        if (config.throwOnMigrationError) {
          throw error;
        }

        return null;
      }
    };
  }

  static validateMigrationResult<T>(
    result: T | null,
    validationFn: (data: T) => boolean,
    config: MigrationConfig
  ): { isValid: boolean; result: T | null; error?: Error } {
    if (result === null) {
      return { isValid: false, result: null, error: new Error('Migration returned null') };
    }

    try {
      const isValid = validationFn(result);

      if (!isValid && config.logMigrationDetails) {
        console.warn('Migration validation failed for result:', result);
      }

      return { isValid, result };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        result: null,
        error: error instanceof Error ? error : new Error('Validation failed')
      };
    }
  }

  // ============================================================================
  // BATCH PROCESSING UTILITIES
  // ============================================================================

  static async processMigrationBatch<T, S>(
    items: T[],
    migrationFn: (item: T) => Promise<S> | S,
    config: MigrationConfig,
    batchSize: number = config.batchSize
  ): Promise<{ success: S[]; failures: Array<{ item: T; error: Error }> }> {
    const result = { success: [] as S[], failures: [] as Array<{ item: T; error: Error }> };

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(item => Promise.resolve(migrationFn(item)))
      );

      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          result.success.push(batchResult.value);
        } else {
          result.failures.push({
            item: batch[index],
            error: batchResult.reason instanceof Error
              ? batchResult.reason
              : new Error('Migration failed'),
          });
        }
      });

      if (config.logMigrationDetails) {
        console.log(`Processed batch ${i / batchSize + 1}: ${batch.length} items, ` +
                   `${result.success.length} success, ${result.failures.length} failures`);
      }
    }

    return result;
  }

  // ============================================================================
  // TYPE COMPATIBILITY UTILITIES
  // ============================================================================

  static checkTypeCompatibility(source: any, targetType: string): boolean {
    // Simple type compatibility check
    // In a real implementation, this would be more sophisticated
    switch (targetType) {
      case 'BaseEntity':
        return source && typeof source === 'object' && ('id' in source || 'uuid' in source);
      case 'FullAuditEntity':
        return this.checkTypeCompatibility(source, 'BaseEntity') &&
               ('created_by' in source || 'createdBy' in source);
      case 'LoadingOperation':
        return source && typeof source === 'object' &&
               ('id' in source || 'operationId' in source);
      default:
        return true;
    }
  }

  static getTypeCompatibilityScore(source: any, targetType: string): number {
    // Simple compatibility scoring
    // Higher score means better compatibility
    switch (targetType) {
      case 'BaseEntity':
        let score = 0;
        if ('id' in source) score += 2;
        if ('uuid' in source) score += 1;
        if ('created_at' in source || 'createdAt' in source) score += 1;
        if ('updated_at' in source || 'updatedAt' in source) score += 1;
        return score;

      case 'FullAuditEntity':
        let auditScore = this.getTypeCompatibilityScore(source, 'BaseEntity');
        if ('created_by' in source || 'createdBy' in source) auditScore += 1;
        if ('updated_by' in source || 'updatedBy' in source) auditScore += 1;
        return auditScore;

      case 'LoadingOperation':
        let loadingScore = 0;
        if ('id' in source || 'operationId' in source) loadingScore += 2;
        if ('type' in source || 'operationType' in source) loadingScore += 1;
        if ('state' in source || 'status' in source) loadingScore += 1;
        return loadingScore;

      default:
        return 1;
    }
  }

  // ============================================================================
  // MIGRATION METADATA UTILITIES
  // ============================================================================

  static addMigrationMetadata<T extends object>(item: T, metadata: Record<string, any>): T {
    return {
      ...item,
      _migrationMetadata: {
        migratedAt: new Date().toISOString(),
        migratedFrom: item.constructor?.name || 'unknown',
        ...metadata,
      },
    };
  }

  static getMigrationMetadata<T extends object>(item: T): Record<string, any> | null {
    if ('_migrationMetadata' in item && typeof item._migrationMetadata === 'object') {
      return item._migrationMetadata as Record<string, any>;
    }
    return null;
  }

  static removeMigrationMetadata<T extends object>(item: T): Omit<T, '_migrationMetadata'> {
    const { _migrationMetadata, ...rest } = item;
    return rest;
  }

  // ============================================================================
  // ERROR HANDLING UTILITIES
  // ============================================================================

  static createMigrationError(
    message: string,
    sourceItem: unknown,
    targetType: string,
    cause?: Error
  ): Error {
    const error = new Error(`[MIGRATION] ${message}`);

    if (cause) {
      error.cause = cause;
    }

    // Add migration context
    const errorWithContext = error as Error & {
      migrationContext?: {
        sourceType: string;
        targetType: string;
        timestamp: string;
        sourceItem: unknown;
      };
    };

    errorWithContext.migrationContext = {
      sourceType: sourceItem?.constructor?.name || typeof sourceItem,
      targetType,
      timestamp: new Date().toISOString(),
      sourceItem: this.sanitizeErrorContext(sourceItem),
    };

    return error;
  }

  private static sanitizeErrorContext(item: unknown): unknown {
    if (item === null || item === undefined) return item;
    if (typeof item !== 'object') return String(item);

    // Create a sanitized copy
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // ============================================================================
  // MIGRATION LOGGING UTILITIES
  // ============================================================================

  static logMigrationStart(typeName: string, count: number, config: MigrationConfig): void {
    if (!config.logMigrationDetails) return;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Starting migration: ${typeName}`);
    console.log(`📊 Items to migrate: ${count}`);
    console.log(`⚙️  Batch size: ${config.batchSize}`);
    console.log(`🔍 Validation enabled: ${config.validateBeforeMigration && config.validateAfterMigration}`);
    console.log(`📝 Logging enabled: ${config.logMigrationDetails}`);
    console.log(`🛑 Throw on error: ${config.throwOnMigrationError}`);
    console.log(`${'='.repeat(50)}\n`);
  }

  static logMigrationProgress(
    processed: number,
    total: number,
    success: number,
    failures: number,
    config: MigrationConfig
  ): void {
    if (!config.logMigrationDetails) return;

    const progress = Math.round((processed / total) * 100);
    console.log(`📈 Progress: ${progress}% (${processed}/${total})`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failures: ${failures}`);
  }

  static logMigrationComplete(
    typeName: string,
    success: number,
    failures: number,
    duration: number,
    config: MigrationConfig
  ): void {
    if (!config.logMigrationDetails) return;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 Migration completed: ${typeName}`);
    console.log(`✅ Successfully migrated: ${success}`);
    console.log(`❌ Failed migrations: ${failures}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Success rate: ${Math.round((success / (success + failures)) * 100)}%`);
    console.log(`${'='.repeat(50)}\n`);
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const MigrationHelperUtils = {
  MigrationHelpers,
};