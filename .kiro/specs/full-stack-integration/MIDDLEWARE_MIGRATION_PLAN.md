# Middleware Migration Plan

## Overview

The `shared/core/middleware/` directory contains Express middleware that should be moved to the server layer. However, the `server/middleware/` directory already exists with its own middleware files.

## Current State

### Shared Middleware (To Be Migrated)
Location: `shared/core/middleware/`

Files:
- `auth/provider.ts` - Authentication middleware provider
- `cache/provider.ts` - Cache middleware provider
- `error-handler/provider.ts` - Error handler middleware provider
- `rate-limit/provider.ts` - Rate limit middleware provider
- `validation/provider.ts` - Validation middleware provider
- `ai-middleware.ts` - AI middleware
- `ai-deduplication.ts` - AI deduplication middleware
- `config.ts` - Middleware configuration
- `factory.ts` - Middleware factory
- `feature-flags.ts` - Feature flags middleware
- `index.ts` - Middleware exports
- `registry.ts` - Middleware registry
- `types.ts` - Middleware types
- `unified.ts` - Unified middleware setup

### Existing Server Middleware
Location: `server/middleware/`

Files:
- `api-contract-validation.ts`
- `app-middleware.ts`
- `auth.ts`
- `boom-error-middleware.ts`
- `cache-middleware.ts`
- `circuit-breaker-middleware.ts`
- `error-management.ts`
- `file-upload-validation.ts`
- `index.ts`
- `migration-wrapper.ts`
- `privacy-middleware.ts`
- `rate-limiter.ts`
- `safeguards.ts`
- `server-error-integration.ts`
- `service-availability.ts`
- `validation-middleware.ts`

## Migration Strategy

### Option 1: Merge and Consolidate (RECOMMENDED)
1. Review both middleware implementations
2. Identify duplicates (auth, cache, rate-limit, validation, error-handler)
3. Keep the better implementation or merge features
4. Move unique middleware from shared to server
5. Update all imports
6. Remove shared middleware directory

### Option 2: Move to Subdirectory
1. Move `shared/core/middleware/` to `server/middleware/legacy/`
2. Gradually migrate to new implementations
3. Update imports as needed
4. Eventually remove legacy directory

### Option 3: Namespace Separation
1. Move `shared/core/middleware/` to `server/middleware/core/`
2. Keep existing middleware in `server/middleware/`
3. Update imports to use appropriate namespace
4. Document which middleware to use

## Duplicate Analysis

### Authentication Middleware
- **Shared**: `shared/core/middleware/auth/provider.ts`
- **Server**: `server/middleware/auth.ts`
- **Action**: Compare implementations, keep better one

### Cache Middleware
- **Shared**: `shared/core/middleware/cache/provider.ts`
- **Server**: `server/middleware/cache-middleware.ts`
- **Action**: Compare implementations, keep better one

### Rate Limiting Middleware
- **Shared**: `shared/core/middleware/rate-limit/provider.ts`
- **Server**: `server/middleware/rate-limiter.ts`
- **Action**: Compare implementations, keep better one

### Validation Middleware
- **Shared**: `shared/core/middleware/validation/provider.ts`
- **Server**: `server/middleware/validation-middleware.ts`
- **Action**: Compare implementations, keep better one

### Error Handler Middleware
- **Shared**: `shared/core/middleware/error-handler/provider.ts`
- **Server**: `server/middleware/error-management.ts`, `boom-error-middleware.ts`
- **Action**: Compare implementations, consolidate

## Unique Middleware (No Duplicates)

From Shared:
- `ai-middleware.ts` - AI-specific middleware
- `ai-deduplication.ts` - AI deduplication
- `factory.ts` - Middleware factory pattern
- `registry.ts` - Middleware registry
- `unified.ts` - Unified middleware setup

From Server:
- `api-contract-validation.ts`
- `app-middleware.ts`
- `circuit-breaker-middleware.ts`
- `file-upload-validation.ts`
- `migration-wrapper.ts`
- `privacy-middleware.ts`
- `safeguards.ts`
- `server-error-integration.ts`
- `service-availability.ts`

## Recommended Actions

1. **Immediate**: Document that `shared/core/middleware/` should not be used for new code
2. **Short-term**: Move unique middleware (AI, factory, registry, unified) to server
3. **Medium-term**: Compare duplicate implementations and consolidate
4. **Long-term**: Remove `shared/core/middleware/` directory entirely

## Manual Migration Required

Due to the complexity of merging two middleware directories with potential duplicates, this migration requires manual intervention:

1. Review each duplicate middleware pair
2. Determine which implementation is better or merge features
3. Update all imports throughout the codebase
4. Test thoroughly to ensure no breakage
5. Remove old implementations

## Status

- **Caching**: ✅ Moved to `server/infrastructure/cache/`
- **Config**: ✅ Moved to `server/infrastructure/config/`
- **Utilities**: ✅ Server-only utilities moved to `server/utils/`
- **Middleware**: ⚠️ Requires manual consolidation (documented in this file)
- **Observability**: ⚠️ Already moved but imports need updating

## Next Steps

For Task 11.2 completion:
1. Document middleware migration plan (✅ Done)
2. Move unique middleware files manually
3. Update imports for moved files
4. Leave duplicate consolidation for future work (can be done incrementally)
