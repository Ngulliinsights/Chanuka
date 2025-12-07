import type { Meta, StoryObj } from '@storybook/react'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

/**
 * Avatar Component
 * 
 * Profile image component with fallback support.
 * Supports multiple size variants.
 * 
 * ✅ Full dark mode support
 * ✅ 4 size variants (sm, md, lg, xl)
 * ✅ Automatic initials fallback
 */
const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An avatar component for displaying profile images with fallback support. Compose with AvatarImage and AvatarFallback.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      description: 'CSS class names for size control'
    }
  }
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default avatar
 */
export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * Small avatar
 */
export const Small: Story = {
  render: () => (
    <Avatar className="h-8 w-8">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * Medium avatar (default)
 */
export const Medium: Story = {
  render: () => (
    <Avatar className="h-10 w-10">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * Large avatar
 */
export const Large: Story = {
  render: () => (
    <Avatar className="h-12 w-12">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * Extra large avatar
 */
export const ExtraLarge: Story = {
  render: () => (
    <Avatar className="h-16 w-16">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * Avatar with fallback (broken image)
 */
export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://invalid-url-that-will-fail.com/image.png" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="text-xs">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="text-xs">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="text-xs">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-12 w-12">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="text-xs">lg</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-16 w-16">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="text-xs">xl</span>
      </div>
    </div>
  )
}

/**
 * Avatar in a list context
 */
export const InList: Story = {
  render: () => (
    <div className="space-y-3">
      {['Alice', 'Bob', 'Charlie'].map((name, i) => (
        <div key={i} className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://github.com/shadcn.png`} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      ))}
    </div>
  )
}
