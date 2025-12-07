import type { Meta, StoryObj } from '@storybook/react'
import { Label } from './label'

/**
 * Label Component
 * 
 * Form label component for proper accessibility.
 * Works with input, textarea, select, and other form elements.
 * 
 * ✅ Full dark mode support
 * ✅ Required indicator support
 * ✅ Accessible with htmlFor attribute
 */
const meta = {
  title: 'Components/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A label component for form inputs. Use with htmlFor attribute to properly associate labels with form elements. Supports required indicator.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Basic label
 */
export const Basic: Story = {
  args: {
    children: 'Label Text',
    htmlFor: 'input-1'
  }
}

/**
 * Required label
 */
export const Required: Story = {
  render: () => (
    <Label htmlFor="email" className="flex items-center gap-1">
      <span>Email Address</span>
      <span className="text-[hsl(var(--color-destructive))]">*</span>
    </Label>
  )
}

/**
 * Label with helper text
 */
export const WithHelper: Story = {
  render: () => (
    <div className="space-y-1">
      <Label htmlFor="password">Password</Label>
      <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
        Minimum 8 characters, include uppercase and numbers
      </p>
    </div>
  )
}

/**
 * Multiple labels
 */
export const Multiple: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
      </div>
    </div>
  )
}
