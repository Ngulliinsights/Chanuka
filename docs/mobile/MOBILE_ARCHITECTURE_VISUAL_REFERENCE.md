# Mobile Architecture - Visual Reference

## 🏗️ Directory Tree

```
client/src/
│
├── components/
│   └── mobile/
│       │
│       ├── 📁 interaction/              [TOUCH & GESTURE COMPONENTS]
│       │   ├── PullToRefresh.tsx        • Pull-to-refresh gesture
│       │   ├── SwipeGestures.tsx        • Swipe detection & handling
│       │   ├── InfiniteScroll.tsx       • Scroll pagination
│       │   ├── MobileBottomSheet.tsx    • Bottom sheet modal
│       │   ├── index.ts                 • Exports
│       │   └── __tests__/               • Component tests
│       │
│       ├── 📁 layout/                   [STRUCTURE & NAVIGATION]
│       │   ├── MobileLayout.tsx         • Main layout wrapper (~80 lines)
│       │   ├── BottomNavigationBar.tsx  • Bottom tab navigation
│       │   ├── NavigationDrawer.tsx     • Side drawer (responsive)
│       │   ├── MobileHeader.tsx         • Mobile header
│       │   ├── index.ts                 • Exports
│       │   └── __tests__/               • Layout tests
│       │
│       ├── 📁 data-display/             [MOBILE-OPTIMIZED CONTENT]
│       │   ├── MobileDataVisualization.tsx • Charts & graphs
│       │   ├── MobileTabSelector.tsx    • Tabs component
│       │   ├── MobileBillCard.tsx       • Responsive bill card
│       │   ├── MobileChartCarousel.tsx  • Scrollable charts
│       │   ├── index.ts                 • Exports
│       │   └── __tests__/               • Content tests
│       │
│       ├── 📁 __archive__/              [LEGACY - FOR REFERENCE]
│       │   ├── ARCHIVE_README.md        • Archive documentation
│       │   ├── mobile-navigation-enhancements.tsx
│       │   ├── MobileOptimizedLayout.tsx
│       │   ├── mobile-test-suite.tsx
│       │   └── ... (other deprecated files)
│       │
│       ├── 📁 __tests__/                [INTEGRATION TESTS]
│       │   ├── mobile-integration.test.tsx
│       │   ├── responsive-behavior.test.tsx
│       │   └── touch-interactions.test.tsx
│       │
│       ├── index.ts                     • Main barrel export
│       ├── README_NEW_STRUCTURE.md      • Architecture guide
│       └── [original index.ts - will be updated]
│
├── 📁 hooks/
│   └── mobile/                          [MOBILE-SPECIFIC HOOKS]
│       ├── useSwipeGesture.ts           • Gesture detection
│       ├── usePullToRefresh.ts          • Pull-to-refresh state
│       ├── useScrollManager.ts          • Scroll behavior
│       ├── useBottomSheet.ts            • Bottom sheet state
│       ├── useMobileTabs.ts             • Tab state management
│       ├── useInfiniteScroll.ts         • Scroll pagination state
│       ├── __tests__/                   • Hook tests
│       └── index.ts                     • Exports
│
├── 📁 config/                           [CENTRALIZED CONFIGURATION]
│   ├── gestures.ts                      ⚙️ Gesture thresholds & behavior
│   ├── mobile.ts                        ⚙️ Device config & breakpoints
│   └── navigation.ts                    ⚙️ Navigation structure
│
├── 📁 types/
│   └── mobile.ts                        📝 Unified type definitions
│
└── features/                            [DOMAIN-SPECIFIC FEATURES]
    ├── bills/
    │   └── ui/
    │       ├── BillCard.tsx             ← RESPONSIVE (not mobile-only)
    │       └── BillDetail.tsx           ← RESPONSIVE
    └── ...

```

---

## 🔄 Data Flow & Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                         │
│                    (Touch, Swipe, Gesture)                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              GESTURE DETECTION (Interaction Layer)              │
│                                                                 │
│  components/mobile/interaction/                                │
│  ├── SwipeGestures.tsx  ◄──── useSwipeGesture hook            │
│  ├── PullToRefresh.tsx  ◄──── usePullToRefresh hook           │
│  ├── InfiniteScroll.tsx ◄──── useInfiniteScroll hook          │
│  └── MobileBottomSheet.tsx ◄─ useBottomSheet hook             │
│                                                                 │
│  All use: config/gestures.ts (thresholds)                     │
│  Types:   types/mobile.ts                                     │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│            LAYOUT & ORCHESTRATION (Layout Layer)               │
│                                                                 │
│  components/mobile/layout/                                     │
│  ├── MobileLayout.tsx       (main orchestrator)                │
│  ├── BottomNavigationBar.tsx                                  │
│  ├── NavigationDrawer.tsx                                     │
│  └── MobileHeader.tsx                                         │
│                                                                 │
│  Uses: config/navigation.ts (menu items)                      │
│  Uses: hooks/mobile/* (state management)                      │
│  Types: types/mobile.ts                                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│         DATA & CONTENT DISPLAY (Content Layer)                 │
│                                                                 │
│  components/mobile/data-display/                              │
│  ├── MobileDataVisualization.tsx                              │
│  ├── MobileTabSelector.tsx (with useMobileTabs)              │
│  ├── MobileBillCard.tsx (responsive variant)                 │
│  └── MobileChartCarousel.tsx                                 │
│                                                                 │
│  Uses: hooks/mobile/* for state                              │
│  Types: types/mobile.ts                                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
        ┌─────────────────────┐
        │   USER SEES DATA    │
        │    ON SCREEN        │
        └─────────────────────┘
```

---

## 📐 Component Hierarchy

```
🔵 MobileLayout (Root)
│
├── 🟡 MobileHeader
│   └── Logo, Title, Actions
│
├── 🟡 NavigationDrawer (slide-out)
│   └── Navigation items from config/navigation.ts
│
├── 🟡 BottomNavigationBar (fixed bottom)
│   └── Main navigation items (4-5 items)
│
├── 🟢 PullToRefresh (wrapper)
│   └── <Main Content>
│       │
│       ├── 🟢 SwipeGestures (event handler)
│       │   └── <Page Content>
│       │
│       ├── 🟢 InfiniteScroll (pagination wrapper)
│       │   └── <List Items>
│       │       └── 🔵 MobileBillCard (responsive)
│       │
│       ├── 🔵 MobileDataVisualization
│       │   └── Charts, Graphs
│       │
│       ├── 🔵 MobileTabSelector
│       │   └── Tabs with content
│       │
│       └── 🟢 MobileBottomSheet (if modal needed)
│           └── <Modal Content>
│
└── 🟡 Toast Container
    └── Notifications

Legend:
🔵 = Container/Orchestrator
🟡 = Layout/Navigation
🟢 = Interaction/Gesture
```

---

## 🔌 Configuration Connection Map

```
                    config/gestures.ts
                    ├─ GESTURE_THRESHOLDS
                    │  ├─ SWIPE_MIN_DISTANCE
                    │  ├─ PULL_TO_REFRESH_MIN
                    │  ├─ LONG_PRESS_DURATION
                    │  └─ ...
                    │
                    └─ MOBILE_BEHAVIOR
                       ├─ TOUCH_TARGET_SIZE
                       ├─ MOMENTUM_DECAY
                       └─ HAPTIC_FEEDBACK
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Gesture Components  │
                    │ (interaction/)      │
                    ├─────────────────────┤
                    │ • SwipeGestures     │
                    │ • PullToRefresh     │
                    │ • InfiniteScroll    │
                    └─────────────────────┘
                              │
                    config/navigation.ts
                    ├─ MAIN_NAVIGATION
                    ├─ SECONDARY_NAV
                    └─ MOBILE_BOTTOM_NAV
                           │
                           ▼
                    ┌─────────────────────┐
                    │ Layout Components   │
                    │ (layout/)           │
                    ├─────────────────────┤
                    │ • NavigationDrawer  │
                    │ • BottomNavBar      │
                    │ • MobileLayout      │
                    └─────────────────────┘
                              │
                    config/mobile.ts
                    ├─ MOBILE_BREAKPOINTS
                    ├─ DEVICE_TYPES
                    ├─ DIMENSIONS
                    └─ PERFORMANCE_THRESHOLDS
                           │
                           ▼
                    ┌─────────────────────┐
                    │ Data Display        │
                    │ (data-display/)     │
                    ├─────────────────────┤
                    │ • Charts            │
                    │ • Cards             │
                    │ • Lists             │
                    └─────────────────────┘


All types unified in: types/mobile.ts
All hooks in: hooks/mobile/
```

---

## 🎯 Decision Tree: Which Component to Use?

```
Need a mobile component?

├─ Is it a GESTURE or TOUCH interaction?
│  ├─ YES → Use components/mobile/interaction/
│  │        • PullToRefresh
│  │        • SwipeGestures
│  │        • InfiniteScroll
│  │        • MobileBottomSheet
│  │
│  └─ Check: Extract hooks to hooks/mobile/
│
├─ Is it LAYOUT or NAVIGATION?
│  ├─ YES → Use components/mobile/layout/
│  │        • MobileLayout
│  │        • BottomNavigationBar
│  │        • NavigationDrawer
│  │        • MobileHeader
│  │
│  └─ Check: Navigation items from config/navigation.ts
│
├─ Is it CONTENT DISPLAY?
│  ├─ YES → Use components/mobile/data-display/
│  │        • MobileDataVisualization
│  │        • MobileTabSelector
│  │        • MobileBillCard
│  │        • MobileChartCarousel
│  │
│  └─ Check: Can you use responsive CSS instead?
│
└─ Is it DOMAIN-SPECIFIC (bills, tracking, etc)?
   └─ YES → Use features/[domain]/ui/
            Make it RESPONSIVE, not mobile-only!
```

---

## 📊 Phase Progression

```
PHASE 1: ARCHITECTURE SETUP ✅
├─ Create directories structure
├─ Create configuration files
├─ Create type definitions
├─ Create documentation
└─ Ready for component migration

                    ▼

PHASE 2: COMPONENT MIGRATION (READY TO START)
├─ Move components to subdirectories
├─ Extract hooks from components
├─ Archive legacy files
├─ Update all imports
└─ All tests passing

                    ▼

PHASE 3: RESPONSIVE ARCHITECTURE
├─ Consolidate mobile + desktop components
├─ Remove branching logic (if/isMobile)
├─ Use responsive CSS + container queries
└─ Complete test coverage

                    ▼

PHASE 4: PERFORMANCE OPTIMIZATION
├─ Bundle splitting
├─ Performance budgets
├─ Service worker caching
└─ Monitoring dashboard

                    ▼

PHASE 5: DEVELOPER EXPERIENCE
├─ Auto-generated docs
├─ Automated linting rules
├─ Team training
└─ Zero confusion for new devs
```

---

## 🎓 Import Pattern Evolution

```
❌ BEFORE (Chaos):
import { usePullToRefresh } from '@/components/mobile/PullToRefresh';
import { useSwipeGestures } from '@/components/mobile/SwipeGestures';
import { MobileLayout } from '@/components/mobile/MobileLayout';
→ Mixed hooks in components, unclear organization

                    ▼

✅ AFTER (Clear):
import { MobileLayout } from '@/components/mobile/layout';
import { PullToRefresh } from '@/components/mobile/interaction';
import { useSwipeGesture } from '@/hooks/mobile';
import { GESTURE_THRESHOLDS } from '@/config/gestures';
import type { SwipeDirection } from '@/types/mobile';
→ Crystal clear, single source of truth, proper organization
```

---

## 📈 Architecture Metrics

```
Metric                  Before      After       Target
───────────────────────────────────────────────────────
Mobile component files    15          8           8 ✅
Duplicate implementations  3+          0           0 ✅
Config file locations      5+          3           3 ✅
Type definition files      5+          1           1 ✅
Lines in MobileLayout     500+        ~80         ~80
Navigation variants        3           1           1
Hook clarity            Low         High        High ✅
Developer confusion     High         Low         Low ✅

Progress:             20%         100%
Timeline:           Complete     Phase 2 Ready
```

---

## 🔗 Quick Links

**Architecture:**
- `README_NEW_STRUCTURE.md` - Comprehensive guide
- `MOBILE_DEVELOPMENT_GUIDE.md` - Usage patterns

**Configuration:**
- `config/gestures.ts` - Gesture thresholds
- `config/mobile.ts` - Device configuration
- `config/navigation.ts` - Navigation structure

**Types:**
- `types/mobile.ts` - All mobile types

**Archive:**
- `__archive__/ARCHIVE_README.md` - Legacy files

**Tracking:**
- `docs/mobile/MOBILE_REFACTORING_IMPLEMENTATION_CHECKLIST.md` - Progress tracker
- `docs/mobile/MOBILE_REFACTORING_SETUP_SUMMARY.md` - Project summary
