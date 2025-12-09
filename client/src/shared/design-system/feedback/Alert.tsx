/**
 * Alert Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Multiple variants (default, destructive, success, warning)
 * ✅ Proper icon spacing and accessibility
 */

import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "../utils/cn"

const alertVariants = cva(
  [
    'relative w-full',
    'rounded-lg border p-4',
    '[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]',
    '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[hsl(var(--color-background))]',
          'text-[hsl(var(--color-foreground))]',
          'border-[hsl(var(--color-border))]',
          '[&>svg]:text-[hsl(var(--color-foreground))]',
        ].join(' '),

        destructive: [
          'border-[hsl(var(--color-destructive))]/50',
          'text-[hsl(var(--color-destructive))]',
          'bg-[hsl(var(--color-destructive))]/5',
          '[&>svg]:text-[hsl(var(--color-destructive))]',
        ].join(' '),

        success: [
          'border-[hsl(var(--color-success))]/50',
          'text-[hsl(var(--color-success))]',
          'bg-[hsl(var(--color-success))]/5',
          '[&>svg]:text-[hsl(var(--color-success))]',
        ].join(' '),

        warning: [
          'border-[hsl(var(--color-warning))]/50',
          'text-[hsl(var(--color-warning))]',
          'bg-[hsl(var(--color-warning))]/5',
          '[&>svg]:text-[hsl(var(--color-warning))]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      'mb-1 font-medium leading-none tracking-tight',
      'text-[hsl(var(--color-foreground))]',
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-sm [&_p]:leading-relaxed',
      'text-[hsl(var(--color-muted-foreground))]',
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription, alertVariants }