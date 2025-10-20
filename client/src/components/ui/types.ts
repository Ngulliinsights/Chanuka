/**
 * UI component type definitions and interfaces
 * Following navigation component patterns for consistency
 */

import { z } from 'zod';
import { ReactNode, ComponentProps, HTMLAttributes } from 'react';

// Base UI component props interface
export interface BaseUIProps {
  id?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

// Validation state interface
export interface ValidationState {
  isValid: boolean;
  error?: string;
  touched: boolean;
}

// Form input validation props
export interface ValidationProps {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => string | undefined;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// Enhanced input props with validation
export interface EnhancedInputProps extends ComponentProps<"input">, BaseUIProps, ValidationProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  showValidation?: boolean;
  onValidationChange?: (state: ValidationState) => void;
}

// Enhanced textarea props with validation
export interface EnhancedTextareaProps extends ComponentProps<"textarea">, BaseUIProps, ValidationProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  showValidation?: boolean;
  onValidationChange?: (state: ValidationState) => void;
}

// Enhanced select props with validation
export interface EnhancedSelectProps extends BaseUIProps, ValidationProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  showValidation?: boolean;
  onValidationChange?: (state: ValidationState) => void;
  placeholder?: string;
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

// Button loading and error states
export interface ButtonState {
  loading?: boolean;
  error?: boolean;
  success?: boolean;
}

// Enhanced button props with states
export interface EnhancedButtonProps extends ComponentProps<"button">, BaseUIProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  state?: ButtonState;
  loadingText?: string;
  errorText?: string;
  successText?: string;
}

// Form validation configuration
export interface FormValidationConfig {
  validateOnSubmit?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorSummary?: boolean;
  scrollToFirstError?: boolean;
}

// Dialog validation props
export interface DialogValidationProps {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
}

// Table data validation
export interface TableValidationProps {
  data: unknown[];
  columns: TableColumn[];
  validateData?: boolean;
  onValidationError?: (errors: ValidationError[]) => void;
}

export interface TableColumn {
  key: string;
  header: string;
  validator?: z.ZodSchema;
  required?: boolean;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: any;
}

// Calendar and date picker validation
export interface DateValidationProps {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  required?: boolean;
  format?: string;
  onValidationChange?: (state: ValidationState) => void;
}

// Common validation result type
export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  field?: string;
}

// UI component error context
export interface UIErrorContext {
  component: string;
  action: string;
  timestamp: Date;
  userAgent?: string;
  additionalData?: Record<string, any>;
}