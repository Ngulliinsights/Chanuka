# Design Document: Codebase Consolidation

## Overview

This design implements the completion of five incomplete migrations and establishes architectural conventions to prevent future migration debt. The approach prioritizes low-risk, high-impact changes first, building confidence before tackling complex validation consolidation.

## Architecture Principles

### 1. Single Source of Truth
Each concept, implementation, or configuration should exist in exactly one location. Parallel implementations create confusion and maintenance burden.

### 2. Explicit Over Implicit
Architectural decisions should be documented (ADRs), not inferred from code patterns. Feature structure conventions should be written, not tribal knowledge.

### 3. Fail Fast on Ambiguity
When two implementations coexist, force a decision: choose one as canonical and deprecate/remove the other. Don't let both linger indefinitely.

### 4. Preserve Git History
Deleted code remains in git history. Don't fear deletion - it's reversible. The cost of maintaining unused code exceeds the cost of re-implementing if needed.

### 5. Incremental Migration
Complex migrations (validation) are broken into phases with clear checkpoints. Each phase delivers value independently.

## Migration Sequencing Strategy

### Phase 1: Quick Wins (Week 1-2)
**Goal**: Build momentum with low-risk, high-visibility changes

1. **Dead API Client Removal** (1 day)
   - Zero production usages confirmed
   - No integration testing required
   - Immediate reduction in cognitive load

2. **Git Hygiene** (2 hours)
   - Remove backup directories, .orig/.rej files
   - Update .gitignore
   - No code changes, zero risk

3. **CSP Migration Completion** (1 day)
   - Already running in production
   - Dev environment is only remaining consumer
   - Low risk, high confidence

4. **Repository Root Cleanup** (2 hours)
   - Delete session logs and build artifacts
   - Move design decisions to docs/
   - Immediate improvement in repository navigation

### Phase 2: Structural Consolidation (Week 3-4)
**Goal**: Complete partially-finished refactors

5. **Scripts Directory Audit** (3 days)
   - Classify 150+ scripts
   - Delete emergency patches and completed migrations
   - Document permanent tooling

6. **Graph Module Refactor** (2 days)
   - Complete transition to structured layout
   - Update imports
   - Run Neo4j integration tests

7. **Government Data Consolidation** (1 day)
   - Port unique capabilities to canonical service
   - Update imports
   - Delete infrastructure duplicates

8. **Error Remediation Move** (2 hours)
   - Move to tools/ directory
   - Update workspace configuration
   - Verify builds and tests

### Phase 3: Validation Consolidation (Week 5-7)
**Goal**: Establish single source of truth for validation

9. **Validation Phase A**: Build Foundation (1 week)
   - Create shared/validation/schemas/common.ts
   - Define all cross-cutting primitives
   - Write comprehensive tests

10. **Validation Phase B**: Server Migration (1 week)
    - Update server infrastructure to import from shared
    - Merge server/utils/validation.ts
    - Verify all server validation uses shared primitives

11. **Validation Phase C**: Client Migration (1 week)
    - Audit client validation files
    - Replace local definitions with shared imports
    - Verify role enum consistency

### Phase 4: Documentation & Convention (Week 8)
**Goal**: Prevent future migration debt

12. **Feature Architecture Convention** (1 day)
    - Document DDD vs Flat guidelines
    - Create features/README.md
    - Consider ESLint enforcement

13. **Constitutional Intelligence Resolution** (2 days)
    - Merge or clarify DDD boundary
    - Document decision
    - Update architecture documentation

## Detailed Design

### Migration 1: CSP Manager Completion

#### Current Architecture
```
client/src/core/security/
├── csp-manager.ts                    # Legacy (dev only)
├── unified/
│   ├── csp-manager.ts               # Production
│   └── system.ts                    # Initialization
└── migration/
    ├── compatibility-layer.ts        # Runtime switch
    └── migration-utils.ts           # Helper functions
```

#### Target Architecture
```
client/src/core/security/
├── unified/
│   ├── csp-manager.ts               # Only implementation
│   └── system.ts                    # Initialization
└── index.ts                         # Export as CSPManager
```

#### Implementation Steps

1. **Verify Production Stability**
   ```typescript
   // Query production logs for CSP violations
   // Timeframe: Last 30 days
   // Expected: <1% violation rate
   ```

2. **Update Compatibility Layer**
   ```typescript
   // Before
   export const CSPManager = 
     process.env.USE_UNIFIED_SECURITY || isProd 
       ? UnifiedCSPManager 
       : LegacyCSPManager;

   // After
   export { UnifiedCSPManager as CSPManager } from '../unified/csp-manager';
   ```

3. **Remove Feature Flag Checks**
   ```typescript
   // Find all locations
   grep -r "USE_UNIFIED_SECURITY" client/src/
   
   // Replace with direct UnifiedCSPManager initialization
   ```

4. **Delete Legacy Files**
   - `client/src/core/security/csp-manager.ts`
   - `client/src/core/security/migration/` (entire directory)

5. **Update Barrel Exports**
   ```typescript
   // client/src/core/security/index.ts
   export { UnifiedCSPManager as CSPManager } from './unified/csp-manager';
   export { initializeSecuritySystem } from './unified/system';
   ```

#### Rollback Plan
If issues arise in dev:
1. Revert compatibility layer change
2. Re-enable feature flag
3. Investigate root cause
4. Fix unified implementation
5. Retry migration

### Migration 2: Dead API Client Removal

#### Current Architecture
```
client/src/core/api/
├── base-client.ts                   # 0 usages (extended by AuthenticatedApiClient)
├── authenticated-client.ts          # 0 usages
├── safe-client.ts                   # 0 usages
├── circuit-breaker-client.ts        # 3 usages (examples only)
├── client.ts                        # 100+ usages (UnifiedApiClientImpl)
├── contract-client.ts               # 2 usages (growing)
└── examples/
    └── circuit-breaker-usage.ts     # Example code
```

#### Target Architecture
```
client/src/core/api/
├── client.ts                        # Canonical (UnifiedApiClientImpl)
├── contract-client.ts               # Type-safe wrapper
├── cache-manager.ts                 # Shared utilities
├── retry.ts                         # Shared utilities
└── authentication.ts                # Shared utilities
```

#### Implementation Steps

1. **Confirm Zero Usages**
   ```bash
   # Must return 0 results for each
   grep -r "SafeApiClient" client/src/ --include='*.ts' --include='*.tsx'
   grep -r "AuthenticatedApiClient" client/src/ --include='*.ts' --include='*.tsx'
   grep -r "CircuitBreakerClient" client/src/ --include='*.ts' --include='*.tsx'
   grep -r "BaseApiClient" client/src/ --include='*.ts' --include='*.tsx'
   ```

2. **Extract Reusable Utilities**
   ```typescript
   // Before deletion, check if BaseApiClient has utilities worth keeping
   // Example: interceptor types, error normalization helpers
   
   // If found, extract to shared location:
   // client/src/core/api/utils/interceptors.ts
   // client/src/core/api/utils/error-handling.ts
   ```

3. **Delete Files**
   ```bash
   rm client/src/core/api/base-client.ts
   rm client/src/core/api/authenticated-client.ts
   rm client/src/core/api/safe-client.ts
   rm client/src/core/api/circuit-breaker-client.ts
   rm -r client/src/core/api/examples/
   ```

4. **Update Barrel Exports**
   ```typescript
   // client/src/core/api/index.ts
   // Remove these exports:
   // export { BaseApiClient, ... } from './base-client';
   // export { AuthenticatedApiClient, ... } from './authenticated-client';
   // export { SafeApiClient, ... } from './safe-client';
   // export { CircuitBreakerClient, ... } from './circuit-breaker-client';
   
   // Keep these:
   export { globalApiClient } from './client';
   export { contractApiClient } from './contract-client';
   ```

5. **Update Documentation**
   ```markdown
   # API Client Usage Guide
   
   ## Standard API Calls
   Use `globalApiClient` for all API requests:
   
   ```typescript
   import { globalApiClient } from '@client/core/api';
   
   const response = await globalApiClient.get('/api/bills');
   ```
   
   ## Type-Safe API Calls
   Use `contractApiClient` for endpoints with defined contracts:
   
   ```typescript
   import { contractApiClient } from '@client/core/api';
   import { GetBillEndpoint } from '@shared/types/api/contracts';
   
   const result = await contractApiClient.call(GetBillEndpoint, { id: '123' });
   ```
   ```

#### Verification
```bash
# Ensure no broken imports
npm run build

# Run tests
npm run test

# Check bundle size reduction
npm run build:analyze
```

### Migration 3: Graph Module Refactor

#### Current Architecture (Duplicated)
```
server/infrastructure/database/graph/
├── neo4j-client.ts                  # Flat (duplicate)
├── batch-sync-runner.ts             # Flat (duplicate)
├── sync-executor.ts                 # Flat (duplicate)
├── transaction-executor.ts          # Flat (duplicate)
├── query-builder.ts                 # Flat (duplicate)
├── session-manager.ts               # Flat (duplicate)
├── engagement-queries.ts            # Flat (duplicate)
├── network-queries.ts               # Flat (duplicate)
├── advanced-queries.ts              # Flat (duplicate)
├── schema.ts                        # Flat (duplicate)
├── core/
│   ├── neo4j-client.ts             # Structured (canonical)
│   ├── batch-sync-runner.ts        # Structured (canonical)
│   ├── sync-executor.ts            # Structured (canonical)
│   ├── transaction-executor.ts     # Structured (canonical)
│   └── schema.ts                   # Structured (canonical)
├── query/
│   ├── engagement-queries.ts       # Structured (canonical)
│   ├── network-queries.ts          # Structured (canonical)
│   └── advanced-queries.ts         # Structured (canonical)
└── utils/
    ├── query-builder.ts            # Structured (canonical)
    └── session-manager.ts          # Structured (canonical)
```

#### Target Architecture
```
server/infrastructure/database/graph/
├── core/                            # Core functionality
│   ├── neo4j-client.ts
│   ├── batch-sync-runner.ts
│   ├── sync-executor.ts
│   ├── transaction-executor.ts
│   ├── schema.ts
│   └── idempotency-ledger.ts       # Moved from flat
├── query/                           # Query builders
│   ├── engagement-queries.ts
│   ├── network-queries.ts
│   └── advanced-queries.ts
├── utils/                           # Utilities
│   ├── query-builder.ts
│   └── session-manager.ts
├── analytics/                       # Analytics (new)
│   ├── advanced-analytics.ts       # Moved from flat
│   └── pattern-discovery.ts        # Moved from flat
├── sync/                            # Sync operations (new)
│   ├── engagement-networks.ts      # Moved from flat
│   └── network-sync.ts             # Moved from flat
└── index.ts                         # Barrel export
```

#### Implementation Steps

1. **Diff Flat vs Structured**
   ```bash
   # For each duplicate file, check for differences
   diff graph/neo4j-client.ts graph/core/neo4j-client.ts
   diff graph/query-builder.ts graph/utils/query-builder.ts
   # etc.
   
   # If differences found, merge into structured version
   ```

2. **Find All Imports**
   ```bash
   # Find imports pointing to flat files
   grep -r "from.*graph/neo4j-client" server/
   grep -r "from.*graph/query-builder" server/
   grep -r "from.*graph/session-manager" server/
   # etc.
   ```

3. **Update Imports**
   ```typescript
   // Before
   import { Neo4jClient } from '@server/infrastructure/database/graph/neo4j-client';
   
   // After
   import { Neo4jClient } from '@server/infrastructure/database/graph/core/neo4j-client';
   ```

4. **Move Remaining Flat Files**
   ```bash
   # Create new subdirectories
   mkdir -p graph/analytics
   mkdir -p graph/sync
   
   # Move files
   mv graph/advanced-analytics.ts graph/analytics/
   mv graph/pattern-discovery.ts graph/analytics/
   mv graph/engagement-networks.ts graph/sync/
   mv graph/network-sync.ts graph/sync/
   mv graph/idempotency-ledger.ts graph/core/
   ```

5. **Delete Flat Duplicates**
   ```bash
   rm graph/neo4j-client.ts
   rm graph/batch-sync-runner.ts
   rm graph/sync-executor.ts
   rm graph/transaction-executor.ts
   rm graph/query-builder.ts
   rm graph/session-manager.ts
   rm graph/engagement-queries.ts
   rm graph/network-queries.ts
   rm graph/advanced-queries.ts
   rm graph/schema.ts
   ```

6. **Update Barrel Export**
   ```typescript
   // graph/index.ts
   export * from './core';
   export * from './query';
   export * from './utils';
   export * from './analytics';
   export * from './sync';
   ```

#### Verification
```bash
# Run Neo4j integration tests
npm run test:integration:neo4j

# Verify no broken imports
npm run build
```

### Migration 4: Government Data Consolidation

#### Current Architecture
```
server/
├── features/government-data/
│   ├── services/
│   │   └── government-data-integration.service.ts  # CANONICAL
│   └── application/
│       └── managed-integration.service.ts          # Active wrapper
└── infrastructure/external-data/
    ├── government-data-integration.ts              # Duplicate
    └── government-data-service.ts                  # Commented out
```

#### Target Architecture
```
server/features/government-data/
├── services/
│   └── government-data-integration.service.ts      # Only implementation
└── application/
    └── managed-integration.service.ts              # Wrapper
```

#### Implementation Steps

1. **Audit Unique Capabilities**
   ```typescript
   // Compare infrastructure vs features implementations
   // Check for unique features in infrastructure version:
   // - Data quality metrics
   // - Multi-source priority handling
   // - Rate limiting strategies
   
   // If found, port to canonical service first
   ```

2. **Find All Imports**
   ```bash
   grep -r "external-data/government-data" server/
   ```

3. **Update Imports**
   ```typescript
   // Before
   import { GovernmentDataService } from '@server/infrastructure/external-data/government-data-service';
   
   // After
   import { GovernmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service';
   ```

4. **Delete Infrastructure Files**
   ```bash
   rm server/infrastructure/external-data/government-data-integration.ts
   rm server/infrastructure/external-data/government-data-service.ts
   
   # If directory is now empty
   rmdir server/infrastructure/external-data/
   ```

#### Verification
```bash
# Run government data integration tests
npm run test:integration:government-data

# Verify no broken imports
npm run build
```

### Migration 5: Validation Consolidation

#### Current Architecture (Fragmented)
```
shared/validation/                   # Intended single source (1 import)
├── schemas/
│   ├── user.schema.ts
│   ├── comment.schema.ts
│   └── bill.schema.ts
└── index.ts

server/utils/validation.ts           # Parallel implementation (0 imports)

server/infrastructure/core/validation/  # Another parallel (active)
├── input-validation-service.ts
├── schema-validation-service.ts
└── repository-validation.ts

client/src/[feature]/validation.ts   # Per-feature (independent)
```

#### Target Architecture (Three-Layer)
```
Layer 1: shared/validation/          # Cross-cutting primitives
├── schemas/
│   └── common.ts                    # emailSchema, uuidSchema, etc.
└── index.ts

Layer 2: server/infrastructure/core/validation/  # Server runtime
├── repository-validation.ts         # Imports shared primitives
├── data-validation-service.ts       # DB integrity checks
└── validation-metrics.ts            # Observability

Layer 3: client/src/[feature]/validation.ts  # UI-specific
# Imports shared primitives for common fields
# Adds UI-specific rules (confirmation, display)
```

#### Phase A: Build Foundation (Week 5)

**Step 1: Create Common Schemas**
```typescript
// shared/validation/schemas/common.ts
import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .toLowerCase()
  .trim();

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

// Phone validation (E.164 format)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format');

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

// User role enum (single source of truth)
export const userRoleSchema = z.enum([
  'citizen',
  'admin',
  'moderator',
  'analyst',
  'expert',
  'journalist',
  'advocate'
]);

export type UserRole = z.infer<typeof userRoleSchema>;

// Pagination
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// Search query (with SQL injection protection)
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query required')
  .max(200, 'Search query too long')
  .refine(
    q => !/(\b(union|select|insert|update|delete|drop)\b)/i.test(q),
    'Search query contains invalid characters'
  );

// Date range
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  data => data.endDate >= data.startDate,
  'End date must be after start date'
);

// ID validation (branded types)
export const billIdSchema = z.string().uuid();
export const userIdSchema = z.string().uuid();
export const commentIdSchema = z.string().uuid();
```

**Step 2: Export from Barrel**
```typescript
// shared/validation/index.ts
export * from './schemas/common';
export * from './schemas/user.schema';
export * from './schemas/comment.schema';
export * from './schemas/bill.schema';
export * from './errors';
```

**Step 3: Write Tests**
```typescript
// shared/validation/__tests__/common.test.ts
import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  uuidSchema,
  phoneSchema,
  urlSchema,
  userRoleSchema,
  searchQuerySchema,
} from '../schemas/common';

describe('Common Validation Schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
      expect(emailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com'); // lowercase
    });

    it('rejects invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
    });

    it('trims whitespace', () => {
      expect(emailSchema.parse('  user@example.com  ')).toBe('user@example.com');
    });
  });

  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(uuidSchema.parse(uuid)).toBe(uuid);
    });

    it('rejects invalid UUIDs', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
      expect(() => uuidSchema.parse('123')).toThrow();
    });
  });

  describe('userRoleSchema', () => {
    it('accepts valid roles', () => {
      expect(userRoleSchema.parse('citizen')).toBe('citizen');
      expect(userRoleSchema.parse('admin')).toBe('admin');
    });

    it('rejects invalid roles', () => {
      expect(() => userRoleSchema.parse('invalid')).toThrow();
      expect(() => userRoleSchema.parse('public')).toThrow();
    });
  });

  describe('searchQuerySchema', () => {
    it('accepts safe search queries', () => {
      expect(searchQuerySchema.parse('healthcare bill')).toBe('healthcare bill');
    });

    it('rejects SQL injection attempts', () => {
      expect(() => searchQuerySchema.parse('SELECT * FROM users')).toThrow();
      expect(() => searchQuerySchema.parse('DROP TABLE bills')).toThrow();
    });
  });
});
```

#### Phase B: Server Migration (Week 6)

**Step 1: Update Repository Validation**
```typescript
// server/infrastructure/core/validation/repository-validation.ts

// Before
import { z } from 'zod';
const emailSchema = z.string().email(); // Local definition

// After
import { emailSchema, uuidSchema, userRoleSchema } from '@shared/validation';
// Remove local redefinitions
```

**Step 2: Merge server/utils/validation.ts**
```bash
# Check for unique logic
diff server/utils/validation.ts server/infrastructure/core/validation/

# If unique logic found, merge into infrastructure version
# Then delete utils version
rm server/utils/validation.ts
```

**Step 3: Update All Server Validation**
```bash
# Find all local email validations
grep -r "z.string().email" server/

# Replace with shared import
# Before:
const emailSchema = z.string().email();

# After:
import { emailSchema } from '@shared/validation';
```

#### Phase C: Client Migration (Week 7)

**Step 1: Audit Client Validation**
```bash
# Find duplicate email validations
grep -r "z.string().email" client/src/

# Find duplicate UUID validations
grep -r "z.string().uuid" client/src/

# Find duplicate role enums
grep -rn "enum\(\[.*citizen\|admin" client/src/
```

**Step 2: Replace with Shared Imports**
```typescript
// Before (client/src/features/users/validation.ts)
import { z } from 'zod';

const emailSchema = z.string().email();
const roleSchema = z.enum(['citizen', 'admin', 'expert']);

// After
import { emailSchema, userRoleSchema } from '@shared/validation';
// Remove local definitions
```

**Step 3: Verify Role Enum Consistency**
```bash
# Ensure only one definition exists
grep -r "enum.*citizen.*admin" --include="*.ts"

# Should only find: shared/validation/schemas/common.ts
```

#### Verification Strategy

**After Each Phase:**
```bash
# Type check
npm run type-check

# Run tests
npm run test

# Run validation-specific tests
npm run test -- validation

# Check for circular dependencies
npm run check:circular
```

**Prevent Circular Dependencies:**
```typescript
// ESLint rule to enforce
// .eslintrc.js
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        {
          target: './shared',
          from: './server',
          message: 'Shared cannot import from server'
        },
        {
          target: './shared',
          from: './client',
          message: 'Shared cannot import from client'
        }
      ]
    }]
  }
}
```

## Documentation Updates

### ADR-006: API Client Consolidation
```markdown
# ADR-006: Consolidate to Single API Client Implementation

**Status**: Accepted

**Date**: 2026-02-18

**Context**: 
The codebase had six API client implementations with overlapping functionality. BaseApiClient, AuthenticatedApiClient, and SafeApiClient were complete but unused. UnifiedApiClientImpl (globalApiClient) had 100+ production usages.

**Decision**: 
Remove unused clients and standardize on globalApiClient as the canonical implementation. Keep contractApiClient as type-safe wrapper.

**Consequences**:
- Positive: Single, clear API client pattern
- Positive: Reduced cognitive load
- Positive: Smaller bundle size
- Negative: Lost modular architecture option
- Negative: Lost Result type pattern (SafeApiClient)

**Alternatives Considered**:
- Migrate to BaseApiClient family: Rejected due to 100+ usages of globalApiClient
- Keep both: Rejected due to confusion and maintenance burden
```

### ADR-007: Validation Single Source of Truth
```markdown
# ADR-007: Establish shared/validation/ as Single Source of Truth

**Status**: Accepted

**Date**: 2026-02-18

**Context**:
Validation schemas were duplicated across client and server. Email validation had 4+ independent implementations. User role enum had inconsistent definitions.

**Decision**:
Establish three-layer validation architecture:
- Layer 1: shared/validation/ (cross-cutting primitives)
- Layer 2: server/infrastructure/core/validation/ (server runtime)
- Layer 3: client/[feature]/validation.ts (UI-specific)

**Consequences**:
- Positive: Single source of truth for validation rules
- Positive: Consistent validation across client/server
- Positive: Easier to maintain and update rules
- Negative: Requires careful management of circular dependencies
- Negative: Migration effort across entire codebase

**Enforcement**:
ESLint rules prevent shared/ from importing server/ or client/
```

### Feature Architecture Convention
```markdown
# Feature Structure Convention

## When to Use Full DDD Structure

Use `application/`, `domain/`, `infrastructure/` when:
- Feature has its own database entities or repositories
- Domain logic must be protected from infrastructure concerns
- Multiple application-layer use cases exist
- Feature has more than ~8 files

Example: `users/`, `bills/`, `recommendation/`

## When to Use Flat Structure

Use flat structure when:
- Feature is a thin routing/controller layer
- Delegates to shared infrastructure
- Fewer than ~8 files
- Read-only (queries only, no mutations)

Example: `community/`, `market/`, `coverage/`

## Enforcement

This convention is documented but not automatically enforced. During code review, ensure new features follow the appropriate pattern.

## Migration

Existing features that have outgrown their structure should be migrated during major refactors, not as standalone work.
```

## Rollback Procedures

### General Rollback Strategy
1. All changes are committed in atomic, reversible commits
2. Each migration phase has a rollback plan
3. Git history preserves all deleted code
4. Feature flags used for risky changes (CSP migration)

### Specific Rollback Plans

**CSP Migration:**
```bash
# Revert compatibility layer
git revert <commit-hash>

# Re-enable feature flag
export USE_UNIFIED_SECURITY=false

# Restart dev server
```

**API Client Removal:**
```bash
# Restore deleted files
git checkout <commit-before-deletion> -- client/src/core/api/safe-client.ts
git checkout <commit-before-deletion> -- client/src/core/api/authenticated-client.ts

# Restore barrel exports
git checkout <commit-before-deletion> -- client/src/core/api/index.ts
```

**Validation Migration:**
```bash
# Rollback is per-phase
# Phase A: Delete shared/validation/schemas/common.ts
# Phase B: Restore server/utils/validation.ts
# Phase C: Restore client validation files
```

## Success Metrics

### Quantitative
- File count reduction: Target 50+ files deleted
- Import count: Zero imports of deleted modules
- Test coverage: Maintain >80% coverage
- Build time: No significant increase
- Bundle size: Reduce by ~5% (dead code removal)

### Qualitative
- Developer feedback: "Easier to find the right implementation"
- Code review comments: Fewer "which client should I use?" questions
- Onboarding time: Reduced time to understand API client patterns

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Quick Wins | API clients removed, CSP migrated, repo cleaned |
| 3-4 | Structural | Graph refactored, government data consolidated |
| 5 | Validation A | Shared primitives created and tested |
| 6 | Validation B | Server migrated to shared validation |
| 7 | Validation C | Client migrated to shared validation |
| 8 | Documentation | ADRs written, conventions documented |

Total: 8 weeks for complete consolidation
