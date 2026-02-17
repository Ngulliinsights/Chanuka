# Module Resolution Fix Report

**Date:** 2026-02-17T20:52:27.497Z
**Total Fixes Applied:** 335
**Files Requiring Manual Review:** 27

## Automatic Fixes Applied

### Removed file extension (333 fixes)

- **demo\real-time-tracking-demo.ts**
  - From: `@server/features/bills/bill-status-monitor.ts`
  - To: `@server/features/bills/bill-status-monitor`
- **demo\real-time-tracking-demo.ts**
  - From: `@server/features/users/domain/user-preferences.ts`
  - To: `@server/features/users/domain/user-preferences`
- **demo\real-time-tracking-demo.ts**
  - From: `@shared/infrastructure/websocket.js`
  - To: `@shared/infrastructure/websocket`
- **features\admin\admin-router.ts**
  - From: `@server/features/security/security-audit-service.ts`
  - To: `@server/features/security/security-audit-service`
- **features\admin\admin-router.ts**
  - From: `@server/infrastructure/security/input-validation-service.js`
  - To: `@server/infrastructure/security/input-validation-service`
- **features\admin\admin-router.ts**
  - From: `@server/infrastructure/security/secure-query-builder.js`
  - To: `@server/infrastructure/security/secure-query-builder`
- **features\admin\admin-router.ts**
  - From: `@server/middleware/auth.js`
  - To: `@server/middleware/auth`
- **features\admin\admin.ts**
  - From: `@server/infrastructure/notifications/index.js`
  - To: `@server/infrastructure/notifications/index`
- **features\admin\content-moderation.ts**
  - From: `./moderation/index.js`
  - To: `./moderation/index`
- **features\admin\external-api-dashboard.ts**
  - From: `@server/infrastructure/external-data/external-api-manager.js`
  - To: `@server/infrastructure/external-data/external-api-manager`
  - ... and 323 more

### Fixed legacy @chanuka alias (2 fixes)

- **features\accountability\ledger.service.ts**
  - From: `@chanuka/shared/database`
  - To: `@shared/database`
- **features\accountability\ledger.service.ts**
  - From: `@chanuka/shared/schema/accountability_ledger`
  - To: `@shared/schema/accountability_ledger`

## Files Requiring Manual Review

- **config\development.ts**
  - Import: `../../4-personas-implementation-guide`
  - Reason: Legacy/non-existent import - needs manual review
- **config\production.ts**
  - Import: `../../4-personas-implementation-guide`
  - Reason: Legacy/non-existent import - needs manual review
- **config\test.ts**
  - Import: `../../4-personas-implementation-guide`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\batch-sync-runner.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\neo4j-client.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\neo4j-client.ts**
  - Import: `../retry-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\sync-executor.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\sync-executor.ts**
  - Import: `../retry-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\transaction-executor.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\core\transaction-executor.ts**
  - Import: `../retry-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\query\advanced-queries.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\query\engagement-queries.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\query\network-queries.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\session-manager.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\session-manager.ts**
  - Import: `../retry-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\utils\session-manager.ts**
  - Import: `../error-adapter-v2`
  - Reason: Legacy/non-existent import - needs manual review
- **infrastructure\database\graph\utils\session-manager.ts**
  - Import: `../retry-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **middleware\server-error-integration.ts**
  - Import: `../../boom-error-middleware`
  - Reason: Legacy/non-existent import - needs manual review
- **scripts\deploy-websocket-migration.ts**
  - Import: `../../redis-adapter`
  - Reason: Legacy/non-existent import - needs manual review
- **scripts\execute-websocket-migration.ts**
  - Import: `../../deploy-websocket-migration`
  - Reason: Legacy/non-existent import - needs manual review
- **scripts\run-websocket-validation.ts**
  - Import: `../../final-migration-validation`
  - Reason: Legacy/non-existent import - needs manual review
- **scripts\run-websocket-validation.ts**
  - Import: `../../legacy-websocket-cleanup`
  - Reason: Legacy/non-existent import - needs manual review
- **scripts\validate-connection-migration.ts**
  - Import: `../../deploy-websocket-migration`
  - Reason: Legacy/non-existent import - needs manual review
- **services\managed-government-data-integration.ts**
  - Import: `../../missing-modules-fallback`
  - Reason: Legacy/non-existent import - needs manual review
- **types\api.ts**
  - Import: `../../common-utils`
  - Reason: Legacy/non-existent import - needs manual review
- **utils\analytics-controller-wrapper.ts**
  - Import: `../../api-response-fixer`
  - Reason: Legacy/non-existent import - needs manual review
- **utils\analytics-controller-wrapper.ts**
  - Import: `../../missing-modules-fallback`
  - Reason: Legacy/non-existent import - needs manual review
