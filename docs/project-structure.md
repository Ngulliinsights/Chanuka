# Project Structure

Maximum depth: 7 levels

```
.
clear-sw.html
client/
├── BUILD_FIX_SUMMARY.md
├── BUILD_SUCCESS_SUMMARY.md
├── CLEANUP_SUMMARY.md
├── CONFIG_CONSISTENCY_FIXES.md
├── console errors.js
├── CRITICAL_GAPS_SUMMARY.md
├── EMERGENCY_BUILD_FIX.md
├── FEATURES_DIRECTORY_FIXES_COMPLETE.md
├── fix-build-issues.js
├── IMPORT_FIXES_SUMMARY.md
├── index.html
├── INVESTOR_PRESENTATION_GUIDE.md
├── INVESTOR_PRESENTATION_READY.md
├── INVESTOR_READINESS_FIXES.md
├── jest.a11y.config.js
├── migration-helper.js
├── package.json
├── package-scripts.json
├── playwright.config.ts
├── playwright.visual.config.ts
├── postcss.config.js
├── postcss.config.minimal.js
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
├── reports/
│   ├── design-system-audit-report.json
│   ├── design-system-audit-report.md
│   ├── radix-analysis/
│   │   ├── radix-bundle-analysis.json
│   │   ├── radix-bundle-analysis.md
├── run-triage.js
├── scripts/
│   ├── advanced-bundle-analyzer.js
│   ├── check-performance-budget.js
│   ├── clear-sw.js
│   ├── consolidate-client.js
│   ├── contrast-check.js
│   ├── deployment-integration.ts
│   ├── design-system-audit.js
│   ├── optimize-assets.js
│   ├── performance-budget-check.js
│   ├── radix-bundle-analyzer.js
│   ├── unregister-sw.js
├── src/
│   ├── __tests__/
│   │   ├── accessibility/
│   │   │   ├── accessibility-ci.test.ts
│   │   │   ├── accessibility-regression.test.ts
│   │   │   ├── accessibility-test-utils.test.ts
│   │   │   ├── accessibility-workflow.test.ts
│   │   │   ├── axe-core-audit.test.ts
│   │   │   ├── comprehensive-a11y.test.ts
│   │   │   ├── comprehensive-accessibility.test.tsx
│   │   │   ├── comprehensive-accessibility-audit.test.tsx
│   │   │   ├── core-accessibility-audit.test.tsx
│   │   │   ├── keyboard-navigation.test.ts
│   │   │   ├── keyboard-navigation.test.tsx
│   │   │   ├── lighthouse-audit.test.ts
│   │   │   ├── package-scripts.test.ts
│   │   │   ├── screen-reader-compatibility.test.tsx
│   │   │   ├── screen-reader-support.test.ts
│   │   │   ├── visual-accessibility.test.ts
│   │   ├── api-flow.e2e.test.ts
│   │   ├── auth/
│   │   │   ├── authentication-backend-integration.test.tsx
│   │   │   ├── authentication-integration.test.tsx
│   │   │   ├── auth-integration.test.tsx
│   │   │   ├── auth-repository.test.ts
│   │   │   ├── auth-service.test.ts
│   │   │   ├── backward-compatibility.test.tsx
│   │   │   ├── dependency-injection.test.ts
│   │   │   ├── error-handling-edge-cases.test.ts
│   │   │   ├── hook-compatibility.test.ts
│   │   │   ├── security-features.test.ts
│   │   │   ├── service-integration.test.ts
│   │   │   ├── type-safety.test.ts
│   │   ├── browser-compatibility.test.ts
│   │   ├── community-data-integration.test.tsx
│   │   ├── e2e/
│   │   │   ├── bills-dashboard.e2e.test.ts
│   │   │   ├── critical-user-journeys.e2e.test.ts
│   │   │   ├── critical-user-journeys.test.ts
│   │   │   ├── global-setup.ts
│   │   │   ├── global-teardown.ts
│   │   │   ├── playwright-setup.ts
│   │   │   ├── user-workflows.test.tsx
│   │   ├── infinite-loop-fixes.test.tsx
│   │   ├── integration/
│   │   │   ├── api-communication.test.tsx
│   │   │   ├── asset-loading-integration.test.tsx
│   │   │   ├── bill-discovery-workflow.integration.test.tsx
│   │   │   ├── bills-workflow.integration.test.tsx
│   │   │   ├── end-to-end-flows.test.tsx
│   │   │   ├── frontend-serving-core.test.tsx
│   │   │   ├── react-initialization.test.tsx
│   │   ├── mocks/
│   │   │   ├── services.ts
│   │   ├── NavigationCore.test.tsx
│   │   ├── navigation-coverage-report.test.ts
│   │   ├── NavigationFlow.integration.test.tsx
│   │   ├── navigation-integration.test.tsx
│   │   ├── navigation-integration-summary.test.tsx
│   │   ├── navigation-performance-benchmarks.test.ts
│   │   ├── navigation-performance-regression.test.ts
│   │   ├── navigation-responsive-testing.test.ts
│   │   ├── NavigationStatePersistence.test.tsx
│   │   ├── navigation-test-contexts.test.ts
│   │   ├── NavigationTestSuite.test.tsx
│   │   ├── navigation-test-utils.test.ts
│   │   ├── navigation-visual-regression.test.tsx
│   │   ├── performance/
│   │   │   ├── core-web-vitals.performance.test.ts
│   │   │   ├── core-web-vitals.test.ts
│   │   │   ├── lazy-loading.test.tsx
│   │   │   ├── page-load-performance.test.tsx
│   │   │   ├── performance-optimization.test.ts
│   │   │   ├── service-worker.test.ts
│   │   ├── README.md
│   │   ├── scripts/
│   │   │   ├── run-comprehensive-tests.ts
│   │   ├── setup.ts
│   │   ├── unit/
│   │   │   ├── components/
│   │   │   │   ├── BillCard.comprehensive.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.test.tsx
│   │   │   ├── services/
│   │   │   │   ├── api.test.ts
│   │   ├── utils/
│   │   │   ├── asset-loading.test.ts
│   │   │   ├── browser-compatibility.test.ts
│   │   │   ├── polyfills.test.ts
│   │   │   ├── test-logger.ts
│   │   ├── visual/
│   │   │   ├── bills-dashboard.visual.test.ts
│   │   │   ├── feature-sliced-migration.visual.test.ts
│   │   │   ├── ui-consistency.visual.test.tsx
│   │   │   ├── visual-regression.test.tsx
│   │   ├── visual-regression/
│   │   │   ├── unified-components.test.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── __tests__/
│   │   │   ├── AppProviders.test.tsx
│   │   │   ├── OfflineIndicator.test.tsx
│   │   │   ├── system-health.test.tsx
│   │   ├── accessibility/
│   │   │   ├── accessibility-manager.tsx
│   │   ├── admin/
│   │   │   ├── admin-dashboard.tsx
│   │   ├── analysis/
│   │   │   ├── comments.tsx
│   │   │   ├── section.tsx
│   │   │   ├── stats.tsx
│   │   │   ├── timeline.tsx
│   │   ├── analytics/
│   │   │   ├── __tests__/
│   │   │   │   ├── real-time-engagement-dashboard.test.tsx
│   │   │   ├── CivicScoreCard.tsx
│   │   │   ├── ContributionRankings.tsx
│   │   │   ├── EngagementAnalyticsDashboard.tsx
│   │   │   ├── engagement-dashboard.tsx
│   │   │   ├── EngagementMetricsChart.tsx
│   │   │   ├── index.ts
│   │   │   ├── JourneyAnalyticsDashboard.tsx
│   │   │   ├── real-time-engagement-dashboard.tsx
│   │   │   ├── real-time-engagement-demo.tsx
│   │   │   ├── SentimentTracker.tsx
│   │   │   ├── TemporalAnalytics.tsx
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
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── AuthRoutes.tsx
│   │   │   ├── config/
│   │   │   │   ├── index.ts
│   │   │   ├── ConsentModal.tsx
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAuthForm.ts
│   │   │   │   ├── useLoginForm.ts
│   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   ├── usePrivacySettings.ts
│   │   │   │   ├── useRegisterForm.ts
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── OAuthCallback.tsx
│   │   │   ├── OAuthLogin.tsx
│   │   │   ├── PasswordStrengthIndicator.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── SecurityDashboard.tsx
│   │   │   ├── SessionManager.tsx
│   │   │   ├── SocialLogin.tsx
│   │   │   ├── TwoFactorSetup.tsx
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── AuthAlert.tsx
│   │   │   │   ├── AuthButton.tsx
│   │   │   │   ├── AuthInput.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── PasswordStrengthIndicator.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   ├── utils/
│   │   │   │   ├── auth-validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── test-utils.ts
│   │   │   │   ├── user-utils.ts
│   │   │   ├── validation.ts
│   │   ├── bill-detail/
│   │   │   ├── BillAnalysisTab.tsx
│   │   │   ├── BillCommunityTab.tsx
│   │   │   ├── BillFullTextTab.tsx
│   │   │   ├── BillHeader.tsx
│   │   │   ├── BillOverviewTab.tsx
│   │   │   ├── BillRelatedTab.tsx
│   │   │   ├── BillSponsorsTab.tsx
│   │   │   ├── CivicActionGuidance.tsx
│   │   │   ├── ConstitutionalAnalysisPanel.tsx
│   │   │   ├── ConstitutionalFlagCard.tsx
│   │   │   ├── ExpertAnalysisCard.tsx
│   │   │   ├── QuickActionsBar.tsx
│   │   │   ├── TabSkeleton.tsx
│   │   ├── bills/
│   │   │   ├── __tests__/
│   │   │   │   ├── BillCard.test.tsx
│   │   │   │   ├── bills-dashboard.test.tsx
│   │   │   │   ├── filter-panel.test.tsx
│   │   ├── bill-tracking/
│   │   │   ├── real-time-tracker.tsx
│   │   ├── checkpoint-dashboard.tsx
│   │   ├── community/
│   │   │   ├── __tests__/
│   │   │   │   ├── CommunityHub.test.tsx
│   │   │   ├── ActionCenter.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── CommunityDataIntegration.tsx
│   │   │   ├── CommunityErrorBoundary.tsx
│   │   │   ├── CommunityFilters.tsx
│   │   │   ├── CommunityHub.tsx
│   │   │   ├── CommunityStats.tsx
│   │   │   ├── ExpertInsights.tsx
│   │   │   ├── index.ts
│   │   │   ├── LocalImpactPanel.tsx
│   │   │   ├── README.md
│   │   │   ├── TrendingTopics.tsx
│   │   ├── compatibility/
│   │   │   ├── BrowserCompatibilityChecker.tsx
│   │   │   ├── BrowserCompatibilityReport.tsx
│   │   │   ├── BrowserCompatibilityTester.tsx
│   │   │   ├── FeatureFallbacks.tsx
│   │   ├── conflict-of-interest/
│   │   │   ├── __tests__/
│   │   │   │   ├── ConflictOfInterestAnalysis.test.tsx
│   │   │   ├── ConflictNetworkVisualization.tsx
│   │   │   ├── ConflictOfInterestAnalysis.tsx
│   │   │   ├── FinancialExposureTracker.tsx
│   │   │   ├── HistoricalPatternAnalysis.tsx
│   │   │   ├── ImplementationWorkaroundsTracker.tsx
│   │   │   ├── index.ts
│   │   │   ├── TransparencyScoring.tsx
│   │   ├── connection-status.tsx
│   │   ├── dashboard/
│   │   │   ├── __tests__/
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── hooks.test.ts
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── recovery.test.ts
│   │   │   │   ├── types.test.ts
│   │   │   │   ├── UserDashboard.test.tsx
│   │   │   │   ├── utils.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── action-items.tsx
│   │   │   ├── activity-summary.tsx
│   │   │   ├── components/
│   │   │   │   ├── DashboardStats.tsx
│   │   │   │   ├── TimeFilterSelector.tsx
│   │   │   │   ├── WelcomeMessage.tsx
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useDashboard.ts
│   │   │   │   ├── useDashboardActions.ts
│   │   │   │   ├── useDashboardConfig.ts
│   │   │   │   ├── useDashboardTopics.ts
│   │   │   ├── index.ts
│   │   │   ├── modals/
│   │   │   │   ├── DashboardPreferencesModal.tsx
│   │   │   │   ├── DataExportModal.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── sections/
│   │   │   │   ├── CivicMetricsSection.tsx
│   │   │   │   ├── EngagementHistorySection.tsx
│   │   │   │   ├── RecommendationsSection.tsx
│   │   │   │   ├── TrackedBillsSection.tsx
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
│   │   ├── discussion/
│   │   │   ├── CommentForm.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   ├── CommunityReporting.tsx
│   │   │   ├── DiscussionDemo.tsx
│   │   │   ├── DiscussionIntegration.tsx
│   │   │   ├── DiscussionThread.tsx
│   │   │   ├── index.ts
│   │   ├── education/
│   │   │   ├── __tests__/
│   │   │   │   ├── EducationalFramework.test.tsx
│   │   │   ├── ConstitutionalContext.tsx
│   │   │   ├── EducationalFramework.tsx
│   │   │   ├── EducationalTooltip.tsx
│   │   │   ├── HistoricalPrecedents.tsx
│   │   │   ├── index.ts
│   │   │   ├── PlainLanguageSummary.tsx
│   │   │   ├── ProcessEducation.tsx
│   │   │   ├── README.md
│   │   ├── environment-setup.tsx
│   │   ├── error-boundaries/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorBoundaryProvider.tsx
│   │   │   ├── examples/
│   │   │   │   ├── ErrorBoundaryExample.tsx
│   │   │   ├── index.ts
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
│   │   │   ├── UnifiedErrorBoundary.tsx
│   │   │   ├── utils/
│   │   │   │   ├── contextual-messages.ts
│   │   │   │   ├── error-icons.tsx
│   │   │   │   ├── error-normalizer.ts
│   │   │   │   ├── error-reporter.ts
│   │   │   │   ├── shared-error-display.tsx
│   │   ├── feature-flags-panel.tsx
│   │   ├── icons/
│   │   │   ├── SimpleIcons.tsx
│   │   ├── implementation/
│   │   │   ├── workarounds.tsx
│   │   ├── index.ts
│   │   ├── layout/
│   │   │   ├── __tests__/
│   │   │   │   ├── accessibility.test.tsx
│   │   │   │   ├── app-layout.test.tsx
│   │   │   │   ├── app-layout-comprehensive.test.tsx
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── layout-components.test.tsx
│   │   │   │   ├── layout-integration.test.tsx
│   │   │   │   ├── mobile-header.test.tsx
│   │   │   │   ├── mobile-navigation.test.tsx
│   │   │   │   ├── mobile-navigation-fixes.test.tsx
│   │   │   │   ├── responsive.test.tsx
│   │   │   │   ├── sidebar.test.tsx
│   │   │   │   ├── types.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   ├── app-layout.tsx
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   ├── MOBILE_NAVIGATION_FIXES.md
│   │   │   ├── mobile-header.tsx
│   │   │   ├── mobile-navigation.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── SimpleAppLayout.tsx
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
│   │   │   ├── __tests__/
│   │   │   │   ├── MobileComponents.test.tsx
│   │   │   │   ├── mobile-optimized-forms.test.tsx
│   │   │   ├── index.ts
│   │   │   ├── InfiniteScroll.tsx
│   │   │   ├── MobileBottomSheet.tsx
│   │   │   ├── MobileDataVisualization.tsx
│   │   │   ├── MobileLayout.tsx
│   │   │   ├── MobileNavigationDrawer.tsx
│   │   │   ├── mobile-navigation-enhancements.tsx
│   │   │   ├── mobile-optimized-forms.tsx
│   │   │   ├── mobile-performance-optimizations.tsx
│   │   │   ├── MobileTabSelector.tsx
│   │   │   ├── mobile-test-suite.tsx
│   │   │   ├── PullToRefresh.tsx
│   │   │   ├── responsive-layout-manager.tsx
│   │   │   ├── SwipeGestures.tsx
│   │   ├── monitoring/
│   │   │   ├── monitoring-dashboard.tsx
│   │   ├── navigation/
│   │   │   ├── __tests__/
│   │   │   │   ├── navigation-utils.test.ts
│   │   │   │   ├── route-access.test.ts
│   │   │   │   ├── useRelatedPages.test.ts
│   │   │   │   ├── useRouteAccess.test.ts
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
│   │   │   ├── ProgressiveDisclosureDemo.tsx
│   │   │   ├── ProgressiveDisclosureNavigation.tsx
│   │   │   ├── ProgressiveDisclosureSimple.tsx
│   │   │   ├── quick-access-nav.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── DesktopSidebar.test.tsx
│   │   │   │   │   ├── desktop-sidebar-validation.js
│   │   │   │   ├── DESKTOP_SIDEBAR_FIXES.md
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
│   │   │   ├── index.ts
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   ├── notification-preferences.tsx
│   │   │   ├── NotificationPreferences.tsx
│   │   ├── offline/
│   │   │   ├── offline-manager.tsx
│   │   │   ├── OfflineModal.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── OfflineModal.tsx
│   │   ├── performance/
│   │   │   ├── __tests__/
│   │   │   │   ├── PerformanceDashboard.test.tsx
│   │   │   ├── PerformanceDashboard.tsx
│   │   │   ├── PerformanceMetricsCollector.tsx
│   │   │   ├── PerformanceOptimizationDashboard.tsx
│   │   ├── privacy/
│   │   │   ├── __tests__/
│   │   │   │   ├── privacy-components.test.tsx
│   │   │   │   ├── simple-privacy-test.test.tsx
│   │   │   ├── CookieConsentBanner.tsx
│   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   ├── GDPRComplianceManager.tsx
│   │   │   ├── index.ts
│   │   │   ├── privacy-dashboard.tsx
│   │   │   ├── privacy-policy.tsx
│   │   │   ├── README.md
│   │   ├── project-overview.tsx
│   │   ├── realtime/
│   │   │   ├── index.ts
│   │   │   ├── RealTimeDashboard.tsx
│   │   │   ├── RealTimeNotifications.tsx
│   │   ├── search/
│   │   │   ├── advanced-search.tsx
│   │   ├── security/
│   │   │   ├── SecureForm.tsx
│   │   │   ├── SecurityDashboard.tsx
│   │   │   ├── SecuritySettings.tsx
│   │   ├── settings/
│   │   │   ├── alert-preferences.tsx
│   │   ├── shared/
│   │   │   ├── auth/
│   │   │   │   ├── forms/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   ├── SecurityLoginForm.tsx
│   │   │   │   │   ├── StandardLoginForm.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useLoginForm.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── AuthAlert.tsx
│   │   │   │   │   ├── AuthButton.tsx
│   │   │   │   │   ├── AuthInput.tsx
│   │   │   │   │   ├── index.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── index.ts
│   │   │   │   ├── sections/
│   │   │   │   │   ├── ActivitySection.tsx
│   │   │   │   │   ├── BillsSection.tsx
│   │   │   │   │   ├── MigrationDashboard.test.tsx
│   │   │   │   │   ├── MigrationDashboard.tsx
│   │   │   │   │   ├── StatsSection.tsx
│   │   │   │   ├── useDashboardData.ts
│   │   │   │   ├── useMigrationDashboardData.ts
│   │   │   │   ├── UserDashboard.tsx
│   │   │   │   ├── variants/
│   │   │   │   │   ├── FullPageDashboard.tsx
│   │   │   │   │   ├── SectionDashboard.tsx
│   │   │   ├── index.ts
│   │   │   ├── privacy/
│   │   │   │   ├── CompactInterface.tsx
│   │   │   │   ├── controls/
│   │   │   │   │   ├── ConsentControls.tsx
│   │   │   │   │   ├── DataUsageControls.tsx
│   │   │   │   │   ├── VisibilityControls.tsx
│   │   │   │   ├── FullInterface.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── ModalInterface.tsx
│   │   │   │   ├── modes/
│   │   │   │   ├── PrivacyManager.tsx
│   │   │   ├── types.ts
│   │   │   ├── utils/
│   │   │   │   ├── component-helpers.ts
│   │   │   │   ├── index.ts
│   │   ├── shell/
│   │   │   ├── AppRouter.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── index.ts
│   │   │   ├── NavigationBar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SkipLinks.tsx
│   │   ├── sidebar.tsx
│   │   ├── system/
│   │   │   ├── HealthCheck.tsx
│   │   ├── system-health.tsx
│   │   ├── transparency/
│   │   │   ├── ConflictAnalysisDashboard.tsx
│   │   │   ├── ConflictNetworkVisualization.tsx
│   │   ├── ui/
│   │   │   ├── __tests__/
│   │   │   │   ├── button.test.tsx
│   │   │   │   ├── card.test.tsx
│   │   │   │   ├── dialog.test.tsx
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── form.test.tsx
│   │   │   │   ├── form-accessibility.test.tsx
│   │   │   │   ├── form-field.test.tsx
│   │   │   │   ├── form-layout.test.tsx
│   │   │   │   ├── integration.test.tsx
│   │   │   │   ├── recovery.test.ts
│   │   │   │   ├── test-utils.test.tsx
│   │   │   │   ├── test-utils.tsx
│   │   │   │   ├── unified-components.test.tsx
│   │   │   │   ├── validation.test.ts
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── components.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── error-message.tsx
│   │   │   ├── errors.ts
│   │   │   ├── form.tsx
│   │   │   ├── form-accessibility.tsx
│   │   │   ├── form-demo.tsx
│   │   │   ├── form-field.tsx
│   │   │   ├── form-layout.tsx
│   │   │   ├── hybrid-components.tsx
│   │   │   ├── implementation-summary.tsx
│   │   │   ├── index.ts
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── logo.tsx
│   │   │   ├── migration-examples.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── OptimizedImage.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── recovery.ts
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── simple-button.tsx
│   │   │   ├── skeleton.tsx
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
│   │   │   ├── unified-button.tsx
│   │   │   ├── unified-components.tsx
│   │   │   ├── unified-examples.tsx
│   │   │   ├── validation.ts
│   │   ├── user/
│   │   │   ├── __tests__/
│   │   │   │   ├── AccessibilitySettingsSection.test.tsx
│   │   │   │   ├── PrivacySettingsSection.test.tsx
│   │   │   │   ├── UserAccountIntegration.test.tsx
│   │   │   │   ├── UserProfileSection.test.tsx
│   │   │   ├── AccessibilitySettingsSection.tsx
│   │   │   ├── UserAccountIntegration.tsx
│   │   │   ├── UserProfileSection.tsx
│   │   ├── verification/
│   │   │   ├── __tests__/
│   │   │   │   ├── ExpertBadge.test.tsx
│   │   │   ├── CommunityValidation.tsx
│   │   │   ├── CredibilityScoring.tsx
│   │   │   ├── ExpertBadge.tsx
│   │   │   ├── ExpertConsensus.tsx
│   │   │   ├── ExpertProfileCard.tsx
│   │   │   ├── ExpertVerificationDemo.tsx
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── verification-list.tsx
│   │   │   ├── VerificationWorkflow.tsx
│   ├── config/
│   │   ├── api.ts
│   │   ├── development.ts
│   │   ├── feature-flags.ts
│   │   ├── onboarding.ts
│   ├── constants/
│   │   ├── index.ts
│   ├── context/
│   │   ├── index.ts
│   ├── contexts/
│   │   ├── __tests__/
│   │   │   ├── NavigationContext.test.tsx
│   │   │   ├── navigation-persistence.test.tsx
│   │   ├── NavigationContext.tsx
│   │   ├── ThemeContext.tsx
│   ├── core/
│   │   ├── api/
│   │   ├── api.backup/
│   │   │   ├── __tests__/
│   │   │   │   ├── client.integration.test.ts
│   │   │   │   ├── websocket-backward-compatibility.test.ts
│   │   │   │   ├── websocket-error-handling.test.ts
│   │   │   │   ├── websocket-integration.test.ts
│   │   │   │   ├── websocket-lifecycle.test.ts
│   │   │   │   ├── websocket-manager.test.ts
│   │   │   │   ├── websocket-message-routing.test.ts
│   │   │   │   ├── websocket-performance.test.ts
│   │   │   ├── cache.ts
│   │   │   ├── client.ts
│   │   │   ├── config.ts
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   ├── websocket.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── circuit-breaker-integration.test.ts
│   │   │   │   ├── client.integration.test.ts
│   │   │   │   ├── websocket-backward-compatibility.test.ts
│   │   │   │   ├── websocket-error-handling.test.ts
│   │   │   │   ├── websocket-integration.test.ts
│   │   │   │   ├── websocket-lifecycle.test.ts
│   │   │   │   ├── websocket-manager.test.ts
│   │   │   │   ├── websocket-message-routing.test.ts
│   │   │   │   ├── websocket-performance.test.ts
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── bills.ts
│   │   │   ├── cache.ts
│   │   │   ├── circuit-breaker-client.ts
│   │   │   ├── circuit-breaker-monitor.ts
│   │   │   ├── client.ts
│   │   │   ├── community.ts
│   │   │   ├── config.ts
│   │   │   ├── errors.ts
│   │   │   ├── examples/
│   │   │   │   ├── circuit-breaker-usage.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useApiConnection.ts
│   │   │   │   ├── use-api-with-fallback.ts
│   │   │   │   ├── use-safe-mutation.ts
│   │   │   │   ├── use-safe-query.ts
│   │   │   ├── index.ts
│   │   │   ├── interceptors.ts
│   │   │   ├── notifications.ts
│   │   │   ├── performance.ts
│   │   │   ├── privacy.ts
│   │   │   ├── registry.ts
│   │   │   ├── retry-handler.ts
│   │   │   ├── search.ts
│   │   │   ├── system.ts
│   │   │   ├── types.ts
│   │   │   ├── user.ts
│   │   │   ├── websocket.ts
│   │   ├── dashboard/
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   ├── widgets.ts
│   │   ├── error/
│   │   │   ├── __tests__/
│   │   │   │   ├── ErrorBoundary.test.tsx
│   │   │   │   ├── handler.test.ts
│   │   │   ├── constants.ts
│   │   │   ├── handler.ts
│   │   │   ├── index.ts
│   │   │   ├── recovery.ts
│   │   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── loading/
│   │   │   ├── __tests__/
│   │   │   │   ├── hooks.test.ts
│   │   │   │   ├── types.test.ts
│   │   │   ├── components/
│   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LoadingProgress.tsx
│   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── context.tsx
│   │   │   ├── examples/
│   │   │   │   ├── README.md
│   │   │   ├── hooks/
│   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── useTimeoutAwareLoading.ts
│   │   │   ├── index.ts
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   ├── README.md
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils/
│   │   │   ├── utils.ts
│   │   │   │   ├── connection-utils.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── loading-utils.ts
│   │   │   │   ├── progress-utils.ts
│   │   │   │   ├── timeout-utils.ts
│   │   │   ├── validation.ts
│   │   ├── navigation/
│   │   │   ├── context.tsx
│   │   │   ├── hooks/
│   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-navigation-accessibility.ts
│   │   │   │   ├── use-navigation-performance.ts
│   │   │   │   ├── use-navigation-preferences.tsx
│   │   │   │   ├── use-unified-navigation.ts
│   │   │   ├── index.ts
│   │   │   ├── persistence.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   ├── data/
│   │   ├── mock/
│   │   │   ├── analytics.ts
│   │   │   ├── bills.ts
│   │   │   ├── community.ts
│   │   │   ├── discussions.ts
│   │   │   ├── experts.ts
│   │   │   ├── generators.ts
│   │   │   ├── index.ts
│   │   │   ├── loaders.ts
│   │   │   ├── realtime.ts
│   │   │   ├── users.ts
│   ├── demo/
│   │   ├── community-integration-demo.ts
│   ├── DevWrapper.tsx
│   ├── docs/
│   │   ├── accessibility-guide.md
│   │   ├── community-data-integration-summary.md
│   ├── emergency-styles.css
│   ├── errors/
│   │   ├── index.ts
│   ├── examples/
│   │   ├── render-tracking-usage.tsx
│   │   ├── WebSocketIntegrationExample.tsx
│   ├── features/
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   ├── useErrorAnalytics.ts
│   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   ├── use-render-tracker.ts
│   │   │   │   ├── use-web-vitals.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── analytics.ts
│   │   │   ├── types.ts
│   │   ├── bills/
│   │   │   ├── __tests__/
│   │   │   │   ├── BillCard.test.tsx
│   │   │   │   ├── useBills.test.ts
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   ├── index.ts
│   │   │   ├── model/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useBills.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── types.ts
│   │   │   ├── services/
│   │   │   ├── ui/
│   │   │   │   ├── bill-card.tsx
│   │   │   │   ├── BillCard.tsx
│   │   │   │   ├── bill-list.tsx
│   │   │   │   ├── BillList.tsx
│   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   ├── bill-tracking.tsx
│   │   │   │   ├── filter-panel.tsx
│   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── MobileBillDetail.tsx
│   │   │   │   ├── MobileBillsDashboard.tsx
│   │   │   │   ├── stats-overview.tsx
│   │   │   │   ├── virtual-bill-grid.tsx
│   │   ├── community/
│   │   │   ├── __tests__/
│   │   │   │   ├── useCommunity.test.ts
│   │   │   ├── components/
│   │   │   │   ├── CommentThread.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useCommunity.ts
│   │   │   │   ├── useDiscussion.ts
│   │   │   ├── index.ts
│   │   ├── pretext-detection/
│   │   │   ├── components/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── PretextDetectionPanel.test.tsx
│   │   │   │   ├── CivicActionToolbox.tsx
│   │   │   │   ├── PretextDetectionPanel.tsx
│   │   │   │   ├── PretextWatchCard.tsx
│   │   │   ├── demo.md
│   │   │   ├── hooks/
│   │   │   │   ├── usePretextAnalysis.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── services/
│   │   │   │   ├── PretextAnalysisService.ts
│   │   │   ├── types.ts
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── AdvancedSearchInterface.tsx
│   │   │   │   ├── IntelligentAutocomplete.tsx
│   │   │   │   ├── SavedSearches.tsx
│   │   │   │   ├── SearchAnalyticsDashboard.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchFilters.tsx
│   │   │   │   ├── SearchProgressIndicator.tsx
│   │   │   │   ├── SearchResultCard.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   ├── SearchTips.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useStreamingSearch.ts
│   │   │   ├── index.ts
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   ├── services/
│   │   │   │   ├── intelligent-search.ts
│   │   │   │   ├── search-api.ts
│   │   │   │   ├── streaming-search.ts
│   │   │   ├── types.ts
│   │   ├── users/
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAuth.tsx
│   │   │   │   ├── useUserAPI.ts
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
│   │   │   ├── use-offline-detection.test.ts
│   │   │   ├── use-render-tracker.test.tsx
│   │   │   ├── use-system.test.ts
│   │   │   ├── use-toast.test.ts
│   │   │   ├── use-unified-navigation.test.tsx
│   │   │   ├── useWebSocket.test.ts
│   │   │   ├── useWebSocket-integration.test.tsx
│   │   ├── index.ts
│   │   ├── useCleanup.tsx
│   │   ├── useCommunityIntegration.ts
│   │   ├── useConnectionAware.tsx
│   │   ├── useDebounce.ts
│   │   ├── useErrorRecovery.ts
│   │   ├── use-i18n.tsx
│   │   ├── use-keyboard-focus.ts
│   │   ├── useMediaQuery.ts
│   │   ├── use-mobile.tsx
│   │   ├── useMockData.ts
│   │   ├── useNotifications.ts
│   │   ├── useOfflineCapabilities.ts
│   │   ├── useOfflineDetection.tsx
│   │   ├── use-onboarding.tsx
│   │   ├── use-online-status.tsx
│   │   ├── usePasswordUtils.ts
│   │   ├── usePretextAnalysis.ts
│   │   ├── useProgressiveDisclosure.ts
│   │   ├── useRealTimeEngagement.ts
│   │   ├── useSafeEffect.ts
│   │   ├── use-safe-query.ts
│   │   ├── useSecurity.ts
│   │   ├── useService.ts
│   │   ├── useServiceStatus.ts
│   │   ├── use-system.tsx
│   │   ├── use-toast.ts
│   │   ├── use-websocket.ts
│   ├── index.css
│   ├── index-minimal.css
│   ├── lib/
│   │   ├── protected-route.tsx
│   │   ├── queryClient.ts
│   │   ├── utils.ts
│   ├── lucide.d.ts
│   ├── main.tsx
│   ├── main-restored.tsx
│   ├── main-simple.tsx
│   ├── monitoring/
│   │   ├── error-monitoring.ts
│   │   ├── index.ts
│   │   ├── performance-monitoring.ts
│   │   ├── sentry-config.ts
│   ├── pages/
│   │   ├── __tests__/
│   │   │   ├── auth-page.test.tsx
│   │   │   ├── bill-analysis.test.tsx
│   │   │   ├── bill-detail.test.tsx
│   │   │   ├── HomePage.test.tsx
│   │   │   ├── UserAccountPage.test.tsx
│   │   ├── admin/
│   │   ├── admin.tsx
│   │   ├── auth/
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PrivacyPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── SecurityPage.tsx
│   │   ├── auth-page.tsx
│   │   ├── bill-analysis.tsx
│   │   ├── bill-detail.tsx
│   │   ├── bills-dashboard-page.tsx
│   │   ├── bill-sponsorship-analysis.tsx
│   │   ├── comments.tsx
│   │   ├── community-input.tsx
│   │   ├── dashboard.tsx
│   │   ├── database-manager.tsx
│   │   ├── design-system-test.tsx
│   │   ├── expert-verification.tsx
│   │   ├── home.tsx
│   │   ├── IntelligentSearchPage.tsx
│   │   ├── legal/
│   │   │   ├── acceptable-use.tsx
│   │   │   ├── accessibility.tsx
│   │   │   ├── compliance-ccpa.tsx
│   │   │   ├── contact-legal.tsx
│   │   │   ├── cookie-policy.tsx
│   │   │   ├── data-retention.tsx
│   │   │   ├── dmca.tsx
│   │   │   ├── privacy.tsx
│   │   │   ├── security.tsx
│   │   │   ├── terms.tsx
│   │   ├── not-found.tsx
│   │   ├── onboarding.tsx
│   │   ├── search.tsx
│   │   ├── SecurityDemoPage.tsx
│   │   ├── sponsorship/
│   │   │   ├── co-sponsors.tsx
│   │   │   ├── financial-network.tsx
│   │   │   ├── methodology.tsx
│   │   │   ├── overview.tsx
│   │   │   ├── primary-sponsor.tsx
│   │   ├── UserAccountPage.tsx
│   │   ├── UserProfilePage.tsx
│   ├── recovery/
│   │   ├── index.ts
│   ├── scripts/
│   │   ├── analyze-bundle.ts
│   │   ├── migrate-components.ts
│   │   ├── performance-audit.ts
│   │   ├── README.md
│   │   ├── run-emergency-triage.ts
│   │   ├── validate-migration.ts
│   ├── security/
│   │   ├── __tests__/
│   │   │   ├── security-basic.test.ts
│   │   │   ├── security-service.test.ts
│   │   │   ├── security-system.test.ts
│   │   ├── config/
│   │   │   ├── security-config.ts
│   │   ├── csp/
│   │   │   ├── CSPManager.ts
│   │   ├── csp-manager.ts
│   │   ├── csp-nonce.ts
│   │   ├── csrf/
│   │   │   ├── CSRFProtection.ts
│   │   ├── csrf-protection.ts
│   │   ├── headers/
│   │   │   ├── SecurityHeaders.ts
│   │   ├── index.ts
│   │   ├── input-sanitizer.ts
│   │   ├── rate-limiter.ts
│   │   ├── rate-limiting/
│   │   │   ├── RateLimiter.ts
│   │   ├── sanitization/
│   │   │   ├── InputSanitizer.ts
│   │   ├── security-monitor.ts
│   │   ├── security-service.ts
│   │   ├── types/
│   │   ├── types.ts
│   │   │   ├── security-types.ts
│   │   ├── vulnerability-scanner.ts
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── analysis.test.ts
│   │   │   ├── api-error-handling.integration.test.ts
│   │   │   ├── api-error-handling.test.ts
│   │   │   ├── apiInterceptors.test.ts
│   │   │   ├── billsApiIntegration.test.ts
│   │   │   ├── navigation.test.ts
│   │   │   ├── PageRelationshipService.test.ts
│   │   │   ├── UserJourneyTracker.test.ts
│   │   │   ├── websocket-client.test.ts
│   │   ├── analysis.ts
│   │   ├── api.ts
│   │   ├── apiInterceptors.ts
│   │   ├── AuthService.ts
│   │   ├── auth-service-init.ts
│   │   ├── billsDataCache.ts
│   │   ├── billsPaginationService.ts
│   │   ├── billsWebSocketService.ts
│   │   ├── billTrackingService.ts
│   │   ├── community-backend-service.ts
│   │   ├── community-websocket-extension.ts
│   │   ├── CommunityWebSocketManager.ts
│   │   ├── dataRetentionService.ts
│   │   ├── errorAnalyticsBridge.ts
│   │   ├── error-monitoring.tsx
│   │   ├── index.ts
│   │   ├── mockDataService.ts
│   │   ├── mockUserData.ts
│   │   ├── navigation.ts
│   │   ├── notification-service.ts
│   │   ├── notification-system-integration-summary.md
│   │   ├── PageRelationshipService.ts
│   │   ├── performance-monitoring.ts
│   │   ├── privacyAnalyticsService.ts
│   │   ├── stateManagementService.ts
│   │   ├── UserJourneyTracker.ts
│   │   ├── userService.ts
│   │   ├── webSocketService.ts
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
│   │   │   ├── README.md
│   │   │   ├── responsive.css
│   │   │   ├── responsive.ts
│   │   │   ├── themes/
│   │   │   │   ├── dark.ts
│   │   │   │   ├── high-contrast.ts
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
│   │   │   │   ├── contrast.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── responsive.ts
│   │   │   │   ├── validation.ts
│   │   ├── index.ts
│   │   ├── interfaces/
│   │   │   ├── __tests__/
│   │   │   │   ├── unified-interfaces.test.ts
│   │   │   ├── unified-interfaces.ts
│   │   ├── testing/
│   │   │   ├── __tests__/
│   │   │   │   ├── test-utilities.test.ts
│   │   │   │   ├── test-utilities.test.tsx
│   │   │   ├── index.ts
│   │   │   ├── test-utilities.tsx
│   │   ├── validation/
│   │   │   ├── __tests__/
│   │   │   │   ├── base-validation.test.ts
│   │   │   ├── base-validation.ts
│   │   │   ├── index.ts
│   ├── store/
│   │   ├── __tests__/
│   │   │   ├── auth-load.performance.test.ts
│   │   │   ├── auth-session-edge-cases.test.ts
│   │   │   ├── backward-compatibility.test.ts
│   │   │   ├── redux-migration.test.ts
│   │   │   ├── slices.integration.test.ts
│   │   ├── hooks.ts
│   │   ├── index.ts
│   │   ├── middleware/
│   │   │   ├── __tests__/
│   │   │   │   ├── webSocketMiddleware.test.ts
│   │   │   ├── apiMiddleware.ts
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandlingMiddleware.ts
│   │   │   ├── navigationPersistenceMiddleware.ts
│   │   │   ├── webSocketMiddleware.ts
│   │   ├── slices/
│   │   │   ├── __tests__/
│   │   │   │   ├── authSlice.test.ts
│   │   │   │   ├── sessionSlice.test.ts
│   │   │   ├── authSlice.ts
│   │   │   ├── communitySlice.tsx
│   │   │   ├── discussionSlice.ts
│   │   │   ├── errorAnalyticsSlice.ts
│   │   │   ├── errorHandlingSlice.ts
│   │   │   ├── loadingSlice.ts
│   │   │   ├── navigationSlice.ts
│   │   │   ├── realTimeSlice.ts
│   │   │   ├── sessionSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   ├── userDashboardSlice.ts
│   │   ├── utils/
│   ├── styles/
│   │   ├── accessibility.css
│   │   ├── base/
│   │   │   ├── base.css
│   │   │   ├── variables.css
│   │   ├── chanuka-design-system.css
│   │   ├── components/
│   │   │   ├── buttons.css
│   │   │   ├── forms.css
│   │   │   ├── layout.css
│   │   │   ├── progressive-disclosure.css
│   │   │   ├── ui.css
│   │   ├── design-system.ts
│   │   ├── design-tokens.css
│   │   ├── fallbacks.css
│   │   ├── fix-build-errors.css
│   │   ├── globals.css
│   │   ├── MIGRATION_COMPLETE.md
│   │   ├── MIGRATION_GUIDE.md
│   │   ├── responsive/
│   │   │   ├── desktop.css
│   │   │   ├── mobile.css
│   │   │   ├── special.css
│   │   │   ├── tablet.css
│   │   ├── STYLE_GUIDE.md
│   │   ├── themes/
│   │   │   ├── dark.css
│   │   ├── utilities/
│   │   │   ├── accessibility.css
│   │   │   ├── animations.css
│   ├── TestComponent.tsx
│   ├── test-styles.html
│   ├── test-utils/
│   │   ├── comprehensive-test-config.ts
│   │   ├── comprehensive-test-setup.tsx
│   │   ├── index.tsx
│   │   ├── navigation-test-utils.tsx
│   │   ├── setup.ts
│   │   ├── setup-a11y.ts
│   │   ├── setup-integration.ts
│   │   ├── setup-performance.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── community.ts
│   │   ├── conflict-of-interest.ts
│   │   ├── constitutional.ts
│   │   ├── discussion.ts
│   │   ├── engagement-analytics.ts
│   │   ├── expert.ts
│   │   ├── global.d.ts
│   │   ├── navigation.ts
│   │   ├── onboarding.ts
│   │   ├── realtime.ts
│   │   ├── shims-shared.d.ts
│   │   ├── shims-web-vitals.d.ts
│   │   ├── user-dashboard.ts
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── advanced-error-system.test.ts
│   │   │   ├── browser-compatibility.test.ts
│   │   │   ├── browser-logger.test.ts
│   │   │   ├── client-core.test.ts
│   │   │   ├── emergency-triage.test.ts
│   │   │   ├── env-config.test.ts
│   │   │   ├── i18n.test.ts
│   │   │   ├── performance-monitor.test.ts
│   │   │   ├── render-tracking-integration.test.ts
│   │   │   ├── responsive-layout.test.ts
│   │   │   ├── route-validation.test.ts
│   │   │   ├── safe-lazy-loading.test.tsx
│   │   │   ├── serviceWorker.test.ts
│   │   │   ├── unified-error-handler.test.ts
│   │   ├── advanced-error-recovery.ts
│   │   ├── asset-fallback-config.ts
│   │   ├── asset-loading.ts
│   │   ├── asset-optimization.ts
│   │   ├── authenticated-api.ts
│   │   ├── backgroundSyncManager.ts
│   │   ├── browser-compatibility.ts
│   │   ├── browser-compatibility-manager.ts
│   │   ├── browser-compatibility-tests.ts
│   │   ├── browser-logger.ts
│   │   ├── bundle-analyzer.ts
│   │   ├── cacheInvalidation.ts
│   │   ├── cn.ts
│   │   ├── comprehensive-error-suppressor.ts
│   │   ├── comprehensiveLoading.ts
│   │   ├── connectionAwareLoading.ts
│   │   ├── console-error-log.md
│   │   ├── csp-headers.ts
│   │   ├── demo-data-service.ts
│   │   ├── development-debug.ts
│   │   ├── development-error-recovery.ts
│   │   ├── development-error-suppressor.ts
│   │   ├── development-overrides.ts
│   │   ├── dev-error-suppressor.ts
│   │   ├── dev-mode.ts
│   │   ├── dev-server-check.ts
│   │   ├── dom-sanitizer.ts
│   │   ├── emergency-triage.ts
│   │   ├── env-config.ts
│   │   ├── error-analytics.ts
│   │   ├── error-integration.ts
│   │   ├── error-rate-limiter.ts
│   │   ├── error-reporting.ts
│   │   ├── error-setup.ts
│   │   ├── error-suppression.ts
│   │   ├── error-system-initialization.ts
│   │   ├── EventBus.ts
│   │   ├── extension-error-suppressor.ts
│   │   ├── i18n.ts
│   │   ├── index.ts
│   │   ├── input-validation.ts
│   │   ├── investor-demo-enhancements.ts
│   │   ├── logger.ts
│   │   ├── logger-simple.ts
│   │   ├── meta-tag-manager.ts
│   │   ├── mobile-error-handler.ts
│   │   ├── mobile-touch-handler.ts
│   │   ├── monitoring-init.ts
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
│   │   ├── password-validation.ts
│   │   ├── performance-monitor.ts
│   │   ├── performance-optimizer.ts
│   │   ├── phase3-error-system.ts
│   │   ├── polyfills.ts
│   │   ├── preload-optimizer.ts
│   │   ├── privacy-compliance.ts
│   │   ├── rbac.ts
│   │   ├── realtime-optimizer.ts
│   │   ├── render-tracking-integration.ts
│   │   ├── render-tracking-README.md
│   │   ├── responsive-layout.ts
│   │   ├── route-preloading.ts
│   │   ├── route-validation.ts
│   │   ├── rum-integration.ts
│   │   ├── safe-lazy-loading.tsx
│   │   ├── secure-storage.ts
│   │   ├── security-monitoring.ts
│   │   ├── server-status.ts
│   │   ├── service-recovery.ts
│   │   ├── serviceWorker.ts
│   │   ├── session-management.ts
│   │   ├── session-manager.ts
│   │   ├── simple-lazy-pages.tsx
│   │   ├── style-performance.ts
│   │   ├── super-aggressive-suppressor.ts
│   │   ├── test-imports.ts
│   │   ├── tokenManager.ts
│   │   ├── tracing.ts
│   │   ├── unified-error-handler.ts
│   │   ├── validateArchitecture.ts
│   │   ├── web-vitals-monitor.ts
│   ├── validation/
│   │   ├── index.ts
│   ├── vite-env.d.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── validate-fixes.cjs
├── vite.config.ts
├── vite.config.ts.timestamp-1764112502714-cf9fd8625f552.mjs
├── vite.production.config.ts
├── vite-plugin-suppress-warnings.js
├── vitest.config.ts
├── vitest.config.ts.timestamp-1764269734457-23e2fd6269212.mjs
├── vitest.integration.config.ts
├── vitest.performance.config.ts
components.json
CRITICAL_FIXES_ROADMAP.md
cspell.config.yaml
deployment/
├── cdn-config.js
├── environment-configs/
│   ├── development.env
│   ├── production.env
│   ├── staging.env
├── monitoring-dashboards.js
├── pipeline-config.yml
├── README.md
docker-compose.yml
Dockerfile
Dockerfile.client
docs/
├── analysis/
│   ├── chanuka_implementation_guide.md
│   ├── civic_engagement_framework.md
│   ├── codebase-analysis.md
│   ├── constitutional_analysis_framework.md
│   ├── legislative_framework.md
├── API.md
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
├── archive/
│   ├── chanuka_webapp_copy.md
│   ├── ezra-nehemiah-chanuka (1).md
│   ├── philosophical_threshold_poems.md
│   ├── strategy_template_flow.mermaid
├── artifact-removal-summary.md
├── chanuka/
│   ├── # Chanuka Platform Consolidation Impleme.md
│   ├── api_strategy_doc.md
│   ├── chanuka architecture2.md
│   ├── chanuka_automation_strategy.md
│   ├── chanuka_complete_slogans.md
│   ├── chanuka_design.txt
│   ├── chanuka_final_poems.md
│   ├── chanuka_implementation_unified.txt
│   ├── chanuka_requirements.txt
│   ├── community-input_1751743369833.html
│   ├── dashboard_1751743369900.html
│   ├── design.md
│   ├── dissertation.md
│   ├── expert-verification_1751743369833.html
│   ├── Kenyan_constitution_2010.md
│   ├── merged_bill_sponsorship.html
│   ├── missing-strategic-features-analysis.md
│   ├── phase1-404-audit-report.md
│   ├── phase3-server-repository-pattern-spec.md
│   ├── phase4-client-feature-sliced-design-spec.md
│   ├── phase5-integration-boundaries-completion.md
│   ├── philosophical_connections_analysis.md
│   ├── README.md
│   ├── sponsorbyreal.html
│   ├── strategic_additions_poems.md
│   ├── strategic-ui-features-analysis.md
│   ├── strategy_template_flow.mermaid
├── chanuka_architecture.txt
├── Chanuka_Funding_Pitch.md
├── chanuka_requirements.txt
├── client-module.md
├── configuration-assessment.md
├── configuration-guide.md
├── core-error-handling-architecture.md
├── database-cohesion-implementation-summary.md
├── database-cohesion-migration-guide.md
├── database-cohesion-strategy.md
├── database-consolidation-final-plan.md
├── database-consolidation-plan.md
├── database-consolidation-refined-strategy.md
├── database-integration-implementation-summary.md
├── deployment-module.md
├── DIGITAL LAW 2018.pdf
├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
├── docs-module.md
├── domain-integration-completion-summary.md
├── drizzle-module.md
├── environment-config-assessment.md
├── error-analytics-dashboard-architecture.md
├── error-analytics-dashboard-types.md
├── examples/
│   ├── validation-integration-examples.ts
├── migrations/
│   ├── comprehensive-migration-strategy.md
├── missing-tables-analysis.md
├── monitoring.md
├── monorepo.md
├── new-domains-integration-guide.md
├── project/
│   ├── brand-roadmap.md
│   ├── manifesto.md
│   ├── problem-statement.md
├── project-overview.md
├── project-structure.md
├── README.md
├── schema-domain-relationships.md
├── scripts-module.md
├── secure-environment-setup.md
├── server-module.md
├── setup.md
├── shared-module.md
├── structure_tools_guide.md
├── tests-module.md
├── ui-design-plan.md
├── unified-api-client-architecture.md
├── unified-components-documentation.md
├── user-component-consolidation-architecture.md
├── validation-services.md
drizzle/
drizzle.config.ts
├── 0021_clean_comprehensive_schema.sql
├── 0022_fix_schema_alignment.sql
├── 0023_migration_infrastructure.sql
├── 0024_migration_infrastructure.sql
├── 0025_postgresql_fulltext_enhancements.sql
├── 0026_optimize_search_indexes.sql
├── 20251104110148_soft_captain_marvel.sql
├── 20251104110149_advanced_discovery.sql
├── 20251104110150_real_time_engagement.sql
├── 20251104110151_transparency_intelligence.sql
├── 20251104110152_expert_verification.sql
├── 20251117080000_intelligent_search_phase2.sql
├── 20251117104802_intelligent_search_system.sql
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
fix-imports.js
generate_concept_note.py
generate_invitation.py
generate_overview.py
generate-structure-to-file.sh
logs/
├── logger_errors.txt
├── logger_files.txt
├── logger_files_clean.txt
nginx.conf
nx.json
package.json
performance-baselines.json
performance-budget-report.json
performance-budget-report.md
performance-budgets.json
playwright.config.ts
playwright-report/
├── index.html
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.js
README.md
runtime-dependency-check.js
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
│   ├── consolidate-database-infrastructure.ts
│   ├── debug-migration-table.ts
│   ├── generate-migration.ts
│   ├── health-check.ts
│   ├── initialize-database-integration.ts
│   ├── init-strategic-database.ts
│   ├── migrate.ts
│   ├── migration-performance-profile.ts
│   ├── migration-testing.ts
│   ├── reset.ts
│   ├── reset-and-migrate.ts
│   ├── reset-database.ts
│   ├── reset-database-fixed.ts
│   ├── rollback-testing.ts
│   ├── run-migrations.ts
│   ├── run-reset.sh
│   ├── run-reset.ts
│   ├── schema-drift-detection.ts
│   ├── setup.ts
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
├── deploy-production.js
├── deploy-repository-migration.ts
├── deploy-search-optimization.ts
├── design-system-audit.js
├── diagnose-503-issues.js
├── disable-all-tests.ts
├── domain-type-migration-plan.md
├── drop-schema.ts
├── dynamic-path-updater.js
├── emergency-build-fix.ts
├── execute-comprehensive-migration.ts
├── fix-all-imports.js
├── fix-all-shared-core-imports.ts
├── fix-api-response-calls.js
├── fix-config.json
├── fix-display-names.ts
├── fix-error-fallback.ts
├── fix-failing-tests.ts
├── fix-frontend-imports.js
├── fix-import-paths.ts
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
├── fix-schema-imports.log
├── fix-schema-imports.ts
├── fix-schema-references.ts
├── fix-schema-tests.ts
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
├── integrate-error-management.ts
├── migrate-api-imports.js
├── migrate-codebase-utilities.ts
├── migrate-console-logs.ts
├── migrate-error-handling.ts
├── migrate-imports.js
├── migrate-logging.js
├── migrate-shared-types.ts
├── ml-service-demo.ts
├── optimize-memory.js
├── performance-budget-enforcer.cjs
├── performance-regression-detector.js
├── performance-trend-analyzer.cjs
├── rollback-cleanup.ts
├── run-adapter-cleanup.js
├── run-strategic-tests.cjs
├── scan-migration-artifacts.sh
├── seeds/
│   ├── legislative-seed.ts
│   ├── seed.ts
│   ├── simple-seed.ts
├── setup-playwright.js
├── standardize-imports.ts
├── strategic-contrast-migration.js
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
├── validate-config.js
├── validate-config-consistency.ts
├── validate-imports.js
├── validate-new-domains.cjs
├── validate-property-naming.ts
├── validate-syntax.ts
├── validate-test-config.js
├── verify-and-fix-project-structure.ts
├── verify-cleanup.ts
├── verify-project-structure.ts
├── verify-security-patches.ts
├── web-vitals-checker.js
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
│   ├── search-system.test.ts
│   ├── unit/
│   │   ├── notification-service-unit.test.ts
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
│   ├── services-init.ts
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
│   │   ├── security-schemas.ts
│   │   ├── validation-metrics.ts
│   │   ├── validation-services-init.ts
│   │   ├── validation-utils.ts
├── db.ts
├── demo/
│   ├── real-time-tracking-demo.ts
├── docs/
│   ├── government-data-integration-implementation.md
│   ├── INITIALIZATION_ARCHITECTURE.md
│   ├── README-schema-validation.md
│   ├── schema-import-guide.md
│   ├── schema-migration-summary.md
├── domain/
│   ├── interfaces/
│   │   ├── bill-repository.interface.ts
│   │   ├── sponsor-repository.interface.ts
│   │   ├── user-repository.interface.ts
├── examples/
│   ├── cached-routes-example.ts
├── example-server-integration.ts
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
│   │   │   ├── bills-repository-service.ts
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
│   │   ├── comment-voting.ts
│   │   ├── community.ts
│   │   ├── index.ts
│   │   ├── social-integration.ts
│   │   ├── social-share-storage.d.ts
│   │   ├── social-share-storage.ts
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
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── external/
│   │   │   │   ├── legal-database-client.ts
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
│   ├── government-data/
│   │   ├── routes.ts
│   │   ├── services/
│   │   │   ├── government-data-integration.service.ts
│   ├── index.ts
│   ├── notifications/
│   │   ├── __tests__/
│   │   │   ├── notification-service-integration.test.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── notification.ts
│   │   ├── index.ts
│   │   ├── notification-router.ts
│   │   ├── notification-service.ts
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
│   ├── repository-cleanup.ts
│   ├── search/
│   │   ├── __tests__/
│   │   │   ├── basic-test.cjs
│   │   │   ├── fuse-basic.test.ts
│   │   │   ├── fuse-engine-direct.test.ts
│   │   │   ├── fuse-relevance-comparison.test.ts
│   │   │   ├── fuse-standalone.test.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── phase3-integration.test.ts
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
│   │   │   ├── QueryIntentService.ts
│   │   │   ├── RelevanceScorer.ts
│   │   │   ├── search.dto.ts
│   │   │   ├── SearchAnalytics.ts
│   │   │   ├── SearchValidator.ts
│   │   │   ├── TypoCorrectionService.ts
│   │   ├── engines/
│   │   │   ├── core/
│   │   │   │   ├── fuse-search.engine.ts
│   │   │   │   ├── fuzzy-matching.engine.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── postgresql-fulltext.engine.ts
│   │   │   │   ├── simple-matching.engine.ts
│   │   │   ├── dual-engine-orchestrator.ts
│   │   │   ├── index.ts
│   │   │   ├── semantic-search.engine.ts
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
│   │   │   ├── embedding.service.ts
│   │   │   ├── history-cleanup.service.ts
│   │   ├── utils/
│   │   │   ├── parallel-query-executor.ts
│   │   │   ├── search-syntax-parser.ts
│   ├── search-suggestions.ts
│   ├── security/
│   │   ├── encryption-service.ts
│   │   ├── enhanced-security-service.ts
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
│   ├── caching/
│   │   ├── query-cache.ts
│   ├── connection-migrator.ts
│   ├── database/
│   │   ├── backup-recovery.ts
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
│   │   ├── database-integration.ts
│   │   ├── database-optimization.ts
│   │   ├── database-service.ts
│   │   ├── index.d.ts
│   │   ├── index.ts
│   │   ├── indexing-optimizer.ts
│   │   ├── migration-manager.ts
│   │   ├── migration-service.ts
│   │   ├── monitoring.ts
│   │   ├── schema.sql
│   │   ├── seed-data-service.ts
│   │   ├── storage.ts
│   │   ├── unified-storage.ts
│   │   ├── validation.ts
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
│   ├── logging/
│   │   ├── database-logger.ts
│   │   ├── log-aggregator.ts
│   │   ├── logging-config.ts
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
│   │   ├── types.ts
│   ├── performance/
│   │   ├── performance-monitor.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   ├── drizzle-bill-repository.ts
│   │   │   ├── drizzle-sponsor-repository.ts
│   │   │   ├── drizzle-user-repository.ts
│   │   │   ├── hybrid-bill-repository.ts
│   │   │   ├── index.ts
│   │   ├── lazy-loader.ts
│   ├── security/
│   │   ├── data-privacy-service.ts
│   │   ├── input-validation-service.ts
│   │   ├── secure-query-builder.ts
│   ├── socketio-service.ts
│   ├── validation/
│   │   ├── repository-validation.ts
│   ├── websocket.ts
│   ├── websocket-adapter.ts
│   ├── websocket-config.ts
├── middleware/
│   ├── auth.ts
│   ├── boom-error-middleware.ts
│   ├── boom-migration-summary.md
│   ├── cache-middleware.ts
│   ├── circuit-breaker-middleware.ts
│   ├── command-injection-prevention.ts
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
│   ├── fix-return-statements.js
│   ├── fix-shared-imports.js
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
├── server-startup.ts
├── services/
│   ├── api-cost-monitoring.ts
│   ├── external-api-error-handler.ts
│   ├── managed-government-data-integration.ts
│   ├── README-schema-validation.md
│   ├── schema-validation-demo.ts
│   ├── schema-validation-test.ts
├── simple-server.ts
├── tests/
│   ├── auth-system.test.ts
│   ├── basic-api.test.ts
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
│   │   ├── command-injection-prevention.test.ts
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
├── test-setup.ts
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
│   ├── missing-modules-fallback.ts
│   ├── request-utils.ts
│   ├── shared-core-fallback.ts
│   ├── validation.ts
├── vite.ts
├── vitest.config.ts
shared/
├── core/
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
│   │   │   ├── caching-service.ts
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
│   │   │   ├── icaching-service.ts
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
│   │   │   ├── iobservability-stack.ts
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
│   │   │   ├── observability-stack-service.ts
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
│   │   │   ├── ivalidation-service.ts
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
│   │   │   ├── validation-service-wrapper.ts
├── database/
│   ├── connection.ts
│   ├── core/
│   │   ├── config.ts
│   │   ├── connection-manager.ts
│   │   ├── database-orchestrator.ts
│   │   ├── health-monitor.ts
│   │   ├── index.ts
│   │   ├── unified-config.ts
│   ├── example-usage.ts
│   ├── index.ts
│   ├── init.ts
│   ├── monitoring.ts
│   ├── pool.ts
│   ├── utils/
│   │   ├── base-script.ts
├── fix-critical-errors.cjs
├── fix-unused-imports.js
├── i18n/
│   ├── en.ts
├── package.json
├── project.json
├── schema/
│   ├── __tests__/
│   │   ├── advocacy_coordination.test.ts
│   │   ├── advocacy_coordination.test.ts.backup
│   │   ├── argument_intelligence.test.ts
│   │   ├── argument_intelligence.test.ts.backup
│   │   ├── citizen_participation.test.ts
│   │   ├── citizen_participation.test.ts.backup
│   │   ├── constitutional_intelligence.test.ts
│   │   ├── constitutional_intelligence.test.ts.backup
│   │   ├── foundation.test.ts
│   │   ├── foundation.test.ts.backup
│   │   ├── impact_measurement.test.ts
│   │   ├── impact_measurement.test.ts.backup
│   │   ├── integrity_operations.test.ts
│   │   ├── integrity_operations.test.ts.backup
│   │   ├── parliamentary_process.test.ts
│   │   ├── parliamentary_process.test.ts.backup
│   │   ├── platform_operations.test.ts
│   │   ├── platform_operations.test.ts.backup
│   │   ├── README.md
│   │   ├── run_all_tests.ts
│   │   ├── run_tests.ts
│   │   ├── setup.ts
│   │   ├── test_runner.sh
│   │   ├── transparency_analysis.test.ts
│   │   ├── transparency_analysis.test.ts.backup
│   │   ├── universal_access.test.ts
│   │   ├── universal_access.test.ts.backup
│   ├── advanced_discovery.ts
│   ├── advocacy_coordination.ts
│   ├── analysis.ts
│   ├── argument_intelligence.ts
│   ├── citizen_participation.ts
│   ├── constitutional_intelligence.ts
│   ├── database_architecture.md
│   ├── enum.ts
│   ├── expert_verification.ts
│   ├── foundation.ts
│   ├── graph_database_strategy.md
│   ├── impact_measurement.ts
│   ├── index.ts
│   ├── integrity_operations.ts
│   ├── migration_guide.md
│   ├── parliamentary_process.ts
│   ├── platform_operations.ts
│   ├── real_time_engagement.ts
│   ├── search_system.ts
│   ├── simple-validate.ts
│   ├── transparency_analysis.ts
│   ├── transparency_intelligence.ts
│   ├── universal_access.ts
│   ├── validate-schemas.ts
├── tsconfig.json
├── utils/
│   ├── anonymity-helper.ts
├── vitest.config.ts
start-dev.js
tailwind.config.js
TEST_STATUS_SUMMARY.md
test-connection.html
test-imports.ts
test-results/
├── results.json
├── results.xml
tests/
├── api/
│   ├── auth.spec.ts
│   ├── database-performance.spec.ts
│   ├── external-api-integration.spec.ts
├── architecture/
│   ├── boundary-enforcement.test.ts
├── baseline.test.ts
├── cross-module-integration.test.ts
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── database-performance-ui.spec.ts
│   ├── responsive-test.spec.ts
├── global-setup.ts
├── global-teardown.ts
├── import-path-verification.test.ts
├── integration/
│   ├── slow-query-monitoring.spec.ts
│   ├── test-framework-separation.test.ts
├── mocks/
│   ├── performance.mock.ts
│   ├── redis.mock.ts
├── performance/
│   ├── memory-profiling.spec.ts
├── playwright.config.ts
├── setup/
│   ├── test-environment.ts
├── test-framework-separation.test.ts
├── utils/
│   ├── test-helpers.ts
├── visual/
│   ├── components.spec.ts
tsconfig.json
tsconfig.server.json
tsconfig.server.tsbuildinfo
tsconfig.tsbuildinfo
validation_output.txt
vitest.config.ts
vitest.setup.ts
vitest.workspace.config.ts
```

**Excluded directories:** `.git`, `node_modules`, `dist`, `build`, `coverage`, `tmp`, `temp`, `__pycache__`, `vendor`, and all hidden files/directories

Generated on: 2025-11-28 07:09:06
