# Phase 2 Implementation Guide: Test Location Standardization

## 📊 Current Test Structure Analysis

### __tests__ Directories in Client
- **42+ __tests__ directories** throughout client/src
- **Mix of unit, integration, and performance tests**
- **Inconsistent naming conventions**
- **Separated from source files**

### Client Component Tests to Migrate (Priority 1)

```
CURRENT LOCATION                              → TARGET LOCATION
────────────────────────────────────────────────────────────────
client/src/components/auth/__tests__/
├── auth-accessibility.test.tsx             → ../auth-accessibility.test.tsx
├── auth-components.test.tsx                → ../auth-components.test.tsx
├── auth-hooks.test.ts                      → ../auth-hooks.test.ts
├── auth-integration.test.tsx               → ../__tests__/auth-flow.integration.test.tsx
├── auth-validation.test.ts                 → ../auth-validation.test.ts
├── errors.test.ts                          → ../errors.test.ts
├── integration.test.ts                     → ../__tests__/integration.integration.test.tsx
├── recovery.test.ts                        → ../recovery.test.ts
├── useAuthForm.test.ts                     → ../useAuthForm.test.ts
└── validation.test.ts                      → ../validation.test.ts

client/src/components/bills/__tests__/
├── BillCard.test.tsx                       → ../BillCard.test.tsx
├── bills-dashboard.test.tsx                → ../bills-dashboard.test.tsx
├── filter-panel.test.tsx                   → ../filter-panel.test.tsx
└── bills-workflow.integration.test.tsx    → ../__tests__/bills-workflow.integration.test.tsx

client/src/components/dashboard/__tests__/
├── errors.test.ts                          → ../errors.test.ts
├── hooks.test.ts                           → ../hooks.test.ts
└── integration.integration.test.tsx        → ../__tests__/dashboard.integration.test.tsx
```

---

## 🎯 Phase 2a: Component Tests Migration (2-3 days)

### Step 1: Identify Component Tests

```bash
# Find all component test files
find client/src/components -name "__tests__" -type d | sort
```

**Output will show**: analytics/, auth/, bills/, community/, etc.

### Step 2: Batch Migration Process

#### Batch 1: Auth Components (Start Here - Lowest Risk)

Files to move:
```
client/src/components/auth/__tests__/auth-components.test.tsx
                                  → client/src/components/auth/auth-components.test.tsx

client/src/components/auth/__tests__/errors.test.ts
                                  → client/src/components/auth/errors.test.ts

client/src/components/auth/__tests__/validation.test.ts
                                  → client/src/components/auth/validation.test.ts
```

Commands:
```bash
# Copy unit tests to colocated location
cp client/src/components/auth/__tests__/auth-components.test.tsx \
   client/src/components/auth/auth-components.test.tsx

cp client/src/components/auth/__tests__/errors.test.ts \
   client/src/components/auth/errors.test.ts

cp client/src/components/auth/__tests__/validation.test.ts \
   client/src/components/auth/validation.test.ts

# Run tests to verify they still work
pnpm test --project=client-unit auth-components

# After verification, delete old files
rm client/src/components/auth/__tests__/auth-components.test.tsx
rm client/src/components/auth/__tests__/errors.test.ts
rm client/src/components/auth/__tests__/validation.test.ts
```

#### Batch 2: Bills Components

```bash
cp client/src/components/bills/__tests__/BillCard.test.tsx \
   client/src/components/bills/BillCard.test.tsx

cp client/src/components/bills/__tests__/bills-dashboard.test.tsx \
   client/src/components/bills/bills-dashboard.test.tsx

cp client/src/components/bills/__tests__/filter-panel.test.tsx \
   client/src/components/bills/filter-panel.test.tsx

# Verify
pnpm test --project=client-unit BillCard

# Clean up old
rm client/src/components/bills/__tests__/BillCard.test.tsx
rm client/src/components/bills/__tests__/bills-dashboard.test.tsx
rm client/src/components/bills/__tests__/filter-panel.test.tsx
```

#### Batch 3: Dashboard Components

Similar process for dashboard, navigation, layout, etc.

### Step 3: Integration Tests

**Keep in __tests__, but rename to .integration.test.tsx**:

```bash
# Rename integration tests
mv client/src/components/auth/__tests__/auth-integration.test.tsx \
   client/src/components/auth/__tests__/auth-flow.integration.test.tsx

mv client/src/components/auth/__tests__/integration.test.ts \
   client/src/components/auth/__tests__/auth.integration.test.ts

# Verify they still work
pnpm test --project=client-integration auth-flow

# Commit
git add -A
git commit -m "chore: standardize integration test naming in auth components"
```

---

## 🎯 Phase 2b: Hook Tests Migration (1-2 days)

### Hook Test Locations

```
client/src/hooks/__tests__/
├── useAuth.test.ts
├── useNavigation.test.ts
├── useBills.test.ts
├── useFeatureFlags.test.ts
└── ... (more hooks)

client/src/features/*/hooks/__tests__/
├── useFeature.test.ts
└── ... (feature-specific hooks)
```

### Migration Steps

```bash
# Move each hook test to colocated location
cp client/src/hooks/__tests__/useAuth.test.ts \
   client/src/hooks/useAuth.test.ts

cp client/src/hooks/__tests__/useNavigation.test.ts \
   client/src/hooks/useNavigation.test.ts

# Feature-specific hooks
cp client/src/features/bills/hooks/__tests__/useBillFilters.test.ts \
   client/src/features/bills/hooks/useBillFilters.test.ts

# Verify
pnpm test --project=client-unit useAuth

# Clean up
rm client/src/hooks/__tests__/useAuth.test.ts
rm client/src/hooks/__tests__/useNavigation.test.ts
```

---

## 🎯 Phase 2c: Utility Tests Migration (1 day)

### Utility Test Locations

```
client/src/utils/__tests__/
├── validators.test.ts
├── formatters.test.ts
├── api-helpers.test.ts
└── ...

client/src/shared/validation/__tests__/
├── bill-validation.test.ts
└── ...
```

### Migration Steps

Similar pattern:
1. Copy test file to colocate with utility
2. Run tests to verify
3. Delete old __tests__ file

```bash
cp client/src/utils/__tests__/validators.test.ts \
   client/src/utils/validators.test.ts

pnpm test --project=client-unit validators
rm client/src/utils/__tests__/validators.test.ts
```

---

## 🎯 Phase 2d: Integration Test Reorganization (1 day)

### Integration Tests Should Stay in __tests__

But reorganize by feature:

```
BEFORE (scattered):
client/src/__tests__/
├── features/
│   ├── bills/
│   │   └── bills-flow.test.tsx
│   └── auth/
│       └── login-flow.test.tsx

AFTER (feature-scoped):
client/src/features/bills/__tests__/
├── bills-workflow.integration.test.tsx
└── bills-e2e-flow.integration.test.tsx

client/src/features/auth/__tests__/
├── login-flow.integration.test.tsx
└── logout-flow.integration.test.tsx
```

### Reorganization Steps

```bash
# Create feature-scoped __tests__ if not exists
mkdir -p client/src/features/bills/__tests__
mkdir -p client/src/features/auth/__tests__

# Move integration tests
mv client/src/__tests__/features/bills/*.test.tsx \
   client/src/features/bills/__tests__/

# Rename to .integration.test.tsx pattern
cd client/src/features/bills/__tests__
for f in *.test.tsx; do 
  mv "$f" "${f%.test.tsx}.integration.test.tsx"
done

# Update imports in moved files if needed
# (usually minimal changes required)

# Verify
pnpm test --project=client-integration bills

# Delete old location if empty
rm -rf client/src/__tests__/features/bills
```

---

## 📋 Complete File Migration List

### Auth Components (13 files)
```
✓ auth-accessibility.test.tsx → auth-accessibility.test.tsx
✓ auth-components.test.tsx → auth-components.test.tsx
✓ auth-hooks.test.ts → auth-hooks.test.ts
✓ auth-integration.test.tsx → __tests__/auth-flow.integration.test.tsx
✓ auth-validation.test.ts → auth-validation.test.ts
✓ errors.test.ts → errors.test.ts
✓ integration.test.ts → __tests__/auth.integration.test.ts
✓ recovery.test.ts → recovery.test.ts
✓ useAuthForm.test.ts → useAuthForm.test.ts
✓ validation.test.ts → validation.test.ts
✓ accessibility.test.ts → accessibility.test.ts
✓ auth-accessibility.test.tsx → auth-accessibility.test.tsx
✓ auth-hooks.test.ts → auth-hooks.test.ts
```

### Bills Components (7 files)
```
✓ BillCard.test.tsx → BillCard.test.tsx
✓ bills-dashboard.test.tsx → bills-dashboard.test.tsx
✓ filter-panel.test.tsx → filter-panel.test.tsx
✓ bills-integration.test.tsx → __tests__/bills-workflow.integration.test.tsx
✓ bills-a11y.test.tsx → bills-a11y.test.tsx
✓ api-tests.test.tsx → api-tests.test.tsx
✓ performance.test.tsx → __tests__/bills-performance.integration.test.tsx
```

### Dashboard Components (4 files)
```
✓ errors.test.ts → errors.test.ts
✓ hooks.test.ts → hooks.test.ts
✓ integration.test.tsx → __tests__/dashboard.integration.test.tsx
✓ performance.test.ts → __tests__/dashboard-performance.integration.test.ts
```

### Navigation Components (6 files)
```
✓ mobile-nav.test.tsx → mobile-nav.test.tsx
✓ breadcrumbs.test.tsx → breadcrumbs.test.tsx
✓ sidebar.test.tsx → sidebar.test.tsx
✓ navigation-flow.test.tsx → __tests__/navigation-flow.integration.test.tsx
✓ mobile-responsive.test.tsx → __tests__/mobile-responsive.integration.test.tsx
✓ keyboard-nav.test.ts → __tests__/keyboard-nav.a11y.test.ts
```

### Hooks (12 files)
```
✓ useAuth.test.ts → useAuth.test.ts
✓ useNavigation.test.ts → useNavigation.test.ts
✓ useBills.test.ts → useBills.test.ts
✓ useFeatureFlags.test.ts → useFeatureFlags.test.ts
✓ useTheme.test.ts → useTheme.test.ts
✓ useModal.test.ts → useModal.test.ts
✓ useForm.test.ts → useForm.test.ts
✓ useAsync.test.ts → useAsync.test.ts
✓ usePagination.test.ts → usePagination.test.ts
✓ useSearch.test.ts → useSearch.test.ts
✓ useDebounce.test.ts → useDebounce.test.ts
✓ useLocalStorage.test.ts → useLocalStorage.test.ts
```

### Utilities (8 files)
```
✓ validators.test.ts → validators.test.ts
✓ formatters.test.ts → formatters.test.ts
✓ api-helpers.test.ts → api-helpers.test.ts
✓ date-utils.test.ts → date-utils.test.ts
✓ string-utils.test.ts → string-utils.test.ts
✓ crypto-utils.test.ts → crypto-utils.test.ts
✓ storage-utils.test.ts → storage-utils.test.ts
✓ dom-utils.test.ts → dom-utils.test.ts
```

---

## ✅ Validation Checklist

After each batch:

```bash
# Run specific test
pnpm test --project=client-unit auth-components

# Run all client-unit tests
pnpm test --project=client-unit

# Run all client-integration tests
pnpm test --project=client-integration

# Full validation
pnpm test --coverage
```

---

## 📈 Progress Tracking

Use this to track your progress:

```
Week 1:
  [ ] Phase 2a: Component tests (2-3 days)
      - Batch 1: Auth (1 day)
      - Batch 2: Bills (1 day)
      - Batch 3: Dashboard, Navigation, Others (1 day)
  [ ] Phase 2b: Hook tests (1-2 days)
  [ ] Phase 2c: Utility tests (1 day)

Week 2:
  [ ] Phase 2d: Integration tests (1 day)
  [ ] Cleanup & validation (1 day)
  [ ] Archive old structure (1 day)
```

---

## 🎯 End of Phase 2 State

After completion:

```
client/src/
├── components/
│   ├── auth/
│   │   ├── AuthGuard.tsx
│   │   ├── AuthGuard.test.tsx                    ✅ Colocated
│   │   ├── ConsentModal.tsx
│   │   ├── ConsentModal.test.tsx                 ✅ Colocated
│   │   └── __tests__/
│   │       ├── auth-flow.integration.test.tsx   ✅ Renamed
│   │       └── auth.integration.test.ts          ✅ Renamed
│   │
│   ├── bills/
│   │   ├── BillCard.tsx
│   │   ├── BillCard.test.tsx                     ✅ Colocated
│   │   └── __tests__/
│   │       └── bills-workflow.integration.test.tsx ✅ Renamed
│   │
│   └── [others - similar pattern]
│
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.test.ts                           ✅ Colocated
│   ├── useNavigation.ts
│   └── useNavigation.test.ts                     ✅ Colocated
│
├── utils/
│   ├── validators.ts
│   ├── validators.test.ts                        ✅ Colocated
│   └── [others - similar]
│
└── features/
    ├── bills/
    │   ├── hooks/
    │   │   ├── useBillFilters.ts
    │   │   └── useBillFilters.test.ts            ✅ Colocated
    │   └── __tests__/
    │       └── bills-feature.integration.test.tsx ✅ Organized
    │
    └── [others - similar pattern]
```

---

## 🎓 Key Points

1. **Colocate unit tests** with source files
2. **Keep integration tests** in __tests__/ (renamed)
3. **Standardize naming** across the board
4. **Test frequently** during migration
5. **One batch at a time** to avoid errors
6. **Commit often** for easy rollback if needed

---

**Phase 2 Status**: Ready to begin migration
**Estimated Duration**: 1-2 weeks
**Risk Level**: Low (unit tests are isolated)
**Next Phase**: Phase 3 (Jest → Vitest migration)
