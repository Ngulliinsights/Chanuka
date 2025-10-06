# Integration Testing Framework

This directory contains comprehensive integration tests for the legislative platform API.

## Overview

The integration testing framework provides end-to-end testing of API endpoints, database transactions, authentication flows, and real-time features.

## Test Structure

### Core Integration Tests

1. **working-api-integration.test.ts** - Main API integration tests
   - API health and connectivity
   - Bills API endpoints
   - Sponsors API endpoints
   - Authentication flows
   - Error handling
   - Performance testing
   - Security validation
   - Data validation
   - Response format consistency

2. **database-transaction-integrity.test.ts** - Database transaction testing
   - Basic transaction operations (commit/rollback)
   - Nested transaction handling
   - Multi-table transaction integrity
   - Concurrent transaction handling
   - Transaction timeout and recovery
   - Data integrity constraints

3. **comprehensive-api-integration.test.ts** - Extended API testing
   - Cross-API integration
   - Performance benchmarking
   - Load testing
   - Security testing

## Test Utilities

### TestDataManager
Manages creation and cleanup of test data:
- `createTestUser()` - Creates test users with authentication tokens
- `createTestBill()` - Creates test bills with proper schema
- `createTestSponsor()` - Creates test sponsors
- `cleanup()` - Cleans up all created test data

### PerformanceMonitor
Monitors test performance:
- `startMeasurement()` - Begins performance measurement
- `getMetrics()` - Returns performance metrics
- `getAverageResponseTime()` - Calculates average response times

### ApiResponseValidator
Validates API response formats:
- `validateSuccessResponse()` - Validates successful API responses
- `validateErrorResponse()` - Validates error responses
- `validatePaginationResponse()` - Validates paginated responses

### SecurityTestHelper
Security testing utilities:
- XSS payload testing
- SQL injection prevention testing
- Input validation testing
- Authentication bypass testing

### ConcurrencyTestHelper
Concurrent request testing:
- `runConcurrentRequests()` - Executes concurrent API requests
- `runSequentialRequests()` - Executes sequential requests with delays
- `validateConcurrentResponses()` - Validates concurrent response consistency

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Specific Test Files
```bash
# Working API integration tests
npx jest server/tests/integration/working-api-integration.test.ts

# Database transaction tests
npx jest server/tests/integration/database-transaction-integrity.test.ts

# Comprehensive API tests
npx jest server/tests/integration/comprehensive-api-integration.test.ts
```

### With Coverage
```bash
npm run test:coverage
```

## Test Configuration

### Jest Configuration
- ESM module support
- TypeScript compilation
- 30-second timeout for integration tests
- Single worker to prevent database conflicts
- Automatic cleanup after tests

### Environment Variables
- `NODE_ENV=test` - Sets test environment
- `DATABASE_URL` - Test database connection
- `JWT_SECRET` - JWT signing secret for tests
- `DEBUG_TESTS` - Enables console output during tests

## Test Data Management

### Setup
- Creates isolated test data for each test suite
- Generates unique identifiers to prevent conflicts
- Sets up authentication tokens for protected endpoints

### Cleanup
- Automatic cleanup after each test suite
- Handles foreign key constraints properly
- Prevents test data pollution

## Best Practices

### Test Isolation
- Each test suite creates its own test data
- Tests don't depend on external state
- Proper cleanup prevents side effects

### Error Handling
- Tests handle both success and failure scenarios
- Proper error type checking with TypeScript
- Graceful handling of missing routes/features

### Performance
- Tests include performance benchmarks
- Concurrent request testing
- Response time validation

### Security
- Input validation testing
- XSS prevention testing
- SQL injection prevention testing
- Authentication and authorization testing

## Extending Tests

### Adding New Test Suites
1. Create new test file in `server/tests/integration/`
2. Follow naming convention: `feature-name.test.ts`
3. Use existing test utilities and helpers
4. Include proper setup and cleanup

### Adding New Test Utilities
1. Add utilities to `server/tests/utils/test-helpers.ts`
2. Export utilities for reuse
3. Include TypeScript types
4. Add documentation

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load and response time testing
- **Security Tests**: Vulnerability testing
- **End-to-End Tests**: Full user workflow testing

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure test database is available
2. **Port Conflicts**: Tests use random ports to prevent conflicts
3. **Timeout Issues**: Increase timeout for slow operations
4. **Memory Leaks**: Proper cleanup prevents memory issues

### Debugging
- Set `DEBUG_TESTS=true` to enable console output
- Use `--verbose` flag for detailed test output
- Check test logs for specific error messages

## Continuous Integration

### GitHub Actions
- Runs on pull requests and main branch
- Includes database setup and migration
- Generates coverage reports
- Fails on test failures or coverage drops

### Local Development
- Run tests before committing
- Use watch mode during development
- Check coverage regularly