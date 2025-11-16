chanuka-platform/
│
├── CLIENT APPLICATION
│ ├── client/
│ │ ├── public/
│ │ │ ├── assets/
│ │ │ │ ├── images/
│ │ │ │ ├── audio/
│ │ │ │ └── locales/
│ │ │ ├── manifest.json
│ │ │ ├── sw.js
│ │ │ └── offline.html
│ │ │
│ │ └── src/
│ │ ├── components/
│ │ │ ├── accessibility/
│ │ │ │ ├── audio-content-player.tsx
│ │ │ │ ├── literacy-level-adapter.tsx
│ │ │ │ ├── accessibility-manager.tsx
│ │ │ │ ├── progressive-disclosure/ [NEW]
│ │ │ │ │ ├── progressive-disclosure-manager.tsx
│ │ │ │ │ ├── reading-path-navigator.tsx
│ │ │ │ │ ├── complexity-indicator.tsx
│ │ │ │ │ ├── context-navigation-helper.tsx
│ │ │ │ │ └── mobile-tab-selector.tsx
│ │ │ │ └── mobile-optimization/ [NEW]
│ │ │ │ ├── mobile-navigation-optimizer.tsx
│ │ │ │ ├── bottom-sheet-manager.tsx
│ │ │ │ ├── gesture-navigator.tsx
│ │ │ │ └── touch-optimizer.tsx
│ │ │ │
│ │ │ ├── analysis/
│ │ │ │ ├── constitutional/
│ │ │ │ │ ├── provision-explorer.tsx
│ │ │ │ │ ├── precedent-viewer.tsx
│ │ │ │ │ ├── uncertainty-indicator.tsx
│ │ │ │ │ ├── expert-flag-panel.tsx
│ │ │ │ │ └── ai-analysis-display.tsx [NEW]
│ │ │ │ │
│ │ │ │ └── argument-intelligence/
│ │ │ │ ├── argument-map-viewer.tsx
│ │ │ │ ├── evidence-tracker.tsx
│ │ │ │ ├── coalition-finder.tsx
│ │ │ │ ├── legislative-brief-generator.tsx
│ │ │ │ └── stakeholder-position-matrix.tsx
│ │ │ │
│ │ │ ├── transparency/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── conflict-visualization/
│ │ │ │ │ ├── ConflictOverviewPanel.tsx
│ │ │ │ │ ├── FinancialExposureCard.tsx
│ │ │ │ │ ├── NetworkGraphVisualization.tsx
│ │ │ │ │ ├── TimelineView.tsx
│ │ │ │ │ └── TransparencyScorecard.tsx
│ │ │ │ │
│ │ │ │ ├── sponsor-analysis/
│ │ │ │ │ ├── SponsorProfileCard.tsx
│ │ │ │ │ ├── VotingPatternChart.tsx
│ │ │ │ │ ├── IndustryAlignmentVisual.tsx
│ │ │ │ │ └── DisclosureCompletenessIndicator.tsx
│ │ │ │ │
│ │ │ │ └── workaround-tracking/
│ │ │ │ ├── WorkaroundAlert.tsx
│ │ │ │ ├── ImplementationTimeline.tsx
│ │ │ │ └── AlternativePathwayMap.tsx
│ │ │ │
│ │ │ ├── expert-verification/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── ExpertBadge.tsx
│ │ │ │ ├── CredibilityIndicator.tsx
│ │ │ │ ├── VerificationPanel.tsx
│ │ │ │ ├── ExpertProfile.tsx
│ │ │ │ ├── PeerReviewPanel.tsx
│ │ │ │ └── ExpertConsensusTracker.tsx
│ │ │ │
│ │ │ ├── real-time-engagement/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── LiveMetricsDashboard.tsx
│ │ │ │ ├── EngagementStats.tsx
│ │ │ │ ├── CommunityPulse.tsx
│ │ │ │ ├── ParticipationTracker.tsx
│ │ │ │ ├── SentimentVisualization.tsx
│ │ │ │ └── RealTimeActivityFeed.tsx
│ │ │ │
│ │ │ ├── gamification/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── CivicScoreCard.tsx
│ │ │ │ ├── AchievementDisplay.tsx
│ │ │ │ ├── LeaderboardPanel.tsx
│ │ │ │ ├── ProgressTracker.tsx
│ │ │ │ └── RewardNotification.tsx
│ │ │ │
│ │ │ ├── pretext-detection/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── PretextAlert.tsx
│ │ │ │ ├── RiskIndicator.tsx
│ │ │ │ ├── PatternMatchDisplay.tsx
│ │ │ │ ├── HistoricalComparison.tsx
│ │ │ │ ├── CivicActionToolbox.tsx
│ │ │ │ └── RemediationGuide.tsx
│ │ │ │
│ │ │ ├── discovery/ [NEW MAJOR COMPONENT]
│ │ │ │ ├── AdvancedSearchInterface.tsx
│ │ │ │ ├── MultiDimensionalFilters.tsx
│ │ │ │ ├── ControversyLevelFilter.tsx
│ │ │ │ ├── SmartSuggestions.tsx
│ │ │ │ ├── TrendingPanel.tsx
│ │ │ │ ├── ConnectionFinder.tsx
│ │ │ │ └── DiscoveryInsightsPanel.tsx
│ │ │ │
│ │ │ └── [existing component folders]
│ │ │
│ │ ├── features/
│ │ │ ├── transparency-intelligence/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── useConflictData.ts
│ │ │ │ │ ├── useNetworkAnalysis.ts
│ │ │ │ │ ├── useTransparencyScore.ts
│ │ │ │ │ └── useWorkaroundTracking.ts
│ │ │ │ └── services/
│ │ │ │ └── transparency-api.ts
│ │ │ │
│ │ │ ├── expert-verification/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── useExpertStatus.ts
│ │ │ │ │ ├── useCredibilityScore.ts
│ │ │ │ │ └── usePeerReview.ts
│ │ │ │ └── services/
│ │ │ │ └── expert-verification-api.ts
│ │ │ │
│ │ │ ├── real-time-engagement/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── useRealTimeMetrics.ts
│ │ │ │ │ ├── useWebSocket.ts
│ │ │ │ │ ├── useLiveEngagement.ts
│ │ │ │ │ └── useSentimentTracking.ts
│ │ │ │ └── services/
│ │ │ │ ├── websocket-service.ts
│ │ │ │ └── metrics-api.ts
│ │ │ │
│ │ │ ├── progressive-navigation/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── useProgressiveDisclosure.ts
│ │ │ │ │ ├── useReadingProgress.ts
│ │ │ │ │ └── useComplexityLevel.ts
│ │ │ │ └── services/
│ │ │ │ └── navigation-preference-api.ts
│ │ │ │
│ │ │ ├── pretext-detection/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── usePretextAnalysis.ts
│ │ │ │ │ ├── useRiskAssessment.ts
│ │ │ │ │ └── useRemediationActions.ts
│ │ │ │ └── services/
│ │ │ │ └── pretext-detection-api.ts
│ │ │ │
│ │ │ ├── advanced-search/ [NEW FEATURE]
│ │ │ │ ├── components/
│ │ │ │ ├── hooks/
│ │ │ │ │ ├── useAdvancedSearch.ts
│ │ │ │ │ ├── useDiscoveryIntelligence.ts
│ │ │ │ │ ├── useSmartFilters.ts
│ │ │ │ │ └── useTrendDetection.ts
│ │ │ │ └── services/
│ │ │ │ └── discovery-api.ts
│ │ │ │
│ │ │ └── [existing features]
│ │ │
│ │ ├── contexts/ [ENHANCED]
│ │ │ ├── [existing contexts]
│ │ │ ├── CredibilityContext.tsx [NEW]
│ │ │ ├── ProgressiveDisclosureContext.tsx [NEW]
│ │ │ ├── RealTimeEngagementContext.tsx [NEW]
│ │ │ └── TransparencyContext.tsx [NEW]
│ │ │
│ │ └── pages/
│ │ ├── constitutional-analysis.tsx
│ │ ├── argument-map.tsx
│ │ ├── advocacy-campaigns.tsx
│ │ ├── transparency-dashboard.tsx [NEW]
│ │ ├── expert-verification-hub.tsx [NEW]
│ │ ├── pretext-watch.tsx [NEW]
│ │ ├── discovery-center.tsx [NEW]
│ │ └── [existing pages]
│
├── SERVER APPLICATION
│ ├── server/
│ │ ├── features/
│ │ │ │
│ │ │ ├── DOMAIN 1: CONSTITUTIONAL ANALYSIS [ENHANCED]
│ │ │ ├── constitutional-analysis/
│ │ │ │ ├── application/
│ │ │ │ │ ├── constitutional-analyzer.ts
│ │ │ │ │ ├── precedent-finder.ts
│ │ │ │ │ ├── provision-matcher.ts
│ │ │ │ │ ├── expert-flagging-service.ts
│ │ │ │ │ ├── ai-powered-review.ts [NEW]
│ │ │ │ │ ├── conflict-detector.ts [NEW]
│ │ │ │ │ └── rights-impact-analyzer.ts [NEW]
│ │ │ │ │
│ │ │ │ ├── infrastructure/
│ │ │ │ │ ├── ml-models/ [NEW]
│ │ │ │ │ │ ├── constitutional-conflict-model.ts
│ │ │ │ │ │ └── precedent-matching-model.ts
│ │ │ │ │ │
│ │ │ │ │ └── expert-network/ [NEW]
│ │ │ │ │ ├── expert-network-manager.ts
│ │ │ │ │ ├── urgent-review-prioritizer.ts
│ │ │ │ │ └── legal-expert-matcher.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── constitutional-analysis-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 2: ARGUMENT INTELLIGENCE [ENHANCED]
│ │ │ ├── argument-intelligence/
│ │ │ │ ├── application/
│ │ │ │ │ ├── argument-processor.ts
│ │ │ │ │ ├── structure-extractor.ts
│ │ │ │ │ ├── clustering-service.ts
│ │ │ │ │ ├── evidence-validator.ts
│ │ │ │ │ ├── coalition-finder.ts
│ │ │ │ │ ├── brief-generator.ts
│ │ │ │ │ ├── power-balancer.ts
│ │ │ │ │ ├── live-metrics-aggregator.ts [NEW]
│ │ │ │ │ ├── sentiment-analysis-engine.ts [NEW]
│ │ │ │ │ └── community-pulse-monitor.ts [NEW]
│ │ │ │ │
│ │ │ │ ├── gamification/ [NEW]
│ │ │ │ │ ├── civic-scoring-service.ts
│ │ │ │ │ ├── achievement-engine.ts
│ │ │ │ │ ├── leaderboard-manager.ts
│ │ │ │ │ └── reward-system.ts
│ │ │ │ │
│ │ │ │ ├── infrastructure/
│ │ │ │ │ ├── nlp/
│ │ │ │ │ │ ├── sentence-classifier.ts
│ │ │ │ │ │ ├── entity-extractor.ts
│ │ │ │ │ │ └── similarity-calculator.ts
│ │ │ │ │ │
│ │ │ │ │ └── streaming/ [NEW]
│ │ │ │ │ ├── kafka-consumer.ts
│ │ │ │ │ ├── metrics-pipeline.ts
│ │ │ │ │ └── event-processor.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── argument-intelligence-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 3: UNIVERSAL ACCESS [ENHANCED]
│ │ │ ├── universal-access/
│ │ │ │ ├── ussd/
│ │ │ │ │ └── [existing USSD infrastructure]
│ │ │ │ │
│ │ │ │ ├── ambassador/
│ │ │ │ │ └── [existing ambassador tools]
│ │ │ │ │
│ │ │ │ ├── localization/
│ │ │ │ │ ├── content-adapter.ts
│ │ │ │ │ ├── example-generator.ts
│ │ │ │ │ ├── audio-generator.ts
│ │ │ │ │ ├── complexity-adjuster.ts
│ │ │ │ │ └── educational-framework.ts [NEW]
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ ├── ussd-router.ts
│ │ │ │ └── ambassador-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 4: ADVOCACY COORDINATION [ENHANCED]
│ │ │ ├── advocacy/
│ │ │ │ ├── application/
│ │ │ │ │ ├── campaign-manager.ts
│ │ │ │ │ ├── action-coordinator.ts
│ │ │ │ │ ├── coalition-builder.ts
│ │ │ │ │ ├── impact-tracker.ts
│ │ │ │ │ └── alert-dispatcher.ts
│ │ │ │ │
│ │ │ │ ├── infrastructure/
│ │ │ │ │ ├── notification/
│ │ │ │ │ │ ├── sms-dispatcher.ts
│ │ │ │ │ │ ├── email-dispatcher.ts
│ │ │ │ │ │ ├── push-dispatcher.ts
│ │ │ │ │ │ ├── relevance-filter-engine.ts [NEW]
│ │ │ │ │ │ ├── urgency-prioritizer.ts [NEW]
│ │ │ │ │ │ ├── multi-channel-orchestrator.ts [NEW]
│ │ │ │ │ │ └── alert-fatigue-preventer.ts [NEW]
│ │ │ │ │ │
│ │ │ │ │ └── smart-alerts/ [NEW]
│ │ │ │ │ ├── ai-relevance-scorer.ts
│ │ │ │ │ ├── personalization-engine.ts
│ │ │ │ │ └── delivery-optimizer.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── advocacy-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 5-8: [EXISTING DOMAINS - MAINTAINED]
│ │ │ │
│ │ │ ├── DOMAIN 9: TRANSPARENCY INTELLIGENCE HUB [NEW]
│ │ │ ├── transparency-hub/
│ │ │ │ ├── orchestrator/
│ │ │ │ │ └── transparency-orchestrator.ts
│ │ │ │ │
│ │ │ │ ├── financial-disclosure/
│ │ │ │ │ ├── disclosure-ingestion-service.ts
│ │ │ │ │ ├── conflict-detection-engine.ts
│ │ │ │ │ ├── network-analysis-service.ts
│ │ │ │ │ └── real-time-monitoring-service.ts
│ │ │ │ │
│ │ │ │ ├── sponsor-analysis/
│ │ │ │ │ ├── relationship-mapper-service.ts
│ │ │ │ │ ├── influence-pathway-analyzer.ts
│ │ │ │ │ ├── voting-pattern-correlator.ts
│ │ │ │ │ └── transparency-scoring-engine.ts
│ │ │ │ │
│ │ │ │ ├── workaround-tracking/
│ │ │ │ │ ├── alternative-implementation-monitor.ts
│ │ │ │ │ ├── executive-order-tracker.ts
│ │ │ │ │ ├── administrative-action-analyzer.ts
│ │ │ │ │ └── court-challenge-tracker.ts
│ │ │ │ │
│ │ │ │ ├── visualization/
│ │ │ │ │ ├── network-graph-generator.ts
│ │ │ │ │ ├── timeline-visualizer.ts
│ │ │ │ │ └── impact-mapper.ts
│ │ │ │ │
│ │ │ │ ├── integration-connectors/
│ │ │ │ │ ├── bills-connector.ts
│ │ │ │ │ ├── analytics-connector.ts
│ │ │ │ │ ├── constitutional-connector.ts
│ │ │ │ │ └── advocacy-connector.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── transparency-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 10: EXPERT VERIFICATION SYSTEM [NEW]
│ │ │ ├── expert-verification/
│ │ │ │ ├── core/
│ │ │ │ │ ├── credential-validator.ts
│ │ │ │ │ ├── expertise-matcher.ts
│ │ │ │ │ ├── credibility-scorer.ts
│ │ │ │ │ └── peer-review-coordinator.ts
│ │ │ │ │
│ │ │ │ ├── domain-integrations/
│ │ │ │ │ ├── constitutional-expert-connector.ts
│ │ │ │ │ ├── argument-validator-connector.ts
│ │ │ │ │ ├── community-moderator-connector.ts
│ │ │ │ │ └── sector-expert-connector.ts
│ │ │ │ │
│ │ │ │ ├── workflow/
│ │ │ │ │ ├── verification-pipeline.ts
│ │ │ │ │ ├── review-queue-manager.ts
│ │ │ │ │ ├── badge-issuer.ts
│ │ │ │ │ └── fraud-detection.ts
│ │ │ │ │
│ │ │ │ ├── analytics/
│ │ │ │ │ ├── expert-contribution-tracker.ts
│ │ │ │ │ ├── consensus-calculator.ts
│ │ │ │ │ └── credibility-analytics.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── expert-verification-router.ts
│ │ │ │
│ │ │ ├── DOMAIN 11: PRETEXT DETECTION SYSTEM [NEW]
│ │ │ ├── pretext-detection/
│ │ │ │ ├── application/
│ │ │ │ │ ├── pattern-recognition-engine.ts
│ │ │ │ │ ├── bill-similarity-detector.ts
│ │ │ │ │ ├── concerning-provision-flagger.ts
│ │ │ │ │ └── democratic-risk-assessor.ts
│ │ │ │ │
│ │ │ │ ├── domain/
│ │ │ │ │ ├── entities/
│ │ │ │ │ │ ├── pretext-pattern.ts
│ │ │ │ │ │ ├── historical-precedent.ts
│ │ │ │ │ │ └── risk-assessment.ts
│ │ │ │ │ │
│ │ │ │ │ └── services/
│ │ │ │ │ ├── pattern-matching-service.ts
│ │ │ │ │ └── risk-scoring-service.ts
│ │ │ │ │
│ │ │ │ ├── infrastructure/
│ │ │ │ │ ├── ml-models/
│ │ │ │ │ │ ├── similarity-model.ts
│ │ │ │ │ │ └── risk-prediction-model.ts
│ │ │ │ │ │
│ │ │ │ │ └── repositories/
│ │ │ │ │ └── precedent-repository.ts
│ │ │ │ │
│ │ │ │ ├── remediation/
│ │ │ │ │ ├── civic-action-recommender.ts
│ │ │ │ │ ├── community-alert-system.ts
│ │ │ │ │ ├── representative-contact-facilitator.ts
│ │ │ │ │ └── advocacy-campaign-generator.ts
│ │ │ │ │
│ │ │ │ └── presentation/
│ │ │ │ └── pretext-detection-router.ts
│ │ │ │
│ │ │ └── DOMAIN 12: DISCOVERY INTELLIGENCE [NEW]
│ │ │ └── discovery-intelligence/
│ │ │ ├── application/
│ │ │ │ ├── search-orchestrator.ts
│ │ │ │ ├── discovery-service.ts
│ │ │ │ └── intelligence-service.ts
│ │ │ │
│ │ │ ├── domain/
│ │ │ │ ├── entities/
│ │ │ │ │ ├── search-query.ts
│ │ │ │ │ ├── discovery-pattern.ts
│ │ │ │ │ └── search-result.ts
│ │ │ │ │
│ │ │ │ └── services/
│ │ │ │ ├── relevance-scoring-service.ts
│ │ │ │ └── personalization-service.ts
│ │ │ │
│ │ │ ├── infrastructure/
│ │ │ │ ├── search-engines/
│ │ │ │ │ ├── semantic-search-engine.ts
│ │ │ │ │ ├── fuzzy-search-engine.ts
│ │ │ │ │ └── full-text-search-engine.ts
│ │ │ │ │
│ │ │ │ ├── discovery/
│ │ │ │ │ ├── trend-detector.ts
│ │ │ │ │ ├── connection-finder.ts
│ │ │ │ │ └── impact-predictor.ts
│ │ │ │ │
│ │ │ │ └── ml-models/
│ │ │ │ ├── search-intent-classifier.ts
│ │ │ │ └── relevance-predictor.ts
│ │ │ │
│ │ │ └── presentation/
│ │ │ └── discovery-router.ts
│ │ │
│ │ ├── infrastructure/
│ │ │ ├── events/ [NEW]
│ │ │ │ ├── event-bus/
│ │ │ │ │ ├── kafka-event-bus.ts
│ │ │ │ │ ├── event-publisher.ts
│ │ │ │ │ └── event-subscriber.ts
│ │ │ │ │
│ │ │ │ ├── event-types/
│ │ │ │ │ ├── bill-events.ts
│ │ │ │ │ ├── comment-events.ts
│ │ │ │ │ ├── engagement-events.ts
│ │ │ │ │ ├── expert-events.ts
│ │ │ │ │ ├── conflict-events.ts
│ │ │ │ │ └── pretext-events.ts
│ │ │ │ │
│ │ │ │ └── event-handlers/
│ │ │ │ ├── analytics-event-handler.ts
│ │ │ │ ├── notification-event-handler.ts
│ │ │ │ └── gamification-event-handler.ts
│ │ │ │
│ │ │ ├── websocket/ [NEW]
│ │ │ │ ├── websocket-server.ts
│ │ │ │ ├── connection-manager.ts
│ │ │ │ ├── subscription-manager.ts
│ │ │ │ └── broadcaster.ts
│ │ │ │
│ │ │ ├── cache/
│ │ │ │ ├── redis-cache.ts
│ │ │ │ ├── cache-warming.ts
│ │ │ │ └── cache-invalidation.ts
│ │ │ │
│ │ │ └── [existing infrastructure]
│ │ │
│ │ └── [existing server structure]
│
├── SHARED CODE
│ ├── shared/
│ │ ├── core/
│ │ │ ├── src/
│ │ │ │ ├── caching/
│ │ │ │ │ └── [existing caching infrastructure]
│ │ │ │ │
│ │ │ │ ├── middleware/
│ │ │ │ │ ├── [existing middleware]
│ │ │ │ │ ├── ai-deduplication.ts [NEW]
│ │ │ │ │ └── ai-middleware.ts [NEW]
│ │ │ │ │
│ │ │ │ ├── observability/
│ │ │ │ │ ├── error-management/
│ │ │ │ │ │ └── [comprehensive error handling]
│ │ │ │ │ │
│ │ │ │ │ ├── health/
│ │ │ │ │ │ └── [health checking system]
│ │ │ │ │ │
│ │ │ │ │ ├── logging/
│ │ │ │ │ │ └── [structured logging]
│ │ │ │ │ │
│ │ │ │ │ └── metrics/
│ │ │ │ │ └── [metrics collection]
│ │ │ │ │
│ │ │ │ ├── primitives/
│ │ │ │ │ ├── types/
│ │ │ │ │ │ ├── branded.ts
│ │ │ │ │ │ ├── maybe.ts
│ │ │ │ │ │ └── result.ts
│ │ │ │ │ │
│ │ │ │ │ └── constants/
│ │ │ │ │ ├── http-status.ts
│ │ │ │ │ └── time.ts
│ │ │ │ │
│ │ │ │ ├── rate-limiting/
│ │ │ │ │ └── [comprehensive rate limiting]
│ │ │ │ │
│ │ │ │ ├── validation/
│ │ │ │ │ └── [validation framework]
│ │ │ │ │
│ │ │ │ └── utils/
│ │ │ │ ├── api/
│ │ │ │ │ ├── circuit-breaker.ts
│ │ │ │ │ ├── client.ts
│ │ │ │ │ └── interceptors.ts
│ │ │ │ │
│ │ │ │ ├── formatting/
│ │ │ │ │ ├── currency.ts
│ │ │ │ │ ├── date-time.ts
│ │ │ │ │ ├── document.ts
│ │ │ │ │ └── status.ts
│ │ │ │ │
│ │ │ │ ├── credibility/ [NEW]
│ │ │ │ │ ├── credibility-context.ts
│ │ │ │ │ ├── credibility-calculator.ts
│ │ │ │ │ └── credibility-enhancer.ts
│ │ │ │ │
│ │ │ │ └── progressive-disclosure/ [NEW]
│ │ │ │ ├── complexity-analyzer.ts
│ │ │ │ ├── reading-path-generator.ts
│ │ │ │ ├── content-layering-service.ts
│ │ │ │ └── accessibility-adapter.ts
│ │ │ │
│ │ │ └── [existing shared core structure]
│ │ │
│ │ └── schema/
│ │ ├── foundation.ts
│ │ ├── parliamentary_process.ts
│ │ ├── citizen_participation.ts
│ │ ├── constitutional_intelligence.ts
│ │ ├── argument_intelligence.ts
│ │ ├── advocacy_coordination.ts
│ │ ├── universal_access.ts
│ │ ├── transparency_analysis.ts
│ │ ├── impact_measurement.ts
│ │ ├── platform_operations.ts
│ │ ├── integrity_operations.ts
│ │ ├── expert_verification.ts [NEW]
│ │ ├── transparency_intelligence.ts [NEW]
│ │ ├── pretext_detection.ts [NEW]
│ │ └── discovery_intelligence.ts [NEW]
│
├── AI MODELS & KNOWLEDGE BASE
│ ├── ai-models/
│ │ ├── constitutional/
│ │ │ ├── provision-matcher/
│ │ │ ├── precedent-finder/
│ │ │ ├── conflict-detector/ [NEW]
│ │ │ └── rights-impact-analyzer/ [NEW]
│ │ │
│ │ ├── argumentation/
│ │ │ ├── argument-extractor/
│ │ │ ├── evidence-evaluator/
│ │ │ ├── coalition-identifier/
│ │ │ └── sentiment-analyzer/ [NEW]
│ │ │
│ │ ├── transparency/ [NEW]
│ │ │ ├── conflict-detection-model/
│ │ │ ├── network-analysis-model/
│ │ │ └── transparency-scoring-model/
│ │ │
│ │ ├── pretext-detection/ [NEW]
│ │ │ ├── pattern-recognition-model/
│ │ │ ├── similarity-detection-model/
│ │ │ └── risk-prediction-model/
│ │ │
│ │ ├── discovery/ [NEW]
│ │ │ ├── semantic-search-model/
│ │ │ ├── intent-classification-model/
│ │ │ └── relevance-prediction-model/
│ │ │
│ │ ├── embeddings/
│ │ │ ├── legal-embeddings/
│ │ │ └── multilingual-embeddings/
│ │ │
│ │ └── evaluation/
│ │ ├── benchmarks/
│ │ │ ├── legal-glue/
│ │ │ └── constitutional-reasoning/
│ │ │
│ │ └── test-sets/
│ │ ├── kenyan-legislation/
│ │ └── constitutional-cases/
│ │
│ └── knowledge-base/
│ ├── constitutional/
│ │ ├── kenyan-constitution/
│ │ ├── precedents/
│ │ └── scholarly-works/
│ │
│ ├── legislative/
│ │ ├── acts/
│ │ ├── bills/
│ │ └── regulations/
│ │
│ ├── parliamentary/
│ │ ├── hansard/
│ │ ├── committee-reports/
│ │ └── public-petitions/
│ │
│ ├── transparency/ [NEW]
│ │ ├── financial-disclosures/
│ │ ├── conflict-patterns/
│ │ └── workaround-precedents/
│ │
│ ├── pretext-patterns/ [NEW]
│ │ ├── historical-patterns/
│ │ ├── concerning-provisions/
│ │ └── democratic-safeguards/
│ │
│ └── contextual/
│ ├── regional-examples/
│ ├── sector-specific/
│ └── translations/
│
├── DEPLOYMENT & INFRASTRUCTURE
│ ├── deployment/
│ │ ├── kubernetes/
│ │ │ ├── constitutional-analysis/
│ │ │ ├── argument-intelligence/
│ │ │ ├── transparency-hub/ [NEW]
│ │ │ ├── expert-verification/ [NEW]
│ │ │ ├── pretext-detection/ [NEW]
│ │ │ ├── discovery-intelligence/ [NEW]
│ │ │ ├── real-time-services/ [NEW]
│ │ │ ├── websocket-gateway/ [NEW]
│ │ │ └── [existing deployments]
│ │ │
│ │ ├── backup-infrastructure/
│ │ │ ├── primary-region/
│ │ │ ├── secondary-regions/
│ │ │ └── recovery-procedures/
│ │ │
│ │ └── monitoring/
│ │ ├── dashboards/
│ │ │ ├── system-health.json
│ │ │ ├── ai-performance.json
│ │ │ ├── accessibility-metrics.json
│ │ │ ├── transparency-metrics.json [NEW]
│ │ │ ├── engagement-metrics.json [NEW]
│ │ │ └── political-threat-alerts.json
│ │ │
│ │ └── alerts/
│ │ ├── performance-alerts/
│ │ ├── security-alerts/
│ │ └── integrity-alerts/
│ │
│ └── scripts/
│ ├── ai-model-training/
│ ├── knowledge-base-updates/
│ ├── localization/
│ ├── impact-measurement/
│ ├── transparency-data-sync/ [NEW]
│ ├── expert-verification-batch/ [NEW]
│ └── pretext-pattern-updates/ [NEW]
│
└── DOCUMENTATION
├── documentation/
│ ├── architecture/
│ │ ├── system-overview.md
│ │ ├── constitutional-analysis.md
│ │ ├── argument-intelligence.md
│ │ ├── universal-access.md
│ │ ├── advocacy-coordination.md
│ │ ├── institutional-integration.md
│ │ ├── political-resilience.md
│ │ ├── transparency-intelligence.md [NEW]
│ │ ├── expert-verification-system.md [NEW]
│ │ ├── pretext-detection-system.md [NEW]
│ │ ├── discovery-intelligence.md [NEW]
│ │ └── real-time-engagement.md [NEW]
│ │
│ ├── research-foundation/
│ │ ├── literature-review.md
│ │ ├── design-decisions.md
│ │ └── evaluation-criteria.md
│ │
│ ├── implementation-guides/
│ │ ├── constitutional-analysis-implementation.md
│ │ ├── argument-intelligence-implementation.md
│ │ ├── ussd-gateway-setup.md
│ │ ├── ambassador-program-launch.md
│ │ ├── localization-workflow.md
│ │ ├── institutional-api-integration.md
│ │ ├── transparency-hub-deployment.md [NEW]
│ │ ├── expert-verification-launch.md [NEW]
│ │ ├── pretext-detection-deployment.md [NEW]
│ │ └── real-time-infrastructure-setup.md [NEW]
│ │
│ ├── operational-procedures/
│ │ ├── threat-response-playbook.md
│ │ ├── backup-recovery-procedures.md
│ │ ├── quality-assurance.md
│ │ ├── incident-response.md
│ │ ├── expert-fraud-response.md [NEW]
│ │ └── pretext-alert-procedures.md [NEW]
│ │
│ └── user-guides/
│ ├── citizen-guide/
│ │ ├── understanding-analysis.md
│ │ ├── participating-effectively.md
│ │ ├── organizing-advocacy.md
│ │ ├── using-transparency-tools.md [NEW]
│ │ └── understanding-pretext-alerts.md [NEW]
│ │
│ ├── ambassador-guide/
│ │ ├── facilitation-techniques.md
│ │ ├── community-engagement.md
│ │ └── troubleshooting.md
│ │
│ ├── expert-guide/ [NEW]
│ │ ├── verification-process.md
│ │ ├── contribution-guidelines.md
│ │ ├── peer-review-standards.md
│ │ └── credibility-building.md
│ │
│ └── institutional-guide/
│ ├── api-integration.md
│ ├── data-interpretation.md
│ └── best-practices.md
