"use client"

import { forwardRef, ElementRef, ComponentPropsWithoutRef, useState, useCallback, useEffect } from "react"
import { Root, Group, Value, Trigger, Icon, ScrollUpButton, ScrollDownButton, Portal, Content, Viewport, Label, Item, ItemIndicator, ItemText, Separator } from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { logger } from '../utils/logger.js';
import { EnhancedSelectProps, ValidationState } from './types';
import { validateSelectValue, safeValidateSelectValue } from './validation';
import { UIValidationError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Select = Root

const SelectGroup = Group

const SelectValue = Value

const SelectTrigger = forwardRef<
  ElementRef<typeof Trigger>,
  ComponentPropsWithoutRef<typeof Trigger>
>(({ className, children, ...props }, ref) => (
  <Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Icon>
  </Trigger>
))
SelectTrigger.displayName = Trigger.displayName

const SelectScrollUpButton = forwardRef<
  ElementRef<typeof ScrollUpButton>,
  ComponentPropsWithoutRef<typeof ScrollUpButton>
>(({ className, ...props }, ref) => (
  <ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </ScrollUpButton>
))
SelectScrollUpButton.displayName = ScrollUpButton.displayName

const SelectScrollDownButton = forwardRef<
  ElementRef<typeof ScrollDownButton>,
  ComponentPropsWithoutRef<typeof ScrollDownButton>
>(({ className, ...props }, ref) => (
  <ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </ScrollDownButton>
))
SelectScrollDownButton.displayName = ScrollDownButton.displayName

const SelectContent = forwardRef<
  ElementRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <Portal>
    <Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </Viewport>
      <SelectScrollDownButton />
    </Content>
  </Portal>
))
SelectContent.displayName = Content.displayName

const SelectLabel = forwardRef<
  ElementRef<typeof Label>,
  ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = Label.displayName

const SelectItem = forwardRef<
  ElementRef<typeof Item>,
  ComponentPropsWithoutRef<typeof Item>
>(({ className, children, value, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    value={value || "default"}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ItemIndicator>
        <Check className="h-4 w-4" />
      </ItemIndicator>
    </span>

    <ItemText>{children}</ItemText>
  </Item>
))
SelectItem.displayName = Item.displayName

const SelectSeparator = forwardRef<
  ElementRef<typeof Separator>,
  ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = Separator.displayName

// Enhanced select with validation
const EnhancedSelect = forwardRef<
  ElementRef<typeof Trigger>,
  EnhancedSelectProps
>(({ 
  className,
  label,
  description,
  errorMessage,
  showValidation = true,
  required = false,
  customValidator,
  onValidationChange,
  value,
  onValueChange,
  placeholder = "Select an option...",
  children,
  ...props 
}, ref) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    touched: false
  });
  const [retryCount, setRetryCount] = useState(0);

  const validateValue = useCallback((selectValue: string): ValidationState => {
    if (!showValidation) {
      return { isValid: true, touched: validationState.touched };
    }

    try {
      // Required validation
      if (required && (!selectValue || selectValue.trim() === '')) {
        return {
          isValid: false,
          error: 'Please select an option',
          touched: validationState.touched
        };
      }

      // Custom validation
      if (selectValue && customValidator) {
        const customError = customValidator(selectValue);
        if (customError) {
          return {
            isValid: false,
            error: customError,
            touched: validationState.touched
          };
        }
      }

      // Basic select validation
      if (selectValue) {
        const result = safeValidateSelectValue(selectValue);
        if (!result.success) {
          return {
            isValid: false,
            error: result.error?.message || 'Invalid selection',
            touched: validationState.touched
          };
        }
      }

      return { isValid: true, touched: validationState.touched };
    } catch (error) {
      logger.error('Select validation error:', error);
      return {
        isValid: false,
        error: 'Validation error occurred',
        touched: validationState.touched
      };
    }
  }, [showValidation, required, customValidator, validationState.touched]);

  const handleValidationError = useCallback(async (error: UIValidationError) => {
    try {
      const recoveryResult = await attemptUIRecovery('enhanced-select', error, retryCount);
      
      if (recoveryResult.success) {
        setRetryCount(0);
      } else if (recoveryResult.shouldRetry) {
        setRetryCount(prev => prev + 1);
      } else {
        const suggestions = getUIRecoverySuggestions(error);
        logger.warn('Select recovery failed, suggestions:', suggestions);
      }
    } catch (recoveryError) {
      logger.error('Select recovery error:', recoveryError);
    }
  }, [retryCount]);

  const handleValueChange = useCallback((newValue: string) => {
    const newValidationState = {
      ...validateValue(newValue),
      touched: true
    };
    
    setValidationState(newValidationState);
    onValidationChange?.(newValidationState);

    if (!newValidationState.isValid && newValidationState.error) {
      const error = new UIValidationError(newValidationState.error, 'select', newValue);
      handleValidationError(error);
    }

    onValueChange?.(newValue);
  }, [validateValue, onValidationChange, onValueChange, handleValidationError]);

  // Initial validation on mount if value is provided
  useEffect(() => {
    if (value && showValidation) {
      const initialValidation = validateValue(value);
      setValidationState(initialValidation);
      onValidationChange?.(initialValidation);
    }
  }, [value, showValidation, validateValue, onValidationChange]);

  const hasError = showValidation && validationState.touched && !validationState.isValid;
  const displayError = errorMessage || validationState.error;

  return (
    <div className="space-y-2">
      {label && (
        <label 
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            hasError && "text-destructive",
            required && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}
        >
          {label}
        </label>
      )}
      
      <Root value={value} onValueChange={handleValueChange}>
        <SelectTrigger
          ref={ref}
          className={cn(
            hasError && "border-destructive focus:ring-destructive",
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            description || hasError 
              ? `${props.id}-description ${props.id}-error`.trim()
              : undefined
          }
          {...props}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Root>
      
      {description && (
        <p 
          id={`${props.id}-description`}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      {hasError && displayError && (
        <p 
          id={`${props.id}-error`}
          className="text-sm font-medium text-destructive"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  );
});
EnhancedSelect.displayName = "EnhancedSelect";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  EnhancedSelect,
}