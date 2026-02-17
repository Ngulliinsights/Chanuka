# Infrastructure Consolidation - Import Dependency Map

**Generated:** Task 1.1 - Dependency Analysis  
**Purpose:** Document all import locations for modules to be consolidated

## Executive Summary

This document maps all imports of infrastructure modules that will be consolidated. It serves as a reference during consolidation to ensure all import paths are updated correctly.

### Key Findings

1. **External API Module**: Directory does not exist - already cleaned up ✓
2. **Cache Module**: 10 import locations found
3. **Config Module**: 0 direct imports found (uses internal references only)
4. **Observability Module**: 8 direct imports found (many commented-out imports in shared/core)
5. **Error Modules**: 7 import locations found

---

## 1. Cache Module Imports

### Files to Consolidate
- `cache.ts` (2-line stub)
- `simple-factory.ts` (to merge into `factory.ts`)
- `icaching-service.ts` (to merge into `caching-service.ts`)

### Current Import Locations

#### 1.1 Cache Service Imports

**server/index.ts**
```typescript
import { cacheManagementRoutes as cacheRouter } from '@server/infrastructure/cache/cache-management.routes';
```
- **Status**: No change needed (cache-management.routes not being consolidated)

**server/features/search/infrastructure/SearchCache.ts**
```typescript
import { cacheService } from '@/infrastructure/cache/cache-service.js';
```
- **Status**: No change needed (cache-service not being consolidated)

**server/features/search/engines/suggestion/suggestion-engine.service.ts**
```typescript
import { cacheService } from '@/infrastructure/cache/cache-service.js';
```
- **Status**: No change needed

**server/features/analytics/financial-disclosure/monitoring.ts**
```typescript
import { CacheService } from '@/infrastructure/cache/cache-service.js';
```
- **Status**: No change needed

**server/features/search/engines/suggestion-engine.service.ts**
```typescript
import { cacheService } from '@server/infrastructure/cache';
```
- **Status**: Imports from index.ts, verify re-exports work

**server/features/search/services/embedding.service.ts**
```typescript
import { cacheService } from '@server/infrastructure/cache';
```
- **Status**: Imports from index.ts, verify re-exports work

**server/features/bills/application/bill-service.ts**
```typescript
import { serverCache, CACHE_TTL as CACHE_TTL_CONSTANTS } from '@server/infrastructure/cache';
```
- **Status**: Imports from index.ts, verify re-exports work

**server/features/recommendation/infrastructure/RecommendationCache.ts**
```typescript
import { CACHE_TTL } from '@server/infrastructure/cache';
```
- **Status**: Imports from index.ts, verify re-exports work

**client/src/lib/hooks/useOfflineCapabilities.ts**
```typescript
import { cacheInvalidationManager as cacheInvalidation } from '@client/lib/infrastructure/cache/cache-invalidation';
```
- **Status**: Client-side cache, no change needed

**scripts/fix-typescript-syntax-errors.ts**
```typescript
'import { serverCache } from "../../../infrastructure/cache/cache-service";'
```
- **Status**: String literal in script, no change needed

### Cache Module Summary
- **Total Import Locations**: 10
- **Require Updates**: 0 (all imports use index.ts or non-consolidated files)
- **Action**: Verify cache/index.ts properly re-exports from consolidated modules

---

## 2. Config Module Imports

### Files to Consolidate
- `config/index.ts` (to become minimal re-export)
- `config/manager.ts` (to become unified manager)

### Current Import Locations

**No direct external imports found**

All config usage appears to be internal to the config module itself. The config module is self-contained.

### Config Module Summary
- **Total Import Locations**: 0 external
- **Require Updates**: 0
- **Action**: Update config/index.ts to re-export from manager.ts

---

## 3. Observability Module Imports

### Files to Consolidate
- `observability/index.ts` (reduce from 200 lines to ~50 lines)

### Current Import Locations

#### 3.1 Direct Imports from infrastructure/observability

**server/utils/cache-utils.ts**
```typescript
import { logger } from '../infrastructure/observability';
```
- **Action**: Update to import from '@shared/core/observability'

**server/utils/api-utils.ts**
```typescript
import { logger } from '../infrastructure/observability';
```
- **Action**: Update to import from '@shared/core/observability'

**server/middleware/ai-middleware.ts**
```typescript
import { logger } from '../infrastructure/observability';
```
- **Action**: Update to import from '@shared/core/observability'

**server/middleware/ai-deduplication.ts**
```typescript
import { logger } from '../infrastructure/observability';
```
- **Action**: Update to import from '@shared/core/observability'

**server/middleware/unified-middleware.ts**
```typescript
import { logger } from '../infrastructure/observability';
```
- **Action**: Update to import from '@shared/core/observability'

**server/infrastructure/observability/audit-log.ts**
```typescript
import { databaseLogger } from '@server/infrastructure/observability/database-logger';
```
- **Status**: Internal observability import, no change needed

**server/features/bills/application/bill-service.ts**
```typescript
import { logger } from '@server/infrastructure/observability/logger';
```
- **Action**: Update to import from '@shared/core/observability'

**server/infrastructure/database/core/health-monitor.ts**
```typescript
import { logger } from '../../observability';
```
- **Action**: Update to import from '@shared/core/observability'

#### 3.2 Imports from observability subdirectories

**server/infrastructure/config/manager.ts**
```typescript
import { BaseError, ErrorDomain, ErrorSeverity } from '../observability/error-management';
import { ObservabilityStack } from '../observability/stack';
```
- **Status**: These are server-specific, keep as-is

**server/middleware/unified-middleware.ts**
```typescript
import { setupGlobalErrorHandlers } from '../observability/error-management';
```
- **Status**: Server-specific error handling, keep as-is

**server/utils/response-helpers.ts**
```typescript
import { ErrorDomain } from '../observability/error-management';
```
- **Status**: Server-specific, keep as-is

#### 3.3 Commented-out imports (for reference)

Multiple files in `shared/core` have commented-out imports from observability:
- `shared/core/utils/async-utils.ts`
- `shared/core/utils/string-utils.ts`
- `shared/core/utils/type-guards.ts`
- `shared/core/utils/http-utils.ts`
- `shared/core/utils/images/image-utils.ts`
- `shared/core/middleware/middleware-registry.ts`
- `shared/core/middleware/index.ts`
- `server/utils/correlation-id.ts`
- `server/utils/response-helpers.ts`
- `server/middleware/middleware-types.ts`
- `server/middleware/middleware-config.ts`
- `server/infrastructure/config/types.ts`
- `server/infrastructure/config/schema.ts`
- `server/infrastructure/config/index.ts`

**Status**: Already commented out, no action needed

### Observability Module Summary
- **Total Import Locations**: 8 active imports
- **Require Updates**: 7 (update to use @shared/core/observability)
- **Keep As-Is**: 1 (internal observability imports)
- **Action**: Update logger imports to use shared/core, keep server-specific utilities

---

## 4. Error Module Imports

### Files to Consolidate
- `error-adapter.ts` (merge into error-standardization.ts)
- `error-configuration.ts` (merge into error-standardization.ts)
- `error-standardization.ts` (becomes unified module)
- `result-adapter.ts` (keep separate - unique functionality)

### Current Import Locations

#### 4.1 error-adapter.ts imports

**server/features/bills/bills-router-migrated.ts**
```typescript
import { errorAdapter } from '@/infrastructure/errors/error-adapter.js';
```
- **Action**: Update to import from unified error-standardization.ts

**server/middleware/boom-error-middleware.ts**
```typescript
import { errorAdapter } from '@shared/infrastructure/errors/error-adapter';
```
- **Action**: Update to import from unified error-standardization.ts

#### 4.2 error-standardization.ts imports

**server/middleware/boom-error-middleware.ts**
```typescript
import { ErrorResponse } from '@shared/infrastructure/errors/error-standardization';
```
- **Status**: Will remain in error-standardization.ts, no change needed

#### 4.3 result-adapter.ts imports

**scripts/fix-typescript-syntax-errors.ts**
```typescript
'} from "../../../infrastructure/errors/result-adapter.js";'
```
- **Status**: String literal in script, no change needed

**server/features/users/application/users.ts**
```typescript
import {
  ResultAdapter,
  withResultHandling
} from '@/infrastructure/errors/result-adapter.js';
```
- **Status**: result-adapter.ts kept separate, no change needed

**server/features/bills/application/bill-service-adapter.ts**
```typescript
import { ResultAdapter } from '@/infrastructure/errors/result-adapter.js';
```
- **Status**: result-adapter.ts kept separate, no change needed

**server/features/bills/application/bill-service.ts**
```typescript
import type { AsyncServiceResult } from '@server/infrastructure/errors/result-adapter';
import { withResultHandling } from '@server/infrastructure/errors/result-adapter';
```
- **Status**: result-adapter.ts kept separate, no change needed

#### 4.4 error-configuration.ts imports

**No direct imports found** - appears to be used internally only

### Error Module Summary
- **Total Import Locations**: 7
- **Require Updates**: 2 (error-adapter imports)
- **Keep As-Is**: 5 (result-adapter and error-standardization)
- **Action**: Update error-adapter imports to use unified error-standardization.ts

---

## 5. External API Module

### Status: ✓ Already Removed

The `server/infrastructure/external-api` directory does not exist. This cleanup has already been completed.

**Verification**: No imports found for `infrastructure/external-api/error-handler`

---

## Import Update Strategy

### Phase 1: Cache Module (No Updates Required)
All cache imports use `cache/index.ts` or non-consolidated files. Only need to verify index.ts re-exports work correctly after consolidation.

### Phase 2: Config Module (No Updates Required)
Config module is self-contained with no external imports. Only need to update internal structure.

### Phase 3: Observability Module (7 Updates Required)
Update these files to import logger from `@shared/core/observability`:
1. `server/utils/cache-utils.ts`
2. `server/utils/api-utils.ts`
3. `server/middleware/ai-middleware.ts`
4. `server/middleware/ai-deduplication.ts`
5. `server/middleware/unified-middleware.ts`
6. `server/features/bills/application/bill-service.ts`
7. `server/infrastructure/database/core/health-monitor.ts`

### Phase 4: Error Module (2 Updates Required)
Update these files to import from unified error-standardization.ts:
1. `server/features/bills/bills-router-migrated.ts`
2. `server/middleware/boom-error-middleware.ts`

---

## Validation Checklist

After consolidation, verify:

- [ ] All cache imports resolve correctly through index.ts
- [ ] Config module internal references work
- [ ] Observability logger imports work from @shared/core
- [ ] Error adapter imports work from unified module
- [ ] No broken imports remain
- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] No runtime import errors

---

## Notes

1. **Minimal Impact**: Most modules already use index.ts or will not require import updates
2. **Observability**: Largest number of updates (7 files) but straightforward changes
3. **Error Module**: Only 2 files need updates for error-adapter
4. **Cache Module**: Zero updates needed - well-structured with index.ts
5. **Config Module**: Zero external imports - self-contained

**Total Files Requiring Import Updates: 9**
- Observability: 7 files
- Error Module: 2 files
- Cache Module: 0 files
- Config Module: 0 files

This is significantly lower than expected, indicating good existing module structure with proper use of index.ts barrel exports.
