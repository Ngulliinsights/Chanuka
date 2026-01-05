# **Chanuka Platform: Final Optimal Project Structure**

Based on comprehensive analysis of your current implementation, architectural vision, and research requirements, here's the refined optimal structure:

## **Executive Architecture Decision**

**Approach: Pragmatic Monorepo with Domain Boundaries**

* Start with clear domain separation within monorepo  
* Enable future microservices extraction  
* Maintain development velocity  
* Support 20-week phased migration

---

## **Optimal Project Structure**

chanuka-platform/  
│  
├── apps/                                    \# Deployable applications  
│   ├── web/                                 \# Main web application  
│   │   ├── src/  
│   │   │   ├── app/                        \# Next.js 14+ app router  
│   │   │   │   ├── (public)/  
│   │   │   │   │   ├── bills/  
│   │   │   │   │   ├── analysis/           \# Constitutional analysis pages  
│   │   │   │   │   └── arguments/          \# Argument map visualization  
│   │   │   │   ├── (auth)/  
│   │   │   │   │   └── dashboard/  
│   │   │   │   └── (advocacy)/  
│   │   │   │       └── campaigns/  
│   │   │   │  
│   │   │   ├── features/                   \# Feature-based organization  
│   │   │   │   ├── constitutional-analysis/  
│   │   │   │   │   ├── components/  
│   │   │   │   │   │   ├── ProvisionExplorer.tsx  
│   │   │   │   │   │   ├── PrecedentViewer.tsx  
│   │   │   │   │   │   ├── UncertaintyIndicator.tsx  
│   │   │   │   │   │   └── ExpertFlagPanel.tsx  
│   │   │   │   │   ├── hooks/  
│   │   │   │   │   │   └── useConstitutionalAnalysis.ts  
│   │   │   │   │   ├── services/  
│   │   │   │   │   │   └── analysis-client.ts  
│   │   │   │   │   └── types/  
│   │   │   │   │  
│   │   │   │   ├── argument-intelligence/  
│   │   │   │   │   ├── components/  
│   │   │   │   │   │   ├── ArgumentMapViewer.tsx  
│   │   │   │   │   │   ├── EvidenceTracker.tsx  
│   │   │   │   │   │   ├── CoalitionFinder.tsx  
│   │   │   │   │   │   ├── LegislativeBriefGenerator.tsx  
│   │   │   │   │   │   └── StakeholderPositionMatrix.tsx  
│   │   │   │   │   ├── hooks/  
│   │   │   │   │   │   ├── useArgumentAnalysis.ts  
│   │   │   │   │   │   └── useCoalitions.ts  
│   │   │   │   │   └── services/  
│   │   │   │   │       └── argument-client.ts  
│   │   │   │   │  
│   │   │   │   ├── advocacy/  
│   │   │   │   │   ├── components/  
│   │   │   │   │   │   ├── CampaignDashboard.tsx  
│   │   │   │   │   │   ├── ActionCoordinator.tsx  
│   │   │   │   │   │   ├── CoalitionBuilder.tsx  
│   │   │   │   │   │   └── ImpactTracker.tsx  
│   │   │   │   │   └── hooks/  
│   │   │   │   │       └── useCampaigns.ts  
│   │   │   │   │  
│   │   │   │   ├── bills/                  \# Existing, enhanced  
│   │   │   │   ├── community/              \# Existing  
│   │   │   │   ├── search/                 \# Existing  
│   │   │   │   └── users/                  \# Existing  
│   │   │   │  
│   │   │   ├── shared/                     \# Web-specific shared code  
│   │   │   │   ├── components/  
│   │   │   │   │   ├── ui/                \# Design system components  
│   │   │   │   │   ├── accessibility/  
│   │   │   │   │   │   ├── AudioContentPlayer.tsx  
│   │   │   │   │   │   ├── LiteracyLevelAdapter.tsx  
│   │   │   │   │   │   └── AccessibilityManager.tsx  
│   │   │   │   │   └── layout/  
│   │   │   │   ├── hooks/  
│   │   │   │   └── utils/  
│   │   │   │  
│   │   │   └── lib/  
│   │   │       ├── api-client.ts  
│   │   │       └── query-client.ts  
│   │   │  
│   │   ├── public/  
│   │   │   ├── assets/  
│   │   │   │   ├── images/  
│   │   │   │   ├── audio/                 \# Audio versions for accessibility  
│   │   │   │   └── locales/               \# Multi-language resources  
│   │   │   └── sw.js                      \# Service worker  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── api/                                \# Main API server  
│   │   ├── src/  
│   │   │   ├── features/                  \# Domain-driven features  
│   │   │   │   │  
│   │   │   │   ├── constitutional-analysis/  
│   │   │   │   │   ├── application/  
│   │   │   │   │   │   ├── constitutional-analyzer.service.ts  
│   │   │   │   │   │   ├── grounding.service.ts          \# NEW \- Links to precedent  
│   │   │   │   │   │   ├── uncertainty-assessor.service.ts \# NEW  
│   │   │   │   │   │   └── expert-flagging.service.ts  
│   │   │   │   │   ├── domain/  
│   │   │   │   │   │   ├── entities/  
│   │   │   │   │   │   │   ├── constitutional-provision.ts  
│   │   │   │   │   │   │   ├── legal-precedent.ts  
│   │   │   │   │   │   │   └── analysis-result.ts  
│   │   │   │   │   │   ├── value-objects/  
│   │   │   │   │   │   │   ├── certainty-level.ts  
│   │   │   │   │   │   │   └── conflict-severity.ts  
│   │   │   │   │   │   └── services/  
│   │   │   │   │   │       ├── provision-matcher.ts  
│   │   │   │   │   │       └── precedent-finder.ts  
│   │   │   │   │   ├── infrastructure/  
│   │   │   │   │   │   ├── repositories/  
│   │   │   │   │   │   │   ├── provision.repository.ts  
│   │   │   │   │   │   │   └── precedent.repository.ts  
│   │   │   │   │   │   └── external/  
│   │   │   │   │   │       └── legal-database-client.ts  \# NEW  
│   │   │   │   │   └── presentation/  
│   │   │   │   │       └── constitutional.controller.ts  
│   │   │   │   │  
│   │   │   │   ├── argument-intelligence/              \# NEW \- Critical Domain  
│   │   │   │   │   ├── application/  
│   │   │   │   │   │   ├── argument-processor.service.ts  
│   │   │   │   │   │   ├── structure-extractor.service.ts  
│   │   │   │   │   │   ├── clustering.service.ts  
│   │   │   │   │   │   ├── evidence-validator.service.ts  
│   │   │   │   │   │   ├── coalition-finder.service.ts  
│   │   │   │   │   │   ├── brief-generator.service.ts  
│   │   │   │   │   │   └── power-balancer.service.ts  
│   │   │   │   │   ├── domain/  
│   │   │   │   │   │   ├── entities/  
│   │   │   │   │   │   │   ├── argument.ts  
│   │   │   │   │   │   │   ├── claim.ts  
│   │   │   │   │   │   │   ├── evidence.ts  
│   │   │   │   │   │   │   └── stakeholder-position.ts  
│   │   │   │   │   │   └── value-objects/  
│   │   │   │   │   │       ├── evidence-quality.ts  
│   │   │   │   │   │       └── argument-strength.ts  
│   │   │   │   │   ├── infrastructure/  
│   │   │   │   │   │   ├── nlp/  
│   │   │   │   │   │   │   ├── sentence-classifier.ts  
│   │   │   │   │   │   │   ├── entity-extractor.ts  
│   │   │   │   │   │   │   └── similarity-calculator.ts  
│   │   │   │   │   │   └── repositories/  
│   │   │   │   │   │       └── argument.repository.ts  
│   │   │   │   │   └── presentation/  
│   │   │   │   │       └── argument.controller.ts  
│   │   │   │   │  
│   │   │   │   ├── advocacy/                          \# Enhanced  
│   │   │   │   │   ├── application/  
│   │   │   │   │   │   ├── campaign-manager.service.ts  
│   │   │   │   │   │   ├── action-coordinator.service.ts  
│   │   │   │   │   │   ├── alert-dispatcher.service.ts  
│   │   │   │   │   │   ├── coalition-builder.service.ts \# NEW  
│   │   │   │   │   │   └── impact-tracker.service.ts  
│   │   │   │   │   ├── domain/  
│   │   │   │   │   │   └── entities/  
│   │   │   │   │   │       ├── campaign.ts  
│   │   │   │   │   │       ├── action-item.ts  
│   │   │   │   │   │       └── coalition.ts  
│   │   │   │   │   ├── infrastructure/  
│   │   │   │   │   │   └── notifications/  
│   │   │   │   │   │       ├── sms-dispatcher.ts  
│   │   │   │   │   │       ├── email-dispatcher.ts  
│   │   │   │   │   │       └── push-dispatcher.ts  
│   │   │   │   │   └── presentation/  
│   │   │   │   │       └── advocacy.controller.ts  
│   │   │   │   │  
│   │   │   │   ├── universal-access/                  \# Enhanced  
│   │   │   │   │   ├── ussd/  
│   │   │   │   │   │   ├── gateway/  
│   │   │   │   │   │   │   ├── ussd-server.ts  
│   │   │   │   │   │   │   ├── menu-builder.ts  
│   │   │   │   │   │   │   └── session-manager.ts  
│   │   │   │   │   │   ├── menus/  
│   │   │   │   │   │   │   ├── main-menu.ts  
│   │   │   │   │   │   │   ├── voting-records.menu.ts  
│   │   │   │   │   │   │   └── bill-alerts.menu.ts  
│   │   │   │   │   │   └── services/  
│   │   │   │   │   │       ├── data-simplifier.ts  
│   │   │   │   │   │       └── telco-integrator.ts  
│   │   │   │   │   ├── ambassador/  
│   │   │   │   │   │   ├── ambassador-manager.service.ts  
│   │   │   │   │   │   ├── training.service.ts  
│   │   │   │   │   │   └── offline-sync.service.ts  
│   │   │   │   │   ├── localization/  
│   │   │   │   │   │   ├── content-adapter.ts  
│   │   │   │   │   │   ├── audio-generator.ts  
│   │   │   │   │   │   └── complexity-adjuster.ts  
│   │   │   │   │   └── presentation/  
│   │   │   │   │       ├── ussd.controller.ts  
│   │   │   │   │       └── ambassador.controller.ts  
│   │   │   │   │  
│   │   │   │   ├── bills/                             \# Existing, enhanced  
│   │   │   │   ├── community/                         \# Existing  
│   │   │   │   ├── search/                            \# Existing  
│   │   │   │   ├── users/                             \# Existing  
│   │   │   │   └── analytics/                         \# Existing  
│   │   │   │  
│   │   │   ├── infrastructure/  
│   │   │   │   ├── ai/                               \# AI Infrastructure  
│   │   │   │   │   ├── models/  
│   │   │   │   │   │   ├── constitutional-model.ts  
│   │   │   │   │   │   ├── argument-extractor-model.ts  
│   │   │   │   │   │   └── summarization-model.ts  
│   │   │   │   │   ├── embeddings/  
│   │   │   │   │   │   ├── embedding.service.ts  
│   │   │   │   │   │   └── similarity.service.ts  
│   │   │   │   │   ├── evaluation/                   \# NEW \- Critical  
│   │   │   │   │   │   ├── benchmark-runner.ts  
│   │   │   │   │   │   ├── bias-detector.ts  
│   │   │   │   │   │   └── accuracy-tracker.ts  
│   │   │   │   │   └── explainability/  
│   │   │   │   │       ├── attention-visualizer.ts  
│   │   │   │   │       └── uncertainty-quantifier.ts  
│   │   │   │   │  
│   │   │   │   ├── nlp/                              \# NLP Infrastructure  
│   │   │   │   │   ├── preprocessing/  
│   │   │   │   │   │   ├── tokenizer.ts  
│   │   │   │   │   │   └── legal-normalizer.ts  
│   │   │   │   │   ├── extraction/  
│   │   │   │   │   │   ├── named-entity-recognizer.ts  
│   │   │   │   │   │   └── citation-parser.ts  
│   │   │   │   │   └── classification/  
│   │   │   │   │       └── text-classifier.ts  
│   │   │   │   │  
│   │   │   │   ├── knowledge-base/                   \# Legal Knowledge  
│   │   │   │   │   ├── constitutional/  
│   │   │   │   │   │   ├── provisions.repository.ts  
│   │   │   │   │   │   └── precedents.repository.ts  
│   │   │   │   │   ├── legislative/  
│   │   │   │   │   │   └── acts.repository.ts  
│   │   │   │   │   └── indexing/  
│   │   │   │   │       └── semantic-index.ts  
│   │   │   │   │  
│   │   │   │   ├── database/                         \# From shared  
│   │   │   │   ├── cache/                            \# From shared  
│   │   │   │   ├── messaging/                        \# Message queue  
│   │   │   │   └── monitoring/                       \# Observability  
│   │   │   │  
│   │   │   ├── shared/                               \# API-specific shared  
│   │   │   │   ├── middleware/  
│   │   │   │   ├── guards/  
│   │   │   │   └── utils/  
│   │   │   │  
│   │   │   └── main.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── institutional-api/                           \# NEW \- Revenue Service  
│   │   ├── src/  
│   │   │   ├── gateway/  
│   │   │   │   ├── api-gateway.ts  
│   │   │   │   ├── rate-limiter.ts  
│   │   │   │   └── authentication.ts  
│   │   │   ├── adapters/  
│   │   │   │   ├── committee-adapters/  
│   │   │   │   │   ├── budget-committee.adapter.ts  
│   │   │   │   │   └── constitutional-affairs.adapter.ts  
│   │   │   │   └── format-adapters/  
│   │   │   │       ├── pdf-generator.ts  
│   │   │   │       ├── excel-exporter.ts  
│   │   │   │       └── parliamentary-format.ts  
│   │   │   ├── subscription/  
│   │   │   │   ├── tier-manager.service.ts  
│   │   │   │   ├── billing-integration.service.ts  
│   │   │   │   └── feature-gates.ts  
│   │   │   └── analytics/  
│   │   │       ├── usage-tracker.ts  
│   │   │       └── value-reporter.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── worker/                                      \# Background jobs (existing, enhanced)  
│   │   ├── src/  
│   │   │   ├── jobs/  
│   │   │   │   ├── constitutional-analysis.job.ts  
│   │   │   │   ├── argument-processing.job.ts       \# NEW  
│   │   │   │   ├── ai-evaluation.job.ts             \# NEW  
│   │   │   │   ├── impact-measurement.job.ts        \# NEW  
│   │   │   │   └── \[existing jobs\]  
│   │   │   └── processors/  
│   │   │  
│   │   └── package.json  
│   │  
│   └── ambassador-app/                              \# NEW \- Mobile app for ambassadors  
│       ├── src/  
│       │   ├── screens/  
│       │   │   ├── CommunityDashboard.tsx  
│       │   │   ├── SessionFacilitator.tsx  
│       │   │   ├── DataCollector.tsx  
│       │   │   └── SyncManager.tsx  
│       │   ├── offline/  
│       │   │   ├── local-storage.ts  
│       │   │   ├── sync-queue.ts  
│       │   │   └── conflict-resolver.ts  
│       │   └── utils/  
│       │       ├── accessibility-helpers.ts  
│       │       └── low-literacy-ui.ts  
│       │  
│       └── package.json  
│  
├── packages/                                        \# Shared packages  
│   ├── database/                                    \# Database layer (existing, enhanced)  
│   │   ├── src/  
│   │   │   ├── core/  
│   │   │   │   ├── connection.ts  
│   │   │   │   ├── config.ts  
│   │   │   │   └── health-monitor.ts  
│   │   │   ├── schemas/                            \# All schemas  
│   │   │   │   ├── foundation.ts  
│   │   │   │   ├── citizen-participation.ts  
│   │   │   │   ├── constitutional-intelligence.ts  
│   │   │   │   ├── argument-intelligence.ts        \# NEW  
│   │   │   │   ├── advocacy-coordination.ts  
│   │   │   │   ├── universal-access.ts  
│   │   │   │   ├── platform-operations.ts  
│   │   │   │   ├── integrity-operations.ts  
│   │   │   │   └── enum.ts  
│   │   │   ├── migrations/  
│   │   │   │   ├── 001\_initial.sql  
│   │   │   │   ├── 002\_argument\_intelligence.sql   \# NEW  
│   │   │   │   └── \[other migrations\]  
│   │   │   └── repositories/                        \# Base repository patterns  
│   │   │       └── base.repository.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── types/                                       \# Shared TypeScript types  
│   │   ├── src/  
│   │   │   ├── domains/  
│   │   │   │   ├── constitutional.types.ts  
│   │   │   │   ├── argument.types.ts               \# NEW  
│   │   │   │   ├── advocacy.types.ts  
│   │   │   │   ├── accessibility.types.ts          \# NEW  
│   │   │   │   └── \[other domain types\]  
│   │   │   ├── api/  
│   │   │   │   ├── request.types.ts  
│   │   │   │   └── response.types.ts  
│   │   │   └── common/  
│   │   │       └── utility.types.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── validation/                                  \# Shared validation schemas  
│   │   ├── src/  
│   │   │   ├── schemas/  
│   │   │   │   ├── bill.schema.ts  
│   │   │   │   ├── comment.schema.ts  
│   │   │   │   ├── argument.schema.ts              \# NEW  
│   │   │   │   └── \[other schemas\]  
│   │   │   └── validators/  
│   │   │       └── common.validators.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── ui/                                          \# Shared UI components  
│   │   ├── src/  
│   │   │   ├── components/  
│   │   │   │   ├── primitives/                     \# Base components  
│   │   │   │   │   ├── Button/  
│   │   │   │   │   ├── Input/  
│   │   │   │   │   └── \[shadcn/ui components\]  
│   │   │   │   ├── feedback/  
│   │   │   │   │   ├── Alert/  
│   │   │   │   │   ├── Toast/  
│   │   │   │   │   └── LoadingSpinner/  
│   │   │   │   └── accessibility/  
│   │   │   │       ├── AudioPlayer/  
│   │   │   │       └── ComplexityAdapter/  
│   │   │   ├── hooks/  
│   │   │   │   ├── useMediaQuery.ts  
│   │   │   │   └── useAccessibility.ts  
│   │   │   ├── styles/  
│   │   │   │   └── globals.css  
│   │   │   └── tokens/  
│   │   │       ├── colors.ts  
│   │   │       ├── typography.ts  
│   │   │       └── spacing.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   ├── utils/                                       \# Shared utilities  
│   │   ├── src/  
│   │   │   ├── formatting/  
│   │   │   │   ├── date.ts  
│   │   │   │   ├── currency.ts  
│   │   │   │   └── text.ts  
│   │   │   ├── validation/  
│   │   │   │   └── validators.ts  
│   │   │   └── helpers/  
│   │   │       ├── array.ts  
│   │   │       └── object.ts  
│   │   │  
│   │   └── package.json  
│   │  
│   └── config/                                      \# Shared configuration  
│       ├── src/  
│       │   ├── env.ts  
│       │   ├── constants.ts  
│       │   └── feature-flags.ts  
│       │  
│       └── package.json  
│  
├── ai-models/                                       \# AI model storage & config  
│   ├── constitutional/  
│   │   ├── provision-matcher/  
│   │   │   ├── model.bin  
│   │   │   ├── config.json  
│   │   │   └── README.md  
│   │   └── precedent-finder/  
│   │       └── \[model files\]  
│   │  
│   ├── argumentation/                               \# NEW  
│   │   ├── argument-extractor/  
│   │   ├── evidence-evaluator/  
│   │   └── coalition-identifier/  
│   │  
│   ├── embeddings/  
│   │   ├── legal-embeddings/  
│   │   └── multilingual-embeddings/  
│   │  
│   └── evaluation/                                  \# NEW \- Critical  
│       ├── benchmarks/  
│       │   └── legal-glue/  
│       └── test-sets/  
│           ├── kenyan-legislation/  
│           └── constitutional-cases/  
│  
├── knowledge-base/                                  \# Structured legal knowledge  
│   ├── constitutional/  
│   │   ├── kenyan-constitution/  
│   │   │   ├── full-text.json  
│   │   │   ├── articles/  
│   │   │   └── bill-of-rights/  
│   │   ├── precedents/  
│   │   │   ├── supreme-court/  
│   │   │   ├── court-of-appeal/  
│   │   │   └── high-court/  
│   │   └── scholarly-works/  
│   │  
│   ├── legislative/  
│   │   ├── acts/  
│   │   └── bills/  
│   │  
│   └── contextual/                                  \# Localized content  
│       ├── regional-examples/  
│       │   ├── nairobi/  
│       │   ├── mombasa/  
│       │   └── rural-communities/  
│       └── translations/  
│           ├── swahili/  
│           ├── kikuyu/  
│           └── luo/  
│  
├── evaluation-framework/                            \# NEW \- AI evaluation  
│   ├── benchmarks/  
│   │   ├── legal-glue/  
│   │   │   ├── runner.ts  
│   │   │   └── test-cases.json  
│   │   └── constitutional-reasoning/  
│   │  
│   ├── bias-detection/  
│   │   ├── political-bias-detector.ts  
│   │   └── demographic-bias-detector.ts  
│   │  
│   └── continuous-evaluation/  
│       ├── production-monitor.ts  
│       └── error-analyzer.ts  
│  
├── localization-pipeline/                           \# NEW \- Content localization  
│   ├── src/  
│   │   ├── translation/  
│   │   │   ├── translation-manager.ts  
│   │   │   └── glossary-manager.ts  
│   │   ├── adaptation/  
│   │   │   ├── cultural-adapter.ts  
│   │   │   └── example-generator.ts  
│   │   ├── audio/  
│   │   │   ├── tts-generator.ts  
│   │   │   └── audio-validator.ts  
│   │   └── complexity-adjustment/  
│   │       ├── simplifier.ts  
│   │       └── complexity-scorer.ts  
│   │  
│   ├── content/  
│   │   ├── source/                                  \# Original content  
│   │   ├── translated/                              \# Translations  
│   │   ├── adapted/                                 \# Culturally adapted  
│   │   └── audio/                                   \# Audio versions  
│   │  
│   └── package.json  
│  
├── impact-measurement/                              \# NEW \- Impact tracking  
│   ├── src/  
│   │   ├── tracking/  
│   │   │   ├── participation-tracker.ts  
│   │   │   ├── advocacy-tracker.ts  
│   │   │   ├── legislative-outcome-tracker.ts  
│   │   │   └── attribution-engine.ts  
│   │   ├── analysis/  
│   │   │   ├── impact-calculator.ts  
│   │   │   └── trend-analyzer.ts  
│   │   └── reporting/  
│   │       ├── impact-report-generator.ts  
│   │       └── donor-report-generator.ts  
│   │  
│   ├── metrics/  
│   │   ├── engagement-metrics.json  
│   │   └── outcome-metrics.json  
│   │  
│   └── package.json  
│  
├── infrastructure/                                  \# Deployment & operations  
│   ├── kubernetes/  
│   │   ├── api/  
│   │   ├── institutional-api/                       \# NEW  
│   │   ├── worker/  
│   │   └── monitoring/  
│   │  
│   ├── docker/  
│   │   ├── Dockerfile.api  
│   │   ├── Dockerfile.institutional-api             \# NEW  
│   │   └── docker-compose.yml  
│   │  
│   ├── terraform/                                   \# Infrastructure as code  
│   │   ├── main.tf  
│   │   └── modules/  
│   │  
│   └── monitoring/  
│       ├── dashboards/  
│       │   ├── system-health.json  
│       │   ├── ai-performance.json                  \# NEW  
│       │   └── accessibility-metrics.json           \# NEW  
│       └── alerts/  
│  
├── docs/                                            \# Comprehensive documentation  
│   ├── architecture/  
│   │   ├── system-overview.md  
│   │   ├── constitutional-analysis.md  
│   │   ├── argument-intelligence.md                 \# NEW  
│   │   ├── universal-access.md  
│   │   └── institutional-integration.md             \# NEW  
│   │  
│   ├── research-foundation/  
│   │   ├── literature-review.md  
│   │   ├── design-decisions.md  
│   │   └── evaluation-criteria.md  
│   │  
│   ├── implementation-guides/  
│   │   ├── constitutional-analysis-implementation.md  
│   │   ├── argument-intelligence-implementation.md   \# NEW  
│   │   └── institutional-api-integration.md          \# NEW  
│   │  
│   └── api/  
│       ├── openapi.yml  
│       └── institutional-api.md                      \# NEW  
│  
├── scripts/                                         \# Utility scripts  
│   ├── ai-model-training/  
│   │   ├── train-constitutional-model.ts  
│   │   ├── train-argument-extractor.ts              \# NEW  
│   │   └── evaluate-models.ts  
│   │  
│   ├── knowledge-base-updates/  
│   │   ├── import-precedents.ts  
│   │   └── update-legislation.ts  
│   │  
│   ├── localization/  
│   │   ├── extract-translatable.ts  
│   │   └── generate-audio.ts  
│   │  
│   └── impact-measurement/  
│       ├── calculate-metrics.ts  
│       └── generate-reports.ts  
│  
├── tests/                                           \# Comprehensive testing  
│   ├── unit/  
│   ├── integration/  
│   │   ├── constitutional-analysis/  
│   │   ├── argument-intelligence/                   \# NEW  
│   │   └── advocacy/  
│   └── e2e/  
│  
├── .github/  
│   └── workflows/  
│       ├── ci.yml  
│       ├── cd.yml  
│       └── ai-evaluation.yml                        \# NEW  
│  
├── package.json                                     \# Root workspace config  
├── pnpm-workspace.yaml  
├── turbo.json                                       \# Turborepo config  
├── tsconfig.json                                    \# Base TypeScript config  
├── .env.example  
└── README.md

---

## **Critical Implementation Priorities**

### **Phase 1: Foundation (Weeks 1-4) \- IMMEDIATE**

**Goal: Establish monorepo structure**

\# Week 1-2: Setup  
\- Create monorepo with Turborepo/pnpm workspaces  
\- Extract database to packages/database  
\- Create packages/types for shared types  
\- Set up build pipeline

\# Week 3-4: Initial Migration  
\- Move client to apps/web  
\- Create apps/api skeleton    
\- Establish shared package imports  
\- Update all import paths

### **Phase 2: Argument Intelligence (Weeks 5-8) \- HIGHEST VALUE**

**Goal: Implement core differentiator**

\# This is THE critical missing piece  
\# Transforms participation → influence

Week 5: NLP Infrastructure  
\- Set up NLP pipeline  
\- Create argument extraction model  
\- Build clustering service

Week 6: Core Services    
\- Structure extractor  
\- Evidence validator  
\- Basic clustering

Week 7: Advanced Features  
\- Coalition finder  
\- Power balancer  
\- Brief generator

Week 8: Integration & Testing  
\- Connect to comment system  
\- Generate test briefs  
\- User acceptance testing

### **Phase 3: Constitutional Grounding (Weeks 9-12)**

**Goal: Complete constitutional analysis per research requirements**

Week 9: Knowledge Base  
\- Import constitutional provisions  
\- Structure precedent database  
\- Create citation parser

Week 10-11: Grounding Service  
\- Implement precedent matching  
\- Add uncertainty assessment  
\- Create expert flagging

Week 12: Integration  
\- Connect to analysis display  
\- Add uncertainty indicators  
\- Test with real bills

### **Phase 4: Universal Access (Weeks 13-16)**

**Goal: Complete equity infrastructure**

Week 13: USSD Enhancement  
\- Extract to separate concern  
\- Improve menu structure  
\- Add all telco integrations

Week 14-15: Ambassador Tools  
\- Build offline mobile app  
\- Implement sync system  
\- Create facilitation guides

Week 16: Localization  
\- Complete translation pipeline  
\- Add audio generation  
\- Test multi-language support

### **Phase 5: Institutional Integration (Weeks 17-20)**

**Goal: Create revenue model**

Week 17-18: API Gateway  
\- Build institutional API  
\- Add authentication  
\- Create format adapters

Week 19: Subscription System  
\- Implement tiers  
\- Add billing integration  
\- Create usage tracking

Week 20: Launch  
\- Beta test with institution  
\- Gather feedback  
\- Iterate based on results

---

## **Key Architectural Decisions**

### **1\. Monorepo with Clear Domain Boundaries**

* **Rationale**: Enables code sharing while maintaining clear domain separation  
* **Future**: Domains can be extracted to microservices when needed  
* **Tool**: Turborepo for fast, incremental builds

### **2\. Packages for Shared Code**

* **database**: Single source of truth for schemas  
* **types**: Shared TypeScript definitions  
* **validation**: Consistent validation across apps  
* **ui**: Shared component library  
* **utils**: Common utilities

### **3\. Feature-Based Organization in Apps**

* Each feature contains: components, hooks, services, types  
* Makes it easy to understand feature scope  
* Facilitates future extraction if needed

### **4\. Separate AI Infrastructure**

* **ai-models/**: Model storage and configuration  
* **evaluation-framework/**: Continuous quality monitoring  
* **knowledge-base/**: Structured legal knowledge  
* Supports research requirement for rigorous AI evaluation

### **5\. Localization as First-Class Concern**

* **localization-pipeline/**: Dedicated localization infrastructure  
* Content adaptation, not just translation  
* Audio generation for accessibility

### **6\. Impact Measurement Built-In**

* **impact-measurement/**: Dedicated measurement infrastructure  
* Tracks participation → outcomes  
* Provides accountability for democratic claims

---

## **Migration Strategy**

### **STOP First: New Code in New Structure**

Before migrating existing code, ensure ALL new development follows optimal structure:

// ❌ OLD \- Don't do this anymore  
server/features/some-new-feature/

// ✅ NEW \- All new code here  
apps/api/src/features/some-new-feature/  
  ├── application/    \# Services  
  ├── domain/         \# Business logic  
  ├── infrastructure/ \# External integrations  
  └── presentation/   \# Controllers

### **Gradual Migration: Domain by Domain**

\# Priority Order:  
1\. Extract database → packages/database (Week 1-2)  
2\. Extract types → packages/types (Week 2-3)    
3\. Implement argument intelligence NEW (Week 5-8)  
4\. Enhance constitutional analysis (Week 9-12)  
5\. Complete universal access (Week 13-16)  
6\. Build institutional API NEW (Week 17-20)

### **Backward Compatibility During Migration**

// During migration, maintain adapters  
// OLD code can still work while NEW code is built

// apps/api/src/infrastructure/legacy/  
export class LegacyAdapter {  
  // Adapts old service interfaces to new ones  
  // Remove after full migration  
}

---

## **Critical Success Factors**

### **1\. Argument Intelligence MUST Work**

This is the core differentiator. Platform goes from "comments" to "legislative briefs"

### **2\. Constitutional Analysis Must Be Research-Backed**

No "veneer of neutrality" \- every analysis grounded in precedent

### **3\. Universal Access Must Actually Work**

If only privileged users access it, platform reinforces inequality

### **4\. AI Must Be Continuously Evaluated**

Research integrity requires rigorous evaluation, not assumptions

### **5\. Impact Must Be Measurable**

Democratic effectiveness claims need data backing

---

## **Technology Stack**

### **Core**

* **Language**: TypeScript (strict mode)  
* **Runtime**: Node.js 20+  
* **Package Manager**: pnpm with workspaces  
* **Build Tool**: Turborepo

### **Frontend (apps/web)**

* **Framework**: Next.js 14+ (App Router)  
* **Styling**: Tailwind CSS \+ shadcn/ui  
* **State**: Zustand \+ React Query  
* **Forms**: React Hook Form \+ Zod

### **Backend (apps/api)**

* **Framework**: Express.js  
* **Database**: PostgreSQL 15+ with Drizzle ORM  
* **Cache**: Redis  
* **Queue**: BullMQ

### **AI/NLP**

* **Models**: Hugging Face Transformers  
* **Embeddings**: sentence-transformers  
* **Orchestration**: LangChain  
* **Vector DB**: pgvector extension

### **Mobile (apps/ambassador-app)**

* **Framework**: React Native  
* **Offline**: SQLite \+ background sync

### **Infrastructure**

* **Containers**: Docker  
* **Orchestration**: Kubernetes  
* **IaC**: Terraform  
* **Monitoring**: Prometheus \+ Grafana

---

## **Next Steps**

### **Week 1 Actions**

1. **Set up monorepo structure**

pnpm init  
\# Add workspace packages  
\# Configure Turborepo

2. **Extract database package**

mkdir \-p packages/database/src  
\# Move all schemas  
\# Update imports

3. **Create development guidelines**

\# All new code follows optimal structure  
\# No new code in old locations    
\# Migration happens domain by domain

4. **Establish testing requirements**

// Every new feature requires:  
// \- Unit tests  
// \- Integration tests    
// \- E2E tests for critical paths

---

## **Conclusion**

This structure:

* ✅ Maintains what works in current implementation  
* ✅ Fills critical gaps (argument intelligence, institutional API, AI evaluation)  
* ✅ Supports all 8 research-backed domains  
* ✅ Enables gradual, non-breaking migration  
* ✅ Provides clear path to microservices when needed  
* ✅ Prioritizes highest-value features first (argument intelligence)  
* ✅ Embeds equity (universal access) and integrity (AI evaluation) from start

**The optimal structure isn't just organization—it's the architecture that enables Chanuka to deliver on its promise of research-backed democratic transformation.**

