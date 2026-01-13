/**
 * TYPE-LEVEL TESTING EXAMPLES
 *
 * Demonstrates usage of the type-level testing utilities
 */

import {
  TypeEquals,
  AssertTypeEquals,
  TypeHasProperty,
  AssertTypeHasProperty,
  TypeExtends,
  AssertTypeExtends,
} from '../type-level';

// ============================================================================
// Example 1: Basic Type Equality Testing
// ============================================================================

type User = {
  id: string;
  name: string;
  age: number;
};

type ExpectedUser = {
  id: string;
  name: string;
  age: number;
};

// Test that User type equals ExpectedUser type
type UserTypeEqualityTest = TypeEquals<User, ExpectedUser>; // Should be true

// Assertion version (will fail compilation if false)
type UserTypeAssertion = AssertTypeEquals<User, ExpectedUser>; // Should compile successfully

// ============================================================================
// Example 2: Type Property Testing
// ============================================================================

type UserHasIdProperty = TypeHasProperty<User, 'id'>; // Should be true
type UserHasEmailProperty = TypeHasProperty<User, 'email'>; // Should be false

// Assertion version
type UserIdAssertion = AssertTypeHasProperty<User, 'id'>; // Should compile successfully
type UserEmailAssertion = AssertTypeHasProperty<User, 'email'>; // Should fail compilation

// ============================================================================
// Example 3: Type Extension Testing
// ============================================================================

type AdminUser = User & {
  role: 'admin';
  permissions: string[];
};

type AdminExtendsUser = TypeExtends<AdminUser, User>; // Should be true
type UserExtendsAdmin = TypeExtends<User, AdminUser>; // Should be false

// Assertion version
type AdminExtendsUserAssertion = AssertTypeExtends<AdminUser, User>; // Should compile successfully

// ============================================================================
// Example 4: Complex Type Testing
// ============================================================================

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

type LoadingOperation = {
  id: string;
  state: LoadingState;
  progress?: number;
};

type ExpectedLoadingOperation = {
  id: string;
  state: LoadingState;
  progress?: number;
};

// Test complex type equality
type LoadingOperationTest = TypeEquals<LoadingOperation, ExpectedLoadingOperation>; // Should be true

// ============================================================================
// Example 5: Type Safety Testing
// ============================================================================

type SafeAssignmentTest = TypeEquals<LoadingState, 'idle' | 'loading' | 'success' | 'error'>; // Should be true

type UnsafeAssignmentTest = TypeEquals<LoadingState, string>; // Should be false

// ============================================================================
// Example 6: Type Transformation Testing
// ============================================================================

type OptionalUser = Partial<User>;

type ExpectedOptionalUser = {
  id?: string;
  name?: string;
  age?: number;
};

type OptionalUserTest = TypeEquals<OptionalUser, ExpectedOptionalUser>; // Should be true

// ============================================================================
// Example 7: Generic Type Testing
// ============================================================================

type ApiResponse<T> = {
  data: T;
  status: number;
  success: boolean;
};

type UserApiResponse = ApiResponse<User>;

type ExpectedUserApiResponse = {
  data: User;
  status: number;
  success: boolean;
};

type UserApiResponseTest = TypeEquals<UserApiResponse, ExpectedUserApiResponse>; // Should be true

// ============================================================================
// Example 8: Union Type Testing
// ============================================================================

type Result<T, E> = { success: true; data: T } | { success: false; error: E };

type StringResult = Result<string, Error>;

type ExpectedStringResult =
  | { success: true; data: string }
  | { success: false; error: Error };

type StringResultTest = TypeEquals<StringResult, ExpectedStringResult>; // Should be true

// ============================================================================
// Example 9: Conditional Type Testing
// ============================================================================

type IsString<T> = T extends string ? true : false;

type TestString = IsString<'hello'>; // Should be true
type TestNumber = IsString<42>; // Should be false

// ============================================================================
// Example 10: Type Constraint Testing
// ============================================================================

type ConstrainedType<T extends string | number> = T;

type ValidConstrainedType = ConstrainedType<'test'>; // Should be 'test'
type InvalidConstrainedType = ConstrainedType<boolean>; // Should fail compilation

// ============================================================================
// Usage Notes
// ============================================================================

/**
 * These examples demonstrate how to use the type-level testing utilities:
 *
 * 1. Use TypeEquals for basic type equality checks
 * 2. Use AssertTypeEquals for compile-time assertions
 * 3. Use TypeHasProperty to check for property existence
 * 4. Use TypeExtends to check type inheritance/compatibility
 * 5. Combine these utilities for comprehensive type testing
 *
 * The assertion types (AssertTypeEquals, etc.) will cause compilation errors
 * if the type conditions are not met, providing immediate feedback during development.
 */