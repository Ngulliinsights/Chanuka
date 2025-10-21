import { forwardRef, ButtonHTMLAttributes, useState, useCallback } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { logger } from '@/shared/core/src/observability/logging';
import { EnhancedButtonProps, ButtonState } from './types';
import { ButtonStateSchema, ButtonVariantSchema, ButtonSizeSchema } from './validation';
import { UIComponentError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant = "default", 
    size = "default", 
    asChild = false,
    state,
    loadingText = "Loading...",
    errorText = "Error occurred",
    successText = "Success!",
    onClick,
    children,
    disabled,
    ...props 
  }, ref) => {
    const [internalState, setInternalState] = useState<ButtonState>({});
    const [retryCount, setRetryCount] = useState(0);

    const currentState = state || internalState;
    const isLoading = currentState.loading;
    const hasError = currentState.error;
    const hasSuccess = currentState.success;
    const isDisabled = disabled || isLoading;

    const handleValidationError = useCallback(async (error: UIComponentError) => {
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-button', error, retryCount);
        
        if (recoveryResult.success) {
          setRetryCount(0);
          setInternalState({ error: false });
        } else if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        } else {
          const suggestions = getUIRecoverySuggestions(error);
          logger.warn('Button recovery failed, suggestions:', suggestions);
        }
      } catch (recoveryError) {
        logger.error('Button recovery error:', recoveryError);
      }
    }, [retryCount]);

    const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      try {
        // Validate button state
        if (state) {
          const validationResult = ButtonStateSchema.safeParse(state);
          if (!validationResult.success) {
            const error = new UIComponentError('enhanced-button', 'click', 'Invalid button state');
            await handleValidationError(error);
            return;
          }
        }

        // Validate variant and size
        const variantResult = ButtonVariantSchema.safeParse(variant);
        const sizeResult = ButtonSizeSchema.safeParse(size);
        
        if (!variantResult.success || !sizeResult.success) {
          const error = new UIComponentError('enhanced-button', 'click', 'Invalid button configuration');
          await handleValidationError(error);
          return;
        }

        // Set loading state if not externally controlled
        if (!state) {
          setInternalState({ loading: true });
        }

        await onClick?.(event);

        // Set success state if not externally controlled
        if (!state) {
          setInternalState({ success: true });
          setTimeout(() => setInternalState({}), 2000);
        }

      } catch (error) {
        logger.error('Button click error:', error);
        
        if (!state) {
          setInternalState({ error: true });
          setTimeout(() => setInternalState({}), 3000);
        }

        const componentError = new UIComponentError('enhanced-button', 'click', error instanceof Error ? error.message : 'Unknown error');
        await handleValidationError(componentError);
      }
    }, [isDisabled, state, variant, size, onClick, handleValidationError]);

    const getButtonContent = () => {
      if (isLoading) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </>
        );
      }
      
      if (hasError) {
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            {errorText}
          </>
        );
      }
      
      if (hasSuccess) {
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            {successText}
          </>
        );
      }
      
      return children;
    };

    const getButtonVariant = () => {
      if (hasError) return "destructive";
      if (hasSuccess) return "default";
      return variant;
    };

    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          buttonVariants({ 
            variant: getButtonVariant(), 
            size, 
            className 
          }),
          isLoading && "cursor-not-allowed",
          hasError && "animate-pulse",
          hasSuccess && "animate-pulse"
        )}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        aria-busy={isLoading}
        aria-describedby={hasError ? `${props.id}-error` : undefined}
        {...props}
      >
        {getButtonContent()}
        
        {hasError && props.id && (
          <span 
            id={`${props.id}-error`} 
            className="sr-only"
            role="alert"
          >
            {errorText}
          </span>
        )}
      </Comp>
    );
  }
);
EnhancedButton.displayName = "EnhancedButton";

export { Button, buttonVariants, EnhancedButton }
