import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './switch'
import { useState } from 'react'

/**
 * Switch Component
 * 
 * Toggle switch for boolean state control.
 * Smooth animations and proper accessibility.
 * 
 * ✅ Full dark mode support
 * ✅ Smooth 200ms transitions
 * ✅ Keyboard accessible
 * ✅ ARIA attributes
 */
const meta = {
  title: 'Components/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A switch component for toggling boolean states. Built with Radix UI Switch primitive with smooth animations.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the switch is disabled'
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked'
    }
  }
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Unchecked switch
 */
export const Unchecked: Story = {
  args: {
    checked: false
  }
}

/**
 * Checked switch
 */
export const Checked: Story = {
  args: {
    checked: true
  }
}

/**
 * Disabled switch
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    checked: false
  }
}

/**
 * Disabled checked switch
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true
  }
}

/**
 * Interactive switch
 */
export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)

    return (
      <div className="space-y-4">
        <Switch checked={checked} onCheckedChange={setChecked} />
        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Switch is {checked ? 'ON' : 'OFF'}
        </p>
      </div>
    )
  }
}

/**
 * Switch with label
 */
export const WithLabel: Story = {
  render: () => {
    const [notifications, setNotifications] = useState(true)
    const [darkMode, setDarkMode] = useState(false)

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
          />
          <label htmlFor="notifications" className="text-sm font-medium cursor-pointer">
            Enable Notifications
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
          <label htmlFor="dark-mode" className="text-sm font-medium cursor-pointer">
            Dark Mode
          </label>
        </div>
      </div>
    )
  }
}

/**
 * Multiple switches
 */
export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch id="option1" />
        <label htmlFor="option1" className="text-sm">
          Option 1
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="option2" defaultChecked />
        <label htmlFor="option2" className="text-sm">
          Option 2
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="option3" disabled />
        <label htmlFor="option3" className="text-sm text-[hsl(var(--color-muted-foreground))]">
          Option 3 (Disabled)
        </label>
      </div>
    </div>
  )
}
