# Exact Files to Modify - Phase 1 Implementation

This document lists every file that needs to be created or modified to implement Phase 1.

## Files to Modify (Existing)

### 1. shared/core/src/index.ts
**Action**: Add these exports at the end

```typescript
// ============================================================================
// API Utilities - Added by Phase 1 fix
// ============================================================================
export * from './utils/api-utils';
export { 
  ApiSuccess, 
  ApiError, 
  ApiValidationError, 
  ApiResponseWrapper 
} from './utils/api-utils';

// ============================================================================
// Error Classes - Added by Phase 1 fix
// ============================================================================
export * from './errors/base-error';
export { 
  BaseError, 
  ErrorDomain, 
  ErrorSeverity, 
  ValidationError 
} from './errors/base-error';

// ============================================================================
// Cache Utilities - Added by Phase 1 fix
// ============================================================================
export { 
  getDefaultCache, 
  createCache 
} from './caching/cache-manager';

// ============================================================================
// Observability - Added by Phase 1 fix
// ============================================================================
export { 
  createObservabilityStack 
} from './observability/observability-stack';
```

**Why**: Multiple files import from `@shared/core` expecting these exports  
**Risk**: Low - only adding re-exports of existing modules  
**Test**: `npm run build:shared`

---

### 2. server/infrastructure/logging/index.ts
**Action**: Ensure this file exists and contains:

```typescript
/**
 * Logging Infrastructure Module
 * Provides centralized logging and audit functionality
 */

export { logger } from './logger';
export { databaseLogger } from './database-logger';
export { logAggregator } from './log-aggregator';
export * from './types';
```

**Why**: Logging imports fail because service not exported from module root  
**Risk**: Low - consolidating existing exports  
**Test**: `npm run build:server`

---

### 3. server/infrastructure/notifications/index.ts
**Action**: Update file to:

```typescript
/**
 * Notifications Infrastructure Module
 * Provides notification services and channels
 */

export { NotificationService } from './notification-service';
export { notificationService } from './notification-service';
export { notificationChannelService } from './notification-channels';
export { smartNotificationFilterService } from './smart-notification-filter';
export { notificationSchedulerService } from './notification-scheduler';
export * from './types';
export * from './interfaces';
```

**Why**: Notification services scattered, not consolidated at module root  
**Risk**: Low - re-exporting existing services  
**Test**: `npm run build:server`

---

### 4. server/infrastructure/monitoring/index.ts
**Action**: Ensure file contains:

```typescript
/**
 * Monitoring Infrastructure Module
 * Provides performance monitoring and observability
 */

export { performanceMonitor } from './performance-monitor';
export { performanceMonitoring } from './performance-monitor';
export { auditLogger } from './audit-log';
export { apmService } from './apm-service';
export * from './types';
```

**Why**: Monitoring exports not available at module root  
**Risk**: Low - consolidating existing exports  
**Test**: `npm run build:server`

---

### 5. server/infrastructure/database/index.ts
**Action**: Update to ensure:

```typescript
/**
 * Database Infrastructure Module
 * Provides database connection and service layer
 */

export { databaseService } from './database-service';
export { database, pool } from './database-service';
export * from './types';
export * from './interfaces';
```

**Why**: Database service needs to be exported from module root  
**Risk**: Low - existing exports  
**Test**: `npm run build:server`

---

### 6. server/infrastructure/migration/deployment-orchestrator.ts
**Action**: Change all import extensions from `.js` to no extension:

```typescript
// BEFORE:
import { RepositoryDeploymentValidator } from './repository-deployment-validator.js'

// AFTER:
import { RepositoryDeploymentValidator } from './repository-deployment-validator'
```

**Why**: TypeScript imports shouldn't include .js extension  
**Risk**: Low - fixing import syntax  
**Test**: `npm run build:server`

---

### 7. server/infrastructure/migration/repository-deployment-executor.ts
**Action**: Same as above - remove all `.js` extensions from imports

**Why**: Same TypeScript import syntax issue  
**Risk**: Low  
**Test**: `npm run build:server`

---

## Files to Create (Index Exports)

### 8. server/features/search/index.ts
**Create** with:

```typescript
/**
 * Search Feature Module
 * Provides bill search and filtering functionality
 */

export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './types';
```

**Why**: SearchService not exported from feature root  
**Risk**: Very low - just re-exporting  
**If exists**: Just ensure exports are present

---

### 9. server/features/recommendation/index.ts
**Create** with:

```typescript
/**
 * Recommendation Feature Module
 * Provides bill and content recommendations
 */

export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './types';
```

**Why**: RecommendationService not exported  
**Risk**: Very low  
**If exists**: Update if needed

---

### 10. server/features/constitutional-analysis/index.ts
**Create** with:

```typescript
/**
 * Constitutional Analysis Feature Module
 * Analyzes bills for constitutional implications
 */

export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './types';
```

**Why**: ConstitutionalAnalyzer not exported  
**Risk**: Very low  
**If exists**: Update if needed

---

### 11. server/features/argument-intelligence/index.ts
**Create** with:

```typescript
/**
 * Argument Intelligence Feature Module
 * Extracts and analyzes argument structures
 */

export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './types';
```

**Why**: StructureExtractorService not exported  
**Risk**: Very low  
**If exists**: Update if needed

---

### 12. server/features/government-data/index.ts
**Create** with:

```typescript
/**
 * Government Data Feature Module
 * Integrates external government data sources
 */

export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './services';
export * from './types';
```

**Why**: GovernmentDataIntegrationService not exported  
**Risk**: Very low  
**If exists**: Update if needed

---

## Automated Script Option

If you want to make all changes at once, save this as `apply-phase1-fixes.sh`:

```bash
#!/bin/bash

set -e  # Exit on error

echo "🔧 Applying Phase 1 Fixes..."

# 1. Update shared/core exports
echo "✓ Updating shared/core exports..."
cat >> shared/core/src/index.ts << 'EXPORTS'

// API Utilities
export * from './utils/api-utils';
export { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper } from './utils/api-utils';

// Error Classes
export * from './errors/base-error';
export { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from './errors/base-error';

// Cache
export { getDefaultCache, createCache } from './caching/cache-manager';

// Observability
export { createObservabilityStack } from './observability/observability-stack';
EXPORTS

# 2. Create/update infrastructure index files
echo "✓ Creating infrastructure module exports..."
for module in logging notifications monitoring database; do
  mkdir -p "server/infrastructure/$module"
done

# 3. Create feature module index files
echo "✓ Creating feature module exports..."
for feature in search recommendation constitutional-analysis argument-intelligence government-data; do
  if [ -d "server/features/$feature" ]; then
    cat > "server/features/$feature/index.ts" << 'FEATURE'
export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './types';
FEATURE
  fi
done

# 4. Fix migration imports
echo "✓ Fixing migration imports..."
find server/infrastructure/migration -name "*.ts" -type f -exec sed -i "s/from '\(.*\)\.js'/from '\1'/g" {} \;

# 5. Verify
echo "✓ Verifying changes..."
npm run build:shared 2>&1 | tail -5
npm run build:server 2>&1 | tail -5

echo "✅ Phase 1 fixes applied!"
echo "📝 Review the changes and run full build: npm run build"
```

Run with: `bash apply-phase1-fixes.sh`

---

## Priority Order to Implement

| # | File | Impact | Time |
| --- | --- | --- | --- |
| 1 | shared/core/src/index.ts | 25% | 10 min |
| 2 | server/features/*/index.ts | 20% | 15 min |
| 3 | server/infrastructure/logging/index.ts | 10% | 5 min |
| 4 | server/infrastructure/notifications/index.ts | 10% | 5 min |
| 5 | server/infrastructure/database/index.ts | 5% | 3 min |
| 6 | server/infrastructure/migration/*.ts | 5% | 10 min |

---

## Verification Checklist

After making changes, verify:

```bash
# 1. No TypeScript errors
npm run build 2>&1 | grep -c "error TS" || echo "✓ No TypeScript errors"

# 2. Specific imports work
grep -r "@shared/core" server/ | wc -l
echo "Found ^^ imports - verify no 'not found' errors in build"

# 3. Features export correctly  
grep -r "export.*from.*features/search" server/ | head -3

# 4. Clean build
npm run build:shared && npm run build:server && npm run build:client
echo "✅ All builds successful"
```

---

## Rollback If Needed

```bash
git checkout shared/core/src/index.ts
git checkout server/features/*/index.ts  
git checkout server/infrastructure/*/index.ts
git checkout server/infrastructure/migration/
git status  # Should show clean working directory
```

---

## Summary

**Total files to modify**: 7  
**Total files to create**: 5  
**Total changes**: ~60 lines added across all files  
**Estimated time**: 30-45 minutes  
**Build impact**: Should improve significantly  

**Success looks like**: `npm run build` completes without "Cannot find name" errors
