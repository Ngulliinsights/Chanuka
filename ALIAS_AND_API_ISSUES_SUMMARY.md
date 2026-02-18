# TypeScript Alias Resolution & API Migration Issues

## Status: PARTIALLY RESOLVED

### ✅ Fixed Issues

1. **Created missing `database-service.ts`**
   - File: `server/infrastructure/database/database-service.ts`
   - Provides compatibility layer for 18 files importing `databaseService`
   - Exports singleton instance wrapping `db`, `readDb`, `writeDb`

2. **Updated tsconfig paths**
   - Added `@server/infrastructure/error-handling` path mapping
   - Removed obsolete `@server/infrastructure/errors` path
   - Added error-handling paths to root tsconfig.json

3. **Fixed import paths in 3 files**
   - `server/features/bills/bills-router-migrated.ts` - Changed `@/` to `@server/`
   - `server/features/bills/application/bill-service-adapter.ts` - Changed `@/` to `@server/`
   - `server/features/users/application/users.ts` - Changed relative to `@server/`

### ❌ Remaining Issues

#### 1. Old Error Handling API Usage
**File:** `server/features/users/application/users.ts` (and likely others)

**Problem:** Using deprecated APIs that don't exist in new error-handling system:
- `withResultHandling()` - Doesn't exist
- `ResultAdapter` - Doesn't exist

**Old API (being used):**
```typescript
return withResultHandling(async () => {
  const validationResult = ResultAdapter.validationError([...]);
  throw ResultAdapter.toBoom(validationResult._unsafeUnwrapErr());
}, { service: 'UserDomainService', operation: 'registerUser' });
```

**New API (should use):**
```typescript
return safeAsync(async () => {
  const error = createValidationError('Validation failed', {
    fields: [{ field: 'email', message: 'Email is required' }]
  });
  return err(error);
});
```

**Affected Functions:**
- `withResultHandling` → Use `safeAsync` or `safe`
- `ResultAdapter.validationError` → Use `createValidationError`
- `ResultAdapter.businessLogicError` → Use `createBusinessLogicError`
- `ResultAdapter.notFoundError` → Use `createNotFoundError`
- `ResultAdapter.toBoom` → Use `boomFromStandardized`
- `ResultAdapter.fromBoom` → Use `standardizedFromBoom`

#### 2. Database Transaction API Mismatch
**Problem:** `withTransaction` is being called with 2 arguments but expects 1

**Current usage:**
```typescript
await databaseService.withTransaction(async (_tx) => {
  // ...
}, 'user_registration');
```

**Expected usage:**
```typescript
await databaseService.withTransaction(async (tx) => {
  // Use tx for queries
});
```

#### 3. TypeScript Language Server Cache
The `@server` alias IS configured correctly, but the language server may need to be restarted to pick up:
- New `database-service.ts` file
- Updated tsconfig paths
- New error-handling module

### Files Needing API Migration

Based on the error patterns, these files likely need similar updates:

1. ✅ `server/features/users/application/users.ts` - 48 errors (OLD API)
2. `server/features/bills/application/bill-service.ts` - Uses `withResultHandling`
3. `server/features/bills/application/bill-service-adapter.ts` - May use old API
4. Other files importing from old `@/infrastructure/errors/result-adapter`

### Recommended Actions

1. **Immediate:** Restart TypeScript language server in VS Code
   - Command Palette → "TypeScript: Restart TS Server"

2. **Short-term:** Create migration guide for old → new error handling API
   - Document all API mappings
   - Provide code examples

3. **Medium-term:** Migrate all files using old error handling API
   - Search for `withResultHandling`, `ResultAdapter`
   - Replace with new `safeAsync`, `createError` functions

4. **Long-term:** Remove any remaining compatibility shims

### API Migration Guide

| Old API | New API | Notes |
|---------|---------|-------|
| `withResultHandling(fn, context)` | `safeAsync(fn)` | Context moved to error creation |
| `ResultAdapter.validationError()` | `createValidationError()` | Different signature |
| `ResultAdapter.businessLogicError()` | `createBusinessLogicError()` | Different signature |
| `ResultAdapter.notFoundError()` | `createNotFoundError()` | Different signature |
| `ResultAdapter.toBoom()` | `boomFromStandardized()` | Direct conversion |
| `ResultAdapter.fromBoom()` | `standardizedFromBoom()` | Direct conversion |
| `AsyncServiceResult<T>` | `AsyncServiceResult<T>` | Same (kept) |
| `ServiceResult<T>` | `ServiceResult<T>` | Same (kept) |

### Why @server Alias "Wasn't Resolving"

The real issue wasn't the alias - it was:
1. Missing `database-service.ts` file (module didn't exist)
2. Old error handling APIs being used (functions don't exist)
3. TypeScript language server cache not updated

The alias configuration was correct all along!
