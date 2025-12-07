# Phase 4 Step 4: Accessibility Tests - Implementation Guide

> **Status**: 🎯 READY TO START  
> **Timeline**: 1-2 days  
> **Tests Planned**: 100+ accessibility tests  
> **Impact**: 10% additional bug prevention  
> **Priority**: ✅ RECOMMENDED (community platform needs accessibility)

---

## Overview

Phase 4 Step 4 focuses on WCAG 2.1 Level AA accessibility compliance testing across all components. This ensures the platform is usable by people with disabilities and meets legal accessibility requirements.

**Key Focus Areas**:
1. ✅ Keyboard navigation (all features must be keyboard accessible)
2. ✅ ARIA labels and roles (screen reader compatibility)
3. ✅ Color contrast (WCAG AA minimum 4.5:1)
4. ✅ Focus management (logical tab order)
5. ✅ Semantic HTML (proper element usage)
6. ✅ Error handling (accessible error messages)

---

## Test Scope: 13 Components

| Component | Tests | Coverage |
|-----------|-------|----------|
| Button | 8 | Keyboard (Enter, Space), ARIA press |
| Card | 5 | Structure, semantic HTML, contrast |
| Input | 12 | Keyboard, labels, error messages, aria-invalid |
| Label | 6 | Association, required indicators, accessibility |
| Alert | 8 | ARIA roles, alert type, live regions |
| Badge | 4 | Color contrast, semantic meaning |
| Checkbox | 8 | Keyboard (Space), ARIA checked, focus |
| Switch | 8 | Keyboard (Arrow keys), ARIA switch role |
| Tooltip | 6 | Focus management, keyboard triggers |
| Dialog | 10 | Focus trap, escape key, ARIA modal |
| Avatar | 4 | Alt text, image semantics |
| Tabs | 10 | Keyboard (Arrow keys), ARIA tabs role |
| Progress | 4 | ARIA progressbar, value attributes |
| **TOTAL** | **93** | **All components covered** |

---

## Testing Tools & Setup

### Tools Required

```bash
# jest-axe - Automated accessibility testing
pnpm add -D jest-axe

# axe-core - Underlying accessibility engine
pnpm add -D axe-core

# Already in project: React Testing Library (supports a11y)
# Already in project: Vitest (test runner)
```

### Global Setup (Already Ready)

Your `vitest.setup.ts` already injects accessibility utilities:

```typescript
// Global test utilities include:
global.testUtils = {
  // ... existing utilities
  axeCheck: async (container) => { /* runs axe scan */ }
}
```

---

## Test Structure

### Standard A11y Test Pattern

```typescript
describe('Component Accessibility', () => {
  // 1. Automated accessibility checks
  it('should not have accessibility violations', async () => {
    const { container } = render(<Component />);
    const violations = await axe(container);
    expect(violations).toHaveLength(0);
  });

  // 2. Keyboard navigation
  it('should be keyboard navigable', async () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button');
    
    button.focus();
    expect(document.activeElement).toBe(button);
    
    userEvent.keyboard('{Enter}');
    expect(button).toHaveBeenActivated();
  });

  // 3. ARIA attributes
  it('should have correct ARIA attributes', () => {
    const { getByRole } = render(<Input label="Email" />);
    const input = getByRole('textbox');
    
    expect(input).toHaveAttribute('aria-label', 'Email');
  });

  // 4. Screen reader testing
  it('should be announced correctly by screen readers', () => {
    const { getByText } = render(
      <Alert type="error">Invalid input</Alert>
    );
    
    const alert = getByText('Invalid input');
    expect(alert).toHaveAttribute('role', 'alert');
  });
});
```

---

## Test Categories

### 1. Button Component (8 tests)

```typescript
describe('Button Accessibility', () => {
  // Keyboard activation
  it('should activate with Enter key', async () => { ... });
  it('should activate with Space key', async () => { ... });
  
  // ARIA attributes
  it('should have correct aria-label', () => { ... });
  it('should have aria-disabled when disabled', () => { ... });
  
  // Visual feedback
  it('should show focus indicator', () => { ... });
  it('should have sufficient color contrast', async () => { ... });
  
  // Screen reader
  it('should be announced as button', () => { ... });
  it('should announce disabled state', () => { ... });
});
```

### 2. Input Component (12 tests)

```typescript
describe('Input Accessibility', () => {
  // Label association
  it('should be associated with label', () => { ... });
  it('should have proper aria-labelledby', () => { ... });
  
  // Keyboard
  it('should be focusable', () => { ... });
  it('should accept keyboard input', async () => { ... });
  
  // Error handling
  it('should indicate error state with aria-invalid', () => { ... });
  it('should associate error message with aria-describedby', () => { ... });
  
  // ARIA attributes
  it('should have aria-required when required', () => { ... });
  it('should support aria-placeholder', () => { ... });
  
  // Validation
  it('should announce validation errors', () => { ... });
  it('should support readonly state', () => { ... });
  
  // Typing
  it('should work with screen readers during input', () => { ... });
  it('should not trap focus in autocomplete', () => { ... });
});
```

### 3. Dialog Component (10 tests)

```typescript
describe('Dialog Accessibility', () => {
  // Focus management
  it('should trap focus inside dialog', async () => { ... });
  it('should restore focus after close', () => { ... });
  
  // Keyboard
  it('should close on Escape key', async () => { ... });
  it('should maintain focus order', () => { ... });
  
  // ARIA attributes
  it('should have role="dialog"', () => { ... });
  it('should have aria-modal="true"', () => { ... });
  it('should have aria-label or aria-labelledby', () => { ... });
  
  // Screen reader
  it('should announce dialog opening', () => { ... });
  it('should have proper heading structure', () => { ... });
  it('should not have broken contrast in buttons', () => { ... });
});
```

### 4. Tabs Component (10 tests)

```typescript
describe('Tabs Accessibility', () => {
  // Keyboard navigation
  it('should navigate tabs with arrow keys', async () => { ... });
  it('should wrap focus at start/end', () => { ... });
  
  // ARIA attributes
  it('should have role="tablist"', () => { ... });
  it('should have role="tab" on tab buttons', () => { ... });
  it('should have role="tabpanel" on content', () => { ... });
  it('should have aria-selected on active tab', () => { ... });
  
  // Screen reader
  it('should announce current tab', () => { ... });
  it('should announce tab count', () => { ... });
  it('should link tabs to panels with aria-controls', () => { ... });
  it('should properly set aria-labelledby', () => { ... });
});
```

### 5. Alert Component (8 tests)

```typescript
describe('Alert Accessibility', () => {
  // ARIA roles
  it('should have role="alert"', () => { ... });
  it('should have aria-live="assertive"', () => { ... });
  
  // Screen reader
  it('should be announced immediately', () => { ... });
  it('should interrupt screen reader', () => { ... });
  
  // Visual indicators
  it('should have sufficient color contrast', async () => { ... });
  it('should not rely on color alone', () => { ... });
  
  // Keyboard
  it('should be keyboard accessible', () => { ... });
  it('should announce close action', () => { ... });
});
```

### 6. Checkbox & Switch (8 tests each)

**Checkbox**:
```typescript
it('should activate with Space key', async () => { ... });
it('should have aria-checked attribute', () => { ... });
it('should announce checked state', () => { ... });
it('should support required attribute', () => { ... });
it('should work with fieldset/legend', () => { ... });
it('should have visible focus indicator', () => { ... });
it('should not rely on color alone', () => { ... });
it('should announce disabled state', () => { ... });
```

**Switch**:
```typescript
it('should activate with Space key', async () => { ... });
it('should navigate with arrow keys', async () => { ... });
it('should have role="switch"', () => { ... });
it('should have aria-checked', () => { ... });
it('should announce on/off state', () => { ... });
it('should show clear focus indicator', () => { ... });
it('should have sufficient contrast', async () => { ... });
it('should announce disabled state', () => { ... });
```

### 7. Other Components (4-6 tests each)

**Label** (6 tests):
- Associated with input
- Proper htmlFor attribute
- Required indicator
- Error state
- Screen reader announcement
- Visible and keyboard accessible

**Tooltip** (6 tests):
- Keyboard trigger (usually Hover)
- ARIA-describedby association
- Screen reader announcement
- Focus management
- Not trap focus
- Close on Escape

**Avatar** (4 tests):
- Alt text for images
- Proper image semantics
- Fallback for missing images
- Semantic HTML

**Badge** (4 tests):
- Color contrast
- Not relying on color alone
- Semantic HTML
- Context provided for screen readers

**Card** (5 tests):
- Proper heading hierarchy
- Semantic structure
- Color contrast
- Keyboard navigation
- Focus visible

**Progress** (4 tests):
- role="progressbar"
- aria-valuenow attribute
- aria-valuemin and aria-valuemax
- Screen reader announcement

---

## Implementation Checklist

### Week 1: Core A11y Tests (Day 1)

```typescript
// Test file: client/src/components/ui/button.a11y.test.tsx

✅ Keyboard activation (Enter, Space)
✅ ARIA attributes (label, disabled, pressed)
✅ Focus visible indicator
✅ Color contrast (WCAG AA)
✅ Screen reader announcements
✅ No accessibility violations (axe)

// Test file: client/src/components/ui/input.a11y.test.tsx

✅ Label association
✅ Required indication
✅ Error state (aria-invalid)
✅ Error message link (aria-describedby)
✅ Keyboard input support
✅ Screen reader input type announcement
```

### Week 1: Advanced A11y Tests (Day 2)

```typescript
// Test file: client/src/components/ui/dialog.a11y.test.tsx

✅ Focus trap
✅ Escape key close
✅ Focus restoration
✅ aria-modal="true"
✅ Heading structure
✅ aria-labelledby link

// Test file: client/src/components/ui/tabs.a11y.test.tsx

✅ Arrow key navigation
✅ Tab role structure
✅ aria-selected state
✅ aria-controls link
✅ Wrap-around navigation
✅ Screen reader tab announcement
```

### Week 1: Component A11y Tests (Day 2-3)

```typescript
// Remaining components:

✅ Alert (role, aria-live, announcement)
✅ Badge (contrast, semantics)
✅ Checkbox (activation, aria-checked, focus)
✅ Switch (activation, role, state)
✅ Tooltip (trigger, focus, describedby)
✅ Avatar (alt text, semantics)
✅ Label (htmlFor, required)
✅ Card (structure, contrast)
✅ Progress (role, attributes)
```

---

## Key WCAG AA Criteria to Test

### Criterion 2.1.1: Keyboard (Level A)
- ✅ All functionality keyboard accessible
- ✅ No keyboard trap
- ✅ Logical tab order

### Criterion 2.1.2: No Keyboard Trap (Level A)
- ✅ Can escape with Tab/Escape
- ✅ Focus visible
- ✅ Keyboard accessible exit

### Criterion 2.4.7: Focus Visible (Level AA)
- ✅ Focus indicator visible
- ✅ Focus visible on all inputs
- ✅ Focus indicator minimum 3px

### Criterion 1.4.3: Contrast (Minimum) (Level AA)
- ✅ Text contrast 4.5:1
- ✅ UI component contrast 3:1
- ✅ Graphical objects contrast 3:1

### Criterion 1.3.1: Info and Relationships (Level A)
- ✅ Labels with inputs
- ✅ Instructions with form controls
- ✅ Proper semantic HTML

### Criterion 4.1.2: Name, Role, Value (Level A)
- ✅ Proper ARIA roles
- ✅ Correct ARIA attributes
- ✅ Screen reader compatibility

### Criterion 2.4.3: Focus Order (Level A)
- ✅ Logical tab order
- ✅ No focus reverse
- ✅ Meaningful sequence

### Criterion 1.4.5: Images of Text (Level AA)
- ✅ No images as text
- ✅ Actual text with styling
- ✅ Proper alt text

---

## Testing Utilities Available

### Global A11y Utilities

```typescript
// Already available in vitest.setup.ts:

// 1. Jest-axe integration
import { axe } from 'jest-axe';
const violations = await axe(container);

// 2. Screen reader simulation
screen.getByRole('button', { name: 'Click me' });

// 3. Keyboard simulation
userEvent.keyboard('{Tab}');
userEvent.keyboard('{Enter}');
userEvent.keyboard('{Escape}');
userEvent.keyboard('{ArrowDown}');

// 4. Focus testing
button.focus();
expect(document.activeElement).toBe(button);

// 5. ARIA attribute checking
expect(input).toHaveAttribute('aria-invalid', 'true');
expect(button).toHaveAttribute('aria-label', 'Close');
```

---

## Configuration Files

### jest-axe Setup

Already configured in `vitest.setup.ts`, but here's what's needed:

```typescript
// jest-axe configuration
import { configureAxe } from 'jest-axe';

configureAxe({
  rules: {
    // Disable specific rules if needed
    'color-contrast': { enabled: false }, // If custom implementation
  },
});
```

### Vitest Project Configuration

A11y tests are already in `vitest.workspace.ts`:

```typescript
{
  name: 'client-a11y',
  include: ['client/src/**/*.a11y.test.tsx'],
  environment: 'jsdom',
  globals: true,
  setupFiles: ['vitest.setup.ts'],
},
```

---

## Common A11y Patterns

### Pattern 1: Keyboard Navigation Testing

```typescript
it('should navigate with keyboard', async () => {
  const { getByRole } = render(<Tabs />);
  const firstTab = getByRole('tab', { current: true });
  
  firstTab.focus();
  await userEvent.keyboard('{ArrowRight}');
  
  expect(getByRole('tab', { current: true })).not.toBe(firstTab);
});
```

### Pattern 2: ARIA Attributes Testing

```typescript
it('should have correct ARIA attributes', () => {
  const { getByRole } = render(
    <Input label="Email" required error="Invalid" />
  );
  const input = getByRole('textbox', { name: 'Email' });
  
  expect(input).toHaveAttribute('aria-required', 'true');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', expect.any(String));
});
```

### Pattern 3: Focus Management Testing

```typescript
it('should trap focus in dialog', async () => {
  const { getByRole } = render(<Dialog>Content</Dialog>);
  const dialog = getByRole('dialog');
  const firstButton = getByRole('button', { name: 'Action' });
  const closeButton = getByRole('button', { name: 'Close' });
  
  firstButton.focus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}'); // Shift+Tab
  
  expect(document.activeElement).toBe(closeButton); // Focus wrapped
});
```

### Pattern 4: Accessibility Violation Checking

```typescript
it('should not have accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  
  expect(results.violations).toHaveLength(0);
});
```

---

## Expected Timeline

**Day 1 (8 hours)**:
- Button a11y tests (8 tests)
- Input a11y tests (12 tests)
- Dialog a11y tests (10 tests)
- Total: 30 tests

**Day 2 (8 hours)**:
- Tabs a11y tests (10 tests)
- Alert a11y tests (8 tests)
- Checkbox a11y tests (8 tests)
- Switch a11y tests (8 tests)
- Total: 34 tests

**Day 2-3 (4-8 hours)**:
- Remaining components (29 tests):
  - Tooltip, Avatar, Label, Card, Badge, Progress
- Total: 29 tests

**Grand Total**: ~93 tests, 1-2 days

---

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| Tests Created | 93+ | 🎯 Goal |
| All Components Covered | 13/13 | 🎯 Goal |
| WCAG AA Compliance | 100% | 🎯 Goal |
| Keyboard Navigation | 100% | 🎯 Goal |
| ARIA Attributes | 100% | 🎯 Goal |
| Screen Reader Tested | 100% | 🎯 Goal |
| Axe Violations | 0 | 🎯 Goal |
| Focus Management | 100% | 🎯 Goal |

---

## Next Phase After A11y

**Phase 5: Integration Tests** (3-5 days)
- Component workflows combining multiple components
- API interactions (MSW setup)
- Redux state management integration
- Form submission flows
- Error handling scenarios
- Data display workflows

---

## Summary

**Phase 4 Step 4 (Accessibility) is ready to implement.**

- ✅ Tools configured (jest-axe, Vitest)
- ✅ Framework ready (global utilities)
- ✅ 13 components identified
- ✅ 93 test cases planned
- ✅ WCAG AA criteria mapped
- ✅ Timeline: 1-2 days
- ✅ ROI: 10% additional bug prevention

**Next Action**: Begin accessibility testing (estimated 1-2 days after validation tests complete)

---

**Last Updated**: December 6, 2025  
**Status**: 🎯 READY TO IMPLEMENT  
**Next**: Phase 4 Step 4 - Accessibility Tests
