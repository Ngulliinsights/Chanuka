# Implementation Plan

- [x] 1. Establish type system foundation
  - Analyze conflicts between `@types`, `lib/types`, `shared/types`
  - Create `lib/types/index.ts` as main export
  - _Requirements: 1.1, 1.2_

- [x] 2. Refactor core modules (storage, monitoring, security)
  - Create `core/*/types.ts` proxies re-exporting from `lib/types`
  - Update internal imports
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Refactor feature modules (users, bills, community)
  - Remove local type definitions
  - Import from `@client/lib/types`
  - _Requirements: 1.1, 1.2_

- [x] 4. Refactor search and analytics modules
  - Consolidate search types to `lib/types/search.ts`
  - Consolidate analytics types to `lib/types/analytics.ts`
  - _Requirements: 1.1, 1.2_

- [ ] 5. Fix mock data type alignment
  - Update `lib/data/mock/bills.ts` to match `Bill` interface
  - Fix enum imports (use values not types)
  - Resolve `Bill` interface property mismatches
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Fix bill-base.ts duplicate properties
  - Remove duplicate property declarations
  - Verify `urgency`, `complexity`, `lastActionDate` are present
  - _Requirements: 3.1, 4.1_

- [ ] 7. Final verification
  - Run `npx tsc --noEmit`
  - Count remaining errors
  - Update MIGRATION_LOG.md
  - _Requirements: 4.1, 4.2, 4.3_
