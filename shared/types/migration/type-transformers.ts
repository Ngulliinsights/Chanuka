/**
 * TYPE TRANSFORMERS - Advanced Type Transformation Utilities
 *
 * Specialized utilities for transforming between different type versions
 * and handling complex type migration scenarios
 */

import { BaseEntity, FullAuditEntity } from '../../schema/base-types';
import { LoadingOperation, LoadingState } from '../../shared/types/loading';

// ============================================================================
// CORE TYPE TRANSFORMERS
// ============================================================================

export interface TypeTransformer<T, S> {
  canTransform(source: T): boolean;
  transform(source: T): S;
  getTransformationInfo(): {
    sourceType: string;
    targetType: string;
    description: string;
  };
}

// ============================================================================
// BASE TRANSFORMER IMPLEMENTATIONS
// ============================================================================

export class BaseEntityTransformer implements TypeTransformer<any, BaseEntity> {
  canTransform(source: any): boolean {
    return (
      source &&
      typeof source === 'object' &&
      ('id' in source || 'uuid' in source || '_id' in source)
    );
  }

  transform(source: any): BaseEntity {
    return {
      id: source.id || source.uuid || source._id || this.generateId(),
      created_at: this.parseDate(source.created_at || source.createdAt || new Date()),
      updated_at: this.parseDate(source.updated_at || source.updatedAt || new Date()),
    };
  }

  getTransformationInfo() {
    return {
      sourceType: 'LegacyEntity',
      targetType: 'BaseEntity',
      description: 'Transforms legacy entity formats to standardized BaseEntity',
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private parseDate(dateInput: Date | string | number): Date {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') return new Date(dateInput);
    if (typeof dateInput === 'number') return new Date(dateInput);
    return new Date();
  }
}

export class FullAuditTransformer implements TypeTransformer<any, FullAuditEntity> {
  canTransform(source: any): boolean {
    return (
      source &&
      typeof source === 'object' &&
      (source.id || source.uuid || source._id)
    );
  }

  transform(source: any): FullAuditEntity {
    const baseTransformer = new BaseEntityTransformer();
    const baseEntity = baseTransformer.transform(source);

    return {
      ...baseEntity,
      created_by: source.created_by || source.createdBy || 'system',
      updated_by: source.updated_by || source.updatedBy || 'system',
      deleted_at: this.parseNullableDate(
        source.deleted_at || source.deletedAt
      ),
      deleted_by: source.deleted_by || source.deletedBy || null,
    };
  }

  getTransformationInfo() {
    return {
      sourceType: 'LegacyAuditEntity',
      targetType: 'FullAuditEntity',
      description: 'Transforms legacy audit entities to standardized FullAuditEntity',
    };
  }

  private parseNullableDate(dateInput: Date | string | number | null | undefined): Date | null {
    if (dateInput === null || dateInput === undefined) return null;
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') return new Date(dateInput);
    if (typeof dateInput === 'number') return new Date(dateInput);
    return null;
  }
}

// ============================================================================
// LOADING OPERATION TRANSFORMERS
// ============================================================================

export class LoadingOperationTransformer implements TypeTransformer<any, LoadingOperation> {
  canTransform(source: any): boolean {
    return (
      source &&
      typeof source === 'object' &&
      ('operationId' in source || 'id' in source)
    );
  }

  transform(source: any): LoadingOperation {
    return {
      id: source.operationId || source.id || this.generateId(),
      type: this.mapLoadingType(source.type || 'api'),
      priority: this.mapPriority(source.priority || 'medium'),
      startTime: this.parseTimestamp(source.startTime || source.startedAt || Date.now()),
      endTime: this.parseNullableTimestamp(source.endTime || source.endedAt),
      timeout: source.timeout || source.timeoutMs || 30000,
      estimatedTime: source.estimatedTime || source.estimatedMs || undefined,
      retryCount: source.retryCount || source.retries || 0,
      maxRetries: source.maxRetries || source.maxRetries || 3,
      retryStrategy: this.mapRetryStrategy(source.retryStrategy || 'exponential'),
      retryDelay: source.retryDelay || source.retryDelayMs || 1000,
      state: this.mapLoadingState(source.state || source.status || 'loading'),
      message: source.message || source.description || undefined,
      error: source.error || undefined,
      progress: source.progress || source.progressPercent || undefined,
      stage: source.stage || source.currentStage || undefined,
      connectionAware: source.connectionAware || false,
      dependencies: source.dependencies || [],
      metadata: source.metadata || {},
      timeoutWarningShown: source.timeoutWarningShown || false,
      cancelled: source.cancelled || false,
      description: source.description || source.details || undefined,
    };
  }

  getTransformationInfo() {
    return {
      sourceType: 'LegacyLoadingOperation',
      targetType: 'LoadingOperation',
      description: 'Transforms legacy loading operation formats to standardized LoadingOperation',
    };
  }

  private generateId(): string {
    return 'op_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private parseTimestamp(timestamp: number | Date | string): number {
    if (typeof timestamp === 'number') return timestamp;
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'string') return new Date(timestamp).getTime();
    return Date.now();
  }

  private parseNullableTimestamp(timestamp: number | Date | string | null | undefined): number | undefined {
    if (timestamp === null || timestamp === undefined) return undefined;
    return this.parseTimestamp(timestamp);
  }

  private mapLoadingType(type: string): LoadingOperation['type'] {
    const typeMap: Record<string, LoadingOperation['type']> = {
      'page': 'page',
      'component': 'component',
      'api': 'api',
      'asset': 'asset',
      'progressive': 'progressive',
      'form': 'form',
      'navigation': 'navigation',
      'data': 'data',
      'network': 'network',
      'inline': 'inline',
      'network-aware': 'network-aware',
      'timeout-aware': 'timeout-aware',
    };
    return typeMap[type] || 'api';
  }

  private mapPriority(priority: string): LoadingOperation['priority'] {
    const priorityMap: Record<string, LoadingOperation['priority']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
    };
    return priorityMap[priority] || 'medium';
  }

  private mapRetryStrategy(strategy: string): LoadingOperation['retryStrategy'] {
    const strategyMap: Record<string, LoadingOperation['retryStrategy']> = {
      'exponential': 'exponential',
      'linear': 'linear',
      'none': 'none',
    };
    return strategyMap[strategy] || 'exponential';
  }

  private mapLoadingState(state: string): LoadingOperation['state'] {
    const stateMap: Record<string, LoadingOperation['state']> = {
      'idle': 'idle',
      'loading': 'loading',
      'success': 'success',
      'error': 'error',
      'timeout': 'timeout',
      'cancelled': 'cancelled',
    };
    return stateMap[state] || 'loading';
  }
}

// ============================================================================
// TRANSFORMER REGISTRY
// ============================================================================

export class TransformerRegistry {
  private static instance: TransformerRegistry;
  private transformers: Map<string, TypeTransformer<any, any>>;

  private constructor() {
    this.transformers = new Map();
    this.registerDefaultTransformers();
  }

  public static getInstance(): TransformerRegistry {
    if (!TransformerRegistry.instance) {
      TransformerRegistry.instance = new TransformerRegistry();
    }
    return TransformerRegistry.instance;
  }

  private registerDefaultTransformers(): void {
    this.registerTransformer(new BaseEntityTransformer());
    this.registerTransformer(new FullAuditTransformer());
    this.registerTransformer(new LoadingOperationTransformer());
  }

  public registerTransformer<T, S>(transformer: TypeTransformer<T, S>): void {
    const info = transformer.getTransformationInfo();
    this.transformers.set(info.sourceType, transformer);
  }

  public getTransformer<T, S>(sourceType: string): TypeTransformer<T, S> | undefined {
    return this.transformers.get(sourceType) as TypeTransformer<T, S> | undefined;
  }

  public transform<T, S>(source: T, targetType: string): S | undefined {
    const transformer = this.transformers.get(targetType) as TypeTransformer<T, S> | undefined;
    if (transformer && transformer.canTransform(source)) {
      return transformer.transform(source);
    }
    return undefined;
  }

  public getAvailableTransformers(): Array<ReturnType<TypeTransformer<any, any>['getTransformationInfo']>> {
    return Array.from(this.transformers.values()).map(t => t.getTransformationInfo());
  }
}

// ============================================================================
// COMPLEX TYPE TRANSFORMATIONS
// ============================================================================

export interface ComplexTypeMapping {
  sourceType: string;
  targetType: string;
  fieldMappings: Record<string, string | ((value: any) => any)>;
  defaultValues?: Record<string, any>;
  postProcessors?: Array<(target: any) => any>;
}

export class ComplexTypeTransformer {
  constructor(private mappings: ComplexTypeMapping[]) {}

  public transform(source: any, targetType: string): any {
    const mapping = this.mappings.find(m => m.targetType === targetType);
    if (!mapping) {
      throw new Error(`No mapping found for target type: ${targetType}`);
    }

    const target: Record<string, any> = { ...mapping.defaultValues };

    // Apply field mappings
    for (const [sourceField, targetFieldOrFn] of Object.entries(mapping.fieldMappings)) {
      if (sourceField in source) {
        const targetField = typeof targetFieldOrFn === 'function'
          ? targetFieldOrFn(source[sourceField])
          : targetFieldOrFn;

        if (typeof targetField === 'string') {
          target[targetField] = source[sourceField];
        }
      }
    }

    // Apply post-processors
    if (mapping.postProcessors) {
      return mapping.postProcessors.reduce((acc, processor) => processor(acc), target);
    }

    return target;
  }

  public canTransform(source: any, targetType: string): boolean {
    const mapping = this.mappings.find(m => m.targetType === targetType);
    return !!mapping && mapping.sourceType === source?.constructor?.name;
  }
}

// ============================================================================
// TYPE VERSIONING UTILITIES
// ============================================================================

export interface TypeVersionInfo {
  typeName: string;
  currentVersion: string;
  previousVersions: Record<string, {
    migrationPath: string;
    breakingChanges: string[];
  }>;
  migrationGuide?: string;
}

export class TypeVersionManager {
  private versions: Map<string, TypeVersionInfo>;

  constructor() {
    this.versions = new Map();
  }

  public registerTypeVersion(info: TypeVersionInfo): void {
    this.versions.set(info.typeName, info);
  }

  public getMigrationPath(typeName: string, fromVersion: string, toVersion: string): string[] {
    const versionInfo = this.versions.get(typeName);
    if (!versionInfo) {
      throw new Error(`Type ${typeName} not registered`);
    }

    const path: string[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const nextVersion = this.findNextVersion(versionInfo, currentVersion);
      if (!nextVersion) {
        throw new Error(`No migration path from ${currentVersion} to ${toVersion}`);
      }

      path.push(versionInfo.previousVersions[nextVersion].migrationPath);
      currentVersion = nextVersion;
    }

    return path;
  }

  private findNextVersion(versionInfo: TypeVersionInfo, currentVersion: string): string | undefined {
    const versions = Object.keys(versionInfo.previousVersions);
    versions.sort((a, b) => this.compareVersions(a, b));

    for (const version of versions) {
      if (this.compareVersions(version, currentVersion) > 0) {
        return version;
      }
    }

    return undefined;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }

    return 0;
  }

  public getBreakingChanges(typeName: string, fromVersion: string, toVersion: string): string[] {
    const versionInfo = this.versions.get(typeName);
    if (!versionInfo) {
      throw new Error(`Type ${typeName} not registered`);
    }

    const changes: string[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const nextVersion = this.findNextVersion(versionInfo, currentVersion);
      if (!nextVersion) {
        break;
      }

      changes.push(...versionInfo.previousVersions[nextVersion].breakingChanges);
      currentVersion = nextVersion;
    }

    return changes;
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const TypeTransformers = {
  BaseEntityTransformer,
  FullAuditTransformer,
  LoadingOperationTransformer,
  TransformerRegistry,
  ComplexTypeTransformer,
  TypeVersionManager,
};

export type {
  TypeTransformer,
  ComplexTypeMapping,
  TypeVersionInfo,
};