# Chanuka Design System

A comprehensive design system for the Chanuka Legislative Transparency Platform, ensuring consistent UI/UX across all components while maintaining accessibility and performance standards.

## 🎯 Philosophy

- **Separation of Concerns**: CSS and TypeScript are completely separated
- **Design Tokens**: All styling uses centralized design tokens
- **Accessibility First**: WCAG 2.1 AA compliance built-in
- **Performance Optimized**: GPU-accelerated animations and optimized rendering
- **Mobile-First**: Responsive design with touch-friendly interactions

## 📁 Structure

```
shared/design-system/
├── components/          # Component style definitions
│   ├── loading-states.ts    # Loading spinners, skeletons, overlays
│   ├── error-states.ts      # Error messages, boundaries, recovery
│   ├── button.ts           # Button variants and states
│   └── ...
├── tokens/             # Design tokens
│   ├── colors.ts           # Color palette and semantic colors
│   ├── spacing.ts          # Spacing scale and component spacing
│   ├── typography.ts       # Font scales and text styles
│   └── animations.ts       # Animation timing and easing
├── themes/             # Theme configurations
│   ├── light.ts           # Light theme
│   ├── dark.ts            # Dark theme
│   └── high-contrast.ts   # High contrast theme
└── utils/              # Utility functions
    ├── classNames.ts      # Class name utilities
    └── responsive.ts      # Responsive helpers
```

## 🚀 Quick Start

### Using Loading States

```tsx
import { loadingStateUtils } from '../shared/design-system/components/loading-states';

// Create a loading overlay
function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="chanuka-loading-overlay">
        <div className="chanuka-spinner chanuka-spinner-large" aria-hidden="true" />
        <p className="chanuka-loading-message" role="status" aria-live="polite">
          Loading data...
        </p>
      </div>
    );
  }

  return <div>Content loaded!</div>;
}
```

### Using Error States

```tsx
import { errorStateUtils } from '../shared/design-system/components/error-states';

function ErrorExample() {
  const errorConfig = errorStateUtils.createErrorBoundary({
    title: 'Something went wrong',
    description: 'Please try again or contact support.',
    onRetry: () => window.location.reload(),
  });

  return (
    <div className="chanuka-error-boundary">
      <div className="chanuka-error-boundary-icon" aria-hidden="true">
        ⚠️
      </div>
      <h2 className="chanuka-error-boundary-title">{errorConfig.children.title.text}</h2>
      <p className="chanuka-error-boundary-description">{errorConfig.children.description.text}</p>
      <div className="chanuka-error-actions">
        <button
          type="button"
          onClick={errorConfig.children.actions.children[0].onClick}
          className="chanuka-error-action chanuka-error-action-primary"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

## 🎨 Available Components

### Loading States

- **Spinners**: `chanuka-spinner-{small|medium|large|xlarge}`
- **Skeletons**: `chanuka-skeleton-{text|title|paragraph|avatar|button}`
- **Overlays**: `chanuka-loading-overlay`
- **Progress**: `chanuka-progress-bar`

### Error States

- **Severities**: `chanuka-error-{info|warning|error|critical}`
- **Boundaries**: `chanuka-error-boundary`
- **Inline**: `chanuka-error-inline`
- **Actions**: `chanuka-error-action-{primary|secondary}`

### Buttons

- **Variants**: `chanuka-btn-{primary|secondary|outline|ghost}`
- **Sizes**: `chanuka-btn-{sm|md|lg}`
- **States**: Hover, focus, disabled built-in

### Cards

- **Base**: `chanuka-card`
- **Sections**: `chanuka-card-{header|content|footer}`
- **Interactive**: Hover effects included

## 🎯 Design Tokens

### Colors

```css
/* Primary brand colors */
--primary: 213 94% 23%;
--accent: 28 94% 54%;

/* Semantic colors */
--success: 142 71% 45%;
--warning: 43 96% 56%;
--error: 0 84% 60%;
--info: 213 94% 68%;
```

### Spacing

```css
/* T-shirt sizing */
--space-xs: 0.25rem; /* 4px */
--space-sm: 0.5rem; /* 8px */
--space-md: 1rem; /* 16px */
--space-lg: 1.5rem; /* 24px */
--space-xl: 2rem; /* 32px */
```

### Typography

```css
/* Font scale */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
```

## ♿ Accessibility Features

### Built-in ARIA Support

- Loading states include `role="status"` and `aria-live="polite"`
- Error states include `role="alert"` for critical errors
- Focus management with visible focus indicators
- Screen reader announcements for state changes

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .chanuka-spinner,
  .chanuka-skeleton::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

### High Contrast Support

```css
@media (prefers-contrast: high) {
  .chanuka-error,
  .chanuka-btn {
    border: 2px solid;
  }
}
```

## 📱 Mobile Optimization

### Touch Targets

- Minimum 44px touch targets on mobile
- Proper spacing between interactive elements
- Touch-friendly hover states

### Performance

- GPU-accelerated animations
- Optimized for 60fps scrolling
- Minimal layout shifts

## 🔧 Migration Guide

### From Inline Styles

```tsx
// ❌ Before (inline styles)
<div style={{
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#3b82f6'
}}>

// ✅ After (design system)
<div className="chanuka-loading-overlay">
```

### From CSS Modules

```tsx
// ❌ Before (CSS modules)
import styles from './Component.module.css';
<div className={styles.container}>

// ✅ After (design system)
<div className="chanuka-card">
```

## 🚨 Common Pitfalls

1. **Don't use inline styles for static styling** - Use design system classes for consistent colors, spacing, typography
2. **DO use inline styles for dynamic values** - Progress bars, animations, calculations, data visualization
3. **Don't hardcode theme colors** - Use design tokens via CSS custom properties
4. **Don't skip accessibility** - Always include proper ARIA attributes
5. **Don't forget mobile** - Test on touch devices
6. **Don't ignore reduced motion** - Respect user preferences

## 🎯 When to Use Inline Styles vs Classes

### ✅ Use Inline Styles For:

- Dynamic calculations: `style={{ width: \`\${progress}%\` }}`
- Performance transforms: `style={{ transform: \`translate3d(\${x}px, \${y}px, 0)\` }}`
- Data visualization: `style={{ backgroundColor: getColor(data) }}`
- CSS custom properties: `style={{ "--theme-color": color }}`

### ✅ Use Design System Classes For:

- Static button styling: `className="chanuka-btn-primary"`
- Layout containers: `className="chanuka-loading-overlay"`
- Typography: `className="chanuka-text-lg"`
- Consistent spacing: `className="chanuka-card"`

## 🔍 Debugging

### CSS Class Inspector

Use browser dev tools to inspect applied classes:

```css
/* Check if design system CSS is loaded */
.chanuka-spinner {
  /* Should show design system styles */
}
```

### Performance Monitoring

```tsx
// Check for layout shifts
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'layout-shift') {
      console.log('Layout shift detected:', entry.value);
    }
  }
});
observer.observe({ entryTypes: ['layout-shift'] });
```

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Reduced Motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Touch Targets](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

## 🤝 Contributing

When adding new components:

1. Follow the existing naming convention (`chanuka-*`)
2. Include accessibility attributes
3. Support reduced motion preferences
4. Test on mobile devices
5. Document usage examples
