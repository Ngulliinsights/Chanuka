# Project Structure

Maximum depth: 7 levels

```
.
client/
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── project.json
├── public/
│   ├── Chanuka_logo.png
│   ├── Chanuka_logo.svg
│   ├── Chanuka_logo.webp
│   ├── dev-sw.js
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── icon-144x144.png
│   ├── logo-192.png
│   ├── manifest.json
│   ├── manifest.webmanifest
│   ├── offline.html
│   ├── sw.js
├── scripts/
│   ├── consolidate-client.js
│   ├── unregister-sw.js
├── src/
│   ├── __tests__/
│   │   ├── accessibility/
│   │   │   ├── accessibility-ci.test.ts
│   │   │   ├── accessibility-regression.test.ts
│   │   │   ├── accessibility-test-utils.test.ts
│   │   │   ├── accessibility-workflow.test.ts
│   │   │   ├── axe-core-audit.test.ts
│   │   │   ├── keyboard-navigation.test.ts
│   │   │   ├── lighthouse-audit.test.ts
│   │   │   ├── package-scripts.test.ts
│   │   │   ├── screen-reader-support.test.ts
│   │   │   ├── visual-accessibility.test.ts
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
│   │   ├── NavigationTestSuite.test.tsx
│   │   ├── performance/
│   │   │   ├── lazy-loading.test.tsx
│   │   │   ├── page-load-performance.test.tsx
│   │   │   ├── performance-optimization.test.ts
│   │   │   ├── service-worker.test.ts
│   │   ├── setup.ts
│   │   ├── unit/
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.test.tsx
│   │   │   ├── services/
│   │   │   │   ├── api.test.ts
│   │   ├── utils/
│   │   │   ├── asset-loading.test.ts
│   │   │   ├── browser-compatibility.test.ts
│   │   │   ├── polyfills.test.ts
│   │   │   ├── test-logger.ts
│   ├── App.tsx
│   ├── components/
│   │   ├── accessibility/
│   │   │   ├── accessibility-manager.tsx
│   │   │   ├── accessibility-settings-panel.tsx
│   │   ├── admin/
│   │   │   ├── admin-dashboard.tsx
│   │   ├── analysis/
│   │   │   ├── comments.tsx
│   │   │   ├── section.tsx
│   │   │   ├── stats.tsx
│   │   │   ├── timeline.tsx
│   │   ├── analytics/
│   │   │   ├── engagement-dashboard.tsx
│   │   │   ├── JourneyAnalyticsDashboard.tsx
│   │   ├── AppProviders.tsx
│   │   ├── architecture-planning.tsx
│   │   ├── asset-loading/
│   │   │   ├── AssetLoadingProvider.tsx
│   │   ├── auth/
│   │   │   ├── __tests__/
│   │   │   │   ├── accessibility.test.ts
│   │   │   │   ├── auth-accessibility.test.tsx
│   │   │   │   ├── auth-components.test.tsx
│   │   │   │   ├── auth-hooks.test.ts
│   │   │   │   ├── auth-integration.test.tsx
│   │   │   │   ├── auth-validation.test.ts
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration.test.ts
│   │   │   │   ├── recovery.test.ts
│   │   │   │   ├── test-helpers.tsx
│   │   │   │   ├── useAuthForm.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── auth-forms.tsx
│   │   │   ├── config/
│   │   │   │   ├── index.ts
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAuthForm.ts
│   │   │   │   ├── usePasswordUtils.ts
│   │   │   ├── index.ts
│   │   │   ├── recovery.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── AuthAlert.tsx
│   │   │   │   ├── AuthButton.tsx
│   │   │   │   ├── AuthInput.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── PasswordStrengthIndicator.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   ├── utils/
│   │   │   │   ├── auth-validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── test-utils.ts
│   │   │   │   ├── user-utils.ts
│   │   │   ├── validation.ts
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
│   │   │   ├── __tests__/
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── hooks.test.ts
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── recovery.test.ts
│   │   │   │   ├── types.test.ts
│   │   │   │   ├── utils.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── action-items.tsx
│   │   │   ├── activity-summary.tsx
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useDashboard.ts
│   │   │   │   ├── useDashboardActions.ts
│   │   │   │   ├── useDashboardConfig.ts
│   │   │   │   ├── useDashboardTopics.ts
│   │   │   ├── index.ts
│   │   │   ├── recovery.ts
│   │   │   ├── tracked-topics.tsx
│   │   │   ├── types.ts
│   │   │   ├── utils/
│   │   │   │   ├── dashboard-config-utils.ts
│   │   │   │   ├── dashboard-constants.ts
│   │   │   │   ├── dashboard-formatters.ts
│   │   │   │   ├── index.ts
│   │   │   ├── validation.ts
│   │   ├── database-status.tsx
│   │   ├── decision-matrix.tsx
│   │   ├── environment-setup.tsx
│   │   ├── error-boundary.tsx
│   │   ├── error-handling/
│   │   │   ├── __tests__/
│   │   │   │   ├── ErrorBoundary.test.tsx
│   │   │   │   ├── ErrorFallback.test.tsx
│   │   │   │   ├── error-recovery-flows.test.tsx
│   │   │   │   ├── PageErrorBoundary.integration.test.tsx
│   │   │   │   ├── PageErrorBoundary.test.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorFallback.tsx
│   │   │   ├── ErrorRecoveryManager.tsx
│   │   │   ├── index.ts
│   │   │   ├── ServiceUnavailable.tsx
│   │   │   ├── SimpleErrorBoundary.tsx
│   │   │   ├── utils/
│   │   │   │   ├── contextual-messages.ts
│   │   │   │   ├── error-icons.tsx
│   │   │   │   ├── error-normalizer.ts
│   │   │   │   ├── error-reporter.ts
│   │   ├── feature-flags-panel.tsx
│   │   ├── implementation/
│   │   │   ├── workarounds.tsx
│   │   ├── index.ts
│   │   ├── layout/
│   │   │   ├── __tests__/
│   │   │   │   ├── accessibility.test.tsx
│   │   │   │   ├── app-layout.test.tsx
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── layout-components.test.tsx
│   │   │   │   ├── layout-integration.test.tsx
│   │   │   │   ├── mobile-header.test.tsx
│   │   │   │   ├── mobile-navigation.test.tsx
│   │   │   │   ├── responsive.test.tsx
│   │   │   │   ├── sidebar.test.tsx
│   │   │   │   ├── types.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── app-layout.tsx
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   ├── mobile-header.tsx
│   │   │   ├── mobile-navigation.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   ├── loading/
│   │   │   ├── __tests__/
│   │   │   │   ├── AssetFallbacks.test.tsx
│   │   │   │   ├── AssetLoadingIndicator.test.tsx
│   │   │   │   ├── GlobalLoadingIndicator.test.tsx
│   │   │   │   ├── hooks.test.ts
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── LoadingStates.test.tsx
│   │   │   │   ├── loading-utils.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   ├── config/
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── loadingCore.ts
│   │   │   ├── errors.ts
│   │   │   ├── FontFallback.tsx
│   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useLoading.ts
│   │   │   │   ├── useLoadingRecovery.ts
│   │   │   │   ├── useLoadingState.ts
│   │   │   │   ├── useProgressiveLoading.ts
│   │   │   │   ├── useTimeoutAwareLoading.ts
│   │   │   │   ├── useUnifiedLoading.ts
│   │   │   ├── ImageFallback.tsx
│   │   │   ├── index.ts
│   │   │   ├── LoadingDemo.tsx
│   │   │   ├── LoadingStates.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── ScriptFallback.tsx
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── AvatarSkeleton.tsx
│   │   │   │   ├── CardSkeleton.tsx
│   │   │   │   ├── FormSkeleton.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── ListSkeleton.tsx
│   │   │   │   ├── LoadingIndicator.tsx
│   │   │   │   ├── ProgressiveLoader.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── TextSkeleton.tsx
│   │   │   │   ├── TimeoutAwareLoader.tsx
│   │   │   ├── utils/
│   │   │   │   ├── connection-utils.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── loading-utils.ts
│   │   │   │   ├── progress-utils.ts
│   │   │   │   ├── timeout-utils.ts
│   │   │   ├── validation.ts
│   │   ├── migration-manager.tsx
│   │   ├── mobile/
│   │   │   ├── mobile-navigation-enhancements.tsx
│   │   │   ├── mobile-optimized-forms.tsx
│   │   │   ├── mobile-performance-optimizations.tsx
│   │   │   ├── mobile-test-suite.tsx
│   │   │   ├── responsive-layout-manager.tsx
│   │   ├── monitoring/
│   │   │   ├── monitoring-dashboard.tsx
│   │   ├── navigation/
│   │   │   ├── __tests__/
│   │   │   │   ├── navigation-utils.test.ts
│   │   │   │   ├── route-access.test.ts
│   │   │   │   ├── useRelatedPages.test.ts
│   │   │   │   ├── useRouteAccess.test.ts
│   │   │   ├── config/
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── roleGuard.ts
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useNav.ts
│   │   │   │   ├── useRelatedPages.ts
│   │   │   │   ├── useRouteAccess.ts
│   │   │   ├── index.ts
│   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   ├── quick-access-nav.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── DesktopSidebar.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── NavLink.tsx
│   │   │   │   ├── NavSection.tsx
│   │   │   ├── utils/
│   │   │   │   ├── index.ts
│   │   │   │   ├── navigation-utils.ts
│   │   │   │   ├── page-relationships.ts
│   │   │   │   ├── route-access.ts
│   │   │   ├── validation.ts
│   │   ├── notifications/
│   │   │   ├── notification-center.tsx
│   │   │   ├── notification-preferences.tsx
│   │   ├── offline/
│   │   │   ├── offline-manager.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── OfflineModal.tsx
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
│   │   ├── system/
│   │   │   ├── HealthCheck.tsx
│   │   ├── system-health.tsx
│   │   ├── transparency/
│   │   │   ├── ConflictAnalysisDashboard.tsx
│   │   │   ├── ConflictNetworkVisualization.tsx
│   │   ├── ui/
│   │   │   ├── __tests__/
│   │   │   │   ├── enhanced-dialog.test.tsx
│   │   │   │   ├── enhanced-form.test.tsx
│   │   │   │   ├── enhanced-input.test.tsx
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── form-accessibility.test.tsx
│   │   │   │   ├── form-field.test.tsx
│   │   │   │   ├── form-layout.test.tsx
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── recovery.test.ts
│   │   │   │   ├── test-utils.test.tsx
│   │   │   │   ├── test-utils.tsx
│   │   │   │   ├── validation.test.ts
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── errors.ts
│   │   │   ├── form.tsx
│   │   │   ├── form-accessibility.tsx
│   │   │   ├── form-demo.tsx
│   │   │   ├── form-field.tsx
│   │   │   ├── form-layout.tsx
│   │   │   ├── hybrid-components.tsx
│   │   │   ├── index.ts
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── logo.tsx
│   │   │   ├── migration-examples.tsx
│   │   │   ├── OptimizedImage.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── recovery.ts
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
│   │   │   ├── test-components.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   ├── verification/
│   │   │   ├── verification-list.tsx
│   ├── config/
│   │   ├── api.ts
│   │   ├── onboarding.ts
│   ├── contexts/
│   │   ├── __tests__/
│   │   │   ├── NavigationContext.test.tsx
│   │   │   ├── navigation-persistence.test.tsx
│   │   ├── NavigationContext.tsx
│   │   ├── ThemeContext.tsx
│   ├── core/
│   │   ├── dashboard/
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   ├── widgets.ts
│   │   ├── loading/
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   ├── navigation/
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── persistence.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   ├── docs/
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
│   │   ├── index.ts
│   │   ├── useApiConnection.ts
│   │   ├── use-api-with-fallback.ts
│   │   ├── use-auth.tsx
│   │   ├── use-bill-analysis.tsx
│   │   ├── use-bills.tsx
│   │   ├── useConnectionAware.tsx
│   │   ├── useErrorRecovery.ts
│   │   ├── use-i18n.tsx
│   │   ├── use-journey-tracker.ts
│   │   ├── use-keyboard-focus.ts
│   │   ├── use-mobile.tsx
│   │   ├── use-navigation-accessibility.ts
│   │   ├── use-navigation-performance.ts
│   │   ├── use-navigation-preferences.tsx
│   │   ├── useOfflineCapabilities.ts
│   │   ├── useOfflineDetection.tsx
│   │   ├── use-onboarding.tsx
│   │   ├── use-online-status.tsx
│   │   ├── use-safe-mutation.ts
│   │   ├── use-safe-query.ts
│   │   ├── useServiceStatus.ts
│   │   ├── use-system.tsx
│   │   ├── useTimeoutAwareLoading.ts
│   │   ├── use-toast.ts
│   │   ├── use-unified-navigation.ts
│   │   ├── useWebSocket.ts
│   ├── index.css
│   ├── lib/
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
│   │   ├── design-system-test.tsx
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
│   │   ├── user-profile.tsx
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── api-error-handling.integration.test.ts
│   │   │   ├── api-error-handling.test.ts
│   │   │   ├── PageRelationshipService.test.ts
│   │   │   ├── UserJourneyTracker.test.ts
│   │   ├── analysis.ts
│   │   ├── api.ts
│   │   ├── apiInterceptors.ts
│   │   ├── apiService.ts
│   │   ├── index.ts
│   │   ├── navigation.ts
│   │   ├── PageRelationshipService.ts
│   │   ├── UserJourneyTracker.ts
│   │   ├── websocket-client.ts
│   ├── setupTests.ts
│   ├── shared/
│   │   ├── design-system/
│   │   │   ├── __tests__/
│   │   │   │   ├── responsive.test.ts
│   │   │   │   ├── ResponsiveButton.test.tsx
│   │   │   │   ├── ResponsiveContainer.test.tsx
│   │   │   ├── accessibility/
│   │   │   │   ├── contrast.ts
│   │   │   │   ├── focus.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── motion.ts
│   │   │   │   ├── touch.ts
│   │   │   │   ├── typography.ts
│   │   │   ├── components/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── design-standards.test.ts
│   │   │   │   ├── button.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── design-standards.css
│   │   │   │   ├── DesignStandardsDemo.css
│   │   │   │   ├── DesignStandardsDemo.tsx
│   │   │   │   ├── empty-states.ts
│   │   │   │   ├── error-states.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input.ts
│   │   │   │   ├── interactive-states.ts
│   │   │   │   ├── loading-states.ts
│   │   │   │   ├── ResponsiveButton.tsx
│   │   │   │   ├── ResponsiveContainer.tsx
│   │   │   │   ├── ResponsiveGrid.tsx
│   │   │   │   ├── ResponsiveInput.tsx
│   │   │   │   ├── ResponsiveStack.tsx
│   │   │   │   ├── TouchTarget.tsx
│   │   │   │   ├── typography.ts
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── utils.ts
│   │   │   ├── responsive.css
│   │   │   ├── responsive.ts
│   │   │   ├── themes/
│   │   │   │   ├── dark.ts
│   │   │   │   ├── highContrast.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── light.ts
│   │   │   │   ├── themeProvider.ts
│   │   │   ├── tokens/
│   │   │   │   ├── animations.ts
│   │   │   │   ├── borders.ts
│   │   │   │   ├── breakpoints.ts
│   │   │   │   ├── colors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── shadows.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   ├── typography.ts
│   │   │   ├── utils/
│   │   │   │   ├── classNames.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── responsive.ts
│   │   │   │   ├── validation.ts
│   │   ├── errors/
│   │   │   ├── index.ts
│   │   ├── index.ts
│   │   ├── interfaces/
│   │   │   ├── unified-interfaces.ts
│   │   ├── testing/
│   │   │   ├── __tests__/
│   │   │   │   ├── test-utilities.test.tsx
│   │   │   ├── index.ts
│   │   │   ├── test-utilities.tsx
│   │   ├── validation/
│   │   │   ├── __tests__/
│   │   │   │   ├── base-validation.test.ts
│   │   │   ├── base-validation.ts
│   │   │   ├── index.ts
│   ├── styles/
│   │   ├── accessibility.css
│   │   ├── base/
│   │   │   ├── base.css
│   │   │   ├── variables.css
│   │   ├── components/
│   │   │   ├── buttons.css
│   │   │   ├── forms.css
│   │   │   ├── layout.css
│   │   │   ├── ui.css
│   │   ├── design-system.ts
│   │   ├── fallbacks.css
│   │   ├── responsive/
│   │   │   ├── desktop.css
│   │   │   ├── mobile.css
│   │   │   ├── special.css
│   │   │   ├── tablet.css
│   │   ├── themes/
│   │   │   ├── dark.css
│   │   ├── utilities/
│   │   │   ├── accessibility.css
│   │   │   ├── animations.css
│   ├── TestComponent.tsx
│   ├── test-utils/
│   │   ├── index.tsx
│   │   ├── navigation-test-utils.tsx
│   ├── types/
│   │   ├── navigation.ts
│   │   ├── onboarding.ts
│   │   ├── shims-shared.d.ts
│   │   ├── shims-web-vitals.d.ts
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── safe-lazy-loading.test.tsx
│   │   ├── asset-fallback-config.ts
│   │   ├── asset-loading.ts
│   │   ├── authenticated-api.ts
│   │   ├── backgroundSyncManager.ts
│   │   ├── browser-compatibility.ts
│   │   ├── browser-compatibility-manager.ts
│   │   ├── browser-compatibility-tests.ts
│   │   ├── browser-logger.ts
│   │   ├── cacheInvalidation.ts
│   │   ├── client-core.ts
│   │   ├── comprehensiveLoading.ts
│   │   ├── connectionAwareLoading.ts
│   │   ├── development-debug.ts
│   │   ├── development-error-recovery.ts
│   │   ├── env-config.ts
│   │   ├── i18n.ts
│   │   ├── index.ts
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
│   │   ├── offlineAnalytics.ts
│   │   ├── offlineDataManager.ts
│   │   ├── performance-optimizer.ts
│   │   ├── polyfills.ts
│   │   ├── preload-optimizer.ts
│   │   ├── responsive-layout.ts
│   │   ├── route-preloading.ts
│   │   ├── route-preloading.tsx
│   │   ├── route-validation.ts
│   │   ├── rum-integration.ts
│   │   ├── safe-lazy-loading.tsx
│   │   ├── service-recovery.ts
│   │   ├── serviceWorker.ts
│   ├── vite-env.d.ts
├── tailwind.config.ts
├── tsconfig.json
├── TYPESCRIPT_ERROR_FIX_PLAN.md
├── validate-fixes.cjs
├── vite.config.ts
├── vitest.config.ts
components.json
cspell.config.yaml
docker-compose.yml
Dockerfile
docs/
├── analysis/
│   ├── chanuka_implementation_guide.md
│   ├── civic_engagement_framework.md
│   ├── codebase-analysis.md
│   ├── constitutional_analysis_framework.md
│   ├── legislative_framework.md
├── architecture/
├── architecture.md
│   ├── ai-code-review/
│   │   ├── design.md
│   │   ├── implementation.md
│   │   ├── requirements.md
│   ├── application-flow.md
│   ├── frameworks/
│   │   ├── comprehensive-code-analysis.md
│   │   ├── synthesis.md
│   │   ├── unified-ai-dev.md
│   │   ├── unified-code-analysis.md
│   │   ├── unified-code-analysis-v2.md
│   │   ├── unified-coding.md
├── chanuka/
│   ├── community-input_1751743369833.html
│   ├── dashboard_1751743369900.html
│   ├── expert-verification_1751743369833.html
│   ├── ezra-nehemiah-chanuka (1).md
│   ├── merged_bill_sponsorship.html
│   ├── shared_core_design.md
│   ├── shared_core_requirements.md
│   ├── sponsorbyreal.html
├── chanuka_architecture.txt
├── Chanuka_Funding_Pitch.md
├── configuration-assessment.md
├── DIGITAL LAW 2018.pdf
├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
├── error-analysis-report.json
├── monorepo.md
├── project/
│   ├── brand-roadmap.md
│   ├── manifesto.md
│   ├── problem-statement.md
├── project-structure.md
├── README.md
├── setup.md
├── structure_tools_guide.md
DOCUMENTATION_CLEANUP_SUMMARY.md
drizzle/
drizzle.config.ts
├── 0021_clean_comprehensive_schema.sql
├── 0022_fix_schema_alignment.sql
├── 0023_migration_infrastructure.sql
├── 0024_migration_infrastructure.sql
├── 0025_postgresql_fulltext_enhancements.sql
├── 0026_optimize_search_indexes.sql
├── 20251104110148_soft_captain_marvel.sql
├── COMPREHENSIVE_MIGRATION_SUMMARY.md
├── LEGACY_MIGRATION_ARCHIVE.md
├── legacy_migration_validation.sql
├── meta/
│   ├── _journal.json
│   ├── 0000_snapshot.json
│   ├── 0001_snapshot.json
│   ├── 0002_snapshot.json
│   ├── 0021_snapshot.json
│   ├── 20251104110148_snapshot.json
generate-structure-to-file.sh
jest.backend.config.js.backup
logs/
├── app.log
├── error.log
├── logger_errors.txt
├── logger_files.txt
├── logger_files_clean.txt
├── performance.log
├── security.log
MONOREPO_MIGRATION_GUIDE.md
nginx.conf
nx.json
package.json
package-lock.json
performance-baselines.json
playwright.config.ts
playwright-report/
├── index.html
pnpm-workspace.yaml
postcss.config.js
README.md
scripts/
├── accessibility/
│   ├── accessibility-reporter.test.js
├── align-imports.ts
├── align-schema.ts
├── analyze-bundle.cjs
├── analyze-codebase-errors.ts
├── architecture_fixer.ts
├── audit-codebase-utilities.ts
├── audit-error-handling-sprawl.ts
├── audit-middleware-sprawl.ts
├── bundle-analysis-plugin.js
├── bundle-analyzer.js
├── check-tables.ts
├── check-table-structure.ts
├── clean-shared-core-imports.ts
├── cleanup-deprecated-folders.ts
├── cleanup-legacy-adapters.js
├── complete-realignment.ts
├── complete-schema-fix.ts
├── consolidate-sprawl.ts
├── database/
│   ├── check-schema.ts
│   ├── check-tables.ts
│   ├── debug-migration-table.ts
│   ├── generate-migration.ts
│   ├── health-check.ts
│   ├── migrate.ts
│   ├── reset-and-migrate.ts
│   ├── reset-database.ts
│   ├── reset-database-fixed.ts
│   ├── run-migrations.ts
│   ├── run-reset.sh
│   ├── run-reset.ts
│   ├── setup-schema.ts
│   ├── simple-connection-test.ts
│   ├── simple-migrate.ts
│   ├── simple-reset.ts
│   ├── test-connection.ts
├── demo-repository-deployment.ts
├── deploy-error-handling.ts
├── deployment/
│   ├── deploy.sh
├── deploy-phase1-utilities.ts
├── deploy-repository-migration.ts
├── deploy-search-optimization.ts
├── diagnose-503-issues.js
├── domain-type-migration-plan.md
├── drop-schema.ts
├── dynamic-path-updater.js
├── execute-comprehensive-migration.ts
├── fix-all-imports.js
├── fix-all-shared-core-imports.ts
├── fix-api-response-calls.js
├── fix-display-names.ts
├── fix-error-fallback.ts
├── fix-failing-tests.ts
├── fix-frontend-imports.js
├── fix-infrastructure-issues.ts
├── fix-lucide-imports.ts
├── fix-missing-exports.ts
├── fix-navigation-tests.ts
├── fix-performance-tests.ts
├── fix-plural-singular-consistency.ts
├── fix-property-naming-consistency.ts
├── fix-remaining-api-calls.js
├── fix-remaining-errors.ts
├── fix-remaining-imports.js
├── fix-remaining-test-issues.ts
├── fix-schema-references.ts
├── fix-server-logger-imports.js
├── fix-shared-core-imports.ts
├── fix-shared-imports.js
├── fix-typescript-syntax-errors.ts
├── generate-bundle-report.js
├── generate-comprehensive-migrations.ts
├── identify-deprecated-files.cjs
├── identify-deprecated-files.js
├── identify-deprecated-files.ts
├── immediate-memory-cleanup.cjs
├── import-resolution-monitor.js
├── migrate-api-imports.js
├── migrate-codebase-utilities.ts
├── migrate-console-logs.ts
├── migrate-error-handling.ts
├── migrate-shared-types.ts
├── ml-service-demo.ts
├── optimize-memory.js
├── performance-budget-enforcer.cjs
├── performance-trend-analyzer.cjs
├── rollback-cleanup.ts
├── run-adapter-cleanup.js
├── run-strategic-tests.js
├── seeds/
│   ├── legislative-seed.ts
│   ├── seed.ts
│   ├── simple-seed.ts
├── setup-playwright.js
├── test-backend-only.js
├── testing/
│   ├── bug-detector.ts
│   ├── run-bug-detector.ts
│   ├── services/
│   │   ├── transparency-dashboard.js
│   │   ├── transparency-dashboard-simple.js
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
├── test-status-summary.ts
├── typescript-fixer/
│   ├── jest.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   │   ├── analyzers/
│   │   │   ├── database-pattern-detector.ts
│   │   │   ├── drizzle-pattern-detector.ts
│   │   │   ├── import-path-resolver.ts
│   │   │   ├── project-analyzer.ts
│   │   │   ├── schema-import-detector.ts
│   │   │   ├── schema-parser.ts
│   │   │   ├── schema-table-analyzer.ts
│   │   │   ├── shared-core-utility-detector.ts
│   │   ├── cli.ts
│   │   ├── core/
│   │   │   ├── error-extractor.ts
│   │   │   ├── typescript-program-loader.ts
│   │   ├── fixers/
│   │   │   ├── api-response-fixer.ts
│   │   │   ├── database-connection-fixer.ts
│   │   │   ├── exact-optional-property-fixer.ts
│   │   │   ├── shared-core-import-fixer.ts
│   │   │   ├── unused-variable-cleaner.ts
│   │   ├── formatters/
│   │   │   ├── error-message-formatter.ts
│   │   ├── index.ts
│   │   ├── types/
│   │   │   ├── core.ts
│   │   ├── validators/
│   │   │   ├── api-parameter-validator.ts
│   ├── tests/
│   │   ├── analyzers/
│   │   │   ├── database-pattern-detector.test.ts
│   │   │   ├── drizzle-pattern-detector.test.ts
│   │   │   ├── import-path-resolver.test.ts
│   │   │   ├── project-analyzer.test.ts
│   │   │   ├── schema-import-detector.test.ts
│   │   │   ├── schema-parser.test.ts
│   │   │   ├── schema-table-analyzer.test.ts
│   │   │   ├── shared-core-utility-detector.test.ts
│   │   ├── fixers/
│   │   │   ├── api-response-fixer.test.ts
│   │   │   ├── database-connection-fixer.test.ts
│   │   │   ├── exact-optional-property-fixer.test.ts
│   │   │   ├── shared-core-import-fixer.test.ts
│   │   │   ├── unused-variable-cleaner.test.ts
│   │   ├── fixtures/
│   │   │   ├── chanuka-edge-case-patterns.ts
│   │   │   ├── chanuka-shared-core-patterns.ts
│   │   │   ├── chanuka-unused-patterns.ts
│   │   │   ├── chanuka-validation-patterns.ts
│   │   │   ├── database-patterns.ts
│   │   │   ├── sample-chanuka-file.ts
│   │   ├── formatters/
│   │   │   ├── error-message-formatter.test.ts
│   │   ├── global.d.ts
│   │   ├── integration/
│   │   │   ├── database-connection-integration.test.ts
│   │   │   ├── exact-optional-property-integration.test.ts
│   │   ├── setup.ts
│   │   ├── validators/
│   │   │   ├── api-parameter-validator.test.ts
│   ├── tsconfig.json
├── update-core-imports.js
├── update-core-references.js
├── update-test-configuration.ts
├── validate_structure.ts
├── validate-config-consistency.ts
├── validate-imports.js
├── validate-property-naming.ts
├── validate-test-config.js
├── verify-and-fix-project-structure.ts
├── verify-cleanup.ts
├── verify-project-structure.ts
server/
├── __tests__/
│   ├── integration/
│   │   ├── api-integration.test.ts
│   │   ├── batching-memory-integration.test.ts
│   │   ├── boom-error-middleware.test.ts
│   │   ├── comprehensive-integration.test.ts
│   │   ├── connection-migration-stability.test.ts
│   │   ├── error-handling-deployment-integration.test.ts
│   │   ├── migrated-routes.test.ts
│   │   ├── notification-service.test.ts
│   │   ├── repository-deployment-execution.test.ts
│   │   ├── repository-deployment-simple.test.ts
│   │   ├── repository-deployment-validation.test.ts
│   │   ├── sms-push-notifications.test.ts
│   │   ├── websocket-migration-validation.test.ts
│   ├── load/
│   │   ├── websocket-load.test.ts
│   ├── unit/
│   │   ├── notification-service-unit.test.ts
├── comprehensive-race-condition-test.js
├── config/
│   ├── development.ts
│   ├── index.ts
│   ├── production.ts
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
│   ├── schema-import-guide.md
│   ├── schema-migration-summary.md
├── examples/
│   ├── cached-routes-example.ts
├── features/
│   ├── admin/
│   │   ├── __tests__/
│   │   │   ├── content-moderation.test.ts
│   │   ├── admin.ts
│   │   ├── admin-router.ts
│   │   ├── content-moderation.ts
│   │   ├── external-api-dashboard.ts
│   │   ├── index.ts
│   │   ├── moderation/
│   │   ├── moderation.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── content-analysis.service.test.ts
│   │   │   │   ├── moderation-orchestrator.service.test.ts
│   │   │   ├── content-analysis.service.ts
│   │   │   ├── index.ts
│   │   │   ├── moderation-analytics.service.ts
│   │   │   ├── moderation-decision.service.ts
│   │   │   ├── moderation-orchestrator.service.ts
│   │   │   ├── moderation-queue.service.ts
│   │   │   ├── types.ts
│   │   ├── system.ts
│   ├── advocacy/
│   │   ├── advocacy-factory.ts
│   │   ├── application/
│   │   │   ├── action-coordinator.ts
│   │   │   ├── campaign-service.ts
│   │   │   ├── coalition-builder.ts
│   │   │   ├── impact-tracker.ts
│   │   ├── config/
│   │   │   ├── advocacy-config.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── action-item.ts
│   │   │   │   ├── campaign.ts
│   │   │   ├── errors/
│   │   │   │   ├── advocacy-errors.ts
│   │   │   ├── events/
│   │   │   │   ├── advocacy-events.ts
│   │   │   ├── services/
│   │   │   │   ├── campaign-domain-service.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── services/
│   │   │   │   ├── notification-service.ts
│   │   │   │   ├── representative-contact-service.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   ├── alert-preferences/
│   │   ├── alert_system_docs.md
│   │   ├── application/
│   │   │   ├── alert-preferences-service.ts
│   │   │   ├── commands/
│   │   │   │   ├── create-alert-preference-command.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── create-alert-preference-use-case.ts
│   │   │   ├── utils/
│   │   │   │   ├── alert-utilities.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── alert-delivery-log.ts
│   │   │   │   ├── alert-preference.ts
│   │   │   ├── repositories/
│   │   │   │   ├── alert-preference-repository.ts
│   │   │   ├── services/
│   │   │   │   ├── alert-delivery-service.ts
│   │   │   │   ├── smart-filtering-service.ts
│   │   │   │   ├── unified-alert-preference-service.ts
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
│   │   ├── presentation/
│   │   │   ├── routes/
│   │   │   │   ├── unified-alert-routes.ts
│   ├── analysis/
│   │   ├── application/
│   │   │   ├── __tests__/
│   │   │   │   ├── bill-comprehensive-analysis.service.test.ts
│   │   │   │   ├── constitutional-analysis.service.test.ts
│   │   │   │   ├── public-interest-analysis.service.test.ts
│   │   │   │   ├── stakeholder-analysis.service.test.ts
│   │   │   │   ├── transparency-analysis.service.test.ts
│   │   │   ├── analysis-service-direct.ts
│   │   │   ├── bill-comprehensive-analysis.service.ts
│   │   │   ├── constitutional-analysis.service.ts
│   │   │   ├── public-interest-analysis.service.ts
│   │   │   ├── stakeholder-analysis.service.ts
│   │   │   ├── transparency-analysis.service.ts
│   │   ├── architecture-analysis-report.md
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── analysis-result.ts
│   │   │   ├── repositories/
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── ml-service-adapter.test.ts
│   │   │   │   ├── ml-service-adapter.ts
│   │   │   ├── repositories/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── analysis-repository-impl.test.ts
│   │   ├── presentation/
│   │   │   ├── __tests__/
│   │   │   │   ├── analysis.routes.test.ts
│   │   │   ├── analysis.routes.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   ├── analytics/
│   │   ├── __tests__/
│   │   │   ├── ml-basic.test.ts
│   │   │   ├── ml-basic-performance.test.ts
│   │   │   ├── ml-integration.test.ts
│   │   │   ├── ml-performance-benchmark.test.ts
│   │   │   ├── ml-simple.test.ts
│   │   │   ├── ml-simple-performance.test.ts
│   │   │   ├── ml-standalone.test.ts
│   │   ├── analytics.ts
│   │   ├── config/
│   │   │   ├── __tests__/
│   │   │   │   ├── analytics.config.test.ts
│   │   │   ├── analytics.config.ts
│   │   │   ├── ml-feature-flag.config.ts
│   │   │   ├── ml-migration.config.ts
│   │   ├── conflict-detection/
│   │   ├── conflict-detection.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── conflict-detection-engine.service.test.ts
│   │   │   │   ├── conflict-detection-orchestrator.service.test.ts
│   │   │   │   ├── conflict-resolution-recommendation.service.test.ts
│   │   │   │   ├── conflict-severity-analyzer.service.test.ts
│   │   │   │   ├── stakeholder-analysis.service.test.ts
│   │   │   ├── conflict-detection-engine.service.ts
│   │   │   ├── conflict-detection-orchestrator.service.ts
│   │   │   ├── conflict-resolution-recommendation.service.ts
│   │   │   ├── conflict-severity-analyzer.service.ts
│   │   │   ├── index.ts
│   │   │   ├── stakeholder-analysis.service.ts
│   │   │   ├── types.ts
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
│   │   │   ├── ml-service-migration-summary.md
│   │   ├── engagement-analytics.ts
│   │   ├── financial-disclosure/
│   │   │   ├── config.ts
│   │   │   ├── financial-disclosure-orchestrator.service.ts
│   │   │   ├── index.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── services/
│   │   │   │   ├── anomaly-detection.service.ts
│   │   │   │   ├── disclosure-processing.service.ts
│   │   │   │   ├── disclosure-validation.service.ts
│   │   │   │   ├── financial-analysis.service.ts
│   │   │   │   ├── index.ts
│   │   │   ├── tests/
│   │   │   │   ├── financial-disclosure-workflow.integration.test.ts
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
│   │   ├── performance-dashboard.ts
│   │   ├── regulatory-change-monitoring.ts
│   │   ├── scripts/
│   │   │   ├── configure-ml-migration.ts
│   │   │   ├── demo-ml-migration.ts
│   │   ├── services/
│   │   │   ├── engagement.service.ts
│   │   │   ├── financial-disclosure.service.ts
│   │   │   ├── index.ts
│   │   │   ├── ml.service.ts
│   │   │   ├── ml-adapter.service.ts
│   │   │   ├── real-ml.service.ts
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
│   ├── argument-intelligence/
│   │   ├── application/
│   │   │   ├── argument-intelligence-service.ts
│   │   │   ├── argument-processor.ts
│   │   │   ├── brief-generator.ts
│   │   │   ├── clustering-service.ts
│   │   │   ├── coalition-finder.ts
│   │   │   ├── evidence-validator.ts
│   │   │   ├── power-balancer.ts
│   │   │   ├── structure-extractor.ts
│   │   ├── IMPLEMENTATION_STATUS.md
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── nlp/
│   │   │   │   ├── entity-extractor.ts
│   │   │   │   ├── sentence-classifier.ts
│   │   │   │   ├── similarity-calculator.ts
│   │   │   ├── repositories/
│   │   ├── presentation/
│   │   │   ├── argument-intelligence-router.ts
│   │   ├── tests/
│   │   │   ├── argument-intelligence.test.ts
│   ├── bills/
│   │   ├── __tests__/
│   │   │   ├── bill-migration-validation.test.ts
│   │   │   ├── bill-performance-benchmarks.test.ts
│   │   │   ├── bill-relationships-validation.test.ts
│   │   │   ├── bill-service-performance.test.ts
│   │   │   ├── bill-service-result-integration.test.ts
│   │   ├── application/
│   │   │   ├── __tests__/
│   │   │   │   ├── bill-status-monitor.test.ts
│   │   │   │   ├── bill-tracking.service.test.ts
│   │   │   ├── bills.ts
│   │   │   ├── bill-service.ts
│   │   │   ├── bill-service-adapter.ts
│   │   │   ├── bill-tracking.service.ts
│   │   │   ├── index.ts
│   │   │   ├── sponsorship-analysis.service.ts
│   │   ├── bill.js
│   │   ├── bill-status-monitor.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── bill.ts
│   │   │   ├── errors/
│   │   │   │   ├── bill-errors.ts
│   │   │   ├── events/
│   │   │   │   ├── bill-events.ts
│   │   │   ├── index.ts
│   │   │   ├── LegislativeStorageTypes.ts
│   │   │   ├── services/
│   │   │   │   ├── bill-domain-service.ts
│   │   │   │   ├── bill-event-handler.ts
│   │   │   │   ├── bill-notification-service.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── bill-storage.ts
│   │   │   ├── index.ts
│   │   ├── legislative-storage.ts
│   │   ├── MIGRATION_SUMMARY.md
│   │   ├── presentation/
│   │   │   ├── __tests__/
│   │   │   │   ├── bill-tracking.routes.test.ts
│   │   │   ├── bills-router.ts
│   │   │   ├── bills-router-migrated.ts
│   │   │   ├── bill-tracking.routes.ts
│   │   │   ├── index.ts
│   │   │   ├── sponsorship.routes.ts
│   │   ├── real-time-tracking.ts
│   │   ├── repositories/
│   │   │   ├── sponsorship-repository.ts
│   │   ├── services/
│   │   │   ├── voting-pattern-analysis-service.ts
│   │   ├── types/
│   │   │   ├── analysis.ts
│   │   ├── voting-pattern-analysis.ts
│   │   ├── voting-pattern-analysis-router.ts
│   ├── community/
│   │   ├── __tests__/
│   │   │   ├── comment-service-integration.test.ts
│   │   ├── comment.ts
│   │   ├── comment-storage.ts
│   │   ├── comment-voting.ts
│   │   ├── community.ts
│   │   ├── domain/
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   ├── social-integration.ts
│   │   ├── social-share-storage.d.ts
│   │   ├── social-share-storage.ts
│   │   ├── stakeholder-storage.ts
│   ├── constitutional-analysis/
│   │   ├── application/
│   │   │   ├── constitutional-analysis-service-complete.ts
│   │   │   ├── constitutional-analyzer.ts
│   │   │   ├── expert-flagging-service.ts
│   │   │   ├── precedent-finder.ts
│   │   │   ├── provision-matcher.ts
│   │   ├── config/
│   │   │   ├── analysis-config.ts
│   │   ├── demo/
│   │   │   ├── constitutional-analysis-demo.ts
│   │   ├── domain/
│   │   │   ├── repositories/
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── external/
│   │   │   │   ├── legal-database-client.ts
│   │   │   ├── repositories/
│   │   ├── presentation/
│   │   │   ├── constitutional-analysis-router.ts
│   │   ├── scripts/
│   │   │   ├── populate-sample-data.ts
│   │   ├── services/
│   │   │   ├── constitutional-analysis-factory.ts
│   │   ├── test-router.ts
│   │   ├── tests/
│   │   │   ├── constitutional-analysis.test.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   ├── utils/
│   │   │   ├── analysis-utils.ts
│   ├── constitutional-intelligence/
│   │   ├── application/
│   │   │   ├── constitutional-analysis.service.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── constitutional-provision.ts
│   ├── DRIZZLE_MIGRATION_FINAL_REPORT.md
│   ├── DRIZZLE_MIGRATION_PLAN.md
│   ├── DRIZZLE_MIGRATION_PROGRESS.md
│   ├── FUNCTIONALITY_COMPARISON_ANALYSIS.md
│   ├── government-data/
│   │   ├── routes.ts
│   │   ├── services/
│   │   │   ├── government-data-integration.service.ts
│   ├── index.ts
│   ├── MIGRATION_COMPLETION_SUMMARY.md
│   ├── notifications/
│   │   ├── __tests__/
│   │   │   ├── notification-service-integration.test.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── notification.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
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
│   ├── REPOSITORY_MIGRATION_COMPLETE.md
│   ├── REPOSITORY_PATTERN_ANALYSIS.md
│   ├── repository-cleanup.ts
│   ├── search/
│   │   ├── __tests__/
│   │   │   ├── basic-test.cjs
│   │   │   ├── fuse-basic.test.ts
│   │   │   ├── fuse-engine-direct.test.ts
│   │   │   ├── fuse-relevance-comparison.test.ts
│   │   │   ├── fuse-standalone.test.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── postgresql-basic.test.ts
│   │   │   ├── postgresql-fulltext-integration.test.ts
│   │   │   ├── postgresql-fulltext-performance.test.ts
│   │   │   ├── query-builder-migration.test.ts
│   │   │   ├── query-migration-validation.js
│   │   │   ├── search-benchmark.ts
│   │   │   ├── search-benchmark-simple.test.ts
│   │   │   ├── search-load.test.ts
│   │   │   ├── search-optimization-integration.test.ts
│   │   │   ├── search-performance.test.ts
│   │   │   ├── search-service-integration.test.ts
│   │   │   ├── simple-matching-unit.test.ts
│   │   │   ├── simple-test.ts
│   │   ├── application/
│   │   │   ├── search-service.ts
│   │   │   ├── SearchService.ts
│   │   │   ├── search-service-direct.ts
│   │   ├── deployment/
│   │   │   ├── search-deployment.service.ts
│   │   │   ├── search-deployment-orchestrator.ts
│   │   │   ├── search-rollback.service.ts
│   │   ├── domain/
│   │   │   ├── RelevanceScorer.ts
│   │   │   ├── search.dto.ts
│   │   │   ├── SearchAnalytics.ts
│   │   │   ├── SearchValidator.ts
│   │   │   ├── types/
│   │   ├── engines/
│   │   │   ├── core/
│   │   │   │   ├── fuse-search.engine.ts
│   │   │   │   ├── fuzzy-matching.engine.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── postgresql-fulltext.engine.ts
│   │   │   │   ├── simple-matching.engine.ts
│   │   │   ├── index.ts
│   │   │   ├── suggestion/
│   │   │   │   ├── index.ts
│   │   │   │   ├── suggestion-engine.service.ts
│   │   │   │   ├── suggestion-ranking.service.ts
│   │   │   ├── suggestion-engine.service.ts
│   │   │   ├── suggestion-ranking.service.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── search.types.ts
│   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── SearchCache.ts
│   │   │   ├── SearchIndexManager.ts
│   │   │   ├── SearchQueryBuilder.ts
│   │   ├── monitoring/
│   │   │   ├── search-performance-monitor.ts
│   │   ├── presentation/
│   │   │   ├── SearchController.ts
│   │   ├── search-index-manager.ts
│   │   ├── services/
│   │   │   ├── history-cleanup.service.ts
│   │   ├── types/
│   │   ├── utils/
│   │   │   ├── parallel-query-executor.ts
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
│   ├── sponsors/
│   │   ├── application/
│   │   │   ├── __tests__/
│   │   │   │   ├── sponsor-conflict-analysis.service.test.ts
│   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   ├── sponsor-service-direct.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── sponsor.repository.test.ts
│   │   ├── presentation/
│   │   │   ├── __tests__/
│   │   │   │   ├── sponsors.routes.test.ts
│   │   │   ├── sponsors.routes.ts
│   │   ├── types/
│   │   │   ├── analysis.ts
│   │   │   ├── index.ts
│   ├── users/
│   │   ├── __tests__/
│   │   │   ├── ExpertVerificationService.test.ts
│   │   │   ├── user-domain-service-integration.test.ts
│   │   │   ├── user-service-basic.test.ts
│   │   │   ├── user-service-direct-integration.test.ts
│   │   │   ├── user-service-result-integration.test.ts
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
│   │   │   ├── user-service-direct.ts
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
│   │   │   ├── user-storage.d.ts
│   │   │   ├── user-storage.ts
│   │   ├── MIGRATION_SUMMARY.md
│   │   ├── types/
│   │   │   ├── index.ts
├── index.ts
├── infrastructure/
│   ├── __tests__/
│   │   ├── connection-migrator.test.ts
│   │   ├── socketio-basic.test.ts
│   │   ├── socketio-service.test.ts
│   │   ├── websocket-adapter-migration.test.ts
│   ├── adapters/
│   │   ├── __tests__/
│   │   │   ├── adapter-core.test.ts
│   │   │   ├── drizzle-adapter.test.ts
│   │   │   ├── entity-mappings.test.ts
│   │   ├── drizzle-adapter.ts
│   │   ├── mappings/
│   │   │   ├── bill-mapping.ts
│   │   │   ├── comment-mapping.ts
│   │   │   ├── index.ts
│   │   │   ├── notification-mapping.ts
│   │   │   ├── user-mapping.ts
│   ├── batching-service.ts
│   ├── cache/
│   │   ├── cache.ts
│   │   ├── cache-management.routes.ts
│   │   ├── cache-service.ts
│   │   ├── index.ts
│   │   ├── query-cache.ts
│   ├── CACHING_INTEGRATION.md
│   ├── connection-migration-summary.md
│   ├── connection-migrator.ts
│   ├── database/
│   │   ├── base/
│   │   │   ├── BaseStorage.d.ts
│   │   │   ├── BaseStorage.js.map
│   │   │   ├── BaseStorage.ts
│   │   ├── config.d.ts
│   │   ├── config.ts
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
│   │   ├── index.d.ts
│   │   ├── index.ts
│   │   ├── migration-service.ts
│   │   ├── schema.sql
│   │   ├── seed-data-service.ts
│   │   ├── storage.ts
│   │   ├── unified-storage.ts
│   ├── demo-data.ts
│   ├── errors/
│   │   ├── __tests__/
│   │   │   ├── error-adapter.test.ts
│   │   │   ├── error-adapter-integration.test.ts
│   │   ├── error-adapter.ts
│   │   ├── error-standardization.ts
│   │   ├── migration-example.ts
│   │   ├── result-adapter.ts
│   │   ├── result-integration-summary.md
│   ├── external-data/
│   │   ├── conflict-resolution-service.ts
│   │   ├── data-synchronization-service.ts
│   │   ├── external-api-manager.ts
│   │   ├── government-data-integration.ts
│   │   ├── government-data-service.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   ├── feature-flags.ts
│   ├── index.ts
│   ├── integration/
│   │   ├── service-orchestrator.ts
│   ├── memory-aware-socket-service.ts
│   ├── memory-monitor.ts
│   ├── migration/
│   │   ├── __tests__/
│   │   │   ├── dashboard-orchestrator.test.ts
│   │   │   ├── error-handling-deployment.test.ts
│   │   │   ├── migration-infrastructure.test.ts
│   │   │   ├── phase1-deployment.test.ts
│   │   ├── ab-testing.service.ts
│   │   ├── ab-testing-service.ts
│   │   ├── dashboard.service.ts
│   │   ├── deployment.service.ts
│   │   ├── deployment-monitoring-dashboard.ts
│   │   ├── deployment-orchestrator.ts
│   │   ├── error-handling-deployment.service.ts
│   │   ├── error-handling-deployment-summary.md
│   │   ├── execute-phase1-deployment.ts
│   │   ├── feature-flags.service.ts
│   │   ├── feature-flags-service.ts
│   │   ├── index.ts
│   │   ├── migration-api.ts
│   │   ├── migration-state.schema.ts
│   │   ├── monitoring.service.ts
│   │   ├── orchestrator.service.ts
│   │   ├── phase1-deployment-orchestrator.ts
│   │   ├── repository-deployment.service.ts
│   │   ├── repository-deployment-executor.ts
│   │   ├── repository-deployment-service.ts
│   │   ├── repository-deployment-validator.ts
│   │   ├── rollback.service.ts
│   │   ├── validation.service.ts
│   ├── monitoring/
│   │   ├── audit-log.ts
│   │   ├── external-api-management.ts
│   │   ├── index.ts
│   │   ├── monitoring-scheduler.ts
│   │   ├── performance-monitor.ts
│   ├── notifications/
│   │   ├── __tests__/
│   │   │   ├── notification-orchestrator.test.ts
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
│   │   ├── refactored_summary.md
│   │   ├── smart-notification-filter.ts
│   ├── security/
│   │   ├── data-privacy-service.ts
│   │   ├── input-validation-service.ts
│   │   ├── secure-query-builder.ts
│   ├── socketio-service.ts
│   ├── websocket.ts
│   ├── websocket-adapter.ts
│   ├── websocket-config.ts
├── logs/
│   ├── app.log
│   ├── error.log
│   ├── performance.log
│   ├── security.log
├── middleware/
│   ├── auth.ts
│   ├── boom-error-middleware.ts
│   ├── boom-migration-summary.md
│   ├── cache-middleware.ts
│   ├── file-upload-validation.ts
│   ├── migration-wrapper.ts
│   ├── privacy-middleware.ts
│   ├── rate-limiter.ts
│   ├── request-logger.ts
│   ├── resource-availability.ts
│   ├── security-middleware.ts
│   ├── security-monitoring-middleware.ts
│   ├── server-error-integration.ts
│   ├── service-availability.ts
├── package.json
├── project.json
├── routes/
│   ├── regulatory-monitoring.ts
├── scripts/
│   ├── api-race-condition-detector.ts
│   ├── deploy-repository-migration.ts
│   ├── deploy-websocket-migration.ts
│   ├── execute-websocket-migration.ts
│   ├── final-migration-validation.ts
│   ├── legacy-websocket-cleanup.ts
│   ├── migration-runner.ts
│   ├── run-websocket-validation.ts
│   ├── simple-websocket-validation.ts
│   ├── test-conflict-analysis.ts
│   ├── test-government-integration.ts
│   ├── test-websocket-migration.ts
│   ├── update-schema-imports.ts
│   ├── validate-connection-migration.ts
│   ├── verify-external-api-management.ts
│   ├── websocket-performance-validation.ts
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
│   ├── real-time-bill-tracking.test.ts
│   ├── security/
│   │   ├── comprehensive-validation.test.ts
│   │   ├── data-privacy-service.test.ts
│   │   ├── input-validation-service.test.ts
│   │   ├── secure-query-builder.test.ts
│   │   ├── security-implementation.test.ts
│   │   ├── sql-injection-prevention.test.ts
│   ├── services/
│   │   ├── database-fallback.integration.test.ts
│   │   ├── demo-data.test.ts
│   │   ├── external-api-management.test.ts
│   ├── setup.ts
│   ├── sponsor-conflict-analysis.test.ts
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
├── tsconfig.json
├── types/
│   ├── api.ts
│   ├── common.ts
│   ├── jest-extensions.d.ts
│   ├── shared-schema-short.d.ts
├── utils/
│   ├── __tests__/
│   │   ├── cache.test.ts
│   │   ├── db-helpers.test.ts
│   ├── analytics-controller-wrapper.ts
│   ├── api-response.ts
│   ├── crypto.ts
│   ├── db-helpers.ts
│   ├── db-init.ts
│   ├── errors.ts
│   ├── featureFlags.ts
│   ├── metrics.ts
│   ├── shared-core-fallback.ts
│   ├── validation.ts
├── vite.ts
├── vitest.config.ts
shared/
├── core/
│   ├── index.ts
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── integration.test.ts
│   │   │   ├── integration-complete.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── setup.ts
│   │   │   ├── stress.test.ts
│   │   │   ├── system-integration.test.ts
│   │   ├── cache/
│   │   │   ├── index.ts
│   │   ├── caching/
│   │   │   ├── __tests__/
│   │   │   │   ├── ai-cache.test.ts
│   │   │   │   ├── circuit-breaker-single-flight.test.ts
│   │   │   │   ├── factory.test.ts
│   │   │   │   ├── interfaces.test.ts
│   │   │   │   ├── memory-adapter.test.ts
│   │   │   │   ├── single-flight-cache.test.ts
│   │   │   │   ├── single-flight-integration.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── browser-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── multi-tier-adapter.ts
│   │   │   │   ├── redis-adapter.ts
│   │   │   ├── ai-cache.ts
│   │   │   ├── cache-factory.ts
│   │   │   ├── clustering/
│   │   │   │   ├── cluster-manager.ts
│   │   │   ├── compression/
│   │   │   │   ├── cache-compressor.ts
│   │   │   ├── core/
│   │   │   │   ├── base-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── key-generator.ts
│   │   │   ├── decorators.ts
│   │   │   ├── factory.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── interfaces.ts
│   │   │   ├── key-generator.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── metrics-collector.ts
│   │   │   ├── patterns/
│   │   │   │   ├── index.ts
│   │   │   ├── serialization/
│   │   │   │   ├── cache-serializer.ts
│   │   │   ├── simple-factory.ts
│   │   │   ├── single-flight-cache.ts
│   │   │   ├── tagging/
│   │   │   │   ├── tag-manager.ts
│   │   │   ├── test-basic.ts
│   │   │   ├── test-comprehensive.ts
│   │   │   ├── types.ts
│   │   │   ├── utilities/
│   │   │   │   ├── cache-compressor.ts
│   │   │   │   ├── cache-tag-manager.ts
│   │   │   │   ├── cache-warmer.ts
│   │   │   ├── validation.ts
│   │   │   ├── warming/
│   │   │   │   ├── cache-warmer.ts
│   │   ├── config/
│   │   │   ├── __tests__/
│   │   │   │   ├── config-manager.test.ts
│   │   │   ├── index.ts
│   │   │   ├── manager.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   ├── index.ts
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
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── rate-limit/
│   │   │   │   ├── provider.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   ├── unified.ts
│   │   │   ├── validation/
│   │   │   │   ├── provider.ts
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
│   │   │   │   ├── stack.test.ts
│   │   │   │   ├── tracing.test.ts
│   │   │   ├── correlation.ts
│   │   │   ├── error-management/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── error-management-integration.test.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── error-analytics.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── base-error.ts
│   │   │   │   │   ├── specialized-errors.ts
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── enhanced-error-boundary.tsx
│   │   │   │   │   ├── error-boundary.tsx
│   │   │   │   │   ├── error-handler-chain.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── error-tracking-integration.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── express-error-middleware.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── error-monitor.ts
│   │   │   │   ├── patterns/
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   ├── retry-patterns.ts
│   │   │   │   ├── recovery/
│   │   │   │   │   ├── error-recovery-engine.ts
│   │   │   │   ├── reporting/
│   │   │   │   │   ├── user-error-reporter.ts
│   │   │   │   ├── types.ts
│   │   │   ├── health/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── health-checker.test.ts
│   │   │   │   ├── checks/
│   │   │   │   ├── checks.ts
│   │   │   │   │   ├── database-check.ts
│   │   │   │   │   ├── memory-check.ts
│   │   │   │   │   ├── redis-check.ts
│   │   │   │   ├── health-checker.ts
│   │   │   │   ├── health-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   ├── server-health.ts
│   │   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── interfaces.ts
│   │   │   ├── logging/
│   │   │   │   ├── index.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── logging-service.ts
│   │   │   │   ├── types.ts
│   │   │   ├── metrics/
│   │   │   │   ├── collectors.ts
│   │   │   │   ├── exporters/
│   │   │   │   ├── exporters.ts
│   │   │   │   │   ├── cloudwatch.ts
│   │   │   │   │   ├── prometheus.ts
│   │   │   │   │   ├── statsd.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── types.ts
│   │   │   ├── middleware.ts
│   │   │   ├── stack.ts
│   │   │   ├── telemetry.ts
│   │   │   ├── tracing/
│   │   │   │   ├── context.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── span.ts
│   │   │   │   ├── tracer.ts
│   │   │   │   ├── types.ts
│   │   │   ├── types.ts
│   │   ├── performance/
│   │   │   ├── budgets.ts
│   │   │   ├── index.ts
│   │   │   ├── method-timing.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── unified-monitoring.ts
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
│   │   │   ├── index.ts
│   │   │   ├── types/
│   │   │   │   ├── branded.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── maybe.ts
│   │   │   │   ├── result.ts
│   │   ├── rate-limiting/
│   │   │   ├── __tests__/
│   │   │   │   ├── ai-rate-limiter.test.ts
│   │   │   │   ├── algorithms.test.ts
│   │   │   │   ├── memory-store.test.ts
│   │   │   │   ├── middleware.test.ts
│   │   │   │   ├── stores.test.ts
│   │   │   │   ├── unified-rate-limiting.test.ts
│   │   │   ├── adapters/
│   │   │   │   ├── fixed-window-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── sliding-window-adapter.ts
│   │   │   │   ├── token-bucket-adapter.ts
│   │   │   ├── ai-rate-limiter.ts
│   │   │   ├── algorithms/
│   │   │   │   ├── fixed-window.ts
│   │   │   │   ├── interfaces.ts
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
│   │   │   ├── services/
│   │   │   │   ├── rate-limiting-service.ts
│   │   │   ├── stores/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── redis-store.test.ts
│   │   │   │   ├── memory-store.ts
│   │   │   │   ├── redis-store.ts
│   │   │   ├── types.ts
│   │   ├── repositories/
│   │   │   ├── index.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── bill-repository.interface.ts
│   │   │   │   ├── sponsor-repository.interface.ts
│   │   │   ├── test-implementations/
│   │   │   │   ├── bill-test-repository.ts
│   │   │   │   ├── sponsor-test-repository.ts
│   │   ├── services/
│   │   │   ├── cache.ts
│   │   │   ├── composition.ts
│   │   │   ├── index.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── bill-service.interface.ts
│   │   │   │   ├── notification-service.interface.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── test-implementations/
│   │   │   │   ├── bill-test-service.ts
│   │   │   │   ├── notification-test-service.ts
│   │   │   ├── validation.ts
│   │   ├── testing/
│   │   │   ├── __tests__/
│   │   │   │   ├── load-tester.test.ts
│   │   │   ├── ci-cd-runner.ts
│   │   │   ├── dependency-injection-container.ts
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
│   │   │   ├── schema-agnostic-test-helper.ts
│   │   │   ├── stress-tests.ts
│   │   │   ├── test-data-factory.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── services.ts
│   │   │   ├── validation-types.ts
│   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   │   ├── concurrency-adapter.test.ts
│   │   │   │   ├── concurrency-migration-router.test.ts
│   │   │   │   ├── integration.test.ts
│   │   │   ├── api/
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interceptors.ts
│   │   │   ├── api-utils.ts
│   │   │   ├── async-utils.ts
│   │   │   ├── browser-logger.test.ts
│   │   │   ├── browser-logger.ts
│   │   │   ├── cache-utils.ts
│   │   │   ├── concurrency-adapter.ts
│   │   │   ├── concurrency-migration-router.ts
│   │   │   ├── constants.ts
│   │   │   ├── correlation-id.ts
│   │   │   ├── dashboard-utils.ts
│   │   │   ├── data-utils.ts
│   │   │   ├── examples/
│   │   │   │   ├── concurrency-migration-example.ts
│   │   │   ├── formatting/
│   │   │   │   ├── currency.ts
│   │   │   │   ├── date-time.ts
│   │   │   │   ├── document.ts
│   │   │   │   ├── file-size.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── location.ts
│   │   │   │   ├── status.ts
│   │   │   ├── http-utils.ts
│   │   │   ├── images/
│   │   │   │   ├── image-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── loading-utils.ts
│   │   │   ├── navigation-utils.ts
│   │   │   ├── number-utils.ts
│   │   │   ├── performance-utils.ts
│   │   │   ├── race-condition-prevention.ts
│   │   │   ├── regex-patterns.ts
│   │   │   ├── response-helpers.ts
│   │   │   ├── security-utils.ts
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
│   │   │   │   ├── base-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── validation-service.ts
│   │   │   ├── helpers.ts
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   ├── middleware.ts
│   │   │   │   ├── index.ts
│   │   │   ├── sanitization.ts
│   │   │   ├── schemas/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── property.ts
│   │   │   ├── types.ts
│   │   │   ├── validation-service.ts
├── database/
│   ├── connection.ts
│   ├── example-usage.ts
│   ├── index.ts
│   ├── init.ts
│   ├── monitoring.ts
│   ├── pool.ts
├── i18n/
│   ├── en.ts
├── package.json
├── project.json
├── schema/
│   ├── __tests__/
│   │   ├── advocacy_coordination.test.ts
│   │   ├── argument_intelligence.test.ts
│   │   ├── citizen_participation.test.ts
│   │   ├── constitutional_intelligence.test.ts
│   │   ├── foundation.test.ts
│   │   ├── impact_measurement.test.ts
│   │   ├── integrity_operations.test.ts
│   │   ├── parliamentary_process.test.ts
│   │   ├── platform_operations.test.ts
│   │   ├── README.md
│   │   ├── run_all_tests.ts
│   │   ├── run_tests.ts
│   │   ├── setup.ts
│   │   ├── test_runner.sh
│   │   ├── transparency_analysis.test.ts
│   │   ├── universal_access.test.ts
│   ├── advocacy_coordination.ts
│   ├── analysis.ts
│   ├── argument_intelligence.ts
│   ├── citizen_participation.ts
│   ├── COMPREHENSIVE_GAPS_ADDRESSED.md
│   ├── constitutional_intelligence.ts
│   ├── CRITICAL_GAPS_FIXED.md
│   ├── database_architecture.md
│   ├── enum.ts
│   ├── FINAL_ARCHITECTURE_SUMMARY.md
│   ├── foundation.ts
│   ├── graph_database_strategy.md
│   ├── impact_measurement.ts
│   ├── index.ts
│   ├── integrity_operations.ts
│   ├── migration_guide.md
│   ├── parliamentary_process.ts
│   ├── platform_operations.ts
│   ├── schema_redesign.md
│   ├── SCHEMA_TRANSFORMATION_COMPLETE.md
│   ├── SCHEMA_VERIFICATION_COMPLETE.md
│   ├── transparency_analysis.ts
│   ├── universal_access.ts
│   ├── validate-schemas.ts
├── tsconfig.json
├── utils/
│   ├── anonymity-helper.ts
├── vitest.config.ts
src/
startup-validation.js
tailwind.config.js
test-auth-compile.ts
test-connection.html
test-race-prevention.ts
test-results/
├── results.json
├── results.xml
tests/
├── api/
│   ├── auth.spec.ts
│   ├── database-performance.spec.ts
│   ├── external-api-integration.spec.ts
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── database-performance-ui.spec.ts
│   ├── responsive-test.spec.ts
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
tsconfig.json
tsconfig.server.json
validation-report.js
vitest.backend.config.ts
vitest.config.ts
vitest.frontend.config.ts
vitest.integration.config.ts
vitest.setup.ts
```

**Excluded directories:** `.git`, `node_modules`, `dist`, `build`, `coverage`, `tmp`, `temp`, `__pycache__`, `vendor`, and all hidden files/directories

Generated on: 2025-11-06 10:08:34
