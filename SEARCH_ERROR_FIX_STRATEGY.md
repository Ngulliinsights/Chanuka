# Search System Error Fix Strategy

## Current Status: 74 ERRORS REMAINING

### Error Breakdown by File

1. **fuse-search.engine.ts**: 18 errors
2. **simple-matching.engine.ts**: 9 errors  
3. **fuzzy-matching.engine.ts**: 4 errors
4. **suggestion-engine.service.ts**: 45 errors

---

## STRATEGY: Fix in Order of Dependency

### Phase 1: Fix Import Resolution (CRITICAL)
**Files**: fuse-search.engine.ts, simple-matching.engine.ts, fuzzy-matching.engine.ts

**Problem**: `Cannot find module '@server/infrastructure/database'`

**Root Cause Analysis**:
- The import `import { database } from '@server/infrastructure/database'` is failing
- Need to verify what's actually exported from `server/infrastructure/database/index.ts`
- May need to use relative imports instead of path aliases

**Solution Options**:
1. Check if `database` is actually exported from the index
2. If not, import from the correct file (likely `connection.ts`)
3. Use relative imports as fallback: `import { database } from '../../../../infrastructure/database/connection'`

**Action Items**:
- [ ] Read `server/infrastructure/database/connection.ts` to find `database` export
- [ ] Update all 3 files with correct import path
- [ ] Verify imports resolve correctly

---

### Phase 2: Fix Type Safety Issues
**Files**: All 4 files

**Problem Categories**:

#### A. Missing Type Annotations (7 errors)
- `Parameter 'bill' implicitly has an 'any' type` (3 instances)
- `'bill' is of type 'unknown'` (6 instances)
- `'sponsor' is of type 'unknown'` (6 instances)
- `'comment' is of type 'unknown'` (5 instances)

**Solution**: Add explicit type annotations
```typescript
// Before
.map(bill => ({ ... }))

// After
.map((bill: any) => ({ ... }))
// OR better
.map((bill: Bill) => ({ ... }))
```

#### B. Missing Properties (4 errors)
- `Property 'offset' does not exist on type '{ page: number; limit: number; }'`

**Solution**: Add offset calculation or fix pagination type
```typescript
// Option 1: Calculate offset
const offset = (pagination.page - 1) * pagination.limit;

// Option 2: Fix type definition
interface Pagination {
  page: number;
  limit: number;
  offset?: number;
}
```

#### C. Undefined Object Access (8 errors)
- `Object is possibly 'undefined'`

**Solution**: Add null checks or optional chaining
```typescript
// Before
metadata.totalResults

// After
metadata?.totalResults ?? 0
```

---

### Phase 3: Fix Suggestion Engine Specific Issues
**File**: suggestion-engine.service.ts (45 errors)

#### A. Invalid Suggestion Types (8 errors)
**Problem**: Custom types not in enum
- `Type '"ai_correction"' is not assignable to type '...'`
- `Type '"related_term"' is not assignable to type '...'`
- `Type '"phonetic_correction"' is not assignable to type '...'`
- `Type '"contextual_suggestion"' is not assignable to type '...'`

**Solution**: Update SearchSuggestion type definition to include these types
```typescript
// In search.types.ts
export type SuggestionType = 
  | 'bill_title'
  | 'sponsor'
  | 'category'
  | 'tag'
  | 'popular'
  | 'recent'
  | 'ai_correction'        // ADD
  | 'related_term'         // ADD
  | 'phonetic_correction'  // ADD
  | 'contextual_suggestion'; // ADD
```

#### B. Missing Metadata Properties (4 errors)
**Problem**: `'originalQuery' does not exist in type`

**Solution**: Update metadata type
```typescript
// In search.types.ts
metadata?: {
  bill_id?: number;
  sponsor_id?: number;
  category?: string;
  description?: string;
  originalQuery?: string;  // ADD
};
```

#### C. Variable Name Typo (1 error)
**Problem**: `Cannot find name 'startDate'. Did you mean 'start_date'?`

**Solution**: Simple rename
```typescript
// Line 796
startDate  // WRONG
start_date // CORRECT
```

#### D. Unknown Types (18 errors)
**Problem**: `'pt' is of type 'unknown'`, `'data' is of type 'unknown'`, etc.

**Solution**: Add type assertions
```typescript
// Before
popularTerms.forEach(pt => pt.term)

// After
popularTerms.forEach((pt: any) => (pt as PopularTerm).term)
```

---

## EXECUTION PLAN

### Step 1: Fix Import Resolution (15 minutes)
1. Read `server/infrastructure/database/connection.ts`
2. Identify correct export name
3. Update imports in 3 files:
   - fuse-search.engine.ts
   - simple-matching.engine.ts
   - fuzzy-matching.engine.ts

### Step 2: Fix Type Definitions (10 minutes)
1. Update `search.types.ts` to add missing suggestion types
2. Update metadata interface to include `originalQuery`
3. Verify changes don't break other files

### Step 3: Fix Type Annotations (20 minutes)
1. Add `(bill: any)` to all map functions
2. Add `(sponsor: any)` to all map functions
3. Add `(comment: any)` to all map functions
4. Add type assertions for unknown types

### Step 4: Fix Pagination Issues (10 minutes)
1. Calculate offset from page/limit
2. OR update pagination type to include offset

### Step 5: Fix Null Safety (15 minutes)
1. Add optional chaining `?.` where needed
2. Add nullish coalescing `??` for defaults
3. Add explicit null checks where required

### Step 6: Fix Variable Typo (1 minute)
1. Rename `startDate` to `start_date` on line 796

### Step 7: Remove Unused Imports (5 minutes)
1. Remove unused `pool`, `eq`, `phoneticMap`, `data`, etc.

---

## VERIFICATION CHECKLIST

After each phase:
- [ ] Run diagnostics on affected files
- [ ] Verify error count decreased
- [ ] No new errors introduced
- [ ] Code still logically correct

Final verification:
- [ ] All 74 errors resolved
- [ ] No compilation errors
- [ ] No blocking warnings
- [ ] Search functionality intact

---

## ESTIMATED TIME: 76 minutes (1.25 hours)

## PRIORITY: CRITICAL - BLOCKING DEPLOYMENT

---

## FALLBACK STRATEGY

If path alias imports continue to fail:
1. Convert ALL imports to relative paths
2. Update tsconfig.json if needed
3. Restart TypeScript language server
4. Clear node_modules and reinstall if necessary

---

## SUCCESS CRITERIA

✅ All 8 search engine files compile without errors
✅ TypeScript diagnostics show 0 errors
✅ Only non-blocking warnings remain (unused vars, etc.)
✅ Search functionality works end-to-end
