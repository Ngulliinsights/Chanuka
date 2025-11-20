# Chanuka Styling Guidelines

## 🎯 Styling Decision Tree

### When to use what:

#### ✅ **Use Tailwind Classes For:**
- Layout and spacing: `flex`, `grid`, `p-4`, `m-2`
- Responsive design: `md:flex-row`, `lg:grid-cols-3`
- State variants: `hover:bg-blue-500`, `focus:ring-2`
- Quick prototyping and one-off styles

#### ✅ **Use shadcn/ui Components For:**
- Interactive components: `Button`, `Dialog`, `Select`
- Form elements: `Input`, `Textarea`, `Checkbox`
- Complex UI patterns: `DropdownMenu`, `Tooltip`

#### ✅ **Use Design System Classes For:**
- Consistent component styling: `.chanuka-card`, `.chanuka-btn`
- Brand-specific patterns: `.civic-status-badge`
- Complex animations and transitions

#### ✅ **Use CSS Custom Properties For:**
- Dynamic values: `style={{ '--progress': '75%' }}`
- Theme-aware colors: `color: hsl(var(--color-primary))`
- Component-specific configuration

#### ❌ **Avoid:**
- Inline styles for static values
- Multiple competing button implementations
- Hardcoded colors (use design tokens)
- CSS-in-JS for static styles

## 🏗️ Component Architecture

### Preferred Pattern:
```tsx
// 1. Use shadcn/ui as base
import { Button } from '@/components/ui/button'

// 2. Extend with Tailwind for layout
<Button className="w-full md:w-auto">

// 3. Use design tokens for custom values
<div style={{ '--custom-color': 'hsl(var(--color-accent))' }}>
```

### Component Hierarchy:
1. **shadcn/ui** - Interactive behavior and accessibility
2. **Tailwind** - Layout, spacing, responsive design  
3. **Design System** - Brand consistency and complex patterns
4. **CSS Custom Properties** - Dynamic and calculated values

## 🎨 Color Usage

### Use Design Tokens:
```css
/* ✅ Good */
background-color: hsl(var(--color-primary));
color: hsl(var(--color-success));

/* ❌ Bad */
background-color: #1e40af;
color: green;
```

### Tailwind Color Classes:
```tsx
{/* ✅ Good - uses design tokens */}
<div className="bg-primary text-primary-foreground">

{/* ❌ Bad - hardcoded colors */}
<div className="bg-blue-600 text-white">
```

## 📱 Responsive Design

### Mobile-First Approach:
```tsx
{/* ✅ Good */}
<div className="flex flex-col md:flex-row gap-4 md:gap-6">

{/* ❌ Bad */}
<div className="lg:flex lg:flex-row md:flex-col flex-col">
```

### Touch Targets:
```tsx
{/* ✅ Good - meets accessibility requirements */}
<button className="min-h-[44px] min-w-[44px] p-3">

{/* ❌ Bad - too small for touch */}
<button className="p-1 text-xs">
```

## 🔧 Performance Guidelines

### CSS Bundle Optimization:
- Use Tailwind's purge feature
- Avoid unused design system classes
- Prefer CSS custom properties over CSS-in-JS
- Use `@layer` directive for custom CSS

### Runtime Performance:
- Minimize inline style calculations
- Use CSS transforms for animations
- Prefer CSS Grid/Flexbox over JavaScript layout
- Cache computed styles in useMemo

## 🧪 Testing Styles

### Visual Regression:
- Test components in light/dark themes
- Verify responsive breakpoints
- Check accessibility (high contrast, reduced motion)
- Validate touch targets on mobile

### Code Quality:
- Use TypeScript for component props
- Validate design token usage
- Check for unused CSS classes
- Ensure consistent naming conventions