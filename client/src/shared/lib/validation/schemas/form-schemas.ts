/**
 * Form Validation Schemas
 *
 * Validation schemas for form-related operations
 */

import { z } from 'zod';
import { validationPatterns } from '../types/validation.types';

/**
 * Contact form schema
 */
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),

  email: validationPatterns.email,

  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject too long'),

  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long'),

  priority: z.enum(['low', 'medium', 'high']).optional(),

  attachments: z.array(z.string()).optional(),
});

/**
 * Newsletter signup schema
 */
export const newsletterSignupSchema = z.object({
  email: validationPatterns.email,
  frequency: z.enum(['weekly', 'monthly', 'never']),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
});

/**
 * Feedback form schema
 */
export const feedbackFormSchema = z.object({
  type: z.enum(['bug', 'feature', 'feedback', 'other']),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  email: validationPatterns.email.optional(),
  screenshot: z.string().url().optional(),
});

/**
 * Payment form schema
 */
export const paymentFormSchema = z.object({
  cardNumber: z
    .string()
    .regex(/^\d{4}(?:\s?\d{4}){3}$|^\d{13,19}$/, 'Invalid card number')
    .transform(val => val.replace(/\s/g, '')),

  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry date format (MM/YY)'),

  cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),

  amount: validationPatterns.positiveNumber,

  currency: z.enum(['USD', 'EUR', 'GBP']),

  description: z.string().optional(),
});

/**
 * Contact form data type
 */
export type ContactFormData = z.infer<typeof contactFormSchema>;

/**
 * Newsletter signup data type
 */
export type NewsletterSignupData = z.infer<typeof newsletterSignupSchema>;

/**
 * Feedback form data type
 */
export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

/**
 * Payment form data type
 */
export type PaymentFormData = z.infer<typeof paymentFormSchema>;

/**
 * All form validation schemas
 */
export const formValidationSchemas = {
  contactForm: contactFormSchema,
  newsletterSignup: newsletterSignupSchema,
  feedbackForm: feedbackFormSchema,
  paymentForm: paymentFormSchema,
};
