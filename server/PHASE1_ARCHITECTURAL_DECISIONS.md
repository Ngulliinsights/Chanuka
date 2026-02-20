# Phase 1: Architectural Decisions - Implementation Plan

## Decision Confirmed: Keep Repository Pattern (Interpretation B)

**Intent:** Decoupling through repository interfaces, with Drizzle-based implementations

### What This Means:

✅ **KEEP:**
- Repository interfaces (`IBillRepository`, `IUserRepository`, `ISponsorRepository`)
- Drizzle repository implementations (`DrizzleBillRepository`, etc.)
- Repository pattern for core domain entities

✅ **ENSURE:**
- Repository implementations use Drizzle directly (thin wrappers)
- No custom SQL or complex query logic in repositories
- Repositories just wrap Drizzle calls with Result types

❌ **REMOVE:**
- Comments saying "repository removed" (they're misleading)
- Any custom repository implementations that don't use Drizzle
- Direct Drizzle usage in core domain services (should use repositories)

---

## Phase 1 Tasks

### Task 1.1: Clarify Repository Usage Rules

**Create:** `server/docs/REPOSITORY_PATTERN_GUIDE.md`

```markdown
# Repository Pattern Guide

## When to Use Repositories

### ✅ Use Repository Interfaces For:
- **Core domain entities:** Bills, Users, Sponsors, Comments
- **Services in features/*/application/** that work with these entities
- **Domain services** that need to persist/retrieve entities

### ❌ Use Direct Drizzle For:
- **Analytics queries** (read-only, complex joins)
- **Reporting services** (aggregations, statistics)
- **Migration scripts** (one-time operations)
- **Infrastructure services** (caching, monitoring)

## Repository Implementation Rules

### Rule 1: Thin Wrappers Only
```typescript
// ✅ GOOD: Thin wrapper around Drizzle
export class DrizzleBillRepository implements IBillRepository {
  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      const result = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, id))
        .limit(1);
      return Ok(result[0] ?? null);
    } catch (error) {
      return Err(error as Error);
    }
  }
}

// ❌ BAD: Custom query logic
export class CustomBillRepository implements IBillRepository {
  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    // Don't write custom SQL
    const query = `SELECT * FROM bills WHERE id = $1`;
    // Don't add complex business logic here
  }
}
```

### Rule 2: Leverage Drizzle Features
```typescript
// ✅ GOOD: Use Drizzle's query builder
async search(query: string): Promise<Result<Bill[], Error>> {
  try {
    const results = await this.db
      .select()
      .from(bills)
      .where(
        or(
          ilike(bills.title, `%${query}%`),
          ilike(bills.summary, `%${query}%`)
        )
      );
    return Ok(results);
  } catch (error) {
    return Err(error as Error);
  }
}
```

### Rule 3: Result Types for Error Handling
All repository methods return `Result<T, Error>` for consistent error handling.

## Benefits of This Approach

1. **Decoupling:** Services depend on interfaces, not Drizzle directly
2. **Testability:** Can mock `IBillRepository` in tests
3. **Flexibility:** Can swap Drizzle for another ORM later
4. **Simplicity:** Implementations are thin wrappers, not complex
5. **Type Safety:** Drizzle's type safety + Result types
```

---

### Task 1.2: Update Misleading Comments

**Files with "repository removed" comments:**

1. `features/users/application/use-cases/user-registration-use-case.ts`
2. `features/users/application/use-cases/profile-management-use-case.ts`
3. `features/users/domain/services/user-management-domain-service.ts`
4. `features/users/domain/services/user-verification-domain-service.ts`
5. `features/advocacy/domain/services/campaign-domain-service.ts`
6. `features/advocacy/application/action-coordinator.ts`
7. `features/bills/domain/services/bill-notification-service.ts`

**Action:** Update comments to reflect correct pattern:

```typescript
// ❌ OLD (misleading)
// UserRepository interface removed - using direct service calls

// ✅ NEW (accurate)
// Using repository pattern with Drizzle-based implementation for decoupling
```

---

### Task 1.3: Audit Repository Usage

**Check which services should use repositories but don't:**

```bash
# Find services that import databaseService directly
grep -r "from '@server/infrastructure/database'" server/features/*/application/ \
  | grep -v "withTransaction"

# Find services that should use repositories
grep -r "this.db.select()" server/features/*/application/
```

**Expected findings:**
- Some application services use `databaseService` directly
- These should be updated to use repository interfaces

---

### Task 1.4: Move Misplaced Files

#### 1.4.1: Move Services from `server/services/` to Correct Locations

| Current File | New Location | Reason |
|-------------|--------------|---------|
| `services/managed-government-data-integration.ts` | `features/government-data/application/managed-integration.service.ts` | Feature-specific application service |
| `services/external-api-error-handler.ts` | `infrastructure/error-handling/external-api-error-handler.ts` | Infrastructure concern |
| `services/api-cost-monitoring.ts` | `features/monitoring/application/api-cost-monitoring.service.ts` | Feature-specific |
| `services/coverage-analyzer.ts` | `features/coverage/application/coverage-analyzer.service.ts` | Feature-specific |
| `services/enhancedNotificationService.ts` | `infrastructure/notifications/enhanced-notification.service.ts` | Infrastructure |
| `services/inputValidationService.ts` | `infrastructure/core/validation/input-validation.service.ts` | Infrastructure |
| `services/performanceMonitoring.ts` | `infrastructure/observability/monitoring/performance-monitoring.service.ts` | Infrastructure |
| `services/secureSessionService.ts` | `infrastructure/core/auth/secure-session.service.ts` | Infrastructure |
| `services/advancedCachingService.ts` | `infrastructure/cache/advanced-caching.service.ts` | Infrastructure |
| `services/schema-validation-demo.ts` | DELETE | Demo file, not production code |

**Commands:**
```bash
# Create directories if needed
mkdir -p server/features/monitoring/application
mkdir -p server/features/coverage/application

# Move files
mv server/services/managed-government-data-integration.ts \
   server/features/government-data/application/managed-integration.service.ts

mv server/services/external-api-error-handler.ts \
   server/infrastructure/error-handling/external-api-error-handler.ts

mv server/services/api-cost-monitoring.ts \
   server/features/monitoring/application/api-cost-monitoring.service.ts

mv server/services/coverage-analyzer.ts \
   server/features/coverage/application/coverage-analyzer.service.ts

mv server/services/enhancedNotificationService.ts \
   server/infrastructure/notifications/enhanced-notification.service.ts

mv server/services/inputValidationService.ts \
   server/infrastructure/core/validation/input-validation.service.ts

mv server/services/performanceMonitoring.ts \
   server/infrastructure/observability/monitoring/performance-monitoring.service.ts

mv server/services/secureSessionService.ts \
   server/infrastructure/core/auth/secure-session.service.ts

mv server/services/advancedCachingService.ts \
   server/infrastructure/cache/advanced-caching.service.ts

# Delete demo file
rm server/services/schema-validation-demo.ts

# Delete services directory if empty
rmdir server/services 2>/dev/null || echo "Services directory not empty, check remaining files"
```

#### 1.4.2: Update Imports After Moving Files

After moving each file, update all imports:

```bash
# Example for managed-government-data-integration.ts
# Find all files importing it
grep -r "services/managed-government-data-integration" server/

# Update imports
# OLD: from '@server/services/managed-government-data-integration'
# NEW: from '@server/features/government-data/application/managed-integration.service'
```

---

### Task 1.5: Delete Duplicate/Legacy Files

#### 1.5.1: Delete Duplicate Government Data Files

```bash
# These are duplicates of features/government-data/services/
rm server/infrastructure/external-data/government-data-integration.ts
rm server/infrastructure/external-data/government-data-service.ts

# Check if directory is empty
ls server/infrastructure/external-data/
# If only other files remain, keep directory; if empty, delete
```

#### 1.5.2: Delete Temporary Fallback Files (After Fixing Imports)

**DO NOT DELETE YET** - These are needed until imports are fixed:
- `utils/missing-modules-fallback.ts` (37 errors)
- `utils/shared-core-fallback.ts` (10 errors)

**Action:** Mark for deletion after Phase 2 (path alias fixes)

#### 1.5.3: Delete Migration/Cleanup Scripts

```bash
# These are one-time migration scripts, no longer needed
rm server/features/repository-cleanup.ts

# Check for other migration scripts
ls server/scripts/*migration*.ts
ls server/scripts/*cleanup*.ts
# Review and delete completed migration scripts
```

---

### Task 1.6: Fix Repository Interface Imports

**Issue:** Some files import repository interfaces from wrong locations

```typescript
// ❌ WRONG
import type { IBillRepository } from '../../../../bill-repository.interface';

// ✅ CORRECT
import type { IBillRepository } from '@server/domain/interfaces/bill-repository.interface';
```

**Files to fix:**
- `features/bills/application/bills.ts`
- `features/bills/application/bills-repository-service.ts`

---

### Task 1.7: Ensure Core Services Use Repositories

**Audit these services to ensure they use repository interfaces:**

```typescript
// ✅ GOOD: Using repository interface
class BillApplicationService {
  constructor(
    private readonly billRepository: IBillRepository,
    private readonly userRepository: IUserRepository
  ) {}
}

// ❌ BAD: Using databaseService directly in application layer
class BillApplicationService {
  constructor(
    private readonly databaseService: DatabaseService
  ) {}
  
  async getBill(id: string) {
    return await this.databaseService.getDatabase()
      .select()
      .from(bills)
      .where(eq(bills.id, id));
  }
}
```

**Services to audit:**
- `features/bills/application/bill-service.ts`
- `features/bills/application/bill-tracking.service.ts`
- `features/users/application/user-service-direct.ts`
- `features/users/application/users.ts`
- `features/sponsors/application/sponsor-service-direct.ts`

---

## Phase 1 Completion Checklist

- [ ] Task 1.1: Create `REPOSITORY_PATTERN_GUIDE.md`
- [ ] Task 1.2: Update misleading "repository removed" comments (7 files)
- [ ] Task 1.3: Audit repository usage in application services
- [ ] Task 1.4: Move misplaced files from `services/` (9 files)
- [ ] Task 1.5: Delete duplicate/legacy files (3 files now, 2 after Phase 2)
- [ ] Task 1.6: Fix repository interface imports (2 files)
- [ ] Task 1.7: Ensure core services use repositories

---

## Expected Impact

### Files Moved: 9
- From `server/services/` to correct locations
- Reduces confusion about where services belong

### Files Deleted: 3 (now) + 2 (after Phase 2) = 5 total
- Removes duplicates and completed migration scripts
- Reduces codebase size

### Errors Eliminated: ~500
- Files that were moved will have their errors fixed in new locations
- Files that were deleted won't need error fixes

### Clarity Gained: 100%
- Clear rules about when to use repositories vs direct Drizzle
- Consistent pattern across codebase
- No more confusion about "repository removed" comments

---

## Next Steps After Phase 1

Once Phase 1 is complete:
1. **Phase 2:** Run automated path alias fixes (30 minutes)
2. **Phase 3:** Fix TypeScript errors in files that are now in correct locations
3. **Phase 4:** Delete temporary fallback files
4. **Phase 5:** Final validation and testing

---

## Questions Before Starting?

Before I execute Phase 1, please confirm:

1. ✅ Keep repository pattern with Drizzle implementations (Interpretation B)
2. ✅ Move files from `services/` to correct locations
3. ✅ Delete duplicate government data files
4. ✅ Update misleading comments

Should I proceed with executing these tasks?
