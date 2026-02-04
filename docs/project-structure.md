# Project Structure

**Generated:** February 4, 2026 at 06:04 PM
**Max Depth:** 7 levels
**Total Items:** 3,451

```
.
├── client/
│   ├── public/
│   │   ├── Chanuka_logo.png
│   │   ├── Chanuka_logo.svg
│   │   ├── Chanuka_logo.webp
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── icon-144x144.png
│   │   ├── logo-192.png
│   │   ├── manifest.json
│   │   ├── manifest.webmanifest
│   │   ├── offline.html
│   │   ├── sw.js
│   │   └── symbol.svg
│   ├── reports/
│   │   ├── radix-analysis/
│   │   │   └── radix-bundle-analysis.json
│   │   ├── design-system-audit-report.json
│   │   └── design-system-audit-report.md
│   ├── scripts/
│   │   ├── contrast-check.js
│   │   ├── fix-button-variants.js
│   │   ├── fix-component-props.js
│   │   ├── fix-lucide-icons.js
│   │   ├── fix-unused-imports.js
│   │   ├── README.md
│   │   └── run-all-fixes.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── providers/
│   │   │   │   ├── AppProviders.tsx
│   │   │   │   └── queryClient.ts
│   │   │   └── shell/
│   │   │       ├── AppRouter.tsx
│   │   │       ├── AppShell.tsx
│   │   │       ├── index.ts
│   │   │       ├── NavigationBar.tsx
│   │   │       ├── ProtectedRoute.tsx
│   │   │       └── SkipLinks.tsx
│   │   ├── core/
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticsIntegration.tsx
│   │   │   │   ├── AnalyticsProvider.tsx
│   │   │   │   ├── comprehensive-tracker.ts
│   │   │   │   ├── data-retention-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── api/
│   │   │   │   ├── examples/
│   │   │   │   │   └── circuit-breaker-usage.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-api-with-fallback.ts
│   │   │   │   │   ├── use-safe-mutation.ts
│   │   │   │   │   ├── use-safe-query.ts
│   │   │   │   │   ├── useApiConnection.ts
│   │   │   │   │   ├── useConnectionAware.tsx
│   │   │   │   │   └── useServiceStatus.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── bill.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── common.ts
│   │   │   │   │   ├── community.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── engagement.ts
│   │   │   │   │   ├── error-response.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── performance.ts
│   │   │   │   │   ├── preferences.ts
│   │   │   │   │   ├── request.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   ├── shared-imports.ts
│   │   │   │   │   └── sponsor.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── authenticated-client.ts
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── base-client.ts
│   │   │   │   ├── bills.ts
│   │   │   │   ├── cache-manager.ts
│   │   │   │   ├── circuit-breaker-client.ts
│   │   │   │   ├── circuit-breaker-monitor.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interceptors.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── privacy.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── retry-handler.ts
│   │   │   │   ├── retry.ts
│   │   │   │   ├── safe-client.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── system.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── WEBSOCKET_API_README.md
│   │   │   ├── auth/
│   │   │   │   ├── config/
│   │   │   │   │   ├── auth-config.ts
│   │   │   │   │   └── auth-init.ts
│   │   │   │   ├── constants/
│   │   │   │   │   └── auth-constants.ts
│   │   │   │   ├── errors/
│   │   │   │   │   └── auth-errors.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useAuth.tsx
│   │   │   │   ├── http/
│   │   │   │   │   ├── authenticated-client.ts
│   │   │   │   │   └── authentication-interceptors.ts
│   │   │   │   ├── scripts/
│   │   │   │   │   ├── cleanup-old-auth.ts
│   │   │   │   │   ├── init-auth-system.ts
│   │   │   │   │   └── migration-helper.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth-api-service.ts
│   │   │   │   │   ├── session-manager.ts
│   │   │   │   │   └── token-manager.ts
│   │   │   │   ├── store/
│   │   │   │   │   ├── auth-middleware.ts
│   │   │   │   │   └── auth-slice.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── permission-helpers.ts
│   │   │   │   │   ├── security-helpers.ts
│   │   │   │   │   ├── storage-helpers.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── initialization.ts
│   │   │   │   ├── rbac.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── service.ts
│   │   │   │   └── types.ts
│   │   │   ├── browser/
│   │   │   │   ├── browser-detector.ts
│   │   │   │   ├── BrowserCompatibilityChecker.tsx
│   │   │   │   ├── BrowserCompatibilityReport.tsx
│   │   │   │   ├── BrowserCompatibilityTester.tsx
│   │   │   │   ├── compatibility-manager.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── environment.ts
│   │   │   │   ├── feature-detector.ts
│   │   │   │   ├── FeatureFallbacks.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── polyfill-manager.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── useBrowserStatus.tsx
│   │   │   ├── command-palette/
│   │   │   │   ├── CommandPalette.test.tsx
│   │   │   │   ├── CommandPalette.tsx
│   │   │   │   ├── commands.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── types.ts
│   │   │   │   └── useCommandPalette.ts
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useRealtime.ts
│   │   │   │   │   ├── useUnifiedCommunity.ts
│   │   │   │   │   └── useUnifiedDiscussion.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── moderation.service.ts
│   │   │   │   │   ├── state-sync.service.ts
│   │   │   │   │   └── websocket-manager.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── context.tsx
│   │   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── reducer.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── widgets.ts
│   │   │   ├── error/
│   │   │   │   ├── components/
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── contextual-messages.ts
│   │   │   │   │   │   ├── error-icons.tsx
│   │   │   │   │   │   ├── error-normalizer.ts
│   │   │   │   │   │   ├── error-reporter.ts
│   │   │   │   │   │   └── shared-error-display.tsx
│   │   │   │   │   ├── CommunityErrorBoundary.tsx
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── ErrorFallback.tsx
│   │   │   │   │   ├── ErrorRecoveryManager.tsx
│   │   │   │   │   ├── example.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── RecoveryUI.tsx
│   │   │   │   │   ├── ServiceUnavailable.tsx
│   │   │   │   │   ├── SimpleErrorBoundary.tsx
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── UnifiedErrorBoundary.tsx
│   │   │   │   ├── messages/
│   │   │   │   │   ├── error-message-formatter.ts
│   │   │   │   │   ├── error-message-templates.ts
│   │   │   │   │   ├── error-recovery-suggestions.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── use-error-messages.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── hooks-middleware.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── library-middleware.ts
│   │   │   │   │   ├── security-middleware.ts
│   │   │   │   │   └── service-middleware.ts
│   │   │   │   ├── reporters/
│   │   │   │   │   ├── ApiReporter.ts
│   │   │   │   │   ├── CompositeReporter.ts
│   │   │   │   │   ├── ConsoleReporter.ts
│   │   │   │   │   └── SentryReporter.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── classes.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── dashboard-errors.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── handler.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitoring.tsx
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── reporting.ts
│   │   │   │   └── types.ts
│   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── loading/
│   │   │   │   ├── components/
│   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LoadingProgress.tsx
│   │   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   │   └── LoadingSpinner.tsx
│   │   │   │   ├── examples/
│   │   │   │   │   └── README.md
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useOnlineStatus.ts
│   │   │   │   │   └── useTimeoutAwareLoading.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   └── timeout-utils.ts
│   │   │   │   ├── context.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── reducer.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validation.ts
│   │   │   ├── mobile/
│   │   │   │   ├── device-detector.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── performance-optimizer.ts
│   │   │   │   ├── responsive-utils.ts
│   │   │   │   ├── touch-handler.ts
│   │   │   │   └── types.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitoring-init.ts
│   │   │   │   └── sentry-config.ts
│   │   │   ├── navigation/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-navigation-accessibility.ts
│   │   │   │   │   ├── use-navigation-performance.ts
│   │   │   │   │   ├── use-navigation-preferences.tsx
│   │   │   │   │   └── use-unified-navigation.ts
│   │   │   │   ├── access-control.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── breadcrumbs.ts
│   │   │   │   ├── context.tsx
│   │   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── lookup.ts
│   │   │   │   ├── navigation-service.ts
│   │   │   │   ├── NavigationConsistency.test.tsx
│   │   │   │   ├── NavigationConsistency.tsx
│   │   │   │   ├── NavigationPerformance.test.tsx
│   │   │   │   ├── NavigationPerformance.tsx
│   │   │   │   ├── page-relationship-service.ts
│   │   │   │   ├── persistence.ts
│   │   │   │   ├── preferences.ts
│   │   │   │   ├── route-preloading.ts
│   │   │   │   ├── route-validation.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── test-navigation.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validation.ts
│   │   │   ├── performance/
│   │   │   │   ├── alerts.ts
│   │   │   │   ├── architecture-performance-monitor.ts
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitor.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── web-vitals.ts
│   │   │   ├── personalization/
│   │   │   │   ├── index.ts
│   │   │   │   ├── persona-detector.test.tsx
│   │   │   │   ├── persona-detector.ts
│   │   │   │   └── types.ts
│   │   │   ├── realtime/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── use-bill-tracking.ts
│   │   │   │   │   ├── use-community-realtime.ts
│   │   │   │   │   ├── use-realtime-engagement-legacy.ts
│   │   │   │   │   └── use-websocket.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── bill-tracking.ts
│   │   │   │   │   ├── community.ts
│   │   │   │   │   ├── notifications.ts
│   │   │   │   │   └── realtime-service.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── event-emitter.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── hub.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── manager.ts
│   │   │   │   ├── README.md
│   │   │   │   └── websocket-client.ts
│   │   │   ├── recovery/
│   │   │   │   ├── dashboard-recovery.ts
│   │   │   │   └── index.ts
│   │   │   ├── search/
│   │   │   │   ├── index.ts
│   │   │   │   ├── search-strategy-selector.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── UnifiedSearchInterface.test.tsx
│   │   │   │   └── UnifiedSearchInterface.tsx
│   │   │   ├── security/
│   │   │   │   ├── config/
│   │   │   │   │   └── security-config.ts
│   │   │   │   ├── headers/
│   │   │   │   │   └── SecurityHeaders.ts
│   │   │   │   ├── migration/
│   │   │   │   │   ├── compatibility-layer.ts
│   │   │   │   │   └── migration-utils.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   │   └── SecuritySettings.tsx
│   │   │   │   │   ├── icons/
│   │   │   │   │   │   └── ChanukaIcons.tsx
│   │   │   │   │   ├── privacy/
│   │   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   │   └── README.md
│   │   │   │   │   └── index.ts
│   │   │   │   ├── unified/
│   │   │   │   │   ├── csp-config.ts
│   │   │   │   │   ├── csp-manager.ts
│   │   │   │   │   ├── error-handler.ts
│   │   │   │   │   ├── error-middleware.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input-sanitizer.ts
│   │   │   │   │   ├── rate-limiter.ts
│   │   │   │   │   └── security-interface.ts
│   │   │   │   ├── csp-manager.ts
│   │   │   │   ├── csp-nonce.ts
│   │   │   │   ├── csrf-protection.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input-sanitizer.ts
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   ├── security-monitor.ts
│   │   │   │   ├── security-monitoring.ts
│   │   │   │   ├── security-service.ts
│   │   │   │   ├── security-utils.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── vulnerability-scanner.ts
│   │   │   ├── storage/
│   │   │   │   ├── cache-storage.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── offline-data-manager.ts
│   │   │   │   ├── secure-storage.ts
│   │   │   │   └── types.ts
│   │   │   ├── validation/
│   │   │   │   ├── dashboard-validation.ts
│   │   │   │   └── index.ts
│   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   ├── core-monitoring.ts
│   │   │   ├── index.ts
│   │   │   └── MIGRATION_GUIDE.md
│   │   ├── features/
│   │   │   ├── accountability/
│   │   │   │   └── ShadowLedgerDashboard.ts
│   │   │   ├── admin/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── admin.tsx
│   │   │   │   │   ├── AnalyticsDashboardPage.tsx
│   │   │   │   │   ├── coverage.tsx
│   │   │   │   │   ├── database-manager.tsx
│   │   │   │   │   └── integration-status.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── migration/
│   │   │   │   │   │   └── MigrationManager.tsx
│   │   │   │   │   ├── admin-dashboard.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── analysis/
│   │   │   │   ├── model/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── useConflictAnalysis.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── conflict-detection.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── AnalysisDashboard.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── analytics/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-comprehensive-analytics.ts
│   │   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   │   ├── use-render-tracker.ts
│   │   │   │   │   ├── use-web-vitals.ts
│   │   │   │   │   ├── useAnalytics.ts
│   │   │   │   │   └── useErrorAnalytics.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── error-analytics-bridge.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── offline-analytics.ts
│   │   │   │   │   ├── privacy-analytics.ts
│   │   │   │   │   └── user-journey-tracker.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   │   │   └── EngagementAnalyticsDashboard.tsx
│   │   │   │   │   ├── metrics/
│   │   │   │   │   │   └── CivicScoreCard.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── auth/
│   │   │   │   └── pages/
│   │   │   │       ├── auth-page.tsx
│   │   │   │       ├── ForgotPasswordPage.tsx
│   │   │   │       ├── LoginPage.tsx
│   │   │   │       ├── PrivacyPage.tsx
│   │   │   │       ├── RegisterPage.tsx
│   │   │   │       ├── ResetPasswordPage.tsx
│   │   │   │       └── SecurityPage.tsx
│   │   │   ├── bills/
│   │   │   │   ├── model/
│   │   │   │   │   └── types.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── bill-analysis.tsx
│   │   │   │   │   ├── bill-detail.tsx
│   │   │   │   │   ├── bill-sponsorship-analysis.tsx
│   │   │   │   │   ├── bills-dashboard-page.tsx
│   │   │   │   │   └── BillsPortalPage.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── pagination.ts
│   │   │   │   │   └── tracking.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── analysis/
│   │   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   │   ├── ConflictNetworkVisualization.tsx
│   │   │   │   │   │   │   ├── ConflictOfInterestAnalysis.tsx
│   │   │   │   │   │   │   ├── FinancialExposureTracker.tsx
│   │   │   │   │   │   │   ├── HistoricalPatternAnalysis.tsx
│   │   │   │   │   │   │   ├── ImplementationWorkaroundsTracker.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── TransparencyScoring.tsx
│   │   │   │   │   │   ├── BillAnalysis.tsx
│   │   │   │   │   │   ├── BillAnalysisTab.tsx
│   │   │   │   │   │   ├── comments.tsx
│   │   │   │   │   │   ├── ConstitutionalAnalysisPanel.tsx
│   │   │   │   │   │   ├── section.tsx
│   │   │   │   │   │   ├── stats.tsx
│   │   │   │   │   │   └── timeline.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   │   │   ├── ImplementationWorkarounds.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── detail/
│   │   │   │   │   │   ├── BillActionsPanel.tsx
│   │   │   │   │   │   ├── BillCommunityTab.tsx
│   │   │   │   │   │   ├── BillFullTextTab.tsx
│   │   │   │   │   │   ├── BillHeader.tsx
│   │   │   │   │   │   ├── BillOverviewTab.tsx
│   │   │   │   │   │   ├── BillRelationshipsTab.tsx
│   │   │   │   │   │   ├── BillSponsorsTab.tsx
│   │   │   │   │   │   └── BillTimelineTab.tsx
│   │   │   │   │   ├── education/
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── implementation/
│   │   │   │   │   ├── list/
│   │   │   │   │   │   └── BillCard.tsx
│   │   │   │   │   ├── tracking/
│   │   │   │   │   │   └── real-time-tracker.tsx
│   │   │   │   │   ├── transparency/
│   │   │   │   │   │   └── ConflictAnalysisDashboard.tsx
│   │   │   │   │   ├── ArgumentsTab.tsx
│   │   │   │   │   ├── bill-list.tsx
│   │   │   │   │   ├── bill-tracking.tsx
│   │   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   │   ├── filter-panel.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LegislativeBriefDisplay.tsx
│   │   │   │   │   ├── MobileBillDetail.tsx
│   │   │   │   │   ├── stats-overview.tsx
│   │   │   │   │   └── virtual-bill-grid.tsx
│   │   │   │   ├── BillAnalysis.tsx
│   │   │   │   ├── BillHeader.tsx
│   │   │   │   ├── BillList.tsx
│   │   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── services.ts
│   │   │   │   └── types.ts
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useArgumentClusters.ts
│   │   │   │   │   ├── useArgumentsForBill.ts
│   │   │   │   │   ├── useCommunity.ts
│   │   │   │   │   ├── useCommunityIntegration.ts
│   │   │   │   │   ├── useDiscussion.ts
│   │   │   │   │   └── useLegislativeBrief.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── comments.tsx
│   │   │   │   │   └── community-input.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── backend.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── store/
│   │   │   │   │   └── slices/
│   │   │   │   │       └── communitySlice.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── activity/
│   │   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   │   └── CommunityStats.tsx
│   │   │   │   │   ├── discussion/
│   │   │   │   │   │   ├── CommentForm.tsx
│   │   │   │   │   │   ├── CommentItem.tsx
│   │   │   │   │   │   └── DiscussionThread.tsx
│   │   │   │   │   ├── expert/
│   │   │   │   │   │   └── ExpertInsights.tsx
│   │   │   │   │   ├── hub/
│   │   │   │   │   │   └── CommunityHub.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── dashboard/
│   │   │   │   └── pages/
│   │   │   │       └── dashboard.tsx
│   │   │   ├── design-system/
│   │   │   │   └── pages/
│   │   │   │       └── design-system-test.tsx
│   │   │   ├── expert/
│   │   │   │   └── pages/
│   │   │   │       └── expert-verification.tsx
│   │   │   ├── home/
│   │   │   │   └── pages/
│   │   │   │       ├── home.tsx
│   │   │   │       └── StrategicHomePage.tsx
│   │   │   ├── legal/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useConflicts.ts
│   │   │   │   │   ├── useConstitutionalAnalysis.ts
│   │   │   │   │   ├── useLegalRisks.ts
│   │   │   │   │   └── usePrecedents.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── acceptable-use.tsx
│   │   │   │   │   ├── accessibility.tsx
│   │   │   │   │   ├── compliance-ccpa.tsx
│   │   │   │   │   ├── contact-legal.tsx
│   │   │   │   │   ├── cookie-policy.tsx
│   │   │   │   │   ├── data-retention.tsx
│   │   │   │   │   ├── dmca.tsx
│   │   │   │   │   ├── privacy.tsx
│   │   │   │   │   ├── security.tsx
│   │   │   │   │   └── terms.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ConflictAlertCard.tsx
│   │   │   │   │   └── LegalAnalysisTab.tsx
│   │   │   │   └── index.ts
│   │   │   ├── market/
│   │   │   │   └── SokoHaki.tsx
│   │   │   ├── monitoring/
│   │   │   │   ├── model/
│   │   │   │   │   ├── continuous-performance-monitor.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── performance-benchmarking.ts
│   │   │   │   │   ├── performance-regression-tester.ts
│   │   │   │   │   ├── render-tracker.ts
│   │   │   │   │   ├── render-tracking-integration.ts
│   │   │   │   │   └── route-profiler.ts
│   │   │   │   └── index.ts
│   │   │   ├── navigation/
│   │   │   │   └── model/
│   │   │   │       └── index.ts
│   │   │   ├── notifications/
│   │   │   │   ├── model/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── notification-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── onboarding/
│   │   │   │   └── pages/
│   │   │   │       └── onboarding.tsx
│   │   │   ├── pretext-detection/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── usePretextAnalysis.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── PretextAnalysisService.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── CivicActionToolbox.tsx
│   │   │   │   │   ├── PretextDetectionPanel.tsx
│   │   │   │   │   └── PretextWatchCard.tsx
│   │   │   │   ├── demo.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── privacy/
│   │   │   │   └── pages/
│   │   │   │       └── privacy-center.tsx
│   │   │   ├── realtime/
│   │   │   │   ├── model/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── realtime-optimizer.ts
│   │   │   │   └── index.ts
│   │   │   ├── search/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   │   ├── useSearch.ts
│   │   │   │   │   └── useStreamingSearch.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── UniversalSearchPage.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── intelligent-search.ts
│   │   │   │   │   ├── search-api.ts
│   │   │   │   │   └── streaming-search.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── filters/
│   │   │   │   │   │   └── SearchFilters.tsx
│   │   │   │   │   ├── interface/
│   │   │   │   │   │   ├── AdvancedSearch.tsx
│   │   │   │   │   │   ├── IntelligentAutocomplete.tsx
│   │   │   │   │   │   ├── SavedSearches.tsx
│   │   │   │   │   │   ├── SearchAnalyticsDashboard.tsx
│   │   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   │   ├── SearchProgressIndicator.tsx
│   │   │   │   │   │   └── SearchTips.tsx
│   │   │   │   │   ├── results/
│   │   │   │   │   │   ├── SearchResultCard.tsx
│   │   │   │   │   │   └── SearchResults.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── security/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useSecurity.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── SecurityDemoPage.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   │   └── SecuritySettings.tsx
│   │   │   │   │   ├── icons/
│   │   │   │   │   │   └── ChanukaIcons.tsx
│   │   │   │   │   ├── privacy/
│   │   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   │   └── README.md
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── sponsorship/
│   │   │   │   └── pages/
│   │   │   │       ├── co-sponsors.tsx
│   │   │   │       ├── financial-network.tsx
│   │   │   │       ├── methodology.tsx
│   │   │   │       ├── overview.tsx
│   │   │   │       └── primary-sponsor.tsx
│   │   │   ├── users/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useAuth.tsx
│   │   │   │   │   ├── useOnboarding.ts
│   │   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   │   ├── useUserAPI.ts
│   │   │   │   │   └── useUsers.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── user-service.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── UserAccountPage.tsx
│   │   │   │   │   └── UserProfilePage.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── achievements-service.ts
│   │   │   │   │   ├── auth-service.ts
│   │   │   │   │   ├── dashboard-service.ts
│   │   │   │   │   ├── engagement-service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── onboarding-service.ts
│   │   │   │   │   ├── profile-service.ts
│   │   │   │   │   ├── user-api.ts
│   │   │   │   │   └── user-service-legacy.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── AuthAlert.tsx
│   │   │   │   │   │   ├── AuthButton.tsx
│   │   │   │   │   │   ├── AuthInput.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── useLoginForm.ts
│   │   │   │   │   ├── icons/
│   │   │   │   │   │   └── ChanukaIcons.tsx
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   └── UserJourneyOptimizer.tsx
│   │   │   │   │   ├── profile/
│   │   │   │   │   │   └── UserProfileSection.tsx
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   └── alert-preferences.tsx
│   │   │   │   │   ├── verification/
│   │   │   │   │   │   ├── CommunityValidation.tsx
│   │   │   │   │   │   ├── CredibilityScoring.tsx
│   │   │   │   │   │   ├── ExpertBadge.tsx
│   │   │   │   │   │   ├── ExpertConsensus.tsx
│   │   │   │   │   │   ├── ExpertProfileCard.tsx
│   │   │   │   │   │   ├── ExpertVerificationDemo.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   ├── verification-list.tsx
│   │   │   │   │   │   └── VerificationWorkflow.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── home/
│   │   │   │   │   ├── PersonalizedDashboardPreview.tsx
│   │   │   │   │   ├── PlatformStats.tsx
│   │   │   │   │   └── RecentActivity.tsx
│   │   │   │   └── performance/
│   │   │   │       └── PerformanceMonitor.tsx
│   │   │   ├── config/
│   │   │   │   ├── api.ts
│   │   │   │   ├── development.ts
│   │   │   │   ├── feature-flags.ts
│   │   │   │   ├── gestures.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration.ts
│   │   │   │   ├── mobile.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   └── onboarding.ts
│   │   │   ├── constants/
│   │   │   │   └── index.ts
│   │   │   ├── content/
│   │   │   │   └── copy-system.ts
│   │   │   ├── context/
│   │   │   │   └── KenyanContextProvider.tsx
│   │   │   ├── contexts/
│   │   │   │   ├── context/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── NavigationContext.tsx
│   │   │   │   └── ThemeContext.tsx
│   │   │   ├── data/
│   │   │   │   └── mock/
│   │   │   │       ├── analytics.ts
│   │   │   │       ├── bills.ts
│   │   │   │       ├── community.ts
│   │   │   │       ├── discussions.ts
│   │   │   │       ├── experts.ts
│   │   │   │       ├── generators.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── loaders.ts
│   │   │   │       ├── real-kenya-data.ts
│   │   │   │       ├── realtime.ts
│   │   │   │       └── users.ts
│   │   │   ├── demo/
│   │   │   │   └── community-integration-demo.ts
│   │   │   ├── design-system/
│   │   │   │   ├── accessibility/
│   │   │   │   │   ├── contrast.ts
│   │   │   │   │   ├── focus.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── motion.ts
│   │   │   │   │   ├── touch.ts
│   │   │   │   │   └── typography.ts
│   │   │   │   ├── contexts/
│   │   │   │   │   ├── BrandVoiceProvider.tsx
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── LowBandwidthProvider.tsx
│   │   │   │   │   └── MultilingualProvider.tsx
│   │   │   │   ├── feedback/
│   │   │   │   │   ├── Alert.tsx
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── Progress.tsx
│   │   │   │   │   ├── separator.tsx
│   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   ├── Toaster.tsx
│   │   │   │   │   └── Tooltip.tsx
│   │   │   │   ├── interactive/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Calendar.tsx
│   │   │   │   │   ├── Checkbox.tsx
│   │   │   │   │   ├── Collapsible.tsx
│   │   │   │   │   ├── Command.tsx
│   │   │   │   │   ├── ContextMenu.tsx
│   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   ├── DropdownMenu.tsx
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── form.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── NavigationMenu.tsx
│   │   │   │   │   ├── Popover.tsx
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── scroll-area.tsx
│   │   │   │   │   ├── Select.tsx
│   │   │   │   │   ├── separator.tsx
│   │   │   │   │   ├── Sheet.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   ├── Switch.tsx
│   │   │   │   │   ├── Tabs.tsx
│   │   │   │   │   ├── Textarea.tsx
│   │   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── lib/
│   │   │   │   │   └── utils.ts
│   │   │   │   ├── media/
│   │   │   │   │   ├── Avatar.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Logo.tsx
│   │   │   │   │   └── OptimizedImage.tsx
│   │   │   │   ├── standards/
│   │   │   │   │   ├── brand-personality.ts
│   │   │   │   │   ├── button.ts
│   │   │   │   │   ├── card.ts
│   │   │   │   │   ├── empty-states.ts
│   │   │   │   │   ├── error-states.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input.ts
│   │   │   │   │   ├── interactive-states.ts
│   │   │   │   │   ├── loading-states.ts
│   │   │   │   │   ├── low-bandwidth.ts
│   │   │   │   │   ├── multilingual-support.ts
│   │   │   │   │   ├── political-neutrality.ts
│   │   │   │   │   └── typography.ts
│   │   │   │   ├── styles/
│   │   │   │   │   ├── base/
│   │   │   │   │   │   ├── base.css
│   │   │   │   │   │   └── variables.css
│   │   │   │   │   ├── responsive/
│   │   │   │   │   │   ├── desktop.css
│   │   │   │   │   │   ├── mobile.css
│   │   │   │   │   │   ├── special.css
│   │   │   │   │   │   └── tablet.css
│   │   │   │   │   ├── utilities/
│   │   │   │   │   │   ├── accessibility.css
│   │   │   │   │   │   └── animations.css
│   │   │   │   │   ├── accessibility.css
│   │   │   │   │   ├── chanuka-design-system.css
│   │   │   │   │   ├── design-tokens.css
│   │   │   │   │   ├── fallbacks.css
│   │   │   │   │   ├── fix-build-errors.css
│   │   │   │   │   ├── generated-tokens.css
│   │   │   │   │   ├── globals.css
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── STYLE_GUIDE.md
│   │   │   │   ├── themes/
│   │   │   │   │   ├── dark.ts
│   │   │   │   │   ├── high-contrast.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── light.ts
│   │   │   │   │   └── themeProvider.ts
│   │   │   │   ├── tokens/
│   │   │   │   │   ├── animations.ts
│   │   │   │   │   ├── borders.ts
│   │   │   │   │   ├── breakpoints.ts
│   │   │   │   │   ├── colors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── shadows.ts
│   │   │   │   │   ├── spacing.ts
│   │   │   │   │   ├── theme.ts
│   │   │   │   │   ├── typography.ts
│   │   │   │   │   ├── unified-export.ts
│   │   │   │   │   ├── unified.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── component-types.ts
│   │   │   │   ├── typography/
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── heading.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Label.tsx
│   │   │   │   │   └── text.tsx
│   │   │   │   ├── utils/
│   │   │   │   │   ├── cn.ts
│   │   │   │   │   ├── contrast.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── performance.ts
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── responsive.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── 4-personas-charter.ts.txt
│   │   │   │   ├── 4-personas-implementation-guide.ts
│   │   │   │   ├── COMPLETION_REPORT.ts
│   │   │   │   ├── COMPONENT_FLATTENING_EXECUTION_REPORT.ts
│   │   │   │   ├── COMPONENT_FLATTENING_STRATEGY.ts
│   │   │   │   ├── DIRECTORY_VALIDATION_FRAMEWORK.ts
│   │   │   │   ├── IMPLEMENTATION_GUIDE.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── INTEGRATION_COMPLETE.md
│   │   │   │   ├── integration.ts
│   │   │   │   ├── MIGRATION_SUMMARY.ts
│   │   │   │   ├── quality.ts
│   │   │   │   ├── QUICK_START.md
│   │   │   │   ├── README.md
│   │   │   │   ├── REFINEMENT_STRATEGY.ts
│   │   │   │   ├── responsive.css
│   │   │   │   ├── responsive.ts
│   │   │   │   └── strategy.ts
│   │   │   ├── examples/
│   │   │   │   ├── render-tracking-usage.tsx
│   │   │   │   └── WebSocketIntegrationExample.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── mobile/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useBottomSheet.ts
│   │   │   │   │   ├── useDeviceInfo.ts
│   │   │   │   │   ├── useInfiniteScroll.ts
│   │   │   │   │   ├── useMobileNavigation.ts
│   │   │   │   │   ├── useMobileTabs.ts
│   │   │   │   │   ├── usePullToRefresh.ts
│   │   │   │   │   ├── useScrollManager.ts
│   │   │   │   │   └── useSwipeGesture.ts
│   │   │   │   ├── patterns/
│   │   │   │   │   ├── callback-template.ts
│   │   │   │   │   ├── effect-template.ts
│   │   │   │   │   ├── reducer-template.ts
│   │   │   │   │   └── strategy-template.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── error-handling.ts
│   │   │   │   │   ├── migration-compatibility.ts
│   │   │   │   │   └── performance.ts
│   │   │   │   ├── hooks-monitoring.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   ├── README.md
│   │   │   │   ├── STANDARDIZATION_GUIDELINES.md
│   │   │   │   ├── store.ts
│   │   │   │   ├── TESTING_STRATEGY.md
│   │   │   │   ├── use-architecture-performance.ts
│   │   │   │   ├── use-cleanup.ts
│   │   │   │   ├── use-i18n.tsx
│   │   │   │   ├── use-keyboard-focus.ts
│   │   │   │   ├── use-mobile.ts
│   │   │   │   ├── use-offline-detection.ts
│   │   │   │   ├── use-performance-monitor.ts
│   │   │   │   ├── use-safe-query.ts
│   │   │   │   ├── use-system.ts
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   ├── useCleanup.tsx
│   │   │   │   ├── useDatabaseStatus.ts
│   │   │   │   ├── useDebounce.ts
│   │   │   │   ├── useErrorRecovery.ts
│   │   │   │   ├── useIntegratedServices.ts
│   │   │   │   ├── useMediaQuery.ts
│   │   │   │   ├── useMockData.ts
│   │   │   │   ├── useNavigationSlice.ts
│   │   │   │   ├── useNotifications.ts
│   │   │   │   ├── useOfflineCapabilities.ts
│   │   │   │   ├── useOfflineDetection.tsx
│   │   │   │   ├── useProgressiveDisclosure.ts
│   │   │   │   ├── useSafeEffect.ts
│   │   │   │   ├── useSeamlessIntegration.ts
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useSecurity.ts
│   │   │   │   └── useService.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── asset-loading/
│   │   │   │   │   ├── AssetLoadingProvider.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── cache/
│   │   │   │   │   ├── cache-invalidation.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── event-bus.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── http/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── request-deduplicator.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── cross-system-error-analytics.ts
│   │   │   │   │   ├── development-dashboard.tsx
│   │   │   │   │   ├── error-aggregation-service.ts
│   │   │   │   │   ├── error-monitor.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitoring-integration.ts
│   │   │   │   │   ├── performance-impact-monitor.ts
│   │   │   │   │   ├── performance-monitor.ts
│   │   │   │   │   ├── trend-analysis-service.ts
│   │   │   │   │   └── unified-error-monitoring-interface.ts
│   │   │   │   ├── store/
│   │   │   │   │   ├── middleware/
│   │   │   │   │   │   ├── apiMiddleware.ts
│   │   │   │   │   │   ├── authMiddleware.ts
│   │   │   │   │   │   ├── errorHandlingMiddleware.ts
│   │   │   │   │   │   ├── navigationPersistenceMiddleware.ts
│   │   │   │   │   │   └── webSocketMiddleware.ts
│   │   │   │   │   ├── slices/
│   │   │   │   │   │   ├── discussionSlice.ts
│   │   │   │   │   │   ├── errorAnalyticsSlice.ts
│   │   │   │   │   │   ├── errorHandlingSlice.ts
│   │   │   │   │   │   ├── loadingSlice.ts
│   │   │   │   │   │   ├── navigationSlice.ts
│   │   │   │   │   │   ├── realTimeSlice.ts
│   │   │   │   │   │   ├── sessionSlice.ts
│   │   │   │   │   │   ├── uiSlice.ts
│   │   │   │   │   │   └── userDashboardSlice.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── store-types.ts
│   │   │   │   ├── sync/
│   │   │   │   │   ├── background-sync-manager.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── system/
│   │   │   │   │   ├── HealthCheck.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── workers/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── service-worker.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-validator.ts
│   │   │   │   └── quality-optimizer.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── index.ts
│   │   │   │   └── unified-interfaces.ts
│   │   │   ├── pages/
│   │   │   │   └── not-found.tsx
│   │   │   ├── recovery/
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── auth-service-init.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── dataRetentionService.ts
│   │   │   │   ├── errorAnalyticsBridge.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── FSD_MIGRATION_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── mockUserData.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   ├── notification-service.ts
│   │   │   │   ├── notification-system-integration-summary.md
│   │   │   │   ├── privacyAnalyticsService.ts
│   │   │   │   ├── realistic-demo-data.ts
│   │   │   │   ├── services-monitoring.ts
│   │   │   │   └── userService.ts
│   │   │   ├── stubs/
│   │   │   │   ├── database-stub.ts
│   │   │   │   └── middleware-stub.ts
│   │   │   ├── templates/
│   │   │   │   ├── component-templates.ts
│   │   │   │   └── index.ts
│   │   │   ├── testing/
│   │   │   │   ├── index.ts
│   │   │   │   ├── mock-data.ts
│   │   │   │   └── mock-users.ts
│   │   │   ├── types/
│   │   │   │   ├── bill/
│   │   │   │   │   ├── auth-types.ts
│   │   │   │   │   ├── bill-analytics.ts
│   │   │   │   │   ├── bill-base.ts
│   │   │   │   │   ├── bill-services.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── community/
│   │   │   │   │   ├── community-base.ts
│   │   │   │   │   ├── community-base.ts.orig
│   │   │   │   │   ├── community-base.ts.rej
│   │   │   │   │   ├── community-hooks.ts
│   │   │   │   │   ├── community-services.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   ├── loading.ts
│   │   │   │   │   └── navigation.ts
│   │   │   │   ├── context/
│   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   ├── loading.ts
│   │   │   │   │   └── navigation.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── dashboard-base.ts
│   │   │   │   │   ├── dashboard-components.ts
│   │   │   │   │   ├── dashboard-events.ts
│   │   │   │   │   ├── dashboard-metrics.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   ├── loading.ts
│   │   │   │   │   └── navigation.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── common.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── data.ts
│   │   │   │   │   ├── files.ts
│   │   │   │   │   ├── forms.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── navigation.ts
│   │   │   │   │   ├── react.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── arguments.ts
│   │   │   │   ├── browser.ts
│   │   │   │   ├── core.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── loading.ts
│   │   │   │   ├── lucide-react.d.ts
│   │   │   │   ├── mobile.ts
│   │   │   │   ├── monitoring.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   ├── search-response.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── security.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── user-dashboard.ts
│   │   │   ├── ui/
│   │   │   │   ├── accessibility/
│   │   │   │   │   ├── accessibility-manager.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── civic/
│   │   │   │   │   ├── CivicEducation.test.tsx
│   │   │   │   │   ├── CivicEducationCard.tsx
│   │   │   │   │   ├── CivicEducationHub.tsx
│   │   │   │   │   ├── CivicEducationWidget.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── KenyanLegislativeProcess.tsx
│   │   │   │   │   ├── LegislativeProcessGuide.tsx
│   │   │   │   │   └── README.md
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── DashboardStats.module.css
│   │   │   │   │   │   ├── DashboardStats.tsx
│   │   │   │   │   │   ├── TimeFilterSelector.tsx
│   │   │   │   │   │   └── WelcomeMessage.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useDashboard.ts
│   │   │   │   │   │   ├── useDashboardActions.ts
│   │   │   │   │   │   ├── useDashboardConfig.ts
│   │   │   │   │   │   ├── useDashboardError.ts
│   │   │   │   │   │   ├── useDashboardLayout.ts
│   │   │   │   │   │   ├── useDashboardLoading.ts
│   │   │   │   │   │   ├── useDashboardRefresh.ts
│   │   │   │   │   │   └── useDashboardTopics.ts
│   │   │   │   │   ├── layout/
│   │   │   │   │   │   ├── DashboardContent.tsx
│   │   │   │   │   │   ├── DashboardFooter.tsx
│   │   │   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   │   │   └── DashboardSidebar.tsx
│   │   │   │   │   ├── layouts/
│   │   │   │   │   │   ├── ExpertDashboardLayout.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── IntermediateDashboardLayout.tsx
│   │   │   │   │   │   └── NoviceDashboardLayout.tsx
│   │   │   │   │   ├── modals/
│   │   │   │   │   │   ├── DashboardPreferencesModal.tsx
│   │   │   │   │   │   └── DataExportModal.tsx
│   │   │   │   │   ├── sections/
│   │   │   │   │   │   ├── ActivitySection.tsx
│   │   │   │   │   │   ├── BillsSection.tsx
│   │   │   │   │   │   ├── CivicMetricsSection.tsx
│   │   │   │   │   │   ├── DashboardSections.module.css
│   │   │   │   │   │   ├── EngagementHistorySection.tsx
│   │   │   │   │   │   ├── MigrationDashboard.tsx
│   │   │   │   │   │   ├── RecommendationsSection.tsx
│   │   │   │   │   │   ├── StatsSection.tsx
│   │   │   │   │   │   └── TrackedBillsSection.tsx
│   │   │   │   │   ├── types/
│   │   │   │   │   │   ├── components.ts
│   │   │   │   │   │   ├── core.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── widgets.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── dashboard-config-utils.ts
│   │   │   │   │   │   ├── dashboard-constants.ts
│   │   │   │   │   │   ├── dashboard-formatters.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── performance.ts
│   │   │   │   │   ├── variants/
│   │   │   │   │   │   ├── FullPageDashboard.tsx
│   │   │   │   │   │   └── SectionDashboard.tsx
│   │   │   │   │   ├── widgets/
│   │   │   │   │   │   ├── DashboardCustomizer.tsx
│   │   │   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   │   │   ├── DashboardStack.tsx
│   │   │   │   │   │   ├── DashboardTabs.tsx
│   │   │   │   │   │   ├── DashboardWidget.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── PersonaIndicator.tsx
│   │   │   │   │   │   ├── ProgressiveDisclosure.tsx
│   │   │   │   │   │   └── widget-types.ts
│   │   │   │   │   ├── action-items.tsx
│   │   │   │   │   ├── activity-summary.tsx
│   │   │   │   │   ├── ADAPTIVE_DASHBOARD_SUMMARY.md
│   │   │   │   │   ├── AdaptiveDashboard.tsx
│   │   │   │   │   ├── DashboardFramework.tsx
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MonitoringDashboard.tsx
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── SmartDashboard.tsx
│   │   │   │   │   ├── tracked-topics.tsx
│   │   │   │   │   ├── types.ts
│   │   │   │   │   ├── useDashboardData.ts
│   │   │   │   │   ├── useMigrationDashboardData.ts
│   │   │   │   │   ├── UserDashboard.tsx
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── education/
│   │   │   │   │   ├── ConstitutionalContext.tsx
│   │   │   │   │   ├── EducationalFramework.tsx
│   │   │   │   │   ├── EducationalTooltip.tsx
│   │   │   │   │   ├── HistoricalPrecedents.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── PlainLanguageSummary.tsx
│   │   │   │   │   ├── ProcessEducation.tsx
│   │   │   │   │   └── README.md
│   │   │   │   ├── examples/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── SeamlessIntegrationExample.tsx
│   │   │   │   ├── i18n/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── LanguageSwitcher.tsx
│   │   │   │   ├── integration/
│   │   │   │   │   ├── context/
│   │   │   │   │   │   └── IntegrationContext.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useIntegration.ts
│   │   │   │   │   ├── EnhancedUXIntegration.tsx
│   │   │   │   │   ├── IntegrationProvider.tsx
│   │   │   │   │   ├── IntegrationTest.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppLayout.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── Layout.tsx
│   │   │   │   ├── lazy/
│   │   │   │   │   └── LazyPageWrapper.tsx
│   │   │   │   ├── loading/
│   │   │   │   │   ├── context/
│   │   │   │   │   │   └── AssetLoadingContext.tsx
│   │   │   │   │   ├── core/
│   │   │   │   │   │   └── loadingCore.ts
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── GlobalLoadingExample.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useAssetLoading.ts
│   │   │   │   │   │   ├── useAssetLoadingContext.ts
│   │   │   │   │   │   ├── useAssetLoadingIndicatorState.ts
│   │   │   │   │   │   ├── useGlobalLoadingIndicator.ts
│   │   │   │   │   │   ├── useLoading.ts
│   │   │   │   │   │   ├── useLoadingRecovery.ts
│   │   │   │   │   │   ├── useLoadingState.ts
│   │   │   │   │   │   ├── useProgressiveLoading.ts
│   │   │   │   │   │   ├── useTimeoutAwareLoading.ts
│   │   │   │   │   │   └── useUnifiedLoading.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── AvatarSkeleton.tsx
│   │   │   │   │   │   ├── CardSkeleton.tsx
│   │   │   │   │   │   ├── FormSkeleton.tsx
│   │   │   │   │   │   ├── index.tsx
│   │   │   │   │   │   ├── ListSkeleton.tsx
│   │   │   │   │   │   ├── LoadingIndicator.tsx
│   │   │   │   │   │   ├── ProgressiveLoader.tsx
│   │   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   │   ├── TextSkeleton.tsx
│   │   │   │   │   │   └── TimeoutAwareLoader.tsx
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   │   ├── loadingUtils.ts
│   │   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   │   └── timeout-utils.ts
│   │   │   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── FINAL_STATUS.md
│   │   │   │   │   ├── FontFallback.tsx
│   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   ├── GlobalLoadingProvider.tsx
│   │   │   │   │   ├── ImageFallback.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-test.ts
│   │   │   │   │   ├── LOADING_SYSTEM_STATUS.md
│   │   │   │   │   ├── LoadingDemo.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── LoadingStates.tsx
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── ScriptFallback.tsx
│   │   │   │   │   ├── test-loading.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── mobile/
│   │   │   │   │   ├── data-display/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── MobileBillCard.tsx
│   │   │   │   │   │   ├── MobileChartCarousel.tsx
│   │   │   │   │   │   ├── MobileDataVisualization.tsx
│   │   │   │   │   │   └── MobileTabSelector.tsx
│   │   │   │   │   ├── feedback/
│   │   │   │   │   │   └── OfflineStatusBanner.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useBottomSheet.ts
│   │   │   │   │   │   ├── useInfiniteScroll.ts
│   │   │   │   │   │   └── useMobileTabs.ts
│   │   │   │   │   ├── interaction/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── InfiniteScroll.tsx
│   │   │   │   │   │   ├── MobileBottomSheet.tsx
│   │   │   │   │   │   ├── PullToRefresh.tsx
│   │   │   │   │   │   ├── ScrollToTopButton.tsx
│   │   │   │   │   │   └── SwipeGestures.tsx
│   │   │   │   │   ├── layout/
│   │   │   │   │   │   ├── AutoHideHeader.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── MobileHeader.tsx
│   │   │   │   │   │   ├── MobileLayout.tsx
│   │   │   │   │   │   └── SafeAreaWrapper.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── fallbacks.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── mobile-navigation-enhancements.css
│   │   │   │   │   ├── MobileNavigation.tsx
│   │   │   │   │   └── README_NEW_STRUCTURE.md
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── NavigationAnalytics.tsx
│   │   │   │   │   │   └── NavigationAnalyticsUtils.tsx
│   │   │   │   │   ├── core/
│   │   │   │   │   │   └── roleGuard.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useBreadcrumbNavigation.ts
│   │   │   │   │   │   ├── useNav.ts
│   │   │   │   │   │   ├── useOptimizedNavigation.ts
│   │   │   │   │   │   ├── useRelatedPages.ts
│   │   │   │   │   │   └── useRouteAccess.ts
│   │   │   │   │   ├── performance/
│   │   │   │   │   │   └── NavigationPerformanceDashboard.tsx
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── DESKTOP_SIDEBAR_FIXES.md
│   │   │   │   │   │   ├── DesktopSidebar.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── NavLink.tsx
│   │   │   │   │   │   └── NavSection.tsx
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── navigation-utils.ts
│   │   │   │   │   │   ├── page-relationships.ts
│   │   │   │   │   │   └── route-access.ts
│   │   │   │   │   ├── BreadcrumbNavigation.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   │   │   ├── Navigation.tsx
│   │   │   │   │   ├── NavigationSliceDemo.tsx
│   │   │   │   │   ├── ProgressiveDisclosureDemo.tsx
│   │   │   │   │   ├── ProgressiveDisclosureNavigation.tsx
│   │   │   │   │   ├── ProgressiveDisclosureSimple.tsx
│   │   │   │   │   ├── quick-access-nav.tsx
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   │   ├── NotificationItem.tsx
│   │   │   │   │   └── NotificationPreferences.tsx
│   │   │   │   ├── offline/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── offline-manager.tsx
│   │   │   │   │   ├── OfflineIndicator.tsx
│   │   │   │   │   └── OfflineModal.tsx
│   │   │   │   ├── performance/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── PerformanceDashboard.tsx
│   │   │   │   ├── privacy/
│   │   │   │   │   ├── controls/
│   │   │   │   │   │   ├── ConsentControls.tsx
│   │   │   │   │   │   ├── DataUsageControls.tsx
│   │   │   │   │   │   └── VisibilityControls.tsx
│   │   │   │   │   ├── CompactInterface.tsx
│   │   │   │   │   ├── FullInterface.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── ModalInterface.tsx
│   │   │   │   │   └── PrivacyManager.tsx
│   │   │   │   ├── realtime/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── RealTimeDashboard.tsx
│   │   │   │   │   └── RealTimeNotifications.tsx
│   │   │   │   ├── status/
│   │   │   │   │   ├── connection-status.tsx
│   │   │   │   │   └── database-status.tsx
│   │   │   │   ├── templates/
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   └── error-handling.ts
│   │   │   │   │   ├── component-template.tsx
│   │   │   │   │   └── hook-template.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── component-helpers.ts
│   │   │   │   │   ├── error-handling-exports.ts
│   │   │   │   │   ├── error-handling-utils.ts
│   │   │   │   │   ├── error-handling.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── connection-status.tsx
│   │   │   │   ├── database-status.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── utils/
│   │   │   │   ├── assets.ts
│   │   │   │   ├── browser-compatibility-tests.ts
│   │   │   │   ├── browser.ts
│   │   │   │   ├── bundle-analyzer.ts
│   │   │   │   ├── cn.ts
│   │   │   │   ├── comprehensiveLoading.ts
│   │   │   │   ├── contrast.ts
│   │   │   │   ├── demo-data-service.ts
│   │   │   │   ├── emergency-triage.ts
│   │   │   │   ├── env-config.ts
│   │   │   │   ├── i18n.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input-validation.ts
│   │   │   │   ├── investor-demo-enhancements.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── preload-optimizer.ts
│   │   │   │   ├── privacy-compliance.ts
│   │   │   │   ├── react-helpers.ts
│   │   │   │   ├── safe-lazy-loading-backup.tsx
│   │   │   │   ├── safe-lazy-loading.tsx
│   │   │   │   ├── security.ts
│   │   │   │   ├── service-recovery.ts
│   │   │   │   └── tracing.ts
│   │   │   ├── validation/
│   │   │   │   ├── base-validation.ts
│   │   │   │   ├── consolidated.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── scripts/
│   │   │   ├── analyze-bundle.ts
│   │   │   ├── consolidate-websocket-migration.ts
│   │   │   ├── fsd-migration.ts
│   │   │   ├── migrate-components.ts
│   │   │   ├── performance-audit.ts
│   │   │   ├── README.md
│   │   │   ├── run-emergency-triage.ts
│   │   │   ├── validate-home-page.ts
│   │   │   ├── validate-migration.ts
│   │   │   └── validate-websocket-consolidation.ts
│   │   ├── tests/
│   │   │   ├── accessibility/
│   │   │   │   └── home-page-accessibility.test.ts
│   │   │   └── performance/
│   │   │       └── home-page-performance.test.tsx
│   │   ├── App.tsx
│   │   ├── DevWrapper.tsx
│   │   ├── emergency-styles.css
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── test-styles.html
│   │   └── vite-env.d.ts
│   ├── BUG_FIXES_SUMMARY.md
│   ├── fix-import-syntax.mjs
│   ├── index.html
│   ├── migration-helper.js
│   ├── package-scripts.json
│   ├── package.json
│   ├── playwright.config.ts
│   ├── playwright.visual.config.ts
│   ├── postcss.config.js
│   ├── project.json
│   ├── SERVICE_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md
│   ├── tailwind.config.ts
│   ├── ts2307_full.txt
│   ├── ts2307_remaining.txt
│   ├── tsc_2307_errors.txt
│   ├── tsc_all_errors.txt
│   ├── tsc_bills.txt
│   ├── tsc_community_2.txt
│   ├── tsc_community.txt
│   ├── tsc_errors.txt
│   ├── tsc_output_2.txt
│   ├── tsc_output_3.txt
│   ├── tsc_output_4.txt
│   ├── tsc_output.txt
│   ├── tsc_remaining.txt
│   ├── tsc_sample.txt
│   ├── tsc_users.txt
│   ├── tsconfig.json
│   ├── tsconfig.tsbuildinfo
│   ├── typecheck_error_2.log
│   ├── typecheck_error_3.log
│   ├── typecheck_error.log
│   ├── typecheck_fix_1.log
│   ├── typecheck_fix_2.log
│   ├── typecheck_fix_3.log
│   ├── typecheck_fix_4.log
│   ├── typecheck_fix_5.log
│   ├── typecheck_fix_6.log
│   ├── typecheck_new.log
│   ├── validate-fixes.cjs
│   ├── vite-plugin-suppress-warnings.js
│   ├── vite.config.ts
│   ├── vite.production.config.ts
│   └── vitest.config.ts
├── deployment/
│   ├── environment-configs/
│   │   ├── development.env
│   │   ├── production.env
│   │   └── staging.env
│   ├── cdn-config.js
│   ├── monitoring-dashboards.js
│   ├── pipeline-config.yml
│   └── README.md
├── docs/
│   ├── active/
│   │   ├── configuration-guide.md
│   │   ├── developer-onboarding.md
│   │   ├── setup.md
│   │   └── troubleshooting-guide.md
│   ├── architecture/
│   │   ├── ai-code-review/
│   │   │   ├── design.md
│   │   │   ├── implementation.md
│   │   │   └── requirements.md
│   │   ├── frameworks/
│   │   │   ├── comprehensive-code-analysis.md
│   │   │   ├── synthesis.md
│   │   │   ├── unified-ai-dev.md
│   │   │   ├── unified-code-analysis-v2.md
│   │   │   ├── unified-code-analysis.md
│   │   │   └── unified-coding.md
│   │   ├── application-flow.md
│   │   ├── architecture.md
│   │   ├── chanuka_architecture.txt
│   │   ├── CORE_INTEGRATION_STATUS.md
│   │   ├── docs-module.md
│   │   ├── FEATURES_INTEGRATION_STATUS.md
│   │   ├── FINAL-SCHEMA-INTEGRATION-ZERO-REDUNDANCY.md
│   │   ├── INHERITANCE_COMPOSITION_ANALYSIS.md
│   │   ├── REVISED-SCHEMA-INTEGRATION-FOCUSED.md
│   │   ├── schema-domain-relationships.md
│   │   └── SHARED_INTEGRATION_STATUS.md
│   ├── archive/
│   │   └── legacy_migrations/
│   │       ├── 00_README_SESSION_SUMMARY.md
│   │       ├── ADMIN_ROUTER_MIGRATION_COMPLETE.md
│   │       ├── ANALYSIS_SUMMARY.md
│   │       ├── ARCHITECTURAL_OPTIONS_SHARED_CORE.md
│   │       ├── ARCHITECTURE_MIGRATION_FINAL_REPORT.md
│   │       ├── ARCHITECTURE_QUICK_REFERENCE.md
│   │       ├── ARCHITECTURE_REFACTORING_COMPLETE.md
│   │       ├── ARCHITECTURE_VISUAL_OVERVIEW.md
│   │       ├── ARGUMENT_CONSTITUTIONAL_IMPLEMENTATION.md
│   │       ├── AUTH_ROUTER_MIGRATION_COMPLETE.md
│   │       ├── CLIENT_ERROR_MIGRATION_REPORT.md
│   │       ├── CLIENT_ERROR_SYSTEM_AUDIT.md
│   │       ├── CLIENT_ERROR_USAGE_GUIDE.md
│   │       ├── CONFLICT_ANALYSIS_AND_RESOLUTION.md
│   │       ├── CONFLICT_RESOLUTION_EXECUTION_PLAN.md
│   │       ├── CONFLICT_RESOLUTION_FILE_INVENTORY.md
│   │       ├── CONFLICT_RESOLUTION_INDEX.md
│   │       ├── CONFLICT_RESOLUTION_PROJECT_COMPLETE.md
│   │       ├── CONFLICT_RESOLUTION_QUICK_REFERENCE.md
│   │       ├── CONFLICT_RESOLUTION_SESSION_COMPLETE.md
│   │       ├── CONFLICT_RESOLUTION_VISUAL_SUMMARY.md
│   │       ├── CRITICAL_DISCOVERY_PHASE_R4_REVERSAL.md
│   │       ├── DATABASE_ALIGNMENT_AND_FEATURE_INTEGRATION.md
│   │       ├── DATABASE_ALIGNMENT_COMPLETE.md
│   │       ├── DATABASE_MIGRATION_GUIDE.md
│   │       ├── DATABASE_SCHEMA_ANALYSIS.md
│   │       ├── DELETED_VS_REPLACEMENT_ANALYSIS.md
│   │       ├── DOCUMENTATION_INDEX.md
│   │       ├── ERROR_CONSOLIDATION_SUMMARY.md
│   │       ├── ERROR_SYSTEM_DOCUMENTATION_INDEX.md
│   │       ├── EXECUTION_COMPLETE_SUMMARY.md
│   │       ├── FEATURE_INTEGRATION_ANALYSIS.md
│   │       ├── FEATURE_VERIFICATION_SUMMARY.md
│   │       ├── IMPLEMENTATION_GUIDE.md
│   │       ├── IMPORT_MIGRATION_AND_UI_COMPLETION.md
│   │       ├── IMPORT_MIGRATION_GUIDE.md
│   │       ├── INCOMPLETE_MIGRATIONS_COMPREHENSIVE_AUDIT.md
│   │       ├── INFRASTRUCTURE_AUDIT_REPORT.md
│   │       ├── INFRASTRUCTURE_AUDIT_SUMMARY.md
│   │       ├── INFRASTRUCTURE_QUICK_REFERENCE.md
│   │       ├── INFRASTRUCTURE_REORGANIZATION_SUMMARY.md
│   │       ├── MIGRATION_EXECUTION_PHASE_R4_COMPLETE.md
│   │       ├── MIGRATION_PROGRESS_TRACKER_PHASE2B.txt
│   │       ├── MVP_COMPLETION_ACTION_PLAN.md
│   │       ├── MVP_READINESS_QUICK_REFERENCE.md
│   │       ├── OPTION_1_IMPLEMENTATION_COMPLETE.md
│   │       ├── PHASE_1_2A_COMPLETION.md
│   │       ├── PHASE_1_CACHING_CONSOLIDATION_COMPLETE.md
│   │       ├── PHASE_2_MIDDLEWARE_ASSESSMENT_COMPLETE.md
│   │       ├── PHASE_2B_3_4_PLAN.md
│   │       ├── PHASE_2B_SESSION_2_STATUS.md
│   │       ├── PHASE_3_COMPLETION_SUMMARY.md
│   │       ├── PHASE_3_ERROR_HANDLING_VERIFICATION_COMPLETE.md
│   │       ├── PHASE_4_CONFIG_AUDIT_COMPLETE.md
│   │       ├── PHASE_4_QUALITY_AUDIT_REDUNDANCY_ANALYSIS.md
│   │       ├── PHASE_R4_COMPATIBILITY_LAYER_COMPLETE.md
│   │       ├── PHASE_R4_COMPLETION_REPORT.md
│   │       ├── PHASE_R4_GHOST_MODULE_CLEANUP.md
│   │       ├── PHASE2_IMPLEMENTATION_ROADMAP.md
│   │       ├── PROJECT_STATUS.md
│   │       ├── QUICK_MIGRATION_REFERENCE.md
│   │       ├── QUICK_REFERENCE.md
│   │       ├── QUICK_START_REFERENCE.md
│   │       ├── README_CONFLICT_RESOLUTION.md
│   │       ├── REFACTORING_EXECUTION_SUMMARY.md
│   │       ├── SAFE_MIGRATION_CLEANUP_COMPLETE.md
│   │       ├── SCHEMA_ANALYSIS_AND_READINESS_REPORT.md
│   │       ├── SEARCH_FEATURE_MIGRATION_COMPLETE.md
│   │       ├── SERVER_SERVICES_DEPRECATION.md
│   │       ├── SESSION_2_EXECUTION_SUMMARY.md
│   │       ├── SESSION_2_FINAL_SUMMARY.md
│   │       ├── SESSION_COMPLETE_INFRASTRUCTURE_AUDIT.md
│   │       ├── SESSION_COMPLETION_SUMMARY.md
│   │       ├── SESSION_SUMMARY_TYPE_SYSTEM_CLEANUP.md
│   │       ├── SHARED_AUDIT_QUICK_SUMMARY.md
│   │       ├── SHARED_AUDIT_REPORT.md
│   │       ├── SHARED_REORGANIZATION_STRATEGY.md
│   │       ├── STATUS_REPORT.md
│   │       ├── STRATEGIC_FEATURE_INTEGRATION_ROADMAP.md
│   │       ├── TYPE_SYSTEM_COMPLETE_AUDIT.md
│   │       ├── TYPE_SYSTEM_RESTRUCTURE_PLAN.md
│   │       ├── TYPES_MIGRATION_GUIDE.md
│   │       ├── TYPES_SYSTEM_GOVERNANCE.md
│   │       └── USERS_FEATURE_MIGRATION_COMPLETE.md
│   ├── chanuka/
│   │   ├── # Chanuka Platform Consolidation Impleme.md
│   │   ├── api_strategy_doc.md
│   │   ├── chanuka architecture2.md
│   │   ├── chanuka idea validation.md
│   │   ├── chanuka idea validation.txt
│   │   ├── chanuka_automation_strategy.md
│   │   ├── chanuka_brand_roadmap.md
│   │   ├── CHANUKA_CLIENT_COMPREHENSIVE_ANALYSIS.md
│   │   ├── CHANUKA_CLIENT_DEEP_DIVE_ANALYSIS.md
│   │   ├── chanuka_complete_slogans.md
│   │   ├── chanuka_design_specifications.md
│   │   ├── chanuka_design.txt
│   │   ├── chanuka_final_poems.md
│   │   ├── chanuka_implementation_guide.md
│   │   ├── chanuka_implementation_unified.txt
│   │   ├── chanuka_platform_client_improvement_recommendations.md
│   │   ├── chanuka_requirements.txt
│   │   ├── community-input_1751743369833.html
│   │   ├── dashboard_1751743369900.html
│   │   ├── design.md
│   │   ├── expert-verification_1751743369833.html
│   │   ├── merged_bill_sponsorship.html
│   │   ├── missing-strategic-features-analysis.md
│   │   ├── philosophical_connections_analysis.md
│   │   ├── README.md
│   │   ├── Scriptural Distributed Leadership.md
│   │   ├── sponsorbyreal.html
│   │   ├── strategic_additions_poems.md
│   │   ├── strategic-ui-features-analysis.md
│   │   └── strategy_template_flow.mermaid
│   ├── plans/
│   │   └── monitoring-fsd-restructure.md
│   ├── reference/
│   │   ├── Adversarial Validation of 'Chanuka' as Democratic Infrastructure in Kenya.md
│   │   ├── api-consumer-guide.md
│   │   ├── API.md
│   │   ├── brand-roadmap.md
│   │   ├── Chanuka Validation_ A Rigorous Plan.md
│   │   ├── chanuka_email_templates.md
│   │   ├── chanuka_funder_table (1).md
│   │   ├── Chanuka_Funding_Pitch.md
│   │   ├── chanuka_implementation_guide.md
│   │   ├── chanuka_requirements.txt
│   │   ├── chanuka_serpent_dove.md
│   │   ├── chanuka_timeline_gantt.md
│   │   ├── chanuka_webapp_copy.md
│   │   ├── civic_engagement_framework.md
│   │   ├── Constitutional Normalization in Kenya_ The CDF Paradigm and the Erosion of Democratic Memory.md
│   │   ├── constitutional_analysis_framework.md
│   │   ├── constitutional-normalization-study.md
│   │   ├── Data Strategy for Chanuka Launch.md
│   │   ├── data-entry-templates.json
│   │   ├── database-research-prompt.md
│   │   ├── Detecting Legislative Pretext_ A Framework.md
│   │   ├── DIGITAL LAW 2018.pdf
│   │   ├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
│   │   ├── dissertation.md
│   │   ├── documentation-standards.md
│   │   ├── ezra-nehemiah-chanuka (1).md
│   │   ├── global_implications.md
│   │   ├── Grounding Constitutional Analysis in Pragmatism.md
│   │   ├── index.md
│   │   ├── kba_pitch_deck.md
│   │   ├── Kenyan Civic Tech Data Research Plan.md
│   │   ├── Kenyan Constitutionalism Research Synthesis.md
│   │   ├── Kenyan Legislative Challenges and Judicial Outcomes Database - Table 1.csv
│   │   ├── Kenyan Legislative Data Generation Plan.md
│   │   ├── Kenyan Legislative Intelligence Database Project.md
│   │   ├── Kenyan_constitution_2010.md
│   │   ├── leg_intel_scraper.js
│   │   ├── Legislative Relationship Mapping Framework.md
│   │   ├── legislative_framework.md
│   │   ├── maintenance-process.md
│   │   ├── manifesto.md
│   │   ├── Operationalizing Academic Research for Impact.md
│   │   ├── philosophical_threshold_poems.md
│   │   ├── problem-statement.md
│   │   ├── project-structure-comparison.md
│   │   ├── project-structure.md
│   │   ├── prompt-1-constitutional-vulnerabilities.md
│   │   ├── prompt-2-underutilized-strengths.md
│   │   ├── prompt-3-elite-literacy-loopholes.md
│   │   ├── prompt-4-public-participation.md
│   │   ├── prompt-5-trojan-bills.md
│   │   ├── prompt-6-ethnic-patronage.md
│   │   ├── README.md
│   │   ├── relationship-mapping-framework.md
│   │   ├── Research Strategy for Kenyan Constitutionalism.md
│   │   ├── schema_analysis.md
│   │   ├── Strategic Funding and Networking Plan.md
│   │   ├── strategy_template_flow.mermaid
│   │   ├── sustainable_uprising.md
│   │   ├── user-manual.md
│   │   ├── Validating Legislative Intelligence Market.md
│   │   └── Validating Parliamentary Compliance Infrastructure.md
│   ├── BOUNDARY_DEFINITIONS.md
│   ├── CODEBASE_CONTEXT.md
│   ├── GOVERNOR_INTEGRATION_PHASE1.md
│   ├── IMPORT_PATH_GOVERNANCE.md
│   ├── MIGRATION_LOG.md
│   ├── project-structure.md
│   └── race-condition-analysis.md
├── drizzle/
│   ├── meta/
│   │   ├── _journal.json
│   │   ├── 0000_snapshot.json
│   │   ├── 0001_snapshot.json
│   │   ├── 0002_snapshot.json
│   │   ├── 0021_snapshot.json
│   │   └── 20251104110148_snapshot.json
│   ├── 0001_create_foundation_tables_optimized.sql
│   ├── 0001_create_foundation_tables.sql
│   ├── 0021_clean_comprehensive_schema.sql
│   ├── 0022_fix_schema_alignment.sql
│   ├── 0023_migration_infrastructure.sql
│   ├── 0024_migration_infrastructure.sql
│   ├── 0025_postgresql_fulltext_enhancements.sql
│   ├── 0026_optimize_search_indexes.sql
│   ├── 20260114_phase2_argument_intelligence.sql
│   ├── 20260114_phase2_constitutional_intelligence.sql
│   ├── 20260114_phase2_transparency_conflicts.sql
│   ├── 20260115_argument_intelligence_tables.sql
│   ├── 20260115_constitutional_intelligence_fix.sql
│   ├── 20260115_constitutional_intelligence_tables.sql
│   ├── 1766469695772_init_schema.sql
│   ├── 20251104110148_soft_captain_marvel.sql
│   ├── 20251104110149_advanced_discovery.sql
│   ├── 20251104110150_real_time_engagement.sql
│   ├── 20251104110151_transparency_intelligence.sql
│   ├── 20251104110152_expert_verification.sql
│   ├── 20251117080000_intelligent_search_phase2.sql
│   ├── 20251117104802_intelligent_search_system.sql
│   ├── 20251223154627_database_performance_optimizations.sql
│   ├── COMPREHENSIVE_MIGRATION_SUMMARY.md
│   ├── LEGACY_MIGRATION_ARCHIVE.md
│   └── legacy_migration_validation.sql
├── plans/
│   ├── COMPREHENSIVE_REDUNDANCY_CONSOLIDATION_PLAN.md
│   ├── dashboard-consolidation-plan.md
│   ├── design.md
│   ├── GRAPH_SCHEMA_ANALYSIS_AND_INTEGRATION_PLAN.md
│   ├── HOOKS_CONSOLIDATION_OPPORTUNITIES.md
│   ├── IMPLEMENTATION_PROGRESS.md
│   ├── implementation-plan.md
│   ├── QUALITY_COMPARISON_FRAMEWORK.md
│   ├── QUALITY_COMPARISON_RESULTS.md
│   └── requirements.md
├── playwright-report/
│   └── index.html
├── scripts/
│   ├── archived-analysis-tools/
│   │   ├── chanuka_error_extractor.py
│   │   └── count-websocket-fields.mjs
│   ├── archived-migration-tools/
│   │   ├── type-cleanup.mjs
│   │   ├── type-safety-fixer.mjs
│   │   └── websocket-migration-validation.mjs
│   ├── database/
│   │   ├── graph/
│   │   │   ├── discover-networks.ts
│   │   │   ├── discover-patterns.ts
│   │   │   ├── initialize-graph.ts
│   │   │   └── sync-demo.ts
│   │   ├── check-schema.ts
│   │   ├── check-tables.ts
│   │   ├── consolidate-database-infrastructure.ts
│   │   ├── create-missing-mvp-tables.ts
│   │   ├── DATABASE_DRIVER_STRATEGY.md
│   │   ├── debug-migration-table.ts
│   │   ├── DEPRECATION_NOTICE.md
│   │   ├── ensure-foundation-tables.ts
│   │   ├── execute-sql-migrations-advanced.ts
│   │   ├── execute-sql-migrations.ts
│   │   ├── generate-migration.ts
│   │   ├── health-check.ts
│   │   ├── init-strategic-database.ts
│   │   ├── initialize-database-integration.ts
│   │   ├── migrate.ts
│   │   ├── migration-performance-profile.ts
│   │   ├── README.md
│   │   ├── reset-and-migrate-fresh.ts
│   │   ├── reset-and-migrate.ts
│   │   ├── reset-database-fixed.ts
│   │   ├── reset-database.ts
│   │   ├── reset.ts
│   │   ├── run-migrations-sql.ts
│   │   ├── run-migrations.ts
│   │   ├── run-reset.sh
│   │   ├── run-reset.ts
│   │   ├── schema-drift-detection.ts
│   │   ├── SCRIPTS_GUIDE.md
│   │   ├── setup-schema.ts
│   │   ├── setup.ts
│   │   ├── simple-migrate.ts
│   │   ├── simple-reset.ts
│   │   ├── validate-migration.ts
│   │   ├── verify-alignment.ts
│   │   ├── verify-arguments-constitutional.ts
│   │   ├── verify-database-alignment.ts
│   │   └── verify-schema.ts
│   ├── deployment/
│   │   └── deploy.sh
│   ├── deprecated/
│   │   ├── circular-dependency-resolver.mjs
│   │   ├── extract_errors_monorepo.mjs
│   │   ├── import-resolver.mjs
│   │   ├── validate_imports.js
│   │   ├── validator.mjs
│   │   └── verify-exports.js
│   ├── seeds/
│   │   ├── legislative-seed.ts
│   │   ├── seed.ts
│   │   └── simple-seed.ts
│   ├── typescript-fixer/
│   │   ├── src/
│   │   │   ├── analyzers/
│   │   │   │   ├── database-pattern-detector.ts
│   │   │   │   ├── drizzle-pattern-detector.ts
│   │   │   │   ├── import-path-resolver.ts
│   │   │   │   ├── project-analyzer.ts
│   │   │   │   ├── schema-import-detector.ts
│   │   │   │   ├── schema-parser.ts
│   │   │   │   ├── schema-table-analyzer.ts
│   │   │   │   └── shared-core-utility-detector.ts
│   │   │   ├── core/
│   │   │   │   ├── error-extractor.ts
│   │   │   │   └── typescript-program-loader.ts
│   │   │   ├── fixers/
│   │   │   │   ├── api-response-fixer.ts
│   │   │   │   ├── database-connection-fixer.ts
│   │   │   │   ├── exact-optional-property-fixer.ts
│   │   │   │   ├── shared-core-import-fixer.ts
│   │   │   │   └── unused-variable-cleaner.ts
│   │   │   ├── formatters/
│   │   │   │   └── error-message-formatter.ts
│   │   │   ├── types/
│   │   │   │   └── core.ts
│   │   │   ├── validators/
│   │   │   │   └── api-parameter-validator.ts
│   │   │   ├── cli.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── fixtures/
│   │   │   │   ├── chanuka-edge-case-patterns.ts
│   │   │   │   ├── chanuka-shared-core-patterns.ts
│   │   │   │   ├── chanuka-unused-patterns.ts
│   │   │   │   ├── chanuka-validation-patterns.ts
│   │   │   │   ├── database-patterns.ts
│   │   │   │   └── sample-chanuka-file.ts
│   │   │   ├── global.d.ts
│   │   │   └── setup.ts
│   │   ├── jest.config.js
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── add-react-imports.js
│   ├── align-imports.ts
│   ├── align-schema.ts
│   ├── analyze-bundle.cjs
│   ├── analyze-codebase-errors.ts
│   ├── analyze-phase2.sh
│   ├── analyzer.js
│   ├── architecture_fixer.ts
│   ├── audit-codebase-utilities.ts
│   ├── audit-error-handling-sprawl.ts
│   ├── audit-middleware-sprawl.ts
│   ├── bulk-migrate-types.sh
│   ├── bundle-analysis-plugin.js
│   ├── bundle-analyzer.js
│   ├── CHANUKA_MIGRATION_PLAN.md
│   ├── check-table-structure.ts
│   ├── check-tables.ts
│   ├── check-thresholds.js
│   ├── check-type-compatibility.ts
│   ├── clean-shared-core-imports.ts
│   ├── cleanup-deprecated-folders.ts
│   ├── cleanup-legacy-adapters.js
│   ├── cleanup-orphaned-files.ts
│   ├── cleanup-redundant-utils.js
│   ├── complete-fsd-migration.sh
│   ├── complete-migrations.ts
│   ├── complete-realignment.ts
│   ├── complete-schema-fix.ts
│   ├── consolidate-imports.ts
│   ├── consolidate-redundant-implementations.ts
│   ├── consolidate-sprawl.ts
│   ├── database-analyzer.ts
│   ├── demo-repository-deployment.ts
│   ├── dependency-cruiser.js
│   ├── deploy-error-handling.ts
│   ├── deploy-phase1-utilities.ts
│   ├── deploy-production.js
│   ├── deploy-repository-migration.ts
│   ├── deploy-search-optimization.ts
│   ├── design-system-audit.js
│   ├── diagnose-503-issues.js
│   ├── domain-type-migration-plan.md
│   ├── drop-schema.ts
│   ├── dynamic-path-updater.js
│   ├── emergency-build-fix.ts
│   ├── emergency-design-system-consolidation.ts
│   ├── execute-comprehensive-migration.ts
│   ├── final-client-cleanup.sh
│   ├── fix-all-imports.js
│   ├── fix-all-shared-core-imports.ts
│   ├── fix-api-response-calls.js
│   ├── fix-client-issues.sh
│   ├── fix-config.json
│   ├── fix-design-system.ts
│   ├── fix-display-names.ts
│   ├── fix-error-components.sh
│   ├── fix-error-fallback.ts
│   ├── fix-features-integration.ts
│   ├── fix-frontend-imports.js
│   ├── fix-import-paths.ts
│   ├── fix-infrastructure-issues.ts
│   ├── fix-lucide-imports.ts
│   ├── fix-missing-exports.ts
│   ├── fix-plural-singular-consistency.ts
│   ├── fix-property-naming-consistency.ts
│   ├── fix-remaining-api-calls.js
│   ├── fix-remaining-client-issues.sh
│   ├── fix-remaining-errors.ts
│   ├── fix-remaining-imports.js
│   ├── fix-remaining-types.js
│   ├── fix-schema-imports.ts
│   ├── fix-schema-references.ts
│   ├── fix-server-logger-imports.js
│   ├── fix-shared-core-imports.ts
│   ├── fix-shared-folder.ts
│   ├── fix-shared-imports.js
│   ├── fix-shared-ui-bugs.sh
│   ├── fix-shared-ui.sh
│   ├── fix-typescript-syntax-errors.ts
│   ├── flatten-codebase.sh
│   ├── functional_validator.js
│   ├── generate-bundle-report.js
│   ├── generate-comprehensive-migrations.ts
│   ├── identify-any-usage.ts
│   ├── identify-deprecated-files.cjs
│   ├── identify-deprecated-files.js
│   ├── identify-deprecated-files.ts
│   ├── immediate-memory-cleanup.cjs
│   ├── import-resolution-monitor.js
│   ├── integrate-error-management.ts
│   ├── integration-validator.ts
│   ├── jscpd.json
│   ├── knip.json
│   ├── migrate_types.py
│   ├── migrate-api-imports.js
│   ├── migrate-codebase-utilities.ts
│   ├── migrate-console-logs.ts
│   ├── migrate-consolidated-imports.cjs
│   ├── migrate-error-handling.ts
│   ├── migrate-imports.js
│   ├── migrate-logging.js
│   ├── migrate-shared-types.ts
│   ├── migrate-to-unified-websocket.ts
│   ├── migrate-types.js
│   ├── migrate-types.ts
│   ├── ml-service-demo.ts
│   ├── modern-project-analyzer.ts
│   ├── optimize-memory.js
│   ├── performance-budget-enforcer.cjs
│   ├── performance-regression-detector.js
│   ├── performance-trend-analyzer.cjs
│   ├── performance-validator.ts
│   ├── phase2-analyze.js
│   ├── phase2-migration-generator.sh
│   ├── prepare-module-deletion.ts
│   ├── profiling-suite.ts
│   ├── query-analyzer.ts
│   ├── race-condition-analyzer.js
│   ├── README.md
│   ├── rollback-cleanup.ts
│   ├── run-adapter-cleanup.js
│   ├── runtime_diagnostics.js
│   ├── runtime-dependency-check.js
│   ├── scan-migration-artifacts.sh
│   ├── scan-remaining-imports.js
│   ├── setup-playwright.js
│   ├── standardize-imports.ts
│   ├── strategic-contrast-migration.js
│   ├── test-consolidated-design-system.ts
│   ├── test-design-system-architecture.ts
│   ├── update-core-imports.js
│   ├── update-core-references.js
│   ├── update-import-references.ts
│   ├── update-imports-after-flatten.sh
│   ├── validate_structure.ts
│   ├── validate-client-codebase.js
│   ├── validate-client-implementations.ts
│   ├── validate-config-consistency.ts
│   ├── validate-config.js
│   ├── validate-design-system-final.ts
│   ├── validate-design-system.ts
│   ├── validate-fsd-migration.ts
│   ├── validate-functional-validator.js
│   ├── validate-imports.js
│   ├── validate-migration-completion.ts
│   ├── validate-new-domains.cjs
│   ├── validate-property-naming.ts
│   ├── validate-shared-folder.ts
│   ├── validate-shared-ui.js
│   ├── validate-syntax.ts
│   ├── verify-and-fix-project-structure.ts
│   ├── verify-cleanup.ts
│   ├── verify-project-structure.ts
│   ├── verify-security-patches.ts
│   └── web-vitals-checker.js
├── server/
│   ├── config/
│   │   ├── development.ts
│   │   ├── index.ts
│   │   ├── production.ts
│   │   └── test.ts
│   ├── demo/
│   │   └── real-time-tracking-demo.ts
│   ├── docs/
│   │   ├── government-data-integration-implementation.md
│   │   ├── INITIALIZATION_ARCHITECTURE.md
│   │   ├── README-schema-validation.md
│   │   ├── schema-import-guide.md
│   │   └── schema-migration-summary.md
│   ├── domain/
│   │   └── interfaces/
│   │       ├── bill-repository.interface.ts
│   │       ├── sponsor-repository.interface.ts
│   │       └── user-repository.interface.ts
│   ├── examples/
│   │   └── cached-routes-example.ts
│   ├── features/
│   │   ├── accountability/
│   │   │   ├── ledger.controller.ts
│   │   │   └── ledger.service.ts
│   │   ├── admin/
│   │   │   ├── moderation/
│   │   │   │   ├── content-analysis.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── moderation-analytics.service.ts
│   │   │   │   ├── moderation-decision.service.ts
│   │   │   │   ├── moderation-orchestrator.service.ts
│   │   │   │   ├── moderation-queue.service.ts
│   │   │   │   └── types.ts
│   │   │   ├── admin-router.OLD.ts
│   │   │   ├── admin-router.ts
│   │   │   ├── admin.ts
│   │   │   ├── content-moderation.ts
│   │   │   ├── external-api-dashboard.ts
│   │   │   ├── index.ts
│   │   │   ├── moderation.ts
│   │   │   └── system.ts
│   │   ├── advocacy/
│   │   │   ├── application/
│   │   │   │   ├── action-coordinator.ts
│   │   │   │   ├── campaign-service.ts
│   │   │   │   ├── coalition-builder.ts
│   │   │   │   └── impact-tracker.ts
│   │   │   ├── config/
│   │   │   │   └── advocacy-config.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── action-item.ts
│   │   │   │   │   └── campaign.ts
│   │   │   │   ├── errors/
│   │   │   │   │   └── advocacy-errors.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── advocacy-events.ts
│   │   │   │   └── services/
│   │   │   │       └── campaign-domain-service.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── services/
│   │   │   │       ├── notification-service.ts
│   │   │   │       └── representative-contact-service.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── advocacy-factory.ts
│   │   │   └── index.ts
│   │   ├── ai-evaluation/
│   │   │   └── application/
│   │   │       └── evaluation-orchestrator.ts
│   │   ├── alert-preferences/
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   └── create-alert-preference-command.ts
│   │   │   │   ├── use-cases/
│   │   │   │   │   └── create-alert-preference-use-case.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── alert-utilities.ts
│   │   │   │   └── alert-preferences-service.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── alert-delivery-log.ts
│   │   │   │   │   └── alert-preference.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── alert-preference-repository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── alert-delivery-service.ts
│   │   │   │   │   ├── smart-filtering-service.ts
│   │   │   │   │   └── unified-alert-preference-service.ts
│   │   │   │   └── value-objects/
│   │   │   │       ├── alert-channel.ts
│   │   │   │       ├── alert-conditions.ts
│   │   │   │       ├── alert-type.ts
│   │   │   │       ├── channel-type.ts
│   │   │   │       ├── frequency-config.ts
│   │   │   │       ├── priority.ts
│   │   │   │       └── smart-filtering-config.ts
│   │   │   ├── alert_system_docs.md
│   │   │   └── unified-alert-routes.ts
│   │   ├── analysis/
│   │   │   ├── application/
│   │   │   │   ├── analysis-service-direct.ts
│   │   │   │   ├── bill-comprehensive-analysis.service.ts
│   │   │   │   ├── constitutional-analysis.service.ts
│   │   │   │   ├── coverage-analyzer.service.ts
│   │   │   │   ├── public-interest-analysis.service.ts
│   │   │   │   ├── stakeholder-analysis.service.ts
│   │   │   │   └── transparency-analysis.service.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── analysis-result.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── adapters/
│   │   │   │       └── ml-service-adapter.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── analysis.routes.OLD.ts
│   │   │   ├── analysis.routes.ts
│   │   │   └── architecture-analysis-report.md
│   │   ├── analytics/
│   │   │   ├── config/
│   │   │   │   ├── analytics.config.ts
│   │   │   │   ├── ml-feature-flag.config.ts
│   │   │   │   └── ml-migration.config.ts
│   │   │   ├── conflict-detection/
│   │   │   │   ├── conflict-detection-engine.service.ts
│   │   │   │   ├── conflict-detection-orchestrator.service.ts
│   │   │   │   ├── conflict-resolution-recommendation.service.ts
│   │   │   │   ├── conflict-severity-analyzer.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── stakeholder-analysis.service.ts
│   │   │   │   └── types.ts
│   │   │   ├── controllers/
│   │   │   │   └── engagement.controller.ts
│   │   │   ├── deployment/
│   │   │   │   ├── communication-templates.md
│   │   │   │   ├── feature-flags.md
│   │   │   │   ├── monitoring-checklist.md
│   │   │   │   └── runbook.md
│   │   │   ├── docs/
│   │   │   │   ├── automation-setup.md
│   │   │   │   └── ml-service-migration-summary.md
│   │   │   ├── financial-disclosure/
│   │   │   │   ├── services/
│   │   │   │   │   ├── anomaly-detection.service.ts
│   │   │   │   │   ├── disclosure-processing.service.ts
│   │   │   │   │   ├── disclosure-validation.service.ts
│   │   │   │   │   ├── financial-analysis.service.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── financial-disclosure-orchestrator.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitoring.ts
│   │   │   │   └── types.ts
│   │   │   ├── middleware/
│   │   │   │   ├── analytics-context.ts
│   │   │   │   └── performance-tracking.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── dashboard-config.json
│   │   │   │   ├── runbooks.md
│   │   │   │   └── setup-guide.md
│   │   │   ├── scripts/
│   │   │   │   ├── configure-ml-migration.ts
│   │   │   │   └── demo-ml-migration.ts
│   │   │   ├── services/
│   │   │   │   ├── engagement.service.ts
│   │   │   │   ├── financial-disclosure.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── ml-adapter.service.ts
│   │   │   │   ├── ml.service.ts
│   │   │   │   ├── real-ml.service.ts
│   │   │   │   ├── ussd-corruption-analysis.service.ts
│   │   │   │   ├── ussd-market-intelligence.service.ts
│   │   │   │   └── ussd.service.ts
│   │   │   ├── storage/
│   │   │   │   ├── index.ts
│   │   │   │   └── progress.storage.ts
│   │   │   ├── types/
│   │   │   │   ├── common.ts
│   │   │   │   ├── engagement.ts
│   │   │   │   ├── financial-disclosure.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── ml.ts
│   │   │   │   └── progress-storage.d.ts
│   │   │   ├── analytics.ts
│   │   │   ├── conflict-detection.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── engagement-analytics.ts
│   │   │   ├── index.ts
│   │   │   ├── legal-analysis.ts
│   │   │   ├── ml-analysis.ts
│   │   │   ├── performance-dashboard.ts
│   │   │   ├── regulatory-change-monitoring.ts
│   │   │   ├── swagger.ts
│   │   │   └── transparency-dashboard.ts
│   │   ├── argument-intelligence/
│   │   │   ├── application/
│   │   │   │   ├── argument-intelligence-service.ts
│   │   │   │   ├── argument-processor.ts
│   │   │   │   ├── brief-generator.ts
│   │   │   │   ├── clustering-service.ts
│   │   │   │   ├── coalition-finder.ts
│   │   │   │   ├── evidence-validator.ts
│   │   │   │   ├── power-balancer.ts
│   │   │   │   └── structure-extractor.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── nlp/
│   │   │   │       ├── entity-extractor.ts
│   │   │   │       ├── sentence-classifier.ts
│   │   │   │       └── similarity-calculator.ts
│   │   │   ├── types/
│   │   │   │   └── argument.types.ts
│   │   │   ├── argument-intelligence-router.ts
│   │   │   ├── IMPLEMENTATION_STATUS.md
│   │   │   ├── index.ts
│   │   │   └── routes.ts
│   │   ├── bills/
│   │   │   ├── application/
│   │   │   │   ├── bill-service-adapter.ts
│   │   │   │   ├── bill-service.ts
│   │   │   │   ├── bill-tracking.service.ts
│   │   │   │   ├── bills-repository-service.ts
│   │   │   │   ├── bills.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── sponsorship-analysis.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── bill.ts
│   │   │   │   ├── errors/
│   │   │   │   │   └── bill-errors.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── bill-events.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── bill-domain-service.ts
│   │   │   │   │   ├── bill-event-handler.ts
│   │   │   │   │   └── bill-notification-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── LegislativeStorageTypes.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── bill-storage.ts
│   │   │   │   └── index.ts
│   │   │   ├── repositories/
│   │   │   │   └── sponsorship-repository.ts
│   │   │   ├── services/
│   │   │   │   └── voting-pattern-analysis-service.ts
│   │   │   ├── types/
│   │   │   │   └── analysis.ts
│   │   │   ├── bill-status-monitor.ts
│   │   │   ├── bill-tracking.routes.ts
│   │   │   ├── bill.js
│   │   │   ├── BILLS_MIGRATION_ADAPTER.ts
│   │   │   ├── bills-router-migrated.ts
│   │   │   ├── bills-router.OLD.ts
│   │   │   ├── bills-router.ts
│   │   │   ├── index.ts
│   │   │   ├── legislative-storage.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── real-time-tracking.ts
│   │   │   ├── sponsorship.routes.ts
│   │   │   ├── voting-pattern-analysis-router.ts
│   │   │   └── voting-pattern-analysis.ts
│   │   ├── community/
│   │   │   ├── comment-voting.ts
│   │   │   ├── comment.ts
│   │   │   ├── community.OLD.ts
│   │   │   ├── community.ts
│   │   │   ├── index.ts
│   │   │   ├── social-integration.ts
│   │   │   ├── social-share-storage.d.ts
│   │   │   └── social-share-storage.ts
│   │   ├── constitutional-analysis/
│   │   │   ├── application/
│   │   │   │   ├── constitutional-analysis-service-complete.ts
│   │   │   │   ├── constitutional-analyzer.ts
│   │   │   │   ├── expert-flagging-service.ts
│   │   │   │   ├── grounding-service.ts
│   │   │   │   ├── precedent-finder.ts
│   │   │   │   ├── provision-matcher.ts
│   │   │   │   └── uncertainty-assessor.ts
│   │   │   ├── config/
│   │   │   │   └── analysis-config.ts
│   │   │   ├── demo/
│   │   │   │   └── constitutional-analysis-demo.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── external/
│   │   │   │   │   └── legal-database-client.ts
│   │   │   │   └── knowledge-base/
│   │   │   │       └── precedents-db.ts
│   │   │   ├── scripts/
│   │   │   │   └── populate-sample-data.ts
│   │   │   ├── services/
│   │   │   │   └── constitutional-analysis-factory.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── analysis-utils.ts
│   │   │   ├── constitutional-analysis-router.ts
│   │   │   ├── index.ts
│   │   │   └── test-router.ts
│   │   ├── constitutional-intelligence/
│   │   │   ├── application/
│   │   │   │   └── constitutional-analysis.service.ts
│   │   │   └── domain/
│   │   │       └── entities/
│   │   │           └── constitutional-provision.ts
│   │   ├── government-data/
│   │   │   ├── application/
│   │   │   │   └── managed-integration.service.ts
│   │   │   ├── services/
│   │   │   │   └── government-data-integration.service.ts
│   │   │   ├── index.ts
│   │   │   └── routes.ts
│   │   ├── institutional-api/
│   │   │   └── application/
│   │   │       └── api-gateway-service.ts
│   │   ├── market/
│   │   │   ├── market.controller.ts
│   │   │   ├── market.service.ts
│   │   │   └── market.utils.ts
│   │   ├── monitoring/
│   │   │   └── application/
│   │   │       └── api-cost-monitoring.service.ts
│   │   ├── notifications/
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── notification.ts
│   │   │   ├── index.ts
│   │   │   ├── notification-router.OLD.ts
│   │   │   ├── notification-router.ts
│   │   │   └── notification-service.ts
│   │   ├── privacy/
│   │   │   ├── privacy-routes.ts
│   │   │   ├── privacy-scheduler.ts
│   │   │   └── privacy-service.ts
│   │   ├── recommendation/
│   │   │   ├── application/
│   │   │   │   ├── EngagementTracker.ts
│   │   │   │   └── RecommendationService.ts
│   │   │   ├── domain/
│   │   │   │   ├── EngagementScorer.ts
│   │   │   │   ├── recommendation.dto.ts
│   │   │   │   ├── RecommendationEngine.ts
│   │   │   │   └── RecommendationValidator.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── RecommendationCache.ts
│   │   │   │   └── RecommendationRepository.ts
│   │   │   ├── index.ts
│   │   │   └── RecommendationController.ts
│   │   ├── safeguards/
│   │   │   ├── application/
│   │   │   │   ├── cib-detection-service.ts
│   │   │   │   ├── moderation-service.ts
│   │   │   │   └── rate-limit-service.ts
│   │   │   └── infrastructure/
│   │   │       └── safeguard-jobs.ts
│   │   ├── search/
│   │   │   ├── application/
│   │   │   │   ├── search-service-direct.ts
│   │   │   │   ├── search-service.ts
│   │   │   │   └── SearchService.ts
│   │   │   ├── deployment/
│   │   │   │   ├── search-deployment-orchestrator.ts
│   │   │   │   ├── search-deployment.service.ts
│   │   │   │   └── search-rollback.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── QueryIntentService.ts
│   │   │   │   ├── RelevanceScorer.ts
│   │   │   │   ├── search.dto.ts
│   │   │   │   ├── SearchAnalytics.ts
│   │   │   │   ├── SearchValidator.ts
│   │   │   │   └── TypoCorrectionService.ts
│   │   │   ├── engines/
│   │   │   │   ├── core/
│   │   │   │   │   ├── fuse-search.engine.ts
│   │   │   │   │   ├── fuzzy-matching.engine.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── postgresql-fulltext.engine.ts
│   │   │   │   │   └── simple-matching.engine.ts
│   │   │   │   ├── suggestion/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── suggestion-engine.service.ts
│   │   │   │   │   └── suggestion-ranking.service.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── search.types.ts
│   │   │   │   ├── dual-engine-orchestrator.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── semantic-search.engine.ts
│   │   │   │   ├── suggestion-engine.service.ts
│   │   │   │   └── suggestion-ranking.service.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── SearchCache.ts
│   │   │   │   ├── SearchIndexManager.ts
│   │   │   │   └── SearchQueryBuilder.ts
│   │   │   ├── monitoring/
│   │   │   │   └── search-performance-monitor.ts
│   │   │   ├── services/
│   │   │   │   ├── embedding.service.ts
│   │   │   │   └── history-cleanup.service.ts
│   │   │   ├── utils/
│   │   │   │   ├── parallel-query-executor.ts
│   │   │   │   └── search-syntax-parser.ts
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── search-index-manager.ts
│   │   │   ├── SearchController.OLD.ts
│   │   │   └── SearchController.ts
│   │   ├── security/
│   │   │   ├── encryption-service.ts
│   │   │   ├── index.ts
│   │   │   ├── intrusion-detection-service.ts
│   │   │   ├── privacy-service.ts
│   │   │   ├── security-audit-service.ts
│   │   │   ├── security-initialization-service.ts
│   │   │   ├── security-middleware.ts
│   │   │   ├── security-monitoring-service.ts
│   │   │   ├── security-monitoring.ts
│   │   │   └── tls-config-service.ts
│   │   ├── sponsors/
│   │   │   ├── application/
│   │   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   │   └── sponsor-service-direct.ts
│   │   │   ├── types/
│   │   │   │   ├── analysis.ts
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   ├── sponsors.routes.OLD.ts
│   │   │   └── sponsors.routes.ts
│   │   ├── universal_access/
│   │   │   ├── index.ts
│   │   │   ├── ussd.analytics.ts
│   │   │   ├── ussd.composition.ts
│   │   │   ├── ussd.config.ts
│   │   │   ├── ussd.controller.ts
│   │   │   ├── ussd.dashboard.ts
│   │   │   ├── ussd.middleware-registry.ts
│   │   │   ├── ussd.middleware.ts
│   │   │   ├── ussd.routes.ts
│   │   │   ├── ussd.service.ts
│   │   │   ├── ussd.types.ts
│   │   │   └── ussd.validator.ts
│   │   ├── users/
│   │   │   ├── application/
│   │   │   │   ├── middleware/
│   │   │   │   │   └── validation-middleware.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── logging-service.ts
│   │   │   │   │   └── metrics-service.ts
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── profile-management-use-case.ts
│   │   │   │   │   ├── user-registration-use-case.ts
│   │   │   │   │   └── verification-operations-use-case.ts
│   │   │   │   ├── profile.OLD.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── user-application-service.ts
│   │   │   │   ├── user-service-direct.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── verification.OLD.ts
│   │   │   │   └── verification.ts
│   │   │   ├── domain/
│   │   │   │   ├── aggregates/
│   │   │   │   │   └── user-aggregate.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── citizen-verification.ts
│   │   │   │   │   ├── user-profile.ts
│   │   │   │   │   ├── user.ts
│   │   │   │   │   └── value-objects.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── profile-domain-service.ts
│   │   │   │   │   ├── user-management-domain-service.ts
│   │   │   │   │   ├── user-verification-domain-service.ts
│   │   │   │   │   └── verification-domain-service.ts
│   │   │   │   ├── citizen-verification.ts
│   │   │   │   ├── ExpertVerificationService.ts
│   │   │   │   ├── user-management.ts
│   │   │   │   ├── user-preferences.ts
│   │   │   │   └── user-profile.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── email-service.ts
│   │   │   │   ├── government-data-service.ts
│   │   │   │   ├── notification-service.ts
│   │   │   │   ├── user-storage.d.ts
│   │   │   │   └── user-storage.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   └── MIGRATION_SUMMARY.md
│   │   ├── index.ts
│   │   ├── repository-cleanup.ts
│   │   └── search-suggestions.ts
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── mappings/
│   │   │   │   ├── bill-mapping.ts
│   │   │   │   ├── comment-mapping.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notification-mapping.ts
│   │   │   │   └── user-mapping.ts
│   │   │   └── drizzle-adapter.ts
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── auth-service.ts
│   │   │   │   ├── auth.OLD.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── passwordReset.ts
│   │   │   │   ├── secure-session-service.ts
│   │   │   │   └── session-cleanup.ts
│   │   │   ├── errors/
│   │   │   │   ├── error-tracker.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── validation/
│   │   │   │   ├── data-completeness.ts
│   │   │   │   ├── data-validation-service.ts
│   │   │   │   ├── data-validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input-validation-service.ts
│   │   │   │   ├── schema-validation-service.ts
│   │   │   │   ├── security-schemas.ts
│   │   │   │   ├── validation-metrics.ts
│   │   │   │   ├── validation-services-init.ts
│   │   │   │   └── validation-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── services-init.ts
│   │   │   ├── StorageTypes.d.ts
│   │   │   ├── StorageTypes.ts
│   │   │   └── types.ts
│   │   ├── database/
│   │   │   ├── core/
│   │   │   │   ├── config.ts
│   │   │   │   ├── connection-manager.ts
│   │   │   │   ├── database-orchestrator.ts
│   │   │   │   ├── health-monitor.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── unified-config.ts
│   │   │   ├── graph/
│   │   │   │   ├── config/
│   │   │   │   │   ├── graph-config.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── batch-sync-runner.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── neo4j-client.ts
│   │   │   │   │   ├── schema.ts
│   │   │   │   │   ├── sync-executor.ts
│   │   │   │   │   └── transaction-executor.ts
│   │   │   │   ├── query/
│   │   │   │   │   ├── advanced-queries.ts
│   │   │   │   │   ├── engagement-queries.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── network-queries.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── query-builder.ts
│   │   │   │   │   └── session-manager.ts
│   │   │   │   ├── advanced-analytics.ts
│   │   │   │   ├── advanced-queries.ts
│   │   │   │   ├── advanced-relationships.ts
│   │   │   │   ├── advanced-sync.ts
│   │   │   │   ├── app-init.ts
│   │   │   │   ├── array-field-sync.ts
│   │   │   │   ├── batch-sync-runner.ts
│   │   │   │   ├── cache-adapter-v2.ts
│   │   │   │   ├── conflict-resolver.ts
│   │   │   │   ├── engagement-networks.ts
│   │   │   │   ├── engagement-queries.ts
│   │   │   │   ├── engagement-sync.ts
│   │   │   │   ├── error-adapter-v2.ts
│   │   │   │   ├── error-classifier.ts
│   │   │   │   ├── graph-config.ts
│   │   │   │   ├── graphql-api.ts
│   │   │   │   ├── health-adapter-v2.ts
│   │   │   │   ├── idempotency-ledger.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── influence-service.ts
│   │   │   │   ├── institutional-networks.ts
│   │   │   │   ├── neo4j-client.ts
│   │   │   │   ├── network-discovery.ts
│   │   │   │   ├── network-queries.ts
│   │   │   │   ├── network-sync.ts
│   │   │   │   ├── operation-guard.ts
│   │   │   │   ├── parliamentary-networks.ts
│   │   │   │   ├── pattern-discovery-service.ts
│   │   │   │   ├── pattern-discovery.ts
│   │   │   │   ├── query-builder.ts
│   │   │   │   ├── recommendation-engine.ts
│   │   │   │   ├── REFACTORING_SUMMARY.md
│   │   │   │   ├── relationships.ts
│   │   │   │   ├── result-normalizer.ts
│   │   │   │   ├── retry-utils.ts
│   │   │   │   ├── safeguards-networks.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── session-manager.ts
│   │   │   │   ├── sync-executor.ts
│   │   │   │   ├── sync-monitoring.ts
│   │   │   │   ├── test-harness.ts
│   │   │   │   └── transaction-executor.ts
│   │   │   ├── persistence/
│   │   │   │   ├── drizzle/
│   │   │   │   │   ├── drizzle-bill-repository.ts
│   │   │   │   │   ├── drizzle-sponsor-repository.ts
│   │   │   │   │   ├── drizzle-user-repository.ts
│   │   │   │   │   ├── hybrid-bill-repository.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── lazy-loader.ts
│   │   │   ├── utils/
│   │   │   │   └── base-script.ts
│   │   │   ├── connection.ts
│   │   │   ├── example-usage.ts
│   │   │   ├── index.ts
│   │   │   ├── init.ts
│   │   │   ├── monitoring.ts
│   │   │   └── pool.ts
│   │   ├── errors/
│   │   │   ├── error-adapter.ts
│   │   │   ├── error-configuration.ts
│   │   │   ├── error-standardization.ts
│   │   │   ├── index.ts
│   │   │   ├── migration-example.ts
│   │   │   ├── recovery-patterns.ts
│   │   │   ├── result-adapter.ts
│   │   │   └── result-integration-summary.md
│   │   ├── external-api/
│   │   │   └── error-handler.ts
│   │   ├── external-data/
│   │   │   ├── conflict-resolution-service.ts
│   │   │   ├── data-synchronization-service.ts
│   │   │   ├── external-api-manager.ts
│   │   │   ├── government-data-integration.ts
│   │   │   ├── government-data-service.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── integration/
│   │   │   └── service-orchestrator.ts
│   │   ├── migration/
│   │   │   ├── ab-testing.service.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── deployment-monitoring-dashboard.ts
│   │   │   ├── deployment-orchestrator.ts
│   │   │   ├── deployment.service.ts
│   │   │   ├── error-handling-deployment-summary.md
│   │   │   ├── error-handling-deployment.service.ts
│   │   │   ├── execute-phase1-deployment.ts
│   │   │   ├── feature-flags-service.ts
│   │   │   ├── feature-flags.service.ts
│   │   │   ├── index.ts
│   │   │   ├── migration-api.ts
│   │   │   ├── migration-state.schema.ts
│   │   │   ├── monitoring.service.ts
│   │   │   ├── orchestrator.service.ts
│   │   │   ├── phase1-deployment-orchestrator.ts
│   │   │   ├── repository-deployment-executor.ts
│   │   │   ├── repository-deployment-service.ts
│   │   │   ├── repository-deployment-validator.ts
│   │   │   ├── repository-deployment.service.ts
│   │   │   ├── rollback.service.ts
│   │   │   └── validation.service.ts
│   │   ├── notifications/
│   │   │   ├── alerting-service.ts
│   │   │   ├── email-service.ts
│   │   │   ├── index.ts
│   │   │   ├── notification_integration_guide.md
│   │   │   ├── notification-channels.ts
│   │   │   ├── notification-orchestrator.ts
│   │   │   ├── notification-routes.ts
│   │   │   ├── notification-scheduler.ts
│   │   │   ├── notification-service.ts
│   │   │   ├── notifications.ts
│   │   │   ├── refactored_summary.md
│   │   │   ├── smart-notification-filter.ts
│   │   │   └── types.ts
│   │   ├── observability/
│   │   │   ├── audit-log.ts
│   │   │   ├── database-logger.ts
│   │   │   ├── external-api-management.ts
│   │   │   ├── index.ts
│   │   │   ├── log-aggregator.ts
│   │   │   ├── logging-config.ts
│   │   │   ├── monitoring-scheduler.ts
│   │   │   └── performance-monitor.ts
│   │   ├── performance/
│   │   │   └── performance-monitor.ts
│   │   ├── schema/
│   │   │   ├── domains/
│   │   │   │   ├── citizen-participation.ts
│   │   │   │   ├── constitutional-intelligence.ts
│   │   │   │   ├── foundation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integrity-operations.ts
│   │   │   │   ├── parliamentary-process.ts
│   │   │   │   └── safeguards.ts
│   │   │   ├── accountability_ledger.ts
│   │   │   ├── advanced_discovery.ts
│   │   │   ├── advocacy_coordination.ts
│   │   │   ├── analysis.ts
│   │   │   ├── argument_intelligence.ts
│   │   │   ├── base-types.ts
│   │   │   ├── citizen_participation.ts
│   │   │   ├── constitutional_intelligence.ts
│   │   │   ├── enum-validator.ts
│   │   │   ├── enum.ts
│   │   │   ├── ERROR_FIXES_GUIDE.md
│   │   │   ├── expert_verification.ts
│   │   │   ├── foundation.ts
│   │   │   ├── graph_sync.ts
│   │   │   ├── impact_measurement.ts
│   │   │   ├── index.ts
│   │   │   ├── integration-extended.ts
│   │   │   ├── integration.ts
│   │   │   ├── integrity_operations.ts
│   │   │   ├── market_intelligence.ts
│   │   │   ├── migration-state.ts
│   │   │   ├── parliamentary_process.ts
│   │   │   ├── participation_oversight.ts
│   │   │   ├── platform_operations.ts
│   │   │   ├── political_economy.ts
│   │   │   ├── real_time_engagement.ts
│   │   │   ├── REFINEMENT_SUMMARY.md
│   │   │   ├── safeguards.ts
│   │   │   ├── schema-generators.ts
│   │   │   ├── search_system.ts
│   │   │   ├── sync-triggers.ts
│   │   │   ├── transparency_analysis.ts
│   │   │   ├── transparency_intelligence.ts
│   │   │   ├── trojan_bill_detection.ts
│   │   │   ├── universal_access.ts
│   │   │   ├── validate-static.ts
│   │   │   ├── validation-integration.ts
│   │   │   └── websocket.ts
│   │   ├── security/
│   │   │   ├── data-privacy-service.ts
│   │   │   ├── input-validation-service.ts
│   │   │   └── secure-query-builder.ts
│   │   ├── validation/
│   │   │   └── repository-validation.ts
│   │   ├── websocket/
│   │   │   ├── adapters/
│   │   │   │   ├── index.ts
│   │   │   │   ├── native-websocket-adapter.ts
│   │   │   │   ├── redis-adapter.ts
│   │   │   │   ├── socketio-adapter.ts
│   │   │   │   └── websocket-adapter.ts
│   │   │   ├── batching/
│   │   │   │   ├── batching-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── config/
│   │   │   │   ├── base-config.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── runtime-config.ts
│   │   │   ├── core/
│   │   │   │   ├── connection-manager.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── message-handler.ts
│   │   │   │   ├── operation-queue-manager.ts
│   │   │   │   ├── subscription-manager.ts
│   │   │   │   └── websocket-service.ts
│   │   │   ├── memory/
│   │   │   │   ├── index.ts
│   │   │   │   ├── leak-detector-handler.ts
│   │   │   │   ├── memory-manager.ts
│   │   │   │   └── progressive-degradation.ts
│   │   │   ├── migration/
│   │   │   │   ├── connection-migrator.ts
│   │   │   │   ├── health-validator.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── state-manager.ts
│   │   │   │   ├── traffic-controller.ts
│   │   │   │   └── types.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── health-checker.test.ts
│   │   │   │   ├── health-checker.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── metrics-reporter.test.ts
│   │   │   │   ├── metrics-reporter.ts
│   │   │   │   ├── run-tests.js
│   │   │   │   ├── statistics-collector.test.ts
│   │   │   │   ├── statistics-collector.ts
│   │   │   │   └── TEST_SUMMARY.md
│   │   │   ├── utils/
│   │   │   │   ├── circular-buffer.test.ts
│   │   │   │   ├── circular-buffer.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── lru-cache.test.ts
│   │   │   │   ├── lru-cache.ts
│   │   │   │   ├── priority-queue.test.ts
│   │   │   │   └── priority-queue.ts
│   │   │   ├── api-server.ts
│   │   │   ├── backward-compatibility.test.ts
│   │   │   ├── index.ts
│   │   │   ├── integration-demo.js
│   │   │   ├── README.md
│   │   │   ├── service-validation.js
│   │   │   ├── test-runner.js
│   │   │   ├── tsconfig.json
│   │   │   ├── types.ts
│   │   │   └── VALIDATION_SUMMARY.md
│   │   ├── demo-data.ts
│   │   ├── feature-flags.ts
│   │   ├── index.ts
│   │   └── SERVER_SETUP_GUIDE.ts
│   ├── middleware/
│   │   ├── app-middleware.ts
│   │   ├── auth.ts
│   │   ├── boom-error-middleware.ts
│   │   ├── boom-migration-summary.md
│   │   ├── cache-middleware.ts
│   │   ├── circuit-breaker-middleware.ts
│   │   ├── error-management.ts
│   │   ├── file-upload-validation.ts
│   │   ├── index.ts
│   │   ├── migration-wrapper.ts
│   │   ├── privacy-middleware.ts
│   │   ├── rate-limiter.ts
│   │   ├── safeguards.ts
│   │   ├── server-error-integration.ts
│   │   └── service-availability.ts
│   ├── routes/
│   │   └── regulatory-monitoring.ts
│   ├── scripts/
│   │   ├── api-race-condition-detector.ts
│   │   ├── deploy-repository-migration.ts
│   │   ├── deploy-websocket-migration.ts
│   │   ├── execute-websocket-migration.ts
│   │   ├── final-migration-validation.ts
│   │   ├── fix-return-statements.js
│   │   ├── fix-shared-imports.js
│   │   ├── legacy-websocket-cleanup.ts
│   │   ├── migration-runner.ts
│   │   ├── run-websocket-validation.ts
│   │   ├── simple-websocket-validation.ts
│   │   ├── test-conflict-analysis.ts
│   │   ├── test-government-integration.ts
│   │   ├── test-websocket-migration.ts
│   │   ├── update-schema-imports.ts
│   │   ├── validate-connection-migration.ts
│   │   ├── verify-external-api-management.ts
│   │   └── websocket-performance-validation.ts
│   ├── services/
│   │   ├── api-cost-monitoring.ts
│   │   ├── coverage-analyzer.ts
│   │   ├── external-api-error-handler.ts
│   │   ├── managed-government-data-integration.ts
│   │   ├── README-schema-validation.md
│   │   └── schema-validation-demo.ts
│   ├── storage/
│   │   ├── base.ts
│   │   ├── bill-storage.ts
│   │   ├── index.ts
│   │   ├── README.md
│   │   └── user-storage.ts
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── websocket-backward-compatibility.test.ts
│   │   │   └── websocket-service.test.ts
│   │   ├── unit/
│   │   │   ├── infrastructure/
│   │   │   │   └── websocket/
│   │   │   │       └── connection-manager.test.ts
│   │   │   └── mocks/
│   │   │       └── mock-data.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── test-helpers.ts
│   │   └── setup.ts
│   ├── types/
│   │   ├── controller/
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── service/
│   │   │   └── index.ts
│   │   ├── api.ts
│   │   ├── common.ts
│   │   ├── index.ts
│   │   ├── jest-extensions.d.ts
│   │   └── shared-schema-short.d.ts
│   ├── utils/
│   │   ├── analytics-controller-wrapper.ts
│   │   ├── api-response.ts
│   │   ├── crypto.ts
│   │   ├── db-helpers.ts
│   │   ├── db-init.ts
│   │   ├── errors.ts
│   │   ├── featureFlags.ts
│   │   ├── metrics.ts
│   │   ├── missing-modules-fallback.ts
│   │   ├── request-utils.ts
│   │   ├── shared-core-fallback.ts
│   │   └── validation.ts
│   ├── index.ts
│   ├── MIGRATION_EXAMPLES.ts
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   └── vite.ts
├── shared/
│   ├── constants/
│   │   ├── error-codes.ts
│   │   ├── feature-flags.ts
│   │   ├── index.ts
│   │   └── limits.ts
│   ├── core/
│   │   ├── caching/
│   │   │   ├── adapters/
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── browser-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   └── multi-tier-adapter.ts
│   │   │   ├── clustering/
│   │   │   │   └── cluster-manager.ts
│   │   │   ├── compression/
│   │   │   │   └── cache-compressor.ts
│   │   │   ├── core/
│   │   │   │   ├── base-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   └── key-generator.ts
│   │   │   ├── monitoring/
│   │   │   │   └── metrics-collector.ts
│   │   │   ├── patterns/
│   │   │   │   └── index.ts
│   │   │   ├── serialization/
│   │   │   │   └── cache-serializer.ts
│   │   │   ├── tagging/
│   │   │   │   └── tag-manager.ts
│   │   │   ├── utilities/
│   │   │   │   ├── cache-compressor.ts
│   │   │   │   ├── cache-tag-manager.ts
│   │   │   │   └── cache-warmer.ts
│   │   │   ├── warming/
│   │   │   │   └── cache-warmer.ts
│   │   │   ├── ai-cache.ts
│   │   │   ├── cache-factory.ts
│   │   │   ├── cache-wrappers.ts
│   │   │   ├── cache.ts
│   │   │   ├── caching-service.ts
│   │   │   ├── decorators.ts
│   │   │   ├── factory.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── icaching-service.ts
│   │   │   ├── index.ts
│   │   │   ├── interfaces.ts
│   │   │   ├── key-generator.ts
│   │   │   ├── simple-factory.ts
│   │   │   ├── single-flight-cache.ts
│   │   │   ├── test-basic.ts
│   │   │   ├── test-comprehensive.ts
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── manager.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── utilities.ts
│   │   ├── middleware/
│   │   │   ├── auth/
│   │   │   │   └── provider.ts
│   │   │   ├── cache/
│   │   │   │   └── provider.ts
│   │   │   ├── error-handler/
│   │   │   │   └── provider.ts
│   │   │   ├── rate-limit/
│   │   │   │   └── provider.ts
│   │   │   ├── validation/
│   │   │   │   └── provider.ts
│   │   │   ├── ai-deduplication.ts
│   │   │   ├── ai-middleware.ts
│   │   │   ├── config.ts
│   │   │   ├── factory.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   └── unified.ts
│   │   ├── primitives/
│   │   │   ├── constants/
│   │   │   │   ├── http-status.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── time.ts
│   │   │   ├── types/
│   │   │   │   ├── branded.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── maybe.ts
│   │   │   │   └── result.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── realtime.ts
│   │   │   ├── services.ts
│   │   │   └── validation-types.ts
│   │   ├── utils/
│   │   │   ├── examples/
│   │   │   │   └── concurrency-migration-example.ts
│   │   │   ├── formatting/
│   │   │   │   ├── currency.ts
│   │   │   │   ├── date-time.ts
│   │   │   │   ├── document.ts
│   │   │   │   ├── file-size.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── location.ts
│   │   │   │   └── status.ts
│   │   │   ├── images/
│   │   │   │   └── image-utils.ts
│   │   │   ├── anonymity-interface.ts
│   │   │   ├── anonymity-service.ts
│   │   │   ├── api-utils.ts
│   │   │   ├── async-utils.ts
│   │   │   ├── browser-logger.ts
│   │   │   ├── cache-utils.ts
│   │   │   ├── common-utils.ts
│   │   │   ├── concurrency-adapter.ts
│   │   │   ├── concurrency-migration-router.ts
│   │   │   ├── constants.ts
│   │   │   ├── correlation-id.ts
│   │   │   ├── dashboard-utils.ts
│   │   │   ├── data-utils.ts
│   │   │   ├── http-utils.ts
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
│   │   │   └── type-guards.ts
│   │   ├── cache.ts
│   │   ├── index.ts
│   │   ├── observability.ts
│   │   ├── performance.ts
│   │   └── validation.ts
│   ├── docs/
│   │   ├── database_architecture.md
│   │   ├── GRAPH_DATABASE_IMPLEMENTATION_PHASE2.md
│   │   ├── GRAPH_DATABASE_PHASE2_QUICK_REFERENCE.md
│   │   ├── GRAPH_DATABASE_PHASE3_IMPLEMENTATION.md
│   │   ├── graph_database_strategy.md
│   │   ├── migration_guide.md
│   │   └── PHASE3_README.md
│   ├── i18n/
│   │   ├── en.ts
│   │   ├── index.ts
│   │   └── sw.ts
│   ├── ml/
│   │   ├── models/
│   │   │   ├── conflict-detector.ts
│   │   │   ├── constitutional-analyzer.ts
│   │   │   ├── engagement-predictor.ts
│   │   │   ├── index.ts
│   │   │   ├── influence-mapper.ts
│   │   │   ├── ml_models_readme.md
│   │   │   ├── ml_usage_example.ts
│   │   │   ├── real-time-classifier.ts
│   │   │   ├── sentiment-analyzer.ts
│   │   │   ├── shared_utils.ts
│   │   │   ├── transparency-scorer.ts
│   │   │   └── trojan-bill-detector.ts
│   │   ├── services/
│   │   │   ├── analysis-pipeline.ts
│   │   │   ├── ml-integration.ts
│   │   │   └── ml-orchestrator.ts
│   │   ├── testing/
│   │   │   ├── cli-tester.ts
│   │   │   └── test-server.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── platform/
│   │   ├── kenya/
│   │   │   └── anonymity/
│   │   │       └── anonymity-helper.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── api/
│   │   │   ├── websocket/
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── messages.ts
│   │   │   ├── error-types.ts
│   │   │   ├── factories.ts
│   │   │   ├── index.ts
│   │   │   ├── request-types.ts
│   │   │   ├── response-types.ts
│   │   │   └── serialization.ts
│   │   ├── core/
│   │   │   ├── base.ts
│   │   │   ├── common.ts
│   │   │   ├── errors.example.ts
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   └── validation.ts
│   │   ├── dashboard/
│   │   │   └── index.ts
│   │   ├── domains/
│   │   │   ├── arguments/
│   │   │   │   ├── argument.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── authentication/
│   │   │   │   ├── auth-state.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── user.ts
│   │   │   ├── legislative/
│   │   │   │   ├── actions.ts
│   │   │   │   ├── bill.ts
│   │   │   │   └── index.ts
│   │   │   ├── loading/
│   │   │   │   └── index.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── metrics.ts
│   │   │   │   └── performance.ts
│   │   │   ├── redux/
│   │   │   │   ├── index.ts
│   │   │   │   ├── slice-state.ts
│   │   │   │   ├── thunk-result.ts
│   │   │   │   └── validation.ts
│   │   │   └── safeguards/
│   │   │       ├── index.ts
│   │   │       └── moderation.ts
│   │   ├── migration/
│   │   │   ├── breaking-changes.ts
│   │   │   ├── deprecation-warnings.ts
│   │   │   ├── index.ts
│   │   │   ├── migration-config.ts
│   │   │   ├── migration-helpers.ts
│   │   │   ├── migration-tools.ts
│   │   │   ├── replacement-patterns.ts
│   │   │   ├── type-transformers.ts
│   │   │   └── validation-migrator.ts
│   │   ├── performance/
│   │   │   ├── bundle-analysis.ts
│   │   │   ├── compilation-performance.ts
│   │   │   ├── index.ts
│   │   │   ├── tree-shakeable.ts
│   │   │   └── validation-caching.ts
│   │   ├── testing/
│   │   │   ├── examples/
│   │   │   │   ├── comprehensive.example.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── runtime-validation.example.ts
│   │   │   │   └── type-level.example.ts
│   │   │   ├── integration/
│   │   │   │   ├── backward-compatibility-test.ts
│   │   │   │   ├── comprehensive-integration-test.ts
│   │   │   │   ├── comprehensive-type-tests.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-test-runner.ts
│   │   │   │   └── validation-middleware-tests.ts
│   │   │   ├── automated-validation.ts
│   │   │   ├── index.ts
│   │   │   ├── integration.ts
│   │   │   ├── runtime-validation.ts
│   │   │   └── type-level.ts
│   │   ├── tooling/
│   │   │   ├── documentation.ts
│   │   │   ├── eslint-config.ts
│   │   │   ├── index.ts
│   │   │   ├── type-generation.ts
│   │   │   └── validation-schemas.ts
│   │   ├── index.ts
│   │   └── performance.ts
│   ├── utils/
│   │   └── intelligent-cache.ts
│   ├── validation/
│   │   ├── bill.validation.ts
│   │   ├── comment.validation.ts
│   │   ├── index.ts
│   │   └── user.validation.ts
│   ├── fix-unused.ts
│   ├── index.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── project.json
│   ├── temp-schema-tsconfig.tsbuildinfo
│   └── tsconfig.json
├── tests/
│   ├── e2e/
│   │   └── test-results/
│   │       ├── simple/
│   │       └── simple-results.json
│   ├── factories/
│   │   └── README.md
│   ├── mocks/
│   │   ├── performance.mock.ts
│   │   └── redis.mock.ts
│   ├── setup/
│   │   ├── modules/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── shared.ts
│   │   ├── index.ts
│   │   ├── test-environment.ts
│   │   └── vitest.ts
│   ├── test-results/
│   │   ├── results.json
│   │   └── results.xml
│   ├── utilities/
│   │   ├── client/
│   │   │   ├── comprehensive-test-config.ts
│   │   │   ├── comprehensive-test-setup.tsx
│   │   │   ├── index.ts
│   │   │   ├── navigation-helpers.tsx
│   │   │   ├── setup-a11y.ts
│   │   │   ├── setup-integration.ts
│   │   │   ├── setup-performance.ts
│   │   │   └── setup.ts
│   │   ├── fixtures/
│   │   │   └── index.ts
│   │   ├── mocks/
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── form/
│   │   │   │   ├── base-form-testing.ts
│   │   │   │   ├── form-testing-utils.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── testing-library-form-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── integration-tests.ts
│   │   │   ├── load-tester.ts
│   │   │   ├── schema-agnostic-test-helper.ts
│   │   │   ├── stress-tests.ts
│   │   │   └── test-data-factory.ts
│   │   └── index.ts
│   ├── utils/
│   │   └── test-helpers.ts
│   ├── validation/
│   │   ├── index.ts
│   │   ├── README.md
│   │   ├── test-environment-helpers.ts
│   │   └── validators.ts
│   ├── cross-layer-integration.test.ts
│   ├── end-to-end-workflows.test.ts
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── performance-regression.test.ts
│   ├── playwright.config.ts
│   └── README.md
├── tools/
│   ├── codebase-health/
│   │   ├── src/
│   │   │   ├── analysis/
│   │   │   │   └── AnalysisEngine.ts
│   │   │   ├── classification/
│   │   │   │   └── IssueClassifier.ts
│   │   │   ├── models/
│   │   │   │   ├── CodeIssue.ts
│   │   │   │   └── FixResult.ts
│   │   │   ├── utils/
│   │   │   │   ├── ASTUtils.ts
│   │   │   │   └── FileUtils.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── analysis/
│   │   │   │   └── AnalysisEngine.test.ts
│   │   │   ├── classification/
│   │   │   │   └── IssueClassifier.test.ts
│   │   │   ├── fixtures/
│   │   │   │   ├── ast/
│   │   │   │   │   ├── export-test.ts
│   │   │   │   │   ├── import-test.ts
│   │   │   │   │   ├── test.js
│   │   │   │   │   ├── test.ts
│   │   │   │   │   └── test.tsx
│   │   │   │   ├── circular-dep-b.ts
│   │   │   │   ├── import-issues.ts
│   │   │   │   └── sample-issues.ts
│   │   │   ├── models/
│   │   │   │   └── CodeIssue.test.ts
│   │   │   ├── test-data/
│   │   │   │   ├── circular-import-file.ts
│   │   │   │   ├── correct-file.ts
│   │   │   │   └── sample-with-issues.ts
│   │   │   ├── utils/
│   │   │   │   └── ASTUtils.test.ts
│   │   │   └── setup.ts
│   │   ├── cspell.json
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── README.md
│   │   ├── tsconfig.build.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── analyze-orphans-metadata.cjs
│   ├── calculate-loc.cjs
│   ├── evaluate-orphans.cjs
│   ├── find-orphans.cjs
│   ├── find-orphans.js
│   ├── gather-metadata.cjs
│   ├── INTEGRATION_ROADMAP.csv
│   ├── ORPHAN_VALUE_ANALYSIS.md
│   ├── orphan-evaluation-report.md
│   ├── orphan-report.json
│   ├── orphans-evaluation.json
│   ├── orphans-metadata.csv
│   ├── orphans-metadata.json
│   ├── TIER_1_INTEGRATION_STATUS.md
│   └── top-orphans-loc.json
├── ARCHITECTURE.md
├── archive-docs.sh
├── CHANGELOG.md
├── clear-sw.html
├── community_errors_after.txt
├── community_errors_final.txt
├── community_errors_v2.txt
├── community_errors.txt
├── COMPLETION_STRATEGY.ts
├── CONTRIBUTING.md
├── cspell.config.yaml
├── docker-compose.neo4j.yml
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.client
├── drizzle.config.ts
├── ERROR_EXTRACTION_SUMMARY.txt
├── errors-comprehensive.json
├── errors.json
├── expert_profile_errors.txt
├── final_tsc_check.txt
├── full_tsc_errors.txt
├── generate-structure.mjs
├── knip.config.ts
├── knip.json
├── nginx.conf
├── nx.json
├── package.json
├── performance-baselines.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── QUICK_START_FOR_NEXT_SESSION.ts
├── QUICK_STATS.txt
├── README.md
├── REFACTORING_SUMMARY.txt
├── run_codebase_stats.bat
├── SESSION_2_COMPLETION_SUMMARY.ts
├── start-dev.js
├── tailwind.config.js
├── test_api_integration.js
├── tsc_output.txt
├── tsc_remaining.txt
├── tsc_search.txt
├── tsconfig.json
├── tsconfig.server.json
├── tsconfig.server.tsbuildinfo
├── tsconfig.tsbuildinfo
├── type-errors.txt
├── verify-graph-implementation.sh
├── vitest.setup.ts
└── vitest.workspace.ts
```

## Configuration

### Excluded Patterns

The following are automatically excluded:

- `node_modules`
- `dist`
- `build`
- `.git`
- `coverage`
- `.next`
- `out`
- `__tests__`
- `vendor`
- `backup`
- `__pycache__`
- `target`
- `.venv`
- `venv`
- `tmp`
- `temp`
- `.cache`
- Hidden files and directories (starting with `.`)

### Settings

- **Root Directory:** `SimpleTool/`
- **Maximum Depth:** 7 levels
- **Output File:** `docs/project-structure.md`

---

*Generated automatically by Project Structure Generator*