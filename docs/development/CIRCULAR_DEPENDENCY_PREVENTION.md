# Circular Dependency Prevention Guide

## Overview

This document explains how circular dependencies are prevented in the Chanuka Platform codebase and provides guidelines for developers.

## What Are Circular Dependencies?

Circular dependencies occur when Module A imports from Module B, and Module B imports from Module A (directly or indirectly). This can cause:

- Module initialization issues
- Undefined values at runtime
- Build failures
- Hard-to-debug errors

## Automated Detection

### Pre-Commit Hook

A pre-commit hook automatically checks for circular dependencies before each commit:

```bash
# Runs automatically on git commit
npm run analyze:circular:check
```

### Manual Check

You can manually check for circular dependencies at any time:

```bash
# Check for circular dependencies
npm run analyze:circular

# Check and fail if any found
npm run analyze:circular:check
```

### CI/CD Integration

Circular dependency checks are integrated into the CI/CD pipeline and will fail builds if circular dependencies are detected.

## Intentional Circular Dependencies

### Drizzle ORM Schema Files

The schema files in `server/infrastructure/schema/` have intentional circular dependencies that are safe:

- `foundation.ts` ↔ `participation_oversight.ts`
- `foundation.ts` ↔ `political_economy.ts`
- `foundation.ts` ↔ `trojan_bill_detection.ts`

**Why these are safe:**
- Drizzle ORM uses lazy evaluation for relations
- The `relations()` function doesn't execute until runtime
- All modules are loaded before relations are resolved

**Documentation:** See `server/infrastructure/schema/CIRCULAR_DEPENDENCIES.md`

**Important:** These are excluded from circular dependency checks.

## Common Patterns That Cause Circular Dependencies

### 1. Barrel Exports (index.ts files)

**Problem:**
```typescript
// index.ts
export * from './module-a';
export * from './module-b';

// module-a.ts
import { something } from './index'; // ❌ Circular!
```

**Solution:**
```typescript
// module-a.ts
import { something } from './module-b'; // ✅ Direct import
```

### 2. Script Files Importing from Main Module

**Problem:**
```typescript
// index.ts
export * from './scripts/setup';

// scripts/setup.ts
import { mainFunction } from './index'; // ❌ Circular!
```

**Solution:**
```typescript
// index.ts
// Don't export scripts - they should be standalone

// scripts/setup.ts
import { mainFunction } from '../main-module'; // ✅ Direct import
```

### 3. Mutual Imports Between Modules

**Problem:**
```typescript
// module-a.ts
import { funcB } from './module-b';

// module-b.ts
import { funcA } from './module-a'; // ❌ Circular!
```

**Solution:**
```typescript
// Extract shared code to a third module
// shared.ts
export const sharedLogic = () => { /* ... */ };

// module-a.ts
import { sharedLogic } from './shared';

// module-b.ts
import { sharedLogic } from './shared'; // ✅ No circular dependency
```

## Best Practices

### 1. Use Direct Imports

Always import directly from the source file, not from barrel exports:

```typescript
// ❌ Bad
import { something } from '@client/infrastructure/api';

// ✅ Good
import { something } from '@client/infrastructure/api/specific-module';
```

### 2. Extract Shared Code

If two modules need each other's code, extract the shared logic to a third module:

```typescript
// types.ts - Shared types
export interface SharedType { /* ... */ }

// module-a.ts
import type { SharedType } from './types';

// module-b.ts
import type { SharedType } from './types';
```

### 3. Use Dynamic Imports for Optional Dependencies

For optional or lazy-loaded dependencies, use dynamic imports:

```typescript
// Instead of:
import { heavyModule } from './heavy-module'; // ❌ May cause circular dependency

// Use:
const loadHeavyModule = async () => {
  const { heavyModule } = await import('./heavy-module'); // ✅ Breaks circular dependency
  return heavyModule;
};
```

### 4. Type-Only Imports

When you only need types, use type-only imports:

```typescript
// ✅ Type-only import doesn't create runtime dependency
import type { SomeType } from './module';
```

**Exception:** Don't use type-only imports in Drizzle schema files - they need actual table objects.

### 5. Avoid Exporting Scripts from Main Modules

Scripts and utilities should be standalone:

```typescript
// ❌ Bad - Exporting scripts from main module
// index.ts
export * from './scripts/setup';

// ✅ Good - Scripts are standalone
// Import scripts directly when needed
import { setupScript } from '@client/infrastructure/auth/scripts/setup';
```

## Fixing Circular Dependencies

If you encounter a circular dependency:

1. **Identify the cycle:**
   ```bash
   npm run analyze:circular
   ```

2. **Choose a fix strategy:**
   - Extract shared code to a new module
   - Use direct imports instead of barrel exports
   - Use dynamic imports for optional dependencies
   - Restructure the code to remove the dependency

3. **Verify the fix:**
   ```bash
   npm run analyze:circular:check
   ```

4. **Document if intentional:**
   - If the circular dependency is intentional and safe (like Drizzle schemas)
   - Document it clearly
   - Add it to the exclusion list in the check script

## Configuration Files

### Madge Configuration

Circular dependency checks use Madge with these settings:

```bash
madge --circular --extensions ts,tsx --exclude 'dist|node_modules|.nx|server/infrastructure/schema' client/src server shared
```

### Dependency Cruiser Configuration

The `.dependency-cruiser.cjs` file contains rules for:
- Preventing circular dependencies
- Enforcing layer boundaries (client/server/shared)
- Preventing cross-layer imports

## Resources

- [Madge Documentation](https://github.com/pahen/madge)
- [Dependency Cruiser Documentation](https://github.com/sverweij/dependency-cruiser)
- [Drizzle ORM Relations](https://orm.drizzle.team/docs/rqb#relations)

## Questions?

If you're unsure whether a circular dependency is acceptable or how to fix one, please:

1. Check this documentation
2. Review existing patterns in the codebase
3. Ask in the team chat or create an issue

## Summary

- ✅ Circular dependencies are automatically detected
- ✅ Pre-commit hooks prevent committing circular dependencies
- ✅ Intentional patterns (Drizzle schemas) are documented and excluded
- ✅ Clear guidelines for prevention and fixing
- ✅ Automated checks in CI/CD pipeline
