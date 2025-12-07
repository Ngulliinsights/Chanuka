"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlertCircle, Loader2 } from "lucide-react"
import * as React from "react"

import { cn } from '@client/lib/utils'
import { logger } from '@client/utils/logger';

import { UIDialogError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';
import { DialogValidationProps } from './types';
import { DialogPropsSchema } from './validation';

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      [
        'fixed inset-0 z-50',
        'bg-black/80',
        'backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      ].join(' '),
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        [
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg',
          'translate-x-[-50%] translate-y-[-50%] gap-4',
          'bg-[hsl(var(--color-card))]',
          'border border-[hsl(var(--color-border))]',
          'rounded-lg p-6',
          'shadow-lg',
          'duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          'sm:rounded-lg',
        ].join(' '),
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className={cn(
        [
          'absolute right-4 top-4',
          'rounded-sm opacity-70',
          'ring-offset-[hsl(var(--color-background))]',
          'transition-opacity hover:opacity-100',
          'focus:outline-none focus:ring-2',
          'focus:ring-[hsl(var(--color-primary))] focus:ring-offset-2',
          'disabled:pointer-events-none',
          'data-[state=open]:bg-[hsl(var(--color-accent))]',
          'data-[state=open]:text-[hsl(var(--color-muted-foreground))]',
        ].join(' ')
      )}>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      [
        'text-lg font-semibold leading-none tracking-tight',
        'text-[hsl(var(--color-foreground))]',
      ].join(' '),
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      [
        'text-sm',
        'text-[hsl(var(--color-muted-foreground))]',
      ].join(' '),
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Enhanced dialog with validation and error handling
interface EnhancedDialogProps extends DialogValidationProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

const EnhancedDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  EnhancedDialogProps
>(({ 
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  error,
  open,
  onOpenChange,
  children,
  className,
  ...props 
}, ref) => {
  const [internalError, setInternalError] = React.useState<string | undefined>(error);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const currentError = error || internalError;
  const currentLoading = loading || isProcessing;

  const handleValidationError = React.useCallback(async (dialogError: UIDialogError) => {
    try {
      const recoveryResult = await attemptUIRecovery('enhanced-dialog', dialogError, retryCount);
      
      if (recoveryResult.success) {
        setRetryCount(0);
        setInternalError(undefined);
      } else if (recoveryResult.shouldRetry) {
        setRetryCount(prev => prev + 1);
      } else {
        const suggestions = getUIRecoverySuggestions(dialogError);
        logger.warn('Dialog recovery failed, suggestions:', { component: 'enhanced-dialog' }, { suggestions });
      }
    } catch (recoveryError) {
      logger.error('Dialog recovery error:', { component: 'enhanced-dialog' }, recoveryError);
    }
  }, [retryCount]);

  const validateProps = React.useCallback(() => {
    try {
      return DialogPropsSchema.parse({
        title,
        description,
        confirmText,
        cancelText,
        loading: currentLoading,
        error: currentError
      });
    } catch (validationError) {
      const dialogError = new UIDialogError('enhanced-dialog', 'validation', 'Invalid dialog props');
      handleValidationError(dialogError);
      return null;
    }
  }, [title, description, confirmText, cancelText, currentLoading, currentError, handleValidationError]);

  const handleConfirm = React.useCallback(async () => {
    if (currentLoading || !onConfirm) return;

    const validatedProps = validateProps();
    if (!validatedProps) return;

    try {
      setIsProcessing(true);
      setInternalError(undefined);
      
      await onConfirm();
      
      // Close dialog on successful confirmation
      onOpenChange?.(false);
    } catch (confirmError) {
      logger.error('Dialog confirm error:', { component: 'enhanced-dialog' }, confirmError);
      const errorMessage = confirmError instanceof Error ? confirmError.message : 'Confirmation failed';
      setInternalError(errorMessage);
      
      const dialogError = new UIDialogError('enhanced-dialog', 'confirm', errorMessage);
      await handleValidationError(dialogError);
    } finally {
      setIsProcessing(false);
    }
  }, [currentLoading, onConfirm, validateProps, onOpenChange, handleValidationError]);

  const handleCancel = React.useCallback(() => {
    if (currentLoading) return;

    try {
      onCancel?.();
      onOpenChange?.(false);
    } catch (cancelError) {
      logger.error('Dialog cancel error:', { component: 'enhanced-dialog' }, cancelError);
      const errorMessage = cancelError instanceof Error ? cancelError.message : 'Cancel failed';
      const dialogError = new UIDialogError('enhanced-dialog', 'cancel', errorMessage);
      handleValidationError(dialogError);
    }
  }, [currentLoading, onCancel, onOpenChange, handleValidationError]);

  // Validate props on mount and when they change
  React.useEffect(() => {
    validateProps();
  }, [validateProps]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} className={cn("sm:max-w-md", className)} {...props}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentError && <AlertCircle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {currentError && (
          <div 
            className={cn(
              'rounded-md p-3 border',
              'bg-[hsl(var(--color-destructive))]/15',
              'border-[hsl(var(--color-destructive))]/20'
            )}
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--color-destructive))]" />
              <p className="text-sm text-[hsl(var(--color-destructive))] font-medium">
                {currentError}
              </p>
            </div>
          </div>
        )}

        {children}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <DialogClose asChild>
            <button
              type="button"
              onClick={handleCancel}
              disabled={currentLoading}
              className={cn(
                [
                  'inline-flex items-center justify-center gap-2',
                  'whitespace-nowrap rounded-md text-sm font-medium',
                  'border border-[hsl(var(--color-border))]',
                  'bg-[hsl(var(--color-background))]',
                  'text-[hsl(var(--color-foreground))]',
                  'hover:bg-[hsl(var(--color-accent))]',
                  'hover:text-[hsl(var(--color-accent-foreground))]',
                  'transition-colors duration-150',
                  'ring-offset-[hsl(var(--color-background))]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-50',
                  'h-10 px-4 py-2',
                ].join(' ')
              )}
            >
              {cancelText}
            </button>
          </DialogClose>
          
          {onConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={currentLoading}
              className={cn(
                [
                  'inline-flex items-center justify-center gap-2',
                  'whitespace-nowrap rounded-md text-sm font-medium',
                  'bg-[hsl(var(--color-primary))]',
                  'text-[hsl(var(--color-primary-foreground))]',
                  'hover:bg-[hsl(var(--color-primary))] hover:opacity-90',
                  'transition-all duration-150',
                  'ring-offset-[hsl(var(--color-background))]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-50',
                  'h-10 px-4 py-2',
                ].join(' ')
              )}
            >
              {currentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmText}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
EnhancedDialog.displayName = "EnhancedDialog";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  EnhancedDialog,
}

