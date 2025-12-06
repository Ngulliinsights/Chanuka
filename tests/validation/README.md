# System Validation Module

This directory contains validators and testing helpers for system-level checks:

- **Architecture validation** - Design patterns, service registration, type safety
- **Migration validation** - Security, error handling, backward compatibility  
- **Import validation** - Module availability checks
- **Test environment helpers** - Error simulation, cache clearing, environment info

## Files

### `validators.ts`
Provides three validator classes:

- **`ImportValidator`** - Validates critical module imports
- **`MigrationValidator`** - Validates migration from old→new architecture  
- **`ArchitectureValidator`** - Validates design patterns and architecture

### `test-environment-helpers.ts`
Provides utilities for testing:

- **`simulateError(type)`** - Simulate different error types
- **`clearAllCaches()`** - Clear browser storage and caches
- **`getTestEnvironment()`** - Get environment information
- **`TestEnvironmentHelpers`** - Class-based interface

### `index.ts`
Barrel export - imports all validators and helpers

## Usage

### CI/CD Validation

```typescript
import { MigrationValidator, ArchitectureValidator } from '@tests/validation';

// Run migration validation
const validator = new MigrationValidator();
const results = await validator.runValidation();
const summary = validator.getSummary();

if (!summary.results.every(r => r.passed)) {
  console.error('Migration validation failed');
  process.exit(1);
}

// Run architecture validation  
const archResult = await ArchitectureValidator.validate();
if (!archResult.isValid) {
  console.error('Architecture issues:', archResult.errors);
  process.exit(1);
}

// Get readable report
const report = await ArchitectureValidator.generateReport();
console.log(report);
```

### Test Environment Helpers

```typescript
import { 
  simulateError, 
  clearAllCaches, 
  getTestEnvironment 
} from '@tests/validation';

// Clean test state
await clearAllCaches();

// Get environment info
const env = getTestEnvironment();
console.log(`Testing on: ${env.platform}`);

// Test error handling
simulateError('javascript');  // Throws error for error boundary testing
simulateError('promise');     // Unhandled promise rejection
simulateError('network');     // Network error
simulateError('resource');    // Resource load error
```

## Integration

### Development
Auto-run import validator in development (`vitest.setup.ts`) to catch broken imports early.

### Pre-deployment
Run migration and architecture validators in CI/CD pipeline before deployment to catch issues early.

### Testing  
Use test environment helpers in error boundary tests and environment-specific tests.

## Migration Notes

Migrated from `client/src/utils/testing.ts` to consolidate testing infrastructure:

- ✅ All validators moved to `tests/validation/validators.ts`
- ✅ Test helpers moved to `tests/validation/test-environment-helpers.ts`
- ✅ Imports updated to use `require()` for Node.js compatibility
- ✅ Added safe logging (falls back to console if logger unavailable)
- ✅ Improved browser API checks (typeof guards)

Original file can be safely deleted: `client/src/utils/testing.ts`
