# ADR-021: Secure Query Pipeline Usage Guide

**Date:** March 12, 2026  
**Status:** ✅ ACCEPTED  
**Supersedes:** None  
**Relates to:** ADR-012 (Infrastructure Security Pattern), ADR-014 (Error Handling), ADR-017 (Repository Pattern Standardization)

---

## Context

ADR-012 mandates a four-step security pipeline for all data operations:

```
Validate → Sanitize → Execute Securely → Sanitize Output
```

ADR-017 standardizes data access on `readDatabase`/`withTransaction` (Drizzle ORM) for simple CRUD and `BaseRepository` for complex operations.

However, neither ADR formally specifies **when** to use Drizzle's type-safe query builder directly vs. when to route through `secureQueryBuilderService` for the "Execute Securely" step. This gap created confusion during modernization — `secureQueryBuilderService` was incorrectly flagged as deprecated when it is in fact a critical security component.

This ADR crystallizes the decision boundary.

---

## Decision

### Query Pipeline Selection Matrix

| Scenario | Pipeline | Rationale |
|---|---|---|
| **Simple CRUD with known columns** | `readDatabase` / `BaseRepository.executeRead()` | Schema-typed queries via Drizzle's `eq()`, `and()`, etc. are inherently injection-safe because column references are compile-time constants |
| **User-supplied search terms** | `secureQueryBuilderService.createSafeLikePattern()` + Drizzle `sql` template | User strings in `LIKE`/`ILIKE` clauses need wildcard escaping beyond what parameterization provides |
| **Dynamic WHERE from user input** | `secureQueryBuilderService.buildParameterizedQuery()` | When the query structure itself varies based on user input (e.g., filter builders, report selectors), use the builder to enforce validation + parameterization together |
| **Dynamic table/column names** | `secureQueryBuilderService.validateIdentifier()` | SQL identifiers cannot be parameterized — they require strict regex validation and SQL keyword blocking |
| **Bulk import/update operations** | `secureQueryBuilderService.executeBulkOperation()` | Provides batch processing with per-item validation, retry logic, checkpoints, and error categorization |
| **Complex JOINs with user-dependent structure** | `secureQueryBuilderService.buildJoinQuery()` | Validates table/column identifiers and builds JOIN clauses safely |
| **Performance-critical paths** | Either, with `QueryMetricsService` | `secureQueryBuilderService` provides built-in query performance monitoring; for direct Drizzle paths, use the standalone `performanceMonitor` |

### The Security Integration Pattern

When using `BaseRepository` or direct `readDatabase`, services must still complete the full ADR-012 pipeline manually:

```typescript
// Repository method with security integration
async findBySearchTerm(term: string): Promise<Result<Entity[], Error>> {
  return this.executeRead(async (db) => {
    // Step 1: Validate (via Zod or queryValidationService)
    // Step 2: Sanitize input
    const sanitized = inputSanitizationService.sanitizeString(term);
    const pattern = secureQueryBuilderService.createSafeLikePattern(sanitized);

    // Step 3: Execute (Drizzle — safe because we sanitized + parameterized)
    const results = await db
      .select()
      .from(entities)
      .where(like(entities.name, pattern));

    // Step 4: Sanitize output (when returning user-generated content)
    return results.map(r => ({
      ...r,
      content: inputSanitizationService.sanitizeHtml(r.content),
    }));
  }, `entity:search:${term}`);
}
```

When using `secureQueryBuilderService` directly, steps 1-3 are handled internally:

```typescript
// Direct secure query builder — validation + parameterization built-in
const query = secureQueryBuilderService.buildParameterizedQuery(
  (params) => sql`
    SELECT * FROM ${sql.identifier(tableName)}
    WHERE name ILIKE ${params.pattern}
    LIMIT ${params.limit}
  `,
  { pattern, limit }
);
```

### Audit Logging Decision Boundary

| Event Type | Audit Required? | Example |
|---|---|---|
| User-initiated mutations (create/update/delete) | ✅ Always | `securityAuditService.logSecurityEvent()` |
| Admin/moderation actions | ✅ Always (severity: high) | Moderation, bans, role changes |
| Read operations on sensitive data | ⚠️ Configurable | PII access, financial records |
| Routine read operations | ❌ Not required | Listing bills, reading public content |

---

## Consequences

### Positive

1. **Clear decision boundary** — developers know exactly when to use each pipeline
2. **No accidental deprecation** — `secureQueryBuilderService` role is documented alongside `readDatabase`
3. **Defense in depth preserved** — multiple security layers remain active regardless of pipeline choice
4. **Performance monitoring** — both pipelines support instrumentation

### Negative

1. **Two paths to learn** — developers must understand both Drizzle and `secureQueryBuilderService` APIs
2. **Judgment required** — the selection matrix requires developers to classify their query type

### Risks

1. **Misclassification** — developer uses direct Drizzle for a dynamic query that needs `secureQueryBuilderService`
   - **Mitigation**: Code review checklist, ESLint rule for `sql.raw()` usage
2. **Over-engineering** — developer routes simple CRUD through `secureQueryBuilderService` unnecessarily
   - **Mitigation**: This ADR's selection matrix provides clear guidance

---

## Implementation

### Existing Infrastructure (No Code Changes Required)

- `secureQueryBuilderService` — [secure-query-builder.service.ts](file:///server/features/security/application/services/secure-query-builder.service.ts)
- `inputSanitizationService` — [input-sanitization.service.ts](file:///server/features/security/domain/services/input-sanitization.service.ts)
- `queryValidationService` — [query-validation.service.ts](file:///server/features/security/domain/services/query-validation.service.ts)
- `securityAuditService` — [security-audit.service.ts](file:///server/features/security/application/services/security-audit.service.ts)

### Documentation Updates Required

1. ✅ **This ADR** — crystallizes the decision boundary
2. ✅ **REPOSITORY_PATTERN.md** — updated to integrate security concerns
3. ⏳ **Internal consistency audit** — corrected to remove incorrect deprecation flag

---

## Related

- ADR-012: Infrastructure Security Pattern (mandates the 4-step pipeline)
- ADR-013: Caching Strategy
- ADR-014: Error Handling Pattern (safeAsync / Result types)
- ADR-017: Repository Pattern Standardization (readDatabase vs Repository)
- CODE_AUDIT_2026-03-06: Confirmed security hardening complete
