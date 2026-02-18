# Complete Migration Plan - No Compatibility Layers

## Philosophy

**No compatibility layers. Fix the real problems.**

Compatibility layers:
- Hide the real issues
- Create technical debt
- Confuse developers
- Make the codebase harder to maintain

Instead, we will:
- Identify all broken code
- Fix it properly
- Use automation where possible
- Document the changes

## Current State

### Infrastructure Changes Completed
1. ✅ Error handling consolidated: `errors/` → `error-handling/`
2. ✅ Observability reorganized: flat → subdirectories
3. ✅ Database service created: `database-service.ts`
4. ✅ TypeScript paths updated

### Feature Code Status
- ❌ Still using old APIs
- ❌ Importing from deleted modules
- ❌ Using deprecated functions
- ❌ Inconsistent patterns

## Migration Approach

### Phase 1: Automated Migration (Primary)

**Tool:** `scripts/migrate-error-handling-api.ts`

**What it does:**
1. Finds all files using old error handling API
2. Updates import paths
3. Replaces function calls:
   - `withResultHandling()` → `safeAsync()`
   - `ResultAdapter.validationError()` → `createValidationError()`
   - `ResultAdapter.businessLogicError()` → `createBusinessLogicError()`
   - `ResultAdapter.notFoundError()` → `createNotFoundError()`
   - `ResultAdapter.toBoom()` → `boomFromStandardized()`
   - `ResultAdapter.fromBoom()` → `standardizedFromBoom()`
4. Updates import statements
5. Writes changes back to files

**Run it:**
```bash
# Migrate all feature files
tsx scripts/migrate-error-handling-api.ts "server/features/**/*.ts"

# Migrate specific feature
tsx scripts/migrate-error-handling-api.ts "server/features/users/**/*.ts"

# Migrate single file
tsx scripts/migrate-error-handling-api.ts "server/features/users/application/users.ts"
```

### Phase 2: Manual Fixes (Secondary)

Some changes require human judgment:

1. **Complex error handling logic**
   - Review and simplify
   - Ensure error context is preserved
   - Update tests

2. **Database transaction signatures**
   - Old: `withTransaction(async (tx) => {...}, 'name')`
   - New: `withTransaction(async (tx) => {...})`
   - Remove second parameter

3. **Type annotations**
   - Add explicit types where needed
   - Fix `any` types
   - Update interfaces

4. **Business logic**
   - Verify error handling still makes sense
   - Update error messages
   - Improve error context

### Phase 3: Verification

1. **TypeScript compilation**
   ```bash
   npm run type-check
   ```

2. **Linting**
   ```bash
   npm run lint
   ```

3. **Tests**
   ```bash
   npm test
   ```

4. **Manual testing**
   - Test critical user flows
   - Verify error messages
   - Check error logging

## API Migration Reference

### Old API → New API

| Old | New | Notes |
|-----|-----|-------|
| `withResultHandling(fn, ctx)` | `safeAsync(fn)` | Context moved to error creation |
| `ResultAdapter.validationError(fields, ctx)` | `createValidationError(msg, ctx)` | Different signature |
| `ResultAdapter.businessLogicError(code, msg, ctx)` | `createBusinessLogicError(msg, {...ctx, code})` | Code in context |
| `ResultAdapter.notFoundError(type, id, ctx)` | `createNotFoundError(type, id, ctx)` | Same signature |
| `ResultAdapter.toBoom(error)` | `boomFromStandardized(error)` | Direct replacement |
| `ResultAdapter.fromBoom(boom)` | `standardizedFromBoom(boom)` | Direct replacement |
| `import from '@/infrastructure/errors'` | `import from '@server/infrastructure/error-handling'` | Path change |

### Example Migration

**Before:**
```typescript
import { withResultHandling, ResultAdapter } from '@/infrastructure/errors/result-adapter';

async function registerUser(data: UserData): AsyncServiceResult<User> {
  return withResultHandling(async () => {
    if (!data.email) {
      const error = ResultAdapter.validationError([
        { field: 'email', message: 'Email is required' }
      ], { service: 'UserService' });
      throw ResultAdapter.toBoom(error._unsafeUnwrapErr());
    }
    
    const user = await createUser(data);
    return user;
  }, { service: 'UserService', operation: 'registerUser' });
}
```

**After:**
```typescript
import { 
  safeAsync, 
  createValidationError, 
  err 
} from '@server/infrastructure/error-handling';

async function registerUser(data: UserData): AsyncServiceResult<User> {
  return safeAsync(async () => {
    if (!data.email) {
      return err(createValidationError('Email is required', {
        service: 'UserService',
        fields: [{ field: 'email', message: 'Email is required' }]
      }));
    }
    
    const user = await createUser(data);
    return user;
  });
}
```

## Execution Plan

### Day 1: Automated Migration
1. ✅ Create migration script
2. Run on all feature files
3. Review changes with `git diff`
4. Commit automated changes

### Day 2: Manual Fixes
1. Fix TypeScript errors
2. Update transaction signatures
3. Add missing type annotations
4. Update tests

### Day 3: Verification
1. Run full TypeScript compilation
2. Run linting
3. Run test suite
4. Manual testing of critical flows

### Day 4: Cleanup
1. Remove any remaining old code
2. Update documentation
3. Add linting rules to prevent regression
4. Final review and commit

## Success Criteria

- ✅ Zero TypeScript compilation errors
- ✅ Zero linting errors
- ✅ All tests passing
- ✅ No imports from deleted modules
- ✅ No usage of deprecated APIs
- ✅ Consistent error handling patterns
- ✅ Updated documentation

## Rollback Plan

If migration causes issues:

1. **Immediate:** `git reset --hard HEAD~1`
2. **Review:** Identify what went wrong
3. **Fix:** Update migration script
4. **Retry:** Run migration again

## Prevention

To prevent this from happening again:

1. **Linting rules:**
   ```json
   {
     "no-restricted-imports": ["error", {
       "patterns": ["**/infrastructure/errors/**"]
     }]
   }
   ```

2. **Pre-commit hooks:**
   - Run TypeScript compilation
   - Run linting
   - Block commits with errors

3. **Documentation:**
   - Keep API migration guides
   - Document breaking changes
   - Provide migration scripts

4. **Code review:**
   - Check for old API usage
   - Verify import paths
   - Ensure consistency

## Next Steps

1. **Run the migration script:**
   ```bash
   tsx scripts/migrate-error-handling-api.ts
   ```

2. **Review the changes:**
   ```bash
   git diff
   ```

3. **Fix remaining issues manually**

4. **Verify everything works**

5. **Commit and move forward**
