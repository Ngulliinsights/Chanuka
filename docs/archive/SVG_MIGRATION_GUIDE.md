# SVG Brand Asset Migration Guide

## Overview

This guide helps you migrate existing pages and components to use the new centralized brand asset system.

## Before You Start

### Import the New Components
```tsx
// Old way - scattered imports
import { ChanukaLogo } from '@client/lib/design-system';

// New way - centralized brand assets
import {
  ChanukaFullLogo,
  ChanukaSidemark,
  ChanukaWordmark,
  DocumentShieldIcon,
  ChanukaSmallLogo,
  AnimatedChanukaLogo,
  HeroBrandElement,
  FloatingBrandAccent,
} from '@client/lib/design-system';
```

## Migration Patterns

### 1. Navigation Bar Logo

**Before:**
```tsx
<Link to="/">
  <ChanukaLogo size={40} />
</Link>
```

**After:**
```tsx
<Link to="/" className="transition-transform hover:scale-105">
  <div className="md:hidden">
    <ChanukaSmallLogo size="sm" />
  </div>
  <div className="hidden md:block">
    <ChanukaSidemark size="sm" className="h-10 w-auto" />
  </div>
</Link>
```

**Benefits:**
- Responsive sizing
- Better mobile experience
- Hover effects
- Consistent branding

### 2. Hero Sections

**Before:**
```tsx
<section className="hero">
  <h1>Welcome to Chanuka</h1>
  <p>Democracy in your hands</p>
</section>
```

**After:**
```tsx
<section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
  <FloatingBrandAccent position="top-right" className="opacity-3" />
  <FloatingBrandAccent position="bottom-left" className="opacity-3" />
  
  <div className="container mx-auto px-4 relative z-10">
    <HeroBrandElement className="mb-8" />
    <h1>Welcome to Chanuka</h1>
    <p>Democracy in your hands</p>
  </div>
</section>
```

**Benefits:**
- Visual depth with floating accents
- Strong brand presence
- Professional appearance
- Better visual hierarchy

### 3. Loading States

**Before:**
```tsx
{isLoading && (
  <div className="flex items-center justify-center">
    <div className="spinner" />
    <p>Loading...</p>
  </div>
)}
```

**After:**
```tsx
import { BrandedLoadingScreen } from '@client/lib/ui/loading/BrandedLoadingScreen';

{isLoading && (
  <BrandedLoadingScreen
    message="Loading your content"
    variant="inline"
    showProgress={true}
    progress={loadingProgress}
  />
)}
```

**Benefits:**
- Branded experience
- Progress indication
- Multiple variants
- Consistent styling

### 4. Empty States

**Before:**
```tsx
{items.length === 0 && (
  <div className="text-center">
    <p>No items found</p>
    <button>Add Item</button>
  </div>
)}
```

**After:**
```tsx
import { BrandedEmptyState } from '@client/lib/ui/states/BrandedEmptyState';

{items.length === 0 && (
  <BrandedEmptyState
    title="No Items Found"
    description="Get started by adding your first item"
    icon="logo"
    actionLabel="Add Item"
    onAction={handleAddItem}
  />
)}
```

**Benefits:**
- Visual consistency
- Clear calls to action
- Brand reinforcement
- Better UX

### 5. Security/Trust Indicators

**Before:**
```tsx
<div className="security-badge">
  <ShieldIcon />
  <span>Secure</span>
</div>
```

**After:**
```tsx
<div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
  <DocumentShieldIcon size="sm" />
  <div>
    <p className="font-semibold text-gray-900">Secure & Trusted</p>
    <p className="text-sm text-gray-600">256-bit encryption</p>
  </div>
</div>
```

**Benefits:**
- Brand-specific icon
- Professional appearance
- Clear messaging
- Trust building

### 6. Feature Cards

**Before:**
```tsx
<div className="feature-card">
  <GenericIcon />
  <h3>Feature Title</h3>
  <p>Description</p>
</div>
```

**After:**
```tsx
<Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
  <CardHeader className="text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
      <DocumentShieldIcon size="sm" className="invert" />
    </div>
    <CardTitle>Feature Title</CardTitle>
  </CardHeader>
  <CardContent>
    <CardDescription>Description</CardDescription>
  </CardContent>
</Card>
```

**Benefits:**
- Consistent iconography
- Smooth animations
- Professional styling
- Better engagement

### 7. Footer

**Before:**
```tsx
<footer>
  <div>© 2026 Chanuka</div>
  <nav>
    <Link to="/about">About</Link>
    <Link to="/contact">Contact</Link>
  </nav>
</footer>
```

**After:**
```tsx
import { BrandedFooter } from '@client/app/shell/BrandedFooter';

<BrandedFooter />
```

**Benefits:**
- Comprehensive navigation
- Brand integration
- Trust indicators
- Social links
- Professional appearance

## Page-by-Page Migration Checklist

### Home Page
- [ ] Replace hero logo with `HeroBrandElement`
- [ ] Add `FloatingBrandAccent` components
- [ ] Update feature cards with `DocumentShieldIcon`
- [ ] Add trust indicators section
- [ ] Implement branded CTA section

### Dashboard
- [ ] Add branded loading states
- [ ] Implement branded empty states
- [ ] Add subtle background watermarks
- [ ] Update card icons

### Bills Page
- [ ] Branded loading for bill list
- [ ] Empty state for no results
- [ ] Document shield for security features
- [ ] Branded filters section

### Community Page
- [ ] Branded empty state for no posts
- [ ] Loading states for content
- [ ] Trust indicators for verified users
- [ ] Background accents

### Profile/Settings
- [ ] Branded loading states
- [ ] Empty states for no data
- [ ] Security indicators
- [ ] Trust badges

## Common Issues & Solutions

### Issue 1: Logo Too Large on Mobile
**Problem:**
```tsx
<ChanukaFullLogo size="xl" />
```

**Solution:**
```tsx
<div className="hidden md:block">
  <ChanukaFullLogo size="xl" />
</div>
<div className="md:hidden">
  <ChanukaSmallLogo size="md" />
</div>
```

### Issue 2: Floating Accents Covering Content
**Problem:**
```tsx
<FloatingBrandAccent position="top-right" />
<div>Content here</div>
```

**Solution:**
```tsx
<div className="relative">
  <FloatingBrandAccent position="top-right" className="opacity-3" />
  <div className="relative z-10">Content here</div>
</div>
```

### Issue 3: Loading State Not Centered
**Problem:**
```tsx
<AnimatedChanukaLogo size="lg" />
```

**Solution:**
```tsx
<div className="flex items-center justify-center min-h-[400px]">
  <AnimatedChanukaLogo size="lg" animate={true} />
</div>
```

### Issue 4: Icons Not Visible on Dark Background
**Problem:**
```tsx
<div className="bg-gray-900">
  <ChanukaWordmark size="md" />
</div>
```

**Solution:**
```tsx
<div className="bg-gray-900">
  <ChanukaWordmark size="md" className="brightness-0 invert" />
</div>
```

## Testing Checklist

After migration, verify:

### Visual
- [ ] Logos display correctly on all screen sizes
- [ ] Animations are smooth (60fps)
- [ ] Colors match brand guidelines
- [ ] Spacing is consistent
- [ ] Hover effects work properly

### Functional
- [ ] Links navigate correctly
- [ ] Loading states show/hide properly
- [ ] Empty states display when appropriate
- [ ] Responsive behavior works
- [ ] Touch targets are adequate (44x44px minimum)

### Accessibility
- [ ] All logos have proper aria-labels
- [ ] Decorative elements are aria-hidden
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA

### Performance
- [ ] Page load time not significantly impacted
- [ ] Images lazy load when appropriate
- [ ] Animations don't cause jank
- [ ] Bundle size increase is acceptable
- [ ] No console errors or warnings

## Rollout Strategy

### Phase 1: Core Pages (Week 1)
1. Home page
2. Navigation bar
3. Footer
4. Loading states

### Phase 2: Feature Pages (Week 2)
1. Bills page
2. Dashboard
3. Community page
4. Search results

### Phase 3: Secondary Pages (Week 3)
1. Profile pages
2. Settings
3. About/Help pages
4. Error pages

### Phase 4: Polish (Week 4)
1. Animations refinement
2. Performance optimization
3. Accessibility audit
4. User testing feedback

## Support & Resources

### Documentation
- [Integration Strategy](./SVG_INTEGRATION_STRATEGY.md)
- [Visual Guide](./SVG_VISUAL_GUIDE.md)
- [Component API](../src/lib/design-system/media/BrandAssets.tsx)

### Examples
- [Enhanced Home Page](../src/features/home/pages/EnhancedHomePage.tsx)
- [Navigation Bar](../src/app/shell/NavigationBar.tsx)
- [Branded Footer](../src/app/shell/BrandedFooter.tsx)

### Getting Help
- Design Team: design@chanuka.org
- Development Team: dev@chanuka.org
- Slack: #brand-assets

## Quick Reference

### Most Common Replacements

| Old | New | Context |
|-----|-----|---------|
| `<ChanukaLogo />` | `<ChanukaSidemark />` | Navigation |
| Generic spinner | `<BrandedLoadingScreen />` | Loading |
| Empty div | `<BrandedEmptyState />` | No content |
| Shield icon | `<DocumentShieldIcon />` | Security |
| Background image | `<FloatingBrandAccent />` | Decoration |

---

**Questions?** Check the [FAQ](./SVG_INTEGRATION_FAQ.md) or reach out to the team!
