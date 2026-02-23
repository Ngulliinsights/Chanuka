# Chanuka — Migration Completion & Project Structure Analysis

> Generated: February 18, 2026 · Based on validated codebase investigation

---

## 1. Migration Status Dashboard

Five confirmed incomplete migrations were identified through codebase investigation.

| Migration | Status | Summary |
|-----------|--------|---------|
| CSP Manager | 🟡 PARTIAL | Production on `UnifiedCSPManager`. Dev still on legacy via feature flag. |
| Dead API Clients | 🟡 PARTIAL | `SafeApiClient`, `AuthenticatedApiClient`, `CircuitBreakerClient`: 0 usages. |
| Graph Module Refactor | 🟡 PARTIAL | Flat root files coexist with organized `core/`, `query/`, `utils/` subdirs. |
| Government Data Integration | 🟡 PARTIAL | Three implementations. `features/government-data/` is canonical. |
| Validation Single Source | 🔴 NOT STARTED | `shared/validation/` exists but imported exactly once — in a test file. |

---

## 2. Migration 1 — CSP Manager

### Current State

The security system has two CSP implementations running simultaneously, toggled by environment and feature flags:

- **Production:** `UnifiedCSPManager` (`client/src/infrastructure/security/unified/csp-manager.ts`)
- **Development:** Legacy `CSPManager` (`client/src/infrastructure/security/csp-manager.ts`) unless `USE_UNIFIED_SECURITY=true`
- A compatibility layer (`security/migration/`) switches between the two at runtime

The unified implementation is a strict superset — it adds `generateCSPHeader()`, `getHealthStatus()`, `getMetrics()`, `shutdown()`, and configurable directives. The legacy version has hardcoded directives.

### Completion Steps

1. Verify unified is stable in production. Check error logs for CSP violations over the past 30 days.

2. Update the compatibility layer to unconditionally export `UnifiedCSPManager`:

```ts
// client/src/infrastructure/security/migration/compatibility-layer.ts
export { UnifiedCSPManager as CSPManager } from '../unified/csp-manager';
```

3. Remove the feature flag branch wherever initialization happens:

```ts
// DELETE: if (process.env.USE_UNIFIED_SECURITY || isProd) { ... } else { ... }
// REPLACE WITH: always initialize UnifiedCSPManager
```

4. Run the full test suite against the unified implementation in a dev environment.

5. Delete legacy files once tests pass:

| Action | Path | Reason |
|--------|------|--------|
| DELETE | `client/src/infrastructure/security/csp-manager.ts` | Legacy — superseded by `unified/` |
| DELETE | `client/src/infrastructure/security/migration/compatibility-layer.ts` | No longer needed |
| DELETE | `client/src/infrastructure/security/migration/migration-utils.ts` | No longer needed |
| DELETE | `client/src/infrastructure/security/migration/` | Entire directory |
| KEEP | `client/src/infrastructure/security/unified/csp-manager.ts` | Canonical implementation |
| KEEP | `client/src/infrastructure/security/unified/system.ts` | Initialization entry point |

6. Update barrel exports:

```ts
// client/src/infrastructure/security/index.ts
export { UnifiedCSPManager as CSPManager } from './unified/csp-manager';
```

7. Search for any remaining imports of the legacy path:

```bash
grep -r "from.*security/csp-manager" client/src/
```

### Risk

**Low.** Production has been running `UnifiedCSPManager` successfully. Dev is the only remaining consumer of legacy. No schema changes involved.

---

## 3. Migration 2 — Dead API Clients

### Current State

Investigation confirmed six HTTP client implementations in `client/src/infrastructure/api/`, with wildly different usage:

| Client | Production Usages | Verdict |
|--------|-------------------|---------|
| `globalApiClient` (UnifiedApiClientImpl) | 100+ | ✅ Canonical — keep |
| `contractApiClient` | 2, growing | ✅ Type-safe wrapper — keep |
| `BaseApiClient` | 0 direct | ⚠️ Only extended by dead AuthenticatedApiClient |
| `AuthenticatedApiClient` | 0 | ❌ Dead code — never wired up |
| `SafeApiClient` | 0 | ❌ Dead code |
| `CircuitBreakerClient` | 3 in `examples/` only | ❌ Never production |

### Completion Steps

1. Confirm 0 usages before deleting. Run for each:

```bash
grep -r "SafeApiClient" client/src/ --include='*.ts' --include='*.tsx'
grep -r "AuthenticatedApiClient" client/src/ --include='*.ts' --include='*.tsx'
grep -r "CircuitBreakerClient" client/src/ --include='*.ts' --include='*.tsx'
```

2. Delete the dead clients:

| Action | Path | Reason |
|--------|------|--------|
| DELETE | `client/src/infrastructure/api/safe-client.ts` | 0 production usages |
| DELETE | `client/src/infrastructure/api/authenticated-client.ts` | 0 usages — auth handled elsewhere |
| DELETE | `client/src/infrastructure/api/base-client.ts` | Only extended dead `AuthenticatedApiClient` |
| DELETE | `client/src/infrastructure/api/circuit-breaker-client.ts` | Example-only, not production |
| DELETE | `client/src/infrastructure/api/examples/` | Entire examples directory |
| KEEP | `client/src/infrastructure/api/client.ts` | Hosts `globalApiClient` — canonical |
| KEEP | `client/src/infrastructure/api/contract-client.ts` | Active, growing usage |
| KEEP | `client/src/infrastructure/api/circuit-breaker-monitor.ts` | Monitoring is separate from the dead client |

3. Update `client/src/infrastructure/api/index.ts` to remove exports of deleted clients.

4. If `BaseApiClient` exported any reusable utilities (type helpers, interceptor logic), extract them into a shared utils file before deleting.

### Risk

**Very low.** Zero production usages confirmed. The only risk is if something uses these via dynamic import or re-export chains — the grep above will catch that.

---

## 4. Migration 3 — Graph Module Refactor

### Current State

`server/infrastructure/database/graph/` contains the same files at two structural levels — the original flat layout and a partially completed reorganization into `core/`, `query/`, and `utils/` subdirectories. Both versions coexist.

| Action | Path | Reason |
|--------|------|--------|
| DELETE | `graph/neo4j-client.ts` | Superseded by `graph/core/neo4j-client.ts` |
| DELETE | `graph/batch-sync-runner.ts` | Superseded by `graph/core/batch-sync-runner.ts` |
| DELETE | `graph/sync-executor.ts` | Superseded by `graph/core/sync-executor.ts` |
| DELETE | `graph/transaction-executor.ts` | Superseded by `graph/core/transaction-executor.ts` |
| DELETE | `graph/query-builder.ts` | Superseded by `graph/utils/query-builder.ts` |
| DELETE | `graph/session-manager.ts` | Superseded by `graph/utils/session-manager.ts` |
| DELETE | `graph/engagement-queries.ts` | Superseded by `graph/query/engagement-queries.ts` |
| DELETE | `graph/network-queries.ts` | Superseded by `graph/query/network-queries.ts` |
| DELETE | `graph/advanced-queries.ts` | Superseded by `graph/query/advanced-queries.ts` |
| DELETE | `graph/schema.ts` | Superseded by `graph/core/schema.ts` |

### Completion Steps

1. For each flat file, diff it against its organized equivalent **before deleting**:

```bash
diff graph/neo4j-client.ts graph/core/neo4j-client.ts
diff graph/query-builder.ts graph/utils/query-builder.ts
# etc.
```

If the organized version is missing any logic from the flat version, merge it in first.

2. Find all imports pointing to flat paths and update them:

```bash
grep -r "from.*graph/neo4j-client" server/
grep -r "from.*graph/query-builder" server/
grep -r "from.*graph/session-manager" server/
```

3. Delete the flat files after imports are updated.

4. Update `graph/index.ts` to re-export from organized subdirectories only:

```ts
export * from './core';
export * from './query';
export * from './utils';
```

5. Remaining flat files with no organized equivalent — place into new subdirs:

| Action | Path | Candidate destination |
|--------|------|-----------------------|
| MOVE | `graph/advanced-analytics.ts` | `graph/analytics/` |
| MOVE | `graph/engagement-networks.ts` | `graph/sync/` |
| MOVE | `graph/network-sync.ts` | `graph/sync/` |
| MOVE | `graph/pattern-discovery.ts` | `graph/analytics/` |
| MOVE | `graph/idempotency-ledger.ts` | `graph/core/` |

### Risk

**Medium.** The graph layer has many interdependencies. Updating import paths across the server is mechanical but requires careful verification. Run integration tests against Neo4j after completing.

---

## 5. Migration 4 — Government Data Integration

### Current State

Three implementations identified. Canonical confirmed as `features/government-data/`:

| Action | Path | Reason |
|--------|------|--------|
| KEEP | `features/government-data/services/government-data-integration.service.ts` | CANONICAL — has fallback strategies |
| KEEP | `features/government-data/application/managed-integration.service.ts` | Active wrapper around canonical |
| DELETE | `infrastructure/external-data/government-data-integration.ts` | Multi-source implementation, superseded |
| DELETE | `infrastructure/external-data/government-data-service.ts` | Already commented out (axios dependency issue) |

### Completion Steps

1. Identify all imports of the two `infrastructure/` files:

```bash
grep -r "external-data/government-data" server/
```

2. For each found import, update to point to `features/government-data/`:

```ts
// Before
import { GovernmentDataService } from '@server/infrastructure/external-data/government-data-service';

// After
import { GovernmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service';
```

3. Verify the canonical service exposes equivalent functionality. If the deleted infrastructure version had unique capabilities (e.g., quality metrics), port them to the feature service first.

4. Delete the infrastructure versions.

5. Remove `infrastructure/external-data/` entirely if government data was its only content.

### Risk

**Low-medium.** `government-data-service.ts` is already commented out — zero-risk deletion. The integration file requires import updates which are mechanical once identified.

---

## 6. Migration 5 — Validation Consolidation

> This is the most impactful migration because it affects correctness, not just structure.

### Current State

| Finding | Detail |
|---------|--------|
| `shared/validation/` | Designed as single source of truth. Imported once — in a test file. |
| Email validation | Independently implemented 4+ times across the codebase |
| User role enum | Inconsistent role lists in different files |
| `server/utils/validation.ts` | Parallel to `server/infrastructure/core/validation/` — 0 cross-imports |
| Client validation files | All do runtime Zod validation. None are just type guards. |
| `shared/validation/` usage | Zero imports from client or server production code |

### Target Architecture

```
shared/validation/              ← Layer 1: cross-cutting primitives
  schemas/
    common.ts                   emailSchema, phoneSchema, uuidSchema, urlSchema
                                userRoleSchema, paginationSchema, searchQuerySchema

server/infrastructure/core/validation/   ← Layer 2: server runtime validation
  repository-validation.ts      imports shared primitives, adds DB-specific schemas
  data-validation-service.ts    DB integrity checks
  validation-metrics.ts         observability
  schema-validation-service.ts  DB constraint validation

client/src/[feature]/validation.ts  ← Layer 3: per-domain UI validation
  imports shared primitives for common fields
  adds UI-specific rules (confirmation fields, display constraints)
```

**Critical constraint:** `shared/` must never import from `server/` or `client/`. This prevents circular dependencies.

### Completion Steps

#### Phase A — Build `shared/validation/` foundation (Week 1)

1. Create `shared/validation/schemas/common.ts`:

```ts
import { z } from 'zod';

export const emailSchema = z.string().email().max(254).toLowerCase().trim();
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/);
export const urlSchema = z.string().url().max(2048);

export const userRoleSchema = z.enum(['citizen', 'admin', 'moderator', 'analyst']);

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const searchQuerySchema = z.string()
  .min(1).max(200)
  .refine(q => !/(\b(union|select|insert|update|delete|drop)\b)/i.test(q),
    'Search query contains invalid characters');
```

2. Export from `shared/validation/index.ts`.
3. Write unit tests for each shared schema.

#### Phase B — Server migration (Week 2)

1. Update `server/infrastructure/core/validation/repository-validation.ts` to import from shared:

```ts
import { emailSchema, uuidSchema, phoneSchema, userRoleSchema } from '@shared/validation';
// Remove local redefinitions of these schemas
```

2. Merge `server/utils/validation.ts` into `server/infrastructure/core/validation/`. The utils version is unused but may have unique logic worth preserving.

3. Delete `server/utils/validation.ts` after merging.

4. Ensure `InputValidationService` and `SchemaValidationService` both import from shared primitives.

#### Phase C — Client migration (Week 3)

1. Audit each client validation file for schemas that duplicate shared primitives:

```bash
grep -r "z.string().email" client/src/
grep -r "z.string().uuid" client/src/
grep -rn "enum\(\[.*citizen\|admin" client/src/
```

2. Replace local definitions with shared imports in each file.
3. Validate the role enum is now defined only in `shared/validation/` and imported everywhere else.

### Files to delete after consolidation

| Action | Path | Reason |
|--------|------|--------|
| DELETE | `server/utils/validation.ts` | Merge into `server/infrastructure/core/validation/` |
| DELETE | `server/services/inputValidationService.ts` | Parallel to `infrastructure/core/` — consolidate |
| MERGE | `server/infrastructure/core/validation/input-validation-service.ts` | Absorb `server/services/inputValidationService.ts` |

### Risk

**High effort, low regression risk** if done incrementally. The primary risk is introducing import cycles. The three-layer model above prevents this — enforce it by linting `shared/` imports in CI.

---

## 7. Project Structure — Final Recommendations

### 7.1 Clean the Repository Root

The root contains 50+ session-log documents and temporary fix scripts. These have no place in source control.

**Keep at root level:**
- `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- All configuration files (`package.json`, `tsconfig.json`, `nx.json`, `docker-compose.yml`, etc.)

**Delete:**
- All `SESSION_*.md`, `PROGRESS_*.md`, `COMPLETION_*.md`, `FIXES_APPLIED.md` equivalents
- `.ts` files that are notes (`QUICK_START_FOR_NEXT_SESSION.ts`, `COMPLETION_STRATEGY.ts`)
- `tsc_output.txt`, `tsc-errors.txt`, `type-check-output.txt` — build artifacts, not documentation

**Move to `docs/`:**
- Intentional design decisions worth preserving as ADRs

**Add to `.gitignore`:**

```gitignore
# Session artifacts
SESSION_*.md
PROGRESS_*.md
*_COMPLETION_*.md
tsc-errors.txt
tsc_output*.txt
type-check-output.txt
performance-baselines.json
```

---

### 7.2 Audit and Reclassify `scripts/`

Apply a three-category classification to the 150+ files:

| Category | Criteria | Action |
|----------|----------|--------|
| **Permanent Tooling** | Referenced in `package.json`, `nx.json`, or CI pipeline | Keep, document, move to `tools/` if complex |
| **Completed Migrations** | One-time scripts whose purpose has been fulfilled | Delete — Git history preserves them |
| **Emergency Patches** | Named `fix-last-12.ts`, `fix-final-31.ts`, `emergency-*.ts` | Delete immediately |

Identify which scripts are referenced:

```bash
grep -h 'scripts/' package.json nx.json .github/workflows/*.yml | sort -u
```

---

### 7.3 Git Hygiene — Remove Committed Artifacts

1. Remove timestamped backup directories:

```bash
git rm -r --cached tests/server/error-remediation/tests/reports/backups/
echo 'tests/**/backups/' >> .gitignore
git commit -m 'chore: remove committed backup directories'
```

2. Remove committed merge artifacts:

```bash
git rm client/src/infrastructure/types/community/community-base.ts.orig
git rm client/src/infrastructure/types/community/community-base.ts.rej
echo '*.orig' >> .gitignore
echo '*.rej' >> .gitignore
```

3. Prevent recurrence — add to `.gitignore`:

```gitignore
*.orig
*.rej
backup-*/
**/reports/backups/
```

---

### 7.4 Commit to a Feature Architecture Convention

`server/features/` currently mixes three structural patterns with no enforced rule:

| Pattern | Example features | Characteristic |
|---------|-----------------|----------------|
| Flat | `community/`, `market/` | All files at feature root level |
| Full DDD | `users/`, `recommendation/` | `application/`, `domain/`, `infrastructure/` layers |
| Partial DDD | `search/`, `bills/` | Some DDD layers plus non-standard dirs like `engines/`, `deployment/` |

**Proposed rule:**

**Use Full DDD when the feature has:**
- Its own database entities or repositories
- Domain logic that must be protected from infrastructure concerns
- Multiple application-layer use cases
- More than ~8 files

**Use Flat when the feature is:**
- A thin routing/controller layer delegating to shared infrastructure
- Fewer than ~8 files
- Read-only (queries only, no mutations)

Enforce with an ESLint rule or a `README.md` in `features/` documenting the convention. The `constitutional-intelligence` ambiguity is a direct consequence of this gap.

---

### 7.5 Move `error-remediation/` out of `server/`

`server/error-remediation/` is a self-contained developer tool with its own `package.json`, `tsconfig.json`, and test suite. It has no runtime dependency on server code.

```bash
mv server/error-remediation/ tools/error-remediation/
```

Then:
- Update `pnpm-workspace.yaml` if it references the old path
- Update any CI pipeline references
- Verify it still builds and tests pass from the new location

This follows the existing pattern of `tools/codebase-health/` which is already correctly placed.

---

### 7.6 Resolve Constitutional Intelligence Boundary

Investigation confirmed `constitutional-analysis/` and `constitutional-intelligence/` are intended as separate DDD layers (application vs. domain), not true duplicates. However the boundary is ambiguous and `constitutional-intelligence/` has an empty service file.

**Option A — Clarify and complete the DDD split:**
- Rename for clarity: `constitutional-analysis/` → `constitutional/application/`, `constitutional-intelligence/` → `constitutional/domain/`
- Complete the empty service file or document why it is intentionally empty
- Add a `README.md` to `constitutional/` explaining the DDD split

**Option B — Merge into one module (recommended):**
- Move domain entities from `constitutional-intelligence/` into `constitutional-analysis/domain/`
- Delete `constitutional-intelligence/`
- Simpler, appropriate if the domain layer is genuinely thin

Given the intelligence module is incomplete, **Option B is recommended** unless there is a specific plan to build out the domain layer.

---

## 8. Consolidated Priority Order

All migrations and structural recommendations, sequenced by impact and risk:

| # | Action | Type | Effort | Risk |
|---|--------|------|--------|------|
| 1 | Delete dead API clients (Safe, Authenticated, CircuitBreaker) | Migration | Low (1 day) | Very Low |
| 2 | Git hygiene — remove backups, `.orig`/`.rej` files | Hygiene | Low (2 hrs) | None |
| 3 | Complete CSP migration — flip dev to unified, delete legacy | Migration | Low (1 day) | Low |
| 4 | Clean root-level session documents | Hygiene | Low (2 hrs) | None |
| 5 | Reclassify `scripts/` — delete emergency patches | Hygiene | Medium (3 days) | Low |
| 6 | Complete graph module refactor — delete flat files | Migration | Medium (2 days) | Medium |
| 7 | Consolidate government data — delete `infrastructure/` copies | Migration | Low (1 day) | Low |
| 8 | Move `error-remediation/` to `tools/` | Structure | Low (2 hrs) | Very Low |
| 9 | `shared/validation/` Phase A — build foundation | Migration | Medium (1 week) | Low |
| 10 | `shared/validation/` Phase B — migrate server | Migration | Medium (1 week) | Medium |
| 11 | `shared/validation/` Phase C — migrate client | Migration | Medium (1 week) | Medium |
| 12 | Define and document feature architecture convention | Structure | Low (1 day) | None |
| 13 | Resolve constitutional intelligence boundary (merge or clarify) | Structure | Low (2 days) | Low |

---

*Chanuka · Codebase Architecture Report · Based on validated investigation findings*
