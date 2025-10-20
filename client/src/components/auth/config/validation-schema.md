# Auth Validation Schema Documentation

## Overview

This document describes the validation schemas used in the auth component system, following Zod validation patterns established in the navigation component.

## Schema Definitions

### Login Schema

```typescript
const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});
```

**Validation Rules:**
- Email must be a valid email format
- Email is automatically converted to lowercase
- Email is trimmed of whitespace
- Password must be at least 8 characters
- Both fields are required

### Registration Schema

```typescript
const RegisterSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Must contain an uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

**Validation Rules:**
- Names must be 2-50 characters
- Names can only contain letters, hyphens, and apostrophes
- Email follows same rules as login
- Password must be 12-100 characters
- Password must contain uppercase, lowercase, number, and special character
- Password confirmation must match password
- All fields are trimmed of whitespace

## Field-Specific Validation

### Email Validation

```typescript
function validateEmail(email: string): ValidationResult<string> {
  const emailSchema = z.string().email('Please enter a valid email address');
  return validateField('email', email, z.object({ email: emailSchema }));
}
```

**Features:**
- RFC 5322 compliant email validation
- Automatic lowercase conversion
- Whitespace trimming
- Clear error messages

### Password Validation

```typescript
function validatePassword(password: string, config?: AuthConfig): ValidationResult<string> {
  const minLength = config?.security?.passwordMinLength || 8;
  
  let passwordSchema = z.string().min(minLength, `Password must be at least ${minLength} characters`);
  
  if (config?.security?.requireUppercase) {
    passwordSchema = passwordSchema.regex(/[A-Z]/, 'Password must contain at least one uppercase letter');
  }
  
  // Additional rules based on config...
}
```

**Configurable Rules:**
- Minimum length (configurable)
- Uppercase letter requirement
- Lowercase letter requirement
- Number requirement
- Special character requirement
- Maximum length limit

### Name Validation

```typescript
function validateName(name: string, fieldName: string): ValidationResult<string> {
  const nameSchema = z.string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} must be less than 50 characters`)
    .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
    .trim();
}
```

**Features:**
- Length validation (2-50 characters)
- Character restriction (letters, hyphens, apostrophes only)
- Automatic trimming
- Internationalization support for error messages

## Validation Utilities

### Safe Validation Functions

All validation functions return a consistent result object:

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: AuthValidationError;
}
```

### Real-time Field Validation

```typescript
function validateField(fieldName: string, value: string, schema: z.ZodSchema): ValidationResult<any> {
  try {
    // Extract field schema and validate
    const result = fieldSchema.safeParse({ [fieldName]: value });
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const error = new AuthValidationError(
      result.error.errors[0]?.message || 'Field validation failed',
      fieldName,
      result.error.errors
    );
    return { success: false, error };
  } catch (err) {
    // Handle unexpected errors
  }
}
```

### Password Strength Assessment

```typescript
function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  let score = 0;
  const feedback: string[] = [];
  
  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  
  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 1;
  
  const isStrong = score >= 5;
  return { score, feedback, isStrong };
}
```

## Error Handling

### Validation Error Types

```typescript
class AuthValidationError extends AuthError {
  public readonly field: string;
  public readonly validationErrors: any;

  constructor(message: string, field: string, validationErrors?: any) {
    super(message, AuthErrorType.VALIDATION_ERROR, 400, { field, validationErrors }, true);
    this.field = field;
    this.validationErrors = validationErrors;
  }
}
```

### Error Message Formatting

```typescript
function formatValidationErrors(zodErrors: z.ZodError): AuthValidationErrors {
  const formattedErrors: AuthValidationErrors = {};
  
  zodErrors.errors.forEach(err => {
    if (err.path[0]) {
      formattedErrors[err.path[0] as string] = err.message;
    }
  });
  
  return formattedErrors;
}
```

## Usage Examples

### Basic Form Validation

```typescript
import { safeValidateLogin, safeValidateRegister } from '@/components/auth/validation';

// Login validation
const loginResult = safeValidateLogin(formData);
if (!loginResult.success) {
  setErrors(formatValidationErrors(loginResult.error.validationErrors));
  return;
}

// Registration validation
const registerResult = safeValidateRegister(formData);
if (!registerResult.success) {
  setErrors(formatValidationErrors(registerResult.error.validationErrors));
  return;
}
```

### Real-time Field Validation

```typescript
const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  const result = validateField(name, value, currentSchema);
  
  if (!result.success) {
    setFieldError(name, result.error.message);
  } else {
    clearFieldError(name);
  }
};
```

### Custom Validation Rules

```typescript
// Custom email domain validation
const customEmailSchema = LoginSchema.extend({
  email: z.string()
    .email()
    .refine(
      (email) => email.endsWith('@company.com'),
      'Must use company email address'
    ),
});
```

## Best Practices

1. **Client-Side Only**: Never rely solely on client-side validation
2. **User-Friendly Messages**: Provide clear, actionable error messages
3. **Real-time Feedback**: Validate fields as users interact with them
4. **Progressive Enhancement**: Start with basic validation, add complexity
5. **Accessibility**: Ensure validation errors are accessible to screen readers
6. **Performance**: Debounce real-time validation to avoid excessive calls
7. **Security**: Sanitize inputs to prevent XSS attacks

## Testing Validation

### Unit Tests

```typescript
describe('Auth Validation', () => {
  it('should validate valid login data', () => {
    const result = safeValidateLogin({
      email: 'user@example.com',
      password: 'validpassword123',
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should reject invalid email', () => {
    const result = safeValidateLogin({
      email: 'invalid-email',
      password: 'validpassword123',
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('email');
  });
});
```

### Integration Tests

```typescript
describe('Form Validation Integration', () => {
  it('should show validation errors on form submission', async () => {
    render(<AuthForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});
```