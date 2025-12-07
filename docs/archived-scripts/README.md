# Archived Test Scripts

This directory contains test scripts and test configuration files that have been archived as part of the testing consolidation effort (December 2025).

## Archive Rationale

These scripts were archived because:

1. They were manual test scripts not integrated into the main test infrastructure
2. They were test configuration/automation scripts (fix-*.ts, update-*.ts)
3. They duplicated functionality now in the proper test structure (`tests/` directory)
4. They were legacy test connection/database scripts superseded by proper test utilities

## Structure

### `/database/`

Database-related manual test scripts:

- `migration-testing.ts` - Manual database migration tests
- `rollback-testing.ts` - Manual rollback tests
- `simple-connection-test.ts` - Connection test (duplicates testing infrastructure)
- `test-connection.ts` - Connection test (duplicates testing infrastructure)

**Status**: These manual tests should be replaced with proper integration tests in `/tests/integration/`

### `/test-fixers/`

Automated test configuration and fixing scripts:

- `disable-all-tests.ts` - Disables all tests (legacy)
- `fix-failing-tests.ts` - Auto-fixer for failing tests (legacy)
- `fix-navigation-tests.ts` - Navigation test fixer (legacy)
- `fix-performance-tests.ts` - Performance test fixer (legacy)
- `fix-remaining-test-issues.ts` - General test issue fixer (legacy)
- `fix-schema-tests.ts` - Schema test fixer (legacy)
- `phase2-test-migration.js` - Phase 2 migration script (completed)
- `test-status-summary.ts` - Test status reporter (legacy)
- `update-test-configuration.ts` - Test config updater (legacy)
- `validate-test-config.js` - Test config validator (legacy)

**Status**: These are legacy automation scripts from previous refactoring phases. Modern tests use vitest directly.

### `/miscellaneous/`

Other test-related scripts:

- `run-strategic-tests.cjs` - Selective test runner (legacy)
- `test-backend-only.js` - Backend test filter (legacy)
- `accessibility-reporter.test.js` - Accessibility test reporter

**Status**: Functionality replaced by vitest workspace configuration and test filtering.

## Restoration

To restore an archived script:

1. Locate the script in the appropriate subdirectory
2. Review the comments to understand its purpose
3. Check if the functionality is now available in the test infrastructure
4. Copy it back to `/scripts/` if needed
5. Update references in `package.json` if it was an npm script

## Deprecation Timeline

- **Archived**: December 6, 2025
- **Review Period**: 2 sprints (until end of December 2025)
- **Permanent Deletion**: January 15, 2026 (if unused)

If a script is needed before permanent deletion, restore it and update this README.

## Migration Path

The modern testing approach uses:

- **Unit Tests**: Colocated with source files (`.test.ts` / `.test.tsx`)
- **Integration Tests**: Centralized in `/tests/integration/`
- **Test Setup**: Centralized in `/tests/setup/`
- **Test Utilities**: Centralized in `/tests/utilities/`
- **Test Execution**: Use `npm test` or `vitest` CLI directly

See `/docs/TESTING_GUIDELINES.md` for the new testing architecture.

The consolidation prioritized:

1. ✅ Keeping truly active, integrated test scripts
2. ✅ Archiving duplicate variants (3 financial-disclosure variants, 4 security variants, etc.)
3. ✅ Removing obsolete HTML test pages
4. ✅ Moving toward proper test structure in `/tests/` directory

For more information, see `TESTING_CONSOLIDATION_ACTION_PLAN.md`.
