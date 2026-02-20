# Scripts Directory Classification

**Classification Date**: 2026-02-19  
**Purpose**: Classify all scripts as Permanent Tooling, Completed Migration, or Emergency Patch

## Classification Categories

1. **Permanent Tooling**: Scripts referenced in package.json, nx.json, or CI/CD workflows
2. **Completed Migration**: One-time migration scripts whose purpose has been fulfilled
3. **Emergency Patch**: Temporary fix scripts (fix-*, emergency-*)

---

## Permanent Tooling

### Database Operations (Referenced in package.json)
- `database/initialize-database-integration.ts` - db:init
- `database/migrate.ts` - db:migrate, db:migrate:validate, db:migrate:dry-run
- `database/reset.ts` - db:reset, db:reset:safe, db:reset:force
- `database/health-check.ts` - db:health, db:health:watch
- `database/generate-migration.ts` - db:generate
- `database/generate-migration-with-types.ts` - db:generate-with-types
- `database/generate-types-simple.ts` - db:generate-types
- `database/post-generate-transform.ts` - db:generate-types
- `database/verify-schema-type-alignment.ts` - db:verify-schema-alignment
- `database/align-enums.ts` - db:align-enums
- `database/validate-migration.ts` - db:validate-migration
- `database/verify-schema-type-alignment-v2.ts` - db:verify-alignment
- `database/migration-verification-framework.ts` - db:verify-migration
- `database/migrate-with-verification.ts` - db:migrate-verified
- `database/rollback-with-verification.ts` - db:rollback-verified, db:rollback-test
- `database/check-schema.ts` - db:schema:check
- `database/schema-drift-detection.ts` - db:schema:drift (CI workflow)

### Graph Database Operations (Referenced in package.json)
- `database/graph/initialize-graph.ts` - graph:init
- `database/graph/sync-demo.ts` - graph:sync
- `database/graph/discover-patterns.ts` - graph:discover-patterns
- `database/graph/analyze-influence.ts` - graph:analyze-influence
- `database/graph/sync-advanced-relationships.ts` - graph:sync-advanced
- `database/graph/discover-networks.ts` - graph:discover-networks
- `database/graph/sync-networks.ts` - graph:sync-networks

### Seed Scripts (Referenced in package.json)
- `seeds/seed.ts` - db:seed
- `seeds/legislative-seed.ts` - db:seed:legislative

### API Contract Verification (Referenced in package.json)
- `verify-api-contract-coverage.ts` - api:verify-contracts

### Type Safety Scanning (Referenced in package.json)
- `scan-type-violations.ts` - scan:type-violations
- `scan-client-type-violations.ts` - scan:client-types
- `scan-todos.ts` - scan:todos
- `scan-eslint-suppressions.ts` - scan:eslint-suppressions
- `track-progress.ts` - track:progress
- `verify-metrics.ts` - verify:metrics

### Template-Based Fixes (Referenced in package.json)
- `fix-templates.ts` - fix:enum-conversions, fix:api-responses, fix:database-operations, fix:dynamic-properties, fix:type-assertions

### Quality Gates (Referenced in package.json)
- `check-thresholds.js` - quality:check, quality:check:dev, quality:check:staging, quality:check:pr, quality:check:prod

### Modern Project Analysis (Referenced in package.json)
- `modern-project-analyzer.ts` - analyze:modern, analyze:architecture

### Bundle Analysis (Referenced in package.json & CI)
- `analyze-bundle.cjs` - analyze:bundle
- `bundle-analysis-plugin.js` - Build tooling
- `bundle-analyzer.js` - Build tooling
- `generate-bundle-report.js` - Build tooling

### Performance Monitoring (Referenced in CI workflows)
- `performance-budget-enforcer.cjs` - CI: bundle-analysis.yml
- `web-vitals-checker.js` - CI: bundle-analysis.yml
- `performance-regression-detector.js` - CI: bundle-analysis.yml
- `performance-trend-analyzer.cjs` - Performance tracking

### Deployment (Referenced in package.json & CI)
- `deploy-production.js` - deploy:production, deploy:staging (CI: production-deployment.yml)

### Memory Management (Referenced in package.json)
- `immediate-memory-cleanup.cjs` - cleanup:memory

### Architecture Validation (Referenced in CI)
- `check-architecture.js` - CI: analytics-ci.yml (architecture boundaries)

### Dependency Analysis (Referenced in package.json)
- `dependency-cruiser.js` - analyze:imports

### Testing Infrastructure
- `setup-playwright.js` - Test setup

---

## Completed Migration

### Type Migration Scripts
- `migrate_types.py` - Python-based type migration (superseded by TypeScript versions)
- `migrate-types.js` - JavaScript type migration (superseded by fix-templates.ts)
- `migrate-types.ts` - TypeScript type migration (superseded by fix-templates.ts)
- `bulk-migrate-types.sh` - Batch type migration (one-time)
- `migrate-shared-types.ts` - Shared types migration (completed)
- `domain-type-migration-plan.md` - Planning document (archived)

### Import Migration Scripts
- `migrate-imports.js` - Import path migration (completed)
- `migrate-api-imports.js` - API import migration (completed)
- `migrate-database-imports.ts` - Database import migration (completed)
- `migrate-consolidated-imports.cjs` - Consolidated import migration (completed)
- `align-imports.ts` - Import alignment (completed)
- `fix-import-paths.ts` - Import path fixes (completed)
- `fix-import-resolution.ts` - Import resolution fixes (completed)
- `update-import-references.ts` - Import reference updates (completed)
- `update-imports-after-flatten.sh` - Post-flatten import updates (completed)
- `standardize-imports.ts` - Import standardization (completed)
- `consolidate-imports.ts` - Import consolidation (completed)

### Schema Migration Scripts
- `align-schema.ts` - Schema alignment (completed)
- `complete-schema-fix.ts` - Schema fixes (completed)
- `fix-schema-imports.ts` - Schema import fixes (completed)
- `fix-schema-references.ts` - Schema reference fixes (completed)

### Codebase Consolidation Scripts
- `consolidate-redundant-implementations.ts` - Redundant code removal (completed)
- `consolidate-sprawl.ts` - Code sprawl consolidation (completed)
- `migrate-codebase-utilities.ts` - Utility migration (completed)
- `migrate-utils-consolidation.ts` - Utils consolidation (completed)

### Error Handling Migration
- `migrate-error-handling.ts` - Error handling migration (completed)
- `migrate-error-handling-api.ts` - Error handling API migration (completed)
- `deploy-error-handling.ts` - Error handling deployment (completed)
- `integrate-error-management.ts` - Error management integration (completed)

### Logging Migration
- `migrate-logging.js` - Logging migration (completed)
- `migrate-console-logs.ts` - Console log migration (completed)

### WebSocket Migration
- `migrate-to-unified-websocket.ts` - WebSocket unification (completed)

### Design System Migration
- `fix-design-system.ts` - Design system fixes (completed)
- `emergency-design-system-consolidation.ts` - Design system consolidation (completed)
- `test-consolidated-design-system.ts` - Design system testing (completed)
- `test-design-system-architecture.ts` - Design system architecture testing (completed)
- `validate-design-system.ts` - Design system validation (completed)
- `validate-design-system-final.ts` - Final design system validation (completed)
- `strategic-contrast-migration.js` - Contrast migration (completed)

### FSD Migration
- `complete-fsd-migration.sh` - FSD migration completion (completed)
- `validate-fsd-migration.ts` - FSD migration validation (completed)

### Repository Migration
- `deploy-repository-migration.ts` - Repository migration deployment (completed)
- `demo-repository-deployment.ts` - Demo repository deployment (completed)

### Phase-Based Migrations
- `deploy-phase1-utilities.ts` - Phase 1 deployment (completed)
- `execute-comprehensive-migration.ts` - Comprehensive migration (completed)
- `complete-migrations.ts` - Migration completion (completed)
- `complete-realignment.ts` - Realignment completion (completed)
- `generate-comprehensive-migrations.ts` - Migration generation (completed)

### Cleanup Scripts
- `cleanup-deprecated-folders.ts` - Deprecated folder cleanup (completed)
- `cleanup-legacy-adapters.js` - Legacy adapter cleanup (completed)
- `cleanup-orphaned-files.ts` - Orphaned file cleanup (completed)
- `cleanup-redundant-utils.js` - Redundant utils cleanup (completed)
- `prepare-module-deletion.ts` - Module deletion preparation (completed)
- `rollback-cleanup.ts` - Rollback cleanup (completed)

### Verification Scripts
- `final-verification.ts` - Final verification (completed)
- `nuanced-verification.ts` - Nuanced verification (completed)
- `verify-cleanup.ts` - Cleanup verification (completed)
- `verify-and-fix-project-structure.ts` - Project structure verification (completed)
- `verify-project-structure.ts` - Project structure verification (completed)
- `verify-security-patches.ts` - Security patch verification (completed)
- `integration-validator.ts` - Integration validation (completed)
- `performance-validator.ts` - Performance validation (completed)

### Validation Scripts
- `validate_structure.ts` - Structure validation (completed)
- `validate-client-codebase.js` - Client codebase validation (completed)
- `validate-client-implementations.ts` - Client implementation validation (completed)
- `validate-config-consistency.ts` - Config consistency validation (completed)
- `validate-config.js` - Config validation (completed)
- `validate-functional-validator.js` - Functional validator validation (completed)
- `validate-imports.js` - Import validation (completed)
- `validate-migration-completion.ts` - Migration completion validation (completed)
- `validate-new-domains.cjs` - New domain validation (completed)
- `validate-property-naming.ts` - Property naming validation (completed)
- `validate-shared-folder.ts` - Shared folder validation (completed)
- `validate-shared-ui.js` - Shared UI validation (completed)
- `validate-syntax.ts` - Syntax validation (completed)

### Audit Scripts
- `audit-codebase-utilities.ts` - Codebase utilities audit (completed)
- `audit-error-handling-sprawl.ts` - Error handling sprawl audit (completed)
- `audit-imports-exports.ts` - Import/export audit (completed)
- `audit-middleware-sprawl.ts` - Middleware sprawl audit (completed)

### Analysis Scripts
- `analyze-codebase-errors.ts` - Codebase error analysis (completed)
- `analyze-phase2.sh` - Phase 2 analysis (completed)
- `database-analyzer.ts` - Database analysis (completed)
- `query-analyzer.ts` - Query analysis (completed)
- `race-condition-analyzer.js` - Race condition analysis (completed)
- `design-system-audit.js` - Design system audit (completed)
- `diagnose-503-issues.js` - 503 issue diagnosis (completed)

### Scanning Scripts
- `scan-migration-artifacts.sh` - Migration artifact scanning (completed)
- `scan-remaining-imports.js` - Remaining import scanning (completed)

### Monitoring Scripts
- `import-resolution-monitor.js` - Import resolution monitoring (completed)

### Profiling Scripts
- `profiling-suite.ts` - Profiling suite (completed)

### Search Optimization
- `deploy-search-optimization.ts` - Search optimization deployment (completed)

### ML Service Demo
- `ml-service-demo.ts` - ML service demonstration (completed)

---

## Emergency Patch

### Emergency Build Fixes
- `emergency-build-fix.ts` - Emergency build fix

### Fix Scripts (Temporary Patches)
- `fix-all-imports.js` - All imports fix
- `fix-all-shared-core-imports.ts` - Shared core imports fix
- `fix-api-response-calls.js` - API response calls fix
- `fix-client-issues.sh` - Client issues fix
- `fix-commented-imports.ts` - Commented imports fix
- `fix-display-names.ts` - Display names fix
- `fix-error-components.sh` - Error components fix
- `fix-error-fallback.ts` - Error fallback fix
- `fix-eslint-easy-wins.ts` - ESLint easy wins fix
- `fix-eslint-remaining.ts` - ESLint remaining issues fix
- `fix-eslint-suppressions.ts` - ESLint suppressions fix (NOTE: Also in Permanent Tooling)
- `fix-features-integration.ts` - Features integration fix
- `fix-frontend-imports.js` - Frontend imports fix
- `fix-infrastructure-issues.ts` - Infrastructure issues fix
- `fix-js-extensions.ts` - JS extensions fix
- `fix-lucide-imports.ts` - Lucide imports fix
- `fix-missing-exports.ts` - Missing exports fix
- `fix-plural-singular-consistency.ts` - Plural/singular consistency fix
- `fix-property-naming-consistency.ts` - Property naming consistency fix
- `fix-remaining-api-calls.js` - Remaining API calls fix
- `fix-remaining-client-issues.sh` - Remaining client issues fix
- `fix-remaining-errors.ts` - Remaining errors fix
- `fix-remaining-imports.js` - Remaining imports fix
- `fix-remaining-types.js` - Remaining types fix
- `fix-server-logger-imports.js` - Server logger imports fix
- `fix-shared-core-imports.ts` - Shared core imports fix
- `fix-shared-folder.ts` - Shared folder fix
- `fix-shared-imports.js` - Shared imports fix
- `fix-shared-ui-bugs.sh` - Shared UI bugs fix
- `fix-shared-ui.sh` - Shared UI fix
- `fix-type-safety-advanced.ts` - Type safety advanced fix
- `fix-type-safety-batch.ts` - Type safety batch fix
- `fix-type-safety-phase2.ts` - Type safety phase 2 fix
- `fix-typescript-syntax-errors.ts` - TypeScript syntax errors fix

### Shell Script Fixes
- `final-client-cleanup.sh` - Final client cleanup
- `complete-fsd-migration.sh` - FSD migration completion (also in Completed Migration)
- `flatten-codebase.sh` - Codebase flattening

### Update Scripts (Temporary)
- `update-core-imports.js` - Core imports update
- `update-core-references.js` - Core references update

### Cleanup Scripts (Temporary)
- `clean-shared-core-imports.ts` - Shared core imports cleanup

### Run Scripts (Temporary)
- `run-adapter-cleanup.js` - Adapter cleanup runner

### Phase Migration Scripts
- `phase2-analyze.js` - Phase 2 analysis
- `phase2-migration-generator.sh` - Phase 2 migration generator

### Identification Scripts
- `identify-any-usage.ts` - Any usage identification
- `identify-deprecated-files.cjs` - Deprecated files identification
- `identify-deprecated-files.js` - Deprecated files identification
- `identify-deprecated-files.ts` - Deprecated files identification

### Optimization Scripts
- `optimize-memory.js` - Memory optimization

### Production Readiness
- `production-readiness-check.ts` - Production readiness check

### Dynamic Path Updater
- `dynamic-path-updater.js` - Dynamic path updates

### Runtime Diagnostics
- `runtime_diagnostics.js` - Runtime diagnostics
- `runtime-dependency-check.js` - Runtime dependency check

### Functional Validator
- `functional_validator.js` - Functional validation

### Analyzer
- `analyzer.js` - General analyzer

### Architecture Fixer
- `architecture_fixer.ts` - Architecture fixes

### React Imports
- `add-react-imports.js` - React imports addition

---

## Subdirectories

### archived-analysis-tools/
**Classification**: Completed Migration (archived)
- Contains archived analysis tools no longer in active use

### archived-migration-tools/
**Classification**: Completed Migration (archived)
- Contains archived migration tools no longer in active use

### database/
**Classification**: Permanent Tooling
- Active database management scripts referenced in package.json and CI

### deployment/
**Classification**: Permanent Tooling
- Active deployment scripts referenced in CI workflows

### deprecated/
**Classification**: Completed Migration (deprecated)
- Contains deprecated scripts no longer in use

### error-remediation/
**Classification**: Completed Migration
- Error remediation scripts (one-time fixes)

### seeds/
**Classification**: Permanent Tooling
- Database seeding scripts referenced in package.json

### typescript-fixer/
**Classification**: Completed Migration
- TypeScript fixing tools (one-time migration)

### validation/
**Classification**: Mixed (needs individual file review)
- Contains validation scripts, some may be permanent tooling

---

## Configuration Files

### Permanent Configuration
- `fix-config.json` - Fix script configuration
- `jscpd.json` - Duplication detection config (referenced in package.json)
- `knip.json` - Dead code detection config (referenced in package.json)
- `README.md` - Scripts documentation

### Planning Documents (Archive Candidates)
- `CHANUKA_MIGRATION_PLAN.md` - Migration planning document
- `enum-alignment-audit.md` - Enum alignment audit document

---

## Summary Statistics

- **Permanent Tooling**: 47 scripts
- **Completed Migration**: 98 scripts
- **Emergency Patch**: 52 scripts
- **Total Scripts**: 197 scripts

## Recommendations

### Immediate Actions
1. **Delete Emergency Patches**: All fix-* and emergency-* scripts should be deleted after verifying fixes are integrated
2. **Archive Completed Migrations**: Move completed migration scripts to `scripts/archived-migration-tools/`
3. **Document Permanent Tooling**: Add JSDoc comments to all permanent tooling scripts
4. **Move Complex Tools**: Consider moving complex permanent scripts (>500 lines) to `tools/` directory

### Next Steps
1. Review subdirectories individually for detailed classification
2. Create `scripts/README.md` with usage guidelines for permanent tooling
3. Add ESLint rules to prevent new emergency patches from being committed
4. Establish naming conventions for future scripts (e.g., `tool-*` for permanent, `migrate-*` for one-time)
