# Requirements Document: Codebase Standardization and Consolidation

## Introduction

This specification addresses systematic inconsistencies across the project that impact maintainability, developer experience, and code quality. The codebase exhibits mixed naming conventions, duplicate files and folders, inconsistent feature structures, scattered test files, configuration duplication, misused file extensions, and committed debug/backup files. This refactoring establishes consistent standards and eliminates redundancy to create a maintainable, predictable codebase structure.

## Glossary

- **System**: The codebase standardization and consolidation tooling and processes
- **Feature_Module**: A self-contained feature directory under client/src/features/
- **Page_File**: A React component file representing a routable page
- **Hook_File**: A React hook file (use* prefix)
- **Asset_File**: Static files in client/public/ (images, SVGs, fonts, manifests)
- **Migration_File**: Database migration SQL file in drizzle/
- **Config_File**: Configuration file at project root or client/ level
- **Test_File**: Test specification file with .test.* or .spec.* extension
- **Source_File**: Design or editable source file (.ai, .psd, .sketch, .fig)
- **Documentation_File**: Markdown or text documentation file
- **Backup_File**: File with -backup, _backup, or .bak suffix
- **Debug_File**: Temporary test or debug file not intended for production

## Requirements

### Requirement 1: File Naming Convention Standardization

**User Story:** As a developer, I want consistent file naming conventions across the codebase, so that I can quickly locate files and understand their purpose without confusion.

#### Acceptance Criteria

1. THE System SHALL enforce kebab-case naming for all Page_Files
2. THE System SHALL enforce kebab-case naming for all Hook_Files
3. THE System SHALL enforce kebab-case naming for all Asset_Files
4. THE System SHALL enforce lowercase with hyphens for all SVG Asset_Files
5. WHEN a file violates naming conventions, THE System SHALL provide a migration path to the correct name
6. THE System SHALL update all import statements when files are renamed

### Requirement 2: Duplicate Directory Consolidation

**User Story:** As a developer, I want singular, canonical locations for each type of code, so that I don't waste time searching multiple directories or accidentally create divergent implementations.

#### Acceptance Criteria

1. THE System SHALL consolidate client/src/lib/context/ and client/src/lib/contexts/ into a single contexts/ directory
2. THE System SHALL consolidate client/src/lib/ui/dashboard/layout/ and client/src/lib/ui/dashboard/layouts/ into a single layouts/ directory
3. WHEN duplicate directories exist, THE System SHALL merge contents into the canonical directory
4. WHEN duplicate directories exist, THE System SHALL remove the empty redundant directory
5. THE System SHALL update all import paths to reference the canonical directory
6. THE System SHALL preserve git history during directory consolidation

### Requirement 3: Duplicate File Elimination

**User Story:** As a developer, I want each component or utility to exist in exactly one location, so that I can maintain a single source of truth and avoid version conflicts.

#### Acceptance Criteria

1. THE System SHALL identify duplicate files by comparing file paths and content similarity
2. WHEN connection-status.tsx exists in both lib/ui/status/ and lib/ui/, THE System SHALL keep the version in lib/ui/status/ and remove the duplicate
3. WHEN database-status.tsx exists in both lib/ui/status/ and lib/ui/, THE System SHALL keep the version in lib/ui/status/ and remove the duplicate
4. WHEN use-safe-query.ts exists in both features/pretext-detection/hooks/ and lib/core/api/hooks/, THE System SHALL consolidate to lib/core/api/hooks/ and update imports
5. WHEN advocacy/index.ts and advocacy/index.tsx both exist, THE System SHALL keep the .tsx version if it contains JSX, otherwise keep .ts
6. WHEN bills/hooks.ts exists alongside bills/hooks/ directory, THE System SHALL move flat file contents into the directory structure
7. WHEN bills/services.ts exists alongside bills/services/ directory, THE System SHALL move flat file contents into the directory structure
8. THE System SHALL update all import references to point to the canonical file location

### Requirement 4: Feature Module Structure Standardization

**User Story:** As a developer, I want all features to follow a consistent directory structure, so that I can navigate any feature with the same mental model and find components predictably.

#### Acceptance Criteria

1. THE System SHALL define a standard Feature_Module structure with api/, hooks/, pages/, services/, ui/, types.ts, index.ts, and README.md
2. WHEN a Feature_Module lacks required directories, THE System SHALL create placeholder directories with .gitkeep files
3. WHEN features/api/ exists as a feature, THE System SHALL move its contents to lib/core/api/ or infrastructure/api/
4. WHEN legal/pages/ contains non-legal pages (about.tsx, blog.tsx, careers.tsx, contact.tsx, press.tsx, support.tsx), THE System SHALL move them to appropriate feature directories
5. WHEN market/ contains only SokoHaki.tsx, THE System SHALL create the standard directory structure
6. WHEN civic/ contains only pages/, THE System SHALL create the standard directory structure
7. WHEN constitutional-intelligence/ lacks services/ or pages/, THE System SHALL create the standard directory structure
8. THE System SHALL document the standard structure in a FEATURE_STRUCTURE.md file at client/src/features/

### Requirement 5: Migration File Naming Standardization

**User Story:** As a database administrator, I want migration files to follow a single, predictable naming convention, so that I can understand migration order and avoid conflicts.

#### Acceptance Criteria

1. THE System SHALL enforce timestamp-based naming for all Migration_Files using format YYYYMMDDHHMMSS_description.sql
2. WHEN duplicate migration prefixes exist (0001_create_foundation_tables.sql and 0001_create_foundation_tables_optimized.sql), THE System SHALL rename with unique timestamps
3. WHEN duplicate descriptions exist (0023_migration_infrastructure.sql and 0024_migration_infrastructure.sql), THE System SHALL append distinguishing suffixes
4. WHEN sequential numeric migrations exist (0001_*.sql), THE System SHALL convert to timestamp format
5. WHEN epoch timestamp migrations exist (1766469695772_*.sql), THE System SHALL convert to readable timestamp format
6. THE System SHALL maintain migration execution order during renaming
7. THE System SHALL update drizzle metadata to reflect new migration names

### Requirement 6: Source File Separation from Production Assets

**User Story:** As a developer, I want design source files separated from production assets, so that build processes are faster and deployment packages are smaller.

#### Acceptance Criteria

1. THE System SHALL identify all Source_Files in client/public/ by extension (.ai, .psd, .sketch, .fig)
2. WHEN Source_Files exist in client/public/, THE System SHALL move them to client/design-assets/
3. THE System SHALL create client/design-assets/ directory if it does not exist
4. THE System SHALL update any documentation references to moved Source_Files
5. THE System SHALL add client/design-assets/ to .gitignore if source files should not be versioned

### Requirement 7: Manifest File Consolidation

**User Story:** As a developer, I want a single web manifest file, so that I don't maintain duplicate configurations that can drift out of sync.

#### Acceptance Criteria

1. WHEN both manifest.json and manifest.webmanifest exist in client/public/, THE System SHALL keep manifest.webmanifest
2. WHEN both manifest files exist, THE System SHALL merge any unique properties from manifest.json into manifest.webmanifest
3. WHEN both manifest files exist, THE System SHALL remove manifest.json
4. THE System SHALL update index.html to reference manifest.webmanifest

### Requirement 8: Test File Organization

**User Story:** As a developer, I want tests organized in a predictable structure, so that I can find tests for any module and run targeted test suites.

#### Acceptance Criteria

1. THE System SHALL define standard test locations: unit tests in __tests__/ adjacent to source, integration tests in tests/integration/, e2e tests in tests/e2e/
2. WHEN Test_Files exist inside source directories (CommandPalette.test.tsx in lib/core/command-palette/), THE System SHALL move them to adjacent __tests__/ directory
3. WHEN tests/integration/tests/ exists (double nesting), THE System SHALL flatten to tests/integration/
4. THE System SHALL update test configuration files to reflect new test locations
5. THE System SHALL preserve test file naming conventions (.test.ts, .spec.ts)

### Requirement 9: Configuration File Deduplication

**User Story:** As a developer, I want configuration files to exist in exactly one location, so that I don't have conflicting settings between root and subdirectories.

#### Acceptance Criteria

1. WHEN playwright.config.ts exists at both root and client/, THE System SHALL keep the root version and remove client/playwright.config.ts
2. WHEN knip.config.ts and knip.json both exist at root, THE System SHALL keep knip.config.ts and remove knip.json
3. WHEN knip.json exists in both root and scripts/, THE System SHALL keep the root version and remove scripts/knip.json
4. WHEN postcss.config.js exists at both root and client/, THE System SHALL keep the client version and remove root postcss.config.js
5. THE System SHALL verify configuration still works after deduplication
6. THE System SHALL update any scripts or documentation referencing removed config files

### Requirement 10: File Extension Correction

**User Story:** As a developer, I want file extensions to accurately reflect file contents, so that tooling works correctly and I can quickly identify file types.

#### Acceptance Criteria

1. WHEN a .ts file contains JSX syntax, THE System SHALL rename it to .tsx
2. WHEN a .tsx file contains no JSX syntax, THE System SHALL rename it to .ts
3. WHEN documentation is stored in .ts files (MIGRATION_SUMMARY.ts, REFINEMENT_STRATEGY.ts), THE System SHALL rename to .md
4. WHEN Redux slices use .tsx extension without JSX (communitySlice.tsx), THE System SHALL rename to .ts
5. THE System SHALL update all import statements when extensions change
6. THE System SHALL verify TypeScript compilation succeeds after extension changes

### Requirement 11: Debug and Backup File Removal

**User Story:** As a developer, I want debug and backup files removed from source control, so that the repository contains only production code and reduces confusion.

#### Acceptance Criteria

1. THE System SHALL identify all Backup_Files by suffix patterns (-backup, _backup, .bak)
2. WHEN safe-lazy-loading-backup.tsx exists alongside safe-lazy-loading.tsx, THE System SHALL remove the backup file
3. WHEN test-styles.html exists in client/src/, THE System SHALL remove the Debug_File
4. THE System SHALL add backup and debug file patterns to .gitignore
5. THE System SHALL verify removed files are not referenced in any imports
6. IF a Backup_File is referenced in imports, THE System SHALL update imports to reference the primary file

### Requirement 12: Documentation Consolidation

**User Story:** As a developer, I want documentation organized by topic in a clear hierarchy, so that I can find relevant information without searching through dozens of files.

#### Acceptance Criteria

1. WHEN multiple SEARCH_* markdown files exist at root, THE System SHALL consolidate into docs/features/search/
2. WHEN docs/archive/ contains over 50 dated analysis files, THE System SHALL compress into timestamped archives
3. THE System SHALL maintain a docs/README.md with navigation to all documentation sections
4. THE System SHALL organize documentation by category: architecture/, features/, guides/, reference/
5. THE System SHALL preserve git history for moved documentation files

### Requirement 13: Validation and Verification

**User Story:** As a developer, I want automated validation that the refactoring succeeded, so that I can confidently merge changes without breaking the application.

#### Acceptance Criteria

1. THE System SHALL verify all TypeScript files compile without errors after refactoring
2. THE System SHALL verify all import paths resolve correctly after refactoring
3. THE System SHALL verify all test files can be discovered and run after refactoring
4. THE System SHALL verify the application builds successfully after refactoring
5. THE System SHALL generate a refactoring report listing all changes made
6. THE System SHALL provide rollback instructions in case of issues

### Requirement 14: Migration Automation

**User Story:** As a developer, I want automated scripts to perform the refactoring, so that I can apply changes consistently without manual error-prone work.

#### Acceptance Criteria

1. THE System SHALL provide a dry-run mode that reports planned changes without modifying files
2. THE System SHALL provide an interactive mode that prompts for confirmation before each change category
3. THE System SHALL provide an automated mode that applies all changes without prompts
4. THE System SHALL log all changes to a migration.log file with timestamps
5. THE System SHALL create git commits for each logical change category
6. THE System SHALL handle merge conflicts gracefully if files have been modified

### Requirement 15: Round-Trip Validation

**User Story:** As a developer, I want to verify that refactored code produces identical runtime behavior, so that I can ensure no functionality was broken.

#### Acceptance Criteria

1. FOR ALL modified files, running the test suite before and after refactoring SHALL produce equivalent results
2. FOR ALL renamed files, the application SHALL render the same UI before and after refactoring
3. FOR ALL moved files, import resolution SHALL succeed before and after refactoring
4. THE System SHALL generate a diff report showing only expected changes (file paths, not logic)
5. THE System SHALL flag any unexpected code changes for manual review
