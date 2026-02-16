# Import Resolution Fix Plan

## Overview
This document outlines the systematic approach to fix all import resolution errors in the codebase.

## Categories of Import Errors

### 1. Missing Module Exports (TS2307)
Files trying to import from modules that don't exist or aren't properly exported.

### 2. Path Mapping Issues
Incorrect path aliases or missing path configurations in tsconfig.json files.

### 3. Relative Path Issues
Incorrect relative paths (../../../) that don't resolve correctly.

### 4. Cross-Package Import Issues
Client importing from server, or incorrect cross-boundary imports.

## Priority Fixes

### High Priority (Blocking Compilation)

1. **client/src/lib/config/api.ts** - Line 9
   - Error: Cannot find module '../core/api/config'
   - Fix: Update import path or create missing module

2. **client/src/lib/config/index.ts** - Line 3
   - Error: Cannot find module '../lib/config/navigation'
   - Fix: Should be './navigation' (relative to current file)

3. **client/src/lib/contexts/NavigationContext.tsx** - Lines 7, 8, 12
   - Error: Cannot find module '../core/navigation/context' and '../core/navigation/types'
   - Fix: Update to correct paths

4. **client/src/features/bills/ui/ArgumentsTab.tsx** - Line 18
   - Error: Cannot find module '@/types/domains/arguments'
   - Fix: Update to '@shared/types/domains/arguments'

5. **client/src/features/community/hooks/useLegislativeBrief.ts** - Line 10
   - Error: Cannot find module '@/server/features/argument-intelligence'
   - Fix: This is a cross-boundary violation - client shouldn't import from server

### Medium Priority (Type Safety Issues)

6. **Missing password-validation utility**
   - File: client/src/features/users/ui/auth/useLoginForm.ts
   - Fix: Create or locate password validation utility

7. **Missing use-safe-query hook**
   - File: client/src/features/pretext-detection/hooks/usePretextAnalysis.ts
   - Fix: Create or update import path

8. **Missing gestures config**
   - Multiple files importing '@client/config/gestures'
   - Fix: Create gestures config or update imports

### Low Priority (Cleanup)

9. **Deprecated imports**
   - Various files with outdated import paths
   - Fix: Update to new structure

## Execution Strategy

### Phase 1: Fix Path Mappings (30 min)
1. Update tsconfig.json files with correct path aliases
2. Ensure consistency across client/server/shared

### Phase 2: Fix Core Module Imports (1 hour)
1. Fix config module imports
2. Fix navigation context imports
3. Fix API config imports

### Phase 3: Fix Feature Imports (1 hour)
1. Fix cross-boundary violations
2. Update type imports to use @shared
3. Fix relative path issues

### Phase 4: Create Missing Modules (30 min)
1. Create missing utility modules
2. Create missing config modules
3. Add proper exports

### Phase 5: Validation (30 min)
1. Run TypeScript compiler
2. Verify no TS2307 errors remain
3. Run tests to ensure functionality

## Implementation Notes

- Use path aliases consistently (@client, @shared, @server)
- Avoid deep relative paths (../../../)
- Keep client/server boundaries clear
- Document any architectural decisions
