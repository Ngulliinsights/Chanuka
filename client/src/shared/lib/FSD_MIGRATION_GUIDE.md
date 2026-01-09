# FSD Migration Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing the FSD migration plan for Library Services.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- TypeScript knowledge
- FSD architecture understanding

## Phase 1: Form Builder FSD Restructuring

### Step 1: Create Directory Structure
```bash
mkdir -p client/src/shared/lib/form-builder/{types,services,hooks,factories,utils,__tests__,__mocks__,__fixtures__}
```

### Step 2: Implement Core Types
```typescript
// client/src/shared/lib/form-builder/types/index.ts
export interface FormBuilderOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodSchema<T>;
  onSuccess?: (data: T) => Promise<void> | void;
  onError?: (error: Error | ZodError) => void;
  debug?: boolean;
  errorMessages?: Partial<Record<Path<T>, string>>;
  validationMode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
}

export interface FormBuilderReturn<T extends FieldValues> extends UseFormReturn<T> {
  onSubmit: (onSubmitHandler: SubmitHandler<T>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  submitError: Error | null;
  resetForm: () => void;
  hasError: (fieldName: Path<T>) => boolean;
  getErrorMessage: (fieldName: Path<T>) => string | undefined;
  getErrorMessages: () => Partial<Record<Path<T>, string>>;
}
```

### Step 3: Implement Validation Service
```typescript
// client/src/shared/lib/form-builder/services/validation.service.ts
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@client/shared/lib/utils/logger';

export class ValidationService {
  private logger = logger;

  validate<T>(schema: ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: ZodError } {
    try {
      const validatedData = schema.parse(data);
      this.logger.info('Validation successful');
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error('Validation failed', { error: error.message });
        return { success: false, error };
      }
      throw error;
    }
  }

  getErrorMessage(error: ZodError, fieldName?: string): string {
    if (fieldName) {
      const fieldError = error.flatten().fieldErrors[fieldName];
      if (fieldError && fieldError.length > 0) {
        return fieldError[0];
      }
    }
    return error.message;
  }
}
```

### Step 4: Implement Error Handler Service
```typescript
// client/src/shared/lib/form-builder/services/error-handler.service.ts
import { logger } from '@client/shared/lib/utils/logger';

export class ErrorHandlerService {
  private logger = logger;

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
```

### Step 5: Implement Hook
```typescript
// client/src/shared/lib/form-builder/hooks/use-form-builder.ts
import { useCallback, useState, useRef } from 'react';
import { useForm, UseFormProps, UseFormReturn, FieldValues, SubmitHandler, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema, ZodError } from 'zod';

import { ValidationService } from '../services/validation.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { FormBuilderOptions, FormBuilderReturn } from '../types';

export function useFormBuilder<T extends FieldValues>({
  schema,
  onSuccess,
  onError,
  debug = false,
  errorMessages = {},
  validationMode = 'onBlur',
  ...formProps
}: FormBuilderOptions<T>): FormBuilderReturn<T> {
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const isMountedRef = useRef(true);

  const validationService = new ValidationService();
  const errorService = new ErrorHandlerService();

  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: validationMode,
    ...formProps,
  });

  const resetForm = useCallback(() => {
    form.reset();
    if (isMountedRef.current) {
      setSubmitError(null);
      setIsSubmittingCustom(false);
    }
  }, [form]);

  const hasError = useCallback(
    (fieldName: Path<T>): boolean => {
      return !!form.formState.errors[fieldName];
    },
    [form.formState.errors]
  );

  const getErrorMessage = useCallback(
    (fieldName: Path<T>): string | undefined => {
      const error = form.formState.errors[fieldName];
      if (!error?.message) return undefined;
      const customMessage = errorMessages[fieldName];
      return customMessage || (error.message as string);
    },
    [form.formState.errors, errorMessages]
  );

  const getErrorMessages = useCallback((): Partial<Record<Path<T>, string>> => {
    const messages: Partial<Record<Path<T>, string>> = {};
    Object.entries(form.formState.errors).forEach(([key, error]) => {
      if (error?.message) {
        const fieldName = key as Path<T>;
        messages[fieldName] = errorMessages[fieldName] || (error.message as string);
      }
    });
    return messages;
  }, [form.formState.errors, errorMessages]);

  const onSubmit = useCallback(
    (onSubmitHandler: SubmitHandler<T>) =>
      async (e?: React.BaseSyntheticEvent): Promise<void> => {
        e?.preventDefault();
        e?.stopPropagation();

        if (!isMountedRef.current) return;

        setSubmitError(null);
        setIsSubmittingCustom(true);

        try {
          if (debug) {
            logger.info('Form submission initiated', {
              component: 'useFormBuilder',
              mode: validationMode,
              timestamp: new Date().toISOString(),
            });
          }

          const isValid = await form.trigger();
          if (!isValid) {
            const errors = getErrorMessages();
            if (debug) {
              logger.warn('Form validation failed', { errors });
            }
            if (isMountedRef.current) {
              setIsSubmittingCustom(false);
            }
            return;
          }

          const validatedData = form.getValues();
          if (debug) {
            logger.info('Form validation successful', {
              fieldCount: Object.keys(validatedData).length,
            });
          }

          if (onSuccess) {
            await onSuccess(validatedData);
          }

          await onSubmitHandler(validatedData);

          if (debug) {
            logger.info('Form submission completed successfully');
          }
        } catch (error) {
          const normalizedError = errorService.normalizeError(error);
          errorService.handleFormError(normalizedError, 'useFormBuilder');
          
          if (isMountedRef.current) {
            setSubmitError(normalizedError);
          }

          if (onError) {
            onError(error instanceof ZodError ? error : normalizedError);
          }
        } finally {
          if (isMountedRef.current) {
            setIsSubmittingCustom(false);
          }
        }
      },
    [form, debug, onSuccess, onError, getErrorMessages, validationMode, errorService]
  );

  return {
    ...form,
    onSubmit,
    isSubmitting: isSubmittingCustom || form.formState.isSubmitting,
    submitError,
    resetForm,
    hasError,
    getErrorMessage,
    getErrorMessages,
  };
}
```

### Step 6: Create Factory
```typescript
// client/src/shared/lib/form-builder/factories/form-builder.factory.ts
import { ZodSchema } from 'zod';
import { FormBuilderOptions, FormBuilderReturn } from '../types';
import { useFormBuilder } from '../hooks/use-form-builder';

export class FormBuilderFactory {
  static create<T extends FieldValues>(options: FormBuilderOptions<T>): FormBuilderReturn<T> {
    return useFormBuilder<T>(options);
  }

  static createWithValidation<T extends FieldValues>(
    schema: ZodSchema<T>,
    config?: Omit<FormBuilderOptions<T>, 'schema'>
  ): FormBuilderReturn<T> {
    return useFormBuilder<T>({
      schema,
      ...config,
    } as FormBuilderOptions<T>);
  }
}
```

### Step 7: Update Main Export
```typescript
// client/src/shared/lib/form-builder/index.ts
export { useFormBuilder } from './hooks/use-form-builder';
export { FormBuilderFactory } from './factories/form-builder.factory';
export type { FormBuilderOptions, FormBuilderReturn } from './types';
```

## Phase 2: Validation Schemas FSD Restructuring

### Step 1: Create Type Definitions
```typescript
// client/src/shared/lib/validation-schemas/types/common.types.ts
export interface ValidationPatterns {
  email: string;
  password: string;
  username: string;
  url: string;
  phone: string;
  zipCode: string;
  slug: string;
  uuid: string;
  date: Date;
  futureDate: Date;
  positiveNumber: number;
  percentage: number;
}

export interface BillSearchQuery {
  query: string;
  filters?: {
    status?: 'active' | 'passed' | 'failed' | 'all';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    policyArea?: string;
    dateRange?: {
      from?: Date;
      to?: Date;
    };
  };
  limit?: number;
  offset?: number;
}
```

### Step 2: Create Schema Definitions
```typescript
// client/src/shared/lib/validation-schemas/schemas/common.schemas.ts
import { z } from 'zod';

export const validationPatterns = {
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  url: z.string().url('Invalid URL'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  uuid: z.string().uuid('Invalid UUID'),
  date: z.date().refine(date => date < new Date(), 'Date cannot be in the future'),
  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),
  positiveNumber: z.number().positive('Number must be positive'),
  percentage: z.number().min(0, 'Percentage must be between 0 and 100').max(100, 'Percentage must be between 0 and 100'),
};
```

### Step 3: Create Validation Service
```typescript
// client/src/shared/lib/validation-schemas/services/validation.service.ts
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@client/shared/lib/utils/logger';

export class ValidationService {
  private logger = logger;

  validate<T>(schema: ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: ZodError } {
    try {
      const validatedData = schema.parse(data);
      this.logger.info('Validation successful');
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error('Validation failed', { error: error.message });
        return { success: false, error };
      }
      throw error;
    }
  }

  validateSchema<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  getValidationErrors(error: ZodError): Record<string, string[]> {
    return error.flatten().fieldErrors;
  }
}
```

### Step 4: Update Main Export
```typescript
// client/src/shared/lib/validation-schemas/index.ts
export { validationPatterns } from './schemas/common.schemas';
export { billValidationSchemas } from './schemas/bill.schemas';
export { userValidationSchemas } from './schemas/user.schemas';
export { formValidationSchemas } from './schemas/form.schemas';
export { ValidationService } from './services/validation.service';

export type { BillSearchQuery, BillFilter, CreateBillData, UpdateBillData, BillCommentData } from './types/bill.types';
export type { UserRegisterData, UserLoginData, UserProfileData, UserPreferencesData } from './types/user.types';
export type { ContactFormData, FeedbackFormData, PaymentFormData } from './types/form.types';
```

## Phase 3: Dependency Injection Setup

### Step 1: Install Dependencies
```bash
pnpm add tsyringe
pnpm add -D @types/node
```

### Step 2: Create Service Container
```typescript
// client/src/shared/lib/container.ts
import { container, Lifecycle } from 'tsyringe';

// Register services
container.register('ValidationService', {
  useClass: ValidationService,
  lifecycle: Lifecycle.Singleton,
});

container.register('FormBuilderService', {
  useClass: FormBuilderService,
  lifecycle: Lifecycle.Singleton,
});

container.register('QueryService', {
  useClass: QueryService,
  lifecycle: Lifecycle.Singleton,
});

// Factory functions
export const getValidationService = () => container.resolve('ValidationService');
export const getFormBuilderService = () => container.resolve('FormBuilderService');
export const getQueryService = () => container.resolve('QueryService');
```

### Step 3: Create Service Hooks
```typescript
// client/src/shared/lib/hooks/use-services.ts
import { useMemo } from 'react';
import { getValidationService, getFormBuilderService, getQueryService } from '../container';

export function useValidationService() {
  return useMemo(() => getValidationService(), []);
}

export function useFormBuilderService() {
  return useMemo(() => getFormBuilderService(), []);
}

export function useQueryService() {
  return useMemo(() => getQueryService(), []);
}
```

## Phase 4: Testing Implementation

### Step 1: Create Test Utilities
```typescript
// client/src/shared/lib/__tests__/test-utils.ts
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { setupContainer } from 'tsyringe';

// Mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      // Add your reducers here
    },
  });
};

// Mock container
const setupMockContainer = () => {
  setupContainer();
  // Register mock services
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const store = createMockStore();
  setupMockContainer();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
```

### Step 2: Create Mock Services
```typescript
// client/src/shared/lib/__mocks__/services.mock.ts
import { ValidationService } from '../services/validation.service';

export const createMockValidationService = () => {
  const mock = {
    validate: jest.fn(),
    validateSchema: jest.fn(),
    getValidationErrors: jest.fn(),
  };
  
  return mock as jest.Mocked<ValidationService>;
};

export const createMockFormBuilderService = () => {
  const mock = {
    createForm: jest.fn(),
    validateForm: jest.fn(),
    resetForm: jest.fn(),
  };
  
  return mock as jest.Mocked<FormBuilderService>;
};
```

### Step 3: Create Test Fixtures
```typescript
// client/src/shared/lib/__fixtures__/test-data.ts
export const mockBillData = {
  title: 'Test Bill',
  description: 'Test bill description',
  policyArea: 'Test Policy',
  urgency: 'medium' as const,
  status: 'active' as const,
};

export const mockUserData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  username: 'johndoe',
};

export const mockFormData = {
  name: 'Test Form',
  email: 'test@example.com',
  message: 'Test message',
};
```

## Phase 5: Migration Execution

### Step 1: Update Import Statements
```bash
# Run migration script
node scripts/migrate-imports.js
```

### Step 2: Update Legacy Index
```typescript
// client/src/lib/index.ts
// Remove deprecated exports and warnings
// Keep only for external consumers if needed
```

### Step 3: Remove Legacy Directory
```bash
# After migration validation
rm -rf client/src/lib/
```

## Validation Checklist

### ✅ Functional Validation
- [ ] All existing functionality preserved
- [ ] Form builder works with new structure
- [ ] Validation schemas work correctly
- [ ] Query client functions properly
- [ ] Utilities work as expected

### ✅ Performance Validation
- [ ] Bundle size not increased significantly
- [ ] Load times maintained or improved
- [ ] Memory usage optimized
- [ ] Tree shaking working correctly

### ✅ Code Quality Validation
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint rules passing
- [ ] Code coverage maintained

### ✅ Developer Experience Validation
- [ ] Import paths updated correctly
- [ ] IDE autocomplete working
- [ ] Error messages clear and helpful
- [ ] Documentation accurate

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all import paths are updated to use FSD structure
2. **Type Errors**: Check TypeScript configuration and type exports
3. **Test Failures**: Verify mock services and test utilities
4. **Performance Issues**: Check for circular dependencies and bundle size

### Debug Commands

```bash
# Check bundle size
pnpm run build --analyze

# Run type checking
pnpm run typecheck

# Run all tests
pnpm run test

# Check for unused exports
pnpm run knip
```

## Next Steps

After completing this implementation guide:

1. **Monitor Performance**: Track application performance metrics
2. **Gather Feedback**: Collect developer feedback on new structure
3. **Optimize Further**: Identify additional optimization opportunities
4. **Document Learnings**: Update team documentation with lessons learned
5. **Plan Future Enhancements**: Identify areas for further FSD improvements
