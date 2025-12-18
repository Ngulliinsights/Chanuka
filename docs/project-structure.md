# Project Structure

Maximum depth: 7 levels

```
.
CHANGELOG.md
clear-sw.html
client/
├── index.html
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
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── icon-144x144.png
│   ├── logo-192.png
│   ├── manifest.json
│   ├── manifest.webmanifest
│   ├── offline.html
│   ├── sw.js
│   ├── symbol.svg
├── reports/
│   ├── design-system-audit-report.json
│   ├── design-system-audit-report.md
│   ├── radix-analysis/
│   │   ├── radix-bundle-analysis.json
├── run-triage.js
├── src/
│   ├── __tests__/
│   │   ├── race-conditions.test.ts
│   ├── app/
│   ├── App.tsx
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx
│   │   ├── shell/
│   │   │   ├── AppRouter.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── index.ts
│   │   │   ├── NavigationBar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SkipLinks.tsx
│   ├── components/
│   │   ├── AppProviders.tsx
│   │   ├── hooks/
│   │   │   ├── useDatabaseStatus.ts
│   │   ├── index.ts
│   │   ├── integration/
│   │   ├── LazyPageWrapper.tsx
│   │   ├── MigrationManager.tsx
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── shared/
│   │   │   ├── dashboard/
│   │   │   │   ├── index.ts
│   │   │   │   ├── sections/
│   │   │   │   ├── variants/
│   │   │   ├── index.ts
│   │   │   ├── privacy/
│   │   │   │   ├── controls/
│   │   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── index.ts
│   │   ├── transparency/
│   ├── config/
│   │   ├── api.ts
│   │   ├── development.ts
│   │   ├── feature-flags.ts
│   │   ├── gestures.ts
│   │   ├── index.ts
│   │   ├── integration.ts
│   │   ├── mobile.ts
│   │   ├── navigation.ts
│   │   ├── onboarding.ts
│   ├── constants/
│   │   ├── index.ts
│   ├── content/
│   │   ├── copy-system.ts
│   ├── context/
│   │   ├── index.ts
│   ├── contexts/
│   │   ├── NavigationContext.tsx
│   │   ├── ThemeContext.tsx
│   ├── core/
│   │   ├── api/
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── authenticated-client.ts
│   │   │   ├── authentication.ts
│   │   │   ├── base-client.ts
│   │   │   ├── bills.ts
│   │   │   ├── cache-manager.ts
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
│   │   │   │   ├── useConnectionAware.tsx
│   │   │   │   ├── use-safe-mutation.ts
│   │   │   │   ├── use-safe-query.ts
│   │   │   │   ├── useServiceStatus.ts
│   │   │   ├── index.ts
│   │   │   ├── interceptors.ts
│   │   │   ├── notifications.ts
│   │   │   ├── performance.ts
│   │   │   ├── privacy.ts
│   │   │   ├── registry.ts
│   │   │   ├── retry.ts
│   │   │   ├── retry-handler.ts
│   │   │   ├── safe-client.ts
│   │   │   ├── search.ts
│   │   │   ├── system.ts
│   │   │   ├── types/
│   │   │   ├── types.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── bill.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── engagement.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── preferences.ts
│   │   │   │   ├── request.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── sponsor.ts
│   │   │   │   ├── websocket.ts
│   │   │   ├── user.ts
│   │   │   ├── websocket.ts
│   │   │   ├── WEBSOCKET_API_README.md
│   │   │   ├── websocket-example.ts
│   │   ├── auth/
│   │   │   ├── config/
│   │   │   │   ├── auth-config.ts
│   │   │   │   ├── auth-init.ts
│   │   │   ├── constants/
│   │   │   │   ├── auth-constants.ts
│   │   │   ├── errors/
│   │   │   │   ├── auth-errors.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.tsx
│   │   │   ├── http/
│   │   │   │   ├── authenticated-client.ts
│   │   │   │   ├── authentication-interceptors.ts
│   │   │   ├── index.ts
│   │   │   ├── initialization.ts
│   │   │   ├── README.md
│   │   │   ├── scripts/
│   │   │   │   ├── cleanup-old-auth.ts
│   │   │   │   ├── init-auth-system.ts
│   │   │   │   ├── migration-helper.ts
│   │   │   ├── service.ts
│   │   │   ├── services/
│   │   │   │   ├── auth-api-service.ts
│   │   │   │   ├── session-manager.ts
│   │   │   │   ├── token-manager.ts
│   │   │   ├── store/
│   │   │   │   ├── auth-middleware.ts
│   │   │   │   ├── auth-slice.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── index.ts
│   │   │   │   ├── permission-helpers.ts
│   │   │   │   ├── security-helpers.ts
│   │   │   │   ├── storage-helpers.ts
│   │   │   │   ├── validation.ts
│   │   ├── browser/
│   │   │   ├── BrowserCompatibilityChecker.tsx
│   │   │   ├── BrowserCompatibilityReport.tsx
│   │   │   ├── BrowserCompatibilityTester.tsx
│   │   │   ├── browser-detector.ts
│   │   │   ├── compatibility-manager.ts
│   │   │   ├── constants.ts
│   │   │   ├── environment.ts
│   │   │   ├── feature-detector.ts
│   │   │   ├── FeatureFallbacks.tsx
│   │   │   ├── index.ts
│   │   │   ├── polyfill-manager.ts
│   │   │   ├── types.ts
│   │   │   ├── useBrowserStatus.tsx
│   │   ├── community/
│   │   │   ├── hooks/
│   │   │   │   ├── useRealtime.ts
│   │   │   │   ├── useUnifiedCommunity.ts
│   │   │   │   ├── useUnifiedDiscussion.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── moderation.service.ts
│   │   │   │   ├── state-sync.service.ts
│   │   │   │   ├── websocket-manager.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   ├── CONSOLIDATION_SUMMARY.md
│   │   ├── dashboard/
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── reducer.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   ├── widgets.ts
│   │   ├── error/
│   │   │   ├── analytics.ts
│   │   │   ├── classes.ts
│   │   │   ├── components/
│   │   │   │   ├── CommunityErrorBoundary.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── ErrorFallback.tsx
│   │   │   │   ├── ErrorRecoveryManager.tsx
│   │   │   │   ├── example.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── RecoveryUI.tsx
│   │   │   │   ├── ServiceUnavailable.tsx
│   │   │   │   ├── SimpleErrorBoundary.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── UnifiedErrorBoundary.tsx
│   │   │   │   ├── utils/
│   │   │   │   │   ├── contextual-messages.ts
│   │   │   │   │   ├── error-icons.tsx
│   │   │   │   │   ├── error-normalizer.ts
│   │   │   │   │   ├── error-reporter.ts
│   │   │   │   │   ├── shared-error-display.tsx
│   │   │   ├── constants.ts
│   │   │   ├── factory.ts
│   │   │   ├── handler.ts
│   │   │   ├── index.ts
│   │   │   ├── monitoring.tsx
│   │   │   ├── rate-limiter.ts
│   │   │   ├── recovery.ts
│   │   │   ├── reporters/
│   │   │   │   ├── ApiReporter.ts
│   │   │   │   ├── CompositeReporter.ts
│   │   │   │   ├── ConsoleReporter.ts
│   │   │   │   ├── SentryReporter.ts
│   │   │   ├── reporting.ts
│   │   │   ├── types.ts
│   │   ├── hooks/
│   │   │   ├── index.ts
│   │   ├── index.ts
│   │   ├── loading/
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
│   │   │   │   ├── index.ts
│   │   │   │   ├── useOnlineStatus.ts
│   │   │   │   ├── useTimeoutAwareLoading.ts
│   │   │   ├── index.ts
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
│   │   ├── MIGRATION_GUIDE.md
│   │   ├── mobile/
│   │   │   ├── device-detector.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── index.ts
│   │   │   ├── performance-optimizer.ts
│   │   │   ├── responsive-utils.ts
│   │   │   ├── touch-handler.ts
│   │   │   ├── types.ts
│   │   ├── navigation/
│   │   │   ├── access-control.ts
│   │   │   ├── analytics.ts
│   │   │   ├── breadcrumbs.ts
│   │   │   ├── context.tsx
│   │   │   ├── hooks/
│   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-navigation-accessibility.ts
│   │   │   │   ├── use-navigation-performance.ts
│   │   │   │   ├── use-navigation-preferences.tsx
│   │   │   │   ├── use-unified-navigation.ts
│   │   │   ├── index.ts
│   │   │   ├── lookup.ts
│   │   │   ├── persistence.ts
│   │   │   ├── preferences.ts
│   │   │   ├── search.ts
│   │   │   ├── test-navigation.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   ├── validation.ts
│   │   ├── performance/
│   │   │   ├── alerts.ts
│   │   │   ├── budgets.ts
│   │   │   ├── index.ts
│   │   │   ├── monitor.ts
│   │   │   ├── types.ts
│   │   │   ├── web-vitals.ts
│   │   ├── realtime/
│   │   │   ├── config.ts
│   │   │   ├── hooks/
│   │   │   │   ├── use-bill-tracking.ts
│   │   │   │   ├── use-community-realtime.ts
│   │   │   │   ├── use-realtime-engagement-legacy.ts
│   │   │   │   ├── use-websocket.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── services/
│   │   │   │   ├── bill-tracking.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── realtime-service.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── event-emitter.ts
│   │   │   ├── websocket/
│   │   │   │   ├── manager.ts
│   │   ├── storage/
│   │   │   ├── cache-storage.ts
│   │   │   ├── index.ts
│   │   │   ├── secure-storage.ts
│   │   │   ├── types.ts
│   │   ├── test-consolidated-realtime.ts
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
│   ├── emergency-styles.css
│   ├── examples/
│   │   ├── render-tracking-usage.tsx
│   │   ├── WebSocketIntegrationExample.tsx
│   ├── features/
│   │   ├── admin/
│   │   │   ├── index.ts
│   │   │   ├── ui/
│   │   │   │   ├── admin-dashboard.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   ├── index.ts
│   │   ├── analysis/
│   │   │   ├── index.ts
│   │   │   ├── model/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useConflictAnalysis.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── conflict-detection.ts
│   │   │   │   │   ├── index.ts
│   │   │   ├── ui/
│   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   ├── index.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── AnalysisDashboard.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   ├── index.ts
│   │   ├── analytics/
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   ├── useErrorAnalytics.ts
│   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   ├── use-render-tracker.ts
│   │   │   │   ├── use-web-vitals.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── analysis.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   │   ├── EngagementAnalyticsDashboard.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── metrics/
│   │   │   │   │   ├── CivicScoreCard.tsx
│   │   ├── bills/
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   ├── index.ts
│   │   │   ├── model/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useBills.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── types.ts
│   │   │   ├── services/
│   │   │   │   ├── cache.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── tracking.ts
│   │   │   ├── ui/
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── BillAnalysis.tsx
│   │   │   │   │   ├── BillAnalysisTab.tsx
│   │   │   │   │   ├── comments.tsx
│   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   ├── ConflictNetworkVisualization.tsx
│   │   │   │   │   │   ├── ConflictOfInterestAnalysis.tsx
│   │   │   │   │   │   ├── FinancialExposureTracker.tsx
│   │   │   │   │   │   ├── HistoricalPatternAnalysis.tsx
│   │   │   │   │   │   ├── ImplementationWorkaroundsTracker.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── TransparencyScoring.tsx
│   │   │   │   │   ├── ConstitutionalAnalysisPanel.tsx
│   │   │   │   │   ├── section.tsx
│   │   │   │   │   ├── stats.tsx
│   │   │   │   │   ├── timeline.tsx
│   │   │   │   ├── BillCard.tsx
│   │   │   │   ├── bill-list.tsx
│   │   │   │   ├── BillList.tsx
│   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   ├── bill-tracking.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   ├── detail/
│   │   │   │   │   ├── BillCommunityTab.tsx
│   │   │   │   │   ├── BillFullTextTab.tsx
│   │   │   │   │   ├── BillHeader.tsx
│   │   │   │   │   ├── BillOverviewTab.tsx
│   │   │   │   │   ├── BillSponsorsTab.tsx
│   │   │   │   ├── education/
│   │   │   │   │   ├── README.md
│   │   │   │   ├── filter-panel.tsx
│   │   │   │   ├── implementation/
│   │   │   │   │   ├── workarounds.tsx
│   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── list/
│   │   │   │   │   ├── BillCard.tsx
│   │   │   │   ├── MobileBillDetail.tsx
│   │   │   │   ├── stats-overview.tsx
│   │   │   │   ├── tracking/
│   │   │   │   │   ├── real-time-tracker.tsx
│   │   │   │   ├── transparency/
│   │   │   │   │   ├── ConflictAnalysisDashboard.tsx
│   │   │   │   ├── virtual-bill-grid.tsx
│   │   ├── community/
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useCommunity.ts
│   │   │   │   ├── useCommunityIntegration.ts
│   │   │   │   ├── useDiscussion.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── backend.ts
│   │   │   │   ├── index.ts
│   │   │   ├── ui/
│   │   │   │   ├── activity/
│   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   ├── CommunityStats.tsx
│   │   │   │   ├── discussion/
│   │   │   │   │   ├── CommentForm.tsx
│   │   │   │   │   ├── CommentItem.tsx
│   │   │   │   │   ├── DiscussionThread.tsx
│   │   │   │   ├── expert/
│   │   │   │   │   ├── ExpertInsights.tsx
│   │   │   │   ├── hub/
│   │   │   │   │   ├── CommunityHub.tsx
│   │   │   │   ├── index.ts
│   │   ├── index.ts
│   │   ├── pretext-detection/
│   │   │   ├── demo.md
│   │   │   ├── hooks/
│   │   │   │   ├── usePretextAnalysis.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── services/
│   │   │   │   ├── PretextAnalysisService.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── CivicActionToolbox.tsx
│   │   │   │   ├── PretextDetectionPanel.tsx
│   │   │   │   ├── PretextWatchCard.tsx
│   │   ├── search/
│   │   │   ├── hooks/
│   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useStreamingSearch.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── intelligent-search.ts
│   │   │   │   ├── search-api.ts
│   │   │   │   ├── streaming-search.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── filters/
│   │   │   │   │   ├── SearchFilters.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── interface/
│   │   │   │   │   ├── AdvancedSearch.tsx
│   │   │   │   │   ├── IntelligentAutocomplete.tsx
│   │   │   │   │   ├── SavedSearches.tsx
│   │   │   │   │   ├── SearchAnalyticsDashboard.tsx
│   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   ├── SearchProgressIndicator.tsx
│   │   │   │   │   ├── SearchTips.tsx
│   │   │   │   ├── results/
│   │   │   │   │   ├── SearchResultCard.tsx
│   │   │   │   │   ├── SearchResults.tsx
│   │   ├── security/
│   │   │   ├── hooks/
│   │   │   │   ├── useSecurity.ts
│   │   │   ├── index.ts
│   │   │   ├── ui/
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   ├── SecuritySettings.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── privacy/
│   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   ├── README.md
│   │   ├── users/
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useAuth.tsx
│   │   │   │   ├── useOnboarding.ts
│   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   ├── useUserAPI.ts
│   │   │   │   ├── useUsers.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── onboarding-service.ts
│   │   │   │   ├── user-api.ts
│   │   │   ├── types.ts
│   │   │   ├── ui/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── AuthAlert.tsx
│   │   │   │   │   ├── AuthButton.tsx
│   │   │   │   │   ├── AuthInput.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useLoginForm.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── UserJourneyOptimizer.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   ├── UserProfileSection.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── alert-preferences.tsx
│   │   │   │   ├── verification/
│   │   │   │   │   ├── CommunityValidation.tsx
│   │   │   │   │   ├── CredibilityScoring.tsx
│   │   │   │   │   ├── ExpertBadge.tsx
│   │   │   │   │   ├── ExpertConsensus.tsx
│   │   │   │   │   ├── ExpertProfileCard.tsx
│   │   │   │   │   ├── ExpertVerificationDemo.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── verification-list.tsx
│   │   │   │   │   ├── VerificationWorkflow.tsx
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── mobile/
│   │   │   ├── index.ts
│   │   │   ├── useBottomSheet.ts
│   │   │   ├── useDeviceInfo.ts
│   │   │   ├── useInfiniteScroll.ts
│   │   │   ├── useMobileNavigation.ts
│   │   │   ├── useMobileTabs.ts
│   │   │   ├── usePullToRefresh.ts
│   │   │   ├── useScrollManager.ts
│   │   │   ├── useSwipeGesture.ts
│   │   ├── useCleanup.tsx
│   │   ├── useDebounce.ts
│   │   ├── useErrorRecovery.ts
│   │   ├── useIntegratedServices.ts
│   │   ├── use-keyboard-focus.ts
│   │   ├── useMediaQuery.ts
│   │   ├── use-mobile.tsx
│   │   ├── useNotifications.ts
│   │   ├── useOfflineCapabilities.ts
│   │   ├── useOfflineDetection.tsx
│   │   ├── use-performance-monitor.ts
│   │   ├── useProgressiveDisclosure.ts
│   │   ├── useSafeEffect.ts
│   │   ├── use-safe-query.ts
│   │   ├── useSeamlessIntegration.ts
│   │   ├── use-system.tsx
│   │   ├── use-toast.ts
│   ├── index.css
│   ├── lib/
│   │   ├── form-builder.tsx
│   │   ├── index.ts
│   │   ├── protected-route.tsx
│   │   ├── queryClient.ts
│   │   ├── react-query-config.ts
│   │   ├── utils.ts
│   │   ├── validation-schemas.test.ts
│   │   ├── validation-schemas.ts
│   ├── main.tsx
│   ├── monitoring/
│   │   ├── error-monitoring.ts
│   │   ├── index.ts
│   │   ├── performance-monitoring.ts
│   │   ├── sentry-config.ts
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── admin.tsx
│   │   ├── analytics-dashboard.tsx
│   │   ├── auth/
│   │   │   ├── auth-page.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PrivacyPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── SecurityPage.tsx
│   │   ├── bills/
│   │   │   ├── bill-analysis.tsx
│   │   │   ├── bill-detail.tsx
│   │   │   ├── bills-dashboard-page.tsx
│   │   │   ├── bill-sponsorship-analysis.tsx
│   │   ├── civic-education.tsx
│   │   ├── comments.tsx
│   │   ├── community-input.tsx
│   │   ├── dashboard.tsx
│   │   ├── database-manager.tsx
│   │   ├── design-system-test.tsx
│   │   ├── expert-verification.tsx
│   │   ├── home.tsx
│   │   ├── integration-status.tsx
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
│   │   ├── performance-dashboard.tsx
│   │   ├── privacy-center.tsx
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
│   │   ├── consolidate-websocket-migration.ts
│   │   ├── fsd-migration.ts
│   │   ├── migrate-components.ts
│   │   ├── performance-audit.ts
│   │   ├── README.md
│   │   ├── run-emergency-triage.ts
│   │   ├── validate-migration.ts
│   │   ├── validate-websocket-consolidation.ts
│   ├── security/
│   │   ├── config/
│   │   │   ├── security-config.ts
│   │   ├── csp-manager.ts
│   │   ├── csp-nonce.ts
│   │   ├── csrf-protection.ts
│   │   ├── headers/
│   │   │   ├── SecurityHeaders.ts
│   │   ├── index.ts
│   │   ├── input-sanitizer.ts
│   │   ├── rate-limiter.ts
│   │   ├── security-monitor.ts
│   │   ├── security-service.ts
│   │   ├── types/
│   │   ├── types.ts
│   │   │   ├── security-types.ts
│   │   ├── vulnerability-scanner.ts
│   ├── services/
│   │   ├── auth-service-init.ts
│   │   ├── dataRetentionService.ts
│   │   ├── errorAnalyticsBridge.ts
│   │   ├── index.ts
│   │   ├── mockUserData.ts
│   │   ├── navigation.ts
│   │   ├── notification-service.ts
│   │   ├── notification-system-integration-summary.md
│   │   ├── PageRelationshipService.ts
│   │   ├── privacyAnalyticsService.ts
│   │   ├── realistic-demo-data.ts
│   │   ├── UserJourneyTracker.ts
│   │   ├── userService.ts
│   ├── shared/
│   │   ├── design-system/
│   │   │   ├── 4-personas-charter.ts.txt
│   │   │   ├── 4-personas-implementation-guide.ts
│   │   │   ├── accessibility/
│   │   │   │   ├── contrast.ts
│   │   │   │   ├── focus.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── motion.ts
│   │   │   │   ├── touch.ts
│   │   │   │   ├── typography.ts
│   │   │   ├── COMPLETION_REPORT.ts
│   │   │   ├── COMPONENT_FLATTENING_EXECUTION_REPORT.ts
│   │   │   ├── COMPONENT_FLATTENING_STRATEGY.ts
│   │   │   ├── contexts/
│   │   │   │   ├── BrandVoiceProvider.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── LowBandwidthProvider.tsx
│   │   │   │   ├── MultilingualProvider.tsx
│   │   │   ├── DIRECTORY_VALIDATION_FRAMEWORK.ts
│   │   │   ├── feedback/
│   │   │   │   ├── Alert.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── Progress.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Toaster.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   ├── IMPLEMENTATION_GUIDE.ts
│   │   │   ├── index.ts
│   │   │   ├── integration.ts
│   │   │   ├── INTEGRATION_COMPLETE.md
│   │   │   ├── interactive/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Calendar.tsx
│   │   │   │   ├── Checkbox.tsx
│   │   │   │   ├── Collapsible.tsx
│   │   │   │   ├── Command.tsx
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   ├── Dialog.tsx
│   │   │   │   ├── DropdownMenu.tsx
│   │   │   │   ├── errors.ts
│   │   │   │   ├── form.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── NavigationMenu.tsx
│   │   │   │   ├── Popover.tsx
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── Sheet.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── Switch.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Textarea.tsx
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── validation.ts
│   │   │   ├── lib/
│   │   │   │   ├── utils.ts
│   │   │   ├── media/
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── Logo.tsx
│   │   │   │   ├── OptimizedImage.tsx
│   │   │   ├── MIGRATION_SUMMARY.ts
│   │   │   ├── quality.ts
│   │   │   ├── QUICK_START.md
│   │   │   ├── README.md
│   │   │   ├── REFINEMENT_STRATEGY.ts
│   │   │   ├── responsive.css
│   │   │   ├── responsive.ts
│   │   │   ├── standards/
│   │   │   │   ├── brand-personality.ts
│   │   │   │   ├── button.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── empty-states.ts
│   │   │   │   ├── error-states.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input.ts
│   │   │   │   ├── interactive-states.ts
│   │   │   │   ├── loading-states.ts
│   │   │   │   ├── low-bandwidth.ts
│   │   │   │   ├── multilingual-support.ts
│   │   │   │   ├── political-neutrality.ts
│   │   │   │   ├── typography.ts
│   │   │   ├── strategy.ts
│   │   │   ├── styles/
│   │   │   │   ├── accessibility.css
│   │   │   │   ├── base/
│   │   │   │   │   ├── base.css
│   │   │   │   │   ├── variables.css
│   │   │   │   ├── chanuka-design-system.css
│   │   │   │   ├── design-tokens.css
│   │   │   │   ├── fallbacks.css
│   │   │   │   ├── fix-build-errors.css
│   │   │   │   ├── generated-tokens.css
│   │   │   │   ├── globals.css
│   │   │   │   ├── index.ts
│   │   │   │   ├── responsive/
│   │   │   │   │   ├── desktop.css
│   │   │   │   │   ├── mobile.css
│   │   │   │   │   ├── special.css
│   │   │   │   │   ├── tablet.css
│   │   │   │   ├── STYLE_GUIDE.md
│   │   │   │   ├── themes/
│   │   │   │   ├── utilities/
│   │   │   │   │   ├── accessibility.css
│   │   │   │   │   ├── animations.css
│   │   │   ├── themes/
│   │   │   │   ├── dark.ts
│   │   │   │   ├── high-contrast.ts
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
│   │   │   │   ├── theme.ts
│   │   │   │   ├── typography.ts
│   │   │   │   ├── unified.ts
│   │   │   │   ├── unified-export.ts
│   │   │   │   ├── validation.ts
│   │   │   ├── types/
│   │   │   │   ├── component-types.ts
│   │   │   ├── typography/
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── heading.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── Label.tsx
│   │   │   │   ├── text.tsx
│   │   │   ├── utils/
│   │   │   │   ├── cn.ts
│   │   │   │   ├── contrast.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── responsive.ts
│   │   │   │   ├── validation.ts
│   │   ├── hooks/
│   │   │   ├── index.ts
│   │   │   ├── mobile/
│   │   │   │   ├── index.ts
│   │   │   ├── use-i18n.tsx
│   │   │   ├── useMockData.ts
│   │   │   ├── useService.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── asset-loading/
│   │   │   │   ├── AssetLoadingProvider.tsx
│   │   │   ├── compatibility/
│   │   │   ├── data-retention.ts
│   │   │   ├── index.ts
│   │   │   ├── integration-validator.ts
│   │   │   ├── quality-optimizer.ts
│   │   │   ├── system/
│   │   │   │   ├── HealthCheck.tsx
│   │   ├── interfaces/
│   │   │   ├── index.ts
│   │   │   ├── unified-interfaces.ts
│   │   ├── lib/
│   │   │   ├── form-builder.tsx
│   │   │   ├── index.ts
│   │   │   ├── protected-route.tsx
│   │   │   ├── queryClient.ts
│   │   │   ├── react-query-config.ts
│   │   │   ├── utils.ts
│   │   │   ├── validation-schemas.ts
│   │   ├── services/
│   │   │   ├── data-retention.ts
│   │   │   ├── index.ts
│   │   │   ├── navigation.ts
│   │   ├── testing/
│   │   │   ├── index.ts
│   │   │   ├── mock-data.ts
│   │   │   ├── mock-users.ts
│   │   ├── types/
│   │   │   ├── analytics.ts
│   │   │   ├── index.ts
│   │   │   ├── search.ts
│   │   ├── ui/
│   │   │   ├── accessibility/
│   │   │   │   ├── accessibility-manager.tsx
│   │   │   ├── connection-status.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── action-items.tsx
│   │   │   │   ├── activity-summary.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── DashboardStats.tsx
│   │   │   │   │   ├── TimeFilterSelector.tsx
│   │   │   │   │   ├── WelcomeMessage.tsx
│   │   │   │   ├── DashboardFramework.tsx
│   │   │   │   ├── errors.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useDashboard.ts
│   │   │   │   │   ├── useDashboardActions.ts
│   │   │   │   │   ├── useDashboardConfig.ts
│   │   │   │   │   ├── useDashboardLayout.ts
│   │   │   │   │   ├── useDashboardTopics.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── layout/
│   │   │   │   │   ├── DashboardContent.tsx
│   │   │   │   │   ├── DashboardFooter.tsx
│   │   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   │   ├── DashboardSidebar.tsx
│   │   │   │   ├── modals/
│   │   │   │   │   ├── DashboardPreferencesModal.tsx
│   │   │   │   │   ├── DataExportModal.tsx
│   │   │   │   ├── MonitoringDashboard.tsx
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── sections/
│   │   │   │   │   ├── ActivitySection.tsx
│   │   │   │   │   ├── BillsSection.tsx
│   │   │   │   │   ├── CivicMetricsSection.tsx
│   │   │   │   │   ├── EngagementHistorySection.tsx
│   │   │   │   │   ├── MigrationDashboard.tsx
│   │   │   │   │   ├── RecommendationsSection.tsx
│   │   │   │   │   ├── StatsSection.tsx
│   │   │   │   │   ├── TrackedBillsSection.tsx
│   │   │   │   ├── SmartDashboard.tsx
│   │   │   │   ├── tracked-topics.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── useDashboardData.ts
│   │   │   │   ├── useMigrationDashboardData.ts
│   │   │   │   ├── UserDashboard.tsx
│   │   │   │   ├── utils/
│   │   │   │   │   ├── dashboard-config-utils.ts
│   │   │   │   │   ├── dashboard-constants.ts
│   │   │   │   │   ├── dashboard-formatters.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   ├── validation.ts
│   │   │   │   ├── variants/
│   │   │   │   │   ├── FullPageDashboard.tsx
│   │   │   │   │   ├── SectionDashboard.tsx
│   │   │   │   ├── widgets/
│   │   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   │   ├── DashboardStack.tsx
│   │   │   │   │   ├── DashboardTabs.tsx
│   │   │   │   │   ├── DashboardWidget.tsx
│   │   │   │   │   ├── widget-types.ts
│   │   │   ├── database-status.tsx
│   │   │   ├── education/
│   │   │   │   ├── ConstitutionalContext.tsx
│   │   │   │   ├── EducationalFramework.tsx
│   │   │   │   ├── EducationalTooltip.tsx
│   │   │   │   ├── HistoricalPrecedents.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── PlainLanguageSummary.tsx
│   │   │   │   ├── ProcessEducation.tsx
│   │   │   │   ├── README.md
│   │   │   ├── examples/
│   │   │   │   ├── SeamlessIntegrationExample.tsx
│   │   │   ├── index.ts
│   │   │   ├── integration/
│   │   │   │   ├── EnhancedUXIntegration.tsx
│   │   │   │   ├── IntegrationProvider.tsx
│   │   │   │   ├── IntegrationTest.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── Layout.tsx
│   │   │   ├── loading/
│   │   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   │   ├── constants.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── loadingCore.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── FontFallback.tsx
│   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useLoading.ts
│   │   │   │   │   ├── useLoadingRecovery.ts
│   │   │   │   │   ├── useLoadingState.ts
│   │   │   │   │   ├── useProgressiveLoading.ts
│   │   │   │   │   ├── useTimeoutAwareLoading.ts
│   │   │   │   │   ├── useUnifiedLoading.ts
│   │   │   │   ├── ImageFallback.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LoadingDemo.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── LoadingStates.tsx
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── ScriptFallback.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── AvatarSkeleton.tsx
│   │   │   │   │   ├── CardSkeleton.tsx
│   │   │   │   │   ├── FormSkeleton.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── ListSkeleton.tsx
│   │   │   │   │   ├── LoadingIndicator.tsx
│   │   │   │   │   ├── ProgressiveLoader.tsx
│   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   ├── TextSkeleton.tsx
│   │   │   │   │   ├── TimeoutAwareLoader.tsx
│   │   │   │   ├── utils/
│   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   ├── timeout-utils.ts
│   │   │   │   ├── validation.ts
│   │   │   ├── mobile/
│   │   │   │   ├── data-display/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MobileBillCard.tsx
│   │   │   │   │   ├── MobileChartCarousel.tsx
│   │   │   │   │   ├── MobileDataVisualization.tsx
│   │   │   │   │   ├── MobileTabSelector.tsx
│   │   │   │   ├── fallbacks.tsx
│   │   │   │   ├── feedback/
│   │   │   │   │   ├── OfflineStatusBanner.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── interaction/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── InfiniteScroll.tsx
│   │   │   │   │   ├── MobileBottomSheet.tsx
│   │   │   │   │   ├── PullToRefresh.tsx
│   │   │   │   │   ├── ScrollToTopButton.tsx
│   │   │   │   │   ├── SwipeGestures.tsx
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AutoHideHeader.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MobileHeader.tsx
│   │   │   │   │   ├── MobileLayout.tsx
│   │   │   │   │   ├── SafeAreaWrapper.tsx
│   │   │   │   ├── MobileNavigation.tsx
│   │   │   │   ├── mobile-navigation-enhancements.css
│   │   │   │   ├── README_NEW_STRUCTURE.md
│   │   │   ├── navigation/
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── NavigationAnalytics.tsx
│   │   │   │   ├── constants.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── roleGuard.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useNav.ts
│   │   │   │   │   ├── useOptimizedNavigation.ts
│   │   │   │   │   ├── useRelatedPages.ts
│   │   │   │   │   ├── useRouteAccess.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── Navigation.tsx
│   │   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   │   ├── performance/
│   │   │   │   │   ├── NavigationPerformanceDashboard.tsx
│   │   │   │   ├── ProgressiveDisclosureDemo.tsx
│   │   │   │   ├── ProgressiveDisclosureNavigation.tsx
│   │   │   │   ├── ProgressiveDisclosureSimple.tsx
│   │   │   │   ├── quick-access-nav.tsx
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── DESKTOP_SIDEBAR_FIXES.md
│   │   │   │   │   ├── DesktopSidebar.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── NavLink.tsx
│   │   │   │   │   ├── NavSection.tsx
│   │   │   │   ├── utils/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── navigation-utils.ts
│   │   │   │   │   ├── page-relationships.ts
│   │   │   │   │   ├── route-access.ts
│   │   │   │   ├── validation.ts
│   │   │   ├── notifications/
│   │   │   │   ├── index.ts
│   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   ├── NotificationItem.tsx
│   │   │   │   ├── notification-preferences.tsx
│   │   │   │   ├── NotificationPreferences.tsx
│   │   │   ├── offline/
│   │   │   │   ├── index.ts
│   │   │   │   ├── OfflineIndicator.tsx
│   │   │   │   ├── offline-manager.tsx
│   │   │   │   ├── OfflineModal.tsx
│   │   │   ├── performance/
│   │   │   │   ├── index.ts
│   │   │   │   ├── PerformanceDashboard.tsx
│   │   │   ├── privacy/
│   │   │   │   ├── CompactInterface.tsx
│   │   │   │   ├── controls/
│   │   │   │   │   ├── ConsentControls.tsx
│   │   │   │   │   ├── DataUsageControls.tsx
│   │   │   │   │   ├── VisibilityControls.tsx
│   │   │   │   ├── FullInterface.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── ModalInterface.tsx
│   │   │   │   ├── PrivacyManager.tsx
│   │   │   ├── realtime/
│   │   │   │   ├── index.ts
│   │   │   │   ├── RealTimeDashboard.tsx
│   │   │   │   ├── RealTimeNotifications.tsx
│   │   │   ├── types.ts
│   │   │   ├── utils/
│   │   │   │   ├── component-helpers.ts
│   │   │   │   ├── index.ts
│   │   ├── validation/
│   │   │   ├── base-validation.ts
│   │   │   ├── consolidated.ts
│   │   │   ├── index.ts
│   ├── store/
│   │   ├── hooks.ts
│   │   ├── index.ts
│   │   ├── middleware/
│   │   │   ├── apiMiddleware.ts
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandlingMiddleware.ts
│   │   │   ├── navigationPersistenceMiddleware.ts
│   │   │   ├── webSocketMiddleware.ts
│   │   ├── slices/
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
│   ├── stubs/
│   │   ├── database-stub.ts
│   │   ├── middleware-stub.ts
│   ├── test-styles.html
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── browser.ts
│   │   ├── community.ts
│   │   ├── conflict-of-interest.ts
│   │   ├── constitutional.ts
│   │   ├── core.ts
│   │   ├── dashboard.ts
│   │   ├── engagement-analytics.ts
│   │   ├── expert.ts
│   │   ├── form.ts
│   │   ├── global.d.ts
│   │   ├── guards.ts
│   │   ├── index.ts
│   │   ├── loading.ts
│   │   ├── lucide.d.ts
│   │   ├── mobile.ts
│   │   ├── navigation.ts
│   │   ├── onboarding.ts
│   │   ├── performance.ts
│   │   ├── realtime.ts
│   │   ├── security.ts
│   │   ├── shims-shared.d.ts
│   │   ├── shims-web-vitals.d.ts
│   │   ├── user-dashboard.ts
│   ├── utils/
│   │   ├── assets.ts
│   │   ├── backgroundSyncManager.ts
│   │   ├── browser.ts
│   │   ├── browser-compatibility-tests.ts
│   │   ├── bundle-analyzer.ts
│   │   ├── cacheInvalidation.ts
│   │   ├── cn.ts
│   │   ├── comprehensiveLoading.ts
│   │   ├── contrast.ts
│   │   ├── demo-data-service.ts
│   │   ├── emergency-triage.ts
│   │   ├── env-config.ts
│   │   ├── EventBus.ts
│   │   ├── i18n.ts
│   │   ├── input-validation.ts
│   │   ├── investor-demo-enhancements.ts
│   │   ├── logger.ts
│   │   ├── monitoring-init.ts
│   │   ├── navigation-wrapper.ts
│   │   ├── offlineAnalytics.ts
│   │   ├── offlineDataManager.ts
│   │   ├── preload-optimizer.ts
│   │   ├── privacy-compliance.ts
│   │   ├── rbac.ts
│   │   ├── react-helpers.ts
│   │   ├── realtime-optimizer.ts
│   │   ├── render-tracker.ts
│   │   ├── render-tracking-integration.ts
│   │   ├── request-deduplicator.ts
│   │   ├── route-preloading.ts
│   │   ├── route-validation.ts
│   │   ├── safe-lazy-loading.tsx
│   │   ├── security.ts
│   │   ├── service-recovery.ts
│   │   ├── serviceWorker.ts
│   │   ├── tracing.ts
│   ├── validation/
│   │   ├── index.ts
│   ├── vite-env.d.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── validate-fixes.cjs
├── vite.config.ts
├── vite.production.config.ts
├── vite-plugin-suppress-warnings.js
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
DESIGN_SYSTEM_DELIVERY.md
DESIGN_SYSTEM_INDEX.md
docker-compose.yml
Dockerfile
Dockerfile.client
docs/
├── active/
│   ├── configuration-guide.md
│   ├── developer-onboarding.md
│   ├── setup.md
│   ├── troubleshooting-guide.md
├── architecture/
│   ├── ai-code-review/
│   │   ├── design.md
│   │   ├── implementation.md
│   │   ├── requirements.md
│   ├── application-flow.md
│   ├── architecture.md
│   ├── chanuka_architecture.txt
│   ├── CORE_INTEGRATION_STATUS.md
│   ├── FEATURES_INTEGRATION_STATUS.md
│   ├── frameworks/
│   │   ├── comprehensive-code-analysis.md
│   │   ├── synthesis.md
│   │   ├── unified-ai-dev.md
│   │   ├── unified-code-analysis.md
│   │   ├── unified-code-analysis-v2.md
│   │   ├── unified-coding.md
│   ├── schema-domain-relationships.md
│   ├── SHARED_INTEGRATION_STATUS.md
├── chanuka/
│   ├── # Chanuka Platform Consolidation Impleme.md
│   ├── api_strategy_doc.md
│   ├── chanuka architecture2.md
│   ├── chanuka_automation_strategy.md
│   ├── chanuka_brand_roadmap.md
│   ├── CHANUKA_CLIENT_COMPREHENSIVE_ANALYSIS.md
│   ├── CHANUKA_CLIENT_DEEP_DIVE_ANALYSIS.md
│   ├── chanuka_complete_slogans.md
│   ├── chanuka_design.txt
│   ├── chanuka_design_specifications.md
│   ├── chanuka_final_poems.md
│   ├── chanuka_implementation_guide.md
│   ├── chanuka_implementation_unified.txt
│   ├── chanuka_platform_client_improvement_recommendations.md
│   ├── chanuka_requirements.txt
│   ├── community-input_1751743369833.html
│   ├── dashboard_1751743369900.html
│   ├── design.md
│   ├── expert-verification_1751743369833.html
│   ├── merged_bill_sponsorship.html
│   ├── missing-strategic-features-analysis.md
│   ├── philosophical_connections_analysis.md
│   ├── README.md
│   ├── Scriptural Distributed Leadership.md
│   ├── sponsorbyreal.html
│   ├── strategic_additions_poems.md
│   ├── strategic-ui-features-analysis.md
│   ├── strategy_template_flow.mermaid
├── CLIENT_DEEP_DIVE_ANALYSIS.md
├── COMPLETED_ISSUES_ARCHIVE_README.md
├── consolidated/
│   ├── chanuka-platform-guide.md
│   ├── client-optimization-guide.md
│   ├── database-consolidation-guide.md
│   ├── project-timeline.md
│   ├── testing-implementation.md
│   ├── testing-reference.md
│   ├── testing-strategy.md
│   ├── ui-ux-guide.md
├── DESIGN_SYSTEM_COMPLETE.md
├── docs-module.md
├── DOCUMENTATION_ORGANIZATION_COMPLETE.md
├── DOCUMENTATION_ORGANIZATION_INDEX.md
├── DOCUMENTATION_ORGANIZATION_SUMMARY.md
├── export-analysis.md
├── export-analysis-updated.md
├── fix-implementation-phase1.md
├── functional-validator-guide.md
├── IMPORT_FIX_EXECUTION_PLAN.md
├── IMPORT_MAPPING_GUIDE.md
├── import-analysis.md
├── index.md
├── phase1-quick-reference.md
├── project-structure.md
├── race-condition-analysis.md
├── reference/
│   ├── API.md
│   ├── api-consumer-guide.md
│   ├── brand-roadmap.md
│   ├── Chanuka_Funding_Pitch.md
│   ├── chanuka_implementation_guide.md
│   ├── chanuka_requirements.txt
│   ├── chanuka_serpent_dove.md
│   ├── chanuka_webapp_copy.md
│   ├── civic_engagement_framework.md
│   ├── constitutional_analysis_framework.md
│   ├── DIGITAL LAW 2018.pdf
│   ├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
│   ├── dissertation.md
│   ├── documentation-standards.md
│   ├── ezra-nehemiah-chanuka (1).md
│   ├── global_implications.md
│   ├── Kenyan_constitution_2010.md
│   ├── legislative_framework.md
│   ├── maintenance-process.md
│   ├── manifesto.md
│   ├── philosophical_threshold_poems.md
│   ├── problem-statement.md
│   ├── project-structure.md
│   ├── README.md
│   ├── strategy_template_flow.mermaid
│   ├── sustainable_uprising.md
│   ├── user-manual.md
├── RESOLUTION_STATUS_REPORT.md
├── RESOLVED_ISSUES_INDEX.md
├── runtime-diagnostics.md
├── TYPE_SYSTEM_AUDIT_REPORT.md
├── TYPE_SYSTEM_COMPLETION_SUMMARY.md
├── TYPE_SYSTEM_FIXES_PHASE1.md
├── TYPE_SYSTEM_MIGRATION.md
├── TYPE_SYSTEM_QUICK_REFERENCE.md
├── TYPE_SYSTEM_REMEDIATION_COMPLETE.md
DOCUMENTATION_AUDIT_REPORT.md
DOCUMENTATION_INDEX.md
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
export_validator.sh
export_validator_old_v7.sh
fix-imports.js
functional_validator.js
generate-structure-to-file.sh
import_resolver_script.sh
import_validator.sh
nginx.conf
nx.json
package.json
performance-baselines.json
playwright.config.ts
playwright-report/
├── index.html
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.js
race-condition-analyzer.js
race-condition-tests.spec.js
README.md
run_codebase_stats.bat
runtime_diagnostics.js
runtime-dependency-check.js
scripts/
├── accessibility/
├── align-imports.ts
├── align-schema.ts
├── analyze-bundle.cjs
├── analyze-codebase-errors.ts
├── analyze-phase2.sh
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
├── cleanup-orphaned-files.ts
├── cleanup-redundant-utils.js
├── complete-fsd-migration.sh
├── complete-migrations.ts
├── complete-realignment.ts
├── complete-schema-fix.ts
├── consolidate-imports.ts
├── consolidate-redundant-implementations.ts
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
│   ├── reset.ts
│   ├── reset-and-migrate.ts
│   ├── reset-database.ts
│   ├── reset-database-fixed.ts
│   ├── run-migrations.ts
│   ├── run-reset.sh
│   ├── run-reset.ts
│   ├── schema-drift-detection.ts
│   ├── setup.ts
│   ├── setup-schema.ts
│   ├── simple-migrate.ts
│   ├── simple-reset.ts
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
├── domain-type-migration-plan.md
├── drop-schema.ts
├── dynamic-path-updater.js
├── emergency-build-fix.ts
├── emergency-design-system-consolidation.ts
├── execute-comprehensive-migration.ts
├── fix-all-imports.js
├── fix-all-shared-core-imports.ts
├── fix-api-response-calls.js
├── fix-config.json
├── fix-design-system.ts
├── fix-display-names.ts
├── fix-error-fallback.ts
├── fix-features-integration.ts
├── fix-frontend-imports.js
├── fix-import-paths.ts
├── fix-infrastructure-issues.ts
├── fix-lucide-imports.ts
├── fix-missing-exports.ts
├── fix-plural-singular-consistency.ts
├── fix-property-naming-consistency.ts
├── fix-remaining-api-calls.js
├── fix-remaining-errors.ts
├── fix-remaining-imports.js
├── fix-schema-imports.ts
├── fix-schema-references.ts
├── fix-server-logger-imports.js
├── fix-shared-core-imports.ts
├── fix-shared-folder.ts
├── fix-shared-imports.js
├── fix-typescript-syntax-errors.ts
├── generate-bundle-report.js
├── generate-comprehensive-migrations.ts
├── identify-any-usage.ts
├── identify-deprecated-files.cjs
├── identify-deprecated-files.js
├── identify-deprecated-files.ts
├── immediate-memory-cleanup.cjs
├── import-resolution-monitor.js
├── integrate-error-management.ts
├── migrate-api-imports.js
├── migrate-codebase-utilities.ts
├── migrate-console-logs.ts
├── migrate-consolidated-imports.cjs
├── migrate-error-handling.ts
├── migrate-imports.js
├── migrate-logging.js
├── migrate-shared-types.ts
├── ml-service-demo.ts
├── optimize-memory.js
├── performance-budget-enforcer.cjs
├── performance-regression-detector.js
├── performance-trend-analyzer.cjs
├── phase2-analyze.js
├── phase2-migration-generator.sh
├── rollback-cleanup.ts
├── run-adapter-cleanup.js
├── scan-migration-artifacts.sh
├── seeds/
│   ├── legislative-seed.ts
│   ├── seed.ts
│   ├── simple-seed.ts
├── setup-playwright.js
├── standardize-imports.ts
├── strategic-contrast-migration.js
├── test-consolidated-design-system.ts
├── test-design-system-architecture.ts
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
│   │   ├── fixers/
│   │   ├── fixtures/
│   │   │   ├── chanuka-edge-case-patterns.ts
│   │   │   ├── chanuka-shared-core-patterns.ts
│   │   │   ├── chanuka-unused-patterns.ts
│   │   │   ├── chanuka-validation-patterns.ts
│   │   │   ├── database-patterns.ts
│   │   │   ├── sample-chanuka-file.ts
│   │   ├── formatters/
│   │   ├── global.d.ts
│   │   ├── integration/
│   │   ├── setup.ts
│   │   ├── validators/
│   ├── tsconfig.json
├── update-core-imports.js
├── update-core-references.js
├── update-import-references.ts
├── validate_structure.ts
├── validate-client-implementations.ts
├── validate-config.js
├── validate-config-consistency.ts
├── validate-design-system.ts
├── validate-design-system-final.ts
├── validate-fsd-migration.ts
├── validate-functional-validator.js
├── validate-imports.js
├── validate-migration-completion.ts
├── validate-new-domains.cjs
├── validate-property-naming.ts
├── validate-shared-folder.ts
├── validate-syntax.ts
├── verify-and-fix-project-structure.ts
├── verify-cleanup.ts
├── verify-project-structure.ts
├── verify-security-patches.ts
├── web-vitals-checker.js
server/
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
│   │   ├── admin.ts
│   │   ├── admin-router.ts
│   │   ├── content-moderation.ts
│   │   ├── external-api-dashboard.ts
│   │   ├── index.ts
│   │   ├── moderation/
│   │   ├── moderation.ts
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
│   │   │   │   ├── ml-service-adapter.ts
│   │   │   ├── repositories/
│   │   ├── presentation/
│   │   │   ├── analysis.routes.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   ├── analytics/
│   │   ├── analytics.ts
│   │   ├── config/
│   │   │   ├── analytics.config.ts
│   │   │   ├── ml-feature-flag.config.ts
│   │   │   ├── ml-migration.config.ts
│   │   ├── conflict-detection/
│   │   ├── conflict-detection.ts
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
│   ├── bills/
│   │   ├── application/
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
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── services/
│   │   │   ├── government-data-integration.service.ts
│   ├── index.ts
│   ├── notifications/
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
│   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   ├── sponsor-service-direct.ts
│   │   ├── index.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   ├── presentation/
│   │   │   ├── sponsors.routes.ts
│   │   ├── types/
│   │   │   ├── analysis.ts
│   │   │   ├── index.ts
│   ├── users/
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
│   ├── adapters/
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
│   │   ├── index.ts
│   │   ├── log-aggregator.ts
│   │   ├── logging-config.ts
│   ├── memory-aware-socket-service.ts
│   ├── memory-monitor.ts
│   ├── migration/
│   │   ├── ab-testing.service.ts
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
├── simple-server.ts
├── tests/
│   ├── features/
│   ├── integration/
│   ├── performance/
│   ├── security/
│   ├── services/
│   ├── setup.ts
│   ├── unit/
│   │   ├── mocks/
│   │   │   ├── mock-data.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── test-helpers.ts
├── tsconfig.json
├── types/
│   ├── api.ts
│   ├── common.ts
│   ├── jest-extensions.d.ts
│   ├── shared-schema-short.d.ts
├── utils/
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
shared/
├── core/
│   ├── index.ts
│   ├── src/
│   │   ├── cache/
│   │   │   ├── index.ts
│   │   ├── caching/
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
│   │   │   ├── index.ts
│   │   │   ├── manager.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   ├── utilities.ts
│   │   ├── index.ts
│   │   ├── middleware/
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
│   │   │   ├── analysis.ts
│   │   │   ├── backup.ts
│   │   │   ├── cleanup/
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
│   │   │   ├── correlation.ts
│   │   │   ├── error-management/
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
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── services.ts
│   │   │   ├── validation-types.ts
│   │   ├── utils/
│   │   │   ├── anonymity-interface.ts
│   │   │   ├── anonymity-service.ts
│   │   │   ├── api/
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interceptors.ts
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
├── docs/
│   ├── database_architecture.md
│   ├── graph_database_strategy.md
│   ├── migration_guide.md
├── fix-unused.ts
├── i18n/
│   ├── en.ts
│   ├── index.ts
├── index.ts
├── package.json
├── platform/
│   ├── index.ts
│   ├── kenya/
│   │   ├── anonymity/
│   │   │   ├── anonymity-helper.ts
├── project.json
├── schema/
│   ├── advanced_discovery.ts
│   ├── advocacy_coordination.ts
│   ├── analysis.ts
│   ├── argument_intelligence.ts
│   ├── citizen_participation.ts
│   ├── constitutional_intelligence.ts
│   ├── enum.ts
│   ├── expert_verification.ts
│   ├── foundation.ts
│   ├── impact_measurement.ts
│   ├── index.ts
│   ├── integrity_operations.ts
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
START_HERE.md
start-dev.js
tailwind.config.js
testing_strategy.md
test-race-condition-fixes.js
test-results/
tests/
├── api/
├── architecture/
├── e2e/
├── factories/
│   ├── README.md
├── global-setup.ts
├── global-teardown.ts
├── integration/
├── mocks/
│   ├── performance.mock.ts
│   ├── redis.mock.ts
├── performance/
├── playwright.config.ts
├── README.md
├── setup/
│   ├── index.ts
│   ├── modules/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── shared.ts
│   ├── test-environment.ts
│   ├── vitest.ts
├── utilities/
│   ├── client/
│   │   ├── comprehensive-test-config.ts
│   │   ├── comprehensive-test-setup.tsx
│   │   ├── index.ts
│   │   ├── navigation-helpers.tsx
│   │   ├── setup.ts
│   │   ├── setup-a11y.ts
│   │   ├── setup-integration.ts
│   │   ├── setup-performance.ts
│   ├── fixtures/
│   │   ├── index.ts
│   ├── index.ts
│   ├── mocks/
│   │   ├── index.ts
│   ├── shared/
│   │   ├── form/
│   │   │   ├── base-form-testing.ts
│   │   │   ├── form-testing-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── testing-library-form-utils.ts
│   │   ├── index.ts
│   │   ├── integration-tests.ts
│   │   ├── load-tester.ts
│   │   ├── schema-agnostic-test-helper.ts
│   │   ├── stress-tests.ts
│   │   ├── test-data-factory.ts
├── utils/
│   ├── test-helpers.ts
├── validation/
│   ├── index.ts
│   ├── README.md
│   ├── test-environment-helpers.ts
│   ├── validators.ts
├── visual/
tools/
├── analyze-orphans-metadata.cjs
├── calculate-loc.cjs
├── codebase-health/
│   ├── cspell.json
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── README.md
│   ├── src/
│   │   ├── analysis/
│   │   │   ├── AnalysisEngine.ts
│   │   ├── classification/
│   │   │   ├── IssueClassifier.ts
│   │   ├── index.ts
│   │   ├── models/
│   │   │   ├── CodeIssue.ts
│   │   │   ├── FixResult.ts
│   │   ├── types/
│   │   ├── utils/
│   │   │   ├── ASTUtils.ts
│   │   │   ├── FileUtils.ts
│   ├── tests/
│   │   ├── analysis/
│   │   │   ├── AnalysisEngine.test.ts
│   │   ├── classification/
│   │   │   ├── IssueClassifier.test.ts
│   │   ├── fixtures/
│   │   │   ├── circular-dep-b.ts
│   │   │   ├── import-issues.ts
│   │   │   ├── sample-issues.ts
│   │   ├── models/
│   │   │   ├── CodeIssue.test.ts
│   │   ├── setup.ts
│   │   ├── test-data/
│   │   │   ├── circular-import-file.ts
│   │   │   ├── correct-file.ts
│   │   │   ├── sample-with-issues.ts
│   │   ├── utils/
│   │   │   ├── ASTUtils.test.ts
│   ├── tsconfig.build.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
├── evaluate-orphans.cjs
├── find-orphans.cjs
├── find-orphans.js
├── gather-metadata.cjs
├── INTEGRATION_ROADMAP.csv
├── ORPHAN_VALUE_ANALYSIS.md
├── orphan-evaluation-report.md
├── orphan-report.json
├── orphans-evaluation.json
├── orphans-metadata.csv
├── orphans-metadata.json
├── TIER_1_INTEGRATION_STATUS.md
├── top-orphans-loc.json
tsconfig.json
tsconfig.server.json
tsconfig.server.tsbuildinfo
tsconfig.tsbuildinfo
validate_imports.js
validator.mjs
verify-exports.js
VERSION
vitest.setup.ts
vitest.workspace.ts
```

**Excluded directories:** `.git`, `node_modules`, `dist`, `build`, `coverage`, `tmp`, `temp`, `__pycache__`, `vendor`, and all hidden files/directories

Generated on: 2025-12-18 15:12:49
