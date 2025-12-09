/**
 * Unified Component System
 * Consolidates shadcn/ui with Chanuka design system
 */

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { Slot } from "@radix-ui/react-slot"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown, Loader2 } from "lucide-react"
import { forwardRef, ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react"

import { cn } from '@client/lib/utils'

// =============================================================================
// UNIFIED BUTTON COMPONENT
// =============================================================================

const unifiedButtonVariants = cva(
  [
    // Base styles using design tokens
    "inline-flex items-center justify-center gap-2",
    "rounded-[var(--radius-md)] border border-transparent",
    "text-sm font-medium transition-all duration-[var(--duration-normal)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "min-h-[var(--touch-target-min)]", // Touch-friendly
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]",
          "hover:bg-[hsl(var(--color-primary)/0.9)] hover:shadow-[var(--shadow-md)]",
          "active:bg-[hsl(var(--color-primary)/0.95)]"
        ],
        secondary: [
          "bg-[hsl(var(--color-secondary))] text-[hsl(var(--color-secondary-foreground))]",
          "hover:bg-[hsl(var(--color-secondary)/0.9)]"
        ],
        accent: [
          "bg-[hsl(var(--color-accent))] text-[hsl(var(--color-accent-foreground))]",
          "hover:bg-[hsl(var(--color-accent)/0.9)] hover:shadow-[var(--shadow-md)]"
        ],
        success: [
          "bg-[hsl(var(--color-success))] text-white",
          "hover:bg-[hsl(var(--color-success)/0.9)]"
        ],
        warning: [
          "bg-[hsl(var(--color-warning))] text-black",
          "hover:bg-[hsl(var(--color-warning)/0.9)]"
        ],
        error: [
          "bg-[hsl(var(--color-error))] text-white",
          "hover:bg-[hsl(var(--color-error)/0.9)]"
        ],
        outline: [
          "border-[hsl(var(--color-border))] bg-transparent",
          "hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))]"
        ],
        ghost: [
          "hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]"
        ],
        voteYes: [
          "bg-green-600 text-white hover:bg-green-700 hover:shadow-md"
        ],
        voteNo: [
          "bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
        ],
        voteAbstain: [
          "bg-gray-600 text-white hover:bg-gray-700 hover:shadow-md"
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
    VariantProps<typeof unifiedButtonVariants> {
  asChild?: boolean
  loading?: boolean
}

const UnifiedButton = forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(unifiedButtonVariants({ variant, size }), className)}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        {children}
      </Comp>
    )
  }
)
UnifiedButton.displayName = "UnifiedButton"

// =============================================================================
// UNIFIED CARD COMPONENT
// =============================================================================

const UnifiedCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[hsl(var(--color-background))] text-[hsl(var(--color-foreground))]",
        "border border-[hsl(var(--color-border))] rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)]",
        "hover:shadow-[var(--shadow-md)] hover:border-[hsl(var(--color-border)/0.8)]",
        className
      )}
      {...props}
    />
  )
)
UnifiedCard.displayName = "UnifiedCard"

const UnifiedCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        "bg-[hsl(var(--color-muted))] border-b border-[hsl(var(--color-border))]",
        className
      )}
      {...props}
    />
  )
)
UnifiedCardHeader.displayName = "UnifiedCardHeader"

const UnifiedCardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        "text-[hsl(var(--color-foreground))]",
        className
      )}
      {...props}
    />
  )
)
UnifiedCardTitle.displayName = "UnifiedCardTitle"

const UnifiedCardDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-sm text-[hsl(var(--color-muted-foreground))]",
        className
      )}
      {...props}
    />
  )
)
UnifiedCardDescription.displayName = "UnifiedCardDescription"

const UnifiedCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
UnifiedCardContent.displayName = "UnifiedCardContent"

const UnifiedCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0",
        "bg-[hsl(var(--color-muted))] border-t border-[hsl(var(--color-border))]",
        className
      )}
      {...props}
    />
  )
)
UnifiedCardFooter.displayName = "UnifiedCardFooter"

// =============================================================================
// UNIFIED BADGE COMPONENT
// =============================================================================

const unifiedBadgeVariants = cva(
  [
    "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5",
    "text-xs font-medium transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2"
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]",
          "hover:bg-[hsl(var(--color-primary)/0.8)]"
        ],
        secondary: [
          "bg-[hsl(var(--color-muted))] text-[hsl(var(--color-muted-foreground))]",
          "hover:bg-[hsl(var(--color-muted)/0.8)]"
        ],
        success: [
          "bg-[hsl(var(--color-success))] text-white",
          "hover:bg-[hsl(var(--color-success)/0.8)]"
        ],
        warning: [
          "bg-[hsl(var(--color-warning))] text-black",
          "hover:bg-[hsl(var(--color-warning)/0.8)]"
        ],
        error: [
          "bg-[hsl(var(--color-error))] text-white",
          "hover:bg-[hsl(var(--color-error)/0.8)]"
        ],
        outline: [
          "text-[hsl(var(--color-foreground))] border border-[hsl(var(--color-border))]"
        ],
        legislativeIntroduced: [
          "bg-blue-600 text-white hover:bg-blue-700"
        ],
        legislativePassed: [
          "bg-green-600 text-white hover:bg-green-700"
        ],
        legislativeFailed: [
          "bg-red-600 text-white hover:bg-red-700"
        ],
        legislativePending: [
          "bg-yellow-500 text-black hover:bg-yellow-600"
        ],
        legislativeWithdrawn: [
          "bg-gray-500 text-white hover:bg-gray-600"
        ]
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface UnifiedBadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof unifiedBadgeVariants> {}

function UnifiedBadge({ className, variant, error = false, ...props }: UnifiedBadgeProps & { error?: boolean }) {
  const effectiveVariant = error ? "error" : variant
  return (
    <div className={cn(unifiedBadgeVariants({ variant: effectiveVariant }), className)} {...props} />
  )
}

// =============================================================================
// UNIFIED INPUT COMPONENT
// =============================================================================

export interface UnifiedInputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

const UnifiedInput = forwardRef<HTMLInputElement, UnifiedInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border border-[hsl(var(--color-border))] bg-[hsl(var(--color-background))] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--color-muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
UnifiedInput.displayName = "UnifiedInput"

// =============================================================================
// UNIFIED ALERT COMPONENT
// =============================================================================

const unifiedAlertVariants = cva(
  "relative w-full rounded-[var(--radius-lg)] border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[hsl(var(--color-foreground))]",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--color-background))] text-[hsl(var(--color-foreground))] border-[hsl(var(--color-border))]",
        destructive: "border-[hsl(var(--color-error))]/50 text-[hsl(var(--color-error))] dark:border-[hsl(var(--color-error))] [&>svg]:text-[hsl(var(--color-error))]",
        success: "border-[hsl(var(--color-success))]/50 text-[hsl(var(--color-success))] [&>svg]:text-[hsl(var(--color-success))]",
        warning: "border-[hsl(var(--color-warning))]/50 text-[hsl(var(--color-warning))] [&>svg]:text-[hsl(var(--color-warning))]",
        info: "border-[hsl(var(--color-accent))]/50 text-[hsl(var(--color-accent))] [&>svg]:text-[hsl(var(--color-accent))]"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface UnifiedAlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof unifiedAlertVariants> {}

const UnifiedAlert = forwardRef<HTMLDivElement, UnifiedAlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(unifiedAlertVariants({ variant }), className)}
      {...props}
    />
  )
)
UnifiedAlert.displayName = "UnifiedAlert"

const UnifiedAlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight text-[hsl(var(--color-foreground))]", className)}
      {...props}
    />
  )
)
UnifiedAlertTitle.displayName = "UnifiedAlertTitle"

const UnifiedAlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm [&_p]:leading-relaxed text-[hsl(var(--color-muted-foreground))]", className)}
      {...props}
    />
  )
)
UnifiedAlertDescription.displayName = "UnifiedAlertDescription"

// =============================================================================
// UNIFIED TABS COMPONENT
// =============================================================================

const UnifiedTabs = TabsPrimitive.Root

const UnifiedTabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--color-muted))] p-1 text-[hsl(var(--color-muted-foreground))]",
      className
    )}
    {...props}
  />
))
UnifiedTabsList.displayName = TabsPrimitive.List.displayName

const UnifiedTabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[hsl(var(--color-background))] data-[state=active]:text-[hsl(var(--color-foreground))] data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
UnifiedTabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const UnifiedTabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & { error?: boolean; errorMessage?: string }
>(({ className, error = false, errorMessage, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))] focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    {error ? <div className="text-red-500 p-4">{errorMessage || "Error loading tab content"}</div> : children}
  </TabsPrimitive.Content>
))
UnifiedTabsContent.displayName = TabsPrimitive.Content.displayName

// =============================================================================
// UNIFIED ACCORDION COMPONENT
// =============================================================================

const UnifiedAccordion = CollapsiblePrimitive.Root

const UnifiedAccordionTrigger = forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={cn(
      "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
  </CollapsiblePrimitive.Trigger>
))
UnifiedAccordionTrigger.displayName = CollapsiblePrimitive.Trigger.displayName

const UnifiedAccordionContent = forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </CollapsiblePrimitive.Content>
))

UnifiedAccordionContent.displayName = CollapsiblePrimitive.Content.displayName

// =============================================================================
// UNIFIED ACCORDION GROUP COMPONENT
// =============================================================================

interface UnifiedAccordionGroupProps {
  items: Array<{
    id: string
    title: string
    content: React.ReactNode
    defaultOpen?: boolean
  }>
  className?: string
}

const UnifiedAccordionGroup = forwardRef<HTMLDivElement, UnifiedAccordionGroupProps>(
  ({ items, className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {items.map((item) => (
        <UnifiedCard key={item.id}>
          <UnifiedAccordion defaultOpen={item.defaultOpen}>
            <UnifiedAccordionTrigger className="px-6">
              <span className="text-left">{item.title}</span>
            </UnifiedAccordionTrigger>
            <UnifiedAccordionContent className="px-6">
              {item.content}
            </UnifiedAccordionContent>
          </UnifiedAccordion>
        </UnifiedCard>
      ))}
    </div>
  )
)
UnifiedAccordionGroup.displayName = "UnifiedAccordionGroup"

// =============================================================================
// UNIFIED TOOLBAR COMPONENT
// =============================================================================

interface UnifiedToolbarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

const UnifiedToolbar = forwardRef<HTMLDivElement, UnifiedToolbarProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] border border-[hsl(var(--color-border))] bg-[hsl(var(--color-background))] p-2 shadow-[var(--shadow-sm)]",
        orientation === "vertical" && "flex-col",
        className
      )}
      {...props}
    />
  )
)
UnifiedToolbar.displayName = "UnifiedToolbar"

const UnifiedToolbarButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "active"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      variant === "active" && "bg-[hsl(var(--color-accent))] text-[hsl(var(--color-accent-foreground))]",
      className
    )}
    {...props}
  />
))
UnifiedToolbarButton.displayName = "UnifiedToolbarButton"

const UnifiedToolbarSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mx-1 h-6 w-px bg-[hsl(var(--color-border))]",
        className
      )}
      {...props}
    />
  )
)
UnifiedToolbarSeparator.displayName = "UnifiedToolbarSeparator"

export {
  UnifiedButton,
  unifiedButtonVariants,
  UnifiedCard,
  UnifiedCardHeader,
  UnifiedCardTitle,
  UnifiedCardDescription,
  UnifiedCardContent,
  UnifiedCardFooter,
  UnifiedBadge,
  unifiedBadgeVariants,
  UnifiedInput,
  UnifiedAlert,
  unifiedAlertVariants,
  UnifiedAlertTitle,
  UnifiedAlertDescription,
  UnifiedTabs,
  UnifiedTabsList,
  UnifiedTabsTrigger,
  UnifiedTabsContent,
  UnifiedAccordion,
  UnifiedAccordionTrigger,
  UnifiedAccordionContent,
  UnifiedAccordionGroup,
  UnifiedToolbar,
  UnifiedToolbarButton,
  UnifiedToolbarSeparator
}