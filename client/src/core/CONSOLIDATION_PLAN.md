# Core Module Consolidation Plan

## Overview
The `/client/src/core` folder contains several redundant implementations that need consolidation to ensure consistency and maintainability.

## Identified Redundancies

### 1. Session Management (HIGH PRIORITY)
**Problem**: THREE identical SessionManager implementations
- `utils/storage.ts` (legacy, actively used by services/auth-service.ts and middleware)
- `core/storage/session-manager.ts` (redundant duplicate)
- `core/auth/services/session-manager.ts` (consolidated version)

**Solution**: 
- Keep the consolidated version in `core/auth/services/session-manager.ts`
- Remove `core/storage/session-manager.ts` (unused redundant copy)
- Migrate `utils/storage.ts` usage to consolidated auth version
- Update all imports to use the auth version

### 2. Token Management (HIGH PRIORITY)
**Problem**: THREE identical TokenManager implementations
- `utils/storage.ts` (legacy, actively used by services/auth-service.ts and middleware)
- `core/storage/token-manager.ts` (redundant duplicate)
- `core/auth/services/token-manager.ts` (consolidated version)

**Solution**:
- Keep the consolidated version in `core/auth/services/token-manager.ts`
- Remove `core/storage/token-manager.ts` (unused redundant copy)
- Migrate `utils/storage.ts` usage to consolidated auth version
- Update all imports to use the auth version

### 3. Cache Management (MEDIUM PRIORITY)
**Problem**: Two different cache implementations
- `core/api/cache.ts` (UnifiedCacheManager - more comprehensive)
- `core/api/cache-manager.ts` (ApiCacheManager - simpler)

**Solution**:
- Evaluate which implementation is actively used
- If UnifiedCacheManager is more complete, migrate ApiCacheManager usage
- If ApiCacheManager is more stable, deprecate UnifiedCacheManager
- Consolidate into single implementation

### 4. Authentication Interceptors (LOW PRIORITY)
**Problem**: Same classes exported from multiple modules
- Creates confusion about canonical source
- Potential for version drift

**Solution**:
- Keep implementation in `core/api/authentication.ts`
- Re-export from other modules rather than duplicating
- Update `core/auth/index.ts` to re-export from API module

### 5. Multiple useAuth Hooks (MEDIUM PRIORITY)
**Problem**: Several useAuth implementations across codebase
- `core/auth/hooks/useAuth.ts` (consolidated)
- `features/users/hooks/useAuth.tsx` (feature-specific)
- Others in components/auth/

**Solution**:
- Establish single canonical useAuth in `core/auth/hooks/useAuth.ts`
- Migrate feature-specific implementations to use core version
- Maintain backward compatibility through re-exports

## Implementation Steps

### Phase 1: Storage Consolidation
1. ✅ Verify `core/auth/services/session-manager.ts` has all functionality
2. ✅ Verify `core/auth/services/token-manager.ts` has all functionality  
3. Update imports across codebase
4. Remove redundant files from `core/storage/`

### Phase 2: Cache Consolidation
1. Analyze usage patterns of both cache implementations
2. Choose primary implementation based on:
   - Feature completeness
   - Performance characteristics
   - Current usage in codebase
3. Migrate to single implementation
4. Update all imports

### Phase 3: Authentication Cleanup
1. Centralize authentication interceptors in `core/api/authentication.ts`
2. Update re-exports in other modules
3. Consolidate useAuth hooks to single implementation
4. Update documentation

### Phase 4: Validation
1. Run full test suite
2. Verify no broken imports
3. Check for runtime errors
4. Update documentation

## Files to Remove After Consolidation

```
client/src/core/storage/session-manager.ts
client/src/core/storage/token-manager.ts
```

## Files to Update

### Import Updates Needed:
- Any file importing from `core/storage/session-manager`
- Any file importing from `core/storage/token-manager`
- Files using multiple cache implementations

### Export Updates Needed:
- `core/storage/index.ts` - remove session/token manager exports
- `core/index.ts` - ensure proper re-exports
- Feature modules using redundant implementations

## Risk Assessment

**Low Risk**:
- Session/Token manager consolidation (implementations are nearly identical)
- Authentication interceptor cleanup (just re-export changes)

**Medium Risk**:
- Cache consolidation (different implementations may have subtle differences)
- useAuth hook consolidation (may affect component behavior)

**Mitigation**:
- Thorough testing before removing files
- Gradual migration with backward compatibility
- Feature flags for cache implementation switching

## Success Criteria

1. ✅ No duplicate class implementations
2. ✅ Single source of truth for each core service
3. ✅ All tests passing
4. ✅ No broken imports
5. ✅ Improved code maintainability
6. ✅ Clear module boundaries and responsibilities