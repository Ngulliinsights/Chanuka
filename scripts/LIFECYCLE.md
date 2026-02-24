# Script Lifecycle Policy

**Effective Date:** February 24, 2026  
**Status:** Active

## Purpose
Prevent accumulation of obsolete scripts by establishing clear lifecycle rules.

---

## Script Categories

### 1. Permanent Tooling ✅
- **Definition:** Scripts referenced in package.json or CI/CD workflows
- **Naming:** Descriptive, no prefix (e.g., `scan-type-violations.ts`)
- **Location:** `scripts/` root or organized subdirectories
- **Lifecycle:** Maintained indefinitely
- **Requirements:**
  - Must have JSDoc with purpose, usage, and examples
  - Must have corresponding npm script or CI/CD reference
  - Must be documented in scripts/README.md

### 2. One-Time Migration ⏳
- **Definition:** Scripts for one-time codebase transformations
- **Naming:** `migrate-*` prefix (e.g., `migrate-imports.ts`)
- **Location:** `scripts/` root during execution
- **Lifecycle:** Archive within 1 week of completion
- **Requirements:**
  - Must have completion criteria in JSDoc
  - Must be moved to `scripts/archived-migration-tools/` after completion
  - Must include completion date in archive

### 3. Emergency Patch 🚨
- **Definition:** Quick fixes for urgent issues
- **Naming:** `fix-*` prefix (e.g., `fix-import-paths.ts`)
- **Location:** `scripts/` root during execution
- **Lifecycle:** Delete within 2 weeks or convert to permanent tool
- **Requirements:**
  - Must have issue reference in JSDoc
  - Must be deleted after fix is integrated into codebase
  - If fix is reusable, convert to template in `fix-templates.ts`

---

## Rules

### Creation Rules
1. All new scripts must declare their category in JSDoc
2. Migration and emergency scripts must have completion criteria
3. Permanent scripts must have npm script or CI/CD reference
4. No script should duplicate existing functionality

### Maintenance Rules
1. Review scripts quarterly for obsolescence
2. Archive completed migrations immediately
3. Delete emergency patches after integration
4. Update README.md when adding permanent scripts

### Enforcement
- Pre-commit hook prevents new `fix-*` or `migrate-*` without justification
- Quarterly audit identifies scripts for archival/deletion
- CI fails if scripts lack proper documentation

---

## Examples

### Good: Permanent Tool
```typescript
/**
 * Scan codebase for type safety violations
 * 
 * Category: Permanent Tooling
 * Usage: npm run scan:type-violations
 * Output: analysis-results/type-violations.json
 */
```

### Good: Migration Script
```typescript
/**
 * Migrate imports from old structure to FSD
 * 
 * Category: One-Time Migration
 * Completion: When all imports use @client/* aliases
 * Archive: After running successfully on all files
 */
```

### Bad: Undocumented Fix
```typescript
// Quick fix for import issue
// TODO: Remove this later
```

---

## Archival Process

### For Migration Scripts
1. Verify completion criteria met
2. Move to `scripts/archived-migration-tools/`
3. Add completion date to filename or JSDoc
4. Update CLASSIFICATION.md

### For Emergency Patches
1. Verify fix is integrated into codebase
2. Delete script entirely
3. If reusable, add pattern to `fix-templates.ts`
4. Update CLASSIFICATION.md

---

## Quarterly Audit Checklist

- [ ] Identify scripts without npm/CI references
- [ ] Check for completed migrations not yet archived
- [ ] Check for emergency patches older than 2 weeks
- [ ] Verify all permanent scripts are documented
- [ ] Update CLASSIFICATION.md
- [ ] Update README.md

---

**Last Updated:** February 24, 2026  
**Next Review:** May 24, 2026
