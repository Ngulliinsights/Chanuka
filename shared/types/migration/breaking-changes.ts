/**
 * BREAKING CHANGES - Type System Breaking Changes Documentation
 *
 * Comprehensive documentation of breaking changes in the type system
 * Includes migration paths and replacement patterns
 */

// ============================================================================
// BREAKING CHANGE INTERFACES
// ============================================================================

export interface BreakingChange {
  changeId: string;
  typeName: string;
  versionIntroduced: string;
  severity: 'major' | 'minor' | 'patch';
  description: string;
  oldSignature: string;
  newSignature: string;
  migrationPath: string;
  affectedFiles?: string[];
  relatedChanges?: string[];
  deprecationWarning?: string;
  exampleBefore?: string;
  exampleAfter?: string;
}

export interface MigrationPath {
  fromType: string;
  toType: string;
  steps: Array<{
    description: string;
    codeExample?: string;
    automated?: boolean;
  }>;
  breakingChanges: string[];
  compatibilityNotes?: string;
}

// ============================================================================
// BREAKING CHANGES REGISTRY
// ============================================================================

export class BreakingChangesRegistry {
  private static instance: BreakingChangesRegistry;
  private breakingChanges: Map<string, BreakingChange>;
  private migrationPaths: Map<string, MigrationPath>;

  private constructor() {
    this.breakingChanges = new Map();
    this.migrationPaths = new Map();
    this.registerCoreBreakingChanges();
  }

  public static getInstance(): BreakingChangesRegistry {
    if (!BreakingChangesRegistry.instance) {
      BreakingChangesRegistry.instance = new BreakingChangesRegistry();
    }
    return BreakingChangesRegistry.instance;
  }

  private registerCoreBreakingChanges(): void {
    // Register core breaking changes that are known
    this.registerBreakingChanges([
      {
        changeId: 'BC-001',
        typeName: 'LoadingOperation',
        versionIntroduced: '2.0.0',
        severity: 'major',
        description: 'LoadingOperation interface has been completely restructured with new field names and types',
        oldSignature: 'interface LoadingOperation { operationId: string; operationType: string; startedAt: Date; ... }',
        newSignature: 'interface LoadingOperation { id: string; type: LoadingType; startTime: number; ... }',
        migrationPath: 'loading-operation-v1-to-v2',
        affectedFiles: ['shared/types/loading.ts', 'client/src/**/*.tsx'],
        relatedChanges: ['BC-002', 'BC-003'],
        deprecationWarning: 'LegacyLoadingOperation',
      },
      {
        changeId: 'BC-002',
        typeName: 'BaseEntity',
        versionIntroduced: '1.5.0',
        severity: 'major',
        description: 'BaseEntity field names changed from camelCase to snake_case for database consistency',
        oldSignature: 'interface BaseEntity { uuid: string; createdAt: Date; updatedAt: Date }',
        newSignature: 'interface BaseEntity { id: string; created_at: Date; updated_at: Date }',
        migrationPath: 'base-entity-camel-to-snake',
        affectedFiles: ['shared/schema/base-types.ts', 'server/**/*.ts'],
        relatedChanges: ['BC-001'],
        deprecationWarning: 'LegacyEntity',
      },
      {
        changeId: 'BC-003',
        typeName: 'ApiResponse',
        versionIntroduced: '1.8.0',
        severity: 'minor',
        description: 'ApiResponse structure standardized with consistent error handling',
        oldSignature: 'interface ApiResponse { result: any; success: boolean; errorCode?: number; errorMessage?: string }',
        newSignature: 'interface ApiResponse<T> { data: T; success: boolean; error?: ApiError; timestamp: string }',
        migrationPath: 'api-response-standardization',
        affectedFiles: ['shared/types/api/response-types.ts'],
        deprecationWarning: 'LegacyApiResponse',
      },
    ]);

    // Register migration paths
    this.registerMigrationPaths([
      {
        fromType: 'LegacyLoadingOperation',
        toType: 'LoadingOperation',
        steps: [
          {
            description: 'Rename operationId to id',
            codeExample: 'const newId = legacyOperation.operationId; // becomes id',
            automated: true,
          },
          {
            description: 'Convert startedAt/endedAt from Date to number timestamps',
            codeExample: 'const startTime = legacyOperation.startedAt.getTime();',
            automated: true,
          },
          {
            description: 'Map operationType to new LoadingType union',
            codeExample: 'const type = mapLegacyType(legacyOperation.operationType);',
            automated: true,
          },
        ],
        breakingChanges: ['BC-001'],
        compatibilityNotes: 'Use LoadingOperationTransformer for automated migration',
      },
      {
        fromType: 'LegacyEntity',
        toType: 'BaseEntity',
        steps: [
          {
            description: 'Rename uuid to id',
            codeExample: 'const id = legacyEntity.uuid;',
            automated: true,
          },
          {
            description: 'Convert createdAt/updatedAt from camelCase to snake_case',
            codeExample: 'const created_at = legacyEntity.createdAt;',
            automated: true,
          },
        ],
        breakingChanges: ['BC-002'],
        compatibilityNotes: 'Use BaseEntityTransformer for automated migration',
      },
    ]);
  }

  // ============================================================================
  // BREAKING CHANGES MANAGEMENT
  // ============================================================================

  public registerBreakingChange(breakingChange: BreakingChange): void {
    this.breakingChanges.set(breakingChange.changeId, breakingChange);
  }

  public registerBreakingChanges(breakingChanges: BreakingChange[]): void {
    breakingChanges.forEach(change => this.registerBreakingChange(change));
  }

  public getBreakingChange(changeId: string): BreakingChange | undefined {
    return this.breakingChanges.get(changeId);
  }

  public getBreakingChangesForType(typeName: string): BreakingChange[] {
    return Array.from(this.breakingChanges.values()).filter(
      change => change.typeName === typeName
    );
  }

  public getAllBreakingChanges(): BreakingChange[] {
    return Array.from(this.breakingChanges.values());
  }

  public getCriticalBreakingChanges(): BreakingChange[] {
    return Array.from(this.breakingChanges.values()).filter(
      change => change.severity === 'major'
    );
  }

  // ============================================================================
  // MIGRATION PATHS MANAGEMENT
  // ============================================================================

  public registerMigrationPath(migrationPath: MigrationPath): void {
    const pathKey = `${migrationPath.fromType}-to-${migrationPath.toType}`;
    this.migrationPaths.set(pathKey, migrationPath);
  }

  public registerMigrationPaths(migrationPaths: MigrationPath[]): void {
    migrationPaths.forEach(path => this.registerMigrationPath(path));
  }

  public getMigrationPath(fromType: string, toType: string): MigrationPath | undefined {
    const pathKey = `${fromType}-to-${toType}`;
    return this.migrationPaths.get(pathKey);
  }

  public getAllMigrationPaths(): MigrationPath[] {
    return Array.from(this.migrationPaths.values());
  }

  public getMigrationPathsForType(typeName: string): MigrationPath[] {
    return Array.from(this.migrationPaths.values()).filter(
      path => path.fromType === typeName || path.toType === typeName
    );
  }

  // ============================================================================
  // BREAKING CHANGES ANALYSIS
  // ============================================================================

  public analyzeImpactOfBreakingChanges(typeName: string): {
    breakingChanges: BreakingChange[];
    affectedFiles: string[];
    relatedChanges: BreakingChange[];
    migrationPaths: MigrationPath[];
  } {
    const breakingChanges = this.getBreakingChangesForType(typeName);
    const affectedFiles = new Set<string>();
    const relatedChanges = new Set<BreakingChange>();
    const migrationPaths = this.getMigrationPathsForType(typeName);

    // Collect affected files and related changes
    breakingChanges.forEach(change => {
      if (change.affectedFiles) {
        change.affectedFiles.forEach(file => affectedFiles.add(file));
      }

      if (change.relatedChanges) {
        change.relatedChanges.forEach(relatedId => {
          const relatedChange = this.getBreakingChange(relatedId);
          if (relatedChange) {
            relatedChanges.add(relatedChange);
          }
        });
      }
    });

    return {
      breakingChanges,
      affectedFiles: Array.from(affectedFiles),
      relatedChanges: Array.from(relatedChanges),
      migrationPaths,
    };
  }

  public generateMigrationGuideForType(typeName: string): string {
    const impact = this.analyzeImpactOfBreakingChanges(typeName);
    let guide = `# Migration Guide: ${typeName}\n\n`;

    if (impact.breakingChanges.length === 0) {
      guide += '✅ No breaking changes found for this type.\n';
      return guide;
    }

    guide += `## Breaking Changes (${impact.breakingChanges.length})\n\n`;

    impact.breakingChanges.forEach(change => {
      guide += `### ${change.changeId}: ${change.description}\n`;
      guide += `- **Severity**: ${change.severity}\n`;
      guide += `- **Version**: ${change.versionIntroduced}\n`;
      guide += `- **Migration Path**: ${change.migrationPath}\n`;

      if (change.exampleBefore) {
        guide += `\n**Before:**\n\`\`\`typescript\n${change.exampleBefore}\n\`\`\`\n`;
      }

      if (change.exampleAfter) {
        guide += `\n**After:**\n\`\`\`typescript\n${change.exampleAfter}\n\`\`\`\n`;
      }

      guide += '\n';
    });

    if (impact.migrationPaths.length > 0) {
      guide += `## Migration Paths\n\n`;

      impact.migrationPaths.forEach(path => {
        guide += `### ${path.fromType} → ${path.toType}\n`;

        if (path.steps) {
          guide += '**Steps:**\n';
          path.steps.forEach((step, index) => {
            guide += `${index + 1}. ${step.description}\n`;
            if (step.codeExample) {
              guide += `   \`\`\`typescript\n   ${step.codeExample}\n   \`\`\`\n`;
            }
          });
        }

        if (path.compatibilityNotes) {
          guide += `\n**Compatibility Notes:** ${path.compatibilityNotes}\n`;
        }

        guide += '\n';
      });
    }

    if (impact.affectedFiles.length > 0) {
      guide += `## Affected Files\n\n`;
      guide += `The following files may need updates:\n\n`;
      guide += impact.affectedFiles.map(file => `- \`${file}\``).join('\n');
      guide += '\n\n';
    }

    return guide;
  }

  // ============================================================================
  // MIGRATION COMPATIBILITY CHECKING
  // ============================================================================

  public checkMigrationCompatibility(
    currentTypes: string[],
    targetVersion: string
  ): {
    compatible: boolean;
    breakingChanges: BreakingChange[];
    migrationRequired: boolean;
  } {
    const breakingChanges = Array.from(this.breakingChanges.values()).filter(
      change => {
        // Check if this change affects any of our current types
        const affectsCurrentType = currentTypes.includes(change.typeName);

        // Check if the change was introduced in a version <= target version
        // Simple version comparison - could be enhanced
        const requiresMigration = this.compareVersions(change.versionIntroduced, targetVersion) <= 0;

        return affectsCurrentType && requiresMigration;
      }
    );

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      migrationRequired: breakingChanges.length > 0,
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const part1 = v1Parts[i] || 0;
      const part2 = v2Parts[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  // ============================================================================
  // DEPRECATION TRACKING
  // ============================================================================

  public getDeprecatedTypes(): string[] {
    return Array.from(this.breakingChanges.values())
      .filter(change => change.deprecationWarning)
      .map(change => change.typeName);
  }

  public isTypeDeprecated(typeName: string): boolean {
    return this.getDeprecatedTypes().includes(typeName);
  }

  public getDeprecationWarningsForType(typeName: string): string[] {
    return this.getBreakingChangesForType(typeName)
      .filter(change => change.deprecationWarning)
      .map(change => change.deprecationWarning!);
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const BreakingChangesUtils = {
  BreakingChangesRegistry,
};