# Primitives Foundation Layer

This directory contains the foundational primitives that provide zero-dependency building blocks for the entire shared/core system. These primitives ensure type safety, functional programming patterns, and consistent error handling throughout the codebase.

## Overview

The primitives layer is designed with these key principles:

- **Zero Dependencies**: No imports from other shared/core modules
- **Pure TypeScript**: Only types, constants, and pure functions
- **Type Safety**: Comprehensive type checking and branded types
- **Functional Programming**: Result/Maybe types for error handling
- **Performance**: Optimized implementations with caching where appropriate

## Structure

```
primitives/
├── types/           # Core type system
│   ├── result.ts    # Result<T,E> for functional error handling
│   ├── maybe.ts     # Maybe<T> for optional values
│   ├── branded.ts   # Branded types for domain-specific values
│   └── index.ts     # Type exports
├── errors/          # Error handling primitives
│   ├── base-error.ts # Abstract BaseError class
│   └── index.ts     # Error exports
├── constants/       # Type-safe constants
│   ├── http-status.ts # HTTP status codes
│   ├── time.ts      # Time constants and conversions
│   └── index.ts     # Constant exports
├── index.ts         # Main barrel export
└── README.md        # This documentation
```

## Core Types

### Result<T, E>

A functional programming approach to error handling that forces explicit handling of both success and failure cases.

```typescript
import { ok, err, Result } from '@shared/core/primitives';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.error(result.error); // Won't execute
}
```

### Maybe<T>

Represents optional values without null/undefined, inspired by Rust's Option type.

```typescript
import { some, none, Maybe } from '@shared/core/primitives';

function findUser(id: string): Maybe<User> {
  const user = database.find(id);
  return user ? some(user) : none;
}

const user = findUser('123');
if (user.isSome()) {
  console.log(user.value.name);
} else {
  console.log('User not found');
}
```

### Branded Types

Creates distinct types for the same underlying primitive to prevent mixing incompatible values.

```typescript
import { UserId, Email, createUserId, createEmail } from '@shared/core/primitives';

function processUser(userId: UserId, email: Email) {
  // TypeScript will prevent passing email where userId is expected
}

const userId = createUserId('123');
const email = createEmail('user@example.com');
processUser(userId, email); // Type error!
```

## Error Handling

### BaseError

Abstract base class providing comprehensive error handling features:

- Correlation IDs for error tracking
- Recovery strategies with automatic execution
- Metadata for context and debugging
- Serialization/deserialization support
- Retry logic with attempt tracking

```typescript
import { BaseError, ErrorDomain, ErrorSeverity } from '@shared/core/primitives';

class ValidationError extends BaseError {
  constructor(message: string, field: string) {
    super(message, {
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      context: { field }
    });
  }
}
```

## Constants

### HTTP Status Codes

Type-safe HTTP status codes with utility functions:

```typescript
import { HTTP_STATUS_OK, isSuccessStatus } from '@shared/core/primitives';

if (isSuccessStatus(response.status)) {
  // Handle success
}
```

### Time Constants

Comprehensive time constants in milliseconds with conversion utilities:

```typescript
import { TIME_5M, CACHE_TTL_SHORT, minutesToMs } from '@shared/core/primitives';

setTimeout(() => {}, TIME_5M); // 5 minutes
cache.set(key, value, CACHE_TTL_SHORT); // 5 minutes TTL
const ms = minutesToMs(30); // 1800000
```

## Usage Guidelines

1. **Import from primitives**: Always import from `@shared/core/primitives` to ensure tree-shaking works correctly.

2. **Zero dependencies**: Never add imports from other shared/core modules to primitives files.

3. **Type safety first**: Use branded types and Result/Maybe for better type safety.

4. **Functional patterns**: Prefer Result/Maybe over throwing exceptions for expected errors.

5. **Documentation**: All public APIs should have comprehensive JSDoc comments.

## Testing

Primitives include comprehensive test coverage. Run tests with:

```bash
npm test -- primitives
```

Tests cover:
- Type safety and inference
- Edge cases and error conditions
- Performance characteristics
- Serialization/deserialization
- Tree-shaking compatibility

## Migration Guide

When migrating existing code to use primitives:

1. Replace `throw new Error()` with `return err('message')` for functional APIs
2. Use `Maybe<T>` instead of `T | null | undefined`
3. Apply branded types for domain-specific primitives
4. Extend `BaseError` for custom error types
5. Use time constants instead of magic numbers

## Performance Considerations

- Result/Maybe types have minimal runtime overhead
- BaseError includes caching for computed properties
- Constants are optimized for tree-shaking
- Branded types provide compile-time safety with zero runtime cost