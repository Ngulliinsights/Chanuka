# Validation Module

Unified validation infrastructure integrated with error handling system.

## Purpose

Consolidates validation logic from across the client application into a single, standardized module. Provides field validators, form validation, schema validation, and async validation support. All validation errors are automatically integrated with the error handling system for tracking and observability.

## Public API

### Core Validator

```typescript
import { validator, validateField, validateForm, validateSchema } from '@/infrastructure/validation';

// Validate a single field
const result = validateField('email', 'user@example.com', {
  required: true,
  email: true,
});

// Validate a form
const formResult = validateForm(formData, {
  email: { required: true, email: true },
  password: { required: true, minLength: 8 },
  age: { required: true, min: 18, max: 120 },
});

// Validate with Zod schema
const schemaResult = validateSchema(userSchema, userData);
```

### Field Validators

```typescript
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateUrl,
  validateRequired,
  validateLength,
  validateRange,
  validatePattern,
  validateUuid,
} from '@/infrastructure/validation';

// Email validation
const emailResult = validateEmail('user@example.com');

// Password strength validation
const passwordResult = validatePassword('SecurePass123!');

// Phone number validation
const phoneResult = validatePhone('+1 (555) 123-4567');

// URL validation
const urlResult = validateUrl('https://example.com');

// UUID validation
const uuidResult = validateUuid('123e4567-e89b-12d3-a456-426614174000');
```

### Async Validation

```typescript
import { validateAsync } from '@/infrastructure/validation';

// Async validation with custom rules
const result = await validateAsync(username, {
  required: true,
  minLength: 3,
  custom: [
    {
      name: 'uniqueUsername',
      test: async (value) => {
        const exists = await checkUsernameExists(value);
        return !exists;
      },
      message: 'Username is already taken',
      async: true,
    },
  ],
});
```

### Validation Patterns

```typescript
import { VALIDATION_PATTERNS } from '@/infrastructure/validation';

// Use predefined patterns
const isValidEmail = VALIDATION_PATTERNS.email.test(email);
const isValidPhone = VALIDATION_PATTERNS.phone.test(phone);
const isValidUrl = VALIDATION_PATTERNS.url.test(url);
const isStrongPassword = VALIDATION_PATTERNS.strongPassword.test(password);
```

## Types

### ValidationResult

```typescript
interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ValidationError;
  errors?: ValidationFieldError[];
  warnings?: string[];
}
```

### FieldValidationRules

```typescript
interface FieldValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  phone?: boolean;
  custom?: ValidationRule[];
}
```

### FormValidationSchema

```typescript
interface FormValidationSchema {
  [fieldName: string]: FieldValidationRules;
}
```

## Integration with Error Handling

All validation errors are automatically tracked through the error handling system:

```typescript
import { validateForm } from '@/infrastructure/validation';

const result = validateForm(formData, schema);

if (!result.success) {
  // Validation error is automatically:
  // 1. Tracked in observability system
  // 2. Logged with appropriate severity
  // 3. Available for error recovery strategies
  
  console.log(result.error); // ValidationError extends AppError
  console.log(result.errors); // Array of field-level errors
}
```

## Usage Examples

### Form Validation

```typescript
import { validateForm } from '@/infrastructure/validation';

const loginSchema = {
  email: {
    required: true,
    email: true,
  },
  password: {
    required: true,
    minLength: 8,
  },
};

const result = validateForm(loginData, loginSchema);

if (!result.success) {
  // Display field errors
  result.errors?.forEach(error => {
    showFieldError(error.field, error.message);
  });
}
```

### Custom Validation Rules

```typescript
import { validateField } from '@/infrastructure/validation';

const result = validateField('username', username, {
  required: true,
  minLength: 3,
  maxLength: 20,
  pattern: /^[a-zA-Z0-9_-]+$/,
  custom: [
    {
      name: 'noSpaces',
      test: (value) => !value.includes(' '),
      message: 'Username cannot contain spaces',
    },
    {
      name: 'noReservedWords',
      test: (value) => !['admin', 'root', 'system'].includes(value.toLowerCase()),
      message: 'This username is reserved',
    },
  ],
});
```

### Zod Schema Validation

```typescript
import { z } from 'zod';
import { validateSchema } from '@/infrastructure/validation';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
});

const result = validateSchema(userSchema, userData);

if (result.success) {
  // TypeScript knows result.data is properly typed
  console.log(result.data.email);
}
```

## Migration from Old Patterns

### Before (scattered validation)

```typescript
// In component
if (!email || !email.includes('@')) {
  setError('Invalid email');
  return;
}

if (password.length < 8) {
  setError('Password too short');
  return;
}
```

### After (unified validation)

```typescript
import { validateForm } from '@/infrastructure/validation';

const result = validateForm({ email, password }, {
  email: { required: true, email: true },
  password: { required: true, minLength: 8 },
});

if (!result.success) {
  setErrors(result.errors);
  return;
}
```

## Best Practices

1. **Use field validators for simple validations**: `validateEmail()`, `validatePhone()`, etc.
2. **Use form validation for multi-field forms**: `validateForm()` with schema
3. **Use Zod schemas for complex data structures**: `validateSchema()` with Zod
4. **Use async validation for server-side checks**: `validateAsync()` with custom rules
5. **Always check `result.success`** before using `result.data`
6. **Display field-level errors** from `result.errors` array
7. **Validation errors are automatically tracked** - no need to manually log them

## Dependencies

- `zod`: Schema validation library
- `@/infrastructure/error`: Error handling integration
- `@shared/validation`: Shared validation schemas (server/client)

## Sub-modules

- `types.ts`: Type definitions
- `validators.ts`: Field validation functions
- `validator.ts`: Core validator implementation
- `index.ts`: Public API exports
