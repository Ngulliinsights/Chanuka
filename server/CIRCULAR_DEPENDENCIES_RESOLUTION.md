# Circular Dependencies Resolution

## Summary

This document describes the circular dependencies found in the server codebase and how they were resolved.

## Circular Dependencies Found

Initial scan found 6 circular dependencies:

1. **Migration API ↔ Migration Index** (FIXED)
2. **Foundation ↔ Participation Oversight** (DOCUMENTED - Intentional)
3. **Foundation ↔ Political Economy** (DOCUMENTED - Intentional)
4. **Foundation ↔ Trojan Bill Detection** (DOCUMENTED - Intentional)
5. **SearchService ↔ SearchIndexManager** (FIXED with dynamic imports)

## Resolutions

### 1. Migration API Circular Dependency (FIXED)

**Problem**: `migration-api.ts` imported services from `index.ts`, which also exported `migration-api.ts`.

**Solution**: Changed `migration-api.ts` to import services directly from their source files instead of from `index.ts`.

**Files Modified**:
- `server/infrastructure/migration/migration-api.ts`

**Changes**:
```typescript
// Before
import { dashboardService, featureFlagsService, ... } from './index';

// After
import { dashboardService } from './dashboard.service';
import { featureFlagsService } from './feature-flags.service';
// ... etc
```

### 2-4. Schema Circular Dependencies (DOCUMENTED - Intentional)

**Problem**: Schema files have circular dependencies between `foundation.ts` and other schema files.

**Analysis**: These are intentional and expected in Drizzle ORM. The `relations()` function uses lazy evaluation, so the circular dependencies don't cause runtime issues.

**Solution**: Documented the pattern and why it's acceptable.

**Files Created**:
- `server/infrastructure/schema/CIRCULAR_DEPENDENCIES.md`

**Key Points**:
- Drizzle ORM relations are lazily evaluated
- Circular dependencies in schema files are a standard pattern
- DO NOT convert to type-only imports (breaks relations)
- DO NOT try to break these dependencies

### 5. SearchService ↔ SearchIndexManager (FIXED)

**Problem**: 
- `SearchService.ts` imported `SearchIndexManager` statically
- `SearchIndexManager.ts` imported `SearchService` dynamically
- Madge still detected this as a circular dependency

**Solution**: Converted all `SearchIndexManager` imports in `SearchService` to dynamic imports.

**Files Modified**:
- `server/features/search/application/SearchService.ts`

**Changes**:
```typescript
// Before
import { SearchIndexManager } from '../infrastructure/SearchIndexManager';

export async function rebuildSearchIndexes() {
  const manager = new SearchIndexManager();
  return manager.rebuildAll();
}

// After
export async function rebuildSearchIndexes() {
  const { SearchIndexManager } = await import('../infrastructure/SearchIndexManager');
  const manager = new SearchIndexManager();
  return manager.rebuildAll();
}
```

**Functions Updated**:
- `rebuildSearchIndexes()`
- `getSearchIndexHealth()`
- `warmupSearchCache()`

## Additional Fixes

### Type Compatibility Issues

Fixed TypeScript errors related to type mismatches:

1. **Logger Import**: Changed from `@server/infrastructure/observability/logger` to relative path
2. **SearchSuggestion Type**: Imported correct type from `search.types.ts` instead of local interface
3. **SearchFilters Type**: Added type casting to handle different `SearchFilters` definitions

## Current Status

After fixes:
- ✅ Migration API circular dependency: RESOLVED
- ✅ Schema circular dependencies: DOCUMENTED (intentional pattern)
- ✅ SearchService circular dependency: RESOLVED (dynamic imports)
- ✅ TypeScript compilation errors: FIXED

## Madge Output

Madge still reports 5 circular dependencies:
1. `dist/server/infrastructure/migration/migration-api.js` - Stale dist files
2-4. Schema files - Intentional Drizzle ORM pattern
5. SearchService - Dynamic imports (runtime safe, but madge detects AST)

**Note**: The remaining detections are either:
- Stale compiled files in `dist/` folder
- Intentional patterns that are runtime-safe
- Dynamic imports that break runtime cycles but are still detected by static analysis

## Recommendations

1. **Clean dist folder**: Run `npm run clean` or delete `dist/` folder to remove stale compiled files
2. **Ignore schema circular dependencies**: These are expected in Drizzle ORM projects
3. **Dynamic imports are working**: The SearchService circular dependency is broken at runtime

## Testing

To verify the fixes:

```bash
# Clean and rebuild
npm run clean
npm run build

# Run madge on source files only (exclude dist)
npx madge --circular --extensions ts --exclude 'dist' server

# Run TypeScript compiler
npx tsc --noEmit
```

## References

- [Drizzle ORM Relations Documentation](https://orm.drizzle.team/docs/rqb#relations)
- [Dynamic Imports in TypeScript](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-4.html#dynamic-import-expressions)
