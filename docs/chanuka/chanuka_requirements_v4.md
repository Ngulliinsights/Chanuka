# Chanuka Platform Restructuring Requirements

## Document Control
- **Version**: 4.0 (AI-Optimized EARS Format)
- **Date**: October 13, 2025
- **Status**: Actionable Specification
- **Target**: GenAI Coding Agents

## EARS Format Reference
- **Ubiquitous**: WHEN [optional preconditions] the system SHALL [response]
- **Event-Driven**: WHEN [trigger] the system SHALL [response]
- **State-Driven**: WHILE [state] the system SHALL [response]
- **Optional**: WHERE [feature included] the system SHALL [response]
- **Unwanted**: IF [bad condition] THEN the system SHALL [prevention]

---

## R1: Shared Infrastructure Consolidation

### R1.1: Cache Service Centralization

WHEN any component requires caching THEN the system SHALL import exclusively from `shared/core/src/cache`.

WHERE Redis is available the system SHALL use `redis-adapter.ts` for distributed caching.

WHERE Redis is unavailable the system SHALL use `memory-adapter.ts` as fallback.

WHEN multiple requests for identical data occur simultaneously THEN the system SHALL use `single-flight-cache.ts` to deduplicate requests.

IF cache adapter is imported from `server/infrastructure/cache` THEN the system SHALL reject the import and require migration to shared cache.

### R1.2: Error Handling Centralization

WHEN any component throws errors THEN the system SHALL extend from `shared/core/src/error-handling/base-error.ts`.

WHEN external dependencies fail THEN the system SHALL use `circuit-breaker.ts` to prevent cascade failures.

WHERE circuit breaker detects failure threshold exceeded the system SHALL open circuit and return fallback responses.

WHEN error handling middleware is needed THEN the system SHALL use `shared/core/src/error-handling/middleware.ts`.

IF custom error classes are created outside shared layer THEN the system SHALL consolidate them into `shared/core/src/error-handling/errors/enhanced-errors.ts`.

### R1.3: Logging Service Centralization

WHEN any component requires logging THEN the system SHALL import from `shared/core/src/logging`.

WHEN logging is performed THEN the system SHALL use structured JSON format with correlation IDs.

WHERE log rotation is required the system SHALL use `log-rotation.ts` with configurable retention policies.

WHEN sensitive data appears in logs THEN the system SHALL automatically redact using patterns defined in logging configuration.

IF console.log is used directly THEN the system SHALL replace with logger service calls.

### R1.4: Validation Service Centralization

WHEN any component validates input THEN the system SHALL use schemas from `shared/core/src/validation/schemas`.

WHEN HTTP request validation is needed THEN the system SHALL use `shared/core/src/validation/middleware.ts`.

WHERE common validation patterns exist the system SHALL use schemas from `shared/core/src/validation/schemas/common.ts`.

WHEN sanitization is required THEN the system SHALL use functions from `shared/core/src/validation/sanitization.ts`.

IF validation logic is duplicated across components THEN the system SHALL extract to shared validation schemas.

### R1.5: Rate Limiting Centralization

WHEN any endpoint requires rate limiting THEN the system SHALL use `shared/core/src/rate-limiting`.

WHERE distributed rate limiting is needed the system SHALL use `stores/redis-store.ts`.

WHEN AI API calls require rate limiting THEN the system SHALL use `ai-rate-limiter.ts` with token bucket algorithm.

WHERE rate limit is exceeded the system SHALL return HTTP 429 with Retry-After header.

### R1.6: Health Check Centralization

WHEN system health must be verified THEN the system SHALL use `shared/core/src/health/health-checker.ts`.

WHEN database health is checked THEN the system SHALL use `checks/database-check.ts`.

WHEN Redis health is checked THEN the system SHALL use `checks/redis-check.ts`.

WHEN memory health is checked THEN the system SHALL use `checks/memory-check.ts`.

WHERE health check endpoint is exposed the system SHALL use `shared/core/src/health/middleware.ts`.

---

## R2: Database Layer Consolidation

### R2.1: Connection Management

WHEN any component requires database access THEN the system SHALL import from `shared/database`.

WHEN database connection is needed THEN the system SHALL use connection pool from `shared/database/connection.ts`.

WHERE connection pool is exhausted the system SHALL queue requests with timeout.

IF direct database imports from `drizzle-orm` exist outside shared layer THEN the system SHALL migrate to shared database abstractions.

WHEN database connection fails THEN the system SHALL retry with exponential backoff up to three attempts.

### R2.2: Schema Management

WHEN database schema is defined THEN the system SHALL use `shared/schema.ts` exclusively.

WHERE Drizzle ORM types are needed the system SHALL export from shared schema.

WHEN schema changes are required THEN the system SHALL create migration in `db/migrations`.

IF schema definitions exist in `server/infrastructure/database` THEN the system SHALL consolidate to shared schema.

### R2.3: Query Building

WHEN complex queries are constructed THEN the system SHALL use type-safe query builders.

WHERE query builders exist in `server/infrastructure/database` the system SHALL migrate to shared database layer.

WHEN raw SQL is required THEN the system SHALL use parameterized queries exclusively.

IF SQL injection vulnerability exists THEN the system SHALL prevent through parameterized queries.

---

## R3: Server Feature Organization

### R3.1: Bills Domain Boundaries

WHEN bill-related functionality is implemented THEN the system SHALL place in `server/features/bills`.

WHERE bill service logic exists the system SHALL place in `server/features/bills/bill-service.ts`.

WHEN bill sponsorship is analyzed THEN the system SHALL use `server/features/bills/sponsor-service.ts`.

WHEN bill tracking is needed THEN the system SHALL use `server/features/bills/bill-tracking.ts`.

IF bill functionality exists in `server/core` THEN the system SHALL migrate to bills feature.

### R3.2: Users Domain Boundaries

WHEN user-related functionality is implemented THEN the system SHALL place in `server/features/users`.

WHERE authentication is required the system SHALL use `server/core/auth/auth-service.ts`.

WHEN user profile operations occur THEN the system SHALL use `server/features/users/user-profile.ts`.

WHEN user verification is needed THEN the system SHALL use `server/features/users/citizen-verification.ts` or `ExpertVerificationService.ts`.

### R3.3: Analytics Domain Boundaries

WHEN analytics functionality is implemented THEN the system SHALL place in `server/features/analytics`.

WHERE engagement tracking is needed the system SHALL use `services/engagement.service.ts`.

WHEN financial disclosure monitoring occurs THEN the system SHALL use `financial-disclosure/monitoring.ts`.

WHEN conflict detection is performed THEN the system SHALL use `conflict-detection.ts`.

### R3.4: Community Domain Boundaries

WHEN community features are implemented THEN the system SHALL place in `server/features/community`.

WHERE comment functionality is needed the system SHALL use `comment.ts`.

WHEN social sharing is implemented THEN the system SHALL use `social-integration.ts`.

WHEN content moderation occurs THEN the system SHALL integrate with `server/features/admin/content-moderation.ts`.

### R3.5: Search Domain Boundaries

WHEN search functionality is implemented THEN the system SHALL place in `server/features/search`.

WHERE search service is needed the system SHALL use `application/SearchService.ts`.

WHEN search indexing occurs THEN the system SHALL use `infrastructure/SearchIndexManager.ts`.

WHEN search suggestions are provided THEN the system SHALL use `application/SearchSuggestionsService.ts`.

---

## R4: Client Feature Organization

### R4.1: Client Feature Structure

WHEN client features are implemented THEN the system SHALL organize under `client/src/features/[domain]`.

WHERE feature has components the system SHALL place in `client/src/features/[domain]/components`.

WHERE feature has hooks the system SHALL place in `client/src/features/[domain]/hooks`.

WHERE feature has services the system SHALL place in `client/src/features/[domain]/services`.

WHEN feature organization mirrors server domains THEN the system SHALL use matching names.

### R4.2: Shared UI Components

WHEN reusable UI components are created THEN the system SHALL place in `client/src/components/ui`.

WHERE component is feature-specific the system SHALL place in feature component directory.

WHEN component is used across multiple features THEN the system SHALL elevate to shared components.

### R4.3: Client Service Layer

WHEN API communication is needed THEN the system SHALL use services from `client/src/services`.

WHERE authenticated requests are required the system SHALL use `authenticated-api.ts`.

WHEN WebSocket connection is needed THEN the system SHALL use hooks from `client/src/hooks/useWebSocket.ts`.

---

## R5: Navigation System Requirements

### R5.1: Navigation Context Management

WHEN navigation state is managed THEN the system SHALL use `client/src/contexts/NavigationContext.tsx`.

WHERE navigation persistence is required the system SHALL use utilities from `client/src/utils/navigation/state-persistence.ts`.

WHEN responsive navigation is implemented THEN the system SHALL use `client/src/contexts/ResponsiveNavigationContext.tsx`.

### R5.2: Navigation Components

WHEN desktop navigation is rendered THEN the system SHALL use `client/src/components/navigation/DesktopSidebar.tsx`.

WHEN mobile navigation is rendered THEN the system SHALL use `client/src/components/navigation/MobileNavigation.tsx`.

WHERE breadcrumbs are displayed the system SHALL use `client/src/components/navigation/NavigationBreadcrumbs.tsx`.

WHEN related pages are shown THEN the system SHALL use `client/src/components/navigation/RelatedPages.tsx`.

### R5.3: Navigation Utilities

WHEN active navigation state is computed THEN the system SHALL use `client/src/utils/navigation/active-state.ts`.

WHERE breadcrumbs are generated the system SHALL use `client/src/utils/navigation/breadcrumb-generator.ts`.

WHEN related pages are calculated THEN the system SHALL use `client/src/utils/navigation/related-pages-calculator.ts`.

---

## R6: Error Handling Requirements

### R6.1: Client Error Boundaries

WHEN React components may error THEN the system SHALL wrap with error boundary from `client/src/components/error-handling`.

WHERE page-level error handling is needed the system SHALL use `PageErrorBoundary.tsx`.

WHEN error recovery is implemented THEN the system SHALL use `ErrorRecoveryManager.tsx`.

WHERE custom error fallback is needed the system SHALL use `ErrorFallback.tsx`.

### R6.2: Server Error Middleware

WHEN server errors occur THEN the system SHALL handle through `server/middleware/error-handler.ts`.

WHERE API errors need formatting the system SHALL use `server/utils/api-response.ts`.

WHEN errors are logged THEN the system SHALL use shared logging service with correlation IDs.

---

## R7: Testing Infrastructure Requirements

### R7.1: Shared Test Utilities

WHEN test utilities are created THEN the system SHALL place in `shared/core/src/testing`.

WHERE load testing is performed the system SHALL use `load-tester.ts`.

WHEN performance benchmarks are established THEN the system SHALL use `performance-benchmarks.ts`.

WHERE form testing utilities are needed the system SHALL use `form/form-testing-utils.ts`.

### R7.2: Client Test Organization

WHEN client tests are written THEN the system SHALL organize under `client/src/__tests__`.

WHERE unit tests are created the system SHALL place in `__tests__/unit`.

WHERE integration tests are created the system SHALL place in `__tests__/integration`.

WHERE end-to-end tests are created the system SHALL place in `__tests__/e2e`.

### R7.3: Server Test Organization

WHEN server tests are written THEN the system SHALL organize under `server/tests`.

WHERE unit tests are created the system SHALL place in `tests/unit`.

WHERE integration tests are created the system SHALL place in `tests/integration`.

WHERE performance tests are created the system SHALL place in `tests/performance`.

---

## R8: Migration Path Requirements

### R8.1: Legacy Adapter Pattern

WHEN legacy code paths exist THEN the system SHALL create adapters in `shared/core/src/[service]/adapters/legacy`.

WHERE infrastructure cache adapter is needed the system SHALL use `shared/core/src/cache/adapters/legacy/infrastructure-cache-adapter.ts`.

WHEN legacy adapters are used THEN the system SHALL log deprecation warnings with migration instructions.

WHERE adapter usage is tracked the system SHALL maintain metrics for removal timing.

### R8.2: Import Migration Helper

WHEN import paths are migrated THEN the system SHALL use `shared/core/src/migration/import-migration-helper.ts`.

WHERE automated migration is possible the system SHALL provide codemod scripts.

WHEN manual migration is required THEN the system SHALL document in migration guides.

### R8.3: Feature Flag Integration

WHEN new infrastructure is rolled out THEN the system SHALL use feature flags from `shared/core/src/migration/feature-flags/FlagManager.ts`.

WHERE gradual rollout is needed the system SHALL configure percentage-based targeting.

WHEN rollback is required THEN the system SHALL disable feature flag without deployment.

---

## R9: Monitoring and Observability Requirements

### R9.1: Performance Monitoring

WHEN performance metrics are collected THEN the system SHALL use `server/infrastructure/monitoring/performance-monitor.ts`.

WHERE database performance is tracked the system SHALL use `server/infrastructure/monitoring/db-tracer.ts`.

WHEN APM integration is needed THEN the system SHALL use `server/infrastructure/monitoring/apm-service.ts`.

### R9.2: Health Monitoring

WHEN system health is monitored THEN the system SHALL use `server/infrastructure/monitoring/system-health.ts`.

WHERE health checks are scheduled the system SHALL use `server/infrastructure/monitoring/monitoring-scheduler.ts`.

WHEN health metrics are exposed THEN the system SHALL use shared health check infrastructure.

### R9.3: Audit Logging

WHEN security events occur THEN the system SHALL log to `server/infrastructure/monitoring/audit-log.ts`.

WHERE compliance tracking is required the system SHALL include audit trail in event logs.

WHEN audit logs are queried THEN the system SHALL provide search by correlation ID.

---

## R10: Security Requirements

### R10.1: Authentication Flow

WHEN user authentication is required THEN the system SHALL use `server/core/auth/auth-service.ts`.

WHERE session management is needed the system SHALL use `server/core/auth/secure-session-service.ts`.

WHEN password reset is performed THEN the system SHALL use `server/core/auth/passwordReset.ts`.

WHERE session cleanup is scheduled the system SHALL use `server/core/auth/session-cleanup.ts`.

### R10.2: Authorization Middleware

WHEN route protection is required THEN the system SHALL use `server/middleware/auth.ts`.

WHERE role-based access is enforced the system SHALL validate against user roles.

WHEN resource-level permissions are checked THEN the system SHALL validate ownership or privileges.

### R10.3: Security Monitoring

WHEN security events are monitored THEN the system SHALL use `server/features/security/security-monitoring-service.ts`.

WHERE intrusion detection is active the system SHALL use `server/features/security/intrusion-detection-service.ts`.

WHEN security audits are performed THEN the system SHALL use `server/features/security/security-audit-service.ts`.

---

## R11: External Integration Requirements

### R11.1: Government Data Integration

WHEN government APIs are accessed THEN the system SHALL use `server/infrastructure/external-data/government-data-service.ts`.

WHERE API rate limiting is needed the system SHALL use `server/services/api-cost-monitoring.ts`.

WHEN data synchronization occurs THEN the system SHALL use `server/infrastructure/external-data/data-synchronization-service.ts`.

WHERE conflict resolution is required the system SHALL use `server/infrastructure/external-data/conflict-resolution-service.ts`.

### R11.2: External API Management

WHEN external API calls are made THEN the system SHALL use `server/infrastructure/external-data/external-api-manager.ts`.

WHERE API errors occur the system SHALL use `server/services/external-api-error-handler.ts`.

WHEN API performance is tracked THEN the system SHALL use monitoring service with success/failure metrics.

---

## R12: Configuration Management Requirements

### R12.1: Environment Configuration

WHEN environment-specific configuration is needed THEN the system SHALL use `server/config/index.ts`.

WHERE development settings are required the system SHALL use `server/config/development.ts`.

WHERE production settings are required the system SHALL use `server/config/production.ts`.

WHERE test settings are required the system SHALL use `server/config/test.ts`.

### R12.2: Feature Flags Configuration

WHEN feature flags are configured THEN the system SHALL use shared config service.

WHERE flag state is queried the system SHALL cache flag values with TTL.

WHEN flag values change THEN the system SHALL invalidate cache immediately.

---

## R13: Notification System Requirements

### R13.1: Notification Service

WHEN notifications are sent THEN the system SHALL use `server/infrastructure/notifications/notification-service.ts`.

WHERE email notifications are required the system SHALL use `server/infrastructure/notifications/email-service.ts`.

WHEN notification scheduling is needed THEN the system SHALL use `server/infrastructure/notifications/notification-scheduler.ts`.

WHERE notification filtering is applied the system SHALL use `server/infrastructure/notifications/smart-notification-filter.ts`.

### R13.2: Notification Channels

WHEN multiple notification channels exist THEN the system SHALL use `server/infrastructure/notifications/notification-channels.ts`.

WHERE channel orchestration is required the system SHALL use `server/infrastructure/notifications/notification-orchestrator.ts`.

WHEN alerting thresholds are exceeded THEN the system SHALL use `server/infrastructure/notifications/alerting-service.ts`.

---

## R14: Privacy and Compliance Requirements

### R14.1: Privacy Service

WHEN user privacy controls are implemented THEN the system SHALL use `server/features/privacy/privacy-service.ts`.

WHERE data retention is enforced the system SHALL use `server/features/privacy/privacy-scheduler.ts`.

WHEN privacy preferences are managed THEN the system SHALL use privacy routes from `server/features/privacy/privacy-routes.ts`.

### R14.2: Privacy Middleware

WHEN privacy policies are enforced THEN the system SHALL use `server/middleware/privacy-middleware.ts`.

WHERE data anonymization is required the system SHALL apply before logging or analytics.

WHEN user data is deleted THEN the system SHALL cascade deletion across all related tables.

---

## R15: Mobile Optimization Requirements

### R15.1: Responsive Components

WHEN mobile-optimized layouts are needed THEN the system SHALL use `client/src/components/mobile/responsive-layout-manager.tsx`.

WHERE mobile navigation is implemented the system SHALL use enhanced navigation from `client/src/components/mobile/mobile-navigation-enhancements.tsx`.

WHEN touch interactions are handled THEN the system SHALL use `client/src/utils/mobile-touch-handler.ts`.

### R15.2: Mobile Performance

WHEN mobile performance is optimized THEN the system SHALL use `client/src/components/mobile/mobile-performance-optimizations.tsx`.

WHERE mobile-specific error handling is needed the system SHALL use `client/src/utils/mobile-error-handler.ts`.

WHEN responsive page wrapper is applied THEN the system SHALL use `client/src/components/mobile/responsive-page-wrapper.tsx`.

---

## R16: Build and Deployment Requirements

### R16.1: Build Configuration

WHEN client application is built THEN the system SHALL use Vite configuration from `vite.config.ts`.

WHERE TypeScript compilation occurs the system SHALL use `tsconfig.json` at root.

WHEN bundle analysis is performed THEN the system SHALL use `scripts/analyze-bundle.js`.

### R16.2: Deployment Process

WHEN application is deployed THEN the system SHALL use deployment script from `scripts/deployment/deploy.sh`.

WHERE database migrations are applied the system SHALL use `scripts/database/migrate.ts`.

WHEN deployment verification occurs THEN the system SHALL run health checks before traffic routing.

---

## R17: Documentation Requirements

### R17.1: API Documentation

WHEN API endpoints are documented THEN the system SHALL maintain OpenAPI specifications.

WHERE analytics API is documented the system SHALL use `server/features/analytics/swagger.ts`.

WHEN API changes occur THEN the system SHALL update documentation in same commit.

### R17.2: Architecture Documentation

WHEN architecture decisions are made THEN the system SHALL document in `docs/` directory.

WHERE deployment guides are maintained the system SHALL update `docs/guides/DEPLOYMENT.md`.

WHEN troubleshooting procedures are documented THEN the system SHALL update `docs/guides/TROUBLESHOOTING_GUIDE.md`.

---

## Non-Functional Requirements

### NFR1: Performance Constraints

WHEN API requests are processed THEN the system SHALL respond within 200ms at p95.

WHERE database queries execute the system SHALL complete within 100ms at p95.

WHEN cache is hit THEN the system SHALL respond within 10ms.

### NFR2: Reliability Constraints

WHEN system uptime is measured THEN the system SHALL maintain 99.9% availability.

WHERE circuit breaker trips the system SHALL recover automatically within 60 seconds.

WHEN database connection fails THEN the system SHALL reconnect with exponential backoff.

### NFR3: Security Constraints

WHEN authentication tokens are issued THEN the system SHALL use secure HTTP-only cookies.

WHERE passwords are stored the system SHALL hash with bcrypt (cost factor 12).

WHEN API rate limits are exceeded THEN the system SHALL block requests for cooldown period.

### NFR4: Scalability Constraints

WHEN horizontal scaling is required THEN the system SHALL support stateless application servers.

WHERE session state is managed the system SHALL store in Redis for multi-instance support.

WHEN concurrent users exceed 10,000 THEN the system SHALL maintain performance within constraints.

---

## Acceptance Criteria Summary

Each requirement SHALL be considered complete when all of the following conditions are met:

**Code Implementation**: The specified functionality exists in the designated location with proper TypeScript types and error handling.

**Test Coverage**: Unit tests exist with minimum 80% coverage and integration tests verify cross-component behavior.

**Documentation**: Inline JSDoc comments explain purpose and usage with examples where appropriate.

**Migration Path**: Legacy code paths have adapters with deprecation warnings and migration guides.

**Performance Validation**: Performance benchmarks confirm the implementation meets non-functional requirements.

**Security Review**: Security implications have been assessed and appropriate controls implemented.

**AI Agent Compatibility**: Code structure and naming conventions enable GenAI agents to locate and modify components correctly.