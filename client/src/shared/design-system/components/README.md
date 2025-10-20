# Component Design Standards

This directory contains comprehensive design standards for consistent UI/UX across all Chanuka components. The design standards implement modern design principles with accessibility compliance and beautiful visual consistency.

## Overview

The component design standards provide:

- **Interactive States**: Consistent hover, focus, active, and disabled states
- **Loading States**: Unified loading indicators with skeleton screens and progress bars
- **Error States**: Clear error messaging with helpful recovery actions
- **Empty States**: Actionable guidance with visual appeal
- **Typography**: Consistent text hierarchy and styling
- **Component Standards**: Button, card, input, and other component patterns

## Architecture

### Design Principles

1. **Accessibility First**: WCAG 2.1 AA compliance with proper contrast, keyboard navigation, and screen reader support
2. **Visual Consistency**: Unified color palette, typography, spacing, and component styling
3. **User-Centered Design**: Intuitive interactions with clear visual feedback
4. **Performance Optimized**: Efficient animations and optimized rendering
5. **Responsive Design**: Mobile-first approach with consistent breakpoints

### File Structure

```
components/
├── interactive-states.ts      # Interactive state patterns
├── loading-states.ts         # Loading indicators and skeletons
├── error-states.ts          # Error messaging and recovery
├── empty-states.ts          # Empty state guidance
├── button.ts               # Button component standards
├── card.ts                 # Card component standards
├── input.ts                # Input component standards
├── typography.ts           # Typography hierarchy
├── design-standards.css    # Complete CSS implementation
├── DesignStandardsDemo.tsx # Interactive demo component
└── __tests__/             # Comprehensive test suite
```

## Usage

### Importing Design Standards

```typescript
import {
  interactiveStateUtils,
  loadingStateUtils,
  errorStateUtils,
  emptyStateUtils,
  buttonUtils,
  cardUtils,
  inputUtils,
  typographyUtils,
} from '@/shared/design-system/components';
```

### CSS Integration

```css
/* Import the complete design standards CSS */
@import '@/shared/design-system/components/design-standards.css';
```

## Interactive States

### Usage Examples

```typescript
// Generate interactive state classes
const buttonClasses = interactiveStateUtils.getStateClasses('button', {
  hover: true,
  focus: true,
});

// Get state styles programmatically
const hoverStyles = interactiveStateUtils.getStateStyles('card', 'hover');

// Validate accessibility
const validation = interactiveStateUtils.validateAccessibility({
  hasVisibleFocus: true,
  hasKeyboardSupport: true,
  hasAriaStates: true,
  meetsContrastRequirements: true,
});
```

### CSS Classes

```css
/* Interactive component base */
.chanuka-interactive-button
.chanuka-interactive-card
.chanuka-interactive-input

/* State modifiers */
.chanuka-button-hover
.chanuka-button-focus
.chanuka-button-active
.chanuka-button-disabled
```

## Loading States

### Spinner Components

```typescript
// Create spinner with size
const spinnerClasses = loadingStateUtils.getSpinnerClasses('large');

// Create loading overlay
const overlay = loadingStateUtils.createLoadingOverlay('Loading data...');
```

### Skeleton Screens

```typescript
// Create skeleton layout
const skeletonLayout = loadingStateUtils.createSkeletonLayout({
  title: true,
  paragraphs: 3,
  avatar: true,
  button: true,
});
```

### Progress Indicators

```typescript
// Determinate progress
const progressBar = loadingStateUtils.createProgressBar(75);

// Indeterminate progress
const indeterminateBar = loadingStateUtils.createProgressBar(undefined, true);
```

### CSS Classes

```css
/* Spinners */
.chanuka-spinner
.chanuka-spinner-small
.chanuka-spinner-medium
.chanuka-spinner-large

/* Skeletons */
.chanuka-skeleton
.chanuka-skeleton-text
.chanuka-skeleton-avatar

/* Progress bars */
.chanuka-progress-bar
.chanuka-progress-fill
.chanuka-progress-indeterminate

/* Loading overlays */
.chanuka-loading-overlay
```

## Error States

### Error Messages

```typescript
// Create error message with actions
const errorMessage = errorStateUtils.createErrorMessage({
  title: 'Connection Failed',
  description: 'Unable to connect to the server.',
  severity: 'error',
  actions: [
    { label: 'Retry', action: handleRetry, type: 'primary' },
    { label: 'Cancel', action: handleCancel, type: 'secondary' },
  ],
});
```

### Inline Errors

```typescript
// Create inline error for forms
const inlineError = errorStateUtils.createInlineError('This field is required');
```

### Error Boundaries

```typescript
// Create error boundary fallback
const errorBoundary = errorStateUtils.createErrorBoundary({
  title: 'Something went wrong',
  description: 'An unexpected error occurred.',
  onRetry: handleRetry,
  onReport: handleReport,
});
```

### CSS Classes

```css
/* Error containers */
.chanuka-error
.chanuka-error-info
.chanuka-error-warning
.chanuka-error-error
.chanuka-error-critical

/* Error components */
.chanuka-error-title
.chanuka-error-description
.chanuka-error-actions
.chanuka-error-inline
.chanuka-error-boundary
```

## Empty States

### Empty State Creation

```typescript
// Create contextual empty state
const emptyState = emptyStateUtils.createEmptyState({
  type: 'noData',
  title: 'No data available',
  description: 'There is no data to display at the moment.',
  actions: [
    { label: 'Refresh', action: handleRefresh, type: 'primary' },
    { label: 'Learn More', action: handleLearnMore, type: 'secondary' },
  ],
  layout: 'standard',
  context: 'dashboard',
});
```

### Contextual Suggestions

```typescript
// Get contextual suggestions
const suggestions = emptyStateUtils.getContextualSuggestions('search');
// Returns: ['Try different search terms', 'Check your spelling', ...]
```

### CSS Classes

```css
/* Empty state containers */
.chanuka-empty-state
.chanuka-empty-compact
.chanuka-empty-standard
.chanuka-empty-spacious

/* Context variants */
.chanuka-empty-dashboard
.chanuka-empty-modal
.chanuka-empty-page

/* Empty state components */
.chanuka-empty-icon
.chanuka-empty-title
.chanuka-empty-description
.chanuka-empty-actions
```

## Typography

### Heading Styles

```typescript
// Get heading styles
const h1Styles = typographyUtils.getHeadingStyles('h1');
const h2Styles = typographyUtils.getHeadingStyles('h2');
```

### Body Text Styles

```typescript
// Get body text styles
const bodyStyles = typographyUtils.getBodyStyles('default');
const largeBodyStyles = typographyUtils.getBodyStyles('large');
```

### CSS Classes

```css
/* Typography base */
.chanuka-typography

/* Headings */
.chanuka-heading-h1
.chanuka-heading-h2
.chanuka-heading-h3

/* Body text */
.chanuka-body-large
.chanuka-body-default
.chanuka-body-small

/* Links */
.chanuka-link-default
.chanuka-link-subtle

/* Specialized */
.chanuka-specialized-code
```

## Component Standards

### Buttons

```typescript
// Generate button classes
const buttonClasses = buttonUtils.getButtonClasses('primary', 'md', false, false);

// Get button styles
const buttonStyles = buttonUtils.getButtonStyles('primary', 'md', 'hover');

// Validate button accessibility
const validation = buttonUtils.validateAccessibility({
  hasText: true,
  hasAriaLabel: false,
  width: 48,
  height: 48,
});
```

### Cards

```typescript
// Generate card classes
const cardClasses = cardUtils.getCardClasses('elevated', 'lg', true);

// Get card styles
const cardStyles = cardUtils.getCardStyles('default', 'md', 'hover');
```

### Inputs

```typescript
// Generate input classes
const inputClasses = inputUtils.getInputClasses('outlined', 'lg', 'focus');

// Get input styles
const inputStyles = inputUtils.getInputStyles('filled', 'md', 'error');
```

## Accessibility Features

### WCAG 2.1 AA Compliance

- **Color Contrast**: All color combinations meet minimum contrast ratios
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels, roles, and live regions
- **Focus Management**: Visible focus indicators and logical tab order
- **Touch Targets**: Minimum 44px touch targets for mobile devices

### Accessibility Validation

Each design standard includes validation utilities:

```typescript
// Validate interactive state accessibility
const interactiveValidation = interactiveStateUtils.validateAccessibility({
  hasVisibleFocus: true,
  hasKeyboardSupport: true,
  hasAriaStates: true,
  meetsContrastRequirements: true,
});

// Validate loading state accessibility
const loadingValidation = loadingStateUtils.validateAccessibility({
  hasAriaLabel: true,
  hasLiveRegion: true,
  hasVisualIndicator: true,
  hasTextAlternative: true,
});
```

## Responsive Design

### Breakpoint Support

The design standards include responsive utilities and breakpoint-aware components:

```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .chanuka-btn-lg {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .chanuka-spinner,
  .chanuka-skeleton::after {
    animation: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .chanuka-card {
    border: 2px solid #000000;
  }
}
```

## Performance Considerations

### Optimized Animations

- CSS transforms for smooth animations
- Hardware acceleration where appropriate
- Respect for `prefers-reduced-motion`
- Efficient keyframe animations

### Lazy Loading Support

- Skeleton screens for content loading
- Progressive enhancement patterns
- Optimized asset loading

## Testing

### Comprehensive Test Suite

The design standards include extensive tests covering:

- Utility function behavior
- Accessibility validation
- CSS class generation
- Style object creation
- Edge cases and error handling

### Running Tests

```bash
# Run design standards tests
npm test -- design-standards.test.ts

# Run with coverage
npm test -- --coverage design-standards.test.ts
```

## Demo Component

The `DesignStandardsDemo` component provides an interactive demonstration of all design standards:

```typescript
import { DesignStandardsDemo } from '@/shared/design-system/components/DesignStandardsDemo';

// Use in your application
<DesignStandardsDemo className="my-demo" />
```

## Migration Guide

### From Existing Components

1. **Import Design Standards**: Add imports for relevant utilities
2. **Apply CSS Classes**: Use the standardized CSS classes
3. **Update Interactions**: Implement consistent interactive states
4. **Add Accessibility**: Ensure ARIA attributes and keyboard support
5. **Test Thoroughly**: Validate with the provided test utilities

### Example Migration

```typescript
// Before
<button className="custom-button" onClick={handleClick}>
  Click me
</button>

// After
<button 
  className={buttonUtils.getButtonClasses('primary', 'md')}
  onClick={handleClick}
  aria-label="Submit form"
>
  Click me
</button>
```

## Contributing

When adding new design standards:

1. Follow the established patterns and naming conventions
2. Include comprehensive TypeScript types
3. Add accessibility validation utilities
4. Write thorough tests
5. Update documentation and examples
6. Ensure responsive design support

## Browser Support

The design standards support:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

With graceful degradation for older browsers and progressive enhancement for modern features.