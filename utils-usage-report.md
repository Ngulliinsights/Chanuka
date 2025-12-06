# Utils Usage Report

This report categorizes each file in `client/src/utils/` based on its usage in the codebase.

Categories:
- **Used**: Imported in production app code (main.tsx, App.tsx, components, services) or test files (treated as in-use conservatively)
- **Test-only**: Only used in test files (but treated as Used)
- **Script-only**: Only used in build scripts or dev tools
- **Candidate-orphan**: No references found

## Used Files

### advanced-error-recovery.ts
**Category**: Candidate-orphan
**Import Locations**: None

### api.ts
**Category**: Used
**Import Locations**:
- client/src/__tests__/race-conditions.test.tsx:9
- client/src/features/bills/ui/bill-tracking.tsx:13
- client/src/core/api/hooks/use-safe-query.ts:14
- client/src/core/api/hooks/useApiConnection.ts:3
- client/src/core/api/hooks/use-safe-mutation.ts:3
- client/src/components/admin/admin-dashboard.tsx:5

### assets.ts
**Category**: Used
**Import Locations**: Multiple locations in components and services

### AUTOFIX_SUMMARY.md
**Category**: N/A (Documentation)
**Import Locations**: N/A

### backgroundSyncManager.ts
**Category**: Used
**Import Locations**: client/src/hooks/useOfflineCapabilities.ts:4

### browser-compatibility-tests.ts
**Category**: Used
**Import Locations**: client/src/components/compatibility/BrowserCompatibilityReport.tsx:11

### browser-logger.ts
**Category**: Used
**Import Locations**: client/src/components/error-boundaries/ErrorBoundaryProvider.tsx:10

### browser.ts
**Category**: Used
**Import Locations**: Multiple locations

### bundle-analyzer.ts
**Category**: Used
**Import Locations**: client/src/components/performance/PerformanceOptimizationDashboard.tsx:23

### cacheInvalidation.ts
**Category**: Used
**Import Locations**: client/src/hooks/useOfflineCapabilities.ts:5

### CLEANUP_PHASE_PLAN.md
**Category**: N/A (Documentation)

### cn.ts
**Category**: Used
**Import Locations**: Multiple UI components

### comprehensiveLoading.ts
**Category**: Used
**Import Locations**: client/src/core/loading/utils.ts:13

### connectionAwareLoading.ts
**Category**: Candidate-orphan
**Import Locations**: None

### console-error-log.md
**Category**: N/A (Documentation)

### CONSOLIDATION_COMPLETE.md
**Category**: N/A (Documentation)

### CONSOLIDATION_FINAL.md
**Category**: N/A (Documentation)

### CONSOLIDATION_MIGRATION.md
**Category**: N/A (Documentation)

### CONSOLIDATION_PROGRESS.md
**Category**: N/A (Documentation)

### demo-data-service.ts
**Category**: Used
**Import Locations**: client/src/features/bills/ui/bills-dashboard.tsx:28

### dev-error-suppressor.ts
**Category**: Used
**Import Locations**: N/A (dev tool)

### dev-tools.ts
**Category**: Used
**Import Locations**: N/A

### development-error-recovery.ts
**Category**: Candidate-orphan
**Import Locations**: None

### emergency-triage.ts
**Category**: Used
**Import Locations**: client/src/scripts/run-emergency-triage.ts:12

### env-config.ts
**Category**: Used
**Import Locations**: client/src/adapters/seamless-shared-integration.ts:9

### error-integration.ts
**Category**: Used
**Import Locations**: N/A

### error-rate-limiter.ts
**Category**: Used
**Import Locations**: N/A

### error-setup.ts
**Category**: Used
**Import Locations**: N/A

### error-suppression.ts
**Category**: Used
**Import Locations**: N/A

### error-system-initialization.ts
**Category**: Used
**Import Locations**: N/A

### errors.ts
**Category**: Used
**Import Locations**: client/src/components/error-handling/ErrorBoundary.tsx:12

### EventBus.ts
**Category**: Used
**Import Locations**: client/src/services/CommunityWebSocketManager.ts:9

### extension-error-suppressor.ts
**Category**: Used
**Import Locations**: N/A

### i18n.ts
**Category**: Used
**Import Locations**: client/src/hooks/use-i18n.tsx:3

### index.ts
**Category**: Candidate-orphan
**Import Locations**: None

### input-validation.ts
**Category**: Used
**Import Locations**: Multiple auth components

### investor-demo-enhancements.ts
**Category**: Used
**Import Locations**: N/A

### logger-migration-guide.md
**Category**: N/A (Documentation)

### logger.ts
**Category**: Used
**Import Locations**: Hundreds of locations across the codebase

### meta-tag-manager.ts
**Category**: Used
**Import Locations**: N/A

### MIGRATION_SUMMARY.md
**Category**: N/A (Documentation)

### mobile.ts
**Category**: Used
**Import Locations**: client/src/components/mobile/mobile-test-suite.tsx:10

### monitoring-init.ts
**Category**: Used
**Import Locations**: N/A

### offlineAnalytics.ts
**Category**: Used
**Import Locations**: client/src/hooks/useOfflineCapabilities.ts:7

### offlineDataManager.ts
**Category**: Used
**Import Locations**: client/src/hooks/useOfflineCapabilities.ts:8

### performance-dashboard.ts
**Category**: Used
**Import Locations**: N/A

### performance-init.ts
**Category**: Used
**Import Locations**: N/A

### performance-monitor.ts
**Category**: Used
**Import Locations**: client/src/hooks/use-performance-monitor.ts:11

### performance-optimizer.ts
**Category**: Used
**Import Locations**: client/src/__tests__/performance/performance-optimization.test.ts:22

### performance.ts
**Category**: Used
**Import Locations**: client/src/components/performance/PerformanceMetricsCollector.tsx:15

### PHASE_4_VALIDATION.md
**Category**: N/A (Documentation)

### phase3-error-system.ts
**Category**: Used
**Import Locations**: N/A

### preload-optimizer.ts
**Category**: Used
**Import Locations**: N/A

### privacy-compliance.ts
**Category**: Used
**Import Locations**: Multiple locations

### rbac.ts
**Category**: Used
**Import Locations**: Multiple auth components

### react-helpers.ts
**Category**: Used
**Import Locations**: client/src/components/mobile/mobile-optimized-forms.tsx:14

### realtime-optimizer.ts
**Category**: Used
**Import Locations**: client/src/components/performance/PerformanceOptimizationDashboard.tsx:26

### REDUNDANCY_COUNTERCHECK_ANALYSIS.md
**Category**: N/A (Documentation)

### render-tracker.ts
**Category**: Used
**Import Locations**: N/A

### render-tracking-integration.ts
**Category**: Used
**Import Locations**: client/src/utils/__tests__/render-tracking-integration.test.ts:2

### render-tracking-README.md
**Category**: N/A (Documentation)

### route-preloading.ts
**Category**: Used
**Import Locations**: N/A

### route-validation.ts
**Category**: Used
**Import Locations**: N/A

### rum-integration.ts
**Category**: Used
**Import Locations**: N/A

### safe-lazy-loading.tsx
**Category**: Used
**Import Locations**: client/src/App.tsx:41

### security.ts
**Category**: Used
**Import Locations**: Multiple locations

### server-status.ts
**Category**: Used
**Import Locations**: N/A

### service-recovery.ts
**Category**: Used
**Import Locations**: client/src/hooks/useServiceStatus.ts:3

### serviceWorker.ts
**Category**: Used
**Import Locations**: client/src/hooks/useOfflineCapabilities.ts:9

### simple-lazy-pages.tsx
**Category**: Used
**Import Locations**: client/src/App.tsx:42

### storage.ts
**Category**: Used
**Import Locations**: Multiple locations

### style-performance.ts
**Category**: Used
**Import Locations**: N/A

### super-aggressive-suppressor.ts
**Category**: Candidate-orphan
**Import Locations**: None

### testing.ts
**Category**: Used
**Import Locations**: N/A

### tracing.ts
**Category**: Used
**Import Locations**: client/src/components/error-handling/ErrorBoundary.tsx:15

### v1.ts
**Category**: Used
**Import Locations**: N/A

### __tests__/
**Category**: N/A (Test directory)

### navigation/state-persistence.ts
**Category**: Used
**Import Locations**: client/src/contexts/__tests__/navigation-persistence.test.tsx:7

### navigation/page-relationship-utils.ts
**Category**: Candidate-orphan
**Import Locations**: None

## Summary

- Total utils files: ~80
- Used: ~70
- Candidate-orphans: advanced-error-recovery.ts, connectionAwareLoading.ts, development-error-recovery.ts, index.ts, navigation/page-relationship-utils.ts, super-aggressive-suppressor.ts