# Storybook Configuration

This directory contains the Storybook configuration for the Chanuka Design System.

## Getting Started

To run Storybook locally:

```bash
cd client
pnpm storybook
```

This will start Storybook on `http://localhost:6006`

## Building Storybook

To build a static version of Storybook:

```bash
cd client
pnpm build-storybook
```

## Configuration Files

- `main.ts` - Main Storybook configuration including addons and framework settings
- `preview.ts` - Global decorators, parameters, and preview configuration

## Features

- **Dark Mode Support**: Toggle between light and dark themes using the toolbar
- **Accessibility Testing**: Built-in a11y addon for accessibility checks
- **Responsive Viewports**: Test components across different screen sizes
- **Interactive Controls**: Modify component props in real-time
- **Documentation**: Auto-generated documentation from TypeScript types

## Writing Stories

Stories should be placed next to their components with the `.stories.tsx` extension.

Example:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Category/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // component props
  },
};
```

## Addons

- **@storybook/addon-links** - Link stories together
- **@storybook/addon-essentials** - Essential addons bundle
- **@storybook/addon-interactions** - Test user interactions
- **@storybook/addon-viewport** - Responsive viewport testing
- **@storybook/addon-a11y** - Accessibility testing
- **@storybook/addon-toolbars** - Custom toolbar items
- **storybook-dark-mode** - Dark mode toggle

## Design Tokens

The Storybook preview automatically loads the design system CSS files:
- `light.css` - Light theme tokens
- `dark.css` - Dark theme tokens
- `high-contrast.css` - High contrast theme tokens
- `globals.css` - Global styles

## Path Aliases

The `@client` alias is configured to resolve to `../src`, allowing you to import components using absolute paths:

```typescript
import { Button } from '@client/lib/design-system/interactive/Button';
```
