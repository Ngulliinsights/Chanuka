/**
 * RUNTIME VALIDATION EXAMPLES
 *
 * Demonstrates usage of the runtime validation utilities
 */

import {
  isString,
  isNumber,
  isObject,
  isEmail,
  isUUID,
  validateObjectSchema,
  createSchemaValidator,
  ValidationResult,
  RuntimeValidator,
} from '../runtime-validation';

// ============================================================================
// Example 1: Basic Type Validation
// ============================================================================

// Validate basic types
const testString = 'hello';
const testNumber = 42;
const testObject = { name: 'test' };

console.log('Basic type validation:');
console.log('Is string:', isString(testString)); // true
console.log('Is number:', isNumber(testNumber)); // true
console.log('Is object:', isObject(testObject)); // true

// ============================================================================
// Example 2: Complex Type Validation
// ============================================================================

// Validate complex types
const testEmail = 'user@example.com';
const testUUID = '550e8400-e29b-41d4-a716-446655440000';

console.log('\nComplex type validation:');
console.log('Is email:', isEmail(testEmail)); // true
console.log('Is UUID:', isUUID(testUUID)); // true

// ============================================================================
// Example 3: Object Schema Validation
// ============================================================================

// Define a user schema
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

const userSchema = {
  id: isString,
  name: isString,
  email: isEmail,
  age: isNumber,
};

// Test valid user
const validUser = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
};

// Test invalid user
const invalidUser = {
  id: 123, // Should be string
  name: 'Jane Doe',
  email: 'invalid-email', // Invalid email format
  age: 'thirty', // Should be number
};

console.log('\nObject schema validation:');
const validResult = validateObjectSchema(validUser, userSchema);
console.log('Valid user result:', validResult);

const invalidResult = validateObjectSchema(invalidUser, userSchema);
console.log('Invalid user result:', invalidResult);

// ============================================================================
// Example 4: Custom Validator Creation
// ============================================================================

// Create a custom validator for User type
const userValidator = createSchemaValidator(userSchema);

console.log('\nCustom validator:');
console.log('Valid user:', userValidator(validUser)); // true
console.log('Invalid user:', userValidator(invalidUser)); // false

// ============================================================================
// Example 5: Validation Result Handling
// ============================================================================

function handleValidationResult(result: ValidationResult): void {
  if (result.valid) {
    console.log('✓ Validation passed');
  } else {
    console.log('✗ Validation failed:');
    if (result.errors) {
      result.errors.forEach((error) => {
        console.log(`  - ${error.path}: ${error.message}`);
      });
    }
  }
}

console.log('\nValidation result handling:');
handleValidationResult(validateObjectSchema(validUser, userSchema));
handleValidationResult(validateObjectSchema(invalidUser, userSchema));

// ============================================================================
// Example 6: Runtime Validator with Type Guards
// ============================================================================

// Create a type guard for User type
function isUser(value: unknown): value is User {
  return userValidator(value);
}

// Use the type guard
const unknownData: unknown = validUser;

if (isUser(unknownData)) {
  // TypeScript now knows unknownData is of type User
  console.log('\nType guard example:');
  console.log('User ID:', unknownData.id);
  console.log('User name:', unknownData.name);
}

// ============================================================================
// Example 7: Array Validation
// ============================================================================

// Validate array of strings
const stringArray = ['hello', 'world', 'test'];
const mixedArray = ['hello', 42, 'world'];

function validateStringArray(value: unknown): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [
        {
          path: 'root',
          message: 'Expected array',
          expectedType: 'array',
          actualType: typeof value,
          severity: 'error',
          code: 'TYPE_MISMATCH',
        },
      ],
      timestamp: Date.now(),
    };
  }

  const errors = value
    .map((item, index) => {
      if (!isString(item)) {
        return {
          path: `[${index}]`,
          message: `Expected string at index ${index}`,
          expectedType: 'string',
          actualType: typeof item,
          severity: 'error',
          code: 'ARRAY_ITEM_TYPE_MISMATCH',
        };
      }
      return null;
    })
    .filter(Boolean) as any[];

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: Date.now(),
  };
}

console.log('\nArray validation:');
console.log('String array:', validateStringArray(stringArray));
console.log('Mixed array:', validateStringArray(mixedArray));

// ============================================================================
// Example 8: Combining Validators
// ============================================================================

// Create a validator for a more complex type
interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  tags: string[];
}

const postSchema = {
  id: isUUID,
  title: isNonEmptyString,
  content: isNonEmptyString,
  author: userValidator,
  tags: (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every(isString);
  },
};

// Helper function for non-empty string validation
function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

const postValidator = createSchemaValidator(postSchema);

const validPost = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Hello World',
  content: 'This is a test post',
  author: validUser,
  tags: ['test', 'example'],
};

const invalidPost = {
  id: 'not-a-uuid',
  title: '', // Empty title
  content: 'This is a test post',
  author: invalidUser,
  tags: ['test', 123], // Invalid tag
};

console.log('\nComplex type validation:');
console.log('Valid post:', postValidator(validPost)); // true
console.log('Invalid post:', postValidator(invalidPost)); // false

// ============================================================================
// Example 9: Validation in API Context
// ============================================================================

// Simulate API request validation
function validateApiRequest(data: unknown): ValidationResult {
  const requestSchema = {
    method: (value: unknown): value is 'GET' | 'POST' | 'PUT' | 'DELETE' => {
      return ['GET', 'POST', 'PUT', 'DELETE'].includes(value as string);
    },
    endpoint: isString,
    headers: isObject,
    body: isObject,
  };

  return validateObjectSchema(data, requestSchema);
}

const validRequest = {
  method: 'POST',
  endpoint: '/api/users',
  headers: { 'Content-Type': 'application/json' },
  body: { name: 'John Doe' },
};

const invalidRequest = {
  method: 'INVALID', // Invalid method
  endpoint: '/api/users',
  headers: 'not-an-object', // Invalid headers
  body: { name: 'John Doe' },
};

console.log('\nAPI request validation:');
console.log('Valid request:', validateApiRequest(validRequest));
console.log('Invalid request:', validateApiRequest(invalidRequest));

// ============================================================================
// Usage Notes
// ============================================================================

/**
 * These examples demonstrate how to use the runtime validation utilities:
 *
 * 1. Use basic type validators (isString, isNumber, etc.) for simple checks
 * 2. Use complex validators (isEmail, isUUID, etc.) for specific formats
 * 3. Create object schemas for structured data validation
 * 4. Use createSchemaValidator to create reusable validators
 * 5. Handle validation results with proper error reporting
 * 6. Create type guards for runtime type safety
 * 7. Validate arrays and nested structures
 * 8. Combine validators for complex validation scenarios
 *
 * Runtime validation complements TypeScript's compile-time type checking by
 * providing additional safety for data that comes from external sources.
 */