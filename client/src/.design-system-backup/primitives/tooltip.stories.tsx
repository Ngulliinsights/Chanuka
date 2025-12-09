import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
import { Button } from './button'

/**
 * Tooltip Component
 * 
 * Tooltip for displaying contextual help and information.
 * Position-aware with smooth animations.
 * 
 * ✅ Full dark mode support
 * ✅ Smart positioning
 * ✅ Smooth animations
 * ✅ Accessibility support
 */
const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A tooltip component for displaying contextual information. Compose with TooltipProvider, Tooltip, TooltipTrigger, and TooltipContent.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Basic tooltip
 */
export const Basic: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is a tooltip</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Tooltip on top (default)
 */
export const Top: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex justify-center py-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Top</Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Tooltip on top</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Tooltip on right
 */
export const Right: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex justify-center items-center py-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Right</Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Tooltip on bottom
 */
export const Bottom: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex justify-center py-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Bottom</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Tooltip on bottom</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Tooltip on left
 */
export const Left: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex justify-center items-center py-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Left</Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Multiple tooltips
 */
export const Multiple: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Save</Button>
          </TooltipTrigger>
          <TooltipContent>Save your changes</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Delete</Button>
          </TooltipTrigger>
          <TooltipContent>Delete this item</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Settings</Button>
          </TooltipTrigger>
          <TooltipContent>Open settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Tooltip with long content
 */
export const LongContent: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Help</Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold">Help Information</p>
            <p className="text-xs mt-1">
              This is a longer tooltip with more detailed information about
              the component or feature.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
