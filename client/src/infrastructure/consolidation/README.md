# Infrastructure Consolidation

This module provides utilities for planning and executing the consolidation of infrastructure modules from 31 to approximately 20 modules.

## Overview

The consolidation process involves:
1. Defining consolidation mappings (source → target modules)
2. Validating mappings for correctness and conflicts
3. Defining standard module structure requirements
4. Executing migrations to update import paths and code

## Key Components

### Types (`types.ts`)

Defines core data structures:
- `ConsolidationMapping`: Maps source modules to target modules
- `Migration`: Describes a migration step (import path, API signature, etc.)
- `BreakingChange`: Documents breaking changes and mitigation strategies
- `ConsolidationPlan`: Complete plan with all mappings

### Validation (`validation.ts`)

Provides validation functions:
- `validateMapping()`: Validates a single consolidation mapping
- `validateNoConflicts()`: Checks for conflicts between mappings
- `validatePlan()`: Validates the entire consolidation plan

### Mappings (`mappings.ts`)

Defines the actual consolidation mappings:
- `observabilityMapping`: Consolidates monitoring, performance, telemetry, analytics → observability
- `stateManagementMapping`: Consolidates dashboard, navigation, loading → store (with slices)
- `apiMapping`: Consolidates http, realtime, websocket → api
- `consolidationPlan`: Complete plan with all mappings

### Module Structure (`module-structure.ts`)

Defines standard module structure:
- `ModuleMetadata`: Metadata for a module (name, version, dependencies, exports, API)
- `ModuleStructure`: Physical structure (files and directories)
- `validateModuleStructure()`: Validates a module follows standard structure
- `createModuleReadmeTemplate()`: Generates README.md template
- `createModuleIndexTemplate()`: Generates index.ts template

### Interface Extraction (`interface-extraction.ts`)

Provides tools to break circular dependencies by extracting shared interfaces:
- `SharedInterface`: Represents an interface shared between modules
- `InterfaceExtractionStrategy`: Strategy for extracting interfaces to separate files
- `identifySharedInterfaces()`: Identifies interfaces shared between circular modules
- `generateInterfaceDefinitions()`: Generates TypeScript code for extracted interfaces
- `createInterfaceExtractionStrategy()`: Creates a complete extraction strategy
- `applyInterfaceExtraction()`: Applies the extraction strategy to the project

### Dependency Injection Container (`di-container.ts`)

Provides a DI container to manage service instantiation and eliminate circular dependencies:
- `IDIContainer`: Container interface for service registration and resolution
- `ServiceToken`: Token used to identify services
- `ServiceFactory`: Factory function that creates service instances
- `ServicePhase`: Three-phase initialization (CORE → FOUNDATION → BUSINESS)
- `DIContainer`: Container implementation with singleton/transient support
- `ServiceRegistry`: Registry that holds initialized services
- `initializeInThreePhases()`: Helper for three-phase initialization
- `validateNoCycles()`: Validates service definitions have no circular dependencies

### Consolidation Algorithm (`consolidation-algorithm.ts`)

Implements the core consolidation logic for merging, nesting, and refactoring modules:
- `consolidateModules()`: Main algorithm supporting MERGE, NEST, and REFACTOR strategies
- `createStandardModuleStructure()`: Creates standard module layout with required directories
- `mergeExports()`: Merges exports from multiple modules, handling naming conflicts
- `mergeTypes()`: Merges type definitions from multiple modules
- `mergeImplementations()`: Merges implementations from multiple modules
- `createSubModule()`: Creates sub-module structure for NEST strategy
- `extractCommonCode()`: Extracts common implementations for REFACTOR strategy
- `extractSpecificCode()`: Extracts module-specific code for REFACTOR strategy

### Migration Script Framework (`migration-script.ts`)

Provides automated import path migration using ts-morph:
- `findFilesImportingFrom()`: Finds all files importing from a specific module
- `extractImportInfo()`: Extracts import information including named imports and aliases
- `replaceImportPath()`: Replaces old import paths with new paths, preserving imports
- `createMigrationScript()`: Creates migration script with migrate, findAffectedFiles, and generateReport methods
- `updateImportPaths()`: Updates import paths across entire codebase
- `validateImports()`: Validates that all imports reference existing exports

### Rollback Mechanism (`rollback.ts`)

Provides backup and restore functionality for safe consolidation:
- `createBackup()`: Creates backup of current module state before consolidation
- `restoreBackup()`: Restores backup to original location
- `validateBuild()`: Validates that build passes after rollback
- `listBackups()`: Lists all available backups
- `deleteBackup()`: Deletes a specific backup
- `findLatestBackup()`: Finds most recent backup for an operation
- `rollbackConsolidation()`: Performs complete rollback of a consolidation operation

## Standard Module Structure

All infrastructure modules must follow this structure:

```
module-name/
├── index.ts              # Main export file (required)
├── types.ts              # Type definitions (recommended)
│   or types/             # Type definitions directory (alternative)
├── README.md             # Module documentation (required)
├── __tests__/            # Test files (recommended)
│   ├── module.test.ts
│   └── ...
└── sub-module/           # Optional sub-modules
    ├── index.ts
    ├── types.ts
    └── ...
```

## Usage Examples

### Validate a Consolidation Mapping

```typescript
import { validateMapping, observabilityMapping } from '@/infrastructure/consolidation';

const existingModules = ['monitoring', 'performance', 'telemetry', 'analytics'];
const result = validateMapping(observabilityMapping, existingModules);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Validate the Complete Plan

```typescript
import { validatePlan, consolidationPlan } from '@/infrastructure/consolidation';

const existingModules = [
  'monitoring', 'performance', 'telemetry', 'analytics',
  'store', 'dashboard', 'navigation', 'loading',
  'api', 'http', 'realtime', 'websocket',
  // ... other modules
];

const result = validatePlan(consolidationPlan, existingModules);

if (!result.valid) {
  console.error('Plan validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Plan validation warnings:', result.warnings);
}
```

### Validate Module Structure

```typescript
import { validateModuleStructure } from '@/infrastructure/consolidation';
import * as fs from 'fs';

const result = validateModuleStructure(
  'client/src/infrastructure/observability',
  fs
);

if (!result.valid) {
  console.error('Structure validation errors:', result.errors);
}

console.log('Module structure:', result.structure);
```

### Generate Module Documentation

```typescript
import { createModuleReadmeTemplate, ModuleMetadata, APIType } from '@/infrastructure/consolidation';

const metadata: ModuleMetadata = {
  name: 'observability',
  version: '1.0.0',
  dependencies: ['@/infrastructure/events'],
  exports: ['trackError', 'trackPerformance', 'trackEvent'],
  publicAPI: [
    {
      name: 'trackError',
      type: APIType.FUNCTION,
      signature: 'function trackError(error: Error, context: ErrorContext): void',
      description: 'Tracks an error with context',
      examples: [
        'trackError(new Error("Failed to load"), { component: "Dashboard" })'
      ],
    },
  ],
  documentation: 'Unified observability infrastructure for error tracking, performance monitoring, and analytics.',
};

const readme = createModuleReadmeTemplate(metadata);
console.log(readme);
```

### Extract Interfaces to Break Circular Dependencies

```typescript
import { Project } from 'ts-morph';
import { 
  identifySharedInterfaces, 
  createInterfaceExtractionStrategy,
  applyInterfaceExtraction 
} from '@/infrastructure/consolidation';

// Initialize ts-morph project
const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

// Identify circular modules
const circularModules = [
  'client/src/infrastructure/monitoring/index.ts',
  'client/src/infrastructure/error/index.ts',
];

// Find shared interfaces
const sharedInterfaces = identifySharedInterfaces(project, circularModules);
console.log('Found shared interfaces:', sharedInterfaces.map(i => i.name));

// Create extraction strategy
const strategy = createInterfaceExtractionStrategy(
  project,
  circularModules,
  'client/src/infrastructure/types/monitoring-interfaces.ts'
);

console.log('Extraction strategy:');
console.log('- Interfaces to extract:', strategy.interfaces.length);
console.log('- Affected modules:', strategy.affectedModules.length);
console.log('- Import updates:', strategy.importUpdates.length);

// Apply the extraction
applyInterfaceExtraction(project, strategy);
console.log('Interface extraction complete!');
```

### Use Dependency Injection Container

```typescript
import { 
  DIContainer, 
  createServiceToken, 
  createServiceFactory,
  ServicePhase,
  initializeInThreePhases 
} from '@/infrastructure/consolidation';

// Create container
const container = new DIContainer();

// Define service tokens
const EventBusToken = createServiceToken('EventBus');
const LoggerToken = createServiceToken('Logger');
const ErrorHandlerToken = createServiceToken('ErrorHandler');

// Create service factories with phases
const factories = new Map();

// Phase 1: Core services (no dependencies)
factories.set('EventBus', createServiceFactory(
  () => new EventBus(),
  { phase: ServicePhase.CORE }
));

// Phase 2: Foundation services (depend on core)
factories.set('Logger', createServiceFactory(
  (container) => {
    const eventBus = container.resolve(EventBusToken);
    return new Logger(eventBus);
  },
  { 
    dependencies: [EventBusToken],
    phase: ServicePhase.FOUNDATION 
  }
));

// Phase 3: Business services (depend on foundation)
factories.set('ErrorHandler', createServiceFactory(
  (container) => {
    const logger = container.resolve(LoggerToken);
    return new ErrorHandler(logger);
  },
  { 
    dependencies: [LoggerToken],
    phase: ServicePhase.BUSINESS 
  }
));

// Initialize in three phases
const registry = initializeInThreePhases(container, factories);

// Access services
const errorHandler = registry.get('ErrorHandler');
errorHandler.handleError(new Error('Test error'));
```

### Validate Service Dependencies

```typescript
import { 
  createServiceFactory, 
  createServiceToken,
  validateNoCycles 
} from '@/infrastructure/consolidation';

// Define service factories
const factories = new Map();

const ServiceAToken = createServiceToken('ServiceA');
const ServiceBToken = createServiceToken('ServiceB');

factories.set('ServiceA', createServiceFactory(
  (container) => {
    const serviceB = container.resolve(ServiceBToken);
    return new ServiceA(serviceB);
  },
  { dependencies: [ServiceBToken] }
));

factories.set('ServiceB', createServiceFactory(
  (container) => {
    const serviceA = container.resolve(ServiceAToken);
    return new ServiceB(serviceA);
  },
  { dependencies: [ServiceAToken] }
));

// Validate - this will throw CircularDependencyError
try {
  validateNoCycles(factories);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error('Circular dependency detected:', error.path);
  }
}
```

### Consolidate Modules

```typescript
import { 
  consolidateModules, 
  ConsolidationStrategy,
  Module 
} from '@/infrastructure/consolidation';

// Define source modules
const sourceModules: Module[] = [
  {
    name: 'monitoring',
    path: 'client/src/infrastructure/monitoring',
    exports: [
      { name: 'trackError', type: 'function', signature: 'trackError(error: Error): void', isDefault: false }
    ],
    types: [
      { name: 'ErrorContext', kind: 'interface', definition: 'interface ErrorContext { ... }' }
    ],
    implementations: [
      { name: 'trackError', kind: 'function', code: 'function trackError(error: Error) { ... }' }
    ],
  },
  {
    name: 'performance',
    path: 'client/src/infrastructure/performance',
    exports: [
      { name: 'trackMetric', type: 'function', signature: 'trackMetric(metric: Metric): void', isDefault: false }
    ],
    types: [],
    implementations: [
      { name: 'trackMetric', kind: 'function', code: 'function trackMetric(metric: Metric) { ... }' }
    ],
  },
];

// Consolidate using NEST strategy
const result = consolidateModules(
  sourceModules,
  'observability',
  ConsolidationStrategy.NEST,
  'client/src/infrastructure'
);

if (result.success) {
  console.log('Consolidation successful!');
  console.log('Target module:', result.module.name);
  console.log('Sub-modules:', result.module.subModules.map(sm => sm.name));
} else {
  console.error('Consolidation failed:', result.error);
}
```

### Migrate Import Paths

```typescript
import { 
  createMigrationScript,
  updateImportPaths 
} from '@/infrastructure/consolidation';

// Create migration script
const migrationScript = createMigrationScript({
  baseDir: 'client',
  includePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
  excludePatterns: ['**/*.test.ts', '**/node_modules/**'],
  autoSave: true,
});

// Generate report before migration
const report = migrationScript.generateReport(
  '@/infrastructure/monitoring',
  '@/infrastructure/observability/error-monitoring'
);

console.log('Migration report:');
console.log('- Affected files:', report.affectedFiles.length);
console.log('- Total imports:', report.totalImports);

// Execute migration
const result = await migrationScript.migrate(
  '@/infrastructure/monitoring',
  '@/infrastructure/observability/error-monitoring'
);

if (result.success) {
  console.log('Migration successful!');
  console.log('- Files modified:', result.filesModified);
  console.log('- Imports updated:', result.importsUpdated);
} else {
  console.error('Migration failed:', result.errors);
}

// Batch migration
const mappings = [
  { from: '@/infrastructure/monitoring', to: '@/infrastructure/observability/error-monitoring' },
  { from: '@/infrastructure/performance', to: '@/infrastructure/observability/performance' },
  { from: '@/infrastructure/telemetry', to: '@/infrastructure/observability/telemetry' },
];

const batchResult = await updateImportPaths(mappings, {
  baseDir: 'client',
  includePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
  excludePatterns: ['**/*.test.ts'],
  autoSave: true,
});

console.log('Batch migration complete:', batchResult);
```

### Backup and Rollback

```typescript
import { 
  createBackup,
  restoreBackup,
  rollbackConsolidation,
  listBackups,
  BackupMetadata 
} from '@/infrastructure/consolidation';

// Create backup before consolidation
const metadata: BackupMetadata = {
  operation: 'observability-consolidation',
  sourceModules: ['monitoring', 'performance', 'telemetry', 'analytics'],
  targetModule: 'observability',
  baseDir: 'client/src/infrastructure',
};

const backupResult = await createBackup(metadata);

if (backupResult.success) {
  console.log('Backup created:', backupResult.backup.id);
  console.log('Backup path:', backupResult.backup.backupPath);
  console.log('Files backed up:', backupResult.backup.files.length);
  
  // Perform consolidation...
  try {
    // ... consolidation code ...
    console.log('Consolidation successful!');
  } catch (error) {
    console.error('Consolidation failed, rolling back...');
    
    // Restore backup
    const restoreResult = await restoreBackup(backupResult.backup);
    
    if (restoreResult.success) {
      console.log('Rollback successful!');
      console.log('Files restored:', restoreResult.filesRestored);
      console.log('Build passed:', restoreResult.buildPassed);
    } else {
      console.error('Rollback failed:', restoreResult.error);
    }
  }
} else {
  console.error('Backup failed:', backupResult.error);
}

// List all backups
const backups = await listBackups();
console.log('Available backups:', backups.length);
for (const backup of backups) {
  console.log(`- ${backup.id} (${backup.timestamp}): ${backup.metadata.operation}`);
}

// Quick rollback by operation name
const rollbackResult = await rollbackConsolidation('observability-consolidation');
if (rollbackResult.success) {
  console.log('Rollback successful!');
} else {
  console.error('Rollback failed:', rollbackResult.error);
}
```

## Consolidation Mappings

### Observability Consolidation

**Source modules:** monitoring, performance, telemetry, analytics  
**Target module:** observability  
**Strategy:** NEST (create sub-modules)

**Migrations:**
- `@/infrastructure/monitoring` → `@/infrastructure/observability/error-monitoring`
- `@/infrastructure/performance` → `@/infrastructure/observability/performance`
- `@/infrastructure/telemetry` → `@/infrastructure/observability/telemetry`
- `@/infrastructure/analytics` → `@/infrastructure/observability/analytics`

### State Management Consolidation

**Source modules:** dashboard, navigation, loading  
**Target module:** store (existing)  
**Strategy:** REFACTOR (extract common code, create slices)

**Migrations:**
- `@/infrastructure/dashboard` → `@/infrastructure/store/slices/dashboard`
- `@/infrastructure/navigation` → `@/infrastructure/store/slices/navigation`
- `@/infrastructure/loading` → `@/infrastructure/store/slices/loading`

### API Consolidation

**Source modules:** http, realtime, websocket  
**Target module:** api (existing)  
**Strategy:** NEST (create sub-modules)

**Migrations:**
- `@/infrastructure/http` → `@/infrastructure/api/http`
- `@/infrastructure/realtime` → `@/infrastructure/api/realtime`
- `@/infrastructure/websocket` → `@/infrastructure/api/websocket`

## Timeline

The consolidation is planned for 10 weeks across 4 phases:
1. **Phase 1 (Weeks 1-2):** Infrastructure Analysis & Planning
2. **Phase 2 (Weeks 3-4):** Infrastructure Consolidation
3. **Phase 3 (Weeks 5-7):** Error Handling Integration
4. **Phase 4 (Weeks 8-10):** Validation Integration & Documentation

## Circular Dependency Resolution Strategies

The consolidation process includes two main strategies for resolving circular dependencies:

### 1. Interface Extraction

When two modules have circular dependencies because they reference each other's types:

**Problem:**
```typescript
// monitoring/index.ts
import { ErrorHandler } from '../error';
export interface Monitor { errorHandler: ErrorHandler; }

// error/index.ts
import { Monitor } from '../monitoring';
export interface ErrorHandler { monitor: Monitor; }
```

**Solution:** Extract shared interfaces to a separate file:
```typescript
// types/monitoring-interfaces.ts
export interface Monitor { errorHandler: ErrorHandler; }
export interface ErrorHandler { monitor: Monitor; }

// monitoring/index.ts
import type { Monitor, ErrorHandler } from '../types/monitoring-interfaces';
export class MonitorImpl implements Monitor { ... }

// error/index.ts
import type { Monitor, ErrorHandler } from '../types/monitoring-interfaces';
export class ErrorHandlerImpl implements ErrorHandler { ... }
```

**When to use:**
- Circular dependencies are primarily type-level (interfaces, types)
- Modules need to reference each other's types but not implementations
- The shared types form a cohesive contract

### 2. Dependency Injection

When modules have circular dependencies at the implementation level:

**Problem:**
```typescript
// logger/index.ts
import { ErrorHandler } from '../error';
export class Logger {
  constructor(private errorHandler: ErrorHandler) {}
}

// error/index.ts
import { Logger } from '../logger';
export class ErrorHandler {
  constructor(private logger: Logger) {}
}
```

**Solution:** Use dependency injection with three-phase initialization:
```typescript
// Phase 1: Core services (no dependencies)
const eventBus = new EventBus();
const storage = new Storage();

// Phase 2: Foundation services (depend on core)
const logger = new Logger(eventBus);
const cache = new Cache(storage);

// Phase 3: Business services (depend on foundation)
const errorHandler = new ErrorHandler(logger, eventBus);
const apiClient = new APIClient(cache, errorHandler);
```

**When to use:**
- Circular dependencies involve concrete implementations
- Services need to be initialized in a specific order
- You want to support testing with mock implementations
- You need singleton or transient lifecycle management

### Choosing the Right Strategy

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Type-only circular dependency | Interface Extraction | Simpler, no runtime overhead |
| Implementation circular dependency | Dependency Injection | Provides proper initialization order |
| Mixed type and implementation | Both | Extract types first, then use DI for implementations |
| Tight coupling between modules | Module Consolidation | Consider merging modules instead |

## Success Criteria

- Module count reduced from 31 to 18-22 modules
- Zero circular dependencies
- 100% public API coverage
- 100% modules follow standard structure
- Build time under 30 seconds
- Test coverage at or above 80%
