# Client-Safe Utilities Documentation

## Overview

This document identifies which utilities in the shared layer are safe for use in client (browser) contexts.

**Last Updated**: 2026-02-12  
**Spec**: Full-Stack Integration  
**Task**: 11.3 - Consolidate shared utilities

---

## ✅ Fully Client-Safe Utilities

These utilities have no server-only dependencies and can be safely used in both client and server contexts.

### String Utilities
**File**: `shared/core/utils/string-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: All string manipulation functions

### Number Utilities
**File**: `shared/core/utils/number-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: All number manipulation and formatting functions

### Type Guards
**File**: `shared/core/utils/type-guards.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: All type checking and guard functions

### Regex Patterns
**File**: `shared/core/utils/regex-patterns.ts`  
**Status**: ✅ Fully Client-Safe  
**Exports**: All regex pattern constants

### Async Utilities
**File**: `shared/core/utils/async-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Promise utilities, debounce, throttle, retry logic

### Common Utilities
**File**: `shared/core/utils/common-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: General-purpose utility functions

### Loading Utilities
**File**: `shared/core/utils/loading-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Loading state management utilities

### Navigation Utilities
**File**: `shared/core/utils/navigation-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Navigation and routing utilities

### Dashboard Utilities
**File**: `shared/core/utils/dashboard-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Dashboard-specific utilities

### Browser Logger
**File**: `shared/core/utils/browser-logger.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Browser-compatible logging utilities

### Anonymity Interface
**File**: `shared/core/utils/anonymity-interface.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Anonymity-related interfaces and types

### Constants
**File**: `shared/core/utils/constants.ts`  
**Status**: ✅ Fully Client-Safe  
**Exports**: Constant values

### Race Condition Prevention
**File**: `shared/core/utils/race-condition-prevention.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Race condition prevention utilities

### Concurrency Adapter
**File**: `shared/core/utils/concurrency-adapter.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Concurrency management utilities

### Concurrency Migration Router
**File**: `shared/core/utils/concurrency-migration-router.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Concurrency migration utilities

---

## ✅ Client-Safe After Cleanup

These utilities have been cleaned up to remove server-only dependencies and are now client-safe.

### Data Utilities
**File**: `shared/core/utils/data-utils.ts`  
**Status**: ✅ Client-Safe (after cleanup)  
**Changes**: Removed logger dependency, replaced with console  
**Functions**: All data manipulation, validation, and transformation functions

### HTTP Utilities
**File**: `shared/core/utils/http-utils.ts`  
**Status**: ✅ Client-Safe (logger already commented out)  
**Functions**: HTTP status codes, error handling, request utilities

### Performance Utilities
**File**: `shared/core/utils/performance-utils.ts`  
**Status**: ✅ Client-Safe (after cleanup)  
**Changes**: Removed logger dependency, replaced with safeLog helper  
**Functions**: Performance monitoring, benchmarking, metrics tracking  
**Note**: Some Node.js-specific APIs (process.memoryUsage, process.cpuUsage) will only work in Node.js

### Security Utilities
**File**: `shared/core/utils/security-utils.ts`  
**Status**: ✅ Mostly Client-Safe (after cleanup)  
**Changes**: 
- Removed logger dependency, replaced with safeLog helper
- Made crypto import conditional (Node.js only)
**Functions**: 
- ✅ Client-Safe: Sanitization functions (sanitizeHtml, sanitizeString, sanitizeUrl, sanitizeFilename, sanitizeUserInput)
- ⚠️ Node.js Only: Crypto-based functions (encryption, hashing) - will gracefully fail in browser

---

## ✅ Formatting Utilities (All Client-Safe)

### Currency Formatting
**File**: `shared/core/utils/formatting/currency.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: formatCurrency, parseCurrency

### Date/Time Formatting
**File**: `shared/core/utils/formatting/date-time.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: formatDate, formatDateTime, formatTime, formatRelativeTime

### Document Formatting
**File**: `shared/core/utils/formatting/document.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Document-related formatting utilities

### File Size Formatting
**File**: `shared/core/utils/formatting/file-size.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: formatFileSize, parseFileSize

### Location Formatting
**File**: `shared/core/utils/formatting/location.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Location and address formatting utilities

### Status Formatting
**File**: `shared/core/utils/formatting/status.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Status badge and indicator formatting

---

## ✅ Image Utilities

### Image Utils
**File**: `shared/core/utils/images/image-utils.ts`  
**Status**: ✅ Fully Client-Safe  
**Functions**: Image manipulation and processing utilities

---

## ✅ Other Shared Utilities

### Error Utilities
**Location**: `shared/utils/errors/`  
**Status**: ✅ Fully Client-Safe  
**Files**:
- `correlation-id.ts` - Correlation ID generation (client-safe)
- `index.ts` - Error utility exports
- `transform.ts` - Error transformation utilities

### Transformers
**Location**: `shared/utils/transformers/`  
**Status**: ✅ Fully Client-Safe  
**Files**:
- `base.ts` - Base transformer interface
- `types.ts` - Transformer types
- `registry.ts` - Transformer registry
- `entities/` - Entity-specific transformers

---

## ❌ Server-Only Utilities (Moved to Server Layer)

These utilities have been moved to the server layer and should NOT be imported in client code.

### Moved to `server/utils/`
- ❌ `response-helpers.ts` - Express Response helpers
- ❌ `correlation-id.ts` - Express middleware (different from shared/utils/errors/correlation-id.ts)
- ❌ `api-utils.ts` - Server API utilities with logging
- ❌ `cache-utils.ts` - Server cache utilities
- ❌ `anonymity-service.ts` - Server-side anonymity service

---

## Usage Guidelines

### For Client Code

```typescript
// ✅ GOOD - Import from shared utilities
import { formatDate } from '@shared/core/utils/formatting/date-time';
import { sanitizeInput } from '@shared/core/utils/security-utils';
import { debounce } from '@shared/core/utils/async-utils';

// ❌ BAD - Don't import server-only utilities
import { ResponseHelper } from '@shared/core/utils/response-helpers'; // Moved to server
import { logger } from '@shared/core/observability/logging'; // Server-only
```

### For Server Code

```typescript
// ✅ GOOD - Server can import from shared utilities
import { formatDate } from '@shared/core/utils/formatting/date-time';
import { sanitizeInput } from '@shared/core/utils/security-utils';

// ✅ GOOD - Server can import server-only utilities
import { ResponseHelper } from '@server/utils/response-helpers';
import { logger } from '@server/infrastructure/observability/logging';
```

---

## Conditional Features

Some utilities have features that only work in specific environments:

### Performance Utilities
- `process.memoryUsage()` - Node.js only
- `process.cpuUsage()` - Node.js only
- Browser performance APIs work in browser
- Functions gracefully handle missing APIs

### Security Utilities
- Crypto-based functions (encryption, hashing) - Node.js only
- Sanitization functions - Work everywhere
- Functions check for crypto availability before use

---

## ESLint Rules (Recommended)

To prevent accidental imports of server-only code in client:

```javascript
// .eslintrc.js (client)
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@shared/core/observability/*',
          '@shared/core/caching/*',
          '@shared/core/middleware/*',
          '@shared/core/config/*',
          '@server/*'
        ]
      }
    ]
  }
};
```

---

## Testing Client-Safety

To verify a utility is client-safe:

1. ✅ No imports from `observability/`, `caching/`, `middleware/`, `config/`
2. ✅ No imports from `express`, `redis`, `pg`, `drizzle`, or other server-only packages
3. ✅ No usage of Node.js-only APIs without conditional checks
4. ✅ Can be bundled for browser without errors
5. ✅ Works in browser environment

---

## Summary Statistics

| Category | Total Files | Client-Safe | Server-Only | Conditional |
|----------|-------------|-------------|-------------|-------------|
| Core Utils | 20 | 16 | 0 | 4 |
| Formatting | 6 | 6 | 0 | 0 |
| Images | 1 | 1 | 0 | 0 |
| Shared Utils | 2 dirs | 2 dirs | 0 | 0 |
| **Total** | **~29** | **~25** | **0** | **~4** |

**Client-Safe Percentage**: ~86% (25/29)  
**Conditional Features**: ~14% (4/29)

---

## Maintenance

When adding new utilities to `shared/core/utils/`:

1. ✅ Ensure no server-only dependencies
2. ✅ Use conditional imports for Node.js-only APIs
3. ✅ Add CLIENT-SAFE comment in file header
4. ✅ Update this documentation
5. ✅ Add tests that run in both Node.js and browser
6. ✅ Document any conditional features

---

## Related Documentation

- `SHARED_LAYER_AUDIT.md` - Audit of server-only code in shared layer
- `SHARED_UTILITIES_CONSOLIDATION.md` - Consolidation plan for duplicate utilities
- `TASK_11.2_COMPLETION_SUMMARY.md` - Summary of server-only code migration
