/**
 * Dialog Component Types
 */

export interface DialogValidationProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
}

export interface BasicDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export interface DateValidationProps {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  required?: boolean;
  format?: string;
}

export interface ValidationState {
  isValid: boolean;
  touched: boolean;
  error?: string;
};
