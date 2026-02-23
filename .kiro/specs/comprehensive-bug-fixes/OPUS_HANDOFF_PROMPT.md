# 🔥 OPUS TASK: Server-Side Type Safety Cleanup

## MISSION BRIEF
Fix ~150-200 type safety violations in `server/features/` - the most complex part of the codebase with business logic, database operations, and API boundaries.

---

## CONTEXT
- **Project**: Comprehensive Bug Fixes (Phase 4 - Type Safety)
- **Current violations**: 438 (down from 788 baseline)
- **Your scope**: `server/features/` directory
- **Estimated violations in your scope**: 150-200
- **Complexity**: HIGH (business logic, DB queries, API responses)
- **Time estimate**: 4-6 hours

---

## QUICK START

### 1. Understand Current State
```bash
# See all violations
npm run scan:type-violations

# Check current test status
npx vitest run --config client/vitest.config.ts

# Verify TypeScript compilation
tsc --noEmit
```

### 2. Read These Files First
1. `.kiro/specs/comprehensive-bug-fixes/tasks.md` - Line 400-500 (Task 23.1)
2. `analysis-results/type-violations.json` - Current violations
3. `shared/utils/type-guards.ts` - Existing type guard utilities
4. `.kiro/specs/comprehensive-bug-fixes/design.md` - Requirements (optional)

### 3. High-Priority Files (Start Here)
```
server/features/bills/application/bill-service.ts              (12 violations) ⚠️
server/features/bills/bills-router.OLD.ts                      (11 violations) ⚠️
server/features/alert-preferences/application/...service.ts    (9 violations)
server/features/community/community.ts                         (9 violations)
server/features/analytics/middleware/analytics-context.ts      (6 violations)
server/features/analytics/transparency-dashboard.ts            (5 violations)
server/features/analytics/regulatory-change-monitoring.ts      (6 violations)
```

---

## VIOLATION PATTERNS & FIXES

### Pattern 1: Enum Conversions (Most Common - 156 total)
```typescript
// ❌ BAD
const status = data.status as any;
const role = user.role as any;

// ✅ GOOD - Use existing type guard utility
import { createEnumConverter } from '@/shared/utils/type-guards';

const statusConverter = createEnumConverter(BillStatus);
const status = statusConverter(data.status); // Throws descriptive error if invalid

// Or create inline type guard
function isBillStatus(value: unknown): value is BillStatus {
  return Object.values(BillStatus).includes(value as BillStatus);
}
const status = isBillStatus(data.status) ? data.status : BillStatus.DRAFT;
```

### Pattern 2: Database Operations (22 violations)
```typescript
// ❌ BAD
const result = await db.query('SELECT * FROM bills WHERE id = ?', [id]) as any;
const bill = result[0] as any;

// ✅ GOOD - Use Zod validation
import { z } from 'zod';

const BillRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.nativeEnum(BillStatus),
  created_at: z.string(),
  // ... all fields
});

const result = await db.query('SELECT * FROM bills WHERE id = ?', [id]);
const bill = BillRowSchema.parse(result[0]); // Validates structure
```

### Pattern 3: API Responses (10 violations)
```typescript
// ❌ BAD
const response = await fetch('/api/bills');
const data = await response.json() as any;

// ✅ GOOD - Validate with Zod
const BillResponseSchema = z.object({
  bills: z.array(BillSchema),
  total: z.number(),
  page: z.number(),
});

const response = await fetch('/api/bills');
const data = BillResponseSchema.parse(await response.json());
```

### Pattern 4: Dynamic Property Access (52 violations)
```typescript
// ❌ BAD
const value = obj[key] as any;

// ✅ GOOD - Type guard
function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

if (hasProperty(obj, key)) {
  const value = obj[key]; // Type-safe
}
```

### Pattern 5: Type Assertions (4 violations)
```typescript
// ❌ BAD
const config = getConfig() as any;

// ✅ GOOD - Validate structure
const ConfigSchema = z.object({
  apiKey: z.string(),
  timeout: z.number(),
});

const config = ConfigSchema.parse(getConfig());
```

---

## YOUR WORKFLOW

### Step 1: Scan & Prioritize (15 min)
```bash
npm run scan:type-violations
# Review analysis-results/type-violations.json
# Focus on server/features/ violations
# Start with files that have most violations
```

### Step 2: Fix High-Priority Files (3-4 hours)
For each file:
1. Read the file to understand context
2. Identify violation patterns
3. Apply appropriate fix pattern (see above)
4. Verify TypeScript compiles: `tsc --noEmit`
5. Run tests: `npx vitest run --config client/vitest.config.ts`

### Step 3: Batch Fix Similar Patterns (1-2 hours)
- Group similar violations (e.g., all enum conversions)
- Create reusable type guards if needed
- Apply fixes across multiple files

### Step 4: Verify & Document (30 min)
```bash
# Verify 0 violations in server/features/
npm run scan:type-violations

# Verify tests pass
npx vitest run --config client/vitest.config.ts

# Verify TypeScript compiles
tsc --noEmit
```

Create summary document (see template below)

---

## TOOLS & UTILITIES

### Existing Type Guards (`shared/utils/type-guards.ts`)
```typescript
// Already available - use these!
createEnumConverter<T>(enumObj: T): (value: unknown) => T[keyof T]
isValidEnum<T>(enumObj: T, value: unknown): value is T[keyof T]
isString(value: unknown): value is string
isNumber(value: unknown): value is number
isObject(value: unknown): value is Record<string, unknown>
```

### Create New Type Guards (if needed)
```typescript
// Add to shared/utils/type-guards.ts
export function isBillData(value: unknown): value is BillData {
  return (
    isObject(value) &&
    'id' in value &&
    'title' in value &&
    'status' in value &&
    isValidEnum(BillStatus, value.status)
  );
}
```

### Zod Schemas (create as needed)
```typescript
// Co-locate with code that uses them
// e.g., server/features/bills/schemas.ts
export const BillSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: z.nativeEnum(BillStatus),
  // ...
});
```

---

## SUCCESS CRITERIA

### Must Have ✅
- [ ] 0 violations in `server/features/` (verify with scanner)
- [ ] All tests pass (verify with vitest)
- [ ] TypeScript compiles (verify with tsc)
- [ ] Summary document created (see template below)

### Nice to Have 🎯
- [ ] Reusable type guards added to `shared/utils/type-guards.ts`
- [ ] Zod schemas organized in feature-specific files
- [ ] Comments explaining complex type narrowing
- [ ] Architectural issues documented

---

## SUMMARY DOCUMENT TEMPLATE

Create: `.kiro/specs/comprehensive-bug-fixes/OPUS_TASK_23.1_SUMMARY.md`

```markdown
# Task 23.1 Summary: Server Features Type Safety

## Completion Status
- **Start violations**: [number from initial scan]
- **End violations**: [number from final scan]
- **Violations fixed**: [difference]
- **Time taken**: [hours]

## Files Modified
[List of files with violation counts]

## Patterns Applied
1. Enum conversions: [count] fixed using createEnumConverter
2. Database operations: [count] fixed using Zod validation
3. API responses: [count] fixed using Zod schemas
4. Dynamic properties: [count] fixed using type guards
5. Other: [count] fixed using [method]

## New Utilities Created
- [ ] Type guards added to shared/utils/type-guards.ts
- [ ] Zod schemas created in [location]
- [ ] Other utilities: [description]

## Architectural Issues Found
[Any concerns about code structure, patterns, or design]

## Verification
- [x] Scanner shows 0 violations in server/features/
- [x] All tests pass
- [x] TypeScript compiles without errors

## Recommendations
[Any suggestions for future work or improvements]
```

---

## IMPORTANT NOTES

### DO ✅
- Use existing utilities from `shared/utils/type-guards.ts`
- Create Zod schemas for complex data structures
- Add descriptive error messages to type guards
- Test after each batch of fixes
- Document complex type narrowing with comments

### DON'T ❌
- Don't just replace `as any` with `as SomeType` (still unsafe!)
- Don't skip validation for "trusted" data sources
- Don't break existing tests
- Don't modify test files (those are separate task)
- Don't change business logic - only add type safety

### Test Code Exception
- Some `as any` in test files are acceptable (for invalid test data)
- Focus on production code in `server/features/`
- Test violations will be handled separately

---

## QUESTIONS?

### Where to find answers:
1. **Patterns**: Check `client/src/infrastructure/` for examples of fixes already done
2. **Requirements**: See `.kiro/specs/comprehensive-bug-fixes/design.md`
3. **Type guards**: See `shared/utils/type-guards.ts`
4. **Task details**: See `.kiro/specs/comprehensive-bug-fixes/tasks.md` (Task 23.1)

### Common issues:
- **"Type guard too complex"**: Break into smaller functions
- **"Zod schema too large"**: Split into smaller schemas and compose
- **"Tests failing"**: Check if test expects the old (unsafe) behavior
- **"TypeScript error after fix"**: The fix revealed a real bug - investigate

---

## READY TO START?

1. Run `npm run scan:type-violations` to see current state
2. Start with `server/features/bills/application/bill-service.ts` (12 violations)
3. Apply patterns from this guide
4. Verify with scanner after each file
5. Create summary document when complete

**Good luck! 🚀**

---

**Estimated completion**: 4-6 hours  
**Priority**: HIGH  
**Complexity**: HIGH  
**Impact**: Eliminates ~40% of remaining violations
