/**
 * MIGRATION TOOLS - Automated Type Migration Utilities
 *
 * Core utilities for transforming and migrating types to the standardized system
 * Includes type analysis, transformation, and validation capabilities
 */

import { LoadingState } from '../domains/loading';

// ============================================================================
// TYPE ANALYSIS UTILITIES
// ============================================================================

export interface TypeAnalysisResult {
  typeName: string;
  isStandardized: boolean;
  missingFields: string[];
  extraFields: string[];
  fieldTypeMismatches: Record<string, { expected: string; actual: string }>;
  recommendations: string[];
}

export function analyzeTypeStructure<T extends object>(
  typeInstance: T,
  standardDefinition: Record<keyof T, string>
): TypeAnalysisResult {
  const result: TypeAnalysisResult = {
    typeName: typeInstance.constructor?.name || 'Unknown',
    isStandardized: true,
    missingFields: [],
    extraFields: [],
    fieldTypeMismatches: {},
    recommendations: [],
  };

  // Check for missing fields
  for (const [fieldName, expectedType] of Object.entries(standardDefinition)) {
    if (!(fieldName in typeInstance)) {
      result.missingFields.push(fieldName);
      result.isStandardized = false;
    }
  }

  // Check for extra fields
  for (const fieldName in typeInstance) {
    if (!(fieldName in standardDefinition)) {
      result.extraFields.push(fieldName);
      result.isStandardized = false;
    }
  }

  // Check field type mismatches
  for (const [fieldName, expectedType] of Object.entries(standardDefinition)) {
    if (fieldName in typeInstance) {
      const actualType = typeof typeInstance[fieldName as keyof T];
      if (actualType !== (expectedType as string).toLowerCase()) {
        result.fieldTypeMismatches[fieldName] = {
          expected: expectedType as string,
          actual: actualType,
        };
        result.isStandardized = false;
      }
    }
  }

  // Generate recommendations
  if (result.missingFields.length > 0) {
    result.recommendations.push(
      `Add missing fields: ${result.missingFields.join(', ')}`
    );
  }

  if (result.extraFields.length > 0) {
    result.recommendations.push(
      `Remove extra fields: ${result.extraFields.join(', ')}`
    );
  }

  if (Object.keys(result.fieldTypeMismatches).length > 0) {
    result.recommendations.push(
      `Fix type mismatches for: ${Object.keys(result.fieldTypeMismatches).join(', ')}`
    );
  }

  return result;
}

// ============================================================================
// TYPE TRANSFORMATION UTILITIES
// ============================================================================

export interface TypeTransformationOptions {
  preserveLegacyFields?: boolean;
  addAuditFields?: boolean;
  validateStructure?: boolean;
  logWarnings?: boolean;
}

export function transformToStandardType<T, S>(
  legacyInstance: T,
  standardConstructor: new (data: Partial<S>) => S,
  fieldMapping: Record<keyof T & string, keyof S & string>,
  options: TypeTransformationOptions = {}
): S {
  const { addAuditFields = false, logWarnings = true } = options;

  const transformedData: Partial<S> = {};

  // Apply field mapping
  for (const [legacyField, standardField] of Object.entries(fieldMapping)) {
    if (legacyField in (legacyInstance as object)) {
      const legacyValue = (legacyInstance as Record<string, unknown>)[legacyField];
      transformedData[standardField as keyof S] = legacyValue as S[keyof S];
    } else if (logWarnings) {
      console.warn(`Legacy field '${legacyField}' not found in source object`);
    }
  }

  // Add audit fields if requested
  if (addAuditFields) {
    const now = new Date();
    const dataWithAudit = transformedData as Record<string, unknown>;
    dataWithAudit.created_at = now;
    dataWithAudit.updated_at = now;
  }

  // Create the standardized instance
  const standardInstance = new standardConstructor(transformedData);

  return standardInstance;
}

// ============================================================================
// MIGRATION BATCH PROCESSING
// ============================================================================

export interface MigrationBatchResult<T> {
  successCount: number;
  failureCount: number;
  migratedItems: T[];
  errors: Array<{ item: any; error: Error }>;
  warnings: string[];
}

export async function migrateBatch<T, S>(
  legacyItems: T[],
  migrationFn: (item: T) => Promise<S> | S,
  batchSize: number = 100
): Promise<MigrationBatchResult<S>> {
  const result: MigrationBatchResult<S> = {
    successCount: 0,
    failureCount: 0,
    migratedItems: [],
    errors: [],
    warnings: [],
  };

  for (let i = 0; i < legacyItems.length; i += batchSize) {
    const batch = legacyItems.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(item => Promise.resolve(migrationFn(item)))
    );

    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.migratedItems.push(batchResult.value);
        result.successCount++;
      } else {
        result.errors.push({
          item: batch[batchResults.indexOf(batchResult)],
          error: batchResult.reason,
        });
        result.failureCount++;
      }
    }
  }

  if (result.failureCount > 0) {
    result.warnings.push(
      `Migration completed with ${result.failureCount} failures out of ${legacyItems.length} items`
    );
  }

  return result;
}

// ============================================================================
// BACKWARD COMPATIBILITY UTILITIES
// ============================================================================

export function createBackwardCompatibleWrapper<T extends object>(
  standardInstance: T,
  legacyFieldMappings: Record<string, keyof T & string>
): T & Record<string, unknown> {
  const wrapper = { ...standardInstance };

  // Add legacy field accessors
  for (const [legacyField, standardField] of Object.entries(legacyFieldMappings)) {
    Object.defineProperty(wrapper, legacyField, {
      get() {
        return this[standardField];
      },
      set(value) {
        this[standardField] = value;
      },
      enumerable: true,
      configurable: true,
    });
  }

  return wrapper as T & Record<string, unknown>;
}

// ============================================================================
// MIGRATION VALIDATION
// ============================================================================

export function validateMigrationResult<T>(
  migratedItem: T,
  validationSchema: Record<keyof T, (value: unknown) => boolean>
): { isValid: boolean; validationErrors: Record<string, string> } {
  const validationErrors: Record<string, string> = {};

  for (const [fieldName, validator] of Object.entries(validationSchema) as Array<[keyof T, (value: unknown) => boolean]>) {
    if (!validator(migratedItem[fieldName])) {
      validationErrors[fieldName as string] = `Validation failed for field ${fieldName as string}`;
    }
  }

  return {
    isValid: Object.keys(validationErrors).length === 0,
    validationErrors,
  };
}

// ============================================================================
// MIGRATION STATE TRACKING
// ============================================================================

export interface MigrationState {
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  startTime: Date;
  endTime?: Date;
  status: LoadingState;
  currentBatch?: number;
  totalBatches?: number;
}

export class MigrationTracker {
  private state: MigrationState;

  constructor(totalItems: number) {
    this.state = {
      totalItems,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      startTime: new Date(),
      status: 'loading',
    };
  }

  recordSuccess(): void {
    this.state.processedItems++;
    this.state.successCount++;
    this.updateStatus();
  }

  recordFailure(): void {
    this.state.processedItems++;
    this.state.failureCount++;
    this.updateStatus();
  }

  setBatchInfo(currentBatch: number, totalBatches: number): void {
    this.state.currentBatch = currentBatch;
    this.state.totalBatches = totalBatches;
  }

  complete(): void {
    this.state.status = 'success';
    this.state.endTime = new Date();
  }

  fail(): void {
    this.state.status = 'error';
    this.state.endTime = new Date();
  }

  private updateStatus(): void {
    if (this.state.processedItems === this.state.totalItems) {
      if (this.state.failureCount === 0) {
        this.state.status = 'success';
      } else if (this.state.failureCount === this.state.totalItems) {
        this.state.status = 'error';
      } else {
        this.state.status = 'timeout';
      }
    }
  }

  getState(): MigrationState {
    return { ...this.state };
  }

  getProgress(): number {
    return this.state.totalItems > 0
      ? (this.state.processedItems / this.state.totalItems) * 100
      : 0;
  }
}