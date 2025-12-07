/**
 * Switch Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Animated toggle with proper states
 * ✅ Accessible keyboard navigation
 */

import * as SwitchPrimitives from "@radix-ui/react-switch"
import * as React from "react"

import { cn } from "@client/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      [
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center',
        'rounded-full border-2 border-transparent',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[hsl(var(--color-background))]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[hsl(var(--color-primary))]',
        'data-[state=unchecked]:bg-[hsl(var(--color-input))]',
      ].join(' '),
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        [
          'pointer-events-none block h-5 w-5 rounded-full',
          'bg-[hsl(var(--color-background))]',
          'shadow-lg ring-0',
          'transition-transform duration-200',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        ].join(' ')
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }