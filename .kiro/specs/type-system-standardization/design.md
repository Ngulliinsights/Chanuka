# Design Document

## Overview

This design establishes a unified, consistent, and strategic type system architecture across the entire codebase. Based on analysis of existing types, we've identified exemplary patterns in the loading system (`client/src/lib/types/loading.ts`) and schema architecture (`shared/schema/`) that demonstrate best practices. The design will standardize all types to adopt these strategic patterns while maintaining backward compatibility.

## Architecture

### Type System Hierarchy

```
shared/
├── types/
│   ├── core/                    # Foundation types used across all domains
│   │   ├── base.ts             # Base interfaces and utility types
│   │   ├── common.ts           # Common patterns and branded types
│   │   ├── validation.ts       # Type guards and validation utilities
│   │   └── errors.ts           # Standardized error types
│   ├── domains/                # Domain-specific type collections
│   │   ├── loading/            # Loading system types (exemplary pattern)
│   │   ├── safeguards/         # Security and moderation types
│   │   ├── authentication/     # Auth and user management types
│   │   ├── legislative/        # Bills, sponsors, committees types
│   │   └── monitoring/         # Analytics and performance types
│   ├── api/                    # API contract types
│   │   ├── requests/           # Request payload types
│   │   ├── responses/          # Response payload types
│   │   └── websocket/          # WebSocket message types
│   └── index.ts               # Centralized exports
```

### Strategic Type Patterns (Identified Best Practices)

#### 1. Comprehensive Interface Design (from loading.ts)
**Exemplary Pattern:**
```typescript
export interface LoadingOperation {
  // Identity - readonly for immutability
  readonly id: string;
  readonly type: LoadingType;
  readonly priority: LoadingPriority;

  // Timing - consistent number type for timestamps
  readonly startTime: number;
  readonly endTime?: number;
  readonly timeout?: number;

  // State management - discriminated unions
  readonly state: LoadingState;
  readonly error?: Error | string;
  readonly progress?: number;

  // Extensibility - readonly metadata
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

#### 2. Discriminated Union Actions (from loading.ts)
**Exemplary Pattern:**
```typescript
export type LoadingAction =
  | { type: 'START_OPERATION'; payload: StartOperationPayload }
  | { type: 'UPDATE_OPERATION'; payload: UpdateOperationPayload }
  | { type: 'COMPLETE_OPERATION'; payload: CompleteOperationPayload };
```

#### 3. Schema-First Database Types (from shared/schema/)
**Exemplary Pattern:**
```typescript
export const users = pgTable("users", {
  id: primaryKeyUuid(),
  email: emailField(),
  // ... other fields with proper constraints
}, (table) => ({
  // Optimized indexes
  emailUnique: unique("users_email_unique").on(table.email),
  // Performance indexes with conditions
  roleActiveIdx: index("idx_users_role_active")
    .on(table.role, table.is_active)
    .where(sql`${table.is_active} = true`),
}));
```

## Components and Interfaces

### 1. Core Type Foundation

#### Base Entity Interface
```typescript
/**
 * Base interface for all entities with audit fields
 * Provides consistent structure across all domain entities
 */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Extended base for entities requiring soft delete
 */
export interface SoftDeletableEntity extends BaseEntity {
  readonly deletedAt?: Date;
  readonly isDeleted: boolean;
}

/**
 * Base for entities with user tracking
 */
export interface UserTrackableEntity extends BaseEntity {
  readonly createdBy: string;
  readonly updatedBy: string;
}
```

#### Branded Types for Type Safety
```typescript
/**
 * Branded types prevent accidental type mixing
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type BillId = string & { readonly __brand: 'BillId' };
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * Utility to create branded types
 */
export function createBrandedId<T extends string>(
  value: string,
  brand: T
): string & { readonly __brand: T } {
  return value as string & { readonly __brand: T };
}
```

#### Result and Option Types
```typescript
/**
 * Result type for operations that can fail
 * Eliminates need for throwing exceptions
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Option type for nullable values
 */
export type Option<T> = T | null;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
```

### 2. Domain Type Standardization

#### Loading Domain (Already Exemplary)
The loading types demonstrate best practices:
- Comprehensive interfaces with readonly properties
- Discriminated unions for actions
- Proper error handling with custom error classes
- Performance-optimized with branded types where needed

#### Safeguards Domain (To Be Standardized)
```typescript
/**
 * Standardized moderation context following loading pattern
 */
export interface ModerationContext extends BaseEntity {
  readonly contentType: ContentType;
  readonly contentId: string;
  readonly authorId: UserId;
  readonly triggerType: ModerationTriggerType;
  readonly triggerConfidence?: number;
  readonly automatedSignals?: Readonly<Record<string, unknown>>;
  readonly priority: ModerationPriority;
}

/**
 * Moderation action discriminated union
 */
export type ModerationAction =
  | { type: 'QUEUE_FOR_REVIEW'; payload: QueuePayload }
  | { type: 'APPROVE_CONTENT'; payload: ApprovalPayload }
  | { type: 'REJECT_CONTENT'; payload: RejectionPayload };
```

### 3. API Type Contracts

#### Request/Response Pattern
```typescript
/**
 * Base API request interface
 */
export interface ApiRequest<T = unknown> {
  readonly requestId: string;
  readonly timestamp: number;
  readonly payload: T;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Base API response interface
 */
export interface ApiResponse<T = unknown> {
  readonly requestId: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly timestamp: number;
}

/**
 * Standardized API error
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly stack?: string;
}
```

### 4. Validation and Type Guards

#### Type Guard Pattern
```typescript
/**
 * Type guard factory for consistent validation
 */
export function createTypeGuard<T>(
  validator: (value: unknown) => value is T,
  errorMessage: string
) {
  return (value: unknown): value is T => {
    try {
      return validator(value);
    } catch {
      console.warn(`Type guard failed: ${errorMessage}`);
      return false;
    }
  };
}

/**
 * Runtime validation with Zod integration
 */
export interface ValidatedType<T> {
  readonly schema: z.ZodSchema<T>;
  readonly validate: (input: unknown) => Result<T, ValidationError>;
  readonly validateAsync: (input: unknown) => AsyncResult<T, ValidationError>;
  readonly typeGuard: (input: unknown) => input is T;
}
```

## Data Models

### 1. Unified Entity Models

#### User Entity (Standardized)
```typescript
export interface User extends UserTrackableEntity {
  readonly email: string;
  readonly role: UserRole;
  readonly profile: UserProfile;
  readonly preferences: UserPreferences;
  readonly verification: VerificationStatus;
}

export interface UserProfile {
  readonly displayName: string;
  readonly bio?: string;
  readonly location?: GeographicLocation;
  readonly anonymityLevel: AnonymityLevel;
}
```

#### Legislative Entity (Standardized)
```typescript
export interface Bill extends BaseEntity {
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly status: BillStatus;
  readonly chamber: Chamber;
  readonly sponsor: Sponsor;
  readonly timeline: BillTimeline;
  readonly engagement: BillEngagementMetrics;
}
```

### 2. State Management Models

#### Redux State Pattern
```typescript
/**
 * Standardized slice state interface
 */
export interface SliceState<T> {
  readonly data: T | null;
  readonly loading: LoadingState;
  readonly error: string | null;
  readonly lastUpdated: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Async thunk result type
 */
export type ThunkResult<T> = AsyncResult<T, string>;
```

## Error Handling

### Standardized Error Hierarchy

```typescript
/**
 * Base application error
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly severity: ErrorSeverity;
  
  constructor(
    message: string,
    public readonly context?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'medium' as const;
  
  constructor(
    message: string,
    public readonly field?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends AppError {
  readonly code = 'BUSINESS_LOGIC_ERROR';
  readonly severity = 'high' as const;
}
```

## Testing Strategy

### 1. Type Testing
```typescript
/**
 * Type-level tests using TypeScript's type system
 */
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;
type AssertTrue<T extends true> = T;

// Example type tests
type TestUserIdBranding = AssertTrue<
  AssertEqual<UserId, string & { readonly __brand: 'UserId' }>
>;
```

### 2. Runtime Validation Testing
```typescript
describe('Type Validation', () => {
  it('should validate user entity correctly', () => {
    const validUser = createUser({ email: 'test@example.com' });
    expect(isUser(validUser)).toBe(true);
    
    const invalidUser = { email: 123 };
    expect(isUser(invalidUser)).toBe(false);
  });
});
```

### 3. Integration Testing
```typescript
/**
 * Test type compatibility across layers
 */
describe('Cross-Layer Type Compatibility', () => {
  it('should maintain type safety from API to UI', async () => {
    const apiResponse = await fetchUser('user-123');
    expect(apiResponse.success).toBe(true);
    
    if (apiResponse.success) {
      const user = apiResponse.data;
      expect(isUser(user)).toBe(true);
      
      // Should work with UI components
      render(<UserProfile user={user} />);
    }
  });
});
```

## Migration Strategy

### Phase 1: Core Foundation
1. Create base type infrastructure
2. Establish validation utilities
3. Set up error handling hierarchy

### Phase 2: Domain Standardization
1. Migrate safeguards types to new patterns
2. Standardize authentication types
3. Update legislative domain types

### Phase 3: API Integration
1. Standardize request/response types
2. Update WebSocket message types
3. Integrate with existing validation middleware

### Phase 4: Client Integration
1. Update Redux state types
2. Standardize component prop types
3. Integrate with existing hooks and contexts

## Performance Considerations

### 1. Type Compilation Optimization
- Use conditional types sparingly to avoid compilation overhead
- Prefer union types over complex mapped types
- Implement proper type caching for frequently used types

### 2. Runtime Performance
- Minimize runtime type checking in hot paths
- Use branded types for compile-time safety without runtime cost
- Implement efficient validation caching

### 3. Bundle Size Impact
- Tree-shakeable type exports
- Separate development-only types from production types
- Optimize type utility functions

## Tooling Integration

### 1. ESLint Rules
```typescript
// Custom ESLint rules for type consistency
export const typeConsistencyRules = {
  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/explicit-function-return-type': 'error',
};
```

### 2. Code Generation
- Automatic type generation from OpenAPI specs
- Database schema to TypeScript type generation
- Validation schema generation from types

### 3. Documentation Generation
- Automatic API documentation from types
- Type relationship diagrams
- Usage example generation
