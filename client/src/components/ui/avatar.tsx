/**
 * Avatar Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Supports multiple sizes (sm, md, lg, xl)
 * ✅ Proper border and background colors
 * ✅ Accessibility support (alt text, ARIA)
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@client/lib/utils"

const avatarVariants = cva(
  [
    'relative flex shrink-0 overflow-hidden',
    'rounded-full',
    'border border-[hsl(var(--color-border))]',
    'bg-[hsl(var(--color-muted))]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      role="img"
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn(
      'aspect-square h-full w-full',
      'object-cover',
      className
    )}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center',
      'bg-[hsl(var(--color-muted))]',
      'text-[hsl(var(--color-muted-foreground))]',
      'text-sm font-medium',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }