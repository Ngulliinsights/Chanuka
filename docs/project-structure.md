# Project Structure

Maximum depth: 7 levels

```
.
attached_assets/
├── application_flow_1751746507009.md
├── chanuka_brand_roadmap (1).md
├── chanuka_framework_synthesis_1751746507007.md
├── chanuka_manifesto (1).md
├── chanuka-best-functionality_1751746507008.md
├── chanuka-problem-statement_1751746507008.md
├── chanuka-user-guide_1751746507008.md
├── codebase-analysis_1751746507007.md
├── community-input_1751743369833.html
├── comprehensive_code_analysis_framework.md
├── core_function_1751746507009.md
├── dashboard_1751743369900.html
├── expert-verification_1751743369833.html
├── ezra-nehemiah-chanuka (1).md
├── implementation.guide_1751746507008.md
├── loopholes_1751746507009.md
├── merged_bill_sponsorship.html
├── Pasted-sw-js-230-Service-Worker-Navigation-request-failed-checking-cache-TypeError-Failed-to-fetch--1759907703032_1759907703033.txt
├── sponsorbyreal.html
├── unified_ai_dev_framework_1751746605014.md
├── unified_code_analysis_framework.md
├── unified_coding_framework_1751746614347.md
BACKEND_TESTING_QUICKSTART.md
client/
├── index.html
├── public/
│   ├── Chanuka_logo.png
│   ├── Chanuka_logo.svg
│   ├── Chanuka_logo.webp
│   ├── favicon.svg
│   ├── icon-144x144.png
│   ├── logo-192.png
│   ├── manifest.json
│   ├── manifest.webmanifest
│   ├── offline.html
│   ├── sw.js
├── src/
│   ├── __tests__/
│   │   ├── browser-compatibility.test.ts
│   │   ├── e2e/
│   │   │   ├── user-workflows.test.tsx
│   │   ├── infinite-loop-fixes.test.tsx
│   │   ├── integration/
│   │   │   ├── api-communication.test.tsx
│   │   │   ├── asset-loading-integration.test.tsx
│   │   │   ├── end-to-end-flows.test.tsx
│   │   │   ├── frontend-serving-core.test.tsx
│   │   │   ├── react-initialization.test.tsx
│   │   ├── NavigationCore.test.tsx
│   │   ├── NavigationFlow.integration.test.tsx
│   │   ├── NavigationStatePersistence.test.tsx
│   │   ├── NavigationTestingSummary.md
│   │   ├── NavigationTestSuite.test.tsx
│   │   ├── performance/
│   │   │   ├── lazy-loading.test.tsx
│   │   │   ├── page-load-performance.test.tsx
│   │   │   ├── performance-optimization.test.ts
│   │   │   ├── service-worker.test.ts
│   │   ├── unit/
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.test.tsx
│   │   │   ├── services/
│   │   │   │   ├── api.test.ts
│   │   ├── utils/
│   │   │   ├── asset-loading.test.ts
│   │   │   ├── browser-compatibility.test.ts
│   │   │   ├── polyfills.test.ts
│   ├── App.tsx
│   ├── components/
│   │   ├── accessibility/
│   │   │   ├── accessibility-manager.tsx
│   │   │   ├── accessibility-settings-panel.tsx
│   │   ├── admin/
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── PerformanceDashboard.tsx
│   │   ├── analysis/
│   │   │   ├── comments.tsx
│   │   │   ├── section.tsx
│   │   │   ├── stats.tsx
│   │   │   ├── timeline.tsx
│   │   ├── analytics/
│   │   │   ├── engagement-dashboard.tsx
│   │   │   ├── JourneyAnalyticsDashboard.tsx
│   │   ├── analytics-dashboard.tsx
│   │   ├── AppProviders.tsx
│   │   ├── architecture-planning.tsx
│   │   ├── auth/
│   │   │   ├── auth-forms.tsx
│   │   ├── bills/
│   │   │   ├── bill-card.tsx
│   │   │   ├── bill-list.tsx
│   │   │   ├── bill-tracking.tsx
│   │   │   ├── implementation-workarounds.tsx
│   │   ├── bill-tracking/
│   │   │   ├── real-time-tracker.tsx
│   │   ├── checkpoint-dashboard.tsx
│   │   ├── compatibility/
│   │   │   ├── BrowserCompatibilityChecker.tsx
│   │   │   ├── BrowserCompatibilityReport.tsx
│   │   │   ├── BrowserCompatibilityTester.tsx
│   │   │   ├── FeatureFallbacks.tsx
│   │   ├── connection-status.tsx
│   │   ├── dashboard/
│   │   │   ├── action-items.tsx
│   │   │   ├── activity-summary.tsx
│   │   │   ├── tracked-topics.tsx
│   │   ├── database-status.tsx
│   │   ├── decision-matrix.tsx
│   │   ├── environment-setup.tsx
│   │   ├── error-boundary.tsx
│   │   ├── error-handling/
│   │   │   ├── __tests__/
│   │   │   │   ├── EnhancedErrorBoundary.test.tsx
│   │   │   │   ├── ErrorFallback.test.tsx
│   │   │   │   ├── error-recovery-flows.test.tsx
│   │   │   │   ├── PageErrorBoundary.integration.test.tsx
│   │   │   │   ├── PageErrorBoundary.test.tsx
│   │   │   │   ├── withErrorBoundary.test.tsx
│   │   │   ├── ErrorFallback.tsx
│   │   │   ├── ErrorRecoveryManager.tsx
│   │   │   ├── index.ts
│   │   │   ├── PageErrorBoundary.tsx
│   │   │   ├── withErrorBoundary.tsx
│   │   ├── feature-flags-panel.tsx
│   │   ├── implementation/
│   │   │   ├── workarounds.tsx
│   │   ├── layout/
│   │   │   ├── __tests__/
│   │   │   │   ├── app-layout.test.tsx
│   │   │   │   ├── AppLayout.test.tsx
│   │   │   ├── app-layout.tsx
│   │   │   ├── mobile-header.tsx
│   │   │   ├── mobile-navigation.tsx
│   │   │   ├── sidebar.tsx
│   │   ├── loading/
│   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   ├── index.ts
│   │   │   ├── LoadingDemo.tsx
│   │   │   ├── LoadingStates.tsx
│   │   ├── migration-manager.tsx
│   │   ├── mobile/
│   │   │   ├── mobile-navigation-enhancements.tsx
│   │   │   ├── mobile-optimized-forms.tsx
│   │   │   ├── mobile-performance-optimizations.tsx
│   │   │   ├── mobile-test-suite.tsx
│   │   │   ├── responsive-layout-manager.tsx
│   │   │   ├── responsive-page-wrapper.tsx
│   │   ├── monitoring/
│   │   │   ├── monitoring-dashboard.tsx
│   │   ├── navigation/
│   │   │   ├── __tests__/
│   │   │   │   ├── active-state-integration.test.tsx
│   │   │   │   ├── DesktopSidebar.test.tsx
│   │   │   │   ├── MobileNavigation.test.tsx
│   │   │   │   ├── NavigationAccessibility.test.tsx
│   │   │   │   ├── NavigationBreadcrumbs.test.tsx
│   │   │   │   ├── navigation-performance-accessibility.test.tsx
│   │   │   │   ├── ProtectedRoute.test.tsx
│   │   │   │   ├── RelatedPages.test.tsx
│   │   │   │   ├── responsive-navigation.test.tsx
│   │   │   │   ├── ResponsiveNavigation.test.tsx
│   │   │   │   ├── RoleBasedNavigation.test.tsx
│   │   │   ├── DesktopSidebar.tsx
│   │   │   ├── favorite-page-button.tsx
│   │   │   ├── index.ts
│   │   │   ├── MobileNavigation.tsx
│   │   │   ├── NavigationBreadcrumbs.tsx
│   │   │   ├── navigation-preferences.tsx
│   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   ├── PageRelationshipDemo.tsx
│   │   │   ├── PreloadLink.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── quick-access-nav.tsx
│   │   │   ├── RelatedPages.tsx
│   │   │   ├── RoleBasedMenu.tsx
│   │   │   ├── RoleBasedNavigation.tsx
│   │   │   ├── SidebarDebugger.tsx
│   │   ├── notifications/
│   │   │   ├── enhanced-notification-preferences.tsx
│   │   │   ├── notification-center.tsx
│   │   │   ├── notification-preferences.tsx
│   │   ├── offline/
│   │   │   ├── offline-manager.tsx
│   │   ├── performance/
│   │   │   ├── PerformanceDashboard.tsx
│   │   │   ├── PerformanceMetricsCollector.tsx
│   │   ├── privacy/
│   │   │   ├── privacy-dashboard.tsx
│   │   │   ├── privacy-policy.tsx
│   │   ├── profile/
│   │   │   ├── user-profile.tsx
│   │   ├── project-overview.tsx
│   │   ├── real-time/
│   │   │   ├── BillTrackingPreferences.tsx
│   │   │   ├── RealTimeNotifications.tsx
│   │   ├── search/
│   │   │   ├── advanced-search.tsx
│   │   ├── settings/
│   │   │   ├── alert-preferences.tsx
│   │   ├── sidebar.tsx
│   │   ├── system-health.tsx
│   │   ├── transparency/
│   │   │   ├── ConflictAnalysisDashboard.tsx
│   │   │   ├── ConflictNetworkVisualization.tsx
│   │   ├── ui/
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── logo.tsx
│   │   │   ├── OptimizedImage.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   ├── verification/
│   │   │   ├── verification-list.tsx
│   ├── config/
│   │   ├── api.ts
│   │   ├── onboarding.ts
│   ├── contexts/
│   │   ├── __tests__/
│   │   │   ├── NavigationContext.test.tsx
│   │   │   ├── navigation-persistence.test.tsx
│   │   ├── LoadingContext.tsx
│   │   ├── NavigationContext.tsx
│   │   ├── ResponsiveNavigationContext.tsx
│   ├── docs/
│   │   ├── navigation-performance-accessibility.md
│   │   ├── navigation-state-persistence.md
│   ├── features/
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAnalytics.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── analytics-api.ts
│   │   │   ├── types.ts
│   │   ├── bills/
│   │   │   ├── components/
│   │   │   │   ├── BillCard.tsx
│   │   │   │   ├── BillList.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useBills.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── bill-api.ts
│   │   │   ├── types.ts
│   │   ├── community/
│   │   │   ├── components/
│   │   │   │   ├── CommentThread.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCommunity.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── community-api.ts
│   │   │   ├── types.ts
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSearch.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── search-api.ts
│   │   │   ├── types.ts
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserProfile.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── user-api.ts
│   │   │   ├── types.ts
│   ├── hooks/
│   │   ├── __tests__/
│   │   │   ├── use-api-with-fallback.integration.test.tsx
│   │   │   ├── use-api-with-fallback.test.tsx
│   │   │   ├── use-journey-tracker.test.tsx
│   │   │   ├── use-mobile.test.tsx
│   │   │   ├── use-unified-navigation.test.tsx
│   │   ├── useApiConnection.ts
│   │   ├── use-api-with-fallback.ts
│   │   ├── use-auth.tsx
│   │   ├── use-bill-analysis.tsx
│   │   ├── use-bills.tsx
│   │   ├── useComprehensiveLoading.ts
│   │   ├── useConnectionAware.tsx
│   │   ├── use-i18n.tsx
│   │   ├── use-journey-tracker.ts
│   │   ├── use-keyboard-focus.ts
│   │   ├── use-mobile.tsx
│   │   ├── use-navigation-accessibility.ts
│   │   ├── use-navigation-performance.ts
│   │   ├── use-navigation-preferences.tsx
│   │   ├── use-navigation-sync.tsx
│   │   ├── useOfflineCapabilities.ts
│   │   ├── use-onboarding.tsx
│   │   ├── use-online-status.tsx
│   │   ├── use-safe-mutation.ts
│   │   ├── use-safe-query.ts
│   │   ├── use-system.tsx
│   │   ├── use-toast.ts
│   │   ├── use-unified-navigation.ts
│   │   ├── useWebSocket.ts
│   ├── index.css
│   ├── lib/
│   │   ├── icon-wrapper.tsx
│   │   ├── protected-route.tsx
│   │   ├── queryClient.ts
│   │   ├── utils.ts
│   ├── main.tsx
│   ├── pages/
│   │   ├── __tests__/
│   │   │   ├── HomePage.test.tsx
│   │   ├── admin/
│   │   ├── admin.tsx
│   │   ├── auth-page.tsx
│   │   ├── bill-analysis.tsx
│   │   ├── bill-detail.tsx
│   │   ├── bills-dashboard.tsx
│   │   ├── bill-sponsorship-analysis.tsx
│   │   ├── comments.tsx
│   │   ├── community-input.tsx
│   │   ├── dashboard.tsx
│   │   ├── database-manager.tsx
│   │   ├── expert-verification.tsx
│   │   ├── home.tsx
│   │   ├── not-found.tsx
│   │   ├── onboarding.tsx
│   │   ├── profile.tsx
│   │   ├── search.tsx
│   │   ├── sponsorship/
│   │   │   ├── co-sponsors.tsx
│   │   │   ├── financial-network.tsx
│   │   │   ├── methodology.tsx
│   │   │   ├── overview.tsx
│   │   │   ├── primary-sponsor.tsx
│   │   ├── sponsorship-wrappers.tsx
│   │   ├── user-profile.tsx
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── api-error-handling.integration.test.ts
│   │   │   ├── api-error-handling.test.ts
│   │   │   ├── PageRelationshipService.test.ts
│   │   │   ├── UserJourneyTracker.test.ts
│   │   ├── analysis.ts
│   │   ├── api.ts
│   │   ├── api-error-handling.ts
│   │   ├── navigation.ts
│   │   ├── PageRelationshipService.ts
│   │   ├── UserJourneyTracker.ts
│   │   ├── websocket-client.ts
│   ├── setupTests.ts
│   ├── styles/
│   │   ├── accessibility.css
│   ├── TestComponent.tsx
│   ├── test-utils/
│   │   ├── index.tsx
│   ├── types/
│   │   ├── navigation.ts
│   │   ├── onboarding.ts
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── safe-lazy-loading.test.tsx
│   │   ├── api-health.ts
│   │   ├── asset-loading.ts
│   │   ├── authenticated-api.ts
│   │   ├── browser-compatibility.ts
│   │   ├── browser-compatibility-manager.ts
│   │   ├── browser-compatibility-tests.ts
│   │   ├── cache-strategy.ts
│   │   ├── comprehensiveLoading.ts
│   │   ├── connectionAwareLoading.ts
│   │   ├── development-debug.ts
│   │   ├── development-error-recovery.ts
│   │   ├── logger.js
│   │   ├── logger.ts
│   │   ├── mobile-error-handler.ts
│   │   ├── mobile-touch-handler.ts
│   │   ├── navigation/
│   │   │   ├── __tests__/
│   │   │   │   ├── active-state.test.ts
│   │   │   │   ├── breadcrumb-generator.test.ts
│   │   │   │   ├── page-relationship-utils.test.ts
│   │   │   │   ├── related-pages-calculator.test.ts
│   │   │   │   ├── section-detector.test.ts
│   │   │   │   ├── state-persistence.test.ts
│   │   │   ├── active-state.ts
│   │   │   ├── breadcrumb-generator.ts
│   │   │   ├── page-relationship-utils.ts
│   │   │   ├── related-pages-calculator.ts
│   │   │   ├── section-detector.ts
│   │   │   ├── state-persistence.ts
│   │   ├── performanceMonitoring.ts
│   │   ├── performance-optimizer.ts
│   │   ├── polyfills.ts
│   │   ├── race-condition-prevention.ts
│   │   ├── responsive-layout.ts
│   │   ├── route-preloading.ts
│   │   ├── route-preloading.tsx
│   │   ├── route-validation.ts
│   │   ├── safe-lazy-loading.tsx
│   │   ├── serviceWorker.ts
│   ├── vite-env.d.ts
components.json
cspell.config.yaml
db/
├── index.ts
├── init-scripts/
│   ├── 01-init-database.sql
├── legislative-seed.ts
├── schema/
│   ├── relations.ts
│   ├── schema.ts
│   ├── schema1.ts
├── seed.ts
├── simple-seed.ts
docker-compose.yml
Dockerfile
docs/
├── analysis/
│   ├── chanuka_implementation_guide.md
├── chanuka/
│   ├── ai_code_review_design.md
│   ├── ai_code_review_implementation.md
│   ├── ai_code_review_requirements.md
│   ├── frontend_design.md
│   ├── frontend_requirements.md
│   ├── frontend-stabilization-plan.md
│   ├── shared_core_design.md
│   ├── shared_core_impl_plan.md
│   ├── shared_core_requirements.md
│   ├── unified_ai_dev_framework.md
│   ├── unified_code_analysis_framework.md
│   ├── unified_coding_framework.md
├── chanuka_architecture.txt
├── chanuka_functionality_analysis.md
├── guides/
│   ├── DATABASE_SETUP_GUIDE.md
│   ├── DEMO_MODE_CONFIGURATION.md
│   ├── DEPLOYMENT.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── NAVIGATION_USER_GUIDE.md
│   ├── TROUBLESHOOTING_GUIDE.md
├── project-structure.md
├── strategic-tables-recommendations.md
drizzle/
drizzle.config.ts
├── 0000_clear_risque.sql
├── 0000_initial_migration.sql
├── 0000_quick_aaron_stack.sql
├── 0001_comprehensive_schema.sql
├── 0001_lowly_white_queen.sql
├── 0001_strange_night_nurse.sql
├── 0002_add_bill_engagement.sql
├── 0002_calm_weapon_omega.sql
├── 0002_chief_stellaris.sql
├── 0003_add_comment_features.sql
├── 0003_enhanced_comments_system.sql
├── 0004_fix_schema.sql
├── 0005_complete_schema_update.sql
├── 0006_fix_implementation_workarounds.sql
├── 0007_add_sponsorship_tables.sql
├── 0008_seed_sponsorship_data.sql
├── 0009_add_citizen_verification.sql
├── 0010_add_search_vectors_and_indexes.sql
├── 0011_add_moderation_and_analytics.sql
├── 0012_add_missing_features.sql
├── 0013_fix_missing_tables.sql
├── 0014_create_security_tables.sql
├── 0015_fix_schema_errors.sql
├── 0016_add_last_checked_column.sql
├── 0017_add_success_column.sql
├── 0017_fix_security_schema_issues.sql
├── 0018_add_risk_score_column.sql
├── meta/
│   ├── _journal.json
│   ├── 0000_snapshot.json
│   ├── 0001_snapshot.json
│   ├── 0002_snapshot.json
├── README.md
evaluation.md
generate-structure-to-file.sh
jest.backend.config.js
jest.client.config.js
jest.config.js
LOGGING_MIGRATION_SUMMARY.md
logs/
├── logger_errors.txt
├── logger_files.txt
├── logger_files_clean.txt
migration/
├── __tests__/
│   ├── codemod-imports.test.js
│   ├── feature-flags.test.js
│   ├── rollback-migration.test.js
│   ├── validate-migration.test.js
├── feature-flags.js
├── package.json
├── README.md
├── rollback/
│   ├── package.json
│   ├── rollback-migration.js
├── scripts/
│   ├── codemod-imports.js
│   ├── package.json
├── validation/
│   ├── package.json
│   ├── validate-migration.js
nginx.conf
package.json
package-lock.json
playwright.config.ts
PLAYWRIGHT_MIGRATION_GUIDE.md
postcss.config.js
scripts/
├── analyze-bundle.js
├── check-table-structure.ts
├── database/
│   ├── check-schema.ts
│   ├── debug-migration-table.ts
│   ├── generate-migration.ts
│   ├── migrate.ts
│   ├── run-migrations.ts
│   ├── setup-schema.ts
├── deployment/
│   ├── deploy.sh
├── drop-schema.ts
├── migrate-console-logs.ts
├── run-strategic-tests.js
├── setup-playwright.js
├── test-backend-only.js
├── testing/
│   ├── bug-detector.ts
│   ├── run-bug-detector.ts
│   ├── test-api-health.js
│   ├── test-app.html
│   ├── test-application.js
│   ├── test-build.js
│   ├── test-comment-system.js
│   ├── test-conflict-detection.ts
│   ├── test-enhanced-transparency.ts
│   ├── test-financial-disclosure-integration.ts
│   ├── test-financial-disclosure-integration-unit.ts
│   ├── test-financial-disclosure-simple.ts
│   ├── test-minimal-server.js
│   ├── test-mobile-navigation.html
│   ├── test-profile-routes.ts
│   ├── test-security-implementation.ts
│   ├── test-security-monitoring.ts
│   ├── test-security-monitoring-simple.ts
│   ├── test-security-simple.cjs
│   ├── test-security-simple.js
│   ├── test-security-standalone.ts
│   ├── test-sponsor-routes.js
│   ├── test-sponsor-service.js
│   ├── test-transparency-dashboard.ts
│   ├── test-transparency-implementation.ts
│   ├── test-user-profile-service.js
│   ├── test-viewport.html
│   ├── validate-user-profile.js
│   ├── validate-user-profile.ts
│   ├── validate-user-profile-static.ts
│   ├── verify-active-state.js
│   ├── verify-alert-preferences.ts
│   ├── verify-auth-system.js
│   ├── verify-bill-status-monitor.ts
│   ├── verify-bill-tracking.ts
│   ├── verify-engagement-analytics.ts
│   ├── verify-financial-disclosure-monitoring.js
│   ├── verify-navigation-persistence.js
│   ├── verify-notification-system.ts
│   ├── verify-real-time-tracking.js
│   ├── verify-transparency-task.ts
│   ├── verify-user-profile-service.ts
│   ├── verify-websocket-service.ts
server/
├── CLEANUP_SUMMARY.md
├── comprehensive-race-condition-test.js
├── config/
│   ├── development.ts
│   ├── index.ts
│   ├── production.ts
│   ├── README.md
│   ├── test.ts
├── core/
│   ├── auth/
│   │   ├── auth.ts
│   │   ├── auth-service.ts
│   │   ├── index.ts
│   │   ├── passwordReset.ts
│   │   ├── secure-session-service.ts
│   │   ├── session-cleanup.ts
│   ├── errors/
│   │   ├── error-tracker.ts
│   │   ├── index.ts
│   ├── index.ts
│   ├── StorageTypes.d.ts
│   ├── StorageTypes.ts
│   ├── types/
│   ├── types.ts
│   │   ├── index.ts
│   ├── validation/
│   │   ├── data-completeness.ts
│   │   ├── data-validation.ts
│   │   ├── data-validation-service.ts
│   │   ├── index.ts
│   │   ├── input-validation-service.ts
│   │   ├── schema-validation-service.ts
├── db.ts
├── demo/
│   ├── real-time-tracking-demo.ts
├── docs/
│   ├── government-data-integration-implementation.md
├── features/
│   ├── admin/
│   │   ├── admin.ts
│   │   ├── admin-router.ts
│   │   ├── content-moderation.ts
│   │   ├── external-api-dashboard.ts
│   │   ├── index.ts
│   │   ├── moderation.ts
│   │   ├── system.ts
│   ├── alert-preferences/
│   │   ├── alert_system_docs.md
│   │   ├── alert_utilities.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── create-alert-preference-command.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── create-alert-preference-use-case.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── alert-delivery-log.ts
│   │   │   │   ├── alert-preference.ts
│   │   │   ├── repositories/
│   │   │   │   ├── alert-preference-repository.ts
│   │   │   │   ├── delivery-log-repository.ts
│   │   │   ├── services/
│   │   │   │   ├── alert-delivery-service.ts
│   │   │   │   ├── smart-filtering-service.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── alert-channel.ts
│   │   │   │   ├── alert-conditions.ts
│   │   │   │   ├── alert-type.ts
│   │   │   │   ├── channel-type.ts
│   │   │   │   ├── frequency-config.ts
│   │   │   │   ├── priority.ts
│   │   │   │   ├── smart-filtering-config.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── alert-preference-repository-impl.ts
│   │   ├── unified_alert_routes.ts
│   │   ├── unified_alert_service.ts
│   ├── analytics/
│   │   ├── analysis.ts
│   │   ├── analytics.ts
│   │   ├── config/
│   │   │   ├── __tests__/
│   │   │   │   ├── analytics.config.test.ts
│   │   │   ├── analytics.config.ts
│   │   ├── conflict-detection.ts
│   │   ├── controllers/
│   │   │   ├── engagement.controller.ts
│   │   ├── dashboard.ts
│   │   ├── deployment/
│   │   │   ├── communication-templates.md
│   │   │   ├── feature-flags.md
│   │   │   ├── monitoring-checklist.md
│   │   │   ├── runbook.md
│   │   ├── docs/
│   │   │   ├── automation-setup.md
│   │   ├── financial-disclosure/
│   │   │   ├── config.ts
│   │   │   ├── index.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── legal-analysis.ts
│   │   ├── middleware/
│   │   │   ├── analytics-context.ts
│   │   │   ├── performance-tracking.ts
│   │   ├── ml-analysis.ts
│   │   ├── monitoring/
│   │   │   ├── dashboard-config.json
│   │   │   ├── runbooks.md
│   │   │   ├── setup-guide.md
│   │   ├── README.md
│   │   ├── regulatory-change-monitoring.ts
│   │   ├── services/
│   │   │   ├── engagement.service.ts
│   │   │   ├── financial-disclosure.service.ts
│   │   │   ├── index.ts
│   │   │   ├── ml.service.ts
│   │   ├── storage/
│   │   │   ├── index.ts
│   │   │   ├── progress.storage.ts
│   │   ├── swagger.ts
│   │   ├── transparency-dashboard.ts
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   ├── engagement.ts
│   │   │   ├── financial-disclosure.ts
│   │   │   ├── index.ts
│   │   │   ├── ml.ts
│   │   │   ├── progress-storage.d.ts
│   ├── bills/
│   │   ├── application/
│   │   │   ├── bills.ts
│   │   │   ├── bill-service.ts
│   │   │   ├── index.ts
│   │   ├── bill.js
│   │   ├── bill-status-monitor.ts
│   │   ├── bill-tracking.ts
│   │   ├── domain/
│   │   │   ├── index.ts
│   │   │   ├── LegislativeStorageTypes.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── bill-storage.ts
│   │   │   ├── index.ts
│   │   ├── legislative-storage.ts
│   │   ├── presentation/
│   │   │   ├── bills-router.ts
│   │   │   ├── index.ts
│   │   ├── real-time-analysis.ts
│   │   ├── sponsor-conflict-analysis.ts
│   │   ├── sponsors.ts
│   │   ├── sponsor-service.ts
│   │   ├── sponsorship.ts
│   │   ├── sponsorship-analysis.ts
│   │   ├── voting-pattern-analysis.ts
│   ├── community/
│   │   ├── comment.ts
│   │   ├── comment-storage.ts
│   │   ├── comment-voting.ts
│   │   ├── community.ts
│   │   ├── index.ts
│   │   ├── social-integration.ts
│   │   ├── social-share-storage.d.ts
│   │   ├── social-share-storage.ts
│   │   ├── stakeholder-storage.ts
│   ├── government-data/
│   │   ├── routes.ts
│   ├── privacy/
│   │   ├── privacy-routes.ts
│   │   ├── privacy-scheduler.ts
│   │   ├── privacy-service.ts
│   ├── recommendation/
│   │   ├── application/
│   │   │   ├── EngagementTracker.ts
│   │   │   ├── RecommendationService.ts
│   │   ├── domain/
│   │   │   ├── EngagementScorer.ts
│   │   │   ├── recommendation.dto.ts
│   │   │   ├── RecommendationEngine.ts
│   │   │   ├── RecommendationValidator.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── RecommendationCache.ts
│   │   │   ├── RecommendationRepository.ts
│   │   ├── presentation/
│   │   │   ├── RecommendationController.ts
│   ├── search/
│   │   ├── application/
│   │   │   ├── RelevanceScorer.ts
│   │   │   ├── SearchService.ts
│   │   │   ├── SearchSuggestionsService.ts
│   │   ├── domain/
│   │   │   ├── RelevanceScorer.ts
│   │   │   ├── search.dto.ts
│   │   │   ├── SearchAnalytics.ts
│   │   │   ├── SearchValidator.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── SearchCache.ts
│   │   │   ├── SearchIndexManager.ts
│   │   │   ├── SearchQueryBuilder.ts
│   │   │   ├── SearchRepository.ts
│   │   ├── presentation/
│   │   │   ├── SearchController.ts
│   │   ├── recommendation.README.md
│   │   ├── search-index-manager.ts
│   ├── search-suggestions.ts
│   ├── security/
│   │   ├── encryption-service.ts
│   │   ├── index.ts
│   │   ├── intrusion-detection-service.ts
│   │   ├── privacy-service.ts
│   │   ├── security-audit-service.ts
│   │   ├── security-initialization-service.ts
│   │   ├── security-monitoring.ts
│   │   ├── security-monitoring-service.ts
│   │   ├── tls-config-service.ts
│   ├── sidebar.tsx
│   ├── users/
│   │   ├── __tests__/
│   │   │   ├── ExpertVerificationService.test.ts
│   │   ├── application/
│   │   │   ├── middleware/
│   │   │   │   ├── validation-middleware.ts
│   │   │   ├── profile.ts
│   │   │   ├── services/
│   │   │   │   ├── logging-service.ts
│   │   │   │   ├── metrics-service.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── index.ts
│   │   │   │   ├── profile-management-use-case.ts
│   │   │   │   ├── user-registration-use-case.ts
│   │   │   │   ├── verification-operations-use-case.ts
│   │   │   ├── user-application-service.ts
│   │   │   ├── users.ts
│   │   │   ├── verification.ts
│   │   ├── domain/
│   │   │   ├── aggregates/
│   │   │   │   ├── user-aggregate.ts
│   │   │   ├── citizen-verification.ts
│   │   │   ├── entities/
│   │   │   │   ├── citizen-verification.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── user-profile.ts
│   │   │   │   ├── value-objects.ts
│   │   │   ├── ExpertVerificationService.ts
│   │   │   ├── repositories/
│   │   │   │   ├── user-repository.ts
│   │   │   │   ├── verification-repository.ts
│   │   │   ├── services/
│   │   │   │   ├── profile-domain-service.ts
│   │   │   │   ├── user-management-domain-service.ts
│   │   │   │   ├── user-verification-domain-service.ts
│   │   │   │   ├── verification-domain-service.ts
│   │   │   ├── user-management.ts
│   │   │   ├── user-preferences.ts
│   │   │   ├── user-profile.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── email-service.ts
│   │   │   ├── government-data-service.ts
│   │   │   ├── notification-service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── user-repository-impl.ts
│   │   │   │   ├── verification-repository-impl.ts
│   │   │   ├── user-storage.d.ts
│   │   │   ├── user-storage.ts
├── index.ts
├── infrastructure/
│   ├── cache/
│   │   ├── advanced-caching.ts
│   │   ├── cache.ts
│   │   ├── cache-coordinator.ts
│   │   ├── cache-service.ts
│   │   ├── cache-warming.ts
│   │   ├── index.ts
│   ├── database/
│   │   ├── base/
│   │   │   ├── BaseStorage.d.ts
│   │   │   ├── BaseStorage.js.map
│   │   │   ├── BaseStorage.ts
│   │   ├── config.d.ts
│   │   ├── config.ts
│   │   ├── connection-pool.ts
│   │   ├── core/
│   │   │   ├── __tests__/
│   │   │   │   ├── circuit-breaker.test.ts
│   │   │   │   ├── connection-manager.test.ts
│   │   │   │   ├── connection-manager-metrics.test.ts
│   │   │   │   ├── integration.test.ts
│   │   │   │   ├── performance.test.ts
│   │   │   │   ├── slow-query.test.ts
│   │   │   │   ├── slow-query-integration.test.ts
│   │   │   │   ├── slow-query-performance.test.ts
│   │   │   ├── connection-manager.ts
│   │   │   ├── connection-manager-metrics.ts
│   │   │   ├── query-executor.ts
│   │   ├── database-fallback.ts
│   │   ├── database-optimization.ts
│   │   ├── database-service.ts
│   │   ├── db.ts
│   │   ├── index.d.ts
│   │   ├── index.ts
│   │   ├── migration-service.ts
│   │   ├── schema.sql
│   │   ├── seed-data-service.ts
│   │   ├── storage.ts
│   │   ├── unified-storage.ts
│   ├── demo-data.ts
│   ├── external-data/
│   │   ├── conflict-resolution-service.ts
│   │   ├── data-synchronization-service.ts
│   │   ├── external-api-manager.ts
│   │   ├── government-data-integration.ts
│   │   ├── government-data-service.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   ├── index.ts
│   ├── monitoring/
│   │   ├── apm-service.ts
│   │   ├── audit-log.ts
│   │   ├── db-tracer.ts
│   │   ├── external-api-management.ts
│   │   ├── health.ts
│   │   ├── index.ts
│   │   ├── monitoring.ts
│   │   ├── monitoring-scheduler.ts
│   │   ├── performance-monitor.ts
│   │   ├── performance-monitoring-service.ts
│   │   ├── system-health.ts
│   ├── notifications/
│   │   ├── alerting-service.ts
│   │   ├── email-service.ts
│   │   ├── index.ts
│   │   ├── notification_integration_guide.md
│   │   ├── notification-channels.ts
│   │   ├── notification-orchestrator.ts
│   │   ├── notification-routes.ts
│   │   ├── notifications.ts
│   │   ├── notification-scheduler.ts
│   │   ├── notification-service.ts
│   │   ├── README.md
│   │   ├── refactored_summary.md
│   │   ├── smart-notification-filter.ts
│   ├── websocket.ts
├── middleware/
│   ├── auth.ts
│   ├── error-handler.ts
│   ├── privacy-middleware.ts
│   ├── rate-limiter.ts
│   ├── request-logger.ts
│   ├── security-middleware.ts
│   ├── security-monitoring-middleware.ts
├── routes/
│   ├── regulatory-monitoring.ts
├── scripts/
│   ├── api-race-condition-detector.ts
│   ├── migration-runner.ts
│   ├── test-conflict-analysis.ts
│   ├── test-government-integration.ts
│   ├── verify-external-api-management.ts
├── services/
│   ├── api-cost-monitoring.ts
│   ├── external-api-error-handler.ts
│   ├── managed-government-data-integration.ts
│   ├── README-schema-validation.md
│   ├── schema-validation-demo.ts
│   ├── schema-validation-test.ts
├── simple-race-condition-test.js
├── test-api.js
├── test-db.js
├── test-imports.js
├── tests/
│   ├── auth-system.test.ts
│   ├── external-api-management-task-verification.test.ts
│   ├── features/
│   ├── financial-disclosure-api.test.ts
│   ├── financial-disclosure-monitoring.test.ts
│   ├── integration/
│   │   ├── api-endpoints.test.ts
│   │   ├── api-integration.test.ts
│   │   ├── authentication-flow-validation.test.ts
│   │   ├── comprehensive-api-integration.test.ts
│   │   ├── database-fallback.test.ts
│   │   ├── database-operations.test.ts
│   │   ├── database-transaction-integrity.test.ts
│   │   ├── external-api-management.integration.test.ts
│   │   ├── frontend-serving.test.ts
│   │   ├── frontend-serving-README.md
│   │   ├── README.md
│   │   ├── real-time-notification-delivery.test.ts
│   │   ├── simple-integration.test.ts
│   │   ├── websocket-realtime.test.ts
│   │   ├── working-api-integration.test.ts
│   ├── migration-service.test.ts
│   ├── performance/
│   │   ├── api-performance.test.ts
│   │   ├── bundle-size-monitoring.test.ts
│   │   ├── database-query-performance.test.ts
│   │   ├── memory-usage-profiling.test.ts
│   │   ├── response-time-benchmarking.test.ts
│   ├── privacy-service.test.ts
│   ├── README.md
│   ├── real-time-bill-tracking.test.ts
│   ├── services/
│   │   ├── database-fallback.integration.test.ts
│   │   ├── demo-data.test.ts
│   │   ├── external-api-management.test.ts
│   ├── setup.ts
│   ├── sponsor-conflict-analysis.test.ts
│   ├── test-migrations/
│   │   ├── 0001_test.sql
│   ├── unit/
│   │   ├── auth-service.test.ts
│   │   ├── database-service.test.ts
│   │   ├── data-validation.test.ts
│   │   ├── mocks/
│   │   │   ├── mock-data.ts
│   │   ├── simple-unit.test.ts
│   │   ├── utils.test.ts
│   ├── user-profile-service.test.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── test-helpers.ts
│   ├── voting-pattern-analysis.test.ts
├── types/
│   ├── ambient.d.ts
│   ├── ambient-shims.d.ts
│   ├── api.ts
│   ├── api-response-shim.d.ts
│   ├── drizzle-shims.d.ts
│   ├── global-shims.d.ts
│   ├── jest-extensions.d.ts
│   ├── logger-shim.d.ts
│   ├── schema-shims.d.ts
│   ├── service-shims.d.ts
│   ├── shared-schema-short.d.ts
│   ├── shims.d.ts
├── utils/
│   ├── __tests__/
│   │   ├── cache.test.ts
│   │   ├── db-helpers.test.ts
│   ├── analytics-controller-wrapper.ts
│   ├── api.ts
│   ├── api-response.ts
│   ├── cache.ts
│   ├── crypto.ts
│   ├── db-helpers.ts
│   ├── db-init.ts
│   ├── errors.ts
│   ├── featureFlags.ts
│   ├── logger.ts
│   ├── metrics.ts
│   ├── performance-monitoring-utils.ts
│   ├── race-condition-prevention.ts
│   ├── validation.ts
├── vite.ts
shared/
├── core/
│   ├── CONSOLIDATION_PLAN.md
│   ├── MIGRATION_GUIDE.md
│   ├── MIGRATION_VALIDATION_REPORT.md
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── integration.test.ts
│   │   │   ├── integration-complete.test.ts
│   │   │   ├── migration-validation.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── setup.ts
│   │   │   ├── stress.test.ts
│   │   │   ├── system-integration.test.ts
│   │   ├── caching/
│   │   │   ├── __tests__/
│   │   │   │   ├── ai-cache.test.ts
│   │   │   │   ├── circuit-breaker-single-flight.test.ts
│   │   │   │   ├── factory.test.ts
│   │   │   │   ├── memory-adapter.test.ts
│   │   │   │   ├── single-flight-cache.test.ts
│   │   │   │   ├── single-flight-integration.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── legacy/
│   │   │   │   │   ├── infrastructure-cache-adapter.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── multi-tier-adapter.ts
│   │   │   │   ├── redis-adapter.ts
│   │   │   ├── ai-cache.ts
│   │   │   ├── base-adapter.ts
│   │   │   ├── CIRCUIT_BREAKER_IMPLEMENTATION.md
│   │   │   ├── core/
│   │   │   │   ├── base-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── key-generator.ts
│   │   │   ├── decorators.ts
│   │   │   ├── factory.ts
│   │   │   ├── index.ts
│   │   │   ├── key-generator.ts
│   │   │   ├── legacy-adapters/
│   │   │   ├── legacy-adapters.ts
│   │   │   │   ├── cache-service-adapter.ts
│   │   │   ├── patterns/
│   │   │   │   ├── index.ts
│   │   │   │   ├── single-flight-cache.ts
│   │   │   ├── README.md
│   │   │   ├── single-flight-cache.ts
│   │   │   ├── types.ts
│   │   ├── config/
│   │   │   ├── __tests__/
│   │   │   │   ├── config-manager.test.ts
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   ├── error-handling/
│   │   │   ├── __tests__/
│   │   │   │   ├── circuit-breaker.test.ts
│   │   │   │   ├── error-handler-chain.test.ts
│   │   │   │   ├── specialized-errors.test.ts
│   │   │   ├── base-error.ts
│   │   │   ├── core/
│   │   │   │   ├── types.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── errors/
│   │   │   │   ├── enhanced-errors.ts
│   │   │   │   ├── specialized/
│   │   │   │   │   ├── authentication-error.ts
│   │   │   │   │   ├── authorization-error.ts
│   │   │   │   │   ├── business-logic-error.ts
│   │   │   │   │   ├── configuration-error.ts
│   │   │   │   │   ├── conflict-error.ts
│   │   │   │   │   ├── database-error.ts
│   │   │   │   │   ├── external-service-error.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── internal-server-error.ts
│   │   │   │   │   ├── network-error.ts
│   │   │   │   │   ├── payload-too-large-error.ts
│   │   │   │   │   ├── rate-limit-error.ts
│   │   │   │   │   ├── resource-not-found-error.ts
│   │   │   │   │   ├── system-error.ts
│   │   │   │   │   ├── timeout-error.ts
│   │   │   │   │   ├── unsupported-media-type-error.ts
│   │   │   │   │   ├── validation-error.ts
│   │   │   ├── handlers/
│   │   │   │   ├── error-boundary.ts
│   │   │   │   ├── error-boundary.tsx
│   │   │   │   ├── error-handler-chain.ts
│   │   │   │   ├── index.ts
│   │   │   ├── index.ts
│   │   │   ├── legacy-adapters/
│   │   │   ├── legacy-adapters.ts
│   │   │   │   ├── error-messages-adapter.ts
│   │   │   ├── middleware/
│   │   │   ├── middleware.ts
│   │   │   │   ├── express-error-middleware.ts
│   │   │   │   ├── index.ts
│   │   │   ├── patterns/
│   │   │   │   ├── alert-rules.ts
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── error-patterns.ts
│   │   │   │   ├── index.ts
│   │   │   ├── platform/
│   │   │   │   ├── client/
│   │   │   │   │   ├── error-boundary-adapter.ts
│   │   │   │   ├── server/
│   │   │   │   │   ├── request-context.ts
│   │   │   ├── README.md
│   │   │   ├── services/
│   │   │   │   ├── error-reporting.ts
│   │   │   ├── specialized/
│   │   │   ├── ui/
│   │   │   │   ├── error-fallbacks.ts
│   │   │   │   ├── error-fallbacks.tsx
│   │   ├── errors/
│   │   │   ├── __tests__/
│   │   │   │   ├── CircuitBreaker.test.ts
│   │   │   │   ├── errorHandler.test.ts
│   │   │   ├── base-error.ts
│   │   │   ├── circuit-breaker.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── index.ts
│   │   │   ├── SpecializedErrors.ts
│   │   ├── health/
│   │   │   ├── __tests__/
│   │   │   │   ├── health-checker.test.ts
│   │   │   ├── checks/
│   │   │   │   ├── database-check.ts
│   │   │   │   ├── memory-check.ts
│   │   │   │   ├── redis-check.ts
│   │   │   ├── health-checker.ts
│   │   │   ├── index.ts
│   │   │   ├── middleware.ts
│   │   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── logging/
│   │   │   ├── __tests__/
│   │   │   │   ├── logger.test.ts
│   │   │   │   ├── log-rotation.test.ts
│   │   │   │   ├── middleware.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── legacy/
│   │   │   │   │   ├── fraud-detection-logger-adapter.ts
│   │   │   ├── index.ts
│   │   │   ├── legacy-adapters/
│   │   │   ├── legacy-adapters.ts
│   │   │   │   ├── logger-adapter.ts
│   │   │   ├── logger.d.ts
│   │   │   ├── logger.d.ts.map
│   │   │   ├── logger.js
│   │   │   ├── logger.js.map
│   │   │   ├── logger.ts
│   │   │   ├── log-rotation.ts
│   │   │   ├── middleware.ts
│   │   │   ├── rotation.ts
│   │   │   ├── schemas.ts
│   │   │   ├── service.ts
│   │   │   ├── telemetry.ts
│   │   │   ├── types.ts
│   │   ├── middleware/
│   │   │   ├── __tests__/
│   │   │   │   ├── ai-deduplication.test.ts
│   │   │   │   ├── ai-middleware.test.ts
│   │   │   │   ├── factory.test.ts
│   │   │   ├── ai-deduplication.ts
│   │   │   ├── ai-middleware.ts
│   │   │   ├── auth/
│   │   │   │   ├── provider.ts
│   │   │   ├── cache/
│   │   │   │   ├── provider.ts
│   │   │   ├── config.ts
│   │   │   ├── enhanced-factory.ts
│   │   │   ├── error-handler/
│   │   │   │   ├── provider.ts
│   │   │   ├── factory.ts
│   │   │   ├── factory.ts.bak
│   │   │   ├── factory.ts.new
│   │   │   ├── index.ts
│   │   │   ├── rate-limit/
│   │   │   │   ├── provider.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   ├── unified.ts
│   │   │   ├── validation/
│   │   │   │   ├── provider.ts
│   │   ├── migration/
│   │   │   ├── __tests__/
│   │   │   │   ├── unit/
│   │   │   │   │   ├── adapters/
│   │   │   │   │   │   ├── BaseAdapter.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── BaseAdapter.ts
│   │   │   │   ├── CacheAdapter.ts
│   │   │   ├── feature-flags/
│   │   │   │   ├── FlagManager.ts
│   │   │   │   ├── types.ts
│   │   │   ├── import-migration-helper.ts
│   │   │   ├── index.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── MigrationMetrics.ts
│   │   │   ├── scripts/
│   │   │   │   ├── simple-migration.ts
│   │   │   │   ├── validate-migration.ts
│   │   ├── modernization/
│   │   │   ├── __tests__/
│   │   │   │   ├── orchestrator.test.ts
│   │   │   ├── analysis.ts
│   │   │   ├── backup.ts
│   │   │   ├── cleanup/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── consolidation-integration.test.ts
│   │   │   │   │   ├── orchestrator.test.ts
│   │   │   │   ├── backup-system.ts
│   │   │   │   ├── cli.ts
│   │   │   │   ├── executor.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── orchestrator.ts
│   │   │   ├── index.ts
│   │   │   ├── orchestrator.ts
│   │   │   ├── progress.ts
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   ├── observability/
│   │   │   ├── __tests__/
│   │   │   │   ├── health.test.ts
│   │   │   │   ├── logging.test.ts
│   │   │   │   ├── metrics.test.ts
│   │   │   │   ├── tracing.test.ts
│   │   │   ├── error-management/
│   │   │   │   ├── __tests__/
│   │   │   │   ├── errors/
│   │   │   │   │   ├── base-error.ts
│   │   │   │   │   ├── specialized-errors.ts
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── error-boundary.tsx
│   │   │   │   │   ├── error-handler-chain.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── legacy-adapters/
│   │   │   │   │   ├── error-handling-adapter.ts
│   │   │   │   │   ├── errors-adapter.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── express-error-middleware.ts
│   │   │   │   ├── patterns/
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   ├── retry-patterns.ts
│   │   │   │   ├── types.ts
│   │   │   ├── health/
│   │   │   │   ├── checks.ts
│   │   │   │   ├── health-checker.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── legacy-adapters/
│   │   │   ├── legacy-adapters.ts
│   │   │   │   ├── logging-migration-adapter.ts
│   │   │   ├── logging/
│   │   │   │   ├── index.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── types.ts
│   │   │   ├── metrics/
│   │   │   │   ├── exporters.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── types.ts
│   │   │   ├── README.md
│   │   │   ├── tracing/
│   │   │   │   ├── index.ts
│   │   │   │   ├── tracer.ts
│   │   │   │   ├── types.ts
│   │   ├── primitives/
│   │   │   ├── __tests__/
│   │   │   │   ├── base-error.test.ts
│   │   │   │   ├── branded.test.ts
│   │   │   │   ├── constants.test.ts
│   │   │   │   ├── maybe.test.ts
│   │   │   │   ├── result.test.ts
│   │   │   ├── constants/
│   │   │   │   ├── http-status.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── time.ts
│   │   │   ├── errors/
│   │   │   │   ├── base-error.ts
│   │   │   │   ├── index.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── types/
│   │   │   │   ├── branded.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── maybe.ts
│   │   │   │   ├── result.ts
│   │   ├── rate-limiting/
│   │   │   ├── __tests__/
│   │   │   │   ├── ai-rate-limiter.test.ts
│   │   │   │   ├── memory-store.test.ts
│   │   │   │   ├── middleware.test.ts
│   │   │   │   ├── unified-rate-limiting.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── fixed-window-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── legacy-store-adapter.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── sliding-window-adapter.ts
│   │   │   │   ├── token-bucket-adapter.ts
│   │   │   ├── ai-rate-limiter.ts
│   │   │   ├── algorithms/
│   │   │   │   ├── fixed-window.ts
│   │   │   │   ├── sliding-window.ts
│   │   │   │   ├── token-bucket.ts
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── service.ts
│   │   │   ├── factory.ts
│   │   │   ├── index.ts
│   │   │   ├── metrics.ts
│   │   │   ├── middleware/
│   │   │   ├── middleware.ts
│   │   │   │   ├── express-middleware.ts
│   │   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── services/
│   │   │   │   ├── rate-limiting-service.ts
│   │   │   ├── stores/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── redis-store.test.ts
│   │   │   │   ├── memory-store.ts
│   │   │   │   ├── redis-store.ts
│   │   │   ├── types.ts
│   │   ├── services/
│   │   │   ├── cache.ts
│   │   │   ├── health.ts
│   │   │   ├── logging.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── validation.ts
│   │   ├── testing/
│   │   │   ├── __tests__/
│   │   │   │   ├── load-tester.test.ts
│   │   │   ├── ci-cd-runner.ts
│   │   │   ├── dependency-validator.ts
│   │   │   ├── example-usage.ts
│   │   │   ├── form/
│   │   │   │   ├── base-form-testing.ts
│   │   │   │   ├── enhanced-validation.ts
│   │   │   │   ├── form-testing-utils.ts
│   │   │   │   ├── testing-library-form-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── integration-tests.ts
│   │   │   ├── load-tester.ts
│   │   │   ├── memory-leak-detector.ts
│   │   │   ├── performance-benchmarks.ts
│   │   │   ├── performance-monitor.ts
│   │   │   ├── performance-regression-detector.ts
│   │   │   ├── stress-tests.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   ├── services.ts
│   │   │   ├── validation-types.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   ├── correlation-id.ts
│   │   │   ├── formatting/
│   │   │   │   ├── currency.ts
│   │   │   │   ├── date-time.ts
│   │   │   │   ├── document.ts
│   │   │   │   ├── file-size.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── location.ts
│   │   │   │   ├── status.ts
│   │   │   ├── images/
│   │   │   │   ├── image-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── migration.ts
│   │   │   ├── number-utils.ts
│   │   │   ├── race-condition-prevention.ts
│   │   │   ├── regex-patterns.ts
│   │   │   ├── response-helpers.ts
│   │   │   ├── string-utils.ts
│   │   │   ├── type-guards.ts
│   │   ├── validation/
│   │   │   ├── __tests__/
│   │   │   │   ├── common-schemas.test.ts
│   │   │   │   ├── core-validation-service.test.ts
│   │   │   │   ├── middleware.test.ts
│   │   │   │   ├── setup.ts
│   │   │   │   ├── validation-service.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── custom-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── joi-adapter.ts
│   │   │   │   ├── zod-adapter.ts
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── validation-service.ts
│   │   │   ├── helpers.ts
│   │   │   ├── index.ts
│   │   │   ├── legacy-adapters/
│   │   │   ├── legacy-adapters.ts
│   │   │   │   ├── validation-service-adapter.ts
│   │   │   ├── middleware/
│   │   │   ├── middleware.ts
│   │   │   │   ├── index.ts
│   │   │   ├── migration-validator.ts
│   │   │   ├── README.md
│   │   │   ├── sanitization.ts
│   │   │   ├── schemas/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── property.ts
│   │   │   ├── types.ts
│   │   │   ├── validation-service.ts
│   ├── tasks/
│   │   ├── advanced_integration_tests.ts
│   │   ├── chaos_engineering_tests.ts
│   │   ├── comprehensive_migration_tests.md
│   │   ├── health_test_config.json
│   │   ├── health_test_setup.ts
│   │   ├── middleware_architecture.ts
│   │   ├── middleware_unit_tests.ts
│   │   ├── optimized_health_system.md
│   │   ├── optimized_migration_strategy.md
│   │   ├── optimized-rate-limiting.md
│   │   ├── rate-limiting-integration-tests.ts
│   │   ├── refined_cross_cutting.ts
│   ├── test-validation.js
│   ├── tsconfig.json
│   ├── vitest.config.ts
├── database/
│   ├── connection.ts
│   ├── example-usage.ts
│   ├── init.ts
│   ├── monitoring.ts
│   ├── pool.ts
├── i18n/
│   ├── en.ts
├── schema/
│   ├── enum.ts
│   ├── index.ts
│   ├── schema.ts
│   ├── searchVectorMigration.ts
│   ├── types.ts
│   ├── validation.ts
├── schema_integration_tests.ts
├── schema_unit_test.ts
├── types/
│   ├── auth.ts
│   ├── bill.ts
│   ├── common.ts
│   ├── errors.ts
│   ├── expert.ts
│   ├── legal-analysis.ts
STRATEGIC_MIGRATION_RESULTS.md
tailwind.config.ts
TESTING_GUIDE.md
tests/
├── api/
│   ├── auth.spec.ts
│   ├── database-performance.spec.ts
│   ├── external-api-integration.spec.ts
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── database-performance-ui.spec.ts
├── global-setup.ts
├── global-teardown.ts
├── integration/
│   ├── slow-query-monitoring.spec.ts
├── performance/
│   ├── memory-profiling.spec.ts
├── utils/
│   ├── test-helpers.ts
├── visual/
│   ├── components.spec.ts
tools/
├── validate-schema-congruence.ts
tsconfig.json
tsconfig.server.json
vite.config.ts
vitest.config.ts
vitest.frontend.config.ts
```

**Excluded directories:** `.git`, `node_modules`, `dist`, `build`, `coverage`, `tmp`, `temp`, `__pycache__`, `vendor`, and all hidden files/directories

Generated on: 2025-10-18 16:01:58
