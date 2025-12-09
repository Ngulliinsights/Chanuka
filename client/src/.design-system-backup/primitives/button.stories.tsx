import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

/**
 * Button Component
 * 
 * The primary button component used throughout the design system.
 * Supports multiple variants, sizes, and states.
 * 
 * ✅ Full dark mode support via CSS variables
 * ✅ Accessible with ARIA attributes
 * ✅ Smooth transitions and focus states
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile button component with multiple variants, sizes, and states. Built with CVA for variant management and full TypeScript support.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'accent', 'outline', 'ghost', 'destructive'],
      description: 'Visual variant of the button',
      table: {
        type: { summary: 'string' }
      }
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
      description: 'Size variant of the button'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled'
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (useful for links)'
    }
  }
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Primary button - Most commonly used variant
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
    size: 'md'
  }
}

/**
 * Secondary button for less prominent actions
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Action',
    size: 'md'
  }
}

/**
 * Outline button with border styling
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
    size: 'md'
  }
}

/**
 * Ghost button with minimal styling
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
    size: 'md'
  }
}

/**
 * Destructive button for dangerous actions
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
    size: 'md'
  }
}

/**
 * Accent button for primary actions
 */
export const Accent: Story = {
  args: {
    variant: 'accent',
    children: 'Accent Button',
    size: 'md'
  }
}

/**
 * Small button size
 */
export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small'
  }
}

/**
 * Large button size
 */
export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large Button'
  }
}

/**
 * Icon button (square)
 */
export const Icon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: '✓'
  }
}

/**
 * Disabled state - cannot be interacted with
 */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
    size: 'md'
  }
}

/**
 * All variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  )
}

/**
 * All sizes side by side
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">✓</Button>
    </div>
  )
}

/**
 * Dark mode support demonstration
 */
export const DarkMode: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Primary Variants</h3>
        <div className="flex gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Other Variants</h3>
        <div className="flex gap-2">
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'light' }
  }
}

/**
 * Interactive example with onClick handler
 */
export const Interactive: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Click me!',
    onClick: () => alert('Button clicked!')
  }
}
