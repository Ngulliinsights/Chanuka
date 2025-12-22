# Project Structure

**Generated:** 12/22/2025, 5:18:51 PM
**Max Depth:** 7 levels

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
│   │   └── contrast-check.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── providers/
│   │   │   │   └── AppProviders.tsx
│   │   │   └── shell/
│   │   │       ├── AppShell.tsx
│   │   │       ├── index.ts
│   │   │       ├── NavigationBar.tsx
│   │   │       └── SkipLinks.tsx
│   │   ├── config/
│   │   │   ├── api.ts
│   │   │   ├── development.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── gestures.ts
│   │   │   ├── index.ts
│   │   │   ├── integration.ts
│   │   │   ├── mobile.ts
│   │   │   ├── navigation.ts
│   │   │   └── onboarding.ts
│   │   ├── constants/
│   │   │   └── index.ts
│   │   ├── content/
│   │   │   └── copy-system.ts
│   │   ├── context/
│   │   │   └── index.ts
│   │   ├── contexts/
│   │   │   ├── NavigationContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── core/
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
│   │   │   │   │   ├── preferences.ts
│   │   │   │   │   ├── request.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   ├── sponsor.ts
│   │   │   │   │   └── websocket.ts
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
│   │   │   │   ├── types.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── WEBSOCKET_API_README.md
│   │   │   │   ├── websocket-example.ts
│   │   │   │   └── websocket.ts
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
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── permission-helpers.ts
│   │   │   │   │   ├── security-helpers.ts
│   │   │   │   │   ├── storage-helpers.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── initialization.ts
│   │   │   │   ├── README.md
│   │   │   │   └── service.ts
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
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useRealtime.ts
│   │   │   │   │   ├── useUnifiedCommunity.ts
│   │   │   │   │   └── useUnifiedDiscussion.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── moderation.service.ts
│   │   │   │   │   ├── state-sync.service.ts
│   │   │   │   │   └── websocket-manager.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── context.tsx
│   │   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── reducer.ts
│   │   │   │   ├── types.ts
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
│   │   │   │   ├── utils/
│   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   ├── progress-utils.ts
│   │   │   │   ├── context.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── reducer.ts
│   │   │   │   ├── types.ts
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
│   │   │   │   ├── persistence.ts
│   │   │   │   ├── preferences.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── test-navigation.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validation.ts
│   │   │   ├── performance/
│   │   │   │   ├── alerts.ts
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitor.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── web-vitals.ts
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
│   │   │   │   ├── state/
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── event-emitter.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── hub.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── manager.ts
│   │   │   │   └── README.md
│   │   │   ├── recovery/
│   │   │   │   ├── dashboard-recovery.ts
│   │   │   │   └── index.ts
│   │   │   ├── storage/
│   │   │   │   ├── cache-storage.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── secure-storage.ts
│   │   │   │   └── types.ts
│   │   │   ├── validation/
│   │   │   │   ├── dashboard-validation.ts
│   │   │   │   └── index.ts
│   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   └── test-consolidated-realtime.ts
│   │   ├── data/
│   │   │   └── mock/
│   │   │       ├── analytics.ts
│   │   │       ├── bills.ts
│   │   │       ├── community.ts
│   │   │       ├── discussions.ts
│   │   │       ├── experts.ts
│   │   │       ├── generators.ts
│   │   │       ├── index.ts
│   │   │       ├── loaders.ts
│   │   │       ├── realtime.ts
│   │   │       └── users.ts
│   │   ├── demo/
│   │   │   └── community-integration-demo.ts
│   │   ├── examples/
│   │   │   ├── render-tracking-usage.tsx
│   │   │   └── WebSocketIntegrationExample.tsx
│   │   ├── features/
│   │   │   ├── admin/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── dashboard/
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
│   │   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   │   ├── use-render-tracker.ts
│   │   │   │   │   ├── use-web-vitals.ts
│   │   │   │   │   ├── useAnalytics.ts
│   │   │   │   │   └── useErrorAnalytics.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── store/
│   │   │   │   │   └── slices/
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
│   │   │   │   └── store/
│   │   │   │       └── slices/
│   │   │   │           └── authSlice.ts
│   │   │   ├── bills/
│   │   │   │   ├── api/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useBills.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── useBills.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
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
│   │   │   │   │   │   └── implementation-workarounds.tsx
│   │   │   │   │   ├── detail/
│   │   │   │   │   │   ├── BillCommunityTab.tsx
│   │   │   │   │   │   ├── BillFullTextTab.tsx
│   │   │   │   │   │   ├── BillHeader.tsx
│   │   │   │   │   │   ├── BillOverviewTab.tsx
│   │   │   │   │   │   └── BillSponsorsTab.tsx
│   │   │   │   │   ├── education/
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── implementation/
│   │   │   │   │   │   └── workarounds.tsx
│   │   │   │   │   ├── list/
│   │   │   │   │   │   └── BillCard.tsx
│   │   │   │   │   ├── tracking/
│   │   │   │   │   │   └── real-time-tracker.tsx
│   │   │   │   │   ├── transparency/
│   │   │   │   │   │   └── ConflictAnalysisDashboard.tsx
│   │   │   │   │   ├── bill-list.tsx
│   │   │   │   │   ├── bill-tracking.tsx
│   │   │   │   │   ├── BillCard.tsx
│   │   │   │   │   ├── BillList.tsx
│   │   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   │   ├── filter-panel.tsx
│   │   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MobileBillDetail.tsx
│   │   │   │   │   ├── stats-overview.tsx
│   │   │   │   │   └── virtual-bill-grid.tsx
│   │   │   │   └── index.ts
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useCommunity.ts
│   │   │   │   │   ├── useCommunityIntegration.ts
│   │   │   │   │   └── useDiscussion.ts
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
│   │   │   ├── search/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   │   ├── useSearch.ts
│   │   │   │   │   └── useStreamingSearch.ts
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
│   │   │   │   ├── ui/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   │   └── SecuritySettings.tsx
│   │   │   │   │   ├── privacy/
│   │   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   │   └── README.md
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── users/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useAuth.tsx
│   │   │   │   │   ├── useOnboarding.ts
│   │   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   │   ├── useUserAPI.ts
│   │   │   │   │   └── useUsers.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── onboarding-service.ts
│   │   │   │   │   └── user-api.ts
│   │   │   │   ├── store/
│   │   │   │   │   └── slices/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── AuthAlert.tsx
│   │   │   │   │   │   ├── AuthButton.tsx
│   │   │   │   │   │   ├── AuthInput.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── useLoginForm.ts
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
│   │   ├── hooks/
│   │   │   ├── mobile/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useBottomSheet.ts
│   │   │   │   ├── useDeviceInfo.ts
│   │   │   │   ├── useInfiniteScroll.ts
│   │   │   │   ├── useMobileNavigation.ts
│   │   │   │   ├── useMobileTabs.ts
│   │   │   │   ├── usePullToRefresh.ts
│   │   │   │   ├── useScrollManager.ts
│   │   │   │   └── useSwipeGesture.ts
│   │   │   ├── index.ts
│   │   │   ├── store.ts
│   │   │   ├── use-keyboard-focus.ts
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-performance-monitor.ts
│   │   │   ├── use-safe-query.ts
│   │   │   ├── use-system.tsx
│   │   │   ├── use-toast.ts
│   │   │   ├── useCleanup.tsx
│   │   │   ├── useDebounce.ts
│   │   │   ├── useErrorRecovery.ts
│   │   │   ├── useIntegratedServices.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useOfflineCapabilities.ts
│   │   │   ├── useOfflineDetection.tsx
│   │   │   ├── useProgressiveDisclosure.ts
│   │   │   ├── useSafeEffect.ts
│   │   │   └── useSeamlessIntegration.ts
│   │   ├── lib/
│   │   │   ├── index.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── utils.ts
│   │   │   ├── validation-schemas.test.ts
│   │   │   └── validation-schemas.ts
│   │   ├── monitoring/
│   │   │   ├── error-monitoring.ts
│   │   │   ├── index.ts
│   │   │   ├── performance-monitoring.ts
│   │   │   └── sentry-config.ts
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── admin.tsx
│   │   │   ├── auth/
│   │   │   │   ├── auth-page.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── PrivacyPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── ResetPasswordPage.tsx
│   │   │   │   └── SecurityPage.tsx
│   │   │   ├── bills/
│   │   │   │   ├── bill-analysis.tsx
│   │   │   │   ├── bill-detail.tsx
│   │   │   │   ├── bill-sponsorship-analysis.tsx
│   │   │   │   └── bills-dashboard-page.tsx
│   │   │   ├── legal/
│   │   │   │   ├── acceptable-use.tsx
│   │   │   │   ├── accessibility.tsx
│   │   │   │   ├── compliance-ccpa.tsx
│   │   │   │   ├── contact-legal.tsx
│   │   │   │   ├── cookie-policy.tsx
│   │   │   │   ├── data-retention.tsx
│   │   │   │   ├── dmca.tsx
│   │   │   │   ├── privacy.tsx
│   │   │   │   ├── security.tsx
│   │   │   │   └── terms.tsx
│   │   │   ├── sponsorship/
│   │   │   │   ├── co-sponsors.tsx
│   │   │   │   ├── financial-network.tsx
│   │   │   │   ├── methodology.tsx
│   │   │   │   ├── overview.tsx
│   │   │   │   └── primary-sponsor.tsx
│   │   │   ├── analytics-dashboard.tsx
│   │   │   ├── civic-education.tsx
│   │   │   ├── comments.tsx
│   │   │   ├── community-input.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── database-manager.tsx
│   │   │   ├── design-system-test.tsx
│   │   │   ├── expert-verification.tsx
│   │   │   ├── home.tsx
│   │   │   ├── integration-status.tsx
│   │   │   ├── IntelligentSearchPage.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── onboarding.tsx
│   │   │   ├── performance-dashboard.tsx
│   │   │   ├── privacy-center.tsx
│   │   │   ├── search.tsx
│   │   │   ├── SecurityDemoPage.tsx
│   │   │   ├── UserAccountPage.tsx
│   │   │   └── UserProfilePage.tsx
│   │   ├── recovery/
│   │   │   └── index.ts
│   │   ├── scripts/
│   │   │   ├── analyze-bundle.ts
│   │   │   ├── consolidate-websocket-migration.ts
│   │   │   ├── fsd-migration.ts
│   │   │   ├── migrate-components.ts
│   │   │   ├── performance-audit.ts
│   │   │   ├── README.md
│   │   │   ├── run-emergency-triage.ts
│   │   │   ├── validate-migration.ts
│   │   │   └── validate-websocket-consolidation.ts
│   │   ├── security/
│   │   │   ├── config/
│   │   │   │   └── security-config.ts
│   │   │   ├── headers/
│   │   │   │   └── SecurityHeaders.ts
│   │   │   ├── types/
│   │   │   │   └── security-types.ts
│   │   │   ├── csp-manager.ts
│   │   │   ├── csp-nonce.ts
│   │   │   ├── csrf-protection.ts
│   │   │   ├── index.ts
│   │   │   ├── input-sanitizer.ts
│   │   │   ├── rate-limiter.ts
│   │   │   ├── security-monitor.ts
│   │   │   ├── security-service.ts
│   │   │   ├── types.ts
│   │   │   └── vulnerability-scanner.ts
│   │   ├── services/
│   │   │   ├── auth-service-init.ts
│   │   │   ├── dataRetentionService.ts
│   │   │   ├── errorAnalyticsBridge.ts
│   │   │   ├── index.ts
│   │   │   ├── mockUserData.ts
│   │   │   ├── navigation.ts
│   │   │   ├── notification-service.ts
│   │   │   ├── notification-system-integration-summary.md
│   │   │   ├── PageRelationshipService.ts
│   │   │   ├── privacyAnalyticsService.ts
│   │   │   ├── realistic-demo-data.ts
│   │   │   ├── UserJourneyTracker.ts
│   │   │   └── userService.ts
│   │   ├── shared/
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
│   │   │   │   │   ├── tooltip.tsx
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
│   │   │   ├── hooks/
│   │   │   │   ├── mobile/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── store.ts
│   │   │   │   ├── use-i18n.tsx
│   │   │   │   ├── useDatabaseStatus.ts
│   │   │   │   ├── useMockData.ts
│   │   │   │   └── useService.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── asset-loading/
│   │   │   │   │   └── AssetLoadingProvider.tsx
│   │   │   │   ├── compatibility/
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
│   │   │   │   │   └── index.ts
│   │   │   │   ├── system/
│   │   │   │   │   └── HealthCheck.tsx
│   │   │   │   ├── data-retention.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-validator.ts
│   │   │   │   └── quality-optimizer.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── index.ts
│   │   │   │   └── unified-interfaces.ts
│   │   │   ├── lib/
│   │   │   │   ├── index.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   ├── react-query-config.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validation-schemas.ts
│   │   │   ├── services/
│   │   │   │   ├── data-retention.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── navigation.ts
│   │   │   ├── testing/
│   │   │   │   ├── index.ts
│   │   │   │   ├── mock-data.ts
│   │   │   │   └── mock-users.ts
│   │   │   ├── types/
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── search-response.ts
│   │   │   │   └── search.ts
│   │   │   ├── ui/
│   │   │   │   ├── accessibility/
│   │   │   │   │   └── accessibility-manager.tsx
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
│   │   │   │   │   │   └── useDashboardTopics.ts
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
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── variants/
│   │   │   │   │   │   ├── FullPageDashboard.tsx
│   │   │   │   │   │   └── SectionDashboard.tsx
│   │   │   │   │   ├── widgets/
│   │   │   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   │   │   ├── DashboardStack.tsx
│   │   │   │   │   │   ├── DashboardTabs.tsx
│   │   │   │   │   │   ├── DashboardWidget.tsx
│   │   │   │   │   │   └── widget-types.ts
│   │   │   │   │   ├── action-items.tsx
│   │   │   │   │   ├── activity-summary.tsx
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
│   │   │   │   │   └── SeamlessIntegrationExample.tsx
│   │   │   │   ├── icons/
│   │   │   │   ├── integration/
│   │   │   │   │   ├── context/
│   │   │   │   │   │   └── IntegrationContext.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useIntegration.ts
│   │   │   │   │   ├── EnhancedUXIntegration.tsx
│   │   │   │   │   ├── IntegrationProvider.tsx
│   │   │   │   │   ├── IntegrationTest.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   ├── lazy/
│   │   │   │   │   └── LazyPageWrapper.tsx
│   │   │   │   ├── loading/
│   │   │   │   │   ├── context/
│   │   │   │   │   │   └── AssetLoadingContext.tsx
│   │   │   │   │   ├── core/
│   │   │   │   │   │   └── loadingCore.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useAssetLoading.ts
│   │   │   │   │   │   ├── useAssetLoadingContext.ts
│   │   │   │   │   │   ├── useAssetLoadingIndicatorState.ts
│   │   │   │   │   │   ├── useLoading.ts
│   │   │   │   │   │   ├── useLoadingRecovery.ts
│   │   │   │   │   │   ├── useLoadingState.ts
│   │   │   │   │   │   ├── useProgressiveLoading.ts
│   │   │   │   │   │   └── useUnifiedLoading.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── AvatarSkeleton.tsx
│   │   │   │   │   │   ├── CardSkeleton.tsx
│   │   │   │   │   │   ├── FormSkeleton.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── ListSkeleton.tsx
│   │   │   │   │   │   ├── LoadingIndicator.tsx
│   │   │   │   │   │   ├── ProgressiveLoader.tsx
│   │   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   │   ├── TextSkeleton.tsx
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   │   ├── loadingUtils.ts
│   │   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── FINAL_STATUS.md
│   │   │   │   │   ├── FontFallback.tsx
│   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   ├── ImageFallback.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-test.ts
│   │   │   │   │   ├── LOADING_SYSTEM_STATUS.md
│   │   │   │   │   ├── LoadingDemo.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── LoadingStates.tsx
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
│   │   │   │   │   │   ├── useNav.ts
│   │   │   │   │   │   ├── useOptimizedNavigation.ts
│   │   │   │   │   │   ├── useRelatedPages.ts
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
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   │   │   ├── Navigation.tsx
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
│   │   │   ├── validation/
│   │   │   │   ├── base-validation.ts
│   │   │   │   ├── consolidated.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── stubs/
│   │   │   ├── database-stub.ts
│   │   │   └── middleware-stub.ts
│   │   ├── types/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── browser.ts
│   │   │   ├── community.ts
│   │   │   ├── conflict-of-interest.ts
│   │   │   ├── constitutional.ts
│   │   │   ├── core.d.ts
│   │   │   ├── core.d.ts.map
│   │   │   ├── core.js
│   │   │   ├── core.js.map
│   │   │   ├── core.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── engagement-analytics.ts
│   │   │   ├── error.ts
│   │   │   ├── expert.ts
│   │   │   ├── form.ts
│   │   │   ├── global.d.ts
│   │   │   ├── guards.ts
│   │   │   ├── index.ts
│   │   │   ├── loading.ts
│   │   │   ├── lucide.d.ts
│   │   │   ├── mobile.ts
│   │   │   ├── navigation.ts
│   │   │   ├── onboarding.ts
│   │   │   ├── performance.ts
│   │   │   ├── realtime.ts
│   │   │   ├── security.ts
│   │   │   ├── shims-shared.d.ts
│   │   │   ├── shims-web-vitals.d.ts
│   │   │   └── user-dashboard.ts
│   │   ├── utils/
│   │   │   ├── assets.ts
│   │   │   ├── backgroundSyncManager.ts
│   │   │   ├── browser-compatibility-tests.ts
│   │   │   ├── browser.ts
│   │   │   ├── bundle-analyzer.ts
│   │   │   ├── cacheInvalidation.ts
│   │   │   ├── cn.ts
│   │   │   ├── comprehensiveLoading.ts
│   │   │   ├── contrast.ts
│   │   │   ├── demo-data-service.ts
│   │   │   ├── emergency-triage.ts
│   │   │   ├── env-config.ts
│   │   │   ├── EventBus.ts
│   │   │   ├── i18n.ts
│   │   │   ├── input-validation.ts
│   │   │   ├── investor-demo-enhancements.ts
│   │   │   ├── logger.ts
│   │   │   ├── monitoring-init.ts
│   │   │   ├── navigation-wrapper.ts
│   │   │   ├── offlineAnalytics.ts
│   │   │   ├── offlineDataManager.ts
│   │   │   ├── preload-optimizer.ts
│   │   │   ├── privacy-compliance.ts
│   │   │   ├── rbac.ts
│   │   │   ├── react-helpers.ts
│   │   │   ├── realtime-optimizer.ts
│   │   │   ├── render-tracker.ts
│   │   │   ├── render-tracking-integration.ts
│   │   │   ├── request-deduplicator.ts
│   │   │   ├── safe-lazy-loading.tsx
│   │   │   ├── security.ts
│   │   │   ├── service-recovery.ts
│   │   │   ├── serviceWorker.ts
│   │   │   └── tracing.ts
│   │   ├── validation/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── DevWrapper.tsx
│   │   ├── emergency-styles.css
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── test-styles.html
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── migration-helper.js
│   ├── package-scripts.json
│   ├── package.json
│   ├── playwright.config.ts
│   ├── playwright.visual.config.ts
│   ├── postcss.config.js
│   ├── postcss.config.minimal.js
│   ├── project.json
│   ├── run-triage.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── validate-fixes.cjs
│   ├── vite-plugin-suppress-warnings.js
│   ├── vite.config.ts
│   └── vite.production.config.ts
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
│   │   ├── FEATURES_INTEGRATION_STATUS.md
│   │   ├── schema-domain-relationships.md
│   │   └── SHARED_INTEGRATION_STATUS.md
│   ├── chanuka/
│   │   ├── # Chanuka Platform Consolidation Impleme.md
│   │   ├── api_strategy_doc.md
│   │   ├── chanuka architecture2.md
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
│   ├── consolidated/
│   │   ├── chanuka-platform-guide.md
│   │   ├── client-optimization-guide.md
│   │   ├── database-consolidation-guide.md
│   │   ├── project-timeline.md
│   │   ├── testing-implementation.md
│   │   ├── testing-reference.md
│   │   ├── testing-strategy.md
│   │   └── ui-ux-guide.md
│   ├── reference/
│   │   ├── api-consumer-guide.md
│   │   ├── API.md
│   │   ├── brand-roadmap.md
│   │   ├── Chanuka_Funding_Pitch.md
│   │   ├── chanuka_implementation_guide.md
│   │   ├── chanuka_requirements.txt
│   │   ├── chanuka_serpent_dove.md
│   │   ├── chanuka_webapp_copy.md
│   │   ├── civic_engagement_framework.md
│   │   ├── constitutional_analysis_framework.md
│   │   ├── DIGITAL LAW 2018.pdf
│   │   ├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
│   │   ├── dissertation.md
│   │   ├── documentation-standards.md
│   │   ├── ezra-nehemiah-chanuka (1).md
│   │   ├── global_implications.md
│   │   ├── Kenyan_constitution_2010.md
│   │   ├── legislative_framework.md
│   │   ├── maintenance-process.md
│   │   ├── manifesto.md
│   │   ├── philosophical_threshold_poems.md
│   │   ├── problem-statement.md
│   │   ├── project-structure.md
│   │   ├── README.md
│   │   ├── sustainable_uprising.md
│   │   └── user-manual.md
│   ├── CLIENT_DEEP_DIVE_ANALYSIS.md
│   ├── CLIENT_FIXES_FINAL_SUMMARY.md
│   ├── CLIENT_VALIDATION_COMPLETE.md
│   ├── COMPLETED_ISSUES_ARCHIVE_README.md
│   ├── CRITICAL_FIXES_SUMMARY.md
│   ├── DESIGN_SYSTEM_COMPLETE.md
│   ├── docs-module.md
│   ├── DOCUMENTATION_ORGANIZATION_COMPLETE.md
│   ├── DOCUMENTATION_ORGANIZATION_INDEX.md
│   ├── DOCUMENTATION_ORGANIZATION_SUMMARY.md
│   ├── ERROR_HANDLING_INTEGRATION_SUMMARY.md
│   ├── export-analysis-updated.md
│   ├── export-analysis.md
│   ├── FEATURE_COMPLETENESS_ANALYSIS.md
│   ├── fix-implementation-phase1.md
│   ├── functional-validator-guide.md
│   ├── IMPORT_FIX_EXECUTION_PLAN.md
│   ├── IMPORT_MAPPING_GUIDE.md
│   ├── import-analysis.md
│   ├── index.md
│   ├── INHERITANCE_COMPOSITION_ANALYSIS.md
│   ├── phase1-quick-reference.md
│   ├── project-structure.md
│   ├── race-condition-analysis.md
│   ├── RECOVERY_UI_FIX_SUMMARY.md
│   ├── RESOLUTION_STATUS_REPORT.md
│   ├── RESOLVED_ISSUES_INDEX.md
│   ├── runtime-diagnostics.md
│   ├── SHARED_UI_BUG_ANALYSIS.md
│   ├── SHARED_UI_FIX_PLAN.md
│   ├── SHARED_UI_FIXES_IMPLEMENTED.md
│   ├── SHARED_UI_GUIDELINES.md
│   ├── SHARED_UI_IMPLEMENTATION_COMPLETE.md
│   ├── SHARED_UI_IMPLEMENTATION_SUMMARY.md
│   ├── TYPE_SYSTEM_AUDIT_REPORT.md
│   ├── TYPE_SYSTEM_COMPLETION_SUMMARY.md
│   ├── TYPE_SYSTEM_FIXES_PHASE1.md
│   ├── TYPE_SYSTEM_MIGRATION.md
│   ├── TYPE_SYSTEM_QUICK_REFERENCE.md
│   ├── TYPE_SYSTEM_REMEDIATION_COMPLETE.md
│   ├── TYPESCRIPT_ERROR_ANALYSIS.md
│   └── TYPESCRIPT_FIXES_APPLIED.md
├── drizzle/
│   ├── meta/
│   │   ├── _journal.json
│   │   ├── 0000_snapshot.json
│   │   ├── 0001_snapshot.json
│   │   ├── 0002_snapshot.json
│   │   ├── 0021_snapshot.json
│   │   └── 20251104110148_snapshot.json
│   ├── 0021_clean_comprehensive_schema.sql
│   ├── 0022_fix_schema_alignment.sql
│   ├── 0023_migration_infrastructure.sql
│   ├── 0024_migration_infrastructure.sql
│   ├── 0025_postgresql_fulltext_enhancements.sql
│   ├── 0026_optimize_search_indexes.sql
│   ├── 20251104110148_soft_captain_marvel.sql
│   ├── 20251104110149_advanced_discovery.sql
│   ├── 20251104110150_real_time_engagement.sql
│   ├── 20251104110151_transparency_intelligence.sql
│   ├── 20251104110152_expert_verification.sql
│   ├── 20251117080000_intelligent_search_phase2.sql
│   ├── 20251117104802_intelligent_search_system.sql
│   ├── COMPREHENSIVE_MIGRATION_SUMMARY.md
│   ├── LEGACY_MIGRATION_ARCHIVE.md
│   └── legacy_migration_validation.sql
├── playwright-report/
│   └── index.html
├── scripts/
│   ├── accessibility/
│   ├── database/
│   │   ├── check-schema.ts
│   │   ├── check-tables.ts
│   │   ├── consolidate-database-infrastructure.ts
│   │   ├── debug-migration-table.ts
│   │   ├── generate-migration.ts
│   │   ├── health-check.ts
│   │   ├── init-strategic-database.ts
│   │   ├── initialize-database-integration.ts
│   │   ├── migrate.ts
│   │   ├── migration-performance-profile.ts
│   │   ├── reset-and-migrate.ts
│   │   ├── reset-database-fixed.ts
│   │   ├── reset-database.ts
│   │   ├── reset.ts
│   │   ├── run-migrations.ts
│   │   ├── run-reset.sh
│   │   ├── run-reset.ts
│   │   ├── schema-drift-detection.ts
│   │   ├── setup-schema.ts
│   │   ├── setup.ts
│   │   ├── simple-migrate.ts
│   │   └── simple-reset.ts
│   ├── deployment/
│   │   └── deploy.sh
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
│   │   │   ├── analyzers/
│   │   │   ├── fixers/
│   │   │   ├── fixtures/
│   │   │   │   ├── chanuka-edge-case-patterns.ts
│   │   │   │   ├── chanuka-shared-core-patterns.ts
│   │   │   │   ├── chanuka-unused-patterns.ts
│   │   │   │   ├── chanuka-validation-patterns.ts
│   │   │   │   ├── database-patterns.ts
│   │   │   │   └── sample-chanuka-file.ts
│   │   │   ├── formatters/
│   │   │   ├── integration/
│   │   │   ├── validators/
│   │   │   ├── global.d.ts
│   │   │   └── setup.ts
│   │   ├── jest.config.js
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── align-imports.ts
│   ├── align-schema.ts
│   ├── analyze-bundle.cjs
│   ├── analyze-codebase-errors.ts
│   ├── analyze-phase2.sh
│   ├── architecture_fixer.ts
│   ├── audit-codebase-utilities.ts
│   ├── audit-error-handling-sprawl.ts
│   ├── audit-middleware-sprawl.ts
│   ├── bundle-analysis-plugin.js
│   ├── bundle-analyzer.js
│   ├── check-table-structure.ts
│   ├── check-tables.ts
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
│   ├── demo-repository-deployment.ts
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
│   ├── fix-schema-imports.ts
│   ├── fix-schema-references.ts
│   ├── fix-server-logger-imports.js
│   ├── fix-shared-core-imports.ts
│   ├── fix-shared-folder.ts
│   ├── fix-shared-imports.js
│   ├── fix-shared-ui-bugs.sh
│   ├── fix-shared-ui.sh
│   ├── fix-typescript-syntax-errors.ts
│   ├── generate-bundle-report.js
│   ├── generate-comprehensive-migrations.ts
│   ├── identify-any-usage.ts
│   ├── identify-deprecated-files.cjs
│   ├── identify-deprecated-files.js
│   ├── identify-deprecated-files.ts
│   ├── immediate-memory-cleanup.cjs
│   ├── import-resolution-monitor.js
│   ├── integrate-error-management.ts
│   ├── migrate-api-imports.js
│   ├── migrate-codebase-utilities.ts
│   ├── migrate-console-logs.ts
│   ├── migrate-consolidated-imports.cjs
│   ├── migrate-error-handling.ts
│   ├── migrate-imports.js
│   ├── migrate-logging.js
│   ├── migrate-shared-types.ts
│   ├── migrate-to-unified-websocket.ts
│   ├── ml-service-demo.ts
│   ├── optimize-memory.js
│   ├── performance-budget-enforcer.cjs
│   ├── performance-regression-detector.js
│   ├── performance-trend-analyzer.cjs
│   ├── phase2-analyze.js
│   ├── phase2-migration-generator.sh
│   ├── prepare-module-deletion.ts
│   ├── rollback-cleanup.ts
│   ├── run-adapter-cleanup.js
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
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth-service.ts
│   │   │   ├── auth.ts
│   │   │   ├── index.ts
│   │   │   ├── passwordReset.ts
│   │   │   ├── secure-session-service.ts
│   │   │   └── session-cleanup.ts
│   │   ├── errors/
│   │   │   ├── error-tracker.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── validation/
│   │   │   ├── data-completeness.ts
│   │   │   ├── data-validation-service.ts
│   │   │   ├── data-validation.ts
│   │   │   ├── index.ts
│   │   │   ├── input-validation-service.ts
│   │   │   ├── schema-validation-service.ts
│   │   │   ├── security-schemas.ts
│   │   │   ├── validation-metrics.ts
│   │   │   ├── validation-services-init.ts
│   │   │   └── validation-utils.ts
│   │   ├── index.ts
│   │   ├── services-init.ts
│   │   ├── StorageTypes.d.ts
│   │   ├── StorageTypes.ts
│   │   └── types.ts
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
│   ├── features/
│   │   ├── admin/
│   │   │   ├── moderation/
│   │   │   │   ├── content-analysis.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── moderation-analytics.service.ts
│   │   │   │   ├── moderation-decision.service.ts
│   │   │   │   ├── moderation-orchestrator.service.ts
│   │   │   │   ├── moderation-queue.service.ts
│   │   │   │   └── types.ts
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
│   │   │   ├── presentation/
│   │   │   └── alert_system_docs.md
│   │   ├── analysis/
│   │   │   ├── application/
│   │   │   │   ├── analysis-service-direct.ts
│   │   │   │   ├── bill-comprehensive-analysis.service.ts
│   │   │   │   ├── constitutional-analysis.service.ts
│   │   │   │   ├── public-interest-analysis.service.ts
│   │   │   │   ├── stakeholder-analysis.service.ts
│   │   │   │   └── transparency-analysis.service.ts
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── analysis-result.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── adapters/
│   │   │   │   │   └── ml-service-adapter.ts
│   │   │   │   └── repositories/
│   │   │   ├── presentation/
│   │   │   ├── types/
│   │   │   │   └── index.ts
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
│   │   │   │   ├── tests/
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
│   │   │   │   └── real-ml.service.ts
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
│   │   │   ├── presentation/
│   │   │   ├── tests/
│   │   │   ├── IMPLEMENTATION_STATUS.md
│   │   │   └── index.ts
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
│   │   │   ├── presentation/
│   │   │   │   ├── index.ts
│   │   │   ├── repositories/
│   │   │   │   └── sponsorship-repository.ts
│   │   │   ├── services/
│   │   │   │   └── voting-pattern-analysis-service.ts
│   │   │   ├── types/
│   │   │   │   └── analysis.ts
│   │   │   ├── bill-status-monitor.ts
│   │   │   ├── bill.js
│   │   │   ├── index.ts
│   │   │   ├── legislative-storage.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── real-time-tracking.ts
│   │   │   └── voting-pattern-analysis.ts
│   │   ├── community/
│   │   │   ├── comment-voting.ts
│   │   │   ├── comment.ts
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
│   │   │   │   ├── precedent-finder.ts
│   │   │   │   └── provision-matcher.ts
│   │   │   ├── config/
│   │   │   │   └── analysis-config.ts
│   │   │   ├── demo/
│   │   │   │   └── constitutional-analysis-demo.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── external/
│   │   │   │       └── legal-database-client.ts
│   │   │   ├── presentation/
│   │   │   ├── scripts/
│   │   │   │   └── populate-sample-data.ts
│   │   │   ├── services/
│   │   │   │   └── constitutional-analysis-factory.ts
│   │   │   ├── tests/
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── analysis-utils.ts
│   │   │   ├── index.ts
│   │   ├── constitutional-intelligence/
│   │   │   ├── application/
│   │   │   │   └── constitutional-analysis.service.ts
│   │   │   └── domain/
│   │   │       └── entities/
│   │   │           └── constitutional-provision.ts
│   │   ├── government-data/
│   │   │   ├── services/
│   │   │   │   └── government-data-integration.service.ts
│   │   │   ├── index.ts
│   │   ├── notifications/
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── notification.ts
│   │   │   ├── index.ts
│   │   │   └── notification-service.ts
│   │   ├── privacy/
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
│   │   │   ├── presentation/
│   │   │   │   └── RecommendationController.ts
│   │   │   └── index.ts
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
│   │   │   ├── presentation/
│   │   │   │   └── SearchController.ts
│   │   │   ├── services/
│   │   │   │   ├── embedding.service.ts
│   │   │   │   └── history-cleanup.service.ts
│   │   │   ├── utils/
│   │   │   │   ├── parallel-query-executor.ts
│   │   │   │   └── search-syntax-parser.ts
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   └── search-index-manager.ts
│   │   ├── security/
│   │   │   ├── encryption-service.ts
│   │   │   ├── enhanced-security-service.ts
│   │   │   ├── index.ts
│   │   │   ├── intrusion-detection-service.ts
│   │   │   ├── privacy-service.ts
│   │   │   ├── security-audit-service.ts
│   │   │   ├── security-initialization-service.ts
│   │   │   ├── security-monitoring-service.ts
│   │   │   ├── security-monitoring.ts
│   │   │   └── tls-config-service.ts
│   │   ├── sponsors/
│   │   │   ├── application/
│   │   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   │   └── sponsor-service-direct.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── repositories/
│   │   │   ├── presentation/
│   │   │   ├── types/
│   │   │   │   ├── analysis.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
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
│   │   │   │   ├── profile.ts
│   │   │   │   ├── user-application-service.ts
│   │   │   │   ├── user-service-direct.ts
│   │   │   │   ├── users.ts
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
│   │   ├── cache/
│   │   │   ├── cache-service.ts
│   │   │   ├── cache.ts
│   │   │   ├── index.ts
│   │   │   └── query-cache.ts
│   │   ├── caching/
│   │   │   └── query-cache.ts
│   │   ├── database/
│   │   │   ├── base/
│   │   │   │   ├── BaseStorage.d.ts
│   │   │   │   ├── BaseStorage.js.map
│   │   │   │   └── BaseStorage.ts
│   │   │   ├── core/
│   │   │   │   ├── connection-manager-metrics.ts
│   │   │   │   ├── connection-manager.ts
│   │   │   │   └── query-executor.ts
│   │   │   ├── config.d.ts
│   │   │   ├── config.ts
│   │   │   ├── connection-pool.ts
│   │   │   ├── database-fallback.ts
│   │   │   ├── database-integration.ts
│   │   │   ├── database-optimization.ts
│   │   │   ├── database-service.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.ts
│   │   │   ├── indexing-optimizer.ts
│   │   │   ├── migration-manager.ts
│   │   │   ├── migration-service.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── schema.sql
│   │   │   ├── seed-data-service.ts
│   │   │   ├── storage.ts
│   │   │   ├── unified-storage.ts
│   │   │   └── validation.ts
│   │   ├── errors/
│   │   │   ├── error-adapter.ts
│   │   │   ├── error-standardization.ts
│   │   │   ├── migration-example.ts
│   │   │   ├── result-adapter.ts
│   │   │   └── result-integration-summary.md
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
│   │   ├── logging/
│   │   │   ├── database-logger.ts
│   │   │   ├── index.ts
│   │   │   ├── log-aggregator.ts
│   │   │   └── logging-config.ts
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
│   │   ├── monitoring/
│   │   │   ├── audit-log.ts
│   │   │   ├── external-api-management.ts
│   │   │   ├── index.ts
│   │   │   ├── monitoring-scheduler.ts
│   │   │   └── performance-monitor.ts
│   │   ├── notifications/
│   │   │   ├── alerting-service.ts
│   │   │   ├── email-service.ts
│   │   │   ├── index.ts
│   │   │   ├── notification_integration_guide.md
│   │   │   ├── notification-channels.ts
│   │   │   ├── notification-orchestrator.ts
│   │   │   ├── notification-scheduler.ts
│   │   │   ├── notification-service.ts
│   │   │   ├── notifications.ts
│   │   │   ├── refactored_summary.md
│   │   │   ├── smart-notification-filter.ts
│   │   │   └── types.ts
│   │   ├── performance/
│   │   │   └── performance-monitor.ts
│   │   ├── persistence/
│   │   │   ├── drizzle/
│   │   │   │   ├── drizzle-bill-repository.ts
│   │   │   │   ├── drizzle-sponsor-repository.ts
│   │   │   │   ├── drizzle-user-repository.ts
│   │   │   │   ├── hybrid-bill-repository.ts
│   │   │   │   └── index.ts
│   │   │   └── lazy-loader.ts
│   │   ├── security/
│   │   │   ├── data-privacy-service.ts
│   │   │   ├── input-validation-service.ts
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
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── boom-error-middleware.ts
│   │   ├── boom-migration-summary.md
│   │   ├── cache-middleware.ts
│   │   ├── circuit-breaker-middleware.ts
│   │   ├── command-injection-prevention.ts
│   │   ├── file-upload-validation.ts
│   │   ├── migration-wrapper.ts
│   │   ├── privacy-middleware.ts
│   │   ├── rate-limiter.ts
│   │   ├── request-logger.ts
│   │   ├── resource-availability.ts
│   │   ├── security-middleware.ts
│   │   ├── security-monitoring-middleware.ts
│   │   ├── server-error-integration.ts
│   │   └── service-availability.ts
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
│   │   ├── external-api-error-handler.ts
│   │   ├── managed-government-data-integration.ts
│   │   ├── README-schema-validation.md
│   │   └── schema-validation-demo.ts
│   ├── tests/
│   │   ├── features/
│   │   ├── integration/
│   │   │   ├── websocket-backward-compatibility.test.ts
│   │   │   └── websocket-service.test.ts
│   │   ├── performance/
│   │   ├── security/
│   │   ├── services/
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
│   │   ├── api.ts
│   │   ├── common.ts
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
│   ├── db.ts
│   ├── example-server-integration.ts
│   ├── index.ts
│   ├── package.json
│   ├── project.json
│   ├── server-startup.ts
│   ├── simple-server.ts
│   ├── tsconfig.json
│   └── vite.ts
├── shared/
│   ├── core/
│   │   ├── cache/
│   │   │   └── index.ts
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
│   │   ├── modernization/
│   │   │   ├── cleanup/
│   │   │   │   ├── cli.ts
│   │   │   │   ├── executor.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── orchestrator.ts
│   │   │   ├── analysis.ts
│   │   │   ├── index.ts
│   │   │   ├── orchestrator.ts
│   │   │   ├── progress.ts
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   ├── observability/
│   │   │   ├── error-management/
│   │   │   │   ├── analytics/
│   │   │   │   │   └── error-analytics.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── base-error.ts
│   │   │   │   │   └── specialized-errors.ts
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── error-boundary.tsx
│   │   │   │   │   └── error-handler-chain.ts
│   │   │   │   ├── integrations/
│   │   │   │   │   └── error-tracking-integration.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   └── express-error-middleware.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── error-monitor.ts
│   │   │   │   ├── patterns/
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   └── retry-patterns.ts
│   │   │   │   ├── recovery/
│   │   │   │   │   └── error-recovery-engine.ts
│   │   │   │   ├── reporting/
│   │   │   │   │   └── user-error-reporter.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── health/
│   │   │   │   ├── checks/
│   │   │   │   │   ├── database-check.ts
│   │   │   │   │   ├── memory-check.ts
│   │   │   │   │   └── redis-check.ts
│   │   │   │   ├── checks.ts
│   │   │   │   ├── health-checker.ts
│   │   │   │   ├── health-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   ├── server-health.ts
│   │   │   │   └── types.ts
│   │   │   ├── logging/
│   │   │   │   ├── index.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── logging-service.ts
│   │   │   │   └── types.ts
│   │   │   ├── metrics/
│   │   │   │   ├── exporters/
│   │   │   │   │   ├── cloudwatch.ts
│   │   │   │   │   ├── prometheus.ts
│   │   │   │   │   └── statsd.ts
│   │   │   │   ├── collectors.ts
│   │   │   │   ├── exporters.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   └── types.ts
│   │   │   ├── tracing/
│   │   │   │   ├── context.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── span.ts
│   │   │   │   ├── tracer.ts
│   │   │   │   └── types.ts
│   │   │   ├── correlation.ts
│   │   │   ├── index.ts
│   │   │   ├── interfaces.ts
│   │   │   ├── iobservability-stack.ts
│   │   │   ├── middleware.ts
│   │   │   ├── observability-stack-service.ts
│   │   │   ├── stack.ts
│   │   │   ├── telemetry.ts
│   │   │   └── types.ts
│   │   ├── performance/
│   │   │   ├── budgets.ts
│   │   │   ├── index.ts
│   │   │   ├── method-timing.ts
│   │   │   ├── monitoring.ts
│   │   │   └── unified-monitoring.ts
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
│   │   ├── rate-limiting/
│   │   │   ├── adapters/
│   │   │   │   ├── fixed-window-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── sliding-window-adapter.ts
│   │   │   │   └── token-bucket-adapter.ts
│   │   │   ├── algorithms/
│   │   │   │   ├── fixed-window.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── sliding-window.ts
│   │   │   │   └── token-bucket.ts
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   └── service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── express-middleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   └── rate-limiting-service.ts
│   │   │   ├── stores/
│   │   │   │   ├── memory-store.ts
│   │   │   │   └── redis-store.ts
│   │   │   ├── ai-rate-limiter.ts
│   │   │   ├── factory.ts
│   │   │   ├── index.ts
│   │   │   ├── metrics.ts
│   │   │   ├── middleware.ts
│   │   │   └── types.ts
│   │   ├── repositories/
│   │   │   ├── interfaces/
│   │   │   │   ├── bill-repository.interface.ts
│   │   │   │   └── sponsor-repository.interface.ts
│   │   │   ├── test-implementations/
│   │   │   │   ├── bill-test-repository.ts
│   │   │   │   └── sponsor-test-repository.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── interfaces/
│   │   │   │   ├── bill-service.interface.ts
│   │   │   │   └── notification-service.interface.ts
│   │   │   ├── test-implementations/
│   │   │   │   ├── bill-test-service.ts
│   │   │   │   └── notification-test-service.ts
│   │   │   ├── cache.ts
│   │   │   ├── composition.ts
│   │   │   ├── index.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── validation.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── index.ts
│   │   │   ├── realtime.ts
│   │   │   ├── services.ts
│   │   │   └── validation-types.ts
│   │   ├── utils/
│   │   │   ├── api/
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── interceptors.ts
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
│   │   ├── validation/
│   │   │   ├── adapters/
│   │   │   │   ├── custom-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── joi-adapter.ts
│   │   │   │   └── zod-adapter.ts
│   │   │   ├── core/
│   │   │   │   ├── base-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   └── validation-service.ts
│   │   │   ├── middleware/
│   │   │   │   └── index.ts
│   │   │   ├── schemas/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── property.ts
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   ├── index.ts
│   │   │   ├── ivalidation-service.ts
│   │   │   ├── middleware.ts
│   │   │   ├── sanitization.ts
│   │   │   ├── types.ts
│   │   │   ├── validation-service-wrapper.ts
│   │   │   └── validation-service.ts
│   │   └── index.ts
│   ├── database/
│   │   ├── core/
│   │   │   ├── config.ts
│   │   │   ├── connection-manager.ts
│   │   │   ├── database-orchestrator.ts
│   │   │   ├── health-monitor.ts
│   │   │   ├── index.ts
│   │   │   └── unified-config.ts
│   │   ├── utils/
│   │   │   └── base-script.ts
│   │   ├── connection.ts
│   │   ├── example-usage.ts
│   │   ├── index.ts
│   │   ├── init.ts
│   │   ├── monitoring.ts
│   │   └── pool.ts
│   ├── docs/
│   │   ├── database_architecture.md
│   │   ├── graph_database_strategy.md
│   │   └── migration_guide.md
│   ├── i18n/
│   │   ├── en.ts
│   │   └── index.ts
│   ├── infrastructure/
│   ├── platform/
│   │   ├── kenya/
│   │   │   └── anonymity/
│   │   │       └── anonymity-helper.ts
│   │   └── index.ts
│   ├── schema/
│   │   ├── advanced_discovery.ts
│   │   ├── advocacy_coordination.ts
│   │   ├── analysis.ts
│   │   ├── argument_intelligence.ts
│   │   ├── citizen_participation.ts
│   │   ├── constitutional_intelligence.ts
│   │   ├── enum.ts
│   │   ├── expert_verification.ts
│   │   ├── foundation.ts
│   │   ├── impact_measurement.ts
│   │   ├── index.ts
│   │   ├── integrity_operations.ts
│   │   ├── parliamentary_process.ts
│   │   ├── platform_operations.ts
│   │   ├── real_time_engagement.ts
│   │   ├── search_system.ts
│   │   ├── simple-validate.ts
│   │   ├── transparency_analysis.ts
│   │   ├── transparency_intelligence.ts
│   │   ├── universal_access.ts
│   │   └── validate-schemas.ts
│   ├── fix-unused.ts
│   ├── index.ts
│   ├── package.json
│   ├── project.json
│   └── tsconfig.json
├── test-results/
├── tests/
│   ├── api/
│   ├── architecture/
│   ├── e2e/
│   ├── factories/
│   │   └── README.md
│   ├── integration/
│   ├── mocks/
│   │   ├── performance.mock.ts
│   │   └── redis.mock.ts
│   ├── performance/
│   ├── setup/
│   │   ├── modules/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── shared.ts
│   │   ├── index.ts
│   │   ├── test-environment.ts
│   │   └── vitest.ts
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
│   ├── visual/
│   ├── global-setup.ts
│   ├── global-teardown.ts
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
│   │   │   ├── types/
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
├── CHANGELOG.md
├── clear-sw.html
├── client-fix-report-20251220-180156.md
├── CONSOLIDATION_PLAN.md
├── CONSOLIDATION_SUMMARY.md
├── cspell.config.yaml
├── DESIGN_SYSTEM_DELIVERY.md
├── DESIGN_SYSTEM_INDEX.md
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.client
├── DOCUMENTATION_AUDIT_REPORT.md
├── DOCUMENTATION_INDEX.md
├── drizzle.config.ts
├── error-components-fix-report-20251221-102246.md
├── export_validator_old_v7.sh
├── export_validator.sh
├── final-cleanup-report-20251220-193413.md
├── fix-imports.js
├── functional_validator.js
├── generate-structure-to-file.sh
├── generate-structure.mjs
├── import_resolver_script.sh
├── import_validator.sh
├── import-resolver.mjs
├── import-validator.mjs
├── nginx.conf
├── nx.json
├── package.json
├── performance-baselines.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── race-condition-analyzer.js
├── race-condition-tests.spec.js
├── README.md
├── REALTIME_INTEGRATION_SUMMARY.md
├── remaining-fixes-report-20251220-184518.md
├── run_codebase_stats.bat
├── runtime_diagnostics.js
├── runtime-dependency-check.js
├── shared-ui-fix-report-20251220-174354.md
├── shared-ui-fix-report-20251220-174615.md
├── START_HERE.md
├── start-dev.js
├── STORE_MIGRATION_ASSESSMENT.md
├── tailwind.config.js
├── test-race-condition-fixes.js
├── testing_strategy.md
├── tsconfig.json
├── tsconfig.server.json
├── TYPESCRIPT_ESLINT_FIXES_SUMMARY.md
├── validate_imports.js
├── validator.mjs
├── verify-exports.js
├── VERSION
├── vitest.setup.ts
└── vitest.workspace.ts
```

## Excluded

The following are excluded from this view:
- Hidden files and directories (starting with `.`)
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

---
*Generated by Project Structure Generator*