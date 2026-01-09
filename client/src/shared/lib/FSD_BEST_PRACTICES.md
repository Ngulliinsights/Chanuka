# FSD Best Practices for Library Services

## Overview

This document outlines the best practices for implementing and maintaining Feature-Sliced Design (FSD) in the Library Services of the Chanuka platform.

## Directory Structure Best Practices

### 1. Feature Organization
```
client/src/shared/lib/[feature]/
├── index.ts              # Public API - only export what's needed
├── types/                # TypeScript definitions
│   ├── [feature].types.ts
│   └── index.ts
├── schemas/              # Validation schemas
│   ├── [feature].schemas.ts
│   └── index.ts
├── services/             # Business logic
│   ├── [feature].service.ts
│   └── index.ts
├── hooks/                # React hooks
│   ├── use-[feature].ts
│   └── index.ts
├── factories/            # Factory functions
│   ├── [feature].factory.ts
│   └── index.ts
└── utils/                # Feature-specific utilities
    ├── [feature].utils.ts
    └── index.ts
```

### 2. Naming Conventions
- **Features**: Use kebab-case for directory names (`form-builder`, `validation-schemas`)
- **Files**: Use kebab-case for file names (`use-form-builder.ts`, `form-builder.service.ts`)
- **Exports**: Use PascalCase for classes and interfaces, camelCase for functions and variables
- **Types**: Use PascalCase with `Type` suffix for type definitions (`FormBuilderType`)

### 3. Export Strategy
```typescript
// ✅ Good: Only export public API
// client/src/shared/lib/form-builder/index.ts
export { useFormBuilder } from './hooks/use-form-builder';
export { FormBuilderFactory } from './factories/form-builder.factory';
export type { FormBuilderOptions, FormBuilderReturn } from './types';

// ❌ Bad: Exporting internal implementation details
export { ValidationService } from './services/validation.service';
export { ErrorHandlerService } from './services/error-handler.service';
```

## Dependency Management

### 1. Internal Dependencies
```typescript
// ✅ Good: Use relative imports within feature
import { ValidationService } from './services/validation.service';
import { FormBuilderOptions } from './types';

// ❌ Bad: Use absolute imports for internal dependencies
import { ValidationService } from '@client/shared/lib/form-builder/services/validation.service';
```

### 2. Cross-Feature Dependencies
```typescript
// ✅ Good: Use absolute imports for cross-feature dependencies
import { ValidationService } from '@client/shared/lib/validation-schemas/services/validation.service';

// ❌ Bad: Use relative imports for cross-feature dependencies
import { ValidationService } from '../../../validation-schemas/services/validation.service';
```

### 3. External Dependencies
```typescript
// ✅ Good: Import only what you need
import { z } from 'zod';
import { useForm } from 'react-hook-form';

// ❌ Bad: Import entire libraries
import * as zod from 'zod';
import * as reactHookForm from 'react-hook-form';
```

## Service Design Patterns

### 1. Service Class Structure
```typescript
// ✅ Good: Single responsibility, dependency injection
export class ValidationService {
  constructor(private logger: LoggerService) {}

  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    // Implementation
  }

  getErrorMessage(error: ZodError, fieldName?: string): string {
    // Implementation
  }
}

// ❌ Bad: No dependency injection, multiple responsibilities
export class ValidationService {
  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    // Direct logging instead of dependency injection
    console.log('Validating data...');
    // Implementation
  }

  formatError(error: ZodError): string {
    // Different responsibility mixed in
  }
}
```

### 2. Service Registration
```typescript
// ✅ Good: Use dependency injection container
container.register('ValidationService', {
  useClass: ValidationService,
  lifecycle: Lifecycle.Singleton,
});

// ❌ Bad: Direct instantiation
const validationService = new ValidationService();
```

## Hook Design Patterns

### 1. Hook Structure
```typescript
// ✅ Good: Clear separation of concerns, memoization
export function useFormBuilder<T extends FieldValues>(options: FormBuilderOptions<T>) {
  const validationService = useValidationService();
  const errorService = useErrorService();
  
  const form = useForm<T>({
    resolver: zodResolver(options.schema),
    mode: options.validationMode,
  });

  const onSubmit = useCallback(
    (onSubmitHandler: SubmitHandler<T>) =>
      async (e?: React.BaseSyntheticEvent): Promise<void> => {
        // Implementation
      },
    [form, validationService, errorService]
  );

  return useMemo(() => ({
    ...form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  }), [form, onSubmit]);
}

// ❌ Bad: No memoization, direct service instantiation
export function useFormBuilder<T extends FieldValues>(options: FormBuilderOptions<T>) {
  const validationService = new ValidationService(); // ❌ Bad
  const errorService = new ErrorHandlerService(); // ❌ Bad
  
  const form = useForm<T>({
    resolver: zodResolver(options.schema),
    mode: options.validationMode,
  });

  const onSubmit = async (onSubmitHandler: SubmitHandler<T>) => {
    // Implementation without memoization
  };

  return {
    ...form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
}
```

### 2. Hook Testing
```typescript
// ✅ Good: Test hook behavior, not implementation
describe('useFormBuilder', () => {
  it('should create form builder with validation', () => {
    const schema = z.object({ email: z.string().email() });
    const form = useFormBuilder({ schema });
    
    expect(form).toBeDefined();
    expect(form.hasError).toBeDefined();
    expect(form.getErrorMessage).toBeDefined();
  });
});

// ❌ Bad: Test internal implementation details
describe('useFormBuilder', () => {
  it('should call validation service', () => {
    const mockValidationService = createMockValidationService();
    // ❌ Testing internal service calls
  });
});
```

## Error Handling Best Practices

### 1. Error Service Pattern
```typescript
// ✅ Good: Centralized error handling
export class ErrorHandlerService {
  handleFormError(error: Error | ZodError, context: string): void {
    if (error instanceof ZodError) {
      this.logger.warn(`Form validation error in ${context}`, {
        errors: error.flatten().fieldErrors,
      });
    } else {
      this.logger.error(`Form submission error in ${context}`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error) || 'Unknown error occurred');
  }
}

// ❌ Bad: Scattered error handling
export function handleSubmit(data: unknown) {
  try {
    // Some operation
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('Validation error:', error.message); // ❌ Bad
    } else {
      console.error('Submission error:', error); // ❌ Bad
    }
  }
}
```

### 2. Error Boundaries
```typescript
// ✅ Good: Use error boundaries for component-level errors
export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasError(true);
      logger.error('Form error boundary caught error', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <div>Something went wrong with the form. Please try again.</div>;
  }

  return children;
}

// ❌ Bad: No error boundaries, errors bubble up
export function FormComponent() {
  // No error handling
  return <form>...</form>;
}
```

## Testing Best Practices

### 1. Test Structure
```typescript
// ✅ Good: Organized test structure
client/src/shared/lib/[feature]/
├── __tests__/
│   ├── [feature].service.test.ts
│   ├── use-[feature].test.ts
│   ├── [feature].factory.test.ts
│   └── [feature].utils.test.ts
├── __mocks__/
│   ├── [feature].mock.ts
│   └── services.mock.ts
└── __fixtures__/
    ├── [feature].fixtures.ts
    └── test-data.ts

// ❌ Bad: Tests scattered throughout codebase
client/src/
├── __tests__/
│   ├── form-builder.test.ts
│   ├── validation.test.ts
│   └── utils.test.ts
└── shared/
    └── lib/
        └── form-builder/
            └── index.ts
```

### 2. Mock Strategy
```typescript
// ✅ Good: Consistent mock creation
export const createMockValidationService = () => {
  return {
    validate: jest.fn().mockResolvedValue({ success: true }),
    validateSchema: jest.fn().mockResolvedValue({ success: true }),
    getValidationErrors: jest.fn().mockReturnValue({}),
  } as jest.Mocked<ValidationService>;
};

// ❌ Bad: Inconsistent mocking
const mockValidationService = {
  validate: jest.fn(),
  validateSchema: jest.fn(),
  getValidationErrors: jest.fn(),
};
```

### 3. Test Data
```typescript
// ✅ Good: Realistic test data
export const mockBillData = {
  title: 'Test Bill Title',
  description: 'This is a comprehensive test bill description that meets all requirements',
  policyArea: 'Education',
  urgency: 'medium' as const,
  status: 'active' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

// ❌ Bad: Minimal test data
export const mockBillData = {
  title: 'Test',
  description: 'Test',
  policyArea: 'Test',
  urgency: 'low',
  status: 'draft',
};
```

## Performance Optimization

### 1. Memoization
```typescript
// ✅ Good: Use memoization for expensive calculations
export function useFormBuilder<T extends FieldValues>(options: FormBuilderOptions<T>) {
  const validationService = useValidationService();
  const errorService = useErrorService();

  const form = useForm<T>({
    resolver: zodResolver(options.schema),
    mode: options.validationMode,
  });

  const onSubmit = useCallback(
    (onSubmitHandler: SubmitHandler<T>) =>
      async (e?: React.BaseSyntheticEvent): Promise<void> => {
        // Implementation
      },
    [form, validationService, errorService, options.validationMode]
  );

  const hasError = useCallback(
    (fieldName: Path<T>): boolean => {
      return !!form.formState.errors[fieldName];
    },
    [form.formState.errors]
  );

  return useMemo(() => ({
    ...form,
    onSubmit,
    hasError,
    isSubmitting: form.formState.isSubmitting,
  }), [form, onSubmit, hasError]);
}

// ❌ Bad: No memoization, recalculates on every render
export function useFormBuilder<T extends FieldValues>(options: FormBuilderOptions<T>) {
  const form = useForm<T>({
    resolver: zodResolver(options.schema),
    mode: options.validationMode,
  });

  const onSubmit = async (onSubmitHandler: SubmitHandler<T>) => {
    // Implementation without memoization
  };

  const hasError = (fieldName: Path<T>): boolean => {
    return !!form.formState.errors[fieldName];
  };

  return {
    ...form,
    onSubmit,
    hasError,
    isSubmitting: form.formState.isSubmitting,
  };
}
```

### 2. Bundle Optimization
```typescript
// ✅ Good: Tree-shakeable exports
export { useFormBuilder } from './hooks/use-form-builder';
export { FormBuilderFactory } from './factories/form-builder.factory';
export type { FormBuilderOptions, FormBuilderReturn } from './types';

// ❌ Bad: Non-tree-shakeable exports
export * from './hooks';
export * from './services';
export * from './types';
```

## Code Quality Standards

### 1. TypeScript Usage
```typescript
// ✅ Good: Strict TypeScript usage
export interface FormBuilderOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodSchema<T>;
  onSuccess?: (data: T) => Promise<void> | void;
  onError?: (error: Error | ZodError) => void;
  debug?: boolean;
  errorMessages?: Partial<Record<Path<T>, string>>;
  validationMode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
}

// ❌ Bad: Loose TypeScript usage
export interface FormBuilderOptions {
  schema: any; // ❌ Bad
  onSuccess?: Function; // ❌ Bad
  onError?: Function; // ❌ Bad
  debug?: boolean;
  errorMessages?: any; // ❌ Bad
  validationMode?: string; // ❌ Bad
}
```

### 2. Code Formatting
```typescript
// ✅ Good: Consistent formatting
export function validateForm<T>(
  schema: ZodSchema<T>,
  data: unknown,
  options: { strict?: boolean; debug?: boolean } = {}
): ValidationResult<T> {
  const { strict = false, debug = false } = options;

  if (debug) {
    console.log('Validating form data:', data);
  }

  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// ❌ Bad: Inconsistent formatting
export function validateForm<T>(schema:ZodSchema<T>,data:unknown,options:{strict?:boolean;debug?:boolean}={}):ValidationResult<T>{
const{strict=false,debug=false}=options;
if(debug){console.log('Validating form data:',data);}
try{const validatedData=schema.parse(data);return{success:true,data:validatedData};}
catch(error){if(error instanceof ZodError){return{success:false,error};}throw error;}}
```

## Documentation Standards

### 1. JSDoc Comments
```typescript
/**
 * Form Builder Hook
 *
 * A production-ready form creation utility that combines react-hook-form
 * with Zod validation, providing built-in error handling, loading states,
 * and accessibility features.
 *
 * @template T - The type of your form data, extending FieldValues
 * @param options - Configuration options for the form builder
 * @returns An enhanced form object with additional utility methods
 *
 * @example
 * ```typescript
 * const form = useFormBuilder({
 *   schema: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   }),
 *   onSuccess: async (data) => {
 *     await api.auth.login(data);
 *     router.push('/dashboard');
 *   }
 * });
 * ```
 */
export function useFormBuilder<T extends FieldValues>(options: FormBuilderOptions<T>): FormBuilderReturn<T> {
  // Implementation
}
```

### 2. README Structure
```markdown
# [Feature Name]

## Overview
Brief description of the feature and its purpose.

## Usage
Code examples showing how to use the feature.

## API Reference
Detailed documentation of all exported functions, classes, and types.

## Examples
Real-world usage examples.

## Testing
Information about testing the feature.

## Migration Guide
Steps for migrating from previous versions.
```

## Security Best Practices

### 1. Input Validation
```typescript
// ✅ Good: Comprehensive input validation
export const userValidationSchemas = {
  register: z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};

// ❌ Bad: No input validation
export const userValidationSchemas = {
  register: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    username: z.string(),
    password: z.string(),
  }),
};
```

### 2. Error Information
```typescript
// ✅ Good: Don't expose sensitive information in errors
export class ErrorHandlerService {
  handleFormError(error: Error | ZodError, context: string): void {
    if (error instanceof ZodError) {
      this.logger.warn(`Form validation error in ${context}`, {
        fieldCount: Object.keys(error.flatten().fieldErrors).length,
        // Don't log actual field values
      });
    } else {
      this.logger.error(`Form submission error in ${context}`, {
        message: 'An error occurred during form submission',
        // Don't expose error details to client
      });
    }
  }
}

// ❌ Bad: Expose sensitive information
export class ErrorHandlerService {
  handleFormError(error: Error | ZodError, context: string): void {
    if (error instanceof ZodError) {
      this.logger.warn(`Form validation error in ${context}`, {
        errors: error.flatten().fieldErrors,
        // Exposing field values
      });
    } else {
      this.logger.error(`Form submission error in ${context}`, {
        error: error.message, // Exposing internal error details
        stack: error.stack,
      });
    }
  }
}
```

## Conclusion

Following these best practices will ensure that the FSD implementation in Library Services is maintainable, scalable, and provides a great developer experience. Regular code reviews and team discussions should be held to ensure adherence to these practices and to evolve them as the project grows.
