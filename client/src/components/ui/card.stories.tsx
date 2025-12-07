import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
import { Button } from './button'

/**
 * Card Component
 * 
 * Container component for grouping related content.
 * Supports multiple variants and interactive modes.
 * 
 * ✅ Full dark mode support
 * ✅ Flexible layout with subcomponents
 * ✅ Accessible semantic structure
 */
const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A flexible card component with multiple variants and optional interactive modes. Compose with CardHeader, CardContent, CardFooter, CardTitle, and CardDescription.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'ghost'],
      description: 'Visual variant of the card'
    }
  }
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default card variant
 */
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  )
}

/**
 * Elevated card variant with shadow
 */
export const Elevated: Story = {
  render: () => (
    <Card variant="elevated" className="w-80">
      <CardHeader>
        <CardTitle>Elevated Card</CardTitle>
        <CardDescription>This card has an elevated shadow effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Elevated cards are great for highlighting important content.</p>
      </CardContent>
    </Card>
  )
}

/**
 * Outlined card variant with border
 */
export const Outlined: Story = {
  render: () => (
    <Card variant="outlined" className="w-80">
      <CardHeader>
        <CardTitle>Outlined Card</CardTitle>
        <CardDescription>This card has a border outline</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Outlined cards use a subtle border for definition.</p>
      </CardContent>
    </Card>
  )
}

/**
 * Ghost card variant with minimal styling
 */
export const Ghost: Story = {
  render: () => (
    <Card variant="ghost" className="w-80">
      <CardHeader>
        <CardTitle>Ghost Card</CardTitle>
        <CardDescription>Minimal styling variant</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Ghost cards have no background or border.</p>
      </CardContent>
    </Card>
  )
}

/**
 * Interactive card example
 */
export const Interactive: Story = {
  render: () => (
    <Card className="w-80 cursor-pointer transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle>Clickable Card</CardTitle>
        <CardDescription>Hover over this card</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card responds to hover interactions.</p>
      </CardContent>
    </Card>
  )
}

/**
 * Complex card with multiple sections
 */
export const Complex: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>View and manage your account settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <p className="text-sm text-muted-foreground">John Doe</p>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="text-sm text-muted-foreground">john@example.com</p>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <p className="text-sm text-[hsl(var(--color-success))]">Active</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}

/**
 * All card variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Default</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
      <Card variant="elevated" className="w-full">
        <CardHeader>
          <CardTitle>Elevated</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
      <Card variant="outlined" className="w-full">
        <CardHeader>
          <CardTitle>Outlined</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
      <Card variant="ghost" className="w-full">
        <CardHeader>
          <CardTitle>Ghost</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
    </div>
  )
}
