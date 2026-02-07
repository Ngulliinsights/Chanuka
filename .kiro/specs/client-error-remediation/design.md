# Design Document: Client TypeScript Error Remediation

## Overview

This design provides a systematic approach to remediating 360 TypeScript errors across 122 files in the client codebase. These errors stem from incomplete migrations to Feature-Sliced Design (FSD) structure, where modules were relocated but references were not fully updated.

The remediation focuses on **completing the FSD migration** by:
1. Identifying the new optimal locations for relocated modules
2. Updating all references to use new paths
3. Standardizing types that were fragmented during migration
4. Eliminating obsolete imports from deleted/relocated modules

**Critical Principle**: No stubs, adapters, or compatibility layers will be created. All fixes will use the actual relocated modules in their new FSD locations.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Error Remediation System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Error Analyzer  │─────▶│  Fix Generator   │            │
│  └──────────────────┘      └──────────────────┘            │
│          │                          │                        │
│          ▼                          ▼                        │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Batch Processor  │◀─────│ Type Validator   │            │
│  └──────────────────┘      └──────────────────┘            │
│          │                          │                        │
│          ▼                          ▼                        │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Progress Tracker │      │ Compatibility    │            │
│  │                  │      │ Checker          │            │
│  └──────────────────┘      └──────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Phased Execution Strategy

The remediation follows six phases executed in strict dependency order:

**Phase 1: Module Location Discovery** (23 errors)
- Identify where deleted/relocated modules now exist in FSD structure
- Map old import paths to new FSD paths
- Document module relocations
- **Blocks:** All subsequent phases

**Phase 2: Import Path Updates** (58 errors)
- Update all imports to use new FSD paths
- Remove imports from deleted modules
- Update path aliases to match FSD structure
- **Blocks:** Type standardization

**Phase 3: Type Standardization** (63 errors)
- Consolidate fragmented types from incomplete migrations
- Standardize ID types (string vs number)
- Merge duplicate interface definitions
- Align interface naming (e.g., DashboardPreferences vs UserDashboardPreferences)
- **Blocks:** Interface completion

**Phase 4: Interface Completion** (67 errors)
- Complete interfaces that were partially migrated
- Add missing properties to DashboardConfig, TimeoutAwareLoaderProps, etc.
- Standardize error constructor signatures
- **Blocks:** Type safety checks

**Phase 5: Type Safety** (94 errors)
- Add explicit type annotations
- Fix type comparisons
- Resolve interface compatibility
- Handle undefined safety
- Align enum/literal types
- **Blocks:** Final validation

**Phase 6: Import Cleanup & Validation** (55 errors)
- Remove unused imports from old locations
- Clean up obsolete path aliases
- Run full TypeScript compilation
- Verify zero errors

## Components and Interfaces

### Error Analyzer

```typescript
interface ErrorAnalyzer {
  // Scan codebase for TypeScript errors
  analyzeErrors(): Promise<ErrorReport>;
  
  // Group errors by category and file
  categorizeErrors(errors: TypeScriptError[]): CategorizedErrors;
  
  // Determine fix order based on dependencies
  determineDependencyOrder(categories: CategorizedErrors): FixPhase[];
  
  // NEW: Discover module relocations in FSD structure
  discoverModuleRelocations(missingModules: string[]): Promise<ModuleRelocationMap>;
  
  // NEW: Map old paths to new FSD paths
  mapOldPathsToFSD(oldPaths: string[]): Promise<PathMigrationMap>;
}

interface ModuleRelocationMap {
  // Maps old import path to new FSD location
  relocations: Map<string, FSDLocation>;
  
  // Modules that were intentionally deleted (no relocation)
  deletedModules: string[];
  
  // Modules that need to be consolidated (duplicates)
  consolidations: Map<string, string[]>; // canonical -> duplicates
}

interface FSDLocation {
  // New path in FSD structure
  path: string;
  
  // FSD layer (app, features, core, lib, shared)
  layer: 'app' | 'features' | 'core' | 'lib' | 'shared';
  
  // Feature name (if in features layer)
  feature?: string;
  
  // Slice segment (ui, model, api, etc.)
  segment?: string;
}

interface PathMigrationMap {
  // Old path -> New path mappings
  migrations: Map<string, string>;
  
  // Confidence score (0-1) for each mapping
  confidence: Map<string, number>;
  
  // Ambiguous mappings requiring manual review
  ambiguous: Map<string, string[]>;
}

interface ErrorReport {
  totalErrors: number;
  errorsByCategory: Map<ErrorCategory, TypeScriptError[]>;
  errorsByFile: Map<string, TypeScriptError[]>;
  errorsBySeverity: Map<Severity, TypeScriptError[]>;
}

interface TypeScriptError {
  code: string; // e.g., "TS2307"
  message: string;
  file: string;
  line: number;
  column: number;
  severity: Severity;
  category: ErrorCategory;
}

enum ErrorCategory {
  MODULE_RESOLUTION = "MODULE_RESOLUTION",
  EXPORT_PATH = "EXPORT_PATH",
  ID_TYPE = "ID_TYPE",
  INTERFACE_COMPLETION = "INTERFACE_COMPLETION",
  ERROR_CONSTRUCTOR = "ERROR_CONSTRUCTOR",
  EXPLICIT_TYPES = "EXPLICIT_TYPES",
  TYPE_COMPARISON = "TYPE_COMPARISON",
  INTERFACE_COMPATIBILITY = "INTERFACE_COMPATIBILITY",
  EXPORT_DISAMBIGUATION = "EXPORT_DISAMBIGUATION",
  UNDEFINED_SAFETY = "UNDEFINED_SAFETY",
  ENUM_LITERAL = "ENUM_LITERAL",
  PAGINATION = "PAGINATION",
  HTTP_STATUS = "HTTP_STATUS",
  NAMING_CONSISTENCY = "NAMING_CONSISTENCY",
  IMPORT_CLEANUP = "IMPORT_CLEANUP",
  TYPE_ASSERTION = "TYPE_ASSERTION"
}

enum Severity {
  CRITICAL = "CRITICAL",  // Blocks compilation
  HIGH = "HIGH",          // Breaks functionality
  MEDIUM = "MEDIUM",      // Type safety issues
  LOW = "LOW"             // Code quality
}
```

### Fix Generator

```typescript
interface FixGenerator {
  // Generate fixes for a specific error category
  generateFixes(category: ErrorCategory, errors: TypeScriptError[]): Fix[];
  
  // NEW: Generate import path update fixes
  generateImportPathUpdateFixes(
    relocations: ModuleRelocationMap,
    errors: TypeScriptError[]
  ): ImportPathFix[];
  
  // NEW: Generate type consolidation fixes
  generateTypeConsolidationFixes(
    duplicateTypes: Map<string, string[]>
  ): TypeConsolidationFix[];
  
  // Generate type standardization fixes
  generateTypeStandardizationFixes(errors: TypeScriptError[]): TypeFix[];
  
  // Generate interface completion fixes
  generateInterfaceCompletionFixes(errors: TypeScriptError[]): InterfaceFix[];
}

interface ImportPathFix extends Fix {
  file: string;
  oldImportPath: string;
  newImportPath: string;
  importedNames: string[];
}

interface TypeConsolidationFix extends Fix {
  // Canonical type location
  canonicalPath: string;
  canonicalName: string;
  
  // Duplicate types to remove
  duplicates: Array<{
    path: string;
    name: string;
  }>;
  
  // Files that need import updates
  affectedImports: Array<{
    file: string;
    oldImport: string;
    newImport: string;
  }>;
}

interface TypeFix extends Fix {
  file: string;
  location: CodeLocation;
  oldType: string;
  newType: string;
  migrationPattern?: MigrationPattern;
}

interface InterfaceFix extends Fix {
  interfaceName: string;
  file: string;
  properties: PropertyDefinition[];
}

interface FixResult {
  success: boolean;
  filesModified: string[];
  errorsFixed: string[];
  newErrors: string[];
}
```

### Batch Processor

```typescript
interface BatchProcessor {
  // Process fixes in batches
  processBatch(fixes: Fix[]): Promise<BatchResult>;
  
  // Group related fixes together
  groupRelatedFixes(fixes: Fix[]): FixBatch[];
  
  // Apply fixes with rollback capability
  applyWithRollback(batch: FixBatch): Promise<BatchResult>;
}

interface FixBatch {
  id: string;
  phase: FixPhase;
  fixes: Fix[];
  dependencies: string[]; // IDs of batches that must complete first
}

interface BatchResult {
  batchId: string;
  success: boolean;
  fixesApplied: number;
  errorsFixed: number;
  newErrors: number;
  validationResult: ValidationResult;
}

enum FixPhase {
  MODULE_LOCATION_DISCOVERY = 1,
  IMPORT_PATH_UPDATES = 2,
  TYPE_STANDARDIZATION = 3,
  INTERFACE_COMPLETION = 4,
  TYPE_SAFETY = 5,
  IMPORT_CLEANUP_AND_VALIDATION = 6
}
```

### Type Validator

```typescript
interface TypeValidator {
  // Run TypeScript compiler to check for errors
  validateTypeScript(files?: string[]): Promise<ValidationResult>;
  
  // Check for new errors introduced by fixes
  detectNewErrors(before: ErrorReport, after: ErrorReport): TypeScriptError[];
  
  // Verify backward compatibility
  checkBackwardCompatibility(changes: TypeChange[]): CompatibilityReport;
}

interface ValidationResult {
  success: boolean;
  errorCount: number;
  errors: TypeScriptError[];
  warnings: TypeScriptWarning[];
}

interface CompatibilityReport {
  compatible: boolean;
  breakingChanges: BreakingChange[];
  migrationRequired: boolean;
  migrationPatterns: MigrationPattern[];
}

interface BreakingChange {
  type: "type_change" | "interface_change" | "export_removal";
  location: string;
  description: string;
  affectedCode: string[];
  migrationPattern: MigrationPattern;
}
```

### Progress Tracker

```typescript
interface ProgressTracker {
  // Record progress for a phase
  recordPhaseProgress(phase: FixPhase, result: BatchResult): void;
  
  // Get current remediation status
  getStatus(): RemediationStatus;
  
  // Generate progress report
  generateReport(): ProgressReport;
}

interface RemediationStatus {
  currentPhase: FixPhase;
  totalErrors: number;
  errorsFixed: number;
  errorsRemaining: number;
  phaseProgress: Map<FixPhase, PhaseStatus>;
}

interface PhaseStatus {
  phase: FixPhase;
  status: "not_started" | "in_progress" | "completed" | "failed";
  errorsAtStart: number;
  errorsFixed: number;
  errorsRemaining: number;
  batchesCompleted: number;
  batchesTotal: number;
}

interface ProgressReport {
  summary: RemediationStatus;
  phaseDetails: PhaseStatus[];
  errorsByCategory: Map<ErrorCategory, number>;
  filesModified: string[];
  timestamp: Date;
}
```

## Data Models

### FSD Structure Discovery

```typescript
// FSD layer structure
interface FSDStructure {
  app: {
    // Application initialization and providers
    providers: string[];
    shell: string[];
  };
  
  features: {
    // Feature slices
    [featureName: string]: {
      ui: string[];      // React components
      model: string[];   // State management, business logic
      api: string[];     // API integration
      lib: string[];     // Feature-specific utilities
      config: string[];  // Feature configuration
    };
  };
  
  core: {
    // Core infrastructure
    [coreName: string]: string[];
  };
  
  lib: {
    // Shared libraries
    components: string[];
    hooks: string[];
    utils: string[];
    types: string[];
    config: string[];
    services: string[];
  };
  
  shared: {
    // Workspace-level shared code
    types: string[];
    utils: string[];
    constants: string[];
  };
}

// Module relocation examples based on FSD
const COMMON_RELOCATIONS: Record<string, FSDLocation> = {
  '@client/config/gestures': {
    path: 'client/src/lib/config/gestures.ts',
    layer: 'lib',
    segment: 'config'
  },
  '@client/config/navigation': {
    path: 'client/src/core/navigation/config.ts',
    layer: 'core',
    segment: 'navigation'
  },
  '@client/hooks': {
    path: 'client/src/lib/hooks/index.ts',
    layer: 'lib',
    segment: 'hooks'
  },
  '@client/services/*': {
    path: 'client/src/lib/services/*',
    layer: 'lib',
    segment: 'services'
  },
  '@client/utils/security': {
    path: 'client/src/core/security/index.ts',
    layer: 'core',
    segment: 'security'
  }
};
```

### Type Consolidation

```typescript
// Types that were fragmented during migration need consolidation

// Example: Dashboard preferences
// OLD (fragmented):
//   - client/src/features/dashboard/types.ts: DashboardPreferences
//   - client/src/core/dashboard/types.ts: UserDashboardPreferences
// NEW (consolidated):
//   - shared/types/dashboard/index.ts: DashboardPreferences

interface TypeConsolidation {
  // Canonical location (where type should live)
  canonical: {
    path: string;
    name: string;
    definition: string;
  };
  
  // Duplicate/fragmented definitions to remove
  duplicates: Array<{
    path: string;
    name: string;
    shouldRemove: boolean;
  }>;
  
  // All files importing this type
  importers: Array<{
    file: string;
    currentImport: string;
    newImport: string;
  }>;
}

// Common type consolidations
const TYPE_CONSOLIDATIONS: TypeConsolidation[] = [
  {
    canonical: {
      path: 'shared/types/dashboard/index.ts',
      name: 'DashboardPreferences',
      definition: '...'
    },
    duplicates: [
      {
        path: 'client/src/features/dashboard/types.ts',
        name: 'DashboardPreferences',
        shouldRemove: true
      },
      {
        path: 'client/src/core/dashboard/types.ts',
        name: 'UserDashboardPreferences',
        shouldRemove: true
      }
    ],
    importers: [/* ... */]
  },
  // ... more consolidations
];
```

### Type Standardization

```typescript
// Standardized ID type (decision: use string throughout)
type EntityId = string;

// Standardized pagination interface
interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Standardized HTTP status code type
type HttpStatusCode = number; // Use number type, not enum

// Consolidated dashboard preferences interface
interface DashboardPreferences {
  // Consolidate DashboardPreferences and UserDashboardPreferences
  userId: EntityId;
  theme: string;
  layout: string;
  widgets: WidgetConfig[];
}
```

### Interface Completions

```typescript
// Complete DashboardConfig interface
interface DashboardConfig {
  // Existing properties
  refreshInterval: number;
  
  // Missing properties to add
  maxActionItems: number;
  maxTrackedTopics: number;
  showCompletedActions: boolean;
  defaultView: "grid" | "list";
}

// Complete TimeoutAwareLoaderProps interface
interface TimeoutAwareLoaderProps {
  // Existing properties
  isLoading: boolean;
  timeout?: number;
  
  // Missing properties to add
  size?: "small" | "medium" | "large";
  showMessage?: boolean;
  showTimeoutWarning?: boolean;
  timeoutMessage?: string;
}

// Complete DashboardStackProps interface
interface DashboardStackProps {
  // Add all missing properties based on usage analysis
  initialRoute?: string;
  navigation?: NavigationProp;
  // ... other properties
}

// Complete DashboardTabsProps interface
interface DashboardTabsProps {
  // Add all missing properties based on usage analysis
  tabs: TabDefinition[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  // ... other properties
}

// Standardized error constructor options
interface ErrorOptions {
  cause?: Error;
  zodError?: ZodError;
  config?: unknown;
  retryCount?: number;
}
```

### Migration Patterns

```typescript
interface MigrationPattern {
  name: string;
  description: string;
  before: string; // Code example before migration
  after: string;  // Code example after migration
  automated: boolean; // Can be automated or requires manual intervention
}

// Example: ID type migration
const ID_TYPE_MIGRATION: MigrationPattern = {
  name: "ID Type Standardization",
  description: "Convert number IDs to string IDs",
  before: `
    interface Bill {
      id: number;
    }
    const billId: number = 123;
  `,
  after: `
    interface Bill {
      id: string;
    }
    const billId: string = "123";
  `,
  automated: true
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Module Location Discovery Accuracy

*For any* missing module import error (TS2307), when the Error_Remediation_System searches the FSD structure for the relocated module, it should find the module if it exists anywhere in the codebase with at least 80% name similarity.

**Validates: Requirements 1.1-1.7**

### Property 2: Import Path Update Completeness

*For any* module that has been relocated, when the Error_Remediation_System updates import paths, it should update all imports of that module across the entire codebase, leaving zero references to the old path.

**Validates: Requirements 2.1-2.5**

### Property 3: Type Consolidation Correctness

*For any* set of duplicate type definitions with the same semantic meaning, when the Error_Remediation_System consolidates them, it should choose the most complete definition as canonical and update all imports to reference the canonical location.

**Validates: Requirements 3.1, 13.1-13.3**

### Property 4: ID Type Analysis Consistency

*For any* TypeScript codebase with entity IDs, when the Error_Remediation_System analyzes ID usage patterns, it should identify the most frequently used type (string or number) and designate it as the canonical ID_Type with at least 60% usage frequency.

**Validates: Requirements 3.1**

### Property 5: Migration Pattern Completeness

*For any* breaking type change identified during remediation, the Error_Remediation_System should generate a Migration_Pattern that includes before/after code examples, description, and automation feasibility flag.

**Validates: Requirements 3.5, 18.1**

*For any* function parameter in the codebase that lacks an explicit type annotation and causes a TS7006 or TS7053 error, the Error_Remediation_System should add an appropriate type annotation based on usage context.

**Validates: Requirements 6.3**

### Property 6: Type Annotation Completeness

*For any* type comparison that produces a TS2367 error (comparing incompatible types), the Error_Remediation_System should convert one operand to match the other's type, preserving the comparison's semantic meaning.

**Validates: Requirements 7.1**

### Property 7: Type Comparison Compatibility

*For any* TypeScript file, when the Error_Remediation_System analyzes imports, it should correctly identify all unused imports (imported but never referenced) and all incorrect import paths (paths that don't resolve).

**Validates: Requirements 15.1, 15.2**

### Property 8: Import Analysis Accuracy

*For any* location where a type assertion is proposed, the Error_Remediation_System should verify the assertion is safe by checking that the runtime type can actually be the asserted type, and necessary by confirming no better typing solution exists.

**Validates: Requirements 16.1**

### Property 9: Type Assertion Safety Verification

*For any* batch of related fixes, if validation fails after applying the batch, the Error_Remediation_System should roll back all changes in that batch, returning the codebase to its pre-batch state.

**Validates: Requirements 19.3**

### Property 10: Batch Atomicity

*For any* phase of remediation, the total TypeScript error count should never increase after applying fixes (errors fixed >= new errors introduced), ensuring forward progress.

**Validates: Requirements 20.2, 21.4**

### Property 11: Error Count Monotonicity

### Error Detection Strategy

The system uses TypeScript's compiler API to detect errors:

```typescript
interface ErrorDetectionStrategy {
  // Use TypeScript compiler API
  detectErrors(files: string[]): Promise<TypeScriptError[]>;
  
  // Parse compiler diagnostics
  parseDiagnostics(diagnostics: ts.Diagnostic[]): TypeScriptError[];
  
  // Categorize errors by type
  categorizeByErrorCode(errors: TypeScriptError[]): Map<string, TypeScriptError[]>;
}
```

### Error Recovery

When fixes introduce new errors:

1. **Immediate Detection**: Run type checking after each batch
2. **Rollback**: Revert the batch that caused new errors
3. **Analysis**: Analyze why the fix caused new errors
4. **Refinement**: Refine the fix strategy
5. **Retry**: Apply refined fix

```typescript
interface ErrorRecoveryStrategy {
  detectNewErrors(before: ErrorReport, after: ErrorReport): TypeScriptError[];
  rollbackBatch(batchId: string): Promise<void>;
  analyzeFailure(batch: FixBatch, newErrors: TypeScriptError[]): FailureAnalysis;
  refineFix(fix: Fix, analysis: FailureAnalysis): Fix;
}
```

### Validation Failures

When validation fails:

1. **Report**: Log which fixes caused failures
2. **Isolate**: Identify the specific fix that caused the issue
3. **Skip**: Mark the fix as requiring manual intervention
4. **Continue**: Proceed with remaining fixes
5. **Document**: Add to manual remediation list

### Backward Compatibility Violations

When breaking changes are detected:

1. **Identify**: Detect all code affected by the breaking change
2. **Migrate**: Generate migration pattern
3. **Document**: Create migration guide
4. **Deprecate**: Add deprecation warnings if supporting both old and new
5. **Notify**: Report breaking changes to user

## Testing Strategy

### Dual Testing Approach

The remediation system requires both unit tests and property-based tests:

**Unit Tests** focus on:
- Specific error scenarios (e.g., "TS2307 for @client/config/gestures")
- Module creation logic
- Export addition logic
- Interface completion logic
- Integration between components
- Edge cases (e.g., circular dependencies, conflicting fixes)

**Property-Based Tests** focus on:
- Universal properties across all error types
- Fix generation correctness
- Validation consistency
- Rollback completeness
- Error count monotonicity

### Property-Based Testing Configuration

We'll use **fast-check** for TypeScript property-based testing:

```typescript
import fc from 'fast-check';

// Example property test
describe('Property 1: ID Type Analysis Consistency', () => {
  it('should identify canonical ID type with 60%+ usage', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          file: fc.string(),
          idType: fc.constantFrom('string', 'number'),
          occurrences: fc.integer({ min: 1, max: 100 })
        }), { minLength: 10 }),
        (idUsages) => {
          const analyzer = new ErrorAnalyzer();
          const result = analyzer.analyzeIdTypes(idUsages);
          
          // Calculate actual frequency
          const totalOccurrences = idUsages.reduce((sum, u) => sum + u.occurrences, 0);
          const stringOccurrences = idUsages
            .filter(u => u.idType === 'string')
            .reduce((sum, u) => sum + u.occurrences, 0);
          const numberOccurrences = totalOccurrences - stringOccurrences;
          
          const stringFreq = stringOccurrences / totalOccurrences;
          const numberFreq = numberOccurrences / totalOccurrences;
          
          // Verify canonical type matches most frequent
          if (stringFreq >= 0.6) {
            expect(result.canonicalType).toBe('string');
          } else if (numberFreq >= 0.6) {
            expect(result.canonicalType).toBe('number');
          }
          // If neither reaches 60%, no canonical type should be chosen
          else {
            expect(result.canonicalType).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Tag: Feature: client-error-remediation, Property 1: ID Type Analysis Consistency
});
```

Each property test must:
- Run minimum 100 iterations
- Reference its design document property in a comment tag
- Use the format: `Feature: {feature_name}, Property {number}: {property_text}`

### Unit Test Examples

```typescript
describe('Module Location Discovery', () => {
  it('should discover relocated gestures config in FSD structure', async () => {
    const analyzer = new ErrorAnalyzer();
    const error: TypeScriptError = {
      code: 'TS2307',
      message: "Cannot find module '@client/config/gestures'",
      file: 'client/src/lib/hooks/mobile/usePullToRefresh.ts',
      line: 34,
      column: 1,
      severity: Severity.CRITICAL,
      category: ErrorCategory.MODULE_RESOLUTION
    };
    
    const relocations = await analyzer.discoverModuleRelocations(['@client/config/gestures']);
    
    expect(relocations.relocations.has('@client/config/gestures')).toBe(true);
    const location = relocations.relocations.get('@client/config/gestures');
    expect(location?.layer).toBe('lib');
    expect(location?.segment).toBe('config');
    expect(location?.path).toContain('client/src/lib/config');
  });
  
  it('should update all imports after discovering relocation', async () => {
    const generator = new FixGenerator();
    const relocations: ModuleRelocationMap = {
      relocations: new Map([
        ['@client/config/gestures', {
          path: 'client/src/lib/config/gestures.ts',
          layer: 'lib',
          segment: 'config'
        }]
      ]),
      deletedModules: [],
      consolidations: new Map()
    };
    
    const fixes = generator.generateImportPathUpdateFixes(relocations, []);
    const result = await fixes[0].apply();
    
    expect(result.success).toBe(true);
    
    // Verify old import path no longer exists in codebase
    const oldImportCount = await countImports('@client/config/gestures');
    expect(oldImportCount).toBe(0);
    
    // Verify new import path is used
    const newImportCount = await countImports('client/src/lib/config/gestures');
    expect(newImportCount).toBeGreaterThan(0);
  });
});

describe('Type Consolidation', () => {
  it('should consolidate DashboardPreferences and UserDashboardPreferences', async () => {
    const generator = new FixGenerator();
    const duplicates = new Map([
      ['DashboardPreferences', [
        'client/src/features/dashboard/types.ts',
        'client/src/core/dashboard/types.ts'
      ]]
    ]);
    
    const fixes = generator.generateTypeConsolidationFixes(duplicates);
    expect(fixes).toHaveLength(1);
    
    const fix = fixes[0] as TypeConsolidationFix;
    expect(fix.canonicalPath).toBe('shared/types/dashboard/index.ts');
    expect(fix.duplicates.length).toBe(2);
    
    const result = await fix.apply();
    expect(result.success).toBe(true);
    
    // Verify duplicates are removed
    expect(fs.existsSync('client/src/features/dashboard/types.ts')).toBe(false);
    
    // Verify all imports updated to canonical location
    const imports = await findAllImports('DashboardPreferences');
    imports.forEach(imp => {
      expect(imp.path).toBe('shared/types/dashboard');
    });
  });
});
```

### Integration Testing

Integration tests verify the end-to-end remediation workflow:

```typescript
describe('End-to-End Remediation', () => {
  it('should complete all phases and eliminate all errors', async () => {
    const system = new ErrorRemediationSystem();
    
    // Phase 1: Module Location Discovery
    await system.executePhase(FixPhase.MODULE_LOCATION_DISCOVERY);
    const relocations = system.getDiscoveredRelocations();
    expect(relocations.relocations.size).toBeGreaterThan(0);
    
    // Phase 2: Import Path Updates
    await system.executePhase(FixPhase.IMPORT_PATH_UPDATES);
    const phase2Errors = await system.validator.validateTypeScript();
    expect(phase2Errors.errors.filter(e => e.code === 'TS2307')).toHaveLength(0);
    
    // Phase 3: Type Standardization
    await system.executePhase(FixPhase.TYPE_STANDARDIZATION);
    const phase3Errors = await system.validator.validateTypeScript();
    expect(phase3Errors.errorCount).toBeLessThan(phase2Errors.errorCount);
    
    // ... continue for all phases
    
    // Final validation
    const finalErrors = await system.validator.validateTypeScript();
    expect(finalErrors.errorCount).toBe(0);
  });
  
  it('should not create any new modules or compatibility layers', async () => {
    const system = new ErrorRemediationSystem();
    const filesBefore = await getAllTypeScriptFiles();
    
    await system.executeAllPhases();
    
    const filesAfter = await getAllTypeScriptFiles();
    const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
    
    // Only test files and documentation should be new
    newFiles.forEach(file => {
      expect(
        file.includes('.test.') || 
        file.includes('.spec.') || 
        file.endsWith('.md')
      ).toBe(true);
    });
  });
  
  it('should consolidate duplicate types to canonical locations', async () => {
    const system = new ErrorRemediationSystem();
    
    await system.executeAllPhases();
    
    // Verify no duplicate type definitions remain
    const duplicates = await findDuplicateTypes();
    expect(duplicates.size).toBe(0);
    
    // Verify all types are in optimal FSD locations
    const types = await getAllTypeDefinitions();
    types.forEach(type => {
      expect(isOptimalFSDLocation(type.path)).toBe(true);
    });
  });
});
```

### Test Coverage Requirements

- **Unit Test Coverage**: Minimum 80% code coverage for all remediation components
- **Property Test Coverage**: All 8 correctness properties must have property-based tests
- **Integration Test Coverage**: All 6 phases must have integration tests
- **Error Scenario Coverage**: All 16 error categories must have test cases

### Validation Strategy

After each phase:
1. Run TypeScript compiler (`tsc --noEmit`)
2. Parse compiler output for errors
3. Compare error count with previous phase
4. Verify error count decreased or stayed same
5. Check for new error types introduced
6. Generate phase completion report

Final validation:
1. Run full TypeScript compilation
2. Verify zero errors
3. Run existing test suite to check for regressions
4. Generate final remediation report
5. Document any manual fixes required

## Implementation Notes

### Tooling

- **TypeScript Compiler API**: For error detection and validation
- **ts-morph**: For AST manipulation and code generation
- **fast-check**: For property-based testing
- **vitest**: For unit and integration testing

### File Organization

```
scripts/
  error-remediation/
    analyzer.ts          # Error analysis logic
    fix-generator.ts     # Fix generation logic
    batch-processor.ts   # Batch processing logic
    validator.ts         # Type validation logic
    progress-tracker.ts  # Progress tracking logic
    compatibility.ts     # Backward compatibility checking
    index.ts            # Main orchestration
    
  error-remediation/__tests__/
    analyzer.test.ts
    fix-generator.test.ts
    batch-processor.test.ts
    validator.test.ts
    properties.test.ts   # Property-based tests
    integration.test.ts  # Integration tests
```

### Execution

```bash
# Run error analysis
npm run remediate:analyze

# Execute specific phase
npm run remediate:phase -- --phase=1

# Execute all phases
npm run remediate:all

# Generate report
npm run remediate:report
```

### Configuration

```typescript
// remediation.config.ts
export const remediationConfig = {
  // Phases to execute
  phases: [
    FixPhase.MODULE_LOCATION_DISCOVERY,
    FixPhase.IMPORT_PATH_UPDATES,
    FixPhase.TYPE_STANDARDIZATION,
    FixPhase.INTERFACE_COMPLETION,
    FixPhase.TYPE_SAFETY,
    FixPhase.IMPORT_CLEANUP_AND_VALIDATION
  ],
  
  // FSD structure paths
  fsdLayers: {
    app: 'client/src/app',
    features: 'client/src/features',
    core: 'client/src/core',
    lib: 'client/src/lib',
    shared: 'shared'
  },
  
  // Module discovery settings
  moduleDiscovery: {
    // Minimum similarity score for module matching (0-1)
    similarityThreshold: 0.8,
    
    // Search depth in directory tree
    maxDepth: 5,
    
    // File extensions to consider
    extensions: ['.ts', '.tsx']
  },
  
  // Type consolidation settings
  typeConsolidation: {
    // Prefer types from these locations (in order)
    preferredLocations: [
      'shared/types',
      'client/src/lib/types',
      'client/src/core'
    ],
    
    // Minimum number of duplicates to trigger consolidation
    minDuplicates: 2
  },
  
  // Batch size for processing
  batchSize: 10,
  
  // Validation after each batch
  validateAfterBatch: true,
  
  // Rollback on validation failure
  rollbackOnFailure: true,
  
  // ID type preference (null = auto-detect)
  idTypePreference: null as 'string' | 'number' | null,
  
  // Files to exclude from remediation
  excludeFiles: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
    '**/.cleanup-backup/**',
    '**/.design-system-backup/**',
    '**/archive/**'
  ]
};
```

### Manual Intervention Required

Some fixes may require manual intervention:

1. **Ambiguous module locations**: When multiple potential locations exist in FSD structure
2. **Complex type consolidations**: When duplicate types have subtle semantic differences
3. **Breaking changes**: When type consolidation requires API changes
4. **Business logic dependencies**: When fixes require understanding feature requirements
5. **Incomplete FSD migrations**: When features are partially migrated and need completion

These will be documented in a `MANUAL_FIXES.md` file with:
- Location (file, line)
- Error description
- Potential FSD locations
- Suggested fix
- Reason manual intervention is needed
- Migration completion steps

## Error Handling
