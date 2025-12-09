import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertTitle, AlertDescription } from './alert'
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'

/**
 * Alert Component
 * 
 * Alert component for displaying notifications and messages.
 * Supports 4 semantic variants.
 * 
 * ✅ Full dark mode support
 * ✅ 4 variants (default, destructive, success, warning)
 * ✅ Icon support with lucide-react
 */
const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'An alert component for displaying notifications. Supports multiple variants for different alert types. Compose with AlertTitle and AlertDescription.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'success', 'warning'],
      description: 'Alert variant'
    }
  }
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default alert
 */
export const Default: Story = {
  render: () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is a default alert. Use it for general information.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Destructive alert for errors
 */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Something went wrong. Please try again later.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Success alert
 */
export const Success: Story = {
  render: () => (
    <Alert variant="success">
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your action was completed successfully.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Warning alert
 */
export const Warning: Story = {
  render: () => (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action cannot be undone. Please be careful.
      </AlertDescription>
    </Alert>
  )
}

/**
 * All variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>Default alert message</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Destructive</AlertTitle>
        <AlertDescription>Destructive alert message</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Success alert message</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Warning alert message</AlertDescription>
      </Alert>
    </div>
  )
}

/**
 * Alert without title
 */
export const NoTitle: Story = {
  render: () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        This alert has no title, just a description.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Alert with longer content
 */
export const LongContent: Story = {
  render: () => (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Database Connection Failed</AlertTitle>
      <AlertDescription>
        Unable to establish a connection to the database server. This may be
        due to network issues or the server being offline. Please check your
        connection settings and try again.
      </AlertDescription>
    </Alert>
  )
}
