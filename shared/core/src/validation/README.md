# Validation System

A comprehensive validation framework built on Zod with adapter pattern implementation, schema caching, preprocessing, and extensive middleware support for robust data validation across the application.

## Architecture

```
validation/
├── core/                    # Core validation interfaces and services
│   ├── interfaces.ts       # Validation service contracts
│   ├── validation-service.ts # Main validation service
│   └── index.ts           # Core barrel exports
├── adapters/               # Validation library adapters
│   ├── zod-adapter.ts      # Zod validation adapter
│   ├── joi-adapter.ts      # Joi validation adapter
│   ├── custom-adapter.ts   # Custom validation adapter
│   └── index.ts           # Adapter barrel exports
├── middleware/             # Express middleware integration
│   ├── express-middleware.ts # Express validation middleware
│   └── index.ts           # Middleware barrel exports
├── schemas/                # Predefined validation schemas
│   ├── auth.ts            # Authentication schemas
│   ├── common.ts          # Common validation patterns
│   ├── property.ts        # Property-specific schemas
│   └── index.ts           # Schema barrel exports
├── types/                  # TypeScript type definitions
├── validation-service.ts   # Legacy validation service
├── legacy-adapters/        # Backward compatibility adapters
└── index.ts               # Main exports
```

## Key Features

### 🏗️ Adapter Pattern Implementation
- **Multiple Validation Engines**: Support for Zod, Joi, and custom validators
- **Unified Interface**: Consistent API across all validation engines
- **Provider Agnostic**: Easy switching between validation libraries
- **Extensible**: Simple to add new validation providers

### ⚡ Performance Optimizations
- **Schema Caching**: Compiled schemas cached for reuse
- **Preprocessing**: Input sanitization and transformation
- **Batch Validation**: Process multiple items efficiently
- **Lazy Compilation**: Schemas compiled on first use

### 🔧 Middleware Integration
- **Express Middleware**: Automatic request validation
- **Error Handling**: Structured validation error responses
- **Type Safety**: TypeScript integration with inferred types
- **Flexible Configuration**: Custom validation rules and messages

### 📋 Comprehensive Schema Library
- **Authentication Schemas**: Login, registration, password validation
- **Common Patterns**: Email, phone, URL, date validation
- **Business Logic**: Property, user, and domain-specific schemas
- **Reusable Components**: Modular schema composition

## Usage Examples

### Basic Validation

```typescript
import { ValidationService } from '@Chanuka/core/validation';

const validator = new ValidationService();

// Register a schema
await validator.registerSchema('user', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 }
  },
  required: ['name', 'email', 'age']
});

// Validate data
const result = await validator.validate('user', userData);
console.log('Validated user:', result);
```

### Zod-Based Validation

```typescript
import { z } from 'zod';
import { createZodAdapter } from '@Chanuka/core/validation';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

const validator = createZodAdapter(userSchema);

// Validate with Zod
const result = await validator.validate(userData);
```

### Express Middleware

```typescript
import express from 'express';
import { validateRequest } from '@Chanuka/core/validation';

const app = express();

// Validate request body
app.post('/users',
  validateRequest({
    body: 'user',        // References registered schema
    query: 'pagination', // Optional query validation
    params: 'userId'     // Optional params validation
  }),
  async (req, res) => {
    // req.body is now validated and typed
    const user = req.body;
    res.json({ success: true, user });
  }
);

// Custom validation middleware
app.post('/custom',
  validateRequest({
    body: async (data) => {
      // Custom validation logic
      if (data.specialField && data.specialField.length > 100) {
        throw new ValidationError('Special field too long');
      }
      return data;
    }
  }),
  (req, res) => res.json({ valid: true })
);
```

### Batch Validation

```typescript
import { ValidationService } from '@Chanuka/core/validation';

const validator = new ValidationService();

// Register schema
await validator.registerSchema('product', productSchema);

// Batch validate multiple items
const batchData = [product1, product2, product3, product4];
const results = await validator.validateBatch('product', batchData);

console.log(`Valid: ${results.valid.length}`);
console.log(`Invalid: ${results.invalid.length}`);

// Process results
for (const invalid of results.invalid) {
  console.log(`Item ${invalid.index} failed:`, invalid.errors);
}
```

### Schema Composition and Reuse

```typescript
import { z } from 'zod';

// Base schemas
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zipCode: z.string().regex(/^\d{5}$/)
});

const contactSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/)
});

// Composed schema
const userSchema = z.object({
  name: z.string().min(1),
  contact: contactSchema,
  address: addressSchema.optional(),
  preferences: z.object({
    newsletter: z.boolean(),
    notifications: z.boolean()
  }).optional()
});

const validator = createZodAdapter(userSchema);
```

## Configuration Options

### Validation Service Configuration

```typescript
const validator = new ValidationService({
  enableCaching: true,        // Cache compiled schemas
  cacheSize: 100,            // Maximum cached schemas
  enablePreprocessing: true,  // Enable input preprocessing
  strictMode: false,         // Strict validation mode
  customValidators: {        // Custom validation functions
    'is-adult': (value) => value >= 18
  }
});
```

### Middleware Configuration

```typescript
app.use('/api', validateRequest({
  body: 'request-schema',
  query: 'query-schema',
  params: 'params-schema',
  headers: 'headers-schema',
  onValidationError: (errors, req, res) => {
    // Custom error handling
    res.status(400).json({
      success: false,
      errors: errors.map(e => ({
        field: e.field,
        message: e.message
      }))
    });
  },
  transform: (data) => {
    // Transform validated data
    return {
      ...data,
      createdAt: new Date(),
      normalizedEmail: data.email.toLowerCase()
    };
  }
}));
```

## Predefined Schemas

### Authentication Schemas

```typescript
import { authSchemas } from '@Chanuka/core/validation';

// Login schema
const loginData = {
  email: 'user@example.com',
  password: 'securePassword123'
};
const loginResult = await validator.validate('auth:login', loginData);

// Registration schema
const registerData = {
  email: 'user@example.com',
  password: 'securePassword123',
  confirmPassword: 'securePassword123',
  acceptTerms: true
};
const registerResult = await validator.validate('auth:register', registerData);
```

### Common Validation Patterns

```typescript
import { commonSchemas } from '@Chanuka/core/validation';

// Email validation
await validator.validate('common:email', 'user@example.com');

// Phone number validation
await validator.validate('common:phone', '+1-555-123-4567');

// URL validation
await validator.validate('common:url', 'https://example.com');

// Date validation
await validator.validate('common:date', '2024-01-15');
```

## Error Handling

### Validation Errors

```typescript
try {
  await validator.validate('user', invalidData);
} catch (error) {
  if (error.name === 'ValidationError') {
    console.log('Validation failed:');
    error.errors.forEach(err => {
      console.log(`- ${err.field}: ${err.message}`);
    });
  }
}
```

### Safe Validation

```typescript
// Non-throwing validation
const result = await validator.validateSafe('user', userData);

if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

## Performance Features

### Schema Caching

```typescript
// Schemas are automatically cached after first compilation
await validator.registerSchema('user', userSchema); // Compiled and cached
await validator.validate('user', data1); // Uses cached schema
await validator.validate('user', data2); // Uses cached schema
```

### Preprocessing

```typescript
// Automatic input preprocessing
const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', preprocess: 'trim' }, // Trim whitespace
    age: { type: 'number', preprocess: 'toNumber' } // Convert to number
  }
};
```

### Batch Processing

```typescript
// Efficient batch validation
const items = Array.from({ length: 1000 }, createItem);
const results = await validator.validateBatch('item', items);
// Processes all items efficiently with shared schema compilation
```

## Migration Guide

### From Legacy Validation

```typescript
// Before
import { validateUser } from './old-validators';
const result = validateUser(userData);

// After
import { ValidationService } from '@Chanuka/core/validation';
const validator = new ValidationService();
await validator.registerSchema('user', userSchema);
const result = await validator.validate('user', userData);
```

### From Joi to Zod

```typescript
// Before (Joi)
const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

// After (Zod)
import { z } from 'zod';
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});
```

### From Express-Validator

```typescript
// Before
app.post('/users', [
  body('email').isEmail(),
  body('name').notEmpty()
], async (req, res) => { ... });

// After
import { validateRequest } from '@Chanuka/core/validation';

app.post('/users',
  validateRequest({
    body: 'user-schema'
  }),
  async (req, res) => {
    // req.body is validated and typed
  }
);
```

## Testing

```bash
# Run validation tests
npm test -- src/validation

# Run adapter tests
npm test -- src/validation/adapters

# Run middleware tests
npm test -- src/validation/middleware

# Run schema tests
npm test -- src/validation/schemas
```

## Best Practices

1. **Use Appropriate Schemas**: Choose schemas that match your data structure
2. **Enable Caching**: Keep `enableCaching: true` for better performance
3. **Validate Early**: Validate input as soon as possible in request lifecycle
4. **Handle Errors Gracefully**: Use `validateSafe` for non-throwing validation
5. **Compose Schemas**: Build complex schemas from reusable components
6. **Test Validation Logic**: Include validation in your test suites
7. **Monitor Performance**: Track validation performance in production
8. **Keep Schemas Simple**: Avoid overly complex validation rules

## Security Considerations

- **Input Sanitization**: Automatic preprocessing prevents injection attacks
- **Schema Validation**: Prevents malformed data from reaching business logic
- **Error Information**: Validation errors don't leak sensitive information
- **Rate Limiting**: Integration with rate limiting prevents abuse
- **Type Safety**: TypeScript integration prevents runtime type errors

## Integration Examples

### With Database Operations

```typescript
app.post('/users', validateRequest({ body: 'user' }), async (req, res) => {
  const validatedUser = req.body;

  // Safe to use validated data
  const user = await db.createUser(validatedUser);
  res.json({ user });
});
```

### With API Responses

```typescript
app.get('/users/:id', validateRequest({ params: 'userId' }), async (req, res) => {
  const { id } = req.params; // Validated as number/string

  const user = await db.getUser(id);
  const validatedResponse = await validator.validate('user-response', user);
  res.json(validatedResponse);
});
```

### With File Uploads

```typescript
app.post('/upload',
  validateRequest({
    body: 'upload-metadata',
    files: 'image-files' // Custom file validation
  }),
  uploadMiddleware,
  async (req, res) => {
    // Files and metadata are validated
    const result = await processFiles(req.files, req.body);
    res.json({ success: true, result });
  }
);