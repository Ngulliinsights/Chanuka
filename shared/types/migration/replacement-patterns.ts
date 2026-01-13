/**
 * REPLACEMENT PATTERNS - Type Replacement Patterns and Examples
 *
 * Comprehensive guide to replacing deprecated types with standardized ones
 * Includes code examples and migration patterns
 */

// ============================================================================
// REPLACEMENT PATTERN INTERFACES
// ============================================================================

export interface ReplacementPattern {
  deprecatedType: string;
  replacementType: string;
  importPath: string;
  description: string;
  codeExamples: {
    before: string;
    after: string;
    explanation: string;
  }[];
  migrationSteps: string[];
  breakingChanges: string[];
  compatibilityNotes?: string;
}

export interface MigrationExample {
  title: string;
  description: string;
  deprecatedCode: string;
  migratedCode: string;
  keyChanges: string[];
  relatedPatterns: string[];
}

// ============================================================================
// REPLACEMENT PATTERNS REGISTRY
// ============================================================================

export class ReplacementPatternsRegistry {
  private static instance: ReplacementPatternsRegistry;
  private patterns: Map<string, ReplacementPattern>;
  private examples: MigrationExample[];

  private constructor() {
    this.patterns = new Map();
    this.examples = [];
    this.registerCoreReplacementPatterns();
    this.registerMigrationExamples();
  }

  public static getInstance(): ReplacementPatternsRegistry {
    if (!ReplacementPatternsRegistry.instance) {
      ReplacementPatternsRegistry.instance = new ReplacementPatternsRegistry();
    }
    return ReplacementPatternsRegistry.instance;
  }

  private registerCoreReplacementPatterns(): void {
    this.registerReplacementPatterns([
      {
        deprecatedType: 'LegacyLoadingOperation',
        replacementType: 'LoadingOperation',
        importPath: 'shared/types/loading',
        description: 'Replace legacy loading operation with standardized LoadingOperation',
        codeExamples: [
          {
            before: `import { LegacyLoadingOperation } from './legacy-types';

const operation: LegacyLoadingOperation = {
  operationId: 'op1',
  operationType: 'api',
  startedAt: new Date(),
  status: 'loading',
  retryCount: 0,
  maxRetries: 3,
};`,
            after: `import { LoadingOperation } from 'shared/types/loading';

const operation: LoadingOperation = {
  id: 'op1',
  type: 'api',
  startTime: Date.now(),
  state: 'loading',
  retryCount: 0,
  maxRetries: 3,
  retryStrategy: 'exponential',
  retryDelay: 1000,
  connectionAware: false,
  timeoutWarningShown: false,
  cancelled: false,
};`,
            explanation: 'Field names changed to standardized format and additional required fields added',
          },
        ],
        migrationSteps: [
          'Rename operationId to id',
          'Convert startedAt/endedAt from Date to number timestamps',
          'Map operationType to LoadingType union',
          'Add required fields: retryStrategy, retryDelay, connectionAware, etc.',
        ],
        breakingChanges: ['BC-001'],
        compatibilityNotes: 'Use LoadingOperationTransformer for automated migration',
      },
      {
        deprecatedType: 'LegacyEntity',
        replacementType: 'BaseEntity',
        importPath: 'shared/schema/base-types',
        description: 'Replace legacy entity with standardized BaseEntity',
        codeExamples: [
          {
            before: `import { LegacyEntity } from './legacy-types';

const entity: LegacyEntity = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date(),
  updatedAt: new Date(),
};`,
            after: `import { BaseEntity } from 'shared/schema/base-types';

const entity: BaseEntity = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  created_at: new Date(),
  updated_at: new Date(),
};`,
            explanation: 'Field names changed from camelCase to snake_case for database consistency',
          },
        ],
        migrationSteps: [
          'Rename uuid to id',
          'Convert createdAt to created_at',
          'Convert updatedAt to updated_at',
        ],
        breakingChanges: ['BC-002'],
        compatibilityNotes: 'Use BaseEntityTransformer for automated migration',
      },
      {
        deprecatedType: 'LegacyApiResponse',
        replacementType: 'ApiResponse',
        importPath: 'shared/types/api/response-types',
        description: 'Replace legacy API response with standardized ApiResponse',
        codeExamples: [
          {
            before: `import { LegacyApiResponse } from './legacy-types';

const response: LegacyApiResponse<User> = {
  result: { id: 'user1', name: 'John Doe' },
  success: true,
  errorCode: 200,
  errorMessage: '',
  timestamp: new Date().toISOString(),
};`,
            after: `import { ApiResponse } from 'shared/types/api/response-types';

const response: ApiResponse<User> = {
  data: { id: 'user1', name: 'John Doe' },
  success: true,
  error: undefined,
  timestamp: new Date().toISOString(),
};`,
            explanation: 'Simplified structure with standardized error handling',
          },
        ],
        migrationSteps: [
          'Rename result to data',
          'Replace errorCode/errorMessage with standardized error object',
          'Remove redundant fields',
        ],
        breakingChanges: ['BC-003'],
        compatibilityNotes: 'Use ApiResponseTransformer for automated migration',
      },
    ]);
  }

  private registerMigrationExamples(): void {
    this.examples.push(...[
      {
        title: 'Migrating Loading State Management',
        description: 'Complete example of migrating loading state from legacy to standardized format',
        deprecatedCode: `import { LegacyLoadingState } from './legacy-types';

interface AppState {
  loading: LegacyLoadingState;
  data: any;
}

const state: AppState = {
  loading: {
    isLoading: true,
    operations: {
      'op1': {
        operationId: 'op1',
        operationType: 'api',
        startedAt: new Date(),
        status: 'loading',
      }
    },
    globalLoading: true,
  },
  data: null,
};`,
        migratedCode: `import { LoadingStateData } from 'shared/types/loading';

interface AppState {
  loading: LoadingStateData;
  data: any;
}

const state: AppState = {
  loading: {
    isLoading: true,
    operations: {
      'op1': {
        id: 'op1',
        type: 'api',
        startTime: Date.now(),
        state: 'loading',
        retryCount: 0,
        maxRetries: 3,
        retryStrategy: 'exponential',
        retryDelay: 1000,
        connectionAware: false,
        timeoutWarningShown: false,
        cancelled: false,
      }
    },
    stats: {
      totalOperations: 1,
      activeOperations: 1,
      completedOperations: 0,
      failedOperations: 0,
      averageLoadTime: 0,
      retryRate: 0,
      successRate: 0,
      connectionImpact: 'low',
      lastUpdate: Date.now(),
      currentQueueLength: 0,
      peakQueueLength: 0,
    },
    connectionInfo: {
      type: 'unknown',
    },
    isOnline: true,
    adaptiveSettings: {
      enableAnimations: true,
      maxConcurrentOperations: 5,
      defaultTimeout: 30000,
      retryDelay: 1000,
      timeoutWarningThreshold: 5000,
      connectionMultiplier: 1,
    },
    globalLoading: true,
    highPriorityLoading: false,
    assetLoadingProgress: {
      loaded: 0,
      total: 0,
      phase: 'initial',
      status: 'pending',
    },
  },
  data: null,
};`,
        keyChanges: [
          'Replaced LegacyLoadingState with LoadingStateData',
          'Updated operation structure to LoadingOperation',
          'Added comprehensive statistics and connection info',
          'Added adaptive settings for performance optimization',
        ],
        relatedPatterns: ['LegacyLoadingOperation', 'LegacyLoadingState'],
      },
      {
        title: 'Database Entity Migration',
        description: 'Migrating database entities to standardized format',
        deprecatedCode: `import { LegacyAuditEntity } from './legacy-types';

interface User extends LegacyAuditEntity {
  username: string;
  email: string;
}

const user: User = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-15'),
  createdBy: 'system',
  updatedBy: 'admin',
  deletedAt: null,
  deletedBy: null,
  username: 'johndoe',
  email: 'john@example.com',
};`,
        migratedCode: `import { FullAuditEntity } from 'shared/schema/base-types';

interface User extends FullAuditEntity {
  username: string;
  email: string;
}

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  created_at: new Date('2023-01-01'),
  updated_at: new Date('2023-01-15'),
  created_by: 'system',
  updated_by: 'admin',
  deleted_at: null,
  deleted_by: null,
  username: 'johndoe',
  email: 'john@example.com',
};`,
        keyChanges: [
          'Replaced LegacyAuditEntity with FullAuditEntity',
          'Changed field names from camelCase to snake_case',
          'Maintained all audit trail functionality',
        ],
        relatedPatterns: ['LegacyEntity', 'LegacyAuditEntity'],
      },
    ]);
  }

  // ============================================================================
  // REPLACEMENT PATTERNS MANAGEMENT
  // ============================================================================

  public registerReplacementPattern(pattern: ReplacementPattern): void {
    this.patterns.set(pattern.deprecatedType, pattern);
  }

  public registerReplacementPatterns(patterns: ReplacementPattern[]): void {
    patterns.forEach(pattern => this.registerReplacementPattern(pattern));
  }

  public getReplacementPattern(deprecatedType: string): ReplacementPattern | undefined {
    return this.patterns.get(deprecatedType);
  }

  public getAllReplacementPatterns(): ReplacementPattern[] {
    return Array.from(this.patterns.values());
  }

  public getReplacementPatternsForType(typeName: string): ReplacementPattern[] {
    return Array.from(this.patterns.values()).filter(
      pattern => pattern.deprecatedType === typeName || pattern.replacementType === typeName
    );
  }

  // ============================================================================
  // MIGRATION EXAMPLES MANAGEMENT
  // ============================================================================

  public getMigrationExamples(): MigrationExample[] {
    return [...this.examples];
  }

  public getMigrationExamplesForPattern(deprecatedType: string): MigrationExample[] {
    return this.examples.filter(example =>
      example.relatedPatterns.includes(deprecatedType)
    );
  }

  public addMigrationExample(example: MigrationExample): void {
    this.examples.push(example);
  }

  // ============================================================================
  // MIGRATION GUIDE GENERATION
  // ============================================================================

  public generateMigrationGuide(deprecatedType: string): string {
    const pattern = this.getReplacementPattern(deprecatedType);
    if (!pattern) {
      return `# Migration Guide: ${deprecatedType}\n\nNo replacement pattern found for this type.\n`;
    }

    let guide = `# Migration Guide: ${deprecatedType} → ${pattern.replacementType}\n\n`;

    guide += `## Description\n\n${pattern.description}\n\n`;

    guide += `## Import Path\n\n\`\`\`typescript\nimport { ${pattern.replacementType} } from '${pattern.importPath}';\n\`\`\`\n\n`;

    if (pattern.codeExamples.length > 0) {
      guide += `## Code Examples\n\n`;

      pattern.codeExamples.forEach((example, index) => {
        guide += `### Example ${index + 1}\n\n`;
        guide += `**Explanation:** ${example.explanation}\n\n`;
        guide += `**Before:**\n\`\`\`typescript\n${example.before}\n\`\`\`\n\n`;
        guide += `**After:**\n\`\`\`typescript\n${example.after}\n\`\`\`\n\n`;
      });
    }

    if (pattern.migrationSteps.length > 0) {
      guide += `## Migration Steps\n\n`;
      guide += pattern.migrationSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
      guide += '\n\n';
    }

    if (pattern.breakingChanges.length > 0) {
      guide += `## Breaking Changes\n\n`;
      guide += pattern.breakingChanges.map(change => `- ${change}`).join('\n');
      guide += '\n\n';
    }

    if (pattern.compatibilityNotes) {
      guide += `## Compatibility Notes\n\n${pattern.compatibilityNotes}\n\n`;
    }

    // Add related migration examples
    const examples = this.getMigrationExamplesForPattern(deprecatedType);
    if (examples.length > 0) {
      guide += `## Complete Migration Examples\n\n`;

      examples.forEach(example => {
        guide += `### ${example.title}\n\n`;
        guide += `${example.description}\n\n`;
        guide += `**Key Changes:**\n`;
        guide += example.keyChanges.map(change => `- ${change}`).join('\n');
        guide += '\n\n';
        guide += `**Before:**\n\`\`\`typescript\n${example.deprecatedCode}\n\`\`\`\n\n`;
        guide += `**After:**\n\`\`\`typescript\n${example.migratedCode}\n\`\`\`\n\n`;
      });
    }

    return guide;
  }

  public generateCompleteMigrationGuide(): string {
    let guide = '# Type System Migration Guide\n\n';
    guide += 'Complete guide to migrating from deprecated types to standardized types.\n\n';

    const patterns = this.getAllReplacementPatterns();

    guide += `## Available Replacement Patterns (${patterns.length})\n\n`;

    patterns.forEach(pattern => {
      guide += `### ${pattern.deprecatedType} → ${pattern.replacementType}\n\n`;
      guide += `- **Import:** \`${pattern.importPath}\`\n`;
      guide += `- **Description:** ${pattern.description}\n`;
      guide += `- **Breaking Changes:** ${pattern.breakingChanges.length}\n`;
      guide += `\n`;
    });

    guide += `## Migration Examples\n\n`;

    this.examples.forEach(example => {
      guide += `### ${example.title}\n\n`;
      guide += `${example.description}\n\n`;
      guide += `**Related Patterns:** ${example.relatedPatterns.join(', ')}\n`;
      guide += `\n`;
    });

    guide += `## General Migration Process\n\n`;
    guide += `1. **Identify deprecated types** in your codebase\n`;
    guide += `2. **Review replacement patterns** for each deprecated type\n`;
    guide += `3. **Update imports** to use standardized types\n`;
    guide += `4. **Refactor code** following the migration examples\n`;
    guide += `5. **Test thoroughly** to ensure compatibility\n`;
    guide += `6. **Remove deprecated imports** once migration is complete\n`;

    return guide;
  }

  // ============================================================================
  // MIGRATION ASSISTANCE
  // ============================================================================

  public getMigrationChecklist(deprecatedType: string): string[] {
    const pattern = this.getReplacementPattern(deprecatedType);
    if (!pattern) return [];

    const checklist: string[] = [
      `✅ Update import from '${pattern.deprecatedType}' to '${pattern.replacementType}'`,
      `✅ Change import path to '${pattern.importPath}'`,
    ];

    if (pattern.migrationSteps) {
      pattern.migrationSteps.forEach(step => {
        checklist.push(`☐ ${step}`);
      });
    }

    checklist.push('☐ Test the migrated code thoroughly');
    checklist.push('☐ Update any related documentation');
    checklist.push('☐ Remove deprecated type imports');

    return checklist;
  }

  public getQuickMigrationSummary(deprecatedType: string): string {
    const pattern = this.getReplacementPattern(deprecatedType);
    if (!pattern) return `No migration pattern found for ${deprecatedType}`;

    return `🔧 Migrate ${deprecatedType} → ${pattern.replacementType}\n` +
           `📁 Import: ${pattern.importPath}\n` +
           `📝 Steps: ${pattern.migrationSteps.length}\n` +
           `⚠️  Breaking Changes: ${pattern.breakingChanges.length}`;
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const ReplacementPatternsUtils = {
  ReplacementPatternsRegistry,
};
