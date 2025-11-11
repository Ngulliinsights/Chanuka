# Chanuka Client Accessibility Guide

## Overview

This guide documents the accessibility features and usage patterns implemented in the Chanuka client UI to ensure WCAG 2.1 AA compliance and provide an inclusive experience for all users.

## Accessibility Features

### 1. Keyboard Navigation

#### Skip Links
- **Skip to main content**: Available on all pages, becomes visible when focused
- **Skip to navigation**: Allows quick access to main navigation
- **Skip to search**: Direct access to search functionality

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<a href="#navigation" class="skip-link">Skip to navigation</a>
<a href="#search" class="skip-link">Skip to search</a>
```

#### Tab Order
- Logical tab order throughout the application
- Interactive elements are reachable via keyboard
- Focus indicators are clearly visible
- No keyboard traps (except in modals where appropriate)

#### Keyboard Shortcuts
- `Tab`: Move to next focusable element
- `Shift + Tab`: Move to previous focusable element
- `Enter/Space`: Activate buttons and links
- `Escape`: Close modals, dropdowns, and menus
- `Arrow keys`: Navigate within menus, tabs, and lists

### 2. Screen Reader Support

#### Semantic HTML
- Proper heading hierarchy (h1-h6)
- Landmark regions (header, nav, main, aside, footer)
- Lists for grouped content
- Tables with proper headers and captions

#### ARIA Labels and Descriptions
```html
<!-- Button with accessible name -->
<button aria-label="Save bill to reading list">💾</button>

<!-- Input with description -->
<input 
  type="search" 
  aria-label="Search bills"
  aria-describedby="search-help"
/>
<div id="search-help">Enter keywords to search legislation</div>

<!-- Status updates -->
<div role="status" aria-live="polite">
  Search returned 25 results
</div>
```

#### Live Regions
- Status updates announced automatically
- Error messages with `role="alert"`
- Loading states with appropriate announcements

### 3. Visual Accessibility

#### Color Contrast
- Normal text: 4.5:1 contrast ratio minimum
- Large text: 3:1 contrast ratio minimum
- Interactive elements meet contrast requirements
- High contrast mode available

#### Color Independence
- Information not conveyed by color alone
- Icons and text labels supplement color coding
- Pattern and texture used in addition to color

#### Focus Indicators
- Clear, visible focus indicators on all interactive elements
- Enhanced focus mode available for better visibility
- Focus indicators work in high contrast mode

### 4. Touch Accessibility

#### Touch Target Sizes
- Minimum 44x44px touch targets on mobile
- Adequate spacing between touch targets
- Larger targets for primary actions

#### Gesture Support
- All functionality available without complex gestures
- Alternative methods for swipe actions
- Orientation support (portrait and landscape)

## Component Accessibility Patterns

### Navigation Components

#### NavigationBar
```tsx
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/bills" aria-current="page">Bills</a></li>
    <li><a href="/community">Community</a></li>
    <li><a href="/profile">Profile</a></li>
  </ul>
</nav>
```

#### Breadcrumbs
```tsx
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/bills">Bills</a></li>
    <li aria-current="page">HB-2024-001</li>
  </ol>
</nav>
```

### Form Components

#### Form Labels
```tsx
<label htmlFor="email">Email Address</label>
<input 
  id="email" 
  type="email" 
  required 
  aria-describedby="email-help"
/>
<div id="email-help">We'll never share your email</div>
```

#### Error Handling
```tsx
<input 
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<div id="email-error" role="alert">
  Please enter a valid email address
</div>
```

#### Fieldsets and Legends
```tsx
<fieldset>
  <legend>Notification Preferences</legend>
  <label>
    <input type="checkbox" name="notifications" value="email" />
    Email notifications
  </label>
  <label>
    <input type="checkbox" name="notifications" value="sms" />
    SMS notifications
  </label>
</fieldset>
```

### Interactive Components

#### Buttons
```tsx
<!-- Button with accessible name -->
<button aria-label="Close dialog">×</button>

<!-- Button with description -->
<button aria-describedby="save-help">Save</button>
<div id="save-help">Save this bill to your reading list</div>
```

#### Modal Dialogs
```tsx
<div 
  role="dialog" 
  aria-modal="true" 
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-description">Are you sure you want to delete this item?</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

#### Dropdown Menus
```tsx
<button 
  aria-expanded="false"
  aria-haspopup="true"
  aria-controls="menu"
>
  Menu
</button>
<ul id="menu" role="menu" hidden>
  <li role="none">
    <a href="/option1" role="menuitem">Option 1</a>
  </li>
  <li role="none">
    <a href="/option2" role="menuitem">Option 2</a>
  </li>
</ul>
```

### Data Display Components

#### Tables
```tsx
<table>
  <caption>Bills Summary</caption>
  <thead>
    <tr>
      <th scope="col">Bill Number</th>
      <th scope="col">Title</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">HB-2024-001</th>
      <td>Healthcare Reform Act</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

#### Lists
```tsx
<!-- Unordered list -->
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>

<!-- Definition list -->
<dl>
  <dt>Bill Status</dt>
  <dd>Currently active in committee review</dd>
  <dt>Sponsor</dt>
  <dd>Representative Jane Smith</dd>
</dl>
```

## Accessibility Testing

### Automated Testing

#### Running Accessibility Tests
```bash
# Run all accessibility tests
npm run test:a11y

# Run specific accessibility test suites
npm test -- --testPathPattern=accessibility

# Run with coverage
npm run test:coverage -- --testPathPattern=accessibility
```

#### Axe-core Integration
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should be accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

#### Keyboard Testing Checklist
- [ ] All interactive elements reachable via Tab
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Skip links work correctly
- [ ] Escape key closes modals/menus
- [ ] Arrow keys work in menus/tabs
- [ ] Enter/Space activate elements

#### Screen Reader Testing
- [ ] Content structure makes sense
- [ ] Headings create logical outline
- [ ] Form labels are associated
- [ ] Error messages are announced
- [ ] Status updates are announced
- [ ] Images have appropriate alt text

#### Visual Testing
- [ ] Color contrast meets requirements
- [ ] Information not conveyed by color alone
- [ ] Focus indicators are visible
- [ ] Text is readable at 200% zoom
- [ ] High contrast mode works

## Accessibility Settings

### User Preferences

#### Font Size Scaling
```css
.font-small { font-size: 14px; }
.font-medium { font-size: 16px; }
.font-large { font-size: 18px; }
.font-extra-large { font-size: 20px; }
```

#### High Contrast Mode
```css
.high-contrast {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --primary: 0 0% 0%;
  --primary-foreground: 0 0% 100%;
}
```

#### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Enhanced Focus Indicators
```css
.enhanced-focus *:focus {
  outline: 3px solid #2563eb !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.2) !important;
}
```

## Common Accessibility Issues and Solutions

### Issue: Missing Form Labels
**Problem**: Form inputs without associated labels
**Solution**: Always use explicit labels or aria-label
```tsx
// Good
<label htmlFor="username">Username</label>
<input id="username" type="text" />

// Also good
<input type="text" aria-label="Username" />
```

### Issue: Poor Color Contrast
**Problem**: Text doesn't meet contrast requirements
**Solution**: Use colors that meet WCAG standards
```css
/* Good - meets 4.5:1 ratio */
.text-primary { color: #1f2937; }
.bg-primary { background-color: #ffffff; }
```

### Issue: Missing Focus Indicators
**Problem**: No visible focus indication
**Solution**: Ensure all interactive elements have focus styles
```css
button:focus,
a:focus,
input:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

### Issue: Inaccessible Modals
**Problem**: Focus not managed in modal dialogs
**Solution**: Implement proper focus management
```tsx
const Modal = ({ isOpen, onClose }) => {
  const firstFocusableRef = useRef();
  
  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
    }
  }, [isOpen]);
  
  return (
    <div role="dialog" aria-modal="true">
      <button ref={firstFocusableRef} onClick={onClose}>
        Close
      </button>
    </div>
  );
};
```

## Resources and Tools

### Testing Tools
- **axe-core**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Accessibility auditing
- **Screen readers**: NVDA, JAWS, VoiceOver

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

### Browser Extensions
- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Accessibility Insights**: Microsoft's accessibility testing tool

## Support and Feedback

### Accessibility Statement
The Chanuka platform is committed to ensuring digital accessibility for all users. We continuously work to improve the accessibility of our platform and welcome feedback.

### Contact Information
- **Email**: accessibility@chanuka.ke
- **Phone**: +254-XXX-XXXX
- **Feedback Form**: [Accessibility Feedback](https://chanuka.ke/accessibility-feedback)

### Reporting Issues
If you encounter accessibility barriers while using the Chanuka platform:
1. Describe the issue in detail
2. Include your browser and assistive technology information
3. Provide steps to reproduce the issue
4. Suggest improvements if possible

We aim to respond to accessibility feedback within 2 business days and resolve issues within 5 business days when possible.