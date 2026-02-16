# Phase 4-7 Migration Implementation Guide

## Overview

This guide provides step-by-step implementation instructions for completing the remaining phases of the type system standardization initiative (Tasks 14-19).

---

## Task 14: Server Type Migration

### Objective
Migrate all server-side types (middleware, services, controllers) to use the standardized type system.

### Current State Analysis

**Server Type Locations**:
- `server/ai/` - AI service middleware and business logic
- `server/auth/` - Authentication middleware and services
- `server/communication/` - WebSocket and messaging types
- `server/community/` - Community features types
- `server/fraud-detection/` - Fraud detection system types

### Implementation Steps

#### Step 1: Middleware Type Standardization

**File**: `server/middleware/` directory

```typescript
// Before: Generic middleware types
export interface MiddlewareContext {
  req: Request;
  res: Response;
  next: NextFunction;
  [key: string]: any;
}

// After: Standardized with Result type
export interface MiddlewareContext {
  readonly req: Request;
  readonly res: Response;
  readonly next: NextFunction;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export type MiddlewareResult<T = void> = Result<T, MiddlewareError>;
```

#### Step 2: Service Layer Type Updates

**Pattern to Implement**:
```typescript
// All services should follow this pattern
import type { AsyncResult } from '@shared/types/core';
import type { AppError } from '@shared/types/errors';

export interface UserService {
  getUser(id: UserId): AsyncResult<User, UserNotFoundError>;
  updateUser(id: UserId, data: Partial<User>): AsyncResult<User, ValidationError | UserNotFoundError>;
  deleteUser(id: UserId): AsyncResult<void, UserNotFoundError>;
}
```

#### Step 3: Controller Type Updates

**Pattern to Implement**:
```typescript
// Controllers should use standardized ApiResponse
import type { ApiResponse, ApiRequest } from '@shared/types/api';

export async function getUserController(
  req: ApiRequest<{ id: string }>,
): Promise<ApiResponse<User>> {
  // Implementation with proper type safety
}
```

### Validation Criteria

- [ ] All middleware types extend BaseContext
- [ ] All services use Result/AsyncResult for error handling
- [ ] All controllers use ApiRequest/ApiResponse patterns
- [ ] No direct throwing of errors (use Result types)
- [ ] All types have proper JSDoc documentation

---

## Task 15: Client Type Migration

### Objective
Complete remaining client component and hook type standardization.

### Current State Analysis

**Client Type Locations**:
- `client/src/features/*/ui/` - Component prop types
- `client/src/hooks/` - Custom hook return types
- `client/src/contexts/` - React Context types
- `client/src/store/` - Redux slice state types

### Implementation Steps

#### Step 1: Component Prop Type Standardization

**Pattern to Implement**:
```typescript
// Component props should extend DashboardComponentProps
import type { DashboardComponentProps } from '@client/lib/types/components/dashboard';

export interface UserProfileCardProps extends DashboardComponentProps {
  readonly user: User;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  onEdit,
  className,
  children,
  ...rest
}) => {
  // Implementation
};
```

#### Step 2: Hook Type Standardization

**Pattern to Implement**:
```typescript
// All hooks should follow this pattern
export interface UseUserReturn {
  readonly user: User | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

export function useUser(id: UserId): UseUserReturn {
  // Implementation
}
```

#### Step 3: Context Type Standardization

**Pattern to Implement**:
```typescript
// Context types should use discriminated unions for state
export interface DashboardContextState {
  readonly data: DashboardData | null;
  readonly loading: LoadingState;
  readonly error: Error | null;
}

export interface DashboardContextActions {
  setData: (data: DashboardData) => void;
  setLoading: (loading: LoadingState) => void;
  setError: (error: Error | null) => void;
}

export interface DashboardContextType {
  readonly state: DashboardContextState;
  readonly actions: DashboardContextActions;
}
```

### Validation Criteria

- [ ] All component props extend appropriate base interfaces
- [ ] All hooks have standardized return types
- [ ] All contexts use discriminated unions for state
- [ ] All types import from shared type system
- [ ] No duplicate type definitions

---

## Task 16: Schema Integration

### Objective
Integrate Drizzle ORM schema with standardized type system.

### Current State Analysis

**Schema Locations**:
- `server/infrastructure/database/schemas/` - Drizzle ORM schemas
- `shared/schema/` - Core database schema definitions

### Implementation Steps

#### Step 1: Schema-to-Type Alignment

**Pattern to Implement**:
```typescript
// In server/infrastructure/database/schemas/user.schema.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  roleId: uuid('role_id').references(() => roles.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

// Extract into TypeScript type
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

#### Step 2: Branded ID Integration

**Pattern to Implement**:
```typescript
// In shared/types/core/branded-ids.ts
export type UserId = string & { readonly __brand: 'UserId' };

// Helper function
export function createUserId(value: string): UserId {
  return value as UserId;
}

// In database queries
export async function getUserById(id: UserId): Promise<User | null> {
  const result = await db.query.users.findFirst({
    where: (users) => eq(users.id, id),
  });
  return result || null;
}
```

#### Step 3: Schema Validation Integration

**Pattern to Implement**:
```typescript
// In server/infrastructure/database/validators/
import { z } from 'zod';
import type { User } from '@server/infrastructure/schema';

export const UserSchema = z.object({
  id: z.string().uuid().brand<'UserId'>(),
  email: z.string().email(),
  roleId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodSchema<User>;

export function validateUser(data: unknown): Result<User, ValidationError> {
  return UserSchema.parseAsync(data);
}
```

### Validation Criteria

- [ ] All schema types have corresponding TypeScript types
- [ ] Branded ID types used throughout database code
- [ ] Validation schemas created for all entities
- [ ] Type generation from schema working correctly
- [ ] Database queries maintain type safety

---

## Task 17: Migration Utilities

### Objective
Create tools for automated type migration and deprecation handling.

### Implementation Steps

#### Step 1: Type Migration Script

**Create File**: `scripts/migrate-types.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

interface MigrationRule {
  readonly pattern: RegExp;
  readonly replacement: string;
  readonly description: string;
  readonly files: string[];
}

const MIGRATION_RULES: readonly MigrationRule[] = [
  {
    pattern: /type DashboardState =/g,
    replacement: 'type DashboardState = DashboardData;',
    description: 'Consolidate duplicate DashboardState definition',
    files: ['client/src/lib/types/**/*.ts'],
  },
  {
    pattern: /WidgetTabsProps(?!Layout)/g,
    replacement: 'WidgetTabsPropsLayout',
    description: 'Rename WidgetTabsProps to avoid collisions',
    files: ['client/src/**/*.ts(x)'],
  },
];

export async function runMigrations(): Promise<void> {
  for (const rule of MIGRATION_RULES) {
    console.log(`Applying: ${rule.description}`);
    // Implementation
  }
}
```

#### Step 2: Deprecation Warning System

**Create File**: `shared/types/deprecation.ts`

```typescript
export interface DeprecationInfo {
  readonly since: string;
  readonly replacement: string;
  readonly reason: string;
  readonly removalDate: string;
}

const DEPRECATED_TYPES: Record<string, DeprecationInfo> = {
  'DashboardState': {
    since: '2.0.0',
    replacement: 'DashboardData',
    reason: 'Consolidation of duplicate types',
    removalDate: '2.2.0',
  },
};

export function deprecation(name: string): void {
  const info = DEPRECATED_TYPES[name];
  if (info) {
    console.warn(
      `[DEPRECATED] ${name} is deprecated since ${info.since}. ` +
      `Use ${info.replacement} instead. ` +
      `This will be removed in ${info.removalDate}.`
    );
  }
}
```

#### Step 3: Compatibility Check Script

**Create File**: `scripts/check-type-compatibility.ts`

```typescript
import { execSync } from 'child_process';

export async function checkTypeCompatibility(): Promise<boolean> {
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✓ All types compatible');
    return true;
  } catch (error) {
    console.error('✗ Type compatibility issues found');
    return false;
  }
}

export async function validateImports(): Promise<void> {
  // Check that all imports are from standardized locations
  console.log('Validating import patterns...');
}
```

### Validation Criteria

- [ ] Migration script runs without errors
- [ ] Deprecation warnings appear in console
- [ ] Compatibility checker identifies issues
- [ ] Migration guide is generated
- [ ] Breaking changes documented

---

## Task 18: Performance Optimization

### Objective
Optimize type compilation and runtime performance.

### Current State

**Already Optimized**:
- Type definitions are tree-shakeable
- Discriminated unions prevent union bloat
- Branded types have zero runtime cost
- Type guards are simple boolean checks

### Implementation Steps

#### Step 1: Compilation Performance Analysis

**Create File**: `scripts/analyze-type-perf.ts`

```typescript
import { performance } from 'perf_hooks';

export async function analyzeTypeCompilation(): Promise<void> {
  const start = performance.now();
  
  // Run TypeScript compiler
  execSync('npx tsc --noEmit --diagnostics');
  
  const duration = performance.now() - start;
  console.log(`Type compilation: ${duration}ms`);
  
  if (duration > 30000) {
    console.warn('⚠ Compilation time exceeds 30s, consider optimization');
  }
}
```

#### Step 2: Type Validation Caching

**Create File**: `shared/types/validation-cache.ts`

```typescript
interface CacheEntry<T> {
  readonly result: Result<T>;
  readonly timestamp: number;
  readonly ttl: number;
}

export class ValidationCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  validate<T>(
    key: string,
    validator: () => Result<T>,
    ttl: number = 60000
  ): Result<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result as Result<T>;
    }
    
    const result = validator();
    this.cache.set(key, { result, timestamp: Date.now(), ttl });
    return result;
  }
}
```

#### Step 3: Bundle Size Monitoring

**Create File**: `scripts/check-bundle-size.ts`

```typescript
import bundleAnalyzer from 'webpack-bundle-analyzer';

export async function analyzeBundleSize(): Promise<void> {
  console.log('Analyzing bundle impact of type changes...');
  
  // Types should add minimal bundle size
  // Discriminated unions: ~500 bytes
  // Type guards: ~200 bytes per type
  // Branded types: 0 bytes (compile-time only)
}
```

### Validation Criteria

- [ ] Type compilation < 30 seconds
- [ ] Validation cache working correctly
- [ ] Bundle size delta < 5% for type changes
- [ ] Runtime validation caching effective
- [ ] Type guards performing efficiently

---

## Task 19: Final Integration Testing

### Objective
Comprehensive validation of the entire type system across all layers.

### Testing Strategy

#### Test Category 1: Type Compatibility

**File**: `tests/type-compatibility.test.ts`

```typescript
describe('Type System Compatibility', () => {
  test('dashboard types are properly exported', () => {
    expect(DashboardComponentProps).toBeDefined();
    expect(WidgetLayoutProps).toBeDefined();
  });
  
  test('discriminated unions narrow correctly', () => {
    const props: WidgetLayoutProps = {
      layout: 'grid',
      columns: 3,
      widgets: [],
    } as WidgetGridProps;
    
    if (isGridLayout(props)) {
      expect(props.columns).toBe(3);
    }
  });
  
  test('type guards return correct results', () => {
    const gridProps = { layout: 'grid' };
    expect(isGridLayout(gridProps as WidgetLayoutProps)).toBe(true);
    expect(isStackLayout(gridProps as WidgetLayoutProps)).toBe(false);
  });
});
```

#### Test Category 2: Cross-Layer Integration

**File**: `tests/cross-layer-integration.test.ts`

```typescript
describe('Cross-Layer Type Integration', () => {
  test('API types work with database types', async () => {
    const user = await createUser({ email: 'test@example.com' });
    expect(isUser(user)).toBe(true);
    
    const apiResponse: ApiResponse<User> = {
      success: true,
      data: user,
    };
    
    expect(apiResponse.data.id).toBeDefined();
  });
  
  test('Redux state maintains type safety', () => {
    const initialState: DashboardSliceState = {
      data: null,
      loading: 'idle',
      error: null,
    };
    
    expect(initialState.loading === 'idle').toBe(true);
  });
});
```

#### Test Category 3: Validation Integration

**File**: `tests/validation-integration.test.ts`

```typescript
describe('Type Validation Integration', () => {
  test('runtime validation catches invalid data', async () => {
    const invalidUser = { email: 123 };
    const result = await validateUser(invalidUser);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
  
  test('schema validation aligns with types', async () => {
    const validBill = createBill({ title: 'Test Bill' });
    const result = await BillSchema.validateAsync(validBill);
    
    expect(result.id).toBeDefined();
  });
});
```

#### Test Category 4: Backward Compatibility

**File**: `tests/backward-compatibility.test.ts`

```typescript
describe('Backward Compatibility', () => {
  test('legacy imports still work', () => {
    // Old import path should still work
    import { User } from '@client/lib/types/bill';
    expect(User).toBeDefined();
  });
  
  test('deprecated types include warnings', () => {
    const spy = jest.spyOn(console, 'warn');
    deprecation('DashboardState');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated')
    );
  });
});
```

### Testing Execution Plan

1. **Unit Tests**: Type guard functions, validators
2. **Integration Tests**: Cross-layer compatibility
3. **E2E Tests**: Full API→UI data flow
4. **Performance Tests**: Compilation and runtime
5. **Regression Tests**: Backward compatibility

### Validation Criteria

- [ ] All type unit tests passing (100%)
- [ ] Cross-layer integration tests passing
- [ ] Zero runtime validation errors
- [ ] Performance benchmarks met
- [ ] Backward compatibility verified

---

## Implementation Timeline

### Week 1: Server & Schema Integration
- [ ] Task 14: Server types (Mon-Tue)
- [ ] Task 16: Schema integration (Wed-Thu)
- [ ] Testing setup (Fri)

### Week 2: Client Migration & Utilities
- [ ] Task 15: Client types (Mon-Wed)
- [ ] Task 17: Migration utilities (Thu-Fri)

### Week 3: Performance & Final Testing
- [ ] Task 18: Performance optimization (Mon-Wed)
- [ ] Task 19: Integration testing (Thu-Fri)
- [ ] Final validation (Fri)

---

## Success Criteria

- [x] TypeScript compilation: 0 errors
- [ ] Server type migration: 100% complete
- [ ] Client type migration: 100% complete
- [ ] Schema integration: Fully operational
- [ ] Migration utilities: All scripts working
- [ ] Performance: No regressions
- [ ] Tests: 95%+ passing
- [ ] Documentation: Complete
- [ ] Backward compatibility: Verified

---

## Common Patterns to Implement

### Pattern 1: Result Type Usage
```typescript
// Bad
async function getUser(id: string): Promise<User> {
  throw new Error('Not found');
}

// Good
async function getUser(id: string): AsyncResult<User, UserNotFoundError> {
  return { success: true, data: user };
}
```

### Pattern 2: Type Guard Usage
```typescript
// Bad
if (props.layout) {
  const cols = (props as any).columns;
}

// Good
if (isGridLayout(props)) {
  const cols = props.columns; // Type-safe
}
```

### Pattern 3: Discriminated Union Usage
```typescript
// Bad
interface Action {
  type: 'UPDATE' | 'DELETE';
  id: string;
  newValue?: T;
}

// Good
type Action<T> = 
  | { type: 'UPDATE'; id: string; newValue: T }
  | { type: 'DELETE'; id: string };
```

---

## Support & Questions

For questions about these implementations, refer to:
- Design Document: `.kiro/specs/type-system-standardization/design.md`
- Requirements: `.kiro/specs/type-system-standardization/requirements.md`
- Completion Summary: `TYPE_SYSTEM_COMPLETION_SUMMARY.md`

