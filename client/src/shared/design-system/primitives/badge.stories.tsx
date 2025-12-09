import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

/**
 * Badge Component
 * 
 * Small label component for displaying tags and status indicators.
 * Supports 6 variants and 3 size options.
 * 
 * ✅ Full dark mode support
 * ✅ Multiple size options
 * ✅ Semantic color variants
 */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A badge component for displaying labels, tags, and status indicators. Supports multiple variants and sizes with full dark mode support.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'success', 'warning', 'outline'],
      description: 'Visual variant of the badge'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge'
    }
  }
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default badge variant
 */
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Badge'
  }
}

/**
 * Secondary badge variant
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary'
  }
}

/**
 * Destructive badge for negative status
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Error'
  }
}

/**
 * Success badge for positive status
 */
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success'
  }
}

/**
 * Warning badge for caution status
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning'
  }
}

/**
 * Outline badge variant
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline'
  }
}

/**
 * Small badge size
 */
export const Small: Story = {
  args: {
    variant: 'default',
    size: 'sm',
    children: 'sm'
  }
}

/**
 * Medium badge size
 */
export const Medium: Story = {
  args: {
    variant: 'default',
    size: 'md',
    children: 'md'
  }
}

/**
 * Large badge size
 */
export const Large: Story = {
  args: {
    variant: 'default',
    size: 'lg',
    children: 'lg'
  }
}

/**
 * All variants in one view
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  )
}

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  )
}

/**
 * Status badges example
 */
export const StatusBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Online:</span>
        <Badge variant="success">Active</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Offline:</span>
        <Badge variant="secondary">Inactive</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Error:</span>
        <Badge variant="destructive">Failed</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Warning:</span>
        <Badge variant="warning">Pending</Badge>
      </div>
    </div>
  )
}

/**
 * Badge in context
 */
export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Feature Tags</h3>
        <div className="flex flex-wrap gap-2">
          <Badge>React</Badge>
          <Badge>TypeScript</Badge>
          <Badge>Storybook</Badge>
          <Badge variant="success">Production Ready</Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Component Status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">In Progress</Badge>
          <Badge variant="destructive">Deprecated</Badge>
        </div>
      </div>
    </div>
  )
}
