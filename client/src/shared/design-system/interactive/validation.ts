/**
 * Dialog Validation
 */

import { z } from 'zod';

export const DialogPropsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  confirmText: z.string().optional(),
  cancelText: z.string().optional(),
  loading: z.boolean().optional(),
  error: z.string().optional(),
});

export type DialogValidationProps = z.infer<typeof DialogPropsSchema>;

export const BasicDialogPropsSchema = z.object({
  open: z.boolean().optional(),
  onOpenChange: z.function().optional(),
  modal: z.boolean().optional(),
});

export type DialogProps = z.infer<typeof BasicDialogPropsSchema>;

/**
 * Safe date validation function
 */
export function safeValidateDate(date: any): boolean {
  if (!date) return false;
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  try {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  } catch {
    return false;
  }
}
