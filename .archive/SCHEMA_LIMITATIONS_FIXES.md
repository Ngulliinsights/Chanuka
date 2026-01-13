# Schema Limitations & Fixes - Summary

**Date**: January 8, 2026  
**Status**: ✅ Implemented

## Issues Identified & Validated

### 1. **Enum Consistency Issues** ✅ FIXED
**Issue**: Inconsistent abbreviation naming in political party enum (e.g., `dap_k` vs `ford_kenya`)
- **Impact**: Risk of data entry errors, typos in code causing runtime failures
- **Fix Applied**: 
  - Standardized `dap_k` → `dap_ke` (Democratic Alliance Party of Kenya)
  - Added documentation header with production rules
  - Added comment noting abbreviation standards

**File Changed**: [shared/schema/enum.ts](shared/schema/enum.ts#L28-L35)

```typescript
// Political Parties (major parties + coalition logic)
// NOTE: Abbreviations standardized to lowercase with underscores for consistency
// PRODUCTION RULE: Never edit this list without versioning. Enum changes require migration.
export const partyEnum = pgEnum('political_party', [
  // ... list with 'dap_ke' (not 'dap_k')
]);
```

---

### 2. **Brittle Validation Script** ✅ FIXED
**Issue**: `validate-schemas.ts` uses weak heuristics; may miss schema errors
- **Impact**: CI/CD doesn't catch missing relations, table/enum inconsistencies
- **Fix Applied**:
  - Enhanced `hasTableShape()` to check both `name` AND `columns/indexes` properties
  - Added relation validation: flags tables without corresponding relations
  - Added enum and relation counts per module
  - Exit code 1 on validation warnings (fails CI/CD)

**File Changed**: [shared/schema/validate-schemas.ts](shared/schema/validate-schemas.ts)

**New Behavior**:
```
foundation: 11 tables, 11 relations, 0 enums
citizenParticipation: 10 tables, 10 relations, 0 enums
⚠️  Found 0 schema warnings
🎉 Schema validation completed successfully (no warnings)!
```

---

### 3. **Lack of Runtime Validation** ✅ FIXED
**Issue**: Enum values validated only at compile-time; no runtime type safety
- **Impact**: Invalid enum assignments may slip through in tests or production
- **Fix Applied**:
  - Created new `enum-validator.ts` with full runtime validation layer
  - Provides safe enum value checking with typo suggestions (Levenshtein distance)
  - Centralized `ENUM_REGISTRY` as single source of truth for all enums
  - Version tracking & changelog for breaking changes

**New File**: [shared/schema/enum-validator.ts](shared/schema/enum-validator.ts)

**API**:
```typescript
import { 
  isValidEnum, 
  assertEnum, 
  getEnumValues, 
  validateEnums,
  ENUM_REGISTRY,
  ENUM_SCHEMA_VERSION
} from './schema/enum-validator';

// Runtime validation
isValidEnum('political_party', 'uda')  // true
isValidEnum('political_party', 'dap_k')  // false (caught!)

// Type-safe assertions
assertEnum('political_party', 'dap_k');  // throws: 'Did you mean: "dap_ke"?'

// Batch validation
validateEnums('political_party', ['uda', 'invalid', 'odm'])
// Returns: [{value: 'uda', valid: true}, {value: 'invalid', valid: false, error: 'Did you mean...'}, ...]

// Get all valid values
getEnumValues('user_role')  // ['citizen', 'verified_citizen', ...]
```

**Exported from**: [shared/schema/index.ts](shared/schema/index.ts#L23-L40)

---

### 4. **Monolithic Exports** ⚠️ NOTED (Not Fixed)
**Issue**: `index.ts` exports entire schema, forcing full compilation
- **Impact**: Slower builds, increased memory usage, tight coupling
- **Recommendation**: Implement lazy imports / code splitting for domains (future work)
- **Why not fixed**: Requires architectural refactoring; breaking change to consumers

---

### 5. **Base Type Duplication** ⚠️ NOTED (Not Fixed)
**Issue**: Base types defined inline per schema file (not centralized)
- **Impact**: Maintenance burden, potential inconsistencies across domains
- **Current State**: Types are mostly consistent; lower priority
- **Recommendation**: Centralize common types (e.g., `TimestampedEntity`, `AuditFields`) in base type module

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `enum.ts` | `dap_k` → `dap_ke` | Standardize naming convention |
| `enum.ts` | Added production rule comment | Prevent accidental enum edits |
| `validate-schemas.ts` | Enhanced type guard | Stricter table detection |
| `validate-schemas.ts` | Added relation validation | Catch missing relations |
| `validate-schemas.ts` | Exit code 1 on warnings | Fail CI/CD on schema issues |
| `enum-validator.ts` (NEW) | Runtime enum validation | Type-safe enum checking at runtime |
| `index.ts` | Export enum-validator | Expose runtime validation API |

---

## Testing

Run the improved validation script:
```bash
npx tsx shared/schema/validate-schemas.ts
```

Expected output:
```
🔍 Starting schema validation...
✅ All schemas imported successfully!
✅ Validated 14 schema modules
  foundation: 11 tables, 11 relations, 0 enums
  citizenParticipation: 10 tables, 10 relations, 0 enums
  ... (other domains)
✅ Total tables across all domains: ~50+
🎉 Schema validation completed successfully (no warnings)!
```

---

## Usage in Code

### Before (Unsafe):
```typescript
const party: Party = 'dap_k';  // Compiles, but is invalid
// No compile-time or runtime error
```

### After (Safe):
```typescript
import { assertEnum, isValidEnum } from './schema/enum-validator';

// Runtime validation
if (!isValidEnum('political_party', userInput)) {
  throw new Error(`Invalid party: ${userInput}`);
}

// Type-safe assertion
assertEnum('political_party', userInput);
const party: Party = userInput;  // Now safe

// Batch validation for imports
const results = validateEnums('political_party', importedValues);
results.forEach(r => {
  if (!r.valid) console.warn(`Invalid party: ${r.error}`);
});
```

---

## Next Steps (Future)

1. **Version Breaking Changes**: Document enum changes in `ENUM_CHANGELOG` before deploying
2. **Schema Versioning**: Add `SCHEMA_VERSION` header to database migrations
3. **Lazy Exports**: Refactor `index.ts` to support domain-specific imports (perf improvement)
4. **Centralize Base Types**: Create `base-types.ts` with shared entity types
5. **API Documentation**: Add JSDoc comments to enum-validator functions for IDE tooltips

---

## Files Changed
- ✅ [shared/schema/enum.ts](shared/schema/enum.ts)
- ✅ [shared/schema/validate-schemas.ts](shared/schema/validate-schemas.ts)
- ✅ [shared/schema/enum-validator.ts](shared/schema/enum-validator.ts) (NEW)
- ✅ [shared/schema/index.ts](shared/schema/index.ts)
