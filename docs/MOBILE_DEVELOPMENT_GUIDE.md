# Mobile Development Guide

## 🎯 Quick Start

Welcome to the refactored mobile architecture! This guide will help you navigate the new structure and understand how to work with mobile components.

---

## 📦 What's New?

### Before (Chaos) ❌
```
components/mobile/ (15 files)
├── MobileLayout.tsx (500+ lines)
├── mobile-navigation-enhancements.tsx ← duplicate
├── MobileNavigationDrawer.tsx ← another copy
├── PullToRefresh.tsx
└── mobile-performance-optimizations.tsx ← scattered logic
```

### After (Clean) ✅
```
components/mobile/ (8 focused files)
├── interaction/ (gestures, touch)
├── layout/ (structure, navigation)
└── data-display/ (content, charts)

hooks/mobile/ (new!)
├── useSwipeGesture.ts
├── usePullToRefresh.ts
└── ... (other extracted hooks)

config/
├── gestures.ts (single source of truth!)
└── mobile.ts (centralized config)

types/
└── mobile.ts (unified type definitions)
```

---

## 🗂️ Directory Structure Reference

### `components/mobile/interaction/`
**Touch & Gesture-based components**

Handles user touch interactions:
- `PullToRefresh.tsx` - Pull-to-refresh gesture
- `SwipeGestures.tsx` - Swipe detection and handling
- `InfiniteScroll.tsx` - Scroll pagination
- `MobileBottomSheet.tsx` - Bottom sheet modal with gestures

**When to use:** Components that respond to touch/gesture events

```typescript
import { PullToRefresh } from '@/components/mobile/interaction';
import { useSwipeGesture } from '@/hooks/mobile';

export function MyPage() {
  const { handleSwipe } = useSwipeGesture({
    onSwipe: (direction) => console.log(direction)
  });

  return (
    <PullToRefresh onRefresh={async () => { /* ... */ }}>
      <div onTouchStart={handleSwipe}>
        Content here
      </div>
    </PullToRefresh>
  );
}
```

---

### `components/mobile/layout/`
**Layout & Navigation Structure**

Orchestrates the mobile UI layout:
- `MobileLayout.tsx` - Main layout wrapper (simplified!)
- `BottomNavigationBar.tsx` - Bottom navigation
- `NavigationDrawer.tsx` - Side drawer navigation
- `MobileHeader.tsx` - Mobile header

**When to use:** As the root layout for mobile pages

```typescript
import { MobileLayout, BottomNavigationBar } from '@/components/mobile/layout';

export function App() {
  return (
    <MobileLayout>
      <main>
        <YourContent />
      </main>
      <BottomNavigationBar />
    </MobileLayout>
  );
}
```

---

### `components/mobile/data-display/`
**Mobile-Optimized Content Display**

Shows data optimized for mobile:
- `MobileDataVisualization.tsx` - Charts, graphs
- `MobileTabSelector.tsx` - Tab component
- `MobileBillCard.tsx` - Responsive bill card
- `MobileChartCarousel.tsx` - Scrollable charts

**When to use:** For displaying content, charts, lists on mobile

```typescript
import { MobileDataVisualization } from '@/components/mobile/data-display';

export function BillChart() {
  return (
    <MobileDataVisualization
      data={chartData}
      title="Bill Activity"
    />
  );
}
```

---

### `hooks/mobile/`
**Mobile-Specific React Hooks**

Custom hooks for mobile functionality:
- `useSwipeGesture.ts` - Detect swipe gestures
- `usePullToRefresh.ts` - Pull-to-refresh state
- `useScrollManager.ts` - Scroll behavior management
- `useBottomSheet.ts` - Bottom sheet state
- `useMobileTabs.ts` - Tab state management
- `useInfiniteScroll.ts` - Infinite scroll pagination

**When to use:** When you need mobile-specific behavior in your components

```typescript
import { useSwipeGesture, usePullToRefresh } from '@/hooks/mobile';

export function MyComponent() {
  const [refreshing, setRefreshing] = usePullToRefresh();
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
    onSwipeUp: () => console.log('swiped up'),
  });

  return <div onTouchStart={handleTouchStart}>...</div>;
}
```

---

### `config/`
**Single Source of Truth for Configuration**

#### `gestures.ts`
Centralized gesture thresholds and behavior:

```typescript
import { GESTURE_THRESHOLDS, MOBILE_BEHAVIOR } from '@/config/gestures';

// Use consistent thresholds across all gesture components
const MIN_SWIPE = GESTURE_THRESHOLDS.SWIPE_MIN_DISTANCE; // 50px
const PULL_THRESHOLD = GESTURE_THRESHOLDS.PULL_TO_REFRESH_MIN_DISTANCE; // 60px
```

**Key values:**
- `SWIPE_MIN_DISTANCE: 50` - Minimum pixel movement for swipe
- `PULL_TO_REFRESH_MIN_DISTANCE: 60` - Minimum pull distance
- `LONG_PRESS_DURATION: 500` - How long for long press
- `TOUCH_TARGET_SIZE: 44` - WCAG minimum tap target

#### `mobile.ts`
Mobile device configuration:

```typescript
import { MOBILE_BREAKPOINTS, getDeviceType } from '@/config/mobile';

const width = window.innerWidth;
const device = getDeviceType(width); // 'phone' | 'tablet' | 'desktop'

// Breakpoints:
// XS: 320px (phones)
// SM: 480px (larger phones)
// MD: 640px (small tablets)
// LG: 768px (tablets)
// XL: 1024px (large tablets)
```

#### `navigation.ts`
Navigation structure (single source of truth):

```typescript
import { MAIN_NAVIGATION, MOBILE_BOTTOM_NAVIGATION } from '@/config/navigation';

// All components use the same navigation items
const items = MAIN_NAVIGATION; // Consistent across mobile & desktop
```

---

### `types/mobile.ts`
**Unified Type Definitions**

All mobile-related TypeScript types in one place:

```typescript
import type {
  SwipeDirection,
  GestureEvent,
  MobileLayoutContextValue,
  SafeAreaInsets,
  PullToRefreshConfig,
  MobileTab,
} from '@/types/mobile';

// Use these types for type safety
export function handleSwipe(event: GestureEvent) {
  if (event.type === 'swipe') {
    const direction: SwipeDirection = event.direction || 'down';
  }
}
```

---

## 🔄 Common Patterns

### Pattern 1: Creating a Mobile Page

```typescript
// pages/MyPage.tsx
import { MobileLayout } from '@/components/mobile/layout';
import { useSwipeGesture } from '@/hooks/mobile';
import { GESTURE_THRESHOLDS } from '@/config/gestures';

export function MyPage() {
  const { handleSwipe } = useSwipeGesture({
    onSwipeLeft: () => goToNextPage(),
    onSwipeRight: () => goToPreviousPage(),
  });

  return (
    <MobileLayout>
      <div onTouchStart={handleSwipe}>
        <h1>My Page</h1>
        {/* Content */}
      </div>
    </MobileLayout>
  );
}
```

### Pattern 2: Using Pull-to-Refresh

```typescript
import { PullToRefresh } from '@/components/mobile/interaction';
import { usePullToRefresh } from '@/hooks/mobile';

export function ListPage() {
  const [isRefreshing, setIsRefreshing] = usePullToRefresh();

  const handleRefresh = async () => {
    // Fetch new data
    await fetchData();
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
    >
      <List items={items} />
    </PullToRefresh>
  );
}
```

### Pattern 3: Responsive Component

```typescript
// ✅ NEW WAY: Single responsive component
import { BillCard } from '@/components/features/bills/BillCard';

export function BillsList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {bills.map(bill => (
        <BillCard key={bill.id} bill={bill} variant="compact" />
      ))}
    </div>
  );
}

// ❌ OLD WAY: Mobile/desktop branching
import { MobileBillCard } from '@/components/mobile/MobileBillCard';
import { DesktopBillCard } from '@/components/DesktopBillCard';

if (isMobile) return <MobileBillCard />;
return <DesktopBillCard />;
```

### Pattern 4: Custom Mobile Hook

```typescript
// hooks/mobile/useCustomGesture.ts
import { useEffect, useRef } from 'react';
import { GESTURE_THRESHOLDS } from '@/config/gestures';
import type { SwipeGestureData } from '@/types/mobile';

export function useCustomGesture(onSwipe: (data: SwipeGestureData) => void) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const duration = Date.now() - touchStartTime.current;

    if (Math.abs(deltaX) > GESTURE_THRESHOLDS.SWIPE_MIN_DISTANCE) {
      onSwipe({
        direction: deltaX > 0 ? 'right' : 'left',
        distance: Math.abs(deltaX),
        velocity: Math.abs(deltaX) / duration,
        duration,
        startX: touchStartX.current,
        startY: touchStartY.current,
        endX: touch.clientX,
        endY: touch.clientY,
      });
    }
  };

  return { handleTouchStart, handleTouchEnd };
}
```

---

## ⚠️ Migration Checklist

If you're updating old code, use this checklist:

### Imports
```typescript
// ❌ OLD
import { usePullToRefresh } from '@/components/mobile/PullToRefresh';

// ✅ NEW
import { usePullToRefresh } from '@/hooks/mobile';
// or
import { PullToRefresh } from '@/components/mobile/interaction';
```

### Configuration
```typescript
// ❌ OLD: Scattered everywhere
const SWIPE_THRESHOLD = 50; // in 5 different files

// ✅ NEW: Single source
import { GESTURE_THRESHOLDS } from '@/config/gestures';
const MIN_SWIPE = GESTURE_THRESHOLDS.SWIPE_MIN_DISTANCE;
```

### Component Organization
```typescript
// ❌ OLD
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { SwipeGestures } from '@/components/mobile/SwipeGestures';

// ✅ NEW
import { MobileLayout } from '@/components/mobile/layout';
import { PullToRefresh } from '@/components/mobile/interaction';
import { useSwipeGesture } from '@/hooks/mobile';
```

---

## 🎨 Example: Complete Mobile Feature

Here's a complete example of a mobile-optimized feature:

```typescript
// features/tracking/TrackingPage.tsx
import { useState, useCallback } from 'react';
import { MobileLayout } from '@/components/mobile/layout';
import { PullToRefresh } from '@/components/mobile/interaction';
import { usePullToRefresh } from '@/hooks/mobile';
import { GESTURE_THRESHOLDS } from '@/config/gestures';
import type { TrackingData } from '@/types/tracking';

export function TrackingPage() {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [refreshing, setRefreshing] = usePullToRefresh();

  const handleRefresh = useCallback(async () => {
    try {
      const data = await fetchTrackingData();
      setTrackingData(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <MobileLayout>
      <PullToRefresh
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        <div className="p-4">
          <h1>Bill Tracking</h1>
          {trackingData.map(item => (
            <TrackingCard key={item.id} data={item} />
          ))}
        </div>
      </PullToRefresh>
    </MobileLayout>
  );
}

// Bonus: Custom hook for tracking logic
export function useTracking() {
  const [data, setData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchTrackingData();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetch };
}
```

---

## 🚀 Best Practices

### ✅ DO

- **Use config files**: Reference `config/gestures.ts` for thresholds
- **Colocate tests**: Keep tests near components in `__tests__/`
- **Use typed imports**: Import from `types/mobile.ts` for type safety
- **Extract hooks**: Move complex logic to `hooks/mobile/`
- **Responsive first**: Make components work on all screens by default

### ❌ DON'T

- **Hardcode thresholds**: Use `GESTURE_THRESHOLDS` instead
- **Duplicate components**: Share between mobile/desktop
- **Scatter configuration**: Keep it in `config/`
- **Create mobile-only components**: Unless truly necessary (rare)
- **Branch on `isMobile`**: Use responsive CSS/React instead

---

## 📊 Architecture Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Component Count** | 15 files | 8 files |
| **Configuration Locations** | 5+ scattered | 1 centralized |
| **Hook Clarity** | Mixed in components | Separate `hooks/mobile/` |
| **Type Safety** | Scattered types | `types/mobile.ts` |
| **Testing** | Inconsistent | Colocated in `__tests__/` |
| **Developer Onboarding** | Confusion | Clear decision tree |

---

## 🔗 Related Documentation

- **Architecture Plan**: `README_NEW_STRUCTURE.md`
- **Archived Files**: `__archive__/ARCHIVE_README.md`
- **Gesture Config**: `config/gestures.ts`
- **Mobile Config**: `config/mobile.ts`
- **Type Definitions**: `types/mobile.ts`

---

## ❓ FAQ

### Q: Should I create a new mobile component or make an existing one responsive?
**A:** Make existing components responsive first. Only create mobile-specific components for complex touch interactions (gestures, bottom sheets).

### Q: Where do I put gesture constants?
**A:** In `config/gestures.ts`. This is the single source of truth.

### Q: How do I add a new mobile hook?
**A:** Create it in `hooks/mobile/useMyHook.ts`, add the export to `hooks/mobile/index.ts`, and type it in `types/mobile.ts`.

### Q: Can I still use the old mobile components?
**A:** They're archived in `__archive__/`. Reference them if needed, but migrate to the new structure.

### Q: My component needs different logic on mobile vs desktop?
**A:** Use responsive CSS (Tailwind breakpoints) or container queries. If that won't work, use a single responsive component with a `size` prop.

