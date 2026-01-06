# Mobile Architecture Refactoring: New Structure

## 📋 Overview

This document describes the consolidated mobile component architecture following the strategic refactoring plan. The architecture moves from a chaotic, duplicated structure to a clean, organized system with clear responsibilities.

---

## 🏗️ New Directory Structure

```
src/
├── components/
│   └── mobile/
│       ├── interaction/              # Touch & gesture-based components
│       │   ├── PullToRefresh.tsx     ✅ Single source of truth
│       │   ├── SwipeGestures.tsx     ✅ Gesture handler
│       │   ├── InfiniteScroll.tsx    ✅ Scroll pagination
│       │   ├── MobileBottomSheet.tsx ✅ Bottom sheet modal
│       │   ├── __tests__/
│       │   └── index.ts
│       │
│       ├── layout/                   # Layout orchestrators
│       │   ├── MobileLayout.tsx      ✅ Simplified main layout (80 lines)
│       │   ├── BottomNavigationBar.tsx ✅ Extracted from enhancements
│       │   ├── NavigationDrawer.tsx  ✅ Merged drawer (responsive)
│       │   ├── MobileHeader.tsx      ✅ Mobile header
│       │   ├── __tests__/
│       │   └── index.ts
│       │
│       ├── data-display/             # Mobile-optimized content components
│       │   ├── MobileDataVisualization.tsx ✅
│       │   ├── MobileTabSelector.tsx ✅ Tabs for mobile
│       │   ├── MobileBillCard.tsx    ✅ Responsive card
│       │   ├── MobileChartCarousel.tsx
│       │   ├── __tests__/
│       │   └── index.ts
│       │
│       ├── __archive__/              # Legacy implementations (for reference)
│       │   ├── ARCHIVE_README.md
│       │   ├── MobileLayout-old.tsx  (original monolith)
│       │   └── mobile-*.tsx          (deprecated utilities)
│       │
│       ├── __tests__/                # Mobile integration tests
│       │   ├── mobile-integration.test.tsx
│       │   ├── responsive-behavior.test.tsx
│       │   └── touch-interactions.test.tsx
│       │
│       └── index.ts                  # Unified exports
│
├── hooks/
│   └── mobile/                       # Mobile-specific hooks
│       ├── useSwipeGesture.ts        ✅ Extracted from MobileLayout
│       ├── usePullToRefresh.ts       ✅ Extracted from PullToRefresh
│       ├── useScrollManager.ts       ✅ New: Scroll behavior
│       ├── useBottomSheet.ts         ✅ Extracted from MobileBottomSheet
│       ├── useMobileTabs.ts          ✅ Extracted from MobileTabSelector
│       ├── useInfiniteScroll.ts      ✅ Extracted from InfiniteScroll
│       ├── __tests__/
│       └── index.ts
│
├── config/
│   ├── gestures.ts                   ✅ NEW: Gesture configuration (single source)
│   ├── navigation.ts                 ✅ Navigation items (single source)
│   └── mobile.ts                     ✅ NEW: Mobile breakpoints & defaults
│
├── types/
│   └── mobile.ts                     ✅ NEW: Unified mobile types
│
├── core/
│   └── performance/
│       ├── mobile-performance.ts     ✅ Moved from mobile-performance-optimizations.tsx
│       └── resource-hints.ts
│
└── features/                         # Domain-specific features (responsive)
    ├── bills/
    │   └── ui/
    │       ├── BillCard.tsx          ✅ Responsive (no mobile variant)
    │       └── BillDetail.tsx        ✅ Responsive (no mobile variant)
```

---

## 📊 File Migration Guide

### Phase 1: Files to Archive

These files are moved to `__archive__/` for reference:

| Source File                          | Reason                     | Archive Location                                 |
| ------------------------------------ | -------------------------- | ------------------------------------------------ |
| `mobile-navigation-enhancements.tsx` | Junk drawer, duplicate nav | `__archive__/mobile-navigation-enhancements.tsx` |
| `MobileOptimizedLayout.tsx`          | Thin wrapper, redundant    | `__archive__/MobileOptimizedLayout.tsx`          |
| `mobile-test-suite.tsx`              | Legacy test utils          | `__archive__/mobile-test-suite.tsx`              |
| `responsive-layout-manager.tsx`      | Logic integrated elsewhere | `__archive__/responsive-layout-manager.tsx`      |

### Phase 2: Files to Extract Hooks From

| Component               | Extracted Hooks                       | New Location    |
| ----------------------- | ------------------------------------- | --------------- |
| `MobileLayout.tsx`      | `useSwipeGesture`, `useScrollManager` | `hooks/mobile/` |
| `PullToRefresh.tsx`     | `usePullToRefresh`                    | `hooks/mobile/` |
| `MobileBottomSheet.tsx` | `useBottomSheet`                      | `hooks/mobile/` |
| `MobileTabSelector.tsx` | `useMobileTabs`                       | `hooks/mobile/` |
| `InfiniteScroll.tsx`    | `useInfiniteScroll`                   | `hooks/mobile/` |

### Phase 3: Files to Consolidate

| Old Files                                              | Consolidated To                      | Status               |
| ------------------------------------------------------ | ------------------------------------ | -------------------- |
| `MobileNavigationDrawer.tsx` (mobile/) + layout drawer | `mobile/layout/NavigationDrawer.tsx` | Merge & enhance      |
| `SwipeGestures.tsx` (component)                        | Keep component, extract config       | `config/gestures.ts` |
| `mobile-performance-optimizations.tsx`                 | Move logic to `core/performance/`    | Relocate             |

---

## 🔌 Export Structure

### `components/mobile/index.ts`

```typescript
// Interaction components (gestures, touch)
export { PullToRefresh, usePullToRefresh } from './interaction/PullToRefresh';
export { SwipeGestures, useSwipeGestures } from './interaction/SwipeGestures';
export { InfiniteScroll, useInfiniteScroll } from './interaction/InfiniteScroll';
export { MobileBottomSheet, useBottomSheet } from './interaction/MobileBottomSheet';

// Layout components (structure)
export { MobileLayout } from './layout/MobileLayout';
export { BottomNavigationBar } from './layout/BottomNavigationBar';
export { NavigationDrawer } from './layout/NavigationDrawer';
export { MobileHeader } from './layout/MobileHeader';

// Data display components (content)
export { MobileDataVisualization } from './data-display/MobileDataVisualization';
export { MobileTabSelector, useMobileTabs } from './data-display/MobileTabSelector';
export { MobileBillCard } from './data-display/MobileBillCard';
export { MobileChartCarousel } from './data-display/MobileChartCarousel';

// Types
export type { SwipeDirection, SwipeEvent, SwipeGestureOptions } from './interaction/SwipeGestures';
export type { MobileTab } from './data-display/MobileTabSelector';
```

### `hooks/mobile/index.ts`

```typescript
export { useSwipeGesture } from './useSwipeGesture';
export { usePullToRefresh } from './usePullToRefresh';
export { useScrollManager } from './useScrollManager';
export { useBottomSheet } from './useBottomSheet';
export { useMobileTabs } from './useMobileTabs';
export { useInfiniteScroll } from './useInfiniteScroll';
```

### `config/gestures.ts`

```typescript
// Single source of truth for gesture thresholds
export const GESTURE_CONFIG = {
  SWIPE_THRESHOLD: 50, // pixels
  SWIPE_VELOCITY_THRESHOLD: 0.5, // px/ms
  PULL_TO_REFRESH_THRESHOLD: 60, // pixels
  PULL_TO_REFRESH_MAX: 120, // max pull distance
  SCROLL_SNAP_THRESHOLD: 30, // % of container
  LONG_PRESS_DURATION: 500, // ms
  TAP_DURATION_MAX: 200, // ms
} as const;

export const MOBILE_CONFIG = {
  TOUCH_TARGET_SIZE: 44, // WCAG minimum
  VIEWPORT_HEIGHT_SAFE: 0.85, // Account for address bar
  MOMENTUM_DECAY: 0.95, // Scroll momentum
} as const;
```

### `types/mobile.ts`

```typescript
// Unified mobile type definitions
export interface MobileGestureEvent {
  type: 'swipe' | 'tap' | 'long-press' | 'pull';
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  distance?: number;
}

export interface MobileLayoutContextValue {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: SafeAreaInsets;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type MobileBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

---

## 🎯 Usage Examples

### Before (Chaos)

```typescript
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { useSwipeGestures } from '@/components/mobile/SwipeGestures';
import { usePullToRefresh } from '@/components/mobile/PullToRefresh';
// ❌ Where's useSwipeGesture? Is it in the hook or component?
// ❌ Are there multiple implementations of PullToRefresh?
```

### After (Clear)

```typescript
import { MobileLayout } from '@/components/mobile/layout/MobileLayout';
import { useSwipeGesture } from '@/hooks/mobile/useSwipeGesture';
import { usePullToRefresh } from '@/hooks/mobile/usePullToRefresh';
// ✅ Clear origin, no ambiguity
// ✅ Single source of truth
// ✅ Easy to test in isolation

// Or use barrel exports
import { MobileLayout, useSwipeGesture } from '@/components/mobile';
import { usePullToRefresh } from '@/hooks/mobile';
```

---

## 📱 Component Hierarchy

```
MobileLayout
├── MobileHeader
│   └── BottomNavigationBar (mobile) / Sidebar (desktop)
├── NavigationDrawer (slide-out, mobile-only)
├── Main Content (responsive)
│   ├── Page Content (switches based on viewport)
│   └── Floating Actions
└── Toast/Notification Container
```

---

## ✨ Key Improvements

| Metric                      | Before    | After                | Impact                     |
| --------------------------- | --------- | -------------------- | -------------------------- |
| Mobile Components           | 15 files  | 8 files              | 46% reduction              |
| Duplicate Implementations   | 3+        | 1                    | Single source of truth     |
| Hook Export Clarity         | Ambiguous | Crystal clear        | Faster developer iteration |
| Configuration Fragmentation | 5+ places | `config/gestures.ts` | Maintenance overhead ↓     |
| Test Colocation             | Scattered | Feature-based        | Better organization        |

---

## 🚀 Implementation Checklist

- [ ] **Week 1**: Archive old files, extract hooks
  - [ ] Create `hooks/mobile/` directory
  - [ ] Extract hooks from components
  - [ ] Create `config/gestures.ts`
  - [ ] Create `types/mobile.ts`

- [ ] **Week 2**: Reorganize components
  - [ ] Move to `interaction/` subdirectory
  - [ ] Move to `layout/` subdirectory
  - [ ] Move to `data-display/` subdirectory
  - [ ] Update all imports

- [ ] **Week 3**: Update exports and tests
  - [ ] Update `components/mobile/index.ts`
  - [ ] Update `hooks/mobile/index.ts`
  - [ ] Create unified tests
  - [ ] Update documentation

- [ ] **Week 4**: Responsive component migration
  - [ ] Consolidate mobile-specific components with responsive variants
  - [ ] Remove `if (isMobile)` branching where possible
  - [ ] Use container queries

---

## 📚 References

- See `ARCHIVE_README.md` for archived file details
- See `../../PHASE2_IMPLEMENTATION_GUIDE.md` for broader context
- See `../../docs/MOBILE_DEVELOPMENT_GUIDE.md` (to be created)
