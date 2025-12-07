import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

/**
 * Tabs Component
 * 
 * Navigation component for organizing content into separate tabs.
 * Built with Radix UI primitives for accessibility.
 * 
 * ✅ Full dark mode support
 * ✅ Keyboard navigation (Arrow keys)
 * ✅ ARIA attributes for accessibility
 * ✅ Smooth transitions
 */
const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A tabs component for organizing content into separate sections. Supports keyboard navigation and full accessibility features. Use Tabs with TabsList, TabsTrigger, and TabsContent.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Basic tabs example
 */
export const Basic: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-96">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Content for Tab 1
        </p>
      </TabsContent>
      <TabsContent value="tab2">
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Content for Tab 2
        </p>
      </TabsContent>
      <TabsContent value="tab3">
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Content for Tab 3
        </p>
      </TabsContent>
    </Tabs>
  )
}

/**
 * Tabs with detailed content
 */
export const WithContent: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <h3 className="font-medium">Overview Tab</h3>
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          This is the overview content. You can put any content here including
          text, images, forms, and other components.
        </p>
      </TabsContent>
      <TabsContent value="details" className="space-y-4">
        <h3 className="font-medium">Details Tab</h3>
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Detailed information about the component goes here.
        </p>
      </TabsContent>
      <TabsContent value="settings" className="space-y-4">
        <h3 className="font-medium">Settings Tab</h3>
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Configuration and settings options are displayed here.
        </p>
      </TabsContent>
    </Tabs>
  )
}

/**
 * Tabs with disabled triggers
 */
export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-96">
      <TabsList>
        <TabsTrigger value="tab1">Active</TabsTrigger>
        <TabsTrigger value="tab2" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="tab3">Active</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for Tab 1</TabsContent>
      <TabsContent value="tab3">Content for Tab 3</TabsContent>
    </Tabs>
  )
}

/**
 * Tabs with many triggers
 */
export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-full">
      <TabsList className="flex-wrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <TabsTrigger key={i} value={`tab${i + 1}`}>
            Tab {i + 1}
          </TabsTrigger>
        ))}
      </TabsList>
      {Array.from({ length: 8 }).map((_, i) => (
        <TabsContent key={i} value={`tab${i + 1}`}>
          <p>Content for Tab {i + 1}</p>
        </TabsContent>
      ))}
    </Tabs>
  )
}
