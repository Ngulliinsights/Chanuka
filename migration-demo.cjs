#!/usr/bin/env node

/**
 * MIGRATION DEMO - Demonstration of Type Migration Utilities
 *
 * This script demonstrates how to use the migration utilities to transform
 * legacy types to standardized types.
 */

// Import the migration utilities
const {
  analyzeTypeStructure,
  transformToStandardType,
  migrateBatch,
  createBackwardCompatibleWrapper,
  validateMigrationResult,
  MigrationTracker,
} = require('./shared/types/migration/migration-tools');

const {
  DeprecationRegistry,
  createDeprecatedTypeWrapper,
  wrapDeprecatedFunction,
} = require('./shared/types/migration/deprecation-warnings');

const {
  BaseEntityTransformer,
  FullAuditTransformer,
  LoadingOperationTransformer,
  TransformerRegistry,
} = require('./shared/types/migration/type-transformers');

const {
  BreakingChangesRegistry,
} = require('./shared/types/migration/breaking-changes');

const {
  ReplacementPatternsRegistry,
} = require('./shared/types/migration/replacement-patterns');

console.log('🚀 Type Migration Utilities Demo');
console.log('='.repeat(50));

// ============================================================================
// DEMO 1: Type Analysis
// ============================================================================

console.log('\n🔍 Demo 1: Type Structure Analysis\n');

const legacyLoadingOperation = {
  operationId: 'op1',
  operationType: 'api',
  startedAt: new Date(),
  status: 'loading',
  retryCount: 0,
  maxRetries: 3,
};

const standardLoadingOperationDefinition = {
  id: 'string',
  type: 'string',
  startTime: 'number',
  state: 'string',
  retryCount: 'number',
  maxRetries: 'number',
};

const analysis = analyzeTypeStructure(
  legacyLoadingOperation,
  standardLoadingOperationDefinition
);

console.log('Analysis Results:');
console.log(`- Type Name: ${analysis.typeName}`);
console.log(`- Is Standardized: ${analysis.isStandardized}`);
console.log(`- Missing Fields: ${analysis.missingFields.join(', ') || 'None'}`);
console.log(`- Extra Fields: ${analysis.extraFields.join(', ') || 'None'}`);
console.log(`- Recommendations: ${analysis.recommendations.join('; ') || 'None'}`);

// ============================================================================
// DEMO 2: Type Transformation
// ============================================================================

console.log('\n🔧 Demo 2: Type Transformation\n');

// Create a simple standard type constructor
class StandardLoadingOperation {
  constructor(data) {
    Object.assign(this, data);
  }
}

const fieldMapping = {
  operationId: 'id',
  operationType: 'type',
  startedAt: 'startTime',
  status: 'state',
};

const transformedOperation = transformToStandardType(
  legacyLoadingOperation,
  StandardLoadingOperation,
  fieldMapping,
  {
    preserveLegacyFields: false,
    addAuditFields: false,
    logWarnings: true,
  }
);

console.log('Transformed Operation:');
console.log(JSON.stringify(transformedOperation, null, 2));

// ============================================================================
// DEMO 3: Batch Migration
// ============================================================================

console.log('\n📦 Demo 3: Batch Migration\n');

const legacyOperations = [
  { operationId: 'op1', operationType: 'api', startedAt: new Date(), status: 'loading' },
  { operationId: 'op2', operationType: 'page', startedAt: new Date(), status: 'complete' },
  { operationId: 'op3', operationType: 'asset', startedAt: new Date(), status: 'error' },
];

async function demoBatchMigration() {
  const migrationFn = (item) => {
    return transformToStandardType(
      item,
      StandardLoadingOperation,
      fieldMapping
    );
  };

  const batchResult = await migrateBatch(legacyOperations, migrationFn, 2);

  console.log('Batch Migration Results:');
  console.log(`- Success Count: ${batchResult.successCount}`);
  console.log(`- Failure Count: ${batchResult.failureCount}`);
  console.log(`- Warnings: ${batchResult.warnings.join('; ') || 'None'}`);
  console.log(`- Migrated Items: ${batchResult.migratedItems.length}`);
}

demoBatchMigration().catch(console.error);

// ============================================================================
// DEMO 4: Deprecation Warnings
// ============================================================================

console.log('\n⚠️  Demo 4: Deprecation Warnings\n');

const deprecationRegistry = DeprecationRegistry.getInstance();

// Register a deprecation warning
deprecationRegistry.registerDeprecation({
  typeName: 'LegacyLoadingOperation',
  versionDeprecated: '2.0.0',
  versionRemoved: '3.0.0',
  replacementType: 'LoadingOperation',
  replacementImport: 'shared/types/loading',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'high',
  message: 'LegacyLoadingOperation has been replaced with standardized LoadingOperation',
});

// Emit the warning
deprecationRegistry.emitWarning('LegacyLoadingOperation');

// ============================================================================
// DEMO 5: Type Transformers
// ============================================================================

console.log('\n🔄 Demo 5: Type Transformers\n');

const transformerRegistry = TransformerRegistry.getInstance();

// Get available transformers
const availableTransformers = transformerRegistry.getAvailableTransformers();
console.log('Available Transformers:');
availableTransformers.forEach(transformer => {
  console.log(`- ${transformer.sourceType} → ${transformer.targetType}`);
});

// Use a specific transformer
const legacyEntity = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseEntityTransformer = new BaseEntityTransformer();
if (baseEntityTransformer.canTransform(legacyEntity)) {
  const baseEntity = baseEntityTransformer.transform(legacyEntity);
  console.log('\nTransformed BaseEntity:');
  console.log(JSON.stringify(baseEntity, null, 2));
}

// ============================================================================
// DEMO 6: Breaking Changes Analysis
// ============================================================================

console.log('\n💥 Demo 6: Breaking Changes Analysis\n');

const breakingChangesRegistry = BreakingChangesRegistry.getInstance();

// Get breaking changes for a specific type
const loadingOperationChanges = breakingChangesRegistry.getBreakingChangesForType('LoadingOperation');
console.log(`Breaking changes for LoadingOperation: ${loadingOperationChanges.length}`);
loadingOperationChanges.forEach(change => {
  console.log(`- ${change.changeId}: ${change.description}`);
});

// Generate migration guide
const migrationGuide = breakingChangesRegistry.generateMigrationGuide('LoadingOperation');
console.log('\nMigration Guide Preview (first 200 chars):');
console.log(migrationGuide.substring(0, 200) + '...');

// ============================================================================
// DEMO 7: Replacement Patterns
// ============================================================================

console.log('\n🔧 Demo 7: Replacement Patterns\n');

const replacementPatternsRegistry = ReplacementPatternsRegistry.getInstance();

// Get replacement pattern for a deprecated type
const pattern = replacementPatternsRegistry.getReplacementPattern('LegacyLoadingOperation');
if (pattern) {
  console.log(`Replacement Pattern: ${pattern.deprecatedType} → ${pattern.replacementType}`);
  console.log(`Import Path: ${pattern.importPath}`);
  console.log(`Migration Steps: ${pattern.migrationSteps.length}`);

  // Generate migration guide
  const guide = replacementPatternsRegistry.generateMigrationGuide('LegacyLoadingOperation');
  console.log('\nMigration Guide Preview (first 150 chars):');
  console.log(guide.substring(0, 150) + '...');
}

// ============================================================================
// DEMO 8: Migration Tracking
// ============================================================================

console.log('\n📊 Demo 8: Migration Tracking\n');

const tracker = new MigrationTracker(legacyOperations.length);
tracker.setBatchInfo(1, 1);

// Simulate migration progress
for (let i = 0; i < legacyOperations.length; i++) {
  if (i % 2 === 0) {
    tracker.recordSuccess();
  } else {
    tracker.recordFailure();
  }
}

tracker.complete();

const migrationState = tracker.getState();
console.log('Migration State:');
console.log(`- Total Items: ${migrationState.totalItems}`);
console.log(`- Processed Items: ${migrationState.processedItems}`);
console.log(`- Success Count: ${migrationState.successCount}`);
console.log(`- Failure Count: ${migrationState.failureCount}`);
console.log(`- Status: ${migrationState.status}`);
console.log(`- Progress: ${tracker.getProgress()}%`);

// ============================================================================
// DEMO SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log('🎉 Migration Utilities Demo Complete!');
console.log('\nAvailable Utilities:');
console.log('- Type Analysis and Transformation');
console.log('- Batch Migration Processing');
console.log('- Deprecation Warning Management');
console.log('- Type Transformers and Registry');
console.log('- Breaking Changes Analysis');
console.log('- Replacement Patterns and Guides');
console.log('- Migration Tracking and Progress');
console.log('\nFor more information, see:');
console.log('- BASE_TYPES_MIGRATION_GUIDE.md');
console.log('- shared/types/migration/*');
console.log('\n' + '='.repeat(50));

// ============================================================================
// EXPORT FOR PROGRAMMATIC USE
// ============================================================================

module.exports = {
  analyzeTypeStructure,
  transformToStandardType,
  migrateBatch,
  createBackwardCompatibleWrapper,
  validateMigrationResult,
  MigrationTracker,
  DeprecationRegistry,
  createDeprecatedTypeWrapper,
  wrapDeprecatedFunction,
  BaseEntityTransformer,
  FullAuditTransformer,
  LoadingOperationTransformer,
  TransformerRegistry,
  BreakingChangesRegistry,
  ReplacementPatternsRegistry,
};