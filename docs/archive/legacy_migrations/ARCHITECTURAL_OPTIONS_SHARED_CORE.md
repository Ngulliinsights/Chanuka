# Architectural Options: Resolving shared/core Confusion

**Context:** Server infrastructure lives in `shared/core/` instead of a server-specific location, creating confusion about what's "shared" vs "server-only".

**Impact:** Type bloat and module organization issues stem partly from this confusion.

---

## The Core Problem

### Current Structure
```
shared/core/
├── observability/     ← Server-only (logging, error management, tracing)
├── caching/           ← Server-only (cache implementation)
├── validation/        ← Server-only (validation schemas)
├── middleware/        ← Server-only (Express middleware)
├── performance/       ← Server-only (server monitoring)
├── config/            ← Server-only (server configuration)
├── types/             ← Partially shared (auth.ts, flags.ts are shared)
├── utils/             ← Mix of shared and server utilities
└── primitives/        ← Shared (enums, constants, basic types)
```

**Issue:** Module is named "shared" but 80% is server-only

---

## Three Solution Options

### Option 1: Document Current Architecture (RECOMMENDED)

**What to do:**
1. Create `ARCHITECTURE.md` explaining:
   - Why `shared/core` contains server infrastructure
   - What parts are shared vs server-only
   - How to distinguish between them
2. Add comments in `shared/core/index.ts` explaining purpose
3. Update `README.md` with architecture diagram

**Pros:**
- Minimal code changes (zero breaking changes)
- Lowest risk implementation
- Can be done in 1-2 hours
- Developers understand intent immediately
- Can transition to Option 2 or 3 later if needed

**Cons:**
- Doesn't fix underlying organizational issue
- Still confusing at first glance
- Type bloat not structurally resolved

**Code Changes Required:**
```typescript
// Add to shared/core/index.ts
/**
 * ARCHITECTURE NOTE:
 * 
 * Despite the name "shared", this module contains primarily SERVER infrastructure:
 * - observability/ (server logging & monitoring)
 * - caching/ (server cache implementation)
 * - validation/ (server validation schemas)
 * - middleware/ (Express middleware)
 * - performance/ (server monitoring)
 * - config/ (server configuration)
 * 
 * Shared items only: primitives/, types/auth, types/feature-flags, specific utils
 * 
 * RECOMMENDATION: In future, these server modules should move to server/core/
 * But this requires updating 30+ import statements, so keeping here for now.
 */
```

**Timeline:** 1-2 hours  
**Risk Level:** 🟢 **MINIMAL**

---

### Option 2: Gradual Module Relocation (MEDIUM RISK)

**What to do:**
1. Create `server/core/` directory structure
2. Move one module at a time:
   - observability/ → server/core/observability/
   - caching/ → server/core/caching/
   - validation/ → server/core/validation/
   - middleware/ → server/core/middleware/
   - performance/ → server/core/performance/
   - config/ → server/core/config/
3. Update imports in all files
4. Delete from shared/core/
5. Test after each move

**Pros:**
- Proper architectural separation
- Low risk per module (one at a time)
- Can pause if issues found
- Clear intent (server code in server/ folder)
- Easier to manage going forward

**Cons:**
- More work (need to update imports for each module)
- Multiple commits/changes required
- Risk accumulates if not tested thoroughly
- Some interdependencies may complicate moves

**Estimated Work per Module:**
```
1. Create target dir in server/core/
2. Move files: git mv shared/core/X server/core/X
3. Find & replace imports:
   - from '@shared/core/X' → from 'server/core/X'
   - Affects: 5-15 files per module
4. Test module
5. Commit

Time per module: 1-2 hours
```

**Total Time:** 8-12 hours (6 modules × 1-2 hours each)

**Risk Level:** 🟡 **MEDIUM** (high complexity, but incremental)

**Recommended Order:**
1. observability/ (most imports, but most critical)
2. caching/ (high impact, many imports)
3. validation/ (medium impact)
4. performance/ (lower impact)
5. middleware/ (lower impact)
6. config/ (lowest impact)

---

### Option 3: Rename Folder (Mass Refactor - HIGH RISK)

**What to do:**
1. Rename `shared/core/` → `server/core/`
2. Update all ~30 import paths at once:
   - from '@shared/core/' → from '@shared/server/core/' (OR adjust path mapping)
3. Update TypeScript path mappings (if using)
4. Run full test suite

**Pros:**
- Quickest structural fix (one big change)
- Clearest intent immediately
- All modules moved at once

**Cons:**
- High risk of breaking things (one-shot change)
- Hard to debug if something breaks
- Can't roll back incrementally
- Many files touch at once = merge conflicts likely
- Import path changes affect 30+ files simultaneously

**Estimated Work:** 4-6 hours
- 1 hour: Rename folder + initial imports
- 2 hours: Find & replace across codebase
- 2 hours: Testing & fixing any issues
- 1 hour: Documentation updates

**Risk Level:** 🔴 **HIGH** (single point of failure)

---

## Comparison Table

| Factor | Option 1 (Document) | Option 2 (Gradual) | Option 3 (Rename) |
|--------|---|---|---|
| **Time Required** | 1-2 hours | 8-12 hours | 4-6 hours |
| **Breaking Changes** | None | None | None* |
| **Risk Level** | 🟢 Minimal | 🟡 Medium | 🔴 High |
| **Effort per change** | Documentation | 1-2 hrs per module | Single large change |
| **Rollback difficulty** | Easy (undo docs) | Medium (revert module) | Hard (revert all) |
| **Type bloat fix** | 30% | 80% | 100% |
| **Architecture clarity** | 60% | 95% | 100% |
| **Recommended for** | Immediate clarity | Future cleanup | Long-term goal |

*Option 3 has no breaking changes but high risk of introducing bugs

---

## Recommendation: Staged Approach

### Now (Today)
Execute **Option 1 (Document):**
- Create ARCHITECTURE.md
- Add JSDoc comments to shared/core/index.ts
- Update README with diagram
- Developers understand what's happening
- **No risk, immediate clarity**

### Later (Sprint 2-3)
Consider **Option 2 (Gradual Relocation):**
- After documenting, modules are clearer
- Can move 1-2 per sprint with confidence
- Reduces risk through incremental change
- Real architectural improvement

### Eventually (Not Soon)
Consider **Option 3 (Rename)** - Only after Option 2 is mostly done

---

## Implementation Guide: Option 1 (Recommended)

### Step 1: Create ARCHITECTURE.md

```markdown
# Project Architecture

## Module Organization

### shared/core/
Despite the name, this module contains primarily SERVER infrastructure.
Shared-only items are in `primitives/` and specific `types/`.

**Server-Only Modules:**
- `observability/` - Logging, error management, tracing, metrics
- `caching/` - Cache implementation and utilities
- `validation/` - Server-side validation schemas
- `middleware/` - Express middleware
- `performance/` - Server performance monitoring
- `config/` - Server configuration

**Truly Shared:**
- `primitives/` - Constants, enums, basic types
- `types/auth.ts` - Authentication types (client + server)
- `types/feature-flags.ts` - Feature flags (client + server)
- `utils/string-utils.ts`, `number-utils.ts`, etc. - Generic utilities

## Future Refactoring

These server modules should eventually move to `server/core/` but this
requires updating 30+ import statements. Keeping here for now for stability.
```

### Step 2: Update shared/core/index.ts

Add comment at top:
```typescript
/**
 * Shared Core - MOSTLY SERVER INFRASTRUCTURE
 * 
 * IMPORTANT: Despite the "shared" name, this module is 80% server-only:
 * - observability/ - Server logging and monitoring
 * - caching/ - Server cache implementation
 * - validation/ - Server validation schemas
 * - middleware/ - Express middleware
 * - performance/ - Server monitoring
 * - config/ - Server configuration
 * 
 * Truly shared items:
 * - primitives/ - Constants and enums
 * - types/auth.types.ts - Authentication types
 * - types/feature-flags.ts - Feature flags
 * - Specific utilities (string-utils, number-utils, type-guards, etc.)
 * 
 * ARCHITECTURE NOTE: These server modules should ideally be in server/core/
 * but that refactoring would require updating 30+ import statements.
 * Current approach: Organized by function rather than by deployment target.
 */
```

### Step 3: Update README.md

Add architecture section:
```markdown
## Architecture

### Module Organization

```
client/
├── src/
│   ├── core/       - Client business logic
│   ├── features/   - Feature modules
│   ├── shared/     - Shared client code
│   └── components/ - React components

server/
├── features/       - Feature routers/controllers
├── infrastructure/ - Server infrastructure (database, auth, etc.)
├── middleware/     - Express middleware
└── storage/        - Data storage layer

shared/
├── core/           - MOSTLY SERVER INFRASTRUCTURE (see docs/ARCHITECTURE.md)
│   ├── observability/ (server)
│   ├── caching/      (server)
│   ├── validation/   (server)
│   ├── middleware/   (server)
│   ├── config/       (server)
│   ├── primitives/   (shared)
│   └── types/        (mostly shared)
├── types/           - Shared type definitions
└── db/              - Database types and utilities
```
```

### Time & Effort
- Create ARCHITECTURE.md: 30 minutes
- Update shared/core/index.ts: 15 minutes
- Update README.md: 15 minutes
- Review & polish: 15 minutes
- **Total: 1.5 hours**

---

## Your Decision

**Which option would you like to pursue?**

1. **Option 1 (Document)** - Lowest risk, immediate clarity, 1-2 hours
2. **Option 2 (Gradual)** - Best long-term, 8-12 hours, can do incrementally
3. **Option 3 (Rename)** - Fastest large change, 4-6 hours, higher risk
4. **None for now** - Focus on other improvements first

My recommendation: **Start with Option 1 (Document) now**, then plan Option 2 (Gradual) for a future sprint.

