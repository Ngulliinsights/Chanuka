# ADR-011: Type System Single Source of Truth

## Status
Accepted - Implementation in Progress

## Context
The codebase currently has significant type duplication across layers:

### Current State
- **Bill types**: 6+ definitions across shared, client, server, and features
- **User types**: 5+ definitions with inconsistent fields
- **Type files**: 101 files in shared/types/ (target: ~40)
- **Import patterns**: Multiple paths to same entity causing confusion

### Problems
1. **Maintenance burden**: Changes require updates in multiple locations
2. **Type drift**: Definitions diverge over time, causing runtime bugs
3. **Cognitive load**: Developers unsure which type to use
4. **Build complexity**: Circular dependencies and import conflicts
5. **Onboarding friction**: New developers confused by multiple definitions

## Decision

### Establish Canonical Type Locations

```
shared/types/
├── domains/              # Domain entities (canonical)
│   ├── legislative/
│   │   ├── bill.ts      # ✅ Single source of truth
│   │   ├── sponsor.ts
│   │   └── committee.ts
│   ├── authentication/
│   │   └── user.ts      # ✅ Single source of truth
│   └── community/
│       └── comment.ts
├── api/                  # API contracts (derived)
│   └── contracts/
│       └── bill.contract.ts
└── database/             # Database types (derived)
    └── generated-domains.ts
```

### Type Hierarchy

```typescript
// 1. CANONICAL - Domain types (shared/types/domains/)
export interface Bill {
  readonly id: BillId;
  readonly billNumber: string;
  readonly title: string;
  // ... complete domain model
}

// 2. DERIVED - Database types (server/infrastructure/schema/)
export type BillTable = typeof bills.$inferSelect;
export type BillDomain = Bill; // Re-export canonical

// 3. EXTENDED - Client augmentations (client/src/lib/types/)
export interface ClientBill extends Bill {
  // Client-specific UI state only
  readonly isTracked?: boolean;
  readonly localNotes?: string;
}

// 4. CONTRACTS - API types (shared/types/api/contracts/)
export const BillResponseSchema = z.object({
  // Zod schema for validation
});
export type BillResponse = z.infer<typeof BillResponseSchema>;
```

### Import Rules

```typescript
// ✅ CORRECT - Always import from canonical location
import { Bill, User } from '@shared/types';

// ❌ WRONG - Don't import from feature types
import { Bill } from '@client/features/bills/types';
import { Bill } from '@server/types/common';

// ✅ CORRECT - Database types are derived
import type { BillTable } from '@server/infrastructure/schema';

// ✅ CORRECT - Client extensions are explicit
import type { ClientBill } from '@client/lib/types/bill';
```

## Consequences

### Positive
1. **Single source of truth**: One definition per entity
2. **Type safety**: Consistent types across layers
3. **Easier maintenance**: Changes in one place
4. **Clear ownership**: Obvious where types belong
5. **Better DX**: Clear import patterns

### Negative
1. **Migration effort**: Need to update ~200+ import statements
2. **Breaking changes**: Some APIs may need adjustment
3. **Learning curve**: Team needs to learn new patterns

### Mitigation
1. **Incremental migration**: One domain at a time
2. **Automated tooling**: ESLint rules to enforce patterns
3. **Documentation**: Clear guidelines and examples
4. **Type aliases**: Temporary compatibility layer during migration

## Implementation Plan

### Phase 1: Bill Types (Week 1)
1. Consolidate Bill definitions into `shared/types/domains/legislative/bill.ts`
2. Update database schema to derive from canonical
3. Create client extensions in `client/src/lib/types/bill/`
4. Update all imports to use `@shared/types`

### Phase 2: User Types (Week 1)
1. Consolidate User definitions into `shared/types/domains/authentication/user.ts`
2. Update auth middleware to use canonical types
3. Update all imports

### Phase 3: Other Domains (Week 2)
1. Apply same pattern to Comment, Sponsor, Committee
2. Reduce type files from 101 to ~40

### Phase 4: Enforcement (Week 2)
1. Add ESLint rules
2. Update documentation
3. Remove deprecated types

## Validation

### Success Metrics
- [ ] Bill type locations: 6 → 1 canonical + derived
- [ ] User type locations: 5 → 1 canonical + derived
- [ ] Type files: 101 → ~40
- [ ] Zero type conflicts in builds
- [ ] Zero test failures
- [ ] ESLint rules enforcing patterns

### Verification
```bash
# Count Bill type definitions
grep -r "interface Bill\s*{" --include="*.ts" | wc -l
# Target: 1 (canonical only)

# Count import paths
grep -r "from '@shared/types'" --include="*.ts" | wc -l
# Target: 200+ (all domain imports)

# Verify no feature-level types
grep -r "interface Bill" client/src/features/ --include="*.ts"
# Target: 0 results
```

## References
- [Type System Consolidation Plan](../plans/type-system-consolidation.md)
- [Import Patterns Guide](../guides/code-organization-standards.md)
- [Shared Types README](../../shared/types/README.md)

## Notes
- Database types use Drizzle's `$inferSelect` - this is correct and should be preserved
- Client extensions should be minimal - most UI state belongs in React state
- API contracts use Zod schemas for runtime validation
- Branded types (BillId, UserId) provide additional type safety

## Date
2026-02-26

## Authors
- Development Team
