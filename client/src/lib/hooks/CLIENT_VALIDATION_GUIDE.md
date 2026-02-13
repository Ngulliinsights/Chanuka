# Client-Side Validation Guide

This guide explains how to implement client-side validation using shared Zod schemas.

## Overview

Client-side validation provides:
- Immediate feedback to users
- Reduced server load
- Better user experience
- Type-safe form handling
- Consistent validation with server

## Installation

The validation hooks are already set up. You just need to import them:

```typescript
import {
  useFormValidation,
  useFieldValidation,
  useAsyncValidation,
  validateData,
  validateField,
} from '@client/lib/hooks/useValidation';
```

## Basic Form Validation

### Using useFormValidation Hook

The `useFormValidation` hook integrates with react-hook-form and Zod:

```typescript
import { useFormValidation } from '@client/lib/hooks/useValidation';
import { UserRegistrationSchema } from '@shared/validation';

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormValidation(UserRegistrationSchema);

  const onSubmit = async (data) => {
    // data is validated and type-safe
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <span role="alert" className="error">
            {errors.email.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          {...register('username')}
          aria-invalid={errors.username ? 'true' : 'false'}
        />
        {errors.username && (
          <span role="alert" className="error">
            {errors.username.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && (
          <span role="alert" className="error">
            {errors.password.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

## Field-Level Validation

### Using useFieldValidation Hook

For real-time validation of individual fields:

```typescript
import { useFieldValidation } from '@client/lib/hooks/useValidation';
import { UserSchema } from '@shared/validation';

function EmailInput() {
  const {
    value,
    setValue,
    error,
    isValid,
    onBlur,
  } = useFieldValidation(UserSchema, 'email');

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={value as string}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : 'false'}
        className={error ? 'input-error' : ''}
      />
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
      {isValid && value && (
        <span className="success">✓ Valid email</span>
      )}
    </div>
  );
}
```

## Async Validation

### Using useAsyncValidation Hook

For validation that requires server checks (e.g., checking if email exists):

```typescript
import { useAsyncValidation } from '@client/lib/hooks/useValidation';

function EmailAvailabilityCheck() {
  const { validate, isValidating, error } = useAsyncValidation(
    async (email: string) => {
      const response = await fetch(
        `/api/users/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      
      if (data.exists) {
        throw new Error('Email already exists');
      }
    }
  );

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        onBlur={(e) => validate(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
      />
      {isValidating && <span>Checking availability...</span>}
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
```

## Manual Validation

### Using validateData Function

For manual validation outside of forms:

```typescript
import { validateData } from '@client/lib/hooks/useValidation';
import { BillSchema } from '@shared/validation';

function validateBillData(billData: unknown) {
  const result = validateData(BillSchema, billData);
  
  if (result.success) {
    // Use result.data (type-safe)
    console.log('Valid bill:', result.data);
    return result.data;
  } else {
    // Handle result.errors
    console.error('Validation errors:', result.errors);
    result.errors?.forEach((error) => {
      console.error(`${error.field}: ${error.message}`);
    });
    return null;
  }
}
```

### Using validateField Function

For validating a single field:

```typescript
import { validateField } from '@client/lib/hooks/useValidation';
import { UserSchema } from '@shared/validation';

function checkEmailFormat(email: string) {
  const result = validateField(UserSchema, 'email', email);
  
  if (!result.success) {
    // Show errors
    result.errors?.forEach((error) => {
      console.error(error.message);
    });
    return false;
  }
  
  return true;
}
```

## Integration with Design System

### Using with Form Components

```typescript
import { useFormValidation } from '@client/lib/hooks/useValidation';
import { CommentSchema } from '@shared/validation';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@client/lib/design-system/interactive/form';

function CommentForm() {
  const form = useFormValidation(CommentSchema);

  const onSubmit = async (data) => {
    // Submit comment
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment</FormLabel>
              <FormControl>
                <textarea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <button type="submit">Submit Comment</button>
      </form>
    </Form>
  );
}
```

## Best Practices

### 1. Use Shared Schemas

Always use schemas from `@shared/validation`:

```typescript
// ✅ Good
import { UserSchema } from '@shared/validation';

// ❌ Bad - inline schema
const userSchema = z.object({ ... });
```

### 2. Provide Immediate Feedback

Validate on blur for better UX:

```typescript
<input
  {...register('email')}
  onBlur={() => trigger('email')} // Trigger validation on blur
/>
```

### 3. Show Clear Error Messages

Use accessible error messages:

```typescript
{errors.email && (
  <span
    role="alert"
    className="error"
    id="email-error"
  >
    {errors.email.message}
  </span>
)}
```

### 4. Disable Submit While Validating

Prevent multiple submissions:

```typescript
<button
  type="submit"
  disabled={isSubmitting || isValidating}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

### 5. Handle Server Validation Errors

Merge server errors with client errors:

```typescript
const onSubmit = async (data) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Set server validation errors
      if (error.validationErrors) {
        error.validationErrors.forEach((err) => {
          form.setError(err.field, {
            type: 'server',
            message: err.message,
          });
        });
      }
      
      return;
    }
    
    // Handle success
  } catch (error) {
    // Handle network error
  }
};
```

## Common Patterns

### Multi-Step Form Validation

```typescript
import { useFormValidation } from '@client/lib/hooks/useValidation';
import { UserRegistrationSchema } from '@shared/validation';

function MultiStepForm() {
  const [step, setStep] = useState(1);
  const form = useFormValidation(UserRegistrationSchema);

  const validateStep = async (stepNumber: number) => {
    const fieldsToValidate = {
      1: ['email', 'username'],
      2: ['password', 'password_confirm'],
      3: ['first_name', 'last_name'],
    }[stepNumber];

    const isValid = await form.trigger(fieldsToValidate);
    return isValid;
  };

  const nextStep = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      setStep(step + 1);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {step === 1 && <Step1Fields />}
        {step === 2 && <Step2Fields />}
        {step === 3 && <Step3Fields />}
        
        {step < 3 && (
          <button type="button" onClick={nextStep}>
            Next
          </button>
        )}
        {step === 3 && (
          <button type="submit">Submit</button>
        )}
      </form>
    </Form>
  );
}
```

### Conditional Validation

```typescript
import { z } from 'zod';

const ConditionalSchema = z.object({
  userType: z.enum(['individual', 'organization']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
}).refine(
  (data) => {
    if (data.userType === 'individual') {
      return !!data.firstName && !!data.lastName;
    }
    return !!data.organizationName;
  },
  {
    message: 'Please provide required fields for your user type',
  }
);

function ConditionalForm() {
  const form = useFormValidation(ConditionalSchema);
  const userType = form.watch('userType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <select {...form.register('userType')}>
          <option value="individual">Individual</option>
          <option value="organization">Organization</option>
        </select>

        {userType === 'individual' && (
          <>
            <input {...form.register('firstName')} placeholder="First Name" />
            <input {...form.register('lastName')} placeholder="Last Name" />
          </>
        )}

        {userType === 'organization' && (
          <input {...form.register('organizationName')} placeholder="Organization Name" />
        )}

        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}
```

## Testing Validation

### Unit Testing Validation Logic

```typescript
import { validateData } from '@client/lib/hooks/useValidation';
import { UserSchema } from '@shared/validation';

describe('User Validation', () => {
  it('should validate correct user data', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      role: 'citizen',
    };

    const result = validateData(UserSchema, validUser);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validUser);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      email: 'invalid-email',
      username: 'testuser',
      role: 'citizen',
    };

    const result = validateData(UserSchema, invalidUser);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('email');
  });
});
```

## Accessibility

Always ensure validation is accessible:

1. **Use aria-invalid**: Mark invalid fields
2. **Use aria-describedby**: Link errors to fields
3. **Use role="alert"**: Announce errors to screen readers
4. **Focus management**: Focus first error on submit

```typescript
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    {...register('email')}
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <span
      id="email-error"
      role="alert"
      className="error"
    >
      {errors.email.message}
    </span>
  )}
</div>
```

## Summary

- Use `useFormValidation` for complete form validation
- Use `useFieldValidation` for real-time field validation
- Use `useAsyncValidation` for server-side checks
- Always use shared schemas from `@shared/validation`
- Provide immediate, accessible feedback
- Handle both client and server validation errors
