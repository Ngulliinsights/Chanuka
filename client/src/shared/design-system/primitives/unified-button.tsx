/**
 * Unified Button Component
 * Combines shadcn/ui with Chanuka design system
 */

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, ButtonHTMLAttributes } from "react"

import { cn } from '@client/lib/utils'

const buttonVariants = cva(
  // Base styles using design tokens
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-[var(--radius-md)] border border-transparent",
    "text-sm font-medium transition-all duration-[var(--duration-normal)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "min-h-[var(--touch-target-min)]", // Touch-friendly
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
          "hover:bg-[hsl(var(--primary)/0.9)] hover:shadow-[var(--shadow-md)]",
          "active:bg-[hsl(var(--primary)/0.95)]"
        ],
        secondary: [
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
          "hover:bg-[hsl(var(--secondary)/0.9)]"
        ],
        accent: [
          "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
          "hover:bg-[hsl(var(--accent)/0.9)] hover:shadow-[var(--shadow-md)]"
        ],
        outline: [
          "border-[hsl(var(--border))] bg-transparent",
          "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
        ],
        ghost: [
          "hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        ],
        destructive: [
          "bg-[hsl(var(--color-error))] text-white",
          "hover:bg-[hsl(var(--color-error)/0.9)]"
        ]
      },
      size: {
        sm: "h-9 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base min-h-[var(--touch-target-recommended)]",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
)

export interface UnifiedButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const UnifiedButton = forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
UnifiedButton.displayName = "UnifiedButton"

export { UnifiedButton, buttonVariants }