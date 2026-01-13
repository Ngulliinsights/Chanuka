# Project Structure

**Generated:** 1/13/2026, 10:50:08 PM
**Max Depth:** 7 levels

```
.
├── AfricanPropertyTrust/
│   ├── docs/
│   │   ├── import-analysis.md
│   │   ├── import-resolution-report.md
│   │   └── project-structure.md
│   ├── public/
│   │   └── sw.js
│   ├── scripts/
│   │   ├── debug/
│   │   │   ├── stop-infinite-queries.ts
│   │   │   └── test-server-start.ts
│   │   ├── deployment/
│   │   │   ├── grafana/
│   │   │   │   └── dashboards/
│   │   │   │       ├── business-metrics.json
│   │   │   │       ├── database-health.json
│   │   │   │       └── query-performance.json
│   │   │   ├── deploy-production.ts
│   │   │   ├── deploy-staging.ts
│   │   │   ├── deployment-tests.ts
│   │   │   ├── README.md
│   │   │   ├── setup-comprehensive-monitoring.ts
│   │   │   ├── setup-monitoring.ts
│   │   │   └── validate-deployment.ts
│   │   ├── migration-helpers/
│   │   │   ├── cache-migration.ts
│   │   │   ├── config-migration.ts
│   │   │   └── middleware-migration.ts
│   │   ├── performance/
│   │   │   └── api-performance-test.ts
│   │   ├── security/
│   │   │   └── bug-categorization.ts
│   │   ├── add-b2b-messaging.js
│   │   ├── add-reviews.ts
│   │   ├── aggressive-optimization.js
│   │   ├── analyze-hooks.js
│   │   ├── api-race-condition-detector.ts
│   │   ├── check-data.ts
│   │   ├── check-reviews-table.ts
│   │   ├── check-table-structure.ts
│   │   ├── cleanup-redundancies.ts
│   │   ├── comprehensive-cleanup.ts
│   │   ├── convert-favicons.bat
│   │   ├── create-barrel-exports.ts
│   │   ├── create-favicon-pngs.js
│   │   ├── create-minimal-pngs.js
│   │   ├── create-png-favicons.js
│   │   ├── DATABASE_SETUP.md
│   │   ├── debug-blank-page.ts
│   │   ├── debug-vercel-deployment.ts
│   │   ├── deploy-minimal.js
│   │   ├── deploy-render.js
│   │   ├── deploy-setup.ts
│   │   ├── deploy-staging-final.cjs
│   │   ├── deploy-staging-simple.cjs
│   │   ├── detect-bugs.ts
│   │   ├── emergency-stop.js
│   │   ├── execute-optimization.ts
│   │   ├── extract-api-core.js
│   │   ├── fix-authentication-issues.ts
│   │   ├── fix-core-import-paths.ts
│   │   ├── fix-image-test-issues.ts
│   │   ├── fix-typescript-errors.ts
│   │   ├── generate-favicons.js
│   │   ├── generate-test-chunks.ts
│   │   ├── health-check.ts
│   │   ├── implement-optimizations.js
│   │   ├── load-data-corrected.ts
│   │   ├── load-data-fixed.ts
│   │   ├── load-data-simple.ts
│   │   ├── load-test-simple.cjs
│   │   ├── load-test-suite.js
│   │   ├── load-test.js
│   │   ├── logger.js
│   │   ├── memory-benchmark.js
│   │   ├── migrate-core-utilities.ts
│   │   ├── migrate-database-structure.ts
│   │   ├── migrate-embedded-tests.ts
│   │   ├── migrate-hooks.js
│   │   ├── migrate-optimized-components.sh
│   │   ├── migrate-schema-imports.ts
│   │   ├── migrate-to-core-utilities.ts
│   │   ├── MISSING_FEATURES_ANALYSIS.md
│   │   ├── MOBILE_AND_DATA_IMPROVEMENTS.md
│   │   ├── optimize-for-deployment.js
│   │   ├── OptimizedBuildPipeline.ts
│   │   ├── prepare-deployment.ts
│   │   ├── quick-migration-check.ts
│   │   ├── quick-recovery.ts
│   │   ├── README-test-data.md
│   │   ├── README.md
│   │   ├── real-optimization.js
│   │   ├── remove-redundant-utilities.ts
│   │   ├── responsive-design-analyzer.js
│   │   ├── restart-dev-server.ts
│   │   ├── run-accessibility-tests.js
│   │   ├── run-chunked-tests.ts
│   │   ├── run-complete-load-test.cjs
│   │   ├── run-e2e-tests.js
│   │   ├── run-land-verification-migration.ts
│   │   ├── run-migration.ts
│   │   ├── run-ui-audit.ts
│   │   ├── run-visual-tests.js
│   │   ├── self-monitoring-pipeline.ts
│   │   ├── setup-dev.js
│   │   ├── simple-server-test.cjs
│   │   ├── stop-infinite-queries.ts
│   │   ├── streaming-json-processor.ts
│   │   ├── test-deployment-readiness.cjs
│   │   ├── test-frontend-functionality.ts
│   │   ├── test-image-components.ts
│   │   ├── test-integration.js
│   │   ├── test-navigation.ts
│   │   ├── test-server-connection.cjs
│   │   ├── test-server-ports.js
│   │   ├── update-core-imports.ts
│   │   ├── update-database-paths.cjs
│   │   ├── update-imports.ts
│   │   ├── validate-authentication.ts
│   │   ├── validate-database-paths.ts
│   │   ├── validate-database-structure.cjs
│   │   ├── validate-database-structure.js
│   │   ├── validate-database-structure.ts
│   │   ├── validate-deployment-current.cjs
│   │   ├── validate-deployment.cjs
│   │   ├── validate-image-tests.ts
│   │   ├── validate-migration.ts
│   │   ├── validate-production.ts
│   │   ├── validate-staging-final.cjs
│   │   ├── verify-api-client.js
│   │   └── verify-optimization.ts
│   ├── server/
│   │   ├── ai/
│   │   │   ├── middleware/
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── ai-deduplication.ts
│   │   │   │   ├── ai-middleware.ts
│   │   │   │   └── ai-rate-limiting.ts
│   │   │   ├── services/
│   │   │   │   ├── ai-service-manager.ts
│   │   │   │   ├── document-processing-ai.service.ts
│   │   │   │   ├── fraud-detection-ai.service.ts
│   │   │   │   ├── property-analysis-ai.service.ts
│   │   │   │   └── recommendation-ai.service.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── community-trust-ai-root.ts
│   │   │   ├── community-trust-ai.ts
│   │   │   ├── ml-business.service.ts
│   │   │   ├── ml-training-root.ts
│   │   │   ├── ml-training.test.ts
│   │   │   ├── ml-training.ts
│   │   │   └── storage.ts
│   │   ├── analytics/
│   │   │   ├── analytics-business.service.ts
│   │   │   └── analytics.controller.ts
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── AuthenticationService.ts
│   │   ├── b2b/
│   │   │   ├── b2b.controller.ts
│   │   │   └── index.ts
│   │   ├── blockchain/
│   │   │   └── blockchain-service.ts
│   │   ├── cache/
│   │   │   └── CacheService.ts
│   │   ├── communication/
│   │   │   ├── communication-business.service.ts
│   │   │   ├── communication.controller.ts
│   │   │   ├── messages.controller.ts
│   │   │   ├── messaging.controller.ts
│   │   │   ├── messaging.service.ts
│   │   │   ├── notification-business.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notifications.controller.ts
│   │   │   └── websocket.service.ts
│   │   ├── community/
│   │   │   ├── community.controller.ts
│   │   │   ├── index.ts
│   │   │   ├── intelligence.service.ts
│   │   │   └── resources.service.ts
│   │   ├── config/
│   │   │   ├── development.ts
│   │   │   ├── environment-schema.ts
│   │   │   └── ports.ts
│   │   ├── document-auth/
│   │   │   ├── analyzers/
│   │   │   │   ├── ContentAnalyzer.ts
│   │   │   │   ├── LandDocumentAnalyzer.test.ts
│   │   │   │   ├── LandDocumentAnalyzer.ts
│   │   │   │   ├── MetadataAnalyzer.ts
│   │   │   │   ├── MLDocumentAnalyzer.ts
│   │   │   │   ├── SignatureAnalyzer.ts
│   │   │   │   └── VisualAnalyzer.ts
│   │   │   ├── core/
│   │   │   │   └── DocumentAuthEngine.ts
│   │   │   ├── types/
│   │   │   │   └── exif-parser.d.ts
│   │   │   ├── authentication-business.service.ts
│   │   │   ├── DocumentAuthService.land.test.ts
│   │   │   ├── DocumentAuthService.ts
│   │   │   └── test-document-auth.ts
│   │   ├── fraud-detection/
│   │   │   ├── api/
│   │   │   │   └── FraudDetectionAPI.ts
│   │   │   ├── core/
│   │   │   │   └── FraudDetectionEngine.ts
│   │   │   ├── services/
│   │   │   │   ├── CaseManagementService.ts
│   │   │   │   ├── ComplianceReportingService.ts
│   │   │   │   ├── DatabaseService.ts
│   │   │   │   ├── DataIntegrationService.ts
│   │   │   │   └── ExternalAPIService.ts
│   │   │   ├── tests/
│   │   │   │   ├── dashboard.test.ts
│   │   │   │   ├── engine.test.ts
│   │   │   │   ├── global-setup.ts
│   │   │   │   ├── global-teardown.ts
│   │   │   │   ├── integration.test.ts
│   │   │   │   ├── performance.test.ts
│   │   │   │   ├── results-processor.js
│   │   │   │   ├── run-tests.ts
│   │   │   │   └── setup.ts
│   │   │   ├── utils/
│   │   │   │   └── Logger.ts
│   │   │   ├── alerts.controller.ts
│   │   │   ├── index.ts
│   │   │   ├── integrate-real-data.ts
│   │   │   ├── intelligence.service.ts
│   │   │   ├── jest.config.js
│   │   │   ├── README.md
│   │   │   ├── test-system.js
│   │   │   └── validate-backend.js
│   │   ├── infrastructure/
│   │   │   ├── cache/
│   │   │   │   ├── AnalyticsCache.ts
│   │   │   │   ├── CacheIntegrationAdapter.ts
│   │   │   │   ├── CacheIntegrationMigrator.ts
│   │   │   │   ├── CacheService.ts
│   │   │   │   ├── CacheWarmingStrategy.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── PropertyCacheService.ts
│   │   │   │   ├── README.md
│   │   │   │   └── UnifiedCacheManager.ts
│   │   │   ├── database/
│   │   │   │   ├── audit/
│   │   │   │   │   ├── comprehensive-database-audit.md
│   │   │   │   │   ├── database-inventory.json
│   │   │   │   │   ├── database-structure-audit.md
│   │   │   │   │   └── dependency-map.md
│   │   │   │   ├── config/
│   │   │   │   │   ├── database.config.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── connection/
│   │   │   │   │   ├── DatabaseCircuitBreaker.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── production-pool.ts
│   │   │   │   │   └── ProductionConnectionPool.ts
│   │   │   │   ├── data-generation/
│   │   │   │   │   ├── cli/
│   │   │   │   │   │   ├── demo-generator-cli.ts
│   │   │   │   │   │   ├── demo-scenario-cli.ts
│   │   │   │   │   │   └── unified-data-generation.ts
│   │   │   │   │   ├── core/
│   │   │   │   │   │   ├── checkpoint-manager.ts
│   │   │   │   │   │   ├── data-validator.ts
│   │   │   │   │   │   ├── KenyanDataGenerator.ts
│   │   │   │   │   │   └── UnifiedDataGenerator.ts
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── demo-generation-example.ts
│   │   │   │   │   ├── generators/
│   │   │   │   │   │   ├── python/
│   │   │   │   │   │   │   └── runner.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── scenarios/
│   │   │   │   │   │   ├── demo-data-validator.ts
│   │   │   │   │   │   ├── production-demo-generator.ts
│   │   │   │   │   │   ├── production-demo-scenarios.ts
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   └── scenario-generator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── README.md
│   │   │   │   ├── deployment/
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── complete-deployment-example.ts
│   │   │   │   │   ├── BlueGreenDeploymentManager.ts
│   │   │   │   │   ├── deployment-cli.ts
│   │   │   │   │   ├── deployment-utils.ts
│   │   │   │   │   ├── DeploymentValidator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── ZeroDowntimeMigrationManager.ts
│   │   │   │   ├── disaster-recovery/
│   │   │   │   │   ├── scripts/
│   │   │   │   │   │   ├── activate-replica.sh
│   │   │   │   │   │   ├── restore-config.sh
│   │   │   │   │   │   ├── restore-original-db.sh
│   │   │   │   │   │   └── restore-primary-region.sh
│   │   │   │   │   ├── BackupManager.ts
│   │   │   │   │   ├── ComprehensiveDisasterRecovery.ts
│   │   │   │   │   ├── config.json
│   │   │   │   │   ├── disaster-recovery-cli.ts
│   │   │   │   │   ├── DisasterRecoveryManager.ts
│   │   │   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── package-scripts.json
│   │   │   │   │   └── README.md
│   │   │   │   ├── docs/
│   │   │   │   │   ├── kenya-land-verification.md
│   │   │   │   │   ├── operational-excellence-guide.md
│   │   │   │   │   └── production-deployment-checklist.md
│   │   │   │   ├── examples/
│   │   │   │   │   └── production-setup.ts
│   │   │   │   ├── health/
│   │   │   │   │   ├── DatabaseHealthMonitor.ts
│   │   │   │   │   ├── health-monitor.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── integration/
│   │   │   │   │   ├── integration-cli.ts
│   │   │   │   │   ├── integration-test-runner.ts
│   │   │   │   │   ├── ProductionReadinessAssessment.ts
│   │   │   │   │   ├── run-production-assessment.ts
│   │   │   │   │   ├── simple-assessment.cjs
│   │   │   │   │   └── SystemIntegrationValidator.ts
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── communication/
│   │   │   │   │   │   ├── 001_create_communication_tables.sql
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── core/
│   │   │   │   │   │   ├── files/
│   │   │   │   │   │   │   └── 001_initial_schema.sql
│   │   │   │   │   │   ├── meta/
│   │   │   │   │   │   │   ├── _journal.json
│   │   │   │   │   │   │   └── 0000_snapshot.json
│   │   │   │   │   │   ├── 001_create_comprehensive_tables.sql
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── fraud/
│   │   │   │   │   │   ├── 001_create_fraud_detection_tables.sql
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── performance/
│   │   │   │   │   │   └── 001_create_performance_indexes.sql
│   │   │   │   │   ├── trust/
│   │   │   │   │   │   ├── 001_create_trust_system_tables.sql
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── verification/
│   │   │   │   │   │   ├── 001_create_land_verification_tables.sql
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── 0000_daffy_skrulls.sql
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── migration-cli.ts
│   │   │   │   │   ├── migration-executor.ts
│   │   │   │   │   ├── migration-loader.ts
│   │   │   │   │   ├── migration-manager.ts
│   │   │   │   │   ├── migration-registry.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── update-package-scripts.ts
│   │   │   │   ├── performance/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LoadTestingFramework.ts
│   │   │   │   │   ├── performance-cli.ts
│   │   │   │   │   ├── PerformanceCertificationSystem.ts
│   │   │   │   │   └── PerformanceMonitoringDashboard.ts
│   │   │   │   ├── replication/
│   │   │   │   │   ├── scripts/
│   │   │   │   │   │   └── 01-setup-replication.sh
│   │   │   │   │   ├── FailoverManager.ts
│   │   │   │   │   ├── haproxy.cfg
│   │   │   │   │   ├── pg_hba.conf
│   │   │   │   │   ├── postgresql-primary.conf
│   │   │   │   │   ├── postgresql-replica.conf
│   │   │   │   │   ├── ReplicationManager.ts
│   │   │   │   │   └── setup-ha.ts
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── communication/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── core/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── fraud/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── trust/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── verification/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── consolidated.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── scripts/
│   │   │   │   │   ├── database-setup/
│   │   │   │   │   │   └── initialize-database.ts
│   │   │   │   │   ├── cleanup-redundant-files.ts
│   │   │   │   │   ├── consolidate-database-files.ts
│   │   │   │   │   ├── consolidate-database-infrastructure.ts
│   │   │   │   │   ├── consolidate-schemas.ts
│   │   │   │   │   ├── data-pipeline.ts
│   │   │   │   │   ├── deploy-land-verification.ts
│   │   │   │   │   ├── deploy.ts
│   │   │   │   │   ├── execute-production-deployment.ts
│   │   │   │   │   ├── load-data.ts
│   │   │   │   │   ├── remove-empty-dirs.ts
│   │   │   │   │   ├── reset.ts
│   │   │   │   │   ├── run-disaster-recovery-test.ts
│   │   │   │   │   ├── run-performance-certification.ts
│   │   │   │   │   ├── run-production-readiness-assessment.ts
│   │   │   │   │   ├── run-security-validation.ts
│   │   │   │   │   ├── seed-data.ts
│   │   │   │   │   ├── setup-database.ts
│   │   │   │   │   ├── status.ts
│   │   │   │   │   ├── test-connection.ts
│   │   │   │   │   ├── test-migration-system.ts
│   │   │   │   │   ├── test-schema-management.ts
│   │   │   │   │   ├── test-setup.ts
│   │   │   │   │   ├── unified-data-generation.ts
│   │   │   │   │   ├── validate-consolidation.ts
│   │   │   │   │   └── validate.ts
│   │   │   │   ├── security/
│   │   │   │   │   ├── ComplianceManager.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── security-cli.ts
│   │   │   │   │   ├── SecurityMonitor.ts
│   │   │   │   │   ├── SecurityReporting.ts
│   │   │   │   │   ├── SecuritySystem.ts
│   │   │   │   │   └── VulnerabilityScanner.ts
│   │   │   │   ├── seeds/
│   │   │   │   │   ├── generators/
│   │   │   │   │   │   ├── checkpoint-manager.ts
│   │   │   │   │   │   ├── community-insights-generator.py
│   │   │   │   │   │   ├── fraud_analysis_report.json
│   │   │   │   │   │   ├── fraud-reports-generator.py
│   │   │   │   │   │   ├── fraud-simulator.py
│   │   │   │   │   │   ├── fraudulent_property_dataset.json
│   │   │   │   │   │   ├── fraudulent_transaction_dataset.json
│   │   │   │   │   │   ├── fraudulent_user_dataset.json
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── integrate-data.ts
│   │   │   │   │   │   ├── KenyanDataGenerator.ts
│   │   │   │   │   │   ├── land-verification-generator.py
│   │   │   │   │   │   ├── optimized_land_dataset_statistics.json
│   │   │   │   │   │   ├── optimized_land_dataset.json
│   │   │   │   │   │   ├── property_dataset.json
│   │   │   │   │   │   ├── property_statistics.json
│   │   │   │   │   │   ├── property-generator.py
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   ├── transaction_dataset.json
│   │   │   │   │   │   ├── user_dataset.json
│   │   │   │   │   │   ├── user_statistics.json
│   │   │   │   │   │   └── user-generator.py
│   │   │   │   │   ├── database-seeder.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── kenyan-data-generator.ts
│   │   │   │   │   ├── land-verification-seed.ts
│   │   │   │   │   ├── land-verification-system.ts
│   │   │   │   │   ├── land-verification.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── sample-ai-data.ts
│   │   │   │   │   ├── seed-kenya-properties.ts
│   │   │   │   │   └── UnifiedDataGenerator.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── database.types.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── analyzers/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── generators/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── kenyan-data-generator.ts
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   └── unified-generator.ts
│   │   │   │   │   ├── migration-tools/
│   │   │   │   │   │   ├── consolidate-schemas.ts
│   │   │   │   │   │   ├── database-manager.ts
│   │   │   │   │   │   ├── fix-database.ts
│   │   │   │   │   │   ├── generate-test-chunks.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── inspect-schema.ts
│   │   │   │   │   │   ├── migrate-existing-properties.ts
│   │   │   │   │   │   ├── quality-gates.ts
│   │   │   │   │   │   ├── reset-and-create.ts
│   │   │   │   │   │   ├── robust-batch-loader.ts
│   │   │   │   │   │   ├── rollback-migration.ts
│   │   │   │   │   │   ├── run-migration.ts
│   │   │   │   │   │   └── validate-migration.ts
│   │   │   │   │   ├── validators/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── database-utils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── QueryOptimizer.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── init.ts
│   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   ├── migration-plan.md
│   │   │   │   ├── OPTIMIZED_STRUCTURE.md
│   │   │   │   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   │   │   │   ├── QueryOptimizer.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── scripts-evaluation.md
│   │   │   │   └── service.ts
│   │   │   ├── deduplication/
│   │   │   │   ├── examples/
│   │   │   │   │   └── usage-example.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── RequestDeduplicator.ts
│   │   │   ├── email/
│   │   │   │   ├── email-config.ts
│   │   │   │   ├── email-service-init.ts
│   │   │   │   └── email.service.ts
│   │   │   ├── events/
│   │   │   │   └── EventBus.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── AlertingSystem.ts
│   │   │   │   ├── BuildPerformanceMonitor.ts
│   │   │   │   ├── CachePerformanceMonitor.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── MonitoringDashboard.ts
│   │   │   │   ├── ObservabilitySystem.ts
│   │   │   │   ├── PerformanceMonitor.ts
│   │   │   │   ├── PerformanceOptimizer.ts
│   │   │   │   ├── PrometheusMetrics.ts
│   │   │   │   └── QueryPerformanceMonitor.ts
│   │   │   ├── optimization/
│   │   │   │   ├── BundleOptimizer.ts
│   │   │   │   └── PerformanceOptimizer.ts
│   │   │   ├── rate-limiting/
│   │   │   │   ├── examples/
│   │   │   │   │   └── usage-example.ts
│   │   │   │   ├── ApiCallTracker.ts
│   │   │   │   ├── ApiRateLimiter.ts
│   │   │   │   ├── CircuitBreaker.ts
│   │   │   │   └── index.ts
│   │   │   ├── storage/
│   │   │   │   ├── file-storage.service.ts
│   │   │   │   ├── file.storage.ts
│   │   │   │   ├── FileStorageService.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── SecureFileUploadService.ts
│   │   │   │   └── storage.ts
│   │   │   ├── testing/
│   │   │   │   └── TestFramework.ts
│   │   │   └── versioning/
│   │   │       ├── examples/
│   │   │       │   └── client-examples.ts
│   │   │       ├── ApiDocumentation.ts
│   │   │       ├── ApiVersioning.ts
│   │   │       ├── ApiVersioningMiddleware.ts
│   │   │       ├── ApiVersionManager.ts
│   │   │       ├── index.ts
│   │   │       ├── README.md
│   │   │       ├── sedGOSgOE
│   │   │       └── versioning.middleware.ts
│   │   ├── land-verification/
│   │   │   ├── audit/
│   │   │   │   └── AuditLogger.ts
│   │   │   ├── cache/
│   │   │   │   └── LandVerificationCache.ts
│   │   │   ├── error-handling/
│   │   │   │   ├── examples/
│   │   │   │   │   └── GovernmentApiIntegration.ts
│   │   │   │   ├── AuditLogger.ts
│   │   │   │   ├── ErrorHandlingService.ts
│   │   │   │   ├── FallbackManager.ts
│   │   │   │   ├── GracefulDegradationManager.ts
│   │   │   │   ├── README.md
│   │   │   │   └── RetryPolicyManager.ts
│   │   │   ├── errors/
│   │   │   │   └── LandVerificationErrors.ts
│   │   │   ├── health/
│   │   │   │   └── HealthCheckService.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── validation.middleware.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── AlertingService.ts
│   │   │   │   └── MetricsService.ts
│   │   │   ├── performance/
│   │   │   │   ├── AsyncProcessor.ts
│   │   │   │   ├── DatabaseOptimizer.ts
│   │   │   │   ├── PaginationService.ts
│   │   │   │   └── PerformanceManager.ts
│   │   │   ├── resilience/
│   │   │   │   ├── FallbackMechanisms.ts
│   │   │   │   ├── GracefulDegradation.ts
│   │   │   │   └── RetryPolicy.ts
│   │   │   ├── security/
│   │   │   │   ├── AccessControlService.ts
│   │   │   │   ├── AuditLogger.ts
│   │   │   │   ├── EncryptionService.ts
│   │   │   │   ├── PrivacyProtectionService.ts
│   │   │   │   └── SecurityIntegration.ts
│   │   │   ├── utils/
│   │   │   │   └── gps-calculations.ts
│   │   │   ├── CommunityIntelligenceIntegration.test.ts
│   │   │   ├── CommunityIntelligenceService.test.ts
│   │   │   ├── CommunityIntelligenceService.ts
│   │   │   ├── DocumentIntegration.ts
│   │   │   ├── ExpertCoordinationService.test.ts
│   │   │   ├── ExpertCoordinationService.ts
│   │   │   ├── index.ts
│   │   │   ├── integration.test.ts
│   │   │   ├── LandVerificationService.test.ts
│   │   │   ├── LandVerificationService.ts
│   │   │   ├── MonitoringService.ts
│   │   │   ├── PhysicalVerificationService.ts
│   │   │   ├── README.md
│   │   │   ├── ReportingService.ts
│   │   │   ├── RiskAssessmentService.test.ts
│   │   │   ├── RiskAssessmentService.ts
│   │   │   ├── ServiceFactory.ts
│   │   │   └── verification-business.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── cache.middleware.ts
│   │   │   ├── data-validation.ts
│   │   │   ├── deduplication.middleware.ts
│   │   │   ├── error.ts
│   │   │   ├── logging.middleware.ts
│   │   │   ├── query-limiter.middleware.ts
│   │   │   ├── rate-limiting.middleware.ts
│   │   │   ├── README-auth-middleware.md
│   │   │   ├── README-centralized-error-handler.md
│   │   │   ├── UnifiedSecurityMiddleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── ml/
│   │   │   ├── core/
│   │   │   │   └── base-model.ts
│   │   │   └── README.md
│   │   ├── ml-core/
│   │   │   ├── deployment/
│   │   │   │   └── production-deployment-guide.md
│   │   │   ├── examples/
│   │   │   │   └── comprehensive-ml-integration.ts
│   │   │   ├── fraud-detection/
│   │   │   │   └── AdvancedFraudDetectionEngine.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── ModelRegistry.ts
│   │   │   ├── orchestration/
│   │   │   │   └── MLOrchestrationService.ts
│   │   │   ├── property-valuation/
│   │   │   │   └── AutomatedValuationModel.ts
│   │   │   ├── training/
│   │   │   │   └── ContinuousLearningPipeline.ts
│   │   │   ├── trust-intelligence/
│   │   │   │   └── CommunityTrustEngine.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── monitoring/
│   │   │   ├── health.controller.ts
│   │   │   ├── HealthMonitor.ts
│   │   │   ├── monitoring.controller.ts
│   │   │   └── StructuredLogger.ts
│   │   ├── payments/
│   │   │   ├── index.ts
│   │   │   └── mpesa.service.ts
│   │   ├── professionals/
│   │   │   ├── index.ts
│   │   │   ├── professional.service.ts
│   │   │   └── professionals.controller.ts
│   │   ├── property/
│   │   │   ├── enhancements.controller.ts
│   │   │   ├── property-business.service.ts
│   │   │   ├── property-controller-integration.test.ts
│   │   │   ├── property-e2e-integration.test.ts
│   │   │   ├── property-land-verification.test.ts
│   │   │   ├── property-repository-integration.test.ts
│   │   │   ├── property.controller.ts
│   │   │   ├── property.repository.ts
│   │   │   └── property.service.ts
│   │   ├── reviews/
│   │   │   ├── index.ts
│   │   │   └── review.service.ts
│   │   ├── search/
│   │   │   ├── search-business.controller.ts
│   │   │   └── search.controller.ts
│   │   ├── security/
│   │   │   └── SecurityHardening.ts
│   │   ├── shared/
│   │   │   ├── community-trust-schema.ts
│   │   │   └── email-types.ts
│   │   ├── tests/
│   │   │   ├── auth/
│   │   │   │   └── AuthenticationService.test.ts
│   │   │   ├── e2e/
│   │   │   │   └── land-verification-workflow.test.ts
│   │   │   ├── integration/
│   │   │   │   ├── api.test.ts
│   │   │   │   └── land-verification-system.test.ts
│   │   │   ├── performance/
│   │   │   │   ├── land-verification-load.test.ts
│   │   │   │   └── load.test.ts
│   │   │   ├── security/
│   │   │   │   ├── land-verification-security.test.ts
│   │   │   │   └── SecurityHardening.test.ts
│   │   │   ├── ai-integration-validation.test.ts
│   │   │   ├── ai-integration.test.ts
│   │   │   ├── API_BUG_FIXES_SUMMARY.md
│   │   │   ├── api-bug-fixes.ts
│   │   │   ├── api-validation.test.ts
│   │   │   ├── application-validation.test.ts
│   │   │   ├── backend-api-comprehensive.test.ts
│   │   │   ├── backward-compatibility.test.ts
│   │   │   ├── basic-api.test.ts
│   │   │   ├── compatibility-validation.test.ts
│   │   │   ├── comprehensive-validation.test.ts
│   │   │   ├── file-upload-validation.test.ts
│   │   │   ├── file-upload.test.ts
│   │   │   ├── load-test-validation.ts
│   │   │   ├── load-test.ts
│   │   │   ├── performance-validation.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── quick-validation.test.ts
│   │   │   ├── run-api-tests.ts
│   │   │   ├── run-compatibility-tests.ts
│   │   │   ├── run-final-integration-tests.ts
│   │   │   ├── run-validation-tests.ts
│   │   │   ├── setup.ts
│   │   │   ├── simple-api-validation.js
│   │   │   ├── test-setup.ts
│   │   │   ├── validate-api-fixes.test.ts
│   │   │   ├── validate-system-integration.ts
│   │   │   └── validation-report.md
│   │   ├── trust/
│   │   │   ├── community-trust.service.ts
│   │   │   ├── integration.controller.ts
│   │   │   ├── integration.service.ts
│   │   │   ├── trust.controller.ts
│   │   │   ├── TrustScoringService.ts
│   │   │   └── verification.controller.ts
│   │   ├── types/
│   │   │   ├── api.types.ts
│   │   │   ├── auth-constants.ts
│   │   │   ├── auth-errors.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── fraud.types.ts
│   │   │   ├── index.ts
│   │   │   ├── messaging.types.ts
│   │   │   ├── property.types.ts
│   │   │   ├── review.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── verification.types.ts
│   │   ├── user/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── user.service.ts
│   │   ├── utils/
│   │   │   ├── cleanup-manager.ts
│   │   │   ├── constants.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── response-helpers.ts
│   │   │   └── validators.ts
│   │   ├── app-optimized.ts
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── main.ts
│   │   ├── simple-dev-server.ts
│   │   ├── test-critical-services.ts
│   │   ├── test-db-connection.ts
│   │   ├── test-email-mock.ts
│   │   ├── test-email-service.ts
│   │   ├── test-integration.ts
│   │   └── vite.ts
│   ├── src/
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   └── AnalyticsDashboard.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAnalytics.ts
│   │   │   └── index.ts
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   ├── providers.tsx
│   │   │   ├── README.md
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── PasswordReset.tsx
│   │   │   │   ├── RegistrationWizard.tsx
│   │   │   │   └── TwoFactorAuth.tsx
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   └── useAuth.ts
│   │   │   ├── pages/
│   │   │   │   ├── ForgotPassword.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── services/
│   │   │   │   └── auth-api.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   └── index.ts
│   │   ├── communication/
│   │   │   ├── components/
│   │   │   │   ├── MessageComposer.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageThread.tsx
│   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   ├── NotificationSystem.tsx
│   │   │   │   └── RealTimeNotifications.tsx
│   │   │   ├── context/
│   │   │   │   └── CommunicationContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMessages.ts
│   │   │   │   ├── useMessaging.ts
│   │   │   │   └── useNotifications.ts
│   │   │   ├── pages/
│   │   │   │   ├── Inbox.tsx
│   │   │   │   ├── MessageCenter.tsx
│   │   │   │   └── Notifications.tsx
│   │   │   ├── services/
│   │   │   │   ├── communication-business-logic.ts
│   │   │   │   ├── DocumentCommunicationIntegration.ts
│   │   │   │   └── WebSocketManager.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   └── ai/
│   │   │       ├── HuggingFaceTestPage.tsx
│   │   │       └── HuggingFaceTestPanel.tsx
│   │   ├── config/
│   │   │   └── external-dependencies.ts
│   │   ├── infrastructure/
│   │   │   ├── ai/
│   │   │   │   └── AIModelManager.tsx
│   │   │   ├── api/
│   │   │   │   ├── data-validation.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── request-manager.ts
│   │   │   ├── audit/
│   │   │   │   ├── plugins/
│   │   │   │   │   ├── AccessibilityPlugin.ts
│   │   │   │   │   ├── PerformancePlugin.ts
│   │   │   │   │   └── SecurityPlugin.ts
│   │   │   │   ├── audit.types.ts
│   │   │   │   ├── AuditReporter.ts
│   │   │   │   ├── cli.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── EnhancedAuditRunner.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── LinkValidator.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── run-audit.ts
│   │   │   │   ├── tsconfig.json
│   │   │   │   ├── types.ts
│   │   │   │   └── UIAuditSystem.ts
│   │   │   ├── cache/
│   │   │   │   └── query-cache.ts
│   │   │   ├── hooks/
│   │   │   │   ├── examples/
│   │   │   │   │   └── race-condition-prevention.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── useCleanupManager.ts
│   │   │   │   ├── useCoordinatedState.ts
│   │   │   │   ├── useIntersectionObserver.ts
│   │   │   │   ├── useSafeEffect.ts
│   │   │   │   ├── useSafeState.ts
│   │   │   │   └── useStableCallback.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── bundle-analyzer.ts
│   │   │   │   ├── core-web-vitals.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-tracker.ts
│   │   │   │   ├── performance-monitor.ts
│   │   │   │   ├── PerformanceMonitoringProvider.tsx
│   │   │   │   ├── query-monitor.ts
│   │   │   │   ├── resource-hints.ts
│   │   │   │   ├── system-health.ts
│   │   │   │   └── usePerformanceMonitoring.ts
│   │   │   ├── payments/
│   │   │   │   └── PaymentSystemInterface.tsx
│   │   │   ├── realtime/
│   │   │   │   └── websocket-client.ts
│   │   │   ├── service-worker/
│   │   │   │   └── sw-registration.ts
│   │   │   ├── services/
│   │   │   │   └── image-preload-service.ts
│   │   │   └── utils/
│   │   │       └── image-optimization.ts
│   │   ├── land-verification/
│   │   │   ├── components/
│   │   │   │   ├── CommunityInterviewTemplate.tsx
│   │   │   │   ├── ContextualGuidanceProvider.tsx
│   │   │   │   ├── DecisionSupportTool.tsx
│   │   │   │   ├── ExpertCoordinationInterface.tsx
│   │   │   │   ├── HelpSystem.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── KenyaLandEducation.tsx
│   │   │   │   ├── LandVerificationDashboard.tsx
│   │   │   │   ├── ProfessionalResourcesDirectory.tsx
│   │   │   │   ├── RecommendationEngine.tsx
│   │   │   │   ├── ReportingPortal.tsx
│   │   │   │   ├── RiskAssessmentDisplay.tsx
│   │   │   │   ├── RiskFactorAnalysis.tsx
│   │   │   │   ├── RiskManagementInterface.tsx
│   │   │   │   ├── RiskProfileVisualization.tsx
│   │   │   │   ├── RiskWeightingControls.tsx
│   │   │   │   ├── ScenarioModelingTool.tsx
│   │   │   │   ├── VerificationProgressTracker.tsx
│   │   │   │   └── VerificationWizard.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useLandVerification.ts
│   │   │   ├── pages/
│   │   │   │   ├── index.ts
│   │   │   │   ├── LandVerificationDashboardPage.tsx
│   │   │   │   ├── LandVerificationPage.tsx
│   │   │   │   └── NewVerificationPage.tsx
│   │   │   ├── services/
│   │   │   │   ├── DocumentIntelligenceIntegration.ts
│   │   │   │   └── HelpDocumentationService.ts
│   │   │   └── index.ts
│   │   ├── ml/
│   │   │   └── core/
│   │   │       └── feature-engineering.ts
│   │   ├── monitoring/
│   │   │   ├── components/
│   │   │   │   └── HealthDashboard.tsx
│   │   │   ├── pages/
│   │   │   │   └── MonitoringPage.tsx
│   │   │   └── index.ts
│   │   ├── property/
│   │   │   ├── components/
│   │   │   │   ├── wizard/
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── WizardExamples.tsx
│   │   │   │   │   ├── steps/
│   │   │   │   │   │   ├── AdaptedBasicDetailsStep.tsx
│   │   │   │   │   │   ├── AdaptedFeaturesStep.tsx
│   │   │   │   │   │   ├── AdaptedImagesStep.tsx
│   │   │   │   │   │   ├── AdaptedLocationStep.tsx
│   │   │   │   │   │   ├── AdaptedPreviewStep.tsx
│   │   │   │   │   │   ├── AdaptedPricingStep.tsx
│   │   │   │   │   │   ├── DocumentationStep.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── UnifiedPropertyWizard.tsx
│   │   │   │   ├── CompareBar.tsx
│   │   │   │   ├── CompareModal.tsx
│   │   │   │   ├── EnhancedLandCard.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── PerformanceTestPanel.tsx
│   │   │   │   ├── PropertyCardShowcase.module.css
│   │   │   │   ├── PropertyCardShowcase.module.css.d.ts
│   │   │   │   ├── PropertyCardShowcase.tsx
│   │   │   │   ├── PropertyListingWizard.tsx
│   │   │   │   ├── PropertyMap.tsx
│   │   │   │   ├── PropertyReviews.tsx
│   │   │   │   └── PropertyTestComponent.tsx
│   │   │   ├── contexts/
│   │   │   │   ├── ARCHITECTURE.md
│   │   │   │   ├── COMPARE_CONTEXT_REMOVAL_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   └── PropertyContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── MIGRATION_GUIDE.md
│   │   │   │   ├── useConsolidatedPropertySearch.ts
│   │   │   │   ├── useLandProperty.ts
│   │   │   │   ├── useProperty.ts
│   │   │   │   ├── usePropertySearch.ts
│   │   │   │   └── useUnifiedProperty.ts
│   │   │   ├── pages/
│   │   │   │   ├── CommercialProperties.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LandDetails.tsx
│   │   │   │   ├── LandRedirect.tsx
│   │   │   │   ├── Lands.tsx
│   │   │   │   ├── ListProperty.tsx
│   │   │   │   ├── PropertiesResidential.tsx
│   │   │   │   ├── PropertyCompare.tsx
│   │   │   │   ├── PropertyDetails.tsx
│   │   │   │   ├── PropertyEdit.tsx
│   │   │   │   ├── PropertyOptimize.tsx
│   │   │   │   ├── PropertyPhotos.tsx
│   │   │   │   ├── PropertyVerification.tsx
│   │   │   │   └── PropertyWizard.tsx
│   │   │   ├── services/
│   │   │   │   ├── index.ts
│   │   │   │   ├── mock-land-data.ts
│   │   │   │   ├── property-api.ts
│   │   │   │   ├── property-validation.ts
│   │   │   │   └── PropertyDocumentIntegration.ts
│   │   │   ├── tests/
│   │   │   │   ├── performanceTest.ts
│   │   │   │   └── property-land-verification.test.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   └── property.types.ts
│   │   │   ├── utils/
│   │   │   │   ├── normalizeLandProperty.ts
│   │   │   │   ├── normalizeProperty.ts
│   │   │   │   ├── performanceMonitor.ts
│   │   │   │   ├── propertyImages.ts
│   │   │   │   └── raceConditionTest.ts
│   │   │   └── index.ts
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── ConsolidatedSearch.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── SearchFilters.tsx
│   │   │   ├── examples/
│   │   │   │   └── SearchExample.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   └── useSearch.ts
│   │   │   ├── pages/
│   │   │   │   ├── AdvancedSearch.tsx
│   │   │   │   └── SearchResults.tsx
│   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── ai-integration/
│   │   │   │   │   └── PropertyAIEnhancement.tsx
│   │   │   │   ├── b2b/
│   │   │   │   │   ├── B2BCommunityInsightsBanner.tsx
│   │   │   │   │   ├── B2BCommunityInsightsPrompt.tsx
│   │   │   │   │   ├── B2BContextualPrompt.tsx
│   │   │   │   │   ├── B2BEntryPointManager.tsx
│   │   │   │   │   ├── B2BFraudReportBanner.tsx
│   │   │   │   │   ├── B2BFraudReportPrompt.tsx
│   │   │   │   │   ├── B2BLeadCapture.tsx
│   │   │   │   │   ├── B2BNotificationBanner.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── blog/
│   │   │   │   │   ├── BlogPostCard.tsx
│   │   │   │   │   └── BlogPostSkeleton.tsx
│   │   │   │   ├── error-handling/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── examples/
│   │   │   │   │   └── EnhancedHooksExample.tsx
│   │   │   │   ├── fallbacks/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MobileNavFallback.tsx
│   │   │   │   │   ├── NavigationFallback.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── FileUpload.tsx
│   │   │   │   │   ├── FileUploadField.tsx
│   │   │   │   │   └── FormField.tsx
│   │   │   │   ├── hero/
│   │   │   │   │   ├── ConversionHero.tsx
│   │   │   │   │   └── EnhancedHero.tsx
│   │   │   │   ├── images/
│   │   │   │   │   ├── EnhancedImageShowcase.tsx
│   │   │   │   │   ├── ImageGallery.module.css
│   │   │   │   │   ├── ImageGallery.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MIGRATION_GUIDE.md
│   │   │   │   │   ├── PropertyImageVault.tsx
│   │   │   │   │   └── REDUNDANCY_ANALYSIS.md
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── ApiClientDashboard.tsx
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── BreadcrumbNavigation.tsx
│   │   │   │   │   ├── ContextualSidebar.tsx
│   │   │   │   │   ├── EnhancedNavigation.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MOBILE_NAV_VISIBILITY_IMPROVEMENTS.md
│   │   │   │   │   ├── MobileNav.tsx
│   │   │   │   │   ├── NAVIGATION_CRASH_FIXES_COMPLETE.md
│   │   │   │   │   ├── NAVIGATION_FIXES_SUMMARY.md
│   │   │   │   │   ├── NavigationDebug.tsx
│   │   │   │   │   ├── NavigationErrorBoundary.tsx
│   │   │   │   │   ├── NavigationSearch.tsx
│   │   │   │   │   └── SafeNavigation.tsx
│   │   │   │   ├── property/
│   │   │   │   │   ├── filters/
│   │   │   │   │   │   ├── AllPropertiesFilters.tsx
│   │   │   │   │   │   ├── BasePropertyFilters.tsx
│   │   │   │   │   │   ├── CommercialFilters.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── LandFilters.tsx
│   │   │   │   │   │   └── ResidentialFilters.tsx
│   │   │   │   │   ├── shared/
│   │   │   │   │   │   ├── examples/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── MinimalPropertyCard.tsx
│   │   │   │   │   │   ├── FINAL_STATUS.md
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── PropertyFeatures.tsx
│   │   │   │   │   │   ├── PropertyImageSection.tsx
│   │   │   │   │   │   ├── QuickActionsOverlay.tsx
│   │   │   │   │   │   ├── REFACTORING_COMPLETE.md
│   │   │   │   │   │   └── REFACTORING_GUIDE.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── PhotoManagementButton.tsx
│   │   │   │   │   ├── PropertyArchitectureComparison.tsx
│   │   │   │   │   ├── PropertyCard.tsx
│   │   │   │   │   ├── PropertyCardWithImageManagement.example.tsx
│   │   │   │   │   ├── PropertyDataGrid.tsx
│   │   │   │   │   ├── PropertyListingPage.tsx
│   │   │   │   │   ├── PropertySkeletonGrid.tsx
│   │   │   │   │   └── UnifiedPropertyCard.tsx
│   │   │   │   ├── skeletons/
│   │   │   │   │   └── PropertyDetailsSkeleton.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── accordion.tsx
│   │   │   │   │   ├── alert-dialog.tsx
│   │   │   │   │   ├── alert.tsx
│   │   │   │   │   ├── aspect-ratio.tsx
│   │   │   │   │   ├── avatar.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   ├── breadcrumb.tsx
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── calendar.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── carousel.tsx
│   │   │   │   │   ├── chart.tsx
│   │   │   │   │   ├── checkbox.tsx
│   │   │   │   │   ├── collapsible.tsx
│   │   │   │   │   ├── command.tsx
│   │   │   │   │   ├── common-buttons.tsx
│   │   │   │   │   ├── context-menu.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   ├── drawer.tsx
│   │   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   │   ├── enhanced-navigation.tsx
│   │   │   │   │   ├── error-states.tsx
│   │   │   │   │   ├── form.tsx
│   │   │   │   │   ├── hover-card.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input-otp.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── label.tsx
│   │   │   │   │   ├── loading-skeleton.tsx
│   │   │   │   │   ├── loading-states.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── logo.tsx
│   │   │   │   │   ├── menubar.tsx
│   │   │   │   │   ├── navigation-menu.tsx
│   │   │   │   │   ├── popover.tsx
│   │   │   │   │   ├── progress.tsx
│   │   │   │   │   ├── radio-group.tsx
│   │   │   │   │   ├── resizable.tsx
│   │   │   │   │   ├── scroll-area.tsx
│   │   │   │   │   ├── select.tsx
│   │   │   │   │   ├── separator.tsx
│   │   │   │   │   ├── sheet.tsx
│   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   ├── slider.tsx
│   │   │   │   │   ├── switch.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── tabs.tsx
│   │   │   │   │   ├── textarea.tsx
│   │   │   │   │   ├── theme-toggle.tsx
│   │   │   │   │   ├── toast.tsx
│   │   │   │   │   ├── toaster.tsx
│   │   │   │   │   ├── toggle-group.tsx
│   │   │   │   │   ├── toggle.tsx
│   │   │   │   │   ├── tooltip.tsx
│   │   │   │   │   └── wordmark.tsx
│   │   │   │   ├── AfricaCoverageMap.tsx
│   │   │   │   ├── CommunityInsights.tsx
│   │   │   │   ├── DemoLoginHelper.tsx
│   │   │   │   ├── EnhancedVirtualizedPropertyList.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── ErrorFeedback.tsx
│   │   │   │   ├── GlobalPerformanceTestPanel.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── IntegrationTest.tsx
│   │   │   │   ├── LazyComponents.tsx
│   │   │   │   ├── listing-card.tsx
│   │   │   │   ├── LoadingStates.tsx
│   │   │   │   ├── NewsBlog.tsx
│   │   │   │   ├── Pagination.tsx
│   │   │   │   ├── PaymentGuidance.tsx
│   │   │   │   ├── PricingCTA.tsx
│   │   │   │   ├── QueryErrorBoundary.tsx
│   │   │   │   ├── ServiceCategories.tsx
│   │   │   │   ├── Testimonials.tsx
│   │   │   │   ├── TrustIndicators.tsx
│   │   │   │   ├── VideoModal.tsx
│   │   │   │   ├── VirtualizedList.tsx
│   │   │   │   └── VirtualizedPropertyList.tsx
│   │   │   ├── config/
│   │   │   │   ├── assets.ts
│   │   │   │   ├── image-components.config.ts
│   │   │   │   ├── image-system.config.ts
│   │   │   │   ├── images.ts
│   │   │   │   ├── propertyTypes.ts
│   │   │   │   └── user-journeys.ts
│   │   │   ├── contexts/
│   │   │   │   └── ThemeContext.tsx
│   │   │   ├── docs/
│   │   │   │   └── memory-optimization-guide.md
│   │   │   ├── error-handling/
│   │   │   │   ├── client/
│   │   │   │   │   └── error-handler.ts
│   │   │   │   ├── constants/
│   │   │   │   │   ├── error-categories.ts
│   │   │   │   │   ├── error-codes.d.ts
│   │   │   │   │   ├── error-codes.d.ts.map
│   │   │   │   │   ├── error-codes.js
│   │   │   │   │   ├── error-codes.js.map
│   │   │   │   │   ├── error-codes.ts
│   │   │   │   │   ├── http-status.ts
│   │   │   │   │   └── postgres-codes.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── base-error.ts
│   │   │   │   │   ├── database-error.ts
│   │   │   │   │   └── validation-error.ts
│   │   │   │   ├── server/
│   │   │   │   │   └── express-handler.ts
│   │   │   │   ├── utilities/
│   │   │   │   │   ├── error-factory.ts
│   │   │   │   │   ├── error-metrics.ts
│   │   │   │   │   └── error-utils.ts
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── configs/
│   │   │   │   │   ├── formValidationConfigs.ts
│   │   │   │   │   ├── hookConfigs.ts
│   │   │   │   │   └── propertyQueryConfigs.ts
│   │   │   │   ├── examples/
│   │   │   │   │   └── configurationExamples.ts
│   │   │   │   ├── images/
│   │   │   │   │   └── usePropertyImageUpload.ts
│   │   │   │   ├── migration/
│   │   │   │   │   ├── COMPREHENSIVE_MIGRATION_GUIDE.md
│   │   │   │   │   ├── MIGRATION_CHECKLIST.md
│   │   │   │   │   ├── property-hooks-migration.md
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── TROUBLESHOOTING_GUIDE.md
│   │   │   │   ├── presets/
│   │   │   │   │   └── commonHookPresets.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── deprecation.ts
│   │   │   │   │   ├── init.ts
│   │   │   │   │   └── migration.ts
│   │   │   │   ├── CONSOLIDATION_LOG.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── QUALITY_STANDARDS.md
│   │   │   │   ├── SESSION_SUMMARY.md
│   │   │   │   ├── STANDARDIZATION_SUMMARY.md
│   │   │   │   ├── use-mobile.tsx
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── useAccessibility.tsx
│   │   │   │   ├── useAIIntegration.ts
│   │   │   │   ├── useB2BEntryPoints.ts
│   │   │   │   ├── useB2BMessaging.ts
│   │   │   │   ├── useCMS.ts
│   │   │   │   ├── useCompareError.ts
│   │   │   │   ├── useComponentPerformance.tsx
│   │   │   │   ├── useConfigurableHook.ts
│   │   │   │   ├── useDebounce.ts
│   │   │   │   ├── useDebouncedCallback.ts
│   │   │   │   ├── useEnhancedImageGallery.ts
│   │   │   │   ├── useErrorRecovery.ts
│   │   │   │   ├── useFileUpload.ts
│   │   │   │   ├── useFilterState.ts
│   │   │   │   ├── useFormValidation.ts
│   │   │   │   ├── useGeolocation.ts
│   │   │   │   ├── useHealthMonitoring.ts
│   │   │   │   ├── useImageGallery.ts
│   │   │   │   ├── useMemoryOptimization.ts
│   │   │   │   ├── useNavigationSpacing.ts
│   │   │   │   ├── useOperationTracking.ts
│   │   │   │   ├── useOptimisticMutation.ts
│   │   │   │   ├── usePagination.ts
│   │   │   │   ├── usePaymentGuidance.ts
│   │   │   │   ├── usePerformanceOptimization.ts
│   │   │   │   ├── usePolling.ts
│   │   │   │   ├── usePropertyActions.ts
│   │   │   │   ├── usePropertyCardActions.ts
│   │   │   │   ├── usePropertyCardState.ts
│   │   │   │   ├── usePropertyCompareActions.ts
│   │   │   │   ├── usePropertyFormatting.ts
│   │   │   │   ├── useSafeQuery.ts
│   │   │   │   ├── useSecurity.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   ├── pages/
│   │   │   │   ├── solutions/
│   │   │   │   │   ├── LegalExperts.tsx
│   │   │   │   │   ├── PropertyBuyers.tsx
│   │   │   │   │   ├── PropertyDevelopers.tsx
│   │   │   │   │   ├── PropertySellers.tsx
│   │   │   │   │   └── RealEstateAgents.tsx
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── ApiDemo.tsx
│   │   │   │   ├── Blog.tsx
│   │   │   │   ├── BlogPost.tsx
│   │   │   │   ├── BlogTest.tsx
│   │   │   │   ├── ComingSoon.tsx
│   │   │   │   ├── Community.tsx
│   │   │   │   ├── CommunityAndResources.tsx
│   │   │   │   ├── CommunityIntelligence.tsx
│   │   │   │   ├── Contact.tsx
│   │   │   │   ├── ContactSales.tsx
│   │   │   │   ├── Cookies.tsx
│   │   │   │   ├── Demo.tsx
│   │   │   │   ├── DeveloperDashboard.tsx
│   │   │   │   ├── DocumentsPage.tsx
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   ├── ExpertCoordination.tsx
│   │   │   │   ├── Features.tsx
│   │   │   │   ├── FindProfessionals.tsx
│   │   │   │   ├── Fraud-resources.tsx
│   │   │   │   ├── GettingStarted.tsx
│   │   │   │   ├── Help.tsx
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LocationServices.tsx
│   │   │   │   ├── MVP-Demo.tsx
│   │   │   │   ├── NavigationTest.tsx
│   │   │   │   ├── NotFound.tsx
│   │   │   │   ├── OurStory.tsx
│   │   │   │   ├── Partners.tsx
│   │   │   │   ├── PhysicalVerification.tsx
│   │   │   │   ├── PressMedia.tsx
│   │   │   │   ├── Pricing.tsx
│   │   │   │   ├── Privacy.tsx
│   │   │   │   ├── Properties.tsx
│   │   │   │   ├── Resources.tsx
│   │   │   │   ├── Security.tsx
│   │   │   │   ├── Services.tsx
│   │   │   │   ├── Solutions.tsx
│   │   │   │   ├── SystemMonitoring.tsx
│   │   │   │   └── Terms.tsx
│   │   │   ├── performance/
│   │   │   │   └── index.ts
│   │   │   ├── security/
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── ai-integration/
│   │   │   │   │   ├── monitoring/
│   │   │   │   │   │   ├── ai-health-monitor.ts
│   │   │   │   │   │   ├── ai-metrics-collector.ts
│   │   │   │   │   │   ├── ai-performance-dashboard.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── ai-integration-orchestrator.ts
│   │   │   │   │   ├── ai-performance-monitor.ts
│   │   │   │   │   ├── document-processing-integration.ts
│   │   │   │   │   ├── fraud-detection-integration.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── property-analysis-integration.ts
│   │   │   │   │   └── recommendation-integration.ts
│   │   │   │   ├── archive/
│   │   │   │   │   └── README.md
│   │   │   │   ├── examples/
│   │   │   │   │   └── unified-api-client-examples.ts
│   │   │   │   ├── images/
│   │   │   │   │   ├── core/
│   │   │   │   │   │   └── ImageServiceCore.ts
│   │   │   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   │   │   ├── ImageMetadataService.ts
│   │   │   │   │   ├── ImageServiceOrchestrator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── LegacyServiceAdapter.ts
│   │   │   │   │   ├── MIGRATION_GUIDE.md
│   │   │   │   │   ├── PropertyImageUploadCoordinator.ts
│   │   │   │   │   ├── PropertyImageUploadService.ts
│   │   │   │   │   ├── PropertyImageValidationService.ts
│   │   │   │   │   ├── PropertyImageWorkflowManager.ts
│   │   │   │   │   ├── UnifiedImageServiceFactory.ts
│   │   │   │   │   └── USAGE_EXAMPLES.md
│   │   │   │   ├── AlertingService.ts
│   │   │   │   ├── api-client-monitor.ts
│   │   │   │   ├── audit-trail-service.ts
│   │   │   │   ├── AuditLogService.ts
│   │   │   │   ├── AuthTokenService.ts
│   │   │   │   ├── DataMigrationService.ts
│   │   │   │   ├── enhanced-huggingface-client.ts
│   │   │   │   ├── FormService.ts
│   │   │   │   ├── HealthCheckService.ts
│   │   │   │   ├── huggingface-api-client.ts
│   │   │   │   ├── huggingface-mock-client.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── mock-ai-data.ts
│   │   │   │   ├── mock-huggingface-client.ts
│   │   │   │   ├── performance-monitoring-service.ts
│   │   │   │   ├── PerformanceService.ts
│   │   │   │   ├── RateLimitService.ts
│   │   │   │   ├── SearchService.ts
│   │   │   │   ├── security-monitoring-service.ts
│   │   │   │   ├── unified-api-client.ts
│   │   │   ├── styles/
│   │   │   │   ├── design-system.css
│   │   │   │   └── globals.css
│   │   │   ├── test-utils/
│   │   │   │   ├── cross-browser/
│   │   │   │   │   └── browser-detection.ts
│   │   │   │   ├── ACCESSIBILITY_TESTING_GUIDE.md
│   │   │   │   ├── accessibility.ts
│   │   │   │   ├── api-handlers.ts
│   │   │   │   ├── bug-detector.ts
│   │   │   │   ├── error-testing.ts
│   │   │   │   ├── example.test.tsx
│   │   │   │   ├── fixtures.ts
│   │   │   │   ├── FORM_TESTING_SUMMARY.md
│   │   │   │   ├── form-testing.ts
│   │   │   │   ├── foundation.test.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── memory-manager.ts
│   │   │   │   ├── msw-browser.ts
│   │   │   │   ├── msw-server.ts
│   │   │   │   ├── patterns.ts
│   │   │   │   ├── performance-testing.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── render.tsx
│   │   │   │   ├── setup.ts
│   │   │   │   ├── test-chunking.ts
│   │   │   │   └── user-event.ts
│   │   │   ├── testing/
│   │   │   │   ├── ApiTestUtils.ts
│   │   │   │   ├── E2ETestUtils.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── TestUtils.ts
│   │   │   ├── types/
│   │   │   │   ├── contracts/
│   │   │   │   │   ├── property-contracts.ts
│   │   │   │   │   └── user-contracts.ts
│   │   │   │   ├── images/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── unified.ts
│   │   │   │   ├── api-contracts.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── api.types.ts
│   │   │   │   ├── compare.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── property.ts
│   │   │   │   ├── search.ts
│   │   │   │   └── service-interfaces.ts
│   │   │   ├── utils/
│   │   │   │   ├── images/
│   │   │   │   │   └── unified-utils.ts
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── cn.ts
│   │   │   │   ├── compare-utils.tsx
│   │   │   │   ├── date-utils.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── globalPerformanceMonitor.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── mockPropertyApi.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   ├── performance-optimizer.ts
│   │   │   │   ├── property-mapper.ts
│   │   │   │   ├── propertyAdapters.ts
│   │   │   │   ├── request-monitor.ts
│   │   │   │   ├── safe-navigation.ts
│   │   │   │   ├── test-helpers.tsx
│   │   │   │   └── toast-utils.ts
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   ├── trust/
│   │   │   ├── components/
│   │   │   │   ├── CaseManagementInterface.tsx
│   │   │   │   ├── DocumentAuthentication.tsx
│   │   │   │   ├── DocumentUploadInterface.tsx
│   │   │   │   ├── DocumentVerificationResults.tsx
│   │   │   │   ├── FraudAlertsList.tsx
│   │   │   │   ├── FraudDetectionDashboard.tsx
│   │   │   │   ├── MLAnalyticsDisplay.tsx
│   │   │   │   ├── NetworkAnalysisVisualization.tsx
│   │   │   │   ├── PropertyRiskAssessment.tsx
│   │   │   │   ├── TrustScore.tsx
│   │   │   │   └── VerificationBadge.tsx
│   │   │   ├── contexts/
│   │   │   │   └── TrustContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useDocumentAuthentication.ts
│   │   │   │   ├── useFraudDetection.ts
│   │   │   │   └── useTrustScore.ts
│   │   │   ├── pages/
│   │   │   │   ├── Alerts.tsx
│   │   │   │   ├── BasicChecks.tsx
│   │   │   │   ├── DocumentAuth.tsx
│   │   │   │   ├── FraudDetection.tsx
│   │   │   │   ├── FraudProtectionInfo.tsx
│   │   │   │   ├── Karma.tsx
│   │   │   │   ├── Reports.tsx
│   │   │   │   ├── Reputation.tsx
│   │   │   │   ├── Reviews.tsx
│   │   │   │   └── TrustPoints.tsx
│   │   │   ├── services/
│   │   │   │   ├── DocumentTrustIntegration.ts
│   │   │   │   ├── fraudDetectionApi.ts
│   │   │   │   ├── trust-api.ts
│   │   │   │   └── trust-business-logic.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   └── trust.types.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── audit.types.ts
│   │   │   ├── css.d.ts
│   │   │   ├── event.types.ts
│   │   │   ├── land-verification.ts
│   │   ├── user/
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── UserNotifications.tsx
│   │   │   │   └── UserProfile.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   └── useUser.ts
│   │   │   ├── pages/
│   │   │   │   ├── Activity.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── Team.tsx
│   │   │   │   ├── Tenants.tsx
│   │   │   │   ├── UserProfile.tsx
│   │   │   │   └── UserSettings.tsx
│   │   │   ├── services/
│   │   │   │   ├── README.md
│   │   │   │   └── user-business-logic.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── bundle-optimizer.ts
│   │   │   └── performance-optimizer.ts
│   │   ├── global.d.ts
│   │   ├── index.ts
│   │   ├── main.tsx
│   │   ├── property-hooks-test.tsx
│   │   ├── test-new-pages.tsx
│   │   ├── test-safe-hooks.tsx
│   │   └── vite-env.d.ts
│   ├── tests/
│   │   ├── e2e/
│   │   │   ├── config/
│   │   │   │   └── test-config.ts
│   │   │   ├── helpers/
│   │   │   │   └── test-helpers.ts
│   │   │   ├── auth-workflows.spec.ts
│   │   │   ├── complete-user-workflows.spec.ts
│   │   │   ├── integration-workflows.spec.ts
│   │   │   ├── property-workflows.spec.ts
│   │   │   ├── README.md
│   │   │   ├── review-workflows.spec.ts
│   │   │   └── user-profile-workflows.spec.ts
│   │   ├── integration/
│   │   │   └── api/
│   │   │       └── auth.test.ts
│   │   ├── shared/
│   │   │   └── ConsolidatedTestFramework.ts
│   │   ├── unit/
│   │   │   └── services/
│   │   │       └── CacheService.test.ts
│   │   ├── visual/
│   │   │   ├── helpers/
│   │   │   │   └── visual-test-utils.ts
│   │   │   ├── animations.visual.test.ts
│   │   │   ├── components.visual.test.ts
│   │   │   ├── README.md
│   │   │   ├── responsive-design.visual.test.ts
│   │   │   ├── responsive-navigation.visual.test.ts
│   │   │   ├── setup.visual.test.ts
│   │   │   └── visual.config.ts
│   │   ├── setup.ts
│   │   ├── test-app-startup.ts
│   │   ├── test-db.cjs
│   │   ├── test-deployment.html
│   │   ├── test-env.ts
│   │   ├── test-imports.mjs
│   │   ├── test-imports.ts
│   │   ├── test-integration-simple.js
│   │   ├── test-with-jsdom.ts
│   │   └── validate-integration.js
│   ├── types/
│   │   ├── css.d.ts
│   │   └── PropertyCardShowcase.css.d.ts
│   ├── uploads/
│   ├── Artmark.svg
│   ├── generate-structure.mjs
│   ├── import-resolver.mjs
│   ├── import-tools.sh
│   ├── import-validator.mjs
│   ├── package-lock.json
│   ├── package.json
│   ├── triplecheck_evaluation.md
│   └── TripleCheck.ico
├── Karibu_Klave/
│   ├── css/
│   │   ├── critical.css
│   │   ├── optimized-global.css
│   │   ├── styles.css
│   │   └── therapeutic-service-custom.css
│   ├── docs/
│   │   ├── integrated_strategic_framework (1).md
│   │   ├── karibu_klave_business_framework.md
│   │   ├── karibu_klave_kenya_proposal (2).md
│   │   ├── karibu_klave_kenya_proposal.md
│   │   ├── karibu_klave_proposal.md
│   │   └── revised_karibu_proposal.md
│   ├── images/
│   │   ├── alternative_logo simple only.svg
│   │   ├── alternative_logo_symbol.webp
│   │   ├── alternative_logo.png
│   │   ├── alternative_logo.svg
│   │   ├── Artboard 1.svg
│   │   ├── complete.png
│   │   ├── complete.svg
│   │   ├── Cross-generational_joy.webp
│   │   ├── karibu klave one.png
│   │   ├── karibu klave one.svg
│   │   ├── karibu_klave_png.png
│   │   ├── klave full.png
│   │   ├── klave full.svg
│   │   └── rhumba.jpg
│   ├── js/
│   │   ├── classes-custom.js
│   │   ├── community-custom.js
│   │   ├── contact-custom.js
│   │   ├── global.js
│   │   ├── our-story-custom.js
│   │   ├── performance-monitor.js
│   │   ├── performance-utils.js
│   │   ├── talent-management-custom.js
│   │   └── therapeutic-service-custom.js
│   ├── classes.html
│   ├── contact.html
│   ├── events.html
│   ├── index.html
│   ├── karibu-klave-classes-page.html
│   ├── main.js
│   ├── package-lock.json
│   ├── package.json
│   ├── privacy.html
│   ├── programs.html
│   ├── README.md
│   ├── research.html
│   ├── server.js
│   ├── story_and_community.html
│   ├── sw.js
│   ├── talent_management.html
│   ├── terms.html
│   ├── therapeutic_service.html
│   ├── therapeutic-services.html
│   └── webpack.config.js
├── OriginTracker/
│   ├── cypress/
│   │   └── e2e/
│   │       └── content-submission-flow.cy.ts
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_add_bug_system_tables.sql
│   │   │   ├── 20240101_create_analysis_tables.sql
│   │   │   ├── 20240501_create_feature_flags_tables.sql
│   │   │   └── add_webhook_tables.sql
│   │   ├── seed/
│   │   │   └── seed.sql
│   │   └── schema.sql
│   ├── docs/
│   │   ├── api/
│   │   │   ├── comprehensive-api-guide.md
│   │   │   └── README.md
│   │   ├── architecture/
│   │   │   └── decisions/
│   │   │       ├── 0001-monorepo-structure.md
│   │   │       ├── 0002-project-restructuring.md
│   │   │       └── 0003-project-restructuring-optimization.md
│   │   ├── deployment/
│   │   │   ├── comprehensive-deployment-guide.md
│   │   │   └── README.md
│   │   ├── bug-system-integration.md
│   │   ├── edge-deployment.md
│   │   ├── project-structure.md
│   │   ├── testing-comprehensive.md
│   │   ├── testing-final-implementation.md
│   │   ├── testing-implementation.md
│   │   └── testing-strategy.md
│   ├── e2e/
│   ├── k8s/
│   │   ├── backend-deployment.yaml
│   │   ├── backend-service.yaml
│   │   ├── configmaps.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── frontend-service.yaml
│   │   └── namespace.yaml
│   ├── nginx/
│   │   └── load-balancer.conf
│   ├── packages/
│   │   ├── api-contract/
│   │   │   ├── scripts/
│   │   │   │   ├── generate-client.js
│   │   │   │   ├── generate-client.ts
│   │   │   │   └── tsconfig.json
│   │   │   ├── src/
│   │   │   │   ├── middleware/
│   │   │   │   │   └── validation.middleware.ts
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── v1/
│   │   │   │   │   │   ├── content.schema.ts
│   │   │   │   │   │   └── user.schema.ts
│   │   │   │   │   └── auth.ts
│   │   │   │   ├── versioning/
│   │   │   │   │   └── versioning.ts
│   │   │   │   ├── api-validation.middleware.ts
│   │   │   │   ├── base.schema.ts
│   │   │   │   ├── client-generator.ts
│   │   │   │   ├── client-utils.ts
│   │   │   │   ├── documentation-generator.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── openapi-doc-generator.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── package.json
│   │   │   ├── README.md
│   │   │   ├── tsconfig.json
│   │   │   └── tsup.config.ts
│   │   ├── bug-system/
│   │   │   ├── docs/
│   │   │   │   ├── COMPREHENSIVE_TESTING_GUIDE.md
│   │   │   │   ├── TESTING_IMPLEMENTATION_SUMMARY.md
│   │   │   │   └── USAGE_EXAMPLES.md
│   │   │   ├── scripts/
│   │   │   │   └── run-comprehensive-tests.ts
│   │   │   ├── src/
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── impact-assessor.ts
│   │   │   │   │   ├── impact-tracker-helpers.ts
│   │   │   │   │   ├── impact-tracker.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── learning-system.ts
│   │   │   │   │   ├── priority-matrix.ts
│   │   │   │   │   ├── reporting-dashboard.ts
│   │   │   │   │   ├── roadmap-generator.ts
│   │   │   │   │   └── root-cause-analyzer.ts
│   │   │   │   ├── api/
│   │   │   │   │   ├── express-bug-api.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── cli/
│   │   │   │   │   └── bug-cli.ts
│   │   │   │   ├── config/
│   │   │   │   │   ├── bug-system-config.ts
│   │   │   │   │   ├── config-api.ts
│   │   │   │   │   ├── config-persistence.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── rule-manager.ts
│   │   │   │   ├── database/
│   │   │   │   │   ├── migrations.ts
│   │   │   │   │   └── schema.ts
│   │   │   │   ├── detection/
│   │   │   │   │   ├── base-detector.ts
│   │   │   │   │   ├── bug-detection-engine.ts
│   │   │   │   │   ├── migration-validator-clean.ts
│   │   │   │   │   ├── migration-validator-enhanced.ts
│   │   │   │   │   ├── migration-validator.ts
│   │   │   │   │   ├── runtime-error-monitor.ts
│   │   │   │   │   ├── static-code-analyzer.ts
│   │   │   │   │   └── test-failure-analyzer.ts
│   │   │   │   ├── emergency/
│   │   │   │   │   ├── emergency-monitor.ts
│   │   │   │   │   ├── emergency-response-system.ts
│   │   │   │   │   ├── hotfix-manager.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── pattern-analyzer.ts
│   │   │   │   ├── execution/
│   │   │   │   │   ├── fix-execution-engine.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── integration/
│   │   │   │   │   ├── express-integration.ts
│   │   │   │   │   ├── origin-tracker-integration.ts
│   │   │   │   │   └── production-monitoring-integration.ts
│   │   │   │   ├── lib/
│   │   │   │   │   └── logger.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── production-monitor.ts
│   │   │   │   ├── optimization/
│   │   │   │   │   ├── cache-manager.ts
│   │   │   │   │   ├── database-optimizer.ts
│   │   │   │   │   ├── file-analysis-worker.js
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── optimization-manager.ts
│   │   │   │   │   ├── parallel-processor.ts
│   │   │   │   │   └── performance-benchmarks.ts
│   │   │   │   ├── planning/
│   │   │   │   │   ├── fix-planning-engine.ts
│   │   │   │   │   └── migration-repair-system.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── analysis-types.ts
│   │   │   │   │   ├── bug-types.ts
│   │   │   │   │   ├── detection-types.ts
│   │   │   │   │   ├── emergency-types.ts
│   │   │   │   │   ├── error-types.ts
│   │   │   │   │   ├── express-extensions.ts
│   │   │   │   │   ├── fix-types.ts
│   │   │   │   │   ├── impact-types.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── monitoring-types.ts
│   │   │   │   ├── validation/
│   │   │   │   │   ├── regression-preventer.ts
│   │   │   │   │   └── validation-engine.ts
│   │   │   │   ├── bug-system.ts
│   │   │   │   └── index.ts
│   │   │   ├── test-config/
│   │   │   ├── jest.config.js
│   │   │   ├── MIGRATION_REPAIR_SYSTEM.md
│   │   │   ├── package.json
│   │   │   ├── README.md
│   │   │   └── tsconfig.json
│   │   ├── client/
│   │   │   ├── public/
│   │   │   │   ├── edge-worker.js
│   │   │   │   ├── offline.html
│   │   │   │   └── service-worker.js
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   │   ├── admin/
│   │   │   │   │   │   ├── ComprehensiveObservabilityDashboard.d.ts
│   │   │   │   │   │   ├── ComprehensiveObservabilityDashboard.js
│   │   │   │   │   │   ├── ComprehensiveObservabilityDashboard.js.map
│   │   │   │   │   │   ├── ComprehensiveObservabilityDashboard.tsx
│   │   │   │   │   │   ├── EnhancedObservabilityDashboard.d.ts
│   │   │   │   │   │   ├── EnhancedObservabilityDashboard.js
│   │   │   │   │   │   ├── EnhancedObservabilityDashboard.js.map
│   │   │   │   │   │   ├── EnhancedObservabilityDashboard.tsx
│   │   │   │   │   │   ├── FeatureFlagAdmin.d.ts
│   │   │   │   │   │   ├── FeatureFlagAdmin.js
│   │   │   │   │   │   ├── FeatureFlagAdmin.js.map
│   │   │   │   │   │   ├── FeatureFlagAdmin.tsx
│   │   │   │   │   │   ├── MonitoringDashboard.d.ts
│   │   │   │   │   │   ├── MonitoringDashboard.js
│   │   │   │   │   │   ├── MonitoringDashboard.js.map
│   │   │   │   │   │   ├── MonitoringDashboard.tsx
│   │   │   │   │   │   ├── ObservabilityDashboard.d.ts
│   │   │   │   │   │   ├── ObservabilityDashboard.js
│   │   │   │   │   │   ├── ObservabilityDashboard.js.map
│   │   │   │   │   │   └── ObservabilityDashboard.tsx
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── enhanced-login-form.d.ts
│   │   │   │   │   │   ├── enhanced-login-form.js
│   │   │   │   │   │   ├── enhanced-login-form.js.map
│   │   │   │   │   │   ├── enhanced-login-form.tsx
│   │   │   │   │   │   ├── index.d.ts
│   │   │   │   │   │   ├── index.js
│   │   │   │   │   │   ├── index.js.map
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── login-form.d.ts
│   │   │   │   │   │   ├── login-form.js
│   │   │   │   │   │   ├── login-form.js.map
│   │   │   │   │   │   ├── login-form.tsx
│   │   │   │   │   │   ├── mfa-verification.d.ts
│   │   │   │   │   │   ├── mfa-verification.js
│   │   │   │   │   │   ├── mfa-verification.js.map
│   │   │   │   │   │   ├── mfa-verification.tsx
│   │   │   │   │   │   ├── password-reset-form.d.ts
│   │   │   │   │   │   ├── password-reset-form.js
│   │   │   │   │   │   ├── password-reset-form.js.map
│   │   │   │   │   │   ├── password-reset-form.tsx
│   │   │   │   │   │   ├── profile-form.d.ts
│   │   │   │   │   │   ├── profile-form.js
│   │   │   │   │   │   ├── profile-form.js.map
│   │   │   │   │   │   ├── profile-form.tsx
│   │   │   │   │   │   ├── register-form.d.ts
│   │   │   │   │   │   ├── register-form.js
│   │   │   │   │   │   ├── register-form.js.map
│   │   │   │   │   │   └── register-form.tsx
│   │   │   │   │   ├── ContentAnalysis/
│   │   │   │   │   │   ├── ContentAnalysisDashboard.d.ts
│   │   │   │   │   │   ├── ContentAnalysisDashboard.js
│   │   │   │   │   │   ├── ContentAnalysisDashboard.js.map
│   │   │   │   │   │   └── ContentAnalysisDashboard.tsx
│   │   │   │   │   ├── ContentSubmissionForm/
│   │   │   │   │   │   ├── ContentSubmissionForm.test.d.ts
│   │   │   │   │   │   ├── ContentSubmissionForm.test.js
│   │   │   │   │   │   ├── ContentSubmissionForm.test.js.map
│   │   │   │   │   │   └── ContentSubmissionForm.test.tsx
│   │   │   │   │   ├── forms/
│   │   │   │   │   │   ├── InputValidator.d.ts
│   │   │   │   │   │   ├── InputValidator.js
│   │   │   │   │   │   ├── InputValidator.js.map
│   │   │   │   │   │   └── InputValidator.tsx
│   │   │   │   │   ├── ProcessingStatus/
│   │   │   │   │   │   ├── ProcessingStatus.d.ts
│   │   │   │   │   │   ├── ProcessingStatus.js
│   │   │   │   │   │   ├── ProcessingStatus.js.map
│   │   │   │   │   │   ├── ProcessingStatus.test.d.ts
│   │   │   │   │   │   ├── ProcessingStatus.test.js
│   │   │   │   │   │   ├── ProcessingStatus.test.js.map
│   │   │   │   │   │   ├── ProcessingStatus.test.tsx
│   │   │   │   │   │   └── ProcessingStatus.tsx
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── display-settings.d.ts
│   │   │   │   │   │   ├── display-settings.js
│   │   │   │   │   │   ├── display-settings.js.map
│   │   │   │   │   │   ├── display-settings.tsx
│   │   │   │   │   │   ├── notification-settings.d.ts
│   │   │   │   │   │   ├── notification-settings.js
│   │   │   │   │   │   ├── notification-settings.js.map
│   │   │   │   │   │   ├── notification-settings.tsx
│   │   │   │   │   │   ├── privacy-settings.d.ts
│   │   │   │   │   │   ├── privacy-settings.js
│   │   │   │   │   │   ├── privacy-settings.js.map
│   │   │   │   │   │   ├── privacy-settings.tsx
│   │   │   │   │   │   ├── verification-settings.d.ts
│   │   │   │   │   │   ├── verification-settings.js
│   │   │   │   │   │   ├── verification-settings.js.map
│   │   │   │   │   │   └── verification-settings.tsx
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── accordion.d.ts
│   │   │   │   │   │   ├── accordion.js
│   │   │   │   │   │   ├── accordion.js.map
│   │   │   │   │   │   ├── accordion.jsx
│   │   │   │   │   │   ├── accordion.tsx
│   │   │   │   │   │   ├── alert-dialog.d.ts
│   │   │   │   │   │   ├── alert-dialog.js
│   │   │   │   │   │   ├── alert-dialog.js.map
│   │   │   │   │   │   ├── alert-dialog.tsx
│   │   │   │   │   │   ├── alert.d.ts
│   │   │   │   │   │   ├── alert.js
│   │   │   │   │   │   ├── alert.js.map
│   │   │   │   │   │   ├── alert.tsx
│   │   │   │   │   │   ├── aspect-ratio.d.ts
│   │   │   │   │   │   ├── aspect-ratio.js
│   │   │   │   │   │   ├── aspect-ratio.js.map
│   │   │   │   │   │   ├── aspect-ratio.tsx
│   │   │   │   │   │   ├── avatar.d.ts
│   │   │   │   │   │   ├── avatar.js
│   │   │   │   │   │   ├── avatar.js.map
│   │   │   │   │   │   ├── avatar.tsx
│   │   │   │   │   │   ├── badge.d.ts
│   │   │   │   │   │   ├── badge.js
│   │   │   │   │   │   ├── badge.js.map
│   │   │   │   │   │   ├── badge.tsx
│   │   │   │   │   │   ├── breadcrumb.d.ts
│   │   │   │   │   │   ├── breadcrumb.js
│   │   │   │   │   │   ├── breadcrumb.js.map
│   │   │   │   │   │   ├── breadcrumb.tsx
│   │   │   │   │   │   ├── button.d.ts
│   │   │   │   │   │   ├── button.js
│   │   │   │   │   │   ├── button.js.map
│   │   │   │   │   │   ├── button.jsx
│   │   │   │   │   │   ├── button.tsx
│   │   │   │   │   │   ├── calendar.d.ts
│   │   │   │   │   │   ├── calendar.js
│   │   │   │   │   │   ├── calendar.js.map
│   │   │   │   │   │   ├── calendar.tsx
│   │   │   │   │   │   ├── card.d.ts
│   │   │   │   │   │   ├── card.js
│   │   │   │   │   │   ├── card.js.map
│   │   │   │   │   │   ├── card.jsx
│   │   │   │   │   │   ├── card.tsx
│   │   │   │   │   │   ├── carousel.d.ts
│   │   │   │   │   │   ├── carousel.js
│   │   │   │   │   │   ├── carousel.js.map
│   │   │   │   │   │   ├── carousel.tsx
│   │   │   │   │   │   ├── chart.d.ts
│   │   │   │   │   │   ├── chart.js
│   │   │   │   │   │   ├── chart.js.map
│   │   │   │   │   │   ├── chart.tsx
│   │   │   │   │   │   ├── checkbox.d.ts
│   │   │   │   │   │   ├── checkbox.js
│   │   │   │   │   │   ├── checkbox.js.map
│   │   │   │   │   │   ├── checkbox.tsx
│   │   │   │   │   │   ├── collapsible.d.ts
│   │   │   │   │   │   ├── collapsible.js
│   │   │   │   │   │   ├── collapsible.js.map
│   │   │   │   │   │   ├── collapsible.tsx
│   │   │   │   │   │   ├── command.d.ts
│   │   │   │   │   │   ├── command.js
│   │   │   │   │   │   ├── command.js.map
│   │   │   │   │   │   ├── command.tsx
│   │   │   │   │   │   ├── context-menu.d.ts
│   │   │   │   │   │   ├── context-menu.js
│   │   │   │   │   │   ├── context-menu.js.map
│   │   │   │   │   │   ├── context-menu.tsx
│   │   │   │   │   │   ├── dialog.d.ts
│   │   │   │   │   │   ├── dialog.js
│   │   │   │   │   │   ├── dialog.js.map
│   │   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   │   ├── drawer.d.ts
│   │   │   │   │   │   ├── drawer.js
│   │   │   │   │   │   ├── drawer.js.map
│   │   │   │   │   │   ├── drawer.tsx
│   │   │   │   │   │   ├── dropdown-menu.d.ts
│   │   │   │   │   │   ├── dropdown-menu.js
│   │   │   │   │   │   ├── dropdown-menu.js.map
│   │   │   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   │   │   ├── form.d.ts
│   │   │   │   │   │   ├── form.js
│   │   │   │   │   │   ├── form.js.map
│   │   │   │   │   │   ├── form.tsx
│   │   │   │   │   │   ├── hover-card.d.ts
│   │   │   │   │   │   ├── hover-card.js
│   │   │   │   │   │   ├── hover-card.js.map
│   │   │   │   │   │   ├── hover-card.tsx
│   │   │   │   │   │   ├── input-otp.d.ts
│   │   │   │   │   │   ├── input-otp.js
│   │   │   │   │   │   ├── input-otp.js.map
│   │   │   │   │   │   ├── input-otp.tsx
│   │   │   │   │   │   ├── input.d.ts
│   │   │   │   │   │   ├── input.js
│   │   │   │   │   │   ├── input.js.map
│   │   │   │   │   │   ├── input.tsx
│   │   │   │   │   │   ├── label.d.ts
│   │   │   │   │   │   ├── label.js
│   │   │   │   │   │   ├── label.js.map
│   │   │   │   │   │   ├── label.tsx
│   │   │   │   │   │   ├── menubar.d.ts
│   │   │   │   │   │   ├── menubar.js
│   │   │   │   │   │   ├── menubar.js.map
│   │   │   │   │   │   ├── menubar.tsx
│   │   │   │   │   │   ├── navigation-menu.d.ts
│   │   │   │   │   │   ├── navigation-menu.js
│   │   │   │   │   │   ├── navigation-menu.js.map
│   │   │   │   │   │   ├── navigation-menu.tsx
│   │   │   │   │   │   ├── pagination.d.ts
│   │   │   │   │   │   ├── pagination.js
│   │   │   │   │   │   ├── pagination.js.map
│   │   │   │   │   │   ├── pagination.tsx
│   │   │   │   │   │   ├── popover.d.ts
│   │   │   │   │   │   ├── popover.js
│   │   │   │   │   │   ├── popover.js.map
│   │   │   │   │   │   ├── popover.tsx
│   │   │   │   │   │   ├── progress.d.ts
│   │   │   │   │   │   ├── progress.js
│   │   │   │   │   │   ├── progress.js.map
│   │   │   │   │   │   ├── progress.tsx
│   │   │   │   │   │   ├── radio-group.d.ts
│   │   │   │   │   │   ├── radio-group.js
│   │   │   │   │   │   ├── radio-group.js.map
│   │   │   │   │   │   ├── radio-group.tsx
│   │   │   │   │   │   ├── recommendation.d.ts
│   │   │   │   │   │   ├── recommendation.js
│   │   │   │   │   │   ├── recommendation.js.map
│   │   │   │   │   │   ├── recommendation.tsx
│   │   │   │   │   │   ├── resizable.d.ts
│   │   │   │   │   │   ├── resizable.js
│   │   │   │   │   │   ├── resizable.js.map
│   │   │   │   │   │   ├── resizable.tsx
│   │   │   │   │   │   ├── scroll-area.d.ts
│   │   │   │   │   │   ├── scroll-area.js
│   │   │   │   │   │   ├── scroll-area.js.map
│   │   │   │   │   │   ├── scroll-area.tsx
│   │   │   │   │   │   ├── select.d.ts
│   │   │   │   │   │   ├── select.js
│   │   │   │   │   │   ├── select.js.map
│   │   │   │   │   │   ├── select.tsx
│   │   │   │   │   │   ├── separator.d.ts
│   │   │   │   │   │   ├── separator.js
│   │   │   │   │   │   ├── separator.js.map
│   │   │   │   │   │   ├── separator.tsx
│   │   │   │   │   │   ├── sheet.d.ts
│   │   │   │   │   │   ├── sheet.js
│   │   │   │   │   │   ├── sheet.js.map
│   │   │   │   │   │   ├── sheet.tsx
│   │   │   │   │   │   ├── sidebar.d.ts
│   │   │   │   │   │   ├── sidebar.js
│   │   │   │   │   │   ├── sidebar.js.map
│   │   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   │   ├── skeleton.d.ts
│   │   │   │   │   │   ├── skeleton.js
│   │   │   │   │   │   ├── skeleton.js.map
│   │   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   │   ├── slider.d.ts
│   │   │   │   │   │   ├── slider.js
│   │   │   │   │   │   ├── slider.js.map
│   │   │   │   │   │   ├── slider.tsx
│   │   │   │   │   │   ├── switch.d.ts
│   │   │   │   │   │   ├── switch.js
│   │   │   │   │   │   ├── switch.js.map
│   │   │   │   │   │   ├── switch.tsx
│   │   │   │   │   │   ├── table.d.ts
│   │   │   │   │   │   ├── table.js
│   │   │   │   │   │   ├── table.js.map
│   │   │   │   │   │   ├── table.tsx
│   │   │   │   │   │   ├── tabs.d.ts
│   │   │   │   │   │   ├── tabs.js
│   │   │   │   │   │   ├── tabs.js.map
│   │   │   │   │   │   ├── tabs.tsx
│   │   │   │   │   │   ├── textarea.d.ts
│   │   │   │   │   │   ├── textarea.js
│   │   │   │   │   │   ├── textarea.js.map
│   │   │   │   │   │   ├── textarea.tsx
│   │   │   │   │   │   ├── toast.d.ts
│   │   │   │   │   │   ├── toast.js
│   │   │   │   │   │   ├── toast.js.map
│   │   │   │   │   │   ├── toast.tsx
│   │   │   │   │   │   ├── toaster.d.ts
│   │   │   │   │   │   ├── toaster.js
│   │   │   │   │   │   ├── toaster.js.map
│   │   │   │   │   │   ├── toaster.tsx
│   │   │   │   │   │   ├── toggle-group.d.ts
│   │   │   │   │   │   ├── toggle-group.js
│   │   │   │   │   │   ├── toggle-group.js.map
│   │   │   │   │   │   ├── toggle-group.tsx
│   │   │   │   │   │   ├── toggle.d.ts
│   │   │   │   │   │   ├── toggle.js
│   │   │   │   │   │   ├── toggle.js.map
│   │   │   │   │   │   ├── toggle.tsx
│   │   │   │   │   │   ├── tooltip.d.ts
│   │   │   │   │   │   ├── tooltip.js
│   │   │   │   │   │   ├── tooltip.js.map
│   │   │   │   │   │   └── tooltip.tsx
│   │   │   │   │   ├── accessibility-settings-panel.d.ts
│   │   │   │   │   ├── accessibility-settings-panel.js
│   │   │   │   │   ├── accessibility-settings-panel.js.map
│   │   │   │   │   ├── accessibility-settings-panel.jsx
│   │   │   │   │   ├── accessibility-settings-panel.tsx
│   │   │   │   │   ├── analytics-dashboard.d.ts
│   │   │   │   │   ├── analytics-dashboard.js
│   │   │   │   │   ├── analytics-dashboard.js.map
│   │   │   │   │   ├── analytics-dashboard.tsx
│   │   │   │   │   ├── connection-status.d.ts
│   │   │   │   │   ├── connection-status.js
│   │   │   │   │   ├── connection-status.js.map
│   │   │   │   │   ├── connection-status.tsx
│   │   │   │   │   ├── content-submission-form.d.ts
│   │   │   │   │   ├── content-submission-form.js
│   │   │   │   │   ├── content-submission-form.js.map
│   │   │   │   │   ├── content-submission-form.jsx
│   │   │   │   │   ├── content-submission-form.tsx
│   │   │   │   │   ├── content-timeline.d.ts
│   │   │   │   │   ├── content-timeline.js
│   │   │   │   │   ├── content-timeline.js.map
│   │   │   │   │   ├── content-timeline.jsx
│   │   │   │   │   ├── content-timeline.tsx
│   │   │   │   │   ├── ContentVerificationWorkflow.d.ts
│   │   │   │   │   ├── ContentVerificationWorkflow.js
│   │   │   │   │   ├── ContentVerificationWorkflow.js.map
│   │   │   │   │   ├── ContentVerificationWorkflow.tsx
│   │   │   │   │   ├── error-boundary.d.ts
│   │   │   │   │   ├── error-boundary.js
│   │   │   │   │   ├── error-boundary.js.map
│   │   │   │   │   ├── error-boundary.tsx
│   │   │   │   │   ├── error-display.d.ts
│   │   │   │   │   ├── error-display.js
│   │   │   │   │   ├── error-display.js.map
│   │   │   │   │   ├── error-display.tsx
│   │   │   │   │   ├── error-fallback.d.ts
│   │   │   │   │   ├── error-fallback.js
│   │   │   │   │   ├── error-fallback.js.map
│   │   │   │   │   ├── error-fallback.jsx
│   │   │   │   │   ├── error-fallback.tsx
│   │   │   │   │   ├── error-handling-example.d.ts
│   │   │   │   │   ├── error-handling-example.js
│   │   │   │   │   ├── error-handling-example.js.map
│   │   │   │   │   ├── error-handling-example.tsx
│   │   │   │   │   ├── feature-discovery.d.ts
│   │   │   │   │   ├── feature-discovery.js
│   │   │   │   │   ├── feature-discovery.js.map
│   │   │   │   │   ├── feature-discovery.tsx
│   │   │   │   │   ├── header.d.ts
│   │   │   │   │   ├── header.js
│   │   │   │   │   ├── header.js.map
│   │   │   │   │   ├── header.tsx
│   │   │   │   │   ├── language-selector.d.ts
│   │   │   │   │   ├── language-selector.js
│   │   │   │   │   ├── language-selector.js.map
│   │   │   │   │   ├── language-selector.tsx
│   │   │   │   │   ├── loading-fallback.d.ts
│   │   │   │   │   ├── loading-fallback.js
│   │   │   │   │   ├── loading-fallback.js.map
│   │   │   │   │   ├── loading-fallback.jsx
│   │   │   │   │   ├── loading-fallback.tsx
│   │   │   │   │   ├── loading-skeleton.d.ts
│   │   │   │   │   ├── loading-skeleton.js
│   │   │   │   │   ├── loading-skeleton.js.map
│   │   │   │   │   ├── loading-skeleton.tsx
│   │   │   │   │   ├── loading-spinner.d.ts
│   │   │   │   │   ├── loading-spinner.js
│   │   │   │   │   ├── loading-spinner.js.map
│   │   │   │   │   ├── loading-spinner.jsx
│   │   │   │   │   ├── loading-spinner.tsx
│   │   │   │   │   ├── MonitoringDashboard.d.ts
│   │   │   │   │   ├── MonitoringDashboard.js
│   │   │   │   │   ├── MonitoringDashboard.js.map
│   │   │   │   │   ├── MonitoringDashboard.tsx
│   │   │   │   │   ├── navigation-bar.d.ts
│   │   │   │   │   ├── navigation-bar.js
│   │   │   │   │   ├── navigation-bar.js.map
│   │   │   │   │   ├── navigation-bar.jsx
│   │   │   │   │   ├── navigation-bar.tsx
│   │   │   │   │   ├── offline-status.d.ts
│   │   │   │   │   ├── offline-status.js
│   │   │   │   │   ├── offline-status.js.map
│   │   │   │   │   ├── offline-status.jsx
│   │   │   │   │   ├── offline-status.tsx
│   │   │   │   │   ├── performance-dashboard.d.ts
│   │   │   │   │   ├── performance-dashboard.js
│   │   │   │   │   ├── performance-dashboard.js.map
│   │   │   │   │   ├── performance-dashboard.tsx
│   │   │   │   │   ├── processing-status.d.ts
│   │   │   │   │   ├── processing-status.js
│   │   │   │   │   ├── processing-status.js.map
│   │   │   │   │   ├── processing-status.tsx
│   │   │   │   │   ├── simple-content-form.d.ts
│   │   │   │   │   ├── simple-content-form.js
│   │   │   │   │   ├── simple-content-form.js.map
│   │   │   │   │   ├── simple-content-form.tsx
│   │   │   │   │   ├── skip-to-content.d.ts
│   │   │   │   │   ├── skip-to-content.js
│   │   │   │   │   ├── skip-to-content.js.map
│   │   │   │   │   ├── skip-to-content.jsx
│   │   │   │   │   ├── skip-to-content.tsx
│   │   │   │   │   ├── status-panel.d.ts
│   │   │   │   │   ├── status-panel.js
│   │   │   │   │   ├── status-panel.js.map
│   │   │   │   │   ├── status-panel.module.css
│   │   │   │   │   ├── status-panel.tsx
│   │   │   │   │   ├── strategic-panel.d.ts
│   │   │   │   │   ├── strategic-panel.js
│   │   │   │   │   ├── strategic-panel.js.map
│   │   │   │   │   ├── strategic-panel.jsx
│   │   │   │   │   ├── strategic-panel.tsx
│   │   │   │   │   ├── text-scanner.d.ts
│   │   │   │   │   ├── text-scanner.js
│   │   │   │   │   ├── text-scanner.js.map
│   │   │   │   │   ├── text-scanner.jsx
│   │   │   │   │   ├── text-scanner.test.d.ts
│   │   │   │   │   ├── text-scanner.test.js
│   │   │   │   │   ├── text-scanner.test.js.map
│   │   │   │   │   ├── text-scanner.test.tsx
│   │   │   │   │   ├── text-scanner.tsx
│   │   │   │   │   ├── version-comparison.d.ts
│   │   │   │   │   ├── version-comparison.js
│   │   │   │   │   ├── version-comparison.js.map
│   │   │   │   │   ├── version-comparison.tsx
│   │   │   │   │   ├── WebhookDashboard.d.ts
│   │   │   │   │   ├── WebhookDashboard.js
│   │   │   │   │   ├── WebhookDashboard.js.map
│   │   │   │   │   └── WebhookDashboard.tsx
│   │   │   │   ├── contexts/
│   │   │   │   │   ├── accessibility-context.d.ts
│   │   │   │   │   ├── accessibility-context.js
│   │   │   │   │   ├── accessibility-context.js.map
│   │   │   │   │   ├── accessibility-context.tsx
│   │   │   │   │   ├── auth-context.d.ts
│   │   │   │   │   ├── auth-context.js
│   │   │   │   │   ├── auth-context.js.map
│   │   │   │   │   ├── auth-context.tsx
│   │   │   │   │   ├── config-context.d.ts
│   │   │   │   │   ├── config-context.js
│   │   │   │   │   ├── config-context.js.map
│   │   │   │   │   ├── config-context.tsx
│   │   │   │   │   ├── error-boundary-context.d.ts
│   │   │   │   │   ├── error-boundary-context.js
│   │   │   │   │   ├── error-boundary-context.js.map
│   │   │   │   │   ├── error-boundary-context.tsx
│   │   │   │   │   ├── error-boundary-provider.d.ts
│   │   │   │   │   ├── error-boundary-provider.js
│   │   │   │   │   ├── error-boundary-provider.js.map
│   │   │   │   │   ├── error-boundary-provider.jsx
│   │   │   │   │   ├── error-boundary-provider.tsx
│   │   │   │   │   ├── i18n-context.d.ts
│   │   │   │   │   ├── i18n-context.js
│   │   │   │   │   ├── i18n-context.js.map
│   │   │   │   │   ├── i18n-context.tsx
│   │   │   │   │   ├── index.d.ts
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── index.js.map
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-provider.d.ts
│   │   │   │   │   ├── integration-provider.js
│   │   │   │   │   ├── integration-provider.js.map
│   │   │   │   │   ├── integration-provider.tsx
│   │   │   │   │   ├── observability-context.d.ts
│   │   │   │   │   ├── observability-context.js
│   │   │   │   │   ├── observability-context.js.map
│   │   │   │   │   ├── observability-context.tsx
│   │   │   │   │   ├── performance-context.d.ts
│   │   │   │   │   ├── performance-context.js
│   │   │   │   │   ├── performance-context.js.map
│   │   │   │   │   ├── performance-context.tsx
│   │   │   │   │   ├── performance-types.d.ts
│   │   │   │   │   ├── performance-types.js
│   │   │   │   │   ├── performance-types.js.map
│   │   │   │   │   ├── performance-types.ts
│   │   │   │   │   ├── persistence-context.d.ts
│   │   │   │   │   ├── persistence-context.js
│   │   │   │   │   ├── persistence-context.js.map
│   │   │   │   │   ├── persistence-context.tsx
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── websocket-context.d.ts
│   │   │   │   │   ├── websocket-context.js
│   │   │   │   │   ├── websocket-context.js.map
│   │   │   │   │   ├── websocket-context.ts
│   │   │   │   │   ├── websocket-context.tsx
│   │   │   │   │   ├── websocket-types.d.ts
│   │   │   │   │   ├── websocket-types.js
│   │   │   │   │   ├── websocket-types.js.map
│   │   │   │   │   ├── websocket-types.ts
│   │   │   │   │   ├── websocket-utils.d.ts
│   │   │   │   │   ├── websocket-utils.js
│   │   │   │   │   ├── websocket-utils.js.map
│   │   │   │   │   └── websocket-utils.ts
│   │   │   │   ├── docs/
│   │   │   │   │   ├── backend-structure.md
│   │   │   │   │   ├── error-handling-system.md
│   │   │   │   │   ├── frontend-structure.md
│   │   │   │   │   ├── full-stack-architecture.md
│   │   │   │   │   ├── project-structure.md
│   │   │   │   │   ├── sitemap.md
│   │   │   │   │   └── task-11-implementation-summary.md
│   │   │   │   ├── domains/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── services/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── services/
│   │   │   │   │   └── content/
│   │   │   │   │       ├── controllers/
│   │   │   │   │       ├── repositories/
│   │   │   │   │       └── services/
│   │   │   │   ├── features/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── services/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── services/
│   │   │   │   │   └── content/
│   │   │   │   │       ├── components/
│   │   │   │   │       ├── hooks/
│   │   │   │   │       ├── services/
│   │   │   │   │       ├── index.d.ts
│   │   │   │   │       ├── index.js
│   │   │   │   │       ├── index.js.map
│   │   │   │   │       └── index.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── use-accessibility.d.ts
│   │   │   │   │   ├── use-accessibility.js
│   │   │   │   │   ├── use-accessibility.js.map
│   │   │   │   │   ├── use-accessibility.ts
│   │   │   │   │   ├── use-analytics-websocket.d.ts
│   │   │   │   │   ├── use-analytics-websocket.js
│   │   │   │   │   ├── use-analytics-websocket.js.map
│   │   │   │   │   ├── use-analytics-websocket.ts
│   │   │   │   │   ├── use-error.d.ts
│   │   │   │   │   ├── use-error.js
│   │   │   │   │   ├── use-error.js.map
│   │   │   │   │   ├── use-error.ts
│   │   │   │   │   ├── use-mobile.d.ts
│   │   │   │   │   ├── use-mobile.js
│   │   │   │   │   ├── use-mobile.js.map
│   │   │   │   │   ├── use-mobile.tsx
│   │   │   │   │   ├── use-observability.d.ts
│   │   │   │   │   ├── use-observability.js
│   │   │   │   │   ├── use-observability.js.map
│   │   │   │   │   ├── use-observability.ts
│   │   │   │   │   ├── use-performance-metrics.d.ts
│   │   │   │   │   ├── use-performance-metrics.js
│   │   │   │   │   ├── use-performance-metrics.js.map
│   │   │   │   │   ├── use-performance-metrics.ts
│   │   │   │   │   ├── use-performance.d.ts
│   │   │   │   │   ├── use-performance.js
│   │   │   │   │   ├── use-performance.js.map
│   │   │   │   │   ├── use-performance.ts
│   │   │   │   │   ├── use-processing-status.d.ts
│   │   │   │   │   ├── use-processing-status.js
│   │   │   │   │   ├── use-processing-status.js.map
│   │   │   │   │   ├── use-processing-status.ts
│   │   │   │   │   ├── use-real-time.d.ts
│   │   │   │   │   ├── use-real-time.js
│   │   │   │   │   ├── use-real-time.js.map
│   │   │   │   │   ├── use-real-time.ts
│   │   │   │   │   ├── use-settings.d.ts
│   │   │   │   │   ├── use-settings.js
│   │   │   │   │   ├── use-settings.js.map
│   │   │   │   │   ├── use-settings.ts
│   │   │   │   │   ├── use-toast.d.ts
│   │   │   │   │   ├── use-toast.js
│   │   │   │   │   ├── use-toast.js.map
│   │   │   │   │   ├── use-toast.ts
│   │   │   │   │   ├── use-web-vitals.d.ts
│   │   │   │   │   ├── use-web-vitals.js
│   │   │   │   │   ├── use-web-vitals.js.map
│   │   │   │   │   ├── use-web-vitals.ts
│   │   │   │   │   ├── use-websocket.d.ts
│   │   │   │   │   ├── use-websocket.js
│   │   │   │   │   ├── use-websocket.js.map
│   │   │   │   │   ├── use-websocket.ts
│   │   │   │   │   ├── useAuth.d.ts
│   │   │   │   │   ├── useAuth.js
│   │   │   │   │   ├── useAuth.js.map
│   │   │   │   │   ├── useAuth.ts
│   │   │   │   │   ├── useFeatureFlag.d.ts
│   │   │   │   │   ├── useFeatureFlag.js
│   │   │   │   │   ├── useFeatureFlag.js.map
│   │   │   │   │   └── useFeatureFlag.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── cache/
│   │   │   │   │   ├── db/
│   │   │   │   │   ├── queue/
│   │   │   │   │   └── websocket/
│   │   │   │   ├── lib/
│   │   │   │   │   ├── auth.d.ts
│   │   │   │   │   ├── auth.js
│   │   │   │   │   ├── auth.js.map
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── diff.d.ts
│   │   │   │   │   ├── diff.js
│   │   │   │   │   ├── diff.js.map
│   │   │   │   │   ├── diff.ts
│   │   │   │   │   ├── queryClient.d.ts
│   │   │   │   │   ├── queryClient.js
│   │   │   │   │   ├── queryClient.js.map
│   │   │   │   │   ├── queryClient.ts
│   │   │   │   │   ├── register-service-worker.d.ts
│   │   │   │   │   ├── register-service-worker.js
│   │   │   │   │   ├── register-service-worker.js.map
│   │   │   │   │   ├── register-service-worker.ts
│   │   │   │   │   ├── reportWebVitals.d.ts
│   │   │   │   │   ├── reportWebVitals.js
│   │   │   │   │   ├── reportWebVitals.js.map
│   │   │   │   │   ├── reportWebVitals.ts
│   │   │   │   │   ├── tracing.d.ts
│   │   │   │   │   ├── tracing.js
│   │   │   │   │   ├── tracing.js.map
│   │   │   │   │   ├── tracing.ts
│   │   │   │   │   ├── utils.d.ts
│   │   │   │   │   ├── utils.js
│   │   │   │   │   ├── utils.js.map
│   │   │   │   │   └── utils.ts
│   │   │   │   ├── mocks/
│   │   │   │   │   ├── metrics.d.ts
│   │   │   │   │   ├── metrics.js
│   │   │   │   │   ├── metrics.js.map
│   │   │   │   │   └── metrics.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── content-details.d.ts
│   │   │   │   │   ├── content-details.js
│   │   │   │   │   ├── content-details.js.map
│   │   │   │   │   ├── content-details.tsx
│   │   │   │   │   ├── content-verification.d.ts
│   │   │   │   │   ├── content-verification.js
│   │   │   │   │   ├── content-verification.js.map
│   │   │   │   │   ├── content-verification.tsx
│   │   │   │   │   ├── dashboard.d.ts
│   │   │   │   │   ├── dashboard.js
│   │   │   │   │   ├── dashboard.js.map
│   │   │   │   │   ├── dashboard.tsx
│   │   │   │   │   ├── history.d.ts
│   │   │   │   │   ├── history.js
│   │   │   │   │   ├── history.js.map
│   │   │   │   │   ├── history.tsx
│   │   │   │   │   ├── home.d.ts
│   │   │   │   │   ├── home.js
│   │   │   │   │   ├── home.js.map
│   │   │   │   │   ├── home.tsx
│   │   │   │   │   ├── not-found.d.ts
│   │   │   │   │   ├── not-found.js
│   │   │   │   │   ├── not-found.js.map
│   │   │   │   │   ├── not-found.tsx
│   │   │   │   │   ├── settings.d.ts
│   │   │   │   │   ├── settings.js
│   │   │   │   │   ├── settings.js.map
│   │   │   │   │   └── settings.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── analytics-api.d.ts
│   │   │   │   │   ├── analytics-api.js
│   │   │   │   │   ├── analytics-api.js.map
│   │   │   │   │   ├── analytics-api.ts
│   │   │   │   │   ├── real-time-client.d.ts
│   │   │   │   │   ├── real-time-client.js
│   │   │   │   │   ├── real-time-client.js.map
│   │   │   │   │   ├── real-time-client.ts
│   │   │   │   │   ├── settings-api.d.ts
│   │   │   │   │   ├── settings-api.js
│   │   │   │   │   ├── settings-api.js.map
│   │   │   │   │   ├── settings-api.ts
│   │   │   │   │   ├── websocket-service.d.ts
│   │   │   │   │   ├── websocket-service.js
│   │   │   │   │   ├── websocket-service.js.map
│   │   │   │   │   └── websocket-service.ts
│   │   │   │   ├── shared/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── middleware/
│   │   │   │   │   ├── types/
│   │   │   │   │   └── utils/
│   │   │   │   ├── styles/
│   │   │   │   │   ├── accessibility.css
│   │   │   │   │   ├── globals.css
│   │   │   │   │   └── theme.css
│   │   │   │   ├── test/
│   │   │   │   │   ├── contract/
│   │   │   │   │   │   ├── api-contract.test.d.ts
│   │   │   │   │   │   ├── api-contract.test.js
│   │   │   │   │   │   ├── api-contract.test.js.map
│   │   │   │   │   │   └── api-contract.test.ts
│   │   │   │   │   ├── integration/
│   │   │   │   │   │   ├── api-service.test.d.ts
│   │   │   │   │   │   ├── api-service.test.js
│   │   │   │   │   │   ├── api-service.test.js.map
│   │   │   │   │   │   ├── api-service.test.ts
│   │   │   │   │   │   ├── websocket.test.d.ts
│   │   │   │   │   │   ├── websocket.test.js
│   │   │   │   │   │   ├── websocket.test.js.map
│   │   │   │   │   │   └── websocket.test.ts
│   │   │   │   │   ├── mocks/
│   │   │   │   │   │   ├── websocket-mock.d.ts
│   │   │   │   │   │   ├── websocket-mock.js
│   │   │   │   │   │   ├── websocket-mock.js.map
│   │   │   │   │   │   └── websocket-mock.ts
│   │   │   │   │   ├── setup.d.ts
│   │   │   │   │   ├── setup.js
│   │   │   │   │   ├── setup.js.map
│   │   │   │   │   └── setup.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── integration.d.ts
│   │   │   │   │   ├── integration.js
│   │   │   │   │   ├── integration.js.map
│   │   │   │   │   ├── integration.ts
│   │   │   │   │   ├── user.d.ts
│   │   │   │   │   ├── user.js
│   │   │   │   │   ├── user.js.map
│   │   │   │   │   └── user.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── secureLocalStorage.d.ts
│   │   │   │   │   ├── secureLocalStorage.js
│   │   │   │   │   ├── secureLocalStorage.js.map
│   │   │   │   │   ├── secureLocalStorage.ts
│   │   │   │   │   ├── status.d.ts
│   │   │   │   │   ├── status.js
│   │   │   │   │   ├── status.js.map
│   │   │   │   │   └── status.ts
│   │   │   │   ├── App.d.ts
│   │   │   │   ├── App.js
│   │   │   │   ├── App.js.map
│   │   │   │   ├── App.test.d.ts
│   │   │   │   ├── App.test.js
│   │   │   │   ├── App.test.js.map
│   │   │   │   ├── App.test.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.d.ts
│   │   │   │   ├── main.js
│   │   │   │   ├── main.js.map
│   │   │   │   ├── main.tsx
│   │   │   │   ├── setupVitest.d.ts
│   │   │   │   ├── setupVitest.js
│   │   │   │   ├── setupVitest.js.map
│   │   │   │   └── setupVitest.ts
│   │   │   ├── index.html
│   │   │   ├── observability-dependencies.json
│   │   │   ├── package.json
│   │   │   ├── tailwind.config.ts
│   │   │   ├── test-form.tsx
│   │   │   ├── test-simple-form.tsx
│   │   │   ├── tsconfig.json
│   │   │   ├── vite.config.ts
│   │   │   └── vitest.config.ts
│   │   ├── config/
│   │   │   ├── src/
│   │   │   │   ├── config.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── schema.ts
│   │   │   ├── package.json
│   │   │   ├── schema.ts
│   │   │   └── tsconfig.json
│   │   ├── e2e/
│   │   │   ├── cypress/
│   │   │   │   └── e2e/
│   │   │   │       ├── comprehensive-verification-flow.cy.ts
│   │   │   │       └── content-submission-flow.cy.ts
│   │   │   ├── performance/
│   │   │   │   ├── comprehensive-load-test.js
│   │   │   │   ├── k6-load-test-complete.js
│   │   │   │   ├── k6-load-test.js
│   │   │   │   ├── stress-test-comprehensive.js
│   │   │   │   ├── stress-test.js
│   │   │   │   └── volume-test-comprehensive.js
│   │   │   ├── playwright/
│   │   │   │   ├── complete-verification-workflows-enhanced.test.ts
│   │   │   │   ├── complete-verification-workflows.test.ts
│   │   │   │   └── content-verification-flow.test.ts
│   │   │   ├── src/
│   │   │   │   └── complete-verification-workflow.spec.ts
│   │   │   ├── visual-regression/
│   │   │   │   ├── comprehensive-visual-tests.test.ts
│   │   │   │   └── visual-regression.test.ts
│   │   │   ├── cypress.config.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── server/
│   │   │   ├── src/
│   │   │   │   ├── config/
│   │   │   │   │   ├── auth.config.ts
│   │   │   │   │   ├── database.config.ts
│   │   │   │   │   ├── edge-config.ts
│   │   │   │   │   ├── queue.config.ts
│   │   │   │   │   ├── redis-cluster.config.ts
│   │   │   │   │   └── security.config.ts
│   │   │   │   ├── docs/
│   │   │   │   │   └── security-implementation.md
│   │   │   │   ├── domains/
│   │   │   │   │   └── content/
│   │   │   │   │       ├── index.ts
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── content-processing-integration.ts
│   │   │   │   │   └── copyright-system-integration.ts
│   │   │   │   ├── lib/
│   │   │   │   │   ├── observability/
│   │   │   │   │   │   ├── examples/
│   │   │   │   │   │   │   ├── health-examples.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── logging-examples.ts
│   │   │   │   │   │   │   ├── metrics-examples.ts
│   │   │   │   │   │   │   ├── tracing-examples.ts
│   │   │   │   │   │   │   └── visualization-examples.ts
│   │   │   │   │   │   ├── complete-integration.ts
│   │   │   │   │   │   ├── health.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── integration.ts
│   │   │   │   │   │   ├── logging.ts
│   │   │   │   │   │   ├── metrics.ts
│   │   │   │   │   │   ├── middleware.ts
│   │   │   │   │   │   ├── package-updates.json
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   ├── tracing.ts
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── visualization.ts
│   │   │   │   │   ├── resilience/
│   │   │   │   │   │   ├── examples/
│   │   │   │   │   │   │   └── circuit-breaker-examples.ts
│   │   │   │   │   │   ├── advanced-circuit-breaker.ts
│   │   │   │   │   │   ├── http-client-integration.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── partial-circuit-breaker.ts
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── unified-cache/
│   │   │   │   │   │   ├── examples/
│   │   │   │   │   │   │   └── express-integration.ts
│   │   │   │   │   │   ├── strategies/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── redis-cache.ts
│   │   │   │   │   │   ├── cache-factory.ts
│   │   │   │   │   │   ├── cache-service.ts
│   │   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── interfaces.ts
│   │   │   │   │   ├── audit-logger.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── crypto.ts
│   │   │   │   │   ├── db-health.ts
│   │   │   │   │   ├── db.ts
│   │   │   │   │   ├── jwt.ts
│   │   │   │   │   ├── logger.ts
│   │   │   │   │   ├── pgSessionStore.ts
│   │   │   │   │   ├── ports.ts
│   │   │   │   │   ├── redis.ts
│   │   │   │   │   ├── session.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── validators.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   └── file-upload.ts
│   │   │   │   ├── middlewares/
│   │   │   │   │   ├── api-error-handler.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── error-handler.ts
│   │   │   │   │   ├── rate-limiting.ts
│   │   │   │   │   ├── request-logging.ts
│   │   │   │   │   ├── security-headers.ts
│   │   │   │   │   └── security.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   ├── content.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── queue.ts
│   │   │   │   │   ├── scholar-result.ts
│   │   │   │   │   └── verification.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── algorithm-service.ts
│   │   │   │   │   ├── analysis-service.ts
│   │   │   │   │   ├── analytics-data-service.ts
│   │   │   │   │   ├── api-key-service.ts
│   │   │   │   │   ├── bug-system-analytics-service.ts
│   │   │   │   │   ├── content-fetcher.ts
│   │   │   │   │   ├── content-processing-orchestrator.ts
│   │   │   │   │   ├── content-processing-service.ts
│   │   │   │   │   ├── content-service.ts
│   │   │   │   │   ├── content-verification-service.ts
│   │   │   │   │   ├── copyright-detection-service.ts
│   │   │   │   │   ├── copyright-integration-service.ts
│   │   │   │   │   ├── edge-monitoring-service.ts
│   │   │   │   │   ├── example-service-registry.ts
│   │   │   │   │   ├── fallback-service.ts
│   │   │   │   │   ├── FeatureFlagService.ts
│   │   │   │   │   ├── long-polling-fallback.ts
│   │   │   │   │   ├── media-processing-service.ts
│   │   │   │   │   ├── monitoring-service.ts
│   │   │   │   │   ├── observability-service.ts
│   │   │   │   │   ├── origin-analysis-service.ts
│   │   │   │   │   ├── propagation-monitoring-service.ts
│   │   │   │   │   ├── propagation-visualization-service.ts
│   │   │   │   │   ├── queue-manager.ts
│   │   │   │   │   ├── queue-service.ts
│   │   │   │   │   ├── rate-limiter.ts
│   │   │   │   │   ├── real-time-server.ts
│   │   │   │   │   ├── report-export-service.ts
│   │   │   │   │   ├── report-generation-service.ts
│   │   │   │   │   ├── security-monitoring-service.ts
│   │   │   │   │   ├── source-fetcher.ts
│   │   │   │   │   ├── status-update-service.ts
│   │   │   │   │   ├── system-integration-service.ts
│   │   │   │   │   ├── url-content-fetcher.ts
│   │   │   │   │   ├── verification-integration-service.ts
│   │   │   │   │   ├── verification-result-service.ts
│   │   │   │   │   ├── webhook-service.ts
│   │   │   │   │   └── websocket-service.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── api.d.ts
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── common.ts
│   │   │   │   │   └── global.d.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── async-semaphore.ts
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   ├── logger.ts
│   │   │   │   │   ├── metrics.ts
│   │   │   │   │   ├── mutex.ts
│   │   │   │   │   ├── rate-limiter.ts
│   │   │   │   │   └── retry-helper.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── optimization.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── vite.ts
│   │   │   ├── jest.config.js
│   │   │   ├── observability-dependencies.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── shared/
│   │   │   ├── src/
│   │   │   │   ├── db/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   ├── base.ts
│   │   │   │   │   │   └── content.ts
│   │   │   │   │   └── schema.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── content-types.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── scan.ts
│   │   │   │   │   └── websocket.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── base-service.ts
│   │   │   │   │   ├── correlation-id.ts
│   │   │   │   │   ├── error-factory.ts
│   │   │   │   │   ├── error-logger.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── real-time-service.ts
│   │   │   │   │   └── service-registry.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── verification-service.ts
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── tsup.config.ts
│   │   ├── ui-library/
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── components.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── schema.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── cn.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── styles.ts
│   │   │   │   └── index.ts
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── tsup.config.ts
│   │   └── tsconfig.base.json
│   ├── public/
│   │   └── index.html
│   ├── scripts/
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── terraform/
│   │   ├── main.tf
│   │   └── variables.tf
│   ├── app.json
│   ├── bug-detection-report.json
│   ├── BUG-DETECTION-SUCCESS-SUMMARY.md
│   ├── bug-detection-summary.md
│   ├── cspell.json
│   ├── cypress.config.ts
│   ├── DEPENDENCY-REPORT.md
│   ├── deploy.sh
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Dockerfile.backend
│   ├── DOKKU_DEPLOYMENT.md
│   ├── drizzle.config.ts
│   ├── FINAL-BUG-DETECTION-REPORT.md
│   ├── fix-critical-bugs.cjs
│   ├── fix-syntax-errors.cjs
│   ├── generate-structure-to-file.sh
│   ├── generated-icon.png
│   ├── install-server-deps.sh
│   ├── jest.config.js
│   ├── MIGRATION-README.md
│   ├── monorepo-migration.ps1
│   ├── monorepo-migration.sh
│   ├── move-scripts.sh
│   ├── move-shared.sh
│   ├── package.json
│   ├── playwright.config.ts
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.js
│   ├── Procfile
│   ├── run-bug-detection.cjs
│   ├── run-bug-detection.ts
│   ├── simple-bug-detector.cjs
│   ├── simple-bug-detector.ts
│   ├── tailwind.config.ts
│   ├── theme.json
│   ├── tsconfig.base.json
│   ├── tsconfig.json
│   ├── types.d.ts
│   ├── vite.config.ts
│   └── vitest.config.ts
├── SimpleTool/
│   ├── @types/
│   │   ├── core/
│   │   │   ├── api.d.ts
│   │   │   ├── browser.d.ts
│   │   │   ├── dashboard.d.ts
│   │   │   ├── error.d.ts
│   │   │   ├── index.ts
│   │   │   ├── loading.d.ts
│   │   │   ├── mobile.d.ts
│   │   │   ├── performance.d.ts
│   │   │   └── storage.d.ts
│   │   ├── features/
│   │   │   ├── analytics.d.ts
│   │   │   ├── bills.d.ts
│   │   │   ├── index.ts
│   │   │   ├── search.d.ts
│   │   │   └── users.d.ts
│   │   ├── global/
│   │   │   ├── declarations.d.ts
│   │   │   ├── index.ts
│   │   │   └── shims.d.ts
│   │   ├── server/
│   │   │   ├── features.d.ts
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── core.d.ts
│   │   │   ├── database.d.ts
│   │   │   ├── design-system.d.ts
│   │   │   ├── index.ts
│   │   │   └── ui.d.ts
│   │   └── index.ts
│   ├── client/
│   │   ├── public/
│   │   │   ├── Chanuka_logo.png
│   │   │   ├── Chanuka_logo.svg
│   │   │   ├── Chanuka_logo.webp
│   │   │   ├── favicon.ico
│   │   │   ├── favicon.svg
│   │   │   ├── icon-144x144.png
│   │   │   ├── logo-192.png
│   │   │   ├── manifest.json
│   │   │   ├── manifest.webmanifest
│   │   │   ├── offline.html
│   │   │   ├── sw.js
│   │   │   └── symbol.svg
│   │   ├── reports/
│   │   │   ├── radix-analysis/
│   │   │   │   └── radix-bundle-analysis.json
│   │   │   ├── design-system-audit-report.json
│   │   │   └── design-system-audit-report.md
│   │   ├── scripts/
│   │   │   ├── contrast-check.js
│   │   │   ├── fix-button-variants.js
│   │   │   ├── fix-component-props.js
│   │   │   ├── fix-lucide-icons.js
│   │   │   ├── fix-unused-imports.js
│   │   │   ├── README.md
│   │   │   └── run-all-fixes.js
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── providers/
│   │   │   │   │   ├── AppProviders.tsx
│   │   │   │   │   └── queryClient.ts
│   │   │   │   └── shell/
│   │   │   │       ├── AppShell.tsx
│   │   │   │       ├── index.ts
│   │   │   │       ├── NavigationBar.tsx
│   │   │   │       └── SkipLinks.tsx
│   │   │   ├── core/
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── AnalyticsIntegration.tsx
│   │   │   │   │   ├── AnalyticsProvider.tsx
│   │   │   │   │   ├── comprehensive-tracker.ts
│   │   │   │   │   ├── data-retention-service.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── api/
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── circuit-breaker-usage.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── use-api-with-fallback.ts
│   │   │   │   │   │   ├── use-safe-mutation.ts
│   │   │   │   │   │   ├── use-safe-query.ts
│   │   │   │   │   │   ├── useApiConnection.ts
│   │   │   │   │   │   ├── useConnectionAware.tsx
│   │   │   │   │   │   └── useServiceStatus.ts
│   │   │   │   │   ├── types/
│   │   │   │   │   │   ├── auth.ts
│   │   │   │   │   │   ├── bill.ts
│   │   │   │   │   │   ├── cache.ts
│   │   │   │   │   │   ├── common.ts
│   │   │   │   │   │   ├── community.ts
│   │   │   │   │   │   ├── config.ts
│   │   │   │   │   │   ├── engagement.ts
│   │   │   │   │   │   ├── error-response.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── performance.ts
│   │   │   │   │   │   ├── preferences.ts
│   │   │   │   │   │   ├── request.ts
│   │   │   │   │   │   ├── service.ts
│   │   │   │   │   │   └── sponsor.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── authenticated-client.ts
│   │   │   │   │   ├── authentication.ts
│   │   │   │   │   ├── base-client.ts
│   │   │   │   │   ├── bills.ts
│   │   │   │   │   ├── cache-manager.ts
│   │   │   │   │   ├── circuit-breaker-client.ts
│   │   │   │   │   ├── circuit-breaker-monitor.ts
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── community.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   ├── notifications.ts
│   │   │   │   │   ├── performance.ts
│   │   │   │   │   ├── privacy.ts
│   │   │   │   │   ├── registry.ts
│   │   │   │   │   ├── retry-handler.ts
│   │   │   │   │   ├── retry.ts
│   │   │   │   │   ├── safe-client.ts
│   │   │   │   │   ├── search.ts
│   │   │   │   │   ├── system.ts
│   │   │   │   │   ├── user.ts
│   │   │   │   │   └── WEBSOCKET_API_README.md
│   │   │   │   ├── auth/
│   │   │   │   │   ├── config/
│   │   │   │   │   │   ├── auth-config.ts
│   │   │   │   │   │   └── auth-init.ts
│   │   │   │   │   ├── constants/
│   │   │   │   │   │   └── auth-constants.ts
│   │   │   │   │   ├── errors/
│   │   │   │   │   │   └── auth-errors.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useAuth.tsx
│   │   │   │   │   ├── http/
│   │   │   │   │   │   ├── authenticated-client.ts
│   │   │   │   │   │   └── authentication-interceptors.ts
│   │   │   │   │   ├── scripts/
│   │   │   │   │   │   ├── cleanup-old-auth.ts
│   │   │   │   │   │   ├── init-auth-system.ts
│   │   │   │   │   │   └── migration-helper.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── auth-api-service.ts
│   │   │   │   │   │   ├── session-manager.ts
│   │   │   │   │   │   └── token-manager.ts
│   │   │   │   │   ├── store/
│   │   │   │   │   │   ├── auth-middleware.ts
│   │   │   │   │   │   └── auth-slice.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── permission-helpers.ts
│   │   │   │   │   │   ├── security-helpers.ts
│   │   │   │   │   │   ├── storage-helpers.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── initialization.ts
│   │   │   │   │   ├── rbac.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── service.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── browser/
│   │   │   │   │   ├── browser-detector.ts
│   │   │   │   │   ├── BrowserCompatibilityChecker.tsx
│   │   │   │   │   ├── BrowserCompatibilityReport.tsx
│   │   │   │   │   ├── BrowserCompatibilityTester.tsx
│   │   │   │   │   ├── compatibility-manager.ts
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── environment.ts
│   │   │   │   │   ├── feature-detector.ts
│   │   │   │   │   ├── FeatureFallbacks.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── polyfill-manager.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── useBrowserStatus.tsx
│   │   │   │   ├── command-palette/
│   │   │   │   │   ├── CommandPalette.test.tsx
│   │   │   │   │   ├── CommandPalette.tsx
│   │   │   │   │   ├── commands.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── useCommandPalette.ts
│   │   │   │   ├── community/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useRealtime.ts
│   │   │   │   │   │   ├── useUnifiedCommunity.ts
│   │   │   │   │   │   └── useUnifiedDiscussion.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── moderation.service.ts
│   │   │   │   │   │   ├── state-sync.service.ts
│   │   │   │   │   │   └── websocket-manager.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── context.tsx
│   │   │   │   │   ├── hooks.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── reducer.ts
│   │   │   │   │   ├── utils.ts
│   │   │   │   │   └── widgets.ts
│   │   │   │   ├── error/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   ├── contextual-messages.ts
│   │   │   │   │   │   │   ├── error-icons.tsx
│   │   │   │   │   │   │   ├── error-normalizer.ts
│   │   │   │   │   │   │   ├── error-reporter.ts
│   │   │   │   │   │   │   └── shared-error-display.tsx
│   │   │   │   │   │   ├── CommunityErrorBoundary.tsx
│   │   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   │   ├── ErrorFallback.tsx
│   │   │   │   │   │   ├── ErrorRecoveryManager.tsx
│   │   │   │   │   │   ├── example.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── RecoveryUI.tsx
│   │   │   │   │   │   ├── ServiceUnavailable.tsx
│   │   │   │   │   │   ├── SimpleErrorBoundary.tsx
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── UnifiedErrorBoundary.tsx
│   │   │   │   │   ├── messages/
│   │   │   │   │   │   ├── error-message-formatter.ts
│   │   │   │   │   │   ├── error-recovery-suggestions.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   └── use-error-messages.ts
│   │   │   │   │   ├── middleware/
│   │   │   │   │   │   ├── hooks-middleware.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── library-middleware.ts
│   │   │   │   │   │   ├── security-middleware.ts
│   │   │   │   │   │   └── service-middleware.ts
│   │   │   │   │   ├── reporters/
│   │   │   │   │   │   ├── ApiReporter.ts
│   │   │   │   │   │   ├── CompositeReporter.ts
│   │   │   │   │   │   ├── ConsoleReporter.ts
│   │   │   │   │   │   └── SentryReporter.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── classes.ts
│   │   │   │   │   ├── constants.ts
│   │   │   │   │   ├── dashboard-errors.ts
│   │   │   │   │   ├── factory.ts
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitoring.tsx
│   │   │   │   │   ├── rate-limiter.ts
│   │   │   │   │   ├── recovery.ts
│   │   │   │   │   ├── reporting.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── loading/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── LoadingProgress.tsx
│   │   │   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   │   │   └── LoadingSpinner.tsx
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useOnlineStatus.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   ├── context.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── reducer.ts
│   │   │   │   │   ├── utils.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── mobile/
│   │   │   │   │   ├── device-detector.ts
│   │   │   │   │   ├── error-handler.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── performance-optimizer.ts
│   │   │   │   │   ├── responsive-utils.ts
│   │   │   │   │   └── touch-handler.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitoring-init.ts
│   │   │   │   │   └── sentry-config.ts
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── use-navigation-accessibility.ts
│   │   │   │   │   │   ├── use-navigation-performance.ts
│   │   │   │   │   │   ├── use-navigation-preferences.tsx
│   │   │   │   │   │   └── use-unified-navigation.ts
│   │   │   │   │   ├── access-control.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── breadcrumbs.ts
│   │   │   │   │   ├── context.tsx
│   │   │   │   │   ├── hooks.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── lookup.ts
│   │   │   │   │   ├── navigation-service.ts
│   │   │   │   │   ├── navigation-wrapper.ts
│   │   │   │   │   ├── NavigationConsistency.test.tsx
│   │   │   │   │   ├── NavigationConsistency.tsx
│   │   │   │   │   ├── NavigationPerformance.test.tsx
│   │   │   │   │   ├── NavigationPerformance.tsx
│   │   │   │   │   ├── page-relationship-service.ts
│   │   │   │   │   ├── persistence.ts
│   │   │   │   │   ├── preferences.ts
│   │   │   │   │   ├── search.ts
│   │   │   │   │   ├── test-navigation.ts
│   │   │   │   │   ├── utils.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── performance/
│   │   │   │   │   ├── alerts.ts
│   │   │   │   │   ├── architecture-performance-monitor.ts
│   │   │   │   │   ├── budgets.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitor.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── web-vitals.ts
│   │   │   │   ├── personalization/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── persona-detector.test.tsx
│   │   │   │   │   └── persona-detector.ts
│   │   │   │   ├── realtime/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── use-bill-tracking.ts
│   │   │   │   │   │   ├── use-community-realtime.ts
│   │   │   │   │   │   ├── use-realtime-engagement-legacy.ts
│   │   │   │   │   │   └── use-websocket.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── bill-tracking.ts
│   │   │   │   │   │   ├── community.ts
│   │   │   │   │   │   ├── notifications.ts
│   │   │   │   │   │   └── realtime-service.ts
│   │   │   │   │   ├── types/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   └── event-emitter.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── hub.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── manager.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── websocket-client.ts
│   │   │   │   ├── recovery/
│   │   │   │   │   ├── dashboard-recovery.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── search/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── search-strategy-selector.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   ├── UnifiedSearchInterface.test.tsx
│   │   │   │   │   └── UnifiedSearchInterface.tsx
│   │   │   │   ├── security/
│   │   │   │   │   ├── config/
│   │   │   │   │   │   └── security-config.ts
│   │   │   │   │   ├── headers/
│   │   │   │   │   │   └── SecurityHeaders.ts
│   │   │   │   │   ├── migration/
│   │   │   │   │   │   ├── compatibility-layer.ts
│   │   │   │   │   │   └── migration-utils.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   │   │   └── SecuritySettings.tsx
│   │   │   │   │   │   ├── privacy/
│   │   │   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   │   │   └── README.md
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── unified/
│   │   │   │   │   │   ├── csp-config.ts
│   │   │   │   │   │   ├── csp-manager.ts
│   │   │   │   │   │   ├── error-handler.ts
│   │   │   │   │   │   ├── error-middleware.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── input-sanitizer.ts
│   │   │   │   │   │   └── security-interface.ts
│   │   │   │   │   ├── csp-manager.ts
│   │   │   │   │   ├── csp-nonce.ts
│   │   │   │   │   ├── csrf-protection.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input-sanitizer.ts
│   │   │   │   │   ├── rate-limiter.ts
│   │   │   │   │   ├── security-monitor.ts
│   │   │   │   │   ├── security-monitoring.ts
│   │   │   │   │   ├── security-service.ts
│   │   │   │   │   ├── security-utils.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── vulnerability-scanner.ts
│   │   │   │   ├── storage/
│   │   │   │   │   ├── cache-storage.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── offline-data-manager.ts
│   │   │   │   │   ├── secure-storage.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── validation/
│   │   │   │   │   ├── dashboard-validation.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── CONSOLIDATION_SUMMARY.md
│   │   │   │   ├── core-monitoring.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── MIGRATION_GUIDE.md
│   │   │   │   └── test-consolidated-realtime.ts
│   │   │   ├── features/
│   │   │   │   ├── accountability/
│   │   │   │   │   └── ShadowLedgerDashboard.ts
│   │   │   │   ├── admin/
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── admin.tsx
│   │   │   │   │   │   ├── AnalyticsDashboardPage.tsx
│   │   │   │   │   │   ├── database-manager.tsx
│   │   │   │   │   │   └── integration-status.tsx
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── migration/
│   │   │   │   │   │   │   └── MigrationManager.tsx
│   │   │   │   │   │   ├── admin-dashboard.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── useConflictAnalysis.ts
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── conflict-detection.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── types/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   │   ├── AnalysisDashboard.tsx
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── use-comprehensive-analytics.ts
│   │   │   │   │   │   ├── use-journey-tracker.ts
│   │   │   │   │   │   ├── use-render-tracker.ts
│   │   │   │   │   │   ├── use-web-vitals.ts
│   │   │   │   │   │   ├── useAnalytics.ts
│   │   │   │   │   │   └── useErrorAnalytics.ts
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── error-analytics-bridge.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── offline-analytics.ts
│   │   │   │   │   │   ├── privacy-analytics.ts
│   │   │   │   │   │   └── user-journey-tracker.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── analysis.ts
│   │   │   │   │   │   ├── analytics.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   │   │   │   └── EngagementAnalyticsDashboard.tsx
│   │   │   │   │   │   ├── metrics/
│   │   │   │   │   │   │   └── CivicScoreCard.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── auth/
│   │   │   │   │   └── pages/
│   │   │   │   │       ├── auth-page.tsx
│   │   │   │   │       ├── ForgotPasswordPage.tsx
│   │   │   │   │       ├── LoginPage.tsx
│   │   │   │   │       ├── PrivacyPage.tsx
│   │   │   │   │       ├── RegisterPage.tsx
│   │   │   │   │       ├── ResetPasswordPage.tsx
│   │   │   │   │       └── SecurityPage.tsx
│   │   │   │   ├── bills/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   └── types.ts
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── bill-analysis.tsx
│   │   │   │   │   │   ├── bill-detail.tsx
│   │   │   │   │   │   ├── bill-sponsorship-analysis.tsx
│   │   │   │   │   │   ├── bills-dashboard-page.tsx
│   │   │   │   │   │   └── BillsPortalPage.tsx
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── cache.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── pagination.ts
│   │   │   │   │   │   └── tracking.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── analysis/
│   │   │   │   │   │   │   ├── conflict-of-interest/
│   │   │   │   │   │   │   ├── BillAnalysis.tsx
│   │   │   │   │   │   │   ├── BillAnalysisTab.tsx
│   │   │   │   │   │   │   ├── comments.tsx
│   │   │   │   │   │   │   ├── ConstitutionalAnalysisPanel.tsx
│   │   │   │   │   │   │   ├── section.tsx
│   │   │   │   │   │   │   ├── stats.tsx
│   │   │   │   │   │   │   └── timeline.tsx
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── detail/
│   │   │   │   │   │   │   ├── BillActionsPanel.tsx
│   │   │   │   │   │   │   ├── BillCommunityTab.tsx
│   │   │   │   │   │   │   ├── BillFullTextTab.tsx
│   │   │   │   │   │   │   ├── BillHeader.tsx
│   │   │   │   │   │   │   ├── BillOverviewTab.tsx
│   │   │   │   │   │   │   ├── BillRelationshipsTab.tsx
│   │   │   │   │   │   │   ├── BillSponsorsTab.tsx
│   │   │   │   │   │   │   └── BillTimelineTab.tsx
│   │   │   │   │   │   ├── education/
│   │   │   │   │   │   │   └── README.md
│   │   │   │   │   │   ├── implementation/
│   │   │   │   │   │   │   └── workarounds.tsx
│   │   │   │   │   │   ├── list/
│   │   │   │   │   │   │   └── BillCard.tsx
│   │   │   │   │   │   ├── tracking/
│   │   │   │   │   │   │   └── real-time-tracker.tsx
│   │   │   │   │   │   ├── transparency/
│   │   │   │   │   │   │   └── ConflictAnalysisDashboard.tsx
│   │   │   │   │   │   ├── bill-list.tsx
│   │   │   │   │   │   ├── bill-tracking.tsx
│   │   │   │   │   │   ├── BillRealTimeIndicator.tsx
│   │   │   │   │   │   ├── bills-dashboard.tsx
│   │   │   │   │   │   ├── filter-panel.tsx
│   │   │   │   │   │   ├── implementation-workarounds.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── MobileBillDetail.tsx
│   │   │   │   │   │   ├── stats-overview.tsx
│   │   │   │   │   │   └── virtual-bill-grid.tsx
│   │   │   │   │   ├── BillAnalysis.tsx
│   │   │   │   │   ├── BillCard.tsx
│   │   │   │   │   ├── BillHeader.tsx
│   │   │   │   │   ├── BillList.tsx
│   │   │   │   │   ├── hooks.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── services.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── community/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useCommunity.ts
│   │   │   │   │   │   ├── useCommunityIntegration.ts
│   │   │   │   │   │   └── useDiscussion.ts
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── comments.tsx
│   │   │   │   │   │   └── community-input.tsx
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── backend.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── store/
│   │   │   │   │   │   └── slices/
│   │   │   │   │   │       └── communitySlice.tsx
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── activity/
│   │   │   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   │   │   └── CommunityStats.tsx
│   │   │   │   │   │   ├── discussion/
│   │   │   │   │   │   │   ├── CommentForm.tsx
│   │   │   │   │   │   │   ├── CommentItem.tsx
│   │   │   │   │   │   │   └── DiscussionThread.tsx
│   │   │   │   │   │   ├── expert/
│   │   │   │   │   │   │   └── ExpertInsights.tsx
│   │   │   │   │   │   ├── hub/
│   │   │   │   │   │   │   └── CommunityHub.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── dashboard.tsx
│   │   │   │   ├── design-system/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── design-system-test.tsx
│   │   │   │   ├── expert/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── expert-verification.tsx
│   │   │   │   ├── home/
│   │   │   │   │   └── pages/
│   │   │   │   │       ├── home.tsx
│   │   │   │   │       └── StrategicHomePage.tsx
│   │   │   │   ├── legal/
│   │   │   │   │   └── pages/
│   │   │   │   │       ├── acceptable-use.tsx
│   │   │   │   │       ├── accessibility.tsx
│   │   │   │   │       ├── compliance-ccpa.tsx
│   │   │   │   │       ├── contact-legal.tsx
│   │   │   │   │       ├── cookie-policy.tsx
│   │   │   │   │       ├── data-retention.tsx
│   │   │   │   │       ├── dmca.tsx
│   │   │   │   │       ├── privacy.tsx
│   │   │   │   │       ├── security.tsx
│   │   │   │   │       └── terms.tsx
│   │   │   │   ├── market/
│   │   │   │   │   └── SokoHaki.tsx
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── continuous-performance-monitor.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── performance-benchmarking.ts
│   │   │   │   │   │   ├── performance-regression-tester.ts
│   │   │   │   │   │   ├── render-tracker.ts
│   │   │   │   │   │   ├── render-tracking-integration.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── navigation/
│   │   │   │   │   └── model/
│   │   │   │   │       └── index.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── notification-service.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── onboarding/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── onboarding.tsx
│   │   │   │   ├── pretext-detection/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── usePretextAnalysis.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   └── PretextAnalysisService.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── CivicActionToolbox.tsx
│   │   │   │   │   │   ├── PretextDetectionPanel.tsx
│   │   │   │   │   │   └── PretextWatchCard.tsx
│   │   │   │   │   ├── demo.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── types.ts
│   │   │   │   ├── privacy/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── privacy-center.tsx
│   │   │   │   ├── realtime/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── realtime-optimizer.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── search/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useIntelligentSearch.ts
│   │   │   │   │   │   ├── useSearch.ts
│   │   │   │   │   │   └── useStreamingSearch.ts
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   └── UniversalSearchPage.tsx
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── intelligent-search.ts
│   │   │   │   │   │   ├── search-api.ts
│   │   │   │   │   │   └── streaming-search.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── filters/
│   │   │   │   │   │   │   └── SearchFilters.tsx
│   │   │   │   │   │   ├── interface/
│   │   │   │   │   │   │   ├── AdvancedSearch.tsx
│   │   │   │   │   │   │   ├── IntelligentAutocomplete.tsx
│   │   │   │   │   │   │   ├── SavedSearches.tsx
│   │   │   │   │   │   │   ├── SearchAnalyticsDashboard.tsx
│   │   │   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   │   │   ├── SearchProgressIndicator.tsx
│   │   │   │   │   │   │   └── SearchTips.tsx
│   │   │   │   │   │   ├── results/
│   │   │   │   │   │   │   ├── SearchResultCard.tsx
│   │   │   │   │   │   │   └── SearchResults.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── security/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useSecurity.ts
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   └── SecurityDemoPage.tsx
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   │   ├── SecureForm.tsx
│   │   │   │   │   │   │   ├── SecurityDashboard.tsx
│   │   │   │   │   │   │   └── SecuritySettings.tsx
│   │   │   │   │   │   ├── privacy/
│   │   │   │   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   │   │   │   ├── DataUsageReportDashboard.tsx
│   │   │   │   │   │   │   ├── GDPRComplianceManager.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── privacy-policy.tsx
│   │   │   │   │   │   │   └── README.md
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── sponsorship/
│   │   │   │   │   └── pages/
│   │   │   │   │       ├── co-sponsors.tsx
│   │   │   │   │       ├── financial-network.tsx
│   │   │   │   │       ├── methodology.tsx
│   │   │   │   │       ├── overview.tsx
│   │   │   │   │       └── primary-sponsor.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useAuth.tsx
│   │   │   │   │   │   ├── useOnboarding.ts
│   │   │   │   │   │   ├── usePasswordUtils.ts
│   │   │   │   │   │   ├── useUserAPI.ts
│   │   │   │   │   │   └── useUsers.ts
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── user-service.ts
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── UserAccountPage.tsx
│   │   │   │   │   │   └── UserProfilePage.tsx
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── achievements-service.ts
│   │   │   │   │   │   ├── auth-service.ts
│   │   │   │   │   │   ├── dashboard-service.ts
│   │   │   │   │   │   ├── engagement-service.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── onboarding-service.ts
│   │   │   │   │   │   ├── profile-service.ts
│   │   │   │   │   │   ├── user-api.ts
│   │   │   │   │   │   └── user-service-legacy.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── auth/
│   │   │   │   │   │   │   ├── AuthAlert.tsx
│   │   │   │   │   │   │   ├── AuthButton.tsx
│   │   │   │   │   │   │   ├── AuthInput.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── useLoginForm.ts
│   │   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   │   └── UserJourneyOptimizer.tsx
│   │   │   │   │   │   ├── profile/
│   │   │   │   │   │   │   └── UserProfileSection.tsx
│   │   │   │   │   │   ├── settings/
│   │   │   │   │   │   │   └── alert-preferences.tsx
│   │   │   │   │   │   ├── verification/
│   │   │   │   │   │   │   ├── CommunityValidation.tsx
│   │   │   │   │   │   │   ├── CredibilityScoring.tsx
│   │   │   │   │   │   │   ├── ExpertBadge.tsx
│   │   │   │   │   │   │   ├── ExpertConsensus.tsx
│   │   │   │   │   │   │   ├── ExpertProfileCard.tsx
│   │   │   │   │   │   │   ├── ExpertVerificationDemo.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   │   ├── verification-list.tsx
│   │   │   │   │   │   │   └── VerificationWorkflow.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   └── index.ts
│   │   │   ├── scripts/
│   │   │   │   ├── analyze-bundle.ts
│   │   │   │   ├── consolidate-websocket-migration.ts
│   │   │   │   ├── fsd-migration.ts
│   │   │   │   ├── migrate-components.ts
│   │   │   │   ├── performance-audit.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── run-emergency-triage.ts
│   │   │   │   ├── validate-home-page.ts
│   │   │   │   ├── validate-migration.ts
│   │   │   │   └── validate-websocket-consolidation.ts
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── home/
│   │   │   │   │   │   ├── PersonalizedDashboardPreview.tsx
│   │   │   │   │   │   ├── PlatformStats.tsx
│   │   │   │   │   │   └── RecentActivity.tsx
│   │   │   │   │   └── performance/
│   │   │   │   │       └── PerformanceMonitor.tsx
│   │   │   │   ├── config/
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── development.ts
│   │   │   │   │   ├── feature-flags.ts
│   │   │   │   │   ├── gestures.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration.ts
│   │   │   │   │   ├── mobile.ts
│   │   │   │   │   ├── navigation.ts
│   │   │   │   │   └── onboarding.ts
│   │   │   │   ├── constants/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── content/
│   │   │   │   │   └── copy-system.ts
│   │   │   │   ├── context/
│   │   │   │   │   └── KenyanContextProvider.tsx
│   │   │   │   ├── contexts/
│   │   │   │   │   ├── context/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── NavigationContext.tsx
│   │   │   │   │   └── ThemeContext.tsx
│   │   │   │   ├── data/
│   │   │   │   │   └── mock/
│   │   │   │   │       ├── analytics.ts
│   │   │   │   │       ├── bills.ts
│   │   │   │   │       ├── community.ts
│   │   │   │   │       ├── discussions.ts
│   │   │   │   │       ├── experts.ts
│   │   │   │   │       ├── generators.ts
│   │   │   │   │       ├── index.ts
│   │   │   │   │       ├── loaders.ts
│   │   │   │   │       ├── realtime.ts
│   │   │   │   │       └── users.ts
│   │   │   │   ├── demo/
│   │   │   │   │   └── community-integration-demo.ts
│   │   │   │   ├── design-system/
│   │   │   │   │   ├── accessibility/
│   │   │   │   │   │   ├── contrast.ts
│   │   │   │   │   │   ├── focus.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── motion.ts
│   │   │   │   │   │   ├── touch.ts
│   │   │   │   │   │   └── typography.ts
│   │   │   │   │   ├── contexts/
│   │   │   │   │   │   ├── BrandVoiceProvider.tsx
│   │   │   │   │   │   ├── index.tsx
│   │   │   │   │   │   ├── LowBandwidthProvider.tsx
│   │   │   │   │   │   └── MultilingualProvider.tsx
│   │   │   │   │   ├── feedback/
│   │   │   │   │   │   ├── Alert.tsx
│   │   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   │   ├── Progress.tsx
│   │   │   │   │   │   ├── separator.tsx
│   │   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   │   ├── table.tsx
│   │   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   │   ├── Toaster.tsx
│   │   │   │   │   │   └── Tooltip.tsx
│   │   │   │   │   ├── interactive/
│   │   │   │   │   │   ├── Button.tsx
│   │   │   │   │   │   ├── Calendar.tsx
│   │   │   │   │   │   ├── Checkbox.tsx
│   │   │   │   │   │   ├── Collapsible.tsx
│   │   │   │   │   │   ├── Command.tsx
│   │   │   │   │   │   ├── ContextMenu.tsx
│   │   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   │   ├── DropdownMenu.tsx
│   │   │   │   │   │   ├── errors.ts
│   │   │   │   │   │   ├── form.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── Input.tsx
│   │   │   │   │   │   ├── NavigationMenu.tsx
│   │   │   │   │   │   ├── Popover.tsx
│   │   │   │   │   │   ├── recovery.ts
│   │   │   │   │   │   ├── scroll-area.tsx
│   │   │   │   │   │   ├── Select.tsx
│   │   │   │   │   │   ├── separator.tsx
│   │   │   │   │   │   ├── Sheet.tsx
│   │   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   │   ├── skeleton.tsx
│   │   │   │   │   │   ├── Switch.tsx
│   │   │   │   │   │   ├── Tabs.tsx
│   │   │   │   │   │   ├── Textarea.tsx
│   │   │   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   │   │   ├── tooltip.tsx
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── lib/
│   │   │   │   │   │   └── utils.ts
│   │   │   │   │   ├── media/
│   │   │   │   │   │   ├── Avatar.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── Logo.tsx
│   │   │   │   │   │   └── OptimizedImage.tsx
│   │   │   │   │   ├── standards/
│   │   │   │   │   │   ├── brand-personality.ts
│   │   │   │   │   │   ├── button.ts
│   │   │   │   │   │   ├── card.ts
│   │   │   │   │   │   ├── empty-states.ts
│   │   │   │   │   │   ├── error-states.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── input.ts
│   │   │   │   │   │   ├── interactive-states.ts
│   │   │   │   │   │   ├── loading-states.ts
│   │   │   │   │   │   ├── low-bandwidth.ts
│   │   │   │   │   │   ├── multilingual-support.ts
│   │   │   │   │   │   ├── political-neutrality.ts
│   │   │   │   │   │   └── typography.ts
│   │   │   │   │   ├── styles/
│   │   │   │   │   │   ├── base/
│   │   │   │   │   │   │   ├── base.css
│   │   │   │   │   │   │   └── variables.css
│   │   │   │   │   │   ├── responsive/
│   │   │   │   │   │   │   ├── desktop.css
│   │   │   │   │   │   │   ├── mobile.css
│   │   │   │   │   │   │   ├── special.css
│   │   │   │   │   │   │   └── tablet.css
│   │   │   │   │   │   ├── utilities/
│   │   │   │   │   │   │   ├── accessibility.css
│   │   │   │   │   │   │   └── animations.css
│   │   │   │   │   │   ├── accessibility.css
│   │   │   │   │   │   ├── chanuka-design-system.css
│   │   │   │   │   │   ├── design-tokens.css
│   │   │   │   │   │   ├── fallbacks.css
│   │   │   │   │   │   ├── generated-tokens.css
│   │   │   │   │   │   ├── globals.css
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── STYLE_GUIDE.md
│   │   │   │   │   ├── themes/
│   │   │   │   │   │   ├── dark.ts
│   │   │   │   │   │   ├── high-contrast.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── light.ts
│   │   │   │   │   │   └── themeProvider.ts
│   │   │   │   │   ├── tokens/
│   │   │   │   │   │   ├── animations.ts
│   │   │   │   │   │   ├── borders.ts
│   │   │   │   │   │   ├── breakpoints.ts
│   │   │   │   │   │   ├── colors.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── shadows.ts
│   │   │   │   │   │   ├── spacing.ts
│   │   │   │   │   │   ├── theme.ts
│   │   │   │   │   │   ├── typography.ts
│   │   │   │   │   │   ├── unified-export.ts
│   │   │   │   │   │   ├── unified.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── types/
│   │   │   │   │   │   └── component-types.ts
│   │   │   │   │   ├── typography/
│   │   │   │   │   │   ├── Card.tsx
│   │   │   │   │   │   ├── heading.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── Label.tsx
│   │   │   │   │   │   └── text.tsx
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── cn.ts
│   │   │   │   │   │   ├── contrast.ts
│   │   │   │   │   │   ├── errors.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── performance.ts
│   │   │   │   │   │   ├── recovery.ts
│   │   │   │   │   │   ├── responsive.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── 4-personas-charter.ts.txt
│   │   │   │   │   ├── 4-personas-implementation-guide.ts
│   │   │   │   │   ├── COMPLETION_REPORT.ts
│   │   │   │   │   ├── COMPONENT_FLATTENING_EXECUTION_REPORT.ts
│   │   │   │   │   ├── COMPONENT_FLATTENING_STRATEGY.ts
│   │   │   │   │   ├── DIRECTORY_VALIDATION_FRAMEWORK.ts
│   │   │   │   │   ├── IMPLEMENTATION_GUIDE.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── INTEGRATION_COMPLETE.md
│   │   │   │   │   ├── integration.ts
│   │   │   │   │   ├── MIGRATION_SUMMARY.ts
│   │   │   │   │   ├── quality.ts
│   │   │   │   │   ├── QUICK_START.md
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── REFINEMENT_STRATEGY.ts
│   │   │   │   │   ├── responsive.css
│   │   │   │   │   ├── responsive.ts
│   │   │   │   │   └── strategy.ts
│   │   │   │   ├── examples/
│   │   │   │   │   ├── render-tracking-usage.tsx
│   │   │   │   │   └── WebSocketIntegrationExample.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── mobile/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── useBottomSheet.ts
│   │   │   │   │   │   ├── useDeviceInfo.ts
│   │   │   │   │   │   ├── useInfiniteScroll.ts
│   │   │   │   │   │   ├── useMobileNavigation.ts
│   │   │   │   │   │   ├── useMobileTabs.ts
│   │   │   │   │   │   ├── usePullToRefresh.ts
│   │   │   │   │   │   ├── useScrollManager.ts
│   │   │   │   │   │   └── useSwipeGesture.ts
│   │   │   │   │   ├── patterns/
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── error-handling.ts
│   │   │   │   │   │   ├── migration-compatibility.ts
│   │   │   │   │   │   └── performance.ts
│   │   │   │   │   ├── BACKWARD_COMPATIBILITY_PLAN.md
│   │   │   │   │   ├── ERROR_HANDLING_UNIFICATION.md
│   │   │   │   │   ├── HOOKS_ARCHITECTURE_MIGRATION_PLAN.md
│   │   │   │   │   ├── hooks-monitoring.ts
│   │   │   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   │   │   ├── IMPLEMENTATION_ROADMAP.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── STANDARDIZATION_GUIDELINES.md
│   │   │   │   │   ├── store.ts
│   │   │   │   │   ├── TESTING_STRATEGY.md
│   │   │   │   │   ├── use-architecture-performance.ts
│   │   │   │   │   ├── use-cleanup.ts
│   │   │   │   │   ├── use-i18n.tsx
│   │   │   │   │   ├── use-keyboard-focus.ts
│   │   │   │   │   ├── use-mobile.ts
│   │   │   │   │   ├── use-mobile.tsx
│   │   │   │   │   ├── use-offline-detection.ts
│   │   │   │   │   ├── use-performance-monitor.ts
│   │   │   │   │   ├── use-safe-query.ts
│   │   │   │   │   ├── use-system.ts
│   │   │   │   │   ├── use-system.tsx
│   │   │   │   │   ├── use-toast.ts
│   │   │   │   │   ├── useCleanup.tsx
│   │   │   │   │   ├── useDatabaseStatus.ts
│   │   │   │   │   ├── useDebounce.ts
│   │   │   │   │   ├── useErrorRecovery.ts
│   │   │   │   │   ├── useIntegratedServices.ts
│   │   │   │   │   ├── useMediaQuery.ts
│   │   │   │   │   ├── useMockData.ts
│   │   │   │   │   ├── useNavigationSlice.ts
│   │   │   │   │   ├── useNotifications.ts
│   │   │   │   │   ├── useOfflineCapabilities.ts
│   │   │   │   │   ├── useOfflineDetection.tsx
│   │   │   │   │   ├── useProgressiveDisclosure.ts
│   │   │   │   │   ├── useSafeEffect.ts
│   │   │   │   │   ├── useSeamlessIntegration.ts
│   │   │   │   │   └── useService.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── asset-loading/
│   │   │   │   │   │   ├── AssetLoadingProvider.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── cache/
│   │   │   │   │   │   ├── cache-invalidation.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   ├── event-bus.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── http/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── request-deduplicator.ts
│   │   │   │   │   ├── monitoring/
│   │   │   │   │   │   ├── cross-system-error-analytics.ts
│   │   │   │   │   │   ├── development-dashboard.tsx
│   │   │   │   │   │   ├── error-aggregation-service.ts
│   │   │   │   │   │   ├── error-monitor.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── monitoring-integration.ts
│   │   │   │   │   │   ├── performance-impact-monitor.ts
│   │   │   │   │   │   ├── performance-monitor.ts
│   │   │   │   │   │   ├── trend-analysis-service.ts
│   │   │   │   │   │   └── unified-error-monitoring-interface.ts
│   │   │   │   │   ├── store/
│   │   │   │   │   │   ├── middleware/
│   │   │   │   │   │   │   ├── apiMiddleware.ts
│   │   │   │   │   │   │   ├── authMiddleware.ts
│   │   │   │   │   │   │   ├── errorHandlingMiddleware.ts
│   │   │   │   │   │   │   ├── navigationPersistenceMiddleware.ts
│   │   │   │   │   │   │   └── webSocketMiddleware.ts
│   │   │   │   │   │   ├── slices/
│   │   │   │   │   │   │   ├── discussionSlice.ts
│   │   │   │   │   │   │   ├── errorAnalyticsSlice.ts
│   │   │   │   │   │   │   ├── errorHandlingSlice.ts
│   │   │   │   │   │   │   ├── loadingSlice.ts
│   │   │   │   │   │   │   ├── navigationSlice.ts
│   │   │   │   │   │   │   ├── realTimeSlice.ts
│   │   │   │   │   │   │   ├── sessionSlice.ts
│   │   │   │   │   │   │   ├── uiSlice.ts
│   │   │   │   │   │   │   └── userDashboardSlice.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── store-types.ts
│   │   │   │   │   ├── sync/
│   │   │   │   │   │   ├── background-sync-manager.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── system/
│   │   │   │   │   │   ├── HealthCheck.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── workers/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── service-worker.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-validator.ts
│   │   │   │   │   └── quality-optimizer.ts
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── unified-interfaces.ts
│   │   │   │   ├── lib/
│   │   │   │   │   ├── migration/
│   │   │   │   │   │   └── compatibility-layer.ts
│   │   │   │   │   ├── query-client/
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   └── query-client.service.ts
│   │   │   │   │   │   ├── types/
│   │   │   │   │   │   │   └── query-client.types.ts
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   └── query-client-utils.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── common/
│   │   │   │   │   │   │   ├── common-utils.ts
│   │   │   │   │   │   │   └── validation-utils.ts
│   │   │   │   │   │   ├── formatters/
│   │   │   │   │   │   │   └── formatters.ts
│   │   │   │   │   │   ├── helpers/
│   │   │   │   │   │   │   └── helpers.ts
│   │   │   │   │   │   ├── validators/
│   │   │   │   │   │   │   └── validators.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── logger.ts
│   │   │   │   │   ├── validation/
│   │   │   │   │   │   ├── schemas/
│   │   │   │   │   │   │   ├── bill-schemas.ts
│   │   │   │   │   │   │   ├── form-schemas.ts
│   │   │   │   │   │   │   └── user-schemas.ts
│   │   │   │   │   │   ├── types/
│   │   │   │   │   │   │   └── validation.types.ts
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   └── validation-utils.ts
│   │   │   │   │   │   ├── fsd-validation.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── FSD_BEST_PRACTICES.md
│   │   │   │   │   ├── FSD_MIGRATION_COMPLETE.md
│   │   │   │   │   ├── FSD_MIGRATION_GUIDE.md
│   │   │   │   │   ├── FSD_MIGRATION_IMPLEMENTATION_PLAN.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── queryClient.ts
│   │   │   │   │   ├── react-query-config.ts
│   │   │   │   │   ├── utils.ts
│   │   │   │   │   ├── validation-schemas.test.ts
│   │   │   │   │   └── validation-schemas.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── not-found.tsx
│   │   │   │   ├── recovery/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth-service-init.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── dataRetentionService.ts
│   │   │   │   │   ├── errorAnalyticsBridge.ts
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── factory.ts
│   │   │   │   │   ├── FSD_MIGRATION_SUMMARY.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interfaces.ts
│   │   │   │   │   ├── mockUserData.ts
│   │   │   │   │   ├── navigation.ts
│   │   │   │   │   ├── notification-service.ts
│   │   │   │   │   ├── notification-system-integration-summary.md
│   │   │   │   │   ├── privacyAnalyticsService.ts
│   │   │   │   │   ├── realistic-demo-data.ts
│   │   │   │   │   ├── services-monitoring.ts
│   │   │   │   │   └── userService.ts
│   │   │   │   ├── stubs/
│   │   │   │   │   ├── database-stub.ts
│   │   │   │   │   └── middleware-stub.ts
│   │   │   │   ├── testing/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── mock-data.ts
│   │   │   │   │   └── mock-users.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── bill/
│   │   │   │   │   │   ├── auth-types.ts
│   │   │   │   │   │   ├── bill-analytics.ts
│   │   │   │   │   │   ├── bill-base.ts
│   │   │   │   │   │   ├── bill-services.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── community/
│   │   │   │   │   │   ├── community-base.ts
│   │   │   │   │   │   ├── community-base.ts.orig
│   │   │   │   │   │   ├── community-base.ts.rej
│   │   │   │   │   │   ├── community-hooks.ts
│   │   │   │   │   │   ├── community-services.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   │   ├── loading.ts
│   │   │   │   │   │   └── navigation.ts
│   │   │   │   │   ├── context/
│   │   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   │   ├── loading.ts
│   │   │   │   │   │   └── navigation.ts
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── dashboard-base.ts
│   │   │   │   │   │   ├── dashboard-components.ts
│   │   │   │   │   │   ├── dashboard-events.ts
│   │   │   │   │   │   ├── dashboard-metrics.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── dashboard.ts
│   │   │   │   │   │   ├── loading.ts
│   │   │   │   │   │   └── navigation.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── api.ts
│   │   │   │   │   │   ├── common.ts
│   │   │   │   │   │   ├── config.ts
│   │   │   │   │   │   ├── data.ts
│   │   │   │   │   │   ├── files.ts
│   │   │   │   │   │   ├── forms.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   │   ├── navigation.ts
│   │   │   │   │   │   ├── react.ts
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── ui.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── browser.ts
│   │   │   │   │   ├── core.ts
│   │   │   │   │   ├── dashboard.legacy.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── loading.ts
│   │   │   │   │   ├── lucide-react.d.ts
│   │   │   │   │   ├── mobile.ts
│   │   │   │   │   ├── navigation.ts
│   │   │   │   │   ├── search-response.ts
│   │   │   │   │   ├── search.ts
│   │   │   │   │   └── user-dashboard.ts
│   │   │   │   ├── ui/
│   │   │   │   │   ├── accessibility/
│   │   │   │   │   │   ├── accessibility-manager.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── civic/
│   │   │   │   │   │   ├── CivicEducation.test.tsx
│   │   │   │   │   │   ├── CivicEducationCard.tsx
│   │   │   │   │   │   ├── CivicEducationHub.tsx
│   │   │   │   │   │   ├── CivicEducationWidget.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── KenyanLegislativeProcess.tsx
│   │   │   │   │   │   ├── LegislativeProcessGuide.tsx
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   │   ├── DashboardStats.module.css
│   │   │   │   │   │   │   ├── DashboardStats.tsx
│   │   │   │   │   │   │   ├── TimeFilterSelector.tsx
│   │   │   │   │   │   │   └── WelcomeMessage.tsx
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── useDashboard.ts
│   │   │   │   │   │   │   ├── useDashboardActions.ts
│   │   │   │   │   │   │   ├── useDashboardConfig.ts
│   │   │   │   │   │   │   ├── useDashboardError.ts
│   │   │   │   │   │   │   ├── useDashboardLoading.ts
│   │   │   │   │   │   │   ├── useDashboardRefresh.ts
│   │   │   │   │   │   │   └── useDashboardTopics.ts
│   │   │   │   │   │   ├── modals/
│   │   │   │   │   │   │   ├── DashboardPreferencesModal.tsx
│   │   │   │   │   │   │   └── DataExportModal.tsx
│   │   │   │   │   │   ├── sections/
│   │   │   │   │   │   │   ├── ActivitySection.tsx
│   │   │   │   │   │   │   ├── BillsSection.tsx
│   │   │   │   │   │   │   ├── CivicMetricsSection.tsx
│   │   │   │   │   │   │   ├── DashboardSections.module.css
│   │   │   │   │   │   │   ├── EngagementHistorySection.tsx
│   │   │   │   │   │   │   ├── MigrationDashboard.tsx
│   │   │   │   │   │   │   ├── RecommendationsSection.tsx
│   │   │   │   │   │   │   ├── StatsSection.tsx
│   │   │   │   │   │   │   └── TrackedBillsSection.tsx
│   │   │   │   │   │   ├── types/
│   │   │   │   │   │   │   ├── components.ts
│   │   │   │   │   │   │   ├── core.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── widgets.ts
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   ├── dashboard-config-utils.ts
│   │   │   │   │   │   │   ├── dashboard-constants.ts
│   │   │   │   │   │   │   ├── dashboard-formatters.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── performance.ts
│   │   │   │   │   │   ├── variants/
│   │   │   │   │   │   │   ├── FullPageDashboard.tsx
│   │   │   │   │   │   │   └── SectionDashboard.tsx
│   │   │   │   │   │   ├── widgets/
│   │   │   │   │   │   │   ├── DashboardCustomizer.tsx
│   │   │   │   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   │   │   │   ├── DashboardStack.tsx
│   │   │   │   │   │   │   ├── DashboardTabs.tsx
│   │   │   │   │   │   │   ├── DashboardWidget.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── PersonaIndicator.tsx
│   │   │   │   │   │   │   ├── ProgressiveDisclosure.tsx
│   │   │   │   │   │   │   └── widget-types.ts
│   │   │   │   │   │   ├── action-items.tsx
│   │   │   │   │   │   ├── activity-summary.tsx
│   │   │   │   │   │   ├── ADAPTIVE_DASHBOARD_SUMMARY.md
│   │   │   │   │   │   ├── AdaptiveDashboard.tsx
│   │   │   │   │   │   ├── DashboardFramework.tsx
│   │   │   │   │   │   ├── errors.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── MonitoringDashboard.tsx
│   │   │   │   │   │   ├── recovery.ts
│   │   │   │   │   │   ├── SmartDashboard.tsx
│   │   │   │   │   │   ├── tracked-topics.tsx
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   ├── useDashboardData.ts
│   │   │   │   │   │   ├── useMigrationDashboardData.ts
│   │   │   │   │   │   ├── UserDashboard.tsx
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── education/
│   │   │   │   │   │   ├── ConstitutionalContext.tsx
│   │   │   │   │   │   ├── EducationalFramework.tsx
│   │   │   │   │   │   ├── EducationalTooltip.tsx
│   │   │   │   │   │   ├── HistoricalPrecedents.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── PlainLanguageSummary.tsx
│   │   │   │   │   │   ├── ProcessEducation.tsx
│   │   │   │   │   │   └── README.md
│   │   │   │   │   ├── examples/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── SeamlessIntegrationExample.tsx
│   │   │   │   │   ├── i18n/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── LanguageSwitcher.tsx
│   │   │   │   │   ├── integration/
│   │   │   │   │   │   ├── context/
│   │   │   │   │   │   │   └── IntegrationContext.ts
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   └── useIntegration.ts
│   │   │   │   │   │   ├── EnhancedUXIntegration.tsx
│   │   │   │   │   │   ├── IntegrationProvider.tsx
│   │   │   │   │   │   ├── IntegrationTest.tsx
│   │   │   │   │   │   └── types.ts
│   │   │   │   │   ├── lazy/
│   │   │   │   │   │   └── LazyPageWrapper.tsx
│   │   │   │   │   ├── loading/
│   │   │   │   │   │   ├── context/
│   │   │   │   │   │   │   └── AssetLoadingContext.tsx
│   │   │   │   │   │   ├── core/
│   │   │   │   │   │   │   └── loadingCore.ts
│   │   │   │   │   │   ├── examples/
│   │   │   │   │   │   │   └── GlobalLoadingExample.tsx
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── useAssetLoading.ts
│   │   │   │   │   │   │   ├── useAssetLoadingContext.ts
│   │   │   │   │   │   │   ├── useAssetLoadingIndicatorState.ts
│   │   │   │   │   │   │   ├── useGlobalLoadingIndicator.ts
│   │   │   │   │   │   │   ├── useLoading.ts
│   │   │   │   │   │   │   ├── useLoadingRecovery.ts
│   │   │   │   │   │   │   ├── useLoadingState.ts
│   │   │   │   │   │   │   ├── useProgressiveLoading.ts
│   │   │   │   │   │   │   └── useUnifiedLoading.ts
│   │   │   │   │   │   ├── ui/
│   │   │   │   │   │   │   ├── AvatarSkeleton.tsx
│   │   │   │   │   │   │   ├── CardSkeleton.tsx
│   │   │   │   │   │   │   ├── FormSkeleton.tsx
│   │   │   │   │   │   │   ├── index.tsx
│   │   │   │   │   │   │   ├── ListSkeleton.tsx
│   │   │   │   │   │   │   ├── LoadingIndicator.tsx
│   │   │   │   │   │   │   ├── ProgressiveLoader.tsx
│   │   │   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   │   │   ├── TextSkeleton.tsx
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   ├── connection-utils.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── loading-utils.ts
│   │   │   │   │   │   │   ├── loadingUtils.ts
│   │   │   │   │   │   │   ├── progress-utils.ts
│   │   │   │   │   │   ├── AssetLoadingIndicator.tsx
│   │   │   │   │   │   ├── constants.ts
│   │   │   │   │   │   ├── errors.ts
│   │   │   │   │   │   ├── FINAL_STATUS.md
│   │   │   │   │   │   ├── FontFallback.tsx
│   │   │   │   │   │   ├── GlobalLoadingIndicator.tsx
│   │   │   │   │   │   ├── GlobalLoadingProvider.tsx
│   │   │   │   │   │   ├── ImageFallback.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── integration-test.ts
│   │   │   │   │   │   ├── LOADING_SYSTEM_STATUS.md
│   │   │   │   │   │   ├── LoadingDemo.tsx
│   │   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   │   ├── LoadingStates.tsx
│   │   │   │   │   │   ├── README.md
│   │   │   │   │   │   ├── recovery.ts
│   │   │   │   │   │   ├── ScriptFallback.tsx
│   │   │   │   │   │   ├── test-loading.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── mobile/
│   │   │   │   │   │   ├── data-display/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── MobileBillCard.tsx
│   │   │   │   │   │   │   ├── MobileChartCarousel.tsx
│   │   │   │   │   │   │   ├── MobileDataVisualization.tsx
│   │   │   │   │   │   │   └── MobileTabSelector.tsx
│   │   │   │   │   │   ├── feedback/
│   │   │   │   │   │   │   └── OfflineStatusBanner.tsx
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   ├── useBottomSheet.ts
│   │   │   │   │   │   │   ├── useInfiniteScroll.ts
│   │   │   │   │   │   │   └── useMobileTabs.ts
│   │   │   │   │   │   ├── interaction/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── InfiniteScroll.tsx
│   │   │   │   │   │   │   ├── MobileBottomSheet.tsx
│   │   │   │   │   │   │   ├── PullToRefresh.tsx
│   │   │   │   │   │   │   ├── ScrollToTopButton.tsx
│   │   │   │   │   │   │   └── SwipeGestures.tsx
│   │   │   │   │   │   ├── constants.ts
│   │   │   │   │   │   ├── fallbacks.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── mobile-navigation-enhancements.css
│   │   │   │   │   │   ├── MobileNavigation.tsx
│   │   │   │   │   │   └── README_NEW_STRUCTURE.md
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   ├── analytics/
│   │   │   │   │   │   │   ├── NavigationAnalytics.tsx
│   │   │   │   │   │   │   └── NavigationAnalyticsUtils.tsx
│   │   │   │   │   │   ├── core/
│   │   │   │   │   │   │   └── roleGuard.ts
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── useBreadcrumbNavigation.ts
│   │   │   │   │   │   │   ├── useNav.ts
│   │   │   │   │   │   │   ├── useOptimizedNavigation.ts
│   │   │   │   │   │   │   ├── useRelatedPages.ts
│   │   │   │   │   │   ├── performance/
│   │   │   │   │   │   │   └── NavigationPerformanceDashboard.tsx
│   │   │   │   │   │   ├── ui/
│   │   │   │   │   │   │   ├── DESKTOP_SIDEBAR_FIXES.md
│   │   │   │   │   │   │   ├── DesktopSidebar.tsx
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── NavLink.tsx
│   │   │   │   │   │   │   └── NavSection.tsx
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── navigation-utils.ts
│   │   │   │   │   │   │   ├── page-relationships.ts
│   │   │   │   │   │   ├── BreadcrumbNavigation.tsx
│   │   │   │   │   │   ├── constants.ts
│   │   │   │   │   │   ├── errors.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── navigation-preferences-dialog.tsx
│   │   │   │   │   │   ├── Navigation.tsx
│   │   │   │   │   │   ├── NavigationSliceDemo.tsx
│   │   │   │   │   │   ├── ProgressiveDisclosureDemo.tsx
│   │   │   │   │   │   ├── ProgressiveDisclosureNavigation.tsx
│   │   │   │   │   │   ├── ProgressiveDisclosureSimple.tsx
│   │   │   │   │   │   ├── quick-access-nav.tsx
│   │   │   │   │   │   ├── recovery.ts
│   │   │   │   │   │   └── validation.ts
│   │   │   │   │   ├── notifications/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   │   │   ├── NotificationItem.tsx
│   │   │   │   │   │   └── NotificationPreferences.tsx
│   │   │   │   │   ├── offline/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── offline-manager.tsx
│   │   │   │   │   │   ├── OfflineIndicator.tsx
│   │   │   │   │   │   └── OfflineModal.tsx
│   │   │   │   │   ├── performance/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── PerformanceDashboard.tsx
│   │   │   │   │   ├── privacy/
│   │   │   │   │   │   ├── controls/
│   │   │   │   │   │   │   ├── ConsentControls.tsx
│   │   │   │   │   │   │   ├── DataUsageControls.tsx
│   │   │   │   │   │   │   └── VisibilityControls.tsx
│   │   │   │   │   │   ├── CompactInterface.tsx
│   │   │   │   │   │   ├── FullInterface.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── ModalInterface.tsx
│   │   │   │   │   │   └── PrivacyManager.tsx
│   │   │   │   │   ├── realtime/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── RealTimeDashboard.tsx
│   │   │   │   │   │   └── RealTimeNotifications.tsx
│   │   │   │   │   ├── status/
│   │   │   │   │   │   ├── connection-status.tsx
│   │   │   │   │   │   └── database-status.tsx
│   │   │   │   │   ├── types/
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── component-helpers.ts
│   │   │   │   │   │   ├── error-handling-exports.ts
│   │   │   │   │   │   ├── error-handling-utils.ts
│   │   │   │   │   │   ├── error-handling.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── connection-status.tsx
│   │   │   │   │   ├── database-status.tsx
│   │   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── assets.ts
│   │   │   │   │   ├── browser-compatibility-tests.ts
│   │   │   │   │   ├── browser.ts
│   │   │   │   │   ├── bundle-analyzer.ts
│   │   │   │   │   ├── cn.ts
│   │   │   │   │   ├── comprehensiveLoading.ts
│   │   │   │   │   ├── contrast.ts
│   │   │   │   │   ├── demo-data-service.ts
│   │   │   │   │   ├── emergency-triage.ts
│   │   │   │   │   ├── env-config.ts
│   │   │   │   │   ├── i18n.ts
│   │   │   │   │   ├── input-validation.ts
│   │   │   │   │   ├── investor-demo-enhancements.ts
│   │   │   │   │   ├── logger.ts
│   │   │   │   │   ├── preload-optimizer.ts
│   │   │   │   │   ├── privacy-compliance.ts
│   │   │   │   │   ├── react-helpers.ts
│   │   │   │   │   ├── safe-lazy-loading.tsx
│   │   │   │   │   ├── security.ts
│   │   │   │   │   ├── service-recovery.ts
│   │   │   │   │   └── tracing.ts
│   │   │   │   ├── validation/
│   │   │   │   │   ├── base-validation.ts
│   │   │   │   │   ├── consolidated.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   ├── accessibility/
│   │   │   │   │   └── home-page-accessibility.test.ts
│   │   │   │   └── performance/
│   │   │   │       └── home-page-performance.test.tsx
│   │   │   ├── App.tsx
│   │   │   ├── DevWrapper.tsx
│   │   │   ├── emergency-styles.css
│   │   │   ├── index.css
│   │   │   ├── main.tsx
│   │   │   ├── test-styles.html
│   │   │   └── vite-env.d.ts
│   │   ├── BUG_FIXES_SUMMARY.md
│   │   ├── fix-import-syntax.mjs
│   │   ├── index.html
│   │   ├── migration-helper.js
│   │   ├── package-scripts.json
│   │   ├── package.json
│   │   ├── playwright.config.ts
│   │   ├── playwright.visual.config.ts
│   │   ├── postcss.config.js
│   │   ├── project.json
│   │   ├── SERVICE_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md
│   │   ├── tailwind.config.ts
│   │   ├── test-lucide-imports.ts
│   │   ├── tsconfig.json
│   │   ├── validate-fixes.cjs
│   │   ├── vite-plugin-suppress-warnings.js
│   │   ├── vite.config.ts
│   │   ├── vite.production.config.ts
│   │   └── vitest.config.ts
│   ├── deployment/
│   │   ├── environment-configs/
│   │   │   ├── development.env
│   │   │   ├── production.env
│   │   │   └── staging.env
│   │   ├── cdn-config.js
│   │   ├── monitoring-dashboards.js
│   │   ├── pipeline-config.yml
│   │   └── README.md
│   ├── docs/
│   │   ├── active/
│   │   │   ├── configuration-guide.md
│   │   │   ├── developer-onboarding.md
│   │   │   ├── setup.md
│   │   │   └── troubleshooting-guide.md
│   │   ├── architecture/
│   │   │   ├── ai-code-review/
│   │   │   │   ├── design.md
│   │   │   │   ├── implementation.md
│   │   │   │   └── requirements.md
│   │   │   ├── frameworks/
│   │   │   │   ├── comprehensive-code-analysis.md
│   │   │   │   ├── synthesis.md
│   │   │   │   ├── unified-ai-dev.md
│   │   │   │   ├── unified-code-analysis-v2.md
│   │   │   │   ├── unified-code-analysis.md
│   │   │   │   └── unified-coding.md
│   │   │   ├── application-flow.md
│   │   │   ├── architecture.md
│   │   │   ├── chanuka_architecture.txt
│   │   │   ├── CORE_INTEGRATION_STATUS.md
│   │   │   ├── docs-module.md
│   │   │   ├── FEATURES_INTEGRATION_STATUS.md
│   │   │   ├── FINAL-SCHEMA-INTEGRATION-ZERO-REDUNDANCY.md
│   │   │   ├── INHERITANCE_COMPOSITION_ANALYSIS.md
│   │   │   ├── REVISED-SCHEMA-INTEGRATION-FOCUSED.md
│   │   │   ├── schema-domain-relationships.md
│   │   │   └── SHARED_INTEGRATION_STATUS.md
│   │   ├── chanuka/
│   │   │   ├── # Chanuka Platform Consolidation Impleme.md
│   │   │   ├── api_strategy_doc.md
│   │   │   ├── chanuka architecture2.md
│   │   │   ├── chanuka idea validation.md
│   │   │   ├── chanuka idea validation.txt
│   │   │   ├── chanuka_automation_strategy.md
│   │   │   ├── chanuka_brand_roadmap.md
│   │   │   ├── CHANUKA_CLIENT_COMPREHENSIVE_ANALYSIS.md
│   │   │   ├── CHANUKA_CLIENT_DEEP_DIVE_ANALYSIS.md
│   │   │   ├── chanuka_complete_slogans.md
│   │   │   ├── chanuka_design_specifications.md
│   │   │   ├── chanuka_design.txt
│   │   │   ├── chanuka_final_poems.md
│   │   │   ├── chanuka_implementation_guide.md
│   │   │   ├── chanuka_implementation_unified.txt
│   │   │   ├── chanuka_platform_client_improvement_recommendations.md
│   │   │   ├── chanuka_requirements.txt
│   │   │   ├── community-input_1751743369833.html
│   │   │   ├── dashboard_1751743369900.html
│   │   │   ├── design.md
│   │   │   ├── expert-verification_1751743369833.html
│   │   │   ├── merged_bill_sponsorship.html
│   │   │   ├── missing-strategic-features-analysis.md
│   │   │   ├── philosophical_connections_analysis.md
│   │   │   ├── README.md
│   │   │   ├── Scriptural Distributed Leadership.md
│   │   │   ├── sponsorbyreal.html
│   │   │   ├── strategic_additions_poems.md
│   │   │   ├── strategic-ui-features-analysis.md
│   │   ├── reference/
│   │   │   ├── Adversarial Validation of 'Chanuka' as Democratic Infrastructure in Kenya.md
│   │   │   ├── api-consumer-guide.md
│   │   │   ├── API.md
│   │   │   ├── brand-roadmap.md
│   │   │   ├── Chanuka Validation_ A Rigorous Plan.md
│   │   │   ├── chanuka_funder_table (1).md
│   │   │   ├── Chanuka_Funding_Pitch.md
│   │   │   ├── chanuka_implementation_guide.md
│   │   │   ├── chanuka_requirements.txt
│   │   │   ├── chanuka_serpent_dove.md
│   │   │   ├── chanuka_timeline_gantt.md
│   │   │   ├── chanuka_webapp_copy.md
│   │   │   ├── civic_engagement_framework.md
│   │   │   ├── Constitutional Normalization in Kenya_ The CDF Paradigm and the Erosion of Democratic Memory.md
│   │   │   ├── constitutional_analysis_framework.md
│   │   │   ├── constitutional-normalization-study.md
│   │   │   ├── Data Strategy for Chanuka Launch.md
│   │   │   ├── database-research-prompt.md
│   │   │   ├── Detecting Legislative Pretext_ A Framework.md
│   │   │   ├── DIGITAL LAW 2018.pdf
│   │   │   ├── DIGITAL LAW AMENDMENTS AMENDMENTS (2025).pdf
│   │   │   ├── dissertation.md
│   │   │   ├── documentation-standards.md
│   │   │   ├── ezra-nehemiah-chanuka (1).md
│   │   │   ├── global_implications.md
│   │   │   ├── Grounding Constitutional Analysis in Pragmatism.md
│   │   │   ├── index.md
│   │   │   ├── kba_pitch_deck.md
│   │   │   ├── Kenyan Civic Tech Data Research Plan.md
│   │   │   ├── Kenyan Constitutionalism Research Synthesis.md
│   │   │   ├── Kenyan Legislative Challenges and Judicial Outcomes Database - Table 1.csv
│   │   │   ├── Kenyan Legislative Data Generation Plan.md
│   │   │   ├── Kenyan Legislative Intelligence Database Project.md
│   │   │   ├── Kenyan_constitution_2010.md
│   │   │   ├── leg_intel_scraper.js
│   │   │   ├── Legislative Relationship Mapping Framework.md
│   │   │   ├── legislative_framework.md
│   │   │   ├── maintenance-process.md
│   │   │   ├── manifesto.md
│   │   │   ├── Operationalizing Academic Research for Impact.md
│   │   │   ├── philosophical_threshold_poems.md
│   │   │   ├── problem-statement.md
│   │   │   ├── project-structure-comparison.md
│   │   │   ├── project-structure.md
│   │   │   ├── prompt-1-constitutional-vulnerabilities.md
│   │   │   ├── prompt-2-underutilized-strengths.md
│   │   │   ├── prompt-3-elite-literacy-loopholes.md
│   │   │   ├── prompt-4-public-participation.md
│   │   │   ├── prompt-5-trojan-bills.md
│   │   │   ├── prompt-6-ethnic-patronage.md
│   │   │   ├── README.md
│   │   │   ├── relationship-mapping-framework.md
│   │   │   ├── Research Strategy for Kenyan Constitutionalism.md
│   │   │   ├── schema_analysis.md
│   │   │   ├── Strategic Funding and Networking Plan.md
│   │   │   ├── sustainable_uprising.md
│   │   │   ├── user-manual.md
│   │   │   ├── Validating Legislative Intelligence Market.md
│   │   │   └── Validating Parliamentary Compliance Infrastructure.md
│   │   ├── BOUNDARY_DEFINITIONS.md
│   │   ├── GOVERNOR_INTEGRATION_PHASE1.md
│   │   ├── IMPORT_PATH_GOVERNANCE.md
│   │   ├── project-structure.md
│   │   └── race-condition-analysis.md
│   ├── drizzle/
│   │   ├── meta/
│   │   │   ├── _journal.json
│   │   │   ├── 0000_snapshot.json
│   │   │   ├── 0001_snapshot.json
│   │   │   ├── 0002_snapshot.json
│   │   │   ├── 0021_snapshot.json
│   │   │   └── 20251104110148_snapshot.json
│   │   ├── 0021_clean_comprehensive_schema.sql
│   │   ├── 0022_fix_schema_alignment.sql
│   │   ├── 0023_migration_infrastructure.sql
│   │   ├── 0024_migration_infrastructure.sql
│   │   ├── 0025_postgresql_fulltext_enhancements.sql
│   │   ├── 0026_optimize_search_indexes.sql
│   │   ├── 1766469695772_init_schema.sql
│   │   ├── 20251104110148_soft_captain_marvel.sql
│   │   ├── 20251104110149_advanced_discovery.sql
│   │   ├── 20251104110150_real_time_engagement.sql
│   │   ├── 20251104110151_transparency_intelligence.sql
│   │   ├── 20251104110152_expert_verification.sql
│   │   ├── 20251117080000_intelligent_search_phase2.sql
│   │   ├── 20251117104802_intelligent_search_system.sql
│   │   ├── 20251223154627_database_performance_optimizations.sql
│   │   ├── COMPREHENSIVE_MIGRATION_SUMMARY.md
│   │   ├── LEGACY_MIGRATION_ARCHIVE.md
│   │   └── legacy_migration_validation.sql
│   ├── plans/
│   │   └── dashboard-consolidation-plan.md
│   ├── playwright-report/
│   │   └── index.html
│   ├── scripts/
│   │   ├── archived-analysis-tools/
│   │   │   ├── chanuka_error_extractor.py
│   │   │   └── count-websocket-fields.mjs
│   │   ├── archived-migration-tools/
│   │   │   ├── type-cleanup.mjs
│   │   │   ├── type-safety-fixer.mjs
│   │   │   └── websocket-migration-validation.mjs
│   │   ├── database/
│   │   │   ├── graph/
│   │   │   │   ├── discover-networks.ts
│   │   │   │   ├── discover-patterns.ts
│   │   │   │   ├── initialize-graph.ts
│   │   │   │   └── sync-demo.ts
│   │   │   ├── check-schema.ts
│   │   │   ├── check-tables.ts
│   │   │   ├── consolidate-database-infrastructure.ts
│   │   │   ├── DATABASE_DRIVER_STRATEGY.md
│   │   │   ├── debug-migration-table.ts
│   │   │   ├── DEPRECATION_NOTICE.md
│   │   │   ├── generate-migration.ts
│   │   │   ├── health-check.ts
│   │   │   ├── init-strategic-database.ts
│   │   │   ├── initialize-database-integration.ts
│   │   │   ├── migrate.ts
│   │   │   ├── migration-performance-profile.ts
│   │   │   ├── README.md
│   │   │   ├── reset-and-migrate.ts
│   │   │   ├── reset-database-fixed.ts
│   │   │   ├── reset-database.ts
│   │   │   ├── reset.ts
│   │   │   ├── run-migrations.ts
│   │   │   ├── run-reset.sh
│   │   │   ├── run-reset.ts
│   │   │   ├── schema-drift-detection.ts
│   │   │   ├── SCRIPTS_GUIDE.md
│   │   │   ├── setup-schema.ts
│   │   │   ├── setup.ts
│   │   │   ├── simple-migrate.ts
│   │   │   ├── simple-reset.ts
│   │   │   ├── validate-migration.ts
│   │   │   └── verify-alignment.ts
│   │   ├── deployment/
│   │   │   └── deploy.sh
│   │   ├── deprecated/
│   │   │   ├── circular-dependency-resolver.mjs
│   │   │   ├── extract_errors_monorepo.mjs
│   │   │   ├── import-resolver.mjs
│   │   │   ├── validate_imports.js
│   │   │   ├── validator.mjs
│   │   │   └── verify-exports.js
│   │   ├── seeds/
│   │   │   ├── legislative-seed.ts
│   │   │   ├── seed.ts
│   │   │   └── simple-seed.ts
│   │   ├── typescript-fixer/
│   │   │   ├── src/
│   │   │   │   ├── analyzers/
│   │   │   │   │   ├── database-pattern-detector.ts
│   │   │   │   │   ├── drizzle-pattern-detector.ts
│   │   │   │   │   ├── import-path-resolver.ts
│   │   │   │   │   ├── project-analyzer.ts
│   │   │   │   │   ├── schema-import-detector.ts
│   │   │   │   │   ├── schema-parser.ts
│   │   │   │   │   ├── schema-table-analyzer.ts
│   │   │   │   │   └── shared-core-utility-detector.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── error-extractor.ts
│   │   │   │   │   └── typescript-program-loader.ts
│   │   │   │   ├── fixers/
│   │   │   │   │   ├── api-response-fixer.ts
│   │   │   │   │   ├── database-connection-fixer.ts
│   │   │   │   │   ├── exact-optional-property-fixer.ts
│   │   │   │   │   ├── shared-core-import-fixer.ts
│   │   │   │   │   └── unused-variable-cleaner.ts
│   │   │   │   ├── formatters/
│   │   │   │   │   └── error-message-formatter.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── core.ts
│   │   │   │   ├── validators/
│   │   │   │   │   └── api-parameter-validator.ts
│   │   │   │   ├── cli.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   ├── fixtures/
│   │   │   │   │   ├── chanuka-edge-case-patterns.ts
│   │   │   │   │   ├── chanuka-shared-core-patterns.ts
│   │   │   │   │   ├── chanuka-unused-patterns.ts
│   │   │   │   │   ├── chanuka-validation-patterns.ts
│   │   │   │   │   ├── database-patterns.ts
│   │   │   │   │   └── sample-chanuka-file.ts
│   │   │   │   ├── global.d.ts
│   │   │   │   └── setup.ts
│   │   │   ├── jest.config.js
│   │   │   ├── package-lock.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── add-react-imports.js
│   │   ├── align-imports.ts
│   │   ├── align-schema.ts
│   │   ├── analyze-bundle.cjs
│   │   ├── analyze-codebase-errors.ts
│   │   ├── analyze-phase2.sh
│   │   ├── analyzer.js
│   │   ├── architecture_fixer.ts
│   │   ├── audit-codebase-utilities.ts
│   │   ├── audit-error-handling-sprawl.ts
│   │   ├── audit-middleware-sprawl.ts
│   │   ├── bulk-migrate-types.sh
│   │   ├── bundle-analysis-plugin.js
│   │   ├── bundle-analyzer.js
│   │   ├── CHANUKA_MIGRATION_PLAN.md
│   │   ├── ChatGPT Image Jan 10, 2026, 09_32_52 PM.png
│   │   ├── check-table-structure.ts
│   │   ├── check-tables.ts
│   │   ├── check-thresholds.js
│   │   ├── clean-shared-core-imports.ts
│   │   ├── cleanup-deprecated-folders.ts
│   │   ├── cleanup-legacy-adapters.js
│   │   ├── cleanup-orphaned-files.ts
│   │   ├── cleanup-redundant-utils.js
│   │   ├── complete-fsd-migration.sh
│   │   ├── complete-migrations.ts
│   │   ├── complete-realignment.ts
│   │   ├── complete-schema-fix.ts
│   │   ├── consolidate-imports.ts
│   │   ├── consolidate-redundant-implementations.ts
│   │   ├── consolidate-sprawl.ts
│   │   ├── demo-repository-deployment.ts
│   │   ├── dependency-cruiser.js
│   │   ├── deploy-error-handling.ts
│   │   ├── deploy-phase1-utilities.ts
│   │   ├── deploy-production.js
│   │   ├── deploy-repository-migration.ts
│   │   ├── deploy-search-optimization.ts
│   │   ├── design-system-audit.js
│   │   ├── diagnose-503-issues.js
│   │   ├── domain-type-migration-plan.md
│   │   ├── drop-schema.ts
│   │   ├── dynamic-path-updater.js
│   │   ├── emergency-design-system-consolidation.ts
│   │   ├── execute-comprehensive-migration.ts
│   │   ├── final-client-cleanup.sh
│   │   ├── fix-all-imports.js
│   │   ├── fix-all-shared-core-imports.ts
│   │   ├── fix-api-response-calls.js
│   │   ├── fix-client-issues.sh
│   │   ├── fix-config.json
│   │   ├── fix-design-system.ts
│   │   ├── fix-display-names.ts
│   │   ├── fix-error-components.sh
│   │   ├── fix-error-fallback.ts
│   │   ├── fix-features-integration.ts
│   │   ├── fix-frontend-imports.js
│   │   ├── fix-import-paths.ts
│   │   ├── fix-infrastructure-issues.ts
│   │   ├── fix-lucide-imports.ts
│   │   ├── fix-missing-exports.ts
│   │   ├── fix-plural-singular-consistency.ts
│   │   ├── fix-property-naming-consistency.ts
│   │   ├── fix-remaining-api-calls.js
│   │   ├── fix-remaining-client-issues.sh
│   │   ├── fix-remaining-errors.ts
│   │   ├── fix-remaining-imports.js
│   │   ├── fix-remaining-types.js
│   │   ├── fix-schema-imports.ts
│   │   ├── fix-schema-references.ts
│   │   ├── fix-server-logger-imports.js
│   │   ├── fix-shared-core-imports.ts
│   │   ├── fix-shared-folder.ts
│   │   ├── fix-shared-imports.js
│   │   ├── fix-shared-ui-bugs.sh
│   │   ├── fix-shared-ui.sh
│   │   ├── fix-typescript-syntax-errors.ts
│   │   ├── flatten-codebase.sh
│   │   ├── functional_validator.js
│   │   ├── generate-bundle-report.js
│   │   ├── generate-comprehensive-migrations.ts
│   │   ├── identify-any-usage.ts
│   │   ├── identify-deprecated-files.cjs
│   │   ├── identify-deprecated-files.js
│   │   ├── identify-deprecated-files.ts
│   │   ├── immediate-memory-cleanup.cjs
│   │   ├── import-resolution-monitor.js
│   │   ├── integrate-error-management.ts
│   │   ├── jscpd.json
│   │   ├── knip.json
│   │   ├── migrate_types.py
│   │   ├── migrate-api-imports.js
│   │   ├── migrate-codebase-utilities.ts
│   │   ├── migrate-console-logs.ts
│   │   ├── migrate-consolidated-imports.cjs
│   │   ├── migrate-error-handling.ts
│   │   ├── migrate-imports.js
│   │   ├── migrate-logging.js
│   │   ├── migrate-shared-types.ts
│   │   ├── migrate-to-unified-websocket.ts
│   │   ├── migrate-types.js
│   │   ├── ml-service-demo.ts
│   │   ├── modern-project-analyzer.ts
│   │   ├── optimize-memory.js
│   │   ├── performance-budget-enforcer.cjs
│   │   ├── performance-regression-detector.js
│   │   ├── performance-trend-analyzer.cjs
│   │   ├── phase2-analyze.js
│   │   ├── phase2-migration-generator.sh
│   │   ├── prepare-module-deletion.ts
│   │   ├── race-condition-analyzer.js
│   │   ├── README.md
│   │   ├── rollback-cleanup.ts
│   │   ├── run-adapter-cleanup.js
│   │   ├── runtime_diagnostics.js
│   │   ├── runtime-dependency-check.js
│   │   ├── scan-migration-artifacts.sh
│   │   ├── scan-remaining-imports.js
│   │   ├── setup-playwright.js
│   │   ├── standardize-imports.ts
│   │   ├── strategic-contrast-migration.js
│   │   ├── test-consolidated-design-system.ts
│   │   ├── test-design-system-architecture.ts
│   │   ├── update-core-imports.js
│   │   ├── update-core-references.js
│   │   ├── update-import-references.ts
│   │   ├── update-imports-after-flatten.sh
│   │   ├── validate_structure.ts
│   │   ├── validate-client-codebase.js
│   │   ├── validate-client-implementations.ts
│   │   ├── validate-config-consistency.ts
│   │   ├── validate-config.js
│   │   ├── validate-design-system-final.ts
│   │   ├── validate-design-system.ts
│   │   ├── validate-fsd-migration.ts
│   │   ├── validate-functional-validator.js
│   │   ├── validate-imports.js
│   │   ├── validate-migration-completion.ts
│   │   ├── validate-new-domains.cjs
│   │   ├── validate-property-naming.ts
│   │   ├── validate-shared-folder.ts
│   │   ├── validate-shared-ui.js
│   │   ├── validate-syntax.ts
│   │   ├── verify-and-fix-project-structure.ts
│   │   ├── verify-cleanup.ts
│   │   ├── verify-project-structure.ts
│   │   ├── verify-security-patches.ts
│   │   └── web-vitals-checker.js
│   ├── server/
│   │   ├── config/
│   │   │   ├── development.ts
│   │   │   ├── index.ts
│   │   │   ├── production.ts
│   │   │   └── test.ts
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── auth-service.ts
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
│   │   ├── demo/
│   │   │   └── real-time-tracking-demo.ts
│   │   ├── docs/
│   │   │   ├── government-data-integration-implementation.md
│   │   │   ├── INITIALIZATION_ARCHITECTURE.md
│   │   │   ├── README-schema-validation.md
│   │   │   ├── schema-import-guide.md
│   │   │   └── schema-migration-summary.md
│   │   ├── domain/
│   │   │   └── interfaces/
│   │   │       ├── bill-repository.interface.ts
│   │   │       ├── sponsor-repository.interface.ts
│   │   │       └── user-repository.interface.ts
│   │   ├── examples/
│   │   ├── features/
│   │   │   ├── accountability/
│   │   │   │   ├── ledger.controller.ts
│   │   │   │   └── ledger.service.ts
│   │   │   ├── admin/
│   │   │   │   ├── moderation/
│   │   │   │   │   ├── content-analysis.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── moderation-analytics.service.ts
│   │   │   │   │   ├── moderation-decision.service.ts
│   │   │   │   │   ├── moderation-orchestrator.service.ts
│   │   │   │   │   ├── moderation-queue.service.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── admin.ts
│   │   │   │   ├── content-moderation.ts
│   │   │   │   ├── external-api-dashboard.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── moderation.ts
│   │   │   │   └── system.ts
│   │   │   ├── advocacy/
│   │   │   │   ├── application/
│   │   │   │   │   ├── action-coordinator.ts
│   │   │   │   │   ├── campaign-service.ts
│   │   │   │   │   └── impact-tracker.ts
│   │   │   │   ├── config/
│   │   │   │   │   └── advocacy-config.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── action-item.ts
│   │   │   │   │   │   └── campaign.ts
│   │   │   │   │   ├── errors/
│   │   │   │   │   │   └── advocacy-errors.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   └── advocacy-events.ts
│   │   │   │   │   └── services/
│   │   │   │   │       └── campaign-domain-service.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── services/
│   │   │   │   │       ├── notification-service.ts
│   │   │   │   │       └── representative-contact-service.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── advocacy-factory.ts
│   │   │   │   └── index.ts
│   │   │   ├── ai-evaluation/
│   │   │   │   └── application/
│   │   │   │       └── evaluation-orchestrator.ts
│   │   │   ├── alert-preferences/
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   └── create-alert-preference-command.ts
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   │   └── create-alert-preference-use-case.ts
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   └── alert-utilities.ts
│   │   │   │   │   └── alert-preferences-service.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── alert-delivery-log.ts
│   │   │   │   │   │   └── alert-preference.ts
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── alert-preference-repository.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── alert-delivery-service.ts
│   │   │   │   │   │   ├── smart-filtering-service.ts
│   │   │   │   │   │   └── unified-alert-preference-service.ts
│   │   │   │   │   └── value-objects/
│   │   │   │   │       ├── alert-channel.ts
│   │   │   │   │       ├── alert-conditions.ts
│   │   │   │   │       ├── alert-type.ts
│   │   │   │   │       ├── channel-type.ts
│   │   │   │   │       ├── frequency-config.ts
│   │   │   │   │       ├── priority.ts
│   │   │   │   │       └── smart-filtering-config.ts
│   │   │   │   ├── alert_system_docs.md
│   │   │   ├── analysis/
│   │   │   │   ├── application/
│   │   │   │   │   ├── analysis-service-direct.ts
│   │   │   │   │   ├── bill-comprehensive-analysis.service.ts
│   │   │   │   │   ├── constitutional-analysis.service.ts
│   │   │   │   │   ├── public-interest-analysis.service.ts
│   │   │   │   │   ├── stakeholder-analysis.service.ts
│   │   │   │   │   └── transparency-analysis.service.ts
│   │   │   │   ├── domain/
│   │   │   │   │   └── entities/
│   │   │   │   │       └── analysis-result.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── adapters/
│   │   │   │   │       └── ml-service-adapter.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   └── architecture-analysis-report.md
│   │   │   ├── analytics/
│   │   │   │   ├── config/
│   │   │   │   │   ├── analytics.config.ts
│   │   │   │   │   ├── ml-feature-flag.config.ts
│   │   │   │   │   └── ml-migration.config.ts
│   │   │   │   ├── conflict-detection/
│   │   │   │   │   ├── conflict-detection-engine.service.ts
│   │   │   │   │   ├── conflict-detection-orchestrator.service.ts
│   │   │   │   │   ├── conflict-resolution-recommendation.service.ts
│   │   │   │   │   ├── conflict-severity-analyzer.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── stakeholder-analysis.service.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── controllers/
│   │   │   │   │   └── engagement.controller.ts
│   │   │   │   ├── deployment/
│   │   │   │   │   ├── feature-flags.md
│   │   │   │   │   ├── monitoring-checklist.md
│   │   │   │   │   └── runbook.md
│   │   │   │   ├── docs/
│   │   │   │   │   ├── automation-setup.md
│   │   │   │   │   └── ml-service-migration-summary.md
│   │   │   │   ├── financial-disclosure/
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── anomaly-detection.service.ts
│   │   │   │   │   │   ├── disclosure-processing.service.ts
│   │   │   │   │   │   ├── disclosure-validation.service.ts
│   │   │   │   │   │   ├── financial-analysis.service.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── financial-disclosure-orchestrator.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── analytics-context.ts
│   │   │   │   │   └── performance-tracking.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── dashboard-config.json
│   │   │   │   │   ├── runbooks.md
│   │   │   │   │   └── setup-guide.md
│   │   │   │   ├── scripts/
│   │   │   │   │   ├── configure-ml-migration.ts
│   │   │   │   │   └── demo-ml-migration.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── engagement.service.ts
│   │   │   │   │   ├── financial-disclosure.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── ml-adapter.service.ts
│   │   │   │   │   ├── ml.service.ts
│   │   │   │   │   ├── real-ml.service.ts
│   │   │   │   │   ├── ussd-corruption-analysis.service.ts
│   │   │   │   │   ├── ussd-market-intelligence.service.ts
│   │   │   │   │   └── ussd.service.ts
│   │   │   │   ├── storage/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── progress.storage.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── common.ts
│   │   │   │   │   ├── engagement.ts
│   │   │   │   │   ├── financial-disclosure.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── ml.ts
│   │   │   │   │   └── progress-storage.d.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── conflict-detection.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── engagement-analytics.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── legal-analysis.ts
│   │   │   │   ├── ml-analysis.ts
│   │   │   │   ├── performance-dashboard.ts
│   │   │   │   ├── regulatory-change-monitoring.ts
│   │   │   │   ├── swagger.ts
│   │   │   │   └── transparency-dashboard.ts
│   │   │   ├── argument-intelligence/
│   │   │   │   ├── application/
│   │   │   │   │   ├── argument-intelligence-service.ts
│   │   │   │   │   ├── argument-processor.ts
│   │   │   │   │   ├── brief-generator.ts
│   │   │   │   │   ├── clustering-service.ts
│   │   │   │   │   ├── coalition-finder.ts
│   │   │   │   │   ├── evidence-validator.ts
│   │   │   │   │   ├── power-balancer.ts
│   │   │   │   │   └── structure-extractor.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── nlp/
│   │   │   │   │       ├── entity-extractor.ts
│   │   │   │   │       ├── sentence-classifier.ts
│   │   │   │   │       └── similarity-calculator.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── argument.types.ts
│   │   │   │   ├── IMPLEMENTATION_STATUS.md
│   │   │   │   ├── index.ts
│   │   │   ├── bills/
│   │   │   │   ├── application/
│   │   │   │   │   ├── bill-service-adapter.ts
│   │   │   │   │   ├── bill-service.ts
│   │   │   │   │   ├── bill-tracking.service.ts
│   │   │   │   │   ├── bills-repository-service.ts
│   │   │   │   │   ├── bills.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── sponsorship-analysis.service.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── bill.ts
│   │   │   │   │   ├── errors/
│   │   │   │   │   │   └── bill-errors.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   └── bill-events.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── bill-domain-service.ts
│   │   │   │   │   │   ├── bill-event-handler.ts
│   │   │   │   │   │   └── bill-notification-service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── LegislativeStorageTypes.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── bill-storage.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── sponsorship-repository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── voting-pattern-analysis-service.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── analysis.ts
│   │   │   │   ├── bill-status-monitor.ts
│   │   │   │   ├── bill.js
│   │   │   │   ├── index.ts
│   │   │   │   ├── legislative-storage.ts
│   │   │   │   ├── MIGRATION_SUMMARY.md
│   │   │   │   ├── real-time-tracking.ts
│   │   │   │   └── voting-pattern-analysis.ts
│   │   │   ├── community/
│   │   │   │   ├── comment-voting.ts
│   │   │   │   ├── comment.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── social-integration.ts
│   │   │   │   ├── social-share-storage.d.ts
│   │   │   │   └── social-share-storage.ts
│   │   │   ├── constitutional-analysis/
│   │   │   │   ├── application/
│   │   │   │   │   ├── constitutional-analysis-service-complete.ts
│   │   │   │   │   ├── constitutional-analyzer.ts
│   │   │   │   │   ├── expert-flagging-service.ts
│   │   │   │   │   ├── grounding-service.ts
│   │   │   │   │   ├── precedent-finder.ts
│   │   │   │   │   ├── provision-matcher.ts
│   │   │   │   │   └── uncertainty-assessor.ts
│   │   │   │   ├── config/
│   │   │   │   │   └── analysis-config.ts
│   │   │   │   ├── demo/
│   │   │   │   │   └── constitutional-analysis-demo.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── external/
│   │   │   │   │   │   └── legal-database-client.ts
│   │   │   │   │   └── knowledge-base/
│   │   │   │   │       └── precedents-db.ts
│   │   │   │   ├── scripts/
│   │   │   │   │   └── populate-sample-data.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── constitutional-analysis-factory.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── analysis-utils.ts
│   │   │   │   ├── index.ts
│   │   │   ├── constitutional-intelligence/
│   │   │   │   ├── application/
│   │   │   │   │   └── constitutional-analysis.service.ts
│   │   │   │   └── domain/
│   │   │   │       └── entities/
│   │   │   │           └── constitutional-provision.ts
│   │   │   ├── government-data/
│   │   │   │   ├── services/
│   │   │   │   │   └── government-data-integration.service.ts
│   │   │   │   ├── index.ts
│   │   │   ├── institutional-api/
│   │   │   │   └── application/
│   │   │   │       └── api-gateway-service.ts
│   │   │   ├── market/
│   │   │   │   ├── market.controller.ts
│   │   │   │   ├── market.service.ts
│   │   │   │   └── market.utils.ts
│   │   │   ├── notifications/
│   │   │   │   ├── domain/
│   │   │   │   │   └── entities/
│   │   │   │   │       └── notification.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── notification-service.ts
│   │   │   ├── privacy/
│   │   │   │   ├── privacy-scheduler.ts
│   │   │   │   └── privacy-service.ts
│   │   │   ├── recommendation/
│   │   │   │   ├── application/
│   │   │   │   │   ├── EngagementTracker.ts
│   │   │   │   │   └── RecommendationService.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── EngagementScorer.ts
│   │   │   │   │   ├── recommendation.dto.ts
│   │   │   │   │   ├── RecommendationEngine.ts
│   │   │   │   │   └── RecommendationValidator.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── RecommendationCache.ts
│   │   │   │   │   └── RecommendationRepository.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── RecommendationController.ts
│   │   │   ├── safeguards/
│   │   │   │   ├── application/
│   │   │   │   │   ├── cib-detection-service.ts
│   │   │   │   │   ├── moderation-service.ts
│   │   │   │   │   └── rate-limit-service.ts
│   │   │   │   └── infrastructure/
│   │   │   │       └── safeguard-jobs.ts
│   │   │   ├── search/
│   │   │   │   ├── application/
│   │   │   │   │   ├── search-service-direct.ts
│   │   │   │   │   ├── search-service.ts
│   │   │   │   │   └── SearchService.ts
│   │   │   │   ├── deployment/
│   │   │   │   │   ├── search-deployment-orchestrator.ts
│   │   │   │   │   ├── search-deployment.service.ts
│   │   │   │   │   └── search-rollback.service.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── QueryIntentService.ts
│   │   │   │   │   ├── RelevanceScorer.ts
│   │   │   │   │   ├── search.dto.ts
│   │   │   │   │   ├── SearchAnalytics.ts
│   │   │   │   │   ├── SearchValidator.ts
│   │   │   │   │   └── TypoCorrectionService.ts
│   │   │   │   ├── engines/
│   │   │   │   │   ├── core/
│   │   │   │   │   │   ├── fuse-search.engine.ts
│   │   │   │   │   │   ├── fuzzy-matching.engine.ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── postgresql-fulltext.engine.ts
│   │   │   │   │   │   └── simple-matching.engine.ts
│   │   │   │   │   ├── suggestion/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── suggestion-engine.service.ts
│   │   │   │   │   │   └── suggestion-ranking.service.ts
│   │   │   │   │   ├── types/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── search.types.ts
│   │   │   │   │   ├── dual-engine-orchestrator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── semantic-search.engine.ts
│   │   │   │   │   ├── suggestion-engine.service.ts
│   │   │   │   │   └── suggestion-ranking.service.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── SearchCache.ts
│   │   │   │   │   ├── SearchIndexManager.ts
│   │   │   │   │   └── SearchQueryBuilder.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── search-performance-monitor.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── embedding.service.ts
│   │   │   │   │   └── history-cleanup.service.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── parallel-query-executor.ts
│   │   │   │   │   └── search-syntax-parser.ts
│   │   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   │   ├── index.ts
│   │   │   │   ├── search-index-manager.ts
│   │   │   │   └── SearchController.ts
│   │   │   ├── security/
│   │   │   │   ├── encryption-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── intrusion-detection-service.ts
│   │   │   │   ├── privacy-service.ts
│   │   │   │   ├── security-audit-service.ts
│   │   │   │   ├── security-initialization-service.ts
│   │   │   │   ├── security-middleware.ts
│   │   │   │   ├── security-monitoring-service.ts
│   │   │   │   ├── security-monitoring.ts
│   │   │   │   └── tls-config-service.ts
│   │   │   ├── sponsors/
│   │   │   │   ├── application/
│   │   │   │   │   ├── sponsor-conflict-analysis.service.ts
│   │   │   │   │   └── sponsor-service-direct.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   ├── universal_access/
│   │   │   │   ├── index.ts
│   │   │   │   ├── ussd.analytics.ts
│   │   │   │   ├── ussd.composition.ts
│   │   │   │   ├── ussd.config.ts
│   │   │   │   ├── ussd.controller.ts
│   │   │   │   ├── ussd.dashboard.ts
│   │   │   │   ├── ussd.middleware-registry.ts
│   │   │   │   ├── ussd.middleware.ts
│   │   │   │   ├── ussd.service.ts
│   │   │   │   ├── ussd.types.ts
│   │   │   │   └── ussd.validator.ts
│   │   │   ├── users/
│   │   │   │   ├── application/
│   │   │   │   │   ├── middleware/
│   │   │   │   │   │   └── validation-middleware.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── logging-service.ts
│   │   │   │   │   │   └── metrics-service.ts
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── profile-management-use-case.ts
│   │   │   │   │   │   ├── user-registration-use-case.ts
│   │   │   │   │   │   └── verification-operations-use-case.ts
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── user-application-service.ts
│   │   │   │   │   ├── user-service-direct.ts
│   │   │   │   │   ├── users.ts
│   │   │   │   │   └── verification.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── aggregates/
│   │   │   │   │   │   └── user-aggregate.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── citizen-verification.ts
│   │   │   │   │   │   ├── user-profile.ts
│   │   │   │   │   │   ├── user.ts
│   │   │   │   │   │   └── value-objects.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── profile-domain-service.ts
│   │   │   │   │   │   ├── user-management-domain-service.ts
│   │   │   │   │   │   ├── user-verification-domain-service.ts
│   │   │   │   │   │   └── verification-domain-service.ts
│   │   │   │   │   ├── citizen-verification.ts
│   │   │   │   │   ├── ExpertVerificationService.ts
│   │   │   │   │   ├── user-management.ts
│   │   │   │   │   ├── user-preferences.ts
│   │   │   │   │   └── user-profile.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── email-service.ts
│   │   │   │   │   ├── government-data-service.ts
│   │   │   │   │   ├── notification-service.ts
│   │   │   │   │   ├── user-storage.d.ts
│   │   │   │   │   └── user-storage.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── MIGRATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   ├── repository-cleanup.ts
│   │   │   └── search-suggestions.ts
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── mappings/
│   │   │   │   │   ├── bill-mapping.ts
│   │   │   │   │   ├── comment-mapping.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── notification-mapping.ts
│   │   │   │   │   └── user-mapping.ts
│   │   │   │   └── drizzle-adapter.ts
│   │   │   ├── cache/
│   │   │   │   ├── cache-service.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── query-cache.ts
│   │   │   ├── caching/
│   │   │   │   └── query-cache.ts
│   │   │   ├── database/
│   │   │   │   ├── database-service.ts
│   │   │   │   └── pool-config.ts
│   │   │   ├── errors/
│   │   │   │   ├── error-adapter.ts
│   │   │   │   ├── error-standardization.ts
│   │   │   │   ├── migration-example.ts
│   │   │   │   ├── result-adapter.ts
│   │   │   │   └── result-integration-summary.md
│   │   │   ├── external-data/
│   │   │   │   ├── conflict-resolution-service.ts
│   │   │   │   ├── data-synchronization-service.ts
│   │   │   │   ├── external-api-manager.ts
│   │   │   │   ├── government-data-integration.ts
│   │   │   │   ├── government-data-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── integration/
│   │   │   │   └── service-orchestrator.ts
│   │   │   ├── logging/
│   │   │   │   ├── database-logger.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── log-aggregator.ts
│   │   │   │   └── logging-config.ts
│   │   │   ├── migration/
│   │   │   │   ├── ab-testing.service.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── deployment-monitoring-dashboard.ts
│   │   │   │   ├── deployment-orchestrator.ts
│   │   │   │   ├── deployment.service.ts
│   │   │   │   ├── error-handling-deployment-summary.md
│   │   │   │   ├── error-handling-deployment.service.ts
│   │   │   │   ├── execute-phase1-deployment.ts
│   │   │   │   ├── feature-flags-service.ts
│   │   │   │   ├── feature-flags.service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── migration-api.ts
│   │   │   │   ├── migration-state.schema.ts
│   │   │   │   ├── monitoring.service.ts
│   │   │   │   ├── orchestrator.service.ts
│   │   │   │   ├── phase1-deployment-orchestrator.ts
│   │   │   │   ├── repository-deployment-executor.ts
│   │   │   │   ├── repository-deployment-service.ts
│   │   │   │   ├── repository-deployment-validator.ts
│   │   │   │   ├── repository-deployment.service.ts
│   │   │   │   ├── rollback.service.ts
│   │   │   │   └── validation.service.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── audit-log.ts
│   │   │   │   ├── external-api-management.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── monitoring-scheduler.ts
│   │   │   │   └── performance-monitor.ts
│   │   │   ├── notifications/
│   │   │   │   ├── alerting-service.ts
│   │   │   │   ├── email-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notification_integration_guide.md
│   │   │   │   ├── notification-channels.ts
│   │   │   │   ├── notification-orchestrator.ts
│   │   │   │   ├── notification-scheduler.ts
│   │   │   │   ├── notification-service.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── refactored_summary.md
│   │   │   │   ├── smart-notification-filter.ts
│   │   │   │   └── types.ts
│   │   │   ├── performance/
│   │   │   │   └── performance-monitor.ts
│   │   │   ├── persistence/
│   │   │   │   ├── drizzle/
│   │   │   │   │   ├── drizzle-bill-repository.ts
│   │   │   │   │   ├── drizzle-sponsor-repository.ts
│   │   │   │   │   ├── drizzle-user-repository.ts
│   │   │   │   │   ├── hybrid-bill-repository.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── lazy-loader.ts
│   │   │   ├── security/
│   │   │   │   ├── data-privacy-service.ts
│   │   │   │   ├── input-validation-service.ts
│   │   │   ├── validation/
│   │   │   │   └── repository-validation.ts
│   │   │   ├── websocket/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── native-websocket-adapter.ts
│   │   │   │   │   ├── redis-adapter.ts
│   │   │   │   │   ├── socketio-adapter.ts
│   │   │   │   │   └── websocket-adapter.ts
│   │   │   │   ├── batching/
│   │   │   │   │   ├── batching-service.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── config/
│   │   │   │   │   ├── base-config.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── runtime-config.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── connection-manager.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── message-handler.ts
│   │   │   │   │   ├── operation-queue-manager.ts
│   │   │   │   │   ├── subscription-manager.ts
│   │   │   │   │   └── websocket-service.ts
│   │   │   │   ├── memory/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── leak-detector-handler.ts
│   │   │   │   │   ├── memory-manager.ts
│   │   │   │   │   └── progressive-degradation.ts
│   │   │   │   ├── migration/
│   │   │   │   │   ├── connection-migrator.ts
│   │   │   │   │   ├── health-validator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── state-manager.ts
│   │   │   │   │   ├── traffic-controller.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── health-checker.test.ts
│   │   │   │   │   ├── health-checker.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── metrics-reporter.test.ts
│   │   │   │   │   ├── metrics-reporter.ts
│   │   │   │   │   ├── run-tests.js
│   │   │   │   │   ├── statistics-collector.test.ts
│   │   │   │   │   ├── statistics-collector.ts
│   │   │   │   │   └── TEST_SUMMARY.md
│   │   │   │   ├── utils/
│   │   │   │   │   ├── circular-buffer.test.ts
│   │   │   │   │   ├── circular-buffer.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── lru-cache.test.ts
│   │   │   │   │   ├── lru-cache.ts
│   │   │   │   │   ├── priority-queue.test.ts
│   │   │   │   │   └── priority-queue.ts
│   │   │   │   ├── api-server.ts
│   │   │   │   ├── backward-compatibility.test.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-demo.js
│   │   │   │   ├── README.md
│   │   │   │   ├── service-validation.js
│   │   │   │   ├── test-runner.js
│   │   │   │   ├── tsconfig.json
│   │   │   │   ├── types.ts
│   │   │   │   └── VALIDATION_SUMMARY.md
│   │   │   ├── demo-data.ts
│   │   │   ├── feature-flags.ts
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── app-middleware.ts
│   │   │   ├── auth.ts
│   │   │   ├── boom-error-middleware.ts
│   │   │   ├── boom-migration-summary.md
│   │   │   ├── cache-middleware.ts
│   │   │   ├── circuit-breaker-middleware.ts
│   │   │   ├── file-upload-validation.ts
│   │   │   ├── index.ts
│   │   │   ├── migration-wrapper.ts
│   │   │   ├── privacy-middleware.ts
│   │   │   ├── rate-limiter.ts
│   │   │   ├── safeguards.ts
│   │   │   ├── server-error-integration.ts
│   │   │   └── service-availability.ts
│   │   ├── scripts/
│   │   │   ├── api-race-condition-detector.ts
│   │   │   ├── deploy-repository-migration.ts
│   │   │   ├── deploy-websocket-migration.ts
│   │   │   ├── execute-websocket-migration.ts
│   │   │   ├── final-migration-validation.ts
│   │   │   ├── fix-return-statements.js
│   │   │   ├── fix-shared-imports.js
│   │   │   ├── legacy-websocket-cleanup.ts
│   │   │   ├── migration-runner.ts
│   │   │   ├── run-websocket-validation.ts
│   │   │   ├── simple-websocket-validation.ts
│   │   │   ├── test-conflict-analysis.ts
│   │   │   ├── test-government-integration.ts
│   │   │   ├── test-websocket-migration.ts
│   │   │   ├── update-schema-imports.ts
│   │   │   ├── validate-connection-migration.ts
│   │   │   ├── verify-external-api-management.ts
│   │   │   └── websocket-performance-validation.ts
│   │   ├── services/
│   │   │   ├── api-cost-monitoring.ts
│   │   │   ├── external-api-error-handler.ts
│   │   │   ├── managed-government-data-integration.ts
│   │   │   ├── README-schema-validation.md
│   │   │   └── schema-validation-demo.ts
│   │   ├── storage/
│   │   │   ├── base.ts
│   │   │   ├── bill-storage.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   └── user-storage.ts
│   │   ├── tests/
│   │   │   ├── integration/
│   │   │   │   ├── websocket-backward-compatibility.test.ts
│   │   │   │   └── websocket-service.test.ts
│   │   │   ├── unit/
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── websocket/
│   │   │   │   │       └── connection-manager.test.ts
│   │   │   │   └── mocks/
│   │   │   │       └── mock-data.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   └── test-helpers.ts
│   │   │   └── setup.ts
│   │   ├── types/
│   │   │   ├── controller/
│   │   │   │   └── index.ts
│   │   │   ├── database/
│   │   │   │   └── index.ts
│   │   │   ├── middleware/
│   │   │   │   └── index.ts
│   │   │   ├── service/
│   │   │   │   └── index.ts
│   │   │   ├── api.ts
│   │   │   ├── common.ts
│   │   │   ├── index.ts
│   │   │   ├── jest-extensions.d.ts
│   │   │   └── shared-schema-short.d.ts
│   │   ├── utils/
│   │   │   ├── analytics-controller-wrapper.ts
│   │   │   ├── api-response.ts
│   │   │   ├── crypto.ts
│   │   │   ├── db-helpers.ts
│   │   │   ├── db-init.ts
│   │   │   ├── errors.ts
│   │   │   ├── featureFlags.ts
│   │   │   ├── metrics.ts
│   │   │   ├── missing-modules-fallback.ts
│   │   │   ├── request-utils.ts
│   │   │   ├── shared-core-fallback.ts
│   │   │   └── validation.ts
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── project.json
│   │   ├── tsconfig.json
│   │   └── vite.ts
│   ├── shared/
│   │   ├── core/
│   │   │   ├── cache/
│   │   │   │   └── index.ts
│   │   │   ├── caching/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── ai-cache.ts
│   │   │   │   │   ├── browser-adapter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── memory-adapter.ts
│   │   │   │   │   └── multi-tier-adapter.ts
│   │   │   │   ├── clustering/
│   │   │   │   │   └── cluster-manager.ts
│   │   │   │   ├── compression/
│   │   │   │   │   └── cache-compressor.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── base-adapter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interfaces.ts
│   │   │   │   │   └── key-generator.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   └── metrics-collector.ts
│   │   │   │   ├── patterns/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── serialization/
│   │   │   │   │   └── cache-serializer.ts
│   │   │   │   ├── tagging/
│   │   │   │   │   └── tag-manager.ts
│   │   │   │   ├── utilities/
│   │   │   │   │   ├── cache-compressor.ts
│   │   │   │   │   ├── cache-tag-manager.ts
│   │   │   │   │   └── cache-warmer.ts
│   │   │   │   ├── warming/
│   │   │   │   │   └── cache-warmer.ts
│   │   │   │   ├── ai-cache.ts
│   │   │   │   ├── cache-factory.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── caching-service.ts
│   │   │   │   ├── decorators.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── feature-flags.ts
│   │   │   │   ├── icaching-service.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── key-generator.ts
│   │   │   │   ├── simple-factory.ts
│   │   │   │   ├── single-flight-cache.ts
│   │   │   │   ├── test-basic.ts
│   │   │   │   ├── test-comprehensive.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── validation.ts
│   │   │   ├── config/
│   │   │   │   ├── index.ts
│   │   │   │   ├── manager.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── utilities.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth/
│   │   │   │   │   └── provider.ts
│   │   │   │   ├── cache/
│   │   │   │   │   └── provider.ts
│   │   │   │   ├── error-handler/
│   │   │   │   │   └── provider.ts
│   │   │   │   ├── rate-limit/
│   │   │   │   │   └── provider.ts
│   │   │   │   ├── validation/
│   │   │   │   │   └── provider.ts
│   │   │   │   ├── ai-deduplication.ts
│   │   │   │   ├── ai-middleware.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── feature-flags.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── unified.ts
│   │   │   ├── modernization/
│   │   │   │   ├── cleanup/
│   │   │   │   │   ├── cli.ts
│   │   │   │   │   ├── executor.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── orchestrator.ts
│   │   │   │   ├── analysis.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── orchestrator.ts
│   │   │   │   ├── progress.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── validation.ts
│   │   │   ├── observability/
│   │   │   │   ├── error-management/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   └── error-analytics.ts
│   │   │   │   │   ├── errors/
│   │   │   │   │   │   ├── base-error.ts
│   │   │   │   │   │   └── specialized-errors.ts
│   │   │   │   │   ├── handlers/
│   │   │   │   │   │   ├── error-boundary.tsx
│   │   │   │   │   │   └── error-handler-chain.ts
│   │   │   │   │   ├── integrations/
│   │   │   │   │   │   └── error-tracking-integration.ts
│   │   │   │   │   ├── middleware/
│   │   │   │   │   │   └── express-error-middleware.ts
│   │   │   │   │   ├── monitoring/
│   │   │   │   │   │   └── error-monitor.ts
│   │   │   │   │   ├── patterns/
│   │   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   │   └── retry-patterns.ts
│   │   │   │   │   ├── recovery/
│   │   │   │   │   │   └── error-recovery-engine.ts
│   │   │   │   │   ├── reporting/
│   │   │   │   │   │   └── user-error-reporter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── health/
│   │   │   │   │   ├── checks/
│   │   │   │   │   │   ├── database-check.ts
│   │   │   │   │   │   ├── memory-check.ts
│   │   │   │   │   │   └── redis-check.ts
│   │   │   │   │   ├── checks.ts
│   │   │   │   │   ├── health-checker.ts
│   │   │   │   │   ├── health-service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── middleware.ts
│   │   │   │   │   ├── server-health.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── logging/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── logger.ts
│   │   │   │   │   ├── logging-service.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── metrics/
│   │   │   │   │   ├── exporters/
│   │   │   │   │   │   ├── cloudwatch.ts
│   │   │   │   │   │   ├── prometheus.ts
│   │   │   │   │   │   └── statsd.ts
│   │   │   │   │   ├── collectors.ts
│   │   │   │   │   ├── exporters.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── registry.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── tracing/
│   │   │   │   │   ├── context.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── span.ts
│   │   │   │   │   ├── tracer.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── base-interfaces.ts
│   │   │   │   ├── common-types.ts
│   │   │   │   ├── correlation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── iobservability-stack.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   ├── observability-stack-service.ts
│   │   │   │   ├── stack.ts
│   │   │   │   ├── telemetry.ts
│   │   │   │   └── types.ts
│   │   │   ├── performance/
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── method-timing.ts
│   │   │   │   ├── monitoring.ts
│   │   │   │   └── unified-monitoring.ts
│   │   │   ├── primitives/
│   │   │   │   ├── constants/
│   │   │   │   │   ├── http-status.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── time.ts
│   │   │   │   ├── types/
│   │   │   │   │   ├── branded.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── maybe.ts
│   │   │   │   │   └── result.ts
│   │   │   │   └── index.ts
│   │   │   ├── rate-limiting/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── fixed-window-adapter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── memory-adapter.ts
│   │   │   │   │   ├── sliding-window-adapter.ts
│   │   │   │   │   └── token-bucket-adapter.ts
│   │   │   │   ├── algorithms/
│   │   │   │   │   ├── fixed-window.ts
│   │   │   │   │   ├── interfaces.ts
│   │   │   │   │   ├── sliding-window.ts
│   │   │   │   │   └── token-bucket.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interfaces.ts
│   │   │   │   │   └── service.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── express-middleware.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── rate-limiting-service.ts
│   │   │   │   ├── stores/
│   │   │   │   │   ├── memory-store.ts
│   │   │   │   │   └── redis-store.ts
│   │   │   │   ├── ai-rate-limiter.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── metrics.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   └── types.ts
│   │   │   ├── repositories/
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── bill-repository.interface.ts
│   │   │   │   │   └── sponsor-repository.interface.ts
│   │   │   │   ├── test-implementations/
│   │   │   │   │   ├── bill-test-repository.ts
│   │   │   │   │   └── sponsor-test-repository.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── bill-service.interface.ts
│   │   │   │   │   └── notification-service.interface.ts
│   │   │   │   ├── test-implementations/
│   │   │   │   │   ├── bill-test-service.ts
│   │   │   │   │   └── notification-test-service.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── composition.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── validation.ts
│   │   │   ├── types/
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── feature-flags.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── realtime.ts
│   │   │   │   ├── services.ts
│   │   │   │   └── validation-types.ts
│   │   │   ├── utils/
│   │   │   │   ├── examples/
│   │   │   │   │   └── concurrency-migration-example.ts
│   │   │   │   ├── formatting/
│   │   │   │   │   ├── currency.ts
│   │   │   │   │   ├── date-time.ts
│   │   │   │   │   ├── document.ts
│   │   │   │   │   ├── file-size.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── location.ts
│   │   │   │   │   └── status.ts
│   │   │   │   ├── images/
│   │   │   │   │   └── image-utils.ts
│   │   │   │   ├── anonymity-interface.ts
│   │   │   │   ├── anonymity-service.ts
│   │   │   │   ├── api-utils.ts
│   │   │   │   ├── async-utils.ts
│   │   │   │   ├── browser-logger.ts
│   │   │   │   ├── cache-utils.ts
│   │   │   │   ├── common-utils.ts
│   │   │   │   ├── concurrency-adapter.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── correlation-id.ts
│   │   │   │   ├── dashboard-utils.ts
│   │   │   │   ├── data-utils.ts
│   │   │   │   ├── http-utils.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── loading-utils.ts
│   │   │   │   ├── navigation-utils.ts
│   │   │   │   ├── number-utils.ts
│   │   │   │   ├── performance-utils.ts
│   │   │   │   ├── race-condition-prevention.ts
│   │   │   │   ├── regex-patterns.ts
│   │   │   │   ├── response-helpers.ts
│   │   │   │   ├── security-utils.ts
│   │   │   │   ├── string-utils.ts
│   │   │   │   └── type-guards.ts
│   │   │   ├── validation/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── custom-adapter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── joi-adapter.ts
│   │   │   │   │   └── zod-adapter.ts
│   │   │   │   ├── core/
│   │   │   │   │   ├── base-adapter.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interfaces.ts
│   │   │   │   │   └── validation-service.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── common.ts
│   │   │   │   │   ├── entities.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── property.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── ivalidation-service.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   ├── sanitization.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── validation-service-wrapper.ts
│   │   │   │   └── validation-service.ts
│   │   │   └── index.ts
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
│   │   │   ├── utils/
│   │   │   │   └── base-script.ts
│   │   │   ├── connection.ts
│   │   │   ├── example-usage.ts
│   │   │   ├── index.ts
│   │   │   ├── init.ts
│   │   │   ├── monitoring.ts
│   │   │   └── pool.ts
│   │   ├── docs/
│   │   │   ├── database_architecture.md
│   │   │   ├── GRAPH_DATABASE_IMPLEMENTATION_PHASE2.md
│   │   │   ├── GRAPH_DATABASE_PHASE2_QUICK_REFERENCE.md
│   │   │   ├── GRAPH_DATABASE_PHASE3_IMPLEMENTATION.md
│   │   │   ├── graph_database_strategy.md
│   │   │   ├── migration_guide.md
│   │   │   └── PHASE3_README.md
│   │   ├── i18n/
│   │   │   ├── en.ts
│   │   │   ├── index.ts
│   │   │   └── sw.ts
│   │   ├── ml/
│   │   │   ├── models/
│   │   │   │   ├── conflict-detector.ts
│   │   │   │   ├── constitutional-analyzer.ts
│   │   │   │   ├── engagement-predictor.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── influence-mapper.ts
│   │   │   │   ├── ml_models_readme.md
│   │   │   │   ├── ml_usage_example.ts
│   │   │   │   ├── real-time-classifier.ts
│   │   │   │   ├── sentiment-analyzer.ts
│   │   │   │   ├── shared_utils.ts
│   │   │   │   ├── transparency-scorer.ts
│   │   │   │   └── trojan-bill-detector.ts
│   │   │   ├── services/
│   │   │   │   ├── analysis-pipeline.ts
│   │   │   │   ├── ml-integration.ts
│   │   │   │   └── ml-orchestrator.ts
│   │   │   ├── testing/
│   │   │   │   ├── cli-tester.ts
│   │   │   │   └── test-server.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── platform/
│   │   │   ├── kenya/
│   │   │   │   └── anonymity/
│   │   │   │       └── anonymity-helper.ts
│   │   │   └── index.ts
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
│   │   │   ├── parliamentary_process.ts
│   │   │   ├── participation_oversight.ts
│   │   │   ├── platform_operations.ts
│   │   │   ├── political_economy.ts
│   │   │   ├── real_time_engagement.ts
│   │   │   ├── REFINEMENT_SUMMARY.md
│   │   │   ├── safeguards.ts
│   │   │   ├── search_system.ts
│   │   │   ├── sync-triggers.ts
│   │   │   ├── transparency_analysis.ts
│   │   │   ├── transparency_intelligence.ts
│   │   │   ├── trojan_bill_detection.ts
│   │   │   ├── universal_access.ts
│   │   │   ├── validate-static.ts
│   │   │   ├── validation-integration.ts
│   │   │   └── websocket.ts
│   │   ├── types/
│   │   │   ├── api/
│   │   │   │   ├── websocket/
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── messages.ts
│   │   │   │   ├── error-types.ts
│   │   │   │   ├── factories.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── request-types.ts
│   │   │   │   ├── response-types.ts
│   │   │   │   └── serialization.ts
│   │   │   ├── core/
│   │   │   │   ├── base.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── errors.example.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── validation.ts
│   │   │   ├── dashboard/
│   │   │   │   └── index.ts
│   │   │   ├── domains/
│   │   │   │   ├── authentication/
│   │   │   │   │   ├── auth-state.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── user.ts
│   │   │   │   ├── legislative/
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   ├── bill.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── loading/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── monitoring/
│   │   │   │   │   ├── errors.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── metrics.ts
│   │   │   │   │   └── performance.ts
│   │   │   │   ├── redux/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── slice-state.ts
│   │   │   │   │   ├── thunk-result.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   └── safeguards/
│   │   │   │       ├── index.ts
│   │   │   │       └── moderation.ts
│   │   │   ├── migration/
│   │   │   │   ├── breaking-changes.ts
│   │   │   │   ├── deprecation-warnings.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── legacy-types.ts
│   │   │   │   ├── migration-config.ts
│   │   │   │   ├── migration-helpers.ts
│   │   │   │   ├── migration-tools.ts
│   │   │   │   ├── replacement-patterns.ts
│   │   │   │   ├── type-transformers.ts
│   │   │   │   └── validation-migrator.ts
│   │   │   ├── performance/
│   │   │   │   ├── bundle-analysis.ts
│   │   │   │   ├── compilation-performance.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── tree-shakeable.ts
│   │   │   │   └── validation-caching.ts
│   │   │   ├── testing/
│   │   │   │   ├── examples/
│   │   │   │   │   ├── comprehensive.example.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── runtime-validation.example.ts
│   │   │   │   │   └── type-level.example.ts
│   │   │   │   ├── integration/
│   │   │   │   │   ├── backward-compatibility-test.ts
│   │   │   │   │   ├── comprehensive-integration-test.ts
│   │   │   │   │   ├── comprehensive-type-tests.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── integration-test-runner.ts
│   │   │   │   │   └── validation-middleware-tests.ts
│   │   │   │   ├── automated-validation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration.ts
│   │   │   │   ├── runtime-validation.ts
│   │   │   │   └── type-level.ts
│   │   │   ├── tooling/
│   │   │   │   ├── documentation.ts
│   │   │   │   ├── eslint-config.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── type-generation.ts
│   │   │   │   └── validation-schemas.ts
│   │   │   └── index.ts
│   │   ├── fix-unused.ts
│   │   ├── index.ts
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── project.json
│   │   └── tsconfig.json
│   ├── tests/
│   │   ├── e2e/
│   │   │   └── test-results/
│   │   │       ├── simple/
│   │   │       └── simple-results.json
│   │   ├── factories/
│   │   │   └── README.md
│   │   ├── mocks/
│   │   │   ├── performance.mock.ts
│   │   │   └── redis.mock.ts
│   │   ├── setup/
│   │   │   ├── modules/
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── shared.ts
│   │   │   ├── index.ts
│   │   │   ├── test-environment.ts
│   │   │   └── vitest.ts
│   │   ├── test-results/
│   │   │   ├── results.json
│   │   │   └── results.xml
│   │   ├── utilities/
│   │   │   ├── client/
│   │   │   │   ├── comprehensive-test-config.ts
│   │   │   │   ├── comprehensive-test-setup.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── navigation-helpers.tsx
│   │   │   │   ├── setup-a11y.ts
│   │   │   │   ├── setup-integration.ts
│   │   │   │   ├── setup-performance.ts
│   │   │   │   └── setup.ts
│   │   │   ├── fixtures/
│   │   │   │   └── index.ts
│   │   │   ├── mocks/
│   │   │   │   └── index.ts
│   │   │   ├── shared/
│   │   │   │   ├── form/
│   │   │   │   │   ├── base-form-testing.ts
│   │   │   │   │   ├── form-testing-utils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── testing-library-form-utils.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── integration-tests.ts
│   │   │   │   ├── load-tester.ts
│   │   │   │   ├── schema-agnostic-test-helper.ts
│   │   │   │   ├── stress-tests.ts
│   │   │   │   └── test-data-factory.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── test-helpers.ts
│   │   ├── validation/
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── test-environment-helpers.ts
│   │   │   └── validators.ts
│   │   ├── global-setup.ts
│   │   ├── global-teardown.ts
│   │   ├── playwright.config.ts
│   │   └── README.md
│   ├── tools/
│   │   ├── codebase-health/
│   │   │   ├── src/
│   │   │   │   ├── analysis/
│   │   │   │   │   └── AnalysisEngine.ts
│   │   │   │   ├── classification/
│   │   │   │   │   └── IssueClassifier.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── CodeIssue.ts
│   │   │   │   │   └── FixResult.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── ASTUtils.ts
│   │   │   │   │   └── FileUtils.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   ├── analysis/
│   │   │   │   │   └── AnalysisEngine.test.ts
│   │   │   │   ├── classification/
│   │   │   │   │   └── IssueClassifier.test.ts
│   │   │   │   ├── fixtures/
│   │   │   │   │   ├── ast/
│   │   │   │   │   │   ├── export-test.ts
│   │   │   │   │   │   ├── import-test.ts
│   │   │   │   │   │   ├── test.js
│   │   │   │   │   │   ├── test.ts
│   │   │   │   │   │   └── test.tsx
│   │   │   │   │   ├── circular-dep-b.ts
│   │   │   │   │   ├── import-issues.ts
│   │   │   │   │   └── sample-issues.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── CodeIssue.test.ts
│   │   │   │   ├── test-data/
│   │   │   │   │   ├── circular-import-file.ts
│   │   │   │   │   ├── correct-file.ts
│   │   │   │   │   └── sample-with-issues.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── ASTUtils.test.ts
│   │   │   │   └── setup.ts
│   │   │   ├── cspell.json
│   │   │   ├── package-lock.json
│   │   │   ├── package.json
│   │   │   ├── postcss.config.js
│   │   │   ├── README.md
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── analyze-orphans-metadata.cjs
│   │   ├── calculate-loc.cjs
│   │   ├── evaluate-orphans.cjs
│   │   ├── find-orphans.cjs
│   │   ├── find-orphans.js
│   │   ├── gather-metadata.cjs
│   │   ├── INTEGRATION_ROADMAP.csv
│   │   ├── ORPHAN_VALUE_ANALYSIS.md
│   │   ├── orphan-evaluation-report.md
│   │   ├── orphan-report.json
│   │   ├── orphans-evaluation.json
│   │   ├── orphans-metadata.csv
│   │   ├── orphans-metadata.json
│   │   ├── TIER_1_INTEGRATION_STATUS.md
│   │   └── top-orphans-loc.json
│   ├── =
│   ├── ANALYTICS_BUGS_REPORT.md
│   ├── ARCHITECTURAL_GOVERNANCE_GUIDE.md
│   ├── ARCHITECTURE_ANALYSIS_INDEX.md
│   ├── ARCHITECTURE_ANALYSIS_QUICK_REF.md
│   ├── ARCHITECTURE_ANALYSIS_SETUP.md
│   ├── ARCHITECTURE_ANALYSIS_VISUAL_MAP.md
│   ├── ARGUMENT_INTELLIGENCE_SETUP_COMPLETE.md
│   ├── BASE_TYPES_MIGRATION_GUIDE.md
│   ├── CHANGELOG.md
│   ├── clear-sw.html
│   ├── CLIENT_ERROR_FIX_SUMMARY.md
│   ├── client-fix-report-20251220-180156.md
│   ├── combined_analysis.json
│   ├── COMPLETE_PHASE_INTEGRATION_MAP.md
│   ├── COMPLETE_RELATIONSHIP_TYPE_REFERENCE.md
│   ├── COMPLETE_TYPE_SYSTEM_AUDIT.md
│   ├── COMPLETION_REPORT.md
│   ├── CONSOLIDATION_CHANGE_LOG.md
│   ├── CONSOLIDATION_IMPLEMENTATION_COMPLETE.md
│   ├── CROSS_SYSTEM_CONSISTENCY_STANDARDS.md
│   ├── cspell.config.yaml
│   ├── DASHBOARD_COMPREHENSIVE_ANALYSIS.md
│   ├── DASHBOARD_TYPES_QUICK_REFERENCE.md
│   ├── DATABASE_ALIGNMENT_ANALYSIS.md
│   ├── DATABASE_ARCHITECTURE_COHERENCE_ANALYSIS.md
│   ├── DATABASE_CONSOLIDATION_DOCUMENTATION_INDEX.md
│   ├── DATABASE_CONSOLIDATION_EXECUTIVE_SUMMARY.md
│   ├── DATABASE_CONSOLIDATION_MIGRATION.md
│   ├── DATABASE_STRATEGIC_MIGRATION_COMPLETE.md
│   ├── database-consolidation-analysis.md
│   ├── DELIVERY_SUMMARY.md
│   ├── docker-compose.neo4j.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Dockerfile.client
│   ├── DOCUMENTATION_INDEX.md
│   ├── drizzle.config.ts
│   ├── ENTITY_MAPPING_DOCUMENT.md
│   ├── ERROR_ANALYSIS_REPORT.md
│   ├── ERROR_EXTRACTION_SUMMARY.txt
│   ├── error-components-fix-report-20251221-102246.md
│   ├── errors-comprehensive.json
│   ├── errors.json
│   ├── extraction_debug.log
│   ├── final-cleanup-report-20251220-193413.md
│   ├── FSD_TYPE_MIGRATION_SUMMARY.md
│   ├── generate-structure.mjs
│   ├── GRAPH_DATABASE_FINAL_SUMMARY.txt
│   ├── GRAPH_DATABASE_GETTING_STARTED.md
│   ├── GRAPH_DATABASE_IMPLEMENTATION_PHASE1.md
│   ├── GRAPH_DATABASE_INDEX.md
│   ├── GRAPH_DATABASE_PHASE2_INDEX.md
│   ├── GRAPH_DATABASE_PHASE3_PLANNING.md
│   ├── GRAPH_DATABASE_QUICK_REFERENCE.md
│   ├── GRAPH_DATABASE_STATUS.md
│   ├── GRAPH_DATABASE_UNEXPLORED_RELATIONSHIPS_SUMMARY.md
│   ├── GRAPH_DIRECTORY_REFACTORING.md
│   ├── GRAPH_HARDENING_GUIDE.md
│   ├── GRAPH_MODULE_FIXES.md
│   ├── GRAPH_MODULE_IMPLEMENTATION_GUIDE.md
│   ├── GRAPH_QUICK_REFERENCE.md
│   ├── GRAPH_VS_GRAPH2_ANALYSIS.md
│   ├── IMPLEMENTATION_COMPLETE_SUMMARY.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── IMPORT_CONSOLIDATION_COMPLETE.md
│   ├── knip.config.ts
│   ├── knip.json
│   ├── MASTER_IMPLEMENTATION_REPORT.md
│   ├── migrate-base-types-batch.cjs
│   ├── migrate-base-types.cjs
│   ├── MIGRATION_IMPLEMENTATION_SUMMARY.md
│   ├── migration-demo.cjs
│   ├── monitoring-fsd-restructure-plan.md
│   ├── NEO4J_CONFIGURATION.md
│   ├── nginx.conf
│   ├── nx.json
│   ├── ORIGINAL_AND_PHASE3_RELATIONSHIP_ANALYSIS.md
│   ├── package.json
│   ├── PENDING_IMPLEMENTATION_STEPS.md
│   ├── performance-baselines.json
│   ├── PHASE_1_CONSOLIDATION_PROGRESS.md
│   ├── PHASE_1_REMEDIATION_IMPLEMENTATION_COMPLETE.md
│   ├── PHASE_2_COMMUNITY_TYPES_COMPLETE.md
│   ├── PHASE_2_COMPLETION_SUMMARY.md
│   ├── PHASE_2_DELIVERABLES.md
│   ├── PHASE_2_FINAL_SUMMARY.md
│   ├── PHASE_2_INTEGRATION_GUIDE.md
│   ├── PHASE_2_QUICK_START.ts
│   ├── PHASE_2_TRIGGER_SYNC_GUIDE.md
│   ├── PHASE_3_COMPLETE_DELIVERY.md
│   ├── PHASE_3_COMPLETION_MANIFEST.md
│   ├── PHASE_3_ENGAGEMENT_GRAPH_PLAN.md
│   ├── PHASE_3_QUICK_START_REFERENCE.md
│   ├── PHASE_3_QUICK_SUMMARY.md
│   ├── PHASE_3_SAFEGUARDS_INTEGRATION_COMPLETE.md
│   ├── PHASE_8_COMPLETION_SUMMARY.md
│   ├── PHASE_8_INDEX.md
│   ├── PHASE_8_VERIFICATION_REPORT.md
│   ├── PHASE2_COMPLETION_REPORT.md
│   ├── PHASE2_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE3_COMPLETION_REPORT.md
│   ├── PHASE3_DELIVERY_SUMMARY.txt
│   ├── PHASE3_DOCUMENTATION_INDEX.md
│   ├── PHASE3_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE3_QUICK_REFERENCE.md
│   ├── PHASE3_VERIFICATION_CHECKLIST.md
│   ├── PHASE4_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE4_OPTIMIZATION_COMPLETE.md
│   ├── PHASE4_REDUNDANCY_AUDIT.md
│   ├── PHASES_5_7_COMPLETION_VERIFICATION.md
│   ├── playwright.config.ts
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.js
│   ├── PROJECT_STATUS.md
│   ├── quality-config-dev.json
│   ├── quality-config-pr.json
│   ├── quality-config-production.json
│   ├── quality-config-staging.json
│   ├── quality-gate-report.json
│   ├── QUICK_REFERENCE_CARD.md
│   ├── RACE_CONDITION_FIXES_SUMMARY.md
│   ├── RACE_CONDITION_PREVENTION_GUIDE.md
│   ├── race-condition-tests.spec.js
│   ├── README.md
│   ├── RECOMMENDATIONS_IMPLEMENTATION_COMPLETE.md
│   ├── RELATIONSHIP_TYPE_INTEGRATION_MAP.md
│   ├── REMAINING_TASKS_IMPLEMENTATION_GUIDE.md
│   ├── remaining-export-fixer.mjs
│   ├── remaining-fixes-report-20251220-184518.md
│   ├── REORGANIZATION_SUMMARY.md
│   ├── ROADMAP_PHASE_1_2_3.md
│   ├── run_codebase_stats.bat
│   ├── SAFEGUARDS_COHESION_ANALYSIS.md
│   ├── SAFEGUARDS_DOCUMENTATION_INDEX.md
│   ├── SAFEGUARDS_FINAL_STATUS_REPORT.md
│   ├── SAFEGUARDS_IMPLEMENTATION_COMPLETE.md
│   ├── SAFEGUARDS_INTEGRATION_GUIDE.md
│   ├── SAFEGUARDS_MIGRATION_ANALYSIS.md
│   ├── SAFEGUARDS_MIGRATION_COMPLETE.md
│   ├── SAFEGUARDS_MIGRATION_INDEX.md
│   ├── SAFEGUARDS_MISSING_FUNCTIONALITY.md
│   ├── SAFEGUARDS_SCHEMA_REFINEMENTS.md
│   ├── SAFEGUARDS_SCHEMA_v2_SUMMARY.md
│   ├── SAFEGUARDS_SYSTEM_RECAP.md
│   ├── SAFEGUARDS_VISUAL_ARCHITECTURE.md
│   ├── SAFEGUARDS_VISUAL_SUMMARY.md
│   ├── SCHEMA_COMPLETION_REPORT.md
│   ├── SCHEMA_CONSISTENCY_AUDIT_REPORT.md
│   ├── SCHEMA_DOMAINS_QUICK_REFERENCE.md
│   ├── SCHEMA_GRAPH_CONSISTENCY_REPORT.md
│   ├── SCHEMA_LIMITATIONS_FIXES.md
│   ├── SCRIPTS_CONSOLIDATION_IMPLEMENTATION_COMPLETE.md
│   ├── SESSION_MANAGER_MIGRATION_SUMMARY.md
│   ├── setup_argument_intelligence.js
│   ├── start-dev.js
│   ├── STRATEGY_IMPLEMENTATION_STATUS.md
│   ├── tailwind.config.js
│   ├── TASK_2_COMPLETION_REPORT.md
│   ├── TEAM_EXECUTION_CHECKLIST.md
│   ├── test_api_integration.js
│   ├── test-race-condition-fixes.js
│   ├── tsconfig.json
│   ├── tsconfig.server.json
│   ├── TYPE_CONSOLIDATION_ANALYSIS.md
│   ├── TYPE_CONSOLIDATION_COMPLETE.md
│   ├── TYPE_CONSOLIDATION_SUMMARY.md
│   ├── TYPE_SYSTEM_COMPLETION_SUMMARY.md
│   ├── TYPE_SYSTEM_COMPREHENSIVE_AUDIT.md
│   ├── TYPE_SYSTEM_STANDARDIZATION_DOCUMENTATION_INDEX.md
│   ├── TYPE_SYSTEM_STANDARDIZATION_ROADMAP.md
│   ├── type-consolidation-plan.md
│   ├── UNEXPLORED_RELATIONSHIPS_EXECUTIVE_SUMMARY.md
│   ├── verify-graph-implementation.sh
│   ├── VERSION
│   ├── vitest.setup.ts
│   ├── vitest.workspace.ts
│   ├── websocket-consolidation-final-status.md
│   ├── websocket-consolidation-status.md
│   └── websocket-consolidation-summary.md
└── specs/
    ├── chanuka_implementation (1).txt
    ├── chanuka_implementation (2).txt
    ├── chanuka_implementation (4).txt
    ├── chanuka_implementation (5).txt
    ├── chanuka_implementation (6).txt
    ├── chanuka_implementation (8).txt
    └── chanuka_implementation.txt
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