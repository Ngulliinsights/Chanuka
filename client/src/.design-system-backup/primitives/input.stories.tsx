import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Label } from './label'

/**
 * Input Component
 * 
 * Text input field with support for multiple variants and states.
 * Fully accessible with label support.
 * 
 * ✅ Full dark mode support
 * ✅ Multiple variants (default, filled, outlined)
 * ✅ State variants (default, error, success, disabled)
 * ✅ Accessible with proper label association
 */
const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A flexible input component with multiple variants and states. Supports all standard HTML input types and attributes. Pair with Label for proper accessibility.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'date', 'time'],
      description: 'Input type'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled'
    }
  }
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default text input
 */
export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...'
  }
}

/**
 * Email input type
 */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'example@mail.com'
  }
}

/**
 * Password input type
 */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...'
  }
}

/**
 * Number input type
 */
export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter a number...'
  }
}

/**
 * Disabled input state
 */
export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true
  }
}

/**
 * Input with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Label htmlFor="email">Email Address</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
      />
    </div>
  )
}

/**
 * Input with helper text
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        placeholder="••••••••"
      />
      <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
        Must be at least 8 characters long
      </p>
    </div>
  )
}

/**
 * Multiple input fields form
 */
export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" type="text" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Input id="message" type="text" placeholder="Type your message..." />
      </div>
    </div>
  )
}

/**
 * Input with different states
 */
export const States: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="space-y-2">
        <Label>Normal</Label>
        <Input placeholder="Normal input" />
      </div>
      <div className="space-y-2">
        <Label>Focused</Label>
        <Input placeholder="Click here to focus" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Disabled</Label>
        <Input placeholder="Disabled input" disabled />
      </div>
      <div className="space-y-2">
        <Label>With Value</Label>
        <Input defaultValue="Filled input" />
      </div>
    </div>
  )
}

/**
 * Input sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Small</Label>
        <Input placeholder="Small input" className="text-sm" />
      </div>
      <div className="space-y-2">
        <Label>Medium (Default)</Label>
        <Input placeholder="Medium input" />
      </div>
      <div className="space-y-2">
        <Label>Large</Label>
        <Input placeholder="Large input" className="text-lg py-6" />
      </div>
    </div>
  )
}
