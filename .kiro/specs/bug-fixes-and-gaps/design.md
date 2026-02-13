# Design: Bug Fixes and Implementation Gaps

**Spec ID**: bug-fixes-and-gaps  
**Created**: 2026-02-13  
**Status**: Draft

## Design Overview

This design addresses bugs and gaps identified in the full-stack-integration spec through systematic fixes organized by priority and impact.

## Architecture Decisions

### AD-1: Nullable Preferences Pattern

**Decision**: Make `User.preferences` nullable, matching the `User.profile` pattern

**Rationale**:
- Preferences are loaded separately from user data
- Empty object `{}` creates invalid state (missing required fields)
- Nullable pattern is already established for `profile`
- Cleaner separation of concerns

**Alternatives Considered**:
1. Initialize with defaults - Creates fake data
2. Use Partial type - Loses type safety
3. Make all fields optional - Inconsistent with database schema

**Implementation**:
```typescript
// Before
export interface User {
  preferences: UserPreferences; // ← Always required
}

// After
export interface User {
  preferences: UserPreferences | null; // ← Loaded separately
}
```

### AD-2: Type Safety Strategy

**Decision**: Eliminate `as any` through progressive enhancement

**Strategy**:
1. **Phase 1**: Add type guards for runtime validation
2. **Phase 2**: Define proper interfaces for augmented types
3. **Phase 3**: Use branded types for domain-specific values
4. **Phase 4**: Document remaining necessary assertions

**Rationale**:
- Incremental approach reduces risk
- Type guards provide runtime safety
- Interfaces document expected shapes
- Some `as any` may be necessary (documented)

### AD-3: Error Message Format

**Decision**: Standardize transformation error messages

**Format**:
```typescript
throw new Error(
  `Cannot transform ${sourceType} to ${targetType}: ${reason}. ` +
  `Field: ${fieldName}, Value: ${JSON.stringify(value)}`
);
```

**Rationale**:
- Consistent format aids debugging
- Includes all necessary context
- Machine-parseable for error tracking
- Human-readable for developers

## Component Designs

### 1. Transformation Layer Fixes

#### 1.1 User Preferences Fix

**Current State**:
```typescript
// shared/utils/transformers/entities/user.ts
export const userDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      // ...
      preferences: {}, // ← BUG: Empty object with missing required fields
    };
  },
};
```

**Fixed State**:
```typescript
export const userDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      // ...
      preferences: null, // ← FIX: Null indicates not loaded
    };
  },
};
```

**Impact**:
- User interface updated: `preferences: UserPreferences | null`
- API transformer updated to handle null
- Tests updated to expect null

#### 1.2 BillCommitteeAssignment Fix

**Analysis**:
```typescript
// Current domain model (needs verification)
export interface BillCommitteeAssignment {
  id: BillCommitteeAssignmentId;
  billId: BillId;
  committeeId: CommitteeId;
  assignmentDate: Date;
  status: CommitteeStatus;
  actionTaken?: string;
  reportDate?: Date;
  // Missing: createdAt, updatedAt
}
```

**Fix**:
```typescript
export interface BillCommitteeAssignment {
  id: BillCommitteeAssignmentId;
  billId: BillId;
  committeeId: CommitteeId;
  assignmentDate: Date;
  status: CommitteeStatus;
  actionTaken?: string;
  reportDate?: Date;
  createdAt: Date;  // ← ADD
  updatedAt: Date;  // ← ADD
}
```

**Transformer Update**:
```typescript
export const billCommitteeAssignmentDbToDomain: Transformer<...> = {
  transform(db: BillCommitteeAssignmentTable): BillCommitteeAssignment {
    return {
      // ...
      createdAt: db.created_at,  // ← ADD
      updatedAt: db.updated_at,  // ← ADD
    };
  },
  reverse(domain: BillCommitteeAssignment): BillCommitteeAssignmentTable {
    return {
      // ...
      created_at: domain.createdAt,  // ← PRESERVE
      updated_at: domain.updatedAt,  // ← PRESERVE
    };
  },
};
```

### 2. Type Safety Improvements

#### 2.1 Window Interface Extension

**Problem**:
```typescript
// shared/core/utils/browser-logger.ts
(window as any).browserLogger = childLogger; // ← Unsafe
```

**Solution**:
```typescript
// shared/types/globals.d.ts (new file)
import type { BrowserLogger } from '../core/utils/browser-logger';

declare global {
  interface Window {
    browserLogger?: BrowserLogger;
  }
}

// browser-logger.ts
window.browserLogger = childLogger; // ← Type-safe
```

#### 2.2 Request Interface Extension

**Problem**:
```typescript
// shared/core/middleware/auth/provider.ts
(req as any).user = user; // ← Unsafe
```

**Solution**:
```typescript
// shared/types/express.d.ts (new file)
import type { User } from '../types/domains/authentication/user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

// auth/provider.ts
req.user = user; // ← Type-safe
```

#### 2.3 Type Guards for ML Models

**Problem**:
```typescript
// shared/ml/models/influence-mapper.ts
return (mapping as any)[edge.type as keyof typeof mapping] || 'informational';
```

**Solution**:
```typescript
// Add type guard
function isValidEdgeType(type: string): type is keyof typeof mapping {
  return type in mapping;
}

// Use type guard
if (isValidEdgeType(edge.type)) {
  return mapping[edge.type];
}
return 'informational';
```

### 3. Integration Point Validation

#### 3.1 Complete Skipped Tests

**Test 1: Database → Server Transformation**
```typescript
it('should validate data transformations (database → server)', () => {
  fc.assert(
    fc.property(
      arbitraryUserTable,
      (dbUser: UserTable) => {
        // Transform to domain
        const domainUser = userDbToDomain.transform(dbUser);
        
        // Validate domain object
        const validation = validateUser(domainUser);
        
        // Should pass validation
        expect(validation.valid).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 2: Server → Database Transformation**
```typescript
it('should validate data transformations (server → database)', () => {
  fc.assert(
    fc.property(
      arbitraryUser,
      (user: User) => {
        // Transform to database
        const dbUser = userDbToDomain.reverse(user);
        
        // Validate database object
        const validation = validateUserTable(dbUser);
        
        // Should pass validation
        expect(validation.valid).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 3: Database Constraint Validation**
```typescript
it('should validate data at database constraints', () => {
  fc.assert(
    fc.property(
      arbitraryUserTable,
      async (dbUser: UserTable) => {
        // Attempt to insert into database
        const result = await db.insert(users).values(dbUser);
        
        // Should succeed (constraints satisfied)
        expect(result).toBeDefined();
      }
    ),
    { numRuns: 50 } // Fewer runs for DB operations
  );
});
```

### 4. Error Handling Improvements

#### 4.1 Standard Error Class

**Design**:
```typescript
// shared/utils/transformers/errors.ts (new file)
export class TransformationError extends Error {
  constructor(
    public readonly sourceType: string,
    public readonly targetType: string,
    public readonly fieldName: string,
    public readonly value: unknown,
    public readonly reason: string
  ) {
    super(
      `Cannot transform ${sourceType} to ${targetType}: ${reason}. ` +
      `Field: ${fieldName}, Value: ${JSON.stringify(value)}`
    );
    this.name = 'TransformationError';
  }
}
```

**Usage**:
```typescript
// In transformer
if (!isValidDate(date)) {
  throw new TransformationError(
    'Date',
    'string',
    'createdAt',
    date,
    'Invalid date object'
  );
}
```

### 5. Documentation

#### 5.1 Transformation Guarantees Document

**Location**: `shared/utils/transformers/GUARANTEES.md`

**Content**:
```markdown
# Transformation Guarantees

## Perfect Round-Trip Transformations

These transformations guarantee perfect round-trips (no data loss):

- User (DB ↔ Domain ↔ API ↔ Domain ↔ DB)
- Bill (DB ↔ Domain ↔ API ↔ Domain ↔ DB)
- UserProfile (DB ↔ Domain ↔ API ↔ Domain ↔ DB)
- UserPreferences (DB ↔ Domain ↔ API ↔ Domain ↔ DB)

## Lossy Transformations

These transformations intentionally lose data:

- User: `password_hash` not included in domain model (security)
- All entities: Audit fields (`created_by`, `updated_by`) may be null in reverse

## Regenerated Fields

These fields are regenerated in reverse transformations:

- None (all fields preserved after fixes)

## Nullable Fields

These fields may be null when not loaded:

- User.profile (loaded separately)
- User.preferences (loaded separately)
```

#### 5.2 Troubleshooting Guide

**Location**: `docs/guides/transformation-troubleshooting.md`

**Content**:
```markdown
# Transformation Troubleshooting Guide

## Common Issues

### "Cannot transform invalid date"

**Cause**: Date object is invalid (NaN)
**Solution**: Validate dates before transformation
**Example**:
\`\`\`typescript
if (!isValidDate(date)) {
  throw new Error('Invalid date');
}
\`\`\`

### "Cannot read property of undefined"

**Cause**: Missing required field in source object
**Solution**: Check that all required fields are present
**Example**:
\`\`\`typescript
if (!obj.requiredField) {
  throw new Error('Missing required field');
}
\`\`\`

### "Round-trip transformation changes data"

**Cause**: Field is regenerated instead of preserved
**Solution**: Update transformer to preserve field
**See**: GUARANTEES.md for expected behavior
```

## Implementation Plan

### Phase 1: Critical Fixes (Day 1)
1. Fix User preferences initialization
2. Fix BillCommitteeAssignment domain model
3. Run property tests to verify fixes

### Phase 2: Type Safety (Days 2-3)
1. Add Window and Request interface extensions
2. Add type guards for ML models
3. Fix government data integration
4. Fix recommendation repository

### Phase 3: Integration Tests (Day 3)
1. Implement skipped validation tests
2. Add edge case tests
3. Verify all tests pass

### Phase 4: Error Handling (Day 4)
1. Create TransformationError class
2. Update all transformers to use standard errors
3. Add error context

### Phase 5: Documentation (Day 4-5)
1. Create GUARANTEES.md
2. Create troubleshooting guide
3. Document remaining type assertions
4. Update README files

## Testing Strategy

### Unit Tests
- Test each fix in isolation
- Verify error messages
- Test edge cases

### Property Tests
- All 15 property tests must pass
- Run with 100 iterations each
- No failures allowed

### Integration Tests
- Test full transformation pipelines
- Test with real database
- Verify constraints

## Rollout Plan

1. **Development**: Implement fixes incrementally
2. **Testing**: Run full test suite after each phase
3. **Review**: Code review for each phase
4. **Merge**: Merge to main after all tests pass
5. **Deploy**: Deploy to staging, then production

## Success Metrics

- Property tests: 15/15 passing
- Type safety violations: 0
- Test coverage: >95%
- Documentation: Complete

