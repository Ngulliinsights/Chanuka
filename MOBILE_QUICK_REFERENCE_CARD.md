# 🚀 Mobile Architecture - Quick Reference Card

**Print this out or bookmark it!**

---

## 📍 Where Everything Is

### Components
```
🟢 Touch & Gesture  → components/mobile/interaction/
🟠 Layout & Nav     → components/mobile/layout/
🔵 Content & Data   → components/mobile/data-display/
⚫ Legacy Files      → components/mobile/__archive__/
```

### Hooks
```
All mobile hooks → hooks/mobile/
```

### Configuration (Single Source of Truth!)
```
Gesture thresholds  → config/gestures.ts
Device config       → config/mobile.ts
Navigation items    → config/navigation.ts
```

### Types
```
All mobile types → types/mobile.ts
```

---

## 📋 Component Quick Guide

| Component | Location | Purpose | Use For |
|-----------|----------|---------|---------|
| **PullToRefresh** | `interaction/` | Pull-down to refresh | List pages, feeds |
| **SwipeGestures** | `interaction/` | Detect swipes | Page navigation, gestures |
| **InfiniteScroll** | `interaction/` | Scroll pagination | Long lists, feeds |
| **MobileBottomSheet** | `interaction/` | Bottom modal | Menus, actions |
| **MobileLayout** | `layout/` | Main structure | Root wrapper |
| **BottomNavigationBar** | `layout/` | Bottom nav | Main navigation |
| **NavigationDrawer** | `layout/` | Side menu | Mobile navigation |
| **MobileDataVisualization** | `data-display/` | Charts/graphs | Analytics, data |
| **MobileTabSelector** | `data-display/` | Tabs | Tabbed content |
| **MobileBillCard** | `data-display/` | Responsive card | List items |

---

## 🎣 Hook Quick Guide

| Hook | Location | Use For |
|------|----------|---------|
| `useSwipeGesture` | `hooks/mobile/` | Detect swipe direction & velocity |
| `usePullToRefresh` | `hooks/mobile/` | Manage refresh state |
| `useScrollManager` | `hooks/mobile/` | Manage scroll position & momentum |
| `useBottomSheet` | `hooks/mobile/` | Manage bottom sheet state |
| `useMobileTabs` | `hooks/mobile/` | Manage tab selection |
| `useInfiniteScroll` | `hooks/mobile/` | Manage infinite scroll pagination |

---

## ⚙️ Config Values Quick Reference

### Gesture Thresholds (`config/gestures.ts`)
```typescript
SWIPE_MIN_DISTANCE: 50        // px
SWIPE_MIN_VELOCITY: 0.5       // px/ms
PULL_TO_REFRESH_MIN: 60       // px
PULL_TO_REFRESH_MAX: 120      // px
LONG_PRESS_DURATION: 500      // ms
TAP_MAX_DURATION: 200         // ms
TOUCH_TARGET_SIZE: 44         // px (WCAG)
```

### Breakpoints (`config/mobile.ts`)
```typescript
XS: 320px         // phones
SM: 480px         // larger phones
MD: 640px         // tablets
LG: 768px         // large tablets
XL: 1024px        // extra large
2XL: 1280px       // desktops
```

### Navigation (`config/navigation.ts`)
```typescript
MAIN_NAVIGATION     // Home, Bills, Tracking, Dashboard, Community
SECONDARY_NAV       // Settings, Help, About
MOBILE_BOTTOM_NAV   // 4-5 main items for mobile
```

---

## 💻 Import Patterns

### Components
```typescript
// Gesture components
import { PullToRefresh } from '@/components/mobile/interaction';
import { SwipeGestures } from '@/components/mobile/interaction';

// Layout components
import { MobileLayout } from '@/components/mobile/layout';
import { BottomNavigationBar } from '@/components/mobile/layout';

// Data display
import { MobileDataVisualization } from '@/components/mobile/data-display';

// Or use barrel export
import { MobileLayout, PullToRefresh } from '@/components/mobile';
```

### Hooks
```typescript
import { useSwipeGesture } from '@/hooks/mobile';
import { usePullToRefresh } from '@/hooks/mobile';

// Or specific imports
import { useSwipeGesture } from '@/hooks/mobile/useSwipeGesture';
```

### Configuration
```typescript
import { GESTURE_THRESHOLDS } from '@/config/gestures';
import { MOBILE_BREAKPOINTS } from '@/config/mobile';
import { MAIN_NAVIGATION } from '@/config/navigation';
```

### Types
```typescript
import type { 
  SwipeGestureData, 
  MobileLayoutContextValue,
  SafeAreaInsets 
} from '@/types/mobile';
```

---

## 🎯 Common Patterns

### Pattern 1: Using PullToRefresh
```typescript
import { PullToRefresh } from '@/components/mobile/interaction';
import { usePullToRefresh } from '@/hooks/mobile';

export function MyList() {
  const [refreshing, setRefreshing] = usePullToRefresh();
  
  const handleRefresh = async () => {
    await fetchData();
    setRefreshing(false);
  };
  
  return (
    <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
      {/* Content */}
    </PullToRefresh>
  );
}
```

### Pattern 2: Using SwipeGestures
```typescript
import { useSwipeGesture } from '@/hooks/mobile';

export function MyPage() {
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
    onSwipeLeft: () => goNext(),
    onSwipeRight: () => goPrev(),
  });
  
  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      Content
    </div>
  );
}
```

### Pattern 3: Responsive Component
```typescript
// ✅ Use responsive CSS, not mobile-specific component
import { BillCard } from '@/features/bills/BillCard';

export function BillsList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {bills.map(bill => (
        <BillCard key={bill.id} bill={bill} variant="compact" />
      ))}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

**Q: Import path says "not found"**
A: Check if file is in correct subdirectory
- Gestures → `interaction/`
- Navigation → `layout/`
- Charts → `data-display/`

**Q: Hook is undefined**
A: Make sure to import from `hooks/mobile/`, not from component file

**Q: Gesture threshold feels wrong**
A: Adjust in `config/gestures.ts` (single place to change)

**Q: Where do I add navigation items?**
A: Edit `config/navigation.ts` and it propagates everywhere

**Q: Should I create a mobile component?**
A: Probably not - use responsive CSS first!

---

## 📚 Documentation Cheatsheet

| Need to Know | Read This |
|--------------|-----------|
| Overall architecture | `README_NEW_STRUCTURE.md` |
| How to use components | `MOBILE_DEVELOPMENT_GUIDE.md` |
| Code patterns & examples | `MOBILE_DEVELOPMENT_GUIDE.md` |
| Phase progress | `MOBILE_REFACTORING_IMPLEMENTATION_CHECKLIST.md` |
| Visual diagrams | `MOBILE_ARCHITECTURE_VISUAL_REFERENCE.md` |
| Project summary | `PHASE1_COMPLETE_SUMMARY.md` |
| Legacy files | `__archive__/ARCHIVE_README.md` |

---

## ✅ Checklist for New Developers

- [ ] Read `MOBILE_DEVELOPMENT_GUIDE.md`
- [ ] Bookmark this quick reference card
- [ ] Understand the 3 component subdirectories
- [ ] Know where hooks are (`hooks/mobile/`)
- [ ] Know where config is (`config/`)
- [ ] Try creating a test component in each category
- [ ] Run tests to verify it works

---

## 🚀 Common Tasks

### Add a new mobile component
1. Decide category: `interaction/`, `layout/`, or `data-display/`
2. Create file in that directory
3. Export from `{category}/index.ts`
4. Import in your page

### Use a gesture threshold
```typescript
import { GESTURE_THRESHOLDS } from '@/config/gestures';
const min = GESTURE_THRESHOLDS.SWIPE_MIN_DISTANCE;
```

### Change a gesture threshold
1. Edit `config/gestures.ts`
2. All components using it automatically update

### Add navigation item
1. Edit `config/navigation.ts`
2. Add to `MAIN_NAVIGATION` or `SECONDARY_NAVIGATION`
3. All nav components automatically include it

### Extract a hook from a component
1. Identify logic to extract
2. Create `hooks/mobile/useMyHook.ts`
3. Export from `hooks/mobile/index.ts`
4. Update component to import hook
5. Type in `types/mobile.ts`

---

## 🎯 Decision Tree

```
Need to add mobile code?

├─ Is it a gesture/touch? → interaction/
├─ Is it layout/nav? → layout/
├─ Is it content display? → data-display/
└─ Is it logic/state? → hooks/mobile/
```

---

## 💡 Pro Tips

1. **Always check config first** - Thresholds already defined
2. **Use types from types/mobile.ts** - Better IDE autocomplete
3. **Look for similar components** - Copy patterns from existing ones
4. **Extract hooks early** - Keeps components clean
5. **Use responsive CSS** - Don't create mobile-only components
6. **Reference guides** - Everything is documented
7. **Follow the hierarchy** - Components → Hooks → Config

---

## 🔗 Key Files at a Glance

```
config/gestures.ts           ← Gesture thresholds
config/mobile.ts             ← Device configuration
config/navigation.ts         ← Navigation structure
types/mobile.ts              ← Type definitions

components/mobile/
├── interaction/             ← Gesture components
├── layout/                  ← Navigation & structure
├── data-display/            ← Content display
└── __archive__/             ← Legacy files

hooks/mobile/                ← Mobile hooks

__archive__/ARCHIVE_README.md ← Legacy file info
```

---

## 📞 Still Stuck?

1. **Check the decision tree** above
2. **Read relevant guide** from documentation
3. **Look at similar component** for patterns
4. **Check config files** for values
5. **Review `MOBILE_DEVELOPMENT_GUIDE.md`** for patterns

---

**Remember:** Everything is organized for your sanity. If you can't find it, check the 📚 documentation cheatsheet above!

