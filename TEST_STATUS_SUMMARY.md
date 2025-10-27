# Test Status Summary

Generated: 2025-10-25T20:55:17.238Z

## Test Files Overview

- **Total Test Files**: 240
- **Unit Tests**: 0
- **Integration Tests**: 6
- **E2E Tests**: 0
- **Component Tests**: 58
- **Service Tests**: 14
- **Other Tests**: 162

## Test Execution Status


- **Status**: Tests are configured but some may have runtime issues
- **Issue**: Tests are configured but may have runtime issues


## Recommendations

1. Run `npm run fix-tests` to address common test issues
2. Run `npm run verify-structure` to ensure project structure alignment
3. Consider running tests in smaller batches to identify specific issues
4. Update test dependencies if needed: `npm install --save-dev @testing-library/react @testing-library/jest-dom`
5. Check that all import paths are correctly configured in tsconfig.json
6. Review failing tests individually to address specific issues

## Available Commands

- `npm run test:run` - Run all tests
- `npm run test:coverage` - Run tests with coverage
- `npm run fix-tests` - Fix common test issues
- `npm run verify-structure` - Verify project structure
- `npm run test:ui` - Run tests with UI

## Sample Test Files

- tests\visual\components.spec.ts
- tests\performance\memory-profiling.spec.ts
- tests\integration\slow-query-monitoring.spec.ts
- tests\api\external-api-integration.spec.ts
- tests\api\database-performance.spec.ts
- tests\api\auth.spec.ts
- tests\e2e\database-performance-ui.spec.ts
- tests\e2e\auth-flow.spec.ts
- server\tests\voting-pattern-analysis.test.ts
- server\tests\user-profile-service.test.ts
