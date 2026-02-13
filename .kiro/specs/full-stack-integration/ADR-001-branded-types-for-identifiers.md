# ADR-001: Branded Types for Identifiers

**Status**: Accepted

**Date**: 2024

**Context**: The Chanuka Platform uses various entity identifiers (UserId, BillId, CommitteeId, etc.) throughout the codebase. These identifiers are fundamentally strings or UUIDs, but they represent different conceptual entities. Without type-level distinction, it's possible to accidentally pass a UserId where a BillId is expected, leading to runtime errors that are difficult to debug.

TypeScript's structural type system treats all string types as interchangeable. This means:
```typescript
function getBill(billId: string) { /* ... */ }
function getUser(userId: string) { /* ... */ }

const userId = "123e4567-e89b-12d3-a456-426614174000";
getBill(userId); // No compile error, but wrong at runtime!
```

The platform has experienced bugs where identifiers were mixed up, particularly during refactoring or when multiple entities are handled in the same function. These bugs are caught late (at runtime or in testing) rather than at compile time.

**Decision**: We will use branded types (also called nominal types or opaque types) for all entity identifiers. A branded type adds a phantom property to distinguish otherwise identical primitive types:

```typescript
export type UserId = string & { readonly __brand: 'UserId' };
export type BillId = string & { readonly __brand: 'BillId' };
export type CommitteeId = string & { readonly __brand: 'CommitteeId' };

// Helper functions for creating branded types
export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toBillId(id: string): BillId {
  return id as BillId;
}
```

With branded types, the compiler prevents identifier mixing:
```typescript
function getBill(billId: BillId) { /* ... */ }
function getUser(userId: UserId) { /* ... */ }

const userId = toUserId("123e4567-e89b-12d3-a456-426614174000");
getBill(userId); // Compile error: Type 'UserId' is not assignable to type 'BillId'
```

All entity identifiers will be defined as branded types in `shared/types/core/branded.ts`, ensuring consistency across all layers (client, server, database).

**Consequences**:

**Positive**:
- **Compile-time safety**: Identifier mixing is caught at compile time rather than runtime
- **Self-documenting code**: Function signatures clearly indicate which entity type they operate on
- **Refactoring confidence**: Renaming or restructuring code is safer because the compiler enforces correct identifier usage
- **Reduced debugging time**: Entire class of bugs (wrong identifier type) is eliminated
- **Better IDE support**: Autocomplete and type hints are more accurate and helpful

**Negative**:
- **Conversion overhead**: Requires explicit conversion from raw strings to branded types using helper functions
- **Learning curve**: Developers unfamiliar with branded types need to understand the pattern
- **Type assertion required**: Creating branded types requires type assertions (using `as`), which bypasses some type safety
- **Interop complexity**: When interfacing with external libraries or APIs that expect plain strings, conversion is needed

**Mitigation**:
- Provide clear documentation and examples of branded type usage
- Create helper functions (`toUserId`, `toBillId`, etc.) to standardize conversion
- Use validation functions that both validate and brand in one step:
  ```typescript
  export function validateUserId(id: string): UserId {
    if (!isValidUUID(id)) {
      throw new ValidationError('Invalid user ID format');
    }
    return id as UserId;
  }
  ```
- Document the pattern in onboarding materials and code review guidelines

**Alternatives Considered**:
1. **Plain string types**: Rejected because it provides no type safety
2. **String literal unions**: Rejected because it doesn't scale (can't enumerate all possible IDs)
3. **Class-based wrappers**: Rejected because it adds runtime overhead and complexity
4. **Symbol-based branding**: Rejected because it adds runtime overhead and complicates serialization

**Related Requirements**: Requirement 1.4 (Type System SHALL use branded types for all entity identifiers)

**Related ADRs**: ADR-002 (Single Source of Truth), ADR-003 (Zod for Validation)
