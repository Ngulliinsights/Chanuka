# Error Fixing Execution Plan

**Date**: 2026-02-26  
**Status**: 🚀 Ready to Execute  
**Goal**: Systematically fix all type errors in the codebase

## Current Status

### Completed ✅
1. Type consolidation (5 phases) - Committed
2. Schema index simplification - Committed
3. Infrastructure changes reviewed

### Remaining Work
- Fix ~3500 type errors across codebase
- Update imports to use canonical sources
- Address validation framework issues
- Fix strict mode violations

---

## Phase 1: Error Analysis and Categorization (2 hours)

### Goal
Understand the complete error landscape and prioritize fixes

### Tasks

#### 1.1 Run Full Type Check
```bash
cd client && npm run type-check > ../type-errors-client.txt 2>&1
cd ../server && npx tsc --noEmit > ../type-errors-server.txt 2>&1
cd ../shared && npx tsc --noEmit > ../type-errors-shared.txt 2>&1
```

#### 1.2 Categorize Errors
Parse error files and categorize by:
- Error code (TS2305, TS2307, TS2300, etc.)
- File location (client, server, shared)
- Domain (types, validation, API, etc.)
- Severity (blocking, warning, info)

#### 1.3 Create Error Report
Generate report with:
- Total errors by category
- Most common error types
- Files with most errors
- Priority ranking

### Deliverable
- `docs/plans/ERROR-ANALYSIS-REPORT.md`
- Categorized error list
- Priority matrix

---

## Phase 2: Quick Wins - Import Fixes (3-4 hours)

### Goal
Fix easy, high-impact errors related to imports

### Categories to Fix

#### 2.1 Schema Import Updates (~100 errors)
**Problem**: Code importing types from schema index

**Fix Pattern**:
```typescript
// ❌ Before
import { Bill, User } from '@server/infrastructure/schema';

// ✅ After
import { bills, users } from '@server/infrastructure/schema';
import type { Bill, User } from '@shared/types';
```

**Estimated**: 2 hours

#### 2.2 Unused Imports (~100 errors)
**Problem**: Imports that are no longer used

**Fix**: Use ESLint auto-fix
```bash
npx eslint --fix "**/*.ts" --rule "no-unused-vars: error"
```

**Estimated**: 30 minutes

#### 2.3 Missing Exports (~50 errors)
**Problem**: Types not exported from index files

**Fix**: Add missing exports to index files

**Estimated**: 1 hour

#### 2.4 Wrong Import Paths (~50 errors)
**Problem**: Import paths pointing to wrong locations

**Fix**: Update to canonical sources

**Estimated**: 1 hour

### Deliverable
- ~300 errors fixed
- Updated import patterns
- Commit: "fix(imports): update imports to use canonical sources"

---

## Phase 3: Type Definition Fixes (4-5 hours)

### Goal
Fix missing or incorrect type definitions

### Categories to Fix

#### 3.1 Duplicate Type Definitions (~30 errors)
**Problem**: Same type defined in multiple places

**Fix**: Remove duplicates, use canonical source

**Estimated**: 1.5 hours

#### 3.2 Missing Type Definitions (~50 errors)
**Problem**: Types referenced but not defined

**Fix**: Add missing type definitions or imports

**Estimated**: 2 hours

#### 3.3 Type Conflicts (~20 errors)
**Problem**: Conflicting type definitions

**Fix**: Resolve conflicts, use canonical source

**Estimated**: 1.5 hours

### Deliverable
- ~100 errors fixed
- Consistent type definitions
- Commit: "fix(types): resolve type definition conflicts"

---

## Phase 4: Validation Framework Fixes (4-6 hours)

### Goal
Fix validation framework errors

### Categories to Fix

#### 4.1 Result Type Errors (~40 errors)
**Problem**: Incorrect usage of Result<T, E> type

**Fix**: Update to correct Result type pattern

**Estimated**: 2 hours

#### 4.2 Schema Validation Errors (~20 errors)
**Problem**: Schema definitions don't match validators

**Fix**: Update schemas or validators

**Estimated**: 2 hours

#### 4.3 Validation Context Errors (~10 errors)
**Problem**: Missing or incorrect validation context

**Fix**: Add proper validation context

**Estimated**: 1 hour

### Deliverable
- ~70 errors fixed
- Working validation framework
- Commit: "fix(validation): resolve validation framework errors"

---

## Phase 5: Strict Mode Violations (8-12 hours)

### Goal
Fix TypeScript strict mode violations

### Categories to Fix

#### 5.1 Possibly Undefined (~200 errors)
**Problem**: Variables that might be undefined

**Fix Patterns**:
```typescript
// ❌ Before
const name = user.name.toUpperCase();

// ✅ After - Option 1: Optional chaining
const name = user.name?.toUpperCase();

// ✅ After - Option 2: Null check
const name = user.name ? user.name.toUpperCase() : '';

// ✅ After - Option 3: Non-null assertion (if certain)
const name = user.name!.toUpperCase();
```

**Estimated**: 6 hours

#### 5.2 Implicit Any (~100 errors)
**Problem**: Variables with implicit any type

**Fix**: Add explicit types

**Estimated**: 3 hours

#### 5.3 Missing Override Modifiers (~10 errors)
**Problem**: Methods override parent but missing keyword

**Fix**: Add `override` keyword

**Estimated**: 30 minutes

### Deliverable
- ~310 errors fixed
- Strict mode compliant code
- Commit: "fix(types): resolve strict mode violations"

---

## Phase 6: Complex Fixes (Variable, 10-15 hours)

### Goal
Fix remaining complex errors

### Categories

#### 6.1 API Contract Errors
- WebSocket type errors
- API endpoint type mismatches
- Request/response type issues

#### 6.2 Redux Type Errors
- Action type issues
- Reducer type problems
- Selector type errors

#### 6.3 Component Type Errors
- Props type mismatches
- Event handler types
- Ref type issues

#### 6.4 Other Complex Issues
- Generic type constraints
- Conditional types
- Mapped types

### Approach
- Fix one category at a time
- Test after each fix
- Commit frequently

### Deliverable
- All remaining errors fixed
- Multiple commits by category

---

## Execution Strategy

### Daily Plan

**Day 1** (6 hours):
- Morning: Phase 1 - Error analysis (2 hours)
- Afternoon: Phase 2 - Start import fixes (4 hours)

**Day 2** (6 hours):
- Morning: Phase 2 - Complete import fixes (2 hours)
- Afternoon: Phase 3 - Type definition fixes (4 hours)

**Day 3** (6 hours):
- Morning: Phase 3 - Complete type fixes (1 hour)
- Afternoon: Phase 4 - Validation framework (5 hours)

**Day 4** (6 hours):
- Phase 5 - Strict mode violations (6 hours)

**Day 5** (6 hours):
- Phase 5 - Complete strict mode (2 hours)
- Phase 6 - Start complex fixes (4 hours)

**Day 6-7** (12 hours):
- Phase 6 - Complete complex fixes
- Final testing and validation

**Total**: ~42 hours over 7 days

### Commit Strategy

**Frequent, Atomic Commits**:
- Commit after each category of fixes
- Clear commit messages
- Easy to revert if needed

**Example Commits**:
1. `fix(imports): update schema imports to use canonical sources`
2. `fix(imports): remove unused imports`
3. `fix(types): add missing type exports`
4. `fix(types): resolve duplicate type definitions`
5. `fix(validation): update Result type usage`
6. `fix(types): add null checks for possibly undefined`
7. `fix(types): add explicit types for implicit any`

### Testing Strategy

**After Each Phase**:
- Run type-check
- Verify error count decreased
- Test affected features
- Commit if tests pass

**Continuous Validation**:
```bash
# Watch mode for continuous feedback
npx tsc --noEmit --watch
```

---

## Tools and Scripts

### Error Analysis Script
```bash
#!/bin/bash
# analyze-errors.sh

echo "Running type checks..."
cd client && npm run type-check 2>&1 | tee ../errors-client.txt
cd ../server && npx tsc --noEmit 2>&1 | tee ../errors-server.txt

echo "Analyzing errors..."
grep "error TS" errors-client.txt | cut -d: -f4 | sort | uniq -c | sort -rn > error-summary.txt

echo "Error summary:"
cat error-summary.txt
```

### Import Update Script
```bash
#!/bin/bash
# update-imports.sh

# Find files importing from schema
grep -r "from '@server/infrastructure/schema'" --include="*.ts" -l | \
while read file; do
  echo "Updating $file"
  # Add logic to update imports
done
```

### Progress Tracker
```bash
#!/bin/bash
# track-progress.sh

TOTAL=$(grep "error TS" errors-*.txt | wc -l)
echo "Total errors: $TOTAL"
echo "Progress: $((100 - (TOTAL * 100 / 3500)))%"
```

---

## Success Criteria

### Phase Completion
- [ ] Phase 1: Error analysis complete
- [ ] Phase 2: Import fixes complete (~300 errors fixed)
- [ ] Phase 3: Type definition fixes complete (~100 errors fixed)
- [ ] Phase 4: Validation fixes complete (~70 errors fixed)
- [ ] Phase 5: Strict mode fixes complete (~310 errors fixed)
- [ ] Phase 6: Complex fixes complete (remaining errors)

### Final Goal
- [ ] Zero type errors in client
- [ ] Zero type errors in server
- [ ] Zero type errors in shared
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team trained on new patterns

---

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Test thoroughly, commit frequently, maintain rollback plan

### Risk 2: Time Overrun
**Mitigation**: Prioritize high-impact fixes, accept some errors may remain

### Risk 3: New Errors Introduced
**Mitigation**: Run type-check after each fix, automated testing

### Risk 4: Team Disruption
**Mitigation**: Clear communication, migration guides, training

---

## Next Immediate Steps

1. **Start Phase 1** - Error Analysis
   ```bash
   cd client && npm run type-check > ../type-errors-client.txt 2>&1
   ```

2. **Review Error Report**
   - Categorize errors
   - Identify patterns
   - Prioritize fixes

3. **Begin Phase 2** - Import Fixes
   - Start with schema imports
   - Use automated tools where possible
   - Test and commit frequently

---

**Status**: 🚀 Ready to Execute  
**Start Date**: 2026-02-26  
**Estimated Completion**: 2026-03-05 (7 days)  
**Owner**: Development Team
