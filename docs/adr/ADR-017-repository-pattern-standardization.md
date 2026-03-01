# ADR-017: Repository Pattern Standardization

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Infrastructure Integration & Modernization

---

## Context

Multiple data access patterns exist across features:
1. Direct Drizzle queries in services
2. Repository classes extending `BaseRepository`
3. Storage classes (legacy pattern)
4. Adapter pattern (rarely used)
5. Direct pool access (legacy)

This fragmentation causes:
- Inconsistent error handling
- Difficult testing
- Unclear ownership of data access logic
- Code duplication

## Decision

Standardize on a clear data access pattern hierarchy:

### Pattern Selection Matrix

| Use Case | Pattern | Example |
|----------|---------|---------|
| Simple CRUD | Direct Drizzle in service | `readDatabase.select().from(users)` |
| Complex queries | Repository class | `UserRepository.findActiveWithBills()` |
| Cross-table operations | Repository with transactions | `BillRepository.createWithSponsors()` |
| Legacy code | Migrate to above patterns | Deprecate Storage/Adapter |

### Repository Pattern (for complex operations)

```typescript
export class BillRepository {
  async findWithSponsors(billId: string): Promise<Result<BillWithSponsors, Error>> {
    return safeAsync(async () => {
      const result = await readDatabase
        .select()
        .from(bills)
        .leftJoin(sponsors, eq(bills.id, sponsors.bill_id))
        .where(eq(bills.id, billId));
      
      return this.mapToBillWithSponsors(result);
    }, { service: 'BillRepository', operation: 'findWithSponsors' });
  }
}
```

### Direct Drizzle (for simple operations)

```typescript
export class BillService {
  async getById(id: string): Promise<Result<Bill, Error>> {
    return safeAsync(async () => {
      const result = await readDatabase
        .select()
        .from(bills)
        .where(eq(bills.id, id));
      
      return result[0];
    }, { service: 'BillService', operation: 'getById' });
  }
}
```

### Deprecated Patterns

- **Storage classes** - Migrate to Repository or direct Drizzle
- **Adapter pattern** - Migrate to Repository
- **Direct pool access** - Migrate to `readDatabase`/`writeDatabase`

## Consequences

### Positive
- Clear decision matrix for data access
- Consistent patterns across features
- Better testability
- Reduced code duplication
- Type-safe queries

### Negative
- Need to migrate existing Storage/Adapter code
- Some learning curve for team
- May require refactoring existing repositories

### Neutral
- BaseRepository can be added later if common patterns emerge
- Not all features need repositories

## Implementation

1. Document pattern selection matrix
2. Migrate Storage classes to Repository or direct Drizzle
3. Deprecate Adapter pattern
4. Add ESLint rules to prevent direct pool access
5. Provide migration examples

## Related

- ADR-012: Infrastructure Security Pattern
- ADR-014: Error Handling Pattern
- Infrastructure Architecture Audit
