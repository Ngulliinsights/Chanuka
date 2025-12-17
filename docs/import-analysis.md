# Import Analysis Report

This report validates all import statements in your project against the actual file structure.

## Summary

- **Files Analyzed:** 1484
- **Missing/Invalid Imports:** 118
- **Status:** ⚠️ Issues detected

## Missing or Invalid Imports

The following imports could not be resolved in your project structure:

### `client/.storybook/preview.ts`

- ❌ `../src/shared/design-system/theme/theme-provider`

### `client/src/features/bills/ui/tracking/real-time-tracker.tsx`

- ❌ `../../../../../../Badge`
- ❌ `../../../../../../Button`
- ❌ `../../../../../../Card`
- ❌ `../../../../../../Switch`

### `client/src/features/security/ui/privacy/DataUsageReportDashboard.tsx`

- ❌ `../icons/SimpleIcons`

### `client/src/features/users/ui/auth/AuthButton.tsx`

- ❌ `../../../../../../Button`

### `client/src/features/users/ui/auth/AuthInput.tsx`

- ❌ `../../../../../../Input`
- ❌ `../../../../../../Label`

### `client/src/features/users/ui/verification/ExpertBadge.tsx`

- ❌ `../icons/SimpleIcons`

### `client/src/features/users/ui/verification/ExpertProfileCard.tsx`

- ❌ `../icons/SimpleIcons`

### `client/src/hooks/use-performance-monitor.ts`

- ❌ `../../../PerformanceDashboard`
- ❌ `../../../performance-monitor`

### `client/src/hooks/useSeamlessIntegration.ts`

- ❌ `../adapters/seamless-shared-integration`

### `client/src/services/webSocketService.ts`

- ❌ `./billTrackingService`

### `client/src/shared/design-system/strategy.ts`

- ❌ `../tokens`

### `client/src/shared/infrastructure/asset-loading/AssetLoadingProvider.tsx`

- ❌ `../core/loading/utils/asset-loading`

### `client/src/shared/templates/component-templates.ts`

- ❌ `./${this.toCamelCase(componentName)}`

### `client/src/shared/ui/loading/AssetLoadingIndicator.tsx`

- ❌ `../core/loading/utils/asset-loading`

### `client/src/shared/ui/navigation/ProgressiveDisclosureNavigation.tsx`

- ❌ `../ui/dropdown-menu`

### `client/src/shared/ui/privacy/FullInterface.tsx`

- ❌ `../../auth/ConsentModal`

### `scripts/bundle-analyzer.js`

- ❌ `./analyze-bundle.js`

### `scripts/check-table-structure.ts`

- ❌ `../pool`

### `scripts/database/consolidate-database-infrastructure.ts`

- ❌ `./seed-database.js`

### `scripts/database/init-strategic-database.ts`

- ❌ `../../health-check`
- ❌ `../../setup-a11y`

### `scripts/database/reset.ts`

- ❌ `./seed-database.js`

### `scripts/database/setup.ts`

- ❌ `./seed-database.js`

### `scripts/deploy-production.js`

- ❌ `../client/scripts/advanced-bundle-analyzer.js`

### `scripts/fix-import-paths.ts`

- ❌ `@shared$1`

### `scripts/ml-service-demo.ts`

- ❌ `../ml-adapter.service`
- ❌ `../ml-feature-flag.config`
- ❌ `../real-ml.service`

### `scripts/optimize-memory.js`

- ❌ `../server/infrastructure/monitoring/memory-optimizer.js`
- ❌ `../server/infrastructure/monitoring/system-health.js`

### `scripts/typescript-fixer/tests/fixtures/database-patterns.ts`

- ❌ `../../../../connection-manager-metrics`
- ❌ `../../../../database-service`

### `scripts/validate-imports.js`

- ❌ `../config.d`

### `server/config/development.ts`

- ❌ `../../4-personas-implementation-guide`

### `server/config/production.ts`

- ❌ `../../4-personas-implementation-guide`

### `server/config/test.ts`

- ❌ `../../4-personas-implementation-guide`

### `server/core/auth/passwordReset.ts`

- ❌ `../../../config.d`

### `server/db.ts`

- ❌ `../database-fallback`

### `server/example-server-integration.ts`

- ❌ `../server-startup`

### `server/features/admin/admin-router.ts`

- ❌ `../../../query-executor`

### `server/features/analysis/application/constitutional-analysis.service.ts`

- ❌ `../../../../constitutional-analysis-service-complete`

### `server/features/analysis/presentation/analysis.routes.ts`

- ❌ `../../../../AuthAlert`

### `server/features/analytics/middleware/analytics-context.ts`

- ❌ `../../../../AuthAlert`

### `server/features/analytics/middleware/performance-tracking.ts`

- ❌ `../../../../AuthAlert`

### `server/features/analytics/services/engagement.service.ts`

- ❌ `../../../../AuthAlert`

### `server/features/analytics/types/progress-storage.d.ts`

- ❌ `../../../../BaseStorage.d`

### `server/features/bills/application/bill-service.ts`

- ❌ `../../../../result-adapter`

### `server/features/bills/application/bills-repository-service.ts`

- ❌ `../../../../bill-repository.interface`

### `server/features/bills/application/bills.ts`

- ❌ `../../../../bill-repository.interface`

### `server/features/bills/presentation/bill-tracking.routes.ts`

- ❌ `../../../../AuthAlert`

### `server/features/bills/presentation/bills-router-migrated.ts`

- ❌ `../../../../AuthAlert`
- ❌ `../../../../boom-error-middleware`
- ❌ `../../../../security-audit-service`

### `server/features/bills/presentation/bills-router.ts`

- ❌ `../../../../AuthAlert`
- ❌ `../../../../security-audit-service`

### `server/features/community/social-share-storage.d.ts`

- ❌ `../../../BaseStorage.d`

### `server/features/search/engines/dual-engine-orchestrator.ts`

- ❌ `./semantic-search-engine`

### `server/features/search/engines/semantic-search.engine.ts`

- ❌ `./embedding-service`

### `server/features/users/application/profile.ts`

- ❌ `../../../../AuthAlert`

### `server/features/users/infrastructure/user-storage.d.ts`

- ❌ `../../../../BaseStorage.d`
- ❌ `../../../../StorageTypes.d`

### `server/index.ts`

- ❌ `../audit-log`
- ❌ `../cache-compressor`
- ❌ `../command-injection-prevention`
- ❌ `../config.d`
- ❌ `../database-fallback`
- ❌ `../external-api-management`
- ❌ `../migration-wrapper`
- ❌ `../monitoring-scheduler`
- ❌ `../performance-monitor`
- ❌ `../WebSocketIntegrationExample`

### `server/infrastructure/cache/cache.ts`

- ❌ `../../../4-personas-implementation-guide`

### `server/infrastructure/connection-migrator.ts`

- ❌ `../../feature-flags-service`
- ❌ `../../WebSocketIntegrationExample`

### `server/infrastructure/memory-aware-socket-service.ts`

- ❌ `../../batching-service`

### `server/infrastructure/notifications/email-service.ts`

- ❌ `../../../config.d`

### `server/infrastructure/persistence/lazy-loader.ts`

- ❌ `../../../performance-monitor`

### `server/infrastructure/socketio-service.ts`

- ❌ `../../redis-adapter`

### `server/infrastructure/websocket-config.ts`

- ❌ `../../batching-service`
- ❌ `../../memory-aware-socket-service`

### `server/middleware/server-error-integration.ts`

- ❌ `../../boom-error-middleware`

### `server/scripts/deploy-websocket-migration.ts`

- ❌ `../../redis-adapter`

### `server/scripts/execute-websocket-migration.ts`

- ❌ `../../deploy-websocket-migration`

### `server/scripts/run-websocket-validation.ts`

- ❌ `../../final-migration-validation`
- ❌ `../../legacy-websocket-cleanup`

### `server/scripts/simple-websocket-validation.ts`

- ❌ `../../batching-service`
- ❌ `../../notification-channels`

### `server/scripts/validate-connection-migration.ts`

- ❌ `../../deploy-websocket-migration`

### `server/services/managed-government-data-integration.ts`

- ❌ `../../external-api-error-handler`
- ❌ `../../missing-modules-fallback`

### `server/types/api.ts`

- ❌ `../../common-utils`

### `server/utils/analytics-controller-wrapper.ts`

- ❌ `../../api-response-fixer`
- ❌ `../../missing-modules-fallback`

### `shared/core/src/observability/logging/logger.ts`

- ❌ `node:async_hooks`

### `shared/core/src/observability/stack.ts`

- ❌ `../tracing`

### `shared/core/src/repositories/test-implementations/bill-test-repository.ts`

- ❌ `../../../../../test-data-factory`

### `shared/core/src/repositories/test-implementations/sponsor-test-repository.ts`

- ❌ `../../../../../test-data-factory`

### `shared/database/example-usage.ts`

- ❌ `../../connection-manager-metrics`
- ❌ `../../pool`

### `shared/database/init.ts`

- ❌ `../../MonitoringDashboard`
- ❌ `../../pool`

### `shared/database/monitoring.ts`

- ❌ `../../pool`

### `tests/utilities/shared/integration-tests.ts`

- ❌ `../../../interfaces`

### `tests/utilities/shared/schema-agnostic-test-helper.ts`

- ❌ `../primitives`

### `tests/utilities/shared/stress-tests.ts`

- ❌ `../../../interfaces`

### `tests/utilities/shared/test-data-factory.ts`

- ❌ `../primitives`

### `tests/validation/validators.ts`

- ❌ `../../../client/src/core/api/registry`
- ❌ `../../../client/src/core/error`
- ❌ `../../../client/src/utils/api`
- ❌ `../../../client/src/utils/assets`
- ❌ `../../../client/src/utils/logger`
- ❌ `../../../client/src/utils/storage`

### `tools/codebase-health/tests/test-data/sample-with-issues.ts`

- ❌ `./non-existent-file`

## How to Fix

1. **Verify file paths** - Check that imported files exist at specified locations
2. **Install dependencies** - Run `npm install`, `pip install`, etc. for missing packages
3. **Fix relative paths** - Ensure `./` and `../` imports point to correct locations
4. **Check extensions** - Some frameworks require explicit file extensions
5. **Review aliases** - Verify path aliases in tsconfig.json, webpack.config.js, etc.

---

**Note:** External packages (npm, PyPI, Go modules, etc.) are assumed valid if installed.

**Generated:** 2025-12-17 08:53:23
