# Result Monad Guide

This guide explains when and how to use the Result monad for functional error handling.

## Overview

The unified error handling system provides two patterns:

1. **Imperative Pattern (try/catch)**: Traditional error handling
2. **Functional Pattern (Result monad)**: Railway-oriented programming

Both patterns are valid and have their use cases.

## When to Use Each Pattern

### Use Imperative Pattern (try/catch) When:

- Working with existing code that uses try/catch
- Error handling is straightforward
- You need to throw errors up the call stack
- Team is more familiar with imperative style

### Use Functional Pattern (Result) When:

- Building new features from scratch
- Chaining multiple operations that can fail
- You want explicit error handling at each step
- Avoiding exceptions for control flow
- Building composable, testable code

## Result Monad Basics

### Creating Results

```typescript
import { ok, err, createNetworkError } from '@/infrastructure/error';

// Success result
const successResult = ok({ id: 1, name: 'John' });

// Failure result
const failureResult = err(createNetworkError('Request failed', 500));
```

### Checking Results

```typescript
import { isOk, isErr } from '@/infrastructure/error';

if (isOk(result)) {
  console.log('Success:', result.value);
} else {
  console.log('Error:', result.error);
}
```

### Unwrapping Results

```typescript
import { unwrap, unwrapOr, unwrapOrElse } from '@/infrastructure/error';

// Unwrap or throw
const value = unwrap(result); // Throws if Err

// Unwrap or use default
const value = unwrapOr(result, defaultValue);

// Unwrap or compute default
const value = unwrapOrElse(result, (error) => computeDefault(error));
```

## Common Patterns

### Pattern 1: Wrapping Async Operations

```typescript
import { safeAsync, createNetworkError } from '@/infrastructure/error';

async function fetchUser(id: string): Promise<ClientResult<User>> {
  return safeAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    (error) => createNetworkError(error.message, 0, {
      component: 'UserService',
      operation: 'fetchUser',
      userId: id,
    })
  );
}

// Usage
const result = await fetchUser('123');

if (isOk(result)) {
  console.log('User:', result.value);
} else {
  console.error('Error:', result.error);
}
```

### Pattern 2: Chaining Operations

```typescript
import { andThen, map, createValidationError } from '@/infrastructure/error';

async function processUser(id: string): Promise<ClientResult<ProcessedUser>> {
  // Fetch user
  const userResult = await fetchUser(id);
  
  // Validate user
  const validatedResult = andThen(userResult, (user) => {
    if (!user.email) {
      return err(createValidationError(
        [{ field: 'email', message: 'Email is required' }]
      ));
    }
    return ok(user);
  });
  
  // Transform user
  const processedResult = map(validatedResult, (user) => ({
    ...user,
    displayName: `${user.firstName} ${user.lastName}`,
  }));
  
  return processedResult;
}
```

### Pattern 3: Combining Multiple Results

```typescript
import { combine, combineWith } from '@/infrastructure/error';

async function fetchUserData(id: string): Promise<ClientResult<UserData>> {
  const [userResult, postsResult, commentsResult] = await Promise.all([
    fetchUser(id),
    fetchUserPosts(id),
    fetchUserComments(id),
  ]);
  
  // Combine results - returns first error if any fail
  const combinedResult = combineWith(userResult, postsResult, commentsResult);
  
  return map(combinedResult, ([user, posts, comments]) => ({
    user,
    posts,
    comments,
  }));
}
```

### Pattern 4: Pattern Matching

```typescript
import { match } from '@/infrastructure/error';

const message = match(result, {
  ok: (value) => `Success: ${value.name}`,
  err: (error) => `Error: ${error.message}`,
});

console.log(message);
```

### Pattern 5: Side Effects with Tap

```typescript
import { tap, tapError, handleUnifiedError } from '@/infrastructure/error';

const result = await fetchUser('123');

// Log success
const tappedResult = tap(result, (user) => {
  console.log('Fetched user:', user.name);
});

// Handle errors
const finalResult = tapError(tappedResult, (error) => {
  handleUnifiedError(error);
});
```

### Pattern 6: Converting to/from Promises

```typescript
import { fromPromise, toPromise, createNetworkError } from '@/infrastructure/error';

// Convert Promise to Result
const result = await fromPromise(
  fetch('/api/data').then(r => r.json()),
  (error) => createNetworkError(error.message, 0)
);

// Convert Result to Promise (for integration with Promise-based code)
const promise = toPromise(result);
```

## Complete Example: User Registration

```typescript
import {
  ClientResult,
  ok,
  err,
  safeAsync,
  andThen,
  map,
  createValidationError,
  createNetworkError,
  handleUnifiedError,
} from '@/infrastructure/error';

interface RegistrationData {
  email: string;
  password: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

// Step 1: Validate input
function validateRegistration(data: RegistrationData): ClientResult<RegistrationData> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!data.email || !data.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email' });
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  
  if (!data.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  
  if (errors.length > 0) {
    return err(createValidationError(errors, {
      component: 'RegistrationForm',
      operation: 'validateInput',
    }));
  }
  
  return ok(data);
}

// Step 2: Check if email exists
async function checkEmailAvailable(email: string): Promise<ClientResult<string>> {
  return safeAsync(
    async () => {
      const response = await fetch(`/api/users/check-email?email=${email}`);
      const data = await response.json();
      
      if (data.exists) {
        throw new Error('Email already exists');
      }
      
      return email;
    },
    (error) => createValidationError(
      [{ field: 'email', message: error.message }],
      { component: 'RegistrationService', operation: 'checkEmail' }
    )
  );
}

// Step 3: Create user
async function createUser(data: RegistrationData): Promise<ClientResult<User>> {
  return safeAsync(
    async () => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create user');
      }
      
      return response.json();
    },
    (error) => createNetworkError(error.message, 500, {
      component: 'RegistrationService',
      operation: 'createUser',
    })
  );
}

// Step 4: Send welcome email
async function sendWelcomeEmail(user: User): Promise<ClientResult<User>> {
  return safeAsync(
    async () => {
      await fetch('/api/emails/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      return user;
    },
    (error) => createNetworkError(error.message, 500, {
      component: 'EmailService',
      operation: 'sendWelcome',
      userId: user.id,
    })
  );
}

// Complete registration flow
export async function registerUser(data: RegistrationData): Promise<ClientResult<User>> {
  // Validate input
  const validatedData = validateRegistration(data);
  if (isErr(validatedData)) {
    handleUnifiedError(validatedData.error);
    return validatedData;
  }
  
  // Check email availability
  const emailCheck = await checkEmailAvailable(data.email);
  if (isErr(emailCheck)) {
    handleUnifiedError(emailCheck.error);
    return emailCheck;
  }
  
  // Create user
  const userResult = await createUser(data);
  if (isErr(userResult)) {
    handleUnifiedError(userResult.error);
    return userResult;
  }
  
  // Send welcome email (non-critical, don't fail registration)
  const emailResult = await sendWelcomeEmail(userResult.value);
  if (isErr(emailResult)) {
    // Log error but don't fail registration
    handleUnifiedError(emailResult.error);
  }
  
  return userResult;
}

// Alternative: Using andThen for chaining
export async function registerUserChained(data: RegistrationData): Promise<ClientResult<User>> {
  const validatedData = validateRegistration(data);
  
  const emailChecked = await andThen(validatedData, async (data) => {
    const result = await checkEmailAvailable(data.email);
    return map(result, () => data);
  });
  
  const userCreated = await andThen(emailChecked, createUser);
  
  // Send welcome email (don't fail on error)
  if (isOk(userCreated)) {
    const emailResult = await sendWelcomeEmail(userCreated.value);
    if (isErr(emailResult)) {
      handleUnifiedError(emailResult.error);
    }
  }
  
  return userCreated;
}
```

## Usage in React Components

```typescript
import { useState } from 'react';
import { isOk, isErr } from '@/infrastructure/error';
import { registerUser } from './registration-service';

function RegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (data: RegistrationData) => {
    setLoading(true);
    setError(null);
    
    const result = await registerUser(data);
    
    if (isOk(result)) {
      // Success
      console.log('User registered:', result.value);
      // Redirect or show success message
    } else {
      // Error
      setError(result.error.message);
    }
    
    setLoading(false);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
    </form>
  );
}
```

## Comparison: Imperative vs Functional

### Imperative (try/catch)

```typescript
async function fetchUserData(id: string): Promise<UserData> {
  try {
    const user = await fetchUser(id);
    
    if (!user.email) {
      throw new Error('Email is required');
    }
    
    const posts = await fetchUserPosts(id);
    const comments = await fetchUserComments(id);
    
    return { user, posts, comments };
  } catch (error) {
    const clientError = errorToClientError(error as Error);
    handleUnifiedError(clientError);
    throw clientError;
  }
}
```

### Functional (Result)

```typescript
async function fetchUserData(id: string): Promise<ClientResult<UserData>> {
  const userResult = await fetchUser(id);
  
  const validatedResult = andThen(userResult, (user) => {
    if (!user.email) {
      return err(createValidationError([{ field: 'email', message: 'Required' }]));
    }
    return ok(user);
  });
  
  const [postsResult, commentsResult] = await Promise.all([
    fetchUserPosts(id),
    fetchUserComments(id),
  ]);
  
  return combineWith(validatedResult, postsResult, commentsResult)
    .then(([user, posts, comments]) => ({ user, posts, comments }));
}
```

## Best Practices

### 1. Be Consistent

Choose one pattern per module or feature. Don't mix patterns unnecessarily.

### 2. Handle Errors Explicitly

Always handle errors, whether using try/catch or Result.

```typescript
// ❌ Bad: Ignoring errors
const result = await fetchUser('123');
const user = result.value; // Might be undefined!

// ✅ Good: Explicit handling
const result = await fetchUser('123');
if (isOk(result)) {
  const user = result.value;
} else {
  handleUnifiedError(result.error);
}
```

### 3. Use Type Guards

Always use `isOk` and `isErr` for type safety.

```typescript
// ✅ Good: Type-safe
if (isOk(result)) {
  // TypeScript knows result.value exists
  console.log(result.value);
}
```

### 4. Document Error Cases

Document what errors a function can return.

```typescript
/**
 * Fetch user by ID
 * 
 * @returns Ok with User, or Err with:
 * - NetworkError if request fails
 * - NotFoundError if user doesn't exist
 * - ValidationError if ID is invalid
 */
async function fetchUser(id: string): Promise<ClientResult<User>> {
  // ...
}
```

### 5. Use Tap for Side Effects

Use `tap` and `tapError` for side effects without changing the Result.

```typescript
const result = await fetchUser('123')
  .then(r => tap(r, user => console.log('Fetched:', user.name)))
  .then(r => tapError(r, error => handleUnifiedError(error)));
```

## Summary

| Aspect | Imperative (try/catch) | Functional (Result) |
|--------|------------------------|---------------------|
| Error Handling | Implicit (exceptions) | Explicit (Result type) |
| Composability | Limited | High |
| Type Safety | Good | Excellent |
| Learning Curve | Low | Medium |
| Best For | Simple operations | Complex workflows |

Choose the pattern that best fits your use case and team preferences!
