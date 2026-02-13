# Shared Utilities Consolidation

## Overview

This document identifies duplicate utility implementations across the codebase and provides a consolidation plan to establish a single source of truth in the shared layer.

**Date**: 2026-02-12  
**Spec**: Full-Stack Integration  
**Task**: 11.3 - Consolidate shared utilities  
**Requirements**: 7.1, 7.2, 7.5

## Current State Analysis

### Shared Layer Utilities

#### Location: `shared/core/utils/`

**Client-Safe Utilities** (Can remain in shared):
- ✅ `string-utils.ts` - String manipulation (client-safe)
- ✅ `number-utils.ts` - Number utilities (client-safe)
- ✅ `type-guards.ts` - Type guard functions (client-safe)
- ✅ `regex-patterns.ts` - Regex patterns (client-safe)
- ✅ `async-utils.ts` - Async utilities (client-safe)
- ✅ `common-utils.ts` - Common utilities (client-safe)
- ✅ `loading-utils.ts` - Loading state utilities (client-safe)
- ✅ `navigation-utils.ts` - Navigation utilities (client-safe)
- ✅ `dashboard-utils.ts` - Dashboard utilities (client-safe)
- ✅ `browser-logger.ts` - Browser-safe logger (client-safe)
- ✅ `anonymity-interface.ts` - Anonymity interface (client-safe)
- ✅ `constants.ts` - Constants (client-safe)
- ✅ `race-condition-prevention.ts` - Race condition utilities (client-safe)
- ✅ `concurrency-adapter.ts` - Concurrency adapter (client-safe)
- ✅ `concurrency-migration-router.ts` - Concurrency router (client-safe)

**Utilities with Server Dependencies** (Need cleanup):
- ⚠️ `data-utils.ts` - Has logger import (needs removal)
- ⚠️ `http-utils.ts` - Has logger import (needs removal)
- ⚠️ `performance-utils.ts` - Has logger import (needs removal)
- ⚠️ `security-utils.ts` - Has logger and crypto imports (needs review)

**Formatting Utilities** (Client-safe):
- ✅ `formatting/currency.ts` - Currency formatting
- ✅ `formatting/date-time.ts` - Date/time formatting
- ✅ `formatting/document.ts` - Document formatting
- ✅ `formatting/file-size.ts` - File size formatting
- ✅ `formatting/location.ts` - Location formatting
- ✅ `formatting/status.ts` - Status formatting
- ✅ `formatting/index.ts` - Formatting exports

**Image Utilities** (Client-safe):
- ✅ `images/image-utils.ts` - Image utilities

#### Location: `shared/utils/`

- ✅ `errors/` - Error utilities (client-safe types)
- ✅ `transformers/` - Data transformers (client-safe)
- ⚠️ `intelligent-cache.ts` - Cache utility (may have server dependencies)

---

## Duplicate Utility Analysis

### 1. Sanitization Functions (HIGH PRIORITY)

**Duplicates Found**:
1. `shared/core/utils/data-utils.ts` - `sanitizeString()`, `sanitizeObject()`
2. `shared/core/utils/security-utils.ts` - `sanitizeHtml()`, `sanitizeSql()`, `sanitizeFilename()`, `sanitizeUserInput()`
3. `server/utils/validation.ts` - `sanitizeInput()`
4. `server/infrastructure/core/validation/validation-utils.ts` - `sanitizeHtml()`, `sanitizeString()`
5. `server/features/search/application/search-service.ts` - `sanitizeSearchQuery()`
6. `client/src/lib/utils/input-validation.ts` - `sanitizeInput()`
7. `client/src/core/security/security-utils.ts` - `sanitizeInput()`, `sanitizeHTML()`, `sanitizeUrl()`
8. `client/src/core/auth/utils/security-helpers.ts` - `sanitizeInput()`
9. `client/src/core/auth/utils/validation.ts` - `sanitizeInput()`

**Recommendation**:
- **Canonical Location**: `shared/core/utils/security-utils.ts`
- **Action**: Consolidate all sanitization functions into security-utils.ts
- **Client-Safe**: Yes (after removing server-only dependencies)
- **Functions to Keep**:
  - `sanitizeString()` - General string sanitization
  - `sanitizeHtml()` - HTML sanitization
  - `sanitizeUrl()` - URL sanitization
  - `sanitizeFilename()` - Filename sanitization
  - `sanitizeUserInput()` - General user input sanitization
  - `sanitizeSql()` - SQL sanitization (server-only, move to server/utils)

---

### 2. Validation Functions (HIGH PRIORITY)

**Duplicates Found**:
1. `server/utils/validation.ts` - `validateEmail()`
2. `server/infrastructure/core/validation/validation-utils.ts` - `validateEmail()`, `validatePhone()`, `validateURL()`
3. `client/src/core/auth/utils/validation.ts` - Email, phone, password validation

**Recommendation**:
- **Canonical Location**: `shared/validation/schemas/` (using Zod)
- **Action**: Use Zod schemas for validation instead of custom functions
- **Client-Safe**: Yes (Zod works in browser)
- **Migration**: Replace custom validation functions with Zod schema validation

---

### 3. Date Formatting (MEDIUM PRIORITY)

**Duplicates Found**:
1. `shared/core/utils/formatting/date-time.ts` - `formatDate()`, `formatDateTime()`, `formatTime()`
2. Potentially in client utilities (need to verify)

**Recommendation**:
- **Canonical Location**: `shared/core/utils/formatting/date-time.ts`
- **Action**: Ensure all date formatting uses this module
- **Client-Safe**: Yes
- **Functions**: Keep all existing date formatting functions

---

### 4. Currency Formatting (MEDIUM PRIORITY)

**Duplicates Found**:
1. `shared/core/utils/formatting/currency.ts` - `formatCurrency()`
2. Potentially in client utilities (need to verify)

**Recommendation**:
- **Canonical Location**: `shared/core/utils/formatting/currency.ts`
- **Action**: Ensure all currency formatting uses this module
- **Client-Safe**: Yes
- **Functions**: Keep all existing currency formatting functions

---

### 5. HTTP Utilities (LOW PRIORITY)

**Duplicates Found**:
1. `shared/core/utils/http-utils.ts` - HTTP utilities
2. Potentially in client utilities (need to verify)

**Recommendation**:
- **Canonical Location**: `shared/core/utils/http-utils.ts`
- **Action**: Remove logger dependency, keep HTTP utilities
- **Client-Safe**: Yes (after removing logger)
- **Functions**: Keep HTTP status codes, error handling utilities

---

## Utilities Requiring Cleanup

### 1. Remove Server Dependencies from Shared Utilities

**Files Requiring Cleanup**:

#### `shared/core/utils/data-utils.ts`
- **Issue**: Imports logger from observability
- **Action**: Remove logger import, use console.warn for client-safe logging
- **Client-Safe After Cleanup**: Yes

#### `shared/core/utils/http-utils.ts`
- **Issue**: Imports logger from observability
- **Action**: Remove logger import, use console.warn for client-safe logging
- **Client-Safe After Cleanup**: Yes

#### `shared/core/utils/performance-utils.ts`
- **Issue**: Imports logger from observability
- **Action**: Remove logger import, use console.warn for client-safe logging
- **Client-Safe After Cleanup**: Yes

#### `shared/core/utils/security-utils.ts`
- **Issue**: Imports logger from observability and uses Node.js crypto
- **Action**: 
  - Remove logger import
  - Make crypto usage conditional (check if running in Node.js)
  - Provide browser-compatible alternatives where possible
- **Client-Safe After Cleanup**: Partially (some functions may remain server-only)

---

## Consolidation Plan

### Phase 1: Remove Server Dependencies (IMMEDIATE)

1. Update `data-utils.ts` to remove logger dependency
2. Update `http-utils.ts` to remove logger dependency
3. Update `performance-utils.ts` to remove logger dependency
4. Update `security-utils.ts` to remove logger dependency and make crypto conditional

### Phase 2: Consolidate Sanitization Functions (HIGH PRIORITY)

1. Review all sanitization implementations
2. Consolidate into `shared/core/utils/security-utils.ts`
3. Update all imports to use shared implementation
4. Remove duplicate implementations
5. Add tests for sanitization functions

### Phase 3: Consolidate Validation Functions (HIGH PRIORITY)

1. Create Zod schemas for common validation patterns
2. Move schemas to `shared/validation/schemas/`
3. Update code to use Zod schemas instead of custom functions
4. Remove duplicate validation functions
5. Add tests for validation schemas

### Phase 4: Verify Formatting Utilities (MEDIUM PRIORITY)

1. Audit all date formatting usage
2. Audit all currency formatting usage
3. Ensure all code uses shared formatting utilities
4. Remove any duplicate implementations

### Phase 5: Document Client-Safety (FINAL)

1. Add JSDoc comments indicating client-safety
2. Create utility index with client-safe indicators
3. Update documentation
4. Add ESLint rules to prevent server-only imports in shared utilities

---

## Client-Safe Utility Documentation

### Utilities Safe for Client Use

**String Utilities**:
- ✅ `shared/core/utils/string-utils.ts` - All functions
- ✅ `shared/core/utils/regex-patterns.ts` - All patterns

**Number Utilities**:
- ✅ `shared/core/utils/number-utils.ts` - All functions

**Type Utilities**:
- ✅ `shared/core/utils/type-guards.ts` - All functions

**Async Utilities**:
- ✅ `shared/core/utils/async-utils.ts` - All functions

**Common Utilities**:
- ✅ `shared/core/utils/common-utils.ts` - All functions

**Formatting Utilities**:
- ✅ `shared/core/utils/formatting/` - All functions

**UI Utilities**:
- ✅ `shared/core/utils/loading-utils.ts` - All functions
- ✅ `shared/core/utils/navigation-utils.ts` - All functions
- ✅ `shared/core/utils/dashboard-utils.ts` - All functions

**Logging**:
- ✅ `shared/core/utils/browser-logger.ts` - Browser-safe logger

**Data Utilities** (after cleanup):
- ✅ `shared/core/utils/data-utils.ts` - All functions (after removing logger)
- ✅ `shared/core/utils/http-utils.ts` - All functions (after removing logger)

**Security Utilities** (partial):
- ✅ `shared/core/utils/security-utils.ts` - Sanitization functions (after cleanup)
- ⚠️ Some functions may remain server-only (crypto-based)

**Transformers**:
- ✅ `shared/utils/transformers/` - All transformers

**Error Utilities**:
- ✅ `shared/utils/errors/` - Error types and transformations

---

## Utilities NOT Safe for Client Use

**Server-Only Utilities** (moved to server layer):
- ❌ `server/utils/response-helpers.ts` - Express Response helpers
- ❌ `server/utils/correlation-id.ts` - Express middleware
- ❌ `server/utils/api-utils.ts` - Server API utilities
- ❌ `server/utils/cache-utils.ts` - Server cache utilities
- ❌ `server/utils/anonymity-service.ts` - Server anonymity service

**Infrastructure**:
- ❌ `server/infrastructure/cache/` - Caching infrastructure
- ❌ `server/infrastructure/config/` - Configuration management
- ❌ `server/infrastructure/observability/` - Logging, monitoring, tracing

**Middleware**:
- ❌ `server/middleware/` - All Express middleware

---

## Implementation Checklist

### Immediate Actions
- [ ] Remove logger imports from data-utils.ts
- [ ] Remove logger imports from http-utils.ts
- [ ] Remove logger imports from performance-utils.ts
- [ ] Remove logger imports from security-utils.ts
- [ ] Make crypto usage conditional in security-utils.ts

### High Priority
- [ ] Consolidate sanitization functions into security-utils.ts
- [ ] Update all sanitization imports
- [ ] Remove duplicate sanitization implementations
- [ ] Create Zod schemas for common validation patterns
- [ ] Update validation code to use Zod schemas

### Medium Priority
- [ ] Audit date formatting usage
- [ ] Audit currency formatting usage
- [ ] Ensure all code uses shared formatting utilities

### Documentation
- [ ] Add JSDoc comments indicating client-safety
- [ ] Create CLIENT_SAFE_UTILITIES.md documentation
- [ ] Update shared/core/utils/index.ts with client-safe indicators
- [ ] Add ESLint rules to prevent server-only imports

---

## Success Criteria

1. ✅ All shared utilities are client-safe (no server-only dependencies)
2. ✅ No duplicate utility implementations across codebase
3. ✅ Clear documentation of which utilities are client-safe
4. ✅ All sanitization functions consolidated in one location
5. ✅ All validation uses Zod schemas
6. ✅ ESLint rules prevent server-only imports in shared layer

---

## Notes

- Some utilities may need to be split into client-safe and server-only versions
- Crypto-based security functions may need browser-compatible alternatives
- Validation should use Zod schemas for consistency
- All shared utilities should have tests
- Documentation should clearly indicate client-safety
