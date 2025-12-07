# Phase 3c: Form Validation Integration

## Overview

Phase 3c adds comprehensive form validation patterns, error handling, and user feedback mechanisms to complement the design system created in Phases 1-3b.

**Status**: Ready for Implementation
**Timeline**: 2-3 hours
**Dependencies**: Phase 3b (Storybook) completed

## Architecture

### Form Validation Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    React Hook Form                          │
│         (Already in package.json, ready to use)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Zod Schemas                              │
│         Type-safe validation with TypeScript                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           @hookform/resolvers                               │
│    Bridge between React Hook Form and Zod                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│        Design System Components                             │
│   (Input, Label, Badge, Alert already styled)              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Validation Schema Helpers

**File**: `client/src/lib/validation-schemas.ts`

```typescript
import { z } from 'zod';

// Common validation patterns
export const validationPatterns = {
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3).max(20),
  url: z.string().url('Invalid URL'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
};

// Bill-related schemas
export const billValidationSchemas = {
  search: z.object({
    query: z.string().min(1, 'Search term required'),
    filters: z.object({
      status: z.enum(['active', 'passed', 'failed', 'all']).optional(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      policyArea: z.string().optional(),
    }).optional(),
  }),

  filter: z.object({
    status: z.enum(['active', 'passed', 'failed', 'all']).optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    policyArea: z.string().optional(),
    dateRange: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
    }).optional(),
  }),

  billCreate: z.object({
    title: z.string().min(10, 'Title must be at least 10 characters'),
    description: z.string().min(50, 'Description must be at least 50 characters'),
    policyArea: z.string().min(1, 'Policy area is required'),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    tags: z.array(z.string()).optional(),
  }),

  comment: z.object({
    content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment too long'),
    billId: z.string(),
  }),
};

// User profile schemas
export const userValidationSchemas = {
  profile: z.object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    email: validationPatterns.email,
    phone: validationPatterns.phone.optional(),
    bio: z.string().max(500, 'Bio too long').optional(),
  }),

  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    notifications: z.boolean(),
    emailDigest: z.enum(['daily', 'weekly', 'never']),
    accessibility: z.object({
      reducedMotion: z.boolean(),
      highContrast: z.boolean(),
      fontSize: z.enum(['small', 'medium', 'large']),
    }),
  }),
};
```

### 2. Form Error Display Component

**File**: `client/src/components/ui/form-error.tsx`

```typescript
import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@client/lib/utils';
import { Alert, AlertDescription } from './alert';

interface FormErrorProps {
  message?: string;
  type?: 'error' | 'warning' | 'info';
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const FormError: React.FC<FormErrorProps> = ({
  message,
  type = 'error',
  className,
  dismissible = false,
  onDismiss,
}) => {
  if (!message) return null;

  const icons = {
    error: AlertCircle,
    warning: AlertCircle,
    info: AlertCircle,
  };

  const variants = {
    error: 'destructive',
    warning: 'default',
    info: 'default',
  } as const;

  const Icon = icons[type];

  return (
    <Alert variant={variants[type]} className={cn('flex items-start gap-3', className)}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <AlertDescription className="flex-1">{message}</AlertDescription>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-auto -mr-1 -mt-0.5"
          aria-label="Dismiss"
        >
          <XCircle className="h-4 w-4 cursor-pointer hover:opacity-70" />
        </button>
      )}
    </Alert>
  );
};
```

### 3. Enhanced Form Field Component

**File**: `client/src/components/ui/form-field.tsx` (Enhanced)

```typescript
import React from 'react';
import { FieldValues, FieldPath, UseControllerProps, useController } from 'react-hook-form';
import { cn } from '@client/lib/utils';
import { Label } from './label';
import { FormError } from './form-error';
import { Badge } from './badge';

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label?: string;
  required?: boolean;
  helperText?: string;
  showCharCount?: boolean;
  maxLength?: number;
  className?: string;
  children: (fieldProps: any) => React.ReactNode;
}

export const FormField = React.forwardRef<
  HTMLDivElement,
  FormFieldProps
>(({
  label,
  required,
  helperText,
  showCharCount,
  maxLength,
  className,
  children,
  ...controllerProps
}, ref) => {
  const { field, fieldState } = useController(controllerProps);
  const [charCount, setCharCount] = React.useState(0);

  const handleChange = (e: any) => {
    field.onChange(e);
    if (showCharCount && e.target.value) {
      setCharCount(e.target.value.length);
    }
  };

  return (
    <div ref={ref} className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={field.name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {children({
        ...field,
        onChange: handleChange,
        'aria-invalid': fieldState.invalid,
        'aria-describedby': fieldState.error ? `${field.name}-error` : undefined,
      })}

      {helperText && !fieldState.error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {showCharCount && maxLength && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            {charCount} / {maxLength} characters
          </span>
          {charCount > maxLength * 0.9 && (
            <Badge variant="warning" size="sm">
              Approaching limit
            </Badge>
          )}
        </div>
      )}

      {fieldState.error && (
        <FormError
          id={`${field.name}-error`}
          message={fieldState.error.message}
          type="error"
        />
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
```

### 4. Form Builder Utility

**File**: `client/src/lib/form-builder.ts`

```typescript
import { useForm, UseFormProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

interface FormBuilderOptions<T extends FieldValues> extends UseFormProps<T> {
  schema: ZodSchema;
  onSuccess?: (data: T) => Promise<void> | void;
  onError?: (error: Error) => void;
}

export function useFormBuilder<T extends FieldValues>({
  schema,
  onSuccess,
  onError,
  ...formProps
}: FormBuilderOptions<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    ...formProps,
  });

  const handleSubmit = form.handleSubmit(
    async (data) => {
      try {
        await onSuccess?.(data);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Form submission failed'));
      }
    },
    (errors) => {
      // Log validation errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Form validation errors:', errors);
      }
    }
  );

  return {
    ...form,
    handleSubmit,
  };
}
```

### 5. Story Examples for Form Validation

**File**: `client/src/components/ui/form-validation.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { FormField } from './form-field';
import { Alert, AlertDescription } from './alert';

// Validation schemas
const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const meta: Meta = {
  title: 'Forms/Validation Examples',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;

// Contact Form with Validation
export const ContactFormWithValidation: StoryObj = {
  render: () => {
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
      resolver: zodResolver(contactSchema),
      mode: 'onBlur',
    });

    const onSubmit = async (data: ContactFormData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Form submitted:', data);
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Contact Us</h2>

        <FormField
          control={control}
          name="email"
          label="Email Address"
          required
          helperText="We'll respond within 24 hours"
        >
          {(field) => <Input type="email" placeholder="your@email.com" {...field} />}
        </FormField>

        <FormField
          control={control}
          name="subject"
          label="Subject"
          required
          helperText="Brief description of your inquiry"
        >
          {(field) => <Input placeholder="How can we help?" {...field} />}
        </FormField>

        <FormField
          control={control}
          name="message"
          label="Message"
          required
          showCharCount
          maxLength={1000}
          helperText="Provide details about your inquiry"
        >
          {(field) => (
            <textarea
              placeholder="Your message here..."
              className="w-full px-3 py-2 border border-input rounded-md"
              rows={4}
              {...field}
            />
          )}
        </FormField>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </form>
    );
  },
};

// Async Validation Example
export const AsyncValidationExample: StoryObj = {
  render: () => {
    const schema = z.object({
      username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .refine(
          async (val) => {
            // Simulate API call to check username availability
            await new Promise(resolve => setTimeout(resolve, 500));
            return !['admin', 'root', 'system'].includes(val.toLowerCase());
          },
          { message: 'This username is already taken' }
        ),
    });

    type FormData = z.infer<typeof schema>;

    const { control, handleSubmit } = useForm<FormData>({
      resolver: zodResolver(schema),
      mode: 'onBlur',
    });

    return (
      <form onSubmit={handleSubmit((data) => console.log(data))} className="space-y-4">
        <h2 className="text-lg font-semibold">Create Account</h2>
        <FormField control={control} name="username" label="Username" required>
          {(field) => <Input placeholder="Choose a username..." {...field} />}
        </FormField>
        <Button type="submit">Check Availability</Button>
      </form>
    );
  },
};

// Form with Real-time Validation
export const RealTimeValidationExample: StoryObj = {
  render: () => {
    const schema = z.object({
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain uppercase letter')
        .regex(/[a-z]/, 'Must contain lowercase letter')
        .regex(/[0-9]/, 'Must contain number'),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });

    type FormData = z.infer<typeof schema>;

    const { control, handleSubmit, watch } = useForm<FormData>({
      resolver: zodResolver(schema),
      mode: 'onChange',
    });

    const password = watch('password');

    return (
      <form onSubmit={handleSubmit((data) => console.log(data))} className="space-y-4">
        <h2 className="text-lg font-semibold">Set Password</h2>
        
        <FormField control={control} name="password" label="Password" required>
          {(field) => <Input type="password" placeholder="Enter password..." {...field} />}
        </FormField>

        {password && (
          <Alert variant={password.length >= 8 ? 'default' : 'destructive'}>
            <AlertDescription>
              Password strength: {
                password.length < 8 ? 'Too short' :
                password.match(/[A-Z]/) && password.match(/[a-z]/) && password.match(/[0-9]/)
                  ? 'Strong' : 'Medium'
              }
            </AlertDescription>
          </Alert>
        )}

        <FormField control={control} name="confirmPassword" label="Confirm Password" required>
          {(field) => <Input type="password" placeholder="Confirm password..." {...field} />}
        </FormField>

        <Button type="submit">Create Account</Button>
      </form>
    );
  },
};
```

## Implementation Checklist

- [ ] Create `validation-schemas.ts` with Zod schemas
- [ ] Create `form-error.tsx` component for error display
- [ ] Enhance `form-field.tsx` with validation integration
- [ ] Create `form-builder.ts` utility hook
- [ ] Add `form-validation.stories.tsx` to Storybook
- [ ] Update component documentation with validation examples
- [ ] Add validation tests for common schemas
- [ ] Create form validation testing utilities
- [ ] Document validation patterns in style guide
- [ ] Add validation error messages to copy system

## Usage Examples

### Basic Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { billValidationSchemas } from '@client/lib/validation-schemas';
import { FormField } from '@client/components/ui/form-field';
import { Input } from '@client/components/ui/input';
import { Button } from '@client/components/ui/button';

export function CreateBillForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(billValidationSchemas.billCreate),
  });

  return (
    <form onSubmit={handleSubmit(async (data) => {
      // Submit to API
      await api.bills.create(data);
    })}>
      <FormField
        control={control}
        name="title"
        label="Bill Title"
        required
      >
        {(field) => <Input {...field} placeholder="Enter bill title..." />}
      </FormField>

      <Button type="submit">Create Bill</Button>
    </form>
  );
}
```

### Advanced Form with Async Validation

```tsx
const schema = z.object({
  email: z.string().email(),
}).refine(
  async (data) => {
    const exists = await checkEmailExists(data.email);
    return !exists;
  },
  { message: 'Email already registered', path: ['email'] }
);
```

## Testing

### Unit Tests for Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { billValidationSchemas } from '@client/lib/validation-schemas';

describe('Bill Validation Schemas', () => {
  it('should validate correct bill data', async () => {
    const validBill = {
      title: 'Long enough bill title here',
      description: 'This is a long enough description that meets the minimum character requirements',
      policyArea: 'Healthcare',
      urgency: 'high',
    };

    const result = await billValidationSchemas.billCreate.parseAsync(validBill);
    expect(result).toBeDefined();
  });

  it('should reject title that is too short', async () => {
    const invalidBill = {
      title: 'Short',
      description: 'Valid description here that is long enough for the minimum',
      policyArea: 'Healthcare',
      urgency: 'high',
    };

    await expect(
      billValidationSchemas.billCreate.parseAsync(invalidBill)
    ).rejects.toThrow();
  });
});
```

## Performance Considerations

1. **Debounced Validation**: Use `mode: 'onBlur'` for large forms to reduce re-renders
2. **Lazy Async Validation**: Use `.refine()` for async checks only on blur/submit
3. **Field-level Memoization**: Memoize FormField components to prevent unnecessary re-renders
4. **Schema Composition**: Break large schemas into smaller, reusable pieces

## Accessibility Features

- ✅ `aria-invalid` on inputs with errors
- ✅ `aria-describedby` linking errors to inputs
- ✅ `required` indicator with visual and text cues
- ✅ Error messages in semantic HTML
- ✅ Keyboard navigation support
- ✅ Screen reader announcements for validation changes

## Integration with Existing Components

All validation components integrate seamlessly with:
- Design tokens and dark mode
- Theme switching
- Responsive design
- Mobile touch optimization
- Accessibility features from Phase 3b

## Next Steps

After Phase 3c completion:
1. Move to Phase 4 (Production Readiness)
2. Add E2E tests for form flows
3. Set up form performance monitoring
4. Create form usage analytics
5. Document common form patterns

---

**Phase 3c Status**: Ready for Implementation
**Estimated Duration**: 2-3 hours
**Complexity**: Medium (mostly configuration and composition)
**Bundle Impact**: Minimal (~5KB gzipped for validation utilities)
