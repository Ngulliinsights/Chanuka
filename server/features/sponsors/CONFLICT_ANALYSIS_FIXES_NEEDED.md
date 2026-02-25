# Sponsor Conflict Analysis Service - Fixes Needed

## Critical Issues Found

### 1. Logger Call Signature Errors
**Problem**: Pino logger expects `(context_object, message)` but code uses `(message, context_object)`

**Locations**: Lines 216, 225, 250, 257, 261, 272, 296, 299, 305, 318, 321, and many more

**Fix Pattern**:
```typescript
// WRONG
logger.info(`message`, { context });

// CORRECT  
logger.info({ context }, `message`);
```

### 2. Variable Name Errors
**Problem**: Using plural `sponsors` instead of singular `sponsor` variable

**Locations**: Lines 236-241, 250, 257, 261, 272, 296, 299, 481-483, 486, 497, 526-527, 540, 543, 548, 566-567, 579, 582, 587, 615-616, 629, 632, 637, 650-651, 663

**Examples**:
- Line 236: `sponsors.affiliations` should be `sponsor.affiliations`
- Line 250: `sponsors.id` should be `sponsor.id`
- Line 481: `sponsors.id` should be `sponsor.id`

### 3. Missing Schema Imports
**Problem**: References to `sponsors` and `bills` schema tables without imports

**Fix**: Add to imports at top:
```typescript
import { sponsors, bills } from '@server/infrastructure/schema';
```

### 4. Type Errors
**Problem**: Various type mismatches

**Locations**:
- Line 328: `startDate` should be `start_date`
- Line 353: Comparison operator on empty object `{}`
- Line 385: Property `message` doesn't exist on `{}`
- Line 426: `a` is of type `unknown`
- Lines 452-454: Property `id` doesn't exist on `any[]`
- Line 763: Invalid Date constructor argument
- Line 969: `string | undefined` not assignable to `string`

### 5. Unused Imports/Variables
**Warnings** (non-critical):
- Line 3: `Bill` imported but never used
- Line 363: `getThreshold` declared but never read
- Line 586, 636: `sponsor` variable declared but never read
- Line 761: `formatDate` declared but never read
- Line 948: `nodes` declared but never read

## Recommended Approach

Given the extensive nature of the errors (60+ issues), I recommend:

1. **Immediate**: Fix logger signatures throughout (search/replace pattern)
2. **Immediate**: Fix variable name errors (`sponsors` → `sponsor`, `bills` → `bill`)
3. **High Priority**: Add missing schema imports
4. **Medium Priority**: Fix type errors
5. **Low Priority**: Remove unused code

## Quick Fix Commands

### Fix Logger Signatures
Search for: `logger\.(info|warn|error|debug)\(`
Review each and ensure pattern: `logger.method({ context }, 'message')`

### Fix Variable Names
Search for: `sponsors\.` (when should be `sponsor\.`)
Search for: `bills\.` (when should be `bill\.`)

## Estimated Effort
- **Time**: 2-3 hours for complete fix
- **Risk**: Medium (many interconnected changes)
- **Testing**: Required after fixes

## Alternative: Rewrite
Consider rewriting this service with:
- Proper TypeScript types from the start
- Consistent naming conventions
- Proper logger usage patterns
- Better error handling
