# Responsive Design System

A comprehensive mobile-first responsive design system with consistent breakpoints, adaptive layouts, touch-friendly interactions, and visual hierarchy.

## Features

- **Mobile-First Approach**: All components and utilities are designed mobile-first with progressive enhancement
- **Consistent Breakpoints**: Standardized breakpoint system across all components
- **Touch-Friendly**: Optimized for touch devices with proper minimum sizes and spacing
- **Accessibility**: WCAG 2.1 AA compliant with proper focus management and screen reader support
- **Performance**: Optimized for performance with reduced motion support and efficient rendering
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Breakpoints

The system uses a mobile-first approach with the following breakpoints:

```typescript
const breakpoints = {
  mobile: '0px',        // Default, no prefix needed
  'mobile-sm': '320px', // Small mobile devices
  'mobile-lg': '480px', // Large mobile devices
  tablet: '640px',      // Tablets
  'tablet-lg': '768px', // Large tablets
  laptop: '1024px',     // Laptops
  'laptop-lg': '1280px',// Large laptops
  desktop: '1440px',    // Desktops
  'desktop-xl': '1920px'// Ultra-wide displays
};
```

## Components

### ResponsiveContainer

A container component that provides consistent responsive behavior with proper padding and max-widths.

```tsx
import { ResponsiveContainer } from '@/shared/design-system';

<ResponsiveContainer maxWidth="laptop" padding="lg">
  <div>Your content here</div>
</ResponsiveContainer>
```

**Props:**
- `maxWidth`: Maximum width breakpoint or 'none'
- `padding`: Padding size ('none' | 'sm' | 'md' | 'lg' | 'xl')
- `as`: HTML element to render as
- `className`: Additional CSS classes

### ResponsiveGrid

A grid component that automatically adapts column count based on screen size.

```tsx
import { ResponsiveGrid } from '@/shared/design-system';

<ResponsiveGrid columns="auto" gap="md">
  <div>Grid item 1</div>
  <div>Grid item 2</div>
  <div>Grid item 3</div>
</ResponsiveGrid>
```

**Props:**
- `columns`: Column configuration ('auto' or responsive value object)
- `gap`: Gap size between items
- `minItemWidth`: Minimum width for grid items
- `as`: HTML element to render as

### ResponsiveStack

A flexible layout component that can switch between vertical and horizontal layouts.

```tsx
import { ResponsiveStack } from '@/shared/design-system';

<ResponsiveStack direction="responsive" breakpoint="tablet" gap="md">
  <div>Stack item 1</div>
  <div>Stack item 2</div>
</ResponsiveStack>
```

**Props:**
- `direction`: Layout direction ('vertical' | 'horizontal' | 'responsive')
- `breakpoint`: Breakpoint to switch from vertical to horizontal
- `gap`: Gap size between items
- `align`: Alignment of items
- `justify`: Justification of items

### ResponsiveButton

A button component optimized for responsive design with touch-friendly interactions.

```tsx
import { ResponsiveButton } from '@/shared/design-system';

<ResponsiveButton 
  variant="primary" 
  size="medium" 
  onClick={handleClick}
>
  Click me
</ResponsiveButton>
```

**Props:**
- `variant`: Button style ('primary' | 'secondary' | 'outline' | 'ghost' | 'destructive')
- `size`: Button size ('small' | 'medium' | 'large')
- `disabled`: Disabled state
- `loading`: Loading state with spinner
- `fullWidth`: Full width button
- `as`: Render as button or anchor

### ResponsiveInput

A form input component optimized for responsive design with touch-friendly interactions.

```tsx
import { ResponsiveInput } from '@/shared/design-system';

<ResponsiveInput 
  type="email" 
  size="medium" 
  placeholder="Enter your email"
  onChange={handleChange}
/>
```

**Props:**
- `type`: Input type
- `size`: Input size ('small' | 'medium' | 'large')
- `variant`: Input style ('default' | 'filled' | 'outline')
- `error`: Error state
- `disabled`: Disabled state

### TouchTarget

A component that ensures touch-friendly interactions with proper minimum sizes.

```tsx
import { TouchTarget } from '@/shared/design-system';

<TouchTarget size="medium" onClick={handleClick}>
  <Icon name="menu" />
</TouchTarget>
```

**Props:**
- `size`: Target size ('small' | 'medium' | 'large')
- `onClick`: Click handler
- `disabled`: Disabled state
- `as`: HTML element to render as

## Utilities

### useResponsive Hook

A React hook that provides responsive information and utilities.

```tsx
import { useResponsive } from '@/shared/design-system';

function MyComponent() {
  const { 
    currentBreakpoint, 
    isTouchDevice, 
    prefersReducedMotion,
    isDesktop,
    isTablet,
    isMobile,
    matchesBreakpoint,
    getResponsiveValue 
  } = useResponsive();

  const columns = getResponsiveValue({
    mobile: 1,
    tablet: 2,
    laptop: 4
  });

  return (
    <div>
      Current breakpoint: {currentBreakpoint}
      {isTouchDevice && <p>Touch device detected</p>}
    </div>
  );
}
```

### Responsive Utilities

```typescript
import { responsiveUtils } from '@/shared/design-system';

// Check if current viewport matches a breakpoint
const isTablet = responsiveUtils.matchesBreakpoint('tablet');

// Check if device supports touch
const isTouchDevice = responsiveUtils.isTouchDevice();

// Get current breakpoint
const currentBreakpoint = responsiveUtils.getCurrentBreakpoint();

// Get responsive value based on current breakpoint
const spacing = responsiveUtils.getResponsiveValue({
  mobile: '1rem',
  tablet: '1.5rem',
  laptop: '2rem'
});
```

## CSS Classes

The system provides utility CSS classes for common responsive patterns:

### Container Classes
```css
.responsive-container /* Base container with responsive padding */
```

### Grid Classes
```css
.responsive-grid      /* Base grid with responsive gaps */
.responsive-grid-auto /* Auto-responsive column count */
```

### Layout Classes
```css
.responsive-stack     /* Vertical stack layout */
.responsive-inline    /* Horizontal inline layout */
.responsive-sidebar   /* Sidebar layout */
```

### Component Classes
```css
.responsive-button    /* Touch-friendly button */
.responsive-input     /* Touch-friendly input */
.touch-target        /* Touch-friendly interactive element */
```

### Typography Classes
```css
.responsive-text-xs   /* Responsive extra small text */
.responsive-text-sm   /* Responsive small text */
.responsive-text-base /* Responsive base text */
.responsive-text-lg   /* Responsive large text */
.responsive-heading-1 /* Responsive heading 1 */
.responsive-heading-2 /* Responsive heading 2 */
.responsive-heading-3 /* Responsive heading 3 */
```

### Spacing Classes
```css
.responsive-space-xs  /* Extra small responsive spacing */
.responsive-space-sm  /* Small responsive spacing */
.responsive-space-md  /* Medium responsive spacing */
.responsive-space-lg  /* Large responsive spacing */
.responsive-p-md      /* Medium responsive padding */
.responsive-m-md      /* Medium responsive margin */
```

### Utility Classes
```css
.responsive-hidden-mobile  /* Hidden on mobile, visible on larger screens */
.responsive-hidden-desktop /* Hidden on desktop, visible on mobile */
.responsive-text-center-mobile /* Center text on mobile, left on desktop */
```

## Touch Optimization

The system automatically optimizes for touch devices:

- **Minimum Touch Targets**: 44px minimum (48px recommended)
- **Touch Spacing**: Proper spacing between interactive elements
- **Touch Gestures**: Optimized for touch manipulation
- **iOS Zoom Prevention**: 16px minimum font size on form inputs

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets contrast requirements
- **Reduced Motion**: Respects user motion preferences

## Performance

The system is optimized for performance:

- **CSS Custom Properties**: Efficient theme switching
- **Minimal JavaScript**: Lightweight runtime
- **Tree Shaking**: Only import what you use
- **GPU Acceleration**: Optimized animations
- **Reduced Motion**: Respects user preferences

## Usage Examples

### Basic Layout
```tsx
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveButton 
} from '@/shared/design-system';

function HomePage() {
  return (
    <ResponsiveContainer maxWidth="laptop-lg" padding="lg">
      <ResponsiveGrid columns="auto" gap="lg">
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
      </ResponsiveGrid>
      
      <ResponsiveButton variant="primary" size="large" fullWidth>
        Get Started
      </ResponsiveButton>
    </ResponsiveContainer>
  );
}
```

### Form Layout
```tsx
import { 
  ResponsiveContainer, 
  ResponsiveStack, 
  ResponsiveInput,
  ResponsiveButton 
} from '@/shared/design-system';

function ContactForm() {
  return (
    <ResponsiveContainer maxWidth="tablet" padding="md">
      <ResponsiveStack direction="vertical" gap="md">
        <ResponsiveInput 
          type="text" 
          placeholder="Your name" 
          size="large"
        />
        <ResponsiveInput 
          type="email" 
          placeholder="Your email" 
          size="large"
        />
        <ResponsiveButton 
          type="submit" 
          variant="primary" 
          size="large"
          fullWidth
        >
          Send Message
        </ResponsiveButton>
      </ResponsiveStack>
    </ResponsiveContainer>
  );
}
```

### Responsive Navigation
```tsx
import { useResponsive, TouchTarget } from '@/shared/design-system';

function Navigation() {
  const { isMobile, isTouchDevice } = useResponsive();
  
  return (
    <nav>
      {isMobile ? (
        <TouchTarget size={isTouchDevice ? "large" : "medium"}>
          <MenuIcon />
        </TouchTarget>
      ) : (
        <div className="responsive-inline">
          <a href="/home">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </div>
      )}
    </nav>
  );
}
```

## Best Practices

1. **Mobile First**: Always design for mobile first, then enhance for larger screens
2. **Touch Targets**: Use minimum 44px touch targets on interactive elements
3. **Consistent Spacing**: Use the responsive spacing scale for consistent layouts
4. **Performance**: Respect user preferences for reduced motion and high contrast
5. **Accessibility**: Always include proper ARIA labels and keyboard navigation
6. **Testing**: Test on real devices, not just browser dev tools
7. **Progressive Enhancement**: Ensure basic functionality works without JavaScript

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: CSS Grid, Flexbox, CSS Custom Properties, Container Queries (progressive enhancement)

## Migration Guide

To migrate existing components to use the responsive design system:

1. Replace hardcoded breakpoints with the standardized breakpoint system
2. Update touch targets to meet minimum size requirements
3. Use responsive spacing instead of fixed values
4. Add proper accessibility attributes
5. Test on multiple devices and screen sizes

## Contributing

When adding new components or utilities:

1. Follow the mobile-first approach
2. Include comprehensive TypeScript types
3. Add unit tests for all functionality
4. Document all props and usage examples
5. Ensure accessibility compliance
6. Test on multiple devices and browsers