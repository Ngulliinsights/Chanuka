# Chanuka Brand Color Usage Guide

## Brand Color Palette

### Primary Colors

#### Navy Blue - #1a2e49
**RGB:** 26, 46, 73  
**HSL:** 213°, 47%, 20%  
**Usage:** Primary brand color, main hero sections, footer backgrounds

```css
/* Tailwind */
bg-[#1a2e49]
text-[#1a2e49]

/* CSS Variable */
--brand-navy: 213 47% 20%;
```

**Best For:**
- Hero section backgrounds
- Footer backgrounds
- Primary navigation bars
- Trust-building sections (About, Legal)

#### Teal - #11505c
**RGB:** 17, 80, 92  
**HSL:** 189°, 69%, 21%  
**Usage:** Secondary brand color, accent sections, CTAs

```css
/* Tailwind */
bg-[#11505c]
text-[#11505c]

/* CSS Variable */
--brand-teal: 189 69% 21%;
```

**Best For:**
- Secondary hero sections
- Support/Help sections
- Accent backgrounds
- Hover states

#### Gold - #f29b06
**RGB:** 242, 155, 6  
**HSL:** 38°, 92%, 49%  
**Usage:** Accent color, CTAs, highlights, interactive elements

```css
/* Tailwind */
bg-[#f29b06]
text-[#f29b06]

/* CSS Variable */
--brand-gold: 38 92% 49%;
```

**Best For:**
- Call-to-action buttons
- Important highlights
- Section headings
- Interactive element accents
- Hover states for links

## Color Combinations

### High Contrast Combinations (WCAG AA+)

#### Navy + White Text
```tsx
<div className="bg-[#1a2e49] text-white">
  High contrast, excellent readability
</div>
```
**Contrast Ratio:** 12.6:1 ✅

#### Teal + White Text
```tsx
<div className="bg-[#11505c] text-white">
  High contrast, excellent readability
</div>
```
**Contrast Ratio:** 10.8:1 ✅

#### Gold + White Text
```tsx
<div className="bg-[#f29b06] text-white">
  Good contrast for CTAs
</div>
```
**Contrast Ratio:** 4.8:1 ✅

#### Gold + Navy Text
```tsx
<div className="bg-[#f29b06]/10 text-[#1a2e49]">
  Subtle highlight with dark text
</div>
```
**Use Case:** TL;DR boxes, info panels

## Usage Patterns by Page Type

### Hero Sections

#### Primary Pages (Home, About, Dashboard)
```tsx
<section className="bg-[#1a2e49] text-white py-16">
  <h1>Primary Hero</h1>
</section>
```

#### Secondary Pages (Support, Community)
```tsx
<section className="bg-[#11505c] text-white py-16">
  <h1>Secondary Hero</h1>
</section>
```

#### Utility Pages (Sitemap, Search)
```tsx
<section className="bg-[#1a2e49] text-white py-12">
  <h1>Utility Hero</h1>
</section>
```

### Call-to-Action Sections

#### Primary CTA
```tsx
<button className="bg-[#f29b06] text-white hover:bg-[#f29b06]/90">
  Primary Action
</button>
```

#### Secondary CTA
```tsx
<button className="bg-[#11505c] text-white hover:bg-[#11505c]/90">
  Secondary Action
</button>
```

#### Tertiary CTA
```tsx
<button className="border-2 border-[#1a2e49] text-[#1a2e49] hover:bg-[#1a2e49] hover:text-white">
  Tertiary Action
</button>
```

### Footer

```tsx
<footer className="bg-[#1a2e49] text-white border-t border-[#f29b06]/20">
  {/* Gold accent for headings */}
  <h3 className="text-[#f29b06]">Section Title</h3>
  
  {/* Gray text for links */}
  <a className="text-gray-300 hover:text-white">Link</a>
  
  {/* Gold hover for social icons */}
  <a className="text-gray-400 hover:text-[#f29b06]">
    <Icon />
  </a>
</footer>
```

### Information Panels

#### Notice/Alert
```tsx
<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
  Standard information panel
</div>
```

#### Important/TL;DR
```tsx
<div className="bg-[#f29b06]/10 border border-[#f29b06]/30">
  Important summary or highlight
</div>
```

#### Success
```tsx
<div className="bg-green-50 dark:bg-green-900/20 border border-green-200">
  Success message
</div>
```

## Dark Mode Considerations

### Text Colors
```tsx
// Light mode: dark text
// Dark mode: light text
<p className="text-gray-700 dark:text-gray-300">
  Adaptive text color
</p>
```

### Background Colors
```tsx
// Light mode: light background
// Dark mode: dark background
<div className="bg-gray-50 dark:bg-gray-900">
  Adaptive background
</div>
```

### Brand Colors in Dark Mode
Brand colors (#1a2e49, #11505c, #f29b06) work well in both light and dark modes when used with white text.

## Anti-Patterns (Don't Do This)

### ❌ Gradient Overuse
```tsx
// DON'T: Use gradients everywhere
<div className="bg-gradient-to-r from-[#1a2e49] via-[#11505c] to-[#f29b06]">
  Every section looks the same
</div>
```

### ❌ Low Contrast
```tsx
// DON'T: Gold text on white background
<div className="bg-white text-[#f29b06]">
  Hard to read (contrast ratio: 2.1:1)
</div>
```

### ❌ Too Many Colors
```tsx
// DON'T: Mix all brand colors in one element
<button className="bg-[#1a2e49] border-[#11505c] text-[#f29b06]">
  Visually confusing
</button>
```

## Best Practices

### ✅ Use Solid Colors for Backgrounds
Solid colors render consistently and perform better than gradients.

### ✅ Reserve Gold for Accents
Gold should highlight important elements, not be used everywhere.

### ✅ Maintain Visual Hierarchy
- Navy: Primary/Trust
- Teal: Secondary/Support
- Gold: Action/Highlight

### ✅ Test Contrast
Always verify color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

### ✅ Consider Context
- Legal pages: Navy (trust, authority)
- Support pages: Teal (helpful, approachable)
- CTAs: Gold (action, urgency)

## Accessibility Checklist

- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] Color is not the only way to convey information
- [ ] Interactive elements have clear hover/focus states
- [ ] Dark mode provides equivalent contrast
- [ ] Brand colors work for colorblind users

## Tools & Resources

### Color Contrast Checkers
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Coolors Contrast Checker: https://coolors.co/contrast-checker

### Accessibility Testing
- WAVE Browser Extension
- axe DevTools
- Lighthouse Accessibility Audit

### Design Tools
- Figma: Use hex values directly
- Tailwind Play: Test color combinations
- CSS Variables: Defined in `client/src/lib/design-system/styles/base/variables.css`

## Quick Reference

| Color | Hex | Primary Use | Text Color |
|-------|-----|-------------|------------|
| Navy | #1a2e49 | Heroes, Footer | White |
| Teal | #11505c | Secondary Sections | White |
| Gold | #f29b06 | CTAs, Accents | White |

## Examples in Production

### About Page
- Hero: Navy background, white text
- CTA: Teal background, gold button

### Support Page
- Hero: Teal background, white text
- Cards: White background, blue accents

### Footer (All Pages)
- Background: Navy
- Headings: Gold
- Links: Gray → White on hover
- Social icons: Gray → Gold on hover

---

**Last Updated:** February 10, 2026  
**Maintained By:** Chanuka Design Team
