# Project Structure

**Generated:** March 9, 2026 at 01:32 PM
**Max Depth:** 7 levels
**Total Items:** 4,275

```
.
├── analysis-results/
│   ├── DEPENDENCY_ANALYSIS_SUMMARY.md
│   ├── dependency-analysis.json
│   ├── dependency-analysis.txt
│   ├── dependency-cruiser-raw.json
│   ├── dependency-graph.md
│   ├── dependency-report.json
│   ├── dependency-report.txt
│   ├── infrastructure-analysis.json
│   └── madge-circular.json
├── client/
│   ├── design-assets/
│   │   ├── Chanuka Logo Design with Maasai Influence.ai
│   │   ├── Chanuka Shield Logo on Navy Background.ai
│   │   └── chanuka-logo-source.ai
│   ├── docs/
│   │   ├── architecture/
│   │   ├── brand/
│   │   │   ├── QUICK_REFERENCE.md
│   │   │   ├── SVG_INTEGRATION_README.md
│   │   │   ├── SVG_INTEGRATION_STRATEGY.md
│   │   │   └── SVG_VISUAL_GUIDE.md
│   │   ├── ux/
│   │   │   ├── IMPLEMENTATION_ROADMAP.md
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── PHASE_1_IMPLEMENTATION_GUIDE.md
│   │   │   ├── QUICK_REFERENCE.md
│   │   │   ├── README.md
│   │   │   ├── USER_JOURNEY_MAPS.md
│   │   │   └── USER_PERSONAS.md
│   │   └── README.md
│   ├── load-tests/
│   │   ├── scenarios/
│   │   │   ├── advocacy-coordination.js
│   │   │   ├── argument-intelligence.js
│   │   │   ├── constitutional-intelligence.js
│   │   │   ├── pretext-detection.js
│   │   │   └── recommendations.js
│   │   ├── config.js
│   │   ├── main.js
│   │   └── README.md
│   ├── logs/
│   │   └── README.md
│   ├── public/
│   │   ├── SVG/
│   │   │   ├── alternative-small-v2.svg
│   │   │   ├── alternative-small.svg
│   │   │   ├── chanuka-logo.svg
│   │   │   ├── chanuka-sidemark.svg
│   │   │   ├── doc-in-shield.svg
│   │   │   ├── favicon.svg
│   │   │   └── wordmark.svg
│   │   ├── Chanuka Logo Design with Maasai Influence.png
│   │   ├── Chanuka Shield Logo on Navy Background.png
│   │   ├── chanuka-civic-tech-logo-variations.png
│   │   ├── chanuka-hero-parliament.png
│   │   ├── chanuka-logo.png
│   │   ├── chanuka-logo.webp
│   │   ├── favicon.ico
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
│   │   ├── check-performance-budget.js
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
│   │   │   ├── shell/
│   │   │   │   ├── AppRouter.tsx
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── BrandedFooter.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── NavigationBar.tsx
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   └── SkipLinks.tsx
│   │   │   └── OnboardingTrigger.tsx
│   │   ├── features/
│   │   │   ├── admin/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── dashboard-validation/
│   │   │   │   │   │   ├── config.property.test.ts
│   │   │   │   │   │   ├── config.test.ts
│   │   │   │   │   │   ├── config.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── run-property-tests.ts
│   │   │   │   │   │   └── verify-config.ts
│   │   │   │   │   ├── admin.tsx
│   │   │   │   │   ├── analytics-dashboard.tsx
│   │   │   │   │   ├── coverage.tsx
│   │   │   │   │   ├── dashboard.tsx
│   │   │   │   │   ├── database-manager.tsx
│   │   │   │   │   ├── integration-status.tsx
│   │   │   │   │   └── onboarding-analytics.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── migration/
│   │   │   │   │   │   └── MigrationManager.tsx
│   │   │   │   │   ├── admin-dashboard.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── advocacy/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-advocacy.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── AdvocacyDashboard.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ActionCard.tsx
│   │   │   │   │   └── CampaignCard.tsx
│   │   │   │   ├── ElectoralPressure.tsx
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
│   │   │   │   ├── pages/
│   │   │   │   │   ├── analysis-tools.tsx
│   │   │   │   │   └── WorkaroundAnalysisPage.tsx
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── AnalysisDashboard.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── analytics/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-analytics.ts
│   │   │   │   │   ├── use-comprehensive-analytics.ts
│   │   │   │   │   ├── use-error-analytics.ts
│   │   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   │   ├── use-render-tracker.ts
│   │   │   │   │   └── use-web-vitals.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── error-analytics-bridge.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── offline-analytics.ts
│   │   │   │   │   ├── privacy-analytics.ts
│   │   │   │   │   └── user-journey-tracker.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── api.ts
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
│   │   │   ├── api/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useApiDocumentation.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── api-access.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── api-documentation.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── argument-intelligence/
│   │   │   │   ├── api/
│   │   │   │   │   └── argument-intelligence-api.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useArgumentIntelligence.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── argument-intelligence.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ArgumentClusterDisplay.tsx
│   │   │   │   │   ├── ArgumentFilters.tsx
│   │   │   │   │   ├── ArgumentIntelligenceDashboard.tsx
│   │   │   │   │   ├── ArgumentIntelligenceWidget.tsx
│   │   │   │   │   ├── PositionTrackingChart.tsx
│   │   │   │   │   ├── QualityMetricsDisplay.tsx
│   │   │   │   │   └── SentimentHeatmap.tsx
│   │   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── auth/
│   │   │   │   └── pages/
│   │   │   │       ├── auth-page.tsx
│   │   │   │       ├── forgot-password.tsx
│   │   │   │       ├── login.tsx
│   │   │   │       ├── PrivacyPage.tsx
│   │   │   │       ├── RegisterPage.tsx
│   │   │   │       ├── ResetPasswordPage.tsx
│   │   │   │       └── SecurityPage.tsx
│   │   │   ├── bills/
│   │   │   │   ├── model/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── bill-analysis.tsx
│   │   │   │   │   ├── bill-detail.tsx
│   │   │   │   │   ├── bill-sponsorship-analysis.tsx
│   │   │   │   │   ├── bills-dashboard-page.tsx
│   │   │   │   │   ├── BillsPortalPage.tsx
│   │   │   │   │   └── CollectionsPage.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── collections-service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── pagination.ts
│   │   │   │   │   └── tracking.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── action-prompts/
│   │   │   │   │   │   ├── ActionPromptCard.tsx
│   │   │   │   │   │   └── index.tsx
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
│   │   │   │   │   ├── collections/
│   │   │   │   │   │   ├── AddToCollectionButton.tsx
│   │   │   │   │   │   ├── CollectionsDialog.tsx
│   │   │   │   │   │   └── CollectionsList.tsx
│   │   │   │   │   ├── components/
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
│   │   │   │   │   ├── impact/
│   │   │   │   │   │   ├── ImpactCalculator.tsx
│   │   │   │   │   │   └── index.tsx
│   │   │   │   │   ├── implementation/
│   │   │   │   │   ├── legislative-brief/
│   │   │   │   │   │   ├── ArgumentMap.tsx
│   │   │   │   │   │   ├── BriefViewer.tsx
│   │   │   │   │   │   └── index.tsx
│   │   │   │   │   ├── list/
│   │   │   │   │   │   └── BillCard.tsx
│   │   │   │   │   ├── sponsorship/
│   │   │   │   │   │   ├── co-sponsors.tsx
│   │   │   │   │   │   ├── financial-network.tsx
│   │   │   │   │   │   ├── methodology.tsx
│   │   │   │   │   │   ├── overview.tsx
│   │   │   │   │   │   └── primary-sponsor.tsx
│   │   │   │   │   ├── tracking/
│   │   │   │   │   │   └── real-time-tracker.tsx
│   │   │   │   │   ├── translation/
│   │   │   │   │   │   ├── index.tsx
│   │   │   │   │   │   └── PlainLanguageView.tsx
│   │   │   │   │   ├── transparency/
│   │   │   │   │   │   ├── ConflictAnalysisDashboard.tsx
│   │   │   │   │   │   └── ShadowLedgerDashboard.ts
│   │   │   │   │   ├── ArgumentsTab.tsx
│   │   │   │   │   ├── bill-list.tsx
│   │   │   │   │   ├── bill-tracking.tsx
│   │   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   │   ├── BulkActionsBar.tsx
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
│   │   │   ├── collaboration/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── WorkspaceDetailPage.tsx
│   │   │   │   │   └── WorkspacesPage.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── activity-service.ts
│   │   │   │   │   └── workspace-service.ts
│   │   │   │   └── ui/
│   │   │   │       ├── ActivityFeed.tsx
│   │   │   │       └── WorkspaceCard.tsx
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useArgumentClusters.ts
│   │   │   │   │   ├── useArgumentsForBill.ts
│   │   │   │   │   ├── useCommunity.ts
│   │   │   │   │   ├── useCommunityIntegration.ts
│   │   │   │   │   ├── useDiscussion.ts
│   │   │   │   │   ├── useLegislativeBrief.ts
│   │   │   │   │   ├── useRealtime.ts
│   │   │   │   │   ├── useUnifiedCommunity.ts
│   │   │   │   │   └── useUnifiedDiscussion.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── comments.tsx
│   │   │   │   │   └── community-input.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.ts
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
│   │   │   ├── constitutional-intelligence/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-constitutional-analysis.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ConstitutionalAnalysisDisplay.tsx
│   │   │   │   │   └── ConstitutionalIntelligenceTab.tsx
│   │   │   │   └── index.ts
│   │   │   ├── design-system/
│   │   │   │   └── pages/
│   │   │   │       └── design-system-test.tsx
│   │   │   ├── electoral-accountability/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useElectoralAccountability.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── ElectoralAccountabilityDashboard.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── electoral-accountability-api.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── campaigns/
│   │   │   │   │   ├── constituency/
│   │   │   │   │   ├── gap-analysis/
│   │   │   │   │   ├── mp-scorecard/
│   │   │   │   │   │   ├── MPScorecard.tsx
│   │   │   │   │   │   └── VotingRecordTimeline.tsx
│   │   │   │   │   └── shared/
│   │   │   │   │       ├── AccountabilityMetricCard.tsx
│   │   │   │   │       └── GapSeverityBadge.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── expert/
│   │   │   │   └── pages/
│   │   │   │       ├── expert-insights.tsx
│   │   │   │       └── expert-verification.tsx
│   │   │   ├── feature-flags/
│   │   │   │   ├── api/
│   │   │   │   │   └── feature-flags-api.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useFeatureFlags.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── feature-flags.tsx
│   │   │   │   │   └── FeatureFlagManagerPage.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── FeatureFlagManager.tsx
│   │   │   │   │   ├── FlagAnalyticsDashboard.tsx
│   │   │   │   │   ├── FlagEditor.tsx
│   │   │   │   │   ├── FlagList.tsx
│   │   │   │   │   └── RolloutControls.tsx
│   │   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── home/
│   │   │   │   └── pages/
│   │   │   │       ├── about.tsx
│   │   │   │       ├── blog.tsx
│   │   │   │       ├── careers.tsx
│   │   │   │       ├── contact.tsx
│   │   │   │       ├── core-home.tsx
│   │   │   │       ├── home.tsx
│   │   │   │       ├── HomePage.tsx
│   │   │   │       ├── press.tsx
│   │   │   │       └── support.tsx
│   │   │   ├── legal/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── use-constitutional-analysis.ts
│   │   │   │   │   ├── useConflicts.ts
│   │   │   │   │   ├── useLegalRisks.ts
│   │   │   │   │   └── usePrecedents.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── acceptable-use.tsx
│   │   │   │   │   ├── accessibility-statement.tsx
│   │   │   │   │   ├── accessibility.tsx
│   │   │   │   │   ├── compliance-ccpa.tsx
│   │   │   │   │   ├── contact-legal.tsx
│   │   │   │   │   ├── cookie-policy.tsx
│   │   │   │   │   ├── data-retention.tsx
│   │   │   │   │   ├── dmca.tsx
│   │   │   │   │   ├── documentation.tsx
│   │   │   │   │   ├── privacy.tsx
│   │   │   │   │   ├── security.tsx
│   │   │   │   │   └── terms.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ConflictAlertCard.tsx
│   │   │   │   │   └── LegalAnalysisTab.tsx
│   │   │   │   └── index.ts
│   │   │   ├── market/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useMarket.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── market.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── SokoHaki.tsx
│   │   │   ├── monitoring/
│   │   │   │   ├── api/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── monitoring-api.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── use-monitoring.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── continuous-performance-monitor.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── performance-benchmarking.ts
│   │   │   │   │   ├── performance-regression-tester.ts
│   │   │   │   │   ├── render-tracker.ts
│   │   │   │   │   ├── render-tracking-integration.ts
│   │   │   │   │   └── route-profiler.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── integration-monitoring.tsx
│   │   │   │   │   └── monitoring-dashboard.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── AlertManagement.tsx
│   │   │   │   │   ├── ErrorTrackingDisplay.tsx
│   │   │   │   │   ├── FeatureUsageCharts.tsx
│   │   │   │   │   ├── HealthStatusDisplay.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── IntegrationMonitoringDashboard.tsx
│   │   │   │   │   ├── MetricsVisualization.tsx
│   │   │   │   │   └── PerformanceMetrics.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── navigation/
│   │   │   │   └── model/
│   │   │   │       └── index.ts
│   │   │   ├── notifications/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useNotifications.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── notification-service.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── notifications.ts
│   │   │   │   └── index.ts
│   │   │   ├── onboarding/
│   │   │   │   ├── components/
│   │   │   │   │   └── OnboardingTrigger.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useOnboarding.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── civic-education.tsx
│   │   │   │   │   ├── onboarding.tsx
│   │   │   │   │   └── welcome-tour.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── onboarding.ts
│   │   │   │   └── index.ts
│   │   │   ├── pretext-detection/
│   │   │   │   ├── api/
│   │   │   │   │   └── pretext-detection-api.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── use-safe-query.ts
│   │   │   │   │   ├── usePretextAnalysis.ts
│   │   │   │   │   └── usePretextDetectionApi.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── pretext-detection.tsx
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
│   │   │   ├── recommendation/
│   │   │   │   ├── api/
│   │   │   │   │   └── recommendation-api.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useRecommendations.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── PersonalizedRecommendationsWidget.tsx
│   │   │   │   │   ├── RecommendationCard.tsx
│   │   │   │   │   ├── RecommendationList.tsx
│   │   │   │   │   ├── RecommendationWidget.tsx
│   │   │   │   │   ├── SimilarBillsWidget.tsx
│   │   │   │   │   └── TrendingBillsWidget.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── search/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   │   ├── useSearch.ts
│   │   │   │   │   └── useStreamingSearch.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── universal-search.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── intelligent-search.ts
│   │   │   │   │   ├── search-api.ts
│   │   │   │   │   ├── search-history-service.ts
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
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── SavedSearchesPanel.tsx
│   │   │   │   │   └── SearchHistoryDropdown.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── security/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useSecurity.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── security-demo.tsx
│   │   │   │   └── index.ts
│   │   │   ├── sitemap/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useSitemap.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── sitemap.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── sitemap.ts
│   │   │   │   └── index.ts
│   │   │   ├── status/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── useSystemStatus.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── system-status.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── status.ts
│   │   │   │   └── index.ts
│   │   │   ├── users/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-auth.tsx
│   │   │   │   │   ├── useOnboarding.ts
│   │   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   │   ├── useUserAPI.ts
│   │   │   │   │   └── useUsers.ts
│   │   │   │   ├── model/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── user-service.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── user-account.tsx
│   │   │   │   │   └── user-profile.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── achievements-service.ts
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── auth-service.ts
│   │   │   │   │   ├── dashboard-service.ts
│   │   │   │   │   ├── engagement-service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── onboarding-service.ts
│   │   │   │   │   ├── profile-service.ts
│   │   │   │   │   └── user-api.ts
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
│   │   │   │   │   │   ├── CommunityValidationType.ts
│   │   │   │   │   │   ├── CredibilityScoring.tsx
│   │   │   │   │   │   ├── ExpertBadge.tsx
│   │   │   │   │   │   ├── ExpertConsensus.tsx
│   │   │   │   │   │   ├── ExpertProfileCard.tsx
│   │   │   │   │   │   ├── ExpertVerificationDemo.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   ├── verification-list.tsx
│   │   │   │   │   │   ├── VerificationWorkflow.tsx
│   │   │   │   │   │   └── VerificationWorkflowType.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── FEATURE_STRUCTURE_GUIDE.md
│   │   │   └── index.ts
│   │   ├── infrastructure/
│   │   │   ├── api/
│   │   │   │   ├── circuit-breaker/
│   │   │   │   │   ├── core.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── examples/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── use-api-with-fallback.ts
│   │   │   │   │   ├── use-safe-mutation.ts
│   │   │   │   │   ├── use-safe-query.ts
│   │   │   │   │   ├── useApiConnection.ts
│   │   │   │   │   ├── useConnectionAware.tsx
│   │   │   │   │   └── useServiceStatus.ts
│   │   │   │   ├── http/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── request-deduplicator.ts
│   │   │   │   ├── realtime/
│   │   │   │   │   ├── client.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── bill.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── user.service.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── auth-types.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── bill.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── common.ts
│   │   │   │   │   ├── community.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── engagement.ts
│   │   │   │   │   ├── error-response.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   ├── performance.ts
│   │   │   │   │   ├── preferences.ts
│   │   │   │   │   ├── realtime.ts
│   │   │   │   │   ├── request.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   ├── shared-imports.ts
│   │   │   │   │   └── sponsor.ts
│   │   │   │   ├── websocket/
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── manager.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── cache-manager.ts
│   │   │   │   ├── circuit-breaker-monitor.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── contract-client.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interceptors.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── privacy.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── registry.ts
│   │   │   │   ├── retry.ts
│   │   │   │   ├── serialization-interceptors.ts
│   │   │   │   ├── system.ts
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
│   │   │   │   │   └── use-auth.tsx
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
│   │   │   │   ├── README.md
│   │   │   │   ├── types.ts
│   │   │   │   └── useBrowserStatus.tsx
│   │   │   ├── command-palette/
│   │   │   │   ├── CommandPalette.tsx
│   │   │   │   ├── commands.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── README.md
│   │   │   │   ├── types.ts
│   │   │   │   └── useCommandPalette.ts
│   │   │   ├── community/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   │   ├── moderation.service.ts
│   │   │   │   │   └── state-sync.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── consolidation/
│   │   │   │   ├── consolidation-algorithm.ts
│   │   │   │   ├── di-container.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interface-extraction.ts
│   │   │   │   ├── mappings.ts
│   │   │   │   ├── migration-script.ts
│   │   │   │   ├── module-structure.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── rollback.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── validation.ts
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
│   │   │   │   ├── core/
│   │   │   │   │   ├── factory.ts
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── integration/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── react-query.ts
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
│   │   │   │   ├── patterns/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── result.ts
│   │   │   │   ├── recovery/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── user-actions.ts
│   │   │   │   ├── reporters/
│   │   │   │   │   ├── ApiReporter.ts
│   │   │   │   │   ├── CompositeReporter.ts
│   │   │   │   │   ├── ConsoleReporter.ts
│   │   │   │   │   └── SentryReporter.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── classes.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── dashboard-errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── MIGRATION_HISTORY.md
│   │   │   │   ├── monitoring.tsx
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── recovery.ts
│   │   │   │   ├── reporting.ts
│   │   │   │   ├── RESULT_MONAD_GUIDE.md
│   │   │   │   ├── serialization.ts
│   │   │   │   ├── STRATEGIC_ASSESSMENT.md
│   │   │   │   └── types.ts
│   │   │   ├── events/
│   │   │   │   ├── event-bus.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── mobile/
│   │   │   │   ├── device-detector.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── performance-optimizer.ts
│   │   │   │   ├── README.md
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
│   │   │   │   ├── navigation-service.ts
│   │   │   │   ├── NavigationConsistency.test.tsx
│   │   │   │   ├── NavigationConsistency.tsx
│   │   │   │   ├── NavigationPerformance.test.tsx
│   │   │   │   ├── NavigationPerformance.tsx
│   │   │   │   ├── page-relationship-service.ts
│   │   │   │   ├── persistence.ts
│   │   │   │   ├── preferences.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── route-preloading.ts
│   │   │   │   ├── route-validation.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── test-navigation.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validation.ts
│   │   │   ├── observability/
│   │   │   │   ├── analytics/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── error-monitoring/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── monitoring-init.ts
│   │   │   │   ├── logging/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── performance/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── performance-dashboard.tsx
│   │   │   │   ├── personalization/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── persona-detector.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── system/
│   │   │   │   │   ├── HealthCheck.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── telemetry/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── types.ts
│   │   │   ├── scripts/
│   │   │   │   ├── analyze-internal-imports.sh
│   │   │   │   ├── check-jsdoc-coverage.ts
│   │   │   │   ├── check-jsdoc.sh
│   │   │   │   ├── fix-internal-imports.sh
│   │   │   │   ├── validate-api-documentation.ts
│   │   │   │   └── validate-module-structure.ts
│   │   │   ├── search/
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── search-strategy-selector.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── UnifiedSearchInterface.test.tsx
│   │   │   │   └── UnifiedSearchInterface.tsx
│   │   │   ├── security/
│   │   │   │   ├── config/
│   │   │   │   │   └── security-config.ts
│   │   │   │   ├── headers/
│   │   │   │   │   └── SecurityHeaders.ts
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
│   │   │   │   │   ├── security-interface.ts
│   │   │   │   │   └── system.ts
│   │   │   │   ├── csp-nonce.ts
│   │   │   │   ├── csrf-protection.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input-sanitizer.ts
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── security-monitor.ts
│   │   │   │   ├── security-monitoring.ts
│   │   │   │   ├── security-service.ts
│   │   │   │   ├── security-utils.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── vulnerability-scanner.ts
│   │   │   │   └── window.d.ts
│   │   │   ├── storage/
│   │   │   │   ├── asset-loading/
│   │   │   │   │   ├── AssetLoadingProvider.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── sync/
│   │   │   │   │   ├── background-sync-manager.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── cache-manager.ts
│   │   │   │   ├── cache-storage.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── offline-data-manager.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── secure-storage.ts
│   │   │   │   └── types.ts
│   │   │   ├── store/
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── apiMiddleware.ts
│   │   │   │   │   ├── authMiddleware.ts
│   │   │   │   │   ├── errorHandlingMiddleware.ts
│   │   │   │   │   ├── navigationPersistenceMiddleware.ts
│   │   │   │   │   └── webSocketMiddleware.ts
│   │   │   │   ├── slices/
│   │   │   │   │   ├── discussionSlice.ts
│   │   │   │   │   ├── errorAnalyticsSlice.ts
│   │   │   │   │   ├── errorHandlingSlice.ts
│   │   │   │   │   ├── loadingSlice.ts
│   │   │   │   │   ├── navigationSlice.ts
│   │   │   │   │   ├── realTimeSlice.ts
│   │   │   │   │   ├── sessionSlice.ts
│   │   │   │   │   ├── uiSlice.ts
│   │   │   │   │   └── userDashboardSlice.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── store-types.ts
│   │   │   ├── validation/
│   │   │   │   ├── dashboard-validation.ts
│   │   │   │   ├── form-helpers.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── sanitization.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── validator.ts
│   │   │   │   └── validators.ts
│   │   │   ├── workers/
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   └── service-worker.ts
│   │   │   ├── API_DOCUMENTATION_SUMMARY.md
│   │   │   ├── ARCHITECTURAL_LAYERS.md
│   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   ├── core-monitoring.ts
│   │   │   ├── index.ts
│   │   │   ├── init.ts
│   │   │   ├── integration-validator.ts
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   ├── MODULE_VALIDATION_REPORT.md
│   │   │   ├── quality-optimizer.ts
│   │   │   ├── roleGuard.ts
│   │   │   └── TYPEDOC_SETUP.md
│   │   ├── lib/
│   │   │   ├── a11y/
│   │   │   │   ├── focus-trap.tsx
│   │   │   │   ├── live-region.tsx
│   │   │   │   └── skip-links.tsx
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
│   │   │   ├── contexts/
│   │   │   │   ├── KenyanContextProvider.tsx
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
│   │   │   │   │   ├── Button.stories.tsx
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
│   │   │   │   ├── layout/
│   │   │   │   │   ├── BentoGrid.tsx
│   │   │   │   │   └── LogoPattern.tsx
│   │   │   │   ├── lib/
│   │   │   │   │   └── utils.ts
│   │   │   │   ├── media/
│   │   │   │   │   ├── Avatar.tsx
│   │   │   │   │   ├── BrandAssets.tsx
│   │   │   │   │   ├── ChanukaBrand.tsx
│   │   │   │   │   ├── ChanukaLogo.tsx
│   │   │   │   │   ├── ChanukaShield.tsx
│   │   │   │   │   ├── ChanukaSymbol.tsx
│   │   │   │   │   ├── ChanukaWordmark.tsx
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
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── buttons.css
│   │   │   │   │   │   ├── forms.css
│   │   │   │   │   │   ├── layout.css
│   │   │   │   │   │   ├── progressive-disclosure.css
│   │   │   │   │   │   └── ui.css
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
│   │   │   │   ├── theme/
│   │   │   │   │   ├── dark.css
│   │   │   │   │   ├── high-contrast.css
│   │   │   │   │   └── light.css
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
│   │   │   │   ├── COMPLETION_REPORT.md
│   │   │   │   ├── COMPONENT_FLATTENING_EXECUTION_REPORT.md
│   │   │   │   ├── COMPONENT_FLATTENING_STRATEGY.md
│   │   │   │   ├── DIRECTORY_VALIDATION_FRAMEWORK.md
│   │   │   │   ├── IMPLEMENTATION_GUIDE.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── INTEGRATION_COMPLETE.md
│   │   │   │   ├── integration.ts
│   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   ├── quality.ts
│   │   │   │   ├── QUICK_START.md
│   │   │   │   ├── README.md
│   │   │   │   ├── REFINEMENT_STRATEGY.md
│   │   │   │   ├── responsive.css
│   │   │   │   ├── responsive.ts
│   │   │   │   └── strategy.ts
│   │   │   ├── examples/
│   │   │   │   └── render-tracking-usage.tsx
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
│   │   │   │   │   └── performance.ts
│   │   │   │   ├── CLIENT_VALIDATION_GUIDE.md
│   │   │   │   ├── hooks-monitoring.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   ├── README.md
│   │   │   │   ├── STANDARDIZATION_GUIDELINES.md
│   │   │   │   ├── store.ts
│   │   │   │   ├── TESTING_STRATEGY.md
│   │   │   │   ├── use-analytics.ts
│   │   │   │   ├── use-architecture-performance.ts
│   │   │   │   ├── use-cleanup.ts
│   │   │   │   ├── use-database-status.ts
│   │   │   │   ├── use-debounce.ts
│   │   │   │   ├── use-error-recovery.ts
│   │   │   │   ├── use-i18n.tsx
│   │   │   │   ├── use-integrated-services.ts
│   │   │   │   ├── use-keyboard-focus.ts
│   │   │   │   ├── use-loading.ts
│   │   │   │   ├── use-media-query.ts
│   │   │   │   ├── use-mobile.ts
│   │   │   │   ├── use-mock-data.ts
│   │   │   │   ├── use-navigation-slice.ts
│   │   │   │   ├── use-notifications.ts
│   │   │   │   ├── use-offline-capabilities.ts
│   │   │   │   ├── use-offline-detection.ts
│   │   │   │   ├── use-performance-monitor.ts
│   │   │   │   ├── use-progressive-disclosure.ts
│   │   │   │   ├── use-safe-effect.ts
│   │   │   │   ├── use-safe-query.ts
│   │   │   │   ├── use-seamless-integration.ts
│   │   │   │   ├── use-search.ts
│   │   │   │   ├── use-security.ts
│   │   │   │   ├── use-service.ts
│   │   │   │   ├── use-system.ts
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── use-validation.ts
│   │   │   │   ├── use-websocket.ts
│   │   │   │   └── useOfflineDetection.ts
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
│   │   │   │   │   ├── layout-components/
│   │   │   │   │   │   ├── DashboardContent.tsx
│   │   │   │   │   │   ├── DashboardFooter.tsx
│   │   │   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   │   │   └── DashboardSidebar.tsx
│   │   │   │   │   ├── modals/
│   │   │   │   │   │   ├── DashboardPreferencesModal.tsx
│   │   │   │   │   │   └── DataExportModal.tsx
│   │   │   │   │   ├── persona-layouts/
│   │   │   │   │   │   ├── ExpertDashboardLayout.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── IntermediateDashboardLayout.tsx
│   │   │   │   │   │   └── NoviceDashboardLayout.tsx
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
│   │   │   │   ├── error-boundary/
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── examples/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── SeamlessIntegrationExample.tsx
│   │   │   │   ├── feedback/
│   │   │   │   │   └── FeedbackWidget.tsx
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
│   │   │   │   │   ├── BrandedLoadingScreen.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── FontFallback.tsx
│   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   ├── GlobalLoadingProvider.tsx
│   │   │   │   │   ├── ImageFallback.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-test.ts
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
│   │   │   │   │   ├── BottomSheet.tsx
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── fallbacks.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── mobile-navigation-enhancements.css
│   │   │   │   │   ├── MobileNavigation.tsx
│   │   │   │   │   ├── PullToRefreshIndicator.tsx
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
│   │   │   │   ├── states/
│   │   │   │   │   └── BrandedEmptyState.tsx
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
│   │   │   │   ├── virtual-list/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── VirtualList.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── utils/
│   │   │   │   ├── api-error-handler.ts
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
│   │   ├── services/
│   │   │   ├── apiService.ts
│   │   │   └── websocket-manager.ts
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
│   │   └── vite-env.d.ts
│   ├── BUG_FIXES_SUMMARY.md
│   ├── fix-react-imports.sh
│   ├── FIXES_COMPLETED.md
│   ├── IMPLEMENTATION_COMPLETE_SUMMARY.md
│   ├── index.html
│   ├── legacy-imports.txt
│   ├── missing.txt
│   ├── missing4.txt
│   ├── missing5.txt
│   ├── missing6.txt
│   ├── NEXT_STEPS_READY.md
│   ├── package-scripts.json
│   ├── package.json
│   ├── performance-budgets.json
│   ├── PHASE_1_QUICK_START.md
│   ├── playwright.config.ts
│   ├── playwright.visual.config.ts
│   ├── postcss.config.js
│   ├── project.json
│   ├── QUICK_FIX_GUIDE.md
│   ├── QUICK_START_PHASE_1.md
│   ├── README.md
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   ├── tsconfig.tsbuildinfo
│   ├── UX_IMPROVEMENTS_COMPLETE.md
│   ├── vite-plugin-suppress-warnings.js
│   ├── vite.config.ts
│   ├── vite.production.config.ts
│   ├── vitest.a11y.config.ts
│   ├── vitest.config.ts
│   └── vitest.setup.ts
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
│   ├── adr/
│   │   ├── ADR-001-api-client-consolidation.md
│   │   ├── ADR-001-DDD-Feature-Structure.md
│   │   ├── ADR-002-client-api-architecture.md
│   │   ├── ADR-002-Facade-Pattern-For-Middleware.md
│   │   ├── ADR-003-dead-vs-unintegrated-code.md
│   │   ├── ADR-004-feature-structure-convention.md
│   │   ├── ADR-005-csp-manager-consolidation.md
│   │   ├── ADR-006-validation-single-source.md
│   │   ├── ADR-007-utils-consolidation.md
│   │   ├── ADR-008-incomplete-migrations.md
│   │   ├── ADR-009-graph-module-refactoring.md
│   │   ├── ADR-010-government-data-consolidation.md
│   │   ├── ADR-011-type-system-single-source.md
│   │   ├── ADR-012-infrastructure-security-pattern.md
│   │   ├── ADR-013-caching-strategy.md
│   │   ├── ADR-014-error-handling-pattern.md
│   │   ├── ADR-015-intelligent-bill-pipeline.md
│   │   ├── ADR-016-naming-conventions.md
│   │   ├── ADR-017-repository-pattern-standardization.md
│   │   ├── ADR-018-analytics-analysis-separation.md
│   │   ├── ADR-019-orphaned-infrastructure-cleanup.md
│   │   └── README.md
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
│   │   ├── BOUNDARY_FIX_PLAN.md
│   │   ├── CLIENT_LIB_CORE_FEATURES_ANALYSIS.md
│   │   ├── CLIENT_OVERLAP_ANALYSIS.md
│   │   ├── data-flow-pipelines.md
│   │   ├── ERROR_HANDLING_CONSISTENCY_ANALYSIS.md
│   │   ├── INFRASTRUCTURE_CONSISTENCY_ANALYSIS.md
│   │   ├── INTEGRATION_ARCHITECTURE.md
│   │   ├── MASTER_CONSOLIDATION_PLAN.md
│   │   ├── ML_AI_ARCHITECTURE.md
│   │   ├── monorepo.md
│   │   ├── project-structure.md
│   │   ├── SHARED_CLIENT_SERVER_BOUNDARIES.md
│   │   ├── SHARED_FOLDER_ANALYSIS.md
│   │   ├── SPEC_GAP_ANALYSIS_RESOLUTION.md
│   │   ├── SPEC_UPDATE_COMPLETE.md
│   │   ├── STRATEGIC_IMPLEMENTATION_ANALYSIS.md
│   │   ├── SUSTAINABLE_APPROACH_ANALYSIS.md
│   │   └── UNUSED_UTILITIES_ANALYSIS.md
│   ├── archive/
│   │   ├── 2026-03-root-cleanup/
│   │   │   ├── AUDIT_TRACKING_TEMPLATE.md
│   │   │   ├── DOCUMENTATION_INVENTORY.md
│   │   │   ├── INDEX_OPERATIONAL_MASTERY.md
│   │   │   ├── INTEGRATION_CHECKLIST.md
│   │   │   ├── MVP Data Strategy for NLP Training.md
│   │   │   ├── OPERATIONAL_BLINDSPOT_AUDIT_TEMPLATE.md
│   │   │   ├── OPERATIONAL_MASTERY_DEMONSTRATION.md
│   │   │   ├── PHASE_1_CLEANUP_COMPLETE.md
│   │   │   ├── README_ARCHITECTURE_DOCS.md
│   │   │   ├── README_AUDIT_SYSTEM.md
│   │   │   ├── scripts-tools-strategic-analysis.md
│   │   │   └── scripts-tools-strategic-audit.md
│   │   ├── audits-2026-03/
│   │   │   ├── ANALYTICS_VS_ANALYSIS_AUDIT.md
│   │   │   ├── AUDIT_INDEX_2026-03-06.md
│   │   │   ├── AUDIT_INSIGHTS_EXTRACTED.md
│   │   │   ├── AUDIT_RESULTS_SUMMARY.md
│   │   │   ├── AUDIT_STATUS_ANALYSIS_2026-03-06.md
│   │   │   ├── CODE_AUDIT_2026-03-06_UPDATED.md
│   │   │   ├── CODE_AUDIT_2026-03-06.md
│   │   │   ├── DEEP_CODE_AUDIT_2026-03-06.md
│   │   │   ├── DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md
│   │   │   ├── DOCUMENTATION_CONTENT_AUDIT_2026-03-06.md
│   │   │   ├── ERROR_HANDLING_CONSOLIDATION_AUDIT.md
│   │   │   ├── EXECUTIVE_SUMMARY_2026-03-06.md
│   │   │   ├── FEATURE_MODERNIZATION_AUDIT.md
│   │   │   ├── GANTT_CHART_2026-03-06.csv
│   │   │   ├── INFRASTRUCTURE_ARCHITECTURE_AUDIT.md
│   │   │   ├── INFRASTRUCTURE_CONSISTENCY_ANALYSIS.md
│   │   │   ├── INFRASTRUCTURE_FEATURE_INTEGRATION_ANALYSIS.md
│   │   │   ├── PROJECT_TASKS_2026-03-06.csv
│   │   │   ├── README.md
│   │   │   ├── REQUIREMENTS_AUDIT_ASSESSMENT.md
│   │   │   └── SQL_INJECTION_AUDIT_FINAL.md
│   │   ├── completion-reports-2026-03-06/
│   │   │   ├── DOCUMENTATION_CLARIFICATION_2026-03-06.md
│   │   │   ├── DOCUMENTATION_CLEANUP_SUMMARY_2026-03-06.md
│   │   │   ├── SPRINT_PROGRESS_2026-03-06.md
│   │   │   └── WEEK_1_PRIORITY_FIXES_COMPLETE.md
│   │   ├── electoral-accountability-fragments-2026-03/
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_COMPLETE_IMPLEMENTATION.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_FINAL_SUMMARY.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_FRONTEND_COMPONENTS.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_FRONTEND_IMPLEMENTATION.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_IMPLEMENTATION.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_INTEGRATION_GUIDE.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_QUICK_REFERENCE.md
│   │   │   ├── ELECTORAL_ACCOUNTABILITY_STATUS.md
│   │   │   └── README.md
│   │   ├── orphan-analysis-2025/
│   │   │   ├── INTEGRATION_ROADMAP.csv
│   │   │   ├── ORPHAN_VALUE_ANALYSIS.md
│   │   │   ├── orphan-evaluation-report.md
│   │   │   ├── README.md
│   │   │   └── TIER_1_INTEGRATION_STATUS.md
│   │   ├── ACCESSIBILITY_AUDIT_STATUS.md
│   │   ├── baseline_analysis.md
│   │   ├── baseline_unused_exports.txt
│   │   ├── BUG_FIX_REPORT.md
│   │   ├── BUG_FIXES_SUMMARY.md
│   │   ├── cache-factory-comparison.md
│   │   ├── chanuka_architecture.txt
│   │   ├── CHANUKA_CLIENT_COMPREHENSIVE_ANALYSIS.md
│   │   ├── CHANUKA_CLIENT_DEEP_DIVE_ANALYSIS.md
│   │   ├── CHANUKA_IMPLEMENTATION_PLAN.md
│   │   ├── chanuka_platform_client_improvement_recommendations.md
│   │   ├── CIRCULAR_DEPENDENCY_FIX.md
│   │   ├── CLIENT_ARCHITECTURE_BOUNDARIES_ANALYSIS.md
│   │   ├── CLIENT_ARCHITECTURE_CLEANUP_SUMMARY.md
│   │   ├── CLIENT_ARCHITECTURE_CONSOLIDATION_COMPLETE.md
│   │   ├── CLIENT_CONSOLIDATION_FINAL_REPORT.md
│   │   ├── CLIENT_CONSOLIDATION_IMPLEMENTATION_PLAN.md
│   │   ├── CLIENT_CONSOLIDATION_REVIEW.md
│   │   ├── CLIENT_HEALTH_CHECK.md
│   │   ├── CLIENT_I18N_CONSOLIDATION_COMPLETE.md
│   │   ├── client-type-violations-summary.md
│   │   ├── CODEBASE_CONSOLIDATION_COMPLETE.md
│   │   ├── COMPLETE_MIGRATION_NOW.md
│   │   ├── COMPREHENSIVE_AUDIT_KENYAN_CONTEXT.md
│   │   ├── COMPREHENSIVE_CODEBASE_AUDIT.md
│   │   ├── config-manager-feature-matrix.md
│   │   ├── config-manager-unique-features.md
│   │   ├── CONTRADICTIONS_RECONCILIATION.md
│   │   ├── CORE_INTEGRATION_STATUS.md
│   │   ├── CURRENT_CAPABILITIES.md
│   │   ├── DATABASE_INFRASTRUCTURE_FIXES.md
│   │   ├── DATABASE_SERVICE_MIGRATION_GUIDE.md
│   │   ├── DATABASE_SERVICE_MIGRATION_SUMMARY.md
│   │   ├── DECISIONS_IMPLEMENTATION_SUMMARY.md
│   │   ├── DOCS_ROOT_CLEANUP_2026-03-06.md
│   │   ├── DOCUMENTATION_AUDIT_REPORT.md
│   │   ├── DOCUMENTATION_INDEX.md
│   │   ├── ERROR_CHECK_REPORT.md
│   │   ├── FEATURES_INTEGRATION_STATUS.md
│   │   ├── FINAL-SCHEMA-INTEGRATION-ZERO-REDUNDANCY.md
│   │   ├── fix-root-cause.md
│   │   ├── GOVERNOR_INTEGRATION_PHASE1.md
│   │   ├── GRAPH_SCHEMA_ANALYSIS_AND_INTEGRATION_PLAN.md
│   │   ├── hack-comments-scan.md
│   │   ├── HOOKS_CONSOLIDATION_OPPORTUNITIES.md
│   │   ├── IMMEDIATE_ACTIONS_COMPLETION_SUMMARY.md
│   │   ├── IMPLEMENTATION_TRACKER.md
│   │   ├── import-resolution-audit-progress.md
│   │   ├── INFRASTRUCTURE_CONSISTENCY_ANALYSIS.md
│   │   ├── INFRASTRUCTURE_CONSISTENCY_FIXES_APPLIED.md
│   │   ├── infrastructure-consolidation-import-analysis.md
│   │   ├── INHERITANCE_COMPOSITION_ANALYSIS.md
│   │   ├── LEGAL_PAGES_UPDATE_SUMMARY.md
│   │   ├── missing-strategic-features-analysis.md
│   │   ├── MONDAY_KICKOFF_CHECKLIST.md
│   │   ├── observability-server-specific-utilities.md
│   │   ├── observability-thin-wrappers-analysis.md
│   │   ├── ORPHANED_COMPONENTS_FIXED.md
│   │   ├── PAGES_AUDIT_COMPLETE.md
│   │   ├── PERFORMANCE_IMPLEMENTATION_SUMMARY.md
│   │   ├── PHASE_4_FINAL_REPORT.md
│   │   ├── phase4-completion-summary.md
│   │   ├── phase4-progress.md
│   │   ├── QUALITY_COMPARISON_FRAMEWORK.md
│   │   ├── QUALITY_COMPARISON_RESULTS.md
│   │   ├── QUICK_START_ACCESSIBILITY_AUDIT.md
│   │   ├── REVISED-SCHEMA-INTEGRATION-FOCUSED.md
│   │   ├── security-consolidation-plan.md
│   │   ├── SERVICE_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md
│   │   ├── SHARED_INTEGRATION_STATUS.md
│   │   ├── STRATEGIC_DOCUMENTATION_ANALYSIS.md
│   │   ├── STRATEGIC_RECOMMENDATIONS_IMPLEMENTATION.md
│   │   ├── strategic-ui-features-analysis.md
│   │   ├── structural-ambiguities.md
│   │   ├── SVG_FIXES_SUMMARY.md
│   │   ├── SVG_INTEGRATION_SUMMARY.md
│   │   ├── SVG_MIGRATION_GUIDE.md
│   │   ├── task-6-completion-summary.md
│   │   ├── task-25-type-safety-verification.md
│   │   ├── tool_verification_summary.md
│   │   ├── type-safety-tooling-summary.md
│   │   ├── type-violations-priority-analysis.md
│   │   ├── type-violations-summary.md
│   │   ├── UI_IMPLEMENTATION_CHECKLIST.md
│   │   ├── UI_UX_IMPROVEMENTS_SUMMARY.md
│   │   ├── VALIDATION_CONSOLIDATION_COMPLETE.md
│   │   └── WCAG_ACCESSIBILITY_AUDIT.md
│   ├── chanuka/
│   │   ├── archive/
│   │   │   ├── leg_intel_scraper.js
│   │   │   └── README.md
│   │   ├── ml/
│   │   │   └── MWANGA_STACK_DEPLOYMENT_SUMMARY.md
│   │   ├── strategy/
│   │   │   ├── 04-chanuka-scraping-strategy.md
│   │   │   ├── 06-chanuka-founder-brief.md
│   │   │   ├── 07-chanuka-applications.md
│   │   │   ├── 08-chanuka-advisory-council-pitch.md
│   │   │   ├── 09-chanuka-goethe-application.md
│   │   │   ├── 11-chanuka-katiba-senate-pitches.md
│   │   │   ├── 12-chanuka-master-brief.md
│   │   │   ├── api_strategy_doc.md
│   │   │   ├── ASPIRATIONAL_CLAIMS_AUDIT.md
│   │   │   ├── brand-roadmap.md
│   │   │   ├── chanuka idea validation.md
│   │   │   ├── Chanuka Validation_ A Rigorous Plan.md
│   │   │   ├── chanuka_automation_strategy.md
│   │   │   ├── chanuka_brand_roadmap.md
│   │   │   ├── chanuka_complete_slogans.md
│   │   │   ├── chanuka_email_templates.md
│   │   │   ├── chanuka_final_poems.md
│   │   │   ├── chanuka_funder_table (1).md
│   │   │   ├── Chanuka_Funding_Pitch.md
│   │   │   ├── chanuka-founder-brief.docx
│   │   │   ├── Data Strategy for Chanuka Launch.md
│   │   │   ├── HONEST_STRATEGIC_POSITION.md
│   │   │   ├── kba_pitch_deck.md
│   │   │   ├── philosophical_connections_analysis.md
│   │   │   ├── Scriptural Distributed Leadership.md
│   │   │   ├── Strategic Funding and Networking Plan.md
│   │   │   ├── strategic_additions_poems.md
│   │   │   ├── Validating Legislative Intelligence Market.md
│   │   │   └── Validating Parliamentary Compliance Infrastructure.md
│   │   ├── 01-chanuka-audit-narrative.md
│   │   ├── 02-chanuka-feature-status.md
│   │   ├── 03-chanuka-project-plan.md
│   │   ├── BRAND_COLOR_USAGE_GUIDE.md
│   │   ├── CHANUKA_CASUAL_PITCH.md
│   │   ├── CHANUKA_FORMAL_PITCH.md
│   │   ├── community-input_1751743369833.html
│   │   ├── dashboard_1751743369900.html
│   │   ├── expert-verification_1751743369833.html
│   │   ├── FELLOWSHIP_APPLICATION_MATERIALS.md
│   │   ├── merged_bill_sponsorship.html
│   │   ├── README.md
│   │   ├── SCRAPING_CONSOLIDATION_PLAN.md
│   │   ├── SCRAPING_MIGRATION_COMPLETE.md
│   │   ├── sponsorbyreal.html
│   │   └── strategy_template_flow.mermaid
│   ├── DCS/
│   │   ├── ARCHITECTURE.md
│   │   ├── CLEANUP_PLAN.md
│   │   ├── CORE_FEATURES.md
│   │   ├── DEVELOPMENT_WORKFLOW.md
│   │   ├── EXTRACTION_COMPLETE.md
│   │   ├── INDEX.md
│   │   ├── QUICK_REFERENCE.md
│   │   └── SECURITY_STATUS.md
│   ├── development/
│   │   └── CIRCULAR_DEPENDENCY_PREVENTION.md
│   ├── features/
│   │   ├── search/
│   │   │   ├── SEARCH_INTEGRATION_COMPLETE.md
│   │   │   ├── SEARCH_INTEGRATION_SUMMARY.md
│   │   │   ├── SEARCH_INTEGRATION_TEST_PLAN.md
│   │   │   └── SEARCH_QUICK_START.md
│   │   ├── CODE_QUALITY_DEEP_DIVE_SECURE_QUERY_BUILDER.md
│   │   ├── ELECTORAL_ACCOUNTABILITY.md
│   │   ├── NOTIFICATION_SYSTEM_CONSOLIDATION.md
│   │   ├── PLACEHOLDER_DETECTION_GUIDE.md
│   │   ├── REPOSITORY_PATTERN_DECISION_MATRIX.md
│   │   ├── REPOSITORY_PATTERN_IMPLEMENTATION_GUIDE.md
│   │   ├── REPOSITORY_PATTERN.md
│   │   └── SECURE_QUERY_BUILDER_MIGRATION_GUIDE.md
│   ├── fixes/
│   │   ├── INFRASTRUCTURE_FIXES_COMPLETED.md
│   │   ├── INFRASTRUCTURE_GAPS_FIX_PLAN.md
│   │   └── PORT_AND_CSP_FIXES.md
│   ├── guides/
│   │   ├── templates/
│   │   │   ├── new-api-endpoint-template.md
│   │   │   ├── new-entity-template.md
│   │   │   ├── new-migration-template.md
│   │   │   └── README.md
│   │   ├── api-client-guide.md
│   │   ├── api-consumer-guide.md
│   │   ├── AUDIT_QUICK_START_GUIDE.md
│   │   ├── AUDIT_SYSTEM_README.md
│   │   ├── code-organization-standards.md
│   │   ├── configuration-guide.md
│   │   ├── developer-onboarding.md
│   │   ├── documentation-standards.md
│   │   ├── ERROR_HANDLING_MIGRATION_GUIDE.md
│   │   ├── FSD_IMPORT_GUIDE.md
│   │   ├── integration-pattern-examples.md
│   │   ├── maintenance-process.md
│   │   ├── migration-examples.md
│   │   ├── migration-process.md
│   │   ├── MVP_INTEGRATION_GUIDE.md
│   │   ├── PATH_ALIAS_RESOLUTION.md
│   │   ├── ROUTING_EXPLANATION.md
│   │   ├── SERVER_CLIENT_INTEGRATION_GUIDE.md
│   │   ├── setup.md
│   │   ├── troubleshooting-guide.md
│   │   └── user-manual.md
│   ├── infrastructure/
│   │   └── BUILD_CONFIGURATION.md
│   ├── integration/
│   │   ├── advocacy-coordination.md
│   │   ├── architecture.md
│   │   ├── constitutional-intelligence.md
│   │   └── README.md
│   ├── operations/
│   │   └── BACKUP_RECOVERY.md
│   ├── plans/
│   │   ├── ERROR-FIXING-EXECUTION-PLAN.md
│   │   ├── IMMEDIATE-EXECUTION-PLAN.md
│   │   ├── INFRASTRUCTURE-CHANGES-REVIEW.md
│   │   ├── monitoring-fsd-restructure.md
│   │   ├── phase1-type-consolidation-tracker.md
│   │   ├── TYPE-CONSOLIDATION-AUDIT-AND-NEXT-STEPS.md
│   │   ├── TYPE-CONSOLIDATION-FINAL-REPORT.md
│   │   ├── TYPE-CONSOLIDATION-PROGRESS.md
│   │   └── VALIDATION-AND-ERROR-FIXING-PLAN.md
│   ├── reference/
│   │   ├── Adversarial Validation of 'Chanuka' as Democratic Infrastructure in Kenya.md
│   │   ├── chanuka_serpent_dove.md
│   │   ├── chanuka_timeline_gantt.md
│   │   ├── chanuka_webapp_copy.md
│   │   ├── civic_engagement_framework.md
│   │   ├── Constitutional Normalization in Kenya_ The CDF Paradigm and the Erosion of Democratic Memory.md
│   │   ├── constitutional_analysis_framework.md
│   │   ├── constitutional-normalization-study.md
│   │   ├── data-entry-templates.json
│   │   ├── database-research-prompt.md
│   │   ├── Detecting Legislative Pretext_ A Framework.md
│   │   ├── DIGITAL LAW 2018.pdf
│   │   ├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
│   │   ├── dissertation.md
│   │   ├── ezra-nehemiah-chanuka (1).md
│   │   ├── FEATURE_README_TEMPLATE.md
│   │   ├── global_implications.md
│   │   ├── GLOSSARY.md
│   │   ├── Grounding Constitutional Analysis in Pragmatism.md
│   │   ├── Kenyan Civic Tech Data Research Plan.md
│   │   ├── Kenyan Constitutionalism Research Synthesis.md
│   │   ├── Kenyan Legislative Challenges and Judicial Outcomes Database - Table 1.csv
│   │   ├── Kenyan Legislative Data Generation Plan.md
│   │   ├── Kenyan Legislative Intelligence Database Project.md
│   │   ├── Kenyan_constitution_2010.md
│   │   ├── Legislative Relationship Mapping Framework.md
│   │   ├── legislative_framework.md
│   │   ├── manifesto.md
│   │   ├── Operationalizing Academic Research for Impact.md
│   │   ├── philosophical_threshold_poems.md
│   │   ├── problem-statement.md
│   │   ├── prompt-1-constitutional-vulnerabilities.md
│   │   ├── prompt-2-underutilized-strengths.md
│   │   ├── prompt-3-elite-literacy-loopholes.md
│   │   ├── prompt-4-public-participation.md
│   │   ├── prompt-5-trojan-bills.md
│   │   ├── prompt-6-ethnic-patronage.md
│   │   ├── README.md
│   │   ├── relationship-mapping-framework.md
│   │   ├── Research Strategy for Kenyan Constitutionalism.md
│   │   ├── STATUS_VOCABULARY.md
│   │   ├── strategy_template_flow.mermaid
│   │   └── sustainable_uprising.md
│   ├── retrospective/
│   │   └── GIT_HISTORY_ANALYSIS.md
│   ├── security/
│   │   └── phase1-security-review.md
│   ├── technical/
│   │   ├── application-flow.md
│   │   ├── architecture.md
│   │   ├── BOUNDARY_DEFINITIONS.md
│   │   ├── CODEBASE_CONTEXT.md
│   │   ├── docs-module.md
│   │   ├── IMPORT_PATH_GOVERNANCE.md
│   │   ├── MIGRATION_LOG.md
│   │   ├── PERFORMANCE_OPTIMIZATIONS.md
│   │   ├── PERFORMANCE_QUICK_REFERENCE.md
│   │   ├── race-condition-analysis.md
│   │   ├── schema-domain-relationships.md
│   │   └── TYPE_SYSTEM_CLEANUP_COMPLETE.md
│   ├── ARCHITECTURAL_LESSONS_LEARNED.md
│   ├── DESIGN_DECISIONS.md
│   ├── DEVELOPER_GUIDE_Feature_Creation.md
│   ├── DEVELOPER_ONBOARDING.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── DOCUMENTATION_REMEDIATION_PLAN.md
│   ├── IMPLEMENTATION_COMPLETE_SUMMARY.md
│   ├── PORT_CONFIGURATION.md
│   ├── project-structure.md
│   ├── README.md
│   ├── SECURITY_AUDIT_CRITICAL_FIXES.md
│   ├── STRATEGIC_INSIGHTS.md
│   └── SYSTEMS_ENGINEERING_READINESS.md
├── drizzle/
│   ├── meta/
│   │   ├── _journal.json
│   │   ├── 20260225131220_snapshot.json
│   │   ├── 20260225131859_snapshot.json
│   │   └── 20260225133920_snapshot.json
│   ├── 20260225131859_fancy_maverick.sql
│   ├── 20260225133920_brief_killraven.sql
│   ├── COMPREHENSIVE_MIGRATION_SUMMARY.md
│   ├── LEGACY_MIGRATION_ARCHIVE.md
│   └── MIGRATION_NAMING_GUIDE.md
├── plans/
│   └── archived/
│       ├── design-obsolete-2026-02.md
│       ├── OBSOLETE.md
│       └── requirements-obsolete-2026-02.md
├── playwright-report/
│   └── index.html
├── reports/
│   ├── accessibility/
│   │   ├── audit-1771864612601.json
│   │   ├── audit-1771864612621.md
│   │   └── LATEST_AUDIT.md
│   ├── eslint-suppressions-2026-02-16T20-37-18.json
│   ├── eslint-suppressions-2026-02-16T20-37-18.txt
│   ├── eslint-suppressions-2026-02-16T20-43-57.json
│   ├── eslint-suppressions-2026-02-16T20-43-57.txt
│   ├── eslint-suppressions-2026-02-16T20-49-07.json
│   ├── eslint-suppressions-2026-02-16T20-49-07.txt
│   ├── eslint-suppressions-2026-02-17T01-09-12.json
│   ├── eslint-suppressions-2026-02-17T01-09-12.txt
│   └── eslint-suppressions.html
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
│   │   ├── align-enums.ts
│   │   ├── check-schema.ts
│   │   ├── check-tables.ts
│   │   ├── create-missing-mvp-tables.ts
│   │   ├── DATABASE_DRIVER_STRATEGY.md
│   │   ├── debug-migration-table.ts
│   │   ├── DEPRECATION_NOTICE.md
│   │   ├── ensure-foundation-tables.ts
│   │   ├── execute-sql-migrations-advanced.ts
│   │   ├── execute-sql-migrations.ts
│   │   ├── fix-migration-comprehensive.py
│   │   ├── fix-migration-syntax.ts
│   │   ├── fix-trailing-commas.py
│   │   ├── fresh-start-migration.ts
│   │   ├── generate-migration-with-types.ts
│   │   ├── generate-migration.ts
│   │   ├── generate-types-simple.ts
│   │   ├── generate-types.ts
│   │   ├── health-check.ts
│   │   ├── init-strategic-database.ts
│   │   ├── initialize-database-integration.ts
│   │   ├── list-tables.ts
│   │   ├── migrate-with-verification.ts
│   │   ├── migrate.ts
│   │   ├── migration-performance-profile.ts
│   │   ├── migration-verification-framework.ts
│   │   ├── post-generate-transform.ts
│   │   ├── README.md
│   │   ├── reset-and-migrate-fresh.ts
│   │   ├── reset-and-migrate.ts
│   │   ├── reset-database-fixed.ts
│   │   ├── reset-database.ts
│   │   ├── reset.ts
│   │   ├── rollback-with-verification.ts
│   │   ├── run-migrations-sql.ts
│   │   ├── run-mwanga-migration.ts
│   │   ├── run-reset.sh
│   │   ├── run-reset.ts
│   │   ├── schema-drift-detection.ts
│   │   ├── SCRIPTS_GUIDE.md
│   │   ├── setup-schema.ts
│   │   ├── setup.ts
│   │   ├── simple-migrate.ts
│   │   ├── simple-reset.ts
│   │   ├── TYPE_GENERATION_GUIDE.md
│   │   ├── validate-migration.ts
│   │   ├── verify-alignment.ts
│   │   ├── verify-arguments-constitutional.ts
│   │   ├── verify-database-alignment.ts
│   │   ├── verify-schema-type-alignment-v2.ts
│   │   ├── verify-schema-type-alignment.ts
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
│   │   ├── primary-seed-aligned.ts
│   │   ├── primary-seed-direct.ts
│   │   ├── primary-seed.ts
│   │   ├── README.md
│   │   ├── secondary-seed-aligned.ts
│   │   ├── secondary-seed.ts
│   │   └── test-connection.ts
│   ├── validation/
│   │   └── audit-constraints.ts
│   ├── accessibility-audit.js
│   ├── add-js-extensions.ts
│   ├── analyze-bundle.cjs
│   ├── analyze-dependencies.ts
│   ├── analyze-infrastructure.ts
│   ├── apply-schema-direct.ts
│   ├── audit-quality.test.ts
│   ├── audit-quality.ts
│   ├── audit-security.test.ts
│   ├── audit-security.ts
│   ├── boundary-fix-phase2a.sh
│   ├── bundle-analysis-plugin.js
│   ├── bundle-analyzer.js
│   ├── CHANUKA_MIGRATION_PLAN.md
│   ├── check-bills.ts
│   ├── check-db-status.ts
│   ├── check-thresholds.js
│   ├── CLASSIFICATION.md
│   ├── cleanup-alert-preferences.ts
│   ├── convert-server-imports.ts
│   ├── db-fresh-start.sql
│   ├── dependency-cruiser.js
│   ├── deploy-production.js
│   ├── domain-type-migration-plan.md
│   ├── enum-alignment-audit.md
│   ├── fix-all-server-imports.ts
│   ├── fix-config.json
│   ├── fix-critical-demo-errors.ts
│   ├── fix-demo-errors.ts
│   ├── fix-duplicate-react-imports.ts
│   ├── fix-eslint-suppressions.ts
│   ├── fix-react-forwardref.ts
│   ├── fix-remaining-sql-injection.ts
│   ├── fix-sql-injection.ts
│   ├── fix-templates.ts
│   ├── fresh-db-push.sh
│   ├── generate-bundle-report.js
│   ├── generate-dependency-report.ts
│   ├── immediate-memory-cleanup.cjs
│   ├── jscpd.json
│   ├── LIFECYCLE.md
│   ├── migrate-alert-preferences.ts
│   ├── migrate-community-mvp.ts
│   ├── modern-project-analyzer.ts
│   ├── performance-budget-enforcer.cjs
│   ├── performance-regression-detector.js
│   ├── performance-trend-analyzer.cjs
│   ├── README.md
│   ├── scan-client-type-violations.ts
│   ├── scan-eslint-suppressions.ts
│   ├── scan-todos.ts
│   ├── scan-type-violations.ts
│   ├── setup-playwright.js
│   ├── start-mvp.ps1
│   ├── start-mvp.sh
│   ├── test-core-9-features.ts
│   ├── test-mvp-endpoints.sh
│   ├── test-mvp-integration.ts
│   ├── track-progress.ts
│   ├── tsconfig.json
│   ├── validate-infrastructure.ts
│   ├── validate-integration.ts
│   ├── verify-api-contract-coverage.ts
│   ├── verify-consistency.ts
│   ├── verify-metrics.ts
│   ├── vitest.config.ts
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
│   │   ├── API_VALIDATION_GUIDE.md
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
│   │   ├── admin/
│   │   │   ├── application/
│   │   │   │   ├── admin.routes.ts
│   │   │   │   ├── content-moderation.routes.ts
│   │   │   │   ├── external-api-dashboard.routes.ts
│   │   │   │   └── system.routes.ts
│   │   │   ├── domain/
│   │   │   │   └── moderation-service.ts
│   │   │   ├── infrastructure/
│   │   │   ├── moderation/
│   │   │   │   ├── content-analysis.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── moderation-analytics.service.ts
│   │   │   │   ├── moderation-decision.service.ts
│   │   │   │   ├── moderation-orchestrator.service.ts
│   │   │   │   ├── moderation-queue.service.ts
│   │   │   │   └── types.ts
│   │   │   ├── admin-router.ts
│   │   │   └── index.ts
│   │   ├── advocacy/
│   │   │   ├── application/
│   │   │   │   ├── action-coordinator.ts
│   │   │   │   ├── advocacy-validation.schemas.ts
│   │   │   │   ├── campaign-service.ts
│   │   │   │   ├── coalition-builder.ts
│   │   │   │   ├── enhanced-advocacy-service.ts
│   │   │   │   ├── impact-tracker.ts
│   │   │   │   └── monitoring-integration.ts
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
│   │   │   ├── presentation/
│   │   │   │   └── advocacy-router.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── advocacy-factory.ts
│   │   │   └── index.ts
│   │   ├── analysis/
│   │   │   ├── application/
│   │   │   │   ├── analysis-service-direct.ts
│   │   │   │   ├── analysis-validation.schemas.ts
│   │   │   │   ├── AnalysisApplicationService.ts
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
│   │   │   │   ├── adapters/
│   │   │   │   │   └── ml-service-adapter.ts
│   │   │   │   └── repositories/
│   │   │   │       └── analysis.repository.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── analysis-validation.schemas.ts
│   │   │   ├── analysis.routes.ts
│   │   │   └── architecture-analysis-report.md
│   │   ├── analytics/
│   │   │   ├── application/
│   │   │   │   ├── analytics-routes-integrated.ts
│   │   │   │   ├── analytics-service-integrated.ts
│   │   │   │   ├── analytics-validation.schemas.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   ├── engagement-analytics.routes.ts
│   │   │   │   ├── engagement-analytics.service.ts
│   │   │   │   ├── engagement-validation.schemas.ts
│   │   │   │   ├── enhanced-analytics-service.ts
│   │   │   │   ├── financial-disclosure-analytics.service.ts
│   │   │   │   ├── financial-disclosure-validation.schemas.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── ml-analysis.service.ts
│   │   │   │   ├── ml-validation.schemas.ts
│   │   │   │   └── transparency-dashboard.routes.ts
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
│   │   │   ├── domain/
│   │   │   │   ├── conflict-detection.service.ts
│   │   │   │   ├── legal-analysis.service.ts
│   │   │   │   ├── ml-analysis.service.ts
│   │   │   │   └── regulatory-change-monitoring.service.ts
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
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── engagement.repository.ts
│   │   │   │   │   ├── financial-disclosure.repository.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── ml-analysis.repository.ts
│   │   │   │   ├── performance-dashboard.ts
│   │   │   │   └── swagger.ts
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
│   │   │   ├── FIXES_APPLIED.md
│   │   │   ├── index.ts
│   │   │   └── MODERNIZATION_COMPLETE.md
│   │   ├── argument-intelligence/
│   │   │   ├── application/
│   │   │   │   ├── argument-intelligence-service.ts
│   │   │   │   ├── argument-processor.ts
│   │   │   │   ├── argument-validation.schemas.ts
│   │   │   │   ├── brief-generator.ts
│   │   │   │   ├── clustering-service.ts
│   │   │   │   ├── coalition-finder.ts
│   │   │   │   ├── comment-integration.ts
│   │   │   │   ├── enhanced-argument-intelligence-service.ts
│   │   │   │   ├── evidence-validator.ts
│   │   │   │   ├── nlp-pipeline-config.ts
│   │   │   │   ├── power-balancer.ts
│   │   │   │   └── structure-extractor.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── cache/
│   │   │   │   │   └── nlp-cache.ts
│   │   │   │   └── nlp/
│   │   │   │       ├── entity-extractor.ts
│   │   │   │       ├── quality-metrics.ts
│   │   │   │       ├── sentence-classifier.ts
│   │   │   │       ├── sentiment-analyzer.ts
│   │   │   │       └── similarity-calculator.ts
│   │   │   ├── types/
│   │   │   │   └── argument.types.ts
│   │   │   ├── API_DOCUMENTATION.md
│   │   │   ├── argument-intelligence-router.ts
│   │   │   ├── IMPLEMENTATION_STATUS.md
│   │   │   ├── index.ts
│   │   │   ├── INTEGRATION_SUMMARY.md
│   │   │   └── routes.ts
│   │   ├── bills/
│   │   │   ├── application/
│   │   │   │   ├── bill-integration-orchestrator.ts
│   │   │   │   ├── bill-lifecycle-hooks.ts
│   │   │   │   ├── bill-service-adapter.ts
│   │   │   │   ├── bill-service.ts
│   │   │   │   ├── bill-tracking.service.ts
│   │   │   │   ├── bill-validation.schemas.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-status.routes.ts
│   │   │   │   └── sponsorship-analysis.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── bill.ts
│   │   │   │   ├── errors/
│   │   │   │   │   └── bill-errors.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── bill-events.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── bill.repository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── bill-event-handler.ts
│   │   │   │   │   ├── bill-notification-service.ts
│   │   │   │   │   └── bill.domain.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── LegislativeStorageTypes.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   ├── bill-storage.ts
│   │   │   │   └── index.ts
│   │   │   ├── presentation/
│   │   │   │   └── http/
│   │   │   │       ├── bill-validation.middleware.ts
│   │   │   │       └── coverage-routes.ts
│   │   │   ├── repositories/
│   │   │   │   └── sponsorship-repository.ts
│   │   │   ├── services/
│   │   │   │   ├── mocks/
│   │   │   │   │   ├── impact-mock-data.ts
│   │   │   │   │   └── translation-mock-data.ts
│   │   │   │   ├── impact-calculator.ts
│   │   │   │   ├── translation-service.ts
│   │   │   │   └── voting-pattern-analysis-service.ts
│   │   │   ├── types/
│   │   │   │   └── analysis.ts
│   │   │   ├── action-prompts-routes.ts
│   │   │   ├── bill-status-monitor.ts
│   │   │   ├── bill-tracking.routes.ts
│   │   │   ├── bill.factory.ts
│   │   │   ├── bill.js
│   │   │   ├── BILLS_MIGRATION_ADAPTER.ts
│   │   │   ├── bills-router.ts
│   │   │   ├── index.ts
│   │   │   ├── INTEGRATION_GUIDE.md
│   │   │   ├── INTEGRATION_QUICK_START.md
│   │   │   ├── INTERNAL_CONSISTENCY_ANALYSIS.md
│   │   │   ├── legislative-storage.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── README.md
│   │   │   ├── real-time-tracking.ts
│   │   │   ├── sponsorship.routes.ts
│   │   │   ├── translation-routes.ts
│   │   │   ├── voting-pattern-analysis-router.ts
│   │   │   └── voting-pattern-analysis.ts
│   │   ├── community/
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── create-comment.use-case.ts
│   │   │   │   │   └── vote-on-comment.use-case.ts
│   │   │   │   ├── community-validation.schemas.ts
│   │   │   │   ├── CommunityApplicationService.ts
│   │   │   │   ├── enhanced-community-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── comment-vote.entity.ts
│   │   │   │   │   └── comment.entity.ts
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── IArgumentAnalysisService.ts
│   │   │   │   │   └── ICommentRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── comment-moderation.service.ts
│   │   │   │   │   └── comment-ranking.service.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── engagement-score.ts
│   │   │   │   │   └── trending-score.ts
│   │   │   │   └── index.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── mock/
│   │   │   │       ├── index.ts
│   │   │   │       ├── MockArgumentAnalysisService.ts
│   │   │   │       └── MockCommentRepository.ts
│   │   │   ├── presentation/
│   │   │   │   └── http/
│   │   │   │       ├── community-routes.ts
│   │   │   │       └── community-validation.middleware.ts
│   │   │   ├── comment-voting.ts
│   │   │   ├── comment.ts
│   │   │   ├── community.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── social-integration.ts
│   │   │   ├── social-share-storage.d.ts
│   │   │   └── social-share-storage.ts
│   │   ├── constitutional-analysis/
│   │   │   ├── application/
│   │   │   │   ├── constitutional-analysis-service.ts
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
│   │   │   │   ├── use-cases/
│   │   │   │   │   └── analyze-bill-constitutionality.use-case.ts
│   │   │   │   ├── constitutional-service.ts
│   │   │   │   ├── constitutional-validation.schemas.ts
│   │   │   │   ├── enhanced-constitutional-intelligence-service.ts
│   │   │   │   ├── expert-review-workflow.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── monitoring-integration.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── constitutional-analysis.entity.ts
│   │   │   │   │   ├── constitutional-provision.entity.ts
│   │   │   │   │   └── constitutional-provision.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── provision-matcher.service.ts
│   │   │   │   │   └── violation-detector.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── API.md
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   └── routes.ts
│   │   ├── electoral-accountability/
│   │   │   ├── application/
│   │   │   │   ├── electoral-accountability-auth.middleware.ts
│   │   │   │   └── electoral-accountability.routes.ts
│   │   │   ├── domain/
│   │   │   │   ├── electoral-accountability.constants.ts
│   │   │   │   ├── electoral-accountability.errors.ts
│   │   │   │   ├── electoral-accountability.service.test.ts
│   │   │   │   ├── electoral-accountability.service.ts
│   │   │   │   ├── electoral-accountability.validation.ts
│   │   │   │   └── gap-calculation-automation.service.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── electoral-accountability-cache.service.ts
│   │   │   │   ├── voting-record-importer.ts
│   │   │   │   └── voting-record.repository.ts
│   │   │   ├── AUDIT_AND_OPTIMIZATION_COMPLETE.md
│   │   │   ├── index.ts
│   │   │   ├── OPTIMIZATION_IMPLEMENTATION_SUMMARY.md
│   │   │   ├── QUALITY_AUDIT_REPORT.md
│   │   │   └── README.md
│   │   ├── feature-flags/
│   │   │   ├── application/
│   │   │   │   ├── controller.ts
│   │   │   │   ├── feature-flag-validation.schemas.ts
│   │   │   │   ├── FeatureFlagApplicationService.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   └── routes.ts
│   │   │   ├── domain/
│   │   │   │   ├── service.ts
│   │   │   │   └── types.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── repository.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   └── verify-implementation.ts
│   │   ├── government-data/
│   │   │   ├── api/
│   │   │   │   └── institutional/
│   │   │   │       └── api-gateway-service.ts
│   │   │   ├── application/
│   │   │   │   ├── enhanced-government-data-service.ts
│   │   │   │   ├── government-data-validation.schemas.ts
│   │   │   │   ├── managed-integration.service.ts
│   │   │   │   └── sync-service.ts
│   │   │   ├── services/
│   │   │   │   ├── api-integrations.service.ts
│   │   │   │   ├── data-validation-pipeline.service.ts
│   │   │   │   ├── gazette-scraper.service.ts
│   │   │   │   ├── government-data-integration.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── parliament-scraper.service.ts
│   │   │   ├── index.ts
│   │   │   └── routes.ts
│   │   ├── market/
│   │   │   ├── market.controller.ts
│   │   │   ├── market.service.ts
│   │   │   └── market.utils.ts
│   │   ├── ml/
│   │   │   ├── config/
│   │   │   │   └── mwanga-config.ts
│   │   │   ├── evaluation/
│   │   │   │   └── evaluation-orchestrator.ts
│   │   │   ├── models/
│   │   │   │   ├── base-analyzer.ts
│   │   │   │   ├── bill-summarizer.ts
│   │   │   │   ├── conflict-detector.ts
│   │   │   │   ├── constitutional-analyzer.ts
│   │   │   │   ├── content-classifier.ts
│   │   │   │   ├── electoral-accountability-analyzer.ts
│   │   │   │   ├── engagement-predictor.ts
│   │   │   │   ├── example-usage.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── influence-network-analyzer.ts
│   │   │   │   ├── OLD_VS_NEW_COMPARISON.md
│   │   │   │   ├── README.md
│   │   │   │   ├── sentiment-analyzer.ts
│   │   │   │   ├── transparency-analyzer.ts
│   │   │   │   ├── trojan-bill-detector.ts
│   │   │   │   └── types.ts
│   │   │   ├── python-service/
│   │   │   │   ├── app.py
│   │   │   │   └── requirements.txt
│   │   │   ├── scripts/
│   │   │   │   └── test-services.ts
│   │   │   ├── services/
│   │   │   │   ├── analysis-pipeline.ts
│   │   │   │   ├── ml-integration.ts
│   │   │   │   ├── ml-orchestrator.ts
│   │   │   │   ├── ollama-client.ts
│   │   │   │   └── python-service-client.ts
│   │   │   ├── testing/
│   │   │   │   ├── cli-tester.ts
│   │   │   │   └── test-server.ts
│   │   │   ├── COMPLETE_IMPLEMENTATION_SUMMARY.md
│   │   │   ├── IMPLEMENTATION_COMPARISON.md
│   │   │   ├── index.ts
│   │   │   ├── MIGRATION_COMPLETE.md
│   │   │   ├── README.md
│   │   │   ├── SETUP_GUIDE.md
│   │   │   └── SETUP.md
│   │   ├── monitoring/
│   │   │   ├── application/
│   │   │   │   └── monitoring.routes.ts
│   │   │   ├── domain/
│   │   │   │   ├── alerting.service.ts
│   │   │   │   └── integration-monitor.service.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── metrics-middleware.ts
│   │   │   ├── regulatory/
│   │   │   │   ├── index.ts
│   │   │   │   └── regulatory-monitoring.routes.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── notifications/
│   │   │   ├── application/
│   │   │   │   ├── dto/
│   │   │   │   ├── services/
│   │   │   │   │   ├── alert-delivery.service.ts
│   │   │   │   │   ├── alert-preference-management.service.ts
│   │   │   │   │   ├── alerting-service.ts
│   │   │   │   │   └── notification.service.ts
│   │   │   │   ├── use-cases/
│   │   │   │   ├── notification-orchestrator.ts
│   │   │   │   ├── notification-scheduler.ts
│   │   │   │   ├── notifications-validation.schemas.ts
│   │   │   │   └── NotificationsService.ts
│   │   │   ├── docs/
│   │   │   │   ├── alert-preferences-integration.md
│   │   │   │   ├── integration_guide.md
│   │   │   │   └── refactored_summary.md
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── alert-preference.ts
│   │   │   │   │   └── notification.ts
│   │   │   │   ├── events/
│   │   │   │   ├── services/
│   │   │   │   │   ├── alert-preference-domain.service.ts
│   │   │   │   │   ├── alert-preference.service.ts
│   │   │   │   │   └── smart-notification-filter.ts
│   │   │   │   ├── value-objects/
│   │   │   │   └── types.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── external/
│   │   │   │   └── persistence/
│   │   │   │       └── NotificationRepository.ts
│   │   │   ├── presentation/
│   │   │   │   ├── http/
│   │   │   │   │   ├── alert-preference-routes.ts
│   │   │   │   │   └── notification-routes.ts
│   │   │   │   └── websocket/
│   │   │   ├── action-prompt-generator.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── pretext-detection/
│   │   │   ├── application/
│   │   │   │   ├── pretext-detection.controller.ts
│   │   │   │   ├── pretext-detection.routes.ts
│   │   │   │   ├── pretext-detection.service.ts
│   │   │   │   └── pretext-validation.schemas.ts
│   │   │   ├── domain/
│   │   │   │   ├── pretext-analysis.service.ts
│   │   │   │   └── types.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── pretext-cache.ts
│   │   │   │   ├── pretext-health-check.ts
│   │   │   │   └── pretext-repository.ts
│   │   │   ├── scripts/
│   │   │   │   └── register-feature.ts
│   │   │   ├── API.md
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── INTEGRATION_COMPLETE.md
│   │   │   └── README.md
│   │   ├── privacy/
│   │   │   ├── application/
│   │   │   │   ├── privacy-scheduler.ts
│   │   │   │   ├── privacy-validation.schemas.ts
│   │   │   │   └── privacy.routes.ts
│   │   │   ├── domain/
│   │   │   │   └── privacy-service.ts
│   │   │   ├── infrastructure/
│   │   │   └── index.ts
│   │   ├── recommendation/
│   │   │   ├── application/
│   │   │   │   ├── EngagementTracker.ts
│   │   │   │   ├── recommendation-validation.schemas.ts
│   │   │   │   ├── recommendation.routes.ts
│   │   │   │   └── RecommendationService.ts
│   │   │   ├── domain/
│   │   │   │   ├── EngagementScorer.ts
│   │   │   │   ├── recommendation.dto.ts
│   │   │   │   ├── RecommendationEngine.ts
│   │   │   │   └── RecommendationValidator.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── RecommendationCache.ts
│   │   │   │   └── RecommendationRepository.ts
│   │   │   ├── scripts/
│   │   │   │   └── register-monitoring.ts
│   │   │   ├── API.md
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── RecommendationController.ts
│   │   │   └── TASK-1.5-COMPLETION-SUMMARY.md
│   │   ├── safeguards/
│   │   │   ├── application/
│   │   │   │   ├── cib-detection-service.ts
│   │   │   │   ├── moderation-service.ts
│   │   │   │   └── rate-limit-service.ts
│   │   │   └── infrastructure/
│   │   │       └── safeguard-jobs.ts
│   │   ├── search/
│   │   │   ├── application/
│   │   │   │   ├── search-validation.schemas.ts
│   │   │   │   ├── SearchService.ts
│   │   │   │   └── SearchServiceWrapper.ts
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
│   │   │   │   └── semantic-search.engine.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── SearchCache.ts
│   │   │   │   ├── SearchIndexManager.ts
│   │   │   │   ├── SearchQueryBuilder.ts
│   │   │   │   └── SearchRepository.ts
│   │   │   ├── monitoring/
│   │   │   │   └── search-performance-monitor.ts
│   │   │   ├── presentation/
│   │   │   │   └── http/
│   │   │   │       └── search-validation.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── embedding.service.ts
│   │   │   │   └── history-cleanup.service.ts
│   │   │   ├── utils/
│   │   │   │   ├── parallel-query-executor.ts
│   │   │   │   └── search-syntax-parser.ts
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── SearchController-migrated.ts
│   │   │   └── SearchController.ts
│   │   ├── security/
│   │   │   ├── application/
│   │   │   │   └── services/
│   │   │   │       ├── index.ts
│   │   │   │       └── secure-query-builder.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── config/
│   │   │   │   │   └── security-config.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── encryption.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input-sanitization.service.ts
│   │   │   │   │   ├── query-validation.service.ts
│   │   │   │   │   └── tls-config.service.ts
│   │   │   │   └── value-objects/
│   │   │   │       ├── index.ts
│   │   │   │       ├── pagination-params.ts
│   │   │   │       ├── query-validation-result.ts
│   │   │   │       └── secure-query.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── metrics/
│   │   │   │   │   └── query-metrics.service.ts
│   │   │   │   └── services/
│   │   │   │       ├── data-privacy.service.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── intrusion-detection.service.ts
│   │   │   │       ├── privacy.service.ts
│   │   │   │       ├── security-audit.service.ts
│   │   │   │       ├── security-initialization.service.ts
│   │   │   │       └── security-monitoring.service.ts
│   │   │   ├── ARCHITECTURE.md
│   │   │   ├── DDD_MIGRATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── REFACTORING_COMPLETE.md
│   │   │   ├── security-event-logger.ts
│   │   │   ├── security-middleware.ts
│   │   │   ├── security-monitoring.ts
│   │   │   └── security-policy.ts
│   │   ├── sponsors/
│   │   │   ├── accountability/
│   │   │   │   ├── ledger.controller.ts
│   │   │   │   └── ledger.service.ts
│   │   │   ├── application/
│   │   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   │   ├── sponsor-service-direct.ts
│   │   │   │   ├── sponsors-validation.schemas.ts
│   │   │   │   └── SponsorsService.ts
│   │   │   ├── domain/
│   │   │   │   └── repositories/
│   │   │   │       └── sponsor.repository.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── repositories/
│   │   │   ├── types/
│   │   │   │   ├── analysis.ts
│   │   │   │   └── index.ts
│   │   │   ├── CONFLICT_ANALYSIS_FIXES_NEEDED.md
│   │   │   ├── index.ts
│   │   │   ├── REWRITE_COMPLETE.md
│   │   │   ├── SPONSORS_MODULE_COMPLETE.md
│   │   │   └── sponsors.routes.ts
│   │   ├── universal_access/
│   │   │   ├── application/
│   │   │   │   ├── ussd-validation.schemas.ts
│   │   │   │   └── UssdService.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
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
│   │   │   │   ├── profile-migrated.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── user-application-service.ts
│   │   │   │   ├── user-service-direct.ts
│   │   │   │   ├── user-validation.schemas.ts
│   │   │   │   ├── UserProfileService.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── UserService.ts
│   │   │   │   ├── verification-migrated.ts
│   │   │   │   ├── verification.ts
│   │   │   │   └── VerificationService.ts
│   │   │   ├── domain/
│   │   │   │   ├── aggregates/
│   │   │   │   │   └── user-aggregate.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── citizen-verification.ts
│   │   │   │   │   ├── user-profile.ts
│   │   │   │   │   ├── user.ts
│   │   │   │   │   └── value-objects.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── user.repository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── profile-domain-service.ts
│   │   │   │   │   ├── user-management-domain-service.ts
│   │   │   │   │   ├── user-verification-domain-service.ts
│   │   │   │   │   ├── user.domain.service.ts
│   │   │   │   │   └── verification-domain-service.ts
│   │   │   │   ├── citizen-verification.ts
│   │   │   │   ├── ExpertVerificationService.ts
│   │   │   │   ├── user-management.ts
│   │   │   │   ├── user-preferences.ts
│   │   │   │   └── user-profile.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   ├── email-service.ts
│   │   │   │   ├── government-data-service.ts
│   │   │   │   ├── notification-service.ts
│   │   │   │   ├── user-storage.d.ts
│   │   │   │   ├── user-storage.ts
│   │   │   │   └── UserRepository.ts
│   │   │   ├── presentation/
│   │   │   │   └── http/
│   │   │   │       └── user-validation.middleware.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   ├── README.md
│   │   │   └── user.factory.ts
│   │   ├── ANALYTICS_VS_ANALYSIS.md
│   │   ├── CONTINUATION_SUMMARY.md
│   │   ├── DDD_COMPLETION_SUMMARY.md
│   │   ├── FEATURE_RELATIONSHIP_MAP.md
│   │   ├── index.ts
│   │   ├── LOGGING_STANDARDIZATION_SUMMARY.md
│   │   ├── MODERNIZATION_COMPLETE.md
│   │   ├── MODULES_REWRITE_SUMMARY.md
│   │   ├── QUICK_REFERENCE.md
│   │   ├── README.md
│   │   ├── search-suggestions.ts
│   │   └── SECURITY_INTEGRATION_PHASE1_SUMMARY.md
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── mappings/
│   │   │   │   ├── bill-mapping.ts
│   │   │   │   ├── comment-mapping.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notification-mapping.ts
│   │   │   │   └── user-mapping.ts
│   │   │   └── drizzle-adapter.ts
│   │   ├── auth/
│   │   │   ├── auth-service.ts
│   │   │   ├── auth.ts
│   │   │   ├── index.ts
│   │   │   ├── jwt-types.ts
│   │   │   ├── secure-session-service.ts
│   │   │   └── session-cleanup.ts
│   │   ├── cache/
│   │   │   ├── adapters/
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── browser-adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-adapter.ts
│   │   │   │   ├── multi-tier-adapter.ts
│   │   │   │   └── redis-adapter.ts
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
│   │   │   │   ├── index.ts
│   │   │   │   └── metrics-collector.ts
│   │   │   ├── patterns/
│   │   │   │   ├── index.ts
│   │   │   │   └── invalidation.ts
│   │   │   ├── serialization/
│   │   │   │   └── cache-serializer.ts
│   │   │   ├── strategies/
│   │   │   │   ├── circuit-breaker-strategy.ts
│   │   │   │   ├── compression-strategy.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── tagging-strategy.ts
│   │   │   ├── tagging/
│   │   │   │   └── tag-manager.ts
│   │   │   ├── utilities/
│   │   │   │   ├── cache-compressor.ts
│   │   │   │   ├── cache-tag-manager.ts
│   │   │   │   └── cache-warmer.ts
│   │   │   ├── warming/
│   │   │   │   ├── cache-warmer.ts
│   │   │   │   └── strategies.ts
│   │   │   ├── ADAPTER_VERIFICATION_REPORT.md
│   │   │   ├── adapters-factory-integration.test.ts
│   │   │   ├── advanced-caching.service.ts
│   │   │   ├── ai-cache.ts
│   │   │   ├── ARCHITECTURE.md
│   │   │   ├── CACHE_PATTERNS.md
│   │   │   ├── cache-core.test.ts
│   │   │   ├── cache-factory.ts
│   │   │   ├── cache-integration.test.ts
│   │   │   ├── cache-keys.ts
│   │   │   ├── cache-wrappers.test.ts
│   │   │   ├── cache-wrappers.ts
│   │   │   ├── caching-service.test.ts
│   │   │   ├── caching-service.ts
│   │   │   ├── decorators.ts
│   │   │   ├── factory.test.ts
│   │   │   ├── factory.ts
│   │   │   ├── icaching-service.ts
│   │   │   ├── index.ts
│   │   │   ├── intelligent-cache.ts
│   │   │   ├── interfaces.ts
│   │   │   ├── key-generator.ts
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   ├── performance-benchmark.ts
│   │   │   ├── PHASE1_COMPLETION_REPORT.md
│   │   │   ├── PHASE1_FINAL_STATUS.md
│   │   │   ├── README.md
│   │   │   ├── REFACTORING_PLAN.md
│   │   │   ├── server-cache-wrapper.ts
│   │   │   ├── simple-factory.ts
│   │   │   ├── single-flight-cache.ts
│   │   │   ├── test-basic.ts
│   │   │   ├── test-comprehensive.ts
│   │   │   ├── test-performance.ts
│   │   │   ├── test-utilities.ts
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   ├── config/
│   │   │   ├── HOT_RELOAD_COMPARISON.md
│   │   │   ├── index.ts
│   │   │   ├── manager.test.ts
│   │   │   ├── manager.ts
│   │   │   ├── RESULT_TYPE_USAGE.md
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── utilities.ts
│   │   ├── database/
│   │   │   ├── base/
│   │   │   │   └── BaseStorage.ts
│   │   │   ├── connections/
│   │   │   │   ├── connection-router.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── pool-manager.ts
│   │   │   │   └── transaction-manager.ts
│   │   │   ├── core/
│   │   │   │   ├── config.ts
│   │   │   │   ├── connection-manager.ts
│   │   │   │   ├── database-orchestrator.ts
│   │   │   │   ├── database-service.ts
│   │   │   │   ├── health-monitor.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── unified-config.ts
│   │   │   ├── docs/
│   │   │   │   └── schema-validation.md
│   │   │   ├── graph/
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── advanced-analytics.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── influence-service.ts
│   │   │   │   │   ├── network-discovery.ts
│   │   │   │   │   ├── pattern-discovery-service.ts
│   │   │   │   │   ├── pattern-discovery.ts
│   │   │   │   │   └── recommendation-engine.ts
│   │   │   │   ├── config/
│   │   │   │   │   ├── graph-config.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── app-init.ts
│   │   │   │   │   ├── batch-sync-runner.ts
│   │   │   │   │   ├── graphql-api.ts
│   │   │   │   │   ├── idempotency-ledger.ts
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
│   │   │   │   ├── sync/
│   │   │   │   │   ├── advanced-relationships.ts
│   │   │   │   │   ├── advanced-sync.ts
│   │   │   │   │   ├── array-field-sync.ts
│   │   │   │   │   ├── conflict-resolver.ts
│   │   │   │   │   ├── engagement-networks.ts
│   │   │   │   │   ├── engagement-sync.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── institutional-networks.ts
│   │   │   │   │   ├── network-sync.ts
│   │   │   │   │   ├── parliamentary-networks.ts
│   │   │   │   │   ├── relationships.ts
│   │   │   │   │   ├── safeguards-networks.ts
│   │   │   │   │   └── sync-monitoring.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── cache-adapter-v2.ts
│   │   │   │   │   ├── error-adapter-v2.ts
│   │   │   │   │   ├── error-classifier.ts
│   │   │   │   │   ├── health-adapter-v2.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── operation-guard.ts
│   │   │   │   │   ├── query-builder.ts
│   │   │   │   │   ├── result-normalizer.ts
│   │   │   │   │   ├── retry-utils.ts
│   │   │   │   │   ├── session-manager.ts
│   │   │   │   │   └── test-harness.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── REFACTORING_SUMMARY.md
│   │   │   ├── migrations/
│   │   │   │   ├── 20260224_feature_flags.sql
│   │   │   │   ├── 20260224_pretext_detection.sql
│   │   │   │   ├── 20260301_create_argument_analysis_table.sql
│   │   │   │   ├── 20260301_create_comments_table.sql
│   │   │   │   ├── 20260301_seed_mock_community_data.sql
│   │   │   │   ├── 20260306_mwanga_stack_schema.sql
│   │   │   │   └── 20260306_mwanga_stack_schema.sql.backup
│   │   │   ├── monitoring/
│   │   │   │   ├── health-checker.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── metrics-collector.ts
│   │   │   │   └── query-logger.ts
│   │   │   ├── persistence/
│   │   │   │   ├── drizzle/
│   │   │   │   │   ├── drizzle-bill-repository.ts
│   │   │   │   │   ├── drizzle-sponsor-repository.ts
│   │   │   │   │   ├── drizzle-user-repository.ts
│   │   │   │   │   ├── hybrid-bill-repository.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── lazy-loader.ts
│   │   │   ├── repository/
│   │   │   │   ├── base-repository.ts
│   │   │   │   ├── errors.ts
│   │   │   │   └── test-utils.ts
│   │   │   ├── strategies/
│   │   │   │   ├── index.ts
│   │   │   │   ├── retry-strategy.ts
│   │   │   │   └── routing-strategy.ts
│   │   │   ├── utils/
│   │   │   │   └── base-script.ts
│   │   │   ├── connection.ts
│   │   │   ├── DATASERVICE_MIGRATION_PLAN.md
│   │   │   ├── example-usage.ts
│   │   │   ├── index.ts
│   │   │   ├── init.ts
│   │   │   ├── initialize.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── PHASE1_COMPLETION_SUMMARY.md
│   │   │   ├── PHASE2_COMPLETION_SUMMARY.md
│   │   │   ├── PHASE3_COMPLETION_SUMMARY.md
│   │   │   ├── PHASE4_COMPLETION_SUMMARY.md
│   │   │   ├── pool.ts
│   │   │   ├── REFACTORING_ANALYSIS.md
│   │   │   ├── REFACTORING_COMPLETE.md
│   │   │   └── repository-validation.ts
│   │   ├── error-handling/
│   │   │   ├── error-factory.ts
│   │   │   ├── external-api-error-handler.ts
│   │   │   ├── http-error-handler.ts
│   │   │   ├── index.ts
│   │   │   ├── resilience.ts
│   │   │   ├── result-types.ts
│   │   │   └── types.ts
│   │   ├── external-data/
│   │   │   ├── conflict-resolution-service.ts
│   │   │   ├── data-synchronization-service.ts
│   │   │   ├── external-api-manager.ts
│   │   │   ├── government-api-client.ts
│   │   │   ├── government-api-config.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── integration/
│   │   │   └── feature-integration-helper.ts
│   │   ├── messaging/
│   │   │   ├── delivery/
│   │   │   │   └── channel.service.ts
│   │   │   ├── email/
│   │   │   │   └── email-service.ts
│   │   │   ├── push/
│   │   │   │   └── push-service.ts
│   │   │   ├── sms/
│   │   │   │   └── sms-service.ts
│   │   │   └── ARCHITECTURE.md
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
│   │   │   └── index.ts
│   │   ├── observability/
│   │   │   ├── core/
│   │   │   │   ├── index.ts
│   │   │   │   ├── log-buffer.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── types.ts
│   │   │   ├── http/
│   │   │   │   ├── audit-middleware.ts
│   │   │   │   └── response-wrapper.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── error-tracker.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── log-aggregator.ts
│   │   │   │   ├── monitoring-policy.ts
│   │   │   │   ├── monitoring-scheduler.ts
│   │   │   │   ├── performance-monitor.ts
│   │   │   │   └── performance-monitoring.service.ts
│   │   │   ├── api-cost-monitoring.service.ts
│   │   │   ├── database-logger.ts
│   │   │   ├── index.ts
│   │   │   └── logging-config.ts
│   │   ├── privacy/
│   │   │   ├── index.ts
│   │   │   └── privacy-facade.ts
│   │   ├── safeguards/
│   │   │   ├── index.ts
│   │   │   └── safeguards-facade.ts
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
│   │   │   ├── CIRCULAR_DEPENDENCIES.md
│   │   │   ├── citizen_participation.ts
│   │   │   ├── constitutional_intelligence.ts
│   │   │   ├── electoral_accountability.ts
│   │   │   ├── enum-validator.ts
│   │   │   ├── enum.ts
│   │   │   ├── ERROR_FIXES_GUIDE.md
│   │   │   ├── expert_verification.ts
│   │   │   ├── feature_flags.ts
│   │   │   ├── foundation.ts
│   │   │   ├── graph_sync.ts
│   │   │   ├── impact_measurement.ts
│   │   │   ├── index-full.ts.backup
│   │   │   ├── index.ts
│   │   │   ├── integration_monitoring.ts
│   │   │   ├── integration-extended.ts
│   │   │   ├── integration.ts
│   │   │   ├── integrity_operations.ts
│   │   │   ├── market_intelligence.ts
│   │   │   ├── migration-state.ts
│   │   │   ├── ml_intelligence.ts
│   │   │   ├── ML_SCHEMA_INTEGRATION.md
│   │   │   ├── parliamentary_process.ts
│   │   │   ├── participation_oversight.ts
│   │   │   ├── platform_operations.ts
│   │   │   ├── political_economy.ts
│   │   │   ├── real_time_engagement.ts
│   │   │   ├── REFINEMENT_SUMMARY.md
│   │   │   ├── safeguards.ts
│   │   │   ├── schema-generators.ts
│   │   │   ├── search_system.ts
│   │   │   ├── shared-relations.ts
│   │   │   ├── sync-triggers.ts
│   │   │   ├── transparency_analysis.ts
│   │   │   ├── transparency_intelligence.ts
│   │   │   ├── trojan_bill_detection.ts
│   │   │   ├── universal_access.ts
│   │   │   ├── validate-static.ts
│   │   │   ├── validation-integration.ts
│   │   │   └── websocket.ts
│   │   ├── security/
│   │   │   └── README.md
│   │   ├── validation/
│   │   │   ├── data-completeness.ts
│   │   │   ├── data-validation-service.ts
│   │   │   ├── data-validation.ts
│   │   │   ├── index.ts
│   │   │   ├── input-validation-service.ts
│   │   │   ├── middleware.ts
│   │   │   ├── schema-validation-service.ts
│   │   │   ├── security-schemas.ts
│   │   │   ├── validation-helpers.ts
│   │   │   ├── validation-metrics.ts
│   │   │   ├── validation-services-init.ts
│   │   │   └── validation-utils.ts
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
│   │   │   ├── index.ts
│   │   │   ├── integration-demo.js
│   │   │   ├── README.md
│   │   │   ├── service-validation.js
│   │   │   ├── test-runner.js
│   │   │   ├── types.ts
│   │   │   └── VALIDATION_SUMMARY.md
│   │   ├── demo-data.ts
│   │   ├── feature-flags.ts
│   │   ├── index.ts
│   │   ├── SERVER_SETUP_GUIDE.md
│   │   ├── services-init.ts
│   │   └── StorageTypes.ts
│   ├── middleware/
│   │   ├── api-contract-validation.ts
│   │   ├── api-versioning.ts
│   │   ├── app-middleware.ts
│   │   ├── auth-types.ts
│   │   ├── auth.ts
│   │   ├── boom-error-middleware.ts
│   │   ├── cache-middleware.ts
│   │   ├── circuit-breaker-middleware.ts
│   │   ├── error-management.ts
│   │   ├── index.ts
│   │   ├── privacy-middleware.ts
│   │   ├── rate-limit-config.ts
│   │   ├── rate-limiter.ts
│   │   ├── safeguards.ts
│   │   ├── security.middleware.ts
│   │   ├── service-availability.ts
│   │   └── validation-middleware.ts
│   ├── routes/
│   ├── scripts/
│   │   ├── seeds/
│   │   ├── analyze-module-errors.ts
│   │   ├── api-race-condition-detector.ts
│   │   ├── deploy-repository-migration.ts
│   │   ├── deploy-websocket-migration.ts
│   │   ├── error-analysis.ts
│   │   ├── execute-websocket-migration.ts
│   │   ├── final-migration-validation.ts
│   │   ├── fix-constants-imports.ts
│   │   ├── fix-invalid-imports.ts
│   │   ├── fix-logger-calls.ts
│   │   ├── fix-module-resolution.ts
│   │   ├── fix-mvp-core-features.ts
│   │   ├── fix-return-statements.js
│   │   ├── fix-shared-core-imports.ts
│   │   ├── fix-shared-imports.js
│   │   ├── migrate-database-access.ts
│   │   ├── migration-runner.ts
│   │   ├── quick-fix-common-errors.ts
│   │   ├── run-websocket-validation.ts
│   │   ├── simple-websocket-validation.ts
│   │   ├── test-conflict-analysis.ts
│   │   ├── test-government-integration.ts
│   │   ├── test-websocket-migration.ts
│   │   ├── update-schema-imports.ts
│   │   ├── validate-connection-migration.ts
│   │   ├── verify-external-api-management.ts
│   │   └── websocket-performance-validation.ts
│   ├── tests/
│   │   ├── integration/
│   │   │   └── websocket-service.test.ts
│   │   ├── unit/
│   │   │   ├── infrastructure/
│   │   │   │   └── websocket/
│   │   │   │       └── connection-manager.test.ts
│   │   │   ├── mocks/
│   │   │   │   └── mock-data.ts
│   │   │   └── compilation-infrastructure.test.ts
│   │   ├── utils/
│   │   │   ├── compilation-test.helpers.ts
│   │   │   ├── compilation-test.utils.ts
│   │   │   ├── logger.ts
│   │   │   ├── README.md
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
│   │   ├── common.ts
│   │   ├── index.ts
│   │   ├── jest-extensions.d.ts
│   │   └── shared-schema-short.d.ts
│   ├── utils/
│   │   ├── analytics-controller-wrapper.ts
│   │   ├── anonymity-service.ts
│   │   ├── api-response-helpers.ts
│   │   ├── api-utils.ts
│   │   ├── cache-utils.ts
│   │   ├── createErrorContext.ts
│   │   ├── crypto.ts
│   │   ├── db-helpers.ts
│   │   ├── db-init.ts
│   │   ├── featureFlags.ts
│   │   ├── metrics.ts
│   │   ├── missing-modules-fallback.ts
│   │   ├── port-manager.ts
│   │   ├── preflight-check.ts
│   │   ├── README.md
│   │   ├── request-utils.ts
│   │   ├── response-helpers.ts
│   │   └── validation.ts
│   ├── BUG_FIX_PLAN.md
│   ├── BUG_FIX_PROGRESS_REPORT.md
│   ├── BUG_FIX_SUMMARY.md
│   ├── BUGS_FIXED_COMPREHENSIVE.md
│   ├── BUGS_FIXED.md
│   ├── core-features-errors.txt
│   ├── DEMO_READY_CONFIRMATION.md
│   ├── dev.ts
│   ├── err.log
│   ├── err2.log
│   ├── err3.log
│   ├── err4.log
│   ├── err5.log
│   ├── err6.log
│   ├── err7.log
│   ├── err8.log
│   ├── err9.log
│   ├── err10.log
│   ├── err11.log
│   ├── err12.log
│   ├── err13.log
│   ├── err14.log
│   ├── err15.log
│   ├── err16.log
│   ├── err17.log
│   ├── err18.log
│   ├── err19.log
│   ├── err21.log
│   ├── err22.log
│   ├── err23.log
│   ├── err24.log
│   ├── err25.log
│   ├── err26.log
│   ├── err27.log
│   ├── err28.log
│   ├── err29.log
│   ├── err30.log
│   ├── err31.log
│   ├── FINAL_BUG_STATUS.md
│   ├── fix_logger_ast.js
│   ├── fix_logger.js
│   ├── FIXES_APPLIED_2026-03-09.md
│   ├── full_err_tsc_index.txt
│   ├── full_err_tsc.txt
│   ├── full_err_tsc2.txt
│   ├── full_err.txt
│   ├── full_err2.txt
│   ├── full_err3.txt
│   ├── full_err4.txt
│   ├── full_err5.txt
│   ├── full_err6.txt
│   ├── full_err7.txt
│   ├── full_err8.txt
│   ├── full_err9.txt
│   ├── full_err10.txt
│   ├── full_err11.txt
│   ├── full_err12.txt
│   ├── full_err13.txt
│   ├── full_err14.txt
│   ├── full_err15.txt
│   ├── full_err16.txt
│   ├── full_err17.txt
│   ├── full_err18.txt
│   ├── full_err19.txt
│   ├── full_err20.txt
│   ├── full_err21.txt
│   ├── full_err22.txt
│   ├── full_err23.txt
│   ├── full_err24.txt
│   ├── full_err25.txt
│   ├── full_err26.txt
│   ├── full_err27.txt
│   ├── full_err28.txt
│   ├── full_err29.txt
│   ├── index.ts
│   ├── loader.mjs
│   ├── MVP_CORE_FEATURES_STATUS.md
│   ├── NETWORK_ERROR_DIAGNOSIS.md
│   ├── out30.log
│   ├── package.json
│   ├── project.json
│   ├── QUICK_START_AFTER_BUG_FIX.md
│   ├── QUICK_START.md
│   ├── README_BUG_FIXES.md
│   ├── resolve-paths-hook.mjs
│   ├── resolve-paths.mjs
│   ├── SERVER_RUNNING_STATUS.md
│   ├── server_startup.log
│   ├── server-startup.log
│   ├── server-startup.ts
│   ├── start-server.ts
│   ├── start.ts
│   ├── startup_error.log
│   ├── STARTUP_FIXES_2026-03-09.md
│   ├── STARTUP_FIXES.md
│   ├── test-startup.ts
│   ├── tsconfig.json
│   ├── type-check-after-logger-fix.txt
│   ├── type-check-latest.txt
│   ├── type-check-output.txt
│   ├── vite.config.ts
│   ├── vite.ts
│   └── vitest.config.ts
├── shared/
│   ├── constants/
│   │   ├── features/
│   │   │   ├── advocacy.ts
│   │   │   ├── analytics.ts
│   │   │   ├── argument-intelligence.ts
│   │   │   ├── bills.ts
│   │   │   ├── community.ts
│   │   │   ├── notifications.ts
│   │   │   ├── search.ts
│   │   │   ├── sponsors.ts
│   │   │   └── users.ts
│   │   ├── error-codes.ts
│   │   ├── feature-flags.ts
│   │   ├── index.ts
│   │   └── limits.ts
│   ├── core/
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
│   │   │   ├── examples.disabled/
│   │   │   │   └── concurrency-migration-example.ts
│   │   │   ├── formatting/
│   │   │   │   ├── currency.ts
│   │   │   │   ├── date-time.test.ts
│   │   │   │   ├── date-time.ts
│   │   │   │   ├── document.ts
│   │   │   │   ├── file-size.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── location.ts
│   │   │   │   └── status.ts
│   │   │   ├── images/
│   │   │   │   └── image-utils.ts
│   │   │   ├── anonymity-interface.ts
│   │   │   ├── async-utils.ts
│   │   │   ├── CLIENT_SAFE_UTILITIES.md
│   │   │   ├── common-utils.ts
│   │   │   ├── concurrency-migration-router.ts.disabled
│   │   │   ├── constants.ts
│   │   │   ├── data-utils.ts
│   │   │   ├── index.ts
│   │   │   ├── number-utils.ts
│   │   │   ├── regex-patterns.ts
│   │   │   ├── security-utils.test.ts
│   │   │   ├── security-utils.ts
│   │   │   ├── string-utils.test.ts
│   │   │   ├── string-utils.ts
│   │   │   ├── type-guards.test.ts
│   │   │   └── type-guards.ts
│   │   ├── index.ts
│   │   ├── maybe.ts
│   │   └── result.ts
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
│   ├── platform/
│   │   ├── kenya/
│   │   │   └── anonymity/
│   │   │       └── anonymity-helper.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── api/
│   │   │   ├── contracts/
│   │   │   │   ├── admin.contract.ts
│   │   │   │   ├── admin.schemas.ts
│   │   │   │   ├── analytics.contract.ts
│   │   │   │   ├── analytics.schemas.ts
│   │   │   │   ├── bill.contract.ts
│   │   │   │   ├── bill.schemas.ts
│   │   │   │   ├── comment.contract.ts
│   │   │   │   ├── comment.schemas.ts
│   │   │   │   ├── endpoint-registry.ts
│   │   │   │   ├── endpoint.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notification.contract.ts
│   │   │   │   ├── notification.schemas.ts
│   │   │   │   ├── search.contract.ts
│   │   │   │   ├── search.schemas.ts
│   │   │   │   ├── user.contract.ts
│   │   │   │   └── user.schemas.ts
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
│   │   ├── bills/
│   │   │   ├── action-prompts.types.ts
│   │   │   └── translation.types.ts
│   │   ├── core/
│   │   │   ├── base.ts
│   │   │   ├── branded.ts
│   │   │   ├── common.ts
│   │   │   ├── ENUM_MAPPING.md
│   │   │   ├── enums.ts
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   └── validation.ts
│   │   ├── dashboard/
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   ├── generated-domains.ts
│   │   │   ├── generated-tables.ts
│   │   │   ├── index.ts
│   │   │   ├── tables.ts
│   │   │   └── TYPE_GENERATION.md
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
│   │   │   │   ├── comment.ts
│   │   │   │   └── index.ts
│   │   │   ├── loading/
│   │   │   │   ├── client-types.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
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
│   │   ├── validation/
│   │   │   ├── index.ts
│   │   │   └── schemas.ts
│   │   ├── CONSOLIDATION_SUMMARY.md
│   │   ├── IMPORT_PATTERNS.md
│   │   ├── index.ts
│   │   ├── performance.ts
│   │   ├── README.md
│   │   └── verify-dependencies.ts
│   ├── utils/
│   │   ├── correlation-id/
│   │   │   ├── context.ts
│   │   │   ├── generator.ts
│   │   │   ├── index.ts
│   │   │   └── middleware.ts
│   │   ├── errors/
│   │   │   ├── context.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── transform.test.ts
│   │   │   ├── transform.ts
│   │   │   └── types.ts
│   │   ├── transformers/
│   │   │   ├── entities/
│   │   │   │   ├── bill.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── user.ts
│   │   │   ├── base.ts
│   │   │   ├── date-validation.test.ts
│   │   │   ├── index.ts
│   │   │   ├── INTEGRATION_GUIDE.md
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   ├── user-roundtrip.test.ts
│   │   │   └── validation.ts
│   │   ├── index.ts
│   │   ├── json-serialization.ts
│   │   └── shared-utilities.test.ts
│   ├── validation/
│   │   ├── schemas/
│   │   │   ├── advocacy.schema.ts
│   │   │   ├── analytics.schema.ts
│   │   │   ├── argument-intelligence.schema.ts
│   │   │   ├── bill.schema.ts
│   │   │   ├── comment.schema.ts
│   │   │   ├── common.ts
│   │   │   ├── community.schema.ts
│   │   │   ├── index.ts
│   │   │   ├── notifications.schema.ts
│   │   │   ├── search.schema.ts
│   │   │   ├── sponsors.schema.ts
│   │   │   ├── user.schema.ts
│   │   │   └── validation-schemas.test.ts
│   │   ├── validators/
│   │   │   ├── bill-number.ts
│   │   │   ├── email.ts
│   │   │   ├── index.ts
│   │   │   └── password.ts
│   │   ├── errors.ts
│   │   ├── index.ts
│   │   ├── SCHEMA_ALIGNMENT_GUIDE.md
│   │   └── test-schemas.ts
│   ├── index.ts
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── tests/
│   ├── e2e/
│   │   └── test-results/
│   │       ├── simple/
│   │       └── simple-results.json
│   ├── factories/
│   │   └── README.md
│   ├── integration/
│   │   ├── client/
│   │   │   └── api-client.ts
│   │   ├── fixtures/
│   │   │   ├── bill.fixtures.ts
│   │   │   ├── index.ts
│   │   │   └── user.fixtures.ts
│   │   ├── helpers/
│   │   │   └── test-context.ts
│   │   ├── setup/
│   │   │   ├── test-database.ts
│   │   │   ├── test-server.ts
│   │   │   └── vitest-setup.ts
│   │   ├── advocacy-coordination.test.ts
│   │   ├── bill-flow.integration.test.ts
│   │   ├── comment-flow.integration.test.ts
│   │   ├── constitutional-intelligence.test.ts
│   │   ├── data-retrieval-flow.integration.test.ts
│   │   ├── error-scenarios.integration.test.ts
│   │   ├── graph-module.integration.test.ts
│   │   ├── index.ts
│   │   ├── notification-e2e.test.ts
│   │   ├── phase1-integration.test.ts
│   │   ├── README.md
│   │   ├── transformation-pipeline.integration.test.ts
│   │   ├── user-flow.integration.test.ts
│   │   └── vitest.config.ts
│   ├── mocks/
│   │   ├── performance.mock.ts
│   │   └── redis.mock.ts
│   ├── properties/
│   │   ├── acyclic-layer-dependencies.property.test.ts
│   │   ├── analytics-service-contracts.property.test.ts
│   │   ├── api-retry-logic.property.test.ts
│   │   ├── branded-type-safety.property.test.ts
│   │   ├── cache-invalidation.property.test.ts
│   │   ├── consistent-error-message-format.property.test.ts
│   │   ├── database-connection-routing.property.test.ts
│   │   ├── date-validation.property.test.ts
│   │   ├── dependency-graph-layering.property.integration.test.ts
│   │   ├── dependency-injection-correctness.property.test.ts
│   │   ├── error-context-enrichment.property.test.ts
│   │   ├── error-logging-completeness.property.test.ts
│   │   ├── error-structure-consistency.property.test.ts
│   │   ├── import-path-consistency.property.test.ts
│   │   ├── migration-integration-preservation.test.ts
│   │   ├── module-boundary-enforcement.property.test.ts
│   │   ├── module-count-reduction.property.test.ts
│   │   ├── public-api-completeness.property.test.ts
│   │   ├── round-trip-transformation.property.test.ts
│   │   ├── schema-type-sync.property.test.ts
│   │   ├── serialization-consistency.property.test.ts
│   │   ├── shared-layer-purity.property.test.ts
│   │   ├── shared-layer-single-source-of-truth.property.test.ts
│   │   ├── telemetry-service-contracts.property.test.ts
│   │   ├── transformation-pipeline-correctness.property.test.ts
│   │   ├── type-safety-enforcement.property.test.ts
│   │   ├── validation-round-trip.property.test.ts
│   │   ├── vitest.config.ts
│   │   └── websocket-message-batching.property.test.ts
│   ├── setup/
│   │   ├── modules/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── shared.ts
│   │   ├── database.ts
│   │   ├── index.ts
│   │   ├── test-environment.ts
│   │   └── vitest.ts
│   ├── test-results/
│   │   ├── results.json
│   │   └── results.xml
│   ├── unit/
│   │   ├── migration-verification.test.ts
│   │   └── vitest.config.ts
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
│   │   ├── index.ts
│   │   └── result-adapter.ts
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
│   ├── migration-integration.test.ts
│   ├── notification-test-suite.ts
│   ├── performance-regression.test.ts
│   ├── playwright.config.ts
│   └── README.md
├── ALL_REACT_ERRORS_FIXED.md
├── ARCHITECTURE.md
├── BILLS_API_FIX_2026-03-09.md
├── BILLS_INTEGRATION_STATUS.md
├── BILLS_PORTAL_FIX_SUMMARY.md
├── BROWSER_CACHE_FIX.md
├── CHANGELOG.md
├── CLEAR_BROWSER_CACHE_NOW.md
├── CLIENT_API_FIXES_COMPLETE_2026-03-09.md
├── CLIENT_CONNECTION_FIX.md
├── COMPLETE_FIX_SUMMARY_2026-03-09.md
├── COMPLETE_FIX_SUMMARY.md
├── CONTRIBUTING.md
├── cspell.config.yaml
├── CURRENT_CAPABILITIES.md
├── CUsersACCESSG~1AppDataLocalTemptest-output.txt
├── DEMO_FIXES_COMPLETE.md
├── DEMO_QUICK_REFERENCE.md
├── DEMO_READINESS_FINAL_REPORT.md
├── DEMO_READINESS_FIXES_SUMMARY.md
├── DOCKER_DATABASE_SETUP.md
├── docker-compose.neo4j.yml
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.client
├── DOCS_CLEANUP_COMPLETE.md
├── DOCUMENTATION_INDEX.md
├── drizzle.config.ts
├── DUPLICATE_REACT_IMPORT_FIXED.md
├── FEATURE_INTEGRATION_STATUS.md
├── FINAL_ERROR_FIX_SUMMARY.md
├── FINAL_FIX_GUIDE.md
├── FINAL_FIX_SUMMARY_2026-03-09.md
├── fix.cjs
├── generate-structure.mjs
├── knip.config.ts
├── nginx.conf
├── nx.json
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── QUICK_FIX_REFERENCE.md
├── QUICK_START_GUIDE.md
├── QUICK_START.md
├── REACT_FORWARDREF_FIX_COMPLETE.md
├── README_FIXES.md
├── README.md
├── RESTART_INSTRUCTIONS.md
├── SECURITY_FIXES_SUMMARY.md
├── SERVER_FIXES_COMPLETE_2026-03-09.md
├── SERVER_STARTUP_SOLUTION.md
├── SESSION_SUMMARY_2026-03-09.md
├── start-dev.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── typedoc.json
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