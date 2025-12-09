import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './checkbox'
import { useState } from 'react'

/**
 * Checkbox Component
 * 
 * Checkbox input for multiple selection.
 * Full accessibility and smooth transitions.
 * 
 * ✅ Full dark mode support
 * ✅ Smooth 200ms transitions
 * ✅ Keyboard accessible
 * ✅ ARIA attributes
 */
const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A checkbox component for multiple selections. Built with Radix UI Checkbox primitive with smooth transitions and full accessibility.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled'
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked'
    }
  }
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Unchecked checkbox
 */
export const Unchecked: Story = {
  args: {
    checked: false
  }
}

/**
 * Checked checkbox
 */
export const Checked: Story = {
  args: {
    checked: true
  }
}

/**
 * Disabled checkbox
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    checked: false
  }
}

/**
 * Disabled checked checkbox
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true
  }
}

/**
 * Checkbox with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium cursor-pointer"
      >
        I agree to the terms and conditions
      </label>
    </div>
  )
}

/**
 * Checkbox group
 */
export const Group: Story = {
  render: () => {
    const [checked, setChecked] = useState<Record<string, boolean>>({
      option1: false,
      option2: true,
      option3: false
    })

    return (
      <div className="space-y-3">
        {['option1', 'option2', 'option3'].map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <Checkbox
              id={opt}
              checked={checked[opt]}
              onCheckedChange={(c) =>
                setChecked({ ...checked, [opt]: c })
              }
            />
            <label htmlFor={opt} className="text-sm cursor-pointer">
              Option {opt.charAt(opt.length - 1)}
            </label>
          </div>
        ))}
      </div>
    )
  }
}

/**
 * Indeterminate checkbox
 */
export const Indeterminate: Story = {
  render: () => {
    const [parentChecked, setParentChecked] = useState<boolean | 'indeterminate'>('indeterminate')
    const [childChecked, setChildChecked] = useState({ child1: true, child2: false })

    const handleParentChange = () => {
      const newState = parentChecked === true ? false : true
      setParentChecked(newState)
      setChildChecked({
        child1: newState,
        child2: newState
      })
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <Checkbox
            id="parent"
            checked={parentChecked}
            onCheckedChange={handleParentChange}
          />
          <label htmlFor="parent" className="cursor-pointer">
            Select All
          </label>
        </div>
        <div className="space-y-2 pl-6">
          {Object.entries(childChecked).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={value}
                onCheckedChange={(c) =>
                  setChildChecked({ ...childChecked, [key]: c })
                }
              />
              <label htmlFor={key} className="text-sm cursor-pointer">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            </div>
          ))}
        </div>
      </div>
    )
  }
}
