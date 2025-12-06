# Mobile Components Archive

This directory contains legacy and deprecated mobile component implementations that have been consolidated into the new unified mobile architecture.

## Archived Files

### To Be Deleted (Redundant/Junk)

- `mobile-navigation-enhancements.tsx` - **Duplicate navigation logic**, superseded by unified NavigationDrawer
- `MobileOptimizedLayout.tsx` - **Thin wrapper**, functionality merged into MobileLayout
- `mobile-test-suite.tsx` - **Legacy test utility**, tests colocated with components
- `mobile-performance-optimizations.tsx` - **Scattered logic**, moved to `/src/core/performance/`

### To Be Refactored (Extract & Consolidate)

- `MobileLayout.tsx` - **Monolith** → Extract hooks to `/hooks/mobile/`
- `SwipeGestures.tsx` - Move configuration to `/config/gestures.ts`
- `PullToRefresh.tsx` - Extract hook, keep component
- `MobileNavigationDrawer.tsx` - Merge with desktop drawer variant

### Already Migrated

- `MobileBottomSheet.tsx` ✅ Moved to `/mobile/interaction/`
- `MobileDataVisualization.tsx` ✅ Moved to `/mobile/data-display/`
- `InfiniteScroll.tsx` ✅ Moved to `/mobile/interaction/`
- `MobileTabSelector.tsx` ✅ Moved to `/mobile/interaction/`

## Migration Timeline

- **Phase 1** (Week 1): Delete redundant files, extract hooks
- **Phase 2** (Weeks 2-3): Consolidate navigation components
- **Phase 3** (Weeks 4-5): Create unified responsive components

## How to Restore

If you need to reference archived code:

```bash
git log --all -- client/src/components/mobile/[filename]
git show <commit>:[path/to/file]
```

## New Structure Location

See `../README_NEW_STRUCTURE.md` for the new consolidated architecture.
