# Module Resolution Error Analysis

**Total Module Resolution Errors:** 1348

## Error Breakdown by Code

- **TS2307**: 1072 errors
- **TS2305**: 132 errors
- **TS2614**: 90 errors
- **TS2724**: 54 errors

## Missing Modules (TS2307)

**Total Missing Modules:** 402

### External Packages (likely missing dependencies)

- `@`
- `compression`
- `croner`
- `fuse`
- `inversify`
- `inversify-express-utils`
- `multer`

### Path Aliases (tsconfig paths)

- `@server/config/index`
- `@server/core/validation/validation-services-init.ts`
- `@server/domain/interfaces/bill-repository.interface`
- `@server/domain/interfaces/sponsor-repository.interface`
- `@server/domain/interfaces/user-repository.interface`
- `@server/errors/error-tracker`
- `@server/feature/security/security-audit-service`
- `@server/features/admin/admin`
- `@server/features/admin/content-moderation`
- `@server/features/admin/external-api-dashboard`
- `@server/features/admin/moderation/content-analysis.service`
- `@server/features/admin/moderation/moderation-analytics.service`
- `@server/features/admin/moderation/moderation-decision.service`
- `@server/features/admin/moderation/moderation-queue.service`
- `@server/features/admin/moderation/types`
- `@server/features/admin/system`
- `@server/features/advocacy/application/action-coordinator`
- `@server/features/advocacy/application/campaign-service`
- `@server/features/advocacy/application/coalition-builder`
- `@server/features/advocacy/application/impact-tracker`
- `@server/features/advocacy/config/advocacy-config`
- `@server/features/advocacy/domain/events/advocacy-events`
- `@server/features/advocacy/domain/services/campaign-domain-service`
- `@server/features/advocacy/infrastructure/services/notification-service`
- `@server/features/advocacy/infrastructure/services/representative-contact-service`
- `@server/features/analysis/analysis.routes`
- `@server/features/analysis/application/constitutional-analysis.service`
- `@server/features/analysis/application/public-interest-analysis.service`
- `@server/features/analysis/application/stakeholder-analysis.service`
- `@server/features/analysis/application/transparency-analysis.service`
- `@server/features/analysis/infrastructure/adapters/ml-service-adapter`
- `@server/features/analytics/analytics`
- `@server/features/analytics/conflict-detection/conflict-detection-engine.service`
- `@server/features/analytics/conflict-detection/conflict-resolution-recommendation.service`
- `@server/features/analytics/conflict-detection/conflict-severity-analyzer.service`
- `@server/features/analytics/conflict-detection/stakeholder-analysis.service`
- `@server/features/analytics/conflict-detection/types`
- `@server/features/analytics/controllers/engagement.controller`
- `@server/features/analytics/engagement/engagement-analytics.service`
- `@server/features/analytics/financial-disclosure/config`
- `@server/features/analytics/financial-disclosure/financial-disclosure-analytics.service`
- `@server/features/analytics/financial-disclosure/monitoring`
- `@server/features/analytics/middleware/analytics-context`
- `@server/features/analytics/middleware/performance-tracking`
- `@server/features/analytics/ml/real-ml-analysis.service`
- `@server/features/analytics/regulatory-change-monitoring`
- `@server/features/analytics/scripts/configure-ml-migration`
- `@server/features/analytics/services/ml.service`
- `@server/features/analytics/services/real-ml.service`
- `@server/features/argument-intelligence/application/structure-extractor`
- `@server/features/argument-intelligence/argument-intelligence-router`
- `@server/features/bills/application/bill-service`
- `@server/features/bills/application/bill-service-adapter`
- `@server/features/bills/bill-status-monitor`
- `@server/features/bills/bill-tracking.routes`
- `@server/features/bills/bills-router`
- `@server/features/bills/services/voting-pattern-analysis-service`
- `@server/features/bills/sponsor-conflict-analysis`
- `@server/features/bills/sponsorship.routes`
- `@server/features/bills/types/analysis`
- `@server/features/bills/voting-pattern-analysis-router`
- `@server/features/community/comment-voting`
- `@server/features/community/community`
- `@server/features/constitutional-analysis/application/constitutional-analysis-factory`
- `@server/features/constitutional-analysis/application/constitutional-analyzer`
- `@server/features/constitutional-analysis/application/expert-flagging-service`
- `@server/features/constitutional-analysis/application/precedent-finder`
- `@server/features/constitutional-analysis/application/provision-matcher`
- `@server/features/constitutional-analysis/constitutional-analysis-router`
- `@server/features/constitutional-analysis/presentation/constitutional-analysis-router`
- `@server/features/coverage/coverage-routes`
- `@server/features/government-data/application/managed-integration.service`
- `@server/features/government-data/services/government-data-integration.service`
- `@server/features/monitoring/application/api-cost-monitoring.service`
- `@server/features/notifications/domain/entities/notification`
- `@server/features/privacy/privacy-routes`
- `@server/features/privacy/privacy-scheduler`
- `@server/features/privacy/privacy-service`
- `@server/features/recommendation/RecommendationController`
- `@server/features/recommendation/application/RecommendationService`
- `@server/features/safeguards/application/cib-detection-service`
- `@server/features/safeguards/application/moderation-service`
- `@server/features/safeguards/application/rate-limit-service`
- `@server/features/search/SearchController`
- `@server/features/search/application/SearchService`
- `@server/features/search/deployment/search-deployment.service`
- `@server/features/search/engines/core/postgresql-fulltext.engine`
- `@server/features/search/monitoring/search-performance-monitor`
- `@server/features/search/utils/search-syntax-parser`
- `@server/features/security/encryption-service`
- `@server/features/security/security-audit-service`
- `@server/features/sponsors/application/sponsor-conflict-analysis.service`
- `@server/features/sponsors/application/sponsor-service-direct`
- `@server/features/sponsors/sponsors.routes`
- `@server/features/sponsors/types/analysis`
- `@server/features/users/application/profile`
- `@server/features/users/application/verification`
- `@server/features/users/domain/user-preferences`
- `@server/features/users/infrastructure/user-repository.ts`
- `@server/infrastructure/cache`
- `@server/infrastructure/cache/cache-management.routes`
- `@server/infrastructure/caching/query-cache`
- `@server/infrastructure/core/auth/auth`
- `@server/infrastructure/core/auth/auth-service`
- `@server/infrastructure/core/auth/secure-session-service`
- `@server/infrastructure/core/auth/session-cleanup`
- `@server/infrastructure/core/database-orchestrator`
- `@server/infrastructure/core/errors/error-tracker`
- `@server/infrastructure/core/index`
- `@server/infrastructure/core/src/observability/logging`
- `@server/infrastructure/core/unified-config`
- `@server/infrastructure/core/validation/data-completeness`
- `@server/infrastructure/core/validation/data-validation`
- `@server/infrastructure/core/validation/data-validation-service`
- `@server/infrastructure/core/validation/input-validation-service`
- `@server/infrastructure/core/validation/schema-validation-service`
- `@server/infrastructure/core/validation/schemas`
- `@server/infrastructure/core/validation/validation-metrics`
- `@server/infrastructure/core/validation/validation-services-init`
- `@server/infrastructure/core/websocket-service`
- `@server/infrastructure/database`
- `@server/infrastructure/database/base/BaseStorage`
- `@server/infrastructure/database/connection`
- `@server/infrastructure/database/core/config`
- `@server/infrastructure/database/core/config.ts`
- `@server/infrastructure/database/core/connection-manager`
- `@server/infrastructure/database/core/connection-manager.ts`
- `@server/infrastructure/database/core/health-monitor`
- `@server/infrastructure/database/core/health-monitor.ts`
- `@server/infrastructure/database/database-service`
- `@server/infrastructure/database/database.service`
- `@server/infrastructure/database/index`
- `@server/infrastructure/database/pool`
- `@server/infrastructure/demo-data`
- `@server/infrastructure/error-handling`
- `@server/infrastructure/errors/result-adapter`
- `@server/infrastructure/external-data/conflict-resolution-service`
- `@server/infrastructure/external-data/external-api-manager`
- `@server/infrastructure/external-data/government-data-service`
- `@server/infrastructure/logging/database-logger`
- `@server/infrastructure/migration/ab-testing.service`
- `@server/infrastructure/migration/deployment-orchestrator`
- `@server/infrastructure/migration/feature-flags-service`
- `@server/infrastructure/migration/feature-flags.service`
- `@server/infrastructure/migration/repository-deployment-validator`
- `@server/infrastructure/monitoring/index`
- `@server/infrastructure/monitoring/monitoring-scheduler`
- `@server/infrastructure/monitoring/performance-monitor`
- `@server/infrastructure/notifications/email-service`
- `@server/infrastructure/notifications/index`
- `@server/infrastructure/notifications/notification-channels`
- `@server/infrastructure/notifications/notification-orchestrator`
- `@server/infrastructure/notifications/notification-scheduler`
- `@server/infrastructure/notifications/notification-service`
- `@server/infrastructure/notifications/notification-service.ts`
- `@server/infrastructure/notifications/notifications`
- `@server/infrastructure/notifications/smart-notification-filter`
- `@server/infrastructure/notifications/types`
- `@server/infrastructure/observability`
- `@server/infrastructure/observability/logger`
- `@server/infrastructure/performance/performance-monitor`
- `@server/infrastructure/schema/advanced_discovery`
- `@server/infrastructure/schema/argument_intelligence`
- `@server/infrastructure/schema/foundation`
- `@server/infrastructure/schema/index`
- `@server/infrastructure/schema/integrity_operations`
- `@server/infrastructure/schema/market_intelligence`
- `@server/infrastructure/schema/platform_operations`
- `@server/infrastructure/schema/safeguards`
- `@server/infrastructure/schema/schema`
- `@server/infrastructure/schema/search_system`
- `@server/infrastructure/schema/websocket`
- `@server/infrastructure/security/data-privacy-service`
- `@server/infrastructure/security/input-validation-service`
- `@server/infrastructure/security/secure-query-builder`
- `@server/infrastructure/validation/repository-validation`
- `@server/infrastructure/websocket`
- `@server/infrastructure/websocket-adapter.ts`
- `@server/middleware/app-middleware`
- `@server/middleware/auth`
- `@server/middleware/auth-types`
- `@server/middleware/circuit-breaker-middleware`
- `@server/middleware/error-management`
- `@server/middleware/migration-wrapper`
- `@server/middleware/rate-limiter`
- `@server/scripts/validate-connection-migration`
- `@server/scripts/websocket-performance-validation`
- `@server/security/security-audit-service`
- `@server/services/external-api-error-handler`
- `@server/types`
- `@server/types/common`
- `@server/types/index`
- `@server/utils/analytics-controller-wrapper`
- `@server/utils/errors.js`
- `@server/utils/missing-modules-fallback`
- `@server/utils/shared-core-fallback`
- `@server/vite`
- `@shared/admin/content-moderation`
- `@shared/aggregates/user-aggregate`
- `@shared/analysis/types/index`
- `@shared/application/EngagementTracker`
- `@shared/application/RecommendationService`
- `@shared/application/analysis-service-direct`
- `@shared/application/bill-comprehensive-analysis.service`
- `@shared/application/bill-tracking.service`
- `@shared/application/bills`
- `@shared/application/constitutional-analysis-service-complete`
- `@shared/application/constitutional-analysis.service`
- `@shared/application/constitutional-analyzer`
- `@shared/application/expert-flagging-service`
- `@shared/application/precedent-finder`
- `@shared/application/provision-matcher`
- `@shared/application/sponsor-conflict-analysis.service`
- `@shared/application/sponsor-service-direct`
- `@shared/bill-status-monitor`
- `@shared/citizen_participation`
- `@shared/config`
- `@shared/config/analytics.config`
- `@shared/core/caching`
- `@shared/core/caching/index`
- `@shared/core/caching/key-generator`
- `@shared/core/errors`
- `@shared/core/observability`
- `@shared/core/observability/distributed-tracing`
- `@shared/core/observability/error-management`
- `@shared/core/observability/error-management/errors/specialized-errors`
- `@shared/core/observability/error-management/middleware/express-error-middleware`
- `@shared/core/observability/logging`
- `@shared/core/observability/logging/logger`
- `@shared/core/performance/index`
- `@shared/core/src/observability/error-management/errors/base-error`
- `@shared/core/src/observability/error-management/middleware/express-error-middleware`
- `@shared/core/src/observability/error-management/patterns/circuit-breaker`
- `@shared/core/src/observability/logging`
- `@shared/core/utils/api-utils`
- `@shared/core/validation`
- `@shared/database`
- `@shared/domain/RecommendationEngine`
- `@shared/domain/RecommendationValidator`
- `@shared/domain/aggregates/user-aggregate`
- `@shared/domain/entities/action-item`
- `@shared/domain/entities/bill`
- `@shared/domain/entities/campaign`
- `@shared/domain/entities/citizen-verification`
- `@shared/domain/entities/user`
- `@shared/domain/entities/user-profile`
- `@shared/domain/errors/advocacy-errors`
- `@shared/domain/errors/bill-errors`
- `@shared/domain/events/advocacy-events`
- `@shared/domain/events/bill-events`
- `@shared/domain/recommendation.dto`
- `@shared/domain/search.dto`
- `@shared/domain/services/bill-domain-service`
- `@shared/domain/services/bill-notification-service`
- `@shared/domain/services/campaign-domain-service`
- `@shared/domain/user-profile`
- `@shared/drizzle-adapter`
- `@shared/entities/bill`
- `@shared/entities/campaign`
- `@shared/entities/citizen-verification`
- `@shared/entities/value-objects`
- `@shared/errors/error-adapter`
- `@shared/errors/error-standardization`
- `@shared/errors/result-adapter`
- `@shared/events/bill-events`
- `@shared/external-data/external-api-manager`
- `@shared/foundation`
- `@shared/infrastructure/RecommendationCache`
- `@shared/infrastructure/RecommendationRepository`
- `@shared/infrastructure/batching-service`
- `@shared/infrastructure/database/index`
- `@shared/infrastructure/database/migration-service`
- `@shared/infrastructure/errors/error-adapter`
- `@shared/infrastructure/errors/error-standardization`
- `@shared/infrastructure/external-data/external-api-manager`
- `@shared/infrastructure/external-data/government-data-integration`
- `@shared/infrastructure/external/legal-database-client`
- `@shared/infrastructure/monitoring/audit-log`
- `@shared/infrastructure/nlp/entity-extractor`
- `@shared/infrastructure/nlp/sentence-classifier`
- `@shared/infrastructure/nlp/similarity-calculator`
- `@shared/infrastructure/repositories/constitutional-analyses-repository`
- `@shared/infrastructure/repositories/constitutional-provisions-repository`
- `@shared/infrastructure/repositories/expert-review-queue-repository`
- `@shared/infrastructure/repositories/legal-precedents-repository`
- `@shared/infrastructure/security/input-validation-service`
- `@shared/infrastructure/websocket`
- `@shared/middleware/async-handler`
- `@shared/middleware/error-context`
- `@shared/monitoring`
- `@shared/monitoring/performance-monitor`
- `@shared/repositories/sponsorship-repository`
- `@shared/schema/accountability_ledger`
- `@shared/shared/database/connection`
- `@shared/shared/schema`
- `@shared/types/ml`
- `@shared/validation/input-validation-service`
- `@shared/websocket`

### Internal Modules (old aliases)

- `@/config/index`
- `@/core/errors/error-tracker`
- `@/core/observability`
- `@/features/notifications/domain/entities/notification`
- `@/features/users/domain/entities/user`
- `@/infrastructure/cache`
- `@/infrastructure/cache/cache-service`
- `@/infrastructure/database/base/BaseStorage`
- `@/infrastructure/database/database-service`
- `@/infrastructure/demo-data`
- `@/infrastructure/errors/error-adapter`
- `@/infrastructure/errors/result-adapter`
- `@/infrastructure/external-data/government-data-service`
- `@/infrastructure/external-data/types`
- `@/infrastructure/migration/feature-flags.service`
- `@/infrastructure/notifications/email-service`
- `@/infrastructure/notifications/notification-channels`
- `@/infrastructure/notifications/notification-service`
- `@/middleware/auth`
- `@/middleware/error-management`
- `@/notifications/domain/services/notification-service`
- `@/server/db`
- `@/server/utils/logger`
- `@/services/database-service`
- `@/shared/schema`
- `@/shared/schema/safeguards`
- `@/users/application/user-service-direct`
- `@/users/domain/user-profile`
- `@/utils/db-helpers`
- `@/utils/errors`

### Relative Imports (incorrect paths)

- `../../../../AuthAlert`
- `../../../../bill-repository.interface`
- `../../../../boom-error-middleware`
- `../../../../constitutional-analysis-service-complete`
- `../../../../security-audit-service`
- `../../../config.d`
- `../../../core/src/index`
- `../../../performance-monitor`
- `../../../platform/kenya/anonymity/anonymity-helper`
- `../../../query-executor`
- `../../../shared/core/src/index`
- `../../../shared/core/src/utils/response-helpers`
- `../../../shared/database/index`
- `../../4-personas-implementation-guide`
- `../../api-response-fixer`
- `../../batching-service`
- `../../boom-error-middleware`
- `../../client/src/monitoring/performance-monitoring`
- `../../common-utils`
- `../../core/errors/error-tracker`
- `../../core/src`
- `../../core/src/index`
- `../../core/validation/schema-validation-service`
- `../../core/validation/validation-metrics`
- `../../database`
- `../../deploy-websocket-migration`
- `../../domain/services/unified-alert-preference-service`
- `../../external-api-error-handler`
- `../../final-migration-validation`
- `../../legacy-websocket-cleanup`
- `../../missing-modules-fallback`
- `../../notification-channels`
- `../../redis-adapter`
- `../../schema/graph_sync`
- `../cache`
- `../caching/adapters/memory-adapter`
- `../database`
- `../error-adapter-v2`
- `../observability/error-management`
- `../rate-limiting/types`
- `../retry-utils`
- `../schema/graph_sync`
- `../types`
- `../types/core/common`
- `../types/core/errors`
- `../types/core/validation`
- `../validation`
- `./__tests__/ExpertVerificationService.test`
- `./alert-preferences`
- `./analysis`
- `./citizen_participation`
- `./constitutional-intelligence`
- `./constitutional_intelligence`
- `./infrastructure/repositories/constitutional-analyses-repository.js`
- `./infrastructure/repositories/constitutional-provisions-repository.js`
- `./infrastructure/repositories/expert-review-queue-repository.js`
- `./infrastructure/repositories/legal-precedents-repository.js`
- `./integrity_operations`
- `./logging-middleware`
- `./parliamentary_process`
- `./presentation/advocacy-router.js`
- `./presentation/argument-intelligence-router.js`
- `./presentation/constitutional-analysis-router.js`
- `./presentation/sponsors.routes.js`
- `./privacy`
- `./services`
- `./types`

## Missing Exports (TS2305)

**Total Modules with Missing Exports:** 27

### `../../../shared/dist/core/caching/validation.d`

Missing exports:
- `createValidatedType`
- `ValidatedType`
- `createValidatedType`
- `ValidatedType`

### `../../../shared/dist/core/src/validation/schemas/common`

Missing exports:
- `UserId`
- `BillId`
- `SessionId`
- `ModerationId`
- `LegislatorId`
- `CommitteeId`
- `SponsorId`
- `AmendmentId`
- `ConferenceId`
- `createBrandedId`
- `isBrandedId`
- `UserId`
- `BillId`
- `SessionId`
- `ModerationId`
- `LegislatorId`
- `CommitteeId`
- `SponsorId`
- `AmendmentId`
- `ConferenceId`
- `createBrandedId`
- `isBrandedId`
- `UserId`
- `BillId`
- `SessionId`
- `ModerationId`
- `LegislatorId`
- `CommitteeId`
- `SponsorId`
- `AmendmentId`
- `ConferenceId`
- `createBrandedId`
- `isBrandedId`

### `../../primitives/types/result`

Missing exports:
- `isOk`

### `../integration-extended`

Missing exports:
- `createBillId`
- `createSessionId`

### `./base-types`

Missing exports:
- `FullAuditEntity`

### `./bill-service.js`

Missing exports:
- `BillService`
- `billService`

### `./controller/index`

Missing exports:
- `default`

### `./database/index`

Missing exports:
- `default`

### `./impact_measurement`

Missing exports:
- `geographic_equity_metrics`
- `demographic_equity_metrics`
- `digital_inclusion_metrics`
- `GeographicEquityMetric`
- `NewGeographicEquityMetric`
- `DemographicEquityMetric`
- `NewDemographicEquityMetric`
- `DigitalInclusionMetric`
- `NewDigitalInclusionMetric`

### `./middleware/index`

Missing exports:
- `default`

### `./notification-service.js`

Missing exports:
- `NotificationData`
- `NotificationHistory`

### `./privacy-middleware`

Missing exports:
- `privacyMiddleware`

### `./rate-limiter`

Missing exports:
- `apiRateLimit`
- `authRateLimit`
- `createRateLimit`
- `legacyPasswordResetRateLimit`
- `legacyRegistrationRateLimit`
- `legacySponsorRateLimit`
- `searchRateLimit`

### `./service-availability`

Missing exports:
- `checkServiceAvailability`

### `./service/index`

Missing exports:
- `default`

### `./simple-factory`

Missing exports:
- `cacheService`
- `createCacheService`

### `@/shared/core`

Missing exports:
- `logger`
- `logger`
- `logger`
- `logger`
- `logger`
- `logger`

### `@shared/core`

Missing exports:
- `ErrorCode`
- `DatabaseError`
- `DatabaseError`
- `DatabaseError`
- `NotFoundError`
- `DatabaseError`
- `DatabaseError`
- `ApiErrorResponse`
- `ApiValidationErrorResponse`
- `BaseError`
- `ERROR_CODES`
- `ApiResponse`
- `ERROR_CODES`
- `ErrorCode`
- `ERROR_CODES`
- `ERROR_CODES`
- `BaseError`
- `NotFoundError`
- `UnauthorizedError`
- `ForbiddenError`
- `httpUtils`
- `ApiResponseWrapper`
- `BaseError`
- `CacheError`
- `ConflictError`
- `DatabaseError`
- `ExternalServiceError`
- `ForbiddenError`
- `NotFoundError`
- `ServiceUnavailableError`
- `TooManyRequestsError`
- `UnauthorizedError`
- `logger`

### `@shared/core/index`

Missing exports:
- `logger`
- `CACHE_KEYS`
- `logger`
- `logger`

### `@shared/core/types`

Missing exports:
- `Affiliation`
- `TransparencyInfo`
- `FinancialBreakdown`

### `@shared/core/types/auth.types`

Missing exports:
- `User`

### `@shared/core/utils/http-utils`

Missing exports:
- `httpUtils`

### `@shared/types`

Missing exports:
- `CommentEngagementTrends`
- `AnalysisResult`
- `ComprehensiveAnalysisResult`
- `SimilarityAnalysis`

### `@shared/types/core/common`

Missing exports:
- `UserId`
- `UserId`

### `@shared/types/core/errors`

Missing exports:
- `Result`
- `AppError`
- `Result`
- `AppError`
- `Result`

### `@shared/types/domains/authentication/user`

Missing exports:
- `User`

### `@shared/types/index`

Missing exports:
- `CompletenessReport`
- `RelationshipMapping`
- `TransparencyDashboard`

## Missing Default Exports (TS2614, TS2724)

**Total Modules:** 4

- `./analytics.js`
- `./bills.js`
- `./config/graph-config`
- `@server/infrastructure/schema`

## Errors by File (Top 20)

- **index.ts**: 36 errors
- **infrastructure/schema/index.ts**: 21 errors
- **features/analytics/services/engagement.service.ts**: 17 errors
- **features/bills/domain/LegislativeStorageTypes.ts**: 16 errors
- **features/argument-intelligence/application/argument-intelligence-service.ts**: 13 errors
- **features/bills/application/bills.ts**: 13 errors
- **features/privacy/privacy-service.ts**: 13 errors
- **infrastructure/schema/integration-extended.ts**: 13 errors
- **infrastructure/schema/integration.ts**: 13 errors
- **infrastructure/schema/schema-generators.ts**: 13 errors
- **utils/errors.ts**: 11 errors
- **features/admin/admin-router.ts**: 10 errors
- **features/advocacy/advocacy-factory.ts**: 10 errors
- **features/analysis/application/bill-comprehensive-analysis.service.ts**: 10 errors
- **features/bills/domain/services/bill-domain-service.ts**: 10 errors
- **infrastructure/core/auth/auth-service.ts**: 10 errors
- **features/analytics/engagement-analytics.ts**: 9 errors
- **features/analytics/financial-disclosure/financial-disclosure-orchestrator.service.ts**: 9 errors
- **features/bills/application/bills-repository-service.ts**: 9 errors
- **features/community/community.ts**: 9 errors
