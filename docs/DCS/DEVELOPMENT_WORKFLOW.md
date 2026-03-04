# Development Workflow & Standards

**Extracted From:** CONTRIBUTING.md (January 2026)  
**Purpose:** Standard process for all development work  
**For Questions About:** How to start a feature, how to track changes, standards

---

## Core Principles

1. **All changes are tracked** - No unlogged refactors
2. **Migrations are explicit** - Changes to architecture must be logged
3. **Code standards are enforced** - Linting must pass before commit
4. **Documentation is maintained** - Code context travels with code

---

## Starting a New Feature or Major Change

### Step 1: Check for Conflicts

Before starting, verify no other work conflicts with yours:

```bash
# View active migrations
open docs/MIGRATION_LOG.md
```

Look for your area in the **Active Migrations** section. If someone else is working on the same area, coordinate with them.

### Step 2: Create a Migration Tracking Entry

Add your work to `docs/MIGRATION_LOG.md`:

```markdown
| Change | Owner | Status | Plan | Started | Completed |
|--------|-------|--------|------|---------|-----------|
| [Your Feature] | Your Name | 🟡 In Progress | [Link] | 2026-03-04 | |
```

This prevents duplicate effort and helps future developers understand what was done and why.

### Step 3: Create an Implementation Plan

For complex changes, document your approach:

```markdown
# Implementation Plan: [Feature Name]

## Scope
- What you're building
- What you're NOT building
- Why this approach

## Design Decisions
- Architecture choices
- Trade-offs considered
- Future considerations

## Phases
1. Phase 1: ...
2. Phase 2: ...
3. Phase 3: ...

## Testing Strategy
- Unit tests
- Integration tests
- Edge cases

## Rollback Plan
- What to undo if things go wrong
- How to verify rollback succeeded
```

Link this plan in MIGRATION_LOG.md so others can understand your approach.

---

## During Development

### Keep Status Updated

As you work, update your migration entry in `docs/MIGRATION_LOG.md`:

```markdown
| Change | Owner | Status | Plan | Started | Completed |
|--------|-------|--------|------|---------|-----------|
| [Your Feature] | Your Name | 🟡 In Progress | [Link] | 2026-03-04 | |
                  ↑
       Change status as you go:
       🟡 In Progress → 🟢 Completed → (move to history)
```

### Reference Your Migration in PRs

When creating pull requests, reference the migration entry:

```
Fixes: [Feature Name] (see docs/MIGRATION_LOG.md)
Closes: #123

## Changes
- Added feature X
- Updated feature Y
- Removed legacy code Z

## Testing
- Unit tests: X cases
- Integration: Y cases
- Manual: Z scenarios
```

### Follow Code Standards

All code must pass checks:

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting
npx eslint .

# Formatting
npx prettier --check .

# Tests
pnpm test
```

**Before committing**, run all checks:
```bash
npx tsc --noEmit && npx eslint . && pnpm test
```

---

## Completing Your Work

### Step 1: Verify No "Ghost Code"

"Ghost code" is unused files or exports left behind. Before marking complete:

```bash
# Find unused files
npx tsc --noEmit  # Reports unused variables
npx knip         # Reports unused files/exports

# Delete unused files
git rm src/old-file.ts
git rm src/features/old-feature/  # entire folder
```

Use your IDE's "Find All References" to check if something is actually used.

### Step 2: Move Migration to History

Once complete, move your entry in `docs/MIGRATION_LOG.md` from **Active Migrations** to **Migration History**:

```markdown
## Active Migrations
(remove your entry)

## Migration History (Completed)
| Change | Owner | Status | Plan | Started | Completed |
|--------|-------|--------|------|---------|-----------|
| [Your Feature] | Your Name | 🟢 Completed | [Link] | 2026-03-04 | 2026-03-10 |
                                ↑
                            Status changed to Completed
```

### Step 3: Document Completion

Log what was accomplished in your plan document or create a summary:

```markdown
# [Feature Name] - Completion Summary

## What Was Built
- Feature X: 100% (200 SLOC)
- Feature Y: 100% (150 SLOC)
- Tests: 45 test cases

## Architecture Decisions
- Used pattern X because...
- Deferred Y because...

## Known Limitations
- Current implementation assumes Z
- Performance could be optimized by W

## Next Steps
- (link to follow-up work)
```

---

## Documentation Requirements

Keep documentation in the designated folders:

### Architecture Reference
**Location:** `docs/DCS/ARCHITECTURE.md`  
**Use for:** Understanding module structure, design patterns, constraints

### Feature Definitions
**Location:** `docs/DCS/CORE_FEATURES.md`  
**Use for:** Feature scope, integration status, what needs building

### Change Log
**Location:** `docs/CHANGELOG.md`  
**Use for:** Historical record of releases and major changes

### Development Context
**Location:** `docs/CODEBASE_CONTEXT.md`  
**Use for:** IDE-agnostic strategic reference for new developers

### Migration Tracking
**Location:** `docs/MIGRATION_LOG.md`  
**Use for:** Track active/completed work, prevent duplicate effort

### Deployment Standards
**Location:** `docs/DCS/` (various files)  
**Use for:** How to deploy, critical issues, workflows

---

## AI-Assisted Development

### Before Starting a Session

If using an AI coding assistant:

1. Point it to `docs/DCS/ARCHITECTURE.md` for context
2. Share `docs/MIGRATION_LOG.md` to see what's active
3. Link the implementation plan you created
4. Define the scope clearly (what to build, what not to)

### During the Session

- Save intermediate progress regularly
- Document architectural decisions made
- Note any issues discovered
- Keep the implementation plan synchronized

### After the Session

**CRITICAL:** Log the session outcome in `docs/MIGRATION_LOG.md` before closing:

```markdown
## Session: [Date] - [Feature Name]

### Accomplished
- Completed X
- Fixed issue Y
- Identified issue Z

### Next Steps
- Continue with phase 2
- Address issue Z (detailed in ###Z below)

### ###Z - Memory Leak in Event Handlers
- Location: NotificationService.subscribe()
- Impact: Moderate - accumulates over time
- Fix: Add cleanup function to listeners
- Estimate: 2 hours
```

This ensures continuity if someone picks up the work later.

### Preserve Artifacts

Keep implementation/planning documents with your code:

```
brain/
├── [feature-name]/
│   ├── task.md          ← What you're working on
│   ├── implementation_plan.md  ← Your approach
│   └── notes.md         ← Issues found, decisions made
└── SESSION_SUMMARY.md   ← What was accomplished this session
```

These artifacts help successors understand context without re-discovering everything.

---

## Pre-Commit Verification Checklist

Before committing, verify:

```bash
# 1. TypeScript kompiles without errors increasing
npx tsc --noEmit              # Record current count
# (Should not increase from before you started)

# 2. Linting passes
npx eslint .

# 3. Formatting is correct
npx prettier --check .

# 4. Tests pass
pnpm test

# 5. No deleted files left behind
git status  # Clean working directory

# 6. Commit message references migration tracking
git commit -m "feature: implement X (see docs/MIGRATION_LOG.md)"
```

---

## Common Patterns

### Creating a New Feature

```typescript
// 1. Create folder
mkdir -p server/features/my-feature

// 2. Create files (use as boilerplate)
touch server/features/my-feature/{routes,service,repository,validation,types}.ts

// 3. Define validation schema
// → validation.ts (use Zod)

// 4. Define types
// → types.ts

// 5. Implement repository (DB queries)
// → repository.ts

// 6. Implement service (business logic)
// → service.ts

// 7. Define routes (HTTP endpoints)
// → routes.ts

// 8. Add to main server file
// → server/index.ts (import routes)

// 9. Create tests
mkdir -p tests/features/my-feature
touch tests/features/my-feature/{service,repository}.test.ts

// 10. Create shared types
touch shared/types/features/my-feature.ts

// 11. Update MIGRATION_LOG.md
```

### Modifying Validation

```typescript
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(['active', 'inactive']),
});

// When modifying, extend the schema
export const updateItemSchema = createItemSchema.partial();

// Use in routes
export async function updateItem(req, res) {
  const validated = updateItemSchema.parse(req.body);
  // Process validated data
}
```

### Error Handling

```typescript
import { logger } from 'shared/core/observability';

try {
  const result = await operation();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed', { error });
  res.status(500).json({ success: false, message: 'Failed' });
}
```

---

## Getting Help

### Questions About Architecture
→ See `docs/DCS/ARCHITECTURE.md`

### Questions About Features
→ See `docs/DCS/CORE_FEATURES.md`

### Questions About Standards
→ See `CONTRIBUTING.md` (this file)

### Questions About Known Issues
→ See `docs/DCS/SECURITY_STATUS.md`

### Questions About What Was Built
→ Check `docs/MIGRATION_LOG.md` for completed work

### Questions About Setup
→ See `README.md` and `docs/DCS/QUICK_REFERENCE.md`

