/**
 * Dark Mode Implementation Guide
 * 
 * How to integrate dark mode into your application
 */

# Dark Mode Implementation Guide

## Overview

The application now supports three theme modes:
- **Light**: Standard light theme with light backgrounds
- **Dark**: Dark theme optimized for low-light environments  
- **High Contrast**: Enhanced contrast for accessibility

All themes use CSS custom properties (HSL format) that automatically swap based on the selected theme.

## Quick Start

### 1. Wrap Your App with ThemeProvider

In your root component (e.g., `app.tsx` or `main.tsx`):

```tsx
import { ThemeProvider } from '@client/shared/design-system/theme/theme-provider';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}

export default App;
```

### 2. Add Theme Toggle Component

Add the theme toggle button to your header or settings:

```tsx
import { ThemeToggle } from '@client/components/ui/theme-toggle';

export function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle variant="dropdown" />
    </header>
  );
}
```

### 3. Use Theme in Components

Access the current theme with the `useTheme` hook:

```tsx
import { useTheme } from '@client/shared/design-system/theme/theme-provider';

export function MyComponent() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      {isDark && <p>Dark mode is active</p>}
    </div>
  );
}
```

## API Reference

### ThemeProvider

Wraps your app and provides theme context.

```tsx
<ThemeProvider initialTheme="light">
  <App />
</ThemeProvider>
```

**Props:**
- `initialTheme?: 'light' | 'dark' | 'high-contrast'` - Initial theme (defaults to system preference)
- `children: ReactNode` - App content

### useTheme Hook

Access and control the current theme.

```tsx
const { theme, setTheme, toggleTheme, isDark } = useTheme();
```

**Returns:**
- `theme: 'light' | 'dark' | 'high-contrast'` - Current theme
- `setTheme(mode)` - Set theme to specific mode
- `toggleTheme()` - Toggle between light/dark
- `isDark: boolean` - Whether dark mode is active

### ThemeToggle Component

Pre-built button for switching themes.

```tsx
<ThemeToggle variant="dropdown" size="lg" className="custom-class" />
```

**Props:**
- `variant?: 'button' | 'dropdown'` - UI style (default: dropdown)
- `size?: 'sm' | 'default' | 'lg' | 'icon'` - Button size
- `className?: string` - Custom CSS class

## How It Works

### 1. CSS Custom Properties

All colors use CSS variables that are swapped at the document root:

```css
/* In chanuka-design-system.css */
:root[data-theme="light"] {
  --color-primary: 210 40% 50%;
  --color-background: 0 0% 100%;
  --color-foreground: 210 10% 20%;
  /* ... */
}

:root[data-theme="dark"] {
  --color-primary: 210 40% 60%;
  --color-background: 210 10% 8%;
  --color-foreground: 210 10% 90%;
  /* ... */
}
```

### 2. Component Usage

Components reference these variables:

```tsx
<div className="bg-[hsl(var(--color-background))] text-[hsl(var(--color-foreground))]">
  Content automatically adapts to theme
</div>
```

### 3. Persistence

Theme selection is saved to localStorage and restored on page reload.

## Customizing Themes

### Add Custom Color to All Themes

Edit `client/src/shared/design-system/theme/` CSS files:

```css
/* In dark.css */
:root[data-theme="dark"] {
  --color-custom: 250 50% 40%;
}

/* In light.css */
:root[data-theme="light"] {
  --color-custom: 250 50% 70%;
}
```

Use in component:

```tsx
<div className="bg-[hsl(var(--color-custom))]">Custom color</div>
```

### Create Custom Theme

1. Create new theme file: `client/src/shared/design-system/theme/custom.css`
2. Define all CSS variables for your theme
3. Import and update `theme-manager.ts` to include new theme

## Testing Dark Mode

### Manual Testing

1. Click theme toggle button
2. Refresh page (theme persists)
3. Change system preference (if system mode supported)
4. Inspect element to verify `data-theme` attribute

### Automated Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@client/shared/design-system/theme/theme-provider';
import { ThemeToggle } from '@client/components/ui/theme-toggle';

test('theme toggle switches between light and dark', async () => {
  const user = userEvent.setup();
  
  render(
    <ThemeProvider>
      <ThemeToggle variant="button" />
    </ThemeProvider>
  );

  const button = screen.getByRole('button');
  await user.click(button);
  
  // Verify theme changed
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
```

## Troubleshooting

### Theme not persisting

Check that localStorage is accessible:

```tsx
// Verify localStorage is working
localStorage.setItem('test', 'value');
console.log(localStorage.getItem('test'));
```

### Components not responding to theme

Ensure components use token-based colors:

```tsx
// ❌ Wrong - hardcoded color
<div className="bg-blue-600">Content</div>

// ✅ Correct - uses token
<div className="bg-[hsl(var(--color-primary))]">Content</div>
```

### useTheme returns undefined

Make sure component is wrapped in ThemeProvider:

```tsx
// ❌ Wrong - ThemeProvider not in parent chain
<MyComponent /> 

// ✅ Correct - wrapped by ThemeProvider
<ThemeProvider>
  <MyComponent />
</ThemeProvider>
```

## Performance

- Theme switching is instant (no re-renders)
- CSS variables are performant (native browser support)
- localStorage is async-safe (uses synchronous API)
- No layout shift on page load (theme initialized before render)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 12.2+)
- IE: ❌ Not supported (use CSS fallbacks if needed)

## Accessibility

- ✅ Respects `prefers-color-scheme` system setting
- ✅ High contrast mode support
- ✅ Keyboard accessible theme switcher
- ✅ ARIA labels on toggle button
- ✅ No layout shift when switching themes
