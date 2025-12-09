import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from './progress'
import { useState } from 'react'

/**
 * Progress Component
 * 
 * Progress bar for showing task completion.
 * Animated with smooth transitions.
 * 
 * ✅ Full dark mode support
 * ✅ Smooth animations
 * ✅ ARIA attributes
 * ✅ Token-based colors
 */
const meta = {
  title: 'Components/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A progress bar component for displaying task completion percentage. Built with Radix UI Progress primitive.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'range',
      min: 0,
      max: 100,
      description: 'Progress value 0-100'
    }
  }
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Empty progress bar
 */
export const Empty: Story = {
  args: {
    value: 0
  }
}

/**
 * 50% progress
 */
export const Half: Story = {
  args: {
    value: 50
  }
}

/**
 * Nearly complete
 */
export const Almost: Story = {
  args: {
    value: 90
  }
}

/**
 * Complete progress
 */
export const Complete: Story = {
  args: {
    value: 100
  }
}

/**
 * Various progress levels
 */
export const Levels: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="space-y-2">
        <label className="text-sm font-medium">0%</label>
        <Progress value={0} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">25%</label>
        <Progress value={25} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">50%</label>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">75%</label>
        <Progress value={75} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">100%</label>
        <Progress value={100} />
      </div>
    </div>
  )
}

/**
 * Animated progress bar
 */
export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0)

    return (
      <div className="space-y-4 w-80">
        <Progress value={progress} />
        <button
          onClick={() => setProgress(Math.min(progress + 10, 100))}
          className="px-4 py-2 bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] rounded-md"
        >
          Progress: {progress}%
        </button>
      </div>
    )
  }
}

/**
 * With label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <div className="flex justify-between text-sm">
        <label className="font-medium">Download Progress</label>
        <span className="text-[hsl(var(--color-muted-foreground))]">65%</span>
      </div>
      <Progress value={65} />
    </div>
  )
}
