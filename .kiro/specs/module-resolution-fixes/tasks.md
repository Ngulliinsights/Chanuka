# Module Resolution Fixes - Tasks

## Task List

- [ ] 1. Fix community.ts imports and error handling
  - [ ] 1.1 Update import statements to use correct paths
  - [ ] 1.2 Replace error classes with factory functions
  - [ ] 1.3 Remove non-existent imports (createErrorContext, contentModerationService)
  - [ ] 1.4 Add proper type annotations for Request parameters
  - [ ] 1.5 Verify all imports resolve correctly

- [ ] 2. Fix comment.ts imports (if needed)
  - [ ] 2.1 Verify cache service import
  - [ ] 2.2 Verify observability import
  - [ ] 2.3 Verify database import
  - [ ] 2.4 Verify schema imports

- [ ] 3. Fix comment-voting.ts imports (if needed)
  - [ ] 3.1 Verify cache service import
  - [ ] 3.2 Verify observability import
  - [ ] 3.3 Verify database import
  - [ ] 3.4 Verify schema imports

- [ ] 4. Fix user-profile.ts imports
  - [ ] 4.1 Verify user_verification is exported from schema
  - [ ] 4.2 Fix any missing schema exports
  - [ ] 4.3 Add proper type annotations

- [ ] 5. Verify TypeScript compilation
  - [ ] 5.1 Run tsc --noEmit on server directory
  - [ ] 5.2 Verify zero errors in affected files
  - [ ] 5.3 Check for any remaining implicit any types

- [ ] 6. Test module resolution
  - [ ] 6.1 Verify all @server/* paths resolve
  - [ ] 6.2 Verify all @shared/* paths resolve
  - [ ] 6.3 Check for circular dependencies

## Notes
- Focus on fixing imports first, then error handling, then types
- Test after each major change
- Commit working changes incrementally
