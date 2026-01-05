/**
 * Label Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Accessible form labels
 * ✅ Supports required indicator
 * ✅ Proper typography hierarchy
 */

import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/shared/design-system/utils/cn"

const labelVariants = cva(
  [
    'text-sm font-medium leading-none',
    'text-[hsl(var(--color-foreground))]',
    'transition-colors duration-150',
    'peer-disabled:cursor-not-allowed',
    'peer-disabled:opacity-50',
  ].join(' ')
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-1 text-[hsl(var(--color-destructive))]" aria-label="required">*</span>
    )}
  </LabelPrimitive.Root>
))
Label.displayName = 'Label'

export { Label, labelVariants }
