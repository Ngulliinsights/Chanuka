# Deprecated Client Directories - Cleanup Guide

**Date:** February 24, 2026  
**Status:** Directories removed, stale references remain  
**Priority:** Medium

## Overview

Three directories in `client/src/` have been deprecated and removed as part of the migration to Feature-Sliced Design (FSD) architecture:

1. `client/src/root/` → Migrated to `client/src/app/`
2. `client/src/pages/` → Migrated to `client/src/features/*/pages/`
3. `client/src/shared/` → Migrated to `client/src/lib/`

## Current Status

✅ **Directories physically removed** - No longer exist in filesystem  
✅ **All stale references fixed** - Updated to FSD structure  
✅ **No runtime imports** - No active code imports from deprecated paths  
✅ **Build configs updated** - Vite production config uses correct paths

## Fixes Implemented (February 24, 2026)

All stale references have been updated to the new Feature-Sliced Design structure:

### ✅ Fixed: `client/vite.production.config.ts`

**Before:**
```typescript
'bills-feature': [
  './src/components/bills',
  './src/pages/bills',
],
```

**After:**
```typescript
'bills-feature': [
  './src/features/bills',
],
```

---

### ✅ Fixed: `client/src/lib/utils/preload-optimizer.ts`

**Before:**
```typescript
href: '/src/pages/bills-dashboard-page.tsx',
```

**After:**
```typescript
href: '/src/features/bills/pages/bills-dashboard-page.tsx',
```

---

### ✅ Fixed: `client/src/scripts/validate-home-page.ts`

**Before:**
```typescript
private homePagePath = join(process.cwd(), 'src/pages/StrategicHomePage.tsx');
```

**After:**
```typescript
private homePagePath = join(process.cwd(), 'src/features/home/pages/home.tsx');
```

Note: StrategicHomePage no longer exists; replaced with SmartHomePageSelector in home.tsx

---

### ✅ Fixed: `client/src/scripts/consolidate-websocket-migration.ts`

**Before:**
```typescript
'client/src/components/notifications/NotificationCenter.tsx',
'client/src/pages/dashboard.tsx',
'client/src/pages/analytics-dashboard.tsx',
```

**After:**
```typescript
'client/src/features/notifications/ui/NotificationCenter.tsx',
'client/src/features/dashboard/pages/dashboard.tsx',
'client/src/features/analytics/pages/analytics-dashboard.tsx',
```

---

### ✅ Fixed: `client/src/infrastructure/navigation/NavigationPerformance.test.tsx`

**Before:**
```typescript
vi.mock('../../pages/StrategicHomePage', () => ({
  default: () => <div>Home Page</div>,
}));
vi.mock('../../pages/bills/bills-dashboard-page', () => ({
  default: () => <div>Bills Dashboard</div>,
}));
```

**After:**
```typescript
vi.mock('../../features/home/pages/home', () => ({
  default: () => <div>Home Page</div>,
}));
vi.mock('../../features/bills/pages/bills-dashboard-page', () => ({
  default: () => <div>Bills Dashboard</div>,
}));
```

## Migration Architecture

### Old Structure (Deprecated)
```
client/src/
├── root/          # ❌ Application root components
├── pages/         # ❌ All page components
├── shared/        # ❌ Shared UI components
└── components/    # ❌ Mixed components
```

### New Structure (Current)
```
client/src/
├── app/           # ✅ Application shell & providers
├── features/      # ✅ Feature modules (FSD)
│   └── {feature}/
│       ├── pages/     # Feature-specific pages
│       ├── ui/        # Feature-specific UI
│       ├── model/     # Business logic
│       ├── services/  # API services
│       └── hooks/     # Feature hooks
├── lib/           # ✅ Shared utilities & components
│   ├── components/    # Shared components
│   ├── ui/            # Design system
│   └── utils/         # Utilities
└── infrastructure/ # ✅ Cross-cutting concerns
```

## Notes

- The workspace-level `shared/` directory (at project root) is **NOT deprecated** and remains active
- References to `../../../shared/` in client code are valid (workspace shared code)
- Only `client/src/shared/` was deprecated and removed

## Verification

All deprecated path references have been successfully removed. To verify:

```bash
# Search for imports from deprecated paths (should return no results)
grep -r "src/pages/" client/src --include="*.ts" --include="*.tsx"
grep -r "src/components/" client/src --include="*.ts" --include="*.tsx"
grep -r "src/shared/" client/src --include="*.ts" --include="*.tsx"
```

### Remaining References (Intentional)

The following files contain references to old paths in documentation/comments only:
- `client/.eslintrc.design-system.js` - Example paths in comments
- `client/src/infrastructure/auth/scripts/cleanup-old-auth.ts` - References old paths being cleaned up
- `client/src/infrastructure/auth/scripts/migration-helper.ts` - Migration documentation

These are intentional and do not affect runtime behavior.

## Summary

✅ **All 6 stale references fixed**
- Updated Vite production config to use FSD structure
- Fixed preload optimizer paths
- Updated validation script to use correct home page
- Fixed WebSocket migration script paths
- Updated test mocks to use correct paths

✅ **No TypeScript errors** - All files pass type checking
✅ **Migration complete** - Client fully migrated to Feature-Sliced Design
