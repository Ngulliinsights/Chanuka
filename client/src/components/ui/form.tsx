"use client"

import React, { forwardRef, createContext, useContext, useId, ElementRef, ComponentPropsWithoutRef, HTMLAttributes, useState, useCallback, useEffect } from "react"
import { Root } from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form"
import { z } from "zod"

import { cn } from '../../lib/utils'
import { Label } from './label'
import { logger } from '../../utils/logger';
import { FormValidationConfig } from './types';
import { validateFormData, safeValidateFormData, FormValidationConfigSchema } from './validation';
import { UIFormError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = forwardRef<
  ElementRef<typeof Root>,
  ComponentPropsWithoutRef<typeof Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = forwardRef<
  ElementRef<typeof Slot>,
  ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

// Enhanced form with Zod validation
interface EnhancedFormProps {
  schema?: z.ZodSchema;
  config?: FormValidationConfig;
  onValidationError?: (errors: Record<string, string>) => void;
  onSubmit?: (data: any) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  title?: string;
  submitButton?: React.ReactNode;
}

const EnhancedForm = forwardRef<HTMLFormElement, EnhancedFormProps>(
  ({
    schema,
    config = {},
    onValidationError,
    onSubmit,
    children,
    className,
    title,
    submitButton,
    ...props
  }, ref) => {
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const validatedConfig = useCallback(() => {
      try {
        return FormValidationConfigSchema.parse(config);
      } catch (error) {
        logger.warn('Invalid form config, using defaults:', error);
        return {
          validateOnSubmit: true,
          validateOnChange: false,
          validateOnBlur: true,
          showErrorSummary: true,
          scrollToFirstError: true
        };
      }
    }, [config]);

    const handleValidationError = useCallback(async (error: UIFormError) => {
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-form', error, retryCount);
        
        if (recoveryResult.success) {
          setRetryCount(0);
          setValidationErrors({});
        } else if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        } else {
          const suggestions = getUIRecoverySuggestions(error);
          logger.warn('Form recovery failed, suggestions:', suggestions);
        }
      } catch (recoveryError) {
        logger.error('Form recovery error:', recoveryError);
      }
    }, [retryCount]);

    const validateFormWithSchema = useCallback((formData: FormData | Record<string, any>) => {
      if (!schema) return { success: true, data: formData };

      const dataObject = formData instanceof FormData 
        ? Object.fromEntries(formData.entries())
        : formData;

      return safeValidateFormData(dataObject, schema);
    }, [schema]);

    const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      
      const formConfig = validatedConfig();
      if (!formConfig.validateOnSubmit) {
        onSubmit?.(new FormData(event.currentTarget));
        return;
      }

      setIsSubmitting(true);
      
      try {
        const formData = new FormData(event.currentTarget);
        const validation = validateFormWithSchema(formData);
        
        if (!validation.success && validation.error) {
          const errors = validation.error.details?.errors || { general: validation.error.message };
          setValidationErrors(errors);
          onValidationError?.(errors);
          
          if (formConfig.scrollToFirstError) {
            const firstErrorField = Object.keys(errors)[0];
            const element = event.currentTarget.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
            if (element) {
              element.focus();
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Announce focus change to screen readers
              const liveRegion = document.getElementById(`${formId}-live-region`);
              if (liveRegion) {
                liveRegion.textContent = `Error in ${firstErrorField} field. Please correct this field.`;
              }
            }
          }
          
          await handleValidationError(validation.error);
          return;
        }
        
        setValidationErrors({});
        await onSubmit?.(validation.data || formData);
        
      } catch (error) {
        logger.error('Form submission error:', error);
        const formError = new UIFormError('enhanced-form', { general: 'Form submission failed' });
        await handleValidationError(formError);
      } finally {
        setIsSubmitting(false);
      }
    }, [validatedConfig, validateFormWithSchema, onValidationError, onSubmit, handleValidationError]);

    const formConfig = validatedConfig();
    const hasErrors = Object.keys(validationErrors).length > 0;
    const formId = useId();
    const formTitleId = `${formId}-title`;

    // Update live region when status changes
    useEffect(() => {
      const liveRegion = document.getElementById(`${formId}-live-region`);
      if (liveRegion) {
        let announcement = '';
        if (hasErrors) {
          announcement += "Form contains errors that need to be corrected. ";
        }
        if (isSubmitting) {
          announcement += "Form is being submitted.";
        }
        liveRegion.textContent = announcement;
      }
    }, [hasErrors, isSubmitting, formId]);

    return (
      <>
        {title && (
          <h2 id={formTitleId} className="sr-only">
            {title}
          </h2>
        )}
        <form
          ref={ref}
          className={cn("space-y-6", className)}
          onSubmit={handleSubmit}
          noValidate
          role="form"
          aria-labelledby={title ? formTitleId : undefined}
          aria-describedby={isSubmitting ? `${formId}-status` : undefined}
          {...props}
        >
        {formConfig.showErrorSummary && hasErrors && (
          <div
            className="rounded-md bg-destructive/15 p-4 border border-destructive/20"
            role="alert"
            aria-labelledby="form-error-summary"
            aria-live="assertive"
            aria-atomic="true"
          >
            <h2 id="form-error-summary" className="text-sm font-medium text-destructive mb-2">
              Please correct the following errors:
            </h2>
            <ul className="text-sm text-destructive space-y-1" role="list">
              {Object.entries(validationErrors).map(([field, message]) => (
                <li key={field} role="listitem">
                  <button
                    type="button"
                    className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                    onClick={() => {
                      const element = document.querySelector(`[name="${field}"]`) as HTMLElement;
                      element?.focus();
                    }}
                    aria-label={`Focus on ${field} field`}
                  >
                    {field === 'general' ? message : `${field}: ${message}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {children}

        {submitButton && (
          <div className="flex justify-end">
            {React.cloneElement(submitButton as React.ReactElement, {
              disabled: isSubmitting,
              'aria-describedby': isSubmitting ? `${formId}-status` : undefined,
              'aria-label': isSubmitting ? 'Submitting form, please wait' : undefined,
            })}
          </div>
        )}

        {isSubmitting && (
          <div
            className="flex items-center justify-center py-4"
            aria-live="polite"
            aria-atomic="true"
            id={`${formId}-status`}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" aria-hidden="true"></div>
            <span className="ml-2 text-sm text-muted-foreground">Submitting...</span>
          </div>
        )}

        {/* Live region for dynamic content updates */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id={`${formId}-live-region`}
        />
      </form>
    </>
    );
  }
);
EnhancedForm.displayName = "EnhancedForm";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  EnhancedForm,
}

