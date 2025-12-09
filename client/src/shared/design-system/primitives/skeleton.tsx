/**
 * Skeleton Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Animated loading placeholder
 * ✅ Proper contrast ratios
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse',
        'rounded-[0.375rem]',
        'bg-[hsl(var(--color-muted))]',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }