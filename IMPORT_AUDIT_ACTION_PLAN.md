# Import/Export Audit - Action Plan

## Executive Summary

The comprehensive audit of 2,644 files with 3,829 imports reveals:

- ✅ **90.4% Valid** (3,462 imports) - Most imports are working correctly
- ❌ **8.5% Missing** (324 imports) - Files moved/deleted, causing import failures
- 🔗 **1.1% Adapters** (43 imports) - Re-export chains (acceptable)
- ⚠️ **0 Circular Dependencies** - Excellent! No cycles detected

## Critical Findings

### 1. Missing CSS Files (Design System)
**Impact:** Storybook and design system broken

| Missing File | Suggested Action |
|--------------|------------------|
| `client/src/lib/design-system/theme/light.css` | Create or restore from git history |
| `client/src/lib/design-system/theme/dark.css` | Create or restore from git history |
| `client/src/lib/design-system/theme/high-contrast.css` | Create or restore from git history |
| `client/src/styles/globals.css` | Verify location or update import path |
| `client/src/lib/design-system/styles/components/*.css` | Create missing component stylesheets |

**Fix:**
```bash
# Check git history for these files
git log --all --full-history -- "client/src/lib/design-system/theme/*.css"
git log --all --full-history -- "client/src/styles/globals.css"

# If deleted, restore them:
git checkout <commit-hash> -- client/src/lib/design-system/theme/light.css
```

---

### 2. Incorrect .js Extensions in Re-exports
**Impact:** 65+ files trying to import .js files that are actually .ts

**Pattern:**
```typescript
// ❌ WRONG (65 occurrences)
export * from './types.js';
export * from './service.js';

// ✅ CORRECT
export * from './types';
export * from './service';
```

**Files Affected:**
- `server/features/admin/moderation/index.ts` (6 imports)
- `server/features/advocacy/index.ts` (15 imports)
- `server/features/analytics/*/index.ts` (20+ imports)
- All feature barrel exports

**Automated Fix:**
```bash
# Remove .js extensions from TypeScript imports
find server/features -name "*.ts" -type f -exec sed -i "s/from '\(.*\)\.js'/from '\1'/g" {} +
find server/features -name "*.ts" -type f -exec sed -i 's/from "\(.*\)\.js"/from "\1"/g' {} +
```

---

### 3. Stale Path: database/types → core/StorageTypes
**Impact:** 23 files importing from wrong location

**Current (Wrong):**
```typescript
import { ... } from '../../infrastructure/database/types';
```

**Correct:**
```typescript
import { ... } from '../../infrastructure/core/StorageTypes';
```

**Automated Fix:**
```typescript
// scripts/fix-database-types-imports.ts
import * as fs from 'fs';
import * as path from 'path';

const files = [
  // List all 23 affected files from audit
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    /from ['"](.*)\/infrastructure\/database\/types['"]/g,
    "from '$1/infrastructure/core/StorageTypes'"
  );
  fs.writeFileSync(file, content);
}
```

---

### 4. Missing Graph Database Driver
**Impact:** 5 scripts cannot run

**Missing Import:**
```typescript
import { driver } from '../../../shared/database/graph/driver';
```

**Resolution:**
- File never existed in `shared/database/graph/`
- Actual location: `server/infrastructure/database/graph/driver.ts` (if it exists)
- Or needs to be created

**Action:**
```bash
# Search for driver implementation
find . -name "*driver*" -path "*/graph/*" -type f

# Update imports to correct path or create missing driver
```

---

### 5. Test Files with Broken Imports
**Impact:** Tests cannot run

**Files:**
- `client/src/__tests__/strategic/error-handling/cross-system-propagation.test.tsx` (10 missing imports)
- `client/src/lib/hooks/__tests__/useNavigationSlice.test.tsx`
- `client/src/lib/ui/civic/CivicEducation.test.tsx`

**Pattern:**
```typescript
// Missing error handling modules
import { ErrorPropagationService } from '../../../core/error/ErrorPropagationService';
import { HookErrorHandler } from '../../../core/error/hooks/HookErrorHandler';
import { LibraryErrorHandler } from '../../../core/error/library/LibraryErrorHandler';
```

**Resolution:**
These modules were never implemented. Options:
1. Delete the test files (if features not implemented)
2. Create stub implementations
3. Update tests to use actual error handling modules

---

### 6. Config Files Importing Non-Existent Module
**Impact:** Server config broken

**Files:**
- `server/config/development.ts`
- `server/config/production.ts`
- `server/config/test.ts`

**Bad Import:**
```typescript
import { ... } from '../../4-personas-implementation-guide';
```

**Fix:**
```typescript
// This file is in client/src/lib/design-system/
// Should not be imported by server config
// Remove this import or move the file to shared/
```

---

## Top 20 Most-Imported Files (High Impact)

These files have the widest cascading effect if paths change:

| File | Dependents | Risk Level |
|------|------------|------------|
| `server/infrastructure/database/graph/error-adapter-v2.ts` | 36 | 🔴 Critical |
| `server/infrastructure/database/graph/utils/session-manager.ts` | 36 | 🔴 Critical |
| `server/infrastructure/schema/foundation.ts` | 35 | 🔴 Critical |
| `scripts/error-remediation/types.ts` | 28 | 🟡 High |
| `server/infrastructure/websocket/types.ts` | 28 | 🟡 High |
| `server/infrastructure/observability/core/logger.ts` | 27 | 🟡 High |
| `client/src/core/error/types.ts` | 26 | 🟡 High |
| `client/src/core/error/constants.ts` | 25 | 🟡 High |
| `client/src/lib/ui/loading/types.ts` | 25 | 🟡 High |
| `server/infrastructure/schema/base-types.ts` | 23 | 🟡 High |

**Recommendation:** Never move or rename these files without a comprehensive refactoring plan.

---

## Adapter/Barrel Chains (43 Total)

Most adapter chains are acceptable (2-3 levels deep). Notable long chains:

### Long Chain Example: Users Feature
```
server/features/index.ts
  → server/features/users/index.ts
    → server/features/users/application/profile.ts
      → server/features/users/application/verification.ts
        → server/features/users/domain/user-management.ts
          → server/features/users/domain/user-profile.ts
            → server/features/users/domain/user-preferences.ts
              → server/features/users/domain/citizen-verification.ts
                → server/features/users/domain/ExpertVerificationService.ts
                  → server/features/users/infrastructure/user-storage.ts
```

**Status:** ⚠️ 10 levels deep - consider flattening

**Recommendation:**
```typescript
// server/features/users/index.ts
// Instead of re-exporting everything, export only public API
export { UserService } from './application/user-service';
export { UserRepository } from './infrastructure/user-repository';
export type { User, UserProfile } from './domain/types';
```

---

## Automated Fix Scripts

### Script 1: Remove .js Extensions
```bash
#!/bin/bash
# fix-js-extensions.sh

echo "Removing .js extensions from TypeScript imports..."

find server/features -name "*.ts" -type f | while read file; do
  sed -i "s/from '\(.*\)\.js'/from '\1'/g" "$file"
  sed -i 's/from "\(.*\)\.js"/from "\1"/g' "$file"
done

echo "✅ Fixed .js extensions"
```

### Script 2: Fix Database Types Imports
```typescript
// scripts/fix-database-types-imports.ts
import * as fs from 'fs';
import { execSync } from 'child_process';

// Find all files importing database/types
const result = execSync(
  'grep -r "infrastructure/database/types" --include="*.ts" --include="*.tsx" -l',
  { encoding: 'utf-8' }
);

const files = result.trim().split('\n').filter(Boolean);

console.log(`Found ${files.length} files to fix`);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const updated = content.replace(
    /from (['"])(.*)\/infrastructure\/database\/types\1/g,
    "from $1$2/infrastructure/core/StorageTypes$1"
  );
  
  if (content !== updated) {
    fs.writeFileSync(file, updated);
    console.log(`✅ Fixed: ${file}`);
  }
}
```

### Script 3: Clean Up Test Files
```typescript
// scripts/clean-broken-tests.ts
import * as fs from 'fs';

const brokenTests = [
  'client/src/__tests__/strategic/error-handling/cross-system-propagation.test.tsx',
  // Add other broken test files
];

for (const test of brokenTests) {
  if (fs.existsSync(test)) {
    // Option 1: Delete
    // fs.unlinkSync(test);
    
    // Option 2: Comment out broken imports
    let content = fs.readFileSync(test, 'utf-8');
    content = content.replace(
      /^import.*ErrorPropagationService.*/gm,
      '// TODO: Fix import - module not implemented'
    );
    fs.writeFileSync(test, content);
  }
}
```

---

## Priority Action Items

### P0 - Critical (Do Immediately)
1. ✅ Remove .js extensions from all TypeScript re-exports (65 files)
2. ✅ Fix database/types → core/StorageTypes imports (23 files)
3. ✅ Create or restore missing CSS files (5 files)
4. ✅ Fix server config imports (3 files)

### P1 - High (This Week)
1. Resolve missing graph database driver (5 scripts)
2. Fix or remove broken test files (3 files)
3. Create missing error handling modules or update tests
4. Audit and flatten deep barrel export chains (users, security, admin features)

### P2 - Medium (This Sprint)
1. Document import path conventions
2. Add ESLint rules to prevent .js extensions in TS files
3. Add pre-commit hooks to validate imports
4. Create migration guide for future refactoring

### P3 - Low (Technical Debt)
1. Simplify adapter chains >5 levels deep
2. Consolidate scattered utility functions
3. Create comprehensive import path documentation
4. Add automated import validation to CI/CD

---

## Validation Commands

After applying fixes, run these commands to verify:

```bash
# 1. TypeScript compilation
npx tsc --noEmit

# 2. Check for remaining .js imports
grep -r "from.*\.js['\"]" --include="*.ts" --include="*.tsx" server/ client/ shared/

# 3. Verify no missing imports
npx tsx scripts/audit-imports-exports.ts

# 4. Run tests
npm test

# 5. Build all packages
npm run build
```

---

## Success Metrics

- [ ] TypeScript compilation passes with 0 errors
- [ ] Import audit shows 0 missing imports
- [ ] All tests pass
- [ ] Storybook loads without errors
- [ ] Production build succeeds
- [ ] No .js extensions in TypeScript imports

---

## Lessons Learned

1. **Always use relative imports without extensions** in TypeScript
2. **Barrel exports should be shallow** (max 2-3 levels)
3. **Test files should be updated** when refactoring
4. **CSS files need explicit tracking** during refactoring
5. **Automated import validation** should be part of CI/CD

---

## Next Steps

1. Run automated fix scripts (P0 items)
2. Manually review and fix P1 items
3. Validate with TypeScript compiler
4. Run full test suite
5. Update documentation
6. Add preventive measures (ESLint rules, pre-commit hooks)

