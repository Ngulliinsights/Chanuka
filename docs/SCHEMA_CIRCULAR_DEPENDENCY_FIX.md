# Schema Circular Dependency Fix Plan

**Date**: February 24, 2026  
**Issue**: 3 circular dependencies in server schema files  
**Priority**: Low (no runtime impact, architectural consistency)

---

## Problem Analysis

### Current Circular Dependencies

1. `foundation.ts` → `participation_oversight.ts` → `foundation.ts`
2. `foundation.ts` → `political_economy.ts` → `foundation.ts`
3. `foundation.ts` → `trojan_bill_detection.ts` → `foundation.ts`

### Root Cause

**foundation.ts imports specialized schemas for relations:**
```typescript
import { participation_quality_audits } from "./participation_oversight";
import { political_appointments } from "./political_economy";
import { trojan_bill_analysis } from "./trojan_bill_detection";

// Used in relations:
export const usersRelations = relations(users, ({ many }) => ({
  audits: many(participation_quality_audits, { relationName: "auditor" }),
  // ...
}));

export const billsRelations = relations(bills, ({ many, one }) => ({
  audits: many(participation_quality_audits),
  trojanAnalysis: one(trojan_bill_analysis, {
    fields: [bills.id],
    references: [trojan_bill_analysis.bill_id],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ many }) => ({
  appointments: many(political_appointments),
}));
```

**Specialized schemas import foundation entities:**
```typescript
// participation_oversight.ts
import { bills, users } from "./foundation";

// political_economy.ts
import { sponsors } from "./foundation";

// trojan_bill_detection.ts
import { bills, users } from "./foundation";
```

---

## Solution Options

### Option A: Move Relations to Specialized Files (Recommended)

**Approach**: Define relations in the files where the related tables are defined.

**Changes Required**:

1. **Remove imports from foundation.ts**:
```typescript
// foundation.ts - REMOVE these lines
- import { participation_quality_audits } from "./participation_oversight";
- import { political_appointments } from "./political_economy";
- import { trojan_bill_analysis } from "./trojan_bill_detection";
```

2. **Move relations to specialized files**:

```typescript
// participation_oversight.ts - ADD
import { users, bills } from "./foundation";

export const participationQualityAuditsRelations = relations(participation_quality_audits, ({ one }) => ({
  bill: one(bills, {
    fields: [participation_quality_audits.bill_id],
    references: [bills.id],
  }),
  auditor: one(users, {
    fields: [participation_quality_audits.auditor_id],
    references: [users.id],
  }),
}));

// Also add reverse relations
export const usersAuditsRelations = relations(users, ({ many }) => ({
  audits: many(participation_quality_audits, { relationName: "auditor" }),
  createdAudits: many(participation_quality_audits, { relationName: "audit_creator" }),
  updatedAudits: many(participation_quality_audits, { relationName: "audit_updater" }),
}));

export const billsAuditsRelations = relations(bills, ({ many }) => ({
  audits: many(participation_quality_audits),
}));
```

```typescript
// political_economy.ts - ADD
import { sponsors } from "./foundation";

export const politicalAppointmentsRelations = relations(political_appointments, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [political_appointments.sponsor_id],
    references: [sponsors.id],
  }),
}));

// Also add reverse relations
export const sponsorsAppointmentsRelations = relations(sponsors, ({ many }) => ({
  appointments: many(political_appointments),
}));
```

```typescript
// trojan_bill_detection.ts - ADD
import { bills, users } from "./foundation";

export const trojanBillAnalysisRelations = relations(trojan_bill_analysis, ({ one }) => ({
  bill: one(bills, {
    fields: [trojan_bill_analysis.bill_id],
    references: [bills.id],
  }),
}));

// Also add reverse relations
export const billsTrojanAnalysisRelations = relations(bills, ({ one }) => ({
  trojanAnalysis: one(trojan_bill_analysis, {
    fields: [bills.id],
    references: [trojan_bill_analysis.bill_id],
  }),
}));
```

3. **Remove relations from foundation.ts**:
```typescript
// foundation.ts - REMOVE these relations
- export const usersRelations = relations(users, ({ many }) => ({
-   audits: many(participation_quality_audits, { relationName: "auditor" }),
-   createdAudits: many(participation_quality_audits, { relationName: "audit_creator" }),
-   updatedAudits: many(participation_quality_audits, { relationName: "audit_updater" }),
- }));

- export const billsRelations = relations(bills, ({ many, one }) => ({
-   audits: many(participation_quality_audits),
-   trojanAnalysis: one(trojan_bill_analysis, {
-     fields: [bills.id],
-     references: [trojan_bill_analysis.bill_id],
-   }),
- }));

- export const sponsorsRelations = relations(sponsors, ({ many }) => ({
-   appointments: many(political_appointments),
- }));
```

**Pros**:
- ✅ Eliminates circular dependencies
- ✅ Relations defined near related tables
- ✅ No breaking changes (Drizzle merges relations)
- ✅ Minimal code changes

**Cons**:
- ⚠️ Relations split across files (less centralized)
- ⚠️ Need to update multiple files

---

### Option B: Extract Core Entities

**Approach**: Create separate files for core entities (users, bills, sponsors).

**Structure**:
```
schema/
├── base-types.ts
├── enum.ts
├── entities/
│   ├── users.ts          # users table only
│   ├── bills.ts          # bills table only
│   └── sponsors.ts       # sponsors table only
├── foundation.ts         # Other foundation tables
├── participation_oversight.ts
├── political_economy.ts
└── trojan_bill_detection.ts
```

**Pros**:
- ✅ Eliminates circular dependencies
- ✅ More modular structure
- ✅ Easier to maintain individual entities

**Cons**:
- ⚠️ More files to manage
- ⚠️ Larger refactoring effort
- ⚠️ Need to update all imports

---

### Option C: Use Type-Only Imports

**Approach**: Import types only for relations, not runtime values.

```typescript
// foundation.ts
import type { participation_quality_audits } from "./participation_oversight";
import type { political_appointments } from "./political_economy";
import type { trojan_bill_analysis } from "./trojan_bill_detection";
```

**Pros**:
- ✅ Minimal code changes
- ✅ May satisfy madge (type-only imports)

**Cons**:
- ❌ Doesn't work - relations need runtime values
- ❌ Won't eliminate circular dependency

---

## Recommendation

**Use Option A: Move Relations to Specialized Files**

**Reasoning**:
1. Minimal code changes
2. No breaking changes
3. Relations defined near related tables (better cohesion)
4. Drizzle ORM merges relations from multiple files automatically
5. Eliminates circular dependencies completely

**Effort**: 1-2 hours  
**Risk**: Low (Drizzle handles relation merging)  
**Impact**: High (eliminates all schema circular dependencies)

---

## Implementation Steps

### Step 1: Move Relations (30 min)
1. Copy relations from foundation.ts to specialized files
2. Add reverse relations in specialized files
3. Remove relations from foundation.ts

### Step 2: Remove Imports (5 min)
1. Remove imports from foundation.ts
2. Verify no other usage of imported tables

### Step 3: Test (30 min)
1. Run TypeScript compilation
2. Run madge circular dependency check
3. Test database queries
4. Verify relations work correctly

### Step 4: Document (15 min)
1. Update schema documentation
2. Add comments explaining relation locations
3. Update ADRs if needed

---

## Testing Checklist

- [ ] TypeScript compiles without errors
- [ ] No circular dependencies detected by madge
- [ ] Database migrations work
- [ ] Relations queries work correctly
- [ ] No breaking changes to API

---

## Rollback Plan

If issues arise:
1. Revert changes to foundation.ts
2. Restore original imports
3. Keep relations in foundation.ts
4. Document as "acceptable circular dependency"

---

## Alternative: Accept as Low-Priority Technical Debt

**If we choose not to fix now:**

1. Document in technical debt backlog
2. Add comment in schema files explaining circular dependency
3. Monitor for any runtime issues (unlikely)
4. Address in future schema refactoring

**Justification**:
- No runtime impact
- Drizzle ORM handles this correctly
- Schema files are declarative
- Other priorities may be more important

---

## Conclusion

**Recommended Action**: Implement Option A (Move Relations)

**Timeline**: Can be done in 1-2 hours with low risk

**Alternative**: Document as technical debt and defer

**Decision**: Up to team priorities and available time

