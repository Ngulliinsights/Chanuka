# SVG Brand Asset Visual Integration Guide

## Quick Reference: Where Each Asset Is Used

### 🎯 Navigation Bar
```
┌────────────────────────────────────────────────────────┐
│ [Sidemark Logo]  Search...    🔔 👤                    │
└────────────────────────────────────────────────────────┘
```
- **Desktop**: `ChanukaSidemark` (full logo + text)
- **Mobile**: `ChanukaSmallLogo` (compact icon)
- **Size**: Small (h-10)
- **Purpose**: Consistent brand presence, navigation home

### 🎨 Hero Section (Home Page)
```
┌────────────────────────────────────────────────────────┐
│                  [Floating Accent]                     │
│                                                        │
│              [Large Animated Logo]                     │
│                                                        │
│           Democracy in Your Hands                      │
│                                                        │
│  [Floating Accent]                                     │
└────────────────────────────────────────────────────────┘
```
- **Center**: `HeroBrandElement` (extra large with gradient)
- **Corners**: `FloatingBrandAccent` (subtle watermarks)
- **Size**: XL for main, full for accents
- **Purpose**: Strong first impression, brand authority

### 🔒 Security Features
```
┌────────────────────────────────────────────────────────┐
│  [Shield Icon]  Secure & Private                       │
│                 256-bit Encryption                     │
└────────────────────────────────────────────────────────┘
```
- **Icon**: `DocumentShieldIcon`
- **Size**: Medium to Large
- **Purpose**: Trust indicators, security messaging

### 📦 Feature Cards
```
┌──────────────────┐  ┌──────────────────┐
│   [Shield Icon]  │  │   [Other Icon]   │
│                  │  │                  │
│  Feature Title   │  │  Feature Title   │
│  Description...  │  │  Description...  │
└──────────────────┘  └──────────────────┘
```
- **Icon**: `DocumentShieldIcon` for security features
- **Size**: Small to Medium
- **Purpose**: Visual consistency, feature identification

### ⏳ Loading States
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              [Animated Pulsing Logo]                   │
│                                                        │
│                  Loading...                            │
│              ████████░░░░░░░░ 60%                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- **Full Screen**: `AnimatedChanukaLogo` (XL, animated)
- **Inline**: `AnimatedChanukaLogo` (MD, animated)
- **Minimal**: `ChanukaSmallLogo` (SM, spinning)
- **Purpose**: Maintain brand during waits

### 📭 Empty States
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              [Faded Logo/Shield]                       │
│                                                        │
│              No Results Found                          │
│         Try adjusting your search...                   │
│                                                        │
│              [Action Button]                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- **Icon**: `ChanukaSmallLogo` or `DocumentShieldIcon`
- **Size**: Large, low opacity (20%)
- **Purpose**: Maintain visual interest, guide actions

### 🦶 Footer
```
┌────────────────────────────────────────────────────────┐
│ [Wordmark]                                             │
│ Empowering citizens...                                 │
│                                                        │
│ [Shield] Secure & Trusted                              │
│          256-bit encryption                            │
│                                                        │
│ Platform | Resources | Company | Legal                 │
│                                                        │
│ © 2026 Chanuka    [Social Icons]    Made with ❤️      │
└────────────────────────────────────────────────────────┘
```
- **Main**: `ChanukaWordmark` (horizontal layout)
- **Trust Badge**: `DocumentShieldIcon` (small)
- **Size**: Medium for wordmark, small for shield
- **Purpose**: Comprehensive navigation, trust building

### 🎭 Background Accents
```
┌────────────────────────────────────────────────────────┐
│ [Watermark - opacity 2%]                               │
│                                                        │
│              Content Area                              │
│                                                        │
│                              [Watermark - opacity 2%]  │
└────────────────────────────────────────────────────────┘
```
- **Asset**: `ChanukaFullLogo` or `ChanukaSmallLogo`
- **Size**: Full (800px+)
- **Opacity**: 2-5%
- **Purpose**: Fill space, add depth, subtle branding

## Size Reference Chart

| Size | Dimensions | Use Case | Example |
|------|------------|----------|---------|
| `xs` | 24x24px | Favicons, tiny icons | Notification badges |
| `sm` | 48x48px | Navigation, cards | Nav bar mobile |
| `md` | 96x96px | Feature icons, inline | Feature cards |
| `lg` | 128x128px | Empty states, sections | Empty state icons |
| `xl` | 192x192px | Hero elements, splash | Hero logo |
| `full` | 100% width | Backgrounds, watermarks | Page backgrounds |

## Color Variants

### Light Backgrounds
```tsx
// Default - uses original colors
<ChanukaFullLogo size="md" />
```

### Dark Backgrounds
```tsx
// Inverted for dark backgrounds
<ChanukaWordmark 
  size="md" 
  className="brightness-0 invert" 
/>
```

### Subtle Accents
```tsx
// Low opacity for backgrounds
<ChanukaSmallLogo 
  size="lg" 
  className="opacity-20" 
/>
```

## Animation States

### Static
```tsx
<ChanukaFullLogo size="md" />
```

### Pulsing (Loading)
```tsx
<AnimatedChanukaLogo 
  size="lg" 
  animate={true} 
/>
```

### Spinning (Processing)
```tsx
<div className="animate-spin">
  <ChanukaSmallLogo size="sm" />
</div>
```

### Hover Effect
```tsx
<div className="transition-transform hover:scale-105">
  <ChanukaSidemark size="sm" />
</div>
```

## Responsive Breakpoints

### Mobile (<768px)
- Use `ChanukaSmallLogo` in navigation
- Reduce decorative accents
- Smaller hero logos
- Essential branding only

### Tablet (768px-1023px)
- Use `ChanukaSidemark` in navigation
- Medium-sized hero elements
- Some decorative accents
- Balanced branding

### Desktop (≥1024px)
- Use `ChanukaSidemark` in navigation
- Large hero elements
- Full decorative accents
- Complete brand experience

## Common Patterns

### Pattern 1: Hero with Accents
```tsx
<section className="relative">
  <FloatingBrandAccent position="top-right" />
  <FloatingBrandAccent position="bottom-left" />
  <HeroBrandElement />
</section>
```

### Pattern 2: Loading Screen
```tsx
<BrandedLoadingScreen
  message="Loading your dashboard"
  variant="full"
  showProgress={true}
  progress={60}
/>
```

### Pattern 3: Empty State
```tsx
<BrandedEmptyState
  title="No Bills Found"
  description="Try adjusting your filters"
  icon="shield"
  actionLabel="Browse All Bills"
  actionLink="/bills"
/>
```

### Pattern 4: Trust Indicator
```tsx
<div className="flex items-center gap-3">
  <DocumentShieldIcon size="sm" />
  <div>
    <p className="font-semibold">Secure & Trusted</p>
    <p className="text-sm">256-bit encryption</p>
  </div>
</div>
```

## Accessibility Checklist

- ✅ All logos have descriptive `aria-label`
- ✅ Decorative elements use `aria-hidden="true"`
- ✅ Sufficient color contrast (WCAG AA)
- ✅ Loading states announce to screen readers
- ✅ Interactive elements are keyboard accessible
- ✅ Focus indicators are visible

## Performance Tips

1. **Use appropriate sizes** - Don't load XL assets for small displays
2. **Lazy load** - Use `loading="lazy"` for below-fold images
3. **Optimize animations** - Use CSS transforms, not position changes
4. **Cache assets** - SVGs are cached by the browser
5. **Reduce motion** - Respect `prefers-reduced-motion`

## Quick Start Examples

### Add logo to navigation
```tsx
import { ChanukaSidemark } from '@client/lib/design-system';

<nav>
  <ChanukaSidemark size="sm" className="h-10 w-auto" />
</nav>
```

### Add loading screen
```tsx
import { BrandedLoadingScreen } from '@client/lib/ui/loading/BrandedLoadingScreen';

{isLoading && <BrandedLoadingScreen message="Loading..." />}
```

### Add empty state
```tsx
import { EmptyStates } from '@client/lib/ui/states/BrandedEmptyState';

{bills.length === 0 && <EmptyStates.NoBills />}
```

### Add footer
```tsx
import { BrandedFooter } from '@client/app/shell/BrandedFooter';

<BrandedFooter />
```

---

**Need Help?** Check the full documentation in `SVG_INTEGRATION_STRATEGY.md`
