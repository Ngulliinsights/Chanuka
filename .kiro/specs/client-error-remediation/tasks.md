# Implementation Plan: Client TypeScript Error Remediation

## Overview

This plan systematically remediates 360 TypeScript errors across 122 files by completing the incomplete FSD migration. The approach follows six phases executed in strict dependency order:

1. **Module Location Discovery** - Find where deleted/relocated modules now exist in FSD structure
2. **Import Path Updates** - Update all imports to use new FSD paths
3. **Type Standardization** - Consolidate fragmented types and standardize ID types
4. **Interface Completion** - Complete partially migrated interfaces
5. **Type Safety** - Add explicit types, fix comparisons, handle undefined safety
6. **Import Cleanup & Validation** - Remove unused imports and verify zero errors

**Critical Principle**: No stubs, adapters, or compatibility layers will be created. All fixes use actual relocated modules in their new FSD locations.

## Current Status

**Completed:**
- ✅ Infrastructure setup (Task 1)
- ✅ Error analysis system (Tasks 2-3)
- ✅ Fix generation system (Tasks 4)
- ✅ Batch processing system (Task 5)
- ✅ Type validation system (Task 6)
- ✅ Progress tracking system (Task 7)
- ✅ Core infrastructure verification (Task 8)
- ✅ Phase 1: Module Location Discovery (Tasks 9)
- ✅ Phase 2: Import Path Updates (Tasks 10-11)

**Next Steps:**
- 🔄 Phase 3: Type Standardization (Task 12)
- ⏳ Phase 4: Interface Completion (Task 13-14)
- ⏳ Phase 5: Type Safety (Task 15)
- ⏳ Phase 6: Import Cleanup & Validation (Tasks 16-17)

## Tasks

- [x] 1. Set up error remediation infrastructure
  - Create `scripts/error-remediation/` directory structure
  - Set up TypeScript compiler API integration for error detection
  - Configure ts-morph for AST manipulation and code generation
  - Set up fast-check for property-based testing
  - Create remediation configuration file with FSD layer paths and settings
  - Set up vitest for unit and integration testing
  - _Requirements: 21.1_

- [x] 2. Implement error analysis system
  - [x] 2.1 Create ErrorAnalyzer class
    - Implement `analyzeErrors()` to scan codebase using TypeScript compiler API
    - Implement `categorizeErrors()` to group errors by category and file
    - Implement `determineDependencyOrder()` to order fixes by dependencies
    - _Requirements: 21.1, 21.2_
  
  - [x] 2.2 Write property test for error categorization
    - **Property 11: Error Count Monotonicity**
    - **Validates: Requirements 20.2, 21.4**
  
  - [x] 2.3 Create FSD structure discovery
    - Implement `discoverModuleRelocations()` to find relocated modules in FSD structure
    - Implement fuzzy matching algorithm for module name similarity (80% threshold)
    - Implement `mapOldPathsToFSD()` to map old import paths to new FSD locations
    - _Requirements: 1.1-1.7_
  
  - [x] 2.4 Write property test for module location discovery
    - **Property 1: Module Location Discovery Accuracy**
    - **Validates: Requirements 1.1-1.7**

- [x] 3. Checkpoint - Verify error analysis
  - Run error analysis on client codebase
  - Verify 360 errors are detected and categorized
  - Review discovered module relocations
  - Ensure all tests pass, ask the user if questions arise

- [x] 4. Implement fix generation system
  - [x] 4.1 Create FixGenerator class
    - Implement base `generateFixes()` method
    - Implement `generateImportPathUpdateFixes()` for updating import paths
    - Implement `generateTypeConsolidationFixes()` for consolidating duplicate types
    - Implement `generateTypeStandardizationFixes()` for ID type standardization
    - Implement `generateInterfaceCompletionFixes()` for completing interfaces
    - _Requirements: 2.1-2.5, 3.1-3.5, 4.1-4.11_
  
  - [x] 4.2 Write property test for import path updates
    - **Property 2: Import Path Update Completeness**
    - **Validates: Requirements 2.1-2.5**
  
  - [x] 4.3 Write property test for type consolidation
    - **Property 3: Type Consolidation Correctness**
    - **Validates: Requirements 3.1, 13.1-13.3**
  
  - [x] 4.4 Write unit tests for fix generation
    - Test import path update generation
    - Test type consolidation fix generation
    - Test interface completion fix generation
    - _Requirements: 2.1-2.5, 4.1-4.11_

- [x] 5. Implement batch processing system
  - [x] 5.1 Create BatchProcessor class
    - Implement `processBatch()` to apply fixes in batches
    - Implement `groupRelatedFixes()` to group related fixes together
    - Implement `applyWithRollback()` for atomic batch application with rollback
    - _Requirements: 19.1-19.4_

  - [x] 5.2 Write property test for batch atomicity
    - **Property 10: Batch Atomicity**
    - **Validates: Requirements 19.3**
  
  - [x] 5.3 Write unit tests for batch processing
    - Test batch grouping logic
    - Test rollback on validation failure
    - Test batch dependency ordering
    - _Requirements: 19.1-19.4_

- [x] 6. Implement type validation system
  - [x] 6.1 Create TypeValidator class
    - Implement `validateTypeScript()` using TypeScript compiler API
    - Implement `detectNewErrors()` to compare before/after error reports
    - Implement `checkBackwardCompatibility()` for compatibility verification
    - _Requirements: 18.1-18.4, 20.1-20.4_
  
  - [x] 6.2 Write unit tests for type validation
    - Test TypeScript compilation integration
    - Test new error detection
    - Test compatibility checking
    - _Requirements: 18.1-18.4, 20.1-20.4_

- [x] 7. Implement progress tracking system
  - [x] 7.1 Create ProgressTracker class
    - Implement `recordPhaseProgress()` to track phase completion
    - Implement `getStatus()` to get current remediation status
    - Implement `generateReport()` to create progress reports
    - _Requirements: 21.1-21.4_
  
  - [x] 7.2 Write unit tests for progress tracking
    - Test phase progress recording
    - Test status reporting
    - Test report generation
    - _Requirements: 21.1-21.4_

- [x] 8. Checkpoint - Verify core infrastructure
  - Run unit tests for all core components
  - Run property-based tests (minimum 100 iterations each)
  - Verify all components integrate correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 9. Implement Phase 1: Module Location Discovery
  - [x] 9.1 Discover all relocated modules
    - Scan for TS2307 errors (cannot find module)
    - Search FSD structure for relocated modules
    - Build module relocation map
    - Identify intentionally deleted modules
    - _Requirements: 1.1-1.7_
  
  - [x] 9.2 Generate module relocation report
    - Document all discovered relocations
    - List ambiguous relocations requiring manual review
    - List deleted modules with no relocation
    - _Requirements: 1.7_
  
  - [ ]* 9.3 Write integration test for Phase 1
    - Test complete module discovery workflow
    - Verify all 23 TS2307 errors are addressed
    - _Requirements: 1.7, 17.1_

- [x] 10. Implement Phase 2: Import Path Updates
  - [x] 10.1 Generate import path update fixes
    - Create fixes for all discovered relocations
    - Update import statements to new FSD paths
    - Update path aliases in tsconfig.json if needed
    - _Requirements: 2.1-2.5_
  
  - [x] 10.2 Apply import path updates in batches
    - Group related import updates together
    - Apply batches with validation after each
    - Rollback on validation failure
    - _Requirements: 2.5, 19.1-19.4_
  
  - [x]* 10.3 Write integration test for Phase 2
    - Test complete import path update workflow
    - Verify all import errors are eliminated
    - Verify no old import paths remain
    - _Requirements: 2.5, 17.2_

- [x] 11. Checkpoint - Verify module resolution complete
  - Run TypeScript compilation
  - Verify zero TS2307 errors remain
  - Verify zero TS2305, TS2724, TS2614 errors remain
  - Generate Phase 1-2 completion report
  - Ensure all tests pass, ask the user if questions arise

- [ ] 12. Implement Phase 3: Type Standardization
  - [ ] 12.1 Analyze and standardize ID types
    - Analyze ID usage patterns across codebase
    - Determine canonical ID type (string or number)
    - Generate ID type standardization fixes
    - _Requirements: 3.1-3.5_
  
  - [ ]* 12.2 Write property test for ID type analysis
    - **Property 4: ID Type Analysis Consistency**
    - **Validates: Requirements 3.1**
  
  - [ ]* 12.3 Write property test for migration pattern completeness
    - **Property 5: Migration Pattern Completeness**
    - **Validates: Requirements 3.5, 18.1**
  
  - [ ] 12.4 Consolidate fragmented types
    - Identify duplicate type definitions (DashboardPreferences, etc.)
    - Determine canonical location for each type
    - Generate type consolidation fixes
    - _Requirements: 13.1-13.3_
  
  - [ ] 12.5 Standardize pagination interfaces
    - Identify pagination interface inconsistencies
    - Create canonical pagination interface
    - Update all pagination usage
    - _Requirements: 11.1-11.3_
  
  - [ ] 12.6 Resolve HTTP status code types
    - Standardize HttpStatusCode type usage
    - Update all status code references
    - _Requirements: 12.1-12.2_
  
  - [ ] 12.7 Apply type standardization fixes
    - Apply fixes in batches with validation
    - Update all type imports to canonical locations
    - Remove duplicate type definitions
    - _Requirements: 3.4, 11.3, 12.2, 13.3_
  
  - [ ]* 12.8 Write integration test for Phase 3
    - Test complete type standardization workflow
    - Verify no duplicate types remain
    - Verify all type comparison errors eliminated
    - _Requirements: 3.4, 17.3_

- [ ] 13. Implement Phase 4: Interface Completion
  - [ ] 13.1 Complete DashboardConfig interface
    - Add missing properties: maxActionItems, maxTrackedTopics, showCompletedActions, defaultView
    - Update all DashboardConfig usage
    - _Requirements: 4.1-4.4_
  
  - [ ] 13.2 Complete TimeoutAwareLoaderProps interface
    - Add missing properties: size, showMessage, showTimeoutWarning, timeoutMessage
    - Update all TimeoutAwareLoaderProps usage
    - _Requirements: 4.5-4.8_
  
  - [ ] 13.3 Complete DashboardStackProps and DashboardTabsProps interfaces
    - Analyze usage to determine missing properties
    - Add all missing properties
    - Update all usage sites
    - _Requirements: 4.9-4.10_
  
  - [ ] 13.4 Standardize error constructor signatures
    - Add missing options: zodError, config, retryCount
    - Update all error constructor calls
    - _Requirements: 5.1-5.4_
  
  - [ ] 13.5 Apply interface completion fixes
    - Apply fixes in batches with validation
    - Verify all property access errors eliminated
    - _Requirements: 4.11, 5.4_
  
  - [ ]* 13.6 Write integration test for Phase 4
    - Test complete interface completion workflow
    - Verify all TS2339 and TS2353 errors eliminated
    - _Requirements: 4.11, 17.4_

- [ ] 14. Checkpoint - Verify type system complete
  - Run TypeScript compilation
  - Verify all type standardization errors eliminated
  - Verify all interface completion errors eliminated
  - Generate Phase 3-4 completion report
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Implement Phase 5: Type Safety
  - [ ] 15.1 Add explicit type annotations
    - Identify all implicit any errors (TS7006, TS7053)
    - Generate type annotation fixes
    - Apply fixes with validation
    - _Requirements: 6.1-6.4_
  
  - [ ]* 15.2 Write property test for type annotation
    - **Property 6: Type Annotation Completeness**
    - **Validates: Requirements 6.3**
  
  - [ ] 15.3 Fix type comparisons
    - Identify all type comparison errors (TS2367)
    - Generate type conversion fixes
    - Apply fixes with validation
    - _Requirements: 7.1-7.3_
  
  - [ ]* 15.4 Write property test for type comparison fixes
    - **Property 7: Type Comparison Compatibility**
    - **Validates: Requirements 7.1**
  
  - [ ] 15.5 Resolve interface compatibility
    - Fix BaseService vs ServiceLifecycleInterface compatibility
    - Fix NavigationItemWithAccess condition parameter types
    - _Requirements: 8.1-8.3_
  
  - [ ] 15.6 Disambiguate exports
    - Identify ambiguous exports (BillAnalytics, DashboardData, etc.)
    - Consolidate to single canonical exports
    - Update all imports
    - _Requirements: 9.1-9.7_
  
  - [ ] 15.7 Handle undefined safety
    - Add undefined checks or optional chaining for dashboardConfig.refreshInterval
    - Fix all TS18048 errors
    - _Requirements: 10.1-10.2_
  
  - [ ] 15.8 Align enum and literal types
    - Fix constitutional provision impact types
    - Fix legislation outcome status types
    - _Requirements: 14.1-14.3_
  
  - [ ]* 15.9 Write integration test for Phase 5
    - Test complete type safety workflow
    - Verify all type safety errors eliminated
    - _Requirements: 6.4, 7.3, 8.3, 9.7, 10.2, 14.3, 17.5_

- [ ] 16. Implement Phase 6: Import Cleanup and Validation
  - [ ] 16.1 Analyze and remove unused imports
    - Identify all unused imports
    - Generate import removal fixes
    - Apply fixes with validation
    - _Requirements: 15.1-15.5_
  
  - [ ]* 16.2 Write property test for import analysis
    - **Property 8: Import Analysis Accuracy**
    - **Validates: Requirements 15.1, 15.2**
  
  - [ ] 16.3 Handle type assertions
    - Identify locations requiring type assertions
    - Verify each assertion is safe and necessary
    - Add assertions with justification comments
    - _Requirements: 16.1-16.4_
  
  - [ ]* 16.4 Write property test for type assertion safety
    - **Property 9: Type Assertion Safety Verification**
    - **Validates: Requirements 16.1**
  
  - [ ] 16.5 Run final validation
    - Run full TypeScript compilation
    - Verify zero errors remain
    - Check for any regressions
    - _Requirements: 17.6, 18.3_
  
  - [ ] 16.6 Generate final remediation report
    - Document all fixes applied
    - List any manual fixes required
    - Provide migration guidance for breaking changes
    - Generate statistics by phase and category
    - _Requirements: 21.3_
  
  - [ ]* 16.7 Write integration test for Phase 6
    - Test complete import cleanup workflow
    - Verify zero TypeScript errors remain
    - Verify no new modules created
    - Verify all types in optimal FSD locations
    - _Requirements: 15.5, 17.6_

- [ ] 17. Final checkpoint - Complete remediation
  - Run all unit tests
  - Run all property-based tests (100+ iterations each)
  - Run all integration tests
  - Run full TypeScript compilation
  - Verify zero errors across entire client codebase
  - Review final remediation report
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster completion
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end phase workflows
- No stubs, adapters, or compatibility layers will be created
- All fixes use actual relocated modules in their new FSD locations
- Type consolidation prefers locations in this order: shared/types, client/src/lib/types, client/src/core
- Phases 1-2 and infrastructure (tasks 1-11) are complete
- Current focus: Phase 3 (Type Standardization) and beyond
- Each phase must complete successfully before proceeding to the next phase
- Validation after each batch ensures no regressions are introduced
