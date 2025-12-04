# Utility Consolidation Migration Guide

## Completed Consolidations

### 1. Development Tools → `dev-tools.ts`
**Replaces:**
- `dev-mode.ts`
- `dev-server-check.ts`
- `development-debug.ts`
- `development-overrides.ts`

**Migration:**
```typescript
// OLD
import { devMode } from './dev-mode';
import { checkDevServer } from './dev-server-check';
import { developmentDebug } from './development-debug';

// NEW
import { devMode, checkDevServer, developmentDebug } from './dev-tools';
```

### 2. Testing Utilities → `testing.ts`
**Replaces:**
- `test-imports.ts`
- `validate-migration.ts`
- `validateArchitecture.ts`

**Migration:**
```typescript
// OLD
import { ImportValidator } from './test-imports';
import { MigrationValidator } from './validate-migration';
import { ArchitectureValidator } from './validateArchitecture';

// NEW
import { ImportValidator, MigrationValidator, ArchitectureValidator } from './testing';
```

### 3. Security Utilities → `security.ts`
**Replaces:**
- `csp-headers.ts`
- `dom-sanitizer.ts`
- `input-validation.ts`
- `password-validation.ts`

**Migration:**
```typescript
// OLD
import { CSPManager } from './csp-headers';
import { DOMSanitizer } from './dom-sanitizer';
import { InputValidator } from './input-validation';
import { PasswordValidator } from './password-validation';

// NEW
import { CSPManager, DOMSanitizer, InputValidator, PasswordValidator } from './security';
```

### 4. Performance Utilities → `performance.ts`
**Replaces:**
- `performance-alerts.ts`
- `performance-budget-checker.ts`
- `web-vitals-monitor.ts`
- `performance-optimizer.ts`

**Migration:**
```typescript
// OLD
import { PerformanceAlerts } from './performance-alerts';
import { PerformanceBudgetChecker } from './performance-budget-checker';
import { WebVitalsMonitor } from './web-vitals-monitor';
import { PerformanceOptimizer } from './performance-optimizer';

// NEW
import { 
  PerformanceAlerts, 
  PerformanceBudgetChecker, 
  WebVitalsMonitor, 
  PerformanceOptimizer 
} from './performance';
```

### 5. Browser Compatibility → `browser.ts`
**Replaces:**
- `browser-compatibility.ts`
- `browser-compatibility-manager.ts`
- `polyfills.ts`

**Migration:**
```typescript
// OLD
import { getBrowserInfo } from './browser-compatibility';
import { browserCompatibilityManager } from './browser-compatibility-manager';
import { polyfillManager } from './polyfills';

// NEW
import { 
  getBrowserInfo, 
  browserCompatibilityManager, 
  polyfillManager 
} from './browser';
```

### 6. Asset Management → `assets.ts`
**Replaces:**
- `asset-manager.ts`
- `asset-loader.ts`
- `asset-optimization.ts`
- `asset-fallback-config.ts`

**Migration:**
```typescript
// OLD
import { assetLoadingManager } from './asset-manager';
import { assetLoader } from './asset-loader';
import { assetOptimizer } from './asset-optimization';

// NEW
import { assetLoadingManager, assetLoader, imageOptimizer } from './assets';
```

### 7. Error Handling → `errors.ts`
**Replaces:**
- `error-system.ts`
- `unified-error-handler.ts`
- `error-analytics.ts`
- `error-reporting.ts`
- `error-integration.ts`
- `error-rate-limiter.ts`
- `advanced-error-recovery.ts`

**Migration:**
```typescript
// OLD
import { BaseError } from './error-system';
import { errorHandler } from './unified-error-handler';
import { errorAnalytics } from './error-analytics';
import { errorReporting } from './error-reporting';

// NEW
import { 
  BaseError, 
  errorHandler, 
  errorAnalytics, 
  errorReporting 
} from './errors';
```

## Files to Delete After Migration

### Development Tools
- `client/src/utils/dev-mode.ts`
- `client/src/utils/dev-server-check.ts`
- `client/src/utils/development-debug.ts`
- `client/src/utils/development-overrides.ts`

### Testing
- `client/src/utils/test-imports.ts`
- `client/src/utils/validate-migration.ts`
- `client/src/utils/validateArchitecture.ts`

### Security
- `client/src/utils/csp-headers.ts`
- `client/src/utils/dom-sanitizer.ts`
- `client/src/utils/input-validation.ts`
- `client/src/utils/password-validation.ts`

### Performance
- `client/src/utils/performance-alerts.ts`
- `client/src/utils/performance-budget-checker.ts`
- `client/src/utils/web-vitals-monitor.ts`
- `client/src/utils/performance-optimizer.ts`

### Browser
- `client/src/utils/browser-compatibility.ts`
- `client/src/utils/browser-compatibility-manager.ts`
- `client/src/utils/polyfills.ts`

### Assets
- `client/src/utils/asset-manager.ts`
- `client/src/utils/asset-loader.ts`
- `client/src/utils/asset-optimization.ts`
- `client/src/utils/asset-fallback-config.ts`

### Errors
- `client/src/utils/error-system.ts`
- `client/src/utils/unified-error-handler.ts`
- `client/src/utils/error-analytics.ts`
- `client/src/utils/error-reporting.ts`
- `client/src/utils/error-integration.ts`
- `client/src/utils/error-rate-limiter.ts`
- `client/src/utils/advanced-error-recovery.ts`

## Summary

**Before:** 25+ utility files
**After:** 7 consolidated modules
**Reduction:** 72% fewer files
**Benefits:**
- Cleaner imports
- Better tree-shaking
- Easier maintenance
- Consistent APIs
- Reduced bundle size