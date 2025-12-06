/**
 * UNIFIED TEST UTILITIES BARREL EXPORT
 * 
 * This file provides convenient imports for common test utilities.
 * Most test setup is handled through vitest.workspace.unified.ts setupFiles.
 * 
 * For custom test utilities, use the appropriate setup file:
 * - client.ts - Client unit test utilities
 * - client-integration.ts - Client integration test setup
 * - client-a11y.ts - Accessibility testing
 * - server.ts - Server unit test utilities
 * - server-integration.ts - Server integration test utilities
 * - shared.ts - Shared library test utilities
 * - e2e.ts - E2E test utilities
 */

// These are available globally in all tests through setupFiles
// No imports needed - just use directly:
//
// Unit Tests:
// global.testUtils.createMockUser()
// global.testUtils.mockApiResponse()
//
// Integration Tests:
// global.integrationTestUtils.mockApiError()
// global.integrationTestUtils.waitForApiCalls()
//
// Accessibility Tests:
// global.a11yTestUtils.checkAccessibility()
//
// E2E Tests:
// global.e2eTestUtils.login()
// global.e2eTestData.testUser

export {}
