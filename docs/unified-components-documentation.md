# Unified Components Documentation

## Overview

The Unified Components library consolidates shadcn/ui with the Chanuka design system, providing a comprehensive set of accessible, mobile-first UI components optimized for civic engagement platforms. This documentation covers all unified components, their props, variants, accessibility features, and civic-specific use cases.

## Component Library

### UnifiedButton

A versatile button component with multiple variants and sizes, designed for both standard UI interactions and civic-specific actions.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"primary" \| "secondary" \| "accent" \| "success" \| "warning" \| "error" \| "outline" \| "ghost" \| "voteYes" \| "voteNo" \| "voteAbstain"` | `"primary"` | Button style variant |
| `size` | `"sm" \| "default" \| "lg" \| "icon"` | `"default"` | Button size |
| `asChild` | `boolean` | `false` | Renders as child element |
| `loading` | `boolean` | `false` | Shows loading spinner and disables button |
| `children` | `ReactNode` | - | Button content |
| `disabled` | `boolean` | - | Disables button |
| `aria-label` | `string` | - | Accessibility label |

#### Variants

- **Standard Variants**: `primary`, `secondary`, `accent`, `success`, `warning`, `error`, `outline`, `ghost`
- **Civic Variants**: `voteYes` (green), `voteNo` (red), `voteAbstain` (gray)

#### Accessibility Features

- Focus-visible ring with proper contrast
- Minimum touch target size (`--touch-target-min`)
- Screen reader support via `aria-label`
- Keyboard navigation support
- Loading state prevents accidental double-clicks

#### Civic Use Cases

```tsx
// Voting buttons in bill detail
<UnifiedButton variant="voteYes" size="lg">
  Vote Yes
</UnifiedButton>
<UnifiedButton variant="voteNo" size="lg">
  Vote No
</UnifiedButton>
<UnifiedButton variant="voteAbstain" size="lg">
  Abstain
</UnifiedButton>

// Loading state during submission
<UnifiedButton variant="primary" loading>
  Submitting Vote...
</UnifiedButton>
```

### UnifiedCard

A flexible card component for displaying content with consistent styling and hover effects.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |

#### Sub-components

- `UnifiedCardHeader`: Card header with muted background
- `UnifiedCardTitle`: Large title text
- `UnifiedCardDescription`: Muted description text
- `UnifiedCardContent`: Main content area
- `UnifiedCardFooter`: Footer with muted background

#### Accessibility Features

- Semantic structure with proper heading hierarchy
- Hover effects with smooth transitions
- Border changes on hover for visual feedback

#### Civic Use Cases

```tsx
// Bill card in dashboard
<UnifiedCard>
  <UnifiedCardHeader>
    <UnifiedCardTitle>HB 1234 - Education Reform</UnifiedCardTitle>
    <UnifiedCardDescription>Introduced January 15, 2025</UnifiedCardDescription>
  </UnifiedCardHeader>
  <UnifiedCardContent>
    <p>Comprehensive education funding reform...</p>
    <UnifiedBadge variant="legislativeIntroduced">Introduced</UnifiedBadge>
  </UnifiedCardContent>
  <UnifiedCardFooter>
    <UnifiedButton variant="outline" size="sm">View Details</UnifiedButton>
  </UnifiedCardFooter>
</UnifiedCard>
```

### UnifiedBadge

Status indicators and labels with multiple variants for different contexts.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "secondary" \| "success" \| "warning" \| "error" \| "outline" \| "legislativeIntroduced" \| "legislativePassed" \| "legislativeFailed" \| "legislativePending" \| "legislativeWithdrawn"` | `"default"` | Badge style variant |
| `error` | `boolean` | `false` | Forces error variant |
| `children` | `ReactNode` | - | Badge content |

#### Variants

- **Standard Variants**: `default`, `secondary`, `success`, `warning`, `error`, `outline`
- **Legislative Variants**:
  - `legislativeIntroduced`: Blue badge for introduced bills
  - `legislativePassed`: Green badge for passed bills
  - `legislativeFailed`: Red badge for failed bills
  - `legislativePending`: Yellow badge for pending bills
  - `legislativeWithdrawn`: Gray badge for withdrawn bills

#### Accessibility Features

- Focus-visible ring for keyboard navigation
- High contrast colors meeting WCAG AA standards
- Screen reader compatible

#### Civic Use Cases

```tsx
// Legislative status badges
<UnifiedBadge variant="legislativeIntroduced">Introduced</UnifiedBadge>
<UnifiedBadge variant="legislativePassed">Passed</UnifiedBadge>
<UnifiedBadge variant="legislativeFailed">Failed</UnifiedBadge>

// Error state override
<UnifiedBadge variant="success" error={true}>Failed to Load</UnifiedBadge>
```

### UnifiedInput

Accessible form input component with focus management and validation styling.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `"text"` | Input type |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | - | Disables input |
| `className` | `string` | - | Additional CSS classes |

#### Accessibility Features

- Focus-visible ring with proper offset
- Disabled state styling and cursor
- Placeholder text with muted foreground color
- Keyboard navigation support

#### Civic Use Cases

```tsx
// Search input in bills dashboard
<UnifiedInput
  type="search"
  placeholder="Search bills by keyword, sponsor, or topic..."
  aria-label="Search bills"
/>

// Comment input in community discussions
<UnifiedInput
  placeholder="Share your thoughts on this bill..."
  aria-label="Add comment"
/>
```

### UnifiedAlert

Contextual alert messages with different severity levels and proper ARIA support.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "success" \| "warning" \| "info"` | `"default"` | Alert style variant |
| `children` | `ReactNode` | - | Alert content |

#### Sub-components

- `UnifiedAlertTitle`: Alert heading
- `UnifiedAlertDescription`: Alert description text

#### Variants

- `default`: Neutral information
- `destructive`: Error/critical information
- `success`: Positive feedback
- `warning`: Cautionary information
- `info`: General information

#### Accessibility Features

- `role="alert"` for screen readers
- Semantic color coding
- Icon positioning with proper spacing

#### Civic Use Cases

```tsx
// Constitutional concern alert
<UnifiedAlert variant="warning">
  <UnifiedAlertTitle>⚠️ Constitutional Concern</UnifiedAlertTitle>
  <UnifiedAlertDescription>
    This bill may conflict with Article III. Expert analysis recommended.
  </UnifiedAlertDescription>
</UnifiedAlert>

// Successful vote submission
<UnifiedAlert variant="success">
  <UnifiedAlertTitle>Vote Recorded</UnifiedAlertTitle>
  <UnifiedAlertDescription>
    Your vote has been successfully submitted and counted.
  </UnifiedAlertDescription>
</UnifiedAlert>
```

### UnifiedTabs

Tab navigation component with error recovery and accessibility support.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Active tab value |
| `onValueChange` | `function` | - | Tab change handler |
| `children` | `ReactNode` | - | Tab content |

#### Sub-components

- `UnifiedTabsList`: Tab list container
- `UnifiedTabsTrigger`: Individual tab buttons
- `UnifiedTabsContent`: Tab panel content

#### UnifiedTabsContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `boolean` | `false` | Shows error state |
| `errorMessage` | `string` | `"Error loading tab content"` | Error message text |

#### Accessibility Features

- Proper ARIA attributes for tab navigation
- Focus management between tabs
- Keyboard navigation support
- Error state announcements

#### Civic Use Cases

```tsx
// Bill detail tabs
<UnifiedTabs value="overview" onValueChange={setActiveTab}>
  <UnifiedTabsList>
    <UnifiedTabsTrigger value="overview">Overview</UnifiedTabsTrigger>
    <UnifiedTabsTrigger value="full-text">Full Text</UnifiedTabsTrigger>
    <UnifiedTabsTrigger value="analysis">Analysis</UnifiedTabsTrigger>
    <UnifiedTabsTrigger value="community">Community</UnifiedTabsTrigger>
  </UnifiedTabsList>

  <UnifiedTabsContent value="overview">
    <BillOverview />
  </UnifiedTabsContent>

  <UnifiedTabsContent value="analysis" error={analysisError}>
    <BillAnalysis />
  </UnifiedTabsContent>
</UnifiedTabs>
```

### UnifiedAccordion

Collapsible content sections with smooth animations.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Accordion content |
| `defaultOpen` | `boolean` | `false` | Initial open state |

#### Sub-components

- `UnifiedAccordionTrigger`: Expandable trigger button
- `UnifiedAccordionContent`: Collapsible content area

#### Accessibility Features

- Proper ARIA expanded/collapsed states
- Keyboard navigation support
- Smooth transitions for state changes
- Chevron icon rotation animation

#### Civic Use Cases

```tsx
// Bill summary sections
<UnifiedAccordion>
  <UnifiedAccordionTrigger>Key Provisions</UnifiedAccordionTrigger>
  <UnifiedAccordionContent>
    <ul>
      <li>Increases education funding by 15%</li>
      <li>Reforms teacher certification requirements</li>
      <li>Adds STEM curriculum mandates</li>
    </ul>
  </UnifiedAccordionContent>
</UnifiedAccordion>
```

### UnifiedAccordionGroup

Multiple accordion items grouped together.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array<{id: string, title: string, content: ReactNode, defaultOpen?: boolean}>` | - | Accordion items |
| `className` | `string` | - | Additional CSS classes |

#### Civic Use Cases

```tsx
// FAQ section in bill detail
<UnifiedAccordionGroup
  items={[
    {
      id: 'impact',
      title: 'What is the economic impact?',
      content: <p>Detailed economic analysis...</p>
    },
    {
      id: 'timeline',
      title: 'What is the implementation timeline?',
      content: <p>Implementation schedule...</p>
    }
  ]}
/>
```

### UnifiedToolbar

Action toolbar with horizontal/vertical layouts.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout orientation |
| `children` | `ReactNode` | - | Toolbar content |

#### Sub-components

- `UnifiedToolbarButton`: Toolbar action buttons
- `UnifiedToolbarSeparator`: Visual separators

#### Accessibility Features

- Focus management within toolbar
- Keyboard navigation support
- Active state styling

#### Civic Use Cases

```tsx
// Bill detail toolbar
<UnifiedToolbar>
  <UnifiedToolbarButton>Save</UnifiedToolbarButton>
  <UnifiedToolbarButton>Share</UnifiedToolbarButton>
  <UnifiedToolbarSeparator />
  <UnifiedToolbarButton variant="active">Comments</UnifiedToolbarButton>
</UnifiedToolbar>
```

## Accessibility Notes

All unified components are designed to meet WCAG 2.1 AA standards:

- **Color Contrast**: All text meets 4.5:1 contrast ratio minimum
- **Focus Management**: Visible focus rings with proper offset
- **Touch Targets**: Minimum 44px touch targets on mobile
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full functionality without mouse interaction

## Best Practices

### Civic-Specific Guidelines

1. **Use Appropriate Variants**: Leverage civic-specific variants (vote buttons, legislative badges) for better semantic meaning
2. **Error Handling**: Always provide user-friendly error messages and recovery options
3. **Loading States**: Use loading props to prevent user confusion during async operations
4. **Progressive Disclosure**: Use accordions and tabs to manage information complexity
5. **Mobile-First**: Design for mobile first, enhance for larger screens

### Performance Considerations

1. **Lazy Loading**: Load component code only when needed
2. **Bundle Splitting**: Components are tree-shakeable for optimal bundle size
3. **CSS Optimization**: Uses CSS custom properties for theme consistency
4. **Animation Performance**: Hardware-accelerated transitions

### Implementation Examples

#### Bills Dashboard Card

```tsx
import { UnifiedCard, UnifiedCardHeader, UnifiedCardTitle, UnifiedCardDescription, UnifiedCardContent, UnifiedCardFooter, UnifiedBadge, UnifiedButton } from '../components/ui/unified-components';

function BillCard({ bill }) {
  return (
    <UnifiedCard>
      <UnifiedCardHeader>
        <UnifiedCardTitle>{bill.title}</UnifiedCardTitle>
        <UnifiedCardDescription>
          {bill.sponsor} • {bill.introducedDate}
        </UnifiedCardDescription>
      </UnifiedCardHeader>
      <UnifiedCardContent>
        <p>{bill.summary}</p>
        <div className="flex gap-2 mt-2">
          <UnifiedBadge variant={bill.statusVariant}>
            {bill.status}
          </UnifiedBadge>
          <UnifiedBadge variant="warning">
            Urgency: {bill.urgency}
          </UnifiedBadge>
        </div>
      </UnifiedCardContent>
      <UnifiedCardFooter>
        <UnifiedButton variant="outline" size="sm">
          View Details
        </UnifiedButton>
      </UnifiedCardFooter>
    </UnifiedCard>
  );
}
```

#### Voting Interface

```tsx
import { UnifiedButton } from '../components/ui/unified-components';

function VotingSection({ onVote, loading }) {
  return (
    <div className="flex gap-4 flex-wrap">
      <UnifiedButton
        variant="voteYes"
        size="lg"
        onClick={() => onVote('yes')}
        loading={loading}
        disabled={loading}
      >
        Vote Yes
      </UnifiedButton>
      <UnifiedButton
        variant="voteNo"
        size="lg"
        onClick={() => onVote('no')}
        loading={loading}
        disabled={loading}
      >
        Vote No
      </UnifiedButton>
      <UnifiedButton
        variant="voteAbstain"
        size="lg"
        onClick={() => onVote('abstain')}
        loading={loading}
        disabled={loading}
      >
        Abstain
      </UnifiedButton>
    </div>
  );
}
```

#### Error Boundary with Alert

```tsx
import { UnifiedAlert, UnifiedAlertTitle, UnifiedAlertDescription } from '../components/ui/unified-components';

function ErrorFallback({ error, resetError }) {
  return (
    <UnifiedAlert variant="destructive">
      <UnifiedAlertTitle>Something went wrong</UnifiedAlertTitle>
      <UnifiedAlertDescription>
        {error.message}
        <UnifiedButton
          variant="outline"
          size="sm"
          onClick={resetError}
          className="mt-2"
        >
          Try Again
        </UnifiedButton>
      </UnifiedAlertDescription>
    </UnifiedAlert>
  );
}
```

This documentation provides comprehensive guidance for implementing unified components in civic engagement applications, ensuring accessibility, usability, and consistency across the platform.