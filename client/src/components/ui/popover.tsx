import * as PopoverPrimitive from "@radix-ui/react-popover"
import { AlertCircle } from "lucide-react"
import * as React from "react"

import { cn } from '@client/lib/utils'
import { logger } from '@client/utils/logger';

import { UIComponentError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

// Enhanced popover with error handling
interface EnhancedPopoverProps {
  children: React.ReactNode;
  onError?: (error: UIComponentError) => void;
  fallbackContent?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EnhancedPopover: React.FC<EnhancedPopoverProps & React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>> = ({ children, onError, fallbackContent, open, onOpenChange, ...props }) => {
  const [error, setError] = React.useState<UIComponentError | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleError = React.useCallback(async (componentError: UIComponentError) => {
    setError(componentError);
    onError?.(componentError);

    try {
      const recoveryResult = await attemptUIRecovery('enhanced-popover', componentError, retryCount);
      
      if (recoveryResult.success) {
        setRetryCount(0);
        setError(null);
      } else if (recoveryResult.shouldRetry) {
        setRetryCount(prev => prev + 1);
      } else {
        const suggestions = getUIRecoverySuggestions(componentError);
        logger.warn('Popover recovery failed', { suggestions });
      }
    } catch (recoveryError) {
      logger.error('Popover recovery error', undefined, recoveryError);
    }
  }, [onError, retryCount]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    try {
      onOpenChange?.(newOpen);
    } catch (changeError) {
      const componentError = new UIComponentError(
        'enhanced-popover',
        'open-change',
        changeError instanceof Error ? changeError.message : 'Open state change failed'
      );
      handleError(componentError);
    }
  }, [onOpenChange, handleError]);

  const ErrorBoundary = React.useCallback(({ children }: { children: React.ReactNode }) => {
    try {
      return <>{children}</>;
    } catch (boundaryError) {
      const componentError = new UIComponentError(
        'enhanced-popover',
        'render',
        boundaryError instanceof Error ? boundaryError.message : 'Render error'
      );
      handleError(componentError);
      
      return (
        <div className="p-3 text-sm text-destructive flex items-center gap-2 border border-destructive/20 rounded-md bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <span>Content unavailable</span>
        </div>
      );
    }
  }, [handleError]);

  if (error && fallbackContent) {
    return <>{fallbackContent}</>;
  }

  return (
    <PopoverPrimitive.Root 
      open={open} 
      onOpenChange={handleOpenChange}
      {...props}
    >
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </PopoverPrimitive.Root>
  );
};
EnhancedPopover.displayName = "EnhancedPopover";

// Enhanced popover content with error handling
const EnhancedPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    onError?: (error: UIComponentError) => void;
  }
>(({ className, align = "center", sideOffset = 4, onError, children, ...props }, ref) => {
  const [retryCount, setRetryCount] = React.useState(0);

  const handleError = React.useCallback(async (componentError: UIComponentError) => {
    onError?.(componentError);

    try {
      const recoveryResult = await attemptUIRecovery('enhanced-popover-content', componentError, retryCount);
      
      if (recoveryResult.success) {
        setRetryCount(0);
      } else if (recoveryResult.shouldRetry) {
        setRetryCount(prev => prev + 1);
      }
    } catch (recoveryError) {
      logger.error('Popover content recovery error', undefined, recoveryError);
    }
  }, [onError, retryCount]);

  const ErrorBoundary = React.useCallback(({ children }: { children: React.ReactNode }) => {
    try {
      return <>{children}</>;
    } catch (boundaryError) {
      const componentError = new UIComponentError(
        'enhanced-popover-content',
        'render',
        boundaryError instanceof Error ? boundaryError.message : 'Content render error'
      );
      handleError(componentError);
      
      return (
        <div className="p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Content error</span>
        </div>
      );
    }
  }, [handleError]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});
EnhancedPopoverContent.displayName = "EnhancedPopoverContent";

export { 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  EnhancedPopover,
  EnhancedPopoverContent
}

